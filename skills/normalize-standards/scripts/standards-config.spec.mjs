import assert from 'node:assert/strict';
import test from 'node:test';
import {overlayForPath, parseManifest, parseOverlay, standardsForPath} from './standards-config.mjs';

const manifestText = `# Folder Standards Manifest

## Standards Sets

### \`base\`

Extends: none
Standards:
- [documentation.md](../../global/documentation.md) — governance
- [testing.md](../../global/testing.md) — verification

### \`browser\`

Extends: base
Standards:
- [react.md](../../global/react.md) — browser UI

### \`server\`

Extends: base
Standards:
- [server.md](../../global/server.md) — HTTP server

## Folder Assignments

- \`.\` — \`base\` — repository files
- \`src/\` — \`browser\` — browser source
- \`server/\` — \`server\` — server source
`;

test('resolves the longest folder assignment and inherited set', () => {
	const manifest = parseManifest(manifestText);
	assert.deepEqual(
		standardsForPath(manifest, 'src/features/view.jsx').standards.map(({name}) => name),
		['documentation.md', 'testing.md', 'react.md'],
	);
	assert.equal(standardsForPath(manifest, 'README.md').assignment.set, 'base');
});

test('applies additions cumulatively and the most-specific replacement', () => {
	const manifest = parseManifest(manifestText);
	const overlay = parseOverlay(
		`# Repository Standards Overlay

## ADD: Repository evidence

Extends: testing.md#Coverage
Scope: repository
Rule: Record evidence.
Reason: Local workflow.

## REPLACE: Source tests

Replaces: testing.md#Coverage
Scope: folder:src/
Rule: Browser coverage is required.
Reason: Browser behavior.

## REPLACE: Feature tests

Replaces: testing.md#Coverage
Scope: folder:src/features/
Rule: Feature integration coverage is required.
Reason: Feature boundary.
`,
		manifest.selected,
	);
	const result = overlayForPath(overlay, 'src/features/view.jsx', 'testing.md');
	assert.equal(result.additions.length, 1);
	assert.equal(result.replacements.length, 1);
	assert.equal(result.replacements[0].rule, 'Feature integration coverage is required.');
});

test('rejects topic scopes and folder globs', () => {
	const manifest = parseManifest(manifestText);
	assert.throws(
		() =>
			parseOverlay(
				`# Repository Standards Overlay

## ADD: Old topic rule

Extends: testing.md#Coverage
Scope: topic:agents/topics/test.md
Rule: Record evidence.
Reason: Old model.
`,
				manifest.selected,
			),
		/Scope must be/,
	);
	assert.throws(() => standardsForPath(parseManifest(manifestText.replace('src/', 'src/**/')), 'src/a.js'));
});


test('resolves each section independently without dropping equally scoped replacements', () => {
	const entries = [
		{operation: 'REPLACE', standard: 'testing.md', target: 'testing.md#Coverage', kind: 'repository', folder: '.', rule: 'root'},
		{operation: 'REPLACE', standard: 'testing.md', target: 'testing.md#Coverage', kind: 'folder', folder: 'src/', rule: 'source'},
		{operation: 'REPLACE', standard: 'testing.md', target: 'testing.md#Runner', kind: 'folder', folder: 'src/', rule: 'runner'},
		{operation: 'REPLACE', standard: 'testing.md', target: 'testing.md#Coverage', kind: 'folder', folder: 'src/features/', rule: 'feature'},
		{operation: 'REPLACE', standard: 'react.md', target: 'react.md#Shape', kind: 'folder', folder: 'src/', rule: 'unrelated'},
	];
	assert.deepEqual(overlayForPath(entries, 'src/view.jsx', 'testing.md').replacements.map(({rule}) => rule), ['source', 'runner']);
	assert.deepEqual(overlayForPath(entries, 'src/features/view.jsx', 'testing.md').replacements.map(({rule}) => rule), ['feature', 'runner']);
	assert.deepEqual(overlayForPath(entries, 'server/main.js', 'testing.md').replacements.map(({rule}) => rule), ['root']);
	assert.deepEqual(overlayForPath(entries, 'server/main.js', 'react.md').replacements, []);
});
