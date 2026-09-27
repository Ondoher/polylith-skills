# UX Design Mode

For initial or substantial authoring, use [the single-pass route](single-pass-design.md)
and request `single-pass-ux`. Its bounded record-array response and inline pruning
replace this document's whole-schema response and separate normalization/pruning
passes. The schema below remains authoritative for expanded fields, product meaning,
research, locks and review. The parent assembles the expanded candidate mechanically.
Do not ask the planner to author both the records and a second expanded JSON copy.

Use `<repository-root>/product/<name>/` as the output/product-document root under
[the product location contract](product-location.md). The human description may
remain elsewhere; its source reference is repository-relative. Pass an explicit
repository source root for independent UX review rather than inferring it from
the output directory.

UX design mode turns the validated structured product model into a bounded application map, task and action model, semantic interaction frames, and UX-to-UI handoff. The human description remains the source of intent; `generate-prd` owns publication. It supports incomplete products. It does not require a complete surface inventory, settled architecture, accepted visual design, or implementation opt-in.

Follow [the efficient stage sequence](refinement-cycle.md); reader organization is deferred to the document-structure agent. Use [the UX review gate](ux-review.md) after persistence and before UI work.

## Ownership

The product description remains the authority for product intent. The UX planner selects recommended application structure, product-feature groupings, goal-oriented tasks, actions, interaction frames, states, feedback, cancellation, recovery, and pruning decisions. Under the general agent-acceptance rule, those selections are accepted working UX when the parent incorporates them; the user may revise them later by editing the product description without a separate acceptance ceremony. The parent reconciles them with explicit owner decisions, verifies material pattern sources, and persists artifacts.

Functional arrangement includes the semantic regions a surface needs, their purpose and task order, persistent versus transient presentation, entry and exit behavior, action priority, visibility, input methods, transitions, feedback, and focus intent. It does not include pixel dimensions, a rendered grid, design tokens, framework components, brand treatment, or a visual hierarchy. The UI designer consumes only UX that has passed independent review and chooses exact geometry, spacing, typography, colors, component treatment, and rendered composition. A behavior-changing UI proposal returns to UX as an explicit change request.

## Inputs

Read the verified planner packet from `scripts/refinement-input.mjs`, relevant accepted decisions, current UX artifact, and affected UX research. The packet retains the complete structured product authority, including global rules, gaps, locks and source accounting. Retrieve exact source-claim excerpts when meaning is ambiguous; do not independently reinterpret the complete description. The independent UX reviewer still compares the final source with the design. Treat the latest human input as fresh and potentially unstructured. A human edit overrides any conflicting derived UX choice and requires affected records to be regenerated or reassessed. Preserve unaffected accepted intent, stable IDs, and owner terminology. A previous PRD organization or interaction frame is evidence, not a schema that constrains the next organization.

Use the current design language as a linked input without reopening it unless the UX question changes a visual requirement. Ask system, model, or controller specialists only for a concrete feasibility or domain question. Missing behavior remains an open question only when UX cannot select a responsible current direction, a dependency blocks the choice, or the user explicitly defers it; it blocks only dependent records. Technical questions and recommendations feed a later engineering design review and do not become PRD questions. When a technical unknown affects the product, state the required user-visible outcome in the PRD and leave representation, storage, APIs, technology feasibility, and implementation mechanisms to engineering design.

## Research Before Invention

Classify the pattern basis of every retained action and interaction frame as `ordinary`, `researched`, or `novel`.

- Use `ordinary` only for a familiar interaction whose application does not need external evidence. It has no `researchRef`.
- Before selecting an unfamiliar, product-specific, or materially adapted interaction, perform bounded research using current primary product documentation, original-author guidance, platform documentation, or normative standards. Record the search and alternatives in `patternResearch`, and use `researched` only when its outcome is `pattern-selected` or `conflicting-patterns-resolved`. While parent source checking is pending, keep the research and dependent records `proposed`; resolved researched records require source-checked evidence.
- Invent only after the research record establishes `no-suitable-precedent`. Use `novel`, preserve the selection uncertainty and evidence limits, and identify what later evaluation must test. While parent source checking is pending, keep the novel direction and its dependent records `proposed`; resolved novel records require source-checked evidence.

