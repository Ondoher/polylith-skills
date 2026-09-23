#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {readdir, readFile, realpath, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {parseManifest, parseOverlay} from './standards-config.mjs';

const fail = (message, details = {}) => {
	process.stdout.write(`${JSON.stringify({ok: false, message, ...details}, null, 2)}\n`);
	process.exitCode = 2;
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function parseArgs(argv) {
	const [command, ...rest] = argv;
	const values = {command, inputs: []};
	for (let index = 0; index < rest.length; index += 1) {
		const token = rest[index];
		const value = rest[index + 1];
		if (token === '--input') {
			if (!value) throw new Error('--input requires a value');
			values.inputs.push(value);
			index += 1;
		} else if (['--repo', '--manifest', '--output'].includes(token)) {
			if (!value) throw new Error(`${token} requires a value`);
			values[token.slice(2)] = value;
			index += 1;
		} else {
			throw new Error(`Unknown argument: ${token}`);
		}
	}
	return values;
}

function normalizeRelativePath(value) {
	if (!value || path.isAbsolute(value)) throw new Error(`Path must be repository-relative: ${value}`);
	const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
	const segments = normalized.split('/');
	if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
		throw new Error(`Path is not a normalized repository-relative path: ${value}`);
	}
	return normalized;
}

function isWithin(root, candidate) {
	const relative = path.relative(root, candidate);
	return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

async function resolveInput(repoReal, relativePath) {
	const candidate = path.resolve(repoReal, ...relativePath.split('/'));
	if (!isWithin(repoReal, candidate)) throw new Error(`Input escapes repository root: ${relativePath}`);
	const candidateReal = await realpath(candidate);
	if (!isWithin(repoReal, candidateReal)) throw new Error(`Input resolves outside repository root: ${relativePath}`);
	if (!(await stat(candidateReal)).isFile()) throw new Error(`Input is not a file: ${relativePath}`);
	return candidateReal;
}

async function buildInputs(repoReal, inputPaths) {
	const normalized = [...new Set(inputPaths.map(normalizeRelativePath))].sort((a, b) => a.localeCompare(b));
	const inputs = [];
	for (const relativePath of normalized) {
		const absolutePath = await resolveInput(repoReal, relativePath);
		inputs.push({path: relativePath, sha256: sha256(await readFile(absolutePath))});
	}
	return inputs;
}

async function validateFolder(repoReal, folder, description) {
	if (folder === '.') return;
	const candidate = path.resolve(repoReal, ...folder.slice(0, -1).split('/'));
	if (!isWithin(repoReal, candidate)) throw new Error(`${description} escapes the repository: ${folder}`);
	let resolved;
	try {
		resolved = await realpath(candidate);
	} catch (error) {
		throw new Error(`${description} does not exist: ${folder}`, {cause: error});
	}
	if (!isWithin(repoReal, resolved) || !(await stat(resolved)).isDirectory()) {
		throw new Error(`${description} is not a repository directory: ${folder}`);
	}
}

const ignoredDirectoryNames = new Set(['.git', 'node_modules', 'coverage', 'dist', 'build']);

async function walkFiles(root, current, accept, files) {
	let entries;
	try {
		entries = await readdir(current, {withFileTypes: true});
	} catch (error) {
		if (error.code === 'ENOENT') return;
		throw error;
	}
	// Nested checkouts and Polylith repositories own their own instructions.
	if (current !== root && entries.some((entry) => entry.name === '.git' || (entry.name === 'polylith.json' && entry.isFile()))) {
		return;
	}
	for (const entry of entries) {
		const absolute = path.join(current, entry.name);
		if (entry.isDirectory()) {
			if (!ignoredDirectoryNames.has(entry.name)) await walkFiles(root, absolute, accept, files);
		} else if (entry.isFile() && accept(entry.name, absolute)) {
			files.add(path.relative(root, absolute).replaceAll('\\', '/'));
		}
	}
}

async function discoverStandardsInputs(repoReal, manifest) {
	const overlay = 'agents/topics/standards/overlay.md';
	const manifestPath = await resolveInput(repoReal, manifest);
	const manifestText = await readFile(manifestPath, 'utf8');
	const parsedManifest = parseManifest(manifestText.replaceAll('\r\n', '\n'), manifest);
	const overlayPath = await resolveInput(repoReal, overlay);
	const overlayEntries = parseOverlay(await readFile(overlayPath, 'utf8'), parsedManifest.selected, overlay);
	for (const assignment of parsedManifest.assignments) {
		await validateFolder(repoReal, assignment.folder, 'Manifest folder assignment');
	}
	for (const entry of overlayEntries.filter(({kind}) => kind === 'folder')) {
		await validateFolder(repoReal, entry.folder, 'Overlay folder scope');
	}
	const discovered = new Set([manifest, overlay]);
	await walkFiles(repoReal, repoReal, (name) => name === 'AGENTS.md' || name === 'AGENTS.override.md', discovered);
	for (const relativeRoot of [
		'agents/topics/standards',
		'standards',
		'docs/standards',
		'documentation/standards',
		'.codex/standards',
	]) {
		const absoluteRoot = path.join(repoReal, ...relativeRoot.split('/'));
		await walkFiles(
			repoReal,
			absoluteRoot,
			(name) => name !== 'normalization.json' && name !== 'reconciliation.md',
			discovered,
		);
	}
	for (const match of manifestText.matchAll(/\]\(([^)#]+)(?:#[^)]+)?\)/g)) {
		const target = decodeURIComponent(match[1].trim());
		if (!target || /^[a-z]+:/i.test(target) || path.isAbsolute(target)) continue;
		const absolute = path.resolve(path.dirname(manifestPath), target.replaceAll('/', path.sep));
		if (!isWithin(repoReal, absolute)) continue;
		try {
			const targetReal = await realpath(absolute);
			if (isWithin(repoReal, targetReal) && (await stat(targetReal)).isFile()) {
				discovered.add(path.relative(repoReal, targetReal).replaceAll('\\', '/'));
			}
		} catch (error) {
			if (error.code !== 'ENOENT') throw error;
		}
	}
	return [...discovered].sort((a, b) => a.localeCompare(b));
}

const fingerprint = (inputs) => `sha256:${sha256(Buffer.from(JSON.stringify(inputs), 'utf8'))}`;

async function createAttestation(args) {
	if (!args.repo) throw new Error('create requires --repo');
	const repoReal = await realpath(path.resolve(args.repo));
	const manifest = normalizeRelativePath(args.manifest ?? 'agents/topics/standards/manifest.md');
	const output = normalizeRelativePath(args.output ?? 'agents/topics/standards/normalization.json');
	const discovered = await discoverStandardsInputs(repoReal, manifest);
	const inputs = await buildInputs(repoReal, [...args.inputs, ...discovered]);
	const attestation = {
		schemaVersion: 2,
		status: 'normalized',
		everNormalized: true,
		manifest,
		normalizedAt: new Date().toISOString(),
		repositoryStandardsFingerprint: fingerprint(inputs),
		pendingDivergences: 0,
		deferredDivergences: 0,
		inputs,
	};
	const outputPath = path.resolve(repoReal, ...output.split('/'));
	if (!isWithin(repoReal, outputPath)) throw new Error('Attestation output escapes repository root');
	await writeFile(outputPath, `${JSON.stringify(attestation, null, '\t')}\n`, 'utf8');
	process.stdout.write(`${JSON.stringify({ok: true, output, ...attestation}, null, 2)}\n`);
}

async function validateAttestation(args) {
	if (!args.repo) throw new Error('validate requires --repo');
	const repoReal = await realpath(path.resolve(args.repo));
	const output = normalizeRelativePath(args.output ?? 'agents/topics/standards/normalization.json');
	let attestation;
	try {
		attestation = JSON.parse(await readFile(path.resolve(repoReal, ...output.split('/')), 'utf8'));
	} catch (error) {
		fail('Normalization attestation is missing or invalid JSON', {output, error: error.message});
		return;
	}
	const structuralErrors = [];
	if (![1, 2].includes(attestation.schemaVersion)) structuralErrors.push('unsupported schemaVersion');
	if (attestation.status !== 'normalized') structuralErrors.push('status is not normalized');
	if (attestation.schemaVersion === 2 && attestation.everNormalized !== true)
		structuralErrors.push('everNormalized is not true');
	if (attestation.pendingDivergences !== 0) structuralErrors.push('pendingDivergences is not zero');
	if (attestation.deferredDivergences !== 0) structuralErrors.push('deferredDivergences is not zero');
	if (typeof attestation.normalizedAt !== 'string' || !attestation.normalizedAt.trim())
		structuralErrors.push('normalizedAt is missing');
	let manifest;
	try {
		manifest = normalizeRelativePath(attestation.manifest);
	} catch (error) {
		structuralErrors.push(error.message);
	}
	if (structuralErrors.length) {
		fail('Normalization attestation failed structural validation', {output, errors: structuralErrors});
		return;
	}
	process.stdout.write(
		`${JSON.stringify(
			{
				ok: true,
				output,
				manifest,
				normalizedAt: attestation.normalizedAt,
				everNormalized: true,
				initialFingerprint: attestation.repositoryStandardsFingerprint ?? null,
			},
			null,
			2,
		)}\n`,
	);
}

try {
	const args = parseArgs(process.argv.slice(2));
	if (args.command === 'create') await createAttestation(args);
	else if (args.command === 'validate') await validateAttestation(args);
	else
		throw new Error(
			'Usage: standards-attestation.mjs <create|validate> --repo <path> [--manifest <path>] [--input <path> ...] [--output <path>]',
		);
} catch (error) {
	fail(error.message);
}
