import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DesignContributions} from './design-contributions.mjs';
import {DesignRecords} from './design-records.mjs';
import {DesignAssembly} from './design-assembly.mjs';
import {UxContributions} from './ux-contributions.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';

/** Owns disposable bound stores and cleans only the exact created directory.
 * @param {object} scenario - Test lifecycle.
 * @param {boolean} seed - Import the current valid fixture.
 * @returns {object} - Reusable baseline and scratch root.
 */
function fixture(scenario, seed = true) {
	const parent = fs.realpathSync(os.tmpdir());
	const directory = fs.mkdtempSync(path.join(parent, 'ux-contributions-'));
	const store = path.join(directory, 'units');
	scenario.after(() => {
		DesignContributions.close(store);
		assert.equal(path.dirname(fs.realpathSync(directory)), parent);
		fs.rmSync(directory, {recursive: true, force: true});
	});
	DesignRecords.initialize(store, {stage: 'ux', binding: {source: 'fixture-current'}});
	const ux = createUxTestSpec(),
		records = DesignAssembly.importUx(ux);
	if (seed) for (const record of records) DesignRecords.put(store, record);
	return {store, ux, records, refs: records.map((record) => `${record.kind}:${record.id}`)};
}

/** Looks up the current opaque revision as a caller would from a receipt.
 * @param {string} store - Bound store.
 * @param {string} ref - Assigned reference.
 * @returns {object} - Revision map accepted by contribute.
 */
function base(store, ref) {
	return {[ref]: DesignContributions.status(store, [ref]).units[0].revision};
}

test('a small field edit preserves baseline bytes until finish and resumes without reauthoring', (scenario) => {
	const f = fixture(scenario),
		flow = f.records.find((record) => record.kind === 'flow');
	const ref = `flow:${flow.id}`,
		prior = DesignRecords.read(f.store, [ref]);
	const input = {
		batchId: 'goal',
		base: base(f.store, ref),
		changes: [{unit: ref, op: 'set', fields: {goal: 'Save the chosen record confidently.'}}],
	};
	const receipt = DesignContributions.contribute(f.store, input);
	assert.deepEqual(receipt.issues, []);
	assert.deepEqual(DesignRecords.read(f.store, [ref]), prior);
	assert.equal(DesignContributions.contribute(f.store, input).reused, true);
	DesignContributions.close(f.store);
	assert.equal(DesignContributions.status(f.store, [ref]).units[0].revision, receipt.accepted[0].revision);
	assert.equal(DesignContributions.contribute(f.store, input).reused, true);
	assert.equal(DesignContributions.finish(f.store, [ref]).status, 'structurally-ready');
	const expected = structuredClone(flow);
	expected.data.goal = 'Save the chosen record confidently.';
	assert.deepEqual(DesignRecords.read(f.store, [ref]).records[0], expected);
	DesignContributions.close(f.store);
	assert.equal(DesignContributions.finish(f.store, [ref]).saved[0].reused, true);
});

test('identified alternate fields and nested frame affordances change without replacing sibling data', (scenario) => {
	const f = fixture(scenario),
		flow = f.records.find((record) => record.kind === 'flow');
	const ref = `flow:${flow.id}`,
		alternate = flow.data.alternates[0];
	const element = f.records.find(
		(record) =>
			record.kind === 'element' &&
			record.data.catalogs.interactionFrames.values.some((frame) =>
				frame.regions.some((region) => region.affordances.length),
			),
	);
	const elementRef = `element:${element.id}`;
	const decoded = UxContributions.decode(element),
		frame = decoded.data.interactionFrames.find((item) => item.regions.some((region) => region.affordances.length));
	const region = frame.regions.find((item) => item.affordances.length),
		affordance = region.affordances[0];
	const receipt = DesignContributions.contribute(f.store, {
		batchId: 'meaning',
		base: {...base(f.store, ref), ...base(f.store, elementRef)},
		changes: [
			{
				unit: ref,
				op: 'set',
				target: [{collection: 'alternates', id: alternate.id}],
				fields: {outcome: 'Keep the current draft and return focus.'},
			},
			{
				unit: elementRef,
				op: 'set',
				target: [
					{collection: 'interactionFrames', id: frame.id},
					{collection: 'regions', id: region.id},
					{collection: 'affordances', id: affordance.id},
				],
				fields: {label: 'Save this record'},
			},
		],
	});
	assert.deepEqual(receipt.issues, []);
	assert.equal(DesignContributions.finish(f.store, [ref, elementRef]).status, 'structurally-ready');
	const actual = DesignAssembly.ux(DesignRecords.read(f.store).records).document;
	const expected = structuredClone(f.ux);
	expected.flows.find((item) => item.id === flow.id).alternates[0].outcome =
		'Keep the current draft and return focus.';
	expected.interactionFrames
		.find((item) => item.id === frame.id)
		.regions.find((item) => item.id === region.id).affordances[0].label = 'Save this record';
	assert.deepEqual(actual, expected);
});

