import {reviewedRenderMediaType} from './publication-resource-media.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {createPublicationArtifactProposal} from './product-publication-proposals.mjs';
import {persistProductModel, loadCurrentProduct} from './product-model.mjs';
import {commitProductArtifact} from './product-artifact-store.mjs';
import {resolveProductContext} from './product-context.mjs';
import {canonicalPublicationJson, decodePublicationDocument} from './product-publication-payload.mjs';
import {publishArtifactResourceFiles, verifyArtifactResourceFiles} from './product-publication-package.mjs';
import {sha256} from './product-artifact-utils.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';
import {createDefaultReviewConfig} from './design-language-review-pages.mjs';
import {DesignAssembly} from './design-assembly.mjs';
import {fileURLToPath} from 'node:url';
import {buildUiCompositionHtml} from './ui-composition-html.mjs';
import {buildDesignLanguageAssetOutputs} from './design-language-html.mjs';
import {capturePublicationFixture} from '../../generate-prd/test-fixtures/capture-publication.mjs';
import {buildArtifactPublication} from '../../generate-prd/scripts/publication-artifacts.mjs';

function fixture(t, singlePass = false) {
	const parent = fileURLToPath(new URL('../../../.codex-tmp/capture-promotion/proposal-tests/', import.meta.url));
	fs.mkdirSync(parent, {recursive: true});
	const root = fs.mkdtempSync(path.join(parent, 'case-'));
	t.after(() => {
		assert.equal(path.dirname(fs.realpathSync(root)), fs.realpathSync(parent));
		fs.rmSync(root, {recursive: true, force: true});
	});
	const store = path.join(root, 'product');
	const productFixture = new URL('../references/fixtures/product-model/field-journal/', import.meta.url);
	persistProductModel({
		proposalPath: new URL('product-model-proposal.json', productFixture),
		sourcePath: new URL('product-description.md', productFixture),
		sourceLabel: 'brief/product-description.md',
		outputRoot: store,
	});
	const design = JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json', import.meta.url)));
	delete design.baseRevision;
	Object.assign(design, {id: 'example-design', revision: 1, decisions: []});
	design.theme.id = 'example-theme';
	const sources = {
		ux: createUxTestSpec(),
		designLanguage: design,
		reviewLayout: createDefaultReviewConfig(),
		ui: JSON.parse(fs.readFileSync(new URL('../references/ui-composition-proposal.json', import.meta.url))),
		component: JSON.parse(
			fs.readFileSync(new URL('../references/component-design-proposal.json', import.meta.url)),
		),
	};
	const binding = loadCurrentProduct(path.join(store, 'current.json')).snapshot.productModel;
	sources.ux.productModelBinding = Object.fromEntries(
		['id', 'revision', 'sha256', 'materialSha256', 'recordIndexSha256'].map((key) => [key, binding[key]]),
	);
	for (const spec of [sources.ui, sources.component]) {
		spec.uxArtifactBinding = {
			id: sources.ux.id,
			revision: sources.ux.revision,
			sha256: sha256(canonicalPublicationJson(sources.ux)),
		};
	}
	if (singlePass) {
		for (const stage of ['ux', 'ui']) {
			const assembled = DesignAssembly[stage](
				DesignAssembly[stage === 'ux' ? 'importUx' : 'importUi'](sources[stage]),
			);
			assert.deepEqual(assembled.issues, []);
			assert.deepEqual(assembled.document, sources[stage]);
			sources[stage] = assembled.document;
		}
	}
	for (const [name, document] of Object.entries(sources))
		fs.writeFileSync(path.join(root, `${name}.json`), JSON.stringify(document));
	return {root, assetRoot: root, store, currentPath: path.join(store, 'current.json')};
}

function request(id, artifactKind, overrides = {}) {
	return {
		id,
		artifactKind,
		status: 'accepted',
		scopeRefs: ['organize-expeditions'],
		coverageRefs: ['organize-expeditions'],
		gapRefs: [],
		lockRefs: [],
		artifactDependencyIds: [],
		encoding: 'gzip-base64',
		sources: {},
		publication: null,
		...overrides,
	};
}

function commit(environment, request_) {
	const result = createPublicationArtifactProposal({...environment, sourceRoot: environment.root, request: request_});
	const file = path.join(environment.root, `${request_.id}.proposal.json`);
	fs.writeFileSync(file, JSON.stringify(result.proposal));
	publishArtifactResourceFiles(result.files, {outputRoot: environment.root});
	commitProductArtifact({
		currentPath: environment.currentPath,
		baseSnapshotSha256: result.baseSnapshotSha256,
		proposalPath: file,
		resourceRoot: environment.root,
	});
	return result.proposal;
}

