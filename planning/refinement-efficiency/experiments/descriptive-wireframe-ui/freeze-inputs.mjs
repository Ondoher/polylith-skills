import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

import {buildUseCaseHandoff} from '../../../../skills/refine-design/scripts/composable-handoff.mjs';
import {validatePassingUxReview} from '../../../../skills/refine-design/scripts/ux-review.mjs';

const startedAt = new Date().toISOString();
const experiment = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(experiment, '../../../..');
const productRoot = 'C:/dev/alexa/product/Alexa';
const sourceRoot = 'C:/dev/alexa';
const durable = path.join(experiment, 'inputs');
const working = path.join(repository, '.codex-tmp/descriptive-wireframe-ui-20261002/inputs');
const expectedSnapshot = '12c09ddff7478114a793a51cfefb8293754276ed03d663d8837694312a5cf007';
const origins = [];
const outputs = [];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sorted = (values) => [...new Set(values)].sort();

/** Read an immutable input and retain its exact identity. */
function read(relative, scope, expected = null) {
	const absolute = path.resolve(productRoot, relative);
	const bytes = fs.readFileSync(absolute);
	const sha256 = hash(bytes);
	if (expected && sha256 !== expected) throw new Error(`Hash mismatch: ${relative}`);
	origins.push({path: absolute.replaceAll('\\', '/'), scope, sha256, byteCount: bytes.length});
	return bytes;
}

/** Write only the two isolated packet directories. */
function save(relative, value, audience = 'author', recordCount = null) {
	const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : json(value));
	for (const root of [durable, working]) {
		const target = path.resolve(root, relative);
		if (!target.startsWith(`${root}${path.sep}`)) throw new Error(`Escaping output: ${relative}`);
		fs.mkdirSync(path.dirname(target), {recursive: true});
		fs.writeFileSync(target, bytes);
	}
	outputs.push({path: relative, audience, sha256: hash(bytes), byteCount: bytes.length, recordCount});
}

/** Decode and verify the snapshot-pinned artifact, without using live discovery as authority. */
function decode(entry) {
	if (entry.status !== 'accepted' || entry.dependencyState.status !== 'current') {
		throw new Error(`Artifact is not accepted/current: ${entry.id}`);
	}
	const bytes = read(entry.content.path, `snapshot-pinned ${entry.artifactKind}`, entry.content.sha256);
	const envelope = JSON.parse(bytes);
	const compressed = Buffer.from(envelope.payload.chunks.join(''), 'base64');
	const decoded = gunzipSync(compressed);
	if (compressed.length !== envelope.payload.compressedBytes || hash(compressed) !== envelope.payload.compressedSha256) {
		throw new Error(`Compressed payload mismatch: ${entry.id}`);
	}
	if (decoded.length !== envelope.payload.decodedBytes || hash(decoded) !== envelope.payload.decodedSha256) {
		throw new Error(`Decoded payload mismatch: ${entry.id}`);
	}
	save(`reference-only/${entry.artifactKind}-envelope.json`, bytes, 'verification-only');
	return {value: JSON.parse(decoded), decoded, envelope};
}

const pointerBytes = read('current.json', 'snapshot discovery');
const pointer = JSON.parse(pointerBytes);
const snapshotBytes = read(pointer.snapshot.path, 'snapshot authority', pointer.snapshot.sha256);
const snapshot = JSON.parse(snapshotBytes);
const sourceBytes = read(snapshot.source.path, 'human source authority', snapshot.source.sha256);
const modelBytes = read(snapshot.productModel.path, 'product model authority', snapshot.productModel.sha256);
const model = JSON.parse(modelBytes);
const uxEntry = snapshot.artifacts.find((entry) => entry.artifactKind === 'ux-design');
const languageEntry = snapshot.artifacts.find((entry) => entry.artifactKind === 'design-language');
const acceptedUx = decode(uxEntry);
const acceptedLanguage = decode(languageEntry);
const ux = acceptedUx.value;
const liveUxBytes = read('ux/ux-spec.json', 'exact review-byte witness only');
if (!isDeepStrictEqual(ux, JSON.parse(liveUxBytes))) {
	throw new Error('Live UX differs from snapshot; refusing to substitute live UX for accepted artifact');
}
const reviewBytes = read('ux/review.json', 'UX review binding only');
const review = JSON.parse(reviewBytes);
const declaredSource = path.resolve(sourceRoot, ux.sources.find((item) => item.id === 'product-description').path);
if (!fs.readFileSync(declaredSource).equals(sourceBytes)) throw new Error('Declared UX source differs from retained source');

const surface = ux.surfaces.find((item) => item.id === 'video-workspace');
const localFlows = ux.flows.filter((item) => item.elementRef === 'ux:surface:video-workspace');
const localFrames = ux.interactionFrames.filter((item) => item.surfaceRef === surface.id);
const scopeRefs = [surface.id, ...localFrames.map((item) => item.id), ...localFlows.map((item) => item.id)];
validatePassingUxReview(review, {
	uxSpec: ux,
	uxSource: liveUxBytes,
	uxArtifactPath: path.join(productRoot, 'ux/ux-spec.json'),
	productDescriptionSource: sourceBytes,
	productDescriptionPath: declaredSource,
	sourceRoot,
	requiredScopeRefs: scopeRefs,
});
if (ux.productModelBinding.sha256 !== snapshot.productModel.sha256) throw new Error('UX/model binding differs from snapshot');

