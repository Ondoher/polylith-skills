# TypeScript Conventions

## Purpose And Applicability

<!-- rule: TYPESCRIPT-001 -->

This document owns TypeScript source contracts, type placement, callable documentation, compiler configuration, and verification. Select it explicitly in the folder standards manifest for TypeScript-owned source. Selection does not authorize a language migration; project foundation records deliberate TypeScript adoption and the supported execution path.

<!-- rule: TYPESCRIPT-002 -->

Apply this document alongside code conventions and the applicable architecture, React, persistence, transport, and testing standards. Naming, module cohesion, class-owned support, ingress validation, failure policy, presentation boundaries, styling ownership, lifecycle cleanup, and behavioral testing retain their existing obligations. JavaScript type placement and JSDoc typing remain governed by [types](types.md) and [JSDoc](jsdoc.md) for JavaScript/JSX implementations in mixed projects.

<!-- rule: TYPESCRIPT-003 -->

The contracts-reviewer lane owns this standard. Other lanes retain their assigned architecture, UI, security, and testing standards. Repository and folder-specific differences belong in the standards overlay, following normal ADD and REPLACE precedence.

## Sources And Module Shape

<!-- rule: TYPESCRIPT-004 -->

Use ESM and `.ts` sources, with `.tsx` for sources containing JSX. Preserve shared filename and ownership conventions; examples such as `consts.js`, `controller.js`, and `AppShell.jsx` retain their roles as `consts.ts`, `controller.ts`, and `AppShell.tsx` when those implementations adopt TypeScript. Use `.mts` only when the selected Node module contract requires an explicit ESM source extension.

<!-- rule: TYPESCRIPT-005 -->

Runtime imports must resolve through the declared build and execution path. For emitted Node ESM, relative imports name the emitted extension, normally `.js` for `.ts` and `.mjs` for `.mts`. A source-execution or bundler contract may select a different extension policy explicitly; configure TypeScript and the runtime consistently and prove the resulting imports work. Do not mechanically substitute source extensions for runtime extensions or assume tsconfig paths rewrite emitted imports.

<!-- rule: TYPESCRIPT-006 -->

Use `import type` and `export type` for dependencies and exports used only as types. Keep runtime activation imports explicit. Type-only dependencies must respect feature privacy, contract ownership, and package boundaries; erasure does not authorize cross-feature private imports.

<!-- rule: TYPESCRIPT-007 -->

Keep one principal runtime class, service, component, or cohesive namespace per implementation module. Related type exports may accompany that runtime owner when they describe its public contract. Do not attach unrelated type vocabulary merely because it emits no JavaScript. The shared utility namespace convention does not require TypeScript `namespace` syntax.

## Contract Ownership And Placement

<!-- rule: TYPESCRIPT-008 -->

Define ordinary types and interfaces in module-scoped TypeScript source and export them when another owner consumes the contract. Give complex public parameters, results, snapshots, and shared values one canonical named contract. Keep implementation-only types in the implementation module or an internal module under the same owner.

<!-- rule: TYPESCRIPT-009 -->

Keep types with the nearest owner of their meaning. A cohesive `types.ts` module may own vocabulary shared by that feature or service group. Promote a contract to a broader shared owner only when its real consumers establish that role. Do not create a global type collection or a one-file-per-interface hierarchy solely for organization.

<!-- rule: TYPESCRIPT-010 -->

Use interfaces for substitutable behavior and independently implementable capabilities, and type aliases for immutable values, configuration records, discriminated unions, and other data-only shapes. Callers depend on the capability rather than a concrete implementation when substitution is part of the architecture. Declare intentional class implementation with native `implements`, including explicit method annotations where inference does not supply them.

<!-- rule: TYPESCRIPT-011 -->

TypeScript classes and components define their implementation types in source. Do not maintain a handwritten duplicate class or component declaration beside that implementation or in a separate types folder. Give props, state, requests, and results distinct meaningful names and place them according to their owner. Emit package declarations from source when consumers require them.

<!-- rule: TYPESCRIPT-012 -->

