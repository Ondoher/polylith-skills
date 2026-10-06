import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DesignUiReview} from './DesignUiReview.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';
import {createUxReviewSubject, UX_REVIEW_CRITERIA} from './ux-review.mjs';
import {buildUiCompositionHtml} from './ui-composition-html.mjs';
import {buildDesignLanguageAssetOutputs} from './design-language-html.mjs';
import {validateCapturePublication, renderReviewedCapture} from './ui-capture-publication.mjs';
import {buildReviewedCapturePublication} from './ui-reviewed-capture.mjs';

/** Called by review scenarios to preserve actual file bindings and renderer output.
 * Tiny PNG files and qualitative judgments are deterministic fixtures, not live screenshots or assessment.
 *
 * @param {DesignCoordinatorTestContext} scenario - Owned cleanup lifecycle.
 * @param {DesignUiReviewTestOptions} [options] - Optional copied-asset fixture branch.
 * @returns {DesignUiReviewTestFixture} - Real saved bytes and mock independent receipt.
 */
function fixture(scenario, {withAsset = false} = {}) {
	const parent = fileURLToPath(
		new URL('../../../.codex-tmp/parallel-design-execution/ui-review-tests/', import.meta.url),
	);
	fs.mkdirSync(parent, {recursive: true});
	const directory = fs.mkdtempSync(path.join(parent, 'case-'));
	scenario.after(() => {
		assert.equal(path.dirname(fs.realpathSync(directory)), fs.realpathSync(parent));
		fs.rmSync(directory, {recursive: true, force: true});
	});
	const inputs = {
		sourceRoot: directory,
		productDescriptionPath: 'product-description.md',
		uxPath: 'ux.json',
		uxReviewPath: 'ux-review.json',
		designLanguagePath: 'design.json',
		uiPath: 'ui.json',
		renderEvidencePath: 'render-evidence.json',
		authorAgentIds: ['ux-author', 'ui-author'],
		reviewerAgentId: 'visual-reviewer',
	};
	const productSource = '# Synthetic Field Journal\n\nReview and update observation records.\n';
	const ux = createUxTestSpec(),
		uxBytes = JSON.stringify(ux);
	const design = JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json', import.meta.url), 'utf8'));
	delete design.baseRevision;
	design.theme.id = 'example-theme';
	Object.assign(design, {id: 'example-design', revision: 1, status: 'accepted', decisions: []});
	const ui = JSON.parse(
		fs.readFileSync(new URL('../references/ui-composition-proposal.json', import.meta.url), 'utf8'),
	);
	const png = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/AkAAAAASUVORK5CYII=',
		'base64',
	);
	if (withAsset) {
		fs.writeFileSync(path.join(directory, 'declared-image.png'), png);
		ui.assets.push({
			id: 'fixture-image',
			kind: 'image',
			status: 'accepted',
			path: 'declared-image.png',
			mimeType: 'image/png',
			widthPx: 1,
			heightPx: 1,
			sha256: createHash('sha256').update(png).digest('hex'),
		});
	}
	fs.writeFileSync(path.join(directory, inputs.productDescriptionPath), productSource);
	fs.writeFileSync(path.join(directory, inputs.uxPath), uxBytes);
	fs.writeFileSync(path.join(directory, inputs.designLanguagePath), JSON.stringify(design));
	fs.writeFileSync(path.join(directory, inputs.uiPath), JSON.stringify(ui));
	const uxSubject = createUxReviewSubject({
		uxSpec: ux,
		uxSource: Buffer.from(uxBytes),
		uxArtifactPath: path.join(directory, inputs.uxPath),
		productDescriptionSource: Buffer.from(productSource),
		productDescriptionPath: path.join(directory, inputs.productDescriptionPath),
		sourceRoot: directory,
		scopeRefs: [ux.id],
	});
	fs.writeFileSync(
		path.join(directory, inputs.uxReviewPath),
		JSON.stringify({
			schemaVersion: '0.2',
			subject: uxSubject,
			verdict: 'pass',
			summary: 'Deterministic validator fixture, not a live UX review.',
			coverage: UX_REVIEW_CRITERIA.map((criterion) => ({
				criterion,
				result: 'pass',
				evidenceRefs: [ux.id],
				note: 'Mock judgments solely exercise exact native receipt binding.',
			})),
			findings: [],
			researchChecks: [],
			limits: ['No live specialist assessment or usability evidence.'],
		}),
	);
	const uiOutputs = buildUiCompositionHtml(ui, {
		uxSpec: ux,
		designLanguage: design,
		uiSource: fs.readFileSync(path.join(directory, inputs.uiPath), 'utf8'),
		uxSource: fs.readFileSync(path.join(directory, inputs.uxPath), 'utf8'),
		designSource: fs.readFileSync(path.join(directory, inputs.designLanguagePath), 'utf8'),
		sourceRoot: directory,
		assetRoot: directory,
	}).outputs;
	for (const [relative, bytes] of new Map([...buildDesignLanguageAssetOutputs(design), ...uiOutputs])) {
		const target = path.join(directory, relative);
		fs.mkdirSync(path.dirname(target), {recursive: true});
		fs.writeFileSync(target, bytes);
	}
	const screenshots = ui.renderRequests.map((request) => ({
		ref: request.id,
		sceneRef: request.sceneRef,
		path: `screenshots/${request.id}.png`,
	}));
	fs.mkdirSync(path.join(directory, 'screenshots'));
	for (const shot of screenshots) fs.writeFileSync(path.join(directory, shot.path), png);
	const evidence = {
		uiSha256: createHash('sha256')
			.update(fs.readFileSync(path.join(directory, inputs.uiPath)))
			.digest('hex'),
		uxSha256: createHash('sha256')
			.update(fs.readFileSync(path.join(directory, inputs.uxPath)))
			.digest('hex'),
		designLanguageSha256: createHash('sha256')
			.update(fs.readFileSync(path.join(directory, inputs.designLanguagePath)))
			.digest('hex'),
		renders: ui.renderRequests.map((request) => ({
			sceneRef: request.sceneRef,
			path: request.output,
			screenshotRefs: [request.id],
		})),
		screenshots,
	};
	fs.writeFileSync(path.join(directory, inputs.renderEvidencePath), JSON.stringify(evidence));
	const helper = new DesignUiReview(),
		subject = helper.subject(inputs);
	const receipt = {
		subject,
		reviewerAgentId: inputs.reviewerAgentId,
		verdict: 'pass',
		inspectedScreenshotRefs: screenshots.map((shot) => shot.ref),
		findings: [],
		strengths: ['Deterministic binding fixture.'],
		limits: ['Tiny image fixtures are not live captures or visual quality evidence.'],
	};
	return {directory, inputs, evidence, helper, receipt};
}

