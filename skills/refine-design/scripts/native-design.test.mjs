import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {LegacyUxImport} from './legacy-ux-import.mjs';
import {DesignMigration} from './design-migration.mjs';
import {DesignAssembly} from './design-assembly.mjs';
import {DesignRecords} from './design-records.mjs';
import {DesignRun} from './design-run.mjs';
import {UiParts} from './ui-parts.mjs';
import {validateUxSpec} from './ux-design.mjs';
import {uiRequiredScopeRefs} from './ui-composition.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';
import {gardenUx} from './ux-composable-fixture.mjs';

/** Read an explicitly synthetic saved import fixture. @returns {object} */
function legacy() {
	return JSON.parse(
		fs.readFileSync(new URL('../references/fixtures/ux-regression/legacy-garden.json', import.meta.url)),
	);
}

/** Own an isolated test directory. @param {object} t @returns {string} */
function temporary(t) {
	const parent = fs.realpathSync(os.tmpdir()),
		root = fs.mkdtempSync(path.join(parent, 'native-design-'));
	t.after(() => {
		assert.equal(path.dirname(fs.realpathSync(root)), parent);
		fs.rmSync(root, {recursive: true, force: true});
	});
	return root;
}

test('native local routes have one order, optional inherited status and closed fields', () => {
	const spec = createUxTestSpec(),
		flow = spec.flows[0];
	delete flow.steps[0].status;
	spec.productRealizations.push({
		id: 'step-trace',
		productRef: 'product:requirement',
		uxRef: `ux:step:${flow.steps[0].id}`,
		relation: 'realizes',
		status: 'accepted',
		rationale: 'The local step realizes the requirement.',
	});
	validateUxSpec(spec);
	flow.steps.reverse();
	validateUxSpec(spec);
	for (const key of ['flowNodes', 'flowEdges', 'pruningReview', 'useCases']) {
		const changed = structuredClone(spec);
		changed[key] = [];
		assert.throws(() => validateUxSpec(changed), /unsupported field/);
	}
});

test('alternates remain local, stable step IDs are unique and shared elements must exist', () => {
	for (const mutate of [
		(spec) => (spec.flows[0].alternates[0].afterStepRef = 'missing'),
		(spec) => (spec.flows[0].alternates[0].resumeStepRef = 'missing'),
		(spec) => (spec.flows[0].alternates[0].steps[0].id = spec.flows[0].steps[0].id),
		(spec) => (spec.flows[0].steps[0].usesElementRefs = ['ux:component:missing']),
		(spec) => (spec.flows[0].steps[0].stateRefs = ['missing']),
		(spec) => (spec.flows[0].steps[0].sourceRefs = ['missing']),
		(spec) => (spec.flows[0].alternates[0].status = 'invented'),
	]) {
		const spec = createUxTestSpec();
		mutate(spec);
		assert.throws(() => validateUxSpec(spec));
	}
});

test('explicit legacy import preserves straightforward meaning and ordinary consumers reject old input', () => {
	const source = legacy(),
		bytes = JSON.stringify(source),
		result = LegacyUxImport.convert(source);
	assert.deepEqual(result.issues, []);
	validateUxSpec(result.document);
	assert.deepEqual(result.document, gardenUx());
	assert.equal(JSON.stringify(source), bytes);
	assert.equal(result.mappings['ux:flow-node:save-step'], 'ux:step:save-step');
	assert.throws(() => validateUxSpec(source), /requires schema 0.4/);
	assert.throws(() => DesignAssembly.importUx(source), /Import old UX explicitly/);
});

test('ambiguous graph material becomes repair evidence while independent native data survives', () => {
	const source = legacy();
	source.useCaseRelations.push({
		id: 'related-task',
		fromUseCaseRef: 'record-entry',
		toUseCaseRef: 'another-task',
		kind: 'precedes',
		status: 'accepted',
		sourceRefs: ['brief'],
	});
	const result = LegacyUxImport.convert(source);
	assert.equal(result.document.flows[0].steps[0].id, 'save-step');
	assert.ok(result.issues.some((item) => item.reference === 'related-task'));
	assert.deepEqual(result.document.repairNeeds, result.issues);
});

