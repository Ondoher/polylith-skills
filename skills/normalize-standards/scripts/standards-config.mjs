import path from 'node:path';

function section(content, heading, source, {required = false} = {}) {
	const matches = [...content.matchAll(new RegExp(`^## ${heading}\\s*$`, 'gm'))];
	if (!matches.length) {
		if (required) throw new Error(`${source}: missing "## ${heading}" section`);
		return undefined;
	}
	if (matches.length > 1) throw new Error(`${source}: duplicate "## ${heading}" sections`);
	const remainder = content.slice(matches[0].index + matches[0][0].length);
	const next = remainder.search(/^## /m);
	return (next === -1 ? remainder : remainder.slice(0, next)).trim();
}

export function normalizeRelativeFile(value) {
	if (!value || path.isAbsolute(value)) throw new Error(`Path must be repository-relative: ${value}`);
	const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
	if (normalized.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
		throw new Error(`Invalid repository-relative file path: ${value}`);
	}
	return normalized;
}

export function normalizeFolder(value) {
	if (value === '.') return '.';
	if (!value || path.isAbsolute(value)) throw new Error(`Folder must be repository-relative: ${value}`);
	const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
	if (!normalized.endsWith('/')) throw new Error(`Folder path must end with "/": ${value}`);
	const segments = normalized.slice(0, -1).split('/');
	if (segments.some((segment) => !segment || segment === '.' || segment === '..' || /[*?\[\]]/.test(segment))) {
		throw new Error(`Invalid repository-relative folder path: ${value}`);
	}
	return normalized;
}

function parseSetSections(body, source) {
	const headings = [...body.matchAll(/^### `([a-z][a-z0-9-]*)`\s*$/gm)];
	if (!headings.length) throw new Error(`${source}: Standards Sets must define at least one named set`);
	const prefix = body.slice(0, headings[0].index).trim();
	if (prefix) throw new Error(`${source}: unexpected content before the first standards set`);
	return headings.map((heading, index) => ({
		name: heading[1],
		body: body.slice(heading.index + heading[0].length, headings[index + 1]?.index ?? body.length).trim(),
	}));
}

function parseSet(sectionValue, source) {
	const lines = sectionValue.body.split('\n').filter((line) => line.trim());
	const extendsLine = lines.shift();
	const extendsMatch = extendsLine?.match(/^Extends: (none|[a-z][a-z0-9-]*)$/);
	if (!extendsMatch) throw new Error(`${source}: set ${sectionValue.name} must begin with "Extends: <set|none>"`);
	if (lines.shift() !== 'Standards:') {
		throw new Error(`${source}: set ${sectionValue.name} must contain a Standards list after Extends`);
	}
	const standards = lines.map((line) => {
		const match = line.match(/^- \[([^\]]+\.md)\]\(([^)]+)\)\s+[—-]\s+(.+)$/);
		if (!match) throw new Error(`${source}: invalid standard line in set ${sectionValue.name}: "${line}"`);
		return {name: match[1], href: match[2].trim(), reason: match[3].trim()};
	});
	if (!standards.length && extendsMatch[1] === 'none') {
		throw new Error(`${source}: root set ${sectionValue.name} must select at least one standard`);
	}
	if (new Set(standards.map(({name}) => name)).size !== standards.length) {
		throw new Error(`${source}: set ${sectionValue.name} contains a duplicate standard`);
	}
	return {name: sectionValue.name, extends: extendsMatch[1] === 'none' ? null : extendsMatch[1], standards};
}

export function parseManifest(content, source = 'manifest.md') {
	const setsBody = section(content, 'Standards Sets', source, {required: true});
	const assignmentsBody = section(content, 'Folder Assignments', source, {required: true});
	const sets = new Map();
	for (const setSection of parseSetSections(setsBody, source)) {
		if (sets.has(setSection.name)) throw new Error(`${source}: duplicate standards set ${setSection.name}`);
		sets.set(setSection.name, parseSet(setSection, source));
	}

	const resolvedSets = new Map();
	const resolving = new Set();
	const resolveSet = (name) => {
		if (resolvedSets.has(name)) return resolvedSets.get(name);
		const set = sets.get(name);
		if (!set) throw new Error(`${source}: unknown standards set ${name}`);
		if (resolving.has(name)) throw new Error(`${source}: standards-set inheritance cycle at ${name}`);
		resolving.add(name);
		const inherited = set.extends ? resolveSet(set.extends) : [];
		const inheritedNames = new Set(inherited.map(({name: standard}) => standard));
		for (const standard of set.standards) {
			if (inheritedNames.has(standard.name)) {
				throw new Error(`${source}: set ${name} repeats inherited standard ${standard.name}`);
			}
		}
		const result = [...inherited, ...set.standards];
		resolving.delete(name);
		resolvedSets.set(name, result);
		return result;
	};
	for (const name of sets.keys()) resolveSet(name);

	const assignmentLines = assignmentsBody.split('\n').filter((line) => line.trim());
	if (!assignmentLines.length) throw new Error(`${source}: Folder Assignments must not be empty`);
	const assignments = assignmentLines.map((line) => {
		const match = line.match(/^- `([^`]+)`\s+[—-]\s+`([a-z][a-z0-9-]*)`\s+[—-]\s+(.+)$/);
		if (!match) throw new Error(`${source}: invalid folder assignment "${line}"`);
		const folder = normalizeFolder(match[1]);
		if (!sets.has(match[2])) throw new Error(`${source}: folder ${folder} uses unknown set ${match[2]}`);
		return {folder, set: match[2], reason: match[3].trim()};
	});
	if (new Set(assignments.map(({folder}) => folder)).size !== assignments.length) {
		throw new Error(`${source}: duplicate folder assignment`);
	}
	if (!assignments.some(({folder}) => folder === '.')) {
		throw new Error(`${source}: Folder Assignments must include the repository root "."`);
	}

	const selected = new Map();
	for (const standards of resolvedSets.values()) {
		for (const standard of standards) {
			const prior = selected.get(standard.name);
			if (prior && prior.href !== standard.href) {
				throw new Error(`${source}: standard ${standard.name} uses conflicting links`);
			}
			if (!prior) selected.set(standard.name, standard);
		}
	}

	return {sets, resolvedSets, assignments, selected};
}

export function standardsForPath(manifest, value) {
	const file = normalizeRelativeFile(value);
	const matches = manifest.assignments.filter(({folder}) => folder === '.' || file.startsWith(folder));
	matches.sort((left, right) => right.folder.length - left.folder.length);
	const assignment = matches[0];
	if (!assignment) throw new Error(`No folder standards assignment matches ${file}`);
	return {file, assignment, standards: manifest.resolvedSets.get(assignment.set)};
}

export function parseOverlay(content, selectedStandards, source = 'overlay.md') {
	const normalized = content.replaceAll('\r\n', '\n').trim();
	const heading = '# Repository Standards Overlay';
	if (!normalized.startsWith(`${heading}\n`)) throw new Error(`${source}: must begin with "${heading}"`);
	const body = normalized.slice(heading.length).trim();
	if (body === 'None.') return [];
	if (body.includes('None.')) throw new Error(`${source}: None. cannot appear with local rules`);
	const sections = body.split(/(?=^## )/m).filter(Boolean);
	if (!sections.length || sections.join('') !== body) {
		throw new Error(`${source}: local rules must be level-two ADD or REPLACE sections`);
	}
	const entries = [];
	for (const ruleSection of sections) {
		const [headingLine, ...lines] = ruleSection.trim().split('\n');
		const headingMatch = headingLine.match(/^## (ADD|REPLACE):\s+(\S.+)$/);
		if (!headingMatch) throw new Error(`${source}: invalid rule heading "${headingLine}"`);
		const operation = headingMatch[1];
		const fields = new Map();
		for (const line of lines) {
			const field = line.match(/^(Extends|Replaces|Scope|Rule|Reason):\s+(.+)$/);
			if (field) {
				if (fields.has(field[1])) throw new Error(`${source}: duplicate ${field[1]} in ${headingLine}`);
				fields.set(field[1], field[2].trim());
			} else if (line.trim()) throw new Error(`${source}: invalid rule line "${line}"`);
		}
		const targetField = operation === 'ADD' ? 'Extends' : 'Replaces';
		const otherTarget = operation === 'ADD' ? 'Replaces' : 'Extends';
		for (const required of [targetField, 'Scope', 'Rule', 'Reason']) {
			if (!fields.get(required)) throw new Error(`${source}: ${headingLine} is missing ${required}`);
		}
		if (fields.has(otherTarget)) throw new Error(`${source}: ${headingLine} cannot contain ${otherTarget}`);
		const target = fields.get(targetField).replaceAll('`', '');
		if (!/^[^\s`]+\.md#.+$/.test(target)) {
			throw new Error(`${source}: ${targetField} must name a canonical section as filename.md#section`);
		}
		const [standard] = target.split('#');
		if (!selectedStandards.has(standard)) {
			throw new Error(
				`${source}: ${targetField} targets a standard absent from every standards set: ${standard}`,
			);
		}
		const rawScope = fields.get('Scope');
		const scope = rawScope === 'repository' ? {kind: 'repository', folder: '.'} : undefined;
		if (!scope && !rawScope.startsWith('folder:')) {
			throw new Error(`${source}: Scope must be "repository" or "folder:<path>/": ${rawScope}`);
		}
		const resolvedScope = scope ?? {kind: 'folder', folder: normalizeFolder(rawScope.slice('folder:'.length))};
		entries.push({
			title: headingMatch[2],
			operation,
			target,
			standard,
			scope: rawScope,
			...resolvedScope,
			rule: fields.get('Rule'),
			reason: fields.get('Reason'),
		});
	}
	const keys = new Set();
	for (const entry of entries) {
		const key = `${entry.operation}:${entry.target}:${entry.scope}`;
		if (keys.has(key))
			throw new Error(`${source}: duplicate ${entry.operation} for ${entry.target} in ${entry.scope}`);
		keys.add(key);
	}
	return entries;
}

export function overlayForPath(entries, value, standard) {
	const file = normalizeRelativeFile(value);
	const matching = entries.filter(
		(entry) => entry.standard === standard && (entry.kind === 'repository' || file.startsWith(entry.folder)),
	);
	const additions = matching.filter(({operation}) => operation === 'ADD');
	const replacements = matching
		.filter(({operation}) => operation === 'REPLACE')
		.sort((left, right) => right.folder.length - left.folder.length);
	const byTarget = new Map();
	for (const replacement of replacements) {
		if (!byTarget.has(replacement.target)) byTarget.set(replacement.target, replacement);
	}
	return {additions, replacements: [...byTarget.values()]};
}
