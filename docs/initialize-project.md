# Initialize Project

Use this skill to create the first application and development setup in an empty folder or fresh repository. It supports a Polylith application setup and a smaller non-Polylith JavaScript setup.

## Use it

```text
Use $initialize-project to create a new project in the current empty repository.
```

The skill checks eligibility before asking for configuration. A fresh repository may contain `.git/`, `README.md`, `LICENSE`, `.gitignore`, and one root workspace file. Existing application content is a conflict. Use `create-app` for another app in an established repository.

## Choices and output

You provide project and package names and, for Polylith, an initial app name and slug. The workflow collects applicable options for the shell, UI capabilities, server, testing, coverage, and related setup, then summarizes the effective configuration.

The generator assembles the baseline, installs dependencies, and creates project documentation, folder standards mappings, and an empty local standards overlay. A Polylith project uses the same application engine as `create-app`. The non-Polylith branch creates a simpler source layout with selected formatting and Jasmine support.

Canonical standards must be available from the installed toolkit. Their prose is referenced rather than copied into the project.

## Verification and boundaries

The skill validates the structure and runs applicable formatting, build, test, and coverage checks against actual installed dependencies. Dependency compatibility is reported only after the generated project passes its required commands.

Existing README, license, and ignore files are preserved. The skill does not initialize Git, stage, commit, or push. If generation fails, it preserves partial output and reports what was created instead of retrying by overwriting it.

[Operational instructions](../skills/initialize-project/SKILL.md) · [Add an app](create-app.md) · [All skills](../README.md)
