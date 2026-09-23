import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateUiSpec, writeUiSpec} from './ui-composition.mjs';
import {ROOT_BOUND_TARGETS} from './root-bound-artifact.mjs';
import {createUxReviewSubject, UX_REVIEW_CRITERIA} from './ux-review.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';

const fixturePath = fileURLToPath(new URL('../references/ui-composition-proposal.json', import.meta.url));
const designFixturePath = fileURLToPath(new URL('../references/extras-proposal.json', import.meta.url));
const productDescriptionSource = '# Field Journal\n\nA person can review and correct observation records.\n';

function proposal() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function ux() {
  return createUxTestSpec();
}

function uiOutput(root) {
  return path.join(root, ...ROOT_BOUND_TARGETS.ui.split('/'));
}

function designLanguage() {
  const design = JSON.parse(fs.readFileSync(designFixturePath, 'utf8'));
  delete design.baseRevision;
  design.theme.id = 'example-theme';
  return {...design, id: 'example-design', revision: 1, decisions: []};
}

function writeInputs(directory, ui = proposal()) {
  const input = path.join(directory, 'proposal.json');
  const uxPath = path.join(directory, 'ux.json');
  const designPath = path.join(directory, 'design.json');
  const productDescriptionPath = path.join(directory, 'product-description.md');
  const uxReviewPath = path.join(directory, 'ux-review.json');
  const uxSpec = ux();
  const uxSource = `${JSON.stringify(uxSpec, null, 2)}\n`;
  fs.writeFileSync(input, JSON.stringify(ui));
  fs.writeFileSync(uxPath, uxSource);
  fs.writeFileSync(designPath, JSON.stringify(designLanguage()));
  fs.writeFileSync(productDescriptionPath, productDescriptionSource);
  const subject = createUxReviewSubject({
    uxSpec,
    uxSource,
    uxArtifactPath: uxPath,
    productDescriptionSource,
    productDescriptionPath,
    sourceRoot: directory,
    scopeRefs: [uxSpec.id],
  });
  fs.writeFileSync(uxReviewPath, JSON.stringify({
    schemaVersion: '0.2',
    subject,
    verdict: 'pass',
    summary: 'The accepted interaction architecture is coherent enough for bounded UI composition.',
    coverage: UX_REVIEW_CRITERIA.map(criterion => ({
      criterion,
      result: 'pass',
      evidenceRefs: [uxSpec.id],
      note: `The ${criterion} criterion was assessed against the exact persisted UX artifact.`,
    })),
    findings: [],
    researchChecks: [],
    limits: ['This fixture represents an independent semantic review rather than usability testing.'],
  }));
  return {input, uxPath, designPath, uxReviewPath, productDescriptionPath};
}

function write(paths, output, options = {}) {
  return writeUiSpec(paths.input, output, paths.uxPath, paths.designPath, {
    uxReviewPath: paths.uxReviewPath,
    productDescriptionPath: paths.productDescriptionPath,
    sourceRoot: path.dirname(paths.uxPath),
    ...options,
  });
}

test('validates and canonically persists the executable composition fixture', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-composition-'));
  const paths = writeInputs(directory);
  const output = uiOutput(directory);
  const result = write(paths, output);
  const first = fs.readFileSync(output, 'utf8');
  paths.input = output;
  const second = write(paths, output);
  assert.equal(fs.readFileSync(output, 'utf8'), first);
  assert.deepEqual(result, {...second, output: path.resolve(output)});
  assert.equal(result.sceneCount, 1);
});

test('rejects obsolete and future design-language dependencies before UI output', () => {
  for (const schemaVersion of ['0.13', '0.15']) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-design-language-version-'));
    const paths = writeInputs(directory);
    const invalidDesign = designLanguage();
    invalidDesign.schemaVersion = schemaVersion;
    fs.writeFileSync(paths.designPath, JSON.stringify(invalidDesign));
    const output = uiOutput(directory);
    assert.throws(() => write(paths, output), /Unsupported design-language schemaVersion; expected 0\.14/);
    assert.equal(fs.existsSync(output), false);
  }
});

