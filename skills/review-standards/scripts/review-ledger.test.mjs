import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
	aggregateReviewStatus,
	artifactDirectory,
	digest,
	validateLedger,
	effectiveRules,
	reviewArtifactPath,
	reviewArtifactRoot,
	safeFile,
	setupReviewArtifactRoot,
	validateRequestIntegrity,
} from './review-ledger.mjs';

test('formatting gates clean completion without hiding semantic findings', () => {
	const ready = {status: 'READY'};
	const notReady = {status: 'NOT_READY', stage: 'check'};
	assert.equal(aggregateReviewStatus({'ui-reviewer': 'CLEAN'}, 'CLEAN', ready), 'CLEAN');
	assert.equal(aggregateReviewStatus({'ui-reviewer': 'CLEAN'}, 'CLEAN', notReady), 'INCOMPLETE');
	assert.equal(
		aggregateReviewStatus({'ui-reviewer': 'FINDINGS_PRESENT'}, 'CLEAN', notReady),
		'FINDINGS_PRESENT',
	);
	assert.equal(aggregateReviewStatus({'ui-reviewer': 'INCOMPLETE'}, 'CLEAN', ready), 'INCOMPLETE');
});

test('review artifact setup adds the narrow ignore and creates the repository-local root', (t) => {
	const repo = mkdtempSync(path.join(tmpdir(), 'ledger-artifacts-'));
	t.after(() => rmSync(repo, {recursive: true, force: true}));
	execFileSync('git', ['init', '--quiet'], {cwd: repo});
	assert.throws(() => reviewArtifactRoot(repo), /not Git-ignored/);
	writeFileSync(path.join(repo, '.gitignore'), 'node_modules/');
	const root = setupReviewArtifactRoot(repo);
	assert.equal(root, path.join(repo, artifactDirectory));
	assert.equal(readFileSync(path.join(repo, '.gitignore'), 'utf8'), 'node_modules/\n/.codex-tmp/\n');
	assert.equal(reviewArtifactRoot(repo), root);
	assert.equal(reviewArtifactPath(repo, path.join(root, 'session-1', 'baseline.json')), path.join(root, 'session-1', 'baseline.json'));
	assert.throws(() => reviewArtifactPath(repo, path.join(repo, 'baseline.json')), /must be beneath/);
});

test('request cannot discard its lanes or AST paths while retaining a valid fingerprint', () => {
	const payload = {lanes: {ui: ['rule']}, mappings: ['Panel.jsx']};
	const request = {...payload, fingerprint: digest(payload)};
	assert.equal(validateRequestIntegrity(request, request), request);
	assert.throws(() => validateRequestIntegrity({...request, lanes: {}, mappings: []}, request), /Modified/);
	assert.throws(() => validateRequestIntegrity(request, {...request, fingerprint: 'stale'}), /Stale/);
});

// Synthetic reports exercise the ledger's structural contract only. These rows
// are not semantic calibration evidence or reviews of the representative rules.
const laneRules = {
	'architecture-reviewer': ['ARCHITECTURE-001', 'POLYLITH-001', 'REMVC-001'],
	'contracts-reviewer': ['TYPES-001', 'JSDOC-001'],
	'privacy-security-reviewer': ['DATA-PERSISTENCE-001', 'DATA-PERSISTENCE-002'],
	'ui-reviewer': ['REACT-STRUCT-001', 'REACT-EVENT-001'],
	'verification-reviewer': ['TESTING-001', 'TESTING-002'],
};

function fixture(t, lane = 'ui-reviewer') {
	const repo = mkdtempSync(path.join(tmpdir(), 'ledger-test-'));
	t.after(() => rmSync(repo, {recursive: true, force: true}));
	const source = 'export class Panel { render() { return null; } }\n';
	writeFileSync(path.join(repo, 'Panel.jsx'), source);
	const request = {
		repo,
		fingerprint: 'request-hash',
		baseline: {files: {'Panel.jsx': digest(source)}},
		current: {files: {'Panel.jsx': digest(source)}},
		lanes: {
			[lane]: laneRules[lane].map((id) => ({path: 'Panel.jsx', rule: {id}})),
		},
	};
	const primary = {
		kind: 'primary',
		lane,
		actor: 'primary-instance',
		fingerprint: request.fingerprint,
		entries: request.lanes[lane].map(({path: file, rule}) => ({
			path: file,
			ruleId: rule.id,
			status: 'compliant',
			reason: 'Synthetic structural fixture supplies a matching source quotation.',
			evidence: [{path: file, line: 1, quote: 'render() { return null; }'}],
		})),
	};
	const audit = () => ({
		...structuredClone(primary),
		kind: 'audit',
		actor: 'audit-instance',
		primaryDigest: digest(primary),
		entries: structuredClone(primary.entries).map((entry) => ({
			...entry,
			status: 'agree',
			reason: 'Synthetic independent audit supplies the required evidence fields.',
		})),
	});
	return {
		repo,
		request,
		primary,
		audit,
		validate: (other = audit()) => validateLedger(request, lane, primary, other),
	};
}

