import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyArtifactResourceFiles, publishArtifactResourceFiles} from './product-publication-package.mjs';

import {
  assertSha256,
  closed,
  ensureUnlinkedPath,
  fail,
  parseJsonFile,
  sha256,
  stableJson,
  withProductStoreLock,
  writeCurrentCompareAndSwap,
  writeImmutable,
} from './product-artifact-utils.mjs';
import {
  loadSnapshotArtifacts,
  reclassifySnapshotArtifacts,
  validateProductArtifact,
} from './product-artifact-contract.mjs';
import {
  loadCurrentProduct,
  validateCurrentPointer,
  validateProductSnapshot,
} from './product-model.mjs';

const MAX_ARTIFACT_PROPOSAL_BYTES = 4 * 1024 * 1024;

/**
 * @typedef {object} ArtifactLockAuthority
 * @property {string} artifactId - Stable ID of the protected artifact.
 * @property {string} owner - Current artifact owner granting the transition.
 * @property {'lock-artifact'|'modify-locked-artifact'} action - Exact protected action being authorized.
 */

/**
 * @typedef {object} CommitProductArtifactOptions
 * @property {string} currentPath - Path to the product store's current.json pointer.
 * @property {string} baseSnapshotSha256 - Exact current snapshot digest selected by the producer.
 * @property {string} proposalPath - Path to the closed product-artifact proposal JSON.
 * @property {string} [resourceRoot] - Explicit package root for declared content-addressed resources; defaults to the product store.
 * @property {ArtifactLockAuthority} [authority] - Current-owner authority for a protected lock transition.
 */

/**
 * @typedef {object} CommitProductArtifactResult
 * @property {'1.0'} schemaVersion - Commit-result contract version.
 * @property {string} productId - Stable ID of the owning product.
 * @property {{id: string, revision: number, path: string, sha256: string, materialSha256: string, created: boolean}} artifact - Exact persisted artifact binding.
 * @property {{id: string, revision: number, path: string, sha256: string, created: boolean}} snapshot - Exact product-snapshot binding.
 * @property {{path: string, sha256: string, changed: boolean}} current - Current-pointer write result.
 * @property {'unchanged'|'added'|'modified'|'superseded'} change - Material artifact transition committed by the call.
 */

function artifactMaterialProjection(artifact) {
  return {
    id: artifact.id,
    artifactKind: artifact.artifactKind,
    owner: artifact.owner,
    artifactSchemaVersion: artifact.artifactSchemaVersion,
    status: artifact.status,
    consumerDomains: artifact.consumerDomains,
    scopeRefs: artifact.scopeRefs,
    coverageRefs: artifact.coverageRefs,
    gapRefs: artifact.gapRefs,
    lockRefs: artifact.lockRefs,
    recordDependencies: artifact.recordDependencies,
    artifactDependencies: artifact.artifactDependencies,
    producer: artifact.producer,
    resources: artifact.resources,
    payload: artifact.payload,
  };
}

function materialSha256(artifact) {
  return sha256(Buffer.from(stableJson(artifactMaterialProjection(artifact))));
}

function artifactEntry(artifact, content, dependencyState = {status: 'current', reasons: []}) {
  return {
    id: artifact.id,
    artifactKind: artifact.artifactKind,
    owner: artifact.owner,
    artifactSchemaVersion: artifact.artifactSchemaVersion,
    status: artifact.status,
    consumerDomains: artifact.consumerDomains,
    scopeRefs: artifact.scopeRefs,
    coverageRefs: artifact.coverageRefs,
    gapRefs: artifact.gapRefs,
    lockRefs: artifact.lockRefs,
    recordDependencies: artifact.recordDependencies,
    artifactDependencies: artifact.artifactDependencies,
    producer: artifact.producer,
    resources: artifact.resources,
    revision: artifact.revision,
    change: artifact.change,
    content,
    dependencyState,
  };
}

function authorizeLock(authority, {id, owner}, action) {
  if (!authority) fail(`Artifact ${id} requires explicit current-owner authority for ${action}`);
  closed(authority, ['artifactId', 'owner', 'action'], 'authority');
  if (authority.artifactId !== id || authority.owner !== owner || authority.action !== action) {
    fail(`Artifact ${id} requires ${action} authority from current owner ${owner}`);
  }
}

