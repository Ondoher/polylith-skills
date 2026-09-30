import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const caseOrder = ['save-range', 'trim-group', 'update-clip'];
const instructionPaths = [
	'planning/implementation-agents/ux-planner.md',
	'planning/implementation-agents/ux-guidance.md',
	'planning/implementation-agents/research-guidance.md',
	'documentation/workflows/mcp.md',
];

/** Freeze equal evidence for two delivery schedules, without calling a model. */
export function prepareSeries(sourceDirectory, outputDirectory, governance) {
	assert(!fs.existsSync(outputDirectory), 'Preserve frozen inputs; choose a new directory');
	const source = read(path.join(sourceDirectory, 'suite.json'));
	const seen = new Map();
	const packets = [];
	const cases = caseOrder.map((id) => {
		const entry = source.cases.find((value) => value.id === id);
		const raw = fs.readFileSync(path.join(sourceDirectory, id, 'manifest.json'));
		assert.equal(sha(raw), entry.manifestSha256, 'Original case changed');
		const original = JSON.parse(raw);
		const selected = entry.entries.find((value) => value.id === 'focused');
		const input = fs.readFileSync(path.join(sourceDirectory, id, selected.file));
		assert.equal(sha(input), selected.sha256, 'Original input changed');
		const records = JSON.parse(input).records;
		const additions = [];
		for (const record of records) {
			const reference = `${record.source}:${record.pointer}`;
			if (seen.has(reference)) assert.deepEqual(seen.get(reference), record, 'Conflicting shared record');
			else {
				seen.set(reference, record);
				additions.push(record);
			}
		}
		const value = {kind: 'ux-series-packet', caseId: id, records: additions};
		const encoded = JSON.stringify(value);
		assert(Buffer.byteLength(encoded) <= 28000, 'Case packet exceeds the existing read window');
		packets.push({id, value, encoded});
		return {
			id,
			question: original.question,
			rubric: original.rubric,
			answerFields: original.answerFields,
			maxWordsPerField: original.maxWordsPerField,
			maxTotalWords: original.maxTotalWords,
			requiredReferences: records.map((record) => `${record.source}:${record.pointer}`),
			sourceManifestSha256: sha(raw),
			sourcePacketSha256: sha(input),
			packet: {
				file: `${id}.json`,
				bytes: Buffer.byteLength(encoded),
				sha256: sha(encoded),
				records: additions.length,
			},
		};
	});
	const instructions = instructionPaths.map((file) => ({
		file,
		text: fs.readFileSync(path.join(governance, file), 'utf8'),
	}));
	const bundle = instructions
		.map(({file, text}) => `BEGIN PRELOADED SOURCE ${file}\n${text}\nEND PRELOADED SOURCE ${file}`)
		.join('\n\n');
	const role = fs.readFileSync(path.join(governance, 'agents/ux-planner.toml'));
	const manifest = {
		schema: 1,
		kind: 'ux-three-case-delivery-test',
		conditions: ['upfront', 'as-needed'],
		caseOrder,
		cases,
		uniqueRecords: seen.size,
		totalPacketBytes: packets.reduce((sum, packet) => sum + Buffer.byteLength(packet.encoded), 0),
		sourceSuiteSha256: sha(fs.readFileSync(path.join(sourceDirectory, 'suite.json'))),
		roleSha256: sha(role),
		instructions: {
			file: 'instructions.md',
			sha256: sha(bundle),
			bytes: Buffer.byteLength(bundle),
			sources: instructions.map(({file, text}) => ({file, sha256: sha(text)})),
		},
	};
	fs.mkdirSync(outputDirectory, {recursive: true});
	for (const packet of packets) fs.writeFileSync(path.join(outputDirectory, `${packet.id}.json`), packet.encoded);
	fs.writeFileSync(path.join(outputDirectory, 'instructions.md'), bundle);
	fs.writeFileSync(path.join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
	return manifest;
}

/** Load one condition without changing its frozen records or instruction text. */
export function loadSeries(directory, condition) {
	assert(['upfront', 'as-needed'].includes(condition), 'Choose upfront or as-needed');
	const manifest = read(path.join(directory, 'manifest.json'));
	assert.deepEqual(manifest.caseOrder, caseOrder);
	const values = Object.fromEntries(
		manifest.cases.map((item) => {
			const raw = fs.readFileSync(path.join(directory, item.packet.file));
			assert.equal(sha(raw), item.packet.sha256);
			assert(raw.length <= 28000);
			return [item.id, JSON.parse(raw)];
		}),
	);
	const instructions = fs.readFileSync(path.join(directory, manifest.instructions.file), 'utf8');
	assert.equal(sha(instructions), manifest.instructions.sha256);
	return {condition, manifest, values, instructions};
}

/** Check observed reads/saves as a protocol, not as a model's self-reported success. */
export function validateSeriesOrder(condition, events) {
	const reads = caseOrder.map((id) => `read:${id}`);
	const answers = caseOrder.map((id) => `answer:${id}`);
	const expected =
		condition === 'upfront' ? [...reads, ...answers] : reads.flatMap((value, i) => [value, answers[i]]);
	assert.deepEqual(events, expected, 'Delivery schedule was not followed; preserve as an invalid comparison');
}

export async function storeSeriesInputs(call, owner, series) {
	const inputs = {};
	for (const id of caseOrder) inputs[id] = await call('store', {...owner, value: series.values[id]});
	return inputs;
}

/** Deterministic local exercise of the assigned MCP read/store route. No author is launched. */
export async function checkSeriesProtocol({call, assignment, run, series, plan, inputs}) {
	const events = [];
	const readPacket = async (id) => {
		const page = plan.find((value) => value.source === id);
		assert(page && page.nextOffset === null);
		const result = await call('read', {access: assignment.access, handle: page.handle, offset: 0, maxBytes: 28000});
		assert.equal(result.nextOffset, null);
		assert.equal(sha(Buffer.from(result.text)), inputs[id].sha256);
		events.push(`read:${id}`);
	};
	const saveProbe = async (id) => {
		const receipt = await call('store', {
			access: assignment.access,
			run,
			value: {kind: 'ux-series-probe', caseId: id, status: 'local-check'},
		});
		assert(receipt.handle);
		events.push(`answer:${id}`);
	};
	if (series.condition === 'upfront') for (const id of caseOrder) await readPacket(id);
	for (const id of caseOrder) {
		if (series.condition === 'as-needed') await readPacket(id);
		await saveProbe(id);
	}
	validateSeriesOrder(series.condition, events);
	return {
		condition: series.condition,
		events,
		inputReads: 3,
		savedProbes: 3,
		uniqueRecords: series.manifest.uniqueRecords,
	};
}

export const seriesInstructionOverlay =
	'\nFor this isolated assessment, the supervisor supplies the exact generic UX assessment instruction sources and result.store contract in the initial message. Treat those sources as already loaded. Do not rediscover instruction paths, read helper code, execute shell commands, or reload those files. Retain all other UX assessment responsibilities. Use the assigned MCP reads and stores; report essential missing context in the saved answer.\n';

/** One prompt for one continuous author instance completing all three cases. */
export function seriesPrompt({series, access, run, plan, contracts}) {
	assert.equal(plan.length, 3);
	assert(plan.every((page) => page.offset === 0 && page.nextOffset === null));
	const {answerFields, maxWordsPerField, maxTotalWords} = series.manifest.cases[0];
	const schedule =
		series.condition === 'upfront'
			? 'Read all three packets in the listed order before solving or saving the first case. Then solve and save each case in order. Do not re-read packets.'
			: 'Read the first packet, solve and save its case, then read the second packet and solve and save its case, then read the third packet and solve and save its case. Do not fetch a later packet before saving the current answer. Reuse earlier records from this same conversation; do not re-read them.';
	return `Complete all three bounded UX cases in this one agent instance, in the listed order. Each uses its original scenario; prior answers do not mutate the source data. No review, rework, research, UI work, contribution assembly, shell commands, files, or live product mutation. Use only assigned MCP data. Essential missing context goes in unresolved; do not fetch outside the supplied packets.

The generic instructions and storage contract below are already supplied in full. Do not discover or reload them. If native tool discovery is necessary, discover workflow_read and workflow_store together before the ready marker; make no discovery calls afterward. Save {kind:"ux-replay-phase",phase:"ux:series-ready"} with workflow_store. Wait for its receipt before issuing the first product read.

DELIVERY SCHEDULE: ${schedule}
Wait for each read or save receipt before issuing the next read or save. This test holds call sequencing fixed; do not batch calls.
The three packets contain the same complete record collection in both conditions. Records occur once, when first needed. Source addresses are stable; partial coverage implies no deletions. Earlier data and answers stay available throughout the three cases.

After each case, immediately use workflow_store to save {kind:"ux-replay-phase",phase:"ux:series-result",caseId:"<case ID>",answer:{${answerFields.map((field) => `${field}:"..."`).join(',')},unresolved:[],sourceRefs:[]}}. Wait for the receipt before continuing. Save each case exactly once; do not revise earlier answers or generate a final combined artifact. Each prose field has at most ${maxWordsPerField} words and each answer at most ${maxTotalWords} prose words. Confirmation can describe a direct-interaction preview; do not invent a dialog to fill it. Use supplied IDs or source:pointer values in sourceRefs. Provide decisions and user-facing behavior, not a reasoning transcript. After the third save, give only the three saved handles and completion status.

CASES (rubrics are withheld):
${series.manifest.cases.map((item, i) => `${i + 1}. ${item.id}: ${item.question}`).join('\n\n')}

Assigned access: ${access}
Run: ${run}
READS (each is one complete packet; issue each exactly once at its scheduled point):
${plan.map(({source, handle, offset, maxBytes}) => `${source}: workflow_read ${JSON.stringify({access, handle, offset, maxBytes})}`).join('\n')}

PRELOADED result.store CONTRACT:
${JSON.stringify(contracts)}

PRELOADED GENERIC INSTRUCTIONS:
${series.instructions}
`;
}
