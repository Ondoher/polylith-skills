import assert from 'node:assert/strict';
import test from 'node:test';
import {frameObserver, projectMessage} from './live-request-observer.mjs';

function frame(payload, {masked = false, opcode = 1, final = true} = {}) {
	const prefix = payload.length < 126 ? 2 : payload.length < 65536 ? 4 : 10;
	const header = Buffer.alloc(prefix + (masked ? 4 : 0));
	header[0] = (final ? 128 : 0) | opcode;
	header[1] = (masked ? 128 : 0) | (prefix === 2 ? payload.length : prefix === 4 ? 126 : 127);
	if (prefix === 4) header.writeUInt16BE(payload.length, 2);
	if (prefix === 10) header.writeBigUInt64BE(BigInt(payload.length), 2);
	const copy = Buffer.from(payload);
	if (masked) {
		const mask = Buffer.from([17, 91, 33, 204]);
		mask.copy(header, prefix);
		for (let i = 0; i < copy.length; i++) copy[i] ^= mask[i % 4];
	}
	return Buffer.concat([header, copy]);
}

test('observes masked requests and unmasked fragmented responses across chunk boundaries', () => {
	for (const masked of [true, false]) {
		const first = Buffer.from(JSON.stringify({input: 'x'.repeat(70000)}));
		const second = Buffer.from('{"type":"response.completed"}');
		const wire = Buffer.concat([
			frame(first, {masked}),
			frame(second.subarray(0, 11), {masked, final: false}),
			frame(Buffer.from('ping'), {masked, opcode: 9}),
			frame(second.subarray(11), {masked, opcode: 0}),
		]);
		const original = Buffer.from(wire);
		const received = [];
		const observe = frameObserver(masked, (value) => received.push(value));
		for (let i = 0; i < wire.length; i += 971) observe(wire.subarray(i, i + 971));
		assert.deepEqual(received, [first, second]);
		assert.deepEqual(wire, original);
	}
});

test('projects live flags and response identities without private request or result contents', () => {
	const secret = 'PRIVATE_TEST_SENTINEL';
	const request = projectMessage(
		{
			type: 'response.create',
			model: 'gpt-6-astra',
			parallel_tool_calls: true,
			tool_choice: 'auto',
			reasoning: {effort: 'xhigh'},
			input: [{text: secret}],
			tools: [
				{
					type: 'namespace',
					name: 'mcp__polylith_workflows',
					tools: [{type: 'function', name: 'workflow_read', description: secret}],
				},
			],
		},
		'request',
	);
	assert.equal(request.parallelToolCalls, true);
	assert.equal(request.tools[0].tools[0].name, 'workflow_read');
	const response = projectMessage(
		{
			type: 'response.completed',
			response: {
				id: 'resp_demo',
				parallel_tool_calls: true,
				output: [{type: 'function_call', call_id: 'call_demo', name: 'workflow_read', arguments: secret}],
			},
		},
		'response',
	);
	assert.equal(response.responseId, 'resp_demo');
	assert.equal(response.output[0].callId, 'call_demo');
	assert(!JSON.stringify([request, response]).includes(secret));
	assert.equal(projectMessage({type: 'response.function_call_arguments.delta', delta: secret}, 'response'), null);
});
