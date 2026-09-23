import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {createUxReviewSubject, UX_REVIEW_CRITERIA, validateUxReview as validateBoundUxReview} from './ux-review.mjs';
import {createPatternResearchRecord, createUxTestSpec} from './ux-test-fixture.mjs';

const productDescriptionSource = '# Field Journal\n\nA person can review and correct observation records.\n';
const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-review-sources-'));
const productDescriptionPath = path.join(sourceRoot, 'product-description.md');
fs.writeFileSync(productDescriptionPath, productDescriptionSource);

function uxSource(uxSpec) {
  return `${JSON.stringify(uxSpec, null, 2)}\n`;
}

function reviewInputs(uxSpec, scopeRefs) {
  return {uxSpec, uxSource: uxSource(uxSpec), productDescriptionSource, productDescriptionPath, sourceRoot, scopeRefs};
}

function validateUxReview(reviewReceipt, {uxSpec, scopeRefs}) {
  return validateBoundUxReview(reviewReceipt, reviewInputs(uxSpec, scopeRefs));
}

function context() {
  const uxSpec = createUxTestSpec();
  return {
    uxSpec,
    artifactRef: uxSpec.id,
    revision: uxSpec.revision,
    taskRef: uxSpec.useCases[0].id,
    actionRef: uxSpec.actions[0].id,
  };
}

function coverage(evidenceRef, result = 'pass') {
  return UX_REVIEW_CRITERIA.map(criterion => ({
    criterion,
    result,
    evidenceRefs: [evidenceRef],
    note: `The ${criterion} criterion was assessed against the bounded UX artifact.`,
  }));
}

function review(input, overrides = {}) {
  return {
    schemaVersion: '0.2',
    subject: createUxReviewSubject(reviewInputs(input.uxSpec, [input.artifactRef])),
    verdict: 'pass',
    summary: 'The bounded interaction architecture is coherent enough for UI exploration.',
    coverage: coverage(input.artifactRef),
    findings: [],
    researchChecks: [],
    limits: ['This review evaluates the saved semantic UX contract rather than usability in operation.'],
    ...overrides,
  };
}

function blockingFinding(input, criteria = ['task-coherence']) {
  return {
    id: 'missing-task-result',
    severity: 'blocking',
    criteria,
    recordRefs: [input.taskRef],
    evidence: 'The declared task does not identify an observable completion result.',
    consequence: 'A dependent composition could not distinguish completion from progress.',
    smallestRemedy: 'Declare the observable completion result on the affected task.',
    confidence: 'high',
  };
}

test('accepts an exact 0.2 passing review and advisory findings', () => {
  const input = context();
  const passing = review(input);
  assert.equal(validateUxReview(passing, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), passing);

  const advisory = review(input, {
    findings: [{
      ...blockingFinding(input, ['information-hierarchy']),
      id: 'consider-shorter-guidance',
      severity: 'advisory',
      evidence: 'One guidance record is longer than neighboring records.',
      consequence: 'Scanning may take slightly longer.',
      smallestRemedy: 'Consider shortening the guidance without changing its meaning.',
      confidence: 'medium',
    }],
  });
  assert.doesNotThrow(() => validateUxReview(advisory, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}));
});

