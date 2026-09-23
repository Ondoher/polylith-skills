import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {normalizeOptions} from './normalize-options.mjs';
import {inspectTarget} from './preflight.mjs';
import {applyScaffold, makeChildEnvironment, makeCommandInvocation} from './apply-scaffold.mjs';
import {createScaffoldPlan} from './scaffold-plan.mjs';
import {validateProject} from './validate-project.mjs';
import {validateSkill} from './validate-skill.mjs';

function temporaryDirectory() {
	return mkdtempSync(path.join(os.tmpdir(), 'initialize-project-'));
}

test('preflight accepts empty, GitHub-initialized, and single-workspace folders', (context) => {
	const target = temporaryDirectory();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	mkdirSync(path.join(target, '.git'));
	writeFileSync(path.join(target, 'README.md'), '# Project\n');
	writeFileSync(path.join(target, 'LICENSE'), 'license\n');
	writeFileSync(path.join(target, '.gitignore'), 'node_modules\n');
	writeFileSync(path.join(target, 'project.code-workspace'), '{}\n');

	const report = inspectTarget(target);

	assert.equal(report.ok, true);
	assert.deepEqual(Object.keys(report.protectedFiles).sort(), ['.gitignore', 'LICENSE', 'README.md']);
});

test('preflight rejects multiple workspace files', (context) => {
	const target = temporaryDirectory();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	writeFileSync(path.join(target, 'first.code-workspace'), '{}\n');
	writeFileSync(path.join(target, 'second.code-workspace'), '{}\n');

	const report = inspectTarget(target);

	assert.equal(report.ok, false);
	assert.equal(report.conflicts.length, 2);
	assert.deepEqual(report.protectedFiles, {});
});

test('preflight rejects any other entry', (context) => {
	const target = temporaryDirectory();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	writeFileSync(path.join(target, 'package.json'), '{}\n');

	const report = inspectTarget(target);

	assert.equal(report.ok, false);
	assert.equal(report.conflicts.length, 1);
});

test('normalizes a non-Polylith project to the headless branch', () => {
	const result = normalizeOptions({
		projectName: 'Scratch Tool',
		slug: 'scratch-tool',
		polylith: false,
		dataPersistence: true,
		prettier: true,
		testing: true,
		coverage: true,
		mui: true,
		localHttps: true,
	});

	assert.deepEqual(result, {
		projectName: 'Scratch Tool',
		projectSlug: 'scratch-tool',
		slug: 'scratch-tool',
		polylith: false,
		dataPersistence: true,
		prettier: true,
		testing: {enabled: true, coverage: true},
	});
});

test('normalizes the full supported Polylith branch and forces component testing', () => {
	const result = normalizeOptions({
		projectName: 'Review Console',
		slug: 'review-console',
		polylith: true,
		dataPersistence: true,
		localHttps: true,
		mui: true,
		shell: {
			type: 'top-tabs',
			initialPage: true,
			initialPageName: 'Asset Review',
		},
		accessibility: true,
		localization: true,
		baseComponents: true,
		server: {
			enabled: true,
			defaultAppRouting: true,
			localizedMarkdown: true,
			socketIo: true,
		},
		prettier: true,
		testing: false,
		coverage: true,
	});

	assert.equal(result.mount, '/');
	assert.equal(result.dataPersistence, true);
	assert.equal(result.deploymentMount, '/review-console');
	assert.deepEqual(result.localHttps, {
		enabled: true,
		hostname: 'localhost',
		port: 8443,
		validDays: 365,
	});
	assert.equal(result.shell.initialPageSlug, 'asset-review');
	assert.equal(result.testing.enabled, true);
	assert.equal(result.testing.coverage, true);
	assert.equal(result.implied.length, 1);
});

