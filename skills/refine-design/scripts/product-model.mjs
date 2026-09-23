import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TextDecoder} from 'node:util';

import {
  array, assertSafeStoredPath, assertSha256, choice, closed, ensureUnlinkedPath, fail,
  object, parseJsonFile, positiveInteger, readBoundedFile, readBoundArtifact,
  safeRelativeLabel, sha256, stableId, stableJson, text, unique,
  withProductStoreLock, writeCurrentCompareAndSwap, writeCurrentLast, writeImmutable,
} from './product-artifact-utils.mjs';
import {
  loadSnapshotArtifacts,
  normalizeSnapshotArtifacts,
  reclassifySnapshotArtifacts,
} from './product-artifact-contract.mjs';

export const PRODUCT_MODEL_MAX_INPUT_BYTES = 4 * 1024 * 1024;
export const PRODUCT_MODEL_MAX_SOURCE_LINES = 100_000;

/**
 * @typedef {object} ProductLockGrant
 * @property {string} recordRef - Stable ID of the protected product record.
 * @property {string} owner - Current owner granting the protected transition.
 * @property {string} instruction - Human instruction authorizing the transition.
 */

/**
 * @typedef {object} ProductLockAuthority
 * @property {'1.0'} schemaVersion - Lock-authority contract version.
 * @property {'product-lock-authority'} kind - Lock-authority envelope kind.
 * @property {ProductLockGrant[]} grants - Exact current-owner grants consumed by the transaction.
 */

/**
 * @typedef {object} PersistProductModelOptions
 * @property {string} proposalPath - Path to the closed product-model proposal JSON.
 * @property {string} sourcePath - Path to the exact human-authored product-description bytes.
 * @property {string} sourceLabel - Portable relative label persisted for the source.
 * @property {string} outputRoot - Dedicated product artifact-store root.
 * @property {ProductLockAuthority} [authority] - Explicit authority for protected lock transitions.
 */

/**
 * @typedef {object} StoredWriteResult
 * @property {string} path - Portable path within the product artifact store.
 * @property {string} sha256 - SHA-256 of the exact stored bytes.
 * @property {boolean} created - Whether this call created the immutable file.
 */

/**
 * @typedef {object} PersistProductModelResult
 * @property {'1.0'} schemaVersion - Persistence-result contract version.
 * @property {string} productId - Stable product ID.
 * @property {number} revision - Current product-model revision.
 * @property {StoredWriteResult} source - Persisted source binding.
 * @property {StoredWriteResult & {materialSha256: string}} productModel - Persisted model binding.
 * @property {StoredWriteResult & {id: string, revision: number}} snapshot - Persisted snapshot binding.
 * @property {{path: string, sha256: string, changed: boolean}} current - Current-pointer write result.
 */

/**
 * @typedef {object} CurrentProductChain
 * @property {string} root - Absolute product artifact-store root.
 * @property {Record<string, unknown>} current - Canonical closed product-current document.
 * @property {Buffer} currentBytes - Exact current-pointer bytes.
 * @property {Record<string, unknown>} snapshot - Canonical closed product-snapshot document.
 * @property {Buffer} snapshotBytes - Exact snapshot bytes.
 * @property {Record<string, unknown>} model - Canonical closed product-model document.
 * @property {Buffer} modelBytes - Exact product-model bytes.
 * @property {Buffer} sourceBytes - Exact bound product-description bytes.
 * @property {Array<{entry: Record<string, unknown>, artifact: Record<string, unknown>, bytes: Buffer}>} artifacts - Exact verified artifact envelopes and snapshot entries.
 */

const modelStatuses = new Set(['accepted', 'partial', 'locked']);
const recordStatuses = new Set(['accepted', 'locked', 'superseded']);
const gapStatuses = new Set(['unresolved', 'locked', 'superseded']);
const anyRecordStatuses = new Set([...modelStatuses, ...recordStatuses, ...gapStatuses]);
const identityKinds = new Set(['new', 'continued']);
const recordKinds = new Set(['product', 'purpose', 'user', 'capability', 'gap']);
const changeClasses = new Set(['introduced', 'unchanged', 'changed']);
const modelChangeClasses = new Set(['initial', 'source-only', 'material']);
const claimChangeClasses = new Set(['introduced', 'retained', 'succeeded']);
const dispositions = new Set(['incorporated', 'superseded', 'unresolved', 'unclassified']);
const gapKinds = new Set(['open-question', 'missing-requirement', 'ambiguity', 'conflict']);
const owners = new Set([
  'product', 'ux', 'ui', 'system-architecture', 'data-model', 'controller',
  'technical-documentation', 'implementation-planning', 'testing', 'coding',
]);
const consumerOrder = [
  'prd', 'ux', 'ui', 'system-architecture', 'data-model', 'controller',
  'technical-documentation', 'implementation-planning', 'testing', 'coding',
];
const consumers = new Set(consumerOrder);

function compareCodePoints(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeConsumerDomains(value, label) {
  const selected = unique(array(value, label).map((item, index) => choice(item, consumers, `${label}[${index}]`)), label);
  if (selected.length === 0) fail(`${label} must name at least one consumer domain`);
  return consumerOrder.filter(item => selected.includes(item));
}

function normalizeOwner(value, label) {
  return choice(value, owners, label);
}

function normalizeProvenance(value, label) {
  closed(value, ['sourceClaimRefs'], label);
  const refs = unique(array(value.sourceClaimRefs, `${label}.sourceClaimRefs`).map((item, index) => stableId(item, `${label}.sourceClaimRefs[${index}]`)), `${label}.sourceClaimRefs`).sort();
  if (refs.length === 0) fail(`${label}.sourceClaimRefs must not be empty`);
  return {sourceClaimRefs: refs};
}

function normalizePurpose(value, label) {
  closed(value, ['id', 'summary', 'status', 'owner', 'consumerDomains', 'provenance'], label);
  return {
    id: stableId(value.id, `${label}.id`),
    summary: text(value.summary, `${label}.summary`),
    status: choice(value.status, new Set(['accepted', 'locked']), `${label}.status`),
    owner: normalizeOwner(value.owner, `${label}.owner`),
    consumerDomains: normalizeConsumerDomains(value.consumerDomains, `${label}.consumerDomains`),
    provenance: normalizeProvenance(value.provenance, `${label}.provenance`),
  };
}

function normalizeUser(value, label) {
  closed(value, ['id', 'name', 'description', 'status', 'owner', 'consumerDomains', 'provenance'], label);
  return {
    id: stableId(value.id, `${label}.id`),
    name: text(value.name, `${label}.name`),
    description: text(value.description, `${label}.description`),
    status: choice(value.status, recordStatuses, `${label}.status`),
    owner: normalizeOwner(value.owner, `${label}.owner`),
    consumerDomains: normalizeConsumerDomains(value.consumerDomains, `${label}.consumerDomains`),
    provenance: normalizeProvenance(value.provenance, `${label}.provenance`),
  };
}

function normalizeCapability(value, label) {
  closed(value, ['id', 'name', 'description', 'outcome', 'status', 'owner', 'consumerDomains', 'userRefs', 'relatedCapabilityRefs', 'provenance'], label);
  return {
    id: stableId(value.id, `${label}.id`),
    name: text(value.name, `${label}.name`),
    description: text(value.description, `${label}.description`),
    outcome: text(value.outcome, `${label}.outcome`),
    status: choice(value.status, recordStatuses, `${label}.status`),
    owner: normalizeOwner(value.owner, `${label}.owner`),
    consumerDomains: normalizeConsumerDomains(value.consumerDomains, `${label}.consumerDomains`),
    userRefs: unique(array(value.userRefs, `${label}.userRefs`).map((item, index) => stableId(item, `${label}.userRefs[${index}]`)), `${label}.userRefs`).sort(),
    relatedCapabilityRefs: unique(array(value.relatedCapabilityRefs, `${label}.relatedCapabilityRefs`).map((item, index) => stableId(item, `${label}.relatedCapabilityRefs[${index}]`)), `${label}.relatedCapabilityRefs`).sort(),
    provenance: normalizeProvenance(value.provenance, `${label}.provenance`),
  };
}

function normalizeGap(value, label) {
  closed(value, ['id', 'kind', 'question', 'impact', 'status', 'owner', 'consumerDomains', 'capabilityRefs', 'provenance'], label);
  return {
    id: stableId(value.id, `${label}.id`),
    kind: choice(value.kind, gapKinds, `${label}.kind`),
    question: text(value.question, `${label}.question`),
    impact: text(value.impact, `${label}.impact`),
    status: choice(value.status, gapStatuses, `${label}.status`),
    owner: normalizeOwner(value.owner, `${label}.owner`),
    consumerDomains: normalizeConsumerDomains(value.consumerDomains, `${label}.consumerDomains`),
    capabilityRefs: unique(array(value.capabilityRefs, `${label}.capabilityRefs`).map((item, index) => stableId(item, `${label}.capabilityRefs[${index}]`)), `${label}.capabilityRefs`).sort(),
    provenance: normalizeProvenance(value.provenance, `${label}.provenance`),
  };
}

function sourceLineRanges(bytes) {
  let decoded;
  try {
    decoded = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  } catch {
    fail('Product description must be valid UTF-8');
  }
  if (decoded.trim() === '') fail('Product description must contain non-whitespace text');
  const ranges = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] === 0x0a) {
      ranges.push({start, endExclusive: index + 1});
      if (ranges.length > PRODUCT_MODEL_MAX_SOURCE_LINES) fail(`Product description exceeds the ${PRODUCT_MODEL_MAX_SOURCE_LINES}-line limit`);
      start = index + 1;
    }
  }
  if (start < bytes.length) ranges.push({start, endExclusive: bytes.length});
  if (ranges.length > PRODUCT_MODEL_MAX_SOURCE_LINES) fail(`Product description exceeds the ${PRODUCT_MODEL_MAX_SOURCE_LINES}-line limit`);
  return ranges;
}

