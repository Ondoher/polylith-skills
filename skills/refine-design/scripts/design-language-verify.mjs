import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyProposal, validate} from './design-language.mjs';

function fail(message) {
  throw new Error(message);
}

function filesBelow(root) {
  const found = [];
  const visit = folder => {
    for (const entry of fs.readdirSync(folder, {withFileTypes: true})) {
      const absolute = path.join(folder, entry.name);
      const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
      if (entry.isSymbolicLink()) fail('Verification does not follow symbolic links: ' + relative);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) found.push(relative);
    }
  };
  visit(root);
  return found.sort();
}

function snapshot(root) {
  return new Map(filesBelow(root).map(relative => [relative, fs.readFileSync(path.join(root, relative))]));
}

function changedFiles(before, after) {
  const names = [...new Set([...before.keys(), ...after.keys()])].sort();
  return names.filter(name => !before.has(name) || !after.has(name) || !before.get(name).equals(after.get(name)));
}

function proposalFromSaved(saved) {
  const {revision, decisions, ...body} = saved;
  return {...body, baseRevision: revision};
}

function checkMarkdownLinks(root) {
  const broken = [];
  for (const relative of filesBelow(root).filter(name => name.endsWith('.md'))) {
    const file = path.join(root, relative);
    const markdown = fs.readFileSync(file, 'utf8');
    for (const match of markdown.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g)) {
      let target = match[1].trim();
      if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
      target = target.split('#', 1)[0];
      if (!target) continue;
      try {
        target = decodeURIComponent(target);
      } catch {
        broken.push(relative + ': invalid encoded link ' + match[1]);
        continue;
      }
      const absolute = path.resolve(path.dirname(file), target);
      if (!fs.existsSync(absolute)) broken.push(relative + ': ' + match[1]);
    }
  }
  if (broken.length) fail('Broken local Markdown links:\n' + broken.join('\n'));
}

function checkSvgs(root) {
  const svgs = filesBelow(root).filter(name => name.endsWith('.svg'));
  for (const relative of svgs) {
    const contents = fs.readFileSync(path.join(root, relative), 'utf8');
    if (!/<svg\b[^>]*\bviewBox="[^"]+"[^>]*>/i.test(contents) || !/<\/svg>\s*$/i.test(contents)) {
      fail('Malformed SVG wrapper: ' + relative);
    }
    if (contents.includes('\0')) fail('SVG contains a null byte: ' + relative);
  }
  return svgs;
}

function visualTargets(svgs) {
  const groups = [
    /(?:^|\/)icons\.svg$/,
    /button-variants/i,
    /field-.*-(?:400|wide)\.svg$/i,
    /select-.*-(?:400|wide)\.svg$/i,
    /layout-context|layout-details|spacing-context/i,
    /type-/i,
    /theme|palette|color-/i
  ];
  const selected = [];
  for (const pattern of groups) {
    const match = svgs.find(name => pattern.test(name) && !selected.includes(name));
    if (match) selected.push(match);
  }
  if (!selected.length && svgs.length) selected.push(svgs[0]);
  return selected;
}

/**
 * Verify a published design language without changing it.
 * Replays its current proposal in an isolated copy to prove stable refinement.
 */
export function verifyDesignLanguage(baseFolder) {
  const base = path.resolve(baseFolder);
  const source = path.join(base, 'design-language', 'design-language.json');
  if (!fs.statSync(base, {throwIfNoEntry: false})?.isDirectory()) fail('Design base folder does not exist');
  if (!fs.statSync(source, {throwIfNoEntry: false})?.isFile()) fail('Saved design-language source is missing');
  const saved = validate(JSON.parse(fs.readFileSync(source, 'utf8')), true);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'refine-design-verify-'));
  const copy = path.join(temporaryRoot, 'design');
  try {
    fs.cpSync(base, copy, {recursive: true, errorOnExist: true});
    const before = snapshot(copy);
    const result = applyProposal(copy, proposalFromSaved(saved));
    const after = snapshot(copy);
    const changed = changedFiles(before, after);
    if (result.revision !== saved.revision || changed.length) {
      fail('Stable rerender changed the artifact' + (changed.length ? ': ' + changed.join(', ') : ' revision'));
    }
    checkMarkdownLinks(base);
    const svgs = checkSvgs(base);
    return {
      schemaVersion: saved.schemaVersion,
      revision: saved.revision,
      sourceKind: saved.source.kind,
      outcome: result.outcome,
      idempotent: true,
      markdownLinks: 'resolved',
      svgCount: svgs.length,
      missingSections: result.missingSections ?? [],
      rendererGaps: result.rendererGaps ?? [],
      appliedDefaults: result.appliedDefaults,
      visualInspectionRequired: svgs.length > 0,
      visualInspectionTargets: visualTargets(svgs).map(relative => path.join(base, relative))
    };
  } finally {
    fs.rmSync(temporaryRoot, {recursive: true, force: true});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [base, ...rest] = process.argv.slice(2);
    if (!base || rest.length) fail('Usage: node design-language-verify.mjs <design-base>');
    process.stdout.write(JSON.stringify(verifyDesignLanguage(base), null, 2) + '\n');
  } catch (error) {
    process.stderr.write('Design-language verification failed: ' + error.message + '\n');
    process.exitCode = 1;
  }
}
