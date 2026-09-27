import {createHash} from 'node:crypto';
import {DesignRecords} from './design-records.mjs';
import {canonicalPublicationJson} from './product-publication-payload.mjs';

const UX_COLLECTIONS = [
	'surfaces',
	'components',
	'actions',
	'interactionFrames',
	'states',
	'feedback',
	'recoveryPaths',
];
const INHERITABLE = ['status', 'sourceRefs', 'questionRefs', 'ownerRef', 'surfaceRef', 'taskRefs'];

/** Called by assembly to identify finite JSON material.
 * @param {unknown} value - JSON material.
 * @returns {string} - Exact canonical identity.
 */
function hash(value) {
	return createHash('sha256').update(canonicalPublicationJson(value)).digest('hex');
}

/** Called at a domain boundary to reject misspelled authoring fields.
 * @param {object} value - Authoring object.
 * @param {string[]} keys - Allowed fields.
 * @param {string} label - Diagnostic subject.
 * @returns {void}
 */
function fields(value, keys, label) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
	for (const key of Object.keys(value)) if (!keys.includes(key)) throw new Error(`${label}: unknown field ${key}`);
}

/** Called by import to factor identical metadata without changing semantic fields.
 * @param {object[]} values - Catalog records.
 * @returns {DesignPackedValues} - Shared metadata and remaining records.
 */
function pack(values) {
	const defaults = {};
	for (const key of INHERITABLE) {
		if (
			values.length > 1 &&
			values[0][key] !== undefined &&
			values.every((value) => hash(value[key] ?? null) === hash(values[0][key]))
		)
			defaults[key] = values[0][key];
	}
	return {
		defaults,
		values: values.map((value) => Object.fromEntries(Object.entries(value).filter(([key]) => !(key in defaults)))),
	};
}

/** Called by assembly to expand shared, explicitly supplied metadata.
 * @param {DesignPackedValues} packed - Catalog records and their common metadata.
 * @returns {object[]} - Expanded independent catalog records.
 */
function unpack(packed) {
	fields(packed, ['defaults', 'values'], 'catalog');
	fields(packed.defaults ?? {}, INHERITABLE, 'catalog defaults');
	if (!Array.isArray(packed.values)) throw new Error('Catalog values must be an array');
	return packed.values.map((value) => ({...packed.defaults, ...value}));
}

/** Called by the assembler to produce a repair notice without dropping siblings.
 * @param {string} reference - Affected identity.
 * @param {string} reason - Observed failure.
 * @returns {DesignRecordIssue} - Actionable issue.
 */
function issue(reference, reason) {
	return {
		reference,
		reason,
		remedy: 'Repair only this unit or its missing dependency; reuse other saved units and assemble again.',
	};
}

/** Called by assembly to index records and explicit dependencies once.
 * @param {DesignRecord[]} records - Saved authoring records.
 * @param {DesignRecordIssue[]} issues - Accumulating diagnostics.
 * @returns {Map<string, DesignRecord>} - Unambiguous identities.
 */
function indexRecords(records, issues) {
	const index = new Map();
	const duplicates = new Set();
	for (const record of records) {
		const key = `${record.kind}:${record.id}`;
		try {
			DesignRecords.digest(record);
			if (index.has(key) || duplicates.has(key)) {
				index.delete(key);
				duplicates.add(key);
				throw new Error('Conflicting duplicate identity; neither copy was selected');
			}
			index.set(key, record);
		} catch (error) {
			issues.push(issue(key, error.message));
		}
	}
	const dependents = new Map();
	const unavailable = [];
	for (const [key, record] of index) {
		for (const dependency of record.dependencies ?? []) {
			if (!dependents.has(dependency)) dependents.set(dependency, []);
			dependents.get(dependency).push(key);
			if (!index.has(dependency)) unavailable.push(key);
		}
	}
	for (let offset = 0; offset < unavailable.length; offset++) {
		const key = unavailable[offset];
		if (!index.delete(key)) continue;
		issues.push(issue(key, 'An explicitly required authoring unit is unavailable'));
		unavailable.push(...(dependents.get(key) ?? []));
	}
	return index;
}