function normalizeClaimCore(claim, label) {
  closed(claim, ['id', 'startLine', 'endLine', 'summary', 'disposition', 'recordRefs'], label);
  const result = {
    id: stableId(claim.id, `${label}.id`),
    startLine: positiveInteger(claim.startLine, `${label}.startLine`),
    endLine: positiveInteger(claim.endLine, `${label}.endLine`),
    summary: text(claim.summary, `${label}.summary`),
    disposition: choice(claim.disposition, dispositions, `${label}.disposition`),
    recordRefs: unique(array(claim.recordRefs, `${label}.recordRefs`).map((item, index) => stableId(item, `${label}.recordRefs[${index}]`)), `${label}.recordRefs`).sort(),
  };
  if (result.endLine < result.startLine) fail(`${label}.endLine must not precede startLine`);
  if (result.disposition === 'unclassified' && result.recordRefs.length !== 0) fail(`${label}.recordRefs must be empty for an unclassified claim`);
  if (result.disposition !== 'unclassified' && result.recordRefs.length === 0) fail(`${label}.recordRefs must not be empty for disposition ${result.disposition}`);
  return result;
}

function normalizeSourceClaims(value, lines, sourceBytes) {
  const claims = array(value, 'proposal.sourceClaims').map((claim, index) => normalizeClaimCore(claim, `proposal.sourceClaims[${index}]`))
    .sort((left, right) => left.startLine - right.startLine || left.endLine - right.endLine || compareCodePoints(left.id, right.id));
  unique(claims.map(claim => claim.id), 'proposal.sourceClaims ids');
  if (claims.length === 0) fail('proposal.sourceClaims must not be empty');
  let expectedLine = 1;
  for (const claim of claims) {
    if (claim.startLine !== expectedLine) fail(`Source claims must partition every source line exactly once; expected line ${expectedLine}`);
    if (claim.endLine > lines.length) fail(`Source claim ${claim.id} exceeds source line count ${lines.length}`);
    expectedLine = claim.endLine + 1;
  }
  if (expectedLine !== lines.length + 1) fail(`Source claims must cover all ${lines.length} source lines; coverage ends at line ${expectedLine - 1}`);
  return claims.map(claim => {
    const startByte = lines[claim.startLine - 1].start;
    const endByteExclusive = lines[claim.endLine - 1].endExclusive;
    return {
      ...claim,
      sourceRange: {startByte, endByteExclusive},
      sourceSegmentSha256: sha256(sourceBytes.subarray(startByte, endByteExclusive)),
    };
  });
}

function normalizePersistedClaim(value, label) {
  closed(value, ['id', 'startLine', 'endLine', 'summary', 'disposition', 'recordRefs', 'sourceRange', 'sourceSegmentSha256'], label);
  const core = normalizeClaimCore({
    id: value.id, startLine: value.startLine, endLine: value.endLine, summary: value.summary,
    disposition: value.disposition, recordRefs: value.recordRefs,
  }, label);
  closed(value.sourceRange, ['startByte', 'endByteExclusive'], `${label}.sourceRange`);
  if (!Number.isSafeInteger(value.sourceRange.startByte) || value.sourceRange.startByte < 0) fail(`${label}.sourceRange.startByte must be a non-negative safe integer`);
  positiveInteger(value.sourceRange.endByteExclusive, `${label}.sourceRange.endByteExclusive`);
  if (value.sourceRange.endByteExclusive <= value.sourceRange.startByte) fail(`${label}.sourceRange must not be empty`);
  return {
    ...core,
    sourceRange: {...value.sourceRange},
    sourceSegmentSha256: assertSha256(value.sourceSegmentSha256, `${label}.sourceSegmentSha256`),
  };
}

function semanticRecords(model) {
  return [
    {kind: 'purpose', record: model.purpose},
    ...model.users.map(record => ({kind: 'user', record})),
    ...model.capabilities.map(record => ({kind: 'capability', record})),
    ...model.gaps.map(record => ({kind: 'gap', record})),
  ];
}

function validateRecordGraph(model) {
  const records = semanticRecords(model).map(item => item.record);
  const byId = new Map();
  for (const record of records) {
    if (record.id === model.id || byId.has(record.id)) fail(`Product model contains duplicate or conflicting record id ${record.id}`);
    byId.set(record.id, record);
  }
  for (const capability of model.capabilities) {
    for (const ref of capability.userRefs) if (!model.users.some(record => record.id === ref)) fail(`Capability ${capability.id} references missing user ${ref}`);
    for (const ref of capability.relatedCapabilityRefs) {
      if (!model.capabilities.some(record => record.id === ref)) fail(`Capability ${capability.id} references missing capability ${ref}`);
      if (ref === capability.id) fail(`Capability ${capability.id} cannot relate to itself`);
    }
  }
  for (const gap of model.gaps) for (const ref of gap.capabilityRefs) if (!model.capabilities.some(record => record.id === ref)) fail(`Gap ${gap.id} references missing capability ${ref}`);
  const claims = new Map(model.sourceClaims.map(claim => [claim.id, claim]));
  for (const claim of model.sourceClaims) {
    for (const ref of claim.recordRefs) {
      const record = byId.get(ref);
      if (!record) fail(`Source claim ${claim.id} references missing record ${ref}`);
      if (!record.provenance.sourceClaimRefs.includes(claim.id)) fail(`Source claim ${claim.id} and record ${ref} provenance must reference each other`);
      if (claim.disposition === 'unresolved' && !model.gaps.includes(record)) fail(`Unresolved source claim ${claim.id} may reference only gaps`);
      if (claim.disposition === 'superseded' && record.status !== 'superseded') fail(`Superseded source claim ${claim.id} must reference superseded records`);
      if (claim.disposition === 'incorporated' && (model.gaps.includes(record) || record.status === 'superseded')) fail(`Incorporated source claim ${claim.id} must reference current non-gap records`);
    }
  }
  for (const record of records) for (const ref of record.provenance.sourceClaimRefs) {
    const claim = claims.get(ref);
    if (!claim || !claim.recordRefs.includes(record.id)) fail(`Record ${record.id} and source claim ${ref} must reference each other`);
  }
}

function validateCompleteness(model) {
  const incomplete = model.gaps.some(gap => gap.status !== 'superseded')
    || model.sourceClaims.some(claim => claim.disposition === 'unclassified');
  if (model.status === 'partial' && !incomplete) fail('A partial product model must contain an active gap or unclassified source claim');
  if (model.status !== 'partial' && incomplete) fail('A product model with active gaps or unclassified source claims must be partial');
}

function normalizeBase(value, label) {
  if (value === null) return null;
  closed(value, ['snapshotSha256', 'modelSha256', 'revision'], label);
  return {
    snapshotSha256: assertSha256(value.snapshotSha256, `${label}.snapshotSha256`),
    modelSha256: assertSha256(value.modelSha256, `${label}.modelSha256`),
    revision: positiveInteger(value.revision, `${label}.revision`),
  };
}

function normalizeIdentityClaims(value, label) {
  const claims = array(value, label).map((claim, index) => {
    const itemLabel = `${label}[${index}]`;
    closed(claim, ['recordRef', 'kind', 'previousRef', 'supersedesRefs'], itemLabel);
    const result = {
      recordRef: stableId(claim.recordRef, `${itemLabel}.recordRef`),
      kind: choice(claim.kind, identityKinds, `${itemLabel}.kind`),
      previousRef: claim.previousRef === null ? null : stableId(claim.previousRef, `${itemLabel}.previousRef`),
      supersedesRefs: unique(array(claim.supersedesRefs, `${itemLabel}.supersedesRefs`).map((ref, refIndex) => stableId(ref, `${itemLabel}.supersedesRefs[${refIndex}]`)), `${itemLabel}.supersedesRefs`).sort(),
    };
    if (result.kind === 'continued' && result.previousRef !== result.recordRef) fail(`${itemLabel} continued identity must preserve the same record ID`);
    if (result.kind === 'continued' && result.supersedesRefs.length > 0) fail(`${itemLabel} continued identity cannot supersede other records`);
    if (result.kind === 'new' && result.previousRef !== null) fail(`${itemLabel} new identity cannot have previousRef`);
    return result;
  }).sort((left, right) => compareCodePoints(left.recordRef, right.recordRef));
  unique(claims.map(claim => claim.recordRef), `${label} record refs`);
  return claims;
}

function normalizeSourceClaimLineage(value, label) {
  const lineage = array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    closed(item, ['previousRef', 'successorRefs'], itemLabel);
    const successorRefs = unique(array(item.successorRefs, `${itemLabel}.successorRefs`).map((ref, refIndex) => stableId(ref, `${itemLabel}.successorRefs[${refIndex}]`)), `${itemLabel}.successorRefs`).sort();
    if (successorRefs.length === 0) fail(`${itemLabel}.successorRefs must not be empty`);
    return {
      previousRef: stableId(item.previousRef, `${itemLabel}.previousRef`),
      successorRefs,
    };
  }).sort((left, right) => compareCodePoints(left.previousRef, right.previousRef));
  unique(lineage.map(item => item.previousRef), `${label} previous refs`);
  return lineage;
}