test('binds the review to the exact artifact revision and requested scope', () => {
  const input = context();
  const wrongId = review(input);
  wrongId.subject.uxArtifact.id = 'different-ux';
  assert.throws(() => validateUxReview(wrongId, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /subject\.uxArtifact\.id must match/);

  const wrongRevision = review(input);
  wrongRevision.subject.uxArtifact.revision = 'different-revision';
  assert.throws(() => validateUxReview(wrongRevision, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /subject\.uxArtifact\.revision must match/);

  const wrongProductIdentity = review(input);
  wrongProductIdentity.subject.productDescription.id = 'different-product';
  assert.throws(() => validateUxReview(wrongProductIdentity, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /subject\.productDescription\.id must match/);

  const staleUx = review(input);
  staleUx.subject.uxArtifact.sha256 = '0'.repeat(64);
  assert.throws(() => validateUxReview(staleUx, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /UX artifact/);

  const staleProduct = review(input);
  staleProduct.subject.productDescription.sha256 = '0'.repeat(64);
  assert.throws(() => validateUxReview(staleProduct, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /product description/);

  const wrongScope = review(input);
  wrongScope.subject.scopeRefs = [input.taskRef];
  assert.throws(() => validateUxReview(wrongScope, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /scopeRefs must match/);

  const reorderedScope = review(input);
  reorderedScope.subject.scopeRefs = [input.actionRef, input.taskRef];
  assert.doesNotThrow(() => validateUxReview(reorderedScope, {uxSpec: input.uxSpec, scopeRefs: [input.taskRef, input.actionRef]}));
});

test('binds product-description bytes to the real file declared by the selected UX source', () => {
  const input = context();
  const passing = review(input);
  const alternatePath = path.join(sourceRoot, 'alternate-product-description.md');
  fs.writeFileSync(alternatePath, productDescriptionSource);
  assert.throws(
    () => validateBoundUxReview(passing, {...reviewInputs(input.uxSpec, [input.artifactRef]), productDescriptionPath: alternatePath}),
    /must identify the file declared by UX source product/,
  );

  const normalizedPath = path.join(sourceRoot, 'nested', '..', 'product-description.md');
  assert.doesNotThrow(() => validateBoundUxReview(passing, {
    ...reviewInputs(input.uxSpec, [input.artifactRef]),
    productDescriptionPath: normalizedPath,
  }));

  const aliasParent = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-review-source-alias-'));
  const aliasRoot = path.join(aliasParent, 'linked-source-root');
  fs.symlinkSync(sourceRoot, aliasRoot, 'junction');
  assert.doesNotThrow(() => validateBoundUxReview(passing, {
    ...reviewInputs(input.uxSpec, [input.artifactRef]),
    productDescriptionPath: path.join(aliasRoot, 'product-description.md'),
  }));

  assert.throws(
    () => validateBoundUxReview(passing, {
      ...reviewInputs(input.uxSpec, [input.artifactRef]),
      productDescriptionSource: 'Different bytes supplied for the canonical path.',
    }),
    /does not match the authoritative file/,
  );

  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-review-source-escape-'));
  fs.writeFileSync(path.join(outsideRoot, 'product-description.md'), productDescriptionSource);
  fs.symlinkSync(outsideRoot, path.join(sourceRoot, 'linked-outside'), 'junction');
  const escapedUx = createUxTestSpec();
  escapedUx.sources[0].path = 'linked-outside/product-description.md';
  assert.throws(() => createUxReviewSubject({
    uxSpec: escapedUx,
    uxSource: uxSource(escapedUx),
    productDescriptionSource,
    productDescriptionPath: path.join(outsideRoot, 'product-description.md'),
    sourceRoot,
    scopeRefs: [escapedUx.id],
  }), /escapes sourceRoot through a linked path/);
});

test('requires schema stable IDs throughout the receipt and findings', () => {
  const input = context();
  const invalidSubject = review(input);
  invalidSubject.subject.productDescription.id = 'Product Source';
  assert.throws(() => validateUxReview(invalidSubject, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /stableId pattern/);

  const invalidFinding = review(input, {
    findings: [{...blockingFinding(input), id: 'Missing task result', severity: 'advisory'}],
  });
  assert.throws(() => validateUxReview(invalidFinding, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /stableId pattern/);

  const invalidRecordRef = review(input, {
    findings: [{...blockingFinding(input), id: 'advisory-gap', severity: 'advisory', recordRefs: ['Record Ref']}],
  });
  assert.throws(() => validateUxReview(invalidRecordRef, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /stableId pattern/);
});

test('requires each canonical coverage criterion exactly once with valid evidence refs', () => {
  const input = context();
  const missing = review(input);
  missing.coverage.pop();
  assert.throws(() => validateUxReview(missing, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /exactly 10 criteria/);

  const duplicate = review(input);
  duplicate.coverage[9].criterion = duplicate.coverage[0].criterion;
  assert.throws(() => validateUxReview(duplicate, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /duplicate criterion/);

  const invalidResult = review(input);
  invalidResult.coverage[0].result = 'uncertain';
  assert.throws(() => validateUxReview(invalidResult, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /unsupported value uncertain/);

  const missingEvidence = review(input);
  missingEvidence.coverage[0].evidenceRefs = ['unknown-record'];
  assert.throws(() => validateUxReview(missingEvidence, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /references missing UX record unknown-record/);
});

test('allows one cross-cutting blocking finding to cover multiple criteria', () => {
  const input = context();
  const criteria = ['task-coherence', 'handoff-traceability'];
  const candidate = review(input, {verdict: 'revise', findings: [blockingFinding(input, criteria)]});
  criteria.forEach(criterion => {
    candidate.coverage.find(item => item.criterion === criterion).result = 'finding';
  });
  assert.doesNotThrow(() => validateUxReview(candidate, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}));
});

test('requires bidirectional coverage between finding rows and blocking finding criteria', () => {
  const input = context();
  const uncoveredCriterion = review(input, {verdict: 'revise', findings: [blockingFinding(input, ['task-coherence', 'handoff-traceability'])]});
  uncoveredCriterion.coverage.find(item => item.criterion === 'task-coherence').result = 'finding';
  assert.throws(() => validateUxReview(uncoveredCriterion, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /requires finding coverage for handoff-traceability/);

  const unexplainedCoverage = review(input, {verdict: 'revise', findings: [blockingFinding(input)]});
  unexplainedCoverage.coverage.find(item => item.criterion === 'task-coherence').result = 'finding';
  unexplainedCoverage.coverage.find(item => item.criterion === 'information-hierarchy').result = 'finding';
  assert.throws(() => validateUxReview(unexplainedCoverage, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /coverage finding information-hierarchy requires a blocking finding/);

  const duplicateCriteria = review(input, {verdict: 'revise', findings: [blockingFinding(input, ['task-coherence', 'task-coherence'])]});
  assert.throws(() => validateUxReview(duplicateCriteria, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /contains duplicate value task-coherence/);

  const emptyCriteria = review(input, {verdict: 'revise', findings: [blockingFinding(input, [])]});
  assert.throws(() => validateUxReview(emptyCriteria, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /criteria must not be empty/);
});

test('checks finding shape, reference integrity, and verdict consistency', () => {
  const input = context();
  const revise = review(input, {verdict: 'revise', findings: [blockingFinding(input)]});
  revise.coverage.find(item => item.criterion === 'task-coherence').result = 'finding';
  assert.doesNotThrow(() => validateUxReview(revise, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}));

  const passingBlocker = structuredClone(revise);
  passingBlocker.verdict = 'pass';
  assert.throws(() => validateUxReview(passingBlocker, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /verdict must be revise/);

  const missingRecord = review(input, {findings: [{...blockingFinding(input), severity: 'advisory', recordRefs: ['unknown-record']}]});
  assert.throws(() => validateUxReview(missingRecord, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /references missing UX record unknown-record/);
});

test('checks relevant research records and their own source identifiers', () => {
  const input = context();
  const research = createPatternResearchRecord();
  input.uxSpec.patternResearch.push(research);
  const researchedAction = input.uxSpec.actions.find(action => research.actionRefs.includes(action.id));
  researchedAction.patternBasis = {
    kind: 'researched',
    rationale: 'The bounded decision uses the source-checked interaction pattern.',
    researchRef: research.id,
  };
  const sourceRef = research.sources[0].id;
  const supported = review(input, {
    researchChecks: [{
      researchRef: research.id,
      result: 'supported',
      sourceRefs: [sourceRef],
      note: 'The source supports the interaction semantics attributed to it.',
    }],
  });
  assert.doesNotThrow(() => validateUxReview(supported, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}));

  const omitted = review(input);
  assert.throws(() => validateUxReview(omitted, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /researchChecks researchRefs must match/);

  const wrongSource = structuredClone(supported);
  wrongSource.researchChecks[0].sourceRefs = ['unknown-source'];
  assert.throws(() => validateUxReview(wrongSource, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /references missing source unknown-source/);

  const unresolved = structuredClone(supported);
  unresolved.researchChecks[0].result = 'unverified';
  unresolved.researchChecks[0].sourceRefs = [];
  assert.throws(() => validateUxReview(unresolved, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /verdict must be revise/);
  unresolved.verdict = 'revise';
  assert.doesNotThrow(() => validateUxReview(unresolved, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}));
});

test('requires schema 0.2 and rejects undeclared response fields', () => {
  const input = context();
  const old = review(input, {schemaVersion: '0.1'});
  assert.throws(() => validateUxReview(old, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /expected 0\.2/);

  const extended = review(input);
  extended.recommendation = 'Continue';
  assert.throws(() => validateUxReview(extended, {uxSpec: input.uxSpec, scopeRefs: [input.artifactRef]}), /unsupported field recommendation/);
});
