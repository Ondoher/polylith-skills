import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const json = (value) => `${JSON.stringify(value, null, '\t')}\n`;
const text = (value) => `${value.trim()}\n`;

export function createScaffoldPlan(options, runtime = {}) {
	const nodeMajor = String(runtime.nodeVersion || process.versions.node).split('.')[0];
	const npmVersion = String(runtime.npmVersion || 'latest');
	const files = new Map();
	const directories = new Set(['src']);
	const add = (filename, content) => files.set(path.normalize(filename), normalizeGeneratedContent(content));
	const addConfiguredTopic = (name, asset = name, replacements = {}) =>
		add(`agents/topics/${name}/README.md`, configuredTopicAsset(asset, options, replacements, runtime));

	add(
		'AGENTS.md',
		text(
			`# Agents\n\nRead [the active topic](agents/topics/active-topic.md) for work context, then [the folder standards manifest](agents/topics/standards/manifest.md) and [repository standards overlay](agents/topics/standards/overlay.md). Resolve standards for each task file from its longest matching folder assignment under \`$CODEX_HOME/documentation/standards\` (or \`~/.codex/documentation/standards\` when \`CODEX_HOME\` is unset), then apply matching folder overlay entries. Topics do not select or override standards.`,
		),
	);
	add('agents/topics/README.md', topicIndex(options));
	add(
		'agents/topics/active-topic.md',
		text(`# Active Topic\n\nRead [${options.appName || options.projectName}](./${options.slug}/README.md).`),
	);
	add(
		`agents/topics/${options.slug}/README.md`,
		text(
			`# ${options.appName || options.projectName}\n\n${options.appName || options.projectName} needs to be defined.`,
		),
	);
	addConfiguredTopic('project-foundation');
	addConfiguredTopic('architecture');
	add('agents/topics/standards/manifest.md', configuredTopicAsset('standards/manifest.md', options));
	add('agents/topics/standards/overlay.md', configuredTopicAsset('standards/overlay.md', options));

	if (options.prettier) {
		add(
			'.prettierrc.json',
			json({
				printWidth: 120,
				tabWidth: 4,
				useTabs: true,
				semi: true,
				singleQuote: true,
				trailingComma: 'all',
				bracketSpacing: false,
				arrowParens: 'always',
				endOfLine: 'lf',
			}),
		);
		add('.prettierignore', 'README.md\nLICENSE\n.gitignore\nnode_modules/\ndist/\ntests/\ncoverage/\n');
	}

	if (!options.polylith) {
		add('package.json', json(makePackage(options, nodeMajor, npmVersion)));
		if (options.testing.enabled) {
			add('src/testing.spec.js', headlessTestingSpec());
			addConfiguredTopic('testing', 'testing-headless');
		}
		return {directories: [...directories], files};
	}

	const root = `src/${options.slug}`;
	add(
		'polylith.json',
		json({
			builds: 'builds',
			multiple: true,
			dest: 'dist',
			src: 'src',
			react: true,
			deployment: {setup: 'server/setup-deployment.js'},
			...(options.repositoryPosture === 'hosting' ? {discover: ['deployed-apps']} : {}),
			...(options.server.socketIo ? {socketIo: true} : {}),
			apps: [
				{
					name: options.slug,
					filename: `${options.slug}.json`,
					default: true,
					mount: options.mount,
				},
			],
		}),
	);
	add('server/setup-deployment.js', deploymentSetup());
	if (options.localHttps?.enabled) {
		add('scripts/create-local-certificate.mjs', localCertificateScript(options.localHttps));
	}
	add(`builds/${options.slug}.json`, json(makeBuild(options, root)));
	add('package.json', json(makePackage(options, nodeMajor, npmVersion)));
	add('.nvmrc', `${nodeMajor}\n`);
	add(`${root}/templates/index.html`, appHtml(options));
	add(`${root}/styles/app.css`, baseCss(options));
	add(`${root}/index.js`, appIndex());
	add(`${root}/spec.js`, specIndex(options));
	add(`${root}/common/AppContext.js`, appContext());
	add(`${root}/common/types.d.ts`, ambientTypes());
	add(`${root}/services/app-context.js`, appContextService(options));
	add(
		`${root}/services/app-context.d.ts`,
		serviceContract('AppContextService', ['get(): AppContextValue', 'setLocale(locale: string): boolean']),
	);
	add(`${root}/services/_tests/AppContextSpec.js`, appContextSpec(options));
	add(`${root}/main/App.jsx`, appComponent(options));
	add(`${root}/main/main.jsx`, mainView(options));
	if (options.testing.enabled) add(`${root}/main/_tests/AppStartupSpec.js`, appStartupSpec(options));

	if (options.mui) {
		add(`${root}/services/theme.js`, themeService());
		add(`${root}/services/theme.d.ts`, serviceContract('ThemeService', ['getTheme(): unknown']));
		if (options.testing.enabled) add(`${root}/services/_tests/ThemeSpec.js`, themeSpec());
	}
	if (options.localization.enabled) {
		add(`${root}/services/localize.js`, localizeService());
		add(
			`${root}/services/localize.d.ts`,
			serviceContract('LocalizeService', [
				'supportsLocale(locale: string): boolean',
				'translate(key: string, replacements?: Record<string, string | number>, cardinal?: number, locale?: string, escapeHtml?: boolean): string',
				'replace(value: string, replacements?: Record<string, string | number>, escapeHtml?: boolean): string',
			]),
		);
		add(`${root}/services/_tests/LocalizeSpec.js`, localizeSpec());
		add(`${root}/phrases/en-US.json`, json(initialPhrases(options)));
	}
	if (options.shell.enabled) {
		add(`${root}/services/app-pages.js`, appPagesService());
		add(
			`${root}/services/app-pages.d.ts`,
			serviceContract('AppPagesService', [
				'add(page: AppPageRecord): AppPageRecord',
				'get(): AppPageRecord[]',
				'getById(id: string): AppPageRecord | null',
				'getBySlug(slug: string): AppPageRecord | null',
				'getDefault(): AppPageRecord | null',
			]),
		);
		add(`${root}/services/_tests/AppPagesSpec.js`, appPagesSpec());
		addAppFeature(add, options, root);
		addConfiguredTopic('app-shell');
		if (options.server.defaultAppRouting) {
			add(`${root}/services/url.js`, urlService());
			add(
				`${root}/services/url.d.ts`,
				serviceContract('UrlService', [
					'stop(): void',
					'getPageSlug(): string',
					'pathForSlug(slug?: string): string',
					'pushPageSlug(slug: string): void',
					'replacePageSlug(slug: string): void',
				]),
			);
			if (options.testing.enabled) add(`${root}/services/_tests/UrlSpec.js`, urlSpec());
		}
		if (options.shell.initialPage) addInitialPage(add, options, root);
	}
	if (options.baseComponents) addBaseComponents(add, root, options);
	if (options.server.enabled) addServer(add, options, root);
	if (options.testing.enabled) {
		add('karma.conf.cjs', karmaConfig(false, false));
		add('karma.watch.conf.cjs', karmaConfig(true, false));
		add('karma-browser-setup.js', karmaBrowserSetup());
		add(`${root}/testing/TestHarness.js`, componentAsset('testing/TestHarness.js'));
		if (options.baseComponents)
			add(`${root}/testing/_tests/TestHarnessSpec.js`, componentAsset('testing/TestHarnessSpec.js'));
		if (options.testing.coverage) {
			add('babel.config.cjs', sourceCoverageBabelConfig(options.slug));
			add('karma.coverage.conf.cjs', karmaConfig(false, true));
			add('scripts/run-src-coverage.mjs', sourceCoverageRunner(options.slug));
		}
		addConfiguredTopic('testing', 'testing-polylith');
	}

	return {directories: [...directories], files};
}

function makePackage(options, nodeMajor, npmVersion) {
	const scripts = {};
	const dependencies = {};
	const devDependencies = {};
	if (options.polylith) {
		Object.assign(dependencies, {
			'@polylith/browser': 'latest',
			'@polylith/builder': 'latest',
			'@polylith/config-store': 'latest',
			'@polylith/core': 'latest',
			nodemon: '^3.0.1',
			polylith: 'latest',
			react: 'latest',
			'react-dom': 'latest',
		});
		Object.assign(scripts, {
			build: 'polylith build --all',
			dev: 'start polylith watch --all -v false&start npm run dev:serve',
			'dev:watch': 'polylith watch --all -v false',
			'dev:serve': 'nodemon',
			start: 'polylith serve --all',
		});
		if (options.localHttps?.enabled) {
			devDependencies.selfsigned = 'latest';
			scripts['certificate:create'] = 'node scripts/create-local-certificate.mjs';
		}
		if (options.mui)
			Object.assign(dependencies, {
				'@emotion/react': 'latest',
				'@emotion/styled': 'latest',
				'@mui/icons-material': 'latest',
				'@mui/material': 'latest',
				'@mui/styled-engine': 'latest',
			});
		if (options.localization.enabled) dependencies['html-react-parser'] = 'latest';
		if (options.server.enabled) Object.assign(dependencies, {express: 'latest'});
		if (options.server.socketIo)
			Object.assign(dependencies, {
				'socket.io': 'latest',
				'socket.io-client': 'latest',
			});
		if (options.server.localizedMarkdown) Object.assign(dependencies, {marked: 'latest'});
		if (options.testing.enabled) {
			Object.assign(devDependencies, {
				'jasmine-core': 'latest',
				karma: 'latest',
				'karma-jasmine': 'latest',
				'karma-chrome-launcher': 'latest',
				'karma-spec-reporter': 'latest',
			});
			const clientTest = `polylith test ${options.slug} && karma start karma.conf.cjs`;
			Object.assign(scripts, {
				test: clientTest,
				karma: 'karma start karma.conf.cjs',
				'karma:watch': 'karma start karma.watch.conf.cjs',
			});
			if (options.server.enabled) {
				scripts['test:client'] = clientTest;
				scripts['test:server'] = `node --test --test-isolation=none server/${options.slug}/spec.js`;
				scripts.test = 'npm run test:client && npm run test:server';
			}
			if (options.testing.coverage) {
				Object.assign(devDependencies, {
					'babel-plugin-istanbul': 'latest',
					'karma-coverage': 'latest',
				});
				scripts['coverage:src'] = 'node scripts/run-src-coverage.mjs';
				if (options.server.enabled) {
					devDependencies.c8 = 'latest';
					scripts['coverage:server'] =
						`c8 --all --include="server/${options.slug}/**/*.js" --exclude="server/${options.slug}/**/_tests/**" --exclude="server/${options.slug}/testing/**" --exclude="server/${options.slug}/spec.js" --reporter=text-summary --reporter=html --reporter=json-summary --reports-dir=coverage/server/${options.slug} node --test --test-isolation=none server/${options.slug}/spec.js`;
					scripts.coverage = 'npm run coverage:src && npm run coverage:server';
				} else scripts.coverage = 'npm run coverage:src';
			}
		}
	} else if (options.testing.enabled) {
		devDependencies.jasmine = 'latest';
		scripts.test = 'jasmine "src/**/*.spec.js"';
		if (options.testing.coverage) {
			devDependencies.c8 = 'latest';
			scripts.coverage =
				'c8 --all --include="src/**/*.js" --exclude="src/**/*.spec.js" --reporter=text-summary --reporter=html --reporter=json-summary --reports-dir=coverage/src jasmine "src/**/*.spec.js"';
		}
	}
	if (options.prettier) {
		devDependencies.prettier = 'latest';
		scripts.format = 'prettier --write .';
		scripts['format:check'] = 'prettier --check .';
	}
	return {
		name: options.projectSlug || options.slug,
		version: '0.0.1',
		private: true,
		description: options.projectName,
		type: 'module',
		engines: {node: `>=${nodeMajor}`},
		packageManager: `npm@${npmVersion}`,
		...(options.polylith
			? {
					nodemonConfig: {
						delay: 2500,
						watch: ['server', 'config'],
						exec: 'npm start',
					},
				}
			: {}),
		scripts,
		dependencies,
		devDependencies,
	};
}

function headlessTestingSpec() {
	return text(`describe('project test setup', () => {
	it('discovers and executes ESM Jasmine specs below src', () => {
		expect(import.meta.url.endsWith('.spec.js')).toBeTrue();
	});
});`);
}

function makeBuild(options, root) {
	const features = ['features/app'];
	if (options.shell.initialPage) features.push(`features/${options.shell.initialPageSlug}`);
	return {
		name: options.slug,
		dest: `dist/${options.slug}`,
		source: root,
		index: `${root}/index.js`,
		spec: `${root}/spec.js`,
		testDest: `tests/${options.slug}`,
		router: options.server.enabled ? `server/${options.slug}/index.js` : undefined,
		routerRoot: options.server.enabled ? options.mount : undefined,
		template: {
			source: `${root}/templates/index.html`,
			destination: `dist/${options.slug}/index.html`,
		},
		css: [{dest: 'styles', cwd: 'styles', glob: '**/*.css', keepNest: true}],
		features,
	};
}

function deploymentSetup() {
	return text(`import {registry} from '@polylith/core';

/**
 * Attach this repository to the installation registry before app routers start.
 *
 * @param {{sharedRegistry: import('@polylith/core').Registry}} context - Polylith deployment context.
 * @param {boolean} isMaster - True during standalone or active-master execution.
 * @returns {Promise<void>} Resolve after repository deployment setup is complete.
 */
export default async function setupDeployment({sharedRegistry}, isMaster) {
	registry.attach('shared', sharedRegistry);
	if (!isMaster) return;
	await sharedRegistry.start();
}`);
}

