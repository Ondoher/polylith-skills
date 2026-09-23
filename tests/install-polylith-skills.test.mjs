import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {installerPlatform} from '../scripts/installer-platform.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installer = path.join(root, 'scripts', 'install-polylith-skills.mjs');
const currentPlatform = installerPlatform();
const MANAGED_BEGIN = '<!-- BEGIN POLYLITH SKILLS MANAGED BLOCK -->';
const MANAGED_END = '<!-- END POLYLITH SKILLS MANAGED BLOCK -->';
const MANAGED_INSTRUCTIONS = '# Global fixture instructions\n';
const PERSONAL_INSTRUCTIONS = '# Personal instructions\n\nKeep this line.\n';

function sha256Text(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {cwd, encoding: 'utf8', windowsHide: true});
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
  return result;
}

function invokeWithEnvironment(repository, codexHome, environment, ...args) {
  return spawnSync(process.execPath, [installer, ...args, '--repository', repository, '--codex-home', codexHome], {
    cwd: repository,
    encoding: 'utf8',
    windowsHide: true,
    env: {...process.env, ...environment},
  });
}

function invoke(repository, codexHome, ...args) {
  if (args.includes('--apply') && !args.includes('--expect-plan')) {
    const dryArgs = args.filter(argument => argument !== '--apply');
    const dryRun = invokeWithEnvironment(repository, codexHome, {}, ...dryArgs);
    if (!dryRun.stdout.trim()) return dryRun;
    const plan = JSON.parse(dryRun.stdout);
    return invokeWithEnvironment(repository, codexHome, {}, ...args, '--expect-plan', plan.planDigest);
  }
  return invokeWithEnvironment(repository, codexHome, {}, ...args);
}

function invokeAppliedWithEnvironment(repository, codexHome, environment, ...args) {
  const dryRun = invokeWithEnvironment(repository, codexHome, environment, ...args);
  const plan = JSON.parse(dryRun.stdout);
  return invokeWithEnvironment(repository, codexHome, environment, ...args, '--apply', '--expect-plan', plan.planDigest);
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, content);
}

function removeLink(link) {
  try {
    fs.unlinkSync(link);
  } catch (error) {
    if (currentPlatform.directoryLinkRemovalFallback !== 'rmdir') throw error;
    fs.rmdirSync(link);
  }
}

