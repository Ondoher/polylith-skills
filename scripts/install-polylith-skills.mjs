#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {installerPlatform} from './installer-platform.mjs';

const MODES = new Set(['plan', 'status', 'install', 'repair', 'unlink', 'update', 'relocate']);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_REPOSITORY = path.resolve(path.dirname(SCRIPT_PATH), '..');
const BACKUP_MARKER = '.polylith-skills-backup-';
const AGENTS_BLOCK_BEGIN = '<!-- BEGIN POLYLITH SKILLS MANAGED BLOCK -->';
const AGENTS_BLOCK_END = '<!-- END POLYLITH SKILLS MANAGED BLOCK -->';
const PLATFORM = installerPlatform();

class InstallerError extends Error {
  constructor(message, code = 'INSTALLER_ERROR', details = undefined) {
    super(message);
    this.name = 'InstallerError';
    this.code = code;
    this.details = details;
  }
}

function parseArgs(argv) {
  const mode = argv[0];
  if (!MODES.has(mode)) {
    throw new InstallerError(
      'Usage: node scripts/install-polylith-skills.mjs <plan|status|install|repair|unlink|update|relocate> [--repository PATH] [--codex-home PATH] [--migrate-identical] [--apply --expect-plan SHA256]',
      'USAGE',
    );
  }
  const options = {mode, apply: false, migrateIdentical: false};
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--apply') options.apply = true;
    else if (argument === '--migrate-identical') options.migrateIdentical = true;
    else if (argument === '--repository' || argument === '--codex-home' || argument === '--expect-plan') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new InstallerError(`${argument} requires a value`, 'USAGE');
      if (argument === '--repository') options.repository = value;
      else if (argument === '--codex-home') options.codexHome = value;
      else options.expectPlan = value;
      index += 1;
    } else {
      throw new InstallerError(`Unknown argument: ${argument}`, 'USAGE');
    }
  }
  if ((mode === 'plan' || mode === 'status') && options.apply) {
    throw new InstallerError(`${mode} does not accept --apply`, 'USAGE');
  }
  if (options.expectPlan && !/^[a-f0-9]{64}$/u.test(options.expectPlan)) {
    throw new InstallerError('--expect-plan must be a lowercase SHA-256 digest', 'USAGE');
  }
  if (options.apply && !options.expectPlan) throw new InstallerError('--apply requires --expect-plan from the immediately preceding dry run', 'EXPECTED_PLAN_REQUIRED');
  if (!options.apply && options.expectPlan) throw new InstallerError('--expect-plan is valid only with --apply', 'USAGE');
  return options;
}

function canonical(value) {
  const resolved = path.resolve(value);
  return PLATFORM.caseInsensitivePaths ? resolved.toLowerCase() : resolved;
}

function samePath(left, right) {
  return canonical(left) === canonical(right);
}

function assertInside(root, candidate, label) {
  const rootPath = canonical(root);
  const candidatePath = canonical(candidate);
  if (candidatePath === rootPath || !candidatePath.startsWith(`${rootPath}${path.sep}`)) {
    throw new InstallerError(`${label} must stay inside ${root}`, 'PATH_ESCAPE', {path: candidate});
  }
}

function assertPhysicalParentInside(root, candidate, label) {
  if (!fs.existsSync(root)) throw new InstallerError(`Codex home does not exist: ${root}`, 'MISSING_CODEX_HOME');
  const physicalRoot = fs.realpathSync(root);
  let existing = path.dirname(candidate);
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) throw new InstallerError(`Cannot resolve an existing parent for ${label}`, 'PATH_ESCAPE');
    existing = parent;
  }
  const physicalParent = fs.realpathSync(existing);
  const rootPath = canonical(physicalRoot);
  const parentPath = canonical(physicalParent);
  if (parentPath !== rootPath && !parentPath.startsWith(`${rootPath}${path.sep}`)) {
    throw new InstallerError(`${label} resolves outside the physical Codex home`, 'PATH_ESCAPE', {path: candidate, physicalParent});
  }
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new InstallerError(`Cannot read ${label} at ${file}: ${error.message}`, 'INVALID_JSON');
  }
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function managedAgentsBlock(repositoryInfo) {
  const source = fs.readFileSync(repositoryInfo.codexAgentsFile, 'utf8');
  if (source.includes(AGENTS_BLOCK_BEGIN) || source.includes(AGENTS_BLOCK_END)) {
    throw new InstallerError('Managed Codex AGENTS.md source must not contain reserved block markers', 'INVALID_REPOSITORY');
  }
  const body = source.trimEnd();
  if (body.length === 0) throw new InstallerError('Managed Codex AGENTS.md source must not be empty', 'INVALID_REPOSITORY');
  const block = `${AGENTS_BLOCK_BEGIN}\n${body}\n${AGENTS_BLOCK_END}`;
  return {
    source,
    sourceSha256: sha256Text(source),
    block,
    blockSha256: sha256Text(block),
  };
}

function markerPositions(content, marker) {
  const positions = [];
  let offset = 0;
  while (offset <= content.length) {
    const position = content.indexOf(marker, offset);
    if (position === -1) break;
    positions.push(position);
    offset = position + marker.length;
  }
  return positions;
}

function inspectManagedAgentsBlock(content) {
  const begins = markerPositions(content, AGENTS_BLOCK_BEGIN);
  const ends = markerPositions(content, AGENTS_BLOCK_END);
  if (begins.length === 0 && ends.length === 0) return {kind: 'absent'};
  if (begins.length !== 1 || ends.length !== 1 || ends[0] < begins[0]) {
    return {kind: 'malformed', begins: begins.length, ends: ends.length};
  }
  const start = begins[0];
  const end = ends[0] + AGENTS_BLOCK_END.length;
  const block = content.slice(start, end);
  return {kind: 'present', start, end, block, blockSha256: sha256Text(block)};
}

function insertManagedAgentsBlock(content, block) {
  return content.length === 0 ? `${block}\n` : `${block}\n\n${content}`;
}

function updateManagedAgentsBlock(content, inspected, block) {
  return `${content.slice(0, inspected.start)}${block}${content.slice(inspected.end)}`;
}

function removeManagedAgentsBlock(content, inspected) {
  let suffix = content.slice(inspected.end);
  if (suffix.startsWith('\n\n')) suffix = suffix.slice(2);
  else if (suffix.startsWith('\n')) suffix = suffix.slice(1);
  return `${content.slice(0, inspected.start)}${suffix}`;
}

