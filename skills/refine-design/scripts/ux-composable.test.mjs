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

test('validates and renders a source-bound local flow', () => {
	const spec = gardenUx();
	assert.equal(validateUxSpec(spec), spec);
	assert.match(renderPrd(spec), /Save the observation/);
	assert.match(renderSurfaceInteractionWireframes(spec, spec.surfaces[0]), /Entry saved/);
	assert.equal(spec.flows[0].steps[0].id, 'save-step');
	const independentlySourced = structuredClone(spec);
	independentlySourced.revision = '2';
	independentlySourced.sources[0].path = 'briefs/revised-product-description.md';
	assert.equal(compareInteractionArchitectures(spec, independentlySourced).equivalent, true);
});

test('two use cases invoke one identified shared behavior', () => {
	const ux = gardenUx();
	const second = structuredClone(ux.flows[0]);
	second.id = 'record-second-entry';
	second.name = 'Record another entry';
	second.taskPriority = 'supporting';
	second.steps[0].id = 'second-save-step';
	ux.flows.push(second);
	ux.features[0].flowRefs.push(second.id);
	ux.actions[0].taskRefs.push(second.id);
	ux.interactionFrames[0].taskRefs.push(second.id);
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
		behaviors: [
			{
				id: 'guard-behavior',
				statement: 'Check the entry before committing it.',
				status: 'accepted',
				sourceRefs: ['brief'],
				questionRefs: [],
			},
		],
	});
	ux.surfaces[0].componentRefs.push('entry-guard');
	ux.surfaces[0].regions[0].componentRefs.push('entry-guard');
	for (const flow of ux.flows) flow.steps[0].usesElementRefs = ['ux:component:entry-guard'];
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
	assert.deepEqual(handoff.sharedElementRefs, ['ux:component:entry-guard']);
	assert.deepEqual(affectedUseCases(ux, 'ux:component:entry-guard'), ['record-entry', 'record-second-entry']);
});
