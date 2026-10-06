# Persistent UI capture promotion

Promoted: 5 October 2026, following the owner's instruction to make the tested
approach the real flow. The [experiment readiness](persistent-ui-capture-readiness.md)
retains its original timing and independent-review evidence. Maintained operating
instructions are [persistent capture and reviewed-image publication](../../skills/refine-design/references/ui-capture.md).

## Maintained behavior

1. Render structured UI into saved local clean and annotated HTML.
2. Capture the batch with pinned `puppeteer-core` and an installed Chromium browser.
   Reuse one browser and create a fresh page for each request. Verify local input
   hashes, positive font/image readiness, viewports and PNG dimensions; persist
   evidence and resume unchanged successful outputs without recapture.
3. Obtain the existing exact independent UI pass over every required image.
   A successful capture does not accept the design.
4. Export the exact inspected PNGs and reviewed HTML/CSS/font/asset bytes into
   a portable `ui-capture` 1.0 artifact with first-class content-addressed resources.
   Select it with the operational `prd-publication` 1.1 manifest.
5. Embed the reviewed clean PNG in its product document with state captions,
   alternative text and full-size/annotated image and saved HTML links.
   Publication verifies and copies the reviewed bytes without launching a browser.
   Semantic UX wireframes retain native HTML.

The lower inspection renderer may show a capture-pending notice. Operational PRD
publication requires the reviewed capture handoff; older schema 1.0 manifests
need a new capture package and schema 1.1 selection before final publication.
No global installation, commit or push is included in this promotion unit.

## Evidence

- Real maintained-worker batch: 14/14 captures succeeded. Reopening the exact
  batch reused all 14 images and captured zero new images.
- Installed-browser fault/recovery suite: 2/2 tests passed, including positive
  font/image readiness, blocked remote assets, stale inputs, timeout, exact owned
  process termination, recovery and deliberately hung browser shutdown.
- Final publication, transport, renderer and schema regression suite: 42 tests passed; the optional installed-browser case was covered by the separate live suite. An additional 47 pipeline/MCP integration tests passed. Exact reviewed renderer
  resources and PNGs survived detached context resolution and repeated publication.
  Stale structured sources and damaged resource identities were rejected.
- Independent forward test of the final documented handoff: two exports matched
  across 71 files; all 21 reviewed render resources and all 14 original inspected
  PNGs matched their original bytes. All 35 content-addressed resources passed
  their hash checks. Two 42-file previews matched exactly. Browser inspection
  of all 18 HTML pages found no failed requests, page errors, broken file links,
  missing local anchors, unloaded images after scrolling or unlabeled images.
- Both updated skills passed the skill-creator structural validator.

The independent forward test reused the existing actual passing native UI receipt
and original inspected images. It did not invent a new review or use capture
success as approval for newly generated images. Synthetic transport fixtures use
explicit mock judgments solely for contract tests.

## Refinements found during promotion

Canonical publication storage sorts JSON properties. Regenerating CSS from the
same design can therefore produce different bytes. The final handoff preserves
reviewed HTML/CSS/fonts as first-class resources instead of regenerating them.
An interim embedded-base64 approach failed the existing publication text limits
and was replaced; no payload limit was broadened.

Browser shutdown now bounds graceful close, retires only the exact worker-owned
child process when needed, and observes its exit. Failure to observe exit leaves
an uncertain worker retired rather than declaring cleanup successful. Requests
and cleanup retain operation deadlines; overall work continues while progressing.

All raw synthetic runs, failures and forward-test records remain temporary under
`.codex-tmp/capture-promotion/` and `.codex-tmp/persistent-ui-capture/`.
The original experiment measured a 72.4% median capture-batch saving from browser
reuse on one Windows host. Publication reuse and end-to-end design time were not
newly benchmarked here. The agent-preparation acceptance gate and deferred
state/treatment/assembly exploration remain separate work.
