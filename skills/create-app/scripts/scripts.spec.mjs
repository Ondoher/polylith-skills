import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {applyApp} from './apply-app.mjs';
import {inspectRepository} from './inspect-repository.mjs';
import {normalizeApplicationOptions} from './normalize-application-options.mjs';
import {validateApp} from './validate-app.mjs';

const STANDARD_NAMES = [
	'documentation.md',
	'project-foundation.md',
	'architecture.md',
	'code-conventions.md',
	'types.md',
	'jsdoc.md',
	'polylith.md',
	'react.md',
	'server.md',
	'testing.md',
];

test('normalizes independent application identity, posture, mounts, and implied testing', () => {
	const options = normalizeApplicationOptions({
		appName: 'Reports Console',
		appSlug: 'reports',
		repositoryPosture: 'discoverable',
		mui: true,
		baseComponents: true,
	});
	assert.equal(options.appName, 'Reports Console');
	assert.equal(options.appSlug, 'reports');
	assert.equal(options.standaloneMount, '/');
	assert.equal(options.composedMount, '/reports');
	assert.equal(options.mount, '/reports');
	assert.equal(options.testing.enabled, true);
});

test('repository inspection enforces normalization, formatting, and Polylith startup eligibility', (context) => {
	const target = fixture();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	assert.equal(inspectRepository(target).ok, true);
	const manifest = JSON.parse(readFileSync(path.join(target, 'package.json'), 'utf8'));
	delete manifest.scripts['format:check'];
	writeFileSync(path.join(target, 'package.json'), `${JSON.stringify(manifest)}\n`);
	assert.match(inspectRepository(target).errors.join('\n'), /format:check/);
	manifest.scripts['format:check'] = 'prettier --check .';
	manifest.dependencies['@polylith/core'] = '1.2.1';
	writeFileSync(path.join(target, 'package.json'), `${JSON.stringify(manifest)}\n`);
	assert.match(inspectRepository(target).errors.join('\n'), /@polylith\/core 1\.2\.1/);
});

test('repository inspection accepts legacy evidence that standards were normalized', (context) => {
	const target = fixture();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	writeFileSync(
		path.join(target, 'agents/topics/standards/normalization.json'),
		`${JSON.stringify({schemaVersion: 1, status: 'normalized'})}\n`,
	);
	assert.equal(inspectRepository(target).ok, true);
});