function appHtml(options) {
	return text(
		`<!doctype html>\n<html lang="en-US">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1">\n\t<base href="./">\n\t<title>${escapeHtml(options.projectName)}</title>\n\t\${mainCss}\n</head>\n<body>\n\t<div id="main-content"></div>\n\t\${codeVariables}\n\t\${scripts}\n</body>\n</html>`,
	);
}
function baseCss(options) {
	const shellCss = !options.shell.enabled
		? ''
		: options.shell.type === 'left-nav'
			? `
.app-shell-left-nav-body { display: grid; grid-template-columns: 16rem minmax(0, 1fr); min-height: 0; }
.app-shell-left-nav-body.is-navigation-collapsed { grid-template-columns: 0 minmax(0, 1fr); }
.app-shell-desktop-drawer { width: 16rem; }
.app-shell-desktop-drawer .MuiDrawer-paper { position: relative; width: 16rem; box-sizing: border-box; }
.app-shell-left-nav-body.is-navigation-collapsed .app-shell-desktop-drawer { visibility: hidden; width: 0; overflow: hidden; }
.app-shell-mobile-menu-button.MuiIconButton-root { display: none; }
.app-shell-navigation { min-width: 16rem; }
@media (max-width: 899.95px) {
	.app-shell-left-nav-body { grid-template-columns: minmax(0, 1fr); }
	.app-shell-desktop-drawer { display: none; }
	.app-shell-desktop-menu-button.MuiIconButton-root { display: none; }
	.app-shell-mobile-menu-button.MuiIconButton-root { display: inline-flex; }
}`
			: options.shell.type === 'top-tabs'
				? `
.app-shell-top-header.MuiAppBar-root { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; }
.app-shell-top-tabs { min-width: 0; }
@media (max-width: 599.95px) {
	.app-shell-top-header.MuiAppBar-root { grid-template-columns: minmax(0, 1fr); }
	.app-shell-top-tabs { width: 100%; }
}`
				: '';
	return text(`:root { font-family: Arial, Helvetica, sans-serif; }
html, body, #main-content { height: 100%; min-height: 100%; margin: 0; }
.app-shell { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100vh; overflow: hidden; }
.app-shell > main, .app-shell-left-nav-body > main { min-width: 0; min-height: 0; overflow: auto; padding: 1rem; }
.app-shell-navigation { padding-block: 0.5rem; }
${shellCss}
.screen-reader-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }`);
}
function appIndex() {
	return text(
		`import {registry} from '@polylith/core';\nimport '@polylith/features';\nimport '@polylith/config';\nimport './main/main.jsx';\n\nawait registry.start();`,
	);
}
function specIndex(options) {
	const specs = ['./main/_tests/AppStartupSpec.js', './services/_tests/AppContextSpec.js'];
	if (options.mui) specs.push('./services/_tests/ThemeSpec.js');
	if (options.server.enabled && options.testing.enabled) specs.push('./services/_tests/IoSpec.js');
	if (options.shell.enabled) {
		specs.push('./services/_tests/AppPagesSpec.js');
		if (options.testing.enabled)
			specs.push(
				'./features/app/_tests/AppControllerSpec.js',
				'./features/app/_tests/AppViewSpec.js',
				'./features/app/_tests/AppShellSpec.js',
			);
		if (options.shell.initialPage && options.testing.enabled)
			specs.push(`./features/${options.shell.initialPageSlug}/_tests/PageFeatureSpec.js`);
	}
	if (options.localization.enabled) specs.push('./services/_tests/LocalizeSpec.js');
	if (options.server.defaultAppRouting) specs.push('./services/_tests/UrlSpec.js');
	if (options.baseComponents) {
		specs.push(
			'./testing/_tests/TestHarnessSpec.js',
			'./components/_tests/FormControlsSpec.js',
			'./components/_tests/FeedbackSpec.js',
			'./components/_tests/BaseDialogSpec.js',
		);
		if (options.localization.enabled) specs.push('./components/_tests/BaseTextSpec.js');
	}
	if (options.server.socketIo) specs.push('./services/_tests/SocketStreamSpec.js');
	if (options.server.localizedMarkdown)
		specs.push('./services/_tests/MarkdownServiceSpec.js', './components/_tests/MarkdownSpec.js');
	return text([`import '../../karma-browser-setup.js';`, ...specs.map((value) => `import '${value}';`)].join('\n'));
}
function appContext() {
	return text(
		`import React from 'react';\n\nexport default React.createContext({registry: null, locale: 'en-US', localize: null, localizationEnabled: false, accessibilityEnabled: false});`,
	);
}
function ambientTypes() {
	return text(`/** Shared Polylith event API implemented by application services. */
type EventBus = import('@polylith/core').EventBus;

/** Translation capability consumed by presentation components. */
interface LocalizationProvider {
	/**
	 * Call this method to resolve a phrase for the current locale.
	 *
	 * @param key - The phrase key to resolve.
	 * @param replacements - Optional named replacement values.
	 * @param cardinal - Optional value used to select a plural form.
	 * @returns - The resolved text, or empty text when the phrase is unavailable.
	 */
	translate(key: string, replacements?: Record<string, string | number>, cardinal?: number, locale?: string, escapeHtml?: boolean): string;
	/** Call this method to determine whether a locale has loaded phrases. @param locale - The candidate locale. @returns - Whether phrases are loaded for the locale. */
	supportsLocale(locale: string): boolean;
	/** Call this method to apply validated replacements to controlled content. @param value - The controlled content. @param replacements - Optional named replacement values. @param escapeHtml - Whether replacement markup is escaped. @returns - The replaced content. */
	replace(value: string, replacements?: Record<string, string | number>, escapeHtml?: boolean): string;
}

/** Global values supplied to React presentation components. */
type AppContextValue = {
	/** Service registry used by the current application. */
	registry: unknown;
	/** Current locale used by client and HTTP services. */
	locale: 'en-US' | string;
	/** Optional localization service available to presentation components. */
	localize: LocalizationProvider | null;
	/** Whether presentation components should interpret configured text as phrase keys. */
	localizationEnabled: boolean;
	/** Whether authored accessibility metadata should be added when native semantics are insufficient. */
	accessibilityEnabled: boolean;
};

/** Page metadata registered with the application shell. */
type AppPageRecord = {
	/** Stable page identifier. */
	id: string;
	/** Literal page label or localization phrase key. */
	label: string;
	/** URL path segment owned by the page. */
	urlSlug: string;
	/** Optional literal label used when localization mode is disabled. */
	literalLabel?: string;
	/** Navigation ordering value. */
	order: number;
	/** Whether the executor selected this page as the application default. */
	default?: boolean;
	/** Registry name of the feature controller that mounts the page. */
	controller: string;
};

/** Presentation state exposed by the app controller through its view service. */
type AppShellState = {
	/** Identifier of the active page, or no selection. */
	activePageId: string | null;
	/** Whether the current URL identifies an unknown page. */
	notFound: boolean;
	/** Controller-mounted presentation for the active page. */
	pageComponent: import('react').ReactNode;
	/** Ordered defensive page metadata. */
	pages: AppPageRecord[];
};`);
}
function appContextService(options) {
	return text(`import {Service} from '@polylith/core';
/** Global application-context owner for registry, locale, localization, and accessibility state. */
export class AppContextService extends Service {
	/** Creates the application-context service. @param {unknown} registry - The owning Polylith registry. */
	constructor(registry) { super('app-context', registry); this.implement(['start', 'get', 'setLocale']); }
	/** Call this method to initialize the context with generated feature flags. */
	start() { this.value = {registry: this.registry, locale: 'en-US', localize: ${options.localization.enabled ? "this.registry.subscribe('localize')" : 'null'}, localizationEnabled: ${options.localization.enabled}, accessibilityEnabled: ${options.accessibility}}; }
	/** Call this method to read a defensive application-context value. @returns {AppContextValue} - The current context. */
	get() { return {...this.value}; }
	/** Call this method to replace the current locale when its phrases are loaded. @param {string} locale - The next locale. @returns {boolean} - Whether the locale changed. */
	setLocale(locale) {
		if (${options.localization.enabled ? '!this.value.localize.supportsLocale(locale)' : "locale !== 'en-US'"}) { console.warn(\`Locale is not loaded: \${locale}\`); return false; }
		if (locale === this.value.locale) return false;
		this.value = {...this.value, locale};
		this.fire('locale', locale);
		this.fire('changed', this.get());
		return true;
	}
}
new AppContextService();`);
}
function appContextSpec(options) {
	const localizeSetup = options.localization.enabled
		? `const localize = {translate: () => '', supportsLocale: (locale) => locale === 'en-US'}; class LocalizeStub extends Service { constructor() { super('localize', registry); this.implement(['translate', 'supportsLocale']); } translate(...args) { return localize.translate(...args); } supportsLocale(locale) { return localize.supportsLocale(locale); } } new LocalizeStub();`
		: 'const localize = null;';
	return text(
		`import {Registry, Service} from '@polylith/core';
import {AppContextService} from '../app-context.js';

describe('app context', () => {
	it('owns defensive locale and generated feature flags', () => {
		const registry = new Registry();
		${localizeSetup}
		const service = new AppContextService(registry);
		service.start();
		const value = service.get();
		expect(value.locale).toBe('en-US');
		expect(value.localize).toBe(${options.localization.enabled ? "registry.subscribe('localize')" : 'localize'});
		expect(value.localizationEnabled).toBe(${options.localization.enabled});
		expect(value.accessibilityEnabled).toBe(${options.accessibility});
		value.locale = 'changed';
		expect(service.get().locale).toBe('en-US');
	});

	it('rejects unloaded locales and publishes a loaded locale change once', () => {
		const registry = new Registry();
		${localizeSetup}
		const service = new AppContextService(registry);
		service.start();
		const listener = jasmine.createSpy('locale');
		const changed = jasmine.createSpy('changed');
		service.listen('locale', listener);
		service.listen('changed', changed);
		spyOn(console, 'warn');
		expect(service.setLocale('fr-CA')).toBeFalse();
		expect(service.get().locale).toBe('en-US');
		expect(console.warn).toHaveBeenCalledWith('Locale is not loaded: fr-CA');
		expect(service.setLocale('en-US')).toBeFalse();
		expect(listener).not.toHaveBeenCalled();
		expect(changed).not.toHaveBeenCalled();
		${options.localization.enabled ? "localize.supportsLocale = (locale) => locale === 'fr-CA'; expect(service.setLocale('fr-CA')).toBeTrue(); expect(service.get().locale).toBe('fr-CA'); expect(listener).toHaveBeenCalledWith('fr-CA'); expect(changed).toHaveBeenCalledWith(service.get());" : ''}
	});
});`,
	);
}

function appComponent(options) {
	const child = options.shell.enabled ? `{registry.subscribe('app-controller').getComponent()}` : 'null';
	return text(`import React, {Component} from 'react';
import AppContext from '../common/AppContext.js';
/** Root React boundary for generated application context and shell presentation. */
export default class App extends Component {
	/** Creates the application context boundary. @param {object} props - React properties containing the application registry. */
	constructor(props) { super(props); this.registry = props.registry; this.state = {context: this.registry.subscribe('app-context').get()}; this.onContextChanged = this.onContextChanged.bind(this); }
	/** Called by React to subscribe to canonical application-context changes. */
	componentDidMount() { this.contextService = this.registry.subscribe('app-context'); this.contextListener = this.contextService.listen('changed', this.onContextChanged); }
	/** Called by React to remove the exact application-context listener. */
	componentWillUnmount() { this.contextService.unlisten('changed', this.contextListener); }
	/** Called by the context service to install its latest defensive value. @param {AppContextValue} context - The next global context value. */
	onContextChanged(context) { this.setState({context}); }
	/** Call this method to render the application context and current shell. @returns {React.ReactNode} - The application presentation. */
	render() { return <AppContext.Provider value={this.state.context}>${child.replaceAll('registry.', 'this.registry.')}</AppContext.Provider>; }
}`);
}
function mainView(options) {
	return text(
		`import React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport {registry} from '@polylith/core';\n${options.mui ? "import CssBaseline from '@mui/material/CssBaseline';\nimport StyledEngineProvider from '@mui/styled-engine/StyledEngineProvider';\nimport {ThemeProvider} from '@mui/material/styles';\nimport '../services/theme.js';" : ''}\n${options.localization.enabled ? "import '../services/localize.js';" : ''}\nimport '../services/app-context.js';\n${options.server.enabled ? "import '../services/io.js';" : ''}\n${options.server.localizedMarkdown ? "import '../services/markdown.js';" : ''}\n${options.server.socketIo ? "import '../services/socket-stream.js';" : ''}\n${options.shell.enabled ? "import '../services/app-pages.js';" : ''}\n${options.server.defaultAppRouting ? "import '../services/url.js';" : ''}\nimport App from './App.jsx';\n\nlet root = null;\n\n/** Call this method to unmount the generated application presentation. */\nexport function stopApplication() { root?.unmount(); root = null; }\n\nregistry.listen('ready', () => {\n\tconst app = <App registry={registry} />;\n\tconst content = ${options.mui ? "<StyledEngineProvider enableCssLayer><ThemeProvider theme={registry.subscribe('theme').getTheme()}><CssBaseline />{app}</ThemeProvider></StyledEngineProvider>" : 'app'};\n\troot = createRoot(document.getElementById('main-content'));\n\troot.render(<React.StrictMode>{content}</React.StrictMode>);\n});`,
	);
}

function appStartupSpec(options) {
	const shellAssertion = options.shell.enabled
		? "expect(registry.subscribe('app-view')).toBeTruthy();"
		: "expect(document.getElementById('main-content')).toBeTruthy();";
	const pageAssertion = options.shell.initialPage
		? `expect(document.getElementById('main-content').textContent).toContain('${escapeJavaScript(options.shell.initialPageName)}');`
		: '';
	const featureImports = options.shell.enabled
		? `import '../../features/app/index.js';${options.shell.initialPage ? `\nimport '../../features/${options.shell.initialPageSlug}/index.js';` : ''}`
		: '';
	return text(`import {act} from 'react';
import {registry} from '@polylith/core';
import {stopApplication} from '../main.jsx';
${featureImports}

describe('application startup', () => {
	it('starts generated services and mounts the configured application root', async () => {
		await act(async () => { await registry.start(); await Promise.resolve(); });
		const context = registry.subscribe('app-context').get();
		expect(context.registry).toBe(registry);
		${shellAssertion}
		${pageAssertion}
		act(() => registry.subscribe('app-context').fire('changed', context));
		act(() => stopApplication());
		act(() => stopApplication());
	});
});`);
}

function themeService() {
	return text(`import {Service} from '@polylith/core';
import {createTheme} from '@mui/material/styles';
/** Application owner of the generated MUI CSS-variable theme. */
export class ThemeService extends Service {
	/** Creates the theme service. @param {unknown} registry - The owning Polylith registry. */
	constructor(registry) { super('theme', registry); this.implement(['start', 'getTheme']); }
	/** Call this method to create the neutral light and dark color schemes. */
	start() { this.theme = createTheme({cssVariables: {colorSchemeSelector: 'class'}, colorSchemes: {light: {palette: {mode: 'light'}}, dark: {palette: {mode: 'dark'}}}}); }
	/** Call this method to read the application MUI theme. @returns {unknown} - The generated MUI theme. */
	getTheme() { return this.theme; }
}
new ThemeService();`);
}

function themeSpec() {
	return text(`import {Registry} from '@polylith/core';
import {ThemeService} from '../theme.js';

describe('theme service', () => {
	it('creates and returns the generated CSS-variable theme', () => {
		const service = new ThemeService(new Registry());
		service.start();
		const theme = service.getTheme();
		expect(theme.colorSchemes.light.palette.mode).toBe('light');
		expect(theme.colorSchemes.dark.palette.mode).toBe('dark');
	});
});`);
}

