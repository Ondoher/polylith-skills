#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {readFile, realpath, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {parseManifest, parseOverlay} from '../../normalize-standards/scripts/standards-config.mjs';
import {publicationTarget, standardUrl} from './publication-links.mjs';

const generatedWarning = [
	'> **Generated developer reference.** Do not modify this file directly or use it as standards authority.',
	'>',
	'> To update it now, tell Codex: `Use $write-standards-guide to update this repository\'s generated STANDARDS.md now.`',
].join('\n');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const fail = (message) => {
	process.stdout.write(`${JSON.stringify({ok: false, message}, null, 2)}\n`);
	process.exitCode = 2;
};

function parseArgs(argv) {
	const [command = 'write', ...rest] = argv;
	const values = {command};
	for (let index = 0; index < rest.length; index += 1) {
		const token = rest[index];
		const value = rest[index + 1];
		if (!['--repo', '--codex-root', '--manifest', '--overlay'].includes(token)) {
			throw new Error(`Unknown argument: ${token}`);
		}
		if (!value) throw new Error(`${token} requires a value`);
		values[token.slice(2).replaceAll('-', '_')] = value;
		index += 1;
	}
	if (!['write', 'check'].includes(command) || !values.repo || !values.codex_root) {
		throw new Error('Usage: standards-guide.mjs <write|check> --repo <path> --codex-root <path>');
	}
	return values;
}

function normalizeRelative(value) {
	if (!value || path.isAbsolute(value)) throw new Error(`Path must be repository-relative: ${value}`);
	const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
	if (normalized.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
		throw new Error(`Invalid repository-relative path: ${value}`);
	}
	return normalized;
}

