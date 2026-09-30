import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {WorkflowService} from '../../../../scripts/mcp/WorkflowService.mjs';
import {McpHttpServer} from '../../../../scripts/mcp/McpHttpServer.mjs';
import {PilotInputs} from './prepare.mjs';
import {PilotStore} from './PilotStore.mjs';
import {NativeClient} from './native-client.mjs';

const governance = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const argument = (name, fallback) =>
	process.argv
		.find((value) => value.startsWith('--' + name + '='))
		?.split('=')
		.slice(1)
		.join('=') ?? fallback;
const attemptName = argument('attempt', 'wireframe-ui-pilot-20260930');
assert(/^[a-z0-9-]+$/.test(attemptName));
const attempt = path.join(governance, '.codex-tmp', attemptName);
const workspace = path.join(attempt, 'workspace');
const execute = process.argv.includes('--execute');
const reviewOnly = process.argv.includes('--review');
const resume = process.argv.includes('--resume');
const runId = 'wireframe-ui-pilot';
const started = performance.now();
fs.mkdirSync(workspace, {recursive: true});
const eventsPath = path.join(attempt, 'events.jsonl');
const event = (value) => {
	const recorded = {at: new Date().toISOString(), monotonicMs: performance.now(), ...value};
	fs.appendFileSync(eventsPath, JSON.stringify(recorded) + '\n');
	if (
		['scope-ready', 'preview-ready', 'review-ready', 'native.started', 'native.completed', 'error'].includes(
			value.type,
		)
	)
		console.log(
			JSON.stringify({
				at: recorded.at,
				type: value.type,
				role: value.role ?? value.stage,
				elementId: value.elementId,
				revision: value.revision,
				elapsedMs: value.elapsedMs,
			}),
		);
};
event({type: 'run-start', execute, reviewOnly, resume});
const manifestPath = path.join(workspace, 'source-manifest.json');
const readJson = (location) => JSON.parse(fs.readFileSync(location));
const input = fs.existsSync(manifestPath)
	? {
			manifest: readJson(manifestPath),
			context: readJson(path.join(workspace, 'inputs/context.json')),
			design: readJson(path.join(workspace, 'inputs/design.json')),
		}
	: PilotInputs.prepare(governance, workspace);
assert.deepEqual(PilotInputs.hashFiles(input.manifest.protectedPaths), input.manifest.hashes, 'Frozen inputs changed');
fs.writeFileSync(
	path.join(workspace, 'AGENTS.md'),
	'# Isolated wireframe/UI experiment\nBootstrap profile: instructions-only\nFollow the supplied bounded role assignment. Keep canonical/live product files unchanged. No Git operations or unrelated skill discovery. Use the assigned local MCP data service for reads and contributions. Use normal model connection; no redirect.\n',
);
const statePath = path.join(attempt, 'state.private.json');
const state = fs.existsSync(statePath)
	? readJson(statePath)
	: {threads: {}, completed: [], reviews: [], startedAt: new Date().toISOString(), decisions: []};
