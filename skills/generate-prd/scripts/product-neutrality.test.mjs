import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.dirname(scriptsDirectory);
const pilotName = new RegExp(['ale', 'xa'].join(''), 'iu');
const pilotPath = new RegExp(`c:[\\\\/]dev[\\\\/]${['ale', 'xa'].join('')}`, 'iu');
const pilotTopic = new RegExp(`agents[\\\\/]topics[\\\\/]${['ale', 'xa'].join('')}`, 'iu');
const pilotAssumptions = [
  /webcodecs/iu,
  /\belectron\b/iu,
  /timeline-surface/iu,
  /time-ruler/iu,
  /time-tick/iu,
  /track-header/iu,
  /range-selection/iu,
  /outside-selection-mask/iu,
  /playhead-(?:head|line)/iu,
  /sampled-frame/iu,
  /source-bound-marker/iu,
  /drop-indicator/iu,
  /\bframe-accurate\b/iu,
  /\bframe thumbnails\b/iu,
  /\bmedia-edit(?:ing|or)\b/iu,
  /\btimeline\b/iu,
  /\bvideo-(?:player|editor|timeline)\b/iu,
  /\bsaved-clip\b/iu,
  /clip-(?:editor|timeline)|choose-clip/iu,
];
const checkedExtensions = new Set(['.json', '.md', '.mjs', '.toml', '.yaml', '.yml']);

function filesBelow(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...filesBelow(candidate));
    } else if (checkedExtensions.has(path.extname(entry.name))) {
      files.push(candidate);
    }
  }
  return files;
}

test('keeps generate-prd contracts, implementation, and guidance product-neutral', () => {
  const ownPath = path.resolve(fileURLToPath(import.meta.url));
  for (const file of filesBelow(skillRoot)) {
    if (path.resolve(file) === ownPath) {
      continue;
    }
    const source = fs.readFileSync(file, 'utf8');
    assert.equal(pilotName.test(source), false, `${file} contains the pilot product name`);
    assert.equal(pilotPath.test(source), false, `${file} contains the pilot repository path`);
    assert.equal(pilotTopic.test(source), false, `${file} contains the pilot topic path`);
    for (const pattern of pilotAssumptions) {
      assert.equal(pattern.test(source), false, `${file} contains a pilot-product assumption (${pattern})`);
    }
  }
});
