# JSDoc Conventions

<!-- rule: JSDOC-001 -->
JSDoc documents runtime JavaScript and references contracts owned by declaration files: ambient data/general capability types and the exported application-service interfaces described below. Apply these rules to all authored JavaScript and JSX.

## Types and declarations

<!-- rule: JSDOC-002 -->
- Give every complex parameter and return data shape one named ambient type in an included `.d.ts` file. Do not repeat those shapes as inline JSDoc object literals, local `@typedef` declarations, `import(...)` expressions, type imports, or alias bridges. Exported application-service interface references follow the narrow exception below.

<!-- rule: JSDOC-003 -->
- Document every ambient alias and interface, and every property in an object-shaped type. State meaning, ownership, optionality, units when applicable, and relevant lifecycle or mutability constraints.
<!-- rule: JSDOC-004 -->
- Give every string union its own named ambient type. Document its purpose, followed by one `- **"value"** - description` item for each permitted literal.
<!-- rule: JSDOC-005 -->
- Keep component declarations in the nearest `components/types/<ComponentName>.d.ts` folder so editor navigation continues to open the JSX implementation.
<!-- rule: JSDOC-006 -->
- As the application-service exception to general ambient type placement, place each service interface beside its implementation with the same base filename, such as `io.js` and `io.d.ts`, and export the interface. Consumers may reference that exported interface through a JSDoc `import(...)` type expression using the service module path; this exception does not make shared data types module-scoped or permit duplicate ambient aliases. Extend the shared ambient `EventBus` alias and mirror the public `this.implement(...)` contract, excluding framework lifecycle methods unless callers invoke them directly. Document the exported interface and its methods.

<!-- rule: JSDOC-007 -->
- Define `type EventBus = import('@polylith/core').EventBus` once in the shared application type vocabulary. Do not redeclare `listen`, `unlisten`, or `fire` in each service interface.

## Descriptions

<!-- rule: JSDOC-008 -->
- Describe non-callable entities with noun phrases stating what they are, contain, own, or represent. This includes types, classes, interfaces, properties, fields, constants, parameters, return values, and union members.
<!-- rule: JSDOC-009 -->
- Document every declared function and class method, including private support methods. Keep inline expression callbacks concise unless they expose an independent reusable contract.
<!-- rule: JSDOC-010 -->
- Begin public methods with `Call this method to ...`; internal methods and callbacks may begin `Called by <owner> to ...`.
<!-- rule: JSDOC-011 -->
- Begin constructors with `Creates ...` and generators with `Iterates over ...`.
<!-- rule: JSDOC-012 -->
- Describe a getter and setter for the same property with the same noun-oriented property description; reading and writing do not create different property meanings.
<!-- rule: JSDOC-013 -->
- Document an overload like any other method. Describe its accepted call shapes and express them with named ambient parameter and return types; JSDoc has no standard overload tag, so do not invent one.
<!-- rule: JSDOC-014 -->
- Keep documentation focused on contract, ownership, and observable behavior rather than restating the implementation.

## Tags

<!-- rule: JSDOC-015 -->
- In JavaScript and JSX, document every parameter and returned value with explicit types. Use `@param {Type} name - Description.` and `@returns {Type} - Description.`
<!-- rule: JSDOC-016 -->
- Insert a blank line between the general description and the first JSDoc tag.
<!-- rule: JSDOC-017 -->
- Add `@returns {void}` when it helps explain an observable result.
<!-- rule: JSDOC-018 -->
- Use `@yields` to describe generator values. When a generator has a meaningful final return value, document that separately with `@returns`.
<!-- rule: JSDOC-019 -->
- Put complex selection logic in the main description and keep the `@returns` description focused on the returned value.
<!-- rule: JSDOC-020 -->
- Document an error class like any other class, including its purpose and every public property. Error declarations and their documentation may be grouped in the nearest `errors.d.ts` file as the exception to ordinary class-type placement.
<!-- rule: JSDOC-021 -->
- Document caller-observable thrown errors. For asynchronous methods, describe each rejection and cancellation condition and the caller's expected response in the main description rather than hiding the outcome solely in a throw tag or `@returns` text.
<!-- rule: JSDOC-022 -->
- Add `@implements {InterfaceName}` to every class intentionally implementing an ambient capability interface. Do not use it for accidental structural similarity or data-only aliases.

<!-- rule: JSDOC-023 -->
Do not introduce `@event`, `@fires`, or `@listens` as a project-wide convention until their generated documentation and editor behavior have been evaluated explicitly.
