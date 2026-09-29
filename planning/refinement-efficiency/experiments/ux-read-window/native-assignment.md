Run only this authorized native MCP tool-delivery capability probe. Do not spawn agents, load role instructions, inspect files, research or interpret product data. The external observer records calls and checks data. Do not change model, reasoning effort, client output limits or configuration.

Run: {{RUN}}
Assigned access: {{ACCESS}}
Facts handle: {{FACTS}}
UX handle: {{UX}}

Issue these {{READ_COUNT}} independent native workflow_read calls in parallel. Every call uses the assigned access and the specified handle and offset:

{{READ_REQUESTS}}

All arguments are supplied above; no read depends on another result. Use separate tool calls, each with its own result.

After all results are available, use a native workflow_store to save {kind:"ux-replay-phase",phase:"inputs-ready"}, and return NATIVE_COMPLETED. This marker means all reads completed. The external observer alone evaluates batching, delivery order and data integrity. Do not inspect or interpret the returned product data or judge the delivery sequence between calls.

If top-level tool search is available, you may use it once to expose native workflow_read and workflow_store. If tools are available only through functions.exec or another JavaScript/code-mode wrapper, return exactly NATIVE_UNAVAILABLE: MCP tools are exposed only through the code wrapper. Do not call that wrapper, create a program, use shell/network access, try guessed tool names, change settings, or substitute the already-tested Promise.all arrangement. Do not perform any product or repository writes.
