#!/usr/bin/env node

import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import {
  lstat,
  open,
  readFile,
  readdir,
  realpath,
  rm,
  unlink,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const SCHEMA_VERSION = 1;
const GLOB_CHARACTERS = /[*?\[\]{}]/u;
const URL_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/u;
const STORE_LOCK_NAME = '.product-store.lock';
const RESET_LOCK_NAME = '.reset-design.lock';
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const RESET_LOCK_SCHEMA = 'reset-design-lock/v1';
const RESET_LOCK_KIND = 'reset-design-lock';
const RESET_LOCK_MAX_BYTES = 1024;
const RESET_LOCK_KEYS = [
  'createdAt',
  'kind',
  'pid',
  'processStartedAt',
  'schema',
  'token',
];
const PROCESS_STARTED_AT = new Date(Date.now() - Math.floor(process.uptime() * 1000)).toISOString();

export const USAGE = 'reset-design --root <directory> (--source <relative-file> [--preserve <relative-file> ...] --target <relative-path> [--target <relative-path> ...] [--apply --expected-plan-sha256 <64-lowercase-hex>] | --recover-stale-lock <64-lowercase-hex-token>)';

export class ResetDesignError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ResetDesignError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new ResetDesignError(code, message);
}

function sortText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function portablePath(value) {
  return value.replaceAll('\\', '/');
}

function comparablePath(value) {
  let normalized = path.normalize(path.resolve(value));

  if (normalized.startsWith('\\\\?\\UNC\\')) {
    normalized = `\\\\${normalized.slice(8)}`;
  } else if (normalized.startsWith('\\\\?\\')) {
    normalized = normalized.slice(4);
  }

  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function samePath(left, right) {
  return comparablePath(left) === comparablePath(right);
}

function containsPath(parent, candidate) {
  const parentKey = comparablePath(parent);
  const candidateKey = comparablePath(candidate);
  const descendantPrefix = parentKey.endsWith(path.sep) ? parentKey : `${parentKey}${path.sep}`;
  return candidateKey === parentKey || candidateKey.startsWith(descendantPrefix);
}

function canonicalRelativePath(rawValue, label) {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    fail('INVALID_RELATIVE_PATH', `${label} must be a non-empty relative path.`);
  }

  if (rawValue.includes('\0')) {
    fail('INVALID_RELATIVE_PATH', `${label} contains a null byte.`);
  }

  if (
    path.isAbsolute(rawValue)
    || path.win32.isAbsolute(rawValue)
    || path.posix.isAbsolute(rawValue)
    || URL_SCHEME.test(rawValue)
  ) {
    fail('INVALID_RELATIVE_PATH', `${label} must not be absolute or URL-like: ${rawValue}`);
  }

  if (GLOB_CHARACTERS.test(rawValue)) {
    fail('GLOB_NOT_ALLOWED', `${label} must name one explicit path and cannot contain glob syntax: ${rawValue}`);
  }

  const portable = rawValue.replaceAll('\\', '/');
  const segments = portable.split('/');

  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    fail('INVALID_RELATIVE_PATH', `${label} cannot contain empty, current-directory, or parent-directory segments: ${rawValue}`);
  }

  if (segments.some((segment) => segment.toLowerCase() === '.git')) {
    fail('GIT_PATH_FORBIDDEN', `${label} cannot name .git or anything beneath it: ${rawValue}`);
  }

  return segments.join('/');
}

function resolveContained(rootAbsolute, relativeValue, label) {
  const absolute = path.resolve(rootAbsolute, ...relativeValue.split('/'));

  if (samePath(absolute, rootAbsolute)) {
    fail('ROOT_TARGET_FORBIDDEN', `${label} cannot resolve to the reset root.`);
  }

  if (!containsPath(rootAbsolute, absolute)) {
    fail('PATH_OUTSIDE_ROOT', `${label} resolves outside the reset root: ${relativeValue}`);
  }

  return absolute;
}

