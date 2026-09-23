# Design-Language Slice 2: Palette And Defaults

Status: implemented and fixture-tested. Named UI-agent invocation remains unavailable in the active session; a live specialist run and the user's VS Code review of this slice remain pending.

## Working Capability

The installed refine-design path now accepts schema 0.2: a bounded palette of semantic and branding colors, with compact 40 by 20 pixel SVGs embedded in one Markdown table. Colors may be proposed, accepted or unspecified.

Unspecified colors retain null as their design value and require an explicit missing-requirement entry with a rendering default and source. The rendered table shows the default and its provisional status. The missing-requirements table remains present, and the helper's result reports partial plus applied defaults. Resolving the requirement removes that fallback from active output while preserving unrelated records.

Acceptance is parent-owned invocation data, separate from the UI proposal: --accept <id> plus --reason <owner decision>. New acceptances and changes to accepted records require these options and retain a decision record. This records explicit owner direction; it is not authentication against a caller misrepresenting that direction.

Schema 0.1 is preserved through a compatibility module. Existing one-color files can grow into a palette with the same document/color identities and owner notes. Downgrades and deletion of existing color IDs are not supported. Migration retains the original unreferenced colors.svg rather than deleting it.

## Verification

All 18 behavioral tests passed on Node 25.4.0: nine retained Slice 1 tests and nine palette tests.

The new checks cover CLI creation; missing-value persistence and fallback reporting; resolving a missing color in a follow-up without changing accepted choices or owner text; blocking unauthorized acceptance/accepted-value changes; recording explicit acceptance; duplicate/invalid references and contradictory defaults; no-op stability; ownership/link conflicts; Slice 1 migration; and refusing unowned new SVG paths.

The first test run exposed an assertion that ignored Markdown escaping of parentheses. The rendered document was correct; the assertion was corrected and the suite passed. Skill metadata validation and read-only UI-agent TOML parsing also passed.

The generated SVGs were visually inspected in a headless Chromium table harness: compact swatches, text/status alignment and the default row were readable. That harness is not a VS Code Markdown screenshot.

## Sample For Review

Its source and four SVGs use the agreed supporting subfolder. The fixture includes simulated acceptance and explicitly says it is not an accepted Alexa palette. The review artifact keeps the brand accent missing so the provisional default can be inspected. The automated follow-up separately supplies a proposed brand value and verifies the accepted color remains unchanged.

 The temporary browser-inspection.html and palette-preview.png are test harness artifacts, not extra product documents.

## Limits

This slice is still color-only. It does not implement fonts, icons, auto-generated theme variants, component states or full comps. Accepted records may be changed with explicit owner direction; reopening/deletion remains outside the bounded contract. General approval language or agent recommendations do not authorize acceptance.

Multi-file output retains the prior staging/caught-error rollback behavior, without crash-proof transactions or concurrent-writer support. The live named-agent path remains a documented evidence gap, not a silently substituted parent assessment.