const handoffs = localFlows.map((flow) => buildUseCaseHandoff(model, ux, flow.id));
const catalogKeys = ['surfaces', 'interactionFrames', 'flows', 'features', 'components', 'actions', 'states', 'feedback', 'openQuestions', 'patternResearch', 'productRealizations', 'traceGaps'];
const catalogs = new Map();
const owners = new Map();
const nestedIds = new Set();
function indexNested(value, owner) {
	if (Array.isArray(value)) value.forEach((item) => indexNested(item, owner));
	else if (value && typeof value === 'object') {
		if (value.id) {
			nestedIds.add(value.id);
			owners.set(value.id, owner);
		}
		Object.values(value).forEach((item) => indexNested(item, owner));
	}
}
for (const key of catalogKeys) for (const record of ux[key]) {
	catalogs.set(record.id, {key, record});
	indexNested(record, record.id);
}
const selections = new Set(scopeRefs);
surface.componentRefs.forEach((id) => selections.add(id));
surface.stateRefs.forEach((id) => selections.add(id));
for (const handoff of handoffs) for (const key of ['actionRefs', 'stateRefs', 'feedbackRefs', 'realizationRefs', 'traceGapRefs']) {
	handoff[key].forEach((id) => selections.add(id));
}
for (const handoff of handoffs) handoff.sharedElementRefs.forEach((ref) => selections.add(ref.split(':').at(-1)));
// Shared navigation/project flows are context for the composition header and guards.
for (const id of ['navigate-work', 'protect-project']) selections.add(id);
const contextBoundaries = [];
const externalDependencies = [];
const unresolvedReferences = [];
const productSeeds = new Set(handoffs.flatMap((handoff) => handoff.productRefs.map((ref) => ref.split(':').at(-1))));
const referenceFields = /(?:Refs?|targetState|targetFrame)$/;
function visitRefs(value, callback, key = '') {
	if (Array.isArray(value)) value.forEach((item) => visitRefs(item, callback, key));
	else if (value && typeof value === 'object') Object.entries(value).forEach(([name, item]) => visitRefs(item, callback, name));
	else if (typeof value === 'string' && referenceFields.test(key)) callback(value, key);
}

const localFrameIds = new Set(localFrames.map((item) => item.id));
const localFlowIds = new Set(localFlows.map((item) => item.id));
for (let index = 0; index < [...selections].length; index++) {
	const id = [...selections][index];
	const entry = catalogs.get(id);
	if (!entry) throw new Error(`Missing selected record ${id}`);
	// Boundary metadata remains complete for navigation/ownership, but does not pull
	// the independent playback, library and export interface into authoring scope.
	if (entry.key === 'surfaces' && id !== surface.id) {
		contextBoundaries.push({id, reason: 'External surface identity/purpose retained; geometry and internal controls excluded.'});
		continue;
	}
	visitRefs(entry.record, (ref, field) => {
		const target = ref.split(':').at(-1);
		if (ref.startsWith('product:')) { productSeeds.add(target); return; }
		if (['sourceRefs', 'orderRefs', 'sourceRegionRef', 'areaRef', 'patternRef'].includes(field)) {
			externalDependencies.push({from: id, field, ref, reason: 'Source, local region/order, shell area or local pattern metadata.'});
			return;
		}
		if (catalogs.has(target)) {
			const targetEntry = catalogs.get(target);
			if (targetEntry.key === 'interactionFrames' && !localFrameIds.has(target)) {
				contextBoundaries.push({from: id, field, id: target, reason: 'External frame belongs to context workspace, not authored composition.'});
				return;
			}
			if (targetEntry.key === 'flows' && !localFlowIds.has(target) && !['navigate-work', 'protect-project'].includes(target)) {
				contextBoundaries.push({from: id, field, id: target, reason: 'External task is contextual; its relevant global availability/status is in shared components.'});
				return;
			}
			selections.add(target);
		} else if (nestedIds.has(target)) {
			selections.add(owners.get(target));
		} else if (target === ux.id) {
			externalDependencies.push({from: id, field, ref, reason: 'Exact accepted UX artifact identity.'});
		} else {
			unresolvedReferences.push({from: id, field, ref});
		}
	});
}
// Include relevant research and trace gaps in reverse attachment direction.
for (const record of ux.patternResearch) {
	if ([...record.taskRefs, ...record.actionRefs, ...record.frameRefs].some((id) => selections.has(id))) selections.add(record.id);
}
for (const record of ux.traceGaps) {
	const id = record.sourceRef.split(':').at(-1);
	if (selections.has(id) || productSeeds.has(id)) selections.add(record.id);
}
const selectedRealizations = ux.productRealizations.filter((record) => selections.has(record.uxRef.split(':').at(-1)));
selectedRealizations.forEach((record) => {
	selections.add(record.id);
	productSeeds.add(record.productRef.split(':').at(-1));
});
// Accepted language rules apply even where UX correctly leaves visual decisions to UI.
languageEntry.scopeRefs.forEach((id) => productSeeds.add(id));
['workspace-shell', 'project-commands', 'desktop-scope', 'source-ownership'].forEach((id) => productSeeds.add(id));
const modelKeys = ['users', 'capabilities', 'goals', 'requirements', 'rules', 'gaps', 'sourceClaims'];
const modelIndex = new Map(modelKeys.flatMap((key) => model[key].map((record) => [record.id, {key, record}])));
for (let index = 0; index < [...productSeeds].length; index++) {
	const id = [...productSeeds][index];
	const entry = modelIndex.get(id);
	if (!entry) throw new Error(`Missing product dependency ${id}`);
	visitRefs(entry.record, (ref) => {
		const target = ref.split(':').at(-1);
		if (modelIndex.has(target)) productSeeds.add(target);
	});
}
for (const gap of model.gaps) if (gap.affectedRecordRefs.some((id) => productSeeds.has(id))) productSeeds.add(gap.id);
const projection = Object.fromEntries(catalogKeys.map((key) => [key, ux[key].filter((record) => selections.has(record.id))]));
projection.surfaces = projection.surfaces.map((record) => record.id === surface.id ? record : {
	id: record.id, name: record.name, kind: record.kind, purpose: record.purpose, entry: record.entry, exit: record.exit,
	packetScope: 'context-only; workspace interiors are outside authoring boundary',
});
const modelProjection = Object.fromEntries(modelKeys.map((key) => [key, model[key].filter((record) => productSeeds.has(record.id))]));