function isWithin(root, candidate) {
	const relative = path.relative(root, candidate);
	return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function repositoryFile(repo, relative) {
	const normalized = normalizeRelative(relative);
	const candidate = path.resolve(repo, ...normalized.split('/'));
	if (!isWithin(repo, candidate)) throw new Error(`Path escapes repository: ${relative}`);
	const absolute = await realpath(candidate);
	if (!isWithin(repo, absolute) || !(await stat(absolute)).isFile()) {
		throw new Error(`Path is not a repository file: ${relative}`);
	}
	return {absolute, path: normalized, content: await readFile(absolute, 'utf8')};
}

async function resolveStandards(manifestFile, parsed, canonicalRoot) {
	const resolved = new Map();
	for (const standard of parsed.selected.values()) {
		const destination = standard.href.replace(/^<|>$/g, '');
		if (/^[a-z]+:\/\//i.test(destination)) {
			throw new Error(`${manifestFile.path}: ${standard.name} must use a local canonical link`);
		}
		const candidate = path.resolve(path.dirname(manifestFile.absolute), destination.replaceAll('/', path.sep));
		const absolute = await realpath(candidate);
		if (!isWithin(canonicalRoot, absolute) || !(await stat(absolute)).isFile()) {
			throw new Error(`${manifestFile.path}: ${standard.name} is outside the canonical standards root`);
		}
		if (path.basename(absolute) !== standard.name) {
			throw new Error(`${manifestFile.path}: standard label does not match ${standard.name}`);
		}
		resolved.set(standard.name, {...standard, absolute, content: await readFile(absolute, 'utf8')});
	}
	return resolved;
}

async function validateNormalization(repo) {
	let attestation;
	try {
		attestation = JSON.parse(
			await readFile(path.join(repo, 'agents', 'topics', 'standards', 'normalization.json'), 'utf8'),
		);
	} catch (error) {
		throw new Error(`Repository normalization is missing or invalid: ${error.message}`, {cause: error});
	}
	if (
		![1, 2].includes(attestation.schemaVersion) ||
		attestation.status !== 'normalized' ||
		(attestation.schemaVersion === 2 && attestation.everNormalized !== true) ||
		attestation.pendingDivergences !== 0 ||
		attestation.deferredDivergences !== 0 ||
		typeof attestation.normalizedAt !== 'string' ||
		!attestation.normalizedAt.trim()
	) {
		throw new Error('Repository normalization attestation failed structural validation');
	}
	const manifest = normalizeRelative(attestation.manifest);
	return {
		manifest,
		normalizedAt: attestation.normalizedAt,
		initialFingerprint: attestation.repositoryStandardsFingerprint ?? null,
	};
}

function markdownPath(fromDirectory, destination) {
	let relative = path.relative(fromDirectory, destination).replaceAll('\\', '/');
	if (!relative.startsWith('.')) relative = `./${relative}`;
	return /[ ()]/.test(relative) ? `<${relative}>` : relative;
}

function renderEntries(lines, entries, publication) {
	if (!entries.length) {
		lines.push('None.', '');
		return;
	}
	for (const entry of entries) {
		lines.push(
			`### ${entry.operation}: ${entry.title}`,
			'',
			`- ${entry.operation === 'ADD' ? 'Extends' : 'Replaces'}: [\`${entry.target}\`](${standardUrl(publication, entry.standard, entry.target.slice(entry.target.indexOf('#') + 1))})`,
			`- Scope: \`${entry.scope}\``,
			`- Rule: ${entry.rule}`,
			`- Reason: ${entry.reason}`,
			'',
		);
	}
}

export async function buildGuide(args) {
	const repo = await realpath(path.resolve(args.repo));
	const codexRoot = await realpath(path.resolve(args.codex_root));
	const canonicalRoot = await realpath(path.join(codexRoot, 'documentation', 'standards'));
	const publication = await publicationTarget(canonicalRoot);
	const normalization = await validateNormalization(repo);
	const manifestFile = await repositoryFile(repo, args.manifest ?? normalization.manifest);
	const overlayFile = await repositoryFile(repo, args.overlay ?? 'agents/topics/standards/overlay.md');
	const manifest = parseManifest(manifestFile.content, manifestFile.path);
	const overlay = parseOverlay(overlayFile.content, manifest.selected, overlayFile.path);
	const standards = await resolveStandards(manifestFile, manifest, canonicalRoot);
	const repositoryConfigurationFingerprint = `sha256:${sha256(
		Buffer.from(
			JSON.stringify([
				{path: manifestFile.path, sha256: sha256(manifestFile.content)},
				{path: overlayFile.path, sha256: sha256(overlayFile.content)},
			]),
			'utf8',
		),
	)}`;
	const localOverlayFingerprint = `sha256:${sha256(overlayFile.content)}`;
	const canonicalFingerprint = `sha256:${sha256(
		Buffer.from(
			JSON.stringify(
				[...standards]
					.map(([name, standard]) => ({name, sha256: sha256(standard.content)}))
					.sort((left, right) => left.name.localeCompare(right.name)),
			),
			'utf8',
		),
	)}`;
	const sourceFingerprint = `sha256:${sha256(
		Buffer.from(
			JSON.stringify({repositoryConfigurationFingerprint, localOverlayFingerprint, canonicalFingerprint, publication}),
			'utf8',
		),
	)}`;
	const output = path.join(repo, 'STANDARDS.md');
	const outputDirectory = path.dirname(output);
	const lines = [
		'# Repository Engineering Standards',
		'',
		generatedWarning,
		'',
		'## Authority and provenance',
		'',
		`- Folder manifest: [\`${manifestFile.path}\`](${markdownPath(outputDirectory, manifestFile.absolute)})`,
		`- Repository overlay: [\`${overlayFile.path}\`](${markdownPath(outputDirectory, overlayFile.absolute)})`,
		`- Standards governance: [\`documentation.md\`](${standardUrl(publication, 'documentation.md')})`,
		`- First normalized: \`${normalization.normalizedAt}\``,
		`- Repository standards configuration fingerprint: \`${repositoryConfigurationFingerprint}\``,
		`- Local standards overlay fingerprint: \`${localOverlayFingerprint}\``,
		`- Selected canonical standards fingerprint: \`${canonicalFingerprint}\``,
		`- Guide source fingerprint: \`${sourceFingerprint}\``,
		'',
		'For each file, the longest matching folder assignment selects one named standards set. The set includes its inherited canonical standards, then matching folder-scoped overlay rules modify specific sections. This file is a readable projection only.',
		'',
		'Canonical links open the configured GitHub branch and show its latest published standards. Skills and reviewers still read local canonical files; the fingerprints above describe those local inputs, which may contain unpublished changes. Publish the governance checkout with `update-standards` to update the linked documents. Private repositories require GitHub access.',
		'',
		'## Standards sets',
		'',
	];
	for (const [name, set] of manifest.sets) {
		lines.push(`### \`${name}\``, '', `Extends: \`${set.extends ?? 'none'}\``, '', 'Adds:', '');
		for (const standard of set.standards) {
			lines.push(
				`- [\`${standard.name}\`](${standardUrl(publication, standard.name)}) — ${standard.reason}`,
			);
		}
		if (!set.standards.length) lines.push('- None.');
		lines.push('');
	}
	lines.push('## Folder assignments', '');
	for (const assignment of manifest.assignments) {
		lines.push(`- \`${assignment.folder}\` → \`${assignment.set}\` — ${assignment.reason}`);
	}
	lines.push('', '## Repository-wide additions and replacements', '');
	renderEntries(
		lines,
		overlay.filter(({kind}) => kind === 'repository'),
		publication,
	);
	lines.push('## Folder-specific additions and replacements', '');
	renderEntries(
		lines,
		overlay.filter(({kind}) => kind === 'folder'),
		publication,
	);
	while (lines.at(-1) === '') lines.pop();
	return {
		output,
		content: `${lines.join('\n')}\n`,
		sourceFingerprint,
		normalization: normalization.normalizedAt,
		repositoryConfigurationFingerprint,
		localOverlayFingerprint,
		canonicalFingerprint,
	};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const args = parseArgs(process.argv.slice(2));
		const guide = await buildGuide(args);
		let current;
		try {
			current = await readFile(guide.output, 'utf8');
		} catch (error) {
			if (error.code !== 'ENOENT') throw error;
		}
		if (args.command === 'check') {
			const status = current === undefined ? 'missing' : current === guide.content ? 'current' : 'stale';
			const ok = status === 'current';
			process.stdout.write(
				`${JSON.stringify(
					{
						ok,
						status,
						output: 'STANDARDS.md',
						repositoryConfigurationFingerprint: guide.repositoryConfigurationFingerprint,
						localOverlayFingerprint: guide.localOverlayFingerprint,
						canonicalFingerprint: guide.canonicalFingerprint,
						sourceFingerprint: guide.sourceFingerprint,
					},
					null,
					2,
				)}\n`,
			);
			if (!ok) process.exitCode = 3;
		} else {
			const changed = current !== guide.content;
			if (changed) await writeFile(guide.output, guide.content, 'utf8');
			process.stdout.write(
				`${JSON.stringify(
					{
						ok: true,
						status: changed ? (current === undefined ? 'created' : 'updated') : 'current',
						output: 'STANDARDS.md',
						normalization: guide.normalization,
						repositoryConfigurationFingerprint: guide.repositoryConfigurationFingerprint,
						localOverlayFingerprint: guide.localOverlayFingerprint,
						canonicalFingerprint: guide.canonicalFingerprint,
						sourceFingerprint: guide.sourceFingerprint,
					},
					null,
					2,
				)}\n`,
			);
		}
	} catch (error) {
		fail(error.message);
	}
}
