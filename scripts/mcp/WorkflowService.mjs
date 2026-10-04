import fs from 'node:fs';
import path from 'node:path';
import {randomBytes, randomUUID} from 'node:crypto';
import {WorkspaceFiles} from './WorkspaceFiles.mjs';
import {
	MAX_PAGE_BYTES,
	DEFAULT_PAGE_BYTES,
	MAX_CONFIGURED_PAGE_BYTES,
	MAX_RESULT_BYTES,
	WORKFLOW_VERSION,
} from './consts.mjs';
import {InputContract} from './InputContract.mjs';

/** Resident workflow state, scoped capabilities, exact results and operation ownership.
 * @implements {DesignWorkflowService}
 */
export class WorkflowService {
	/** Creates one workspace service; the owner capability must stay with the parent.
	 * @param {WorkflowServiceOptions} options - Workspace, state directory and operation registry.
	 */
	constructor({
		workspace,
		stateDirectory = '.codex-tmp/mcp-workflows',
		operations = {},
		pageBytes = DEFAULT_PAGE_BYTES,
	}) {
		if (!Number.isInteger(pageBytes) || pageBytes < MAX_PAGE_BYTES || pageBytes > MAX_CONFIGURED_PAGE_BYTES)
			throw new Error(
				`Page limit must be an integer from ${MAX_PAGE_BYTES} through ${MAX_CONFIGURED_PAGE_BYTES}`,
			);
		this.readLimits = {
			pageBytes,
			envelopeBytes: Math.ceil((pageBytes * 7800) / MAX_PAGE_BYTES),
			toolBytes: Math.ceil((pageBytes * 8192) / MAX_PAGE_BYTES),
		};
		this.files = new WorkspaceFiles(workspace);
		this.stateDirectory = this.files.resolve(stateDirectory);
		if (this.stateDirectory === this.files.root) throw new Error('State directory must be below the workspace');
		this.instance = randomUUID();
		this.ownerAccess = randomBytes(32).toString('hex');
		this._capabilities = new Map([[this.ownerAccess, {owner: true}]]);
		this._assignmentGuards = new Map();
		this._runs = new Map();
		this._results = new Map();
		this._jobs = new Map();
		this._queues = new Map();
		this._operations = operations;
		this.measurements = [];
	}

	/** Called by public methods to validate an unforgeable capability and run binding.
	 * @param {string} access - Parent-issued capability.
	 * @param {string|undefined} runId - Optional exact run.
	 * @param {boolean} ownerOnly - Whether parent authority is required.
	 * @returns {WorkflowCapability} - Accepted authority.
	 */
	_authorize(access, runId, ownerOnly = false) {
		const capability = this._capabilities.get(access);
		if (!capability || (ownerOnly && !capability.owner) || (!capability.owner && capability.run !== runId))
			throw new Error('Capability does not authorize this operation');
		return capability;
	}

	/** Called by run operations to retrieve an already opened context.
	 * @param {string} runId - Opaque run identity.
	 * @returns {WorkflowRun} - Resident run.
	 */
	_run(runId) {
		const run = this._runs.get(runId);
		if (!run) throw new Error('Open the run before using it');
		return run;
	}

	/** Called by data operations to permit only assigned input files.
	 * @param {WorkflowCapability} capability - Verified caller authority.
	 * @param {string} location - Requested input file.
	 * @returns {string} - Authorized absolute input path.
	 */
	_inputPath(capability, location) {
		const absolute = this.files.resolve(location);
		if (
			!capability.owner &&
			!capability.readPaths.includes(absolute) &&
			!(capability.outputDirectory && this.files.contains(capability.outputDirectory, absolute))
		)
			throw new Error('Input path is outside the assignment');
		return absolute;
	}

	/** Called by operations to retain exact serialized output without model-mediated copies.
	 * @param {WorkflowRun} run - Owning run.
	 * @param {WorkflowJson} value - Finite JSON result.
	 * @returns {WorkflowResultReceipt} - Reusable result handle and identity.
	 */
	_saveResult(run, value) {
		new InputContract().validate(value);
		const text = JSON.stringify(value);
		if (typeof text !== 'string' || Buffer.byteLength(text) > MAX_RESULT_BYTES)
			throw new Error('Result is not bounded JSON');
		const digest = this.files.hash(text);
		const handle = `${run.id}:${digest}`;
		const location = path.join(run.directory, 'results', `${digest}.json`);
		const reused = fs.existsSync(location);
		if (!reused) this.files.write(location, text);
		else if (this.files.hash(this.files.read(location)) !== digest) throw new Error('Saved result was changed');
		this._results.set(handle, {run: run.id, value: JSON.parse(text), text, location});
		return {handle, sha256: digest, bytes: Buffer.byteLength(text), path: location, reused};
	}

