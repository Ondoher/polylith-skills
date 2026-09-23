import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REQUIRED_FILES = [
	'README.md',
	'documentation.md',
	'project-foundation.md',
	'architecture.md',
	'data-persistence.md',
	'code-conventions.md',
	'types.md',
	'jsdoc.md',
	'react.md',
	'polylith.md',
	'remvc.md',
	'mui.md',
	'base-components.md',
	'accessibility.md',
	'localization.md',
	'app-shells.md',
	'server.md',
	'socket-io.md',
	'testing.md',
	'local-https.md',
];

export function validateStandards(standardsPath) {
	const root = path.resolve(standardsPath);
	const errors = [];
	for (const filename of REQUIRED_FILES) {
		const target = path.join(root, filename);
		if (!existsSync(target)) {
			errors.push(`missing canonical standard: ${filename}`);
			continue;
		}
		const content = readFileSync(target, 'utf8');
		if (content.length < 500 || !/^#\s+/m.test(content) || !/^##\s+/m.test(content)) {
			errors.push(`canonical standard is incomplete: ${filename}`);
		}
		if (/\{\{[A-Z0-9_]+\}\}/.test(content))
			errors.push(`unresolved template value in canonical standard: ${filename}`);
		if (/Source Lineage|source authorit/i.test(content))
			errors.push(`canonical standard tracks an origin: ${filename}`);
	}
	return {ok: errors.length === 0, root, errors};
}

function isMain() {
	return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
	const standardsPath = process.argv[2];
	if (!standardsPath) {
		console.error('Usage: node validate-standards.mjs <standards-directory>');
		process.exitCode = 2;
	} else {
		const report = validateStandards(standardsPath);
		process.stdout.write(`${JSON.stringify(report, null, '\t')}\n`);
		if (!report.ok) process.exitCode = 1;
	}
}
