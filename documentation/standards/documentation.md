# Standards Governance

<!-- rule: DOCUMENTATION-001 -->
This document is the canonical reference for how global engineering standards, folder applicability, repository-specific rules, normalization, and reviewer selection work together. It is written for developers maintaining the configuration and agents executing it.

<!-- rule: DOCUMENTATION-002 -->
Individual engineering rules live in subject files under `$CODEX_HOME/documentation/standards`. This document governs their selection and composition; it does not duplicate those rules.

## Mental Model

<!-- rule: DOCUMENTATION-003 -->
Standards governance has three authoritative layers:

<!-- rule: DOCUMENTATION-004 -->
| Layer              | Canonical location                         | Question answered                                                                            |
| ------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Global standards   | `$CODEX_HOME/documentation/standards/*.md` | What is the shared engineering rule?                                                         |
| Folder manifest    | `agents/topics/standards/manifest.md`      | Which named standards set governs each repository folder?                                    |
| Repository overlay | `agents/topics/standards/overlay.md`       | What local rule adds to or replaces one canonical section within repository or folder scope? |

<!-- rule: DOCUMENTATION-005 -->
Topics own product and work context. They do not select, exclude, add, replace, or otherwise alter engineering standards. A change of topic can refresh a reviewer's contextual understanding, but the paths in the review unit determine standards applicability.

## Effective Standards For A File

<!-- rule: DOCUMENTATION-006 -->
Resolve the effective rules independently for each reviewed file:

<!-- rule: DOCUMENTATION-007 -->
1. Find every folder assignment whose folder is an ancestor of the file.
<!-- rule: DOCUMENTATION-008 -->
2. Select the longest matching folder path. The root assignment `.` matches every file.
<!-- rule: DOCUMENTATION-009 -->
3. Expand the assigned named set through its `Extends` chain.
<!-- rule: DOCUMENTATION-010 -->
4. Load every canonical standard in the expanded set.
<!-- rule: DOCUMENTATION-011 -->
5. Apply matching repository and ancestor-folder `ADD` entries.
<!-- rule: DOCUMENTATION-012 -->
6. For each canonical target with matching `REPLACE` entries, apply the replacement with the longest folder scope. A repository-scoped replacement is less specific than every folder replacement.

<!-- rule: DOCUMENTATION-013 -->
The resulting rules are:

<!-- rule: DOCUMENTATION-014 -->
```text
effective rules(file) = expanded standards set for longest folder assignment
                      + matching ADD entries
                      - canonical rules superseded by matching REPLACE entries
                      + most-specific matching replacement rules
```

<!-- rule: DOCUMENTATION-015 -->
Applicability is path-based and comes from the declared manifest. File contents do not silently select an additional standard or force reconciliation. After first normalization, the engineer may revise folder assignments directly when the declared applicability should change.

## Required Repository Shape

<!-- rule: DOCUMENTATION-016 -->
```text
AGENTS.md
agents/topics/
  active-topic.md
  standards/
    manifest.md
    overlay.md
    reconciliation.md
    normalization.json
```

<!-- rule: DOCUMENTATION-017 -->
- `manifest.md` defines reusable standards sets and assigns them to folders.
<!-- rule: DOCUMENTATION-018 -->
- `overlay.md` is the only repository-owned engineering standards file.
<!-- rule: DOCUMENTATION-019 -->
- `reconciliation.md` records audit findings and developer decisions.
<!-- rule: DOCUMENTATION-020 -->
- `normalization.json` attests the repository-owned standards configuration.
<!-- rule: DOCUMENTATION-021 -->
- `active-topic.md` routes work context only; it is not standards configuration.

## Global Standards Ownership

