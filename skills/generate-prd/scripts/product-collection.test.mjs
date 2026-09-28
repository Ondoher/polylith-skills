import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mkdtemp, mkdir, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {createHash} from 'node:crypto';

import {persistProductModel} from '../../refine-design/scripts/product-model.mjs';
import {resolveProductContext} from '../../refine-design/scripts/product-context.mjs';
import {calculateProductArtifactMaterialSha256, calculateProductContextMaterialSha256} from './generate-prd.mjs';
import {createOutlineSourceIndex} from './prd-outline.mjs';
import {generatePrd} from './generate-prd.mjs';
import {encodePublicationDocument} from './product-publication-payload.mjs';
import {
	assertUiPass,
	createProductCollection,
	previewProductCollection,
	publishProductCollection,
} from './product-collection.mjs';

const fixture = new URL('../../refine-design/references/fixtures/product-model/garden-log/', import.meta.url);
const digest = (value) => createHash('sha256').update(value).digest('hex');

import {sourceBoundTrial} from '../test-fixtures/collection-trial.mjs';

test('a validated outline publishes deterministic linked pages in a new preview', async () => {
	const trial = await sourceBoundTrial();
	assert.deepEqual(
		[...trial.simple.documents.get('garden-guide').files.keys()],
		['assets/collection.css', 'index.html', 'start.html'],
	);
	const preview = path.join(trial.root, 'preview');
	const result = await previewProductCollection(preview, trial.one);
	assert.equal(result.sourceCount, trial.index.sources.length);
	const page = await readFile(path.join(preview, 'garden-guide', 'start.html'), 'utf8');
	assert.match(page, /href="harvests.html"/);
	assert.match(page, /Garden context/);
	assert.equal(
		digest(await readFile(path.join(preview, 'garden-guide', 'start.html'))),
		digest(trial.one.documents.get('garden-guide').files.get('start.html')),
	);
	assert.deepEqual(
		[...trial.one.documents.get('garden-guide').files],
		[...trial.oneAgain.documents.get('garden-guide').files],
	);
});

test('a planned current UI pass selects every source-bound scene', () => {
	const payload = (document) => encodePublicationDocument(document, {encoding: 'json'});
	const context = {
		artifacts: [
			{
				id: 'ux',
				artifactKind: 'ux-design',
				artifactSchemaVersion: '0.4',
				payload: payload({
					schemaVersion: '0.4',
					id: 'ux-spec',
				}),
			},
			{
				id: 'ui',
				artifactKind: 'ui-composition',
				artifactSchemaVersion: '0.4',
				payload: payload({
					schemaVersion: '0.4',
					uxArtifactBinding: {id: 'ux-spec'},
					scenes: [{id: 'entry'}, {id: 'confirmation'}],
					renderRequests: [
						{id: 'entry-clean', sceneRef: 'entry'},
						{id: 'confirmation-clean', sceneRef: 'confirmation'},
					],
				}),
			},
			{
				id: 'publication',
				artifactKind: 'prd-publication',
				payload: payload({
					uxArtifactId: 'ux',
					uiArtifactId: 'ui',
				}),
			},
		],
	};
	const plan = {
		documents: [
			{
				pages: [
					{compRefs: ['artifact:ui#/scenes/entry']},
					{compRefs: ['artifact:ui#/renderRequests/confirmation-clean']},
				],
			},
		],
	};
	assert.doesNotThrow(() => assertUiPass(context, plan));
});

test('a selected current scene is inline and has a local full-size comp', async () => {
	const trial = await sourceBoundTrial({withScene: true});
	const plan = structuredClone(trial.plan);
	plan.documents[0].pages[1].compRefs = ['artifact:garden-ui#/scenes/entry-scene'];
	assert.doesNotThrow(() => assertUiPass(trial.context, plan));
	const collection = trial.collection(plan);
	const page = collection.documents.get('garden-guide').files.get('harvests.html').toString('utf8');
	assert.match(page, /data-ui-scene="entry-scene"/);
	assert.match(page, /href="comps\/entry\.html"/);
	assert.match(page, /src="assets\/ui-media\/[a-f0-9]{12}-harvest\.png"/);
	assert.equal(collection.documents.get('garden-guide').files.has('comps/entry.html'), true);
	const preview = path.join(trial.root, 'scene-preview');
	await previewProductCollection(preview, collection);
	assert.equal(
		await readFile(path.join(preview, 'garden-guide', 'comps', 'entry.html'), 'utf8'),
		'<!doctype html><title>Entry scene</title>\n',
	);
	const image = [...collection.documents.get('garden-guide').files.keys()].find((name) =>
		name.startsWith('assets/ui-media/'),
	);
	assert.deepEqual(
		await readFile(path.join(preview, 'garden-guide', ...image.split('/'))),
		collection.documents.get('garden-guide').files.get(image),
	);
});

test('publication retires owned product directories while preserving technical output', async () => {
	const trial = await sourceBoundTrial();
	const root = path.join(trial.root, 'documents', 'garden-log');
	const technical = path.join(root, 'technical');
	await mkdir(technical, {recursive: true});
	await writeFile(path.join(technical, 'index.md'), '# Garden technical guide\n');
	await generatePrd({contextPath: trial.contextPath, outputDirectory: path.join(root, 'prd')});
	const first = await publishProductCollection(root, trial.one);
	assert.equal(first.retiredCount, 1);
	assert.equal(fs.existsSync(path.join(root, 'prd')), false);
	assert.equal(await readFile(path.join(technical, 'index.md'), 'utf8'), '# Garden technical guide\n');
	const second = await publishProductCollection(root, trial.two);
	assert.equal(second.retiredCount, 1);
	assert.equal(fs.existsSync(path.join(root, 'garden-guide')), false);
	assert.equal(fs.existsSync(path.join(root, 'garden-context', 'index.html')), true);
	assert.equal(fs.existsSync(path.join(root, 'harvest-rules', 'start.html')), true);
	assert.equal(await readFile(path.join(technical, 'index.md'), 'utf8'), '# Garden technical guide\n');
});
