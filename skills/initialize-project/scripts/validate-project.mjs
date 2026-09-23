import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseManifest} from '../../normalize-standards/scripts/standards-config.mjs';
import {applicableStandardNames} from './scaffold-plan.mjs';

export function validateProject(targetPath, options, preflight = null) {
	const target = path.resolve(targetPath);
	const errors = [];
	const warnings = [];
	const requirePath = (relativePath, reason) => {
		if (!existsSync(path.join(target, relativePath))) {
			errors.push(`${relativePath}: ${reason}`);
		}
	};

	requirePath('src', 'missing source directory');
	requirePath('package.json', 'missing package manifest');
	requirePath('AGENTS.md', 'missing agent entrypoint');
	requirePath(path.join('agents', 'topics', 'active-topic.md'), 'missing active topic');
	requirePath(path.join('agents', 'topics', 'standards', 'manifest.md'), 'missing folder standards manifest');
	requirePath(path.join('agents', 'topics', options.slug, 'README.md'), 'missing initial app topic');
	validateTopics(target, options, errors);
	validateStandardsManifest(target, options, errors);

	const packagePath = path.join(target, 'package.json');
	if (existsSync(packagePath)) {
		try {
			const manifest = JSON.parse(readFileSync(packagePath, 'utf8'));
			if (manifest.name !== (options.projectSlug || options.slug))
				errors.push('package.json name must equal the project/package slug');
			if (manifest.version !== '0.0.1') errors.push('package.json version must be 0.0.1');
			if (manifest.private !== true) errors.push('package.json private must default to true');
			if (manifest.type !== 'module') errors.push('package.json type must be module');
			if (options.localHttps?.enabled) {
				if (manifest.scripts?.['certificate:create'] !== 'node scripts/create-local-certificate.mjs')
					errors.push('local HTTPS certificate script is missing');
				if (!manifest.devDependencies?.selfsigned)
					errors.push('local HTTPS requires the selfsigned development dependency');
			}
			if (
				!options.polylith &&
				options.testing.enabled &&
				manifest.scripts?.test !== 'jasmine "src/**/*.spec.js"'
			) {
				errors.push('non-Polylith test script must run Jasmine against src/**/*.spec.js');
			}
			if (
				!options.polylith &&
				options.testing.coverage &&
				(!manifest.scripts?.coverage?.includes('--reports-dir=coverage/src') ||
					!manifest.scripts.coverage.includes('--reporter=json-summary'))
			) {
				errors.push('non-Polylith coverage must emit the separate src JSON summary');
			}
			if (options.testing.coverage && !manifest.scripts?.coverage) errors.push('coverage script is missing');
			if (options.prettier && (!manifest.scripts?.format || !manifest.scripts?.['format:check'])) {
				errors.push('Prettier format scripts are missing');
			}
		} catch (error) {
			errors.push(`package.json is invalid JSON: ${error.message}`);
		}
	}

	if (options.polylith) {
		requirePath('polylith.json', 'missing Polylith configuration');
		requirePath(path.join('builds', `${options.slug}.json`), 'missing app build configuration');
		requirePath(path.join('src', options.slug), 'missing app source root');
		requirePath(path.join('server', 'setup-deployment.js'), 'missing deployment setup entry point');
		if (options.server?.enabled)
			requirePath(path.join('server', options.slug, 'index.js'), 'missing app-scoped server router');
		validatePolylith(target, options, errors);
		validateServiceContracts(target, options, errors);
		validateJsdocFormatting(target, options, errors);
		if (options.localHttps?.enabled)
			requirePath(
				path.join('scripts', 'create-local-certificate.mjs'),
				'missing local HTTPS certificate generator',
			);
	} else if (existsSync(path.join(target, 'polylith.json'))) {
		errors.push('non-Polylith project must not contain polylith.json');
	}
	if (!options.polylith && options.testing.enabled)
		requirePath(path.join('src', 'testing.spec.js'), 'missing Jasmine discovery spec');

	if (options.mui) requirePath(path.join('src', options.slug, 'services', 'theme.js'), 'missing MUI theme service');
	if (options.shell?.enabled) {
		requirePath(path.join('src', options.slug, 'services', 'app-pages.js'), 'missing app-pages service');
		requirePath(path.join('src', options.slug, 'features', 'app', 'controller.js'), 'missing shell controller');
		requirePath(path.join('src', options.slug, 'features', 'app', 'views', 'app.js'), 'missing shell view service');
		requirePath(
			path.join('src', options.slug, 'features', 'app', 'components', 'AppShell.jsx'),
			'missing shell component',
		);
		if (options.shell.initialPage) {
			requirePath(
				path.join('src', options.slug, 'features', options.shell.initialPageSlug, 'controller.js'),
				'missing initial page controller',
			);
			requirePath(
				path.join('src', options.slug, 'features', options.shell.initialPageSlug, 'views', 'page.js'),
				'missing initial page view service',
			);
			requirePath(
				path.join('src', options.slug, 'features', options.shell.initialPageSlug, 'components', 'Page.jsx'),
				'missing initial page component',
			);
		}
	}
	if (options.server?.defaultAppRouting)
		requirePath(path.join('src', options.slug, 'services', 'url.js'), 'missing URL service');
	if (options.baseComponents) {
		requirePath(path.join('src', options.slug, 'components', 'BaseDialog.jsx'), 'missing base components');
		requirePath(
			path.join('src', options.slug, 'components', 'types', 'BaseDialog.d.ts'),
			'missing component ambient types',
		);
		if (existsSync(path.join(target, 'src', options.slug, 'components', 'BaseDialog.d.ts'))) {
			errors.push('component ambient types must be placed under components/types');
		}
	}
	if (options.localization?.enabled)
		requirePath(path.join('src', options.slug, 'phrases', 'en-US.json'), 'missing en-US phrases');
	if (options.server?.localizedMarkdown)
		requirePath(path.join('src', options.slug, 'components', 'Markdown.jsx'), 'missing Markdown component');
	if (options.polylith && options.testing.enabled) requirePath('karma.conf.cjs', 'missing Karma configuration');

	if (preflight?.protectedFiles) {
		for (const [filename, expectedHash] of Object.entries(preflight.protectedFiles)) {
			const protectedPath = path.join(target, filename);
			if (!existsSync(protectedPath)) {
				errors.push(`protected file was removed: ${filename}`);
			} else if (hashFile(protectedPath) !== expectedHash) {
				errors.push(`protected file was modified: ${filename}`);
			}
		}
	}

	if (options.testing.coverage) {
		if (options.polylith) {
			requirePath('babel.config.cjs', 'missing source-only coverage instrumentation');
			requirePath('karma.coverage.conf.cjs', 'missing source coverage configuration');
			requirePath('scripts/run-src-coverage.mjs', 'missing source coverage runner');
			if (options.server.enabled)
				requirePath(path.join('server', options.slug, 'spec.js'), 'missing app server test entry');
		}
		warnings.push('Coverage output must be verified after the coverage command runs.');
	}

	return {ok: errors.length === 0, target, errors, warnings};
}

