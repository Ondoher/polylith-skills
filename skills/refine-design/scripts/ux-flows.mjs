/** Called by flow validation to report a concrete semantic error.
 * @param {string} message - Invalid field or reference.
 * @returns {never}
 */
function fail(message) {
	throw new Error(message);
}

/** Called by flow validation to reject unsupported authoring structure.
 * @param {object} value - Flow, step or alternate.
 * @param {string[]} keys - Supported fields.
 * @param {string} label - Diagnostic subject.
 * @returns {void}
 */
function closed(value, keys, label) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
	for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`${label} has unsupported field ${key}`);
}

/** Called by flow validation to require readable meaning.
 * @param {unknown} value - Supplied text.
 * @param {string} label - Diagnostic field.
 * @returns {void}
 */
function text(value, label) {
	if (typeof value !== 'string' || !value.trim()) fail(`${label} must be nonempty text`);
}

/** Native local flow operations. Array order is authoritative; no graph is reconstructed. */
export const UxFlows = {
	/** Call this method to iterate a flow's primary and alternate steps once.
	 * @param {object} flow - Canonical local flow.
	 * @returns {object[]} - Steps in authored route order.
	 */
	steps(flow) {
		return [...flow.steps, ...flow.alternates.flatMap((alternate) => alternate.steps)];
	},

	/** Call this method to obtain the actual actions used by a flow.
	 * @param {object} flow - Canonical local flow.
	 * @returns {string[]} - Unique action IDs in first-use order.
	 */
	actionRefs(flow) {
		return [
			...new Set(
				this.steps(flow)
					.map((step) => step.actionRef)
					.filter(Boolean),
			),
		];
	},

	/** Call this method to index steps by stable identity and owning flow.
	 * @param {object} spec - Current canonical UX.
	 * @returns {UxFlowIndex} - Direct lookup indexes, with no reachability traversal.
	 */
	index(spec) {
		const steps = new Map(),
			owners = new Map(),
			alternates = new Map();
		for (const flow of spec.flows) {
			for (const step of this.steps(flow)) {
				if (steps.has(step.id)) fail(`Duplicate flow step ${step.id}`);
				steps.set(step.id, step);
				owners.set(step.id, flow);
			}
			for (const alternate of flow.alternates) {
				if (alternates.has(alternate.id)) fail(`Duplicate alternate ${alternate.id}`);
				alternates.set(alternate.id, alternate);
			}
		}
		return {steps, owners, alternates};
	},

	/** Call this method to check linear routes, local alternatives and reusable-element call-outs.
	 * Existing structural validation separately checks actions, views and source evidence.
	 * @param {object} spec - Current canonical UX.
	 * @returns {UxFlowIndex} - Validated direct indexes for consumer checks.
	 */
	validate(spec) {
		if (!Array.isArray(spec.flows)) fail('flows must be an array');
		const elements = new Set([
			...spec.surfaces.map((item) => `ux:surface:${item.id}`),
			...spec.components.map((item) => `ux:component:${item.id}`),
		]);
		const actions = new Map(spec.actions.map((item) => [item.id, item]));
		const frames = new Set(spec.interactionFrames.map((item) => item.id));
		const sources = new Set(spec.sources.map((item) => item.id)),
			questions = new Set(spec.openQuestions.map((item) => item.id));
		const states = new Map(spec.states.map((item) => [item.id, item])),
			feedback = new Set(spec.feedback.map((item) => item.id));
		const components = new Map(spec.components.map((item) => [item.id, item]));
		const list = (value, allowed, label) => {
			if (!Array.isArray(value) || new Set(value).size !== value.length || value.some((ref) => !allowed.has(ref)))
				fail(`${label} contains missing or duplicate references`);
		};
		const metadata = (value, label) => {
			if (
				value.status !== undefined &&
				!['default', 'proposed', 'accepted', 'unresolved', 'locked'].includes(value.status)
			)
				fail(`${label}.status is unsupported`);
			if (value.sourceRefs !== undefined) list(value.sourceRefs, sources, `${label}.sourceRefs`);
			if (value.questionRefs !== undefined) list(value.questionRefs, questions, `${label}.questionRefs`);
		};
		const surfaces = (ref) =>
			ref.startsWith('ux:surface:') ? [ref.slice(11)] : (components.get(ref.slice(13))?.surfaceRefs ?? []);
		for (const flow of spec.flows) {
			closed(
				flow,
				[
					'id',
					'name',
					'featureRef',
					'goal',
					'taskPriority',
					'status',
					'trigger',
					'preconditions',
					'outcome',
					'questionRefs',
					'elementRef',
					'steps',
					'alternates',
					'decisions',
				],
				`flow ${flow.id}`,
			);
			if (!elements.has(flow.elementRef)) fail(`flow ${flow.id}.elementRef must identify an interaction element`);
			if (!Array.isArray(flow.steps) || !flow.steps.length) fail(`flow ${flow.id} needs primary steps`);
			if (!Array.isArray(flow.alternates)) fail(`flow ${flow.id}.alternates must be an array`);
			const primaryIds = new Set(flow.steps.map((step) => step.id));
			for (const alternate of flow.alternates) {
				closed(
					alternate,
					[
						'id',
						'afterStepRef',
						'condition',
						'steps',
						'outcome',
						'resumeStepRef',
						'status',
						'sourceRefs',
						'questionRefs',
						'notes',
					],
					`alternate ${alternate.id}`,
				);
				text(alternate.id, 'alternate.id');
				text(alternate.condition, `alternate ${alternate.id}.condition`);
				text(alternate.outcome, `alternate ${alternate.id}.outcome`);
				metadata(alternate, `alternate ${alternate.id}`);
				if (alternate.notes !== undefined) {
					if (!Array.isArray(alternate.notes)) fail('alternate.notes must be an array');
					alternate.notes.forEach((note) => text(note, 'alternate.notes'));
				}
				if (!primaryIds.has(alternate.afterStepRef))
					fail(`alternate ${alternate.id} must start at a primary step of its own flow`);
				if (alternate.resumeStepRef !== undefined && !primaryIds.has(alternate.resumeStepRef))
					fail(`alternate ${alternate.id} must resume at a primary step of its own flow`);
				if (!Array.isArray(alternate.steps)) fail(`alternate ${alternate.id}.steps must be an array`);
			}
			for (const step of this.steps(flow)) {
				closed(
					step,
					[
						'id',
						'actor',
						'action',
						'actionRef',
						'targetRef',
						'response',
						'frameRef',
						'usesElementRefs',
						'stateRefs',
						'feedbackRefs',
						'status',
						'sourceRefs',
						'questionRefs',
					],
					`step ${step.id}`,
				);
				for (const field of ['id', 'actor', 'action', 'response'])
					text(step[field], `step ${step.id}.${field}`);
				metadata(step, `step ${step.id}`);
				if (step.stateRefs !== undefined) list(step.stateRefs, states, `step ${step.id}.stateRefs`);
				if (step.feedbackRefs !== undefined) list(step.feedbackRefs, feedback, `step ${step.id}.feedbackRefs`);
				if (step.actionRef !== undefined) {
					const action = actions.get(step.actionRef);
					if (!action) fail(`step ${step.id}.actionRef references missing id ${step.actionRef}`);
					if (!action.taskRefs.includes(flow.id))
						fail(`step ${step.id}.actionRef ${step.actionRef} must belong to its flow through taskRefs`);
					if (step.targetRef && elements.has(step.targetRef)) {
						const actionSurfaces = new Set(
							action.applicableStateRefs.flatMap((ref) => surfaces(states.get(ref)?.ownerRef ?? '')),
						);
						if (!surfaces(step.targetRef).some((ref) => actionSurfaces.has(ref)))
							fail(`step ${step.id}.targetRef does not share a surface with action ${action.id}`);
					}
				}
				if (step.targetRef !== undefined && !elements.has(step.targetRef))
					fail(`step ${step.id}.targetRef is missing`);
				if (step.frameRef !== undefined && !frames.has(step.frameRef))
					fail(`step ${step.id}.frameRef is missing`);
				if (
					step.usesElementRefs !== undefined &&
					(!Array.isArray(step.usesElementRefs) || step.usesElementRefs.some((ref) => !elements.has(ref)))
				)
					fail(`step ${step.id}.usesElementRefs must identify reusable interaction elements`);
			}
		}
		return this.index(spec);
	},
};
