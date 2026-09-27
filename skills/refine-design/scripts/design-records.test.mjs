import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DesignRecords} from './design-records.mjs';

/** Called by each scenario to own isolated temporary evidence.
 * @param {object} scenario - Node test context.
 * @returns {string} - Isolated test directory.
 */
function temporaryRoot(scenario) {
	const temporaryParent = fs.realpathSync(os.tmpdir());
	const root = fs.mkdtempSync(path.join(temporaryParent, 'design-records-'));
	scenario.after(() => {
		assert.equal(path.dirname(fs.realpathSync(root)), temporaryParent);
		fs.rmSync(root, {recursive: true, force: true});
	});
	return root;
}

test('records created during a run are reused and only the explicitly repaired unit changes', (scenario) => {
	const root = temporaryRoot(scenario);
	const options = {stage: 'ux', binding: {facts: 'frozen-facts-1', producer: 'test/1'}};
	DesignRecords.initialize(root, options);
	const editor = {id: 'editor', kind: 'element', data: {purpose: 'Edit a collection.'}};
	const selector = {id: 'selector', kind: 'element', data: {purpose: 'Select reusable content.'}};
	const initialEditor = DesignRecords.put(root, editor);
	const initialSelector = DesignRecords.put(root, selector);
	fs.utimesSync(initialSelector.path, new Date('2000-01-01'), new Date('2000-01-01'));
	const priorModified = fs.statSync(initialSelector.path).mtimeMs;
	assert.deepEqual(DesignRecords.initialize(root, options).binding, options.binding);
	assert.equal(DesignRecords.put(root, selector).reused, true);
	assert.equal(fs.statSync(initialSelector.path).mtimeMs, priorModified);
	const updated = {...editor, data: {purpose: 'Edit and save a collection.'}};
	assert.throws(() => DesignRecords.put(root, updated), /replacement/);
	assert.throws(() => DesignRecords.put(root, updated, 'obsolete'), /replacement/);
	assert.equal(DesignRecords.read(root, ['element:editor']).records[0].data.purpose, editor.data.purpose);
	assert.equal(DesignRecords.put(root, updated, initialEditor.digest).reused, false);
	const resumed = DesignRecords.read(root);
	assert.equal(resumed.records.length, 2);
	assert.equal(resumed.issues.length, 0);
	assert.equal(resumed.identities['element:selector'], initialSelector.digest);
	assert.equal(fs.statSync(initialSelector.path).mtimeMs, priorModified);
	assert.equal(resumed.identities['element:editor'], DesignRecords.digest(updated));
});

test('partial and malformed delivery preserves usable siblings and supports bounded reads', (scenario) => {
	const root = temporaryRoot(scenario);
	DesignRecords.initialize(root, {stage: 'ux', binding: {facts: 'one'}});
	const saved = DesignRecords.put(root, {id: 'save', kind: 'flow', data: {steps: ['Save draft.']}});
	fs.writeFileSync(path.join(root, 'flow.retry.json'), '{');
	fs.writeFileSync(path.join(root, 'flow.cancel.json.aborted.pending'), '{"id":');
	const resumed = DesignRecords.read(root);
	assert.deepEqual(
		resumed.records.map((record) => record.id),
		['save'],
	);
	assert.equal(resumed.issues.length, 2);
	assert.ok(resumed.issues.every((issue) => issue.remedy.length > 0));
	const packet = DesignRecords.read(root, ['flow:save']);
	assert.equal(packet.issues.length, 0);
	assert.equal(packet.bytesRead, fs.statSync(saved.path).size);
	assert.equal(DesignRecords.read(root, ['flow:missing']).issues.length, 1);
	DesignRecords.put(root, {id: 'save', kind: 'flow', data: {steps: ['Save draft.']}});
	assert.equal(DesignRecords.read(root).issues.length, 2);
});

test('changed inputs and unrelated directories cannot overwrite a prior run', (scenario) => {
	const root = temporaryRoot(scenario);
	const store = path.join(root, 'run');
	DesignRecords.initialize(store, {stage: 'ui', binding: {ux: 'reviewed-one', tool: 'one'}});
	DesignRecords.put(store, {id: 'editor', kind: 'scene', data: {title: 'Original'}});
	assert.throws(
		() => DesignRecords.initialize(store, {stage: 'ui', binding: {ux: 'reviewed-two', tool: 'one'}}),
		/inputs changed/,
	);
	assert.throws(() => DesignRecords.initialize(root, {stage: 'ui', binding: {ux: 'one'}}), /not empty/);
	assert.equal(DesignRecords.read(store).records[0].data.title, 'Original');
});

test('record identity, traversal, unknown fields, and malformed values are rejected before writes', (scenario) => {
	const root = temporaryRoot(scenario);
	DesignRecords.initialize(root, {stage: 'ux', binding: {facts: 'one'}});
	for (const record of [
		{id: '../outside', kind: 'flow', data: {}},
		{id: 'safe', kind: 'unknown', data: {}},
		{id: 'safe', kind: 'flow', data: {}, guessed: true},
		{id: 'safe', kind: 'flow', data: {count: Infinity}},
		{id: 'safe', kind: 'flow', data: {}, dependencies: ['../../outside']},
	])
		assert.throws(() => DesignRecords.put(root, record));
	assert.throws(() => DesignRecords.read(root, ['flow:../../outside']));
	assert.equal(DesignRecords.read(root).records.length, 0);
});

test('linked staging roots are rejected and a mislabeled record stays a repair item', (scenario) => {
	const root = temporaryRoot(scenario);
	const store = path.join(root, 'store');
	DesignRecords.initialize(store, {stage: 'ux', binding: {facts: 'one'}});
	const linkedRoot = path.join(root, 'linked');
	fs.symlinkSync(store, linkedRoot, process.platform === 'win32' ? 'junction' : 'dir');
	assert.throws(() => DesignRecords.read(linkedRoot), /symbolic link/);
	fs.writeFileSync(path.join(store, 'flow.first.json'), JSON.stringify({id: 'second', kind: 'flow', data: {}}));
	const result = DesignRecords.read(store);
	assert.equal(result.records.length, 0);
	assert.match(result.issues[0].reason, /identity differ/);
});
