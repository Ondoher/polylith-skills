import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {closed, object, parseJsonFile, sha256, text} from './product-artifact-utils.mjs';

/**
 * Called by ledger validation to reject a bookkeeping violation.
 *
 * @param {boolean} condition - Accepted contract condition.
 * @param {string} message - Caller-visible diagnostic.
 * @returns {void}
 */
function requireValue(condition, message) {
	if (!condition) throw new Error(message);
}

/**
 * Called by ledger validation to validate a bounded collection.
 *
 * @param {unknown} value - External collection.
 * @param {string} label - Diagnostic location.
 * @returns {unknown[]} - Validated array, without mutation.
 */
function array(value, label) {
	requireValue(Array.isArray(value) && value.length <= 10000, `${label} must be an array of at most 10000 items`);
	return value;
}

/**
 * Called by ledger validation to validate unique nonempty names.
 *
 * @param {unknown} value - External name collection.
 * @param {string} label - Diagnostic location.
 * @returns {string[]} - Validated names, without mutation.
 */
function names(value, label) {
	const values = array(value, label);
	for (const entry of values) text(entry, label);
	requireValue(new Set(values).size === values.length, `${label} contains duplicate names`);
	return values;
}

/**
 * Called by ledger validation to validate an exact-byte identity.
 *
 * @param {unknown} value - External identity record.
 * @param {string} label - Diagnostic location.
 * @returns {UiAuthorIdentity} - Validated identity, without mutation.
 */
function identity(value, label) {
	closed(value, ['id', 'sha256'], label);
	text(value.id, `${label}.id`);
	requireValue(
		typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/u.test(value.sha256),
		`${label}.sha256 is invalid`,
	);
	return value;
}

/**
 * Called by ledger validation to compare order-independent exact identity sets.
 *
 * @param {unknown} actual - Recorded identity collection.
 * @param {UiAuthorIdentity[]} expected - Parent's current identities.
 * @param {string} label - Diagnostic location.
 * @returns {void}
 */
function identities(actual, expected, label) {
	const values = array(actual, label).map((entry) => identity(entry, label));
	requireValue(
		new Set(values.map((entry) => entry.id)).size === values.length,
		`${label} contains duplicate identities`,
	);
	requireValue(
		values.length === expected.length &&
			values.every((entry) => expected.some((source) => sameIdentity(entry, source))),
		`${label} does not match current source identities`,
	);
}

/**
 * Called by ledger validation to compare one exact-byte identity.
 *
 * @param {UiAuthorIdentity} actual - Recorded identity.
 * @param {UiAuthorIdentity} expected - Parent's current identity.
 * @returns {boolean} - Exact identity equality.
 */
function sameIdentity(actual, expected) {
	return actual.id === expected.id && actual.sha256 === expected.sha256;
}

/**
 * Called by ledger validation to compare a source-reference tuple.
 *
 * @param {UiAuthorSourceRef} actual - Recorded reference.
 * @param {UiAuthorSourceRef} expected - Indexed reference.
 * @returns {boolean} - Exact reference equality.
 */
function sameSourceRef(actual, expected) {
	return actual.sourceId === expected.sourceId && actual.ref === expected.ref;
}

/**
 * Called by ledger validation to validate concrete source references.
 *
 * @param {unknown} value - External reference collection.
 * @param {UiAuthorCurrentSource[]} sources - Parent's exact source-reference index.
 * @param {string} label - Diagnostic location.
 * @returns {UiAuthorSourceRef[]} - Validated reference collection.
 */
function sourceRefs(value, sources, label) {
	const references = array(value, label);
	const keys = new Set();
	for (const reference of references) {
		closed(reference, ['sourceId', 'ref'], label);
		text(reference.sourceId, `${label}.sourceId`);
		text(reference.ref, `${label}.ref`);
		const key = JSON.stringify([reference.sourceId, reference.ref]);
		requireValue(!keys.has(key), `${label} contains duplicate references`);
		keys.add(key);
		requireValue(
			sources.some((source) => source.id === reference.sourceId && source.refs.includes(reference.ref)),
			`${label} contains an unknown source reference`,
		);
	}
	return references;
}

