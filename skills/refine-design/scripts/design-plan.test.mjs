import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {DesignPlan} from './DesignPlan.mjs';

const fixture = JSON.parse(
	readFileSync(new URL('../test-fixtures/parallel-design-plan.json', import.meta.url), 'utf8'),
);

/** Called by scenarios to identify actual synthetic artifact bytes.
 *
 * @param {string} bytes - Deterministic synthetic content.
 * @returns {string} - Exact content digest.
 */
function digest(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
}

/** Called by scenarios to simulate a parent-validated immutable contribution.
 *
 * @param {DesignPlanState} state - Synthetic accepted state.
 * @param {string} itemId - Fixture work identity.
 * @param {string} agentId - Synthetic contributing agent.
 * @returns {void} - Accepted contribution appended to test state.
 */
function accept(state, itemId, agentId = itemId) {
	const item = fixture.items.find((candidate) => candidate.id === itemId);
	state.accepted[itemId] = {
		agentId,
		inputs: item.inputs.map((input) =>
			input.producer
				? state.accepted[input.producer].outputs.find((output) => output.ref === input.output)
				: input,
		),
		outputs: item.owns.map((ref) => ({ref, digest: digest(`Synthetic accepted content ${itemId} ${ref}`)})),
	};
}

/** Called by review scenarios to prepare a complete frozen UX subject and independent review result.
 *
 * @returns {DesignPlanState} - Trusted parent state before gate receipt validation.
 */
function reviewedState() {
	const state = {bindings: fixture.sources, accepted: {}, gates: {}};
	for (const itemId of ['shared-ux', 'alpha-ux', 'beta-ux', 'assemble-ux', 'review-ux']) accept(state, itemId);
	return state;
}

test('synthetic plan accounts for exact source bytes and every independent source outcome', () => {
	const brief = readFileSync(new URL('../test-fixtures/parallel-design-brief.md', import.meta.url), 'utf8');
	assert.equal(fixture.sources[0].digest, digest(brief));
	const expectedOutcomes = ['shared', 'alpha', 'beta', 'visual'];
	const result = new DesignPlan(fixture).validate(expectedOutcomes);
	assert.equal(result.valid, true);
	assert.deepEqual(
		result.coverage.map((entry) => entry.outcomeId),
		expectedOutcomes,
	);
	assert.equal(fixture.items.filter((item) => item.owns.includes('ux:element:shared')).length, 1);
});

test('one shared owner unlocks exactly two independently runnable workflows deterministically', () => {
	const inspector = new DesignPlan(fixture);
	const state = {bindings: fixture.sources, accepted: {}};
	assert.deepEqual(inspector.inspect(state).ready, ['shared-ux']);
	accept(state, 'shared-ux');
	assert.deepEqual(inspector.inspect(state).ready, ['alpha-ux', 'beta-ux']);
	assert.deepEqual(inspector.inspect(state), inspector.inspect(structuredClone(state)));
});

test('independent exact-subject parent-validated UX receipt unlocks both UI workflows', () => {
	const state = reviewedState();
	state.gates['whole-ux-review'] = {
		receiptRef: 'review:ux:receipt',
		reviewerAgentId: 'review-ux',
		subjectBindings: state.accepted['review-ux'].inputs,
		subjectDigest: digest('Canonical immutable UX subject'),
		receiptDigest: digest('Existing-validator-passing UX receipt'),
	};
	assert.deepEqual(new DesignPlan(fixture).inspect(state).ready, ['alpha-ui', 'beta-ui']);
});

test('explicit justified gap accounts for an outcome without fabricated work', () => {
	const plan = structuredClone(fixture);
	plan.outcomes.push({id: 'future-owner-choice', sourceRefs: ['source:brief']});
	plan.gaps.push({
		id: 'owner-choice',
		outcomeIds: ['future-owner-choice'],
		reason: 'Owner must select a distribution platform before this scope can be authored',
	});
	const result = new DesignPlan(plan).validate();
	assert.equal(result.valid, true);
	assert.deepEqual(result.coverage.at(-1), {outcomeId: 'future-owner-choice', itemIds: [], gapIds: ['owner-choice']});
});

test('independent source checklist exposes outcomes omitted from the planner response', () => {
	const result = new DesignPlan(fixture).validate(['shared', 'alpha', 'beta', 'visual', 'missing-source-outcome']);
	assert.equal(result.valid, false);
	assert(
		result.findings.some(
			(finding) => finding.code === 'missing-requested-outcome' && finding.path === 'missing-source-outcome',
		),
	);
});

