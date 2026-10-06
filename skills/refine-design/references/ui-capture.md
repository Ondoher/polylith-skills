# Persistent UI capture and reviewed-image publication

This is the maintained capture path. Render the structured UI into saved local
HTML/CSS first, then capture all required clean and annotated variants with
`scripts/ui-capture-batch.mjs`. One installed Chromium browser serves a serial
batch; each request gets a fresh page. The worker closes at the end of the batch.
No browser download, model session, global service or application implementation
is part of capture.

## Capture

Save a capture configuration in the owning product run:

```json
{
  "executablePath": "<absolute installed Edge or Chrome executable>",
  "sourceRoot": "<absolute product or temporary experiment root>",
  "runRoot": "<absolute new capture-run directory beneath sourceRoot>",
  "renderBasePath": "<root-relative directory containing the saved UI render>",
  "uiPath": "<root-relative current UI JSON>",
  "uxPath": "<root-relative accepted UX JSON>",
  "designLanguagePath": "<root-relative design-language JSON>",
  "requiredFonts": ["<each local font family required by these scenes>"],
  "timeoutMs": 20000,
  "cleanupMs": 2000
}
```

Create `runRoot` before invoking the tool. An empty `renderBasePath` means
`sourceRoot` itself. Roots must be explicit, confined directories without links;
the source root must contain the run. Use `product/<name>/runs/<run>/captures/`
in an application. Repository experiments use `.codex-tmp/<task>/<run>/` only.
The installer restores pinned `puppeteer-core` with `npm ci --ignore-scripts`;
configure an already installed browser rather than downloading one.

```text
node scripts/ui-capture-batch.mjs <capture-config.json>
```

The batch derives requests and asset identities from the current UI render
report and design-language asset outputs. It verifies source hashes, rejects
undeclared resource requests and external URLs, waits for required local fonts,
stylesheet loading, image decoding and two settled animation frames, and freezes
animations/transitions/carets. Captures use device scale 1 and the existing
minimum 1440 × 900 review viewport, enlarged for a larger scene. Do not substitute
a different viewport silently; inspect the entire scene, including annotated
content, and request an explicit larger capture if needed.

`capture-results.json`, worker lifecycle logs, PNGs and `render-evidence.json`
stay in the run. Evidence is published only after every request succeeds and
browser shutdown has completed. Resume the same configuration to reuse completed
images after verifying input and PNG hashes. Changed inputs or changed saved
images require a new capture run. Never overwrite an inspected PNG. A repair gets
new source-bound images and a new independent review; an old passing receipt does
not carry forward to repaired output.

Per-operation deadlines remain bounded. A deadline, browser failure or resource
failure produces no successful image and retires the affected browser. Shutdown
observes the exact owned child exiting; a close deadline triggers disconnection
and termination of that owned child. An unobserved exit is a failure, not a clean
shutdown. Estimated whole-task timings are progress checkpoints: continue useful
work, and change approach or stop when meaningful progress has ceased.

For an orchestrator that keeps a capture process open, run
`node scripts/UiCapture.mjs <worker-config.json>`. It accepts one JSON capture request per stdin line and returns
one result per line. The public request/options/result contracts are in
`scripts/types.d.ts`. Send `{"id":"shutdown","command":"shutdown"}` or end
stdin to close it. It accepts saved HTML and explicit byte identities, not
arbitrary remote URLs or HTML strings. Keep requests serial and own its shutdown.

## Review and package

Use the batch's `render-evidence.json` as `DesignUiReviewInputs.renderEvidencePath`.
Preserve the existing exact UX pass, independent reviewer assignment, required
scene/image scope, source and support bindings. Include `componentPaths` when
resolved component documents appear in the surface render. Independent UI review
must inspect every required image and pass the current exact subject before
acceptance. Capture success itself is not visual approval. Prepared-wireframe
runs retain their existing mandatory acceptance route; native review/export
cannot replace that gate.

After the native gate passes, export its saved inputs and original receipt:

```text
node scripts/ui-reviewed-capture.mjs <review-inputs.json> <passing-receipt.json> <new-package-root-under-sourceRoot>
```

The exporter freshly validates the pass and copies the exact inspected PNGs.
It writes `capture.json`, logical `captures/*.png`, and content-addressed resource
files. The document binds canonical UI, UX, design-language and resolved component
meaning, exact non-report HTML/CSS/font/asset resources, independent reviewer/author
identities, inspection coverage and honest comp/wireframe classifications.

Package `capture.json` as a `ui-capture` schema 1.0 artifact with the existing
[publication producer](product-publication.md), using `sources.capture`, the
export root as `assetRoot`, and exact current UX, foundation, UI and applicable
component artifact dependencies. Publish the manifest as schema 1.1 with
`uiCaptureArtifactId` alongside its other role IDs. The manifest depends directly
on the selected capture artifact as well as every selected structured artifact.

Operational `generate-prd` requires this handoff. It verifies canonical source
bindings, complete variant coverage, current rendered-byte identities and PNG
resource hashes/dimensions before writing. It preserves reviewed HTML/CSS/fonts as first-class content-addressed resources rather than regenerating their bytes from re-encoded JSON. It copies reviewed images into each
owning document, with a clean inline image, meaningful alternative text, state
caption, full-size PNG link and saved clean/annotated HTML/image links. It never
launches a browser or recaptures images during publication. Semantic grayscale
UX wireframes remain native HTML. Detailed UI illustrations use the reviewed
PNGs; their text is also available through the source-backed narrative and saved
HTML, since pixels do not provide selectable or reflowing interface text.

The lower-level PRD renderer accepts `--capture <capture.json>` and an optional
`--capture-asset-root <root>`. Without the package it can produce inspection HTML
with a capture-pending notice; that output does not satisfy operational PRD
readiness. Preserve partial and unresolved component labels outside the canvas.

## Verification and limits

Run `npm run test:capture` for the maintained contract/recovery suite. Set
`UI_CAPTURE_BROWSER` to an installed Chromium executable to enable its actual
browser cases, including font/image readiness, warm reuse, blocked resources,
changed input, crash recovery, request deadlines and deliberately hung shutdown.
Publication and collection tests cover exact image reuse and fail-closed inputs.

The [experiment](../../../planning/implementation-agents/persistent-ui-capture-readiness.md)
measured a 72.4% median batch reduction for browser reuse on one Windows host.
That is capture timing evidence, not a general or end-to-end speed guarantee.
Documentation image reuse has no separate measured time-saving claim. Concurrent
pages, arbitrary HTML strings and a shared always-on service remain outside this
flow. Proactive agent preparation and state/treatment/assembly remain separate
workstreams with their existing gates.
