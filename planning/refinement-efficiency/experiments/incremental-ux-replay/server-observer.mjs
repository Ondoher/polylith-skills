// Instrument the existing service; operation contracts and authorization remain production-owned.
import {WorkflowService} from '../../../../scripts/mcp/WorkflowService.mjs';

for (const name of ['open', 'assign', 'store', 'read', 'catalog', 'execute', 'status']) {
	const original = WorkflowService.prototype[name];
	WorkflowService.prototype[name] = function (args) {
		const startedAt = new Date().toISOString();
		const started = performance.now();
		const report = (result, error) => {
			const sample = {
				event: 'service-observation',
				method: name,
				startedAt,
				endedAt: new Date().toISOString(),
				serviceMs: performance.now() - started,
				actor: args.access === this.ownerAccess ? 'owner' : 'assigned',
				failed: Boolean(error),
			};
			if (name === 'execute')
				Object.assign(sample, {
					operation: args.operation,
					batchId: args.operation === 'units.contribute' ? args.input?.batchId : undefined,
					contributionCount: args.operation === 'units.contribute' ? args.input?.changes?.length : undefined,
					inputBytes: Buffer.byteLength(JSON.stringify(args.input ?? {})),
				});
			if (['store', 'execute'].includes(name) && result)
				Object.assign(sample, {
					handle: result.handle,
					sha256: result.sha256,
					bytes: result.bytes,
					inlineReceipt: Object.hasOwn(result, 'inline'),
				});
			if (name === 'store' && args.value?.kind === 'ux-replay-phase') sample.phase = args.value.phase;
			if (name === 'read')
				Object.assign(sample, {
					handle: args.handle,
					pointer: args.pointer ?? '',
					offset: args.offset ?? 0,
					maxBytes: args.maxBytes,
					nextOffset: result?.nextOffset,
					totalBytes: result?.totalBytes,
					textBytes: Buffer.byteLength(result?.text ?? ''),
				});
			// Error prose can contain submitted product text. Keep it in private operation receipts.
			process.send?.(sample);
		};
		try {
			const result = original.call(this, args);
			if (result && typeof result.then === 'function')
				return result.then(
					(value) => {
						report(value);
						return value;
					},
					(error) => {
						report(undefined, error);
						throw error;
					},
				);
			report(result);
			return result;
		} catch (error) {
			report(undefined, error);
			throw error;
		}
	};
}
await import('../../../../scripts/mcp-server.mjs');
