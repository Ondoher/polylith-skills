#!/usr/bin/env node

import {createRequire} from 'node:module';
import {realpath, readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {pathToFileURL} from 'node:url';

const result = {ok: false, failures: []};
const addFailure = (code, message, details = {}) => result.failures.push({code, message, ...details});

function repoArgument(argv) {
	const index = argv.indexOf('--repo');
	if (index < 0 || !argv[index + 1]) throw new Error('Usage: format-preflight.mjs --repo <path>');
	return argv[index + 1];
}

function isWithinOrEqual(root, candidate) {
	const relative = path.relative(root, candidate);
	return (
		relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
	);
}

async function isFile(filePath) {
	try {
		return (await stat(filePath)).isFile();
	} catch {
		return false;
	}
}

try {
	const repo = await realpath(path.resolve(repoArgument(process.argv.slice(2))));
	const packagePath = path.join(repo, 'package.json');
	let packageJson;
	try {
		packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
	} catch (error) {
		addFailure('PACKAGE_JSON', 'Root package.json is missing or invalid', {error: error.message});
	}
	const declaredVersion = packageJson?.devDependencies?.prettier;
	if (!declaredVersion) addFailure('PRETTIER_DEPENDENCY', 'prettier is not a direct root devDependency');
	if (packageJson?.scripts?.['format:check'] !== 'prettier --check .') {
		addFailure('FORMAT_SCRIPT', 'Root script must be exactly "format:check": "prettier --check ."');
	}
	const localExecutable = path.join(
		repo,
		'node_modules',
		'.bin',
		process.platform === 'win32' ? 'prettier.cmd' : 'prettier',
	);
	if (!(await isFile(localExecutable)))
		addFailure('PRETTIER_INSTALL', 'The project-local Prettier executable is not installed');
	let prettier;
	if (declaredVersion && (await isFile(localExecutable))) {
		try {
			const requireFromRepo = createRequire(packagePath);
			const prettierModule = requireFromRepo.resolve('prettier');
			const moduleReal = await realpath(prettierModule);
			if (!isWithinOrEqual(path.join(repo, 'node_modules'), moduleReal))
				throw new Error('Resolved Prettier is outside repository node_modules');
			const imported = await import(pathToFileURL(moduleReal).href);
			prettier = imported.default ?? imported;
		} catch (error) {
			addFailure('PRETTIER_RESOLUTION', 'Unable to load the project-local Prettier package', {
				error: error.message,
			});
		}
	}
	if (prettier) {
		try {
			const configPath = await prettier.resolveConfigFile(packagePath);
			if (!configPath)
				addFailure('PRETTIER_CONFIG', 'No explicit Prettier configuration resolves for the root package');
			else {
				const configReal = await realpath(configPath);
				if (!isWithinOrEqual(repo, configReal))
					addFailure('PRETTIER_CONFIG', 'Resolved Prettier configuration is outside the repository', {
						configPath,
					});
				else result.configPath = path.relative(repo, configReal).replaceAll('\\', '/');
			}
		} catch (error) {
			addFailure('PRETTIER_CONFIG', 'Unable to resolve Prettier configuration', {error: error.message});
		}
	}
	result.ok = result.failures.length === 0;
	result.repository = repo;
	result.prettierVersion = declaredVersion ?? null;
	result.requiredCheck = 'npm run format:check';
	process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
	if (!result.ok) process.exitCode = 2;
} catch (error) {
	process.stdout.write(
		`${JSON.stringify({ok: false, failures: [{code: 'PREFLIGHT', message: error.message}]}, null, 2)}\n`,
	);
	process.exitCode = 2;
}
