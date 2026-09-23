import crypto from 'node:crypto';
import {isPublicationPayload, validatePublicationPayload, validateResourceDescriptors, PUBLICATION_DOCUMENTS_MAX_BYTES, PUBLICATION_RESOURCES_MAX_BYTES} from './product-publication-payload.mjs';

export const PRODUCT_CONTEXT_SCHEMA_VERSION = '1.0';
export const PRODUCT_CONTEXT_MAX_BYTES = 2 * 1024 * 1024;
export const PRODUCT_CONTEXT_MAX_TEXT_LENGTH = 32_768;
export const PRODUCT_CONTEXT_MAX_ARRAY_LENGTH = 10_000;
export const PRODUCT_CONTEXT_MAX_JSON_DEPTH = 64;
export const PRODUCT_CONTEXT_MAX_JSON_NODES = 100_000;

/**
 * JSON data accepted in a persisted product artifact payload.
 *
 * @typedef {null | boolean | number | string | ProductContextJsonValue[] | {[key: string]: ProductContextJsonValue}} ProductContextJsonValue
 */

/**
 * Agent domain that owns a product record or artifact.
 *
 * @typedef {'product' | 'ux' | 'ui' | 'system-architecture' | 'data-model' | 'controller' | 'technical-documentation' | 'implementation-planning' | 'testing' | 'coding'} ProductOwner
 */

/**
 * Consumer domain allowed in an artifact audience.
 *
 * @typedef {'prd' | 'ux' | 'ui' | 'system-architecture' | 'data-model' | 'controller' | 'technical-documentation' | 'implementation-planning' | 'testing' | 'coding'} ProductConsumer
 */

/** @typedef {'accepted' | 'partial' | 'locked'} ProductStatus */
/** @typedef {'accepted' | 'locked'} ProductRecordStatus */
/** @typedef {'unresolved' | 'locked'} ProductGapStatus */
/** @typedef {'accepted' | 'partial' | 'locked' | 'superseded'} ProductArtifactStatus */

/**
 * Exact persisted source snapshot binding used by a PRD context.
 *
 * @typedef {object} ProductSourceSnapshot
 * @property {string} id
 * @property {number} revision
 * @property {string} sha256
 */

/**
 * Exact persisted product-model binding used by a PRD context.
 *
 * @typedef {object} ProductModelBinding
 * @property {string} id
 * @property {number} revision
 * @property {ProductStatus} status
 * @property {string} sha256
 * @property {string} materialSha256
 */

/**
 * Product purpose record included in a PRD context.
 *
 * @typedef {object} ProductPurposeRecord
 * @property {string} id
 * @property {string} summary
 * @property {ProductRecordStatus} status
 * @property {ProductOwner} owner
 * @property {string} materialSha256
 */

/**
 * Product user record included in a PRD context.
 *
 * @typedef {object} ProductUserRecord
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {ProductRecordStatus} status
 * @property {ProductOwner} owner
 * @property {string} materialSha256
 */

/**
 * Product capability record included in a PRD context.
 *
 * @typedef {object} ProductCapabilityRecord
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} outcome
 * @property {ProductRecordStatus} status
 * @property {ProductOwner} owner
 * @property {string} materialSha256
 */

/**
 * Unresolved or locked product gap included in a PRD context.
 *
 * @typedef {object} ProductGapRecord
 * @property {string} id
 * @property {'open-question' | 'missing-requirement' | 'ambiguity' | 'conflict'} kind
 * @property {string} question
 * @property {string} impact
 * @property {ProductGapStatus} status
 * @property {ProductOwner} owner
 * @property {string} materialSha256
 * @property {string[]} affectsRefs
 */

/**
 * Closed product projection included in a PRD context.
 *
 * @typedef {object} ProductContextProduct
 * @property {string} id
 * @property {string} name
 * @property {ProductStatus} status
 * @property {ProductOwner} owner
 * @property {string} materialSha256
 * @property {ProductPurposeRecord} purpose
 * @property {ProductUserRecord[]} users
 */

/**
 * Exact material binding from an artifact to a product record.
 *
 * @typedef {object} ProductRecordDependency
 * @property {string} id
 * @property {string} materialSha256
 */

/**
 * Exact revision and material binding from one artifact to another.
 *
 * @typedef {object} ProductArtifactDependency
 * @property {string} id
 * @property {number} revision
 * @property {string} materialSha256
 */

/**
 * Producer identity recorded in a product artifact.
 *
 * @typedef {object} ProductArtifactProducer
 * @property {string} id
 * @property {string} contractVersion
 * @property {string} method
 */