function uniqueStrings(values, label) {
  if (!Array.isArray(values) || values.length === 0 || values.some(value => typeof value !== 'string' || value.length === 0)) {
    throw new InstallerError(`${label} must be a non-empty string array`, 'INVALID_MANIFEST');
  }
  if (new Set(values).size !== values.length) throw new InstallerError(`${label} contains duplicates`, 'INVALID_MANIFEST');
  return values;
}

function optionalUniqueStrings(values, label) {
  if (values === undefined) return [];
  if (!Array.isArray(values) || values.some(value => typeof value !== 'string' || value.length === 0)) {
    throw new InstallerError(`${label} must be a string array`, 'INVALID_MANIFEST');
  }
  if (new Set(values).size !== values.length) throw new InstallerError(`${label} contains duplicates`, 'INVALID_MANIFEST');
  return values;
}

function safeRelative(root, relative, label) {
  if (typeof relative !== 'string' || relative.length === 0 || path.isAbsolute(relative)) {
    throw new InstallerError(`${label} must be a non-empty relative path`, 'INVALID_MANIFEST');
  }
  const resolved = path.resolve(root, relative);
  assertInside(root, resolved, label);
  return resolved;
}

function listFiles(directory, suffix = undefined) {
  return fs.readdirSync(directory, {withFileTypes: true})
    .filter(entry => entry.isFile() && (!suffix || entry.name.endsWith(suffix)))
    .map(entry => entry.name)
    .sort();
}

function validateRepository(repository) {
  const root = fs.realpathSync(path.resolve(repository));
  const manifestPath = path.join(root, 'governance.json');
  const manifest = readJson(manifestPath, 'governance manifest');
  if (manifest.schemaVersion !== 1) throw new InstallerError('governance.json schemaVersion must be 1', 'INVALID_MANIFEST');
  if (!manifest.repository || typeof manifest.repository.id !== 'string' || typeof manifest.repository.canonicalRemote !== 'string' || typeof manifest.repository.defaultBranch !== 'string') {
    throw new InstallerError('governance.json repository metadata is incomplete', 'INVALID_MANIFEST');
  }
  if (!manifest.catalog || !manifest.install) throw new InstallerError('governance.json catalog and install objects are required', 'INVALID_MANIFEST');
  const skills = uniqueStrings(manifest.catalog.skills, 'catalog.skills');
  const retiredSkills = optionalUniqueStrings(manifest.catalog.retiredSkills, 'catalog.retiredSkills');
  for (const skill of retiredSkills) {
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(skill)) throw new InstallerError(`Unsafe retired skill name: ${skill}`, 'INVALID_MANIFEST');
    if (skills.includes(skill)) throw new InstallerError(`Skill cannot be both managed and retired: ${skill}`, 'INVALID_MANIFEST');
  }
  const agents = uniqueStrings(manifest.catalog.agents, 'catalog.agents');
  const requiredDocumentation = uniqueStrings(manifest.catalog.requiredDocumentation, 'catalog.requiredDocumentation');
  const requiredPlanning = optionalUniqueStrings(manifest.catalog.requiredPlanning, 'catalog.requiredPlanning');
  const skillsDirectory = safeRelative(root, manifest.install.skillsDirectory, 'install.skillsDirectory');
  const agentsDirectory = safeRelative(root, manifest.install.agentsDirectory, 'install.agentsDirectory');
  const documentationDirectory = safeRelative(root, manifest.install.documentationDirectory, 'install.documentationDirectory');
  const codexAgentsFile = safeRelative(root, manifest.install.codexAgentsFile, 'install.codexAgentsFile');
  if (typeof manifest.install.stateFile !== 'string' || !/^\.[A-Za-z0-9._-]+\.json$/u.test(manifest.install.stateFile)) {
    throw new InstallerError('install.stateFile must be a dot-prefixed JSON filename', 'INVALID_MANIFEST');
  }
  for (const skill of skills) {
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(skill)) throw new InstallerError(`Unsafe skill name: ${skill}`, 'INVALID_MANIFEST');
    const skillRoot = path.join(skillsDirectory, skill);
    assertInside(skillsDirectory, skillRoot, `skill ${skill}`);
    if (!fs.statSync(skillRoot).isDirectory() || !fs.statSync(path.join(skillRoot, 'SKILL.md')).isFile()) {
      throw new InstallerError(`Managed skill ${skill} must contain SKILL.md`, 'INVALID_REPOSITORY');
    }
  }
  if (!fs.statSync(agentsDirectory).isDirectory()) throw new InstallerError('Managed agents directory is missing', 'INVALID_REPOSITORY');
  const actualAgents = listFiles(agentsDirectory, '.toml');
  const expectedAgents = [...agents].sort();
  if (JSON.stringify(actualAgents) !== JSON.stringify(expectedAgents)) {
    throw new InstallerError('The agents directory must exactly match catalog.agents', 'INVALID_REPOSITORY', {expectedAgents, actualAgents});
  }
  for (const relative of requiredDocumentation) {
    const required = safeRelative(documentationDirectory, relative, `required documentation ${relative}`);
    if (!fs.existsSync(required)) throw new InstallerError(`Required documentation is missing: ${relative}`, 'INVALID_REPOSITORY');
  }
  // Planning contracts are read through the physical governance checkout, not
  // a separate user-level link. Validate them before accepting that checkout.
  for (const relative of requiredPlanning) {
    const required = safeRelative(path.join(root, 'planning'), relative, `required planning ${relative}`);
    if (!fs.existsSync(required) || !fs.statSync(required).isDirectory()) {
      throw new InstallerError(`Required planning directory is missing: ${relative}`, 'INVALID_REPOSITORY');
    }
  }
  if (!fs.statSync(codexAgentsFile).isFile()) throw new InstallerError('Managed Codex AGENTS.md is missing', 'INVALID_REPOSITORY');
  return {root, manifest, manifestPath, skills, retiredSkills, agents, skillsDirectory, agentsDirectory, documentationDirectory, codexAgentsFile};
}

