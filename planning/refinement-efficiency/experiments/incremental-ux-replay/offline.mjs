import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {DesignContributions} from '../../../../skills/refine-design/scripts/design-contributions.mjs';
import {UxContributions} from '../../../../skills/refine-design/scripts/ux-contributions.mjs';
import {DesignRecords} from '../../../../skills/refine-design/scripts/design-records.mjs';
import {DesignAssembly} from '../../../../skills/refine-design/scripts/design-assembly.mjs';
import {validateUxSpec} from '../../../../skills/refine-design/scripts/ux-design.mjs';
import {createUxTestSpec} from '../../../../skills/refine-design/scripts/ux-test-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const sources = JSON.parse(fs.readFileSync(new URL('./sources.json', import.meta.url)));
const schema = JSON.parse(fs.readFileSync(path.join(root, 'skills/refine-design/references/ux-schema-0.4.json')));
const resolve = (rule) => (rule?.$ref ? schema.$defs[rule.$ref.split('/').at(-1)] : rule);
const sha = (raw) => createHash('sha256').update(raw).digest('hex');
const bytes = (value) => Buffer.byteLength(JSON.stringify(value));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const reference = (unit) => `${unit.kind}:${unit.id}`;
const read = (file) => JSON.parse(fs.readFileSync(file));
const fromDigest = (digest) => {
	const raw = fs.readFileSync(path.join(root, sources.results, digest + '.json'));
	assert.equal(sha(raw), digest, 'Retained source digest mismatch');
	return JSON.parse(raw);
};
const baseline = fromDigest(sources.baselineUnits);
const targets = Object.entries(sources.firstOutputs).map(([ref, digest]) => {
	const units = fromDigest(digest);
	assert.equal(units.length, 1);
	assert.equal(reference(units[0]), ref);
	return units[0];
});

// Offline fixture conversion only: the author never receives retained targets or this diff.
function diffRecord(unit, old, next, rule, target = []) {
	const changes = [],
		fields = {},
		unset = [];
	const properties = resolve(rule)?.properties ?? {};
	for (const key of Object.keys(old)) if (!Object.hasOwn(next, key)) unset.push(key);
	if (unset.length) changes.push({unit, op: 'set', ...(target.length ? {target} : {}), unset});
	for (const [key, value] of Object.entries(next)) {
		if (equal(old[key], value)) continue;
		const child = resolve(properties[key]);
		const identified = child?.type === 'array' && resolve(child.items)?.properties?.id;
		if (identified && Array.isArray(value) && Array.isArray(old[key])) {
			const before = new Map(old[key].map((item) => [item.id, item]));
			const after = new Map(value.map((item) => [item.id, item]));
			for (const id of before.keys())
				if (!after.has(id)) changes.push({unit, op: 'remove', target: [...target, {collection: key, id}]});
			for (const item of value)
				changes.push(
					...diffRecord(unit, before.get(item.id) ?? {id: item.id}, item, child.items, [
						...target,
						{collection: key, id: item.id},
					]),
				);
			const defaultOrder = [...before.keys()]
				.filter((id) => after.has(id))
				.concat([...after.keys()].filter((id) => !before.has(id)));
			if (
				!equal(
					defaultOrder,
					value.map((item) => item.id),
				)
			)
				changes.push({
					unit,
					op: 'order',
					...(target.length ? {target} : {}),
					collection: key,
					ids: value.map((item) => item.id),
				});
		} else if (identified && Array.isArray(value) && value.length) {
			for (const item of value)
				changes.push(
					...diffRecord(unit, {id: item.id}, item, child.items, [...target, {collection: key, id: item.id}]),
				);
		} else {
			// Nested plain objects merge in production. Remove a field first if its
			// replacement intentionally omits old nested fields; retain exact values.
			if (
				old[key] &&
				value &&
				!Array.isArray(value) &&
				typeof old[key] === 'object' &&
				typeof value === 'object'
			) {
				const removed = (a, b) =>
					Object.keys(a).some(
						(name) =>
							!Object.hasOwn(b, name) ||
							(a[name] &&
								b[name] &&
								!Array.isArray(a[name]) &&
								typeof a[name] === 'object' &&
								typeof b[name] === 'object' &&
								removed(a[name], b[name])),
					);
				if (removed(old[key], value))
					changes.push({unit, op: 'set', ...(target.length ? {target} : {}), unset: [key]});
			}
			fields[key] = value;
		}
	}
	if (Object.keys(fields).length) changes.push({unit, op: 'set', ...(target.length ? {target} : {}), fields});
	return changes;
}