async function lstatIfPresent(absolute) {
  try {
    return await lstat(absolute);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function assertNotReparsePoint(absolute, stats, displayPath) {
  if (stats.isSymbolicLink()) {
    fail('REPARSE_POINT_FORBIDDEN', `Symbolic links, junctions, and reparse points are forbidden: ${displayPath}`);
  }

  let physical;
  try {
    physical = await realpath(absolute);
  } catch (error) {
    fail('PATH_INSPECTION_FAILED', `Could not resolve ${displayPath}: ${error.message}`);
  }

  if (!samePath(physical, absolute)) {
    fail('REPARSE_POINT_FORBIDDEN', `Symbolic links, junctions, and reparse points are forbidden: ${displayPath}`);
  }
}

function ordinaryKind(stats, displayPath) {
  if (stats.isFile()) {
    return 'file';
  }
  if (stats.isDirectory()) {
    return 'directory';
  }

  fail('NON_ORDINARY_ENTRY', `Only regular files and directories may be reset: ${displayPath}`);
}

async function inspectRoot(rootAbsolute) {
  const stats = await lstatIfPresent(rootAbsolute);
  if (!stats) {
    fail('ROOT_NOT_FOUND', `Reset root does not exist: ${portablePath(rootAbsolute)}`);
  }
  await assertNotReparsePoint(rootAbsolute, stats, portablePath(rootAbsolute));
  if (!stats.isDirectory()) {
    fail('ROOT_NOT_DIRECTORY', `Reset root must be a directory: ${portablePath(rootAbsolute)}`);
  }
}

function assertRootOutsideGit(rootAbsolute) {
  const segments = portablePath(rootAbsolute).split('/').filter(Boolean);
  if (segments.some((segment) => segment.toLowerCase() === '.git')) {
    fail('GIT_ROOT_FORBIDDEN', `Reset root cannot be .git or one of its descendants: ${portablePath(rootAbsolute)}`);
  }
}

async function resolveSafeRoot(rootValue) {
  let rootAbsolute = path.resolve(rootValue);
  assertRootOutsideGit(rootAbsolute);
  await inspectRoot(rootAbsolute);
  rootAbsolute = await realpath(rootAbsolute);
  assertRootOutsideGit(rootAbsolute);
  return rootAbsolute;
}

async function inspectPathChain(rootAbsolute, relativeValue, { mustExist }) {
  const segments = relativeValue.split('/');
  let current = rootAbsolute;

  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    const displayPath = segments.slice(0, index + 1).join('/');
    const stats = await lstatIfPresent(current);

    if (!stats) {
      if (mustExist) {
        fail('SOURCE_NOT_FOUND', `Preserved source file does not exist: ${relativeValue}`);
      }
      return { absolute: path.resolve(rootAbsolute, ...segments), kind: 'missing' };
    }

    await assertNotReparsePoint(current, stats, displayPath);
    const kind = ordinaryKind(stats, displayPath);
    const isTerminal = index === segments.length - 1;

    if (!isTerminal && kind !== 'directory') {
      fail('NON_DIRECTORY_ANCESTOR', `A path ancestor is not a directory: ${displayPath}`);
    }

    if (isTerminal) {
      return { absolute: current, kind };
    }
  }

  fail('PATH_INSPECTION_FAILED', `Could not inspect path: ${relativeValue}`);
}

async function inventoryDirectory(absolute, displayPath) {
  const inventory = [];
  let totalBytes = 0;

  async function visit(currentAbsolute, currentRelative) {
    const entries = await readdir(currentAbsolute);
    entries.sort(sortText);

    for (const entry of entries) {
      const childAbsolute = path.join(currentAbsolute, entry);
      const childRelative = currentRelative ? `${currentRelative}/${entry}` : entry;
      const childDisplay = `${displayPath}/${childRelative}`;
      if (entry.toLowerCase() === STORE_LOCK_NAME) {
        fail('ACTIVE_STORE_LOCK', `A reset target contains an active product-store lock: ${childDisplay}`);
      }
      const stats = await lstat(childAbsolute);
      await assertNotReparsePoint(childAbsolute, stats, childDisplay);
      const kind = ordinaryKind(stats, childDisplay);
      if (kind === 'directory') {
        inventory.push({
          path: childRelative,
          kind,
          fileSize: null,
          fileSha256: null,
        });
        await visit(childAbsolute, childRelative);
      } else {
        const bytes = await readFile(childAbsolute);
        totalBytes += bytes.byteLength;
        inventory.push({
          path: childRelative,
          kind,
          fileSize: bytes.byteLength,
          fileSha256: hashBytes(bytes),
        });
      }
    }
  }

  await visit(absolute, '');
  inventory.sort((left, right) => sortText(left.path, right.path));
  return {
    bytes: totalBytes,
    entryCount: inventory.length,
    sha256: hashBytes(Buffer.from(JSON.stringify(inventory), 'utf8')),
  };
}

function hashBytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function assertNoCollisions(sourceAbsolute, targets) {
  for (const target of targets) {
    if (containsPath(target.absolute, sourceAbsolute) || containsPath(sourceAbsolute, target.absolute)) {
      fail('SOURCE_COLLISION', `Reset target overlaps the preserved source: ${target.path}`);
    }
  }

  for (let leftIndex = 0; leftIndex < targets.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < targets.length; rightIndex += 1) {
      const left = targets[leftIndex];
      const right = targets[rightIndex];
      if (containsPath(left.absolute, right.absolute) || containsPath(right.absolute, left.absolute)) {
        fail('TARGET_OVERLAP', `Reset targets overlap: ${left.path} and ${right.path}`);
      }
    }
  }
}

