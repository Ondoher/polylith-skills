# Staged UX input pilot execution

Status: in progress, 2026-09-29. Authorized through stage 3 of the
[plan](staged-ux-input-plan.md), under the personal independent-execution skill.
Stop after the matched three-task pilot and its evidence report. No full-product
pair, independent UX review, downstream repair or UI run is authorized here.

## Decisions and progress

- Reuse the original saved facts and UX baseline; never supply previous authored
  answers to either condition. Only experiment tooling and documentation change.
- Limit the pilot to Update Named Clip, Save Clip to Library and occurrence trim.
  These are source-defined local tasks with shared persistence and recovery rules.
  Assemble exact source projections, deduplicate shared records, and freeze the
  quality rubric before either author starts.
- Run all-input-first (A), then staged (B), sequentially. Keep model/effort and
  eventual inputs equal; acknowledge order/cache effects and single-pair limits.
- Keep one thread per condition. The documented continuation mechanism is
  [`codex exec resume <SESSION_ID>`](https://developers.openai.com/codex/noninteractive#resume-a-non-interactive-session),
  confirmed by the installed CLI. Each task uses the same continuation handshake;
  generic role instructions are not deliberately reloaded between tasks.
- Stages 1–2 use local checks and saved data. Paid execution starts only after
  input projections, exposure scope and protocol mechanics are checked.
- The first partition put 72,338 bytes into shared context. Revise once before
  the pilot: move task-specific frames/research into their task and omit unrelated
  research from both conditions' declared scope. The frozen second partition has
  25,217 shared bytes and task packets of 20,415, 19,896 and 29,956 bytes. All values
  are verified exact source projections; duplicates are removed by source pointer.
- Stage 1 completed: frozen packets at `.codex-tmp/staged-ux-pilot/packets-02/`,
  construction 17.089ms. Requirements, task order and quality rubric are frozen.
- Stage 2 completed: real MCP local preparation checks for both conditions passed.
  Including current identities, each eventual input is 101,313 bytes in six pages.
  Staged grants reject future-packet reads; received bytes reconstruct each input
  hash exactly. Preparation/checks took 2,294.528ms and 2,407.614ms. All 611 live
  files stayed unchanged. Same-thread continuation syntax passed installed CLI
  parsing; actual three-turn continuity will be recorded during stage 3.

Useful metrics, implementation decisions, verification and checkpoints will be
recorded here as each stage completes. Raw product data remains in ignored scratch.