function diffUnit(oldRecord, targetRecord) {
	const previous = oldRecord ? UxContributions.decode(oldRecord) : UxContributions.empty(reference(targetRecord));
	const next = UxContributions.decode(targetRecord);
	const ref = reference(next);
	const before = next.kind === 'context' ? previous.data.document : previous.data;
	const after = next.kind === 'context' ? next.data.document : next.data;
	const changes = diffRecord(ref, before, after, next.kind === 'flow' ? schema.$defs.flow : schema);
	if (next.kind === 'context')
		for (const [collection, ids] of Object.entries(next.data.order))
			if (!equal(previous.data.order[collection], ids))
				changes.push({unit: ref, op: 'catalog-order', collection, ids});
	return changes;
}

const attemptName = process.argv.find((arg) => arg.startsWith('--attempt='))?.slice(10);
assert(attemptName && /^[a-z0-9-]+$/.test(attemptName), 'Supply a unique --attempt=<name>');
const attempt = path.join(root, '.codex-tmp/incremental-ux-offline', attemptName);
assert(!fs.existsSync(attempt), 'Preserve saved construction evidence');
fs.mkdirSync(attempt, {recursive: true});
const write = (name, value) => fs.writeFileSync(path.join(attempt, name), JSON.stringify(value, null, 2) + '\n');
const changes = targets.flatMap((target) =>
	diffUnit(
		baseline.find((unit) => reference(unit) === reference(target)),
		target,
	),
);
write('contributions.private.json', changes);
const report = {
	experiment: 'retained-UX-incremental-construction',
	sources,
	changes: changes.length,
	operationCounts: Object.fromEntries(
		['set', 'remove', 'order', 'catalog-order'].map((op) => [
			op,
			changes.filter((change) => change.op === op).length,
		]),
	),
	baselineUnitBytes: bytes(baseline),
	targetUnitBytes: bytes(targets),
	bareContributionBytes: bytes(changes),
	trials: [],
	limits: [
		'Offline diff uses retained completed values. It does not demonstrate model authoring speed or UX quality.',
		'Packed authoring-unit equality and decoded semantic equality are reported separately; default packing is code-owned.',
		'Retained first-pass defects remain explicit finish issues. No output is auto-corrected.',
		'Batch bytes include stage, IDs, opaque revisions and changes; transport access/run envelope bytes are reported separately.',
		'All replay outputs and batches remain private scratch evidence; this report contains source identities and measurements only.',
	],
};
const setup = (name, units) => {
	const store = path.join(attempt, name);
	DesignRecords.initialize(store, {stage: 'ux', binding: {baselineSha256: sources.baselineUnits, experiment: name}});
	for (const unit of units) DesignRecords.put(store, unit);
	return store;
};
const submit = (store, suppliedChanges, size, prefix) => {
	const refs = [...new Set(suppliedChanges.map((change) => change.unit))];
	let current = Object.fromEntries(
		DesignContributions.status(store, refs).units.map((unit) => [unit.reference, unit.revision]),
	);
	const batches = [],
		receipts = [];
	for (let offset = 0; offset < suppliedChanges.length; offset += size) {
		const part = suppliedChanges.slice(offset, offset + size);
		const base = Object.fromEntries(
			[...new Set(part.map((change) => change.unit))].map((ref) => [ref, current[ref]]),
		);
		const input = {stage: 'ux', batchId: `${prefix}-${batches.length + 1}`, base, changes: part};
		const receipt = DesignContributions.contribute(store, input);
		batches.push(input);
		receipts.push(receipt);
		for (const accepted of receipt.accepted) current[accepted.reference] = accepted.revision;
	}
	return {batches, receipts};
};
for (const size of [5, 10, 20]) {
	const started = performance.now();
	const store = setup(`batch-${size}`, baseline);
	const {batches, receipts} = submit(store, changes, size, 'retained');
	write(`batch-${size}.private.json`, {batches, receipts});
	const issues = receipts.flatMap((receipt) => receipt.issues);
	const materializationStarted = performance.now();
	const finish = DesignContributions.finish(store, targets.map(reference));
	const materializationMs = performance.now() - materializationStarted;
	write(`finish-${size}.private.json`, finish);
	const actual = DesignRecords.read(store, targets.map(reference)).records;
	const expectedUnits = baseline.map(
		(unit) => targets.find((target) => reference(target) === reference(unit)) ?? unit,
	);
	const actualCanonical = DesignAssembly.ux(DesignRecords.read(store).records);
	const rawTargetAssembly = DesignAssembly.ux(expectedUnits);
	const expectedCanonical = DesignAssembly.ux(
		expectedUnits.map((unit) => UxContributions.encode(UxContributions.decode(unit))),
	);
	const canonicalValuesExact = isDeepStrictEqual(actualCanonical.document, expectedCanonical.document);
	const semanticExact = targets.every((target) => {
		try {
			assert.deepEqual(
				UxContributions.decode(actual.find((unit) => reference(unit) === reference(target))),
				UxContributions.decode(target),
			);
			return true;
		} catch {
			return false;
		}
	});
	const packedExact = targets.every((target) => {
		try {
			assert.deepEqual(
				actual.find((unit) => reference(unit) === reference(target)),
				target,
			);
			return true;
		} catch {
			return false;
		}
	});
	const retry = DesignContributions.contribute(store, batches[0]);
	assert.equal(retry.reused, true);
	DesignContributions.close(store);
	const restartStarted = performance.now();
	const resumed = DesignContributions.status(store, targets.map(reference));
	const recoveryMs = performance.now() - restartStarted;
	assert.equal(resumed.batchCount, batches.length);
	const retriedAfterRestart = DesignContributions.contribute(store, batches.at(-1));
	assert.equal(retriedAfterRestart.reused, true);
	report.trials.push({
		batchSize: size,
		calls: batches.length,
		contributionBytes: batches.reduce((sum, input) => sum + bytes(input), 0),
		transportArgumentBytes: batches.reduce(
			(sum, input) =>
				sum +
				bytes({access: 'x'.repeat(64), run: 'incremental-ux-first-pass', operation: 'units.contribute', input}),
			0,
		),
		journalBytes: receipts.reduce((sum, receipt) => sum + receipt.journalBytes, 0),
		validationPersistenceMs: receipts.reduce((sum, receipt) => sum + receipt.elapsedMs, 0),
		materializationMs,
		recoveryMs,
		totalMs: performance.now() - started,
		semanticExact,
		packedExact,
		canonicalValuesExact,
		packedResultBytes: bytes(actual),
		packedSourceBytes: bytes(targets),
		unchangedUnitsReused: baseline.filter(
			(unit) => !targets.some((target) => reference(target) === reference(unit)),
		).length,
		acceptedContributions: receipts
			.flatMap((receipt) => receipt.accepted)
			.reduce((sum, item) => sum + item.changes, 0),
		rejectedGroups: issues.length,
		rejectionReasons: [...new Set(issues.map((issue) => issue.reason))],
		finishStatus: finish.status,
		finishIssueCount: finish.issues.length,
		rawCapturedPackingIssues: rawTargetAssembly.issues.map(({reference, reason}) => ({reference, reason})),
		finishIssues: finish.issues.map(({reference, reason}) => ({reference, reason})),
		exactRetryReused: retry.reused && retriedAfterRestart.reused,
	});
}
write('offline-metrics.json', report);
const typo = fromDigest(sources.originalTypoOutput)[0];
const corrected = targets.find((unit) => reference(unit) === reference(typo));
const typoChanges = diffUnit(corrected, typo);
const typoStore = setup(
	'known-typo',
	baseline.map((unit) => (reference(unit) === reference(corrected) ? corrected : unit)),
);
const typoResult = submit(typoStore, typoChanges, 20, 'expected-typo');
assert(
	typoResult.receipts.some((receipt) => receipt.issues.some((issue) => /outcomecome/.test(issue.reason))),
	'Original misspelled field must be explicitly rejected',
);
report.originalTypo = {
	expectedRejectedField: 'outcomecome',
	contributionCount: typoChanges.length,
	issues: typoResult.receipts
		.flatMap((receipt) => receipt.issues)
		.map(({reference, reason}) => ({reference, reason})),
};
write('known-typo.private.json', typoResult);
// Exercise a valid one-field correction against the prior persisted typo fixture.
// The unknown key is removed explicitly; the outcome field is supplied by name.
const correctionStore = setup(
	'single-field-correction',
	baseline.map((unit) => (reference(unit) === reference(typo) ? typo : unit)),
);
const correction = submit(correctionStore, diffUnit(typo, corrected), 20, 'explicit-correction');
const correctionFinish = DesignContributions.finish(correctionStore, [reference(corrected)]);
assert(
	isDeepStrictEqual(DesignRecords.read(correctionStore, [reference(corrected)]).records[0], corrected),
	'Explicit correction differs from the saved corrected unit',
);
report.singleFieldCorrection = {
	calls: correction.batches.length,
	changes: correction.batches.flatMap((batch) => batch.changes).length,
	argumentBytes: correction.batches.reduce((sum, batch) => sum + bytes(batch), 0),
	wholeFlowBytesAvoided: bytes(corrected),
	exactCorrectedUnit: true,
	materializationMs: correctionFinish.elapsedMs,
};
write('single-field-correction.private.json', {correction, correctionFinish});
// Retained UX4 contains a legacy traceGaps owner outside the current schema.
// Keep it unchanged and use the existing valid public fixture for construction.
const priorUx = createUxTestSpec();
validateUxSpec(priorUx);
const emptyUnits = DesignAssembly.importUx(priorUx);
const emptyStore = setup('empty-construction', []);
const emptyChanges = emptyUnits.flatMap((unit) => diffUnit(null, unit));
const empty = submit(emptyStore, emptyChanges, 20, 'empty');
const emptyFinish = DesignContributions.finish(emptyStore, emptyUnits.map(reference));
const emptyRecords = DesignRecords.read(emptyStore).records;
const assembled = DesignAssembly.ux(emptyRecords);
assert.equal(empty.receipts.flatMap((receipt) => receipt.issues).length, 0, 'Empty construction rejected fields');
assert.equal(assembled.issues.length, 0, 'Empty construction assembly failed');
validateUxSpec(assembled.document);
assert(
	isDeepStrictEqual(assembled.document, priorUx),
	'Empty construction must preserve the valid prior canonical UX values',
);
report.emptyConstruction = {
	source: 'skills/refine-design/scripts/ux-test-fixture.mjs#createUxTestSpec',
	calls: empty.batches.length,
	changes: emptyChanges.length,
	status: emptyFinish.status,
	schemaValid: true,
	exactCanonicalValues: true,
	materializationMs: emptyFinish.elapsedMs,
};
report.inheritedBaselineLimitation =
	'Retained UX4 traceGaps owner refinement-tooling is outside the current schema. It is preserved for update replay; empty construction uses the maintained public fixture.';
write('empty-construction.private.json', {empty, emptyFinish});
write('offline-metrics.json', report);
console.log(
	JSON.stringify({
		attempt,
		changes: changes.length,
		trials: report.trials.map(({batchSize, semanticExact, packedExact, rejectedGroups, finishStatus}) => ({
			batchSize,
			semanticExact,
			packedExact,
			rejectedGroups,
			finishStatus,
		})),
		emptyConstruction: report.emptyConstruction,
	}),
);
assert(
	report.trials.every((trial) => trial.semanticExact && trial.canonicalValuesExact),
	'Retained semantic reconstruction failed; preserve report and inspect rejected fields',
);
