import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {UiCapture, capturePath} from './UiCapture.mjs';
import {buildDesignLanguageAssetOutputs} from './design-language-html.mjs';

const parent = fileURLToPath(new URL('../../../.codex-tmp/capture-promotion/tests/', import.meta.url));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

function directory(scenario, retain = false) {
	fs.mkdirSync(parent, {recursive: true});
	const root = fs.mkdtempSync(path.join(parent, 'case-'));
	if (!retain)
		scenario.after(() => {
			assert.equal(path.dirname(fs.realpathSync(root)), fs.realpathSync(parent));
			fs.rmSync(root, {recursive: true, force: true});
		});
	return root;
}

test('capture authorities reject traversal, broad roots and linked inputs', async (scenario) => {
	const root = directory(scenario);
	for (const relative of ['../outside', '/outside', 'C:/outside', 'a/../outside', 'a\\outside', 'CON.png'])
		assert.throws(() => capturePath(root, relative, false), /safe relative/);
	assert.throws(
		() => new UiCapture({sourceRoot: path.parse(root).root, runRoot: root, executablePath: process.execPath}),
		/filesystem roots/,
	);
	const linked = path.join(root, 'linked');
	fs.symlinkSync(root, linked, process.platform === 'win32' ? 'junction' : 'dir');
	assert.throws(() => capturePath(root, 'linked/input.html', false), /links/);
	const worker = new UiCapture({sourceRoot: root, runRoot: root, executablePath: process.execPath});
	for (const invalid of [null, [], {}, {command: 'info'}])
		await assert.rejects(worker.capture(invalid), /Invalid capture request/);
	assert.equal(worker._busy, false, 'Malformed ingress must not poison the next request');
	await worker.close();
});

