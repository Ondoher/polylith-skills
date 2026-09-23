import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';

import {validateUxSpec} from './ux-design.mjs';

const reviewSchema = JSON.parse(fs.readFileSync(new URL('../references/ux-review-schema-0.2.json', import.meta.url), 'utf8'));
const stableIdPattern = new RegExp(reviewSchema.$defs.stableId.pattern);
const sha256Pattern = new RegExp(reviewSchema.$defs.sha256.pattern);

export const UX_REVIEW_CRITERIA = Object.freeze([
  'product-intent',
  'task-coherence',
  'information-hierarchy',
  'action-economy-discoverability',
  'mode-state-clarity',
  'feedback-cancellation-recovery',
  'baseline-accessibility',
  'pattern-research',
  'ux-ui-boundary',
  'handoff-traceability',
]);

const verdicts = new Set(['pass', 'revise']);
const coverageResults = new Set(['pass', 'finding', 'not-applicable']);
const findingSeverities = new Set(['blocking', 'advisory']);
const confidenceLevels = new Set(['high', 'medium', 'low']);
const researchResults = new Set(['supported', 'unsupported', 'unverified', 'not-required']);

function fail(message) {
  throw new Error(message);
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}

function list(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
}

function text(value, label) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} must be non-empty text`);
  return value;
}

function stableId(value, label) {
  if (typeof value !== 'string' || !stableIdPattern.test(value)) {
    fail(`${label} must match the UX review stableId pattern ${reviewSchema.$defs.stableId.pattern}`);
  }
  return value;
}

function sha256(value, label) {
  if (typeof value !== 'string' || !sha256Pattern.test(value)) fail(`${label} must be a lowercase SHA-256 digest`);
  return value;
}

function sourceBytes(value, label) {
  if (typeof value === 'string' || Buffer.isBuffer(value) || value instanceof Uint8Array) return value;
  fail(`${label} must contain the authoritative source bytes`);
}

function sourceBuffer(value, label) {
  return Buffer.from(sourceBytes(value, label));
}

function realPath(value, label) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} must identify an authoritative filesystem path`);
  try {
    return fs.realpathSync.native(path.resolve(value));
  } catch {
    fail(`${label} is missing: ${path.resolve(value)}`);
  }
}

