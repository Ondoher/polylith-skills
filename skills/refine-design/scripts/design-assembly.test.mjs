import {UiParts} from './ui-parts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DesignAssembly} from './design-assembly.mjs';
import {DesignRecords} from './design-records.mjs';
import {DesignRun} from './design-run.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';
import {gardenUx} from './ux-composable-fixture.mjs';
import {validateUxSpec} from './ux-design.mjs';
import {validateUiSpec} from './ui-composition.mjs';
import {canonicalPublicationJson} from './product-publication-payload.mjs';
import {createHash} from 'node:crypto';

/** Called by scenarios to own isolated output and verify cleanup scope.
 * @param {object} scenario - Node test lifecycle.
 * @returns {string} - Assigned temporary root.
 */
function temporaryRoot(scenario) {
	const parent = fs.realpathSync(os.tmpdir());
	const root = fs.mkdtempSync(path.join(parent, 'design-assembly-'));
	scenario.after(() => {
		assert.equal(path.dirname(fs.realpathSync(root)), parent);
		fs.rmSync(root, {recursive: true, force: true});
	});
	return root;
}

/** Called by UI scenarios to reuse current synthetic consumer fixtures.
 * @returns {object} - UX, UI and design-language inputs.
 */
function fixtures() {
	const ux = createUxTestSpec();
	const ui = JSON.parse(fs.readFileSync(new URL('../references/ui-composition-proposal.json', import.meta.url)));
	const design = JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json', import.meta.url)));
	delete design.baseRevision;
	design.theme.id = 'example-theme';
	Object.assign(design, {id: 'example-design', revision: 1, decisions: []});
	ui.uxArtifactBinding.sha256 = createHash('sha256').update(canonicalPublicationJson(ux)).digest('hex');
	return {ux, ui, design};
}

test('saved UX and UI preserve every consumer field, ordering, binding and stable ID', () => {
	const {ux, ui, design} = fixtures();
	for (const original of [ux, gardenUx()]) {
		const result = DesignAssembly.ux(DesignAssembly.importUx(original));
		assert.deepEqual(result.issues, []);
		assert.deepEqual(result.document, original);
		validateUxSpec(result.document);
	}
	const result = DesignAssembly.ui(DesignAssembly.importUi(ui));
	assert.deepEqual(result.issues, []);
	assert.deepEqual(result.document, ui);
	validateUiSpec(result.document, {uxSpec: ux, designLanguage: design});
});

test('native ordered flows preserve alternatives, resume points and reusable dialog call-outs', () => {
	const records = DesignAssembly.importUx(createUxTestSpec()),
		flow = records.find((record) => record.kind === 'flow');
	flow.data.steps[1].usesElementRefs = ['ux:component:record-list'];
	flow.data.alternates[0].resumeStepRef = 'save-current-record';
	const result = DesignAssembly.ux(records);
	assert.deepEqual(result.issues, []);
	validateUxSpec(result.document);
	assert.deepEqual(result.document.flows[0], flow.data);
	for (const key of ['flowNodes', 'flowEdges', 'useCases', 'pruningReview'])
		assert.equal(Object.hasOwn(result.document, key), false);
});

test('one scene part supplies a bounded visual variation without copying its tree or changing the base', () => {
	const {ui, ux, design} = fixtures();
	const records = DesignAssembly.importUi(ui);
	const part = records.find((record) => record.kind === 'part');
	const scene = records.find((record) => record.kind === 'scene');
	const original = structuredClone(part);
	scene.data.changes = [{nodeRef: 'title', set: {parameters: {text: 'Updated observation records'}}}];
	const result = DesignAssembly.ui(records);
	assert.deepEqual(result.issues, []);
	assert.deepEqual(part, original);
	assert.equal(
		UiParts.materialize(result.document).scenes[0].root.children[0].parameters.text,
		'Updated observation records',
	);
	validateUiSpec(result.document, {uxSpec: ux, designLanguage: design});
	scene.data.changes = [{nodeRef: 'missing', set: {state: 'default'}}];
	assert.throws(() => UiParts.materialize(DesignAssembly.ui(records).document), /Missing/);
	scene.data.changes = [{nodeRef: 'title', set: {id: 'replacement'}}];
	assert.throws(() => UiParts.materialize(DesignAssembly.ui(records).document), /cannot change identity/);
});

