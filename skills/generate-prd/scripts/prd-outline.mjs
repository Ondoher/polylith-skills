#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {validateProductContext} from './product-context-contract.mjs';
import {decodePublicationDocument, isPublicationPayload} from './product-publication-payload.mjs';
import {assertUiPass} from './prd-readiness.mjs';

const CONTENT_ARRAYS = new Set([
	'actions',
	'assets',
	'components',
	'features',
	'interactionFrames',
	'openQuestions',
	'patternResearch',
	'scenes',
	'surfaces',
	'flows',
	'parts',
	'states',
	'feedback',
	'productRealizations',
	'traceGaps',
	'renderRequests',
]);
const ARTIFACT_METADATA = new Set(['id', 'revision', 'schemaVersion', 'status', 'title']);
const SAFE_ID = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/u;

function fail(message) {
	throw new Error(message);
}

function digest(value) {
	return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function exactKeys(value, keys, label) {
	if (
		!value ||
		typeof value !== 'object' ||
		Array.isArray(value) ||
		Object.keys(value).sort().join('|') !== [...keys].sort().join('|')
	) {
		fail(`${label} must contain exactly: ${keys.join(', ')}`);
	}
}

function sourceLabel(value, fallback) {
	if (value && typeof value === 'object') {
		return value.name || value.title || value.goal || value.question || value.summary || value.purpose || fallback;
	}
	return fallback;
}

function addSource(sources, ref, kind, value, label, parentRef) {
	const source = {ref, kind, label: String(sourceLabel(value, label)), value};
	if (parentRef) source.parentRef = parentRef;
	sources.push(source);
}

export function uxRecordSources(artifactId, key, entry, index) {
	const sources = [];
	const ref = `artifact:${artifactId}#/${key}/${entry.id}`;
	if (key === 'flows') {
		const {steps, alternates, ...metadata} = entry;
		addSource(
			sources,
			ref,
			'ux-design/flows',
			{
				...metadata,
				stepRefs: steps.map((step) => step.id),
				alternateRefs: alternates.map((alternate) => alternate.id),
			},
			`${key} ${index + 1}`,
		);
		for (const step of entry.steps)
			addSource(sources, `${ref}/steps/${step.id}`, 'ux-design/steps', step, step.action, ref);
		for (const alternate of entry.alternates) {
			const alternateRef = `${ref}/alternates/${alternate.id}`;
			const {steps, ...metadata} = alternate;
			addSource(
				sources,
				alternateRef,
				'ux-design/alternates',
				{...metadata, stepRefs: steps.map((step) => step.id)},
				alternate.condition,
				ref,
			);
			for (const step of alternate.steps)
				addSource(
					sources,
					`${alternateRef}/steps/${step.id}`,
					'ux-design/steps',
					step,
					step.action,
					alternateRef,
				);
		}
	} else if (key === 'components') {
		const {behaviors, ...metadata} = entry;
		addSource(
			sources,
			ref,
			'ux-design/components',
			{...metadata, behaviorRefs: behaviors.map((behavior) => behavior.id)},
			`${key} ${index + 1}`,
		);
		for (const behavior of behaviors)
			addSource(
				sources,
				`${ref}/behaviors/${behavior.id}`,
				'ux-design/behaviors',
				behavior,
				behavior.statement,
				ref,
			);
	} else addSource(sources, ref, `ux-design/${key}`, entry, `${key} ${index + 1}`);
	return sources;
}

export function uxApplicationSources(artifactId, application) {
	const sources = [];
	const base = `artifact:${artifactId}#/application`;
	addSource(sources, `${base}/summary`, 'ux-design/application', application.summary, 'Application overview');
	addSource(
		sources,
		`${base}/shell/kind`,
		'ux-design/application-shell',
		application.shell.kind,
		'Application shell type',
	);
	addSource(
		sources,
		`${base}/shell/description`,
		'ux-design/application-shell',
		application.shell.description,
		'Shared shell behavior',
	);
	addSource(
		sources,
		`${base}/shell/navigation`,
		'ux-design/application-navigation',
		application.shell.navigation,
		'Workspace navigation',
	);
	(application.shell.regions ?? []).forEach((region, index) => {
		addSource(
			sources,
			`${base}/shell/regions/${region.id}`,
			'ux-design/application-region',
			region,
			`Shell region ${index + 1}`,
		);
	});
	application.areas.forEach((area, index) => {
		addSource(
			sources,
			`${base}/areas/${area.id}`,
			'ux-design/application-area',
			area,
			`Application area ${index + 1}`,
		);
	});
	return sources;
}

function artifactSources(sources, artifact) {
	if (['prd-publication', 'ui-capture'].includes(artifact.artifactKind)) return;
	const base = `artifact:${artifact.id}`;
	if (!isPublicationPayload(artifact)) {
		addSource(sources, `${base}#/payload`, artifact.artifactKind, artifact.payload, artifact.id);
		return;
	}
	const document = decodePublicationDocument(artifact.payload).document;
	for (const [key, value] of Object.entries(document)) {
		if (ARTIFACT_METADATA.has(key)) continue;
		if (artifact.artifactKind === 'ux-design' && key === 'application') {
			sources.push(...uxApplicationSources(artifact.id, value));
			continue;
		}
		if (Array.isArray(value) && CONTENT_ARRAYS.has(key)) {
			value.forEach((entry, index) => {
				if (artifact.artifactKind === 'ux-design') {
					sources.push(...uxRecordSources(artifact.id, key, entry, index));
				} else {
					addSource(
						sources,
						`${base}#/${key}/${entry.id ?? index}`,
						`${artifact.artifactKind}/${key}`,
						entry,
						`${key} ${index + 1}`,
					);
				}
			});
		} else if (value !== null && (typeof value !== 'object' || Object.keys(value).length)) {
			addSource(sources, `${base}#/${key}`, `${artifact.artifactKind}/${key}`, value, key);
		}
	}
}

function findRelations(value, resolveId, pathPrefix = '', result = []) {
	if (Array.isArray(value)) {
		value.forEach((entry, index) => findRelations(entry, resolveId, `${pathPrefix}/${index}`, result));
	} else if (value && typeof value === 'object') {
		for (const [key, entry] of Object.entries(value)) {
			const field = `${pathPrefix}/${key}`;
			if (/Refs?$/u.test(key)) {
				const ids = Array.isArray(entry) ? entry : [entry];
				ids.forEach((id, index) => {
					if (typeof id === 'string') {
						result.push({
							field: Array.isArray(entry) ? `${field}/${index}` : field,
							targetId: id,
							targetRef: resolveId(id, field),
						});
					}
				});
			} else {
				findRelations(entry, resolveId, field, result);
			}
		}
	}
	return result;
}

function sourceScope(ref) {
	return ref.startsWith('artifact:') ? ref.split('#', 1)[0] : 'product';
}

export function linkSourceRelations(sources) {
	const byScope = new Map();
	const byId = new Map();
	const sourceRefs = new Set(sources.map((source) => source.ref));
	const typedUx = new Map();
	const kinds = {
		flows: 'flow',
		steps: 'step',
		alternates: 'alternate',
		behaviors: 'behavior',
		components: 'component',
		surfaces: 'surface',
		features: 'feature',
		actions: 'action',
		interactionFrames: 'frame',
		states: 'state',
		feedback: 'feedback',
		openQuestions: 'question',
	};
	for (const source of sources) {
		const id = source.value && typeof source.value === 'object' ? source.value.id : undefined;
		if (typeof id !== 'string') continue;
		if (source.kind.startsWith('ux-design/')) {
			const kind = kinds[source.kind.slice('ux-design/'.length)];
			if (kind) typedUx.set(`ux:${kind}:${id}`, source.ref);
		}
		const scope = sourceScope(source.ref);
		if (!byScope.has(scope)) byScope.set(scope, new Map());
		if (!byScope.get(scope).has(id)) byScope.get(scope).set(id, source.ref);
		if (!byId.has(id)) byId.set(id, new Set());
		byId.get(id).add(source.ref);
	}
	const uxScope = sources.find((source) => source.kind.startsWith('ux-design/'));
	const uxIds = uxScope ? byScope.get(sourceScope(uxScope.ref)) : undefined;
	return sources.map((source) => {
		const local = byScope.get(sourceScope(source.ref));
		const resolveId = (id, field) => {
			if (id.startsWith('product:')) return sourceRefs.has(id) ? id : null;
			if (id.startsWith('ux:')) {
				return typedUx.get(id) ?? null;
			}
			if (
				source.kind.startsWith('ui-composition/') &&
				/\/(?:interactionFrameRef|surfaceRef|flowRefs|actionRef|uxRef|uxQuestionRefs)(?:\/\d+)?$/u.test(
					field,
				) &&
				uxIds?.has(id)
			)
				return uxIds.get(id);
			if (local?.has(id)) return local.get(id);
			const matches = byId.get(id);
			return matches?.size === 1 ? [...matches][0] : null;
		};
		return {...source, relations: findRelations(source.value, resolveId)};
	});
}

export function createOutlineSourceIndex(context) {
	validateProductContext(context);
	const sources = [];
	addSource(
		sources,
		`product:${context.product.id}`,
		'product',
		{name: context.product.name, status: context.product.status},
		context.product.name,
	);
	addSource(sources, `product:${context.product.purpose.id}`, 'purpose', context.product.purpose, 'Purpose');
	for (const user of context.product.users) {
		addSource(sources, `product:${user.id}`, 'user', user, user.id);
	}
	for (const capability of context.capabilities) {
		addSource(sources, `product:${capability.id}`, 'capability', capability, capability.id);
	}
	for (const goal of context.goals) addSource(sources, `product:${goal.id}`, 'goal', goal, goal.id);
	for (const requirement of context.requirements)
		addSource(sources, `product:${requirement.id}`, 'requirement', requirement, requirement.id);
	for (const rule of context.rules) addSource(sources, `product:${rule.id}`, 'rule', rule, rule.id);
	for (const gap of context.gaps) {
		addSource(sources, `product:${gap.id}`, 'gap', gap, gap.id);
	}
	for (const artifact of context.artifacts) artifactSources(sources, artifact);
	const indexed = linkSourceRelations(sources);
	const index = {
		schemaVersion: '1.0',
		context: {
			id: context.contextId,
			materialSha256: context.materialSha256,
			sourceSnapshot: context.sourceSnapshot,
			sourceSha256: context.provenance.sourceSha256,
		},
		sources: indexed,
		exclusions: context.exclusions.map(({id, outcome, reasons}) => ({id, outcome, reasons})),
	};
	return {...index, sourceIndexSha256: digest(index)};
}

export function validateOutline(outline, index) {
	exactKeys(outline, ['schemaVersion', 'contextId', 'sourceIndexSha256', 'groups', 'notes'], 'Outline');
	if (
		outline.schemaVersion !== '1.0' ||
		outline.contextId !== index.context.id ||
		outline.sourceIndexSha256 !== index.sourceIndexSha256
	)
		fail('Outline input binding is stale');
	if (
		!Array.isArray(outline.groups) ||
		!outline.groups.length ||
		!Array.isArray(outline.notes) ||
		outline.notes.some((note) => typeof note !== 'string')
	)
		fail('Outline groups or notes are invalid');
	const available = new Set(index.sources.map(({ref}) => ref));
	const covered = new Set();
	const groupIds = new Set();
	const summaries = [];
	function visit(group, depth) {
		exactKeys(group, ['id', 'title', 'summary', 'sourceRefs', 'children'], 'Outline group');
		if (
			!SAFE_ID.test(group.id) ||
			groupIds.has(group.id) ||
			depth > 4 ||
			typeof group.title !== 'string' ||
			!group.title.trim() ||
			typeof group.summary !== 'string' ||
			!Array.isArray(group.sourceRefs) ||
			!Array.isArray(group.children)
		) {
			fail(`Outline group ${String(group.id)} is invalid`);
		}
		groupIds.add(group.id);
		summaries.push(group.summary);
		for (const ref of group.sourceRefs) {
			if (!available.has(ref) || covered.has(ref))
				fail(`Outline source reference is unknown or duplicated: ${ref}`);
			covered.add(ref);
		}
		group.children.forEach((child) => visit(child, depth + 1));
	}
	outline.groups.forEach((group) => visit(group, 1));
	for (const summary of summaries) {
		for (const match of summary.matchAll(/\[[^\]]+\]\(#([a-z0-9._-]+)\)/gu)) {
			if (!groupIds.has(match[1])) fail(`Outline group link targets unknown group ${match[1]}`);
		}
	}
	if (covered.size !== available.size) {
		fail(
			`Outline misses ${available.size - covered.size} source(s): ${[...available].filter((ref) => !covered.has(ref)).join(', ')}`,
		);
	}
	return {sourceCount: available.size, groupCount: groupIds.size, excludedCount: index.exclusions.length};
}

function markdownText(value) {
	return String(value)
		.replace(/\r?\n/gu, ' ')
		.replace(/\s+/gu, ' ')
		.trim()
		.replace(/[\\`*_{}\[\]<>!|]/gu, '\\$&');
}

function markdownFragment(value) {
	return String(value)
		.replace(/\r?\n/gu, ' ')
		.replace(/\s+/gu, ' ')
		.replace(/[\\`*_{}\[\]<>!|]/gu, '\\$&');
}

function markdownSummary(value) {
	const input = String(value);
	const links = /\[([^\]]+)\]\(#([a-z0-9._-]+)\)/gu;
	let cursor = 0;
	let result = '';
	for (const match of input.matchAll(links)) {
		result += markdownFragment(input.slice(cursor, match.index));
		result += `[${markdownText(match[1])}](#${match[2]})`;
		cursor = match.index + match[0].length;
	}
	return result + markdownFragment(input.slice(cursor));
}

function sourcePreview(source) {
	if (source.kind === 'ux-design/steps') {
		return source.value.response;
	}
	if (source.kind === 'ux-design/alternates') {
		return source.value.outcome;
	}
	if (!source.kind.startsWith('ux-design/application')) return '';
	const value = source.value;
	if (typeof value === 'string') return value;
	if (source.kind === 'ux-design/application-navigation') {
		return [value.pattern, value.description].filter(Boolean).join('. ');
	}
	return value.purpose || '';
}

/** Render a group's own source inventory without choosing a document or page. */
export function renderOutlineGroupLines(group, index, headingLevel = 4) {
	const byRef = new Map(index.sources.map((source) => [source.ref, source]));
	const lines = [
		`<a id="${group.id}"></a>`,
		'',
		`${'#'.repeat(Math.min(headingLevel, 6))} ${markdownText(group.title)}`,
		'',
	];
	if (group.summary) lines.push(markdownSummary(group.summary), '');
	for (const ref of group.sourceRefs) {
		const source = byRef.get(ref);
		const preview = sourcePreview(source);
		lines.push(
			`- ${markdownText(source.label)}${preview ? ` — ${markdownText(preview)}` : ''} (${source.kind}; \`${ref}\`)`,
		);
	}
	if (group.sourceRefs.length) lines.push('');
	return lines;
}

export function renderOutlineMarkdown(outline, index) {
	const coverage = validateOutline(outline, index);
	const byRef = new Map(index.sources.map((source) => [source.ref, source]));
	const lines = [
		'# Product information outline',
		'',
		`Context: \`${index.context.id}\``,
		'',
		`Context material: \`${index.context.materialSha256}\``,
		'',
		`Source snapshot: \`${index.context.sourceSnapshot.id}\` revision ${index.context.sourceSnapshot.revision} (\`${index.context.sourceSnapshot.sha256}\`)`,
		'',
		`Source digest: \`${index.context.sourceSha256}\``,
		'',
		`Source index: \`${index.sourceIndexSha256}\``,
		'',
		`Coverage: ${coverage.sourceCount} of ${coverage.sourceCount} eligible sources; ${coverage.excludedCount} excluded artifact(s).`,
		'',
	];
	function addGroup(group, depth) {
		lines.push(
			`<a id="${group.id}"></a>`,
			'',
			`${'#'.repeat(Math.min(depth + 1, 6))} ${markdownText(group.title)}`,
			'',
		);
		if (group.summary) lines.push(markdownSummary(group.summary), '');
		for (const ref of group.sourceRefs) {
			const source = byRef.get(ref);
			const preview = sourcePreview(source);
			lines.push(
				`- ${markdownText(source.label)}${preview ? ` — ${markdownText(preview)}` : ''} (${source.kind}; \`${ref}\`)`,
			);
		}
		if (group.sourceRefs.length) lines.push('');
		group.children.forEach((child) => addGroup(child, depth + 1));
	}
	outline.groups.forEach((group) => addGroup(group, 1));
	if (outline.notes.length) {
		lines.push('## Editorial notes', '');
		outline.notes.forEach((note) => lines.push(`- ${markdownText(note)}`));
		lines.push('');
	}
	if (index.exclusions.length) {
		lines.push('## Unavailable source artifacts', '');
		index.exclusions.forEach(({id, outcome, reasons}) => {
			lines.push(`- \`${id}\` (${outcome}): ${reasons.map(markdownText).join('; ')}`);
		});
		lines.push('');
	}
	return `${lines.join('\n').trimEnd()}\n`;
}

async function readContext(contextPath) {
	const context = JSON.parse(await readFile(contextPath, 'utf8'));
	assertUiPass(context);
	return createOutlineSourceIndex(context);
}

export async function prepareOutline({contextPath, outputPath}) {
	const index = await readContext(contextPath);
	await writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
	return {contextId: index.context.id, sourceCount: index.sources.length, sourceIndexSha256: index.sourceIndexSha256};
}

export async function publishOutline({contextPath, outlinePath, outputPath}) {
	const index = await readContext(contextPath);
	const outline = JSON.parse(await readFile(outlinePath, 'utf8'));
	const summary = validateOutline(outline, index);
	await writeFile(outputPath, renderOutlineMarkdown(outline, index), 'utf8');
	return {contextId: index.context.id, ...summary};
}

function parseArgs(argv) {
	const [mode, ...options] = argv;
	const required =
		mode === 'prepare'
			? ['--context', '--output']
			: mode === 'render'
				? ['--context', '--outline', '--output']
				: null;
	if (!required || options.length !== required.length * 2)
		fail(
			'Usage: prd-outline.mjs prepare --context <context.json> --output <source-index.json> | render --context <context.json> --outline <outline.json> --output <outline.md>',
		);
	const values = new Map();
	for (let i = 0; i < options.length; i += 2) {
		if (!required.includes(options[i]) || values.has(options[i]) || !options[i + 1]) fail('Invalid outline option');
		values.set(options[i], options[i + 1]);
	}
	if (values.size !== required.length) fail('Missing outline option');
	return {
		mode,
		contextPath: values.get('--context'),
		outlinePath: values.get('--outline'),
		outputPath: values.get('--output'),
	};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const args = parseArgs(process.argv.slice(2));
		const result = args.mode === 'prepare' ? await prepareOutline(args) : await publishOutline(args);
		process.stdout.write(`${JSON.stringify(result)}\n`);
	} catch (error) {
		process.stderr.write(`prd-outline: ${error.message}\n`);
		process.exitCode = 1;
	}
}
