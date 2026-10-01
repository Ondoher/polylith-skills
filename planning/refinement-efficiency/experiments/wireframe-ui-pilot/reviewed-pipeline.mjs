import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

/** Prepare the explicitly supplied work list; never import scope from another trial. */
export function prepareReviewedScope(store, workspace) {
	if (store.scope) return store.scope;
	const source = path.join(workspace, 'inputs/scope.json');
	assert(fs.existsSync(source), 'Supply a source-justified scope in inputs/scope.json; existing drafts are retained');
	store.setScope(JSON.parse(fs.readFileSync(source)), {scope: {role: 'wireframe'}});
	return store.scope;
}

/** Persistent role queues run independent elements while preserving review-before-UI. */
export async function runReviewedPipeline(c) {
	const {store, service, runId, state, event, saveState, workspace} = c;
	const reviewAttempts = c.reviewAttempts ?? 3;
	assert(
		Number.isInteger(reviewAttempts) && reviewAttempts > 0 && reviewAttempts <= 10,
		'Invalid review attempt budget',
	);
	const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
	const directory = (id) => path.join(workspace, 'outputs', id);
	const receipt = (id, stage) => {
		const file = path.join(directory(id), stage + '-ready.json');
		return fs.existsSync(file) ? read(file) : null;
	};
	const queues = new Map();
	const serial = (role, task) => {
		const pending = (queues.get(role) ?? Promise.resolve()).then(task);
		queues.set(
			role,
			pending.catch(() => {}),
		);
		return pending;
	};
	prepareReviewedScope(store, workspace);
	const selected = store
		.dispatchElements()
		.filter((x) => c.selected === 'all' || c.selected.split(',').includes(x.id));
	state.unresolvedReviews = store.scope.issues.map((issue) => ({
		elementId: issue.elementId,
		reason: issue.problems.join('; '),
	}));
	if (!selected.length) {
		event({
			type: 'scope-no-authoring',
			issues: state.unresolvedReviews,
			reused: store.scope.elements
				.filter((element) => element.disposition === 'reuse')
				.map((element) => element.id),
		});
		saveState();
		return;
	}
	const saveValue = (value) => service.store({access: service.ownerAccess, run: runId, value});
	const artifact = (file) => service.store({access: service.ownerAccess, run: runId, file});
	const packets = new Map();
	for (const element of selected) {
		const begin = performance.now();
		const packet = store.packet(element.id);
		const saved = await saveValue(packet);
		packets.set(element.id, saved);
		fs.writeFileSync(path.join(workspace, 'inputs', element.id + '-packet.json'), JSON.stringify(packet));
		event({
			type: 'packet-prepared',
			elementId: element.id,
			sha256: packet.sha256,
			bytes: saved.bytes,
			elapsedMs: performance.now() - begin,
			missingActionRefs: packet.missingActionRefs,
		});
	}
	const protocol = `Use pilot.contribute {elementId,set?,parts?,scenes?,nodeChanges?:[{sceneRef,nodeRef,set}],partChanges?:[{partRef,nodeRef,set}],dialog?:{id,header:[nodes],body:[nodes],footer:[nodes],gap?,padding?},finish?:true}. Save progressive changes. set contains purpose,focusIntent,recoveryIntent,openQuestions or ui metadata. Code owns all envelopes and revisions. dialog creates a shared part with content-sized header/footer and scrollable body; reference it by partRef in scenes. partChanges edits a node including children without resending its part. Scene changes use complete layout/parameters fields. finish:true returns a DRAFT screenshot, validation and coverage. Inspect every entry in the returned screenshotPages using view_image (detail original when needed); screenshot is only the first page. Independent page reads may run in parallel. Use pilot.contribute {elementId,finish:true} to refresh captures; pilot.preview is not an assigned operation. If resuming after a capture blocker, preserve the saved design and only refresh/inspect/submit it unless the rendered evidence reveals a defect. Inspect the complete set, check the source use cases with its actual controls, make targeted corrections if needed, then call pilot.submit {elementId,revision,inspected:true}. Rendering does not submit or approve anything. End after submission. If a renderer/tool defect makes submission impossible, retain the draft and end with the exact blocker for the coordinator to repair; do not wait on a user question. Do not write renderer/browser scripts or access live products. On capture failure retain the draft and report the capture issue. Mark inputs-ready, wireframe-start or ui-start, inspection-start/end and finished via pilot.mark {phase,elementId}. Do not add markers per thought.`;
	const sharedContract = `Renderer capabilities: ${JSON.stringify(c.capabilities)}\n${c.contractText}\nThe current progressive protocol below supersedes the old finish/ready wording in examples. choice-group template uses parameters {label,presentation:"listbox"|"tabs"|"select",options:[{id,label,secondary?}],selectedId?,disabled?}; use actual item options for selection. It is optional when another usable control better fits the source.`;
	const auditStage = (stage) => c.selfAudit === 'both' || (c.selfAudit === 'wireframe' && stage === 'wireframe');
	const diagnostic = async (element, stage, frozen) => {
		const role = stage === 'wireframe' ? 'wireframe-diagnostic' : 'visual-diagnostic';
		const reviewerRole = stage === 'wireframe' ? 'wireframe-review' : 'visual-review';
		const packet = packets.get(element.id);
		const saved = await artifact(frozen.artifactPath);
		const assignment = c.assign(role, [saved.handle, packet.handle], {
			role: reviewerRole,
			elementId: element.id,
			revision: frozen.revision,
		});
		event({type: 'diagnostic-start', role, elementId: element.id, revision: frozen.revision});
		await c.runClient(
			role,
			'gpt-6-astra',
			'ultra',
			`You are the independent ${stage === 'wireframe' ? 'UX wireframe' : 'visual design'} reviewer. Review the frozen FIRST DRAFT of ${element.id} revision ${frozen.revision}. ${c.connection(assignment)} Read artifact ${JSON.stringify(await c.readPlan(saved.handle))} and the same acceptance packet supplied to the author ${JSON.stringify(await c.readPlan(packet.handle))}. Inspect EVERY actual screenshot page using view_image: ${JSON.stringify(frozen.screenshotPages)}. ${sharedContract}\n${stage === 'wireframe' ? 'Check usable source-action coverage, actual item selection where required, hierarchy, states, recovery, focus intent and legible rendered layout. Neutral styling is intentional. Do not perform upstream UX redesign.' : 'Check consistency with accepted wireframe, visual representation, geometry, state distinctions and frozen design language. Record behavior or structural findings with route:"wireframe".'} Only consequential defects require revise; optional preferences use blocking:false. Save pilot.diagnostic {elementId:"${element.id}",revision:${frozen.revision},verdict:"pass"|"revise",findings:[{id,severity,sceneRef,nodeRef,issue,remedy,blocking?,route?}],strengths:[],limits:[]}. This is a DIAGNOSTIC receipt, not acceptance. Do not read or request the author's checklist or audit. End after saving the receipt.`,
		);
		const file = path.join(directory(element.id), `${stage}-diagnostic-r${frozen.revision}.json`);
		assert(fs.existsSync(file), 'Diagnostic reviewer must save its separate receipt');
		event({type: 'diagnostic-end', role, elementId: element.id, revision: frozen.revision});
		return read(file);
	};
	const author = async (element, stage, feedback = null) =>
		serial(stage, async () => {
			const begin = performance.now();
			const prior = store.latest(element.id, stage);
			const saved = prior ? await saveValue(prior) : null;
			const wf = stage === 'ui' ? receipt(element.id, 'wireframe') : null;
			if (wf)
				assert(
					store.accepted(element.id, 'wireframe', wf.revision),
					'Dispatch requires accepted current wireframe',
				);
			const wfSaved = wf ? await artifact(wf.path) : null;
			const packet = packets.get(element.id);
			const assignment = c.assign(
				stage,
				[packet.handle, ...(saved ? [saved.handle] : []), ...(wfSaved ? [wfSaved.handle] : [])],
				{elementId: element.id, ...(wf ? {wireframeRevision: wf.revision} : {})},
			);
			const first = !state.threads[stage];
			const experimental = auditStage(stage);
			const frozenPath = path.join(directory(element.id), `${stage}-frozen.json`);
			const firstDraft = experimental && !feedback && !receipt(element.id, stage) && !fs.existsSync(frozenPath);
			const resumeFrozen = experimental && !feedback && !receipt(element.id, stage) && fs.existsSync(frozenPath);
			const auditInstructions = !experimental
				? ''
				: firstDraft
					? `EXPERIMENTAL FIRST-DRAFT BARRIER OVERRIDES THE SUBMIT INSTRUCTION ABOVE. Before construction call pilot.requirements {elementId:"${element.id}"} to read the required source inventory; save short observable assertions covering every required ref. Use claims in pilot.contribute as you build when practical. After ordinary construction, render and inspect all screenshot pages and fix obvious rendering errors. Then END THIS ASSIGNMENT WITHOUT calling pilot.audit or pilot.submit. The coordinator will freeze this exact draft and resume this same thread for the full-list self-audit.`
					: `EXPERIMENTAL AUDIT OVERRIDES THE SUBMIT INSTRUCTION ABOVE. Reuse saved requirements. After any change render and inspect all screenshot pages, read the full list with pilot.audit {elementId:"${element.id}"}, cover missing source refs and check EVERY item against the latest revision in one pilot.audit {elementId,revision,checks:[{id,status:"verified"|"needs-repair",sceneRefs?,nodeRefs?,reason?}]} call. Earlier claims are not verification. Repair and repeat the complete audit after each edit, at most three self-audit repair rounds. Submit only a clean exact revision. Do not use diagnostic reviewer findings.`;
			const stageProtocol = experimental
				? protocol
						.replace(
							'then call pilot.submit {elementId,revision,inspected:true}.',
							'then follow the experimental audit/barrier instructions below.',
						)
						.replace(
							'End after submission.',
							'End at the experimental barrier or after clean audited submission.',
						)
				: protocol;
			if (wf) event({type: 'ui-dispatch', elementId: element.id, wireframeRevision: wf.revision, accepted: true});
			event({type: feedback ? 'repair-start' : 'author-start', role: stage, elementId: element.id});
			if (!resumeFrozen)
				await c.runClient(
					stage,
					stage === 'wireframe' ? 'gpt-6-sol' : 'gpt-6-astra',
					stage === 'wireframe' ? 'medium' : 'ultra',
					`You are the ${stage === 'wireframe' ? 'UX wireframe' : 'UI design'} author. Work only on ${element.id}; retain context and accepted decisions from earlier assignments. ${c.connection(assignment)}\n${first ? sharedContract : 'Reuse the renderer contract already supplied.'}\n${stageProtocol}\nSource/acceptance packet (read it on first assignment for this element or a changed source binding; otherwise reuse the unchanged facts already read, retrieving again only to resolve missing context): ${JSON.stringify(await c.readPlan(packet.handle))}. It includes existing flow steps and action contracts; do not invent behavior or replay the upstream UX stage. Bind required source actions to real controls; external interactions need a visible trigger and explicit return behavior. Missing source facts should be recorded as gaps. ${saved ? 'Continue the saved draft: ' + JSON.stringify(await c.readPlan(saved.handle)) : 'Create a fresh element from the original source facts.'}\n${wfSaved ? 'Accepted exact wireframe: ' + JSON.stringify(await c.readPlan(wfSaved.handle)) + '. Preserve its behavior. Shared design language handle is available in your assigned handles; read it once if not retained. Apply its JSON foundations and reuse its research; UI still owns visual decisions and bounded primary-source research when needed. Wireframe acceptance does not authorize behavior changes.' : 'Use neutral styling and meaningful spatial hierarchy. The dialog layout pattern is available to avoid fixed-height content collisions. Include all required states; additional states may be needed for full usage coverage.'}\n${first && stage === 'ui' ? 'Read frozen design language: ' + JSON.stringify(await c.readPlan(c.designReceipt.handle)) : ''}\n${feedback ? 'Repair these exact findings and their affected consequences, preserving unrelated data: ' + JSON.stringify(feedback) : ''}\n${auditInstructions}\nEnd with only the ${firstDraft ? 'inspected first-draft' : 'submitted'} element ID/revision, not a combined artifact.`,
				);
			if (firstDraft || resumeFrozen) {
				assert(!receipt(element.id, stage), 'First draft must remain unsubmitted');
				const frozen = resumeFrozen ? read(frozenPath) : store.freeze(element.id, stage);
				const savedDraft = await artifact(frozen.artifactPath);
				const continuation = c.assign(stage, [packet.handle, savedDraft.handle], {
					elementId: element.id,
					...(wf ? {wireframeRevision: wf.revision} : {}),
				});
				const selfAudit = c.runClient(
					stage,
					stage === 'wireframe' ? 'gpt-6-sol' : 'gpt-6-astra',
					stage === 'wireframe' ? 'medium' : 'ultra',
					`Continue as the SAME ${stage} author on ${element.id}. ${c.connection(continuation)} Frozen first draft revision ${frozen.revision}, artifact ${JSON.stringify(await c.readPlan(savedDraft.handle))}, screenshot pages ${JSON.stringify(frozen.screenshotPages)}. Independently inspect every page and use pilot.audit {elementId:"${element.id}"} to read the COMPLETE saved requirement list and source inventory. If the list is absent or incomplete, use pilot.requirements to save missing source-linked assertions before checking. Verify all items against this exact draft, including claims made during construction; add any missing source-linked requirements. Submit one full pilot.audit {elementId,revision,checks:[{id,status:"verified"|"needs-repair",sceneRefs?,nodeRefs?,reason?}]}. Repair unmet items with targeted pilot.contribute changes, render/inspect and recheck the ENTIRE list after each change, up to three repair rounds. Only pilot.submit the clean exact revision. The external diagnostic review is sealed; do not access it. If an item cannot be resolved, preserve the draft and report the blocker. End with submitted element ID/revision.`,
				);
				const diagnosticFile = path.join(directory(element.id), `${stage}-diagnostic-r${frozen.revision}.json`);
				const paired = await Promise.allSettled([
					fs.existsSync(diagnosticFile)
						? Promise.resolve(read(diagnosticFile))
						: diagnostic(element, stage, frozen),
					selfAudit,
				]);
				for (const result of paired) if (result.status === 'rejected') throw result.reason;
			}
			const next = receipt(element.id, stage);
			assert(next && next.revision > (prior?.revision ?? 0), 'Author must submit a new inspected revision');
			event({
				type: feedback ? 'repair-end' : 'author-end',
				role: stage,
				elementId: element.id,
				elapsedMs: performance.now() - begin,
			});
			return next;
		});
	const review = async (element, stage, candidate) =>
		serial(stage === 'wireframe' ? 'wireframe-review' : 'visual-review', async () => {
			const role = stage === 'wireframe' ? 'wireframe-review' : 'visual-review';
			const file = path.join(directory(element.id), role + '-r' + candidate.revision + '.json');
			if (fs.existsSync(file) && JSON.stringify(read(file).binding) === JSON.stringify(candidate.binding)) {
				event({
					type: 'review-reused',
					role,
					elementId: element.id,
					revision: candidate.revision,
					verdict: read(file).verdict,
				});
				return read(file);
			}
			const saved = await artifact(candidate.path);
			const packet = packets.get(element.id);
			const assignment = c.assign(role, [saved.handle, packet.handle], {
				elementId: element.id,
				revision: candidate.revision,
			});
			const earlier = fs
				.readdirSync(directory(element.id))
				.filter((name) => name.startsWith(role + '-r') && name.endsWith('.json'))
				.map((name) => read(path.join(directory(element.id), name)))
				.map((x) => ({revision: x.revision, findings: x.findings}));
			await c.runClient(
				role,
				'gpt-6-astra',
				'ultra',
				`You are the independent ${stage === 'wireframe' ? 'UX wireframe' : 'visual design'} reviewer. ${c.connection(assignment)} Review ${element.id} revision ${candidate.revision} only. Read artifact ${JSON.stringify(await c.readPlan(saved.handle))} and the same acceptance packet supplied to its author ${JSON.stringify(await c.readPlan(packet.handle))}. Inspect the actual screenshot with view_image: ${await c.screenshot(candidate)}. All capture pages (inspect each): ${JSON.stringify(candidate.screenshotPages ?? [])}. ${!state.threads[role] ? sharedContract : 'Retain the shared renderer and design context.'}\n${stage === 'wireframe' ? 'Check usable source-action coverage, actual item selection where required, hierarchy, states, recovery, focus intent and legible rendered layout. Neutral styling is intentional. Do not perform upstream UX redesign.' : 'Check consistency with accepted wireframe, visual representation, geometry, state distinctions and the frozen design-language JSON. Record a finding with route:"wireframe" if its correction needs behavior or structural wireframe changes.'} Visual design source pages: ${stage === 'ui' && !state.threads[role] ? JSON.stringify(await c.readPlan(c.designReceipt.handle)) : 'Reuse retained design context or the granted shared source.'}. Only consequential defects require revise; optional preferences use blocking:false. Recheck earlier findings plus affected changes: ${JSON.stringify(earlier)}. Use pilot.mark {phase:"review-start",elementId:"${element.id}"}. Save pilot.review {elementId:"${element.id}",revision:${candidate.revision},verdict:"pass"|"revise",findings:[{id,severity,sceneRef,nodeRef,issue,remedy,blocking?,route?}],strengths:[],limits:[]}. A pass cannot contain unresolved blocking findings. Source UX remains unreviewed. End after the saved receipt.`,
			);
			const result = read(file);
			state.reviews.push({role, elementId: element.id, revision: candidate.revision, verdict: result.verdict});
			saveState();
			return result;
		});
	const acceptedStage = async (element, stage) => {
		let candidate = receipt(element.id, stage);
		if (candidate && store.accepted(element.id, stage, candidate.revision)) {
			event({type: 'accepted-output-reused', role: stage, elementId: element.id, revision: candidate.revision});
			return candidate;
		}
		if (
			candidate &&
			JSON.stringify(candidate.binding) !== JSON.stringify(store._binding(element.id, stage, candidate.revision))
		) {
			event({type: 'binding-refresh', role: stage, elementId: element.id});
			candidate = await author(element, stage, [
				{
					issue: 'Renderer or source contract changed since this submission.',
					remedy: 'Reuse the saved draft, rerender and inspect under the corrected contract. Choice-group and visual trim-handle focus now render distinctly; disabled outlined buttons retain the surface background, and disabledBackground/disabledForeground theme values are supported. Inspect the affected states, make only necessary targeted corrections, then resubmit. Preserve the existing design and unchanged source facts. Prior acceptance must be renewed.',
				},
			]);
		}
		if (
			!candidate ||
			(stage === 'ui' &&
				store.latest(element.id, 'ui')?.sourceWireframeRevision !== receipt(element.id, 'wireframe').revision)
		)
			candidate = await author(element, stage);
		const reviewCount = () =>
			fs.readdirSync(directory(element.id)).filter((name) => {
				if (
					!name.startsWith((stage === 'wireframe' ? 'wireframe-review' : 'visual-review') + '-r') ||
					!name.endsWith('.json')
				)
					return false;
				const binding = read(path.join(directory(element.id), name)).binding;
				return ['source', 'contract', 'renderer'].every((key) => binding?.[key] === candidate.binding[key]);
			}).length;
		for (;;) {
			const role = stage === 'wireframe' ? 'wireframe-review' : 'visual-review';
			const savedReview = path.join(directory(element.id), role + '-r' + candidate.revision + '.json');
			if (reviewCount() >= reviewAttempts && !fs.existsSync(savedReview)) break;
			const result = await review(element, stage, candidate);
			if (result.verdict === 'pass') return candidate;
			if (reviewCount() >= reviewAttempts) break;
			if (stage === 'ui' && result.findings.some((x) => x.route === 'wireframe')) {
				await author(
					element,
					'wireframe',
					result.findings.filter((x) => x.route === 'wireframe'),
				);
				await acceptedStage(element, 'wireframe');
			}
			candidate = await author(element, stage, result.findings);
		}
		throw new Error(`${reviewAttempts} review attempts exhausted; saved findings require repair`);
	};
	// Schedule selected dependencies first; references outside this bounded trial
	// continue to use the frozen source contract. Never regenerate accepted work.
	const wireframes = new Map();
	const visit = (element, ancestors = []) => {
		assert(!ancestors.includes(element.id), 'Cyclic wireframe assignment dependency');
		if (wireframes.has(element.id)) return wireframes.get(element.id);
		const pending = Promise.all(
			(element.dependencies ?? []).map((id) => {
				const dependency = selected.find((x) => x.id === id);
				return dependency ? visit(dependency, [...ancestors, element.id]) : null;
			}),
		).then(() => acceptedStage(element, 'wireframe'));
		wireframes.set(element.id, pending);
		return pending;
	};
	// Run independent pipelines through one queue per role. First trial selects one element.
	await Promise.allSettled(
		selected.map(async (element) => {
			try {
				await visit(element);
				if (c.through !== 'wireframe') await acceptedStage(element, 'ui');
				state.completed = [...new Set([...state.completed, element.id])];
				event({type: 'element-accepted', elementId: element.id});
			} catch (error) {
				state.unresolvedReviews.push({elementId: element.id, reason: error.message});
				event({type: 'element-unresolved', elementId: element.id, reason: error.message});
			} finally {
				saveState();
			}
		}),
	);
	if (!state.unresolvedReviews.length) state.reviewCompletedAt = new Date().toISOString();
	saveState();
}
