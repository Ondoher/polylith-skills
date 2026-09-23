import {existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ALLOWED_FRONTMATTER_KEYS = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata']);

export function validateSkill(skillPath) {
	const root = path.resolve(skillPath);
	const errors = [];
	const skillFile = path.join(root, 'SKILL.md');

	if (!existsSync(skillFile)) return {ok: false, errors: ['SKILL.md not found']};

	const content = readFileSync(skillFile, 'utf8');
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {ok: false, errors: ['Invalid YAML frontmatter boundary']};

	const frontmatter = parseSimpleFrontmatter(match[1], errors);
	for (const key of Object.keys(frontmatter)) {
		if (!ALLOWED_FRONTMATTER_KEYS.has(key)) errors.push(`Unexpected frontmatter key: ${key}`);
	}

	const name = frontmatter.name || '';
	const description = frontmatter.description || '';
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) errors.push('Invalid skill name');
	if (!description || description.length > 1024 || /[<>]/.test(description)) errors.push('Invalid skill description');
	if (/\[TODO:|\bPLACEHOLDER\b/.test(content)) errors.push('Unfinished scaffold marker in SKILL.md');
	if (!content.includes('$CODEX_HOME/documentation/standards'))
		errors.push('SKILL.md must route to canonical global standards');
	if (/source-authorities|Source Lineage/i.test(content)) errors.push('SKILL.md must not track standards origins');

	for (const link of content.matchAll(/\]\(([^)]+)\)/g)) {
		const target = link[1];
		if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue;
		if (!existsSync(path.resolve(root, target))) errors.push(`Broken SKILL.md link: ${target}`);
	}

	const agentFile = path.join(root, 'agents', 'openai.yaml');
	if (!existsSync(agentFile)) {
		errors.push('agents/openai.yaml not found');
	} else {
		const agentContent = readFileSync(agentFile, 'utf8');
		if (!agentContent.includes('$initialize-project'))
			errors.push('default_prompt must mention $initialize-project');
		if (!agentContent.includes('allow_implicit_invocation: true'))
			errors.push('implicit invocation must be enabled');
	}

	const referencesPath = path.join(root, 'references');
	if (!existsSync(referencesPath) || readdirSync(referencesPath).length === 0) errors.push('references are missing');
	for (const script of ['apply-scaffold.mjs', 'scaffold-plan.mjs', 'validate-standards.mjs']) {
		if (!existsSync(path.join(root, 'scripts', script)))
			errors.push(`required generator script is missing: ${script}`);
	}
	for (const sharedScript of ['application-engine.mjs', 'normalize-application-options.mjs']) {
		const filename = path.resolve(root, '..', 'create-app', 'scripts', sharedScript);
		if (!existsSync(filename)) errors.push(`shared create-app script is missing: ${sharedScript}`);
	}
	for (const asset of [
		'client/socket-stream.js',
		'client/SocketStreamSpec.js',
		'server/socket-stream.js',
		'server/socket-stream.spec.js',
	]) {
		if (!existsSync(path.join(root, 'assets', 'socket-io', asset)))
			errors.push(`required Socket.IO asset is missing: ${asset}`);
	}
	for (const asset of [
		'component-text.js',
		'BaseTextInput.jsx',
		'BaseSelect.jsx',
		'BaseCheckbox.jsx',
		'BaseRadioButtons.jsx',
		'BaseButton.jsx',
		'BaseHelperText.jsx',
		'BaseFormMessage.jsx',
		'BaseDialog.jsx',
		'testing/TestHarness.js',
		'testing/TestHarnessSpec.js',
		'tests/BaseTextSpec.js',
		'tests/FormControlsSpec.js',
		'tests/FeedbackSpec.js',
		'tests/BaseDialogSpec.js',
	]) {
		if (!existsSync(path.join(root, 'assets', 'components', asset)))
			errors.push(`required component asset is missing: ${asset}`);
	}
	for (const topic of [
		'app-shell',
		'architecture',
		'project-foundation',
		'server',
		'standards',
		'testing-headless',
		'testing-polylith',
	]) {
		const filename = path.join(
			root,
			'assets',
			'topics',
			topic,
			topic === 'standards' ? 'manifest.md' : 'README.md',
		);
		if (!existsSync(filename)) {
			errors.push(`required generated topic asset is missing: ${topic}`);
			continue;
		}
		const topicContent = readFileSync(filename, 'utf8');
		if (topicContent.length < 250 || !/^##\s+/m.test(topicContent))
			errors.push(`generated local topic asset is incomplete: ${topic}`);
		if (/Source Lineage|source authorit/i.test(topicContent))
			errors.push(`generated local topic tracks a standards origin: ${topic}`);
	}

	return {ok: errors.length === 0, errors};
}

function parseSimpleFrontmatter(text, errors) {
	const result = {};
	for (const line of text.split(/\r?\n/)) {
		if (!line.trim()) continue;
		const separator = line.indexOf(':');
		if (separator <= 0) {
			errors.push(`Invalid frontmatter line: ${line}`);
			continue;
		}
		const key = line.slice(0, separator).trim();
		let value = line.slice(separator + 1).trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		result[key] = value;
	}
	return result;
}

function isMain() {
	return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
	const skillPath = process.argv[2];
	if (!skillPath) {
		console.error('Usage: node validate-skill.mjs <skill-directory>');
		process.exitCode = 2;
	} else {
		const report = validateSkill(skillPath);
		process.stdout.write(`${JSON.stringify(report, null, '\t')}\n`);
		if (!report.ok) process.exitCode = 1;
	}
}
