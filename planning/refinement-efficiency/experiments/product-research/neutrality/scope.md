# Tutor scheduling: bounded research agenda

Source: parent assignment in the current conversation, fully read. Captured 2026-10-02 17:27:57 UTC. No external product input, expected taxonomy, prior design or prior research was supplied. No saved evidence existed in this assigned output directory at initial inspection.

Provenance: DEFAULT in-session agent applying `agents/product-researcher.toml` and `planning/implementation-agents/product-researcher.md`; this is not proof of execution through the unavailable named role or its configured model/reasoning settings. Shared research guidance was read completely. Codex documentation junction resolves to this repository's documentation; its parent is the governance root.

Owner facts: a desktop application for one independent tutor; local files; no account; one calendar. Schedule a session with learner and duration. Reschedule while retaining notes. Cancel with confirmation. Show time clashes. Preserve drafts if saving fails. Later amendment: canceled sessions remain searchable history rather than disappearing. The amendment controls cancellation history; it does not weaken the other requirements.

| Area | Task rationale and question | Priority / next need |
| --- | --- | --- |
| Create and move a session | Tutor places learner and duration into the calendar, sees clashes, and changes time without losing notes. What must remain visible while comparing times? | Covered for handoff; ordinary task planning by UX, no new research in this trial. Clash warning versus blocking is unresolved owner policy. |
| Cancel and find a past session | Tutor confirms the correct session, then can find its canceled record. How should confirmation describe the retained-history outcome and avoid reporting success before a failed save? | R1, consequential interaction selected for one bounded primary-source inquiry. |
| Recover unfinished work | Tutor can resume a draft when saving fails, across creation, rescheduling and cancellation. What information does failure recovery need? | Shared concern linked to R1; broader restart/crash survival is not specified and needs owner/technical evidence only if proposed. |

R1 will inspect a directly applicable accessibility standard and official desktop interaction guidance. Research can advise wording, verification and recovery, but cannot choose the final UX or storage behavior. No visual inspection, cross-product convention claim, technical implementation, learner accounts, multiple calendars, remote messaging or billing is in scope. Session recurrence and time zones were not requested and are excluded from this small trial.

Handoff dependencies: UX chooses confirmation layout and history entry points. Parent/model must resolve whether canceled sessions stop occupying calendar time; the amendment specifies search retention but leaves this consequence implicit. Technical feasibility of local persistence and crash recovery is outside this research.
