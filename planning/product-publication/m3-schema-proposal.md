# Milestone 3: proposed product and UX schemas

This is the owner-accepted schema and relationship direction for milestone 3,
steps 2 and 3. It follows [the joint inventory](m3-joint-inventory.md).
These are **accepted semantic contracts**, not installed validators or an
automatic migration. Step 4 will turn the accepted contract into complete
machine-readable schemas, writers, context packaging, and agent instructions.
The examples are illustrative records, not product defaults.

## Common identity and authority

The product model remains authoritative for product intent. UX describes how
people encounter and carry out accepted behavior; UI depicts exact UX states
and interactions. A product record never points forward to a UX revision.
The UX artifact binds one exact product model and records the product-to-UX
links. UI binds one exact UX artifact and records depiction links. Reverse
lookup and impact analysis are derived from these directed links.

Keep the existing lexical IDs of surviving records. Within a product model,
IDs remain unique across all semantic record kinds. Existing internal UX IDs
remain stable, while external references gain a kind-qualified address:

| Address          | Meaning                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `product:<id>`   | One record in the bound product model; its kind comes from `recordIndex`. This preserves current product references. |
| `ux:<kind>:<id>` | One record in the bound UX artifact, such as `ux:use-case:export-video` or `ux:state:export-canceling`.              |
| `ui:scene:<id>`  | One scene in the bound UI artifact. Its publication state is checked separately.                                     |

An ID names semantic identity, not an array offset, Markdown heading, page,
file, implementation unit, or artifact revision. References resolve only
against their bound artifact versions. A changed source or material record
requires a new binding and affected downstream reassessment; a matching label
never repairs a missing link.

## Proposed product-model 2.0 semantic shape

The existing envelope, `purpose`, `users`, `sourceClaims`, `identityClaims`,
`sourceClaimLineage`, `recordIndex`, `changeSet`, material hashes, parent
bindings, and lock-authority rules remain. Three semantic catalogs are added:
`goals`, `requirements`, and `rules`. `capabilities` remain meaningful
groupings, with a concise summary rather than a container for several
normative statements. `gaps` can point to any affected product record. The
schema version changes because these are persisted contract changes.

```ts
type ProductModel2 = Omit<ExistingProductModel,
  "schemaVersion" | "capabilities" | "gaps"> & {
  schemaVersion: "2.0";
  purpose: ExistingPurpose;
  users: ExistingUser[];
  capabilities: Capability2[];
  goals: ProductGoal[];
  requirements: ProductRequirement[];
  rules: ProductRule[];
  gaps: ProductGap2[];
  sourceClaims: ExistingSourceClaim[];
  identityClaims: ExistingIdentityClaim[];
  sourceClaimLineage: ExistingSourceClaimLineage[];
  recordIndex: ExistingRecordIndexEntry[]; // extended to new kinds
};

type ProductFact = {
  id: string;
  status: "accepted" | "locked" | "superseded";
  owner: ExistingProductOwner;
  consumerDomains: ExistingConsumerDomain[];
  provenance: { sourceClaimRefs: string[] };
};

type Capability2 = ProductFact & {
  name: string;
  summary: string;
  userRefs: string[];
  relatedCapabilityRefs: string[];
};

type ProductGoal = ProductFact & {
  statement: string;         // user or product objective
  desiredOutcome: string;
  capabilityRefs: string[];
  userRefs: string[];
};

type ProductRequirement = ProductFact & {
  kind: "behavior" | "quality" | "scope";
  statement: string;         // one independently testable obligation
  capabilityRefs: string[];
  goalRefs: string[];
};

type ProductRule = ProductFact & {
  kind: "policy" | "invariant" | "constraint";
  statement: string;
  appliesToRefs: string[];   // product record IDs, resolved by kind
};

type ProductGap2 = Omit<ExistingProductGap, "capabilityRefs"> & {
  affectedRecordRefs: string[];
};
```

`ProductFact` is a common shape, not a new catalog. Requirements express
obligations; rules express conditions that govern them; goals explain the
desired outcome; capabilities group related meaning for discovery. A rule may
apply to several capabilities or requirements without copying its statement.
`scope` requirements cover explicit inclusions and exclusions; `constraint`
rules govern how other records may be satisfied. The producer chooses the
smallest coherent record that can be cited, revised, locked, or impact-traced
independently. It does not create one record per sentence.

`sourceClaims` still partition the current description's lines exactly once.
Several semantic records may cite one claim when a line contains several
facts. Every introduced record needs an identity assertion and source
provenance. Existing records retain IDs where their meaning survives; a split
or replacement uses explicit superseded tombstones and lineage. New record
kinds participate in material hashing, change classification, immutable
ancestry checks, and targeted lock authority. The 1.0-to-2.0 transition must
validate against its exact immutable 1.0 parent; it must not rewrite that
parent or silently treat a new fact as a continued record. A partial model
continues to expose unresolved gaps or unclassified claims. Migrating bundled
capability prose must account for every original fact, including context in
the capability summary; the model cannot infer new product policy.

