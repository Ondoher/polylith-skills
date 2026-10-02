# Frozen composition source excerpts

Authority: snapshot retained source; original line ranges follow. Later owner amendments govern earlier contradictory language. Full exact source is in reference-only/source-description-full.md.

<!-- Original source lines 1–122 -->
# Alexa Product Description

Alexa is a personal desktop application for playing and creating videos. It is intended for local, individual use and runs in an Electron shell so it can work with files on the user's computer. Authentication, cloud collaboration, and a cloud-hosted version are not current requirements. Alexa is desktop-only. Accessibility requirements, accessibility-specific implementation and validation, phone layouts, and phone interaction support are outside this project scope.

The main application is the existing Polylith app named `alexa` under `src/alexa`. This description is expected to remain incomplete and evolve as the product is designed.

## Application Organization

Alexa uses a project-aware desktop shell. From top to bottom it contains a persistent application and project header, a horizontal workspace switcher, one central active workspace, and an application-status region. The horizontal switcher keeps the main media workspace wide and provides these stable destinations in order:

- Projects, Sources, and Library
- Video Editing
- Playback and Playlists
- Video Export

The active destination is apparent. Selecting a destination changes the central workspace while retaining the current project context. The workspace slot remains in place while its contents change. The status region presents project-wide and long-running operation status; validation and feedback specific to a task remain with that task's surface.

## Projects And Content

A project is stored as a central JSON document. It refers to source media on disk rather than requiring newly exported videos for ordinary editing and playback.

Alexa has four user-visible forms of content:

- A **video file** is source media on disk. Information about it and access to it come through Electron.
- A **clip** is any named, reusable slice saved to the project library. A clip may internally be one continuous source range or a composition of several ranges, but that distinction is not exposed in its user-facing type.
- A **video** is a saved, editable timeline composed from video files, named clips, and expanded video descriptions.
- A **playlist** groups videos and video files for playback in order or shuffled order.

An assembly is an internal playback construction used when a clip or part of a video requires multiple source ranges. It is not a separate user-facing content type, library category, or editor mode. All independently saved slices are called clips.

Video files can be added to a project as source media. The Projects, Sources, and Library workspace groups project content under Video Files, Clips, Videos, and Playlists. It shows enough identity, type, duration or item count, and availability information to distinguish items, and can open eligible content in Video Editing or Playback and Playlists.

The persistent project actions are New, Open, Save, and Save As. Replacing or closing a project with unsaved changes asks the user to Save, Discard, or Cancel. A failed open leaves the prior project unchanged, and a failed save preserves the current project for retry. Source-file ownership and permitted missing-file repair actions remain open.

When one action would abandon both an unsaved active video or playlist draft and the current project, Alexa asks about the active draft first, then asks about unsaved project changes. Choosing Discard for the draft records that choice but keeps the draft intact until all applicable decisions and any restoration succeed. Save Project saves the project and content already explicitly saved to it; it does not implicitly save an active video or playlist draft. Project Discard affects unsaved project changes only. Keep Editing, Cancel, a canceled Open chooser, failed Open, or failed restoration stops the pending action and retains the original draft and prior project. A failed project save keeps the decision open for retry or Cancel. After all applicable guard decisions are resolved, Alexa attempts the pending action once. It keeps the original draft and prior project intact until any required restoration and requested replacement or Open succeeds, then finalizes the pending discard. Leaving a workspace or changing an item within the same project uses only the relevant draft decision. The unresolved policy for closing during an active export remains unchanged.

## Video Edit Surface

Alexa uses one edit surface. The active object is always a video, including a new video that has not yet been saved. The player is the topmost region. A visible, noninteractive separator divides it from the remaining editor controls below. The surface keeps the following regions together:

- A player for the video or current selection, presented at the top in a default 16:9 frame. Media with another aspect ratio is fitted without cropping or distortion.
- Player-specific Zoom In, Zoom Out, and Fit controls for temporary visual inspection.
- A separator followed by the active video's identity, save state, and the remaining editing controls.
- An upper composed-time thumbnail row with the current range selection, a movable vertical playhead, and a Play command fixed at the left. Play becomes Stop while playback is active.
- Four structurally separate, horizontally synchronized, DAW-like tracks showing timeline objects as rectangular items aligned to their composed-time spans. Each track has a persistent identity and track controls.
- Commands for adding and arranging content.
- Selection actions, validation, operation feedback, and video save actions.

Alexa supports four editable video tracks. Clips on the same track never overlap, but gaps are allowed. Tracks may contain content at the same composed time. The editor keeps one active track for adding and arranging objects; whole-object selection is confined to that track. The upper time-range selection applies to the complete four-track composition.