test('root-binds UI output and refuses linked or foreign targets without mutation', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-output-boundary-'));
  const paths = writeInputs(directory);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-output-outside-'));
  const externalOutput = path.join(outside, 'ui-spec.json');
  assert.throws(() => write(paths, externalOutput), /must stay within the product-document root/);
  assert.equal(fs.existsSync(externalOutput), false);
  const alternateOutput = path.join(directory, 'alternate-ui.json');
  assert.throws(() => write(paths, alternateOutput), /must use canonical target ui\/ui-spec\.json/);
  assert.equal(fs.existsSync(alternateOutput), false);

  const foreignOutput = uiOutput(directory);
  fs.mkdirSync(path.dirname(foreignOutput), {recursive: true});
  const foreignSpec = proposal();
  foreignSpec.id = 'different-ui-document';
  const foreign = `${JSON.stringify(foreignSpec, null, 2)}\n`;
  fs.writeFileSync(foreignOutput, foreign);
  assert.throws(() => write(paths, foreignOutput), /UI artifact identity different-ui-document does not match incoming identity field-journal-ui/);
  assert.equal(fs.readFileSync(foreignOutput, 'utf8'), foreign);

  const linkedDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-output-linked-root-'));
  const linkedPaths = writeInputs(linkedDirectory);
  const linkedOutside = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-output-linked-'));
  fs.symlinkSync(linkedOutside, path.join(linkedDirectory, 'ui'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => write(linkedPaths, uiOutput(linkedDirectory)), /Refusing linked UI artifact/);
  assert.deepEqual(fs.readdirSync(linkedOutside), []);
});

test('rejects a dangling UX component reference', () => {
  const ui = proposal();
  ui.scenes[0].root.children[1].uxRef = 'missing-component';
  assert.throws(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}), /missing id missing-component/);
});

test('rejects a mismatched template version and unsupported state', () => {
  const ui = proposal();
  const node = ui.scenes[0].root.children[0];
  node.templateRef.version = '2';
  assert.throws(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}), /does not match template heading/);
  node.templateRef.version = '1';
  node.state = 'focused';
  assert.throws(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}), /not supported by template heading/);
});

test('requires placeholder scenes to disclose partial completeness', () => {
  const ui = proposal();
  ui.scenes[0].completeness = 'complete';
  assert.throws(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}), /contains placeholders and must be partial/);
});

test('requires exact UX interaction bindings and permits explicit partial deferral', () => {
  const wrongAction = proposal();
  wrongAction.scenes[0].root.children[1].actionRef = 'save-record';
  assert.throws(() => validateUiSpec(wrongAction, {uxSpec: ux(), designLanguage: designLanguage()}), /must match UX affordance/);

  const duplicate = proposal();
  const copy = structuredClone(duplicate.scenes[0].root.children[1]);
  copy.id = 'duplicate-command';
  duplicate.scenes[0].root.children.push(copy);
  duplicate.scenes[0].root.layout.rows.push({unit: 'content'});
  copy.placement.row = 3;
  assert.throws(() => validateUiSpec(duplicate, {uxSpec: ux(), designLanguage: designLanguage()}), /more than once/);

  const deferred = proposal();
  deferred.scenes[0].root.children.pop();
  deferred.scenes[0].root.layout.rows.pop();
  deferred.scenes[0].deferredInteractionNodeRefs = ['open-record-affordance'];
  assert.doesNotThrow(() => validateUiSpec(deferred, {uxSpec: ux(), designLanguage: designLanguage()}));
  deferred.scenes[0].completeness = 'complete';
  deferred.scenes[0].unspecifiedRequirementRefs = [];
  deferred.unspecifiedRequirements = [];
  assert.throws(() => validateUiSpec(deferred, {uxSpec: ux(), designLanguage: designLanguage()}), /cannot defer UX affordances/);
});

test('routes behavior changes upstream without authorizing unbound UI behavior', () => {
  const ui = proposal();
  ui.uxChangeRequests = [{
    id: 'request-additional-action', status: 'open', sceneRefs: ['records-viewing'],
    interactionFrameRefs: ['records-viewing'], actionRefs: [],
    requestedChange: 'Consider an additional collection action.',
    rationale: 'The need must be decided in UX before UI can bind it.'
  }];
  assert.doesNotThrow(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}));
  ui.scenes[0].root.children[1].actionRef = 'invented-action';
  assert.throws(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}), /must match UX affordance/);
});

