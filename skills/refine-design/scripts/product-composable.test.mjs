import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {loadCurrentProduct, persistProductModel} from './product-model.mjs';
import {resolveProductContext} from './product-context.mjs';
import {
	createOutlineSourceIndex,
	renderOutlineMarkdown,
	validateOutline,
} from '../../generate-prd/scripts/prd-outline.mjs';
import {createPublicationArtifactProposal} from './product-publication-proposals.mjs';
import {commitProductArtifact} from './product-artifact-store.mjs';
import {gardenUx} from './ux-composable-fixture.mjs';
import {affectedUseCases, buildUseCaseHandoff} from './composable-handoff.mjs';
import {renderHtml} from '../../generate-prd/scripts/generate-prd.mjs';

const fixture = new URL('../references/fixtures/product-model/garden-log/', import.meta.url);

test('a fresh product exposes separately addressable goals, requirements, and rules', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-log-product-'));
	const result = persistProductModel({
		proposalPath: new URL('product-model-proposal.json', fixture),
		sourcePath: new URL('product-description.md', fixture),
		sourceLabel: 'briefs/garden-log/product-description.md',
		outputRoot: root,
	});
	const contextResult = resolveProductContext({
		currentPath: path.join(root, 'current.json'),
		repositoryRoot: root,
	});
	assert.equal(result.revision, 1);
	assert.equal(contextResult.context.schemaVersion, '2.0');
	assert.deepEqual(
		contextResult.context.goals.map((record) => record.id),
		['remember-harvests'],
	);
	assert.deepEqual(
		contextResult.context.requirements.map((record) => record.id),
		['record-dated-harvest', 'retain-harvest-entry'],
	);
	assert.deepEqual(
		contextResult.context.rules.map((record) => record.id),
		['reject-empty-entry'],
	);
	assert.deepEqual(contextResult.context.rules[0].appliesToRefs, ['record-dated-harvest']);
	assert.match(renderHtml(contextResult.context), /Requirements/);
	assert.match(renderHtml(contextResult.context), /reject-empty-entry/);
	const index = createOutlineSourceIndex(contextResult.context);
	const refs = index.sources.map((source) => source.ref);
	assert.ok(refs.includes('product:remember-harvests'));
	assert.ok(refs.includes('product:record-dated-harvest'));
	assert.ok(refs.includes('product:reject-empty-entry'));
	const outline = {
		schemaVersion: '1.0',
		contextId: index.context.id,
		sourceIndexSha256: index.sourceIndexSha256,
		notes: [],
		groups: [
			{
				id: 'garden-goals',
				title: 'Garden goals',
				summary: 'The source-bound product meaning.',
				sourceRefs: refs,
				children: [],
			},
		],
	};
	assert.equal(validateOutline(outline, index).sourceCount, refs.length);
	assert.match(renderOutlineMarkdown(outline, index), /record-dated-harvest/);
	const bound = loadCurrentProduct(path.join(root, 'current.json')).snapshot.productModel;
	const ux = gardenUx();
	ux.productModelBinding = Object.fromEntries(
		['id', 'revision', 'sha256', 'materialSha256', 'recordIndexSha256'].map((key) => [key, bound[key]]),
	);
	fs.writeFileSync(path.join(root, 'ux.json'), JSON.stringify(ux));
	const proposal = createPublicationArtifactProposal({
		currentPath: path.join(root, 'current.json'),
		sourceRoot: root,
		request: {
			id: 'garden-ux',
			artifactKind: 'ux-design',
			status: 'accepted',
			scopeRefs: ['harvest-log', 'record-dated-harvest', 'retain-harvest-entry'],
			coverageRefs: ['record-dated-harvest', 'retain-harvest-entry'],
			gapRefs: [],
			lockRefs: [],
			artifactDependencyIds: [],
			encoding: 'gzip-base64',
			sources: {ux: 'ux.json'},
			publication: null,
		},
	});
	assert.equal(proposal.proposal.artifactSchemaVersion, '0.4');
	const artifactProposalPath = path.join(root, 'ux-artifact-proposal.json');
	fs.writeFileSync(artifactProposalPath, JSON.stringify(proposal.proposal));
	commitProductArtifact({
		currentPath: path.join(root, 'current.json'),
		baseSnapshotSha256: proposal.baseSnapshotSha256,
		proposalPath: artifactProposalPath,
		resourceRoot: root,
	});
	const packaged = resolveProductContext({currentPath: path.join(root, 'current.json'), repositoryRoot: root});
	const completeIndex = createOutlineSourceIndex(packaged.context);
	assert.ok(
		completeIndex.sources.some((source) => source.kind === 'ux-design/steps' && source.value.id === 'save-step'),
	);
	const realization = completeIndex.sources.find(
		(source) => source.kind === 'ux-design/productRealizations' && source.value.id === 'goal-to-case',
	);
	assert.ok(realization);
	assert.ok(
		realization.relations.some(
			(link) => link.field === '/productRef' && link.targetRef === 'product:remember-harvests',
		),
	);
	assert.ok(
		realization.relations.some(
			(link) => link.field === '/uxRef' && link.targetRef?.includes('/flows/record-entry'),
		),
	);
	const handoff = buildUseCaseHandoff(loadCurrentProduct(path.join(root, 'current.json')).model, ux, 'record-entry');
	assert.deepEqual(handoff.stepRefs, ['save-step']);
	assert.ok(handoff.productRefs.includes('product:record-dated-harvest'));
	assert.ok(handoff.productRefs.includes('product:reject-empty-entry'));
	assert.deepEqual(handoff.traceGapRefs, ['validation-detail-gap']);
	assert.deepEqual(affectedUseCases(ux, 'product:remember-harvests'), ['record-entry']);
	assert.deepEqual(
		affectedUseCases(ux, 'product:reject-empty-entry', loadCurrentProduct(path.join(root, 'current.json')).model),
		['record-entry'],
	);
});

