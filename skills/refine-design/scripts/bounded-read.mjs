import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const defaultBytes = 4096;
const maximumBytes = 8192;

/** Called by the reader to decode a position bound to the complete source batch.
 *
 * @param {string | undefined} cursor - Opaque continuation from an earlier page.
 * @returns {BoundedReadPosition} - Validated source position.
 */
function position(cursor) {
	if (cursor === undefined) return {b: '', i: 0, o: 0};
	try {
		if (typeof cursor !== 'string' || cursor.length > 256 || !/^[\w-]+$/.test(cursor)) throw new Error();
		const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
		if (
			!value ||
			Object.keys(value).sort().join(',') !== 'b,i,o' ||
			!/^([a-f0-9]{64})$/.test(value.b) ||
			!Number.isSafeInteger(value.i) ||
			value.i < 0 ||
			!Number.isSafeInteger(value.o) ||
			value.o < 0 ||
			Buffer.from(JSON.stringify(value)).toString('base64url') !== cursor
		)
			throw new Error();
		return value;
	} catch {
		throw new Error('Invalid bounded-read cursor');
	}
}

/** Called by the reader to inspect a UTF-8 source with bounded working memory.
 * File contents are hashed and validated in the same pass that captures a window.
 * A changed file or invalid UTF-8 rejects the page before any output is emitted.
 *
 * @param {string} sourcePath - Resolved regular source file.
 * @param {number} offset - Requested byte position; -1 skips window capture.
 * @param {number} maxBytes - Page budget in UTF-8 bytes.
 * @returns {Promise<BoundedReadSource>} - Source identity and bounded byte window.
 */
async function inspect(sourcePath, offset, maxBytes) {
	if (!(await fs.stat(sourcePath)).isFile()) throw new Error('Sources must be regular files');
	const handle = await fs.open(sourcePath, 'r');
	try {
		const before = await handle.stat({bigint: true});
		const digest = createHash('sha256');
		const decoder = new TextDecoder('utf-8', {fatal: true});
		const buffer = Buffer.alloc(65536);
		const windows = [];
		let size = 0;
		for (;;) {
			const {bytesRead} = await handle.read(buffer, 0, buffer.length, size);
			if (!bytesRead) break;
			const chunk = buffer.subarray(0, bytesRead);
			digest.update(chunk);
			decoder.decode(chunk, {stream: true});
			if (offset >= 0) {
				const start = Math.max(offset, size);
				const end = Math.min(offset + maxBytes + 4, size + bytesRead);
				if (end > start) windows.push(Buffer.from(chunk.subarray(start - size, end - size)));
			}
			size += bytesRead;
		}
		decoder.decode();
		const after = await handle.stat({bigint: true});
		if (
			['size', 'mtimeNs', 'ctimeNs', 'ino', 'dev'].some((key) => before[key] !== after[key]) ||
			BigInt(size) !== after.size
		)
			throw new Error('Source changed while being read; retry from a stable source');
		return {path: sourcePath, size, sha256: digest.digest('hex'), window: Buffer.concat(windows)};
	} finally {
		await handle.close();
	}
}

/** Called by pagination to avoid cutting a UTF-8 code point at a page boundary.
 *
 * @param {Buffer} buffer - Captured source bytes.
 * @param {number} length - Maximum prefix length in bytes.
 * @returns {number} - Prefix length ending on a code point boundary.
 */
function boundary(buffer, length) {
	while (length > 0 && length < buffer.length && (buffer[length] & 0xc0) === 0x80) length--;
	return length;
}

/** Called by pagination to encode the next unread position.
 *
 * @param {string} batch - Digest of ordered source identities.
 * @param {number} index - Next source index.
 * @param {number} offset - Next byte position within that source.
 * @param {number} count - Number of sources in the batch.
 * @returns {string | null} - Opaque cursor, or null when all input was emitted.
 */
function continuation(batch, index, offset, count) {
	return index === count ? null : Buffer.from(JSON.stringify({b: batch, i: index, o: offset})).toString('base64url');
}

/** Called by pagination to measure exactly the text that the CLI will emit.
 *
 * @param {string} batch - Ordered source identity digest.
 * @param {BoundedReadPosition} start - Initial position of this page.
 * @param {BoundedReadPart[]} parts - Contiguous source fragments in this page.
 * @param {string | null} next - Next unread cursor, or completion.
 * @returns {string} - Raw text, framing and continuation, including final newline.
 */
function render(batch, start, parts, next) {
	return (
		`BATCH ${batch} FROM ${start.i}:${start.o}\n` +
		parts
			.map(
				(part) =>
					`FILE ${part.index} ${JSON.stringify(part.path)} SHA256 ${part.sha256} BYTES ${part.start}:${part.end}/${part.total}\n${part.text}\n`,
			)
			.join('') +
		(next === null ? `DONE ${batch}\n` : `NEXT ${next}\n`)
	);
}