test('requires semantic HTML template contracts and paired HTML render variants', () => {
  const ui = proposal();
  delete ui.templates[0].html;
  assert.throws(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}), /template heading.html must be an object/);

  const wrongOutput = proposal();
  wrongOutput.renderRequests[0].output = 'comps/editor-ready.svg';
  assert.throws(() => validateUiSpec(wrongOutput, {uxSpec: ux(), designLanguage: designLanguage()}), /must end with .html/);

  const missingVariant = proposal();
  missingVariant.renderRequests.pop();
  assert.throws(() => validateUiSpec(missingVariant, {uxSpec: ux(), designLanguage: designLanguage()}), /needs one clean and one annotated render request/);
});

test('rejects a child placed outside its declared grid', () => {
  const ui = proposal();
  ui.scenes[0].root.children[0].placement.row = 4;
  assert.throws(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}), /exceeds the declared grid rows/);
});

test('rejects undeclared schema 0.2 properties at the root and nested contract shapes', () => {
  const cases = [
    ui => { ui.unreviewedMetadata = true; },
    ui => { ui.assessment.unreviewedMetadata = true; },
    ui => { ui.templates[0].html.unreviewedMetadata = true; },
    ui => { ui.scenes[0].viewport.unreviewedMetadata = true; },
    ui => { ui.scenes[0].root.layout.unreviewedMetadata = true; },
    ui => { ui.scenes[0].root.children[0].templateRef.unreviewedMetadata = true; },
    ui => { ui.renderRequests[0].unreviewedMetadata = true; },
  ];

  for (const mutate of cases) {
    const ui = proposal();
    mutate(ui);
    assert.throws(
      () => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}),
      /unsupported field unreviewedMetadata/,
    );
  }
});

test('requires a current passing in-scope UX review receipt before persistence', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-composition-review-gate-'));
  const paths = writeInputs(directory);
  const output = uiOutput(directory);

  assert.throws(
    () => writeUiSpec(paths.input, output, paths.uxPath, paths.designPath),
    /UX review receipt and authoritative product description are required/,
  );
  assert.throws(
    () => writeUiSpec(paths.input, output, paths.uxPath, paths.designPath, {
      uxReviewPath: paths.uxReviewPath,
      productDescriptionPath: paths.productDescriptionPath,
    }),
    /source root/,
  );

  const alternateProductPath = path.join(directory, 'alternate-product-description.md');
  fs.writeFileSync(alternateProductPath, productDescriptionSource);
  assert.throws(
    () => write(paths, output, {productDescriptionPath: alternateProductPath}),
    /must identify the file declared by UX source product/,
  );

  const staleUx = JSON.parse(fs.readFileSync(paths.uxReviewPath, 'utf8'));
  staleUx.subject.uxArtifact.sha256 = '0'.repeat(64);
  fs.writeFileSync(paths.uxReviewPath, JSON.stringify(staleUx));
  assert.throws(() => write(paths, output), /stale for the supplied UX artifact/);

  const uxSpec = JSON.parse(fs.readFileSync(paths.uxPath, 'utf8'));
  const uxSource = fs.readFileSync(paths.uxPath, 'utf8');
  const productSource = fs.readFileSync(paths.productDescriptionPath, 'utf8');
  const bindingPaths = {
    uxArtifactPath: paths.uxPath,
    productDescriptionPath: paths.productDescriptionPath,
    sourceRoot: directory,
  };
  const receipt = staleUx;
  receipt.subject = createUxReviewSubject({uxSpec, uxSource, productDescriptionSource: productSource, ...bindingPaths, scopeRefs: [uxSpec.id]});
  receipt.verdict = 'revise';
  fs.writeFileSync(paths.uxReviewPath, JSON.stringify(receipt));
  assert.throws(() => write(paths, output), /verdict must be pass/);

  receipt.verdict = 'pass';
  receipt.subject = createUxReviewSubject({
    uxSpec,
    uxSource,
    productDescriptionSource: productSource,
    ...bindingPaths,
    scopeRefs: ['application-navigation'],
  });
  fs.writeFileSync(paths.uxReviewPath, JSON.stringify(receipt));
  assert.throws(() => write(paths, output), /scope does not cover UI dependency/);

  receipt.subject = createUxReviewSubject({uxSpec, uxSource, productDescriptionSource: productSource, ...bindingPaths, scopeRefs: [uxSpec.id]});
  fs.writeFileSync(paths.uxReviewPath, JSON.stringify(receipt));
  fs.appendFileSync(paths.productDescriptionPath, '\nA material product change.\n');
  assert.throws(() => write(paths, output), /stale for the supplied product description/);
  assert.equal(fs.existsSync(output), false);
});

