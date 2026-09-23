# Create App

Use this skill to add one application to an established Polylith repository while keeping existing infrastructure and applications intact.

## Use it

```text
Use $create-app to add an administration application to this repository.
```

The repository must use an explicit apps array on Polylith 1.3 or later, have completed standards normalization, and contain the standards manifest, overlay, and required Prettier setup. The skill inspects prerequisites before collecting app options.

## What happens

You choose the app name, slug, capabilities, and routing. The workflow considers whether the repository hosts only local apps, is discoverable by another host, or hosts discovered repositories. It rejects duplicate app slugs and conflicting mounts.

A dry-run plan identifies every file to create or update. The shared application engine integrates app sources, builds, routes, selected tests, scripts, documentation, and folder standards mappings. It may add missing dependencies or shared setup while preserving existing dependency versions and unrelated scripts.

After applying the plan, the skill installs dependencies, formats the disclosed paths, refreshes standards documentation, and validates the app. It runs the repository format check and build, plus app tests and coverage when enabled.

## Result and boundaries

The result is an integrated application and a report of choices, changed paths, and validation. The workflow does not reinitialize the repository, replace an app, or perform Git writes. A failure leaves partial output available for inspection instead of overwriting it on retry.

[Operational instructions](../skills/create-app/SKILL.md) · [Initialize a project](initialize-project.md) · [All skills](../README.md)
