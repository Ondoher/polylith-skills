import assert from 'node:assert/strict';
import test from 'node:test';

import {linkSourceRelations, uxApplicationSources, uxRecordSources} from './prd-outline.mjs';

test('a shell exposes stable source identities for its navigation and areas', () => {
  const sources = uxApplicationSources('garden-ux', {
    summary: 'Two work areas share one project.',
    shell: {kind: 'project shell', description: 'Keep project status visible.',
      navigation: {pattern: 'workspace switcher'},
      regions: [{id: 'header', name: 'Project header'},
        {id: 'status', name: 'Application status'}]},
    areas: [{id: 'library', name: 'Garden library', surfaceRefs: ['library-surface']}],
  });
  assert.deepEqual(sources.map(({ref}) => ref), [
    'artifact:garden-ux#/application/summary',
    'artifact:garden-ux#/application/shell/kind',
    'artifact:garden-ux#/application/shell/description',
    'artifact:garden-ux#/application/shell/navigation',
    'artifact:garden-ux#/application/shell/regions/header',
    'artifact:garden-ux#/application/shell/regions/status',
    'artifact:garden-ux#/application/areas/library',
  ]);
});

test('flat UX records use stable IDs and typed relationships', () => {
  const useCase = uxRecordSources('field-ux', 'useCases', {
    id: 'record-observation', name: 'Record an observation', status: 'accepted',
    featureRef: 'recording', entryNodeRef: 'enter-note', actionRefs: ['write-note'],
  }, 0);
  const step = uxRecordSources('field-ux', 'flowNodes', {
    id: 'enter-note', kind: 'step', ownerRef: 'ux:use-case:record-observation',
    actionRef: 'write-note', action: 'Enter a note', response: 'The note appears.',
  }, 0);
  const action = uxRecordSources('field-ux', 'actions', {id: 'write-note', name: 'Write note'}, 0);
  assert.equal(useCase[0].ref, 'artifact:field-ux#/useCases/record-observation');
  assert.equal(step[0].ref, 'artifact:field-ux#/flowNodes/enter-note');
  const linked = linkSourceRelations([...useCase, ...step, ...action]);
  assert.ok(linked[1].relations.some(relation => relation.field === '/actionRef'
    && relation.targetRef === 'artifact:field-ux#/actions/write-note'));
  assert.ok(linked[1].relations.some(relation => relation.field === '/ownerRef'
    && relation.targetRef === useCase[0].ref));
});

test('UI scenes resolve to UX frames even when identifiers coincide', () => {
  const linked = linkSourceRelations([
    {ref: 'artifact:ux#/interactionFrames/exporting', kind: 'ux-design/interactionFrames',
      label: 'Exporting', value: {id: 'exporting'}},
    {ref: 'artifact:ui#/scenes/exporting', kind: 'ui-composition/scenes',
      label: 'Exporting comp', value: {id: 'exporting', interactionFrameRef: 'exporting'}},
  ]);
  assert.deepEqual(linked[1].relations, [{field: '/interactionFrameRef',
    targetId: 'exporting', targetRef: 'artifact:ux#/interactionFrames/exporting'}]);
});
