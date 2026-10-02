import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {ExperimentHarness} from './harness.mjs';

const harnessPath = fileURLToPath(new URL('./harness.mjs', import.meta.url));
const browser = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

function fixture() {
	return {
		schemaVersion: 'wireframe-ui-pilot-1',
		elementId: 'example-surface',
		revision: 1,
		sourceFlowRefs: ['frozen-flow-id'],
		sourceActionRefs: ['exact/action-id'],
		parts: [
			{
				id: 'main',
				root: {
					id: 'workspace',
					kind: 'region',
					label: 'Workspace',
					layout: {
						mode: 'grid',
						columns: [{unit: 'fr', value: 1}],
						rows: [{unit: 'content'}, {unit: 'content'}],
						gap: 12,
						padding: 16,
						align: 'stretch',
						justify: 'start',
					},
					children: [
						{
							id: 'title',
							kind: 'component',
							templateRef: {id: 'heading', version: '1'},
							state: 'default',
							parameters: {text: 'Example workspace'},
						},
						{
							id: 'action',
							kind: 'component',
							templateRef: {id: 'button', version: '1'},
							state: 'default',
							actionRef: 'exact/action-id',
							parameters: {label: 'Action'},
						},
					],
				},
			},
		],
		scenes: [
			{id: 'base', name: 'Base workspace', partRef: 'main', changes: [], viewport: {width: 800, height: 300}},
			{
				id: 'disabled',
				name: 'Disabled action',
				partRef: 'main',
				changes: [{nodeRef: 'action', set: {state: 'disabled'}}],
				viewport: {width: 800, height: 300},
			},
		],
		ui: {
			theme: {
				primary: '#333333',
				onPrimary: '#ffffff',
				surface: '#ffffff',
				background: '#eeeeee',
				text: '#111111',
				muted: '#555555',
				border: '#888888',
				accent: '#333333',
				danger: '#111111',
				disabledBackground: '#dddddd',
				disabledForeground: '#555555',
				fieldBorder: '#888888',
				fieldLabel: '#555555',
				radius: 4,
				fieldRadius: 4,
				fontSize: 14,
			},
		},
	};
}

async function workspace(context) {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'descriptive-harness-'));
	context.after(async () => {
		const relative = path.relative(os.tmpdir(), directory);
		assert(!relative.startsWith('..') && !path.isAbsolute(relative));
		assert(path.basename(directory).startsWith('descriptive-harness-'));
		await fs.rm(directory, {recursive: true, force: true});
	});
	const input = path.join(directory, 'input.json');
	await fs.writeFile(input, JSON.stringify(fixture()));
	return {directory, input, events: path.join(directory, 'events.jsonl'), run: 'test-run', stage: 'ui'};
}

async function events(target) {
	return (await fs.readFile(target, 'utf8'))
		.trim()
		.split('\n')
		.map((line) => JSON.parse(line));
}

test('CLI appends actual UTC markers and retains nested decision details', async (context) => {
	const options = await workspace(context);
	const begin = Date.now();
	const result = spawnSync(
		process.execPath,
		[
			harnessPath,
			'mark',
			'--events',
			options.events,
			'--run',
			options.run,
			'--stage',
			'layout',
			'--phase',
			'start',
			'--details',
			'{"timestamp":"fake","decision":"reuse frozen packet"}',
		],
		{encoding: 'utf8'},
	);
	assert.equal(result.status, 0, result.stderr);
	await ExperimentHarness.mark({...options, stage: 'layout'}, 'end');
	const entries = await events(options.events);
	assert.equal(entries.length, 2);
	assert(Date.parse(entries[0].timestamp) >= begin && Date.parse(entries[0].timestamp) <= Date.now());
	assert.equal(entries[0].details.timestamp, 'fake');
	assert.equal(entries[0].details.decision, 'reuse frozen packet');
	assert.deepEqual(
		entries.map((entry) => entry.phase),
		['start', 'end'],
	);
	assert.equal(entries[0].run, 'test-run');
});

test('both render modes preserve selected scenarios, exact source actions and the immutable author file', async (context) => {
	const options = await workspace(context);
	const before = await fs.readFile(options.input);
	const wireframe = await ExperimentHarness.render({
		...options,
		mode: 'wireframe',
		outputDir: path.join(options.directory, 'wireframe'),
	});
	const ui = await ExperimentHarness.render({...options, mode: 'ui', outputDir: path.join(options.directory, 'ui')});
	assert.deepEqual(await fs.readFile(options.input), before);
	assert.deepEqual(ui.sceneIds, wireframe.sceneIds);
	assert.deepEqual(
		ui.coverage.map((item) => item.actionRef),
		['exact/action-id', 'exact/action-id'],
	);
	assert.equal(ui.inputBytes, before.length);
	assert.match(ui.inputSha256, /^[a-f0-9]{64}$/);
	const html = await fs.readFile(ui.previewPath, 'utf8');
	assert.match(html, /Experimental provisional preview/);
	assert.doesNotMatch(html, /wireframe review pending|unreviewed source UX/);
	assert.match(html, /data-ui-scene="disabled"/);
	assert.match(html, /<button[^>]*disabled/);
	assert.equal(html.indexOf('Experimental provisional'), html.lastIndexOf('Experimental provisional'));
	assert(html.indexOf('Experimental provisional') < html.indexOf('<main>'));
	const entries = await events(options.events);
	assert.deepEqual(
		entries.map((entry) => entry.phase),
		['start', 'end', 'start', 'end'],
	);
	assert(entries.filter((entry) => entry.phase === 'end').every((entry) => entry.durationMs >= 0));
});

