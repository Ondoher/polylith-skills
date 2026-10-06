import {reviewedRenderMediaType} from './publication-resource-media.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {captureDocumentHash, validateCapturePublication, captureArtifactKind} from './ui-capture-publication.mjs';
import {UiParts} from './ui-parts.mjs';
import {validatePublicationLogicalPath} from './product-publication-payload.mjs';
import {collectArtifactResources, publishArtifactResourceFiles} from './product-publication-package.mjs';
import {ensureUnlinkedPath, writeImmutable, stableJson} from './product-artifact-utils.mjs';

/** Build a portable package only after the native independent review passes fresh validation.
 * Prepared-wireframe review cannot use this helper to bypass its existing mandatory gate.
 * @param {DesignUiReviewReceipt} receipt - Independently authored passing review.
 * @param {DesignUiReviewInputs} inputs - Fresh native-run observations.
 * @returns {Promise<{document: UiCapturePublication, files: Map<string, Buffer>}>} - Portable sources and exact PNG bytes.
 */
export async function buildReviewedCapturePublication(receipt, inputs) {
	// Keep the detached validator independent of native-run/storage dependencies.
	const {DesignUiReview} = await import('./DesignUiReview.mjs');
	new DesignUiReview().requirePassing(receipt, inputs);
	const subject = receipt.subject;
	const read = (identity) => {
		const bytes = fs.readFileSync(path.resolve(inputs.sourceRoot, identity.path));
		if (createHash('sha256').update(bytes).digest('hex') !== identity.sha256)
			throw new Error('Reviewed source changed during export');
		return JSON.parse(bytes);
	};
	const ui = read(subject.ui),
		ux = read(subject.ux),
		designLanguage = read(subject.designLanguage);
	const uiView = UiParts.materialize(ui);
	const components = (subject.components ?? []).map(read);
	const renderBase = path.resolve(inputs.sourceRoot, inputs.renderBasePath ?? path.dirname(inputs.uiPath));
	const renderFiles = [...subject.renders, ...subject.renderSupporting]
		.filter((identity) => !identity.path.endsWith('.json'))
		.map((identity, index) => {
			const bytes = fs.readFileSync(path.resolve(inputs.sourceRoot, identity.path));
			if (createHash('sha256').update(bytes).digest('hex') !== identity.sha256)
				throw new Error('Reviewed render changed during export');
			const logical = path
				.relative(renderBase, path.resolve(inputs.sourceRoot, identity.path))
				.split(path.sep)
				.join('/');
			return {
				id: `render-${index + 1}`,
				path: logical,
				sha256: identity.sha256,
				mimeType: reviewedRenderMediaType(logical),
			};
		});
	const files = new Map(renderFiles.map((file) => [file.path, fs.readFileSync(path.resolve(renderBase, file.path))]));
	const assets = [],
		screenshots = [];
	for (const [index, request] of ui.renderRequests.entries()) {
		const renderPath = path.resolve(
			inputs.sourceRoot,
			inputs.renderBasePath ?? path.dirname(inputs.uiPath),
			request.output,
		);
		const render = subject.renders.find((item) => path.resolve(inputs.sourceRoot, item.path) === renderPath);
		const shot = subject.screenshots.find((item) => render?.screenshotRefs.includes(item.ref));
		if (!shot || !receipt.inspectedScreenshotRefs.includes(shot.ref))
			throw new Error('Required published screenshot was not inspected');
		const bytes = fs.readFileSync(path.resolve(inputs.sourceRoot, shot.path));
		if (bytes.length < 45 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
			throw new Error('Published captures must be PNG');
		const digest = createHash('sha256').update(bytes).digest('hex');
		if (digest !== shot.sha256) throw new Error('Reviewed screenshot changed during export');
		const target = `captures/${request.id}.png`;
		validatePublicationLogicalPath(target);
		files.set(target, bytes);
		assets.push({id: `capture-${index + 1}`, kind: 'image', path: target, mimeType: 'image/png', sha256: digest});
		screenshots.push({
			ref: shot.ref,
			sceneRef: request.sceneRef,
			renderOutput: request.output,
			variant: request.variant,
			artifactKind: captureArtifactKind(
				uiView.scenes.find((scene) => scene.id === request.sceneRef),
				uiView,
				components,
			),
			path: target,
			width: bytes.readUInt32BE(16),
			height: bytes.readUInt32BE(20),
		});
	}
	const document = {
		schemaVersion: '1.0',
		renderFiles,
		sources: {
			ui: captureDocumentHash(ui),
			ux: captureDocumentHash(ux),
			designLanguage: captureDocumentHash(designLanguage),
			components: components.map(captureDocumentHash).sort(),
		},
		review: {
			subjectSha256: subject.sha256,
			reviewerAgentId: receipt.reviewerAgentId,
			authorAgentIds: subject.authorAgentIds,
			verdict: 'pass',
			inspectedScreenshotRefs: receipt.inspectedScreenshotRefs,
		},
		assets,
		screenshots,
	};
	validateCapturePublication(document, {ui, ux, designLanguage, components});
	return {document, files};
}

/** Export accepted native review evidence into an immutable, portable image package.
 * @param {string} inputsPath - Saved exact native review inputs.
 * @param {string} receiptPath - Saved independently authored passing receipt.
 * @param {string} outputRoot - New confined package directory beneath the product or temporary run.
 * @returns {Promise<{capturePath: string, resourceRoot: string}>} - Publication producer inputs.
 */
export async function exportReviewedCaptures(inputsPath, receiptPath, outputRoot) {
	const inputs = JSON.parse(fs.readFileSync(inputsPath, 'utf8'));
	const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
	const {document, files} = await buildReviewedCapturePublication(receipt, inputs);
	const root = path.resolve(outputRoot);
	ensureUnlinkedPath(root, inputs.sourceRoot);
	if (fs.existsSync(root)) throw new Error('Reviewed capture export requires a new package directory');
	fs.mkdirSync(root, {recursive: true});
	for (const [relative, bytes] of files) writeImmutable(path.resolve(root, relative), bytes, inputs.sourceRoot);
	const {files: resources} = collectArtifactResources(document, {sourceRoot: inputs.sourceRoot, assetRoot: root});
	publishArtifactResourceFiles(resources, {outputRoot: root});
	const capturePath = path.join(root, 'capture.json');
	writeImmutable(capturePath, Buffer.from(stableJson(document)), inputs.sourceRoot);
	return {capturePath, resourceRoot: root};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const [inputsPath, receiptPath, outputRoot] = process.argv.slice(2);
		if (!inputsPath || !receiptPath || !outputRoot || process.argv.length !== 5)
			throw new Error(
				'Usage: node ui-reviewed-capture.mjs <review-inputs.json> <passing-receipt.json> <new-package-root>',
			);
		process.stdout.write(`${JSON.stringify(await exportReviewedCaptures(inputsPath, receiptPath, outputRoot))}\n`);
	} catch (error) {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	}
}
