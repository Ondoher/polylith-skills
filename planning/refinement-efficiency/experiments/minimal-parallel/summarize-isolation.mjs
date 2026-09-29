import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const digest = (file) =>
	createHash('sha256')
		.update(fs.readFileSync(path.join(root, file)))
		.digest('hex');
const profiles = [
	'namespace',
	'workflow-schema',
	'workflow-mcp',
	'full-tools',
	'base-instructions',
	'full-context',
	'conversation',
];
const isolation = profiles.map((profile) => {
	const source = `.codex-tmp/native-isolation-20260929/${profile}-01/metrics.json`;
	const result = read(source);
	return {
		profile,
		source,
		sourceSha256: digest(source),
		elapsedMs: result.elapsedMs,
		verified: result.allEightVerified,
		requests: result.requests.length,
		maxCallsPerResponse: result.maxCallsPerResponse,
		maxConcurrentExecutions: result.maxConcurrentExecutions,
		usage: result.usage,
	};
});
const attempts = [
	'native-brief-eight-20260929-01',
	'native-brief-eight-20260929-02',
	'native-brief-eight-20260929-03',
	'native-brief-eight-20260929-04',
	'native-launcher-eight-20260929-01',
	'native-launcher-eight-20260929-02',
];
const live = attempts.map((attempt) => {
	const directory = `.codex-tmp/ux-read-window-20260928/${attempt}`;
	const control = read(`${directory}/control.json`);
	const metadataPath = `${directory}/live-request-metadata.json`;
	const metadata = fs.existsSync(path.join(root, metadataPath)) ? read(metadataPath) : null;
	const groups = {};
	for (const item of metadata?.responses ?? []) {
		if (item.itemType === 'function_call' && item.name === 'workflow_read')
			groups[item.responseId] = (groups[item.responseId] ?? 0) + 1;
	}
	const requests = (metadata?.requests ?? []).filter(
		(item) => item.generate !== false && item.model === 'gpt-6-astra',
	);
	const verifiedPath = `planning/refinement-efficiency/ux-native-mcp-20260928-${attempt}-metrics.json`;
	const verified = fs.existsSync(path.join(root, verifiedPath)) ? read(verifiedPath) : null;
	return {
		attempt,
		source: directory,
		controlSha256: digest(`${directory}/control.json`),
		status: control.status,
		error: control.error ?? null,
		elapsedMs: control.agentWindowMs ?? null,
		generationRequests: requests.length,
		allGenerationRequestsPermitParallelCalls:
			requests.length > 0 && requests.every((item) => item.parallelToolCalls === true),
		readResponseGroups: groups,
		maxReadsPerResponse: Math.max(0, ...Object.values(groups)),
		returnedBytesVerified: verified?.results.reduce((total, item) => total + item.textBytes, 0) ?? null,
		allRequestedReadsVerified: verified?.allRequestedReadsVerified ?? null,
		verificationReport: verified ? verifiedPath : null,
		usage: control.reportedUsage ?? null,
		observerErrors: metadata?.errors ?? [],
	};
});
const report = {
	experiment: 'Native workflow parallelism implementation',
	startedAt: '2026-09-29T13:20:35Z',
	compiledAt: new Date().toISOString(),
	baselineCommit: 'b69518f',
	isolation,
	live,
	limits: [
		'Synthetic isolation tests exclude Codex client scheduling.',
		'Live trials reuse eight predetermined saved pages; they do not measure full UX reasoning.',
		'Cached input tokens are a subset of input tokens, not an additional total.',
		'Per-call model-generation duration is unavailable for coalesced native batches.',
	],
};
const destination = path.join(root, 'planning/refinement-efficiency/native-parallel-execution-20260929-metrics.json');
fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
console.log(
	JSON.stringify({
		isolation: isolation.map(({profile, elapsedMs, maxCallsPerResponse}) => ({
			profile,
			elapsedMs,
			maxCallsPerResponse,
		})),
		live: live.map(({attempt, elapsedMs, generationRequests, maxReadsPerResponse, returnedBytesVerified}) => ({
			attempt,
			elapsedMs,
			generationRequests,
			maxReadsPerResponse,
			returnedBytesVerified,
		})),
	}),
);
