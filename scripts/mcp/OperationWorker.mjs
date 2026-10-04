import {Worker} from 'node:worker_threads';
import {randomUUID} from 'node:crypto';
import {DomainOperations} from './DomainOperations.mjs';

/** One maintained worker keeps synchronous domain engines off the HTTP event loop. */
export class OperationWorker {
	/** Creates a lazy worker and operation metadata without loading domain modules. */
	constructor() {
		this._worker = null;
		this._pending = new Map();
		this._definitions = new DomainOperations().operations;
		this.operations = Object.fromEntries(
			Object.entries(this._definitions).map(([name, definition]) => [
				name,
				{...definition, execute: (input, context) => this._execute(name, input, context)},
			]),
		);
	}

	/** Starts the worker on demand, retaining imported modules between operations.
	 * @returns {void}
	 */
	_start() {
		if (this._worker) return;
		const worker = new Worker(new URL('./operation-worker.mjs', import.meta.url));
		this._worker = worker;
		worker.on('message', ({id, value, error}) => {
			const pending = this._pending.get(id);
			if (!pending) return;
			this._pending.delete(id);
			if (error) pending.reject(new Error(error));
			else pending.resolve(value);
		});
		worker.on('error', (error) => this._fail(error));
		worker.on('exit', (code) => {
			if (this._worker === worker) {
				this._worker = null;
				this._fail(new Error(`Operation worker exited (${code}); saved results remain reusable`));
			}
		});
	}

	/** Rejects in-flight work without silently retrying a possibly completed mutation.
	 * @param {Error} error - Worker failure.
	 * @returns {void}
	 */
	_fail(error) {
		for (const pending of this._pending.values()) pending.reject(error);
		this._pending.clear();
	}

	/** Runs a catalog operation with a serializable assigned context.
	 * @param {string} operation - Curated name.
	 * @param {object} input - Validated arguments.
	 * @param {WorkflowOperationContext} context - Authorized run and paths.
	 * @returns {Promise<WorkflowJson>} - Exact domain result.
	 */
	_execute(operation, input, context) {
		if (context.scope.assignmentGuardRequired === true) {
			if (typeof context.withAssignment !== 'function')
				return Promise.reject(new Error('Guarded operation requires its parent context'));
			return Promise.resolve(this._definitions[operation].execute(input, context));
		}
		this._start();
		const id = randomUUID();
		return new Promise((resolve, reject) => {
			this._pending.set(id, {resolve, reject});
			this._worker.postMessage({
				id,
				operation,
				input,
				context: {
					run: context.run,
					workspace: context.files.root,
					scope: context.scope,
					owner: context.owner,
					readPaths: context.readPaths,
					outputDirectory: context.outputDirectory,
				},
			});
		});
	}

	/** Call this method after service drain to release the owned worker.
	 * @returns {Promise<void>} - Worker termination.
	 */
	async close() {
		const worker = this._worker;
		this._worker = null;
		if (worker) await worker.terminate();
	}
}
