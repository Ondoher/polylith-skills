import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {WireframeStore} from '../../../../skills/refine-design/scripts/wireframe-store.mjs';

const digest = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** The pilot owns checklist records; the ordinary wireframe store is unchanged. */
export class PilotStore extends WireframeStore {
	constructor(options) {
		super(options);
		this.selfAudit = options.selfAudit ?? false;
	}
	_file(elementId, stage, suffix) {
		return path.join(this.directory, this._name(elementId), `${stage}-${suffix}.json`);
	}
	_author(owner, elementId) {
		this._requireUpdate(elementId);
		assert(['wireframe', 'ui'].includes(owner.scope.role), 'Author role required');
		if (owner.scope.elementId) assert(owner.scope.elementId === elementId, 'Element outside assignment');
		return owner.scope.role;
	}
	_inventory(elementId) {
		const packet = this.packet(elementId);
		const required = new Set(packet.element.sourceActionRefs ?? []);
		return [
			...packet.actions.flatMap((action, index) =>
				required.has(action.id)
					? [{ref: `action:${action.id}`, sourcePath: `/actions/${index}`, name: action.name}]
					: [],
			),
			...(packet.element.requiredStates ?? []).map((state, index) => ({
				ref: `state:${typeof state === 'string' ? state : state.id}`,
				sourcePath: `/element/requiredStates/${index}`,
			})),
			...packet.flows.map((flow, index) => ({
				ref: `outcome:${flow.id}`,
				sourcePath: `/flows/${index}/outcome`,
				name: flow.name,
			})),
			...packet.interactionFrames.map((frame, index) => ({
				ref: `frame:${frame.id}`,
				sourcePath: `/interactionFrames/${index}`,
				name: frame.name,
			})),
		];
	}
	_checklist(elementId, stage) {
		const file = this._file(elementId, stage, 'checklist');
		return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : null;
	}
	/** Read the required-source inventory or save short, stable assertions. */
	requirements(input, owner) {
		const stage = this._author(owner, input.elementId);
		const inventory = this._inventory(input.elementId);
		const current = this._checklist(input.elementId, stage);
		if (input.items === undefined)
			return {inventory, ...(current ?? {elementId: input.elementId, stage, items: []})};
		assert(Array.isArray(input.items), 'items must be an array');
		const allowed = new Set(inventory.map((entry) => entry.ref));
		const items = [...(current?.items ?? [])];
		for (const item of input.items) {
			assert(
				item && typeof item.id === 'string' && /^[a-z][a-z0-9-]{0,90}$/.test(item.id),
				'Stable requirement ID required',
			);
			assert(typeof item.assertion === 'string' && item.assertion.trim(), 'Observable assertion required');
			assert(
				Array.isArray(item.sourceRefs) &&
					item.sourceRefs.length &&
					item.sourceRefs.every((ref) => allowed.has(ref)),
				'Known source refs required',
			);
			const old = items.find((entry) => entry.id === item.id);
			if (old) {
				assert(
					old.assertion === item.assertion &&
						JSON.stringify(old.sourceRefs) === JSON.stringify(item.sourceRefs),
					'Existing requirement meaning cannot change',
				);
				continue;
			}
			items.push({
				id: item.id,
				assertion: item.assertion,
				sourceRefs: item.sourceRefs,
				status: 'planned',
				addedAt: new Date().toISOString(),
			});
		}
		const next = {elementId: input.elementId, stage, sourceSha256: this.packet(input.elementId).sha256, items};
		this._write(this._file(input.elementId, stage, 'checklist'), next);
		this.event({
			type: 'requirements-saved',
			elementId: input.elementId,
			stage,
			count: items.length,
			added: items.length - (current?.items.length ?? 0),
		});
		return {inventory, ...next};
	}
	/** Coverage claims travel with the progressive contribution. */
	contribute(input, owner) {
		if (!this.selfAudit || !input.claims?.length) return super.contribute(input, owner);
		const stage = this._author(owner, input.elementId);
		const checklist = this._checklist(input.elementId, stage);
		assert(checklist, 'Save requirements before claiming coverage');
		assert(
			Array.isArray(input.claims) &&
				input.claims.every((claim) => checklist.items.some((item) => item.id === claim.id)),
			'Unknown requirement claim',
		);
		const {claims, ...contribution} = input;
		const result = super.contribute(contribution, owner);
		for (const claim of claims) {
			const item = checklist.items.find((entry) => entry.id === claim.id);
			item.status = 'claimed';
			item.claim = {revision: result.revision, sceneRefs: claim.sceneRefs ?? [], nodeRefs: claim.nodeRefs ?? []};
		}
		this._write(this._file(input.elementId, stage, 'checklist'), checklist);
		this.event({
			type: 'requirements-claimed',
			elementId: input.elementId,
			stage,
			revision: result.revision,
			count: claims.length,
		});
		return result;
	}
	/** A full inspection binds all checks to one current rendered revision. */
	audit(input, owner) {
		const stage = this._author(owner, input.elementId);
		const checklist = this._checklist(input.elementId, stage);
		assert(checklist?.items.length, 'No saved requirements');
		if (input.checks === undefined) return {inventory: this._inventory(input.elementId), ...checklist};
		assert(
			Array.isArray(input.checks) && Number.isSafeInteger(input.revision),
			'Exact revision and checks required',
		);
		const document = this._revision(input.elementId, stage, input.revision);
		assert(this.latest(input.elementId, stage)?.revision === input.revision, 'Audit latest revision');
		const preview = JSON.parse(fs.readFileSync(this._file(input.elementId, stage, 'preview')));
		assert(
			preview.previewReady && preview.revision === input.revision && preview.screenshot,
			'Rendered capture required',
		);
		const byId = new Map();
		for (const check of input.checks) {
			assert(
				check && checklist.items.some((item) => item.id === check.id) && !byId.has(check.id),
				'Unknown or duplicate check',
			);
			assert(['verified', 'needs-repair'].includes(check.status), 'Check needs verified or needs-repair');
			assert(
				check.status !== 'needs-repair' || (typeof check.reason === 'string' && check.reason.trim()),
				'Repair reason required',
			);
			byId.set(check.id, check);
		}
		const scenes = new Set(document.scenes.map((scene) => scene.id));
		const nodes = new Set();
		const visit = (node) => {
			if (!node) return;
			if (node.id) nodes.add(node.id);
			for (const child of node.children ?? []) visit(child);
		};
		for (const part of [...document.parts, ...(document.ui?.parts ?? [])]) visit(part.root);
		const unresolved = [];
		for (const item of checklist.items) {
			const check = byId.get(item.id);
			if (!check) {
				unresolved.push({id: item.id, reason: 'Not checked'});
				continue;
			}
			if (check.status === 'needs-repair') unresolved.push({id: item.id, reason: check.reason});
			else if (!(check.sceneRefs?.length && check.sceneRefs.every((ref) => scenes.has(ref))))
				unresolved.push({id: item.id, reason: 'Existing scene evidence required'});
			else if (check.nodeRefs?.some((ref) => !nodes.has(ref)))
				unresolved.push({id: item.id, reason: 'Referenced evidence node does not exist'});
			item.status = check.status;
			item.verification = {
				revision: input.revision,
				sceneRefs: check.sceneRefs ?? [],
				nodeRefs: check.nodeRefs ?? [],
				reason: check.reason ?? null,
			};
		}
		const covered = new Set(checklist.items.flatMap((item) => item.sourceRefs));
		for (const entry of this._inventory(input.elementId))
			if (!covered.has(entry.ref))
				unresolved.push({id: entry.ref, reason: 'Required source ref absent from checklist'});
		const receipt = {
			elementId: input.elementId,
			stage,
			revision: input.revision,
			binding: this._binding(input.elementId, stage, input.revision),
			status: unresolved.length ? 'needs-repair' : 'clean',
			unresolved,
			checked: input.checks.length,
			at: new Date().toISOString(),
		};
		this._write(this._file(input.elementId, stage, 'checklist'), checklist);
		this._write(this._file(input.elementId, stage, 'audit'), receipt);
		this.event({type: 'audit-saved', ...receipt});
		return receipt;
	}
	/** This does not submit or approve a draft. */
	freeze(elementId, stage) {
		this._requireUpdate(elementId);
		const preview = JSON.parse(fs.readFileSync(this._file(elementId, stage, 'preview')));
		assert(
			preview.previewReady && preview.screenshot && this.latest(elementId, stage)?.revision === preview.revision,
			'Freeze latest captured draft',
		);
		const pages = preview.screenshotPages ?? [{path: preview.screenshot}];
		const frozen = {
			elementId,
			stage,
			revision: preview.revision,
			binding: this._binding(elementId, stage, preview.revision),
			artifactPath: preview.path,
			screenshotPages: pages,
			screenshotHashes: pages.map((page) => digest(page.path)),
			at: new Date().toISOString(),
		};
		this._write(this._file(elementId, stage, 'frozen'), frozen);
		this.event({type: 'first-draft-frozen', elementId, stage, revision: frozen.revision});
		return frozen;
	}
	/** Diagnostic receipts cannot satisfy the ordinary UI acceptance gate. */
	diagnostic(input, owner) {
		this._requireUpdate(input.elementId);
		assert(['wireframe-review', 'visual-review'].includes(owner.scope.role), 'Reviewer role required');
		assert(
			owner.scope.elementId === input.elementId && owner.scope.revision === input.revision,
			'Assigned frozen revision required',
		);
		assert(
			['pass', 'revise'].includes(input.verdict) && Array.isArray(input.findings),
			'Verdict and findings required',
		);
		assert(
			input.verdict !== 'pass' || input.findings.every((finding) => finding.blocking === false),
			'Pass cannot retain blocking findings',
		);
		const stage = owner.scope.role === 'wireframe-review' ? 'wireframe' : 'ui';
		const frozen = JSON.parse(fs.readFileSync(this._file(input.elementId, stage, 'frozen')));
		assert(
			frozen.revision === input.revision &&
				JSON.stringify(frozen.binding) ===
					JSON.stringify(this._binding(input.elementId, stage, input.revision)),
			'Frozen binding changed',
		);
		assert(
			frozen.screenshotPages.every((page, index) => digest(page.path) === frozen.screenshotHashes[index]),
			'Frozen capture changed',
		);
		const receipt = {
			...input,
			role: owner.scope.role,
			binding: frozen.binding,
			diagnostic: true,
			at: new Date().toISOString(),
		};
		const location = this._file(input.elementId, stage, `diagnostic-r${input.revision}`);
		this._write(location, receipt);
		this.event({type: 'diagnostic-review-ready', ...receipt, path: location});
		return {saved: true, path: location, verdict: receipt.verdict, findings: receipt.findings.length};
	}
	submit(input, owner) {
		if (this.selfAudit) {
			const stage = this._author(owner, input.elementId);
			const file = this._file(input.elementId, stage, 'audit');
			assert(fs.existsSync(file), 'Clean final audit required');
			const audit = JSON.parse(fs.readFileSync(file));
			assert(
				audit.status === 'clean' && audit.revision === input.revision,
				'Audit must cover submitted revision',
			);
			assert(
				JSON.stringify(audit.binding) === JSON.stringify(this._binding(input.elementId, stage, input.revision)),
				'Audit binding changed',
			);
		}
		return super.submit(input, owner);
	}
	operations() {
		const ops = super.operations();
		if (!this.selfAudit) return ops;
		const operation = (description, execute) => ({
			description,
			assignable: true,
			writes: true,
			inlineResult: true,
			inputSchema: {type: 'object'},
			execute,
		});
		ops['pilot.requirements'] = operation(
			'Read inventory or save {elementId,items:[{id,assertion,sourceRefs}]} before construction.',
			(input, owner) => this.requirements(input, owner),
		);
		ops['pilot.audit'] = operation(
			'Read full checklist or save {elementId,revision,checks:[{id,status,sceneRefs?,nodeRefs?,reason?}]} after inspecting.',
			(input, owner) => this.audit(input, owner),
		);
		ops['pilot.diagnostic'] = operation(
			'Save findings for frozen draft, without approving UI dispatch.',
			(input, owner) => this.diagnostic(input, owner),
		);
		ops['pilot.contribute'] = {
			...ops['pilot.contribute'],
			description:
				ops['pilot.contribute'].description +
				' Optional claims:[{id,sceneRefs?,nodeRefs?}] mark coverage in the same call.',
		};
		return ops;
	}
}
