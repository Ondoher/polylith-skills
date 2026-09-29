import fs from 'node:fs';

const schema = JSON.parse(fs.readFileSync(new URL('../references/ux-schema-0.4.json', import.meta.url), 'utf8'));
const catalogs = ['surfaces', 'components', 'actions', 'interactionFrames', 'states', 'feedback'];
const metadata = ['status', 'sourceRefs', 'questionRefs', 'ownerRef', 'surfaceRef', 'taskRefs'];

/** Resolves a maintained local UX schema reference.
 * @param {object} rule - Schema node.
 * @returns {object} - Resolved node.
 */
function resolve(rule) {
	return rule.$ref ? schema.$defs[rule.$ref.split('/').at(-1)] : rule;
}

/** Checks supplied field structure; required meaning is checked at completion.
 * Conditional semantic rules remain owned by validateUxSpec.
 * @param {unknown} value - Supplied JSON.
 * @param {object} rule - Maintained schema node.
 * @param {string} label - Diagnostic location.
 * @param {boolean} complete - Require missing fields too.
 * @returns {void}
 */
function check(value, rule, label, complete = false) {
	rule = resolve(rule);
	const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
	if (rule.type && (rule.type === 'integer' ? !Number.isInteger(value) : type !== rule.type))
		throw new Error(`${label}: expected ${rule.type}`);
	if (Object.hasOwn(rule, 'const') && value !== rule.const) throw new Error(`${label}: expected ${rule.const}`);
	if (rule.enum && !rule.enum.includes(value)) throw new Error(`${label}: unsupported value`);
	if (typeof value === 'number' && (!Number.isFinite(value) || (rule.minimum !== undefined && value < rule.minimum)))
		throw new Error(`${label}: invalid number`);
	if (typeof value === 'string' && rule.pattern && !new RegExp(rule.pattern).test(value))
		throw new Error(`${label}: invalid text or identity`);
	if (type === 'object') {
		if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
			throw new Error(`${label}: requires a plain object`);
		if (complete)
			for (const field of rule.required ?? [])
				if (!Object.hasOwn(value, field)) throw new Error(`${label}.${field}: required`);
		for (const [field, item] of Object.entries(value)) {
			if (
				['__proto__', 'prototype', 'constructor'].includes(field) ||
				!Object.hasOwn(rule.properties ?? {}, field)
			)
				throw new Error(`${label}.${field}: unknown field`);
			check(item, rule.properties[field], `${label}.${field}`, complete);
		}
	} else if (type === 'array') {
		if (complete && value.length < (rule.minItems ?? 0)) throw new Error(`${label}: too few items`);
		const ids = new Set();
		value.forEach((item, i) => {
			check(item, rule.items, `${label}[${i}]`, complete);
			const key = rule.uniqueItems ? JSON.stringify(item) : item?.id;
			if (key !== undefined && ids.has(key)) throw new Error(`${label}: duplicate identity or value ${key}`);
			ids.add(key);
		});
	}
}

/** Merges supplied objects, replacing only explicitly supplied arrays/scalars.
 * @param {object} target - Working record.
 * @param {object} fields - Already checked new meaning.
 * @returns {void}
 */
function merge(target, fields) {
	for (const [key, value] of Object.entries(fields)) {
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
			merge(target[key], value);
		} else target[key] = structuredClone(value);
	}
}

/** Checks an operation envelope without accepting arbitrary paths or fields.
 * @param {object} value - Operation/selector.
 * @param {string[]} fields - Closed allowed names.
 * @returns {void}
 */
function closed(value, fields) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object');
	for (const key of Object.keys(value))
		if (!fields.includes(key)) throw new Error(`Unknown contribution field ${key}`);
}