function localizeService() {
	return text(`import {Service} from '@polylith/core';
import phrases from '../phrases/en-US.json' with {type: 'json'};
/** Call this function to parse a phrase JSON document without hiding configuration failures. @param {string} source - The serialized phrase document. @returns {Record<string, unknown>} - The parsed phrase collection. */
export function parsePhraseJson(source) { const value = JSON.parse(source); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SyntaxError('Phrase JSON must contain an object.'); return value; }
/** Call this function to replace validated named tokens in controlled text. @param {string} value - The text containing named tokens. @param {Record<string, string | number>} replacements - Named replacement values. @param {boolean} escapeHtml - Whether replacement markup characters are escaped. @returns {string} - Text with supported replacements applied. */
export function replaceText(value, replacements = {}, escapeHtml = false) {
	return String(value).replace(/%\\{([^}]+)\\}/g, (_, name) => {
		const replacement = replacements[name];
		if (replacement === undefined) { console.warn(\`Missing replacement: \${name}\`); return ''; }
		if ((typeof replacement !== 'string' && typeof replacement !== 'number') || (typeof replacement === 'number' && !Number.isFinite(replacement))) { console.error(\`Invalid replacement: \${name}\`); return ''; }
		const result = String(replacement);
		return escapeHtml ? result.replace(/[&<>"']/g, (character) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character])) : result;
	});
}
/**
 * Call this function to create a translator for one locale and phrase collection.
 *
 * @param {string} locale - The locale used for plural selection.
 * @param {Record<string, unknown>} source - The phrase values to resolve.
 * @returns {Function} - The configured phrase translator.
 */
export function createTranslator(locale = 'en-US', source = phrases) {
	const pluralRules = new Intl.PluralRules(locale);
	/**
	 * Call this function to resolve one phrase and its replacements.
	 *
	 * @param {string} key - The phrase key to resolve.
	 * @param {Record<string, string | number>} replacements - Named replacement values.
	 * @param {number} [cardinal] - The cardinal value used for plural selection.
	 * @param {boolean} [escapeHtml] - Whether replacement markup characters are escaped.
	 * @returns {string} - The resolved phrase, or empty text when it is unavailable or invalid.
	 */
	function translate(key, replacements = {}, cardinal, escapeHtml = false) {
		let value = source[key];
		if (value === undefined) { console.warn(\`Missing translation: \${key}\`); return ''; }
		if (Array.isArray(value)) { console.warn(\`Unsupported translation value: \${key}\`); return ''; }
		if (value && typeof value === 'object') { if (!Object.hasOwn(value, 'other')) { console.error(\`Plural translation lacks other: \${key}\`); return ''; } value = value[pluralRules.select(Number(cardinal))] ?? value.other; }
		if (typeof value !== 'string') { console.warn(\`Unsupported translation value: \${key}\`); return ''; }
		return replaceText(value, replacements, escapeHtml);
	}
	return translate;
}
/** Locale service that owns the generated en-US translator. */
export class LocalizeService extends Service {
	/** Creates the localization service. @param {unknown} registry - The owning Polylith registry. */
	constructor(registry) { super('localize', registry); this.implement(['start', 'supportsLocale', 'translate', 'replace']); }
	/** Call this method to initialize the loaded translator collection. */
	start() { this.translators = new Map([['en-US', createTranslator('en-US', phrases)]]); }
	/** Call this method to determine whether a locale has loaded phrases. @param {string} locale - The candidate locale. @returns {boolean} - Whether the locale is loaded. */
	supportsLocale(locale) { return this.translators.has(locale); }
	/** Call this method to resolve a phrase through a loaded translator. @param {string} key - The phrase key. @param {Record<string, string | number>} replacements - Named values. @param {number} cardinal - The plural cardinal. @param {string} locale - The requested locale. @param {boolean} escapeHtml - Whether replacement markup is escaped. @returns {string} - The resolved phrase. */
	translate(key, replacements = {}, cardinal, locale = 'en-US', escapeHtml = false) { const translator = this.translators.get(locale); if (!translator) { console.warn(\`Locale is not loaded: \${locale}\`); return ''; } return translator(key, replacements, cardinal, escapeHtml); }
	/** Call this method to apply phrase-compatible replacements to controlled content. @param {string} value - The controlled content. @param {Record<string, string | number>} replacements - Named values. @param {boolean} escapeHtml - Whether replacement markup is escaped. @returns {string} - The replaced content. */
	replace(value, replacements = {}, escapeHtml = false) { return replaceText(value, replacements, escapeHtml); }
}
new LocalizeService();`);
}
function localizeSpec() {
	return text(`import {Registry} from '@polylith/core';
import {createTranslator, LocalizeService, parsePhraseJson, replaceText} from '../localize.js';

describe('localization', () => {
	it('resolves literal phrases, valid replacements, and locale plural forms', () => {
		const translate = createTranslator('en-US', {
			greeting: 'Hello %{name}: %{count}',
			count: {one: 'one item', other: '%{count} items'},
		});
		expect(translate('greeting', {name: 'Ada', count: 2})).toBe('Hello Ada: 2');
		expect(translate('count', {count: 1}, 1)).toBe('one item');
		expect(translate('count', {count: 3}, 3)).toBe('3 items');
		expect(createTranslator('en-US', {fallback: {other: 'fallback'}})('fallback', {}, 1)).toBe('fallback');
	});

	it('supports generated defaults and the registry service facade', () => {
		spyOn(console, 'warn');
		expect(createTranslator()('not-installed')).toBe('');
		const service = new LocalizeService(new Registry());
		service.start();
		expect(service.supportsLocale('en-US')).toBeTrue();
		expect(service.supportsLocale('fr-CA')).toBeFalse();
		expect(service.translate('not-installed')).toBe('');
		expect(service.translate('not-installed', {}, undefined, 'fr-CA')).toBe('');
	});

	it('parses valid phrase JSON and throws for invalid configuration', () => {
		expect(parsePhraseJson('{"message":"Hello"}')).toEqual({message: 'Hello'});
		expect(() => parsePhraseJson('[]')).toThrowError(SyntaxError);
		expect(() => parsePhraseJson('{')).toThrowError(SyntaxError);
	});

	it('warns and returns empty text for a missing phrase', () => {
		spyOn(console, 'warn');
		expect(createTranslator('en-US', {})('missing')).toBe('');
		expect(console.warn).toHaveBeenCalledWith('Missing translation: missing');
	});

	it('requires the plural other value', () => {
		spyOn(console, 'error');
		expect(createTranslator('en-US', {count: {one: 'one'}})('count', {}, 1)).toBe('');
		expect(console.error).toHaveBeenCalledWith('Plural translation lacks other: count');
	});

	it('warns and returns empty text for unsupported phrase values', () => {
		spyOn(console, 'warn');
		const translate = createTranslator('en-US', {number: 12, list: ['value'], empty: null});
		expect(translate('number')).toBe('');
		expect(translate('list')).toBe('');
		expect(translate('empty')).toBe('');
		expect(console.warn).toHaveBeenCalledTimes(3);
	});

	it('warns and removes an unknown replacement', () => {
		spyOn(console, 'warn');
		expect(createTranslator('en-US', {message: 'Hello %{name}'})('message')).toBe('Hello ');
		expect(console.warn).toHaveBeenCalledWith('Missing replacement: name');
	});

	it('logs invalid replacement values and substitutes empty text', () => {
		spyOn(console, 'error');
		const translate = createTranslator('en-US', {message: '%{object}|%{infinite}'});
		expect(translate('message', {object: {}, infinite: Infinity})).toBe('|');
		expect(console.error).toHaveBeenCalledWith('Invalid replacement: object');
		expect(console.error).toHaveBeenCalledWith('Invalid replacement: infinite');
	});

	it('escapes replacement markup for trusted HTML and Markdown paths', () => {
		spyOn(console, 'warn');
		expect(replaceText('Hello %{name}', {name: '<Ada>'}, true)).toBe('Hello &lt;Ada&gt;');
		const service = new LocalizeService(new Registry());
		service.start();
		expect(service.replace('%{value}', {value: '"quoted"'}, true)).toBe('&quot;quoted&quot;');
		expect(replaceText('%{value}')).toBe('');
		expect(replaceText('%{value}', {value: "&'"})).toBe("&'");
		expect(service.replace('%{value}')).toBe('');
	});
});`);
}
function initialPhrases(options) {
	const phrases = {};
	if (options.shell.enabled) {
		phrases['app.title'] = options.projectName;
		phrases['app.pages.empty'] = 'No pages registered';
		phrases['app.pages.not-found'] = 'Page not found';
		phrases['app.navigation.label'] = 'Application pages';
		phrases['app.navigation.collapse'] = 'Collapse navigation';
		phrases['app.navigation.expand'] = 'Expand navigation';
		phrases['app.navigation.open'] = 'Open navigation';
	}
	if (options.shell.initialPage) phrases[`${options.shell.initialPageSlug}.title`] = options.shell.initialPageName;
	if (options.baseComponents) phrases['common.close'] = 'Close';
	return phrases;
}

function appPagesService() {
	return text(`import {Service} from '@polylith/core';
/** Page-metadata registry and ordering owner for the application shell. */
export class AppPagesService extends Service {
	/** Creates the page registry service. @param {unknown} registry - The owning Polylith registry. */
	constructor(registry) { super('app-pages', registry); this.implement(['start', 'add', 'get', 'getById', 'getBySlug', 'getDefault']); }
	/** Call this method to initialize an empty page collection. */
	start() { this.pages = []; }
	/**
	 * Call this method to register or update one validated page record.
	 *
	 * @param {AppPageRecord} page - The page metadata to install.
	 * @returns {AppPageRecord} - A defensive copy of the installed record.
	 * @throws {Error} - When identifiers, URL slugs, or default-page ownership conflict.
	 */
	add(page) {
		if (!page?.id) throw new Error('Page id is required');
		const next = {order: 0, urlSlug: page.id, ...page};
		const slugConflict = this.pages.find((item) => item.id !== next.id && item.urlSlug === next.urlSlug);
		if (slugConflict) throw new Error(\`Duplicate page URL slug: \${next.urlSlug}\`);
		if (next.default && this.pages.some((item) => item.id !== next.id && item.default)) throw new Error('Multiple default pages');
		const index = this.pages.findIndex((item) => item.id === next.id);
		if (index < 0) { this.pages.push(next); this.fire('page-added', {...next}); }
		else { this.pages[index] = {...this.pages[index], ...next}; this.fire('page-updated', {...this.pages[index]}); }
		this.fire('updated', this.get());
		return this.getById(next.id);
	}
	/** Call this method to read ordered defensive page records. @returns {AppPageRecord[]} - The registered pages. */
	get() { return this.pages.map((item) => ({...item})).sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id))); }
	/** Call this method to find a page by its identifier. @param {string} id - The stable page identifier. @returns {AppPageRecord | null} - The matching page or no record. */
	getById(id) { const page = this.pages.find((item) => item.id === id); return page ? {...page} : null; }
	/** Call this method to find a page by its URL slug. @param {string} slug - The page URL slug. @returns {AppPageRecord | null} - The matching page or no record. */
	getBySlug(slug) { const page = this.pages.find((item) => item.urlSlug === slug); return page ? {...page} : null; }
	/** Call this method to read the executor-selected default page. @returns {AppPageRecord | null} - The default page or no record. */
	getDefault() { const page = this.pages.find((item) => item.default); return page ? {...page} : null; }
}
new AppPagesService();`);
}

function appPagesSpec() {
	return text(`import {Registry} from '@polylith/core';
import {AppPagesService} from '../app-pages.js';
describe('app pages', () => {
	it('sorts defensive copies by order and id without inferring a default', () => { const service = new AppPagesService(new Registry()); service.start(); service.add({id: 'later', order: 2}); service.add({id: 'beta', order: 1}); service.add({id: 'alpha', order: 1}); const pages = service.get(); pages[0].id = 'changed'; expect(service.get().map((page) => page.id)).toEqual(['alpha', 'beta', 'later']); expect(service.getDefault()).toBeNull(); expect(service.getById('missing')).toBeNull(); });
	it('updates records and reports the established event names', () => { const service = new AppPagesService(new Registry()); service.start(); const added = jasmine.createSpy('added'); const updated = jasmine.createSpy('updated'); service.listen('page-added', added); service.listen('page-updated', updated); service.add({id: 'one', default: true}); service.add({id: 'one', label: 'One'}); expect(added).toHaveBeenCalled(); expect(updated).toHaveBeenCalled(); expect(service.getById('one').label).toBe('One'); expect(service.getBySlug('one').id).toBe('one'); expect(service.getBySlug('missing')).toBeNull(); expect(service.getDefault().id).toBe('one'); });
	it('rejects invalid configuration', () => { const service = new AppPagesService(new Registry()); service.start(); expect(() => service.add({})).toThrowError(/id/); service.add({id: 'one', urlSlug: 'same', default: true}); expect(() => service.add({id: 'two', urlSlug: 'same'})).toThrowError(/Duplicate/); expect(() => service.add({id: 'two', default: true})).toThrowError(/Multiple/); });
});`);
}

function addAppFeature(add, options, root) {
	add(`${root}/features/app/index.js`, text(`import './controller.js';\nimport './views/app.js';`));
	add(`${root}/features/app/controller.js`, appController(options));
	add(`${root}/features/app/controller.d.ts`, appControllerContract());
	add(`${root}/features/app/views/app.js`, appView(options));
	add(`${root}/features/app/views/app.d.ts`, appViewContract());
	add(`${root}/features/app/components/AppShell.jsx`, appShell(options));
	add(`${root}/features/app/components/types/AppShell.d.ts`, componentContract('AppShell'));
	if (options.testing.enabled) {
		add(`${root}/features/app/_tests/AppControllerSpec.js`, appControllerSpec(options));
		add(`${root}/features/app/_tests/AppViewSpec.js`, appViewSpec(options));
		add(`${root}/features/app/_tests/AppShellSpec.js`, appShellSpec(options));
	}
}

function appController(options) {
	const urlReady = options.server.defaultAppRouting
		? `this.url = this.registry.subscribe('url');\n\t\tthis.urlChanged = () => this.reconcileLocation();\n\t\tthis.urlListener = this.url.listen('changed', this.urlChanged);`
		: `this.url = null;`;
	return text(`import {Service} from '@polylith/core';
/** Controller owner of page selection, mounting, URL reconciliation, and shell state. */
export class AppController extends Service {
	/** Creates the application controller service. @param {unknown} registry - The owning Polylith registry. */
	constructor(registry) { super('app-controller', registry); this.implement(['ready', 'stop', 'getShellState', 'requestPage', 'getComponent']); }
	/** Call this method when registry dependencies are ready for cross-service wiring. */
	ready() {
		this.stop();
		this.pages = this.registry.subscribe('app-pages');
		this.view = this.registry.subscribe('app-view');
		${urlReady}
		this.activePageId = null;
		this.pageComponent = null;
		this.notFound = false;
		this.registryReady = false;
		this.pagesChanged = (pages) => this.onPagesUpdated(pages);
		this.pagesListener = this.pages.listen('updated', this.pagesChanged);
		this.registryReadyChanged = () => { this.registryReady = true; this.reconcileLocation(); };
		this.registryReadyListener = this.registry.listen('ready', this.registryReadyChanged);
		this.reconcileLocation();
	}
	/** Call this method to remove every cross-service listener owned by the controller. */
	stop() {
		if (this.url && this.urlListener) this.url.unlisten('changed', this.urlListener);
		if (this.pages && this.pagesListener) this.pages.unlisten('updated', this.pagesListener);
		if (this.registryReadyListener) this.registry.unlisten('ready', this.registryReadyListener);
		this.urlListener = null; this.pagesListener = null; this.registryReadyListener = null;
	}
	/** Called by the page registry to publish metadata and reconcile selection. @param {AppPageRecord[]} pages - The current ordered pages. */
	onPagesUpdated(pages) { this.fire('pages-updated', pages); const before = this.activePageId; const component = this.pageComponent; const notFound = this.notFound; this.reconcileLocation(); if (before === this.activePageId && component === this.pageComponent && notFound === this.notFound) this.emitState(null); }
	/** Call this method to reconcile the current URL or selection with registered pages. @returns {AppPageRecord | null} - The selected page or no selection. */
	reconcileLocation() {
		${
			options.server.defaultAppRouting
				? `const slug = this.url.getPageSlug();
		if (slug) {
			const page = this.pages.getBySlug(slug);
			if (page) return this.requestPage(page.id, {history: 'none'});
			if (this.registryReady) this.clearSelection(true);
			return null;
		}`
				: `if (this.activePageId) return this.pages.getById(this.activePageId);`
		}
		const page = this.pages.getDefault();
		return page ? this.requestPage(page.id, {history: ${options.server.defaultAppRouting ? "'replace'" : "'none'"}}) : null;
	}
	/**
	 * Call this method to mount a registered page and coordinate browser history.
	 *
	 * @param {string} pageId - The page identifier to select.
	 * @param {object} options - History behavior for the selection.
	 * @returns {AppPageRecord | null} - The mounted page or no selection.
	 * @throws {Error} - When the registered feature controller cannot mount its page.
	 */
	requestPage(pageId, {history = ${options.server.defaultAppRouting ? "'push'" : "'none'"}} = {}) {
		const page = this.pages.getById(pageId);
		if (!page) return null;
		if (this.activePageId === page.id && this.pageComponent) return page;
		const controller = this.registry.subscribe(page.controller);
		if (!controller?.mount) throw new Error(\`Page controller "\${page.controller}" cannot mount page "\${page.id}".\`);
		const component = controller.mount({page});
		if (!component) return null;
		this.activePageId = page.id;
		this.pageComponent = component;
		this.notFound = false;
		${options.server.defaultAppRouting ? `if (history === 'replace') this.url.replacePageSlug(page.urlSlug); else if (history === 'push') this.url.pushPageSlug(page.urlSlug);` : ''}
		this.emitState(page);
		return page;
	}
	/** Called by reconciliation to remove the mounted page and optionally expose a not-found state. @param {boolean} notFound - Whether the URL identifies an unknown page. */
	clearSelection(notFound = false) { this.activePageId = null; this.pageComponent = null; this.notFound = notFound; this.emitState(null); }
	/** Called after selection changes to publish controller-owned presentation state. @param {AppPageRecord | null} page - The newly mounted page or no selection. */
	emitState(page) { const state = this.getShellState(); this.fire('state-changed', state); if (page) this.fire('page-mounted', {component: this.pageComponent, page}); }
	/** Call this method to read current shell presentation state. @returns {AppShellState} - The current shell state. */
	getShellState() { return {activePageId: this.activePageId, notFound: this.notFound, pageComponent: this.pageComponent, pages: this.pages.get()}; }
	/** Call this method to create the application presentation through its view service. @param {object} props - Presentation properties. @returns {React.ReactElement} - The application presentation. */
	getComponent(props = {}) { return this.view.getComponent(props); }
}
new AppController();`);
}

function appView(options) {
	return text(`import React from 'react';
import {Service} from '@polylith/core';
import AppShell from '../components/AppShell.jsx';
/** View service that mediates between the application controller and React shell. */
export class AppView extends Service {
	/** Creates the application view service. @param {unknown} registry - The owning Polylith registry. */
	constructor(registry) { super('app-view', registry); this.implement(['ready', 'stop', 'getComponent', 'getShellState', 'requestPage']); }
	/** Call this method when the controller is ready for event mediation. */
	ready() { this.stop(); this.controller = this.registry.subscribe('app-controller'); this.controllerStateChanged = (state) => this.fire('state-changed', state); this.controllerStateListener = this.controller.listen('state-changed', this.controllerStateChanged); }
	/** Call this method to remove the exact controller event listener. */
	stop() { if (this.controller && this.controllerStateListener) this.controller.unlisten('state-changed', this.controllerStateListener); this.controllerStateListener = null; }
	/** Call this method to create the presentational application shell. @param {object} props - Shell properties. @returns {React.ReactElement} - The application shell element. */
	getComponent(props = {}) { return React.createElement(AppShell, {...props, appView: this, initialState: this.getShellState(), title: '${escapeJavaScript(options.localization.enabled ? 'app.title' : options.projectName)}', titleLiteral: '${escapeJavaScript(options.projectName)}'}); }
	/** Call this method to read shell state owned by the controller. @returns {AppShellState} - The current shell state. */
	getShellState() { return this.controller.getShellState(); }
	/** Call this method to forward page-selection intent to the controller. @param {string} pageId - The requested page identifier. @returns {AppPageRecord | null} - The selected page or no selection. */
	requestPage(pageId) { return this.controller.requestPage(pageId); }
}
new AppView();`);
}