/**
 * Declared image file carried beside a detached context document.
 *
 * @typedef {object} ProductArtifactResource
 * @property {string} id - Stable artifact-local image asset ID.
 * @property {string} logicalPath - Safe relative path in the structured document.
 * @property {string} path - Content-addressed path relative to context.json.
 * @property {'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml'} mediaType
 * @property {number} byteLength
 * @property {string} sha256
 */

/**
 * Revision transition recorded in a product artifact.
 *
 * @typedef {object} ProductArtifactChange
 * @property {'added' | 'unchanged' | 'modified' | 'superseded'} kind
 * @property {number | null} previousRevision
 * @property {string | null} previousMaterialSha256
 */

/**
 * Closed Slice 2 product artifact envelope carried by a PRD context.
 *
 * @typedef {object} ProductArtifact
 * @property {'1.0'} schemaVersion
 * @property {'product-artifact'} kind
 * @property {string} id
 * @property {string} artifactKind
 * @property {ProductOwner} owner
 * @property {string} artifactSchemaVersion
 * @property {number} revision
 * @property {ProductArtifactStatus} status
 * @property {ProductConsumer[]} consumerDomains
 * @property {string[]} scopeRefs
 * @property {string[]} coverageRefs
 * @property {string[]} gapRefs
 * @property {string[]} lockRefs
 * @property {ProductRecordDependency[]} recordDependencies
 * @property {ProductArtifactDependency[]} artifactDependencies
 * @property {ProductArtifactProducer} producer
 * @property {ProductArtifactResource[]} resources
 * @property {ProductContextJsonValue} payload
 * @property {string} materialSha256
 * @property {ProductArtifactChange} change
 */

/**
 * Artifact fields that determine material identity.
 *
 * @typedef {object} ProductArtifactMaterial
 * @property {string} id
 * @property {string} artifactKind
 * @property {ProductOwner} owner
 * @property {string} artifactSchemaVersion
 * @property {ProductArtifactStatus} status
 * @property {ProductConsumer[]} consumerDomains
 * @property {string[]} scopeRefs
 * @property {string[]} coverageRefs
 * @property {string[]} gapRefs
 * @property {string[]} lockRefs
 * @property {ProductRecordDependency[]} recordDependencies
 * @property {ProductArtifactDependency[]} artifactDependencies
 * @property {ProductArtifactProducer} producer
 * @property {ProductArtifactResource[]} resources
 * @property {ProductContextJsonValue} payload
 */

/**
 * Lock projected from an included locked record or artifact.
 *
 * @typedef {object} ProductContextLock
 * @property {string} ref
 * @property {'product' | 'purpose' | 'user' | 'capability' | 'gap' | 'artifact'} kind
 * @property {ProductOwner} owner
 */

/**
 * Artifact omitted from the consumable context because it is unavailable.
 *
 * @typedef {object} ProductArtifactExclusion
 * @property {string} id
 * @property {string} artifactKind
 * @property {number} revision
 * @property {ProductArtifactStatus} status
 * @property {'stale' | 'locked-conflict' | 'superseded'} outcome
 * @property {string} materialSha256
 * @property {string[]} reasons
 */

/**
 * Source provenance repeated at the context boundary for downstream consumers.
 *
 * @typedef {object} ProductContextProvenance
 * @property {string} sourceId
 * @property {number} sourceRevision
 * @property {string} sourceSha256
 */

/**
 * Closed Slice 2 context consumed by deterministic PRD publication.
 * Validators reject missing or additional properties at every defined envelope.
 *
 * @typedef {object} ProductContext
 * @property {'1.0'} schemaVersion
 * @property {string} contextId
 * @property {'prd'} consumer
 * @property {ProductSourceSnapshot} sourceSnapshot
 * @property {ProductModelBinding} productModel
 * @property {string[]} scopeRefs
 * @property {ProductContextProduct} product
 * @property {ProductCapabilityRecord[]} capabilities
 * @property {ProductGapRecord[]} gaps
 * @property {ProductArtifact[]} artifacts
 * @property {ProductContextLock[]} locks
 * @property {ProductArtifactExclusion[]} exclusions
 * @property {ProductContextProvenance} provenance
 * @property {string} materialSha256
 */

/**
 * Product context fields that determine context identity.
 *
 * @typedef {object} ProductContextMaterial
 * @property {'1.0'} schemaVersion
 * @property {'prd'} consumer
 * @property {ProductSourceSnapshot} sourceSnapshot
 * @property {ProductModelBinding} productModel
 * @property {string[]} scopeRefs
 * @property {ProductContextProduct} product
 * @property {ProductCapabilityRecord[]} capabilities
 * @property {ProductGapRecord[]} gaps
 * @property {ProductArtifact[]} artifacts
 * @property {ProductContextLock[]} locks
 * @property {ProductArtifactExclusion[]} exclusions
 * @property {ProductContextProvenance} provenance
 */

const idPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const sha256Pattern = /^[0-9a-f]{64}$/u;
const semverPattern = /^[0-9]+\.[0-9]+(?:\.[0-9]+)?(?:-[a-z0-9.-]+)?$/u;
const consumerOrder = [
  'prd', 'ux', 'ui', 'system-architecture', 'data-model', 'controller',
  'technical-documentation', 'implementation-planning', 'testing', 'coding',
];
const productStatuses = new Set(['accepted', 'partial', 'locked']);
const recordStatuses = new Set(['accepted', 'locked']);
const gapStatuses = new Set(['unresolved', 'locked']);
const artifactStatuses = new Set(['accepted', 'partial', 'locked']);
const persistedArtifactStatuses = new Set([...artifactStatuses, 'superseded']);
const artifactChangeKinds = new Set(['added', 'unchanged', 'modified', 'superseded']);
const exclusionOutcomes = new Set(['stale', 'locked-conflict', 'superseded']);
const gapKinds = new Set(['open-question', 'missing-requirement', 'ambiguity', 'conflict']);
const lockKinds = new Set(['product', 'purpose', 'user', 'capability', 'gap', 'artifact']);
const owners = new Set([
  'product', 'ux', 'ui', 'system-architecture', 'data-model', 'controller',
  'technical-documentation', 'implementation-planning', 'testing', 'coding',
]);

function fail(message) { throw new Error(message); }

function compareCodePoints(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function object(value, label, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`${label} must contain exactly: ${expected.join(', ')}`);
  }
}

function text(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.length > PRODUCT_CONTEXT_MAX_TEXT_LENGTH) {
    fail(`${label} must be non-empty text no longer than ${PRODUCT_CONTEXT_MAX_TEXT_LENGTH} characters`);
  }
  if (value.includes('\u0000')) fail(`${label} must not contain a null character`);
  return value;
}

function id(value, label) {
  text(value, label);
  if (value.length > 80 || !idPattern.test(value)) fail(`${label} must be a lowercase hyphenated ID no longer than 80 characters`);
  return value;
}

function sha256(value, label) {
  if (typeof value !== 'string' || !sha256Pattern.test(value)) fail(`${label} must be a lowercase SHA-256 digest`);
  return value;
}

function array(value, label) {
  if (!Array.isArray(value) || value.length > PRODUCT_CONTEXT_MAX_ARRAY_LENGTH) {
    fail(`${label} must be an array with at most ${PRODUCT_CONTEXT_MAX_ARRAY_LENGTH} entries`);
  }
  return value;
}

function unique(values, label) {
  if (new Set(values).size !== values.length) fail(`${label} must not contain duplicates`);
  return values;
}

function choice(value, choices, label) {
  if (!choices.has(value)) fail(`${label} has unsupported value ${String(value)}`);
  return value;
}

function positiveSafeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) fail(`${label} must be a positive safe integer`);
  return value;
}

function idList(value, label) {
  return unique(array(value, label).map((entry, index) => id(entry, `${label}[${index}]`)), label);
}

function jsonData(value, label, state = {nodes: 0}, depth = 0) {
  state.nodes += 1;
  if (state.nodes > PRODUCT_CONTEXT_MAX_JSON_NODES) fail(`${label} exceeds ${PRODUCT_CONTEXT_MAX_JSON_NODES} JSON values`);
  if (depth > PRODUCT_CONTEXT_MAX_JSON_DEPTH) fail(`${label} exceeds JSON depth ${PRODUCT_CONTEXT_MAX_JSON_DEPTH}`);
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'string') {
    if (value.length > PRODUCT_CONTEXT_MAX_TEXT_LENGTH || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) fail(`${label} contains invalid text`);
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(`${label} contains a non-finite number`);
    return;
  }
  if (Array.isArray(value)) {
    array(value, label).forEach((entry, index) => jsonData(entry, `${label}[${index}]`, state, depth + 1));
    return;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const entries = Object.entries(value);
    if (entries.length > PRODUCT_CONTEXT_MAX_ARRAY_LENGTH) fail(`${label} contains too many object members`);
    for (const [key, entry] of entries) {
      if (key.length === 0 || key.length > PRODUCT_CONTEXT_MAX_TEXT_LENGTH || /[\u0000-\u001f\u007f]/u.test(key)) fail(`${label} contains an invalid object key`);
      jsonData(entry, `${label}.${key}`, state, depth + 1);
    }
    return;
  }
  fail(`${label} must contain only JSON values`);
}

/**
 * Serializes JSON data with recursively sorted object keys and no insignificant
 * whitespace so hashes do not depend on object insertion order.
 *
 * @param {ProductContextJsonValue} value JSON-compatible data to serialize.
 * @returns {string} Canonical JSON text.
 * @throws {Error} When the value contains unsupported or non-finite data.
 */
