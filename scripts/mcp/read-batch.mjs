import assert from 'node:assert/strict';

/**
 * Call this method to format one independent read wave without copying product data.
 * Offsets must come from known first pages or returned continuations, not guesses.
 * Invalid, empty or duplicate requests throw before producing an assignment.
 *
 * @param {WorkflowReadBatch} batch - Assigned capability and known independent reads.
 * @returns {string} - Compact assignment text for a native-tool consumer.
 */
export function readBatchAssignment({access, reads}) {
	assert(typeof access === 'string' && access.length > 0, 'An assigned capability is required');
	assert(Array.isArray(reads) && reads.length > 0 && reads.length <= 32, 'Supply 1–32 independent reads');
	const keys = new Set();
	for (const read of reads) {
		assert(typeof read.handle === 'string' && read.handle.length > 0, 'Read handle required');
		assert(Number.isSafeInteger(read.offset) && read.offset >= 0, 'Known byte offset required');
		assert(Number.isSafeInteger(read.maxBytes) && read.maxBytes >= 256, 'Explicit page budget required');
		assert(read.pointer === undefined || typeof read.pointer === 'string', 'Pointer must be a string');
		assert(
			Object.keys(read).every((key) => ['handle', 'offset', 'maxBytes', 'pointer'].includes(key)),
			'Unexpected read argument',
		);
		const key = JSON.stringify([read.handle, read.pointer ?? '', read.offset]);
		assert(!keys.has(key), 'Duplicate read');
		keys.add(key);
	}
	return `Call mcp__polylith_workflows.workflow_read for every entry below in parallel, in one model response. All calls are independent. Every call uses access=${JSON.stringify(access)}.\n${JSON.stringify(reads)}`;
}
