#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, realpathSync, existsSync, mkdirSync, mkdtempSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseManifest, parseOverlay, standardsForPath} from '../../normalize-standards/scripts/standards-config.mjs';
import {parseRules} from './rule-inventory.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
export const digest = (value) =>
	createHash('sha256')
		.update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value))
		.digest('hex');
const read = (file) => readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));
const run = (command, args, cwd) =>
	execFileSync(command, args, {
		cwd,
		encoding: 'utf8',
		maxBuffer: 32 * 1024 * 1024,
		env: {...process.env, NPM_CONFIG_OFFLINE: 'false'},
	});
const git = (repo, args) => run('git', args, repo);
export const artifactDirectory = '.codex-tmp/review-standards';
const required = (condition, message) => {
	if (!condition) throw new Error(message);
};
const relative = (value) =>
	typeof value === 'string' &&
	value.length > 0 &&
	!path.isAbsolute(value) &&
	!value.includes('\\') &&
	!value.split('/').some((part) => !part || part === '.' || part === '..');

export function reviewArtifactRoot(repo) {
	const resolvedRepo = realpathSync(repo);
	try {
		git(resolvedRepo, ['check-ignore', '--quiet', '--no-index', '--', `${artifactDirectory}/artifact.json`]);
	} catch {
		throw new Error('Review artifact root is not Git-ignored; add /.codex-tmp/ to the repository .gitignore');
	}
	return path.join(resolvedRepo, artifactDirectory);
}

export function setupReviewArtifactRoot(repo) {
	const resolvedRepo = realpathSync(repo);
	try {
		const root = reviewArtifactRoot(resolvedRepo);
		mkdirSync(root, {recursive: true});
		return root;
	} catch (error) {
		if (!/not Git-ignored/.test(error.message)) throw error;
	}
	const ignoreFile = path.join(resolvedRepo, '.gitignore');
	const existing = existsSync(ignoreFile) ? read(ignoreFile) : '';
	const separator = existing && !existing.endsWith('\n') ? '\n' : '';
	writeFileSync(ignoreFile, `${existing}${separator}/.codex-tmp/\n`);
	const root = reviewArtifactRoot(resolvedRepo);
	mkdirSync(root, {recursive: true});
	return root;
}

export function reviewArtifactPath(repo, file) {
	const root = reviewArtifactRoot(repo);
	const candidate = path.resolve(file);
	const relation = path.relative(root, candidate);
	required(relation && !relation.startsWith('..') && !path.isAbsolute(relation), `Review artifact must be beneath ${root}`);
	return candidate;
}

export function validateRequestIntegrity(request, rebuilt) {
	const {fingerprint, ...payload} = request;
	required(digest(payload) === fingerprint, 'Modified request payload');
	required(rebuilt.fingerprint === fingerprint, 'Stale review unit; prepare and review again');
	return rebuilt;
}

const owners = {
	'documentation.md': ['architecture-reviewer'],
	'project-foundation.md': ['architecture-reviewer'],
	'architecture.md': ['architecture-reviewer'],
	'polylith.md': ['architecture-reviewer'],
	'remvc.md': ['architecture-reviewer'],
	'app-shells.md': ['architecture-reviewer'],
	'local-https.md': ['privacy-security-reviewer'],
	'code-conventions.md': ['contracts-reviewer'],
	'types.md': ['contracts-reviewer'],
	'jsdoc.md': ['contracts-reviewer'],
	'react.md': ['ui-reviewer'],
	'mui.md': ['ui-reviewer'],
	'base-components.md': ['ui-reviewer'],
	'accessibility.md': ['ui-reviewer'],
	'localization.md': ['ui-reviewer'],
	'testing.md': ['verification-reviewer'],
	'server.md': ['architecture-reviewer', 'privacy-security-reviewer'],
	'data-persistence.md': ['privacy-security-reviewer'],
	'socket-io.md': ['architecture-reviewer', 'privacy-security-reviewer'],
};

export function safeFile(root, file) {
	required(relative(file), `Invalid relative path: ${file}`);
	const candidate = path.resolve(root, file);
	const resolved = realpathSync(candidate);
	required(
		!path.relative(root, resolved).startsWith('..') && !path.isAbsolute(path.relative(root, resolved)),
		`Path escapes root: ${file}`,
	);
	return resolved;
}

