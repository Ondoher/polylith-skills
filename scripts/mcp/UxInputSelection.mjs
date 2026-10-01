import {affectedUseCases, buildUseCaseHandoff} from '../../skills/refine-design/scripts/composable-handoff.mjs';
import {validateProductModel} from '../../skills/refine-design/scripts/product-model.mjs';
import {validateUxSpec} from '../../skills/refine-design/scripts/ux-design.mjs';

const collections = {
	features: 'feature',
	surfaces: 'surface',
	components: 'component',
	actions: 'action',
	interactionFrames: 'frame',
	states: 'state',
	feedback: 'feedback',
	flows: 'flow',
	patternResearch: 'research',
};
const referenceKinds = {
	actionRef: 'action',
	actionRefs: 'action',
	stateRef: 'state',
	stateRefs: 'state',
	applicableStateRefs: 'state',
	targetState: 'state',
	feedbackRefs: 'feedback',
	frameRef: 'frame',
	frameRefs: 'frame',
	parentFrameRef: 'frame',
	componentRefs: 'component',
	researchRef: 'research',
	alternateRefs: 'alternate',
	surfaceRef: 'surface',
	featureRef: 'feature',
};
// These describe ownership, membership or evidence, not a request to expand every consumer.
const inventoryKeys = new Set([
	'taskRefs',
	'flowRefs',
	'surfaceRefs',
	'interactionFrameRefs',
	'ownerRef',
	'areaRef',
	'questionRefs',
	'sourceRefs',
]);
const productCollections = ['users', 'capabilities', 'goals', 'requirements', 'rules', 'gaps'];

/** Deterministic, read-only UX work packages; canonical records retain their exact content. */
export class UxInputSelection {
	/** Call this method to select complete affected interactions from saved current facts and prior UX.
	 * @param {UxSelectionRequest} input - Bound facts, prior UX and optional explicit scope.
	 * @returns {UxSelectionResult} - Agent packet and separately readable selection evidence.
	 */
	static select({facts, ux, changedRefs, flowIds = []}) {
		return new UxInputSelection(facts, ux).select(changedRefs, flowIds);
	}

	/** Builds lookup tables without modifying either source.
	 * @param {object} facts - Current planner facts.
	 * @param {object} ux - Prior current-schema UX.
	 */
	constructor(facts, ux) {
		this.facts = facts;
		this.model = facts.productModel;
		this.ux = ux;
		if (!this.model?.recordIndex || !Array.isArray(ux.flows))
			throw new Error('Expected planner facts and native UX flows');
		validateProductModel(this.model);
		validateUxSpec(ux);
		this.notices = [];
		this.index = new Map();
		this.selected = new Map();
		this.queue = [];
		this.flowSelection = new Set();
		this.seedImpacts = [];
		this.productIndex = new Map(
			productCollections.flatMap((key) => (this.model[key] ?? []).map((record) => [record.id, record])),
		);
		for (const [key, kind] of Object.entries(collections))
			for (const record of ux[key] ?? []) this.index.set(`ux:${kind}:${record.id}`, {key, record});
		for (const flow of ux.flows)
			for (const alternate of flow.alternates)
				this.index.set(`ux:alternate:${alternate.id}`, {
					key: 'supportingAlternates',
					record: alternate,
					flow: flow.id,
				});
		this.handoffs = new Map(ux.flows.map((flow) => [flow.id, buildUseCaseHandoff(this.model, ux, flow.id)]));
	}

	/** Adds an exact record once and preserves its first inclusion reason.
	 * @param {string} ref - Typed UX reference.
	 * @param {string} reason - Inclusion reason or referring record.
	 * @returns {void}
	 */
	_add(ref, reason) {
		if (this.selected.has(ref)) return;
		const entry = this.index.get(ref);
		if (!entry) {
			this.notices.push({kind: 'missing-reference', ref, reason});
			return;
		}
		this.selected.set(ref, reason);
		this.queue.push(ref);
		if (entry.key === 'flows') this.flowSelection.add(entry.record.id);
	}

	/** Expands behavior dependencies, leaving membership and consumer inventories available in the overview.
	 * @param {object} record - Complete selected record.
	 * @param {string} owner - Referring record for evidence.
	 * @returns {void}
	 */
	_dependencies(record, owner) {
		const visit = (value, key) => {
			if (inventoryKeys.has(key)) return;
			if (typeof value === 'string') {
				if (referenceKinds[key]) this._add(`ux:${referenceKinds[key]}:${value}`, owner);
				else if (/^ux:(feature|surface|component|action|frame|state|feedback|flow|research):/.test(value))
					this._add(value, owner);
			} else if (Array.isArray(value)) value.forEach((item) => visit(item, key));
			else if (value && typeof value === 'object')
				for (const [childKey, child] of Object.entries(value)) visit(child, childKey);
		};
		visit(record, '');
	}

