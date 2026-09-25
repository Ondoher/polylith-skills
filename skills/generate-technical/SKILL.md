---
name: generate-technical
description: Publish linked Markdown technical documentation from a validated frozen technical context. Use after refine-design technical preparation; do not reinterpret product prose or choose architecture.
---

# Generate technical guide

Publish an existing `technical` context mechanically. Preparation and decision reconciliation belong to [refine-design technical preparation](../refine-design/references/technical-preparation.md); this skill does not consult agents, inspect application source, or fill gaps.

The normal input is `product/<name>/contexts/technical/<material-sha256>/context.json`. The normal output is `documents/<name>/technical/` in the same repository, using the confirmed product folder name. A detached validated context can be exported to another output directory. Published pages are self-contained apart from links between the pages in that publication.

Run:

```text
node scripts/generate-technical.mjs --context <context.json> --output <output-directory>
```

The publisher formats every Markdown page with the destination repository's installed Prettier and resolved configuration before calculating receipt hashes or replacing owned output. Install that repository's declared dependencies first. A missing declared formatter blocks publication; do not format receipt-owned pages after publication.

The publisher validates the full frozen context before writing. It emits an overview of the current code and target direction, architecture with responsibility and lifecycle explanations, critical flows with ordered behavior and recovery, cross-boundary contracts when supplied, decisions with rationale and open questions, an implementation handoff that connects positive demonstrations to unresolved contracts, and a publication receipt. Facts, selected boundaries, conditional flows and contracts, decisions, and unresolved questions retain their status. The renderer does not claim that a target boundary is already implemented. Mermaid fenced blocks in `details.discussion` are carried into the corresponding record explanation, including focused-paper mappings, with their line breaks and syntax preserved. Preparation supplies the diagram and its context; publication does not infer diagrams from source files or promote their decision status. It includes relevant product meaning and evidence summaries in the pages rather than linking readers to support-data or source files. Give preparation records enough explanatory detail to support a readable technical guide; the publisher cannot turn terse labels into a technical argument. Re-resolve the context with `--repo` before publication when live source freshness matters; detached validation alone verifies a historical package.

When the prepared architecture contains an agent-derived feature or important-model map, preserve its explanation and links to product outcomes and technical boundaries. Do not add a compulsory feature tree, infer one feature per workspace, or fill missing detail with generic architecture text. A focused technical white paper is a separately authored input at its owner-supplied location, with its assessment and other support data under `product/<name>/`. There is no standard input folder; never relocate authored inputs into generated output directories. Verified `whitePapers` entries produce owned links in the index and a focused-paper mapping page. Technical records connected by exact paper-source evidence appear there; their open `gap` records also appear in the common decisions and handoff pages. A link alone does not accept paper proposals or populate technical records. Never create an empty paper or hand-edit a receipt-owned guide page to insert the link.

Use a dedicated output directory. On a repeat run, the publisher replaces only a directory whose prior receipt accounts for every file and whose generated files still match their recorded hashes. Move or reconcile human-authored material separately. Do not hand-edit generated pages. The receipt is an integrity record, not authenticated provenance. Publication checks linked ancestors and recovers a single verified backup left by an interrupted swap; ambiguous or altered transaction files block publication for inspection. The first-pass and hardening tests are described in [the delivery plan](../../planning/implementation-agents/technical-documentation-delivery-plan.md).
