import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  PRODUCT_CONTEXT_MAX_ARRAY_LENGTH,
  PRODUCT_CONTEXT_MAX_BYTES,
  calculateProductArtifactMaterialSha256,
  calculateProductContextMaterialSha256,
  canonicalProductContextJson,
  createPublication,
  generatePrd,
  parseArguments,
  validateProductContext,
} from './generate-prd.mjs';

const HASH = '1'.repeat(64);
const PRODUCT_MATERIAL = '4'.repeat(64);
const ROOT_MATERIAL = '5'.repeat(64);
const PURPOSE_MATERIAL = '6'.repeat(64);
const USER_MATERIAL = '7'.repeat(64);
const CAPABILITY_MATERIAL = '8'.repeat(64);
const GAP_MATERIAL = '9'.repeat(64);
const SCRIPTS_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const SIBLING_CONTRACT = path.resolve(
  SCRIPTS_DIRECTORY,
  '..',
  '..',
  'refine-design',
  'scripts',
  'product-context-contract.mjs',
);

function fixture(overrides = {}) {
  const context = {
    schemaVersion: '1.0',
    contextId: 'pending',
    consumer: 'prd',
    sourceSnapshot: {
      id: 'snapshot-neutral-1',
      revision: 1,
      sha256: '2'.repeat(64),
    },
    productModel: {
      id: 'product-neutral',
      revision: 1,
      status: 'partial',
      sha256: '3'.repeat(64),
      materialSha256: PRODUCT_MATERIAL,
    },
    scopeRefs: ['product-neutral'],
    product: {
      id: 'product-neutral',
      name: 'Field Journal',
      status: 'partial',
      owner: 'product',
      materialSha256: ROOT_MATERIAL,
      purpose: {
        id: 'product-neutral-purpose',
        summary: 'Help a researcher preserve observations.',
        status: 'accepted',
        owner: 'product',
        materialSha256: PURPOSE_MATERIAL,
      },
      users: [
        {
          id: 'researcher',
          name: 'Researcher',
          description: 'A person recording field observations.',
          status: 'accepted',
          owner: 'product',
          materialSha256: USER_MATERIAL,
        },
      ],
    },
    capabilities: [
      {
        id: 'record-observation',
        name: 'Record an observation',
        description: 'Capture a dated note for later review.',
        outcome: 'The observation remains available for later review.',
        status: 'accepted',
        owner: 'product',
        materialSha256: CAPABILITY_MATERIAL,
      },
    ],
    gaps: [
      {
        id: 'offline-window',
        kind: 'open-question',
        question: 'How long must unavailable uploads remain queued?',
        impact: 'The answer sets the visible offline retention promise.',
        status: 'unresolved',
        owner: 'product',
        materialSha256: GAP_MATERIAL,
        affectsRefs: ['record-observation'],
      },
    ],
    artifacts: [],
    locks: [],
    exclusions: [],
    provenance: {
      sourceId: 'human-product-source',
      sourceRevision: 1,
      sourceSha256: HASH,
    },
    materialSha256: 'pending',
    ...overrides,
  };
  context.materialSha256 = calculateProductContextMaterialSha256(context);
  context.contextId = `prd-context-${context.materialSha256.slice(0, 12)}`;
  return context;
}

function artifactFixture(overrides = {}) {
  const artifact = {
    schemaVersion: '1.0',
    kind: 'product-artifact',
    id: 'interaction-map',
    artifactKind: 'product-experience-plan',
    owner: 'ux',
    artifactSchemaVersion: '1.0',
    revision: 1,
    status: 'partial',
    consumerDomains: ['prd', 'ux'],
    scopeRefs: ['product-neutral', 'record-observation', 'offline-window'],
    coverageRefs: ['record-observation'],
    gapRefs: ['offline-window'],
    lockRefs: [],
    recordDependencies: [
      {id: 'product-neutral', materialSha256: ROOT_MATERIAL},
      {id: 'record-observation', materialSha256: CAPABILITY_MATERIAL},
      {id: 'offline-window', materialSha256: GAP_MATERIAL},
    ],
    artifactDependencies: [],
    producer: {id: 'ux-planner', contractVersion: '1.0', method: 'assessment'},
    resources: [],
    payload: {
      summary: 'Record observations from one focused workspace.',
      frames: [{id: 'recording', goal: 'Capture an observation'}],
    },
    materialSha256: 'pending',
    change: {kind: 'added', previousRevision: null, previousMaterialSha256: null},
    ...overrides,
  };
  artifact.materialSha256 = calculateProductArtifactMaterialSha256(artifact);
  return artifact;
}

