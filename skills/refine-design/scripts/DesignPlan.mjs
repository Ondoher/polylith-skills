/** Operational ownership and dependency inspection over existing design identities. */
export class DesignPlan {
	/** Creates an inspector over an untrusted operational plan without canonical writes.
	 *
	 * @param {DesignPlanDocument} plan - Supplied plan; validation precedes inspection.
	 */
	constructor(plan) {
		this.plan = structuredClone(plan);
	}
	/** Called by validation to recognize nonempty identities.
	 *
	 * @param {unknown} value - Candidate identity.
	 * @returns {boolean} - Whether the value is a nonempty string.
	 */
	_text(value) {
		return typeof value === 'string' && value.trim().length > 0;
	}
	/** Called by binding validation to reject absent or placeholder digests.
	 *
	 * @param {unknown} digest - Candidate SHA-256 content identity.
	 * @returns {boolean} - Whether a concrete digest is supplied.
	 */
	_digest(digest) {
		return typeof digest === 'string' && /^[a-f0-9]{64}$/.test(digest) && !/^(.)\1{63}$/.test(digest);
	}
	/** Called by validation to append an actionable finding.
	 *
	 * @param {DesignPlanFinding[]} findings - Destination findings.
	 * @param {string} code - Stable problem category.
	 * @param {string} path - Plan field or work item.
	 * @param {string} message - Repair instruction.
	 * @returns {void} - Appended finding.
	 */
	_issue(findings, code, path, message) {
		findings.push({code, path, message});
	}
	/** Called by validation to check list fields without inventing defaults.
	 *
	 * @param {unknown} values - Candidate strings.
	 * @returns {boolean} - Whether the list contains unique nonempty strings.
	 */
	_strings(values) {
		return (
			Array.isArray(values) &&
			values.every((value) => this._text(value)) &&
			new Set(values).size === values.length
		);
	}
	/** Called by validation to establish stable unique record identities.
	 *
	 * @param {unknown[]} records - Candidate records.
	 * @param {string} path - Collection name.
	 * @param {DesignPlanFinding[]} findings - Destination findings.
	 * @returns {Map<string, DesignPlanRecord>} - Records addressable by identity.
	 */
	_records(records, path, findings) {
		const result = new Map();
		for (const [index, record] of records.entries()) {
			if (
				!record ||
				typeof record !== 'object' ||
				Array.isArray(record) ||
				!this._text(record.id) ||
				!/^[a-z][a-z0-9-]*$/.test(record.id)
			)
				this._issue(findings, 'invalid-id', `${path}[${index}]`, 'Supply a stable lowercase record ID');
			else if (result.has(record.id)) this._issue(findings, 'duplicate-id', path, `Duplicate ID ${record.id}`);
			else result.set(record.id, record);
		}
		return result;
	}
	/** Called by validation to establish exact external or future input references.
	 *
	 * @param {DesignPlanInput[]} inputs - Serialized inputs.
	 * @param {string} path - Owning item or gate.
	 * @param {Map<string, DesignPlanItem>} items - Producers.
	 * @param {DesignPlanFinding[]} findings - Destination findings.
	 * @returns {void} - Appended findings.
	 */
	_inputs(inputs, path, items, findings) {
		if (!Array.isArray(inputs)) {
			this._issue(findings, 'invalid-inputs', path, 'Supply an input list');
			return;
		}
		const identities = new Set();
		for (const [index, input] of inputs.entries()) {
			const inputPath = `${path}.inputs[${index}]`;
			if (!input || typeof input !== 'object') {
				this._issue(findings, 'invalid-input', inputPath, 'Supply an exact binding or future producer/output');
				continue;
			}
			const identity = input.ref ?? input.output;
			if (identities.has(identity))
				this._issue(findings, 'duplicate-input', inputPath, 'Each input must appear once');
			identities.add(identity);
			if ('producer' in input || 'output' in input) {
				if ('digest' in input || 'ref' in input || !items.get(input.producer)?.owns?.includes(input.output))
					this._issue(
						findings,
						'invalid-producer',
						inputPath,
						'Name an existing producer and its owned output without a speculative digest',
					);
			} else if (!this._text(input.ref) || !this._digest(input.digest))
				this._issue(
					findings,
					'invalid-binding',
					inputPath,
					'Supply an exact reference and non-placeholder SHA-256 digest',
				);
		}
	}
	/** Called by graph validation to follow explicit work prerequisites.
	 *
	 * @param {string} itemId - Starting item.
	 * @param {Map<string, DesignPlanItem>} items - Work graph.
	 * @returns {Set<string>} - Transitive prerequisite identities.
	 */
	_ancestors(itemId, items) {
		const ancestors = new Set();
		const pending = [...(items.get(itemId)?.dependsOn ?? [])];
		while (pending.length) {
			const dependency = pending.pop();
			if (ancestors.has(dependency)) continue;
			ancestors.add(dependency);
			pending.push(...(items.get(dependency)?.dependsOn ?? []));
		}
		return ancestors;
	}
	/** Called by validation to check work-item boundaries and authority.
	 *
	 * @param {Map<string, DesignPlanItem>} items - Addressable work items.
	 * @param {Map<string, DesignPlanGate>} gates - Independent review gates.
	 * @param {Map<string, DesignPlanOutcome>} outcomes - Requested outcomes.
	 * @param {DesignPlanFinding[]} findings - Destination findings.
	 * @returns {void} - Appended findings.
	 */
	_items(items, gates, outcomes, findings) {
		const roles = {
			parser: ['parent'],
			research: ['product-researcher', 'ui-researcher'],
			planner: ['parent'],
			ux: ['ux-planner'],
			ui: ['ui-designer'],
			review: ['ux-reviewer', 'ui-design-reviewer'],
			assembly: ['parent'],
		};
		const owners = new Map();
		for (const item of items.values()) {
			if (
				!this._text(item.stage) ||
				!this._text(item.role) ||
				!Array.isArray(roles[item.stage]) ||
				!roles[item.stage].includes(item.role)
			)
				this._issue(findings, 'unsupported-role-stage', item.id, 'Use a supported role and stage pair');
			for (const field of ['scopeRefs', 'outcomeIds', 'owns', 'dependsOn', 'requiredGates', 'unresolved']) {
				if (!this._strings(item[field]))
					this._issue(
						findings,
						'invalid-list',
						`${item.id}.${field}`,
						'Supply unique nonempty string values',
					);
			}
			if (!item.scopeRefs?.length || !item.owns?.length)
				this._issue(findings, 'missing-scope', item.id, 'Declare scoped work and at least one owned output');
			for (const scope of item.scopeRefs ?? [])
				if (!this.plan.scopeRefs.includes(scope))
					this._issue(findings, 'unknown-scope', item.id, `Scope ${scope} is not in the plan registry`);
			for (const outcome of item.outcomeIds ?? [])
				if (!outcomes.has(outcome))
					this._issue(findings, 'unknown-outcome', item.id, `Outcome ${outcome} is not requested`);
			for (const output of item.owns ?? []) {
				if (!/^(product|research|planning|ux|ui|review|assembly):[^\s:]+:[^\s]+$/.test(output))
					this._issue(findings, 'invalid-output', item.id, `Stage-qualify owned output ${output}`);
				if (
					['ux', 'ui'].includes(item.stage) &&
					(!this._text(output) ||
						!output.startsWith(`${item.stage}:`) ||
						!/^(ux|ui):(context|element|flow|part|scene):[^\s]+$/.test(output))
				)
					this._issue(
						findings,
						'invalid-author-output',
						item.id,
						'Author outputs must use their own stage and existing design unit kinds',
					);
				if (owners.has(output))
					this._issue(
						findings,
						'ownership-conflict',
						item.id,
						`${output} is already owned by ${owners.get(output)}`,
					);
				owners.set(output, item.id);
			}
			for (const dependency of item.dependsOn ?? [])
				if (!items.has(dependency))
					this._issue(findings, 'missing-dependency', item.id, `Declare prerequisite ${dependency}`);
			if (this._ancestors(item.id, items).has(item.id))
				this._issue(findings, 'dependency-cycle', item.id, 'Remove cyclic prerequisites');
			this._inputs(item.inputs, item.id, items, findings);
			for (const input of item.inputs ?? [])
				if (this._text(input?.producer) && !(item.dependsOn ?? []).includes(input.producer))
					this._issue(
						findings,
						'missing-input-dependency',
						item.id,
						`Declare producing prerequisite ${input.producer}`,
					);
			for (const gateId of item.requiredGates ?? [])
				if (!gates.has(gateId))
					this._issue(findings, 'missing-gate', item.id, `Declare independent gate ${gateId}`);
			if (item.stage === 'review') {
				if (!this._strings(item.reviewOf) || !item.reviewOf.length)
					this._issue(
						findings,
						'missing-review-scope',
						item.id,
						'Name authors whose work receives independent review',
					);
				for (const authorId of Array.isArray(item.reviewOf) ? item.reviewOf : [])
					if (
						authorId === item.id ||
						!items.has(authorId) ||
						items.get(authorId).stage === 'review' ||
						!this._ancestors(item.id, items).has(authorId)
					)
						this._issue(
							findings,
							'invalid-review-scope',
							item.id,
							`Review author ${authorId} must be a distinct prerequisite`,
						);
			} else if (item.reviewOf?.length)
				this._issue(findings, 'invalid-review-role', item.id, 'Only independent review items declare reviewOf');
			if (
				item.stage === 'ui' &&
				!(item.requiredGates ?? []).some((gateId) => gates.get(gateId)?.scopeRefs?.includes('whole-ux'))
			)
				this._issue(
					findings,
					'missing-ux-barrier',
					item.id,
					'Dependent UI requires the whole-UX independent review gate',
				);
		}
	}
	/** Called by inspection to resolve inputs from current bindings and accepted outputs.
	 *
	 * @param {DesignPlanInput[]} inputs - Exact or producer references.
	 * @param {DesignPlanState} state - Coordinator-validated accepted state.
	 * @returns {DesignPlanBinding[]} - Present exact current bindings; missing inputs are absent.
	 */
	_resolve(inputs, state) {
		return inputs.flatMap((input) => {
			if (input.producer)
				return (state.accepted?.[input.producer]?.outputs ?? []).filter(
					(binding) => binding.ref === input.output && this._digest(binding.digest),
				);
			return (state.bindings ?? []).filter(
				(binding) =>
					binding.ref === input.ref && binding.digest === input.digest && this._digest(binding.digest),
			);
		});
	}
	/** Called by inspection to compare exact binding sets independent of list order.
	 *
	 * @param {DesignPlanBinding[]} left - Saved bindings.
	 * @param {DesignPlanBinding[]} right - Current bindings.
	 * @returns {boolean} - Whether complete reference/digest pairs match uniquely.
	 */
	_equal(left, right) {
		if (!Array.isArray(left) || left.length !== right.length) return false;
		const identities = left.map((binding) => `${binding.ref}:${binding.digest}`).sort();
		return (
			new Set(identities).size === identities.length &&
			JSON.stringify(identities) ===
				JSON.stringify(right.map((binding) => `${binding.ref}:${binding.digest}`).sort())
		);
	}
	/** Call this method to validate ownership, prerequisite and coverage contracts.
	 *
	 * @param {string[]} requestedOutcomeIds - Optional independently derived source checklist.
	 * @returns {DesignPlanValidation} - Actionable structural findings, coverage and semantic overlap notices.
	 */
	validate(requestedOutcomeIds = []) {
		const findings = [];
		const notices = [];
		const plan = this.plan;
		if (!plan || typeof plan !== 'object' || Array.isArray(plan))
			return {
				valid: false,
				findings: [{code: 'invalid-plan', path: 'plan', message: 'Supply an operational plan object'}],
				notices,
				coverage: [],
			};
		if (plan.schemaVersion !== '1.0')
			this._issue(findings, 'unsupported-schema', 'schemaVersion', 'Use operational schema 1.0');
		if (
			!this._text(plan.id) ||
			!/^[a-z][a-z0-9-]*$/.test(plan.id) ||
			!Number.isSafeInteger(plan.revision) ||
			plan.revision < 1
		)
			this._issue(findings, 'invalid-plan-identity', 'plan', 'Supply a stable ID and positive integer revision');
		for (const field of ['sources', 'outcomes', 'gaps', 'items', 'gates'])
			if (!Array.isArray(plan[field]))
				this._issue(findings, 'invalid-collection', field, 'Supply a collection, even when empty');
		if (!this._strings(plan.scopeRefs) || !plan.scopeRefs.length)
			this._issue(findings, 'invalid-scope-registry', 'scopeRefs', 'Declare known existing scope references');
		if (!this._strings(requestedOutcomeIds))
			this._issue(
				findings,
				'invalid-source-checklist',
				'requestedOutcomeIds',
				'Supply unique source outcome identities',
			);
		if (findings.length) return {valid: false, findings, notices, coverage: []};
		const items = this._records(plan.items, 'items', findings);
		const outcomes = this._records(plan.outcomes, 'outcomes', findings);
		for (const outcomeId of requestedOutcomeIds)
			if (!outcomes.has(outcomeId))
				this._issue(
					findings,
					'missing-requested-outcome',
					outcomeId,
					'Account for this independently identified source outcome',
				);
		const gaps = this._records(plan.gaps, 'gaps', findings);
		const gates = this._records(plan.gates, 'gates', findings);
		if (!items.size || !outcomes.size || !plan.sources.length)
			this._issue(findings, 'empty-plan', 'plan', 'Supply source-bound requested outcomes and work');
		this._inputs(plan.sources, 'sources', items, findings);
		for (const source of plan.sources)
			if (source?.producer)
				this._issue(
					findings,
					'future-source',
					'sources',
					'Authoritative plan sources must already have exact bindings',
				);
		for (const outcome of outcomes.values()) {
			if (
				!this._strings(outcome.sourceRefs) ||
				!outcome.sourceRefs.length ||
				outcome.sourceRefs.some((reference) => !plan.sources.some((source) => source?.ref === reference))
			)
				this._issue(
					findings,
					'invalid-outcome-source',
					outcome.id,
					'Bind each outcome to known authoritative sources',
				);
		}
		for (const gap of gaps.values()) {
			if (
				!this._text(gap.reason) ||
				!this._strings(gap.outcomeIds) ||
				!gap.outcomeIds.length ||
				gap.outcomeIds.some((outcomeId) => !outcomes.has(outcomeId))
			)
				this._issue(findings, 'invalid-gap', gap.id, 'Justify the gap and reference requested outcomes');
		}
		// Malformed lists cannot enter graph traversal or overlap analysis.
		for (const item of items.values())
			for (const field of [
				'scopeRefs',
				'outcomeIds',
				'owns',
				'dependsOn',
				'inputs',
				'requiredGates',
				'unresolved',
			])
				if (field === 'inputs' ? !Array.isArray(item[field]) : !this._strings(item[field]))
					this._issue(findings, 'invalid-list', `${item.id}.${field}`, 'Supply an explicit list');
		for (const gate of gates.values())
			for (const field of ['scopeRefs', 'inputs'])
				if (field === 'inputs' ? !Array.isArray(gate[field]) : !this._strings(gate[field]))
					this._issue(findings, 'invalid-list', `${gate.id}.${field}`, 'Supply an explicit list');
		if (findings.length) return {valid: false, findings, notices, coverage: []};
		this._items(items, gates, outcomes, findings);
		for (const gate of gates.values()) {
			const reviewer = items.get(gate.reviewerItemId);
			if (reviewer?.stage !== 'review')
				this._issue(
					findings,
					'invalid-gate-reviewer',
					gate.id,
					'Gate owner must be an independent review assignment',
				);
			if (
				!this._strings(gate.scopeRefs) ||
				!gate.scopeRefs.length ||
				gate.scopeRefs.some((scope) => !plan.scopeRefs.includes(scope))
			)
				this._issue(findings, 'invalid-gate-scope', gate.id, 'Bind gate to known actual review scopes');
			this._inputs(gate.inputs, gate.id, items, findings);
			if (!gate.inputs.length)
				this._issue(findings, 'missing-gate-inputs', gate.id, 'Gate must bind exact review subjects');
			if (reviewer && JSON.stringify(gate.inputs) !== JSON.stringify(reviewer.inputs))
				this._issue(
					findings,
					'gate-subject-mismatch',
					gate.id,
					'Gate inputs must match the review assignment subjects',
				);
			for (const consumer of items.values())
				if (
					consumer.requiredGates.includes(gate.id) &&
					!this._ancestors(consumer.id, items).has(gate.reviewerItemId)
				)
					this._issue(
						findings,
						'missing-gate-dependency',
						consumer.id,
						`Declare prerequisite review assignment ${gate.reviewerItemId}`,
					);
			if (gate.scopeRefs.includes('whole-ux')) {
				const assemblyInput = gate.inputs.find(
					(input) =>
						input?.producer &&
						this._text(input.output) &&
						input.output.startsWith('ux:document:') &&
						items.get(input.producer)?.stage === 'assembly',
				);
				if (
					!assemblyInput ||
					[...items.values()]
						.filter((item) => item.stage === 'ux')
						.some((item) => !this._ancestors(assemblyInput.producer, items).has(item.id))
				)
					this._issue(
						findings,
						'missing-assembled-ux-subject',
						gate.id,
						'Whole-UX review must consume the frozen assembled UX document after all UX authors',
					);
				if (
					reviewer?.role !== 'ux-reviewer' ||
					!Array.isArray(reviewer.reviewOf) ||
					[...items.values()]
						.filter((item) => item.stage === 'ux')
						.some(
							(item) =>
								!this._ancestors(gate.reviewerItemId, items).has(item.id) ||
								!reviewer.reviewOf.includes(item.id),
						)
				)
					this._issue(
						findings,
						'incomplete-ux-barrier',
						gate.id,
						'Whole-UX gate must independently review every UX author after assembly',
					);
			}
		}
		const coverage = [...outcomes.keys()].map((outcomeId) => ({
			outcomeId,
			itemIds: [...items.values()].filter((item) => item.outcomeIds.includes(outcomeId)).map((item) => item.id),
			gapIds: [...gaps.values()]
				.filter((gap) => Array.isArray(gap.outcomeIds) && gap.outcomeIds.includes(outcomeId))
				.map((gap) => gap.id),
		}));
		for (const outcome of coverage)
			if (!outcome.itemIds.length && !outcome.gapIds.length)
				this._issue(
					findings,
					'uncovered-outcome',
					outcome.outcomeId,
					'Assign requested scope to work or a justified gap',
				);
		const authors = [...items.values()].filter((item) => item.stage !== 'review');
		for (let first = 0; first < authors.length; first++)
			for (let second = first + 1; second < authors.length; second++) {
				const overlap = authors[first].scopeRefs.filter((scope) => authors[second].scopeRefs.includes(scope));
				if (overlap.length)
					notices.push({
						code: 'semantic-overlap',
						path: `${authors[first].id},${authors[second].id}`,
						message: `Planner must assess shared meaning in ${overlap.join(', ')}; unique output IDs do not prove independence`,
					});
			}
		return {valid: !findings.length, findings, notices, coverage};
	}
	/** Call this method to derive current eligibility without dispatching workers.
	 * Accepted results and gate receipts are supplied only by the parent coordinator
	 * after contribution and canonical receipt validation. This inspector does not
	 * authenticate model-proposed receipts or promote canonical state.
	 *
	 * @param {DesignPlanState} state - Coordinator-validated results and current bindings.
	 * @returns {DesignPlanInspection} - Deterministic readiness and exact blocking reasons.
	 */
	inspect(state = {}) {
		const validation = this.validate(state.requestedOutcomeIds ?? []);
		if (!validation.valid) return {...validation, items: [], ready: []};
		const accepted = state.accepted ?? {};
		const inspections = new Map();
		const pending = new Set(this.plan.items.map((item) => item.id));
		while (pending.size) {
			for (const item of this.plan.items) {
				if (!pending.has(item.id) || item.dependsOn.some((dependency) => pending.has(dependency))) continue;
				const blockers = [];
				if (this._resolve(this.plan.sources, state).length !== this.plan.sources.length)
					this._issue(
						blockers,
						'stale-plan-source',
						item.id,
						'Rebind or revise the plan after authoritative source changes',
					);
				const inputs = this._resolve(item.inputs, state);
				if (inputs.length !== item.inputs.length)
					this._issue(
						blockers,
						'unbound-input',
						item.id,
						'Resolve every current exact input before dispatch',
					);
				if (item.dependsOn.some((dependency) => inspections.get(dependency)?.status !== 'accepted'))
					this._issue(blockers, 'unaccepted-dependency', item.id, 'Await accepted current prerequisites');
				if (item.unresolved.length)
					this._issue(blockers, 'unresolved-decision', item.id, item.unresolved.join('; '));
				for (const gateId of item.requiredGates) {
					const gate = this.plan.gates.find((candidate) => candidate.id === gateId);
					const receipt = state.gates?.[gateId];
					const subjects = this._resolve(gate.inputs, state);
					if (
						!receipt ||
						inspections.get(gate.reviewerItemId)?.status !== 'accepted' ||
						receipt.reviewerAgentId !== accepted[gate.reviewerItemId]?.agentId ||
						!this._text(receipt.receiptRef) ||
						!this._digest(receipt.subjectDigest) ||
						!this._digest(receipt.receiptDigest) ||
						subjects.length !== gate.inputs.length ||
						!this._equal(receipt.subjectBindings, subjects)
					)
						this._issue(
							blockers,
							'missing-current-review',
							item.id,
							`Await externally validated exact review receipt for ${gateId}`,
						);
				}
				const result = accepted[item.id];
				if (
					item.stage === 'review' &&
					result &&
					item.reviewOf.some((authorId) => accepted[authorId]?.agentId === result.agentId)
				)
					this._issue(
						blockers,
						'self-review',
						item.id,
						'Assign a reviewer distinct from every reviewed author',
					);
				if (
					result &&
					(!this._text(result.agentId) ||
						!Array.isArray(result.outputs) ||
						result.outputs.length !== item.owns.length ||
						!item.owns.every((output) =>
							result.outputs.some((binding) => binding.ref === output && this._digest(binding.digest)),
						) ||
						!this._equal(result.inputs, inputs))
				)
					this._issue(
						blockers,
						'stale-result',
						item.id,
						'Accepted result must retain exact current inputs and complete owned outputs',
					);
				inspections.set(item.id, {
					id: item.id,
					role: item.role,
					stage: item.stage,
					owns: item.owns,
					dependsOn: item.dependsOn,
					status: blockers.length ? 'blocked' : result ? 'accepted' : 'ready',
					blockers,
				});
				pending.delete(item.id);
			}
		}
		const items = this.plan.items.map((item) => inspections.get(item.id));
		return {...validation, items, ready: items.filter((item) => item.status === 'ready').map((item) => item.id)};
	}
}