export function snapshot(repo) {
	const files = [
		...new Set(
			git(repo, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean),
		),
	].sort();
	const hashes = {};
	for (const file of files) {
		required(relative(file), `Invalid Git path: ${file}`);
		hashes[file] = existsSync(path.join(repo, file)) ? digest(readFileSync(safeFile(repo, file))) : null;
	}
	return {
		repo: realpathSync(repo),
		head: git(repo, ['rev-parse', 'HEAD']).trim(),
		status: git(repo, ['status', '--porcelain=v1', '-z']),
		diff: digest(git(repo, ['diff', '--binary', 'HEAD'])),
		files: hashes,
	};
}

export function infrastructure(codex) {
	for (const name of [...new Set(Object.values(owners).flat()), 'checkpoint-advisor']) {
		const definition = read(path.join(codex, 'agents', `${name}.toml`));
		const effort = ['architecture-reviewer', 'privacy-security-reviewer', 'ui-reviewer'].includes(name)
			? 'medium'
			: 'low';
		required(/^model\s*=\s*"gpt-5\.6-terra"\s*$/m.test(definition), `${name}: invalid model pin`);
		required(
			new RegExp(`^model_reasoning_effort\\s*=\\s*"${effort}"\\s*$`, 'm').test(definition),
			`${name}: expected ${effort} reasoning`,
		);
		required(/^sandbox_mode\s*=\s*"read-only"\s*$/m.test(definition), `${name}: must be read-only`);
	}
}

function refreshStandardsGuide(repo, codex) {
	run(
		process.execPath,
		[
			path.join(codex, 'skills/write-standards-guide/scripts/standards-guide.mjs'),
			'write',
			'--repo',
			repo,
			'--codex-root',
			codex,
		],
		repo,
	);
}

export function preflight(repo, codex) {
	infrastructure(codex);
	reviewArtifactRoot(repo);
	for (const [script, args] of [
		['skills/review-standards/scripts/reviewer-calibration.mjs', ['readiness']],
		['skills/normalize-standards/scripts/standards-attestation.mjs', ['validate', '--repo', repo]],
		['skills/review-standards/scripts/folder-standards.mjs', ['--repo', repo]],
	])
		run(process.execPath, [path.join(codex, script), ...args], repo);
	refreshStandardsGuide(repo, codex);
}

const commandFailure = (error) =>
	String(error.stderr || error.stdout || error.message)
		.trim()
		.slice(0, 4000);

export function formattingStatus(repo, codex) {
	try {
		run(
			process.execPath,
			[path.join(codex, 'skills/review-standards/scripts/format-preflight.mjs'), '--repo', repo],
			repo,
		);
	} catch (error) {
		return {status: 'NOT_READY', stage: 'setup', error: commandFailure(error)};
	}
	try {
		if (process.platform === 'win32') run('cmd.exe', ['/d', '/s', '/c', 'npm run format:check'], repo);
		else run('npm', ['run', 'format:check'], repo);
	} catch (error) {
		return {status: 'NOT_READY', stage: 'check', error: commandFailure(error)};
	}
	return {status: 'READY'};
}

export function aggregateReviewStatus(lanes, syntax, formatting) {
	if (syntax === 'INCOMPLETE' || Object.values(lanes).includes('INCOMPLETE')) return 'INCOMPLETE';
	if (syntax !== 'CLEAN' || Object.values(lanes).includes('FINDINGS_PRESENT')) return 'FINDINGS_PRESENT';
	return formatting.status === 'READY' ? 'CLEAN' : 'INCOMPLETE';
}

export function effectiveRules(rules, overlay, file, standard) {
	const matching = overlay.filter(
		(entry) => entry.standard === standard && (entry.kind === 'repository' || file.startsWith(entry.folder)),
	);
	const replacements = new Map();
	for (const entry of matching.filter((item) => item.operation === 'REPLACE')) {
		const previous = replacements.get(entry.target);
		if (!previous || entry.folder.length > previous.folder.length) replacements.set(entry.target, entry);
	}
	const local = [...matching.filter((entry) => entry.operation === 'ADD'), ...replacements.values()];
	for (const entry of local)
		required(
			rules.some((rule) => rule.section.includes(entry.target.slice(standard.length + 1))),
			`Unknown overlay section: ${entry.target}`,
		);
	const retained = rules.filter(
		(rule) => ![...replacements.keys()].some((target) => rule.section.includes(target.slice(standard.length + 1))),
	);
	return [
		...retained,
		...local.map((entry) => ({
			id: `LOCAL-${digest([entry.operation, entry.scope, entry.target, entry.title]).slice(0, 16)}`,
			standard,
			section: [entry.target],
			text: entry.rule,
			overlay: entry,
		})),
	];
}

