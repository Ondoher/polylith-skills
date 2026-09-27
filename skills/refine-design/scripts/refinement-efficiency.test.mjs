import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {buildPlannerInput} from './refinement-input.mjs';
import {assemblePublication} from './refinement-assembly.mjs';
import {assessStageReuse, captureFiles, createStageReceipt, saveStageReceipt} from './refinement-run.mjs';
import {loadCurrentProduct, persistProductModel} from './product-model.mjs';
import {affectedUseCases} from './composable-handoff.mjs';
import {gardenUx} from './ux-composable-fixture.mjs';
import {validateUxSpec} from './ux-design.mjs';
import {createDefaultReviewConfig} from './design-language-review-pages.mjs';
import {createUxReviewSubject, UX_REVIEW_CRITERIA, validateUxReview} from './ux-review.mjs';
import {sha256} from './product-artifact-utils.mjs';
import {createPublicationArtifactProposal} from './product-publication-proposals.mjs';
import {commitProductArtifact} from './product-artifact-store.mjs';

const fixtureRoot = new URL('../references/fixtures/product-model/garden-log/', import.meta.url);
const digest = (value) => sha256(Buffer.from(value));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

function fixture(t, moderate = false) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'refinement-efficiency-'));
	t.after(() => fs.rmSync(root, {recursive: true, force: true}));
	const proposal = JSON.parse(fs.readFileSync(new URL('product-model-proposal.json', fixtureRoot)));
	const lines = [fs.readFileSync(new URL('product-description.md', fixtureRoot), 'utf8').trimEnd()];
	const add = (kind, record, wording) => {
		const id = `claim-${record.id}`;
		lines.push(wording);
		const value = {
			...record,
			status: 'accepted',
			owner: 'product',
			consumerDomains: ['prd', 'ux'],
			provenance: {sourceClaimRefs: [id]},
		};
		proposal[kind].push(value);
		proposal.sourceClaims.push({
			id,
			startLine: lines.length,
			endLine: lines.length,
			summary: wording,
			disposition: 'incorporated',
			recordRefs: [record.id],
		});
		proposal.identityClaims.push({recordRef: record.id, kind: 'new', previousRef: null, supersedesRefs: []});
	};
	if (moderate) {
		for (const area of ['planning', 'supplies', 'weather', 'sharing', 'history']) {
			add(
				'capabilities',
				{id: area, name: area, summary: `Manage ${area}.`, userRefs: ['gardener'], relatedCapabilityRefs: []},
				`The ${area} area supports the gardener's related work while preserving the current entry and allowing a return to the main workspace.`,
			);
			add(
				'goals',
				{
					id: `manage-${area}`,
					statement: `Manage ${area}.`,
					desiredOutcome: `Current ${area} information is available.`,
					capabilityRefs: [area],
					userRefs: ['gardener'],
				},
				`The gardener can review current ${area} information and decide what needs attention before making a change.`,
			);
			for (const action of ['inspect', 'create', 'edit', 'remove']) {
				add(
					'requirements',
					{
						id: `${action}-${area}`,
						kind: 'behavior',
						statement: `${action} ${area} records.`,
						capabilityRefs: [area],
						goalRefs: [`manage-${area}`],
					},
					`Within ${area}, the gardener can ${action} a record, see an observable result, and recover from an unsuccessful attempt without losing other saved records.`,
				);
			}
		}
		add(
			'rules',
			{
				id: 'preserve-unsaved-work',
				kind: 'policy',
				statement: 'Leaving an edited form asks before discarding changes.',
				appliesToRefs: proposal.requirements.map((record) => record.id),
			},
			'Across every area, leaving an edited form asks before discarding unsaved changes; cancelling that dialog returns to the same form and retains its entries.',
		);
		lines.push('A future seasonal feature still needs classification.');
		proposal.status = 'partial';
		proposal.sourceClaims.push({
			id: 'future-scope',
			startLine: lines.length,
			endLine: lines.length,
			summary: lines.at(-1),
			disposition: 'unclassified',
			recordRefs: [],
		});
	}
	const sourcePath = path.join(root, 'product-description.md');
	const proposalPath = path.join(root, 'proposal.json');
	fs.writeFileSync(sourcePath, lines.join('\n') + '\n');
	write(proposalPath, proposal);
	const productRoot = path.join(root, 'product', 'Garden Log');
	const currentPath = path.join(productRoot, 'current.json');
	const persist = () =>
		persistProductModel({proposalPath, sourcePath, sourceLabel: 'product-description.md', outputRoot: productRoot});
	persist();
	const ux = gardenUx();
	ux.productModelBinding = binding(loadCurrentProduct(currentPath));
	const uxPath = path.join(root, 'ux.json');
	write(uxPath, ux);
	const design = JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json', import.meta.url)));
	delete design.baseRevision;
	Object.assign(design, {id: 'example-design', revision: 1, decisions: []});
	design.theme.id = 'example-theme';
	write(path.join(root, 'design.json'), design);
	write(path.join(root, 'layout.json'), createDefaultReviewConfig());
	return {root, productRoot, currentPath, sourcePath, proposalPath, proposal, persist, ux, uxPath};
}