	/** Finds initial affected flows and broadens unmapped changes explicitly.
	 * @param {string[]} seeds - Product or UX references that actually changed.
	 * @param {string[]} flowIds - Explicitly assigned or additionally requested flows.
	 * @returns {void}
	 */
	_seed(seeds, flowIds) {
		const initial = new Set(flowIds);
		for (const ref of seeds) {
			let affected = affectedUseCases(this.ux, ref, this.model);
			const record = this.productIndex.get(ref.replace(/^product:/, ''));
			if (!affected.length && record) {
				const related = [...(record.affectedRecordRefs ?? []), ...(record.appliesToRefs ?? [])];
				const capabilities = new Set([record.id, ...(record.capabilityRefs ?? [])]);
				for (const requirement of this.model.requirements)
					if (requirement.capabilityRefs?.some((id) => capabilities.has(id))) related.push(requirement.id);
				affected = [
					...new Set(related.flatMap((id) => affectedUseCases(this.ux, `product:${id}`, this.model))),
				];
				if (affected.length) this.notices.push({kind: 'broadened-through-product-relations', ref});
			}
			if (!affected.length) {
				this.notices.push({kind: 'unmapped-change-full-ux', ref});
				affected = this.ux.flows.map((flow) => flow.id);
			}
			for (const id of affected) initial.add(id);
			this.seedImpacts.push({ref, flowIds: affected});
		}
		for (const id of initial) {
			const flow = this.ux.flows.find((item) => item.id === id);
			if (!flow) throw new Error(`Unknown requested flow ${id}`);
			for (const sibling of this.ux.flows.filter((item) => item.elementRef === flow.elementRef))
				this._add(`ux:flow:${sibling.id}`, `affected-element:${flow.elementRef}`);
		}
		// A missing mapping includes even orphaned records, not only records reached from flows.
		if (this.notices.some((item) => item.kind === 'unmapped-change-full-ux')) this._all('unmapped-change');
	}

	/** Includes all indexed top-level UX records when narrowing cannot be justified.
	 * @param {string} reason - Broadening reason.
	 * @returns {void}
	 */
	_all(reason) {
		for (const [ref, entry] of this.index) if (entry.record) this._add(ref, reason);
	}

	/** Selects product authority and exact supporting source claims.
	 * @param {string[]} seeds - Changed references.
	 * @param {object[]} realizations - Retained product-to-UX links.
	 * @returns {object} - Filtered copy of the product model, never a canonical replacement.
	 */
	_product(seeds, realizations) {
		const selected = new Set(
			[...seeds, ...realizations.map((item) => item.productRef)]
				.filter((ref) => ref.startsWith('product:'))
				.map((ref) => ref.slice(8)),
		);
		for (const key of ['users', 'rules', 'gaps'])
			for (const record of this.model[key] ?? []) selected.add(record.id);
		if (this.notices.some((item) => item.kind.endsWith('-full-ux')))
			for (const id of this.productIndex.keys()) selected.add(id);
		const queue = [...selected];
		for (let i = 0; i < queue.length; i++) {
			const record = this.productIndex.get(queue[i]);
			for (const key of ['capabilityRefs', 'goalRefs', 'userRefs', 'relatedCapabilityRefs'])
				for (const ref of record?.[key] ?? [])
					if (!selected.has(ref)) {
						selected.add(ref);
						queue.push(ref);
					}
		}
		this.productSelected = selected;
		const result = {...this.model};
		for (const key of productCollections)
			result[key] = (this.model[key] ?? []).filter((record) => selected.has(record.id));
		result.recordIndex = this.model.recordIndex.filter(
			(record) => selected.has(record.id) || record.id === this.model.id,
		);
		result.sourceClaims = this.model.sourceClaims.filter((claim) =>
			claim.recordRefs.some((ref) => selected.has(ref)),
		);
		return result;
	}