function normalizeProposal(value) {
  closed(value, [
    'schemaVersion', 'kind', 'id', 'name', 'status', 'owner', 'consumerDomains', 'base',
    'provenance', 'purpose', 'users', 'capabilities', 'gaps', 'sourceClaims',
    'identityClaims', 'sourceClaimLineage',
  ], 'proposal');
  if (value.schemaVersion !== '1.0' || value.kind !== 'product-model-proposal') fail('Proposal must use product-model-proposal schema 1.0');
  closed(value.provenance, ['producer', 'method'], 'proposal.provenance');
  if (value.provenance.producer !== 'refine-design' || value.provenance.method !== 'semantic-parse') fail('Proposal provenance must identify the refine-design semantic parse');
  return {
    schemaVersion: '1.0',
    kind: 'product-model-proposal',
    id: stableId(value.id, 'proposal.id'),
    name: text(value.name, 'proposal.name'),
    status: choice(value.status, modelStatuses, 'proposal.status'),
    owner: normalizeOwner(value.owner, 'proposal.owner'),
    consumerDomains: normalizeConsumerDomains(value.consumerDomains, 'proposal.consumerDomains'),
    base: normalizeBase(value.base, 'proposal.base'),
    provenance: {producer: 'refine-design', method: 'semantic-parse'},
    purpose: normalizePurpose(value.purpose, 'proposal.purpose'),
    users: array(value.users, 'proposal.users').map((item, index) => normalizeUser(item, `proposal.users[${index}]`)).sort((left, right) => compareCodePoints(left.id, right.id)),
    capabilities: array(value.capabilities, 'proposal.capabilities').map((item, index) => normalizeCapability(item, `proposal.capabilities[${index}]`)).sort((left, right) => compareCodePoints(left.id, right.id)),
    gaps: array(value.gaps, 'proposal.gaps').map((item, index) => normalizeGap(item, `proposal.gaps[${index}]`)).sort((left, right) => compareCodePoints(left.id, right.id)),
    sourceClaims: value.sourceClaims,
    identityClaims: normalizeIdentityClaims(value.identityClaims, 'proposal.identityClaims'),
    sourceClaimLineage: normalizeSourceClaimLineage(value.sourceClaimLineage, 'proposal.sourceClaimLineage'),
  };
}

function recordMaterialProjection(kind, record, supersedesRefs) {
  const common = {
    id: record.id,
    kind,
    status: record.status,
    owner: record.owner,
    consumerDomains: record.consumerDomains,
    supersedesRefs,
  };
  if (kind === 'purpose') return {...common, summary: record.summary};
  if (kind === 'user') return {...common, name: record.name, description: record.description};
  if (kind === 'capability') return {
    ...common, name: record.name, description: record.description, outcome: record.outcome,
    userRefs: record.userRefs, relatedCapabilityRefs: record.relatedCapabilityRefs,
  };
  return {
    ...common, gapKind: record.kind, question: record.question, impact: record.impact,
    capabilityRefs: record.capabilityRefs,
  };
}

function materialHash(value) {
  return sha256(Buffer.from(stableJson(value)));
}

function semanticMap(model) {
  return new Map(semanticRecords(model).map(item => [item.record.id, item]));
}

function unclassifiedMaterial(sourceClaims) {
  return sourceClaims
    .filter(claim => claim.disposition === 'unclassified')
    .map(claim => ({summary: claim.summary, sourceSegmentSha256: claim.sourceSegmentSha256}))
    .sort((left, right) => compareCodePoints(left.sourceSegmentSha256, right.sourceSegmentSha256) || compareCodePoints(left.summary, right.summary));
}

function rootMaterialProjection(model) {
  return {
    id: model.id,
    kind: 'product',
    name: model.name,
    status: model.status,
    owner: model.owner,
    consumerDomains: model.consumerDomains,
    supersedesRefs: [],
    unclassifiedClaims: unclassifiedMaterial(model.sourceClaims),
  };
}

function currentRecordDescriptor(model, id) {
  if (id === model.id) return {kind: 'product', record: model};
  return semanticMap(model).get(id) ?? null;
}

function validateIdentityClaims(proposal, current) {
  const candidate = semanticMap(proposal);
  const assertions = new Map(proposal.identityClaims.map(claim => [claim.recordRef, claim]));
  if (assertions.size !== candidate.size) fail('identityClaims must contain exactly one assertion for every semantic record');
  for (const id of candidate.keys()) if (!assertions.has(id)) fail(`identityClaims is missing semantic record ${id}`);
  for (const id of assertions.keys()) if (!candidate.has(id)) fail(`identityClaims references non-semantic record ${id}`);

  if (!current) {
    for (const claim of assertions.values()) {
      if (claim.kind !== 'new' || claim.supersedesRefs.length !== 0) fail(`Initial identity claim ${claim.recordRef} must be new without predecessors`);
    }
    return new Map([...assertions].map(([id, claim]) => [id, claim.supersedesRefs]));
  }

  const previous = semanticMap(current);
  if (proposal.purpose.id !== current.purpose.id) fail('The purpose record must preserve its stable identity');
  for (const [id, previousItem] of previous) {
    const nextItem = candidate.get(id);
    if (!nextItem) fail(`Previous semantic record ${id} must remain as an active record or superseded tombstone`);
    if (nextItem.kind !== previousItem.kind) fail(`Semantic record ${id} cannot change kind`);
    if (previousItem.record.status === 'superseded' && nextItem.record.status !== 'superseded') fail(`Superseded semantic record ${id} cannot be reactivated`);
  }

  const priorIndex = new Map(current.recordIndex.map(entry => [entry.id, entry]));
  const supersession = new Map();
  for (const [id, item] of candidate) {
    const assertion = assertions.get(id);
    const previousItem = previous.get(id);
    if (previousItem) {
      if (assertion.kind !== 'continued') fail(`Existing semantic record ${id} requires a continued identity assertion`);
      supersession.set(id, [...priorIndex.get(id).supersedesRefs]);
      continue;
    }
    if (assertion.kind !== 'new') fail(`New semantic record ${id} requires a new identity assertion`);
    for (const predecessor of assertion.supersedesRefs) {
      const prior = previous.get(predecessor);
      const retained = candidate.get(predecessor);
      if (!prior || !retained) fail(`New semantic record ${id} supersedes unknown predecessor ${predecessor}`);
      if (retained.record.status !== 'superseded') fail(`Superseded predecessor ${predecessor} must remain as a superseded tombstone`);
      if (prior.kind !== item.kind) fail(`Semantic record ${id} cannot supersede ${predecessor} across record kinds`);
    }
    supersession.set(id, [...assertion.supersedesRefs]);
  }
  return supersession;
}

function buildSourceClaimChangeSet(current, claims, lineage) {
  if (!current) return claims.map(claim => ({id: claim.id, classification: 'introduced', previousRefs: []}));
  const previousIds = new Set(current.sourceClaims.map(claim => claim.id));
  const currentIds = new Set(claims.map(claim => claim.id));
  const lineageByPrevious = new Map(lineage.map(item => [item.previousRef, item.successorRefs]));
  for (const previousId of previousIds) {
    if (!currentIds.has(previousId) && !lineageByPrevious.has(previousId)) fail(`sourceClaimLineage must account for removed source claim ${previousId}`);
    if (currentIds.has(previousId) && lineageByPrevious.has(previousId)) fail(`Retained source claim ${previousId} must not have a lineage entry`);
  }
  for (const [previousId, successors] of lineageByPrevious) {
    if (!previousIds.has(previousId)) fail(`sourceClaimLineage references unknown prior claim ${previousId}`);
    for (const successor of successors) if (!currentIds.has(successor)) fail(`sourceClaimLineage references missing successor claim ${successor}`);
  }
  const predecessorMap = new Map(claims.map(claim => [claim.id, previousIds.has(claim.id) ? [claim.id] : []]));
  for (const [previousId, successors] of lineageByPrevious) {
    for (const successor of successors) predecessorMap.get(successor).push(previousId);
  }
  return claims.map(claim => {
    const previousRefs = [...new Set(predecessorMap.get(claim.id))].sort();
    const classification = previousRefs.length === 0
      ? 'introduced'
      : previousRefs.length === 1 && previousRefs[0] === claim.id ? 'retained' : 'succeeded';
    return {id: claim.id, classification, previousRefs};
  });
}

function normalizeAuthority(value) {
  if (value === undefined || value === null) return [];
  closed(value, ['schemaVersion', 'kind', 'grants'], 'authority');
  if (value.schemaVersion !== '1.0' || value.kind !== 'product-lock-authority') fail('Lock authority must use product-lock-authority schema 1.0');
  const grants = array(value.grants, 'authority.grants').map((grant, index) => {
    const label = `authority.grants[${index}]`;
    closed(grant, ['recordRef', 'owner', 'instruction'], label);
    return {
      recordRef: stableId(grant.recordRef, `${label}.recordRef`),
      owner: normalizeOwner(grant.owner, `${label}.owner`),
      instruction: text(grant.instruction, `${label}.instruction`),
    };
  }).sort((left, right) => compareCodePoints(left.recordRef, right.recordRef));
  unique(grants.map(grant => grant.recordRef), 'authority grant record refs');
  return grants;
}