Reserve authored `.d.ts` files for untyped external runtime contracts, deliberately global host contracts, or justified module augmentation. Use `declare`, `declare global`, and declaration merging only for those explicit boundaries. Preserve an existing deliberate ambient public architecture until its owner adopts a different contract; TypeScript adoption alone does not require changing that architecture.

<!-- rule: TYPESCRIPT-013 -->

Registry services expose a named public capability interface owned with the service source or its cohesive contract module. Extend the framework EventBus contract through a type-only reference; do not redeclare its methods in every service. Mirror the public `this.implement(...)` surface and exclude framework lifecycle methods unless consumers call them directly. Verify that framework and registry typing exposes this interface to callers without unchecked casts.

<!-- rule: TYPESCRIPT-014 -->

Give each string union a canonical named type. Document its purpose and every permitted literal using the shared `- **"value"** - description` convention. Keep related states in discriminated unions when the discriminator determines available fields. Update the canonical type and consumers together when the closed contract changes; do not repeat literal unions at use sites.

<!-- rule: TYPESCRIPT-015 -->

Use generics to express a real relationship between inputs, outputs, or capabilities. Use utility, mapped, and conditional types when they derive a contract from its canonical owner and remain understandable to callers. Do not export intricate implementation machinery or parameterize a contract for hypothetical future variants.

<!-- rule: TYPESCRIPT-016 -->

A changed production contract replaces its canonical source definition and consumers directly. Do not preserve duplicate declarations, shadow types, alias bridges, or old/new switches without the accepted compatibility requirement described in code conventions.

## Annotations And Documentation

<!-- rule: TYPESCRIPT-017 -->

Annotate public callable parameters and return values, public properties whose type is not evident from their declaration, and exported contract values whose shape would otherwise be accidental inference. Constructor parameters follow the same rule. Permit inference for straightforward local variables, contextually typed callbacks, and private implementation details when it preserves the intended contract.

<!-- rule: TYPESCRIPT-018 -->

Use documentation comments for every declared function and class method, including private support methods, and document each exposed type and property. Describe meaning, ownership, optionality, units, mutability, lifecycle, and observable behavior as applicable. Preserve shared noun-oriented entity descriptions and callable wording: public methods begin `Call this method to ...`, constructors `Creates ...`, and generators `Iterates over ...`; internal methods may begin `Called by <owner> to ...`.

<!-- rule: TYPESCRIPT-019 -->

TypeScript syntax owns types. Use descriptive `@param name - Description.` and `@returns Description.` tags without repeating brace-delimited types, and separate the description from tags with a blank line. Do not duplicate signatures through `@type`, `@typedef`, or `@implements` tags. Describe generator yields and meaningful final results in prose or descriptive tags while the source signature owns their types.

<!-- rule: TYPESCRIPT-020 -->

Use native overload signatures only when distinct call shapes require them; prefer a union or generic signature when it communicates the relationship adequately. Document accepted call shapes and their observable results. Document caller-observable thrown errors, asynchronous rejection, cancellation, and the caller's expected response regardless of what the return type expresses.

## Privacy And Mutability

<!-- rule: TYPESCRIPT-021 -->

Default to one leading underscore for class-owned private support methods, matching JavaScript conventions. Mark them `private` in TypeScript to enforce the intended boundary during type checking, and keep them as instance methods under the shared class-utility ownership rule. Use `protected` only for an intentional subclass capability and document that extension contract. A repository may select a different privacy policy, including `#method`, through an explicit overlay replacement; TypeScript adoption does not change the underscore default.

<!-- rule: TYPESCRIPT-022 -->

Express readonly intent with `readonly` properties, readonly collections, or `Readonly<T>` as appropriate to the contract. These enforce compile-time restrictions and do not freeze objects or recursively make nested values immutable. Preserve the shared prohibition on using `Object.freeze` as the immutability mechanism; enforce ownership and avoid leaking mutable internals through public APIs.

## Validation And Escape Hatches

<!-- rule: TYPESCRIPT-023 -->

Treat untrusted ingress values as `unknown` until runtime validation establishes the accepted shape and semantic constraints. Narrow through checks, validated parsers, or justified type guards. Type annotations, `as` assertions, `satisfies`, and non-null assertions do not validate runtime values. Internal code may trust a contract accepted at genuine ingress, following shared validation policy.

