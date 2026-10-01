import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assessRefinementImpact} from './refinement-impact.mjs';

/** Source-backed interface selection shared by normal delivery and replay. */
export class WireframeScope {
	/** Creates a selector over frozen source facts and supplied semantic impacts.
	 * @param {WireframeScopeContext} context - Read-only source and UX packet.
	 */
	constructor(context) {
		this.context = context;
		this.basis = context.scopeBasis;
		assert(
			this.basis && Array.isArray(this.basis.impacts),
			'Supply scopeBasis with verified source facts and impacts',
		);
		this.changes = assessRefinementImpact(this.basis.previousSources, this.basis.currentSources, []).sources;
		this.impacts = new Map();
		for (const impact of this.basis.impacts) {
			assert(impact.id && !this.impacts.has(impact.id), 'Impact IDs must be present and unique');
			this.impacts.set(impact.id, impact);
		}
		this.binding = this._digest(context);
	}
	/** Called by hashing to preserve all facts while ignoring property order.
	 * @param {unknown} value - JSON value.
	 * @returns {unknown} - Canonical JSON value.
	 */
	_canonical(value) {
		if (Array.isArray(value)) return value.map((item) => this._canonical(item));
		if (!value || typeof value !== 'object') return value;
		return Object.fromEntries(
			Object.keys(value)
				.sort()
				.map((key) => [key, this._canonical(value[key])]),
		);
	}
	/** Called by binding to identify exact input values.
	 * @param {unknown} value - JSON value.
	 * @returns {string} - SHA-256 digest.
	 */
	_digest(value) {
		return createHash('sha256')
			.update(JSON.stringify(this._canonical(value)))
			.digest('hex');
	}
	/** Called by validation to resolve a behavior or presentation reference.
	 * @param {string} reference - Typed record reference.
	 * @returns {boolean} - Whether the reference exists in supplied context.
	 */
	_known(reference) {
		const separator = reference.indexOf(':');
		const kind = reference.slice(0, separator);
		const recordId = reference.slice(separator + 1);
		const collection = {
			flow: 'flows',
			action: 'actions',
			frame: 'interactionFrames',
			component: 'components',
			state: 'states',
		}[kind];
		return Boolean(collection && this.context[collection]?.some((record) => record.id === recordId));
	}
	/** Called by selection to validate the evidence supporting one interface.
	 * @param {WireframeScopeImpact} impact - Parent-supplied semantic decision.
	 * @param {WireframeScopeElement} element - Candidate interface.
	 * @returns {string[]} - Local repair findings; empty means mechanically supported.
	 */
	_problems(impact, element) {
		const problems = [];
		if (impact.elementId !== element.id) problems.push('Impact belongs to another interface');
		if (!['requirement-change', 'defect-repair'].includes(impact.kind))
			problems.push('Specify requirement-change or defect-repair');
		if (!impact.reason?.trim()) problems.push('Explain the concrete interface effect');
		if (impact.status !== 'ready')
			problems.push(impact.remediation || 'Resolve the source/impact issue before dispatch');
		if (impact.kind === 'defect-repair' && !impact.defect?.trim())
			problems.push('Identify the existing defect separately from a requirement change');
		const allowed = new Set([
			...(element.sourceFlowRefs ?? []).map((id) => 'flow:' + id),
			...(element.sourceActionRefs ?? []).map((id) => 'action:' + id),
			...(element.frameRefs ?? []).map((id) => 'frame:' + id),
			...(element.componentRefs ?? []).map((id) => 'component:' + id),
			...(element.stateRefs ?? []).map((id) => 'state:' + id),
		]);
		if (!impact.affectedRefs?.length || impact.affectedRefs.some((ref) => !allowed.has(ref) || !this._known(ref)))
			problems.push('Resolve the affected behavior/presentation references within this interface');
		let changed = false;
		if (!impact.dependencies?.length) problems.push('Supply specific source record dependencies');
		for (const dependency of impact.dependencies ?? []) {
			const before = this.basis.previousSources.find((source) => source.id === dependency.sourceId);
			const after = this.basis.currentSources.find((source) => source.id === dependency.sourceId);
			if (!dependency.recordRefs?.length || dependency.recordRefs.includes('*'))
				problems.push('Use exact source record references');
			for (const reference of dependency.recordRefs ?? []) {
				if (!Object.hasOwn(before?.records ?? {}, reference) && !Object.hasOwn(after?.records ?? {}, reference))
					problems.push('Missing source record: ' + dependency.sourceId + ':' + reference);
				const change = this.changes[dependency.sourceId];
				if (
					change &&
					change.kind !== 'revision-only' &&
					(change.records.includes('*') || change.records.includes(reference))
				)
					changed = true;
			}
		}
		if (impact.kind === 'requirement-change' && !changed)
			problems.push('No material change in the referenced requirements');
		return problems;
	}
	/** Call this method to bind a work list, retaining unsupported entries as unresolved.
	 * A supplied stale binding is rejected; callers must recompute selection. Semantic
	 * truth remains the coordinator's responsibility, not a consequence of valid refs.
	 * @param {WireframeScopeDocument} input - Candidate interface decisions.
	 * @returns {WireframeScopeDocument} - Bound selection and local repair findings.
	 */
	select(input) {
		assert(
			input.binding === undefined || input.binding === this.binding,
			'Scope inputs changed; recompute selection',
		);
		assert(Array.isArray(input.elements), 'Scope needs an interface inventory');
		const issues = [];
		const ids = new Set();
		const elements = input.elements.map((original) => {
			const element = structuredClone(original);
			assert(/^[a-z][a-z0-9-]{0,90}$/.test(element.id) && !ids.has(element.id), 'Use unique stable element IDs');
			ids.add(element.id);
			assert(['update', 'reuse', 'unresolved'].includes(element.disposition), 'Unknown scope disposition');
			const problems = [];
			if (!element.sourceFlowRefs?.length || element.sourceFlowRefs.some((id) => !this._known('flow:' + id)))
				problems.push('Resolve interface flow references');
			const references = element.impactRefs ?? [];
			const assigned = [...this.impacts.values()].filter((impact) => impact.elementId === element.id);
			if (element.disposition !== 'reuse' && !references.length)
				problems.push('Update requires an explicit source-linked impact');
			if (element.disposition === 'reuse' && assigned.length)
				problems.push('Resolve supplied impacts before declaring this interface reusable');
			if (assigned.some((impact) => !references.includes(impact.id)))
				problems.push('Account for all supplied impacts on this interface');
			for (const reference of references) {
				const impact = this.impacts.get(reference);
				problems.push(...(impact ? this._problems(impact, element) : ['Unknown impact: ' + reference]));
			}
			if (element.disposition === 'update' && !element.requiredStates?.length)
				problems.push('Record the affected state coverage');
			if (!element.changeReason?.trim()) problems.push('Explain the update, reuse or unresolved decision');
			if (element.disposition === 'unresolved' && !problems.length) problems.push(element.changeReason);
			if (problems.length) {
				element.disposition = 'unresolved';
				issues.push({
					elementId: element.id,
					problems,
					remediation: 'Repair the source/impact decision and resubmit scope; preserve existing artifacts.',
				});
			}
			return element;
		});
		for (const element of elements)
			for (const dependency of element.dependencies ?? [])
				assert(ids.has(dependency), 'Unknown interface dependency');
		// Use only the already declared interface dependencies to hold consumers of unresolved work.
		const consumers = new Map(elements.map((element) => [element.id, []]));
		for (const element of elements)
			for (const dependency of element.dependencies ?? []) consumers.get(dependency).push(element);
		const pending = elements.filter((element) => element.disposition === 'unresolved');
		for (let cursor = 0; cursor < pending.length; cursor++)
			for (const consumer of consumers.get(pending[cursor].id))
				if (consumer.disposition === 'update') {
					consumer.disposition = 'unresolved';
					issues.push({
						elementId: consumer.id,
						problems: ['Unresolved interface dependency: ' + pending[cursor].id],
						remediation: 'Resolve the dependency before dispatching this consumer.',
					});
					pending.push(consumer);
				}
		for (const impact of this.impacts.values())
			assert(ids.has(impact.elementId), 'Impact interface omitted from scope: ' + impact.elementId);
		return {...structuredClone(input), binding: this.binding, elements, issues};
	}
	/** Call this method to include relevant source facts in the element's acceptance binding.
	 * Global revisions are excluded here; changing unrelated facts must not invalidate
	 * otherwise identical element inputs. The complete work list is still bound globally.
	 * @param {WireframeScopeElement} element - Selected interface.
	 * @returns {WireframeScopeEvidence[]} - Exact local impact and requirement evidence.
	 */
	evidence(element) {
		return (element.impactRefs ?? []).map((reference) => {
			const impact = this.impacts.get(reference);
			if (!impact) return {impact: null, sources: []};
			return {
				impact,
				sources: (impact.dependencies ?? []).flatMap((dependency) =>
					(dependency.recordRefs ?? []).map((recordRef) => ({
						sourceId: dependency.sourceId,
						recordRef,
						before:
							this.basis.previousSources.find((source) => source.id === dependency.sourceId)?.records[
								recordRef
							] ?? null,
						after:
							this.basis.currentSources.find((source) => source.id === dependency.sourceId)?.records[
								recordRef
							] ?? null,
					})),
				),
			};
		});
	}
}