test('keeps project and initial application identity separate and records hosting posture', () => {
	const options = normalizeOptions({
		projectName: 'Household Tools',
		projectSlug: 'household-tools',
		appName: 'Chore Console',
		appSlug: 'chores',
		repositoryPosture: 'hosting',
		polylith: true,
		prettier: true,
	});
	const plan = createScaffoldPlan(options, {
		nodeVersion: '24.0.0',
		npmVersion: '11.0.0',
	});
	assert.equal(options.projectSlug, 'household-tools');
	assert.equal(options.appSlug, 'chores');
	assert.equal(JSON.parse(plan.files.get(path.normalize('package.json'))).name, 'household-tools');
	const config = JSON.parse(plan.files.get(path.normalize('polylith.json')));
	assert.equal(config.apps[0].name, 'chores');
	assert.equal(config.apps[0].mount, '/');
	assert.deepEqual(config.discover, ['deployed-apps']);
	assert.match(plan.files.get(path.normalize('agents/topics/chores/README.md')), /# Chore Console/);
});

test('rejects invalid conditional combinations', () => {
	assert.throws(
		() =>
			normalizeOptions({
				projectName: 'Invalid',
				slug: 'invalid',
				polylith: true,
				mui: false,
				shell: {type: 'left-nav'},
			}),
		/requires MUI/,
	);

	assert.throws(
		() =>
			normalizeOptions({
				projectName: 'Invalid',
				slug: 'invalid',
				polylith: true,
				server: {enabled: false, socketIo: true},
			}),
		/requires a basic server/,
	);
});

test('validates a representative non-Polylith fixture', (context) => {
	const target = temporaryDirectory();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	const options = normalizeOptions({
		projectName: 'Scratch Tool',
		slug: 'scratch-tool',
		polylith: false,
		testing: true,
		coverage: true,
	});
	applyScaffold(target, options, {
		versions: {nodeVersion: '25.4.0', npmVersion: '11.0.0'},
		skipInstall: true,
	});

	const report = validateProject(target, options);

	assert.equal(report.ok, true, report.errors.join('\n'));
	assert.equal(existsSync(path.join(target, 'src', 'testing.spec.js')), true);
	const manifest = JSON.parse(readFileSync(path.join(target, 'package.json'), 'utf8'));
	assert.match(manifest.scripts.coverage, /--reports-dir=coverage\/src/);
	assert.match(manifest.scripts.coverage, /--reporter=json-summary/);
});

test('rejects placeholder infrastructure topics while allowing the undefined app topic', (context) => {
	const target = temporaryDirectory();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	const options = normalizeOptions({
		projectName: 'Topic Guard',
		slug: 'topic-guard',
		polylith: false,
	});
	applyScaffold(target, options, {
		versions: {nodeVersion: '25.4.0', npmVersion: '11.0.0'},
		skipInstall: true,
	});
	writeFileSync(
		path.join(target, 'agents', 'topics', 'architecture', 'README.md'),
		'# Architecture\n\nOwns architecture.\n',
	);
	const report = validateProject(target, options);
	assert.equal(report.ok, false);
	assert.ok(report.errors.includes('agents/topics/architecture/README.md: local topic is incomplete'));
	assert.doesNotMatch(report.errors.join('\n'), /topic-guard.*incomplete/);
});

test('rejects a drifting standards manifest and copied standard topic', (context) => {
	const target = temporaryDirectory();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	const options = normalizeOptions({
		projectName: 'Standards Guard',
		slug: 'standards-guard',
		polylith: false,
	});
	applyScaffold(target, options, {
		versions: {nodeVersion: '25.4.0', npmVersion: '11.0.0'},
		skipInstall: true,
	});
	const manifestPath = path.join(target, 'agents', 'topics', 'standards', 'manifest.md');
	writeFileSync(manifestPath, readFileSync(manifestPath, 'utf8').replace(/^- \[types\.md\].*\r?\n/m, ''));
	mkdirSync(path.join(target, 'agents', 'topics', 'jsdoc'), {
		recursive: true,
	});
	writeFileSync(
		path.join(target, 'agents', 'topics', 'jsdoc', 'README.md'),
		'# Copied JSDoc\n\n## Rules\n\nThis should remain global.\n',
	);
	const report = validateProject(target, options);
	assert.equal(report.ok, false);
	assert.match(report.errors.join('\n'), /applicable standards mismatch/);
	assert.match(report.errors.join('\n'), /canonical standard must not be copied/);
});

test('normalizes an app-directed shell without a loaded page or URL service', () => {
	const result = normalizeOptions({
		projectName: 'Workflow Tool',
		slug: 'workflow-tool',
		polylith: true,
		mui: false,
		shell: {type: 'app-directed', initialPage: false},
		server: {enabled: true, defaultAppRouting: false},
	});

	assert.equal(result.shell.enabled, true);
	assert.equal(result.shell.initialPage, false);
	assert.equal(result.server.defaultAppRouting, false);
});

test('plans app-directed shells without navigation-only runtime methods', () => {
	const options = normalizeOptions({
		projectName: 'Workflow Tool',
		slug: 'workflow-tool',
		polylith: true,
		mui: false,
		shell: {type: 'app-directed', initialPage: false},
		testing: true,
		coverage: true,
	});
	const plan = createScaffoldPlan(options, {
		nodeVersion: '25.4.0',
		npmVersion: '11.0.0',
	});
	const shell = plan.files.get(path.normalize('src/workflow-tool/features/app/components/AppShell.jsx'));
	assert.doesNotMatch(shell, /getLabel\(/);
	assert.doesNotMatch(shell, /requestPage\(/);
	assert.doesNotMatch(shell, /desktopNavigationOpen|mobileDrawerOpen/);
});

test('rejects Markdown without localization', () => {
	assert.throws(
		() =>
			normalizeOptions({
				projectName: 'Invalid Markdown',
				slug: 'invalid-markdown',
				polylith: true,
				localization: false,
				server: {enabled: true, localizedMarkdown: true},
			}),
		/requires a basic server and localization/,
	);
});

test('plans a complete conditional Polylith scaffold', () => {
	const options = normalizeOptions({
		projectName: 'Full App',
		slug: 'full-app',
		polylith: true,
		dataPersistence: true,
		mui: true,
		localHttps: true,
		shell: {type: 'top-tabs', initialPage: true, initialPageName: 'Home'},
		accessibility: true,
		localization: true,
		baseComponents: true,
		server: {
			enabled: true,
			defaultAppRouting: true,
			localizedMarkdown: true,
			socketIo: true,
		},
		prettier: true,
		testing: true,
		coverage: true,
	});
	const plan = createScaffoldPlan(options, {
		nodeVersion: '25.4.0',
		npmVersion: '11.0.0',
	});

	for (const filename of [
		'agents/topics/standards/manifest.md',
		'agents/topics/standards/overlay.md',
		'agents/topics/architecture/README.md',
		'agents/topics/app-shell/README.md',
		'agents/topics/server/README.md',
		'agents/topics/testing/README.md',
		'scripts/create-local-certificate.mjs',
		'polylith.json',
		'builds/full-app.json',
		'src/full-app/components/BaseDialog.jsx',
		'src/full-app/components/types/BaseDialog.d.ts',
		'src/full-app/components/component-text.js',
		'src/full-app/components/_tests/BaseTextSpec.js',
		'src/full-app/components/_tests/FormControlsSpec.js',
		'src/full-app/components/_tests/FeedbackSpec.js',
		'src/full-app/components/_tests/BaseDialogSpec.js',
		'src/full-app/testing/TestHarness.js',
		'src/full-app/testing/_tests/TestHarnessSpec.js',
		'src/full-app/main/_tests/AppStartupSpec.js',
		'src/full-app/features/app/controller.js',
		'src/full-app/features/app/views/app.js',
		'src/full-app/features/app/components/AppShell.jsx',
		'src/full-app/features/app/_tests/AppControllerSpec.js',
		'src/full-app/features/app/_tests/AppViewSpec.js',
		'src/full-app/features/app/_tests/AppShellSpec.js',
		'src/full-app/features/home/controller.js',
		'src/full-app/features/home/views/page.js',
		'src/full-app/features/home/components/Page.jsx',
		'src/full-app/features/home/_tests/PageFeatureSpec.js',
		'src/full-app/components/Markdown.jsx',
		'src/full-app/services/socket-stream.js',
		'src/full-app/common/socket-types.d.ts',
		'src/full-app/services/_tests/SocketStreamSpec.js',
		'server/full-app/services/socket-stream.js',
		'server/full-app/services/socket-stream.d.ts',
		'server/full-app/services/_tests/socket-stream.spec.js',
		'server/full-app/services/_tests/routers.spec.js',
		'server/full-app/spec.js',
		'server/full-app/common/types.d.ts',
		'server/full-app/services/routers.d.ts',
		'src/full-app/services/io.d.ts',
		'src/full-app/services/_tests/IoSpec.js',
		'src/full-app/services/_tests/ThemeSpec.js',
		'src/full-app/services/_tests/UrlSpec.js',
		'server/full-app/_tests/index.spec.js',
		'server/full-app/features/app/index.d.ts',
		'server/full-app/features/app/_tests/app-router.spec.js',
		'server/full-app/features/markdown/markdown-router.js',
		'server/full-app/features/markdown/markdown-router.d.ts',
		'server/full-app/features/markdown/_tests/markdown-router.spec.js',
		'karma.conf.cjs',
		'karma.coverage.conf.cjs',
		'babel.config.cjs',
		'scripts/run-src-coverage.mjs',
	])
		assert.equal(plan.files.has(path.normalize(filename)), true, filename);
	assert.equal(JSON.parse(plan.files.get(path.normalize('builds/full-app.json'))).routerRoot, '/');
	assert.match(plan.files.get(path.normalize('src/full-app/templates/index.html')), /<base href="\.\/">/);
	assert.match(
		plan.files.get(path.normalize('agents/topics/architecture/README.md')),
		/Standalone mount `\/`; composed mount `\/full-app`; configured repository mount `\/`/,
	);
	const appContextContract = plan.files.get(path.normalize('src/full-app/services/app-context.d.ts'));
	assert.match(appContextContract, /interface AppContextService extends EventBus/);
	assert.match(
		plan.files.get(path.normalize('src/full-app/services/app-context.js')),
		/@implements \{AppContextService\}/,
	);
	assert.match(
		plan.files.get(path.normalize('src/full-app/services/socket-stream.js')),
		/@implements \{SocketStreamService\}/,
	);
	assert.match(
		plan.files.get(path.normalize('server/full-app/services/socket-stream.js')),
		/@implements \{SocketStreamService\}/,
	);
	assert.match(
		plan.files.get(path.normalize('server/full-app/services/_tests/socket-stream.spec.js')),
		/assert\.equal\(warnings\.length, 2\)/,
	);
	assert.doesNotMatch(appContextContract, /\b(?:import|export)\b/);
	assert.match(appContextContract, /\*\*[\s\S]*?\n\s*\*\s*\n\s*\* @returns/);
	for (const name of ['project-foundation', 'architecture', 'app-shell', 'server', 'testing']) {
		const topic = plan.files.get(path.normalize(`agents/topics/${name}/README.md`));
		assert.ok(topic.length >= 200, `${name} topic should record local configuration`);
		assert.match(topic, /^##\s+/m, `${name} topic should expose loadable sections`);
		assert.doesNotMatch(
			topic,
			/Source Lineage|source authorit/i,
			`${name} topic should not track standards origins`,
		);
		assert.doesNotMatch(topic, /\{\{[A-Z0-9_]+\}\}/, `${name} topic should be fully configured`);
		assert.match(plan.files.get(path.normalize('agents/topics/README.md')), new RegExp(`\\./${name}/README\\.md`));
	}
	const applicabilityManifest = plan.files.get(path.normalize('agents/topics/standards/manifest.md'));
	assert.ok(applicabilityManifest.length >= 200, 'standards manifest should record applicability');
	assert.match(applicabilityManifest, /^##\s+/m, 'standards manifest should expose loadable sections');
	assert.doesNotMatch(
		applicabilityManifest,
		/Source Lineage|source authorit/i,
		'standards manifest should not track standards origins',
	);
	assert.doesNotMatch(applicabilityManifest, /\{\{[A-Z0-9_]+\}\}/, 'standards manifest should be fully configured');
	assert.match(applicabilityManifest, /## Standards Sets/);
	assert.match(applicabilityManifest, /### `base`/);
	assert.match(applicabilityManifest, /### `browser`/);
	assert.match(applicabilityManifest, /### `server`/);
	assert.match(applicabilityManifest, /## Folder Assignments/);
	assert.match(applicabilityManifest, /- `src\/full-app\/` — `browser`/);
	assert.match(applicabilityManifest, /- `server\/full-app\/` — `server`/);
	assert.match(plan.files.get(path.normalize('agents/topics/README.md')), /\.\/standards\/manifest\.md/);
	for (const name of [
		'jsdoc',
		'polylith',
		'react-code',
		'local-https',
		'mui',
		'base-components',
		'localization',
		'remvc',
		'accessibility',
		'socket-io',
	]) {
		assert.equal(
			plan.files.has(path.normalize(`agents/topics/${name}/README.md`)),
			false,
			`${name} standard should remain global`,
		);
	}
	const standardsManifest = plan.files.get(path.normalize('agents/topics/standards/manifest.md'));
	for (const filename of [
		'documentation.md',
		'project-foundation.md',
		'architecture.md',
		'data-persistence.md',
		'code-conventions.md',
		'types.md',
		'jsdoc.md',
		'polylith.md',
		'react.md',
		'remvc.md',
		'app-shells.md',
		'mui.md',
		'base-components.md',
		'accessibility.md',
		'localization.md',
		'server.md',
		'socket-io.md',
		'testing.md',
		'local-https.md',
	])
		assert.ok(standardsManifest.includes('- [' + filename + ']('), filename);
	assert.match(standardsManifest, /\$CODEX_HOME\/documentation\/standards/);
	assert.match(standardsManifest, /\[overlay\.md\]\(\.\/overlay\.md\)/);
	assert.match(
		plan.files.get(path.normalize('agents/topics/standards/overlay.md')),
		/^# Repository Standards Overlay\s+None\.\s*$/s,
	);
	assert.doesNotMatch(standardsManifest, /Source Lineage|Music Notebook|Modmod|Flattened Steel|Poly GC/);
	for (const name of [
		'BaseText',
		'Text',
		'BaseTextInput',
		'TextInput',
		'BaseSelect',
		'Select',
		'BaseCheckbox',
		'BaseRadioButtons',
		'BaseButton',
		'BaseHelperText',
		'BaseFormMessage',
		'BaseDialog',
	]) {
		assert.equal(
			plan.files.has(path.normalize(`src/full-app/components/types/${name}.d.ts`)),
			true,
			`${name} ambient type`,
		);
		assert.equal(
			plan.files.has(path.normalize(`src/full-app/components/${name}.d.ts`)),
			false,
			`${name} sibling ambient type`,
		);
	}
	const polylith = JSON.parse(plan.files.get(path.normalize('polylith.json')));
	assert.equal(polylith.socketIo, true);
	assert.equal(polylith.apps[0].mount, '/');
	assert.equal(polylith.deployment.setup, 'server/setup-deployment.js');
	assert.match(plan.files.get(path.normalize('server/setup-deployment.js')), /isMaster/);
	assert.equal(plan.files.has(path.normalize('server/full-app/features/socket/index.js')), false);
	assert.match(plan.files.get(path.normalize('package.json')), /"version": "0.0.1"/);
	const manifest = JSON.parse(plan.files.get(path.normalize('package.json')));
	assert.equal(manifest.scripts.test, 'npm run test:client && npm run test:server');
	assert.equal(manifest.scripts['certificate:create'], 'node scripts/create-local-certificate.mjs');
	assert.equal(manifest.scripts.dev, 'start polylith watch --all -v false&start npm run dev:serve');
	assert.equal(manifest.scripts['dev:watch'], 'polylith watch --all -v false');
	assert.equal(manifest.scripts['dev:serve'], 'nodemon');
	assert.deepEqual(manifest.nodemonConfig, {
		delay: 2500,
		watch: ['server', 'config'],
		exec: 'npm start',
	});
	assert.equal(manifest.dependencies.nodemon, '^3.0.1');
	assert.equal(manifest.devDependencies.selfsigned, 'latest');
	const certificateScript = plan.files.get(path.normalize('scripts/create-local-certificate.mjs'));
	assert.match(certificateScript, /cA: false/);
	assert.match(certificateScript, /\{type: 7, ip: '::1'\}/);
	assert.match(certificateScript, /config\.https = \{key: certificate\.private, cert: certificate\.cert\}/);
	assert.equal(manifest.scripts['test:server'], 'node --test --test-isolation=none server/full-app/spec.js');
	assert.equal(manifest.scripts['coverage:src'], 'node scripts/run-src-coverage.mjs');
	assert.match(manifest.scripts['coverage:server'], /--include="server\/full-app\/\*\*\/\*\.js"/);
	assert.match(manifest.scripts['coverage:server'], /--exclude="server\/full-app\/testing\/\*\*"/);
	assert.match(manifest.scripts['coverage:server'], /--reporter=json-summary --reports-dir=coverage\/server/);
	assert.equal(manifest.scripts.coverage, 'npm run coverage:src && npm run coverage:server');
	assert.match(
		plan.files.get(path.normalize('src/full-app/main/main.jsx')),
		/@mui\/styled-engine\/StyledEngineProvider/,
	);
	assert.match(
		plan.files.get(path.normalize('src/full-app/main/App.jsx')),
		/this\.registry\.subscribe\('app-controller'\)/,
	);
	assert.doesNotMatch(plan.files.get(path.normalize('src/full-app/main/App.jsx')), /\{registry\.subscribe/);
	assert.match(
		plan.files.get(path.normalize('src/full-app/features/home/controller.js')),
		/this\.registry\.subscribe\('app-pages'\)\.add\(\{/,
	);
	assert.doesNotMatch(plan.files.get(path.normalize('src/full-app/features/home/controller.js')), /import Page/);
	assert.match(
		plan.files.get(path.normalize('src/full-app/features/home/controller.js')),
		/this\.view\.getComponent/,
	);
	assert.match(plan.files.get(path.normalize('src/full-app/features/app/controller.js')), /controller\.mount/);
	assert.match(plan.files.get(path.normalize('src/full-app/features/app/views/app.js')), /AppShell/);
	assert.doesNotMatch(
		plan.files.get(path.normalize('src/full-app/features/app/components/AppShell.jsx')),
		/registry\.subscribe/,
	);
	assert.match(
		plan.files.get(path.normalize('src/full-app/features/app/components/AppShell.jsx')),
		/variant="scrollable"/,
	);
	assert.match(
		plan.files.get(path.normalize('src/full-app/features/app/components/AppShell.jsx')),
		/scrollButtons="auto"/,
	);
	assert.match(
		plan.files.get(path.normalize('src/full-app/features/app/_tests/AppShellSpec.js')),
		/delegates selection/,
	);
	assert.doesNotMatch(
		plan.files.get(path.normalize('src/full-app/features/app/components/AppShell.jsx')),
		/requestPage\(page\)/,
	);
	assert.match(plan.files.get(path.normalize('src/full-app/services/url.js')), /this\.fire\('changed'/);
	assert.doesNotMatch(plan.files.get(path.normalize('src/full-app/services/url.js')), /app-pages/);
	assert.match(plan.files.get(path.normalize('src/full-app/services/io.js')), /new URL\(value\.replace/);
	assert.match(
		plan.files.get(path.normalize('src/full-app/services/_tests/IoSpec.js')),
		/deployable-app\/api\/markdown\/help/,
	);
	assert.doesNotMatch(plan.files.get(path.normalize('src/full-app/services/localize.js')), /with \{type:/);
	assert.equal(JSON.parse(plan.files.get(path.normalize('builds/full-app.json'))).css[0].cwd, 'styles');
	assert.equal(
		plan.files.get(path.normalize('.prettierignore')),
		'README.md\nLICENSE\n.gitignore\nnode_modules/\ndist/\ntests/\ncoverage/\n',
	);
	assert.doesNotMatch(plan.files.get(path.normalize('karma.conf.cjs')), /coverage/);
	assert.doesNotMatch(plan.files.get(path.normalize('karma.coverage.conf.cjs')), /preprocessors/);
	assert.match(plan.files.get(path.normalize('karma.coverage.conf.cjs')), /coverage\/src/);
	assert.match(plan.files.get(path.normalize('karma.coverage.conf.cjs')), /type: 'json-summary'/);
	assert.match(plan.files.get(path.normalize('babel.config.cjs')), /include: \['src\/\*\*\/\*\.\{js,jsx\}'\]/);
	assert.match(plan.files.get(path.normalize('scripts/run-src-coverage.mjs')), /SRC_COVERAGE: '1'/);
	assert.match(
		plan.files.get(path.normalize('src/full-app/services/markdown.js')),
		/io\.request\(`\/api\/markdown\/\$\{name\}`\)/,
	);
	assert.match(
		plan.files.get(path.normalize('src/full-app/components/Markdown.jsx')),
		/function Markdown\(\{content = ''\}\)/,
	);
	assert.doesNotMatch(plan.files.get(path.normalize('src/full-app/components/Markdown.jsx')), /request\(/);
	assert.doesNotMatch(plan.files.get(path.normalize('src/full-app/components/Markdown.jsx')), /useEffect|useState/);
	assert.match(plan.files.get(path.normalize('server/full-app/index.js')), /app\.getSocketIo\(\)/);
	assert.match(plan.files.get(path.normalize('server/full-app/index.js')), /full-app-socket-stream/);
	assert.match(
		plan.files.get(path.normalize('src/full-app/services/socket-stream.js')),
		/const APP_NAMESPACE = '\/full-app'/,
	);
	assert.match(
		plan.files.get(path.normalize('src/full-app/services/socket-stream.js')),
		/const system = this\.getSystemData\(\)/,
	);
	assert.match(
		plan.files.get(path.normalize('src/full-app/services/socket-stream.js')),
		/function isReason\(value\)/,
	);
	assert.match(
		plan.files.get(path.normalize('server/full-app/services/socket-stream.js')),
		/async prepareContext\(context\)/,
	);
	assert.equal(plan.files.has(path.normalize('src/full-app/components/_tests/BaseComponentsSpec.js')), false);
	assert.match(
		plan.files.get(path.normalize('src/full-app/spec.js')),
		/\.\/components\/_tests\/FormControlsSpec\.js/,
	);
	assert.match(plan.files.get(path.normalize('src/full-app/testing/TestHarness.js')), /withService\(name, service\)/);
	assert.match(plan.files.get(path.normalize('src/full-app/testing/TestHarness.js')), /queryDocument:/);
	assert.match(
		plan.files.get(path.normalize('src/full-app/components/_tests/FormControlsSpec.js')),
		/reports boolean changes/,
	);
	assert.match(plan.files.get(path.normalize('src/full-app/components/_tests/BaseDialogSpec.js')), /reset token/);
});

test('plans a responsive MUI left-navigation shell without leaking controller ownership into React', () => {
	const options = normalizeOptions({
		projectName: 'Navigation App',
		slug: 'navigation-app',
		polylith: true,
		mui: true,
		shell: {type: 'left-nav', initialPage: true, initialPageName: 'Home'},
		baseComponents: true,
	});
	const plan = createScaffoldPlan(options, {
		nodeVersion: '25.4.0',
		npmVersion: '11.0.0',
	});
	const shell = plan.files.get(path.normalize('src/navigation-app/features/app/components/AppShell.jsx'));
	const css = plan.files.get(path.normalize('src/navigation-app/styles/app.css'));
	assert.match(shell, /ListItemButton/);
	assert.match(shell, /selected=\{this\.state\.activePageId === page\.id\}/);
	assert.match(shell, /variant="temporary"/);
	assert.match(shell, /variant="permanent"/);
	assert.match(shell, /desktopNavigationOpen: true/);
	assert.match(shell, /Collapse navigation/);
	assert.match(shell, /Expand navigation/);
	assert.match(shell, /is-navigation-collapsed/);
	assert.doesNotMatch(shell, /sx=/);
	assert.doesNotMatch(shell, /registry\.subscribe/);
	assert.match(css, /grid-template-columns: 16rem minmax\(0, 1fr\)/);
	assert.match(css, /is-navigation-collapsed \{ grid-template-columns: 0/);
	assert.match(css, /max-width: 899\.95px/);
	for (const filename of [
		'src/navigation-app/main/App.jsx',
		'src/navigation-app/features/app/components/AppShell.jsx',
		'src/navigation-app/components/BaseButton.jsx',
		'src/navigation-app/components/BaseCheckbox.jsx',
		'src/navigation-app/components/BaseDialog.jsx',
		'src/navigation-app/components/BaseFormMessage.jsx',
		'src/navigation-app/components/BaseHelperText.jsx',
		'src/navigation-app/components/BaseRadioButtons.jsx',
		'src/navigation-app/components/BaseSelect.jsx',
		'src/navigation-app/components/BaseTextInput.jsx',
	]) {
		const source = plan.files.get(path.normalize(filename));
		assert.match(source, /class /, filename);
		assert.doesNotMatch(source, /use(?:State|Effect|Context|Id|Memo|Callback|Ref|LayoutEffect)/, filename);
	}
});

test('Socket.IO forces its client and server testing foundation on', () => {
	const options = normalizeOptions({
		projectName: 'Socket Template',
		slug: 'socket-template',
		polylith: true,
		server: {enabled: true, socketIo: true},
		testing: false,
	});
	assert.equal(options.testing.enabled, true);
	assert.deepEqual(options.implied, ['Socket.IO enabled unit testing.']);
});

test('omits BaseText and UI files from branches that do not support them', () => {
	const headless = createScaffoldPlan(
		normalizeOptions({
			projectName: 'Headless',
			slug: 'headless',
			polylith: false,
			testing: true,
		}),
		{nodeVersion: '25.4.0', npmVersion: '11.0.0'},
	);
	assert.equal(
		[...headless.files.keys()].some((filename) => filename.endsWith('.jsx')),
		false,
	);
	const headlessManifest = JSON.parse(headless.files.get(path.normalize('package.json')));
	assert.equal(headlessManifest.dependencies.nodemon, undefined);
	assert.equal(headlessManifest.nodemonConfig, undefined);
	assert.equal(headlessManifest.scripts.dev, undefined);

	const noLocalization = createScaffoldPlan(
		normalizeOptions({
			projectName: 'UI',
			slug: 'ui',
			polylith: true,
			mui: true,
			shell: {type: 'app-directed', initialPage: false},
			baseComponents: true,
		}),
		{nodeVersion: '25.4.0', npmVersion: '11.0.0'},
	);
	assert.equal(noLocalization.files.has(path.normalize('src/ui/components/BaseText.jsx')), false);
	assert.equal(noLocalization.files.has(path.normalize('src/ui/components/BaseDialog.jsx')), true);
	assert.equal(noLocalization.files.has(path.normalize('src/ui/components/types/BaseDialog.d.ts')), true);
	assert.equal(noLocalization.files.has(path.normalize('src/ui/components/BaseDialog.d.ts')), false);
	assert.equal(noLocalization.files.has(path.normalize('src/ui/components/_tests/BaseTextSpec.js')), false);
	assert.equal(noLocalization.files.has(path.normalize('src/ui/components/_tests/FormControlsSpec.js')), true);
	assert.equal(noLocalization.files.has(path.normalize('src/ui/testing/_tests/TestHarnessSpec.js')), true);
	assert.doesNotMatch(
		noLocalization.files.get(path.normalize('src/ui/features/app/components/AppShell.jsx')),
		/@mui/,
	);
	assert.match(
		noLocalization.files.get(path.normalize('src/ui/features/app/_tests/AppShellSpec.js')),
		/textContent\)\.toBe\(''\)/,
	);
	const muiOnly = createScaffoldPlan(
		normalizeOptions({
			projectName: 'MUI Only',
			slug: 'mui-only',
			polylith: true,
			mui: true,
		}),
		{nodeVersion: '25.4.0', npmVersion: '11.0.0'},
	);
	assert.equal(muiOnly.files.has(path.normalize('agents/topics/mui/README.md')), false);
	assert.equal(muiOnly.files.has(path.normalize('agents/topics/base-components/README.md')), false);
	const muiStandards = muiOnly.files.get(path.normalize('agents/topics/standards/manifest.md'));
	assert.match(muiStandards, /\[mui\.md\]\(/);
	assert.doesNotMatch(muiStandards, /\[base-components\.md\]\(/);
	assert.doesNotMatch(muiStandards, /\[localization\.md\]\(/);
});

test('applies a scaffold through injected commands and preserves GitHub files', (context) => {
	const target = temporaryDirectory();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	writeFileSync(path.join(target, 'README.md'), '# GitHub owned\n');
	const calls = [];
	const options = normalizeOptions({
		projectName: 'Generated App',
		slug: 'generated-app',
		polylith: true,
		mui: false,
		shell: {type: 'app-directed', initialPage: false},
		testing: false,
	});

	applyScaffold(target, options, {
		versions: {nodeVersion: '25.4.0', npmVersion: '11.0.0'},
		skipInstall: true,
		runCommand(command, args) {
			calls.push([command, ...args]);
			return '';
		},
	});

	assert.equal(readFileSync(path.join(target, 'README.md'), 'utf8'), '# GitHub owned\n');
	assert.deepEqual(calls, [
		['polylith', '--help'],
		['polylith', 'init'],
		['polylith', 'app', 'generated-app', '--multiple'],
	]);
	const report = validateProject(target, options);
	assert.equal(report.ok, true, report.errors.join('\n'));
	execFileSync(process.execPath, ['--check', path.join(target, 'server', 'setup-deployment.js')]);
});

test('uses Windows system certificates and removes only Codex blocked proxies', () => {
	const environment = makeChildEnvironment(
		{
			HTTP_PROXY: 'http://127.0.0.1:9',
			HTTPS_PROXY: 'https://proxy.example.test',
			PATH: 'example',
		},
		'win32',
	);
	assert.equal(environment.HTTP_PROXY, undefined);
	assert.equal(environment.HTTPS_PROXY, 'https://proxy.example.test');
	assert.equal(environment.NODE_USE_SYSTEM_CA, '1');
	assert.equal(environment.PATH, 'example');
});

test('launches Windows npm and Polylith commands without the deprecated shell option', () => {
	assert.deepEqual(
		makeCommandInvocation('npm', ['install'], 'win32', {
			ComSpec: 'C:\\Windows\\System32\\cmd.exe',
		}),
		{
			executable: 'C:\\Windows\\System32\\cmd.exe',
			args: ['/d', '/s', '/c', 'npm.cmd', 'install'],
		},
	);
	assert.deepEqual(makeCommandInvocation('polylith', ['init'], 'win32', {}), {
		executable: 'cmd.exe',
		args: ['/d', '/s', '/c', 'polylith.cmd', 'init'],
	});
	assert.deepEqual(makeCommandInvocation('npm', ['install'], 'linux', {}), {
		executable: 'npm',
		args: ['install'],
	});
});

test('creates the local certificate after dependency installation', (context) => {
	const target = temporaryDirectory();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	const calls = [];
	applyScaffold(
		target,
		normalizeOptions({
			projectName: 'Secure Local App',
			slug: 'secure-local-app',
			polylith: true,
			localHttps: true,
		}),
		{
			versions: {nodeVersion: '25.4.0', npmVersion: '11.0.0'},
			runCommand(command, args) {
				calls.push([command, ...args]);
				return '';
			},
		},
	);
	assert.deepEqual(calls.slice(-2), [
		['npm', 'ls', '--all'],
		['npm', 'run', 'certificate:create'],
	]);
});

test('formats a selected Prettier scaffold after dependency installation', (context) => {
	const target = temporaryDirectory();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	const calls = [];
	applyScaffold(
		target,
		normalizeOptions({
			projectName: 'Formatted Tool',
			slug: 'formatted-tool',
			polylith: false,
			prettier: true,
		}),
		{
			versions: {nodeVersion: '25.4.0', npmVersion: '11.0.0'},
			runCommand(command, args) {
				calls.push([command, ...args]);
				return '';
			},
		},
	);
	assert.deepEqual(calls, [
		['npm', 'install'],
		['npm', 'ls', '--all'],
		['npm', 'run', 'format'],
		['npm', 'run', 'format:check'],
	]);
});

test('re-resolves Polylith dependencies without bootstrap install artifacts', (context) => {
	const target = temporaryDirectory();
	context.after(() => rmSync(target, {recursive: true, force: true}));
	const calls = [];
	applyScaffold(
		target,
		normalizeOptions({
			projectName: 'Current Dependency App',
			slug: 'current-dependency-app',
			polylith: true,
			mui: false,
			shell: {type: 'app-directed', initialPage: false},
			testing: false,
		}),
		{
			versions: {nodeVersion: '25.4.0', npmVersion: '11.0.0'},
			runCommand(command, args) {
				calls.push([command, ...args]);
				if (command === 'polylith' && args[0] === 'init') {
					writeFileSync(path.join(target, 'package-lock.json'), 'stale lock');
					mkdirSync(path.join(target, 'node_modules'));
					writeFileSync(path.join(target, 'node_modules', 'stale.txt'), 'stale modules');
				}
				return '';
			},
		},
	);
	assert.equal(existsSync(path.join(target, 'package-lock.json')), false);
	assert.equal(existsSync(path.join(target, 'node_modules')), false);
	assert.deepEqual(calls.slice(-2), [
		['npm', 'install'],
		['npm', 'ls', '--all'],
	]);
});

test('validates the staged skill package', () => {
	const root = path.resolve(
		path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')),
		'..',
	);
	const report = validateSkill(root);
	assert.equal(report.ok, true, report.errors.join('\n'));
});