test('single-pass UX/UI feeds validated publication artifacts, components, manifest and detached PRD context', (t) => {
	const environment = fixture(t, true);
	commit(environment, request('publication-ux', 'ux-design', {sources: {ux: 'ux.json'}}));
	commit(
		environment,
		request('publication-foundations', 'design-language', {
			sources: {designLanguage: 'designLanguage.json', reviewLayout: 'reviewLayout.json'},
		}),
	);
	const sources = {ux: 'ux.json', designLanguage: 'designLanguage.json', ui: 'ui.json'};
	commit(
		environment,
		request('publication-ui', 'ui-composition', {
			sources,
			artifactDependencyIds: ['publication-ux', 'publication-foundations'],
		}),
	);
	commit(
		environment,
		request('publication-component', 'component-design', {
			sources: {...sources, component: 'component.json'},
			artifactDependencyIds: ['publication-ux', 'publication-foundations', 'publication-ui'],
		}),
	);
	const publication = {
		schemaVersion: '1.0',
		uxArtifactId: 'publication-ux',
		designLanguageArtifactId: 'publication-foundations',
		uiArtifactId: 'publication-ui',
		componentArtifactIds: ['publication-component'],
	};
	const manifest = commit(
		environment,
		request('publication-manifest', 'prd-publication', {
			encoding: 'json',
			publication,
			artifactDependencyIds: [
				'publication-ux',
				'publication-foundations',
				'publication-ui',
				'publication-component',
			],
		}),
	);
	assert.deepEqual(decodePublicationDocument(manifest.payload).document, publication);
	assert.deepEqual(manifest.resources, []);
	const context = resolveProductContext({currentPath: environment.currentPath});
	assert.equal(context.path, `contexts/prd/${context.materialSha256}/context.json`);
	assert.equal(context.context.artifacts.length, 5);
	assert.equal(loadCurrentProduct(environment.currentPath).snapshot.artifacts.length, 5);
});

test('reviewed-image transport survives the canonical store and publishes exact PNGs without recapture', (t) => {
	const environment = fixture(t, true);
	commit(environment, request('publication-ux', 'ux-design', {sources: {ux: 'ux.json'}}));
	commit(
		environment,
		request('publication-foundations', 'design-language', {
			sources: {designLanguage: 'designLanguage.json', reviewLayout: 'reviewLayout.json'},
		}),
	);
	const dependencies = ['publication-ux', 'publication-foundations', 'publication-ui'];
	commit(
		environment,
		request('publication-ui', 'ui-composition', {
			sources: {ux: 'ux.json', designLanguage: 'designLanguage.json', ui: 'ui.json'},
			artifactDependencyIds: dependencies.slice(0, 2),
		}),
	);
	const read = (name) => JSON.parse(fs.readFileSync(path.join(environment.root, `${name}.json`)));
	const ui = read('ui'),
		ux = read('ux'),
		designLanguage = read('designLanguage');
	const bytes = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/AkAAAAASUVORK5CYII=',
		'base64',
	);
	// This exercises transport only: fixture PNGs and judgments are not live visual evidence.
	const capture = capturePublicationFixture({ui, ux, designLanguage, bytes});
	const rendered = new Map([
		...buildDesignLanguageAssetOutputs(designLanguage),
		...buildUiCompositionHtml(ui, {
			uxSpec: ux,
			designLanguage,
			sourceRoot: environment.root,
			assetRoot: environment.root,
		}).outputs,
	]);
	capture.renderFiles = [...rendered]
		.filter(([file]) => !file.endsWith('.json'))
		.map(([file, content], index) => ({
			id: `render-${index + 1}`,
			path: file,
			sha256: sha256(content),
			mimeType: reviewedRenderMediaType(file),
		}));
	for (const [file, content] of rendered) {
		fs.mkdirSync(path.dirname(path.join(environment.root, file)), {recursive: true});
		fs.writeFileSync(path.join(environment.root, file), content);
	}
	fs.mkdirSync(path.join(environment.root, 'captures'));
	for (const asset of capture.assets) fs.writeFileSync(path.join(environment.root, asset.path), bytes);
	fs.writeFileSync(path.join(environment.root, 'capture.json'), JSON.stringify(capture));
	commit(
		environment,
		request('publication-capture', 'ui-capture', {
			sources: {capture: 'capture.json'},
			artifactDependencyIds: dependencies,
		}),
	);
	commit(
		environment,
		request('publication-manifest', 'prd-publication', {
			encoding: 'json',
			artifactDependencyIds: [...dependencies, 'publication-capture'],
			publication: {
				schemaVersion: '1.1',
				uxArtifactId: dependencies[0],
				designLanguageArtifactId: dependencies[1],
				uiArtifactId: dependencies[2],
				componentArtifactIds: [],
				uiCaptureArtifactId: 'publication-capture',
			},
		}),
	);
	const context = resolveProductContext({currentPath: environment.currentPath});
	const contextDirectory = path.dirname(path.resolve(environment.store, context.path));
	const publication = buildArtifactPublication(context.context, {contextDirectory});
	const again = buildArtifactPublication(context.context, {contextDirectory});
	assert.deepEqual([...publication.files], [...again.files]);
	for (const shot of capture.screenshots) assert.deepEqual(publication.files.get(shot.path), bytes);
	for (const file of capture.renderFiles)
		assert.deepEqual(publication.files.get(file.path), Buffer.from(rendered.get(file.path)));
	const damaged = structuredClone(capture);
	damaged.renderFiles[0].sha256 = '0'.repeat(64);
	fs.writeFileSync(path.join(environment.root, 'capture.json'), JSON.stringify(damaged));
	assert.throws(
		() =>
			createPublicationArtifactProposal({
				...environment,
				sourceRoot: environment.root,
				request: request('damaged-render', 'ui-capture', {
					sources: {capture: 'capture.json'},
					artifactDependencyIds: dependencies,
				}),
			}),
		/Resource bytes or hash do not match/,
	);
	assert.match(publication.files.get('index.html').toString(), /<img src="captures\//);
	assert.doesNotMatch(publication.files.get('index.html').toString(), /prd-comp-canvas ui-viewport/);
	const stale = structuredClone(capture);
	stale.sources.ui = '0'.repeat(64);
	fs.writeFileSync(path.join(environment.root, 'capture.json'), JSON.stringify(stale));
	assert.throws(
		() =>
			createPublicationArtifactProposal({
				...environment,
				sourceRoot: environment.root,
				request: request('stale-capture', 'ui-capture', {
					sources: {capture: 'capture.json'},
					artifactDependencyIds: dependencies,
				}),
			}),
		/Stale reviewed ui/,
	);
});

