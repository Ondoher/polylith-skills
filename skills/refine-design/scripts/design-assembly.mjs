import {createHash} from 'node:crypto';
import {DesignRecords} from './design-records.mjs';
import {canonicalPublicationJson} from './product-publication-payload.mjs';

const UX_COLLECTIONS = ['surfaces', 'components', 'actions', 'interactionFrames', 'states', 'feedback'];
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

/** Native canonical records assembled without reconstructing an execution graph. */
export const DesignAssembly = {
	/** Call this method to split current UX into reusable bounded records.
	 * @param {object} spec - Canonical UX 0.4.
	 * @returns {DesignRecord[]} - Context, element and native flow records.
	 */
	importUx(spec) {
		if (spec.schemaVersion !== '0.4') throw new Error('Import old UX explicitly before using canonical assembly');
		const document = structuredClone(spec),
			order = {};
		for (const key of [...UX_COLLECTIONS, 'flows']) {
			order[key] = document[key].map((value) => value.id);
			delete document[key];
		}
		const records = [{kind: 'context', id: 'document', data: {document, order}}];
		const groups = new Map(
			spec.surfaces.map((surface) => [surface.id, Object.fromEntries(UX_COLLECTIONS.map((key) => [key, []]))]),
		);
		let shared = 'shared-definitions';
		while (groups.has(shared)) shared += '-shared';
		groups.set(shared, Object.fromEntries(UX_COLLECTIONS.map((key) => [key, []])));
		const owners = new Map(spec.surfaces.map((surface) => [`ux:surface:${surface.id}`, surface.id]));
		for (const component of spec.components)
			owners.set(`ux:component:${component.id}`, component.surfaceRefs[0] ?? shared);
		for (const state of spec.states) owners.set(`ux:state:${state.id}`, owners.get(state.ownerRef) ?? shared);
		for (const action of spec.actions)
			owners.set(`ux:action:${action.id}`, owners.get(`ux:state:${action.applicableStateRefs[0]}`) ?? shared);
		for (const key of UX_COLLECTIONS)
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
				(groups.get(owner) ?? groups.get(shared))[key].push(value);
			}
		const populated = new Set();
		for (const [id, catalogs] of groups)
			if (Object.values(catalogs).some((values) => values.length)) {
				populated.add(id);
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
		for (const flow of spec.flows) {
			const owner = owners.get(flow.elementRef);
			records.push({
				kind: 'flow',
				id: flow.id,
				dependencies: populated.has(owner) ? [`element:${owner}`] : [],
				data: structuredClone(flow),
			});
		}
		return records;
	},
	/** Call this method to split current UI parts and scenes without expanding trees.
	 * @param {object} spec - Canonical composition 0.4.
	 * @returns {DesignRecord[]} - Bounded canonical records.
	 */
	importUi(spec) {
		if (spec.schemaVersion !== '0.4') throw new Error('Import old UI explicitly before using canonical assembly');
		const {parts, scenes, ...document} = structuredClone(spec);
		return [
			{
				kind: 'context',
				id: 'document',
				data: {document, order: {parts: parts.map((part) => part.id), scenes: scenes.map((scene) => scene.id)}},
			},
			...parts.map(({id, ...data}) => ({kind: 'part', id, data})),
			...scenes.map((scene) => ({
				kind: 'scene',
				id: scene.id,
				dependencies: [`part:${scene.partRef}`],
				data: scene,
			})),
		];
	},
	/** Call this method to assemble native UX and retain independent units after errors.
	 * @param {DesignRecord[]} records - Saved units.
	 * @returns {DesignAssemblyResult} - Canonical candidate and repairs.
	 */
	ux(records) {
		return assemble(records, 'ux');
	},
	/** Call this method to assemble native parts and variations without materializing trees.
	 * @param {DesignRecord[]} records - Saved units.
	 * @returns {DesignAssemblyResult} - Canonical candidate and repairs.
	 */
	ui(records) {
		return assemble(records, 'ui');
	},
};

/** Called by canonical assemblers to collect saved units in linear indexed passes.
 * @param {DesignRecord[]} records - Decoded immutable units.
 * @param {'ux'|'ui'} stage - Domain being assembled.
 * @returns {DesignAssemblyResult} - Candidate and explicit repairs.
 */
function assemble(records, stage) {
	const issues = [],
		index = indexRecords(records, issues),
		context = index.get('context:document');
	if (!context)
		return {document: null, issues: [...issues, issue('context:document', 'Document context is missing')]};
	let document;
	const collections = stage === 'ux' ? [...UX_COLLECTIONS, 'flows'] : ['parts', 'scenes'];
	try {
		fields(context.data, ['document', 'order'], 'context');
		document = structuredClone(context.data.document);
		if (document.schemaVersion !== '0.4') throw new Error('Canonical assembly requires schema 0.4');
		for (const key of collections) {
			if (Object.hasOwn(document, key)) throw new Error(`${key} belongs in units, not duplicated context`);
			document[key] = [];
		}
	} catch (error) {
		return {document: null, issues: [...issues, issue('context:document', error.message)]};
	}
	for (const [key, record] of index) {
		if (record.kind === 'context') {
			if (record.id !== 'document') issues.push(issue(key, 'Only context:document is supported'));
			continue;
		}
		try {
			if (stage === 'ux' && record.kind === 'element') {
				fields(record.data, ['catalogs'], key);
				fields(record.data.catalogs, UX_COLLECTIONS, key);
				const additions = Object.entries(record.data.catalogs).map(([name, packed]) => [name, unpack(packed)]);
				for (const [name, values] of additions) document[name].push(...values);
			} else if (stage === 'ux' && record.kind === 'flow') {
				if (record.data.id !== record.id) throw new Error('Flow identity differs from record');
				document.flows.push(structuredClone(record.data));
			} else if (stage === 'ui' && record.kind === 'part') {
				fields(record.data, ['root'], key);
				document.parts.push({id: record.id, ...structuredClone(record.data)});
			} else if (stage === 'ui' && record.kind === 'scene') {
				if (record.data.id !== record.id || Object.hasOwn(record.data, 'root'))
					throw new Error('Scene identity differs or duplicates its part');
				if (!index.has(`part:${record.data.partRef}`)) throw new Error('Scene references missing part');
				document.scenes.push(structuredClone(record.data));
			} else throw new Error(`Unexpected ${record.kind} in ${stage} store`);
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
}
