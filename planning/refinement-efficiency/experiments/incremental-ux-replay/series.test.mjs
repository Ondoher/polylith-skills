import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {caseOrder, prepareSeries, loadSeries, storeSeriesInputs, checkSeriesProtocol, seriesPrompt} from './series.mjs';

const sha = (value) => createHash('sha256').update(value).digest('hex');

test('both schedules reuse an identical deduplicated collection and complete three ordered saves', async (t) => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-series-test-'));
	t.after(() => {
		assert(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
		fs.rmSync(directory, {recursive: true, force: true});
	});
	const source = path.join(directory, 'source');
	const governance = path.join(directory, 'governance');
	const write = (file, value) => {
		fs.mkdirSync(path.dirname(file), {recursive: true});
		fs.writeFileSync(file, value);
	};
	for (const file of [
		'planning/implementation-agents/ux-planner.md',
		'planning/implementation-agents/ux-guidance.md',
		'planning/implementation-agents/research-guidance.md',
		'documentation/workflows/mcp.md',
		'agents/ux-planner.toml',
	])
		write(path.join(governance, file), `Fixture instructions: ${file}`);
	const shared = {source: 'facts', pointer: '/shared', value: {id: 'shared'}};
	const fields = ['eligibility', 'operation', 'preserved', 'confirmation', 'recovery', 'baselineChanges'];
	const cases = caseOrder.map((id) => {
		const packet = JSON.stringify({
			kind: 'fixture',
			records: [shared, {source: 'facts', pointer: `/${id}`, value: {id}}],
		});
		const original = JSON.stringify({
			question: `Question ${id}`,
			rubric: ['withheld-rubric'],
			answerFields: fields,
			maxWordsPerField: 70,
			maxTotalWords: 350,
		});
		write(path.join(source, id, 'focused.json'), packet);
		write(path.join(source, id, 'manifest.json'), original);
		return {
			id,
			manifestSha256: sha(original),
			entries: [{id: 'focused', file: 'focused.json', sha256: sha(packet)}],
		};
	});
	write(path.join(source, 'suite.json'), JSON.stringify({cases}));
	const output = path.join(directory, 'prepared');
	const manifest = prepareSeries(source, output, governance);
	assert.equal(manifest.uniqueRecords, 4);
	assert.deepEqual(
		manifest.cases.map((item) => item.packet.records),
		[2, 1, 1],
	);
	const all = [];
	for (const condition of ['upfront', 'as-needed']) {
		const series = loadSeries(output, condition);
		const values = new Map();
		const call = async (name, args) => {
			if (name === 'store') {
				const text = JSON.stringify(args.value);
				const handle = `fixture:${sha(text)}`;
				values.set(handle, text);
				return {handle, sha256: sha(text), bytes: Buffer.byteLength(text)};
			}
			assert.equal(name, 'read');
			return {text: values.get(args.handle), nextOffset: null};
		};
		const inputs = await storeSeriesInputs(call, {access: 'owner', run: 'fixture'}, series);
		const plan = Object.entries(inputs).map(([source, value]) => ({
			source,
			handle: value.handle,
			offset: 0,
			maxBytes: 28000,
			nextOffset: null,
		}));
		const result = await checkSeriesProtocol({
			call,
			assignment: {access: 'author'},
			run: 'fixture',
			series,
			plan,
			inputs,
		});
		assert.equal(result.inputReads, 3);
		assert.equal(result.savedProbes, 3);
		all.push(Object.values(inputs).map((value) => value.sha256));
		const prompt = seriesPrompt({series, access: 'author', run: 'fixture', plan, contracts: []});
		assert(!prompt.includes('withheld-rubric'));
		assert(prompt.includes(series.instructions));
		assert(caseOrder.every((id) => prompt.includes(`Question ${id}`)));
	}
	assert.deepEqual(all[0], all[1]);
});