function consumeLockAuthority(current, candidateDescriptors, recordIndex, grants) {
  const previousIndex = new Map(current?.recordIndex.map(entry => [entry.id, entry]) ?? []);
  const grantMap = new Map(grants.map(grant => [grant.recordRef, grant]));
  const used = [];
  for (const entry of recordIndex) {
    const previous = previousIndex.get(entry.id);
    const enteringLock = entry.status === 'locked' && previous?.status !== 'locked';
    const changesLock = previous?.status === 'locked' && previous.materialSha256 !== entry.materialSha256;
    const changesOwner = previous !== undefined && previous.owner !== entry.owner;
    const changesLineage = previous !== undefined
      && JSON.stringify(previous.supersedesRefs) !== JSON.stringify(entry.supersedesRefs);
    const supersedesExisting = previous !== undefined
      && previous.status !== 'superseded' && entry.status === 'superseded';
    if (!enteringLock && !changesLock && !changesOwner && !changesLineage && !supersedesExisting) continue;
    const requiredOwner = previous?.owner ?? candidateDescriptors.get(entry.id).record.owner;
    const grant = grantMap.get(entry.id);
    if (!grant || grant.owner !== requiredOwner) fail(`Record ${entry.id} requires explicit lock authority from current owner ${requiredOwner}`);
    used.push(grant);
  }
  if (used.length !== grants.length) {
    const usedRefs = new Set(used.map(grant => grant.recordRef));
    const unused = grants.find(grant => !usedRefs.has(grant.recordRef));
    fail(`Lock authority grant for ${unused.recordRef} was not required by this transaction`);
  }
  return used;
}

function normalizeSource(value, label) {
  closed(value, ['id', 'label', 'path', 'sha256', 'byteLength', 'lineCount', 'revision', 'previousSha256'], label);
  if (stableId(value.id, `${label}.id`) !== 'product-description') fail(`${label}.id must be product-description`);
  const source = {
    id: 'product-description',
    label: safeRelativeLabel(value.label, `${label}.label`),
    path: assertSafeStoredPath(value.path, `${label}.path`),
    sha256: assertSha256(value.sha256, `${label}.sha256`),
    byteLength: positiveInteger(value.byteLength, `${label}.byteLength`),
    lineCount: positiveInteger(value.lineCount, `${label}.lineCount`),
    revision: positiveInteger(value.revision, `${label}.revision`),
    previousSha256: value.previousSha256 === null ? null : assertSha256(value.previousSha256, `${label}.previousSha256`),
  };
  if (source.path !== `sources/${source.sha256}/product-description.md`) fail(`${label}.path must be content-addressed by its source SHA-256`);
  if (source.byteLength > PRODUCT_MODEL_MAX_INPUT_BYTES) fail(`${label}.byteLength exceeds the ${PRODUCT_MODEL_MAX_INPUT_BYTES}-byte limit`);
  if (source.lineCount > PRODUCT_MODEL_MAX_SOURCE_LINES) fail(`${label}.lineCount exceeds the ${PRODUCT_MODEL_MAX_SOURCE_LINES}-line limit`);
  if (source.revision === 1 && source.previousSha256 !== null) fail(`${label}.previousSha256 must be null at source revision 1`);
  if (source.revision > 1 && source.previousSha256 === null) fail(`${label}.previousSha256 is required after source revision 1`);
  return source;
}

function sourceFromBytes(sourceBytes, sourceLabel, current) {
  const ranges = sourceLineRanges(sourceBytes);
  const digest = sha256(sourceBytes);
  if (current && digest === current.source.sha256) {
    if (safeRelativeLabel(sourceLabel, 'sourceLabel') !== current.source.label) fail('An unchanged source must preserve its portable source label');
    return {source: current.source, ranges};
  }
  return {
    source: normalizeSource({
      id: 'product-description',
      label: safeRelativeLabel(sourceLabel, 'sourceLabel'),
      path: `sources/${digest}/product-description.md`,
      sha256: digest,
      byteLength: sourceBytes.length,
      lineCount: ranges.length,
      revision: current ? current.source.revision + 1 : 1,
      previousSha256: current ? current.source.sha256 : null,
    }, 'productModel.source'),
    ranges,
  };
}

function proposalSemanticProjection(value) {
  return {
    id: value.id,
    name: value.name,
    status: value.status,
    owner: value.owner,
    consumerDomains: value.consumerDomains,
    provenance: value.provenance,
    purpose: value.purpose,
    users: value.users,
    capabilities: value.capabilities,
    gaps: value.gaps,
    sourceClaims: value.sourceClaims,
  };
}

function proposalMatchesCurrent(candidate, current, source) {
  return source.sha256 === current.source.sha256
    && source.label === current.source.label
    && JSON.stringify(proposalSemanticProjection(candidate)) === JSON.stringify(proposalSemanticProjection(current));
}

function recordDescriptors(candidate, supersession) {
  const result = new Map();
  const rootClaimRefs = candidate.sourceClaims.filter(claim => claim.disposition === 'unclassified').map(claim => claim.id).sort();
  result.set(candidate.id, {
    kind: 'product', record: candidate, supersedesRefs: [], claimRefs: rootClaimRefs,
    projection: rootMaterialProjection(candidate),
  });
  for (const {kind, record} of semanticRecords(candidate)) {
    const supersedesRefs = supersession.get(record.id) ?? [];
    result.set(record.id, {
      kind, record, supersedesRefs, claimRefs: record.provenance.sourceClaimRefs,
      projection: recordMaterialProjection(kind, record, supersedesRefs),
    });
  }
  return result;
}

function buildRecordState(candidate, current, revision, supersession) {
  const descriptors = recordDescriptors(candidate, supersession);
  const previousIndex = new Map(current?.recordIndex.map(entry => [entry.id, entry]) ?? []);
  const recordIndex = [];
  const changes = [];
  for (const [id, descriptor] of [...descriptors].sort(([left], [right]) => compareCodePoints(left, right))) {
    const previous = previousIndex.get(id);
    const digest = materialHash(descriptor.projection);
    const classification = !previous ? 'introduced' : previous.materialSha256 === digest ? 'unchanged' : 'changed';
    const materialSource = classification === 'unchanged'
      ? previous.materialSource
      : {
        revision: candidate.source.revision,
        sourceSha256: candidate.source.sha256,
        claimRefs: [...descriptor.claimRefs],
      };
    recordIndex.push({
      id,
      kind: descriptor.kind,
      status: descriptor.record.status,
      owner: descriptor.record.owner,
      introducedRevision: previous?.introducedRevision ?? revision,
      materialSha256: digest,
      materialSource,
      supersedesRefs: [...descriptor.supersedesRefs],
    });
    changes.push({
      id,
      kind: descriptor.kind,
      classification,
      previousStatus: previous?.status ?? null,
      status: descriptor.record.status,
      previousMaterialSha256: previous?.materialSha256 ?? null,
      materialSha256: digest,
    });
  }
  return {descriptors, recordIndex, changes};
}

function aggregateMaterialSha256(recordIndex) {
  return materialHash(recordIndex.map(({id, kind, materialSha256}) => ({id, kind, materialSha256})));
}

function recordIndexSha256(recordIndex) {
  return sha256(Buffer.from(stableJson(recordIndex)));
}

function buildCandidate(proposal, sourceBytes, sourceLabel, current, grants) {
  const revision = current ? current.revision + 1 : 1;
  const {source, ranges} = sourceFromBytes(sourceBytes, sourceLabel, current);
  const candidate = {
    ...proposal,
    revision,
    source,
    sourceClaims: normalizeSourceClaims(proposal.sourceClaims, ranges, sourceBytes),
  };
  delete candidate.base;
  delete candidate.identityClaims;
  delete candidate.sourceClaimLineage;
  validateRecordGraph(candidate);
  validateCompleteness(candidate);
  const supersession = validateIdentityClaims(proposal, current);
  const sourceClaimChanges = buildSourceClaimChangeSet(current, candidate.sourceClaims, proposal.sourceClaimLineage);
  const {descriptors, recordIndex, changes} = buildRecordState(candidate, current, revision, supersession);
  const receipts = consumeLockAuthority(current, descriptors, recordIndex, grants);
  const classification = !current ? 'initial' : changes.every(change => change.classification === 'unchanged') ? 'source-only' : 'material';
  return {
    schemaVersion: '1.0',
    kind: 'product-model',
    id: candidate.id,
    name: candidate.name,
    revision,
    status: candidate.status,
    owner: candidate.owner,
    consumerDomains: candidate.consumerDomains,
    source,
    parent: current ? {revision: current.revision, sha256: current.__contentSha256} : null,
    provenance: candidate.provenance,
    purpose: candidate.purpose,
    users: candidate.users,
    capabilities: candidate.capabilities,
    gaps: candidate.gaps,
    sourceClaims: candidate.sourceClaims,
    materialSha256: aggregateMaterialSha256(recordIndex),
    recordIndex,
    changeSet: {classification, records: changes, sourceClaims: sourceClaimChanges},
    authorityReceipts: receipts,
  };
}

function normalizeParent(value, label) {
  if (value === null) return null;
  closed(value, ['revision', 'sha256'], label);
  return {
    revision: positiveInteger(value.revision, `${label}.revision`),
    sha256: assertSha256(value.sha256, `${label}.sha256`),
  };
}

