import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {buildComponentPromotionCandidate, buildComponentRegistration, validateComponentDesign, writeComponentDesign} from './component-design.mjs';
import {componentDesignTarget} from './root-bound-artifact.mjs';
import {createUxReviewSubject, UX_REVIEW_CRITERIA} from './ux-review.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';

const componentFixtureFile = new URL('../references/component-design-proposal.json', import.meta.url);
const uiFixtureFile = new URL('../references/ui-composition-proposal.json', import.meta.url);
const designFixtureFile = new URL('../references/extras-proposal.json', import.meta.url);
const fixture = () => JSON.parse(fs.readFileSync(componentFixtureFile, 'utf8'));
const surface = () => JSON.parse(fs.readFileSync(uiFixtureFile, 'utf8'));
const productDescriptionSource = '# Field Journal\n\nA person can review and correct observation records.\n';

function ux() {
  return createUxTestSpec();
}

function design() {
  const value = JSON.parse(fs.readFileSync(designFixtureFile, 'utf8'));
  delete value.baseRevision;
  value.theme.id = 'example-theme';
  return {...value, id: 'example-design', revision: 1, decisions: []};
}

function componentOutput(root, value = fixture()) {
  return path.join(root, ...componentDesignTarget(value.componentTemplate.id).split('/'));
}

function persistenceInputs(base, value = fixture()) {
  const input = path.join(base, 'proposal.json');
  const uxFile = path.join(base, 'ux.json');
  const designFile = path.join(base, 'design.json');
  const productDescriptionPath = path.join(base, 'product-description.md');
  const uxReviewPath = path.join(base, 'ux-review.json');
  const uxSpec = ux();
  const source = `${JSON.stringify(uxSpec, null, 2)}\n`;
  fs.writeFileSync(input, JSON.stringify(value));
  fs.writeFileSync(uxFile, source);
  fs.writeFileSync(designFile, JSON.stringify(design()));
  fs.writeFileSync(productDescriptionPath, productDescriptionSource);
  fs.writeFileSync(uxReviewPath, JSON.stringify({
    schemaVersion: '0.2',
    subject: createUxReviewSubject({
      uxSpec,
      uxSource: source,
      uxArtifactPath: uxFile,
      productDescriptionSource,
      productDescriptionPath,
      sourceRoot: base,
      scopeRefs: [uxSpec.id],
    }),
    verdict: 'pass',
    summary: 'The accepted interaction architecture is coherent enough for bounded component composition.',
    coverage: UX_REVIEW_CRITERIA.map(criterion => ({criterion, result: 'pass', evidenceRefs: [uxSpec.id], note: `The ${criterion} criterion was assessed.`})),
    findings: [],
    researchChecks: [],
    limits: ['This fixture represents semantic review rather than usability testing.'],
  }));
  return {input, uxFile, designFile, options: {uxReviewPath, productDescriptionPath, sourceRoot: base}};
}

test('validates, persists, and registers an exact placeholder replacement', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'component-design-'));
  const paths = persistenceInputs(base);
  const output = componentOutput(base);
  const result = writeComponentDesign(paths.input, output, paths.uxFile, paths.designFile, paths.options);
  const first = fs.readFileSync(output, 'utf8');
  writeComponentDesign(output, output, paths.uxFile, paths.designFile, paths.options);
  assert.equal(fs.readFileSync(output, 'utf8'), first);
  assert.equal(result.componentId, 'record-list-component');

  const registration = buildComponentRegistration(fixture(), surface(), {uxSpec: ux(), designLanguage: design()});
  assert.deepEqual(registration.replacesTemplateRef, {id: 'record-list-placeholder', version: '1'});
  assert.equal(registration.stateOutputs.available, 'component-comps/record-list-available.html');
});

test('rejects obsolete and future design-language dependencies before component output', () => {
  for (const schemaVersion of ['0.13', '0.15']) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'component-design-language-version-'));
    const paths = persistenceInputs(base);
    const invalidDesign = design();
    invalidDesign.schemaVersion = schemaVersion;
    fs.writeFileSync(paths.designFile, JSON.stringify(invalidDesign));
    const output = componentOutput(base);
    assert.throws(
      () => writeComponentDesign(paths.input, output, paths.uxFile, paths.designFile, paths.options),
      /Unsupported design-language schemaVersion; expected 0\.14/,
    );
    assert.equal(fs.existsSync(output), false);
  }
});