test('dry-run and apply add one app without rebuilding repository infrastructure', (context) => {
	const target = fixture();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	const options = normalizeApplicationOptions({
		appName: 'Reports Console',
		appSlug: 'reports',
		repositoryPosture: 'hosting',
		mount: '/reports',
		accessibility: true,
		server: {enabled: true},
		testing: true,
	});
	const dryRun = applyApp(target, options, {dryRun: true});
	assert.ok(dryRun.create.includes(path.normalize('src/reports/index.js')));
	assert.ok(dryRun.create.includes(path.normalize('server/reports/index.js')));
	assert.ok(dryRun.create.includes(path.normalize('karma.reports.conf.cjs')));
	assert.deepEqual(
		dryRun.update.sort(),
		[
			'agents/topics/README.md',
			'agents/topics/standards/manifest.md',
			'agents/topics/standards/reconciliation.md',
			'package.json',
			'polylith.json',
		]
			.map(path.normalize)
			.sort(),
	);
	assert.equal(readConfig(target).apps.length, 1);

	let formattedPaths;
	applyApp(target, options, {
		runFormatter: (_target, _executable, filenames) => {
			formattedPaths = filenames;
		},
	});
	assert.deepEqual([...formattedPaths].sort(), [...dryRun.create, ...dryRun.update].sort());
	assert.ok(!formattedPaths.includes('.'));
	const config = readConfig(target);
	assert.equal(config.port, 8080);
	assert.deepEqual(config.discover, ['deployed-apps']);
	assert.equal(config.apps.length, 2);
	assert.equal(config.multiple, false);
	assert.equal(config.apps[1].mount, '/reports');
	assert.equal(config.deployment.setup, 'server/setup-deployment.js');
	assert.match(
		readFileSync(path.join(target, 'agents/topics/standards/manifest.md'), 'utf8'),
		/\[accessibility\.md\]\(\.\.\//,
	);
	assert.match(
		readFileSync(path.join(target, 'agents/topics/standards/reconciliation.md'), 'utf8'),
		/`reports` application folders/,
	);
	const packageJson = JSON.parse(readFileSync(path.join(target, 'package.json'), 'utf8'));
	assert.equal(packageJson.dependencies.react, '^19.0.0');
	assert.equal(packageJson.scripts['test:reports'], 'npm run test:ui:reports && npm run test:server:reports');
	assert.match(packageJson.scripts['test:ui:reports'], /karma\.reports\.conf\.cjs/);
	assert.equal(packageJson.scripts.test, 'npm run test:reports');
	assert.match(readFileSync(path.join(target, 'karma.reports.conf.cjs'), 'utf8'), /tests\/reports\/\*\*\/\*\.js/);
	assert.match(readFileSync(path.join(target, 'server', 'reports', 'index.js'), 'utf8'), /sharedRegistry/);
	execFileSync(process.execPath, ['--check', path.join(target, 'server', 'setup-deployment.js')]);
	execFileSync(process.execPath, ['--check', path.join(target, 'server', 'reports', 'index.js')]);
	assert.equal(validateApp(target, options).ok, true);
});

test('planning rejects duplicate application names and route mounts', (context) => {
	const target = fixture();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	const base = {appName: 'Conflict', repositoryPosture: 'hosting'};
	assert.throws(
		() =>
			applyApp(
				target,
				normalizeApplicationOptions({
					...base,
					appSlug: 'home',
					mount: '/other',
				}),
				{dryRun: true},
			),
		/application already exists/,
	);
	assert.throws(
		() => applyApp(target, normalizeApplicationOptions({...base, appSlug: 'other', mount: '/'}), {dryRun: true}),
		/already claimed/,
	);
});

function fixture() {
	const target = mkdtempSync(path.join(os.tmpdir(), 'create-app-'));
	for (const directory of ['agents/topics/standards', 'agents/topics', 'src/home', 'builds', 'node_modules/.bin'])
		mkdirSync(path.join(target, directory), {recursive: true});
	writeFileSync(
		path.join(target, 'node_modules/.bin', process.platform === 'win32' ? 'prettier.cmd' : 'prettier'),
		'',
	);
	writeFileSync(path.join(target, 'AGENTS.md'), '# Agents\n');
	writeFileSync(path.join(target, 'agents/topics/README.md'), '# Topics\n');
	writeFileSync(path.join(target, 'agents/topics/standards/overlay.md'), '# Overlay\n\nNone.\n');
	writeFileSync(
		path.join(target, 'agents/topics/standards/reconciliation.md'),
		'# Standards Reconciliation\n\nStatus: normalized\n',
	);
	writeFileSync(
		path.join(target, 'agents/topics/standards/normalization.json'),
		`${JSON.stringify({schemaVersion: 2, status: 'normalized', everNormalized: true})}\n`,
	);
	writeFileSync(
		path.join(target, 'agents/topics/standards/manifest.md'),
		`# Folder Standards Manifest\n\n## Standards Sets\n\n### \`base\`\n\nExtends: none\nStandards:\n\n${STANDARD_NAMES.map((name) => `- [${name}](C:/standards/${name}) - Canonical.`).join('\n')}\n\n## Folder Assignments\n\n- \`.\` - \`base\` - Repository root.\n`,
	);
	writeFileSync(
		path.join(target, 'polylith.json'),
		`${JSON.stringify({multiple: false, builds: 'builds', dest: 'dist', src: 'src', react: true, port: 8080, discover: ['deployed-apps'], apps: [{name: 'home', filename: 'home.json', default: true, mount: '/'}]}, null, '\t')}\n`,
	);
	writeFileSync(
		path.join(target, 'package.json'),
		`${JSON.stringify({name: 'host-project', description: 'Host Project', type: 'module', scripts: {'format:check': 'prettier --check .'}, dependencies: {polylith: '1.3.0', react: '^19.0.0'}, devDependencies: {prettier: '^3.0.0'}}, null, '\t')}\n`,
	);
	writeFileSync(path.join(target, 'src/home/index.js'), 'export {};\n');
	writeFileSync(path.join(target, 'builds/home.json'), '{}\n');
	return target;
}

function readConfig(target) {
	return JSON.parse(readFileSync(path.join(target, 'polylith.json'), 'utf8'));
}