function assertDistinctPreservedFiles(source, preserved) {
  const paths = [source, ...preserved];
  for (let leftIndex = 0; leftIndex < paths.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < paths.length; rightIndex += 1) {
      if (samePath(paths[leftIndex].absolute, paths[rightIndex].absolute)) {
        fail('DUPLICATE_PRESERVED_PATH', `A preserved file was supplied more than once: ${paths[rightIndex].path}`);
      }
    }
  }
}

function assertNoPreservedCollisions(preserved, targets) {
  for (const resource of preserved) {
    for (const target of targets) {
      if (containsPath(target.absolute, resource.absolute) || containsPath(resource.absolute, target.absolute)) {
        fail('PRESERVED_COLLISION', `Reset target overlaps a preserved file: ${target.path} overlaps ${resource.path}`);
      }
    }
  }
}

function validateOptions(options) {
  if (!options || typeof options !== 'object') {
    fail('INVALID_OPTIONS', 'Reset options are required.');
  }
  if (options.recoverStaleLock !== undefined) {
    fail('RECOVERY_MODE_CONFLICT', '--recover-stale-lock is a separate mode and cannot be used for plan or apply.');
  }
  if (typeof options.root !== 'string' || options.root.length === 0) {
    fail('MISSING_ROOT', '--root is required.');
  }
  if (typeof options.source !== 'string' || options.source.length === 0) {
    fail('MISSING_SOURCE', '--source is required.');
  }
  if (!Array.isArray(options.targets) || options.targets.length === 0) {
    fail('MISSING_TARGET', 'At least one --target is required.');
  }
  if (options.preserve !== undefined && !Array.isArray(options.preserve)) {
    fail('INVALID_OPTIONS', 'Preserved paths must be an array.');
  }
}

