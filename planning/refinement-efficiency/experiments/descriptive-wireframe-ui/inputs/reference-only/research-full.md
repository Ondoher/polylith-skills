# Alexa product research brief

Recommend one continuous composition surface organized around **what is playing, what is selected, where an edit will land, and which object owns a setting**. Keep the player above the required separator; make the composed-time row and four synchronized tracks the central editing structure below it. Contextual properties should remain attached to that structure. A shared zoom menu is a hypothesis to evaluate, not the solution to workspace cohesion.

Use the persistent shell to keep project identity, active draft state and operation status legible; place decisions and actionable failures beside the affected task. Present library content as saved definitions, editing as a distinct draft, playback as a current run, and export as a reviewed attempt. Make recovery return to the precise task context from which it began. This direction follows Alexa's supplied requirements; comparable evidence helps communicate it rather than adding features.

## Source context, authority and verification

Research date: 2 October 2026. This brief follows the owner-accepted [research scope](research-scope.md) ([browser view](research-scope.html)) and retains the unchanged [immutable product description input](references/product-description-input.md). Current description and retained input SHA-256: `5502890f811ef8c74ffc3b03e5e3b6461fdcc05402fe6c5f1a02df100f7f9ffe`. Accepted scope SHA-256: `b83a5ad3829c97bc4741cdb7494e215570e24286dba351059b3d289e108a5e7a`.

Engineering references inside the unchanged input retain their original base `C:/dev/alexa/agents/topics/alexa/`; its linked technical-paper chain remains in that source repository. These references preserve input provenance rather than extending this research package.

Recommendations and alternatives are advisory. The human product description and its later amendments govern requirements. Owner policies remain open where indicated; UX owns interaction decisions and UI owns visual treatment. Source checking does not accept a new design or add comparator features to Alexa.

The separate [parent evidence verification receipt](references/parent-evidence-verification.md) records the completed bounded check of 20 new material URLs and three refreshed historical sources; seven unchanged historical primitives were reused without reopening. All seven official reference images were viewed. This establishes the stated bounded evidence checks, not live behavior, technical feasibility or design acceptance. Original inventories retain their authored verification/provenance state; the receipt records the subsequent check without rewriting that history.

The final amendment governs copied clips: grouping is local, inward trim retains hidden parts, outward trim adds source material, Ungroup excludes wholly trimmed-out parts, and library updates do not propagate into existing videos. Earlier following-occurrence, normalization, and downstream-propagation statements are superseded. The saved evidence's neutral-group-only Ungroup restriction is an earlier adaptation, **not an owner requirement**. Preserve the documented group manipulation primitives while leaving that restriction and other unresolved boundaries open.

The trailing amendment means timeline uses copy clip content and later library clip changes do not update videos. This does **not** establish copying, relocating, deleting, or managing original media files. The project still refers to disk media. Copied composition identity and external source availability must remain distinct. Area 4 owns ambiguity about Update Named Clip, group trimming and Ungroup; this report does not resolve it.

## Composition findings: scope areas 1–4

## 1. Cohesive composing and inspecting workspace