Each track and each clip occurrence has volume and mute controls. Their initial volume is 100% and they are unmuted. Clip gain and track gain combine; muting either silences that clip contribution without hiding its video. Track controls identify their track; clip controls appear for the selected occurrence. Volume and mute changes remain draft edits until the video is saved and participate in Undo and Redo.

Track 1 starts active; lanes appear from Track 4 at the front to Track 1 at the base. Track volume is available in contextual track properties and mute is reachable in the lane header. Clip volume and mute appear in single-occurrence properties. The initial volume range is 0–100% attenuation. Stored volume survives muting; audible tracks continue contributing even when their video is covered. The UI identifies track mute when it explains a silent selected clip. Video duration ends at the latest occurrence end across tracks.

The player and timeline show the same resolved position. Moving the playhead scrubs the video. Playback changes the playhead's visual presentation and keeps it visible until the user pans the composed-time timeline away; a return-to-playhead or resume-follow action restores that behavior. Stopping leaves the playhead and player at the current resolved frame. Selecting a timeline object exposes its named source and underlying media context when available.

Player zoom is independent of timeline zoom. Fit is the initial view and shows the complete media frame without cropping or distortion. Zoom In magnifies the viewport for inspection, Zoom Out reduces magnification only as far as Fit, and Fit restores the complete frame. A magnified view can be panned, but magnification and pan never change the source media, timeline, selection, saved composition, output framing, or export. Opening another video starts in Fit. Fill scaling is not part of the current design.

Content added to a video creates a timeline-occurrence object owned by that video. The occurrence refers to its parent content and records the Start and End of the portion currently used. Timeline operations manipulate these occurrences; source media remains unchanged. Saving the video persists the occurrences as part of its description. Ordinary edits do not create library items and do not change a named clip definition unless the user explicitly chooses Update Named Clip.

## Timeline Selection And Object Editing

The upper timeline row represents composed time. Dragging the playhead scrubs the video without changing the current selection. Clicking and dragging elsewhere over the row creates an inclusive range selection and places the playhead at its left, inclusive Start. That selection persists until the user makes another selection or explicitly clears it. Distinct Start and End handles fine-tune the selected range. Each handle can be dragged or adjusted with Left and Right Arrow while focused. Zooming in makes boundary adjustment progressively finer through one-frame precision at the closest level.

Each video track is structurally separate from the composed-time playback and selection control. It has its own track identity and object lane while sharing the same horizontal composed-time scale. Rectangular objects align to their composed-time spans. Each selected object exposes distinct Start and End trim handles and matching precise commands. A trim restores excluded material or shortens the occurrence only within the underlying content bounds. Start changes its source boundary and timeline start together while keeping timeline End fixed; minimum duration is one frame. Moving Start earlier is limited by time zero and the preceding clip, so it can use only the available preceding gap. Lengthening End into a following clip pushes that clip forward and continues through the collision chain until clips no longer overlap; unaffected later gaps remain. Shortening leaves the freed time as a gap. Ordinary occurrence trimming never changes source media or the saved named clip definition. The result is one undoable draft edit.

Four-track editing replaces the earlier single-track interaction baseline and the earlier possibility of deferring the multi-track interface.

Objects selected on one track can be moved within that track or to an explicitly chosen destination track. Dragging over an unselected target clip shows Before or After according to the nearest edge; an exact tie chooses Before. An empty-lane destination uses the indicated time. The preview identifies the destination track, edge or time, and resulting positions. Selected clips pack contiguously in their existing relative order at the destination, and only colliding later clips are pushed forward until no overlap remains. Vacated source positions remain gaps; original gaps within the selected group need not survive. A cross-track move retains each occurrence's source rectangle, volume and mute while using the destination track's output rectangle and audio. The Reorder command provides the same keyboard-operable destination choice, with Enter to commit and Escape to cancel. Invalid targets, cancellation or failure preserve the original draft and selection. A successful move and its collision chain form one Undo/Redo operation, updating preview, playhead, duration and summary together.

## Four-Track Composition

Each track specifies its target rectangle on the output video, initially the whole output rectangle. Each occurrence specifies a source rectangle within its source frame, initially the whole source. A source rectangle can be selected when adding content; it is independent of the occurrence Start and End times. Track 1 is the base layer and Track 4 is the front layer. The fixed lane order makes that stacking order apparent. Empty track time contributes no image.

A selected source rectangle fits proportionally inside the track target rectangle without distortion. Unused space in that target remains transparent so lower tracks can show through; uncovered output is black. Track rectangles and source rectangles stay within their respective frames and must have positive dimensions. Saved framing is separate from temporary player inspection zoom and pan.