async function preflight(options, { preparedRoot, allowResetLock = false } = {}) {
  validateOptions(options);

  const rootAbsolute = preparedRoot ?? await resolveSafeRoot(options.root);
  const resetLockAbsolute = path.join(rootAbsolute, RESET_LOCK_NAME);
  if (!allowResetLock && await lstatIfPresent(resetLockAbsolute)) {
    fail('RESET_LOCK_EXISTS', `A reset operation already holds the root lock: ${RESET_LOCK_NAME}`);
  }

  const sourcePath = canonicalRelativePath(options.source, '--source');
  const sourceAbsolute = resolveContained(rootAbsolute, sourcePath, '--source');
  const preservedPaths = (options.preserve ?? [])
    .map((value, index) => canonicalRelativePath(value, `--preserve #${index + 1}`))
    .sort(sortText);
  const preserved = preservedPaths.map((preservedPath) => ({
    path: preservedPath,
    absolute: resolveContained(rootAbsolute, preservedPath, '--preserve'),
  }));
  const targetPaths = options.targets
    .map((value, index) => canonicalRelativePath(value, `--target #${index + 1}`))
    .sort(sortText);
  const targets = targetPaths.map((targetPath) => ({
    path: targetPath,
    absolute: resolveContained(rootAbsolute, targetPath, '--target'),
  }));

  for (const target of targets) {
    const terminalName = target.path.split('/').at(-1).toLowerCase();
    if (terminalName === STORE_LOCK_NAME) {
      fail('ACTIVE_STORE_LOCK', `An active product-store lock cannot be a reset target: ${target.path}`);
    }
    if (target.path.toLowerCase() === RESET_LOCK_NAME) {
      fail('RESET_LOCK_TARGET_FORBIDDEN', `The cooperative reset lock cannot be a reset target: ${target.path}`);
    }
  }

  assertNoCollisions(sourceAbsolute, targets);
  assertDistinctPreservedFiles({ path: sourcePath, absolute: sourceAbsolute }, preserved);
  assertNoPreservedCollisions(preserved, targets);

  const sourceInspection = await inspectPathChain(rootAbsolute, sourcePath, { mustExist: true });
  if (sourceInspection.kind !== 'file') {
    fail('SOURCE_NOT_FILE', `Preserved source must be a regular file: ${sourcePath}`);
  }
  const sourceBytes = await readFile(sourceAbsolute);

  for (const resource of preserved) {
    const inspection = await inspectPathChain(rootAbsolute, resource.path, { mustExist: true });
    if (inspection.kind !== 'file') {
      fail('PRESERVED_PATH_NOT_FILE', `An explicitly preserved resource must be a regular file: ${resource.path}`);
    }
    resource.bytes = await readFile(resource.absolute);
    resource.sha256 = hashBytes(resource.bytes);
  }

  for (const target of targets) {
    const inspection = await inspectPathChain(rootAbsolute, target.path, { mustExist: false });
    target.kind = inspection.kind;
    if (inspection.kind === 'directory') {
      Object.assign(target, await inventoryDirectory(target.absolute, target.path));
    } else if (inspection.kind === 'file') {
      const bytes = await readFile(target.absolute);
      target.bytes = bytes.byteLength;
      target.entryCount = 1;
      target.sha256 = hashBytes(bytes);
    } else {
      target.bytes = 0;
      target.entryCount = 0;
      target.sha256 = null;
    }
  }

  return {
    rootAbsolute,
    sourcePath,
    sourceAbsolute,
    sourceBytes,
    sourceSha256: hashBytes(sourceBytes),
    preserved,
    targets,
  };
}

function planBody(preflightResult) {
  return {
    schemaVersion: SCHEMA_VERSION,
    operation: 'reset-design',
    root: portablePath(preflightResult.rootAbsolute),
    source: {
      path: preflightResult.sourcePath,
      bytes: preflightResult.sourceBytes.byteLength,
      sha256: preflightResult.sourceSha256,
    },
    preserved: preflightResult.preserved.map((resource) => ({
      path: resource.path,
      bytes: resource.bytes.byteLength,
      sha256: resource.sha256,
    })),
    targets: preflightResult.targets.map((target) => ({
      path: target.path,
      type: target.kind === 'missing' ? null : target.kind,
      bytes: target.bytes,
      entryCount: target.entryCount,
      sha256: target.sha256,
    })),
  };
}

function planSha256(preflightResult) {
  return hashBytes(Buffer.from(JSON.stringify(planBody(preflightResult)), 'utf8'));
}

function publicResult(preflightResult, mode, applied) {
  const body = planBody(preflightResult);
  return {
    schemaVersion: body.schemaVersion,
    operation: body.operation,
    mode,
    planSha256: planSha256(preflightResult),
    root: body.root,
    source: body.source,
    preserved: body.preserved,
    targets: body.targets.map((target) => ({
      ...target,
      status: target.type === null
        ? 'missing'
        : applied
          ? 'removed'
          : 'would-remove',
    })),
  };
}

export async function planReset(options) {
  if (options?.expectedPlanSha256 !== undefined) {
    fail('EXPECTED_PLAN_WITHOUT_APPLY', '--expected-plan-sha256 may only be supplied with --apply.');
  }
  const checked = await preflight(options);
  return publicResult(checked, 'plan', false);
}