Research informs a product choice; it does not create a product requirement by itself. Do not promote a pattern from one reference product or the current fixture into a reusable default. Keep product-specific findings and adaptations in the product artifact, and make broader claims only when the evidence independently supports them.

## UX Planner Request

Request planning-consultation assessment mode for the selected scope. Ask the named `ux-planner` to read this workflow and the complete [UX schema 0.4 machine contract](./ux-schema-0.4.json) before composing its response, then return one JSON object that conforms to both, with no Markdown fence or explanatory wrapper. The machine contract is authoritative for exact field names, required fields, arrays versus objects, enums, and conditional members; do not infer substitutes from prose. Before returning, the planner self-checks every emitted object and array against that contract, including empty arrays and conditional fields. Supply the structured planner packet with exact model/source bindings and source locator, current UX artifact when present, changed-record evidence, bounded scope, and reusable research. The parent incorporates latest human input into product authority before this request. The planner is read-only. It marks selected recommendations `accepted`, uses `proposed` only for an unselected candidate retained for comparison, and uses `unresolved` where it cannot choose. Newly researched selections whose parent verification is still pending, plus resolved records that depend on them, remain `proposed` until the parent source-checks the evidence and promotes the affected records together. Reusable evidence that is already source-checked may support accepted records. It preserves every supplied `locked` record exactly unless the current user request explicitly names that scope and requests a change; it never creates a lock itself. When the role is unavailable, the parent may construct the same design and records source provenance honestly; never claim a named-agent run.

The first-pass response includes:

- product orientation, application shell, navigation, persistent regions, and complete activity-area map;
- feature groupings and goal-oriented use cases, including canonical steps and observable outcomes;
- first-class actions with canonical and alternate inputs, availability, priority, feedback, cancellation, recovery, and pattern basis;
- surfaces with ordered functional regions, states, components, and interaction-frame references;
- semantic interaction frames whose stable content and affordance IDs make the action architecture visible without choosing UI geometry;
- research records for every researched or novel pattern;
- a pruning review for every primary task;
- consolidated product and UX questions with affected records and decision ownership; omit technical and architecture questions.

Normalize the resulting map before pruning and persistence. The shell describes application structure and is not duplicated as a work surface unless it supports an independent user task. One coherent workspace remains one surface across empty, editing, saving, success, and failure states. Group interactions by user goal and observable outcome; retry, correction, cancellation, and failure belong to the owning use case unless they form a distinct goal. Keep the component inventory to elements with independent behavior or feedback contracts; represent incidental messages and dirty indicators as states of an owning field or status region when that loses no behavior. Derive IDs from the primary domain noun and user action, then preserve them across revisions. This canonical decomposition is part of material-equivalence evaluation, not a formatting preference.

When no prior IDs exist, omit redundant type prefixes and use the shortest unambiguous domain form: `<domain>-work` for an activity area, `<domain>-workspace` for a task surface, `<verb>-<domain>` for a use case, and `<domain>-<role>` for a component. Use kebab-case state IDs. Do not invent a component for an interaction whose method is still an open question. Progress, success, or failure feedback that persists or changes independently is one status component; incidental one-state explanatory text remains with its owner. Product vocabulary and existing IDs override these defaults.

Take the use-case verb from the stated goal rather than the first interaction; ordinary goal verbs include `inspect` for examining existing information and `rename` for changing a name. For ordinary components, prefer the controlled role suffixes `field` for editable scalar input, `action` for a command trigger, and `status` for persistent progress/result feedback, retaining enough subject context to remain unambiguous. Normalize common lifecycle states to `empty`, `viewing`, `editing`, `saving`, `saved`, and `failed`; component state subsets use `current`, `edited`, `disabled`, `available`, `saving`, `idle`, `saved`, and `failed`. Introduce another term only when this vocabulary would erase a product distinction.

When asynchronous work changes command availability, define an in-progress state on the owning surface and include it in the action's applicable-state and frame contracts. A separate status component may communicate progress. Keep both behaviors explicit: the surface state governs command availability, and the status component communicates the operation's progress.

For a new open question about an unspecified interaction method, use `<domain>-<action>-method` with the base action verb, such as `item-open-method`; do not create a gerund variant. Preserve existing question IDs across revisions.

