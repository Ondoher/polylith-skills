import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {buildGuide} from './standards-guide.mjs';
import {publicationTarget, standardUrl} from './publication-links.mjs';

const governance = (remote = 'git@github.com:example/standards.git', branch = 'main') => ({
	schemaVersion: 1,
	repository: {canonicalRemote: remote, defaultBranch: branch},
	install: {documentationDirectory: 'documentation'},
});

test('guide publishes GitHub links while hashing local standards and preserving normalization', async (t) => {
	const root = mkdtempSync(path.join(tmpdir(), 'standards-guide-'));
	t.after(() => rmSync(root, {recursive: true, force: true}));
	const repo = path.join(root, 'repo');
	const codex = path.join(root, 'codex');
	const standardsDirectory = path.join(repo, 'agents', 'topics', 'standards');
	const canonicalDirectory = path.join(codex, 'documentation', 'standards');
	mkdirSync(standardsDirectory, {recursive: true});
	mkdirSync(canonicalDirectory, {recursive: true});
	const metadata = path.join(codex, 'governance.json');
	writeFileSync(metadata, JSON.stringify(governance()));
	const canonical = path.join(canonicalDirectory, 'documentation.md');
	writeFileSync(canonical, '# Documentation\n\n## Rule\n\nCanonical rule.\n');
	const link = path.relative(standardsDirectory, canonical).replaceAll('\\', '/');
	writeFileSync(
		path.join(standardsDirectory, 'manifest.md'),
		`# Folder Standards Manifest\n\n## Standards Sets\n\n### \`base\`\n\nExtends: none\nStandards:\n\n- [documentation.md](${link}) — Governance applies.\n\n## Folder Assignments\n\n- \`.\` — \`base\` — All files.\n`,
	);
	const overlayFile = path.join(standardsDirectory, 'overlay.md');
	writeFileSync(overlayFile, '# Repository Standards Overlay\n\nNone.\n');
	const marker = `${JSON.stringify({
		schemaVersion: 2,
		status: 'normalized',
		everNormalized: true,
		manifest: 'agents/topics/standards/manifest.md',
		normalizedAt: '2026-01-01T00:00:00.000Z',
		pendingDivergences: 0,
		deferredDivergences: 0,
	})}\n`;
	const markerFile = path.join(standardsDirectory, 'normalization.json');
	writeFileSync(markerFile, marker);
	const run = async () => {
		const result = await buildGuide({repo, codex_root: codex});
		writeFileSync(result.output, result.content);
		return result;
	};
	const first = await run();
	const firstGuide = readFileSync(path.join(repo, 'STANDARDS.md'), 'utf8');
	assert.equal((firstGuide.match(/https:\/\/github.com\/example\/standards\/blob\/main\/documentation\/standards\/documentation.md/g) ?? []).length, 2);
	assert.ok(firstGuide.includes('(./agents/topics/standards/manifest.md)'));
	assert.ok(!firstGuide.includes('../codex'));
	assert.ok(!firstGuide.includes(codex));
	assert.equal((await buildGuide({repo, codex_root: codex})).content, firstGuide);
	assert.match(firstGuide, /Do not modify this file directly/);
	assert.match(
		firstGuide,
		/Use \$write-standards-guide to update this repository's generated STANDARDS\.md now\./,
	);
	writeFileSync(overlayFile, '# Repository Standards Overlay\n\nNone.\n\n');
	const local = await run();
	assert.notEqual(local.localOverlayFingerprint, first.localOverlayFingerprint);
	writeFileSync(canonical, '# Documentation\n\n## Rule\n\nRevised canonical rule.\n');
	const canonicalChange = await run();
	assert.notEqual(canonicalChange.canonicalFingerprint, local.canonicalFingerprint);
	assert.notEqual(readFileSync(path.join(repo, 'STANDARDS.md'), 'utf8'), firstGuide);
	assert.equal(readFileSync(markerFile, 'utf8'), marker);
	writeFileSync(overlayFile, '# Repository Standards Overlay\n\n## ADD: Local evidence\n\nExtends: documentation.md#Rule\nScope: repository\nRule: Record evidence.\nReason: Local audit needs.\n');
	const overlayChange = await run();
	assert.ok(overlayChange.content.includes('https://github.com/example/standards/blob/main/documentation/standards/documentation.md#rule'));
	writeFileSync(metadata, JSON.stringify(governance('https://github.com/example/standards.git', 'release/docs')));
	const moved = await run();
	assert.notEqual(moved.sourceFingerprint, overlayChange.sourceFingerprint);
	assert.equal(moved.repositoryConfigurationFingerprint, overlayChange.repositoryConfigurationFingerprint);
	assert.equal(moved.canonicalFingerprint, canonicalChange.canonicalFingerprint);
	assert.ok(moved.content.includes('/blob/release%2Fdocs/'));
	writeFileSync(metadata, JSON.stringify(governance('https://github.com/another/policy', 'release/docs')));
	const relocated = await run();
	assert.notEqual(relocated.sourceFingerprint, moved.sourceFingerprint);
	assert.equal(relocated.repositoryConfigurationFingerprint, moved.repositoryConfigurationFingerprint);
	assert.equal(relocated.canonicalFingerprint, moved.canonicalFingerprint);
	assert.ok(relocated.content.includes('https://github.com/another/policy/blob/'));
	const originalManifest = readFileSync(path.join(standardsDirectory, 'manifest.md'), 'utf8');
	writeFileSync(path.join(standardsDirectory, 'manifest.md'), originalManifest.replace(link, 'https://github.com/example/standards/blob/main/documentation/standards/documentation.md'));
	await assert.rejects(buildGuide({repo, codex_root: codex}), /local canonical link/);
	assert.equal(readFileSync(path.join(repo, 'STANDARDS.md'), 'utf8'), relocated.content);
});