function samePath(left, right) {
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function containedPath(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function sourceHash(value) {
  return createHash('sha256').update(sourceBytes(value, 'source')).digest('hex');
}

function choice(value, choices, label) {
  if (!choices.has(value)) fail(`${label} has unsupported value ${String(value)}`);
  return value;
}

function allowedKeys(value, keys, label) {
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(`${label} has unsupported field ${key}`);
}

function uniqueTextList(value, label, {nonempty = false} = {}) {
  const result = list(value, label).map((item, index) => text(item, `${label}[${index}]`));
  const seen = new Set();
  for (const item of result) {
    if (seen.has(item)) fail(`${label} contains duplicate value ${item}`);
    seen.add(item);
  }
  if (nonempty && result.length === 0) fail(`${label} must not be empty`);
  return result;
}

function uniqueIdList(value, label, {nonempty = false} = {}) {
  const result = list(value, label).map((item, index) => stableId(item, `${label}[${index}]`));
  const seen = new Set();
  for (const item of result) {
    if (seen.has(item)) fail(`${label} contains duplicate value ${item}`);
    seen.add(item);
  }
  if (nonempty && result.length === 0) fail(`${label} must not be empty`);
  return result;
}

function exactSet(actual, expected, label) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  if (actualSet.size !== expectedSet.size || [...actualSet].some(value => !expectedSet.has(value))) {
    fail(`${label} must match the requested set exactly`);
  }
}

function collectUxIds(value, ids = new Set(), seen = new WeakSet()) {
  if (!value || typeof value !== 'object') return ids;
  if (seen.has(value)) return ids;
  seen.add(value);
  if (!Array.isArray(value) && typeof value.id === 'string' && value.id.trim() !== '') ids.add(value.id);
  for (const child of Array.isArray(value) ? value : Object.values(value)) collectUxIds(child, ids, seen);
  return ids;
}

function assertReferences(values, ids, label, options) {
  const refs = uniqueIdList(values, label, options);
  for (const ref of refs) if (!ids.has(ref)) fail(`${label} references missing UX record ${ref}`);
  return refs;
}

function normalizedSourceKind(value) {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
}

function productDescriptionSource(uxSpec, requestedId) {
  const candidates = uxSpec.sources.filter(source => normalizedSourceKind(source.kind) === 'human-owned-product-description');
  if (requestedId !== undefined) {
    stableId(requestedId, 'productDescriptionId');
    const requested = candidates.find(source => source.id === requestedId);
    if (!requested) fail(`productDescriptionId ${requestedId} must identify a human-owned product-description source in the UX artifact`);
    return requested;
  }
  if (candidates.length !== 1) fail('UX artifact must identify exactly one human-owned product-description source for review binding');
  return candidates[0];
}

function authoritativeUxSource(uxSpec, uxSource, uxArtifactPath) {
  const source = sourceBuffer(uxSource, 'uxSource');
  if (uxArtifactPath !== undefined) {
    const realUxPath = realPath(uxArtifactPath, 'uxArtifactPath');
    if (!fs.statSync(realUxPath).isFile()) fail('uxArtifactPath must identify the persisted UX file');
    if (!fs.readFileSync(realUxPath).equals(source)) fail('uxSource does not match the persisted UX file at uxArtifactPath');
  }
  let parsed;
  try {
    parsed = JSON.parse(source.toString('utf8'));
  } catch {
    fail('uxSource must contain valid JSON');
  }
  if (!isDeepStrictEqual(parsed, uxSpec)) fail('uxSource does not match the supplied UX artifact');
  return source;
}

function authoritativeProductSource(product, productSource, productDescriptionPath, sourceRoot) {
  const root = realPath(sourceRoot, 'sourceRoot');
  if (!fs.statSync(root).isDirectory()) fail('sourceRoot must identify an authoritative source directory');
  if (product.path.includes('#')) fail(`product-description source ${product.id}.path must identify a file without a fragment`);
  const declaredPath = path.resolve(root, product.path);
  if (!containedPath(root, declaredPath)) fail(`product-description source ${product.id}.path must stay below sourceRoot`);
  const declaredRealPath = realPath(declaredPath, `product-description source ${product.id}.path`);
  if (!containedPath(root, declaredRealPath)) fail(`product-description source ${product.id}.path escapes sourceRoot through a linked path`);
  if (!fs.statSync(declaredRealPath).isFile()) fail(`product-description source ${product.id}.path must identify a file`);
  const suppliedRealPath = realPath(productDescriptionPath, 'productDescriptionPath');
  if (!samePath(declaredRealPath, suppliedRealPath)) {
    fail(`productDescriptionPath must identify the file declared by UX source ${product.id}: ${product.path}`);
  }
  const bytes = fs.readFileSync(declaredRealPath);
  if (!bytes.equals(sourceBuffer(productSource, 'productDescriptionSource'))) {
    fail('productDescriptionSource does not match the authoritative file at productDescriptionPath');
  }
  return bytes;
}

function expectedReviewSubject({
  uxSpec,
  uxSource,
  uxArtifactPath,
  productDescriptionSource: productSource,
  productDescriptionPath,
  productDescriptionId,
  sourceRoot,
  scopeRefs,
}) {
  const uxIds = collectUxIds(uxSpec);
  const requestedScope = uniqueIdList(scopeRefs, 'requested scopeRefs', {nonempty: true});
  for (const ref of requestedScope) if (!uxIds.has(ref)) fail(`requested scopeRefs references missing UX record ${ref}`);
  const product = productDescriptionSource(uxSpec, productDescriptionId);
  const canonicalRoot = sourceRoot ?? (uxArtifactPath === undefined ? undefined : path.dirname(realPath(uxArtifactPath, 'uxArtifactPath')));
  if (canonicalRoot === undefined) fail('sourceRoot or uxArtifactPath is required to bind the product-description source path');
  const productBytes = authoritativeProductSource(product, productSource, productDescriptionPath, canonicalRoot);
  return {
    productDescription: {id: product.id, sha256: sourceHash(productBytes)},
    uxArtifact: {id: uxSpec.id, revision: uxSpec.revision, sha256: sourceHash(authoritativeUxSource(uxSpec, uxSource, uxArtifactPath))},
    scopeRefs: requestedScope,
  };
}

/** Create the immutable receipt subject that an independent reviewer must return unchanged. */
export function createUxReviewSubject(inputs) {
  validateUxSpec(inputs.uxSpec);
  return expectedReviewSubject(inputs);
}

function expandScope(uxSpec, scopeRefs) {
  const expanded = new Set(scopeRefs);
  if (expanded.has(uxSpec.id)) {
    collectUxIds(uxSpec, expanded);
    return expanded;
  }

  let changed = true;
  while (changed) {
    changed = false;
    const add = ref => {
      if (typeof ref === 'string' && ref && !expanded.has(ref)) {
        expanded.add(ref);
        changed = true;
      }
    };
    const addAll = refs => {
      if (Array.isArray(refs)) refs.forEach(add);
    };
    const includesRecord = record => {
      const ownedIds = collectUxIds(record);
      return [...ownedIds].some(id => expanded.has(id));
    };
    const addOwnedIds = record => collectUxIds(record).forEach(add);

    for (const feature of uxSpec.features) if (includesRecord(feature)) {
      addOwnedIds(feature);
      addAll(feature.useCaseRefs);
      addAll(feature.surfaceRefs);
    }
    for (const useCase of uxSpec.useCases) if (includesRecord(useCase)) {
      addOwnedIds(useCase);
      add(useCase.featureRef);
      addAll(useCase.surfaceRefs);
      addAll(useCase.actionRefs);
      useCase.steps.forEach(step => add(step.actionRef));
    }
    for (const surface of uxSpec.surfaces) if (includesRecord(surface)) {
      addOwnedIds(surface);
      add(surface.areaRef);
      addAll(surface.componentRefs);
      addAll(surface.interactionFrameRefs);
    }
    for (const component of uxSpec.components) if (includesRecord(component)) {
      addOwnedIds(component);
      addAll(component.surfaceRefs);
    }
    for (const action of uxSpec.actions) if (includesRecord(action)) {
      addOwnedIds(action);
      addAll(action.taskRefs);
      action.applicableStates.forEach(state => add(state.surfaceRef));
      action.recovery.forEach(recovery => addAll(recovery.actionRefs));
      add(action.patternBasis?.researchRef);
    }
    for (const frame of uxSpec.interactionFrames) if (includesRecord(frame)) {
      addOwnedIds(frame);
      add(frame.surfaceRef);
      addAll(frame.taskRefs);
      add(frame.patternBasis?.researchRef);
      frame.regions.forEach(region => region.affordances.forEach(affordance => add(affordance.actionRef)));
    }
    for (const research of uxSpec.patternResearch) if (includesRecord(research)) {
      addOwnedIds(research);
      addAll(research.taskRefs);
      addAll(research.actionRefs);
      addAll(research.frameRefs);
    }
  }
  return expanded;
}

function expectedResearchRefs(uxSpec, scopeRefs) {
  const expanded = expandScope(uxSpec, scopeRefs);
  return uxSpec.patternResearch
    .filter(research => expanded.has(research.id)
      || research.taskRefs.some(ref => expanded.has(ref))
      || research.actionRefs.some(ref => expanded.has(ref))
      || research.frameRefs.some(ref => expanded.has(ref)))
    .map(research => research.id);
}

/**
 * Validate a qualitative UX review against the exact persisted UX revision and
 * requested scope. This checks review evidence and gate invariants, not the
 * reviewer's qualitative conclusions.
 */
export function validateUxReview(review, {
  uxSpec,
  uxSource,
  uxArtifactPath,
  productDescriptionSource: productSource,
  productDescriptionPath,
  productDescriptionId,
  sourceRoot,
  scopeRefs,
}) {
  validateUxSpec(uxSpec);
  const expectedSubject = expectedReviewSubject({
    uxSpec,
    uxSource,
    uxArtifactPath,
    productDescriptionSource: productSource,
    productDescriptionPath,
    productDescriptionId,
    sourceRoot,
    scopeRefs,
  });
  object(review, 'UX review');
  allowedKeys(review, ['schemaVersion', 'subject', 'verdict', 'summary', 'coverage', 'findings', 'researchChecks', 'limits'], 'UX review');
  if (review.schemaVersion !== '0.2') fail('Unsupported UX review schema version; expected 0.2');

  const uxIds = collectUxIds(uxSpec);

  const subject = object(review.subject, 'subject');
  allowedKeys(subject, ['productDescription', 'uxArtifact', 'scopeRefs'], 'subject');
  const productDescription = object(subject.productDescription, 'subject.productDescription');
  allowedKeys(productDescription, ['id', 'sha256'], 'subject.productDescription');
  if (stableId(productDescription.id, 'subject.productDescription.id') !== expectedSubject.productDescription.id) {
    fail(`subject.productDescription.id must match product-description source ${expectedSubject.productDescription.id}`);
  }
  if (sha256(productDescription.sha256, 'subject.productDescription.sha256') !== expectedSubject.productDescription.sha256) {
    fail('subject.productDescription.sha256 is stale for the supplied product description');
  }
  const uxArtifact = object(subject.uxArtifact, 'subject.uxArtifact');
  allowedKeys(uxArtifact, ['id', 'revision', 'sha256'], 'subject.uxArtifact');
  if (stableId(uxArtifact.id, 'subject.uxArtifact.id') !== expectedSubject.uxArtifact.id) {
    fail(`subject.uxArtifact.id must match UX artifact ${expectedSubject.uxArtifact.id}`);
  }
  if (text(uxArtifact.revision, 'subject.uxArtifact.revision') !== expectedSubject.uxArtifact.revision) {
    fail(`subject.uxArtifact.revision must match UX revision ${expectedSubject.uxArtifact.revision}`);
  }
  if (sha256(uxArtifact.sha256, 'subject.uxArtifact.sha256') !== expectedSubject.uxArtifact.sha256) {
    fail('subject.uxArtifact.sha256 is stale for the supplied UX artifact');
  }
  const reviewedScope = uniqueIdList(subject.scopeRefs, 'subject.scopeRefs', {nonempty: true});
  exactSet(reviewedScope, expectedSubject.scopeRefs, 'subject.scopeRefs');

  choice(review.verdict, verdicts, 'verdict');
  text(review.summary, 'summary');

  const criteria = new Set(UX_REVIEW_CRITERIA);
  const coverage = list(review.coverage, 'coverage');
  if (coverage.length !== UX_REVIEW_CRITERIA.length) fail(`coverage must contain exactly ${UX_REVIEW_CRITERIA.length} criteria`);
  const coverageByCriterion = new Map();
  for (const [index, item] of coverage.entries()) {
    const label = `coverage[${index}]`;
    object(item, label);
    allowedKeys(item, ['criterion', 'result', 'evidenceRefs', 'note'], label);
    const criterion = choice(item.criterion, criteria, `${label}.criterion`);
    if (coverageByCriterion.has(criterion)) fail(`coverage contains duplicate criterion ${criterion}`);
    choice(item.result, coverageResults, `${label}.result`);
    assertReferences(item.evidenceRefs, uxIds, `${label}.evidenceRefs`);
    text(item.note, `${label}.note`);
    coverageByCriterion.set(criterion, item);
  }
  exactSet([...coverageByCriterion.keys()], UX_REVIEW_CRITERIA, 'coverage criteria');

  const findings = list(review.findings, 'findings');
  const findingIds = new Set();
  for (const [index, finding] of findings.entries()) {
    const label = `findings[${index}]`;
    object(finding, label);
    allowedKeys(finding, ['id', 'severity', 'criteria', 'recordRefs', 'evidence', 'consequence', 'smallestRemedy', 'confidence'], label);
    const id = stableId(finding.id, `${label}.id`);
    if (findingIds.has(id)) fail(`findings contains duplicate id ${id}`);
    findingIds.add(id);
    choice(finding.severity, findingSeverities, `${label}.severity`);
    const findingCriteria = uniqueTextList(finding.criteria, `${label}.criteria`, {nonempty: true});
    findingCriteria.forEach((criterion, criterionIndex) => choice(criterion, criteria, `${label}.criteria[${criterionIndex}]`));
    assertReferences(finding.recordRefs, uxIds, `${label}.recordRefs`, {nonempty: true});
    text(finding.evidence, `${label}.evidence`);
    text(finding.consequence, `${label}.consequence`);
    text(finding.smallestRemedy, `${label}.smallestRemedy`);
    choice(finding.confidence, confidenceLevels, `${label}.confidence`);
  }

  for (const finding of findings) {
    if (finding.severity !== 'blocking') continue;
    for (const criterion of finding.criteria) {
      if (coverageByCriterion.get(criterion).result !== 'finding') {
        fail(`blocking finding ${finding.id} requires finding coverage for ${criterion}`);
      }
    }
  }
  for (const [criterion, item] of coverageByCriterion) {
    if (item.result === 'finding' && !findings.some(finding => finding.severity === 'blocking' && finding.criteria.includes(criterion))) {
      fail(`coverage finding ${criterion} requires a blocking finding`);
    }
  }

  const researchById = new Map(uxSpec.patternResearch.map(research => [research.id, research]));
  const researchChecks = list(review.researchChecks, 'researchChecks');
  const checkedResearch = new Set();
  for (const [index, check] of researchChecks.entries()) {
    const label = `researchChecks[${index}]`;
    object(check, label);
    allowedKeys(check, ['researchRef', 'result', 'sourceRefs', 'note'], label);
    const researchRef = stableId(check.researchRef, `${label}.researchRef`);
    const research = researchById.get(researchRef);
    if (!research) fail(`${label}.researchRef references missing patternResearch record ${researchRef}`);
    if (checkedResearch.has(researchRef)) fail(`researchChecks contains duplicate researchRef ${researchRef}`);
    checkedResearch.add(researchRef);
    choice(check.result, researchResults, `${label}.result`);
    const sourceIds = new Set(research.sources.map(source => source.id));
    const sourceRefs = uniqueIdList(check.sourceRefs, `${label}.sourceRefs`);
    for (const ref of sourceRefs) if (!sourceIds.has(ref)) fail(`${label}.sourceRefs references missing source ${ref} in ${researchRef}`);
    text(check.note, `${label}.note`);
  }
  exactSet([...checkedResearch], expectedResearchRefs(uxSpec, expectedSubject.scopeRefs), 'researchChecks researchRefs');

  const limits = list(review.limits, 'limits');
  limits.forEach((limit, index) => text(limit, `limits[${index}]`));

  const hasBlockingFinding = findings.some(finding => finding.severity === 'blocking');
  const hasCoverageFinding = coverage.some(item => item.result === 'finding');
  const hasUnresolvedResearch = researchChecks.some(check => check.result === 'unsupported' || check.result === 'unverified');
  if ((hasBlockingFinding || hasCoverageFinding || hasUnresolvedResearch) && review.verdict !== 'revise') {
    fail('verdict must be revise when review evidence is blocking, required coverage has a finding, or research is unresolved');
  }
  if (review.verdict === 'pass' && findings.some(finding => finding.severity !== 'advisory')) {
    fail('a pass verdict may contain advisory findings only');
  }

  return review;
}

/** Require a current passing receipt whose expanded reviewed scope covers UI dependencies. */
export function validatePassingUxReview(review, {
  uxSpec,
  uxSource,
  uxArtifactPath,
  productDescriptionSource: productSource,
  productDescriptionPath,
  productDescriptionId,
  sourceRoot,
  requiredScopeRefs,
}) {
  const reviewedScope = review?.subject?.scopeRefs;
  validateUxReview(review, {
    uxSpec,
    uxSource,
    uxArtifactPath,
    productDescriptionSource: productSource,
    productDescriptionPath,
    productDescriptionId,
    sourceRoot,
    scopeRefs: reviewedScope,
  });
  if (review.verdict !== 'pass') fail('UX review receipt verdict must be pass before UI persistence');

  const uxIds = collectUxIds(uxSpec);
  const required = uniqueIdList(requiredScopeRefs, 'required UI scopeRefs', {nonempty: true});
  for (const ref of required) if (!uxIds.has(ref)) fail(`required UI scopeRefs references missing UX record ${ref}`);
  const expanded = expandScope(uxSpec, reviewedScope);
  for (const ref of required) {
    if (!expanded.has(ref)) fail(`UX review receipt scope does not cover UI dependency ${ref}`);
  }
  return review;
}

function cli(argumentsToParse) {
  const options = new Map();
  for (let index = 0; index < argumentsToParse.length; index += 2) options.set(argumentsToParse[index], argumentsToParse[index + 1]);
  const reviewPath = options.get('--review');
  const uxPath = options.get('--ux');
  const productDescriptionPath = options.get('--product-description');
  const productDescriptionId = options.get('--product-description-id');
  const sourceRoot = options.get('--source-root');
  const scope = options.get('--scope');
  if (!reviewPath || !uxPath || !productDescriptionPath || !sourceRoot || !scope) fail('Usage: node ux-review.mjs --review <ux-review.json> --ux <ux-spec.json> --product-description <product-description.md> [--product-description-id <ux-source-id>] --source-root <authoritative-source-root> --scope <comma-separated-ux-refs>');
  const uxSource = fs.readFileSync(path.resolve(uxPath));
  const uxSpec = JSON.parse(uxSource.toString('utf8'));
  const productSource = fs.readFileSync(path.resolve(productDescriptionPath));
  const review = JSON.parse(fs.readFileSync(path.resolve(reviewPath), 'utf8'));
  const scopeRefs = scope.split(',').map(value => value.trim()).filter(Boolean);
  validateUxReview(review, {
    uxSpec,
    uxSource,
    uxArtifactPath: path.resolve(uxPath),
    productDescriptionSource: productSource,
    productDescriptionPath: path.resolve(productDescriptionPath),
    productDescriptionId,
    sourceRoot: path.resolve(sourceRoot),
    scopeRefs,
  });
  process.stdout.write(`${JSON.stringify({subject: review.subject, verdict: review.verdict})}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    cli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`UX review validation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