/** Schema-bound semantic edits; packing and record identities stay code-owned. */
export const UxContributions = {
	/** Decodes one authoring unit once for incremental editing.
	 * @param {DesignRecord} record - Saved current UX unit.
	 * @returns {object} - Unpacked working unit.
	 */
	decode(record) {
		const copy = structuredClone(record);
		if (copy.kind === 'element') {
			copy.data = Object.fromEntries(
				catalogs.map((name) => {
					const packed = copy.data.catalogs[name] ?? {values: []};
					return [name, packed.values.map((value) => ({...packed.defaults, ...value}))];
				}),
			);
		}
		return copy;
	},

	/** Creates an empty partial unit; no missing meaning is invented.
	 * @param {string} reference - Assigned kind:ID.
	 * @returns {object} - Partial working unit.
	 */
	empty(reference) {
		if (!/^(context:document|(?:flow|element):[a-z0-9][a-z0-9._-]{0,159})$/.test(reference))
			throw new Error(`Invalid UX unit ${reference}`);
		const [kind, id] = reference.split(':');
		return {
			kind,
			id,
			data:
				kind === 'context'
					? {document: {schemaVersion: '0.4'}, order: {}}
					: kind === 'flow'
						? {id}
						: Object.fromEntries(catalogs.map((name) => [name, []])),
		};
	},

	/** Applies one checked contribution to a temporary per-unit working copy.
	 * @param {object} unit - Unpacked working unit.
	 * @param {object} change - Semantic operation.
	 * @returns {void}
	 */
	apply(unit, change) {
		closed(change, ['unit', 'op', 'target', 'fields', 'unset', 'before', 'collection', 'ids']);
		if (!['set', 'remove', 'order', 'catalog-order'].includes(change.op))
			throw new Error('Unknown contribution operation');
		if (change.op === 'catalog-order') {
			if (unit.kind !== 'context' || ![...catalogs, 'flows'].includes(change.collection))
				throw new Error('Catalog order belongs to context:document');
			check(change.ids, {$ref: '#/$defs/idList'}, 'ids');
			unit.data.order[change.collection] = [...change.ids];
			return;
		}
		let value = unit.kind === 'context' ? unit.data.document : unit.data;
		let rule =
			unit.kind === 'flow'
				? schema.$defs.flow
				: {
						...schema,
						properties: Object.fromEntries(
							Object.entries(schema.properties).filter(([key]) =>
								unit.kind === 'element'
									? catalogs.includes(key)
									: ![...catalogs, 'flows'].includes(key),
							),
						),
					};
		let parent, index;
		if (change.target !== undefined && !Array.isArray(change.target))
			throw new Error('target must be a list of ID selectors');
		for (const selector of change.target ?? []) {
			closed(selector, ['collection', 'id']);
			const child = resolve(rule).properties?.[selector.collection];
			if (!child || resolve(child).type !== 'array' || !resolve(resolve(child).items).properties?.id)
				throw new Error(`Not an identified UX collection: ${selector.collection}`);
			check(selector.id, {$ref: '#/$defs/stableId'}, 'target.id');
			if (!value[selector.collection]) value[selector.collection] = [];
			parent = value[selector.collection];
			index = parent.findIndex((item) => item.id === selector.id);
			if (index === -1) {
				if (change.op !== 'set') throw new Error(`Missing target ${selector.collection}:${selector.id}`);
				index = parent.length;
				parent.push({id: selector.id});
			}
			value = parent[index];
			rule = resolve(child).items;
		}
		if (change.op === 'remove') {
			if (!parent) throw new Error('Remove requires an identified record target');
			parent.splice(index, 1);
			return;
		}
		if (change.op === 'order') {
			const child = resolve(rule).properties?.[change.collection];
			if (!child || resolve(child).type !== 'array' || !resolve(resolve(child).items).properties?.id)
				throw new Error('Order requires an identified collection');
			check(change.ids, {$ref: '#/$defs/idList'}, 'ids');
			const items = new Map((value[change.collection] ?? []).map((item) => [item.id, item]));
			if (
				change.ids.length !== items.size ||
				new Set(change.ids).size !== items.size ||
				change.ids.some((id) => !items.has(id))
			)
				throw new Error('Order must name every current record exactly once');
			value[change.collection] = change.ids.map((id) => items.get(id));
			return;
		}
		closed(change.fields ?? {}, Object.keys(resolve(rule).properties ?? {}));
		check(change.fields ?? {}, rule, change.unit);
		if (Object.hasOwn(change.fields ?? {}, 'id') && value.id !== undefined && value.id !== change.fields.id)
			throw new Error('A record identity cannot be changed');
		merge(value, change.fields ?? {});
		if (change.unset !== undefined && !Array.isArray(change.unset))
			throw new Error('unset must be a field-name list');
		for (const field of change.unset ?? []) {
			if (field === 'id' || !Object.hasOwn(value, field)) throw new Error(`Cannot unset ${field}`);
			delete value[field];
		}
		if (Object.hasOwn(change, 'before')) {
			if (!parent) throw new Error('before requires an identified record target');
			parent.splice(index, 1);
			const anchor = change.before === null ? 0 : parent.findIndex((item) => item.id === change.before);
			if (anchor < 0) throw new Error('Insertion anchor is missing');
			parent.splice(anchor, 0, value);
		}
	},

	/** Mechanically packs a working unit for existing consumers.
	 * @param {object} unit - Unpacked working data.
	 * @returns {DesignRecord} - Existing authoring envelope.
	 */
	encode(unit) {
		if (unit.kind !== 'element') return structuredClone(unit);
		const packed = {};
		for (const name of catalogs) {
			const values = unit.data[name] ?? [],
				defaults = {};
			for (const field of metadata)
				if (
					values.length > 1 &&
					values[0][field] !== undefined &&
					values.every((item) => JSON.stringify(item[field]) === JSON.stringify(values[0][field]))
				)
					defaults[field] = values[0][field];
			packed[name] = {
				defaults,
				values: values.map((item) =>
					Object.fromEntries(Object.entries(item).filter(([key]) => !Object.hasOwn(defaults, key))),
				),
			};
		}
		return {...unit, data: {catalogs: packed}};
	},

	/** Returns compact available identities, without repeating record content.
	 * @param {object} unit - Unpacked working data.
	 * @returns {object} - Top-level collection identities.
	 */
	identities(unit) {
		const data = unit.kind === 'context' ? unit.data.document : unit.data;
		return Object.fromEntries(
			Object.entries(data)
				.filter(([, value]) => Array.isArray(value) && value.some((item) => item?.id))
				.map(([key, values]) => [key, values.map((item) => item.id).filter(Boolean)]),
		);
	},
};