test('publication follows linked documentation to its owning checkout and supports GitHub remote forms', async (t) => {
	const root = mkdtempSync(path.join(tmpdir(), 'publication-links-'));
	t.after(() => rmSync(root, {recursive: true, force: true}));
	const checkout = path.join(root, 'checkout');
	const canonical = path.join(checkout, 'documentation', 'standards');
	const codex = path.join(root, 'codex');
	mkdirSync(canonical, {recursive: true});
	mkdirSync(codex);
	symlinkSync(path.join(checkout, 'documentation'), path.join(codex, 'documentation'), process.platform === 'win32' ? 'junction' : 'dir');
	// A Codex-home manifest must not override the physical source's authority.
	writeFileSync(path.join(codex, 'governance.json'), JSON.stringify(governance('https://github.com/wrong/repo')));
	const {realpath} = await import('node:fs/promises');
	const physical = await realpath(path.join(codex, 'documentation', 'standards'));
	for (const remote of ['git@github.com:example/standards.git', 'https://github.com/example/standards', 'ssh://git@github.com/example/standards.git']) {
		writeFileSync(path.join(checkout, 'governance.json'), JSON.stringify(governance(remote)));
		const target = await publicationTarget(physical);
		assert.equal(standardUrl(target, 'testing.md', 'Durable Test Principles'), 'https://github.com/example/standards/blob/main/documentation/standards/testing.md#durable-test-principles');
	}
});

test('publication rejects missing or invalid authority instead of emitting local or arbitrary remote links', async (t) => {
	const root = mkdtempSync(path.join(tmpdir(), 'publication-invalid-'));
	t.after(() => rmSync(root, {recursive: true, force: true}));
	const canonical = path.join(root, 'documentation', 'standards');
	mkdirSync(canonical, {recursive: true});
	await assert.rejects(publicationTarget(canonical), /Cannot find governance.json/);
	for (const remote of ['https://other.example/example/standards', 'https://github.com/example/standards?token=secret', 'https://user:secret@github.com/example/standards', 'git@github.com:example/../other']) {
		writeFileSync(path.join(root, 'governance.json'), JSON.stringify(governance(remote)));
		await assert.rejects(publicationTarget(canonical), /GitHub canonicalRemote/);
	}
	for (const branch of ['', '../main', 'main.lock', 'main\nother', 'main//other']) {
		writeFileSync(path.join(root, 'governance.json'), JSON.stringify(governance(undefined, branch)));
		await assert.rejects(publicationTarget(canonical), /defaultBranch/);
	}
	const escaped = governance();
	escaped.install.documentationDirectory = '../documentation';
	writeFileSync(path.join(root, 'governance.json'), JSON.stringify(escaped));
	await assert.rejects(publicationTarget(canonical), /repository-relative/);
});
