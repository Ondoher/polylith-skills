import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateUxSpec} from './ux-design.mjs';
import {validate as validateDesignLanguage} from './design-language.mjs';
import {validateReviewConfig} from './design-language-review-pages.mjs';
import {validateUiSpec} from './ui-composition.mjs';
import {validateComponentDesign, buildComponentRegistration} from './component-design.mjs';
import {validateProductArtifact} from './product-artifact-contract.mjs';
import {loadCurrentProduct} from './product-model.mjs';
import {closed, ensureUnlinkedPath, fail, parseJsonFile, stableJson, writeImmutable} from './product-artifact-utils.mjs';
import {canonicalPublicationJson, collectArtifactResources, decodePublicationDocument, encodePublicationDocument, publishArtifactResourceFiles, PUBLICATION_DOCUMENT_MAX_BYTES, validatePublicationLogicalPath} from './product-publication-package.mjs';

const contracts = new Map([['ux-design', {version: '0.2', owner: 'ux'}], ['design-language', {version: '0.14', owner: 'ui'}], ['ui-composition', {version: '0.2', owner: 'ui'}], ['component-design', {version: '0.2', owner: 'ui'}], ['prd-publication', {version: '1.0', owner: 'product'}]]);
const sourceNames = new Set(['ux', 'designLanguage', 'reviewLayout', 'ui', 'component']);

