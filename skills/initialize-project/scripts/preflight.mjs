import {createHash} from 'node:crypto';
import {existsSync, lstatSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ALLOWED_FILES = new Set(['.gitignore', 'LICENSE', 'README.md']);
const ALLOWED_DIRECTORIES = new Set(['.git']);
const WORKSPACE_FILE_SUFFIX = '.code-workspace';

export function inspectTarget(targetPath) {
	const target = path.resolve(targetPath);

	if (!existsSync(target)) {
		return {
			ok: false,
			target,
			conflicts: [target],
			protectedFiles: {},
			reason: 'Target directory does not exist.',
		};
	}

	const targetStat = lstatSync(target);
	if (!targetStat.isDirectory() || targetStat.isSymbolicLink()) {
		return {
			ok: false,
			target,
			conflicts: [target],
			protectedFiles: {},
			reason: 'Target must be a real directory, not a file or symbolic link.',
		};
	}

	const conflicts = [];
	const protectedFiles = {};
	let workspaceFileCount = 0;

	for (const entry of readdirSync(target, {withFileTypes: true})) {
		const entryPath = path.join(target, entry.name);

		if (entry.isSymbolicLink()) {
			conflicts.push(entryPath);
			continue;
		}

		if (entry.isDirectory() && ALLOWED_DIRECTORIES.has(entry.name)) {
			continue;
		}

		const isWorkspaceFile = entry.isFile() && entry.name.endsWith(WORKSPACE_FILE_SUFFIX);
		if (isWorkspaceFile) workspaceFileCount += 1;

		if (entry.isFile() && ALLOWED_FILES.has(entry.name)) {
			protectedFiles[entry.name] = hashFile(entryPath);
			continue;
		}

		if (isWorkspaceFile) continue;

		conflicts.push(entryPath);
	}

	if (workspaceFileCount > 1) {
		for (const entry of readdirSync(target, {withFileTypes: true})) {
			if (entry.isFile() && entry.name.endsWith(WORKSPACE_FILE_SUFFIX)) conflicts.push(path.join(target, entry.name));
		}
	}

	return {
		ok: conflicts.length === 0,
		target,
		conflicts,
		protectedFiles,
		reason: conflicts.length === 0
			? 'Target is empty or contains only permitted fresh-repository files.'
			: 'Target contains files or directories that initialization could overwrite.',
	};
}

function hashFile(filename) {
	return createHash('sha256').update(readFileSync(filename)).digest('hex');
}

function isMain() {
	return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
	const [, , targetPath, outputPath] = process.argv;

	if (!targetPath) {
		console.error('Usage: node preflight.mjs <target-directory> [report.json]');
		process.exitCode = 2;
	} else {
		const report = inspectTarget(targetPath);
		const serialized = `${JSON.stringify(report, null, '\t')}\n`;

		if (outputPath) {
			if (existsSync(outputPath)) {
				console.error(`Refusing to overwrite existing report: ${path.resolve(outputPath)}`);
				process.exitCode = 2;
			} else {
				writeFileSync(outputPath, serialized, {encoding: 'utf8', flag: 'wx'});
			}
		} else {
			process.stdout.write(serialized);
		}

		if (!report.ok) {
			process.exitCode = 1;
		}
	}
}
