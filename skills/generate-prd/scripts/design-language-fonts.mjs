import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fail, text} from './design-language-support.mjs';

const require = createRequire(import.meta.url);
const root = new URL('../assets/fonts/', import.meta.url);
export const fontCatalog = Object.freeze(JSON.parse(fs.readFileSync(new URL('catalog.json', root), 'utf8'))
  .map(asset => Object.freeze({...asset})));
const fontAssets = new Map(fontCatalog.map(asset => [asset.id, asset]));
const verifiedFonts = new Map();
const specimens = new Map();
const specimenLimit = 256;
const xml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const num = value => Number(value.toFixed(4));
const keyPart = value => {
  const rendered = typeof value === 'number' ? (Object.is(value, -0) ? '-0' : String(value)) : String(value);
  return typeof value + ':' + rendered.length + ':' + rendered;
};
const cacheKey = values => values.map(keyPart).join('|');

function verifiedFont(id) {
  if (verifiedFonts.has(id)) return verifiedFonts.get(id);
  const asset = fontAssets.get(id);
  if (!asset) fail('Unsupported bundled font: ' + id);
  const bytes = fs.readFileSync(new URL(asset.file, root));
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) fail('Font asset hash mismatch: ' + id);
  const font = require('fontkit').create(bytes);
  if (font.familyName !== asset.internalFamily) fail('Font family mismatch: ' + id);
  const value = {asset, bytes, font};
  verifiedFonts.set(id, value);
  return value;
}

function fontFacade(font) {
  return {
    unitsPerEm: font.unitsPerEm,
    ascent: font.ascent,
    descent: font.descent,
    hasGlyphForCodePoint(codePoint) {
      return font.hasGlyphForCodePoint(codePoint);
    },
    layout(value) {
      const run = font.layout(value);
      return {
        direction: run.direction,
        glyphs: run.glyphs.map(glyph => {
          const bbox = glyph.bbox;
          const svg = glyph.path.toSVG();
          return {
            id: glyph.id,
            bbox: {minX: bbox.minX, minY: bbox.minY, maxX: bbox.maxX, maxY: bbox.maxY},
            path: {toSVG: () => svg}
          };
        }),
        positions: run.positions.map(position => ({
          xOffset: position.xOffset,
          yOffset: position.yOffset,
          xAdvance: position.xAdvance
        }))
      };
    }
  };
}

/** Return a fresh variation of a process-cached, hash-verified bundled font. */
export function loadFont(id, weight) {
  const {asset, font} = verifiedFont(id);
  const axis = font.variationAxes.wght;
  if (!axis || weight < axis.min || weight > axis.max) fail('Unsupported font weight: ' + id);
  // Freeze every axis explicitly, including optical size; do not infer it from specimen size.
  const axes = Object.fromEntries(Object.entries(font.variationAxes).map(([axisName, value]) => [axisName, value.default]));
  axes.wght = weight;
  // Fontkit objects stay private because variations may share mutable tables and streams with the base font.
  return {font: fontFacade(font.getVariation(axes)), asset: {...asset}, axes: {...axes}};
}

/** Explicit lines only: shape and measure actual glyphs, then emit self-contained outlines. */
export function outlineSpecimen(role, resolved, color) {
  for (const line of role.sampleLines) text(line, 'sample line', 160);
  const key = cacheKey([
    role.name,
    role.sampleLines.length,
    ...role.sampleLines,
    resolved.fontId,
    resolved.weight,
    resolved.sizePx,
    resolved.lineHeightPx,
    color
  ]);
  if (specimens.has(key)) return specimens.get(key);
  const {font, asset, axes} = loadFont(resolved.fontId, resolved.weight);
  const scale = resolved.sizePx / font.unitsPerEm;
  let minX = 0, maxX = 0, minY = 0, maxY = (role.sampleLines.length - 1) * resolved.lineHeightPx;
  const runs = role.sampleLines.map((line, index) => {
    for (const character of line) {
      if (!font.hasGlyphForCodePoint(character.codePointAt(0))) fail('Missing glyph in ' + asset.family + ': ' + character);
    }
    const run = font.layout(line);
    if (run.direction !== 'ltr') fail('Only left-to-right specimens are supported in Slice 3');
    let cursor = 0;
    const paths = run.glyphs.map((glyph, i) => {
      if (glyph.id === 0) fail('Unresolved glyph in specimen');
      const position = run.positions[i];
      const x = cursor + position.xOffset * scale;
      const y = index * resolved.lineHeightPx - position.yOffset * scale;
      cursor += position.xAdvance * scale;
      const bbox = glyph.bbox;
      if (Number.isFinite(bbox.minX)) {
        minX = Math.min(minX, x + bbox.minX * scale);
        maxX = Math.max(maxX, x + bbox.maxX * scale);
        minY = Math.min(minY, y - bbox.maxY * scale);
        maxY = Math.max(maxY, y - bbox.minY * scale);
      }
      return {d: glyph.path.toSVG(), x, y};
    });
    maxX = Math.max(maxX, cursor);
    return paths;
  });
  const padding = 16;
  const width = Math.ceil(maxX - minX + 2 * padding);
  const height = Math.ceil(maxY - minY + 2 * padding);
  if (width > 2400 || height > 1200) fail('Specimen exceeds bounded canvas; shorten lines or reduce metrics');
  const paths = runs.flatMap((run, index) => [
    '<g data-line="' + index + '" data-baseline="' + num(padding - minY + index * resolved.lineHeightPx) + '">',
    ...run.filter(item => item.d).map(item => '<path transform="translate(' + num(padding - minX + item.x) + ' ' + num(padding - minY + item.y) + ') scale(' + scale + ' ' + -scale + ')" d="' + item.d + '"/>'),
    '</g>'
  ]);
  const specimen = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="title desc">\n' +
    '<title id="title">' + xml(role.name + ' — ' + asset.family) + '</title>\n' +
    '<desc id="desc">' + xml(role.sampleLines.join(' / ') + '. Outlined text; ' + resolved.sizePx + 'px; weight ' + resolved.weight + '; line height ' + resolved.lineHeightPx + 'px. White specimen background is a renderer convention, not an application surface decision.') + '</desc>\n' +
    '<metadata>' + xml(JSON.stringify({fontId: asset.id, sha256: asset.sha256, axes, sizePx: resolved.sizePx, lineHeightPx: resolved.lineHeightPx, renderer: 'fontkit-2.0.4'})) + '</metadata>\n' +
    '<style>.sheet{fill:#FFFFFF}.ink{fill:' + color + '}</style>\n' +
    '<rect class="sheet" width="100%" height="100%"/><g class="ink">\n' + paths.join('\n') + '\n</g></svg>\n';
  if (specimens.size >= specimenLimit) specimens.delete(specimens.keys().next().value);
  specimens.set(key, specimen);
  return specimen;
}
