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

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const option = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const condition = option('condition');
const name = option('attempt');
const smoke = process.argv.includes('--smoke');
assert(
	['inline', 'skill'].includes(condition) && /^[a-z0-9-]+$/.test(name ?? ''),
	'Supply condition and unique attempt',
);
const attempt = path.join(root, '.codex-tmp/multi-read-skill-20260929', name);
assert(!fs.existsSync(attempt), 'Preserve prior evidence');
const workspace = path.join(attempt, 'workspace');
fs.mkdirSync(workspace, {recursive: true});
const sha = (value) => createHash('sha256').update(value).digest('hex');
const roleFile = path.join(root, 'agents/ux-planner.toml');
const role = fs.readFileSync(roleFile, 'utf8');
const model = role.match(/^model = "([^"]+)"/m)[1];
const effort = role.match(/^model_reasoning_effort = "([^"]+)"/m)[1];
const instructions = role.match(/developer_instructions = """\r?\n([\s\S]*?)\r?\n"""/)[1];
const contract = fs.readFileSync(new URL('./multi-read/SKILL.md', import.meta.url), 'utf8');
const skillFile = path.join(workspace, '.agents/skills/multi-read/SKILL.md');
fs.mkdirSync(path.dirname(skillFile), {recursive: true});
fs.writeFileSync(skillFile, contract);
fs.writeFileSync(
	path.join(workspace, 'AGENTS.md'),
	'# Isolated collection trial\nBootstrap profile: instructions-only\nOnly perform the assigned UX preparation and bounded read wave. No product mutation, authoring, review, Git or publication.\n',
);
const control = {
	experiment: 'multi-read-skill',
	condition,
	name,
	smoke,
	workspace,
	run: 'multi-read-trial',
	model,
	effort,
	roleSha256: sha(role),
	contractSha256: sha(contract),
	contractBytes: Buffer.byteLength(contract),
	skillFile,
	startedAt: new Date().toISOString(),
	status: 'preparing',
	clientPhases: [],
};
const save = () => fs.writeFileSync(path.join(attempt, 'control.json'), JSON.stringify(control, null, 2));
save();
const protect = () => {
	const files = {};
	const visit = (directory) => {
		for (const item of fs.readdirSync(directory, {withFileTypes: true})) {
			const file = path.join(directory, item.name);
			if (item.isDirectory()) visit(file);
			else {
				assert(item.isFile(), 'Unexpected linked live file');
				files[file] = sha(fs.readFileSync(file));
			}
		}
	};
	visit('C:/dev/alexa/product/Alexa');
	for (const file of ['product-description.md', 'README.md']) {
		const full = path.join('C:/dev/alexa/agents/topics/alexa', file);
		files[full] = sha(fs.readFileSync(full));
	}
	return files;
};
const protectedFiles = protect();
fs.writeFileSync(path.join(attempt, 'live-protection.json'), JSON.stringify(protectedFiles));
const token = randomBytes(32).toString('hex');
const env = {
	...process.env,
	POLYLITH_MCP_TOKEN: token,
	POLYLITH_MCP_PAGE_BYTES: '28000',
	RUST_LOG: 'warn,codex_core::stream_events_utils=debug,codex_core::tools::parallel=debug',
};
const timeline = fs.createWriteStream(path.join(attempt, 'service-observations.jsonl'));
const server = fork(path.join(root, '.codex-tmp/ux-mcp-replay-20260928/server-observer.mjs'), [workspace, '0'], {
	env,
	stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
	windowsHide: true,
});
server.stdout.pipe(fs.createWriteStream(path.join(attempt, 'server-stdout.private.log')));
server.stderr.pipe(fs.createWriteStream(path.join(attempt, 'server-stderr.log')));
server.on('message', (message) => {
	if (message.event !== 'service-observation') return;
	timeline.write(JSON.stringify(message) + '\n');
	if (message.phase) {
		control.lastPhase = message.phase;
		control.lastPhaseAt = message.endedAt;
		save();
	}
});
const ready = await new Promise((resolve, reject) => {
	server.on('message', (message) => {
		if (message.event === 'ready') resolve(message);
	});
	server.once('error', reject);
	server.once('exit', (code) => reject(new Error(`Server exited ${code}`)));
});
control.serverPid = server.pid;
control.instance = ready.instance;
let rpc = 0,
	observer;