function directoryLink(target, destination) {
  fs.symlinkSync(target, destination, currentPlatform.directoryLinkType);
}

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'polylith-skills-installer-'));
  const repository = path.join(directory, 'repository');
  const codexHome = path.join(directory, 'codex-home');
  fs.mkdirSync(repository, {recursive: true});
  const manifest = {
    schemaVersion: 1,
    repository: {id: 'fixture-skills', canonicalRemote: 'https://example.invalid/polylith-skills.git', defaultBranch: 'main'},
    catalog: {skills: ['alpha'], retiredSkills: [], agents: ['alpha.toml'], requiredDocumentation: ['standards'], requiredPlanning: ['roles']},
    install: {
      skillsDirectory: 'skills',
      agentsDirectory: 'agents',
      documentationDirectory: 'documentation',
      codexAgentsFile: 'codex-home/AGENTS.md',
      stateFile: '.polylith-skills-installation.json',
    },
  };
  write(path.join(repository, 'governance.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  write(path.join(repository, 'skills', 'alpha', 'SKILL.md'), '---\nname: alpha\ndescription: Fixture.\n---\n');
  write(path.join(repository, 'skills', 'alpha', 'asset.txt'), 'asset\n');
  write(path.join(repository, 'agents', 'alpha.toml'), 'name = "alpha"\n');
  write(path.join(repository, 'documentation', 'standards', 'alpha.md'), '# Alpha\n');
  write(path.join(repository, 'planning', 'roles', 'README.md'), '# Roles\n');
  write(path.join(repository, 'codex-home', 'AGENTS.md'), MANAGED_INSTRUCTIONS);
  run('git', ['init'], repository);
  run('git', ['symbolic-ref', 'HEAD', 'refs/heads/main'], repository);
  run('git', ['remote', 'add', 'origin', manifest.repository.canonicalRemote], repository);

  write(path.join(codexHome, 'skills', 'alpha', 'SKILL.md'), '---\nname: alpha\ndescription: Fixture.\n---\n');
  write(path.join(codexHome, 'skills', 'alpha', 'asset.txt'), 'asset\n');
  write(path.join(codexHome, 'skills', 'personal', 'SKILL.md'), 'personal\n');
  write(path.join(codexHome, 'agents', 'alpha.toml'), 'name = "alpha"\n');
  write(path.join(codexHome, 'documentation', 'standards', 'alpha.md'), '# Alpha\n');
  write(path.join(codexHome, 'AGENTS.md'), PERSONAL_INSTRUCTIONS);
  return {directory, repository, codexHome};
}

test('installation rejects a checkout missing a required planning contract directory', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    fs.renameSync(path.join(repository, 'planning', 'roles'), path.join(repository, 'planning', 'unavailable'));
    const result = invoke(repository, codexHome, 'install', '--migrate-identical');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Required planning directory is missing: roles/);
    assert.equal(fs.existsSync(path.join(codexHome, '.polylith-skills-installation.json')), false);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('migrates identical copies to live links and preserves unrelated skills', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    const dryRun = invoke(repository, codexHome, 'install', '--migrate-identical');
    assert.equal(dryRun.status, 0, dryRun.stderr);
    const plan = JSON.parse(dryRun.stdout);
    assert.equal(plan.collisions.length, 0);
    assert.match(plan.planDigest, /^[a-f0-9]{64}$/u);
    assert.ok(plan.links.every(item => item.action === 'migrate-identical-directory'));
    assert.equal(plan.agentsBlock.action, 'insert-managed-block');

    const install = invoke(repository, codexHome, 'install', '--migrate-identical', '--apply');
    assert.equal(install.status, 0, install.stderr);
    assert.equal(fs.lstatSync(path.join(codexHome, 'skills', 'alpha')).isSymbolicLink(), true);
    assert.equal(fs.lstatSync(path.join(codexHome, 'agents')).isSymbolicLink(), true);
    assert.equal(fs.lstatSync(path.join(codexHome, 'documentation')).isSymbolicLink(), true);
    const installedRoot = path.dirname(fs.realpathSync(path.join(codexHome, 'documentation')));
    assert.equal(fs.readFileSync(path.join(installedRoot, 'planning', 'roles', 'README.md'), 'utf8'), '# Roles\n');
    assert.equal(fs.readFileSync(path.join(codexHome, 'skills', 'personal', 'SKILL.md'), 'utf8'), 'personal\n');
    assert.equal(fs.existsSync(path.join(codexHome, '.polylith-skills-installation.json')), true);
    const installedAgents = fs.readFileSync(path.join(codexHome, 'AGENTS.md'), 'utf8');
    assert.ok(installedAgents.includes(PERSONAL_INSTRUCTIONS.trim()));
    assert.ok(installedAgents.includes(MANAGED_BEGIN));
    assert.ok(installedAgents.includes(MANAGED_INSTRUCTIONS.trim()));
    assert.ok(installedAgents.includes(MANAGED_END));
    const state = JSON.parse(fs.readFileSync(path.join(codexHome, '.polylith-skills-installation.json'), 'utf8'));
    assert.equal(state.schemaVersion, 2);
    assert.ok(state.links.every(item => item.linkType === currentPlatform.recordedLinkType));
    assert.deepEqual(
      {beginMarker: state.agentsBlock.beginMarker, endMarker: state.agentsBlock.endMarker},
      {beginMarker: MANAGED_BEGIN, endMarker: MANAGED_END},
    );
    assert.match(state.agentsBlock.sha256, /^[a-f0-9]{64}$/u);
    assert.match(state.agentsBlock.sourceSha256, /^[a-f0-9]{64}$/u);

    const status = invoke(repository, codexHome, 'status');
    assert.equal(status.status, 0, status.stderr);
    assert.equal(JSON.parse(status.stdout).healthy, true);

    const unlinkDryRun = invoke(repository, codexHome, 'unlink');
    assert.equal(unlinkDryRun.status, 0, unlinkDryRun.stderr);
    const unlinkPlan = JSON.parse(unlinkDryRun.stdout);
    assert.match(unlinkPlan.planDigest, /^[a-f0-9]{64}$/u);
    const unlink = invokeWithEnvironment(
      repository,
      codexHome,
      {},
      'unlink',
      '--apply',
      '--expect-plan',
      unlinkPlan.planDigest,
    );
    assert.equal(unlink.status, 0, unlink.stderr);
    assert.equal(fs.existsSync(path.join(codexHome, 'skills', 'alpha')), false);
    assert.equal(fs.existsSync(path.join(codexHome, 'agents')), false);
    assert.equal(fs.existsSync(path.join(codexHome, 'documentation')), false);
    assert.equal(fs.existsSync(path.join(repository, 'skills', 'alpha', 'SKILL.md')), true);
    assert.equal(fs.existsSync(path.join(codexHome, 'skills', 'personal', 'SKILL.md')), true);
    assert.equal(fs.readFileSync(path.join(codexHome, 'AGENTS.md'), 'utf8'), PERSONAL_INSTRUCTIONS);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('requires the digest from a dry run before applying a mutation', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    const result = invokeWithEnvironment(repository, codexHome, {}, 'install', '--migrate-identical', '--apply');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /EXPECTED_PLAN_REQUIRED/u);
    assert.equal(fs.existsSync(path.join(codexHome, '.polylith-skills-installation.json')), false);
    assert.equal(fs.lstatSync(path.join(codexHome, 'skills', 'alpha')).isSymbolicLink(), false);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('refuses to apply when filesystem changes alter the disclosed plan', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    const dryRun = invoke(repository, codexHome, 'install', '--migrate-identical');
    assert.equal(dryRun.status, 0, dryRun.stderr);
    const disclosed = JSON.parse(dryRun.stdout);
    fs.writeFileSync(path.join(codexHome, 'skills', 'alpha', 'asset.txt'), 'changed after review\n');

    const result = invokeWithEnvironment(
      repository,
      codexHome,
      {},
      'install',
      '--migrate-identical',
      '--apply',
      '--expect-plan',
      disclosed.planDigest,
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /PLAN_CHANGED/u);
    const current = JSON.parse(result.stdout);
    assert.notEqual(current.planDigest, disclosed.planDigest);
    assert.equal(current.collisions.length, 1);
    assert.equal(fs.readFileSync(path.join(codexHome, 'skills', 'alpha', 'asset.txt'), 'utf8'), 'changed after review\n');
    assert.equal(fs.existsSync(path.join(codexHome, '.polylith-skills-installation.json')), false);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('retains a replacement link introduced after unlink planning', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    assert.equal(invoke(repository, codexHome, 'install', '--migrate-identical', '--apply').status, 0);
    const dryRun = invoke(repository, codexHome, 'unlink');
    assert.equal(dryRun.status, 0, dryRun.stderr);
    const plan = JSON.parse(dryRun.stdout);
    const unrelatedTarget = path.join(directory, 'unrelated-target');
    fs.mkdirSync(unrelatedTarget);

    const result = invokeWithEnvironment(
      repository,
      codexHome,
      {NODE_ENV: 'test', POLYLITH_SKILLS_TEST_SWAP_UNLINK_TARGET: unrelatedTarget},
      'unlink',
      '--apply',
      '--expect-plan',
      plan.planDigest,
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /OWNERSHIP_CHANGED/u);
    const alpha = path.join(codexHome, 'skills', 'alpha');
    assert.equal(fs.lstatSync(alpha).isSymbolicLink(), true);
    assert.equal(path.resolve(fs.realpathSync(alpha)), path.resolve(unrelatedTarget));
    assert.equal(fs.lstatSync(path.join(codexHome, 'agents')).isSymbolicLink(), true);
    assert.equal(fs.existsSync(path.join(codexHome, '.polylith-skills-installation.json')), true);
    assert.equal(fs.existsSync(unrelatedTarget), true);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('refuses a differing global skill without changing it', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    const globalSkill = path.join(codexHome, 'skills', 'alpha', 'asset.txt');
    fs.writeFileSync(globalSkill, 'different\n');
    const install = invoke(repository, codexHome, 'install', '--migrate-identical', '--apply');
    assert.equal(install.status, 1);
    assert.match(install.stderr, /COLLISIONS/u);
    assert.equal(fs.lstatSync(path.join(codexHome, 'skills', 'alpha')).isDirectory(), true);
    assert.equal(fs.lstatSync(path.join(codexHome, 'skills', 'alpha')).isSymbolicLink(), false);
    assert.equal(fs.readFileSync(globalSkill, 'utf8'), 'different\n');
    assert.equal(fs.existsSync(path.join(codexHome, '.polylith-skills-installation.json')), false);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('preserves Codex AGENTS additions made after installation when unlinking', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    assert.equal(invoke(repository, codexHome, 'install', '--migrate-identical', '--apply').status, 0);
    const dryRun = invoke(repository, codexHome, 'unlink');
    assert.equal(dryRun.status, 0, dryRun.stderr);
    const plan = JSON.parse(dryRun.stdout);
    assert.equal(plan.agentsBlock.action, 'remove-managed-block');
    fs.appendFileSync(path.join(codexHome, 'AGENTS.md'), '\n# Added after unlink planning\nKeep this too.\n');

    const unlink = invokeWithEnvironment(
      repository,
      codexHome,
      {},
      'unlink',
      '--apply',
      '--expect-plan',
      plan.planDigest,
    );
    assert.equal(unlink.status, 0, unlink.stderr);
    const remaining = fs.readFileSync(path.join(codexHome, 'AGENTS.md'), 'utf8');
    assert.ok(remaining.includes(PERSONAL_INSTRUCTIONS.trim()));
    assert.ok(remaining.includes('# Added after unlink planning\nKeep this too.'));
    assert.ok(!remaining.includes(MANAGED_BEGIN));
    assert.ok(!remaining.includes(MANAGED_INSTRUCTIONS.trim()));
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('retains later instructions when the installer originally created AGENTS.md', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    const agentsPath = path.join(codexHome, 'AGENTS.md');
    fs.unlinkSync(agentsPath);
    assert.equal(invoke(repository, codexHome, 'install', '--migrate-identical', '--apply').status, 0);
    fs.appendFileSync(agentsPath, '# Added after installation\nKeep this file.\n');

    const unlink = invoke(repository, codexHome, 'unlink', '--apply');
    assert.equal(unlink.status, 0, unlink.stderr);
    assert.equal(fs.readFileSync(agentsPath, 'utf8'), '# Added after installation\nKeep this file.\n');
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('updates only the managed Codex AGENTS block when its source changes', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    assert.equal(invoke(repository, codexHome, 'install', '--migrate-identical', '--apply').status, 0);
    fs.appendFileSync(path.join(codexHome, 'AGENTS.md'), '\n# Local footer\n');
    write(path.join(repository, 'codex-home', 'AGENTS.md'), '# Revised governed instructions\n');

    const dryRun = invoke(repository, codexHome, 'repair');
    assert.equal(dryRun.status, 0, dryRun.stderr);
    assert.equal(JSON.parse(dryRun.stdout).agentsBlock.action, 'update-managed-block');
    const repair = invoke(repository, codexHome, 'repair', '--apply');
    assert.equal(repair.status, 0, repair.stderr);

    const revised = fs.readFileSync(path.join(codexHome, 'AGENTS.md'), 'utf8');
    assert.ok(revised.includes(PERSONAL_INSTRUCTIONS.trim()));
    assert.ok(revised.includes('# Local footer'));
    assert.ok(revised.includes('# Revised governed instructions'));
    assert.ok(!revised.includes(MANAGED_INSTRUCTIONS.trim()));
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('refuses to update or unlink a modified managed Codex AGENTS block', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    assert.equal(invoke(repository, codexHome, 'install', '--migrate-identical', '--apply').status, 0);
    const agentsPath = path.join(codexHome, 'AGENTS.md');
    const tampered = fs.readFileSync(agentsPath, 'utf8').replace(MANAGED_INSTRUCTIONS.trim(), '# Locally changed governed instructions');
    fs.writeFileSync(agentsPath, tampered);
    write(path.join(repository, 'codex-home', 'AGENTS.md'), '# Revised governed instructions\n');

    const repair = invoke(repository, codexHome, 'repair');
    assert.equal(repair.status, 2, repair.stderr);
    assert.equal(JSON.parse(repair.stdout).agentsBlock.action, 'collision');
    const unlink = invoke(repository, codexHome, 'unlink');
    assert.equal(unlink.status, 2, unlink.stderr);
    assert.equal(JSON.parse(unlink.stdout).agentsBlock.action, 'collision');
    assert.equal(fs.readFileSync(agentsPath, 'utf8'), tampered);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('does not let forged state claim an unrelated marked AGENTS block', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    assert.equal(invoke(repository, codexHome, 'install', '--migrate-identical', '--apply').status, 0);
    const agentsPath = path.join(codexHome, 'AGENTS.md');
    const unrelatedBlock = `${MANAGED_BEGIN}\n# Unrelated marked instructions\n${MANAGED_END}`;
    const forgedContent = fs.readFileSync(agentsPath, 'utf8').replace(
      `${MANAGED_BEGIN}\n${MANAGED_INSTRUCTIONS.trim()}\n${MANAGED_END}`,
      unrelatedBlock,
    );
    fs.writeFileSync(agentsPath, forgedContent);
    const statePath = path.join(codexHome, '.polylith-skills-installation.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    state.agentsBlock.sha256 = sha256Text(unrelatedBlock);
    state.agentsBlock.sourceSha256 = sha256Text('# Unrelated marked instructions\n');
    fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);

    const unlink = invoke(repository, codexHome, 'unlink');
    assert.equal(unlink.status, 2, unlink.stderr);
    assert.equal(JSON.parse(unlink.stdout).agentsBlock.action, 'collision');
    assert.equal(fs.readFileSync(agentsPath, 'utf8'), forgedContent);
    assert.equal(fs.existsSync(statePath), true);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('treats duplicate managed-block markers as a collision', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    assert.equal(invoke(repository, codexHome, 'install', '--migrate-identical', '--apply').status, 0);
    const agentsPath = path.join(codexHome, 'AGENTS.md');
    fs.appendFileSync(agentsPath, `\n${MANAGED_BEGIN}\n# Duplicate\n${MANAGED_END}\n`);

    const repair = invoke(repository, codexHome, 'repair');
    assert.equal(repair.status, 2, repair.stderr);
    assert.equal(JSON.parse(repair.stdout).agentsBlock.action, 'collision');
    const unlink = invoke(repository, codexHome, 'unlink');
    assert.equal(unlink.status, 2, unlink.stderr);
    assert.equal(JSON.parse(unlink.stdout).agentsBlock.action, 'collision');
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('rejects tampered state before unlinking an unrelated directory link', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    const install = invoke(repository, codexHome, 'install', '--migrate-identical', '--apply');
    assert.equal(install.status, 0, install.stderr);
    const unrelatedTarget = path.join(directory, 'unrelated-target');
    fs.mkdirSync(unrelatedTarget);
    const personal = path.join(codexHome, 'skills', 'personal');
    fs.rmSync(personal, {recursive: true, force: true});
    directoryLink(unrelatedTarget, personal);
    const statePath = path.join(codexHome, '.polylith-skills-installation.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    state.catalogSkills.push('personal');
    state.links.push({id: 'skill:personal', kind: 'skill', path: personal, target: unrelatedTarget, linkType: currentPlatform.recordedLinkType});
    fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);

    const unlink = invoke(repository, codexHome, 'unlink', '--apply');
    assert.equal(unlink.status, 1);
    assert.match(unlink.stderr, /INVALID_STATE/u);
    assert.equal(fs.lstatSync(personal).isSymbolicLink(), true);
    assert.equal(fs.existsSync(unrelatedTarget), true);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('repair cannot prune a tampered state entry without repository retirement authority', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    assert.equal(invoke(repository, codexHome, 'install', '--migrate-identical', '--apply').status, 0);
    const unrelatedTarget = path.join(repository, 'skills', 'personal');
    write(path.join(unrelatedTarget, 'SKILL.md'), 'personal\n');
    const personal = path.join(codexHome, 'skills', 'personal');
    fs.rmSync(personal, {recursive: true, force: true});
    directoryLink(unrelatedTarget, personal);
    const statePath = path.join(codexHome, '.polylith-skills-installation.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    state.catalogSkills.push('personal');
    state.links.push({id: 'skill:personal', kind: 'skill', path: personal, target: unrelatedTarget, linkType: currentPlatform.recordedLinkType});
    fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);

    const repair = invoke(repository, codexHome, 'repair', '--apply');
    assert.equal(repair.status, 1);
    assert.match(repair.stderr, /COLLISIONS/u);
    assert.equal(fs.lstatSync(personal).isSymbolicLink(), true);
    assert.equal(fs.existsSync(unrelatedTarget), true);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('rejects a managed destination whose parent resolves outside Codex home', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    const escapedSkills = path.join(directory, 'escaped-skills');
    fs.renameSync(path.join(codexHome, 'skills'), escapedSkills);
    directoryLink(escapedSkills, path.join(codexHome, 'skills'));
    const plan = invoke(repository, codexHome, 'install', '--migrate-identical');
    assert.equal(plan.status, 1);
    assert.match(plan.stderr, /PATH_ESCAPE/u);
    assert.equal(fs.readFileSync(path.join(escapedSkills, 'alpha', 'asset.txt'), 'utf8'), 'asset\n');
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('repair recreates a missing owned directory link', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    assert.equal(invoke(repository, codexHome, 'install', '--migrate-identical', '--apply').status, 0);
    const alpha = path.join(codexHome, 'skills', 'alpha');
    removeLink(alpha);
    const repair = invoke(repository, codexHome, 'repair', '--apply');
    assert.equal(repair.status, 0, repair.stderr);
    assert.equal(fs.lstatSync(alpha).isSymbolicLink(), true);
    assert.equal(JSON.parse(invoke(repository, codexHome, 'status').stdout).healthy, true);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('repair removes a cataloged link that was deliberately removed from the manifest', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    const manifestPath = path.join(repository, 'governance.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.catalog.skills.push('beta');
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    write(path.join(repository, 'skills', 'beta', 'SKILL.md'), '---\nname: beta\ndescription: Fixture.\n---\n');
    write(path.join(codexHome, 'skills', 'beta', 'SKILL.md'), '---\nname: beta\ndescription: Fixture.\n---\n');
    assert.equal(invoke(repository, codexHome, 'install', '--migrate-identical', '--apply').status, 0);
    assert.equal(fs.lstatSync(path.join(codexHome, 'skills', 'beta')).isSymbolicLink(), true);

    manifest.catalog.skills = ['alpha'];
    manifest.catalog.retiredSkills = ['beta'];
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    fs.rmSync(path.join(repository, 'skills', 'beta'), {recursive: true, force: true});
    const repair = invoke(repository, codexHome, 'repair', '--apply');
    assert.equal(repair.status, 0, repair.stderr);
    assert.equal(fs.existsSync(path.join(codexHome, 'skills', 'beta')), false);
    assert.equal(JSON.parse(invoke(repository, codexHome, 'status').stdout).healthy, true);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('restores migrated directories when a later link operation fails', () => {
  const {directory, repository, codexHome} = fixture();
  try {
    const install = invokeAppliedWithEnvironment(
      repository,
      codexHome,
      {NODE_ENV: 'test', POLYLITH_SKILLS_TEST_FAIL_AFTER_LINKS: '1'},
      'install',
      '--migrate-identical',
    );
    assert.equal(install.status, 1);
    assert.match(install.stderr, /TEST_INJECTED_FAILURE/u);
    const alpha = path.join(codexHome, 'skills', 'alpha');
    assert.equal(fs.lstatSync(alpha).isDirectory(), true);
    assert.equal(fs.lstatSync(alpha).isSymbolicLink(), false);
    assert.equal(fs.readFileSync(path.join(alpha, 'asset.txt'), 'utf8'), 'asset\n');
    assert.equal(fs.lstatSync(path.join(codexHome, 'agents')).isSymbolicLink(), false);
    assert.equal(fs.lstatSync(path.join(codexHome, 'documentation')).isSymbolicLink(), false);
    assert.equal(fs.existsSync(path.join(codexHome, '.polylith-skills-installation.json')), false);
    const backupNames = fs.readdirSync(path.join(codexHome, 'skills')).filter(name => name.includes('.polylith-skills-backup-'));
    assert.deepEqual(backupNames, []);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});
