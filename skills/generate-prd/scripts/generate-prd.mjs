#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PRODUCT_CONTEXT_MAX_ARRAY_LENGTH,
  PRODUCT_CONTEXT_MAX_BYTES,
  PRODUCT_CONTEXT_MAX_TEXT_LENGTH,
  PRODUCT_CONTEXT_SCHEMA_VERSION,
  calculateProductArtifactMaterialSha256,
  calculateProductContextMaterialSha256,
  canonicalProductContextJson,
  productContextMaterialPayload,
  validateProductContext,
} from './product-context-contract.mjs';
import { buildArtifactPublication, PUBLICATION_ARTIFACT_KINDS } from './publication-artifacts.mjs';
import {
  PUBLICATION_RESOURCE_MAX_BYTES,
  validatePublicationLogicalPath,
  validateResourceDescriptors,
} from './product-publication-payload.mjs';

export {
  PRODUCT_CONTEXT_MAX_ARRAY_LENGTH,
  PRODUCT_CONTEXT_MAX_BYTES,
  PRODUCT_CONTEXT_MAX_TEXT_LENGTH,
  PRODUCT_CONTEXT_SCHEMA_VERSION,
  calculateProductArtifactMaterialSha256,
  calculateProductContextMaterialSha256,
  canonicalProductContextJson,
  productContextMaterialPayload,
  validateProductContext,
};

export const GENERATOR_ID = 'generate-prd';
export const GENERATOR_VERSION = '1.1.0';

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RECEIPT_FILE = 'publication-receipt.json';

const CSS = `/* ${GENERATOR_ID} ${GENERATOR_VERSION}: product-neutral review-document presentation */
:root {
  color-scheme: light;
  --page: #f5f6f8;
  --surface: #ffffff;
  --text: #18202a;
  --muted: #5e6875;
  --border: #d8dde5;
  --accent: #315b7d;
  --gap-1: 0.5rem;
  --gap-2: 1rem;
  --gap-3: 1.5rem;
  --radius: 0.5rem;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--page);
  color: var(--text);
  line-height: 1.5;
}

main {
  width: min(72rem, calc(100% - 2rem));
  margin: 0 auto;
  padding: 3rem 0;
}

header,
section,
footer {
  margin-block-end: var(--gap-3);
  padding: var(--gap-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

h1,
h2,
h3,
p {
  margin-block-start: 0;
}

h1 {
  margin-block-end: var(--gap-1);
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.1;
}

h2 {
  font-size: 1.35rem;
}

h3 {
  margin-block-end: 0.25rem;
  font-size: 1rem;
}

ul {
  display: grid;
  gap: var(--gap-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  padding: var(--gap-2);
  border-inline-start: 0.25rem solid var(--border);
}

.eyebrow,
.metadata,
.record-meta,
.empty {
  color: var(--muted);
}

.eyebrow {
  margin-block-end: var(--gap-1);
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.metadata {
  display: grid;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.record-meta {
  margin-block-end: 0;
  font-size: 0.875rem;
}

.artifact-payload {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  padding: var(--gap-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--page);
  color: var(--text);
}

.empty,
footer p:last-child {
  margin-block-end: 0;
}
`;

/** @typedef {import('./product-context-contract.mjs').PrdContext} PrdContext */

/**
 * @typedef {object} PublicationReceipt
 * @property {string} schemaVersion
 * @property {string} receiptId
 * @property {{id: string, version: string}} generator
 * @property {{id: string, byteSha256: string, materialSha256: string}} context
 * @property {{id: string, revision: number, sha256: string}} sourceSnapshot
 * @property {{id: string, revision: number, sha256: string}} productModel
 * @property {Array<{path: string, sha256: string, bytes: number}>} files
 * @property {Array<{artifactId: string, id: string, logicalPath: string, path: string, mediaType: string, byteLength: number, sha256: string}>} resources
 */

/**
 * @typedef {object} Publication
 * @property {Map<string, Buffer>} files
 * @property {string} [html] Compatibility view of index.html.
 * @property {string} [css] Compatibility view of assets/product.css.
 * @property {string} receipt
 */

function fail(message) {
  throw new Error(message);
}