	/** Creates an exact overview using existing authored descriptions, without a summarizing model.
	 * @param {object} record - Canonical record.
	 * @param {string} ref - Stable lookup reference.
	 * @returns {object} - Discoverable identity, purpose and flow relationships.
	 */
	_overview(record, ref) {
		return {
			ref,
			...Object.fromEntries(
				['name', 'title', 'status', 'purpose', 'summary', 'statement', 'elementRef', 'featureRef']
					.filter((key) => record[key] !== undefined)
					.map((key) => [key, record[key]]),
			),
		};
	}

	/** Call this method to assemble the selected packet and evidence from this instance's inputs.
	 * @param {string[]|undefined} changedRefs - Explicit change seeds; otherwise the saved change ledger.
	 * @param {string[]} flowIds - Explicitly assigned flows, also usable for follow-up expansion.
	 * @returns {UxSelectionResult} - Read packet and selection evidence separately by JSON pointer.
	 */
	select(changedRefs, flowIds) {
		const changes = this.model.changeSet?.records;
		const seeds =
			changedRefs ??
			changes?.filter((item) => item.classification !== 'unchanged').map((item) => `product:${item.id}`);
		if (!seeds) {
			this.notices.push({kind: 'missing-change-ledger-full-ux'});
			this._all('missing-change-ledger');
		}
		const binding = this.ux.productModelBinding;
		const current = this.facts.productModelBinding;
		const same = binding?.sha256 === current?.sha256 && binding?.revision === current?.revision;
		const parent =
			binding?.sha256 === this.model.parent?.sha256 && binding?.revision === this.model.parent?.revision;
		if (!same && !parent) {
			this.notices.push({kind: 'unmatched-baseline-full-ux'});
			this._all('unmatched-baseline');
		}
		this._seed(seeds ?? [], flowIds);
		for (let cursor = 0; cursor < this.queue.length; cursor++) {
			const ref = this.queue[cursor];
			const {key, record} = this.index.get(ref);
			if (key === 'flows') {
				const handoff = this.handoffs.get(record.id);
				for (const [field, kind] of Object.entries({
					actionRefs: 'action',
					stateRefs: 'state',
					feedbackRefs: 'feedback',
					frameRefs: 'frame',
				}))
					for (const id of handoff[field]) this._add(`ux:${kind}:${id}`, ref);
			}
			this._dependencies(record, ref);
		}
		const selectedUx = {...this.ux};
		for (const [key, kind] of Object.entries(collections))
			selectedUx[key] = (this.ux[key] ?? []).filter((record) => this.selected.has(`ux:${kind}:${record.id}`));
		selectedUx.supportingAlternates = [...this.index]
			.filter(([ref, entry]) => entry.flow && this.selected.has(ref) && !this.flowSelection.has(entry.flow))
			.map(([, entry]) => ({flowRef: `ux:flow:${entry.flow}`, alternate: entry.record}));
		// Keep all questions, repair notices and trace gaps; filter only explicit realization links.
		selectedUx.productRealizations = this.ux.productRealizations.filter(
			(item) => this.selected.has(item.uxRef) || item.uxRef.startsWith('ux:question:'),
		);
		const product = this._product(seeds ?? [], selectedUx.productRealizations);
		const overview = {
			product: [...this.productIndex]
				.filter(([id]) => !this.productSelected.has(id))
				.map(([id, record]) => this._overview(record, `product:${id}`)),
			ux: [...this.index]
				.filter(([ref, entry]) => !entry.flow && !this.selected.has(ref))
				.map(([ref, {record}]) => this._overview(record, ref)),
		};
		const counts = Object.fromEntries(
			Object.entries(collections).map(([key]) => [
				key,
				{full: (this.ux[key] ?? []).length, selected: selectedUx[key].length},
			]),
		);
		return {
			packet: {
				kind: 'ux-selected-input',
				policy: 'complete-interactions/1',
				canonical: false,
				selectionPurpose: 'read-context-only',
				currentProductBinding: current,
				priorUxBinding: binding,
				changedRefs: seeds ?? [],
				notices: this.notices,
				facts: {...this.facts, productModel: product},
				ux: selectedUx,
				overview,
			},
			receipt: {
				policy: 'complete-interactions/1',
				counts,
				selectedFlowIds: [...this.flowSelection],
				seedImpacts: this.seedImpacts,
				inclusions: [...this.selected].map(([ref, reason]) => ({ref, reason})),
				omittedDetailRefs: overview.ux.map((record) => record.ref),
				checks: {
					canonicalRecordsRewritten: false,
					semanticSufficiencyReviewed: false,
					authorizesInterfaceUpdates: false,
				},
			},
		};
	}
}