Track settings provide a target-rectangle editor in output-frame coordinates. Clip settings provide a source-rectangle editor in source-frame coordinates. Each editor identifies its scope, presents a rectangle preview with direct handles and precise percentage position/size fields, and offers Reset to Full Frame, Apply, and Cancel. Opening an editing dialog stops preview at the resolved frame. Changes are previewed locally; Apply makes one undoable draft operation and Cancel keeps the prior rectangle. Invalid bounds keep entered values available for correction and do not alter the draft. A source-rectangle editor opened from Add returns to the staged Add dialog; Apply updates that staged choice without inserting, while Cancel keeps the prior staged rectangle. Closing Add preserves the original draft. Dialog dismissal never resumes preview automatically.

## Adding Content To A Video

The user chooses Add to Timeline and then selects a project video file, video, or named clip. Single-track content is inserted into the active track at an explicit insertion point, or appended to that track when no insertion point has been set. The user stages the content and may review or change its source rectangle before pressing Add; selecting content alone does not insert. A point inside a clip resolves to its nearest edge with a visible Before/After preview. Inserting pushes only colliding later clips on the destination track. Scrubbing and selection do not silently change the insertion point.

- Adding a video file creates an unnamed object covering the whole source file and adds it to the active video.
- Adding a video expands its complete four-track description into fresh video-specific timeline objects, preserving its relative track timing and spatial/audio settings. Empty destination tracks can adopt the expanded settings; populated tracks must have exactly compatible settings. If settings conflict, the addition is refused as one operation, identifies the conflict and preserves both source and destination. The destination does not retain a live reference to the added video.
- Adding a named clip creates a timeline occurrence that retains the clip's stable library identity.

An addition either completes as one draft operation or makes no partial insertion. The updated timeline, duration, selection, and preview remain synchronized.

## Selecting And Editing The Timeline

The user can select a composed-time range in the upper row or one or more whole timeline objects on one active track. A range can be selected by pointer dragging. Its Start and End handles can then be dragged or adjusted with Left and Right Arrow while focused. Explicit Start and End commands, directly adjustable markers, and frame-step controls provide precise range selection without requiring dragging. Object trim handles and their command equivalents edit one selected occurrence within its available bounds.

Whole-object and range selections replace one another. Preview of whole-object selection uses the composed-time span from its earliest Start to latest End, including gaps and other contributing tracks; range preview uses the complete composition within the range. With no selection, preview plays the active video. The selected end frame is included. Preview, displayed duration, and frame count follow that inclusive rule. Timeline zoom preserves selection and context, progressively increases thumbnail detail, makes boundary adjustment increasingly granular, and supports one-frame refinement at its closest level without requiring every frame thumbnail to be preloaded.

A composed-time range acts across all four tracks. The following operations act on the working video draft using a right click menu, or a hover icon to open the menu.

- **Delete** removes every object wholly covered by the selection and trims partial overlaps to the selection boundaries. When the deleted range cuts through the middle of one object, the two outside portions remain as separate unnamed video-specific objects. For a range selection, the interval closes by the same duration on every track so their timing remains aligned. For whole-object selection, delete only the selected objects and close their removed intervals on their track, leaving other tracks unchanged. The resulting location stays visible.
- **Split** creates boundaries at both edges of the selected range so that the selected region and surrounding regions can be selected and operated on independently. The selected region remains selected. Split does not name or save a library item.
- **Reorder** moves selected whole objects from one selected track to a displayed destination track and insertion point. It provides the keyboard-operable equivalent of dragging selected objects to an indicated gap.

Add, delete, split, and reorder update duration and preview immediately and participate in draft-level Undo and Redo. Range boundaries, whole-object selection, named status, and failures remain clear. Keyboard object navigation, action commands, boundary commands, and frame stepping are desktop editing features.

Opening Selection actions, Save Clip to Library, or Update Named Clip during editor playback first stops playback at the current resolved frame without changing the selection. Closing the menu or dialog returns to stopped editing and does not restart playback automatically. Opening the same operation after a failure retains the failed-operation context and returns to it on cancellation. Commit failure retains the dialog, selected target and entered inputs for correction or retry; success reports its result in the captured editor context.

While a video or clip save, named-clip update, timeline addition, or project save is committing, Alexa preserves the active draft and selection and disables draft changes, selection or insertion changes, Undo and Redo, competing commits, and actions that would replace or abandon that draft. Inspection-only zoom and pan may remain available. Unavailable edits are not queued; editing resumes after the actual result is known.

## Saving And Updating Clips

Save Clip to Library asks for a name and saves the selected composed-time range across all four tracks as a reusable clip, preserving relative timing, gaps, framing, stacking and audio settings. A range with no contributing media cannot be saved as a clip. The active video's timeline remains intact. Alexa chooses the clip's internal playback construction from the selected content, while the user-facing result is always a clip.

A saved clip has stable library identity. Each use has its own timeline-occurrence identity so it can be moved or removed without deleting the shared clip definition.

