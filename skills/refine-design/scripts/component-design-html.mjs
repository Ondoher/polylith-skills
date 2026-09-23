import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {validateComponentDesign} from './component-design.mjs';
import {buildDesignLanguageAssetOutputs, DESIGN_LANGUAGE_HTML_MARKER} from './design-language-html.mjs';
import {createDefaultReviewConfig, validateReviewConfig} from './design-language-review-pages.mjs';
import {authorizeAssetRoot} from './input-security.mjs';
import {buildUiCompositionHtml, UI_COMPOSITION_HTML_MARKER} from './ui-composition-html.mjs';

export const COMPONENT_DESIGN_HTML_GENERATOR = 'refine-design:component-design-html:v1';
export const COMPONENT_DESIGN_HTML_VERSION = 'component-design-html-1.2';

function fail(message) { throw new Error(message); }
function hash(value) { return createHash('sha256').update(value).digest('hex'); }

function readJson(file, label) {
  const absolute = path.resolve(file);
  let source;
  try { source = fs.readFileSync(absolute, 'utf8'); } catch { fail(`${label} is missing: ${absolute}`); }
  let value;
  try { value = JSON.parse(source); } catch { fail(`${label} is not valid JSON`); }
  return {absolute, source, value};
}

function readDesignLayout(designFile, explicitFile) {
  const candidate = path.resolve(explicitFile ?? path.join(path.dirname(designFile), 'review-layout.json'));
  if (!fs.existsSync(candidate)) {
    if (explicitFile) fail(`Review-layout source is missing: ${candidate}`);
    return createDefaultReviewConfig();
  }
  if (fs.lstatSync(candidate).isSymbolicLink()) fail(`Review-layout source must not be a symbolic link: ${candidate}`);
  let value;
  try { value = JSON.parse(fs.readFileSync(candidate, 'utf8')); } catch { fail('Review-layout source is not valid JSON'); }
  return validateReviewConfig(value);
}

function mappedPath(relative, componentId) {
  if (relative === 'comps/index.html') return 'component-comps/index.html';
  if (relative.startsWith('comps/')) return relative.replace(/^comps\//, 'component-comps/');
  if (relative === 'assets/composition.css') return 'assets/component-composition.css';
  if (relative === 'ui/render-report.json') return `ui/components/${componentId}-render-report.json`;
  return relative;
}

function mappedContent(relative, content, artifactKind) {
  if (relative === 'assets/composition.css') {
    return `${content}\n/* Focused component pages fill their registered surface box without responsive review scaling. */\nbody:has(#scene:target) #scene { width: 100%; zoom: 1 !important; }\nbody:has(#scene:target) .ui-viewport { width: 100%; height: 100%; }\n`;
  }
  if (!relative.endsWith('.html')) return content;
  const mapped = content
    .replaceAll('../assets/composition.css', '../assets/component-composition.css')
    .replaceAll('Product UI', 'Component comps')
    .replaceAll('Product Comps', 'Component Comps')
    .replaceAll('Product comps', 'Component comps')
    .replaceAll('product comp', 'component comp');
  if (artifactKind === 'comp') return mapped;
  return mapped
    .replaceAll('Component Comps', 'Component Wireframes')
    .replaceAll('Component comps', 'Component wireframes')
    .replaceAll('component comp', 'component wireframe')
    .replaceAll('Clean comp', 'Clean wireframe')
    .replaceAll('Annotated comp', 'Annotated wireframe');
}

/** Build focused component comp outputs without writing them. */
export function buildComponentDesignHtml(spec, {uxSpec, designLanguage, designLayout = createDefaultReviewConfig(), componentSource = '', uxSource = '', designSource = '', componentLabel = 'ui/components/component-design.json', uxLabel = 'ux/ux-spec.json', designLabel = 'ui-design/design-language/design-language.json', assetRoot, sourceRoot} = {}) {
  validateComponentDesign(spec, {uxSpec, designLanguage, assetRoot, sourceRoot});
  const built = buildUiCompositionHtml(spec, {
    uxSpec,
    designLanguage,
    uiSource: componentSource,
    uxSource,
    designSource,
    uiLabel: componentLabel,
    uxLabel,
    designLabel,
    assetRoot,
    sourceRoot,
    documentKind: 'component',
  });
  const outputs = new Map();
  for (const [relative, content] of built.outputs) {
    if (relative === 'ui/render-report.json') continue;
    outputs.set(mappedPath(relative, spec.componentTemplate.id), mappedContent(relative, content, spec.artifactKind));
  }
  for (const [relative, content] of buildDesignLanguageAssetOutputs(designLanguage, designLayout)) outputs.set(relative, content);
  const reportPath = `ui/components/${spec.componentTemplate.id}-render-report.json`;
  const report = {
    generator: COMPONENT_DESIGN_HTML_GENERATOR,
    rendererVersion: COMPONENT_DESIGN_HTML_VERSION,
    sources: {
      component: {id: spec.id, schemaVersion: spec.schemaVersion, revision: spec.revision, sha256: hash(componentSource || `${JSON.stringify(spec, null, 2)}\n`), label: componentLabel},
      ux: built.report.sources.ux,
      designLanguage: built.report.sources.designLanguage,
    },
    componentTemplate: {
      id: spec.componentTemplate.id,
      version: spec.componentTemplate.version,
      uxRef: spec.componentTemplate.uxRef,
      replacesTemplateRef: spec.componentTemplate.replacesTemplateRef,
      supportedStates: spec.componentTemplate.supportedStates,
      promotion: spec.promotion,
    },
    artifactKind: spec.artifactKind,
    patternResearch: spec.patternResearch,
    outcome: built.report.outcome,
    counts: built.report.counts,
    files: [...outputs.keys(), reportPath].sort(),
  };
  outputs.set(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return {outputs, report};
}

function safeTarget(outputRoot, relative) {
  const root = path.resolve(outputRoot);
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) fail(`Output escapes destination: ${relative}`);
  if (fs.existsSync(root) && fs.lstatSync(root).isSymbolicLink()) fail(`Refusing linked output root: ${root}`);
  let current = root;
  for (const part of path.relative(root, target).split(path.sep).slice(0, -1)) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail(`Refusing linked output path: ${current}`);
  }
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) fail(`Refusing linked output file: ${target}`);
  return target;
}

