import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {normalizeApplicationOptions} from '../../create-app/scripts/normalize-application-options.mjs';

export function normalizeOptions(raw) {
	const projectName = requiredString(raw.projectName, 'projectName');
	const projectSlug = requiredString(raw.projectSlug ?? raw.slug, 'projectSlug');

	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(projectSlug)) {
		throw new Error('projectSlug must use lowercase kebab-case');
	}

	const polylith = raw.polylith === true;
	const prettier = raw.prettier === true;
	const dataPersistence = raw.dataPersistence === true;
	let testing = raw.testing === true;
	let coverage = raw.coverage === true;

	if (!polylith) {
		if (coverage && !testing) {
			throw new Error('coverage requires testing');
		}

		return {
			projectName,
			projectSlug,
			slug: projectSlug,
			polylith: false,
			dataPersistence,
			prettier,
			testing: {enabled: testing, coverage},
		};
	}

	const localHttps = raw.localHttps === true;
	const application = normalizeApplicationOptions(
		{...raw, testing, coverage},
		{
			appName: raw.appName ?? projectName,
			appSlug: raw.appSlug ?? projectSlug,
			repositoryPosture: raw.repositoryPosture ?? 'local-only',
		},
	);

	return {
		projectName,
		projectSlug,
		slug: application.appSlug,
		polylith: true,
		...application,
		dataPersistence,
		multiple: true,
		deploymentMount: application.composedMount,
		localHttps: {
			enabled: localHttps,
			hostname: 'localhost',
			port: 8443,
			validDays: 365,
		},
		prettier,
	};
}

function requiredString(value, field) {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`${field} is required`);
	}

	return value.trim();
}

function isMain() {
	return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
	const [, , inputPath, outputPath] = process.argv;

	if (!inputPath) {
		console.error('Usage: node normalize-options.mjs <answers.json> [normalized.json]');
		process.exitCode = 2;
	} else {
		try {
			const raw = JSON.parse(readFileSync(inputPath, 'utf8'));
			const normalized = normalizeOptions(raw);
			const serialized = `${JSON.stringify(normalized, null, '\t')}\n`;

			if (outputPath) {
				if (existsSync(outputPath)) {
					throw new Error(`Refusing to overwrite existing output: ${path.resolve(outputPath)}`);
				}
				writeFileSync(outputPath, serialized, {encoding: 'utf8', flag: 'wx'});
			} else {
				process.stdout.write(serialized);
			}
		} catch (error) {
			console.error(error.message);
			process.exitCode = 1;
		}
	}
}