<!-- rule: DOCUMENTATION-REVIEW-001 -->
Canonical standards use permanent HTML rule annotations with identities such as `STANDARD-001` for reviewable body blocks. Preserve existing IDs when editing or moving a rule; assign an unused ID to every new prose paragraph, list item, table, or example. The review inventory rejects uncovered content. Each block's complete obligations must be evaluated, including connected requirements in prose and responsibility matrices. IDs and generated inventories add identity and coverage metadata; they do not replace canonical prose or change folder and overlay precedence. See the review-standards evidence ledger protocol for mandatory primary evidence, independent audits, and aggregate validation.

<!-- rule: DOCUMENTATION-022 -->
Global engineering standards live only under `$CODEX_HOME/documentation/standards`. Repositories reference them rather than copying or forking them. A broadly reusable rule belongs in its canonical global document.

<!-- rule: DOCUMENTATION-023 -->
Canonical standards are loaded fresh for each review. Updating only a global standard does not invalidate repository attestations because those attestations certify repository-owned configuration, not frozen copies of global prose.

## Folder Standards Manifest

<!-- rule: DOCUMENTATION-024 -->
Every normalized repository keeps `agents/topics/standards/manifest.md` with exactly one `## Standards Sets` section and one `## Folder Assignments` section.

### Standards sets

<!-- rule: DOCUMENTATION-025 -->
A named set has a lowercase kebab-case name, extends either one other named set or `none`, and lists only the canonical standards it adds:

<!-- rule: DOCUMENTATION-026 -->
```markdown
## Standards Sets

### `base`

Extends: none
Standards:

- [documentation.md](<resolved canonical link>) — Standards governance applies.
- [code-conventions.md](<resolved canonical link>) — Shared source conventions apply.

### `browser-ui`

Extends: base
Standards:

- [react.md](<resolved canonical link>) — This folder contains React interfaces.
- [accessibility.md](<resolved canonical link>) — User interfaces require accessibility review.

### `server`

Extends: base
Standards:

- [server.md](<resolved canonical link>) — This folder contains server routes and services.
- [data-persistence.md](<resolved canonical link>) — This folder owns persisted application data.
```

<!-- rule: DOCUMENTATION-027 -->
Set rules:

<!-- rule: DOCUMENTATION-028 -->
- Set names use lowercase letters, digits, and hyphens and begin with a letter.
<!-- rule: DOCUMENTATION-029 -->
- `Extends` names one set or `none`. Inheritance cycles and missing parents are invalid.
<!-- rule: DOCUMENTATION-030 -->
- A child inherits its parent's complete expanded set and lists only additions.
<!-- rule: DOCUMENTATION-031 -->
- Repeating an inherited standard is invalid.
<!-- rule: DOCUMENTATION-032 -->
- A standard may appear in multiple unrelated sets, but every occurrence must resolve to the same canonical file.
<!-- rule: DOCUMENTATION-033 -->
- The union of all expanded sets is the repository's standards ceiling. An overlay cannot target a standard absent from that union.
<!-- rule: DOCUMENTATION-034 -->
- To omit a parent standard, define a sibling set from a smaller parent. Sets have no subtraction operation.
<!-- rule: DOCUMENTATION-035 -->
- Each bullet uses a canonical Markdown link and a concise repository applicability reason. Standards prose does not belong in the manifest.

### Folder assignments

<!-- rule: DOCUMENTATION-036 -->
Assign named sets to normalized repository-relative directory prefixes:

<!-- rule: DOCUMENTATION-037 -->
```markdown
## Folder Assignments

- `.` — `base` — Repository-root files use the base set.
- `src/` — `browser-ui` — Browser application source uses the UI set.
- `server/` — `server` — Server source uses the server set.
- `src/admin/` — `admin-ui` — The admin subtree uses its more specific set.
```

<!-- rule: DOCUMENTATION-038 -->
Assignment rules:

