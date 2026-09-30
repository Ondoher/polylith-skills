import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

/** Persistent role queues run independent elements while preserving review-before-UI. */
export async function runReviewedPipeline(c) {
	const {store, service, runId, state, event, saveState, workspace} = c;
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
	if (!store.scope) {
		// Reuse boundary decisions only. No corrected wireframe or UI data is imported.
		const scope = read(
			path.join(c.governance, '.codex-tmp/wireframe-ui-pilot-20260930/workspace/outputs/scope.json'),
		);
		store.setScope(scope, {scope: {role: 'wireframe'}});
		event({type: 'scope-reused', source: 'original-pilot-boundaries', elapsedMs: 0});
	}
	const selected = store.scope.elements.filter(
		(x) => x.disposition === 'update' && (c.selected === 'all' || c.selected.split(',').includes(x.id)),
	);
	assert(selected.length, 'No selected updated elements');
	state.unresolvedReviews = [];
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
	const protocol = `Use pilot.contribute {elementId,set?,parts?,scenes?,nodeChanges?:[{sceneRef,nodeRef,set}],partChanges?:[{partRef,nodeRef,set}],dialog?:{id,header:[nodes],body:[nodes],footer:[nodes],gap?,padding?},finish?:true}. Save progressive changes. set contains purpose,focusIntent,recoveryIntent,openQuestions or ui metadata. Code owns all envelopes and revisions. dialog creates a shared part with content-sized header/footer and scrollable body; reference it by partRef in scenes. partChanges edits a node including children without resending its part. Scene changes use complete layout/parameters fields. finish:true returns a DRAFT screenshot, validation and coverage. Inspect that screenshot using view_image, check the source use cases with its actual controls, make targeted corrections if needed, then call pilot.submit {elementId,revision,inspected:true}. Rendering does not submit or approve anything. Do not end until submitted. Do not write renderer/browser scripts or access live products. On capture failure retain the draft and report the capture issue. Mark inputs-ready, wireframe-start or ui-start, inspection-start/end and finished via pilot.mark {phase,elementId}. Do not add markers per thought.`;
	const sharedContract = `Renderer capabilities: ${JSON.stringify(c.capabilities)}\n${c.contractText}\nThe current progressive protocol below supersedes the old finish/ready wording in examples. choice-group template uses parameters {label,presentation:"listbox"|"tabs"|"select",options:[{id,label,secondary?}],selectedId?,disabled?}; use actual item options for selection. It is optional when another usable control better fits the source.`;
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
			if (wf) event({type: 'ui-dispatch', elementId: element.id, wireframeRevision: wf.revision, accepted: true});
			event({type: feedback ? 'repair-start' : 'author-start', role: stage, elementId: element.id});
			await c.runClient(
				stage,
				stage === 'wireframe' ? 'gpt-6-sol' : 'gpt-6-astra',
				stage === 'wireframe' ? 'medium' : 'ultra',
				`You are the ${stage === 'wireframe' ? 'UX wireframe' : 'UI design'} author. Work only on ${element.id}; retain context and accepted decisions from earlier assignments. ${c.connection(assignment)}\n${first ? sharedContract : 'Reuse the renderer contract already supplied.'}\n${protocol}\nRead this source/acceptance packet: ${JSON.stringify(await c.readPlan(packet.handle))}. It includes existing flow steps and action contracts; do not invent behavior or replay the upstream UX stage. Bind required source actions to real controls; external interactions need a visible trigger and explicit return behavior. Missing source facts should be recorded as gaps. ${saved ? 'Continue the saved draft: ' + JSON.stringify(await c.readPlan(saved.handle)) : 'Create a fresh element from the original source facts.'}\n${wfSaved ? 'Accepted exact wireframe: ' + JSON.stringify(await c.readPlan(wfSaved.handle)) + '. Preserve its behavior. Shared design language handle is available in your assigned handles; read it once if not retained. Apply its JSON foundations and reuse its research; UI still owns visual decisions and bounded primary-source research when needed. Wireframe acceptance does not authorize behavior changes.' : 'Use neutral styling and meaningful spatial hierarchy. The dialog layout pattern is available to avoid fixed-height content collisions. Include all required states; additional states may be needed for full usage coverage.'}\n${first && stage === 'ui' ? 'Read frozen design language: ' + JSON.stringify(await c.readPlan(c.designReceipt.handle)) : ''}\n${feedback ? 'Repair these exact findings and their affected consequences, preserving unrelated data: ' + JSON.stringify(feedback) : ''}\nEnd with only the submitted element ID/revision, not a combined artifact.`,
			);
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
				`You are the independent ${stage === 'wireframe' ? 'UX wireframe' : 'visual design'} reviewer. ${c.connection(assignment)} Review ${element.id} revision ${candidate.revision} only. Read artifact ${JSON.stringify(await c.readPlan(saved.handle))} and the same acceptance packet supplied to its author ${JSON.stringify(await c.readPlan(packet.handle))}. Inspect the actual screenshot with view_image: ${await c.screenshot(candidate)}. ${!state.threads[role] ? sharedContract : 'Retain the shared renderer and design context.'}\n${stage === 'wireframe' ? 'Check usable source-action coverage, actual item selection where required, hierarchy, states, recovery, focus intent and legible rendered layout. Neutral styling is intentional. Do not perform upstream UX redesign.' : 'Check consistency with accepted wireframe, visual representation, geometry, state distinctions and the frozen design-language JSON. Record a finding with route:"wireframe" if its correction needs behavior or structural wireframe changes.'} Visual design source pages: ${stage === 'ui' && !state.threads[role] ? JSON.stringify(await c.readPlan(c.designReceipt.handle)) : 'Reuse retained design context or the granted shared source.'}. Only consequential defects require revise; optional preferences use blocking:false. Recheck earlier findings plus affected changes: ${JSON.stringify(earlier)}. Use pilot.mark {phase:"review-start",elementId:"${element.id}"}. Save pilot.review {elementId:"${element.id}",revision:${candidate.revision},verdict:"pass"|"revise",findings:[{id,severity,sceneRef,nodeRef,issue,remedy,blocking?,route?}],strengths:[],limits:[]}. A pass cannot contain unresolved blocking findings. Source UX remains unreviewed. End after the saved receipt.`,
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
			!candidate ||
			(stage === 'ui' &&
				store.latest(element.id, 'ui')?.sourceWireframeRevision !== receipt(element.id, 'wireframe').revision)
		)
			candidate = await author(element, stage);
		for (let round = 0; round < 3; round++) {
			const result = await review(element, stage, candidate);
			if (result.verdict === 'pass') return candidate;
			if (stage === 'ui' && result.findings.some((x) => x.route === 'wireframe')) {
				await author(
					element,
					'wireframe',
					result.findings.filter((x) => x.route === 'wireframe'),
				);
				await acceptedStage(element, 'wireframe');
			}
			if (round < 2) candidate = await author(element, stage, result.findings);
		}
		throw new Error('Three review attempts exhausted; saved findings require repair');
	};
	// Run independent pipelines through one queue per role. First trial selects one element.
	await Promise.allSettled(
		selected.map(async (element) => {
			try {
				await acceptedStage(element, 'wireframe');
				await acceptedStage(element, 'ui');
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