/** Call this method to read one byte-bounded page across an ordered file batch.
 * Source text is preserved exactly, including BOMs and line endings. No files are
 * written. Invalid inputs, changed source identities, malformed UTF-8 or a budget
 * too small for metadata plus one code point reject the request without output.
 * All sources are rehashed on continuation; their contents are not all buffered.
 * The bound covers the returned text, not a caller's additional wrapper output.
 *
 * @param {string[]} files - Nonempty ordered list of distinct UTF-8 source files.
 * @param {BoundedReadOptions} options - Byte budget and optional continuation.
 * @returns {Promise<BoundedReadPage>} - Bounded rendered text and delivery metadata.
 */
export async function readBoundedBatch(files, options = {}) {
	if (
		!options ||
		typeof options !== 'object' ||
		Array.isArray(options) ||
		Object.keys(options).some((key) => !['maxBytes', 'cursor'].includes(key))
	)
		throw new Error('Invalid bounded-read options');
	const maxBytes = options.maxBytes === undefined ? defaultBytes : options.maxBytes;
	if (!Number.isSafeInteger(maxBytes) || maxBytes < 512 || maxBytes > maximumBytes)
		throw new Error('maxBytes must be an integer between 512 and 8192');
	if (!Array.isArray(files) || !files.length || files.some((file) => typeof file !== 'string' || !file.trim()))
		throw new Error('Supply at least one source file');
	const start = position(options.cursor);
	if (start.i >= files.length) throw new Error('Cursor is outside the source batch');
	const paths = await Promise.all(files.map((file) => fs.realpath(path.resolve(file))));
	const keys = paths.map((file) => (process.platform === 'win32' ? file.toLowerCase() : file));
	if (new Set(keys).size !== paths.length) throw new Error('Duplicate source files in batch');
	const sources = [];
	for (let index = 0; index < paths.length; index++)
		sources.push(await inspect(paths[index], index < start.i ? -1 : index === start.i ? start.o : 0, maxBytes));
	const batch = createHash('sha256')
		.update('bounded-read:1\n')
		.update(JSON.stringify(sources.map(({path: file, size, sha256}) => [file, size, sha256])))
		.digest('hex');
	if (start.b && start.b !== batch) throw new Error('Source batch changed; begin a new read');
	const first = sources[start.i];
	if (start.o > first.size || (start.o === first.size && first.size > 0) || (first.window[0] & 0xc0) === 0x80)
		throw new Error('Cursor is not at a valid unread UTF-8 position');
	const parts = [];
	let next = options.cursor ?? continuation(batch, 0, 0, sources.length);
	let output = '';
	for (let index = start.i; index < sources.length; index++) {
		const source = sources[index];
		const offset = index === start.i ? start.o : 0;
		/** Called by pagination to build a candidate including its complete framing.
		 * @param {number} length - Candidate source prefix in bytes.
		 * @returns {BoundedReadCandidate} - Candidate part and complete rendered page.
		 */
		const candidate = (length) => {
			const end = offset + boundary(source.window, length);
			const part = {
				index,
				path: source.path,
				sha256: source.sha256,
				start: offset,
				end,
				total: source.size,
				text: source.window.subarray(0, end - offset).toString('utf8'),
			};
			const cursor = continuation(
				batch,
				end === source.size ? index + 1 : index,
				end === source.size ? 0 : end,
				sources.length,
			);
			const text = render(batch, start, [...parts, part], cursor);
			return {part, cursor, text, bytes: Buffer.byteLength(text)};
		};
		const available = Math.min(maxBytes, source.size - offset);
		let selected = candidate(available);
		if (selected.bytes > maxBytes) {
			let low = 0,
				high = available - 1;
			selected = null;
			while (low <= high) {
				const middle = Math.floor((low + high) / 2);
				const attempt = candidate(middle);
				if (attempt.bytes <= maxBytes) {
					selected = attempt;
					low = middle + 1;
				} else high = middle - 1;
			}
		}
		if (!selected || (selected.part.end === offset && offset < source.size)) {
			if (!parts.length)
				throw new Error(
					'Budget cannot fit source metadata and a character; use a shorter source path or a larger budget within the existing cap',
				);
			break;
		}
		parts.push(selected.part);
		next = selected.cursor;
		output = selected.text;
		if (selected.part.end < source.size) break;
	}
	return {batch, text: output, bytes: Buffer.byteLength(output), next, parts};
}

if (process.argv[1] && (await fs.realpath(process.argv[1]).catch(() => null)) === fileURLToPath(import.meta.url)) {
	try {
		const {values, positionals} = parseArgs({
			options: {cursor: {type: 'string'}, 'max-bytes': {type: 'string'}},
			allowPositionals: true,
		});
		const page = await readBoundedBatch(positionals, {
			cursor: values.cursor,
			maxBytes: values['max-bytes'] === undefined ? defaultBytes : Number(values['max-bytes']),
		});
		process.stdout.write(page.text);
	} catch (error) {
		const bytes = Buffer.from(`bounded-read: ${error.message}\n`);
		process.stderr.write(bytes.subarray(0, boundary(bytes, Math.min(512, bytes.length))));
		process.exitCode = 1;
	}
}
