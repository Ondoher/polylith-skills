import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {TextDecoder} from 'node:util';

export const PRODUCT_ARTIFACT_MAX_TEXT_LENGTH = 32_768;
export const PRODUCT_ARTIFACT_MAX_ARRAY_LENGTH = 10_000;
const PRODUCT_STORE_LOCK_FILE = '.product-store.lock';
const PRODUCT_STORE_LOCK_MAX_BYTES = 4 * 1024;

/** Throw a product-artifact contract error. */
export function fail(message) {
  throw new Error(message);
}

/** @param {string|Buffer|Uint8Array} bytes @returns {string} Lowercase SHA-256. */
export function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

/** @param {unknown} value @returns {string} Stable pretty JSON with a trailing newline. */
export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * @param {string} file
 * @param {number} maxBytes
 * @param {string} label
 * @returns {Buffer}
 * @throws {Error} When the file is missing, not regular, or exceeds the bound.
 */
export function readBoundedFile(file, maxBytes, label = file) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) fail(`${label} byte limit must be a positive safe integer`);
  const stats = fs.statSync(file);
  if (!stats.isFile()) fail(`${label} must be a regular file`);
  if (stats.size > maxBytes) fail(`${label} exceeds the ${maxBytes}-byte limit`);
  const bytes = fs.readFileSync(file);
  if (bytes.length > maxBytes) fail(`${label} exceeds the ${maxBytes}-byte limit`);
  return bytes;
}

/**
 * @param {string} file
 * @param {string} [label]
 * @param {number} [maxBytes]
 * @returns {unknown}
 * @throws {Error} When bytes, UTF-8, or JSON are invalid.
 */
export function parseJsonFile(file, label = file, maxBytes = Number.MAX_SAFE_INTEGER) {
  let value;
  try {
    const bytes = readBoundedFile(file, maxBytes, label);
    const source = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    value = JSON.parse(source);
  } catch (error) {
    if (String(error.message).includes('byte limit') || String(error.message).includes('regular file')) throw error;
    fail(`${label} is not valid JSON: ${error.message}`);
  }
  return value;
}

/** Require a non-array object. */
export function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}

/** Require an object to contain exactly the supplied keys. */
export function closed(value, keys, label) {
  object(value, label);
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${label} has unsupported field ${key}`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) fail(`${label}.${key} is required`);
  }
  return value;
}

/** Require nonempty durable text without unsafe controls. */
export function text(value, label) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} must be non-empty text`);
  if (value.length > PRODUCT_ARTIFACT_MAX_TEXT_LENGTH) fail(`${label} must be no longer than ${PRODUCT_ARTIFACT_MAX_TEXT_LENGTH} characters`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) fail(`${label} cannot contain unsafe control characters`);
  return value;
}

/** Require a lowercase hyphenated stable ID. */
export function stableId(value, label) {
  text(value, label);
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value) || value.length > 80) {
    fail(`${label} must be a lowercase hyphenated stable ID no longer than 80 characters`);
  }
  return value;
}

/** Require a portable, traversal-free relative display label. */
export function safeRelativeLabel(value, label) {
  text(value, label);
  if (value.includes('\\') || value.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    fail(`${label} must be a portable relative label`);
  }
  const segments = value.split('/');
  if (segments.some(segment => segment === '' || segment === '.' || segment === '..' || /[. ]$/.test(segment) || !/^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(segment))) {
    fail(`${label} must contain only safe relative path segments`);
  }
  return value;
}

/** Require a value from an allowed set. */
export function choice(value, choices, label) {
  if (!choices.has(value)) fail(`${label} has unsupported value ${String(value)}`);
  return value;
}

/** Require a positive safe integer. */
export function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) fail(`${label} must be a positive safe integer`);
  return value;
}

/** Require an array. */
export function array(value, label) {
  if (!Array.isArray(value) || value.length > PRODUCT_ARTIFACT_MAX_ARRAY_LENGTH) {
    fail(`${label} must be an array with at most ${PRODUCT_ARTIFACT_MAX_ARRAY_LENGTH} entries`);
  }
  return value;
}

/** Require unique values and return the original array. */
export function unique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`${label} contains duplicate value ${value}`);
    seen.add(value);
  }
  return values;
}

/** Require a lowercase SHA-256 string. */
export function assertSha256(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) fail(`${label} must be a lowercase SHA-256 digest`);
  return value;
}

/** Require a path within a supported product-artifact role. */
export function assertSafeStoredPath(value, label) {
  safeRelativeLabel(value, label);
  if (!/^(?:(?:sources|models|snapshots)\/[a-z0-9-]+\/[A-Za-z0-9._-]+|artifacts\/[a-z0-9-]+\/[a-z0-9-]+\/[A-Za-z0-9._-]+)$/.test(value)) {
    fail(`${label} is outside the product artifact store`);
  }
  return value;
}

function rejectLinkedAncestors(absolute, label) {
  const parsed = path.parse(absolute);
  let current = parsed.root;
  if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail(`Refusing linked ${label}: ${current}`);
  const remainder = absolute.slice(parsed.root.length);
  for (const segment of remainder.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail(`Refusing linked ${label}: ${current}`);
  }
}

