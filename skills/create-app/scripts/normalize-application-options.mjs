import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const POSTURES = new Set(['local-only', 'discoverable', 'hosting']);
const SHELL_TYPES = new Set(['none', 'app-directed', 'left-nav', 'top-tabs']);

export function normalizeApplicationOptions(raw, defaults = {}) {
	const appName = requiredString(raw.appName ?? defaults.appName, 'appName');
	const appSlug = requiredSlug(raw.appSlug ?? defaults.appSlug, 'appSlug');
	const repositoryPosture = String(raw.repositoryPosture ?? defaults.repositoryPosture ?? 'local-only');
	if (!POSTURES.has(repositoryPosture)) throw new Error(`unsupported repository posture: ${repositoryPosture}`);

	const mui = raw.mui === true;
	const shellType = raw.shell?.enabled === false ? 'none' : String(raw.shell?.type || 'none');
	if (!SHELL_TYPES.has(shellType)) throw new Error(`unsupported shell type: ${shellType}`);
	if ((shellType === 'left-nav' || shellType === 'top-tabs') && !mui) throw new Error(`${shellType} requires MUI`);

	const shellEnabled = shellType !== 'none';
	const initialPageEnabled = shellEnabled && raw.shell?.initialPage === true;
	const initialPageName = initialPageEnabled
		? requiredString(raw.shell?.initialPageName, 'shell.initialPageName')
		: null;
	const initialPageSlug = initialPageName ? slugify(initialPageName) : null;
	const accessibility = raw.accessibility === true;
	const localization = raw.localization === true;
	const baseComponents = raw.baseComponents === true;
	if (baseComponents && !mui) throw new Error('base components require MUI');

	const serverEnabled = raw.server?.enabled === true;
	const defaultAppRouting = raw.server?.defaultAppRouting === true;
	const localizedMarkdown = raw.server?.localizedMarkdown === true;
	const socketIo = raw.server?.socketIo === true;
	if (defaultAppRouting && (!serverEnabled || !shellEnabled))
		throw new Error('default app routing requires a basic server and shell');
	if (localizedMarkdown && (!serverEnabled || !localization))
		throw new Error('localized Markdown requires a basic server and localization');
	if (socketIo && !serverEnabled) throw new Error('Socket.IO requires a basic server');

	let testing = raw.testing === true;
	const coverage = raw.coverage === true;
	const implied = [];
	if ((baseComponents || socketIo) && !testing) {
		testing = true;
		const owners = [baseComponents ? 'Base components' : null, socketIo ? 'Socket.IO' : null]
			.filter(Boolean)
			.join(' and ');
		implied.push(`${owners} enabled unit testing.`);
	}
	if (coverage && !testing) throw new Error('coverage requires testing');

	const standaloneMount = normalizeMount(raw.standaloneMount ?? defaults.standaloneMount ?? '/');
	const composedMount = normalizeMount(raw.composedMount ?? defaults.composedMount ?? `/${appSlug}`);
	const configuredMount = normalizeMount(
		raw.mount ?? defaults.mount ?? (repositoryPosture === 'discoverable' ? composedMount : standaloneMount),
	);

	return {
		appName,
		appSlug,
		repositoryPosture,
		standaloneMount,
		composedMount,
		mount: configuredMount,
		dataPersistence: raw.dataPersistence === true,
		mui,
		shell: {
			enabled: shellEnabled,
			type: shellType,
			initialPage: initialPageEnabled,
			initialPageName,
			initialPageSlug,
		},
		accessibility,
		localization: {enabled: localization, locale: 'en-US'},
		baseComponents,
		server: {
			enabled: serverEnabled,
			defaultAppRouting,
			localizedMarkdown,
			socketIo,
		},
		testing: {enabled: testing, coverage},
		implied,
	};
}

export function normalizeMount(value) {
	let mount = requiredString(String(value), 'mount').replaceAll('\\', '/');
	if (!mount.startsWith('/')) mount = `/${mount}`;
	const parts = mount.split('/').filter((part) => part && part !== '.');
	if (parts.includes('..')) throw new Error('mount cannot contain .. segments');
	return parts.length ? `/${parts.join('/')}` : '/';
}

function requiredString(value, field) {
	if (typeof value !== 'string' || value.trim() === '') throw new Error(`${field} is required`);
	return value.trim();
}

function requiredSlug(value, field) {
	const slug = requiredString(value, field);
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${field} must use lowercase kebab-case`);
	return slug;
}

function slugify(value) {
	const result = value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	if (!result) throw new Error('shell.initialPageName must produce a non-empty URL slug');
	return result;
}

function isMain() {
	return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
	const [, , inputPath, outputPath] = process.argv;
	if (!inputPath) {
		console.error('Usage: node normalize-application-options.mjs <answers.json> [normalized.json]');
		process.exitCode = 2;
	} else {
		try {
			const normalized = normalizeApplicationOptions(JSON.parse(readFileSync(inputPath, 'utf8')));
			const serialized = `${JSON.stringify(normalized, null, '\t')}\n`;
			if (outputPath) {
				if (existsSync(outputPath))
					throw new Error(`Refusing to overwrite existing output: ${path.resolve(outputPath)}`);
				writeFileSync(outputPath, serialized, {encoding: 'utf8', flag: 'wx'});
			} else process.stdout.write(serialized);
		} catch (error) {
			console.error(error.message);
			process.exitCode = 1;
		}
	}
}
