import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyArtifactResourceFiles, publishArtifactResourceFiles} from './product-publication-package.mjs';

import {
  PRODUCT_CONTEXT_MAX_BYTES,
  calculateProductContextMaterialSha256,
  validateProductContext,
} from './product-context-contract.mjs';
import {loadCurrentProduct} from './product-model.mjs';
import {
  fail,
  sha256,
  stableId,
  stableJson,
  unique,
  writeImmutable,
} from './product-artifact-utils.mjs';

export {
  PRODUCT_CONTEXT_MAX_BYTES,
  calculateProductContextMaterialSha256,
  validateProductContext,
} from './product-context-contract.mjs';

function normalizedScope(scope) {
  return unique((scope ?? []).map((item, index) => stableId(item, `scope[${index}]`)), 'scope');
}

function activeForPrd(record) {
  return record.status !== 'superseded' && record.consumerDomains.includes('prd');
}

function recordIndex(chain) {
  const records = new Map(chain.model.recordIndex.map(record => [record.id, record]));
  const required = [
    chain.model.id,
    chain.model.purpose.id,
    ...chain.model.users.map(record => record.id),
    ...chain.model.capabilities.map(record => record.id),
    ...chain.model.gaps.map(record => record.id),
  ];
  for (const ref of required) if (!records.has(ref)) fail(`Product record index is missing ${ref}`);
  return records;
}

function selectRecords(model, requestedScope, requiredRefs = []) {
  if (!model.consumerDomains.includes('prd') || !activeForPrd(model.purpose)) fail('Product model and purpose must be available to prd');
  const externalById = new Map([
    [model.id, {type: 'product', record: model}],
    [model.purpose.id, {type: 'purpose', record: model.purpose}],
    ...model.users.filter(activeForPrd).map(record => [record.id, {type: 'user', record}]),
    ...model.capabilities.filter(activeForPrd).map(record => [record.id, {type: 'capability', record}]),
    ...model.gaps.filter(activeForPrd).map(record => [record.id, {type: 'gap', record}]),
  ]);
  for (const ref of [...requestedScope, ...requiredRefs]) {
    if (!externalById.has(ref)) fail(`PRD selection references unavailable record ${ref}`);
  }
  const selected = requestedScope.length === 0
    ? new Set([
      model.id,
      model.purpose.id,
      ...model.users.filter(activeForPrd).map(record => record.id),
      ...model.capabilities.filter(activeForPrd).map(record => record.id),
      ...model.gaps.filter(activeForPrd).map(record => record.id),
      ...requiredRefs,
    ])
    : new Set([model.id, model.purpose.id, ...requestedScope, ...requiredRefs]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const capability of model.capabilities) {
      if (!selected.has(capability.id)) continue;
      for (const ref of [...capability.userRefs, ...capability.relatedCapabilityRefs]) {
        if (!externalById.has(ref)) fail(`Selected capability ${capability.id} has unavailable PRD dependency ${ref}`);
        if (!selected.has(ref)) {
          selected.add(ref);
          changed = true;
        }
      }
    }
    for (const gap of model.gaps) {
      if (selected.has(gap.id)) {
        for (const ref of gap.capabilityRefs) {
          if (!externalById.has(ref)) fail(`Selected gap ${gap.id} has unavailable PRD dependency ${ref}`);
          if (!selected.has(ref)) {
            selected.add(ref);
            changed = true;
          }
        }
      } else if (activeForPrd(gap) && gap.capabilityRefs.some(ref => selected.has(ref))) {
        selected.add(gap.id);
        changed = true;
      }
    }
  }
  return {
    selected,
    users: model.users.filter(record => selected.has(record.id) && activeForPrd(record)),
    capabilities: model.capabilities.filter(record => selected.has(record.id) && activeForPrd(record)),
    gaps: model.gaps.filter(record => selected.has(record.id) && activeForPrd(record)),
  };
}

function artifactInventory(chain) {
  const loaded = chain.artifacts ?? [];
  const byId = new Map();
  for (const item of loaded) {
    if (!item || !item.entry || !item.artifact) fail('Loaded product artifacts must contain entry and artifact');
    if (byId.has(item.artifact.id)) fail(`Loaded product artifacts contain duplicate ${item.artifact.id}`);
    byId.set(item.artifact.id, item);
  }
  const expected = chain.snapshot.artifacts ?? [];
  if (expected.length !== loaded.length) fail('Verified product artifact inventory is incomplete');
  for (const entry of expected) if (!byId.has(entry.id)) fail(`Verified product artifact inventory is missing ${entry.id}`);
  return byId;
}

function artifactTouchesScope(artifact, selected) {
  return artifactRecordRefs(artifact).some(ref => selected.has(ref));
}

