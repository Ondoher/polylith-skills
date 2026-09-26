#!/usr/bin/env node

import {createHash, randomUUID} from 'node:crypto';
import {lstat, mkdir, readFile, readdir, rename, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {buildArtifactPublication} from './publication-artifacts.mjs';
import {validatePublicationDirectory} from './generate-prd.mjs';
import {createOutlineSourceIndex} from './prd-outline.mjs';
import {assertUiPass} from './prd-readiness.mjs';
import {validateStructurePlan, validateWeightAssessment} from './prd-structure.mjs';
import {decodePublicationDocument} from './product-publication-payload.mjs';
import {renderInlineScene} from './ui-composition-html.mjs';

const RECEIPT = 'publication-receipt.json';
const GENERATOR = {id: 'generate-prd-collection', version: '1.0.0'};
const PRIMARY_FIELDS = [
	'statement',
	'question',
	'goal',
	'summary',
	'purpose',
	'description',
	'trigger',
	'action',
	'response',
	'outcome',
	'impact',
	'desiredOutcome',
	'meaning',
];
const CSS = `:root{color-scheme:light;font:16px/1.55 system-ui,sans-serif;--ink:#1b2835;--muted:#536371;--line:#d5dde4;--accent:#235b83;--paper:#fff;--back:#f5f7f8}
*{box-sizing:border-box}body{margin:0;color:var(--ink);background:var(--back)}a{color:var(--accent)}a:focus-visible{outline:3px solid #db8d23;outline-offset:2px}
.layout{display:grid;grid-template-columns:minmax(14rem,20rem) minmax(0,1fr);max-width:95rem;margin:auto;min-height:100vh}.sidebar{padding:1.4rem;border-right:1px solid var(--line);background:var(--paper)}.sidebar nav ul{list-style:none;padding:0}.sidebar nav ul ul{padding-left:1rem;border-left:1px solid var(--line)}.sidebar li{margin:.45rem 0}.sidebar a[aria-current=page]{font-weight:700;color:var(--ink)}main{padding:2rem clamp(1rem,4vw,4rem);max-width:72rem}
.eyebrow,.meta{color:var(--muted);font-size:.88rem}h1{font-size:clamp(1.8rem,3vw,2.7rem);line-height:1.2}h2{margin-top:2.7rem;border-top:1px solid var(--line);padding-top:1.2rem}h3{margin:0 0 .4rem}.intro,.source,.comp{background:var(--paper);border:1px solid var(--line);border-radius:.5rem;padding:1.2rem;margin:1rem 0}.source{border-left:4px solid #a3bacb}.source p{margin:.5rem 0}.source details{margin-top:.8rem}.source pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--back);padding:1rem}.source-links{font-size:.9rem}.status{display:inline-block;padding:.1rem .45rem;border-radius:1rem;background:#e7eff5;font-size:.8rem}.pages,.related{display:flex;gap:.65rem;flex-wrap:wrap}.pages a,.related a{padding:.35rem .6rem;background:var(--paper);border:1px solid var(--line);border-radius:.3rem}.comp{overflow:auto}.comp .prd-comp-canvas{max-width:100%}.notice{border-left:4px solid #bd7a17;padding:.7rem 1rem;background:#fff7e8}
@media(max-width:800px){.layout{display:block}.sidebar{border-right:0;border-bottom:1px solid var(--line)}main{padding:1.25rem}}
`;

function fail(message) {
	throw new Error(message);
}
function sha(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
}
function esc(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}
function code(value) {
	return `<code>${esc(value)}</code>`;
}
function htmlDocument(title, cssHref, sidebar, body, compStyles = false) {
	const styles = compStyles
		? '<link rel="stylesheet" href="assets/prd.css"><link rel="stylesheet" href="assets/composition.css">'
		: '';
	return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="generator" content="${GENERATOR.id} ${GENERATOR.version}"><title>${esc(title)}</title><link rel="stylesheet" href="${esc(cssHref)}">${styles}</head><body><div class="layout"><aside class="sidebar">${sidebar}</aside><main>${body}</main></div></body></html>\n`;
}
function anchor(ref) {
	return `source-${sha(ref).slice(0, 16)}`;
}
function textOf(value) {
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value.join('; ');
	return '';
}
function hrefToSource(fromDocument, fromPage, targetRef, placement) {
	const target = placement.get(targetRef);
	if (!target) return null;
	const [documentId, pageId] = target.split('/');
	const file =
		fromDocument === documentId ? (fromPage === pageId ? '' : `${pageId}.html`) : `../${documentId}/${pageId}.html`;
	return `${file}#${anchor(targetRef)}`;
}
function renderSource(source, documentId, pageId, placements, bySource) {
	const value = source.value;
	const primary =
		value && typeof value === 'object' && !Array.isArray(value)
			? PRIMARY_FIELDS.flatMap((key) =>
					textOf(value[key])
						? [
								`<p><strong>${esc(key.replace(/([A-Z])/gu, ' $1'))}:</strong> ${esc(textOf(value[key]))}</p>`,
							]
						: [],
				)
			: [`<p>${esc(textOf(value))}</p>`];
	const related = (source.relations ?? [])
		.filter((relation) => relation.targetRef && placements.has(relation.targetRef))
		.map(
			(relation) =>
				`<a href="${esc(hrefToSource(documentId, pageId, relation.targetRef, placements))}">${esc(bySource.get(relation.targetRef)?.label ?? relation.targetId)}</a>`,
		);
	const details =
		value && typeof value === 'object'
			? `<details><summary>Full source detail</summary><pre>${esc(JSON.stringify(value, null, 2))}</pre></details>`
			: '';
	return `<article class="source" id="${anchor(source.ref)}"><h3>${esc(source.label)}</h3><p class="meta">${esc(source.kind)} · ${code(source.ref)}${value?.status ? ` · <span class="status">${esc(value.status)}</span>` : ''}</p>${primary.join('')}${related.length ? `<p class="source-links">Related: ${[...new Set(related)].join(' · ')}</p>` : ''}${details}</article>`;
}
function relativePageLink(fromDocument, target) {
	const [documentId, pageId] = target.split('/');
	return fromDocument === documentId ? `${pageId}.html` : `../${documentId}/${pageId}.html`;
}
function sidebar(plan, document, currentPageId = null) {
	const children = new Map();
	for (const page of document.pages) {
		const siblings = children.get(page.parentPageId) ?? [];
		siblings.push(page);
		children.set(page.parentPageId, siblings);
	}
	const pageList = (parentId) =>
		`<ul>${(children.get(parentId) ?? [])
			.map(
				(page) =>
					`<li><a href="${page.id}.html"${page.id === currentPageId ? ' aria-current="page"' : ''}>${esc(page.title)}</a>${children.has(page.id) ? pageList(page.id) : ''}</li>`,
			)
			.join('')}</ul>`;
	return `<a href="index.html"><strong>${esc(document.title)}</strong></a><nav aria-label="Pages in this document">${pageList(null)}</nav>${
		plan.documents.length > 1
			? `<nav aria-label="Other product documents"><p>Other documents</p><ul>${plan.documents
					.filter((other) => other.id !== document.id)
					.map((other) => `<li><a href="../${other.id}/index.html">${esc(other.title)}</a></li>`)
					.join('')}</ul></nav>`
			: ''
	}`;
}
function renderEntry(plan, document, index, placements) {
	const ctx = document.standaloneContext;
	const bySource = new Map(index.sources.map((source) => [source.ref, source]));
	const questions = ctx.openQuestions.length
		? `<h3>Open questions</h3><ul>${ctx.openQuestions.map((ref) => `<li><a href="${esc(hrefToSource(document.id, null, ref, placements))}">${esc(bySource.get(ref).label)}</a></li>`).join('')}</ul>`
		: '';
	const body = `<p class="eyebrow">Product document</p><h1>${esc(document.title)}</h1><p>${esc(document.purpose)}</p><div class="intro"><h2>Start here</h2><p>${esc(ctx.orientation)}</p><p><strong>Audience:</strong> ${esc(document.audience)}</p><p><strong>Scope:</strong> ${esc(ctx.scope)}</p><p><strong>Relevant behavior:</strong> ${esc(ctx.behavior)}</p><h3>Terms</h3><ul>${ctx.terms.map((term) => `<li>${esc(term)}</li>`).join('')}</ul>${questions}</div><h2>Read by subject</h2><ol>${document.pages.map((page) => `<li><a href="${page.id}.html">${esc(page.title)}</a> — ${esc(page.summary)}</li>`).join('')}</ol>`;
	return htmlDocument(document.title, 'assets/collection.css', sidebar(plan, document), body);
}
function compRequests(page, index) {
	const byRef = new Map(index.sources.map((source) => [source.ref, source]));
	const requests = [];
	for (const ref of page.compRefs) {
		const source = byRef.get(ref);
		if (source.kind === 'ui-composition/renderRequests') requests.push(source);
		else if (source.kind === 'ui-composition/scenes') {
			const artifactPrefix = ref.slice(0, ref.indexOf('#/'));
			requests.push(
				...index.sources.filter(
					(item) =>
						item.kind === 'ui-composition/renderRequests' &&
						item.ref.startsWith(`${artifactPrefix}#/`) &&
						item.value.sceneRef === source.value.id,
				),
			);
		}
	}
	return [...new Map(requests.map((request) => [request.ref, request])).values()];
}
function compScenes(page, index) {
	const byRef = new Map(index.sources.map((source) => [source.ref, source]));
	const scenes = [];
	for (const ref of page.compRefs) {
		const source = byRef.get(ref);
		if (source.kind === 'ui-composition/scenes') scenes.push(source);
		else {
			const sceneRef = `${ref.slice(0, ref.indexOf('#/'))}#/scenes/${source.value.sceneRef}`;
			const scene = byRef.get(sceneRef);
			if (!scene) fail(`Selected render request ${ref} has no current scene`);
			scenes.push(scene);
		}
	}
	return [...new Map(scenes.map((scene) => [scene.ref, scene])).values()];
}

export {assertUiPass} from './prd-readiness.mjs';
function validateCollectionLinks(documents, plan) {
	const allFiles = new Map(
		[...documents].flatMap(([documentId, document]) =>
			[...document.files].map(([file, bytes]) => [`${documentId}/${file}`, bytes]),
		),
	);
	for (const entry of plan.documents) {
		const owned = documents.get(entry.id);
		for (const file of ['index.html', ...entry.pages.map((page) => `${page.id}.html`)]) {
			const html = owned.files.get(file).toString('utf8');
			for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/gu)) {
				const href = match[1];
				if (/^(?:https?:|mailto:|data:)/iu.test(href)) continue;
				const [name, fragment] = href.split('#');
				const target = name
					? path.posix.normalize(path.posix.join(entry.id, path.posix.dirname(file), name))
					: `${entry.id}/${file}`;
				if (!allFiles.has(target)) fail(`Generated link has no file target: ${file} -> ${href}`);
				if (fragment && !allFiles.get(target).toString('utf8').includes(`id="${fragment}"`)) {
					fail(`Generated link has no anchor target: ${file} -> ${href}`);
				}
			}
		}
	}
}
function renderPage(plan, document, page, result, index, compPublication, context) {
	const bySource = new Map(index.sources.map((source) => [source.ref, source]));
	const groupById = new Map();
	const visit = (group) => {
		groupById.set(group.id, group);
		group.children.forEach(visit);
	};
	result.outline.groups.forEach(visit);
	const groups = page.groupRefs.map((groupId) => groupById.get(groupId));
	const links = plan.crossLinks.filter((link) => link.from === `${document.id}/${page.id}`);
	const renderedGroups = groups
		.map(
			(group) =>
				`<section id="group-${esc(group.id)}"><h2>${esc(group.title)}</h2><p>${esc(group.summary)}</p>${group.sourceRefs.map((ref) => renderSource(bySource.get(ref), document.id, page.id, result.sourcePage, bySource)).join('')}</section>`,
		)
		.join('');
	const requests = compRequests(page, index);
	const comps = compScenes(page, index)
		.map((sceneSource) => {
			const artifactId = sceneSource.ref.slice('artifact:'.length, sceneSource.ref.indexOf('#/'));
			const uiArtifact = context.artifacts.find((artifact) => artifact.id === artifactId);
			if (!uiArtifact) fail(`Selected scene ${sceneSource.ref} has no current UI artifact`);
			const uiSpec = decodePublicationDocument(uiArtifact.payload).document;
			const uxArtifact = context.artifacts.find(
				(artifact) =>
					artifact.artifactKind === 'ux-design' &&
					decodePublicationDocument(artifact.payload).document.id === uiSpec.uxArtifactBinding.id,
			);
			if (!uxArtifact) fail(`Selected scene ${sceneSource.ref} has no bound UX artifact`);
			const uxSpec = decodePublicationDocument(uxArtifact.payload).document;
			const scene = uiSpec.scenes.find((item) => item.id === sceneSource.value.id);
			if (!scene) fail(`Selected scene ${sceneSource.ref} is absent from its UI package`);
			const clean =
				requests.find(
					(request) =>
						request.ref.startsWith(`artifact:${artifactId}#/`) &&
						request.value.sceneRef === scene.id &&
						request.value.variant === 'clean',
				) ??
				requests.find(
					(request) =>
						request.ref.startsWith(`artifact:${artifactId}#/`) && request.value.sceneRef === scene.id,
				);
			if (clean && !compPublication?.files.has(clean.value.output)) {
				fail(`Selected comp ${clean.ref} has no rendered output ${clean.value.output}`);
			}
			return `<section class="comp" aria-label="${esc(scene.name)}"><h2>${esc(scene.name)}</h2><p class="meta">${esc(scene.completeness === 'partial' ? 'Partial source scene' : 'Source scene')} · ${esc(scene.status)}</p>${renderInlineScene(
				scene,
				uiSpec,
				{uxSpec, componentRegistrations: compPublication?.inlineComponentRegistrations ?? []},
			)}${clean ? `<p><a href="${esc(clean.value.output)}">Open the full-size comp</a></p>` : ''}</section>`;
		})
		.join('');
	const related = links.length
		? `<nav class="related" aria-label="Related reading">${links.map((link) => `<a href="${esc(relativePageLink(document.id, link.to))}">${esc(link.purpose)}</a>`).join('')}</nav>`
		: '';
	const body = `<p class="eyebrow"><a href="index.html">${esc(document.title)}</a></p><h1>${esc(page.title)}</h1><p>${esc(page.summary)}</p>${renderedGroups}${comps}${related}`;
	return htmlDocument(
		`${page.title} · ${document.title}`,
		'assets/collection.css',
		sidebar(plan, document, page.id),
		body,
		Boolean(comps),
	);
}