Update Named Clip is available only when the selection resolves to one occurrence associated with a saved clip and that occurrence has been trimmed differently from the saved definition. Source rectangle, volume, mute and track settings do not enable or get published by this operation. Confirming copies the selected occurrence's current Start and End into the saved clip definition while retaining the clip's stable library identity. Occurrences that still follow the saved definition adopt the new trimming, including such occurrences in other saved videos in the project. An occurrence with its own locally changed trimming remains unchanged and playable, including when the saved clip is later shortened. The selected occurrence becomes the new saved definition and therefore no longer differs from it. Before confirmation, Alexa distinguishes the occurrences that will update from locally trimmed occurrences that will be preserved. The saved definition and affected following occurrences update together as one operation. If the new definition would make a following occurrence overlap a neighboring clip, the entire update is refused and the affected videos and occurrences are identified. No local override is silently moved or changed to make it fit. Nonconflicting updates still complete as one operation. Canceling or a failed update changes nothing. This update never happens implicitly during ordinary video editing.

Failed clip creation or update preserves the video draft and selection for correction or retry. A successful operation reports the named clip that was created or updated and keeps the user in the video editor.

## Saving Video Work

Save Video retains the active video's timeline and its owned unnamed objects. Clip and video changes remain a working draft until an explicit save or update operation succeeds.

Leaving with unsaved video changes asks the user to Keep Editing or Discard. Keep Editing returns to the draft. For a video that has been saved, Discard requests restoration of its last saved state. For a never-saved video, Discard removes only that unsaved draft when the pending action can proceed. If restoration fails, Alexa retains the current draft, reports the failure, and does not continue the pending navigation. Failed saves preserve the draft and report a retryable failure.


<!-- Original source lines 162–199 -->
## Current Design Defaults

These are current, editable design choices rather than unanswered product questions.

- Use Roboto initially, with section headings at 20px with a 28px line height, body and button text at 16px with a 24px line height, and labels and supporting text at 12px with a 16px line height.

- Use a 4px, 8px, 12px, 16px, and 24px spacing scale.
- Use 8px between closely related controls or local columns, 16px between complete form fields and for ordinary region padding, and 24px between separate sections.
- Place helper or error text 4px below its input. Wrapped messages extend the input's logical block before the next field gap begins.
- Start ordinary fields at 40px high and buttons at 44px high. Use 12px horizontal field padding and 16px horizontal button padding. The additional button height provides a little more vertical padding around its text.
- Use CSS Grid for major regions and form alignment. Small groups of controls may use Flexbox.

- Use a clearly recognizable Material UI aesthetic with Material components, surface hierarchy, restrained elevation, and interaction states. Start from a light treatment with a soft, cool off-white surface (`#F7F7FC`) and dark body text (`#212121`). The off-white should feel less harsh than pure white while remaining restrained beside the branding.

- Use `#B87152` for primary actions, focus emphasis, and Alexa's brand identity. Lighter interaction or supporting tints may be derived from this color when needed. Use black labels on filled brand-colored buttons for contrast; text and outlined button labels use the dark body-text color. Other semantic colors continue to use the MUI light defaults.

The previous special rule equating outlined field labels and borders has been withdrawn.

Outlined fields use the ordinary installed MUI light baseline: resting labels use black at 60% opacity and outlines at 23%; disabled labels use 38% and outlines 26%. Focus uses the Alexa primary color and a 2px outline. These field states do not change the separate command-button choices.

- Use 12px corner radii for buttons. Retain 4px radii for fields and other ordinary components, with restrained borders.

## Product Questions To Work Through

The earlier question about whether to include the multi-track interface has been resolved in favor of the four-track controls and composition behavior described above.

- Should Alexa offer any automatic resolution when expanding a saved video into tracks whose target rectangles or audio settings conflict? Until defined, refuse the conflicting addition atomically and explain the affected tracks.

- Should a named clip update that would cause downstream timeline collisions offer a controlled ripple or another resolution? Until defined, refuse that update atomically, identify the affected uses, and preserve local overrides.

- Which repair actions are allowed for missing, unreadable, unsupported, or partially decodable media?

- What may the user expect Alexa to do with an original source file after adding it, and what happens if that file is moved, renamed, or removed?

- How should playback, audio, unsupported media, and continuity behave across source boundaries?

- What should Alexa ask the user to do when the application is closed while an export is active?


<!-- Original source lines 204–213 -->
---
when a clip is added to a track timeline it is copied, not referenced.
when the clip is an assembly, it is treated like a grouped object and acted on
as a whole.
when trimming an assembly longer it will stretch to include the source file content on the given side
trimming an assembly inward does not lose the reference to clips that are now outside the trimmed area
an assembly can be ungrouped which adds each part of that assembly as a separate clip to the track timeline
clips in an ungrouped assembly that are outside of the trimmed assembly are not added to the track timeline
updates to a clip do not update videos that used it
