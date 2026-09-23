import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {guardDesignLocks} from './design-lock.mjs';
import {authorizeAssetRoot, validateDurableResearch, validatePublicHttpsUrl} from './input-security.mjs';
import {componentDesignTarget, writeOwnedJsonArtifact} from './root-bound-artifact.mjs';

import {declaresUiImageAssets, uiRequiredScopeRefs, validateUiSpec} from './ui-composition.mjs';
import {validatePassingUxReview} from './ux-review.mjs';

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

function revision(value, label) {
  if ((typeof value !== 'string' || value.trim() === '') && (!Number.isInteger(value) || value < 0)) fail(`${label} must be non-empty text or a non-negative integer`);
  return value;
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

function sameSet(actual, expected, label) {
  if (actual.size !== expected.size || [...actual].some(value => !expected.has(value))) fail(`${label} must match the component state set`);
}

/** Validate a component-focused UI design built on the composition schema. */
export function validateComponentDesign(spec, {uxSpec, designLanguage, assetRoot, sourceRoot}) {
  validateUiSpec(spec, {uxSpec, designLanguage, assetRoot, sourceRoot, documentKind: 'component'});
  if (spec.designMode !== 'component') fail('designMode must be component');
  if (!['comp', 'wireframe'].includes(spec.artifactKind)) fail('artifactKind must be comp or wireframe');

  const research = object(spec.patternResearch, 'patternResearch');
  allowedKeys(research, ['method', 'outcome', 'reviewedAt', 'searchQueries', 'comparables', 'sharedPatterns', 'selectedPattern', 'rejectedPatterns', 'limits', 'verification'], 'patternResearch');
  validateDurableResearch(research, 'patternResearch');
  if (!['bounded-online-search', 'supplied-sources-verified'].includes(research.method)) fail('patternResearch.method is unsupported');
  if (!['comparables-found', 'no-established-comparable'].includes(research.outcome)) fail('patternResearch.outcome is unsupported');
  text(research.reviewedAt, 'patternResearch.reviewedAt');
  const searchQueries = list(research.searchQueries, 'patternResearch.searchQueries');
  searchQueries.forEach((item, index) => text(item, `patternResearch.searchQueries[${index}]`));
  if (!searchQueries.length) fail('patternResearch.searchQueries must not be empty');
  const comparables = records(research.comparables, 'patternResearch.comparables');
  if (research.outcome === 'comparables-found' && !comparables.result.length) fail('patternResearch.comparables must not be empty when comparables are found');
  const sourceTypes = new Set(['official-product-doc', 'platform-guidance', 'standard', 'maintained-project-manual']);
  const products = new Set();
  const urls = new Set();
  let hasNormativeSource = false;
  for (const comparable of comparables.result) {
    allowedKeys(comparable, ['id', 'product', 'sourceType', 'sourceUrl', 'accessedAt', 'observations'], `patternResearch comparable ${comparable.id}`);
    text(comparable.product, `patternResearch comparable ${comparable.id}.product`);
    products.add(comparable.product.trim().toLowerCase());
    if (!sourceTypes.has(comparable.sourceType)) fail(`patternResearch comparable ${comparable.id}.sourceType is unsupported`);
    if (comparable.sourceType === 'standard' || comparable.sourceType === 'platform-guidance') hasNormativeSource = true;
    validatePublicHttpsUrl(comparable.sourceUrl, `patternResearch comparable ${comparable.id}.sourceUrl`);
    if (urls.has(comparable.sourceUrl)) fail(`patternResearch comparables repeat sourceUrl ${comparable.sourceUrl}`);
    urls.add(comparable.sourceUrl);
    text(comparable.accessedAt, `patternResearch comparable ${comparable.id}.accessedAt`);
    list(comparable.observations, `patternResearch comparable ${comparable.id}.observations`).forEach((item, index) => text(item, `patternResearch comparable ${comparable.id}.observations[${index}]`));
    if (!comparable.observations.length) fail(`patternResearch comparable ${comparable.id}.observations must not be empty`);
  }
  list(research.sharedPatterns, 'patternResearch.sharedPatterns').forEach((item, index) => text(item, `patternResearch.sharedPatterns[${index}]`));
  if (research.outcome === 'comparables-found') {
    if (!research.sharedPatterns.length) fail('patternResearch.sharedPatterns must not be empty when comparables are found');
    if (products.size < 2 && !hasNormativeSource) fail('patternResearch needs two independent products or one normative source to claim a shared pattern');
  } else if (research.sharedPatterns.length) {
    fail('patternResearch.sharedPatterns must be empty when no established comparable was found');
  }
  const selectedPattern = object(research.selectedPattern, 'patternResearch.selectedPattern');
  allowedKeys(selectedPattern, ['summary', 'rationale', 'adaptations'], 'patternResearch.selectedPattern');
  text(selectedPattern.summary, 'patternResearch.selectedPattern.summary');
  text(selectedPattern.rationale, 'patternResearch.selectedPattern.rationale');
  list(selectedPattern.adaptations, 'patternResearch.selectedPattern.adaptations').forEach((item, index) => text(item, `patternResearch.selectedPattern.adaptations[${index}]`));
  list(research.rejectedPatterns, 'patternResearch.rejectedPatterns').forEach((item, index) => {
    object(item, `patternResearch.rejectedPatterns[${index}]`);
    allowedKeys(item, ['pattern', 'rationale'], `patternResearch.rejectedPatterns[${index}]`);
    text(item.pattern, `patternResearch.rejectedPatterns[${index}].pattern`);
    text(item.rationale, `patternResearch.rejectedPatterns[${index}].rationale`);
  });
  list(research.limits, 'patternResearch.limits').forEach((item, index) => text(item, `patternResearch.limits[${index}]`));
  if (research.outcome === 'no-established-comparable' && !research.limits.length) fail('patternResearch.limits must explain the no-comparable result');
  const verification = object(research.verification, 'patternResearch.verification');
  allowedKeys(verification, ['status', 'checkedBy', 'checkedAt', 'notes'], 'patternResearch.verification');
  if (!['pending', 'source-checked'].includes(verification.status)) fail('patternResearch.verification.status is unsupported');
  list(verification.notes, 'patternResearch.verification.notes').forEach((item, index) => text(item, `patternResearch.verification.notes[${index}]`));
  if (verification.status === 'source-checked') {
    if (verification.checkedBy !== 'parent') fail('patternResearch.verification.checkedBy must be parent');
    text(verification.checkedAt, 'patternResearch.verification.checkedAt');
    if (!verification.notes.length) fail('patternResearch.verification.notes must not be empty after source checking');
  }
  if (spec.artifactKind === 'comp' && verification.status !== 'source-checked') fail('a comp requires parent source verification');

  const fidelity = object(spec.fidelity, 'fidelity');
  allowedKeys(fidelity, ['visualDecisions', 'stateDistinctions', 'representativeContent', 'missingForComp'], 'fidelity');
  if (spec.artifactKind === 'comp') {
    for (const field of ['visualDecisions', 'stateDistinctions', 'representativeContent']) {
      list(fidelity[field], `fidelity.${field}`).forEach((item, index) => text(item, `fidelity.${field}[${index}]`));
      if (!fidelity[field].length) fail(`fidelity.${field} must not be empty for a comp`);
    }
  } else {
    list(fidelity.missingForComp, 'fidelity.missingForComp').forEach((item, index) => text(item, `fidelity.missingForComp[${index}]`));
    if (!fidelity.missingForComp.length) fail('fidelity.missingForComp must not be empty for a wireframe');
  }

  const contract = object(spec.componentTemplate, 'componentTemplate');
  allowedKeys(contract, ['id', 'name', 'version', 'uxRef', 'replacesTemplateRef', 'supportedStates', 'parameters', 'sizing', 'accessibility', 'stateScenes'], 'componentTemplate');
  text(contract.id, 'componentTemplate.id');
  text(contract.name, 'componentTemplate.name');
  revision(contract.version, 'componentTemplate.version');
  text(contract.uxRef, 'componentTemplate.uxRef');
  const uxComponent = uxSpec.components.find(component => component.id === contract.uxRef);
  if (!uxComponent) fail(`componentTemplate.uxRef references missing id ${contract.uxRef}`);

  const replacement = object(contract.replacesTemplateRef, 'componentTemplate.replacesTemplateRef');
  allowedKeys(replacement, ['id', 'version'], 'componentTemplate.replacesTemplateRef');
  text(replacement.id, 'componentTemplate.replacesTemplateRef.id');
  revision(replacement.version, 'componentTemplate.replacesTemplateRef.version');

  const supportedStates = new Set(list(contract.supportedStates, 'componentTemplate.supportedStates').map((state, index) => text(state, `componentTemplate.supportedStates[${index}]`)));
  if (!supportedStates.size) fail('componentTemplate.supportedStates must not be empty');
  for (const state of supportedStates) if (!uxComponent.states.includes(state)) fail(`componentTemplate state ${state} is not declared by UX component ${contract.uxRef}`);

  const parameters = records(contract.parameters, 'componentTemplate.parameters');
  for (const parameter of parameters.result) {
    allowedKeys(parameter, ['id', 'required', 'description'], `componentTemplate parameter ${parameter.id}`);
    if (typeof parameter.required !== 'boolean') fail(`componentTemplate parameter ${parameter.id}.required must be boolean`);
    text(parameter.description, `componentTemplate parameter ${parameter.id}.description`);
  }

  const sizing = object(contract.sizing, 'componentTemplate.sizing');
  allowedKeys(sizing, ['width', 'height', 'widthPx', 'heightPx'], 'componentTemplate.sizing');
  if (!['content', 'fill', 'fixed'].includes(sizing.width) || !['content', 'fill', 'fixed'].includes(sizing.height)) fail('componentTemplate.sizing uses an unsupported mode');
  if (sizing.width === 'fixed' && (!Number.isFinite(sizing.widthPx) || sizing.widthPx <= 0)) fail('componentTemplate.sizing.widthPx must be positive');
  if (sizing.height === 'fixed' && (!Number.isFinite(sizing.heightPx) || sizing.heightPx <= 0)) fail('componentTemplate.sizing.heightPx must be positive');

  const accessibility = object(contract.accessibility, 'componentTemplate.accessibility');
  allowedKeys(accessibility, ['role', 'name', 'keyboard'], 'componentTemplate.accessibility');
  text(accessibility.role, 'componentTemplate.accessibility.role');
  text(accessibility.name, 'componentTemplate.accessibility.name');
  list(accessibility.keyboard, 'componentTemplate.accessibility.keyboard').forEach((item, index) => text(item, `componentTemplate.accessibility.keyboard[${index}]`));

  const scenesById = new Map(spec.scenes.map(scene => [scene.id, scene]));
  for (const scene of spec.scenes) {
    if (scene.subject.kind !== 'component' || scene.subject.ref !== contract.uxRef) fail(`scene ${scene.id} must focus component ${contract.uxRef}`);
    if (!supportedStates.has(scene.state)) fail(`scene ${scene.id}.state is not listed by componentTemplate.supportedStates`);
  }

  const stateScenes = records(contract.stateScenes, 'componentTemplate.stateScenes');
  const mappedStates = new Set();
  for (const mapping of stateScenes.result) {
    allowedKeys(mapping, ['id', 'state', 'sceneRef'], `componentTemplate.stateScenes ${mapping.id}`);
    const state = text(mapping.state, `componentTemplate.stateScenes ${mapping.id}.state`);
    if (!supportedStates.has(state)) fail(`componentTemplate.stateScenes ${mapping.id}.state is unsupported`);
    if (mappedStates.has(state)) fail(`componentTemplate.stateScenes maps state ${state} more than once`);
    mappedStates.add(state);
    const sceneRef = text(mapping.sceneRef, `componentTemplate.stateScenes ${mapping.id}.sceneRef`);
    const scene = scenesById.get(sceneRef);
    if (!scene) fail(`componentTemplate.stateScenes ${mapping.id}.sceneRef references missing id ${sceneRef}`);
    if (scene.state !== state) fail(`componentTemplate.stateScenes ${mapping.id} does not match scene state`);
  }
  sameSet(mappedStates, supportedStates, 'componentTemplate.stateScenes');

  const promotion = object(spec.promotion, 'promotion');
  allowedKeys(promotion, ['scope', 'rationale', 'criteria'], 'promotion');
  if (!['app-local', 'shared-candidate'].includes(promotion.scope)) fail('promotion.scope is unsupported');
  text(promotion.rationale, 'promotion.rationale');
  list(promotion.criteria, 'promotion.criteria').forEach((item, index) => text(item, `promotion.criteria[${index}]`));

  return spec;
}

/** Build the exact-template registration used to replace a surface placeholder. */
export function buildComponentRegistration(spec, surfaceSpec, inputs) {
  validateComponentDesign(spec, {...inputs, assetRoot: inputs.componentAssetRoot ?? inputs.assetRoot});
  if (spec.artifactKind !== 'comp') fail(`component ${spec.componentTemplate.id} is a wireframe and cannot replace a comp placeholder`);
  validateUiSpec(surfaceSpec, {...inputs, assetRoot: inputs.surfaceAssetRoot ?? inputs.assetRoot});
  const contract = spec.componentTemplate;
  const template = surfaceSpec.templates.find(candidate => candidate.id === contract.replacesTemplateRef.id);
  if (!template || template.version !== contract.replacesTemplateRef.version) fail(`surface UI does not contain replacement template ${contract.replacesTemplateRef.id}@${contract.replacesTemplateRef.version}`);
  if (template.availability !== 'placeholder') fail(`replacement template ${template.id} is not a placeholder`);
  const matchingNodes = [];
  const visit = node => {
    if (node.kind === 'region') node.children.forEach(visit);
    else if (node.templateRef.id === template.id && node.templateRef.version === template.version) matchingNodes.push(node);
  };
  surfaceSpec.scenes.forEach(scene => visit(scene.root));
  if (!matchingNodes.length) fail(`surface UI does not use replacement template ${template.id}@${template.version}`);
  for (const node of matchingNodes) {
    if (node.uxRef !== contract.uxRef) fail(`replacement node ${node.id} does not reference UX component ${contract.uxRef}`);
    if (!contract.supportedStates.includes(node.state)) fail(`replacement node ${node.id} uses unsupported component state ${node.state}`);
  }

  const stateOutputs = {};
  for (const mapping of contract.stateScenes) {
    const request = spec.renderRequests.find(candidate => candidate.sceneRef === mapping.sceneRef && candidate.variant === 'clean');
    if (!request) fail(`component state ${mapping.state} has no clean render request`);
    stateOutputs[mapping.state] = request.output.replace(/^comps\//, 'component-comps/');
  }
  return {
    id: contract.id,
    name: contract.name,
    version: contract.version,
    uxRef: contract.uxRef,
    replacesTemplateRef: {...contract.replacesTemplateRef},
    supportedStates: [...contract.supportedStates],
    accessibility: {
      role: contract.accessibility.role,
      name: contract.accessibility.name,
      keyboard: [...contract.accessibility.keyboard]
    },
    stateOutputs,
    promotion: {...spec.promotion},
  };
}

/**
 * Build a review-only promotion handoff. Promotion remains an explicit human
 * decision; this function never writes to or mutates a shared component library.
 */
export function buildComponentPromotionCandidate(spec, inputs) {
  validateComponentDesign(spec, inputs);
  if (spec.artifactKind !== 'comp') fail(`component ${spec.componentTemplate.id} is a wireframe and cannot be promoted`);
  if (spec.promotion.scope !== 'shared-candidate') fail(`component ${spec.componentTemplate.id} is not marked as a shared candidate`);
  if (!spec.promotion.criteria.length) fail(`component ${spec.componentTemplate.id} promotion criteria must not be empty`);
  return {
    schemaVersion: '0.2',
    kind: 'component-promotion-candidate',
    component: {
      id: spec.componentTemplate.id,
      name: spec.componentTemplate.name,
      version: spec.componentTemplate.version,
      supportedStates: [...spec.componentTemplate.supportedStates],
      parameters: spec.componentTemplate.parameters.map(parameter => ({...parameter})),
      sizing: {...spec.componentTemplate.sizing},
      accessibility: {
        ...spec.componentTemplate.accessibility,
        keyboard: [...spec.componentTemplate.accessibility.keyboard]
      }
    },
    origin: {designId: spec.id, revision: spec.revision, uxRef: spec.componentTemplate.uxRef},
    rationale: spec.promotion.rationale,
    criteria: [...spec.promotion.criteria],
    evidence: spec.patternResearch.comparables.map(source => ({
      id: source.id,
      sourceType: source.sourceType,
      sourceUrl: source.sourceUrl,
      accessedAt: source.accessedAt
    })),
    approval: {status: 'required', authority: 'explicit-user-direction'},
    application: {status: 'not-applied', note: 'A separate authorized repository workflow must review and apply this candidate.'}
  };
}

/** Validate and persist canonical component-design JSON. */
export function writeComponentDesign(inputPath, outputPath, uxPath, designLanguagePath, options = {}) {
  const spec = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const uxSource = fs.readFileSync(uxPath);
  const uxSpec = JSON.parse(uxSource.toString('utf8'));
  const designLanguage = JSON.parse(fs.readFileSync(designLanguagePath, 'utf8'));
  if (!options.uxReviewPath || !options.productDescriptionPath || !options.sourceRoot) {
    fail('A UX review receipt and authoritative product description are required with an authoritative source root to persist component design');
  }
  const sourceRoot = path.resolve(options.sourceRoot);
  const hasImageAssets = declaresUiImageAssets(spec);
  if (hasImageAssets && !options.assetRoot) fail('Component proposals with image assets require an explicit assetRoot');
  const assetRoot = hasImageAssets
    ? authorizeAssetRoot(path.resolve(options.assetRoot), sourceRoot, 'component assetRoot').assetRoot
    : undefined;
  validateComponentDesign(spec, {uxSpec, designLanguage, assetRoot, sourceRoot});
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
  const componentTarget = componentDesignTarget(spec.componentTemplate.id);
  const relativeTarget = requireCanonicalArtifactTarget(sourceRoot, outputPath, componentTarget, 'component artifact target');
  const output = writeOwnedJsonArtifact({
    productDocumentRoot: sourceRoot,
    relativeTarget,
    value: spec,
    validateExisting: existing => {
      validateComponentDesign(existing, {uxSpec, designLanguage, assetRoot, sourceRoot});
      if (existing.id !== spec.id) fail(`component artifact identity ${existing.id} does not match incoming identity ${spec.id}`);
      if (existing.componentTemplate.id !== spec.componentTemplate.id) {
        fail(`component template identity ${existing.componentTemplate.id} does not match incoming identity ${spec.componentTemplate.id}`);
      }
    },
    beforeWrite: target => guardDesignLocks(target, spec, options),
    label: 'component artifact',
  });
  return {output, id: spec.id, revision: spec.revision, componentId: spec.componentTemplate.id, sceneCount: spec.scenes.length};
}

function cli(args) {
  const options = new Map();
  for (let index = 0; index < args.length; index += 2) options.set(args[index], args[index + 1]);
  const input = options.get('--input');
  const output = options.get('--output');
  const ux = options.get('--ux');
  const designLanguage = options.get('--design-language');
  const uxReview = options.get('--ux-review');
  const productDescription = options.get('--product-description');
  const sourceRoot = options.get('--source-root');
  if (!input || !output || !ux || !designLanguage || !uxReview || !productDescription || !sourceRoot) fail('Usage: node component-design.mjs --input <proposal.json> --ux <ux-spec.json> --ux-review <ux-review.json> --product-description <product-description.md> [--product-description-id <ux-source-id>] --source-root <authoritative-source-root> --design-language <design-language.json> --output <component-design.json> [--asset-root <ui-asset-root> (required for image assets)] [--lock-reason <current-user-request>] [--locked-change-reason <current-user-request>]');
  process.stdout.write(`${JSON.stringify(writeComponentDesign(input, output, ux, designLanguage, {
    uxReviewPath: uxReview,
    productDescriptionPath: productDescription,
    productDescriptionId: options.get('--product-description-id'),
    sourceRoot,
    assetRoot: options.get('--asset-root') ?? path.dirname(path.resolve(input)),
    lockReason: options.get('--lock-reason'),
    lockedChangeReason: options.get('--locked-change-reason')
  }))}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { cli(process.argv.slice(2)); }
  catch (error) { process.stderr.write(`Component design validation failed: ${error.message}\n`); process.exitCode = 1; }
}