function compareCodePoints(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isPlainObject(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function assertObject(value, label, keys) {
  if (!isPlainObject(value)) {
    fail(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`${label} must contain exactly: ${expected.join(', ')}`);
  }
}

function assertString(value, label, { id = false, sha256 = false } = {}) {
  if (typeof value !== 'string' || value.length === 0 || value.length > PRODUCT_CONTEXT_MAX_TEXT_LENGTH) {
    fail(`${label} must be a non-empty string no longer than ${PRODUCT_CONTEXT_MAX_TEXT_LENGTH} characters`);
  }
  if (/\u0000/u.test(value)) {
    fail(`${label} must not contain a null character`);
  }
  if (sha256 && !SHA256_PATTERN.test(value)) {
    fail(`${label} must be a lowercase SHA-256 digest`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value) || value.length > PRODUCT_CONTEXT_MAX_ARRAY_LENGTH) {
    fail(`${label} must be an array with at most ${PRODUCT_CONTEXT_MAX_ARRAY_LENGTH} entries`);
  }
}

function decodeUtf8(bytes, label) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail(`${label} is not valid UTF-8`);
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Escape persisted text for an HTML text or attribute context.
 * @param {string} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderUsers(users) {
  if (users.length === 0) {
    return '<p class="empty">No users are recorded in this context.</p>';
  }
  return `<ul>
${users.map((user) => `        <li>
          <h3>${escapeHtml(user.id)}</h3>
          <p>${escapeHtml(user.description)}</p>
          <p class="record-meta">Status: ${escapeHtml(user.status)} · Owner: ${escapeHtml(user.owner)}</p>
        </li>`).join('\n')}
      </ul>`;
}

function renderCapabilities(capabilities) {
  if (capabilities.length === 0) {
    return '<p class="empty">No capabilities are recorded in this context.</p>';
  }
  return `<ul>
${capabilities.map((capability) => `        <li>
          <h3>${escapeHtml(capability.name)}</h3>
          <p>${escapeHtml(capability.description)}</p>
          <p><strong>Outcome:</strong> ${escapeHtml(capability.outcome)}</p>
          <p class="record-meta">ID: ${escapeHtml(capability.id)} · Status: ${escapeHtml(capability.status)} · Owner: ${escapeHtml(capability.owner)}</p>
        </li>`).join('\n')}
      </ul>`;
}

function renderGaps(gaps) {
  if (gaps.length === 0) {
    return '<p class="empty">No unresolved gaps are recorded in this context.</p>';
  }
  return `<ul>
${gaps.map((gap) => `        <li>
          <h3>${escapeHtml(gap.question)}</h3>
          <p>${escapeHtml(gap.impact)}</p>
          <p class="record-meta">ID: ${escapeHtml(gap.id)} · Kind: ${escapeHtml(gap.kind)} · Status: ${escapeHtml(gap.status)} · Owner: ${escapeHtml(gap.owner)}</p>
          <p class="record-meta">Affects: ${gap.affectsRefs.length > 0 ? gap.affectsRefs.map(escapeHtml).join(', ') : 'No persisted references'}</p>
        </li>`).join('\n')}
      </ul>`;
}

function renderArtifacts(artifacts) {
  if (artifacts.length === 0) return '<p class="empty">No current design artifacts are available in this context.</p>';
  return `<ul>
${artifacts.map(artifact => `        <li>
          <h3>${escapeHtml(artifact.id)}</h3>
          <p class="record-meta">Kind: ${escapeHtml(artifact.artifactKind)} · Revision: ${artifact.revision} · Status: ${escapeHtml(artifact.status)} · Owner: ${escapeHtml(artifact.owner)}</p>
          <p class="record-meta">Scope: ${artifact.scopeRefs.map(escapeHtml).join(', ')} · Coverage: ${artifact.coverageRefs.length > 0 ? artifact.coverageRefs.map(escapeHtml).join(', ') : 'No persisted coverage'}</p>
          <pre class="artifact-payload"><code>${escapeHtml(JSON.stringify(JSON.parse(canonicalProductContextJson(artifact.payload)), null, 2))}</code></pre>
        </li>`).join('\n')}
      </ul>`;
}

function renderPartialArtifactGaps(artifacts, gaps) {
  const partial = artifacts.filter(artifact => artifact.status === 'partial');
  if (partial.length === 0) return '<p class="empty">No current artifact is partial.</p>';
  const gapById = new Map(gaps.map(gap => [gap.id, gap]));
  return `<ul>
${partial.map(artifact => `        <li>
          <h3>${escapeHtml(artifact.id)}</h3>
          <p>Explicit gaps: ${artifact.gapRefs.map(ref => {
            const gap = gapById.get(ref);
            return gap ? `${escapeHtml(ref)} — ${escapeHtml(gap.question)}` : escapeHtml(ref);
          }).join('; ')}</p>
        </li>`).join('\n')}
      </ul>`;
}

function renderExclusions(exclusions) {
  if (exclusions.length === 0) return '<p class="empty">No relevant design artifact is unavailable.</p>';
  return `<ul>
${exclusions.map(exclusion => `        <li>
          <h3>${escapeHtml(exclusion.id)}</h3>
          <p class="record-meta">Kind: ${escapeHtml(exclusion.artifactKind)} · Revision: ${exclusion.revision} · State: ${escapeHtml(exclusion.outcome)}</p>
          <p>${exclusion.reasons.map(escapeHtml).join('; ')}</p>
        </li>`).join('\n')}
      </ul>`;
}

function renderLocks(locks) {
  if (locks.length === 0) return '<p class="empty">No included decision or artifact is locked.</p>';
  return `<ul>
${locks.map(lock => `        <li>
          <strong>${escapeHtml(lock.ref)}</strong>
          <span class="record-meta"> · Kind: ${escapeHtml(lock.kind)} · Owner: ${escapeHtml(lock.owner)}</span>
        </li>`).join('\n')}
      </ul>`;
}

/**
 * Render a validated product context as deterministic review-document HTML.
 * @param {PrdContext} context
 * @returns {string}
 */
export function renderHtml(context) {
  const scope = context.scopeRefs.length > 0
    ? context.scopeRefs.map(escapeHtml).join(', ')
    : 'No persisted scope references';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="${GENERATOR_ID} ${GENERATOR_VERSION}">
  <title>${escapeHtml(context.product.name)} · Product requirements</title>
  <link rel="stylesheet" href="assets/product.css">
</head>
<body>
  <main>
    <header>
      <p class="eyebrow">Product requirements</p>
      <h1>${escapeHtml(context.product.name)}</h1>
      <p>${escapeHtml(context.product.purpose.summary)}</p>
      <p class="record-meta">Purpose: ${escapeHtml(context.product.purpose.id)} · Status: ${escapeHtml(context.product.purpose.status)} · Owner: ${escapeHtml(context.product.purpose.owner)}</p>
      <div class="metadata">
        <span>Product record: ${escapeHtml(context.product.id)}</span>
        <span>Product status: ${escapeHtml(context.product.status)} · Owner: ${escapeHtml(context.product.owner)}</span>
        <span>Scope: ${scope}</span>
      </div>
    </header>

    <section aria-labelledby="users-heading">
      <h2 id="users-heading">Users</h2>
      ${renderUsers(context.product.users)}
    </section>

    <section aria-labelledby="capabilities-heading">
      <h2 id="capabilities-heading">Capabilities</h2>
      ${renderCapabilities(context.capabilities)}
    </section>

    <section aria-labelledby="gaps-heading">
      <h2 id="gaps-heading">Open questions and gaps</h2>
      ${renderGaps(context.gaps)}
    </section>

    <section aria-labelledby="artifact-coverage-heading">
      <h2 id="artifact-coverage-heading">Design artifact coverage</h2>
      ${renderArtifacts(context.artifacts)}
    </section>

    <section aria-labelledby="partial-artifacts-heading">
      <h2 id="partial-artifacts-heading">Partial artifact gaps</h2>
      ${renderPartialArtifactGaps(context.artifacts, context.gaps)}
    </section>

    <section aria-labelledby="unavailable-artifacts-heading">
      <h2 id="unavailable-artifacts-heading">Unavailable design artifacts</h2>
      ${renderExclusions(context.exclusions)}
    </section>

    <section aria-labelledby="locks-heading">
      <h2 id="locks-heading">Locked decisions</h2>
      ${renderLocks(context.locks)}
    </section>

    <footer>
      <p class="eyebrow">Publication binding</p>
      <div class="metadata">
        <span>Context: ${escapeHtml(context.contextId)}</span>
        <span>Product model: ${escapeHtml(context.productModel.id)} revision ${context.productModel.revision} (${escapeHtml(context.productModel.status)})</span>
        <span>Source snapshot: ${escapeHtml(context.sourceSnapshot.id)} revision ${context.sourceSnapshot.revision}</span>
      </div>
    </footer>
  </main>
</body>
</html>
`;
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function fileRecord(relativePath, contents) {
  const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(contents, 'utf8');
  return {
    path: relativePath,
    sha256: sha256(bytes),
    bytes: bytes.byteLength,
  };
}

/**
 * Validate and render a complete in-memory publication.
 * @param {PrdContext} context
 * @param {Uint8Array|string} contextBytes Exact persisted context bytes.
 * @returns {Publication}
 * @throws {Error} When the context contract or material binding is invalid.
 */
export function createPublication(context, contextBytes, options = {}) {
  const exactContextBytes = typeof contextBytes === 'string'
    ? Buffer.byteLength(contextBytes, 'utf8')
    : contextBytes.byteLength;
  if (exactContextBytes > PRODUCT_CONTEXT_MAX_BYTES) {
    fail(`Context exceeds the ${PRODUCT_CONTEXT_MAX_BYTES}-byte aggregate limit`);
  }
  validateProductContext(context);
  const artifactPublication = buildArtifactPublication(context, options);
  const reservedKinds = new Set(Object.values(PUBLICATION_ARTIFACT_KINDS).map(({artifactKind}) => artifactKind));
  const compactContext = artifactPublication ? context : {
    ...context,
    artifacts: context.artifacts.filter(({artifactKind}) => !reservedKinds.has(artifactKind)),
  };
  const html = artifactPublication ? artifactPublication.files.get('index.html')?.toString('utf8') : renderHtml(compactContext);
  const publicationFiles = artifactPublication?.files ?? new Map([
    ['assets/product.css', Buffer.from(CSS, 'utf8')],
    ['index.html', Buffer.from(html, 'utf8')],
  ]);
  if (!publicationFiles.has('index.html')) fail('Publication output must include index.html');
  const files = [...publicationFiles]
    .sort(([left], [right]) => compareCodePoints(left, right))
    .map(([relativePath, contents]) => fileRecord(relativePath, contents));
  const contextByteSha256 = sha256(contextBytes);
  const receipt = {
    schemaVersion: '1.0',
    receiptId: `prd-publication-${contextByteSha256.slice(0, 12)}`,
    generator: {
      id: GENERATOR_ID,
      version: GENERATOR_VERSION,
    },
    context: {
      id: context.contextId,
      byteSha256: contextByteSha256,
      materialSha256: context.materialSha256,
    },
    sourceSnapshot: {
      id: context.sourceSnapshot.id,
      revision: context.sourceSnapshot.revision,
      sha256: context.sourceSnapshot.sha256,
    },
    productModel: {
      id: context.productModel.id,
      revision: context.productModel.revision,
      sha256: context.productModel.sha256,
    },
    files,
    resources: artifactPublication?.resources ?? [],
  };
  return {
    files: new Map([...publicationFiles].map(([relativePath, contents]) => [
      relativePath,
      Buffer.isBuffer(contents) ? contents : Buffer.from(contents, 'utf8'),
    ])),
    html,
    css: publicationFiles.get('assets/product.css')?.toString('utf8'),
    receipt: stableJson(receipt),
  };
}

async function pathExists(candidate) {
  try {
    await lstat(candidate);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function publicationPath(value, label) {
  assertString(value, label);
  if (value === RECEIPT_FILE || value.includes('\\') || path.isAbsolute(value)
    || /^[a-z][a-z0-9+.-]*:/iu.test(value)) {
    fail(`${label} must be a safe portable generated-file path`);
  }
  const segments = value.split('/');
  const windowsReserved = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..'
    || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(segment) || windowsReserved.test(segment))) {
    fail(`${label} must stay below the publication root`);
  }
  return value;
}

function impliedDirectories(filePaths) {
  const directories = new Set();
  for (const relativePath of filePaths) {
    const segments = relativePath.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join('/'));
    }
  }
  return directories;
}

function assertNoPathCollisions(filePaths, label) {
  const files = new Set(filePaths);
  const folded = new Map();
  for (const relativePath of filePaths) {
    const foldedPath = relativePath.toLowerCase();
    if (folded.has(foldedPath) && folded.get(foldedPath) !== relativePath) fail(`${label} contains a case-folded path collision at ${relativePath}`);
    folded.set(foldedPath, relativePath);
    const segments = relativePath.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      const prefix = segments.slice(0, index).join('/');
      if (files.has(prefix)) fail(`${label} contains a file/directory collision at ${prefix}`);
    }
  }
  for (const directory of impliedDirectories(filePaths)) {
    const foldedDirectory = directory.toLowerCase();
    if (folded.has(foldedDirectory) && folded.get(foldedDirectory) !== directory) {
      fail(`${label} contains a case-folded directory collision at ${directory}`);
    }
    folded.set(foldedDirectory, directory);
  }
}

async function publicationInventory(root) {
  const files = [];
  const directories = [];
  async function visit(directory, prefix = '') {
    const entries = (await readdir(directory, {withFileTypes: true}))
      .sort((left, right) => compareCodePoints(left.name, right.name));
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      const metadata = await lstat(absolute);
      if (metadata.isSymbolicLink()) fail(`Existing publication contains a linked path: ${relative}`);
      if (metadata.isDirectory()) {
        directories.push(relative);
        await visit(absolute, relative);
      } else if (metadata.isFile()) {
        files.push(relative);
      } else {
        fail(`Existing publication contains an unsupported entry: ${relative}`);
      }
    }
  }
  await visit(root);
  return {
    files: files.sort(compareCodePoints),
    directories: directories.sort(compareCodePoints),
  };
}

async function validatePublicationDirectory(outputDirectory, { allowEmpty = false } = {}) {
  const outputStat = await lstat(outputDirectory);
  if (outputStat.isSymbolicLink() || !outputStat.isDirectory()) {
    fail('Output must be a directory and must not be a symbolic link');
  }
  const inventory = await publicationInventory(outputDirectory);
  if (allowEmpty && inventory.files.length === 0 && inventory.directories.length === 0) {
    return { empty: true, receipt: null };
  }
  if (!inventory.files.includes(RECEIPT_FILE)) fail('Existing output is missing its publication receipt');
  const receiptPath = path.join(outputDirectory, RECEIPT_FILE);
  const receiptStat = await lstat(receiptPath);
  if (receiptStat.isSymbolicLink() || !receiptStat.isFile()) {
    fail('Existing publication receipt must be an ordinary file');
  }
  let receipt;
  try {
    receipt = JSON.parse(decodeUtf8(await readFile(receiptPath), 'Existing publication receipt'));
  } catch {
    fail('Existing publication receipt is not valid JSON');
  }
  assertObject(receipt, 'existing receipt', [
    'schemaVersion',
    'receiptId',
    'generator',
    'context',
    'sourceSnapshot',
    'productModel',
    'files',
    'resources',
  ]);
  if (receipt.schemaVersion !== '1.0') {
    fail('Existing publication receipt uses an unsupported schema version');
  }
  assertString(receipt.receiptId, 'existing receipt.receiptId', { id: true });
  assertObject(receipt.generator, 'existing receipt.generator', ['id', 'version']);
  if (receipt.generator.id !== GENERATOR_ID || receipt.generator.version !== GENERATOR_VERSION) {
    fail('Existing output is not owned by this generate-prd version');
  }
  assertObject(receipt.context, 'existing receipt.context', ['id', 'byteSha256', 'materialSha256']);
  assertString(receipt.context.id, 'existing receipt.context.id', { id: true });
  assertString(receipt.context.byteSha256, 'existing receipt.context.byteSha256', { sha256: true });
  assertString(receipt.context.materialSha256, 'existing receipt.context.materialSha256', { sha256: true });
  if (receipt.receiptId !== `prd-publication-${receipt.context.byteSha256.slice(0, 12)}`) {
    fail('Existing publication receipt ID does not match its context byte hash');
  }
  assertObject(receipt.sourceSnapshot, 'existing receipt.sourceSnapshot', ['id', 'revision', 'sha256']);
  assertString(receipt.sourceSnapshot.id, 'existing receipt.sourceSnapshot.id', { id: true });
  if (!Number.isSafeInteger(receipt.sourceSnapshot.revision) || receipt.sourceSnapshot.revision < 1) {
    fail('Existing receipt.sourceSnapshot.revision must be a positive safe integer');
  }
  assertString(receipt.sourceSnapshot.sha256, 'existing receipt.sourceSnapshot.sha256', { sha256: true });
  assertObject(receipt.productModel, 'existing receipt.productModel', ['id', 'revision', 'sha256']);
  assertString(receipt.productModel.id, 'existing receipt.productModel.id', { id: true });
  if (!Number.isSafeInteger(receipt.productModel.revision) || receipt.productModel.revision < 1) {
    fail('Existing receipt.productModel.revision must be a positive safe integer');
  }
  assertString(receipt.productModel.sha256, 'existing receipt.productModel.sha256', { sha256: true });
  assertArray(receipt.files, 'existing receipt.files');
  if (receipt.files.length === 0) fail('Existing publication receipt must describe at least one published file');
  const fileRecords = new Map();
  receipt.files.forEach((file, index) => {
    const label = `existing receipt.files[${index}]`;
    assertObject(file, label, ['path', 'sha256', 'bytes']);
    publicationPath(file.path, `${label}.path`);
    if (fileRecords.has(file.path)) fail(`${label}.path must be unique`);
    assertString(file.sha256, `${label}.sha256`, { sha256: true });
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0) {
      fail(`${label}.bytes must be a non-negative safe integer`);
    }
    fileRecords.set(file.path, file);
  });
  if (!fileRecords.has('index.html')) fail('Existing publication receipt must own index.html');
  const expectedFiles = [...fileRecords.keys()].sort(compareCodePoints);
  assertNoPathCollisions(expectedFiles, 'existing receipt.files');
  const actualFiles = inventory.files.filter((relativePath) => relativePath !== RECEIPT_FILE);
  if (actualFiles.length !== expectedFiles.length
    || actualFiles.some((relativePath, index) => relativePath !== expectedFiles[index])) {
    fail('Existing output contains files not owned by its publication receipt');
  }
  const expectedDirectories = [...impliedDirectories(expectedFiles)].sort(compareCodePoints);
  if (inventory.directories.length !== expectedDirectories.length
    || inventory.directories.some((relativePath, index) => relativePath !== expectedDirectories[index])) {
    fail('Existing output contains directories not owned by its publication receipt');
  }
  for (const relativePath of expectedFiles) {
    const absolutePath = path.join(outputDirectory, ...relativePath.split('/'));
    const stat = await lstat(absolutePath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      fail(`Existing publication file must be an ordinary file: ${relativePath}`);
    }
    const bytes = await readFile(absolutePath);
    const record = fileRecords.get(relativePath);
    if (record.bytes !== bytes.byteLength || record.sha256 !== sha256(bytes)) {
      fail(`Existing publication file does not match its receipt: ${relativePath}`);
    }
  }
  assertArray(receipt.resources, 'existing receipt.resources');
  const resourceKeys = new Set();
  const resourcesByArtifact = new Map();
  const resourcesByDigest = new Map();
  receipt.resources.forEach((resource, index) => {
    const label = `existing receipt.resources[${index}]`;
    assertObject(resource, label, ['artifactId', 'id', 'logicalPath', 'path', 'mediaType', 'byteLength', 'sha256']);
    assertString(resource.artifactId, `${label}.artifactId`, {id: true});
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(resource.artifactId)) fail(`${label}.artifactId must be a stable artifact ID`);
    assertString(resource.id, `${label}.id`, {id: true});
    validatePublicationLogicalPath(resource.logicalPath);
    assertString(resource.mediaType, `${label}.mediaType`);
    if (!Number.isSafeInteger(resource.byteLength) || resource.byteLength < 1 || resource.byteLength > PUBLICATION_RESOURCE_MAX_BYTES) {
      fail(`${label}.byteLength must be a bounded positive safe integer`);
    }
    assertString(resource.sha256, `${label}.sha256`, {sha256: true});
    const resourceKey = `${resource.artifactId}/${resource.id}`;
    if (resourceKeys.has(resourceKey)) fail(`${label} must have a unique artifact/id binding`);
    resourceKeys.add(resourceKey);
    const descriptor = {
      id: resource.id,
      logicalPath: resource.logicalPath,
      path: resource.path,
      mediaType: resource.mediaType,
      byteLength: resource.byteLength,
      sha256: resource.sha256,
    };
    const group = resourcesByArtifact.get(resource.artifactId) ?? [];
    group.push(descriptor);
    resourcesByArtifact.set(resource.artifactId, group);
    const previous = resourcesByDigest.get(resource.sha256);
    if (previous && (previous.path !== resource.path || previous.mediaType !== resource.mediaType || previous.byteLength !== resource.byteLength)) {
      fail(`${label} conflicts with another receipt resource for the same digest`);
    }
    resourcesByDigest.set(resource.sha256, resource);
  });
  for (const resources of resourcesByArtifact.values()) validateResourceDescriptors(resources);
  return { empty: false, receipt };
}

async function assertReplaceableOutput(outputDirectory) {
  if (!(await pathExists(outputDirectory))) {
    return false;
  }
  await validatePublicationDirectory(outputDirectory, { allowEmpty: true });
  return true;
}

function isInside(candidate, possibleParent) {
  const relative = path.relative(possibleParent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function physicalPath(candidate) {
  let cursor = candidate;
  const suffix = [];
  while (!(await pathExists(cursor))) {
    const parent = path.dirname(cursor);
    if (parent === cursor) {
      fail(`Cannot resolve path: ${candidate}`);
    }
    suffix.unshift(path.basename(cursor));
    cursor = parent;
  }
  return path.join(await realpath(cursor), ...suffix);
}

/**
 * Reject every existing symbolic-link or junction component in a path.
 * Missing trailing components are allowed so a new output can be created.
 * @param {string} candidate
 * @param {string} label
 * @returns {Promise<void>}
 * @throws {Error} When an existing component is linked or an ancestor is not a directory.
 */
async function assertUnlinkedPath(candidate, label) {
  const absolute = path.resolve(candidate);
  const parsed = path.parse(absolute);
  const segments = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  for (let index = -1; index < segments.length; index += 1) {
    if (index >= 0) {
      current = path.join(current, segments[index]);
    }
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return;
      }
      if (error?.code === 'ENOTDIR') {
        fail(`${label} has a non-directory ancestor: ${current}`);
      }
      throw error;
    }
    if (stat.isSymbolicLink()) {
      fail(`${label} must not traverse a symbolic-link or junction component: ${current}`);
    }
    if (index < segments.length - 1 && !stat.isDirectory()) {
      fail(`${label} has a non-directory ancestor: ${current}`);
    }
  }
}

function interruptionPattern(outputDirectory) {
  const escaped = path.basename(outputDirectory).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(
    `^\\.${escaped}\\.generate-prd-(stage|backup)-([0-9]+-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$`,
    'u',
  );
}

async function interruptionCandidates(outputDirectory) {
  const parent = path.dirname(outputDirectory);
  if (!(await pathExists(parent))) {
    return [];
  }
  const pattern = interruptionPattern(outputDirectory);
  const reservedPrefix = `.${path.basename(outputDirectory)}.generate-prd-`;
  const candidates = [];
  for (const name of await readdir(parent)) {
    if (!name.startsWith(reservedPrefix)) {
      continue;
    }
    const match = pattern.exec(name);
    if (!match) {
      fail(`Malformed reserved generate-prd transaction entry: ${name}`);
    }
    candidates.push({
      name,
      kind: match[1],
      transactionId: match[2],
      path: path.join(parent, name),
    });
  }
  return candidates.sort((left, right) => compareCodePoints(left.name, right.name));
}

const UNSUPPORTED_DIRECTORY_SYNC_CODES = new Set([
  'EINVAL',
  'EISDIR',
  'ENOTSUP',
]);

async function syncDirectory(directory) {
  let handle;
  try {
    handle = await open(directory, 'r');
    await handle.sync();
  } catch (error) {
    const unsupportedOnWindows = process.platform === 'win32' && error?.code === 'EPERM';
    if (!unsupportedOnWindows && !UNSUPPORTED_DIRECTORY_SYNC_CODES.has(error?.code)) {
      throw error;
    }
  } finally {
    await handle?.close();
  }
}

async function writeFileSynced(file, contents) {
  const handle = await open(file, 'wx');
  try {
    await handle.writeFile(contents, Buffer.isBuffer(contents) ? undefined : 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function recoverInterruptedPublication(outputDirectory) {
  const candidates = await interruptionCandidates(outputDirectory);
  if (candidates.length === 0) {
    return;
  }

  const outputExists = await pathExists(outputDirectory);
  if (outputExists) {
    try {
      await validatePublicationDirectory(outputDirectory, {allowEmpty: true});
    } catch (error) {
      fail(`Cannot recover interrupted publication while installed output is invalid: ${error.message}`);
    }
    const stages = candidates.filter(({ kind }) => kind === 'stage');
    const backups = candidates.filter(({ kind }) => kind === 'backup');
    if (stages.length > 1 || backups.length > 1 || (stages.length === 1 && backups.length === 1)) {
      fail('Refusing ambiguous interrupted publication state beside valid installed output');
    }
    for (const candidate of candidates) {
      try {
        await validatePublicationDirectory(candidate.path, {allowEmpty: candidate.kind === 'backup'});
      } catch (error) {
        fail(`Refusing ambiguous interrupted publication state at ${candidate.name}: ${error.message}`);
      }
    }
    for (const candidate of candidates) {
      await rm(candidate.path, { recursive: true, force: true });
    }
    await syncDirectory(path.dirname(outputDirectory));
    return;
  }

  const stages = candidates.filter(({ kind }) => kind === 'stage');
  const backups = candidates.filter(({ kind }) => kind === 'backup');
  if (stages.length > 1 || backups.length > 1) {
    fail('Cannot recover interrupted publication because multiple stages or backups exist');
  }
  for (const candidate of candidates) {
    try {
      await validatePublicationDirectory(candidate.path, {allowEmpty: candidate.kind === 'backup'});
    } catch (error) {
      fail(`Refusing ambiguous interrupted publication state at ${candidate.name}: ${error.message}`);
    }
  }
  if (backups.length !== 1) {
    const reason = backups.length === 0
      ? 'a completed stage exists without a committed backup'
      : 'multiple valid backups exist';
    fail(`Cannot recover interrupted publication because ${reason}`);
  }

  const [backup] = backups;
  if (stages.length === 1 && stages[0].transactionId !== backup.transactionId) {
    fail('Cannot recover interrupted publication because stage and backup transaction IDs differ');
  }
  await rename(backup.path, outputDirectory);
  await syncDirectory(path.dirname(outputDirectory));
  await validatePublicationDirectory(outputDirectory, {allowEmpty: true});
  for (const candidate of candidates) {
    if (candidate.path !== backup.path) {
      await rm(candidate.path, { recursive: true, force: true });
    }
  }
  await syncDirectory(path.dirname(outputDirectory));
}

function planPublicationFiles(publication) {
  if (!(publication.files instanceof Map) || publication.files.size === 0) fail('Publication files must be a non-empty Map');
  const files = [...publication.files]
    .map(([relativePath, contents]) => {
      publicationPath(relativePath, `publication file ${String(relativePath)}`);
      if (typeof contents !== 'string' && !Buffer.isBuffer(contents)) fail(`Publication file ${relativePath} must contain text or bytes`);
      return [relativePath, Buffer.isBuffer(contents) ? contents : Buffer.from(contents, 'utf8')];
    })
    .sort(([left], [right]) => compareCodePoints(left, right));
  const paths = files.map(([relativePath]) => relativePath);
  if (!paths.includes('index.html')) fail('Publication files must include index.html');
  assertNoPathCollisions(paths, 'publication files');
  const directories = [...impliedDirectories(paths)].sort((left, right) => {
    const depthDifference = left.split('/').length - right.split('/').length;
    return depthDifference || compareCodePoints(left, right);
  });
  return {files, directories};
}

async function publish(outputDirectory, publication) {
  const parent = path.dirname(outputDirectory);
  await mkdir(parent, { recursive: true });

  const nonce = `${process.pid}-${randomUUID()}`;
  const stage = path.join(parent, `.${path.basename(outputDirectory)}.generate-prd-stage-${nonce}`);
  const backup = path.join(parent, `.${path.basename(outputDirectory)}.generate-prd-backup-${nonce}`);
  let movedExisting = false;
  let installedStage = false;

  const {files: plannedFiles, directories} = planPublicationFiles(publication);

  try {
    await mkdir(stage);
    for (const relativeDirectory of directories) {
      await mkdir(path.join(stage, ...relativeDirectory.split('/')));
    }
    for (const [relativePath, contents] of plannedFiles) {
      await writeFileSynced(path.join(stage, ...relativePath.split('/')), contents);
    }
    await writeFileSynced(path.join(stage, RECEIPT_FILE), publication.receipt);
    for (const relativeDirectory of [...directories].reverse()) {
      await syncDirectory(path.join(stage, ...relativeDirectory.split('/')));
    }
    await syncDirectory(stage);
    await validatePublicationDirectory(stage);

    if (await pathExists(outputDirectory)) {
      await rename(outputDirectory, backup);
      movedExisting = true;
      await syncDirectory(parent);
    }
    await rename(stage, outputDirectory);
    installedStage = true;
    await syncDirectory(parent);
  } catch (error) {
    if (installedStage && (await pathExists(outputDirectory))) {
      await rm(outputDirectory, { recursive: true, force: true });
    }
    if (movedExisting && (await pathExists(backup)) && !(await pathExists(outputDirectory))) {
      await rename(backup, outputDirectory);
      await syncDirectory(parent);
    }
    if (await pathExists(stage)) {
      await rm(stage, { recursive: true, force: true });
    }
    throw error;
  }
  if (movedExisting) {
    try {
      await rm(backup, { recursive: true, force: true });
      await syncDirectory(parent);
    } catch {
      // The new publication is committed. A stale backup is safer than
      // destroying valid output because best-effort cleanup failed.
    }
  }
}

/**
 * Publish one persisted PRD context to a dedicated output directory.
 * @param {{contextPath: string, outputDirectory: string}} options
 * @returns {Promise<PublicationReceipt>}
 * @throws {Error} When validation, recovery, staging, or publication fails.
 */
export async function generatePrd({ contextPath, outputDirectory }) {
  const resolvedContext = path.resolve(contextPath);
  const resolvedOutput = path.resolve(outputDirectory);
  if (path.parse(resolvedOutput).root === resolvedOutput) {
    fail('Output must not be a filesystem root');
  }
  await assertUnlinkedPath(resolvedContext, 'Input context');
  await assertUnlinkedPath(resolvedOutput, 'Output');
  const contextStat = await lstat(resolvedContext);
  if (contextStat.isSymbolicLink() || !contextStat.isFile()) {
    fail('Input context must be an ordinary file and must not be a symbolic link');
  }
  if ((await pathExists(resolvedOutput)) && (await lstat(resolvedOutput)).isSymbolicLink()) {
    fail('Output must not be a symbolic link');
  }
  const physicalContext = await realpath(resolvedContext);
  const physicalOutput = await physicalPath(resolvedOutput);
  if (isInside(physicalContext, physicalOutput)) {
    fail('The input context must not be stored inside the output directory');
  }

  const contextBytes = await readFile(physicalContext);
  if (contextBytes.byteLength > PRODUCT_CONTEXT_MAX_BYTES) {
    fail(`Context exceeds the ${PRODUCT_CONTEXT_MAX_BYTES}-byte aggregate limit`);
  }
  const decoded = decodeUtf8(contextBytes, 'Context');
  let context;
  try {
    context = JSON.parse(decoded);
  } catch {
    fail('Context is not valid JSON');
  }

  const publication = createPublication(context, contextBytes, {
    contextDirectory: path.dirname(physicalContext),
  });
  planPublicationFiles(publication);
  await recoverInterruptedPublication(physicalOutput);
  await assertReplaceableOutput(physicalOutput);
  await publish(physicalOutput, publication);
  return JSON.parse(publication.receipt);
}

/**
 * Parse the closed generate-prd command-line interface.
 * @param {string[]} argv
 * @returns {{contextPath: string, outputDirectory: string}}
 * @throws {Error} When an option is missing, repeated, or unknown.
 */
export function parseArguments(argv) {
  const allowed = new Set(['--context', '--output']);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(flag) || value === undefined || value.startsWith('--') || values.has(flag)) {
      fail('Usage: generate-prd.mjs --context <context.json> --output <directory>');
    }
    values.set(flag, value);
  }
  if (argv.length !== 4 || !values.has('--context') || !values.has('--output')) {
    fail('Usage: generate-prd.mjs --context <context.json> --output <directory>');
  }
  return {
    contextPath: values.get('--context'),
    outputDirectory: values.get('--output'),
  };
}

async function main() {
  try {
    const receipt = await generatePrd(parseArguments(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify({
      status: 'published',
      receiptId: receipt.receiptId,
      contextId: receipt.context.id,
    })}\n`);
  } catch (error) {
    process.stderr.write(`generate-prd: ${error.message}\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
