import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const ROOT_BOUND_TARGETS = Object.freeze({
  ux: 'ux/ux-spec.json',
  ui: 'ui/ui-spec.json',
});

function fail(message) {
  throw new Error(message);
}

function portableRelativeTarget(value, label) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} must be a non-empty relative path`);
  if (value.includes('\\') || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    fail(`${label} must be a portable path relative to the product-document root`);
  }
  const segments = value.split('/');
  if (segments.some(segment => segment === '' || segment === '.' || segment === '..')) {
    fail(`${label} must not traverse outside the product-document root`);
  }
  if (segments.some(segment => !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment)
    || /[. ]$/.test(segment)
    || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment))) {
    fail(`${label} contains an unsafe path segment`);
  }
  return segments;
}

function artifactId(value, label) {
  if (typeof value !== 'string'
    || value.length > 80
    || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)
    || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(value)) {
    fail(`${label} must be a lowercase hyphenated stable ID`);
  }
  return value;
}

/** Fixed product-document target for one independently versioned complex component. */
export function componentDesignTarget(componentId) {
  return `ui/components/${artifactId(componentId, 'componentId')}.json`;
}

function inspectUnlinkedAncestors(absolutePath, label) {
  const parsed = path.parse(absolutePath);
  let current = parsed.root;
  const segments = absolutePath.slice(parsed.root.length).split(path.sep).filter(Boolean);
  for (const segment of segments) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) continue;
    const stats = fs.lstatSync(current);
    if (stats.isSymbolicLink()) fail(`Refusing linked ${label}: ${current}`);
    if (current !== absolutePath && !stats.isDirectory()) fail(`${label} ancestor must be a directory: ${current}`);
  }
}

/** Resolve one portable artifact target beneath a canonical product-document root. */
export function resolveRootBoundTarget(productDocumentRoot, relativeTarget, label = 'artifact target') {
  if (typeof productDocumentRoot !== 'string' || productDocumentRoot.trim() === '') {
    fail('productDocumentRoot must be a non-empty path');
  }
  const root = path.resolve(productDocumentRoot);
  if (root === path.parse(root).root) fail('productDocumentRoot must not be a filesystem root');
  const segments = portableRelativeTarget(relativeTarget, label);
  const target = path.resolve(root, ...segments);
  const relative = path.relative(root, target);
  if (relative === '' || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    fail(`${label} escapes the product-document root`);
  }
  inspectUnlinkedAncestors(root, 'product-document root');
  inspectUnlinkedAncestors(target, label);
  if (fs.existsSync(root) && !fs.lstatSync(root).isDirectory()) fail(`productDocumentRoot must be a directory: ${root}`);
  return {root, target, relativeTarget: segments.join('/')};
}

function confirmExistingOwnership(target, validateExisting, label) {
  if (!fs.existsSync(target)) return;
  const stats = fs.lstatSync(target);
  if (stats.isSymbolicLink() || !stats.isFile()) fail(`Existing ${label} is not an owned regular file: ${target}`);
  if (typeof validateExisting !== 'function') fail(`Existing ${label} cannot be replaced without an ownership validator`);
  let existing;
  try {
    existing = JSON.parse(fs.readFileSync(target, 'utf8'));
    validateExisting(existing);
  } catch (error) {
    fail(`Existing ${label} is not owned by the expected artifact contract: ${error.message}`);
  }
}

/**
 * Persist JSON only after target containment, linked-path, and existing-owner checks.
 * validateExisting must accept only the exact artifact contract owned by the caller.
 */
export function writeOwnedJsonArtifact({
  productDocumentRoot,
  relativeTarget,
  value,
  validateExisting,
  beforeWrite,
  label = 'artifact target',
}, {beforeRename = () => {}} = {}) {
  if (typeof beforeRename !== 'function') fail('beforeRename must be a function');
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  const resolved = resolveRootBoundTarget(productDocumentRoot, relativeTarget, label);
  confirmExistingOwnership(resolved.target, validateExisting, label);
  if (beforeWrite !== undefined) {
    if (typeof beforeWrite !== 'function') fail('beforeWrite must be a function');
    beforeWrite(resolved.target);
  }

  // Recheck after callbacks and directory creation so a linked path cannot be
  // introduced between validation and persistence without being noticed.
  resolveRootBoundTarget(resolved.root, resolved.relativeTarget, label);
  fs.mkdirSync(path.dirname(resolved.target), {recursive: true});
  resolveRootBoundTarget(resolved.root, resolved.relativeTarget, label);
  confirmExistingOwnership(resolved.target, validateExisting, label);
  const temporary = path.join(
    path.dirname(resolved.target),
    `tmp-${path.basename(resolved.target)}-${process.pid}-${crypto.randomBytes(8).toString('hex')}.tmp`,
  );
  resolveRootBoundTarget(resolved.root, path.relative(resolved.root, temporary).split(path.sep).join('/'), `${label} staging file`);
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    beforeRename(temporary, resolved.target);
    resolveRootBoundTarget(resolved.root, resolved.relativeTarget, label);
    confirmExistingOwnership(resolved.target, validateExisting, label);
    fs.renameSync(temporary, resolved.target);
    let directoryDescriptor;
    try {
      directoryDescriptor = fs.openSync(path.dirname(resolved.target), 'r');
      fs.fsyncSync(directoryDescriptor);
    } catch {
      // Directory syncing is unavailable on some supported filesystems.
    } finally {
      if (directoryDescriptor !== undefined) fs.closeSync(directoryDescriptor);
    }
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.rmSync(temporary, {force: true});
  }
  return resolved.target;
}