## Proposed UX 0.3 semantic shape

Keep the existing application shell, areas, features, surfaces, components,
actions, frames, research, pruning review, and questions unless a field below
changes. `useCases` remain a flat catalog. New top-level catalogs give
independently meaningful flow pieces typed IDs. A use case owns its entry
node; a component can own a shared subflow that several use cases invoke.

```ts
type UXDesign03 = Omit<ExistingUXDesign,
  "schemaVersion" | "useCases" | "surfaces" | "components" |
  "actions" | "interactionFrames"> & {
  schemaVersion: "0.3";
  productModelBinding: {
    id: string;
    revision: number;
    sha256: string;
    materialSha256: string;
    recordIndexSha256: string;
  };
  useCases: UseCase03[];
  surfaces: Surface03[];
  components: Component03[];
  actions: Action03[];
  interactionFrames: InteractionFrame03[];
  useCaseRelations: UseCaseRelation[];
  flowNodes: FlowNode[];
  flowEdges: FlowEdge[];
  states: UXState[];
  feedback: UXFeedback[];
  recoveryPaths: UXRecovery[];
  productRealizations: ProductRealization[];
  traceGaps: TraceGap[];
};

type UseCase03 = Omit<ExistingUseCase, "steps" | "alternatives"> & {
  entryNodeRef: string;
  // Existing featureRef, goal, trigger, preconditions, outcome,
  // taskPriority, status, actionRefs, and questionRefs remain.
};

type Surface03 = Omit<ExistingSurface, "states"> & {
  stateRefs: string[];
};

type Component03 = Omit<ExistingComponent,
  "states" | "behaviorRequirements"> & {
  stateRefs: string[];
  behaviorNodeRefs: string[];
  entryBehaviorNodeRef?: string;
};

type Action03 = Omit<ExistingAction,
  "applicableStates" | "feedback" | "recovery"> & {
  applicableStateRefs: string[];
  feedbackRefs: string[];
  recoveryRefs: string[];
};

type InteractionFrame03 = Omit<ExistingInteractionFrame, "state"> & {
  stateRef: string;
};

type UseCaseRelation = {
  id: string;
  fromUseCaseRef: string;
  toUseCaseRef: string;
  kind: "precedes" | "depends-on" | "extends" | "shares-behavior-with";
  status: ExistingUXStatus;
  sourceRefs: string[];
};

type FlowNodeBase = {
  id: string;
  ownerRef: string;           // ux:use-case:<id> or ux:component:<id>
  status: ExistingUXStatus;
  sourceRefs: string[];
  questionRefs: string[];
};

type FlowNode = FlowNodeBase & (
  { kind: "step"; actor: string; action: string; actionRef: string;
    targetRef: string; response: string; frameRef?: string; } |
  { kind: "decision"; prompt: string; frameRef?: string; } |
  { kind: "alternative"; response: string; frameRef?: string; } |
  { kind: "component-behavior"; componentRef: string;
    statement: string; frameRef?: string; }
);

type FlowEdge = {
  id: string;
  fromRef: string;            // flow node or recovery path
  toRef: string;              // flow node, recovery, state, or feedback
  kind: "next" | "branches-to" | "recovers-to" | "invokes" |
        "enters-state" | "emits-feedback";
  status: ExistingUXStatus;
  sourceRefs: string[];
  order?: number;             // explicit sibling order when relevant
  condition?: string;        // required for a conditional branch
};

type UXState = {
  id: string;                 // globally unique within this UX artifact
  ownerRef: string;           // ux:surface:<id> or ux:component:<id>
  name: string;
  meaning: string;
  status: ExistingUXStatus;
  sourceRefs: string[];
};

type UXFeedback = {
  id: string;
  actionRef: string;
  phase: "invoked" | "progress" | "success" | "failure" | "canceled";
  description: string;
  persistence: ExistingUXPersistence;
  status: ExistingUXStatus;
  sourceRefs: string[];
};

type UXRecovery = {
  id: string;
  ownerRef: string;           // action or flow-node address
  condition: string;
  response: string;
  actionRefs: string[];
  status: ExistingUXStatus;
  sourceRefs: string[];
};
```

Use-case steps and alternatives are authored as `flowNodes` directly in the
new contract. There is no old-data conversion path. `flowEdges` make canonical order, branches,
recovery, state changes, feedback, and shared invocation explicit. A shared
component owns its behavior nodes; invoking cases link to that one owner.
The validator must reject cycles that cannot terminate or return, ambiguous
branch order, and a node reached from unrelated owners without an invocation.
It must also check that each accepted use case reaches its entry node, that
its `actionRefs` match the actions used by its flow, and that pruning review
step references match the canonical traversal rather than array position.
The UX frame kind `dialog` remains the authoritative dialog record; a flow
node references its exact frame. We do not create a competing dialog catalog.