/**
 * Called by ledger validation to validate a concrete scene or node locator.
 *
 * @param {unknown} value - External candidate locator.
 * @param {string[]} fields - Additional required fields for the owning record.
 * @param {string} label - Diagnostic location.
 * @returns {UiAuthorEvidenceRef} - Validated locator.
 */
function evidenceRef(value, fields, label) {
	object(value, label);
	closed(value, ['sceneId', ...(Object.hasOwn(value, 'nodeId') ? ['nodeId'] : []), ...fields], label);
	text(value.sceneId, `${label}.sceneId`);
	if (Object.hasOwn(value, 'nodeId')) text(value.nodeId, `${label}.nodeId`);
	return value;
}

/**
 * Called by ledger validation to compare exact scene/node locators.
 *
 * @param {UiAuthorEvidenceRef} actual - Claimed locator.
 * @param {UiAuthorEvidenceRef} expected - Parent's indexed locator.
 * @returns {boolean} - Exact locator equality.
 */
function sameEvidenceRef(actual, expected) {
	return actual.sceneId === expected.sceneId && actual.nodeId === expected.nodeId;
}

/**
 * Call this method to hash the complete ordered requirement rows for a final recheck.
 * The digest covers JSON.stringify output in UTF-8, including field and row order.
 * This bookkeeping digest is distinct from exact delivered candidate/source file hashes.
 *
 * @param {UiAuthorRequirement[]} requirements - Current serializable requirement rows.
 * @returns {string} - Lowercase SHA-256 of the row serialization.
 * @throws {Error} When the rows cannot be serialized as JSON.
 */
function requirementsSha256(requirements) {
	return sha256(JSON.stringify(requirements));
}

/**
 * Called by the public validators to inspect the closed ledger and current context.
 * The context is parent-owned and must be rebuilt from current delivered bytes and
 * validated source/candidate references. It is never derived from ledger assertions.
 *
 * @param {UiAuthorCompletenessLedger} ledger - Author-owned companion record.
 * @param {UiAuthorCompletenessContext} context - Parent's current reference inventory.
 * @returns {void}
 * @throws {Error} When bookkeeping structure, ownership or identity claims fail.
 */
