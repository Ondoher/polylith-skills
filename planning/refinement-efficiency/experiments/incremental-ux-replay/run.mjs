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
import {verifyObserverTrust} from './observer-trust.mjs';

const governance = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const option = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const attemptName = option('attempt');
assert(attemptName && /^[a-z0-9-]+$/.test(attemptName), 'Supply --attempt=<unique-name>');
assert(
	process.argv
		.slice(2)
		.every((arg) => arg === '--execute' || /^(--attempt=|--requested-at=|--binary=|--resume=)/.test(arg)),
	'Unknown argument',
);
const resumeName = option('resume');
assert(!resumeName || /^[a-z0-9-]+$/.test(resumeName), 'Invalid resume name');
const previousDirectory = resumeName && path.join(governance, '.codex-tmp/incremental-ux-replay', resumeName);
const previous = previousDirectory && JSON.parse(fs.readFileSync(path.join(previousDirectory, 'control.json')));
assert(
	!previous ||
		(previous.liveUnchanged &&
			(previous.status === 'prepared' ||
				(previous.status === 'error' && previous.error === 'spawn EPERM' && !previous.serverPid))),
	'Resume requires saved preparation or an isolated server-start failure',
);
const reusePrepared = previous?.status === 'prepared';
const requestedAt = option('requested-at') ?? previous?.requestedAt ?? new Date().toISOString();
assert(Number.isFinite(Date.parse(requestedAt)) && Date.parse(requestedAt) <= Date.now(), 'Invalid request time');
const attempt = path.join(governance, '.codex-tmp/incremental-ux-replay', attemptName);
assert(!fs.existsSync(attempt), 'Preserve existing attempt evidence; use a unique name');
const workspace = previous?.workspace ?? path.join(attempt, 'workspace');
assert(
	workspace.startsWith(path.join(governance, '.codex-tmp/incremental-ux-replay') + path.sep),
	'Workspace must remain isolated',
);
const baseline = path.join(governance, '.codex-tmp/alexa-mcp-refinement-20260928-133745/baseline');
const manifestPath = path.join(baseline, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath));
const sha = (value) => createHash('sha256').update(value).digest('hex');
const control = {
	experiment: 'incremental-ux-first-pass',
	requestedAt: new Date(requestedAt).toISOString(),
	startedAt: new Date().toISOString(),
	workspace,
	run: 'incremental-ux-first-pass',
	status: 'preparing',
	model: 'gpt-6-astra',
	effort: 'ultra',
	pageBytes: 28000,
	coordination: 'Supervisor prepares and assigns; one direct CLI author with native UX role instructions.',
	boundary: 'Through the first units.finish receipt; no parent assembly, promotion, review or rework.',
	...(previous
		? {
				resumedFrom: resumeName,
				reusedPreparationMs: previous.preparationMs,
				preparationHoldSeconds: (Date.now() - Date.parse(previous.completedAt)) / 1000,
			}
		: {}),
};
fs.mkdirSync(attempt, {recursive: true});
const save = () => fs.writeFileSync(path.join(attempt, 'control.json'), JSON.stringify(control, null, 2) + '\n');
save();
const guard = () => {
	const files = {};
	const visit = (directory) => {
		for (const item of fs
			.readdirSync(directory, {withFileTypes: true})
			.sort((a, b) => a.name.localeCompare(b.name))) {
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
let server, observations, observer, child, events, ready;
try {
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
			'# Isolated first UX pass\nBootstrap profile: instructions-only\nUse only the supplied product inputs and scoped contribution assignment. Do not inspect historical replay folders or live product data. Do not run Git, reviewers, application code, rendering or publication.\n',
		);
	control.baselineCopyMs = performance.now() - preparationStart;
	control.baselineManifestSha256 = sha(fs.readFileSync(manifestPath));
	control.baselineFiles = previous ? 0 : manifest.files.length;
	const environment = {
		...process.env,
		POLYLITH_MCP_TOKEN: randomBytes(32).toString('hex'),
		POLYLITH_MCP_PAGE_BYTES: '28000',
		RUST_LOG: 'warn,codex_core::stream_events_utils=debug,codex_core::tools::parallel=debug',
	};
	server = fork(fileURLToPath(new URL('./server-observer.mjs', import.meta.url)), [workspace, '0'], {
		env: environment,
		stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
		windowsHide: true,
	});
	server.stdout.pipe(fs.createWriteStream(path.join(attempt, 'server-stdout.private.log')));
	server.stderr.pipe(fs.createWriteStream(path.join(attempt, 'server-stderr.log')));
	observations = fs.createWriteStream(path.join(attempt, 'service-observations.jsonl'));
	server.on('message', (message) => {
		if (message.event !== 'service-observation') return;
		observations.write(JSON.stringify(message) + '\n');
		if (message.phase) {
			control.lastPhase = message.phase;
			control.lastPhaseAt = message.endedAt;
			save();
		}
		if (
			message.operation === 'units.finish' &&
			message.actor === 'assigned' &&
			!message.failed &&
			!control.firstFinishAt
		) {
			control.firstFinishAt = message.endedAt;
			control.firstFinishHandle = message.handle;
			control.firstFinishServiceMs = message.serviceMs;
			save();
		}
	});
	ready = await new Promise((resolve, reject) => {
		server.on('message', (message) => {
			if (message.event === 'ready') resolve(message);
		});
		server.once('error', reject);
		server.once('exit', (code) => reject(new Error(`Server exited before ready: ${code}`)));
	});
	control.instance = ready.instance;
	control.serverPid = server.pid;
	fs.writeFileSync(
		path.join(attempt, 'connection.private.json'),
		JSON.stringify({...ready, token: environment.POLYLITH_MCP_TOKEN}),
	);
	let rpcId = 0;
	const call = async (name, args) => {
		const started = performance.now();
		const response = await fetch(ready.url, {
			method: 'POST',
			headers: {authorization: `Bearer ${environment.POLYLITH_MCP_TOKEN}`, 'content-type': 'application/json'},
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
	const owner = {access: ready.access, run: control.run};
	const execute = (operation, input, inputHandles) =>
		call('execute', {...owner, operation, input, ...(inputHandles ? {inputHandles} : {})});
	await call('open', {
		...owner,
		sourcePath: 'agents/topics/alexa/product-description.md',
		currentPath: 'product/Alexa/current.json',
	});
	let facts, ux, identities, references;
	if (reusePrepared) {
		({facts, ux, identities} = JSON.parse(fs.readFileSync(path.join(previousDirectory, 'input-receipts.json'))));
		references = JSON.parse(fs.readFileSync(identities.path)).units.map((unit) => unit.reference);
		for (const receipt of [facts, ux, identities])
			assert.equal(sha(fs.readFileSync(receipt.path)), receipt.sha256, 'Saved preparation changed');
	} else {
		facts = await execute('product.prepare', {});
		const savedFacts = JSON.parse(fs.readFileSync(facts.path));
		const priorFacts = JSON.parse(
			fs.readFileSync(path.join(governance, '.codex-tmp/ux-comparison-replay-20260928-160822/inputs/facts.json')),
		);
		assert.deepEqual(savedFacts.productModelBinding, priorFacts.productModelBinding);
		assert.deepEqual(savedFacts.productModel, priorFacts.productModel);
		ux = await call('store', {...owner, file: 'product/Alexa/ux/ux-spec.json'});
		const imported = await execute('units.import', {stage: 'ux'}, {document: ux.handle});
		const units = JSON.parse(fs.readFileSync(imported.path));
		references = units.map((unit) => `${unit.kind}:${unit.id}`);
		await execute('units.open', {stage: 'ux', binding: {factsSha256: facts.sha256, uxSha256: ux.sha256}});
		const seeded = await execute('units.deliver', {stage: 'ux'}, {records: imported.handle});
		assert.equal(JSON.parse(fs.readFileSync(seeded.path)).issues.length, 0, 'Baseline import delivery failed');
		identities = await execute('units.status', {stage: 'ux', references});
		fs.writeFileSync(path.join(attempt, 'imported-units-receipt.json'), JSON.stringify(imported, null, 2));
	}
	if (reusePrepared)
		fs.copyFileSync(
			path.join(previousDirectory, 'imported-units-receipt.json'),
			path.join(attempt, 'imported-units-receipt.json'),
		);
	const inputs = {facts, ux, identities};
	fs.writeFileSync(path.join(attempt, 'input-receipts.json'), JSON.stringify(inputs, null, 2));
	const operations = ['result.store', 'units.read', 'units.status', 'units.contribute', 'units.finish'];
	const assignment = await call('assign', {
		...owner,
		operations,
		handles: Object.values(inputs).map((value) => value.handle),
		outputDirectory: `.codex-tmp/ux-author`,
		scope: {stage: 'ux', recordRefs: references},
	});
	fs.mkdirSync(path.join(workspace, '.codex-tmp/ux-author'), {recursive: true});
	const contracts = [];
	for (const operation of operations)
		contracts.push(...(await call('catalog', {access: assignment.access, run: control.run, operation})));
	fs.writeFileSync(path.join(attempt, 'contracts.json'), JSON.stringify(contracts, null, 2));
	control.contractsSha256 = sha(fs.readFileSync(path.join(attempt, 'contracts.json')));
	const plan = reusePrepared ? JSON.parse(fs.readFileSync(path.join(previousDirectory, 'input-read-plan.json'))) : [];
	for (const [source, receipt] of reusePrepared ? [] : Object.entries(inputs)) {
		let offset = 0;
		const parts = [];
		do {
			const page = await call('read', {access: ready.access, handle: receipt.handle, offset, maxBytes: 28000});
			parts.push(Buffer.from(page.text));
			plan.push({source, handle: receipt.handle, offset, maxBytes: 28000, nextOffset: page.nextOffset});
			offset = page.nextOffset;
		} while (offset !== null);
		assert.equal(sha(Buffer.concat(parts)), receipt.sha256, 'Input paging differs from saved bytes');
	}
	fs.writeFileSync(path.join(attempt, 'input-read-plan.json'), JSON.stringify(plan, null, 2));
	const rolePath = path.join(governance, 'agents/ux-planner.toml');
	const role = fs.readFileSync(rolePath, 'utf8');
	const instructions = role.match(/developer_instructions = """\r?\n([\s\S]*?)"""/)[1];
	fs.writeFileSync(path.join(attempt, 'role-contract.toml'), role);
	control.guidanceSha256 = {};
	for (const name of ['ux-contributions.md', 'single-pass-design.md']) {
		const raw = fs.readFileSync(path.join(governance, 'skills/refine-design/references', name));
		fs.writeFileSync(path.join(attempt, name), raw);
		control.guidanceSha256[name] = sha(raw);
	}
	const prompt =
		fs.readFileSync(new URL('./assignment.md', import.meta.url), 'utf8') +
		`\nGovernance: ${governance}\nWorkspace: ${workspace}\nAssigned MCP access: ${assignment.access}\nRun: ${control.run}\nOutput directory: ${assignment.outputDirectory}\nAssigned references: ${JSON.stringify(references)}\nInput read plan: ${JSON.stringify(plan.map(({nextOffset, ...entry}) => entry))}\n`;
	fs.writeFileSync(path.join(attempt, 'prompt.private.txt'), prompt);
	control.roleSha256 = sha(role);
	control.promptSha256 = sha(prompt);
	control.inputBytes = Object.values(inputs).reduce((sum, value) => sum + value.bytes, 0);
	control.inputReadCount = plan.length;
	control.preparationMs = performance.now() - preparationStart;
	let retainedPreparationMs = 0;
	for (let retained = previous; retained;) {
		retainedPreparationMs +=
			retained.preparationMs ?? Date.parse(retained.completedAt) - Date.parse(retained.startedAt);
		retained = retained.resumedFrom
			? JSON.parse(
					fs.readFileSync(
						path.join(governance, '.codex-tmp/incremental-ux-replay', retained.resumedFrom, 'control.json'),
					),
				)
			: null;
	}
	control.cumulativePreparationMs = control.preparationMs + retainedPreparationMs;
	control.preparedAt = new Date().toISOString();
	control.status = 'prepared';
	save();
	if (process.argv.includes('--execute')) {
		control.observerTrust = await verifyObserverTrust();
		save();
		const binary =
			option('binary') ??
			'C:/Users/gande/.vscode/extensions/openai.chatgpt-26.917.62051-win32-x64/bin/windows-x86_64/codex.exe';
		assert(fs.existsSync(binary), 'Supply an existing --binary=<codex.exe>');
		control.catalog = prepareNativeWorkflowCatalog({
			sourcePath: path.join(process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex'), 'models_cache.json'),
			directory: path.join(attempt, 'catalog'),
			model: control.model,
		});
		observer = await startLiveRequestObserver(path.join(attempt, 'live-request-metadata.json'));
		const args = [
			path.join(governance, 'scripts/codex-native-workflows.mjs'),
			`--model=${control.model}`,
			`--binary=${binary}`,
			`--cache=${control.catalog.path}`,
			'--',
			'exec',
			'--json',
			'-C',
			workspace,
			'--approve-for-me',
			'-c',
			`developer_instructions=${JSON.stringify(instructions)}`,
			'-c',
			`model_reasoning_effort=${JSON.stringify(control.effort)}`,
			'-c',
			`mcp_servers.polylith_workflows.url=${JSON.stringify(ready.url)}`,
			'-c',
			'mcp_servers.polylith_workflows.bearer_token_env_var="POLYLITH_MCP_TOKEN"',
			'-c',
			'mcp_servers.polylith_workflows.required=true',
			'-c',
			`openai_base_url=${JSON.stringify(observer.url)}`,
			'-o',
			path.join(attempt, 'result.md'),
			'-',
		];
		const started = performance.now();
		child = spawn(process.execPath, args, {
			cwd: workspace,
			env: environment,
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
		});
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
				JSON.stringify({at: new Date().toISOString(), observedMs: performance.now() - started, data}) + '\n',
			);
			if (data.type === 'thread.started') control.threadId = data.thread_id;
			if (data.type === 'turn.completed') control.reportedUsage = data.usage;
			if (data.type === 'item.completed' && data.item?.type === 'agent_message')
				fs.appendFileSync(
					path.join(attempt, 'progress.log'),
					`${new Date().toISOString()} ${data.item.text}\n`,
				);
			save();
		});
		child.stdin.end(prompt);
		console.log(JSON.stringify({status: 'running', attempt, pages: plan.length, inputBytes: control.inputBytes}));
		const [exitCode] = await once(child, 'close');
		control.exitCode = exitCode;
		control.agentWindowMs = performance.now() - started;
		control.agentCompletedAt = new Date().toISOString();
		control.status = exitCode === 0 && control.firstFinishAt ? 'finished' : 'incomplete-first-pass';
		if (control.firstFinishHandle) {
			const digest = control.firstFinishHandle.split(':')[1];
			const source = path.join(
				workspace,
				'.codex-tmp/mcp-workflows/runs',
				control.run,
				'results',
				`${digest}.json`,
			);
			fs.copyFileSync(source, path.join(attempt, 'first-finish-receipt.json'));
		}
	}
} catch (error) {
	control.status = 'error';
	control.error = error.message;
	process.exitCode = 1;
} finally {
	await observer?.close();
	events?.end();
	if (server?.connected) {
		const stopped = once(server, 'exit');
		server.send('stop');
		await stopped;
	}
	observations?.end();
	if (ready) {
		const metrics = path.join(workspace, '.codex-tmp/mcp-workflows', `metrics-${ready.instance}.json`);
		if (fs.existsSync(metrics)) fs.copyFileSync(metrics, path.join(attempt, 'server-metrics.json'));
	}
	control.liveUnchanged = JSON.stringify(guard()) === JSON.stringify(protectedFiles);
	control.protectedFileCount = Object.keys(protectedFiles).length;
	control.completedAt = new Date().toISOString();
	save();
	assert(control.liveUnchanged, 'Live product changed during replay; investigate separately');
}
console.log(
	JSON.stringify({
		status: control.status,
		attempt,
		liveUnchanged: control.liveUnchanged,
		firstFinishAt: control.firstFinishAt,
	}),
);