export function buildRequest(repo, codex, baseline, explicitPaths = []) {
	const current = snapshot(repo);
	required(
		baseline.repo === current.repo && baseline.head === current.head,
		'Baseline repository or HEAD changed; recapture explicitly',
	);
	const paths = [
		...new Set(
			[...Object.keys(baseline.files), ...Object.keys(current.files)]
				.filter((file) => file !== 'STANDARDS.md' && baseline.files[file] !== current.files[file])
				.concat(explicitPaths),
		),
	].sort();
	required(paths.length > 0, 'Empty review unit');
	const manifestPath = 'agents/topics/standards/manifest.md';
	const manifest = parseManifest(read(path.join(repo, manifestPath)), manifestPath);
	const overlay = parseOverlay(read(path.join(repo, 'agents/topics/standards/overlay.md')), manifest.selected);
	const standards = new Map();
	for (const [name, item] of manifest.selected) {
		required(owners[name], `Standard has no reviewer owner: ${name}`);
		const target = realpathSync(path.resolve(repo, 'agents/topics/standards', item.href));
		required(
			target === realpathSync(path.join(codex, 'documentation/standards', name)),
			`Canonical link mismatch: ${name}`,
		);
		standards.set(name, parseRules(read(target), name));
	}
	const lanes = {};
	const mappings = [];
	for (const file of paths) {
		required(
			relative(file) && (file in current.files || file in baseline.files),
			`Path not present in baseline or worktree: ${file}`,
		);
		const mapping = standardsForPath(manifest, file);
		mappings.push({path: file, set: mapping.assignment.set, standards: mapping.standards.map((item) => item.name)});
		for (const {name} of mapping.standards) {
			for (const lane of owners[name]) {
				lanes[lane] ??= [];
				for (const rule of effectiveRules(standards.get(name), overlay, file, name))
					lanes[lane].push({path: file, rule});
			}
		}
	}
	// Hash all tracked/visible repository documentation and applicable ancestor instructions.
	// This deliberately errs toward invalidation when related work context changes.
	const repoInputs = Object.keys(current.files).filter(
		(file) =>
			current.files[file] && (file.endsWith('AGENTS.md') || (file.startsWith('agents/') && file.endsWith('.md'))),
	);
	const context = {};
	for (const lane of Object.keys(lanes).sort()) {
		const codexInputs = [
			'AGENTS.md',
			`agents/${lane}.toml`,
			'skills/review-standards/SKILL.md',
			'skills/review-standards/references/evidence-ledger.md',
			'skills/review-standards/scripts/review-ledger.mjs',
			'skills/review-standards/scripts/rule-inventory.mjs',
			'skills/review-standards/scripts/react-event-check.mjs',
			...new Set(lanes[lane].map(({rule}) => `documentation/standards/${rule.standard}`)),
		];
		context[lane] = JSON.parse(
			run(
				process.execPath,
				[
					path.join(codex, 'skills/review-standards/scripts/review-context-fingerprint.mjs'),
					'--repo',
					repo,
					'--codex-root',
					codex,
					'--lane',
					lane,
					...repoInputs.flatMap((file) => ['--repo-input', file]),
					...codexInputs.flatMap((file) => ['--codex-input', file]),
				],
				repo,
			),
		);
		required(context[lane].ok, `Cannot fingerprint ${lane}`);
	}
	const payload = {
		version: 1,
		repo: current.repo,
		codex: realpathSync(codex),
		baseline,
		current,
		explicitPaths,
		mappings,
		lanes,
		context,
	};
	return {...payload, fingerprint: digest(payload)};
}

