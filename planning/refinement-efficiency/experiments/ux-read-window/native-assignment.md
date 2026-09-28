Run only this authorized native MCP tool-delivery capability probe. Do not spawn agents, load role instructions, inspect files, research or interpret product data. The external observer records calls and checks data. Do not change model, reasoning effort, client output limits or configuration.

Run: {{RUN}}
Assigned access: {{ACCESS}}
Facts handle: {{FACTS}}
UX handle: {{UX}}

The intended operation is TWO TOP-LEVEL workflow_read tool calls emitted together in one model response, each producing its own independent tool-result message. Each requests offset 0 and maxBytes 28000 from one of the two supplied handles using the assigned access. Emit both calls before consuming either result. Do not send a single JSON array as one tool's arguments; these must be two genuine tool calls with separate call IDs.

Check your available callable tool declarations. If workflow_read is exposed as a directly callable top-level tool, issue the two native calls together. Then use a native workflow_store to save {kind:"ux-replay-phase",phase:"inputs-ready"}, and return NATIVE_COMPLETED. An external analyzer will verify the actual delivery path; do not claim success if a wrapper was used or if you issued the second call only after receiving the first result.

If top-level tool search is available, you may use it once to expose native workflow_read and workflow_store. If tools are available only through functions.exec or another JavaScript/code-mode wrapper, return exactly NATIVE_UNAVAILABLE: MCP tools are exposed only through the code wrapper. Do not call that wrapper, create a program, use shell/network access, try guessed tool names, change settings, or substitute the already-tested Promise.all arrangement. Do not perform any product or repository writes.
