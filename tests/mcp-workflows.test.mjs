import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes, createHash} from 'node:crypto';
import {test, after} from 'node:test';
import {WorkflowService} from '../scripts/mcp/WorkflowService.mjs';
import {McpHttpServer} from '../scripts/mcp/McpHttpServer.mjs';
import {OperationWorker} from '../scripts/mcp/OperationWorker.mjs';
import {DesignAssembly} from '../skills/refine-design/scripts/design-assembly.mjs';
import {createUxTestSpec} from '../skills/refine-design/scripts/ux-test-fixture.mjs';
import {canonicalPublicationJson} from '../skills/refine-design/scripts/product-publication-payload.mjs';
import {gardenUx} from '../skills/refine-design/scripts/ux-composable-fixture.mjs';
import {loadCurrentProduct} from '../skills/refine-design/scripts/product-model.mjs';
import {buildPlannerInput} from '../skills/refine-design/scripts/refinement-input.mjs';
import {UX_REVIEW_CRITERIA} from '../skills/refine-design/scripts/ux-review.mjs';
import {sourceBoundTrial} from '../skills/generate-prd/test-fixtures/collection-trial.mjs';
import {createTechnicalFixture} from '../skills/refine-design/scripts/technical-test-fixture.mjs';
import {execFileSync} from 'node:child_process';
import {createApplicationFixture} from '../skills/create-app/scripts/application-test-fixture.mjs';
import {componentDesignTarget, ROOT_BOUND_TARGETS} from '../skills/refine-design/scripts/root-bound-artifact.mjs';
import {digest} from '../skills/review-standards/scripts/review-ledger.mjs';

const evidence = [];
after(() => {
	if (process.env.POLYLITH_MCP_EVIDENCE)
		fs.writeFileSync(
			process.env.POLYLITH_MCP_EVIDENCE,
			JSON.stringify(
				{
					recordedAt: new Date().toISOString(),
					kind: 'local-positive-integration',
					modelUsage: null,
					tests: evidence,
				},
				null,
				2,
			),
		);
});

test('shutdown stops admission and drains an accepted background operation before releasing resources', async (scenario) => {
	let release;
	const barrier = new Promise((resolve) => {
		release = resolve;
	});
	const f = await fixture(scenario, {
		'fixture.wait': {
			description: 'Bounded lifecycle fixture',
			inputSchema: {type: 'object', properties: {}, additionalProperties: false},
			assignable: false,
			writes: false,
			execute: async () => {
				await barrier;
				return {completed: true};
			},
		},
	});
	const receipt = await f.call('execute', {
		access: f.access,
		run: f.run,
		operation: 'fixture.wait',
		background: true,
	});
	await f.server.quiesce();
	await assert.rejects(
		f.call('execute', {access: f.access, run: f.run, operation: 'fixture.wait', background: true}),
	);
	let drained = false;
	const drain = f.service.drain().then(() => {
		drained = true;
	});
	await Promise.resolve();
	assert.equal(drained, false);
	release();
	await drain;
	const job = f.service.status({access: f.access, run: f.run, job: receipt.job});
	assert.equal(job.status, 'complete');
	assert.deepEqual(f.value(job.result), {completed: true});
});

/** Creates an owned disposable workspace and real HTTP service.
 * @param {object} scenario - Test lifecycle.
 * @returns {Promise<object>} - Client, owner service and cleanup.
 */
async function fixture(scenario, extraOperations = {}, serviceOptions = {}) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-mcp-'));
	const worker = new OperationWorker();
	const service = new WorkflowService({
		workspace: root,
		operations: {...worker.operations, ...extraOperations},
		...serviceOptions,
	});
	const token = randomBytes(32).toString('hex');
	const server = new McpHttpServer(service, token);
	const url = await server.listen();
	scenario.after(async () => {
		await service.drain();
		evidence.push({name: scenario.name, requests: server.samples, operations: service.measurements});
		await server.close();
		await worker.close();
		assert.equal(path.dirname(root), fs.realpathSync(os.tmpdir()));
		fs.rmSync(root, {recursive: true, force: true});
	});
	let id = 0;
	const rpc = async (method, params) => {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json',
				accept: 'application/json, text/event-stream',
				'mcp-protocol-version': '2025-06-18',
			},
			body: JSON.stringify({jsonrpc: '2.0', id: ++id, method, params}),
		});
		assert.equal(response.status, 200);
		const data = await response.json();
		assert.equal(data.error, undefined);
		return data.result;
	};
	const call = async (name, args) => {
		const result = await rpc('tools/call', {name: `workflow_${name}`, arguments: args});
		assert.ok(!result.isError, result.content[0].text);
		return JSON.parse(result.content[0].text);
	};
	const access = service.ownerAccess;
	const run = (
		await call('open', {
			access,
			run: 'positive-test',
			sourcePath: 'product-description.md',
			currentPath: 'product/current.json',
		})
	).run;
	const execute = (operation, input = {}, inputHandles = {}) =>
		call('execute', {access, run, operation, input, inputHandles});
	const value = (receipt) => JSON.parse(service.files.read(receipt.path));
	return {root, worker, service, server, url, token, rpc, call, access, run, execute, value};
}

