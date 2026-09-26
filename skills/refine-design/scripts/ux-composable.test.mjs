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

import {gardenUx} from './ux-composable-fixture.mjs';

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
	ux.flowNodes.push({
		id: 'second-save-step',
		kind: 'step',
		ownerRef: 'ux:use-case:record-second-entry',
		status: 'accepted',
		sourceRefs: ['brief'],
		questionRefs: [],
		actor: 'Gardener',
		action: 'Save another observation.',
		actionRef: 'save-entry',
		response: 'Another entry is saved.',
	});
	ux.components.push({
		id: 'entry-guard',
		name: 'Entry guard',
		kind: 'shared-interaction',
		purpose: 'Check entries before saving.',
		status: 'accepted',
		surfaceRefs: ['entry-surface'],
		questionRefs: [],
		capabilities: ['Check an entry.'],
		stateRefs: [],
		behaviorNodeRefs: ['guard-behavior'],
		entryBehaviorNodeRef: 'guard-behavior',
	});
	ux.surfaces[0].componentRefs.push('entry-guard');
	ux.surfaces[0].regions[0].componentRefs.push('entry-guard');
	ux.flowNodes.push({
		id: 'guard-behavior',
		kind: 'component-behavior',
		ownerRef: 'ux:component:entry-guard',
		status: 'accepted',
		sourceRefs: ['brief'],
		questionRefs: [],
		componentRef: 'entry-guard',
		statement: 'Check the entry before committing it.',
	});
	ux.flowEdges.push({
		id: 'first-invokes-guard',
		fromRef: 'save-step',
		toRef: 'ux:flow-node:guard-behavior',
		kind: 'invokes',
		status: 'accepted',
		sourceRefs: ['brief'],
	});
	ux.flowEdges.push({
		id: 'second-invokes-guard',
		fromRef: 'second-save-step',
		toRef: 'ux:flow-node:guard-behavior',
		kind: 'invokes',
		status: 'accepted',
		sourceRefs: ['brief'],
	});
	validateUxSpec(ux);
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-ux-'));
	const fixture = new URL('../references/fixtures/product-model/garden-log/', import.meta.url);
	persistProductModel({
		proposalPath: new URL('product-model-proposal.json', fixture),
		sourcePath: new URL('product-description.md', fixture),
		sourceLabel: 'briefs/garden-log/product-description.md',
		outputRoot: root,
	});
	const model = loadCurrentProduct(path.join(root, 'current.json')).model;
	const handoff = buildUseCaseHandoff(model, ux, 'record-entry');
	assert.deepEqual(handoff.sharedComponentRefs, ['ux:component:entry-guard']);
	assert.deepEqual(affectedUseCases(ux, 'ux:component:entry-guard'), ['record-entry', 'record-second-entry']);
});
