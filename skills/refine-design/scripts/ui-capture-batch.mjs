import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {UiCapture, capturePath} from './UiCapture.mjs';
import {buildDesignLanguageAssetOutputs} from './design-language-html.mjs';
import {canonicalPublicationJson} from './product-publication-payload.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Capture every clean/annotated request with one run-owned browser, or resume verified successes.
 * Only a fully successful batch publishes render evidence for independent review.
 * A changed source requires a new run rather than rewriting prior capture evidence.
 * @param {UiCaptureBatchOptions} options - Explicit installed browser, structured sources and product run.
 * @returns {Promise<{resultsPath: string, renderEvidencePath: string, captured: number, reused: number}>} - Durable review inputs.
 */
export async function captureUiBatch(options) {
	const worker = new UiCapture(options);
	const root = path.resolve(options.sourceRoot),
		run = path.resolve(options.runRoot);
	const runRelative = path.relative(root, run).split(path.sep).join('/');
	capturePath(root, runRelative);
	const renderBase = options.renderBasePath ? capturePath(root, options.renderBasePath) : root;
	const read = (file) => fs.readFileSync(capturePath(root, file));
	const uiBytes = read(options.uiPath),
		uxBytes = read(options.uxPath),
		designBytes = read(options.designLanguagePath);
	const ui = JSON.parse(uiBytes),
		design = JSON.parse(designBytes);
	const report = JSON.parse(fs.readFileSync(path.join(renderBase, 'ui/render-report.json'), 'utf8'));
	for (const [key, bytes] of [
		['ui', uiBytes],
		['ux', uxBytes],
		['designLanguage', designBytes],
	])
		if (report.sources?.[key]?.sha256 !== hash(bytes)) throw new Error('Stale capture render source');
	const relative = (file) => path.relative(root, file).split(path.sep).join('/');
	const allAssets = [...new Set([...report.files, ...buildDesignLanguageAssetOutputs(design).keys()])].map(
		(file) => ({
			path: relative(path.resolve(renderBase, file)),
			sha256: hash(read(relative(path.resolve(renderBase, file)))),
		}),
	);
	const requests = ui.renderRequests.map((request) => {
		const scene = ui.scenes.find((item) => item.id === request.sceneRef);
		if (!scene) throw new Error('Capture request has no source scene');
		const html = relative(path.resolve(renderBase, request.output));
		return {
			id: request.id,
			sceneRef: request.sceneRef,
			variant: request.variant,
			html,
			htmlSha256: hash(read(html)),
			assets: allAssets.filter((asset) => asset.path !== html),
			requiredFonts: options.requiredFonts,
			width: Math.max(1440, scene.viewport.width + 2),
			height: Math.max(900, scene.viewport.height + 2),
			output: `screenshots/${request.id}.png`,
		};
	});
	const manifestSha256 = hash(canonicalPublicationJson({options, requests}));
	const resultsPath = capturePath(run, 'capture-results.json', false);
	const renderEvidencePath = capturePath(run, 'render-evidence.json', false);
	const state = fs.existsSync(resultsPath)
		? JSON.parse(fs.readFileSync(resultsPath))
		: {
				generator: 'refine-design:ui-capture-batch:1',
				manifestSha256,
				results: [],
			};
	if (
		state.generator !== 'refine-design:ui-capture-batch:1' ||
		state.manifestSha256 !== manifestSha256 ||
		!Array.isArray(state.results)
	)
		throw new Error('Capture resume inputs changed; use a new run');
	const save = (file, value) => {
		const temporary = `${file}.${randomUUID()}.partial`;
		fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {flag: 'wx'});
		fs.renameSync(temporary, file);
	};
	let captured = 0,
		reused = 0;
	try {
		for (const request of requests) {
			const previous = state.results.find((item) => item.id === request.id && item.status === 'success');
			if (previous) {
				const bytes = fs.readFileSync(capturePath(run, request.output));
				if (
					previous.output !== request.output ||
					previous.htmlSha256 !== request.htmlSha256 ||
					hash(bytes) !== previous.pngSha256 ||
					bytes.readUInt32BE(16) !== request.width ||
					bytes.readUInt32BE(20) !== request.height
				)
					throw new Error('Saved capture bytes changed; use a new run');
				reused++;
				continue;
			}
			const result = await worker.capture(request);
			state.results = state.results.filter((item) => item.id !== request.id);
			state.results.push(result);
			save(resultsPath, state);
			if (result.status !== 'success' || result.cleanupError)
				throw new Error(`Capture failed: ${result.error ?? result.cleanupError}`);
			captured++;
		}
	} finally {
		await worker.close();
	}
	const evidence = {
		uiSha256: hash(uiBytes),
		uxSha256: hash(uxBytes),
		designLanguageSha256: hash(designBytes),
		renders: requests.map((request) => ({
			sceneRef: request.sceneRef,
			path: request.html,
			screenshotRefs: [request.id],
		})),
		screenshots: requests.map((request) => ({
			ref: request.id,
			sceneRef: request.sceneRef,
			path: `${runRelative}/${request.output}`,
		})),
	};
	if (
		fs.existsSync(renderEvidencePath) &&
		canonicalPublicationJson(JSON.parse(fs.readFileSync(renderEvidencePath))) !== canonicalPublicationJson(evidence)
	)
		throw new Error('Existing render evidence differs from completed batch');
	if (!fs.existsSync(renderEvidencePath)) save(renderEvidencePath, evidence);
	return {resultsPath, renderEvidencePath, captured, reused};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		if (process.argv.length !== 3) throw new Error('Usage: node ui-capture-batch.mjs <capture-config.json>');
		process.stdout.write(
			`${JSON.stringify(await captureUiBatch(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))))}\n`,
		);
	} catch (error) {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	}
}