test('configured read windows advertise their cap and preserve escaped UTF-8 across pages', async (scenario) => {
	const f = await fixture(scenario, {}, {pageBytes: 28000});
	const catalog = await f.rpc('tools/list', {});
	assert.equal(
		catalog.tools.find((tool) => tool.name === 'workflow_read').inputSchema.properties.maxBytes.maximum,
		28000,
	);
	assert.equal((await f.call('status', {access: f.access, run: f.run})).readLimits.pageBytes, 28000);
	const value = {text: 'quoted "value" é🙂\\\n'.repeat(2600)};
	const receipt = await f.call('store', {access: f.access, run: f.run, value});
	const fragments = [];
	let offset = 0;
	do {
		const page = await f.call('read', {access: f.access, handle: receipt.handle, offset});
		assert.ok(Buffer.byteLength(page.text) <= 28000);
		assert.ok(Buffer.byteLength(JSON.stringify(page)) <= f.service.readLimits.envelopeBytes);
		assert.equal(page.offset, offset);
		assert.ok(page.nextOffset === null || page.nextOffset > offset);
		fragments.push(page.text);
		offset = page.nextOffset;
	} while (offset !== null);
	assert.deepEqual(JSON.parse(fragments.join('')), value);
	assert.equal(createHash('sha256').update(fragments.join('')).digest('hex'), receipt.sha256);
	for (const pageBytes of [6999, 112001, NaN, 7000.5])
		assert.throws(() => new WorkflowService({workspace: f.root, pageBytes}), /Page limit/);
});

test('two HTTP clients share a run, exact handles, assigned delivery, bounded reads and operation timings', async (scenario) => {
	const f = await fixture(scenario);
	assert.equal((await f.rpc('initialize', {})).serverInfo.name, 'polylith-workflows');
	assert.equal((await f.rpc('tools/list', {})).tools.length, 7);
	assert.equal(
		(await f.rpc('tools/list', {})).tools.find((tool) => tool.name === 'workflow_read').inputSchema.properties
			.maxBytes.maximum,
		7000,
	);
	const second = await fetch(f.url, {
		method: 'POST',
		headers: {authorization: `Bearer ${f.token}`, 'content-type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method: 'tools/call',
			params: {name: 'workflow_status', arguments: {access: f.access, run: f.run}},
		}),
	});
	assert.equal(JSON.parse((await second.json()).result.content[0].text).instance, f.service.instance);
	const stored = await f.call('store', {
		access: f.access,
		run: f.run,
		value: {items: ['a', 'b'], large: '\n😀'.repeat(5000)},
	});
	const delegated = await f.call('assign', {
		access: f.access,
		run: f.run,
		operations: ['result.store'],
		handles: [stored.handle],
	});
	assert.deepEqual(
		JSON.parse((await f.call('read', {access: delegated.access, handle: stored.handle, pointer: '/items'})).text),
		['a', 'b'],
	);
	let offset = 0,
		complete = '';
	do {
		const page = await f.call('read', {access: delegated.access, handle: stored.handle, offset});
		assert.ok(Buffer.byteLength(JSON.stringify(page)) <= 7800);
		complete += page.text;
		offset = page.nextOffset;
	} while (offset !== null);
	assert.deepEqual(JSON.parse(complete), f.value(stored));
	const result = await f.call('store', {access: delegated.access, run: f.run, value: {decision: 'retain'}});
	assert.equal((await f.call('store', {access: f.access, run: f.run, value: {decision: 'retain'}})).reused, true);
	assert.equal(JSON.parse((await f.call('read', {access: f.access, handle: result.handle})).text).decision, 'retain');
	const denied = await f.rpc('tools/call', {
		name: 'workflow_execute',
		arguments: {access: delegated.access, run: f.run, operation: 'files.edit', input: {}},
	});
	assert.equal(denied.isError, true);
	fs.writeFileSync(path.join(f.root, 'description.md'), '\uFEFFCurrent description');
	const receipt = await f.execute('files.read', {paths: ['description.md']});
	assert.equal(f.value(receipt)[0].text, '\uFEFFCurrent description');
	assert.ok(f.server.samples.length > 10);
	assert.ok(f.service.measurements[0].operationMs > 0);
});

