import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import {persistProductModel, loadCurrentProduct} from './product-model.mjs';
import {resolveProductContext} from './product-context.mjs';
import {inspectTechnicalRepository, prepareTechnicalArtifact} from './technical-preparation.mjs';
import {technicalDigest, validateTechnicalContext} from './technical-contract.mjs';
import {sha256} from './product-artifact-utils.mjs';
import {generateTechnical} from '../../generate-technical/scripts/generate-technical.mjs';

const fixtures = new URL('../references/fixtures/product-model/field-journal/', import.meta.url);
const write = (root, relative, bytes) => {
	const file = path.join(root, relative);
	fs.mkdirSync(path.dirname(file), {recursive: true});
	fs.writeFileSync(file, bytes);
	return file;
};

test('prepares a dirty technical context and protects stale inputs and interrupted publication', (t) => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'technical-positive-'));
	t.after(() => {
		assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
		fs.rmSync(root, {recursive: true, force: true});
	});
	write(root, 'package.json', JSON.stringify({devDependencies: {prettier: '3.9.6'}, prettier: {printWidth: 120}}));
	write(root, 'node_modules/prettier/package.json', JSON.stringify({name: 'prettier', bin: './bin/prettier.cjs'}));
	write(
		root,
		'node_modules/prettier/bin/prettier.cjs',
		"const fs = require('node:fs'); if (!process.argv.includes('--stdin-filepath')) process.exit(2); process.stdout.write(fs.readFileSync(0, 'utf8').replace(/\\n+$/, '\\n'));\n",
	);
	execFileSync('git', ['init', root], {stdio: 'pipe'});
	write(root, 'src/observations.js', 'export const observations = [];\n');
	execFileSync('git', ['-C', root, 'add', 'src/observations.js']);
	write(root, 'src/observations.js', 'export const observations = []; // unsaved implementation\n');
	const productRoot = path.join(root, 'product/FieldJournal');
	persistProductModel({
		proposalPath: new URL('product-model-proposal.json', fixtures),
		sourcePath: new URL('product-description.md', fixtures),
		sourceLabel: 'briefs/field-journal.md',
		outputRoot: productRoot,
	});
	const currentPath = path.join(productRoot, 'current.json');
	const inspected = inspectTechnicalRepository({
		currentPath,
		repositoryRoot: root,
		repositoryId: 'field-journal-repository',
		paths: ['src/observations.js'],
	});
	assert.equal(inspected.baseline.head, null);
	assert.equal(inspected.baseline.changes.find((item) => item.path === 'src/observations.js').worktreeStatus, 'M');
	const report =
		'Synthetic system-architect fixture: one observation authority owns installation; disk durability remains an evidence question.\n';
	const receipt =
		'Synthetic parent receipt: select internal observation authority within accepted create-observations behavior.\n';
	write(root, 'evidence/assessment.md', report);
	write(root, 'evidence/receipt.md', receipt);
	const evidence = [
		{
			id: 'source-observation',
			kind: 'repository',
			summary: 'The fixture has an in-memory array only.',
			sourceFiles: [],
			binding: {
				baselineId: inspected.baseline.id,
				baselineSha256: inspected.baseline.materialSha256,
				paths: ['src/observations.js'],
				locator: 'observations export',
				observationSha256: technicalDigest(inspected.baseline.observations),
			},
		},
		{
			id: 'architecture-assessment',
			kind: 'assessment',
			summary: 'Synthetic advice selects observation authority and leaves disk guarantees open.',
			sourceFiles: [{path: 'evidence/assessment.md', sha256: sha256(report)}],
			binding: {
				role: 'system-architect',
				question: 'Who owns a newly created observation?',
				reportSha256: sha256(report),
				inputRefs: ['create-observations', 'source-observation'],
				disposition: 'accepted',
				rationale: 'Select ownership; retain the durability gap.',
			},
		},
		{
			id: 'parent-authority',
			kind: 'authority',
			summary: 'Synthetic reconciliation within accepted product intent.',
			sourceFiles: [{path: 'evidence/receipt.md', sha256: sha256(receipt)}],
			binding: {
				actor: 'parent',
				scopeRefs: ['create-observations'],
				instruction: receipt.trim(),
				receiptSha256: sha256(receipt),
			},
		},
	];
	const base = {
		owner: 'technical-documentation',
		scopeRefs: ['create-observations'],
		productRefs: ['create-observations'],
		artifactRefs: [],
		dependsOn: [],
		evidenceRefs: [],
	};
	const record = (id, kind, status, details, extra = {}) => ({
		...base,
		id,
		kind,
		status,
		title: id,
		summary: id,
		details,
		...extra,
	});
	const records = [
		record(
			'array-fact',
			'fact',
			'observed',
			{claim: 'The observation array is in memory.', limits: 'No disk durability is observed.'},
			{evidenceRefs: ['source-observation']},
		),
		record(
			'authority-choice',
			'decision',
			'accepted',
			{
				context: 'Creating an observation needs one state owner.',
				choice: 'The observation authority installs validated data.',
				alternatives: [
					{
						option: 'View-owned state',
						disposition: 'declined',
						reason: 'Navigation must not erase accepted observations.',
					},
				],
				consequences: ['The view requests creation.'],
				authority: {
					actor: 'parent',
					basis: 'Internal responsibility within accepted creation behavior.',
					evidenceRef: 'parent-authority',
				},
				supersedes: [],
			},
			{evidenceRefs: ['architecture-assessment', 'parent-authority']},
		),
		record(
			'observation-authority',
			'boundary',
			'accepted',
			{
				responsibility: 'Own validated observation state.',
				consumers: ['Creation form'],
				exchanges: ['Validated observation and result'],
				lifecycle: 'Application session.',
				failureBehavior: 'Reject invalid input without replacing prior data.',
				decisionRefs: ['authority-choice'],
			},
			{dependsOn: ['authority-choice']},
		),
		record('durability-question', 'gap', 'unresolved', {
			question: 'Which disk commit proves durable creation?',
			category: 'evidence',
			affectedRefs: ['create-flow'],
			resolutionCriteria: ['Verify the chosen storage commit and failure behavior.'],
			resolutionRefs: [],
		}),
		record(
			'create-flow',
			'flow',
			'conditional',
			{
				trigger: 'Save a new observation.',
				preconditions: ['Dated input is available.'],
				steps: [
					{
						ownerRef: 'observation-authority',
						action: 'Validate and install the observation.',
						result: 'Accepted observation or explicit failure.',
					},
				],
				success: ['One observation is installed.'],
				failure: ['Prior state survives invalid input.'],
				cancellation: 'Cancel before installation leaves state unchanged.',
				retry: 'A new request is validated again.',
				guarantees: ['One state owner.'],
				limits: ['Disk durability awaits evidence.'],
				verification: ['Create one valid observation and verify ownership and identity.'],
				decisionRefs: ['authority-choice'],
			},
			{dependsOn: ['authority-choice', 'observation-authority', 'durability-question']},
		),
		record(
			'creation-contract',
			'contract',
			'conditional',
			{
				ownerRef: 'observation-authority',
				participantRefs: [],
				flowRefs: ['create-flow'],
				input: ['A dated observation candidate.'],
				result: ['An accepted observation identity.'],
				invariants: ['One authority installs accepted state.'],
				failure: ['Prior state remains available.'],
				lifecycle: 'One creation attempt.',
				discussion: ['The contract identifies the state exchange without selecting a storage API.'],
			},
			{dependsOn: ['observation-authority', 'create-flow']},
		),
	];
	const fence = String.fromCharCode(96).repeat(3);
	const architectureDiagram = [
		fence + 'mermaid',
		'flowchart TD',
		'    Entry -->|validated| State',
		'',
		'    State --> Result',
		fence,
	].join('\n');
	const contractDiagram = [
		'~~~~mermaid',
		'sequenceDiagram',
		'    Client->>Owner: submit',
		'    Owner-->>Client: accepted',
		'~~~~',
	].join('\n');
	records.find((item) => item.id === 'observation-authority').details.discussion = [
		'Ownership before.\n\n' + architectureDiagram + '\n\nOwnership after.',
	];
	records.find((item) => item.id === 'creation-contract').details.discussion.push(contractDiagram);

	const chain = loadCurrentProduct(currentPath);
	const proposal = {
		schemaVersion: '1.0',
		kind: 'product-artifact-proposal',
		id: 'observation-technical',
		artifactKind: 'technical-design',
		owner: 'technical-documentation',
		artifactSchemaVersion: '1.0',
		status: 'accepted',
		consumerDomains: ['technical-documentation'],
		scopeRefs: ['create-observations'],
		coverageRefs: ['create-observations'],
		gapRefs: [],
		lockRefs: [],
		recordDependencies: [
			{
				id: 'create-observations',
				materialSha256: chain.model.recordIndex.find((item) => item.id === 'create-observations')
					.materialSha256,
			},
		],
		artifactDependencies: [],
		producer: {id: 'technical-preparation', contractVersion: '1.0', method: 'assessment'},
		resources: [],
		payload: {
			schemaVersion: '1.0',
			evidenceDependencies: evidence
				.map((item) => ({id: item.id, materialSha256: technicalDigest(item)}))
				.sort((a, b) => a.id.localeCompare(b.id)),
			records,
		},
	};
	const inputPath = write(
		root,
		'technical-input.json',
		JSON.stringify({proposal, evidence, repositoryBaselines: [inspected.baseline]}),
	);
	const committed = prepareTechnicalArtifact({
		currentPath,
		repositoryRoot: root,
		baseSnapshotSha256: chain.current.snapshot.sha256,
		inputPath,
	});
	assert.equal(committed.artifact.revision, 1);
	const committedCurrent = fs.readFileSync(currentPath);
	assert.throws(
		() =>
			prepareTechnicalArtifact({
				currentPath,
				repositoryRoot: root,
				baseSnapshotSha256: chain.current.snapshot.sha256,
				inputPath,
			}),
		/base snapshot is no longer current/,
	);
	assert.deepEqual(fs.readFileSync(currentPath), committedCurrent);
	const invalidProposal = structuredClone(proposal);
	const invalidChoice = invalidProposal.payload.records.find((item) => item.id === 'authority-choice');
	invalidChoice.details.authority.evidenceRef = 'source-observation';
	invalidChoice.evidenceRefs.push('source-observation');
	const invalidInputPath = write(
		root,
		'invalid-technical-input.json',
		JSON.stringify({proposal: invalidProposal, evidence, repositoryBaselines: [inspected.baseline]}),
	);
	assert.throws(
		() =>
			prepareTechnicalArtifact({
				currentPath,
				repositoryRoot: root,
				baseSnapshotSha256: committed.snapshot.sha256,
				inputPath: invalidInputPath,
			}),
		/Decision authority does not cover its scope/,
	);
	assert.deepEqual(fs.readFileSync(currentPath), committedCurrent);
	const first = resolveProductContext({currentPath, consumer: 'technical', repositoryRoot: root});
	assert.equal(
		first.context.artifacts[0].payload.records.find((item) => item.id === 'create-flow').status,
		'conditional',
	);
	assert.equal(first.context.evidence.length, 3);
	assert.equal(first.context.sourceSnapshot.revision, 2);
	const bytes = fs.readFileSync(path.join(productRoot, first.path));
	const published = path.join(root, 'documents/FieldJournal/technical');
	const receipt1 = generateTechnical({contextPath: path.join(productRoot, first.path), outputDirectory: published});
	assert.deepEqual(
		receipt1.files.map((item) => item.path),
		['architecture.md', 'contracts.md', 'critical-flows.md', 'decisions.md', 'handoff.md', 'index.md'],
	);
	const flowPage = fs.readFileSync(path.join(published, 'critical-flows.md'), 'utf8');
	assert.equal(flowPage.endsWith('\n\n'), false);
	assert.equal(receipt1.files.find((item) => item.path === 'critical-flows.md').sha256, sha256(flowPage));
	assert.match(flowPage, /<a id="create-flow"><\/a>\n\n## create-flow/);
	assert.match(flowPage, /```mermaid\nsequenceDiagram\n/);
	assert.match(flowPage, /\| Step \| Owner \| Action \| Result \|/);
	assert.match(flowPage, /observation-authority.*Validate and install the observation/s);
	assert.match(flowPage, /### Outcome and recovery/);
	assert.ok(flowPage.includes(first.context.capabilities.find((item) => item.id === 'create-observations').summary));
	assert.equal(flowPage.includes('evidence/assessment.md'), false);
	assert.match(fs.readFileSync(path.join(published, 'index.md'), 'utf8'), /Create observations/);
	const architecturePage = fs.readFileSync(path.join(published, 'architecture.md'), 'utf8');
	assert.match(architecturePage, /## Current implementation/);
	assert.ok(architecturePage.includes(architectureDiagram));
	assert.ok(architecturePage.indexOf('Ownership before.') < architecturePage.indexOf(architectureDiagram));
	assert.ok(architecturePage.indexOf('Ownership after.') > architecturePage.indexOf(architectureDiagram));
	assert.ok(fs.readFileSync(path.join(published, 'contracts.md'), 'utf8').includes(contractDiagram));
	assert.ok(first.context.artifacts.some((item) => JSON.stringify(item).includes('validated')));

	assert.match(architecturePage, /## Boundary behavior/);
	assert.match(architecturePage, /```mermaid\nflowchart LR\n/);
	assert.match(fs.readFileSync(path.join(published, 'contracts.md'), 'utf8'), /## creation-contract/);
	assert.match(
		fs.readFileSync(path.join(published, 'handoff.md'), 'utf8'),
		/## Proofs and decisions before detailed contracts/,
	);
	for (const {path: page} of receipt1.files) {
		const markdown = fs.readFileSync(path.join(published, page), 'utf8');
		for (const [, target] of markdown.matchAll(/\]\(([^)]+)\)/g)) {
			const [label, fragment] = target.split('#');
			const relative = decodeURIComponent(label);
			assert.equal(
				relative.startsWith('..') || path.isAbsolute(relative),
				false,
				`${page}: external link ${target}`,
			);
			if (relative) assert.equal(fs.existsSync(path.resolve(published, relative)), true, `${page}: ${target}`);
			if (fragment && relative.endsWith('.md')) {
				const destination = fs.readFileSync(path.resolve(published, relative), 'utf8');
				assert.equal(
					destination.includes(`<a id="${fragment}"></a>`) || destination.includes(`## ${fragment}`),
					true,
					`${page}: ${target}`,
				);
			}
		}
	}
	const receipt2 = generateTechnical({contextPath: path.join(productRoot, first.path), outputDirectory: published});
	assert.deepEqual(receipt2, receipt1);
	const publishedBytes = new Map(
		[...receipt1.files.map((item) => item.path), 'publication-receipt.json'].map((file) => [
			file,
			fs.readFileSync(path.join(published, file)),
		]),
	);
	const assertPublishedUnchanged = () => {
		assert.deepEqual(fs.readdirSync(published).sort(), [...publishedBytes.keys()].sort());
		for (const [file, original] of publishedBytes)
			assert.deepEqual(fs.readFileSync(path.join(published, file)), original);
	};
	const invalidContextPath = write(
		root,
		'invalid-technical-context.json',
		JSON.stringify({...first.context, unexpected: true}),
	);
	assert.throws(
		() => generateTechnical({contextPath: invalidContextPath, outputDirectory: published}),
		/context must contain exactly/,
	);
	assertPublishedUnchanged();
	const humanFile = write(root, 'documents/FieldJournal/technical/author-notes.md', 'Human-authored notes.\n');
	assert.throws(
		() => generateTechnical({contextPath: path.join(productRoot, first.path), outputDirectory: published}),
		/unowned or missing files/,
	);
	assert.deepEqual(fs.readFileSync(humanFile, 'utf8'), 'Human-authored notes.\n');
	fs.rmSync(humanFile);
	const ownedPage = path.join(published, 'architecture.md');
	fs.appendFileSync(ownedPage, '\nHuman edit.\n');
	assert.throws(
		() => generateTechnical({contextPath: path.join(productRoot, first.path), outputDirectory: published}),
		/Owned output changed/,
	);
	fs.writeFileSync(ownedPage, publishedBytes.get('architecture.md'));
	assertPublishedUnchanged();
	const rename = fs.renameSync;
	try {
		fs.renameSync = (from, to) => {
			if (from.includes('.technical-stage-') && path.resolve(to) === path.resolve(published))
				throw new Error('simulated publication interruption');
			return rename(from, to);
		};
		assert.throws(
			() => generateTechnical({contextPath: path.join(productRoot, first.path), outputDirectory: published}),
			/simulated publication interruption/,
		);
	} finally {
		fs.renameSync = rename;
	}
	assertPublishedUnchanged();
	assert.deepEqual(
		fs
			.readdirSync(path.dirname(published))
			.filter((name) => name.includes('.technical-stage-') || name.includes('.technical-backup-')),
		[],
	);
	const backup = path.join(
		path.dirname(published),
		'.technical.technical-backup-11111111-1111-4111-8111-111111111111',
	);
	const stage = path.join(path.dirname(published), '.technical.technical-stage-11111111-1111-4111-8111-111111111111');
	fs.renameSync(published, backup);
	fs.cpSync(backup, stage, {recursive: true});
	assert.deepEqual(
		generateTechnical({contextPath: path.join(productRoot, first.path), outputDirectory: published}),
		receipt1,
	);
	assertPublishedUnchanged();
	assert.equal(fs.existsSync(backup) || fs.existsSync(stage), false);
	const malformed = path.join(path.dirname(published), '.technical.technical-stage-incomplete');
	fs.mkdirSync(malformed);
	assert.throws(
		() => generateTechnical({contextPath: path.join(productRoot, first.path), outputDirectory: published}),
		/Malformed reserved technical publication entry/,
	);
	assertPublishedUnchanged();
	fs.rmdirSync(malformed);
	fs.renameSync(published, backup);
	fs.appendFileSync(path.join(backup, 'architecture.md'), '\nInterrupted human edit.\n');
	assert.throws(
		() => generateTechnical({contextPath: path.join(productRoot, first.path), outputDirectory: published}),
		/Cannot recover.*Owned output changed/,
	);
	assert.equal(fs.existsSync(published), false);
	assert.equal(fs.existsSync(backup), true);
	fs.writeFileSync(path.join(backup, 'architecture.md'), publishedBytes.get('architecture.md'));
	assert.deepEqual(
		generateTechnical({contextPath: path.join(productRoot, first.path), outputDirectory: published}),
		receipt1,
	);
	assertPublishedUnchanged();
	assert.equal(fs.existsSync(backup), false);
	const firstTimeOutput = path.join(root, 'first-time-technical');
	const orphanStage = path.join(root, '.first-time-technical.technical-stage-22222222-2222-4222-8222-222222222222');
	fs.cpSync(published, orphanStage, {recursive: true});
	assert.throws(
		() => generateTechnical({contextPath: path.join(productRoot, first.path), outputDirectory: firstTimeOutput}),
		/without one valid backup/,
	);
	assert.equal(fs.existsSync(firstTimeOutput), false);
	assert.equal(fs.existsSync(orphanStage), true);
	fs.rmSync(orphanStage, {recursive: true});
	const detachedOutput = path.join(root, 'exported-technical');
	const detachedReceipt = generateTechnical({
		contextPath: path.join(productRoot, first.path),
		outputDirectory: detachedOutput,
	});
	assert.deepEqual(detachedReceipt, receipt1);
	for (const {path: page} of receipt1.files)
		assert.deepEqual(fs.readFileSync(path.join(detachedOutput, page)), fs.readFileSync(path.join(published, page)));
	const linkedParent = path.join(root, 'linked-documents');
	let linkAvailable = true;
	try {
		fs.symlinkSync(
			path.join(root, 'documents/FieldJournal'),
			linkedParent,
			process.platform === 'win32' ? 'junction' : 'dir',
		);
	} catch (error) {
		if (['EACCES', 'EINVAL', 'ENOTSUP', 'EPERM'].includes(error?.code)) linkAvailable = false;
		else throw error;
	}
	if (linkAvailable) {
		assert.throws(
			() =>
				generateTechnical({
					contextPath: path.join(productRoot, first.path),
					outputDirectory: path.join(linkedParent, 'technical'),
				}),
			/Output must not traverse a symbolic link or junction/,
		);
		assertPublishedUnchanged();
	}
	const command = JSON.parse(
		execFileSync(
			process.execPath,
			[
				new URL('./product-context.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
				'--current',
				currentPath,
				'--repo',
				root,
				'--consumer',
				'technical',
			],
			{encoding: 'utf8'},
		),
	);
	assert.equal(command.materialSha256, first.materialSha256);
	assert.equal(validateTechnicalContext(JSON.parse(bytes)).contextId, first.context.contextId);
	write(root, 'unrelated.txt', 'An unrelated dirty file.\n');
	const replay = resolveProductContext({currentPath, consumer: 'technical', repositoryRoot: root});
	assert.equal(replay.created, false);
	assert.deepEqual(fs.readFileSync(path.join(productRoot, replay.path)), bytes);
	const scoped = resolveProductContext({
		currentPath,
		consumer: 'technical',
		repositoryRoot: root,
		scope: ['review-glossary'],
	});
	assert.deepEqual(scoped.context.artifacts, []);
	assert.deepEqual(scoped.context.evidence, []);
	assert.deepEqual(scoped.context.repositoryBaselines, []);
	const prd = resolveProductContext({currentPath});
	assert.deepEqual(prd.context.artifacts, []);
	assert.equal(JSON.stringify(prd.context).includes('architecture-assessment'), false);
	write(root, 'src/observations.js', 'export const observations = ["changed after inspection"];\n');
	const staleSource = resolveProductContext({currentPath, consumer: 'technical', repositoryRoot: root});
	assert.deepEqual(staleSource.context.artifacts, []);
	assert.match(JSON.stringify(staleSource.context.exclusions), /source-observation/);
	write(root, 'src/observations.js', 'export const observations = []; // unsaved implementation\n');
	write(root, 'evidence/assessment.md', 'Changed assessment after preparation.\n');
	const staleAssessment = resolveProductContext({currentPath, consumer: 'technical', repositoryRoot: root});
	assert.deepEqual(staleAssessment.context.artifacts, []);
	assert.match(JSON.stringify(staleAssessment.context.exclusions), /architecture-assessment/);
	write(root, 'evidence/assessment.md', report);
	assert.equal(
		resolveProductContext({currentPath, consumer: 'technical', repositoryRoot: root}).materialSha256,
		first.materialSha256,
	);
	const detached = JSON.parse(bytes);
	fs.renameSync(productRoot, path.join(root, 'moved-product'));
	assert.equal(validateTechnicalContext(detached).contextId, first.context.contextId);
});
