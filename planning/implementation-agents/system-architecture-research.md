# System Architecture Research

Status: initial research collected 2026-09-16 for the assessment-only [system architecture planner](design.md#system-architecture-planning-agent). The general findings have been accepted and condensed into [assessment rules](system-architecture-guidance.md). This remains the supporting evidence notebook, not an agent definition or a change to product requirements. Technology-specific applicability limits still apply. Load source detail on demand rather than placing this entire notebook into every assessment.

## Scope And Evidence

Target personal, desktop, and modest application systems. Investigate capabilities, runtime placement, conceptual data/storage design, API boundaries, trust, and meaningful failure behavior. Polylith services, registries, React, and detailed implementation contracts remain with coding architecture and specialists. Scaling/distributed infrastructure needs an actual requirement before it becomes an assessment topic.

The sources below are original research papers, standards, and first-party documentation. They establish principles or specific mechanisms, not experimentally proven universal architecture choices. Each proposed application is our inference and remains subject to domain context. Living documentation must be rechecked against the installed version when a decision depends on its behavior.

## Database Preference And Source Applicability

Owner decision: MongoDB is the preferred database when a database is required. This preference does not require adding database persistence to every application or replacing an accepted product file format; the assigned product's established persistence decisions remain inputs.

Use SQLite research only for technology-independent storage questions, such as locality, access patterns, concurrent writers, portability, and operational burden. Do not recommend SQLite from these notes or transfer its single-writer model, locking, file layout, journaling, or durability mechanisms to MongoDB. PostgreSQL references likewise illustrate integrity/transaction questions; SQL constraints and relational schema assumptions are not MongoDB guarantees.

Before adopting database-specific assessment guidance, research MongoDB's own documentation for document/relationship modeling, embedding versus references, validation, atomicity and transactions, and workload-driven indexes. Distinguish independently updating facts from deliberate embedded/derived representations. Exact recommendations await that targeted research and the application's requirements. General system rules should remain technology-independent; MongoDB details belong in an optional technology reference.

## 1. Boundaries That Contain Change

Source: David L. Parnas, *On the Criteria To Be Used in Decomposing Systems into Modules*, CACM 15(12), December 1972. [Original paper transcription](https://www.cs.lafayette.edu/~gexia/cs301/resources/parnas.html), sections on decomposition criteria and efficiency; [publication identity](https://doi.org/10.1145/361598.361623). Evidence: original architectural argument with worked decompositions.

Finding: decomposition around hidden design decisions can localize change better than simply following processing steps. The paper also discusses costs associated with implementation boundaries.

Assessment inference: identify the decisions a system boundary contains, such as storage representation or host access, and the stable capability exposed across it. Distinguish a logical responsibility boundary from a process/network boundary; the paper does not prescribe microservices or one process per module.

Limit: this supports boundary reasoning, not a ready-made topology or proof that additional indirection improves a particular app. Leave class and feature decomposition to coding architecture.

## 2. Storage Choice From Actual Use

Source: SQLite project, [Appropriate Uses for SQLite](https://www.sqlite.org/whentouse.html), sections 1–3; living first-party documentation, accessed 2026-09-16.

Finding: SQLite explicitly targets local application/device storage and desktop application file formats. Its suitability differs from direct network access to a shared database and workloads needing simultaneous writers; a database file has one writer at a time.

Assessment inference: ask about document portability, query needs, data size, writer concurrency, and whether storage is local or accessed through a server. Use those questions to assess the existing file format and whether database persistence is needed; when it is, MongoDB is the preferred choice. An alternative needs a concrete requirement and an explicit owner decision. Do not choose by familiarity or speculative future scale.

Limit: SQLite documentation is authoritative about SQLite, not an impartial benchmark of all databases. No performance threshold is adopted. An assigned product's agreed file format remains an input; this research does not replace it with SQLite or authorize a database.

## 3. Conceptual Data Structure And Integrity

Source: PostgreSQL 18 documentation, [5.5 Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html), especially check, not-null, unique, primary-key, and foreign-key constraints. Evidence: first-party relational database behavior.

Finding: database constraints can enforce record validity, uniqueness, and relationships. Foreign-key actions make deletion/update consequences explicit; engine-specific details affect what can be enforced.

Assessment inference: identify major entities, relationships, identity needs, and consequential deletion behavior before selecting a schema shape. Establish which relationships require durable integrity guarantees, then collaborate with the model specialist on precise domain rules and representation. An ownership/relationship sketch can be sufficient at this stage.

Limit: not every domain invariant is a database constraint; these mechanisms do not choose product deletion semantics, identifier formats, or an appropriate database. They do not apply automatically to JSON files. Detailed schema and index work is deferred until access patterns and technology warrant it.

## 4. Atomic Operations And Durable Completion

Source: PostgreSQL 18 documentation, [3.4 Transactions](https://www.postgresql.org/docs/18/tutorial-transactions.html). Evidence: first-party explanation of transactional operations.

Finding: transactions group related database updates, allow rollback before commit, and establish a completion boundary for those updates.

Assessment inference: identify which changes must succeed together and what the app means by saved or completed. Keep the scope of the guarantee explicit. A database transaction does not automatically include an external file export or remote side effect; mixed-resource work requires its own failure assessment.

Limit: this is not a mandate for distributed transactions or a database. Durability depends on the actual engine/configuration and storage guarantees. UX and the owner determine acceptable loss/recovery behavior; the model specialist designs the resulting operations.

## 5. File Saving Requires A Failure Model

Source: SQLite project, [Atomic Commit in SQLite](https://www.sqlite.org/atomiccommit.html), introduction, hardware assumptions, and failure-related sections; living first-party engineering documentation, accessed 2026-09-16.

Finding: SQLite's atomic commit behavior relies on explicit storage assumptions and coordinated journaling, writing, and flushing mechanisms.

Assessment inference: even a small file-based app should distinguish normal save success from interrupted or incomplete saves and identify recovery expectations. Investigate actual operating-system/filesystem behavior before promising atomic replacement or durable persistence.

Limit: SQLite's algorithm is not a generic JSON-save recipe. Do not infer that an ordinary file write or rename has equivalent crash guarantees, and do not reimplement a database journal as a default. The next project-specific step is a narrow investigation of the selected save mechanism if needed.

## 6. API Semantics And Retry Safety

Source: [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html), June 2022, sections 9.2.1–9.2.2 and 15.3.3. Evidence: normative HTTP specification.

Finding: safe and idempotent methods have distinct semantics. A failed response does not establish that an operation never occurred; automatic retry of non-idempotent requests requires additional knowledge. A 202 response indicates acceptance, not successful completion.

Assessment inference: for boundary operations, distinguish reads from mutations, define duplicate-request consequences, and separate accepted work from completed work. For lengthy operations, identify how completion/failure is observed. These questions also help IPC design, but applying them to IPC is our analogy, not an RFC requirement.

Limit: no network API is required simply because a boundary exists. HTTP does not supply exactly-once execution, rollback, or application cancellation. Do not add queues, brokers, or retry frameworks without a demonstrated need.

## 7. Failure Contracts Without Exposing Internals

Source: [RFC 9457, Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html), July 2023, sections 3.1, 4, and 5. Evidence: normative HTTP error-format specification.

Finding: structured problem information can distinguish machine-readable problem identity from human-readable detail. Consumers should not parse prose for structured facts, and error responses should not expose sensitive implementation details.

Assessment inference: identify stable failure categories that permit callers to choose the agreed recovery path; leave user messaging to presentation/UX and diagnostics to the appropriate technical owner.

Limit: adopt the RFC representation only when it fits an HTTP boundary. Internal JavaScript or desktop IPC need not imitate its envelope. This is no justification for an elaborate universal error taxonomy.

## 8. Small Mechanisms And Narrow Privileges

Source: Jerome H. Saltzer and Michael D. Schroeder, *The Protection of Information in Computer Systems*, Proceedings of the IEEE, September 1975; author-hosted [Basic Principles of Information Protection](https://web.mit.edu/Saltzer/www/publications/protection/Basic.html), design principles. Evidence: original security design synthesis.

Finding: economy of mechanism, fail-safe defaults, and least privilege support understandable protection boundaries and constrained authority.

Assessment inference: identify what genuinely needs privileged access and expose a small purposeful capability instead of unrestricted underlying power. Keep the mechanism proportionate to the actual trust boundary.

Limit: a small local app still has trust boundaries, but these principles do not require enterprise identity infrastructure, multiple privilege tiers, or exhaustive security machinery absent relevant requirements. This is foundational reasoning, not a complete current security checklist.

## Condensation Record

The following research questions informed the separate assessment rules:

- What current requirement justifies each capability and system boundary?
- Who owns the data, who writes it, and what must remain consistent?
- Which operations must succeed together, and what counts as durable completion?
- What crosses each boundary, and what happens after failure, repetition, or interruption?
- Which runtime has the required APIs and privileges without unnecessary complexity?
- Which decisions need owner/UX input, installed-version verification, or a small experiment?

Retain existing agreed boundaries: system architecture frames major storage/API/runtime decisions; model and coding specialists determine detailed domain and implementation contracts; UX guides visible recovery. Technology recommendations must preserve accepted product constraints unless the owner changes them.

Separate the eventual compact general guidance from optional database, protocol, and host-platform references. Do not preload Polylith/React implementation standards into this role. Keep scaling, replication, distributed transactions, microservices, event sourcing, multi-region deployment, service meshes, and broker infrastructure out of the baseline; examine them only if a concrete requirement warrants it. This exclusion is our scope decision, not a claim that the sources prohibit those approaches.

## Remaining Research Limits

This pass is sufficient to discuss a small practical rule set; it is not a technology selection or agent readiness review. It has not benchmarked storage/media options, validated a save implementation, selected an API transport, or determined schema migration/backup policy. Version migration and recovery deserve targeted research when the product needs them. No new product requirements, canonical standards, or deployed agent definitions are created by this notebook.
