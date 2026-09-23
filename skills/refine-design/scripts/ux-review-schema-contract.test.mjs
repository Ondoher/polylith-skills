import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {createUxReviewSubject, UX_REVIEW_CRITERIA, validateUxReview as validateBoundUxReview} from './ux-review.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';

const contract = JSON.parse(fs.readFileSync(new URL('../references/ux-review-schema-0.2.json', import.meta.url), 'utf8'));
const productDescriptionSource = '# Field Journal\n\nA person can review and correct observation records.\n';
const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-review-schema-sources-'));
const productDescriptionPath = path.join(sourceRoot, 'product-description.md');
fs.writeFileSync(productDescriptionPath, productDescriptionSource);

function uxSource(uxSpec) {
  return `${JSON.stringify(uxSpec, null, 2)}\n`;
}

function reviewInputs(uxSpec, scopeRefs) {
  return {uxSpec, uxSource: uxSource(uxSpec), productDescriptionSource, productDescriptionPath, sourceRoot, scopeRefs};
}

function validateUxReview(review, {uxSpec, scopeRefs}) {
  return validateBoundUxReview(review, reviewInputs(uxSpec, scopeRefs));
}

function resolveReference(schema) {
  if (!schema.$ref) return schema;
  return schema.$ref.slice(2).split('/').reduce((value, segment) => value[segment], contract);
}

function matchesType(value, type) {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  return typeof value === type;
}

function contractErrors(schema, value, path = '$') {
  const resolved = resolveReference(schema);
  if (resolved !== schema) return contractErrors(resolved, value, path);
  const errors = [];
  if ('const' in schema && value !== schema.const) errors.push(`${path} does not match const`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} is not in enum`);
  if (schema.type && !matchesType(value, schema.type)) return [...errors, `${path} has the wrong type`];

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path} is too short`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path} does not match pattern`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} has too few items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path} has too many items`);
    if (schema.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) errors.push(`${path} has duplicate items`);
    if (schema.items) value.forEach((item, index) => errors.push(...contractErrors(schema.items, item, `${path}[${index}]`)));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${path}.${key} is required`);
    for (const [key, child] of Object.entries(value)) {
      if (schema.properties?.[key]) errors.push(...contractErrors(schema.properties[key], child, `${path}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${path}.${key} is not allowed`);
    }
  }
  return errors;
}

function passingReview(uxSpec) {
  return {
    schemaVersion: '0.2',
    subject: createUxReviewSubject(reviewInputs(uxSpec, [uxSpec.id])),
    verdict: 'pass',
    summary: 'The bounded artifact is coherent enough for the next design stage.',
    coverage: UX_REVIEW_CRITERIA.map(criterion => ({
      criterion,
      result: 'pass',
      evidenceRefs: [uxSpec.id],
      note: 'The criterion was assessed against the persisted artifact.',
    })),
    findings: [],
    researchChecks: [],
    limits: [],
  };
}

test('machine contract is closed and accepts the imperative validator fixture', () => {
  assert.equal(contract.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(contract.properties.schemaVersion.const, '0.2');
  assert.equal(contract.additionalProperties, false);
  assert.ok(Array.isArray(contract['x-semanticRules']) && contract['x-semanticRules'].length >= 10);
  for (const [name, definition] of Object.entries(contract.$defs)) {
    if (definition.type === 'object') {
      assert.equal(definition.additionalProperties, false, `${name} must close its object shape`);
      assert.ok(Array.isArray(definition.required), `${name} must declare required fields`);
    }
  }

  const uxSpec = createUxTestSpec();
  const candidate = passingReview(uxSpec);
  assert.deepEqual(contractErrors(contract, candidate), []);
  assert.doesNotThrow(() => validateUxReview(candidate, {uxSpec, scopeRefs: [uxSpec.id]}));
});

test('machine contract declares the generalized finding shape and cross-record semantic rules', () => {
  const finding = contract.$defs.finding;
  assert.ok(finding.required.includes('criteria'));
  assert.equal(Object.hasOwn(finding.properties, 'criterion'), false);
  assert.equal(contract.$defs.criteria.minItems, 1);
  assert.equal(contract.$defs.criteria.uniqueItems, true);
  assert.deepEqual(contract.$defs.criterion.enum, UX_REVIEW_CRITERIA);
  assert.deepEqual(contract.$defs.subject.required, ['productDescription', 'uxArtifact', 'scopeRefs']);
  assert.match(contract.$defs.sha256.pattern, /64/);

  const rules = contract['x-semanticRules'].join('\n');
  assert.match(rules, /Every coverage row whose result is finding/);
  assert.match(rules, /Every criterion named by a blocking finding/);
  assert.match(rules, /exactly matches the parent-requested scope/);
  assert.match(rules, /exactly one row for each of the ten canonical criteria/);
});

test('schema and imperative validator enforce every review stable-id field', () => {
  const uxSpec = createUxTestSpec();
  const mutations = [
    candidate => { candidate.subject.productDescription.id = 'Product Source'; },
    candidate => { candidate.subject.uxArtifact.id = 'UX Artifact'; },
    candidate => { candidate.subject.scopeRefs[0] = 'Scope Ref'; },
    candidate => { candidate.coverage[0].evidenceRefs[0] = 'Evidence Ref'; },
    candidate => {
      candidate.findings.push({
        id: 'Finding ID',
        severity: 'advisory',
        criteria: ['task-coherence'],
        recordRefs: [uxSpec.id],
        evidence: 'A bounded advisory observation.',
        consequence: 'The task may take longer.',
        smallestRemedy: 'Clarify the affected record.',
        confidence: 'medium',
      });
    },
  ];

  for (const mutate of mutations) {
    const candidate = passingReview(uxSpec);
    mutate(candidate);
    assert.notEqual(contractErrors(contract, candidate).length, 0);
    assert.throws(() => validateUxReview(candidate, {uxSpec, scopeRefs: [uxSpec.id]}), /stableId pattern/);
  }
});

test('schema and imperative validator reject representative response drift', () => {
  const uxSpec = createUxTestSpec();
  const cases = [
    candidate => { candidate.extra = true; },
    candidate => { candidate.schemaVersion = '0.1'; },
    candidate => { candidate.coverage.pop(); },
    candidate => {
      candidate.findings.push({
        id: 'cross-cutting-gap',
        severity: 'blocking',
        criteria: [],
        recordRefs: [uxSpec.id],
        evidence: 'The task lacks required evidence.',
        consequence: 'The handoff cannot establish completion.',
        smallestRemedy: 'Add the missing semantic decision.',
        confidence: 'high',
      });
      candidate.verdict = 'revise';
    },
    candidate => {
      candidate.findings.push({
        id: 'cross-cutting-gap',
        severity: 'blocking',
        criteria: ['task-coherence', 'task-coherence'],
        recordRefs: [uxSpec.id],
        evidence: 'The task lacks required evidence.',
        consequence: 'The handoff cannot establish completion.',
        smallestRemedy: 'Add the missing semantic decision.',
        confidence: 'high',
      });
      candidate.verdict = 'revise';
    },
  ];

  for (const mutate of cases) {
    const candidate = passingReview(uxSpec);
    mutate(candidate);
    assert.notEqual(contractErrors(contract, candidate).length, 0);
    assert.throws(() => validateUxReview(candidate, {uxSpec, scopeRefs: [uxSpec.id]}));
  }
});
