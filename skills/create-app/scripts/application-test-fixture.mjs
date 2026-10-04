import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const STANDARD_NAMES = [
	'documentation.md',
	'project-foundation.md',
	'architecture.md',
	'code-conventions.md',
	'types.md',
	'jsdoc.md',
	'polylith.md',
	'react.md',
	'server.md',
	'testing.md',
];

/** Synthetic normalized repository shared by direct and MCP positive cases. */
export function createApplicationFixture(assignedTarget) {
	const target = assignedTarget ?? mkdtempSync(path.join(os.tmpdir(), 'create-app-'));
	for (const directory of ['.agents/topics/standards', '.agents/topics', 'src/home', 'builds', 'node_modules/.bin'])
		mkdirSync(path.join(target, directory), {recursive: true});
	writeFileSync(
		path.join(target, 'node_modules/.bin', process.platform === 'win32' ? 'prettier.cmd' : 'prettier'),
		'',
	);
	writeFileSync(path.join(target, 'AGENTS.md'), '# Agents\n');
	writeFileSync(path.join(target, '.agents/topics/README.md'), '# Topics\n');
	writeFileSync(path.join(target, '.agents/topics/standards/overlay.md'), '# Overlay\n\nNone.\n');
	writeFileSync(
		path.join(target, '.agents/topics/standards/reconciliation.md'),
		'# Standards Reconciliation\n\nStatus: normalized\n',
	);
	writeFileSync(
		path.join(target, '.agents/topics/standards/normalization.json'),
		`${JSON.stringify({schemaVersion: 2, status: 'normalized', everNormalized: true})}\n`,
	);
	writeFileSync(
		path.join(target, '.agents/topics/standards/manifest.md'),
		`# Folder Standards Manifest\n\n## Standards Sets\n\n### \`base\`\n\nExtends: none\nStandards:\n\n${STANDARD_NAMES.map((name) => `- [${name}](C:/standards/${name}) - Canonical.`).join('\n')}\n\n## Folder Assignments\n\n- \`.\` - \`base\` - Repository root.\n`,
	);
	writeFileSync(
		path.join(target, 'polylith.json'),
		`${JSON.stringify({multiple: false, builds: 'builds', dest: 'dist', src: 'src', react: true, port: 8080, discover: ['deployed-apps'], apps: [{name: 'home', filename: 'home.json', default: true, mount: '/'}]}, null, '\t')}\n`,
	);
	writeFileSync(
		path.join(target, 'package.json'),
		`${JSON.stringify({name: 'host-project', description: 'Host Project', type: 'module', scripts: {'format:check': 'prettier --check .'}, dependencies: {polylith: '1.3.0', react: '^19.0.0'}, devDependencies: {prettier: '^3.0.0'}}, null, '\t')}\n`,
	);
	writeFileSync(path.join(target, 'src/home/index.js'), 'export {};\n');
	writeFileSync(path.join(target, 'builds/home.json'), '{}\n');
	return target;
}
