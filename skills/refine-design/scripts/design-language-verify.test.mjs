import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {applyProposal} from './design-language.mjs';
import {verifyDesignLanguage} from './design-language-verify.mjs';

const proposal = () => JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json', import.meta.url), 'utf8'));
const folder = () => fs.mkdtempSync(path.join(os.tmpdir(), 'design-language-verify-test-'));

test('verifies a full catalog through an isolated stable rerender', t => {
  const base = folder();
  t.after(() => fs.rmSync(base, {recursive: true, force: true}));
  applyProposal(base, proposal(), {reviewLayout: 'pages'});
  const report = verifyDesignLanguage(base);
  assert.equal(report.schemaVersion, '0.14');
  assert.equal(report.revision, 1);
  assert.equal(report.idempotent, true);
  assert.equal(report.markdownLinks, 'resolved');
  assert.ok(report.svgCount > 0);
  assert.ok(report.visualInspectionTargets.some(file => file.endsWith('icons.svg')));
  assert.ok(!report.visualInspectionTargets.some(file => file.includes('placeholder-')));
  assert.ok(!fs.readdirSync(path.join(base, 'design-language', 'specimens')).some(file => file.startsWith('placeholder-')));
});

test('reports broken owner-authored links without changing the design', t => {
  const base = folder();
  t.after(() => fs.rmSync(base, {recursive: true, force: true}));
  applyProposal(base, proposal(), {reviewLayout: 'pages'});
  const file = path.join(base, 'decisions.md');
  const before = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, '[Missing](./does-not-exist.md)\n\n' + before);
  assert.throws(() => verifyDesignLanguage(base), /Broken local Markdown links/);
  assert.equal(fs.readFileSync(file, 'utf8'), '[Missing](./does-not-exist.md)\n\n' + before);
});