function exactDirectory(directory, expectedFile) {
  if (!fs.existsSync(directory)) return;
  if (!fs.statSync(directory).isDirectory()) fail(`Expected artifact directory: ${directory}`);
  const entries = fs.readdirSync(directory).sort();
  if (entries.length > 1 || (entries.length === 1 && entries[0] !== expectedFile)) {
    fail(`Immutable artifact directory contains unexpected entries: ${directory}`);
  }
}

function stableSnapshotId(productId) {
  return `${productId}-snapshot`;
}

/**
 * Commit a derived artifact against the exact current product snapshot without reparsing source prose.
 * The product artifact, next snapshot, and current pointer are committed in that order.
 */
function commitProductArtifactLocked({currentPath, baseSnapshotSha256, proposalPath, authority, resourceRoot}) {
  assertSha256(baseSnapshotSha256, 'baseSnapshotSha256');
  const absoluteCurrentPath = path.resolve(currentPath);
  const root = path.dirname(absoluteCurrentPath);
  ensureUnlinkedPath(absoluteCurrentPath, root);
  const chain = loadCurrentProduct(absoluteCurrentPath);
  if (chain.current.snapshot.sha256 !== baseSnapshotSha256) fail('Artifact proposal base snapshot is no longer current');

  const proposalValue = parseJsonFile(proposalPath, 'product-artifact proposal', MAX_ARTIFACT_PROPOSAL_BYTES);
  const existingEntries = chain.snapshot.artifacts ?? [];
  const proposal = validateProductArtifact(proposalValue, {
    recordIndex: chain.model.recordIndex,
    artifactEntries: existingEntries,
  });
  const loaded = loadSnapshotArtifacts(root, existingEntries);
  const previousLoaded = loaded.find(item => item.entry.id === proposal.id) ?? null;
  const previous = previousLoaded?.artifact ?? null;
  const resourceFiles = proposal.resources.length
    ? verifyArtifactResourceFiles(proposal.resources, {resourceRoot: resourceRoot ?? root})
    : [];
  if (previous) {
    if (previous.owner !== proposal.owner) fail(`Artifact ${proposal.id} owner cannot change`);
    if (previous.artifactKind !== proposal.artifactKind) fail(`Artifact ${proposal.id} kind cannot change`);
    if (previous.status === 'superseded') fail(`Artifact ${proposal.id} is superseded and cannot be changed`);
  }
  if (!previous && proposal.status === 'superseded') fail(`New artifact ${proposal.id} cannot begin superseded`);

  const nextMaterialSha256 = materialSha256(proposal);
  if (previous && previous.materialSha256 === nextMaterialSha256) {
    publishArtifactResourceFiles(resourceFiles, {outputRoot: root});
    if (sha256(fs.readFileSync(absoluteCurrentPath)) !== sha256(chain.currentBytes)) {
      fail('Current pointer changed while checking an exact artifact replay');
    }
    return {
      schemaVersion: '1.0',
      productId: chain.model.id,
      artifact: {
        id: previous.id,
        revision: previous.revision,
        path: previousLoaded.entry.content.path,
        sha256: previousLoaded.entry.content.sha256,
        materialSha256: previous.materialSha256,
        created: false,
      },
      snapshot: {
        id: chain.snapshot.id,
        revision: chain.snapshot.revision,
        path: chain.current.snapshot.path,
        sha256: chain.current.snapshot.sha256,
        created: false,
      },
      current: {path: 'current.json', sha256: sha256(chain.currentBytes), changed: false},
      change: 'unchanged',
    };
  }
  if (previous?.status === 'locked') authorizeLock(authority, previous, 'modify-locked-artifact');
  else if (proposal.status === 'locked') authorizeLock(authority, proposal, 'lock-artifact');

  const revision = previous ? previous.revision + 1 : 1;
  const changeKind = !previous ? 'added' : proposal.status === 'superseded' ? 'superseded' : 'modified';
  const artifact = validateProductArtifact({
    ...proposal,
    kind: 'product-artifact',
    revision,
    materialSha256: nextMaterialSha256,
    change: {
      kind: changeKind,
      previousRevision: previous?.revision ?? null,
      previousMaterialSha256: previous?.materialSha256 ?? null,
    },
  }, {
    recordIndex: chain.model.recordIndex,
    artifactEntries: existingEntries,
  });
  const artifactBytes = Buffer.from(stableJson(artifact));
  const artifactSha256 = sha256(artifactBytes);
  const artifactStoredPath = `artifacts/${artifact.owner}/${artifact.id}/${artifact.revision}-${artifactSha256}.json`;
  const content = {path: artifactStoredPath, sha256: artifactSha256, materialSha256: artifact.materialSha256};
  const initialEntry = artifactEntry(artifact, content);
  const inventory = existingEntries.filter(entry => entry.id !== artifact.id);
  inventory.push(initialEntry);
  const artifacts = reclassifySnapshotArtifacts(inventory, chain.model.recordIndex);

  const snapshotRevision = chain.snapshot.revision + 1;
  const snapshot = validateProductSnapshot({
    schemaVersion: '1.0',
    kind: 'product-snapshot',
    id: stableSnapshotId(chain.model.id),
    revision: snapshotRevision,
    parent: {
      id: chain.snapshot.id,
      revision: chain.snapshot.revision,
      sha256: chain.current.snapshot.sha256,
    },
    source: chain.snapshot.source,
    productModel: chain.snapshot.productModel,
    artifacts,
  });
  const snapshotBytes = Buffer.from(stableJson(snapshot));
  const snapshotSha256 = sha256(snapshotBytes);
  const snapshotStoredPath = `snapshots/${snapshotSha256}/product-snapshot.json`;
  const current = validateCurrentPointer({
    schemaVersion: '1.0',
    kind: 'product-current',
    snapshot: {id: snapshot.id, revision: snapshot.revision, path: snapshotStoredPath, sha256: snapshotSha256},
  });
  const currentBytes = Buffer.from(stableJson(current));

  const artifactFile = path.join(root, ...artifactStoredPath.split('/'));
  const snapshotFile = path.join(root, ...snapshotStoredPath.split('/'));
  exactDirectory(path.dirname(snapshotFile), path.basename(snapshotFile));
  publishArtifactResourceFiles(resourceFiles, {outputRoot: root});
  const artifactCreated = writeImmutable(artifactFile, artifactBytes, root);
  const snapshotCreated = writeImmutable(snapshotFile, snapshotBytes, root);
  const currentChanged = writeCurrentCompareAndSwap(absoluteCurrentPath, currentBytes, root, sha256(chain.currentBytes));

  return {
    schemaVersion: '1.0',
    productId: chain.model.id,
    artifact: {
      id: artifact.id,
      revision: artifact.revision,
      path: artifactStoredPath,
      sha256: artifactSha256,
      materialSha256: artifact.materialSha256,
      created: artifactCreated,
    },
    snapshot: {
      id: snapshot.id,
      revision: snapshot.revision,
      path: snapshotStoredPath,
      sha256: snapshotSha256,
      created: snapshotCreated,
    },
    current: {path: 'current.json', sha256: sha256(currentBytes), changed: currentChanged},
    change: changeKind,
  };
}

