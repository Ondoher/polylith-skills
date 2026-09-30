import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {WorkflowService} from '../../../../scripts/mcp/WorkflowService.mjs';
import {McpHttpServer} from '../../../../scripts/mcp/McpHttpServer.mjs';
import {PilotInputs} from './prepare.mjs';
import {PilotStore} from './PilotStore.mjs';
import {NativeClient} from './native-client.mjs';
import {runReviewedPipeline} from './reviewed-pipeline.mjs';
import {wireframeCapabilities} from '../../../../skills/refine-design/scripts/wireframe-contract.mjs';
import {
	geometryInspectionHtml,
	readGeometryInspection,
} from '../../../../skills/refine-design/scripts/wireframe-inspection.mjs';

const governance = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const argument = (name, fallback) =>
	process.argv
		.find((value) => value.startsWith('--' + name + '='))
		?.split('=')
		.slice(1)
		.join('=') ?? fallback;
const attemptName = argument('attempt', 'wireframe-ui-pilot-20260930');
assert(/^[a-z0-9-]+$/.test(attemptName));
const attempt = path.join(governance, '.codex-tmp', attemptName);
const workspace = path.join(attempt, 'workspace');
const execute = process.argv.includes('--execute');
const resume = process.argv.includes('--resume');
const runId = 'wireframe-ui-pilot';
const started = performance.now();
fs.mkdirSync(workspace, {recursive: true});
const eventsPath = path.join(attempt, 'events.jsonl');
const event = (value) => {
	const recorded = {at: new Date().toISOString(), monotonicMs: performance.now(), ...value};
	fs.appendFileSync(eventsPath, JSON.stringify(recorded) + '\n');
	if (
		['scope-ready', 'preview-ready', 'review-ready', 'native.started', 'native.completed', 'error'].includes(
			value.type,
		)
	)
		console.log(
			JSON.stringify({
				at: recorded.at,
				type: value.type,
				role: value.role ?? value.stage,
				elementId: value.elementId,
				revision: value.revision,
				elapsedMs: value.elapsedMs,
			}),
		);
};
event({type: 'run-start', execute, resume});
const manifestPath = path.join(workspace, 'source-manifest.json');
const readJson = (location) => JSON.parse(fs.readFileSync(location));
const input = fs.existsSync(manifestPath)
	? {
			manifest: readJson(manifestPath),
			context: readJson(path.join(workspace, 'inputs/context.json')),
			design: readJson(path.join(workspace, 'inputs/design.json')),
		}
	: argument('fixture', null)
		? prepareFixture(path.resolve(argument('fixture')))
		: PilotInputs.prepare(governance, workspace);

function prepareFixture(source) {
	const fixture = readJson(source);
	assert(
		fixture.context && fixture.design && fixture.scope,
		'Fixture needs source context, design and boundary scope',
	);
	fs.mkdirSync(path.join(workspace, 'inputs'), {recursive: true});
	fs.mkdirSync(path.join(workspace, 'outputs'), {recursive: true});
	for (const name of ['context', 'design'])
		fs.writeFileSync(path.join(workspace, 'inputs', name + '.json'), JSON.stringify(fixture[name], null, 2));
	fs.writeFileSync(path.join(workspace, 'outputs/scope.json'), JSON.stringify(fixture.scope, null, 2));
	const manifest = {protectedPaths: [source], hashes: PilotInputs.hashFiles([source]), fixture: true};
	fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
	return {manifest, context: fixture.context, design: fixture.design};
}
assert.deepEqual(PilotInputs.hashFiles(input.manifest.protectedPaths), input.manifest.hashes, 'Frozen inputs changed');
fs.writeFileSync(
	path.join(workspace, 'AGENTS.md'),
	'# Isolated wireframe/UI experiment\nBootstrap profile: instructions-only\nFollow the supplied bounded role assignment. Keep canonical/live product files unchanged. No Git operations or unrelated skill discovery. Use the assigned local MCP data service for reads and contributions. Use normal model connection; no redirect.\n',
);
const statePath = path.join(attempt, 'state.private.json');
const state = fs.existsSync(statePath)
	? readJson(statePath)
	: {threads: {}, completed: [], reviews: [], startedAt: new Date().toISOString(), decisions: []};