test('UX selection keeps complete assigned flows, expands changed shared behavior and exposes uncertain scope through MCP', async (scenario) => {
	const f = await fixture(scenario);
	const fixtureRoot = new URL(
		'../skills/refine-design/references/fixtures/product-model/garden-log/',
		import.meta.url,
	);
	fs.copyFileSync(new URL('product-description.md', fixtureRoot), path.join(f.root, 'product-description.md'));
	const proposal = JSON.parse(fs.readFileSync(new URL('product-model-proposal.json', fixtureRoot)));
	await f.execute('model.persist', {proposal, outputRoot: 'product', sourceLabel: 'product-description.md'});
	const factsReceipt = await f.execute('product.prepare');
	const facts = f.value(factsReceipt);
	const ux = gardenUx();
	ux.productModelBinding = facts.productModelBinding;
	// A second local interaction uses the same actions. Reading those actions must not pull in its flow.
	const otherFlow = {...structuredClone(ux.flows[0]), id: 'other-flow', elementRef: 'ux:surface:other-surface'};
	// Step and alternate identities are global in the current UX contract.
	const renamed = new Map(
		[...otherFlow.steps, ...otherFlow.alternates, ...otherFlow.alternates.flatMap((item) => item.steps)].map(
			(item) => [item.id, `other-${item.id}`],
		),
	);
	const collectIds = (value) => {
		if (Array.isArray(value)) value.forEach(collectIds);
		else if (value && typeof value === 'object') {
			if (value.id) renamed.set(value.id, value.id === ux.surfaces[0].id ? 'other-surface' : `other-${value.id}`);
			Object.values(value).forEach(collectIds);
		}
	};
	[ux.surfaces, ux.states, ux.interactionFrames].forEach(collectIds);
	renamed.set(`ux:surface:${ux.surfaces[0].id}`, 'ux:surface:other-surface');
	const rename = (value) =>
		typeof value === 'string'
			? (renamed.get(value) ?? value)
			: Array.isArray(value)
				? value.map(rename)
				: value && typeof value === 'object'
					? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, rename(child)]))
					: value;
	ux.flows.push(rename(otherFlow));
	for (const action of ux.actions) {
		action.taskRefs.push('other-flow');
		action.applicableStateRefs.push(...action.applicableStateRefs.map((ref) => renamed.get(ref)));
	}
	ux.interactionFrames.push({...rename(ux.interactionFrames[0]), taskRefs: ['other-flow']});
	ux.states.push(rename(ux.states[0]));
	ux.surfaces.push(rename(ux.surfaces[0]));
	ux.features[0].flowRefs.push('other-flow');
	ux.features[0].surfaceRefs.push('other-surface');
	ux.application.areas[0].surfaceRefs.push('other-surface');
	const uxReceipt = await f.call('store', {access: f.access, run: f.run, value: ux});
	const before = JSON.stringify({facts, ux});
	const handles = {facts: factsReceipt.handle, ux: uxReceipt.handle};
	const selected = f.value(await f.execute('ux.select-input', {changedRefs: [], flowIds: [ux.flows[0].id]}, handles));
	assert.deepEqual(selected.packet.ux.flows, [ux.flows[0]]);
	assert.ok(selected.packet.overview.ux.some((item) => item.ref === 'ux:flow:other-flow'));
	assert.deepEqual(selected.packet.facts.productModel.rules, facts.productModel.rules);
	assert.deepEqual(selected.packet.ux.openQuestions, ux.openQuestions);
	assert.equal(selected.packet.canonical, false);
	const shared = ux.flows[0].steps.find((step) => step.actionRef).actionRef;
	const expanded = f.value(await f.execute('ux.select-input', {changedRefs: [`ux:action:${shared}`]}, handles));
	assert.ok(expanded.packet.ux.flows.some((item) => item.id === 'other-flow'));
	const uncertain = f.value(await f.execute('ux.select-input', {changedRefs: ['product:not-yet-mapped']}, handles));
	assert.deepEqual(uncertain.packet.ux.flows, ux.flows);
	assert.ok(uncertain.packet.notices.some((item) => item.kind === 'unmapped-change-full-ux'));
	assert.deepEqual(uncertain.packet.facts.productModel.requirements, facts.productModel.requirements);
	const staleUx = {...ux, productModelBinding: {...ux.productModelBinding, sha256: '0'.repeat(64), revision: 99}};
	const staleReceipt = await f.call('store', {access: f.access, run: f.run, value: staleUx});
	const stale = f.value(
		await f.execute(
			'ux.select-input',
			{changedRefs: [], flowIds: [ux.flows[0].id]},
			{...handles, ux: staleReceipt.handle},
		),
	);
	assert.ok(stale.packet.notices.some((item) => item.kind === 'unmatched-baseline-full-ux'));
	assert.deepEqual(stale.packet.ux.flows, ux.flows);
	assert.equal(JSON.stringify({facts, ux}), before);
});

