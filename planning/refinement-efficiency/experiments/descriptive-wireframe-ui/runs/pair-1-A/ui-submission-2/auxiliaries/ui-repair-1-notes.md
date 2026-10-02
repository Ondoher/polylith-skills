# Pair 1 A UI repair 1

Addresses A-UI-01 from `reviews/ui-review-r1.json` using the newly accepted wireframe SHA-256 `21ed8acdc5ff38ae74f9cdb73084a9319e889318e9027ba407dd141e17a3812e` and `layout/layout-repair-3-notes.md`.

The revised wireframe is the complete base of `ui.json`, including its action references, header nodes and scene availability changes. Every visual replacement now contains the same New, Open, Save Project and Save As controls with their source action bindings. A six-column identity row reserves 96, 96, 146 and 116 pixels for those four outlined actions while leaving the project identity flexible. The project-header height and the separate workspace navigation remain unchanged.

The accepted source changes disable all four project actions in `s11-video-saving-busy` and `s12-project-guard-failure`. UI changes do not override those states. The Open guard retains its available Retry Save Project, Discard Project Changes and Cancel Open actions. The independently scoped video name, longer Save Video label and failure/busy states are preserved.

All four PNGs listed in `repair-1-r1/captures.json` were inspected at original detail, covering all fourteen scenes. Header labels, retained identities, workspace ordering and connected busy/guard controls fit without clipping or overlap. All geometry warning arrays are empty. The longer selection title, Save Video controls, source-crop title and project-failure message remain legible. No change to accepted player/timeline/rectangle geometry, shared theme, source policy or scene set was needed.

Decision: use fixed command widths and flexible identity space within the existing header row; this accommodates the new source controls without moving downstream content. No clarification or extra review loop was needed. Previous outputs remain preserved, including the coordinator's durable submission 1. Static-render limitations from `ui-notes.md` still apply. Independent targeted UI re-review follows; requested model/effort is gpt-6-astra/ultra with actual backend unverified.
