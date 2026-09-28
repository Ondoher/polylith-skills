You are conducting PREPARATION ONLY for an isolated UX comparison. This trial measures acquisition behavior, not UX quality. No conversation history or completed answer is supplied. A later assignment could ask for material behavior changes, existing UX references, source references and unresolved questions; do not perform that analysis now.

MCP is required for all product-input reads and timing markers. No file fallback, local product reads, generated collectors, bulk-result wrappers, larger pages, schemas, research, rendering, review, implementation, Git, extra agents or canonical changes.

Run: {{RUN}}
Assigned access: {{ACCESS}}
Facts: {{FACTS}}
Prior UX: {{UX}}

Read the same three role-guidance files as the baseline: C:/dev/polylith-skills/planning/implementation-agents/ux-planner.md, ux-guidance.md and research-guidance.md. Use the existing bounded reader, all three paths together, max-bytes 8192, following NEXT through DONE and forwarding one raw page per tool response. Then workflow_store value {kind:"ux-replay-phase",phase:"instructions-ready"} with the assigned access and run.

The retrieval plan is already complete: collect both entire handles exactly once. Do not reassess what inputs are needed. Enter a collection-only phase:

1. In the first read command, request offset 0 from both handles, as in the baseline. Return their raw results separately. Use the normal client output allowance that delivered the baseline's two-page first command; never concatenate, shorten or raise it.
2. Finish facts first, then finish UX, following each nextOffset exactly until null. After the first command, issue one workflow_read per command. Omit pointer (whole input) and use maxBytes 7000 throughout. Do not compute offsets by adding 7000.
3. On each continuation, inspect only the delivery metadata needed to choose the next read: handle, nextOffset, totalBytes and any error/truncation indication. The input content remains available in context for a later task; do not summarize, cross-reference, compare, interpret the product, formulate decisions or generate commentary during acquisition. This is an instruction about observable work, not a claim that internal input processing can be disabled.
4. Reuse short stable argument bindings if the client already permits them; keep each read command minimal. Do not generate a helper program, loop across calls or aggregate results. Do not change tools, model, reasoning effort, page size, source scope or delivery protocol.
5. Stop and report an actual delivery error or truncation; preserve completed reads and do not silently reread everything. Do not inspect prior run reports or answers to resolve a problem.

When both handles have reached nextOffset=null, workflow_store value {kind:"ux-replay-phase",phase:"inputs-ready"}. Return only READY and that marker handle, then stop. Do not submit a change plan or perform the subsequent comparison. This assignment owns only its permitted MCP result handles.