function validateExpectedPlanSha256(value) {
  if (value === undefined) {
    fail('EXPECTED_PLAN_REQUIRED', '--expected-plan-sha256 is required with --apply.');
  }
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    fail('INVALID_EXPECTED_PLAN_SHA256', '--expected-plan-sha256 must be exactly 64 lowercase hexadecimal characters.');
  }
}

function isCanonicalTimestamp(value) {
  if (typeof value !== 'string' || value.length !== 24) {
    return false;
  }
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

function canonicalLockRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('MALFORMED_RESET_LOCK', 'The reset lock must contain one JSON object.');
  }

  const keys = Object.keys(value).sort(sortText);
  if (JSON.stringify(keys) !== JSON.stringify(RESET_LOCK_KEYS)) {
    fail('MALFORMED_RESET_LOCK', 'The reset lock has missing or unrecognized fields.');
  }
  if (value.schema !== RESET_LOCK_SCHEMA || value.kind !== RESET_LOCK_KIND) {
    fail('MALFORMED_RESET_LOCK', 'The reset lock schema or kind is invalid.');
  }
  if (typeof value.token !== 'string' || !SHA256_PATTERN.test(value.token)) {
    fail('MALFORMED_RESET_LOCK', 'The reset lock token is invalid.');
  }
  if (!Number.isSafeInteger(value.pid) || value.pid <= 0 || value.pid > 2_147_483_647) {
    fail('MALFORMED_RESET_LOCK', 'The reset lock PID is invalid.');
  }
  if (!isCanonicalTimestamp(value.processStartedAt) || !isCanonicalTimestamp(value.createdAt)) {
    fail('MALFORMED_RESET_LOCK', 'The reset lock timestamps are invalid.');
  }
  if (Date.parse(value.processStartedAt) > Date.parse(value.createdAt)) {
    fail('MALFORMED_RESET_LOCK', 'The reset lock process timestamp cannot follow its creation timestamp.');
  }

  return {
    schema: value.schema,
    kind: value.kind,
    token: value.token,
    pid: value.pid,
    processStartedAt: value.processStartedAt,
    createdAt: value.createdAt,
  };
}

function makeLockRecord() {
  return canonicalLockRecord({
    schema: RESET_LOCK_SCHEMA,
    kind: RESET_LOCK_KIND,
    token: randomBytes(32).toString('hex'),
    pid: process.pid,
    processStartedAt: PROCESS_STARTED_AT,
    createdAt: new Date().toISOString(),
  });
}

async function readCanonicalLock(lockAbsolute) {
  const stats = await lstatIfPresent(lockAbsolute);
  if (!stats) {
    fail('RESET_LOCK_NOT_FOUND', `The reset lock does not exist: ${RESET_LOCK_NAME}`);
  }
  await assertNotReparsePoint(lockAbsolute, stats, RESET_LOCK_NAME);
  if (!stats.isFile()) {
    fail('MALFORMED_RESET_LOCK', 'The reset lock must be a regular file.');
  }
  if (stats.size <= 0 || stats.size > RESET_LOCK_MAX_BYTES) {
    fail('MALFORMED_RESET_LOCK', `The reset lock must contain between 1 and ${RESET_LOCK_MAX_BYTES} bytes.`);
  }

  const bytes = await readFile(lockAbsolute);
  if (bytes.byteLength <= 0 || bytes.byteLength > RESET_LOCK_MAX_BYTES) {
    fail('MALFORMED_RESET_LOCK', `The reset lock must contain between 1 and ${RESET_LOCK_MAX_BYTES} bytes.`);
  }

  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    fail('MALFORMED_RESET_LOCK', 'The reset lock must contain canonical UTF-8 JSON.');
  }
  const record = canonicalLockRecord(parsed);
  const canonicalBytes = Buffer.from(JSON.stringify(record), 'utf8');
  if (!bytes.equals(canonicalBytes)) {
    fail('MALFORMED_RESET_LOCK', 'The reset lock JSON is not in canonical closed form.');
  }

  return {
    bytes,
    record,
    identity: {
      dev: stats.dev,
      ino: stats.ino,
    },
  };
}

function sameLockObservation(left, right) {
  return left.bytes.equals(right.bytes)
    && sameLockIdentity(left.identity, right.identity);
}

function sameLockIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameOpaqueToken(left, right) {
  return timingSafeEqual(Buffer.from(left, 'ascii'), Buffer.from(right, 'ascii'));
}

function assertRecordedProcessAbsent(pid) {
  try {
    process.kill(pid, 0);
  } catch (error) {
    if (error?.code === 'ESRCH') {
      return;
    }
    fail('RESET_LOCK_PROCESS_UNKNOWN', `Could not prove that reset-lock PID ${pid} is absent.`);
  }
  fail('RESET_LOCK_PROCESS_LIVE', `Reset-lock PID ${pid} is still running.`);
}

async function acquireResetLock(rootAbsolute) {
  const lockAbsolute = path.join(rootAbsolute, RESET_LOCK_NAME);
  const record = makeLockRecord();
  const lockBytes = Buffer.from(JSON.stringify(record), 'utf8');
  let handle;
  let lockIdentity;
  try {
    handle = await open(lockAbsolute, 'wx', 0o600);
    await handle.writeFile(lockBytes);
    const stats = await handle.stat();
    lockIdentity = { dev: stats.dev, ino: stats.ino };
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
      await unlink(lockAbsolute).catch(() => {});
    }
    if (error?.code === 'EEXIST') {
      fail('RESET_LOCK_EXISTS', `A reset operation already holds the root lock: ${RESET_LOCK_NAME}`);
    }
    throw error;
  }

  return async () => {
    let observationError;
    try {
      const observed = await readCanonicalLock(lockAbsolute);
      if (
        !observed.bytes.equals(lockBytes)
        || !sameOpaqueToken(observed.record.token, record.token)
        || !sameLockIdentity(observed.identity, lockIdentity)
      ) {
        fail('RESET_LOCK_CHANGED', 'The reset lock changed while the reset was active; it was not removed.');
      }
    } catch (error) {
      observationError = error;
    }

    let closeError;
    try {
      await handle.close();
    } catch (error) {
      closeError = error;
    }
    if (observationError) {
      throw observationError;
    }
    if (closeError) {
      throw closeError;
    }

    try {
      const observed = await readCanonicalLock(lockAbsolute);
      if (
        !observed.bytes.equals(lockBytes)
        || !sameOpaqueToken(observed.record.token, record.token)
        || !sameLockIdentity(observed.identity, lockIdentity)
      ) {
        fail('RESET_LOCK_CHANGED', 'The reset lock changed while the reset was active; it was not removed.');
      }
    } catch (error) {
      throw error;
    }
    await unlink(lockAbsolute);
  };
}

function validateRecoveryOptions(options) {
  if (!options || typeof options !== 'object' || typeof options.root !== 'string' || options.root.length === 0) {
    fail('MISSING_ROOT', '--root is required.');
  }
  if (typeof options.recoverStaleLock !== 'string' || !SHA256_PATTERN.test(options.recoverStaleLock)) {
    fail('INVALID_RECOVERY_TOKEN', '--recover-stale-lock must be exactly 64 lowercase hexadecimal characters.');
  }
  if (
    options.source !== undefined
    || (options.targets?.length ?? 0) !== 0
    || (options.preserve?.length ?? 0) !== 0
    || options.apply === true
    || options.expectedPlanSha256 !== undefined
  ) {
    fail('RECOVERY_MODE_CONFLICT', '--recover-stale-lock may only be combined with --root.');
  }
}

export async function recoverStaleLock(options) {
  validateRecoveryOptions(options);
  const rootAbsolute = await resolveSafeRoot(options.root);
  const lockAbsolute = path.join(rootAbsolute, RESET_LOCK_NAME);
  const first = await readCanonicalLock(lockAbsolute);

  if (!sameOpaqueToken(first.record.token, options.recoverStaleLock)) {
    fail('RESET_LOCK_TOKEN_MISMATCH', 'The supplied recovery token does not match the reset lock.');
  }
  assertRecordedProcessAbsent(first.record.pid);

  const second = await readCanonicalLock(lockAbsolute);
  if (!sameLockObservation(first, second)) {
    fail('RESET_LOCK_CHANGED', 'The reset lock changed during stale-lock recovery; it was not removed.');
  }

  // The second read narrows the race before path-based unlink. Complete safety
  // still relies on other reset writers honoring the cooperative lock protocol.
  await unlink(lockAbsolute);

  return {
    schemaVersion: SCHEMA_VERSION,
    operation: 'reset-design-lock-recovery',
    status: 'recovered',
    root: portablePath(rootAbsolute),
    lock: {
      path: RESET_LOCK_NAME,
      ...first.record,
    },
  };
}

