import test from 'node:test';
import assert from 'node:assert/strict';
import {
	validateStructurePlan,
	validateWeightAssessment,
	renderOutlineWithBreaks,
	renderStructureSkeleton,
	renderWeightAssessment,
} from './prd-structure.mjs';

const outlineSha256 = 'a'.repeat(64);
const weightsSha256 = 'b'.repeat(64);
const index = {
	context: {id: 'synthetic-context'},
	sourceIndexSha256: 'synthetic-index',
	exclusions: [],
	sources: [
		{ref: 'product:workshop', kind: 'product', label: 'Workshop', value: {name: 'Workshop'}, relations: []},
		{
			ref: 'product:reserve',
			kind: 'requirement',
			label: 'Reserve a tool',
			value: {id: 'reserve'},
			relations: [{field: '/related', targetRef: 'product:return'}],
		},
		{ref: 'product:return', kind: 'requirement', label: 'Return a tool', value: {id: 'return'}, relations: []},
	],
};
const outline = {
	schemaVersion: '1.0',
	contextId: index.context.id,
	sourceIndexSha256: index.sourceIndexSha256,
	notes: [],
	groups: [
		{
			id: 'orientation',
			title: 'Orientation',
			summary: 'Introduce the tool workflow.',
			sourceRefs: ['product:workshop'],
			children: [],
		},
		{
			id: 'work',
			title: 'Tool work',
			summary: 'Reserve and return tools.',
			sourceRefs: [],
			children: [
				{
					id: 'reserve',
					title: 'Reserve',
					summary: 'Reserve an available tool.',
					sourceRefs: ['product:reserve'],
					children: [],
				},
				{
					id: 'return',
					title: 'Return',
					summary: 'Release a borrowed tool.',
					sourceRefs: ['product:return'],
					children: [],
				},
			],
		},
	],
};
const weights = {
	schemaVersion: '1.0',
	contextId: index.context.id,
	sourceIndexSha256: index.sourceIndexSha256,
	outlineSha256,
	overallNotes: [],
	nodes: ['orientation', 'work', 'reserve', 'return'].map((groupId) => ({
		groupId,
		weight: groupId === 'work' ? 'high' : 'medium',
		factors: {
			sourceDepth: 'medium',
			interactionDepth: 'low',
			visualFootprint: 'low',
			sharedLoad: 'low',
			crossLinks: 'low',
		},
		rationale: 'The identified facts form a coherent reader task.',
		gapRefs: [],
	})),
};
const page = (id, title, groupRefs, parentPageId = null) => ({
	id,
	parentPageId,
	title,
	summary: `Review ${title.toLowerCase()}.`,
	groupRefs,
	compRefs: [],
	rationale: 'This subject has a distinct reading purpose.',
});
const standaloneContext = {
	orientation: 'A workshop coordinates shared tools.',
	terms: ['Tool'],
	scope: 'Tool reservations and returns.',
	behavior: 'Staff reserve and return tools.',
	openQuestions: [],
};
const peerDecisions = [
	{
		parentGroupId: 'work',
		pattern: 'peer-pages',
		exceptions: [],
		rationale: 'Reservation and return are substantial sibling tasks, so both receive pages.',
	},
];
const binding = {
	schemaVersion: '1.0',
	contextId: index.context.id,
	sourceIndexSha256: index.sourceIndexSha256,
	outlineSha256,
	weightsSha256,
	revision: 1,
};
const inputs = {index, outline, outlineSha256, weightsSha256};

