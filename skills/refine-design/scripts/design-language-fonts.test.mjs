import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fontCatalog, loadFont, outlineSpecimen} from './design-language-fonts.mjs';

const role = {
  name: 'Body text',
  sampleLines: ['Review the selected record.', 'Supporting text & <sample>.']
};
const resolved = {fontId: 'roboto', weight: 400, sizePx: 16, lineHeightPx: 24};
const color = '#202020';

test('outlined specimens remain byte-stable when reused', () => {
  const first = outlineSpecimen(role, resolved, color);
  const second = outlineSpecimen(role, resolved, color);
  assert.equal(second, first);
  assert.equal(createHash('sha256').update(first).digest('hex'), '23ccc0fe3c7621d25296a75bd7db5f47546b32f40f23beee6780aaa107a87241');
});

test('every render-affecting specimen input participates in reuse', () => {
  const original = outlineSpecimen(role, resolved, color);
  const variants = [
    outlineSpecimen({...role, name: 'Supporting text'}, resolved, color),
    outlineSpecimen({...role, sampleLines: ['A different sample.']}, resolved, color),
    outlineSpecimen(role, {...resolved, fontId: 'merriweather'}, color),
    outlineSpecimen(role, {...resolved, weight: 500}, color),
    outlineSpecimen(role, {...resolved, sizePx: 17}, color),
    outlineSpecimen(role, {...resolved, lineHeightPx: 25}, color),
    outlineSpecimen(role, resolved, '#303030')
  ];
  for (const variant of variants) assert.notEqual(variant, original);
});

test('public font values cannot poison later loads or renders', () => {
  const first = loadFont('roboto', 400);
  assert.deepEqual(Object.keys(first.font).sort(), ['ascent', 'descent', 'hasGlyphForCodePoint', 'layout', 'unitsPerEm']);
  const firstRun = first.font.layout('Safe sample');
  assert.deepEqual(Object.keys(firstRun).sort(), ['direction', 'glyphs', 'positions']);
  assert.deepEqual(Object.keys(firstRun.glyphs[0]).sort(), ['bbox', 'id', 'path']);
  assert.deepEqual(Object.keys(firstRun.glyphs[0].bbox).sort(), ['maxX', 'maxY', 'minX', 'minY']);
  assert.deepEqual(Object.keys(firstRun.positions[0]).sort(), ['xAdvance', 'xOffset', 'yOffset']);

  first.axes.wght = 900;
  first.asset.family = 'Poisoned family';
  first.font.unitsPerEm = 1;
  first.font._tables = {head: {unitsPerEm: 1}};
  first.font.stream = {read: () => { throw new Error('Poisoned stream'); }};
  first.font.layout = () => { throw new Error('Poisoned layout'); };
  firstRun.direction = 'rtl';
  firstRun.glyphs[0].id = 0;
  firstRun.glyphs[0].bbox.minX = Number.NEGATIVE_INFINITY;
  firstRun.glyphs[0].path.toSVG = () => { throw new Error('Poisoned path'); };
  firstRun.positions[0].xAdvance = 0;
  assert.throws(() => { fontCatalog[0].family = 'Poisoned catalog'; }, TypeError);

  const second = loadFont('roboto', 400);
  const secondRun = second.font.layout('Safe sample');
  assert.equal(second.axes.wght, 400);
  assert.equal(second.asset.family, 'Roboto');
  assert.ok(second.font.unitsPerEm > 1);
  assert.equal(secondRun.direction, 'ltr');
  assert.notEqual(secondRun.glyphs[0].id, 0);
  assert.ok(Number.isFinite(secondRun.glyphs[0].bbox.minX));
  assert.match(secondRun.glyphs[0].path.toSVG(), /^[Mm]/);
  assert.ok(secondRun.positions[0].xAdvance > 0);

  const rendered = outlineSpecimen({...role, name: 'Mutation isolation'}, resolved, color);
  assert.match(rendered, /Mutation isolation/);
  assert.match(rendered, /Roboto/);
  assert.doesNotMatch(rendered, /Poisoned/);
});
