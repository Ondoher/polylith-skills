import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const sha = (data) => createHash('sha256').update(data).digest('hex');

export function loadPilot(directory, condition) {
	assert(['all', 'staged'].includes(condition), 'Pilot condition must be all or staged');
	const absolute = path.resolve(directory);
	const manifest = JSON.parse(fs.readFileSync(path.join(absolute, 'manifest.json')));
	assert.equal(manifest.tasks.length, 3);
	const values = {};
	for (const entry of manifest.entries) {
		const location = path.resolve(absolute, entry.file);
		assert(location.startsWith(absolute + path.sep));
		const raw = fs.readFileSync(location);
		assert.equal(sha(raw), entry.sha256);
		values[entry.id] = JSON.parse(raw);
	}
	return {directory: absolute, condition, manifest, values};
}

export async function storePilotInputs(call, owner, pilot, identities) {
	const inputs = {identities};
	for (const [name, value] of Object.entries(pilot.values)) inputs[name] = await call('store', {...owner, value});
	return inputs;
}

export function availableSources(pilot, ordinal, extra = []) {
	return [
		'identities',
		'shared',
		...pilot.manifest.tasks
			.filter((task) => pilot.condition === 'all' || task.ordinal <= ordinal || extra.includes(task.id))
			.map((task) => task.id),
	];
}

export function pilotPrompt({
	pilot,
	ordinal,
	access,
	run,
	references,
	readPlan,
	available,
	initial,
	governance,
	workspace,
}) {
	const task = pilot.manifest.tasks[ordinal - 1];
	const phase = `ux:task-${ordinal}`;
	return `${
		initial
			? `This is an isolated three-task first UX pilot. Follow the injected ux-planner role and the incremental contribution contract. Load generic instructions once. The parent has already seeded the original baseline. Do not read local product files, prior experiment folders, historical answers, or broad unit documents. Product information comes only from the supplied MCP packet handles. Projection records contain exact source values at their stated JSON pointers; they are not complete replacement units. Preserve fields and unrelated records omitted from a projection. Do not repeat parsing, inventory, global redesign, reviews, rendering or canonical persistence. No custom transport or assembly scripts.

All-input-first condition collects all supplied packets before working; staged condition collects shared context and the current packet. Both process exactly these tasks, in order: ${JSON.stringify(pilot.manifest.tasks.map(({id, task}) => ({id, task})))}. New meaning should be saved through units.contribute at natural boundaries; reuse opaque revisions and inline receipts. Do not regenerate accumulated records. Generic contribution operations are result.store, units.status, units.contribute and, only on the final task, units.finish. Inspect the operation catalog once; do not reread unchanged instructions/catalogs on continuation. Record instructions-ready with workflow_store value {kind:"ux-replay-phase",phase:"ux:instructions-ready"} before product input collection.
`
			: 'Continue the same three-task assignment with the existing context, contributions and revisions. Do not reload unchanged generic instructions or already received product packets.'
	}

Condition: ${pilot.condition}. Current task ${ordinal}/3: ${task.id}. ${task.task}
Only perform this task now. Earlier packets remain available in your conversation. Do not perform future tasks merely because their input is already visible. You may correct an earlier contribution if this task reveals a necessary dependency; identify the affected task and reason briefly in the completion receipt. For essential unavailable context, save {kind:"ux-replay-phase",phase:"ux:pilot-needs",packetIds:[...],reason:"..."} and end the turn; the driver will supply it rather than requiring a guess.
After reading the new pages, save {kind:"ux-replay-phase",phase:"${phase}-inputs-ready"}. Refine current requirements into coherent local action/frame/flow behavior. Record unknowns explicitly. Preserve inherited unrelated work. This is a partial product test and does not claim all source changes have been refined.
Save contributions, then save {kind:"ux-replay-phase",phase:"${phase}-complete",taskId:"${task.id}",disposition:"changed|unchanged|needs-context",batchIds:[...],revisitedTasks:[...],openDependencies:[...]} through workflow_store. Keep that receipt concise; no proposal restatement.
${ordinal === 3 ? 'After the task completion receipt, call units.finish once for the assigned references. Stop at its first receipt; report defects without a repair or review round.' : 'Do not call units.finish yet. End this turn after the task completion receipt. The driver will continue the same thread with the next task.'}
Final response: only completion handle, status and at most a short unresolved-context note.
Governance: ${governance}
Workspace: ${workspace}
Assigned access: ${access}
Run: ${run}
Assigned references: ${JSON.stringify(references)}
Available packet IDs: ${JSON.stringify(available)}
Read ONLY these not-yet-delivered pages before working (independent reads may run in parallel): ${JSON.stringify(readPlan.map(({nextOffset, ...entry}) => entry))}
`;
}

export async function checkPilotProtocol({call, owner, pilot, inputs, plan, references}) {
	const seen = new Set();
	const checks = [];
	for (let ordinal = 1; ordinal <= 3; ordinal++) {
		const available = availableSources(pilot, ordinal);
		const grant = await call('assign', {
			...owner,
			operations: ['result.store', 'units.contribute', 'units.finish'],
			handles: available.map((name) => inputs[name].handle),
			scope: {stage: 'ux', recordRefs: references},
		});
		for (const name of available.filter((name) => !seen.has(name))) {
			const parts = [];
			for (const page of plan.filter((page) => page.source === name)) {
				const read = await call('read', {
					access: grant.access,
					handle: page.handle,
					offset: page.offset,
					maxBytes: page.maxBytes,
				});
				parts.push(Buffer.from(read.text));
			}
			assert.equal(sha(Buffer.concat(parts)), inputs[name].sha256);
			seen.add(name);
		}
		if (pilot.condition === 'staged' && ordinal < 3) {
			const future = inputs[pilot.manifest.tasks[ordinal].id];
			await assert.rejects(call('read', {access: grant.access, handle: future.handle}), /outside the assignment/);
		}
		await call('store', {...owner, access: grant.access, value: {kind: 'pilot-protocol-check', ordinal}});
		checks.push({ordinal, available, received: [...seen]});
	}
	assert.equal(seen.size, Object.keys(inputs).length);
	return {checks, exactEventualCoverage: true, futureInputDenied: pilot.condition === 'staged'};
}
