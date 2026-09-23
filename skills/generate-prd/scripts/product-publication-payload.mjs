import crypto from 'node:crypto';
import {TextDecoder} from 'node:util';
import {gzipSync, gunzipSync} from 'node:zlib';

export const PUBLICATION_DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;
export const PUBLICATION_DOCUMENTS_MAX_BYTES = 16 * 1024 * 1024;
export const PUBLICATION_RESOURCE_MAX_BYTES = 20 * 1024 * 1024;
export const PUBLICATION_RESOURCES_MAX_BYTES = 64 * 1024 * 1024;
const packageMaxBytes = 2 * 1024 * 1024;
const versions = new Map([['ux-design', '0.2'], ['design-language', '0.14'], ['ui-composition', '0.2'], ['component-design', '0.2'], ['prd-publication', '1.0']]);
const extensions = new Map([['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/webp', 'webp'], ['image/svg+xml', 'svg']]);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };

function closed(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(`${label} must be a plain object`);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) fail(`${label} must contain exactly ${keys.join(', ')}`);
}

/** Canonical compact UTF-8 JSON uses recursively sorted object keys. */
export function canonicalPublicationJson(value) {
  const visit = (item, depth, state) => {
    state.nodes += 1;
    if (depth > 64 || state.nodes > 100_000) fail('Publication document exceeds JSON complexity limits');
    if (item === null || typeof item === 'boolean') return JSON.stringify(item);
    if (typeof item === 'number' && Number.isFinite(item)) return JSON.stringify(item);
    if (typeof item === 'string') {
      if (item.length > 32_768 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(item)) fail('Publication document contains invalid text');
      return JSON.stringify(item);
    }
    if (Array.isArray(item)) {
      if (item.length > 10_000) fail('Publication document array exceeds the limit');
      return `[${item.map(entry => visit(entry, depth + 1, state)).join(',')}]`;
    }
    if (item && typeof item === 'object' && Object.getPrototypeOf(item) === Object.prototype) {
      const keys = Object.keys(item).sort();
      if (keys.length > 10_000 || keys.some(key => !key || key.length > 32_768 || /[\u0000-\u001f\u007f]/u.test(key))) fail('Publication document contains invalid keys');
      return `{${keys.map(key => `${JSON.stringify(key)}:${visit(item[key], depth + 1, state)}`).join(',')}}`;
    }
    fail('Publication document must contain only finite JSON data');
  };
  return visit(value, 0, {nodes: 0});
}

/** Validate a portable logical asset path without resolving the filesystem. */
export function validatePublicationLogicalPath(value) {
  if (typeof value !== 'string' || value.length > 1024 || !value || value.includes('\\') || value.startsWith('/') || value.includes(':')) fail('Resource logicalPath must be a safe relative path');
  if (value.split('/').some(segment => !/^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(segment) || /[. ]$/.test(segment) || segment === '.' || segment === '..' || /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(segment))) fail('Resource logicalPath must be a safe relative path');
  return value;
}

