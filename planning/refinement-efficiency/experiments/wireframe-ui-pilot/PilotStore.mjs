import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {renderPreview, validatePreview} from './render.mjs';

/** Experiment-only progressive contributions and immutable preview revisions. */
export class PilotStore {
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
		if (input.parts) partsOwner.parts = this._upsert(partsOwner.parts, input.parts);
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
				result.previewPath = path.join(directory, role + '-r' + document.revision + '.html');
				this._write(result.previewPath, rendered.html);
				result.ready = true;
				result.sha256 = createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex');
			} else result.errors = validation.errors;
			result.renderMs = performance.now() - started;
		}
		this.event({
			type: result.ready ? 'preview-ready' : 'contribution',
			...result,
			inputBytes: Buffer.byteLength(JSON.stringify(input)),
			partCount: document.parts.length,
			sceneCount: document.scenes.length,
		});
		if (result.ready) {
			this.ready.set(role + ':' + elementId, result);
			this._write(path.join(directory, role + '-ready.json'), result);
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
		const location = path.join(
			this.directory,
			this._name(input.elementId),
			owner.scope.role + '-r' + input.revision + '.json',
		);
		this._write(location, {
			...input,
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
				'Incrementally save elementId, optional set/parts/scenes/nodeChanges; finish:true validates, renders and returns the coordinator screenshot when available. No combined final JSON needed.',
				async (input, owner) => {
					const result = this.contribute(input, owner);
					if (result.ready && this.preview) {
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
						const latest = this.ready.get(result.stage + ':' + result.elementId);
						if (latest?.revision === result.revision)
							this._write(
								path.join(this.directory, result.elementId, result.stage + '-ready.json'),
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
