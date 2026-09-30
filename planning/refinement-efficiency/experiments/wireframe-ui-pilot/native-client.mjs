import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {prepareNativeWorkflowCatalog} from '../../../../scripts/native-workflow-catalog.mjs';

/** Normal authenticated Codex sessions owned by the disposable pilot workspace. */
export class NativeClient {
	/**
	 * Creates a launcher with local catalogs and independent persistent role threads.
	 * Invalid paths, models or a missing installed executable reject preparation.
	 *
	 * @param {NativeClientOptions} options - Experiment paths, MCP connection and explicit models.
	 */
	constructor({governance, workspace, outputDirectory, url, token, models, event}) {
		this.governance = fs.realpathSync(governance);
		this.workspace = fs.realpathSync(workspace);
		assert.notEqual(this.workspace, this.governance, 'A disposable workspace is required');
		assert(Array.isArray(models) && models.length > 0, 'Supply explicit models');
		assert(
			models.every((model) => typeof model === 'string' && model.length > 0),
			'Invalid model',
		);
		assert(typeof token === 'string' && token.length > 0, 'Missing MCP token');
		assert(['http:', 'https:'].includes(new URL(url).protocol), 'Invalid MCP URL');
		assert(event === undefined || typeof event === 'function', 'Invalid event callback');
		this.outputDirectory = path.resolve(outputDirectory);
		fs.mkdirSync(this.outputDirectory, {recursive: true});
		this.url = url;
		this.token = token;
		this.environment = this._environment();
		this.models = new Set(models);
		this.event = event ?? (() => {});
		this.active = new Set();
		this.threads = new Map();
		this.codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex');
		this.binary = this._findBinary();
		this.catalogs = [];
		let sourcePath = path.join(this.codexHome, 'models_cache.json');
		for (const model of this.models) {
			const receipt = prepareNativeWorkflowCatalog({
				sourcePath,
				directory: path.join(this.workspace, '.codex-tmp/native-workflow-catalogs'),
				model,
			});
			this.catalogs.push(receipt);
			sourcePath = receipt.path;
		}
		this.catalogPath = sourcePath;
	}

	/**
	 * Called by construction to retain normal authentication and reject leftover local model routes.
	 *
	 * @returns {NativeClientEnvironment} - Private child environment with MCP access and runtime diagnostics.
	 */
	_environment() {
		const environment = {
			...process.env,
			POLYLITH_MCP_TOKEN: this.token,
			RUST_LOG: 'warn,codex_core::stream_events_utils=debug,codex_core::tools::parallel=debug',
		};
		for (const variable of ['OPENAI_BASE_URL', 'CODEX_OPENAI_BASE_URL']) {
			if (!environment[variable]) continue;
			const hostname = new URL(environment[variable]).hostname;
			assert(
				!/^127\./.test(hostname) &&
					!['localhost', '[::1]', '0.0.0.0'].includes(hostname) &&
					!hostname.endsWith('.localhost'),
				`Refusing inherited local model route from ${variable}; use the normal authenticated connection`,
			);
		}
		return environment;
	}

	/**
	 * Called by construction to locate a native CLI without pinning an extension version.
	 *
	 * @returns {string} - Installed executable path.
	 */
	_findBinary() {
		const executable = process.platform === 'win32' ? 'codex.exe' : 'codex';
		const candidates = (process.env.PATH ?? '')
			.split(path.delimiter)
			.map((directory) => path.join(directory, executable));
		for (const editor of ['.vscode', '.vscode-insiders']) {
			const directory = path.join(os.homedir(), editor, 'extensions');
			if (!fs.existsSync(directory)) continue;
			const extensions = fs.readdirSync(directory).filter((name) => name.startsWith('openai.chatgpt-'));
			extensions.sort((left, right) => right.localeCompare(left, undefined, {numeric: true}));
			for (const extension of extensions) {
				const binaries = path.join(directory, extension, 'bin');
				if (!fs.existsSync(binaries)) continue;
				for (const platform of fs.readdirSync(binaries))
					candidates.push(path.join(binaries, platform, executable));
			}
		}
		const binary = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
		assert(binary, 'No native Codex executable found on PATH or in installed VS Code extensions');
		return fs.realpathSync(binary);
	}

