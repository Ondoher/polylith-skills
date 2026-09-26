import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
	array,
	assertSha256,
	choice,
	closed,
	ensureUnlinkedPath,
	parseJsonFile,
	readBoundedFile,
	safeRelativeLabel,
	sha256,
	stableId,
	stableJson,
	text,
	unique,
	writeImmutable,
} from './product-artifact-utils.mjs';

const maxBytes = 16 * 1024 * 1024;
const stages = new Set(['interpret', 'ux', 'freeze', 'review', 'ui', 'assemble']);

/** Capture exact file identities before work starts, or after outputs settle. */
export function captureFiles(repositoryRoot, paths) {
	return unique(array(paths, 'paths'), 'paths')
		.map((relative) => {
			safeRelativeLabel(relative, 'file path');
			const file = path.resolve(repositoryRoot, relative);
			ensureUnlinkedPath(file, repositoryRoot);
			const bytes = readBoundedFile(file, maxBytes, relative);
			return {path: relative, sha256: sha256(bytes), byteLength: bytes.length};
		})
		.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

function nonnegative(value, label) {
	if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a nonnegative safe integer`);
}

/** Validate a receipt's bookkeeping; this cannot validate its design or review. */
export function validateStageReceipt(record) {
	closed(
		record,
		[
			'schemaVersion',
			'kind',
			'attemptId',
			'stage',
			'status',
			'scopeRefs',
			'requestSha256',
			'contractSha256',
			'inputs',
			'outputs',
			'startedAt',
			'finishedAt',
			'elapsedMs',
			'counts',
			'consultations',
			'usage',
			'assumptions',
			'issues',
		],
		'Stage receipt',
	);
	if (record.schemaVersion !== '1.0' || record.kind !== 'refinement-stage-receipt')
		throw new Error('Unsupported stage receipt');
	stableId(record.attemptId, 'attemptId');
	choice(record.stage, stages, 'stage');
	choice(record.status, new Set(['complete', 'needs-repair', 'blocked']), 'status');
	for (const key of ['requestSha256', 'contractSha256']) assertSha256(record[key], key);
	unique(array(record.scopeRefs, 'scopeRefs'), 'scopeRefs').forEach((ref) => text(ref, 'scope reference'));
	for (const key of ['inputs', 'outputs']) {
		const files = array(record[key], key);
		unique(
			files.map((file) => file.path),
			`${key} paths`,
		);
		for (const file of files) {
			closed(file, ['path', 'sha256', 'byteLength'], key);
			safeRelativeLabel(file.path, 'file path');
			assertSha256(file.sha256, 'file hash');
			nonnegative(file.byteLength, 'byteLength');
			if (file.byteLength > maxBytes) throw new Error('Receipt file exceeds byte limit');
		}
	}
	if (!record.inputs.length || (record.status === 'complete' && !record.outputs.length))
		throw new Error('Stage needs inputs and completed outputs');
	for (const key of ['startedAt', 'finishedAt']) {
		if (typeof record[key] !== 'string' || !Number.isFinite(Date.parse(record[key])))
			throw new Error(`Invalid ${key}`);
	}
	nonnegative(record.elapsedMs, 'elapsedMs');
	if (record.elapsedMs !== Date.parse(record.finishedAt) - Date.parse(record.startedAt))
		throw new Error('Stage duration does not match timestamps');
	closed(
		record.counts,
		['sourceInterpretations', 'sourceWritebacks', 'specialistCalls', 'correctionAttempts'],
		'counts',
	);
	for (const [key, value] of Object.entries(record.counts)) nonnegative(value, key);
	for (const consultation of array(record.consultations, 'consultations')) {
		closed(consultation, ['role', 'purpose'], 'consultation');
		text(consultation.role, 'role');
		text(consultation.purpose, 'purpose');
	}
	if (record.counts.specialistCalls !== record.consultations.length)
		throw new Error('Specialist count must match consultations');
	if (record.usage !== null) {
		closed(record.usage, ['unit', 'value', 'source', 'scope'], 'usage');
		choice(record.usage.unit, new Set(['tokens', 'credits']), 'usage unit');
		choice(record.usage.scope, new Set(['stage', 'aggregate']), 'usage scope');
		if (!Number.isFinite(record.usage.value) || record.usage.value < 0)
			throw new Error('Usage must be a nonnegative measurement');
		text(record.usage.source, 'usage provenance');
	}
	array(record.assumptions, 'assumptions').forEach((value) => text(value, 'assumption'));
	for (const issue of array(record.issues, 'issues')) {
		closed(issue, ['ref', 'problem', 'remedy'], 'issue');
		for (const value of Object.values(issue)) text(value, 'issue field');
	}
	if (record.status !== 'complete' && !record.issues.length)
		throw new Error('Incomplete stage requires a repair issue');
	return record;
}

/** Build a small receipt from captured files and observed, caller-supplied work. */
export function createStageReceipt({
	attemptId,
	stage,
	status = 'complete',
	scopeRefs = [],
	requestSha256,
	contractSha256,
	inputs,
	outputs = [],
	startedAt,
	finishedAt,
	sourceInterpretations = 0,
	sourceWritebacks = 0,
	correctionAttempts = 0,
	consultations = [],
	usage = null,
	assumptions = [],
	issues = [],
}) {
	return validateStageReceipt({
		schemaVersion: '1.0',
		kind: 'refinement-stage-receipt',
		attemptId,
		stage,
		status,
		scopeRefs,
		requestSha256,
		contractSha256,
		inputs,
		outputs,
		startedAt,
		finishedAt,
		elapsedMs: Date.parse(finishedAt) - Date.parse(startedAt),
		counts: {sourceInterpretations, sourceWritebacks, specialistCalls: consultations.length, correctionAttempts},
		consultations,
		usage,
		assumptions,
		issues,
	});
}

/** Save once; corrected attempts get new identities instead of erasing evidence. */
export function saveStageReceipt({repositoryRoot, productRoot, runId, receipt}) {
	validateStageReceipt(receipt);
	stableId(runId, 'runId');
	ensureUnlinkedPath(productRoot, repositoryRoot);
	const file = path.resolve(productRoot, 'runs', runId, `${receipt.attemptId}.json`);
	const bytes = Buffer.from(stableJson(receipt));
	if (bytes.length > maxBytes) throw new Error('Stage receipt exceeds byte limit');
	writeImmutable(file, bytes, productRoot);
	return file;
}

/** A positive result still requires the owning artifact/review validator. */
export function assessStageReuse(receipt, {repositoryRoot, requestSha256, contractSha256}) {
	validateStageReceipt(receipt);
	assertSha256(requestSha256, 'current request hash');
	assertSha256(contractSha256, 'current contract hash');
	const reasons = [];
	if (receipt.status !== 'complete') reasons.push(`Stage is ${receipt.status}`);
	if (receipt.requestSha256 !== requestSha256) reasons.push('Request or scope changed');
	if (receipt.contractSha256 !== contractSha256) reasons.push('Stage contract or validator changed');
	for (const key of ['inputs', 'outputs']) {
		for (const expected of receipt[key]) {
			try {
				const [current] = captureFiles(repositoryRoot, [expected.path]);
				if (current.sha256 !== expected.sha256 || current.byteLength !== expected.byteLength)
					reasons.push(`${key}: ${expected.path} changed`);
			} catch {
				reasons.push(`${key}: ${expected.path} unavailable or unsafe`);
			}
		}
	}
	return {reuseCandidate: reasons.length === 0, validationRequired: true, reasons};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const [mode, ...args] = process.argv.slice(2);
		const allowed = {
			capture: ['--repo', '--paths'],
			record: ['--repo', '--product-root', '--run', '--input'],
			check: ['--repo', '--input', '--request-sha256', '--contract-sha256'],
		}[mode];
		if (!allowed) throw new Error('Mode must be capture, record or check');
		const options = {};
		for (let i = 0; i < args.length; i += 2) {
			if (
				!allowed.includes(args[i]) ||
				options[args[i]] !== undefined ||
				!args[i + 1] ||
				args[i + 1].startsWith('--')
			)
				throw new Error(`Invalid option ${args[i]}`);
			options[args[i]] = args[i + 1];
		}
		for (const key of allowed) if (!options[key]) throw new Error(`${key} is required`);
		let result;
		if (mode === 'capture') result = captureFiles(options['--repo'], options['--paths'].split(','));
		else {
			const receipt = parseJsonFile(options['--input'], 'Stage receipt', maxBytes);
			if (mode === 'record')
				result = {
					path: saveStageReceipt({
						repositoryRoot: options['--repo'],
						productRoot: options['--product-root'],
						runId: options['--run'],
						receipt,
					}),
				};
			else {
				result = assessStageReuse(receipt, {
					repositoryRoot: options['--repo'],
					requestSha256: options['--request-sha256'],
					contractSha256: options['--contract-sha256'],
				});
				if (!result.reuseCandidate) process.exitCode = 1;
			}
		}
		process.stdout.write(stableJson(result));
	} catch (error) {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	}
}
