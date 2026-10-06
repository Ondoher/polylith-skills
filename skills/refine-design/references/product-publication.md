# Structured publication artifacts

These packages supply UX, design-language, UI, component, and asset sources
to the current product-document collection. Product-only and UX-only contexts
remain useful refinement outputs; final PRD generation waits for the current
UI pass and its manifest. Selected inline UI comps require a current bound
package and its resource descriptors. The
`generate-prd` document-structure agent, not this producer, chooses document
and page placement.

The producer packages current validated structured sources for a downstream PRD publisher. It makes no design decisions and never accepts product prose. There is one current contract per artifact kind:

| Artifact kind      | Version | Logical document                                                                           |
| ------------------ | ------- | ------------------------------------------------------------------------------------------ |
| `ux-design`        | `0.4`   | Current UX document                                                                        |
| `design-language`  | `0.14`  | Exactly `{designLanguage,reviewLayout}`, with design schema 0.14 and layout version 7      |
| `ui-composition`   | `0.4`   | Current UI composition; required for operational PRD generation                            |
| `component-design` | `0.4`   | Current component design; repeatable                                                       |
| `ui-capture`       | `1.0`   | Exact independently reviewed PNGs, reviewed render resources and canonical source bindings |
| `prd-publication`  | `1.1`   | Operational publication manifest selecting reviewed captures                               |

These names are reserved: they always require their exact current package and schema. Generic artifacts use other kind names; omitted encoding and obsolete versions are not alternate forms of these kinds.

The JSON payload is exactly `{encoding:'json',mediaType:'application/json',document}`. The compressed payload is exactly `{encoding:'gzip-base64',mediaType:'application/json',compression:'gzip',chunks,compressedBytes,compressedSha256,decodedBytes,decodedSha256}`. The document is canonical compact UTF-8 JSON with recursively sorted object keys. Compression uses deterministic gzip. Each nonempty canonical-base64 chunk is at most 32,768 characters and divisible by four; every nonfinal chunk is exactly 32,768 characters. Concatenated chunks must also be canonical base64. Validate compressed bytes and hash, bounded decompression, decoded bytes and hash, strict UTF-8, canonical JSON, then the current kind/schema. There is no `data` wrapper or compatibility reader. Limits remain 8 MiB decoded per artifact, 16 MiB decoded per context, and 2 MiB for persisted context JSON.

Resources are first-class artifact-envelope fields, never hidden in a payload. Every envelope requires `resources`, even when empty. The closed descriptor is `{id,logicalPath,path,mediaType,byteLength,sha256}`. Resource IDs are stable artifact-local IDs; logical paths bind exactly to declared image asset paths and metadata. Content-addressed paths use `artifact-resources/<sha256>.<canonical-extension>`. Supported images are PNG/png, JPEG/jpg, WebP/webp and SVG/svg. Exact reviewed render dependencies additionally support UTF-8 HTML/html, CSS/css, plain text/txt, TTF/ttf and WOFF2/woff2; declare each through `ui-capture.renderFiles`. All resources are bounded to 20 MiB each and 64 MiB deduplicated aggregate. Reject links, unsafe paths, undeclared assets, conflicting identities and type/size/hash mismatches.

The operational manifest requires JSON encoding and no resources. Its logical document is exactly `{schemaVersion:'1.1',uxArtifactId,designLanguageArtifactId,uiArtifactId,componentArtifactIds,uiCaptureArtifactId}`. The UI and capture IDs are required and non-null. Component IDs are unique and retain declared publication order. All role IDs are distinct, and the manifest's direct artifact dependencies are exactly those IDs with current revision/material bindings. The older schema 1.0 without a capture role remains readable for intermediate inspection packages, including `uiArtifactId: null`; it does not satisfy operational PRD readiness. No manifest selects product-only refinement output; one selects rich output; multiple are an error.

Create `ui-capture` only through [reviewed capture export](ui-capture.md#review-and-package) after an actual independent native UI pass. Its closed document is `{schemaVersion,sources,review,renderFiles,assets,screenshots}`. It binds canonical UI/UX/foundation/component hashes, the exact independent review subject and reviewer/author identities, all inspected clean/annotated images, and the non-report HTML/CSS/font/asset resources. Each `renderFiles` entry is exactly `{id,path,mimeType,sha256}` and binds a first-class content-addressed envelope resource; the payload contains no embedded binary bytes. Its image resources use the same content-addressed envelope rules. Capture metadata is publication evidence and is excluded from the product information outline. Prepared-wireframe review retains its existing mandatory gate and cannot use native export as an acceptance substitute.

## Proposal helper

For several artifacts, use [the refinement assembler](refinement-cycle.md#assembly-and-recovery)
to order and commit these same requests, report repair needs, and continue
independent units. For an individual artifact, run the helper below and commit
its dependencies first:

```text
node scripts/product-publication-proposals.mjs --current <product-root/current.json> --input <request.json> --source-root <structured-source-root> [--asset-root <approved-image-root>] --output <proposal-package/proposal.json>
```

The closed request has `id`, `artifactKind`, `status`, `scopeRefs`, `coverageRefs`, `gapRefs`, `lockRefs`, `artifactDependencyIds`, `encoding`, `sources`, and `publication`. Scope and gap decisions are caller inputs; the helper obtains their exact current record hashes. `sources` contains only the applicable safe relative `ux`, `designLanguage`, `reviewLayout`, `ui`, `component`, and `capture` paths. `publication` is null except for a manifest, where it contains the exact manifest document and `sources` is empty. UX uses `ux`; design language uses `designLanguage` and `reviewLayout`; UI uses `ux`, `designLanguage`, and `ui`; a component uses `ux`, `designLanguage`, and `component`, optionally `ui` for exact replacement registration validation. A capture uses only `capture`, pointing to the freshly exported `capture.json`, with its export directory as `assetRoot` inside the explicit source root.

A `ui-capture` request depends on exactly one current UX, foundation and UI artifact plus each component rendered in those surface scenes. The producer verifies that their canonical documents match the exported package. Commit those artifacts first, then commit the capture package, then the schema 1.1 manifest selecting all of them. Detached PRD context resolution copies the hash-bound PNG resources; publication verifies and copies the exact reviewed renderer resources and image hashes/dimensions, and never launches a browser.

UI and component requests identify exactly one UX artifact dependency and one design-language dependency. Their source documents must match the dependency packages exactly. A supplied component UI source likewise requires its exact current UI artifact dependency. The helper validates sources through their current owning validators, encodes the logical document, and writes the proposal alongside verified resource files. It reports the exact base snapshot hash and resource root for `product-artifact-store.mjs --resource-root`. It does not commit the proposal or override lock authority.

After the required artifacts and manifest are committed, `product-context.mjs` emits `contexts/prd/<material-sha256>/context.json` plus only the selected hash-verified resources in its sibling `artifact-resources/`. The complete directory is the self-contained detached context package. Publication needs neither the original product store nor structured source directories.