test('current product preparation, scoped facts, exact review and canonical artifact persistence preserve existing contracts', async (scenario) => {
	const f = await fixture(scenario);
	const fixtureRoot = new URL(
		'../skills/refine-design/references/fixtures/product-model/garden-log/',
		import.meta.url,
	);
	fs.copyFileSync(new URL('product-description.md', fixtureRoot), path.join(f.root, 'product-description.md'));
	const proposal = JSON.parse(fs.readFileSync(new URL('product-model-proposal.json', fixtureRoot)));
	await f.execute('model.persist', {proposal, outputRoot: 'product', sourceLabel: 'product-description.md'});
	const currentPath = path.join(f.root, 'product/current.json');
	const prepared = await f.execute('product.prepare');
	assert.deepEqual(
		f.value(prepared),
		buildPlannerInput({currentPath, sourcePath: path.join(f.root, 'product-description.md')}),
	);
	const selected = f.value(
		await f.execute('product.select', {ids: ['retain-harvest-entry']}, {facts: prepared.handle}),
	);
	assert.deepEqual(selected.productModel.rules, f.value(prepared).productModel.rules);
	assert.ok(selected.productModel.requirements.some((item) => item.id === 'retain-harvest-entry'));
	const ux = gardenUx();
	const chain = loadCurrentProduct(currentPath);
	ux.productModelBinding = Object.fromEntries(
		['id', 'revision', 'sha256', 'materialSha256', 'recordIndexSha256'].map((key) => [
			key,
			chain.snapshot.productModel[key],
		]),
	);
	fs.writeFileSync(path.join(f.root, 'ux.json'), JSON.stringify(ux));
	const reviewInput = {uxPath: 'ux.json', scopeRefs: [ux.id], sourceRoot: '.'};
	const subject = f.value(await f.execute('ux-review.subject', reviewInput));
	const review = {
		schemaVersion: '0.2',
		subject,
		verdict: 'pass',
		summary: 'Synthetic validator fixture; no live specialist assessment.',
		coverage: UX_REVIEW_CRITERIA.map((criterion) => ({
			criterion,
			result: 'pass',
			evidenceRefs: [ux.id],
			note: 'Reused synthetic contract evidence.',
		})),
		findings: [],
		researchChecks: [],
		limits: ['Synthetic test evidence only.'],
	};
	assert.deepEqual(f.value(await f.execute('ux-review.validate', {...reviewInput, review})), {valid: true});
	const requests = [
		{
			id: 'publication-ux',
			artifactKind: 'ux-design',
			status: 'accepted',
			scopeRefs: ['harvest-log', 'record-dated-harvest'],
			coverageRefs: ['record-dated-harvest'],
			gapRefs: [],
			lockRefs: [],
			artifactDependencyIds: [],
			encoding: 'gzip-base64',
			sources: {ux: 'ux.json'},
			publication: null,
		},
	];
	const published = f.value(await f.execute('publication.assemble', {requests, sourceRoot: '.'}));
	assert.equal(published.status, 'complete', JSON.stringify(published));
	assert.deepEqual(loadCurrentProduct(currentPath).snapshot.productModel, chain.snapshot.productModel);
	assert.equal(f.value(await f.execute('context.resolve')).context.product.id, proposal.id);
	const before = loadCurrentProduct(currentPath);
	const record = before.model.recordIndex.find((item) => item.id === 'record-dated-harvest');
	const artifact = {
		schemaVersion: '1.0',
		kind: 'product-artifact-proposal',
		id: 'experience-fixture',
		artifactKind: 'product-experience-plan',
		owner: 'ux',
		artifactSchemaVersion: '1.0',
		status: 'accepted',
		consumerDomains: ['prd', 'ux', 'ui', 'implementation-planning'],
		scopeRefs: [record.id],
		coverageRefs: [record.id],
		gapRefs: [],
		lockRefs: [],
		recordDependencies: [{id: record.id, materialSha256: record.materialSha256}],
		artifactDependencies: [],
		producer: {id: 'ux-planner', contractVersion: '1.0', method: 'structured-assessment'},
		resources: [],
		payload: {summary: 'Synthetic fixture experience'},
	};
	await f.execute('artifact.commit', {proposal: artifact, baseSnapshotSha256: before.current.snapshot.sha256});
	assert.ok(loadCurrentProduct(currentPath).snapshot.artifacts.some((item) => item.id === artifact.id));
});