test(
	'installed browser reuses startup, loads fonts/images and recovers without publishing failed images',
	{skip: !process.env.UI_CAPTURE_BROWSER, timeout: 90000},
	async (scenario) => {
		const root = directory(scenario, true),
			run = path.join(root, 'run');
		fs.mkdirSync(run);
		const design = JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json', import.meta.url)));
		delete design.baseRevision;
		Object.assign(design, {id: 'capture-design', revision: 1, decisions: []});
		design.theme.id = 'capture-theme';
		const font = buildDesignLanguageAssetOutputs(design).get('assets/fonts/roboto.ttf');
		assert.ok(font, 'The licensed local Roboto font must be available');
		fs.writeFileSync(path.join(root, 'font.ttf'), font);
		const png = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/AkAAAAASUVORK5CYII=',
			'base64',
		);
		fs.writeFileSync(path.join(root, 'image.png'), png);
		const html =
			'<!doctype html><style>@font-face{font-family:CaptureFixture;src:url(font.ttf)}body{font-family:CaptureFixture;background:#def}button:focus{outline:4px solid red}</style><h1>Capture fixture</h1><img src="image.png"><button autofocus>Focus</button>';
		fs.writeFileSync(path.join(root, 'scene.html'), html);
		const worker = new UiCapture({
			sourceRoot: root,
			runRoot: run,
			executablePath: process.env.UI_CAPTURE_BROWSER,
			timeoutMs: 5000,
			cleanupMs: 2000,
		});
		scenario.after(async () => {
			await worker.close();
			assert.equal(path.dirname(fs.realpathSync(root)), fs.realpathSync(parent));
			fs.rmSync(root, {recursive: true, force: true});
		});
		const request = {
			id: 'first',
			sceneRef: 'fixture',
			variant: 'clean',
			html: 'scene.html',
			htmlSha256: sha(html),
			assets: [
				{path: 'font.ttf', sha256: sha(font)},
				{path: 'image.png', sha256: sha(png)},
			],
			requiredFonts: ['CaptureFixture'],
			width: 640,
			height: 480,
			output: 'first.png',
		};
		const first = await worker.capture(request);
		assert.equal(first.status, 'success', JSON.stringify(first));
		assert.deepEqual(first.readiness, {fonts: ['CaptureFixture'], images: [{width: 1, height: 1}]});
		const second = await worker.capture({...request, id: 'second', output: 'second.png'});
		assert.equal(second.status, 'success', JSON.stringify(second));
		assert.equal(second.browserGeneration, first.browserGeneration);
		assert.equal(second.browserPid, first.browserPid);
		assert.equal(second.pngSha256, first.pngSha256);
		const before = fs.readFileSync(path.join(run, 'first.png'));
		const overwrite = await worker.capture(request);
		assert.equal(overwrite.status, 'failed');
		assert.match(overwrite.error, /OUTPUT_EXISTS/);
		assert.deepEqual(fs.readFileSync(path.join(run, 'first.png')), before);
		const missingFont = await worker.capture({
			...request,
			id: 'missing-font',
			output: 'missing-font.png',
			requiredFonts: ['UnavailableFixtureFont'],
		});
		assert.equal(missingFont.status, 'failed');
		assert.match(missingFont.error, /FONT_NOT_LOADED/);
		assert.equal(fs.existsSync(path.join(run, 'missing-font.png')), false);
		const changed = await worker.capture({
			...request,
			id: 'changed',
			output: 'changed.png',
			htmlSha256: '0'.repeat(64),
		});
		assert.match(changed.error, /INPUT_CHANGED/);
		fs.writeFileSync(
			path.join(root, 'blocked.html'),
			'<!doctype html><link rel="stylesheet" href="https://example.invalid/style.css"><h1>Blocked resource</h1>',
		);
		const blocked = await worker.capture({
			...request,
			id: 'blocked',
			output: 'blocked.png',
			html: 'blocked.html',
			htmlSha256: sha(fs.readFileSync(path.join(root, 'blocked.html'))),
			requiredFonts: [],
			assets: [],
		});
		assert.equal(blocked.status, 'failed');
		assert.ok(blocked.failedResources.some((item) => item.error === 'UNDECLARED_RESOURCE'));
		assert.equal(fs.existsSync(path.join(run, 'blocked.png')), false);
		const recovery = await worker.capture({...request, id: 'recovery', output: 'recovery.png'});
		assert.equal(recovery.status, 'success', JSON.stringify(recovery));
		const child = worker._browser.process();
		const exit = new Promise((resolve) => child.once('exit', resolve));
		child.kill('SIGKILL');
		await exit;
		const afterCrash = await worker.capture({...request, id: 'after-crash', output: 'after-crash.png'});
		assert.equal(afterCrash.status, 'success', JSON.stringify(afterCrash));
		assert.ok(afterCrash.browserGeneration > recovery.browserGeneration);
		fs.writeFileSync(path.join(root, 'stalled.html'), '<!doctype html><script>while(true){}</script>');
		const timeoutStart = Date.now();
		const stalled = await worker.capture({
			...request,
			id: 'stalled',
			output: 'stalled.png',
			html: 'stalled.html',
			htmlSha256: sha(fs.readFileSync(path.join(root, 'stalled.html'))),
			requiredFonts: [],
			assets: [],
		});
		assert.equal(stalled.status, 'failed');
		assert.match(stalled.error, /DEADLINE|timeout/i);
		assert.ok(Date.now() - timeoutStart < 12000, 'Capture and cleanup must return within their operation bounds');
		assert.equal(fs.existsSync(path.join(run, 'stalled.png')), false);
		const afterTimeout = await worker.capture({...request, id: 'after-timeout', output: 'after-timeout.png'});
		assert.equal(afterTimeout.status, 'success', JSON.stringify(afterTimeout));
		const lastChild = worker._browser.process();
		worker._browser.close = () => new Promise(() => {});
		const closeStart = Date.now();
		await worker.close();
		assert.ok(Date.now() - closeStart < 5000, 'A hung browser.close must not hang the worker');
		assert.ok(lastChild.exitCode !== null || lastChild.signalCode !== null, 'Owned browser exit must be observed');
	},
);
