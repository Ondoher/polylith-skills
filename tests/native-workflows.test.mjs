import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {prepareNativeWorkflowCatalog, nativeWorkflowArguments} from '../scripts/native-workflow-catalog.mjs';
import {readBatchAssignment} from '../scripts/mcp/read-batch.mjs';

test('native catalog changes only the selected transport fields and reuses identical output', (t) => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'native-workflows-'));
	t.after(() => fs.rmSync(root, {recursive: true, force: true}));
	const source = {
		models: [
			{
				slug: 'selected',
				tool_mode: 'code_mode_only',
				use_responses_lite: true,
				instructions: 'preserve',
				context: 123,
			},
			{slug: 'other', tool_mode: 'code_mode_only', use_responses_lite: true},
		],
		version: 'keep',
	};
	const sourcePath = path.join(root, 'models.json');
	fs.writeFileSync(sourcePath, JSON.stringify(source));
	const options = {sourcePath, directory: path.join(root, 'derived'), model: 'selected'};
	const receipt = prepareNativeWorkflowCatalog(options);
	assert.deepEqual(prepareNativeWorkflowCatalog(options), receipt);
	assert.deepEqual(JSON.parse(fs.readFileSync(sourcePath)), source);
	const result = JSON.parse(fs.readFileSync(receipt.path));
	assert.deepEqual(result, {
		...source,
		models: [{...source.models[0], tool_mode: 'direct', use_responses_lite: false}, source.models[1]],
	});
	assert.deepEqual(receipt.changedFields, ['tool_mode', 'use_responses_lite']);
	assert.throws(() => prepareNativeWorkflowCatalog({...options, model: 'absent'}), /exactly one/);
});

test('read assignment retains exact independently selected arguments and keeps capability separate', () => {
	const reads = [
		{handle: 'facts:digest', offset: 0, maxBytes: 7000},
		{handle: 'ux:digest', pointer: '/elements', offset: 6941, maxBytes: 7000},
	];
	const text = readBatchAssignment({access: 'assigned', reads});
	assert.match(text, /in parallel, in one model response/);
	assert.deepEqual(JSON.parse(text.split('\n')[1]), reads);
	assert.match(text, /access="assigned"/);
	assert.throws(() => readBatchAssignment({access: 'assigned', reads: [reads[0], reads[0]]}), /Duplicate/);
});

test('exec receives its own model catalog override instead of a dropped root option', () => {
	assert.deepEqual(nativeWorkflowArguments(['exec', '--json', '-'], 'selected', 'C:/catalog.json'), [
		'exec',
		'-m',
		'selected',
		'-c',
		'model_catalog_json="C:/catalog.json"',
		'--json',
		'-',
	]);
	assert.deepEqual(nativeWorkflowArguments([], 'selected', 'C:/catalog.json'), [
		'-m',
		'selected',
		'-c',
		'model_catalog_json="C:/catalog.json"',
	]);
});