function appControllerContract() {
	return serviceContract('AppController', [
		'getShellState(): AppShellState',
		"requestPage(pageId: string, options?: {history?: 'push' | 'replace' | 'none'}): AppPageRecord | null",
		"getComponent(props?: Record<string, unknown>): import('react').ReactElement",
	]);
}

function appViewContract() {
	return serviceContract('AppView', [
		'getShellState(): AppShellState',
		'requestPage(pageId: string): AppPageRecord | null',
		"getComponent(props?: Record<string, unknown>): import('react').ReactElement",
	]);
}

function appViewSpec(options) {
	return text(`import {Registry, Service} from '@polylith/core';
import {AppView} from '../views/app.js';

class ControllerStub extends Service {
	constructor(registry) { super('app-controller', registry); this.implement(['getShellState', 'requestPage']); this.state = {activePageId: null, notFound: false, pageComponent: null, pages: []}; }
	getShellState() { return this.state; }
	requestPage(pageId) { this.requested = pageId; return {id: pageId}; }
}

describe('app view', () => {
	it('projects controller state, relays events, and forwards selection intent', () => {
		const registry = new Registry();
		const controller = new ControllerStub(registry);
		const view = new AppView(registry);
		const changed = jasmine.createSpy('changed');
		view.listen('state-changed', changed);
		view.ready();
		expect(view.getShellState()).toBe(controller.state);
		expect(view.requestPage('home')).toEqual({id: 'home'});
		expect(controller.requested).toBe('home');
		controller.fire('state-changed', controller.state);
		expect(changed).toHaveBeenCalledWith(controller.state);
		view.ready();
		controller.fire('state-changed', controller.state);
		expect(changed).toHaveBeenCalledTimes(2);
		const component = view.getComponent();
		expect(component.props.appView).toBe(view);
		expect(component.props.initialState).toBe(controller.state);
		expect(component.props.title).toBe('${escapeJavaScript(options.localization.enabled ? 'app.title' : options.projectName)}');
		expect(component.props.titleLiteral).toBe('${escapeJavaScript(options.projectName)}');
		expect(view.getComponent({className: 'custom'}).props.className).toBe('custom');
		view.stop();
		controller.fire('state-changed', controller.state);
		expect(changed).toHaveBeenCalledTimes(2);
		view.stop();
	});
});`);
}

function appControllerSpec(options) {
	const urlClass = options.server.defaultAppRouting
		? `class StubUrl extends Service {
	constructor(registry) { super('url', registry); this.implement(['getPageSlug', 'pushPageSlug', 'replacePageSlug']); this.slug = ''; this.pushed = []; this.replaced = []; }
	getPageSlug() { return this.slug; }
	pushPageSlug(slug) { this.pushed.push(slug); }
	replacePageSlug(slug) { this.replaced.push(slug); }
}`
		: '';
	const urlSetup = options.server.defaultAppRouting ? `const url = new StubUrl(registry);` : `const url = null;`;
	const urlTests = options.server.defaultAppRouting
		? `
	it('preserves unknown URLs and reports a not-found shell state only after registration', () => { const {controller, pages, url} = setup(); pages.add({id: 'home', default: true, controller: 'page-controller'}); url.slug = 'missing'; controller.registryReady = false; controller.reconcileLocation(); expect(controller.getShellState().notFound).toBeFalse(); controller.registryReady = true; controller.reconcileLocation(); expect(controller.getShellState().notFound).toBeTrue(); expect(controller.getShellState().activePageId).toBeNull(); });
	it('delegates push, replace, and URL-owned selection without redundant history', () => { const {controller, pages, url} = setup(); pages.add({id: 'home', label: 'Home', default: true, controller: 'page-controller'}); expect(url.replaced).toEqual(['home']); pages.add({id: 'other', label: 'Other', controller: 'page-controller'}); controller.requestPage('other'); expect(url.pushed).toEqual(['other']); url.slug = 'home'; url.fire('changed'); expect(controller.getShellState().activePageId).toBe('home'); expect(url.pushed).toEqual(['other']); });`
		: `
	it('reconciles an existing in-memory selection without remounting it', () => { const {controller, pages} = setup(); pages.add({id: 'home', default: true, controller: 'page-controller'}); const component = controller.getShellState().pageComponent; expect(controller.reconcileLocation().id).toBe('home'); expect(controller.getShellState().pageComponent).toBe(component); });`;
	return text(`import React from 'react';
import {Registry, Service} from '@polylith/core';
import {AppPagesService} from '../../../services/app-pages.js';
import {AppController} from '../controller.js';
class StubView extends Service { constructor(registry) { super('app-view', registry); this.implement(['getComponent']); this.calls = []; } getComponent(props = {}) { this.calls.push(props); return React.createElement('div', props); } }
class StubPageController extends Service { constructor(registry) { super('page-controller', registry); this.implement(['mount']); } mount({page}) { return page.id === 'empty' ? null : React.createElement('section', {'data-page': page.id}); } }
class BrokenController extends Service { constructor(registry) { super('broken-controller', registry); } }
${urlClass}
function setup() { const registry = new Registry(); const pages = new AppPagesService(registry); pages.start(); const view = new StubView(registry); new StubPageController(registry); new BrokenController(registry); ${urlSetup} const controller = new AppController(registry); controller.ready(); return {controller, pages, registry, url, view}; }
describe('app controller', () => {
	it('owns default selection, mounting, events, and repeat selection', () => { const {controller, pages, registry} = setup(); const mounted = jasmine.createSpy('mounted'); const pageUpdates = jasmine.createSpy('pages'); controller.listen('page-mounted', mounted); controller.listen('pages-updated', pageUpdates); pages.add({id: 'home', label: 'Home', default: true, controller: 'page-controller'}); const state = controller.getShellState(); expect(state.activePageId).toBe('home'); expect(state.pageComponent.type).toBe('section'); expect(state.notFound).toBeFalse(); expect(controller.requestPage('home').id).toBe('home'); expect(mounted).toHaveBeenCalled(); expect(pageUpdates).toHaveBeenCalled(); registry.fire('ready'); expect(controller.registryReady).toBeTrue(); });
	it('leaves selection unset when no executor-selected default exists', () => { const {controller, pages} = setup(); pages.add({id: 'optional', label: 'Optional', controller: 'page-controller'}); expect(controller.getShellState().activePageId).toBeNull(); });
	it('handles missing pages, unavailable mounts, empty mounts, and explicit clearing', () => { const {controller, pages} = setup(); expect(controller.requestPage('missing')).toBeNull(); pages.add({id: 'missing-service', controller: 'missing-controller'}); expect(() => controller.requestPage('missing-service')).toThrowError(/cannot mount/); pages.add({id: 'broken', controller: 'broken-controller'}); expect(() => controller.requestPage('broken')).toThrowError(/cannot mount/); pages.add({id: 'empty', controller: 'page-controller'}); expect(controller.requestPage('empty')).toBeNull(); controller.clearSelection(); expect(controller.getShellState().notFound).toBeFalse(); controller.clearSelection(true); expect(controller.getShellState().notFound).toBeTrue(); });
	it('creates application presentation through its view service and cleans up exact listeners', () => { const {controller, pages, registry, url, view} = setup(); expect(controller.getComponent().type).toBe('div'); expect(controller.getComponent({id: 'root'}).props.id).toBe('root'); expect(view.calls).toEqual([{}, {id: 'root'}]); const stateChanged = jasmine.createSpy('state'); controller.listen('state-changed', stateChanged); pages.add({id: 'one', controller: 'page-controller'}); expect(stateChanged).toHaveBeenCalled(); controller.stop(); const count = stateChanged.calls.count(); pages.fire('updated', pages.get()); registry.fire('ready'); ${options.server.defaultAppRouting ? "url.fire('changed');" : ''} expect(stateChanged.calls.count()).toBe(count); controller.stop(); });${urlTests}
});`);
}

function appShellSpec(options) {
	const navigationTest =
		options.shell.type === 'left-nav'
			? `
	it('renders MUI navigation state and delegates selection through the app view', () => { const view = new AppViewStub(state()); harness = createTestHarness().withContext({accessibilityEnabled: true, localizationEnabled: true, locale: 'en-US', localize: {translate: (value) => \`Localized \${value}\`}}); const result = harness.render(AppShell, {appView: view, initialState: view.state, title: 'app.title'}); expect(result.query('header h1').textContent).toBe('Localized app.title'); expect(result.query('nav').getAttribute('aria-label')).toBe('Localized app.navigation.label'); const buttons = result.queryAll('.MuiListItemButton-root'); expect(buttons[0].classList.contains('Mui-selected')).toBeTrue(); expect(buttons[1].textContent).toBe('Localized second.label'); harness.click(buttons[1]); expect(view.requested).toEqual(['second']); });
	it('collapses and restores permanent desktop navigation', () => { const view = new AppViewStub(state()); harness = createTestHarness().withContext({accessibilityEnabled: true}); const result = harness.render(AppShell, {appView: view, initialState: view.state, title: 'Test App'}); const menu = result.query('.app-shell-desktop-menu-button'); expect(menu.getAttribute('aria-label')).toBe('Collapse navigation'); expect(menu.getAttribute('aria-expanded')).toBe('true'); harness.click(menu); expect(result.query('.app-shell-left-nav-body').classList.contains('is-navigation-collapsed')).toBeTrue(); expect(menu.getAttribute('aria-label')).toBe('Expand navigation'); expect(menu.getAttribute('aria-expanded')).toBe('false'); harness.click(menu); expect(result.query('.app-shell-left-nav-body').classList.contains('is-navigation-expanded')).toBeTrue(); });
	it('opens and closes the temporary drawer and tolerates an unavailable localizer', () => { const view = new AppViewStub(state()); harness = createTestHarness().withContext({localizationEnabled: true, localize: null}); const result = harness.render(AppShell, {appView: view, initialState: view.state, title: 'Test App'}); expect(result.query('.MuiListItemButton-root').textContent).toBe(''); const menu = result.query('.app-shell-mobile-menu-button'); expect(menu.hasAttribute('aria-label')).toBeFalse(); harness.click(menu); const backdrop = result.queryDocument('.MuiBackdrop-root'); expect(backdrop).not.toBeNull(); harness.click(backdrop); });`
			: options.shell.type === 'top-tabs'
				? `
	it('renders localized scrollable MUI tabs and delegates selection through the app view', () => { const view = new AppViewStub(state()); harness = createTestHarness().withContext({accessibilityEnabled: true, localizationEnabled: true, localize: {translate: (value) => 'Localized ' + value}}); const result = harness.render(AppShell, {appView: view, initialState: view.state, title: 'app.title'}); const tabs = result.queryAll('[role="tab"]'); expect(result.query('[role="tablist"]').getAttribute('aria-label')).toBe('Localized app.navigation.label'); expect(tabs[0].getAttribute('aria-selected')).toBe('true'); expect(tabs[1].textContent).toBe('Localized second.label'); harness.click(tabs[1]); expect(view.requested).toEqual(['second']); });
	it('renders literal tab labels without optional accessibility', () => { const view = new AppViewStub(state()); harness = createTestHarness(); const result = harness.render(AppShell, {appView: view, initialState: view.state, title: 'Test App'}); expect(result.query('[role="tablist"]').hasAttribute('aria-label')).toBeFalse(); expect(result.queryAll('[role="tab"]')[1].textContent).toBe('second.label'); });
	it('renders no invented label when localization is unavailable', () => { const view = new AppViewStub(state()); harness = createTestHarness().withContext({localizationEnabled: true, localize: null}); const result = harness.render(AppShell, {appView: view, initialState: view.state, title: 'Test App'}); expect(result.queryAll('[role="tab"]')[0].textContent).toBe(''); });`
				: '';
	const emptyText =
		options.shell.type === 'app-directed'
			? `expect(result.query('main').textContent).toBe('');`
			: `expect(result.query('main').textContent).toBe('No pages registered');`;
	return text(`import React, {act} from 'react';
import AppShell from '../components/AppShell.jsx';
import {createTestHarness} from '../../../testing/TestHarness.js';
class AppViewStub {
	constructor(initialState) { this.state = initialState; this.requested = []; this.listener = null; this.unlistened = false; }
	listen(_event, listener) { this.listener = listener; return listener; }
	unlisten(_event, listener) { this.unlistened = listener === this.listener; }
	getShellState() { return this.state; }
	requestPage(pageId) { this.requested.push(pageId); return this.state.pages.find((page) => page.id === pageId) || null; }
	emit(nextState) { this.state = nextState; act(() => this.listener(nextState)); }
}
const state = () => ({activePageId: 'first', notFound: false, pageComponent: <section>First page</section>, pages: [{id: 'first', label: 'first.label'}, {id: 'second', label: 'second.label'}]});
describe('app shell', () => {
	let harness;
	afterEach(() => harness?.unmount());${navigationTest}
	it('renders controller-owned page state and reacts to view events', () => { const view = new AppViewStub(state()); harness = createTestHarness(); const result = harness.render(AppShell, {appView: view, initialState: view.state, title: 'Test App'}); expect(result.query('main').textContent).toBe('First page'); view.emit({...state(), activePageId: null, pageComponent: null, notFound: true}); expect(result.query('main').textContent).toBe('Page not found'); view.emit({activePageId: null, pageComponent: null, pages: [], notFound: false}); ${emptyText} harness.unmount(); expect(view.unlistened).toBeTrue(); harness = null; });
});`);
}

function initialPageSpec(id, options) {
	return text(`import {Registry} from '@polylith/core';
import {AppPagesService} from '../../../services/app-pages.js';
import {PageController} from '../controller.js';
import {PageView} from '../views/page.js';
import Page from '../components/Page.jsx';
import {createTestHarness} from '../../../testing/TestHarness.js';
describe('initial page feature', () => {
	it('registers metadata in its controller and renders through its view service', () => { const registry = new Registry(); const pages = new AppPagesService(registry); pages.start(); const view = new PageView(registry); const controller = new PageController(registry); controller.ready(); const page = pages.getById('${id}'); expect(page.controller).toBe('${id}-controller'); expect(page.default).toBeTrue(); expect(page.literalLabel).toBe('${escapeJavaScript(options.shell.initialPageName)}'); const component = controller.mount(); expect(component.props.pageView).toBe(view); expect(view.getComponent().props.pageView).toBe(view); expect(view.getComponent({page}).props.page).toBe(page); let harness = createTestHarness(); let result = harness.render(Page, component.props); expect(result.query('h1').textContent).toBe('${escapeJavaScript(options.shell.initialPageName)}'); harness.unmount(); ${options.localization.enabled ? `harness = createTestHarness().withContext({localizationEnabled: true, localize: {translate: (key, _replacements, _cardinal, locale) => key === '${id}.title' && locale === 'en-US' ? '${escapeJavaScript(options.shell.initialPageName)}' : ''}}); result = harness.render(Page, component.props); expect(result.query('h1').textContent).toBe('${escapeJavaScript(options.shell.initialPageName)}'); harness.unmount(); harness = createTestHarness().withContext({localizationEnabled: true, localize: null}); result = harness.render(Page, component.props); expect(result.query('h1').textContent).toBe(''); harness.unmount();` : ''} });
});`);
}

function appShell(options) {
	const imports =
		options.shell.type === 'left-nav'
			? `import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';`
			: options.shell.type === 'top-tabs'
				? `import AppBar from '@mui/material/AppBar';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';`
				: '';
	const initialState =
		options.shell.type === 'left-nav'
			? '{...props.initialState, desktopNavigationOpen: true, mobileDrawerOpen: false}'
			: '{...props.initialState}';
	const labelMethod = `/** Called by shell rendering to resolve a literal label or phrase key. @param {string} value - The configured display text. @param {string} fallback - Literal text used when localization mode is disabled. @returns {string} - The display text. */
	resolveText(value, fallback = value) { return this.context.localizationEnabled ? this.context.localize?.translate(value, {}, undefined, this.context.locale) ?? '' : fallback; }`;
	const requestMethod =
		options.shell.type === 'left-nav'
			? `/** Called by navigation controls to report page-selection intent and close temporary navigation. @param {AppPageRecord} page - The requested page. */
	requestPage(page) { this.props.appView.requestPage(page.id); this.setState({mobileDrawerOpen: false}); }`
			: '';
	return text(`import React, {Component} from 'react';
${imports}
import AppContext from '../../../common/AppContext.js';
/** Presentational application shell driven entirely by its view service and controller-owned state. */
export default class AppShell extends Component {
	static contextType = AppContext;
	/** Creates a shell with the initial controller-owned page state. @param {object} props - The shell properties. */
	constructor(props) { super(props); this.state = ${initialState}; this.onStateChanged = this.onStateChanged.bind(this); }
	/** Called by React to subscribe to view-mediated shell state. */
	componentDidMount() { this.stateListener = this.props.appView.listen('state-changed', this.onStateChanged); this.onStateChanged(this.props.appView.getShellState()); }
	/** Called by React to remove the exact view-service listener. */
	componentWillUnmount() { this.props.appView.unlisten('state-changed', this.stateListener); }
	/** Called by the view service to install the latest controller-owned shell state. @param {AppShellState} state - The next shell state. */
	onStateChanged(state) { this.setState(state); }
	${labelMethod}
	${requestMethod}
	/** Called by shell variants to render mounted, missing, or empty page state. @returns {React.ReactNode} - The current page presentation. */
	renderContent() { return this.state.pageComponent || (this.state.notFound ? <p>{this.resolveText('${options.localization.enabled ? 'app.pages.not-found' : 'Page not found'}', 'Page not found')}</p> : ${options.shell.type === 'app-directed' ? 'null' : `<p>{this.resolveText('${options.localization.enabled ? 'app.pages.empty' : 'No pages registered'}', 'No pages registered')}</p>`}); }
	${shellRender(options.shell.type, options.localization.enabled)}
}`);
}