	/** Called by reads and operations to resolve only caller-visible result handles.
	 * @param {WorkflowCapability} capability - Verified caller authority.
	 * @param {string} handle - Exact persisted handle.
	 * @returns {WorkflowSavedResult} - Private cached result.
	 */
	_result(capability, handle) {
		if (typeof handle !== 'string' || !/^[a-z0-9-]+:[a-f0-9]{64}$/.test(handle))
			throw new Error('Invalid result handle');
		const [runId, digest] = handle.split(':');
		if (!capability.owner && (capability.run !== runId || !capability.handles.has(handle)))
			throw new Error('Result is outside the assignment');
		const run = this._run(runId);
		if (!this._results.has(handle)) {
			const location = path.join(run.directory, 'results', `${digest}.json`);
			const text = this.files.read(location);
			if (this.files.hash(text) !== digest) throw new Error('Result identity changed');
			this._results.set(handle, {run: runId, value: JSON.parse(text), text, location});
		}
		return this._results.get(handle);
	}

	/** Call this method to open or resume a run without rewriting its source bindings.
	 * @param {WorkflowOpenRequest} request - Owner capability and run inputs.
	 * @returns {WorkflowRunReceipt} - Stable run identity and scratch location.
	 */
	open({access, run: runId = randomUUID(), sourcePath = null, currentPath = null}) {
		this._authorize(access, undefined, true);
		if (!/^[a-z0-9][a-z0-9-]{0,100}$/.test(runId)) throw new Error('Invalid run identity');
		const directory = this.files.resolve(path.join(this.stateDirectory, 'runs', runId));
		const binding = {
			id: runId,
			sourcePath: sourcePath ? this.files.resolve(sourcePath) : null,
			currentPath: currentPath ? this.files.resolve(currentPath) : null,
		};
		const marker = path.join(directory, 'run.json');
		if (fs.existsSync(marker)) {
			if (JSON.stringify(this.files.json(marker)) !== JSON.stringify(binding))
				throw new Error('Run paths changed; open a new run and preserve the prior work');
		} else this.files.write(marker, JSON.stringify(binding));
		this._runs.set(runId, {...binding, directory});
		return {run: runId, directory, instance: this.instance};
	}

	/** Call this method to grant only named operations and inputs to one agent assignment.
	 * @param {WorkflowAssignmentRequest} request - Owner-authorized assignment.
	 * @returns {WorkflowAssignmentReceipt} - Opaque access token and scope receipt.
	 */
	assign({access, run, operations = [], handles = [], readPaths = [], outputDirectory = null, scope = {}}) {
		this._authorize(access, run, true);
		this._run(run);
		if (!Array.isArray(operations) || operations.some((name) => !this._operations[name]?.assignable))
			throw new Error('Only explicitly assignable operations may be delegated');
		const parent = this._authorize(access, run);
		for (const handle of handles) if (this._result(parent, handle).run !== run) throw new Error('Wrong run handle');
		const token = randomBytes(32).toString('hex');
		const capability = {
			owner: false,
			run,
			operations: [...operations],
			handles: new Set(handles),
			readPaths: readPaths.map((location) => this.files.resolve(location)),
			outputDirectory: outputDirectory ? this.files.resolve(outputDirectory) : null,
			scope: structuredClone(scope),
		};
		this._capabilities.set(token, capability);
		return {access: token, run, operations: capability.operations, outputDirectory: capability.outputDirectory};
	}

	/** Call this method from the parent before handing a guarded capability to a worker.
	 * @param {WorkflowAssignmentGuardRequest} request - Owner, exact assignment and synchronous guard.
	 * @returns {void}
	 */
	bindAssignmentGuard({access, run, assignmentAccess, guard}) {
		this._authorize(access, run, true);
		const assignment = this._authorize(assignmentAccess, run);
		if (
			assignment.owner ||
			assignment.scope?.assignmentGuardRequired !== true ||
			typeof guard !== 'function' ||
			guard.constructor.name === 'AsyncFunction'
		)
			throw new Error('A marked assignment and parent guard are required');
		if (this._assignmentGuards.has(assignmentAccess)) throw new Error('Assignment guard already bound');
		this._assignmentGuards.set(assignmentAccess, guard);
	}