test('saved UX and UI units flow through handles, scoped deliveries and assembly without regeneration', async (scenario) => {
	const f = await fixture(scenario);
	const ux = createUxTestSpec();
	const ui = JSON.parse(
		fs.readFileSync(new URL('../skills/refine-design/references/ui-composition-proposal.json', import.meta.url)),
	);
	const design = JSON.parse(
		fs.readFileSync(new URL('../skills/refine-design/references/extras-proposal.json', import.meta.url)),
	);
	delete design.baseRevision;
	design.theme.id = 'example-theme';
	Object.assign(design, {id: 'example-design', revision: 1, decisions: []});
	ui.uxArtifactBinding.sha256 = createHash('sha256').update(canonicalPublicationJson(ux)).digest('hex');
	for (const [stage, document] of [
		['ux', ux],
		['ui', ui],
	]) {
		await f.execute('units.open', {stage, binding: {sourceSha256: 'a'.repeat(64)}});
		const stored = await f.call('store', {access: f.access, run: f.run, value: document});
		const imported = await f.execute('units.import', {stage}, {document: stored.handle});
		const records = f.value(imported);
		assert.deepEqual(
			records,
			stage === 'ux' ? DesignAssembly.importUx(document) : DesignAssembly.importUi(document),
		);
		const delegated = await f.call('assign', {
			access: f.access,
			run: f.run,
			operations: ['units.deliver', 'units.read'],
			handles: [imported.handle],
			scope: {stage, recordRefs: records.map((record) => `${record.kind}:${record.id}`)},
		});
		const receipt = await f.call('execute', {
			access: delegated.access,
			run: f.run,
			operation: 'units.deliver',
			input: {stage},
			inputHandles: {records: imported.handle},
		});
		assert.deepEqual(f.value(receipt).issues, []);
		const references = records.map((record) => `${record.kind}:${record.id}`);
		const read = f.value(
			await f.call('execute', {
				access: delegated.access,
				run: f.run,
				operation: 'units.read',
				input: {stage, references},
			}),
		);
		assert.deepEqual(read.records, records);
		const handoff = f.value(await f.execute('units.handoff', {stage, references}));
		assert.equal(handoff.units.length, records.length);
		const repeat = f.value(await f.execute('units.deliver', {stage}, {records: imported.handle}));
		assert.deepEqual(repeat.issues, []);
		assert.equal(repeat.saved.length, records.length);
		assert.ok(repeat.saved.every((record) => record.reused));
		const assembled = f.value(
			await f.execute('units.assemble', {
				stage,
				options: stage === 'ui' ? {uxSpec: ux, designLanguage: design} : {},
			}),
		);
		assert.equal(assembled.valid, true, JSON.stringify(assembled));
		assert.deepEqual(JSON.parse(fs.readFileSync(assembled.candidatePath)), document);
	}
});

test('collection preview and publication reuse an existing source-bound fixture', async (scenario) => {
	const f = await fixture(scenario);
	const trial = await sourceBoundTrial({root: f.root});
	for (const field of ['outline', 'weights', 'plan'])
		fs.writeFileSync(path.join(f.root, `${field}.json`), `${JSON.stringify(trial[field], null, 2)}\n`);
	const input = {
		contextPath: 'context.json',
		outlinePath: 'outline.json',
		weightsPath: 'weights.json',
		planPath: 'plan.json',
		outputRoot: 'preview',
	};
	const preview = f.value(await f.execute('collection.preview', input));
	assert.equal(preview.sourceCount, trial.index.sources.length);
	const publication = f.value(await f.execute('collection.publish', {...input, outputRoot: 'published'}));
	assert.ok(publication);
	assert.match(fs.readFileSync(path.join(f.root, 'preview/garden-guide/start.html'), 'utf8'), /harvests.html/);
});

