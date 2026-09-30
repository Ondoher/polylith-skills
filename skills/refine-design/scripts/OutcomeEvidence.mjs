import assert from 'node:assert/strict';

/** Resolution of existing source facts to concrete scene content, without interpreting prose. */
export const OutcomeEvidence = {
	/**
	 * Call this method to resolve an exact JSON pointer in the frozen input packet.
	 * @param {object} packet - Existing source packet.
	 * @param {string} pointer - Absolute JSON pointer, including escaped property names.
	 * @returns {unknown} Referenced source value.
	 */
	resolve(packet, pointer) {
		assert(typeof pointer === 'string' && pointer.startsWith('/'), 'Expected an absolute sourcePath');
		let value = packet;
		for (const key of pointer
			.slice(1)
			.split('/')
			.map((x) => x.replaceAll('~1', '/').replaceAll('~0', '~'))) {
			assert(value && Object.hasOwn(value, key), `Missing sourcePath: ${pointer}`);
			value = value[key];
		}
		return value;
	},
	/**
	 * Call this method to check evidence against materialized scenes and original facts.
	 * @param {Array<OutcomeLink>} evidence - Compact links authored alongside relevant result scenes.
	 * @param {object} packet - Frozen source facts; no inferred expectations are inserted.
	 * @param {Array<object>} scenes - Scenes with fully materialized roots.
	 * @returns {Array<string>} Local repair findings; an empty list is not semantic approval.
	 */
	check(evidence, packet, scenes) {
		const errors = [];
		for (const [index, link] of (evidence ?? []).entries()) {
			try {
				this.resolve(packet, link.sourcePath);
				assert(['visible-change', 'navigation', 'unchanged'].includes(link.resultKind), 'Declare resultKind');
				const scene = scenes.find((x) => x.id === link.sceneRef);
				assert(scene, `Missing scene ${link.sceneRef}`);
				const nodes = new Map();
				const visit = (node) => {
					nodes.set(node.id, node);
					for (const child of node.children ?? []) visit(child);
				};
				visit(scene.root);
				assert(Array.isArray(link.nodeRefs) && link.nodeRefs.length > 0, 'Supply concrete result nodeRefs');
				for (const id of link.nodeRefs) assert(nodes.has(id), `Missing rendered node ${id}`);
				if (link.resultKind === 'visible-change') {
					assert(
						link.nodeRefs.some((id) => {
							const node = nodes.get(id);
							return node.kind === 'component' && !['status', 'heading'].includes(node.templateRef?.id);
						}),
						'A visible change needs a result control, value or object; status/heading alone is insufficient',
					);
				}
				for (const binding of link.values ?? []) {
					assert(link.nodeRefs.includes(binding.nodeRef), 'Value binding must reference an evidence node');
					assert(
						['text', 'label', 'value'].includes(binding.parameter),
						'Bind a rendered text, label or value',
					);
					const parameters =
						{
							heading: ['text'],
							text: ['text'],
							status: ['text'],
							visual: ['text'],
							button: ['label'],
							'button-secondary': ['label'],
							'text-field': ['label', 'value'],
						}[nodes.get(binding.nodeRef).templateRef?.id] ?? [];
					assert(
						parameters.includes(binding.parameter),
						`${binding.nodeRef}.${binding.parameter} is not a displayed parameter of this template`,
					);
					const expected = this.resolve(packet, binding.sourcePath);
					assert(
						['string', 'number', 'boolean'].includes(typeof expected),
						'Expected value must be a source scalar',
					);
					const actual = nodes.get(binding.nodeRef).parameters?.[binding.parameter];
					assert(
						actual === expected,
						`${binding.nodeRef}.${binding.parameter} differs from ${binding.sourcePath}`,
					);
				}
			} catch (error) {
				errors.push(`outcomeEvidence[${index}] ${link.sourcePath ?? '?'}: ${error.message}`);
			}
		}
		return errors;
	},
};
