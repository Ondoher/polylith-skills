import {
  array,
  assertSafeStoredPath,
  assertSha256,
  choice,
  closed,
  fail,
  object,
  positiveInteger,
  readBoundArtifact,
  sha256,
  stableId,
  stableJson,
  text,
  unique,
} from './product-artifact-utils.mjs';
import {isPublicationPayload, validatePublicationPayload, validateResourceDescriptors} from './product-publication-payload.mjs';

const PRODUCT_ARTIFACT_SCHEMA_VERSION = '1.0';

const authorialStatuses = new Set(['accepted', 'partial', 'locked', 'superseded']);
const dependencyStatuses = new Set(['current', 'stale', 'locked-conflict']);
const changeKinds = new Set(['added', 'unchanged', 'modified', 'superseded']);
const owners = new Set([
  'product',
  'ux',
  'ui',
  'system-architecture',
  'data-model',
  'controller',
  'technical-documentation',
  'implementation-planning',
  'testing',
  'coding',
]);
const consumerOrder = [
  'prd',
  'ux',
  'ui',
  'system-architecture',
  'data-model',
  'controller',
  'technical-documentation',
  'implementation-planning',
  'testing',
  'coding',
];
const consumers = new Set(consumerOrder);
const semverPattern = /^[0-9]+\.[0-9]+(?:\.[0-9]+)?(?:-[a-z0-9.-]+)?$/u;

function compareCodePoints(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeSemver(value, label) {
  text(value, label);
  if (value.length > 64 || !semverPattern.test(value)) fail(`${label} must be a compact semantic version`);
  return value;
}

function normalizeConsumerDomains(value, label) {
  const selected = unique(array(value, label).map((item, index) => choice(item, consumers, `${label}[${index}]`)), label);
  if (selected.length === 0) fail(`${label} must name at least one consumer domain`);
  return consumerOrder.filter(item => selected.includes(item));
}

function normalizeRefs(value, label, {allowEmpty = true} = {}) {
  const refs = unique(array(value, label).map((item, index) => stableId(item, `${label}[${index}]`)), label).sort();
  if (!allowEmpty && refs.length === 0) fail(`${label} must not be empty`);
  return refs;
}

function normalizeJson(value, label, state = {nodes: 0}, depth = 0) {
  state.nodes += 1;
  if (state.nodes > 100_000) fail(`${label} exceeds the JSON node limit`);
  if (depth > 64) fail(`${label} exceeds the JSON nesting limit`);
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > 32_768) fail(`${label} string exceeds the 32768-character limit`);
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) fail(`${label} cannot contain unsafe control characters`);
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(`${label} must contain only finite numbers`);
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 10_000) fail(`${label} array exceeds the 10000-entry limit`);
    return value.map((item, index) => normalizeJson(item, `${label}[${index}]`, state, depth + 1));
  }
  object(value, label);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(`${label} must contain only plain JSON objects`);
  const keys = Object.keys(value).sort();
  if (keys.length > 10_000) fail(`${label} object exceeds the 10000-field limit`);
  return Object.fromEntries(keys.map(key => {
    if (key.length === 0 || key.length > 32_768 || /[\u0000-\u001f\u007f]/u.test(key)) fail(`${label} contains an invalid object key`);
    return [key, normalizeJson(value[key], `${label}.${key}`, state, depth + 1)];
  }));
}

function normalizeRecordDependencies(value, label) {
  const dependencies = array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    closed(item, ['id', 'materialSha256'], itemLabel);
    return {
      id: stableId(item.id, `${itemLabel}.id`),
      materialSha256: assertSha256(item.materialSha256, `${itemLabel}.materialSha256`),
    };
  }).sort((left, right) => compareCodePoints(left.id, right.id));
  unique(dependencies.map(item => item.id), `${label} IDs`);
  return dependencies;
}

function normalizeArtifactDependencies(value, label) {
  const dependencies = array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    closed(item, ['id', 'revision', 'materialSha256'], itemLabel);
    return {
      id: stableId(item.id, `${itemLabel}.id`),
      revision: positiveInteger(item.revision, `${itemLabel}.revision`),
      materialSha256: assertSha256(item.materialSha256, `${itemLabel}.materialSha256`),
    };
  }).sort((left, right) => compareCodePoints(left.id, right.id));
  unique(dependencies.map(item => item.id), `${label} IDs`);
  return dependencies;
}