function binding(chain) {
	return Object.fromEntries(
		['id', 'revision', 'sha256', 'materialSha256', 'recordIndexSha256'].map((key) => [
			key,
			chain.snapshot.productModel[key],
		]),
	);
}

function request(id, artifactKind, fields = {}) {
	return {
		id,
		artifactKind,
		status: 'accepted',
		scopeRefs: ['harvest-log', 'record-dated-harvest'],
		coverageRefs: ['record-dated-harvest'],
		gapRefs: [],
		lockRefs: [],
		artifactDependencyIds: [],
		encoding: 'gzip-base64',
		sources: {},
		publication: null,
		...fields,
	};
}

const uxRequest = () => request('publication-ux', 'ux-design', {sources: {ux: 'ux.json'}});
const designRequest = () =>
	request('publication-design', 'design-language', {
		sources: {designLanguage: 'design.json', reviewLayout: 'layout.json'},
	});
const manifestRequest = () =>
	request('publication-manifest', 'prd-publication', {
		encoding: 'json',
		artifactDependencyIds: ['publication-ux', 'publication-design'],
		publication: {
			schemaVersion: '1.0',
			uxArtifactId: 'publication-ux',
			designLanguageArtifactId: 'publication-design',
			uiArtifactId: null,
			componentArtifactIds: [],
		},
	});
const assemble = (env, requests) => assemblePublication({currentPath: env.currentPath, sourceRoot: env.root, requests});

test('structured cold-start input retains six areas, every claim and a late global rule', (t) => {
	const env = fixture(t, true);
	const before = fs.readFileSync(env.currentPath);
	const packet = buildPlannerInput({
		currentPath: env.currentPath,
		sourcePath: env.sourcePath,
		claimIds: ['claim-preserve-unsaved-work'],
	});
	assert.equal(packet.productModel.capabilities.length, 6);
	assert.equal(packet.productModel.requirements.length, 22);
	assert.deepEqual(
		packet.productModel.rules
			.find((item) => item.id === 'preserve-unsaved-work')
			.appliesToRefs.slice()
			.sort(),
		env.proposal.requirements.map((item) => item.id).sort(),
	);
	assert.equal(packet.productModel.sourceClaims.at(-1).disposition, 'unclassified');
	assert.equal(packet.productModel.status, 'partial');
	assert.match(packet.sourceExcerpts[0].text, /^Across every area/);
	assert.equal(packet.sourceExcerpts[0].text.trim().split('\n').length, 1);
	assert.deepEqual(fs.readFileSync(env.currentPath), before);
	assert.deepEqual(
		buildPlannerInput({currentPath: env.currentPath, sourcePath: env.sourcePath}).productModelBinding,
		packet.productModelBinding,
	);
});

