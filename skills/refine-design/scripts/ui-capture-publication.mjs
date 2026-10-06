import {reviewedRenderMediaType} from './publication-resource-media.mjs';
import {createHash} from 'node:crypto';
import {canonicalPublicationJson, validatePublicationLogicalPath} from './product-publication-payload.mjs';
import {UiParts} from './ui-parts.mjs';

/** Preserve partial/placeholder labels using the same exact replacement contract as the renderer.
 * @param {object} scene - Materialized scene tree.
 * @param {object} ui - Materialized UI specification.
 * @param {object[]} components - Exact component documents in the captured surface.
 * @returns {'comp' | 'wireframe'} - Honest illustration classification.
 */
export function captureArtifactKind(scene, ui, components = []) {
	let unresolved = false;
	const visit = (node) => {
		if (node.kind === 'region') return node.children.forEach(visit);
		if (!node.placeholder) return;
		const template = ui.templates.find((item) => item.id === node.templateRef.id);
		if (
			!components.some(
				(component) =>
					component.artifactKind === 'comp' &&
					component.componentTemplate.replacesTemplateRef.id === template?.id &&
					component.componentTemplate.replacesTemplateRef.version === template?.version &&
					component.componentTemplate.supportedStates.includes(node.state),
			)
		)
			unresolved = true;
	};
	if (scene.root) visit(scene.root);
	return scene.completeness === 'partial' || unresolved ? 'wireframe' : 'comp';
}

/** Hash structured meaning independently of JSON whitespace and property order.
 * @param {object} document - Validated structured source.
 * @returns {string} - Lowercase SHA-256 digest.
 */
export function captureDocumentHash(document) {
	return createHash('sha256').update(canonicalPublicationJson(document)).digest('hex');
}

function closed(value, keys, label) {
	if (
		!value ||
		typeof value !== 'object' ||
		Array.isArray(value) ||
		Object.keys(value).length !== keys.length ||
		keys.some((key) => !Object.hasOwn(value, key))
	)
		throw new Error(`${label} must contain exactly ${keys.join(', ')}`);
}

/** Validate the portable image package against the exact structured design.
 * The producer has already validated the independent pass against local observations;
 * this package preserves that judgment and all image identities for detached consumers.
 * @param {UiCapturePublication} document - Closed reviewed-image package.
 * @param {UiCapturePublicationSources} [sources] - Exact current design authorities.
 * @returns {UiCapturePublication} - Validated package, without mutation.
 */