test('technical inspection, preparation and publication preserve frozen synthetic evidence', async (scenario) => {
	const f = await fixture(scenario);
	execFileSync('git', ['init', f.root], {stdio: 'pipe'});
	fs.appendFileSync(path.join(f.root, '.git/info/exclude'), '\n/.codex-tmp/\n');
	const data = createTechnicalFixture(scenario, f.root);
	const location = f.value(await f.execute('product.location', {productName: 'Field Journal'}));
	assert.ok(location);
	const run = 'technical-test';
	await f.call('open', {access: f.access, run, currentPath: data.currentPath});
	const execute = (operation, input = {}) => f.call('execute', {access: f.access, run, operation, input});
	const inspected = f.value(
		await execute('technical.inspect', {repositoryId: 'field-journal-repository', paths: ['src/observations.js']}),
	);
	assert.deepEqual(inspected.baseline.observations, data.inspected.baseline.observations);
	const document = JSON.parse(fs.readFileSync(data.inputPath));
	await execute('technical.prepare', {document, baseSnapshotSha256: data.chain.current.snapshot.sha256});
	const resolved = f.value(await execute('technical.resolve'));
	assert.ok(resolved);
	const context = f.value(await execute('context.resolve', {consumer: 'technical'})).context;
	const result = f.value(await execute('technical.publish', {context, outputDirectory: 'published'}));
	assert.deepEqual(
		result.files.map((item) => item.path),
		['architecture.md', 'contracts.md', 'critical-flows.md', 'decisions.md', 'handoff.md', 'index.md'],
	);
	assert.match(fs.readFileSync(path.join(f.root, 'published/critical-flows.md'), 'utf8'), /create-flow/);
});

test('research revisions, exact description edits and reset plans use existing authority', async (scenario) => {
	const f = await fixture(scenario);
	const before = '# Import\n\nKeep earlier items?\n';
	const after = '# Import\n\nOpen question: Keep earlier items?\n';
	const hash = (text) => createHash('sha256').update(text).digest('hex');
	fs.writeFileSync(path.join(f.root, 'before.md'), before);
	fs.writeFileSync(path.join(f.root, 'after.md'), after);
	fs.writeFileSync(
		path.join(f.root, 'ledger.json'),
		JSON.stringify({
			schemaVersion: '1.0',
			kind: 'white-paper-revision',
			beforeSha256: hash(before),
			afterSha256: hash(after),
			items: [
				{
					id: 'question',
					kind: 'question',
					beforeExcerpt: 'Keep earlier items?',
					afterExcerpt: 'Open question: Keep earlier items?',
					disposition: 'retained',
					reason: '',
				},
			],
		}),
	);
	const revision = f.value(
		await f.execute('research.record', {
			beforePath: 'before.md',
			afterPath: 'after.md',
			ledgerPath: 'ledger.json',
			productRoot: 'product',
		}),
	);
	assert.equal(revision.itemCount, 1);
	await f.execute('files.edit', {
		path: 'before.md',
		sha256: hash(before),
		before: 'Keep earlier items?',
		after: 'Retain earlier items?',
	});
	assert.match(fs.readFileSync(path.join(f.root, 'before.md'), 'utf8'), /Retain earlier/);
	const reset = f.value(await f.execute('reset.plan', {source: 'before.md', targets: ['product']}));
	assert.ok(reset);
	assert.ok(fs.existsSync(path.join(f.root, 'product')));
});

test('project preparation produces a reusable plan without modifying an empty target', async (scenario) => {
	const f = await fixture(scenario);
	fs.mkdirSync(path.join(f.root, 'project'));
	assert.equal(f.value(await f.execute('project.inspect', {kind: 'initial', target: 'project'})).ok, true);
	const plan = f.value(
		await f.execute('project.plan', {
			kind: 'initial',
			target: 'project',
			options: {
				projectName: 'Sample Project',
				projectSlug: 'sample-project',
				polylith: false,
				prettier: false,
				dataPersistence: false,
				testing: false,
			},
		}),
	);
	assert.ok(plan.files.some(([name]) => name === 'package.json'));
	assert.deepEqual(fs.readdirSync(path.join(f.root, 'project')), []);
	const appRoot = path.join(f.root, 'existing');
	createApplicationFixture(appRoot);
	assert.equal(f.value(await f.execute('project.inspect', {kind: 'existing', target: 'existing'})).ok, true);
	const application = f.value(
		await f.execute('project.plan', {
			kind: 'existing',
			target: 'existing',
			options: {appName: 'Reports Console', appSlug: 'reports', repositoryPosture: 'hosting', mount: '/reports'},
		}),
	);
	assert.ok(application.create.includes(path.normalize('src/reports/index.js')));
});