function shellRender(type, localization) {
	if (type === 'left-nav')
		return `/** Called by the shell to render desktop and temporary navigation content. @returns {React.ReactNode} - The page navigation. */
	renderNavigation(id) { return <nav aria-label={this.context.accessibilityEnabled ? this.resolveText('${localization ? 'app.navigation.label' : 'Application pages'}', 'Application pages') : undefined} className="app-shell-navigation" id={id}><List>{this.state.pages.map((page) => <ListItem disablePadding key={page.id}><ListItemButton aria-current={this.context.accessibilityEnabled && this.state.activePageId === page.id ? 'page' : undefined} onClick={() => this.requestPage(page)} selected={this.state.activePageId === page.id}><ListItemText primary={this.resolveText(page.label, page.literalLabel ?? page.label)} /></ListItemButton></ListItem>)}</List></nav>; }
	/** Call this method to render the responsive left-navigation shell. @returns {React.ReactNode} - The shell presentation. */
	render() { const desktopOpen = this.state.desktopNavigationOpen; return <Box className="app-shell app-shell-left-nav"><AppBar component="header" position="static"><Toolbar><IconButton aria-controls={this.context.accessibilityEnabled ? 'app-shell-desktop-navigation' : undefined} aria-expanded={this.context.accessibilityEnabled ? desktopOpen : undefined} aria-label={this.context.accessibilityEnabled ? (desktopOpen ? this.resolveText('${localization ? 'app.navigation.collapse' : 'Collapse navigation'}', 'Collapse navigation') : this.resolveText('${localization ? 'app.navigation.expand' : 'Expand navigation'}', 'Expand navigation')) : undefined} className="app-shell-menu-button app-shell-desktop-menu-button" color="inherit" edge="start" onClick={() => this.setState({desktopNavigationOpen: !desktopOpen})}><MenuIcon /></IconButton><IconButton aria-controls={this.context.accessibilityEnabled ? 'app-shell-mobile-navigation' : undefined} aria-expanded={this.context.accessibilityEnabled ? this.state.mobileDrawerOpen : undefined} aria-label={this.context.accessibilityEnabled ? this.resolveText('${localization ? 'app.navigation.open' : 'Open navigation'}', 'Open navigation') : undefined} className="app-shell-menu-button app-shell-mobile-menu-button" color="inherit" edge="start" onClick={() => this.setState({mobileDrawerOpen: true})}><MenuIcon /></IconButton><Typography component="h1" variant="h6">{this.resolveText(this.props.title, this.props.titleLiteral)}</Typography></Toolbar></AppBar><div className={\`app-shell-left-nav-body \${desktopOpen ? 'is-navigation-expanded' : 'is-navigation-collapsed'}\`}><Drawer className="app-shell-desktop-drawer" variant="permanent">{this.renderNavigation('app-shell-desktop-navigation')}</Drawer><Drawer className="app-shell-mobile-drawer" onClose={() => this.setState({mobileDrawerOpen: false})} open={this.state.mobileDrawerOpen} variant="temporary">{this.renderNavigation('app-shell-mobile-navigation')}</Drawer><main>{this.renderContent()}</main></div></Box>; }`;
	if (type === 'top-tabs')
		return `/** Call this method to render the responsive top-tab shell. @returns {React.ReactNode} - The shell presentation. */
	render() { return <div className="app-shell app-shell-top-tabs-layout"><AppBar className="app-shell-top-header" component="header" position="static"><Toolbar><Typography component="h1" variant="h6">{this.resolveText(this.props.title, this.props.titleLiteral)}</Typography></Toolbar><Tabs aria-label={this.context.accessibilityEnabled ? this.resolveText('${localization ? 'app.navigation.label' : 'Application pages'}', 'Application pages') : undefined} className="app-shell-top-tabs" onChange={(_event, pageId) => this.props.appView.requestPage(pageId)} scrollButtons="auto" value={this.state.activePageId || false} variant="scrollable">{this.state.pages.map((page) => <Tab key={page.id} label={this.resolveText(page.label, page.literalLabel ?? page.label)} value={page.id} />)}</Tabs></AppBar><main>{this.renderContent()}</main></div>; }`;
	return `/** Call this method to render the app-directed shell. @returns {React.ReactNode} - The shell presentation. */
	render() { return <div className="app-shell app-shell-directed"><main>{this.renderContent()}</main></div>; }`;
}

function urlService() {
	return text(`import {Service} from '@polylith/core';
/** Browser-history service that owns deployment-aware page URL parsing and writes. */
export class UrlService extends Service {
	/** Creates the URL service. @param {unknown} registry - The owning Polylith registry. */
	constructor(registry) { super('url', registry); this.implement(['ready', 'stop', 'getPageSlug', 'pathForSlug', 'pushPageSlug', 'replacePageSlug']); }
	/** Call this method when browser event wiring can be installed. */
	ready() { this.stop(); this.popState = () => this.fire('changed', {pageSlug: this.getPageSlug()}); window.addEventListener('popstate', this.popState); }
	/** Call this method to remove the exact browser-history listener. */
	stop() { if (this.popState) window.removeEventListener('popstate', this.popState); this.popState = null; }
	/** Called by URL operations to obtain the deployment-aware base path. @returns {string} - The application base path. */
	basePath() { return new URL(document.baseURI).pathname.replace(/\\/$/, ''); }
	/** Call this method to read the first page slug relative to the deployment base. @returns {string} - The decoded page slug or empty text. */
	getPageSlug() { const base = this.basePath(); const path = location.pathname; const relative = path === base ? '' : path.startsWith(\`${'${base}'}/\`) ? path.slice(base.length + 1) : path.replace(/^\\/+/, ''); const segment = relative.split('/')[0]; return segment ? decodeURIComponent(segment) : ''; }
	/** Call this method to build an application-relative path. @param {string} slug - The page slug. @returns {string} - The encoded application path. */
	pathForSlug(slug = '') { const clean = String(slug).replace(/^\\/+|\\/+$/g, ''); return clean ? \`${'${this.basePath()}'}/${'${encodeURIComponent(clean)}'}\` : \`${'${this.basePath()}'}/\`; }
	/** Call this method to push a page slug into browser history. @param {string} slug - The page slug. */
	pushPageSlug(slug) { this.write(slug, 'pushState'); }
	/** Call this method to replace the current page slug in browser history. @param {string} slug - The page slug. */
	replacePageSlug(slug) { this.write(slug, 'replaceState'); }
	/** Called by public history operations to avoid redundant writes. @param {string} slug - The page slug. @param {'pushState' | 'replaceState'} method - The history method. */
	write(slug, method) { const path = this.pathForSlug(slug); if (location.pathname !== path) history[method]({}, '', path); }
}
new UrlService();`);
}

function urlSpec() {
	return text(`import {Registry} from '@polylith/core';
import {UrlService} from '../url.js';

describe('URL service', () => {
	let originalPath;
	let base;
	let service;

	beforeEach(() => {
		originalPath = location.pathname;
		base = document.createElement('base');
		base.href = '/deployable/';
		document.head.append(base);
		service = new UrlService(new Registry());
	});

	afterEach(() => {
		service.stop();
		history.replaceState({}, '', originalPath);
		base.remove();
	});

	it('parses root, app-relative, and outside paths', () => {
		history.replaceState({}, '', '/deployable');
		expect(service.getPageSlug()).toBe('');
		history.replaceState({}, '', '/deployable/hello%20world/detail');
		expect(service.getPageSlug()).toBe('hello world');
		history.replaceState({}, '', '/outside');
		expect(service.getPageSlug()).toBe('outside');
	});

	it('derives standalone and composed deployment roots from the document base', () => {
		base.href = '/';
		history.replaceState({}, '', '/home');
		expect(service.basePath()).toBe('');
		expect(service.getPageSlug()).toBe('home');
		expect(service.pathForSlug('other')).toBe('/other');
		base.href = '/deployable/';
		history.replaceState({}, '', '/deployable/home');
		expect(service.basePath()).toBe('/deployable');
		expect(service.getPageSlug()).toBe('home');
		expect(service.pathForSlug('other')).toBe('/deployable/other');
	});

	it('builds and writes normalized paths without redundant history', () => {
		expect(service.pathForSlug()).toBe('/deployable/');
		expect(service.pathForSlug('/hello world/')).toBe('/deployable/hello%20world');
		spyOn(history, 'pushState').and.callThrough();
		spyOn(history, 'replaceState').and.callThrough();
		service.pushPageSlug('home');
		expect(history.pushState).toHaveBeenCalled();
		service.pushPageSlug('home');
		expect(history.pushState).toHaveBeenCalledTimes(1);
		service.replacePageSlug('other');
		expect(history.replaceState).toHaveBeenCalled();
	});

	it('publishes popstate changes and removes its listener', () => {
		const changed = jasmine.createSpy('changed');
		service.listen('changed', changed);
		service.ready();
		service.ready();
		history.replaceState({}, '', '/deployable/home');
		window.dispatchEvent(new PopStateEvent('popstate'));
		expect(changed).toHaveBeenCalledWith({pageSlug: 'home'});
		service.stop();
		window.dispatchEvent(new PopStateEvent('popstate'));
		expect(changed).toHaveBeenCalledTimes(1);
		service.stop();
	});
});`);
}

function addInitialPage(add, options, root) {
	const id = options.shell.initialPageSlug;
	const label = options.localization.enabled ? `${id}.title` : options.shell.initialPageName;
	const feature = `${root}/features/${id}`;
	add(`${feature}/index.js`, text(`import './controller.js';\nimport './views/page.js';`));
	add(
		`${feature}/controller.js`,
		text(`import {Service} from '@polylith/core';
/** Feature controller that registers and mounts the generated initial page. */
export class PageController extends Service {
	/** Creates the initial-page controller. @param {unknown} registry - The owning Polylith registry. */
	constructor(registry) { super('${id}-controller', registry); this.implement(['ready', 'mount']); }
	/** Call this method when the view and page registry are ready for registration. */
	ready() {
		this.view = this.registry.subscribe('${id}-view');
		this.registry.subscribe('app-pages').add({
			id: '${id}',
			label: '${escapeJavaScript(label)}',
			literalLabel: '${escapeJavaScript(options.shell.initialPageName)}',
			urlSlug: '${id}',
			order: 0,
			default: true,
			controller: this.serviceName,
		});
	}
	/** Call this method to mount the initial page through its view service. @param {object} props - The page properties. @returns {React.ReactElement} - The mounted page. */
	mount(props = {}) { return this.view.getComponent(props); }
}
new PageController();`),
	);
	add(
		`${feature}/controller.d.ts`,
		serviceContract('PageController', ["mount(props?: Record<string, unknown>): import('react').ReactElement"]),
	);
	add(
		`${feature}/views/page.js`,
		text(`import React from 'react';
import {Service} from '@polylith/core';
import Page from '../components/Page.jsx';
/** View service that creates the initial-page React presentation. */
export class PageView extends Service {
	/** Creates the initial-page view service. @param {unknown} registry - The owning Polylith registry. */
	constructor(registry) { super('${id}-view', registry); this.implement(['getComponent']); }
	/** Call this method to create the initial-page presentation. @param {object} props - The page properties. @returns {React.ReactElement} - The page element. */
	getComponent(props = {}) { return React.createElement(Page, {...props, pageView: this}); }
}
new PageView();`),
	);
	add(
		`${feature}/views/page.d.ts`,
		serviceContract('PageView', ["getComponent(props?: Record<string, unknown>): import('react').ReactElement"]),
	);
	add(
		`${feature}/components/Page.jsx`,
		text(
			options.localization.enabled
				? `import React, {useContext} from 'react';\nimport AppContext from '../../../common/AppContext.js';\n/** Call this component to render the generated semantic starter page. @returns {React.ReactElement} - The starter page. */\nexport default function Page() { const context = useContext(AppContext); const heading = context.localizationEnabled ? context.localize?.translate('${id}.title', {}, undefined, context.locale) ?? '' : '${escapeJavaScript(options.shell.initialPageName)}'; return <section><h1>{heading}</h1></section>; }`
				: `import React from 'react';\n/** Call this component to render the generated semantic starter page. @returns {React.ReactElement} - The starter page. */\nexport default function Page() { return <section><h1>${escapeHtml(options.shell.initialPageName)}</h1></section>; }`,
		),
	);
	add(
		`${feature}/components/types/Page.d.ts`,
		text(
			`/** Generated semantic starter-page component. */\ndeclare function Page(): import('react').ReactElement;\nexport default Page;`,
		),
	);
	if (options.testing.enabled) add(`${feature}/_tests/PageFeatureSpec.js`, initialPageSpec(id, options));
}

function addBaseComponents(add, root, options) {
	if (options.localization.enabled) {
		add(`${root}/components/BaseText.jsx`, baseText());
		add(
			`${root}/components/Text.jsx`,
			text(
				`import React from 'react';\nimport BaseText from './BaseText.jsx';\n/** Call this component to render text with localization enabled. @param {object} props - The text properties. @returns {React.ReactElement} - The localized text presentation. */\nexport default function Text(props) { return <BaseText localize {...props} />; }`,
			),
		);
		add(`${root}/components/_tests/BaseTextSpec.js`, componentAsset('tests/BaseTextSpec.js'));
	}
	add(`${root}/components/component-text.js`, componentAsset('component-text.js'));
	add(`${root}/components/BaseTextInput.jsx`, componentAsset('BaseTextInput.jsx'));
	add(`${root}/components/TextInput.jsx`, concrete('BaseTextInput'));
	add(`${root}/components/BaseSelect.jsx`, componentAsset('BaseSelect.jsx'));
	add(`${root}/components/Select.jsx`, concrete('BaseSelect'));
	for (const name of [
		'BaseCheckbox',
		'BaseRadioButtons',
		'BaseButton',
		'BaseHelperText',
		'BaseFormMessage',
		'BaseDialog',
	]) {
		add(`${root}/components/${name}.jsx`, componentAsset(`${name}.jsx`));
	}
	for (const name of ['FormControlsSpec', 'FeedbackSpec', 'BaseDialogSpec']) {
		add(`${root}/components/_tests/${name}.js`, componentAsset(`tests/${name}.js`));
	}
	const names = [
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
	];
	if (options.localization.enabled) names.push('BaseText', 'Text');
	for (const name of names)
		add(
			`${root}/components/types/${name}.d.ts`,
			name === 'BaseDialog' ? baseDialogContract() : componentContract(name),
		);
}
function baseDialogContract() {
	return text(`/**
 * Semantic purpose of a declarative dialog action.
 *
 * - **"cancel"** - The action reports cancellation intent.
 * - **"confirm"** - The action reports confirmation intent.
 */
type BaseDialogActionIntent = 'cancel' | 'confirm';
/** Declarative dialog action state. */
type BaseDialogAction = {
	/** Stable action identifier. */
	readonly id: string;
	/** Literal label or localization phrase key. */
	readonly label: string;
	/** Optional workflow-neutral callback classification. */
	readonly intent?: BaseDialogActionIntent;
	/** Whether activation is permitted. */
	readonly enabled?: boolean;
	/** Whether the action is omitted from presentation. */
	readonly hidden?: boolean;
	/** Visual action priority. */
	readonly priority?: 'primary' | 'secondary';
	/** Whether the action exposes a pressed state. */
	readonly pressable?: boolean;
	/** Current pressed state for a pressable action. */
	readonly pressed?: boolean;
};
/** Child-facing presentation controller for declarative dialog updates. */
type BaseDialogController = {
	setTitle(value: unknown): void;
	setDescription(value: unknown): void;
	setActionState(id: string, patch: Partial<BaseDialogAction>): void;
	announce(value: unknown): void;
	submit(): void;
};
/** Public properties consumed by BaseDialog. */
type BaseDialogProps = {
	readonly open: boolean;
	readonly title?: unknown;
	readonly description?: unknown;
	readonly actions?: readonly BaseDialogAction[];
	readonly children?: import('react').ReactNode | ((dialog: BaseDialogController) => import('react').ReactNode);
	readonly localize?: boolean;
	readonly resetToken?: unknown;
	readonly showClose?: boolean;
	readonly closeLabel?: string;
	readonly titleId?: string;
	readonly descriptionId?: string;
	readonly onAction?: (id: string) => void;
	readonly onClose?: (reason: string) => void;
	readonly onCancel?: (id: string) => void;
	readonly onConfirm?: (id: string) => void;
};
/** BaseDialog React presentation component. */
declare class BaseDialog extends import('react').Component<BaseDialogProps> {}
export default BaseDialog;`);
}
function baseText() {
	return text(`import React, {Component} from 'react';
import parse from 'html-react-parser';
import AppContext from '../common/AppContext.js';
/** Semantic text building block with opt-in localization and trusted HTML rendering. */
export default class BaseText extends Component {
	static contextType = AppContext;
	/** Called by rendering to resolve literal text or a localization phrase. @returns {string} - The resolved text. */
	getContent() { const {value, phrase, replacements, cardinal, localize = false, html = false} = this.props; return localize && this.context.localizationEnabled ? this.context.localize?.translate(phrase ?? value, replacements, cardinal, this.context.locale, html) ?? '' : String(value ?? phrase ?? ''); }
	/** Call this method to render semantic text when content is available. @returns {React.ReactNode} - The semantic text or no content. */
	render() { const {value, phrase, replacements, cardinal, localize, html = false, as: Element = 'span', ...props} = this.props; const content = this.getContent(); if (!content) return null; return <Element {...props}>{html ? parse(content) : content}</Element>; }
}`);
}
function concrete(base) {
	return text(
		`import React from 'react';\nimport ${base} from './${base}.jsx';\n/** Call this component to render ${base} with localization enabled. @param {object} props - The component properties. @returns {React.ReactElement} - The localized component presentation. */\nexport default function ${base.replace(/^Base/, '')}(props) { return <${base} localize {...props} />; }`,
	);
}

