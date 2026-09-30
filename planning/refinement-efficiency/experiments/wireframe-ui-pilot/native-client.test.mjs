import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {NativeClient} from './native-client.mjs';

/**
 * Called by tests to create a disposable catalog and replace only process creation.
 *
 * @param {NativeClientTestContext} context - Test cleanup and mock owner.
 * @returns {NativeClientFixture} - Isolated launcher and externally controlled fake CLI calls.
 */
function fixture(context) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wireframe-native-client-'));
	const workspace = path.join(root, 'workspace');
	const home = path.join(root, 'home');
	const binaryDirectory = path.join(root, 'bin');
	for (const directory of [workspace, home, binaryDirectory]) fs.mkdirSync(directory);
	fs.writeFileSync(path.join(binaryDirectory, process.platform === 'win32' ? 'codex.exe' : 'codex'), '');
	fs.writeFileSync(
		path.join(home, 'models_cache.json'),
		JSON.stringify({models: [{slug: 'test-model', tool_mode: 'code_mode_only', use_responses_lite: true}]}),
	);
	const previousHome = process.env.CODEX_HOME;
	const previousPath = process.env.PATH;
	process.env.CODEX_HOME = home;
	process.env.PATH = binaryDirectory;
	context.after(() => {
		if (previousHome === undefined) delete process.env.CODEX_HOME;
		else process.env.CODEX_HOME = previousHome;
		if (previousPath === undefined) delete process.env.PATH;
		else process.env.PATH = previousPath;
		fs.rmSync(root, {recursive: true, force: true});
	});
	const events = [];
	const client = new NativeClient({
		governance: root,
		workspace,
		outputDirectory: path.join(root, 'evidence'),
		url: 'http://127.0.0.1:1234/mcp',
		token: 'private-token',
		models: ['test-model'],
		event: (event) => events.push(event),
	});
	const calls = [];
	context.mock.method(client, '_spawn', (args) => {
		const child = new EventEmitter();
		child.stdin = new PassThrough();
		child.stdout = new PassThrough();
		child.stderr = new PassThrough();
		calls.push({args, child});
		return child;
	});
	return {client, calls, events, home};
}

/**
 * Called by tests to report a native completed turn without closing its process.
 *
 * @param {NativeClientFakeCall} call - Captured process invocation.
 * @param {string} threadId - Session identity reported by the fake CLI.
 * @returns {void} - Completion events and final message written to the launcher boundary.
 */
function completeTurn(call, threadId) {
	call.child.stdout.write(JSON.stringify({type: 'thread.started', thread_id: threadId}) + '\n');
	call.child.stdout.write(
		JSON.stringify({type: 'turn.completed', usage: {input_tokens: 7, output_tokens: 3}}) + '\n',
	);
	const resultPath = call.args[call.args.indexOf('-o') + 1];
	fs.writeFileSync(resultPath, 'Completed private result');
}