function inspectLedger(ledger, context) {
	const assignmentFields = ['productId', 'runId', 'assignmentId', 'authorId', 'ownedScopeIds'];
	object(context, 'context');
	closed(
		context,
		[
			...assignmentFields,
			'sources',
			'candidate',
			'permittedGaps',
			...(Object.hasOwn(context, 'requiredRequirementIds') ? ['requiredRequirementIds'] : []),
		],
		'context',
	);
	closed(
		ledger,
		[
			'schemaVersion',
			...assignmentFields,
			'sources',
			'candidate',
			'requirements',
			'inputReinspection',
			'finalRecheck',
			'history',
			'deliveryStatus',
		],
		'ledger',
	);
	requireValue(ledger.schemaVersion === '1.0', 'ledger.schemaVersion must be 1.0');
	for (const field of assignmentFields.filter((entry) => entry !== 'ownedScopeIds')) {
		text(context[field], `context.${field}`);
		requireValue(ledger[field] === context[field], `ledger.${field} does not match current assignment`);
	}
	const ownedScopes = names(context.ownedScopeIds, 'context.ownedScopeIds');
	requireValue(ownedScopes.length > 0, 'context.ownedScopeIds must not be empty');
	const ledgerScopes = names(ledger.ownedScopeIds, 'ledger.ownedScopeIds');
	requireValue(
		ledgerScopes.length === ownedScopes.length && ledgerScopes.every((scope) => ownedScopes.includes(scope)),
		'ledger.ownedScopeIds does not match current assignment',
	);
	const sources = array(context.sources, 'context.sources');
	requireValue(sources.length > 0, 'context.sources must not be empty');
	for (const source of sources) {
		closed(source, ['id', 'sha256', 'refs'], 'context.sources');
		identity({id: source.id, sha256: source.sha256}, 'context.sources');
		names(source.refs, 'context.sources.refs');
	}
	requireValue(
		new Set(sources.map((source) => source.id)).size === sources.length,
		'context.sources contains duplicate identities',
	);
	identities(ledger.sources, sources, 'ledger.sources');
	closed(context.candidate, ['id', 'sha256', 'references'], 'context.candidate');
	const currentCandidate = identity(
		{id: context.candidate.id, sha256: context.candidate.sha256},
		'context.candidate',
	);
	requireValue(
		sameIdentity(identity(ledger.candidate, 'ledger.candidate'), currentCandidate),
		'ledger.candidate does not match current candidate identity',
	);
	const references = array(context.candidate.references, 'context.candidate.references');
	const locatorKeys = new Set();
	for (const reference of references) {
		evidenceRef(reference, ['scopeId', 'sourceRefs'], 'context.candidate.references');
		text(reference.scopeId, 'context.candidate.references.scopeId');
		sourceRefs(reference.sourceRefs, sources, 'context.candidate.references.sourceRefs');
		const key = JSON.stringify([reference.sceneId, reference.nodeId ?? null]);
		requireValue(!locatorKeys.has(key), 'context.candidate.references contains duplicate locators');
		locatorKeys.add(key);
	}
	const permittedGaps = array(context.permittedGaps, 'context.permittedGaps');
	for (const gap of permittedGaps) {
		evidenceRef(gap, ['requirementId', 'reason'], 'context.permittedGaps');
		text(gap.requirementId, 'context.permittedGaps.requirementId');
		text(gap.reason, 'context.permittedGaps.reason');
		requireValue(typeof gap.nodeId === 'string', 'context.permittedGaps requires an existing component node');
		requireValue(
			references.some((reference) => sameEvidenceRef(reference, gap)),
			'context.permittedGaps contains an unknown candidate reference',
		);
	}
	const requirements = array(ledger.requirements, 'ledger.requirements');
	requireValue(requirements.length > 0, 'ledger.requirements must not be empty');
	const requirementIds = new Set();
	for (const requirement of requirements) {
		closed(
			requirement,
			['id', 'scopeId', 'kind', 'sourceRefs', 'meaning', 'dependencyRefs', 'status', 'evidenceRefs', 'reason'],
			'ledger.requirements',
		);
		text(requirement.id, 'requirement.id');
		requireValue(!requirementIds.has(requirement.id), 'ledger.requirements contains duplicate IDs');
		requirementIds.add(requirement.id);
		requireValue(ownedScopes.includes(requirement.scopeId), `requirement ${requirement.id} is outside owned scope`);
		requireValue(
			['scene', 'component-detail', 'requirement'].includes(requirement.kind),
			`requirement ${requirement.id} has invalid kind`,
		);
		text(requirement.meaning, `requirement ${requirement.id}.meaning`);
		const boundSources = sourceRefs(requirement.sourceRefs, sources, `requirement ${requirement.id}.sourceRefs`);
		requireValue(boundSources.length > 0, `requirement ${requirement.id} must be source-bound`);
		sourceRefs(requirement.dependencyRefs, sources, `requirement ${requirement.id}.dependencyRefs`);
		requireValue(
			['pending', 'covered', 'permitted-gap', 'blocked'].includes(requirement.status),
			`requirement ${requirement.id} has invalid status`,
		);
		requireValue(typeof requirement.reason === 'string', `requirement ${requirement.id}.reason must be text`);
		const evidence = array(requirement.evidenceRefs, `requirement ${requirement.id}.evidenceRefs`);
		const seenEvidence = new Set();
		for (const claim of evidence) {
			evidenceRef(claim, [], `requirement ${requirement.id}.evidenceRefs`);
			const key = JSON.stringify([claim.sceneId, claim.nodeId ?? null]);
			requireValue(!seenEvidence.has(key), `requirement ${requirement.id} contains duplicate evidence`);
			seenEvidence.add(key);
			const indexed = references.find((reference) => sameEvidenceRef(claim, reference));
			requireValue(Boolean(indexed), `requirement ${requirement.id} contains an unknown candidate reference`);
			requireValue(
				indexed.scopeId === requirement.scopeId,
				`requirement ${requirement.id} evidence is outside owned scope`,
			);
			requireValue(
				indexed.sourceRefs.some((reference) => boundSources.some((source) => sameSourceRef(source, reference))),
				`requirement ${requirement.id} evidence has no matching source binding`,
			);
		}
		if (requirement.status === 'covered')
			requireValue(evidence.length > 0, `covered requirement ${requirement.id} needs concrete evidence`);
		if (requirement.status === 'blocked') text(requirement.reason, `blocked requirement ${requirement.id}.reason`);
		if (requirement.status === 'permitted-gap') {
			requireValue(
				requirement.kind === 'component-detail',
				`permitted gap ${requirement.id} must concern component detail`,
			);
			text(requirement.reason, `permitted gap ${requirement.id}.reason`);
			requireValue(
				evidence.length > 0 &&
					evidence.every(
						(claim) =>
							typeof claim.nodeId === 'string' &&
							permittedGaps.some(
								(gap) =>
									gap.requirementId === requirement.id &&
									gap.reason === requirement.reason &&
									sameEvidenceRef(claim, gap),
							),
					),
				`permitted gap ${requirement.id} lacks the parent's existing component-detail exception`,
			);
		}
	}
	const expectedIds = names(context.requiredRequirementIds ?? [], 'context.requiredRequirementIds');
	requireValue(
		expectedIds.every((requirementId) => requirementIds.has(requirementId)),
		'ledger omits a parent-known requirement ID',
	);
	closed(ledger.inputReinspection, ['complete', 'sourceIdentities'], 'ledger.inputReinspection');
	requireValue(typeof ledger.inputReinspection.complete === 'boolean', 'inputReinspection.complete must be boolean');
	identities(ledger.inputReinspection.sourceIdentities, sources, 'inputReinspection.sourceIdentities');
	closed(
		ledger.finalRecheck,
		['complete', 'candidate', 'sourceIdentities', 'requirementIds', 'requirementsSha256'],
		'ledger.finalRecheck',
	);
	requireValue(typeof ledger.finalRecheck.complete === 'boolean', 'finalRecheck.complete must be boolean');
	identity(ledger.finalRecheck.candidate, 'finalRecheck.candidate');
	identities(ledger.finalRecheck.sourceIdentities, sources, 'finalRecheck.sourceIdentities');
	names(ledger.finalRecheck.requirementIds, 'finalRecheck.requirementIds');
	requireValue(
		typeof ledger.finalRecheck.requirementsSha256 === 'string' &&
			/^[a-f0-9]{64}$/u.test(ledger.finalRecheck.requirementsSha256),
		'finalRecheck.requirementsSha256 is invalid',
	);
	if (ledger.finalRecheck.complete) {
		requireValue(sameIdentity(ledger.finalRecheck.candidate, currentCandidate), 'finalRecheck.candidate is stale');
		requireValue(
			ledger.finalRecheck.requirementIds.length === requirementIds.size &&
				ledger.finalRecheck.requirementIds.every((requirementId) => requirementIds.has(requirementId)),
			'finalRecheck does not cover every current requirement',
		);
		requireValue(
			ledger.finalRecheck.requirementsSha256 === requirementsSha256(requirements),
			'finalRecheck requirement rows changed after the check',
		);
	}
	for (const event of array(ledger.history, 'ledger.history')) {
		closed(event, ['event', 'requirementIds', 'note'], 'ledger.history');
		requireValue(
			['discovery', 'repair', 'recheck', 'blocked', 'resume'].includes(event.event),
			'ledger.history has invalid event',
		);
		requireValue(
			names(event.requirementIds, 'history.requirementIds').every((requirementId) =>
				requirementIds.has(requirementId),
			),
			'ledger.history names an unknown requirement',
		);
		text(event.note, 'history.note');
	}
	requireValue(['working', 'ready', 'blocked'].includes(ledger.deliveryStatus), 'ledger.deliveryStatus is invalid');
}