test('visual persistence uses exact synthetic UX review and existing owned target rules', async (scenario) => {
	const f = await fixture(scenario);
	const ux = createUxTestSpec();
	const designProposal = JSON.parse(
		fs.readFileSync(new URL('../skills/refine-design/references/extras-proposal.json', import.meta.url)),
	);
	fs.writeFileSync(
		path.join(f.root, 'product-description.md'),
		'# Field Journal\n\nA person can review and correct observation records.\n',
	);
	const persistedUx = f.value(await f.execute('ux.persist', {document: ux, outputDirectory: 'output'}));
	assert.equal(persistedUx.revision, ux.revision);
	const uxPath = path.relative(f.root, persistedUx.sourcePath);
	// The current fixture binds to the canonical UX JSON representation.
	const subject = f.value(await f.execute('ux-review.subject', {uxPath, scopeRefs: [ux.id], sourceRoot: '.'}));
	fs.writeFileSync(
		path.join(f.root, 'ux-review.json'),
		JSON.stringify({
			schemaVersion: '0.2',
			subject,
			verdict: 'pass',
			summary: 'Synthetic structural validator evidence only.',
			coverage: UX_REVIEW_CRITERIA.map((criterion) => ({
				criterion,
				result: 'pass',
				evidenceRefs: [ux.id],
				note: 'Current synthetic fixture.',
			})),
			findings: [],
			researchChecks: [],
			limits: ['No live specialist review.'],
		}),
	);
	const design = structuredClone(designProposal);
	delete design.baseRevision;
	design.theme.id = 'example-theme';
	Object.assign(design, {id: 'example-design', revision: 1, decisions: []});
	fs.writeFileSync(path.join(f.root, 'design.json'), JSON.stringify(design));
	for (const kind of ['ui', 'component']) {
		const filename = kind === 'ui' ? 'ui-composition-proposal.json' : 'component-design-proposal.json';
		const document = JSON.parse(
			fs.readFileSync(new URL(`../skills/refine-design/references/${filename}`, import.meta.url)),
		);
		const outputPath =
			kind === 'ui'
				? path.join('output', ROOT_BOUND_TARGETS.ui)
				: componentDesignTarget(document.componentTemplate.id);
		const result = f.value(
			await f.execute(`${kind}.persist`, {
				document,
				outputPath,
				uxPath,
				designLanguagePath: 'design.json',
				options: {
					uxReviewPath: 'ux-review.json',
					productDescriptionPath: 'product-description.md',
					sourceRoot: '.',
					productDocumentRoot: 'output',
				},
			}),
		);
		assert.ok(result);
		assert.ok(fs.existsSync(path.join(f.root, outputPath)));
		if (kind === 'ui') {
			const original = fs.readFileSync(path.join(f.root, outputPath), 'utf8');
			for (const priorPathField of ['existingUxPath', 'existingDesignLanguagePath']) {
				await assert.rejects(
					f.execute('ui.persist', {
						document,
						outputPath,
						uxPath,
						designLanguagePath: 'design.json',
						options: {
							uxReviewPath: 'ux-review.json',
							productDescriptionPath: 'product-description.md',
							sourceRoot: '.',
							productDocumentRoot: 'output',
							[priorPathField]: '../outside-dependency.json',
						},
					}),
					/outside|escape|within|root/i,
				);
				assert.equal(fs.readFileSync(path.join(f.root, outputPath), 'utf8'), original);
			}
		}
	}
	const applied = f.value(await f.execute('design.apply', {proposal: designProposal, baseFolder: 'design-output'}));
	assert.equal(applied.revision, 1);
});