test('local multi-step form use case keeps its supporting dialog and exact product identity', (t) => {
	const env = fixture(t);
	const ux = env.ux;
	const open = structuredClone(ux.actions[0]);
	Object.assign(open, {id: 'review-entry', name: 'Review entry', outcome: 'The confirmation dialog opens.'});
	open.feedbackRefs = ['review-feedback'];
	ux.actions.unshift(open);
	ux.feedback.push({
		id: 'review-feedback',
		actionRef: 'review-entry',
		phase: 'success',
		description: 'Review the entry in the dialog.',
		persistence: 'transient',
		status: 'accepted',
		sourceRefs: ['brief'],
	});
	ux.flows[0].steps.unshift({
		id: 'review-step',
		status: 'accepted',
		sourceRefs: ['brief'],
		questionRefs: [],
		actor: 'Gardener',
		action: 'Review this entry.',
		actionRef: open.id,
		response: 'A confirmation dialog opens.',
	});
	ux.flows[0].decisions.push({
		id: 'retain-review',
		disposition: 'retain',
		candidate: 'Review entry',
		actionRefs: [open.id],
		rationale: 'Confirm the entry within its form.',
		result: 'The dialog supports this local use case.',
	});
	const parent = ux.interactionFrames[0];
	const dialog = structuredClone(parent);
	Object.assign(dialog, {
		id: 'confirmation-frame',
		kind: 'dialog',
		name: 'Confirm entry',
		parentFrameRef: parent.id,
		triggerActionRef: open.id,
	});
	dialog.regions[0].id = 'confirmation-region';
	dialog.regions[0].affordances[0].id = 'confirm-affordance';
	dialog.focus = {entry: 'Focus Save.', orderRefs: ['confirm-affordance'], returnActionRef: open.id};
	parent.regions[0].affordances = [
		{
			id: 'review-affordance',
			actionRef: open.id,
			label: 'Review',
			status: 'accepted',
			order: 1,
			interaction: 'canonical',
			transition: {kind: 'frame', targetRef: dialog.id},
		},
	];
	parent.focus.orderRefs = ['review-affordance'];
	ux.interactionFrames.push(dialog);
	ux.surfaces[0].interactionFrameRefs.push(dialog.id);
	validateUxSpec(ux);
	write(env.uxPath, ux);
	const packet = buildPlannerInput({
		currentPath: env.currentPath,
		sourcePath: env.sourcePath,
		uxPath: env.uxPath,
		useCaseIds: ['record-entry'],
	});
	assert.deepEqual(packet.focus.handoffs[0].stepRefs, ['review-step', 'save-step']);
	assert.deepEqual(packet.focus.handoffs[0].frameRefs, ['confirmation-frame', 'editing-frame']);
	assert.ok(packet.focus.handoffs[0].productRefs.includes('product:reject-empty-entry'));
	assert.deepEqual(affectedUseCases(ux, 'product:reject-empty-entry', packet.productModel), ['record-entry']);
	ux.productModelBinding.sha256 = digest('stale');
	write(env.uxPath, ux);
	assert.throws(
		() => buildPlannerInput({currentPath: env.currentPath, sourcePath: env.sourcePath, uxPath: env.uxPath}),
		/reconciliation/,
	);
});

function receipt(env, overrides = {}) {
	return createStageReceipt({
		attemptId: 'interpret-first',
		stage: 'interpret',
		inputs: captureFiles(env.root, ['product-description.md']),
		outputs: captureFiles(env.root, ['proposal.json']),
		requestSha256: digest('whole product'),
		contractSha256: digest('model 2.0 and validator'),
		startedAt: '2026-09-26T10:00:00Z',
		finishedAt: '2026-09-26T10:00:01Z',
		sourceInterpretations: 1,
		...overrides,
	});
}

