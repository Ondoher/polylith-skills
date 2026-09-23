import {existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function validateApp(targetPath, options) {
	const target = path.resolve(targetPath);
	const errors = [];
	const required = [`src/${options.appSlug}/index.js`, `builds/${options.appSlug}.json`];
	if (options.server.enabled) required.push(`server/${options.appSlug}/index.js`);
	for (const filename of required) if (!existsSync(path.join(target, filename))) errors.push(`missing ${filename}`);
	try {
		const config = JSON.parse(readFileSync(path.join(target, 'polylith.json'), 'utf8'));
		const app = config.apps?.find((candidate) => candidate.name === options.appSlug);
		if (!app) errors.push(`polylith.json does not declare ${options.appSlug}`);
		else {
			if (app.filename !== `${options.appSlug}.json`) errors.push('application filename does not match its slug');
			if (app.mount !== options.mount) errors.push('application mount does not match normalized options');
		}
		if (!config.deployment?.setup) errors.push('polylith.json does not declare deployment.setup');
		else if (!existsSync(path.join(target, config.deployment.setup)))
			errors.push('configured deployment.setup module is missing');
	} catch (error) {
		errors.push(`invalid polylith.json: ${error.message}`);
	}
	try {
		const packageJson = JSON.parse(readFileSync(path.join(target, 'package.json'), 'utf8'));
		if (options.testing.enabled) {
			const command = `npm run test:${options.appSlug}`;
			if (!packageJson.scripts?.[`test:${options.appSlug}`])
				errors.push(`package.json lacks test:${options.appSlug}`);
			if (!packageJson.scripts?.test?.includes(command))
				errors.push(`the standard test flow does not include ${command}`);
		}
		if (options.testing.coverage) {
			const command = `npm run coverage:${options.appSlug}`;
			if (!packageJson.scripts?.[`coverage:${options.appSlug}`])
				errors.push(`package.json lacks coverage:${options.appSlug}`);
			if (!packageJson.scripts?.coverage?.includes(command))
				errors.push(`the standard coverage flow does not include ${command}`);
		}
	} catch (error) {
		errors.push(`invalid package.json: ${error.message}`);
	}
	if (options.server.enabled && existsSync(path.join(target, `server/${options.appSlug}/index.js`))) {
		const router = readFileSync(path.join(target, `server/${options.appSlug}/index.js`), 'utf8');
		if (!/sharedRegistry/.test(router) || !/registry\.attach\('shared', sharedRegistry\)/.test(router))
			errors.push('application router does not attach the shared installation registry');
	}
	const manifest = readFileSync(path.join(target, 'agents', 'topics', 'standards', 'manifest.md'), 'utf8');
	if (!manifest.includes(`src/${options.appSlug}/`))
		errors.push('standards manifest lacks the app source assignment');
	if (options.server.enabled && !manifest.includes(`server/${options.appSlug}/`))
		errors.push('standards manifest lacks the app server assignment');
	for (const filename of walk(path.join(target, `src/${options.appSlug}`))) {
		const content = readFileSync(filename, 'utf8');
		if (/(?:[A-Za-z]:[\\/](?:dev|Users)[\\/]|file:\/\/\/[A-Za-z]:\/)/i.test(content))
			errors.push(`${path.relative(target, filename)} contains an external implementation-repository reference`);
	}
	return {ok: errors.length === 0, errors};
}

function walk(root) {
	if (!existsSync(root)) return [];
	const files = [];
	for (const entry of readdirSync(root, {withFileTypes: true})) {
		const filename = path.join(root, entry.name);
		if (entry.isDirectory()) files.push(...walk(filename));
		else files.push(filename);
	}
	return files;
}

function isMain() {
	return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
	const [, , targetPath, optionsPath] = process.argv;
	if (!targetPath || !optionsPath) {
		console.error('Usage: node validate-app.mjs <repository> <normalized-options.json>');
		process.exitCode = 2;
	} else {
		const report = validateApp(targetPath, JSON.parse(readFileSync(optionsPath, 'utf8')));
		process.stdout.write(`${JSON.stringify(report, null, '\t')}\n`);
		if (!report.ok) process.exitCode = 1;
	}
}