/** Reject linked paths and paths outside the selected artifact root. */
export function ensureUnlinkedPath(target, root) {
  const absoluteRoot = path.resolve(root);
  const absoluteTarget = path.resolve(target);
  const relative = path.relative(absoluteRoot, absoluteTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) fail(`Path escapes product artifact root: ${target}`);
  rejectLinkedAncestors(absoluteRoot, 'product artifact root');
  rejectLinkedAncestors(absoluteTarget, 'product artifact path');
}

function writeSyncedFile(file, bytes) {
  const descriptor = fs.openSync(file, 'wx');
  try {
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function syncDirectoryBestEffort(directory) {
  let descriptor;
  try {
    descriptor = fs.openSync(directory, 'r');
    fs.fsyncSync(descriptor);
  } catch {
    // Some supported filesystems do not permit opening or syncing directories.
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function storeLockMetadata(bytes, lockFile) {
  if (bytes.length > PRODUCT_STORE_LOCK_MAX_BYTES) fail(`Product artifact store lock is too large: ${lockFile}`);
  let value;
  try {
    value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  } catch (error) {
    fail(`Product artifact store lock is invalid: ${error.message}`);
  }
  closed(value, ['schemaVersion', 'kind', 'pid', 'token'], 'product artifact store lock');
  if (value.schemaVersion !== '1.0' || value.kind !== 'product-store-lock') {
    fail('Product artifact store lock has an unsupported contract');
  }
  positiveInteger(value.pid, 'product artifact store lock.pid');
  if (typeof value.token !== 'string' || !/^[0-9a-f]{32}$/u.test(value.token)) {
    fail('product artifact store lock.token must be 32 lowercase hexadecimal characters');
  }
  if (!Buffer.from(stableJson(value)).equals(bytes)) fail('Product artifact store lock is not in canonical byte form');
  return value;
}

function readStoreLock(lockFile, root) {
  ensureUnlinkedPath(lockFile, root);
  const stats = fs.lstatSync(lockFile);
  if (!stats.isFile()) fail(`Product artifact store lock must be a regular file: ${lockFile}`);
  if (stats.size > PRODUCT_STORE_LOCK_MAX_BYTES) fail(`Product artifact store lock is too large: ${lockFile}`);
  const bytes = fs.readFileSync(lockFile);
  return {bytes, metadata: storeLockMetadata(bytes, lockFile)};
}

function processIsDefinitivelyDead(pid) {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return error?.code === 'ESRCH';
  }
}

function recoverDeadStoreLock(lockFile, root) {
  const observed = readStoreLock(lockFile, root);
  if (!processIsDefinitivelyDead(observed.metadata.pid)) {
    fail(`Product artifact store is locked by live or unknown process ${observed.metadata.pid}`);
  }
  const quarantine = path.join(
    root,
    `${PRODUCT_STORE_LOCK_FILE}-stale-${process.pid}-${crypto.randomBytes(8).toString('hex')}`,
  );
  ensureUnlinkedPath(quarantine, root);
  try {
    fs.renameSync(lockFile, quarantine);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  try {
    const quarantined = fs.readFileSync(quarantine);
    if (!quarantined.equals(observed.bytes)) {
      fail('Product artifact store lock changed while recovering a dead owner');
    }
    fs.rmSync(quarantine);
    syncDirectoryBestEffort(root);
  } catch (error) {
    if (fs.existsSync(quarantine) && !fs.existsSync(lockFile)) {
      try {
        fs.renameSync(quarantine, lockFile);
        syncDirectoryBestEffort(root);
      } catch {
        // Leave the quarantined file intact rather than deleting bytes we did not verify.
      }
    }
    throw error;
  }
}

function acquireStoreLock(root) {
  const lockFile = path.join(root, PRODUCT_STORE_LOCK_FILE);
  const metadata = {
    schemaVersion: '1.0',
    kind: 'product-store-lock',
    pid: process.pid,
    token: crypto.randomBytes(16).toString('hex'),
  };
  const bytes = Buffer.from(stableJson(metadata));
  for (;;) {
    ensureUnlinkedPath(lockFile, root);
    try {
      writeSyncedFile(lockFile, bytes);
      syncDirectoryBestEffort(root);
      return {lockFile, bytes};
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      try {
        recoverDeadStoreLock(lockFile, root);
      } catch (recoveryError) {
        if (recoveryError?.code !== 'ENOENT') throw recoveryError;
      }
    }
  }
}

function releaseStoreLock({lockFile, bytes}, root) {
  const owned = readStoreLock(lockFile, root);
  if (!owned.bytes.equals(bytes)) fail('Product artifact store lock ownership changed before release');
  fs.rmSync(lockFile);
  syncDirectoryBestEffort(root);
}

/**
 * Run one complete trusted-local product-store transaction under an exclusive lock.
 * A lock owned by a live or unverifiable process fails closed. A lock is recovered
 * only when its recorded process is definitively absent.
 */
export function withProductStoreLock(root, operation) {
  if (typeof operation !== 'function') fail('Product artifact store transaction must be a function');
  const absoluteRoot = path.resolve(root);
  ensureUnlinkedPath(absoluteRoot, absoluteRoot);
  fs.mkdirSync(absoluteRoot, {recursive: true});
  ensureUnlinkedPath(absoluteRoot, absoluteRoot);
  const lock = acquireStoreLock(absoluteRoot);
  try {
    return operation();
  } finally {
    releaseStoreLock(lock, absoluteRoot);
  }
}

/**
 * @param {string} file
 * @param {Buffer|Uint8Array|string} bytes
 * @param {string} root
 * @returns {boolean} True when a new immutable artifact was committed.
 * @throws {Error} On path, immutability, staging, sync, or rename failure.
 */
export function writeImmutable(file, bytes, root) {
  ensureUnlinkedPath(file, root);
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file);
    if (!existing.equals(bytes)) fail(`Immutable artifact already exists with different bytes: ${file}`);
    return false;
  }
  fs.mkdirSync(path.dirname(file), {recursive: true});
  ensureUnlinkedPath(file, root);
  const stagingRoot = path.dirname(path.dirname(file));
  const temporary = path.join(
    stagingRoot,
    `.${path.basename(path.dirname(file))}-${path.basename(file)}-${process.pid}-${crypto.randomBytes(8).toString('hex')}.tmp`,
  );
  ensureUnlinkedPath(temporary, root);
  writeSyncedFile(temporary, bytes);
  try {
    if (fs.existsSync(file)) {
      const existing = fs.readFileSync(file);
      if (!existing.equals(bytes)) fail(`Immutable artifact already exists with different bytes: ${file}`);
      return false;
    }
    fs.renameSync(temporary, file);
    syncDirectoryBestEffort(path.dirname(file));
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, {force: true});
  }
  return true;
}

/**
 * @param {string} file
 * @param {Buffer|Uint8Array|string} bytes
 * @param {string} root
 * @returns {boolean} True when the current pointer changed.
 * @throws {Error} On path, staging, sync, or rename failure.
 */
export function writeCurrentLast(file, bytes, root) {
  ensureUnlinkedPath(file, root);
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file);
    if (existing.equals(bytes)) return false;
  }
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const temporary = path.join(path.dirname(file), `.current-${process.pid}-${crypto.randomBytes(8).toString('hex')}.tmp`);
  ensureUnlinkedPath(temporary, root);
  writeSyncedFile(temporary, bytes);
  try {
    fs.renameSync(temporary, file);
    syncDirectoryBestEffort(path.dirname(file));
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, {force: true});
  }
  return true;
}

