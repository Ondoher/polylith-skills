# Socket.IO

## Purpose And Deliberate Limits

<!-- rule: SOCKET-IO-001 -->
Socket.IO attaches through Polylith's shared server and is exposed only through app-scoped client/server stream services. The generated code is functional transport architecture for developers to extend. It installs no authentication, session, permission, persistence, application namespace, product event, or system-data policy.

<!-- rule: SOCKET-IO-002 -->
Test-only namespaces/events may exist inside specs. Production code must not imply that a feature protocol already exists.

## Ownership

<!-- rule: SOCKET-IO-003 -->
- Polylith creates and owns the shared Socket.IO server.
<!-- rule: SOCKET-IO-004 -->
- The generated app router obtains it through `app.getSocketIo()`.
<!-- rule: SOCKET-IO-005 -->
- The server stream service owns attachment, namespaces, connections, handlers, dispatch, sends, broadcasts, and cleanup.
<!-- rule: SOCKET-IO-006 -->
- The client stream service owns manager/socket creation, namespace reuse, request acknowledgements, event listeners, and cleanup.
<!-- rule: SOCKET-IO-007 -->
- Feature models/controllers call stream service methods.
<!-- rule: SOCKET-IO-008 -->
- React and feature callers never receive raw sockets.

<!-- rule: SOCKET-IO-009 -->
Each app registers its stream service under the same capability-oriented, unprefixed service name in its independent application registry. Socket.IO namespaces still contain `<app-slug>` because independently owned apps attach to one deployment-wide Socket.IO transport and its namespace paths can collide. This is transport-path isolation, not registry differentiation.

## Data Envelopes

<!-- rule: SOCKET-IO-010 -->
Every request and pushed event uses:

<!-- rule: SOCKET-IO-011 -->
```js
{data, system}
```

<!-- rule: SOCKET-IO-012 -->
Feature callers own `data`. The transport constructs a new envelope and never mutates the caller's object or nested values. `system` is transport-owned metadata and starts empty.

<!-- rule: SOCKET-IO-013 -->
The architecture includes explicit extension hooks:

<!-- rule: SOCKET-IO-014 -->
- client `getSystemData()` supplies outbound system metadata;
<!-- rule: SOCKET-IO-015 -->
- client `applySystemData(system)` consumes validated inbound metadata;
<!-- rule: SOCKET-IO-016 -->
- server `prepareContext(context)` derives request-local context;
<!-- rule: SOCKET-IO-017 -->
- server `getSystemData(context)` supplies outbound metadata.

<!-- rule: SOCKET-IO-018 -->
These hooks are no-ops until a requirement such as authentication, locale, correlation, or tracing defines their policy. Centralized envelope policy lets frontend/backend requirements evolve without making every feature caller understand them.

<!-- rule: SOCKET-IO-019 -->
Acknowledgements use:

<!-- rule: SOCKET-IO-020 -->
```js
{success: true, data, system}
{success: false, reason: {phrase, replacements?}, system}
```

<!-- rule: SOCKET-IO-021 -->
Invalid request/response envelopes log `console.error` and return a failure envelope. Ordinary timeout and disconnect outcomes return failures and may warn; they do not throw.

## Namespace And Connection Lifecycle

<!-- rule: SOCKET-IO-022 -->
- Normalize local names below `/<app-slug>/<namespace>` on the shared Socket.IO transport; do not copy that prefix into the app-local registry service name.
<!-- rule: SOCKET-IO-023 -->
- Allow namespaces to register before or after server attachment.
<!-- rule: SOCKET-IO-024 -->
- Memoize one client namespace connection per normalized name.
<!-- rule: SOCKET-IO-025 -->
- Register/unregister event handlers without exposing raw sockets; client uses `on`/`off` because the Polylith event bus already owns `listen`.
<!-- rule: SOCKET-IO-026 -->
- Track root and namespace sockets by `socket.conn.id` so one underlying client can hold several namespace sockets.
<!-- rule: SOCKET-IO-027 -->
- Remove the connection record only after its final owned socket disconnects.
<!-- rule: SOCKET-IO-028 -->
- Support send-to-client and namespace broadcast through envelope construction.
<!-- rule: SOCKET-IO-029 -->
- Detach from a replaced server without closing Polylith's shared transport.
<!-- rule: SOCKET-IO-030 -->
- Remove only listeners, sockets, timers, and records owned by this service.
<!-- rule: SOCKET-IO-031 -->
- Make shutdown and repeated cleanup idempotent.

