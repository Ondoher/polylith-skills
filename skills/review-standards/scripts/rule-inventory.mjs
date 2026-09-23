import {readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const markerPattern = /^\s*<!-- rule: ([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+) -->\s*$/;
const headingPattern = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const listPattern = /^\s*(?:[-+*]|\d+[.)])\s+/;
const fencePattern = /^\s*(`{3,}|~{3,})(.*)$/;
const tableSeparatorPattern = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;

function fail(standard, line, message) {
	throw new Error(`${standard}:${line}: ${message}`);
}

function isMarkerLike(line) {
	return /<!--\s*rule\b/i.test(line);
}

function isTableStart(lines, index) {
	return (
		/^\s*\|/.test(lines[index]) ||
		(lines[index].includes('|') && tableSeparatorPattern.test(lines[index + 1] ?? ''))
	);
}

function startsBlock(lines, index) {
	const line = lines[index];
	return (
		!line.trim() ||
		isMarkerLike(line) ||
		headingPattern.test(line) ||
		listPattern.test(line) ||
		fencePattern.test(line) ||
		isTableStart(lines, index)
	);
}

// Blocks are paragraphs, individual list entries with wrapped continuation lines,
// whole tables, and whole fenced examples. Code contents are never interpreted
// as headings, list entries, or rule annotations.
function tokenize(markdown, standard) {
	const lines = markdown.replace(/\r\n/g, '\n').split('\n');
	const tokens = [];
	const ancestry = [];
	let index = 0;
	while (index < lines.length) {
		const line = lines[index];
		if (!line.trim()) {
			index += 1;
			continue;
		}
		if (isMarkerLike(line)) {
			const marker = markerPattern.exec(line);
			if (!marker) fail(standard, index + 1, 'malformed rule annotation');
			tokens.push({kind: 'marker', id: marker[1], line: index + 1});
			index += 1;
			continue;
		}
		const heading = headingPattern.exec(line);
		if (heading) {
			ancestry.length = heading[1].length - 1;
			ancestry.push(heading[2]);
			tokens.push({kind: 'heading', line: index + 1});
			index += 1;
			continue;
		}
		const start = index;
		const fence = fencePattern.exec(line);
		if (fence) {
			const delimiter = fence[1][0];
			const closing = new RegExp(`^\\s*${delimiter}{${fence[1].length},}\\s*$`);
			index += 1;
			while (index < lines.length && !closing.test(lines[index])) index += 1;
			if (index === lines.length) fail(standard, start + 1, 'unclosed fenced example');
			index += 1;
		} else if (isTableStart(lines, index)) {
			index += 1;
			while (
				index < lines.length &&
				lines[index].trim() &&
				lines[index].includes('|') &&
				!isMarkerLike(lines[index]) &&
				!headingPattern.test(lines[index]) &&
				!fencePattern.test(lines[index]) &&
				!listPattern.test(lines[index])
			)
				index += 1;
		} else {
			index += 1;
			while (index < lines.length && !startsBlock(lines, index)) index += 1;
		}
		tokens.push({
			kind: 'block',
			line: start + 1,
			endLine: index,
			text: lines.slice(start, index).join('\n'),
			section: ancestry.filter(Boolean),
		});
	}
	return tokens;
}

/** Parse an explicitly annotated standard, rejecting any uncovered content. */
export function parseRules(markdown, standardName) {
	const rules = [];
	const seen = new Set();
	let pending = null;
	for (const token of tokenize(markdown, standardName)) {
		if (token.kind === 'marker') {
			if (seen.has(token.id)) fail(standardName, token.line, `duplicate rule ID ${token.id}`);
			if (pending) fail(standardName, pending.line, `orphan/empty rule ID ${pending.id}`);
			seen.add(token.id);
			pending = token;
		} else if (token.kind === 'heading') {
			if (pending) fail(standardName, pending.line, `orphan/empty rule ID ${pending.id} before heading`);
		} else {
			if (!pending) fail(standardName, token.line, 'content lacks a rule ID');
			const {kind, ...block} = token;
			rules.push({id: pending.id, standard: standardName, ...block});
			pending = null;
		}
	}
	if (pending) fail(standardName, pending.line, `orphan/empty rule ID ${pending.id}`);
	return rules;
}

/** Mechanical initial annotation. Existing IDs are never renumbered. */
export function annotateRules(markdown, standardName) {
	const tokens = tokenize(markdown, standardName);
	const seen = new Set();
	for (const token of tokens) {
		if (token.kind !== 'marker') continue;
		if (seen.has(token.id)) fail(standardName, token.line, `duplicate rule ID ${token.id}`);
		seen.add(token.id);
	}
	const filename = standardName.replaceAll('\\', '/').split('/').at(-1).replace(/\.md$/i, '');
	const prefix = filename
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	if (!/^[A-Z]/.test(prefix)) throw new Error(`Invalid standard name: ${standardName}`);
	const insertions = new Map();
	let next = 1;
	let pending = null;
	for (const token of tokens) {
		if (token.kind === 'marker') {
			if (pending) fail(standardName, pending.line, `orphan/empty rule ID ${pending.id}`);
			pending = token;
		} else if (token.kind === 'heading') {
			if (pending) fail(standardName, pending.line, `orphan/empty rule ID ${pending.id} before heading`);
		} else {
			if (!pending) {
				let id;
				do {
					id = `${prefix}-${String(next++).padStart(3, '0')}`;
				} while (seen.has(id));
				seen.add(id);
				insertions.set(token.line, `<!-- rule: ${id} -->`);
			}
			pending = null;
		}
	}
	if (pending) fail(standardName, pending.line, `orphan/empty rule ID ${pending.id}`);
	const newline = markdown.includes('\r\n') ? '\r\n' : '\n';
	const annotated = markdown
		.split(/\r?\n/)
		.flatMap((line, index) => (insertions.has(index + 1) ? [insertions.get(index + 1), line] : [line]))
		.join(newline);
	parseRules(annotated, standardName);
	return annotated;
}

/** Read all canonical Markdown standards recursively, except navigation READMEs. */
export async function inventoryDirectory(root) {
	const files = await standardFiles(root);
	const rules = [];
	const seen = new Set();
	for (const file of files) {
		const standard = path.relative(root, file).replaceAll('\\', '/');
		for (const rule of parseRules(await readFile(file, 'utf8'), standard)) {
			if (seen.has(rule.id)) fail(standard, rule.line, `duplicate rule ID across standards: ${rule.id}`);
			seen.add(rule.id);
			rules.push(rule);
		}
	}
	return rules;
}

async function standardFiles(root) {
	const files = [];
	for (const entry of await readdir(root, {withFileTypes: true})) {
		const file = path.join(root, entry.name);
		if (entry.isDirectory()) files.push(...(await standardFiles(file)));
		else if (entry.isFile() && /\.md$/i.test(entry.name) && !/^readme\.md$/i.test(entry.name)) files.push(file);
	}
	return files.sort();
}

async function main() {
	const [mode, root, ...extra] = process.argv.slice(2);
	if (!['--check', '--annotate'].includes(mode) || !root || extra.length)
		throw new Error('Usage: node rule-inventory.mjs --check|--annotate <standards-root>');
	if (mode === '--annotate') {
		// Validate every proposed rewrite and global ID uniqueness before writing.
		const proposed = [];
		const seen = new Set();
		for (const file of await standardFiles(root)) {
			const standard = path.relative(root, file).replaceAll('\\', '/');
			const content = annotateRules(await readFile(file, 'utf8'), standard);
			for (const rule of parseRules(content, standard)) {
				if (seen.has(rule.id)) fail(standard, rule.line, `duplicate rule ID across standards: ${rule.id}`);
				seen.add(rule.id);
			}
			proposed.push({file, content});
		}
		for (const {file, content} of proposed) await writeFile(file, content, 'utf8');
	}
	process.stdout.write(`${JSON.stringify(await inventoryDirectory(root), null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	main().catch((error) => {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	});
}
