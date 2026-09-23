import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';

import {applicableStandardNames, createScaffoldPlan} from '../../initialize-project/scripts/scaffold-plan.mjs';
import {normalizeMount} from './normalize-application-options.mjs';

export function createInitialApplicationPlan(options, runtime = {}) {
	return createScaffoldPlan(options, runtime);
}

export function createExistingApplicationPlan(repository, options, runtime = {}) {
	validateCandidate(repository, options);
	const scaffoldOptions = {
		...options,
		polylith: true,
		projectName: repository.projectName,
		projectSlug: repository.projectSlug,
		slug: options.appSlug,
		prettier: false,
		localHttps: {enabled: false},
	};
	const baseline = createScaffoldPlan(scaffoldOptions, runtime);
	const files = new Map();
	const root = path.normalize(`src/${options.appSlug}/`);
	const serverRoot = path.normalize(`server/${options.appSlug}/`);
	const buildPath = path.normalize(`builds/${options.appSlug}.json`);
	const topicPath = path.normalize(`${runtime.appTopicRoot || 'agents/topics'}/${options.appSlug}/README.md`);

	for (const [filename, content] of baseline.files) {
		if (filename.startsWith(root) || filename.startsWith(serverRoot) || filename === buildPath)
			files.set(filename, content);
	}
	const existingPaths = runtime.existingPaths || new Set();
	if (options.testing.enabled) {
		const testGlob = `tests/${options.appSlug}/**/*.js`;
		files.set(
			path.normalize(`karma.${options.appSlug}.conf.cjs`),
			baseline.files.get(path.normalize('karma.conf.cjs')).replace('tests/**/*.js', testGlob),
		);
		files.set(
			path.normalize(`karma.${options.appSlug}.watch.conf.cjs`),
			baseline.files.get(path.normalize('karma.watch.conf.cjs')).replace('tests/**/*.js', testGlob),
		);
		const browserSetup = path.normalize('karma-browser-setup.js');
		if (!existingPaths.has(browserSetup)) files.set(browserSetup, baseline.files.get(browserSetup));
	}
	if (options.testing.coverage) {
		const babel = path.normalize('babel.config.cjs');
		if (!existingPaths.has(babel)) files.set(babel, baseline.files.get(babel));
		const coverageConfig = baseline.files
			.get(path.normalize('karma.coverage.conf.cjs'))
			.replace('tests/**/*.js', `tests/${options.appSlug}/**/*.js`)
			.replaceAll('coverage/src', `coverage/src/${options.appSlug}`);
		files.set(path.normalize(`karma.${options.appSlug}.coverage.conf.cjs`), coverageConfig);
		const coverageRunner = baseline.files
			.get(path.normalize('scripts/run-src-coverage.mjs'))
			.replace('karma.coverage.conf.cjs', `karma.${options.appSlug}.coverage.conf.cjs`);
		files.set(path.normalize(`scripts/run-src-coverage-${options.appSlug}.mjs`), coverageRunner);
	}

	const build = JSON.parse(files.get(buildPath));
	if (options.server.enabled) {
		build.router = `server/${options.appSlug}/index.js`;
		build.routerRoot = options.standaloneMount;
	}
	files.set(buildPath, `${JSON.stringify(build, null, '\t')}\n`);
	files.set(topicPath, applicationTopic(options));

	if (!repository.config.deployment?.setup)
		files.set(
			path.normalize('server/setup-deployment.js'),
			baseline.files.get(path.normalize('server/setup-deployment.js')),
		);

	const config = structuredClone(repository.config);
	config.deployment = {
		...(config.deployment || {}),
		setup: config.deployment?.setup || 'server/setup-deployment.js',
	};
	config.apps = [
		...config.apps,
		{
			name: options.appSlug,
			filename: `${options.appSlug}.json`,
			default: config.apps.length === 0,
			mount: options.mount,
		},
	];
	if (options.server.socketIo) config.socketIo = true;

	const packageJson = mergePackage(
		repository.packageJson,
		JSON.parse(baseline.files.get(path.normalize('package.json'))),
		options,
	);
	const replacements = new Map([
		[path.normalize('polylith.json'), `${JSON.stringify(config, null, '\t')}\n`],
		[path.normalize('package.json'), `${JSON.stringify(packageJson, null, '\t')}\n`],
	]);
	if (options.testing.coverage && runtime.babelConfig) {
		if (!runtime.babelConfig.includes("include: ['src/**/*.{js,jsx}']")) {
			const updated = runtime.babelConfig.replace(
				/include: \['src\/[a-z0-9-]+\/\*\*\/\*\.\{js,jsx\}'\]/,
				"include: ['src/**/*.{js,jsx}']",
			);
			if (updated === runtime.babelConfig)
				throw new Error('existing Babel coverage configuration cannot be safely extended for another app');
			replacements.set(path.normalize('babel.config.cjs'), updated);
		}
	}

	const manifestPath = path.normalize('agents/topics/standards/manifest.md');
	if (runtime.manifest) replacements.set(manifestPath, updateStandardsManifest(runtime.manifest, options, runtime));
	const reconciliationPath = path.normalize('agents/topics/standards/reconciliation.md');
	if (runtime.reconciliation)
		replacements.set(reconciliationPath, updateReconciliation(runtime.reconciliation, options));
	const topicIndexPath = path.normalize(runtime.topicIndexPath || 'agents/topics/README.md');
	if (runtime.topicIndex) replacements.set(topicIndexPath, updateTopicIndex(runtime.topicIndex, options));

	return {
		files,
		replacements,
		standards: applicableStandardNames(scaffoldOptions),
	};
}

