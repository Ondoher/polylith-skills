import assert from 'node:assert/strict';
import test from 'node:test';
import {annotateRules, parseRules} from './rule-inventory.mjs';

test('covers paragraphs, individual list items and continuations, tables, fenced examples', () => {
	const source =
		'# React\n\n## Shape\n\nRender semantic regions.\nContinued explanation.\n\n- One responsibility.\n  Continued detail.\n- Named handlers.\n\n| Rule | Meaning |\n| --- | --- |\n| R | Regions |\n\n```jsx\n# literal, not heading\n- literal, not list\n<!-- rule: NOT-A-MARKER -->\n```\n';
	const annotated = annotateRules(source, 'react.md');
	const rules = parseRules(annotated, 'react.md');
	assert.equal(rules.length, 5);
	assert.deepEqual(
		rules.map((rule) => rule.id),
		['REACT-001', 'REACT-002', 'REACT-003', 'REACT-004', 'REACT-005'],
	);
	assert.deepEqual(rules[0].section, ['React', 'Shape']);
	assert.equal(rules[0].text, 'Render semantic regions.\nContinued explanation.');
	assert.equal(rules[1].text, '- One responsibility.\n  Continued detail.');
	assert.ok(rules[3].text.endsWith('| R | Regions |'));
	assert.ok(rules[4].text.includes('<!-- rule: NOT-A-MARKER -->'));
	assert.equal(rules[0].line, 6);
	assert.equal(rules[0].endLine, 7);
	assert.equal(annotateRules(annotated, 'react.md'), annotated);
});

test('rejects uncovered rules, including an unnumbered item after a numbered item', () => {
	assert.throws(() => parseRules('# React\nRule without ID.\n', 'react'), /lacks a rule ID/);
	assert.throws(
		() => parseRules('<!-- rule: REACT-001 -->\n- Covered.\n- Not covered.\n', 'react'),
		/lacks a rule ID/,
	);
	assert.throws(() => parseRules('<!-- rule: REACT-001 -->\nCovered.\n\nUncovered.\n', 'react'), /lacks a rule ID/);
});

test('rejects duplicate, malformed, orphan, and empty IDs', () => {
	assert.throws(
		() => parseRules('<!-- rule: REACT-001 -->\nOne.\n\n<!-- rule: REACT-001 -->\nTwo.', 'react'),
		/duplicate rule ID/,
	);
	for (const invalid of [
		'<!-- rule: -->',
		'<!-- rule: react-001 -->',
		'<!--rule REACT-001-->',
		'text <!-- rule: REACT-001 -->',
	]) {
		assert.throws(() => parseRules(invalid, 'react'), /malformed rule annotation/);
	}
	assert.throws(() => parseRules('<!-- rule: REACT-001 -->\n', 'react'), /orphan\/empty/);
	assert.throws(() => parseRules('<!-- rule: REACT-001 -->\n# Heading\n', 'react'), /orphan\/empty/);
	assert.throws(
		() => parseRules('<!-- rule: REACT-001 -->\n<!-- rule: REACT-002 -->\nRule.', 'react'),
		/orphan\/empty/,
	);
});

test('fails closed on unclosed code fences, including annotator', () => {
	const source = '<!-- rule: REACT-001 -->\n```jsx\nconst x = 1;\n';
	assert.throws(() => parseRules(source, 'react'), /unclosed fenced example/);
	assert.throws(() => annotateRules(source, 'react'), /unclosed fenced example/);
});

test('preserves stable IDs on reorder, moves, and insertion, including named rule IDs', () => {
	const source =
		'<!-- rule: REACT-EVENT-001 -->\n- No inline event callbacks.\n<!-- rule: REACT-001 -->\n- Semantic render regions.\n- New rule.\n';
	const annotated = annotateRules(source, 'react.md');
	assert.deepEqual(
		parseRules(annotated, 'react.md').map((rule) => rule.id),
		['REACT-EVENT-001', 'REACT-001', 'REACT-002'],
	);
	const moved =
		'<!-- rule: REACT-001 -->\n- Semantic render regions.\n<!-- rule: REACT-EVENT-001 -->\n- No inline event callbacks.\n';
	assert.deepEqual(
		parseRules(annotateRules(moved, 'another.md'), 'another.md').map((rule) => rule.id),
		['REACT-001', 'REACT-EVENT-001'],
	);
});

test('preserves CRLF and original text except inserted annotations', () => {
	const source = '# React\r\n\r\n- Rule.\r\n  Continuation.\r\n';
	const annotated = annotateRules(source, 'react');
	assert.equal(annotated.replace(/<!-- rule: [^\r]+ -->\r\n/g, ''), source);
	assert.equal(annotateRules(annotated, 'react'), annotated);
});

test('covers nested list entries and unbordered tables without silently omitting content', () => {
	const source =
		'# Rules\n- Parent.\n  - Child.\n    Wrapped child text.\n\nRule | Meaning\n--- | ---\nR | Requirement\n';
	const rules = parseRules(annotateRules(source, 'react'), 'react');
	assert.equal(rules.length, 3);
	assert.equal(rules[1].text, '  - Child.\n    Wrapped child text.');
	assert.equal(rules[2].text, 'Rule | Meaning\n--- | ---\nR | Requirement');
});