function artifactRecordRefs(artifact) {
  return [
    ...artifact.scopeRefs,
    ...artifact.coverageRefs,
    ...artifact.gapRefs,
    ...artifact.lockRefs,
    ...artifact.recordDependencies.map(dependency => dependency.id),
  ];
}

function compareCodePoints(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function selectArtifacts(chain, initialSelection, scoped) {
  const inventory = artifactInventory(chain);
  const selected = new Map();
  const excluded = new Map();

  const artifactClosureFitsScope = (item, visiting = new Set()) => {
    if (!scoped) return true;
    const {artifact} = item;
    if (artifactRecordRefs(artifact).some(ref => !initialSelection.selected.has(ref))) return false;
    if (visiting.has(artifact.id)) fail(`PRD artifact dependency cycle includes ${artifact.id}`);
    visiting.add(artifact.id);
    try {
      return artifact.artifactDependencies.every(dependency => {
        const target = inventory.get(dependency.id);
        return target ? artifactClosureFitsScope(target, visiting) : true;
      });
    } finally {
      visiting.delete(artifact.id);
    }
  };

  const roots = [...inventory.values()].filter(({artifact}) => (
    artifact.consumerDomains.includes('prd')
    && (!scoped || (
      artifactTouchesScope(artifact, initialSelection.selected)
      && artifactClosureFitsScope(inventory.get(artifact.id))
    ))
  ));

  const include = item => {
    const {entry, artifact} = item;
    const outcome = artifact.status === 'superseded' ? 'superseded' : entry.dependencyState.status;
    if (outcome !== 'current') {
      excluded.set(artifact.id, {
        id: artifact.id,
        artifactKind: artifact.artifactKind,
        revision: artifact.revision,
        status: artifact.status,
        outcome,
        materialSha256: artifact.materialSha256,
        reasons: outcome === 'superseded' && entry.dependencyState.reasons.length === 0
          ? ['artifact:superseded']
          : [...entry.dependencyState.reasons],
      });
      return;
    }
    if (scoped && !artifactClosureFitsScope(item)) {
      fail(`PRD artifact ${artifact.id} exceeds the selected product-record scope`);
    }
    if (selected.has(artifact.id)) return;
    selected.set(artifact.id, artifact);
    for (const dependency of artifact.artifactDependencies) {
      const target = inventory.get(dependency.id);
      if (!target) fail(`PRD artifact ${artifact.id} depends on missing artifact ${dependency.id}`);
      if (!target.artifact.consumerDomains.includes('prd')) {
        fail(`PRD artifact ${artifact.id} depends on non-PRD artifact ${dependency.id}`);
      }
      if (target.artifact.revision !== dependency.revision || target.artifact.materialSha256 !== dependency.materialSha256) {
        fail(`PRD artifact ${artifact.id} has stale artifact dependency ${dependency.id}`);
      }
      const before = selected.size;
      include(target);
      if (selected.size === before && !selected.has(dependency.id)) {
        fail(`PRD artifact ${artifact.id} depends on unavailable artifact ${dependency.id}`);
      }
    }
  };
  for (const root of roots) include(root);
  return {
    artifacts: [...selected.values()].sort((left, right) => compareCodePoints(left.id, right.id)),
    exclusions: [...excluded.values()].sort((left, right) => compareCodePoints(left.id, right.id)),
  };
}

function selectedRecordRefs(artifacts) {
  return [...new Set(artifacts.flatMap(artifact => [
    ...artifact.scopeRefs,
    ...artifact.coverageRefs,
    ...artifact.gapRefs,
    ...artifact.lockRefs,
    ...artifact.recordDependencies.map(dependency => dependency.id),
  ]))].sort();
}

function material(records, ref) {
  const record = records.get(ref);
  if (!record) fail(`Product record index is missing ${ref}`);
  return record.materialSha256;
}

function buildLocks(model, selection, artifacts) {
  const locks = [];
  if (model.status === 'locked') locks.push({ref: model.id, kind: 'product', owner: model.owner});
  if (model.purpose.status === 'locked') locks.push({ref: model.purpose.id, kind: 'purpose', owner: model.purpose.owner});
  for (const [kind, records] of [['user', selection.users], ['capability', selection.capabilities], ['gap', selection.gaps]]) {
    for (const record of records) if (record.status === 'locked') locks.push({ref: record.id, kind, owner: record.owner});
  }
  for (const artifact of artifacts) if (artifact.status === 'locked') locks.push({ref: artifact.id, kind: 'artifact', owner: artifact.owner});
  return locks.sort((left, right) => compareCodePoints(left.ref, right.ref) || compareCodePoints(left.kind, right.kind));
}

function buildContext(chain, requestedScope) {
  const scopeRefs = normalizedScope(requestedScope);
  const initial = selectRecords(chain.model, scopeRefs);
  const artifactSelection = selectArtifacts(chain, initial, scopeRefs.length > 0);
  const selection = selectRecords(chain.model, scopeRefs, selectedRecordRefs(artifactSelection.artifacts));
  const records = recordIndex(chain);
  const context = {
    schemaVersion: '1.0',
    contextId: 'pending',
    consumer: 'prd',
    sourceSnapshot: {
      id: chain.snapshot.id,
      revision: chain.snapshot.revision,
      sha256: chain.current.snapshot.sha256,
    },
    productModel: {
      id: chain.model.id,
      revision: chain.model.revision,
      status: chain.model.status,
      sha256: chain.snapshot.productModel.sha256,
      materialSha256: chain.model.materialSha256,
    },
    scopeRefs,
    product: {
      id: chain.model.id,
      name: chain.model.name,
      status: chain.model.status,
      owner: chain.model.owner,
      materialSha256: material(records, chain.model.id),
      purpose: {
        id: chain.model.purpose.id,
        summary: chain.model.purpose.summary,
        status: chain.model.purpose.status,
        owner: chain.model.purpose.owner,
        materialSha256: material(records, chain.model.purpose.id),
      },
      users: selection.users.map(user => ({
        id: user.id,
        name: user.name,
        description: user.description,
        status: user.status,
        owner: user.owner,
        materialSha256: material(records, user.id),
      })),
    },
    capabilities: selection.capabilities.map(capability => ({
      id: capability.id,
      name: capability.name,
      description: capability.description,
      outcome: capability.outcome,
      status: capability.status,
      owner: capability.owner,
      materialSha256: material(records, capability.id),
    })),
    gaps: selection.gaps.map(gap => ({
      id: gap.id,
      kind: gap.kind,
      question: gap.question,
      impact: gap.impact,
      status: gap.status,
      owner: gap.owner,
      materialSha256: material(records, gap.id),
      affectsRefs: [...gap.capabilityRefs],
    })),
    artifacts: artifactSelection.artifacts.map(artifact => structuredClone(artifact)),
    locks: buildLocks(chain.model, selection, artifactSelection.artifacts),
    exclusions: artifactSelection.exclusions,
    provenance: {
      sourceId: chain.model.source.id,
      sourceRevision: chain.model.source.revision,
      sourceSha256: chain.model.source.sha256,
    },
    materialSha256: 'pending',
  };
  context.materialSha256 = calculateProductContextMaterialSha256(context);
  context.contextId = `prd-context-${context.materialSha256.slice(0, 12)}`;
  return context;
}

export function resolveProductContext({currentPath, consumer = 'prd', scope = []}) {
  if (consumer !== 'prd') fail(`Unsupported product-context consumer ${consumer}`);
  const chain = loadCurrentProduct(currentPath);
  const context = validateProductContext(buildContext(chain, scope));
  const bytes = Buffer.from(stableJson(context));
  if (bytes.byteLength > PRODUCT_CONTEXT_MAX_BYTES) {
    fail(`Product context exceeds the ${PRODUCT_CONTEXT_MAX_BYTES}-byte aggregate limit`);
  }
  const storedPath = `contexts/prd/${context.materialSha256}/context.json`;
  const file = path.resolve(chain.root, ...storedPath.split('/'));
  const resourceFiles = context.artifacts.flatMap(artifact => verifyArtifactResourceFiles(artifact.resources, {resourceRoot: chain.root}));
  publishArtifactResourceFiles(resourceFiles, {outputRoot: path.dirname(file)});
  const created = writeImmutable(file, bytes, chain.root);
  return {
    schemaVersion: '1.0',
    consumer,
    path: storedPath,
    sha256: sha256(bytes),
    materialSha256: context.materialSha256,
    created,
    context,
  };
}

function parseCli(arguments_) {
  const values = {};
  const names = new Set(['--current', '--consumer', '--scope']);
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    if (!names.has(flag)) fail(`Unknown option ${String(flag)}`);
    if (value === undefined || names.has(value)) fail(`Missing value for ${flag}`);
    if (Object.hasOwn(values, flag)) fail(`Repeated option ${flag}`);
    values[flag] = value;
  }
  if (!Object.hasOwn(values, '--current')) fail('Missing required option --current');
  return values;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    const options = parseCli(process.argv.slice(2));
    const result = resolveProductContext({
      currentPath: options['--current'],
      consumer: options['--consumer'] ?? 'prd',
      scope: options['--scope'] ? options['--scope'].split(',').filter(Boolean) : [],
    });
    process.stdout.write(stableJson({
      schemaVersion: result.schemaVersion,
      consumer: result.consumer,
      path: result.path,
      sha256: result.sha256,
      materialSha256: result.materialSha256,
      created: result.created,
    }));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