function validateEvidence(request, obligation, evidence) {
	required(
		Array.isArray(evidence) && evidence.length > 0,
		`Missing evidence: ${obligation.path} ${obligation.rule.id}`,
	);
	required(
		evidence.some((item) => item.path === obligation.path),
		'Evidence must address the reviewed file',
	);
	for (const item of evidence) {
		required(
			item.path in request.current.files || item.path in request.baseline.files,
			`Evidence path outside captured repository: ${item.path}`,
		);
		if (request.current.files[item.path] == null) {
			required(
				relative(item.path) &&
					!existsSync(path.join(request.repo, item.path)) &&
					item.deleted === true &&
					request.baseline.files[item.path],
				'Deleted evidence requires an absent captured prior file',
			);
			continue;
		}
		const content = read(safeFile(request.repo, item.path));
		required(digest(Buffer.from(content)) === request.current.files[item.path], `Stale evidence: ${item.path}`);
		const lines = content.split(/\r?\n/);
		required(
			Number.isInteger(item.line) && item.line >= 1 && item.line <= lines.length,
			`Invalid evidence line: ${item.path}`,
		);
		required(
			typeof item.quote === 'string' && item.quote.trim().length > 0 && lines[item.line - 1].includes(item.quote),
			`Evidence quote does not match: ${item.path}:${item.line}`,
		);
	}
}

export function validateLedger(request, lane, primary, audit) {
	const obligations = request.lanes[lane];
	required(obligations, `Unknown lane: ${lane}`);
	const key = (entry) => `${entry.path}\0${entry.ruleId}`;
	const expected = new Map(obligations.map((entry) => [`${entry.path}\0${entry.rule.id}`, entry]));
	required(expected.size === obligations.length, 'Duplicate generated obligation');
	const statuses = ['compliant', 'violation', 'not-applicable', 'unable-to-determine'];
	for (const [kind, report] of [
		['primary', primary],
		['audit', audit],
	]) {
		required(
			report && report.fingerprint === request.fingerprint && report.lane === lane && report.kind === kind,
			`Missing or stale ${kind}: ${lane}`,
		);
		required(typeof report.actor === 'string' && report.actor.trim(), `Missing ${kind} actor`);
		required(
			Array.isArray(report.entries) && report.entries.length === expected.size,
			`${kind}: missing or extra rule rows`,
		);
		const seen = new Set();
		for (const entry of report.entries) {
			const identity = key(entry);
			required(
				expected.has(identity) && !seen.has(identity),
				`${kind}: unknown or duplicate rule ${entry.ruleId}`,
			);
			seen.add(identity);
			required(
				typeof entry.reason === 'string' && entry.reason.trim().length >= 20,
				`${kind}: missing substantive reasoning for ${entry.ruleId}`,
			);
			validateEvidence(request, expected.get(identity), entry.evidence);
			required(
				(kind === 'primary' ? statuses : ['agree', 'disagree', 'unable-to-determine']).includes(entry.status),
				`Invalid ${kind} status`,
			);
			if (entry.status === 'violation') {
				for (const field of ['consequence', 'remedy'])
					required(typeof entry[field] === 'string' && entry[field].trim(), `Violation missing ${field}`);
				required(['blocking', 'important', 'advisory'].includes(entry.severity), 'Invalid finding severity');
			}
		}
	}
	required(primary.actor !== audit.actor, 'Audit must use a different agent instance');
	required(audit.primaryDigest === digest(primary), 'Audit does not address this primary report');
	if (
		primary.entries.some((entry) => entry.status === 'unable-to-determine') ||
		audit.entries.some((entry) => entry.status !== 'agree')
	)
		return 'INCOMPLETE';
	return primary.entries.some((entry) => entry.status === 'violation') ? 'FINDINGS_PRESENT' : 'CLEAN';
}