test('anchors approved image assets, verifies content, and rejects hostile paths', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-composition-images-'));
  const images = path.join(directory, 'images');
  fs.mkdirSync(images);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  fs.writeFileSync(path.join(images, 'pixel.png'), png);
  const ui = proposal();
  ui.assets.push({
    id: 'approved-image',
    kind: 'image',
    status: 'accepted',
    path: 'images/pixel.png',
    mimeType: 'image/png',
    widthPx: 1,
    heightPx: 1,
    sha256: createHash('sha256').update(png).digest('hex'),
  });
  assert.throws(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}), /explicit asset root/);
  assert.throws(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage(), assetRoot: directory}), /explicit source root/);
  assert.doesNotThrow(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage(), assetRoot: directory, sourceRoot: directory}));

  const traversal = structuredClone(ui);
  traversal.assets[0].path = '../outside.png';
  assert.throws(() => validateUiSpec(traversal, {uxSpec: ux(), designLanguage: designLanguage(), assetRoot: directory, sourceRoot: directory}), /stay below its artifact root/);

  const wrongMime = structuredClone(ui);
  wrongMime.assets[0].mimeType = 'image/jpeg';
  assert.throws(() => validateUiSpec(wrongMime, {uxSpec: ux(), designLanguage: designLanguage(), assetRoot: directory, sourceRoot: directory}), /bytes do not match declared MIME type/);

  const wrongHash = structuredClone(ui);
  wrongHash.assets[0].sha256 = '0'.repeat(64);
  assert.throws(() => validateUiSpec(wrongHash, {uxSpec: ux(), designLanguage: designLanguage(), assetRoot: directory, sourceRoot: directory}), /does not match the approved image bytes/);

  const activeSvgBytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image href="file:///private/data.png"/></svg>');
  fs.writeFileSync(path.join(images, 'active.svg'), activeSvgBytes);
  const activeSvg = structuredClone(ui);
  activeSvg.assets[0] = {
    ...activeSvg.assets[0],
    path: 'images/active.svg',
    mimeType: 'image/svg+xml',
    sha256: createHash('sha256').update(activeSvgBytes).digest('hex'),
  };
  assert.throws(() => validateUiSpec(activeSvg, {uxSpec: ux(), designLanguage: designLanguage(), assetRoot: directory, sourceRoot: directory}), /active or off-site content/);

  const activeSvgPayloads = [
    '<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="href" values="#safe;file:///private/data.png"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><set attributeName="href" to="file:///private/data.png"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(\\66 ile:///private/data.png)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="u\\72l(file:///private/data.png)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><style>.x{fill:url(\\66 ile:///private/data.png)}</style></svg>',
  ];
  for (const [index, payload] of activeSvgPayloads.entries()) {
    const bytes = Buffer.from(payload);
    const filename = `active-bypass-${index}.svg`;
    fs.writeFileSync(path.join(images, filename), bytes);
    const candidate = structuredClone(ui);
    candidate.assets[0] = {
      ...candidate.assets[0], path: `images/${filename}`, mimeType: 'image/svg+xml',
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
    assert.throws(
      () => validateUiSpec(candidate, {uxSpec: ux(), designLanguage: designLanguage(), assetRoot: directory, sourceRoot: directory}),
      /active or off-site content/,
      payload,
    );
  }

  const oversizedPath = path.join(images, 'oversized.png');
  fs.writeFileSync(oversizedPath, png);
  fs.truncateSync(oversizedPath, 20 * 1024 * 1024 + 1);
  const oversized = structuredClone(ui);
  oversized.assets[0].path = 'images/oversized.png';
  assert.throws(() => validateUiSpec(oversized, {uxSpec: ux(), designLanguage: designLanguage(), assetRoot: directory, sourceRoot: directory}), /between 1 byte and/);

  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-composition-image-outside-'));
  fs.writeFileSync(path.join(outside, 'pixel.png'), png);
  fs.symlinkSync(outside, path.join(directory, 'linked-images'), 'junction');
  const linked = structuredClone(ui);
  linked.assets[0].path = 'linked-images/pixel.png';
  assert.throws(() => validateUiSpec(linked, {uxSpec: ux(), designLanguage: designLanguage(), assetRoot: directory, sourceRoot: directory}), /escapes its asset root through a linked path/);
});