export function validateCapturePublication(document, sources) {
	closed(
		document,
		['schemaVersion', 'sources', 'review', 'renderFiles', 'assets', 'screenshots'],
		'UI capture publication',
	);
	if (document.schemaVersion !== '1.0') throw new Error('UI capture publication requires schema 1.0');
	if (!Array.isArray(document.renderFiles) || !document.renderFiles.length || document.renderFiles.length > 10000)
		throw new Error('Reviewed capture requires rendered file identities');
	const renderPaths = new Set();
	for (const file of document.renderFiles) {
		closed(file, ['id', 'path', 'sha256', 'mimeType'], 'Capture rendered file');
		validatePublicationLogicalPath(file.path);
		if (renderPaths.has(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256))
			throw new Error('Invalid capture rendered file identity');
		if (file.mimeType !== reviewedRenderMediaType(file.path) || !/^render-[1-9][0-9]*$/.test(file.id))
			throw new Error('Invalid reviewed rendered resource');
		renderPaths.add(file.path);
	}
	closed(document.sources, ['ui', 'ux', 'designLanguage', 'components'], 'Capture source bindings');
	for (const key of ['ui', 'ux', 'designLanguage'])
		if (!/^[a-f0-9]{64}$/.test(document.sources[key])) throw new Error('Invalid capture source digest');
	if (
		!Array.isArray(document.sources.components) ||
		document.sources.components.some((item) => !/^[a-f0-9]{64}$/.test(item))
	)
		throw new Error('Invalid capture component bindings');
	closed(
		document.review,
		['subjectSha256', 'reviewerAgentId', 'authorAgentIds', 'verdict', 'inspectedScreenshotRefs'],
		'Capture review',
	);
	if (
		!/^[a-f0-9]{64}$/.test(document.review.subjectSha256) ||
		typeof document.review.reviewerAgentId !== 'string' ||
		!document.review.reviewerAgentId ||
		document.review.verdict !== 'pass' ||
		!Array.isArray(document.review.authorAgentIds) ||
		!document.review.authorAgentIds.length ||
		document.review.authorAgentIds.some(
			(id) => typeof id !== 'string' || !id || id === document.review.reviewerAgentId,
		) ||
		new Set(document.review.authorAgentIds).size !== document.review.authorAgentIds.length ||
		!Array.isArray(document.review.inspectedScreenshotRefs) ||
		new Set(document.review.inspectedScreenshotRefs).size !== document.review.inspectedScreenshotRefs.length
	)
		throw new Error('UI capture publication requires a recorded independent pass');
	if (
		!Array.isArray(document.assets) ||
		!Array.isArray(document.screenshots) ||
		!document.screenshots.length ||
		document.screenshots.length !== document.assets.length ||
		document.screenshots.length > 10000
	)
		throw new Error('UI capture publication requires exactly one image per screenshot');
	const refs = new Set(),
		outputs = new Set(),
		paths = new Set();
	for (const shot of document.screenshots) {
		closed(
			shot,
			['ref', 'sceneRef', 'renderOutput', 'variant', 'artifactKind', 'path', 'width', 'height'],
			'Published screenshot',
		);
		for (const key of ['ref', 'sceneRef'])
			if (typeof shot[key] !== 'string' || !shot[key] || shot[key].length > 200)
				throw new Error('Invalid screenshot identity');
		validatePublicationLogicalPath(shot.renderOutput);
		validatePublicationLogicalPath(shot.path);
		if (
			!shot.path.startsWith('captures/') ||
			!shot.path.endsWith('.png') ||
			!['clean', 'annotated'].includes(shot.variant) ||
			!['comp', 'wireframe'].includes(shot.artifactKind) ||
			refs.has(shot.ref) ||
			outputs.has(shot.renderOutput) ||
			paths.has(shot.path) ||
			[shot.width, shot.height].some((size) => !Number.isSafeInteger(size) || size < 1 || size > 16384) ||
			!document.review.inspectedScreenshotRefs.includes(shot.ref)
		)
			throw new Error('Uninspected or duplicate published screenshot');
		refs.add(shot.ref);
		outputs.add(shot.renderOutput);
		paths.add(shot.path);
		const asset = document.assets.find((item) => item.path === shot.path);
		closed(asset, ['id', 'kind', 'path', 'mimeType', 'sha256'], 'Screenshot image asset');
		if (asset.kind !== 'image' || asset.mimeType !== 'image/png' || !/^[a-f0-9]{64}$/.test(asset.sha256))
			throw new Error('Screenshot publication requires PNG image assets');
	}
	if (sources) {
		for (const key of ['ui', 'ux', 'designLanguage'])
			if (captureDocumentHash(sources[key]) !== document.sources[key])
				throw new Error(`Stale reviewed ${key} screenshots`);
		if (
			canonicalPublicationJson((sources.components ?? []).map(captureDocumentHash).sort()) !==
			canonicalPublicationJson(document.sources.components)
		)
			throw new Error('Stale reviewed component screenshots');
		if (sources.ui.renderRequests.length !== document.screenshots.length)
			throw new Error('Reviewed screenshots must cover every render request');
		const ui = UiParts.materialize(sources.ui);
		for (const request of ui.renderRequests)
			if (
				!document.screenshots.some(
					(shot) =>
						shot.renderOutput === request.output &&
						shot.sceneRef === request.sceneRef &&
						shot.variant === request.variant &&
						shot.artifactKind ===
							captureArtifactKind(
								ui.scenes.find((scene) => scene.id === request.sceneRef),
								ui,
								sources.components ?? [],
							),
				)
			)
				throw new Error(`Missing reviewed screenshot for ${request.id}`);
	}
	return document;
}

/** Render an accessible inline illustration using the previously inspected image.
 * @param {object} scene - Current scene with name, state and completeness.
 * @param {UiCapturePublication} document - Validated package.
 * @returns {string} - Figure with full-size PNG, HTML and annotated links.
 */
export function renderReviewedCapture(scene, document) {
	const esc = (value) =>
		String(value).replace(
			/[&<>"']/g,
			(character) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[character],
		);
	const clean = document.screenshots.find((shot) => shot.sceneRef === scene.id && shot.variant === 'clean');
	if (!clean) throw new Error(`No clean reviewed screenshot for ${scene.id}`);
	const kind = clean.artifactKind === 'wireframe' ? 'partial UI wireframe' : 'UI comp';
	const annotated = document.screenshots.find((shot) => shot.sceneRef === scene.id && shot.variant === 'annotated');
	return `<figure class="prd-reviewed-capture"><a href="${esc(clean.path)}"><img src="${esc(clean.path)}" alt="${esc(`${scene.name}: ${scene.stateRef} (${kind})`)}" width="${clean.width}" height="${clean.height}" loading="lazy"></a><figcaption>${esc(scene.name)} · ${esc(scene.stateRef)} · ${kind}. <a href="${esc(clean.path)}">Full-size image</a> · <a href="${esc(clean.renderOutput)}">Saved HTML</a>${annotated ? ` · <a href="${esc(annotated.path)}">Annotated image</a> · <a href="${esc(annotated.renderOutput)}">Annotated HTML</a>` : ''}</figcaption></figure>`;
}