function normalizeMaterialSource(value, label) {
  closed(value, ['revision', 'sourceSha256', 'claimRefs'], label);
  return {
    revision: positiveInteger(value.revision, `${label}.revision`),
    sourceSha256: assertSha256(value.sourceSha256, `${label}.sourceSha256`),
    claimRefs: unique(array(value.claimRefs, `${label}.claimRefs`).map((ref, index) => stableId(ref, `${label}.claimRefs[${index}]`)), `${label}.claimRefs`).sort(),
  };
}

function normalizeRecordIndex(value, modelRevision) {
  const result = array(value, 'productModel.recordIndex').map((entry, index) => {
    const label = `productModel.recordIndex[${index}]`;
    closed(entry, ['id', 'kind', 'status', 'owner', 'introducedRevision', 'materialSha256', 'materialSource', 'supersedesRefs'], label);
    const normalized = {
      id: stableId(entry.id, `${label}.id`),
      kind: choice(entry.kind, recordKinds, `${label}.kind`),
      status: text(entry.status, `${label}.status`),
      owner: normalizeOwner(entry.owner, `${label}.owner`),
      introducedRevision: positiveInteger(entry.introducedRevision, `${label}.introducedRevision`),
      materialSha256: assertSha256(entry.materialSha256, `${label}.materialSha256`),
      materialSource: normalizeMaterialSource(entry.materialSource, `${label}.materialSource`),
      supersedesRefs: unique(array(entry.supersedesRefs, `${label}.supersedesRefs`).map((ref, refIndex) => stableId(ref, `${label}.supersedesRefs[${refIndex}]`)), `${label}.supersedesRefs`).sort(),
    };
    if (normalized.introducedRevision > modelRevision) fail(`${label}.introducedRevision cannot exceed the model revision`);
    return normalized;
  }).sort((left, right) => compareCodePoints(left.id, right.id));
  unique(result.map(entry => entry.id), 'productModel.recordIndex ids');
  return result;
}

function normalizeRecordChanges(value) {
  const result = array(value, 'productModel.changeSet.records').map((entry, index) => {
    const label = `productModel.changeSet.records[${index}]`;
    closed(entry, ['id', 'kind', 'classification', 'previousStatus', 'status', 'previousMaterialSha256', 'materialSha256'], label);
    const classification = choice(entry.classification, changeClasses, `${label}.classification`);
    const normalized = {
      id: stableId(entry.id, `${label}.id`),
      kind: choice(entry.kind, recordKinds, `${label}.kind`),
      classification,
      previousStatus: entry.previousStatus === null ? null : choice(entry.previousStatus, anyRecordStatuses, `${label}.previousStatus`),
      status: text(entry.status, `${label}.status`),
      previousMaterialSha256: entry.previousMaterialSha256 === null ? null : assertSha256(entry.previousMaterialSha256, `${label}.previousMaterialSha256`),
      materialSha256: assertSha256(entry.materialSha256, `${label}.materialSha256`),
    };
    const introduced = classification === 'introduced';
    if (introduced !== (normalized.previousStatus === null && normalized.previousMaterialSha256 === null)) fail(`${label} previous values must be null only for introduced records`);
    if (!introduced && (normalized.previousStatus === null || normalized.previousMaterialSha256 === null)) fail(`${label} previous values are required for existing records`);
    if (classification === 'unchanged' && normalized.previousMaterialSha256 !== normalized.materialSha256) fail(`${label} unchanged material digests must match`);
    if (classification === 'changed' && normalized.previousMaterialSha256 === normalized.materialSha256) fail(`${label} changed material digests must differ`);
    return normalized;
  }).sort((left, right) => compareCodePoints(left.id, right.id));
  unique(result.map(entry => entry.id), 'productModel.changeSet.records ids');
  return result;
}

function normalizeClaimChanges(value) {
  const result = array(value, 'productModel.changeSet.sourceClaims').map((entry, index) => {
    const label = `productModel.changeSet.sourceClaims[${index}]`;
    closed(entry, ['id', 'classification', 'previousRefs'], label);
    const normalized = {
      id: stableId(entry.id, `${label}.id`),
      classification: choice(entry.classification, claimChangeClasses, `${label}.classification`),
      previousRefs: unique(array(entry.previousRefs, `${label}.previousRefs`).map((ref, refIndex) => stableId(ref, `${label}.previousRefs[${refIndex}]`)), `${label}.previousRefs`).sort(),
    };
    if (normalized.classification === 'introduced' && normalized.previousRefs.length !== 0) fail(`${label} introduced claims cannot name predecessors`);
    if (normalized.classification === 'retained' && (normalized.previousRefs.length !== 1 || normalized.previousRefs[0] !== normalized.id)) fail(`${label} retained claims must name themselves as predecessor`);
    if (normalized.classification === 'succeeded' && normalized.previousRefs.length === 0) fail(`${label} succeeded claims must name predecessors`);
    return normalized;
  }).sort((left, right) => compareCodePoints(left.id, right.id));
  unique(result.map(entry => entry.id), 'productModel.changeSet.sourceClaims ids');
  return result;
}

function normalizeReceipts(value) {
  const receipts = array(value, 'productModel.authorityReceipts').map((receipt, index) => {
    const label = `productModel.authorityReceipts[${index}]`;
    closed(receipt, ['recordRef', 'owner', 'instruction'], label);
    return {
      recordRef: stableId(receipt.recordRef, `${label}.recordRef`),
      owner: normalizeOwner(receipt.owner, `${label}.owner`),
      instruction: text(receipt.instruction, `${label}.instruction`),
    };
  }).sort((left, right) => compareCodePoints(left.recordRef, right.recordRef));
  unique(receipts.map(receipt => receipt.recordRef), 'productModel.authorityReceipts record refs');
  return receipts;
}

function materialSourceFor(model, entry) {
  const descriptor = currentRecordDescriptor(model, entry.id);
  const claimRefs = entry.kind === 'product'
    ? model.sourceClaims.filter(claim => claim.disposition === 'unclassified').map(claim => claim.id).sort(compareCodePoints)
    : descriptor.record.provenance.sourceClaimRefs;
  return {
    revision: model.source.revision,
    sourceSha256: model.source.sha256,
    claimRefs: [...claimRefs],
  };
}

function authorityOwnerForTransition(previous, entry) {
  const enteringLock = entry.status === 'locked' && previous?.status !== 'locked';
  const changesLock = previous?.status === 'locked' && previous.materialSha256 !== entry.materialSha256;
  const changesOwner = previous !== undefined && previous.owner !== entry.owner;
  const changesLineage = previous !== undefined
    && JSON.stringify(previous.supersedesRefs) !== JSON.stringify(entry.supersedesRefs);
  const supersedesExisting = previous !== undefined
    && previous.status !== 'superseded' && entry.status === 'superseded';
  return enteringLock || changesLock || changesOwner || changesLineage || supersedesExisting
    ? previous?.owner ?? entry.owner
    : null;
}

function validateAuthorityReceiptsAgainstParent(model, parent) {
  const previousIndex = new Map(parent?.recordIndex.map(entry => [entry.id, entry]) ?? []);
  const receipts = new Map(model.authorityReceipts.map(receipt => [receipt.recordRef, receipt]));
  const required = new Map();
  for (const entry of model.recordIndex) {
    const owner = authorityOwnerForTransition(previousIndex.get(entry.id), entry);
    if (owner !== null) required.set(entry.id, owner);
  }
  if (receipts.size !== required.size) fail('productModel.authorityReceipts must exactly account for authority consumed by this model transition');
  for (const [recordRef, owner] of required) {
    const receipt = receipts.get(recordRef);
    if (!receipt || receipt.owner !== owner) fail(`productModel.authorityReceipts does not prove required authority for record ${recordRef} from owner ${owner}`);
  }
}

function validateSourceClaimChangesAgainstParent(model, parent) {
  const parentIds = new Set(parent?.sourceClaims.map(claim => claim.id) ?? []);
  const currentIds = new Set(model.sourceClaims.map(claim => claim.id));
  const predecessorUses = new Map([...parentIds].map(id => [id, []]));
  for (const change of model.changeSet.sourceClaims) {
    for (const previousRef of change.previousRefs) {
      if (!parentIds.has(previousRef)) fail(`Source-claim change ${change.id} references claim ${previousRef} outside its exact parent`);
      predecessorUses.get(previousRef).push(change.id);
    }
    const retained = parentIds.has(change.id);
    const expectedClassification = change.previousRefs.length === 0
      ? 'introduced'
      : change.previousRefs.length === 1 && change.previousRefs[0] === change.id ? 'retained' : 'succeeded';
    if (change.classification !== expectedClassification) fail(`Source-claim change ${change.id} classification does not match its exact-parent lineage`);
    if (retained && !change.previousRefs.includes(change.id)) fail(`Retained source claim ${change.id} must name itself as an exact-parent predecessor`);
    if (!retained && change.previousRefs.includes(change.id)) fail(`New source claim ${change.id} cannot name itself as an exact-parent predecessor`);
  }
  for (const previousId of parentIds) {
    const uses = predecessorUses.get(previousId);
    if (currentIds.has(previousId)) {
      if (uses.length !== 1 || uses[0] !== previousId) fail(`Retained source claim ${previousId} cannot also declare successor lineage`);
    } else if (uses.length === 0) {
      fail(`Removed source claim ${previousId} has no successor lineage in the child model`);
    }
  }
}

