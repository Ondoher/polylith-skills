import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {validateUiSpec} from './ui-composition.mjs';
import {validatePassingUxReview} from './ux-review.mjs';
import {UiParts} from './ui-parts.mjs';
import {buildComponentRegistration} from './component-design.mjs';
import {canonicalPublicationJson} from './product-publication-payload.mjs';
import {buildDesignLanguageAssetOutputs} from './design-language-html.mjs';
import {
	buildUiCompositionHtml,
	UI_COMPOSITION_HTML_GENERATOR,
	UI_COMPOSITION_HTML_VERSION,
} from './ui-composition-html.mjs';

/** Read-only exact visual-review binding for native canonical composition runs.
 * @implements {DesignUiReviewContract}
 */
export class DesignUiReview {
	/** Called by file observation to reject links and paths outside the source root.
	 *
	 * @param {string} root - Parent-owned source root.
	 * @param {string} location - Absolute or root-relative file/directory location.
	 * @returns {string} - Confined physical path.
	 */
	_path(root, location) {
		if (typeof location !== 'string' || !location.trim()) throw new Error('An exact file path is required');
		const target = path.resolve(root, location),
			relative = path.relative(root, target);
		if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
			throw new Error('Review input escapes sourceRoot');
		let current = target;
		while (current !== path.dirname(current)) {
			if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
				throw new Error('Linked review input path');
			current = path.dirname(current);
		}
		return target;
	}

	/** Called by exact binding to observe stable file bytes without following links.
	 *
	 * @param {string} root - Confined parent source root.
	 * @param {string} location - Authoritative input path.
	 * @returns {DesignUiReviewObservation} - Actual bytes and root-relative identity.
	 */
	_read(root, location) {
		const target = this._path(root, location);
		if (!fs.statSync(target).isFile()) throw new Error('Review inputs must be files');
		const descriptor = fs.openSync(target, 'r');
		try {
			const before = fs.fstatSync(descriptor, {bigint: true}),
				bytes = fs.readFileSync(descriptor);
			const after = fs.fstatSync(descriptor, {bigint: true});
			if (['ino', 'dev', 'size', 'mtimeNs', 'ctimeNs'].some((key) => before[key] !== after[key]))
				throw new Error('Review input changed while being observed');
			if (!bytes.length) throw new Error('Review inputs cannot be empty');
			return {
				bytes,
				identity: {
					path: path.relative(root, target).split(path.sep).join('/'),
					sha256: createHash('sha256').update(bytes).digest('hex'),
					bytes: bytes.length,
				},
			};
		} finally {
			fs.closeSync(descriptor);
		}
	}

	/** Called by operational ingress to keep request and receipt shapes closed.
	 *
	 * @param {unknown} value - Candidate object.
	 * @param {string[]} fields - Allowed own fields.
	 * @param {string} label - Actionable error location.
	 * @returns {void}
	 */
	_object(value, fields, label) {
		if (
			!value ||
			typeof value !== 'object' ||
			Array.isArray(value) ||
			Object.keys(value).some((key) => !fields.includes(key))
		)
			throw new Error(`Invalid ${label}`);
	}

	/** Called by scope and reviewer ingress to validate unique nonempty references.
	 *
	 * @param {unknown} value - Candidate list.
	 * @param {string} label - Error location.
	 * @param {boolean} nonempty - Whether empty coverage is forbidden.
	 * @returns {string[]} - Validated list in stable lexical order.
	 */
	_strings(value, label, nonempty = true) {
		if (
			!Array.isArray(value) ||
			(nonempty && !value.length) ||
			value.some((entry) => typeof entry !== 'string' || !entry.trim()) ||
			new Set(value).size !== value.length
		)
			throw new Error(`Invalid ${label}`);
		return [...value].sort();
	}

