# Frozen composition packet

Frozen 2026-10-02T18:54:02.074Z; snapshot revision 8, SHA-256 12c09ddff7478114a793a51cfefb8293754276ed03d663d8837694312a5cf007. Exact UX/source/review binding passes. Both paths must use inputs/usage-packet.json and the identical scenarios.json.

Authored boundary: complete Video Editing workspace, 13 source-bound frames, and 5 local flows. Project/library identities, chooser content, shared project guards and global export availability/status are contextual. No external workspace interior is authored.

- **s01-composition-base** — Complete stopped composition workspace. Frames: video-view, track-properties. No selection; Track 1 active; all four tracks, composed-time row, player, shell, identity, insertion Append, Undo/Redo availability and local/global status. Player Fit, no playback.

- **s02-inclusive-range** — Inclusive composition range and contextual actions. Frames: video-view, selection-menu. Range frames 600–1199 inclusive; 600 frames / 20 s at 30 fps. All tracks scope. Object selection replaced. Play/Stop remains at left of composed row; range menu identifies actual eligible Delete, Split and Save Clip actions.

- **s03-object-trim** — Object selection and trim collision-chain preview. Frames: video-view, clip-properties. One Track 1 occurrence selected. Extend Pier walk End from frame 2099 to 2159; preview pushes only Boats forward by 60 frames on Track 1. Other tracks, source and library remain unchanged. Gesture preview differs from committed draft; Escape restores it. Reorder stays an explicit whole-object action.

- **s04-independent-zoom** — Player inspection and timeline scale remain distinct. Frames: video-view. Player magnified at 200% with inspection pan; timeline shows frames 600–1499 at a finer scale, intentionally panned away from playhead and Follow available. Same retained range and insertion. Display numeric resolved frame; closest timeline refinement supports one frame. Fit changes inspection only.

- **s05-track-audio** — Track properties and inherited audio scope. Frames: video-view, track-properties. Track 2 active, 60% track volume; muted version visibly retains 60%. Track volume and rectangle summary are contextual; mute remains in lane header. No occurrence selection or autoplay. Per-occurrence gains remain unchanged; covered video can still contribute sound.

- **s06-group-properties** — Selected group properties and unavailable Ungroup. Frames: video-view, clip-properties, selection-menu. One copied Harbor sequence group on Track 2, custom source rectangle and 80% group volume. Group selected as one object. Show containing track, included boundaries, group crop/audio and inherited mute/no-audio explanation when applicable. Ungroup unavailable with applicable reason; preserve complete group and selection.

- **s07-framing-invalid** — Captured track output rectangle with invalid staged input. Frames: video-framing-view, track-rectangle. Track 2 output frame 1920×1080 pixels. Retain original full-frame rectangle. Staged x=1800, y=0, width=400, height=1080 exceeds output bounds; invalid field and disabled Apply retain values. Visual and numeric edit, Full frame and Cancel remain. Player stops at resolved frame; unchanged inspection and draft.

- **s08-staged-add-conflict** — Staged saved-video addition refuses incompatible settings. Frames: video-view, timeline-add, source-rectangle. Set Track 2 insertion before opening Add. Chosen saved video Harbor evening conflicts with occupied Track 2 output/audio settings; explain target/time and conflicts, insert nothing. Source rectangle is applicable for files/named clips, not a policy resolving saved-video conflicts. The separate required s08-source-rectangle scene uses an applicable staged file and captures Add target/crop/return; Cancel preserves staged choices.

- **s09-clip-save-failure** — Save Clip retains captured composition after failure. Frames: clip-create. Captured frames 600–1199 inclusive across all tracks, 20 s / 600 frames. Enter Harbor highlights. Creation failed; show local actual failure, preserve name/range/draft and allow explicit retry or Cancel. No library item exists. Saved result would include framing, gaps and audio.

- **s10-clip-update** — Review a library-only named clip trim update. Frames: clip-update. Selected occurrence associated with Harbor sequence differs from saved library trim. Compare current Start 0 / inclusive End 1199 with proposed Start 60 / inclusive End 1139. Only definition and future additions change; existing copies including selection stay unchanged. Exclude crop/audio/track publishing. Confirm, Cancel and retained failed-attempt semantics.

- **s11-video-save-failure** — Save Video failure retains editor state. Frames: video-saving-view, video-view. Name Harbor morning — draft retained after failed Save Video. Keep draft, range/object selection and insertion destination. During commit freeze all editing/context-changing actions disabled; after actual failure restore eligible controls and show Retry through explicit Save Video. Project Save is distinct and cannot save this draft implicitly.

- **s12-project-guard-failure** — Draft-first/project-second guard preserves original work. Frames: video-guard, video-project-guard. Open captured from Video Editing. Draft discard decision was deferred; project Save then fails. Keep project stage open with explicit Save retry / Discard / Cancel, original draft and project intact. Cancel returns captured origin; failed/canceled Open or restoration must never finalize deferred discard. Active export suppresses New/Open before any guard.