function normalizeProducer(value, label) {
  closed(value, ['id', 'contractVersion', 'method'], label);
  return {
    id: stableId(value.id, `${label}.id`),
    contractVersion: normalizeSemver(value.contractVersion, `${label}.contractVersion`),
    method: stableId(value.method, `${label}.method`),
  };
}

function normalizeChange(value, {revision, status, materialSha256}, label) {
  closed(value, ['kind', 'previousRevision', 'previousMaterialSha256'], label);
  const kind = choice(value.kind, changeKinds, `${label}.kind`);
  const previousRevision = value.previousRevision === null ? null : positiveInteger(value.previousRevision, `${label}.previousRevision`);
  const previousMaterialSha256 = value.previousMaterialSha256 === null ? null : assertSha256(value.previousMaterialSha256, `${label}.previousMaterialSha256`);
  const hasPrevious = previousRevision !== null && previousMaterialSha256 !== null;
  if ((previousRevision === null) !== (previousMaterialSha256 === null)) fail(`${label} previous revision and material digest must both be null or both be present`);
  if (kind === 'added') {
    if (revision !== 1 || hasPrevious) fail(`${label} added is valid only for revision 1 without a previous binding`);
    if (status === 'superseded') fail(`${label} added cannot have superseded status`);
  } else {
    if (!hasPrevious) fail(`${label} ${kind} artifacts must identify a previous revision`);
    if (revision < 2 || previousRevision !== revision - 1) fail(`${label} ${kind} must bind revision ${revision - 1}`);
  }
  if ((kind === 'superseded') !== (status === 'superseded')) {
    fail(`${label} superseded and artifact status superseded must occur together`);
  }
  if (kind === 'unchanged' && previousMaterialSha256 !== materialSha256) {
    fail(`${label} unchanged must retain the previous material digest`);
  }
  if ((kind === 'modified' || kind === 'superseded') && previousMaterialSha256 === materialSha256) {
    fail(`${label} ${kind} must change the material digest`);
  }
  return {kind, previousRevision, previousMaterialSha256};
}

function normalizeCommon(value, label) {
  const status = choice(value.status, authorialStatuses, `${label}.status`);
  const gapRefs = normalizeRefs(value.gapRefs, `${label}.gapRefs`);
  if (status === 'partial' && gapRefs.length === 0) fail(`${label}.gapRefs must identify at least one explicit gap when status is partial`);
  const scopeRefs = normalizeRefs(value.scopeRefs, `${label}.scopeRefs`, {allowEmpty: false});
  const coverageRefs = normalizeRefs(value.coverageRefs, `${label}.coverageRefs`);
  for (const ref of coverageRefs) if (!scopeRefs.includes(ref)) fail(`${label}.coverageRefs contains ${ref}, which is outside scopeRefs`);
  const lockRefs = normalizeRefs(value.lockRefs, `${label}.lockRefs`);
  const recordDependencies = normalizeRecordDependencies(value.recordDependencies, `${label}.recordDependencies`);
  const recordDependencyIds = new Set(recordDependencies.map(dependency => dependency.id));
  for (const ref of [...scopeRefs, ...coverageRefs, ...gapRefs, ...lockRefs]) {
    if (!recordDependencyIds.has(ref)) fail(`${label} reference ${ref} lacks an exact record dependency binding`);
  }
  return {
    id: stableId(value.id, `${label}.id`),
    artifactKind: stableId(value.artifactKind, `${label}.artifactKind`),
    owner: choice(value.owner, owners, `${label}.owner`),
    artifactSchemaVersion: normalizeSemver(value.artifactSchemaVersion, `${label}.artifactSchemaVersion`),
    status,
    consumerDomains: normalizeConsumerDomains(value.consumerDomains, `${label}.consumerDomains`),
    scopeRefs,
    coverageRefs,
    gapRefs,
    lockRefs,
    recordDependencies,
    artifactDependencies: normalizeArtifactDependencies(value.artifactDependencies, `${label}.artifactDependencies`),
    producer: normalizeProducer(value.producer, `${label}.producer`),
    resources: normalizeJson(validateResourceDescriptors(value.resources), `${label}.resources`),
  };
}