/** Produce one current-schema artifact proposal from validated structured sources, never product prose. */
export function createPublicationArtifactProposal({currentPath, request, sourceRoot, assetRoot}) {
  closed(request, ['id', 'artifactKind', 'status', 'scopeRefs', 'coverageRefs', 'gapRefs', 'lockRefs', 'artifactDependencyIds', 'encoding', 'sources', 'publication'], 'Publication request');
  const contract = contracts.get(request.artifactKind);
  if (!contract) fail(`Unsupported publication artifact kind ${request.artifactKind}`);
  if (!sourceRoot) fail('Publication sourceRoot is required');
  if (!request.sources || typeof request.sources !== 'object' || Array.isArray(request.sources)) fail('Publication sources must be an object');
  for (const name of Object.keys(request.sources)) if (!sourceNames.has(name)) fail(`Unknown publication source ${name}`);
  const chain = loadCurrentProduct(currentPath);
  const recordIndex = new Map(chain.model.recordIndex.map(record => [record.id, record]));
  const artifacts = new Map(chain.artifacts.map(item => [item.artifact.id, item]));
  if (!Array.isArray(request.artifactDependencyIds) || new Set(request.artifactDependencyIds).size !== request.artifactDependencyIds.length) fail('Publication dependency IDs must be unique');
  const dependencies = request.artifactDependencyIds.map(id => {
    const item = artifacts.get(id);
    if (!item || item.entry.dependencyState.status !== 'current' || item.artifact.status === 'superseded' || !item.artifact.consumerDomains.includes('prd')) fail(`Publication dependency ${id} must be current and available to PRD`);
    return item.artifact;
  });
  const read = name => {
    if (!Object.hasOwn(request.sources, name)) fail(`Missing publication source ${name}`);
    const relative = validatePublicationLogicalPath(request.sources[name]);
    const file = path.resolve(sourceRoot, relative);
    ensureUnlinkedPath(file, sourceRoot);
    return parseJsonFile(file, `Publication ${name} source`, PUBLICATION_DOCUMENT_MAX_BYTES);
  };
  let document;
  const inputs = {};
  if (request.artifactKind === 'ux-design') {
    document = read('ux');
    validateUxSpec(document);
  } else if (request.artifactKind === 'design-language') {
    document = {designLanguage: read('designLanguage'), reviewLayout: read('reviewLayout')};
    validateDesignLanguage(document.designLanguage, true);
    validateReviewConfig(document.reviewLayout);
  } else if (request.artifactKind === 'prd-publication') {
    document = request.publication;
    if (Object.keys(request.sources).length) fail('Publication manifest consumes exact artifact IDs rather than source files');
    const roles = [
      [document?.uxArtifactId, 'ux-design'],
      [document?.designLanguageArtifactId, 'design-language'],
      ...document?.uiArtifactId == null ? [] : [[document.uiArtifactId, 'ui-composition']],
      ...(document?.componentArtifactIds ?? []).map(id => [id, 'component-design']),
    ];
    for (const [id, kind] of roles) if (!dependencies.some(item => item.id === id && item.artifactKind === kind && item.artifactSchemaVersion === contracts.get(kind).version)) fail(`Publication role ${id} must bind ${kind} at its current schema`);
  } else {
    inputs.uxSpec = read('ux');
    inputs.designLanguage = read('designLanguage');
    inputs.assetRoot = assetRoot;
    inputs.sourceRoot = sourceRoot;
    validateUxSpec(inputs.uxSpec);
    validateDesignLanguage(inputs.designLanguage, true);
    for (const [kind, value] of [['ux-design', inputs.uxSpec], ['design-language', inputs.designLanguage]]) {
      const matches = dependencies.filter(item => item.artifactKind === kind);
      if (matches.length !== 1) fail(`Publication requires exactly one ${kind} dependency`);
      const decoded = decodePublicationDocument(matches[0].payload).document;
      const bound = kind === 'design-language' ? decoded.designLanguage : decoded;
      if (canonicalPublicationJson(bound) !== canonicalPublicationJson(value)) fail(`Publication ${kind} source differs from its exact artifact dependency`);
    }
    document = read(request.artifactKind === 'ui-composition' ? 'ui' : 'component');
    if (request.artifactKind === 'ui-composition') validateUiSpec(document, inputs);
    else {
      validateComponentDesign(document, inputs);
      if (Object.hasOwn(request.sources, 'ui')) {
        const ui = read('ui');
        const matches = dependencies.filter(item => item.artifactKind === 'ui-composition');
        if (matches.length !== 1 || canonicalPublicationJson(decodePublicationDocument(matches[0].payload).document) !== canonicalPublicationJson(ui)) fail('Component publication UI source differs from its exact artifact dependency');
        buildComponentRegistration(document, ui, inputs);
      }
    }
  }
  if (request.artifactKind !== 'prd-publication' && request.publication !== null) fail('Only the publication manifest accepts publication roles');
  const {resources, files} = collectArtifactResources(document, {assetRoot, sourceRoot});
  const refs = [...new Set([...request.scopeRefs, ...request.coverageRefs, ...request.gapRefs, ...request.lockRefs])];
  const proposal = validateProductArtifact({
    schemaVersion: '1.0', kind: 'product-artifact-proposal', id: request.id,
    artifactKind: request.artifactKind, owner: contract.owner, artifactSchemaVersion: contract.version,
    status: request.status, consumerDomains: ['prd'], scopeRefs: request.scopeRefs,
    coverageRefs: request.coverageRefs, gapRefs: request.gapRefs, lockRefs: request.lockRefs,
    recordDependencies: refs.map(id => {
      const record = recordIndex.get(id);
      if (!record) fail(`Publication scope references missing product record ${id}`);
      return {id, materialSha256: record.materialSha256};
    }),
    artifactDependencies: dependencies.map(item => ({id: item.id, revision: item.revision, materialSha256: item.materialSha256})),
    producer: {id: 'refine-design', contractVersion: '1.0', method: 'validated-publication-package'},
    resources, payload: encodePublicationDocument(document, {encoding: request.encoding}),
  }, {recordIndex: chain.model.recordIndex, artifactEntries: chain.snapshot.artifacts});
  return {proposal, files, baseSnapshotSha256: chain.current.snapshot.sha256};
}

function parseCli(args) {
  const allowed = new Set(['--current', '--input', '--source-root', '--asset-root', '--output']);
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!allowed.has(args[index]) || values[args[index]] !== undefined || args[index + 1] === undefined || args[index + 1].startsWith('--')) fail(`Invalid publication option ${args[index]}`);
    values[args[index]] = args[index + 1];
  }
  for (const key of ['--current', '--input', '--source-root', '--output']) if (!values[key]) fail(`Missing publication option ${key}`);
  return values;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const values = parseCli(process.argv.slice(2));
    const result = createPublicationArtifactProposal({currentPath: values['--current'], request: parseJsonFile(values['--input'], 'Publication request', 2 * 1024 * 1024), sourceRoot: values['--source-root'], assetRoot: values['--asset-root']});
    const output = path.resolve(values['--output']);
    const outputRoot = path.dirname(output);
    ensureUnlinkedPath(output, outputRoot);
    publishArtifactResourceFiles(result.files, {outputRoot});
    writeImmutable(output, Buffer.from(stableJson(result.proposal)), path.dirname(outputRoot));
    process.stdout.write(stableJson({proposalPath: output, resourceRoot: outputRoot, baseSnapshotSha256: result.baseSnapshotSha256}));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
