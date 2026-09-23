# Project Foundation

## Identity

- Project: `{{PROJECT_NAME}}`
- Package slug: `{{PROJECT_SLUG}}`
- Initial application: `{{APP_NAME}}` (`{{APP_SLUG}}`)
- Repository posture: `{{REPOSITORY_POSTURE}}`; master-capable during development and standalone execution
- Initial version: `0.0.1`
- Package manager: npm
- Module format: ESM
- Runtime: JavaScript/JSX with ambient TypeScript declarations

`package.json` is the command and dependency manifest. Runtime-version records must agree with it.

## Repository Boundary

GitHub owns root `README.md`, `LICENSE`, and `.gitignore` files. Developers own every Git write. Initialization must not overwrite pre-existing paths.

## Verification

Use the checked-in package scripts:

```text
npm install
{{FOUNDATION_COMMANDS}}
```

Global rules governing repository folders are mapped through the [folder standards manifest](../standards/manifest.md); do not copy their text into this topic.
