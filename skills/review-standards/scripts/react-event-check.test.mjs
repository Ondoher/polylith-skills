import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import test from 'node:test';
import {checkSource, RULE_ID, runCli} from './react-event-check.mjs';

// Run from a repository with @babel/parser installed, or set REVIEW_TEST_REPO.
const repo = resolve(process.env.REVIEW_TEST_REPO || process.cwd());
const parser = createRequire(resolve(repo, 'package.json'))('@babel/parser');

function inspect(expression) {
	const result = checkSource(expression, 'Example.jsx', parser);
	assert.deepEqual(result.errors, []);
	return result.findings;
}

test('rejects inline JSX event arrows and function expressions with evidence', () => {
	for (const handler of ['() => act()', 'function () { act(); }', 'async () => act()']) {
		const findings = inspect(`<Button onClick={${handler}} />`);
		assert.equal(findings.length, 1);
		assert.equal(findings[0].ruleId, RULE_ID);
		assert.equal(findings[0].event, 'onClick');
		assert.equal(findings[0].file, 'Example.jsx');
		assert.equal(findings[0].line, 1);
		assert.ok(findings[0].column > 1);
	}
});

test('rejects bind calls and callbacks inside conditional or logical expressions', () => {
	for (const handler of [
		'this.handle.bind(this)',
		"this.handle['bind'](this)",
		'ready ? this.handle : () => act()',
		'ready && function () { act(); }',
		'this.handle ?? this.other.bind(this)',
		'wrap(() => act())',
	]) {
		assert.equal(inspect(`<Button onClick={${handler}} />`).length, 1);
	}
});

test('rejects nested slot/input props and object literal JSX spreads', () => {
	for (const jsx of [
		'<Input inputProps={{ onChange: () => act() }} />',
		'<Input slotProps={{ input: { onKeyDown: function () { act(); } } }} />',
		'<Input {...{ onFocus: this.handle.bind(this) }} />',
		'<Input {...(ready ? { onBlur: () => act() } : props)} />',
		'<Input inputProps={{ ["onChange"]: () => act() }} />',
		'<Input inputProps={{ onChange() { act(); } }} />',
		'<Input slotProps={{ input: owner => ({ onChange: () => act(owner) }) }} />',
	])
		assert.equal(inspect(jsx).length, 1, jsx);
});

test('allows named handlers, constructor-bound methods, and non-event render callbacks', () => {
	const source = `
    class Form extends React.Component {
      constructor(props) { super(props); this.handle = this.handle.bind(this); }
      handle = () => act();
      render() {
        return <Input onChange={this.handle} onBlur={ready ? this.handle : alternate}
          renderItem={item => <span>{item}</span>}
          slotProps={{ input: owner => ({ disabled: owner.disabled, onChange: this.handle }) }}
          inputProps={{ onFocus: named }} {...{ onKeyDown: named }}>
            {items.map(item => <span key={item.id}>{item.name}</span>)}
        </Input>;
      }
    }
  `;
	assert.equal(inspect(source).length, 0);
});

test('reports nested JSX event callback only once', () => {
	assert.equal(inspect('<Input renderItem={() => <Button onClick={() => act()} />} />').length, 1);
	assert.equal(inspect('<Button onClick={() => items.map(item => act(item))} />').length, 1);
});

test('parse failure makes review incomplete instead of silently passing', () => {
	const result = checkSource('<Button onClick={', 'Broken.jsx', parser);
	assert.equal(result.findings.length, 0);
	assert.equal(result.errors[0].code, 'parse-error');
});

test('unavailable parser is an explicit error', () => {
	const result = checkSource('<Button />', 'Example.jsx', null);
	assert.equal(result.errors[0].code, 'parser-unavailable');
});

test('CLI rejects missing arguments and out-of-repository paths', () => {
	assert.equal(runCli([]).status, 'incomplete');
	const result = runCli(['--repo', repo, '--path', '../outside.jsx']);
	assert.equal(result.errors[0].code, 'invalid-path');
	assert.equal(result.status, 'incomplete');
});
