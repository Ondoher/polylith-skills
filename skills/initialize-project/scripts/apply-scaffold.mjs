import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {inspectTarget} from './preflight.mjs';
import {createInitialApplicationPlan} from '../../create-app/scripts/application-engine.mjs';

const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;

export function applyScaffold(targetPath, options, runtime = {}) {
	const target = path.resolve(targetPath);
	const preflight = inspectTarget(target);
	if (!preflight.ok) throw new Error(preflight.reason);

	const originalPaths = snapshot(target);
	const run = runtime.runCommand || runCommand;
	const versions = runtime.versions || {
		nodeVersion: process.versions.node,
		npmVersion: run('npm', ['--version'], {
			cwd: target,
			capture: true,
		}).trim(),
	};

	if (options.polylith) {
		run('polylith', ['--help'], {
			cwd: target,
			capture: true,
			timeout: 30_000,
		});
		run('polylith', ['init'], {cwd: target, timeout: COMMAND_TIMEOUT_MS});
		run('polylith', ['app', options.appSlug, '--multiple'], {
			cwd: target,
			timeout: COMMAND_TIMEOUT_MS,
		});
	}

	const plan = createInitialApplicationPlan(options, {
		...versions,
		target,
		standardsRoot: runtime.standardsRoot,
	});
	for (const directory of plan.directories) mkdirSync(path.join(target, directory), {recursive: true});
	for (const [relativePath, content] of plan.files) {
		const destination = safeDestination(target, relativePath);
		if (originalPaths.has(path.normalize(relativePath))) {
			throw new Error(`Refusing to overwrite pre-existing path: ${relativePath}`);
		}
		mkdirSync(path.dirname(destination), {recursive: true});
		writeFileSync(destination, content, {encoding: 'utf8'});
	}

	if (!runtime.skipInstall) {
		const lockfile = path.join(target, 'package-lock.json');
		const modules = path.join(target, 'node_modules');
		if (options.polylith && existsSync(lockfile)) unlinkSync(lockfile);
		if (options.polylith && existsSync(modules)) rmSync(modules, {recursive: true, force: true});
		run('npm', ['install'], {cwd: target, timeout: COMMAND_TIMEOUT_MS});
		run('npm', ['ls', '--all'], {
			cwd: target,
			capture: true,
			timeout: COMMAND_TIMEOUT_MS,
		});
		if (options.localHttps?.enabled) {
			run('npm', ['run', 'certificate:create'], {
				cwd: target,
				timeout: COMMAND_TIMEOUT_MS,
			});
		}
		if (options.prettier) {
			run('npm', ['run', 'format'], {
				cwd: target,
				timeout: COMMAND_TIMEOUT_MS,
			});
			run('npm', ['run', 'format:check'], {
				cwd: target,
				timeout: COMMAND_TIMEOUT_MS,
			});
		}
	}
	return {
		target,
		preflight,
		files: [...plan.files.keys()],
		directories: plan.directories,
	};
}

function runCommand(command, args, options) {
	const invocation = makeCommandInvocation(command, args);
	return execFileSync(invocation.executable, invocation.args, {
		cwd: options.cwd,
		encoding: 'utf8',
		env: makeChildEnvironment(),
		shell: false,
		stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
		timeout: options.timeout || COMMAND_TIMEOUT_MS,
		windowsHide: true,
	});
}

export function makeCommandInvocation(command, args, platform = process.platform, environment = process.env) {
	if (platform !== 'win32' || (command !== 'npm' && command !== 'polylith')) return {executable: command, args};
	return {
		executable: environment.ComSpec || 'cmd.exe',
		args: ['/d', '/s', '/c', `${command}.cmd`, ...args],
	};
}

export function makeChildEnvironment(environment = process.env, platform = process.platform) {
	const childEnvironment = {...environment};
	for (const name of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY']) {
		if (childEnvironment[name] === 'http://127.0.0.1:9') delete childEnvironment[name];
	}
	if (platform === 'win32' && !Object.hasOwn(childEnvironment, 'NODE_USE_SYSTEM_CA')) {
		childEnvironment.NODE_USE_SYSTEM_CA = '1';
	}
	return childEnvironment;
}

function snapshot(root) {
	const paths = new Set();
	const walk = (directory, prefix = '') => {
		for (const entry of readdirSync(directory, {withFileTypes: true})) {
			const relative = path.join(prefix, entry.name);
			paths.add(path.normalize(relative));
			if (entry.isDirectory() && !entry.isSymbolicLink() && entry.name !== '.git')
				walk(path.join(directory, entry.name), relative);
		}
	};
	walk(root);
	return paths;
}

function safeDestination(root, relativePath) {
	const destination = path.resolve(root, relativePath);
	if (destination !== root && !destination.startsWith(`${root}${path.sep}`))
		throw new Error(`Scaffold path escapes target: ${relativePath}`);
	if (existsSync(destination) && statSync(destination).isDirectory())
		throw new Error(`Cannot replace directory with file: ${relativePath}`);
	return destination;
}

function isMain() {
	return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
	const [, , targetPath, optionsPath] = process.argv;
	if (!targetPath || !optionsPath) {
		console.error('Usage: node apply-scaffold.mjs <target> <normalized-options.json>');
		process.exitCode = 2;
	} else {
		try {
			const options = JSON.parse(readFileSync(optionsPath, 'utf8'));
			const report = applyScaffold(targetPath, options);
			process.stdout.write(`${JSON.stringify(report, null, '\t')}\n`);
		} catch (error) {
			console.error(error.message);
			process.exitCode = 1;
		}
	}
}