test('binds persisted UI asset roots below the authoritative source root', () => {
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-asset-authority-'));
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-proposal-staging-'));
  let paths = writeInputs(sourceRoot);
  paths.input = path.join(staging, 'asset-free-proposal.json');
  fs.writeFileSync(paths.input, JSON.stringify(proposal()));
  assert.doesNotThrow(() => write(paths, uiOutput(sourceRoot)));

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const imageProposal = proposal();
  imageProposal.assets.push({
    id: 'approved-image', kind: 'image', status: 'accepted', path: 'images/pixel.png', mimeType: 'image/png',
    widthPx: 1, heightPx: 1, sha256: createHash('sha256').update(png).digest('hex'),
  });
  fs.mkdirSync(path.join(sourceRoot, 'images'));
  fs.writeFileSync(path.join(sourceRoot, 'images', 'pixel.png'), png);
  paths = writeInputs(sourceRoot, imageProposal);
  paths.input = path.join(staging, 'image-proposal.json');
  fs.writeFileSync(paths.input, JSON.stringify(imageProposal));

  assert.throws(() => write(paths, uiOutput(sourceRoot)), /require an explicit assetRoot/);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-asset-outside-'));
  assert.throws(
    () => write(paths, uiOutput(sourceRoot), {assetRoot: outside}),
    /assetRoot must stay within sourceRoot/,
  );
  assert.throws(
    () => write(paths, uiOutput(sourceRoot), {assetRoot: path.parse(sourceRoot).root, sourceRoot: path.parse(sourceRoot).root}),
    /filesystem root/,
  );
  const linkedOutside = path.join(sourceRoot, 'linked-assets');
  fs.symlinkSync(outside, linkedOutside, 'junction');
  assert.throws(
    () => write(paths, uiOutput(sourceRoot), {assetRoot: linkedOutside}),
    /assetRoot must stay within sourceRoot/,
  );
  assert.doesNotThrow(() => write(paths, uiOutput(sourceRoot), {assetRoot: sourceRoot}));
});

test('rejects an invalid revision without replacing a prior valid artifact', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-composition-safe-'));
  const paths = writeInputs(directory);
  const output = uiOutput(directory);
  write(paths, output);
  const valid = fs.readFileSync(output, 'utf8');
  const invalid = proposal();
  invalid.uxSource.revision = 'stale';
  fs.writeFileSync(paths.input, JSON.stringify(invalid));
  assert.throws(() => write(paths, output), /does not match the supplied ux document/);
  assert.equal(fs.readFileSync(output, 'utf8'), valid);
});

test('requires explicit user authority to lock or revise a surface composition', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-composition-lock-'));
  const paths = writeInputs(directory);
  const output = uiOutput(directory);
  write(paths, output);
  const locked = proposal();
  locked.status = 'locked';
  fs.writeFileSync(paths.input, JSON.stringify(locked));
  assert.throws(() => write(paths, output), /explicit current user lock request/);
  write(paths, output, {lockReason: 'User requested this surface composition be locked.'});
  locked.assessment.description = 'A quiet agent-authored revision.';
  fs.writeFileSync(paths.input, JSON.stringify(locked));
  assert.throws(() => write(paths, output), /Locked design \$ cannot change/);
});

test('validates transient focus, cancellation, action grouping, and content-driven height', () => {
  const ui = proposal();
  const uxSpec = ux();
  uxSpec.surfaces[0].kind = 'dialog';
  ui.scenes[0].transientBehavior = {
    presentation: 'dialog',
    focusOrder: ['record-list-instance'],
    initialFocusRef: 'record-list-instance',
    initialFocusRationale: 'It is the first task control in this synthetic dialog.',
    returnFocusRef: 'open-editor-dialog',
    actionGroupRef: 'records-layout',
    cancellation: {
      escape: 'dismiss',
      outside: 'ignore',
      nodeRef: 'record-list-instance',
      interactionNodeRef: 'open-record-affordance',
      actionRef: 'open-record',
      result: 'Dismiss without changing the item.'
    },
    height: {mode: 'content', maxPx: 560}
  };
  assert.doesNotThrow(() => validateUiSpec(ui, {uxSpec, designLanguage: designLanguage()}));
  ui.scenes[0].transientBehavior.initialFocusRef = 'missing-node';
  assert.throws(() => validateUiSpec(ui, {uxSpec, designLanguage: designLanguage()}), /must be the first focus-order node/);
});

