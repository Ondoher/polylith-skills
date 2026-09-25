import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ensureUnlinkedPath, fail, safeRelativeLabel, stableId} from './product-artifact-utils.mjs';
import {technicalDigest, validateRepositoryBaseline} from './technical-contract.mjs';

const git = (root, args) => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
const fields = source => source.split('\0').filter(Boolean);

/** Hash source without loading large unrelated dirty files into memory. */
export function inspectPath(root, relative, indexMode) {
  safeRelativeLabel(relative, 'repository path'); const file = path.resolve(root, relative);
  ensureUnlinkedPath(path.dirname(file), root);
  if (!fs.existsSync(file) && !fs.lstatSync(file, {throwIfNoEntry: false})) return {path: relative, workingSha256: null, mode: null};
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink()) return {path: relative, workingSha256: crypto.createHash('sha256').update(fs.readlinkSync(file)).digest('hex'), mode: '120000'};
  if (stat.isDirectory() && indexMode === '160000') return {path: relative, workingSha256: technicalDigest({head: git(file, ['rev-parse', 'HEAD']).trim(), status: git(file, ['status', '--porcelain=v1', '--untracked-files=all'])}), mode: '160000'};
  if (!stat.isFile()) fail(`Source inspection requires a regular file: ${relative}`);
  const digest = crypto.createHash('sha256'); const buffer = Buffer.alloc(64 * 1024); const fd = fs.openSync(file, 'r');
  try { let size; while ((size = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) digest.update(buffer.subarray(0, size)); } finally { fs.closeSync(fd); }
  return {path: relative, workingSha256: digest.digest('hex'), mode: process.platform === 'win32' ? (indexMode === '100755' ? '100755' : '100644') : ((stat.mode & 0o111) ? '100755' : '100644')};
}

function index(root) {
  return fields(git(root, ['ls-files', '--stage', '-z'])).map(line => {
    const match = /^(\d+) ([0-9a-f]+) (\d)\t([\s\S]+)$/.exec(line);
    if (!match || match[3] !== '0') fail('Repository has unresolved index stages');
    return {path: match[4], mode: match[1], stage: 0, objectId: match[2]};
  }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

function captureOnce(root, repositoryId, paths) {
  const entries = index(root); const byPath = new Map(entries.map(item => [item.path, item]));
  let head = null;
  try { head = git(root, ['rev-parse', '--verify', 'HEAD']).trim(); } catch { git(root, ['symbolic-ref', 'HEAD']); }
  const changes = fields(git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames'])).map(line => {
    const relative = line.slice(3); const entry = byPath.get(relative); const observed = inspectPath(root, relative, entry?.mode);
    return {path: relative, indexStatus: line[0], worktreeStatus: line[1], indexObjectId: entry?.objectId ?? null, workingSha256: observed.workingSha256, mode: observed.mode};
  }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const observations = [...new Set(paths)].sort().map(relative => inspectPath(root, relative, byPath.get(relative)?.mode));
  if (observations.some(item => item.mode === '160000')) fail('Inspect submodule source with its own repository baseline');
  const material = {repositoryId, head, indexSha256: technicalDigest(entries), changes, observations};
  const baseline = {id: `baseline-${technicalDigest(material).slice(0, 12)}`, ...material};
  baseline.materialSha256 = technicalDigest(baseline);
  return baseline;
}

/** A dirty repository is valid; capture twice to detect edits during inspection. */
export function captureRepositoryBaseline({repositoryRoot, repositoryId, paths}) {
  stableId(repositoryId, 'repositoryId'); if (!Array.isArray(paths) || !paths.length) fail('Inspect at least one source path');
  const root = fs.realpathSync(repositoryRoot);
  if (fs.realpathSync(git(root, ['rev-parse', '--show-toplevel']).trim()) !== root) fail('Supply the repository root');
  const first = captureOnce(root, repositoryId, paths); const second = captureOnce(root, repositoryId, paths);
  if (first.materialSha256 !== second.materialSha256) fail('Repository changed during inspection; retry the capture');
  return validateRepositoryBaseline(first);
}

/** Compare only consumed source facts, preserving unrelated dirty work. */
export function repositoryEvidenceCurrent(evidence, baseline, repositoryRoot) {
  const entries = new Map(index(repositoryRoot).map(item => [item.path, item]));
  return evidence.binding.paths.every(relative => {
    const previous = baseline.observations.find(item => item.path === relative);
    const current = inspectPath(repositoryRoot, relative, entries.get(relative)?.mode);
    return previous && previous.workingSha256 === current.workingSha256 && previous.mode === current.mode;
  });
}