function validateCandidate(repository, options) {
	if (!repository?.ok) throw new Error('repository preflight must pass before planning an app');
	if (repository.apps.some((app) => app.name === options.appSlug))
		throw new Error(`application already exists: ${options.appSlug}`);
	const claimed = new Map(repository.apps.map((app) => [normalizeMount(app.mount || '/'), app.name]));
	const owner = claimed.get(options.mount);
	if (owner) throw new Error(`mount ${options.mount} is already claimed by ${owner}`);
}

function mergePackage(current, generated, options) {
	const result = structuredClone(current);
	result.dependencies = {...(result.dependencies || {})};
	result.devDependencies = {...(result.devDependencies || {})};
	for (const [name, version] of Object.entries(generated.dependencies || {}))
		if (!result.dependencies[name] && !result.devDependencies[name]) result.dependencies[name] = version;
	for (const [name, version] of Object.entries(generated.devDependencies || {}))
		if (!result.dependencies[name] && !result.devDependencies[name]) result.devDependencies[name] = version;
	result.scripts = {...(result.scripts || {})};
	if (!result.scripts.build) result.scripts.build = 'polylith build --all';
	if (options.testing.enabled) {
		const client = `polylith test ${options.appSlug} && karma start karma.${options.appSlug}.conf.cjs`;
		result.scripts[`test:ui:${options.appSlug}`] = client;
		result.scripts[`test:ui:${options.appSlug}:watch`] =
			`polylith test ${options.appSlug} -w & karma start karma.${options.appSlug}.watch.conf.cjs`;
		if (options.server.enabled)
			result.scripts[`test:server:${options.appSlug}`] =
				`node --test --test-isolation=none server/${options.appSlug}/spec.js`;
		result.scripts[`test:${options.appSlug}`] = options.server.enabled
			? `npm run test:ui:${options.appSlug} && npm run test:server:${options.appSlug}`
			: `npm run test:ui:${options.appSlug}`;
		result.scripts.test = appendToFlow(result.scripts.test, `npm run test:${options.appSlug}`);
		if (options.testing.coverage) {
			result.scripts[`coverage:${options.appSlug}:src`] = `node scripts/run-src-coverage-${options.appSlug}.mjs`;
			if (options.server.enabled)
				result.scripts[`coverage:${options.appSlug}:server`] =
					`c8 --all --include="server/${options.appSlug}/**/*.js" --exclude="server/${options.appSlug}/**/_tests/**" --exclude="server/${options.appSlug}/testing/**" --exclude="server/${options.appSlug}/spec.js" --reporter=text-summary --reporter=html --reporter=json-summary --reports-dir=coverage/server/${options.appSlug} node --test --test-isolation=none server/${options.appSlug}/spec.js`;
			result.scripts[`coverage:${options.appSlug}`] = options.server.enabled
				? `npm run coverage:${options.appSlug}:src && npm run coverage:${options.appSlug}:server`
				: `npm run coverage:${options.appSlug}:src`;
			result.scripts.coverage = appendToFlow(result.scripts.coverage, `npm run coverage:${options.appSlug}`);
		}
	}
	return result;
}

function appendToFlow(current, command) {
	if (!current) return command;
	if (current.includes(command)) return current;
	return `${current} && ${command}`;
}

function updateTopicIndex(content, options) {
	const link = `./${options.appSlug}/README.md`;
	if (content.includes(link)) return content;
	return `${content.trimEnd()}\n\n- [${options.appName}](${link}) — ${options.appName} application context.\n`;
}

function updateReconciliation(content, options) {
	const marker = `\`${options.appSlug}\` application folders`;
	if (content.includes(marker)) return content;
	const section = content.includes('## Post-Normalization Manifest Updates')
		? ''
		: '\n\n## Post-Normalization Manifest Updates\n';
	return `${content.trimEnd()}${section}\n- Added ${marker} from engineer-approved application scaffolding; canonical selections were manifested and the repository overlay was unchanged.\n`;
}