const malformedCases = [
	[
		'schema',
		'unsupported-schema',
		(plan) => {
			plan.schemaVersion = '99';
		},
	],
	[
		'identity',
		'invalid-plan-identity',
		(plan) => {
			plan.revision = 0;
		},
	],
	[
		'record identity',
		'duplicate-id',
		(plan) => {
			plan.items[1].id = plan.items[0].id;
		},
	],
	[
		'unsupported role',
		'unsupported-role-stage',
		(plan) => {
			plan.items[0].role = 'ui-researcher';
		},
	],
	[
		'prototype-like unsupported stage',
		'unsupported-role-stage',
		(plan) => {
			plan.items[0].stage = 'toString';
		},
	],
	[
		'unregistered scope',
		'unknown-scope',
		(plan) => {
			plan.items[0].scopeRefs = ['component:invented'];
		},
	],
	[
		'output qualification',
		'invalid-output',
		(plan) => {
			plan.items[5].owns = ['context:document'];
		},
	],
	[
		'duplicate shared owner',
		'ownership-conflict',
		(plan) => {
			plan.items[1].owns.push('ux:element:shared');
		},
	],
	[
		'missing prerequisite',
		'missing-dependency',
		(plan) => {
			plan.items[0].dependsOn = ['nonexistent'];
		},
	],
	[
		'cycle',
		'dependency-cycle',
		(plan) => {
			plan.items[0].dependsOn = ['alpha-ux'];
		},
	],
	[
		'missing producer prerequisite',
		'missing-input-dependency',
		(plan) => {
			plan.items[1].dependsOn = [];
		},
	],
	[
		'unknown future output',
		'invalid-producer',
		(plan) => {
			plan.items[1].inputs[1].output = 'ux:component:invented';
		},
	],
	[
		'future placeholder digest',
		'invalid-producer',
		(plan) => {
			plan.items[1].inputs[1].digest = '0'.repeat(64);
		},
	],
	[
		'external placeholder digest',
		'invalid-binding',
		(plan) => {
			plan.sources[0].digest = 'a'.repeat(64);
		},
	],
	[
		'unaccounted outcome',
		'uncovered-outcome',
		(plan) => {
			plan.outcomes.push({id: 'unassigned', sourceRefs: ['source:brief']});
		},
	],
	[
		'unknown outcome source',
		'invalid-outcome-source',
		(plan) => {
			plan.outcomes[0].sourceRefs = ['source:invented'];
		},
	],
	[
		'unjustified gap',
		'invalid-gap',
		(plan) => {
			plan.gaps.push({id: 'empty-gap', outcomeIds: ['alpha'], reason: ''});
		},
	],
	[
		'malformed gap',
		'invalid-gap',
		(plan) => {
			plan.gaps.push({id: 'bad-gap', outcomeIds: {}, reason: 'Owner choice'});
		},
	],
	[
		'missing UI review barrier',
		'missing-ux-barrier',
		(plan) => {
			plan.items[5].requiredGates = [];
		},
	],
	[
		'partial whole-UX review',
		'incomplete-ux-barrier',
		(plan) => {
			plan.items[4].reviewOf = ['alpha-ux'];
		},
	],
	[
		'self-review scope',
		'invalid-review-scope',
		(plan) => {
			plan.items[4].reviewOf = ['review-ux'];
		},
	],
	[
		'review scope shape',
		'missing-review-scope',
		(plan) => {
			plan.items[4].reviewOf = {};
		},
	],
	[
		'missing review dependency',
		'missing-gate-dependency',
		(plan) => {
			plan.items[5].dependsOn = ['assemble-ux'];
		},
	],
	[
		'gate subject substitution',
		'gate-subject-mismatch',
		(plan) => {
			plan.gates[0].inputs = [plan.sources[0]];
		},
	],
];
for (const [name, code, mutate] of malformedCases) {
	test(`malformed ${name} produces actionable ${code} findings`, () => {
		const plan = structuredClone(fixture);
		mutate(plan);
		const result = new DesignPlan(plan).validate();
		assert.equal(result.valid, false);
		assert(result.findings.some((finding) => finding.code === code && finding.message));
		assert.deepEqual(new DesignPlan(plan).inspect().ready, []);
	});
}

test('null plan and malformed collections return explicit invalid inspections', () => {
	for (const plan of [
		null,
		[],
		{},
		{...fixture, items: null},
		{...fixture, items: [{id: 'broken', dependsOn: null}]},
	]) {
		const result = new DesignPlan(plan).inspect();
		assert.equal(result.valid, false);
		assert.deepEqual(result.ready, []);
		assert(result.findings.length);
	}
});

test('distinct output IDs retain an explicit semantic-overlap notice for planner judgment', () => {
	const plan = structuredClone(fixture);
	plan.items[1].scopeRefs.push('component:shared');
	const result = new DesignPlan(plan).validate();
	assert.equal(result.valid, true);
	assert(result.notices.some((notice) => notice.code === 'semantic-overlap' && notice.path === 'shared-ux,alpha-ux'));
});

