import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {WireframeStore} from '../../skills/refine-design/scripts/wireframe-store.mjs';
import {wireframeCapabilities} from '../../skills/refine-design/scripts/wireframe-contract.mjs';
import {WireframeScope} from '../../skills/refine-design/scripts/WireframeScope.mjs';

/** Normal MCP adapters use the same inspected-submission and acceptance store as trials. */
export class WireframeOperations {
	static location(context) {
		return context.files.resolve(path.join(context.run.directory, 'wireframes'));
	}
	static store(context) {
		const workspace = this.location(context);
		const file = path.join(workspace, 'source.json');
		assert(fs.existsSync(file), 'Parent must prepare source-bound wireframes first');
		return new WireframeStore({workspace, context: JSON.parse(fs.readFileSync(file))});
	}
	static prepare(input, context) {
		assert(context.owner, 'Only the parent prepares source facts and boundaries');
		const selected = new WireframeScope(input.context).select(input.scope);
		const workspace = this.location(context);
		const file = path.join(workspace, 'source.json');
		fs.mkdirSync(workspace, {recursive: true});
		const bytes = JSON.stringify(input.context);
		if (fs.existsSync(file))
			assert(fs.readFileSync(file, 'utf8') === bytes, 'Source changed; open a new source-bound run');
		else fs.writeFileSync(file, bytes);
		const store = this.store(context);
		store.setScope(selected, {scope: {role: 'wireframe'}});
		return {
			prepared: true,
			capabilities: wireframeCapabilities,
			elements: store.scope.elements.map((x) => ({id: x.id, disposition: x.disposition})),
			dispatch: store.dispatchElements().map((element) => element.id),
			issues: store.scope.issues,
			binding: store.scope.binding,
			sourceUxApproval: input.context.approval ?? 'unreviewed',
		};
	}
	static access(input, context) {
		if (!context.owner) {
			assert(context.scope.elementId === input.elementId, 'Exact element assignment required');
			assert(
				['wireframe', 'ui', 'wireframe-review', 'visual-review'].includes(context.scope.role),
				'Assigned design role required',
			);
		}
	}
	static execute(name, input, context) {
		if (name === 'prepare') return this.prepare(input, context);
		this.access(input, context);
		const store = this.store(context);
		store._name(input.elementId);
		if (name === 'packet') return store.packet(input.elementId);
		if (name === 'contribute') return store.contribute(input, context);
		if (name === 'submit') return store.submit(input, context);
		if (name === 'review') return store.review(input, context);
		if (name === 'status') {
			const result = {
				elementId: input.elementId,
				disposition:
					store.scope?.elements.find((element) => element.id === input.elementId)?.disposition ??
					'unresolved',
				scopeIssue: store.scopeIssue,
				issues: store.scope?.issues.filter((issue) => issue.elementId === input.elementId) ?? [],
			};
			for (const stage of ['wireframe', 'ui']) {
				const file = path.join(store.directory, input.elementId, stage + '-ready.json');
				const ready = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : null;
				result[stage] = {
					draftRevision: store.latest(input.elementId, stage)?.revision ?? null,
					submitted: ready,
					accepted: ready ? store.accepted(input.elementId, stage, ready.revision) : false,
				};
			}
			return result;
		}
		throw new Error('Unknown wireframe operation');
	}
	/** Parent or assigned UI units cannot bypass an active wireframe handoff. */
	static requireUiAcceptance(context) {
		if (!fs.existsSync(path.join(this.location(context), 'source.json'))) return;
		const store = this.store(context);
		const ids = context.owner ? store.dispatchElements().map((x) => x.id) : context.scope.wireframeElementIds;
		assert(Array.isArray(ids) && ids.length, 'Assign wireframeElementIds for UI unit delivery');
		for (const id of ids) {
			store._requireUpdate(id);
			const file = path.join(store.directory, store._name(id), 'wireframe-ready.json');
			assert(fs.existsSync(file), 'Wireframe has not been submitted: ' + id);
			assert(
				store.accepted(id, 'wireframe', JSON.parse(fs.readFileSync(file)).revision),
				'Wireframe acceptance required: ' + id,
			);
		}
	}
}