test('root-binds component output and refuses linked or foreign targets without mutation', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'component-output-boundary-'));
  const paths = persistenceInputs(base);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'component-output-outside-'));
  const externalOutput = path.join(outside, 'component.json');
  assert.throws(
    () => writeComponentDesign(paths.input, externalOutput, paths.uxFile, paths.designFile, paths.options),
    /must stay within the product-document root/,
  );
  assert.equal(fs.existsSync(externalOutput), false);
  const alternateOutput = path.join(base, 'alternate-component.json');
  assert.throws(
    () => writeComponentDesign(paths.input, alternateOutput, paths.uxFile, paths.designFile, paths.options),
    /must use canonical target ui\/components\/record-list-component\.json/,
  );
  assert.equal(fs.existsSync(alternateOutput), false);

  const foreignOutput = componentOutput(base);
  fs.mkdirSync(path.dirname(foreignOutput), {recursive: true});
  const foreignSpec = fixture();
  foreignSpec.id = 'different-component-design';
  const foreign = `${JSON.stringify(foreignSpec, null, 2)}\n`;
  fs.writeFileSync(foreignOutput, foreign);
  assert.throws(
    () => writeComponentDesign(paths.input, foreignOutput, paths.uxFile, paths.designFile, paths.options),
    /component artifact identity different-component-design does not match incoming identity record-list-component-design/,
  );
  assert.equal(fs.readFileSync(foreignOutput, 'utf8'), foreign);

  const foreignTemplate = fixture();
  foreignTemplate.componentTemplate.id = 'different-component';
  const foreignTemplateBytes = `${JSON.stringify(foreignTemplate, null, 2)}\n`;
  fs.writeFileSync(foreignOutput, foreignTemplateBytes);
  assert.throws(
    () => writeComponentDesign(paths.input, foreignOutput, paths.uxFile, paths.designFile, paths.options),
    /component template identity different-component does not match incoming identity record-list-component/,
  );
  assert.equal(fs.readFileSync(foreignOutput, 'utf8'), foreignTemplateBytes);

  const linkedBase = fs.mkdtempSync(path.join(os.tmpdir(), 'component-output-linked-root-'));
  const linkedPaths = persistenceInputs(linkedBase);
  const linkedOutside = fs.mkdtempSync(path.join(os.tmpdir(), 'component-output-linked-'));
  fs.mkdirSync(path.join(linkedBase, 'ui'));
  const linkedParent = path.join(linkedBase, 'ui', 'components');
  fs.symlinkSync(linkedOutside, linkedParent, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(
    () => writeComponentDesign(linkedPaths.input, componentOutput(linkedBase), linkedPaths.uxFile, linkedPaths.designFile, linkedPaths.options),
    /Refusing linked component artifact/,
  );
  assert.deepEqual(fs.readdirSync(linkedOutside), []);
});

test('rejects incomplete state mapping and non-placeholder replacement targets', () => {
  const invalid = fixture();
  invalid.componentTemplate.stateScenes = [];
  assert.throws(() => validateComponentDesign(invalid, {uxSpec: ux(), designLanguage: design()}), /must match the component state set/);

  const ui = surface();
  ui.templates.find(template => template.id === 'record-list-placeholder').availability = 'available';
  assert.throws(() => buildComponentRegistration(fixture(), ui, {uxSpec: ux(), designLanguage: design()}), /placeholder/);

  const wrongOwner = surface();
  delete wrongOwner.scenes[0].root.children[1].uxRef;
  assert.throws(() => buildComponentRegistration(fixture(), wrongOwner, {uxSpec: ux(), designLanguage: design()}), /does not reference UX component record-list/);
});

test('requires pattern evidence and prevents wireframes from replacing comp placeholders', () => {
  const noResearch = fixture();
  noResearch.patternResearch.comparables = [];
  assert.throws(() => validateComponentDesign(noResearch, {uxSpec: ux(), designLanguage: design()}), /comparables must not be empty/);

  const wireframe = fixture();
  wireframe.artifactKind = 'wireframe';
  wireframe.fidelity = {missingForComp: ['Representative content and finished styling are not designed.']};
  assert.doesNotThrow(() => validateComponentDesign(wireframe, {uxSpec: ux(), designLanguage: design()}));
  assert.throws(() => buildComponentRegistration(wireframe, surface(), {uxSpec: ux(), designLanguage: design()}), /wireframe and cannot replace/);
});

