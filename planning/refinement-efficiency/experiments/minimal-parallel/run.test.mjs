import assert from 'node:assert/strict';
import test from 'node:test';
import {textFrame, summarizeCalls} from './run.mjs';
import {frameObserver} from '../ux-read-window/live-request-observer.mjs';

test('synthetic requests survive masked frame encoding and split delivery', () => {
	for (const size of [10, 200, 70000]) {
		const body = {type: 'response.create', input: 'x'.repeat(size)};
		const received = [];
		const observe = frameObserver(true, (payload) => received.push(JSON.parse(payload)));
		const frame = textFrame(body);
		observe(frame.subarray(0, 7));
		observe(frame.subarray(7));
		assert.deepEqual(received, [body]);
	}
});

test('native response grouping is distinct from execution overlap and missing results', () => {
	const calls = Array.from({length: 8}, (_, i) => ({
		id: i + 1,
		responseId: 'batch',
		startMs: i * 10,
		endMs: i * 10 + 250,
		output: JSON.stringify({id: i + 1}),
	}));
	assert.deepEqual(summarizeCalls(calls), {
		allEightVerified: true,
		callsPerResponse: {batch: 8},
		maxCallsPerResponse: 8,
		maxConcurrentExecutions: 8,
	});
	assert.equal(summarizeCalls(calls.slice(1)).allEightVerified, false);
	const serial = calls.map((call, i) => ({...call, responseId: `r${i}`, startMs: i * 500, endMs: i * 500 + 250}));
	assert.equal(summarizeCalls(serial).maxCallsPerResponse, 1);
	assert.equal(summarizeCalls(serial).maxConcurrentExecutions, 1);
});
