# Testing

## Installed Lanes

- Browser entry: `src/{{APP_SLUG}}/spec.js`
- Built browser tests: `tests/{{APP_SLUG}}`
- Component specs: `src/{{APP_SLUG}}/components/_tests` when components are installed
- Shared browser harness: `src/{{APP_SLUG}}/testing`
{{SERVER_TEST_LOCATION}}

Polylith builds selected browser specs and Karma executes the bundle in ChromeHeadless. Server specs use the generated Node lane when a server exists.

## Commands

```text
npm test
npm run karma:watch
{{COVERAGE_COMMAND}}
```

{{COVERAGE_BODY}}

Test ownership, behavior, determinism, cleanup, browser-build boundaries, and coverage rules come from the canonical [`testing.md`]({{STANDARDS_ROOT_LINK}}/testing.md) standard and the [folder standards manifest](../standards/manifest.md).
