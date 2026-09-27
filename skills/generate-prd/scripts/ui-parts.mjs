/** Native composition parts and bounded variations; expanded trees exist only while rendering. */
export const UiParts = {
	/** Call this method to resolve scene trees from the canonical composition.
	 * Does not change persisted input or emit an older consumer schema.
	 * @param {object} spec - Canonical UI/component composition schema 0.4.
	 * @returns {object} - In-memory render view with resolved scene trees.
	 */
	materialize(spec) {
		if (spec?.schemaVersion !== '0.4')
			throw new Error('Composition requires schema 0.4; import old data explicitly');
		if (!Array.isArray(spec.parts) || !Array.isArray(spec.scenes))
			throw new Error('Composition parts and scenes must be arrays');
		const parts = new Map();
		for (const part of spec.parts) {
			if (
				!part ||
				typeof part.id !== 'string' ||
				!/^[a-z0-9][a-z0-9._-]{0,159}$/.test(part.id) ||
				parts.has(part.id) ||
				Object.keys(part).some((key) => !['id', 'root'].includes(key))
			)
				throw new Error('Invalid or duplicate composition part');
			if (!part.root || typeof part.root !== 'object' || Array.isArray(part.root))
				throw new Error(`Part ${part.id} needs a root tree`);
			parts.set(part.id, part);
		}
		const scenes = spec.scenes.map((scene) => {
			if (Object.hasOwn(scene, 'root'))
				throw new Error(`Scene ${scene.id} must reference a part, not duplicate its tree`);
			const part = parts.get(scene.partRef);
			if (!part) throw new Error(`Scene ${scene.id} references missing part ${scene.partRef}`);
			const root = structuredClone(part.root),
				nodes = new Map(),
				queue = [root];
			for (let offset = 0; offset < queue.length; offset++) {
				const node = queue[offset];
				if (!node || typeof node.id !== 'string' || nodes.has(node.id))
					throw new Error('Part tree needs unique node IDs');
				nodes.set(node.id, node);
				if (node.children !== undefined && !Array.isArray(node.children))
					throw new Error('Part children must be an array');
				queue.push(...(node.children ?? []));
			}
			if (!Array.isArray(scene.changes)) throw new Error(`Scene ${scene.id}.changes must be an array`);
			const changed = new Set();
			for (const change of scene.changes) {
				if (!change || Object.keys(change).some((key) => !['nodeRef', 'set'].includes(key)))
					throw new Error('Unsupported scene change');
				const node = nodes.get(change.nodeRef);
				if (!node || changed.has(change.nodeRef))
					throw new Error(`Missing or repeated changed node ${change.nodeRef}`);
				if (!change.set || typeof change.set !== 'object' || Array.isArray(change.set))
					throw new Error('Scene change set must be an object');
				if (
					['id', 'children', '__proto__', 'constructor', 'prototype'].some((key) =>
						Object.hasOwn(change.set, key),
					)
				)
					throw new Error('Scene variation cannot change identity or tree structure; author another part');
				Object.assign(node, structuredClone(change.set));
				changed.add(change.nodeRef);
			}
			const {partRef, changes, ...metadata} = scene;
			return {...metadata, root};
		});
		return {...spec, scenes};
	},

	/** Call this method once to migrate a saved expanded composition into native parts.
	 * @param {object} source - Explicitly selected saved UI/component schema 0.3.
	 * @returns {object} - Canonical schema 0.4; UX binding must be reconciled separately.
	 */
	importLegacy(source) {
		if (source?.schemaVersion !== '0.3') throw new Error('Composition import requires schema 0.3');
		const spec = structuredClone(source),
			byTree = new Map();
		spec.schemaVersion = '0.4';
		spec.parts = [];
		spec.scenes = spec.scenes.map(({root, ...scene}) => {
			const material = JSON.stringify(root);
			if (!byTree.has(material)) {
				const id = `${scene.id}-base`;
				byTree.set(material, id);
				spec.parts.push({id, root});
			}
			return {...scene, partRef: byTree.get(material), changes: []};
		});
		return spec;
	},
};