test('accepts a transient interaction frame owned by a persistent workspace surface', () => {
  const ui = proposal();
  const uxSpec = ux();
  uxSpec.surfaces[0].kind = 'workspace';
  const parentFrame = structuredClone(uxSpec.interactionFrames[0]);
  parentFrame.id = 'records-parent';
  parentFrame.name = 'Records parent';
  parentFrame.kind = 'surface';
  uxSpec.interactionFrames.push(parentFrame);
  uxSpec.surfaces[0].interactionFrameRefs.push(parentFrame.id);
  uxSpec.interactionFrames[0].kind = 'dialog';
  uxSpec.interactionFrames[0].parentFrameRef = parentFrame.id;
  uxSpec.interactionFrames[0].triggerActionRef = 'open-record';
  uxSpec.interactionFrames[0].focus.returnActionRef = 'open-record';
  ui.scenes[0].transientBehavior = {
    presentation: 'dialog',
    focusOrder: ['record-list-instance'],
    initialFocusRef: 'record-list-instance',
    initialFocusRationale: 'It is the first task control in this synthetic dialog.',
    returnFocusRef: 'open-editor-dialog',
    actionGroupRef: 'records-layout',
    cancellation: {
      escape: 'dismiss',
      outside: 'ignore',
      nodeRef: 'record-list-instance',
      interactionNodeRef: 'open-record-affordance',
      actionRef: 'open-record',
      result: 'Dismiss without changing the item.'
    },
    height: {mode: 'content', maxPx: 560}
  };
  assert.doesNotThrow(() => validateUiSpec(ui, {uxSpec, designLanguage: designLanguage()}));
});

test('validates one bounded behavioral choice group without duplicating its UX affordance', () => {
  const ui = proposal();
  const template = ui.templates[1];
  template.id = 'workspace-choice';
  template.name = 'Workspace choice';
  template.kind = 'choice-group';
  template.status = 'accepted';
  template.availability = 'available';
  template.html = {renderer: 'choice-group', element: 'nav', className: 'ui-choice-group'};
  template.parameters = [
    {id: 'label', required: true},
    {id: 'presentation', required: true},
    {id: 'options', required: true},
    {id: 'selectedId', required: false},
    {id: 'disabled', required: false},
  ];
  template.sizing = {width: 'fill', height: 'content'};
  const node = ui.scenes[0].root.children[1];
  node.templateRef = {id: template.id, version: template.version};
  node.parameters = {
    label: 'Workspace',
    presentation: 'tabs',
    options: [{id: 'library', label: 'Library'}, {id: 'editor', label: 'Editor'}],
    selectedId: 'editor',
  };
  delete node.placeholder;
  ui.scenes[0].completeness = 'complete';
  ui.scenes[0].unspecifiedRequirementRefs = [];
  ui.unspecifiedRequirements = [];
  assert.doesNotThrow(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}));
  node.parameters.selectedId = 'missing';
  assert.throws(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}), /selectedId references a missing option/);
});

test('accepts ordered headings only for list choice groups', () => {
  const ui = proposal();
  const template = ui.templates[1];
  template.id = 'content-choice';
  template.name = 'Content choice';
  template.kind = 'choice-group';
  template.status = 'accepted';
  template.availability = 'available';
  template.html = {renderer: 'choice-group', element: 'div', className: 'ui-choice-group'};
  template.parameters = [
    {id: 'label', required: true}, {id: 'presentation', required: true}, {id: 'options', required: true},
    {id: 'selectedId', required: false}, {id: 'disabled', required: false},
  ];
  template.sizing = {width: 'fill', height: 'content'};
  const node = ui.scenes[0].root.children[1];
  node.templateRef = {id: template.id, version: template.version};
  node.parameters = {
    label: 'Content', presentation: 'list',
    options: [
      {id: 'source-a', label: 'Coast.mov', group: 'Video Files'},
      {id: 'clip-a', label: 'Opening shot', group: 'Clips'},
    ],
  };
  delete node.placeholder;
  ui.scenes[0].completeness = 'complete';
  ui.scenes[0].unspecifiedRequirementRefs = [];
  ui.unspecifiedRequirements = [];
  assert.doesNotThrow(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}));
  node.parameters.presentation = 'tabs';
  assert.throws(() => validateUiSpec(ui, {uxSpec: ux(), designLanguage: designLanguage()}), /supported only for list presentation/);
});