function materialProjection(artifact) {
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

/** Calculate the digest of an artifact's durable authorial material. */
function calculateProductArtifactMaterialSha256(artifact) {
  return sha256(Buffer.from(stableJson(materialProjection(artifact))));
}

/**
 * Validate and normalize a closed product-artifact proposal or persisted envelope.
 * Reference closure is checked when recordIndex/artifactEntries are supplied.
 */
export function validateProductArtifact(value, {recordIndex, artifactEntries} = {}) {
  object(value, 'productArtifact');
  const proposal = value.kind === 'product-artifact-proposal';
  const persisted = value.kind === 'product-artifact';
  if (value.schemaVersion !== PRODUCT_ARTIFACT_SCHEMA_VERSION || (!proposal && !persisted)) {
    fail('Product artifact must use product-artifact schema 1.0');
  }
  const commonKeys = [
    'schemaVersion', 'kind', 'id', 'artifactKind', 'owner', 'artifactSchemaVersion', 'status',
    'consumerDomains', 'scopeRefs', 'coverageRefs', 'gapRefs', 'lockRefs',
    'recordDependencies', 'artifactDependencies', 'producer', 'resources', 'payload',
  ];
  closed(value, persisted ? [...commonKeys, 'revision', 'materialSha256', 'change'] : commonKeys, 'productArtifact');
  const common = normalizeCommon(value, 'productArtifact');
  const payload = normalizeJson(value.payload, 'productArtifact.payload');
  const normalized = {
    schemaVersion: PRODUCT_ARTIFACT_SCHEMA_VERSION,
    kind: value.kind,
    ...common,
    payload,
  };
  if (isPublicationPayload(normalized)) validatePublicationPayload(normalized);

  if (recordIndex !== undefined) validateRecordReferences(normalized, recordIndex);
  if (artifactEntries !== undefined) validateArtifactReferences(normalized, artifactEntries);
  if (normalized.artifactDependencies.some(item => item.id === normalized.id)) fail('Product artifact cannot depend on itself');

  if (!persisted) return normalized;
  const revision = positiveInteger(value.revision, 'productArtifact.revision');
  const artifactMaterialSha256 = assertSha256(value.materialSha256, 'productArtifact.materialSha256');
  const change = normalizeChange(value.change, {
    revision,
    status: normalized.status,
    materialSha256: artifactMaterialSha256,
  }, 'productArtifact.change');
  const artifact = {
    ...normalized,
    revision,
    materialSha256: artifactMaterialSha256,
    change,
  };
  // Put computed fields before material content in a single canonical persisted order.
  const result = {
    schemaVersion: artifact.schemaVersion,
    kind: artifact.kind,
    id: artifact.id,
    artifactKind: artifact.artifactKind,
    owner: artifact.owner,
    artifactSchemaVersion: artifact.artifactSchemaVersion,
    revision: artifact.revision,
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
    materialSha256: artifact.materialSha256,
    change: artifact.change,
  };
  if (calculateProductArtifactMaterialSha256(result) !== result.materialSha256) {
    fail('productArtifact.materialSha256 does not match its material content');
  }
  return result;
}

function recordIndexMap(recordIndex) {
  const values = recordIndex instanceof Map
    ? [...recordIndex.entries()].map(([id, record]) => ({...record, id}))
    : Array.isArray(recordIndex)
      ? recordIndex
      : Object.entries(object(recordIndex, 'recordIndex')).map(([id, record]) => ({...object(record, `recordIndex.${id}`), id}));
  const result = new Map();
  for (let index = 0; index < values.length; index += 1) {
    const record = object(values[index], `recordIndex[${index}]`);
    const id = stableId(record.id, `recordIndex[${index}].id`);
    if (result.has(id)) fail(`recordIndex contains duplicate record ${id}`);
    result.set(id, {
      ...record,
      id,
      materialSha256: assertSha256(record.materialSha256, `recordIndex[${index}].materialSha256`),
      status: text(record.status, `recordIndex[${index}].status`),
      kind: text(record.kind, `recordIndex[${index}].kind`),
    });
  }
  return result;
}

function validateRecordReferences(artifact, recordIndex) {
  const records = recordIndexMap(recordIndex);
  const dependencies = new Map(artifact.recordDependencies.map(item => [item.id, item]));
  const allRefs = [...artifact.scopeRefs, ...artifact.coverageRefs, ...artifact.gapRefs, ...artifact.lockRefs];
  for (const ref of allRefs) {
    if (!records.has(ref)) fail(`Product artifact references missing product record ${ref}`);
    if (!dependencies.has(ref)) fail(`Product artifact reference ${ref} lacks a record dependency binding`);
  }
  for (const dependency of artifact.recordDependencies) {
    const record = records.get(dependency.id);
    if (!record) fail(`Product artifact depends on missing product record ${dependency.id}`);
    if (record.materialSha256 !== dependency.materialSha256) fail(`Product artifact record dependency ${dependency.id} is not current`);
    if (record.status === 'superseded') fail(`Product artifact cannot depend on superseded product record ${dependency.id}`);
  }
  for (const ref of artifact.gapRefs) {
    if (records.get(ref).kind !== 'gap') fail(`Product artifact gap ref ${ref} does not identify a gap record`);
  }
  for (const ref of artifact.lockRefs) {
    if (records.get(ref).status !== 'locked') fail(`Product artifact lock ref ${ref} does not identify a locked record`);
  }
}

function snapshotEntryMap(entries) {
  const normalized = normalizeSnapshotArtifacts(entries);
  return new Map(normalized.map(entry => [entry.id, entry]));
}

function validateArtifactReferences(artifact, entries) {
  const artifacts = snapshotEntryMap(entries);
  for (const dependency of artifact.artifactDependencies) {
    const current = artifacts.get(dependency.id);
    if (!current) fail(`Product artifact depends on missing artifact ${dependency.id}`);
    if (current.revision !== dependency.revision || current.content.materialSha256 !== dependency.materialSha256) {
      fail(`Product artifact dependency ${dependency.id} is not current`);
    }
    if (current.status === 'superseded' || current.dependencyState.status !== 'current') {
      fail(`Product artifact cannot depend on unusable artifact ${dependency.id}`);
    }
  }
}

function normalizeDependencyState(value, label) {
  closed(value, ['status', 'reasons'], label);
  return {
    status: choice(value.status, dependencyStatuses, `${label}.status`),
    reasons: unique(array(value.reasons, `${label}.reasons`).map((item, index) => text(item, `${label}.reasons[${index}]`)), `${label}.reasons`).sort(),
  };
}

function normalizeSnapshotEntry(value, label) {
  closed(value, [
    'id', 'artifactKind', 'owner', 'artifactSchemaVersion', 'revision', 'status', 'consumerDomains',
    'scopeRefs', 'coverageRefs', 'gapRefs', 'lockRefs', 'recordDependencies', 'artifactDependencies',
    'producer', 'resources', 'change', 'content', 'dependencyState',
  ], label);
  const common = normalizeCommon(value, label);
  closed(value.content, ['path', 'sha256', 'materialSha256'], `${label}.content`);
  const content = {
    path: assertSafeStoredPath(value.content.path, `${label}.content.path`),
    sha256: assertSha256(value.content.sha256, `${label}.content.sha256`),
    materialSha256: assertSha256(value.content.materialSha256, `${label}.content.materialSha256`),
  };
  const revision = positiveInteger(value.revision, `${label}.revision`);
  const expectedPath = `artifacts/${common.owner}/${common.id}/${revision}-${content.sha256}.json`;
  if (content.path !== expectedPath) fail(`${label}.content.path must be content-addressed by owner, ID, revision, and SHA-256`);
  return {
    ...common,
    revision,
    change: normalizeChange(value.change, {
      revision,
      status: common.status,
      materialSha256: content.materialSha256,
    }, `${label}.change`),
    content,
    dependencyState: normalizeDependencyState(value.dependencyState, `${label}.dependencyState`),
  };
}

function artifactTopologicalOrder(entries) {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const dependencyCount = new Map(entries.map(entry => [entry.id, entry.artifactDependencies.length]));
  const dependents = new Map(entries.map(entry => [entry.id, []]));
  for (const entry of entries) {
    for (const dependency of entry.artifactDependencies) {
      const target = byId.get(dependency.id);
      if (!target) fail(`Snapshot artifact ${entry.id} depends on missing artifact ${dependency.id}`);
      dependents.get(target.id).push(entry.id);
    }
  }
  const ready = entries.filter(entry => dependencyCount.get(entry.id) === 0).map(entry => entry.id).sort();
  const order = [];
  for (let index = 0; index < ready.length; index += 1) {
    const id = ready[index];
    order.push(id);
    for (const dependentId of dependents.get(id).sort()) {
      const remaining = dependencyCount.get(dependentId) - 1;
      dependencyCount.set(dependentId, remaining);
      if (remaining === 0) ready.push(dependentId);
    }
  }
  if (order.length !== entries.length) {
    const ordered = new Set(order);
    const cycleIds = entries.filter(entry => !ordered.has(entry.id)).map(entry => entry.id).sort();
    fail(`Product artifact dependency cycle includes ${cycleIds.join(', ')}`);
  }
  return order;
}

/** Validate, normalize, and deterministically order snapshot artifact entries. */
export function normalizeSnapshotArtifacts(value, label = 'productSnapshot.artifacts') {
  const entries = array(value, label).map((item, index) => normalizeSnapshotEntry(item, `${label}[${index}]`))
    .sort((left, right) => compareCodePoints(left.id, right.id));
  unique(entries.map(entry => entry.id), `${label} IDs`);
  artifactTopologicalOrder(entries);
  return entries;
}

function snapshotEntryFromArtifact(artifact, content, dependencyState) {
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

/** Load and exact-byte verify every artifact bound by a snapshot inventory. */
export function loadSnapshotArtifacts(root, entries) {
  return normalizeSnapshotArtifacts(entries).map(entry => {
    const bound = readBoundArtifact(root, entry.content.path, entry.content.sha256, `snapshot artifact ${entry.id}`);
    let parsed;
    try {
      parsed = JSON.parse(bound.bytes.toString('utf8'));
    } catch (error) {
      fail(`Snapshot artifact ${entry.id} is not valid JSON: ${error.message}`);
    }
    const artifact = validateProductArtifact(parsed);
    if (stableJson(artifact) !== bound.bytes.toString('utf8')) fail(`Snapshot artifact ${entry.id} is not in canonical byte form`);
    const expectedEntry = snapshotEntryFromArtifact(artifact, entry.content, entry.dependencyState);
    if (JSON.stringify(expectedEntry) !== JSON.stringify(entry)) fail(`Snapshot artifact entry ${entry.id} does not match its bound envelope`);
    if (artifact.materialSha256 !== entry.content.materialSha256) fail(`Snapshot artifact ${entry.id} material digest does not match its snapshot entry`);
    return {entry, artifact, bytes: bound.bytes};
  });
}

/**
 * Recompute dependency health against a new product record index and current artifact inventory.
 * Stored envelope bindings are retained byte-for-byte; only snapshot dependency state changes.
 */
export function reclassifySnapshotArtifacts(entries, nextRecordIndex) {
  const normalized = normalizeSnapshotArtifacts(entries);
  const records = recordIndexMap(nextRecordIndex);
  const byId = new Map(normalized.map(entry => [entry.id, entry]));
  const topologicalOrder = artifactTopologicalOrder(normalized);
  const directReasons = new Map();
  for (const entry of normalized) {
    const reasons = [];
    for (const dependency of entry.recordDependencies) {
      const record = records.get(dependency.id);
      if (!record) reasons.push(`record:${dependency.id}:missing`);
      else if (record.status === 'superseded') reasons.push(`record:${dependency.id}:superseded`);
      else if (record.materialSha256 !== dependency.materialSha256) reasons.push(`record:${dependency.id}:material-changed`);
    }
    for (const dependency of entry.artifactDependencies) {
      const target = byId.get(dependency.id);
      if (!target) fail(`Snapshot artifact ${entry.id} depends on missing artifact ${dependency.id}`);
      if (target.status === 'superseded') reasons.push(`artifact:${dependency.id}:superseded`);
      else if (target.revision !== dependency.revision || target.content.materialSha256 !== dependency.materialSha256) {
        reasons.push(`artifact:${dependency.id}:material-changed`);
      }
    }
    directReasons.set(entry.id, reasons.sort());
  }

  const classified = new Map();
  for (const id of topologicalOrder) {
    const entry = byId.get(id);
    const reasons = [...directReasons.get(entry.id)];
    for (const dependency of entry.artifactDependencies) {
      const targetState = classified.get(dependency.id);
      if (targetState.status !== 'current') reasons.push(`artifact:${dependency.id}:${targetState.status}`);
    }
    const uniqueReasons = [...new Set(reasons)].sort();
    const status = uniqueReasons.length === 0 ? 'current' : entry.status === 'locked' ? 'locked-conflict' : 'stale';
    const state = {status, reasons: uniqueReasons};
    classified.set(entry.id, state);
  }

  return normalized.map(entry => ({...entry, dependencyState: classified.get(entry.id)}));
}
