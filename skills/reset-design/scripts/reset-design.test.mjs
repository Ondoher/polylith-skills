import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  applyReset,
  parseArguments,
  planReset,
  recoverStaleLock,
  USAGE,
} from './reset-design.mjs';

const LOCK_SCHEMA = 'reset-design-lock/v1';
const LOCK_KIND = 'reset-design-lock';

async function pathExists(absolute) {
  try {
    await stat(absolute);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'reset-design-test-'));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(path.join(root, 'input'), { recursive: true });
  const sourceBytes = Buffer.from([0, 255, 10, 13, 65, 66, 67, 0, 128]);
  await writeFile(path.join(root, 'input', 'product-description.md'), sourceBytes);
  return { root, sourceBytes };
}

function absentPid() {
  for (const candidate of [2_147_483_647, 99_999_999, 4_194_303]) {
    try {
      process.kill(candidate, 0);
    } catch (error) {
      if (error?.code === 'ESRCH') {
        return candidate;
      }
    }
  }
  throw new Error('Could not identify an absent PID for stale-lock testing.');
}

async function writeResetLock(root, {
  token = 'a'.repeat(64),
  pid = absentPid(),
  processStartedAt = new Date(Date.now() - 60_000).toISOString(),
  createdAt = new Date().toISOString(),
  extra,
} = {}) {
  const record = {
    schema: LOCK_SCHEMA,
    kind: LOCK_KIND,
    token,
    pid,
    processStartedAt,
    createdAt,
  };
  if (extra) {
    Object.assign(record, extra);
  }
  await writeFile(path.join(root, '.reset-design.lock'), JSON.stringify(record));
  return record;
}

async function recover(root, token, extra = {}) {
  try {
    const json = await recoverStaleLock({
      root,
      targets: [],
      preserve: [],
      apply: false,
      recoverStaleLock: token,
      ...extra,
    });
    return { status: 0, stderr: '', json };
  } catch (error) {
    return {
      status: 1,
      stderr: error instanceof Error ? error.message : String(error),
      json: { code: error?.code },
    };
  }
}

async function run(root, targets, {
  apply = false,
  source = 'input/product-description.md',
  preserve = [],
  expectedPlanSha256,
} = {}) {
  try {
    const json = await (apply ? applyReset : planReset)({
      root,
      source,
      preserve,
      targets,
      expectedPlanSha256,
    });
    return { status: 0, stderr: '', json };
  } catch (error) {
    return {
      status: 1,
      stderr: error instanceof Error ? error.message : String(error),
      json: { code: error?.code },
    };
  }
}

test('plan and apply are deterministic, complete, source-preserving, and idempotent', async (t) => {
  const { root, sourceBytes } = await fixture(t);
  await mkdir(path.join(root, 'derived', 'prd', 'nested'), { recursive: true });
  await writeFile(path.join(root, 'derived', 'prd', 'index.html'), 'page');
  await writeFile(path.join(root, 'derived', 'prd', 'nested', 'asset.css'), 'style');
  await mkdir(path.join(root, 'derived'), { recursive: true });
  await writeFile(path.join(root, 'derived', 'cache.bin'), 'cache');

  const targets = ['derived/prd', 'derived/cache.bin'];
  const firstPlan = await run(root, targets);
  const secondPlan = await run(root, targets);
  assert.equal(firstPlan.status, 0, firstPlan.stderr);
  assert.deepEqual(firstPlan.json, secondPlan.json);
  assert.equal(firstPlan.json.mode, 'plan');
  assert.match(firstPlan.json.planSha256, /^[0-9a-f]{64}$/u);
  assert.deepEqual(
    firstPlan.json.targets.map(({ path: targetPath, status }) => [targetPath, status]),
    [
      ['derived/cache.bin', 'would-remove'],
      ['derived/prd', 'would-remove'],
    ],
  );
  assert.deepEqual(
    firstPlan.json.targets.map(({ path: targetPath, type, bytes, entryCount, sha256 }) => ({
      path: targetPath,
      type,
      bytes,
      entryCount,
      hasDigest: /^[0-9a-f]{64}$/u.test(sha256),
    })),
    [
      {
        path: 'derived/cache.bin',
        type: 'file',
        bytes: 5,
        entryCount: 1,
        hasDigest: true,
      },
      {
        path: 'derived/prd',
        type: 'directory',
        bytes: 9,
        entryCount: 3,
        hasDigest: true,
      },
    ],
  );
  assert.equal(firstPlan.json.source.bytes, sourceBytes.byteLength);
  assert.equal(
    firstPlan.json.source.sha256,
    createHash('sha256').update(sourceBytes).digest('hex'),
  );
  assert.equal(await pathExists(path.join(root, 'derived', 'prd', 'nested', 'asset.css')), true);

  const applied = await run(root, targets, {
    apply: true,
    expectedPlanSha256: firstPlan.json.planSha256,
  });
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(applied.json.mode, 'apply');
  assert.deepEqual(applied.json.targets.map(({ status }) => status), ['removed', 'removed']);
  assert.equal(await pathExists(path.join(root, 'derived', 'prd')), false);
  assert.equal(await pathExists(path.join(root, 'derived', 'cache.bin')), false);
  assert.deepEqual(await readFile(path.join(root, 'input', 'product-description.md')), sourceBytes);

  const missingPlan = await run(root, targets);
  const repeated = await run(root, targets, {
    apply: true,
    expectedPlanSha256: missingPlan.json.planSha256,
  });
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.deepEqual(repeated.json.targets.map(({ status }) => status), ['missing', 'missing']);
  assert.deepEqual(await readFile(path.join(root, 'input', 'product-description.md')), sourceBytes);
});