function applicationTopic(options) {
	const capabilities = [
		options.mui ? 'MUI' : null,
		options.shell.enabled ? `${options.shell.type} shell` : null,
		options.localization.enabled ? 'localization' : null,
		options.accessibility ? 'strict accessibility' : null,
		options.baseComponents ? 'base components' : null,
		options.server.enabled ? 'app-owned server router' : null,
		options.server.localizedMarkdown ? 'localized Markdown' : null,
		options.server.socketIo ? 'Socket.IO' : null,
		options.testing.enabled ? 'testing' : null,
		options.testing.coverage ? 'coverage' : null,
	].filter(Boolean);
	return `# ${options.appName}\n\n${options.appName} product requirements are not yet defined.\n\n## Integration Facts\n\n- App slug: \`${options.appSlug}\`\n- Browser source: \`src/${options.appSlug}/\`\n${options.server.enabled ? `- Server source: \`server/${options.appSlug}/\`\n` : ''}- Standalone mount: \`${options.standaloneMount}\`\n- Composed mount: \`${options.composedMount}\`\n- Configured mount: \`${options.mount}\`\n- Repository posture: \`${options.repositoryPosture}\`\n- Capabilities: ${capabilities.length ? capabilities.join(', ') : 'baseline React app'}\n${options.testing.enabled ? `- Standard test command: \`npm run test:${options.appSlug}\`\n` : ''}${options.testing.coverage ? `- Coverage command: \`npm run coverage:${options.appSlug}\`\n` : ''}`;
}

function updateStandardsManifest(content, options, runtime = {}) {
	const browserSet = `app-${options.appSlug}-browser`;
	const serverSet = `app-${options.appSlug}-server`;
	for (const setName of [browserSet, ...(options.server.enabled ? [serverSet] : [])])
		if (content.includes(`### \`${setName}\``)) throw new Error(`standards set already exists: ${setName}`);
	const names = applicableStandardNames({
		...options,
		polylith: true,
		slug: options.appSlug,
	});
	const knownLinks = new Map();
	for (const match of content.matchAll(/\[([^\]]+\.md)\]\(([^)]+)\)/g)) knownLinks.set(match[1], match[2]);
	const missing = names.filter((name) => !knownLinks.has(name));
	const standardsRoot = path.resolve(
		runtime.standardsRoot ||
			path.join(process.env.CODEX_HOME || path.join(homedir(), '.codex'), 'documentation', 'standards'),
	);
	for (const name of missing) {
		const filename = path.join(standardsRoot, name);
		if (!existsSync(filename)) throw new Error(`canonical standard is missing: ${name}`);
		const manifestDirectory = path.join(runtime.target, 'agents', 'topics', 'standards');
		knownLinks.set(name, path.relative(manifestDirectory, filename).replaceAll('\\', '/'));
	}
	const uiOnly = new Set([
		'react.md',
		'remvc.md',
		'app-shells.md',
		'mui.md',
		'base-components.md',
		'accessibility.md',
	]);
	const serverOnly = new Set(['server.md', 'socket-io.md']);
	const lines = (selected) =>
		selected.map((name) => `- [${name}](${knownLinks.get(name)}) - Applies to ${options.appName}.`).join('\n');
	const browserNames = names.filter((name) => !serverOnly.has(name));
	const serverNames = names.filter((name) => !uiOnly.has(name) && name !== 'react.md');
	let set = `### \`${browserSet}\`\n\nExtends: none\nStandards:\n\n${lines(browserNames)}\n\n`;
	if (options.server.enabled) set += `### \`${serverSet}\`\n\nExtends: none\nStandards:\n\n${lines(serverNames)}\n\n`;
	const assignmentHeading = '## Folder Assignments';
	const headingIndex = content.indexOf(assignmentHeading);
	if (headingIndex < 0) throw new Error('standards manifest lacks Folder Assignments');
	let result = `${content.slice(0, headingIndex).trimEnd()}\n\n${set}${content.slice(headingIndex)}`;
	const assignments = [
		`- \`src/${options.appSlug}/\` - \`${browserSet}\` - Owning ${options.appName} browser source.`,
	];
	if (options.server.enabled)
		assignments.push(
			`- \`server/${options.appSlug}/\` - \`${serverSet}\` - Owning ${options.appName} server source.`,
		);
	const insertion = assignments.join('\n');
	const nextHeading = result.indexOf('\n## ', result.indexOf(assignmentHeading) + assignmentHeading.length);
	if (nextHeading < 0) return `${result.trimEnd()}\n${insertion}\n`;
	return `${result.slice(0, nextHeading).trimEnd()}\n${insertion}\n${result.slice(nextHeading)}`;
}