test('successful insertion, explicit order and removal retain stable record identities', (scenario) => {
	const f = fixture(scenario),
		flow = f.records.find((record) => record.kind === 'flow');
	const ref = `flow:${flow.id}`,
		firstId = flow.data.steps[0].id;
	const submit = (batchId, changes) =>
		DesignContributions.contribute(f.store, {batchId, base: base(f.store, ref), changes});
	assert.deepEqual(
		submit('insert', [
			{
				unit: ref,
				op: 'set',
				target: [{collection: 'steps', id: 'inspect-record'}],
				fields: {actor: 'User', action: 'Inspect the record.', response: 'The record remains visible.'},
				before: firstId,
			},
		]).issues,
		[],
	);
	const ids = [firstId, 'inspect-record', ...flow.data.steps.slice(1).map((step) => step.id)];
	assert.deepEqual(submit('order', [{unit: ref, op: 'order', collection: 'steps', ids}]).issues, []);
	DesignContributions.finish(f.store, [ref]);
	assert.deepEqual(
		DesignRecords.read(f.store, [ref]).records[0].data.steps.map((step) => step.id),
		ids,
	);
	assert.deepEqual(
		submit('remove', [{unit: ref, op: 'remove', target: [{collection: 'steps', id: 'inspect-record'}]}]).issues,
		[],
	);
	assert.equal(DesignContributions.finish(f.store, [ref]).status, 'structurally-ready');
	assert.deepEqual(DesignRecords.read(f.store, [ref]).records[0].data, flow.data);
});

test('empty-store creation accepts partial records and forward references then completes valid UX', (scenario) => {
	const f = fixture(scenario, false);
	const context = f.records.find((record) => record.kind === 'context');
	const changes = [];
	for (const record of f.records) {
		const unit = `${record.kind}:${record.id}`;
		if (record.kind === 'element') {
			const decoded = UxContributions.decode(record);
			for (const [collection, items] of Object.entries(decoded.data))
				for (const item of items)
					changes.push({unit, op: 'set', target: [{collection, id: item.id}], fields: item});
		} else changes.push({unit, op: 'set', fields: record.kind === 'context' ? record.data.document : record.data});
	}
	const partial = changes.filter((change) => change.unit.startsWith('flow:'));
	const refs = [...new Set(partial.map((change) => change.unit))];
	assert.deepEqual(
		DesignContributions.contribute(f.store, {
			batchId: 'flows-first',
			base: Object.fromEntries(refs.map((ref) => [ref, null])),
			changes: partial,
		}).issues,
		[],
	);
	assert.equal(DesignContributions.finish(f.store, refs).status, 'needs-repair');
	const remaining = changes.filter((change) => !change.unit.startsWith('flow:'));
	for (const [collection, ids] of Object.entries(context.data.order))
		remaining.push({unit: 'context:document', op: 'catalog-order', collection, ids});
	const remainingRefs = [...new Set(remaining.map((change) => change.unit))];
	assert.deepEqual(
		DesignContributions.contribute(f.store, {
			batchId: 'definitions',
			base: Object.fromEntries(remainingRefs.map((ref) => [ref, null])),
			changes: remaining,
		}).issues,
		[],
	);
	assert.equal(DesignContributions.finish(f.store, ['context:document']).status, 'needs-repair');
	const finish = DesignContributions.finish(f.store, f.refs);
	assert.deepEqual(finish.issues, []);
	assert.deepEqual(DesignAssembly.ux(DesignRecords.read(f.store).records).document, f.ux);
});

test('a misspelled field rejects its unit group while valid siblings remain reusable', (scenario) => {
	const f = fixture(scenario),
		flow = f.records.find((record) => record.kind === 'flow');
	const ref = `flow:${flow.id}`,
		before = DesignRecords.read(f.store, [ref]).records[0];
	const receipt = DesignContributions.contribute(f.store, {
		batchId: 'typo',
		base: {...base(f.store, ref), ...base(f.store, 'context:document')},
		changes: [
			{unit: ref, op: 'set', fields: {goal: 'This whole unit group must remain unapplied.'}},
			{
				unit: ref,
				op: 'set',
				target: [{collection: 'alternates', id: flow.data.alternates[0].id}],
				fields: {outcomecome: 'Invalid spelling'},
			},
			{unit: 'context:document', op: 'set', fields: {title: 'A retained independent title'}},
		],
	});
	assert.deepEqual(
		receipt.accepted.map((item) => item.reference),
		['context:document'],
	);
	assert.match(receipt.issues[0].reason, /outcomecome/);
	DesignContributions.finish(f.store, [ref, 'context:document']);
	assert.deepEqual(DesignRecords.read(f.store, [ref]).records[0], before);
	assert.equal(
		DesignRecords.read(f.store, ['context:document']).records[0].data.document.title,
		'A retained independent title',
	);
});

test('stale revisions and changed retry content cannot overwrite accepted contributions', (scenario) => {
	const f = fixture(scenario),
		ref = 'context:document',
		initial = base(f.store, ref);
	const input = {
		batchId: 'first',
		base: initial,
		changes: [{unit: ref, op: 'set', fields: {title: 'Accepted title'}}],
	};
	assert.deepEqual(DesignContributions.contribute(f.store, input).issues, []);
	const stale = DesignContributions.contribute(f.store, {
		...input,
		batchId: 'stale',
		changes: [{unit: ref, op: 'set', fields: {title: 'Stale title'}}],
	});
	assert.match(stale.issues[0].reason, /Stale revision/);
	assert.throws(
		() =>
			DesignContributions.contribute(f.store, {
				...input,
				changes: [{unit: ref, op: 'set', fields: {title: 'Changed retry'}}],
			}),
		/different content/,
	);
	DesignContributions.close(f.store);
	DesignContributions.finish(f.store, [ref]);
	assert.equal(DesignRecords.read(f.store, [ref]).records[0].data.document.title, 'Accepted title');
});
