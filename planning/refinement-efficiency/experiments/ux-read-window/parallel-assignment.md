Run only this authorized isolated MCP delivery experiment. Do not spawn agents, load role guidance, inspect files, research, interpret product contents or perform product work. No file fallback. Use the currently configured model/effort. The external observer saves timings and checks source bytes; do not calculate hashes yourself.

Run: {{RUN}}
Assigned access: {{ACCESS}}
Facts handle: {{FACTS}}
UX handle: {{UX}}

Find workflow_read and workflow_store in the available tools. Prepare short reusable bindings through functions store/load once: exact read tool name, common access, the two handles and offset zero. Use the same bindings for all cases. Leave client output-token allowances at their existing defaults: no overrides, yield_control, extra output, compression, summaries, selected fields or nested collectors. The server supports each requested page size. These are independent first-page probes; ignore nextOffset. Repeating these specified reads is intentional.

Store the marker {kind:"ux-replay-phase",phase:"instructions-ready"} using the assigned access and run. Then execute exactly these nine separate functions.exec commands in this order. Put the indicated CASE comment at the top of each command so the observer can identify the case. Return complete raw MCP results through text(). No narration or product interpretation between commands.

1. `// CASE: separate-r1-facts` — read the facts handle with maxBytes 14000, offset 0; emit the raw result.
2. `// CASE: separate-r1-ux` — read the UX handle with maxBytes 14000, offset 0; emit the raw result.
3. `// CASE: parallel-r1` — in one command, start both 14000-byte reads with Promise.allSettled, await both, then emit the two raw fulfilled values through two separate text() calls, facts first. Preserve any rejection as an explicit error.
4. `// CASE: serial-r1` — in one command, await and emit the 14000-byte facts read, then await and emit the 14000-byte UX read. Do not use Promise.all here.
5. `// CASE: serial-r2` — repeat the same serial pair in one command.
6. `// CASE: parallel-r2` — repeat the same parallel pair in one command.
7. `// CASE: separate-r2-facts` — read the facts handle with maxBytes 14000, offset 0 in one command.
8. `// CASE: separate-r2-ux` — read the UX handle with maxBytes 14000, offset 0 in a separate command.
9. `// CASE: parallel-28k` — start both reads with maxBytes 28000 and offset 0 in parallel using Promise.allSettled. Await both and emit their two complete raw fulfilled values separately, facts first, in this single command. Do not raise the output allowance or split the command to avoid a size failure; finding the delivery boundary is the purpose of this final case.

Do not combine multiple numbered commands or execute the complete case list in a helper loop. Within each parallel command the two tool calls must be started before awaiting either. The serial commands intentionally await the first before starting the second. Keep each command concise; do not introduce timing messages, per-case markers or new bookkeeping into the measured commands.

If a result is visibly truncated, preserve it and continue the remaining independent cases without retrying. Stop on a tool error. After all nine commands, workflow_store {kind:"ux-replay-phase",phase:"inputs-ready"} with the assigned access and run. Return only completion and any observed truncation. No subsequent product reasoning, file reads, repairs or follow-up tasks.