test('native author waits for process closure, records evidence and resumes the same thread', async (context) => {
	const {client, calls, events, home} = fixture(context);
	let resolved = false;
	const first = client.run({role: 'ui-author', model: 'test-model', effort: 'medium', prompt: 'Private warm-up'});
	first.then(() => (resolved = true));
	assert.equal(calls[0].child.stdin.read().toString(), 'Private warm-up');
	calls[0].child.stdout.write(
		JSON.stringify({
			type: 'item.started',
			item: {
				type: 'mcp_tool_call',
				id: 'tool-1',
				server: 'polylith_workflows',
				tool: 'workflow_read',
				arguments: 'private input',
			},
		}) + '\n',
	);
	completeTurn(calls[0], 'test-thread');
	await Promise.resolve();
	assert.equal(resolved, false, 'A turn event must not resolve before process closure');
	const sessionDirectory = path.join(home, 'sessions/2026/09/30');
	fs.mkdirSync(sessionDirectory, {recursive: true});
	fs.writeFileSync(
		path.join(sessionDirectory, 'rollout-test-thread.jsonl'),
		JSON.stringify({
			type: 'turn_context',
			timestamp: new Date().toISOString(),
			payload: {model: 'test-model', effort: 'medium', cwd: client.workspace},
		}) + '\n',
	);
	calls[0].child.stderr.write('private stderr\n');
	calls[0].child.emit('close', 0);
	const result = await first;
	assert.equal(result.threadId, 'test-thread');
	assert.equal(result.exitCode, 0);
	assert.deepEqual(result.usage, {input_tokens: 7, output_tokens: 3});
	assert(result.elapsedMs >= 0);
	assert.equal(fs.readFileSync(result.resultPath, 'utf8'), 'Completed private result');
	const evidenceDirectory = path.dirname(result.resultPath);
	assert.match(fs.readFileSync(path.join(evidenceDirectory, 'runtime.private.jsonl'), 'utf8'), /turn.completed/);
	assert.equal(fs.readFileSync(path.join(evidenceDirectory, 'stderr.private.log'), 'utf8'), 'private stderr\n');
	assert.equal(events.at(-1).runtime.model, 'test-model');
	assert.equal(events.at(-1).runtime.effort, 'medium');
	const toolEvent = events.find((event) => event.itemId === 'tool-1');
	assert.equal(toolEvent.toolName, 'workflow_read');
	assert.equal(toolEvent.server, 'polylith_workflows');
	assert.doesNotMatch(JSON.stringify(events), /Private warm-up|Completed private result|private-token|private input/);
	const next = client.run({role: 'ui-author', model: 'test-model', effort: 'medium', prompt: 'Ready component'});
	const args = calls[1].args;
	assert.equal(args[args.indexOf('resume') + 1], 'test-thread');
	assert(args.indexOf('--approve-for-me') < args.indexOf('resume'));
	assert(args.indexOf('-C') < args.indexOf('resume'));
	assert(args.includes('sandbox_workspace_write.writable_roots=[]'));
	assert(!args.includes('--add-dir'));
	assert.doesNotMatch(args.join('\n'), /openai_base_url|private-token/);
	completeTurn(calls[1], 'test-thread');
	calls[1].child.emit('close', 0);
	assert.equal((await next).threadId, 'test-thread');
});

test('one role cannot overlap while different authors can run concurrently', async (context) => {
	const {client, calls} = fixture(context);
	const request = {role: 'ui-author', model: 'test-model', effort: 'medium', prompt: 'Prepare'};
	const first = client.run(request);
	await assert.rejects(client.run(request), /already has an active turn/);
	const second = client.run({...request, role: 'wireframe-author'});
	assert.equal(calls.length, 2);
	completeTurn(calls[1], 'wireframe-thread');
	calls[1].child.emit('close', 0);
	assert.equal((await second).threadId, 'wireframe-thread');
	completeTurn(calls[0], 'ui-thread');
	calls[0].child.emit('close', 0);
	await first;
	await assert.rejects(client.run({...request, threadId: 'different-thread'}), /retain its author thread/);
});

test('startup errors release the role and nonzero exits preserve failure evidence', async (context) => {
	const {client, calls} = fixture(context);
	const request = {role: 'ui-author', model: 'test-model', effort: 'medium', prompt: 'Prepare'};
	const failed = client.run(request);
	calls[0].child.emit('error', new Error('mock launch failure'));
	await assert.rejects(failed, /mock launch failure/);
	const retry = client.run(request);
	calls[1].child.stderr.write('startup refused\n');
	calls[1].child.emit('close', 2);
	const result = await retry;
	assert.equal(result.exitCode, 2);
	assert.equal(result.threadId, null);
	assert.equal(result.usage, null);
	assert.equal(
		fs.readFileSync(path.join(path.dirname(result.resultPath), 'stderr.private.log'), 'utf8'),
		'startup refused\n',
	);
});

test('a leftover local model route cannot launch through the experiment client', (context) => {
	const previous = process.env.OPENAI_BASE_URL;
	process.env.OPENAI_BASE_URL = 'http://127.0.0.1:9999';
	context.after(() => {
		if (previous === undefined) delete process.env.OPENAI_BASE_URL;
		else process.env.OPENAI_BASE_URL = previous;
	});
	assert.throws(() => fixture(context), /Refusing inherited local model route/);
});
