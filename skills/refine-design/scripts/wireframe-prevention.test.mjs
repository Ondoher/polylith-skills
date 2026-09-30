import test from 'node:test';
import assert from 'node:assert/strict';
import {NumericScale} from './NumericScale.mjs';
import {renderPreview, validatePreview} from './wireframe-preview.mjs';
import {stateSheet, scaleSheet, outcomeFixture} from './fixtures/wireframe-prevention.mjs';

test('supported component states render in both neutral and supplied themes', () => {
	for (const mode of ['wireframe', 'ui']) {
		const result = renderPreview(stateSheet(), {mode});
		assert.equal(result.validation.valid, true);
		assert.match(result.html, /nested-focus/);
	}
});

test('one numeric transform aligns values and endpoints across units and viewport sizes', () => {
	for (const width of [320, 960]) {
		assert.deepEqual(NumericScale.place({min: -20, max: 80}, {start: 5, end: 55}, width), {
			start: width / 4,
			width: width / 2,
		});
		assert.equal(NumericScale.position({min: 0, max: 60}, 12, width), width / 5);
		assert.equal(NumericScale.position({min: 0, max: 60}, 60, width), width);
		assert.equal(renderPreview(scaleSheet(width)).validation.valid, true);
	}
});

test('create, update, navigation and unchanged outcomes resolve without a second specification', () => {
	const {document, packet} = outcomeFixture();
	assert.deepEqual(validatePreview(document, {packet}), {valid: true, errors: []});
	assert.deepEqual(validatePreview(document, {packet, mode: 'ui'}), {valid: true, errors: []});
});

// Observed regressions follow the working-path examples.
test('success feedback cannot replace a declared concrete result', () => {
	const {document, packet} = outcomeFixture();
	document.outcomeEvidence[0].nodeRefs = ['message'];
	document.outcomeEvidence[0].values = [];
	assert.match(validatePreview(document, {packet}).errors[0], /status\/heading alone/);
});

test('an actual displayed value must equal its source fact after UI changes as well', () => {
	const {document, packet} = outcomeFixture();
	document.ui.sceneChanges = [
		{sceneRef: 'main', changes: [{nodeRef: 'edited', set: {parameters: {label: 'Name', value: 'Wrong'}}}]},
	];
	assert.match(validatePreview(document, {packet, mode: 'ui'}).errors[0], /differs/);
	assert.equal(validatePreview(document, {packet}).valid, true);
});

test('an existing object cannot stand in for the newly created identified result', () => {
	const {document, packet} = outcomeFixture();
	document.outcomeEvidence[0].nodeRefs = ['retained'];
	document.outcomeEvidence[0].values = [{nodeRef: 'retained', parameter: 'text', sourcePath: '/facts/createdName'}];
	assert.match(validatePreview(document, {packet}).errors[0], /retained.text differs/);
});

test('an unused parameter is not rendered value evidence', () => {
	const {document, packet} = outcomeFixture();
	document.parts[0].root.children.find((x) => x.id === 'edited').parameters.text = packet.facts.updatedName;
	document.outcomeEvidence[1].values[0].parameter = 'text';
	assert.match(validatePreview(document, {packet}).errors[0], /not a displayed parameter/);
});

test('unsupported geometry remains a local repair with original values retained', () => {
	const document = scaleSheet();
	document.parts[0].root.children[2].scalePosition.end = 90;
	assert.match(validatePreview(document).errors[0], /outside domain/);
	assert.equal(document.parts[0].root.children[2].scalePosition.end, 90);
});
