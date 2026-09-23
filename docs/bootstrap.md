# Bootstrap

See [Working with review agents](review-agents.md) for the complete reviewer setup and lifecycle guide.

Use bootstrap at the start of repository work to load governing instructions and establish the applicable review session.

## Use it

```text
Use $bootstrap for this repository.
```

The skill reads Codex-home and repository-root `AGENTS.md`, including documents they route to. It reports missing instructions rather than inventing them.

## Standard profile

When installation state exists, bootstrap first synchronizes the governance checkout through the installer. This requires the trusted remote and branch and a clean working tree, and uses a fast-forward-only pull. A blocked update stops standards-dependent startup. Bootstrap does not stash changes or resolve divergence.

It then delegates reviewer startup to `review-standards`. Startup depends on valid reviewer infrastructure and calibration, completed initial standards normalization, and valid current folder mappings. Eligible reviewers load their context before bootstrap reports readiness. Bootstrap also refreshes the generated `STANDARDS.md`.

Formatting problems do not prevent reviewer startup, but prevent a final clean review or positive checkpoint recommendation. The checkpoint adviser starts only when bootstrap instructions explicitly request it.

## Instructions-only profile

A repository can select this profile with this exact standalone directive in its root `AGENTS.md`:

```text
Bootstrap profile: instructions-only
```

Bootstrap still loads required instructions, but skips governance updates, reviewer startup, normalization and formatting eligibility checks, and generated-guide checks. A later explicit standards-review request still follows that skill's gates.

## Result

You receive an initialized session, an instructions-only session, or exact blocked prerequisites and recovery steps. Bootstrap establishes working authority; it is not itself a repository-wide code audit.

[Operational instructions](../skills/bootstrap/SKILL.md) · [Standards review](review-standards.md) · [All skills](../README.md)
