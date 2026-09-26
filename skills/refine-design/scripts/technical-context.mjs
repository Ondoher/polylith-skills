import path from 'node:path';
import fs from 'node:fs';
import {buildContext} from './product-context.mjs';
import {loadCurrentProduct} from './product-model.mjs';
import {
	ensureUnlinkedPath,
	fail,
	parseJsonFile,
	sha256,
	stableJson,
	writeImmutable,
} from './product-artifact-utils.mjs';
import {
	bindTechnicalContext,
	technicalBytes,
	technicalDigest,
	TECHNICAL_MAX_BYTES,
	validateEvidence,
	validateRepositoryBaseline,
	validateTechnicalContext,
	validateTechnicalPayload,
} from './technical-contract.mjs';
import {inspectPath, repositoryEvidenceCurrent} from './technical-repository.mjs';
import {paperResearchStatus, resolveWhitePaperReferences} from './white-paper-references.mjs';

export function readTechnicalObject(root, category, digest) {
	if (!/^[0-9a-f]{64}$/.test(digest)) fail('Invalid technical object digest');
	const file = path.join(root, 'technical', category, `${digest}.json`);
	ensureUnlinkedPath(file, root);
	const value = parseJsonFile(file, file, TECHNICAL_MAX_BYTES);
	if (category === 'evidence') {
		validateEvidence(value);
		if (technicalDigest(value) !== digest) fail('Evidence digest mismatch');
	} else {
		validateRepositoryBaseline(value);
		if (value.materialSha256 !== digest) fail('Baseline digest mismatch');
	}
	return value;
}

export function loadTechnicalEvidence(root, artifacts) {
	const evidence = new Map();
	const baselines = new Map();
	for (const artifact of artifacts.filter((item) => item.artifactKind === 'technical-design')) {
		validateTechnicalPayload(artifact.payload);
		for (const ref of artifact.payload.evidenceDependencies) {
			const item = readTechnicalObject(root, 'evidence', ref.materialSha256);
			if (item.id !== ref.id) fail('Evidence ID mismatch');
			if (evidence.has(item.id) && technicalDigest(evidence.get(item.id)) !== ref.materialSha256)
				fail('Conflicting evidence revisions in selected scope');
			evidence.set(item.id, item);
			if (item.kind === 'repository') {
				const baseline = readTechnicalObject(root, 'baselines', item.binding.baselineSha256);
				if (baseline.id !== item.binding.baselineId) fail('Baseline ID mismatch');
				baselines.set(baseline.id, baseline);
			}
		}
	}
	return {
		evidence: [...evidence.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
		repositoryBaselines: [...baselines.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
	};
}

export function evidenceCurrent(item, baselines, repositoryRoot) {
	if (item.kind === 'repository') {
		const baseline = baselines.find((value) => value.id === item.binding.baselineId);
		if (!baseline || !repositoryEvidenceCurrent(item, baseline, repositoryRoot)) return false;
	}
	return item.sourceFiles.every((source) => inspectPath(repositoryRoot, source.path).workingSha256 === source.sha256);
}

function invalidateEvidence(chain, repositoryRoot, selectedIds) {
	for (const item of chain.artifacts.filter(
		(value) =>
			selectedIds.has(value.artifact.id) &&
			value.artifact.artifactKind === 'technical-design' &&
			value.entry.dependencyState.status === 'current' &&
			value.artifact.status !== 'superseded',
	)) {
		const loaded = loadTechnicalEvidence(chain.root, [item.artifact]);
		const stale = loaded.evidence
			.filter((value) => !evidenceCurrent(value, loaded.repositoryBaselines, repositoryRoot))
			.map((value) => `evidence:${value.id}`);
		if (stale.length)
			item.entry.dependencyState = {
				status: item.artifact.status === 'locked' ? 'locked-conflict' : 'stale',
				reasons: stale,
			};
	}
	let changed = true;
	while (changed) {
		changed = false;
		for (const item of chain.artifacts) {
			if (item.entry.dependencyState.status !== 'current') continue;
			const stale = item.artifact.artifactDependencies.filter((ref) =>
				chain.artifacts.some(
					(target) => target.artifact.id === ref.id && target.entry.dependencyState.status !== 'current',
				),
			);
			if (stale.length) {
				item.entry.dependencyState = {
					status: item.artifact.status === 'locked' ? 'locked-conflict' : 'stale',
					reasons: stale.map((ref) => `artifact:${ref.id}`),
				};
				changed = true;
			}
		}
	}
}

/** Freeze a technical view of a verified snapshot, with live source freshness. */
export function resolveTechnicalContext({currentPath, scope = [], repositoryRoot}) {
	if (!repositoryRoot) fail('Technical resolution requires --repo for source freshness');
	const chain = loadCurrentProduct(currentPath);
	ensureUnlinkedPath(chain.root, repositoryRoot);
	if (!/^product[\\/][^\\/]+$/.test(path.relative(path.resolve(repositoryRoot), chain.root)))
		fail('Use the named repository product directory');
	const initial = buildContext(chain, scope, 'technical');
	invalidateEvidence(chain, repositoryRoot, new Set(initial.artifacts.map((item) => item.id)));
	const context = buildContext(chain, scope, 'technical');
	Object.assign(context, loadTechnicalEvidence(chain.root, context.artifacts));
	const papers = chain.model.sourceClaims.some((item) => item.disposition === 'reference')
		? resolveWhitePaperReferences({currentPath, repositoryRoot}).binding.references
		: [];
	if (papers.length)
		context.whitePapers = papers.map(({claimId, title, summary, path: paperPath, sha256: paperSha256}) => ({
			claimId,
			title,
			summary,
			path: paperPath,
			sha256: paperSha256,
			sourceSha256: chain.model.source.sha256,
			...paperResearchStatus(chain.root, paperPath, paperSha256),
		}));
	bindTechnicalContext(context);
	validateTechnicalContext(context);
	// Source facts must remain stable across context construction as well as capture.
	if (context.evidence.some((item) => !evidenceCurrent(item, context.repositoryBaselines, repositoryRoot)))
		fail('Evidence changed while resolving context');
	if (!fs.readFileSync(currentPath).equals(chain.currentBytes))
		fail('Current snapshot changed during technical resolution');
	const bytes = Buffer.from(stableJson(context));
	if (bytes.length > TECHNICAL_MAX_BYTES) fail('Technical context exceeds persisted byte limit');
	const storedPath = `contexts/technical/${context.materialSha256}/context.json`;
	const created = writeImmutable(path.join(chain.root, storedPath), bytes, chain.root);
	return {
		schemaVersion: '2.0',
		consumer: 'technical',
		path: storedPath,
		sha256: sha256(bytes),
		materialSha256: context.materialSha256,
		created,
		context,
	};
}