## Prune Before Persistence

After normalization, review each primary task for the smallest coherent action architecture that still satisfies product intent, accessibility, recovery, and alternative-input needs. Remove, merge, demote, or contextualize duplicate actions, redundant affordances, repeated feedback, unnecessary modes, and frames or components without a goal or workflow role. An alternate input that produces the same outcome belongs under its canonical action; it is not another affordance. Do not prune required confirmation, cancellation, recovery, accessibility, safety, or visibility merely to minimize a control count.

Record material pruning decisions on the owning flow while authoring it. `steps` is the sole primary ordering; `alternates` owns local conditional routes. No separate pruning review, action-coverage list or second canonical sequence is required. Independent qualitative UX review remains a separate authority.

## Schema 0.4

[ux-schema-0.4.json](./ux-schema-0.4.json) is the complete machine-readable structural contract. Its object properties, required lists, `additionalProperties` rules, enums, array item shapes, and conditionals define the only accepted JSON shape. Its `x-semanticRules` records the cross-record obligations that JSON Schema cannot execute; `scripts/ux-design.mjs` is the final executable authority for semantic reference checks. The prose below explains intent and semantic invariants; it does not authorize aliases or extra fields. The contract contains no sample decomposition: never derive domain nouns, action or frame counts, interaction choices, or preferred layout from it.

The maintained record is `ux/ux-spec.json`. Required top-level fields are:

- `schemaVersion`: `"0.4"`.
- `id`, `title`, `revision`, and `status`.
- `assessment`: `ux-planner-assessment` or `parent-assessment`, with a short description that prevents simulated specialist claims.
- `sources`: stable source IDs with a safe repository-relative path, revision, and kind. Online pattern evidence belongs in `patternResearch.sources` with its URL and access date.
- `product`: exactly `name`, `overview`, and the `users` string array. Product requirements and scope remain in their owning sources rather than extra product-object fields.
- `supportingDocuments`: optional PRD links such as the design-language index. Each path uses a narrow unencoded ASCII repository-relative grammar with an optional local fragment. Schemes, absolute paths, traversal, percent encoding, queries, credentials, whitespace, and Markdown metacharacters are rejected. Authored labels and descriptions are escaped in generated Markdown and HTML.
- `application`: exactly `summary`, `shell`, and the `areas` record array. The shell includes its kind, description, status, navigation pattern and description, and ordered regions.
- `features`, `useCases`, `surfaces`, and `components`.
- `patternResearch`, `actions`, and `interactionFrames`.
- `openQuestions`.
- `productModelBinding`, `productRealizations`, and `traceGaps` for exact product authority and missing links.
- `flows`, `states`, `feedback`, and `repairNeeds` for local interaction meaning and explicit incomplete data.

Design-record status is `default`, `proposed`, `accepted`, `locked`, or `unresolved`. A recommended UX direction is `accepted` by default. `proposed` identifies a candidate the planner has not selected, `unresolved` identifies a gap without a usable recommendation, and `locked` is reserved for an explicit human lock instruction. Questions use `open` or `answered`. IDs remain stable when wording or document order changes. References use IDs rather than array positions.

Each feature identifies sources, surfaces, `flowRefs`, and questions. Each `flow` identifies its starting `elementRef` (`ux:surface:ID` or `ux:component:ID`), feature, goal, trigger, preconditions, outcome, priority, status and questions. Its `steps` array is the primary sequence. Each step has a stable ID, actor, action text and visible response; optional action/frame/target references and `usesElementRefs` identify required behavior and supporting reusable dialogs. Each alternate has an ID, `afterStepRef` pointing to a primary step, condition, ordered steps, outcome and optional `resumeStepRef` pointing to a primary step in the same flow. Errors, cancellation, correction and retry are local alternatives. Status inherits from the flow unless explicitly supplied. Components own simple `behaviors` records with statement, status, source and question references. No general execution graph or duplicate order catalog is persisted.