test('CLI argument parsing accepts repeated targets and preserved files', () => {
  const parsed = parseArguments([
    '--root', 'project',
    '--source', 'product-description.md',
    '--preserve', 'references/one.png',
    '--target', 'design-context.json',
    '--preserve', 'references/two.txt',
    '--target', 'prd',
    '--apply',
    '--expected-plan-sha256', 'a'.repeat(64),
  ]);
  assert.deepEqual(parsed, {
    root: 'project',
    source: 'product-description.md',
    preserve: ['references/one.png', 'references/two.txt'],
    targets: ['design-context.json', 'prd'],
    apply: true,
    expectedPlanSha256: 'a'.repeat(64),
  });
  assert.match(USAGE, /--preserve <relative-file>/u);
  assert.match(USAGE, /--expected-plan-sha256/u);
  assert.match(USAGE, /--recover-stale-lock/u);

  assert.deepEqual(
    parseArguments(['--root', 'project', '--recover-stale-lock', 'b'.repeat(64)]),
    {
      root: 'project',
      recoverStaleLock: 'b'.repeat(64),
      preserve: [],
      targets: [],
      apply: false,
    },
  );
});

test('all targets are preflighted before any target is removed', async (t) => {
  const { root } = await fixture(t);
  await mkdir(path.join(root, 'derived', 'good'), { recursive: true });
  await writeFile(path.join(root, 'derived', 'good', 'keep.txt'), 'keep');
  await writeFile(path.join(root, 'derived', 'blocker.txt'), 'not a directory');

  const result = await run(root, ['derived/good', 'derived/blocker.txt/child'], {
    apply: true,
    expectedPlanSha256: '0'.repeat(64),
  });
  assert.equal(result.status, 1);
  assert.equal(result.json.code, 'NON_DIRECTORY_ANCESTOR');
  assert.equal(await pathExists(path.join(root, 'derived', 'good', 'keep.txt')), true);
});

test('unsafe and overlapping paths are rejected', async (t) => {
  const { root } = await fixture(t);
  const cases = [
    { targets: ['.'], code: 'INVALID_RELATIVE_PATH' },
    { targets: ['.git/config'], code: 'GIT_PATH_FORBIDDEN' },
    { targets: ['input'], code: 'SOURCE_COLLISION' },
    { targets: ['input/product-description.md'], code: 'SOURCE_COLLISION' },
    { targets: ['derived', 'derived/nested'], code: 'TARGET_OVERLAP' },
    { targets: ['../outside'], code: 'INVALID_RELATIVE_PATH' },
    { targets: [path.resolve(root, '..', 'outside')], code: 'INVALID_RELATIVE_PATH' },
    { targets: ['https://example.test/generated'], code: 'INVALID_RELATIVE_PATH' },
    { targets: ['derived/*'], code: 'GLOB_NOT_ALLOWED' },
  ];

  for (const scenario of cases) {
    const result = await run(root, scenario.targets);
    assert.equal(result.status, 1, `Expected rejection for ${scenario.targets.join(', ')}`);
    assert.equal(result.json.code, scenario.code);
  }
});

