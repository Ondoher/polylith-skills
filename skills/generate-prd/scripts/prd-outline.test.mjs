import assert from 'node:assert/strict';
import test from 'node:test';

import {linkSourceRelations, uxApplicationSources, uxRecordSources} from './prd-outline.mjs';

test('a shell exposes stable source identities for its navigation and areas', () => {
	const sources = uxApplicationSources('garden-ux', {
		summary: 'Two work areas share one project.',
		shell: {
			kind: 'project shell',
			description: 'Keep project status visible.',
			navigation: {pattern: 'workspace switcher'},
			regions: [
				{id: 'header', name: 'Project header'},
				{id: 'status', name: 'Application status'},
			],
		},
		areas: [{id: 'library', name: 'Garden library', surfaceRefs: ['library-surface']}],
	});
	assert.deepEqual(
		sources.map(({ref}) => ref),
		[
			'artifact:garden-ux#/application/summary',
			'artifact:garden-ux#/application/shell/kind',
			'artifact:garden-ux#/application/shell/description',
			'artifact:garden-ux#/application/shell/navigation',
			'artifact:garden-ux#/application/shell/regions/header',
			'artifact:garden-ux#/application/shell/regions/status',
			'artifact:garden-ux#/application/areas/library',
		],
	);
});

test('native flow inventory exposes stable child identities without prescribing publication hierarchy', () => {
	const records = uxRecordSources(
		'field-ux',
		'flows',
		{
			id: 'record-observation',
			name: 'Record an observation',
			elementRef: 'ux:surface:entry',
			steps: [
				{
					id: 'enter-note',
					actor: 'User',
					action: 'Enter a note',
					actionRef: 'write-note',
					response: 'The note appears.',
				},
			],
			alternates: [],
		},
		0,
	);
	const action = uxRecordSources('field-ux', 'actions', {id: 'write-note', name: 'Write note'}, 0);
	assert.equal(records[0].ref, 'artifact:field-ux#/flows/record-observation');
	assert.equal(records[1].ref, 'artifact:field-ux#/flows/record-observation/steps/enter-note');
	assert.equal(records[1].parentRef, records[0].ref);
	const linked = linkSourceRelations([...records, ...action]);
	assert.ok(
		linked[1].relations.some(
			(relation) =>
				relation.field === '/actionRef' && relation.targetRef === 'artifact:field-ux#/actions/write-note',
		),
	);
});

test('UI scenes resolve to UX frames even when identifiers coincide', () => {
	const linked = linkSourceRelations([
		{
			ref: 'artifact:ux#/interactionFrames/exporting',
			kind: 'ux-design/interactionFrames',
			label: 'Exporting',
			value: {id: 'exporting'},
		},
		{
			ref: 'artifact:ui#/scenes/exporting',
			kind: 'ui-composition/scenes',
			label: 'Exporting comp',
			value: {id: 'exporting', interactionFrameRef: 'exporting'},
		},
	]);
	assert.deepEqual(linked[1].relations, [
		{field: '/interactionFrameRef', targetId: 'exporting', targetRef: 'artifact:ux#/interactionFrames/exporting'},
	]);
});
