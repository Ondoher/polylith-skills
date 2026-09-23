#!/usr/bin/env node
import {readFileSync, writeFileSync, realpathSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {digest, validateLedger, validateRequestIntegrity} from './review-ledger.mjs';
import {parseRules} from './rule-inventory.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skill = path.dirname(scriptDirectory);
const codex = path.resolve(skill, '../..');
const root = path.join(skill, 'fixtures');
const read = (file) => readFileSync(file, 'utf8');
const rulesFor = (name) => parseRules(read(path.join(codex, 'documentation/standards', name)), name);
const ruleNamed = (rules, text) => {
	const matches = rules.filter((rule) => rule.text.includes(text));
	if (matches.length !== 1) throw new Error(`Calibration rule selector must identify exactly one block: ${text}`);
	return matches[0];
};

const architectureCases = {
	'architecture/features/orders/OrderController.js': ['ARCHITECTURE-015', 'REMVC-045', 'POLYLITH-024'],
	'architecture/features/orders/InvoiceController.js': ['ARCHITECTURE-015', 'REMVC-045', 'POLYLITH-024'],
	'architecture/PriceService.js': ['POLYLITH-030', 'REMVC-038', 'REMVC-043'],
	'architecture/TotalService.js': ['POLYLITH-030', 'REMVC-038', 'REMVC-043'],
	'architecture/EntryA.js': ['POLYLITH-022', 'REMVC-044'],
	'architecture/EntryB.js': ['POLYLITH-022', 'REMVC-044'],
};
const architectureDependencies = ['architecture/shared/ledger.js', 'architecture/features/billing/private/Ledger.js'];

export function calibrationRequest() {
	const react = rulesFor('react.md');
	const remvc = rulesFor('remvc.md');
	const architecturalRules = [...remvc, ...rulesFor('polylith.md'), ...rulesFor('architecture.md')];
	const rules = [
		ruleNamed(react, 'Break a large render'),
		ruleNamed(react, 'Do not use inline event callbacks'),
		ruleNamed(react, 'Components do not reach directly into models'),
		ruleNamed(remvc, '| Owner | Must own | Must not own |'),
	];
	const originalCases = ['CaseA.jsx', 'CaseB.js', 'CaseC.js', 'CaseD.jsx'];
	const files = Object.fromEntries(
		[...originalCases, ...Object.keys(architectureCases), ...architectureDependencies].map((file) => [
			file,
			digest(readFileSync(path.join(root, file))),
		]),
	);
	const payload = {
		version: 1,
		purpose: 'calibration-only; never application compliance',
		inputs: calibrationInputs(),
		repo: realpathSync(root),
		baseline: {files},
		current: {files},
		lanes: {
			calibration: [
				...originalCases.flatMap((file) => rules.map((rule) => ({path: file, rule}))),
				...Object.entries(architectureCases).flatMap(([file, ids]) =>
					ids.map((id) => {
						const rule = architecturalRules.find((item) => item.id === id);
						if (!rule) throw new Error(`Missing calibration rule: ${id}`);
						return {path: file, rule};
					}),
				),
			],
		},
	};
	return {...payload, fingerprint: digest(payload)};
}

export function validateCalibration(request, primary, audit, relocate = false) {
	const live = calibrationRequest();
	const {fingerprint: liveFingerprint, ...payload} = live;
	if (relocate) payload.repo = request.repo;
	validateRequestIntegrity(request, {...payload, fingerprint: digest(payload)});
	// Relocation preserves the reviewers' exact hashed scope; only evidence lookup moves.
	const result = validateLedger({...request, repo: live.repo}, 'calibration', primary, audit);
	if (result === 'INCOMPLETE') throw new Error('Calibration audit incomplete');
	const rules = request.lanes.calibration.filter((entry) => entry.path === 'CaseA.jsx').map((entry) => entry.rule);
	const expected = new Set([
		...rules.map((rule) => `CaseA.jsx:${rule.id}`),
		`CaseB.js:${rules[3].id}`,
		`CaseC.js:${rules[3].id}`,
		...[
			'architecture/features/orders/OrderController.js',
			'architecture/PriceService.js',
			'architecture/EntryA.js',
		].flatMap((file) => architectureCases[file].map((id) => `${file}:${id}`)),
	]);
	const actual = new Set(
		primary.entries.filter((entry) => entry.status === 'violation').map((entry) => `${entry.path}:${entry.ruleId}`),
	);
	const missing = [...expected].filter((key) => !actual.has(key));
	const falsePositives = [...actual].filter((key) => !expected.has(key));
	if (missing.length || falsePositives.length) throw new Error(JSON.stringify({missing, falsePositives}));
	const crossFile = 'architecture/features/orders/OrderController.js';
	for (const report of [primary, audit]) {
		for (const entry of report.entries.filter((item) => item.path === crossFile)) {
			if (!architectureDependencies.every((file) => entry.evidence.some((item) => item.path === file)))
				throw new Error(
					'Cross-feature calibration requires tracing the shared facade to its private implementation',
				);
		}
	}
	return {
		status: 'PASSED',
		fingerprint: request.fingerprint,
		obligations: primary.entries.length,
		detected: expected.size,
		compliantControls: [
			'CaseD.jsx',
			'architecture/features/orders/InvoiceController.js',
			'architecture/TotalService.js',
			'architecture/EntryB.js',
		],
	};
}

function calibrationInputs() {
	const files = [
		'skills/review-standards/references/evidence-ledger.md',
		...readdirSync(path.join(codex, 'agents'))
			.filter((file) =>
				/^(architecture-reviewer|contracts-reviewer|ui-reviewer|verification-reviewer|privacy-security-reviewer|checkpoint-advisor)\.toml$/.test(
					file,
				),
			)
			.map((file) => `agents/${file}`),
		...['react-event-check.mjs', 'review-ledger.mjs', 'reviewer-calibration.mjs', 'rule-inventory.mjs'].map(
			(file) => `skills/review-standards/scripts/${file}`,
		),
	];
	return Object.fromEntries(files.sort().map((file) => [file, digest(readFileSync(path.join(codex, file)))]));
}

export function verifyReadiness(record) {
	if (JSON.stringify(record.request.inputs) !== JSON.stringify(record.inputs))
		throw new Error('Calibration record inputs differ from reviewed request');
	if (JSON.stringify(calibrationInputs()) !== JSON.stringify(record.inputs))
		throw new Error('Calibration inputs changed; rerun independent fixture review and seal');
	return validateCalibration(record.request, record.primary, record.audit, true);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const [mode, requestFile, primaryFile, auditFile] = process.argv.slice(2);
		if (mode === 'prepare' && requestFile && !primaryFile) {
			const request = calibrationRequest();
			writeFileSync(requestFile, `${JSON.stringify(request, null, 2)}\n`, {flag: 'wx'});
			console.log(JSON.stringify({request: requestFile, fingerprint: request.fingerprint}));
		} else if ((mode === 'validate' || mode === 'seal') && requestFile && primaryFile && auditFile) {
			if (mode === 'seal') {
				const record = {
					request: JSON.parse(read(requestFile)),
					primary: JSON.parse(read(primaryFile)),
					audit: JSON.parse(read(auditFile)),
					inputs: calibrationInputs(),
				};
				const result = verifyReadiness(record);
				writeFileSync(path.join(skill, 'calibration-record.json'), `${JSON.stringify(record, null, 2)}\n`, {
					flag: 'wx',
				});
				console.log(JSON.stringify(result));
			} else
				console.log(
					JSON.stringify(
						validateCalibration(
							JSON.parse(read(requestFile)),
							JSON.parse(read(primaryFile)),
							JSON.parse(read(auditFile)),
						),
					),
				);
		} else if (mode === 'readiness' && !requestFile) {
			console.log(JSON.stringify(verifyReadiness(JSON.parse(read(path.join(skill, 'calibration-record.json'))))));
		} else
			throw new Error(
				'Usage: reviewer-calibration.mjs prepare <request.json> | validate|seal <request.json> <primary.json> <audit.json> | readiness',
			);
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