	/** Called by screenshot observation to reject text or empty image substitutes.
	 * This identifies supported byte signatures; visual judgment stays with the reviewer.
	 *
	 * @param {Buffer} bytes - Actual screenshot bytes.
	 * @returns {void}
	 */
	_screenshot(bytes) {
		const png =
			bytes.length >= 45 &&
			bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
			bytes.subarray(12, 16).toString() === 'IHDR' &&
			bytes.subarray(-8, -4).toString() === 'IEND';
		const jpeg =
			bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
		const webp =
			bytes.length >= 20 &&
			bytes.subarray(0, 4).toString() === 'RIFF' &&
			bytes.subarray(8, 12).toString() === 'WEBP';
		if (!png && !jpeg && !webp) throw new Error('Review screenshot must contain PNG, JPEG or WebP image bytes');
	}

	/** Called by subject and receipt validation to freshly observe all actual inputs.
	 * Rejects prepared wireframe runs; their existing independent acceptance route remains mandatory.
	 *
	 * @param {DesignUiReviewInputs} inputs - Parent-owned source, render and assignment bindings.
	 * @returns {DesignUiReviewObservedSubject} - Exact subject and actual scene-node registry.
	 */
	_observe(inputs) {
		this._object(
			inputs,
			[
				'sourceRoot',
				'productDescriptionPath',
				'uxPath',
				'uxReviewPath',
				'designLanguagePath',
				'uiPath',
				'renderEvidencePath',
				'authorAgentIds',
				'reviewerAgentId',
				'requiredSceneRefs',
				'requiredScreenshotRefs',
				'supportingPaths',
				'supportingRoot',
				'renderBasePath',
				'wireframePrepared',
				'preparedWireframeRunPath',
				'componentPaths',
			],
			'UI review inputs',
		);
		if (inputs.wireframePrepared === true || inputs.preparedWireframeRunPath !== undefined)
			throw new Error(
				'Prepared wireframe runs require their existing acceptance route; native review cannot replace it',
			);
		if (inputs.wireframePrepared !== undefined && inputs.wireframePrepared !== false)
			throw new Error('Invalid wireframe preparation declaration');
		if (typeof inputs.sourceRoot !== 'string' || !path.isAbsolute(inputs.sourceRoot))
			throw new Error('An absolute sourceRoot is required');
		const root = this._path(path.resolve(inputs.sourceRoot), '.');
		if (!fs.statSync(root).isDirectory()) throw new Error('sourceRoot must be a directory');
		const authorAgentIds = this._strings(inputs.authorAgentIds, 'authorAgentIds');
		if (
			typeof inputs.reviewerAgentId !== 'string' ||
			!inputs.reviewerAgentId.trim() ||
			authorAgentIds.includes(inputs.reviewerAgentId)
		)
			throw new Error('An independent parent-assigned reviewer identity is required');
		const source = this._read(root, inputs.productDescriptionPath),
			ux = this._read(root, inputs.uxPath),
			uxReview = this._read(root, inputs.uxReviewPath),
			design = this._read(root, inputs.designLanguagePath),
			ui = this._read(root, inputs.uiPath),
			evidence = this._read(root, inputs.renderEvidencePath);
		const uxSpec = JSON.parse(ux.bytes.toString('utf8')),
			designLanguage = JSON.parse(design.bytes.toString('utf8')),
			uiSpec = JSON.parse(ui.bytes.toString('utf8'));
		validatePassingUxReview(JSON.parse(uxReview.bytes.toString('utf8')), {
			uxSpec,
			uxSource: ux.bytes,
			uxArtifactPath: this._path(root, inputs.uxPath),
			productDescriptionSource: source.bytes,
			productDescriptionPath: this._path(root, inputs.productDescriptionPath),
			sourceRoot: root,
			scopeRefs: [uxSpec.id],
			requiredScopeRefs: [uxSpec.id],
		});
		validateUiSpec(uiSpec, {uxSpec, designLanguage, sourceRoot: root, assetRoot: root});
		const nodesByScene = new Map(
			UiParts.materialize(uiSpec).scenes.map((scene) => {
				const nodes = new Set(),
					queue = [scene.root];
				for (let index = 0; index < queue.length; index++) {
					nodes.add(queue[index].id);
					queue.push(...(queue[index].children ?? []));
				}
				return [scene.id, nodes];
			}),
		);
		const requiredSceneRefs = this._strings(
			inputs.requiredSceneRefs ?? [...nodesByScene.keys()],
			'requiredSceneRefs',
		);
		if (requiredSceneRefs.some((ref) => !nodesByScene.has(ref)))
			throw new Error('Required scene is outside canonical UI');
		const bundle = JSON.parse(evidence.bytes.toString('utf8'));
		this._object(
			bundle,
			['uiSha256', 'uxSha256', 'designLanguageSha256', 'renders', 'screenshots'],
			'render evidence',
		);
		if (
			bundle.uiSha256 !== ui.identity.sha256 ||
			bundle.uxSha256 !== ux.identity.sha256 ||
			bundle.designLanguageSha256 !== design.identity.sha256
		)
			throw new Error('Render evidence bindings are stale');
		if (
			!Array.isArray(bundle.renders) ||
			!bundle.renders.length ||
			!Array.isArray(bundle.screenshots) ||
			!bundle.screenshots.length
		)
			throw new Error('Actual render and screenshot evidence is required');
		const screenshots = bundle.screenshots.map((shot) => {
			this._object(shot, ['ref', 'sceneRef', 'path'], 'screenshot evidence');
			if (typeof shot.ref !== 'string' || !shot.ref.trim() || !nodesByScene.has(shot.sceneRef))
				throw new Error('Invalid screenshot scope');
			const observed = this._read(root, shot.path);
			this._screenshot(observed.bytes);
			return {ref: shot.ref, sceneRef: shot.sceneRef, ...observed.identity};
		});
		this._strings(
			screenshots.map((shot) => shot.ref),
			'screenshot references',
		);
		this._strings(
			screenshots.map((shot) => shot.path),
			'screenshot paths',
		);
		const renderBase = this._path(root, inputs.renderBasePath ?? path.dirname(this._path(root, inputs.uiPath)));
		const renderReport = JSON.parse(
			this._read(root, path.resolve(renderBase, 'ui/render-report.json')).bytes.toString('utf8'),
		);
		if (
			renderReport.generator !== UI_COMPOSITION_HTML_GENERATOR ||
			renderReport.rendererVersion !== UI_COMPOSITION_HTML_VERSION
		)
			throw new Error('Render report uses a stale or unsupported renderer');
		for (const [name, document, identity] of [
			['ui', uiSpec, ui.identity],
			['ux', uxSpec, ux.identity],
			['designLanguage', designLanguage, design.identity],
		]) {
			const binding = renderReport.sources?.[name];
			if (
				!binding ||
				binding.id !== document.id ||
				binding.schemaVersion !== document.schemaVersion ||
				binding.revision !== document.revision ||
				binding.sha256 !== identity.sha256 ||
				typeof binding.label !== 'string' ||
				!binding.label.trim()
			)
				throw new Error('Render report source bindings are stale');
		}
		const componentInputs =
			inputs.componentPaths === undefined
				? []
				: this._strings(inputs.componentPaths, 'componentPaths', false).map((file) => this._read(root, file));
		const componentRegistrations = componentInputs.map((input) => {
			const inlineSpec = JSON.parse(input.bytes.toString('utf8'));
			return {
				...buildComponentRegistration(inlineSpec, uiSpec, {
					uxSpec,
					designLanguage,
					sourceRoot: root,
					componentAssetRoot: path.dirname(path.resolve(root, input.identity.path)),
					surfaceAssetRoot: root,
				}),
				inlineSpec,
			};
		});
		const expected = buildUiCompositionHtml(uiSpec, {
			uxSpec,
			designLanguage,
			uiSource: ui.bytes.toString('utf8'),
			uxSource: ux.bytes.toString('utf8'),
			designSource: design.bytes.toString('utf8'),
			uiLabel: renderReport.sources.ui.label,
			uxLabel: renderReport.sources.ux.label,
			designLabel: renderReport.sources.designLanguage.label,
			componentRegistrations,
			sourceRoot: root,
			assetRoot: root,
		});
		const sceneOutputPaths = new Set(uiSpec.renderRequests.map((request) => request.output));
		const renderSupporting = [];
		const expectedOutputs = new Map([...buildDesignLanguageAssetOutputs(designLanguage), ...expected.outputs]);
		for (const [relative, expectedBytes] of expectedOutputs) {
			const observed = this._read(root, path.resolve(renderBase, relative));
			if (!observed.bytes.equals(Buffer.isBuffer(expectedBytes) ? expectedBytes : Buffer.from(expectedBytes)))
				throw new Error('Rendered output is stale or differs from current renderer: ' + relative);
			if (!sceneOutputPaths.has(relative)) renderSupporting.push(observed.identity);
		}
		const renders = bundle.renders.map((render) => {
			this._object(render, ['sceneRef', 'path', 'screenshotRefs'], 'render evidence row');
			const observed = this._read(root, render.path),
				screenshotRefs = this._strings(render.screenshotRefs, 'render screenshots');
			if (
				!uiSpec.renderRequests.some(
					(request) =>
						request.sceneRef === render.sceneRef &&
						this._path(root, path.resolve(renderBase, request.output)) === this._path(root, render.path),
				)
			)
				throw new Error('Render does not match a canonical scene render request');
			if (
				screenshotRefs.some(
					(ref) => !screenshots.some((shot) => shot.ref === ref && shot.sceneRef === render.sceneRef),
				)
			)
				throw new Error('Render screenshot references are missing or cross scenes');
			return {sceneRef: render.sceneRef, screenshotRefs, ...observed.identity};
		});
		this._strings(
			renders.map((render) => render.path),
			'render paths',
		);
		this._strings(
			renders.flatMap((render) => render.screenshotRefs),
			'render screenshot ownership',
		);
		for (const request of uiSpec.renderRequests.filter((request) => requiredSceneRefs.includes(request.sceneRef)))
			if (
				!renders.some(
					(render) =>
						this._path(root, render.path) === this._path(root, path.resolve(renderBase, request.output)),
				)
			)
				throw new Error('Required canonical scene render is missing');
		for (const ref of requiredSceneRefs)
			if (!screenshots.some((shot) => shot.sceneRef === ref))
				throw new Error('Required scene screenshot is missing');
		if (screenshots.some((shot) => !renders.some((render) => render.screenshotRefs.includes(shot.ref))))
			throw new Error('Screenshot has no matching rendered evidence');
		const requiredScreenshotRefs = this._strings(
			inputs.requiredScreenshotRefs ?? screenshots.map((shot) => shot.ref),
			'requiredScreenshotRefs',
		);
		if (requiredScreenshotRefs.some((ref) => !screenshots.some((shot) => shot.ref === ref)))
			throw new Error('Required screenshot is missing');
		for (const ref of requiredSceneRefs)
			if (!screenshots.some((shot) => shot.sceneRef === ref && requiredScreenshotRefs.includes(shot.ref)))
				throw new Error('Required inspection scope omits a required scene');
		if (
			inputs.supportingRoot !== undefined &&
			(typeof inputs.supportingRoot !== 'string' || !path.isAbsolute(inputs.supportingRoot))
		)
			throw new Error('An absolute parent-owned supportingRoot is required');
		const supportingRoot = this._path(path.resolve(inputs.supportingRoot ?? root), '.');
		if (!fs.statSync(supportingRoot).isDirectory()) throw new Error('supportingRoot must be a directory');
		const supporting = this._strings(inputs.supportingPaths ?? [], 'supportingPaths', false).map(
			(location) => this._read(supportingRoot, location).identity,
		);
		const body = {
			format: 'design-ui-review-subject/1',
			sourceRoot: root,
			supportingRoot,
			source: source.identity,
			ux: ux.identity,
			uxReview: uxReview.identity,
			designLanguage: design.identity,
			ui: ui.identity,
			...(componentInputs.length ? {components: componentInputs.map((input) => input.identity)} : {}),
			renderEvidence: evidence.identity,
			renders,
			renderSupporting,
			screenshots,
			supporting,
			authorAgentIds,
			reviewerAgentId: inputs.reviewerAgentId,
			requiredSceneRefs,
			requiredScreenshotRefs,
		};
		return {
			subject: {...body, sha256: createHash('sha256').update(canonicalPublicationJson(body)).digest('hex')},
			nodesByScene,
		};
	}