test('a link anywhere inside a target rejects the whole reset', async (t) => {
  const { root } = await fixture(t);
  const outside = await mkdtemp(path.join(os.tmpdir(), 'reset-design-outside-'));
  t.after(async () => {
    await rm(outside, { recursive: true, force: true });
  });
  await writeFile(path.join(outside, 'outside.txt'), 'outside');
  await mkdir(path.join(root, 'derived', 'with-link'), { recursive: true });
  await mkdir(path.join(root, 'derived', 'ordinary'), { recursive: true });
  await writeFile(path.join(root, 'derived', 'ordinary', 'keep.txt'), 'keep');

  try {
    await symlink(
      outside,
      path.join(root, 'derived', 'with-link', 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error?.code)) {
      t.skip(`The operating system denied link creation (${error.code}).`);
      return;
    }
    throw error;
  }

  const result = await run(root, ['derived/ordinary', 'derived/with-link'], {
    apply: true,
    expectedPlanSha256: '0'.repeat(64),
  });
  assert.equal(result.status, 1);
  assert.equal(result.json.code, 'REPARSE_POINT_FORBIDDEN');
  assert.equal(await pathExists(path.join(root, 'derived', 'ordinary', 'keep.txt')), true);
  assert.equal(await pathExists(path.join(outside, 'outside.txt')), true);
});

test('explicit preserved files are hashed, retained, and protected from target overlap', async (t) => {
  const { root } = await fixture(t);
  const referenceBytes = Buffer.from([14, 15, 92, 0, 44]);
  await mkdir(path.join(root, 'owner'), { recursive: true });
  await writeFile(path.join(root, 'owner', 'reference.bin'), referenceBytes);
  await mkdir(path.join(root, 'derived', 'output'), { recursive: true });
  await writeFile(path.join(root, 'derived', 'output', 'remove.txt'), 'remove');

  const preserveOptions = {
    preserve: ['owner/reference.bin'],
  };
  const preservePlan = await run(root, ['derived/output'], preserveOptions);
  const applied = await run(root, ['derived/output'], {
    ...preserveOptions,
    apply: true,
    expectedPlanSha256: preservePlan.json.planSha256,
  });
  assert.equal(applied.status, 0, applied.stderr);
  assert.deepEqual(applied.json.preserved, [{
    path: 'owner/reference.bin',
    bytes: referenceBytes.byteLength,
    sha256: createHash('sha256').update(referenceBytes).digest('hex'),
  }]);
  assert.deepEqual(await readFile(path.join(root, 'owner', 'reference.bin')), referenceBytes);

  const collision = await run(root, ['owner'], { preserve: ['owner/reference.bin'] });
  assert.equal(collision.status, 1);
  assert.equal(collision.json.code, 'PRESERVED_COLLISION');
  assert.deepEqual(await readFile(path.join(root, 'owner', 'reference.bin')), referenceBytes);
});

test('an active product-store lock prevents every mutation', async (t) => {
  const { root } = await fixture(t);
  await mkdir(path.join(root, 'derived', 'ordinary'), { recursive: true });
  await writeFile(path.join(root, 'derived', 'ordinary', 'keep.txt'), 'keep');
  await mkdir(path.join(root, 'derived', 'locked'), { recursive: true });
  await writeFile(path.join(root, 'derived', 'locked', '.product-store.lock'), 'active');

  const result = await run(root, ['derived/ordinary', 'derived/locked'], {
    apply: true,
    expectedPlanSha256: '0'.repeat(64),
  });
  assert.equal(result.status, 1);
  assert.equal(result.json.code, 'ACTIVE_STORE_LOCK');
  assert.equal(await pathExists(path.join(root, 'derived', 'ordinary', 'keep.txt')), true);

  const direct = await run(root, ['derived/.product-store.lock']);
  assert.equal(direct.status, 1);
  assert.equal(direct.json.code, 'ACTIVE_STORE_LOCK');
});

test('apply requires the exact lowercase plan digest and releases its lock on rejection', async (t) => {
  const { root } = await fixture(t);
  await mkdir(path.join(root, 'derived', 'output'), { recursive: true });
  await writeFile(path.join(root, 'derived', 'output', 'keep.txt'), 'keep');

  const missing = await run(root, ['derived/output'], { apply: true });
  assert.equal(missing.status, 1);
  assert.equal(missing.json.code, 'EXPECTED_PLAN_REQUIRED');

  const invalid = await run(root, ['derived/output'], {
    apply: true,
    expectedPlanSha256: 'A'.repeat(64),
  });
  assert.equal(invalid.status, 1);
  assert.equal(invalid.json.code, 'INVALID_EXPECTED_PLAN_SHA256');

  const mismatch = await run(root, ['derived/output'], {
    apply: true,
    expectedPlanSha256: '0'.repeat(64),
  });
  assert.equal(mismatch.status, 1);
  assert.equal(mismatch.json.code, 'PLAN_SHA256_MISMATCH');
  assert.equal(await pathExists(path.join(root, 'derived', 'output', 'keep.txt')), true);
  assert.equal(await pathExists(path.join(root, '.reset-design.lock')), false);
});