function addServer(addToPlan, options, root) {
	const add = (filename, content) =>
		addToPlan(filename.startsWith('server/') ? `server/${options.slug}/${filename.slice(7)}` : filename, content);
	add(
		'server/common/types.d.ts',
		text(
			`/** Shared Polylith event API implemented by server services. */\ntype EventBus = import('@polylith/core').EventBus;`,
		),
	);
	add(
		'server/index.js',
		text(
			`import {registry} from '@polylith/core';\nimport './services/routers.js';\n${options.server.socketIo ? "import './services/socket-stream.js';\n" : ''}import './features/index.js';\n/** Call this router to start server services and install their ordered routes. @param {unknown} express - The Express module. @param {unknown} router - The Polylith router. @param {unknown} app - The Polylith server application. @param {import('@polylith/core').Registry} sharedRegistry - The installation registry supplied by Polylith. @returns {Promise<boolean>} - True after route installation completes. */\nexport default async function mainRouter(express, router, app, sharedRegistry) { if (!sharedRegistry) throw new Error('Polylith did not provide the shared registry.'); registry.attach('shared', sharedRegistry); await registry.start(); ${options.server.socketIo ? `const socketIo = await app.getSocketIo(); if (!socketIo) throw new Error('Polylith did not provide the configured Socket.IO server.'); registry.subscribe('${options.slug}-socket-stream').setup(socketIo); ` : ''}for (const name of registry.subscribe('routers').get()) registry.subscribe(name).routes(express, router, app); return true; }`,
		),
	);
	add(
		'server/features/index.js',
		text(
			`${options.server.localizedMarkdown ? "import './markdown/index.js';" : ''}${options.server.defaultAppRouting ? "\nimport './app/index.js';" : ''}`,
		),
	);
	add(
		'server/services/routers.js',
		text(
			`import {Service} from '@polylith/core';\n/** Ordered registry of feature-owned server routers. */\nexport class RoutersService extends Service {\n\t/** Creates the router registry service. @param {unknown} registry - The owning Polylith registry. */\n\tconstructor(registry) { super('routers', registry); this.implement(['start', 'add', 'get', 'setLast']); }\n\t/** Call this method to initialize the ordered router collection. */\n\tstart() { this.names = []; this.last = null; }\n\t/** Call this method to append a feature router. @param {string} name - The router service name. */\n\tadd(name) { if (this.names.includes(name) || this.last === name) throw new Error(\`Duplicate router registration: \${name}\`); this.names.push(name); }\n\t/** Call this method to reserve a final catch-all router. @param {string} name - The final router service name. */\n\tsetLast(name) { if (this.last !== null || this.names.includes(name)) throw new Error('Only one final router may be registered.'); this.last = name; }\n\t/** Call this method to read router names in installation order. @returns {string[]} - The ordered router names. */\n\tget() { return this.last ? [...this.names, this.last] : [...this.names]; }\n}\nnew RoutersService();`,
		),
	);
	add(
		'server/services/routers.d.ts',
		serviceContract('RoutersService', [
			'add(name: string): void',
			'setLast(name: string): void',
			'get(): string[]',
		]),
	);
	if (options.testing.enabled) {
		add('server/services/_tests/routers.spec.js', routersSpec());
		add('server/_tests/index.spec.js', mainRouterSpec(options));
		const serverSpecs = ['./_tests/index.spec.js', './services/_tests/routers.spec.js'];
		if (options.server.defaultAppRouting) serverSpecs.push('./features/app/_tests/app-router.spec.js');
		if (options.server.localizedMarkdown) serverSpecs.push('./features/markdown/_tests/markdown-router.spec.js');
		if (options.server.socketIo) serverSpecs.push('./services/_tests/socket-stream.spec.js');
		add('server/spec.js', text(serverSpecs.map((filename) => `import '${filename}';`).join('\n')));
	}
	add(`${root}/services/io.js`, httpService());
	add(
		`${root}/services/io.d.ts`,
		serviceContract('IoService', ['request(url: string, options?: RequestInit): Promise<Response | null>']),
	);
	if (options.testing.enabled) add(`${root}/services/_tests/IoSpec.js`, httpServiceSpec());
	add('agents/topics/server/README.md', configuredTopicAsset('server', options));
	if (options.server.defaultAppRouting) {
		add(
			'server/features/app/index.js',
			text(
				`import {Service} from '@polylith/core';\nimport express from 'express';\n/** Final server router that serves the deployable application for unmatched routes. */\nexport class AppRouter extends Service {\n\t/** Creates the application router. @param {unknown} registry - The owning Polylith registry. */\n\tconstructor(registry) { super('app-router', registry); this.implement(['start', 'routes']); }\n\t/** Call this method to register the router as the final route owner. */\n\tstart() { this.registry.subscribe('routers').setLast('app-router'); }\n\t/** Call this method to install static assets and the application catch-all route. @param {unknown} _app - The Polylith Express application. @param {unknown} router - The server router. */\n\troutes(_app, router) { router.use(express.static('dist/${options.slug}')); router.get('*', (request, response, next) => request.path === '/api' || request.path.startsWith('/api/') ? next() : response.sendFile('index.html', {root: 'dist/${options.slug}'})); }\n}\nnew AppRouter();`,
			),
		);
		add(
			'server/features/app/index.d.ts',
			serviceContract('AppRouter', ['routes(express: unknown, router: unknown): void']),
		);
		if (options.testing.enabled) add('server/features/app/_tests/app-router.spec.js', appRouterSpec(options.slug));
	}
	if (options.server.localizedMarkdown) {
		addMarkdown(add, root, options);
		add(
			'server/features/markdown/markdown-router.d.ts',
			serviceContract('MarkdownRouter', ['routes(express: unknown, router: unknown): void']),
		);
	}
	if (options.server.socketIo) addSocket(add, root, options);
}
function httpService() {
	return text(
		`import {Service} from '@polylith/core';\n/** HTTP service that centrally adds deployment and locale requirements. */\nexport class IoService extends Service {\n\t/** Creates the HTTP service. @param {unknown} registry - The owning Polylith registry. */\n\tconstructor(registry) { super('io', registry); this.implement(['request']); }\n\t/** Called by request handling to resolve an app-relative route below the document base. @param {string} url - The caller-supplied URL or app-relative route. @returns {string} - The resolved request URL. */\n\tresolveUrl(url) { const value = String(url); if (/^[a-z][a-z\\d+.-]*:/i.test(value) || value.startsWith('//')) return value; return new URL(value.replace(/^\\/+/, ''), document.baseURI).toString(); }\n\t/** Call this method to issue an HTTP request with centrally owned headers. @param {string} url - The request URL or app-relative route. @param {RequestInit} options - Fetch options and caller-owned headers. @returns {Promise<Response | null>} - The response, or null after a transport failure. */\n\tasync request(url, options = {}) { const locale = this.registry.subscribe('app-context')?.get?.().locale || 'en-US'; try { return await fetch(this.resolveUrl(url), {...options, headers: {Accept: 'application/json', 'Accept-Language': locale, ...(options.body ? {'Content-Type': 'application/json'} : {}), ...options.headers}}); } catch (error) { console.error(error); return null; } }\n}\nnew IoService();`,
	);
}
function httpServiceSpec() {
	return text(`import {Registry, Service} from '@polylith/core';
import {IoService} from '../io.js';

describe('HTTP service', () => {
	let originalFetch;
	let base;
	let registry;
	let service;

	beforeEach(() => {
		originalFetch = window.fetch;
		base = document.createElement('base');
		base.href = 'https://example.test/deployable-app/';
		document.head.append(base);
		registry = new Registry();
		class AppContextStub extends Service {
			constructor() {
				super('app-context', registry);
			}
			get() { return {locale: 'en-US'}; }
		}
		new AppContextStub();
		service = new IoService(registry);
	});

	afterEach(() => {
		window.fetch = originalFetch;
		base.remove();
	});

	it('resolves app routes below the deployment base and owns standard headers', async () => {
		window.fetch = jasmine.createSpy('fetch').and.resolveTo({ok: true});
		await service.request('/api/markdown/help', {body: '{}'});
		expect(window.fetch).toHaveBeenCalledWith('https://example.test/deployable-app/api/markdown/help', {
			body: '{}',
			headers: {
				Accept: 'application/json',
				'Accept-Language': 'en-US',
				'Content-Type': 'application/json',
			},
		});
	});

	it('preserves external URLs, permits header overrides, and omits content type without a body', async () => {
		window.fetch = jasmine.createSpy('fetch').and.resolveTo({ok: true});
		await service.request('https://api.example.test/items', {headers: {Accept: 'text/plain'}});
		expect(window.fetch).toHaveBeenCalledWith('https://api.example.test/items', {
			headers: {Accept: 'text/plain', 'Accept-Language': 'en-US'},
		});
	});

	it('logs transport failures and returns no response', async () => {
		const error = new Error('offline');
		window.fetch = jasmine.createSpy('fetch').and.rejectWith(error);
		spyOn(console, 'error');
		expect(await service.request('/api/items')).toBeNull();
		expect(console.error).toHaveBeenCalledWith(error);
	});
});`);
}
function addMarkdown(add, root, options) {
	const testing = options.testing.enabled;
	add('server/features/markdown/index.js', text(`import './markdown-router.js';`));
	add(
		'server/features/markdown/markdown-router.js',
		text(
			`import {readFile} from 'node:fs/promises';\nimport path from 'node:path';\nimport {Service} from '@polylith/core';\nexport class MarkdownRouter extends Service { constructor(registry, read = readFile, markdownRoot = 'server/${options.slug}/data/markdown') { super('markdown-router', registry); this.read = read; this.markdownRoot = markdownRoot; this.implement(['start', 'routes']); } start() { this.registry.subscribe('routers').add('markdown-router'); } routes(_express, router) { router.get('/api/markdown/:name', async (request, response) => { const name = String(request.params.name); if (!/^[a-z0-9-]+$/i.test(name)) return response.sendStatus(404); const locale = request.acceptsLanguages('en-US') || 'en-US'; try { response.type('text/markdown').send(await this.read(path.resolve(this.markdownRoot, locale, \`\${name}.md\`), 'utf8')); } catch (error) { if (error.code === 'ENOENT') return response.sendStatus(404); console.error(error); response.sendStatus(500); } }); } }\nnew MarkdownRouter();`,
		),
	);
	if (testing) add('server/features/markdown/_tests/markdown-router.spec.js', markdownRouterSpec());
	add('server/data/markdown/en-US/.gitkeep', '');
	add(
		`${root}/services/markdown.js`,
		text(`import {Service} from '@polylith/core';
/** Locale-aware Markdown content service that owns transport, caching, diagnostics, and replacements. */
export class MarkdownService extends Service {
	/** Creates the Markdown content service. @param {unknown} registry - The owning Polylith registry. */
	constructor(registry) { super('markdown', registry); this.implement(['start', 'ready', 'load', 'clear']); }
	/** Call this method to initialize an empty successful-content cache. */
	start() { this.cache = new Map(); }
	/** Call this method when the HTTP, context, and localization services are ready. */
	ready() { this.io = this.registry.subscribe('io'); this.context = this.registry.subscribe('app-context'); this.localize = this.registry.subscribe('localize'); }
	/** Call this method to load controlled Markdown content for the canonical locale. @param {string} name - The safe Markdown resource name. @param {Record<string, string | number>} replacements - Named replacement values. @returns {Promise<string>} - Replaced Markdown content or empty text. */
	async load(name, replacements = {}) {
		if (!/^[a-z0-9-]+$/i.test(String(name))) { console.error(\`Invalid markdown name: \${name}\`); return ''; }
		const locale = this.context.get().locale;
		const key = \`\${locale}:\${name}\`;
		let content = this.cache.get(key);
		if (content === undefined) {
			const response = await this.io.request(\`/api/markdown/\${name}\`);
			if (!response) { console.error(\`Markdown request failed: \${name}\`); return ''; }
			if (response.status === 404) { console.warn(\`Missing markdown: \${name}\`); return ''; }
			if (!response.ok) { console.error(\`Markdown request failed: \${name} (\${response.status})\`); return ''; }
			try { content = await response.text(); } catch (error) { console.error(error); return ''; }
			this.cache.set(key, content);
		}
		return this.localize.replace(content, replacements, true);
	}
	/** Call this method to clear successful Markdown content cached by this service. */
	clear() { this.cache.clear(); }
}
new MarkdownService();`),
	);
	add(
		`${root}/services/markdown.d.ts`,
		serviceContract('MarkdownService', [
			'load(name: string, replacements?: Record<string, string | number>): Promise<string>',
			'clear(): void',
		]),
	);
	if (testing) add(`${root}/services/_tests/MarkdownServiceSpec.js`, markdownServiceSpec());
	add(
		`${root}/components/Markdown.jsx`,
		text(`import React from 'react';
import {marked} from 'marked';
/** Call this component to render controlled, pre-sanitized Markdown supplied by an owning view. @param {MarkdownProps} props - The Markdown presentation properties. @returns {React.ReactElement | null} - Parsed Markdown or no content. */
export default function Markdown({content = ''}) { return content ? <div dangerouslySetInnerHTML={{__html: marked.parse(content)}} /> : null; }`),
	);
	add(
		`${root}/components/types/Markdown.d.ts`,
		text(
			`/** Properties consumed by the Markdown presentation. */\ntype MarkdownProps = {\n\t/** Controlled, pre-sanitized Markdown content supplied by an owning view. */\n\tcontent?: string;\n};\n/** Controlled Markdown presentation. */\ndeclare function Markdown(props: MarkdownProps): import('react').ReactElement | null;\nexport default Markdown;`,
		),
	);
	if (testing) add(`${root}/components/_tests/MarkdownSpec.js`, markdownComponentSpec());
}

function markdownComponentSpec() {
	return text(`import React from 'react';
import Markdown from '../Markdown.jsx';
import {createTestHarness} from '../../testing/TestHarness.js';
describe('Markdown', () => {
	let harness;
	afterEach(() => harness?.unmount());
	it('renders controlled Markdown and no content for an empty value', () => { harness = createTestHarness(); const result = harness.render(Markdown, {content: '# Help'}); expect(result.query('h1').textContent).toBe('Help'); result.rerender({content: ''}); expect(result.container.textContent).toBe(''); harness.unmount(); harness = createTestHarness(); expect(harness.render(Markdown).container.textContent).toBe(''); });
});`);
}

