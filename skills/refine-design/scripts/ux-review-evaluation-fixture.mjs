import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createUxTestSpec} from './ux-test-fixture.mjs';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Create a structurally valid UX pair for qualitative reviewer evaluation.
 * The cluttered member deliberately accepts a persistent action that only
 * repeats an already-visible state and does not advance the primary task.
 */
export function createUxReviewerEvaluationFixtures() {
  const coherent = createUxTestSpec();
  const cluttered = clone(coherent);

  const redundantAction = {
    id: 'confirm-current-selection',
    name: 'Confirm current selection',
    purpose: 'Repeat which record is currently selected even though the selection is already visible.',
    status: 'accepted',
    taskRefs: ['update-record'],
    outcome: 'The workspace restates the current selection without changing state or advancing the task.',
    canonicalInteraction: {
      method: 'activate',
      input: 'pointer',
      description: 'Activate the persistent confirmation command.',
    },
    alternateInputs: [
      {
        id: 'confirm-current-selection-keyboard',
        input: 'keyboard',
        description: 'Activate the focused confirmation command with the platform activation key.',
        equivalentOutcome: true,
      },
    ],
    presentationClass: 'persistent-control',
    visibility: {mode: 'always', conditions: []},
    persistence: 'persistent',
    priority: 'secondary',
    applicableStates: [{surfaceRef: 'records-workspace', state: 'viewing'}],
    feedback: [
      {
        id: 'current-selection-restated',
        phase: 'success',
        description: 'The workspace repeats the identity of the record that remains visibly selected.',
        persistence: 'transient',
      },
    ],
    cancellation: {
      mode: 'not-applicable',
      description: 'Restating the current selection is immediate.',
    },
    recovery: [],
    patternBasis: {
      kind: 'ordinary',
      rationale: 'A named confirmation command is mechanically familiar.',
    },
    questionRefs: [],
  };
  cluttered.actions.splice(1, 0, redundantAction);

  const task = cluttered.useCases.find(candidate => candidate.id === 'update-record');
  task.actionRefs.splice(1, 0, redundantAction.id);
  task.steps.unshift({
    id: 'confirm-visible-selection',
    actor: 'User',
    action: 'Ask the workspace to confirm the already-visible current selection.',
    actionRef: redundantAction.id,
    targetRef: 'record-list',
    response: 'The workspace repeats the name of the record that remains visibly selected.',
  });

  const frame = cluttered.interactionFrames.find(candidate => candidate.id === 'records-viewing');
  const region = frame.regions.find(candidate => candidate.id === 'viewing-collection');
  region.affordances[0].order = 2;
  region.affordances.unshift({
    id: 'confirm-current-selection-affordance',
    actionRef: redundantAction.id,
    label: 'Confirm current selection',
    status: 'accepted',
    order: 1,
    interaction: 'canonical',
    transition: {kind: 'none'},
  });
  frame.focus.orderRefs.unshift('confirm-current-selection-affordance');

  cluttered.pruningReview.summary = 'The primary task retains a persistent confirmation command before its two outcome-bearing steps.';
  const pruning = cluttered.pruningReview.taskReviews.find(candidate => candidate.taskRef === 'update-record');
  pruning.canonicalStepRefs.unshift('confirm-visible-selection');
  pruning.reviewedActionRefs.splice(1, 0, redundantAction.id);
  pruning.decisions.push({
    id: 'retain-selection-confirmation',
    disposition: 'retain',
    candidate: 'A persistent command that repeats the already-visible current selection.',
    actionRefs: [redundantAction.id],
    rationale: 'Keep a separate confirmation step even though it does not change state or advance the task.',
    result: 'The confirmation command remains always visible and precedes the task entry action.',
  });

  return {coherent, cluttered};
}

export function writeUxReviewerEvaluationFixtures(outputDirectory) {
  const fixtures = createUxReviewerEvaluationFixtures();
  fs.mkdirSync(outputDirectory, {recursive: true});
  for (const [name, value] of Object.entries(fixtures)) {
    fs.writeFileSync(path.join(outputDirectory, `ux-reviewer-${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
  }
  return Object.keys(fixtures).map(name => path.join(outputDirectory, `ux-reviewer-${name}.json`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputDirectory = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'references', 'evaluations');
  process.stdout.write(`${JSON.stringify({files: writeUxReviewerEvaluationFixtures(outputDirectory)})}\n`);
}
