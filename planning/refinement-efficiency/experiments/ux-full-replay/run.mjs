import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {fork, spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {createHash, randomBytes} from 'node:crypto';
import {prepareNativeWorkflowCatalog} from '../../../../scripts/native-workflow-catalog.mjs';
import {startLiveRequestObserver} from '../ux-read-window/live-request-observer.mjs';
import {verifyObserverTrust} from '../incremental-ux-replay/observer-trust.mjs';

const governance = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const attemptName = process.argv.find((arg) => arg.startsWith('--attempt='))?.slice(10);
assert(attemptName && /^[a-z0-9-]+$/.test(attemptName), 'Supply a unique attempt');
const executeModel = process.argv.includes('--execute');
const requestedAt =
	process.argv.find((arg) => arg.startsWith('--requested-at='))?.slice(15) ?? new Date().toISOString();
assert(Number.isFinite(Date.parse(requestedAt)) && Date.parse(requestedAt) <= Date.now(), 'Invalid request start time');
const resumeName = process.argv.find((arg) => arg.startsWith('--resume='))?.slice(9);
assert(!resumeName || /^[a-z0-9-]+$/.test(resumeName), 'Invalid resume attempt');
const previousDirectory = resumeName && path.join(governance, '.codex-tmp/ux-full-native-20260929', resumeName);
const previous = previousDirectory && JSON.parse(fs.readFileSync(path.join(previousDirectory, 'control.json')));
assert(
	!previous ||
		(previous.liveUnchanged &&
			(previous.status === 'prepared' || (previous.agentCompletedAt && previous.threadId))),
	'Previous client must be stopped with live protection verified',
);
const attempt = path.join(governance, '.codex-tmp/ux-full-native-20260929', attemptName);
assert(!fs.existsSync(attempt), 'Preserve prior evidence');
fs.mkdirSync(attempt, {recursive: true});
const workspace = previous?.workspace ?? path.join(attempt, 'workspace');
assert(
	workspace.startsWith(path.join(governance, '.codex-tmp/ux-full-native-20260929') + path.sep),
	'Workspace must remain in the isolated replay directory',
);
const baseline = path.join(governance, '.codex-tmp/alexa-mcp-refinement-20260928-133745/baseline');
const manifest = JSON.parse(fs.readFileSync(path.join(baseline, 'manifest.json')));
const sha = (value) => createHash('sha256').update(value).digest('hex');
const control = {
	experiment: 'full-ux-native-replay',
	requestedAt: new Date(requestedAt).toISOString(),
	startedAt: new Date().toISOString(),
	workspace,
	run: 'ux-full-native-replay',
	status: 'preparing',
	model: 'gpt-6-astra',
	boundary:
		'Full UX authoring, structural repair, independent review and review-directed rework through an exact passing receipt; no UI generation.',
	...(previous
		? {resumedFrom: resumeName, originalRequestedAt: previous.originalRequestedAt ?? previous.requestedAt}
		: {}),
};
const save = () => fs.writeFileSync(path.join(attempt, 'control.json'), JSON.stringify(control, null, 2));
save();
const guard = () => {
	const files = {};
	const visit = (directory) => {
		for (const item of fs.readdirSync(directory, {withFileTypes: true})) {
			const location = path.join(directory, item.name);
			if (item.isDirectory()) visit(location);
			else if (item.isFile()) files[location] = sha(fs.readFileSync(location));
			else throw new Error('Unexpected linked live file');
		}
	};
	visit('C:/dev/alexa/product/Alexa');
	for (const location of [
		'C:/dev/alexa/agents/topics/alexa/product-description.md',
		'C:/dev/alexa/agents/topics/alexa/README.md',
	])
		files[location] = sha(fs.readFileSync(location));
	return files;
};
const protectedFiles = guard();
fs.writeFileSync(path.join(attempt, 'live-protection.json'), JSON.stringify(protectedFiles, null, 2));
const preparationStart = performance.now();
for (const item of previous ? [] : manifest.files) {
	const destination = path.resolve(workspace, item.path);
	assert(destination.startsWith(workspace + path.sep), 'Baseline path escapes workspace');
	const raw = fs.readFileSync(path.join(baseline, 'files', item.path));
	assert.equal(sha(raw), item.sha256, 'Baseline hash mismatch');
	fs.mkdirSync(path.dirname(destination), {recursive: true});
	fs.writeFileSync(destination, raw);
}
if (!previous)
	fs.writeFileSync(
		path.join(workspace, 'AGENTS.md'),
		'# Isolated UX replay\nBootstrap profile: instructions-only\nUse the assigned UX-only replay scope. Product writes remain within this disposable workspace. The parent repository owns governance; do not run Git or publish artifacts.\n',
	);
if (!previous) fs.writeFileSync(path.join(workspace, '.gitignore'), '/.codex-tmp/\n');
control.baselineCopyMs = performance.now() - preparationStart;
control.baselineFiles = previous ? 0 : manifest.files.length;
save();
const token = randomBytes(32).toString('hex');
const environment = {
	...process.env,
	POLYLITH_MCP_TOKEN: token,
	POLYLITH_MCP_PAGE_BYTES: '28000',
	RUST_LOG: 'warn,codex_core::stream_events_utils=debug,codex_core::tools::parallel=debug',
};
const server = fork(
	fileURLToPath(new URL('../incremental-ux-replay/server-observer.mjs', import.meta.url)),
	[workspace, '0'],
	{
		env: environment,
		stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
		windowsHide: true,
	},
);
server.stdout.pipe(fs.createWriteStream(path.join(attempt, 'server-stdout.private.log')));
server.stderr.pipe(fs.createWriteStream(path.join(attempt, 'server-stderr.log')));
const observations = fs.createWriteStream(path.join(attempt, 'service-observations.jsonl'));
server.on('message', (message) => {
	if (message.event === 'service-observation') {
		observations.write(JSON.stringify(message) + '\n');
		if (message.phase) {
			control.lastPhase = message.phase;
			control.lastPhaseAt = message.endedAt;
			save();
		}
	}
});
const ready = await new Promise((resolve, reject) => {
	server.on('message', (message) => {
		if (message.event === 'ready') resolve(message);
	});
	server.once('error', reject);
	server.once('exit', (code) => reject(new Error(`Server exited: ${code}`)));
});
control.serverPid = server.pid;
control.instance = ready.instance;
save();
fs.writeFileSync(path.join(attempt, 'connection.private.json'), JSON.stringify({...ready, token, run: control.run}));
let rpcId = 0,
	child,
	events,
	observer;
const call = async (name, args) => {
	const started = performance.now();
	const response = await fetch(ready.url, {
		method: 'POST',
		headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: ++rpcId,
			method: 'tools/call',
			params: {name: `workflow_${name}`, arguments: args},
		}),
	});
	const payload = await response.json();
	if (!response.ok || payload.error || payload.result?.isError)
		throw new Error(payload.error?.message ?? payload.result?.content?.[0]?.text ?? `HTTP ${response.status}`);
	fs.appendFileSync(
		path.join(attempt, 'supervisor-rpc-metrics.jsonl'),
		JSON.stringify({at: new Date().toISOString(), tool: name, elapsedMs: performance.now() - started}) + '\n',
	);
	return JSON.parse(payload.result.content[0].text);
};
try {
	await call('open', {
		access: ready.access,
		run: control.run,
		sourcePath: 'agents/topics/alexa/product-description.md',
		currentPath: 'product/Alexa/current.json',
	});
	let inputs, plan;
	if (previous) {
		inputs = JSON.parse(fs.readFileSync(path.join(previousDirectory, 'input-receipts.json')));
		plan = JSON.parse(fs.readFileSync(path.join(previousDirectory, 'input-read-plan.json')));
	} else {
		const facts = await call('execute', {
			access: ready.access,
			run: control.run,
			operation: 'product.prepare',
			input: {},
		});
		const savedFacts = JSON.parse(fs.readFileSync(facts.path));
		const priorFacts = JSON.parse(
			fs.readFileSync(path.join(governance, '.codex-tmp/ux-comparison-replay-20260928-160822/inputs/facts.json')),
		);
		assert.deepEqual(savedFacts.productModelBinding, priorFacts.productModelBinding);
		assert.deepEqual(savedFacts.productModel, priorFacts.productModel);
		const ux = await call('store', {access: ready.access, run: control.run, file: 'product/Alexa/ux/ux-spec.json'});
		inputs = {facts, ux};
		plan = [];
		for (const [name, receipt] of Object.entries(inputs)) {
			let offset = 0;
			const parts = [];
			do {
				const page = await call('read', {
					access: ready.access,
					handle: receipt.handle,
					offset,
					maxBytes: 28000,
				});
				parts.push(Buffer.from(page.text));
				plan.push({source: name, handle: receipt.handle, offset, maxBytes: 28000, nextOffset: page.nextOffset});
				offset = page.nextOffset;
			} while (offset !== null);
			assert.equal(sha(Buffer.concat(parts)), receipt.sha256, 'Full input page coverage must be exact');
		}
	}
	const {facts, ux} = inputs;
	fs.writeFileSync(path.join(attempt, 'input-receipts.json'), JSON.stringify(inputs, null, 2));
	fs.writeFileSync(path.join(attempt, 'input-read-plan.json'), JSON.stringify(plan, null, 2));
	const compactPlan = plan.map(({nextOffset, ...entry}) => entry);
	const catalog = prepareNativeWorkflowCatalog({
		sourcePath: path.join(process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex'), 'models_cache.json'),
		directory: path.join(attempt, 'catalog'),
		model: control.model,
	});
	control.catalog = catalog;
	control.inputReadCount = plan.length;
	control.inputBytes = facts.bytes + ux.bytes;
	control.preparationMs = performance.now() - preparationStart;
	control.status = 'prepared';
	control.preparedAt = new Date().toISOString();
	save();
	if (executeModel) {
		control.observerTrust = await verifyObserverTrust();
		save();
		observer = await startLiveRequestObserver(path.join(attempt, 'live-request-metadata.json'));
		const prompt = previous?.threadId
			? fs.readFileSync(new URL('./resume-assignment.md', import.meta.url), 'utf8') +
				`\nWorkspace: ${workspace}\nNew parent MCP access: ${ready.access}\nExisting run: ${control.run}\nSupervisor attempt: ${attempt}\n`
			: fs.readFileSync(new URL('./assignment.md', import.meta.url), 'utf8') +
				`\nWorkspace: ${workspace}\nParent MCP access: ${ready.access}\nOpened run: ${control.run}\nFacts handle: ${facts.handle}\nPrior UX handle: ${ux.handle}\nComplete immutable input read plan (replace parent access with specialist access in its assignment):\n${JSON.stringify(compactPlan)}\n`;
		fs.writeFileSync(path.join(attempt, 'prompt.private.txt'), prompt);
		control.promptSha256 = sha(prompt);
		control.roleHashes = Object.fromEntries(
			['ux-planner', 'ux-reviewer'].map((name) => [
				name,
				sha(fs.readFileSync(path.join(governance, 'agents', name + '.toml'))),
			]),
		);
		const binary =
			'C:/Users/gande/.vscode/extensions/openai.chatgpt-26.917.62051-win32-x64/bin/windows-x86_64/codex.exe';
		const args = [
			path.join(governance, 'scripts/codex-native-workflows.mjs'),
			`--model=${control.model}`,
			`--binary=${binary}`,
			`--cache=${catalog.path}`,
			'--',
			'exec',
			'--json',
			'-C',
			workspace,
			'--add-dir',
			governance,
			'--approve-for-me',
			'-c',
			`mcp_servers.polylith_workflows.url=${JSON.stringify(ready.url)}`,
			'-c',
			'mcp_servers.polylith_workflows.bearer_token_env_var="POLYLITH_MCP_TOKEN"',
			'-c',
			'mcp_servers.polylith_workflows.required=true',
			'-c',
			`openai_base_url=${JSON.stringify(observer.url)}`,
			...(previous?.threadId ? ['resume'] : []),
			'-o',
			path.join(attempt, 'result.md'),
			...(previous?.threadId ? [previous.threadId] : []),
			'-',
		];
		const agentStart = performance.now();
		child = spawn(process.execPath, args, {env: environment, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true});
		control.childPid = child.pid;
		control.status = 'running';
		control.agentStartedAt = new Date().toISOString();
		save();
		events = fs.createWriteStream(path.join(attempt, 'events.private.jsonl'));
		child.stderr.pipe(fs.createWriteStream(path.join(attempt, 'codex-stderr.log')));
		createInterface({input: child.stdout}).on('line', (line) => {
			let data;
			try {
				data = JSON.parse(line);
			} catch {
				data = {type: 'unparsed'};
			}
			events.write(
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
				attempt,
				workspace,
				threadId: control.threadId,
				pages: plan.length,
				inputBytes: control.inputBytes,
			}),
		);
		const [exitCode] = await once(child, 'close');
		control.exitCode = exitCode;
		control.agentWindowMs = performance.now() - agentStart;
		control.agentCompletedAt = new Date().toISOString();
		control.status = exitCode === 0 ? 'finished' : 'client-error';
		save();
	}
} catch (error) {
	control.status = 'error';
	control.error = error.message;
	process.exitCode = 1;
	save();
} finally {
	await observer?.close();
	events?.end();
	if (server.connected) {
		const closed = once(server, 'exit');
		server.send('stop');
		await closed;
	}
	observations.end();
	const metrics = path.join(workspace, '.codex-tmp/mcp-workflows', `metrics-${ready.instance}.json`);
	if (fs.existsSync(metrics)) fs.copyFileSync(metrics, path.join(attempt, 'server-metrics.json'));
	control.liveUnchanged = JSON.stringify(guard()) === JSON.stringify(protectedFiles);
	control.protectedFileCount = Object.keys(protectedFiles).length;
	control.completedAt = new Date().toISOString();
	save();
	assert(control.liveUnchanged, 'Live product changed during replay; investigate separately');
}
console.log(JSON.stringify(control));
