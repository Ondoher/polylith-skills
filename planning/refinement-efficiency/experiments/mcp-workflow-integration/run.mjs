// Bounded live proof. Owns a disposable workspace and one service; never reads Alexa.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fork, spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {randomBytes} from 'node:crypto';

const output = path.resolve(process.argv[2] ?? '.codex-tmp/mcp-live');
const codexBinary = process.argv[3];
if (!codexBinary) throw new Error('Supply output directory and installed Codex executable');
fs.mkdirSync(output, {recursive: true});
const workspace = path.join(output, 'workspace');
fs.mkdirSync(workspace, {recursive: true});
const token = randomBytes(32).toString('hex');
const environment = {...process.env, POLYLITH_MCP_TOKEN: token};
const startedAt = new Date().toISOString();
const begin = performance.now();
const server = fork(fileURLToPath(new URL('../../../../scripts/mcp-server.mjs', import.meta.url)), [workspace], {
	env: environment,
	stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
	windowsHide: true,
});
server.stdout.pipe(fs.createWriteStream(path.join(output, 'server-stdout.log')));
server.stderr.pipe(fs.createWriteStream(path.join(output, 'server-stderr.log')));
const [ready] = await once(server, 'message');
const startupMs = performance.now() - begin;
let id = 0;
const call = async (name, args) => {
	const response = await fetch(ready.url, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${token}`,
			'content-type': 'application/json',
			accept: 'application/json, text/event-stream',
			'mcp-protocol-version': '2025-06-18',
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: ++id,
			method: 'tools/call',
			params: {name: `workflow_${name}`, arguments: args},
		}),
	});
	const value = await response.json();
	assert.ok(!value.error, JSON.stringify(value.error));
	assert.ok(!value.result.isError, value.result.content[0].text);
	return JSON.parse(value.result.content[0].text);
};
let metrics;
try {
	const run = (await call('open', {access: ready.access, run: 'live-proof'})).run;
	const fact = 'The content picker returns the chosen item to the requesting form.';
	const input = await call('store', {access: ready.access, run, value: {fact}});
	const assignment = await call('assign', {
		access: ready.access,
		run,
		operations: ['result.store'],
		handles: [input.handle],
	});
	const prompt = `This is an authorized, bounded MCP delivery integration proof. Spawn exactly one ux-planner specialist to exercise its installed scoped delivery instructions. Give it this assignment: use workflow_read with access ${assignment.access} and handle ${input.handle}; then use workflow_store with access ${assignment.access}, run ${run}, and value {received:true,fact:<the exact fact read>}. Return only the saved handle and short status. This is a delivery test, not UX design or product refinement. No browsing, design changes, canonical writes, additional agents or scripts are needed. The specialist may load its required role instructions. After its response, you must use workflow_read with the same assigned capability to retrieve the returned handle and verify the fact. Do not echo capabilities or large payloads. In your final response return only JSON {"handle":"<saved result handle>","verified":true}. Do not create another agent if a tooling failure occurs; report the failure.`;
	const args = [
		'exec',
		'--json',
		'-C',
		workspace,
		'-c',
		`mcp_servers.polylith_workflows.url=${JSON.stringify(ready.url)}`,
		'-c',
		'mcp_servers.polylith_workflows.bearer_token_env_var="POLYLITH_MCP_TOKEN"',
		'-c',
		'mcp_servers.polylith_workflows.required=true',
		'-c',
		'mcp_servers.openaiDeveloperDocs.enabled=false',
		'-o',
		path.join(output, 'result.txt'),
		'-',
	];
	const modelBegin = performance.now();
	const child = spawn(codexBinary, args, {env: environment, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true});
	const events = [];
	const eventLog = fs.createWriteStream(path.join(output, 'events.private.jsonl'));
	child.stderr.pipe(fs.createWriteStream(path.join(output, 'codex-stderr.log')));
	createInterface({input: child.stdout}).on('line', (line) => {
		const event = {observedMs: performance.now() - modelBegin, data: JSON.parse(line)};
		events.push(event);
		eventLog.write(`${JSON.stringify(event)}\n`);
	});
	child.stdin.end(prompt);
	const [exitCode] = await once(child, 'close');
	eventLog.end();
	const elapsedMs = performance.now() - modelBegin;
	assert.equal(exitCode, 0);
	const final = JSON.parse(
		fs
			.readFileSync(path.join(output, 'result.txt'), 'utf8')
			.trim()
			.replace(/^```json\s*|\s*```$/g, ''),
	);
	assert.equal(final.verified, true);
	const saved = await call('read', {access: ready.access, handle: final.handle});
	assert.deepEqual(JSON.parse(saved.text), {received: true, fact});
	const starts = new Map();
	const intervals = [];
	for (const event of events) {
		if (event.data.item?.type !== 'mcp_tool_call') continue;
		if (event.data.type === 'item.started') starts.set(event.data.item.id, event.observedMs);
		if (event.data.type === 'item.completed')
			intervals.push({
				tool: event.data.item.tool,
				status: event.data.item.status,
				durationMs: event.observedMs - starts.get(event.data.item.id),
			});
	}
	metrics = {
		startedAt,
		completedAt: new Date().toISOString(),
		startupMs,
		instance: ready.instance,
		exitCode,
		agentWindowMs: elapsedMs,
		verified: true,
		receiptBytes: saved.totalBytes,
		toolIntervals: intervals,
		reportedUsage: events.findLast((event) => event.data.type === 'turn.completed')?.data.usage ?? null,
		limits: [
			'One bounded real specialist delivery; no whole-refinement timing.',
			'Nested-agent timing/usage is included only where the client exposes it.',
			'Private raw events remain in ignored scratch; metrics omit capabilities and payloads.',
		],
	};
} finally {
	const closed = once(server, 'exit');
	server.send('stop');
	await closed;
	const serverMetrics = JSON.parse(
		fs.readFileSync(path.join(workspace, '.codex-tmp/mcp-workflows', `metrics-${ready.instance}.json`)),
	);
	fs.writeFileSync(path.join(output, 'metrics.json'), JSON.stringify({...metrics, server: serverMetrics}, null, 2));
}
process.stdout.write(
	`${JSON.stringify({verified: metrics.verified, startupMs: metrics.startupMs, agentWindowMs: metrics.agentWindowMs, reportedUsage: metrics.reportedUsage, output})}\n`,
);
