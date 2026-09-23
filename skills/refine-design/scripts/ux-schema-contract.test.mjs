import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateUxSpec} from './ux-design.mjs';
import {createPatternResearchRecord, createUxTestSpec} from './ux-test-fixture.mjs';

const contract = JSON.parse(fs.readFileSync(new URL('../references/ux-schema-0.2.json', import.meta.url), 'utf8'));

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function resolveReference(schema, root) {
  if (!schema.$ref) return schema;
  if (!schema.$ref.startsWith('#/')) throw new Error(`Unsupported external schema reference ${schema.$ref}`);
  return schema.$ref.slice(2).split('/').reduce((value, segment) => value[segment.replaceAll('~1', '/').replaceAll('~0', '~')], root);
}

function matchesType(value, type) {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'null') return value === null;
  return typeof value === type;
}

function contractErrors(schema, value, path = '$', root = contract) {
  if (schema === true) return [];
  if (schema === false) return [`${path} is forbidden`];

  const resolved = resolveReference(schema, root);
  const errors = [];
  if (resolved !== schema) {
    errors.push(...contractErrors(resolved, value, path, root));
    const siblings = Object.fromEntries(Object.entries(schema).filter(([key]) => key !== '$ref'));
    if (Object.keys(siblings).length) errors.push(...contractErrors(siblings, value, path, root));
    return errors;
  }

  if ('const' in schema && !sameValue(value, schema.const)) errors.push(`${path} does not match const`);
  if (schema.enum && !schema.enum.some(candidate => sameValue(value, candidate))) errors.push(`${path} is not in enum`);

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some(type => matchesType(value, type))) return [...errors, `${path} has the wrong type`];
  }

  if (schema.allOf) for (const branch of schema.allOf) errors.push(...contractErrors(branch, value, path, root));
  if (schema.anyOf && !schema.anyOf.some(branch => contractErrors(branch, value, path, root).length === 0)) errors.push(`${path} matches no anyOf branch`);
  if (schema.oneOf) {
    const matches = schema.oneOf.filter(branch => contractErrors(branch, value, path, root).length === 0).length;
    if (matches !== 1) errors.push(`${path} must match exactly one oneOf branch`);
  }
  if (schema.not && contractErrors(schema.not, value, path, root).length === 0) errors.push(`${path} matches a forbidden schema`);
  if (schema.if) {
    const branch = contractErrors(schema.if, value, path, root).length === 0 ? schema.then : schema.else;
    if (branch) errors.push(...contractErrors(branch, value, path, root));
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path} is shorter than minLength`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path} does not match pattern`);
    if (schema.format === 'uri') {
      try {
        new URL(value);
      } catch {
        errors.push(`${path} is not a URI`);
      }
    }
    if (schema.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push(`${path} is not a date`);
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} is below minimum`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} is above maximum`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} has too few items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path} has too many items`);
    if (schema.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) errors.push(`${path} has duplicate items`);
    if (schema.items) value.forEach((item, index) => errors.push(...contractErrors(schema.items, item, `${path}[${index}]`, root)));
    if (schema.contains) {
      const matches = value.filter(item => contractErrors(schema.contains, item, path, root).length === 0).length;
      if (matches < (schema.minContains ?? 1)) errors.push(`${path} does not satisfy contains`);
      if (schema.maxContains !== undefined && matches > schema.maxContains) errors.push(`${path} exceeds maxContains`);
    }
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${path}.${key} is required`);
    for (const [key, child] of Object.entries(value)) {
      if (schema.properties?.[key]) errors.push(...contractErrors(schema.properties[key], child, `${path}.${key}`, root));
      else if (schema.additionalProperties === false) errors.push(`${path}.${key} is not allowed`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') errors.push(...contractErrors(schema.additionalProperties, child, `${path}.${key}`, root));
    }
    if (schema.minProperties !== undefined && Object.keys(value).length < schema.minProperties) errors.push(`${path} has too few properties`);
    for (const [key, dependencies] of Object.entries(schema.dependentRequired ?? {})) {
      if (Object.hasOwn(value, key)) for (const dependency of dependencies) if (!Object.hasOwn(value, dependency)) errors.push(`${path}.${dependency} is required by ${key}`);
    }
  }

  return errors;
}

