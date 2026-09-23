import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.dirname(scriptsDirectory);
const forbiddenName = new RegExp(['ale', 'xa'].join(''), 'i');
const forbiddenPath = new RegExp(`c:[\\\\/]dev[\\\\/]${['ale', 'xa'].join('')}`, 'i');
const forbiddenTopic = new RegExp(`agents[\\\\/]topics[\\\\/]${['ale', 'xa'].join('')}`, 'i');
const forbiddenPilotAssumptions = [
  /webcodecs/i,
  /\belectron\b/i,
  /timeline-surface/i,
  /time-ruler/i,
  /time-tick/i,
  /track-header/i,
  /range-selection/i,
  /outside-selection-mask/i,
  /playhead-(?:head|line)/i,
  /sampled-frame/i,
  /source-bound-marker/i,
  /drop-indicator/i,
  /\bframe-accurate\b/i,
  /\bframe thumbnails\b/i,
  /\bmedia-edit(?:ing|or)\b/i,
  /\btimeline\b/i,
  /\bvideo-(?:player|editor|timeline)\b/i,
  /\bsaved-clip\b/i,
  /clip-(?:editor|timeline)|choose-clip/i,
];
const checkedExtensions = new Set(['.md', '.json', '.mjs', '.toml', '.yaml', '.yml']);

function filesBelow(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...filesBelow(candidate));
    else if (checkedExtensions.has(path.extname(entry.name))) files.push(candidate);
  }
  return files;
}

function resolveCodexRoot() {
  const candidates = [
    path.resolve(skillRoot, '..', '..'),
    process.env.CODEX_HOME ? path.resolve(process.env.CODEX_HOME) : null,
    path.join(os.homedir(), '.codex'),
  ].filter(Boolean);
  for (const candidate of [...new Set(candidates)]) {
    if (fs.existsSync(path.join(candidate, 'agents')) && fs.existsSync(path.join(candidate, 'documentation'))) return candidate;
  }
  throw new Error(`Product-neutrality test could not locate a Codex root with agents/ and documentation/; checked: ${candidates.join(', ')}`);
}

function assertNeutral(file) {
  const source = fs.readFileSync(file, 'utf8');
  assert.equal(forbiddenName.test(source), false, `${file} contains the pilot product name`);
  assert.equal(forbiddenPath.test(source), false, `${file} contains the pilot repository path`);
  assert.equal(forbiddenTopic.test(source), false, `${file} contains the pilot topic path`);
}

function assertNoPilotAssumptions(file) {
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of forbiddenPilotAssumptions) {
    assert.equal(pattern.test(source), false, `${file} contains a pilot-product assumption (${pattern})`);
  }
}

function isNeutralityTest(file) {
  return path.basename(file) === 'product-neutrality.test.mjs';
}

test('keeps the reusable skill and installed agent contracts product-neutral', () => {
  for (const file of filesBelow(skillRoot)) {
    if (path.resolve(file) !== path.resolve(fileURLToPath(import.meta.url))) {
      assertNeutral(file);
      assertNoPilotAssumptions(file);
    }
  }

  const siblingGenerator = path.join(path.dirname(skillRoot), 'generate-prd');
  if (fs.existsSync(siblingGenerator)) {
    for (const file of filesBelow(siblingGenerator)) {
      assertNeutral(file);
      if (!isNeutralityTest(file)) assertNoPilotAssumptions(file);
    }
  }

  const codexRoot = resolveCodexRoot();
  const agentsDirectory = path.join(codexRoot, 'agents');
  for (const file of fs.readdirSync(agentsDirectory).filter(name => name.endsWith('.toml'))) {
    assertNeutral(path.join(agentsDirectory, file));
  }
  for (const name of ['ux-planner.toml', 'ux-reviewer.toml', 'ui-designer.toml']) {
    assertNoPilotAssumptions(path.join(agentsDirectory, name));
  }

  const governanceRoot = path.dirname(fs.realpathSync(path.join(codexRoot, 'documentation')));
  const guidanceRoot = path.join(governanceRoot, 'planning', 'implementation-agents');
  for (const name of [
    'research-guidance.md',
    'coding-guidance.md',
    'model-agent.md',
    'controller-agent.md',
    'polylith-architect.md',
    'system-architect.md',
    'system-architecture-guidance.md',
    'system-architecture-research.md',
    'ui-designer.md',
    'ui-designer-evaluation.md',
    'ui-guidance.md',
    'ui-pipeline-format.md',
    'ui-research.md',
    'ux-planner.md',
    'ux-planner-evaluation.md',
    'ux-guidance.md',
    'ux-reviewer.md',
    'ux-reviewer-evaluation.md',
    'ux-reviewer-review.md',
    'view-agent.md',
  ]) {
    const file = path.join(guidanceRoot, name);
    assertNeutral(file);
    assertNoPilotAssumptions(file);
  }
});