<!-- rule: SOCKET-IO-032 -->
Use native Socket.IO acknowledgement promises with a finite timeout. Do not reintroduce custom deferred promises. Promise settlement, timeout cancellation, disconnect handling, and listener removal must have one clear owner.

## Handler Boundary

<!-- rule: SOCKET-IO-033 -->
Server feature handlers register through the stream service and receive prepared context plus the feature `data`, not a mutable transport object. They return feature data or an explicit failure reason. The stream service constructs the response envelope and appends system data.

<!-- rule: SOCKET-IO-034 -->
Handler exceptions are caught at the transport boundary, logged, and converted into failure acknowledgements unless the server itself cannot continue. Unsupported namespace/event requests receive explicit failure results rather than hanging until timeout.

## Tests

<!-- rule: SOCKET-IO-035 -->
Client Karma tests cover:

<!-- rule: SOCKET-IO-036 -->
- namespace normalization/isolation and connection reuse;
<!-- rule: SOCKET-IO-037 -->
- immutable envelope construction including nested caller data;
<!-- rule: SOCKET-IO-038 -->
- system hooks and pushed-event unwrapping;
<!-- rule: SOCKET-IO-039 -->
- exact `on`/`off` listener removal;
<!-- rule: SOCKET-IO-040 -->
- acknowledgement success and feature failure;
<!-- rule: SOCKET-IO-041 -->
- malformed acknowledgements;
<!-- rule: SOCKET-IO-042 -->
- timeout and disconnect results;
<!-- rule: SOCKET-IO-043 -->
- complete, repeated shutdown.

<!-- rule: SOCKET-IO-044 -->
Server Node tests cover:

<!-- rule: SOCKET-IO-045 -->
- namespace registration before/after attachment;
<!-- rule: SOCKET-IO-046 -->
- attachment idempotence and safe transport replacement;
<!-- rule: SOCKET-IO-047 -->
- root/namespace connection tracking by connection id;
<!-- rule: SOCKET-IO-048 -->
- final-disconnect cleanup;
<!-- rule: SOCKET-IO-049 -->
- request dispatch, context preparation, and response system hooks;
<!-- rule: SOCKET-IO-050 -->
- handler success, explicit failure, thrown failure, and invalid envelopes;
<!-- rule: SOCKET-IO-051 -->
- send, broadcast, listener cleanup, and idempotent shutdown;
<!-- rule: SOCKET-IO-052 -->
- one real ephemeral Socket.IO acknowledgement round trip.

<!-- rule: SOCKET-IO-053 -->
Every real client/server handle, timeout, and listener created by a spec must close deterministically. Do not use arbitrary sleeps as synchronization.

## Extension Checklist

<!-- rule: SOCKET-IO-054 -->
Before adding a production namespace:

<!-- rule: SOCKET-IO-055 -->
1. Which feature owns the protocol and its ambient payload types?
<!-- rule: SOCKET-IO-056 -->
2. Which events are request/acknowledgement and which are pushed state?
<!-- rule: SOCKET-IO-057 -->
3. What system metadata is actually required and where is it validated?
<!-- rule: SOCKET-IO-058 -->
4. What authentication/authorization boundary exists, if any?
<!-- rule: SOCKET-IO-059 -->
5. How do reconnect, duplicate requests, timeout, and cleanup behave?
<!-- rule: SOCKET-IO-060 -->
6. Which state remains canonical outside the transport?
<!-- rule: SOCKET-IO-061 -->
7. Which focused unit and real integration tests prove the contract?