const saveState = () => fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
if (execute) {
	delete state.error;
	state.status = 'reviewed-authoring-running';
	saveState();
}
const store = new PilotStore({
	workspace,
	context: input.context,
	preview: (receipt) => screenshot(receipt),
	event: (value) => {
		event(value);
	},
});
const service = new WorkflowService({workspace, pageBytes: 28000, operations: store.operations()});
service.open({access: service.ownerAccess, run: runId});
const token = randomBytes(32).toString('hex');
const server = new McpHttpServer(service, token);
const url = await server.listen();
// Preserve service boundary measurements without observing model requests.
for (const method of ['read', 'execute', 'store', 'catalog']) {
	const original = service[method].bind(service);
	service[method] = async (args) => {
		const begin = performance.now();
		const capability = service._capabilities.get(args.access);
		const actor = {
			role: capability?.scope?.role ?? 'coordinator',
			elementId: args.input?.elementId ?? capability?.scope?.elementId,
		};
		try {
			const value = await original(args);
			event({
				type: 'service',
				...actor,
				method,
				operation: args.operation,
				handle: args.handle,
				pointer: args.pointer,
				offset: args.offset,
				inputBytes: Buffer.byteLength(JSON.stringify(args.input ?? {})),
				textBytes: value.text ? Buffer.byteLength(value.text) : undefined,
				elapsedMs: performance.now() - begin,
				nextOffset: value.nextOffset,
				failed: false,
			});
			return value;
		} catch (error) {
			event({
				type: 'service',
				...actor,
				method,
				operation: args.operation,
				elapsedMs: performance.now() - begin,
				failed: true,
				error: error.message,
			});
			throw error;
		}
	};
}
const saveInput = (value) => service.store({access: service.ownerAccess, run: runId, value});
const readPlan = async (handle) => {
	const pages = [];
	let offset = 0;
	do {
		const page = await service.read({access: service.ownerAccess, handle, offset, maxBytes: 28000});
		pages.push({handle, offset, maxBytes: 28000});
		offset = page.nextOffset;
	} while (offset !== null);
	return pages;
};
const contextReceipt = await saveInput(input.context);
const designReceipt = await saveInput(input.design);
const contractText = fs.readFileSync(new URL('./render-contract.md', import.meta.url), 'utf8');
const contractReceipt = await saveInput({contract: contractText});
const sharedHandles = [contextReceipt.handle, designReceipt.handle, contractReceipt.handle];
const assign = (role, handles = [], scope = {}) =>
	service.assign({
		access: service.ownerAccess,
		run: runId,
		operations: [
			'result.store',
			'pilot.mark',
			...(role === 'wireframe'
				? ['pilot.contribute', 'pilot.submit']
				: role === 'ui'
					? ['pilot.contribute', 'pilot.submit']
					: ['pilot.review']),
		],
		handles: [...sharedHandles, ...handles],
		outputDirectory: path.join(workspace, 'outputs'),
		scope: {role, ...scope},
	});
// Supply exact array pointers; agents should assess design rather than guess storage paths.
const contextPointers = (element) =>
	Object.fromEntries(
		[
			['flows', element.sourceFlowRefs],
			['actions', element.sourceActionRefs],
			['interactionFrames', element.frameRefs],
		].map(([collection, refs]) => [
			collection,
			(input.context[collection] ?? []).flatMap((record, index) =>
				refs?.includes(record.id) ? [{id: record.id, pointer: '/' + collection + '/' + index}] : [],
			),
		]),
	);
const connection = (assignment) =>
	`MCP run=${runId}; assigned access=${assignment.access}. Use workflow_execute {access,run,operation,input}; operation results include inline small receipts. Use workflow_read {access,handle,pointer?,offset,maxBytes:28000}; pointer is an optional exact JSON pointer. Follow nextOffset, never ignore truncation. Normal native MCP only. Parallelize independent reads when supported. Do not use a model redirect, regenerate already saved data, write code/HTML, or access live products.`;
const client = execute
	? new NativeClient({
			governance,
			workspace,
			outputDirectory: path.join(attempt, 'clients'),
			url,
			token,
			models: ['gpt-6-sol', 'gpt-6-astra'],
			event,
		})
	: null;