/** Called by assembly to restore saved catalog order using one indexed scan.
 * @param {object} document - Expanded consumer document.
 * @param {Record<string, string[]>} order - Optional imported order, independent of publication hierarchy.
 * @returns {void}
 */
function restoreOrder(document, order) {
	for (const [key, ids] of Object.entries(order ?? {})) {
		if (!Array.isArray(document[key]) || !Array.isArray(ids)) throw new Error(`Invalid saved order for ${key}`);
		const values = new Map();
		for (const value of document[key]) {
			if (values.has(value.id)) throw new Error(`Duplicate ${key} identity ${value.id}`);
			values.set(value.id, value);
		}
		const ordered = [];
		for (const id of ids)
			if (values.has(id)) {
				ordered.push(values.get(id));
				values.delete(id);
			}
		document[key] = [...ordered, ...values.values()];
	}
}

/** Called by UX assembly to expand a linear route and its explicit call-outs.
 * @param {object[]} steps - Ordered steps; explicit links are needed only for retained or nonsequential relations.
 * @param {object} defaults - Common supplied node metadata.
 * @param {object[]} nodes - Expanded node accumulator.
 * @param {object[]} edges - Expanded relation accumulator.
 * @returns {void}
 */
function route(steps, defaults, nodes, edges) {
	if (!Array.isArray(steps)) throw new Error('Flow steps must be an array');
	for (let i = 0; i < steps.length; i++) {
		const {links, callouts = [], ...value} = steps[i];
		const node = {...defaults, ...value};
		nodes.push(node);
		if (!Array.isArray(callouts)) throw new Error('Step callouts must be an array');
		for (const link of callouts)
			edges.push({status: node.status, sourceRefs: node.sourceRefs, ...link, fromRef: node.id});
		if (links !== undefined) {
			if (!Array.isArray(links)) throw new Error(`Step ${node.id} links must be an array`);
			for (const link of links)
				edges.push({status: node.status, sourceRefs: node.sourceRefs, ...link, fromRef: node.id});
		} else if (steps[i + 1]) {
			edges.push({
				id: `${node.id}-next`,
				fromRef: node.id,
				toRef: `ux:flow-node:${steps[i + 1].id}`,
				kind: 'next',
				status: node.status,
				sourceRefs: node.sourceRefs,
			});
		}
	}
}

/** Called by UI assembly to apply bounded node changes to one independent base.
 * @param {object} base - Reusable region/component tree.
 * @param {DesignNodeChange[]} changes - Explicit shallow changes, addressed by stable node ID.
 * @returns {object} - Expanded scene tree.
 */
function sceneTree(base, changes) {
	const root = structuredClone(base);
	const nodes = new Map();
	const queue = [root];
	for (let offset = 0; offset < queue.length; offset++) {
		const node = queue[offset];
		if (!node || typeof node.id !== 'string' || nodes.has(node.id))
			throw new Error('Scene part has missing or duplicate node identity');
		nodes.set(node.id, node);
		if (node.children !== undefined && !Array.isArray(node.children))
			throw new Error('Scene children must be an array');
		queue.push(...(node.children ?? []));
	}
	const changed = new Set();
	for (const change of changes ?? []) {
		fields(change, ['nodeRef', 'set'], 'node change');
		const node = nodes.get(change.nodeRef);
		if (!node || changed.has(change.nodeRef)) throw new Error(`Missing or repeated changed node ${change.nodeRef}`);
		if (!change.set || typeof change.set !== 'object' || Array.isArray(change.set))
			throw new Error('Node change set must be an object');
		if (['id', 'children', '__proto__', 'constructor', 'prototype'].some((key) => Object.hasOwn(change.set, key)))
			throw new Error(
				'A variation cannot change identity, tree structure, or object prototypes; author another part',
			);
		Object.assign(node, change.set);
		changed.add(change.nodeRef);
	}
	return root;
}

