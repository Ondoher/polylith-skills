/** Explicit one-time import of saved UX 0.3. Ordinary consumers never invoke this module. */
export const LegacyUxImport = {
	/** Call this method to preserve useful graph-era data as native ordered flows.
	 * Original input is never changed. Unsupported relations remain explicit repair notices.
	 * @param {object} source - Saved UX schema 0.3.
	 * @returns {UxMigrationResult} - Native candidate, mapping and repair evidence.
	 */
	convert(source) {
		if (source?.schemaVersion !== '0.3') throw new Error('Legacy UX import requires an explicit schema 0.3 source');
		const spec = structuredClone(source),
			issues = [],
			mappings = {};
		const nodes = new Map(spec.flowNodes.map((node) => [node.id, node]));
		const outgoing = new Map(),
			owned = new Map();
		for (const node of spec.flowNodes) {
			if (!owned.has(node.ownerRef)) owned.set(node.ownerRef, []);
			owned.get(node.ownerRef).push(node);
		}
		for (const edge of spec.flowEdges) {
			if (!outgoing.has(edge.fromRef)) outgoing.set(edge.fromRef, []);
			outgoing.get(edge.fromRef).push(edge);
		}
		const reviews = new Map(spec.pruningReview.taskReviews.map((review) => [review.taskRef, review]));
		const recoveryAlternates = new Map();
		const actionsById = new Map(spec.actions.map((item) => [item.id, item]));
		const statesById = new Map(spec.states.map((item) => [item.id, item]));
		const recoveriesByRef = new Map(spec.recoveryPaths.map((item) => [`ux:recovery:${item.id}`, item]));
		const recoveriesByReturn = new Map();
		for (const recovery of spec.recoveryPaths) {
			if (!recoveriesByReturn.has(recovery.returnNodeRef)) recoveriesByReturn.set(recovery.returnNodeRef, []);
			recoveriesByReturn.get(recovery.returnNodeRef).push(recovery);
		}
		const warn = (reference, reason) =>
			issues.push({
				reference,
				reason,
				remedy: 'Inspect the preserved original input and repair only this local flow; retain independent migrated data.',
			});
		const step = (node) => {
			const {kind, ownerRef, prompt, statement, componentRef, ...value} = node;
			if (kind !== 'step') {
				value.actor = 'System';
				value.action = prompt ?? statement;
				if (!value.response) {
					value.response = 'Response needs repair: not specified in the saved input.';
					warn(node.id, 'A saved decision has no stated observable response');
				}
			}
			for (const edge of outgoing.get(node.id) ?? []) {
				if (edge.kind === 'invokes') {
					const target = nodes.get(edge.toRef.slice('ux:flow-node:'.length));
					if (target?.componentRef)
						(value.usesElementRefs ??= []).push(`ux:component:${target.componentRef}`);
					else warn(node.id, `Reusable interaction target ${edge.toRef} is unavailable`);
				}
				if (['enters-state', 'emits-feedback'].includes(edge.kind))
					(value[edge.kind === 'enters-state' ? 'stateRefs' : 'feedbackRefs'] ??= []).push(
						edge.toRef.slice(edge.toRef.lastIndexOf(':') + 1),
					);
			}
			mappings[`ux:flow-node:${node.id}`] = `ux:step:${node.id}`;
			return value;
		};
		spec.flows = spec.useCases.map((task) => {
			const review = reviews.get(task.id);
			const primaryIds = review?.canonicalStepRefs ?? [task.entryNodeRef];
			const primary = new Set(primaryIds),
				consumed = new Set(primaryIds);
			const {entryNodeRef, actionRefs, ...metadata} = task;
			const primaryNodes = primaryIds.map((id) => nodes.get(id)).filter(Boolean);
			const first = primaryNodes.find((node) => node.targetRef);
			const action = actionsById.get(primaryNodes[0]?.actionRef);
			const state = statesById.get(action?.applicableStateRefs[0]);
			const flow = {
				...metadata,
				elementRef: first?.targetRef ?? state?.ownerRef,
				steps: primaryNodes.map(step),
				alternates: [],
				decisions: review?.decisions ?? [],
			};
			mappings[`ux:use-case:${task.id}`] = `ux:flow:${task.id}`;
			if (!first && !state) warn(task.id, 'Starting interaction element could not be established');
			if (!review) warn(task.id, 'The saved input has no authoritative primary-step ordering');
			if (primaryNodes.length !== primaryIds.length)
				warn(task.id, 'A primary step is missing from the saved catalog');
			for (const [index, id] of primaryIds.entries())
				for (const edge of outgoing.get(id) ?? []) {
					if (edge.kind === 'next' && edge.toRef !== `ux:flow-node:${primaryIds[index + 1]}`)
						warn(
							edge.id,
							'Saved continuation differs from the authoritative primary order; inspect the preserved original',
						);
				}
			const pending = [];
			for (const id of primaryIds)
				for (const edge of outgoing.get(id) ?? [])
					if (edge.kind === 'branches-to') pending.push({edge, afterStepRef: id});
			for (let offset = 0; offset < pending.length; offset++) {
				const {edge, afterStepRef} = pending[offset];
				const entryId = edge.toRef.slice('ux:flow-node:'.length),
					entry = nodes.get(entryId);
				if (!entry || consumed.has(entryId)) {
					warn(task.id, `Branch ${edge.id} cannot be converted unambiguously`);
					continue;
				}
				const alternate = {
					id: entry.kind === 'alternative' ? entry.id : edge.id,
					afterStepRef,
					condition: edge.condition ?? entry.prompt ?? 'Condition needs repair',
					steps: [],
					outcome: entry.response ?? task.outcome,
					status: entry.status,
					sourceRefs: entry.sourceRefs,
					questionRefs: entry.questionRefs,
				};
				if (!edge.condition && !entry.prompt) warn(alternate.id, 'Alternate condition was not specified');
				if (entry.prompt && entry.prompt !== alternate.condition) alternate.notes = [entry.prompt];
				let current = entryId;
				while (current && !primary.has(current) && !consumed.has(current)) {
					const node = nodes.get(current);
					if (!node || node.ownerRef !== `ux:use-case:${task.id}`) {
						warn(task.id, 'An alternate crosses task ownership');
						break;
					}
					consumed.add(current);
					if (node === entry && node.kind === 'alternative')
						mappings[`ux:flow-node:${node.id}`] = `ux:alternate:${alternate.id}`;
					else alternate.steps.push(step(node));
					const next = [];
					for (const link of outgoing.get(current) ?? []) {
						if (link.kind === 'branches-to') {
							warn(
								link.id,
								'A nested branch was lifted to its primary step; its combined condition requires local repair',
							);
							pending.push({edge: link, afterStepRef});
						}
						if (link.kind === 'next') next.push(link.toRef.slice('ux:flow-node:'.length));
						if (link.kind === 'recovers-to') {
							const recovery = recoveriesByRef.get(link.toRef);
							if (recovery) next.push(recovery.returnNodeRef);
						}
					}
					if (next.length > 1) warn(node.id, 'Multiple continuations require a local alternate decision');
					current = next[0];
				}
				if (current && primary.has(current)) alternate.resumeStepRef = current;
				else if (current) warn(alternate.id, 'A cycle or shared alternate tail requires explicit local repair');
				flow.alternates.push(alternate);
				const contained = new Set([entryId, ...alternate.steps.map((item) => item.id)]);
				for (const recovery of [...contained].flatMap((id) => recoveriesByReturn.get(id) ?? [])) {
					if (recoveryAlternates.has(recovery.id) && recoveryAlternates.get(recovery.id) !== alternate.id)
						warn(recovery.id, 'Recovery maps to more than one local alternate');
					recoveryAlternates.set(recovery.id, alternate.id);
					mappings[`ux:recovery:${recovery.id}`] = `ux:alternate:${alternate.id}`;
					(alternate.notes ??= []).push(recovery.condition, recovery.response);
				}
			}
			for (const node of owned.get(`ux:use-case:${task.id}`) ?? [])
				if (!consumed.has(node.id)) {
					warn(node.id, 'Saved node is outside the documented primary sequence and convertible alternates');
				}
			return flow;
		});
		for (const component of spec.components) {
			component.behaviors = (owned.get(`ux:component:${component.id}`) ?? []).map(
				({id, statement, status, sourceRefs, questionRefs}) => ({
					id,
					statement,
					status,
					sourceRefs,
					questionRefs,
				}),
			);
			for (const behavior of component.behaviors)
				mappings[`ux:flow-node:${behavior.id}`] = `ux:behavior:${behavior.id}`;
			delete component.behaviorNodeRefs;
			delete component.entryBehaviorNodeRef;
		}
		for (const action of spec.actions) {
			action.alternateRefs = [
				...new Set(action.recoveryRefs.map((id) => recoveryAlternates.get(id)).filter(Boolean)),
			];
			for (const id of action.recoveryRefs)
				if (!recoveryAlternates.has(id)) warn(action.id, `Recovery ${id} needs a local alternate`);
			delete action.recoveryRefs;
		}
		for (const relation of spec.useCaseRelations)
			warn(
				relation.id,
				'Saved cross-task relation needs review as a precondition or reusable interaction call-out',
			);
		for (const collection of [spec.productRealizations, spec.traceGaps])
			for (const item of collection) {
				const key = item.uxRef ? 'uxRef' : 'sourceRef';
				if (mappings[item[key]]) item[key] = mappings[item[key]];
				else if (/^ux:(flow-node|flow-edge|recovery):/.test(item[key]))
					warn(item.id, `Trace ${item[key]} requires a new semantic endpoint`);
			}
		for (const feature of spec.features) {
			feature.flowRefs = feature.useCaseRefs;
			delete feature.useCaseRefs;
		}
		for (const key of ['useCases', 'flowNodes', 'flowEdges', 'useCaseRelations', 'recoveryPaths', 'pruningReview'])
			delete spec[key];
		spec.schemaVersion = '0.4';
		spec.repairNeeds = issues;
		return {document: spec, issues, mappings};
	},
};