async function writeContext(root, context, name = 'prd-context.json') {
  const contextPath = path.join(root, name);
  await writeFile(contextPath, `${JSON.stringify(context, null, 2)}\n`, 'utf8');
  return contextPath;
}

async function run(contextPath, outputDirectory) {
  return generatePrd({ contextPath, outputDirectory });
}

async function createDirectoryLink(t, target, link, type) {
  try {
    await symlink(target, link, type);
    return true;
  } catch (error) {
    if (['EACCES', 'EINVAL', 'ENOTSUP', 'EPERM'].includes(error?.code)) {
      t.skip(`${type} directory links are unavailable: ${error.code}`);
      return false;
    }
    throw error;
  }
}

async function fileMap(root) {
  const result = new Map();
  async function visit(directory, prefix = '') {
    for (const entry of (await readdir(directory, { withFileTypes: true }))
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute, relative);
      } else {
        result.set(relative, await readFile(absolute));
      }
    }
  }
  await visit(root);
  return result;
}

function digestMap(files) {
  return Object.fromEntries([...files].map(([name, bytes]) => [
    name,
    createHash('sha256').update(bytes).digest('hex'),
  ]));
}

function byteRecord(relativePath, text) {
  const bytes = Buffer.from(text, 'utf8');
  return {
    path: relativePath,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.byteLength,
  };
}

function interruptedPath(output, kind, transactionId) {
  return path.join(
    path.dirname(output),
    `.${path.basename(output)}.generate-prd-${kind}-${transactionId}`,
  );
}

const TRANSACTION_A = '100-11111111-1111-4111-8111-111111111111';
const TRANSACTION_B = '101-22222222-2222-4222-8222-222222222222';

test('canonical JSON is insensitive to object insertion order and preserves array order', () => {
  assert.equal(
    canonicalProductContextJson({ z: 1, a: { y: 2, x: ['b', 'a'] } }),
    '{"a":{"x":["b","a"],"y":2},"z":1}',
  );
});

test('local context contract is byte-identical to the refine-design canonical contract', {
  skip: existsSync(SIBLING_CONTRACT) ? false : 'refine-design sibling is not installed beside generate-prd',
}, async () => {
  const local = await readFile(path.join(SCRIPTS_DIRECTORY, 'product-context-contract.mjs'));
  const canonical = await readFile(SIBLING_CONTRACT);
  assert.equal(local.equals(canonical), true);
});

test('validates the closed context contract', () => {
  const context = fixture();
  assert.equal(validateProductContext(context), context);
  const withUnknownField = { ...context, invented: true };
  assert.throws(
    () => validateProductContext(withUnknownField),
    /must contain exactly/u,
  );
  assert.throws(
    () => validateProductContext(fixture({ scopeRefs: ['unknown-record'] })),
    /scopeRefs contains unknown record ID/u,
  );
});

test('canonical context validation rejects loose IDs, statuses, integers, and oversized arrays', () => {
  const looseId = fixture();
  looseId.productModel.id = 'Model_Invalid';
  looseId.product.id = 'Model_Invalid';
  assert.throws(
    () => validateProductContext(looseId),
    /lowercase hyphenated ID/u,
  );

  const looseStatus = fixture();
  looseStatus.capabilities[0].status = 'proposed';
  assert.throws(
    () => validateProductContext(looseStatus),
    /unsupported value proposed/u,
  );

  const unsafeRevision = fixture();
  unsafeRevision.productModel.revision = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(
    () => validateProductContext(unsafeRevision),
    /positive safe integer/u,
  );

  const oversized = fixture();
  oversized.scopeRefs = Array(PRODUCT_CONTEXT_MAX_ARRAY_LENGTH + 1).fill(oversized.product.id);
  assert.throws(
    () => validateProductContext(oversized),
    /at most 10000 entries/u,
  );
});

test('context validation requires exact record bindings for every artifact reference', () => {
  const artifact = artifactFixture();
  artifact.recordDependencies = artifact.recordDependencies.filter(dependency => dependency.id !== 'product-neutral');
  artifact.materialSha256 = calculateProductArtifactMaterialSha256(artifact);
  const context = fixture({artifacts: [artifact]});

  assert.throws(
    () => validateProductContext(context),
    /reference product-neutral lacks an exact record dependency binding/u,
  );
});