Current surface and component state strings, `frame.state`, action
`applicableStates`, and frame content `stateRefs` become references to the
top-level state catalog. Action and frame contexts use surface-owned states;
component-owned states describe independent component behavior. Nested
action `feedback` and `recovery` become references to their new catalogs.
`component.behaviorRequirements` becomes references to component-owned flow
nodes. Existing action and frame IDs, visual semantics, research evidence,
pruning decisions, and source citations remain. The producer must preserve
their accepted meaning and record any relation it cannot recover as a gap.
Each new UX record cites one or more bound source IDs; product realizations
identify exact governing product records where applicable, and pattern
research retains its own evidence links. Root assessment records which agent
or parent produced the UX proposal.

An action's recovery references resolve to `recoveryPaths`; its feedback
references resolve to `feedback`. A flow edge can enter a recovery path and
return to a flow node. A shared component subflow has one entry node and can
be invoked by several cases without copying its internal nodes.

## Exact product-to-UX and UX-to-UI links

The UX artifact carries one directed realization list. The `productRef`
resolves through the bound product model, and the `uxRef` resolves through the
same UX artifact. Allowed pairs are checked by type:

```ts
type ProductRealization = {
  id: string;
  productRef: string; // product:<id>
  uxRef: string;      // ux:<kind>:<id>
  relation: "pursues" | "realizes" | "constrains" | "exposes-gap";
  status: "proposed" | "accepted";
  rationale: string;
};

type TraceGap = {
  id: string;
  sourceRef: string; // product or UX address
  expectedTargetKind: string;
  reason: "unmapped" | "missing-product-decision" |
          "missing-ux-detail";
  owner: ExistingProductOwner;
  explanation: string;
};

type UISceneTrace03 = Omit<ExistingUIScene, "state"> & {
  stateRef: string;
  depictsRefs: string[]; // exact UX flow nodes, states, feedback, or frames
};

type UIComposition03 = Omit<ExistingUIComposition,
  "schemaVersion" | "uxSource" | "scenes"> & {
  schemaVersion: "0.3";
  uxArtifactBinding: { id: string; revision: string; sha256: string };
  scenes: UISceneTrace03[];
};
```

| Relation      | Product source         | UX target                                       |
| ------------- | ---------------------- | ----------------------------------------------- |
| `pursues`     | Goal                   | Use case                                        |
| `realizes`    | Requirement            | Use case, flow node, action, state, or feedback |
| `constrains`  | Rule                   | Use case, flow node, action, or state           |
| `exposes-gap` | Unresolved product gap | Open UX question                                |

`exposes-gap` does not resolve the product gap. A product requirement consumed
by UX needs a valid realization or an explicit trace gap. A technical-only
record need not invent a UX manifestation. Accepted `pursues`, `realizes`, and
`constrains` links require current, resolved endpoints. A proposed UI scene
may have valid `depictsRefs`, but it cannot count as a published comp until
verified resources exist.

Each UI scene already binds a surface, frame, state, and use cases. Its `state`
field becomes an exact `stateRef`; new `depictsRefs` name the semantic elements
shown, including a particular decision or feedback state. Existing scene-node
action and affordance links remain. Validate that each depicted element is
reachable from the scene's use cases, compatible with the bound frame and
state, and current in the bound UX revision. The packaged context derives UI
coverage diagnostics after UI is available: a missing scene is
`missing-ui-evidence`; an omitted link on an existing scene is `unmapped`.
These are distinct from an unresolved product decision or an incomplete UX
flow, and they do not mutate the UX artifact.

## Small graph and contrasting synthetic cases

The link direction for one generic behavior is:

```text
product goal -> UX use case -> ordered flow nodes -> UX state/feedback
product requirement -> UX flow node/action
product rule -> UX decision
UX frame/state/flow node -> UI scene depiction
```

A sparse **garden log** could have one `record-harvest` capability, one
`remember-harvest` goal, one `save-harvest-entry` requirement, and one UX
`record-harvest` use case with a single step and saved feedback. An unresolved
reminder-policy gap stays in the product model and, if relevant, links to one
UX question. No empty dialog, shared-component, or extra-document structure
is required.

A developed **workshop reservation** could have `reserve-tool` and
`change-reservation` use cases. Both invoke one equipment-availability
component subflow, while a `prevent-double-booking` product rule constrains
its availability decision. Each use case has its own entry, branches, and
outcome. One shared dialog frame can depict the decision, and different scene
states can show available and unavailable outcomes. Changing the rule finds
both use cases through the same explicit link graph. This example tests
reuse and impact traversal without making its product nouns or workflow a
schema default.

For example, that trial would carry links like these, bound to exact model
and UX revisions:

```json
{
  "id": "double-booking-availability",
  "productRef": "product:prevent-double-booking",
  "uxRef": "ux:flow-node:availability-decision",
  "relation": "constrains",
  "status": "accepted",
  "rationale": "This decision blocks a reservation when equipment is unavailable."
}
```

Both use cases would invoke the same component-owned availability subflow;
a scene depicting its unavailable state would name
`ux:state:equipment-unavailable` in `depictsRefs`.

Neither example determines document count or page boundaries. The
`document-structure` agent decides those later from the validated context and
inventory outline.