<!-- rule: DOCUMENTATION-039 -->
- `.` is required and supplies a deterministic fallback for every repository file.
<!-- rule: DOCUMENTATION-040 -->
- Other paths end in `/`, use `/` separators, contain no `.` or `..` segments, and contain no glob syntax.
<!-- rule: DOCUMENTATION-041 -->
- Every assigned folder must exist when the repository is normalized.
<!-- rule: DOCUMENTATION-042 -->
- Each folder appears once and names an existing set.
<!-- rule: DOCUMENTATION-043 -->
- The longest matching directory prefix wins. Manifest order is not precedence.
<!-- rule: DOCUMENTATION-044 -->
- An assignment replaces its ancestor assignment for that subtree; it does not merge two assigned sets.
<!-- rule: DOCUMENTATION-045 -->
- Use named-set inheritance when related folders need a shared base.
<!-- rule: DOCUMENTATION-046 -->
- Add a deeper assignment whenever a subtree needs a meaningfully different standards set.
<!-- rule: DOCUMENTATION-047 -->
- Files directly at repository root use the `.` assignment.

<!-- rule: DOCUMENTATION-142 -->
- In a multi-app repository, assign each app-owned source or server subtree explicitly whenever sibling apps require different standards sets. A shared parent assignment is sufficient only when every child app genuinely has the same effective standards. Adding an app includes deciding and normalizing its folder assignments before standards-driven work begins there.

<!-- rule: DOCUMENTATION-143 -->
- A discovered application repository owns its own `AGENTS.md`, topics, standards manifest, overlay, reconciliation, and normalization attestation. A server-root repository's folder manifest governs only host-owned files and resident apps; it does not flow into an independently rooted child repository merely because that repository is located below a configured discovery directory. Build and deployment composition do not merge standards authority or review evidence across repository roots.

<!-- rule: DOCUMENTATION-048 -->
This directory-prefix model deliberately excludes general globs. Exact folder ancestry gives developers and agents one deterministic answer without pattern-order surprises.

## Repository Standards Overlay

<!-- rule: DOCUMENTATION-049 -->
`agents/topics/standards/overlay.md` is the sole repository authority for local engineering-rule differences. It supports:

<!-- rule: DOCUMENTATION-050 -->
- `ADD`: retain the targeted canonical rule and add a local requirement.
<!-- rule: DOCUMENTATION-051 -->
- `REPLACE`: supersede only the targeted canonical section in the matching scope.

<!-- rule: DOCUMENTATION-052 -->
An empty overlay contains:

<!-- rule: DOCUMENTATION-053 -->
```markdown
# Repository Standards Overlay

None.
```

### Entry syntax

<!-- rule: DOCUMENTATION-054 -->
```markdown
## ADD: Generated fixture provenance

Extends: testing.md#Generated Output
Scope: folder:tests/integration/
Rule: Generated fixtures must record the generator version.
Reason: These fixtures depend on an external protocol version.
```

<!-- rule: DOCUMENTATION-055 -->
```markdown
## REPLACE: Legacy adapter package boundary

Replaces: architecture.md#Package Boundaries
Scope: folder:packages/legacy-adapter/
Rule: The adapter may import the compatibility package directly.
Reason: This folder is the approved external-system boundary.
```

<!-- rule: DOCUMENTATION-056 -->
Entry rules:

<!-- rule: DOCUMENTATION-057 -->
- Every entry has a descriptive `## ADD:` or `## REPLACE:` heading.
<!-- rule: DOCUMENTATION-058 -->
- `ADD` uses `Extends`; `REPLACE` uses `Replaces`.
<!-- rule: DOCUMENTATION-059 -->
- Targets use `filename.md#Section Heading` and name the narrowest relevant section.
<!-- rule: DOCUMENTATION-060 -->
- `Scope` is exactly `repository` or `folder:<normalized-folder>/`.
<!-- rule: DOCUMENTATION-061 -->
- Folder scopes use the same normalized, existing directory syntax as assignments.
<!-- rule: DOCUMENTATION-062 -->
- The target standard must occur in at least one named set. For a file, the entry applies only when that file's selected set contains the target standard.
<!-- rule: DOCUMENTATION-063 -->
- `Rule` states the complete local requirement without copying the global rule.
<!-- rule: DOCUMENTATION-064 -->
- `Reason` explains why the difference is repository-specific.
<!-- rule: DOCUMENTATION-065 -->
- Topic names, packages, applications, and subsystems are represented by their owning folder paths, not symbolic scope types.