test('missing dependencies and duplicate identities remain repairable without discarding independent elements', () => {
	const records = DesignAssembly.importUx(createUxTestSpec());
	const flow = records.find((record) => record.kind === 'flow');
	flow.dependencies.push('element:missing-dialog');
	const result = DesignAssembly.ux(records);
	assert.equal(result.document.surfaces.length, 1);
	assert.equal(result.document.flows.length, 0);
	assert.match(result.issues[0].reason, /unavailable/);
	const duplicate = DesignAssembly.ux([...records, structuredClone(flow)]);
	assert.match(duplicate.issues[0].reason, /duplicate/);
	assert.equal(duplicate.document.surfaces.length, 1);
	const unexpectedContext = DesignAssembly.ux([...records, {kind: 'context', id: 'other', data: {document: {}}}]);
	assert.ok(unexpectedContext.issues.some((entry) => /Only context:document/.test(entry.reason)));
	records[0].data.document.surfaces = [];
	assert.match(DesignAssembly.ux(records).issues.at(-1).reason, /duplicated context/);
});

test('assembly renders actual clean and annotated previews and reuses generated output during the same run', (scenario) => {
	const root = temporaryRoot(scenario);
	const store = path.join(root, 'records'),
		output = path.join(root, 'output');
	const {ux, ui, design} = fixtures();
	DesignRecords.initialize(store, {stage: 'ui', binding: {ux: ui.uxArtifactBinding, producer: 'synthetic-test'}});
	const records = DesignAssembly.importUi(ui);
	const saved = DesignRun.deliver(store, records);
	assert.deepEqual(saved.issues, []);
	const options = {uxSpec: ux, designLanguage: design, render: true};
	const first = DesignRun.assemble(store, output, options);
	assert.deepEqual(first.issues, []);
	assert.equal(first.valid, true);
	assert.equal(first.reviewStatus, 'not-assessed');
	assert.equal(first.outputs.filter((file) => /records-viewing(?:-annotated)?\.html$/.test(file.relative)).length, 2);
	const preview = first.outputs.find((file) => file.relative.endsWith('/comps/records-viewing.html'));
	assert.match(fs.readFileSync(path.join(output, preview.relative), 'utf8'), /Observation records/);
	const stylesheet = first.outputs.find((file) => file.relative.endsWith('/assets/prd.css'));
	assert.ok(stylesheet, 'standalone previews include their design-language stylesheet');
	assert.match(fs.readFileSync(path.join(output, stylesheet.relative), 'utf8'), /--rd-color-primary-action/);
	assert.ok(first.outputs.some((file) => file.relative.includes('/assets/fonts/')));
	const modified = fs.statSync(first.candidatePath).mtimeMs;
	assert.equal(
		DesignRun.deliver(store, records).saved.every((record) => record.reused),
		true,
	);
	const second = DesignRun.assemble(store, output, options);
	assert.equal(second.reused, true);
	for (const name of [
		'readMs',
		'identityMs',
		'cacheCheckMs',
		'assemblyMs',
		'validationMs',
		'serializationMs',
		'persistMs',
	])
		assert.ok(first.stages[name] >= 0, `Missing first-run timing: ${name}`);
	assert.deepEqual(Object.keys(second.stages).sort(), ['cacheCheckMs', 'identityMs', 'readMs']);
	assert.equal(second.identity, first.identity);
	assert.equal(fs.statSync(first.candidatePath).mtimeMs, modified);
	const scene = records.find((record) => record.kind === 'scene');
	scene.data.changes = [{nodeRef: 'title', set: {parameters: {text: 'Repaired title'}}}];
	assert.deepEqual(
		DesignRun.deliver(store, [scene], {
			[`scene:${scene.id}`]: saved.saved.find((record) => record.recordKey.startsWith('scene:')).digest,
		}).issues,
		[],
	);
	const repaired = DesignRun.assemble(store, output, options);
	assert.equal(repaired.valid, true);
	assert.notEqual(repaired.identity, first.identity);
	assert.equal(fs.existsSync(first.candidatePath), true);
	assert.equal(
		DesignRecords.put(
			store,
			records.find((record) => record.kind === 'part'),
		).reused,
		true,
	);
});

