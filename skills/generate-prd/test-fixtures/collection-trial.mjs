import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mkdtemp, mkdir, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';

import {persistProductModel} from '../../refine-design/scripts/product-model.mjs';
import {resolveProductContext} from '../../refine-design/scripts/product-context.mjs';
import {
	calculateProductArtifactMaterialSha256,
	calculateProductContextMaterialSha256,
} from '../scripts/generate-prd.mjs';
import {createOutlineSourceIndex} from '../scripts/prd-outline.mjs';
import {encodePublicationDocument} from '../scripts/product-publication-payload.mjs';
import {
	assertUiPass,
	createProductCollection,
	previewProductCollection,
	publishProductCollection,
} from '../scripts/product-collection.mjs';

const fixture = new URL('../../refine-design/references/fixtures/product-model/garden-log/', import.meta.url);
const digest = (value) => createHash('sha256').update(value).digest('hex');

export async function sourceBoundTrial({withScene = false, root: assignedRoot} = {}) {
	const root = assignedRoot ?? (await mkdtemp(path.join(os.tmpdir(), 'product-collection-')));
	persistProductModel({
		proposalPath: new URL('product-model-proposal.json', fixture),
		sourcePath: new URL('product-description.md', fixture),
		sourceLabel: 'briefs/garden-log/product-description.md',
		outputRoot: root,
	});
	const {context} = resolveProductContext({currentPath: path.join(root, 'current.json'), repositoryRoot: root});
	let artifactPublication;
	if (withScene) {
		const imageBytes = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
			'base64',
		);
		const imageSha = digest(imageBytes);
		const imageOutput = `assets/ui-media/${imageSha.slice(0, 12)}-harvest.png`;
		const recordDependency = [{id: context.product.id, materialSha256: context.product.materialSha256}];
		const artifact = (id, artifactKind, owner, document, artifactDependencies = [], resources = []) => {
			const value = {
				schemaVersion: '1.0',
				kind: 'product-artifact',
				id,
				artifactKind,
				owner,
				artifactSchemaVersion:
					artifactKind === 'prd-publication' ? '1.0' : artifactKind === 'design-language' ? '0.14' : '0.4',
				revision: 1,
				status: 'accepted',
				consumerDomains: ['prd'],
				scopeRefs: [context.product.id],
				coverageRefs: [],
				gapRefs: [],
				lockRefs: [],
				recordDependencies: recordDependency,
				artifactDependencies,
				producer: {id: 'fixture-builder', contractVersion: '1.0', method: 'test-fixture'},
				resources,
				payload: encodePublicationDocument(document),
				materialSha256: 'pending',
				change: {kind: 'added', previousRevision: null, previousMaterialSha256: null},
			};
			value.materialSha256 = calculateProductArtifactMaterialSha256(value);
			return value;
		};
		const ux = artifact('garden-ux', 'ux-design', 'ux', {
			schemaVersion: '0.4',
			id: 'garden-ux-spec',
			surfaces: [{id: 'entry-surface', name: 'Entry surface', regions: []}],
		});
		const design = artifact('garden-design', 'design-language', 'ui', {
			designLanguage: {schemaVersion: '0.14'},
			reviewLayout: {version: 7},
		});
		const ui = artifact(
			'garden-ui',
			'ui-composition',
			'ui',
			{
				schemaVersion: '0.4',
				uxArtifactBinding: {id: 'garden-ux-spec', revision: 1},
				designLanguageSource: {revision: 1},
				tokens: [],
				templates: [
					{
						id: 'harvest-image',
						name: 'Harvest image',
						html: {renderer: 'image', element: 'div', className: 'ui-image'},
						sizing: {width: 'fill', height: 'fixed', heightPx: 80},
					},
				],
				assets: [
					{
						id: 'harvest',
						kind: 'image',
						path: 'media/harvest.png',
						mimeType: 'image/png',
						widthPx: 1,
						heightPx: 1,
						sha256: imageSha,
					},
				],
				scenes: [
					{
						id: 'entry-scene',
						name: 'Entry scene',
						status: 'accepted',
						completeness: 'complete',
						surfaceRef: 'entry-surface',
						viewport: {width: 800, height: 600},
						root: {
							id: 'entry-root',
							kind: 'region',
							layout: {
								mode: 'flex',
								direction: 'column',
								gap: 0,
								padding: 0,
								align: 'stretch',
								justify: 'start',
							},
							children: [
								{
									id: 'harvest-image-node',
									kind: 'component',
									templateRef: {id: 'harvest-image'},
									state: 'available',
									parameters: {
										assetId: 'harvest',
										accessibleLabel: 'Sample harvest',
										fitMode: 'contain',
									},
									styleRefs: [],
								},
							],
						},
					},
				],
				renderRequests: [
					{id: 'entry-clean', sceneRef: 'entry-scene', variant: 'clean', output: 'comps/entry.html'},
				],
			},
			[{id: ux.id, revision: ux.revision, materialSha256: ux.materialSha256}],
			[
				{
					id: 'harvest',
					logicalPath: 'media/harvest.png',
					path: `artifact-resources/${imageSha}.png`,
					mediaType: 'image/png',
					byteLength: imageBytes.length,
					sha256: imageSha,
				},
			],
		);
		const manifest = artifact(
			'garden-publication',
			'prd-publication',
			'product',
			{
				schemaVersion: '1.0',
				uxArtifactId: ux.id,
				designLanguageArtifactId: 'garden-design',
				uiArtifactId: ui.id,
				componentArtifactIds: [],
			},
			[ux, design, ui].map((entry) => ({
				id: entry.id,
				revision: entry.revision,
				materialSha256: entry.materialSha256,
			})),
		);
		context.artifacts.push(ux, design, ui, manifest);
		context.materialSha256 = calculateProductContextMaterialSha256(context);
		context.contextId = `prd-context-${context.materialSha256.slice(0, 12)}`;
		artifactPublication = {
			files: new Map([
				['assets/prd.css', Buffer.from('/* product styles */\n')],
				['assets/composition.css', Buffer.from('/* UI styles */\n')],
				['comps/entry.html', Buffer.from('<!doctype html><title>Entry scene</title>\n')],
				[imageOutput, imageBytes],
			]),
			resources: [
				{
					artifactId: ui.id,
					id: 'harvest',
					logicalPath: 'media/harvest.png',
					path: `artifact-resources/${imageSha}.png`,
					mediaType: 'image/png',
					byteLength: imageBytes.length,
					sha256: imageSha,
				},
			],
			inlineComponentRegistrations: [],
		};
	}
	const contextBytes = Buffer.from(`${JSON.stringify(context, null, 2)}\n`);
	const contextPath = path.join(root, 'context.json');
	await writeFile(contextPath, contextBytes);
	const index = createOutlineSourceIndex(context);
	const introduction = index.sources
		.filter((source) => ['product', 'purpose', 'user'].includes(source.kind))
		.map((source) => source.ref);
	const behavior = index.sources.filter((source) => !introduction.includes(source.ref)).map((source) => source.ref);
	const outline = {
		schemaVersion: '1.0',
		contextId: index.context.id,
		sourceIndexSha256: index.sourceIndexSha256,
		notes: [],
		groups: [
			{
				id: 'introduction',
				title: 'Garden context',
				summary: 'The reader and product purpose.',
				sourceRefs: introduction,
				children: [],
			},
			{
				id: 'behavior',
				title: 'Harvest behavior',
				summary: 'The recorded goals and product rules.',
				sourceRefs: behavior,
				children: [],
			},
		],
	};
	const outlineBytes = Buffer.from(`${JSON.stringify(outline, null, 2)}\n`);
	const weights = {
		schemaVersion: '1.0',
		contextId: index.context.id,
		sourceIndexSha256: index.sourceIndexSha256,
		outlineSha256: digest(outlineBytes),
		overallNotes: [],
		nodes: outline.groups.map((group) => ({
			groupId: group.id,
			weight: 'medium',
			factors: {
				sourceDepth: 'medium',
				interactionDepth: 'low',
				visualFootprint: 'low',
				sharedLoad: 'low',
				crossLinks: 'low',
			},
			rationale: 'This is a coherent reader subject.',
			gapRefs: [],
		})),
	};
	const weightsBytes = Buffer.from(`${JSON.stringify(weights, null, 2)}\n`);
	const standaloneContext = {
		orientation: 'Garden Log records dated harvests for later review.',
		terms: ['Harvest entry: a dated record of collected produce.'],
		scope: 'Garden recording and review.',
		behavior: 'A researcher records and retains entries.',
		openQuestions: [],
	};
	const page = (id, title, groupRefs, parentPageId = null) => ({
		id,
		parentPageId,
		title,
		summary: `Read ${title.toLowerCase()}.`,
		groupRefs,
		compRefs: [],
		rationale: 'The content has a distinct reading purpose.',
	});
	const document = (id, title, pages) => ({
		id,
		title,
		audience: 'Garden researchers',
		purpose: 'Understand garden recording.',
		standaloneContext,
		boundaryRationale: 'This document has one reader purpose.',
		pages,
	});
	const base = {
		schemaVersion: '1.0',
		contextId: index.context.id,
		sourceIndexSha256: index.sourceIndexSha256,
		outlineSha256: digest(outlineBytes),
		weightsSha256: digest(weightsBytes),
		revision: 1,
		peerDecisions: [],
		notes: [],
	};
	const one = {
		...base,
		documents: [
			document('garden-guide', 'Garden guide', [
				page('start', 'Start here', ['introduction']),
				page('harvests', 'Harvest behavior', ['behavior'], 'start'),
			]),
		],
		crossLinks: [
			{from: 'garden-guide/start', to: 'garden-guide/harvests', purpose: 'Continue to recording behavior.'},
		],
	};
	const simple = {
		...base,
		documents: [
			document('garden-guide', 'Garden guide', [page('start', 'Start here', ['introduction', 'behavior'])]),
		],
		crossLinks: [],
	};
	const two = {
		...base,
		revision: 2,
		documents: [
			document('garden-context', 'Garden context', [page('start', 'Start here', ['introduction'])]),
			document('harvest-rules', 'Harvest rules', [page('start', 'Start here', ['behavior'])]),
		],
		crossLinks: [
			{from: 'garden-context/start', to: 'harvest-rules/start', purpose: 'Read the related harvest rules.'},
		],
	};
	const collection = (plan) =>
		createProductCollection({
			context,
			contextBytes,
			outline,
			outlineBytes,
			weights,
			weightsBytes,
			plan,
			planBytes: Buffer.from(`${JSON.stringify(plan, null, 2)}\n`),
			contextDirectory: root,
			artifactPublication,
		});
	return {
		root,
		contextPath,
		outline,
		weights,
		simple: collection(simple),
		one: collection(one),
		oneAgain: collection(one),
		two: collection(two),
		index,
		context,
		plan: one,
		collection,
	};
}