const saveState = () => fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
if (execute) {
	delete state.error;
	state.status = reviewOnly ? 'review-running' : 'authoring-running';
	saveState();
}
let onReady = () => {};
let activeUiChain = Promise.resolve();
const queueErrors = [];
const store = new PilotStore({
	workspace,
	context: input.context,
	preview: (receipt) => screenshot(receipt),
	event: (value) => {
		event(value);
		if (value.type === 'preview-ready') onReady(value);
	},
});
const service = new WorkflowService({workspace, pageBytes: 28000, operations: store.operations()});
service.open({access: service.ownerAccess, run: runId});
const token = randomBytes(32).toString('hex');
const server = new McpHttpServer(service, token);
const url = await server.listen();
// Preserve service boundary measurements without observing model requests.
for (const method of ['read', 'execute', 'store', 'catalog']) {
	const original = service[method].bind(service);
	service[method] = async (args) => {
		const begin = performance.now();
		const capability = service._capabilities.get(args.access);
		const actor = {
			role: capability?.scope?.role ?? 'coordinator',
			elementId: args.input?.elementId ?? capability?.scope?.elementId,
		};
		try {
			const value = await original(args);
			event({
				type: 'service',
				...actor,
				method,
				operation: args.operation,
				handle: args.handle,
				pointer: args.pointer,
				offset: args.offset,
				inputBytes: Buffer.byteLength(JSON.stringify(args.input ?? {})),
				textBytes: value.text ? Buffer.byteLength(value.text) : undefined,
				elapsedMs: performance.now() - begin,
				nextOffset: value.nextOffset,
				failed: false,
			});
			return value;
		} catch (error) {
			event({
				type: 'service',
				...actor,
				method,
				operation: args.operation,
				elapsedMs: performance.now() - begin,
				failed: true,
				error: error.message,
			});
			throw error;
		}
	};
}
const saveInput = (value) => service.store({access: service.ownerAccess, run: runId, value});
const readPlan = async (handle) => {
	const pages = [];
	let offset = 0;
	do {
		const page = await service.read({access: service.ownerAccess, handle, offset, maxBytes: 28000});
		pages.push({handle, offset, maxBytes: 28000});
		offset = page.nextOffset;
	} while (offset !== null);
	return pages;
};
const contextReceipt = await saveInput(input.context);
const designReceipt = await saveInput(input.design);
const contractText = fs.readFileSync(new URL('./render-contract.md', import.meta.url), 'utf8');
const contractReceipt = await saveInput({contract: contractText});
const sharedHandles = [contextReceipt.handle, designReceipt.handle, contractReceipt.handle];
const assign = (role, handles = [], scope = {}) =>
	service.assign({
		access: service.ownerAccess,
		run: runId,
		operations: [
			'result.store',
			'pilot.mark',
			...(role === 'wireframe'
				? ['pilot.scope', 'pilot.contribute']
				: role === 'ui'
					? ['pilot.contribute']
					: ['pilot.review']),
		],
		handles: [...sharedHandles, ...handles],
		outputDirectory: path.join(workspace, 'outputs'),
		scope: {role, ...scope},
	});
// Supply exact array pointers; agents should assess design rather than guess storage paths.
const contextPointers = (element) =>
	Object.fromEntries(
		[
			['flows', element.sourceFlowRefs],
			['actions', element.sourceActionRefs],
			['interactionFrames', element.frameRefs],
		].map(([collection, refs]) => [
			collection,
			(input.context[collection] ?? []).flatMap((record, index) =>
				refs?.includes(record.id) ? [{id: record.id, pointer: '/' + collection + '/' + index}] : [],
			),
		]),
	);
const connection = (assignment) =>
	`MCP run=${runId}; assigned access=${assignment.access}. Use workflow_execute {access,run,operation,input}; operation results include inline small receipts. Use workflow_read {access,handle,pointer?,offset,maxBytes:28000}; pointer is an optional exact JSON pointer. Follow nextOffset, never ignore truncation. Normal native MCP only. Parallelize independent reads when supported. Do not use a model redirect, regenerate already saved data, write code/HTML, or access live products.`;
const protocol = `Progressive contributions: operation pilot.contribute input {elementId,set?:{purpose,constraints,focusIntent,recoveryIntent,openQuestions,ui},parts?:[native parts],scenes?:[native scenes],nodeChanges?:[{sceneRef,nodeRef,set}],finish?:true}. Code owns envelope/revisions. Save completed parts/states as you decide them; finish:true validates and renders without a final combined response. The ready receipt includes screenshot for view_image when capture succeeds; inspect that supplied PNG. If screenshotError is returned, keep the valid HTML, report the capture limitation and continue independent work; the coordinator can retry. Do not write capture scripts or launch a browser yourself. For UI, parts replace same-ID wireframe parts only as needed; set.ui includes theme, fidelity, research and rationale. nodeChanges edits UI scenes without copying the full part. Read errors and repair affected fields. SourceFlowRefs use bare exact flow IDs. A ready result is provisional; not canonical approval. Use pilot.mark {phase,elementId?} at inputs-ready, boundaries-start, wireframe-start, ui-start, research-start/end, review-start, finished. Do not create extra marker calls per thought.`;
const client = execute
	? new NativeClient({
			governance,
			workspace,
			outputDirectory: path.join(attempt, 'clients'),
			url,
			token,
			models: ['gpt-6-sol', 'gpt-6-astra'],
			event,
		})
	: null;