function validateRecordChangesAgainstParent(model, parent) {
  const previousIndex = new Map(parent?.recordIndex.map(entry => [entry.id, entry]) ?? []);
  const currentIndex = new Map(model.recordIndex.map(entry => [entry.id, entry]));
  const changes = new Map(model.changeSet.records.map(change => [change.id, change]));

  for (const previous of previousIndex.values()) {
    const entry = currentIndex.get(previous.id);
    if (!entry) fail(`Child product model removed exact-parent record ${previous.id}`);
    if (entry.kind !== previous.kind) fail(`Child product model changed exact-parent record kind for ${entry.id}`);
    if (entry.introducedRevision !== previous.introducedRevision) fail(`Child product model changed introduction revision for ${entry.id}`);
    if (previous.status === 'superseded' && entry.status !== 'superseded') fail(`Child product model reactivated superseded record ${entry.id}`);
    if (JSON.stringify(entry.supersedesRefs) !== JSON.stringify(previous.supersedesRefs)) fail(`Child product model changed established supersession lineage for ${entry.id}`);
  }

  for (const entry of model.recordIndex) {
    const previous = previousIndex.get(entry.id);
    const change = changes.get(entry.id);
    const expectedClassification = previous === undefined
      ? 'introduced'
      : previous.materialSha256 === entry.materialSha256 ? 'unchanged' : 'changed';
    if (change.classification !== expectedClassification) fail(`Record change ${entry.id} classification does not match its exact parent`);
    if (change.previousStatus !== (previous?.status ?? null)) fail(`Record change ${entry.id} previousStatus does not match its exact parent`);
    if (change.previousMaterialSha256 !== (previous?.materialSha256 ?? null)) fail(`Record change ${entry.id} previousMaterialSha256 does not match its exact parent`);
    if (previous === undefined) {
      if (entry.introducedRevision !== model.revision) fail(`Introduced record ${entry.id} must bind the child model revision`);
      for (const predecessorRef of entry.supersedesRefs) {
        const predecessor = previousIndex.get(predecessorRef);
        const retained = currentIndex.get(predecessorRef);
        if (!predecessor || !retained || predecessor.kind !== entry.kind || retained.status !== 'superseded') {
          fail(`Introduced record ${entry.id} has invalid exact-parent predecessor ${predecessorRef}`);
        }
      }
    }
    const expectedMaterialSource = expectedClassification === 'unchanged'
      ? previous.materialSource
      : materialSourceFor(model, entry);
    if (JSON.stringify(entry.materialSource) !== JSON.stringify(expectedMaterialSource)) {
      fail(`Record ${entry.id} materialSource does not match its exact model transition`);
    }
  }
}

function validateProductModelTransition(model, parent) {
  if (parent === null) {
    if (model.revision !== 1 || model.parent !== null) fail('Initial product model must be revision 1 without a parent');
    if (model.source.revision !== 1 || model.source.previousSha256 !== null) fail('Initial product source must be revision 1 without a previous source digest');
  } else {
    if (model.parent === null) fail('A child product model must bind its exact parent');
    if (model.id !== parent.id || model.revision !== parent.revision + 1 || model.parent.revision !== parent.revision) {
      fail('Child product-model identity or revision does not match its exact parent');
    }
    if (
      model.source.revision !== parent.source.revision + 1
      || model.source.previousSha256 !== parent.source.sha256
      || model.source.sha256 === parent.source.sha256
    ) {
      fail('Child product source revision or previous SHA-256 does not match its exact parent');
    }
  }
  validateRecordChangesAgainstParent(model, parent);
  validateSourceClaimChangesAgainstParent(model, parent);
  validateAuthorityReceiptsAgainstParent(model, parent);
}

function validateClaimCoverage(model) {
  unique(model.sourceClaims.map(claim => claim.id), 'productModel.sourceClaims ids');
  let expectedLine = 1;
  let expectedByte = 0;
  for (const claim of model.sourceClaims) {
    if (claim.startLine !== expectedLine) fail(`Product-model source claims must partition every source line; expected line ${expectedLine}`);
    if (claim.endLine > model.source.lineCount) fail(`Product-model source claim ${claim.id} has an invalid line range`);
    if (claim.sourceRange.startByte !== expectedByte || claim.sourceRange.endByteExclusive > model.source.byteLength) fail(`Product-model source claim ${claim.id} has a non-contiguous byte range`);
    expectedLine = claim.endLine + 1;
    expectedByte = claim.sourceRange.endByteExclusive;
  }
  if (expectedLine !== model.source.lineCount + 1 || expectedByte !== model.source.byteLength) fail('Product-model source claims must cover every source line and byte exactly once');
}

/** Validate and normalize a persisted product-model 1.0 document. */
export function validateProductModel(value) {
  closed(value, [
    'schemaVersion', 'kind', 'id', 'name', 'revision', 'status', 'owner', 'consumerDomains',
    'source', 'parent', 'provenance', 'purpose', 'users', 'capabilities', 'gaps',
    'sourceClaims', 'materialSha256', 'recordIndex', 'changeSet', 'authorityReceipts',
  ], 'productModel');
  if (value.schemaVersion !== '1.0' || value.kind !== 'product-model') fail('Product model must use product-model schema 1.0');
  closed(value.provenance, ['producer', 'method'], 'productModel.provenance');
  if (value.provenance.producer !== 'refine-design' || value.provenance.method !== 'semantic-parse') fail('Product model provenance must identify the refine-design semantic parse');
  const revision = positiveInteger(value.revision, 'productModel.revision');
  const model = {
    schemaVersion: '1.0', kind: 'product-model',
    id: stableId(value.id, 'productModel.id'),
    name: text(value.name, 'productModel.name'),
    revision,
    status: choice(value.status, modelStatuses, 'productModel.status'),
    owner: normalizeOwner(value.owner, 'productModel.owner'),
    consumerDomains: normalizeConsumerDomains(value.consumerDomains, 'productModel.consumerDomains'),
    source: normalizeSource(value.source, 'productModel.source'),
    parent: normalizeParent(value.parent, 'productModel.parent'),
    provenance: {producer: 'refine-design', method: 'semantic-parse'},
    purpose: normalizePurpose(value.purpose, 'productModel.purpose'),
    users: array(value.users, 'productModel.users').map((item, index) => normalizeUser(item, `productModel.users[${index}]`)).sort((left, right) => compareCodePoints(left.id, right.id)),
    capabilities: array(value.capabilities, 'productModel.capabilities').map((item, index) => normalizeCapability(item, `productModel.capabilities[${index}]`)).sort((left, right) => compareCodePoints(left.id, right.id)),
    gaps: array(value.gaps, 'productModel.gaps').map((item, index) => normalizeGap(item, `productModel.gaps[${index}]`)).sort((left, right) => compareCodePoints(left.id, right.id)),
    sourceClaims: array(value.sourceClaims, 'productModel.sourceClaims').map((item, index) => normalizePersistedClaim(item, `productModel.sourceClaims[${index}]`)).sort((left, right) => left.startLine - right.startLine || compareCodePoints(left.id, right.id)),
    materialSha256: assertSha256(value.materialSha256, 'productModel.materialSha256'),
    recordIndex: normalizeRecordIndex(value.recordIndex, revision),
    changeSet: null,
    authorityReceipts: normalizeReceipts(value.authorityReceipts),
  };
  closed(value.changeSet, ['classification', 'records', 'sourceClaims'], 'productModel.changeSet');
  model.changeSet = {
    classification: choice(value.changeSet.classification, modelChangeClasses, 'productModel.changeSet.classification'),
    records: normalizeRecordChanges(value.changeSet.records),
    sourceClaims: normalizeClaimChanges(value.changeSet.sourceClaims),
  };
  if ((revision === 1) !== (model.parent === null)) fail('Only product-model revision 1 may have a null parent');
  if (model.parent && model.parent.revision !== revision - 1) fail('Product-model parent must bind the immediately preceding revision');
  if (model.source.revision !== revision) fail('Product source revision must equal the product-model revision');
  validateClaimCoverage(model);
  validateRecordGraph(model);
  validateCompleteness(model);

  const byId = new Map(model.recordIndex.map(entry => [entry.id, entry]));
  const expectedIds = new Set([model.id, ...semanticRecords(model).map(item => item.record.id)]);
  if (byId.size !== expectedIds.size) fail('productModel.recordIndex must contain exactly every current product record');
  for (const id of expectedIds) if (!byId.has(id)) fail(`productModel.recordIndex is missing ${id}`);
  for (const entry of model.recordIndex) {
    const descriptor = currentRecordDescriptor(model, entry.id);
    if (!descriptor) fail(`productModel.recordIndex contains unknown record ${entry.id}`);
    const kind = entry.id === model.id ? 'product' : descriptor.kind;
    const record = entry.id === model.id ? model : descriptor.record;
    if (entry.kind !== kind || entry.status !== record.status || entry.owner !== record.owner) fail(`productModel.recordIndex metadata does not match record ${entry.id}`);
    const projection = kind === 'product' ? rootMaterialProjection(model) : recordMaterialProjection(kind, record, entry.supersedesRefs);
    if (entry.materialSha256 !== materialHash(projection)) fail(`productModel.recordIndex material digest does not match record ${entry.id}`);
    if (entry.materialSource.revision > model.source.revision) fail(`Record ${entry.id} material source revision exceeds the current source revision`);
    if (entry.id === model.id && entry.supersedesRefs.length !== 0) fail('The product-root record cannot supersede another record');
    for (const ref of entry.supersedesRefs) {
      const predecessor = byId.get(ref);
      if (!predecessor || predecessor.kind !== entry.kind || predecessor.status !== 'superseded') fail(`Record ${entry.id} has invalid superseded predecessor ${ref}`);
    }
  }
  if (model.materialSha256 !== aggregateMaterialSha256(model.recordIndex)) fail('productModel.materialSha256 does not match its record index');
  const changes = new Map(model.changeSet.records.map(entry => [entry.id, entry]));
  if (changes.size !== byId.size) fail('productModel.changeSet.records must account for every indexed record');
  for (const entry of model.recordIndex) {
    const change = changes.get(entry.id);
    if (!change || change.kind !== entry.kind || change.status !== entry.status || change.materialSha256 !== entry.materialSha256) fail(`productModel.changeSet does not match record ${entry.id}`);
  }
  const claimChanges = new Map(model.changeSet.sourceClaims.map(entry => [entry.id, entry]));
  if (claimChanges.size !== model.sourceClaims.length || model.sourceClaims.some(claim => !claimChanges.has(claim.id))) fail('productModel.changeSet.sourceClaims must account for every current source claim');
  const materialChanged = model.changeSet.records.some(change => change.classification !== 'unchanged');
  if (model.changeSet.classification === 'initial' && (model.parent !== null || model.changeSet.records.some(change => change.classification !== 'introduced'))) fail('An initial change set requires only introduced records and no parent');
  if (model.changeSet.classification === 'source-only' && (model.parent === null || materialChanged)) fail('A source-only change set requires a parent and unchanged record material');
  if (model.changeSet.classification === 'material' && (model.parent === null || !materialChanged)) fail('A material change set requires a parent and changed or introduced material');
  return model;
}

