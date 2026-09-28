import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
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

/** Reused synthetic current-contract technical evidence; no live specialist assessment. */
export function createTechnicalFixture(t, assignedRoot) {
	const root = assignedRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), 'technical-positive-'));
	if (!assignedRoot)
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
	return {
		root,
		productRoot,
		currentPath,
		inspected,
		chain,
		proposal,
		evidence,
		inputPath,
		architectureDiagram,
		contractDiagram,
		report,
		receipt,
	};
}
