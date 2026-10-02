# Pair 1-B UI repair 1

Scope: only B-UI-R1-01/B-UI-R1-02 and connected media geometry from exact review `0dc517d4482566f69c0d1cf55648303b5f2ea32b247cad268e8cd2caf7f327ec`. Layout, behavior, theme, longer labels and recovery remain unchanged.

Current subject: `ui.json` revision 4, SHA256 `85750f51d2affe3c04f4dbfaf8f033cb20172cabba6bc1f7919a988c768b0dad`. Required `references.json` SHA256 `1e4bd8b6a2375429d72931d35dc6cb21c43845f3c72cf0ba795894f885436ac6` contains `pair-1-b-retained-editor@2` and `pair-1-b-active-task@2`; no other child files.

Decisions/corrections:

- One source-pixel feature model now supplies all Fit, cropped and magnified schematic views. Shapes are transformed uniformly, intersected with the frame, and expressed through supported grid geometry. Explicit water-line shapes participate in the same transform. A clipped five-pixel boat edge uses a padding-free visual role so component padding cannot enlarge it outside the frame.
- Source and result frames are 384×216, exactly 16:9. Crop fitting uses `x′=(x−160)×0.24`, `y′=(y−90)×0.24`, clipped to 384×216. This removes the excluded source margins and scales the 1600×900 crop uniformly. Full-source comparison uses 0.2 scale. Connected s07 retained output is also 384×216; its extended diagnostic domain is 440×216, with the true 1920-pixel output occupying 384×216 and the invalid candidate continuing to 2200.
- The 480×270 player zoom origin is its center. At 200%, positive fixture pan translates content right/down: `x′=0.5x−140`, `y′=0.5y−95`, clipped to the unchanged viewport. The same transform applies to sky, water, pier, boats, mast and water lines. No interface copy or source policy was added.

Inspection: captured and viewed every PNG in `repair-1-r2/captures.json` using original detail: pages 1–4 cover all 14 scenes. Corrected s04, s08-source-rectangle and connected s07 proportions are visible; remaining Fit views and longer labels retain fit. Geometry warnings remain only `range-start` and `candidate-right`, the previously reviewed nonblocking handle overhangs. No new text clipping/overlap found. Prior captures and the preliminary repair render are preserved.

No new clarification, structural repair, separate self-review, checkpoint or publication. Requested gpt-6-astra / ultra; actual backend remains unverified/null. Harness events and the repair receipt provide measured phase/tool timings. Independent targeted re-review remains next; runtime interaction, focus, persistence and media fidelity retain the shared limits.