test('native visual subject observes actual files and validates a deterministic independent receipt read-only', (scenario) => {
	const f = fixture(scenario);
	const before = fs.readFileSync(path.join(f.directory, f.inputs.renderEvidencePath));
	assert.deepEqual(f.helper.requirePassing(f.receipt, f.inputs), f.receipt);
	assert.equal(f.receipt.subject.renders.length, 2);
	assert.equal(f.receipt.subject.screenshots.length, 2);
	assert.deepEqual(fs.readFileSync(path.join(f.directory, f.inputs.renderEvidencePath)), before);
});

test('reviewed PNG export binds every inspected variant and refuses revise or stale evidence', async (scenario) => {
	const f = fixture(scenario);
	const {document, files} = await buildReviewedCapturePublication(f.receipt, f.inputs);
	assert.equal(files.size, document.renderFiles.length + document.screenshots.length);
	assert.equal(document.review.subjectSha256, f.receipt.subject.sha256);
	const read = (file) => JSON.parse(fs.readFileSync(path.join(f.directory, file)));
	const sources = {
		ui: read(f.inputs.uiPath),
		ux: read(f.inputs.uxPath),
		designLanguage: read(f.inputs.designLanguagePath),
	};
	assert.doesNotThrow(() => validateCapturePublication(document, sources));
	const figure = renderReviewedCapture({...sources.ui.scenes[0], completeness: 'partial'}, document);
	assert.match(figure, /<img src="captures\//);
	assert.match(figure, /alt="[^"]+partial UI wireframe/);
	assert.match(figure, /Annotated image/);
	assert.doesNotMatch(figure, /iframe|prd-comp-canvas/);
	await assert.rejects(
		buildReviewedCapturePublication({...f.receipt, verdict: 'revise'}, f.inputs),
		/requires revision/,
	);
	const stale = structuredClone(sources);
	stale.ui.revision = 'changed';
	assert.throws(() => validateCapturePublication(document, stale), /Stale reviewed ui/);
	const missing = structuredClone(document);
	missing.screenshots.pop();
	assert.throws(() => validateCapturePublication(missing, sources), /exactly one image/);
	const uninspected = structuredClone(document);
	uninspected.review.inspectedScreenshotRefs = [];
	assert.throws(() => validateCapturePublication(uninspected, sources), /Uninspected/);
	fs.appendFileSync(path.join(f.directory, f.evidence.screenshots[0].path), 'changed');
	await assert.rejects(buildReviewedCapturePublication(f.receipt, f.inputs), /stale|image bytes/);
});