function normalizeSnapshotParent(value, label) {
  if (value === null) return null;
  closed(value, ['id', 'revision', 'sha256'], label);
  return {
    id: stableId(value.id, `${label}.id`),
    revision: positiveInteger(value.revision, `${label}.revision`),
    sha256: assertSha256(value.sha256, `${label}.sha256`),
  };
}

/** Validate and normalize a persisted product-snapshot 1.0 document. */
export function validateProductSnapshot(value) {
  closed(value, ['schemaVersion', 'kind', 'id', 'revision', 'parent', 'source', 'productModel', 'artifacts'], 'productSnapshot');
  if (value.schemaVersion !== '1.0' || value.kind !== 'product-snapshot') fail('Product snapshot must use product-snapshot schema 1.0');
  const revision = positiveInteger(value.revision, 'productSnapshot.revision');
  const id = stableId(value.id, 'productSnapshot.id');
  const parent = normalizeSnapshotParent(value.parent, 'productSnapshot.parent');
  const source = normalizeSource(value.source, 'productSnapshot.source');
  closed(value.productModel, ['id', 'revision', 'path', 'sha256', 'materialSha256', 'recordIndexSha256'], 'productSnapshot.productModel');
  const productModel = {
    id: stableId(value.productModel.id, 'productSnapshot.productModel.id'),
    revision: positiveInteger(value.productModel.revision, 'productSnapshot.productModel.revision'),
    path: assertSafeStoredPath(value.productModel.path, 'productSnapshot.productModel.path'),
    sha256: assertSha256(value.productModel.sha256, 'productSnapshot.productModel.sha256'),
    materialSha256: assertSha256(value.productModel.materialSha256, 'productSnapshot.productModel.materialSha256'),
    recordIndexSha256: assertSha256(value.productModel.recordIndexSha256, 'productSnapshot.productModel.recordIndexSha256'),
  };
  if (productModel.path !== `models/${productModel.revision}-${productModel.sha256}/product-model.json`) fail('productSnapshot.productModel.path must be content-addressed by its revision and SHA-256');
  if (id !== `${productModel.id}-snapshot`) fail('productSnapshot.id must be the stable product snapshot ID');
  if ((revision === 1) !== (parent === null)) fail('Only product snapshot revision 1 may have a null parent');
  if (parent && (parent.id !== id || parent.revision !== revision - 1)) fail('Product snapshot parent must bind the immediately preceding snapshot revision');
  return {
    schemaVersion: '1.0', kind: 'product-snapshot', id, revision, parent, source, productModel,
    artifacts: normalizeSnapshotArtifacts(value.artifacts),
  };
}

/** Validate and normalize a persisted product-current 1.0 pointer. */
export function validateCurrentPointer(value) {
  closed(value, ['schemaVersion', 'kind', 'snapshot'], 'current');
  if (value.schemaVersion !== '1.0' || value.kind !== 'product-current') fail('Current pointer must use product-current schema 1.0');
  closed(value.snapshot, ['id', 'revision', 'path', 'sha256'], 'current.snapshot');
  const snapshot = {
    id: stableId(value.snapshot.id, 'current.snapshot.id'),
    revision: positiveInteger(value.snapshot.revision, 'current.snapshot.revision'),
    path: assertSafeStoredPath(value.snapshot.path, 'current.snapshot.path'),
    sha256: assertSha256(value.snapshot.sha256, 'current.snapshot.sha256'),
  };
  if (snapshot.path !== `snapshots/${snapshot.sha256}/product-snapshot.json`) fail('current.snapshot.path must be content-addressed by its SHA-256');
  return {schemaVersion: '1.0', kind: 'product-current', snapshot};
}

function parseCanonical(bytes, validator, label) {
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
  const value = validator(parsed);
  if (stableJson(value) !== bytes.toString('utf8')) fail(`${label} is not in canonical byte form`);
  return value;
}

function verifySourceClaims(model, sourceBytes) {
  if (sourceBytes.length !== model.source.byteLength) fail('Snapshot source byte length does not match the source bytes');
  const lines = sourceLineRanges(sourceBytes);
  if (lines.length !== model.source.lineCount) fail('Snapshot source line count does not match the source bytes');
  for (const claim of model.sourceClaims) {
    const expectedStart = lines[claim.startLine - 1].start;
    const expectedEnd = lines[claim.endLine - 1].endExclusive;
    if (claim.sourceRange.startByte !== expectedStart || claim.sourceRange.endByteExclusive !== expectedEnd) fail(`Source claim ${claim.id} byte range does not match its line range`);
    const segment = sourceBytes.subarray(claim.sourceRange.startByte, claim.sourceRange.endByteExclusive);
    if (sha256(segment) !== claim.sourceSegmentSha256) fail(`Source claim ${claim.id} segment hash does not match the bound source`);
  }
}

function verifyProductModelAncestry(root, currentModel) {
  let child = currentModel;
  while (child.parent !== null) {
    const parentPath = `models/${child.parent.revision}-${child.parent.sha256}/product-model.json`;
    const parentArtifact = readBoundArtifact(root, parentPath, child.parent.sha256, 'parent product model');
    const parent = parseCanonical(parentArtifact.bytes, validateProductModel, 'Parent product model');
    validateProductModelTransition(child, parent);
    const parentSourceArtifact = readBoundArtifact(root, parent.source.path, parent.source.sha256, 'parent product source');
    verifySourceClaims(parent, parentSourceArtifact.bytes);
    child = parent;
  }
  validateProductModelTransition(child, null);
}

/**
 * Resolve and exact-byte verify the complete chain behind current.json.
 *
 * @param {string} currentPath - Path to the product store's current.json pointer.
 * @returns {CurrentProductChain} - Verified current, snapshot, model, source, and artifact bindings.
 * @throws {Error} When a path, canonical document, digest, lineage transition, or dependency binding is invalid.
 */
export function loadCurrentProduct(currentPath) {
  const absoluteCurrent = path.resolve(currentPath);
  const root = path.dirname(absoluteCurrent);
  ensureUnlinkedPath(absoluteCurrent, root);
  if (!fs.existsSync(absoluteCurrent) || !fs.statSync(absoluteCurrent).isFile()) fail('Current product pointer is missing');
  const currentBytes = fs.readFileSync(absoluteCurrent);
  const current = parseCanonical(currentBytes, validateCurrentPointer, 'Current pointer');
  const snapshotArtifact = readBoundArtifact(root, current.snapshot.path, current.snapshot.sha256, 'current snapshot');
  const snapshot = parseCanonical(snapshotArtifact.bytes, validateProductSnapshot, 'Persisted product snapshot');
  if (snapshot.id !== current.snapshot.id || snapshot.revision !== current.snapshot.revision) fail('Current pointer snapshot identity does not match the bound snapshot');

  const modelArtifact = readBoundArtifact(root, snapshot.productModel.path, snapshot.productModel.sha256, 'snapshot product model');
  const model = parseCanonical(modelArtifact.bytes, validateProductModel, 'Persisted product model');
  if (model.id !== snapshot.productModel.id || model.revision !== snapshot.productModel.revision) fail('Snapshot product-model identity does not match the bound model');
  if (model.materialSha256 !== snapshot.productModel.materialSha256) fail('Snapshot product-model material digest does not match the bound model');
  if (recordIndexSha256(model.recordIndex) !== snapshot.productModel.recordIndexSha256) fail('Snapshot record-index digest does not match the bound model');
  if (JSON.stringify(model.source) !== JSON.stringify(snapshot.source)) fail('Snapshot source binding does not match the product model');

  const sourceArtifact = readBoundArtifact(root, snapshot.source.path, snapshot.source.sha256, 'snapshot source');
  verifySourceClaims(model, sourceArtifact.bytes);
  verifyProductModelAncestry(root, model);
  if (snapshot.parent) {
    const parentPath = `snapshots/${snapshot.parent.sha256}/product-snapshot.json`;
    const parentArtifact = readBoundArtifact(root, parentPath, snapshot.parent.sha256, 'parent product snapshot');
    const parent = parseCanonical(parentArtifact.bytes, validateProductSnapshot, 'Parent product snapshot');
    if (parent.id !== snapshot.parent.id || parent.revision !== snapshot.parent.revision) fail('Product-snapshot parent binding has the wrong identity');
  }

  const expectedArtifacts = reclassifySnapshotArtifacts(snapshot.artifacts, model.recordIndex);
  if (JSON.stringify(expectedArtifacts) !== JSON.stringify(snapshot.artifacts)) fail('Product snapshot artifact dependency state is not current for its bound model');
  const artifacts = loadSnapshotArtifacts(root, snapshot.artifacts);
  return {
    root, current, currentBytes, snapshot, snapshotBytes: snapshotArtifact.bytes,
    model, modelBytes: modelArtifact.bytes, sourceBytes: sourceArtifact.bytes, artifacts,
  };
}