const runClient = async (role, model, effort, prompt) => {
	event({type: 'dispatch', role});
	const result = await client.run({role, model, effort, prompt, threadId: state.threads[role]});
	if (result.threadId) state.threads[role] = result.threadId;
	state.clients ??= [];
	state.clients.push({role, ...result});
	saveState();
	assert.equal(result.exitCode, 0, role + ' client failed; saved artifacts retained');
	return result;
};
const screenshotCaptures = new Map();
const captureScreenshot = async (receipt) => {
	const begin = performance.now();
	const target = receipt.previewPath.replace(/\.html$/, '.png');
	if (fs.existsSync(target) && fs.statSync(target).size > 0) return {path: target};
	const document = readJson(receipt.path);
	const width = Math.max(900, ...document.scenes.map((scene) => scene.viewport.width + 100));
	const height = Math.min(
		12000,
		200 + document.scenes.reduce((total, scene) => total + scene.viewport.height + 150, 0),
	);
	const executable = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
	if (!fs.existsSync(executable)) return {path: null, error: 'Preview capture browser is unavailable: ' + executable};
	const child = spawn(
		executable,
		[
			'--headless=new',
			'--disable-gpu',
			'--no-first-run',
			'--disable-extensions',
			'--user-data-dir=' +
				path.join(attempt, 'browser', receipt.stage + '-' + receipt.elementId + '-r' + receipt.revision),
			'--screenshot=' + target,
			'--window-size=' + width + ',' + height,
			new URL('file:///' + receipt.previewPath.replaceAll('\\', '/')).href,
		],
		{stdio: 'ignore', windowsHide: true},
	);
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		child.kill();
	}, 30000);
	let exitCode;
	try {
		[exitCode] = await once(child, 'close');
	} finally {
		clearTimeout(timer);
	}
	const exists = fs.existsSync(target) && fs.statSync(target).size > 0;
	const error = exists
		? null
		: timedOut
			? 'Preview capture timed out'
			: 'Preview capture produced no PNG (exit ' + exitCode + ')';
	event({
		type: 'screenshot',
		stage: receipt.stage,
		elementId: receipt.elementId,
		elapsedMs: performance.now() - begin,
		saved: exists,
		error,
	});
	return {path: exists ? target : null, error};
};
const screenshot = async (receipt) => {
	const key = receipt.previewPath;
	if (!screenshotCaptures.has(key))
		screenshotCaptures.set(
			key,
			captureScreenshot(receipt).catch((error) => ({path: null, error: error.message})),
		);
	const result = await screenshotCaptures.get(key);
	if (!result.path) {
		screenshotCaptures.delete(key);
		receipt.screenshotError = result.error;
		event({
			type: 'screenshot-unavailable',
			stage: receipt.stage,
			elementId: receipt.elementId,
			revision: receipt.revision,
			error: result.error,
		});
	} else delete receipt.screenshotError;
	return result.path;
};
const loadReceipt = (elementId, stage) => {
	const directory = path.join(workspace, 'outputs', elementId);
	const receipt = readJson(path.join(directory, stage + '-ready.json'));
	assert(
		receipt.ready && fs.existsSync(receipt.path) && fs.existsSync(receipt.previewPath),
		'Saved ready preview required',
	);
	return receipt;
};
const doUi = async (receipt, feedback = null) => {
	const artifact = await service.store({access: service.ownerAccess, run: runId, file: receipt.path});
	const previousUi = store.latest(receipt.elementId, 'ui');
	const retainedUi = previousUi
		? await service.store({
				access: service.ownerAccess,
				run: runId,
				file: path.join(workspace, 'outputs', receipt.elementId, 'ui-r' + previousUi.revision + '.json'),
			})
		: null;
	const assignment = assign('ui', [artifact.handle, ...(retainedUi ? [retainedUi.handle] : [])], {
		elementId: receipt.elementId,
		wireframeRevision: receipt.revision,
	});
	const before = previousUi?.revision ?? 0;
	const retainedContext = retainedUi
		? `Saved UI revision ${previousUi.revision} from wireframe revision ${previousUi.sourceWireframeRevision} is available at handle ${retainedUi.handle}. Preserve its existing visual overrides. ${previousUi.sourceWireframeRevision !== receipt.revision ? 'This is a targeted update to the newer assigned wireframe; correct only affected visual decisions and retain unaffected work.' : 'Continue with targeted contributions to this saved UI.'}`
		: '';
	const picture = await screenshot(receipt);
	event({type: 'ui-dispatch', elementId: receipt.elementId, wireframeRevision: receipt.revision});
	await runClient(
		'ui',
		'gpt-6-astra',
		'ultra',
		`Continue as the same UI design author. ${connection(assignment)}\n${protocol}\nDesign ONLY ${receipt.elementId} from exact wireframe revision ${receipt.revision}. ${retainedContext} Wireframe read plan: ${JSON.stringify(await readPlan(artifact.handle))}. Wireframe screenshot: ${picture ?? 'unavailable; inspect saved HTML'}. Use view_image to inspect the actual spatial wireframe. Shared frozen UX context handle ${contextReceipt.handle}; use JSON pointers for this element's linked flows/actions if needed, and retain prior shared context. Mark ui-start and inputs-ready for this element. Apply the Alexa design language, using authoritative foundations JSON, black primary labels, and its specified resting/focus/error outlined-field label and outline colors (the colors.md equality note is stale). Design credible representative content, meaningful state differences, sizing and visual hierarchy. Reuse saved research; if genuinely missing, do bounded official-source research and record URLs, observations, limitations, then research-end. Do not invent behavior. ${feedback ? 'Address these exact review findings by targeted contributions: ' + JSON.stringify(feedback) : ''}\nSave progressive contributions and finish all required scenes. End after a ready receipt; no independent review or implementation.`,
	);
	const ready = store.ready.get('ui:' + receipt.elementId);
	assert(ready && ready.revision > before, 'UI author ended without a ready new preview for ' + receipt.elementId);
	ready.screenshot = await screenshot(ready);
	state.completed = [...new Set([...state.completed, receipt.elementId])];
	saveState();
};
try {
	if (execute && !reviewOnly) {
		delete state.error;
		const uiAssignment = assign('ui');
		activeUiChain =
			resume && state.threads.ui
				? Promise.resolve()
				: runClient(
						'ui',
						'gpt-6-astra',
						'ultra',
						`You are the UI design specialist for a bounded provisional wireframe-to-UI experiment. This is not canonical publication. ${connection(uiAssignment)}\n${protocol}\nRead this complete renderer contract once: ${contractText}\nRead the frozen design language/research from these pages: ${JSON.stringify(await readPlan(designReceipt.handle))}. Prepare shared UI context, mark inputs-ready and then finish with a short ready acknowledgment. Do not poll, invent an element, or design yet. This same thread will receive one completed wireframe at a time. Research and concrete component design remain your job; wireframe owns usage/spatial structure.`,
					).catch((error) => {
						queueErrors.push(error);
						event({type: 'error', role: 'ui', error: error.message});
					});
		onReady = (receipt) => {
			if (receipt.stage === 'wireframe')
				activeUiChain = activeUiChain
					.then(() => {
						const decision = store.uiDispatchDecision(receipt);
						if (!decision.needed) {
							event({
								type: 'ui-queue-skipped',
								elementId: receipt.elementId,
								queuedWireframeRevision: receipt.revision,
								...decision,
							});
							return;
						}
						return doUi(receipt);
					})
					.catch((error) => {
						queueErrors.push(error);
						event({type: 'error', role: 'ui', elementId: receipt.elementId, error: error.message});
					});
		};
		const wireframeAssignment = assign('wireframe');
		const remaining = resume
			? (store.scope?.elements ?? [])
					.filter(
						(item) =>
							item.disposition === 'update' &&
							!fs.existsSync(path.join(workspace, 'outputs', item.id, 'wireframe-ready.json')),
					)
					.map((item) => item.id)
			: null;
		if (resume)
			for (const element of store.scope?.elements ?? []) {
				if (element.disposition === 'update' && !remaining.includes(element.id)) {
					const receipt = loadReceipt(element.id, 'wireframe');
					if (store.uiDispatchDecision(receipt).needed) onReady(receipt);
				}
			}
		if (remaining === null || remaining.length > 0 || !store.scope)
			await runClient(
				'wireframe',
				'gpt-6-sol',
				'medium',
				`You are the UX wireframe specialist in an isolated performance experiment. General-flow UX is already authored; reuse it. ${connection(wireframeAssignment)}\n${protocol}\nRenderer contract (read once):\n${contractText}\nRead saved changed-use-case context using all these independently addressable pages: ${JSON.stringify(await readPlan(contextReceipt.handle))}. This contains full relevant current flows/actions/frames plus field-level deltas; surrounding unchanged product is not new design scope. Mark inputs-ready then boundaries-start. ${resume && store.scope ? 'Keep prior boundaries; remaining elements: ' + JSON.stringify(remaining) : 'Determine coherent affected interface elements, then call pilot.scope with {elements:[{id,title,disposition:"update"|"reuse",sourceFlowRefs:[bare flow IDs],sourceActionRefs:[action IDs],frameRefs:[frame IDs],changeReason,requiredStates:[scene IDs],dependencies:[element IDs]}],coverage:[{sourceRef,elementIds,disposition,reason}]}. Cover all changed flows/actions/frames by explicit update or reasoned reuse; metadata alone is not a redraw. Timeline is one coherent component including tracks/objects/playhead; dialogs may be separate. Do not invent boundaries to inflate sample size. Include multiple genuine affected elements.'}\nThen author ALL selected update elements progressively, smallest meaningful first. Mark wireframe-start per element. Include required changed states and alternate/error flows as existing source requires. Produce real spatial wireframes, not annotated action lists. Store parts/states as complete; finish each coherent element immediately so UI can start while you design the next. The coordinator routes ready handles automatically. Do not wait for UI or rerun flow design. Use stable source refs, a named focus/return target and pending questions; preserve decisions and sources. Report uncovered dependencies explicitly. At end mark finished and return compact IDs/status only.`,
			);
		await activeUiChain;
		assert.equal(queueErrors.length, 0, queueErrors.map((error) => error.message).join('; '));
		assert(
			store.scope?.elements.length &&
				store.scope.elements
					.filter((item) => item.disposition === 'update')
					.every((item) => !store.uiDispatchDecision(loadReceipt(item.id, 'wireframe')).needed),
			'Selected affected elements remain incomplete',
		);
		state.happyPathCompletedAt = new Date().toISOString();
		saveState();
	}
	if (execute && reviewOnly) {
		assert(store.scope && state.completed.length, 'Complete happy path before review');
		state.unresolvedReviews = [];
		const unresolved = (role, elementId, revision, reason) => {
			const entry = {role, elementId, revision, reason};
			state.unresolvedReviews.push(entry);
			event({type: 'review-unresolved', ...entry});
			saveState();
		};
		for (const role of ['wireframe-review', 'visual-review']) {
			for (const element of store.scope.elements.filter((item) => item.disposition === 'update')) {
				const stage = role === 'wireframe-review' ? 'wireframe' : 'ui';
				if (stage === 'ui') {
					const currentWireframe = loadReceipt(element.id, 'wireframe');
					if (
						!state.reviews.some(
							(item) =>
								item.role === 'wireframe-review' &&
								item.elementId === element.id &&
								item.revision === currentWireframe.revision &&
								item.verdict === 'pass',
						)
					) {
						unresolved(
							role,
							element.id,
							currentWireframe.revision,
							'Awaiting exact wireframe review pass before UI update',
						);
						continue;
					}
					if (store.uiDispatchDecision(currentWireframe).needed) {
						event({
							type: 'repair-start',
							role: 'ui',
							elementId: element.id,
							reason: 'resume-wireframe-binding',
						});
						await doUi(currentWireframe, {
							wireframeChanged: true,
							reason: 'Resume from the latest saved wireframe before visual review.',
						});
						event({
							type: 'repair-end',
							role: 'ui',
							elementId: element.id,
							reason: 'resume-wireframe-binding',
						});
					}
				}
				let receipt = loadReceipt(element.id, stage);
				const reviewDirectory = path.join(workspace, 'outputs', element.id);
				const savedReviews = new Map();
				for (const name of fs
					.readdirSync(reviewDirectory)
					.filter(
						(name) => name.startsWith(role + '-r') && /^\d+\.json$/.test(name.slice(role.length + 2)),
					)) {
					const saved = readJson(path.join(reviewDirectory, name));
					assert(
						saved.role === role &&
							saved.elementId === element.id &&
							Number.isSafeInteger(saved.revision) &&
							name === role + '-r' + saved.revision + '.json' &&
							['pass', 'revise'].includes(saved.verdict) &&
							Array.isArray(saved.findings),
						'Saved review must match its exact artifact',
					);
					savedReviews.set(saved.revision, saved);
					const recorded = state.reviews.find(
						(item) =>
							item.role === role && item.elementId === element.id && item.revision === saved.revision,
					);
					if (recorded) assert.equal(recorded.verdict, saved.verdict, 'Saved review and state disagree');
					else
						state.reviews.push({
							role,
							elementId: element.id,
							revision: saved.revision,
							verdict: saved.verdict,
							recovered: true,
						});
				}
				const reviewedRevisions = new Set(
					state.reviews
						.filter((item) => item.role === role && item.elementId === element.id)
						.map((item) => item.revision),
				);
				saveState();
				if (
					state.reviews.some(
						(item) =>
							item.role === role &&
							item.elementId === element.id &&
							item.revision === receipt.revision &&
							item.verdict === 'pass',
					)
				) {
					event({
						type: 'review-reused',
						role,
						elementId: element.id,
						revision: receipt.revision,
						verdict: 'pass',
					});
					continue;
				}
				for (;;) {
					let review = savedReviews.get(receipt.revision);
					if (!review && reviewedRevisions.size >= 3) {
						unresolved(
							role,
							element.id,
							receipt.revision,
							'Three saved review revisions exhausted; current revision is not approved',
						);
						break;
					}
					if (!review && reviewedRevisions.has(receipt.revision)) {
						unresolved(
							role,
							element.id,
							receipt.revision,
							'Saved review state has no durable findings file',
						);
						break;
					}
					const artifact = await service.store({access: service.ownerAccess, run: runId, file: receipt.path});
					if (review)
						event({
							type: 'review-reused',
							role,
							elementId: element.id,
							revision: receipt.revision,
							verdict: review.verdict,
						});
					else {
						const assignment = assign(role, [artifact.handle], {
							elementId: element.id,
							revision: receipt.revision,
						});
						const picture = await screenshot(receipt);
						await runClient(
							role,
							'gpt-6-astra',
							'ultra',
							`You are an independent ${role === 'wireframe-review' ? 'UX wireframe' : 'visual component design'} reviewer for a provisional experiment, not a code-standards review. ${connection(assignment)}\nReview element ${element.id}, exact revision ${receipt.revision}. Scope: ${JSON.stringify(element)}. Read artifact pages ${JSON.stringify(await readPlan(artifact.handle))}. Inspect actual rendered screenshot using view_image: ${picture}. Shared UX context handle=${contextReceipt.handle}, design-language handle=${designReceipt.handle}; exact source pointers: ${JSON.stringify(contextPointers(element))}. Collections are arrays, not keyed objects. Retain context from prior elements. Call pilot.mark with input {phase:"review-start",elementId:"${element.id}"}. Check ${role === 'wireframe-review' ? 'changed-use-case coverage, discoverability, action/state hierarchy, focus and recovery, coherent component boundary; do not judge intentional neutral wireframe styling' : 'credible component representation, state distinctions, geometry/content treatment, visual affordances, Alexa design language and consistency with wireframe usage; do not invent new behavior'}. This uses unreviewed upstream UX and does not establish canonical approval. Submit pilot.review {elementId:"${element.id}",revision:${receipt.revision},verdict:"pass"|"revise",findings:[{id,severity,sceneRef,nodeRef,issue,remedy}],strengths:[...],limits:[...]}. Findings must be concrete and consequential. Re-review only earlier findings plus affected changes. End after saved receipt.`,
						);
						const reviewPath = path.join(
							workspace,
							'outputs',
							element.id,
							role + '-r' + receipt.revision + '.json',
						);
						review = readJson(reviewPath);
						assert(
							review.role === role &&
								review.elementId === element.id &&
								review.revision === receipt.revision &&
								['pass', 'revise'].includes(review.verdict) &&
								Array.isArray(review.findings),
							'Reviewer must save findings for the assigned artifact',
						);
						savedReviews.set(receipt.revision, review);
						state.reviews.push({
							role,
							elementId: element.id,
							revision: receipt.revision,
							round: reviewedRevisions.size,
							verdict: review.verdict,
						});
						reviewedRevisions.add(receipt.revision);
						saveState();
					}
					if (review.verdict === 'pass') break;
					if (reviewedRevisions.size >= 3) {
						unresolved(
							role,
							element.id,
							receipt.revision,
							'Three saved review revisions exhausted; remaining findings are unresolved',
						);
						break;
					}
					event({type: 'repair-start', role: stage, elementId: element.id});
					if (stage === 'ui') await doUi(loadReceipt(element.id, 'wireframe'), review.findings);
					else {
						const author = assign('wireframe', [artifact.handle], {elementId: element.id});
						await runClient(
							'wireframe',
							'gpt-6-sol',
							'medium',
							`Continue existing wireframe author context. ${connection(author)}\n${protocol}\nRepair ONLY ${element.id} after independent wireframe review: ${JSON.stringify(review.findings)}. Exact current artifact ${artifact.handle}. Preserve unaffected content, contribute only targeted edits and finish. Do not change scope or other elements.`,
						);
					}
					event({type: 'repair-end', role: stage, elementId: element.id});
					const repaired = loadReceipt(element.id, stage);
					assert(repaired.revision > receipt.revision, 'Repair must save a newer ready artifact');
					receipt = repaired;
				}
			}
		}
		state.reviewLastAttemptAt = new Date().toISOString();
		if (state.unresolvedReviews.length) delete state.reviewCompletedAt;
		else state.reviewCompletedAt = state.reviewLastAttemptAt;
		saveState();
	}
	state.status = execute
		? reviewOnly
			? state.unresolvedReviews.length
				? 'review-incomplete'
				: 'review-complete'
			: 'happy-path-complete'
		: 'prepared';
} catch (error) {
	state.status = 'error';
	state.error = error.message;
	event({type: 'error', error: error.message});
	process.exitCode = 1;
} finally {
	onReady = () => {};
	await activeUiChain;
	await server.close();
	await service.drain();
	fs.writeFileSync(
		path.join(attempt, 'service-metrics-' + Date.now() + '.json'),
		JSON.stringify({http: server.samples, operations: service.measurements}, null, 2),
	);
	state.protectedUnchanged =
		JSON.stringify(PilotInputs.hashFiles(input.manifest.protectedPaths)) === JSON.stringify(input.manifest.hashes);
	state.lastCompletedAt = new Date().toISOString();
	state.lastExecutionMs = performance.now() - started;
	saveState();
	event({
		type: 'run-end',
		status: state.status,
		elapsedMs: state.lastExecutionMs,
		protectedUnchanged: state.protectedUnchanged,
	});
	assert(state.protectedUnchanged, 'Protected source bytes changed');
}
console.log(
	JSON.stringify({
		status: state.status,
		attempt,
		completed: state.completed,
		reviews: state.reviews.length,
		error: state.error,
		protectedUnchanged: state.protectedUnchanged,
	}),
);
