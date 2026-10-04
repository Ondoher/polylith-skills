import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {TopicPaths} from './TopicPaths.mjs';

function repository(t, instructions = '# Agents\n') {
	const root = mkdtempSync(path.join(tmpdir(), 'topic-location-'));
	t.after(() => rmSync(root, {recursive: true, force: true}));
	writeFileSync(path.join(root, 'AGENTS.md'), instructions);
	return root;
}

test('topic paths default to .agents/topics and respect only a standalone root directive', (t) => {
	const root = repository(t, '# Agents\n\n```text\nTopics folder: examples/topics\n```\n');
	mkdirSync(path.join(root, '.agents'), {recursive: true});
	writeFileSync(path.join(root, '.agents/AGENTS.md'), 'Topics folder: nested/topics\n');
	assert.equal(TopicPaths.directory(root), '.agents/topics');
	writeFileSync(path.join(root, 'AGENTS.md'), '# Agents\n\nTopics folder: docs/team topics\n');
	assert.equal(TopicPaths.directory(root), 'docs/team topics');
});

test('topic directives reject ambiguous and escaping paths', () => {
	for (const value of [
		'',
		'/outside',
		'C:/outside',
		'../outside',
		'docs/../topics',
		'docs\\topics',
		'docs//topics',
		'./topics',
		'docs/topics/',
		'docs./topics',
	])
		assert.throws(() => TopicPaths.fromInstructions(`Topics folder: ${value}\n`), /repository-relative/);
	assert.throws(() => TopicPaths.fromInstructions('Topics folder: first\nTopics folder: second\n'), /multiple/);
});

test('bootstrap inspect is read-only and recording a legacy folder is idempotent', (t) => {
	const original = '# Agents\r\n\r\nBootstrap profile: instructions-only\r\n';
	const root = repository(t, original);
	mkdirSync(path.join(root, 'agents/topics'), {recursive: true});
	writeFileSync(path.join(root, 'agents/topics/active-topic.md'), '# Existing work\n');
	assert.equal(TopicPaths.directory(root), '.agents/topics');
	assert.equal(TopicPaths.bootstrap(root), 'agents/topics');
	assert.equal(readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), original);
	assert.equal(TopicPaths.bootstrap(root, true), 'agents/topics');
	const recorded = readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
	assert.equal(recorded, `${original}\r\nTopics folder: agents/topics\r\n`);
	assert.equal(TopicPaths.directory(root), 'agents/topics');
	TopicPaths.bootstrap(root, true);
	assert.equal(readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), recorded);
	assert.equal(readFileSync(path.join(root, 'agents/topics/active-topic.md'), 'utf8'), '# Existing work\n');
	assert.equal(existsSync(path.join(root, '.agents/topics')), false);
});

test('bootstrap honors explicit missing folders and prefers the default when both trees exist', (t) => {
	const root = repository(t);
	for (const folder of ['agents/topics', '.agents/topics']) mkdirSync(path.join(root, folder), {recursive: true});
	assert.equal(TopicPaths.bootstrap(root, true), '.agents/topics');
	assert.equal(readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), '# Agents\n');
	writeFileSync(path.join(root, 'AGENTS.md'), 'Topics folder: docs/owned-topics\n');
	assert.equal(TopicPaths.bootstrap(root, true), 'docs/owned-topics');
	assert.equal(existsSync(path.join(root, 'docs/owned-topics')), false);
});

test('bootstrap with no topic tree performs no mutation and requires root instructions', (t) => {
	const root = repository(t);
	assert.equal(TopicPaths.bootstrap(root, true), '.agents/topics');
	assert.equal(readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), '# Agents\n');
	rmSync(path.join(root, 'AGENTS.md'));
	assert.throws(() => TopicPaths.bootstrap(root, true), /ENOENT/);
});

test('configured and inferred topic folders cannot follow links outside their repository', (t) => {
	const root = repository(t, 'Topics folder: linked/topics\n');
	const outside = repository(t);
	mkdirSync(path.join(outside, 'topics'));
	symlinkSync(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
	assert.throws(() => TopicPaths.directory(root), /inside the repository/);
	writeFileSync(path.join(root, 'AGENTS.md'), '# Agents\n');
	symlinkSync(outside, path.join(root, 'agents'), process.platform === 'win32' ? 'junction' : 'dir');
	assert.throws(() => TopicPaths.bootstrap(root, true), /inside the repository/);
	assert.equal(readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), '# Agents\n');
});

test('bootstrap CLI exposes inspection and records the discovered exception', (t) => {
	const root = repository(t);
	mkdirSync(path.join(root, 'agents/topics'), {recursive: true});
	const script = new URL('../../bootstrap/scripts/topics-directory.mjs', import.meta.url);
	for (const mode of ['inspect', 'record']) {
		const result = JSON.parse(
			execFileSync(process.execPath, [fileURLToPath(script), mode, '--repo', root], {encoding: 'utf8'}),
		);
		assert.equal(result.topics, 'agents/topics');
		assert.equal(result.ok, true);
		assert.equal(TopicPaths.directory(root), mode === 'inspect' ? '.agents/topics' : 'agents/topics');
	}
});