test('requires an auditable search and independent source verification before comp registration', () => {
  const noQueries = fixture();
  noQueries.patternResearch.searchQueries = [];
  assert.throws(() => validateComponentDesign(noQueries, {uxSpec: ux(), designLanguage: design()}), /searchQueries must not be empty/);

  const pending = fixture();
  pending.patternResearch.verification = {status: 'pending', notes: ['Parent verification has not run.']};
  assert.throws(() => validateComponentDesign(pending, {uxSpec: ux(), designLanguage: design()}), /comp requires parent source verification/);

  const unsupportedConsensus = fixture();
  unsupportedConsensus.patternResearch.comparables[0].sourceType = 'official-product-doc';
  assert.throws(() => validateComponentDesign(unsupportedConsensus, {uxSpec: ux(), designLanguage: design()}), /two independent products or one normative source/);

  const noComparable = fixture();
  noComparable.artifactKind = 'wireframe';
  noComparable.patternResearch.outcome = 'no-established-comparable';
  noComparable.patternResearch.comparables = [];
  noComparable.patternResearch.sharedPatterns = [];
  noComparable.patternResearch.verification = {status: 'pending', notes: ['No source claims require verification.']};
  noComparable.fidelity = {missingForComp: ['A novel visual direction still needs design and review.']};
  assert.doesNotThrow(() => validateComponentDesign(noComparable, {uxSpec: ux(), designLanguage: design()}));
});

test('requires component-focused scenes and controlled visual roles', () => {
  const wrongSubject = fixture();
  wrongSubject.scenes[0].subject = {kind: 'surface', ref: 'records-workspace'};
  wrongSubject.scenes[0].state = 'viewing';
  assert.throws(() => validateComponentDesign(wrongSubject, {uxSpec: ux(), designLanguage: design()}), /must focus component record-list/);

  const wrongVisual = fixture();
  wrongVisual.scenes[0].root.children[0].parameters.role = 'invented-art';
  assert.throws(() => validateComponentDesign(wrongVisual, {uxSpec: ux(), designLanguage: design()}), /unsupported for the visual renderer/);
});

test('requires explicit user authority to lock or revise a component comp', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'component-design-lock-'));
  const paths = persistenceInputs(base);
  const output = componentOutput(base);
  writeComponentDesign(paths.input, output, paths.uxFile, paths.designFile, paths.options);
  const locked = fixture();
  locked.status = 'locked';
  fs.writeFileSync(paths.input, JSON.stringify(locked));
  assert.throws(() => writeComponentDesign(paths.input, output, paths.uxFile, paths.designFile, paths.options), /explicit current user lock request/);
  writeComponentDesign(paths.input, output, paths.uxFile, paths.designFile, {...paths.options, lockReason: 'User requested this component comp be locked.'});
  locked.assessment.description = 'A quiet agent-authored revision.';
  fs.writeFileSync(paths.input, JSON.stringify(locked));
  assert.throws(() => writeComponentDesign(paths.input, output, paths.uxFile, paths.designFile, paths.options), /Locked design \$ cannot change/);
});

test('rejects credentials, secrets, and private local paths in durable component research', () => {
  const credentialUrl = fixture();
  credentialUrl.patternResearch.comparables[0].sourceUrl = 'https://person:secret@example.com/guidance';
  assert.throws(() => validateComponentDesign(credentialUrl, {uxSpec: ux(), designLanguage: design()}), /URL credentials/);

  const secretQuery = fixture();
  secretQuery.patternResearch.searchQueries[0] = 'record list access_token=private-value-123';
  assert.throws(() => validateComponentDesign(secretQuery, {uxSpec: ux(), designLanguage: design()}), /credentials or secrets/);

  const privatePath = fixture();
  privatePath.patternResearch.limits[0] = 'Compared with C:\\Users\\person\\private-notes.md.';
  assert.throws(() => validateComponentDesign(privatePath, {uxSpec: ux(), designLanguage: design()}), /private local path/);

  const encodedPath = fixture();
  encodedPath.patternResearch.limits[0] = 'Compared with C%3A%5CUsers%5Cperson%5Cprivate-notes.md.';
  assert.throws(() => validateComponentDesign(encodedPath, {uxSpec: ux(), designLanguage: design()}), /private local path/);

  const bearer = fixture();
  bearer.patternResearch.searchQueries[0] = 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.private.signature';
  assert.throws(() => validateComponentDesign(bearer, {uxSpec: ux(), designLanguage: design()}), /credentials or secrets/);

  const vendorToken = fixture();
  vendorToken.patternResearch.limits[0] = 'Verification used ghp_abcdefghijklmnopqrstuvwxyz1234567890.';
  assert.throws(() => validateComponentDesign(vendorToken, {uxSpec: ux(), designLanguage: design()}), /credentials or secrets/);

  for (const sourceUrl of [
    'https://10.0.0.8/guidance',
    'https://[::1]/guidance',
    'https://service.local/guidance',
    'https://example.com/guidance?client_secret=private-value',
  ]) {
    const candidate = fixture();
    candidate.patternResearch.comparables[0].sourceUrl = sourceUrl;
    assert.throws(
      () => validateComponentDesign(candidate, {uxSpec: ux(), designLanguage: design()}),
      /public HTTPS host|credential query parameters|credentials or secrets/,
    );
  }

  const passwordDesignResearch = fixture();
  passwordDesignResearch.patternResearch.searchQueries[0] = 'Password = minimum 12 characters interaction guidance';
  passwordDesignResearch.patternResearch.limits[0] = 'The research compares password: required and optional field treatments.';
  assert.doesNotThrow(() => validateComponentDesign(passwordDesignResearch, {uxSpec: ux(), designLanguage: design()}));
});