<!-- rule: TYPESCRIPT-024 -->

Avoid `any` in authored contracts and implementation. Isolate unavoidable interoperability with an inadequately typed dependency at its adapter and explain why a precise type or `unknown` is insufficient. Do not propagate that escape hatch through a public contract or use it to hide registry, component, or transport typing failures.

<!-- rule: TYPESCRIPT-025 -->

Use an assertion or non-null assertion only when an established invariant cannot be expressed adequately through narrowing, and keep it at the narrowest responsible site with an explanation of the evidence. Do not use double assertions, broad casts, or asserted object construction to bypass an incompatible contract. Prefer `satisfies` when checking an authored value against a contract while retaining useful inference.

<!-- rule: TYPESCRIPT-026 -->

Do not use `@ts-ignore` or `@ts-nocheck` to suppress authored TypeScript checking. If a documented external typing defect requires a temporary suppression, use narrowly placed `@ts-expect-error` with the defect reference and removal condition. Expected-error annotations in intentional negative type-contract checks must state the invalid behavior being proved.

## Compiler And Toolchain

<!-- rule: TYPESCRIPT-027 -->

Declare TypeScript as a direct project devDependency, preserve a compatible declared version, and retain the lockfile. Own tsconfig configuration in the repository and enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax` by default. Changes to these defaults require an explicit standards overlay rather than silently weakening checks.

<!-- rule: TYPESCRIPT-028 -->

Align `module`, `moduleResolution`, `target`, `lib`, and JSX configuration with each actual execution lane. Separate browser and Node configuration when their environments differ, using a shared base for common checks. Use `isolatedModules` when a separate per-file transpiler requires it. Include authored source, tests, and owned declarations; keep generated output outside the authored source set and do not treat dependencies as locally authored contracts.

<!-- rule: TYPESCRIPT-029 -->

Expose a terminating root `npm run typecheck` command that checks every locally owned TypeScript application, server, tooling, and test lane and fails on diagnostics. Use `tsc --noEmit` for each configured lane when another tool owns emission, or an explicit project-reference check/build that proves the same complete coverage. Transpilation or native type stripping alone does not establish type-check success.

<!-- rule: TYPESCRIPT-030 -->

Retain the repository-owned Prettier configuration and `format:check` contract for TypeScript sources. Keep one declared emission owner per lane. When declarations or JavaScript are emitted, keep output separate from authored source and prevent release or deployment of newly emitted artifacts after a failed type check. A watch loop may provide intermediate output only when the release gate still rejects diagnostics.

## Runtime And Behavioral Verification

<!-- rule: TYPESCRIPT-031 -->

Preserve established testing lanes and behavioral obligations. Configure test source extensions, discovery globs, app entries, transpilation, and execution for the selected TypeScript path without silently omitting existing JavaScript tests. Prove a representative spec runs in each affected lane and that a failure produces a nonzero result.

<!-- rule: TYPESCRIPT-032 -->

Type checks complement behavioral tests. Keep tests for runtime validation, malformed external values, lifecycle cleanup, cancellation, failure recovery, service wiring, and observable UI behavior even when the compiler accepts the code. Add focused negative type-contract checks only when a public generic, overload, or capability relationship needs proof beyond ordinary consumer checking.

<!-- rule: TYPESCRIPT-033 -->

Measure coverage against authored runtime TypeScript through the selected instrumentation and source-map path, excluding type-only modules, declarations, specs, harnesses, dependencies, and generated output as appropriate. Preserve client/server separation and the existing generated-baseline coverage contract. Do not interpret erased type constructs as executable behavior or instrument only the final dependency-containing bundle.

<!-- rule: TYPESCRIPT-034 -->

Before declaring TypeScript adoption established, exercise type checking, relevant builds, runtime imports, registry contract access, test discovery, and source coverage where configured. Verify emitted or stripped code through the actual runtime; do not assume a framework, bundler, or runner supports TypeScript because editor checking succeeds. Record the supported toolchain and commands in project foundation.