function argumentsFor(argv) {
	const result = {paths: []};
	for (let index = 0; index < argv.length; index += 2) {
		const flag = argv[index];
		required(flag.startsWith('--') && argv[index + 1], `Missing option value: ${flag}`);
		if (flag === '--path') result.paths.push(argv[index + 1]);
		else {
			required(
				['--repo', '--codex-root', '--out', '--baseline', '--request', '--reports'].includes(flag),
				`Unknown option: ${flag}`,
			);
			result[flag.slice(2)] = argv[index + 1];
		}
	}
	return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const mode = process.argv[2];
		const args = argumentsFor(process.argv.slice(3));
		let result;
		if (mode === 'capture') {
			required(args.repo && args.out, 'capture requires --repo and --out');
			const repo = realpathSync(args.repo);
			reviewArtifactPath(repo, args.out);
			result = snapshot(repo);
		} else if (mode === 'prepare') {
			required(
				args.repo && args['codex-root'] && args.baseline && args.out,
				'prepare requires --repo --codex-root --baseline --out',
			);
			const repo = realpathSync(args.repo);
			reviewArtifactPath(repo, args.baseline);
			reviewArtifactPath(repo, args.out);
			preflight(repo, realpathSync(args['codex-root']));
			const formatting = formattingStatus(repo, realpathSync(args['codex-root']));
			if (formatting.status !== 'READY')
				process.stderr.write(`${JSON.stringify({warning: 'FORMATTING_NOT_READY', formatting})}\n`);
			result = buildRequest(
				repo,
				realpathSync(args['codex-root']),
				json(args.baseline),
				args.paths,
			);
		} else if (mode === 'validate') {
			required(args.request && args.reports, 'validate requires --request and --reports');
			const supplied = json(args.request);
			reviewArtifactPath(supplied.repo, args.request);
			reviewArtifactPath(supplied.repo, args.reports);
			if (args.out) reviewArtifactPath(supplied.repo, args.out);
			preflight(supplied.repo, supplied.codex);
			const formatting = formattingStatus(supplied.repo, supplied.codex);
			const request = validateRequestIntegrity(
				supplied,
				buildRequest(supplied.repo, supplied.codex, supplied.baseline, supplied.explicitPaths),
			);
			const reports = json(args.reports);
			const names = Object.keys(request.lanes);
			required(
				Array.isArray(reports) && reports.length === names.length * 2,
				'Missing or extra reviewer/auditor reports',
			);
			const lanes = {};
			for (const lane of names) {
				const primary = reports.filter((report) => report.lane === lane && report.kind === 'primary');
				const audit = reports.filter((report) => report.lane === lane && report.kind === 'audit');
				required(primary.length === 1 && audit.length === 1, `Missing or duplicate ${lane} reports`);
				lanes[lane] = validateLedger(request, lane, primary[0], audit[0]);
			}
			const reactPaths = request.mappings
				.filter(
					(mapping) =>
						mapping.standards.includes('react.md') &&
						/\.[cm]?[jt]sx?$/.test(mapping.path) &&
						request.current.files[mapping.path],
				)
				.map((mapping) => mapping.path);
			let syntax = 'CLEAN';
			if (reactPaths.length) {
				try {
					run(
						process.execPath,
						[
							path.join(directory, 'react-event-check.mjs'),
							'--repo',
							request.repo,
							...reactPaths.flatMap((file) => ['--path', file]),
						],
						request.repo,
					);
				} catch (error) {
					const output = String(error.stdout || error.message);
					try {
						syntax = JSON.parse(output).status === 'violations' ? 'FINDINGS_PRESENT' : 'INCOMPLETE';
					} catch {
						syntax = 'INCOMPLETE';
					}
					process.stderr.write(output);
				}
			}
			const status = aggregateReviewStatus(lanes, syntax, formatting);
			result = {status, fingerprint: request.fingerprint, lanes, syntax, formatting};
			if (status !== 'CLEAN') process.exitCode = 1;
		} else if (mode === 'artifact-root') {
			required(args.repo, 'artifact-root requires --repo');
			result = {root: reviewArtifactRoot(args.repo)};
		} else if (mode === 'setup-artifact-root') {
			required(args.repo, 'setup-artifact-root requires --repo');
			result = {root: setupReviewArtifactRoot(args.repo)};
		} else if (mode === 'create-session') {
			required(args.repo, 'create-session requires --repo');
			const repo = realpathSync(args.repo);
			refreshStandardsGuide(repo, path.resolve(directory, '../../..'));
			const root = setupReviewArtifactRoot(repo);
			result = {root: mkdtempSync(path.join(root, 'session-'))};
		} else
			throw new Error(
				'Modes: artifact-root, setup-artifact-root, create-session, capture, prepare, validate',
			);
		if (args.out) writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`, {flag: 'wx'});
		process.stdout.write(
			`${JSON.stringify(args.out ? {ok: true, out: args.out, fingerprint: result.fingerprint} : result, null, 2)}\n`,
		);
	} catch (error) {
		process.stderr.write(`${JSON.stringify({status: 'INCOMPLETE', error: error.message})}\n`);
		process.exitCode = 2;
	}
}
