import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fork, spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {randomBytes, createHash} from 'node:crypto';

const workspace = fileURLToPath(new URL('../../../../', import.meta.url));
const pageArgument = process.argv.find((value) => value.startsWith('--page-bytes='));
const pageBytes = Number(pageArgument?.slice(13) ?? 7000);
const parallelProbe = process.argv.includes('--parallel-probe');
const nativeProbe = process.argv.includes('--native-probe');
const disableCodeHost = process.argv.includes('--disable-code-host');
const directNamespace = process.argv.find((value) => value.startsWith('--direct-namespace='))?.slice(19);
if (directNamespace && !/^[a-zA-Z0-9_]+$/.test(directNamespace)) throw new Error('Invalid direct tool namespace');
const catalogArgument = process.argv.find((value) => value.startsWith('--model-catalog='))?.slice(16);
const catalogPath = catalogArgument ? path.resolve(workspace, catalogArgument) : null;
const probe = process.argv.includes('--probe') || parallelProbe || nativeProbe;
const windowExperiment = Boolean(pageArgument) || probe;
const output = path.join(
	workspace,
	windowExperiment ? '.codex-tmp/ux-read-window-20260928' : '.codex-tmp/ux-collection-phase-20260928',
);
const tooling = path.join(workspace, '.codex-tmp/ux-mcp-replay-20260928');
fs.mkdirSync(output, {recursive: true});
const prior = path.join(workspace, '.codex-tmp/ux-comparison-replay-20260928-160822');
const codexBinary =
	'C:/Users/gande/.vscode/extensions/openai.chatgpt-26.917.62051-win32-x64/bin/windows-x86_64/codex.exe';
const run = 'ux-mcp-replay-20260928';
const smoke = process.argv.includes('--smoke');
const attemptName =
	process.argv.find((value) => value.startsWith('--attempt='))?.slice(10) ?? (smoke ? 'preflight' : 'attempt-01');