test('publisher rejects a context file above the shared aggregate byte limit before creating output', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-context-byte-limit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const serialized = Buffer.from(JSON.stringify(fixture()), 'utf8');
  const oversized = Buffer.concat([
    serialized,
    Buffer.alloc(PRODUCT_CONTEXT_MAX_BYTES + 1 - serialized.byteLength, 0x20),
  ]);
  const contextPath = path.join(root, 'oversized-context.json');
  const output = path.join(root, 'output');
  await writeFile(contextPath, oversized);

  assert.throws(
    () => createPublication(fixture(), Buffer.alloc(PRODUCT_CONTEXT_MAX_BYTES + 1)),
    new RegExp(`${PRODUCT_CONTEXT_MAX_BYTES}-byte aggregate limit`, 'u'),
  );

  await assert.rejects(
    run(contextPath, output),
    new RegExp(`${PRODUCT_CONTEXT_MAX_BYTES}-byte aggregate limit`, 'u'),
  );
  assert.equal(existsSync(output), false);
});

test('CLI arguments are closed and order-independent', () => {
  assert.deepEqual(
    parseArguments(['--output', 'published', '--context', 'context.json']),
    {
      contextPath: 'context.json',
      outputDirectory: 'published',
    },
  );
  assert.throws(
    () => parseArguments(['--context', 'one.json', '--context', 'two.json']),
    /Usage:/u,
  );
  assert.throws(
    () => parseArguments(['--context', 'one.json', '--invented', 'value']),
    /Usage:/u,
  );
  assert.throws(
    () => parseArguments(['--context', 'one.json']),
    /Usage:/u,
  );
});

test('publication does not mutate its context', () => {
  const context = fixture();
  const before = canonicalProductContextJson(context);
  createPublication(context, Buffer.from(`${JSON.stringify(context)}\n`, 'utf8'));
  assert.equal(canonicalProductContextJson(context), before);
});

test('publishes byte-identical output without a product-description source', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-stability-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const outputA = path.join(root, 'output-a');
  const outputB = path.join(root, 'output-b');

  await run(contextPath, outputA);
  await run(contextPath, outputB);

  const filesA = await fileMap(outputA);
  const filesB = await fileMap(outputB);
  assert.deepEqual([...filesA.keys()], [
    'assets/product.css',
    'index.html',
    'publication-receipt.json',
  ]);
  assert.deepEqual(digestMap(filesA), digestMap(filesB));

  const receipt = JSON.parse(filesA.get('publication-receipt.json').toString('utf8'));
  assert.equal(receipt.context.materialSha256, fixture().materialSha256);
  assert.equal(receipt.generator.id, 'generate-prd');
  assert.equal(receipt.generator.version, '1.1.0');
  assert.equal(receipt.sourceSnapshot.revision, 1);
  assert.equal(receipt.files.length, 2);
});

test('publishes current partial artifact coverage and its explicit gaps', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-partial-artifact-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const context = fixture({artifacts: [artifactFixture()]});
  context.materialSha256 = calculateProductContextMaterialSha256(context);
  context.contextId = `prd-context-${context.materialSha256.slice(0, 12)}`;
  const output = path.join(root, 'output');

  await run(await writeContext(root, context), output);
  const html = await readFile(path.join(output, 'index.html'), 'utf8');

  assert.match(html, /Design artifact coverage/u);
  assert.match(html, /interaction-map/u);
  assert.match(html, /Record observations from one focused workspace/u);
  assert.match(html, /Partial artifact gaps/u);
  assert.match(html, /offline-window/u);
  assert.match(html, /How long must unavailable uploads remain queued\?/u);
});

test('publishes unavailable artifact exclusions without excluded payload content', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-stale-exclusion-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const context = fixture({
    exclusions: [{
      id: 'stale-visual-design',
      artifactKind: 'visual-notes',
      revision: 2,
      status: 'accepted',
      outcome: 'stale',
      materialSha256: 'a'.repeat(64),
      reasons: ['record:record-observation:material-changed'],
    }],
  });
  context.materialSha256 = calculateProductContextMaterialSha256(context);
  context.contextId = `prd-context-${context.materialSha256.slice(0, 12)}`;
  const output = path.join(root, 'output');

  await run(await writeContext(root, context), output);
  const html = await readFile(path.join(output, 'index.html'), 'utf8');

  assert.match(html, /Unavailable design artifacts/u);
  assert.match(html, /stale-visual-design/u);
  assert.match(html, /record:record-observation:material-changed/u);
  assert.doesNotMatch(html, /excluded-secret-payload/u);
});

