import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {guardDesignLocks} from './design-lock.mjs';
import {createDefaultReviewConfig, readReviewConfig, planReviewPages} from './design-language-review-pages.mjs';
import {
  validateExtras,
  nextExtrasDocument,
  extrasBlock,
  extrasComponentsBlock,
  extrasDrawings,
  extrasDefaults
} from './design-language-extras.mjs';
import {COMPONENT_BEGIN, COMPONENT_END} from './design-language-components.mjs';
import {documentGaps} from './design-language-document.mjs';
import {resolveThemeValue} from './design-language-theme.mjs';
import {fail, readOptional, rejectLink, publish, renderColorSwatch} from './design-language-support.mjs';

const SCHEMA_VERSION = '0.14';
const RENDERER_VERSION = 'extras-1.2';
const BEGIN = '<!-- refine-design:design-language:start -->';
const END = '<!-- refine-design:design-language:end -->';
const sourceFile = 'design-language/design-language.json';
const documentFile = 'design-language.md';
const allowedOptions = new Set([
  'accept',
  'reason',
  'reviewLayout',
  'lockReason',
  'lockedChangeReason'
]);

/** Validate the sole public design-language proposal and persisted document contract. */
export function validate(value, saved = false) {
  if (value?.schemaVersion !== SCHEMA_VERSION) {
    fail('Unsupported design-language schemaVersion; expected ' + SCHEMA_VERSION);
  }
  return validateExtras(value, saved);
}

function validateOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) fail('Options must be an object');
  for (const key of Object.keys(options)) if (!allowedOptions.has(key)) fail('Unknown option: ' + key);
}

/** Render a current-contract palette member as a compact swatch. */
export function renderSvg(document, color = document?.palette?.members?.[0]) {
  validate(document, Object.hasOwn(document ?? {}, 'revision'));
  if (!color || !document.palette.members.some(member => member.id === color.id)) fail('Unknown palette member');
  return renderColorSwatch({
    color: {
      ...color,
      value: resolveThemeValue(document, 'member:' + color.id).value
    }
  });
}

function block(document) {
  return extrasBlock(document);
}

function drawings(document) {
  return extrasDrawings(document);
}

function updateMarkdown(existing, saved, next) {
  if (!saved) return '<!-- Owner notes may be added above the generated section. -->\n\n' + block(next) + '\n';
  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);
  if (start < 0 || end <= start || existing.indexOf(BEGIN, start + 1) >= 0 || existing.indexOf(END, end + 1) >= 0) {
    fail('Missing or ambiguous generated section');
  }
  if (existing.slice(start, end + END.length).replace(/\r\n/g, '\n') !== block(saved)) {
    fail('Generated Markdown was edited; reconcile before rendering');
  }
  return existing.slice(0, start) + block(next) + existing.slice(end + END.length);
}

function currentMissingSections(document) {
  return documentGaps(document);
}

