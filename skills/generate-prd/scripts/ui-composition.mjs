import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {guardDesignLocks} from './design-lock.mjs';
import {validate as validateDesignLanguage} from './design-language.mjs';
import {authorizeAssetRoot} from './input-security.mjs';
import {ROOT_BOUND_TARGETS, writeOwnedJsonArtifact} from './root-bound-artifact.mjs';
import {validateUxSpec} from './ux-design.mjs';
import {validatePassingUxReview} from './ux-review.mjs';

const statuses = new Set(['default', 'proposed', 'accepted', 'locked', 'unresolved']);
const assessmentKinds = new Set(['ui-designer-assessment', 'parent-assessment']);
const sourceKinds = new Set(['ux', 'design-language', 'component-library', 'asset']);
const availabilityKinds = new Set(['available', 'placeholder']);
const subjectKinds = new Set(['surface', 'component']);
const nodeKinds = new Set(['region', 'component']);
const trackUnits = new Set(['px', 'fr', 'content']);
const sizeModes = new Set(['content', 'fill', 'fixed']);
const styleKinds = new Set(['color-role', 'typography-role', 'icon']);
const htmlRenderers = new Set(['heading', 'text', 'status', 'button', 'icon-button', 'text-field', 'choice-group', 'image', 'visual', 'placeholder']);
const htmlElements = new Set(['div', 'section', 'header', 'footer', 'nav', 'h1', 'h2', 'h3', 'p', 'span', 'button']);
const visualRoles = new Set([
  'surface', 'item', 'selection', 'start-handle', 'end-handle', 'indicator', 'thumbnail', 'trigger', 'label',
  'track', 'thumb', 'divider'
]);
const visualVariants = new Set([
  'neutral', 'brand', 'dark', 'grid', 'major', 'minor', 'selected', 'compact', 'masked', 'header', 'numeric',
  'pattern-a', 'pattern-b', 'pattern-c', 'warning', 'valid', 'invalid', 'drag', 'outlined', 'horizontal', 'flat',
  'elevation-1'
]);
const imageMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const imageFitModes = new Set(['contain', 'cover']);
const surfaceTreatments = new Set(['flat', 'outlined', 'elevation-1']);
const imageSizeLimit = 20 * 1024 * 1024;
const compositionRootKeys = [
  'schemaVersion', 'id', 'title', 'revision', 'status', 'assessment', 'sources', 'uxSource',
  'designLanguageSource', 'tokens', 'templates', 'assets', 'scenes', 'renderRequests',
  'unspecifiedRequirements', 'uxChangeRequests', 'openQuestions'
];
const componentRootKeys = ['designMode', 'artifactKind', 'patternResearch', 'fidelity', 'componentTemplate', 'promotion'];

function fail(message) {
  throw new Error(message);
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}

function allowedKeys(value, keys, label) {
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(`${label} has unsupported field ${key}`);
}

function list(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
}

function text(value, label) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} must be non-empty text`);
  return value;
}

function boolean(value, label) {
  if (typeof value !== 'boolean') fail(`${label} must be boolean`);
  return value;
}

function finite(value, label, minimum = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) fail(`${label} must be a finite number >= ${minimum}`);
  return value;
}

function signedFinite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${label} must be a finite number`);
  return value;
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) fail(`${label} must be a positive integer`);
  return value;
}

function revision(value, label) {
  if ((typeof value !== 'string' || value.trim() === '') && (!Number.isInteger(value) || value < 0)) {
    fail(`${label} must be non-empty text or a non-negative integer`);
  }
  return value;
}

function status(value, label) {
  if (!statuses.has(value)) fail(`${label} has unsupported status ${String(value)}`);
}

function textList(value, label, {nonempty = false} = {}) {
  const result = list(value, label).map((item, index) => text(item, `${label}[${index}]`));
  if (nonempty && result.length === 0) fail(`${label} must not be empty`);
  return result;
}

function records(value, label) {
  const result = list(value, label);
  const ids = new Set();
  for (const [index, item] of result.entries()) {
    object(item, `${label}[${index}]`);
    const id = text(item.id, `${label}[${index}].id`);
    if (ids.has(id)) fail(`${label} contains duplicate id ${id}`);
    ids.add(id);
  }
  return {result, ids};
}

/** Preflight only the shape needed to decide whether filesystem asset authority is required. */
export function declaresUiImageAssets(spec) {
  object(spec, 'UI specification');
  const assets = list(spec.assets, 'assets');
  return assets.some((asset, index) => {
    object(asset, `assets[${index}]`);
    return asset.kind === 'image';
  });
}

function reference(id, ids, label) {
  text(id, label);
  if (!ids.has(id)) fail(`${label} references missing id ${id}`);
}

function references(value, ids, label) {
  for (const id of textList(value, label)) reference(id, ids, label);
}

function relativePath(value, label, extension) {
  text(value, label);
  if (path.isAbsolute(value) || /^[a-z][a-z0-9+.-]*:/i.test(value)) fail(`${label} must be a relative path`);
  const normalized = value.replaceAll('\\', '/');
  if (normalized.split('/').includes('..')) fail(`${label} must stay below its artifact root`);
  if (extension && !normalized.toLowerCase().endsWith(extension)) fail(`${label} must end with ${extension}`);
  return normalized;
}

function containedPath(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

function requireCanonicalArtifactTarget(productDocumentRoot, outputPath, expectedRelativeTarget, label) {
  if (typeof outputPath !== 'string' || outputPath.trim() === '') fail(`${label} must be a non-empty path`);
  const root = path.resolve(productDocumentRoot);
  const target = path.isAbsolute(outputPath) ? path.resolve(outputPath) : path.resolve(root, outputPath);
  const relative = path.relative(root, target);
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail(`${label} must stay within the product-document root`);
  }
  const portable = relative.split(path.sep).join('/');
  if (portable !== expectedRelativeTarget) fail(`${label} must use canonical target ${expectedRelativeTarget}`);
  return expectedRelativeTarget;
}

function detectedImageMimeType(bytes) {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length >= 45
    && bytes.subarray(0, 8).equals(pngSignature)
    && bytes.subarray(12, 16).toString('ascii') === 'IHDR'
    && bytes.subarray(bytes.length - 8, bytes.length - 4).toString('ascii') === 'IEND') return 'image/png';
  if (bytes.length >= 4
    && bytes[0] === 0xff && bytes[1] === 0xd8
    && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) return 'image/jpeg';
  if (bytes.length >= 20
    && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
    && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.subarray(12, 16).toString('ascii'))
    && bytes.readUInt32LE(4) + 8 <= bytes.length) return 'image/webp';
  const textPrefix = bytes.subarray(0, Math.min(bytes.length, 4096)).toString('utf8').replace(/^\uFEFF/, '').trimStart();
  if (/^(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/i.test(textPrefix)) return 'image/svg+xml';
  return undefined;
}