function markdownServiceSpec() {
	return text(`import {Registry, Service} from '@polylith/core';
import {MarkdownService} from '../markdown.js';
class IoStub extends Service { constructor(registry, response) { super('io', registry); this.request = jasmine.createSpy('request').and.resolveTo(response); this.implement(['request']); } }
class ContextStub extends Service { constructor(registry) { super('app-context', registry); this.implement(['get']); } get() { return {locale: 'en-US'}; } }
class LocalizeStub extends Service { constructor(registry) { super('localize', registry); this.replace = jasmine.createSpy('replace').and.callFake((value, replacements) => value.replace('%{name}', replacements.name)); this.implement(['replace']); } }
function setup(response) { const registry = new Registry(); const io = new IoStub(registry, response); const context = new ContextStub(registry); const localize = new LocalizeStub(registry); const service = new MarkdownService(registry); service.start(); service.ready(); return {context, io, localize, service}; }
describe('Markdown service', () => {
	it('loads once per locale, caches successes, and applies safe replacements on every call', async () => { const response = {ok: true, status: 200, text: jasmine.createSpy('text').and.resolveTo('# Hello %{name}')}; const {io, localize, service} = setup(response); expect(await service.load('help', {name: 'Ada'})).toBe('# Hello Ada'); expect(await service.load('help', {name: 'Grace'})).toBe('# Hello Grace'); expect(io.request).toHaveBeenCalledOnceWith('/api/markdown/help'); expect(response.text).toHaveBeenCalledTimes(1); expect(localize.replace).toHaveBeenCalledWith('# Hello %{name}', {name: 'Ada'}, true); service.clear(); await service.load('help', {name: 'Lin'}); expect(io.request).toHaveBeenCalledTimes(2); });
	it('does not cache misses and distinguishes missing from unexpected failures', async () => { spyOn(console, 'warn'); spyOn(console, 'error'); let current = {ok: false, status: 404}; const {io, service} = setup(current); io.request.and.callFake(() => Promise.resolve(current)); expect(await service.load('missing')).toBe(''); expect(await service.load('missing')).toBe(''); expect(io.request).toHaveBeenCalledTimes(2); expect(console.warn).toHaveBeenCalledWith('Missing markdown: missing'); current = null; expect(await service.load('offline')).toBe(''); current = {ok: false, status: 500}; expect(await service.load('failed')).toBe(''); expect(console.error).toHaveBeenCalledWith('Markdown request failed: offline'); expect(console.error).toHaveBeenCalledWith('Markdown request failed: failed (500)'); });
	it('rejects unsafe names and handles response-body failures without throwing', async () => { spyOn(console, 'error'); const failure = new Error('body failed'); const {io, service} = setup({ok: true, status: 200, text: () => Promise.reject(failure)}); expect(await service.load('../secret')).toBe(''); expect(io.request).not.toHaveBeenCalled(); expect(await service.load('help')).toBe(''); expect(console.error).toHaveBeenCalledWith('Invalid markdown name: ../secret'); expect(console.error).toHaveBeenCalledWith(failure); });
});`);
}

function routersSpec() {
	return text(
		`import assert from 'node:assert/strict';\nimport test from 'node:test';\nimport {Registry} from '@polylith/core';\nimport {RoutersService} from '../routers.js';\ntest('routers preserve registration order and place the final router last', () => { const service = new RoutersService(new Registry()); service.start(); assert.deepEqual(service.get(), []); service.add('first'); service.add('second'); assert.deepEqual(service.get(), ['first', 'second']); service.setLast('final'); assert.deepEqual(service.get(), ['first', 'second', 'final']); });\ntest('routers reject duplicate and multiple final configuration', () => { const service = new RoutersService(new Registry()); service.start(); service.add('first'); assert.throws(() => service.add('first'), /Duplicate/); assert.throws(() => service.setLast('first'), /Only one/); service.setLast('final'); assert.throws(() => service.setLast('other'), /Only one/); assert.throws(() => service.add('final'), /Duplicate/); });`,
	);
}
function mainRouterSpec(options) {
	const socketImport = options.server.socketIo
		? "import {SocketIoServerMock} from '../testing/SocketIoMocks.js';"
		: '';
	const socketSetup = options.server.socketIo ? 'const io = new SocketIoServerMock();' : 'const io = null;';
	const app = options.server.socketIo ? '{getSocketIo: async () => io}' : '{}';
	const expectedRoutes = [];
	if (options.server.localizedMarkdown) expectedRoutes.push('/api/markdown/:name');
	if (options.server.defaultAppRouting) expectedRoutes.push('*');
	const expectedMiddleware = options.server.defaultAppRouting ? 1 : 0;
	return text(`import assert from 'node:assert/strict';
import test from 'node:test';
import {Registry} from '@polylith/core';
import mainRouter from '../index.js';
${socketImport}

test('main router starts generated services and installs every owned route', async () => {
	const sharedRegistry = new Registry();
	${socketSetup}
	const routes = [];
	const middleware = [];
	const router = {use(value) { middleware.push(value); }, get(pattern) { routes.push(pattern); }};
	await assert.rejects(() => mainRouter(null, router, ${app}), /shared registry/);
	assert.equal(await mainRouter(null, router, ${app}, sharedRegistry), true);
	assert.equal(middleware.length, ${expectedMiddleware});
	assert.deepEqual(routes, ${JSON.stringify(expectedRoutes)});
});`);
}
function appRouterSpec(slug) {
	return text(
		`import assert from 'node:assert/strict';\nimport test from 'node:test';\nimport {Registry} from '@polylith/core';\nimport {RoutersService} from '../../../services/routers.js';\nimport {AppRouter} from '../index.js';\ntest('app router registers last, serves static and page routes, and preserves unknown API failures', () => { const registry = new Registry(); const routers = new RoutersService(registry); routers.start(); const service = new AppRouter(registry); service.start(); assert.deepEqual(routers.get(), ['app-router']); let route; const used = []; service.routes(null, {use(value) { used.push(value); }, get(pattern, handler) { route = {pattern, handler}; }}); const sent = []; const next = []; const response = {sendFile(...args) { sent.push(args); }}; route.handler({path: '/home'}, response, () => next.push(true)); route.handler({path: '/api/missing'}, response, () => next.push(true)); route.handler({path: '/api'}, response, () => next.push(true)); assert.equal(used.length, 1); assert.equal(typeof used[0], 'function'); assert.equal(route.pattern, '*'); assert.deepEqual(sent, [['index.html', {root: 'dist/${slug}'}]]); assert.equal(next.length, 2); });`,
	);
}
function markdownRouterSpec() {
	return text(
		`import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {Registry} from '@polylith/core';
import {RoutersService} from '../../../services/routers.js';
import {MarkdownRouter} from '../markdown-router.js';

function response() { return {body: null, contentType: null, statuses: [], sendStatus(status) { this.statuses.push(status); return this; }, type(value) { this.contentType = value; return this; }, send(value) { this.body = value; return this; }}; }
function setup(read) { const registry = new Registry(); const routers = new RoutersService(registry); routers.start(); const service = new MarkdownRouter(registry, read, 'fixtures'); service.start(); let handler; service.routes(null, {get(pattern, value) { assert.equal(pattern, '/api/markdown/:name'); handler = value; }}); return {handler, routers}; }

test('markdown router registers and normalizes supported locale selection', async () => { let requestPath; const {handler, routers} = setup(async (value, encoding) => { requestPath = value; assert.equal(encoding, 'utf8'); return '# Help'; }); assert.deepEqual(routers.get(), ['markdown-router']); const result = response(); await handler({params: {name: 'help'}, acceptsLanguages: (...locales) => { assert.deepEqual(locales, ['en-US']); return false; }}, result); assert.equal(requestPath, path.resolve('fixtures', 'en-US', 'help.md')); assert.equal(result.contentType, 'text/markdown'); assert.equal(result.body, '# Help'); });
test('markdown router rejects unsafe and missing names', async () => { const missing = Object.assign(new Error('missing'), {code: 'ENOENT'}); const {handler} = setup(async () => { throw missing; }); let result = response(); await handler({params: {name: '../secret'}, acceptsLanguages: () => 'en-US'}, result); assert.deepEqual(result.statuses, [404]); result = response(); await handler({params: {name: 'not-installed'}, acceptsLanguages: () => 'en-US'}, result); assert.deepEqual(result.statuses, [404]); });
test('markdown router reports application failures', async (context) => { const failure = Object.assign(new Error('denied'), {code: 'EACCES'}); const {handler} = setup(async () => { throw failure; }); const errors = []; context.mock.method(console, 'error', (...args) => errors.push(args)); const result = response(); await handler({params: {name: 'help'}, acceptsLanguages: () => 'en-US'}, result); assert.deepEqual(errors, [[failure]]); assert.deepEqual(result.statuses, [500]); });`,
	);
}
function addSocket(add, root, options) {
	for (const [asset, destination] of [
		['client/socket-types.d.ts', `${root}/common/socket-types.d.ts`],
		['client/socket-stream.js', `${root}/services/socket-stream.js`],
		['client/socket-stream.d.ts', `${root}/services/socket-stream.d.ts`],
		['client/SocketIoMock.js', `${root}/testing/SocketIoMock.js`],
		['client/SocketStreamSpec.js', `${root}/services/_tests/SocketStreamSpec.js`],
		['server/socket-types.d.ts', 'server/common/socket-types.d.ts'],
		['server/socket-stream.js', 'server/services/socket-stream.js'],
		['server/socket-stream.d.ts', 'server/services/socket-stream.d.ts'],
		['server/SocketIoMocks.js', 'server/testing/SocketIoMocks.js'],
		['server/socket-stream.spec.js', 'server/services/_tests/socket-stream.spec.js'],
	])
		add(destination, socketAsset(asset, options.slug));
}