### Overlay precedence

<!-- rule: DOCUMENTATION-066 -->
For one file and canonical target:

<!-- rule: DOCUMENTATION-067 -->
- all matching `ADD` entries accumulate;
<!-- rule: DOCUMENTATION-068 -->
- the matching `REPLACE` with the longest folder scope wins;
<!-- rule: DOCUMENTATION-069 -->
- `repository` is less specific than every folder scope;
<!-- rule: DOCUMENTATION-070 -->
- duplicate replacements for the same target and exact scope are invalid; and
<!-- rule: DOCUMENTATION-071 -->
- semantically incompatible additions or replacements remain a reconciliation error even when their syntax is valid.

<!-- rule: DOCUMENTATION-072 -->
Folder specificity is the only local standards tiebreaker. File order, manifest order, topic order, and apparent subsystem importance have no precedence.

## Project Topics

<!-- rule: DOCUMENTATION-073 -->
Topics own facts that cannot be global standards, including product requirements, selected configuration, project paths, routes, data models, plans, decisions, current implementation state, operations, and verification evidence.

<!-- rule: DOCUMENTATION-074 -->
A topic may link to a canonical standard and describe how the project implements it. It must not contain standards selection, exclusions, additions, or replacements. The former `## Standards Review Scope` and `Scope: topic:...` mechanisms are invalid under this model.

<!-- rule: DOCUMENTATION-075 -->
If normalization finds standards prose or applicability controls in topics, it reports them as misplaced. The developer chooses whether to promote a reusable rule globally, map a folder to another set, add a folder-scoped overlay entry, replace the prose with a reference, or remove it.

## Reviewer Selection Algorithm

<!-- rule: DOCUMENTATION-076 -->
For each review unit, the orchestrator:

<!-- rule: DOCUMENTATION-077 -->
1. Loads applicable `AGENTS.md` instructions and work-context topics.
<!-- rule: DOCUMENTATION-078 -->
2. Confirms the repository has completed normalization at least once. Formatting is diagnosed at startup but does not determine reviewer eligibility.
<!-- rule: DOCUMENTATION-079 -->
3. Parses the named sets, folder assignments, and overlay.
<!-- rule: DOCUMENTATION-080 -->
4. Maps each changed or engineer-selected file to its longest matching folder assignment.
<!-- rule: DOCUMENTATION-081 -->
5. Expands the selected set for each file.
<!-- rule: DOCUMENTATION-082 -->
6. Applies matching folder overlay entries per file and canonical target.
<!-- rule: DOCUMENTATION-083 -->
7. Groups files by reviewer lane and applicable standards.
<!-- rule: DOCUMENTATION-084 -->
8. Uses the declared mapping without inferring additional standards from file contents.
<!-- rule: DOCUMENTATION-085 -->
9. Runs all applicable read-only lanes and supplies the per-path standards mapping.

<!-- rule: DOCUMENTATION-086 -->
At bootstrap, initialize the roster from the union of standards used by all folder assignments. Initialization establishes readiness; it is not a repository-wide compliance audit. During a task, reviewers evaluate only the declared review unit and apply each standard only to paths mapped to a set containing it.

<!-- rule: DOCUMENTATION-087 -->
A topic transition refreshes product context when repository instructions require it, but does not recalculate standards from topic content. Path changes, manifest changes, overlay changes, or canonical standards changes refresh the generated guide and affected reviewer context; they do not require renewed normalization.

## Priority And Precedence

<!-- rule: DOCUMENTATION-088 -->
First apply the runtime's normal instruction hierarchy. Within the standards layer:

<!-- rule: DOCUMENTATION-089 -->
1. **Folder assignment:** the longest matching directory assignment selects one named set.
<!-- rule: DOCUMENTATION-090 -->
2. **Set expansion:** the selected set's inheritance chain supplies canonical standards.
<!-- rule: DOCUMENTATION-091 -->
3. **Canonical base:** all rules in those standards apply to the file.
<!-- rule: DOCUMENTATION-092 -->
4. **Matching additions:** repository and ancestor-folder `ADD` rules accumulate.
<!-- rule: DOCUMENTATION-093 -->
5. **Specific replacement:** the longest matching folder `REPLACE` supersedes its target; repository scope is least specific.
<!-- rule: DOCUMENTATION-094 -->
6. **Interpretation gate:** invalid syntax, cycles, missing folders, conflicting links, duplicate equal-scope replacements, or incompatible rules block the affected review because the current mapping cannot be resolved. After first normalization, repair current configuration directly; renewed reconciliation is not required.

<!-- rule: DOCUMENTATION-095 -->
No topic, generated guide, report, prompt, or agent memory can change this result.

## Generated Developer Guide

<!-- rule: DOCUMENTATION-096 -->
The global `write-standards-guide` skill may generate root `STANDARDS.md`. It renders named sets with GitHub links to canonical standards on the governance repository's configured default branch, folder assignments, repository/folder overlay entries with canonical section links, and separate hashes for repository configuration, local overrides, selected local canonical standards, and the combined guide source. Derive the publication destination from the owning checkout's `governance.json` and include it in the combined fingerprint; keep consumer manifest and overlay links repository-relative. Skills and reviewers still resolve canonical rules from local files. GitHub links show the latest published branch contents, which may differ from unpublished local inputs. The `update-standards` skill checkpoints and publishes the complete reviewed governance repository to refresh those public-facing documents. The guide is a human-readable projection, not another standards input.

<!-- rule: DOCUMENTATION-097 -->
Agents resolve effective rules from the manifest, canonical documents, and overlay. A stale or missing guide does not invalidate normalization. Standard bootstrap and reviewer preflight regenerate it automatically.

## Normalization And Attestation

<!-- rule: DOCUMENTATION-098 -->
Normalization proves that repository-owned standards configuration received a deliberate initial review; it does not audit application code or certify that the configuration remains unchanged.

<!-- rule: DOCUMENTATION-099 -->
Audit and reconciliation remain separate:

<!-- rule: DOCUMENTATION-100 -->
- Audit reports divergent rules, misplaced standards, missing folder mappings, malformed sets, invalid inheritance, missing capability coverage, and overlay problems without applying decisions.
<!-- rule: DOCUMENTATION-101 -->
- The developer manually selects every disposition.
<!-- rule: DOCUMENTATION-102 -->
- Reconcile applies only recorded decisions after explicit instruction.

<!-- rule: DOCUMENTATION-103 -->
Normalization cannot complete while a decision is pending, ambiguous, or deferred. After successful first reconciliation, `normalization.json` permanently records that completion and may retain initial input hashes as provenance. Later changes to instructions, the manifest, overlay, or canonical standards do not invalidate the marker and do not require another reconciliation.

<!-- rule: DOCUMENTATION-104 -->
Validate with:

<!-- rule: DOCUMENTATION-105 -->
```text
node <codex-root>/skills/normalize-standards/scripts/standards-attestation.mjs validate --repo <repository-root>
```

<!-- rule: DOCUMENTATION-106 -->
Only first reconciliation may create an existing repository's durable normalization marker. Do not refresh or revoke it for later standards changes. The fresh-project initializer retains its narrow no-divergence exception.

## Change Workflows

### Change folder applicability

<!-- rule: DOCUMENTATION-107 -->
1. Add or revise named sets and folder assignments in the manifest.
<!-- rule: DOCUMENTATION-108 -->
2. Resolve any syntax or path errors reported by the folder parser.
<!-- rule: DOCUMENTATION-109 -->
3. Refresh `STANDARDS.md` and affected reviewer context. Do not rerun normalization.

### Add or replace a local rule