test('an unrelated multi-area product keeps goals and rules separate in its outline input', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workshop-reservations-'));
	const sourcePath = path.join(root, 'description.md');
	fs.writeFileSync(
		sourcePath,
		'Workshop Reservations lets staff reserve available tools, return borrowed tools, and see current availability; a tool cannot be reserved twice at the same time.\n',
	);
	const record = (id, data) => ({
		id,
		...data,
		status: 'accepted',
		owner: 'product',
		consumerDomains: ['prd', 'ux'],
		provenance: {sourceClaimRefs: ['brief']},
	});
	const proposal = {
		schemaVersion: '2.0',
		kind: 'product-model-proposal',
		id: 'workshop-reservations',
		name: 'Workshop Reservations',
		status: 'accepted',
		owner: 'product',
		consumerDomains: ['prd', 'ux'],
		base: null,
		provenance: {producer: 'refine-design', method: 'semantic-parse'},
		purpose: record('workshop-purpose', {summary: 'Coordinate shared workshop tools.'}),
		users: [record('staff-member', {name: 'Staff member', description: 'A person using shared tools.'})],
		capabilities: [
			record('reservations', {
				name: 'Reservations',
				summary: 'Reserve an available tool.',
				userRefs: ['staff-member'],
				relatedCapabilityRefs: [],
			}),
			record('returns', {
				name: 'Returns',
				summary: 'Return a borrowed tool.',
				userRefs: ['staff-member'],
				relatedCapabilityRefs: [],
			}),
		],
		goals: [
			record('obtain-tool', {
				statement: 'Obtain a tool for work.',
				desiredOutcome: 'An available tool is reserved.',
				capabilityRefs: ['reservations'],
				userRefs: ['staff-member'],
			}),
			record('release-tool', {
				statement: 'Release a borrowed tool.',
				desiredOutcome: 'The tool becomes available.',
				capabilityRefs: ['returns'],
				userRefs: ['staff-member'],
			}),
		],
		requirements: [
			record('show-availability', {
				kind: 'behavior',
				statement: 'Show the current availability of tools.',
				capabilityRefs: ['reservations'],
				goalRefs: ['obtain-tool'],
			}),
			record('reserve-available', {
				kind: 'behavior',
				statement: 'Reserve a tool that is available.',
				capabilityRefs: ['reservations'],
				goalRefs: ['obtain-tool'],
			}),
			record('return-borrowed', {
				kind: 'behavior',
				statement: 'Return a borrowed tool and make it available.',
				capabilityRefs: ['returns'],
				goalRefs: ['release-tool'],
			}),
		],
		rules: [
			record('exclusive-reservation', {
				kind: 'policy',
				statement: 'One tool cannot have overlapping active reservations.',
				appliesToRefs: ['reserve-available'],
			}),
		],
		gaps: [],
		sourceClaims: [
			{
				id: 'brief',
				startLine: 1,
				endLine: 1,
				summary: 'Staff reserve and return available tools without overlapping reservations.',
				disposition: 'incorporated',
				recordRefs: [
					'workshop-purpose',
					'staff-member',
					'reservations',
					'returns',
					'obtain-tool',
					'release-tool',
					'show-availability',
					'reserve-available',
					'return-borrowed',
					'exclusive-reservation',
				],
			},
		],
		identityClaims: [
			'workshop-purpose',
			'staff-member',
			'reservations',
			'returns',
			'obtain-tool',
			'release-tool',
			'show-availability',
			'reserve-available',
			'return-borrowed',
			'exclusive-reservation',
		].map((recordRef) => ({recordRef, kind: 'new', previousRef: null, supersedesRefs: []})),
		sourceClaimLineage: [],
	};
	const proposalPath = path.join(root, 'proposal.json');
	fs.writeFileSync(proposalPath, JSON.stringify(proposal));
	const productRoot = path.join(root, 'product');
	persistProductModel({proposalPath, sourcePath, sourceLabel: 'description.md', outputRoot: productRoot});
	const context = resolveProductContext({
		currentPath: path.join(productRoot, 'current.json'),
		repositoryRoot: productRoot,
	}).context;
	const index = createOutlineSourceIndex(context);
	assert.equal(context.schemaVersion, '2.0');
	assert.equal(context.goals.length, 2);
	assert.equal(context.requirements.length, 3);
	assert.ok(index.sources.some((source) => source.ref === 'product:exclusive-reservation'));
	assert.ok(index.sources.some((source) => source.ref === 'product:return-borrowed'));
});
