import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash, randomBytes} from 'node:crypto';
import {WorkflowService} from '../../../../scripts/mcp/WorkflowService.mjs';
import {OperationWorker} from '../../../../scripts/mcp/OperationWorker.mjs';
import {McpHttpServer} from '../../../../scripts/mcp/McpHttpServer.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const inputRoot = path.resolve(root, process.argv[2] ?? '.codex-tmp/ux-comparison-replay-20260928-160822/inputs');
const outputRoot = path.resolve(root, '.codex-tmp/ux-selection-comparison-20260928');
fs.mkdirSync(outputRoot, {recursive: true});
const startedAt = new Date().toISOString();
const started = performance.now();
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sources = Object.fromEntries(
	['facts', 'ux'].map((name) => {
		const file = path.join(inputRoot, `${name}.json`);
		const bytes = fs.readFileSync(file);
		return [name, {file, sha256: digest(bytes), value: JSON.parse(bytes)}];
	}),
);
const expected = JSON.parse(
	fs.readFileSync(path.join(root, 'planning/refinement-efficiency/ux-mcp-replay-20260928-metrics.json')),
);
for (const name of ['facts', 'ux']) {
	assert.equal(Buffer.byteLength(JSON.stringify(sources[name].value)), expected.inputReceipts[name].bytes);
	assert.equal(digest(JSON.stringify(sources[name].value)), expected.inputReceipts[name].sha256);
}
const worker = new OperationWorker();
const service = new WorkflowService({workspace: outputRoot, operations: worker.operations});
const token = randomBytes(32).toString('hex');
const server = new McpHttpServer(service, token);
const url = await server.listen();
const access = service.ownerAccess;
const run = 'ux-mcp-replay-20260928';
let sequence = 0;

/** Calls the production HTTP MCP server without a language-model intermediary.
 * @param {string} method - Workflow tool name suffix.
 * @param {object} args - Authorized arguments; never copied to the public report.
 * @returns {Promise<object>} - Decoded tool result.
 */