test('resume checks exact files and contracts; unknown usage and failed attempts remain explicit', (t) => {
	const env = fixture(t);
	const record = receipt(env);
	const saved = saveStageReceipt({
		repositoryRoot: env.root,
		productRoot: env.productRoot,
		runId: 'fixture-run',
		receipt: record,
	});
	const before = fs.readFileSync(saved);
	const options = {
		repositoryRoot: env.root,
		requestSha256: record.requestSha256,
		contractSha256: record.contractSha256,
	};
	assert.equal(record.usage, null);
	assert.equal(record.elapsedMs, 1000);
	assert.equal(assessStageReuse(record, options).reuseCandidate, true);
	assert.equal(assessStageReuse(record, options).validationRequired, true);
	assert.equal(assessStageReuse(record, {...options, contractSha256: digest('new validator')}).reuseCandidate, false);
	assert.equal(
		assessStageReuse(record, {...options, requestSha256: digest('different scope')}).reuseCandidate,
		false,
	);
	fs.appendFileSync(env.proposalPath, ' ');
	assert.equal(assessStageReuse(record, options).reuseCandidate, false);
	const failed = receipt(env, {
		attemptId: 'interpret-repair',
		status: 'needs-repair',
		outputs: [],
		issues: [
			{
				ref: 'source',
				problem: 'A claim is ambiguous.',
				remedy: 'Retain it as unclassified and repair its mapping.',
			},
		],
	});
	saveStageReceipt({repositoryRoot: env.root, productRoot: env.productRoot, runId: 'fixture-run', receipt: failed});
	assert.equal(assessStageReuse(failed, options).reuseCandidate, false);
	assert.deepEqual(fs.readFileSync(saved), before);
	assert.throws(() => captureFiles(env.root, ['../outside.md']), /safe relative/);
	assert.throws(() => receipt(env, {usage: {unit: 'tokens', value: 4, source: '', scope: 'stage'}}), /provenance/);
});

test('simulated saved-output replay avoids another interpretation; changed writeback needs current authority', (t) => {
	const env = fixture(t);
	let interpretations = 1;
	const record = receipt(env);
	const options = {
		repositoryRoot: env.root,
		requestSha256: record.requestSha256,
		contractSha256: record.contractSha256,
	};
	if (!assessStageReuse(record, options).reuseCandidate) interpretations++;
	assert.equal(interpretations, 1);
	const chain = loadCurrentProduct(env.currentPath);
	const oldRequirement = chain.model.recordIndex.find((item) => item.id === 'retain-harvest-entry');
	fs.appendFileSync(env.sourcePath, 'Selected decision: the entry records its local calendar date.\n');
	assert.throws(
		() => buildPlannerInput({currentPath: env.currentPath, sourcePath: env.sourcePath}),
		/description changed/,
	);
	if (!assessStageReuse(record, options).reuseCandidate) interpretations++;
	const updated = structuredClone(env.proposal);
	updated.base = {
		snapshotSha256: chain.current.snapshot.sha256,
		modelSha256: chain.snapshot.productModel.sha256,
		revision: chain.model.revision,
	};
	updated.identityClaims = updated.identityClaims.map((item) => ({
		...item,
		kind: 'continued',
		previousRef: item.recordRef,
	}));
	updated.requirements[0].statement = 'A gardener can save a harvest entry with its local calendar date.';
	updated.requirements[0].provenance.sourceClaimRefs.push('selected-decision');
	updated.sourceClaims.push({
		id: 'selected-decision',
		startLine: 2,
		endLine: 2,
		summary: 'Use the local calendar date.',
		disposition: 'incorporated',
		recordRefs: ['record-dated-harvest'],
	});
	write(env.proposalPath, updated);
	env.persist();
	const next = loadCurrentProduct(env.currentPath);
	assert.equal(interpretations, 2);
	assert.equal(next.model.revision, 2);
	assert.deepEqual(
		next.model.recordIndex.find((item) => item.id === 'retain-harvest-entry'),
		oldRequirement,
	);
	assert.equal(next.model.requirements[0].id, chain.model.requirements[0].id);
	assert.equal(
		buildPlannerInput({currentPath: env.currentPath, sourcePath: env.sourcePath}).productModel.revision,
		2,
	);
});