const samples = {
	provisional: true,
	policy: 'These values and names are matched experiment fixtures, not new product requirements.',
	viewport: {width: 1600, height: 1000, unit: 'CSS px', deviceScaleFactor: 1},
	longTextViewport: {width: 1600, height: 1000, unit: 'CSS px'},
	baseState: {
		resolvedFrame: 0, timecode: '00:00:00:00', player: 'stopped', playerInspection: 'fit',
		projectSaveState: 'saved', videoDraftSaveState: 'unsaved', undoAvailable: false, redoAvailable: false,
		globalOperation: null, timelineWindow: {start: 0, end: 3599}, activeTrack: 'track-1', selection: null,
		insertion: {trackId: 'track-1', mode: 'append'},
		activeTrackOutputRectangle: {x: 0, y: 0, width: 1920, height: 1080, unit: 'output pixels'},
	},
	baseStateProvenance: 'Matched test-state choices: saved project with loaded unsaved video fixture draft and no edit history. These choices do not establish product initialization or persistence policy.',
	project: 'Harbor field study', video: 'Harbor morning — draft', frameRate: 30,
	outputFrame: {width: 1920, height: 1080, unit: 'output pixels'},
	duration: {seconds: 120, endInclusiveFrame: 3599},
	tracks: [
		{id: 'track-4', name: 'Track 4', layer: 'front', volumePercent: 100, muted: false, occurrences: [{id: 'label', name: 'Harbor title', startFrame: 900, endInclusiveFrame: 1199, hasAudio: false}]},
		{id: 'track-3', name: 'Track 3', volumePercent: 100, muted: false, occurrences: []},
		{id: 'track-2', name: 'Track 2', volumePercent: 60, muted: false, occurrences: [{id: 'interview', name: 'Pier interview', startFrame: 600, endInclusiveFrame: 1499, volumePercent: 80, muted: false, hasAudio: true}, {id: 'group', name: 'Harbor sequence', startFrame: 1800, endInclusiveFrame: 2699, grouped: true, sourceRectangle: {x: 160, y: 90, width: 1600, height: 900, unit: 'source pixels'}, volumePercent: 80, muted: false}]},
		{id: 'track-1', name: 'Track 1', layer: 'base', active: true, volumePercent: 100, muted: false, occurrences: [{id: 'wide', name: 'Harbor wide.mp4', startFrame: 0, endInclusiveFrame: 899}, {id: 'walk', name: 'Pier walk.mp4', startFrame: 1200, endInclusiveFrame: 2099}, {id: 'boats', name: 'Boats.mp4', startFrame: 2100, endInclusiveFrame: 3599}]},
	],
	range: {startFrame: 600, endInclusiveFrame: 1199, frameCount: 600, durationSeconds: 20, scope: 'All tracks'},
	library: {files: ['Harbor wide.mp4', 'Pier walk.mp4', 'Boats.mp4'], clips: ['Harbor sequence'], videos: ['Harbor evening'], savedClip: {id: 'library-harbor-sequence', startFrame: 0, endInclusiveFrame: 1199}},
	longerAppText: {selection: 'Zeitbereich über alle vier Videospuren', saveVideo: 'Änderungen am Video speichern', projectFailure: 'Das Projekt konnte nicht gespeichert werden. Ihre Bearbeitung bleibt erhalten.', sourceRectangle: 'Ausschnitt des Quellbildes für den ausgewählten Clip'},
};

