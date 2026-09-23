# Structured publication artifacts

The producer packages current validated structured sources for a downstream PRD publisher. It makes no design decisions and never accepts product prose. There is one current contract per artifact kind:

| Artifact kind | Version | Logical document |
| --- | --- | --- |
| `ux-design` | `0.2` | Current UX document |
| `design-language` | `0.14` | Exactly `{designLanguage,reviewLayout}`, with design schema 0.14 and layout version 7 |
| `ui-composition` | `0.2` | Current UI composition; optional |
| `component-design` | `0.2` | Current component design; repeatable |
| `prd-publication` | `1.0` | Explicit publication manifest |

These names are reserved: they always require their exact current package and schema. Generic artifacts use other kind names; omitted encoding and obsolete versions are not alternate forms of these kinds.

The JSON payload is exactly `{encoding:'json',mediaType:'application/json',document}`. The compressed payload is exactly `{encoding:'gzip-base64',mediaType:'application/json',compression:'gzip',chunks,compressedBytes,compressedSha256,decodedBytes,decodedSha256}`. The document is canonical compact UTF-8 JSON with recursively sorted object keys. Compression uses deterministic gzip. Each nonempty canonical-base64 chunk is at most 32,768 characters and divisible by four; every nonfinal chunk is exactly 32,768 characters. Concatenated chunks must also be canonical base64. Validate compressed bytes and hash, bounded decompression, decoded bytes and hash, strict UTF-8, canonical JSON, then the current kind/schema. There is no `data` wrapper or compatibility reader. Limits remain 8 MiB decoded per artifact, 16 MiB decoded per context, and 2 MiB for persisted context JSON.

Resources are first-class artifact-envelope fields, never hidden in a payload. Every envelope requires `resources`, even when empty. The closed descriptor is `{id,logicalPath,path,mediaType,byteLength,sha256}`. Resource IDs are stable artifact-local IDs; logical paths bind exactly to declared image asset paths and metadata. Content-addressed paths use `artifact-resources/<sha256>.<canonical-extension>`. Supported types are PNG/png, JPEG/jpg, WebP/webp and SVG/svg, bounded to 20 MiB each and 64 MiB deduplicated aggregate. Reject links, unsafe paths, undeclared assets, conflicting identities and type/size/hash mismatches.

The manifest requires JSON encoding and no resources. Its logical document is exactly `{schemaVersion:'1.0',uxArtifactId,designLanguageArtifactId,uiArtifactId,componentArtifactIds}`. `uiArtifactId` is null when absent; component IDs are unique and retain declared publication order. Components require a UI artifact. All role IDs are distinct, and the manifest's direct artifact dependencies are exactly those IDs with current revision/material bindings. No manifest selects product-only publication; one selects full publication; multiple are an error.

## Proposal helper

Run the same helper once for each artifact, committing dependencies before dependent artifacts:

```text
node scripts/product-publication-proposals.mjs --current <product-root/current.json> --input <request.json> --source-root <structured-source-root> [--asset-root <approved-image-root>] --output <proposal-package/proposal.json>
```

The closed request has `id`, `artifactKind`, `status`, `scopeRefs`, `coverageRefs`, `gapRefs`, `lockRefs`, `artifactDependencyIds`, `encoding`, `sources`, and `publication`. Scope and gap decisions are caller inputs; the helper obtains their exact current record hashes. `sources` contains only the applicable safe relative `ux`, `designLanguage`, `reviewLayout`, `ui`, and `component` paths. `publication` is null except for a manifest, where it contains the exact manifest document and `sources` is empty. UX uses `ux`; design language uses `designLanguage` and `reviewLayout`; UI uses `ux`, `designLanguage`, and `ui`; a component uses `ux`, `designLanguage`, and `component`, optionally `ui` for exact replacement registration validation.

UI and component requests identify exactly one UX artifact dependency and one design-language dependency. Their source documents must match the dependency packages exactly. A supplied component UI source likewise requires its exact current UI artifact dependency. The helper validates sources through their current owning validators, encodes the logical document, and writes the proposal alongside verified resource files. It reports the exact base snapshot hash and resource root for `product-artifact-store.mjs --resource-root`. It does not commit the proposal or override lock authority.

After the required artifacts and manifest are committed, `product-context.mjs` emits `contexts/prd/<material-sha256>/context.json` plus only the selected hash-verified resources in its sibling `artifact-resources/`. The complete directory is the self-contained detached context package. Publication needs neither the original product store nor structured source directories.