test('bounded file handoff excludes unrelated data and survives a dependency cycle without repeated reads', (scenario) => {
	const root = temporaryRoot(scenario);
	DesignRecords.initialize(root, {stage: 'ui', binding: {producer: 'synthetic-test'}});
	const records = DesignAssembly.importUi(fixtures().ui);
	const part = records.find((record) => record.kind === 'part');
	const scene = records.find((record) => record.kind === 'scene');
	part.dependencies = [`scene:${scene.id}`];
	DesignRun.deliver(root, records);
	const result = DesignRun.handoff(root, [`scene:${scene.id}`]);
	assert.equal(result.units.length, 2);
	assert.equal(
		result.units.some((unit) => unit.reference === 'context:document'),
		false,
	);
	assert.equal(result.reviewStatus, 'not-assessed');
	assert.ok(result.bytesRead < DesignRecords.read(root).bytesRead);
});

test('malformed context, broken delivery and invalid semantic references report repairs and preserve saved work', (scenario) => {
	const root = temporaryRoot(scenario),
		store = path.join(root, 'store');
	DesignRecords.initialize(store, {stage: 'ux', binding: {producer: 'synthetic-test'}});
	const records = DesignAssembly.importUx(createUxTestSpec());
	const flow = records.find((record) => record.kind === 'flow');
	flow.data.steps[0].actionRef = 'missing-action';
	const delivery = DesignRun.deliver(store, [null, ...records]);
	assert.equal(delivery.issues.length, 1);
	assert.equal(delivery.saved.length, records.length);
	const report = DesignRun.assemble(store, path.join(root, 'output'));
	assert.equal(report.valid, false);
	assert.match(report.issues.at(-1).reason, /missing-action/);
	assert.ok(fs.existsSync(report.candidatePath));
	fs.writeFileSync(path.join(store, 'context.document.json'), '{');
	const missing = DesignRun.assemble(store, path.join(root, 'output'));
	assert.equal(missing.valid, false);
	assert.equal(missing.candidatePath, null);
	assert.equal(DesignRecords.read(store, [`flow:${flow.id}`]).records.length, 1);
	const contextIssue = DesignRecords.read(store, ['context:document']).issues[0];
	const context = records.find((record) => record.kind === 'context');
	assert.match(contextIssue.repairDigest, /^raw:/);
	assert.throws(() => DesignRecords.put(store, context, 'raw:stale'), /replacement/);
	DesignRecords.put(store, context, contextIssue.repairDigest);
	assert.equal(DesignRecords.read(store, ['context:document']).issues.length, 0);
});

test('changed UX binding cannot reuse accepted-looking UI output', (scenario) => {
	const root = temporaryRoot(scenario),
		store = path.join(root, 'store');
	const {ux, ui, design} = fixtures();
	DesignRecords.initialize(store, {stage: 'ui', binding: {producer: 'synthetic-test'}});
	DesignRun.deliver(store, DesignAssembly.importUi(ui));
	const first = DesignRun.assemble(store, path.join(root, 'output'), {uxSpec: ux, designLanguage: design});
	assert.equal(first.valid, true);
	ux.revision = '2';
	const changed = DesignRun.assemble(store, path.join(root, 'output'), {uxSpec: ux, designLanguage: design});
	assert.equal(changed.reused, false);
	assert.equal(changed.valid, false);
	assert.equal(changed.reviewStatus, 'not-assessed');
});

test('CLI imports a saved fixture and resumes candidate assembly without hidden product writes', (scenario) => {
	const root = temporaryRoot(scenario);
	const input = path.join(root, 'saved.json'),
		store = path.join(root, 'records'),
		output = path.join(root, 'out');
	fs.writeFileSync(input, JSON.stringify(createUxTestSpec()));
	const cli = fileURLToPath(new URL('./single-pass-design.mjs', import.meta.url));
	for (const args of [
		['import', '--stage', 'ux', '--input', input, '--store', store],
		['assemble', '--store', store, '--output-dir', output],
		['assemble', '--store', store, '--output-dir', output],
	]) {
		const result = spawnSync(process.execPath, [cli, ...args], {encoding: 'utf8'});
		assert.equal(result.status, 0, result.stderr || result.error?.message);
		const report = JSON.parse(result.stdout);
		assert.deepEqual(report.issues, []);
	}
	assert.equal(fs.existsSync(path.join(root, 'current.json')), false);
});