	/**
	 * Called by run to state the authorized experiment boundary independently of general workflows.
	 *
	 * @param {string} role - Assigned experiment role.
	 * @returns {string} - Task-scoped developer instructions.
	 */
	_instructions(role) {
		return [
			`You are the ${role} in the isolated wireframe-to-UI pilot.`,
			'The current assignment defines your entire scope. Preserve useful context across resumed turns.',
			'Use the supplied experiment evidence and MCP access. Do not bootstrap or discover a general design workflow.',
			'Do not delegate to additional agents. Read referenced evidence as needed.',
			`Write product artifacts only inside this disposable workspace: ${this.workspace}`,
			'Keep all results provisional. Do not edit live products or bypass production review and publication gates.',
			'Use the normal authenticated Codex model connection; do not configure model redirects or observer proxies.',
		].join('\n');
	}

	/**
	 * Called by run to place exec-only options before the resume subcommand.
	 *
	 * @param {NativeClientInvocation} invocation - Exact role, files and continuation.
	 * @returns {string[]} - Node launcher arguments without credentials.
	 */
	_arguments({model, effort, threadId, resultPath, instructions}) {
		return [
			path.join(this.governance, 'scripts/codex-native-workflows.mjs'),
			`--model=${model}`,
			`--binary=${this.binary}`,
			`--cache=${this.catalogPath}`,
			'--',
			'exec',
			'-C',
			this.workspace,
			'--approve-for-me',
			'--skip-git-repo-check',
			'-c',
			'sandbox_workspace_write.writable_roots=[]',
			'-c',
			'sandbox_workspace_write.exclude_tmpdir_env_var=true',
			'-c',
			'sandbox_workspace_write.exclude_slash_tmp=true',
			'-c',
			`developer_instructions=${JSON.stringify(instructions)}`,
			'-c',
			`model_reasoning_effort=${JSON.stringify(effort)}`,
			'-c',
			`mcp_servers.polylith_workflows.url=${JSON.stringify(this.url)}`,
			'-c',
			'mcp_servers.polylith_workflows.bearer_token_env_var="POLYLITH_MCP_TOKEN"',
			'-c',
			'mcp_servers.polylith_workflows.required=true',
			...(threadId ? ['resume', threadId] : []),
			'--json',
			'-o',
			resultPath,
			'-',
		];
	}

	/**
	 * Called by run to start the normal CLI; kept as the process boundary for local tests.
	 *
	 * @param {string[]} args - Prepared launcher arguments.
	 * @returns {ReturnType<typeof spawn>} - Child with piped input and private evidence streams.
	 */
	_spawn(args) {
		return spawn(process.execPath, args, {
			cwd: this.workspace,
			env: this.environment,
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
		});
	}

