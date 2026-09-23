import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {assessRefinementImpact, compareInteractionArchitectures, compareMaterialDesigns} from './refinement-impact.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';

test('sanitized checkout fixtures preserve materially equivalent interactions', () => {
  const read = name => JSON.parse(fs.readFileSync(new URL(`../references/fixtures/ux-regression/${name}.json`, import.meta.url), 'utf8'));
  const left = read('checkout-a');
  const right = read('checkout-b');
  assert.notDeepEqual(left, right);
  assert.equal(compareInteractionArchitectures(left, right).equivalent, true);
});

test('independent runs are materially equivalent when only provenance and revisions differ', () => {
  const left = {
    id: 'editor', revision: '1', status: 'accepted',
    assessment: {kind: 'ux-planner-assessment', description: 'First run'},
    sources: [{id: 'product', path: 'one.md', revision: '1'}],
    steps: [{id: 'save', action: 'Save the item.', response: 'The saved state is visible.'}]
  };
  const right = {
    ...structuredClone(left),
    revision: '2',
    assessment: {kind: 'ux-planner-assessment', description: 'Fresh independent run'},
    sources: [{id: 'product', path: 'two.md', revision: '2'}]
  };
  assert.equal(compareMaterialDesigns(left, right).equivalent, true);
  right.steps[0].response = 'The window closes without feedback.';
  assert.equal(compareMaterialDesigns(left, right).equivalent, false);
});

test('compares broad interaction decisions without requiring identical prose or visual composition', () => {
  const left = createUxTestSpec();
  const right = structuredClone(left);
  right.actions[0].name = 'Edit selected record';
  right.actions[0].purpose = 'Make the selected record available for changes.';
  right.actions[0].outcome = 'Editing is available.';
  right.actions[0].canonicalInteraction.description = 'Use the available activation gesture.';
  right.interactionFrames[0].purpose = 'Different but compatible explanation.';
  right.interactionFrames[0].regions[0].content[0].text = 'Check the current information.';
  right.pruningReview.taskReviews[0].decisions[0].rationale = 'This remains the canonical completion path.';
  assert.equal(compareInteractionArchitectures(left, right).equivalent, true);
  right.actions[0].presentationClass = 'menu-item';
  assert.equal(compareInteractionArchitectures(left, right).equivalent, false);
});

test('broad interaction comparison remains sensitive to each material behavior category', () => {
  const original = createUxTestSpec();
  const materiallyChanged = [
    spec => { spec.actions[0].canonicalInteraction.method = 'toggle'; },
    spec => { spec.actions[0].presentationClass = 'menu-item'; },
    spec => { spec.actions[0].applicableStates[0].state = 'saving'; },
    spec => { spec.actions[0].feedback[0].phase = 'failure'; },
    spec => { spec.actions[0].cancellation.mode = 'unavailable'; },
    spec => {
      spec.actions[1].recovery[0].actionRefs = [spec.actions[0].id];
    },
    spec => { spec.pruningReview.taskReviews[0].decisions[0].disposition = 'remove'; },
  ];
  for (const mutate of materiallyChanged) {
    const changed = structuredClone(original);
    mutate(changed);
    assert.equal(compareInteractionArchitectures(original, changed).equivalent, false);
  }

  const transitionChanged = structuredClone(original);
  const affordance = transitionChanged.interactionFrames
    .flatMap(frame => frame.regions.flatMap(region => region.affordances))
    .find(Boolean);
  affordance.transition = {kind: 'state', targetState: 'saving'};
  assert.equal(compareInteractionArchitectures(original, transitionChanged).equivalent, false);

  const researched = structuredClone(original);
  researched.patternResearch = [{
    id: 'pattern-study', status: 'accepted', trigger: 'unfamiliar-capability', method: 'bounded-online-search',
    outcome: 'pattern-selected', verification: {status: 'source-checked'},
    sources: [
      {id: 'source-a', sourceType: 'standard', sourceUrl: 'https://example.test/a'},
      {id: 'source-b', sourceType: 'platform-guidance', sourceUrl: 'https://example.test/b'},
    ],
    patterns: [
      {id: 'pattern-a', sourceRefs: ['source-a']},
      {id: 'pattern-b', sourceRefs: ['source-b']},
    ],
    selection: {patternRef: 'pattern-a'},
  }];
  researched.actions[0].patternBasis = {kind: 'researched', researchRef: 'pattern-study'};
  const changedSelection = structuredClone(researched);
  changedSelection.patternResearch[0].selection.patternRef = 'pattern-b';
  assert.equal(compareInteractionArchitectures(researched, changedSelection).equivalent, false);
});

test('a changed record invalidates only artifacts that depend on that record', () => {
  const previous = [
    {id: 'ux', revision: '1', records: {editor: {states: ['ready']}, library: {states: ['empty']}}},
    {id: 'design', revision: '1', records: {typography: {family: 'Roboto'}}}
  ];
  const next = [
    {id: 'ux', revision: '2', records: {editor: {states: ['ready', 'saving']}, library: {states: ['empty']}}},
    {id: 'design', revision: '2', records: {typography: {family: 'Roboto'}}}
  ];
  const impact = assessRefinementImpact(previous, next, [
    {id: 'editor-comp', dependencies: [{sourceId: 'ux', recordRefs: ['editor']}, {sourceId: 'design', recordRefs: ['typography']}]},
    {id: 'library-comp', dependencies: [{sourceId: 'ux', recordRefs: ['library']}, {sourceId: 'design', recordRefs: ['typography']}]},
    {id: 'locked-editor', status: 'locked', dependencies: [{sourceId: 'ux', recordRefs: ['editor']}]}
  ]);
  assert.deepEqual(impact.stale, ['editor-comp']);
  assert.deepEqual(impact.rebind, ['library-comp']);
  assert.deepEqual(impact.lockedConflicts, ['locked-editor']);
  assert.deepEqual(impact.sources.ux.records, ['editor']);
  assert.equal(impact.sources.design.kind, 'revision-only');
});

test('an unrelated record change preserves decisions and requires only an exact source rebind', () => {
  const impact = assessRefinementImpact(
    [{id: 'ux', revision: '1', records: {editor: {state: 'ready'}, library: {state: 'empty'}}}],
    [{id: 'ux', revision: '2', records: {editor: {state: 'ready'}, library: {state: 'populated'}}}],
    [{id: 'editor-comp', dependencies: [{sourceId: 'ux', recordRefs: ['editor']}]}]
  );
  assert.deepEqual(impact.rebind, ['editor-comp']);
  assert.deepEqual(impact.stale, []);
});

test('an artifact remains reusable when all of its sources and referenced records are unchanged', () => {
  const previous = [
    {id: 'ux', revision: '1', records: {editor: {state: 'ready'}}},
    {id: 'design', revision: '3', records: {typography: {family: 'Roboto'}}}
  ];
  const next = [
    {id: 'ux', revision: '2', records: {editor: {state: 'saving'}}},
    {id: 'design', revision: '3', records: {typography: {family: 'Roboto'}}}
  ];
  const impact = assessRefinementImpact(previous, next, [
    {id: 'type-reference', dependencies: [{sourceId: 'design', recordRefs: ['typography']}]}
  ]);
  assert.deepEqual(impact.reusable, ['type-reference']);
  assert.deepEqual(impact.rebind, []);
  assert.deepEqual(impact.stale, []);
});