export async function applyReset(options) {
  validateOptions(options);
  validateExpectedPlanSha256(options.expectedPlanSha256);
  const rootAbsolute = await resolveSafeRoot(options.root);
  // This lock gives cooperating writers exclusive quiescence. Node's path-based
  // APIs cannot make traversal and deletion atomic against an adversary that
  // ignores the lock and replaces entries between inspection and removal.
  const releaseLock = await acquireResetLock(rootAbsolute);

  try {
    const checked = await preflight(options, { preparedRoot: rootAbsolute, allowResetLock: true });
    const actualPlanSha256 = planSha256(checked);
    if (actualPlanSha256 !== options.expectedPlanSha256) {
      fail(
        'PLAN_SHA256_MISMATCH',
        `Current reset material does not match the expected plan (expected ${options.expectedPlanSha256}, got ${actualPlanSha256}).`,
      );
    }

    for (const target of checked.targets) {
      if (target.kind !== 'missing') {
        await rm(target.absolute, { force: false, recursive: target.kind === 'directory' });
      }
    }

    const sourceAfter = await readFile(checked.sourceAbsolute);
    const sourceAfterSha256 = hashBytes(sourceAfter);
    if (
      sourceAfter.byteLength !== checked.sourceBytes.byteLength
      || sourceAfterSha256 !== checked.sourceSha256
    ) {
      fail('SOURCE_CHANGED', `Preserved source changed while reset was applied: ${checked.sourcePath}`);
    }

    for (const resource of checked.preserved) {
      const bytesAfter = await readFile(resource.absolute);
      if (bytesAfter.byteLength !== resource.bytes.byteLength || hashBytes(bytesAfter) !== resource.sha256) {
        fail('PRESERVED_FILE_CHANGED', `Preserved file changed while reset was applied: ${resource.path}`);
      }
    }

    return publicResult(checked, 'apply', true);
  } finally {
    await releaseLock();
  }
}

function takeValue(argv, index, flag) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    fail('MISSING_ARGUMENT_VALUE', `${flag} requires a value.`);
  }
  return value;
}

export function parseArguments(argv) {
  const options = { targets: [], preserve: [], apply: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--apply') {
      if (options.apply) {
        fail('DUPLICATE_ARGUMENT', '--apply may be supplied only once.');
      }
      options.apply = true;
      continue;
    }

    if (
      argument === '--root'
      || argument === '--source'
      || argument === '--target'
      || argument === '--preserve'
      || argument === '--expected-plan-sha256'
      || argument === '--recover-stale-lock'
    ) {
      const value = takeValue(argv, index, argument);
      index += 1;
      if (argument === '--target') {
        options.targets.push(value);
      } else if (argument === '--preserve') {
        options.preserve.push(value);
      } else {
        const key = argument === '--expected-plan-sha256'
          ? 'expectedPlanSha256'
          : argument === '--recover-stale-lock'
            ? 'recoverStaleLock'
            : argument.slice(2);
        if (options[key] !== undefined) {
          fail('DUPLICATE_ARGUMENT', `${argument} may be supplied only once.`);
        }
        options[key] = value;
      }
      continue;
    }

    fail('UNKNOWN_ARGUMENT', `Unknown argument: ${argument}`);
  }

  return options;
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.recoverStaleLock !== undefined) {
      const result = await recoverStaleLock(options);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
    if (!options.apply && options.expectedPlanSha256 !== undefined) {
      fail('EXPECTED_PLAN_WITHOUT_APPLY', '--expected-plan-sha256 may only be supplied with --apply.');
    }
    const result = options.apply
      ? await applyReset(options)
      : await planReset(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    const code = error instanceof ResetDesignError ? error.code : 'UNEXPECTED_ERROR';
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      operation: 'reset-design',
      status: 'error',
      code,
      message,
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  await main();
}
