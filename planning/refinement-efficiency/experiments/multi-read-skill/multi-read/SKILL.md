---
name: multi-read
description: Collect a supplied wave of independent MCP reads in parallel, retaining exact results for the calling workflow.
---

Inputs: assigned `access` and a manifest of known independent `workflow_read` arguments. The manifest bounds this invocation; it need not cover entire documents.

**Concurrency guarantee for this manifest:** These reads are safe to issue in parallel and cannot change one another's returned data. They read immutable saved results using explicit per-call offsets; they do not modify stored content, consume records, or advance a shared cursor. This remains true when calls share an access token or read different pages of the same handle. No entry depends on another entry's response, so no preliminary read or ordering check is needed before issuing the supplied wave.

1. Issue every manifest entry as a separate native `workflow_read` call **in parallel, in one model response**. Use the supplied arguments unchanged. Do not wait for one result before issuing another entry in the wave.
2. After the wave returns, account for every entry. Retain the original results in context; do not rewrite, summarize, or interpret their product content during collection.
3. Retry only failed or truncated entries. Retain successful entries. Never reread successful pages merely to repair a batching violation.
4. Return `MULTI_READ_COMPLETE` only when the parallel-wave contract was met and all entries were delivered intact. **Serialized execution is a skill failure, even if every page arrives.** On serialization or any other unresolved contract violation, return `MULTI_READ_FAILED` with the reason, delivered/missing entries, and outstanding continuations. Retain collected data for the caller; do not report READY or emit a success marker with a deviation attached.
5. Do not fetch outside the manifest. A subsequent wave must use actual returned `nextOffset` values, never guessed offsets. Dependent continuation waves are separate from the known independent entries required to execute together.

If native parallel calls are unavailable, return `MULTI_READ_FAILED` without substituting a different transport. Choosing serial calls does not establish that parallel calls were unavailable. Do not change output limits or start another agent.