test('escapes every persisted text value before HTML publication', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-escaping-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const context = fixture();
  context.product.name = '<script>alert("name")</script>';
  context.product.purpose.summary = 'Use <b>records</b> & "notes".';
  context.product.users[0].description = '<img src=x onerror=alert(1)>';
  context.materialSha256 = calculateProductContextMaterialSha256(context);
  context.contextId = `prd-context-${context.materialSha256.slice(0, 12)}`;
  const contextPath = await writeContext(root, context);
  const output = path.join(root, 'output');
  await run(contextPath, output);
  const html = await readFile(path.join(output, 'index.html'), 'utf8');

  assert.doesNotMatch(html, /<script>|<img|<b>/u);
  assert.match(html, /&lt;script&gt;alert\(&quot;name&quot;\)&lt;\/script&gt;/u);
  assert.match(html, /&lt;b&gt;records&lt;\/b&gt; &amp; &quot;notes&quot;/u);
});

test('digest tampering fails before an existing output is mutated', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-tamper-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const validContext = fixture();
  const validPath = await writeContext(root, validContext, 'valid.json');
  const output = path.join(root, 'output');
  await run(validPath, output);
  const before = digestMap(await fileMap(output));

  const tampered = structuredClone(validContext);
  tampered.product.name = 'Undigested change';
  const tamperedPath = await writeContext(root, tampered, 'tampered.json');
  await assert.rejects(
    run(tamperedPath, output),
    /materialSha256 does not match material content/u,
  );
  assert.deepEqual(digestMap(await fileMap(output)), before);
});

test('malformed UTF-8 fails before an existing output is mutated', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-utf8-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const validPath = await writeContext(root, fixture(), 'valid.json');
  const output = path.join(root, 'output');
  await run(validPath, output);
  const before = digestMap(await fileMap(output));
  const invalidPath = path.join(root, 'invalid.json');
  await writeFile(invalidPath, Buffer.from([
    0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d,
  ]));

  await assert.rejects(
    run(invalidPath, output),
    /Context is not valid UTF-8/u,
  );
  assert.deepEqual(digestMap(await fileMap(output)), before);
});

test('refuses an input context physically stored inside the output', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-contained-input-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = path.join(root, 'output');
  await mkdir(output);
  const contextPath = await writeContext(output, fixture());

  await assert.rejects(
    run(contextPath, output),
    /input context must not be stored inside the output directory/u,
  );
  assert.equal(JSON.parse(await readFile(contextPath, 'utf8')).consumer, 'prd');
});

for (const linkType of ['junction', 'dir']) {
  const displayType = linkType === 'dir' ? 'symbolic-link' : 'junction';

  test(`refuses an input context beneath a ${displayType} ancestor`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), `generate-prd-context-${linkType}-`));
    t.after(() => rm(root, { recursive: true, force: true }));
    const actualInput = path.join(root, 'actual-input');
    await mkdir(actualInput);
    const contextPath = await writeContext(actualInput, fixture());
    const linkedInput = path.join(root, 'linked-input');
    if (!(await createDirectoryLink(t, actualInput, linkedInput, linkType))) {
      return;
    }
    const linkedContext = path.join(linkedInput, path.basename(contextPath));
    const output = path.join(root, 'output');

    await assert.rejects(
      run(linkedContext, output),
      /must not traverse a symbolic-link or junction component/u,
    );
    assert.equal(existsSync(output), false);
  });

  test(`refuses an output beneath a ${displayType} ancestor`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), `generate-prd-output-${linkType}-`));
    t.after(() => rm(root, { recursive: true, force: true }));
    const contextPath = await writeContext(root, fixture());
    const actualOutputParent = path.join(root, 'actual-output-parent');
    await mkdir(actualOutputParent);
    const linkedOutputParent = path.join(root, 'linked-output-parent');
    if (!(await createDirectoryLink(t, actualOutputParent, linkedOutputParent, linkType))) {
      return;
    }
    const output = path.join(linkedOutputParent, 'publication');

    await assert.rejects(
      run(contextPath, output),
      /must not traverse a symbolic-link or junction component/u,
    );
    assert.equal(existsSync(path.join(actualOutputParent, 'publication')), false);
  });
}