/** Apply one schema 0.14 proposal while preserving current validation, locking, and generated-output checks. */
export function applyProposal(baseFolder, proposal, options = {}) {
  validate(proposal);
  validateOptions(options);

  const base = path.resolve(baseFolder);
  const specimensFolder = path.join(base, 'design-language/specimens');
  const sourcePath = path.join(base, sourceFile);
  const documentPath = path.join(base, documentFile);
  for (const target of [base, path.join(base, 'design-language'), specimensFolder, sourcePath, documentPath]) {
    rejectLink(target);
  }

  const raw = readOptional(sourcePath);
  const saved = raw === null ? null : validate(JSON.parse(raw), true);
  if (proposal.baseRevision !== (saved?.revision ?? 0)) fail('Stale baseRevision');
  if (saved && saved.id !== proposal.id) fail('Preserve document ID');

  const next = nextExtrasDocument(saved, proposal, options);
  validate(next, true);
  guardDesignLocks(sourcePath, next, options);

  const savedDrawings = saved ? drawings(saved) : new Map();
  for (const [relative, content] of savedDrawings) {
    const target = path.join(base, relative);
    rejectLink(target);
    const actual = readOptional(target);
    if (actual === null || actual !== content) fail('Generated SVG was edited or is missing: ' + relative);
  }

  const existingMarkdown = readOptional(documentPath);
  if (!saved && existingMarkdown !== null) fail('Existing document has no saved source');
  if (saved && existingMarkdown === null) fail('Existing Markdown is missing');

  const oldReview = readReviewConfig(base);
  if (
    options.reviewLayout !== undefined
    && options.reviewLayout !== 'pages'
    && (options.reviewLayout === null || typeof options.reviewLayout !== 'object')
  ) {
    fail('Invalid review layout option');
  }
  const review = options.reviewLayout === 'pages'
    ? (oldReview ?? createDefaultReviewConfig())
    : options.reviewLayout ?? oldReview;
  const reviewOutputs = review
    ? planReviewPages(
      base,
      saved,
      next,
      oldReview,
      review,
      saved ? extrasComponentsBlock(saved) : null,
      extrasComponentsBlock(next)
    )
    : null;
  const markdown = reviewOutputs?.get(documentFile) ?? updateMarkdown(existingMarkdown, saved, next);
  const nextDrawings = drawings(next);
  const outputs = new Map([
    [sourceFile, JSON.stringify(next, null, 2) + '\n'],
    ...nextDrawings,
    [documentFile, markdown],
    ...(reviewOutputs ?? [])
  ]);

  if (!review) {
    const componentPath = path.join(base, 'components.md');
    rejectLink(componentPath);
    const existing = readOptional(componentPath);
    const expected = saved ? extrasComponentsBlock(saved) : null;
    const generated = extrasComponentsBlock(next);
    let componentMarkdown;
    if (expected === null) {
      if (existing !== null) fail('Refusing to overwrite unowned components.md');
      componentMarkdown = '<!-- Owner notes may be added above the generated section. -->\n\n' + generated + '\n';
    } else {
      if (existing === null) fail('Existing components.md is missing');
      const start = existing.indexOf(COMPONENT_BEGIN);
      const end = existing.indexOf(COMPONENT_END);
      if (
        start < 0
        || end <= start
        || existing.indexOf(COMPONENT_BEGIN, start + 1) >= 0
        || existing.indexOf(COMPONENT_END, end + 1) >= 0
      ) {
        fail('Missing or ambiguous component markers');
      }
      if (existing.slice(start, end + COMPONENT_END.length).replace(/\r\n/g, '\n') !== expected) {
        fail('Generated components.md was edited; reconcile before rendering');
      }
      componentMarkdown = existing.slice(0, start) + generated + existing.slice(end + COMPONENT_END.length);
    }
    outputs.set('components.md', componentMarkdown);
  }

  const files = [...outputs.keys()].map(relative => path.join(base, relative));
  files.forEach(rejectLink);
  const previousContents = files.map(readOptional);
  [...outputs.keys()].forEach((relative, index) => {
    if (
      !reviewOutputs?.has(relative)
      && relative !== sourceFile
      && relative !== documentFile
      && relative !== 'components.md'
      && !savedDrawings.has(relative)
      && previousContents[index] !== null
    ) {
      fail('Refusing to overwrite unowned SVG: ' + relative);
    }
  });

  fs.mkdirSync(specimensFolder, {recursive: true});
  publish(base, files, [...outputs.values()], previousContents);
  return {
    rendererVersion: RENDERER_VERSION,
    revision: next.revision,
    sourceKind: next.source.kind,
    outcome: 'partial',
    missingSections: currentMissingSections(next),
    rendererGaps: ['toggle-buttons', 'embedded-field-states'],
    components: path.join(base, 'components.md'),
    ...(review
      ? {
        reviewLayout: 'pages',
        pages: [...reviewOutputs.keys()]
          .filter(relative => relative.endsWith('.md'))
          .map(relative => path.join(base, relative))
      }
      : {}),
    document: documentPath,
    source: sourcePath,
    svgs: [
      ...nextDrawings.keys(),
      ...[...(reviewOutputs?.keys() ?? [])].filter(relative => relative.endsWith('.svg'))
    ].map(relative => path.join(base, relative)),
    appliedDefaults: extrasDefaults(next)
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [base, input, ...args] = process.argv.slice(2);
    if (!base || !input) {
      fail(
        'Usage: node design-language.mjs <base> <proposal.json|->'
        + ' [--accept <target>] [--reason <owner-decision>] [--review-layout pages]'
        + ' [--lock-reason <current-user-request>] [--locked-change-reason <current-user-request>]'
      );
    }
    const options = {accept: []};
    for (let index = 0; index < args.length; index += 2) {
      if (!args[index + 1]) fail('Missing option value');
      if (args[index] === '--accept') options.accept.push(args[index + 1]);
      else if (args[index] === '--reason') options.reason = args[index + 1];
      else if (args[index] === '--review-layout' && args[index + 1] === 'pages') options.reviewLayout = 'pages';
      else if (args[index] === '--lock-reason') options.lockReason = args[index + 1];
      else if (args[index] === '--locked-change-reason') options.lockedChangeReason = args[index + 1];
      else fail('Unknown option: ' + args[index]);
    }
    const inputData = JSON.parse(fs.readFileSync(input === '-' ? 0 : input, 'utf8'));
    process.stdout.write(JSON.stringify(applyProposal(base, inputData, options), null, 2) + '\n');
  } catch (error) {
    process.stderr.write('Design-language rendering failed: ' + error.message + '\n');
    process.exitCode = 1;
  }
}
