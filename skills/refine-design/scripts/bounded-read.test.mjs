import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';
import {readBoundedBatch} from './bounded-read.mjs';

/** Called by scenarios to create isolated source files with automatic cleanup.
 *
 * @param {BoundedReadTestContext} scenario - Owning test context.
 * @param {string[]} contents - Exact UTF-8 file contents.
 * @returns {string[]} - Ordered temporary file paths.
 */
function sources(scenario, contents) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bounded-read-'));
	scenario.after(() => fs.rmSync(root, {recursive: true, force: true}));
	return contents.map((content, index) => {
		const file = path.join(root, `source-${index}.txt`);
		fs.writeFileSync(file, content);
		return file;
	});
}
const cli = fileURLToPath(new URL('./bounded-read.mjs', import.meta.url));

test('CLI runs through an installed directory link and returns the exact bounded page', async (scenario) => {
	const files = sources(scenario, ['linked instruction source']);
	const installed = path.join(path.dirname(files[0]), 'installed-scripts');
	fs.symlinkSync(path.dirname(cli), installed, 'junction');
	const result = spawnSync(process.execPath, [path.join(installed, 'bounded-read.mjs'), ...files], {
		encoding: 'utf8',
		windowsHide: true,
	});
	assert.ifError(result.error);
	assert.equal(result.status, 0, result.stderr);
	assert.equal(result.stderr, '');
	assert.equal(result.stdout, (await readBoundedBatch(files)).text);
});

test('one batch budget includes every file, framing and cursor; continuations reconstruct exact input', async (scenario) => {
	const contents = [
		'',
		'\ufeffTitle\r\n' + '😀e\u0301漢字\r\n'.repeat(400),
		JSON.stringify({description: 'one long line '.repeat(850)}),
		'last',
	];
	const files = sources(scenario, contents);
	const recovered = files.map(() => '');
	const offsets = files.map(() => 0);
	const visited = new Set();
	let cursor;
	let pages = 0;
	do {
		const page = await readBoundedBatch(files, {maxBytes: 1024, cursor});
		assert.ok(page.bytes <= 1024);
		assert.equal(page.bytes, Buffer.byteLength(page.text));
		assert.ok(page.parts.length > 0);
		assert.ok(!visited.has(cursor));
		visited.add(cursor);
		for (const part of page.parts) {
			assert.equal(part.start, offsets[part.index]);
			assert.equal(Buffer.byteLength(part.text), part.end - part.start);
			recovered[part.index] += part.text;
			offsets[part.index] = part.end;
		}
		cursor = page.next;
		assert.ok(++pages < 100);
	} while (cursor !== null);
	assert.ok(pages > 1);
	assert.deepEqual(recovered, contents);
	assert.deepEqual(
		offsets,
		contents.map((content) => Buffer.byteLength(content)),
	);
});

test('small sources share a page, empty sources finish, and replaying a cursor is idempotent', async (scenario) => {
	const files = sources(scenario, ['a', '', 'b']);
	const page = await readBoundedBatch(files);
	assert.equal(page.next, null);
	assert.equal(page.parts.length, 3);
	assert.match(page.text, /DONE [a-f0-9]{64}\n$/);
	const large = sources(scenario, ['x'.repeat(10000)]);
	const first = await readBoundedBatch(large);
	assert.equal(first.bytes, 4096);
	assert.deepEqual(
		await readBoundedBatch(large, {cursor: first.next}),
		await readBoundedBatch(large, {cursor: first.next}),
	);
	const empty = await readBoundedBatch(sources(scenario, ['']));
	assert.equal(empty.next, null);
	assert.equal(empty.parts[0].text, '');
});

test('a change in a later file or file order rejects continuation before returning mixed versions', async (scenario) => {
	const files = sources(scenario, ['x'.repeat(9000), 'original']);
	const first = await readBoundedBatch(files);
	await assert.rejects(readBoundedBatch([...files].reverse(), {cursor: first.next}), /batch changed/);
	fs.writeFileSync(files[1], 'modified');
	await assert.rejects(readBoundedBatch(files, {cursor: first.next}), /batch changed/);
	fs.writeFileSync(files[1], 'original');
	assert.ok((await readBoundedBatch(files, {cursor: first.next})).parts.length);
});

test('invalid inputs and malformed or non-boundary cursors are rejected', async (scenario) => {
	const files = sources(scenario, ['😀'.repeat(3000)]);
	for (const maxBytes of [null, 0, 511, 8193, 600.5, NaN, '1024'])
		await assert.rejects(readBoundedBatch(files, {maxBytes}), /maxBytes/);
	await assert.rejects(readBoundedBatch([]), /source file/);
	await assert.rejects(readBoundedBatch([files[0], files[0]]), /Duplicate/);
	await assert.rejects(readBoundedBatch(files, {unexpected: true}), /options/);
	await assert.rejects(readBoundedBatch(files, {cursor: 'bad'}), /cursor/);
	const first = await readBoundedBatch(files);
	const decoded = JSON.parse(Buffer.from(first.next, 'base64url').toString());
	for (const offset of [1, -1, 999999]) {
		const cursor = Buffer.from(JSON.stringify({...decoded, o: offset})).toString('base64url');
		await assert.rejects(readBoundedBatch(files, {cursor}), /[Cc]ursor/);
	}
	await assert.rejects(readBoundedBatch([path.dirname(files[0])]), /regular files/);
});

test('malformed UTF-8 beyond the first page rejects the whole read and stdout remains empty', async (scenario) => {
	const files = sources(scenario, ['valid']);
	fs.writeFileSync(files[0], Buffer.concat([Buffer.alloc(20000, 120), Buffer.from([0xc3, 0x28])]));
	await assert.rejects(readBoundedBatch(files), /encoded data/);
	const result = spawnSync(process.execPath, [cli, ...files], {encoding: 'utf8', windowsHide: true});
	assert.ifError(result.error);
	assert.equal(result.status, 1);
	assert.equal(result.stdout, '');
	assert.ok(Buffer.byteLength(result.stderr) <= 512);
});

test('CLI emits only the bounded page, supports continuation, and bounds errors', async (scenario) => {
	const files = sources(scenario, ['字'.repeat(3000), 'tail']);
	const first = spawnSync(process.execPath, [cli, '--max-bytes', '1024', ...files], {
		encoding: 'utf8',
		windowsHide: true,
	});
	assert.ifError(first.error);
	assert.equal(first.status, 0, first.stderr);
	assert.equal(first.stderr, '');
	assert.ok(Buffer.byteLength(first.stdout) <= 1024);
	const cursor = /NEXT ([\w-]+)\n$/.exec(first.stdout)?.[1];
	assert.ok(cursor);
	const second = spawnSync(process.execPath, [cli, '--max-bytes', '1024', '--cursor', cursor, ...files], {
		encoding: 'utf8',
		windowsHide: true,
	});
	assert.ifError(second.error);
	assert.equal(second.status, 0, second.stderr);
	assert.notEqual(first.stdout, second.stdout);
	assert.ok(Buffer.byteLength(second.stdout) <= 1024);
	const error = spawnSync(process.execPath, [cli, `--${'x'.repeat(5000)}`], {encoding: 'utf8', windowsHide: true});
	assert.ifError(error.error);
	assert.equal(error.status, 1);
	assert.equal(error.stdout, '');
	assert.ok(Buffer.byteLength(error.stderr) <= 512);
});