function validateTopics(target, options, errors) {
	const topicsRoot = path.join(target, 'agents', 'topics');
	if (!existsSync(topicsRoot)) return;
	const indexPath = path.join(topicsRoot, 'README.md');
	const index = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
	for (const entry of readdirSync(topicsRoot, {withFileTypes: true})) {
		if (!entry.isDirectory()) continue;
		if (entry.name === 'standards') {
			if (!index.includes('./standards/manifest.md'))
				errors.push('agents/topics/README.md: missing standards manifest link');
			continue;
		}
		const readmePath = path.join(topicsRoot, entry.name, 'README.md');
		if (!existsSync(readmePath)) {
			errors.push(`agents/topics/${entry.name}/README.md: missing topic documentation`);
			continue;
		}
		if (!index.includes(`./${entry.name}/README.md`))
			errors.push(`agents/topics/README.md: missing ${entry.name} topic link`);
		if (entry.name === options.slug) continue;
		const content = readFileSync(readmePath, 'utf8');
		if (content.length < 200 || !/^##\s+/m.test(content))
			errors.push(`agents/topics/${entry.name}/README.md: local topic is incomplete`);
		if (/Source Lineage|source authorit/i.test(content))
			errors.push(`agents/topics/${entry.name}/README.md: local topic must not track standards origins`);
		if (/\{\{[A-Z0-9_]+\}\}/.test(content))
			errors.push(`agents/topics/${entry.name}/README.md: unresolved topic template value`);
	}
}

function validateStandardsManifest(target, options, errors) {
	const manifestPath = path.join(target, 'agents', 'topics', 'standards', 'manifest.md');
	if (!existsSync(manifestPath)) return;
	const content = readFileSync(manifestPath, 'utf8');
	const overlayPath = path.join(target, 'agents', 'topics', 'standards', 'overlay.md');
	if (!content.includes('$CODEX_HOME/documentation/standards')) {
		errors.push('agents/topics/standards/manifest.md: canonical standards root is missing');
	}
	let parsed;
	try {
		parsed = parseManifest(content, 'agents/topics/standards/manifest.md');
	} catch (error) {
		errors.push(error.message);
		return;
	}
	const listed = [...parsed.selected.keys()].sort();
	const expected = applicableStandardNames(options).sort();
	if (JSON.stringify(listed) !== JSON.stringify(expected)) {
		errors.push(
			`agents/topics/standards/manifest.md: applicable standards mismatch; expected ${expected.join(', ')}`,
		);
	}
	const canonicalRoot = path.resolve(
		process.env.CODEX_HOME || path.join(homedir(), '.codex'),
		'documentation',
		'standards',
	);
	for (const [filename, standard] of parsed.selected) {
		const destination = standard.href.replace(/^<|>$/g, '');
		let resolved;
		try {
			resolved = destination.startsWith('file:')
				? fileURLToPath(destination)
				: path.resolve(path.dirname(manifestPath), decodeURI(destination));
		} catch {
			errors.push(`agents/topics/standards/manifest.md: invalid link for ${filename}`);
			continue;
		}
		if (path.normalize(resolved).toLowerCase() !== path.join(canonicalRoot, filename).toLowerCase()) {
			errors.push(
				`agents/topics/standards/manifest.md: ${filename} does not link to the canonical standards root`,
			);
		} else if (!existsSync(resolved)) {
			errors.push(`agents/topics/standards/manifest.md: linked standard is missing: ${filename}`);
		}
	}
	for (const assignment of parsed.assignments) {
		if (assignment.folder === '.') continue;
		if (!existsSync(path.join(target, ...assignment.folder.slice(0, -1).split('/')))) {
			errors.push(`agents/topics/standards/manifest.md: assigned folder is missing: ${assignment.folder}`);
		}
	}
	if (content.length > 8000)
		errors.push('agents/topics/standards/manifest.md: folder manifest contains copied standards prose');
	if (!content.includes('[overlay.md](./overlay.md)')) {
		errors.push('agents/topics/standards/manifest.md: repository overlay link is missing');
	}
	if (!existsSync(overlayPath)) {
		errors.push('agents/topics/standards/overlay.md: missing repository standards overlay');
	} else if (!/^# Repository Standards Overlay\s+None\.\s*$/s.test(readFileSync(overlayPath, 'utf8'))) {
		errors.push('agents/topics/standards/overlay.md: initialized overlay must contain None.');
	}
	for (const legacyTopic of [
		'accessibility',
		'base-components',
		'jsdoc',
		'local-https',
		'localization',
		'mui',
		'polylith',
		'react-code',
		'remvc',
		'socket-io',
	]) {
		if (existsSync(path.join(target, 'agents', 'topics', legacyTopic))) {
			errors.push(`agents/topics/${legacyTopic}: canonical standard must not be copied into the project`);
		}
	}
}

function validateServiceContracts(target, options, errors) {
	for (const root of [path.join(target, 'src', options.slug), path.join(target, 'server')]) {
		if (!existsSync(root)) continue;
		for (const filename of walkFiles(root)) {
			if (
				!filename.endsWith('.js') ||
				filename.includes(`${path.sep}_tests${path.sep}`) ||
				filename.endsWith(`${path.sep}spec.js`)
			)
				continue;
			const source = readFileSync(filename, 'utf8');
			if (!source.includes('this.implement(')) continue;
			const className = source.match(/export\s+class\s+(\w+)\s+extends\s+Service/)?.[1];
			if (className && !new RegExp(`@implements\\s+\\{${className}\\}`).test(source)) {
				errors.push(
					`${path.relative(target, filename)}: service class must document @implements {${className}}`,
				);
			}
			const contract = filename.replace(/\.js$/, '.d.ts');
			const relative = path.relative(target, contract);
			if (!existsSync(contract)) {
				errors.push(`${relative}: missing adjacent ambient service contract`);
				continue;
			}
			const declaration = readFileSync(contract, 'utf8');
			if (/^\s*(?:import|export)\b/m.test(declaration))
				errors.push(`${relative}: application service contracts must be ambient without imports or exports`);
			if (!/interface\s+\w+\s+extends\s+EventBus/.test(declaration))
				errors.push(`${relative}: application service interface must extend EventBus`);
		}
	}
}

function validateJsdocFormatting(target, options, errors) {
	for (const root of [path.join(target, 'src', options.slug), path.join(target, 'server')]) {
		if (!existsSync(root)) continue;
		for (const filename of walkFiles(root)) {
			if (!/\.(?:js|jsx|d\.ts)$/.test(filename)) continue;
			const source = readFileSync(filename, 'utf8');
			for (const block of source.match(/\/\*\*[\s\S]*?\*\//g) || []) {
				const tag = block.search(/\n\s*\*\s*@(?:param|returns|throws|implements)\b/);
				if (tag < 0) continue;
				if (!/\n\s*\*\s*$/.test(block.slice(0, tag))) {
					errors.push(`${path.relative(target, filename)}: JSDoc requires a blank line before its first tag`);
					break;
				}
			}
		}
	}
}

function walkFiles(root) {
	const files = [];
	for (const entry of readdirSync(root, {withFileTypes: true})) {
		const filename = path.join(root, entry.name);
		if (entry.isDirectory()) files.push(...walkFiles(filename));
		else files.push(filename);
	}
	return files;
}

function validatePolylith(target, options, errors) {
	try {
		const config = JSON.parse(readFileSync(path.join(target, 'polylith.json'), 'utf8'));
		if (config.multiple !== true) errors.push('polylith.json must set multiple to true');
		if (config.deployment?.setup !== 'server/setup-deployment.js')
			errors.push('polylith.json must declare the repository deployment setup entry point');
		const app = config.apps?.find((candidate) => candidate.name === options.slug);
		if (!app) {
			errors.push(`polylith.json must declare app ${options.slug}`);
			return;
		}
		if (app.filename !== `${options.slug}.json`) errors.push('Polylith app filename does not match slug');
		if (app.mount !== options.mount) errors.push('Polylith app mount does not match normalized options');
		const build = JSON.parse(readFileSync(path.join(target, 'builds', `${options.slug}.json`), 'utf8'));
		if (options.server.enabled && build.routerRoot !== options.mount)
			errors.push(`The Polylith server router must mount at ${options.mount}`);
		if (options.server.enabled && build.router !== `server/${options.slug}/index.js`)
			errors.push('The Polylith server router must use the app-scoped server entry point');
		if (options.localHttps?.enabled) {
			if (config.port !== options.localHttps.port)
				errors.push(`Polylith local HTTPS port must be ${options.localHttps.port}`);
			if (!config.https?.key?.includes('BEGIN PRIVATE KEY'))
				errors.push('Polylith local HTTPS private key is missing');
			if (!config.https?.cert?.includes('BEGIN CERTIFICATE'))
				errors.push('Polylith local HTTPS certificate is missing');
		}
	} catch (error) {
		errors.push(`polylith.json is invalid JSON: ${error.message}`);
	}
}

function hashFile(filename) {
	return createHash('sha256').update(readFileSync(filename)).digest('hex');
}

function isMain() {
	return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
	const [, , targetPath, optionsPath, preflightPath] = process.argv;
	if (!targetPath || !optionsPath) {
		console.error('Usage: node validate-project.mjs <target> <normalized.json> [preflight-report.json]');
		process.exitCode = 2;
	} else {
		try {
			const options = JSON.parse(readFileSync(optionsPath, 'utf8'));
			const preflight = preflightPath ? JSON.parse(readFileSync(preflightPath, 'utf8')) : null;
			const report = validateProject(targetPath, options, preflight);
			process.stdout.write(`${JSON.stringify(report, null, '\t')}\n`);
			if (!report.ok) process.exitCode = 1;
		} catch (error) {
			console.error(error.message);
			process.exitCode = 1;
		}
	}
}
