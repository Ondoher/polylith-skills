# Document format preview

Open [Product requirements](prd.html), [Application overview](interactions.html),
[Record a harvest](record-harvest.html), or [Design language](design-language.html)
in a browser. These are authored format prototypes, not output from the current
generator. They work offline without packages, JavaScript, or external fonts.
Collection links, section anchors, and the source disclosure are interactive;
product controls inside comps are static specimens.

The [written design](../document-design.md) and [correction plan](../plan.md)
describe the proposed production behavior. The structure agent still owns the
application/flow/use-case hierarchy and page breaks. The sample hierarchy was
authored solely to demonstrate page patterns; it is not an agent evaluation or
a prescribed hierarchy for other products.

Format proposal 02 demonstrates decimal section numbering in all three sample
documents. Every document and every sibling sequence starts at `1` with no gaps.
The interaction guide spans two HTML pages: `1.2.1.1 Record a harvest` continues
under `1.2.1 Harvest entry form` in `1.2 Harvests`. Page breaks do not restart
numbering. Internal IDs and existing anchors remain independent of the numbers.
Current review focuses on document organization, content, navigation, and comp
placement; component fidelity awaits actual UI-agent output and the shared renderer.

The current revision also demonstrates an [inline repair notice](record-harvest.html#repair-missing-comp)
and a linked summary under [interaction coverage](interactions.html#coverage).
These are explicitly illustrative processing failures: usable content remains
readable, the unavailable material is marked, and the user gets repair steps.
The [resilience contract](../resilience.md) defines the proposed generator behavior.

The [recording use case](record-harvest.html#main-flow) now demonstrates six
steps within one identified interaction object, **IO-01: Harvest entry form**:
set the date, enter a note, review, open confirmation, confirm the save, and
receive the result. The supporting confirmation dialog remains in this case.
History is entry/exit context. Comps accompany the empty form,
completed form, review, confirmation dialog, saved result, validation error,
and save failure. Branches show return-to-edit, return-from-dialog, cancellation,
correction, and retry, with explicit
rejoin steps and end states. The new review stage is a synthetic product choice
for this example, not a required interaction pattern for other products.
Current owner direction keeps every use case local to an identified interaction
object and permits subsequent dialogs or similar supporting interactions inside
that case; broader flows link independent local cases. In the sample, `UC-01` belongs
to `IO-01` regardless of where either appears in the document hierarchy.

## Synthetic content ledger

Fieldbook is fictional. Its content is intentionally more detailed than the
repository's minimal Garden Log fixture and does not claim to derive from it.
None of these decisions are application requirements or reusable skill defaults.

| ID        | Illustrative fact or choice                                                                                                                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01      | A gardener can record a dated, non-empty harvest note.                                                                                                                                                                             |
| F-02      | A successful save adds the entry to history and displays confirmation.                                                                                                                                                             |
| F-03      | Empty or whitespace-only notes are rejected; the date remains available for correction.                                                                                                                                            |
| F-04      | Saved entries survive closing and reopening the application.                                                                                                                                                                       |
| F-05      | A failed save keeps the draft, discloses failure, and permits retry; it is not reported as saved.                                                                                                                                  |
| F-06      | Before saving, the gardener can review the current date/note and return to editing without losing them; review alone does not persist an entry.                                                                                    |
| UX-01     | Harvests is the application area; recording occurs in its main region with the area navigation retained.                                                                                                                           |
| UX-02     | New drafts start with today's date and an empty note; Review entry validates before advancing. Save entry opens confirmation; Save harvest in the dialog validates and saves the reviewed draft.                                   |
| UX-03     | Cancel discards the current unsaved draft and returns to history.                                                                                                                                                                  |
| UX-04     | Empty-note feedback appears under the field; failed persistence shows a message and Retry save.                                                                                                                                    |
| UX-05     | Review shows the current draft read-only. Edit details returns with values intact; returning to review rebuilds its summary. Save failure retains that summary with retry/edit/cancel available.                                   |
| UX-06     | The form opens a confirmation dialog. Back to review closes only that dialog and retains the draft; Save harvest confirms persistence. Retry after failure resubmits the reviewed draft without reopening confirmation.            |
| IO-01     | Harvest entry form: owns one draft and its edit/review/failure states; opens from history and exits on successful save or cancellation.                                                                                            |
| UC-01     | Record a harvest: a local six-step use case owned by IO-01, including its supporting confirmation dialog, correction, return-to-edit/review, cancellation, and retry alternatives.                                                 |
| UI-01     | Green actions, pale surfaces, typography, spacing, example controls, and sample content are invented for these illustrations.                                                                                                      |
| GAP-01    | Product metrics, platforms, accessibility targets, device sync, focus transitions, announcements, in-progress state/repeated-click handling, dialog dismissal by Escape/backdrop, and closing an unsaved draft remain unspecified. |
| REPAIR-01 | An illustrative publication failure shows a missing-comp notice and repair instructions; it is not a detected fault in these files or a product behavior decision.                                                                 |

Repeated sample content demonstrates cross-document linkage and a readable
view of shared facts. It is not a production source-binding implementation.
The main example includes criteria, a normal flow, validation, cancellation,
recovery, end states, and explicit gaps so that the format can be judged on
more than its title page.

## How to refine the sample

Change `reader.css` for document appearance and the corresponding HTML for a
page-pattern experiment. Edit `outline.json` for section titles, hierarchy,
reading order, and page placement. Its section IDs are stable and contain no
outline numbers. Headings bind those IDs through `data-outline-id`; the sample
helper derives consecutive numbers, contents navigation, and cross-reference
labels from the same outline. From the repository root, run:

```text
node planning/product-publication/design-preview/update-numbering.mjs
node planning/product-publication/design-preview/update-numbering.mjs --check
```

This helper updates the authored samples; it does not implement the production
composition or publication pipeline. It changes no requirement/use-case IDs or
existing link destinations. Action steps and branch codes remain local to their
flows and are not document-section numbers.
Existing anchors also retain identity: `step-3` still targets the save operation,
now displayed as step 5 after insertion of review and confirmation. Visible step labels and
branch references were updated together; the saved link target did not move.
The helper still rejects an invalid sample outline; resilient loading/traversal
and repair tracking are planned production work, not capabilities of this helper.

The `.app-*` and `.mock-*` rules describe only the fictional product specimens.
Keep them separate from the document reader.
Record accepted format changes in the written design before implementation.
Changing an example is not acceptance of its fictional product decisions.

Sample correction, 2026-09-26: the hand-authored button specimen originally
used an unrelated hardcoded orange focus outline. It now resolves focus from
the sample's green primary-action role; keyboard focus in the document reader
uses the reader's separate accent role. The shared production button renderer
already resolves its outline from `button.focusRole` and was not the source
of this sample error. The field specimens still use simplified labels above
their outlines; this is a known prototype mismatch, not an accepted departure
from the existing `mui-outlined-text-v1` template. Replace these hand-authored
component substitutes with shared templates when implementing the design.

The four static HTML pages are a design artifact; they do not yet implement
the proposed persisted manuscript, profile validation, full-size comp viewer,
receipt integration, or controlled-revision workflow. Production comps must
provide readable full-size access. The samples use text-based HTML figures
that can be enlarged with the browser's zoom.

## Checks performed

On 2026-09-26, the current samples passed checks for 36 numbered headings,
46 navigation entries, 19 numbered section references, and 122 local links/assets
across all four HTML pages, with no duplicate IDs or broken anchors. Numbering
starts at 1 in each sibling sequence, has no gaps, and continues across the two
interaction pages. The numbering helper's `--check` run confirmed that repeating
generation would leave the saved samples unchanged. The five current proposal
Markdown files also passed their local-file link check (32 references).
The expanded local use case also passed checks for six consecutive action
steps, matching step-reference links, its owning-object identity, eight
consecutive interaction figures, and balanced HTML nesting.
Desktop screenshots of the PRD opening and requirements, interaction comp and
result, and design-language opening and specimens were visually inspected in
headless Chrome. The interaction comp was also inspected at a 420px viewport;
the checked desktop/narrow states had no page-wide horizontal overflow.
Screenshots are temporary review evidence, not published product comps.
The illustrative repair notice was also visually inspected at desktop and
420px widths, and its summary at desktop width; no page-wide overflow occurred.
The revised object overview, use-case opening, review state, and confirmation
dialog were checked in Chrome. Desktop, 820px, and 420px views had no page-wide
horizontal overflow; the review/dialog comps remained readable at 420px.

These checks cover the authored proposal. They do not establish generator
integration, complete accessibility conformance, or print acceptance; those
checks belong to the implementation plan.