/** Validate resource metadata and, when supplied, exact declared image bindings. */
export function validateResourceDescriptors(resources, document) {
  if (!Array.isArray(resources) || resources.length > 10_000) fail('Publication resources must be a bounded array');
  const logicalPaths = new Set();
  const ids = new Set();
  const files = new Map();
  for (const descriptor of resources) {
    closed(descriptor, ['id', 'logicalPath', 'path', 'mediaType', 'byteLength', 'sha256'], 'Resource descriptor');
    if (typeof descriptor.id !== 'string' || descriptor.id.length > 80 || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(descriptor.id) || ids.has(descriptor.id)) fail('Resource IDs must be unique stable identifiers');
    ids.add(descriptor.id);
    validatePublicationLogicalPath(descriptor.logicalPath);
    if (logicalPaths.has(descriptor.logicalPath)) fail('Publication resources contain a duplicate logicalPath');
    logicalPaths.add(descriptor.logicalPath);
    const extension = extensions.get(descriptor.mediaType);
    if (!extension || typeof descriptor.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(descriptor.sha256)) fail('Resource descriptor has an unsupported media type or hash');
    if (descriptor.path !== `artifact-resources/${descriptor.sha256}.${extension}`) fail('Resource path must be the exact content-addressed resource path');
    if (!Number.isSafeInteger(descriptor.byteLength) || descriptor.byteLength < 1 || descriptor.byteLength > PUBLICATION_RESOURCE_MAX_BYTES) fail('Resource bytes exceed the resource size limit');
    const previous = files.get(descriptor.sha256);
    if (previous && (previous.byteLength !== descriptor.byteLength || previous.mediaType !== descriptor.mediaType || previous.path !== descriptor.path)) fail('Conflicting duplicate resource descriptor');
    files.set(descriptor.sha256, descriptor);
  }
  if ([...files.values()].reduce((total, item) => total + item.byteLength, 0) > PUBLICATION_RESOURCES_MAX_BYTES) fail('Publication resources exceed the aggregate size limit');
  if (document !== undefined) {
    if (document?.assets !== undefined && !Array.isArray(document.assets)) fail('Publication document assets must be an array');
    const images = document?.assets?.filter(asset => asset?.kind === 'image') ?? [];
    for (const image of images) {
      validatePublicationLogicalPath(image.path);
      const descriptor = resources.find(item => item.logicalPath === image.path);
      if (!descriptor || descriptor.id !== image.id || descriptor.mediaType !== image.mimeType || descriptor.sha256 !== image.sha256) fail(`Missing or mismatched declared image resource ${image.path}`);
    }
    for (const resource of resources) if (!images.some(image => image.path === resource.logicalPath)) fail(`Undeclared resource ${resource.logicalPath}`);
  }
  return resources;
}

/** Encode validated logical data without filesystem or product-prose input. */
export function encodePublicationDocument(document, {encoding = 'json'} = {}) {
  const bytes = Buffer.from(canonicalPublicationJson(document));
  if (bytes.length > PUBLICATION_DOCUMENT_MAX_BYTES) fail('Publication document exceeds the decoded size limit');
  if (encoding === 'json') return {encoding, mediaType: 'application/json', document: JSON.parse(bytes)};
  if (encoding !== 'gzip-base64') fail(`Unsupported publication encoding ${encoding}`);
  const compressed = gzipSync(bytes, {level: 9, mtime: 0});
  const data = compressed.toString('base64');
  if (data.length > packageMaxBytes) fail('Compressed publication document exceeds the package size limit');
  return {encoding, mediaType: 'application/json', compression: 'gzip', chunks: data.match(/.{1,32768}/g), compressedBytes: compressed.length, compressedSha256: digest(compressed), decodedBytes: bytes.length, decodedSha256: digest(bytes)};
}