test('missing actual bindings and unresolved owner decisions block dispatch', () => {
	assert.deepEqual(new DesignPlan(fixture).inspect().ready, []);
	const plan = structuredClone(fixture);
	plan.items[0].unresolved = ['Owner must choose multi-selection behavior'];
	const result = new DesignPlan(plan).inspect({bindings: plan.sources});
	assert.deepEqual(result.ready, []);
	assert(result.items[0].blockers.some((blocker) => blocker.code === 'unresolved-decision'));
});

test('accepted stale source inputs invalidate dependent readiness without changing saved contributions', () => {
	const state = reviewedState();
	const saved = structuredClone(state.accepted);
	state.bindings = [{ref: 'source:brief', digest: digest('Changed authoritative brief')}];
	const result = new DesignPlan(fixture).inspect(state);
	assert.deepEqual(result.ready, []);
	assert(result.items.every((item) => item.status === 'blocked'));
	assert.deepEqual(state.accepted, saved);
});

test('missing review receipt and raw passing booleans cannot unlock dependent UI', () => {
	const state = reviewedState();
	assert.deepEqual(new DesignPlan(fixture).inspect(state).ready, []);
	state.gates['whole-ux-review'] = {pass: true};
	assert.deepEqual(new DesignPlan(fixture).inspect(state).ready, []);
});

test('reviewer sharing an author identity cannot satisfy independent review', () => {
	const state = reviewedState();
	state.accepted['review-ux'].agentId = state.accepted['alpha-ux'].agentId;
	const result = new DesignPlan(fixture).inspect(state);
	assert.deepEqual(result.ready, []);
	assert(
		result.items.find((item) => item.id === 'review-ux').blockers.some((blocker) => blocker.code === 'self-review'),
	);
});

test('receipt matching another subject or reviewer remains blocked', () => {
	for (const changedField of ['subjectBindings', 'reviewerAgentId']) {
		const state = reviewedState();
		state.gates['whole-ux-review'] = {
			receiptRef: 'review:ux:receipt',
			reviewerAgentId: 'review-ux',
			subjectBindings: state.accepted['review-ux'].inputs,
			subjectDigest: digest('Canonical immutable UX subject'),
			receiptDigest: digest('Existing-validator-passing UX receipt'),
		};
		if (changedField === 'subjectBindings')
			state.gates['whole-ux-review'].subjectBindings = [
				{ref: 'ux:document:frozen', digest: digest('Other frozen UX')},
			];
		else state.gates['whole-ux-review'].reviewerAgentId = 'different-agent';
		assert.deepEqual(new DesignPlan(fixture).inspect(state).ready, []);
	}
});

test('partial accepted outputs and mismatched accepted inputs hold current prerequisites', () => {
	for (const field of ['inputs', 'outputs']) {
		const state = {bindings: fixture.sources, accepted: {}};
		accept(state, 'shared-ux');
		state.accepted['shared-ux'][field] = [];
		const result = new DesignPlan(fixture).inspect(state);
		assert.deepEqual(result.ready, []);
		assert(result.items[0].blockers.some((blocker) => blocker.code === 'stale-result'));
	}
});

test('authors cannot own units in another phase or use an invented native unit kind', () => {
	for (const output of ['ui:element:shared', 'ux:component:shared']) {
		const plan = structuredClone(fixture);
		plan.items[0].owns.push(output);
		assert(new DesignPlan(plan).validate().findings.some((finding) => finding.code === 'invalid-author-output'));
	}
});

test('whole-UX scope marker cannot replace an actual frozen assembly subject', () => {
	const plan = structuredClone(fixture);
	plan.items[4].inputs = [plan.sources[0]];
	plan.gates[0].inputs = [plan.sources[0]];
	const result = new DesignPlan(plan).validate();
	assert.equal(result.valid, false);
	assert(result.findings.some((finding) => finding.code === 'missing-assembled-ux-subject'));
});

test('malformed nested identities and references return diagnostics without throwing', () => {
	const plans = [];
	for (const field of ['scopeRefs', 'owns', 'dependsOn', 'requiredGates']) {
		const plan = structuredClone(fixture);
		plan.items[0][field] = [null, {toString: 'untrusted serialized value'}];
		plans.push(plan);
	}
	plans.push({...fixture, sources: [null]});
	const malformedId = structuredClone(fixture);
	malformedId.items[0].id = {toString: 'untrusted serialized value'};
	plans.push(malformedId);
	for (const plan of plans) assert.equal(new DesignPlan(plan).validate().valid, false);
	assert.equal(new DesignPlan(fixture).validate({requested: 'wrong-shape'}).valid, false);
});