for (const lane of Object.keys(laneRules)) {
	test(`${lane}: complete current primary and independent audit can pass`, (t) => {
		assert.equal(fixture(t, lane).validate(), 'CLEAN');
	});
	for (const kind of ['primary', 'audit']) {
		test(`${lane}: ${kind} requires every rule exactly once`, (t) => {
			for (const mutate of [
				(p) => p.entries.pop(),
				(p) => p.entries.push(p.entries[0]),
				(p) => (p.entries[1] = p.entries[0]),
				(p) => (p.entries[0].ruleId = 'OTHER-001'),
			]) {
				const f = fixture(t, lane);
				const report = kind === 'primary' ? f.primary : f.audit();
				mutate(report);
				assert.throws(
					() => f.validate(kind === 'audit' ? report : undefined),
					/rule rows|unknown or duplicate rule/,
				);
			}
		});
		test(`${lane}: ${kind} rejects missing or invented evidence and empty reasoning`, (t) => {
			for (const mutate of [
				(e) => (e.evidence = []),
				(e) => (e.evidence[0].quote = 'invented'),
				(e) => (e.evidence[0].line = 99),
				(e) => (e.evidence[0].path = '../escape'),
				(e) => (e.reason = 'OK'),
			]) {
				const f = fixture(t, lane);
				const report = kind === 'primary' ? f.primary : f.audit();
				mutate(report.entries[0]);
				assert.throws(() => f.validate(kind === 'audit' ? report : undefined), /evidence|Evidence|reasoning/);
			}
		});
		test(`${lane}: ${kind} requires the current fingerprint and correct lane`, (t) => {
			for (const change of [{fingerprint: 'old'}, {lane: 'another-reviewer'}]) {
				const f = fixture(t, lane);
				const report = kind === 'primary' ? f.primary : f.audit();
				Object.assign(report, change);
				assert.throws(() => f.validate(kind === 'audit' ? report : undefined), /Missing or stale/);
			}
		});
	}
	test(`${lane}: source changes invalidate previously matching evidence`, (t) => {
		const f = fixture(t, lane);
		writeFileSync(path.join(f.repo, 'Panel.jsx'), 'export const changed = true;');
		assert.throws(() => f.validate(), /Stale evidence/);
	});
	test(`${lane}: absent audit, same actor, or stale primary digest fail closed`, (t) => {
		const f = fixture(t, lane);
		assert.throws(() => f.validate(null), /Missing or stale audit/);
		assert.throws(() => f.validate({...f.audit(), actor: f.primary.actor}), /different agent instance/);
		assert.throws(() => f.validate({...f.audit(), primaryDigest: 'old'}), /this primary report/);
	});
	test(`${lane}: primary uncertainty and audit uncertainty or disagreement remain incomplete`, (t) => {
		const f = fixture(t, lane);
		for (const status of ['disagree', 'unable-to-determine']) {
			const audit = f.audit();
			audit.entries[0].status = status;
			assert.equal(f.validate(audit), 'INCOMPLETE');
		}
		f.primary.entries[0].status = 'unable-to-determine';
		assert.equal(f.validate(), 'INCOMPLETE');
	});
	test(`${lane}: an acknowledged violation remains a finding`, (t) => {
		const f = fixture(t, lane);
		Object.assign(f.primary.entries[0], {
			status: 'violation',
			consequence: 'Synthetic consequence for the structural fixture.',
			remedy: 'Synthetic remedy for the structural fixture.',
			severity: 'important',
		});
		assert.equal(f.validate(), 'FINDINGS_PRESENT');
		const audit = f.audit();
		audit.entries[0].status = 'disagree';
		assert.equal(f.validate(audit), 'INCOMPLETE');
	});
	test(`${lane}: not-applicable still requires concrete source evidence`, (t) => {
		const f = fixture(t, lane);
		f.primary.entries[0].status = 'not-applicable';
		assert.equal(f.validate(), 'CLEAN');
		f.primary.entries[0].evidence = [];
		assert.throws(() => f.validate(), /Missing evidence/);
	});
}

test('deleted baseline-only files require actual absence and prior capture', (t) => {
	const f = fixture(t);
	delete f.request.current.files['Panel.jsx'];
	for (const entry of f.primary.entries) entry.evidence = [{path: 'Panel.jsx', deleted: true}];
	assert.throws(() => f.validate(), /absent/);
	rmSync(path.join(f.repo, 'Panel.jsx'));
	assert.equal(f.validate(), 'CLEAN');
});
test('per-section replacement retains other sections and accumulates additions', () => {
	const rules = [
		{id: 'A', section: ['Root', 'First']},
		{id: 'B', section: ['Root', 'Second']},
		{id: 'C', section: ['Root', 'Third']},
	];
	const entry = (target, scope, rule, operation = 'REPLACE') => ({
		standard: 'react.md',
		target: `react.md#${target}`,
		kind: scope === '.' ? 'repository' : 'folder',
		scope,
		folder: scope,
		operation,
		title: target,
		rule,
	});
	const entries = [
		entry('First', '.', 'wide'),
		entry('First', 'src/', 'narrow'),
		entry('Second', '.', 'second'),
		entry('Third', '.', 'extra', 'ADD'),
	];
	const result = effectiveRules(rules, entries, 'src/Panel.jsx', 'react.md');
	assert.deepEqual(
		result.map((item) => item.text || item.id),
		['C', 'extra', 'narrow', 'second'],
	);
});
test('invalid evidence paths cannot escape repository', (t) => {
	const f = fixture(t);
	for (const value of ['../outside', '/absolute', 'C:\\absolute', 'src/../Panel.jsx'])
		assert.throws(() => safeFile(f.repo, value));
});