## Coverage and limits

The packet retains 55 complete actions, 70 feedback records, 7 complete flows including context, 7 components, and all 13 authored frames. Source and saved research remain textual evidence; no old geometry, comps or review findings are author inputs. All meaningful numeric limits and units remain in complete semantic records. The 12 scenarios cover selected consequential states, rather than every independent combination. The 12 primary scenario identities are unchanged. Two required related scenes bring selected rendered coverage to 14 scenes: s08-source-rectangle and s11-video-saving-busy. They are identical in both paths and add no arbitrary state combinations.

Insertion is selected before Add; the retained accepted flow sequencing advisory remains in verification-only evidence. Neutral-group Ungroup remains provisional accepted UX and is not elevated to an owner requirement. Saved-video settings conflict and unsupported Ungroup preserve work; media relinking/repair and app-close-during-export policy are not invented.

Bindings and the mechanical closure, context boundaries and original review receipt are retained in inputs/reference-only/. All 14 live source inputs were rehashed unchanged after freezing. Original product files and current pointers were read only.

Measured extraction script elapsed: 190 ms. Host reasoning/token metrics are unavailable. This Stage 2 packet-contract refinement occurs before measured pairs; extraction/tooling-development costs remain separate from benchmark execution.

## Required related scenes

- **s08-source-rectangle** — Applicable staged Add source rectangle with captured destination. Frames: video-framing-view, source-rectangle, timeline-add. Show the staged file identity and captured Track 2 / frame 1500 (50 s) destination, source-pixel coordinate space, valid staged crop and visual/numeric adjustment. Apply returns this crop to the retained Add draft; it does not insert or create an Undo edit. Cancel returns to Add with original staged crop and destination retained. No playback restart; existing draft, range and insertion context remain unchanged. Fixed samples: {"content":{"id":"staged-harbor-wide","name":"Harbor wide.mp4","type":"video-file","sourceFrame":{"width":1920,"height":1080,"unit":"source pixels"}},"capturedDestination":{"trackId":"track-2","name":"Track 2","insertionFrame":1500,"frameRate":30,"insertionSeconds":50},"originalRectangle":{"x":0,"y":0,"width":1920,"height":1080,"unit":"source pixels"},"stagedRectangle":{"x":160,"y":90,"width":1600,"height":900,"unit":"source pixels"},"resolvedFrame":750,"previewPlaying":false,"inspection":"Fit"}.

- **s11-video-saving-busy** — Save Video commit freeze preserves captured context. Frames: video-saving-view. Render the complete composition while Save Video is actually committing. Preserve video name, selection, insertion destination and current preview. Show truthful local saving status. Disable editing gestures, Add, selection commands, properties/audio/rectangle adjustments, Undo/Redo, Save Video and context-changing controls for the commit freeze. Keep project Save distinct. On actual failure use the primary s11 retained failure state; do not imply completion or cancellation before an actual result. Fixed samples: {"videoName":"Harbor morning — draft","operation":"Save Video","status":"Saving","progress":"indeterminate; no invented percentage","retainedRange":{"startFrame":600,"endInclusiveFrame":1199,"frameCount":600,"durationSeconds":20,"scope":"All tracks"},"capturedInsertion":{"trackId":"track-2","insertionFrame":1500,"frameRate":30},"previewPlaying":false}.

## Fixture question and decision

Stage 2 exposed an unspecified base workspace state: resolved frame, project/draft save status, edit history and insertion context were otherwise left to each author. Pin samples.baseState to frame 0 / 00:00:00:00, stopped player at Fit, saved project, loaded unsaved fixture draft with no edit history, Undo/Redo unavailable, no global operation, full 0–3599 frame timeline window, Track 1 active, no selection, Track 1 Append and full-frame 1920×1080 output rectangle. Each scenario references this base and declares its stateOverrides; related scenes do likewise. These are identical test fixtures in both arms, not product policies.

Shared rendering limitation: no raster/video assets are supplied. Preview and thumbnails use deterministic schematic media. Keep this limitation and all fixture commentary outside the interface. The 12 primary scenarios plus two required related scenes are unchanged.

## Checkpoint verification correction

The earlier working-tree git diff check did not inspect untracked packet data. The checkpoint staged diff check found an extra blank line at the end of projected inputs/research.md; the projection now ends with exactly one LF, with all research text retained. The reference-only parent-evidence-verification.json and .md retain their byte-exact CRLF source data. Final checkpoint verification must use the parent-owned scoped Git whitespace attributes for these two fixtures, retain ordinary whitespace checks elsewhere, restage rebuilt outputs, and run git diff --cached --check. Hash/mirror and unchanged-live-input checks are independent of that staged whitespace check.