	/** Call this method to freeze an exact subject from current validated files and real screenshots.
	 * Missing, stale, linked or unsupported prepared-run inputs reject without writes.
	 *
	 * @param {DesignUiReviewInputs} inputs - Parent-observed native run and reviewer assignment.
	 * @returns {DesignUiReviewSubject} - Exact immutable review subject.
	 */
	subject(inputs) {
		return this._observe(inputs).subject;
	}

	/** Call this method to validate a saved reviewer judgment against fresh actual observations.
	 * Preserves revise verdicts; this checks identities and inspection coverage rather than judging visual quality.
	 *
	 * @param {DesignUiReviewReceipt} receipt - Independently authored operational receipt.
	 * @param {DesignUiReviewInputs} inputs - Current parent-owned run observations.
	 * @returns {DesignUiReviewReceipt} - Exact validated receipt, including its original verdict.
	 */
	validate(receipt, inputs) {
		this._object(
			receipt,
			['subject', 'reviewerAgentId', 'verdict', 'inspectedScreenshotRefs', 'findings', 'strengths', 'limits'],
			'UI review receipt',
		);
		const {subject, nodesByScene} = this._observe(inputs);
		if (!isDeepStrictEqual(receipt.subject, subject))
			throw new Error('UI review subject is stale or outside assignment');
		if (receipt.reviewerAgentId !== inputs.reviewerAgentId)
			throw new Error('Receipt reviewer identity differs from assignment');
		if (!['pass', 'revise'].includes(receipt.verdict)) throw new Error('Invalid UI review verdict');
		const inspected = this._strings(receipt.inspectedScreenshotRefs, 'inspectedScreenshotRefs');
		if (
			inspected.some((ref) => !subject.screenshots.some((shot) => shot.ref === ref)) ||
			subject.requiredScreenshotRefs.some((ref) => !inspected.includes(ref))
		)
			throw new Error('Required actual screenshots were not all inspected');
		if (!Array.isArray(receipt.findings)) throw new Error('UI review findings must be an array');
		for (const finding of receipt.findings) {
			this._object(finding, ['sceneRef', 'nodeRef', 'severity', 'issue', 'requiredOutcome'], 'UI review finding');
			if (
				!subject.requiredSceneRefs.includes(finding.sceneRef) ||
				(finding.nodeRef !== undefined && !nodesByScene.get(finding.sceneRef)?.has(finding.nodeRef)) ||
				!['blocking', 'advisory'].includes(finding.severity) ||
				typeof finding.issue !== 'string' ||
				!finding.issue.trim() ||
				typeof finding.requiredOutcome !== 'string' ||
				!finding.requiredOutcome.trim()
			)
				throw new Error('Invalid scoped UI review finding');
		}
		this._strings(receipt.strengths, 'strengths', false);
		this._strings(receipt.limits, 'limits', false);
		if (receipt.verdict === 'pass' && receipt.findings.some((finding) => finding.severity === 'blocking'))
			throw new Error('Passing UI review cannot contain blocking findings');
		return structuredClone(receipt);
	}

	/** Call this method before accepting a visual gate; revise remains an explicit block.
	 *
	 * @param {DesignUiReviewReceipt} receipt - Saved independent reviewer judgment.
	 * @param {DesignUiReviewInputs} inputs - Fresh actual file and assignment observations.
	 * @returns {DesignUiReviewReceipt} - Exact validated passing receipt.
	 */
	requirePassing(receipt, inputs) {
		const validated = this.validate(receipt, inputs);
		if (validated.verdict !== 'pass') throw new Error('Independent UI review requires revision');
		return validated;
	}
}