**Observed.** [Kdenlive's workspace](https://docs.kdenlive.org/en/user_interface.html) places monitors above the timeline, editing tools adjacent to it, and status along the bottom. [Premiere's Properties interface](https://helpx.adobe.com/premiere/desktop/edit-projects/intro-to-editing/edit-video-using-the-properties-panel.html) keeps selected-clip controls beside the monitor and timeline. The actual images show connected regions but also the width consumed by extra panels. Both illustrate local context; neither proves an ideal Alexa layout.

**Recommended adaptation.** Keep the shell's project identity, workspace destinations, and global operation status stable. Inside Video Editing, use this continuous arrangement:

1. Player and a clearly named temporary inspection control group. Display Fit or current magnification; place Zoom In, Zoom Out, and Fit here. Inspection pan belongs to the magnified viewport.
2. Required noninteractive separator, then video identity/draft state and save action. Preserve this identity when the selected object changes.
3. A concise editing context and command region: current selection scope, independent insertion destination, and Add/arrangement/Undo/Redo actions. Nearby feedback describes the active operation.
4. Upper composed-time thumbnail/range row, fixed left Play/Stop, frame position and boundary commands; immediately below it, four synchronized lanes with persistent headers. Keep time alignment visually continuous across all five rows.
5. A contextual property region below the separator, beside the lanes when space permits or immediately below them when labels grow. Its heading names `Track 2`, `Clip … on Track 2`, or `Range across all four tracks`; never rely on focus alone to explain scope.

This is a workspace relationship proposal, not a wireframe or accepted placement specification. Keep the player topmost and preserve enough width for synchronized time. A permanently visible separate mixer and a second persistent source viewer would consume space and introduce additional scope; the current brief does not require them.

**Inspection versus changes.** [Premiere monitor magnification](https://helpx.adobe.com/uk/premiere/desktop/get-started/source-and-program-monitor-adjustments/adjust-the-magnification-for-the-source-and-program-monitors.html) provides Fit and image magnification in the monitor, while [timeline navigation](https://helpx.adobe.com/premiere/desktop/edit-projects/change-clip-sequence/navigation-controls-in-the-timeline.html) separately changes the time window. [Kdenlive monitor controls](https://docs.kdenlive.org/en/user_interface/monitors.html) also distinguish image tools from ruler zoom. The shared primitive is separate spatial inspection and temporal navigation; Alexa's no-saved-effect promise comes from the owner. Use names such as `Player view` and `Timeline scale` to avoid confusing either with saved rectangle settings.

**Alternatives.** Local player and timeline controls are the clearest candidate. A consolidated View menu with explicit Player/Timeline sections can supplement them. A single unlabeled Zoom control would require users to infer focus. Evaluate consolidation only if the scope remains apparent during timeline editing, rectangle dialogs, and busy commits; do not treat all commands as one undifferentiated toolbar.

**Translation.** [W3C text-size guidance](https://www.w3.org/International/articles/article-text-size.en.html) supports flexible reflow because short translated labels can expand substantially. Allow app-defined action groups, property labels, messages, and workspace labels to grow without obscuring the active destination or timeline. Wrap within logical groups, grow message blocks vertically, and widen label/value arrangements when available. Move complete lower-priority command groups into a named menu if necessary. Avoid solving expansion by silently dropping scope words or shrinking type. No translation program or accessibility work is added to scope.

## 2. Precise arrangement and selection across four tracks

**Reused observations.** `timeline-pattern` distinguishes ranges from whole clips and includes keyboard boundary control; `multitrack-editing` documents target-track insertion and competing ripple conventions. The refreshed Premiere timeline image shows a ruler, span, playhead, numeric position, and separate zoom bar. A range, a current frame, and a viewed time window can coexist as distinct controls. These precedents do not establish Alexa's inclusive End, collision-only push, or packed moves.

**Recommended adaptation.** Keep four independent pieces of context legible:

| Context | Persistent cue | Effect communicated |
|---|---|---|
| Resolved playback frame | Playhead and frame/time display | Scrubs player; does not reset insertion |
| Composed range | Upper-row band, Start/End handles, range summary | Acts across all four tracks |
| Whole objects | Selected lane items and `n clips on Track n` | Confined to one active track |
| Insertion destination | Explicit track plus time or Before/After marker | Add/Reorder destination; independent of scrubbing |

Whole-object and range selections replace one another as required. Distinguish their handles by location and labels: upper-row `Range Start/End`, object-edge `Clip Start/End`. Show duration and frame count alongside precise boundaries. A selection whose Start and End name the same frame should visibly report one selected frame, satisfying the owner's inclusive rule. Do not use a comparable editor's endpoint convention as authority.

For Add and Reorder, preview the **consequences**, not just a drag silhouette: chosen track, nearest target edge/time, packed selected objects, vacated source gaps, and each later collision shift. Use the same displayed destination in pointer and keyboard paths. Exact Before ties and collision chains are already settled. A concise textual summary can accompany the preview, such as `Move 3 clips to Track 2, before …; 2 later clips shift`. Reveal affected positions before Enter/Add; Escape/Cancel returns to the captured selection.

Trimming needs its own consequence preview. An earlier Start is constrained by the preceding gap; a longer End can push a forward collision chain; shortening leaves a gap. Do not label all of these `Ripple`, because the reused Kdenlive evidence includes conventional shortening that closes time. Prefer a verb plus the actual consequence. For range Delete, show that all four tracks close by the same selected duration; for object Delete, name the one affected track. Split should retain the range and visibly expose its new boundaries.

Place timeline scale and frame-step controls near the upper row; retain the selected range and viewport anchor while zooming. Offer explicit Return to playhead/Resume follow when manual panning suspends following. Ordinary timeline navigation need not change selection or insertion. [Premiere navigation](https://helpx.adobe.com/premiere/desktop/edit-projects/change-clip-sequence/navigation-controls-in-the-timeline.html) documents panning the viewed time without moving the playhead; Alexa's follow recovery remains its own adaptation.

**Commit continuity.** Preserve selection, destination, entered values, and the visible edited location during atomic operations. Show a local committing state with disabled edit actions; inspection remains visually identified as inspection. On failure retain the dialog and explain which attempt failed with Retry/Cancel where permitted. On success update result feedback, duration, playhead, and selection together according to the owner rules. This is presentation guidance, not an asynchronous implementation design.

**Alternative / evidence limit.** A comprehensive persistent context strip competes with timeline space. Compact summary plus expandable precise controls may be adequate if the four contexts remain visible. Collision previews and inclusive selection should undergo a later bounded real-task evaluation: one-frame selection, mixed range/object selection, packed cross-track move with a collision chain, and canceled retry. No reference inspected demonstrates Alexa's whole combination; no new semantics are accepted here.

## 3. Spatial layers and audio in the same composition

**Observed and reused.** `spatial-framing` supports numeric and direct manipulation; `audio-scope` documents track and clip ownership. The inspected Premiere Properties screenshot visibly separates Transform, Crop, and Audio sections and identifies the selected media. Kdenlive documents monitor handles tied to the applied editing effect. These show scoped editing, not Alexa's exact two-rectangle model or proportional fitting.

**Recommended adaptation.** Keep the selected-track and selected-occurrence property heading visible while a rectangle editor opens. Use `Track n output rectangle` for the target, with the entire output frame as its coordinate reference; use `Clip source rectangle` for the crop, with the entire source frame as its reference. The dialogs should state the coordinate frame beside percentage position/size fields and preview the rectangle against it. Maintain direct handles, precise fields, Full Frame reset, Apply and Cancel as required. A pointer preview and a numeric correction are two routes to the same staged choice.

The output preview should reveal the composition result: proportional image fit, visible lower layers through unused target space, and black only where no layer covers output. Do not depict every unused target area as black; that would imply the wrong stacking behavior. Lane order Track 4 through Track 1 and track headings should reinforce front-to-base order. A source preview must show the cropped material against the full source, rather than presenting player magnification as saved framing.

Opening these dialogs stops preview and remains stopped on return, as specified. Source framing opened from Add returns to Add with the staged setting; it must not look like an insertion confirmation. Apply commits only the relevant scope once. Invalid fields remain available for correction; Cancel returns to the previous draft/staged rectangle. Give the dialog enough space for the source/track name and translated coordinate labels.

Keep track mute in lane headers and track volume/output framing in track properties. Put occurrence gain/mute/source framing in single-occurrence properties. Use percentage gain consistently with Alexa's 0–100% attenuation model; the references' decibel controls are not adopted. Preserve the saved volume when muted. If a selected clip is silent because its track is muted, say so beside its audio controls and identify that track. If both scopes mute it, show both causes. Covered picture does not imply muted audio; label mute as audio and avoid an eye/visibility metaphor.

**Alternatives / open dependence.** A unified inspector that switches clearly between track and occurrence is a viable candidate. Two clearly headed sections shown together reduce switching but consume width and can imply that both scopes apply to a multi-object selection. Choose through later UX assessment, keeping the defined single-occurrence rules. Group-level source framing and audio must not silently be redistributed on Ungroup; area 4 requires an owner decision before that consequence is promised.

## 4. Reusable copied content: save, add, trim, inspect, ungroup

**Observed.** [Final Cut Pro compound clips](https://support.apple.com/en-nz/guide/final-cut-pro/verca9e8d33/mac) have an explicit break-apart action. Its actual official image shows separate overlapping components becoming a single clip and an internal view. [Premiere nested sequences](https://helpx.adobe.com/premiere/desktop/edit-projects/edit-nested-sequences/about-nested-sequences.html) support ordinary move/trim on a layered unit. Both products' default source-update relationships differ from Alexa's independent copies. Reuse the whole-object presentation and explicit decomposition only.

**Recommended adaptation.** Keep the user-facing library type Clip. A grouped occurrence can have a subtle grouped-content cue and a summary of its contributing parts, without creating an Assembly library category. Show provenance as `Copied from [library clip]` or equivalent once the owner settles which identity survives; avoid a linked-chain icon or wording that suggests future synchronization. Local trim, crop, and audio change the copied occurrence, not the library.

Connect the journey within the existing editor:

1. Select a composed range; Save Clip to Library shows name, inclusive duration, and the four-track scope. Save confirms the created clip and leaves the draft intact.
2. Add to Timeline opens a staged library/source choice with preview, name/duration, explicit destination, and source framing. Selecting a library item alone never commits. For a video expansion, display track-setting conflicts and the current atomic-refusal behavior.
3. The inserted grouped copy acts as one timeline object. Inward trim shows the current used extent and makes recoverable hidden content understandable through properties or a details view. Hidden parts remain retained but excluded from the current output.
4. Before outward trim commits, distinguish restoring retained internal material from reaching additional source material. Show the available boundary only when the owner-defined extension rule makes it determinate. Do not call this playback speed stretching.
5. Ungroup previews the included parts, their visible extents, destination tracks/settings, and excluded wholly trimmed-out parts before committing one local draft operation. Cancel leaves the group intact; Undo must restore the group through the existing requirement.

A read-only contents/details view is a candidate for explaining internal parts while keeping the required single editor surface. An expandable inspector list is simpler for provenance; an embedded miniature internal timeline better conveys overlap and gaps. Neither authorizes a second editable nested timeline. Do not adopt the references' double-click nested editing merely because it appears in their manuals.

**Owner-only decisions required before finalizing this path:**

| Decision | Why research cannot settle it | Useful options to present for owner consideration |
|---|---|---|
| Multitrack Ungroup placement | A saved range retains four-track timing/settings, while the amendment says parts are added to a track | Preserve original relative tracks, choose an explicit mapping, or restrict representability; each changes user consequences |
| Group-adjustment transfer | Group source crop/gain/mute and destination track settings may not map losslessly to parts | Preserve the composed result through defined transfer, ask for explicit mapping/reset, or refuse with explanation; do not assume neutral-only eligibility |
| Partly intersecting edge parts | Amendment excludes wholly outside parts, but does not expressly define the new boundaries of partial parts | Trim to current extent or another explicit rule; preview is useful after owner choice |
| Outward extension selection | Multiple simultaneous edge parts, gaps and exhausted files can yield different results | Define which source(s) extend, what happens at each exhausted boundary, and whether empty internal time restores first |
| Provenance after copying/Ungroup and Update Named Clip | Stable copied ownership supersedes propagation but does not settle surviving origin metadata or update eligibility | Define whether explicit library update remains, which occurrence/parts qualify, and what it publishes; never imply existing videos update |
| Conflicting video expansion | Atomic refusal is currently settled fallback; automatic resolution remains open | Retain refusal until the owner chooses an alternative; source examples do not authorize one |

**Evidence limit.** Neither inspected group source establishes Alexa's exact hidden-retention, extension, partially intersecting Ungroup, or fixed-four-track mapping. The lack of an exact match is a bounded evidence gap, not a claim that no comparable exists. Continue designing the settled save/Add/copy/whole-object journey; defer only those confirmations and eligibility promises that depend on the listed choices.

## Cross-area ties and question status

The cohesive workspace is tested by journeys, not the appearance of separate controls. The selection summary should follow a range into Save Clip; the insertion destination should follow a chosen clip into Add; the occurrence identity should follow trim into rectangle/audio properties; Ungroup should preserve that context and preview its consequences before replacing the group. The player always represents the resolved composition position, except clearly scoped local rectangle/content previews. Global operation status persists across workspaces; validation stays beside the affected task.

| Accepted-scope question cluster | Status in this contribution | Finding |
|---|---|---|
| 1: playback/inspection/navigation/persistent edits | New primary evidence + owner-rule adaptation | Local named scopes; independent player and timeline zoom |
| 1: contextual commands, shell/project/status | New layout evidence + source-bound proposal | Continuous editor hierarchy and stable shell; exact layout pending UX |
| 1–4: translated labels/messages | New authoritative guidance | Reflow logical groups; preserve scope and timeline space |
| 2: range/playhead/insertion/object distinction | Reuse + new image evidence | Four persistent contexts; inclusive frame summary |
| 2: insertion, packing, collision chains, gaps | Reuse + explicit evidence gap for exact combination | Consequence previews proposed; bounded task evaluation needed |
| 2: precision, zoom/follow, Undo/Redo | Reuse + new navigation evidence | Local precision and recovery controls; atomic result feedback |
| 2: busy commits/failure continuity | Answered from owner requirements; presentation proposed | Preserve captured context and retry inputs; no architecture claims |
| 3: rectangle coordinates, fit, transparency/stacking | Reuse + refreshed contextual image evidence | Named source/output coordinate frames; result preview |
| 3: audio scope and silence, staged dialogs | Reuse + owner rules; contextual presentation proposed | Track/clip ownership and explicit mute causes |
| 4: whole group, internal parts and decomposition | Reuse + inspected primary image | Group cue and optional read-only details; explicit consequence preview |
| 4: save/library/staged Add/name feedback | Answered from source constraints; cross-area synthesis | One continuous library-to-editor journey |
| 4: retained trim/outward extension/Ungroup exact output | Settled high-level rules; owner-dependent boundaries | Decision table above |
| 4: provenance/explicit library update/conflict resolution | Owner-dependent | No inferred linked propagation or neutral-only restriction |

## Actual composition interface evidence

These official documentation images were accessed and downloaded on 2 October 2026. They are actual reference images, not proposed Alexa arrangements. Static images show visible relationships; they do not prove operation timing, failure recovery, pointer hit areas or present-day application builds.

### Kdenlive connected editing workspace

![Kdenlive official annotated editing workspace](references/composition/images/kdenlive-workspace.webp)

Attribution: Kdenlive/KDE documentation contributors. [Official page](https://docs.kdenlive.org/en/user_interface.html); [original asset](https://docs.kdenlive.org/en/_images/kdenlive2304_ui-workspaces.webp). Manual currently labels itself 26.08; filename identifies a 23.04-era screenshot. Documentation source lists Eugen Mohr, Maris Stalte and Bernd Jordan and CC BY-SA 4.0. Unmodified download. Observed: monitors above lanes, timeline toolbar immediately above lanes, mixer at their right, status below; useful for connected regional relationships, not a mandated Alexa panel inventory.

### Premiere contextual clip Properties

![Premiere selected clip with Properties alongside monitor and timeline](references/composition/images/adobe-properties.jpg)

Attribution: Adobe. [Official page](https://helpx.adobe.com/premiere/desktop/edit-projects/intro-to-editing/edit-video-using-the-properties-panel.html), updated 8 April 2026; [original asset](https://helpx-prod.scene7.com/is/image/HelpxProd/Premiere-interface-with-a-clip-selected-in-the-tim?%24pjpeg%24=&jpegSize=200&wid=1200). Exact screenshot build unspecified. Observed: selection identity and separate Transform, Crop and Audio sections beside monitor/timeline; monitor Fit is visible apart from property Fit. Useful for scope clarity; Adobe's decibels, source/program dual monitors and extra controls are not Alexa requirements.

### Premiere time navigation

![Premiere official annotated timeline navigation](references/composition/images/adobe-timeline.jpg)

Attribution: Adobe. [Official page](https://helpx.adobe.com/premiere/desktop/edit-projects/change-clip-sequence/navigation-controls-in-the-timeline.html), updated 7 January 2026; [original asset](https://helpx-prod.scene7.com/is/image/HelpxProd/The-UI-of-the-Timeline-panel-showcasing-a-sequence-1?%24pjpeg%24=&jpegSize=200&wid=1378). Screenshot build unspecified, sequence name contains an older date. Observed: separate range bar, playhead, position display and zoom bar around aligned lanes. Useful to distinguish temporal states; work-area purpose and endpoint semantics differ from Alexa.

### Premiere player magnification

![Premiere monitor Zoom Level menu](references/composition/images/adobe-monitor-zoom.jpg)

Attribution: Adobe. [Official page](https://helpx.adobe.com/uk/premiere/desktop/get-started/source-and-program-monitor-adjustments/adjust-the-magnification-for-the-source-and-program-monitors.html), updated 19 October 2025; [original asset](https://helpx-prod.scene7.com/is/image/HelpxProd/The-Select-Zoom-Level-menu-displays-various-zoom-o?%24pjpeg%24=&jpegSize=200&wid=1200). Screenshot build unspecified. Observed: magnification percentages and Fit are in a monitor-local menu above the timeline. Useful example of local navigation scope; Alexa's Zoom Out minimum of Fit differs from this menu's smaller percentages.

### Final Cut Pro grouping and contents

![Final Cut Pro selected components, compound item and its contents](references/composition/images/apple-compound-timeline.png)

Attribution: Apple. [Official page](https://support.apple.com/en-nz/guide/final-cut-pro/verca9e8d33/mac); [original asset](https://help.apple.com/assets/69433400CD7B104B7D071A52/694334052F74CB432B0CC82C/en_US/a8efb6ca66b9edbfbac10e1504b0adc9.png). Guide version/screenshot build not established. Observed: separated overlapping visual/audio components, one compound item, then internal arrangement. The image illustrates grouping; it does not show a trimmed Ungroup result or prove Alexa copy semantics.

## Supporting workflow findings: scope areas 5–8

## Area 5: projects, library identity, and local recovery

**Source locators:** Projects And Content; Saving Video Work; Playing Videos And Playlists; Product Questions To Work Through, original-file expectations and repair actions.

**Observed primary evidence.** [Premiere relinking](https://helpx.adobe.com/uk/premiere/desktop/organize-media/ingest-proxy-workflow/relink-offline-clips.html) exposes offline identity across browser, timeline and viewer, and presents original filename and previous path during locating. Replacement with different media affects every project use. [Final Cut relinking](https://support.apple.com/en-ae/guide/final-cut-pro/ver26f5c8c9/mac) separates locating candidates from analysis and relinking; it shows match results, permits rejecting incorrect matches, and imposes media-attribute constraints. These independent products support the shared candidate pattern of contextual broken-source identification plus reviewed reconnection. They do not establish Alexa's matching rules, permission policy or allowed replacement scope.

**Advisory application.** Keep Video Files, Clips, Videos and Playlists as the four required browser groups. Show display name, type, duration/item count and availability; expose source filename/path in selected-item details when relevant rather than overloading every row. Selecting a row should inspect it; explicit eligible commands should open editing or playback. Do not treat a clip as a new assembly type. A library video row represents its saved state; a draft with unsaved changes needs its own named/never-saved indicator in the destination workspace. Save Project and Save Video/Save Playlist must remain recognizably different actions.

Use the required guard sequence as one pending journey: identify the draft and intended destination; Keep Editing returns there; Discard is recorded conditionally; then resolve project Save/Discard/Cancel where applicable; only after successful restoration and replacement finalize abandonment. If a project save fails, keep that decision available for Retry or Cancel. If Open is canceled or fails, or restoration fails, return with prior project, draft, identity, selection and entered values intact. This is an Alexa requirement, not a claim about comparable editors. A concise recovery message should say which action failed and that the current work was retained.

**Platform guidance.** [Microsoft dialog guidance](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/dialogs-and-flyouts/dialogs) favors specific action labels, a safe dismissal choice, and inline task validation. Apply this to the already-required guards and replacement/cancel-export decisions. It does not justify adding confirmation for ordinary reversible library selection.

**Owner options, still open.**

| Decision | Candidate | Tradeoff / dependency |
|---|---|---|
| Original-file expectations | Reference originals in place with explicit dependency explanation | Closest to the current central-JSON description; moved/deleted files can break availability. Need owner statement about permitted file-management actions. |
| Import ownership | Offer managed copies as a proposed additional policy | More portability and storage use; must be an explicit product change, not inferred from copied clips. |
| Repair scope | Locate the same media and review validated matches | Narrower semantic change; technical input needed on identity/attribute checks and affected-use reporting. |
| Substitute different content | Separate explicit replacement with affected-use preview | Can alter every composition depending on that source; owner must decide whether it is allowed and how copied clip content relates to source identity. |
| Unreadable source | Retry after access/drive issue is corrected | Does not silently change paths/content; permission-restoration actions depend on supported host behavior. |
| Batch relink | Review proposed matches before commitment | Efficient for moved folders; greater wrong-match risk than one-at-a-time repair. Approval and validation policy remain open. |

Recommendation for owner consideration: begin with narrow same-source Locate and Retry candidates, and keep substitute-media or managed-copy proposals separate. Do not claim those repair actions are available until owner and technical dependencies are settled.

## Area 6: playback and playlist authoring together

**Source locator:** Playing Videos And Playlists, cohesive browser/viewer/transport/queue/editor and visible run order.

**Observed evidence.** [Music on Mac queue](https://support.apple.com/guide/music/queue-your-songs-musb1e6d1c76/mac) displays upcoming items and history and permits reordering/removing queue entries. [Spotify desktop queue](https://support.spotify.com/is-en/article/play-queue/) places queue access beside the playback bar and provides add, reorder and remove commands. These independent products support a visible upcoming-sequence pattern. Their queue editing and autoplay behaviors do not become Alexa requirements. [Music repeat/shuffle guidance](https://support.apple.com/guide/music/shuffle-or-repeat-songs-mus2989/mac) differentiates random order, repeat-all and repeat-one states. It does not verify Alexa's exact saved-order/run-order relation.

**Advisory application.** Keep the required browser, viewer, transport, current run queue and playlist draft editor in one workspace. Make the browser selection, current playback item, queue position and edited playlist identity visibly distinct. Explicit Play starts selected content. Stop returns the current item to its start and leaves it selected, as required. Show repeat state with descriptive labels—Off, List, Item—so an icon cycle need not carry the whole meaning.

The playlist editor should identify its order as the draft/saved playlist order; the queue should identify the current playback run order and current item. Shuffle changes that visible run only; Previous/Next follow it. Saving after shuffle must not suggest that randomized order was saved. A run-order sequence can use displayed positions without implying stable library identities. A playlist editor change should give local unsaved feedback. Its failed Save retains name, contents and order; empty saved playlists show why Play is unavailable. Draft departure/restoration follows area 5's ordered preservation requirements.

**Alternatives and remaining input.** Adjacent queue/editor columns maximize comparison but duplicate many rows; a stacked arrangement or explicit subregion switch uses less width but can obscure the relationship. UX should evaluate a long playlist name, mixed source/video items, long failure messages, and shuffle active while a draft is edited. Neither new queue authoring nor auto-generated music is suggested here. The description does not settle how changing a playlist draft mid-run affects the already-running queue, toggling shuffle mid-run, or Previous at item start. Flag these as focused UX/owner clarifications when designing those concrete behaviors rather than inventing them.

For an unavailable queue item, preserve its visible identity and failure reason and expose only permitted recovery/Next controls. Owner candidates are stop at the failed item for review, or skip with visible notice and retained failure marker. Research here establishes neither as a shared convention. Scope area 8 owns continuity promises; automatic skipping is not accepted.

## Area 7: reviewing export and monitoring its actual result

**Source locator:** Exporting Video, saved-video eligibility, summary, per-attempt destination validation, cross-workspace continuation and close policy.

**Observed evidence.** [Premiere export](https://helpx.adobe.com/ca/premiere/desktop/render-and-export/export-files/export-video-and-audio-files.html) groups filename/location and output settings before export and offers background delivery through Media Encoder. [Kdenlive rendering](https://docs.kdenlive.org/en/exporting/render.html) distinguishes destination, output scope and initiation, and retains a submitted job while editing continues; later edits do not change that job's settings. These independent editor sources support reviewing delivery intent separately from monitoring an active job. Alexa retains its simpler one-default-MP4 choice and required single-app status arrangement.

[Media Encoder monitoring](https://helpx.adobe.com/media-encoder/desktop/encoding-and-exporting/encode-export-video-audio.html) distinguishes Ready, successful, stopped and failed results, locks outputs being encoded, and exposes error details. Its missing-media handling can produce an offline graphic; that behavior conflicts with Alexa's required clean export and is not recommended. [Final Cut background tasks](https://support.apple.com/guide/final-cut-pro/view-background-tasks-ver64e71609/mac) illustrates global entry into detailed progress/cancel controls, but its documented automatic pausing while actively editing does not match Alexa's required continuing export.

**Advisory application.** The summary should identify the saved video and duration, MP4/default configuration, and full output filename/location in readable fields. If a draft of that video differs, make the selected saved version explicit; do not export it implicitly. Refresh destination validation on every Export attempt. The replacement decision names the exact current path; Replace starts that reviewed attempt; Choose Another Location returns through refreshed summary and another Export; canceling that chooser returns to the replacement decision; Cancel writes nothing. These transitions are fixed source requirements rather than claims of an industry pattern.

During running/canceling, retain selected video/destination and display one consistent job identity in Export and Application Status. Workspace changes keep progress accessible; returning restores detail. New/Open remain visible and unavailable everywhere with an export-related reason, and are never queued. Distinguish Cancel Export request, confirmation and actual cancellation-in-progress. Do not call an output complete when cancellation was merely requested. Success names output/destination; failure and canceled states preserve retry inputs and trigger fresh validation/consent on retry.

**Platform source.** [Microsoft progress guidance](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/progress-controls) supports determinate reporting for measurable progress and indeterminate feedback when completion timing is unknown, with text naming the work. For Alexa, prefer a status treatment compatible with continued workspace interaction and reserve blocking feedback for the affected command or decision. Do not fabricate percentage or countdown estimates.

**Open close policy.** Owner options are Keep App Open while export continues; confirm Cancel Export and close only after cancellation finishes; or deliberately support closing the window while export continues elsewhere. The last requires separate feasibility evidence and discoverable monitoring/reopening semantics; neither background progress nor Kdenlive closing its render dialog proves export survives application exit. Do not infer resumable jobs from competitors' saved queues. Owner must also settle how an export-close decision composes with unsaved draft/project close guards. Recommended candidate for review: Keep App Open versus Cancel Export and Close, with final close only after confirmed operation termination; this remains unaccepted.

## Area 8: availability, interruption and capability boundaries

**Source locators:** Technology Direction; Playing Videos And Playlists; Product Questions To Work Through. The adopted player direction stays fixed; this research does not inspect or benchmark decoders, architecture, overlap capacity or lip-sync.

**Observed evidence.** [Final Cut alert guidance](https://support.apple.com/guide/final-cut-pro/alert-icons-verd1f977a7/mac) distinguishes missing and externally modified files from missing media dependencies. It supports explaining the diagnosed cause rather than using one generic unavailable flag; its proxy, plugin and remote-media features are not proposed for Alexa. [Music transitions](https://support.apple.com/en-kg/guide/music/muse5e9ec085/mac) makes transition behavior configurable and documents catalog/hardware and output-mode limitations. This is one product illustration of explicitly bounded transition support, not evidence that music crossfades suit composed videos.

**Advisory application.** Keep availability attached to the item and show the reason beside the attempted playback, editor preview or export task. Separate project saved/draft state from source availability: a saved video can still depend on missing media. Suggested vocabulary needs technical confirmation: Missing (not found), Access unavailable (could not read), Unsupported (a capability Alexa lacks), Decode failure (recognized source could not be read through), and Limited playback (a known playable component but another unavailable). Do not label a file corrupt when only an unspecified read error is known. Do not offer Locate for a format-support problem or imply Retry will add a missing capability.

Keep expected composition gaps and muted audio distinct from source failures. A stopped source transition should identify the current item/source and retained playback position; no automatic resume after a repair should be implied without an accepted policy. The required occasional preview stutter allowance is not export permission to omit frames, lose audio or change timing. If degradation is diagnosed, explain that it affects preview and where to find task details; show a blocking export failure when clean output cannot be assured rather than reporting completion. Its detection and reliable classification are technical dependencies, not UX research results.

**Owner/technical options.** For partly playable media, owner can reject playback, allow explicitly labeled partial playback, or require repair/conversion outside Alexa; none is selected. For source transitions, owner must distinguish composed-timeline continuity from playlist item transitions and settle interruption handling and audible behavior. Candidate descriptions range from ordinary item transitions with possible brief interruption to a bounded continuity promise supported by measured capabilities. A crossfade would change audio intent and is a proposed product change, not a recovery default. No support list or seamless promise can be published from this research.

## Shared cohesion and longer text

The shell should keep one project context while task regions expose their own selected/saved/draft/run/attempt identity. Link an affected source from a playlist or failed export back to the relevant source details while preserving the originating state; the actual repair action still depends on owner policy. Avoid duplicate competing success/error banners in both task and global status: the global view identifies ongoing work and routes to detail, while local view carries correction choices.

[Microsoft UI text guidance](https://learn.microsoft.com/en-us/windows/win32/uxguide/text-ui) recommends complete translatable messages and space for substantial text expansion, particularly short labels. Advisory application: let action groups wrap or grow; reserve enough vertical space for guard/failure text; show paths in a separate readable block; keep queue/editor labels visible when long item names wrap or truncate with a detail route. Treat its percentage expansion guidance as a stress-test input, not a fixed Alexa sizing rule or new localization program. Evaluate longer app-defined workspace names, repair commands and export messages without reducing the central media region to unusable width. Accessibility-specific work remains excluded.

## Actual supporting interface evidence

![Final Cut relink image](references/supporting/images/final-cut-relink.png)

downloaded from [Apple image asset](https://help.apple.com/assets/6A29F5537442EFE69C0CD4F3/6A29F558FEEBDB01270C8EF2/en_US/96a913be485c5fb913c184610dc41bb7.png), cited in the official relink page above; visually inspected 2026-10-02. It shows filenames, an example path, match count, Locate, Cancel and disabled final relink. This is a documentation screenshot, not a live-app observation. Product version of screenshot is not supplied. Attribution: Apple; retained for reference and parent review, not proposed reuse as Alexa UI artwork.

![Music queue image](references/supporting/images/apple-music-queue.png)

downloaded from [Apple image asset](https://ipcdn-web.apple.com/assets/v2/web/42ab56a7-1438-4e0f-b81c-40ef54b8f823), cited in the official Mac queue page above; visually inspected 2026-10-02. It shows separately labeled History and Queue lists with row menus and clear actions. The cropped documentation image does not show the whole desktop workspace or transport relation. Attribution: Apple; same reference-only limit.

Do not reproduce comparator trade dress. Source assertions about invisible transitions remain documentation evidence; screenshots prove only what is visible in them.

## Supporting question status

| Question ref | Status | Finding / remaining dependency |
|---|---|---|
| 5.1 browser identity/eligible actions | answered with new evidence + source requirements | Contextual identity/details and explicit opening; final layout belongs to UX/UI. |
| 5.2 New/Open/Save/Save As guards | answered from settled source, presentation supported by platform evidence | Draft then project; conditional discard and failed restoration preservation. Save As destination context follows the project action; no invented renaming policy. |
| 5.3 local source recovery | dependent on owner and technical evidence | Reviewed relink candidate supported by two products; allowed actions/matching/scope unsettled. |
| 5.4 cancel/failure returns | answered from settled source, advisory presentation | Return to original exact context; do not finalize early discard. |
| 6.1 selection versus start/cohesion | answered with new evidence + source | Explicit Play and visible current item; full spatial design remains UX. |
| 6.2 saved order/shuffle/repeat/Previous/Next | answered for settled behaviors; focused gaps explicit | Visible run separate from saved order; mid-run shuffle/editor-change policy not supplied. |
| 6.3 playlist authoring/save/recovery | answered from settled source, new queue primitives | Preserve draft and allow empty saved list; no comparator queue-edit semantics silently adopted. |
| 6.4 unavailable items/transitions | dependent on owner and technical evidence | Stop/review versus visible skip candidates; no seamless claim. |
| 7.1 saved choice/summary/defaults | answered with new evidence + source | Reviewed saved intent, simple MP4 configuration. |
| 7.2 overwrite/destination/retry/cancel/completion | answered from settled source, platform/encoder illustration | Every attempt validates; terminal outcome distinguished from request. |
| 7.3 workspace/global status/progress | answered with new evidence + source | Global route to detail, honest determinate/indeterminate status. |
| 7.4 blocked New/Open and app close | commands answered from source; close dependent on owner/feasibility | Visible unavailable reason; unqueued; close candidates stay open. |
| 8.1 missing/unsupported/unreadable/partial | dependent on owner and technical evidence | Task-specific explanation direction supported; final classifier/support/allowed recovery unsettled. |
| 8.2 boundary playback/audio interruption | dependent on owner and technical evidence | Explicit bounded promises; distinguish timeline from playlist. |
| 8.3 preview degradation/export failure | answered direction from source; technical detection unresolved | Preview tolerance cannot authorize incomplete clean export. |
| 8.4 capability information placement | answered advisory with new evidence | Item/task details for diagnosis, global status for ongoing operation. |
| Shared longer app-text resilience | answered with platform evidence, evaluation pending | Wrapping/region growth and complete messages; no new localization/accessibility scope. |

## Reuse and remaining decisions

Use the accepted scope and saved source-bound evidence for later refinements. Revisit affected findings after changed requirements, owner policy or material source evidence; preserve applicable unchanged research. Recommendations remain proposals until their owning design or product decision is selected and reviewed.

Owner amendments to selection, tracks, copy/group semantics, or property ownership would invalidate affected recommendations; unrelated reuse should survive.

Invalidate affected findings after source ownership/repair policy changes, new continuity/support evidence, changed export pipeline visible behavior, revised close policy or changed copied-media semantics. Keep remaining policies visible while designing settled journeys.


## Source inventories and inspection records

- [Composition source inventory](references/composition/evidence-inventory.json): source identities, dates, observations, applicability and historical reuse state.
- [Supporting source inventory](references/supporting/sources.json): source identities, dates, observations and applicability.
- [Separate evidence verification receipt](references/parent-evidence-verification.md) and [machine-readable receipt](references/parent-evidence-verification.json).
- [Original interface attribution record](references/composition/interface-evidence.md), [composition research log](references/composition/research-log.json) and [supporting research progress log](references/supporting/progress.json). Operational records are kept apart from the research findings.
