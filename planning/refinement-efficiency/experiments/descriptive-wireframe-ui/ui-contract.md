# Isolated UI author contract

Consume the exact structurally accepted artifact in the assigned run: a rendered
wireframe for A, a descriptive layout for B. Both use the same frozen usage
packet, scenarios, research and design language. Do not rerun general UX or use
another run's designs. In B, create the scene structure needed for rendering; do
not invent behavior omitted by the description. Record material clarification
requests and any structural repair need outside the interface.

Save `ui.json` with all assigned scenes using the common renderer envelope. In A,
reuse the reviewed structured wireframe and supply visual replacements/changes.
In B, create reusable parts from the accepted description. Preserve meaningful
numeric relationships, selections, actions, state distinctions and outcomes.
Use the supplied research for cohesive control grouping and credible video editing
representations. Research advice does not settle an unresolved source policy.

Render the base workspace first, then complete the remaining scenarios. Capture
and inspect all final scenes. Keep commentary, open questions and assumptions in
`ui-notes.md`, not on the canvas. Placeholders are acceptable only for genuinely
underspecified placed components. Include longer app-defined text examples without
changing user data or semantics; use wrapping/growth where appropriate.

Use the shared harness for rendering/capture and markers. Record start,
inputs-ready, first-preview and authoring-end UTC. Use the harness `receipt` command
to save marker timestamps, exact artifact hashes, byte counts and scene IDs; do not
manually regenerate bookkeeping or list every input hash. Keep `ui-notes.md` brief:
meaningful decisions, corrections and clarification requests, with references to
shared source questions. Record explicit requested model/effort; actual backend
identity remains null unless exposed and verified. No separate added self-review loop. Existing author preview
inspection is retained equally in both paths. Shared renderer limitations are
documented in `renderer-limitations.md`; experimental review is not production
visual compliance certification.

Write only the assigned run's `ui/` directory; preserve others' work. Recover from
tool errors and continue. Do not mutate live product artifacts, publish, invoke a
separate model client/backend/proxy/observer, or fake production acceptance.