const scenarioDefinitions = [
	['composition-base', 'Complete stopped composition workspace', ['video-view', 'track-properties'], ['edit-video', 'mix-audio'], ['choose-video', 'select-track', 'add-timeline', 'save-video'], 'No selection; Track 1 active; all four tracks, composed-time row, player, shell, identity, insertion Append, Undo/Redo availability and local/global status. Player Fit, no playback.'],
	['inclusive-range', 'Inclusive composition range and contextual actions', ['video-view', 'selection-menu'], ['edit-video', 'save-clip'], ['select-range', 'set-range-boundary', 'selection-actions', 'open-save-clip', 'delete-selection', 'split-selection'], 'Range frames 600–1199 inclusive; 600 frames / 20 s at 30 fps. All tracks scope. Object selection replaced. Play/Stop remains at left of composed row; range menu identifies actual eligible Delete, Split and Save Clip actions.'],
	['object-trim', 'Object selection and trim collision-chain preview', ['video-view', 'clip-properties'], ['edit-video'], ['select-objects', 'trim-occurrence', 'reorder-objects', 'undo', 'redo'], 'One Track 1 occurrence selected. Extend Pier walk End from frame 2099 to 2159; preview pushes only Boats forward by 60 frames on Track 1. Other tracks, source and library remain unchanged. Gesture preview differs from committed draft; Escape restores it. Reorder stays an explicit whole-object action.'],
	['independent-zoom', 'Player inspection and timeline scale remain distinct', ['video-view'], ['edit-video'], ['zoom-player-in', 'zoom-player-out', 'fit-player', 'pan-player', 'zoom-timeline', 'pan-timeline', 'follow-playhead', 'scrub', 'step-frame'], 'Player magnified at 200% with inspection pan; timeline shows frames 600–1499 at a finer scale, intentionally panned away from playhead and Follow available. Same retained range and insertion. Display numeric resolved frame; closest timeline refinement supports one frame. Fit changes inspection only.'],
	['track-audio', 'Track properties and inherited audio scope', ['video-view', 'track-properties'], ['mix-audio', 'frame-composition'], ['select-track', 'set-track-volume', 'mute-track', 'edit-track-rectangle'], 'Track 2 active, 60% track volume; muted version visibly retains 60%. Track volume and rectangle summary are contextual; mute remains in lane header. No occurrence selection or autoplay. Per-occurrence gains remain unchanged; covered video can still contribute sound.'],
	['group-properties', 'Selected group properties and unavailable Ungroup', ['video-view', 'clip-properties', 'selection-menu'], ['edit-video', 'mix-audio', 'frame-composition'], ['select-objects', 'set-clip-volume', 'mute-clip', 'edit-source-rectangle', 'ungroup-clip'], 'One copied Harbor sequence group on Track 2, custom source rectangle and 80% group volume. Group selected as one object. Show containing track, included boundaries, group crop/audio and inherited mute/no-audio explanation when applicable. Ungroup unavailable with applicable reason; preserve complete group and selection.'],
	['framing-invalid', 'Captured track output rectangle with invalid staged input', ['video-framing-view', 'track-rectangle'], ['frame-composition'], ['edit-track-rectangle', 'adjust-rectangle', 'reset-rectangle', 'apply-rectangle', 'dismiss-editor'], 'Track 2 output frame 1920×1080 pixels. Retain original full-frame rectangle. Staged x=1800, y=0, width=400, height=1080 exceeds output bounds; invalid field and disabled Apply retain values. Visual and numeric edit, Full frame and Cancel remain. Player stops at resolved frame; unchanged inspection and draft.'],
	['staged-add-conflict', 'Staged saved-video addition refuses incompatible settings', ['video-view', 'timeline-add', 'source-rectangle'], ['edit-video', 'frame-composition'], ['set-insertion', 'add-timeline', 'choose-timeline-content', 'edit-source-rectangle', 'insert-content', 'dismiss-editor'], 'Set Track 2 insertion before opening Add. Chosen saved video Harbor evening conflicts with occupied Track 2 output/audio settings; explain target/time and conflicts, insert nothing. Source rectangle is applicable for files/named clips, not a policy resolving saved-video conflicts. The separate required s08-source-rectangle scene uses an applicable staged file and captures Add target/crop/return; Cancel preserves staged choices.'],
	['clip-save-failure', 'Save Clip retains captured composition after failure', ['clip-create'], ['save-clip'], ['open-save-clip', 'name-clip', 'create-clip', 'dismiss-editor'], 'Captured frames 600–1199 inclusive across all tracks, 20 s / 600 frames. Enter Harbor highlights. Creation failed; show local actual failure, preserve name/range/draft and allow explicit retry or Cancel. No library item exists. Saved result would include framing, gaps and audio.'],
	['clip-update', 'Review a library-only named clip trim update', ['clip-update'], ['update-clip'], ['open-update-clip', 'confirm-update', 'dismiss-editor'], 'Selected occurrence associated with Harbor sequence differs from saved library trim. Compare current Start 0 / inclusive End 1199 with proposed Start 60 / inclusive End 1139. Only definition and future additions change; existing copies including selection stay unchanged. Exclude crop/audio/track publishing. Confirm, Cancel and retained failed-attempt semantics.'],
	['video-save-failure', 'Save Video failure retains editor state', ['video-saving-view', 'video-view'], ['edit-video'], ['name-video', 'save-video'], 'Name Harbor morning — draft retained after failed Save Video. Keep draft, range/object selection and insertion destination. During commit freeze all editing/context-changing actions disabled; after actual failure restore eligible controls and show Retry through explicit Save Video. Project Save is distinct and cannot save this draft implicitly.'],
	['project-guard-failure', 'Draft-first/project-second guard preserves original work', ['video-guard', 'video-project-guard'], ['protect-project'], ['open-project', 'keep-draft', 'discard-draft', 'save-project', 'discard-project', 'cancel-transition'], 'Open captured from Video Editing. Draft discard decision was deferred; project Save then fails. Keep project stage open with explicit Save retry / Discard / Cancel, original draft and project intact. Cancel returns captured origin; failed/canceled Open or restoration must never finalize deferred discard. Active export suppresses New/Open before any guard.'],
];
const scenarios = scenarioDefinitions.map(([id, title, frameRefs, flowRefs, actionRefs, expectedVisibleOutcome], index) => ({
	id: `s${String(index + 1).padStart(2, '0')}-${id}`, title, frameRefs, flowRefs, actionRefs,
	viewport: samples.viewport, sampleDataRef: 'samples.json', baseStateRef: 'samples.baseState', viewportRef: 'samples.viewport', expectedVisibleOutcome,
	requiredRelatedScenes: [],
	variantPolicy: 'One primary scenario comp plus only its explicitly listed requiredRelatedScenes. Preserve consequential lifecycle and subdialog behavior; do not multiply independent state combinations.',
}));
const scenarioStateOverrides = {
	's01-composition-base': {},
	's02-inclusive-range': {selection: {kind: 'range', ...samples.range}},
	's03-object-trim': {resolvedFrame: 1200, timecode: '00:00:40:00', selection: {kind: 'objects', trackId: 'track-1', occurrenceIds: ['walk']}, stagedTrim: {occurrenceId: 'walk', oldEndInclusiveFrame: 2099, newEndInclusiveFrame: 2159, collisionPushFrames: 60, committed: false}},
	's04-independent-zoom': {resolvedFrame: 750, timecode: '00:00:25:00', playerInspection: '200%', inspectionPan: {x: 100, y: 40, unit: 'viewport pixels'}, timelineWindow: {start: 600, end: 1499}, followPlayhead: false, selection: {kind: 'range', ...samples.range}},
	's05-track-audio': {activeTrack: 'track-2', trackAudio: {trackId: 'track-2', volumePercent: 60, muted: true}},
	's06-group-properties': {activeTrack: 'track-2', resolvedFrame: 1800, timecode: '00:01:00:00', selection: {kind: 'objects', trackId: 'track-2', occurrenceIds: ['group']}, ungroupAvailable: false},
	's07-framing-invalid': {activeTrack: 'track-2', resolvedFrame: 750, timecode: '00:00:25:00', stagedOutputRectangle: {x: 1800, y: 0, width: 400, height: 1080, unit: 'output pixels', valid: false, committed: false}},
	's08-staged-add-conflict': {activeTrack: 'track-2', insertion: {trackId: 'track-2', mode: 'explicit', frame: 1500}, stagedContent: {name: 'Harbor evening', type: 'saved-video', compatibility: 'Track 2 output/audio settings conflict', inserted: false}},
	's09-clip-save-failure': {selection: {kind: 'range', ...samples.range}, clipName: 'Harbor highlights', localOperation: {kind: 'Save Clip', status: 'failed'}},
	's10-clip-update': {activeTrack: 'track-2', selection: {kind: 'objects', trackId: 'track-2', occurrenceIds: ['group']}, libraryTrim: {startFrame: 0, endInclusiveFrame: 1199}, proposedLibraryTrim: {startFrame: 60, endInclusiveFrame: 1139}},
	's11-video-save-failure': {activeTrack: 'track-2', resolvedFrame: 750, timecode: '00:00:25:00', selection: {kind: 'range', ...samples.range}, insertion: {trackId: 'track-2', mode: 'explicit', frame: 1500}, localOperation: {kind: 'Save Video', status: 'failed'}, commitFreeze: false},
	's12-project-guard-failure': {projectSaveState: 'unsaved', localOperation: {kind: 'Save Project', status: 'failed'}, guard: {pendingAction: 'Open', stage: 'project-decision', draftDiscardDeferred: true}},
};
for (const scenario of scenarios) scenario.stateOverrides = scenarioStateOverrides[scenario.id];
scenarios.find((scenario) => scenario.id === 's08-staged-add-conflict').requiredRelatedScenes.push({
	id: 's08-source-rectangle', title: 'Applicable staged Add source rectangle with captured destination',
	frameRefs: ['video-framing-view', 'source-rectangle', 'timeline-add'], flowRefs: ['edit-video', 'frame-composition'],
	actionRefs: ['edit-source-rectangle', 'adjust-rectangle', 'reset-rectangle', 'apply-rectangle', 'dismiss-editor'],
	viewport: samples.viewport, sampleDataRef: 'samples.json',
	baseStateRef: 'samples.baseState', stateOverrides: {activeTrack: 'track-2', resolvedFrame: 750, timecode: '00:00:25:00', insertion: {trackId: 'track-2', mode: 'explicit', frame: 1500}, stagedContent: {id: 'staged-harbor-wide', name: 'Harbor wide.mp4', type: 'video-file', inserted: false}},
	fixedSample: {
		content: {id: 'staged-harbor-wide', name: 'Harbor wide.mp4', type: 'video-file', sourceFrame: {width: 1920, height: 1080, unit: 'source pixels'}},
		capturedDestination: {trackId: 'track-2', name: 'Track 2', insertionFrame: 1500, frameRate: 30, insertionSeconds: 50},
		originalRectangle: {x: 0, y: 0, width: 1920, height: 1080, unit: 'source pixels'},
		stagedRectangle: {x: 160, y: 90, width: 1600, height: 900, unit: 'source pixels'},
		resolvedFrame: 750, previewPlaying: false, inspection: 'Fit',
	},
	expectedVisibleOutcome: 'Show the staged file identity and captured Track 2 / frame 1500 (50 s) destination, source-pixel coordinate space, valid staged crop and visual/numeric adjustment. Apply returns this crop to the retained Add draft; it does not insert or create an Undo edit. Cancel returns to Add with original staged crop and destination retained. No playback restart; existing draft, range and insertion context remain unchanged.',
});
scenarios.find((scenario) => scenario.id === 's11-video-save-failure').requiredRelatedScenes.push({
	id: 's11-video-saving-busy', title: 'Save Video commit freeze preserves captured context',
	frameRefs: ['video-saving-view'], flowRefs: ['edit-video'], actionRefs: ['save-video'],
	viewport: samples.viewport, sampleDataRef: 'samples.json',
	baseStateRef: 'samples.baseState', stateOverrides: {activeTrack: 'track-2', resolvedFrame: 750, timecode: '00:00:25:00', selection: {kind: 'range', ...samples.range}, insertion: {trackId: 'track-2', mode: 'explicit', frame: 1500}, localOperation: {kind: 'Save Video', status: 'committing', progress: 'indeterminate'}, commitFreeze: true},
	fixedSample: {videoName: samples.video, operation: 'Save Video', status: 'Saving', progress: 'indeterminate; no invented percentage', retainedRange: samples.range, capturedInsertion: {trackId: 'track-2', insertionFrame: 1500, frameRate: 30}, previewPlaying: false},
	expectedVisibleOutcome: 'Render the complete composition while Save Video is actually committing. Preserve video name, selection, insertion destination and current preview. Show truthful local saving status. Disable editing gestures, Add, selection commands, properties/audio/rectangle adjustments, Undo/Redo, Save Video and context-changing controls for the commit freeze. Keep project Save distinct. On actual failure use the primary s11 retained failure state; do not imply completion or cancellation before an actual result.',
});
const requiredRelatedScenes = scenarios.flatMap((scenario) => scenario.requiredRelatedScenes);
for (const related of requiredRelatedScenes) {
	const frame = related.fixedSample.content?.sourceFrame;
	const rectangle = related.fixedSample.stagedRectangle;
	if (rectangle && (rectangle.x < 0 || rectangle.y < 0 || rectangle.width <= 0 || rectangle.height <= 0 || rectangle.x + rectangle.width > frame.width || rectangle.y + rectangle.height > frame.height)) {
		throw new Error(`Related scene crop exceeds source bounds: ${related.id}`);
	}
}
for (const scenario of [...scenarios, ...requiredRelatedScenes]) for (const key of ['frameRefs', 'flowRefs', 'actionRefs']) {
	for (const ref of scenario[key]) if (!catalogs.has(ref)) throw new Error(`Scenario references missing ${key}: ${ref}`);
}