function exactDirectory(directory, expectedFile) {
  if (!fs.existsSync(directory)) return;
  if (!fs.statSync(directory).isDirectory()) fail(`Expected artifact directory: ${directory}`);
  const entries = fs.readdirSync(directory).sort();
  if (entries.length > 1 || (entries.length === 1 && entries[0] !== expectedFile)) fail(`Immutable artifact directory contains unexpected entries: ${directory}`);
}

function resultForExisting(chain) {
  return {
    schemaVersion: '1.0', productId: chain.model.id, revision: chain.model.revision,
    source: {path: chain.model.source.path, sha256: chain.model.source.sha256, created: false},
    productModel: {
      path: chain.snapshot.productModel.path, sha256: chain.snapshot.productModel.sha256,
      materialSha256: chain.model.materialSha256, created: false,
    },
    snapshot: {
      id: chain.snapshot.id, revision: chain.snapshot.revision,
      path: chain.current.snapshot.path, sha256: chain.current.snapshot.sha256, created: false,
    },
    current: {path: 'current.json', sha256: sha256(chain.currentBytes), changed: false},
  };
}

function persistProductModelLocked({proposalPath, sourcePath, sourceLabel, outputRoot, authority}, root) {
  const proposal = normalizeProposal(parseJsonFile(proposalPath, 'product-model proposal', PRODUCT_MODEL_MAX_INPUT_BYTES));
  const sourceBytes = readBoundedFile(sourcePath, PRODUCT_MODEL_MAX_INPUT_BYTES, 'product description');
  const currentPath = path.join(root, 'current.json');
  const chain = fs.existsSync(currentPath) ? loadCurrentProduct(currentPath) : null;
  const currentModel = chain?.model ?? null;

  const previewSource = sourceFromBytes(sourceBytes, sourceLabel, currentModel);
  const preview = {
    ...proposal,
    source: previewSource.source,
    sourceClaims: normalizeSourceClaims(proposal.sourceClaims, previewSource.ranges, sourceBytes),
  };
  validateRecordGraph(preview);
  validateCompleteness(preview);
  if (!chain && proposal.base !== null) fail('An initial product-model proposal must use base null');
  if (chain && proposal.base !== null && (
    proposal.base.snapshotSha256 !== chain.current.snapshot.sha256
    || proposal.base.modelSha256 !== chain.snapshot.productModel.sha256
    || proposal.base.revision !== chain.model.revision
  )) fail('Product-model proposal base does not match the exact current model and snapshot');
  if (chain && proposalMatchesCurrent(preview, chain.model, preview.source)) {
    if (sha256(fs.readFileSync(currentPath)) !== sha256(chain.currentBytes)) fail('Current pointer changed while checking an exact product-model replay');
    return resultForExisting(chain);
  }

  if (chain && preview.source.sha256 === chain.model.source.sha256) fail('Semantic product-model changes require changed exact source bytes');
  if (chain && proposal.base === null) fail('A changed product-model proposal must bind the exact current base');

  const grants = normalizeAuthority(authority);
  const currentForBuild = chain
    ? {...chain.model, __contentSha256: chain.snapshot.productModel.sha256}
    : null;
  const model = validateProductModel(buildCandidate(proposal, sourceBytes, sourceLabel, currentForBuild, grants));
  validateProductModelTransition(model, currentModel);
  const modelBytes = Buffer.from(stableJson(model));
  const modelSha256 = sha256(modelBytes);
  const modelStoredPath = `models/${model.revision}-${modelSha256}/product-model.json`;
  const artifacts = reclassifySnapshotArtifacts(chain?.snapshot.artifacts ?? [], model.recordIndex);
  const snapshotRevision = chain ? chain.snapshot.revision + 1 : 1;
  const snapshot = validateProductSnapshot({
    schemaVersion: '1.0', kind: 'product-snapshot', id: `${model.id}-snapshot`,
    revision: snapshotRevision,
    parent: chain ? {
      id: chain.snapshot.id,
      revision: chain.snapshot.revision,
      sha256: chain.current.snapshot.sha256,
    } : null,
    source: model.source,
    productModel: {
      id: model.id,
      revision: model.revision,
      path: modelStoredPath,
      sha256: modelSha256,
      materialSha256: model.materialSha256,
      recordIndexSha256: recordIndexSha256(model.recordIndex),
    },
    artifacts,
  });
  const snapshotBytes = Buffer.from(stableJson(snapshot));
  const snapshotSha256 = sha256(snapshotBytes);
  const snapshotStoredPath = `snapshots/${snapshotSha256}/product-snapshot.json`;
  const current = validateCurrentPointer({
    schemaVersion: '1.0', kind: 'product-current',
    snapshot: {id: snapshot.id, revision: snapshot.revision, path: snapshotStoredPath, sha256: snapshotSha256},
  });
  const currentBytes = Buffer.from(stableJson(current));

  const sourceFile = path.join(root, ...model.source.path.split('/'));
  const modelFile = path.join(root, ...modelStoredPath.split('/'));
  const snapshotFile = path.join(root, ...snapshotStoredPath.split('/'));
  exactDirectory(path.dirname(sourceFile), path.basename(sourceFile));
  exactDirectory(path.dirname(modelFile), path.basename(modelFile));
  exactDirectory(path.dirname(snapshotFile), path.basename(snapshotFile));
  const sourceCreated = writeImmutable(sourceFile, sourceBytes, root);
  const modelCreated = writeImmutable(modelFile, modelBytes, root);
  const snapshotCreated = writeImmutable(snapshotFile, snapshotBytes, root);
  const currentChanged = chain
    ? writeCurrentCompareAndSwap(currentPath, currentBytes, root, sha256(chain.currentBytes))
    : writeCurrentLast(currentPath, currentBytes, root);

  return {
    schemaVersion: '1.0', productId: model.id, revision: model.revision,
    source: {path: model.source.path, sha256: model.source.sha256, created: sourceCreated},
    productModel: {path: modelStoredPath, sha256: modelSha256, materialSha256: model.materialSha256, created: modelCreated},
    snapshot: {id: snapshot.id, revision: snapshot.revision, path: snapshotStoredPath, sha256: snapshotSha256, created: snapshotCreated},
    current: {path: 'current.json', sha256: sha256(currentBytes), changed: currentChanged},
  };
}

function preflightProductModelProposal(proposalPath) {
  const proposal = object(
    parseJsonFile(proposalPath, 'product-model proposal', PRODUCT_MODEL_MAX_INPUT_BYTES),
    'product-model proposal',
  );
  if (proposal.schemaVersion !== '1.0' || proposal.kind !== 'product-model-proposal') {
    fail('Proposal must use product-model-proposal schema 1.0');
  }
}

/**
 * Persist exact source bytes, a canonical model, a reclassified snapshot, and current.json last.
 *
 * @param {PersistProductModelOptions} options - Closed persistence inputs and optional lock authority.
 * @returns {PersistProductModelResult} - Exact bindings for the committed or replayed product revision.
 * @throws {Error} When input, identity, lineage, lock authority, storage, or current-base validation fails.
 */
export function persistProductModel(options) {
  preflightProductModelProposal(options.proposalPath);
  const root = path.resolve(options.outputRoot);
  return withProductStoreLock(root, () => persistProductModelLocked(options, root));
}

function parseCli(arguments_) {
  const options = {};
  const names = new Set(['--input', '--source', '--source-label', '--output-root', '--authority']);
  if (arguments_.length % 2 !== 0) fail(`Missing value for ${arguments_.at(-1)}`);
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    if (!names.has(flag)) fail(`Unknown option ${String(flag)}`);
    if (value === undefined || names.has(value)) fail(`Missing value for ${flag}`);
    if (Object.hasOwn(options, flag)) fail(`Repeated option ${flag}`);
    options[flag] = value;
  }
  for (const required of ['--input', '--source', '--source-label', '--output-root']) if (!Object.hasOwn(options, required)) fail(`Missing required option ${required}`);
  return options;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    const options = parseCli(process.argv.slice(2));
    const result = persistProductModel({
      proposalPath: options['--input'], sourcePath: options['--source'],
      sourceLabel: options['--source-label'], outputRoot: options['--output-root'],
      authority: options['--authority'] ? parseJsonFile(options['--authority'], 'lock authority', 64 * 1024) : undefined,
    });
    process.stdout.write(stableJson(result));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