/** Validate exact source bindings and build deterministic files for every planned document. */
export function createProductCollection({
	context,
	contextBytes,
	outline,
	outlineBytes,
	weights,
	weightsBytes,
	plan,
	planBytes,
	contextDirectory,
	artifactPublication: suppliedArtifactPublication,
}) {
	const index = createOutlineSourceIndex(context);
	const outlineSha256 = sha(outlineBytes);
	validateWeightAssessment(weights, {index, outline, outlineSha256});
	const weightsSha256 = sha(weightsBytes);
	const placement = validateStructurePlan(plan, {index, outline, outlineSha256, weightsSha256});
	const planSha256 = sha(planBytes);
	const selectedCompCount = plan.documents.reduce(
		(total, document) => total + document.pages.reduce((count, page) => count + page.compRefs.length, 0),
		0,
	);
	const compPublication = selectedCompCount
		? (suppliedArtifactPublication ?? buildArtifactPublication(context, {contextDirectory}))
		: null;
	if (selectedCompCount && !compPublication) fail('Selected comps require a current rendered UI publication package');
	const documents = new Map();
	for (const document of plan.documents) {
		const files = new Map([
			['assets/collection.css', Buffer.from(CSS, 'utf8')],
			['index.html', Buffer.from(renderEntry(plan, document, index, placement.sourcePage), 'utf8')],
		]);
		const hasComps = document.pages.some((page) => page.compRefs.length > 0);
		for (const page of document.pages) {
			files.set(
				`${page.id}.html`,
				Buffer.from(
					renderPage(plan, document, page, {...placement, outline}, index, compPublication, context),
					'utf8',
				),
			);
		}
		if (hasComps) {
			for (const [file, bytes] of compPublication.files) {
				if (file === 'index.html') continue;
				if (files.has(file)) fail(`Comp asset collides with document output ${file}`);
				files.set(file, Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, 'utf8'));
			}
		}
		const fileRecords = [...files]
			.map(([name, bytes]) => ({path: name, bytes: bytes.length, sha256: sha(bytes)}))
			.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
		const receipt = {
			schemaVersion: '1.0',
			generator: GENERATOR,
			documentId: document.id,
			contextId: context.contextId,
			contextSha256: sha(contextBytes),
			outlineSha256,
			weightsSha256,
			planSha256,
			resources: hasComps ? (compPublication.resources ?? []) : [],
			files: fileRecords,
		};
		documents.set(document.id, {files, receipt});
	}
	validateCollectionLinks(documents, plan);
	return {
		documents,
		planSha256,
		contextId: context.contextId,
		sourceCount: placement.sourceCount,
		resourceCount: compPublication?.resources?.length ?? 0,
	};
}