	/** Call this method from the parent to invalidate a capability, including queued operations.
	 * @param {WorkflowAssignmentRevocation} request - Owner and exact assignment.
	 * @returns {void}
	 */
	revokeAssignment({access, run, assignmentAccess}) {
		this._authorize(access, run, true);
		const assignment = this._capabilities.get(assignmentAccess);
		if (assignment?.owner || (assignment && assignment.run !== run))
			throw new Error('Only an assignment in this run can be revoked');
		this._assignmentGuards.delete(assignmentAccess);
		this._capabilities.delete(assignmentAccess);
	}

	/** Called after asynchronous waits to run a synchronous mutation under its current claim.
	 * @param {string} access - Exact volatile capability.
	 * @param {string} run - Exact run.
	 * @param {WorkflowAssignmentAction} action - Synchronous storage operation.
	 * @returns {unknown} - Storage result.
	 */
	_withAssignment(access, run, action) {
		const capability = this._authorize(access, run);
		this._run(run);
		if (!capability.owner && capability.scope?.assignmentGuardRequired === true) {
			const guard = this._assignmentGuards.get(access);
			if (!guard) throw new Error('Assignment guard is not bound');
			const result = guard(action);
			if (result && typeof result.then === 'function') throw new Error('Assignment guards must be synchronous');
			return result;
		}
		return action();
	}

	/** Call this method to store an assigned proposal or existing file once.
	 * @param {WorkflowStoreRequest} request - Run, capability and exactly one data source.
	 * @returns {WorkflowResultReceipt} - Saved result; canonical files are never written.
	 */
	store({access, run: runId, value, file}) {
		const capability = this._authorize(access, runId);
		if (!capability.owner && !capability.operations.includes('result.store'))
			throw new Error('Result submission is not assigned');
		if ((value === undefined) === (file === undefined)) throw new Error('Supply value or file, exclusively');
		const data = file === undefined ? value : this.files.json(this._inputPath(capability, file));
		const receipt = /** @type {WorkflowResultReceipt} */ (
			this._withAssignment(access, runId, () => this._saveResult(this._run(runId), data))
		);
		if (!capability.owner) capability.handles.add(receipt.handle);
		return receipt;
	}