test('a coherent subject can use one document with linked pages', () => {
	assert.equal(validateWeightAssessment(weights, {index, outline, outlineSha256}).nodeCount, 4);
	assert.match(renderWeightAssessment(weights, {index, outline, outlineSha256}), /Coverage: 4 of 4 outline nodes/);
	const plan = {
		...binding,
		documents: [
			{
				id: 'tool-guide',
				title: 'Tool guide',
				audience: 'Workshop staff',
				purpose: 'Find and complete tool work.',
				standaloneContext,
				boundaryRationale: 'The tasks share one audience and vocabulary.',
				pages: [
					page('start', 'Start here', ['orientation']),
					page('reserve', 'Reserve a tool', ['reserve'], 'start'),
					page('return', 'Return a tool', ['return'], 'start'),
				],
			},
		],
		crossLinks: [
			{from: 'tool-guide/reserve', to: 'tool-guide/return', purpose: 'Continue to the related return task.'},
		],
		peerDecisions,
		notes: [],
	};
	const result = validateStructurePlan(plan, inputs);
	assert.equal(result.documentCount, 1);
	assert.equal(result.pageCount, 3);
	assert.equal(result.sourceCount, 3);
	assert.ok(result.relationPairs.has('tool-guide/reserve->tool-guide/return'));
	assert.match(renderStructureSkeleton(plan, inputs), /Coverage: 3 of 3 eligible sources/);
	assert.match(renderStructureSkeleton(plan, inputs), /- \[Start here\].*\n  - \[Reserve a tool\]/);
	const marked = renderOutlineWithBreaks(plan, inputs);
	assert.match(marked, /### Entry page: Start here/);
	assert.match(marked, /### Page break: Reserve a tool/);
	assert.match(marked, /### Page break: Return a tool/);
	assert.equal(marked.match(/`product:reserve`/g)?.length, 1);
});

test('distinct reader purposes can use separate standalone document entry points', () => {
	const plan = {
		...binding,
		documents: [
			{
				id: 'requirements',
				title: 'Tool requirements',
				audience: 'Product implementers',
				purpose: 'Understand reservation rules.',
				standaloneContext,
				boundaryRationale: 'This entry point serves implementation planning.',
				pages: [
					page('start', 'Requirements orientation', ['orientation']),
					page('reserve', 'Reservation', ['reserve'], 'start'),
				],
			},
			{
				id: 'operations',
				title: 'Tool operations',
				audience: 'Workshop operators',
				purpose: 'Carry out returns.',
				standaloneContext: {
					...standaloneContext,
					orientation: 'The operations guide introduces the same workshop and terms for operators.',
				},
				boundaryRationale: 'Operators need an independent task entry point.',
				pages: [page('return', 'Return a tool', ['return'])],
			},
		],
		crossLinks: [
			{from: 'requirements/reserve', to: 'operations/return', purpose: 'Follow the related return procedure.'},
		],
		peerDecisions,
		notes: [],
	};
	const result = validateStructurePlan(plan, inputs);
	assert.equal(result.documentCount, 2);
	assert.equal(result.sourceCount, 3);
	assert.match(renderStructureSkeleton(plan, inputs), /requirements\/reserve\.html/);
	assert.match(renderStructureSkeleton(plan, inputs), /operations\/return\.html/);
});

test('a developed coherent lifecycle stays one document across several pages', () => {
	const topics = [
		'catalog',
		'eligibility',
		'reservation',
		'pickup',
		'return',
		'inspection',
		'maintenance',
		'availability',
	];
	const developedIndex = {
		context: {id: 'lifecycle-context'},
		sourceIndexSha256: 'lifecycle-index',
		exclusions: [],
		sources: topics.map((topic) => ({
			ref: `product:${topic}`,
			kind: 'requirement',
			label: topic,
			value: {id: topic},
			relations: [],
		})),
	};
	const developedOutline = {
		schemaVersion: '1.0',
		contextId: developedIndex.context.id,
		sourceIndexSha256: developedIndex.sourceIndexSha256,
		notes: [],
		groups: [
			{
				id: 'lifecycle',
				title: 'Tool lifecycle',
				summary: 'One shared inventory and reservation lifecycle.',
				sourceRefs: [],
				children: topics.map((topic) => ({
					id: topic,
					title: topic,
					summary: `Describe ${topic}.`,
					sourceRefs: [`product:${topic}`],
					children: [],
				})),
			},
		],
	};
	const developedPlan = {
		schemaVersion: '1.0',
		contextId: 'lifecycle-context',
		sourceIndexSha256: 'lifecycle-index',
		outlineSha256,
		weightsSha256,
		revision: 1,
		documents: [
			{
				id: 'tool-lifecycle',
				title: 'Tool lifecycle',
				audience: 'Workshop coordinators',
				purpose: 'Understand the complete shared tool lifecycle.',
				standaloneContext,
				boundaryRationale: 'The same coordinator owns the connected reservation and return work.',
				pages: [
					page('prepare', 'Prepare tools', ['catalog', 'eligibility']),
					page('reserve', 'Reserve and collect', ['reservation', 'pickup'], 'prepare'),
					page('return', 'Return and inspect', ['return', 'inspection'], 'prepare'),
					page('maintain', 'Maintain availability', ['maintenance', 'availability'], 'prepare'),
				],
			},
		],
		crossLinks: [
			{
				from: 'tool-lifecycle/reserve',
				to: 'tool-lifecycle/return',
				purpose: 'Continue the lifecycle after tool use.',
			},
		],
		peerDecisions: [
			{
				parentGroupId: 'lifecycle',
				pattern: 'mixed',
				exceptions: [
					{groupId: 'pickup', reason: 'Pickup stays with reservation rather than becoming a thin page.'},
				],
				rationale:
					'Related pairs share a page to preserve continuity while each phase has a linked destination.',
			},
		],
		notes: [],
	};
	const result = validateStructurePlan(developedPlan, {
		index: developedIndex,
		outline: developedOutline,
		outlineSha256,
		weightsSha256,
	});
	assert.equal(result.documentCount, 1);
	assert.equal(result.pageCount, 4);
	assert.equal(result.sourceCount, 8);
});
