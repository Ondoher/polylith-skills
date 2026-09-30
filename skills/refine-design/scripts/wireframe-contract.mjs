import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

/** Shared author/reviewer contract. Keys and enum values are renderer capabilities. */
export const wireframeCapabilities = Object.freeze({
	version: 'wireframe-authoring/2',
	numericGeometry:
		'For aligned axes/ranges/markers, use a one-column grid region layout.scale:{min,max}; direct children use scalePosition:{start,end?} and placement.row. One transform supplies positions; omit end for a centered point. Keep labels and values consistent. Surrounding labels belong outside the scale region.',
	outcomeEvidence:
		'Contribute set.outcomeEvidence:[{sourcePath,sceneRef,nodeRefs,resultKind,interpretation?,values?}]. sourcePath is an exact JSON pointer into the assigned packet. resultKind is visible-change|navigation|unchanged. Link consequential results while constructing existing scenes; no scene per step is required. A status alone is not a visible changed value/object. Optional values:[{nodeRef,parameter:text|label|value,sourcePath}] compare already structured source scalars. References and type checks do not prove prose meaning; reviewers must judge it.',
	states: {
		heading: ['default'],
		text: ['default'],
		status: ['default', 'pending', 'success', 'failed', 'unavailable'],
		button: ['default', 'focus', 'selected', 'disabled'],
		'button-secondary': ['default', 'focus', 'selected', 'disabled'],
		'icon-button': ['default', 'focus', 'selected', 'disabled'],
		'text-field': ['default', 'focus', 'error', 'invalid', 'disabled'],
		'choice-group': ['default', 'focus', 'selected', 'disabled'],
		visual: ['default', 'focus', 'selected', 'disabled'],
	},
	surfaceTreatments: ['flat', 'outlined', 'elevation-1', 'elevation-2'],
	criteria: [
		'Use requiredStates identifiers directly for their scene IDs; avoid duplicate aliases. Finish after the assigned scenes exist; unfinished contributions can be saved without finish.',
		'Every assigned action has an actual control, intermediate interaction, or explicit source gap.',
		'Walk through the source steps and alternate flows using the rendered controls and feedback.',
		'Construct concrete results from supplied outcomes, including visible changed identities/values and unchanged alternatives; record compact evidence links as scenes are authored.',
		'Use the shared numeric domain for related markers, intervals and labels; do not independently approximate their coordinates.',
		'Allocate a separate row for numeric labels when they would overlap markers or handles. Size the viewport for all rows, gaps, padding and surrounding content before the first preview.',
		'Use supported component states; inspect actual focus visibility, clipping and overlap, including focus within selection.',
		'Preserve staged identity, explicit commit, recovery, disabled states and focus intent.',
		'Inspect the rendered preview for readable content and reachable controls before submitting.',
		'Wireframe acceptance is required before UI authoring; it does not approve upstream UX.',
	],
});

/** Hash exact JSON inputs; receipt identity is supplied by code, never the author. */
export function wireframeDigest(value) {
	return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

/** Assemble existing UX facts for one coherent element without a new design pass. */
export function wireframePacket(context, element) {
	const frames = (context.interactionFrames ?? []).filter((x) => element.frameRefs?.includes(x.id));
	const actionIds = new Set(element.sourceActionRefs ?? []);
	for (const frame of frames)
		for (const region of frame.regions ?? [])
			for (const affordance of region.affordances ?? []) actionIds.add(affordance.actionRef);
	const actions = (context.actions ?? []).filter((x) => actionIds.has(x.id));
	const flows = (context.flows ?? []).filter((x) => element.sourceFlowRefs.includes(x.id));
	const questionIds = new Set([...actions, ...frames, ...flows].flatMap((x) => x.questionRefs ?? []));
	const packet = {
		element: structuredClone(element),
		sourceBinding: context.sourceBinding ?? context.binding ?? null,
		sourceUxApproval: context.approval ?? 'unreviewed',
		flows,
		actions,
		interactionFrames: frames,
		feedback: (context.feedback ?? []).filter((x) => actionIds.has(x.actionRef)),
		openQuestions: (context.openQuestions ?? []).filter((x) => questionIds.has(x.id)),
		missingActionRefs: [...actionIds].filter((id) => !actions.some((x) => x.id === id)),
		criteria: wireframeCapabilities.criteria,
	};
	return {...packet, sha256: wireframeDigest(packet)};
}

/** Content-sized sections keep dialog controls and footer in normal layout flow. */
export function dialogPart({id, header, body, footer, gap = 16, padding = 24}) {
	assert(typeof id === 'string' && /^[a-z][a-z0-9-]*$/.test(id), 'Dialog needs a stable id');
	for (const nodes of [header, body, footer]) assert(Array.isArray(nodes), 'Dialog sections must be node arrays');
	const stack = (name, children) => ({
		id: `${id}-${name}`,
		kind: 'region',
		label: name,
		layout: {
			mode: 'grid',
			columns: [{unit: 'fr', value: 1}],
			rows: children.map(() => ({unit: 'content'})),
			gap,
			padding: 0,
			align: 'start',
			justify: 'stretch',
		},
		children,
	});
	return {
		id,
		root: {
			id: `${id}-root`,
			kind: 'region',
			label: id,
			surfaceTreatment: 'outlined',
			layout: {
				mode: 'grid',
				columns: [{unit: 'fr', value: 1}],
				rows: [{unit: 'content'}, {unit: 'fr', value: 1}, {unit: 'content'}],
				gap,
				padding,
				align: 'stretch',
				justify: 'stretch',
			},
			children: [stack('header', header), stack('body', body), stack('footer', footer)],
		},
	};
}

/** Apply targeted node edits to a cloned part, preserving unrelated nodes and variants. */
export function editPart(parts, changes) {
	const result = structuredClone(parts);
	for (const change of changes ?? []) {
		const part = result.find((x) => x.id === change.partRef);
		assert(part, 'Unknown partRef: ' + change.partRef);
		let target;
		const visit = (node) => {
			if (node.id === change.nodeRef) target = node;
			for (const child of node.children ?? []) visit(child);
		};
		visit(part.root);
		assert(target, 'Unknown nodeRef: ' + change.nodeRef);
		assert(change.set && !('id' in change.set) && !('kind' in change.set), 'Preserve node identity and kind');
		Object.assign(target, structuredClone(change.set));
	}
	return result;
}

/** Validate supported states in every materialized scene. */
export function checkWireframeNode(node) {
	const errors = [];
	if (node.surfaceTreatment && !wireframeCapabilities.surfaceTreatments.includes(node.surfaceTreatment))
		errors.push(`${node.id}: surfaceTreatment must be ${wireframeCapabilities.surfaceTreatments.join(', ')}`);
	const states = wireframeCapabilities.states[node.templateRef?.id];
	if (states && !states.includes(node.state))
		errors.push(`${node.id}: ${node.templateRef.id} state '${node.state}' unsupported; use ${states.join(', ')}`);
	return errors;
}