test('all authoritative, rendering and screenshot byte changes invalidate the saved visual subject', (scenario) => {
	const f = fixture(scenario);
	const files = [
		f.inputs.productDescriptionPath,
		f.inputs.uxPath,
		f.inputs.uxReviewPath,
		f.inputs.designLanguagePath,
		f.inputs.uiPath,
		f.inputs.renderEvidencePath,
		f.evidence.renders[0].path,
		f.evidence.screenshots[0].path,
		'assets/composition.css',
		'assets/prd.css',
		'ui/render-report.json',
	];
	for (const relative of files) {
		const target = path.join(f.directory, relative),
			before = fs.readFileSync(target);
		try {
			if (relative.endsWith('.png')) {
				const changed = Buffer.from(before);
				changed[40] ^= 1;
				fs.writeFileSync(target, changed);
			} else fs.appendFileSync(target, '\n');
			assert.throws(() => f.helper.requirePassing(f.receipt, f.inputs), /stale|sha256|bindings/i, relative);
		} finally {
			fs.writeFileSync(target, before);
		}
	}
	assert.deepEqual(f.helper.requirePassing(f.receipt, f.inputs), f.receipt);
});

test('first subject automatically binds and verifies shared theme CSS, fonts and licenses', (scenario) => {
	const f = fixture(scenario);
	const design = JSON.parse(fs.readFileSync(path.join(f.directory, f.inputs.designLanguagePath), 'utf8'));
	const assets = buildDesignLanguageAssetOutputs(design);
	for (const relative of assets.keys()) {
		assert.ok(
			f.receipt.subject.renderSupporting.some((identity) => identity.path === relative),
			relative,
		);
	}
	const font = [...assets.keys()].find((relative) => relative.endsWith('.ttf'));
	assert.ok(font);
	for (const relative of ['assets/prd.css', font]) {
		const target = path.join(f.directory, relative);
		const before = fs.readFileSync(target);
		try {
			fs.appendFileSync(target, '\nChanged unlisted supporting asset');
			assert.throws(() => f.helper.subject(f.inputs), /Rendered output is stale/, relative);
			assert.throws(() => f.helper.requirePassing(f.receipt, f.inputs), /Rendered output is stale/, relative);
		} finally {
			fs.writeFileSync(target, before);
		}
		try {
			fs.unlinkSync(target);
			assert.throws(() => f.helper.subject(f.inputs), /ENOENT/, relative);
		} finally {
			fs.writeFileSync(target, before);
		}
	}
	assert.deepEqual(f.helper.requirePassing(f.receipt, f.inputs), f.receipt);
});

test('missing actual files or declared captures fail explicitly rather than passing', (scenario) => {
	const f = fixture(scenario),
		screenshot = path.join(f.directory, f.evidence.screenshots[0].path);
	const before = fs.readFileSync(screenshot);
	fs.unlinkSync(screenshot);
	assert.throws(() => f.helper.requirePassing(f.receipt, f.inputs), /ENOENT/);
	fs.writeFileSync(screenshot, before);
	const evidence = structuredClone(f.evidence);
	evidence.renders.pop();
	fs.writeFileSync(path.join(f.directory, f.inputs.renderEvidencePath), JSON.stringify(evidence));
	assert.throws(() => f.helper.subject(f.inputs), /Required canonical scene render is missing/);
});

test('independent identity, actual inspection coverage and scoped findings constrain acceptance', (scenario) => {
	const f = fixture(scenario);
	assert.throws(() => f.helper.subject({...f.inputs, reviewerAgentId: 'ui-author'}), /independent/);
	assert.throws(
		() => f.helper.validate({...f.receipt, reviewerAgentId: 'other-reviewer'}, f.inputs),
		/identity differs/,
	);
	assert.throws(
		() =>
			f.helper.validate(
				{...f.receipt, inspectedScreenshotRefs: f.receipt.inspectedScreenshotRefs.slice(1)},
				f.inputs,
			),
		/not all inspected/,
	);
	const revised = structuredClone(f.receipt);
	revised.verdict = 'revise';
	revised.findings = [
		{
			sceneRef: f.receipt.subject.requiredSceneRefs[0],
			severity: 'blocking',
			issue: 'Mock tiny fixture cannot prove readable task labels.',
			requiredOutcome: 'Supply inspected task-state evidence.',
		},
	];
	assert.deepEqual(f.helper.validate(revised, f.inputs), revised);
	assert.throws(() => f.helper.requirePassing(revised, f.inputs), /requires revision/);
	assert.throws(() => f.helper.validate({...revised, verdict: 'pass'}, f.inputs), /blocking findings/);
	revised.findings[0].nodeRef = 'missing-node';
	assert.throws(() => f.helper.validate(revised, f.inputs), /scoped UI review finding/);
});

