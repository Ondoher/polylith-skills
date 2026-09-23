import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {createUxReviewSubject, UX_REVIEW_CRITERIA, validateUxReview} from './ux-review.mjs';
import {compareInteractionArchitectures} from './refinement-impact.mjs';
import {validateUxSpec} from './ux-design.mjs';
import {createUxReviewerEvaluationFixtures} from './ux-review-evaluation-fixture.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';

test('sanitized saved reviews validate against their exact fixtures and reject changed inputs', () => {
  const sourceRoot = fileURLToPath(new URL('../references/fixtures/ux-regression/', import.meta.url));
  const productDescriptionPath = path.join(sourceRoot, 'product-description.md');
  const productDescriptionSource = fs.readFileSync(productDescriptionPath, 'utf8');
  for (const name of ['coherent', 'cluttered']) {
    const uxSource = fs.readFileSync(path.join(sourceRoot, `records-${name}.json`), 'utf8');
    const uxSpec = JSON.parse(uxSource);
    const receipt = JSON.parse(fs.readFileSync(path.join(sourceRoot, `review-${name}.json`), 'utf8'));
    const inputs = {uxSpec, uxSource, productDescriptionSource, productDescriptionPath, sourceRoot, scopeRefs: ['update-record']};
    assert.equal(validateUxSpec(uxSpec), uxSpec);
    assert.equal(validateUxReview(receipt, inputs), receipt);
    assert.equal(receipt.verdict, name === 'coherent' ? 'pass' : 'revise');
    if (name === 'cluttered') {
      assert.ok(receipt.findings.some(finding => finding.severity === 'blocking' && finding.criteria.includes('action-economy-discoverability')));
    }
    assert.throws(() => validateUxReview(receipt, {...inputs, uxSource: `${uxSource}\n`}), /sha256|UX artifact/);
  }
});

test('sanitized fixtures contain no machine paths or encoded historical records', () => {
  const root = new URL('../references/fixtures/ux-regression/', import.meta.url);
  for (const name of fs.readdirSync(root)) {
    assert.equal(name.endsWith('.base64'), false);
    const source = fs.readFileSync(new URL(name, root), 'utf8');
    assert.doesNotMatch(source, /[a-z]:[\\/]|file:\/\/|\/(?:Users|home)\//i);
    assert.doesNotMatch(source, /idSha256|session_id|thread_id|C:\\dev/i);
  }
});

test('synthetic reviewer receipts validate both fixture cases and reject cross-bound results', t => {
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'synthetic-review-'));
  t.after(() => fs.rmSync(sourceRoot, {recursive: true, force: true}));
  const productDescriptionPath = path.join(sourceRoot, 'product-description.md');
  const productDescriptionSource = '# Example records\n\nReview and correct observation records.\n';
  fs.writeFileSync(productDescriptionPath, productDescriptionSource);
  const fixtures = createUxReviewerEvaluationFixtures();
  const inputs = {};
  const receipts = {};
  for (const [name, uxSpec] of Object.entries(fixtures)) {
    const cluttered = name === 'cluttered';
    inputs[name] = {
      uxSpec, uxSource: `${JSON.stringify(uxSpec)}\n`,
      productDescriptionPath, productDescriptionSource, sourceRoot,
      scopeRefs: ['update-record'],
    };
    // Authored test expectations, not recorded agent judgments.
    receipts[name] = {
      schemaVersion: '0.2',
      subject: createUxReviewSubject(inputs[name]),
      verdict: cluttered ? 'revise' : 'pass',
      summary: cluttered ? 'Remove the redundant confirmation.' : 'The bounded fixture is coherent.',
      coverage: UX_REVIEW_CRITERIA.map(criterion => ({
        criterion,
        result: cluttered && criterion === 'action-economy-discoverability' ? 'finding' : 'pass',
        evidenceRefs: ['update-record'],
        note: 'Synthetic coverage for the record update task.',
      })),
      findings: cluttered ? [{
        id: 'redundant-confirmation', severity: 'blocking',
        criteria: ['action-economy-discoverability'],
        recordRefs: ['confirm-current-selection'],
        evidence: 'The confirmation repeats the already visible selection.',
        consequence: 'The extra command adds work without advancing the task.',
        smallestRemedy: 'Remove the redundant confirmation command.',
        confidence: 'high',
      }] : [],
      researchChecks: [],
      limits: ['Synthetic contract test; no live reviewer or usability study.'],
    };
    assert.equal(validateUxReview(receipts[name], inputs[name]), receipts[name]);
  }
  assert.throws(() => validateUxReview(receipts.coherent, inputs.cluttered), /sha256|UX artifact/);
  assert.throws(() => validateUxReview(receipts.cluttered, inputs.coherent), /sha256|UX artifact/);
});

test('creates a valid coherent fixture exactly from the canonical UX fixture', () => {
  const {coherent} = createUxReviewerEvaluationFixtures();
  assert.deepEqual(coherent, createUxTestSpec());
  assert.equal(validateUxSpec(coherent), coherent);
});

test('creates a structurally valid cluttered fixture with a materially different interaction architecture', () => {
  const {coherent, cluttered} = createUxReviewerEvaluationFixtures();
  assert.equal(validateUxSpec(cluttered), cluttered);
  assert.equal(compareInteractionArchitectures(coherent, cluttered).equivalent, false);

  const task = cluttered.useCases.find(candidate => candidate.id === 'update-record');
  const frame = cluttered.interactionFrames.find(candidate => candidate.id === 'records-viewing');
  const pruning = cluttered.pruningReview.taskReviews.find(candidate => candidate.taskRef === task.id);
  assert.equal(task.steps[0].actionRef, 'confirm-current-selection');
  assert.equal(frame.regions[0].affordances[0].actionRef, 'confirm-current-selection');
  assert.equal(frame.focus.orderRefs[0], 'confirm-current-selection-affordance');
  assert.ok(pruning.reviewedActionRefs.includes('confirm-current-selection'));
  assert.ok(pruning.decisions.some(decision => decision.actionRefs.includes('confirm-current-selection')));
});

test('keeps both reviewer fixtures free of pilot-product vocabulary', () => {
  const serialized = JSON.stringify(createUxReviewerEvaluationFixtures()).toLocaleLowerCase('en-US');
  const forbiddenTerms = [
    ['ale', 'xa'].join(''),
    [['med', 'ia'].join(''), 'editor'].join(' '),
    [['vid', 'eo'].join(''), 'player'].join(' '),
    ['time', 'line'].join(''),
    ['saved', ['cl', 'ip'].join('')].join(' '),
  ];
  for (const term of forbiddenTerms) {
    assert.equal(serialized.includes(term), false, `fixture contains forbidden pilot term: ${term}`);
  }
});
