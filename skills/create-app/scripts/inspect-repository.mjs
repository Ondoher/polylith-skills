import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function inspectRepository(targetPath) {
	const target = path.resolve(targetPath);
	const errors = [];
	const warnings = [];
	const readJson = (name) => {
		const filename = path.join(target, name);
		if (!existsSync(filename)) {
			errors.push(`${name} is required`);
			return {};
		}
		try {
			return JSON.parse(readFileSync(filename, 'utf8'));
		} catch (error) {
			errors.push(`${name} is invalid JSON: ${error.message}`);
			return {};
		}
	};

	const config = readJson('polylith.json');
	const packageJson = readJson('package.json');
	const normalization = readJson(path.join('agents', 'topics', 'standards', 'normalization.json'));
	for (const required of [
		'AGENTS.md',
		path.join('agents', 'topics', 'README.md'),
		path.join('agents', 'topics', 'standards', 'manifest.md'),
		path.join('agents', 'topics', 'standards', 'overlay.md'),
		path.join('agents', 'topics', 'standards', 'reconciliation.md'),
	])
		if (!existsSync(path.join(target, required))) errors.push(`${required} is required`);
	if (!Array.isArray(config.apps)) errors.push('polylith.json must declare an explicit apps array');
	const wasNormalized =
		normalization.everNormalized === true ||
		normalization.status === 'normalized' ||
		normalization.status === 'initialized';
	if (!wasNormalized) errors.push('repository standards must have been normalized before adding an app');

	const prettierConfigured =
		Boolean(packageJson.devDependencies?.prettier || packageJson.dependencies?.prettier) &&
		typeof packageJson.scripts?.['format:check'] === 'string';
	if (!prettierConfigured) errors.push('Prettier and the standard format:check script are required');
	const prettierExecutable = path.join(
		target,
		'node_modules',
		'.bin',
		process.platform === 'win32' ? 'prettier.cmd' : 'prettier',
	);
	if (prettierConfigured && !existsSync(prettierExecutable))
		errors.push('the repository-installed Prettier executable is required; run npm install first');

	const polylithVersion = packageJson.dependencies?.polylith || packageJson.devDependencies?.polylith;
	if (!polylithVersion) errors.push('package.json must declare polylith');
	else if (!supportsStartupContract(polylithVersion))
		errors.push(`polylith ${polylithVersion} does not establish the required 1.3 startup contract`);
	const declaredPackages = {...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {})};
	for (const [name, version] of Object.entries(declaredPackages)) {
		if (!name.startsWith('@polylith/')) continue;
		if (!supportsStartupContract(version))
			errors.push(`${name} ${version} does not establish the required 1.3 startup contract`);
	}

	const posture = Array.isArray(config.discover) && config.discover.length ? 'hosting' : null;
	if (!posture) warnings.push('repository posture is not mechanically distinguishable as local-only or discoverable');

	return {
		ok: errors.length === 0,
		target,
		errors,
		warnings,
		config,
		packageJson,
		normalization,
		projectName: packageJson.description || packageJson.name || path.basename(target),
		projectSlug: packageJson.name || path.basename(target),
		repositoryPosture: posture,
		apps: Array.isArray(config.apps) ? config.apps : [],
		prettierExecutable,
	};
}

function supportsStartupContract(range) {
	if (range === 'latest' || range === '*') return true;
	const match = String(range).match(/(\d+)\.(\d+)\.(\d+)/);
	if (!match) return false;
	const [, major, minor] = match.map(Number);
	return major > 1 || (major === 1 && minor >= 3);
}

function isMain() {
	return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
	if (!process.argv[2]) {
		console.error('Usage: node inspect-repository.mjs <repository>');
		process.exitCode = 2;
	} else {
		const report = inspectRepository(process.argv[2]);
		process.stdout.write(`${JSON.stringify(report, null, '\t')}\n`);
		if (!report.ok) process.exitCode = 1;
	}
}