	/** Call this method to read one bounded page or selected JSON value from a result.
	 * @param {WorkflowReadRequest} request - Capability, handle, JSON pointer and byte cursor.
	 * @returns {WorkflowReadResult} - Bounded text and exact continuation offset.
	 */
	read({access, handle, pointer = '', offset = 0, maxBytes = this.readLimits.pageBytes}) {
		const runId = typeof handle === 'string' ? handle.split(':')[0] : undefined;
		const capability = this._authorize(access, runId);
		const result = this._result(capability, handle);
		if (
			!Number.isInteger(offset) ||
			offset < 0 ||
			!Number.isInteger(maxBytes) ||
			maxBytes < 256 ||
			maxBytes > this.readLimits.pageBytes
		)
			throw new Error('Invalid bounded read window');
		let value = result.value;
		if (pointer) {
			if (typeof pointer !== 'string' || !pointer.startsWith('/'))
				throw new Error('Use an RFC 6901 JSON pointer');
			for (const segment of pointer.slice(1).split('/')) {
				const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
				if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key))
					throw new Error('Pointer is missing');
				value = value[key];
			}
		}
		const bytes = Buffer.from(pointer ? JSON.stringify(value) : result.text);
		if (offset > bytes.length || (offset < bytes.length && (bytes[offset] & 0xc0) === 0x80))
			throw new Error('Cursor is not a UTF-8 boundary');
		let end = Math.min(bytes.length, offset + maxBytes);
		while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
		let page;
		do {
			page = {
				handle,
				pointer,
				offset,
				nextOffset: end < bytes.length ? end : null,
				totalBytes: bytes.length,
				text: bytes.subarray(offset, end).toString('utf8'),
			};
			if (Buffer.byteLength(JSON.stringify(page)) <= this.readLimits.envelopeBytes) return page;
			end--;
			while (end > offset && (bytes[end] & 0xc0) === 0x80) end--;
		} while (end >= offset);
		throw new Error('Pointer metadata exceeds the page budget');
	}

	/** Call this method to inspect current operation contracts without loading implementation files.
	 * @param {WorkflowCatalogRequest} request - Capability and optional operation name.
	 * @returns {WorkflowJson} - Available operation metadata, filtered by assignment.
	 */
	catalog({access, run, operation}) {
		const capability = this._authorize(access, run);
		const names = Object.keys(this._operations).filter(
			(name) => capability.owner || capability.operations.includes(name),
		);
		if (operation && !names.includes(operation)) throw new Error('Operation is not available');
		return (operation ? [operation] : names).map((name) => {
			const {description, inputSchema, assignable, writes, inlineResult} = this._operations[name];
			return {
				name,
				...(operation
					? {description, inputSchema, assignable, writes, ...(inlineResult ? {inlineResult: true} : {})}
					: {}),
			};
		});
	}

	/** Call this method to execute a maintained operation, preserving results for downstream consumers.
	 * Mutations queue per workspace; callers may poll a background job instead of holding a tool call.
	 * @param {WorkflowExecuteRequest} request - Operation, run and direct/handle-bound inputs.
	 * @returns {Promise<WorkflowJson>} - Result receipt or background job receipt.
	 */
	async execute({access, run: runId, operation, input = {}, inputHandles = {}, background = false}) {
		const capability = this._authorize(access, runId);
		const run = this._run(runId);
		const definition = this._operations[operation];
		if (!definition || (!capability.owner && !capability.operations.includes(operation)))
			throw new Error('Operation is not assigned');
		const values = structuredClone(input);
		for (const [key, handles] of Object.entries(inputHandles)) {
			if (Object.hasOwn(values, key)) throw new Error('Input was supplied twice');
			const resolve = (handle) => {
				if (typeof handle !== 'string') throw new Error('Input handle must be a string');
				const result = this._result(capability, handle);
				if (result.run !== runId) throw new Error('Wrong run input handle');
				return structuredClone(result.value);
			};
			Object.defineProperty(values, key, {
				value: Array.isArray(handles) ? handles.map(resolve) : resolve(handles),
				enumerable: true,
			});
		}
		new InputContract().validate(values, definition.inputSchema);
		const jobId = randomUUID();
		const queuedAt = performance.now();
		const job = {job: jobId, run: runId, operation, status: 'queued', result: null, error: null};
		capability.jobs ??= new Set();
		capability.jobs.add(jobId);
		this._jobs.set(jobId, job);
		const prior = this._queues.get(this.files.root) ?? Promise.resolve();
		const task = prior
			.catch(() => {})
			.then(async () => {
				const started = performance.now();
				job.status = 'running';
				try {
					this._withAssignment(access, runId, () => undefined);
					const context = {
						run,
						files: this.files,
						scope: capability.scope ?? {},
						owner: capability.owner,
						readPaths: capability.readPaths ?? [],
						outputDirectory: capability.outputDirectory ?? null,
						inputPath: (location) => this._inputPath(capability, location),
						withAssignment: (action) => this._withAssignment(access, runId, action),
					};
					const value = await definition.execute(values, context);
					this._withAssignment(access, runId, () => undefined);
					const receipt = this._saveResult(run, value ?? null);
					if (
						definition.inlineResult &&
						Buffer.byteLength(JSON.stringify({...receipt, inline: value})) <=
							Math.min(8192, this.readLimits.pageBytes)
					)
						receipt.inline = value;
					if (!capability.owner) capability.handles.add(receipt.handle);
					job.result = receipt;
					job.status = 'complete';
					return receipt;
				} catch (error) {
					job.status = 'failed';
					job.error = error.message;
					throw error;
				} finally {
					this.measurements.push({
						operation,
						run: runId,
						status: job.status,
						queuedMs: started - queuedAt,
						operationMs: performance.now() - started,
					});
				}
			});
		this._queues.set(
			this.files.root,
			task.catch(() => {}),
		);
		if (background) {
			task.catch(() => {});
			return {job: jobId, run: runId, status: 'queued'};
		}
		return task;
	}

	/** Call this method to inspect a run, an assigned job or parent-owned timing evidence.
	 * @param {WorkflowStatusRequest} request - Capability and optional run/job.
	 * @returns {WorkflowJson} - Compact status without capability disclosure.
	 */
	status({access, run, job, metrics = false}) {
		const capability = this._authorize(access, run);
		if (job) {
			const result = this._jobs.get(job);
			if (!result || result.run !== run) throw new Error('Unknown job for this run');
			if (!capability.owner && !capability.jobs?.has(job)) throw new Error('Job is outside the assignment');
			return structuredClone(result);
		}
		return {
			instance: this.instance,
			version: WORKFLOW_VERSION,
			workspace: this.files.root,
			readLimits: {...this.readLimits},
			run: run ?? null,
			...(metrics && capability.owner ? {measurements: this._saveResult(this._run(run), this.measurements)} : {}),
		};
	}

	/** Call this method before shutdown to finish accepted operations.
	 * @returns {Promise<void>} - All accepted jobs have settled.
	 */
	async drain() {
		await Promise.allSettled([...this._queues.values()]);
	}
}
