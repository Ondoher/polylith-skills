import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const sha = (data) => createHash('sha256').update(data).digest('hex');

export function loadDecision(directory, condition) {
	assert(['broad', 'focused'].includes(condition), 'Decision condition must be broad or focused');
	const absolute = path.resolve(directory);
	const manifest = JSON.parse(fs.readFileSync(path.join(absolute, 'manifest.json')));
	const entry = manifest.entries.find((e) => e.id === condition);
	const location = path.resolve(absolute, entry.file);
	assert(location.startsWith(absolute + path.sep));
	const raw = fs.readFileSync(location);
	assert.equal(sha(raw), entry.sha256);
	assert(raw.length <= 28000, 'Decision input must fit one existing read');
	return {condition, manifest, value: JSON.parse(raw)};
}

export function decisionPrompt({decision, access, run, plan, governance, workspace}) {
	assert.equal(plan.length, 1, 'Both conditions require exactly one input read');
	assert.equal(plan[0].nextOffset, null);
	const {source, nextOffset, ...read} = plan[0];
	return `This is a bounded UX assessment, not full UX design mode or a contribution assignment. Follow the injected UX role. Load its generic assessment instructions and the result.store catalog before reading product data. Then save {kind:"ux-replay-phase",phase:"ux:instructions-ready"} using workflow_store. Use only the assigned MCP capability. Product input is restricted to the one supplied read: do not inspect product files, prior experiments, historical answers, other handles, or perform new research. The question uses familiar confirmation behavior and supplied requirements/prior UX.

Question: ${decision.manifest.question}

Read the supplied packet once. Its source-addressed records are exact values from the current facts and prior UX; partial coverage does not imply other records were removed. Resolve the question, then save one answer with workflow_store:
{kind:"ux-replay-phase",phase:"ux:decision-result",answer:{${decision.manifest.answerFields.map((f) => `${f}:"..."`).join(',')},unresolved:[],sourceRefs:[]}}
Each named prose field is at most ${decision.manifest.maxWordsPerField} words; all prose together at most ${decision.manifest.maxTotalWords} words. unresolved is an array of essential missing facts, normally empty if none. sourceRefs is an array of supplied record IDs or source:pointer references. Give the decision and user-facing behavior, not a reasoning transcript or full schema artifact. Do not regenerate supplied records. If essential context is missing, identify it in unresolved and save what can be decided; do not request additional product reads. Final chat response: saved handle and status only. No review, contribution assembly, UI work, files or product mutation.

Governance: ${governance}
Workspace: ${workspace}
Assigned access: ${access}
Run: ${run}
The only product read: workflow_read ${JSON.stringify({access, ...read})}
`;
}

export async function checkDecisionProtocol({call, assignment, run, plan, inputs}) {
	assert.equal(plan.length, 1);
	const {handle, offset, maxBytes} = plan[0];
	const result = await call('read', {access: assignment.access, handle, offset, maxBytes});
	assert.equal(result.nextOffset, null);
	assert.equal(sha(Buffer.from(result.text)), inputs.input.sha256);
	const probe = await call('store', {
		access: assignment.access,
		run,
		value: {kind: 'ux-replay-phase', phase: 'ux:protocol-probe', answer: {status: 'local-check'}},
	});
	assert(probe.handle);
	return {inputReads: 1, exactBytes: Buffer.byteLength(result.text), resultStore: true};
}