Each action records `id`, `name`, `purpose`, `status`, nonempty `taskRefs`, `outcome`, `canonicalInteraction`, `alternateInputs`, `presentationClass`, `visibility`, `persistence`, `priority`, nonempty `applicableStateRefs`, nonempty `feedbackRefs`, `cancellation`, `alternateRefs`, `patternBasis`, and `questionRefs`. `canonicalInteraction` has `method` (`activate`, `select`, `enter`, `navigate`, `direct-manipulation`, `dismiss`, `confirm`, or `system-mediated`), `input`, and `description`; alternate inputs have stable IDs and an `equivalentOutcome` boolean. `presentationClass` is `persistent-control`, `contextual-control`, `direct-manipulation`, `menu-item`, or `dialog-action`. Visibility is `always`, `conditional`, or `on-demand` with conditions where required. Persistence is `persistent`, `state-bound`, or `transient`; priority is `primary`, `secondary`, `contextual`, or `supporting`. Applicable states reference the top-level `states` catalog. The top-level `feedback` catalog holds source-bound feedback; `alternateRefs` points to local alternatives in the action's owning flows. `cancellation` is one object with `mode` and `description`, plus the singular `actionRef` only when mode is `available`. `patternBasis` records `kind`, rationale, and the required `researchRef` for researched or novel behavior.

Each surface identifies its activity area, kind, purpose, entry, exit, focus intent, functional regions, required components, questions, `stateRefs`, and `interactionFrameRefs`. Regions declare task order and component references. Each component describes a semantic kind, purpose, capabilities, `stateRefs`, `behaviorNodeRefs`, and owning surfaces. Shared complex component behavior has one component-owned subflow referenced by each use. These are product concepts rather than HTML, MUI, React, Polylith, or other implementation types.

Each interaction frame records `id`, `name`, `kind` (`surface`, `dialog`, `menu`, `popover`, or `panel`), `purpose`, `status`, `surfaceRef`, `stateRef`, nonempty `taskRefs`, `patternBasis`, ordered `regions`, `focus`, questions, and, for a dialog, menu, or popover, its `parentFrameRef` and `triggerActionRef`. A region has a stable ID, semantic kind, purpose, order, priority, optional source-region reference, `content` array, and `affordances` array. Every content record has `id`, `kind`, nonempty `text`, `purpose`, `priority`, `persistence`, and string arrays `taskRefs` and `stateRefs`. Its kind is `information`, `guidance`, `feedback`, `status`, or `technical-information`. Feedback content requires the owning `actionRef` and `feedbackRef`; other content forbids them. `technical-information` also requires `technicalExplanation`, which states why the fact materially helps the user decide or act; other content forbids that field. Every affordance has `id`, one canonical `actionRef`, `label`, `status`, positive integer `order`, `interaction: "canonical"`, and `transition`. Transition kind is `none`, `state`, `frame`, `surface`, or `completion`: `state` uses only `targetState`, `frame` uses only `targetRef`, `surface` uses both `targetRef` and `targetState`, and `none` or `completion` uses neither. `focus` records `entry` intent, the `orderRefs` string array, and optional `returnActionRef`; a dialog, menu, or popover returns to its triggering action.

Each `patternResearch` record identifies the question and trigger, research method and date, search queries, primary or normative sources (`id`, `title`, `sourceType`, `sourceUrl`, `accessedAt`, and observations), candidate patterns with applicability and tradeoffs, outcome, selected pattern or adaptation, rejected patterns, evidence limits, source verification, and affected task/action/frame references. Accepted researched and novel patterns require accepted or locked, parent-source-checked evidence. `no-suitable-precedent` is the only basis for accepted novel behavior and requires explicit uncertainty.

Research URLs use public HTTPS without embedded credentials or secret query keys; private, loopback, link-local, IPv4-compatible private/loopback, NAT64 private/loopback, single-label, local, and internal hosts are rejected. URL paths, queries, and fragments and all other durable research strings are decoded through bounded percent-encoding layers before scanning. Do not save bearer/vendor tokens, credential-shaped assignments, file URLs, or private absolute filesystem paths. Descriptions such as `Password = minimum 12 characters` remain ordinary product research and are allowed.

`flow.decisions` records only material retain, remove, merge, demote, contextualize or no-change rationale. Each decision has `id`, `disposition`, `candidate`, `actionRefs`, `rationale`, and `result`. It does not repeat step ordering or require a separate whole-product pass. Removed actions cannot remain accepted in the referenced flow.