function inside(root, candidate) {
	const relative = path.relative(root, candidate);
	return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
function safeChild(root, name) {
	const candidate = path.resolve(root, name);
	if (!inside(root, candidate) || path.dirname(candidate) !== root) fail(`Unsafe collection directory ${name}`);
	return candidate;
}
function safeFile(root, name) {
	if (
		typeof name !== 'string' ||
		name.includes('\\') ||
		name.startsWith('/') ||
		name.split('/').some((part) => !/^[a-z0-9][a-z0-9._-]*$/iu.test(part) || part === '.' || part === '..')
	)
		fail(`Unsafe generated file path ${name}`);
	const target = path.resolve(root, ...name.split('/'));
	if (!inside(root, target)) fail(`Generated file escapes its document: ${name}`);
	return target;
}
async function exists(candidate) {
	try {
		await lstat(candidate);
		return true;
	} catch (error) {
		if (error?.code === 'ENOENT') return false;
		throw error;
	}
}
async function assertUnlinked(candidate) {
	const absolute = path.resolve(candidate);
	const parsed = path.parse(absolute);
	const segments = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
	let current = parsed.root;
	for (const segment of segments) {
		current = path.join(current, segment);
		if (!(await exists(current))) return;
		const stat = await lstat(current);
		if (stat.isSymbolicLink()) fail(`Path traverses a symbolic link or junction: ${current}`);
	}
}
async function inventory(directory, prefix = '') {
	const files = [];
	for (const entry of await readdir(directory, {withFileTypes: true})) {
		const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
		const absolute = path.join(directory, entry.name);
		const stat = await lstat(absolute);
		if (stat.isSymbolicLink()) fail(`Owned publication contains a linked path: ${relative}`);
		if (stat.isDirectory()) files.push(...(await inventory(absolute, relative)));
		else if (stat.isFile()) files.push(relative);
		else fail(`Owned publication contains an unsupported entry: ${relative}`);
	}
	return files.sort();
}
async function writeDocument(directory, document) {
	await mkdir(directory);
	for (const [name, bytes] of document.files) {
		const target = safeFile(directory, name);
		await mkdir(path.dirname(target), {recursive: true});
		await writeFile(target, bytes, {flag: 'wx'});
	}
	await writeFile(path.join(directory, RECEIPT), `${JSON.stringify(document.receipt, null, 2)}\n`, {flag: 'wx'});
}
async function validateOwnedDocument(directory, expectedId) {
	const receiptPath = path.join(directory, RECEIPT);
	if (!(await exists(receiptPath))) fail(`Owned document ${expectedId} has no receipt`);
	const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
	if (
		receipt.schemaVersion !== '1.0' ||
		receipt.generator?.id !== GENERATOR.id ||
		receipt.generator.version !== GENERATOR.version ||
		receipt.documentId !== expectedId ||
		!Array.isArray(receipt.files) ||
		!receipt.files.length ||
		!Array.isArray(receipt.resources)
	) {
		fail(`Document ${expectedId} has an unsupported ownership receipt`);
	}
	const expected = new Map();
	for (const record of receipt.files) {
		if (
			typeof record.path !== 'string' ||
			!Number.isSafeInteger(record.bytes) ||
			!/^[a-f0-9]{64}$/u.test(record.sha256) ||
			expected.has(record.path)
		) {
			fail(`Document ${expectedId} has an invalid file receipt`);
		}
		safeFile(directory, record.path);
		expected.set(record.path, record);
	}
	if (!expected.has('index.html')) fail(`Document ${expectedId} has no owned entry page`);
	const actual = (await inventory(directory)).filter((name) => name !== RECEIPT);
	if (actual.length !== expected.size || actual.some((name) => !expected.has(name))) {
		fail(`Document ${expectedId} contains unowned or missing files`);
	}
	for (const [name, record] of expected) {
		const bytes = await readFile(safeFile(directory, name));
		if (bytes.length !== record.bytes || sha(bytes) !== record.sha256) {
			fail(`Document ${expectedId} has a modified file: ${name}`);
		}
	}
	return receipt;
}
async function ownedDocuments(root) {
	const owned = new Map();
	for (const entry of await readdir(root, {withFileTypes: true})) {
		if (entry.name.startsWith('.generate-prd-')) fail(`Unresolved publication transaction: ${entry.name}`);
		if (entry.name === 'technical') continue;
		if (!entry.isDirectory()) continue;
		const directory = safeChild(root, entry.name);
		const receiptPath = path.join(directory, RECEIPT);
		if (!(await exists(receiptPath))) continue;
		let receipt;
		try {
			receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
		} catch {
			fail(`Invalid publication receipt in ${entry.name}`);
		}
		if (receipt.generator?.id === GENERATOR.id) {
			await validateOwnedDocument(directory, entry.name);
			owned.set(entry.name, directory);
		} else if (entry.name === 'prd' && receipt.generator?.id === 'generate-prd') {
			await validatePublicationDirectory(directory);
			owned.set(entry.name, directory);
		}
	}
	return owned;
}

/** Write a non-replacing collection preview to a new support directory. */
export async function previewProductCollection(outputRoot, collection) {
	const root = path.resolve(outputRoot);
	await assertUnlinked(root);
	if (await exists(root)) fail('Preview destination already exists; choose a new support directory');
	await mkdir(root, {recursive: true});
	try {
		for (const [id, document] of collection.documents) {
			const directory = safeChild(root, id);
			await writeDocument(directory, document);
			await validateOwnedDocument(directory, id);
		}
		const links = [...collection.documents.keys()]
			.map((id) => `<li><a href="${id}/index.html">${esc(id)}</a></li>`)
			.join('');
		const landing = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Product documents preview</title></head><body><main><h1>Product documents preview</h1><p>Context ${esc(collection.contextId)} · ${collection.sourceCount} eligible sources.</p><ul>${links}</ul></main></body></html>\n`;
		await writeFile(path.join(root, 'index.html'), landing, {flag: 'wx'});
		const files = [];
		for (const name of (await inventory(root)).filter((name) => name !== 'preview-receipt.json')) {
			const bytes = await readFile(safeFile(root, name));
			files.push({path: name, bytes: bytes.length, sha256: sha(bytes)});
		}
		await writeFile(
			path.join(root, 'preview-receipt.json'),
			`${JSON.stringify(
				{
					schemaVersion: '1.0',
					generator: GENERATOR,
					contextId: collection.contextId,
					planSha256: collection.planSha256,
					files,
				},
				null,
				2,
			)}\n`,
			{flag: 'wx'},
		);
	} catch (error) {
		if (inside(path.dirname(root), root)) await rm(root, {recursive: true, force: true});
		throw error;
	}
	return {documentCount: collection.documents.size, sourceCount: collection.sourceCount};
}

/** Replace only receipt-owned product document directories, leaving technical and unowned entries intact. */
export async function publishProductCollection(outputRoot, collection) {
	const root = path.resolve(outputRoot);
	await assertUnlinked(root);
	await mkdir(root, {recursive: true});
	const old = await ownedDocuments(root);
	for (const id of collection.documents.keys()) {
		const target = safeChild(root, id);
		if ((await exists(target)) && !old.has(id)) fail(`Document destination is not owned by generate-prd: ${id}`);
	}
	const nonce = randomUUID();
	const staged = new Map(),
		backups = new Map(),
		installed = [];
	try {
		for (const [id, document] of collection.documents) {
			const stage = safeChild(root, `.generate-prd-stage-${id}-${nonce}`);
			await writeDocument(stage, document);
			await validateOwnedDocument(stage, id);
			staged.set(id, stage);
		}
		for (const [id, directory] of old) {
			const backup = safeChild(root, `.generate-prd-backup-${id}-${nonce}`);
			await rename(directory, backup);
			backups.set(id, backup);
		}
		for (const [id, stage] of staged) {
			await rename(stage, safeChild(root, id));
			installed.push(id);
		}
	} catch (error) {
		for (const id of installed.reverse()) {
			const target = safeChild(root, id);
			if (await exists(target)) await rm(target, {recursive: true, force: true});
		}
		for (const [id, backup] of backups) {
			if (await exists(backup)) await rename(backup, safeChild(root, id));
		}
		for (const stage of staged.values()) {
			if (await exists(stage)) await rm(stage, {recursive: true, force: true});
		}
		throw error;
	}
	for (const backup of backups.values()) {
		if (await exists(backup)) await rm(backup, {recursive: true, force: true});
	}
	return {
		documentCount: collection.documents.size,
		retiredCount: [...old.keys()].filter((id) => !collection.documents.has(id)).length,
		sourceCount: collection.sourceCount,
	};
}

async function cli(argv) {
	const values = new Map();
	for (let at = 0; at < argv.length; at += 2) {
		if (!argv[at]?.startsWith('--') || !argv[at + 1] || values.has(argv[at])) fail('Invalid collection option');
		values.set(argv[at], argv[at + 1]);
	}
	const core = ['--context', '--outline', '--weights', '--plan'];
	if (
		core.some((key) => !values.has(key)) ||
		values.size !== 5 ||
		values.has('--preview') === values.has('--output')
	) {
		fail(
			'Usage: product-collection.mjs --context <context.json> --outline <outline.json> --weights <weights.json> --plan <plan.json> (--preview <new-directory> | --output <documents/product>)',
		);
	}
	const inputPaths = core.map((key) => path.resolve(values.get(key)));
	const outputRoot = path.resolve(values.get('--preview') ?? values.get('--output'));
	if (outputRoot === path.parse(outputRoot).root) fail('Collection output must not be a filesystem root');
	await assertUnlinked(outputRoot);
	for (const input of inputPaths) {
		await assertUnlinked(input);
		if (input === outputRoot || inside(outputRoot, input)) fail('Collection input cannot live inside the output');
		if (!(await lstat(input)).isFile()) fail(`Collection input is not an ordinary file: ${input}`);
	}
	const [contextBytes, outlineBytes, weightsBytes, planBytes] = await Promise.all(
		inputPaths.map((input) => readFile(input)),
	);
	const context = JSON.parse(contextBytes),
		outline = JSON.parse(outlineBytes);
	const weights = JSON.parse(weightsBytes),
		plan = JSON.parse(planBytes);
	assertUiPass(context, plan);
	const collection = createProductCollection({
		context,
		contextBytes,
		outline,
		outlineBytes,
		weights,
		weightsBytes,
		plan,
		planBytes,
		contextDirectory: path.dirname(inputPaths[0]),
	});
	return values.has('--preview')
		? previewProductCollection(outputRoot, collection)
		: publishProductCollection(outputRoot, collection);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		process.stdout.write(`${JSON.stringify(await cli(process.argv.slice(2)))}\n`);
	} catch (error) {
		process.stderr.write(`product-collection: ${error.message}\n`);
		process.exitCode = 1;
	}
}
