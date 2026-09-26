import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, realpathSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('./review-context-fingerprint.mjs', import.meta.url));

function fixture(t, linked = true) {
	const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'review-fingerprint-')));
	t.after(() => rmSync(root, {recursive: true, force: true}));
	const repo = path.join(root, 'repo');
	const codex = path.join(root, 'codex');
	const documentation = linked ? path.join(root, 'governance', 'documentation') : path.join(codex, 'documentation');
	for (const directory of [repo, codex, path.join(documentation, 'standards')])
		mkdirSync(directory, {recursive: true});
	if (linked)
		symlinkSync(
			documentation,
			path.join(codex, 'documentation'),
			process.platform === 'win32' ? 'junction' : 'dir',
		);
	writeFileSync(path.join(repo, 'AGENTS.md'), 'Repository instructions');
	writeFileSync(path.join(documentation, 'standards', 'architecture.md'), 'Canonical rules');
	const run = (...inputs) => {
		const result = spawnSync(
			process.execPath,
			[script, '--lane', 'architecture-reviewer', '--repo', repo, '--codex-root', codex, ...inputs],
			{encoding: 'utf8'},
		);
		assert.ifError(result.error);
		return {status: result.status, ...JSON.parse(result.stdout)};
	};
	return {repo, codex, documentation, run};
}

for (const linked of [false, true]) {
	test(`fingerprints ${linked ? 'linked' : 'local'} documentation and detects changed canonical bytes`, (t) => {
		const {documentation, run} = fixture(t, linked);
		const inputs = ['--repo-input', 'AGENTS.md', '--codex-input', 'documentation/standards/architecture.md'];
		const first = run(...inputs);
		assert.equal(first.status, 0);
		assert.equal(first.ok, true);
		assert.equal(first.inputs[0].path, 'documentation/standards/architecture.md');
		assert.equal(run(...inputs).fingerprint, first.fingerprint);
		writeFileSync(path.join(documentation, 'standards', 'architecture.md'), 'Changed rules');
		assert.notEqual(run(...inputs).fingerprint, first.fingerprint);
	});
}

test('linked documentation does not permit traversal, nested escapes, or other root escapes', (t) => {
	const {repo, codex, documentation, run} = fixture(t);
	writeFileSync(path.join(path.dirname(documentation), 'outside.md'), 'Outside authority');
	for (const parent of [repo, codex, documentation]) {
		symlinkSync(
			path.dirname(documentation),
			path.join(parent, 'escape'),
			process.platform === 'win32' ? 'junction' : 'dir',
		);
	}
	for (const inputs of [
		['--codex-input', 'documentation/../AGENTS.md'],
		['--codex-input', 'documentation/escape/outside.md'],
		['--codex-input', 'escape/outside.md'],
		['--repo-input', 'escape/outside.md'],
	]) {
		const result = run(...inputs);
		assert.equal(result.status, 2);
		assert.equal(result.ok, false);
	}
});
