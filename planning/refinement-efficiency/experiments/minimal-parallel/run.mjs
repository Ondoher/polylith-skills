import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {request} from 'node:https';
import {createHash, randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {frameObserver} from '../ux-read-window/live-request-observer.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../../..');
const endpoint = 'https://chatgpt.com/backend-api/codex/responses';
const prompt = fs.readFileSync(path.join(directory, 'native-prompt.txt'), 'utf8').trim();
const models = ['gpt-6-astra', 'gpt-5.6-sol', 'gpt-5.5'];
const effort = 'xhigh';
const delayMs = 250;
const tool = {
	type: 'function',
	name: 'probe',
	description: 'Read-only probe. Calls are independent and safe to execute concurrently.',
	strict: true,
	parameters: {
		type: 'object',
		properties: {id: {type: 'integer', minimum: 1, maximum: 8}},
		required: ['id'],
		additionalProperties: false,
	},
};

/** Encode a client text frame. Authentication never enters its JSON body. */
export function textFrame(value) {
	const payload = Buffer.from(JSON.stringify(value));
	const extended = payload.length < 126 ? 0 : payload.length < 65536 ? 2 : 8;
	const header = Buffer.alloc(2 + extended + 4);
	header[0] = 0x81;
	header[1] = 0x80 | (extended === 0 ? payload.length : extended === 2 ? 126 : 127);
	if (extended === 2) header.writeUInt16BE(payload.length, 2);
	if (extended === 8) header.writeBigUInt64BE(BigInt(payload.length), 2);
	const mask = randomBytes(4);
	mask.copy(header, 2 + extended);
	for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
	return Buffer.concat([header, payload]);
}

/** Open the same backend transport, with credentials held only in memory. */
async function connect(auth, onEvent) {
	let socket;
	let receive;
	let rejectPending;
	const key = randomBytes(16).toString('base64');
	const expected = createHash('sha1')
		.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
		.digest('base64');
	const headers = {
		Authorization: `Bearer ${auth.tokens.access_token}`,
		'OpenAI-Beta': 'responses_websockets=2026-02-06',
		originator: 'codex_cli_rs',
		Upgrade: 'websocket',
		Connection: 'Upgrade',
		'Sec-WebSocket-Key': key,
		'Sec-WebSocket-Version': '13',
	};
	if (auth.tokens.account_id) headers['ChatGPT-Account-Id'] = auth.tokens.account_id;
	await new Promise((resolve, reject) => {
		const outgoing = request(endpoint, {method: 'GET', headers});
		outgoing.setTimeout(30000, () => outgoing.destroy(new Error('Handshake timeout')));
		outgoing.on('error', reject);
		outgoing.on('response', (response) => {
			response.resume();
			reject(new Error(`Handshake HTTP ${response.statusCode}`));
		});
		outgoing.on('upgrade', (response, remote, head) => {
			socket = remote;
			if (response.headers['sec-websocket-accept'] !== expected || response.headers['sec-websocket-extensions']) {
				remote.destroy();
				reject(new Error('Unexpected handshake'));
				return;
			}
			remote.setTimeout(90000, () => remote.destroy(new Error('Response timeout')));
			const inspect = frameObserver(false, (payload) => {
				const event = JSON.parse(payload.toString('utf8'));
				onEvent(event);
				receive?.(event);
			});
			remote.on('data', (chunk) => {
				try {
					inspect(chunk);
				} catch (error) {
					rejectPending?.(error);
					remote.destroy();
				}
			});
			remote.on('error', (error) => rejectPending?.(error));
			remote.on('close', () => rejectPending?.(new Error('Connection closed')));
			if (head.length) inspect(head);
			resolve();
		});
		outgoing.end();
	});
	return {
		async generate(body, onCall) {
			return new Promise((resolve, reject) => {
				const calls = [];
				let responseId;
				rejectPending = reject;
				receive = (event) => {
					if (event.type === 'response.created') responseId = event.response.id;
					if (event.type === 'response.output_item.done' && event.item.type === 'function_call')
						calls.push(onCall(event.item, responseId));
					if (event.type === 'response.completed') {
						receive = null;
						rejectPending = null;
						resolve({response: event.response, calls});
					}
					if (['error', 'response.failed', 'response.incomplete'].includes(event.type)) {
						const error = event.error ?? event.response?.error;
						reject(new Error(`${event.type}: ${error?.code ?? event.response?.status ?? 'unknown'}`));
					}
				};
				socket.write(textFrame(body));
			});
		},
		close() {
			receive = null;
			rejectPending = null;
			socket.destroy();
		},
	};
}

/** Validate eight exact synthetic records independently of any model claim. */
export function summarizeCalls(calls) {
	const groups = {};
	const events = [];
	for (const call of calls) {
		groups[call.responseId] = (groups[call.responseId] ?? 0) + 1;
		events.push([call.startMs, 1], [call.endMs, -1]);
	}
	let active = 0;
	let maximum = 0;
	for (const [, delta] of events.sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
		active += delta;
		maximum = Math.max(maximum, active);
	}
	const ids = calls.map((call) => call.id).sort((a, b) => a - b);
	return {
		allEightVerified:
			JSON.stringify(ids) === '[1,2,3,4,5,6,7,8]' &&
			calls.every((call) => call.output === JSON.stringify({id: call.id})),
		callsPerResponse: groups,
		maxCallsPerResponse: Math.max(0, ...Object.values(groups)),
		maxConcurrentExecutions: maximum,
	};
}