/**
 * Called by the public validators to collect unfinished author obligations.
 *
 * @param {UiAuthorCompletenessLedger} ledger - Structurally validated ledger.
 * @returns {string[]} - Bookkeeping readiness blockers.
 */
function unfinishedIssues(ledger) {
	const issues = ledger.requirements
		.filter((requirement) => ['pending', 'blocked'].includes(requirement.status))
		.map((requirement) => `requirement ${requirement.id} remains ${requirement.status}`);
	if (!ledger.inputReinspection.complete) issues.push('original-input reinspection is incomplete');
	if (!ledger.finalRecheck.complete) issues.push('final all-requirement recheck is incomplete');
	return issues;
}

/**
 * Call this method to validate a companion ledger against the parent's current context.
 * Valid covered evidence proves existing locators and source bindings only. This pure
 * method cannot certify meaning, omission completeness, visual quality or independent
 * acceptance. Required IDs catch only omissions already known to the supplied parent.
 *
 * @param {unknown} ledger - External persisted companion ledger.
 * @param {unknown} context - Parent-owned current identity and reference inventory.
 * @returns {UiAuthorCompletenessValidation} - Validation result with first ingress failure or readiness contradictions.
 */
function validateLedger(ledger, context) {
	try {
		inspectLedger(ledger, context);
		const issues = ledger.deliveryStatus === 'ready' ? unfinishedIssues(ledger) : [];
		return {valid: issues.length === 0, issues};
	} catch (error) {
		return {valid: false, issues: [error instanceof Error ? error.message : String(error)]};
	}
}

