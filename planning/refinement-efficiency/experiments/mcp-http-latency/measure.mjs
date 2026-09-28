import assert from 'node:assert/strict';
import {fork, spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {createWriteStream, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {Agent, request} from 'node:http';
import {dirname, join, resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const output = resolve(process.argv[2] ?? '.codex-tmp/mcp-http-latency');
mkdirSync(output, {recursive: true});
const token = randomBytes(32).toString('hex');
const environment = {...process.env, MCP_HTTP_PROBE_TOKEN: token};
const startedAt = new Date().toISOString();
const start = performance.now();
const server = fork(join(directory, 'server.mjs'), [join(output, 'server-samples.json')], {
	env: environment,
	stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
	windowsHide: true,
});
const [ready] = await once(server, 'message');
const startupMs = performance.now() - start;
const agent = new Agent({keepAlive: true, maxSockets: 1});
let nextId = 0;
const allRequests = [];
const post = (method, params, label, pooled = true, notification = false) =>
	new Promise((resolveRequest, reject) => {
		const id = notification ? undefined : ++nextId;
		const body = JSON.stringify({jsonrpc: '2.0', id, method, params});
		const begin = performance.now();
		const call = request(
			ready.url,
			{
				method: 'POST',
				agent: pooled ? agent : false,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/json, text/event-stream',
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(body),
					'MCP-Protocol-Version': '2025-06-18',
				},
			},
			(response) => {
				const chunks = [];
				response.on('data', (chunk) => chunks.push(chunk));
				response.on('error', reject);
				response.on('end', () => {
					try {
						const receivedMs = performance.now() - begin;
						const buffer = Buffer.concat(chunks);
						const parsed = buffer.length ? JSON.parse(buffer.toString('utf8')) : null;
						const roundTripMs = performance.now() - begin;
						assert.equal(response.statusCode, notification ? 202 : 200);
						if (!notification) {
							assert.equal(parsed.id, id);
							assert.ok(!parsed.error);
						}
						const sample = {
							label,
							id,
							method,
							pooled,
							requestBodyBytes: Buffer.byteLength(body),
							responseBodyBytes: buffer.length,
							receivedMs,
							roundTripMs,
							serverHandlingMs: response.headers['server-timing']
								? Number(response.headers['server-timing'].split('=')[1])
								: null,
							reusedSocket: call.reusedSocket,
						};
						allRequests.push(sample);
						resolveRequest({parsed, sample});
					} catch (error) {
						reject(error);
					}
				});
			},
		);
		call.on('error', reject);
		call.setTimeout(10000, () => call.destroy(new Error('HTTP request timed out')));
		call.end(body);
	});
const summarize = (samples) => {
	const ordered = samples.map((sample) => sample.roundTripMs).sort((left, right) => left - right);
	return {
		count: ordered.length,
		minMs: ordered[0],
		medianMs: ordered[Math.ceil(ordered.length * 0.5) - 1],
		p95Ms: ordered[Math.ceil(ordered.length * 0.95) - 1],
		maxMs: ordered.at(-1),
		meanMs: ordered.reduce((sum, value) => sum + value, 0) / ordered.length,
		meanServerHandlingMs: samples.reduce((sum, sample) => sum + sample.serverHandlingMs, 0) / samples.length,
		responseBodyBytes: samples[0].responseBodyBytes,
		reusedConnections: samples.filter((sample) => sample.reusedSocket).length,
	};
};
let codexMetrics = null;
const cases = [];
try {
	await post(
		'initialize',
		{
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: {name: 'deterministic-latency-client', version: '1'},
		},
		'initialize',
	);
	await post('notifications/initialized', {}, 'initialized', true, true);
	await post('tools/list', {}, 'tools-list');
	for (const pooled of [true, false]) {
		for (const bytes of [128, 4096, 8192, 58388]) {
			const label = `${pooled ? 'keepalive' : 'new-connection'}-${bytes}`;
			const samples = [];
			for (let iteration = 0; iteration < 110; iteration++) {
				const result = await post(
					'tools/call',
					{name: 'get_probe', arguments: {bytes, caller: label}},
					iteration < 10 ? `${label}-warmup` : label,
					pooled,
				);
				assert.equal(result.parsed.result._meta.instance, ready.instance);
				assert.equal(result.parsed.result.content[0].text, 'x'.repeat(bytes));
				if (iteration >= 10) samples.push(result.sample);
			}
			cases.push({label, payloadBytes: bytes, pooled, warmupCount: 10, ...summarize(samples)});
		}
	}
	console.log(JSON.stringify({event: 'direct-benchmark-complete', cases}));
	if (process.argv[3]) {
		const prompt =
			'This is a bounded localhost MCP latency test. Use the http_probe get_probe tool exactly five times sequentially with bytes=128 and caller=codex. Inspect each result before the next call. Do not spawn agents, browse, read files, run shell commands, or change any data. Do not reproduce the payload. After five successful calls, say only that five calls succeeded. If the tool is unavailable or fails, report that and stop. Retain the default model settings.';
		const args = [
			'exec',
			'--json',
			'-C',
			output,
			'-c',
			`mcp_servers.http_probe.url=${JSON.stringify(ready.url)}`,
			'-c',
			'mcp_servers.http_probe.bearer_token_env_var="MCP_HTTP_PROBE_TOKEN"',
			'-c',
			'mcp_servers.http_probe.required=true',
			'-c',
			'mcp_servers.openaiDeveloperDocs.enabled=false',
			'-o',
			join(output, 'codex-result.txt'),
			'-',
		];
		const codexBegin = performance.now();
		const codex = spawn(process.argv[3], args, {
			env: environment,
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
		});
		const eventLog = createWriteStream(join(output, 'codex-events.jsonl'));
		const errorLog = createWriteStream(join(output, 'codex-stderr.log'));
		codex.stderr.pipe(errorLog);
		const events = [];
		createInterface({input: codex.stdout}).on('line', (line) => {
			const event = {
				observedMs: performance.now() - codexBegin,
				time: new Date().toISOString(),
				data: JSON.parse(line),
			};
			events.push(event);
			eventLog.write(`${JSON.stringify(event)}\n`);
		});
		codex.stdin.end(prompt);
		const [exitCode] = await once(codex, 'close');
		eventLog.end();
		errorLog.end();
		const starts = new Map();
		const intervals = [];
		for (const event of events) {
			if (event.data.item?.type !== 'mcp_tool_call') continue;
			if (event.data.type === 'item.started') starts.set(event.data.item.id, event.observedMs);
			if (event.data.type === 'item.completed')
				intervals.push({
					itemId: event.data.item.id,
					status: event.data.item.status,
					durationMs: event.observedMs - starts.get(event.data.item.id),
				});
		}
		codexMetrics = {
			exitCode,
			elapsedMs: performance.now() - codexBegin,
			toolIntervals: intervals,
			reportedUsage: events.findLast((event) => event.data.type === 'turn.completed')?.data.usage,
		};
		assert.equal(exitCode, 0);
		assert.equal(intervals.length, 5);
		assert.ok(intervals.every((interval) => interval.status === 'completed'));
	}
} finally {
	agent.destroy();
	const closed = once(server, 'exit');
	server.send('stop');
	await closed;
	const serverEvidence = JSON.parse(readFileSync(join(output, 'server-samples.json'), 'utf8'));
	const metrics = {
		startedAt,
		completedAt: new Date().toISOString(),
		nodeVersion: process.version,
		host: process.platform,
		startupMs,
		server: ready,
		transport: 'MCP Streamable HTTP, stateless JSON responses over unencrypted 127.0.0.1 loopback, no compression',
		concurrency: 1,
		timing: 'Client roundTripMs starts immediately before http.request and ends after complete response receipt and JSON parsing; request serialization and validation assertions are outside it. Server handling includes body receipt, parsing, selection and response serialization; excludes socket send and sample recording.',
		cases,
		codex: codexMetrics,
		allRequests,
		serverEvidence,
	};
	writeFileSync(join(output, 'metrics.json'), JSON.stringify(metrics, null, 2));
	console.log(JSON.stringify({event: 'finished', output, codex: codexMetrics}));
}
