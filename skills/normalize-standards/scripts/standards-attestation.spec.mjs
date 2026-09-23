import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'standards-attestation.mjs');

function repository(t, marker) {
	const repo = mkdtempSync(path.join(tmpdir(), 'standards-marker-'));
	t.after(() => rmSync(repo, {recursive: true, force: true}));
	mkdirSync(path.join(repo, 'agents', 'topics', 'standards'), {recursive: true});
	writeFileSync(
		path.join(repo, 'agents', 'topics', 'standards', 'normalization.json'),
		`${JSON.stringify(marker)}\n`,
	);
	return repo;
}

test('legacy successful normalization remains valid after its historical inputs change or disappear', (t) => {
	const repo = repository(t, {
		schemaVersion: 1,
		status: 'normalized',
		manifest: 'agents/topics/standards/manifest.md',
		normalizedAt: '2026-01-01T00:00:00.000Z',
		repositoryStandardsFingerprint: 'sha256:historical',
		pendingDivergences: 0,
		deferredDivergences: 0,
		inputs: [{path: 'missing-now.md', sha256: 'historical'}],
	});
	const result = JSON.parse(execFileSync(process.execPath, [script, 'validate', '--repo', repo], {encoding: 'utf8'}));
	assert.equal(result.ok, true);
	assert.equal(result.everNormalized, true);
});

test('new durable marker requires explicit successful first normalization', (t) => {
	const repo = repository(t, {
		schemaVersion: 2,
		status: 'normalized',
		everNormalized: false,
		manifest: 'agents/topics/standards/manifest.md',
		normalizedAt: '2026-01-01T00:00:00.000Z',
		pendingDivergences: 0,
		deferredDivergences: 0,
	});
	const result = spawnSync(process.execPath, [script, 'validate', '--repo', repo], {encoding: 'utf8'});
	assert.equal(result.status, 2);
	assert.match(result.stdout, /everNormalized is not true/);
});


test('first attestation includes host instructions and excludes independent nested repositories', (t) => {
	const repo = repository(t, {});
	const standards = path.join(repo, 'agents', 'topics', 'standards');
	const manifest = [
		'# Folder Standards Manifest', '', '## Standards Sets', '', '### `base`', '',
		'Extends: none', 'Standards:', '- [documentation.md](documentation.md) - governance', '',
		'## Folder Assignments', '', '- `.` - `base` - host', '',
	].join('\n');
	writeFileSync(path.join(standards, 'manifest.md'), manifest);
	writeFileSync(path.join(standards, 'overlay.md'), '# Repository Standards Overlay\n\nNone.\n');
	writeFileSync(path.join(standards, 'documentation.md'), '# Documentation\n');
	writeFileSync(path.join(repo, 'AGENTS.md'), '# Host\n');
	mkdirSync(path.join(repo, '.git'));
	writeFileSync(path.join(repo, 'polylith.json'), '{}\n');
	mkdirSync(path.join(repo, 'src'));
	writeFileSync(path.join(repo, 'src', 'AGENTS.md'), '# Host subtree\n');
	for (const boundary of ['git-file', 'git-directory', 'polylith']) {
		const child = path.join(repo, 'deployed-apps', boundary);
		mkdirSync(child, {recursive: true});
		writeFileSync(path.join(child, 'AGENTS.md'), '# Independent child\n');
		if (boundary === 'git-directory') mkdirSync(path.join(child, '.git'));
		else writeFileSync(path.join(child, boundary === 'polylith' ? 'polylith.json' : '.git'), '{}\n');
	}
	const result = JSON.parse(execFileSync(process.execPath, [script, 'create', '--repo', repo], {encoding: 'utf8'}));
	assert.equal(result.ok, true);
	const paths = result.inputs.map(({path: inputPath}) => inputPath);
	assert.ok(paths.includes('AGENTS.md'));
	assert.ok(paths.includes('src/AGENTS.md'));
	assert.equal(paths.some((inputPath) => inputPath.startsWith('deployed-apps/')), false);
});