	/**
	 * Called after a completed process to read only the runtime fields from its saved session.
	 * Missing session metadata is reported as unavailable, without inferring effective settings.
	 *
	 * @param {string} threadId - Observed native thread identity.
	 * @param {string} startedAt - Earliest timestamp belonging to this invocation.
	 * @returns {Promise<NativeClientRuntime | null>} - Last recorded runtime configuration, when available.
	 */
	async _runtime(threadId, startedAt) {
		const root = path.join(this.codexHome, 'sessions');
		if (!threadId || !fs.existsSync(root)) return null;
		const pending = [root];
		let session;
		while (pending.length && !session) {
			const directory = pending.pop();
			for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
				if (entry.isDirectory()) pending.push(path.join(directory, entry.name));
				else if (entry.isFile() && entry.name.endsWith(`-${threadId}.jsonl`)) {
					session = path.join(directory, entry.name);
					break;
				}
			}
		}
		if (!session) return null;
		let runtime = null;
		const lines = createInterface({input: fs.createReadStream(session), crlfDelay: Infinity});
		for await (const line of lines) {
			let record;
			try {
				record = JSON.parse(line);
			} catch {
				continue;
			}
			if (record.type !== 'turn_context' || !(Date.parse(record.timestamp) >= Date.parse(startedAt))) continue;
			const {model, effort, cwd, approval_policy, sandbox_policy} = record.payload ?? {};
			runtime = {model, effort, cwd, approvalPolicy: approval_policy, sandboxMode: sandbox_policy?.type};
		}
		return runtime;
	}

	/**
	 * Call this method to complete one author turn and retain its thread for the next call.
	 * Concurrent calls for the same role, changed thread identities, invalid settings and process
	 * launch failures reject. Nonzero process exits return their code with the private evidence path.
	 * Resolution waits for process closure; no timeout advances the caller before model completion.
	 *
	 * @param {NativeClientRunOptions} options - Explicit role settings, prompt and optional saved thread.
	 * @returns {Promise<NativeClientResult>} - Native completion identity, timing, usage and final-message file.
	 */
	async run({role, model, effort, prompt, threadId}) {
		assert(typeof role === 'string' && /^[a-z][a-z0-9-]*$/.test(role), 'Invalid role');
		assert(this.models.has(model), 'Model was not prepared for this client');
		assert(
			['minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(effort),
			'Invalid reasoning effort',
		);
		assert(typeof prompt === 'string' && prompt.trim(), 'A nonempty prompt is required');
		assert(
			!threadId || (typeof threadId === 'string' && /^[a-zA-Z0-9-]+$/.test(threadId)),
			'Invalid thread identity',
		);
		assert(!this.active.has(role), `Role ${role} already has an active turn`);
		const previousThread = this.threads.get(role);
		assert(!threadId || !previousThread || threadId === previousThread, 'A role must retain its author thread');
		threadId ??= previousThread;
		this.active.add(role);
		try {
			const directory = fs.mkdtempSync(path.join(this.outputDirectory, `${role}-`));
			const resultPath = path.join(directory, 'result.md');
			const instructions = this._instructions(role);
			fs.writeFileSync(path.join(directory, 'prompt.private.txt'), prompt, {mode: 0o600});
			fs.writeFileSync(path.join(directory, 'developer-instructions.private.md'), instructions, {mode: 0o600});
			const runtimePath = path.join(directory, 'runtime.private.jsonl');
			const stderrPath = path.join(directory, 'stderr.private.log');
			fs.writeFileSync(runtimePath, '', {mode: 0o600});
			fs.writeFileSync(stderrPath, '', {mode: 0o600});
			const args = this._arguments({model, effort, threadId, resultPath, instructions});
			const startedAt = new Date().toISOString();
			const started = performance.now();
			this.event({type: 'native.started', role, model, effort, threadId, startedAt, resultPath});
			const child = this._spawn(args);
			const closed = once(child, 'close');
			let usage = null;
			let completed = false;
			child.stdout.on('data', (chunk) => fs.appendFileSync(runtimePath, chunk));
			child.stderr.on('data', (chunk) => fs.appendFileSync(stderrPath, chunk));
			child.stdin.on('error', (error) => fs.appendFileSync(stderrPath, `${error.message}\n`));
			const lines = createInterface({input: child.stdout, crlfDelay: Infinity});
			lines.on('line', (line) => {
				let record;
				try {
					record = JSON.parse(line);
				} catch {
					return;
				}
				if (record.type === 'thread.started' && typeof record.thread_id === 'string') {
					threadId = record.thread_id;
					this.threads.set(role, threadId);
				}
				if (record.type === 'turn.completed') {
					usage = record.usage ?? null;
					completed = true;
				}
				const item = record.item ?? {};
				const toolName = item.tool ?? item.name;
				this.event({
					type: 'native.event',
					role,
					nativeType: record.type,
					itemType: item.type,
					itemId: typeof item.id === 'string' ? item.id : undefined,
					toolName: typeof toolName === 'string' ? toolName : undefined,
					server: typeof item.server === 'string' ? item.server : undefined,
					threadId,
				});
			});
			child.stdin.end(prompt);
			let exitCode;
			try {
				[exitCode] = await closed;
			} finally {
				lines.close();
			}
			const endedAt = new Date().toISOString();
			const elapsedMs = performance.now() - started;
			const result = {
				threadId: threadId ?? null,
				exitCode: exitCode ?? 1,
				startedAt,
				endedAt,
				elapsedMs,
				usage,
				resultPath,
			};
			const runtime = await this._runtime(threadId, startedAt);
			fs.writeFileSync(
				path.join(directory, 'completion.json'),
				JSON.stringify({...result, completed, runtime}, null, 2),
			);
			this.event({type: 'native.completed', role, ...result, completed, runtime});
			assert(result.exitCode !== 0 || completed, 'Codex exited without completing the requested turn');
			return result;
		} finally {
			this.active.delete(role);
		}
	}
}