if (!/^[a-z0-9-]+$/.test(attemptName)) throw new Error('Invalid attempt name');
const attempt = path.join(output, attemptName);
if (fs.existsSync(path.join(attempt, 'control.json'))) throw new Error('Attempt already exists; preserve evidence');
fs.mkdirSync(attempt, {recursive: true});
const token = randomBytes(32).toString('hex');
const environment = {
	...process.env,
	POLYLITH_MCP_TOKEN: token,
	POLYLITH_MCP_PAGE_BYTES: String(pageBytes),
	RUST_LOG: 'warn,codex_core::stream_events_utils=debug,codex_core::tools::parallel=debug',
};
const control = {
	experiment: windowExperiment ? 'ux-read-window' : 'prescribed-collection-phase',
	pageBytes,
	probe,
	parallelProbe,
	nativeProbe,
	disableCodeHost,
	directNamespace: directNamespace ?? null,
	modelCatalogOverride: catalogPath
		? {path: catalogPath, sha256: createHash('sha256').update(fs.readFileSync(catalogPath)).digest('hex')}
		: null,
	startedAt: new Date().toISOString(),
	run,
	workspace,
	transport: 'resident workflow MCP over localhost HTTP',
	status: 'preparing',
	smoke,
};
const save = () => fs.writeFileSync(path.join(attempt, 'control.json'), JSON.stringify(control, null, 2));
save();
const timeline = fs.createWriteStream(path.join(attempt, 'service-observations.jsonl'));
const serverStart = performance.now();
let server;
try {
	server = fork(path.join(tooling, 'server-observer.mjs'), [workspace, '0'], {
		env: environment,
		stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
		windowsHide: true,
	});
} catch (error) {
	Object.assign(control, {
		status: 'host-launch-error',
		error: error.code ?? error.message,
		completedAt: new Date().toISOString(),
	});
	save();
	timeline.end();
	throw error;
}
server.stdout.pipe(fs.createWriteStream(path.join(attempt, 'server-stdout.private.log')));
server.stderr.pipe(fs.createWriteStream(path.join(attempt, 'server-stderr.log')));
server.on('message', (message) => {
	if (message.event === 'service-observation') {
		timeline.write(JSON.stringify(message) + '\n');
		if (message.phase) {
			control.lastPhase = message.phase;
			control.lastPhaseAt = message.endedAt;
			save();
		}
		if (message.isPlan) {
			control.planHandle = message.handle;
			control.planDeliveredAt = message.endedAt;
			save();
		}
	}
});
const ready = await new Promise((resolve, reject) => {
	server.on('message', (message) => {
		if (message.event === 'ready') resolve(message);
	});
	server.once('error', reject);
	server.once('exit', (code) => reject(new Error(`Server exited before ready: ${code}`)));
});
Object.assign(control, {
	serverPid: server.pid,
	instance: ready.instance,
	serverStartupMs: performance.now() - serverStart,
	readLimits: ready.readLimits,
});
save();
let rpcId = 0;
const call = async (name, args) => {
	const begin = performance.now();
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
			id: ++rpcId,
			method: 'tools/call',
			params: {name: `workflow_${name}`, arguments: args},
		}),
	});
	const payload = await response.json();
	if (!response.ok || payload.error || payload.result?.isError)
		throw new Error(
			`Preflight ${name}: ${payload.error?.message ?? payload.result?.content?.[0]?.text ?? response.status}`,
		);
	const result = JSON.parse(payload.result.content[0].text);
	fs.appendFileSync(
		path.join(attempt, 'supervisor-rpc-metrics.jsonl'),
		JSON.stringify({at: new Date().toISOString(), tool: name, elapsedMs: performance.now() - begin}) + '\n',
	);
	return result;
};
let child, eventLog;
try {
	await call('open', {access: ready.access, run});
	const manifest = JSON.parse(fs.readFileSync(path.join(prior, 'manifest.json')));
	const inputs = {};
	for (const name of ['facts', 'ux']) {
		const source = manifest.sources.find((item) => item.name === name);
		const raw = fs.readFileSync(source.path);
		if (createHash('sha256').update(raw).digest('hex') !== source.sha256) throw new Error(`Changed input ${name}`);
		inputs[name] = await call('store', {access: ready.access, run, file: source.path});
		const saved = JSON.parse(fs.readFileSync(inputs[name].path));
		if (JSON.stringify(saved) !== JSON.stringify(JSON.parse(raw))) throw new Error(`Lossy input ${name}`);
	}
	const assigned = await call('assign', {
		access: ready.access,
		run,
		operations: ['result.store'],
		handles: Object.values(inputs).map((value) => value.handle),
	});
	await call('status', {access: assigned.access, run});
	fs.writeFileSync(path.join(attempt, 'input-receipts.json'), JSON.stringify(inputs, null, 2));
	fs.writeFileSync(path.join(attempt, 'connection.private.json'), JSON.stringify({...ready, token, assigned}));
	if (smoke) {
		const receipt = await call('store', {
			access: assigned.access,
			run,
			value: {kind: 'ux-replay-preflight', ok: true},
		});
		const page = await call('read', {access: assigned.access, handle: receipt.handle, maxBytes: 7000});
		if (JSON.parse(page.text).ok !== true || page.nextOffset !== null)
			throw new Error('Store/read round trip mismatch');
		Object.assign(control, {
			status: 'preflight-passed',
			savedInputBytes: Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, value.bytes])),
		});
	} else {
		let assignment = fs.readFileSync(
			new URL(
				nativeProbe
					? '../ux-read-window/native-assignment.md'
					: parallelProbe
						? '../ux-read-window/parallel-assignment.md'
						: windowExperiment
							? '../ux-read-window/assignment.md'
							: './assignment.md',
				import.meta.url,
			),
			'utf8',
		);
		for (const [name, value] of Object.entries({
			RUN: run,
			ACCESS: assigned.access,
			FACTS: inputs.facts.handle,
			UX: inputs.ux.handle,
			PAGE_BYTES: String(pageBytes),
		}))
			assignment = assignment.replaceAll(`{{${name}}}`, value);
		const prompt =
			parallelProbe || nativeProbe
				? assignment
				: probe
					? `Run ONLY this authorized MCP client delivery probe. Do not spawn agents, load role guidance, inspect product files or perform product reasoning. No file fallback. The test server explicitly permits larger windows; leave client output-token limits at their existing defaults.
Assigned access: ${assigned.access}. Run: ${run}. Facts handle: ${inputs.facts.handle}. UX handle: ${inputs.ux.handle}.
For facts first and then UX, call workflow_read at offset 0, separately for each maxBytes in [7000,14000,28000,56000]. Emit each complete raw tool result in its own command. Do not shorten, transform, summarize, combine results, generate helper programs or increase the normal output allowance. Ignore nextOffset because these are independent first-page probes, not full acquisition. If a page is visibly truncated, note its handle and size in the final response but continue the remaining independent probes; never reread the same page. Stop only on a tool error. Saved tool responses will be checked mechanically by an external analyzer. Do not calculate hashes yourself.
After the eight reads, workflow_store with the assigned access/run and value {kind:"ux-replay-phase",phase:"inputs-ready"}. Return only probe completion and any observed truncation. The product is unchanged.`
					: `Run this authorized isolated collection experiment only. You are a dispatch supervisor, not the UX author. Do not inspect product contents, reports or completed answers. No Git, research, review or canonical work.
First verify workflow_status with assigned access ${assigned.access}, run ${run}. Missing MCP is an error; no fallback.
Spawn ONE fresh ux-planner, fork_turns="none", task_name="ux_collection_phase". Do not override its configured model or effort. Give this exact assignment:
<assignment>
${assignment}
</assignment>
Wait for READY and the inputs-ready marker handle, then return the child identity, marker handle and concise status. Stop there: do not send a comparison follow-up or ask the agent to repeat or explain data. Do not spawn other agents or restart it. The external server and timing observer are running. Workspace: ${workspace}.`;
		fs.writeFileSync(path.join(attempt, 'prompt.private.txt'), prompt);
		const args = [
			'exec',
			'--json',
			'-C',
			workspace,
			'--approve-for-me',
			'-c',
			`mcp_servers.polylith_workflows.url=${JSON.stringify(ready.url)}`,
			'-c',
			'mcp_servers.polylith_workflows.bearer_token_env_var="POLYLITH_MCP_TOKEN"',
			'-c',
			'mcp_servers.polylith_workflows.required=true',
			'-o',
			path.join(attempt, 'result.md'),
			'-',
		];
		if (disableCodeHost) args.splice(1, 0, '--disable', 'code_mode_host');
		if (catalogPath) args.splice(1, 0, '-c', `model_catalog_json=${JSON.stringify(catalogPath)}`);
		if (directNamespace)
			args.splice(
				1,
				0,
				'-c',
				'features.code_mode.enabled=true',
				'-c',
				`features.code_mode.direct_only_tool_namespaces=${JSON.stringify([directNamespace])}`,
			);
		const agentStart = performance.now();
		child = spawn(codexBinary, args, {env: environment, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true});
		Object.assign(control, {status: 'running', childPid: child.pid, agentStartedAt: new Date().toISOString()});
		save();
		eventLog = fs.createWriteStream(path.join(attempt, 'events.private.jsonl'));
		child.stderr.pipe(fs.createWriteStream(path.join(attempt, 'codex-stderr.log')));
		createInterface({input: child.stdout}).on('line', (line) => {
			let data;
			try {
				data = JSON.parse(line);
			} catch {
				data = {type: 'unparsed'};
			}
			eventLog.write(
				JSON.stringify({at: new Date().toISOString(), observedMs: performance.now() - agentStart, data}) + '\n',
			);
			if (data.type === 'thread.started') {
				control.threadId = data.thread_id;
				save();
			}
			if (data.type === 'item.completed' && data.item?.type === 'agent_message')
				fs.appendFileSync(
					path.join(attempt, 'progress.log'),
					new Date().toISOString() + ' ' + data.item.text + '\n',
				);
			if (data.type === 'turn.completed') {
				control.reportedUsage = data.usage;
				save();
			}
		});
		child.stdin.end(prompt);
		console.log(
			JSON.stringify({
				status: 'running',
				threadId: control.threadId,
				attempt,
				serverPid: server.pid,
				childPid: child.pid,
			}),
		);
		const [exitCode] = await once(child, 'close');
		Object.assign(control, {
			status: exitCode === 0 ? 'finished' : 'client-error',
			exitCode,
			agentCompletedAt: new Date().toISOString(),
			agentWindowMs: performance.now() - agentStart,
		});
		if (control.lastPhase !== 'inputs-ready') {
			const nativeResult =
				nativeProbe && exitCode === 0 ? fs.readFileSync(path.join(attempt, 'result.md'), 'utf8') : '';
			if (nativeProbe && exitCode === 0 && nativeResult.includes('NATIVE_UNAVAILABLE'))
				control.status = 'native-unavailable';
			else if (nativeResult.startsWith('NATIVE_NOT_COMPLETED:')) control.status = 'native-incomplete';
			else throw new Error('Collection did not reach inputs-ready');
		}
		if (control.planHandle) {
			const digest = control.planHandle.split(':')[1];
			const location = path.join(workspace, '.codex-tmp/mcp-workflows/runs', run, 'results', digest + '.json');
			const raw = fs.readFileSync(location);
			if (createHash('sha256').update(raw).digest('hex') !== digest)
				throw new Error('Delivered plan hash mismatch');
			fs.writeFileSync(path.join(attempt, 'change-plan.json'), raw);
			control.planBytes = raw.length;
		}
	}
} catch (error) {
	Object.assign(control, {status: 'error', error: error.message});
	process.exitCode = 1;
} finally {
	eventLog?.end();
	if (server.connected) {
		const closed = once(server, 'exit');
		server.send('stop');
		await closed;
	}
	timeline.end();
	const metrics = path.join(workspace, '.codex-tmp/mcp-workflows', `metrics-${ready.instance}.json`);
	if (fs.existsSync(metrics)) fs.copyFileSync(metrics, path.join(attempt, 'server-metrics.json'));
	control.completedAt = new Date().toISOString();
	save();
}
console.log(JSON.stringify(control));