test('source mutation after planning invalidates apply before any target deletion', async (t) => {
  const { root } = await fixture(t);
  await mkdir(path.join(root, 'derived', 'first'), { recursive: true });
  await mkdir(path.join(root, 'derived', 'second'), { recursive: true });
  await writeFile(path.join(root, 'derived', 'first', 'keep.txt'), 'first');
  await writeFile(path.join(root, 'derived', 'second', 'keep.txt'), 'second');
  const targets = ['derived/first', 'derived/second'];
  const plan = await run(root, targets);

  await writeFile(path.join(root, 'input', 'product-description.md'), 'owner changed this');
  const applied = await run(root, targets, {
    apply: true,
    expectedPlanSha256: plan.json.planSha256,
  });
  assert.equal(applied.status, 1);
  assert.equal(applied.json.code, 'PLAN_SHA256_MISMATCH');
  assert.equal(await pathExists(path.join(root, 'derived', 'first', 'keep.txt')), true);
  assert.equal(await pathExists(path.join(root, 'derived', 'second', 'keep.txt')), true);
});

test('preserved-resource mutation after planning invalidates apply before deletion', async (t) => {
  const { root } = await fixture(t);
  await mkdir(path.join(root, 'owner'), { recursive: true });
  await writeFile(path.join(root, 'owner', 'reference.txt'), 'original');
  await mkdir(path.join(root, 'derived', 'first'), { recursive: true });
  await mkdir(path.join(root, 'derived', 'second'), { recursive: true });
  const targets = ['derived/first', 'derived/second'];
  const options = { preserve: ['owner/reference.txt'] };
  const plan = await run(root, targets, options);

  await writeFile(path.join(root, 'owner', 'reference.txt'), 'changed');
  const applied = await run(root, targets, {
    ...options,
    apply: true,
    expectedPlanSha256: plan.json.planSha256,
  });
  assert.equal(applied.status, 1);
  assert.equal(applied.json.code, 'PLAN_SHA256_MISMATCH');
  assert.equal(await pathExists(path.join(root, 'derived', 'first')), true);
  assert.equal(await pathExists(path.join(root, 'derived', 'second')), true);
});

test('target mutation after planning invalidates apply before another target is deleted', async (t) => {
  const { root } = await fixture(t);
  await mkdir(path.join(root, 'derived', 'first'), { recursive: true });
  await mkdir(path.join(root, 'derived', 'second'), { recursive: true });
  await writeFile(path.join(root, 'derived', 'first', 'keep.txt'), 'first');
  await writeFile(path.join(root, 'derived', 'second', 'material.txt'), 'original');
  const targets = ['derived/first', 'derived/second'];
  const plan = await run(root, targets);

  await writeFile(path.join(root, 'derived', 'second', 'material.txt'), 'changed');
  const applied = await run(root, targets, {
    apply: true,
    expectedPlanSha256: plan.json.planSha256,
  });
  assert.equal(applied.status, 1);
  assert.equal(applied.json.code, 'PLAN_SHA256_MISMATCH');
  assert.equal(await pathExists(path.join(root, 'derived', 'first', 'keep.txt')), true);
  assert.equal(await pathExists(path.join(root, 'derived', 'second', 'material.txt')), true);
});

test('an existing cooperative reset lock rejects plan and apply without removing the lock', async (t) => {
  const { root } = await fixture(t);
  await mkdir(path.join(root, 'derived'), { recursive: true });
  await writeFile(path.join(root, 'derived', 'keep.txt'), 'keep');
  await writeFile(path.join(root, '.reset-design.lock'), 'held elsewhere');

  const plan = await run(root, ['derived']);
  assert.equal(plan.status, 1);
  assert.equal(plan.json.code, 'RESET_LOCK_EXISTS');

  const applied = await run(root, ['derived'], {
    apply: true,
    expectedPlanSha256: '0'.repeat(64),
  });
  assert.equal(applied.status, 1);
  assert.equal(applied.json.code, 'RESET_LOCK_EXISTS');
  assert.equal(await readFile(path.join(root, '.reset-design.lock'), 'utf8'), 'held elsewhere');
  assert.equal(await pathExists(path.join(root, 'derived', 'keep.txt')), true);
});

