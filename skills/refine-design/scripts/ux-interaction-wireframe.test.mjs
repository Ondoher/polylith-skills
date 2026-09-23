import assert from 'node:assert/strict';
import test from 'node:test';

import {validateUxSpec} from './ux-design.mjs';
import {createUxTestSpec} from './ux-test-fixture.mjs';
import {renderSurfaceInteractionWireframes, renderUxInteractionWireframeCss} from './ux-interaction-wireframe.mjs';

function fixture() {
  return validateUxSpec(createUxTestSpec());
}

test('renders a validated UX 0.2 interaction model deterministically without simulating an application', () => {
  const spec = fixture();
  spec.interactionFrames[0].regions[0].content[0].text = 'Available <records> and the current selection.';
  const surface = spec.surfaces[0];
  const first = renderSurfaceInteractionWireframes(spec, surface);
  const second = renderSurfaceInteractionWireframes(structuredClone(spec), structuredClone(surface));

  assert.equal(second, first);
  assert.match(first, /aria-label="Interaction wireframes for Records workspace"/);
  assert.match(first, /data-ux-frame="records-viewing"/);
  assert.match(first, /data-ux-action="open-record"/);
  assert.match(first, /data-ux-presentation="persistent-control"/);
  assert.match(first, /Focus entry<\/dt><dd>Place focus on the current record or the first available record/);
  assert.match(first, /Focus order<\/dt><dd>Open record/);
  assert.match(first, /keyboard:<\/strong> Activate the focused record entry/);
  assert.match(first, /Equivalent outcome: yes/);
  assert.match(first, /Available &lt;records&gt; and the current selection/);
  assert.match(first, /Pattern basis:<\/strong> ordinary/);
  assert.match(first, /data-ux-feedback="record-opened"/);
  assert.ok(first.indexOf('data-ux-frame="records-viewing"') < first.indexOf('data-ux-frame="records-editing"'));
  assert.ok(first.indexOf('data-ux-frame="records-editing"') < first.indexOf('data-ux-frame="records-failed"'));
  assert.match(first, /UI design owns exact layout, component choice, spacing, typography, color, and visual treatment/);
  assert.doesNotMatch(first, />Accepted<|>accepted</);
  assert.doesNotMatch(first, /<button|<input|<iframe|<script| style=/);

  const technical = structuredClone(spec);
  technical.interactionFrames[0].regions[0].content[0].kind = 'technical-information';
  technical.interactionFrames[0].regions[0].content[0].technicalExplanation = 'The system resolves this value from a separate source record.';
  validateUxSpec(technical);
  assert.match(renderSurfaceInteractionWireframes(technical, technical.surfaces[0]), /Technical explanation:<\/strong> The system resolves this value from a separate source record/);
});

test('renders recovery plus state, frame, and surface transitions from generic records', () => {
  const spec = fixture();
  const surface = spec.surfaces[0];
  const base = renderSurfaceInteractionWireframes(spec, surface);

  assert.match(base, /Resulting state: editing/);
  assert.match(base, /Visibility:<\/strong> conditional: The current edited value has a failed save result/);
  assert.match(base, /Keep the edited value and offer retry in the failed state/);

  const frameTransition = structuredClone(spec);
  frameTransition.interactionFrames[0].regions[0].affordances[0].transition = {kind: 'frame', targetRef: 'records-editing'};
  assert.match(renderSurfaceInteractionWireframes(frameTransition, frameTransition.surfaces[0]), /href="#interaction-frame-records-editing">Next frame: Record editing/);

  const surfaceTransition = structuredClone(spec);
  surfaceTransition.surfaces.push({id: 'record-summary', name: 'Record summary', states: ['viewing'], interactionFrameRefs: []});
  surfaceTransition.interactionFrames[0].regions[0].affordances[0].transition = {kind: 'surface', targetRef: 'record-summary', targetState: 'viewing'};
  assert.match(renderSurfaceInteractionWireframes(surfaceTransition, surfaceTransition.surfaces[0]), /href="#surface-record-summary">Next surface: Record summary<\/a><span> · State: viewing/);

  const unresolved = structuredClone(spec);
  unresolved.interactionFrames[2].status = 'unresolved';
  assert.match(renderSurfaceInteractionWireframes(unresolved, unresolved.surfaces[0]), /Needs definition/);
});

test('uses a scoped grayscale, reflowing stylesheet independent of product design tokens', () => {
  const css = renderUxInteractionWireframeCss();
  const colors = [...css.matchAll(/#[0-9a-f]{3,6}\b/gi)].map(match => match[0]);

  for (const color of colors) {
    const expanded = color.length === 4 ? color.slice(1).split('').map(value => value.repeat(2)) : color.slice(1).match(/../g);
    assert.equal(new Set(expanded.map(value => value.toLowerCase())).size, 1, `${color} is not grayscale`);
  }
  assert.match(css, /--uxw-paper/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.doesNotMatch(css, /--rd-color-|--ui-viewport|position:\s*absolute|grid-template-areas/);
});

test('fails instead of silently dropping broken frame and action references', () => {
  const spec = fixture();
  const missingFrame = structuredClone(spec);
  missingFrame.surfaces[0].interactionFrameRefs = ['missing-frame'];
  assert.throws(() => renderSurfaceInteractionWireframes(missingFrame, missingFrame.surfaces[0]), /missing interaction frame missing-frame/);

  const missingAction = structuredClone(spec);
  missingAction.interactionFrames[0].regions[0].affordances[0].actionRef = 'missing-action';
  assert.throws(() => renderSurfaceInteractionWireframes(missingAction, missingAction.surfaces[0]), /missing action missing-action/);
});