function socketAsset(filename, slug) {
	const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'socket-io');
	return readFileSync(path.join(root, filename), 'utf8').replaceAll('{{SLUG}}', slug);
}
function componentAsset(filename) {
	const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'components');
	return readFileSync(path.join(root, filename), 'utf8');
}
function topicAsset(filename) {
	const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'topics');
	return readFileSync(path.join(root, filename), 'utf8');
}
function configuredTopicAsset(asset, options, replacements = {}, runtime = {}) {
	const filename = asset.endsWith('.md') ? asset : `${asset}/README.md`;
	const values = {...topicValues(options, runtime), ...replacements};
	let content = topicAsset(filename);
	for (const [name, value] of Object.entries(values)) content = content.replaceAll(`{{${name}}}`, String(value));
	const unresolved = [...content.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((match) => match[1]);
	if (unresolved.length)
		throw new Error(`Unresolved topic values in ${filename}: ${[...new Set(unresolved)].join(', ')}`);
	return text(content);
}
function topicValues(options, runtime = {}) {
	const commands = [];
	if (options.polylith) commands.push('npm run build', 'npm start', 'npm run dev');
	if (options.testing.enabled) commands.push('npm test');
	if (options.testing.coverage) commands.push('npm run coverage');
	if (options.prettier) commands.push('npm run format:check');
	return {
		PROJECT_NAME: options.projectName,
		PROJECT_SLUG: options.projectSlug || options.slug,
		APP_NAME: options.appName || options.projectName,
		APP_SLUG: options.slug,
		REPOSITORY_POSTURE: options.repositoryPosture || 'local-only',
		SLUG: options.slug,
		FOUNDATION_COMMANDS: commands.join('\n'),
		ARCHITECTURE_BODY: architectureTopicBody(options),
		ARCHITECTURE_SELECTIONS: architectureSelections(options),
		STANDARDS_SETS: standardsSets(options, runtime),
		FOLDER_ASSIGNMENTS: folderAssignments(options),
		STANDARDS_ROOT_LINK: standardsRootLink(runtime),
		COVERAGE_COMMAND: options.testing.coverage ? 'npm run coverage' : '',
		COVERAGE_BODY: options.testing.coverage
			? 'Coverage separately measures generated client and server runtime code where present, emitting console, HTML, and machine-readable summaries without enforcing a threshold. The generated baseline is expected to report 100% before product development begins.'
			: 'Coverage reporting is not configured.',
		SERVER_TEST_LOCATION: options.server?.enabled ? `- Server test entry: \`server/${options.slug}/spec.js\`` : '',
		SERVER_FEATURES: serverTopicFeatures(options),
		SHELL_TYPE: options.shell?.type || 'none',
		SHELL_BEHAVIOR: shellTopicBehavior(options),
	};
}
function architectureTopicBody(options) {
	if (!options.polylith)
		return `This is a headless exploratory project. Runtime source belongs below \`src\`; no UI, Polylith app, generated server, shell, localization layer, or component system is installed. Keep modules small and add domain folders only when requirements establish them.`;
	return `This repository uses Polylith as its only bundler and owns the deployable \`${options.slug}\` app below \`src/${options.slug}\`. Application services live under \`services\`, cross-cutting types/context under \`common\`, startup composition under \`main\`, and product capabilities under \`features/<name>\`.\n\nPolylith build metadata activates features and defines deployment paths. Services/controllers own behavior and state; view services adapt them to presentational React components. Repository posture is \`${options.repositoryPosture}\`; the app's standalone mount is \`${options.standaloneMount}\` and its composed mount is \`${options.composedMount}\`.`;
}
function architectureSelections(options) {
	const selections = [];
	if (!options.polylith) selections.push('- Headless exploratory source under `src`; no generated UI or server.');
	if (options.polylith)
		selections.push(
			`- Standalone mount \`${options.standaloneMount}\`; composed mount \`${options.composedMount}\`; configured repository mount \`${options.mount}\`.`,
		);
	if (options.mui) selections.push('- MUI CSS-variable theme with neutral light/dark schemes; light starts active.');
	if (options.baseComponents)
		selections.push(`- Shared base/concrete components under \`src/${options.slug}/components\`.`);
	selections.push(
		`- Accessibility mode: ${options.accessibility ? 'enabled' : 'disabled; semantic/native behavior remains required'}.`,
	);
	selections.push(
		`- Localization: ${options.localization?.enabled ? 'enabled with `en-US` phrase data and global-context locale ownership' : 'disabled; generated strings remain literal'}.`,
	);
	if (options.shell?.enabled)
		selections.push(
			`- Application shell: \`${options.shell.type}\`${options.shell.initialPage ? ` with initial \`${options.shell.initialPageSlug}\` page` : ' with no generated initial page'}.`,
		);
	if (options.server?.enabled)
		selections.push(
			`- Basic service-routed server${options.server.defaultAppRouting ? ', default app routing' : ''}${options.server.localizedMarkdown ? ', localized Markdown' : ''}${options.server.socketIo ? ', and Socket.IO transport' : ''}.`,
		);
	if (options.localHttps?.enabled)
		selections.push(
			`- Local HTTPS at \`https://${options.localHttps.hostname}:${options.localHttps.port}/\`; rotate with \`npm run certificate:create\`.`,
		);
	selections.push(
		`- Unit testing: ${options.testing.enabled ? `enabled${options.testing.coverage ? ' with coverage reporting' : ''}` : 'not configured'}.`,
	);
	selections.push(`- Prettier: ${options.prettier ? 'configured' : 'not configured'}.`);
	return selections.join('\n');
}
function applicableStandards(options, runtime = {}) {
	const rootLink = standardsRootLink(runtime);
	return applicableStandardEntries(options)
		.map(
			([filename, description]) =>
				`- [${filename}](${rootLink}/${encodeURIComponent(filename)}) — ${description}.`,
		)
		.join('\n');
}
function standardLines(entries, rootLink) {
	return entries
		.map(
			([filename, description]) =>
				`- [${filename}](${rootLink}/${encodeURIComponent(filename)}) — ${description}.`,
		)
		.join('\n');
}
function standardsSets(options, runtime = {}) {
	const rootLink = standardsRootLink(runtime);
	const entries = applicableStandardEntries(options);
	const uiNames = new Set([
		'react.md',
		'remvc.md',
		'app-shells.md',
		'mui.md',
		'base-components.md',
		'accessibility.md',
		'localization.md',
	]);
	const serverNames = new Set(['server.md', 'socket-io.md']);
	const base = entries.filter(([name]) => !uiNames.has(name) && !serverNames.has(name));
	const ui = entries.filter(([name]) => uiNames.has(name));
	const server = entries.filter(([name]) => serverNames.has(name));
	const sections = [`### \`base\`\n\nExtends: none\nStandards:\n${standardLines(base, rootLink)}`];
	if (ui.length) sections.push(`### \`browser\`\n\nExtends: base\nStandards:\n${standardLines(ui, rootLink)}`);
	if (server.length) sections.push(`### \`server\`\n\nExtends: base\nStandards:\n${standardLines(server, rootLink)}`);
	return sections.join('\n\n');
}
function folderAssignments(options) {
	const assignments = [
		'- `.` — `base` — Repository-root files use the shared project standards.',
		`- \`${options.polylith ? `src/${options.slug}/` : 'src/'}\` — \`${options.polylith ? 'browser' : 'base'}\` — Application source uses its generated source standards.`,
	];
	if (options.polylith)
		assignments.push(
			`- \`server/\` — \`${options.server?.enabled ? 'server' : 'base'}\` — Repository deployment setup uses the applicable lifecycle standards.`,
		);
	if (options.server?.enabled) {
		assignments.push(
			`- \`server/${options.slug}/\` — \`server\` — Application server source uses the server standards set.`,
		);
	}
	return assignments.join('\n');
}
function standardsRootLink(runtime = {}) {
	const standardsRoot = path.resolve(
		runtime.standardsRoot ||
			path.join(process.env.CODEX_HOME || path.join(homedir(), '.codex'), 'documentation', 'standards'),
	);
	if (!runtime.target) return pathToFileURL(standardsRoot).href;
	const topicDirectory = path.join(path.resolve(runtime.target), 'agents', 'topics', 'standards');
	const relative = path.relative(topicDirectory, standardsRoot);
	if (path.isAbsolute(relative)) return pathToFileURL(standardsRoot).href;
	return relative
		.split(path.sep)
		.map((segment) => (segment === '..' || segment === '.' ? segment : encodeURIComponent(segment)))
		.join('/');
}
export function applicableStandardNames(options) {
	return applicableStandardEntries(options).map(([filename]) => filename);
}
function applicableStandardEntries(options) {
	const standards = [
		['documentation.md', 'canonical standards, project manifests, topics, and overlays'],
		['project-foundation.md', 'repository, package, runtime, dependency, and Git boundaries'],
		['architecture.md', 'ownership, feature privacy, build/runtime, and layer boundaries'],
		['code-conventions.md', 'JavaScript, files, validation, diagnostics, presentation, CSS, and formatting'],
		['types.md', 'ambient JavaScript contracts and declaration placement'],
		['jsdoc.md', 'runtime documentation and service-interface conventions'],
	];
	if (options.dataPersistence)
		standards.push([
			'data-persistence.md',
			'database-neutral persistent identifiers, concrete instants, persistence boundaries, and verification',
		]);
	if (options.polylith)
		standards.push(
			['polylith.md', 'builds, feature activation, deployment, lifecycle, server ownership, and test assembly'],
			['react.md', 'React presentation, state, effects, lifecycle, markup, CSS, and tests'],
		);
	if (options.shell?.enabled)
		standards.push(
			['remvc.md', 'registry, executor, model, controller, view, and React responsibilities'],
			['app-shells.md', 'page registry, navigation variants, routing, responsive behavior, and tests'],
		);
	if (options.mui)
		standards.push(['mui.md', 'provider stack, imports, theming, styling ownership, and accessibility baseline']);
	if (options.baseComponents)
		standards.push([
			'base-components.md',
			'base/concrete component contracts, types, harness, and behavioral tests',
		]);
	if (options.accessibility)
		standards.push(['accessibility.md', 'semantics, keyboard/focus, names, status, visual guidance, and tests']);
	if (options.localization?.enabled)
		standards.push(['localization.md', 'locale ownership, phrases, replacements, plurals, HTTP, and Markdown']);
	if (options.server?.enabled)
		standards.push(['server.md', 'service routing, HTTP policy, Markdown, failures, and tests']);
	if (options.server?.socketIo)
		standards.push(['socket-io.md', 'transport ownership, envelopes, hooks, lifecycle, and tests']);
	if (options.testing.enabled)
		standards.push([
			'testing.md',
			'runner boundaries, placement, behavioral principles, coverage, and lane readiness',
		]);
	if (options.localHttps?.enabled)
		standards.push(['local-https.md', 'certificate generation, trust boundary, renewal, and verification']);
	return standards;
}
function serverTopicFeatures(options) {
	const features = [];
	if (options.server?.defaultAppRouting)
		features.push(
			'- Default app routing installs the final index fallback and the client URL service for deep links.',
		);
	if (options.server?.localizedMarkdown)
		features.push(
			'- Localized Markdown owns `GET /api/markdown/:name`, locale selection, safe filename validation, and the matching client component.',
		);
	if (options.server?.socketIo)
		features.push(
			`- Socket.IO attaches through the shared Polylith server with app-scoped \`${options.slug}\` namespaces; no production namespace or event is installed.`,
		);
	return features.length
		? features.join('\n')
		: 'No optional application routes are installed. Add feature-owned routers only when requirements define them.';
}
function shellTopicBehavior(options) {
	const variants = {
		'left-nav':
			'At MUI `md` and above, navigation uses a permanent drawer. Below `md`, it uses a temporary overlay drawer opened from the header and closed after selection. Main content scrolls independently.',
		'top-tabs':
			'Navigation uses a sticky MUI tab header with scrollable tabs, automatic scroll buttons, and a full-width second row on narrow screens.',
		'app-directed':
			'The shell renders no drawer or tabs. Application behavior activates pages through the app view/controller request path and never selects the first page implicitly.',
	};
	const routing = options.server?.defaultAppRouting
		? 'The URL service alone owns history parsing and writes. A missing page segment selects the explicit default; a recognized slug selects its page.'
		: 'Selection is in memory. No URL service or browser-history ownership is generated.';
	return `${variants[options.shell?.type] || 'No shell presentation is installed.'}\n\n${routing}`;
}
function topicIndex(options) {
	const topics = [
		[
			options.slug,
			`${options.appName || options.projectName} product requirements and current work; intentionally undefined at initialization`,
		],
		['project-foundation', 'package, runtime, repository boundary, and verification commands'],
		['architecture', 'local source layout and selected infrastructure'],
		['standards', 'applicable canonical standards and repository overlay'],
	];
	if (options.shell?.enabled)
		topics.push(['app-shell', 'installed page registry, selection, navigation, and routing configuration']);
	if (options.server?.enabled)
		topics.push(['server', 'service-based routing, HTTP service, optional routes, and tests']);
	if (options.testing.enabled)
		topics.push(['testing', 'test locations, runners, behavior expectations, and optional coverage']);
	return text(
		`# Topics\n\nRead [active-topic.md](./active-topic.md) first, then the [standards manifest](./standards/manifest.md). Load only the local topics and canonical standards relevant to the current task.\n\n${topics.map(([name, description]) => `- [${topicTitle(name, options)}](./${name}/README.md) — ${description}.`).join('\n')}`,
	);
}
function topicTitle(name, options) {
	if (name === options.slug) return options.appName || options.projectName;
	return (
		{
			jsdoc: 'JSDoc',
			'local-https': 'Local HTTPS',
			mui: 'MUI',
			remvc: 'REMVC',
			'socket-io': 'Socket.IO',
		}[name] || title(name)
	);
}
function karmaConfig(watch, coverage) {
	return text(
		`module.exports = function(config) { config.set({frameworks: ['jasmine'], files: ['tests/**/*.js'], reporters: [${coverage ? "'spec', 'coverage'" : "'spec'"}], client: {captureConsole: true}, browsers: ['ChromeHeadless'], singleRun: ${!watch}, autoWatch: ${watch}, restartOnFileChange: ${watch}${coverage ? ", coverageReporter: {dir: 'coverage/src', reporters: [{type: 'text-summary'}, {type: 'html', subdir: 'html'}, {type: 'json-summary', subdir: '.', file: 'coverage-summary.json'}]}" : ''}}); };`,
	);
}
function karmaBrowserSetup() {
	return text(
		`globalThis.process = globalThis.process || {env: {}};\nglobalThis.process.env.NODE_ENV = 'test';\nglobalThis.IS_REACT_ACT_ENVIRONMENT = true;\nif (!document.getElementById('main-content')) { const root = document.createElement('div'); root.id = 'main-content'; document.body.append(root); }`,
	);
}
function sourceCoverageBabelConfig(slug) {
	return text(
		`module.exports = function(api) { const enabled = process.env.SRC_COVERAGE === '1'; api.cache.using(() => enabled); return {plugins: enabled ? [['babel-plugin-istanbul', {cwd: __dirname, include: ['src/**/*.{js,jsx}'], exclude: ['**/_tests/**', '**/testing/**', '**/spec.js']}]] : []}; };`,
	);
}
function sourceCoverageRunner(slug) {
	return text(
		`import {spawnSync} from 'node:child_process';\nrun('polylith', ['test', '${slug}'], {SRC_COVERAGE: '1'});\nrun('karma', ['start', 'karma.coverage.conf.cjs']);\nfunction run(command, args, environment = {}) { const windows = process.platform === 'win32'; const executable = windows ? process.env.ComSpec || 'cmd.exe' : command; const commandArgs = windows ? ['/d', '/c', [command, ...args].join(' ')] : args; const result = spawnSync(executable, commandArgs, {cwd: process.cwd(), env: {...process.env, ...environment}, stdio: 'inherit', windowsHide: true}); if (result.error) throw result.error; if (result.status !== 0) process.exit(result.status ?? 1); }`,
	);
}
function localCertificateScript(options) {
	return text(`import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import selfsigned from 'selfsigned';

const CONFIG_PATH = path.resolve('polylith.json');

/**
 * Call this function to generate and install the local Polylith HTTPS certificate.
 *
 * @param {Function} generate - The self-signed certificate generator.
 * @returns {Promise<string>} - The configured standalone application URL.
 * @throws {Error} - When the Polylith configuration or generated PEM values are invalid.
 */
export async function createLocalCertificate(generate = selfsigned.generate) {
	const config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
	const notBeforeDate = new Date();
	const notAfterDate = new Date(notBeforeDate);
	notAfterDate.setUTCDate(notAfterDate.getUTCDate() + ${options.validDays});
	const certificate = await generate([{name: 'commonName', value: '${options.hostname}'}], {
		keyType: 'rsa',
		keySize: 2048,
		algorithm: 'sha256',
		notBeforeDate,
		notAfterDate,
		extensions: [
			{name: 'basicConstraints', cA: false, critical: true},
			{name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true},
			{name: 'extKeyUsage', serverAuth: true},
			{name: 'subjectAltName', altNames: [
				{type: 2, value: '${options.hostname}'},
				{type: 7, ip: '127.0.0.1'},
				{type: 7, ip: '::1'},
			]},
		],
	});
	if (!certificate?.private?.includes('BEGIN PRIVATE KEY') || !certificate?.cert?.includes('BEGIN CERTIFICATE')) {
		throw new Error('Self-signed certificate generation did not return valid PEM values.');
	}
	config.port = ${options.port};
	config.https = {key: certificate.private, cert: certificate.cert};
	await writeFile(CONFIG_PATH, \`\${JSON.stringify(config, null, '\\t')}\\n\`, 'utf8');
	return \`https://${options.hostname}:${options.port}/\`;
}

/** Whether this module is executing as the package script entrypoint. */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
	try {
		const url = await createLocalCertificate();
		console.log(\`Created a one-year local HTTPS certificate for \${url}\`);
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}`);
}
function componentContract(name) {
	return text(
		`import type {ComponentType} from 'react';\n/** ${name} React presentation component. */\ndeclare const ${name}: ComponentType<Record<string, unknown>>;\nexport default ${name};`,
	);
}
function serviceContract(name, methods) {
	return text(`/** Public registry contract implemented by the ${name} application service. */
interface ${name} extends EventBus {
${methods.map((method) => serviceMethodContract(method)).join('\n')}
}`);
}
function serviceMethodContract(signature) {
	const name = signature.slice(0, signature.indexOf('('));
	const descriptions = {
		add: 'Call this method to register or update a page record.',
		get: 'Call this method to read the current service value.',
		getById: 'Call this method to find a page by its stable identifier.',
		getBySlug: 'Call this method to find a page by its URL slug.',
		getComponent: 'Call this method to create the service-owned React presentation.',
		getDefault: 'Call this method to read the executor-selected default page.',
		getPageSlug: 'Call this method to read the page slug from the current URL.',
		getShellState: 'Call this method to read the current application-shell presentation state.',
		getTheme: 'Call this method to read the application MUI theme.',
		mount: 'Call this method to mount the feature presentation for a page.',
		pathForSlug: 'Call this method to build an application path for a page slug.',
		pushPageSlug: 'Call this method to push a page slug into browser history.',
		replacePageSlug: 'Call this method to replace the current page slug in browser history.',
		requestPage: 'Call this method to request that the application select and mount a page.',
		setLocale: 'Call this method to replace the current application locale.',
		translate: 'Call this method to resolve a phrase for the current locale.',
	};
	const parameterNames = topLevelParameters(signature);
	const returnType = signature.slice(signature.lastIndexOf('):') + 2).trim();
	const lines = [
		`\t/**`,
		`\t * ${descriptions[name] || `Call this method to invoke the ${name} service operation.`}`,
	];
	if (parameterNames.length || returnType !== 'void') lines.push('\t *');
	for (const parameter of parameterNames)
		lines.push(`\t * @param ${parameter} - The ${parameter} value required by this operation.`);
	if (returnType !== 'void') lines.push(`\t * @returns - The ${name} operation result.`);
	lines.push('\t */', `\t${signature};`);
	return lines.join('\n');
}
function topLevelParameters(signature) {
	const source = signature.slice(signature.indexOf('(') + 1, signature.lastIndexOf('):'));
	const parameters = [];
	let depth = 0;
	let current = '';
	for (const character of source) {
		if ('<({['.includes(character)) depth += 1;
		if ('>)}]'.includes(character)) depth -= 1;
		if (character === ',' && depth === 0) {
			parameters.push(current);
			current = '';
		} else current += character;
	}
	if (current.trim()) parameters.push(current);
	return parameters
		.map((parameter) => parameter.trim().match(/^(?:\.\.\.)?([A-Za-z_$][\w$]*)\??:/)?.[1])
		.filter(Boolean);
}
function normalizeGeneratedContent(content) {
	const documented = content
		.replaceAll(
			"export class MarkdownRouter extends Service { constructor(registry, read = readFile, markdownRoot = 'server/data/markdown')",
			`/** Locale-aware Markdown route owner. */\nexport class MarkdownRouter extends Service {\n\t/** Creates the Markdown router. @param {unknown} registry - The owning Polylith registry. @param {Function} read - The file reader. @param {string} markdownRoot - The locale content root. */\n\tconstructor(registry, read = readFile, markdownRoot = 'server/data/markdown')`,
		)
		.replaceAll(
			"this.implement(['start', 'routes']); } start() { this.registry.subscribe('routers').add('markdown-router'); } routes(_express, router)",
			"this.implement(['start', 'routes']); }\n\t/** Call this method to append the Markdown router to service-based routing. */\n\tstart() { this.registry.subscribe('routers').add('markdown-router'); }\n\t/** Call this method to install the locale-aware Markdown endpoint. @param {unknown} _express - The Express module. @param {unknown} router - The server router. */\n\troutes(_express, router)",
		);
	return expandInlineJsdoc(addServiceImplementationTags(documented))
		.replaceAll('@mui/material/StyledEngineProvider', '@mui/styled-engine/StyledEngineProvider')
		.replaceAll(
			"import phrases from '../phrases/en-US.json' with {type: 'json'};",
			"import phrases from '../phrases/en-US.json';",
		);
}
function addServiceImplementationTags(content) {
	return content.replace(
		/\/\*\*\s*([^*\r\n]+?)\s*\*\/(\r?\n)export class (\w+) extends Service/g,
		(_match, description, newline, name) =>
			[
				'/**',
				` * ${description.trim()}`,
				' *',
				` * @implements {${name}}`,
				' */',
				`export class ${name} extends Service`,
			].join(newline),
	);
}
function expandInlineJsdoc(content) {
	return content.replace(
		/\/\*\*\s*([^\r\n]*?)\s+(@(?:param|returns|throws|implements)\s+[^\r\n]*?)\s*\*\//g,
		(_match, description, tags) => {
			const tagLines = tags.split(/\s+(?=@(?:param|returns|throws|implements)\s)/);
			return ['/**', ` * ${description.trim()}`, ' *', ...tagLines.map((tag) => ` * ${tag.trim()}`), ' */'].join(
				'\n',
			);
		},
	);
}
function title(value) {
	return value
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}
function escapeHtml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}
function escapeJavaScript(value) {
	return String(value)
		.replaceAll('\\', '\\\\')
		.replaceAll("'", "\\'")
		.replaceAll('\r', '\\r')
		.replaceAll('\n', '\\n');
}
