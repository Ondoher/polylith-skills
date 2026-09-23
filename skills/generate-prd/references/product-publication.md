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

## Producer boundary

The upstream refinement workflow validates authoring sources through their owning current validators, packages logical documents with this contract, persists resource descriptors and bytes, and creates the manifest only after its selected dependencies exist. UI and component packages bind the exact UX and design-language revisions they consume; component replacement also binds the applicable UI composition.

The resulting detached package is `contexts/prd/<material-sha256>/context.json` plus only its selected hash-verified resource bytes in the sibling `artifact-resources/` directory. `generate-prd` starts at this boundary. It does not expose proposal or persistence commands, and publication needs neither the original product store nor structured source directories.
