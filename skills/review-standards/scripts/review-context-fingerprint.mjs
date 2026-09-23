#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {readFile, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const fail = (message) => {
	process.stdout.write(`${JSON.stringify({ok: false, message}, null, 2)}\n`);
	process.exitCode = 2;
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function parseArgs(argv) {
	const result = {repoInputs: [], codexInputs: []};
	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		const value = argv[index + 1];
		if (!value) throw new Error(`${token} requires a value`);
		if (token === '--repo-input') result.repoInputs.push(value);
		else if (token === '--codex-input') result.codexInputs.push(value);
		else if (token === '--lane') result.lane = value;
		else if (token === '--repo') result.repo = value;
		else if (token === '--codex-root') result.codexRoot = value;
		else throw new Error(`Unknown argument: ${token}`);
		index += 1;
	}
	return result;
}

function normalizeRelative(value) {
	if (!value || path.isAbsolute(value)) throw new Error(`Input must be relative to its declared root: ${value}`);
	const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
	if (normalized.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
		throw new Error(`Input is not a normalized relative path: ${value}`);
	}
	return normalized;
}

function isWithin(root, candidate) {
	const relative = path.relative(root, candidate);
	return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function hashInput(kind, root, value) {
	const normalized = normalizeRelative(value);
	const candidate = path.resolve(root, ...normalized.split('/'));
	if (!isWithin(root, candidate)) throw new Error(`${kind} input escapes its root: ${normalized}`);
	const resolved = await realpath(candidate);
	if (!isWithin(root, resolved) || !(await stat(resolved)).isFile()) {
		throw new Error(`${kind} input is not a file beneath its root: ${normalized}`);
	}
	return {kind, path: normalized, sha256: sha256(await readFile(resolved))};
}

try {
	const args = parseArgs(process.argv.slice(2));
	if (!args.lane || !args.repo || !args.codexRoot) {
		throw new Error(
			'Usage: review-context-fingerprint.mjs --lane <name> --repo <path> --codex-root <path> [--repo-input <path> ...] [--codex-input <path> ...]',
		);
	}
	const repoRoot = await realpath(path.resolve(args.repo));
	const codexRoot = await realpath(path.resolve(args.codexRoot));
	const keys = new Set();
	const inputs = [];
	for (const [kind, root, values] of [
		['codex', codexRoot, args.codexInputs],
		['repository', repoRoot, args.repoInputs],
	]) {
		for (const value of values) {
			const input = await hashInput(kind, root, value);
			const key = `${input.kind}:${input.path}`;
			if (keys.has(key)) throw new Error(`Duplicate input: ${key}`);
			keys.add(key);
			inputs.push(input);
		}
	}
	inputs.sort((left, right) => left.kind.localeCompare(right.kind) || left.path.localeCompare(right.path));
	const payload = {lane: args.lane, inputs};
	const fingerprint = `sha256:${sha256(Buffer.from(JSON.stringify(payload), 'utf8'))}`;
	process.stdout.write(`${JSON.stringify({ok: true, fingerprint, ...payload}, null, 2)}\n`);
} catch (error) {
	fail(error.message);
}
