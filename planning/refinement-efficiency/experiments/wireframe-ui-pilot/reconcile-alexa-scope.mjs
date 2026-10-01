// Offline investigation for this saved product update, not a shared product policy.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {WireframeScope} from '../../../../skills/refine-design/scripts/WireframeScope.mjs';
import {WireframeStore} from '../../../../skills/refine-design/scripts/wireframe-store.mjs';

const started = performance.now();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const source = path.join(root, '.codex-tmp/ux-full-native-20260929/sol-medium-first-pass-20260930/workspace');
const original = path.join(root, '.codex-tmp/wireframe-ui-prevention-20260930/workspace');
const output = path.join(root, '.codex-tmp/wireframe-ui-scope-correction-20261001');
const read = (name) => JSON.parse(fs.readFileSync(name, 'utf8'));
const priorReportPath = path.join(output, 'report.json');
const measurementHistory = fs.existsSync(priorReportPath)
	? (read(priorReportPath).measurementHistory ?? [
			{at: read(priorReportPath).createdAt, elapsedMs: read(priorReportPath).elapsedMs},
		])
	: [];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const oldHash = 'ae67c738ab85986be07993ad4950beebf4da60ba3382957eed9d7a405a9c1f86';
const newHash = '5502890f811ef8c74ffc3b03e5e3b6461fdcc05402fe6c5f1a02df100f7f9ffe';
const oldPath = path.join(source, 'product/Alexa/sources', oldHash, 'product-description.md');
const newPath = path.join(source, 'agents/topics/alexa/product-description.md');
const oldBytes = fs.readFileSync(oldPath);
const newBytes = fs.readFileSync(newPath);
assert.equal(hash(oldBytes), oldHash);
assert.equal(hash(newBytes), newHash);
assert(
	newBytes.subarray(0, oldBytes.length).equals(oldBytes),
	'This replay depends on the verified append-only amendment',
);
const amendment = newBytes.subarray(oldBytes.length).toString('utf8');
assert(amendment.includes('---\nwhen a clip is added to a track timeline it is copied, not referenced.'));
const livePath = 'C:/dev/alexa/agents/topics/alexa/product-description.md';
assert.equal(
	hash(fs.readFileSync(livePath)),
	newHash,
	'Live source changed; reassess instead of claiming current scope',
);
const inputPath = path.join(original, 'inputs');
const context = read(path.join(inputPath, 'context.json'));
const before = read(path.join(inputPath, 'before-ux.json'));
const after = read(path.join(inputPath, 'after-ux.json'));
const ui = read(path.join(inputPath, 'prior-ui.json'));
const design = read(path.join(inputPath, 'design.json'));
const priorScope = read(path.join(original, 'outputs/scope.json'));
const protectedPaths = [
	oldPath,
	newPath,
	livePath,
	...['context', 'before-ux', 'after-ux', 'prior-ui', 'design'].map((name) => path.join(inputPath, name + '.json')),
	path.join(original, 'outputs/scope.json'),
];
const protectedHashes = Object.fromEntries(protectedPaths.map((name) => [name, hash(fs.readFileSync(name))]));

// These are interpreted source facts with references retained below, not a new parser.
const previousRecords = {
	'inserted-clip-ownership':
		'A named clip retains stable library identity; unchanged following occurrences adopt later trim updates.',
	'assembly-editing':
		'A clip may internally be continuous or composed. An assembly is an internal playback construction, not a separate user-facing content type, library category or editor mode.',
	'library-update-targets':
		'Update named clip propagates to following occurrences, preserves local overrides and refuses resulting collisions.',
};
const currentRecords = {
	'inserted-clip-ownership': 'When a clip is added to a track timeline it is copied, not referenced.',
	'assembly-editing':
		'An assembly is one grouped object. Outward trim reveals source file content; inward trim retains hidden parts. Ungroup adds separate visible parts only.',
	'library-update-targets': 'Updates to a clip do not update videos that used it.',
};
const impacts = [
	{
		id: 'timeline-copy-and-group',
		elementId: 'timeline',
		kind: 'requirement-change',
		status: 'ready',
		reason: 'Show independent insertion results, grouped selection/trim and visible-only ungroup results on the timeline.',
		affectedRefs: [
			'action:insert-content',
			'action:select-objects',
			'action:trim-occurrence',
			'action:ungroup-assembly',
		],
		dependencies: [{sourceId: 'product-description', recordRefs: ['inserted-clip-ownership', 'assembly-editing']}],
	},
	{
		id: 'menu-ungroup',
		elementId: 'selection-actions-menu',
		kind: 'requirement-change',
		status: 'ready',
		reason: 'Add Ungroup for a selected assembly; preserve existing range actions and Update Named Clip entry.',
		affectedRefs: ['action:ungroup-assembly'],
		dependencies: [{sourceId: 'product-description', recordRefs: ['assembly-editing']}],
	},
	{
		id: 'library-only-comparison',
		elementId: 'clip-update-dialog',
		kind: 'requirement-change',
		status: 'ready',
		reason: 'Remove propagation/follower collision presentation and explain that the library change affects future additions only.',
		affectedRefs: ['action:confirm-update', 'frame:clip-update'],
		dependencies: [{sourceId: 'product-description', recordRefs: ['library-update-targets']}],
	},
];
context.scopeBasis = {
	previousSources: [{id: 'product-description', revision: oldHash, records: previousRecords}],
	currentSources: [{id: 'product-description', revision: newHash, records: currentRecords}],
	impacts,
};
// The chooser does not perform insertion. Restore its accepted representation;
// insert-content keeps the amended semantics and is owned by the timeline impact.
for (const [collection, id] of [
	['interactionFrames', 'timeline-add'],
	['actions', 'choose-timeline-content'],
]) {
	const accepted = before[collection].find((record) => record.id === id);
	assert(accepted);
	for (const document of [context, after]) {
		const index = document[collection].findIndex((record) => record.id === id);
		assert(index >= 0);
		document[collection][index] = structuredClone(accepted);
	}
}
context.frameChanges = context.frameChanges.filter((record) => record.id !== 'timeline-add');
context.actionChanges = context.actionChanges.filter((record) => record.id !== 'choose-timeline-content');
const elements = structuredClone(priorScope.elements);
for (const element of elements) {
	element.impactRefs = impacts.filter((impact) => impact.elementId === element.id).map((impact) => impact.id);
	if (element.id === 'timeline-add-dialog') {
		element.disposition = 'reuse';
		element.requiredStates = [];
		element.dependencies = [];
		element.changeReason =
			'Existing accepted controls stage content and commit explicitly without promising live linking. Copy/group results are demonstrated on the timeline. No new chooser, crop or compatibility behavior is required.';
	} else if (element.impactRefs.length) {
		element.changeReason = impacts
			.filter((impact) => impact.elementId === element.id)
			.map((impact) => impact.reason)
			.join(' ');
		if (element.id === 'selection-actions-menu') element.requiredStates = ['grouped-object', 'ungroup-failure'];
	}
}
const scope = new WireframeScope(context).select({elements});
assert.deepEqual(scope.issues, []);
fs.mkdirSync(path.join(output, 'inputs'), {recursive: true});
for (const [name, value] of Object.entries({context, scope, 'candidate-ux': after, 'prior-ui': ui}))
	fs.writeFileSync(path.join(output, 'inputs', name + '.json'), JSON.stringify(value, null, 2));
