# Repository Standards Overlay

## REPLACE: Standalone tooling module extensions

Replaces: code-conventions.md#JavaScript And Module Shape
Scope: repository
Rule: For this repository's standalone Node helper and test modules, use JavaScript ESM with explicit .mjs runtime imports. Preserve .js and .jsx where the scaffold or host contract selects them. Retain every other obligation in the canonical JavaScript And Module Shape section, including indentation, naming, module ownership and parameter conventions.
Reason: Existing public CLI paths and the package's module-loading behavior use .mjs; configuring standards must not rename those interfaces or change host loading.

## ADD: Tooling test runner

Extends: testing.md#Purpose And Lanes
Scope: repository
Rule: Run this repository's standalone helper and installer tests with Node's built-in node:test runner through the existing named package scripts. Keep scaffold component and transport tests on their generated application's declared runner. Preserve the canonical behavior, determinism, cleanup, fixture and coverage requirements.
Reason: These are established toolchain contracts for maintained tooling and generated templates, not a new exploratory application.