/**
 * Call this method to assess exact-candidate author bookkeeping readiness.
 * A ready result is an author delivery status; existing independent acceptance gates
 * and source-based semantic checks remain authoritative. No input is changed.
 *
 * @param {unknown} ledger - External persisted companion ledger.
 * @param {unknown} context - Parent-owned current identity and reference inventory.
 * @returns {UiAuthorCompletenessReadiness} - Ready flag and concrete bookkeeping blockers.
 */
function assessReadiness(ledger, context) {
	const validation = validateLedger(ledger, context);
	if (!validation.valid) return {ready: false, issues: validation.issues};
	const issues = unfinishedIssues(ledger);
	if (ledger.deliveryStatus !== 'ready') issues.push(`deliveryStatus is ${ledger.deliveryStatus}`);
	return {ready: issues.length === 0, issues};
}

/** Pure companion-ledger bookkeeping operations, independent of UI runtime schemas. */
export const UiAuthorCompleteness = {validateLedger, assessReadiness, requirementsSha256};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const args = process.argv.slice(2);
		requireValue(
			args.length === 4 && args[0] === '--ledger' && args[2] === '--context',
			'Usage: UiAuthorCompleteness.mjs --ledger <json> --context <json>',
		);
		const ledger = parseJsonFile(args[1], 'ledger', 4 * 1024 * 1024);
		const context = parseJsonFile(args[3], 'context', 4 * 1024 * 1024);
		const result = assessReadiness(ledger, context);
		process.stdout.write(`${JSON.stringify(result)}\n`);
		process.exitCode = result.ready ? 0 : 1;
	} catch (error) {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	}
}