Every question states the question, decision owner, why it matters, affected record IDs or fields, and status. Questions describe user-visible behavior, product policy, or UX choices. Missing visual values that UI can default do not belong here. Missing product behavior, interaction semantics, or user-facing recovery does. Data representation, schemas, persistence mechanisms, APIs, codecs, infrastructure, performance strategy, and other engineering concerns do not; route them to engineering design review without adding them to `openQuestions` or unresolved PRD alternatives.

Validation resolves every reference and enforces the research and pruning rules. It also rejects duplicate action affordances or duplicate feedback within one frame, contextual presentation without visibility conditions, alternate-input IDs used as affordances, dialogs/menus/popovers without valid parent and trigger context, and unresolved references inside accepted frames. Every accepted action and frame traces to a task and applicable surface state; every accepted action has at least one canonical affordance in every applicable state; every step node resolves to its action; every accepted or locked primary task has exact pruning coverage.

## Semantic Inline Wireframes

Downstream publication may render each validated interaction frame as a restrained semantic illustration near its owning workflow. The UX artifact does not choose document count, pages, or presentation order.

These are noninteractive interaction-architecture illustrations. Do not add fake buttons or fields, JavaScript, iframes, device chrome, fixed device viewports, pixel or source geometry, framework components, application theme colors, or a standalone wireframe page. The caption states that UI owns exact layout, component choice, spacing, typography, color, and treatment. Accepted and default records remain unbadged; identify locked, proposed, and unresolved material explicitly.

## Persistence, Review, And Rendering

The parent writes the proposed JSON to a temporary file, then runs:

```text
node <skill>/scripts/ux-design.mjs --input <proposal.json> --output-dir <product-documentation-folder>
```

Add `--lock-reason <current-user-request>` only when recording an explicit user lock. Add `--locked-change-reason <current-user-request>` only when the current user specifically requests a change to or removal of an existing lock. The writer rejects unauthorized document- and record-level lock transitions before replacing output.

The command validates schema 0.4 IDs, source bindings, typed product and UX references, local step/alternate references, research and action/frame integrity, then writes canonical `ux/ux-spec.json`. `generate-prd` later inventories this artifact with the product model and any UI scenes; its document-structure agent chooses the reader-facing organization.

Consolidate accepted product decisions into the description, format it, and update its model and affected UX bindings before review. Preserve unchanged behavior and IDs; a changed source requires a complete bound model proposal. Inspect the saved artifact and inline wireframes, then run a fresh `ux-reviewer` under [the review contract](ux-review.md). Resolve blocking findings through another UX synthesis, validation, persistence, and fresh review. Only a `pass` bound to the exact revision and scope permits dependent UI composition. Regeneration remains deterministic for the same source. Acceptance is assigned before persistence; generators and reviewers preserve it and never promote a proposed or unresolved record. Accepted behavioral decisions belong in the coordinated pre-review writeback, in ordinary language. A later behavior-changing decision invalidates affected review evidence and starts a bounded correction; it is not routine post-review housekeeping.

## Completion For A Slice

A slice is useful when its selected feature has a traceable source, at least one use case, every referenced surface, component, action, and interaction frame resolves, observable responses and transitions are stated, required research is source-checked, its primary tasks have pruning coverage, and known dependent gaps appear as questions. It need not define unrelated features or claim whole-product completeness. A whole-product pass has a different coverage obligation: every accepted activity area must resolve to at least one accepted surface and goal-oriented use case when the product description permits a responsible working recommendation. An area may remain without a surface only when the UX artifact records a visible product/UX gap that actually blocks one; a missing technical decision alone does not justify silently omitting the area.

Before finishing, repersist the saved JSON and require byte-identical structured output. Review the graph for invented behavior, unverified pattern claims, missing recovery, status promotion, dangling cross-artifact links, and disagreement with the product description. UI work proceeds only after the current UX scope passes independent review.

## Native authoring and saved-data import

Use [single-pass authoring](single-pass-design.md) for bounded context/element/flow records and resumable file handoffs. This is the same schema 0.4 meaning persisted by the validator, not an adapter to the old graph. Schema 0.3 is accepted only by the explicit migration command, which preserves original input and reports ambiguous conversions. Review receipts never transfer automatically. Repair needs remain visible to the parent and downstream documentation.
