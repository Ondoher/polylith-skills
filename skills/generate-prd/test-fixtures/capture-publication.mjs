import {createHash} from 'node:crypto';
import {captureDocumentHash, captureArtifactKind} from '../scripts/ui-capture-publication.mjs';
import {UiParts} from '../scripts/ui-parts.mjs';

/** Deterministic transport fixture; tiny PNGs and reviewer labels are not live UI evidence. */
export function capturePublicationFixture({ui, ux, designLanguage, bytes, components = []}) {
	const sha256 = createHash('sha256').update(bytes).digest('hex');
	const view = UiParts.materialize(ui);
	const screenshots = ui.renderRequests.map((request) => ({
		ref: request.id,
		sceneRef: request.sceneRef,
		renderOutput: request.output,
		variant: request.variant,
		artifactKind: captureArtifactKind(
			view.scenes.find((scene) => scene.id === request.sceneRef),
			view,
			components,
		),
		path: `captures/${request.id}.png`,
		width: 1,
		height: 1,
	}));
	return {
		schemaVersion: '1.0',
		renderFiles: ui.renderRequests.map((request, index) => ({
			id: `render-${index + 1}`,
			path: request.output,
			mimeType: 'text/html',
			sha256: createHash('sha256').update('mock HTML for transport only').digest('hex'),
		})),
		sources: {
			ui: captureDocumentHash(ui),
			ux: captureDocumentHash(ux),
			designLanguage: captureDocumentHash(designLanguage),
			components: components.map(captureDocumentHash).sort(),
		},
		review: {
			subjectSha256: 'a'.repeat(64),
			reviewerAgentId: 'mock-reviewer-for-transport-tests',
			authorAgentIds: ['mock-author-for-transport-tests'],
			verdict: 'pass',
			inspectedScreenshotRefs: screenshots.map((shot) => shot.ref),
		},
		assets: screenshots.map((shot, index) => ({
			id: `capture-${index + 1}`,
			kind: 'image',
			path: shot.path,
			mimeType: 'image/png',
			sha256,
		})),
		screenshots,
	};
}
