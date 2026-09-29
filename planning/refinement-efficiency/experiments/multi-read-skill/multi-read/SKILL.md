---
name: multi-read
description: Collect a supplied wave of independent MCP reads in parallel, retaining exact results for the calling workflow.
---

Inputs: assigned `access` and a manifest of known independent `workflow_read` arguments. The manifest bounds this invocation; it need not cover entire documents.

1. Issue every manifest entry as a separate native `workflow_read` call **in parallel, in one model response**. Use the supplied arguments unchanged. Do not wait for one result before issuing another entry in the wave.
2. After the wave returns, account for every entry. Retain the original results in context; do not rewrite, summarize, or interpret their product content during collection.
3. Retry only failed or truncated entries. Retain successful entries. Report any batching or delivery deviation explicitly; do not silently accept serialized execution as contract compliance.
4. Return completion and outstanding continuations to the caller. Do not fetch outside the manifest. A subsequent wave must use actual returned `nextOffset` values, never guessed offsets.

If native parallel calls are unavailable, report that limitation without substituting a different transport. Do not change output limits or start another agent.
