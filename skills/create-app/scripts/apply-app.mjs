import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {createExistingApplicationPlan} from './application-engine.mjs';
import {inspectRepository} from './inspect-repository.mjs';

export function applyApp(targetPath, options, runtime = {}) {
	const repository = runtime.repository || inspectRepository(targetPath);
	if (!repository.ok) throw new Error(repository.errors.join('\n'));
	const target = repository.target;
	const manifestPath = path.join(target, 'agents', 'topics', 'standards', 'manifest.md');
	const reconciliationPath = path.join(target, 'agents', 'topics', 'standards', 'reconciliation.md');
	const appCatalogPath = path.join(target, 'agents', 'topics', 'apps', 'README.md');
	const topicIndexPath = existsSync(appCatalogPath)
		? appCatalogPath
		: path.join(target, 'agents', 'topics', 'README.md');
	const topicIndexRelative = path.normalize(path.relative(target, topicIndexPath));
	const appTopicRoot = existsSync(appCatalogPath)
		? path.normalize('agents/topics/apps')
		: path.normalize('agents/topics');
	const babelPath = path.join(target, 'babel.config.cjs');
	const existingPaths = collectPaths(target);
	const plan = createExistingApplicationPlan(repository, options, {
		target,
		standardsRoot: runtime.standardsRoot,
		manifest: readFileSync(manifestPath, 'utf8'),
		reconciliation: readFileSync(reconciliationPath, 'utf8'),
		topicIndex: readFileSync(topicIndexPath, 'utf8'),
		topicIndexPath: topicIndexRelative,
		appTopicRoot,
		babelConfig: existsSync(babelPath) ? readFileSync(babelPath, 'utf8') : null,
		existingPaths,
	});

	for (const filename of plan.files.keys())
		if (existingPaths.has(filename)) throw new Error(`Refusing to overwrite existing path: ${filename}`);
	for (const filename of plan.replacements.keys())
		if (!existingPaths.has(filename)) throw new Error(`Required repository file is missing: ${filename}`);

	if (runtime.dryRun) return summarize(plan);
	for (const [filename, content] of plan.files) {
		const destination = path.join(target, filename);
		mkdirSync(path.dirname(destination), {recursive: true});
		writeFileSync(destination, content, {encoding: 'utf8', flag: 'wx'});
	}
	for (const [filename, content] of plan.replacements) writeFileSync(path.join(target, filename), content, 'utf8');
	if (!runtime.skipFormat) {
		const filenames = [...plan.files.keys(), ...plan.replacements.keys()];
		(runtime.runFormatter || formatChangedPaths)(target, repository.prettierExecutable, filenames);
	}
	return summarize(plan);
}

function formatChangedPaths(target, executable, filenames) {
	const environment = {...process.env, NPM_CONFIG_OFFLINE: 'false', NODE_USE_SYSTEM_CA: '1'};
	const options = {cwd: target, env: environment, stdio: 'inherit', windowsHide: true};
	if (process.platform === 'win32') {
		execFileSync(
			process.env.ComSpec || 'cmd.exe',
			['/d', '/s', '/c', executable, '--write', '--ignore-unknown', ...filenames],
			options,
		);
		return;
	}
	execFileSync(executable, ['--write', '--ignore-unknown', ...filenames], options);
}

function collectPaths(root, current = root, result = new Set()) {
	for (const entry of readdirSync(current, {withFileTypes: true})) {
		if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;
		const absolute = path.join(current, entry.name);
		const relative = path.normalize(path.relative(root, absolute));
		result.add(relative);
		if (entry.isDirectory()) collectPaths(root, absolute, result);
	}
	return result;
}

function summarize(plan) {
	return {
		create: [...plan.files.keys()].sort(),
		update: [...plan.replacements.keys()].sort(),
		standards: plan.standards,
	};
}

function isMain() {
	return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
	const [, , targetPath, optionsPath, flag] = process.argv;
	if (!targetPath || !optionsPath) {
		console.error('Usage: node apply-app.mjs <repository> <normalized-options.json> [--dry-run]');
		process.exitCode = 2;
	} else {
		try {
			const options = JSON.parse(readFileSync(optionsPath, 'utf8'));
			const report = applyApp(targetPath, options, {
				dryRun: flag === '--dry-run',
			});
			process.stdout.write(`${JSON.stringify(report, null, '\t')}\n`);
		} catch (error) {
			console.error(error.message);
			process.exitCode = 1;
		}
	}
}
