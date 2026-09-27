import {validateProductModel} from './product-model.mjs';
import {validateUxSpec} from './ux-design.mjs';
import {UxFlows} from './ux-flows.mjs';

/** Call to deduplicate stable references. @param {Iterable<string>} values @returns {string[]} */
function ids(values) {
	return [...new Set(values)].sort();
}

/** Index actual semantic dependencies once, without traversing flow execution.
 * @param {object} ux - Canonical UX. @returns {Map<string, Set<string>>} - References by flow ID.
 */
function flowSubjects(ux) {
	const actions = new Map(ux.actions.map((item) => [item.id, item]));
	const components = new Map(ux.components.map((item) => [`ux:component:${item.id}`, item]));
	const frames = new Map();
	for (const frame of ux.interactionFrames)
		for (const id of frame.taskRefs) {
			if (!frames.has(id)) frames.set(id, []);
			frames.get(id).push(frame.id);
		}
	return new Map(
		ux.flows.map((flow) => {
			const refs = new Set([`ux:flow:${flow.id}`, `ux:feature:${flow.featureRef}`, flow.elementRef]);
			const add = (kind, values) => values.forEach((id) => refs.add(`ux:${kind}:${id}`));
			add(
				'alternate',
				flow.alternates.map((item) => item.id),
			);
			add('frame', frames.get(flow.id) ?? []);
			for (const step of UxFlows.steps(flow)) {
				refs.add(`ux:step:${step.id}`);
				if (step.targetRef) refs.add(step.targetRef);
				for (const ref of step.usesElementRefs ?? []) refs.add(ref);
				if (step.frameRef) refs.add(`ux:frame:${step.frameRef}`);
				add('state', step.stateRefs ?? []);
				add('feedback', step.feedbackRefs ?? []);
				if (step.actionRef) {
					refs.add(`ux:action:${step.actionRef}`);
					const action = actions.get(step.actionRef);
					add('state', action.applicableStateRefs);
					add('feedback', action.feedbackRefs);
					add('alternate', action.alternateRefs);
				}
			}
			for (const ref of [...refs]) {
				const component = components.get(ref);
				if (component) {
					add(
						'behavior',
						component.behaviors.map((item) => item.id),
					);
					add('state', component.stateRefs);
				}
			}
			return [flow.id, refs];
		}),
	);
}

/** Build a bounded input from a local flow and its dependencies.
 * @param {object} model @param {object} ux @param {string} useCaseId @param {object|null} ui
 * @returns {object} - Stable product, flow and scene references.
 */
export function buildUseCaseHandoff(model, ux, useCaseId, ui = null) {
	validateProductModel(model);
	validateUxSpec(ux);
	const flow = ux.flows.find((item) => item.id === useCaseId);
	if (!flow) throw new Error(`Unknown flow ${useCaseId}`);
	const refs = flowSubjects(ux).get(flow.id);
	const typed = (kind) =>
		ids([...refs].filter((ref) => ref.startsWith(`ux:${kind}:`)).map((ref) => ref.split(':').at(-1)));
	const realizations = ux.productRealizations.filter((item) => refs.has(item.uxRef));
	const productRefs = new Set(realizations.map((item) => item.productRef));
	for (const rule of model.rules)
		if (rule.appliesToRefs.some((ref) => productRefs.has(`product:${ref}`))) productRefs.add(`product:${rule.id}`);
	return {
		productModelRef: `product:${model.id}`,
		uxArtifactRef: `ux:artifact:${ux.id}`,
		flowRef: `ux:flow:${flow.id}`,
		productRefs: ids(productRefs),
		realizationRefs: ids(realizations.map((item) => item.id)),
		stepRefs: flow.steps.map((step) => step.id),
		alternateRefs: flow.alternates.map((item) => item.id),
		actionRefs: typed('action'),
		stateRefs: typed('state'),
		feedbackRefs: typed('feedback'),
		frameRefs: typed('frame'),
		sharedElementRefs: ids(UxFlows.steps(flow).flatMap((step) => step.usesElementRefs ?? [])),
		uiSceneRefs: ids(
			(ui?.scenes ?? [])
				.filter((scene) => scene.flowRefs.includes(flow.id) && scene.depictsRefs.some((ref) => refs.has(ref)))
				.map((scene) => scene.id),
		),
		traceGapRefs: ids(
			ux.traceGaps
				.filter((item) => refs.has(item.sourceRef) || productRefs.has(item.sourceRef))
				.map((item) => item.id),
		),
	};
}

/** Find affected local flows with one semantic dependency index.
 * @param {object} ux @param {string} changedRef @param {object|null} model @returns {string[]}
 */
export function affectedUseCases(ux, changedRef, model = null) {
	validateUxSpec(ux);
	if (model) validateProductModel(model);
	const dependents = new Map(),
		add = (ref, target) => {
			if (!dependents.has(ref)) dependents.set(ref, []);
			dependents.get(ref).push(target);
		};
	for (const relation of ux.productRealizations) add(relation.productRef, relation.uxRef);
	if (model) {
		for (const rule of model.rules)
			for (const ref of rule.appliesToRefs) add(`product:${rule.id}`, `product:${ref}`);
		const realized = new Set(ux.productRealizations.map((item) => item.productRef));
		for (const requirement of model.requirements)
			for (const goal of requirement.goalRefs) {
				add(`product:${goal}`, `product:${requirement.id}`);
				if (!realized.has(`product:${requirement.id}`)) add(`product:${requirement.id}`, `product:${goal}`);
			}
	}
	for (const [flow, refs] of flowSubjects(ux)) for (const ref of refs) add(ref, `ux:flow:${flow}`);
	const visited = new Set([changedRef]),
		queue = [changedRef];
	for (let offset = 0; offset < queue.length; offset++)
		for (const ref of dependents.get(queue[offset]) ?? [])
			if (!visited.has(ref)) {
				visited.add(ref);
				queue.push(ref);
			}
	return ids(ux.flows.filter((flow) => visited.has(`ux:flow:${flow.id}`)).map((flow) => flow.id));
}
