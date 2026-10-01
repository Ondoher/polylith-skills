import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {component, envelope, region} from '../../../../skills/refine-design/scripts/fixtures/wireframe-prevention.mjs';
import {renderPreview} from '../../../../skills/refine-design/scripts/wireframe-preview.mjs';

// Anonymized reduction of the full confirmation's focus-ownership rejection.
// This reproduces a semantic gap; it does not add a production validator.
const output = path.resolve('.codex-tmp/focus-ownership-reproduction');
fs.mkdirSync(output, {recursive: true});
const selected = component(
	'selected-item',
	'visual',
	{role: 'item', text: 'Selected item', variant: 'selected'},
	'focus',
);
const document = envelope(
	'focus-ownership',
	region('editor', [
		component('select-item', 'button-secondary', {label: 'Select item'}, 'focus'),
		selected,
		component('apply', 'button', {label: 'Apply'}, 'focus'),
	]),
	440,
	290,
);
document.focusIntent = 'Apply owns current keyboard focus; the item remains selected.';
const results = [];
for (const [name, expectedFocusCount] of [
	['ambiguous', 3],
	['corrected', 1],
]) {
	if (name === 'corrected') {
		document.parts[0].root.children[0].state = 'default';
		selected.state = 'default';
	}
	const rendered = renderPreview(document);
	assert.equal(rendered.validation.valid, true);
	const focusCount = [...rendered.html.matchAll(/data-ui-state="focus"/g)].length;
	assert.equal(focusCount, expectedFocusCount);
	assert.match(rendered.html, /class="[^"]*\bui-visual-variant--selected\b/);
	fs.writeFileSync(path.join(output, name + '.json'), JSON.stringify(document, null, 2) + '\n');
	fs.writeFileSync(path.join(output, name + '.html'), rendered.html);
	results.push({name, focusCount, structurallyValid: true, intendedFocusCount: 1});
}
console.log(
	JSON.stringify({
		output,
		results,
		limitation: 'Static reproduction of conflicting focus declarations; no browser or live keyboard test.',
	}),
);