test('rejects undeclared component-extension fields before persistence', () => {
  const cases = [
    candidate => { candidate.unreviewedMetadata = true; },
    candidate => { candidate.patternResearch.unreviewedMetadata = true; },
    candidate => { candidate.patternResearch.comparables[0].unreviewedMetadata = true; },
    candidate => { candidate.componentTemplate.accessibility.unreviewedMetadata = true; },
    candidate => { candidate.promotion.unreviewedMetadata = true; },
  ];
  for (const mutate of cases) {
    const candidate = fixture();
    mutate(candidate);
    assert.throws(
      () => validateComponentDesign(candidate, {uxSpec: ux(), designLanguage: design()}),
      /unsupported field unreviewedMetadata/,
    );
  }
});

test('requires a current passing UX review before component persistence', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'component-design-gate-'));
  const paths = persistenceInputs(base);
  const output = componentOutput(base);
  assert.throws(() => writeComponentDesign(paths.input, output, paths.uxFile, paths.designFile), /UX review receipt/);
  assert.equal(fs.existsSync(output), false);

  const receipt = JSON.parse(fs.readFileSync(paths.options.uxReviewPath, 'utf8'));
  receipt.verdict = 'revise';
  fs.writeFileSync(paths.options.uxReviewPath, JSON.stringify(receipt));
  assert.throws(() => writeComponentDesign(paths.input, output, paths.uxFile, paths.designFile, paths.options), /must be pass/);
  assert.equal(fs.existsSync(output), false);
});

test('binds persisted component asset roots below the authoritative source root', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'component-asset-authority-'));
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'component-proposal-staging-'));
  let paths = persistenceInputs(base);
  paths.input = path.join(staging, 'asset-free-proposal.json');
  fs.writeFileSync(paths.input, JSON.stringify(fixture()));
  assert.doesNotThrow(() => writeComponentDesign(
    paths.input, componentOutput(base), paths.uxFile, paths.designFile, paths.options,
  ));

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const imageProposal = fixture();
  imageProposal.assets.push({
    id: 'approved-image', kind: 'image', status: 'accepted', path: 'images/pixel.png', mimeType: 'image/png',
    widthPx: 1, heightPx: 1, sha256: createHash('sha256').update(png).digest('hex'),
  });
  fs.mkdirSync(path.join(base, 'images'));
  fs.writeFileSync(path.join(base, 'images', 'pixel.png'), png);
  paths = persistenceInputs(base, imageProposal);
  paths.input = path.join(staging, 'image-proposal.json');
  fs.writeFileSync(paths.input, JSON.stringify(imageProposal));
  assert.throws(
    () => writeComponentDesign(paths.input, componentOutput(base), paths.uxFile, paths.designFile, paths.options),
    /require an explicit assetRoot/,
  );
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'component-assets-outside-'));
  assert.throws(
    () => writeComponentDesign(paths.input, componentOutput(base), paths.uxFile, paths.designFile, {
      ...paths.options,
      assetRoot: outside,
    }),
    /assetRoot must stay within sourceRoot/,
  );
  assert.doesNotThrow(() => writeComponentDesign(
    paths.input,
    componentOutput(base),
    paths.uxFile,
    paths.designFile,
    {...paths.options, assetRoot: base},
  ));
});

test('creates a review-only shared-library promotion candidate without applying it', () => {
  const candidate = fixture();
  candidate.promotion.scope = 'shared-candidate';
  const handoff = buildComponentPromotionCandidate(candidate, {uxSpec: ux(), designLanguage: design()});
  assert.equal(handoff.kind, 'component-promotion-candidate');
  assert.equal(handoff.component.id, 'record-list-component');
  assert.deepEqual(handoff.approval, {status: 'required', authority: 'explicit-user-direction'});
  assert.equal(handoff.application.status, 'not-applied');

  const local = fixture();
  assert.throws(() => buildComponentPromotionCandidate(local, {uxSpec: ux(), designLanguage: design()}), /not marked as a shared candidate/);
});