function recordById(records, id) {
  return records.find(record => record.id === id);
}

function stableIdLocations(schema, value, path = [], locations = []) {
  if (schema.$ref) {
    if (schema.$ref === '#/$defs/stableId') {
      locations.push(path);
      return locations;
    }
    stableIdLocations(resolveReference(schema, contract), value, path, locations);
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => stableIdLocations(schema.items, item, [...path, index], locations));
  } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && schema.properties) {
    for (const [key, childSchema] of Object.entries(schema.properties)) {
      if (Object.hasOwn(value, key)) stableIdLocations(childSchema, value[key], [...path, key], locations);
    }
  }
  for (const branch of schema.allOf ?? []) stableIdLocations(branch, value, path, locations);
  return locations;
}

function replaceAtPath(value, path, replacement) {
  let owner = value;
  for (const segment of path.slice(0, -1)) owner = owner[segment];
  owner[path.at(-1)] = replacement;
}

test('machine contract accepts the validator fixture and closes every object shape', () => {
  assert.equal(contract.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(contract.properties.schemaVersion.const, '0.2');
  assert.equal(contract.additionalProperties, false);
  assert.ok(Array.isArray(contract['x-semanticRules']) && contract['x-semanticRules'].length > 0);

  for (const [name, definition] of Object.entries(contract.$defs)) {
    if (definition.type === 'object') {
      assert.equal(definition.additionalProperties, false, `${name} must close its object shape`);
      assert.ok(Array.isArray(definition.required), `${name} must declare required fields explicitly`);
    }
  }

  const fixture = createUxTestSpec();
  assert.deepEqual(contractErrors(contract, fixture), []);
  assert.doesNotThrow(() => validateUxSpec(fixture));
});

test('machine contract and validator reject representative structural drift', () => {
  const cases = [
    ['invented product fields', spec => {
      spec.product.intendedUsers = ['A user'];
      spec.product.requirements = [];
      spec.product.scope = 'A scope';
    }],
    ['renamed application areas', spec => {
      spec.application.activityAreas = spec.application.areas;
      delete spec.application.areas;
    }],
    ['object surface states', spec => {
      spec.surfaces[0].states = spec.surfaces[0].states.map(id => ({id}));
    }],
    ['plural cancellation action refs', spec => {
      recordById(spec.actions, 'save-record').cancellation = {
        mode: 'available',
        description: 'Cancel the operation.',
        actionRefs: ['retry-save'],
      };
    }],
    ['object recovery', spec => {
      recordById(spec.actions, 'save-record').recovery = {
        id: 'retry-preserved-save',
        condition: 'The operation failed.',
        response: 'Offer retry.',
        actionRefs: ['retry-save'],
      };
    }],
    ['content without text', spec => {
      delete recordById(spec.interactionFrames, 'records-viewing').regions[0].content[0].text;
    }],
    ['object content state refs', spec => {
      recordById(spec.interactionFrames, 'records-viewing').regions[0].content[0].stateRefs = {state: 'viewing'};
    }],
    ['renamed transition targets', spec => {
      recordById(spec.interactionFrames, 'records-viewing').regions[0].affordances[0].transition = {
        kind: 'state',
        surfaceRef: 'records-workspace',
        state: 'editing',
      };
    }],
    ['missing canonical affordance interaction', spec => {
      delete recordById(spec.interactionFrames, 'records-viewing').regions[0].affordances[0].interaction;
    }],
    ['pruning record without id', spec => {
      delete spec.pruningReview.taskReviews[0].decisions[0].id;
    }],
  ];

  for (const [name, mutate] of cases) {
    const candidate = createUxTestSpec();
    mutate(candidate);
    assert.throws(() => validateUxSpec(candidate), {name: 'Error'}, `${name}: imperative validator`);
    assert.notEqual(contractErrors(contract, candidate).length, 0, `${name}: machine contract`);
  }
});

test('imperative validation applies the schema stableId contract at every populated stable-id location', () => {
  const fixture = createUxTestSpec();
  const locations = stableIdLocations(contract, fixture);
  assert.ok(locations.length >= 75, `expected broad stableId coverage, found ${locations.length}`);

  for (const location of locations) {
    const candidate = structuredClone(fixture);
    replaceAtPath(candidate, location, '   ');
    assert.notEqual(contractErrors(contract, candidate).length, 0, `${location.join('.')} must violate the machine contract`);
    assert.throws(
      () => validateUxSpec(candidate),
      /stableId pattern/,
      `${location.join('.')} must violate imperative stableId validation`,
    );
  }
});

test('machine contract and validator reject unsafe repository-relative document paths', () => {
  const hostilePaths = [
    'https://example.com/design',
    'javascript:alert(1)',
    '%68ttps%3A//example.com/design',
    '../private.md',
    'docs/%2e%2e/private.md',
    'docs/%252e%252e/private.md',
    'docs/guide.md)[off-site](https://example.com)',
    'docs/guide.md#ok)[off-site](https://example.com)',
    '/absolute/path.md',
    '%2Fabsolute/path.md',
    'C:\\Users\\person\\private.md',
    '//example.com/document',
    'docs/guide.md?token=secret',
    'user@example.com/guide.md',
  ];
  for (const value of hostilePaths) {
    const candidate = createUxTestSpec();
    candidate.supportingDocuments = [{label: 'Guide', path: value, description: 'A linked design guide.'}];
    assert.notEqual(contractErrors(contract, candidate).length, 0, `${value}: machine contract`);
    assert.throws(() => validateUxSpec(candidate), {name: 'Error'}, `${value}: imperative validator`);
  }
});

test('machine contract and validator reject credentials in HTTPS research URLs', () => {
  const probes = [
    'https://person:secret@example.com/guidance',
    'https://example.com/#token=super-secret-value',
    'https://example.com/guidance?refresh_token=super-secret-value',
    'https://example.com/guidance?sig=super-secret-value',
    'https://example.com/guidance?x-amz-security-token=super-secret-value',
    'https://example.com/file%3A%2FC%3A%2FUsers%2Fperson%2Fsecret',
    'https://[::7f00:1]/guidance',
    'https://[::127.0.0.1]/x',
    'https://[::7f00:0001]/x',
    'https://[0000:0000:0000:0000:0000:0000:7f00:0001]/x',
    'https://[0:0:0:0:0:0:127.0.0.1]/x',
    'https://[64:ff9b::127.0.0.1]/guidance',
  ];
  for (const sourceUrl of probes) {
    const candidate = createUxTestSpec();
    candidate.patternResearch.push(createPatternResearchRecord());
    candidate.patternResearch[0].sources[0].sourceUrl = sourceUrl;
    candidate.actions.find(action => action.id === 'save-record').patternBasis = {
      kind: 'researched',
      rationale: 'A blocking decision uses the compared dialog pattern.',
      researchRef: 'dialog-pattern-research',
    };
    assert.notEqual(contractErrors(contract, candidate).length, 0, `${sourceUrl}: machine contract`);
    assert.throws(() => validateUxSpec(candidate), {name: 'Error'}, `${sourceUrl}: imperative validator`);
  }
  assert.ok(contract['x-semanticRules'].some(rule => rule.includes('Recursively decoded URL paths, queries, and fragments')));
  assert.ok(contract['x-semanticRules'].some(rule => rule.includes('NAT64 private/loopback')));
});