test('refuses to replace an unowned output directory', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-ownership-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  await mkdir(output);
  await writeFile(path.join(output, 'keep.txt'), 'owner data', 'utf8');

  await assert.rejects(
    run(contextPath, output),
    /missing its publication receipt|files not owned/u,
  );
  assert.equal(await readFile(path.join(output, 'keep.txt'), 'utf8'), 'owner data');
});

test('refuses a forged ownership receipt and preserves its files', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-forged-receipt-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  await mkdir(path.join(output, 'assets'), { recursive: true });
  await writeFile(path.join(output, 'index.html'), 'unrelated HTML', 'utf8');
  await writeFile(path.join(output, 'assets', 'product.css'), 'unrelated CSS', 'utf8');
  await writeFile(
    path.join(output, 'publication-receipt.json'),
    JSON.stringify({ generator: { id: 'generate-prd' } }),
    'utf8',
  );

  await assert.rejects(
    run(contextPath, output),
    /existing receipt must contain exactly/u,
  );
  assert.equal(await readFile(path.join(output, 'index.html'), 'utf8'), 'unrelated HTML');
});

test('treats a fully format-valid forged receipt as replaceable structural ownership', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-structural-owner-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  const forgedHtml = 'format-shaped HTML';
  const forgedCss = 'format-shaped CSS';
  const forgedNested = Buffer.from([0, 1, 2, 3, 255]);
  const byteSha256 = '4'.repeat(64);
  const receipt = {
    schemaVersion: '1.0',
    receiptId: `prd-publication-${byteSha256.slice(0, 12)}`,
    generator: {
      id: 'generate-prd',
      version: '1.1.0',
    },
    context: {
      id: 'prd-context-123456789abc',
      byteSha256,
      materialSha256: '5'.repeat(64),
    },
    sourceSnapshot: {
      id: 'snapshot-forged',
      revision: 1,
      sha256: '6'.repeat(64),
    },
    productModel: {
      id: 'model-forged',
      revision: 1,
      sha256: '7'.repeat(64),
    },
    files: [
      byteRecord('assets/product.css', forgedCss),
      byteRecord('index.html', forgedHtml),
      byteRecord('nested/review/data.bin', forgedNested),
    ],
    resources: [],
  };
  await mkdir(path.join(output, 'assets'), { recursive: true });
  await mkdir(path.join(output, 'nested', 'review'), {recursive: true});
  await writeFile(path.join(output, 'index.html'), forgedHtml, 'utf8');
  await writeFile(path.join(output, 'assets', 'product.css'), forgedCss, 'utf8');
  await writeFile(path.join(output, 'nested', 'review', 'data.bin'), forgedNested);
  await writeFile(
    path.join(output, 'publication-receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
    'utf8',
  );

  await run(contextPath, output);
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.notEqual(html, forgedHtml);
  assert.match(html, /Field Journal/u);
});

test('recovers one valid backup when output is absent', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-recover-backup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  await run(contextPath, output);
  const backup = interruptedPath(output, 'backup', TRANSACTION_A);
  await rename(output, backup);

  await run(contextPath, output);
  assert.equal(existsSync(output), true);
  assert.equal(existsSync(backup), false);
});

test('recovers a valid backup and removes its matching completed stage', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-recover-pair-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  await run(contextPath, output);
  const backup = interruptedPath(output, 'backup', TRANSACTION_A);
  const stage = interruptedPath(output, 'stage', TRANSACTION_A);
  await cp(output, stage, { recursive: true });
  await rename(output, backup);

  await run(contextPath, output);
  assert.equal(existsSync(output), true);
  assert.equal(existsSync(backup), false);
  assert.equal(existsSync(stage), false);
});

test('recovers an interrupted replacement whose prior destination was empty', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-recover-empty-backup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  const seed = path.join(root, 'seed');
  await run(contextPath, seed);
  const backup = interruptedPath(output, 'backup', TRANSACTION_A);
  const stage = interruptedPath(output, 'stage', TRANSACTION_A);
  await mkdir(backup);
  await cp(seed, stage, { recursive: true });

  await run(contextPath, output);

  assert.equal(existsSync(output), true);
  assert.equal(existsSync(backup), false);
  assert.equal(existsSync(stage), false);
  assert.match(await readFile(path.join(output, 'index.html'), 'utf8'), /Field Journal/u);
});

