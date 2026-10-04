# App Shell

## Installed Configuration

- Shell variant: `{{SHELL_TYPE}}`
- Source owner: `src/{{SLUG}}/features/app`
- Page registry: `src/{{SLUG}}/services/app-pages.js`

{{SHELL_BEHAVIOR}}

The generated initial-page and routing choices are local application facts.

## Verification

Shell specs live below `src/{{SLUG}}/features/app/_tests`. Run `npm test` after changing registration, selection, navigation, view events, responsive behavior, or routing.
