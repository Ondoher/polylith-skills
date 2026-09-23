import assert from 'node:assert/strict';
import test from 'node:test';

import {selectAssessmentProvenance} from './consultation-provenance.mjs';

test('records parent provenance when the requested specialist is unavailable', () => {
  assert.deepEqual(selectAssessmentProvenance({
    requestedRole: 'ux-planner',
    availableRoles: ['ui-designer'],
    parentDescription: 'Parent interpreted a sparse brief without claiming a UX consultation.'
  }), {
    kind: 'parent-assessment',
    description: 'Parent interpreted a sparse brief without claiming a UX consultation.'
  });
});

test('records the specialist only when the requested consultation can run and succeeds', () => {
  assert.equal(selectAssessmentProvenance({requestedRole: 'ui-designer', availableRoles: ['ui-designer']}).kind, 'ui-designer-assessment');
  assert.equal(selectAssessmentProvenance({requestedRole: 'ui-designer', availableRoles: ['ui-designer'], consultationSucceeded: false}).kind, 'parent-assessment');
  assert.equal(selectAssessmentProvenance({requestedRole: 'controller-agent', availableRoles: []}).kind, 'parent-assessment');
});

test('recognizes every specialist currently routable by refine-design', () => {
  const roles = ['ux-planner', 'ui-designer', 'system-architect', 'model-agent', 'controller-agent'];
  for (const requestedRole of roles) {
    const assessment = selectAssessmentProvenance({requestedRole, availableRoles: [requestedRole]});
    assert.notEqual(assessment.kind, 'parent-assessment');
  }
});

test('rejects an invented specialist role', () => {
  assert.throws(() => selectAssessmentProvenance({requestedRole: 'creative-oracle'}), /Unknown specialist role/);
});
