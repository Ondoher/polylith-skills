import fs from 'node:fs';
import path from 'node:path';

const own = (object, key) => Object.hasOwn(object, key);

export function fail(message) {
  throw new Error(message);
}

export function objectWithKeys(value, keys, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(name + ' must be an object');
  if (Object.keys(value).length !== keys.length || keys.some(key => !own(value, key))) {
    fail(name + ' requires exactly: ' + keys.join(', '));
  }
}

export function text(value, name, max = 600) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) {
    fail(name + ' must be nonempty single-line text, at most ' + max + ' characters');
  }
}

export function identifier(value, name) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(value)) fail(name + ' must be a stable lowercase ID');
}

export function xml(value) {
  return value.replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'})[char]);
}

export function markdown(value) {
  return xml(value).replace(/([\\`*_[\]{}()|!#])/g, '\\$1');
}

/** Render the compact palette swatch shared by current design-language documents. */
export function renderColorSwatch(document) {
  const color = document.color;
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20" role="img" aria-labelledby="title description">',
    '  <title id="title">' + xml(color.name) + '</title>',
    '  <desc id="description">Color ' + xml(color.value) + '. ' + xml(color.purpose) + '</desc>',
    '  <style>.swatch { fill: ' + color.value + '; stroke: #666666; stroke-width: 1; }</style>',
    '  <rect class="swatch" x="0.5" y="0.5" width="39" height="19" rx="2"/>',
    '</svg>', ''
  ].join('\n');
}

export function readOptional(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export function rejectLink(file) {
  try {
    if (fs.lstatSync(file).isSymbolicLink()) fail('Refusing linked output path: ' + file);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

/** Publish validated artifacts atomically and roll back replacements after a caught failure. */
export function publish(base, files, contents, previous, removals = []) {
  const stage = fs.mkdtempSync(path.join(base, '.design-language-stage-'));
  const staged = files.map((_, index) => path.join(stage, String(index)));
  const changed = [];
  const removalPrevious = removals.map(readOptional);
  const removed = [];
  try {
    contents.forEach((content, index) => fs.writeFileSync(staged[index], content, 'utf8'));
    files.forEach((file, index) => {
      if (previous[index] === contents[index]) return;
      if (readOptional(file) !== previous[index]) fail('Output changed during rendering: ' + file);
      fs.renameSync(staged[index], file);
      changed.push(index);
    });
    removals.forEach((file, index) => {
      if (readOptional(file) !== removalPrevious[index]) fail('Output changed during rendering: ' + file);
      if (removalPrevious[index] !== null) {
        fs.unlinkSync(file);
        removed.push(index);
      }
    });
  } catch (error) {
    for (const index of removed.reverse()) fs.writeFileSync(removals[index], removalPrevious[index], 'utf8');
    for (const index of changed.reverse()) {
      if (previous[index] === null) fs.unlinkSync(files[index]);
      else fs.writeFileSync(files[index], previous[index], 'utf8');
    }
    throw error;
  } finally {
    for (const file of staged) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(stage);
  }
}