/** Decode a bounded package and verify canonical UTF-8, size, digest and resource bindings. */
export function decodePublicationDocument(payload) {
  let document;
  let bytes;
  if (payload?.encoding === 'json') {
    closed(payload, ['encoding', 'mediaType', 'document'], 'Publication payload');
    document = payload.document;
    bytes = Buffer.from(canonicalPublicationJson(document));
  } else if (payload?.encoding === 'gzip-base64') {
    closed(payload, ['encoding', 'mediaType', 'compression', 'chunks', 'compressedBytes', 'compressedSha256', 'decodedBytes', 'decodedSha256'], 'Publication payload');
    if (payload.compression !== 'gzip') fail('Publication compression must be gzip');
    if (!Number.isSafeInteger(payload.decodedBytes) || payload.decodedBytes < 1 || payload.decodedBytes > PUBLICATION_DOCUMENT_MAX_BYTES) fail('Publication decodedBytes exceeds the decoded size limit');
    if (typeof payload.decodedSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(payload.decodedSha256)) fail('Publication decodedSha256 must be a lowercase hash');
    if (!Array.isArray(payload.chunks) || payload.chunks.length < 1 || payload.chunks.length > packageMaxBytes / 32768) fail('Publication chunks must be a bounded nonempty array');
    for (const [index, chunk] of payload.chunks.entries()) {
      if (typeof chunk !== 'string' || !chunk.length || chunk.length > 32768 || chunk.length % 4 || (index < payload.chunks.length - 1 && chunk.length !== 32768) || Buffer.from(chunk, 'base64').toString('base64') !== chunk) fail('Publication chunks must use canonical base64 and fixed nonfinal lengths');
    }
    const data = payload.chunks.join('');
    const encoded = Buffer.from(data, 'base64');
    if (!encoded.length || encoded.toString('base64') !== data) fail('Publication chunks must concatenate to canonical base64');
    if (!Number.isSafeInteger(payload.compressedBytes) || encoded.length !== payload.compressedBytes || digest(encoded) !== payload.compressedSha256) fail('Publication compressed size or hash does not match');
    try { bytes = gunzipSync(encoded, {maxOutputLength: PUBLICATION_DOCUMENT_MAX_BYTES}); } catch { fail('Publication data is not a bounded gzip document'); }
    if (bytes.length !== payload.decodedBytes || digest(bytes) !== payload.decodedSha256) fail('Publication decoded size or hash does not match');
    let text;
    try { text = new TextDecoder('utf-8', {fatal: true}).decode(bytes); document = JSON.parse(text); } catch { fail('Publication decoded data must be UTF-8 JSON'); }
    if (!Buffer.from(canonicalPublicationJson(document)).equals(bytes)) fail('Publication decoded JSON must be canonical UTF-8 bytes');
  } else fail('Unsupported publication payload encoding');
  if (payload.mediaType !== 'application/json') fail('Publication payload mediaType must be application/json');
  if (bytes.length > PUBLICATION_DOCUMENT_MAX_BYTES) fail('Publication document exceeds the decoded size limit');
  return {document, decodedBytes: bytes.length};
}

/** Reserved publication kinds always require their current structured package contracts. */
export function isPublicationPayload(artifact) {
  return versions.has(artifact.artifactKind);
}

/** Validate the exact artifact-kind version and logical document version. */
export function validatePublicationPayload(artifact) {
  if (versions.get(artifact.artifactKind) !== artifact.artifactSchemaVersion) fail(`Unsupported ${artifact.artifactKind} publication artifact version`);
  const decoded = decodePublicationDocument(artifact.payload);
  const {document} = decoded;
  validateResourceDescriptors(artifact.resources, document);
  if (artifact.artifactKind === 'design-language') {
    closed(document, ['designLanguage', 'reviewLayout'], 'Design-language publication document');
    if (document.designLanguage?.schemaVersion !== '0.14' || document.reviewLayout?.version !== 7) fail('Publication requires design-language 0.14 and review-layout 7');
  } else if (document?.schemaVersion !== artifact.artifactSchemaVersion) fail(`Publication document requires schema ${artifact.artifactSchemaVersion}`);
  if (artifact.artifactKind === 'prd-publication') {
    closed(document, ['schemaVersion', 'uxArtifactId', 'designLanguageArtifactId', 'uiArtifactId', 'componentArtifactIds'], 'PRD publication manifest');
    if (artifact.payload.encoding !== 'json' || artifact.resources.length) fail('PRD publication manifest requires JSON encoding without resources');
    const validId = value => typeof value === 'string' && value.length <= 80 && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value);
    if (!validId(document.uxArtifactId) || !validId(document.designLanguageArtifactId) || (document.uiArtifactId !== null && !validId(document.uiArtifactId)) || !Array.isArray(document.componentArtifactIds) || document.componentArtifactIds.some(id => !validId(id))) fail('PRD publication manifest has invalid artifact role IDs');
    const ids = [document.uxArtifactId, document.designLanguageArtifactId, ...(document.uiArtifactId === null ? [] : [document.uiArtifactId]), ...document.componentArtifactIds];
    if (new Set(ids).size !== ids.length || (document.componentArtifactIds.length && document.uiArtifactId === null)) fail('PRD publication manifest roles must be unique and components require UI');
    const dependencies = artifact.artifactDependencies?.map(item => item.id) ?? [];
    if (dependencies.length !== ids.length || ids.some(id => !dependencies.includes(id))) fail('PRD publication manifest must bind exactly its named artifact dependencies');
  }
  return decoded;
}
