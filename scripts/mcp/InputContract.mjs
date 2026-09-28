/** Validation for the small JSON-schema vocabulary used by the curated tool catalog. */
export class InputContract {
	/** Call this method to validate finite JSON and the declared input contract.
	 * @param {WorkflowJson} value - Untrusted tool input.
	 * @param {WorkflowSchema} schema - Maintained contract, never caller supplied.
	 * @param {string} location - Error location.
	 * @returns {void} - Throws on invalid input.
	 */
	validate(value, schema = {}, location = 'input') {
		if (value === null) {
			if (schema.type && schema.type !== 'null') throw new Error(`${location}: null is not allowed`);
			return;
		}
		const type = Array.isArray(value) ? 'array' : typeof value;
		if (!['string', 'number', 'boolean', 'array', 'object'].includes(type))
			throw new Error(`${location}: requires JSON`);
		if (type === 'number' && !Number.isFinite(value)) throw new Error(`${location}: requires a finite number`);
		if (schema.type && (schema.type === 'integer' ? !Number.isInteger(value) : schema.type !== type))
			throw new Error(`${location}: expected ${schema.type}`);
		if (schema.enum && !schema.enum.includes(value)) throw new Error(`${location}: unsupported value`);
		if (schema.minimum !== undefined && value < schema.minimum) throw new Error(`${location}: below minimum`);
		if (schema.maximum !== undefined && value > schema.maximum) throw new Error(`${location}: above maximum`);
		if (type === 'string' && schema.maxLength && value.length > schema.maxLength)
			throw new Error(`${location}: too long`);
		if (type === 'array') {
			if (schema.maxItems && value.length > schema.maxItems) throw new Error(`${location}: too many items`);
			value.forEach((item, index) => this.validate(item, schema.items, `${location}[${index}]`));
		}
		if (type === 'object') {
			if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
				throw new Error(`${location}: requires a plain JSON object`);
			for (const key of schema.required ?? [])
				if (!Object.hasOwn(value, key)) throw new Error(`${location}.${key}: required`);
			for (const [key, item] of Object.entries(value)) {
				if (['__proto__', 'prototype', 'constructor'].includes(key))
					throw new Error(`${location}: reserved key`);
				if (schema.additionalProperties === false && !Object.hasOwn(schema.properties ?? {}, key))
					throw new Error(`${location}.${key}: unknown field`);
				this.validate(item, schema.properties?.[key], `${location}.${key}`);
			}
		}
	}
}