function validateSvgBytes(bytes, label) {
  const source = bytes.toString('utf8');
  if (source.includes('\0')
    || /<(?:[A-Za-z_][\w.-]*:)?(?:script|foreignObject|iframe|object|embed|style|animate|animateMotion|animateTransform|set|discard|mpath)\b/i.test(source)
    || /<!doctype\b|<!entity\b|\s(?:on[a-z]+|style|xml:base)\s*=/i.test(source)) {
    fail(`${label} SVG contains active or off-site content`);
  }
  const attributes = source.matchAll(/\s([A-Za-z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/gs);
  for (const match of attributes) {
    const name = match[1].toLowerCase();
    const value = match[3].trim();
    if (name === 'style' || name === 'xml:base' || name.startsWith('on')
      || value.includes('\\') || /&#(?:x0*5c|0*92);/i.test(value)) {
      fail(`${label} SVG contains active or off-site content`);
    }
    if (name === 'href' || name === 'xlink:href') {
      if (/^#[A-Za-z_][A-Za-z0-9_.:-]*$/.test(value)) continue;
      const embedded = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value);
      if (!embedded) fail(`${label} SVG contains active or off-site content`);
      const rasterBytes = Buffer.from(embedded[2], 'base64');
      const canonicalPayload = rasterBytes.toString('base64').replace(/=+$/, '');
      if (rasterBytes.length === 0 || rasterBytes.length > imageSizeLimit
        || canonicalPayload !== embedded[2].replace(/=+$/, '')
        || detectedImageMimeType(rasterBytes) !== `image/${embedded[1].toLowerCase()}`) {
        fail(`${label} SVG contains an invalid embedded raster image`);
      }
      continue;
    }
    if (['src', 'data', 'poster', 'action', 'formaction'].includes(name) && value !== '') {
      fail(`${label} SVG contains active or off-site content`);
    }
    const urlMatches = [...value.matchAll(/url\s*\(\s*(["']?)(.*?)\1\s*\)/gi)];
    if (/url\s*\(/i.test(value) && urlMatches.length === 0) fail(`${label} SVG contains active or off-site content`);
    for (const urlMatch of urlMatches) {
      if (!/^#[A-Za-z_][A-Za-z0-9_.:-]*$/.test(urlMatch[2].trim())) {
        fail(`${label} SVG contains active or off-site content`);
      }
    }
  }
}

/** Resolve and verify one approved UI image without consulting the process working directory. */
export function loadUiImageAsset(asset, assetRoot, sourceRoot) {
  if (typeof assetRoot !== 'string' || assetRoot.trim() === '') fail(`image asset ${asset.id} requires an explicit asset root`);
  if (typeof sourceRoot !== 'string' || sourceRoot.trim() === '') fail(`image asset ${asset.id} requires an explicit source root`);
  const authorized = authorizeAssetRoot(assetRoot, sourceRoot, 'image assetRoot');
  const root = authorized.assetRoot;
  const realRoot = authorized.assetRoot;
  const relative = relativePath(asset.path, `image asset ${asset.id}.path`);
  const candidate = path.resolve(root, relative);
  if (!containedPath(root, candidate)) fail(`image asset ${asset.id}.path escapes its asset root`);
  let absolute;
  try {
    absolute = fs.realpathSync.native(candidate);
  } catch {
    fail(`image asset ${asset.id} is missing below its asset root: ${relative}`);
  }
  if (!containedPath(realRoot, absolute)) fail(`image asset ${asset.id}.path escapes its asset root through a linked path`);
  const metadata = fs.statSync(absolute);
  if (!metadata.isFile()) fail(`image asset ${asset.id}.path must identify a file`);
  if (metadata.size === 0 || metadata.size > imageSizeLimit) fail(`image asset ${asset.id} must be between 1 byte and ${imageSizeLimit} bytes`);
  const bytes = fs.readFileSync(absolute);
  return {absolute, ...validateUiImageAssetBytes(asset, bytes)};
}

/** Verify approved image bytes independently of their filesystem location. */
export function validateUiImageAssetBytes(asset, bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > imageSizeLimit) fail(`image asset ${asset.id} must be between 1 byte and ${imageSizeLimit} bytes`);
  const detectedMimeType = detectedImageMimeType(bytes);
  if (detectedMimeType !== asset.mimeType) fail(`image asset ${asset.id} bytes do not match declared MIME type ${asset.mimeType}`);
  if (detectedMimeType === 'image/svg+xml') validateSvgBytes(bytes, `image asset ${asset.id}`);
  if (typeof asset.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(asset.sha256)) fail(`image asset ${asset.id}.sha256 must be a lowercase SHA-256 digest`);
  const actualHash = createHash('sha256').update(bytes).digest('hex');
  if (actualHash !== asset.sha256) fail(`image asset ${asset.id}.sha256 does not match the approved image bytes`);
  return {bytes, sha256: actualHash, mimeType: detectedMimeType};
}

function jsonValue(value, label, seen = new WeakSet()) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    if (seen.has(value)) fail(`${label} must not contain cycles`);
    seen.add(value);
    value.forEach((item, index) => jsonValue(item, `${label}[${index}]`, seen));
    return;
  }
  if (value && typeof value === 'object') {
    if (seen.has(value)) fail(`${label} must not contain cycles`);
    seen.add(value);
    for (const [key, item] of Object.entries(value)) jsonValue(item, `${label}.${key}`, seen);
    return;
  }
  fail(`${label} must be JSON data`);
}

function metric(value, tokens, label) {
  if (typeof value === 'number') return finite(value, label);
  object(value, label);
  allowedKeys(value, ['tokenRef'], label);
  reference(value.tokenRef, tokens.ids, `${label}.tokenRef`);
}

function constraints(value, label) {
  if (value === undefined) return;
  object(value, label);
  for (const key of ['minWidthPx', 'maxWidthPx', 'minHeightPx', 'maxHeightPx']) {
    if (value[key] !== undefined) finite(value[key], `${label}.${key}`);
  }
  if (value.minWidthPx !== undefined && value.maxWidthPx !== undefined && value.minWidthPx > value.maxWidthPx) fail(`${label} has minWidthPx greater than maxWidthPx`);
  if (value.minHeightPx !== undefined && value.maxHeightPx !== undefined && value.minHeightPx > value.maxHeightPx) fail(`${label} has minHeightPx greater than maxHeightPx`);
}

function htmlContract(value, template, label) {
  object(value, label);
  allowedKeys(value, ['renderer', 'element', 'className'], label);
  if (!htmlRenderers.has(value.renderer)) fail(`${label}.renderer is unsupported`);
  if (!htmlElements.has(value.element)) fail(`${label}.element is unsupported`);
  text(value.className, `${label}.className`);
  if (!/^[a-z][a-z0-9-]*(?: [a-z][a-z0-9-]*)*$/.test(value.className)) fail(`${label}.className must contain lowercase CSS class names`);
  if (template.availability === 'placeholder' && value.renderer !== 'placeholder') fail(`${label}.renderer must be placeholder for a placeholder template`);
  if (template.availability === 'available' && value.renderer === 'placeholder') fail(`${label}.renderer cannot be placeholder for an available template`);
  if (['button', 'icon-button'].includes(value.renderer) && value.element !== 'button') fail(`${label}.element must be button for ${value.renderer}`);
  if (value.renderer === 'choice-group' && !['div', 'nav'].includes(value.element)) fail(`${label}.element must be div or nav for choice-group`);
  if (value.renderer === 'heading' && !['h1', 'h2', 'h3'].includes(value.element)) fail(`${label}.element must be a heading element`);
}

function track(value, label) {
  object(value, label);
  allowedKeys(value, ['unit', 'value'], label);
  if (!trackUnits.has(value.unit)) fail(`${label}.unit is unsupported`);
  if (value.unit === 'content') {
    if (value.value !== undefined) fail(`${label}.value is not used for content tracks`);
  } else {
    finite(value.value, `${label}.value`, value.unit === 'fr' ? Number.EPSILON : 0);
  }
}

function padding(value, tokens, label) {
  if (typeof value === 'number' || (value && value.tokenRef)) return metric(value, tokens, label);
  object(value, label);
  allowedKeys(value, ['top', 'right', 'bottom', 'left'], label);
  for (const edge of ['top', 'right', 'bottom', 'left']) metric(value[edge], tokens, `${label}.${edge}`);
}

function layout(value, tokens, label) {
  object(value, label);
  allowedKeys(value, ['mode', 'columns', 'rows', 'direction', 'wrap', 'gap', 'padding', 'align', 'justify'], label);
  if (value.mode === 'grid') {
    if (value.direction !== undefined || value.wrap !== undefined) fail(`${label} grid cannot declare flex fields`);
    const columns = list(value.columns, `${label}.columns`);
    const rows = list(value.rows, `${label}.rows`);
    if (!columns.length || !rows.length) fail(`${label} grid requires rows and columns`);
    columns.forEach((item, index) => track(item, `${label}.columns[${index}]`));
    rows.forEach((item, index) => track(item, `${label}.rows[${index}]`));
  } else if (value.mode === 'flex') {
    if (value.columns !== undefined || value.rows !== undefined) fail(`${label} flex cannot declare grid tracks`);
    if (!['row', 'column'].includes(value.direction)) fail(`${label}.direction is unsupported`);
    if (value.wrap !== undefined) boolean(value.wrap, `${label}.wrap`);
  } else {
    fail(`${label}.mode is unsupported`);
  }
  metric(value.gap, tokens, `${label}.gap`);
  padding(value.padding, tokens, `${label}.padding`);
  if (value.align !== undefined && !['start', 'center', 'end', 'stretch'].includes(value.align)) fail(`${label}.align is unsupported`);
  if (value.justify !== undefined && !['start', 'center', 'end', 'space-between'].includes(value.justify)) fail(`${label}.justify is unsupported`);
}

function placement(value, label) {
  if (value === undefined) return;
  object(value, label);
  allowedKeys(value, ['row', 'column', 'rowSpan', 'columnSpan'], label);
  for (const key of ['row', 'column', 'rowSpan', 'columnSpan']) {
    if (value[key] !== undefined) positiveInteger(value[key], `${label}.${key}`);
  }
}

function designCatalog(designLanguage) {
  object(designLanguage, 'design-language source');
  text(designLanguage.id, 'design-language source.id');
  revision(designLanguage.revision, 'design-language source.revision');
  const theme = object(designLanguage.theme, 'design-language source.theme');
  const colors = new Set(list(theme.roles, 'design-language source.theme.roles').map((item, index) => text(object(item, `theme role[${index}]`).id, `theme role[${index}].id`)));
  const typography = new Set(list(object(designLanguage.typography, 'design-language source.typography').roles, 'design-language source.typography.roles').map((item, index) => text(object(item, `typography role[${index}]`).id, `typography role[${index}].id`)));
  const icons = new Set(list(designLanguage.icons, 'design-language source.icons').map((item, index) => text(object(item, `icon[${index}]`).id, `icon[${index}].id`)));
  return {themeId: text(theme.id, 'design-language source.theme.id'), colors, typography, icons};
}

function styleRefs(value, catalog, label) {
  for (const [index, item] of list(value ?? [], label).entries()) {
    object(item, `${label}[${index}]`);
    allowedKeys(item, ['kind', 'id'], `${label}[${index}]`);
    if (!styleKinds.has(item.kind)) fail(`${label}[${index}].kind is unsupported`);
    const ids = item.kind === 'color-role' ? catalog.colors : item.kind === 'typography-role' ? catalog.typography : catalog.icons;
    reference(item.id, ids, `${label}[${index}].id`);
  }
}

function sourceBinding(value, kind, sources, actual, label) {
  object(value, label);
  allowedKeys(value, ['sourceId', 'documentId', 'revision'], label);
  reference(value.sourceId, sources.ids, `${label}.sourceId`);
  const source = sources.byId.get(value.sourceId);
  if (source.kind !== kind) fail(`${label}.sourceId must reference a ${kind} source`);
  text(value.documentId, `${label}.documentId`);
  revision(value.revision, `${label}.revision`);
  if (value.documentId !== actual.id || value.revision !== actual.revision) fail(`${label} does not match the supplied ${kind} document identity and revision`);
  if (source.documentId !== value.documentId || source.revision !== value.revision) fail(`${label} disagrees with source ${source.id}`);
}

function uxCatalog(uxSpec) {
  validateUxSpec(uxSpec);
  object(uxSpec, 'UX source');
  if (uxSpec.schemaVersion !== '0.2') fail('UX source must use schema version 0.2');
  text(uxSpec.id, 'UX source.id');
  revision(uxSpec.revision, 'UX source.revision');
  const useCases = records(uxSpec.useCases, 'UX source.useCases');
  const surfaces = records(uxSpec.surfaces, 'UX source.surfaces');
  const components = records(uxSpec.components, 'UX source.components');
  const actions = records(uxSpec.actions, 'UX source.actions');
  const interactionFrames = records(uxSpec.interactionFrames, 'UX source.interactionFrames');
  const questions = records(uxSpec.openQuestions, 'UX source.openQuestions');
  const actionsById = new Map(actions.result.map(item => [item.id, item]));
  const interactionFramesById = new Map(interactionFrames.result.map(item => [item.id, item]));
  const interactionNodesByFrame = new Map();
  for (const frame of interactionFrames.result) {
    const nodes = new Map();
    for (const region of list(frame.regions, `UX interaction frame ${frame.id}.regions`)) {
      for (const content of list(region.content, `UX interaction frame ${frame.id} region ${region.id}.content`)) {
        const id = text(content.id, `UX interaction frame ${frame.id} content.id`);
        if (nodes.has(id)) fail(`UX interaction frame ${frame.id} repeats interaction node ${id}`);
        nodes.set(id, {kind: 'content', record: content, regionRef: region.id});
      }
      for (const affordance of list(region.affordances, `UX interaction frame ${frame.id} region ${region.id}.affordances`)) {
        const id = text(affordance.id, `UX interaction frame ${frame.id} affordance.id`);
        if (nodes.has(id)) fail(`UX interaction frame ${frame.id} repeats interaction node ${id}`);
        reference(affordance.actionRef, actions.ids, `UX interaction frame ${frame.id} affordance ${id}.actionRef`);
        nodes.set(id, {kind: 'affordance', record: affordance, regionRef: region.id});
      }
    }
    interactionNodesByFrame.set(frame.id, nodes);
  }
  return {
    useCases,
    surfaces,
    components,
    actions,
    interactionFrames,
    questions,
    useCasesById: new Map(useCases.result.map(item => [item.id, item])),
    surfacesById: new Map(surfaces.result.map(item => [item.id, item])),
    componentsById: new Map(components.result.map(item => [item.id, item])),
    actionsById,
    interactionFramesById,
    interactionNodesByFrame
  };
}

/** Validate one UI composition document against exact UX and design-language inputs. */
export function validateUiSpec(spec, {
  uxSpec,
  designLanguage,
  renderRoot = 'comps/',
  documentKind = 'composition',
  assetRoot,
  sourceRoot,
}) {
  // UI and component artifacts may depend only on a persisted document using
  // the one current design-language contract. Validate that dependency at the
  // ingress so obsolete or future schemas cannot reach locks or persistence.
  validateDesignLanguage(designLanguage, true);
  object(spec, 'UI specification');
  if (!['composition', 'component'].includes(documentKind)) fail(`Unsupported UI document kind ${documentKind}`);
  allowedKeys(spec, [...compositionRootKeys, ...(documentKind === 'component' ? componentRootKeys : [])], 'UI specification');
  if (spec.schemaVersion !== '0.2') fail('Unsupported UI composition schema version');
  text(spec.id, 'id');
  text(spec.title, 'title');
  revision(spec.revision, 'revision');
  status(spec.status, 'UI specification');
  object(spec.assessment, 'assessment');
  allowedKeys(spec.assessment, ['kind', 'description'], 'assessment');
  if (!assessmentKinds.has(spec.assessment.kind)) fail('assessment.kind is unsupported');
  text(spec.assessment.description, 'assessment.description');

  const sources = records(spec.sources, 'sources');
  sources.byId = new Map(sources.result.map(item => [item.id, item]));
  for (const source of sources.result) {
    allowedKeys(source, ['id', 'kind', 'path', 'documentId', 'revision'], `source ${source.id}`);
    if (!sourceKinds.has(source.kind)) fail(`source ${source.id}.kind is unsupported`);
    relativePath(source.path, `source ${source.id}.path`);
    text(source.documentId, `source ${source.id}.documentId`);
    revision(source.revision, `source ${source.id}.revision`);
  }
  sourceBinding(spec.uxSource, 'ux', sources, uxSpec, 'uxSource');
  sourceBinding(spec.designLanguageSource, 'design-language', sources, designLanguage, 'designLanguageSource');

  const ux = uxCatalog(uxSpec);
  const design = designCatalog(designLanguage);
  const tokens = records(spec.tokens, 'tokens');
  for (const token of tokens.result) {
    allowedKeys(token, ['id', 'kind', 'value', 'unit', 'status', 'source'], `token ${token.id}`);
    if (token.kind !== 'dimension') fail(`token ${token.id}.kind is unsupported`);
    finite(token.value, `token ${token.id}.value`);
    if (token.unit !== 'px') fail(`token ${token.id}.unit is unsupported`);
    status(token.status, `token ${token.id}`);
    object(token.source, `token ${token.id}.source`);
    allowedKeys(token.source, ['kind', 'description', 'designRef'], `token ${token.id}.source`);
    if (!['design-language', 'ui-default'].includes(token.source.kind)) fail(`token ${token.id}.source.kind is unsupported`);
    text(token.source.description, `token ${token.id}.source.description`);
    if (token.source.designRef !== undefined) text(token.source.designRef, `token ${token.id}.source.designRef`);
  }

  const templates = records(spec.templates, 'templates');
  const templatesById = new Map(templates.result.map(item => [item.id, item]));
  const templateMetadata = new Map();
  for (const template of templates.result) {
    allowedKeys(template, ['id', 'name', 'kind', 'version', 'status', 'availability', 'interaction', 'html', 'supportedStates', 'parameters', 'sizing'], `template ${template.id}`);
    text(template.name, `template ${template.id}.name`);
    text(template.kind, `template ${template.id}.kind`);
    revision(template.version, `template ${template.id}.version`);
    status(template.status, `template ${template.id}`);
    if (!availabilityKinds.has(template.availability)) fail(`template ${template.id}.availability is unsupported`);
    if (!['presentational', 'behavioral'].includes(template.interaction)) fail(`template ${template.id}.interaction is unsupported`);
    if (['button', 'icon-button', 'text-field', 'choice-group'].includes(template.html?.renderer) && template.interaction !== 'behavioral') {
      fail(`template ${template.id}.interaction must be behavioral for ${template.html.renderer}`);
    }
    if (template.availability === 'placeholder' && template.status === 'accepted') fail(`placeholder template ${template.id} cannot be accepted`);
    htmlContract(template.html, template, `template ${template.id}.html`);
    textList(template.supportedStates, `template ${template.id}.supportedStates`, {nonempty: true});
    const parameters = records(template.parameters, `template ${template.id}.parameters`);
    for (const parameter of parameters.result) {
      allowedKeys(parameter, ['id', 'required'], `template ${template.id} parameter ${parameter.id}`);
      boolean(parameter.required, `template ${template.id} parameter ${parameter.id}.required`);
    }
    if (template.html.renderer === 'visual' && !parameters.result.some(parameter => parameter.id === 'role' && parameter.required)) {
      fail(`template ${template.id} visual renderer requires a required role parameter`);
    }
    templateMetadata.set(template.id, {
      parameterIds: parameters.ids,
      requiredParameterIds: new Set(parameters.result.filter(item => item.required).map(item => item.id))
    });
    object(template.sizing, `template ${template.id}.sizing`);
    allowedKeys(template.sizing, ['width', 'height', 'widthPx', 'heightPx', 'minWidthPx', 'maxWidthPx', 'minHeightPx', 'maxHeightPx'], `template ${template.id}.sizing`);
    if (!sizeModes.has(template.sizing.width) || !sizeModes.has(template.sizing.height)) fail(`template ${template.id}.sizing uses an unsupported mode`);
    if (template.sizing.width === 'fixed') finite(template.sizing.widthPx, `template ${template.id}.sizing.widthPx`);
    else if (template.sizing.widthPx !== undefined) fail(`template ${template.id}.sizing.widthPx requires fixed width`);
    if (template.sizing.height === 'fixed') finite(template.sizing.heightPx, `template ${template.id}.sizing.heightPx`);
    else if (template.sizing.heightPx !== undefined) fail(`template ${template.id}.sizing.heightPx requires fixed height`);
    constraints(template.sizing, `template ${template.id}.sizing`);
  }

  const assets = records(spec.assets, 'assets');
  for (const asset of assets.result) {
    allowedKeys(asset, ['id', 'kind', 'status', 'path', 'designRef', 'mimeType', 'widthPx', 'heightPx', 'sha256'], `asset ${asset.id}`);
    text(asset.kind, `asset ${asset.id}.kind`);
    status(asset.status, `asset ${asset.id}`);
    if (asset.path !== undefined) relativePath(asset.path, `asset ${asset.id}.path`);
    if (asset.designRef !== undefined) {
      object(asset.designRef, `asset ${asset.id}.designRef`);
      allowedKeys(asset.designRef, ['kind', 'id'], `asset ${asset.id}.designRef`);
      if (asset.designRef.kind !== 'icon') fail(`asset ${asset.id}.designRef.kind is unsupported`);
      reference(asset.designRef.id, design.icons, `asset ${asset.id}.designRef.id`);
    }
    if (asset.path === undefined && asset.designRef === undefined) fail(`asset ${asset.id} needs path or designRef`);
    if (asset.kind === 'image') {
      if (asset.path === undefined) fail(`image asset ${asset.id} requires a path`);
      if (!imageMimeTypes.has(asset.mimeType)) fail(`image asset ${asset.id}.mimeType is unsupported`);
      positiveInteger(asset.widthPx, `image asset ${asset.id}.widthPx`);
      positiveInteger(asset.heightPx, `image asset ${asset.id}.heightPx`);
      loadUiImageAsset(asset, assetRoot, sourceRoot);
    } else if (asset.sha256 !== undefined || asset.mimeType !== undefined || asset.widthPx !== undefined || asset.heightPx !== undefined) {
      fail(`non-image asset ${asset.id} cannot declare image metadata`);
    }
  }

  const questions = records(spec.openQuestions, 'openQuestions');
  for (const question of questions.result) {
    allowedKeys(question, ['id', 'question', 'owner', 'why', 'affects', 'status'], `question ${question.id}`);
    text(question.question, `question ${question.id}.question`);
    text(question.owner, `question ${question.id}.owner`);
    text(question.why, `question ${question.id}.why`);
    textList(question.affects, `question ${question.id}.affects`);
    if (!['open', 'answered'].includes(question.status)) fail(`question ${question.id}.status is unsupported`);
  }

  const unspecified = records(spec.unspecifiedRequirements, 'unspecifiedRequirements');
  for (const requirement of unspecified.result) {
    allowedKeys(requirement, ['id', 'description', 'owner', 'affects', 'blocks', 'status', 'questionRef'], `unspecified requirement ${requirement.id}`);
    text(requirement.description, `unspecified requirement ${requirement.id}.description`);
    if (!['product', 'ux', 'ui'].includes(requirement.owner)) fail(`unspecified requirement ${requirement.id}.owner is unsupported`);
    textList(requirement.affects, `unspecified requirement ${requirement.id}.affects`, {nonempty: true});
    textList(requirement.blocks, `unspecified requirement ${requirement.id}.blocks`);
    if (requirement.status !== 'unresolved') fail(`unspecified requirement ${requirement.id}.status must be unresolved`);
    if (requirement.questionRef !== undefined) {
      object(requirement.questionRef, `unspecified requirement ${requirement.id}.questionRef`);
      allowedKeys(requirement.questionRef, ['source', 'id'], `unspecified requirement ${requirement.id}.questionRef`);
      if (requirement.questionRef.source === 'ux') reference(requirement.questionRef.id, ux.questions.ids, `unspecified requirement ${requirement.id}.questionRef.id`);
      else if (requirement.questionRef.source === 'ui') reference(requirement.questionRef.id, questions.ids, `unspecified requirement ${requirement.id}.questionRef.id`);
      else fail(`unspecified requirement ${requirement.id}.questionRef.source is unsupported`);
    }
  }

  const uxChangeRequests = records(spec.uxChangeRequests, 'uxChangeRequests');
  const scenes = records(spec.scenes, 'scenes');
  const collectNodes = (node, result = new Map()) => {
    result.set(node.id, node);
    if (node.kind === 'region') node.children.forEach(child => collectNodes(child, result));
    return result;
  };
  const validateTransientBehavior = (scene, surface, frame) => {
    if (scene.transientBehavior === undefined) return;
    const transient = object(scene.transientBehavior, `scene ${scene.id}.transientBehavior`);
    allowedKeys(transient, ['presentation', 'focusOrder', 'initialFocusRef', 'initialFocusRationale', 'returnFocusRef', 'actionGroupRef', 'cancellation', 'height'], `scene ${scene.id}.transientBehavior`);
    if (!['dialog', 'popover', 'menu'].includes(transient.presentation)) fail(`scene ${scene.id}.transientBehavior.presentation is unsupported`);
    if (![surface.kind, frame.kind].some(kind => ['dialog', 'popover', 'menu', 'transient'].includes(kind))) {
      fail(`scene ${scene.id}.transientBehavior requires a transient UX surface or interaction-frame kind`);
    }
    const nodes = collectNodes(scene.root);
    const focusOrder = textList(transient.focusOrder, `scene ${scene.id}.transientBehavior.focusOrder`, {nonempty: true});
    for (const nodeId of focusOrder) {
      const node = nodes.get(nodeId);
      if (!node) fail(`scene ${scene.id}.transientBehavior.focusOrder references missing node ${nodeId}`);
      if (node.kind !== 'component') fail(`scene ${scene.id}.transientBehavior.focusOrder node ${nodeId} must be a component`);
    }
    text(transient.initialFocusRef, `scene ${scene.id}.transientBehavior.initialFocusRef`);
    if (transient.initialFocusRef !== focusOrder[0]) fail(`scene ${scene.id}.transientBehavior.initialFocusRef must be the first focus-order node`);
    text(transient.initialFocusRationale, `scene ${scene.id}.transientBehavior.initialFocusRationale`);
    text(transient.returnFocusRef, `scene ${scene.id}.transientBehavior.returnFocusRef`);
    text(transient.actionGroupRef, `scene ${scene.id}.transientBehavior.actionGroupRef`);
    if (nodes.get(transient.actionGroupRef)?.kind !== 'region') fail(`scene ${scene.id}.transientBehavior.actionGroupRef must reference a region`);
    const cancellation = object(transient.cancellation, `scene ${scene.id}.transientBehavior.cancellation`);
    allowedKeys(cancellation, ['escape', 'outside', 'result', 'nodeRef', 'interactionNodeRef', 'actionRef'], `scene ${scene.id}.transientBehavior.cancellation`);
    if (!['dismiss', 'ignore'].includes(cancellation.escape)) fail(`scene ${scene.id}.transientBehavior.cancellation.escape is unsupported`);
    if (!['dismiss', 'ignore', 'not-applicable'].includes(cancellation.outside)) fail(`scene ${scene.id}.transientBehavior.cancellation.outside is unsupported`);
    text(cancellation.result, `scene ${scene.id}.transientBehavior.cancellation.result`);
    if (cancellation.nodeRef !== undefined || cancellation.interactionNodeRef !== undefined || cancellation.actionRef !== undefined) {
      text(cancellation.nodeRef, `scene ${scene.id}.transientBehavior.cancellation.nodeRef`);
      const node = nodes.get(cancellation.nodeRef);
      if (node?.kind !== 'component') fail(`scene ${scene.id}.transientBehavior.cancellation.nodeRef must reference a component`);
      text(cancellation.interactionNodeRef, `scene ${scene.id}.transientBehavior.cancellation.interactionNodeRef`);
      text(cancellation.actionRef, `scene ${scene.id}.transientBehavior.cancellation.actionRef`);
      if (node.interactionNodeRef !== cancellation.interactionNodeRef || node.actionRef !== cancellation.actionRef) {
        fail(`scene ${scene.id}.transientBehavior.cancellation must match its bound behavioral node`);
      }
    }
    const height = object(transient.height, `scene ${scene.id}.transientBehavior.height`);
    allowedKeys(height, ['mode', 'maxPx'], `scene ${scene.id}.transientBehavior.height`);
    if (height.mode !== 'content') fail(`scene ${scene.id}.transientBehavior.height.mode must be content`);
    if (height.maxPx !== undefined) positiveInteger(height.maxPx, `scene ${scene.id}.transientBehavior.height.maxPx`);
  };
  const visitNode = (node, context, label, nodeIds, seenObjects) => {
    object(node, label);
    if (seenObjects.has(node)) fail(`${label} must not reuse or cycle node objects`);
    seenObjects.add(node);
    const id = text(node.id, `${label}.id`);
    if (nodeIds.has(id)) fail(`scene ${context.scene.id} contains duplicate node id ${id}`);
    nodeIds.add(id);
    if (!nodeKinds.has(node.kind)) fail(`${label}.kind is unsupported`);
    const commonKeys = ['id', 'kind', 'placement', 'constraints', 'styleRefs', 'assetRefs'];
    const regionKeys = ['label', 'surfaceTreatment', 'uxRegionRef', 'layout', 'children'];
    const componentKeys = ['uxRef', 'templateRef', 'interactionNodeRef', 'actionRef', 'state', 'parameters', 'content', 'placeholder'];
    allowedKeys(node, [...commonKeys, ...(node.kind === 'region' ? regionKeys : componentKeys)], label);
    placement(node.placement, `${label}.placement`);
    if (node.constraints !== undefined) allowedKeys(node.constraints, ['minWidthPx', 'maxWidthPx', 'minHeightPx', 'maxHeightPx'], `${label}.constraints`);
    constraints(node.constraints, `${label}.constraints`);
    styleRefs(node.styleRefs, design, `${label}.styleRefs`);
    references(node.assetRefs ?? [], assets.ids, `${label}.assetRefs`);

    if (node.kind === 'region') {
      if (node.label !== undefined) text(node.label, `${label}.label`);
      if (node.surfaceTreatment !== undefined && !surfaceTreatments.has(node.surfaceTreatment)) fail(`${label}.surfaceTreatment is unsupported`);
      if (node.uxRegionRef !== undefined) {
        reference(node.uxRegionRef, context.regionIds, `${label}.uxRegionRef`);
        if (context.boundRegionIds.has(node.uxRegionRef)) fail(`scene ${context.scene.id} binds UX region ${node.uxRegionRef} more than once`);
        context.boundRegionIds.add(node.uxRegionRef);
      }
      layout(node.layout, tokens, `${label}.layout`);
      const children = list(node.children, `${label}.children`);
      if (!children.length) fail(`${label}.children must not be empty`);
      if (node.layout.mode === 'grid') {
        children.forEach((child, index) => {
          const childPlacement = object(child.placement, `${label}.children[${index}].placement`);
          positiveInteger(childPlacement.row, `${label}.children[${index}].placement.row`);
          positiveInteger(childPlacement.column, `${label}.children[${index}].placement.column`);
          const rowSpan = childPlacement.rowSpan ?? 1;
          const columnSpan = childPlacement.columnSpan ?? 1;
          positiveInteger(rowSpan, `${label}.children[${index}].placement.rowSpan`);
          positiveInteger(columnSpan, `${label}.children[${index}].placement.columnSpan`);
          if (childPlacement.row + rowSpan - 1 > node.layout.rows.length) fail(`${label}.children[${index}] exceeds the declared grid rows`);
          if (childPlacement.column + columnSpan - 1 > node.layout.columns.length) fail(`${label}.children[${index}] exceeds the declared grid columns`);
        });
      }
      children.forEach((child, index) => visitNode(child, context, `${label}.children[${index}]`, nodeIds, seenObjects));
      return;
    }

    if (node.uxRef !== undefined) {
      reference(node.uxRef, ux.components.ids, `${label}.uxRef`);
      const uxComponent = ux.componentsById.get(node.uxRef);
      if (!['accepted', 'locked'].includes(uxComponent.status)) fail(`${label}.uxRef must reference an accepted or locked UX component`);
      if (!uxComponent.surfaceRefs.includes(context.surface.id)) fail(`${label}.uxRef is not available on surface ${context.surface.id}`);
    }
    object(node.templateRef, `${label}.templateRef`);
    allowedKeys(node.templateRef, ['id', 'version'], `${label}.templateRef`);
    reference(node.templateRef.id, templates.ids, `${label}.templateRef.id`);
    const template = templatesById.get(node.templateRef.id);
    const metadata = templateMetadata.get(template.id);
    if (node.templateRef.version !== template.version) fail(`${label}.templateRef.version does not match template ${template.id}`);
    const hasInteractionNodeRef = node.interactionNodeRef !== undefined;
    const hasActionRef = node.actionRef !== undefined;
    if (template.interaction === 'behavioral' || hasInteractionNodeRef || hasActionRef) {
      if (template.interaction !== 'behavioral') fail(`${label} cannot bind behavior through presentational template ${template.id}`);
      text(node.interactionNodeRef, `${label}.interactionNodeRef`);
      text(node.actionRef, `${label}.actionRef`);
      const interactionNode = context.interactionNodes.get(node.interactionNodeRef);
      if (!interactionNode) fail(`${label}.interactionNodeRef references missing interaction node ${node.interactionNodeRef} in frame ${context.frame.id}`);
      if (interactionNode.kind !== 'affordance') fail(`${label}.interactionNodeRef must reference a UX affordance`);
      if (interactionNode.record.actionRef !== node.actionRef) fail(`${label}.actionRef must match UX affordance ${node.interactionNodeRef}`);
      reference(node.actionRef, ux.actions.ids, `${label}.actionRef`);
      if (!['accepted', 'locked'].includes(ux.actionsById.get(node.actionRef).status)) fail(`${label}.actionRef must reference an accepted or locked UX action`);
      if (context.boundInteractionNodeIds.has(node.interactionNodeRef)) fail(`scene ${context.scene.id} binds UX affordance ${node.interactionNodeRef} more than once`);
      context.boundInteractionNodeIds.add(node.interactionNodeRef);
    }
    text(node.state, `${label}.state`);
    if (!template.supportedStates.includes(node.state)) fail(`${label}.state is not supported by template ${template.id}`);
    object(node.parameters, `${label}.parameters`);
    for (const key of Object.keys(node.parameters)) reference(key, metadata.parameterIds, `${label}.parameters.${key}`);
    for (const required of metadata.requiredParameterIds) {
      if (!Object.hasOwn(node.parameters, required)) fail(`${label}.parameters is missing required parameter ${required}`);
    }
    if (template.html.renderer === 'visual' && !visualRoles.has(node.parameters.role)) {
      fail(`${label}.parameters.role is unsupported for the visual renderer`);
    }
    if (template.html.renderer === 'visual' && node.parameters.variant !== undefined && !visualVariants.has(node.parameters.variant)) {
      fail(`${label}.parameters.variant is unsupported for the visual renderer`);
    }
    if (template.html.renderer === 'choice-group') {
      text(node.parameters.label, `${label}.parameters.label`);
      if (!['tabs', 'list', 'select'].includes(node.parameters.presentation)) {
        fail(`${label}.parameters.presentation is unsupported for the choice-group renderer`);
      }
      const options = list(node.parameters.options, `${label}.parameters.options`);
      if (!options.length) fail(`${label}.parameters.options must not be empty`);
      const optionIds = new Set();
      for (const [index, optionValue] of options.entries()) {
        const option = object(optionValue, `${label}.parameters.options[${index}]`);
        allowedKeys(option, ['id', 'label', 'secondary', 'disabled', 'group'], `${label}.parameters.options[${index}]`);
        const optionId = text(option.id, `${label}.parameters.options[${index}].id`);
        if (optionIds.has(optionId)) fail(`${label}.parameters.options contains duplicate id ${optionId}`);
        optionIds.add(optionId);
        text(option.label, `${label}.parameters.options[${index}].label`);
        if (option.secondary !== undefined) text(option.secondary, `${label}.parameters.options[${index}].secondary`);
        if (option.disabled !== undefined) boolean(option.disabled, `${label}.parameters.options[${index}].disabled`);
        if (option.group !== undefined) {
          text(option.group, `${label}.parameters.options[${index}].group`);
          if (node.parameters.presentation !== 'list') {
            fail(`${label}.parameters.options[${index}].group is supported only for list presentation`);
          }
        }
      }
      if (node.parameters.selectedId !== undefined && !optionIds.has(text(node.parameters.selectedId, `${label}.parameters.selectedId`))) {
        fail(`${label}.parameters.selectedId references a missing option`);
      }
      if (node.parameters.disabled !== undefined) boolean(node.parameters.disabled, `${label}.parameters.disabled`);
    }
    if (template.html.renderer === 'image') {
      reference(node.parameters.assetId, assets.ids, `${label}.parameters.assetId`);
      const imageAsset = assets.result.find(asset => asset.id === node.parameters.assetId);
      if (imageAsset.kind !== 'image') fail(`${label}.parameters.assetId must reference an image asset`);
      if (!(node.assetRefs ?? []).includes(node.parameters.assetId)) fail(`${label}.assetRefs must include parameters.assetId`);
      text(node.parameters.accessibleLabel, `${label}.parameters.accessibleLabel`);
      if (!imageFitModes.has(node.parameters.fitMode)) fail(`${label}.parameters.fitMode is unsupported`);
      if (node.parameters.scale !== undefined) finite(node.parameters.scale, `${label}.parameters.scale`, Number.EPSILON);
      if (node.parameters.offsetX !== undefined) signedFinite(node.parameters.offsetX, `${label}.parameters.offsetX`);
      if (node.parameters.offsetY !== undefined) signedFinite(node.parameters.offsetY, `${label}.parameters.offsetY`);
    }
    jsonValue(node.parameters, `${label}.parameters`);
    if (node.content !== undefined) jsonValue(node.content, `${label}.content`);
    if (template.availability === 'placeholder') {
      object(node.placeholder, `${label}.placeholder`);
      allowedKeys(node.placeholder, ['label', 'description'], `${label}.placeholder`);
      text(node.placeholder.label, `${label}.placeholder.label`);
      text(node.placeholder.description, `${label}.placeholder.description`);
      context.placeholderCount += 1;
    } else if (node.placeholder !== undefined) {
      fail(`${label}.placeholder is only valid for a placeholder template`);
    }
  };

  for (const scene of scenes.result) {
    allowedKeys(scene, ['id', 'name', 'status', 'completeness', 'surfaceRef', 'interactionFrameRef', 'deferredInteractionNodeRefs', 'subject', 'useCaseRefs', 'state', 'viewport', 'themeRef', 'uxQuestionRefs', 'uiQuestionRefs', 'unspecifiedRequirementRefs', 'root', 'transientBehavior'], `scene ${scene.id}`);
    text(scene.name, `scene ${scene.id}.name`);
    status(scene.status, `scene ${scene.id}`);
    if (!['partial', 'complete'].includes(scene.completeness)) fail(`scene ${scene.id}.completeness is unsupported`);
    reference(scene.surfaceRef, ux.surfaces.ids, `scene ${scene.id}.surfaceRef`);
    const surface = ux.surfacesById.get(scene.surfaceRef);
    if (!['accepted', 'locked'].includes(surface.status)) fail(`scene ${scene.id}.surfaceRef must reference accepted or locked UX`);
    reference(scene.interactionFrameRef, ux.interactionFrames.ids, `scene ${scene.id}.interactionFrameRef`);
    const frame = ux.interactionFramesById.get(scene.interactionFrameRef);
    if (!['accepted', 'locked'].includes(frame.status)) fail(`scene ${scene.id}.interactionFrameRef must reference accepted or locked UX`);
    if (frame.surfaceRef !== scene.surfaceRef) fail(`scene ${scene.id}.interactionFrameRef belongs to another surface`);
    if (!surface.interactionFrameRefs.includes(scene.interactionFrameRef)) fail(`scene ${scene.id}.interactionFrameRef is not declared by surface ${surface.id}`);
    object(scene.subject, `scene ${scene.id}.subject`);
    allowedKeys(scene.subject, ['kind', 'ref'], `scene ${scene.id}.subject`);
    if (!subjectKinds.has(scene.subject.kind)) fail(`scene ${scene.id}.subject.kind is unsupported`);
    if (scene.subject.kind === 'surface') {
      reference(scene.subject.ref, ux.surfaces.ids, `scene ${scene.id}.subject.ref`);
      if (scene.subject.ref !== scene.surfaceRef) fail(`scene ${scene.id}.subject surface must equal surfaceRef`);
    } else {
      reference(scene.subject.ref, ux.components.ids, `scene ${scene.id}.subject.ref`);
      if (!['accepted', 'locked'].includes(ux.componentsById.get(scene.subject.ref).status)) fail(`scene ${scene.id}.subject component must be accepted or locked`);
      if (!ux.componentsById.get(scene.subject.ref).surfaceRefs.includes(scene.surfaceRef)) fail(`scene ${scene.id}.subject component is not available on surface ${scene.surfaceRef}`);
    }
    references(scene.useCaseRefs, ux.useCases.ids, `scene ${scene.id}.useCaseRefs`);
    for (const useCaseRef of scene.useCaseRefs) {
      if (!['accepted', 'locked'].includes(ux.useCasesById.get(useCaseRef).status)) fail(`scene ${scene.id} use case ${useCaseRef} must be accepted or locked`);
      const featureRef = ux.useCasesById.get(useCaseRef).featureRef;
      const feature = uxSpec.features.find(item => item.id === featureRef);
      if (!feature?.surfaceRefs.includes(scene.surfaceRef)) fail(`scene ${scene.id} use case ${useCaseRef} does not use surface ${scene.surfaceRef}`);
    }
    text(scene.state, `scene ${scene.id}.state`);
    const allowedStates = scene.subject.kind === 'surface' ? surface.states : ux.componentsById.get(scene.subject.ref).states;
    if (!allowedStates.includes(scene.state)) fail(`scene ${scene.id}.state is not declared by its UX subject`);
    if (scene.subject.kind === 'surface' && frame.state !== scene.state) fail(`scene ${scene.id}.state must match interaction frame ${frame.id}`);
    object(scene.viewport, `scene ${scene.id}.viewport`);
    allowedKeys(scene.viewport, ['width', 'height'], `scene ${scene.id}.viewport`);
    positiveInteger(scene.viewport.width, `scene ${scene.id}.viewport.width`);
    positiveInteger(scene.viewport.height, `scene ${scene.id}.viewport.height`);
    if (scene.themeRef !== design.themeId) fail(`scene ${scene.id}.themeRef references missing design-language theme ${scene.themeRef}`);
    references(scene.uxQuestionRefs, ux.questions.ids, `scene ${scene.id}.uxQuestionRefs`);
    references(scene.uiQuestionRefs, questions.ids, `scene ${scene.id}.uiQuestionRefs`);
    references(scene.unspecifiedRequirementRefs, unspecified.ids, `scene ${scene.id}.unspecifiedRequirementRefs`);
    const interactionNodes = ux.interactionNodesByFrame.get(frame.id);
    const frameAffordanceIds = new Set([...interactionNodes].filter(([, value]) => value.kind === 'affordance').map(([id]) => id));
    const deferredInteractionNodeRefs = textList(scene.deferredInteractionNodeRefs, `scene ${scene.id}.deferredInteractionNodeRefs`);
    const deferredIds = new Set();
    for (const id of deferredInteractionNodeRefs) {
      if (deferredIds.has(id)) fail(`scene ${scene.id}.deferredInteractionNodeRefs repeats ${id}`);
      deferredIds.add(id);
      const interactionNode = interactionNodes.get(id);
      if (!interactionNode) fail(`scene ${scene.id}.deferredInteractionNodeRefs references missing interaction node ${id}`);
      if (interactionNode.kind !== 'affordance') fail(`scene ${scene.id}.deferredInteractionNodeRefs must reference UX affordances`);
    }
    if (scene.completeness === 'complete' && deferredIds.size) fail(`scene ${scene.id} is complete and cannot defer UX affordances`);
    const regionIds = new Set(frame.regions.map(item => item.id));
    const context = {scene, surface, frame, interactionNodes, regionIds, boundRegionIds: new Set(), boundInteractionNodeIds: new Set(), placeholderCount: 0};
    if (scene.root?.kind !== 'region') fail(`scene ${scene.id}.root must be a region`);
    visitNode(scene.root, context, `scene ${scene.id}.root`, new Set(), new WeakSet());
    for (const id of deferredIds) if (context.boundInteractionNodeIds.has(id)) fail(`scene ${scene.id} both binds and defers UX affordance ${id}`);
    for (const id of frameAffordanceIds) {
      if (!context.boundInteractionNodeIds.has(id) && !deferredIds.has(id)) fail(`scene ${scene.id} must bind or explicitly defer UX affordance ${id}`);
    }
    validateTransientBehavior(scene, surface, frame);
    if (context.placeholderCount && scene.completeness !== 'partial') fail(`scene ${scene.id} contains placeholders and must be partial`);
    if (scene.completeness === 'complete' && scene.unspecifiedRequirementRefs.length) fail(`scene ${scene.id} is complete but references unspecified requirements`);
  }

  for (const request of uxChangeRequests.result) {
    allowedKeys(request, ['id', 'status', 'sceneRefs', 'interactionFrameRefs', 'actionRefs', 'requestedChange', 'rationale'], `uxChangeRequest ${request.id}`);
    if (request.status !== 'open') fail(`uxChangeRequest ${request.id}.status must be open`);
    const sceneRefs = textList(request.sceneRefs, `uxChangeRequest ${request.id}.sceneRefs`, {nonempty: true});
    const interactionFrameRefs = textList(request.interactionFrameRefs, `uxChangeRequest ${request.id}.interactionFrameRefs`, {nonempty: true});
    const actionRefs = textList(request.actionRefs, `uxChangeRequest ${request.id}.actionRefs`);
    sceneRefs.forEach(id => reference(id, scenes.ids, `uxChangeRequest ${request.id}.sceneRefs`));
    interactionFrameRefs.forEach(id => reference(id, ux.interactionFrames.ids, `uxChangeRequest ${request.id}.interactionFrameRefs`));
    actionRefs.forEach(id => reference(id, ux.actions.ids, `uxChangeRequest ${request.id}.actionRefs`));
    text(request.requestedChange, `uxChangeRequest ${request.id}.requestedChange`);
    text(request.rationale, `uxChangeRequest ${request.id}.rationale`);
    for (const sceneRef of sceneRefs) {
      const scene = scenes.result.find(candidate => candidate.id === sceneRef);
      if (!interactionFrameRefs.includes(scene.interactionFrameRef)) fail(`uxChangeRequest ${request.id} must include scene ${sceneRef}'s interaction frame`);
    }
    const frameActions = new Set(interactionFrameRefs.flatMap(frameRef => [...ux.interactionNodesByFrame.get(frameRef).values()]
      .filter(node => node.kind === 'affordance').map(node => node.record.actionRef)));
    for (const actionRef of actionRefs) if (!frameActions.has(actionRef)) fail(`uxChangeRequest ${request.id} action ${actionRef} is not bound by a referenced interaction frame`);
  }

  const renderRequests = records(spec.renderRequests, 'renderRequests');
  const outputPaths = new Set();
  const variantsByScene = new Map(scenes.result.map(scene => [scene.id, new Set()]));
  for (const request of renderRequests.result) {
    allowedKeys(request, ['id', 'sceneRef', 'variant', 'output'], `render request ${request.id}`);
    reference(request.sceneRef, scenes.ids, `render request ${request.id}.sceneRef`);
    if (!['clean', 'annotated'].includes(request.variant)) fail(`render request ${request.id}.variant is unsupported`);
    const output = relativePath(request.output, `render request ${request.id}.output`, '.html');
    if (!output.startsWith(renderRoot)) fail(`render request ${request.id}.output must be below ${renderRoot}`);
    if (outputPaths.has(output)) fail(`renderRequests contains duplicate output ${output}`);
    outputPaths.add(output);
    const variants = variantsByScene.get(request.sceneRef);
    if (variants.has(request.variant)) fail(`scene ${request.sceneRef} has duplicate ${request.variant} render requests`);
    variants.add(request.variant);
  }
  for (const scene of scenes.result) {
    const variants = variantsByScene.get(scene.id);
    if (!variants.has('clean') || !variants.has('annotated')) fail(`scene ${scene.id} needs one clean and one annotated render request`);
  }

  return spec;
}

/** Collect every UX record that the persisted composition directly consumes. */
export function uiRequiredScopeRefs(spec) {
  const refs = new Set();
  const add = value => {
    if (typeof value === 'string' && value !== '') refs.add(value);
  };
  const addAll = values => {
    if (Array.isArray(values)) values.forEach(add);
  };
  const visit = node => {
    add(node.uxRegionRef);
    add(node.uxRef);
    add(node.interactionNodeRef);
    add(node.actionRef);
    if (node.kind === 'region' && Array.isArray(node.children)) node.children.forEach(visit);
  };
  for (const scene of spec.scenes ?? []) {
    add(scene.surfaceRef);
    add(scene.interactionFrameRef);
    add(scene.subject?.ref);
    addAll(scene.useCaseRefs);
    addAll(scene.uxQuestionRefs);
    addAll(scene.deferredInteractionNodeRefs);
    if (scene.root) visit(scene.root);
  }
  return [...refs];
}

/** Validate and persist a canonical UI composition source for HTML comp rendering. */
export function writeUiSpec(inputPath, outputPath, uxPath, designLanguagePath, options = {}) {
  const spec = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const uxSource = fs.readFileSync(uxPath);
  const uxSpec = JSON.parse(uxSource.toString('utf8'));
  const designLanguage = JSON.parse(fs.readFileSync(designLanguagePath, 'utf8'));
  if (!options.uxReviewPath || !options.productDescriptionPath || !options.sourceRoot) {
    fail('A UX review receipt and authoritative product description are required with an authoritative source root to persist UI composition');
  }
  const sourceRoot = path.resolve(options.sourceRoot);
  const hasImageAssets = declaresUiImageAssets(spec);
  if (hasImageAssets && !options.assetRoot) fail('UI proposals with image assets require an explicit assetRoot');
  const assetRoot = hasImageAssets
    ? authorizeAssetRoot(path.resolve(options.assetRoot), sourceRoot, 'UI assetRoot').assetRoot
    : undefined;
  validateUiSpec(spec, {uxSpec, designLanguage, assetRoot, sourceRoot});
  const review = JSON.parse(fs.readFileSync(path.resolve(options.uxReviewPath), 'utf8'));
  const productSource = fs.readFileSync(path.resolve(options.productDescriptionPath));
  validatePassingUxReview(review, {
    uxSpec,
    uxSource,
    uxArtifactPath: path.resolve(uxPath),
    productDescriptionSource: productSource,
    productDescriptionPath: path.resolve(options.productDescriptionPath),
    productDescriptionId: options.productDescriptionId,
    sourceRoot,
    requiredScopeRefs: uiRequiredScopeRefs(spec),
  });
  const relativeTarget = requireCanonicalArtifactTarget(sourceRoot, outputPath, ROOT_BOUND_TARGETS.ui, 'UI artifact target');
  const output = writeOwnedJsonArtifact({
    productDocumentRoot: sourceRoot,
    relativeTarget,
    value: spec,
    validateExisting: existing => {
      validateUiSpec(existing, {uxSpec, designLanguage, assetRoot, sourceRoot});
      if (existing.id !== spec.id) fail(`UI artifact identity ${existing.id} does not match incoming identity ${spec.id}`);
    },
    beforeWrite: target => guardDesignLocks(target, spec, options),
    label: 'UI artifact',
  });
  return {output, id: spec.id, revision: spec.revision, sceneCount: spec.scenes.length};
}

function cli(argumentsToParse) {
  const options = new Map();
  for (let index = 0; index < argumentsToParse.length; index += 2) options.set(argumentsToParse[index], argumentsToParse[index + 1]);
  const input = options.get('--input');
  const output = options.get('--output');
  const ux = options.get('--ux');
  const designLanguage = options.get('--design-language');
  const uxReview = options.get('--ux-review');
  const productDescription = options.get('--product-description');
  const sourceRoot = options.get('--source-root');
  if (!input || !output || !ux || !designLanguage || !uxReview || !productDescription || !sourceRoot) fail('Usage: node ui-composition.mjs --input <ui-spec.json> --ux <ux-spec.json> --ux-review <ux-review.json> --product-description <product-description.md> [--product-description-id <ux-source-id>] --source-root <authoritative-source-root> --design-language <design-language.json> --output <ui-spec.json> [--asset-root <ui-asset-root> (required for image assets)] [--lock-reason <current-user-request>] [--locked-change-reason <current-user-request>]');
  process.stdout.write(`${JSON.stringify(writeUiSpec(path.resolve(input), path.resolve(output), path.resolve(ux), path.resolve(designLanguage), {
    uxReviewPath: path.resolve(uxReview),
    productDescriptionPath: path.resolve(productDescription),
    productDescriptionId: options.get('--product-description-id'),
    sourceRoot: path.resolve(sourceRoot),
    assetRoot: options.get('--asset-root') ? path.resolve(options.get('--asset-root')) : path.dirname(path.resolve(input)),
    lockReason: options.get('--lock-reason'),
    lockedChangeReason: options.get('--locked-change-reason')
  }))}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    cli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`UI composition validation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