test('native helper cannot substitute for a prepared wireframe acceptance route', (scenario) => {
	const f = fixture(scenario);
	assert.throws(() => f.helper.subject({...f.inputs, wireframePrepared: true}), /existing acceptance route/);
	assert.throws(
		() => f.helper.subject({...f.inputs, preparedWireframeRunPath: 'wireframes'}),
		/existing acceptance route/,
	);
});

test('supporting research can be reused from an explicit parent root and remains byte-bound', (scenario) => {
	const f = fixture(scenario),
		parent = path.dirname(f.directory);
	const supportingRoot = fs.mkdtempSync(path.join(parent, 'shared-research-'));
	scenario.after(() => {
		assert.equal(path.dirname(fs.realpathSync(supportingRoot)), fs.realpathSync(parent));
		fs.rmSync(supportingRoot, {recursive: true, force: true});
	});
	fs.writeFileSync(
		path.join(supportingRoot, 'questions.md'),
		'Synthetic reusable visual question with parent verification.',
	);
	const inputs = {...f.inputs, supportingRoot, supportingPaths: ['questions.md']};
	const receipt = {...f.receipt, subject: f.helper.subject(inputs)};
	assert.deepEqual(f.helper.requirePassing(receipt, inputs), receipt);
	assert.equal(receipt.subject.supporting[0].path, 'questions.md');
	fs.appendFileSync(path.join(supportingRoot, 'questions.md'), '\nNew material finding.');
	assert.throws(() => f.helper.requirePassing(receipt, inputs), /subject is stale/);
	assert.throws(() => f.helper.subject({...inputs, supportingPaths: ['../outside.md']}), /escapes sourceRoot/);
});

test('source and screenshot linked paths or lexical escapes fail before review acceptance', (scenario) => {
	const f = fixture(scenario);
	assert.throws(() => f.helper.subject({...f.inputs, uiPath: '../outside.json'}), /escapes sourceRoot/);
	const linked = path.join(f.directory, 'linked-captures');
	fs.symlinkSync(path.join(f.directory, 'screenshots'), linked, process.platform === 'win32' ? 'junction' : 'dir');
	const evidence = structuredClone(f.evidence);
	evidence.screenshots[0].path = `linked-captures/${path.basename(evidence.screenshots[0].path)}`;
	fs.writeFileSync(path.join(f.directory, f.inputs.renderEvidencePath), JSON.stringify(evidence));
	assert.throws(() => f.helper.subject(f.inputs), /Linked review input path/);
});

test('first subject rejects stale renderer output even when the manifest claims current input hashes', (scenario) => {
	const f = fixture(scenario);
	const uiPath = path.join(f.directory, f.inputs.uiPath),
		ui = JSON.parse(fs.readFileSync(uiPath, 'utf8'));
	ui.title = 'Changed valid current composition title';
	fs.writeFileSync(uiPath, JSON.stringify(ui));
	f.evidence.uiSha256 = createHash('sha256').update(fs.readFileSync(uiPath)).digest('hex');
	fs.writeFileSync(path.join(f.directory, f.inputs.renderEvidencePath), JSON.stringify(f.evidence));
	assert.throws(() => f.helper.subject(f.inputs), /Render report source bindings are stale/);
	const reportPath = path.join(f.directory, 'ui/render-report.json'),
		report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
	report.sources.ui.sha256 = f.evidence.uiSha256;
	fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
	assert.throws(() => f.helper.subject(f.inputs), /Rendered output is stale/);
});

test('first subject verifies current HTML, CSS, report and dynamically copied image output', (scenario) => {
	const f = fixture(scenario, {withAsset: true});
	const copied = f.receipt.subject.renderSupporting.find((file) => file.path.includes('assets/ui-media/'));
	assert(copied);
	for (const relative of [f.evidence.renders[0].path, 'assets/composition.css', 'comps/index.html', copied.path]) {
		const target = path.join(f.directory, relative),
			before = fs.readFileSync(target);
		try {
			fs.appendFileSync(target, '\nModified generated output.');
			assert.throws(() => f.helper.subject(f.inputs), /Rendered output is stale/, relative);
		} finally {
			fs.writeFileSync(target, before);
		}
	}
	const reportPath = path.join(f.directory, 'ui/render-report.json'),
		report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
	report.rendererVersion = 'obsolete-renderer';
	fs.writeFileSync(reportPath, JSON.stringify(report));
	assert.throws(() => f.helper.subject(f.inputs), /stale or unsupported renderer/);
});
