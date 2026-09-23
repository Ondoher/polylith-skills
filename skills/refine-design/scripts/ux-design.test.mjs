import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {renderPrd, validateUxSpec, writeUxArtifacts} from './ux-design.mjs';
import {componentDesignTarget, ROOT_BOUND_TARGETS, writeOwnedJsonArtifact} from './root-bound-artifact.mjs';
import {createPatternResearchRecord, createUxTestSpec} from './ux-test-fixture.mjs';

function temporaryDirectory(prefix = 'ux-design-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function byId(records, id) {
  return records.find(record => record.id === id);
}

test('validates, renders, and deterministically writes one complete interaction architecture', () => {
  const directory = temporaryDirectory();
  const input = path.join(directory, 'proposal.json');
  fs.writeFileSync(input, JSON.stringify(createUxTestSpec()));

  const first = writeUxArtifacts(input, directory);
  const source = fs.readFileSync(first.sourcePath, 'utf8');
  const saved = JSON.parse(source);
  const prd = renderPrd(saved);
  const second = writeUxArtifacts(first.sourcePath, directory);

  assert.equal(saved.schemaVersion, '0.2');
  assert.equal(fs.readFileSync(second.sourcePath, 'utf8'), source);
  assert.equal(renderPrd(JSON.parse(fs.readFileSync(second.sourcePath, 'utf8'))), prd);
  assert.match(prd, /## Application Organization/);
  assert.match(prd, /## Interaction Actions/);
  assert.match(prd, /### Retry save/);
  assert.match(prd, /## Interaction Frames/);
  assert.match(prd, /### Record save failed/);
  assert.match(prd, /## Interaction Pruning/);
});

test('rejects traversal and absolute root-bound targets before creating output', () => {
  const directory = temporaryDirectory('ux-design-target-boundary-');
  const productDocumentRoot = path.join(directory, 'product-docs');
  const outside = path.join(directory, 'outside.json');
  const value = createUxTestSpec();
  const write = relativeTarget => writeOwnedJsonArtifact({
    productDocumentRoot,
    relativeTarget,
    value,
    validateExisting: validateUxSpec,
    label: 'UX artifact',
  });

  assert.throws(() => write('../outside.json'), /must not traverse outside/);
  assert.throws(() => write(outside), /must be a portable path relative/);
  assert.equal(fs.existsSync(productDocumentRoot), false);
  assert.equal(fs.existsSync(outside), false);
});

test('provides fixed portable targets for downstream product-design artifacts', () => {
  assert.equal(ROOT_BOUND_TARGETS.ui, 'ui/ui-spec.json');
  assert.equal(componentDesignTarget('record-list-component'), 'ui/components/record-list-component.json');
  assert.throws(() => componentDesignTarget('../outside'), /lowercase hyphenated stable ID/);
  assert.throws(() => componentDesignTarget('C:outside'), /lowercase hyphenated stable ID/);
});

test('rejects a linked UX parent without writing through it', () => {
  const directory = temporaryDirectory('ux-design-linked-parent-');
  const productDocumentRoot = path.join(directory, 'product-docs');
  const outside = path.join(directory, 'outside');
  fs.mkdirSync(productDocumentRoot);
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(productDocumentRoot, 'ux'), process.platform === 'win32' ? 'junction' : 'dir');
  const input = path.join(directory, 'proposal.json');
  fs.writeFileSync(input, JSON.stringify(createUxTestSpec()));

  assert.throws(() => writeUxArtifacts(input, productDocumentRoot), /Refusing linked UX artifact/);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test('refuses to replace a UX target not owned by the current UX contract', () => {
  const directory = temporaryDirectory('ux-design-owned-target-');
  const productDocumentRoot = path.join(directory, 'product-docs');
  const target = path.join(productDocumentRoot, ...ROOT_BOUND_TARGETS.ux.split('/'));
  fs.mkdirSync(path.dirname(target), {recursive: true});
  const differentProduct = createUxTestSpec();
  differentProduct.id = 'different-product-ux';
  const foreign = `${JSON.stringify(differentProduct, null, 2)}\n`;
  fs.writeFileSync(target, foreign);
  const input = path.join(directory, 'proposal.json');
  fs.writeFileSync(input, JSON.stringify(createUxTestSpec()));

  assert.throws(() => writeUxArtifacts(input, productDocumentRoot), /not owned by the expected artifact contract.*does not match incoming id/);
  assert.equal(fs.readFileSync(target, 'utf8'), foreign);
});

test('preserves the prior owned UX artifact when replacement fails before rename', () => {
  const directory = temporaryDirectory('ux-design-atomic-replacement-');
  const productDocumentRoot = path.join(directory, 'product-docs');
  const input = path.join(directory, 'proposal.json');
  const first = createUxTestSpec();
  fs.writeFileSync(input, JSON.stringify(first));
  const {sourcePath} = writeUxArtifacts(input, productDocumentRoot);
  const priorBytes = fs.readFileSync(sourcePath);
  const replacement = structuredClone(first);
  replacement.revision = '2';

  assert.throws(() => writeOwnedJsonArtifact({
    productDocumentRoot,
    relativeTarget: ROOT_BOUND_TARGETS.ux,
    value: replacement,
    validateExisting: validateUxSpec,
    label: 'UX artifact',
  }, {
    beforeRename() {
      throw new Error('injected pre-rename failure');
    },
  }), /injected pre-rename failure/);
  assert.deepEqual(fs.readFileSync(sourcePath), priorBytes);
  assert.deepEqual(fs.readdirSync(path.dirname(sourcePath)), ['ux-spec.json']);
});

test('rejects schema 0.1 without adding a compatibility path', () => {
  const spec = createUxTestSpec();
  spec.schemaVersion = '0.1';
  assert.throws(() => validateUxSpec(spec), /requires schema 0\.2/);
});

test('requires reciprocal task, step, and action traceability', () => {
  const missingAction = createUxTestSpec();
  missingAction.useCases[0].steps[0].actionRef = 'missing-action';
  assert.throws(() => validateUxSpec(missingAction), /references missing id missing-action/);

  const undeclaredAction = createUxTestSpec();
  undeclaredAction.actions[0].taskRefs = [];
  assert.throws(() => validateUxSpec(undeclaredAction), /taskRefs must not be empty/);

  const oneWayTrace = createUxTestSpec();
  oneWayTrace.useCases[0].actionRefs = ['save-record', 'retry-save'];
  assert.throws(() => validateUxSpec(oneWayTrace), /action open-record task update-record does not list the action/);

  const missingFeatureSurface = createUxTestSpec();
  missingFeatureSurface.features[0].surfaceRefs = [];
  assert.throws(() => validateUxSpec(missingFeatureSurface), /feature record-maintenance omits task surface records-workspace/);

  const missingAreaSurface = createUxTestSpec();
  missingAreaSurface.application.areas[0].surfaceRefs = [];
  assert.throws(() => validateUxSpec(missingAreaSurface), /surface records-workspace is not listed by area records-work/);

  const missingComponentSurface = createUxTestSpec();
  byId(missingComponentSurface.components, 'record-list').surfaceRefs = [];
  assert.throws(() => validateUxSpec(missingComponentSurface), /does not trace back from component\.surfaceRefs/);

  const unrelatedTarget = createUxTestSpec();
  unrelatedTarget.surfaces.push({
    id: 'unrelated-surface',
    name: 'Unrelated surface',
    kind: 'workspace',
    purpose: 'Support a separate activity.',
    areaRef: 'records-work',
    status: 'proposed',
    entry: 'Enter the separate activity.',
    exit: 'Leave the separate activity.',
    focusIntent: 'Begin at its first task item.',
    regions: [],
    componentRefs: [],
    states: ['idle'],
    interactionFrameRefs: [],
    questionRefs: [],
  });
  unrelatedTarget.application.areas[0].surfaceRefs.push('unrelated-surface');
  unrelatedTarget.features[0].surfaceRefs.push('unrelated-surface');
  unrelatedTarget.useCases[0].steps[0].targetRef = 'unrelated-surface';
  assert.throws(() => validateUxSpec(unrelatedTarget), /targetRef does not share a surface with action open-record/);
});

test('rejects duplicate affordances, visible alternate inputs, and duplicate feedback', () => {
  const duplicateAction = createUxTestSpec();
  duplicateAction.interactionFrames[0].regions[0].affordances.push({
    ...structuredClone(duplicateAction.interactionFrames[0].regions[0].affordances[0]),
    id: 'open-record-again',
    order: 2,
  });
  assert.throws(() => validateUxSpec(duplicateAction), /duplicate affordance for action open-record/);

  const visibleAlternate = createUxTestSpec();
  visibleAlternate.interactionFrames[0].regions[0].affordances[0].actionRef = 'open-record-keyboard';
  assert.throws(() => validateUxSpec(visibleAlternate), /cannot expose an alternate input as a visible control/);

  const duplicateFeedback = createUxTestSpec();
  const failedFrame = byId(duplicateFeedback.interactionFrames, 'records-failed');
  failedFrame.regions[0].content.push({
    ...structuredClone(failedFrame.regions[0].content[0]),
    id: 'save-failure-feedback-again',
  });
  assert.throws(() => validateUxSpec(duplicateFeedback), /duplicate feedback save-record:save-failed/);
});

test('keeps alternate inputs equivalent and distinct from the canonical interaction', () => {
  const sameInput = createUxTestSpec();
  byId(sameInput.actions, 'open-record').alternateInputs[0].input = 'pointer';
  assert.throws(() => validateUxSpec(sameInput), /input must differ from the canonical/);

  const differentOutcome = createUxTestSpec();
  byId(differentOutcome.actions, 'open-record').alternateInputs[0].equivalentOutcome = false;
  assert.throws(() => validateUxSpec(differentOutcome), /must be true; a different outcome is a separate action/);
});

test('requires conditional visibility for contextual actions', () => {
  const spec = createUxTestSpec();
  const retry = spec.actions.find(action => action.id === 'retry-save');
  retry.visibility = {mode: 'always', conditions: []};
  assert.throws(() => validateUxSpec(spec), /contextual action needs conditional or on-demand visibility/);
});

test('validates state, frame, surface, and completion transitions by kind', () => {
  const missingState = createUxTestSpec();
  missingState.interactionFrames[0].regions[0].affordances[0].transition.targetState = 'missing';
  assert.throws(() => validateUxSpec(missingState), /targetState references missing state missing/);

  const invalidCompletion = createUxTestSpec();
  invalidCompletion.interactionFrames[1].regions[0].affordances[0].transition = {
    kind: 'completion',
    targetState: 'saved',
  };
  assert.throws(() => validateUxSpec(invalidCompletion), /completion transition cannot have a target/);

  const missingFrame = createUxTestSpec();
  missingFrame.interactionFrames[0].regions[0].affordances[0].transition = {
    kind: 'frame',
    targetRef: 'missing-frame',
  };
  assert.throws(() => validateUxSpec(missingFrame), /references missing id missing-frame/);
});

test('requires resolved actions and transitions in accepted frames', () => {
  const unresolvedAction = createUxTestSpec();
  unresolvedAction.actions[0].status = 'unresolved';
  assert.throws(() => validateUxSpec(unresolvedAction), /resolved use case update-record references unresolved action open-record/);

  const unlistedFrame = createUxTestSpec();
  unlistedFrame.surfaces[0].interactionFrameRefs.pop();
  assert.throws(() => validateUxSpec(unlistedFrame), /is not listed by owning surface/);

  const missingStateFrame = createUxTestSpec();
  missingStateFrame.interactionFrames = missingStateFrame.interactionFrames.filter(frame => frame.id !== 'records-saved');
  missingStateFrame.surfaces[0].interactionFrameRefs = missingStateFrame.surfaces[0].interactionFrameRefs.filter(frameRef => frameRef !== 'records-saved');
  assert.throws(() => validateUxSpec(missingStateFrame), /state saved must have exactly one accepted surface frame/);

  const incompleteFocus = createUxTestSpec();
  byId(incompleteFocus.interactionFrames, 'records-editing').focus.orderRefs = [];
  assert.throws(() => validateUxSpec(incompleteFocus), /focus\.orderRefs must cover the referenced records exactly once/);

  const unresolvedOwner = createUxTestSpec();
  unresolvedOwner.surfaces[0].status = 'unresolved';
  assert.throws(() => validateUxSpec(unresolvedOwner), /cannot be resolved while owning surface records-workspace is unresolved/);

  const selfRecovery = createUxTestSpec();
  byId(selfRecovery.actions, 'save-record').recovery[0].actionRefs = ['save-record'];
  assert.throws(() => validateUxSpec(selfRecovery), /cannot reference its owning action/);
});

test('requires source-checked research only for researched or novel patterns', () => {
  const ordinary = createUxTestSpec();
  assert.doesNotThrow(() => validateUxSpec(ordinary));

  const researched = createUxTestSpec();
  researched.patternResearch.push(createPatternResearchRecord());
  researched.actions.find(action => action.id === 'save-record').patternBasis = {
    kind: 'researched',
    rationale: 'A blocking decision uses the compared dialog pattern.',
    researchRef: 'dialog-pattern-research',
  };
  assert.doesNotThrow(() => validateUxSpec(researched));

  const missingEvidence = createUxTestSpec();
  missingEvidence.actions[0].patternBasis = {
    kind: 'researched',
    rationale: 'This direction needs evidence.',
    researchRef: 'missing-research',
  };
  assert.throws(() => validateUxSpec(missingEvidence), /references missing id missing-research/);

  const pendingEvidence = structuredClone(researched);
  pendingEvidence.patternResearch[0].status = 'proposed';
  pendingEvidence.patternResearch[0].verification = {status: 'pending', notes: ['Parent verification remains pending.']};
  assert.throws(() => validateUxSpec(pendingEvidence), /resolved design requires resolved research evidence/);

  const unsupportedNovelty = structuredClone(researched);
  unsupportedNovelty.actions.find(action => action.id === 'save-record').patternBasis.kind = 'novel';
  assert.throws(() => validateUxSpec(unsupportedNovelty), /novel pattern requires no-suitable-precedent research/);

  const noTradeoff = structuredClone(researched);
  noTradeoff.patternResearch[0].patterns[0].tradeoffs = [];
  assert.throws(() => validateUxSpec(noTradeoff), /tradeoffs must not be empty/);

  const noLimits = structuredClone(researched);
  noLimits.patternResearch[0].limits = [];
  assert.throws(() => validateUxSpec(noLimits), /limits must not be empty/);

  const weakEvidence = structuredClone(researched);
  weakEvidence.patternResearch[0].sources[0].sourceType = 'official-product-doc';
  assert.throws(() => validateUxSpec(weakEvidence), /needs a standard or platform-guidance source, or at least two distinct sources/);
});

test('requires one exact pruning review for every primary task', () => {
  const missingReview = createUxTestSpec();
  missingReview.pruningReview.taskReviews = [];
  assert.throws(() => validateUxSpec(missingReview), /primary task update-record needs a pruning review/);

  const incompleteReview = createUxTestSpec();
  incompleteReview.pruningReview.taskReviews[0].reviewedActionRefs.pop();
  assert.throws(() => validateUxSpec(incompleteReview), /must cover the referenced records exactly once/);

  const changedPath = createUxTestSpec();
  changedPath.pruningReview.taskReviews[0].canonicalStepRefs.reverse();
  assert.throws(() => validateUxSpec(changedPath), /must match the canonical order exactly/);

  const missingDecision = createUxTestSpec();
  missingDecision.pruningReview.taskReviews[0].decisions.pop();
  assert.throws(() => validateUxSpec(missingDecision), /decisions\[\]\.actionRefs must cover the referenced records exactly once/);

  const unresolvedTopReview = createUxTestSpec();
  unresolvedTopReview.pruningReview.status = 'proposed';
  assert.throws(() => validateUxSpec(unresolvedTopReview), /resolved primary tasks require a resolved pruningReview/);

  const removedAcceptedAction = createUxTestSpec();
  removedAcceptedAction.pruningReview.taskReviews[0].decisions[0].disposition = 'remove';
  assert.throws(() => validateUxSpec(removedAcceptedAction), /cannot remove actions that remain in the accepted action catalog/);
});

test('rejects geometry fields, duplicate state content, and unexplained technical information', () => {
  const geometry = createUxTestSpec();
  geometry.surfaces[0].width = 1200;
  assert.throws(() => validateUxSpec(geometry), /surface records-workspace has unsupported field width/);

  const regionless = createUxTestSpec();
  regionless.surfaces[0].regions = [];
  assert.throws(() => validateUxSpec(regionless), /needs at least one functional region/);

  const duplicateState = createUxTestSpec();
  const viewing = byId(duplicateState.interactionFrames, 'records-viewing');
  viewing.regions[0].content.push({...structuredClone(viewing.regions[0].content[0]), id: 'collection-context-again'});
  assert.throws(() => validateUxSpec(duplicateState), /contains duplicate semantic content/);

  const technical = createUxTestSpec();
  byId(technical.interactionFrames, 'records-viewing').regions[0].content[0].kind = 'technical-information';
  assert.throws(() => validateUxSpec(technical), /technicalExplanation must be non-empty text/);

  technical.interactionFrames[0].regions[0].content[0].technicalExplanation = 'Explain the system detail in terms needed to complete the task.';
  assert.doesNotThrow(() => validateUxSpec(technical));
});

test('renders only safe repository-relative supporting-document links', () => {
  const safe = createUxTestSpec();
  safe.supportingDocuments = [{
    label: 'Design language',
    path: 'design-language/index.html#components',
    description: 'Review the shared visual language.',
  }];
  assert.doesNotThrow(() => validateUxSpec(safe));
  assert.match(renderPrd(safe), /\[Design language\]\(design-language\/index\.html#components\)/);

  const authoredMarkdown = structuredClone(safe);
  authoredMarkdown.supportingDocuments[0].label = 'Design [language](https://example.com)';
  authoredMarkdown.supportingDocuments[0].description = 'Read *before* [external](https://example.com).';
  const markdown = renderPrd(authoredMarkdown);
  assert.match(markdown, /Design \\\[language\\\]\\\(https:\/\/example\\\.com\\\)/);
  assert.doesNotMatch(markdown, /\[external\]\(https:\/\/example\.com\)/);

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
  for (const hostilePath of hostilePaths) {
    const candidate = structuredClone(safe);
    candidate.supportingDocuments[0].path = hostilePath;
    assert.throws(() => renderPrd(candidate), /repository-relative|encoded path text|traverse outside/);
  }
});

test('rejects credentials, secrets, and private local paths in durable research records', () => {
  const withResearch = () => {
    const spec = createUxTestSpec();
    spec.patternResearch.push(createPatternResearchRecord());
    spec.actions.find(action => action.id === 'save-record').patternBasis = {
      kind: 'researched',
      rationale: 'A blocking decision uses the compared dialog pattern.',
      researchRef: 'dialog-pattern-research',
    };
    return spec;
  };

  const credentialUrl = withResearch();
  credentialUrl.patternResearch[0].sources[0].sourceUrl = 'https://person:secret@example.com/guidance';
  assert.throws(() => validateUxSpec(credentialUrl), /URL credentials/);

  const secretQuery = withResearch();
  secretQuery.patternResearch[0].searchQueries[0] = 'interaction guidance api_key=private-value';
  assert.throws(() => validateUxSpec(secretQuery), /credentials or secrets/);

  const privatePath = withResearch();
  privatePath.patternResearch[0].limits[0] = 'Compared with C:\\Users\\person\\private-notes.md.';
  assert.throws(() => validateUxSpec(privatePath), /private local path/);

  const encodedPath = withResearch();
  encodedPath.patternResearch[0].limits[0] = 'Compared with %252Fhome%252Fperson%252Fprivate-notes.md.';
  assert.throws(() => validateUxSpec(encodedPath), /private local path/);

  const bearer = withResearch();
  bearer.patternResearch[0].searchQueries[0] = 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.private.signature';
  assert.throws(() => validateUxSpec(bearer), /credentials or secrets/);

  for (const sourceUrl of [
    'https://127.0.0.1/guidance',
    'https://169.254.169.254/latest/meta-data/',
    'https://intranet/guidance',
    'https://service.internal/guidance',
    'https://example.com/guidance?token=private-value',
  ]) {
    const candidate = withResearch();
    candidate.patternResearch[0].sources[0].sourceUrl = sourceUrl;
    assert.throws(() => validateUxSpec(candidate), /public HTTPS host|credential query parameters|credentials or secrets/);
  }

  const passwordDesignResearch = withResearch();
  passwordDesignResearch.patternResearch[0].searchQueries[0] = 'Password = minimum 12 characters interaction guidance';
  passwordDesignResearch.patternResearch[0].limits[0] = 'The research compares password: required and optional field treatments.';
  assert.doesNotThrow(() => validateUxSpec(passwordDesignResearch));
});

test('preserves the prior valid artifact when a replacement is invalid', () => {
  const directory = temporaryDirectory('ux-design-preservation-');
  const input = path.join(directory, 'proposal.json');
  fs.writeFileSync(input, JSON.stringify(createUxTestSpec()));
  const result = writeUxArtifacts(input, directory);
  const before = fs.readFileSync(result.sourcePath, 'utf8');

  const invalid = createUxTestSpec();
  invalid.interactionFrames[0].regions[0].affordances[0].actionRef = 'missing-action';
  fs.writeFileSync(input, JSON.stringify(invalid));

  assert.throws(() => writeUxArtifacts(input, directory), /references missing id missing-action/);
  assert.equal(fs.readFileSync(result.sourcePath, 'utf8'), before);
});

test('protects nested locked interaction records', () => {
  const directory = temporaryDirectory('ux-design-lock-');
  const input = path.join(directory, 'proposal.json');
  const spec = createUxTestSpec();
  fs.writeFileSync(input, JSON.stringify(spec));
  writeUxArtifacts(input, directory);

  spec.actions[0].status = 'locked';
  fs.writeFileSync(input, JSON.stringify(spec));
  assert.throws(() => writeUxArtifacts(input, directory), /explicit current user lock request/);
  writeUxArtifacts(input, directory, {lockReason: 'User requested the open-record interaction be locked.'});

  spec.actions[0].purpose = 'Quietly revised purpose.';
  fs.writeFileSync(input, JSON.stringify(spec));
  assert.throws(() => writeUxArtifacts(input, directory), /Locked design/);
});

test('renders unresolved recovery without promoting it', () => {
  const spec = createUxTestSpec();
  spec.openQuestions.push({
    id: 'recovery-choice',
    question: 'Which recovery choices are available when retry also fails?',
    owner: 'Product owner with UX guidance',
    why: 'The visible recovery path remains incomplete.',
    affects: ['update-record.alternatives'],
    status: 'open',
  });
  spec.useCases[0].questionRefs.push('recovery-choice');
  spec.useCases[0].alternatives[0].status = 'unresolved';
  spec.useCases[0].alternatives[0].recovery = 'Further recovery remains undefined by recovery-choice.';

  const prd = renderPrd(spec);
  assert.match(prd, /Further recovery remains undefined by recovery-choice\. \(unresolved\)/);
  assert.match(prd, /recovery-choice: Which recovery choices are available when retry also fails\?/);
});

test('records honest assessment provenance', () => {
  const fallback = createUxTestSpec();
  assert.doesNotThrow(() => validateUxSpec(fallback));
  fallback.assessment.kind = 'ux-planner';
  assert.throws(() => validateUxSpec(fallback), /assessment.kind is unsupported/);
});