test('detached context packages retain only verified declared resources after the store is removed', (t) => {
	const environment = fixture(t);
	const png = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
		'base64',
	);
	fs.mkdirSync(path.join(environment.root, 'images'));
	fs.writeFileSync(path.join(environment.root, 'images/pixel.png'), png);
	fs.writeFileSync(path.join(environment.root, 'images/unrelated.png'), png);
	const uiPath = path.join(environment.root, 'ui.json');
	const ui = JSON.parse(fs.readFileSync(uiPath));
	ui.assets.push({
		id: 'sample',
		kind: 'image',
		status: 'accepted',
		path: 'images/pixel.png',
		mimeType: 'image/png',
		widthPx: 1,
		heightPx: 1,
		sha256: sha256(png),
	});
	fs.writeFileSync(uiPath, JSON.stringify(ui));
	commit(environment, request('publication-ux', 'ux-design', {sources: {ux: 'ux.json'}}));
	commit(
		environment,
		request('publication-foundations', 'design-language', {
			sources: {designLanguage: 'designLanguage.json', reviewLayout: 'reviewLayout.json'},
		}),
	);
	commit(
		environment,
		request('publication-ui', 'ui-composition', {
			sources: {ux: 'ux.json', designLanguage: 'designLanguage.json', ui: 'ui.json'},
			artifactDependencyIds: ['publication-ux', 'publication-foundations'],
		}),
	);
	const result = resolveProductContext({currentPath: environment.currentPath});
	const detached = path.join(environment.root, 'detached');
	fs.cpSync(path.dirname(path.join(environment.store, result.path)), detached, {recursive: true});
	const before = fs.readFileSync(path.join(detached, 'context.json'));
	const replay = resolveProductContext({currentPath: environment.currentPath});
	assert.equal(replay.created, false);
	assert.deepEqual(fs.readFileSync(path.join(environment.store, result.path)), before);
	fs.rmSync(environment.store, {recursive: true});
	const context = JSON.parse(before);
	const resources = context.artifacts.find((artifact) => artifact.id === 'publication-ui').resources;
	assert.deepEqual(verifyArtifactResourceFiles(resources, {resourceRoot: detached})[0].bytes, png);
	assert.deepEqual(fs.readdirSync(path.join(detached, 'artifact-resources')), [`${sha256(png)}.png`]);
	assert.equal(before.includes(Buffer.from(environment.root)), false);
});

