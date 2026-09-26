import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {renderPrd, validateUxSpec} from './ux-design.mjs';
import {renderSurfaceInteractionWireframes} from '../../generate-prd/scripts/ux-interaction-wireframe.mjs';
import {affectedUseCases, buildUseCaseHandoff} from './composable-handoff.mjs';
import {loadCurrentProduct, persistProductModel} from './product-model.mjs';
import {compareInteractionArchitectures} from './refinement-impact.mjs';

const digest = '0'.repeat(64);

export function gardenUx() {
  return {
    schemaVersion: '0.3', id: 'garden-log-ux', title: 'Garden log UX', revision: '1',
    status: 'accepted',
    assessment: {kind: 'parent-assessment', description: 'Synthetic positive contract example.'},
    sources: [{id: 'brief', path: 'product-description.md', revision: '1', kind: 'human-owned-product-description'}],
    product: {name: 'Garden log', overview: 'Record an observation.', users: ['A gardener']},
    supportingDocuments: [],
    application: {
      summary: 'One workspace records observations.',
      shell: {kind: 'application-window', description: 'One persistent work area.', status: 'accepted',
        navigation: {pattern: 'single workspace', description: 'The entry form remains available.'}, regions: []},
      areas: [{id: 'entries', name: 'Entries', purpose: 'Record observations.', status: 'accepted', surfaceRefs: ['entry-surface']}],
    },
    features: [{id: 'recording', name: 'Recording', purpose: 'Save one entry.', status: 'accepted', sourceRefs: ['brief'],
      surfaceRefs: ['entry-surface'], useCaseRefs: ['record-entry'], questionRefs: []}],
    useCases: [{id: 'record-entry', name: 'Record entry', featureRef: 'recording', goal: 'Remember an observation.',
      taskPriority: 'primary', status: 'accepted', trigger: 'The gardener has an observation.', preconditions: [],
      actionRefs: ['save-entry'], entryNodeRef: 'save-step', outcome: 'The entry is saved.', questionRefs: []}],
    surfaces: [{id: 'entry-surface', name: 'Entry workspace', kind: 'workspace', purpose: 'Enter and save an observation.',
      entry: 'Open the application.', exit: 'Leave after save.', focusIntent: 'Focus the entry.', status: 'accepted',
      areaRef: 'entries', regions: [{id: 'form', name: 'Entry form', purpose: 'Enter the observation.', order: 1, componentRefs: []}],
      componentRefs: [], stateRefs: ['editing'], interactionFrameRefs: ['editing-frame'], questionRefs: []}],
    components: [],
    actions: [{id: 'save-entry', name: 'Save entry', purpose: 'Persist the observation.', status: 'accepted',
      taskRefs: ['record-entry'], outcome: 'The entry is saved.',
      canonicalInteraction: {method: 'activate', input: 'pointer', description: 'Activate Save.'}, alternateInputs: [],
      presentationClass: 'persistent-control', visibility: {mode: 'always', conditions: []},
      persistence: 'persistent', priority: 'primary', applicableStateRefs: ['editing'], feedbackRefs: ['saved-feedback'],
      cancellation: {mode: 'not-applicable', description: 'Saving completes immediately.'}, recoveryRefs: [],
      patternBasis: {kind: 'ordinary', rationale: 'A save action is a common form interaction.'}, questionRefs: []}],
    interactionFrames: [{id: 'editing-frame', name: 'Editing', kind: 'surface', purpose: 'Enter and save an observation.',
      status: 'accepted', surfaceRef: 'entry-surface', stateRef: 'editing', taskRefs: ['record-entry'],
      patternBasis: {kind: 'ordinary', rationale: 'A simple form is familiar.'},
      regions: [{id: 'entry-region', name: 'Entry', kind: 'form', purpose: 'Save the current observation.', order: 1,
        priority: 'primary', sourceRegionRef: 'form', content: [],
        affordances: [{id: 'save-affordance', actionRef: 'save-entry', label: 'Save', status: 'accepted', order: 1,
          interaction: 'canonical', transition: {kind: 'completion'}}]}],
      focus: {entry: 'Focus the entry field.', orderRefs: ['save-affordance']}, questionRefs: []}],
    patternResearch: [],
    pruningReview: {status: 'accepted', summary: 'One action completes the goal.', taskReviews: [{
      id: 'record-entry-review', taskRef: 'record-entry', status: 'accepted', canonicalStepRefs: ['save-step'],
      reviewedActionRefs: ['save-entry'], decisions: [{id: 'retain-save', disposition: 'retain', candidate: 'Save',
        actionRefs: ['save-entry'], rationale: 'Required for the goal.', result: 'Save remains visible.'}],
    }]},
    openQuestions: [],
    productModelBinding: {id: 'garden-log', revision: 1, sha256: digest, materialSha256: digest, recordIndexSha256: digest},
    useCaseRelations: [],
    flowNodes: [{id: 'save-step', kind: 'step', ownerRef: 'ux:use-case:record-entry', status: 'accepted',
      sourceRefs: ['brief'], questionRefs: [], actor: 'Gardener', action: 'Save the observation.',
      actionRef: 'save-entry', response: 'The saved entry is confirmed.'}],
    flowEdges: [],
    states: [{id: 'editing', ownerRef: 'ux:surface:entry-surface', name: 'Editing',
      meaning: 'The observation can be entered.', status: 'accepted', sourceRefs: ['brief']}],
    feedback: [{id: 'saved-feedback', actionRef: 'save-entry', phase: 'success', description: 'Entry saved.',
      persistence: 'transient', status: 'accepted', sourceRefs: ['brief']}],
    recoveryPaths: [],
    productRealizations: [
      {id: 'goal-to-case', productRef: 'product:remember-harvests', uxRef: 'ux:use-case:record-entry',
        relation: 'pursues', status: 'accepted', rationale: 'This goal is fulfilled by recording.'},
      {id: 'requirement-to-action', productRef: 'product:record-dated-harvest', uxRef: 'ux:action:save-entry',
        relation: 'realizes', status: 'accepted', rationale: 'The action saves the entry.'},
      {id: 'retention-to-action', productRef: 'product:retain-harvest-entry', uxRef: 'ux:action:save-entry',
        relation: 'realizes', status: 'accepted', rationale: 'The action persists the entry.'},
    ],
    traceGaps: [{id: 'validation-detail-gap', sourceRef: 'product:reject-empty-entry',
      expectedTargetKind: 'ux:flow-node', reason: 'missing-ux-detail', owner: 'ux',
      explanation: 'The validation interaction has not yet been designed.'}],
  };
}