function run(command, args, cwd, allowFailure = false) {
  const result = spawnSync(command, args, {cwd, encoding: 'utf8', windowsHide: true});
  if (result.error || (!allowFailure && result.status !== 0)) {
    const detail = result.error?.message || result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`;
    throw new InstallerError(`${command} ${args.join(' ')} failed: ${detail}`, 'COMMAND_FAILED', {command, args, cwd});
  }
  return {status: result.status, stdout: result.stdout?.trim() ?? '', stderr: result.stderr?.trim() ?? ''};
}

function normalizeRemote(remote) {
  return remote.trim().replace(/\\/gu, '/').replace(/\.git\/?$/u, '');
}

function gitIdentity(repository, manifest, {requireClean = false} = {}) {
  const inside = run('git', ['rev-parse', '--show-toplevel'], repository).stdout;
  if (!samePath(inside, repository)) throw new InstallerError('Repository path is not the Git worktree root', 'UNTRUSTED_CHECKOUT');
  const remote = run('git', ['config', '--get', 'remote.origin.url'], repository).stdout;
  if (normalizeRemote(remote) !== normalizeRemote(manifest.repository.canonicalRemote)) {
    throw new InstallerError('origin does not match governance.json canonicalRemote', 'UNTRUSTED_CHECKOUT', {expected: manifest.repository.canonicalRemote, actual: remote});
  }
  const branch = run('git', ['branch', '--show-current'], repository).stdout;
  if (branch !== manifest.repository.defaultBranch) {
    throw new InstallerError('Current branch does not match governance.json defaultBranch', 'UNTRUSTED_CHECKOUT', {expected: manifest.repository.defaultBranch, actual: branch});
  }
  const upstream = run('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], repository, true);
  if (upstream.status === 0 && upstream.stdout !== `origin/${manifest.repository.defaultBranch}`) {
    throw new InstallerError('Current branch has an unexpected upstream', 'UNTRUSTED_CHECKOUT', {actual: upstream.stdout});
  }
  const dirty = run('git', ['status', '--porcelain', '--untracked-files=all'], repository).stdout;
  if (requireClean && dirty.length > 0) throw new InstallerError('Governance checkout must be clean', 'DIRTY_CHECKOUT');
  return {remote, branch, upstream: upstream.status === 0 ? upstream.stdout : null, clean: dirty.length === 0};
}

function codexHomePath(option) {
  const resolved = path.resolve(option || process.env.CODEX_HOME || path.join(os.homedir(), '.codex'));
  return fs.existsSync(resolved) ? fs.realpathSync.native(resolved) : resolved;
}

function statePath(codexHome, repositoryInfo) {
  const file = path.join(codexHome, repositoryInfo.manifest.install.stateFile);
  assertInside(codexHome, file, 'installation state');
  assertPhysicalParentInside(codexHome, file, 'installation state');
  return file;
}

function readState(file, required = false) {
  if (!fs.existsSync(file)) {
    if (required) throw new InstallerError(`Installation state is missing: ${file}`, 'NOT_INSTALLED');
    return null;
  }
  const state = readJson(file, 'installation state');
  if (state.schemaVersion !== 2 || !Array.isArray(state.links) || !Array.isArray(state.catalogSkills) || !state.agentsBlock) {
    throw new InstallerError('Installation state is invalid', 'INVALID_STATE');
  }
  return state;
}

function entryKind(candidate) {
  if (!fs.existsSync(candidate) && !fs.lstatSync(path.dirname(candidate), {throwIfNoEntry: false})) return 'absent';
  const stat = fs.lstatSync(candidate, {throwIfNoEntry: false});
  if (!stat) return 'absent';
  if (stat.isSymbolicLink()) return 'link';
  if (stat.isDirectory()) return 'directory';
  if (stat.isFile()) return 'file';
  return 'other';
}

function resolvedLinkTarget(link) {
  const raw = fs.readlinkSync(link);
  const target = path.resolve(path.dirname(link), raw);
  return fs.existsSync(target) ? fs.realpathSync(target) : target;
}

function directoryEntries(directory) {
  return fs.readdirSync(directory, {withFileTypes: true})
    .filter(entry => entry.name !== 'node_modules')
    .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
}

function contentEqual(left, right) {
  const leftKind = entryKind(left);
  const rightKind = entryKind(right);
  if (leftKind !== rightKind || !['file', 'directory'].includes(leftKind)) return false;
  if (leftKind === 'file') {
    const leftStat = fs.statSync(left);
    const rightStat = fs.statSync(right);
    return leftStat.size === rightStat.size && sha256File(left) === sha256File(right);
  }
  const leftEntries = directoryEntries(left);
  const rightEntries = directoryEntries(right);
  if (leftEntries.length !== rightEntries.length) return false;
  for (let index = 0; index < leftEntries.length; index += 1) {
    if (leftEntries[index].name !== rightEntries[index].name) return false;
    if (!contentEqual(path.join(left, leftEntries[index].name), path.join(right, rightEntries[index].name))) return false;
  }
  return true;
}

function desiredLinks(codexHome, repositoryInfo) {
  const skillRoot = path.join(codexHome, 'skills');
  assertInside(codexHome, skillRoot, 'Codex skill root');
  const links = repositoryInfo.skills.map(skill => ({
    id: `skill:${skill}`,
    kind: 'skill',
    path: path.join(skillRoot, skill),
    target: path.join(repositoryInfo.skillsDirectory, skill),
  }));
  links.push({id: 'agents', kind: 'agents', path: path.join(codexHome, 'agents'), target: repositoryInfo.agentsDirectory});
  links.push({id: 'documentation', kind: 'documentation', path: path.join(codexHome, 'documentation'), target: repositoryInfo.documentationDirectory});
  for (const link of links) {
    assertInside(codexHome, link.path, link.id);
    assertPhysicalParentInside(codexHome, link.path, link.id);
  }
  return links;
}

function validateStateInventory(state, codexHome, repositoryInfo, {exact = true, relocating = false} = {}) {
  if (typeof state.repositoryId !== 'string' || typeof state.repositoryRoot !== 'string' || !path.isAbsolute(state.repositoryRoot)
    || typeof state.canonicalRemote !== 'string' || typeof state.branch !== 'string') {
    throw new InstallerError('Installation state repository metadata is invalid', 'INVALID_STATE');
  }
  if (state.repositoryId !== repositoryInfo.manifest.repository.id) throw new InstallerError('Installation state belongs to another repository', 'INVALID_STATE');
  if (normalizeRemote(state.canonicalRemote) !== normalizeRemote(repositoryInfo.manifest.repository.canonicalRemote)
    || state.branch !== repositoryInfo.manifest.repository.defaultBranch) {
    throw new InstallerError('Installation state remote or branch does not match the manifest', 'INVALID_STATE');
  }
  const oldRoot = path.resolve(state.repositoryRoot);
  const expectedById = new Map();
  for (const skill of state.catalogSkills) {
    if (typeof skill !== 'string' || !/^[a-z0-9][a-z0-9-]*$/u.test(skill)) throw new InstallerError('Installation state contains an unsafe skill name', 'INVALID_STATE');
    expectedById.set(`skill:${skill}`, {kind: 'skill', path: path.join(codexHome, 'skills', skill), target: path.join(oldRoot, 'skills', skill)});
  }
  expectedById.set('agents', {kind: 'agents', path: path.join(codexHome, 'agents'), target: path.join(oldRoot, 'agents')});
  expectedById.set('documentation', {kind: 'documentation', path: path.join(codexHome, 'documentation'), target: path.join(oldRoot, 'documentation')});
  if (state.links.length !== expectedById.size) throw new InstallerError('Installation state link inventory is incomplete', 'INVALID_STATE');
  const seenIds = new Set();
  const seenPaths = new Set();
  for (const record of state.links) {
    if (!record || typeof record.id !== 'string' || typeof record.kind !== 'string' || typeof record.path !== 'string' || typeof record.target !== 'string') {
      throw new InstallerError('Installation state contains an invalid link record', 'INVALID_STATE');
    }
    const expected = expectedById.get(record.id);
    if (!expected || seenIds.has(record.id) || seenPaths.has(canonical(record.path))
      || record.kind !== expected.kind || !samePath(record.path, expected.path) || !samePath(record.target, expected.target)) {
      throw new InstallerError(`Installation state link record is not owned: ${record.id}`, 'INVALID_STATE');
    }
    assertInside(codexHome, record.path, `recorded link ${record.id}`);
    assertPhysicalParentInside(codexHome, record.path, `recorded link ${record.id}`);
    seenIds.add(record.id);
    seenPaths.add(canonical(record.path));
  }
  if (!state.agentsBlock || typeof state.agentsBlock.path !== 'string' || typeof state.agentsBlock.source !== 'string'
    || state.agentsBlock.beginMarker !== AGENTS_BLOCK_BEGIN || state.agentsBlock.endMarker !== AGENTS_BLOCK_END
    || !/^[a-f0-9]{64}$/u.test(state.agentsBlock.sha256 || '')
    || !/^[a-f0-9]{64}$/u.test(state.agentsBlock.sourceSha256 || '')
    || !samePath(state.agentsBlock.path, path.join(codexHome, 'AGENTS.md'))
    || !samePath(state.agentsBlock.source, path.join(oldRoot, 'codex-home', 'AGENTS.md'))) {
    throw new InstallerError('Installation state AGENTS.md managed-block record is invalid', 'INVALID_STATE');
  }
  assertPhysicalParentInside(codexHome, state.agentsBlock.path, 'recorded AGENTS.md');
  if (!relocating && !samePath(oldRoot, repositoryInfo.root)) throw new InstallerError('Installation state records another repository path', 'INVALID_STATE');
  if (exact) {
    const currentSkills = [...repositoryInfo.skills].sort();
    const recordedSkills = [...state.catalogSkills].sort();
    if (JSON.stringify(currentSkills) !== JSON.stringify(recordedSkills)) throw new InstallerError('Installation state catalog does not match the repository manifest', 'INVALID_STATE');
  }
}

function linkAction(link, {migrateIdentical, state, relocate}) {
  const kind = entryKind(link.path);
  if (kind === 'absent') return {...link, action: 'create-link'};
  if (kind === 'link') {
    const actualTarget = resolvedLinkTarget(link.path);
    if (samePath(actualTarget, link.target)) return {...link, action: 'none', actualTarget};
    const recorded = state?.links?.find(item => samePath(item.path, link.path));
    if (relocate && recorded && samePath(actualTarget, recorded.target)) return {...link, action: 'replace-owned-link', actualTarget};
    return {...link, action: 'collision', reason: 'existing link targets another location', actualTarget};
  }
  if (kind === 'directory' && migrateIdentical && contentEqual(link.path, link.target)) {
    return {...link, action: 'migrate-identical-directory'};
  }
  return {...link, action: 'collision', reason: `existing ${kind} is not an owned link${migrateIdentical ? ' or identical directory' : ''}`};
}

function agentsBlockAction(codexHome, repositoryInfo, state) {
  const destination = path.join(codexHome, 'AGENTS.md');
  assertInside(codexHome, destination, 'Codex AGENTS.md');
  const desired = managedAgentsBlock(repositoryInfo);
  const base = {
    id: 'codex-agents-block',
    kind: 'managed-block',
    path: destination,
    source: repositoryInfo.codexAgentsFile,
    sourceSha256: desired.sourceSha256,
    blockSha256: desired.blockSha256,
    beginMarker: AGENTS_BLOCK_BEGIN,
    endMarker: AGENTS_BLOCK_END,
  };
  const kind = entryKind(destination);
  if (kind === 'absent') return {...base, action: 'insert-managed-block'};
  if (kind !== 'file') return {...base, action: 'collision', reason: `existing ${kind}`};
  const content = fs.readFileSync(destination, 'utf8');
  const inspected = inspectManagedAgentsBlock(content);
  if (inspected.kind === 'malformed') return {...base, action: 'collision', reason: 'managed block markers are malformed or duplicated'};
  if (inspected.kind === 'absent') {
    const unmarkedBody = desired.source.trimEnd();
    if (!state && content.includes(unmarkedBody)) {
      return {...base, action: 'collision', reason: 'unmarked content matches the managed instructions and cannot be claimed safely'};
    }
    return {...base, action: 'insert-managed-block'};
  }
  const currentBlockSha256 = inspected.blockSha256;
  if (!state) return {...base, currentBlockSha256, action: 'collision', reason: 'managed block exists without installation ownership state'};
  if (currentBlockSha256 !== state.agentsBlock.sha256) {
    return {...base, currentBlockSha256, action: 'collision', reason: 'managed block was modified outside the installer'};
  }
  if (currentBlockSha256 === desired.blockSha256) return {...base, currentBlockSha256, action: 'none'};
  return {...base, currentBlockSha256, action: 'update-managed-block'};
}

function dependencyActions(repositoryInfo) {
  return repositoryInfo.skills
    .map(skill => path.join(repositoryInfo.skillsDirectory, skill))
    .filter(skillRoot => fs.existsSync(path.join(skillRoot, 'package-lock.json')))
    .map(skillRoot => ({action: 'npm-ci', cwd: skillRoot, command: ['npm', 'ci', '--ignore-scripts']}));
}

function buildPlan(options, repositoryInfo, state) {
  const codexHome = codexHomePath(options.codexHome);
  const relocate = options.mode === 'relocate';
  const desired = desiredLinks(codexHome, repositoryInfo);
  const links = desired.map(link => linkAction(link, {
    migrateIdentical: options.migrateIdentical,
    state,
    relocate,
  }));
  if (state) {
    const desiredIds = new Set(desired.map(link => link.id));
    for (const recorded of state.links) {
      if (desiredIds.has(recorded.id)) continue;
      const kind = entryKind(recorded.path);
      if (kind === 'absent') links.push({...recorded, action: 'drop-obsolete-record', reason: 'owned link is already absent'});
      else if (!recorded.id.startsWith('skill:') || !repositoryInfo.retiredSkills.includes(recorded.id.slice('skill:'.length))) {
        links.push({...recorded, action: 'collision', reason: 'obsolete state entry is not authorized by catalog.retiredSkills'});
      }
      else if (kind === 'link' && samePath(resolvedLinkTarget(recorded.path), recorded.target)) links.push({...recorded, action: 'remove-obsolete-owned-link'});
      else links.push({...recorded, action: 'collision', reason: 'obsolete recorded path is no longer the owned link'});
    }
  }
  const agentsBlock = agentsBlockAction(codexHome, repositoryInfo, state);
  const collisions = [...links, agentsBlock].filter(item => item.action === 'collision');
  const dependencies = ['install', 'repair', 'update', 'plan', 'relocate'].includes(options.mode) ? dependencyActions(repositoryInfo) : [];
  return {
    schemaVersion: 1,
    mode: options.mode,
    apply: options.apply,
    repository: repositoryInfo.root,
    codexHome,
    stateFile: statePath(codexHome, repositoryInfo),
    dependencies,
    links,
    agentsBlock,
    collisions,
    healthy: collisions.length === 0 && links.every(item => item.action === 'none') && agentsBlock.action === 'none',
  };
}

function ensureDependencies(actions) {
  const dependency = PLATFORM.dependencyCommand;
  for (const action of actions) {
    run(dependency.command, [...dependency.args], action.cwd);
  }
}

function createDirectoryLink(target, destination) {
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.symlinkSync(target, destination, PLATFORM.directoryLinkType);
}

function removeDirectoryLink(link) {
  const stat = fs.lstatSync(link, {throwIfNoEntry: false});
  if (!stat?.isSymbolicLink()) throw new InstallerError(`Refusing to remove non-link ${link}`, 'UNOWNED_PATH');
  try {
    fs.unlinkSync(link);
  } catch (error) {
    if (PLATFORM.directoryLinkRemovalFallback !== 'rmdir') throw error;
    fs.rmdirSync(link);
  }
}

function backupPath(original, token) {
  const candidate = `${original}${BACKUP_MARKER}${token}`;
  assertInside(path.dirname(original), candidate, 'backup');
  return candidate;
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, {flag: 'wx'});
  fs.renameSync(temp, file);
}

function installationState(plan, repositoryInfo) {
  return {
    schemaVersion: 2,
    repositoryId: repositoryInfo.manifest.repository.id,
    repositoryRoot: repositoryInfo.root,
    canonicalRemote: repositoryInfo.manifest.repository.canonicalRemote,
    branch: repositoryInfo.manifest.repository.defaultBranch,
    catalogSkills: [...repositoryInfo.skills],
    installedAt: new Date().toISOString(),
    links: plan.links.filter(link => !['remove-obsolete-owned-link', 'drop-obsolete-record'].includes(link.action))
      .map(link => ({id: link.id, kind: link.kind, path: link.path, target: link.target, linkType: PLATFORM.recordedLinkType})),
    agentsBlock: {
      path: plan.agentsBlock.path,
      source: plan.agentsBlock.source,
      beginMarker: AGENTS_BLOCK_BEGIN,
      endMarker: AGENTS_BLOCK_END,
      sha256: plan.agentsBlock.blockSha256,
      sourceSha256: plan.agentsBlock.sourceSha256,
    },
  };
}

function transformAgentsBlock(action, content, desired, expectedCurrentBlockSha256 = undefined) {
  const inspected = inspectManagedAgentsBlock(content);
  if (action === 'insert-managed-block') {
    if (inspected.kind !== 'absent') throw new InstallerError('AGENTS.md insertion plan became stale', 'STALE_PLAN');
    return insertManagedAgentsBlock(content, desired.block);
  }
  if (action === 'update-managed-block') {
    if (inspected.kind !== 'present' || inspected.blockSha256 !== expectedCurrentBlockSha256) {
      throw new InstallerError('AGENTS.md managed-block update plan became stale', 'STALE_PLAN');
    }
    return updateManagedAgentsBlock(content, inspected, desired.block);
  }
  throw new InstallerError(`Unsupported AGENTS.md managed-block action ${action}`, 'INTERNAL_ERROR');
}

function applyPlan(plan, repositoryInfo) {
  if (plan.collisions.length > 0) throw new InstallerError('Plan contains collisions; no changes were made', 'COLLISIONS', plan.collisions);
  ensureDependencies(plan.dependencies);
  const token = `${process.pid}-${Date.now()}`;
  const createdLinks = [];
  const backups = [];
  let createdAgentsFile = false;
  let agentsBackup = null;
  try {
    for (const item of plan.links) {
      if (['none', 'drop-obsolete-record'].includes(item.action)) continue;
      if (item.action === 'migrate-identical-directory') {
        if (entryKind(item.path) !== 'directory' || !contentEqual(item.path, item.target)) {
          throw new InstallerError(`Identical-copy migration became stale: ${item.path}`, 'STALE_PLAN');
        }
      } else if (item.action === 'create-link' && entryKind(item.path) !== 'absent') {
        throw new InstallerError(`Link creation plan became stale: ${item.path}`, 'STALE_PLAN');
      } else if (['replace-owned-link', 'remove-obsolete-owned-link'].includes(item.action)
        && (entryKind(item.path) !== 'link' || !samePath(resolvedLinkTarget(item.path), item.actualTarget || item.target))) {
        throw new InstallerError(`Owned-link plan became stale: ${item.path}`, 'STALE_PLAN');
      }
      if (item.action === 'replace-owned-link') {
        removeDirectoryLink(item.path);
        backups.push({kind: 'old-link', path: item.path, target: item.actualTarget});
      } else if (item.action === 'remove-obsolete-owned-link') {
        removeDirectoryLink(item.path);
        backups.push({kind: 'old-link', path: item.path, target: item.target});
        continue;
      } else if (item.action === 'migrate-identical-directory') {
        const backup = backupPath(item.path, token);
        assertPhysicalParentInside(plan.codexHome, backup, 'migration backup');
        fs.renameSync(item.path, backup);
        backups.push({kind: 'directory', path: item.path, backup});
      } else if (item.action !== 'create-link') {
        throw new InstallerError(`Unsupported link action ${item.action}`, 'INTERNAL_ERROR');
      }
      createDirectoryLink(item.target, item.path);
      createdLinks.push(item.path);
      const injectedFailureCount = process.env.NODE_ENV === 'test'
        ? Number.parseInt(process.env.POLYLITH_SKILLS_TEST_FAIL_AFTER_LINKS || '', 10)
        : Number.NaN;
      if (Number.isInteger(injectedFailureCount) && injectedFailureCount > 0 && createdLinks.length >= injectedFailureCount) {
        throw new InstallerError('Injected link failure for rollback verification', 'TEST_INJECTED_FAILURE');
      }
    }
    const desiredAgentsBlock = managedAgentsBlock(repositoryInfo);
    if (desiredAgentsBlock.blockSha256 !== plan.agentsBlock.blockSha256
      || desiredAgentsBlock.sourceSha256 !== plan.agentsBlock.sourceSha256) {
      throw new InstallerError('Managed AGENTS.md source changed after planning', 'STALE_PLAN');
    }
    if (plan.agentsBlock.action === 'none') {
      if (entryKind(plan.agentsBlock.path) !== 'file') throw new InstallerError('Managed AGENTS.md disappeared after planning', 'STALE_PLAN');
      const current = inspectManagedAgentsBlock(fs.readFileSync(plan.agentsBlock.path, 'utf8'));
      if (current.kind !== 'present' || current.blockSha256 !== plan.agentsBlock.blockSha256) {
        throw new InstallerError('Managed AGENTS.md block changed after planning', 'STALE_PLAN');
      }
    } else if (['insert-managed-block', 'update-managed-block'].includes(plan.agentsBlock.action)) {
      const kind = entryKind(plan.agentsBlock.path);
      if (!['absent', 'file'].includes(kind) || (kind === 'absent' && plan.agentsBlock.action !== 'insert-managed-block')) {
        throw new InstallerError('Managed AGENTS.md destination changed after planning', 'STALE_PLAN');
      }
      fs.mkdirSync(path.dirname(plan.agentsBlock.path), {recursive: true});
      if (kind === 'file') {
        agentsBackup = backupPath(plan.agentsBlock.path, token);
        fs.renameSync(plan.agentsBlock.path, agentsBackup);
        const previous = fs.readFileSync(agentsBackup, 'utf8');
        const next = transformAgentsBlock(
          plan.agentsBlock.action,
          previous,
          desiredAgentsBlock,
          plan.agentsBlock.currentBlockSha256,
        );
        fs.writeFileSync(plan.agentsBlock.path, next, {flag: 'wx'});
      } else {
        const next = transformAgentsBlock(plan.agentsBlock.action, '', desiredAgentsBlock);
        fs.writeFileSync(plan.agentsBlock.path, next, {flag: 'wx'});
        createdAgentsFile = true;
      }
    } else {
      throw new InstallerError(`Unsupported AGENTS.md managed-block action ${plan.agentsBlock.action}`, 'INTERNAL_ERROR');
    }
    writeJsonAtomic(plan.stateFile, installationState(plan, repositoryInfo));
  } catch (error) {
    for (const link of createdLinks.reverse()) {
      if (entryKind(link) === 'link') removeDirectoryLink(link);
    }
    if (createdAgentsFile && fs.existsSync(plan.agentsBlock.path)) fs.unlinkSync(plan.agentsBlock.path);
    if (agentsBackup) {
      if (fs.existsSync(plan.agentsBlock.path)) fs.unlinkSync(plan.agentsBlock.path);
      if (fs.existsSync(agentsBackup)) fs.renameSync(agentsBackup, plan.agentsBlock.path);
    }
    for (const backup of backups.reverse()) {
      if (backup.kind === 'directory' && fs.existsSync(backup.backup)) fs.renameSync(backup.backup, backup.path);
      if (backup.kind === 'old-link' && entryKind(backup.path) === 'absent') createDirectoryLink(backup.target, backup.path);
    }
    throw error;
  }
  if (agentsBackup && fs.existsSync(agentsBackup)) fs.unlinkSync(agentsBackup);
  for (const backup of backups) {
    if (backup.kind !== 'directory') continue;
    if (!path.basename(backup.backup).includes(BACKUP_MARKER)) throw new InstallerError('Refusing to remove unexpected backup path', 'INTERNAL_ERROR');
    assertInside(plan.codexHome, backup.backup, 'migration backup');
    fs.rmSync(backup.backup, {recursive: true, force: false});
  }
}

function statusReport(options, repositoryInfo, state) {
  const plan = buildPlan({...options, mode: 'status', migrateIdentical: false}, repositoryInfo, state);
  const dependencyHealth = dependencyActions(repositoryInfo).map(action => ({
    cwd: action.cwd,
    healthy: fs.existsSync(path.join(action.cwd, 'node_modules')),
  }));
  const stateMatches = Boolean(state)
    && state.repositoryId === repositoryInfo.manifest.repository.id
    && samePath(state.repositoryRoot, repositoryInfo.root)
    && normalizeRemote(state.canonicalRemote) === normalizeRemote(repositoryInfo.manifest.repository.canonicalRemote)
    && state.branch === repositoryInfo.manifest.repository.defaultBranch;
  return {
    ...plan,
    installed: Boolean(state),
    stateMatches,
    dependencyHealth,
    healthy: Boolean(state) && stateMatches && plan.collisions.length === 0
      && plan.links.every(item => item.action === 'none')
      && plan.agentsBlock.action === 'none'
      && dependencyHealth.every(item => item.healthy),
  };
}

function unlinkPlan(codexHome, repositoryInfo, state) {
  validateStateInventory(state, codexHome, repositoryInfo, {exact: true});
  const installationStateFile = statePath(codexHome, repositoryInfo);
  const actions = [];
  for (const recorded of state.links) {
    assertInside(codexHome, recorded.path, `recorded link ${recorded.id}`);
    const kind = entryKind(recorded.path);
    if (kind === 'absent') actions.push({...recorded, action: 'none', reason: 'already absent'});
    else if (kind === 'link' && samePath(resolvedLinkTarget(recorded.path), recorded.target)) actions.push({...recorded, action: 'remove-owned-link'});
    else actions.push({...recorded, action: 'collision', reason: 'recorded path is no longer the owned link'});
  }
  const agentsBlock = state.agentsBlock;
  assertInside(codexHome, agentsBlock.path, 'recorded AGENTS.md');
  let agentsBlockAction;
  const repositoryBlock = managedAgentsBlock(repositoryInfo);
  const agentsKind = entryKind(agentsBlock.path);
  if (agentsBlock.sha256 !== repositoryBlock.blockSha256 || agentsBlock.sourceSha256 !== repositoryBlock.sourceSha256) {
    agentsBlockAction = {
      ...agentsBlock,
      repositoryBlockSha256: repositoryBlock.blockSha256,
      repositorySourceSha256: repositoryBlock.sourceSha256,
      action: 'collision',
      reason: 'recorded managed block does not match the current trusted repository source; repair before unlinking',
    };
  } else if (agentsKind === 'absent') {
    agentsBlockAction = {...agentsBlock, action: 'none', reason: 'managed block is already absent'};
  } else if (agentsKind !== 'file') {
    agentsBlockAction = {...agentsBlock, action: 'collision', reason: `AGENTS.md is an unexpected ${agentsKind}`};
  } else {
    const inspected = inspectManagedAgentsBlock(fs.readFileSync(agentsBlock.path, 'utf8'));
    if (inspected.kind === 'absent') agentsBlockAction = {...agentsBlock, action: 'none', reason: 'managed block is already absent'};
    else if (inspected.kind === 'malformed') agentsBlockAction = {...agentsBlock, action: 'collision', reason: 'managed block markers are malformed or duplicated'};
    else if (inspected.blockSha256 === agentsBlock.sha256) {
      agentsBlockAction = {...agentsBlock, currentBlockSha256: inspected.blockSha256, action: 'remove-managed-block'};
    } else {
      agentsBlockAction = {...agentsBlock, currentBlockSha256: inspected.blockSha256, action: 'collision', reason: 'managed block was modified outside the installer'};
    }
  }
  const collisions = [...actions, agentsBlockAction].filter(item => item.action === 'collision');
  return {
    schemaVersion: 1,
    mode: 'unlink',
    codexHome,
    repository: repositoryInfo.root,
    stateFile: installationStateFile,
    stateFileSha256: sha256File(installationStateFile),
    links: actions,
    agentsBlock: agentsBlockAction,
    collisions,
  };
}

function assertOwnedLinkStillMatches(item) {
  if (entryKind(item.path) !== 'link' || !samePath(resolvedLinkTarget(item.path), item.target)) {
    throw new InstallerError('A recorded link changed after the unlink plan was created; no replacement link was removed', 'OWNERSHIP_CHANGED', {
      id: item.id,
      path: item.path,
      expectedTarget: item.target,
    });
  }
}

function assertUnlinkOwnershipStillMatches(plan, repositoryInfo) {
  if (entryKind(plan.stateFile) !== 'file' || sha256File(plan.stateFile) !== plan.stateFileSha256) {
    throw new InstallerError('The installation state changed after the unlink plan was created', 'OWNERSHIP_CHANGED', {path: plan.stateFile});
  }
  for (const item of plan.links) if (item.action === 'remove-owned-link') assertOwnedLinkStillMatches(item);
  if (plan.agentsBlock.action === 'remove-managed-block') {
    const repositoryBlock = managedAgentsBlock(repositoryInfo);
    if (repositoryBlock.blockSha256 !== plan.agentsBlock.sha256
      || repositoryBlock.sourceSha256 !== plan.agentsBlock.sourceSha256) {
      throw new InstallerError('The trusted repository AGENTS.md source changed after unlink planning', 'OWNERSHIP_CHANGED', {
        path: plan.agentsBlock.source,
      });
    }
    if (entryKind(plan.agentsBlock.path) !== 'file') {
      throw new InstallerError('The managed AGENTS.md changed after the unlink plan was created', 'OWNERSHIP_CHANGED', {
        path: plan.agentsBlock.path,
      });
    }
    const inspected = inspectManagedAgentsBlock(fs.readFileSync(plan.agentsBlock.path, 'utf8'));
    if (inspected.kind !== 'present' || inspected.blockSha256 !== plan.agentsBlock.sha256) {
      throw new InstallerError('The managed AGENTS.md block changed after the unlink plan was created', 'OWNERSHIP_CHANGED', {
        path: plan.agentsBlock.path,
      });
    }
  }
}

function replaceTextFileFromSnapshot(file, current, next) {
  if (entryKind(file) !== 'file' || sha256File(file) !== sha256Text(current)) {
    throw new InstallerError('AGENTS.md changed while its managed block was being removed', 'OWNERSHIP_CHANGED', {path: file});
  }
  const token = `${process.pid}-${Date.now()}`;
  const backup = backupPath(file, token);
  const temporary = `${file}.tmp-${token}`;
  if (next.length > 0) fs.writeFileSync(temporary, next, {flag: 'wx'});
  fs.renameSync(file, backup);
  try {
    if (next.length > 0) fs.renameSync(temporary, file);
    fs.unlinkSync(backup);
  } catch (error) {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    if (entryKind(file) === 'absent' && fs.existsSync(backup)) fs.renameSync(backup, file);
    throw error;
  }
}

function applyUnlink(plan, repositoryInfo) {
  if (plan.collisions.length > 0) throw new InstallerError('Unlink plan contains collisions; no changes were made', 'COLLISIONS', plan.collisions);
  if (process.env.NODE_ENV === 'test' && process.env.POLYLITH_SKILLS_TEST_SWAP_UNLINK_TARGET) {
    const item = plan.links.find(candidate => candidate.action === 'remove-owned-link');
    if (item) {
      removeDirectoryLink(item.path);
      createDirectoryLink(process.env.POLYLITH_SKILLS_TEST_SWAP_UNLINK_TARGET, item.path);
    }
  }
  assertUnlinkOwnershipStillMatches(plan, repositoryInfo);
  for (const item of plan.links) {
    if (item.action !== 'remove-owned-link') continue;
    assertOwnedLinkStillMatches(item);
    removeDirectoryLink(item.path);
  }
  if (plan.agentsBlock.action === 'remove-managed-block') {
    if (entryKind(plan.agentsBlock.path) !== 'file') {
      throw new InstallerError('The managed AGENTS.md changed immediately before block removal', 'OWNERSHIP_CHANGED', {
        path: plan.agentsBlock.path,
      });
    }
    const current = fs.readFileSync(plan.agentsBlock.path, 'utf8');
    const inspected = inspectManagedAgentsBlock(current);
    if (inspected.kind !== 'present' || inspected.blockSha256 !== plan.agentsBlock.sha256) {
      throw new InstallerError('The managed AGENTS.md block changed immediately before removal', 'OWNERSHIP_CHANGED', {
        path: plan.agentsBlock.path,
      });
    }
    replaceTextFileFromSnapshot(plan.agentsBlock.path, current, removeManagedAgentsBlock(current, inspected));
  }
  if (entryKind(plan.stateFile) !== 'file' || sha256File(plan.stateFile) !== plan.stateFileSha256) {
    throw new InstallerError('The installation state changed immediately before removal', 'OWNERSHIP_CHANGED', {path: plan.stateFile});
  }
  fs.unlinkSync(plan.stateFile);
}

function installerFingerprint(repositoryInfo) {
  const files = [
    SCRIPT_PATH,
    path.join(repositoryInfo.root, 'scripts', 'installer-platform.mjs'),
    path.join(repositoryInfo.root, '.agents', 'skills', 'install-polylith-skills', 'SKILL.md'),
  ];
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(path.relative(repositoryInfo.root, file));
    hash.update('\0');
    hash.update(fs.readFileSync(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function updateCheckout(repositoryInfo) {
  gitIdentity(repositoryInfo.root, repositoryInfo.manifest, {requireClean: true});
  const before = installerFingerprint(repositoryInfo);
  run('git', ['pull', '--ff-only', 'origin', repositoryInfo.manifest.repository.defaultBranch], repositoryInfo.root);
  const after = installerFingerprint(repositoryInfo);
  if (before !== after) throw new InstallerError('The installer changed during update; rerun the updated repository-local skill', 'INSTALLER_UPDATED');
}

function output(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function addPlanDigest(plan) {
  const digestInput = {...plan, apply: false};
  delete digestInput.planDigest;
  return {...plan, planDigest: crypto.createHash('sha256').update(JSON.stringify(digestInput)).digest('hex')};
}

function requireExpectedPlan(options, plan) {
  if (!options.apply) return;
  if (options.expectPlan !== plan.planDigest) {
    throw new InstallerError('The apply plan differs from the disclosed dry run; inspect the new plan before retrying', 'PLAN_CHANGED', {
      expected: options.expectPlan,
      actual: plan.planDigest,
    });
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repositoryInfo = validateRepository(options.repository || DEFAULT_REPOSITORY);
  const codexHome = codexHomePath(options.codexHome);
  const stateFile = statePath(codexHome, repositoryInfo);
  const requiresState = ['repair', 'unlink', 'update', 'relocate'].includes(options.mode);
  let state = readState(stateFile, requiresState);
  if (state) {
    const allowCatalogChange = ['repair', 'update'].includes(options.mode);
    validateStateInventory(state, codexHome, repositoryInfo, {
      exact: !allowCatalogChange,
      relocating: options.mode === 'relocate',
    });
  }
  if (options.mode === 'status') {
    gitIdentity(repositoryInfo.root, repositoryInfo.manifest);
    const report = statusReport(options, repositoryInfo, state);
    output(report);
    process.exitCode = report.healthy ? 0 : 2;
    return;
  }
  if (options.mode === 'unlink') {
    const plan = addPlanDigest(unlinkPlan(codexHome, repositoryInfo, state));
    output(plan);
    requireExpectedPlan(options, plan);
    if (options.apply) applyUnlink(plan, repositoryInfo);
    else if (plan.collisions.length > 0) process.exitCode = 2;
    return;
  }
  if (options.mode === 'update') {
    if (!samePath(state.repositoryRoot, repositoryInfo.root)) throw new InstallerError('Run relocate from the new checkout before update', 'RELOCATION_REQUIRED');
    if (options.apply) {
      updateCheckout(repositoryInfo);
      Object.assign(repositoryInfo, validateRepository(repositoryInfo.root));
      state = readState(stateFile, true);
      validateStateInventory(state, codexHome, repositoryInfo, {exact: false});
    } else {
      gitIdentity(repositoryInfo.root, repositoryInfo.manifest, {requireClean: true});
    }
  } else {
    gitIdentity(repositoryInfo.root, repositoryInfo.manifest);
  }
  if (options.mode === 'install' && state) throw new InstallerError('Already installed; use status, repair, update, relocate, or unlink', 'ALREADY_INSTALLED');
  if (options.mode === 'relocate' && samePath(state.repositoryRoot, repositoryInfo.root)) throw new InstallerError('Installation already records this repository path', 'NOT_RELOCATED');
  const plan = addPlanDigest(buildPlan(options, repositoryInfo, state));
  output(plan);
  requireExpectedPlan(options, plan);
  if (options.apply) {
    applyPlan(plan, repositoryInfo);
    const report = statusReport(options, repositoryInfo, readState(stateFile, true));
    if (!report.healthy) throw new InstallerError('Post-install verification failed', 'VERIFY_FAILED', report);
    output({result: 'applied', status: report});
  } else if (plan.collisions.length > 0) {
    process.exitCode = 2;
  }
}

try {
  main();
} catch (error) {
  const normalized = error instanceof InstallerError ? error : new InstallerError(error.message, 'UNEXPECTED');
  process.stderr.write(`${JSON.stringify({error: normalized.code, message: normalized.message, details: normalized.details}, null, 2)}\n`);
  process.exitCode = 1;
}