fs.writeFileSync(path.join(output, 'fixture.json'), JSON.stringify({context, scope, design}, null, 2));
const store = new WireframeStore({workspace: output, context});
store.setScope(scope, {scope: {role: 'wireframe'}});
assert.deepEqual(
	store.dispatchElements().map((element) => element.id),
	['clip-update-dialog', 'selection-actions-menu', 'timeline'],
);
const originalDialog = ui.parts.find((part) => part.id === 'timeline-add-base');
assert(originalDialog);
const report = {
	createdAt: new Date().toISOString(),
	mode: 'offline-source-and-scope-reconciliation',
	source: {
		before: {path: oldPath, sha256: oldHash, bytes: oldBytes.length},
		after: {path: newPath, sha256: newHash, bytes: newBytes.length},
		appendedBytes: newBytes.length - oldBytes.length,
		amendment,
		governingLines: '204-213',
		previousGoverningSections: ['Adding Content To A Video', 'Named Clips', 'Parent and origin relationships'],
	},
	correction:
		'The appended owner amendment supports independent copies. The earlier claim of unsupported semantics missed this text. Interface redesign still needs a concrete presentation impact.',
	counts: {
		candidates: elements.length,
		previousUpdates: priorScope.elements.filter((element) => element.disposition === 'update').length,
		updates: store.dispatchElements().length,
		reused: scope.elements.filter((element) => element.disposition === 'reuse').length,
		unresolved: scope.issues.length,
		actualModelCalls: 0,
		actualAuthorDispatches: 0,
		prospectiveInterfacePipelinesRemoved: 1,
	},
	decisions: scope.elements.map((element) => ({
		id: element.id,
		disposition: element.disposition,
		impactRefs: element.impactRefs,
		reason: element.changeReason,
		priorExperiment: ['timeline', 'clip-update-dialog', 'selection-actions-menu'].includes(element.id)
			? 'Retain saved reviewed candidates and receipts; new scope/source evidence requires current acceptance verification before further delivery. Do not regenerate by default.'
			: element.id === 'timeline-add-dialog'
				? 'Retain old experiment as evidence only. Reuse accepted original dialog; its partial completeness remains unchanged.'
				: 'Reuse original source artifact; preserve its status and remaining limitations.',
	})),
	reconciledRecords: ['interactionFrames:timeline-add', 'actions:choose-timeline-content'],
	unchangedDialog: {
		partId: originalDialog.id,
		sha256: hash(JSON.stringify(originalDialog)),
		candidateSha256: hash(
			JSON.stringify(
				read(path.join(output, 'inputs/prior-ui.json')).parts.find((part) => part.id === originalDialog.id),
			),
		),
	},
	limitations: [
		'Candidate upstream UX is still unreviewed. This is a scope decision, not canonical acceptance.',
		'Saved experimental acceptance is not automatically promoted across changed packet bindings.',
		'No new author/reviewer run, live product write, measured model-time saving or first-construction success claim.',
	],
	protectedHashes,
	protectedUnchanged: protectedPaths.every((name) => hash(fs.readFileSync(name)) === protectedHashes[name]),
	elapsedMs: performance.now() - started,
};
assert(report.protectedUnchanged);
assert.equal(report.unchangedDialog.sha256, report.unchangedDialog.candidateSha256);
report.measurementHistory = [...measurementHistory, {at: report.createdAt, elapsedMs: report.elapsedMs}];
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
const publicMetrics = {
	...report,
	source: {
		before: {sha256: oldHash, bytes: oldBytes.length},
		after: {sha256: newHash, bytes: newBytes.length},
		appendedBytes: report.source.appendedBytes,
		governingLines: report.source.governingLines,
	},
	protectedHashes: undefined,
};
fs.writeFileSync(
	path.join(root, 'planning/refinement-efficiency/wireframe-ui-scope-correction-metrics.json'),
	JSON.stringify(publicMetrics, null, 2),
);
console.log(
	JSON.stringify({
		output,
		counts: report.counts,
		elapsedMs: report.elapsedMs,
		protectedUnchanged: report.protectedUnchanged,
	}),
);