/**
 * Replace current.json only while its exact bytes still match the caller's base.
 * This is a cooperative compare-and-swap boundary for concurrent artifact commits.
 * @param {string} file
 * @param {Buffer|Uint8Array|string} bytes
 * @param {string} root
 * @param {string} expectedCurrentSha256
 * @returns {boolean} True when the current pointer changed.
 * @throws {Error} When current no longer matches the selected base.
 */
export function writeCurrentCompareAndSwap(file, bytes, root, expectedCurrentSha256) {
  ensureUnlinkedPath(file, root);
  assertSha256(expectedCurrentSha256, 'expectedCurrentSha256');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail('Current pointer is missing during compare-and-swap');
  const currentBytes = fs.readFileSync(file);
  if (sha256(currentBytes) !== expectedCurrentSha256) fail('Current pointer changed since the selected base snapshot');
  const nextBytes = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (currentBytes.equals(nextBytes)) return false;

  const temporary = path.join(path.dirname(file), `.current-${process.pid}-${crypto.randomBytes(8).toString('hex')}.tmp`);
  ensureUnlinkedPath(temporary, root);
  writeSyncedFile(temporary, nextBytes);
  try {
    const latestBytes = fs.readFileSync(file);
    if (sha256(latestBytes) !== expectedCurrentSha256) fail('Current pointer changed during compare-and-swap');
    fs.renameSync(temporary, file);
    syncDirectoryBestEffort(path.dirname(file));
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, {force: true});
  }
  return true;
}

/**
 * @param {string} root
 * @param {string} storedPath
 * @param {string} expectedHash
 * @param {string} label
 * @returns {{file:string, bytes:Buffer}}
 * @throws {Error} When the path or exact-byte hash is invalid.
 */
export function readBoundArtifact(root, storedPath, expectedHash, label) {
  assertSafeStoredPath(storedPath, `${label}.path`);
  assertSha256(expectedHash, `${label}.sha256`);
  const file = path.resolve(root, ...storedPath.split('/'));
  ensureUnlinkedPath(file, root);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(`${label} is missing: ${storedPath}`);
  const bytes = fs.readFileSync(file);
  const actual = sha256(bytes);
  if (actual !== expectedHash) fail(`${label} hash mismatch for ${storedPath}`);
  return {file, bytes};
}