async function runModel(model, auth, destination) {
	const started = performance.now();
	const report = {
		model,
		effort,
		prompt,
		endpoint,
		transport: 'WebSocket',
		instructions: '',
		tools: [tool],
		parallelToolCalls: true,
		toolChoice: 'auto',
		probeDelayMs: delayMs,
		startedAt: new Date().toISOString(),
		requests: [],
		responses: [],
		calls: [],
		events: [],
		usage: {inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0},
		credentialsPersisted: false,
	};
	const save = () => fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
	let client;
	const pending = [];
	try {
		client = await connect(auth, (event) => {
			if (
				[
					'response.created',
					'response.completed',
					'response.failed',
					'response.incomplete',
					'error',
					'response.output_item.added',
					'response.output_item.done',
				].includes(event.type)
			) {
				report.events.push({
					atMs: performance.now() - started,
					type: event.type,
					responseId: event.response?.id ?? event.response_id ?? null,
					itemType: event.item?.type ?? null,
					callId: event.item?.call_id ?? null,
				});
			}
		});
		report.connectedMs = performance.now() - started;
		let input = [{role: 'user', content: prompt}];
		let previousResponseId;
		for (let index = 0; index < 12; index++) {
			const body = {
				type: 'response.create',
				model,
				instructions: '',
				input,
				tools: [tool],
				tool_choice: 'auto',
				parallel_tool_calls: true,
				reasoning: {effort},
				store: false,
				...(previousResponseId ? {previous_response_id: previousResponseId} : {}),
			};
			report.requests.push({atMs: performance.now() - started, body});
			save();
			const outcome = await client.generate(body, (item, responseId) => {
				const operation = (async () => {
					const args = JSON.parse(item.arguments);
					if (
						item.name !== 'probe' ||
						Object.keys(args).length !== 1 ||
						!Number.isInteger(args.id) ||
						args.id < 1 ||
						args.id > 8
					)
						throw new Error('Unexpected probe call');
					const record = {
						responseId,
						callId: item.call_id,
						id: args.id,
						startMs: performance.now() - started,
					};
					report.calls.push(record);
					await new Promise((resolve) => setTimeout(resolve, delayMs));
					record.endMs = performance.now() - started;
					record.output = JSON.stringify({id: args.id});
					return {type: 'function_call_output', call_id: item.call_id, output: record.output};
				})();
				pending.push(operation);
				operation.catch(() => {});
				return operation;
			});
			const response = outcome.response;
			report.responses.push({
				id: response.id,
				model: response.model,
				status: response.status,
				parallelToolCalls: response.parallel_tool_calls,
				completedMs: performance.now() - started,
				calls: outcome.calls.length,
				usage: response.usage,
			});
			if (response.model !== model) throw new Error('Response model differs from requested model');
			if (response.parallel_tool_calls !== true) throw new Error('Response parallel flag differs from request');
			const usage = response.usage ?? {};
			report.usage.inputTokens += usage.input_tokens ?? 0;
			report.usage.cachedInputTokens += usage.input_tokens_details?.cached_tokens ?? 0;
			report.usage.outputTokens += usage.output_tokens ?? 0;
			report.usage.reasoningOutputTokens += usage.output_tokens_details?.reasoning_tokens ?? 0;
			input = await Promise.all(outcome.calls);
			previousResponseId = response.id;
			save();
			if (report.calls.length >= 8 || outcome.calls.length === 0) break;
		}
		report.status = 'finished';
	} catch (error) {
		report.status = 'error';
		report.error = error.message;
	} finally {
		await Promise.allSettled(pending);
		client?.close();
		report.resourcesClosed = true;
		report.elapsedMs = performance.now() - started;
		report.completedAt = new Date().toISOString();
		Object.assign(report, summarizeCalls(report.calls));
		save();
	}
	console.log(
		JSON.stringify({
			model,
			status: report.status,
			error: report.error,
			elapsedMs: report.elapsedMs,
			allEightVerified: report.allEightVerified,
			maxCallsPerResponse: report.maxCallsPerResponse,
			maxConcurrentExecutions: report.maxConcurrentExecutions,
			requests: report.requests.length,
			usage: report.usage,
		}),
	);
	return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const attempt = process.argv.find((arg) => arg.startsWith('--attempt='))?.slice(10);
	if (!attempt || !/^[a-z0-9-]+$/.test(attempt)) throw new Error('Supply a unique --attempt');
	const output = path.join(root, '.codex-tmp/minimal-parallel-20260928', attempt);
	if (fs.existsSync(output)) throw new Error('Preserve existing attempt');
	const auth = JSON.parse(
		fs.readFileSync(path.join(process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex'), 'auth.json'), 'utf8'),
	);
	if (!auth.tokens?.access_token) throw new Error('Existing ChatGPT Codex authentication is required');
	fs.mkdirSync(output, {recursive: true});
	for (const model of models) {
		const report = await runModel(model, auth, path.join(output, `${model}.json`));
		if (report.status === 'error') {
			process.exitCode = 1;
			break;
		}
	}
}