const call = async (name, args) => {
	const response = await fetch(ready.url, {
		method: 'POST',
		headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: ++rpc,
			method: 'tools/call',
			params: {name: `workflow_${name}`, arguments: args},
		}),
	});
	const data = await response.json();
	assert(response.ok && !data.error && !data.result?.isError, `Preflight failed: ${name}`);
	return JSON.parse(data.result.content[0].text);
};
try {
	await call('open', {access: ready.access, run: control.run});
	const manifest = JSON.parse(
		fs.readFileSync(path.join(root, '.codex-tmp/ux-comparison-replay-20260928-160822/manifest.json')),
	);
	const inputs = {},
		pages = {facts: [], ux: []};
	for (const source of ['facts', 'ux']) {
		const original = manifest.sources.find((item) => item.name === source);
		assert.equal(sha(fs.readFileSync(original.path)), original.sha256);
		const local = path.join(workspace, `${source}.json`);
		fs.copyFileSync(original.path, local);
		inputs[source] = await call('store', {access: ready.access, run: control.run, file: local});
		let offset = 0;
		for (let i = 0; i < 4; i++) {
			const request = {source, handle: inputs[source].handle, offset, maxBytes: 28000};
			const page = await call('read', {access: ready.access, ...request, source: undefined});
			const end = page.nextOffset ?? page.totalBytes;
			assert.equal(page.text, fs.readFileSync(inputs[source].path).subarray(offset, end).toString('utf8'));
			pages[source].push({...request, end, bytes: Buffer.byteLength(page.text), sha256: sha(page.text)});
			assert(page.nextOffset !== null, 'Need four nonterminal known pages');
			offset = page.nextOffset;
		}
	}
	const plan = Array.from({length: 4}, (_, i) => [pages.facts[i], pages.ux[i]]).flat();
	const assigned = await call('assign', {
		access: ready.access,
		run: control.run,
		operations: ['result.store'],
		handles: Object.values(inputs).map((value) => value.handle),
	});
	fs.writeFileSync(path.join(attempt, 'input-receipts.json'), JSON.stringify(inputs, null, 2));
	fs.writeFileSync(path.join(attempt, 'input-read-plan.json'), JSON.stringify(plan, null, 2));
	fs.writeFileSync(path.join(attempt, 'connection.private.json'), JSON.stringify({...ready, token, assigned}));
	Object.assign(control, {inputBytes: plan.reduce((sum, page) => sum + page.bytes, 0), readCount: plan.length});
	const catalog = prepareNativeWorkflowCatalog({
		sourcePath: path.join(process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex'), 'models_cache.json'),
		directory: path.join(attempt, 'catalog'),
		model,
	});
	control.catalog = catalog;
	if (smoke) {
		const marker = await call('store', {
			access: assigned.access,
			run: control.run,
			value: {kind: 'ux-replay-phase', phase: 'smoke'},
		});
		assert(marker.handle);
		control.status = 'preflight-passed';
	} else {
		observer = await startLiveRequestObserver(path.join(attempt, 'live-request-metadata.json'));
		const binary =
			'C:/Users/gande/.vscode/extensions/openai.chatgpt-26.917.62051-win32-x64/bin/windows-x86_64/codex.exe';
		const phase = async (name, prompt) => {
			fs.writeFileSync(path.join(attempt, `${name}-prompt.private.txt`), prompt);
			const args = [
				path.join(root, 'scripts/codex-native-workflows.mjs'),
				`--model=${model}`,
				`--binary=${binary}`,
				`--cache=${catalog.path}`,
				'--',
				'exec',
				'--json',
				'-C',
				workspace,
				'--add-dir',
				root,
				'--approve-for-me',
				'-c',
				`model_reasoning_effort=${JSON.stringify(effort)}`,
				'-c',
				`developer_instructions=${JSON.stringify(instructions)}`,
				'-c',
				`mcp_servers.polylith_workflows.url=${JSON.stringify(ready.url)}`,
				'-c',
				'mcp_servers.polylith_workflows.bearer_token_env_var="POLYLITH_MCP_TOKEN"',
				'-c',
				'mcp_servers.polylith_workflows.required=true',
				'-c',
				`openai_base_url=${JSON.stringify(observer.url)}`,
				...(control.threadId ? ['resume'] : []),
				'-o',
				path.join(attempt, `${name}-result.md`),
				...(control.threadId ? [control.threadId] : []),
				'-',
			];
			const start = performance.now();
			const record = {name, startedAt: new Date().toISOString()};
			control.clientPhases.push(record);
			control.agentStartedAt ??= record.startedAt;
			control.status = `running-${name}`;
			const child = spawn(process.execPath, args, {env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true});
			control.childPid = child.pid;
			save();
			const events = fs.createWriteStream(path.join(attempt, 'events.private.jsonl'), {flags: 'a'});
			child.stderr.pipe(fs.createWriteStream(path.join(attempt, 'codex-stderr.log'), {flags: 'a'}));
			createInterface({input: child.stdout}).on('line', (line) => {
				let data;
				try {
					data = JSON.parse(line);
				} catch {
					return;
				}
				events.write(JSON.stringify({at: new Date().toISOString(), phase: name, data}) + '\n');
				if (data.type === 'thread.started') {
					control.threadId = data.thread_id;
					save();
				}
				if (data.type === 'item.completed' && data.item?.type === 'agent_message')
					fs.appendFileSync(
						path.join(attempt, 'progress.log'),
						`${new Date().toISOString()} ${data.item.text}\n`,
					);
				if (data.type === 'turn.completed') {
					record.reportedUsage = data.usage;
					save();
				}
			});
			child.stdin.end(prompt);
			console.log(JSON.stringify({attempt: name, condition, status: control.status, childPid: child.pid}));
			const [exitCode] = await once(child, 'close');
			events.end();
			Object.assign(record, {
				exitCode,
				completedAt: new Date().toISOString(),
				elapsedMs: performance.now() - start,
			});
			save();
			assert.equal(exitCode, 0, `Client ${name} failed`);
		};
		const access = JSON.stringify(assigned.access),
			run = JSON.stringify(control.run);
		await phase(
			'prepare',
			`You are the UX planner in an authorized collection-only experiment. Your unchanged UX role is installed as developer instructions. Governance root: ${root}. Prepare for a single-pass-ux assignment: load mandatory role guidance and its single-pass route once. No UX design-mode/schema authoring is requested yet. Do not inspect product data, invoke multi-read, spawn agents, research, author UX, review, assemble or persist product artifacts. The next message supplies one bounded independent read wave. When guidance is loaded, call workflow_store with access=${access}, run=${run}, value={"kind":"ux-replay-phase","phase":"instructions-ready"}; then return only READY. No further work this turn.`,
		);
		assert.equal(control.lastPhase, 'instructions-ready', 'Preparation incomplete');
		const reads = plan.map(({handle, offset, maxBytes}) => ({handle, offset, maxBytes}));
		const body =
			condition === 'inline'
				? `Apply this complete multi-read contract supplied inline; it is already available here, so no separate skill-file read is needed.\n<contract>\n${contract}\n</contract>`
				: `Use $multi-read. Load its instructions once from ${skillFile}, then apply them to this wave.`;
		await phase(
			'collect',
			`${body}\nAssigned access=${access}. Manifest: ${JSON.stringify(reads)}\nThis invocation covers exactly these eight pages; later continuations are outside this trial. Only after all entries return intact and the parallel-wave contract was met, call workflow_store with access=${access}, run=${run}, value={"kind":"ux-replay-phase","phase":"inputs-ready"} and return MULTI_READ_COMPLETE. On skill failure, store phase="collection-failed" instead and return MULTI_READ_FAILED with the reason and delivered/missing entries. Serialization is failure even when all pages arrive; retain successful results without rereading them. Stop before UX interpretation or authoring. Do not copy the payloads or compute hashes; external instrumentation verifies exact results and batching.`,
		);
		control.status =
			control.lastPhase === 'inputs-ready'
				? 'finished'
				: control.lastPhase === 'collection-failed'
					? 'collection-failed'
					: 'collection-incomplete';
		control.exitCode = 0;
		control.agentCompletedAt = control.clientPhases.at(-1).completedAt;
		control.agentWindowMs = Date.parse(control.agentCompletedAt) - Date.parse(control.agentStartedAt);
	}
} catch (error) {
	control.status = 'error';
	control.error = error.message;
	process.exitCode = 1;
} finally {
	await observer?.close();
	if (server.connected) {
		const closed = once(server, 'exit');
		server.send('stop');
		await closed;
	}
	timeline.end();
	const metrics = path.join(workspace, '.codex-tmp/mcp-workflows', `metrics-${ready.instance}.json`);
	if (fs.existsSync(metrics)) fs.copyFileSync(metrics, path.join(attempt, 'server-metrics.json'));
	control.liveUnchanged = JSON.stringify(protect()) === JSON.stringify(protectedFiles);
	control.protectedFileCount = Object.keys(protectedFiles).length;
	control.completedAt = new Date().toISOString();
	save();
	assert(control.liveUnchanged, 'Live product changed');
}
console.log(JSON.stringify({status: control.status, attempt, phase: control.lastPhase, error: control.error}));