save('reference-only/current.json', pointerBytes, 'verification-only');
save('reference-only/product-snapshot.json', snapshotBytes, 'verification-only');
save('reference-only/product-model.json', modelBytes, 'verification-only', modelIndex.size);
save('reference-only/source-description-full.md', sourceBytes, 'source-reference');
save('reference-only/accepted-ux.json', liveUxBytes, 'verification-only', catalogs.size);
save('reference-only/ux-review.json', reviewBytes, 'verification-only');
const researchBytes = read('research/product-research-brief.md', 'advisory saved research');
save('reference-only/research-full.md', researchBytes, 'research-reference');
for (const relative of ['research/references/composition/evidence-inventory.json', 'research/references/composition/research-log.json', 'research/references/composition/interface-evidence.md', 'research/references/parent-evidence-verification.json', 'research/references/parent-evidence-verification.md']) {
	save(`reference-only/${relative}`, read(relative, 'saved research evidence'), 'research-reference');
}

const sourceLines = sourceBytes.toString('utf8').split(/\r?\n/);
const sourceSpans = [[1, 122], [162, 199], [204, sourceLines.length]];
save('source-description.md', '# Frozen composition source excerpts\n\nAuthority: snapshot retained source; original line ranges follow. Later owner amendments govern earlier contradictory language. Full exact source is in reference-only/source-description-full.md.\n\n' + sourceSpans.map(([start, end]) => `<!-- Original source lines ${start}–${end} -->\n${sourceLines.slice(start - 1, end).join('\n')}`).join('\n\n'));
const research = researchBytes.toString('utf8');
const sections = research.split(/(?=^## )/m);
const relevantResearch = sections.filter((section) => !/^## (?:Supporting workflow|Area [67]|Actual supporting|Source inventories)/.test(section));
const projectedResearch = '# Advisory research for the matched composition experiment\n\nThe following saved text is advisory and does not override the source or accepted UX. The neutral-group-only Ungroup gate remains an accepted provisional UX guard for an unresolved transfer policy; research explicitly says it is not an owner requirement. No alternative zoom consolidation has been adopted. Full saved brief and evidence inventories are reference-only.\n\n' + relevantResearch.join('');
save('research.md', projectedResearch.replace(/(?:\r?\n[\t ]*)+$/, '\n'));
save('design-language.json', acceptedLanguage.value.designLanguage);
const language = acceptedLanguage.value.designLanguage;
const paletteMembers = new Map(language.palette.members.map((member) => [member.id, member.value]));
const roleValues = new Map(language.theme.roles.map((role) => [role.id, paletteMembers.get(role.paletteRef.memberId)]));
const roleMapping = {
	primary: 'primary-action', onPrimary: 'on-primary', surface: 'surface', background: 'surface',
	text: 'body-text', muted: 'field-label', border: 'panel-border', accent: 'primary-action',
	danger: 'failure', disabledBackground: 'disabled-background', fieldBorder: 'field-outline', fieldLabel: 'field-label',
};
const renderTheme = Object.fromEntries(Object.entries(roleMapping).map(([field, role]) => {
	const value = roleValues.get(role);
	if (!value) throw new Error(`Missing accepted render theme role ${role}`);
	return [field, value];
}));
const disabledState = language.button.states.disabled.foreground;
const mixBase = roleValues.get(disabledState.baseRole);
const mixOverlay = roleValues.get(disabledState.overlayRole);
const mixed = [1, 3, 5].map((offset) => Math.round(parseInt(mixBase.slice(offset, offset + 2), 16) * (1 - disabledState.amount) + parseInt(mixOverlay.slice(offset, offset + 2), 16) * disabledState.amount).toString(16).padStart(2, '0')).join('');
Object.assign(renderTheme, {disabledForeground: `#${mixed.toUpperCase()}`, radius: language.button.metrics.radius, fieldRadius: language.textField.metrics.radius, fontSize: language.typography.roles.find((role) => role.id === 'body').sizePx});
save('render-theme.json', renderTheme, 'author', Object.keys(renderTheme).length);
save('render-theme-provenance.json', {
	source: {artifact: languageEntry.id, revision: languageEntry.revision, envelopeSha256: languageEntry.content.sha256, frozenFile: 'design-language.json'},
	roleMapping, directMetrics: {radius: 'button.metrics.radius', fieldRadius: 'textField.metrics.radius', fontSize: 'typography.roles[id=body].sizePx'},
	disabledForeground: {method: 'rounded sRGB compositing of accepted disabled foreground state', ...disabledState, result: renderTheme.disabledForeground},
	sharedAdapterAliases: {background: 'surface; accepted ordinary light application surface', muted: 'field-label; common secondary label role used for harness muted text', accent: 'primary-action; terracotta identity accent'},
	provisionalMissingRoleValues: [], policy: 'Deterministic common adapter aliases; identical in both paths. No author-specific defaults.',
}, 'author');
save('samples.json', samples);
save('scenarios.json', scenarios, 'author', scenarios.length);
save('product-requirements.json', {identity: snapshot.productModel, source: snapshot.source, ...modelProjection}, 'author', Object.values(modelProjection).reduce((sum, values) => sum + values.length, 0));
save('scope-surfaces.json', {application: ux.application, surfaces: projection.surfaces, components: projection.components, features: projection.features, states: projection.states}, 'author', projection.surfaces.length + projection.components.length + projection.features.length + projection.states.length);
save('interaction-frames.json', projection.interactionFrames, 'author', projection.interactionFrames.length);
save('actions.json', projection.actions, 'author', projection.actions.length);
save('flows.json', projection.flows, 'author', projection.flows.length);
save('feedback.json', projection.feedback, 'author', projection.feedback.length);
save('questions-and-trace.json', {openQuestions: projection.openQuestions, traceGaps: projection.traceGaps, productRealizations: projection.productRealizations, patternResearch: projection.patternResearch}, 'author', projection.openQuestions.length + projection.traceGaps.length + projection.productRealizations.length + projection.patternResearch.length);
save('usage-packet.json', {
	schemaVersion: 'experiment-1', identity: {product: 'Alexa', snapshot: pointer.snapshot, ux: {id: ux.id, revision: ux.revision, sha256: hash(liveUxBytes)}, designLanguage: {id: languageEntry.id, revision: languageEntry.revision, sha256: languageEntry.content.sha256}},
	authoringBoundary: {surface: surface.id, frameRefs: localFrames.map((record) => record.id), flowRefs: localFlows.map((record) => record.id), contextOnly: ['project/library identity and chooser content', 'global export availability/status', 'external workspace identities', 'shared project guard behavior']},
	files: outputs.filter((item) => item.audience === 'author').map(({path, sha256, byteCount, recordCount}) => ({path, sha256, byteCount, recordCount})),
	readingOrder: ['source-description.md', 'product-requirements.json', 'scope-surfaces.json', 'interaction-frames.json', 'actions.json', 'flows.json', 'feedback.json', 'questions-and-trace.json', 'research.md', 'design-language.json', 'render-theme.json', 'render-theme-provenance.json', 'samples.json', 'scenarios.json'],
	sharedInterpretations: [
		'Choose insertion in the stopped editor before opening Add; Add retains destination. This follows accepted set-insertion/action semantics and does not change stored flow relations.',
		'Preserve accepted neutral-group Ungroup availability limits provisionally; they express unresolved UX policy rather than an owner mandate. No transfer/reset/mapping algorithm may be invented.',
		'Rectangle editor source units are source pixels and track units output pixels; fixture is 1920×1080, not a new resolution limit.',
		'Every scenario uses the same sample fixture, viewport, source, accepted language and rendering capabilities in both paths. Longer translations are inspection fixtures.',
	],
	requiredRelatedSceneIds: requiredRelatedScenes.map((scene) => scene.id),
	selectedSceneCount: scenarios.length + requiredRelatedScenes.length,
	rendererLimitation: {media: 'schematic', policy: 'No raster images or video assets are supplied. Both paths render composed preview and timeline thumbnails with deterministic schematic media using the shared fixture. This experiment limitation belongs in accompanying documentation, never as implementation commentary or placeholder instructions on the interface.'},
	withheld: ['Prior Alexa wireframe geometry', 'Prior Alexa finished comps', 'Prior review findings', 'Design-language specimen page/review-layout geometry'],
	referenceOnlyPolicy: 'Author assignments receive only listed author files. Do not load verification-only files or historical artifacts. Exact full source/research may be read only as relevant textual authority/advisory references; never load UX review findings.',
});

const bindingReport = {
	passed: true, snapshotStillPlanningVersion: pointer.snapshot.sha256 === expectedSnapshot,
	snapshot: pointer.snapshot, sourceDescriptionSha256: hash(sourceBytes), declaredSourcePath: declaredSource.replaceAll('\\', '/'),
	ux: {id: ux.id, revision: ux.revision, envelopeSha256: uxEntry.content.sha256, decodedSha256: hash(acceptedUx.decoded), reviewBytesSha256: hash(liveUxBytes), decodedDeepEqualsReviewedLive: true, verdict: review.verdict, reviewedScope: review.subject.scopeRefs, requiredScopeRefs: scopeRefs},
	designLanguage: {id: languageEntry.id, revision: languageEntry.revision, envelopeSha256: languageEntry.content.sha256, decodedSha256: hash(acceptedLanguage.decoded), acceptedCurrentSnapshotEntry: true, independentReviewReceipt: 'No distinct design-language qualitative review receipt identified in this snapshot; accepted entry is the binding authority. Specimen review-layout is withheld.'},
	conflicts: [
		{id: 'insertion-order', kind: 'accepted flow sequencing ambiguity', evidence: 'Review receipt retains advisory insertion-branch-order; accepted set-insertion affordance is in video-view, while Add retains destination.', sharedResolution: 'Source/action-consistent editor insertion before Add. Do not rewrite live UX.'},
		{id: 'ungroup-authority', kind: 'advisory research versus provisional accepted UX', evidence: 'Saved research says neutral-group-only restriction is earlier adaptation, not owner requirement. Accepted UX gates it while transfer policy remains open.', sharedResolution: 'Keep accepted gate and explicit policy question; label provisional in packet documentation, never interface implementation commentary.'},
	],
	unresolvedReferences: sorted(unresolvedReferences.map((item) => JSON.stringify(item))).map((item) => JSON.parse(item)),
	contextBoundaries: sorted(contextBoundaries.map((item) => JSON.stringify(item))).map((item) => JSON.parse(item)),
	externalDependencies: sorted(externalDependencies.map((item) => JSON.stringify(item))).map((item) => JSON.parse(item)),
	selectionMethod: 'Existing buildUseCaseHandoff for each actual local flow, union with video-workspace/actual video frames, explicit directed semantic refs with authored-v-context boundaries, reverse research/realization/trace attachment, then product dependency closure.',
	handoffs,
};
save('reference-only/binding-and-selection-report.json', bindingReport, 'verification-only');
if (bindingReport.unresolvedReferences.length) throw new Error(`Unresolved semantic refs: ${JSON.stringify(bindingReport.unresolvedReferences)}`);

// Recheck every captured live input; the experiment never writes into productRoot.
const liveInputVerification = origins.map((origin) => ({path: origin.path, unchanged: hash(fs.readFileSync(origin.path)) === origin.sha256}));
if (liveInputVerification.some((entry) => !entry.unchanged)) throw new Error('Live input changed during freeze');
const completedAt = new Date().toISOString();
const manifest = {
	schemaVersion: 'experiment-1', status: 'frozen', startedAt, completedAt, elapsedMs: Date.parse(completedAt) - Date.parse(startedAt),
	packetRoot: durable.replaceAll('\\', '/'), workingPacketRoot: working.replaceAll('\\', '/'),
	inputSnapshot: pointer.snapshot, planningSnapshotChanged: pointer.snapshot.sha256 !== expectedSnapshot,
	sourceIdentity: snapshot.source, productModelIdentity: snapshot.productModel,
	uxIdentity: {id: ux.id, revision: ux.revision, reviewedBytesSha256: hash(liveUxBytes), envelope: uxEntry.content}, designLanguageIdentity: languageEntry.content,
	origins, outputs, counts: Object.fromEntries(Object.entries(projection).map(([key, records]) => [key, records.length])),
	scope: {authoredSurface: surface.id, authoredFrames: localFrames.map((record) => record.id), authoredFlows: localFlows.map((record) => record.id), contextFlows: projection.flows.filter((record) => !localFlowIds.has(record.id)).map((record) => record.id)},
	scenarios: scenarios.map(({id, title, frameRefs, flowRefs, actionRefs, requiredRelatedScenes: related}) => ({id, title, frameRefs, flowRefs, actionRefs, requiredRelatedScenes: related.map(({id: sceneId, title: sceneTitle}) => ({id: sceneId, title: sceneTitle}))})),
	primaryScenarioCount: scenarios.length, requiredRelatedSceneCount: requiredRelatedScenes.length, selectedSceneCount: scenarios.length + requiredRelatedScenes.length,
	authorPacketByteCount: outputs.filter((item) => item.audience === 'author').reduce((sum, item) => sum + item.byteCount, 0),
	conflicts: bindingReport.conflicts, unresolvedReferences: bindingReport.unresolvedReferences, liveInputVerification,
	preparationRecovery: ['Initial broad snapshot/model diagnostic output exceeded tool token limit; recovered by summarized inspection and bounded reader. No author input was derived from truncated text.', 'One Node -e invocation lost quotation marks under Windows PowerShell; replaced by module source on stdin.', 'No separate model process, backend, proxy or observer was used.'],
	renderingContract: 'Common existing refine-design scene/component rendering, HTML capture and progressive contribution tooling; exact capabilities pinned by parent experiment adapter before author dispatch. No live product/schema gate is relaxed.',
};
save('manifest.json', manifest, 'manifest');
fs.writeFileSync(path.join(experiment, 'manifest.json'), json(manifest));
const coverage = `# Frozen composition packet\n\nFrozen ${completedAt}; snapshot revision ${snapshot.revision}, SHA-256 ${pointer.snapshot.sha256}. Exact UX/source/review binding passes. Both paths must use inputs/usage-packet.json and the identical scenarios.json.\n\nAuthored boundary: complete Video Editing workspace, ${localFrames.length} source-bound frames, and ${localFlows.length} local flows. Project/library identities, chooser content, shared project guards and global export availability/status are contextual. No external workspace interior is authored.\n\n${scenarios.map((scenario) => `- **${scenario.id}** — ${scenario.title}. Frames: ${scenario.frameRefs.join(', ')}. ${scenario.expectedVisibleOutcome}`).join('\n\n')}\n\n## Coverage and limits\n\nThe packet retains ${projection.actions.length} complete actions, ${projection.feedback.length} feedback records, ${projection.flows.length} complete flows including context, ${projection.components.length} components, and all ${localFrames.length} authored frames. Source and saved research remain textual evidence; no old geometry, comps or review findings are author inputs. All meaningful numeric limits and units remain in complete semantic records. The 12 scenarios cover selected consequential states, rather than every independent combination. Source-rectangle staged invocation and Save Video busy freeze are captured as required related state behavior; no separate scenario combination is mandated.\n\nInsertion is selected before Add; the retained accepted flow sequencing advisory remains in verification-only evidence. Neutral-group Ungroup remains provisional accepted UX and is not elevated to an owner requirement. Saved-video settings conflict and unsupported Ungroup preserve work; media relinking/repair and app-close-during-export policy are not invented.\n\nBindings and the mechanical closure, context boundaries and original review receipt are retained in inputs/reference-only/. All ${origins.length} live source inputs were rehashed unchanged after freezing. Original product files and current pointers were read only.\n\nMeasured extraction script elapsed: ${manifest.elapsedMs} ms. Host reasoning/token metrics are unavailable. Authoring, rendering and reviewer work have not begun in this stage.\n`;
const refinedCoverage = coverage.replace(
	'Source-rectangle staged invocation and Save Video busy freeze are captured as required related state behavior; no separate scenario combination is mandated.',
	'The 12 primary scenario identities are unchanged. Two required related scenes bring selected rendered coverage to 14 scenes: s08-source-rectangle and s11-video-saving-busy. They are identical in both paths and add no arbitrary state combinations.',
).replace(
	'Authoring, rendering and reviewer work have not begun in this stage.',
	'This Stage 2 packet-contract refinement occurs before measured pairs; extraction/tooling-development costs remain separate from benchmark execution.',
) + `\n## Required related scenes\n\n${requiredRelatedScenes.map((scene) => `- **${scene.id}** — ${scene.title}. Frames: ${scene.frameRefs.join(', ')}. ${scene.expectedVisibleOutcome} Fixed samples: ${JSON.stringify(scene.fixedSample)}.`).join('\n\n')}\n\n## Fixture question and decision\n\nStage 2 exposed an unspecified base workspace state: resolved frame, project/draft save status, edit history and insertion context were otherwise left to each author. Pin samples.baseState to frame 0 / 00:00:00:00, stopped player at Fit, saved project, loaded unsaved fixture draft with no edit history, Undo/Redo unavailable, no global operation, full 0–3599 frame timeline window, Track 1 active, no selection, Track 1 Append and full-frame 1920×1080 output rectangle. Each scenario references this base and declares its stateOverrides; related scenes do likewise. These are identical test fixtures in both arms, not product policies.\n\nShared rendering limitation: no raster/video assets are supplied. Preview and thumbnails use deterministic schematic media. Keep this limitation and all fixture commentary outside the interface. The 12 primary scenarios plus two required related scenes are unchanged.\n`;
const checkpointVerificationNote = '\n## Checkpoint verification correction\n\nThe earlier working-tree git diff check did not inspect untracked packet data. The checkpoint staged diff check found an extra blank line at the end of projected inputs/research.md; the projection now ends with exactly one LF, with all research text retained. The reference-only parent-evidence-verification.json and .md retain their byte-exact CRLF source data. Final checkpoint verification must use the parent-owned scoped Git whitespace attributes for these two fixtures, retain ordinary whitespace checks elsewhere, restage rebuilt outputs, and run git diff --cached --check. Hash/mirror and unchanged-live-input checks are independent of that staged whitespace check.\n';
fs.writeFileSync(path.join(experiment, 'coverage.md'), refinedCoverage + checkpointVerificationNote);
console.log(json({packetRoot: manifest.packetRoot, workingPacketRoot: manifest.workingPacketRoot, counts: manifest.counts, scenarios: scenarios.map((scenario) => scenario.id), authorPacketByteCount: manifest.authorPacketByteCount, elapsedMs: manifest.elapsedMs, unchangedLiveInputCount: liveInputVerification.length}));