test('cleans an empty prior-destination backup after the new publication was installed', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-clean-empty-backup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  await run(contextPath, output);
  const backup = interruptedPath(output, 'backup', TRANSACTION_A);
  await mkdir(backup);

  await run(contextPath, output);

  assert.equal(existsSync(output), true);
  assert.equal(existsSync(backup), false);
});

test('fails closed on a completed stage without a committed backup', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-stage-only-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  await run(contextPath, output);
  const stage = interruptedPath(output, 'stage', TRANSACTION_A);
  await rename(output, stage);

  await assert.rejects(
    run(contextPath, output),
    /completed stage exists without a committed backup/u,
  );
  assert.equal(existsSync(output), false);
  assert.equal(existsSync(stage), true);
});

test('fails closed on multiple valid backups without output', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-many-backups-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  await run(contextPath, output);
  const backupA = interruptedPath(output, 'backup', TRANSACTION_A);
  const backupB = interruptedPath(output, 'backup', TRANSACTION_B);
  await cp(output, backupA, { recursive: true });
  await rename(output, backupB);

  await assert.rejects(
    run(contextPath, output),
    /multiple stages or backups exist/u,
  );
  assert.equal(existsSync(output), false);
  assert.equal(existsSync(backupA), true);
  assert.equal(existsSync(backupB), true);
});

test('fails closed on mismatched stage and backup transactions', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-mismatch-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  await run(contextPath, output);
  const backup = interruptedPath(output, 'backup', TRANSACTION_A);
  const stage = interruptedPath(output, 'stage', TRANSACTION_B);
  await cp(output, stage, { recursive: true });
  await rename(output, backup);

  await assert.rejects(
    run(contextPath, output),
    /transaction IDs differ/u,
  );
  assert.equal(existsSync(output), false);
  assert.equal(existsSync(backup), true);
  assert.equal(existsSync(stage), true);
});

test('removes one validated stale stage beside valid installed output', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-stale-stage-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  await run(contextPath, output);
  const stage = interruptedPath(output, 'stage', TRANSACTION_A);
  await cp(output, stage, { recursive: true });

  await run(contextPath, output);
  assert.equal(existsSync(stage), false);
  assert.equal(existsSync(output), true);
});

test('removes one validated stale backup beside valid installed output', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-stale-backup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  await run(contextPath, output);
  const backup = interruptedPath(output, 'backup', TRANSACTION_A);
  await cp(output, backup, { recursive: true });

  await run(contextPath, output);
  assert.equal(existsSync(backup), false);
  assert.equal(existsSync(output), true);
});

test('fails closed when both a stage and backup remain beside valid output', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-installed-ambiguous-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  await run(contextPath, output);
  const stage = interruptedPath(output, 'stage', TRANSACTION_A);
  const backup = interruptedPath(output, 'backup', TRANSACTION_A);
  await cp(output, stage, { recursive: true });
  await cp(output, backup, { recursive: true });
  const before = digestMap(await fileMap(output));

  await assert.rejects(
    run(contextPath, output),
    /ambiguous interrupted publication state beside valid installed output/u,
  );
  assert.deepEqual(digestMap(await fileMap(output)), before);
  assert.equal(existsSync(stage), true);
  assert.equal(existsSync(backup), true);
});

test('fails closed on malformed reserved transaction entries', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-malformed-transaction-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  await run(contextPath, output);
  const malformed = path.join(root, '.output.generate-prd-stage-not-a-transaction');
  await mkdir(malformed);
  const before = digestMap(await fileMap(output));

  await assert.rejects(
    run(contextPath, output),
    /Malformed reserved generate-prd transaction entry/u,
  );
  assert.deepEqual(digestMap(await fileMap(output)), before);
  assert.equal(existsSync(malformed), true);
});

test('preserves valid installed output when a stale candidate is invalid', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'generate-prd-invalid-stale-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contextPath = await writeContext(root, fixture());
  const output = path.join(root, 'output');
  await run(contextPath, output);
  const before = digestMap(await fileMap(output));
  const stage = interruptedPath(output, 'stage', TRANSACTION_A);
  await mkdir(stage);
  await writeFile(path.join(stage, 'partial.txt'), 'incomplete', 'utf8');

  await assert.rejects(
    run(contextPath, output),
    /ambiguous interrupted publication state/u,
  );
  assert.deepEqual(digestMap(await fileMap(output)), before);
  assert.equal(await readFile(path.join(stage, 'partial.txt'), 'utf8'), 'incomplete');
});