/**
 * Commit one derived product artifact against an exact current snapshot without reparsing source prose.
 *
 * @param {CommitProductArtifactOptions} options - Closed artifact proposal, base, and optional lock authority.
 * @returns {CommitProductArtifactResult} - Exact artifact, snapshot, and current-pointer bindings.
 * @throws {Error} When input, authority, dependencies, storage, or the selected current base is invalid.
 */
export function commitProductArtifact(options) {
  const root = path.dirname(path.resolve(options.currentPath));
  return withProductStoreLock(root, () => commitProductArtifactLocked(options));
}

function parseCli(arguments_) {
  const options = {};
  const names = new Set(['--current', '--base-snapshot-sha256', '--input', '--authority', '--resource-root']);
  if (arguments_.length % 2 !== 0) fail(`Missing value for ${arguments_.at(-1)}`);
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    if (!names.has(flag)) fail(`Unknown option ${String(flag)}`);
    if (value === undefined || names.has(value)) fail(`Missing value for ${flag}`);
    if (Object.hasOwn(options, flag)) fail(`Repeated option ${flag}`);
    options[flag] = value;
  }
  for (const required of ['--current', '--base-snapshot-sha256', '--input']) {
    if (!Object.hasOwn(options, required)) fail(`Missing required option ${required}`);
  }
  return options;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    const options = parseCli(process.argv.slice(2));
    const authority = options['--authority']
      ? parseJsonFile(options['--authority'], 'artifact authority', 64 * 1024)
      : undefined;
    const result = commitProductArtifact({
      currentPath: options['--current'],
      baseSnapshotSha256: options['--base-snapshot-sha256'],
      proposalPath: options['--input'],
      authority,
      resourceRoot: options['--resource-root'],
    });
    process.stdout.write(stableJson(result));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
