# Project Foundation

## Purpose

<!-- rule: PROJECT-FOUNDATION-001 -->
This topic owns stable repository facts, toolchain choices, package boundaries, and the commands that establish whether the project foundation is healthy. Product behavior belongs in the app topic; architecture and code rules belong in their narrower topics.

## Local Identity Record

<!-- rule: PROJECT-FOUNDATION-002 -->
Each project's local foundation topic records its full project name, package slug, initial version, package manager, module format, runtime source language, deployment and discovery posture, and application catalog or links to application-owned topics. Every Polylith repository is master-capable when it owns its development or standalone server process. Its additional posture states whether it hosts only local applications, may also be discovered by another active master, or acts as a hosting/server-root repository that discovers other repositories and may own resident apps. Determine this posture from discovery and hosting responsibility rather than app count, the `multiple` flag, or the repository's universal ability to run as master. Every application records its own slug and relevant build, standalone mount, composed mount, runtime, and test identities. Package and application slugs are distinct facts even when a single-app repository gives them the same value. These are project facts, not copies of this standard.

<!-- rule: PROJECT-FOUNDATION-003 -->
New application projects start at version `0.0.1`, use npm, use ESM, and use JavaScript/JSX with ambient TypeScript declarations until the runtime toolchain deliberately adopts TypeScript.

<!-- rule: PROJECT-FOUNDATION-004 -->
`package.json` is the canonical package and command manifest. `.nvmrc`, `engines.node`, and `packageManager` record the selected runtime toolchain when present. Keep those records aligned when Node or npm changes. Use the latest compatible stable Node and React versions; do not preserve stale versions merely because they appeared in an old scaffold.

## Repository Boundary

<!-- rule: PROJECT-FOUNDATION-005 -->
Initialization applies only to an empty folder or fresh GitHub repository. GitHub owns the root `README.md`, `LICENSE`, and `.gitignore`; project automation must not replace them. Developers own all Git writes, including branches, commits, tags, and pushes.

<!-- rule: PROJECT-FOUNDATION-006 -->
Generated initialization is additive and conservative:

<!-- rule: PROJECT-FOUNDATION-007 -->
- never overwrite an existing path unless the developer explicitly directs it;
<!-- rule: PROJECT-FOUNDATION-008 -->
- treat a partial initialization as a state to diagnose, not permission to erase and retry;
<!-- rule: PROJECT-FOUNDATION-009 -->
- keep generated output, coverage, test bundles, and certificates distinct from authored source;
<!-- rule: PROJECT-FOUNDATION-010 -->
- do not introduce TypeScript runtime sources until the project deliberately adopts them;
<!-- rule: PROJECT-FOUNDATION-011 -->
- do not install a second package manager or bundler.

## Dependency And Runtime Policy

<!-- rule: PROJECT-FOUNDATION-012 -->
- npm is the only package manager.
<!-- rule: PROJECT-FOUNDATION-013 -->
- Application code is ESM and uses explicit runtime file extensions.
<!-- rule: PROJECT-FOUNDATION-014 -->
- Resolve dependencies from the current compatible ecosystem at initialization time.
<!-- rule: PROJECT-FOUNDATION-015 -->
- React and ReactDOM remain a matched pair.
<!-- rule: PROJECT-FOUNDATION-016 -->
- A peer conflict is a reason to select a compatible version, not to force an invalid graph.
<!-- rule: PROJECT-FOUNDATION-017 -->
- A compatibility pin introduced for one generated project belongs to that project's manifest. Do not silently convert a project-local workaround into a global generator policy.
<!-- rule: PROJECT-FOUNDATION-018 -->
- Package privacy defaults to `private: true` because this is an application repository. Change it deliberately before publishing a package.
<!-- rule: PROJECT-FOUNDATION-019 -->
- Record why a dependency exists when its ownership is not obvious from a selected feature or topic.

## Documentation Bootstrap

<!-- rule: PROJECT-FOUNDATION-020 -->
`AGENTS.md` routes readers to `agents/topics/active-topic.md`. The active topic points to the product, application, or bounded work topic governing the current task; a new repository's initial product topic is intentionally undefined until product work begins. In a multi-app repository, application-specific facts belong to separately addressable app-owned topics rather than one ambiguous repository-wide app topic. `agents/topics/README.md` is a routing index: load only the topic needed for the current task instead of treating the entire documentation tree as always-active context.

<!-- rule: PROJECT-FOUNDATION-021 -->
Stable facts have one canonical owner. Update that owner and link to it rather than copying a mutable claim into several topics. Keep current state, future plans, and historical evidence distinct.

## Commands And Verification

<!-- rule: PROJECT-FOUNDATION-022 -->
Use scripts declared in `package.json` as the public command interface. The initialized checks are:

<!-- rule: PROJECT-FOUNDATION-023 -->
```text
npm install
npm test
npm run build
```

<!-- rule: PROJECT-FOUNDATION-024 -->
Run the narrowest relevant command while developing, then the complete configured verification before handing off a foundation change. In a multi-app repository, root `npm run build` and `npm test` cover every locally declared application or delegate to explicit app-specific commands that do; selecting a default app must not silently omit resident siblings from complete verification. A server-root build may also compose discovered apps, but each discovered repository remains responsible for its own tests. A command is considered established only when it is checked in, terminates with a meaningful exit code, and has been exercised in the environment it claims to support.