<!-- rule: DOCUMENTATION-113 -->
1. Prefer the canonical global standard if the rule is broadly reusable.
<!-- rule: DOCUMENTATION-114 -->
2. Otherwise add one `ADD` or `REPLACE` entry using `repository` or `folder:<path>/` scope.
<!-- rule: DOCUMENTATION-115 -->
3. Refresh `STANDARDS.md` and affected reviewer context. Do not rerun normalization.

### Move or add code

<!-- rule: DOCUMENTATION-116 -->
Before adding a new top-level or semantically distinct nested folder, decide whether its nearest assignment supplies the correct set. If not, define or reuse a set and add a folder assignment as part of the same normalized change.

<!-- rule: DOCUMENTATION-117 -->
Moving a file can change its effective standards even when its contents do not change. Review the moved file under its destination mapping.

## Agent Operating Checklist

<!-- rule: DOCUMENTATION-118 -->
Before standards-driven work, an agent can answer:

<!-- rule: DOCUMENTATION-119 -->
- Which changed or selected paths are in scope?
<!-- rule: DOCUMENTATION-120 -->
- Which folder assignment wins for each path?
<!-- rule: DOCUMENTATION-121 -->
- Which named set and inheritance chain apply?
<!-- rule: DOCUMENTATION-122 -->
- Do all referenced canonical files resolve beneath the Codex standards root?
<!-- rule: DOCUMENTATION-123 -->
- Which repository and ancestor-folder overlay entries match each path?
<!-- rule: DOCUMENTATION-124 -->
- Can the current declared manifest and overlay be resolved for every in-scope path?
<!-- rule: DOCUMENTATION-125 -->
- Has the repository completed standards normalization at least once?
<!-- rule: DOCUMENTATION-126 -->
- Which reviewer lanes own the resulting per-path standards?

<!-- rule: DOCUMENTATION-127 -->
If any answer is ambiguous, report the configuration problem rather than inventing applicability.

## Developer Checklist

<!-- rule: DOCUMENTATION-128 -->
- Keep one required root assignment and add deeper assignments only for meaningful standards differences.
<!-- rule: DOCUMENTATION-129 -->
- Reuse named sets instead of repeating large lists for sibling folders.
<!-- rule: DOCUMENTATION-130 -->
- Keep set inheritance shallow and understandable.
<!-- rule: DOCUMENTATION-131 -->
- Use folder paths, not topics or globs, for applicability and local scope.
<!-- rule: DOCUMENTATION-132 -->
- Put local rules only in the overlay and target exact canonical sections.
<!-- rule: DOCUMENTATION-133 -->
- Edit the manifest or overlay directly after first normalization.
<!-- rule: DOCUMENTATION-134 -->
- Refresh the generated guide and affected reviewers after standards changes; do not rerun normalization.

## Loading Procedure

<!-- rule: DOCUMENTATION-135 -->
Ordinary sessions begin with `$bootstrap`:

<!-- rule: DOCUMENTATION-136 -->
1. Bootstrap loads applicable Codex-home and repository `AGENTS.md` instructions and work context.
<!-- rule: DOCUMENTATION-137 -->
2. Bootstrap invokes `review-standards` bootstrap mode.
<!-- rule: DOCUMENTATION-138 -->
3. Review preflight validates the durable ever-normalized marker, refreshes `STANDARDS.md` from current hashes, and reports formatting readiness without blocking reviewer startup. Formatting must pass before aggregate review can be declared clean or a checkpoint can be recommended.
<!-- rule: DOCUMENTATION-139 -->
4. The orchestrator parses the manifest and overlay, validates canonical links, and initializes the reviewer roster from the union of assigned sets.
<!-- rule: DOCUMENTATION-140 -->
5. Task reviews resolve standards per changed path using the deterministic folder helper.

<!-- rule: DOCUMENTATION-141 -->
Directly invoked normalization, guide, and review workflows load and validate their own authority without recursively invoking bootstrap.
