#!/usr/bin/env node

import {readFile, realpath} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
	overlayForPath,
	parseManifest,
	parseOverlay,
	standardsForPath,
} from '../../normalize-standards/scripts/standards-config.mjs';

const fail = (message) => {
	process.stdout.write(`${JSON.stringify({ok: false, message}, null, 2)}\n`);
	process.exitCode = 2;
};

function parseArgs(argv) {
	const result = {paths: []};
	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		const value = argv[index + 1];
		if (!value) throw new Error(`${token} requires a value`);
		if (token === '--repo') result.repo = value;
		else if (token === '--manifest') result.manifest = value;
		else if (token === '--overlay') result.overlay = value;
		else if (token === '--path') result.paths.push(value);
		else throw new Error(`Unknown argument: ${token}`);
		index += 1;
	}
	if (!result.repo) throw new Error('--repo is required');
	return result;
}

try {
	const args = parseArgs(process.argv.slice(2));
	const repo = await realpath(path.resolve(args.repo));
	const manifestPath = args.manifest ?? 'agents/topics/standards/manifest.md';
	const overlayPath = args.overlay ?? 'agents/topics/standards/overlay.md';
	const manifest = parseManifest(await readFile(path.join(repo, ...manifestPath.split('/')), 'utf8'), manifestPath);
	const overlay = parseOverlay(
		await readFile(path.join(repo, ...overlayPath.split('/')), 'utf8'),
		manifest.selected,
		overlayPath,
	);
	const scopes = args.paths.map((requestedPath) => {
		const resolved = standardsForPath(manifest, requestedPath);
		return {
			path: resolved.file,
			folder: resolved.assignment.folder,
			set: resolved.assignment.set,
			standards: resolved.standards.map(({name}) => ({
				name,
				overlay: overlayForPath(overlay, resolved.file, name),
			})),
		};
	});
	process.stdout.write(
		`${JSON.stringify(
			{
				ok: true,
				manifest: manifestPath,
				overlay: overlayPath,
				sets: [...manifest.resolvedSets].map(([name, standards]) => ({
					name,
					standards: standards.map(({name: standard}) => standard),
				})),
				assignments: manifest.assignments,
				scopes,
			},
			null,
			2,
		)}\n`,
	);
} catch (error) {
	fail(error.message);
}