const runClient = async (role, model, effort, prompt) => {
	event({type: 'dispatch', role});
	const result = await client.run({role, model, effort, prompt, threadId: state.threads[role]});
	if (result.threadId) state.threads[role] = result.threadId;
	state.clients ??= [];
	state.clients.push({role, ...result});
	saveState();
	assert.equal(result.exitCode, 0, role + ' client failed; saved artifacts retained');
	return result;
};
const screenshotCaptures = new Map();
const captureScreenshot = async (receipt) => {
	const begin = performance.now();
	const target = receipt.previewPath.replace(/\.html$/, '.png');
	if (fs.existsSync(target) && fs.statSync(target).size > 0) return {path: target};
	const document = readJson(receipt.path);
	const capturePath = receipt.previewPath.replace(/\.html$/, '-inspection.html');
	fs.writeFileSync(capturePath, geometryInspectionHtml(fs.readFileSync(receipt.previewPath, 'utf8')));
	let capturedDom = '';
	const width = Math.max(900, ...document.scenes.map((scene) => scene.viewport.width + 100));
	const height = Math.min(
		12000,
		200 + document.scenes.reduce((total, scene) => total + scene.viewport.height + 150, 0),
	);
	const executable = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
	if (!fs.existsSync(executable)) return {path: null, error: 'Preview capture browser is unavailable: ' + executable};
	const child = spawn(
		executable,
		[
			'--headless=new',
			'--disable-gpu',
			'--no-first-run',
			'--disable-extensions',
			'--dump-dom',
			'--virtual-time-budget=500',
			'--user-data-dir=' +
				path.join(attempt, 'browser', receipt.stage + '-' + receipt.elementId + '-r' + receipt.revision),
			'--screenshot=' + target,
			'--window-size=' + width + ',' + height,
			new URL('file:///' + capturePath.replaceAll('\\', '/')).href,
		],
		{stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true},
	);
	child.stdout.on('data', (chunk) => {
		capturedDom += chunk;
	});
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		child.kill();
	}, 30000);
	let exitCode;
	try {
		[exitCode] = await once(child, 'close');
	} finally {
		clearTimeout(timer);
	}
	receipt.layoutDiagnostics = readGeometryInspection(capturedDom);
	fs.writeFileSync(
		receipt.previewPath.replace(/\.html$/, '-geometry.json'),
		JSON.stringify(receipt.layoutDiagnostics),
	);
	event({
		type: 'layout-check',
		stage: receipt.stage,
		elementId: receipt.elementId,
		revision: receipt.revision,
		...receipt.layoutDiagnostics,
	});
	const exists = fs.existsSync(target) && fs.statSync(target).size > 0;
	const error = exists
		? null
		: timedOut
			? 'Preview capture timed out'
			: 'Preview capture produced no PNG (exit ' + exitCode + ')';
	event({
		type: 'screenshot',
		stage: receipt.stage,
		elementId: receipt.elementId,
		elapsedMs: performance.now() - begin,
		saved: exists,
		error,
	});
	return {path: exists ? target : null, error};
};
const screenshot = async (receipt) => {
	const key = receipt.previewPath;
	if (!screenshotCaptures.has(key))
		screenshotCaptures.set(
			key,
			captureScreenshot(receipt).catch((error) => ({path: null, error: error.message})),
		);
	const result = await screenshotCaptures.get(key);
	if (!result.path) {
		screenshotCaptures.delete(key);
		receipt.screenshotError = result.error;
		event({
			type: 'screenshot-unavailable',
			stage: receipt.stage,
			elementId: receipt.elementId,
			revision: receipt.revision,
			error: result.error,
		});
	} else delete receipt.screenshotError;
	return result.path;
};
try {
	if (execute) {
		await runReviewedPipeline({
			governance,
			workspace,
			store,
			service,
			runId,
			input,
			state,
			saveState,
			event,
			assign,
			runClient,
			connection,
			readPlan,
			screenshot,
			contractText,
			designReceipt,
			capabilities: wireframeCapabilities,
			selected: argument('elements', 'all'),
		});
		state.status = state.unresolvedReviews?.length ? 'review-incomplete' : 'review-complete';
	} else state.status = 'prepared';
} catch (error) {
	state.status = 'error';
	state.error = error.message;
	event({type: 'error', error: error.message});
	process.exitCode = 1;
} finally {
	await server.close();
	await service.drain();
	fs.writeFileSync(
		path.join(attempt, 'service-metrics-' + Date.now() + '.json'),
		JSON.stringify({http: server.samples, operations: service.measurements}, null, 2),
	);
	state.protectedUnchanged =
		JSON.stringify(PilotInputs.hashFiles(input.manifest.protectedPaths)) === JSON.stringify(input.manifest.hashes);
	state.lastCompletedAt = new Date().toISOString();
	state.lastExecutionMs = performance.now() - started;
	saveState();
	event({
		type: 'run-end',
		status: state.status,
		elapsedMs: state.lastExecutionMs,
		protectedUnchanged: state.protectedUnchanged,
	});
	assert(state.protectedUnchanged, 'Protected source bytes changed');
}
console.log(
	JSON.stringify({
		status: state.status,
		attempt,
		completed: state.completed,
		reviews: state.reviews.length,
		error: state.error,
		protectedUnchanged: state.protectedUnchanged,
	}),
);