test('render CLI accepts complete final UI envelopes without an intermediate wireframe', async (context) => {
	const options = await workspace(context);
	const outputDir = path.join(options.directory, 'candidate-ui');
	const result = spawnSync(
		process.execPath,
		[
			harnessPath,
			'--mode',
			'ui',
			'--input',
			options.input,
			'--output-dir',
			outputDir,
			'--events',
			options.events,
			'--run',
			options.run,
			'--stage',
			options.stage,
		],
		{encoding: 'utf8'},
	);
	assert.equal(result.status, 0, result.stderr);
	assert.deepEqual(JSON.parse(result.stdout).sceneIds, ['base', 'disabled']);
	assert.equal((await fs.readdir(outputDir)).includes('render.json'), true);
});

test('missing themes and dangling action references fail with measured errors', async (context) => {
	const options = await workspace(context);
	const document = fixture();
	delete document.ui.theme.primary;
	await fs.writeFile(options.input, JSON.stringify(document));
	await assert.rejects(
		ExperimentHarness.render({...options, mode: 'ui', outputDir: options.directory}),
		/complete ui.theme/,
	);
	document.ui = fixture().ui;
	document.parts[0].root.children[1].actionRef = 'not-in-source';
	await fs.writeFile(options.input, JSON.stringify(document));
	await assert.rejects(
		ExperimentHarness.render({...options, mode: 'ui', outputDir: options.directory}),
		/sourceActionRefs/,
	);
	const entries = await events(options.events);
	assert.equal(entries.filter((entry) => entry.phase === 'error').length, 2);
	assert(entries.filter((entry) => entry.phase === 'error').every((entry) => entry.durationMs >= 0 && entry.error));
});

test('summary preserves nested and overlapping observations without summed stage totals', () => {
	const marker = (stage, phase, seconds, details = {}) => ({
		type: 'marker',
		run: 'pair-a',
		stage,
		phase,
		timestamp: `2026-10-02T00:00:${String(seconds).padStart(2, '0')}.000Z`,
		details,
	});
	const entries = [
		marker('ui', 'dispatch', 0),
		marker('ui', 'start', 2, {actor: 'author'}),
		marker('inspection', 'start', 3),
		marker('inspection', 'end', 5),
		marker('ui', 'end', 8, {actor: 'author'}),
		marker('ui', 'observed-completion', 10),
		marker('report', 'start', 11),
	];
	const result = ExperimentHarness.summarize(entries);
	assert.deepEqual(
		result.stageWindows.map((window) => window.durationMs),
		[2000, 6000, 10000],
	);
	assert(result.stageWindows.every((window) => window.overlaps.length === 2));
	assert.equal(result.unclosedStarts[0].stage, 'report');
	assert.equal(result.markers.length, entries.length);
	assert.equal(result.totalDurationMs, undefined);
});

test('installed browser captures every selected scene and returns actual geometry', async (context) => {
	try {
		await fs.access(browser);
	} catch {
		context.skip('No installed Edge browser; no download attempted');
		return;
	}
	const options = await workspace(context);
	const outputDir = path.join(options.directory, 'captured-ui');
	await ExperimentHarness.render({...options, mode: 'ui', outputDir});
	const captured = await ExperimentHarness.capture({...options, outputDir, browser});
	assert.equal(captured.complete, true);
	assert.deepEqual(
		captured.pages.flatMap((page) => page.sceneIds),
		['base', 'disabled'],
	);
	assert(captured.pages.every((page) => page.bytes > 100 && page.diagnostics.controlsChecked === 4));
	assert(captured.pages.every((page) => !page.diagnostics.unavailable));
	const saved = JSON.parse(await fs.readFile(path.join(outputDir, 'captures.json'), 'utf8'));
	assert.equal(saved.pages[0].sha256, captured.pages[0].sha256);
	const entries = await events(options.events);
	assert(entries.some((entry) => entry.tool === 'browser' && entry.phase === 'end'));
});

test('capture failure retains render artifacts and timing rather than inventing screenshots', async (context) => {
	const options = await workspace(context);
	const outputDir = path.join(options.directory, 'failed-capture');
	await ExperimentHarness.render({...options, mode: 'ui', outputDir});
	await assert.rejects(
		ExperimentHarness.capture({...options, outputDir, browser: path.join(options.directory, 'missing-browser')}),
		/ENOENT/,
	);
	await fs.access(path.join(outputDir, 'render.json'));
	await fs.access(path.join(outputDir, 'preview.html'));
	assert((await events(options.events)).some((entry) => entry.tool === 'capture' && entry.phase === 'error'));
});