function assertOwned(target, relative, content) {
  if (!fs.existsSync(target)) return;
  if (Buffer.isBuffer(content)) {
    if (!fs.readFileSync(target).equals(content)) fail(`Refusing to overwrite an unowned or changed media asset: ${relative}`);
    return;
  }
  const existing = fs.readFileSync(target, 'utf8');
  if (relative.endsWith('render-report.json')) {
    let report;
    try { report = JSON.parse(existing); } catch { fail(`Refusing to overwrite unowned report: ${relative}`); }
    if (report.generator !== COMPONENT_DESIGN_HTML_GENERATOR) fail(`Refusing to overwrite unowned report: ${relative}`);
  } else if (relative === 'assets/prd.css') {
    if (!existing.includes(DESIGN_LANGUAGE_HTML_MARKER)) fail(`Refusing to overwrite unowned generated file: ${relative}`);
  } else if (!existing.includes(UI_COMPOSITION_HTML_MARKER)) fail(`Refusing to overwrite unowned generated file: ${relative}`);
}

/** Publish focused clean and annotated component comps. */
export function publishComponentDesignHtml(componentFile, uxFile, designFile, outputRoot, options = {}) {
  const component = readJson(componentFile, 'Component-design source');
  const ux = readJson(uxFile, 'UX source');
  const design = readJson(designFile, 'Design-language source');
  if (!options.sourceRoot) fail('Component-design HTML publication requires an explicit sourceRoot');
  const authorized = authorizeAssetRoot(
    options.assetRoot ?? path.dirname(component.absolute),
    options.sourceRoot,
    'component assetRoot',
  );
  const built = buildComponentDesignHtml(component.value, {
    uxSpec: ux.value,
    designLanguage: design.value,
    componentSource: component.source,
    uxSource: ux.source,
    designSource: design.source,
    designLayout: readDesignLayout(design.absolute, options.layoutFile),
    componentLabel: options.componentLabel ?? path.basename(component.absolute),
    uxLabel: options.uxLabel ?? path.basename(ux.absolute),
    designLabel: options.designLabel ?? path.basename(design.absolute),
    assetRoot: authorized.assetRoot,
    sourceRoot: authorized.sourceRoot,
  });
  const planned = [...built.outputs].map(([relative, content]) => {
    const target = safeTarget(outputRoot, relative);
    assertOwned(target, relative, content);
    return {target, content};
  });
  for (const {target} of planned) fs.mkdirSync(path.dirname(target), {recursive: true});
  for (const {target, content} of planned) fs.writeFileSync(target, content, Buffer.isBuffer(content) ? undefined : 'utf8');
  return {...built.report, outputRoot: path.resolve(outputRoot)};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [component, ux, design, output, ...args] = process.argv.slice(2);
    if (!component || !ux || !design || !output) fail('Usage: node component-design-html.mjs <component-design.json> <ux-spec.json> <design-language.json> <prd-output-root> --source-root <authoritative-source-root> [--asset-root <component-asset-root>] [--layout <review-layout.json>]');
    const options = {};
    for (let index = 0; index < args.length; index += 2) {
      const flag = args[index], value = args[index + 1];
      if (!value) fail(`Missing value for ${flag}`);
      if (flag === '--source-root') options.sourceRoot = path.resolve(value);
      else if (flag === '--asset-root') options.assetRoot = path.resolve(value);
      else if (flag === '--layout') options.layoutFile = path.resolve(value);
      else fail(`Unknown option: ${flag}`);
    }
    if (!options.sourceRoot) fail('Component-design HTML publication requires --source-root');
    process.stdout.write(`${JSON.stringify(publishComponentDesignHtml(component, ux, design, output, options), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