test('migration preserves original bytes and reuses them without silently replacing changed input', (t) => {
	const root = temporary(t),
		input = path.join(root, 'old.json'),
		out = path.join(root, 'import');
	const bytes = JSON.stringify(legacy(), null, 4) + '\n';
	fs.writeFileSync(input, bytes);
	const first = DesignMigration.import({inputPath: input, outputDirectory: out, stage: 'ux'});
	assert.equal(fs.readFileSync(first.originalPath, 'utf8'), bytes);
	assert.equal(first.reviewStatus, 'not-assessed');
	assert.deepEqual(first.issues, []);
	const prior = fs.readFileSync(first.candidatePath);
	const repeat = DesignMigration.import({inputPath: input, outputDirectory: out, stage: 'ux'});
	assert.equal(repeat.sourceSha256, first.sourceSha256);
	assert.deepEqual(fs.readFileSync(first.candidatePath), prior);
	fs.writeFileSync(input, bytes + ' ');
	assert.throws(
		() => DesignMigration.import({inputPath: input, outputDirectory: out, stage: 'ux'}),
		/differs from preserved evidence/,
	);
	assert.deepEqual(fs.readFileSync(first.candidatePath), prior);
});

test('malformed import remains preserved and a repair-bearing candidate never reports structural completion', (t) => {
	const root = temporary(t),
		input = path.join(root, 'broken.json');
	fs.writeFileSync(input, '{');
	const broken = DesignMigration.import({inputPath: input, outputDirectory: path.join(root, 'import'), stage: 'ux'});
	assert.equal(broken.candidatePath, null);
	assert.equal(broken.issues.length, 1);
	assert.equal(fs.readFileSync(broken.originalPath, 'utf8'), '{');
	const spec = gardenUx();
	spec.repairNeeds.push({
		reference: 'record-entry',
		reason: 'Confirm this condition.',
		remedy: 'Supply the missing product decision.',
	});
	const store = path.join(root, 'store');
	DesignRecords.initialize(store, {stage: 'ux', binding: {producer: 'test'}});
	DesignRun.deliver(store, DesignAssembly.importUx(spec));
	const report = DesignRun.assemble(store, path.join(root, 'output'));
	assert.equal(report.valid, false);
	assert.ok(report.candidatePath);
	assert.match(report.issues[0].remedy, /Supply/);
});

test('UI review scope includes behavior references inside shared parts and variations', () => {
	const ui = JSON.parse(fs.readFileSync(new URL('../references/ui-composition-proposal.json', import.meta.url)));
	const material = UiParts.materialize(ui),
		required = uiRequiredScopeRefs(ui);
	assert.ok(required.includes('open-record'));
	assert.equal(Object.hasOwn(ui.scenes[0], 'root'), false);
	assert.ok(material.scenes[0].root);
	assert.notEqual(material.scenes[0].root, ui.parts[0].root);
	const candidate = structuredClone(ui);
	candidate.scenes[0].changes = [{nodeRef: 'title', set: {actionRef: 'new-action'}}];
	assert.ok(uiRequiredScopeRefs(candidate).includes('new-action'));
	assert.throws(() => UiParts.materialize({...ui, schemaVersion: '0.3'}), /requires schema 0.4/);
});

test('migration refuses foreign output and linked output directories', (t) => {
	const root = temporary(t),
		input = path.join(root, 'old.json'),
		foreign = path.join(root, 'foreign');
	fs.writeFileSync(input, JSON.stringify(legacy()));
	fs.mkdirSync(foreign);
	fs.writeFileSync(path.join(foreign, 'owned.txt'), 'keep');
	assert.throws(
		() => DesignMigration.import({inputPath: input, outputDirectory: foreign, stage: 'ux'}),
		/empty or owned/,
	);
	const link = path.join(root, 'link');
	fs.symlinkSync(foreign, link, process.platform === 'win32' ? 'junction' : 'dir');
	assert.throws(() => DesignMigration.import({inputPath: input, outputDirectory: link, stage: 'ux'}), /Linked/);
	assert.equal(fs.readFileSync(path.join(foreign, 'owned.txt'), 'utf8'), 'keep');
});
