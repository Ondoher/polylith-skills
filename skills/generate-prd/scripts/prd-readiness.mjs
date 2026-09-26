import {decodePublicationDocument} from './product-publication-payload.mjs';

function fail(message) { throw new Error(message); }

/** Check that refinement completed a source-bound UI pass before PRD work. */
export function assertUiPass(context, plan = null) {
  const manifest = context.artifacts.find(artifact => artifact.artifactKind === 'prd-publication');
  if (!manifest) fail('Product document generation requires a current UI publication handoff from refine-design');
  const selection = decodePublicationDocument(manifest.payload).document;
  const ux = context.artifacts.find(artifact => artifact.id === selection.uxArtifactId);
  const ui = context.artifacts.find(artifact => artifact.id === selection.uiArtifactId);
  if (!ux || ux.artifactKind !== 'ux-design' || ux.artifactSchemaVersion !== '0.3'
    || !ui || ui.artifactKind !== 'ui-composition' || ui.artifactSchemaVersion !== '0.3') {
    fail('Product document generation requires current UX 0.3 and UI composition 0.3 artifacts');
  }
  const uxSpec = decodePublicationDocument(ux.payload).document;
  const spec = decodePublicationDocument(ui.payload).document;
  if (spec.schemaVersion !== '0.3' || spec.uxArtifactBinding?.id !== uxSpec.id
    || !Array.isArray(spec.scenes) || !spec.scenes.length) {
    fail('Product document generation requires source-bound UI scenes from the current UI pass');
  }
  if (plan) {
    const selected = new Set(plan.documents.flatMap(document => document.pages.flatMap(page => page.compRefs)));
    for (const scene of spec.scenes) {
      const ref = `artifact:${ui.id}#/scenes/${scene.id}`;
      const requests = (spec.renderRequests ?? []).filter(request => request.sceneRef === scene.id);
      if (!selected.has(ref) && !requests.some(request => selected.has(`artifact:${ui.id}#/renderRequests/${request.id}`))) {
        fail(`The structure plan omits the current UI scene ${scene.id}`);
      }
    }
  }
}
