import fs from 'node:fs';
import path from 'node:path';

// Facts and task boundaries only. No corrected candidates or implementation answers.
const cases = {
	states: {
		name: 'Category chooser',
		action: 'choose-category',
		purpose:
			'Choose Alpha or Beta for a draft record. Default is Alpha. Selection only updates the draft; Save commits. The chooser and Save need clear keyboard focus. Save is unavailable while the draft is unchanged. Show focused controls, changed selection and disabled Save. No additional navigation or data operations.',
		outcome:
			'Beta is visibly selected in the draft before saving; selection and keyboard focus remain distinguishable.',
		states: ['default', 'focused', 'selected', 'disabled'],
	},
	geometry: {
		name: 'Measurement interval',
		action: 'adjust-range',
		purpose:
			'Show a measurement domain from -20 to 80 units. The selected interval is 5 to 55 and the inspection marker is 5. Show numeric labels, interval and marker aligned to the same scale at widths 400 and 800. Show a focused range-start handle inside the selection. Values are supplied sample data, not constraints on future domains. One coherent display, no save workflow.',
		outcome:
			'The interval begins at 5 and ends at 55; marker and start label align with its left edge. Resizing retains these relationships.',
		states: ['narrow', 'wide', 'focused'],
	},
	outcome: {
		name: 'Record creation',
		action: 'create-record',
		purpose:
			'A form creates a record with a supplied name. Sample input is Morning notes. Save explicitly commits. Successful creation shows the new named record in the record list; a status message alone is insufficient. On failure retain the entered name and offer Retry. Cancel returns to the unchanged empty list. Show only form, success and failure states; the unchanged empty list may be described as the Cancel destination.',
		outcome: 'A new record named Morning notes is visible in the list.',
		states: ['form', 'success', 'failure'],
	},
};
const output = path.resolve('.codex-tmp/wireframe-prevention-inputs');
fs.mkdirSync(output, {recursive: true});
for (const [id, item] of Object.entries(cases)) {
	const flow = {
		id: id + '-flow',
		name: item.name,
		goal: item.purpose,
		outcome: item.outcome,
		steps: [{id: 'perform', action: item.name, actionRef: item.action, response: item.outcome}],
		alternates: [],
	};
	if (id === 'outcome')
		flow.alternates = [
			{
				id: 'failed',
				afterStepRef: 'perform',
				condition: 'Save fails',
				steps: [],
				outcome: 'Retain Morning notes and expose Retry without showing a created record.',
			},
			{
				id: 'cancel',
				afterStepRef: 'perform',
				condition: 'Cancel before Save',
				steps: [],
				outcome: 'Return to the unchanged empty list.',
			},
		];
	const fixture = {
		context: {
			scopeBasis: {
				previousSources: [],
				currentSources: [
					{id: 'exercise', revision: 1, records: {[id]: {purpose: item.purpose, outcome: item.outcome}}},
				],
				impacts: [
					{
						id: 'exercise-' + id,
						elementId: id,
						kind: 'requirement-change',
						status: 'ready',
						reason: item.purpose,
						affectedRefs: ['action:' + item.action],
						dependencies: [{sourceId: 'exercise', recordRefs: [id]}],
					},
				],
			},
			sourceBinding: {fixture: id, revision: 1},
			approval: 'unreviewed',
			flows: [flow],
			actions: [{id: item.action, name: item.name, purpose: item.purpose, outcome: item.outcome}],
			interactionFrames: [],
			feedback: [],
			openQuestions: [],
		},
		design: {
			foundations: {
				description:
					'Simple record-management utility. Use the supplied theme, outlined labeled fields, readable controls and clear focus. No product-specific branding.',
				theme: {primary: '#6535a0', accent: '#117755', danger: '#b12244', surface: '#fffdf8'},
			},
			tokens: [],
			templates: [],
			patternResearch: [],
		},
		scope: {
			elements: [
				{
					id,
					title: item.name,
					disposition: 'update',
					impactRefs: ['exercise-' + id],
					sourceFlowRefs: [flow.id],
					sourceActionRefs: [item.action],
					frameRefs: [],
					changeReason: item.purpose,
					requiredStates: item.states,
					dependencies: [],
				},
			],
		},
	};
	fs.writeFileSync(path.join(output, id + '.json'), JSON.stringify(fixture, null, 2));
}
console.log(output);