test('a reset root at .git or below it is rejected', async (t) => {
  const { root } = await fixture(t);
  const gitRoot = path.join(root, '.git');
  const refsRoot = path.join(gitRoot, 'refs');
  await mkdir(refsRoot, { recursive: true });

  const atGit = await run(gitRoot, ['derived']);
  assert.equal(atGit.status, 1);
  assert.equal(atGit.json.code, 'GIT_ROOT_FORBIDDEN');

  const belowGit = await run(refsRoot, ['derived']);
  assert.equal(belowGit.status, 1);
  assert.equal(belowGit.json.code, 'GIT_ROOT_FORBIDDEN');
});

test('stale-lock recovery rejects a lock owned by the current live process', async (t) => {
  const { root } = await fixture(t);
  const token = '1'.repeat(64);
  await writeResetLock(root, { token, pid: process.pid });

  const result = await recover(root, token);
  assert.equal(result.status, 1);
  assert.equal(result.json.code, 'RESET_LOCK_PROCESS_LIVE');
  assert.equal(await pathExists(path.join(root, '.reset-design.lock')), true);
});

test('an absent PID and matching token recover a canonical stale lock and allow planning', async (t) => {
  const { root } = await fixture(t);
  const token = '2'.repeat(64);
  const record = await writeResetLock(root, { token });
  await mkdir(path.join(root, 'derived'), { recursive: true });
  await writeFile(path.join(root, 'derived', 'remove.txt'), 'remove');

  const blockedPlan = await run(root, ['derived']);
  assert.equal(blockedPlan.status, 1);
  assert.equal(blockedPlan.json.code, 'RESET_LOCK_EXISTS');

  const recovered = await recover(root, token);
  assert.equal(recovered.status, 0, recovered.stderr);
  assert.equal(recovered.json.status, 'recovered');
  assert.equal(recovered.json.lock.token, token);
  assert.equal(recovered.json.lock.pid, record.pid);
  assert.equal(await pathExists(path.join(root, '.reset-design.lock')), false);

  const plan = await run(root, ['derived']);
  assert.equal(plan.status, 0, plan.stderr);
  assert.equal(plan.json.targets[0].status, 'would-remove');
});

test('stale-lock recovery rejects a wrong token and preserves the lock', async (t) => {
  const { root } = await fixture(t);
  await writeResetLock(root, { token: '3'.repeat(64) });

  const result = await recover(root, '4'.repeat(64));
  assert.equal(result.status, 1);
  assert.equal(result.json.code, 'RESET_LOCK_TOKEN_MISMATCH');
  assert.equal(await pathExists(path.join(root, '.reset-design.lock')), true);
});

test('stale-lock recovery rejects malformed or open-shaped lock JSON', async (t) => {
  const { root } = await fixture(t);
  const token = '5'.repeat(64);
  await writeResetLock(root, { token, extra: { unexpected: true } });

  const result = await recover(root, token);
  assert.equal(result.status, 1);
  assert.equal(result.json.code, 'MALFORMED_RESET_LOCK');
  assert.equal(await pathExists(path.join(root, '.reset-design.lock')), true);
});

test('recovery after simulated partial removal allows a fresh plan and apply', async (t) => {
  const { root } = await fixture(t);
  const token = '6'.repeat(64);
  const targets = ['derived/already-removed', 'derived/still-present'];
  await mkdir(path.join(root, 'derived', 'still-present'), { recursive: true });
  await writeFile(path.join(root, 'derived', 'still-present', 'remove.txt'), 'remove');
  await writeResetLock(root, { token });

  const recovered = await recover(root, token);
  assert.equal(recovered.status, 0, recovered.stderr);
  const replanned = await run(root, targets);
  assert.equal(replanned.status, 0, replanned.stderr);
  assert.deepEqual(
    replanned.json.targets.map(({ status }) => status),
    ['missing', 'would-remove'],
  );

  const applied = await run(root, targets, {
    apply: true,
    expectedPlanSha256: replanned.json.planSha256,
  });
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(await pathExists(path.join(root, 'derived', 'still-present')), false);
});