test('standards mapping, guide, repository request and independent ledger validation use current contracts', async (scenario) => {
	const f = await fixture(scenario);
	const standardsDirectory = path.join(f.root, 'agents/topics/standards');
	fs.mkdirSync(standardsDirectory, {recursive: true});
	const standard = path.resolve('documentation/standards/documentation.md');
	const link = path.relative(standardsDirectory, standard).replaceAll('\\', '/');
	fs.writeFileSync(
		path.join(standardsDirectory, 'manifest.md'),
		`# Folder Standards Manifest\n\n## Standards Sets\n\n### \`base\`\n\nExtends: none\nStandards:\n\n- [documentation.md](${link}) - Governance.\n\n## Folder Assignments\n\n- \`.\` - \`base\` - All files.\n`,
	);
	fs.writeFileSync(path.join(standardsDirectory, 'overlay.md'), '# Repository Standards Overlay\n\nNone.\n');
	fs.writeFileSync(
		path.join(standardsDirectory, 'normalization.json'),
		JSON.stringify({
			schemaVersion: 2,
			status: 'normalized',
			everNormalized: true,
			manifest: 'agents/topics/standards/manifest.md',
			normalizedAt: '2026-01-01T00:00:00.000Z',
			pendingDivergences: 0,
			deferredDivergences: 0,
		}),
	);
	fs.writeFileSync(
		path.join(f.root, 'package.json'),
		JSON.stringify({devDependencies: {prettier: '3.9.6'}, prettier: {printWidth: 120}}),
	);
	const formatter = path.join(f.root, 'node_modules/prettier');
	fs.mkdirSync(formatter, {recursive: true});
	fs.writeFileSync(path.join(formatter, 'package.json'), JSON.stringify({name: 'prettier', bin: 'format.cjs'}));
	fs.writeFileSync(
		path.join(formatter, 'format.cjs'),
		"process.stdout.write(require('node:fs').readFileSync(0,'utf8'));",
	);
	const mapped = f.value(
		await f.execute('standards.resolve', {
			manifestPath: 'agents/topics/standards/manifest.md',
			overlayPath: 'agents/topics/standards/overlay.md',
			file: 'notes.md',
		}),
	);
	assert.equal(mapped.standards.standards[0].name, 'documentation.md');
	const guide = f.value(await f.execute('standards.guide'));
	assert.match(guide.content, /documentation.md/);
	const explicit = f.value(
		await f.execute('standards.guide', {
			options: {manifest: 'agents/topics/standards/manifest.md', overlay: 'agents/topics/standards/overlay.md'},
		}),
	);
	assert.equal(explicit.content, guide.content);
	execFileSync('git', ['init', f.root], {stdio: 'pipe'});
	fs.writeFileSync(path.join(f.root, '.gitignore'), '/.codex-tmp/\n/node_modules/\n');
	fs.writeFileSync(path.join(f.root, 'notes.md'), '# Notes\n\nA documented fixture.\n');
	execFileSync(
		'git',
		[
			'-C',
			f.root,
			'-c',
			'user.name=Fixture',
			'-c',
			'user.email=fixture@example.invalid',
			'commit',
			'--allow-empty',
			'-m',
			'Fixture baseline',
		],
		{stdio: 'pipe'},
	);
	const baseline = await f.execute('repository.snapshot');
	const request = f.value(await f.execute('review.request', {paths: ['notes.md']}, {baseline: baseline.handle}));
	assert.ok(request.fingerprint);
	const source = 'export class Panel { render() { return null; } }\n';
	fs.writeFileSync(path.join(f.root, 'Panel.jsx'), source);
	const synthetic = {
		repo: f.root,
		fingerprint: 'synthetic-request',
		baseline: {files: {'Panel.jsx': digest(source)}},
		current: {files: {'Panel.jsx': digest(source)}},
		lanes: {'ui-reviewer': [{path: 'Panel.jsx', rule: {id: 'REACT-STRUCT-001'}}]},
	};
	const primary = {
		kind: 'primary',
		lane: 'ui-reviewer',
		actor: 'fixture-primary',
		fingerprint: synthetic.fingerprint,
		entries: [
			{
				path: 'Panel.jsx',
				ruleId: 'REACT-STRUCT-001',
				status: 'compliant',
				reason: 'Synthetic structural fixture provides exact source evidence.',
				evidence: [{path: 'Panel.jsx', line: 1, quote: 'render() { return null; }'}],
			},
		],
	};
	const audit = {
		...structuredClone(primary),
		kind: 'audit',
		actor: 'fixture-audit',
		primaryDigest: digest(primary),
		entries: primary.entries.map((entry) => ({...entry, status: 'agree'})),
	};
	assert.equal(
		f.value(await f.execute('review.validate', {request: synthetic, lane: 'ui-reviewer', primary, audit})),
		'CLEAN',
	);
});