test('exact passing review becomes stale after product writeback, without promoting the receipt', (t) => {
	const env = fixture(t);
	const inputs = {
		uxSpec: env.ux,
		uxSource: fs.readFileSync(env.uxPath),
		productDescriptionSource: fs.readFileSync(env.sourcePath),
		uxArtifactPath: env.uxPath,
		productDescriptionPath: env.sourcePath,
		sourceRoot: env.root,
		scopeRefs: [env.ux.id],
	};
	const review = {
		schemaVersion: '0.2',
		subject: createUxReviewSubject(inputs),
		verdict: 'pass',
		summary: 'Synthetic validator evidence, not a specialist assessment.',
		coverage: UX_REVIEW_CRITERIA.map((criterion) => ({
			criterion,
			result: 'pass',
			evidenceRefs: [env.ux.id],
			note: 'Synthetic fixture coverage.',
		})),
		findings: [],
		researchChecks: [],
		limits: ['No live review was performed.'],
	};
	validateUxReview(review, inputs);
	fs.appendFileSync(env.sourcePath, 'A new selected product decision.\n');
	inputs.productDescriptionSource = fs.readFileSync(env.sourcePath);
	assert.throws(() => validateUxReview(review, inputs), /stale/);
	assert.equal(review.verdict, 'pass');
});

test('a changed product requirement reaches one use case while an independent case remains intact', (t) => {
	const env = fixture(t);
	const ux = env.ux;
	const second = {
		...structuredClone(ux.flows[0]),
		id: 'inspect-entry',
		name: 'Inspect entry',
		taskPriority: 'supporting',
		steps: [{...structuredClone(ux.flows[0].steps[0]), id: 'inspect-step', actionRef: 'inspect-action'}],
		decisions: [],
	};
	ux.flows.push(second);
	ux.features[0].flowRefs.push(second.id);
	ux.interactionFrames[0].taskRefs.push(second.id);
	ux.actions.push({
		...structuredClone(ux.actions[0]),
		id: 'inspect-action',
		taskRefs: [second.id],
		feedbackRefs: ['inspect-feedback'],
	});
	ux.feedback.push({...structuredClone(ux.feedback[0]), id: 'inspect-feedback', actionRef: 'inspect-action'});
	ux.interactionFrames[0].regions[0].affordances.push({
		id: 'inspect-affordance',
		actionRef: 'inspect-action',
		label: 'Inspect',
		status: 'accepted',
		order: 2,
		interaction: 'canonical',
		transition: {kind: 'completion'},
	});
	ux.interactionFrames[0].focus.orderRefs.push('inspect-affordance');
	validateUxSpec(ux);
	const unchanged = JSON.stringify(second);
	assert.deepEqual(affectedUseCases(ux, 'product:record-dated-harvest', loadCurrentProduct(env.currentPath).model), [
		'record-entry',
	]);
	assert.equal(JSON.stringify(ux.flows[1]), unchanged);
});

test('assembly orders dependencies, replays without model changes, and needs no specialist', (t) => {
	const env = fixture(t);
	const modelBefore = loadCurrentProduct(env.currentPath).modelBytes;
	const requests = [manifestRequest(), designRequest(), uxRequest()];
	const report = assemble(env, requests);
	assert.equal(report.status, 'complete', JSON.stringify(report.items));
	assert.deepEqual(
		report.items.map((item) => item.id),
		['publication-design', 'publication-ux', 'publication-manifest'],
	);
	assert.ok(report.context);
	const pointer = fs.readFileSync(env.currentPath);
	const replay = assemble(env, requests);
	assert.equal(replay.status, 'complete');
	assert.ok(replay.items.every((item) => item.result.change === 'unchanged'));
	assert.equal(replay.context.created, false);
	assert.deepEqual(fs.readFileSync(env.currentPath), pointer);
	assert.deepEqual(loadCurrentProduct(env.currentPath).modelBytes, modelBefore);
	assert.equal(
		fs.readdirSync(env.productRoot).some((name) => name.startsWith('.refinement-assembly-')),
		false,
	);
});