export function canonicalProductContextJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('Canonical JSON cannot contain a non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalProductContextJson).join(',')}]`;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalProductContextJson(value[key])}`).join(',')}}`;
  }
  fail('Canonical JSON supports only JSON values');
}

/**
 * Selects the artifact fields whose content determines its material identity.
 * Revision bookkeeping and the stored digest are deliberately excluded.
 *
 * @param {ProductArtifact} artifact Artifact envelope to project.
 * @returns {ProductArtifactMaterial} Material artifact projection.
 * @throws {Error} When required artifact fields cannot be read.
 */
export function productArtifactMaterialPayload(artifact) {
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

function normalizedArtifactJson(value, label, state = {nodes: 0}, depth = 0) {
  state.nodes += 1;
  if (state.nodes > PRODUCT_CONTEXT_MAX_JSON_NODES) fail(`${label} exceeds ${PRODUCT_CONTEXT_MAX_JSON_NODES} JSON values`);
  if (depth > PRODUCT_CONTEXT_MAX_JSON_DEPTH) fail(`${label} exceeds JSON depth ${PRODUCT_CONTEXT_MAX_JSON_DEPTH}`);
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((entry, index) => normalizedArtifactJson(entry, `${label}[${index}]`, state, depth + 1));
  return Object.fromEntries(Object.keys(value).sort().map(key => [
    key,
    normalizedArtifactJson(value[key], `${label}.${key}`, state, depth + 1),
  ]));
}

/**
 * Calculates the deterministic material digest for a product artifact.
 * Set-like lists, dependencies, and payload object keys are normalized before
 * hashing; the supplied artifact is not mutated.
 *
 * @param {ProductArtifact} artifact Artifact whose material identity is needed.
 * @returns {string} Lowercase SHA-256 digest.
 * @throws {Error} When artifact material cannot be normalized or serialized.
 */
export function calculateProductArtifactMaterialSha256(artifact) {
  const material = productArtifactMaterialPayload(artifact);
  material.consumerDomains = consumerOrder.filter(domain => material.consumerDomains.includes(domain));
  for (const key of ['scopeRefs', 'coverageRefs', 'gapRefs', 'lockRefs']) material[key] = [...material[key]].sort();
  material.recordDependencies = [...material.recordDependencies].sort((left, right) => compareCodePoints(left.id, right.id));
  material.artifactDependencies = [...material.artifactDependencies].sort((left, right) => compareCodePoints(left.id, right.id));
  material.payload = normalizedArtifactJson(material.payload, 'artifact.payload');
  material.resources = normalizedArtifactJson(material.resources, 'artifact.resources');
  return crypto.createHash('sha256')
    .update(Buffer.from(`${JSON.stringify(material, null, 2)}\n`, 'utf8'))
    .digest('hex');
}

/**
 * Removes the two derived identity fields from a PRD context.
 *
 * @param {ProductContext} context Context to project.
 * @returns {ProductContextMaterial} Context material used to derive identity.
 * @throws {Error} When the context cannot be destructured.
 */
export function productContextMaterialPayload(context) {
  const {contextId: _contextId, materialSha256: _materialSha256, ...material} = context;
  return material;
}

/**
 * Calculates the deterministic digest of a PRD context's material content.
 *
 * @param {ProductContext} context Context whose material identity is needed.
 * @returns {string} Lowercase SHA-256 digest.
 * @throws {Error} When context material is not JSON-compatible.
 */
export function calculateProductContextMaterialSha256(context) {
  return crypto.createHash('sha256')
    .update(Buffer.from(canonicalProductContextJson(productContextMaterialPayload(context)), 'utf8'))
    .digest('hex');
}

function validateRecordDependency(dependency, label) {
  object(dependency, label, ['id', 'materialSha256']);
  id(dependency.id, `${label}.id`);
  sha256(dependency.materialSha256, `${label}.materialSha256`);
}

function validateArtifactDependency(dependency, label) {
  object(dependency, label, ['id', 'revision', 'materialSha256']);
  id(dependency.id, `${label}.id`);
  positiveSafeInteger(dependency.revision, `${label}.revision`);
  sha256(dependency.materialSha256, `${label}.materialSha256`);
}

function validateArtifact(artifact, label) {
  object(artifact, label, [
    'schemaVersion', 'kind', 'id', 'artifactKind', 'owner', 'artifactSchemaVersion', 'revision',
    'status', 'consumerDomains', 'scopeRefs', 'coverageRefs', 'gapRefs', 'lockRefs',
    'recordDependencies', 'artifactDependencies', 'producer', 'resources', 'payload', 'materialSha256', 'change',
  ]);
  if (artifact.schemaVersion !== '1.0' || artifact.kind !== 'product-artifact') fail(`${label} must be a product-artifact 1.0 envelope`);
  id(artifact.id, `${label}.id`);
  id(artifact.artifactKind, `${label}.artifactKind`);
  choice(artifact.owner, owners, `${label}.owner`);
  text(artifact.artifactSchemaVersion, `${label}.artifactSchemaVersion`);
  if (artifact.artifactSchemaVersion.length > 64 || !semverPattern.test(artifact.artifactSchemaVersion)) fail(`${label}.artifactSchemaVersion must be a compact semantic version`);
  positiveSafeInteger(artifact.revision, `${label}.revision`);
  choice(artifact.status, persistedArtifactStatuses, `${label}.status`);
  const consumerDomains = idList(artifact.consumerDomains, `${label}.consumerDomains`);
  if (consumerDomains.length === 0 || consumerDomains.some(domain => !consumerOrder.includes(domain))) fail(`${label}.consumerDomains must name supported consumers`);
  const scopeRefs = idList(artifact.scopeRefs, `${label}.scopeRefs`);
  if (scopeRefs.length === 0) fail(`${label}.scopeRefs must not be empty`);
  const coverageRefs = idList(artifact.coverageRefs, `${label}.coverageRefs`);
  for (const ref of coverageRefs) if (!scopeRefs.includes(ref)) fail(`${label}.coverageRefs contains ${ref}, which is outside scopeRefs`);
  const gapRefs = idList(artifact.gapRefs, `${label}.gapRefs`);
  const lockRefs = idList(artifact.lockRefs, `${label}.lockRefs`);
  array(artifact.recordDependencies, `${label}.recordDependencies`).forEach((dependency, index) => validateRecordDependency(dependency, `${label}.recordDependencies[${index}]`));
  unique(artifact.recordDependencies.map(dependency => dependency.id), `${label}.recordDependencies IDs`);
  const recordDependencyIds = new Set(artifact.recordDependencies.map(dependency => dependency.id));
  for (const ref of [...scopeRefs, ...coverageRefs, ...gapRefs, ...lockRefs]) {
    if (!recordDependencyIds.has(ref)) fail(`${label} reference ${ref} lacks an exact record dependency binding`);
  }
  array(artifact.artifactDependencies, `${label}.artifactDependencies`).forEach((dependency, index) => validateArtifactDependency(dependency, `${label}.artifactDependencies[${index}]`));
  unique(artifact.artifactDependencies.map(dependency => dependency.id), `${label}.artifactDependencies IDs`);
  object(artifact.producer, `${label}.producer`, ['id', 'contractVersion', 'method']);
  id(artifact.producer.id, `${label}.producer.id`);
  text(artifact.producer.contractVersion, `${label}.producer.contractVersion`);
  if (artifact.producer.contractVersion.length > 64 || !semverPattern.test(artifact.producer.contractVersion)) fail(`${label}.producer.contractVersion must be a compact semantic version`);
  id(artifact.producer.method, `${label}.producer.method`);
  jsonData(artifact.payload, `${label}.payload`);
  validateResourceDescriptors(artifact.resources);
  if (isPublicationPayload(artifact)) validatePublicationPayload(artifact);
  sha256(artifact.materialSha256, `${label}.materialSha256`);
  object(artifact.change, `${label}.change`, ['kind', 'previousRevision', 'previousMaterialSha256']);
  const changeKind = choice(artifact.change.kind, artifactChangeKinds, `${label}.change.kind`);
  if (artifact.change.previousRevision !== null) positiveSafeInteger(artifact.change.previousRevision, `${label}.change.previousRevision`);
  if (artifact.change.previousMaterialSha256 !== null) sha256(artifact.change.previousMaterialSha256, `${label}.change.previousMaterialSha256`);
  if ((artifact.change.previousRevision === null) !== (artifact.change.previousMaterialSha256 === null)) fail(`${label}.change previous binding must be wholly null or wholly present`);
  const hasPrevious = artifact.change.previousRevision !== null;
  if (changeKind === 'added') {
    if (artifact.revision !== 1 || hasPrevious) fail(`${label}.change added is valid only for revision 1 without a previous binding`);
    if (artifact.status === 'superseded') fail(`${label}.change added cannot have superseded status`);
  } else {
    if (!hasPrevious) fail(`${label}.change ${changeKind} artifacts require a previous binding`);
    if (artifact.revision < 2 || artifact.change.previousRevision !== artifact.revision - 1) {
      fail(`${label}.change ${changeKind} must bind revision ${artifact.revision - 1}`);
    }
  }
  if ((changeKind === 'superseded') !== (artifact.status === 'superseded')) {
    fail(`${label}.change superseded and artifact status superseded must occur together`);
  }
  if (changeKind === 'unchanged' && artifact.change.previousMaterialSha256 !== artifact.materialSha256) {
    fail(`${label}.change unchanged must retain the previous material digest`);
  }
  if ((changeKind === 'modified' || changeKind === 'superseded')
    && artifact.change.previousMaterialSha256 === artifact.materialSha256) {
    fail(`${label}.change ${changeKind} must change the material digest`);
  }
  if (artifact.status === 'partial' && artifact.gapRefs.length === 0) fail(`${label} partial artifacts require at least one gap reference`);
  if (artifact.materialSha256 !== calculateProductArtifactMaterialSha256(artifact)) fail(`${label}.materialSha256 does not match artifact material content`);
}

function validateMaterialRecord(record, label, keys, statuses) {
  object(record, label, keys);
  id(record.id, `${label}.id`);
  choice(record.status, statuses, `${label}.status`);
  choice(record.owner, owners, `${label}.owner`);
  sha256(record.materialSha256, `${label}.materialSha256`);
}

/**
 * Validates the complete closed Slice 2 PRD context, including referential
 * integrity, exact dependency bindings, artifact availability, locks,
 * provenance, aggregate limits, and derived identities.
 *
 * @param {unknown} context Untrusted parsed context value.
 * @returns {ProductContext} The same context after successful validation.
 * @throws {Error} When any shape, value, reference, digest, or size invariant fails.
 */
export function validateProductContext(context) {
  object(context, 'context', [
    'schemaVersion', 'contextId', 'consumer', 'sourceSnapshot', 'productModel', 'scopeRefs',
    'product', 'capabilities', 'gaps', 'artifacts', 'locks', 'exclusions', 'provenance', 'materialSha256',
  ]);
  if (context.schemaVersion !== PRODUCT_CONTEXT_SCHEMA_VERSION) fail(`context.schemaVersion must be ${PRODUCT_CONTEXT_SCHEMA_VERSION}`);
  if (context.consumer !== 'prd') fail('context.consumer must be prd');
  id(context.contextId, 'context.contextId');
  sha256(context.materialSha256, 'context.materialSha256');

  object(context.sourceSnapshot, 'context.sourceSnapshot', ['id', 'revision', 'sha256']);
  id(context.sourceSnapshot.id, 'context.sourceSnapshot.id');
  positiveSafeInteger(context.sourceSnapshot.revision, 'context.sourceSnapshot.revision');
  sha256(context.sourceSnapshot.sha256, 'context.sourceSnapshot.sha256');

  object(context.productModel, 'context.productModel', ['id', 'revision', 'status', 'sha256', 'materialSha256']);
  id(context.productModel.id, 'context.productModel.id');
  positiveSafeInteger(context.productModel.revision, 'context.productModel.revision');
  choice(context.productModel.status, productStatuses, 'context.productModel.status');
  sha256(context.productModel.sha256, 'context.productModel.sha256');
  sha256(context.productModel.materialSha256, 'context.productModel.materialSha256');

  const scopeRefs = idList(context.scopeRefs, 'context.scopeRefs');
  object(context.product, 'context.product', ['id', 'name', 'status', 'owner', 'materialSha256', 'purpose', 'users']);
  id(context.product.id, 'context.product.id');
  text(context.product.name, 'context.product.name');
  choice(context.product.status, productStatuses, 'context.product.status');
  choice(context.product.owner, owners, 'context.product.owner');
  sha256(context.product.materialSha256, 'context.product.materialSha256');
  validateMaterialRecord(context.product.purpose, 'context.product.purpose', ['id', 'summary', 'status', 'owner', 'materialSha256'], recordStatuses);
  text(context.product.purpose.summary, 'context.product.purpose.summary');
  array(context.product.users, 'context.product.users').forEach((user, index) => {
    const label = `context.product.users[${index}]`;
    validateMaterialRecord(user, label, ['id', 'name', 'description', 'status', 'owner', 'materialSha256'], recordStatuses);
    text(user.name, `${label}.name`);
    text(user.description, `${label}.description`);
  });
  unique(context.product.users.map(user => user.id), 'context.product.users IDs');

  array(context.capabilities, 'context.capabilities').forEach((capability, index) => {
    const label = `context.capabilities[${index}]`;
    validateMaterialRecord(capability, label, ['id', 'name', 'description', 'outcome', 'status', 'owner', 'materialSha256'], recordStatuses);
    text(capability.name, `${label}.name`);
    text(capability.description, `${label}.description`);
    text(capability.outcome, `${label}.outcome`);
  });
  unique(context.capabilities.map(capability => capability.id), 'context.capabilities IDs');

  array(context.gaps, 'context.gaps').forEach((gap, index) => {
    const label = `context.gaps[${index}]`;
    validateMaterialRecord(gap, label, ['id', 'kind', 'question', 'impact', 'status', 'owner', 'materialSha256', 'affectsRefs'], gapStatuses);
    choice(gap.kind, gapKinds, `${label}.kind`);
    text(gap.question, `${label}.question`);
    text(gap.impact, `${label}.impact`);
    idList(gap.affectsRefs, `${label}.affectsRefs`);
  });
  unique(context.gaps.map(gap => gap.id), 'context.gaps IDs');

  const recordMaterial = new Map([
    [context.product.id, context.product.materialSha256],
    [context.product.purpose.id, context.product.purpose.materialSha256],
    ...context.product.users.map(record => [record.id, record.materialSha256]),
    ...context.capabilities.map(record => [record.id, record.materialSha256]),
    ...context.gaps.map(record => [record.id, record.materialSha256]),
  ]);
  const expectedRecordCount = 2 + context.product.users.length + context.capabilities.length + context.gaps.length;
  if (recordMaterial.size !== expectedRecordCount) fail('context product record IDs must not contain duplicates');
  for (const ref of scopeRefs) if (!recordMaterial.has(ref)) fail(`context.scopeRefs contains unknown record ID ${ref}`);
  for (const gap of context.gaps) for (const ref of gap.affectsRefs) if (!recordMaterial.has(ref)) fail(`context gap ${gap.id} affects missing record ${ref}`);

  array(context.artifacts, 'context.artifacts').forEach((artifact, index) => validateArtifact(artifact, `context.artifacts[${index}]`));
  let decodedBytes = 0;
  const resourceDigests = new Map();
  for (const artifact of context.artifacts) {
    if (isPublicationPayload(artifact)) decodedBytes += validatePublicationPayload(artifact).decodedBytes;
    for (const resource of artifact.resources) {
      const previous = resourceDigests.get(resource.sha256);
      if (previous && (previous.path !== resource.path || previous.mediaType !== resource.mediaType || previous.byteLength !== resource.byteLength)) fail('Context contains conflicting resource descriptors for one digest');
      resourceDigests.set(resource.sha256, resource);
    }
  }
  if (decodedBytes > PUBLICATION_DOCUMENTS_MAX_BYTES) fail('Context publication documents exceed the decoded aggregate size limit');
  if ([...resourceDigests.values()].reduce((total, item) => total + item.byteLength, 0) > PUBLICATION_RESOURCES_MAX_BYTES) fail('Context resources exceed the aggregate size limit');
  unique(context.artifacts.map(artifact => artifact.id), 'context.artifacts IDs');
  const artifactById = new Map(context.artifacts.map(artifact => [artifact.id, artifact]));
  for (const artifact of context.artifacts) {
    if (!artifactStatuses.has(artifact.status)) fail(`context artifact ${artifact.id} is not consumable`);
    if (!artifact.consumerDomains.includes('prd')) fail(`context artifact ${artifact.id} is not available to the prd consumer`);
    for (const dependency of artifact.recordDependencies) {
      if (!recordMaterial.has(dependency.id)) fail(`context artifact ${artifact.id} depends on missing record ${dependency.id}`);
      if (recordMaterial.get(dependency.id) !== dependency.materialSha256) fail(`context artifact ${artifact.id} has stale material for record ${dependency.id}`);
    }
    for (const dependency of artifact.artifactDependencies) {
      const resolved = artifactById.get(dependency.id);
      if (!resolved) fail(`context artifact ${artifact.id} depends on missing artifact ${dependency.id}`);
      if (resolved.revision !== dependency.revision || resolved.materialSha256 !== dependency.materialSha256) fail(`context artifact ${artifact.id} has stale artifact dependency ${dependency.id}`);
    }
    for (const ref of [...artifact.scopeRefs, ...artifact.coverageRefs, ...artifact.gapRefs, ...artifact.lockRefs]) {
      if (!recordMaterial.has(ref)) fail(`context artifact ${artifact.id} references missing record ${ref}`);
    }
    for (const ref of artifact.gapRefs) if (!context.gaps.some(gap => gap.id === ref)) fail(`context artifact ${artifact.id} gap reference ${ref} is not a gap`);
  }
  const visitingArtifacts = new Set();
  const visitedArtifacts = new Set();
  const visitArtifact = artifact => {
    if (visitingArtifacts.has(artifact.id)) fail(`context artifact dependency cycle includes ${artifact.id}`);
    if (visitedArtifacts.has(artifact.id)) return;
    visitingArtifacts.add(artifact.id);
    for (const dependency of artifact.artifactDependencies) visitArtifact(artifactById.get(dependency.id));
    visitingArtifacts.delete(artifact.id);
    visitedArtifacts.add(artifact.id);
  };
  for (const artifact of context.artifacts) visitArtifact(artifact);

  array(context.locks, 'context.locks').forEach((lock, index) => {
    const label = `context.locks[${index}]`;
    object(lock, label, ['ref', 'kind', 'owner']);
    id(lock.ref, `${label}.ref`);
    choice(lock.kind, lockKinds, `${label}.kind`);
    choice(lock.owner, owners, `${label}.owner`);
  });
  unique(context.locks.map(lock => lock.ref), 'context.locks refs');
  const expectedLocks = new Map();
  if (context.product.status === 'locked') expectedLocks.set(context.product.id, {kind: 'product', owner: context.product.owner});
  if (context.product.purpose.status === 'locked') expectedLocks.set(context.product.purpose.id, {kind: 'purpose', owner: context.product.purpose.owner});
  for (const [kind, records] of [['user', context.product.users], ['capability', context.capabilities], ['gap', context.gaps]]) {
    for (const record of records) if (record.status === 'locked') expectedLocks.set(record.id, {kind, owner: record.owner});
  }
  for (const artifact of context.artifacts) if (artifact.status === 'locked') expectedLocks.set(artifact.id, {kind: 'artifact', owner: artifact.owner});
  if (expectedLocks.size !== context.locks.length) fail('context.locks must enumerate every included locked record and artifact exactly once');
  for (const lock of context.locks) {
    const expected = expectedLocks.get(lock.ref);
    if (!expected || expected.kind !== lock.kind || expected.owner !== lock.owner) fail(`context lock ${lock.ref} does not match an included locked record or artifact`);
  }
  for (const artifact of context.artifacts) for (const ref of artifact.lockRefs) if (!expectedLocks.has(ref)) fail(`context artifact ${artifact.id} lock reference ${ref} is not an included lock`);

  array(context.exclusions, 'context.exclusions').forEach((exclusion, index) => {
    const label = `context.exclusions[${index}]`;
    object(exclusion, label, ['id', 'artifactKind', 'revision', 'status', 'outcome', 'materialSha256', 'reasons']);
    id(exclusion.id, `${label}.id`);
    id(exclusion.artifactKind, `${label}.artifactKind`);
    positiveSafeInteger(exclusion.revision, `${label}.revision`);
    choice(exclusion.status, persistedArtifactStatuses, `${label}.status`);
    choice(exclusion.outcome, exclusionOutcomes, `${label}.outcome`);
    sha256(exclusion.materialSha256, `${label}.materialSha256`);
    const reasons = unique(array(exclusion.reasons, `${label}.reasons`).map((reason, reasonIndex) => text(reason, `${label}.reasons[${reasonIndex}]`)), `${label}.reasons`);
    if (exclusion.outcome === 'superseded' && exclusion.status !== 'superseded') fail(`${label} superseded outcome requires superseded status`);
    if (exclusion.outcome !== 'superseded' && exclusion.status === 'superseded') fail(`${label} superseded status requires superseded outcome`);
    if (exclusion.outcome !== 'superseded' && reasons.length === 0) fail(`${label} unavailable artifacts require at least one reason`);
  });
  unique(context.exclusions.map(exclusion => exclusion.id), 'context.exclusions IDs');
  for (const exclusion of context.exclusions) if (artifactById.has(exclusion.id)) fail(`context artifact ${exclusion.id} cannot be both consumable and excluded`);

  object(context.provenance, 'context.provenance', ['sourceId', 'sourceRevision', 'sourceSha256']);
  id(context.provenance.sourceId, 'context.provenance.sourceId');
  positiveSafeInteger(context.provenance.sourceRevision, 'context.provenance.sourceRevision');
  sha256(context.provenance.sourceSha256, 'context.provenance.sourceSha256');

  const materialSha256 = calculateProductContextMaterialSha256(context);
  if (context.materialSha256 !== materialSha256) fail('context.materialSha256 does not match material content');
  if (context.contextId !== `prd-context-${materialSha256.slice(0, 12)}`) fail('context.contextId does not match materialSha256');
  if (context.productModel.id !== context.product.id) fail('context product ID must match its product-model binding');
  if (context.provenance.sourceRevision !== context.productModel.revision) fail('context source revision must match its product-model revision');
  const aggregateBytes = Buffer.byteLength(canonicalProductContextJson(context), 'utf8');
  if (aggregateBytes > PRODUCT_CONTEXT_MAX_BYTES) fail(`context exceeds the ${PRODUCT_CONTEXT_MAX_BYTES}-byte aggregate limit`);
  return context;
}