test('validates and renders a flat, source-bound UX graph', () => {
  const spec = gardenUx();
  assert.equal(validateUxSpec(spec), spec);
  assert.match(renderPrd(spec), /Save the observation/);
  assert.match(renderSurfaceInteractionWireframes(spec, spec.surfaces[0]), /Entry saved/);
  assert.equal(spec.useCases[0].entryNodeRef, 'save-step');
  const independentlySourced = structuredClone(spec);
  independentlySourced.revision = '2';
  independentlySourced.sources[0].path = 'briefs/revised-product-description.md';
  assert.equal(compareInteractionArchitectures(spec, independentlySourced).equivalent, true);
});

test('two use cases invoke one identified shared behavior', () => {
  const ux = gardenUx();
  const second = structuredClone(ux.useCases[0]);
  second.id = 'record-second-entry';
  second.name = 'Record another entry';
  second.taskPriority = 'supporting';
  second.entryNodeRef = 'second-save-step';
  ux.useCases.push(second);
  ux.features[0].useCaseRefs.push(second.id);
  ux.actions[0].taskRefs.push(second.id);
  ux.interactionFrames[0].taskRefs.push(second.id);
  ux.flowNodes.push({id: 'second-save-step', kind: 'step', ownerRef: 'ux:use-case:record-second-entry',
    status: 'accepted', sourceRefs: ['brief'], questionRefs: [], actor: 'Gardener',
    action: 'Save another observation.', actionRef: 'save-entry', response: 'Another entry is saved.'});
  ux.components.push({id: 'entry-guard', name: 'Entry guard', kind: 'shared-interaction',
    purpose: 'Check entries before saving.', status: 'accepted', surfaceRefs: ['entry-surface'],
    questionRefs: [], capabilities: ['Check an entry.'], stateRefs: [],
    behaviorNodeRefs: ['guard-behavior'], entryBehaviorNodeRef: 'guard-behavior'});
  ux.surfaces[0].componentRefs.push('entry-guard');
  ux.surfaces[0].regions[0].componentRefs.push('entry-guard');
  ux.flowNodes.push({id: 'guard-behavior', kind: 'component-behavior', ownerRef: 'ux:component:entry-guard',
    status: 'accepted', sourceRefs: ['brief'], questionRefs: [], componentRef: 'entry-guard',
    statement: 'Check the entry before committing it.'});
  ux.flowEdges.push({id: 'first-invokes-guard', fromRef: 'save-step',
    toRef: 'ux:flow-node:guard-behavior', kind: 'invokes', status: 'accepted', sourceRefs: ['brief']});
  ux.flowEdges.push({id: 'second-invokes-guard', fromRef: 'second-save-step',
    toRef: 'ux:flow-node:guard-behavior', kind: 'invokes', status: 'accepted', sourceRefs: ['brief']});
  validateUxSpec(ux);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-ux-'));
  const fixture = new URL('../references/fixtures/product-model/garden-log/', import.meta.url);
  persistProductModel({proposalPath: new URL('product-model-proposal.json', fixture),
    sourcePath: new URL('product-description.md', fixture),
    sourceLabel: 'briefs/garden-log/product-description.md', outputRoot: root});
  const model = loadCurrentProduct(path.join(root, 'current.json')).model;
  const handoff = buildUseCaseHandoff(model, ux, 'record-entry');
  assert.deepEqual(handoff.sharedComponentRefs, ['ux:component:entry-guard']);
  assert.deepEqual(affectedUseCases(ux, 'ux:component:entry-guard'),
    ['record-entry', 'record-second-entry']);
});