/** Deterministic projection between bounded authoring units and existing consumer schemas. */
export const DesignAssembly = {
	/** Call this method to reuse existing UX data without another design-agent pass.
	 * Existing links, statuses, locks, evidence and catalog ordering are retained exactly.
	 * @param {object} spec - Existing validated UX schema 0.3.
	 * @returns {DesignRecord[]} - Context, element and flow records.
	 */
	importUx(spec) {
		const document = structuredClone(spec);
		const order = {};
		for (const key of [...UX_COLLECTIONS, 'useCases', 'flowNodes', 'flowEdges']) {
			order[key] = document[key].map((value) => value.id);
			delete document[key];
		}
		const records = [{kind: 'context', id: 'document', data: {document, order}}];
		const elements = new Map();
		const owners = new Map();
		for (const surface of spec.surfaces) {
			elements.set(surface.id, Object.fromEntries([...UX_COLLECTIONS, 'behaviors'].map((key) => [key, []])));
			owners.set(`ux:surface:${surface.id}`, surface.id);
		}
		let sharedId = 'shared-definitions';
		while (elements.has(sharedId)) sharedId += '-shared';
		elements.set(sharedId, Object.fromEntries([...UX_COLLECTIONS, 'behaviors'].map((key) => [key, []])));
		for (const component of spec.components)
			owners.set(`ux:component:${component.id}`, component.surfaceRefs[0] ?? sharedId);
		for (const state of spec.states) owners.set(`ux:state:${state.id}`, owners.get(state.ownerRef) ?? sharedId);
		for (const action of spec.actions)
			owners.set(`ux:action:${action.id}`, owners.get(`ux:state:${action.applicableStateRefs[0]}`) ?? sharedId);
		for (const key of UX_COLLECTIONS) {
			for (const value of spec[key]) {
				const owner =
					key === 'surfaces'
						? value.id
						: key === 'components'
							? owners.get(`ux:component:${value.id}`)
							: key === 'actions'
								? owners.get(`ux:action:${value.id}`)
								: key === 'interactionFrames'
									? value.surfaceRef
									: key === 'feedback'
										? owners.get(`ux:action:${value.actionRef}`)
										: owners.get(value.ownerRef);
				(elements.get(owner) ?? elements.get(sharedId))[key].push(value);
			}
		}
		const outgoing = new Map();
		for (const edge of spec.flowEdges) {
			if (!outgoing.has(edge.fromRef)) outgoing.set(edge.fromRef, []);
			const {fromRef, ...link} = edge;
			outgoing.get(fromRef).push(link);
		}
		const flowNodes = new Map();
		for (const node of spec.flowNodes) {
			const value = {...node, links: outgoing.get(node.id) ?? []};
			if (node.kind === 'component-behavior')
				(elements.get(owners.get(node.ownerRef)) ?? elements.get(sharedId)).behaviors.push(value);
			else {
				if (!flowNodes.has(node.ownerRef)) flowNodes.set(node.ownerRef, []);
				flowNodes.get(node.ownerRef).push(value);
			}
		}
		const populatedElements = new Set();
		for (const [id, catalogs] of elements)
			if (Object.values(catalogs).some((values) => values.length)) {
				populatedElements.add(id);
				records.push({
					kind: 'element',
					id,
					data: {
						catalogs: Object.fromEntries(
							Object.entries(catalogs).map(([key, values]) => [key, pack(values)]),
						),
					},
				});
			}
		const reviews = new Map(
			(spec.pruningReview?.taskReviews ?? []).map((review) => [
				review.taskRef,
				new Set(review.canonicalStepRefs),
			]),
		);
		for (const useCase of spec.useCases) {
			const nodes = flowNodes.get(`ux:use-case:${useCase.id}`) ?? [];
			const packed = pack(nodes);
			const primary = reviews.get(useCase.id) ?? new Set(nodes.map((node) => node.id));
			const steps = [],
				other = [];
			for (const node of packed.values) (primary.has(node.id) ? steps : other).push(node);
			const elementRef =
				nodes
					.map((node) => owners.get(node.targetRef) ?? owners.get(`ux:action:${node.actionRef}`))
					.find(Boolean) ?? sharedId;
			records.push({
				kind: 'flow',
				id: useCase.id,
				dependencies: populatedElements.has(elementRef) ? [`element:${elementRef}`] : [],
				data: {
					elementRef,
					useCase,
					nodeDefaults: packed.defaults,
					steps,
					alternates: other.length ? [{id: `${useCase.id}-alternatives`, steps: other}] : [],
				},
			});
		}
		return records;
	},

	/** Call this method to reuse UI scenes, factoring exact reusable scene trees once.
	 * @param {object} spec - Existing validated UI schema 0.3.
	 * @returns {DesignRecord[]} - Shared context, independent parts and scenes.
	 */
	importUi(spec) {
		const {scenes, ...document} = structuredClone(spec);
		const records = [
			{kind: 'context', id: 'document', data: {document, order: {scenes: scenes.map((scene) => scene.id)}}},
		];
		const parts = new Map();
		for (const {root, ...scene} of scenes) {
			const identity = hash(root);
			if (!parts.has(identity)) {
				parts.set(identity, `${scene.id}-base`);
				records.push({kind: 'part', id: parts.get(identity), data: {root}});
			}
			const partRef = parts.get(identity);
			records.push({
				kind: 'scene',
				id: scene.id,
				dependencies: [`part:${partRef}`],
				data: {scene, partRef, changes: []},
			});
		}
		return records;
	},

	/** Call this method to assemble usable UX records in indexed linear passes.
	 * Domain validation follows once at the consumer boundary; issues never imply review approval.
	 * @param {DesignRecord[]} records - Decoded authoring units.
	 * @returns {DesignAssemblyResult} - Candidate plus explicit repair issues.
	 */
	ux(records) {
		const issues = [];
		const index = indexRecords(records, issues);
		const context = index.get('context:document');
		if (!context)
			return {document: null, issues: [...issues, issue('context:document', 'Document context is missing')]};
		fields(context.data, ['document', 'order'], 'UX context');
		const document = structuredClone(context.data.document);
		for (const key of [...UX_COLLECTIONS, 'useCases', 'flowNodes', 'flowEdges'])
			if (Object.hasOwn(document, key))
				return {
					document: null,
					issues: [
						...issues,
						issue('context:document', `${key} belongs in element/flow units, not duplicated context`),
					],
				};
		for (const key of [...UX_COLLECTIONS, 'useCases', 'flowNodes', 'flowEdges']) document[key] = [];
		for (const [key, record] of index) {
			if (record.kind === 'context') {
				if (record.id !== 'document') issues.push(issue(key, 'Only context:document is supported'));
				continue;
			}
			try {
				const additions = Object.fromEntries(
					[...UX_COLLECTIONS, 'useCases', 'flowNodes', 'flowEdges'].map((name) => [name, []]),
				);
				if (record.kind === 'element') {
					fields(record.data, ['catalogs'], key);
					fields(record.data.catalogs, [...UX_COLLECTIONS, 'behaviors'], `${key} catalogs`);
					for (const [name, packed] of Object.entries(record.data.catalogs)) {
						const values = unpack(packed);
						if (name === 'behaviors') route(values, {}, additions.flowNodes, additions.flowEdges);
						else additions[name].push(...values);
					}
				} else if (record.kind === 'flow') {
					fields(record.data, ['elementRef', 'useCase', 'nodeDefaults', 'steps', 'alternates'], key);
					const {useCase, nodeDefaults, steps, alternates = []} = record.data;
					if (useCase.id !== record.id) throw new Error('Flow and use-case identities differ');
					if (!index.has(`element:${record.data.elementRef}`))
						throw new Error('Flow has no identified interaction element');
					fields(nodeDefaults ?? {}, INHERITABLE, 'flow defaults');
					const defaults = {ownerRef: `ux:use-case:${record.id}`, ...nodeDefaults};
					route(steps, defaults, additions.flowNodes, additions.flowEdges);
					for (const alternate of alternates) {
						fields(
							alternate,
							['id', 'afterStepRef', 'condition', 'order', 'steps', 'resumeStepRef'],
							'alternate',
						);
						if (!alternate.steps?.length) throw new Error('An alternate needs steps');
						route(alternate.steps, defaults, additions.flowNodes, additions.flowEdges);
						if (alternate.afterStepRef)
							additions.flowEdges.push({
								id: `${alternate.id}-branch`,
								fromRef: alternate.afterStepRef,
								toRef: `ux:flow-node:${alternate.steps[0].id}`,
								kind: 'branches-to',
								status: defaults.status,
								sourceRefs: defaults.sourceRefs,
								condition: alternate.condition,
								order: alternate.order ?? 1,
							});
						if (alternate.resumeStepRef) {
							const last = alternate.steps.at(-1);
							if (last.links?.some((link) => link.kind === 'next'))
								throw new Error('Alternate has both an explicit next link and a resume step');
							additions.flowEdges.push({
								id: `${alternate.id}-resume`,
								fromRef: last.id,
								toRef: `ux:flow-node:${alternate.resumeStepRef}`,
								kind: 'next',
								status: defaults.status,
								sourceRefs: defaults.sourceRefs,
							});
						}
					}
					additions.useCases.push({
						...useCase,
						entryNodeRef: useCase.entryNodeRef ?? steps[0]?.id,
						actionRefs: useCase.actionRefs ?? [
							...new Set(additions.flowNodes.map((node) => node.actionRef).filter(Boolean)),
						],
					});
				} else throw new Error(`Unexpected ${record.kind} in UX store`);
				for (const [name, values] of Object.entries(additions)) document[name].push(...values);
			} catch (error) {
				issues.push(issue(key, error.message));
			}
		}
		try {
			restoreOrder(document, context.data.order);
		} catch (error) {
			issues.push(issue('context:document', error.message));
		}
		return {document, issues};
	},

	/** Call this method to expand reusable UI parts and scene variations once.
	 * A broken scene is reported while independent scenes remain available for inspection.
	 * @param {DesignRecord[]} records - Decoded UI authoring units.
	 * @returns {DesignAssemblyResult} - Candidate plus repair issues.
	 */
	ui(records) {
		const issues = [];
		const index = indexRecords(records, issues);
		const context = index.get('context:document');
		if (!context)
			return {document: null, issues: [...issues, issue('context:document', 'Document context is missing')]};
		fields(context.data, ['document', 'order'], 'UI context');
		if (Object.hasOwn(context.data.document, 'scenes'))
			return {
				document: null,
				issues: [...issues, issue('context:document', 'Scenes belong in scene units, not duplicated context')],
			};
		const document = {...structuredClone(context.data.document), scenes: []};
		for (const [key, record] of index) {
			if (record.kind === 'context') {
				if (record.id !== 'document') issues.push(issue(key, 'Only context:document is supported'));
				continue;
			}
			if (record.kind === 'part') continue;
			try {
				if (record.kind !== 'scene') throw new Error(`Unexpected ${record.kind} in UI store`);
				fields(record.data, ['scene', 'partRef', 'changes'], key);
				const {scene, partRef, changes} = record.data;
				if (scene.id !== record.id || Object.hasOwn(scene, 'root'))
					throw new Error('Scene identity differs or duplicates its part tree');
				const part = index.get(`part:${partRef}`);
				if (!part) throw new Error(`Missing part ${partRef}`);
				fields(part.data, ['root'], 'part');
				document.scenes.push({...scene, root: sceneTree(part.data.root, changes)});
			} catch (error) {
				issues.push(issue(key, error.message));
			}
		}
		try {
			restoreOrder(document, context.data.order);
		} catch (error) {
			issues.push(issue('context:document', error.message));
		}
		return {document, issues};
	},
};
