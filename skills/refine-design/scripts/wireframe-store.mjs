import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {renderPreview, validatePreview} from './wireframe-preview.mjs';
import {dialogPart, editPart, wireframeCapabilities, wireframeDigest, wireframePacket} from './wireframe-contract.mjs';

/** Experiment-only progressive contributions and immutable preview revisions. */
export class WireframeStore {
	constructor({workspace, context, event = () => {}, preview = null}) {
		this.workspace = workspace;
		this.context = context;
		this.event = event;
		assert(preview === null || typeof preview === 'function', 'Preview callback must be a function');
		this.preview = preview;
		this.directory = path.join(workspace, 'outputs');
		fs.mkdirSync(this.directory, {recursive: true});
		this.scope = null;
		this.ready = new Map();
		this.previews = new Map();
		const scopePath = path.join(this.directory, 'scope.json');
		if (fs.existsSync(scopePath)) this.scope = JSON.parse(fs.readFileSync(scopePath));
	}
	_name(value) {
		assert(typeof value === 'string' && /^[a-z][a-z0-9-]{0,90}$/.test(value), 'Use a stable lowercase element ID');
		return value;
	}
	_write(location, value) {
		fs.mkdirSync(path.dirname(location), {recursive: true});
		const temporary = location + '.pending';
		fs.writeFileSync(temporary, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
		fs.renameSync(temporary, location);
	}
	_latest(elementId, stage) {
		const location = path.join(this.directory, this._name(elementId), stage + '-latest.json');
		return fs.existsSync(location) ? JSON.parse(fs.readFileSync(location)) : null;
	}
	/** Read a saved draft for targeted continuation, without exposing internal maps. */
	latest(elementId, stage) {
		return this._latest(elementId, stage);
	}
	/** Source facts and common acceptance criteria for an assigned element. */
	packet(elementId) {
		const element = this.scope?.elements.find((item) => item.id === elementId);
		assert(element, 'Unknown element');
		return wireframePacket(this.context, element);
	}
	_binding(elementId, stage, revision) {
		return {
			artifact: wireframeDigest(this._revision(elementId, stage, revision)),
			source: this.packet(elementId).sha256,
			contract: wireframeDigest(wireframeCapabilities),
			renderer: createHash('sha256')
				.update(fs.readFileSync(new URL('./wireframe-preview.mjs', import.meta.url)))
				.digest('hex'),
		};
	}
	/** Acceptance is bound to the latest submitted revision and current inputs. */
	accepted(elementId, stage, revision, current = true) {
		const directory = path.join(this.directory, this._name(elementId));
		const readyPath = path.join(directory, stage + '-ready.json');
		const role = stage === 'wireframe' ? 'wireframe-review' : 'visual-review';
		const reviewPath = path.join(directory, role + '-r' + revision + '.json');
		if (!fs.existsSync(readyPath) || !fs.existsSync(reviewPath)) return false;
		const ready = JSON.parse(fs.readFileSync(readyPath));
		const review = JSON.parse(fs.readFileSync(reviewPath));
		if (
			stage === 'ui' &&
			!this.accepted(elementId, 'wireframe', this._revision(elementId, stage, revision).sourceWireframeRevision)
		)
			return false;
		return (
			(!current || ready.revision === revision) &&
			review.verdict === 'pass' &&
			JSON.stringify(review.binding) === JSON.stringify(this._binding(elementId, stage, revision))
		);
	}
	/** Only inspected, mechanically valid exact previews may enter independent review. */
	submit(input, owner) {
		const stage = owner.scope.role;
		assert(['wireframe', 'ui'].includes(stage), 'Author role required');
		if (owner.scope.elementId) assert(owner.scope.elementId === input.elementId, 'Element outside assignment');
		const elementId = this._name(input.elementId);
		const document = this._latest(elementId, stage);
		assert(
			document?.revision === input.revision && input.inspected === true,
			'Inspect and submit the latest exact preview revision',
		);
		const directory = path.join(this.directory, elementId);
		const preview = JSON.parse(fs.readFileSync(path.join(directory, stage + '-preview.json')));
		assert(preview.revision === input.revision && preview.previewReady, 'A valid draft preview is required');
		if (this.preview)
			assert(preview.screenshot, 'Screenshot inspection is unavailable; repair capture before submission');
		const result = {
			...preview,
			ready: true,
			submittedAt: new Date().toISOString(),
			binding: this._binding(elementId, stage, input.revision),
		};
		this.ready.set(stage + ':' + elementId, result);
		this._write(path.join(directory, stage + '-ready.json'), result);
		this.event({type: 'submitted', ...result});
		return result;
	}
	_revision(elementId, stage, revision) {
		assert(Number.isSafeInteger(revision) && revision > 0, 'An exact positive artifact revision is required');
		const location = path.join(this.directory, this._name(elementId), stage + '-r' + revision + '.json');
		assert(fs.existsSync(location), 'Assigned artifact revision is missing');
		return JSON.parse(fs.readFileSync(location));
	}
	/** Decide queued or resumed work from saved ready revisions, independently of element completion flags. */
	uiDispatchDecision(receipt) {
		const directory = path.join(this.directory, this._name(receipt.elementId));
		const latestReady = JSON.parse(fs.readFileSync(path.join(directory, 'wireframe-ready.json')));
		if (receipt.revision !== latestReady.revision)
			return {needed: false, reason: 'superseded', wireframeRevision: latestReady.revision};
		if (!this.accepted(receipt.elementId, 'wireframe', receipt.revision))
			return {needed: false, reason: 'awaiting-wireframe-review', wireframeRevision: receipt.revision};
		const uiReadyPath = path.join(directory, 'ui-ready.json');
		const sourceWireframeRevision = fs.existsSync(uiReadyPath)
			? this._revision(receipt.elementId, 'ui', JSON.parse(fs.readFileSync(uiReadyPath)).revision)
					.sourceWireframeRevision
			: null;
		return {
			needed: sourceWireframeRevision !== receipt.revision,
			reason: sourceWireframeRevision === receipt.revision ? 'complete' : 'pending',
			wireframeRevision: receipt.revision,
			sourceWireframeRevision,
		};
	}
	_references() {
		const references = {};
		for (const item of this.scope?.elements ?? []) {
			const directory = path.join(this.directory, item.id);
			if (!fs.existsSync(directory)) continue;
			for (const name of fs.readdirSync(directory).filter((name) => /^wireframe-r\d+\.json$/.test(name))) {
				const document = JSON.parse(fs.readFileSync(path.join(directory, name)));
				references[document.elementId + '@' + document.revision] = document;
			}
		}
		return references;
	}
	_upsert(existing, incoming) {
		const items = new Map((existing ?? []).map((item) => [item.id, item]));
		for (const item of incoming ?? []) {
			assert(item && typeof item.id === 'string', 'Parts/scenes need IDs');
			items.set(item.id, structuredClone(item));
		}
		return [...items.values()];
	}
	/** Validate source references, then retain the author's complete affected-set inventory. */
	setScope(input, owner) {
		assert(owner.scope.role === 'wireframe', 'Only the wireframe author selects boundaries');
		assert(Array.isArray(input.elements) && input.elements.length > 0, 'Scope needs coherent elements');
		const ids = new Set();
		const flowIds = new Set(this.context.flows.map((item) => item.id));
		for (const element of input.elements) {
			this._name(element.id);
			assert(!ids.has(element.id), 'Duplicate element');
			ids.add(element.id);
			assert(['update', 'reuse'].includes(element.disposition), 'Element disposition must be update or reuse');
			assert(element.changeReason && element.sourceFlowRefs?.length, 'Explain changed use-case reach');
			for (const reference of element.sourceFlowRefs)
				assert(flowIds.has(reference), 'Use a supplied changed flow ID');
			assert(element.requiredStates?.length, 'Record intended state coverage before design');
		}
		for (const element of input.elements)
			for (const dependency of element.dependencies ?? [])
				assert(ids.has(dependency), 'Unknown element dependency');
		this.scope = structuredClone(input);
		this._write(path.join(this.directory, 'scope.json'), input);
		this.event({type: 'scope-ready', elements: input.elements.map(({id, disposition}) => ({id, disposition}))});
		return {saved: true, elements: input.elements.map(({id, disposition}) => ({id, disposition}))};
	}
	/** Save only new decisions. A finish renders the mechanically assembled artifact. */
	contribute(input, owner) {
		const role = owner.scope.role;
		assert(['wireframe', 'ui'].includes(role), 'Only authors contribute previews');
		const elementId = this._name(input.elementId);
		if (owner.scope.elementId) assert(owner.scope.elementId === elementId, 'Element is outside assignment');
		const element = this.scope?.elements.find((item) => item.id === elementId);
		assert(element?.disposition === 'update', 'Element must be selected for update');
		const previous = this._latest(elementId, role);
		if (input.baseRevision !== undefined)
			assert(input.baseRevision === previous?.revision, 'Stale contribution revision');
		const wireframe = role === 'ui' ? this._revision(elementId, 'wireframe', owner.scope.wireframeRevision) : null;
		if (role === 'ui')
			assert(
				this.accepted(
					elementId,
					'wireframe',
					wireframe.revision,
					previous?.sourceWireframeRevision !== wireframe.revision,
				),
				'UI requires an independently reviewed wireframe; new assignments must use its current revision',
			);
		const base =
			role === 'ui' && previous && previous.sourceWireframeRevision !== wireframe.revision
				? {...wireframe, ui: previous.ui}
				: (previous ?? wireframe);
		const document = structuredClone(
			base ?? {
				schemaVersion: 'wireframe-ui-pilot-1',
				elementId,
				revision: 0,
				sourceFlowRefs: element.sourceFlowRefs,
				sourceActionRefs: element.sourceActionRefs ?? [],
				parts: [],
				scenes: [],
			},
		);
		document.sourceActionRefs = [
			...new Set([...document.sourceActionRefs, ...this.packet(elementId).actions.map((item) => item.id)]),
		];
		if (role === 'ui') {
			document.ui ??= {};
			document.sourceWireframeRevision = wireframe.revision;
		}
		for (const [key, value] of Object.entries(input.set ?? {})) {
			assert(
				!['elementId', 'revision', 'schemaVersion', 'parts', 'scenes', 'sourceWireframeRevision'].includes(key),
				'Use structured contribution fields',
			);
			if (key === 'ui') {
				assert(role === 'ui', 'Wireframe author cannot author visual treatment');
				document.ui = {...document.ui, ...value, theme: {...document.ui?.theme, ...value.theme}};
			} else document[key] = value;
		}
		const partsOwner = role === 'ui' ? document.ui : document;
		if (input.dialog) input = {...input, parts: [...(input.parts ?? []), dialogPart(input.dialog)]};
		if (input.parts) partsOwner.parts = this._upsert(partsOwner.parts, input.parts);
		if (input.partChanges) {
			const existing = role === 'ui' ? this._upsert(document.parts, document.ui.parts) : document.parts;
			const edited = editPart(existing, input.partChanges);
			partsOwner.parts =
				role === 'ui'
					? this._upsert(
							document.ui.parts,
							edited.filter((part) => input.partChanges.some((change) => change.partRef === part.id)),
						)
					: edited;
		}
		if (input.scenes) document.scenes = this._upsert(document.scenes, input.scenes);
		for (const change of input.nodeChanges ?? []) {
			assert(change.sceneRef && change.nodeRef && change.set, 'Node changes require sceneRef, nodeRef, set');
			let scene;
			if (role === 'ui') {
				document.ui.sceneChanges ??= [];
				scene = document.ui.sceneChanges.find((item) => item.sceneRef === change.sceneRef);
				if (!scene) {
					scene = {sceneRef: change.sceneRef, changes: []};
					document.ui.sceneChanges.push(scene);
				}
			} else scene = document.scenes.find((item) => item.id === change.sceneRef);
			assert(scene, 'Unknown scene for node change');
			scene.changes ??= [];
			const existing = scene.changes.find((item) => item.nodeRef === change.nodeRef);
			if (existing) existing.set = {...existing.set, ...change.set};
			else scene.changes.push({nodeRef: change.nodeRef, set: change.set});
		}
		document.revision = (previous?.revision ?? 0) + 1;
		const directory = path.join(this.directory, elementId);
		const artifactPath = path.join(directory, role + '-r' + document.revision + '.json');
		this._write(artifactPath, document);
		this._write(path.join(directory, role + '-latest.json'), document);
		const result = {
			elementId,
			stage: role,
			revision: document.revision,
			path: artifactPath,
			ready: false,
			errors: [],
		};
		if (input.finish) {
			const started = performance.now();
			const options = {mode: role, references: this._references()};
			const validation = validatePreview(document, options);
			const sceneIds = new Set(document.scenes.map((item) => item.id));
			for (const state of element.requiredStates)
				if (!sceneIds.has(typeof state === 'string' ? state : state.id))
					validation.errors.push('Missing required scene: ' + (state.id ?? state));
			if (validation.errors.length === 0) {
				const rendered = renderPreview(document, options);
				result.coverage = rendered.coverage;
				result.unrepresentedActions = (element.sourceActionRefs ?? []).filter(
					(id) => !rendered.coverage.some((item) => item.actionRef === id),
				);
				result.previewPath = path.join(directory, role + '-r' + document.revision + '.html');
				this._write(result.previewPath, rendered.html);
				result.previewReady = true;
				result.sha256 = createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex');
			} else result.errors = validation.errors;
			result.renderMs = performance.now() - started;
		}
		this.event({
			type: result.previewReady ? 'draft-preview' : 'contribution',
			...result,
			inputBytes: Buffer.byteLength(JSON.stringify(input)),
			partCount: document.parts.length,
			sceneCount: document.scenes.length,
		});
		if (result.previewReady) {
			this.previews.set(role + ':' + elementId, result);
			this._write(path.join(directory, role + '-preview.json'), result);
		}
		return result;
	}
	/** Save exact-version independent findings without inventing canonical approval. */
	review(input, owner) {
		assert(['wireframe-review', 'visual-review'].includes(owner.scope.role), 'Review role required');
		assert(
			['pass', 'revise'].includes(input.verdict) && Array.isArray(input.findings),
			'Review needs verdict and findings',
		);
		assert(
			input.elementId === owner.scope.elementId && input.revision === owner.scope.revision,
			'Review must bind assigned exact artifact',
		);
		const stage = owner.scope.role === 'wireframe-review' ? 'wireframe' : 'ui';
		if (stage === 'ui')
			assert(
				this.accepted(
					input.elementId,
					'wireframe',
					this._revision(input.elementId, stage, input.revision).sourceWireframeRevision,
				),
				'UI review requires current accepted wireframe binding',
			);
		const submitted = JSON.parse(
			fs.readFileSync(path.join(this.directory, this._name(input.elementId), stage + '-ready.json')),
		);
		assert(submitted.revision === input.revision, 'Review the current submitted revision');
		assert(
			JSON.stringify(submitted.binding) === JSON.stringify(this._binding(input.elementId, stage, input.revision)),
			'Review source binding changed',
		);
		assert(
			input.verdict !== 'pass' || input.findings.every((finding) => finding.blocking === false),
			'Pass cannot retain unresolved blocking findings',
		);
		const binding = this._binding(input.elementId, stage, input.revision);
		const location = path.join(
			this.directory,
			this._name(input.elementId),
			owner.scope.role + '-r' + input.revision + '.json',
		);
		this._write(location, {
			...input,
			binding,
			role: owner.scope.role,
			at: new Date().toISOString(),
			sourceUxApproval: 'unreviewed',
		});
		this.event({type: 'review-ready', role: owner.scope.role, ...input, path: location});
		return {saved: true, path: location, verdict: input.verdict, findings: input.findings.length};
	}
	/** Registry consumed by the existing authenticated MCP WorkflowService. */
	operations() {
		const operation = (description, execute) => ({
			description,
			assignable: true,
			writes: true,
			inlineResult: true,
			inputSchema: {type: 'object'},
			execute,
		});
		return {
			'result.store': operation('Save a scoped reusable result.', () => {
				throw new Error('Use workflow_store');
			}),
			'pilot.scope': operation(
				'Save changed-interface boundaries once; elements need id, disposition, sourceFlowRefs, changeReason, requiredStates and optional dependencies.',
				(input, owner) => this.setScope(input, owner),
			),
			'pilot.submit': operation(
				'After inspecting the saved screenshot, submit {elementId,revision,inspected:true} for independent review. This does not approve UI dispatch.',
				(input, owner) => this.submit(input, owner),
			),
			'pilot.mark': operation(
				'Record input {phase,elementId?}. phase is required: inputs-ready, boundaries-start, wireframe-start, ui-start, research-start, research-end, review-start or finished.',
				(input, owner) => {
					assert(
						typeof input.phase === 'string' && input.phase.length > 0,
						'pilot.mark requires input.phase',
					);
					this.event({...input, type: 'phase', role: owner.scope.role});
					return {recorded: true};
				},
			),
			'pilot.contribute': operation(
				'Save elementId and set/parts/scenes/nodeChanges/partChanges/dialog. finish:true renders a draft for inspection; submit separately after inspection. No combined final JSON needed.',
				async (input, owner) => {
					const result = this.contribute(input, owner);
					if (result.previewReady && this.preview) {
						try {
							result.screenshot = await this.preview(result);
							assert(
								typeof result.screenshot === 'string' && result.screenshot.length > 0,
								result.screenshotError ?? 'Preview capture returned no screenshot path',
							);
							delete result.screenshotError;
						} catch (error) {
							result.screenshot = null;
							result.screenshotError = error.message;
							this.event({
								type: 'preview-capture-failed',
								stage: result.stage,
								elementId: result.elementId,
								revision: result.revision,
								error: error.message,
							});
						}
						// A later contribution may finish while this capture is pending.
						const latest = this.previews.get(result.stage + ':' + result.elementId);
						if (latest?.revision === result.revision)
							this._write(
								path.join(this.directory, result.elementId, result.stage + '-preview.json'),
								result,
							);
					}
					return result;
				},
			),
			'pilot.review': operation(
				'Save exact elementId/revision, verdict pass|revise and actionable findings after inspecting structured and rendered artifacts.',
				(input, owner) => this.review(input, owner),
			),
		};
	}
}