test('repairable assembly failure preserves independent work and blocks old dependency reuse', (t) => {
	const env = fixture(t);
	assert.equal(assemble(env, [manifestRequest(), designRequest(), uxRequest()]).status, 'complete');
	const brokenUx = uxRequest();
	brokenUx.sources.ux = 'missing.json';
	const report = assemble(env, [manifestRequest(), brokenUx, {...designRequest(), id: 'independent-design'}]);
	assert.equal(report.status, 'needs-repair');
	assert.equal(report.context, null);
	assert.equal(report.items.find((item) => item.id === 'publication-ux').status, 'needs-repair');
	assert.equal(report.items.find((item) => item.id === 'publication-manifest').status, 'blocked');
	assert.ok(report.items.some((item) => item.status === 'complete'));
	assert.ok(report.items.filter((item) => item.status !== 'complete').every((item) => item.remedy));
	assert.equal(assemble(env, [manifestRequest(), uxRequest(), designRequest()]).status, 'complete');
});

test('cyclic dependencies terminate and lock attempts require owner authority', (t) => {
	const env = fixture(t);
	const left = {...uxRequest(), artifactDependencyIds: ['publication-design']};
	const right = {...designRequest(), artifactDependencyIds: ['publication-ux']};
	const cycle = assemble(env, [left, right]);
	assert.equal(cycle.items.length, 2);
	assert.ok(cycle.items.every((item) => item.status === 'blocked' && /cycle/.test(item.problem)));
	const pointer = fs.readFileSync(env.currentPath);
	const locked = assemble(env, [{...uxRequest(), status: 'locked'}]);
	assert.equal(locked.status, 'needs-repair');
	assert.match(locked.items[0].problem, /authority/);
	assert.deepEqual(fs.readFileSync(env.currentPath), pointer);
});

test('malformed and ambiguous request identities are repairable without losing independent units', (t) => {
	const env = fixture(t);
	const result = assemble(env, [
		null,
		{...uxRequest(), id: '../invalid'},
		uxRequest(),
		uxRequest(),
		manifestRequest(),
		designRequest(),
	]);
	assert.equal(result.status, 'needs-repair');
	assert.equal(result.context, null);
	assert.equal(result.items.filter((item) => item.id === null).length, 2);
	assert.match(result.items.find((item) => item.id === 'publication-ux').problem, /Duplicate/);
	assert.equal(result.items.find((item) => item.id === 'publication-manifest').status, 'blocked');
	assert.equal(result.items.find((item) => item.id === 'publication-design').status, 'complete');
});

test('a conflicting locked artifact remains byte-identical while independent assembly continues', (t) => {
	const env = fixture(t);
	const locked = createPublicationArtifactProposal({
		currentPath: env.currentPath,
		sourceRoot: env.root,
		request: {...uxRequest(), status: 'locked'},
	});
	const proposalPath = path.join(env.root, 'locked-proposal.json');
	write(proposalPath, locked.proposal);
	const committed = commitProductArtifact({
		currentPath: env.currentPath,
		proposalPath,
		baseSnapshotSha256: locked.baseSnapshotSha256,
		authority: {artifactId: 'publication-ux', owner: 'ux', action: 'lock-artifact'},
	});
	const original = fs.readFileSync(path.join(env.productRoot, committed.artifact.path));
	env.ux.title = 'Revised working UX';
	write(env.uxPath, env.ux);
	const result = assemble(env, [uxRequest(), designRequest()]);
	assert.equal(result.items.find((item) => item.id === 'publication-ux').status, 'needs-repair');
	assert.match(result.items.find((item) => item.id === 'publication-ux').problem, /authority/);
	assert.equal(result.items.find((item) => item.id === 'publication-design').status, 'complete');
	const current = loadCurrentProduct(env.currentPath).artifacts.find((item) => item.artifact.id === 'publication-ux');
	assert.equal(current.artifact.status, 'locked');
	assert.equal(current.artifact.revision, committed.artifact.revision);
	assert.deepEqual(fs.readFileSync(path.join(env.productRoot, committed.artifact.path)), original);
});