test('producer rejects noncurrent design versions and mismatched dependency documents before proposals', (t) => {
	const environment = fixture(t);
	const uxFile = path.join(environment.root, 'ux.json');
	const ux = JSON.parse(fs.readFileSync(uxFile));
	for (const schemaVersion of ['0.1', '0.2', '0.3', '0.5']) {
		fs.writeFileSync(uxFile, JSON.stringify({...ux, schemaVersion}));
		assert.throws(
			() =>
				createPublicationArtifactProposal({
					...environment,
					sourceRoot: environment.root,
					request: request('publication-ux', 'ux-design', {sources: {ux: 'ux.json'}}),
				}),
			/schema.*version/i,
		);
	}
	fs.writeFileSync(uxFile, JSON.stringify(ux));
	commit(environment, request('publication-ux', 'ux-design', {sources: {ux: 'ux.json'}}));
	commit(
		environment,
		request('publication-foundations', 'design-language', {
			sources: {designLanguage: 'designLanguage.json', reviewLayout: 'reviewLayout.json'},
		}),
	);
	ux.title = 'A different current source';
	fs.writeFileSync(uxFile, JSON.stringify(ux));
	assert.throws(
		() =>
			createPublicationArtifactProposal({
				...environment,
				sourceRoot: environment.root,
				request: request('publication-ui', 'ui-composition', {
					sources: {ux: 'ux.json', designLanguage: 'designLanguage.json', ui: 'ui.json'},
					artifactDependencyIds: ['publication-ux', 'publication-foundations'],
				}),
			}),
		/differs from its exact artifact dependency/,
	);
});

test('resource failures preserve the current pointer and prevent context publication', (t) => {
	const environment = fixture(t);
	const png = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
		'base64',
	);
	fs.writeFileSync(path.join(environment.root, 'pixel.png'), png);
	const uiFile = path.join(environment.root, 'ui.json');
	const ui = JSON.parse(fs.readFileSync(uiFile));
	ui.assets.push({
		id: 'sample',
		kind: 'image',
		status: 'accepted',
		path: 'pixel.png',
		mimeType: 'image/png',
		widthPx: 1,
		heightPx: 1,
		sha256: sha256(png),
	});
	fs.writeFileSync(uiFile, JSON.stringify(ui));
	commit(environment, request('publication-ux', 'ux-design', {sources: {ux: 'ux.json'}}));
	commit(
		environment,
		request('publication-foundations', 'design-language', {
			sources: {designLanguage: 'designLanguage.json', reviewLayout: 'reviewLayout.json'},
		}),
	);
	const result = createPublicationArtifactProposal({
		...environment,
		sourceRoot: environment.root,
		request: request('publication-ui', 'ui-composition', {
			sources: {ux: 'ux.json', designLanguage: 'designLanguage.json', ui: 'ui.json'},
			artifactDependencyIds: ['publication-ux', 'publication-foundations'],
		}),
	});
	const proposalPath = path.join(environment.root, 'resource-proposal.json');
	fs.writeFileSync(proposalPath, JSON.stringify(result.proposal));
	const options = {
		currentPath: environment.currentPath,
		proposalPath,
		baseSnapshotSha256: result.baseSnapshotSha256,
		resourceRoot: environment.root,
	};
	const before = fs.readFileSync(environment.currentPath);
	assert.throws(() => commitProductArtifact(options), /ENOENT/);
	assert.deepEqual(fs.readFileSync(environment.currentPath), before);
	publishArtifactResourceFiles(result.files, {outputRoot: environment.root});
	const resourcePath = result.proposal.resources[0].path;
	const inputFile = path.join(environment.root, resourcePath);
	const tampered = Buffer.from(png);
	tampered[tampered.length - 1] ^= 1;
	fs.writeFileSync(inputFile, tampered);
	assert.throws(() => commitProductArtifact(options), /hash|sha-?256/i);
	assert.deepEqual(fs.readFileSync(environment.currentPath), before);
	assert.equal(fs.existsSync(path.join(environment.store, 'artifact-resources')), false);
	fs.writeFileSync(inputFile, png);
	commitProductArtifact(options);
	const storedFile = path.join(environment.store, resourcePath);
	fs.writeFileSync(storedFile, tampered);
	assert.throws(() => resolveProductContext({currentPath: environment.currentPath}), /hash|sha-?256/i);
	assert.equal(fs.existsSync(path.join(environment.store, 'contexts')), false);
});