async function call(method, args) {
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${token}`,
			'content-type': 'application/json',
			accept: 'application/json, text/event-stream',
			'mcp-protocol-version': '2025-06-18',
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: ++sequence,
			method: 'tools/call',
			params: {name: `workflow_${method}`, arguments: args},
		}),
	});
	assert.equal(response.status, 200);
	const result = await response.json();
	assert.equal(result.error, undefined);
	assert.ok(!result.result.isError, result.result.content[0].text);
	return JSON.parse(result.result.content[0].text);
}

/** Reads every page at the unchanged production limit and checks exact reconstruction.
 * @param {object} receipt - Saved handle.
 * @param {string} pointer - Subtree to expose to the agent.
 * @param {object} value - Expected JSON value.
 * @returns {Promise<object>} - Measured page and byte counts, excluding model processing.
 */
async function readAll(receipt, pointer, value) {
	const start = performance.now();
	const sampleStart = server.samples.length;
	let offset = 0;
	const pages = [];
	do {
		const page = await call('read', {access, handle: receipt.handle, pointer, offset, maxBytes: 7000});
		assert.equal(page.offset, offset);
		assert.ok(Buffer.byteLength(page.text) <= 7000);
		pages.push(page.text);
		if (page.nextOffset !== null) assert.equal(page.nextOffset, offset + Buffer.byteLength(page.text));
		offset = page.nextOffset;
	} while (offset !== null);
	const joined = pages.join('');
	assert.equal(joined, JSON.stringify(value));
	return {
		bytes: Buffer.byteLength(joined),
		sha256: digest(joined),
		pages: pages.length,
		clientReadMs: performance.now() - start,
		httpHandlingMs: server.samples.slice(sampleStart).reduce((total, sample) => total + sample.handlingMs, 0),
		reassembledExactly: true,
	};
}

/** Indexes all explicit record IDs, including nested steps and alternates.
 * @param {object} value - Source or selected data.
 * @returns {Set<string>} - Existing identities.
 */
function identities(value) {
	const result = new Set();
	const visit = (item) => {
		if (Array.isArray(item)) item.forEach(visit);
		else if (item && typeof item === 'object') {
			if (typeof item.id === 'string') result.add(item.id);
			Object.values(item).forEach(visit);
		}
	};
	visit(value);
	return result;
}

/** Counts record bodies, excluding IDs that appear only in change or storage metadata.
 * @param {object} facts - Planner facts.
 * @param {object} ux - Full or selected UX.
 * @returns {Set<string>} - Substantive source identities.
 */
function semanticIds(facts, ux) {
	const model = facts.productModel;
	return identities({
		product: ['purpose', 'users', 'capabilities', 'goals', 'requirements', 'rules', 'gaps', 'sourceClaims'].map(
			(key) => model[key],
		),
		ux: {...ux, productModelBinding: null, sources: []},
	});
}

try {
	await call('open', {access, run});
	const handles = {};
	const full = {};
	for (const name of ['facts', 'ux']) {
		handles[name] = await call('store', {access, run, value: sources[name].value});
		full[name] = await readAll(handles[name], '', sources[name].value);
	}
	const trials = [];
	for (const [name, input] of [
		['actual-update', {}],
		['export-assignment-only', {changedRefs: [], flowIds: ['export-video']}],
	]) {
		const start = performance.now();
		const receipt = await call('execute', {
			access,
			run,
			operation: 'ux.select-input',
			input,
			inputHandles: Object.fromEntries(Object.entries(handles).map(([key, value]) => [key, value.handle])),
		});
		const preparationRoundTripMs = performance.now() - start;
		const result = JSON.parse(service.files.read(receipt.path));
		const packet = result.packet;
		const reads = await readAll(receipt, '/packet', packet);
		for (const [key, values] of Object.entries(packet.ux)) {
			if (!Array.isArray(values) || key === 'supportingAlternates') continue;
			for (const record of values)
				if (record?.id)
					assert.deepEqual(
						record,
						sources.ux.value[key].find((item) => item.id === record.id),
					);
		}
		assert.deepEqual(packet.facts.productModel.rules, sources.facts.value.productModel.rules);
		assert.deepEqual(packet.facts.productModel.gaps, sources.facts.value.productModel.gaps);
		for (const {flowRef, alternate} of packet.ux.supportingAlternates)
			assert.deepEqual(
				alternate,
				sources.ux.value.flows
					.find((flow) => `ux:flow:${flow.id}` === flowRef)
					.alternates.find((item) => item.id === alternate.id),
			);
		fs.writeFileSync(path.join(outputRoot, `${name}.json`), JSON.stringify(result));
		trials.push({
			name,
			input,
			...reads,
			preparationRoundTripMs,
			serverOperationMs: service.measurements.at(-1).operationMs,
			counts: result.receipt.counts,
			selectedFlowIds: result.receipt.selectedFlowIds,
			omittedDetailRefs: result.receipt.omittedDetailRefs,
			notices: packet.notices,
			breakdownBytes: Object.fromEntries(
				['facts', 'ux', 'overview', 'notices'].map((key) => [
					key,
					Buffer.byteLength(JSON.stringify(packet[key])),
				]),
			),
			inclusions: result.receipt.inclusions,
			seedImpacts: result.receipt.seedImpacts,
			checks: {selectedUxRecordsExact: true, globalRulesExact: true, globalGapsExact: true},
		});
	}
	// Consult the completed full-read answer only AFTER selection, strictly as a coverage probe.
	const plan = JSON.parse(
		fs.readFileSync(path.join(root, 'planning/refinement-efficiency/ux-mcp-replay-20260928-plan.json')),
	);
	const actual = JSON.parse(fs.readFileSync(path.join(outputRoot, 'actual-update.json'))).packet;
	const baselineIds = semanticIds(sources.facts.value, sources.ux.value);
	const detailedIds = semanticIds(actual.facts, actual.ux);
	const overviewIds = new Set(
		[...actual.overview.product, ...actual.overview.ux].map((item) => item.ref.split(':').at(-1)),
	);
	const refs = [...new Set(plan.changes.flatMap((change) => [...change.refs, ...change.sourceRefs]))];
	const coverage = Object.fromEntries(
		['detailed', 'overviewOnly', 'missing', 'notInBaseline'].map((key) => [key, []]),
	);
	for (const ref of refs) {
		const id = ref.startsWith('product:') ? ref.slice(8) : ref;
		coverage[
			!baselineIds.has(id)
				? 'notInBaseline'
				: detailedIds.has(id)
					? 'detailed'
					: overviewIds.has(id)
						? 'overviewOnly'
						: 'missing'
		].push(ref);
	}
	for (const source of Object.values(sources)) assert.equal(digest(fs.readFileSync(source.file)), source.sha256);
	const report = {
		kind: 'deterministic-ux-selection-comparison',
		startedAt,
		completedAt: new Date().toISOString(),
		wallMs: performance.now() - started,
		modelCalls: 0,
		productionPageLimit: 7000,
		inputs: Object.fromEntries(
			Object.entries(sources).map(([key, value]) => [key, {path: value.file, sha256: value.sha256}]),
		),
		full,
		trials,
		fullAnswerReferenceCoverage: coverage,
		limits: [
			'No model reading, reasoning, output generation or review was rerun.',
			'Reference coverage is not evidence of semantic sufficiency or equivalent design quality.',
			'The export-only assignment is a narrower demonstration, not equivalent to the actual update.',
			'Selection is not enabled automatically in refine-design; canonical artifacts and live Alexa were not written.',
			'One observed local build per scope; worker/module startup and cache state differ between scopes.',
		],
	};
	const metricsPath = path.join(root, 'planning/refinement-efficiency/ux-input-selection-20260928-metrics.json');
	const historyPath = path.join(outputRoot, 'measurements');
	fs.mkdirSync(historyPath, {recursive: true});
	fs.writeFileSync(
		path.join(historyPath, `${startedAt.replace(/[:.]/g, '-')}.json`),
		JSON.stringify(report, null, 2) + '\n',
	);
	fs.writeFileSync(metricsPath, JSON.stringify(report, null, 2) + '\n');
	console.log(
		JSON.stringify({
			full: {bytes: full.facts.bytes + full.ux.bytes, pages: full.facts.pages + full.ux.pages},
			trials: trials.map(({name, bytes, pages, preparationRoundTripMs, serverOperationMs, counts}) => ({
				name,
				bytes,
				pages,
				preparationRoundTripMs,
				serverOperationMs,
				counts,
			})),
			coverage: Object.fromEntries(Object.entries(coverage).map(([key, values]) => [key, values.length])),
			metricsPath,
		}),
	);
} finally {
	await service.drain();
	await server.close();
	await worker.close();
}
