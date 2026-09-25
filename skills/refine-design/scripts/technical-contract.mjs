import {array, assertSha256, closed, fail, stableId, text, unique, safeRelativeLabel} from './product-artifact-utils.mjs';
import {canonicalProductContextJson, calculateProductContextMaterialSha256, validateConsumerContext} from './product-context-contract.mjs';
import {sha256} from './product-artifact-utils.mjs';

export const TECHNICAL_MAX_BYTES = 2 * 1024 * 1024;
export const technicalDigest = value => sha256(canonicalProductContextJson(value));
export const technicalBytes = value => Buffer.from(`${canonicalProductContextJson(value)}\n`);
const require = (condition, message) => { if (!condition) fail(message); };
const ids = (value, label) => unique(array(value, label).map(id => stableId(id, label)), label);
const texts = (value, label) => array(value, label).forEach(item => text(item, label));
const enumValue = (value, values, label) => require(values.includes(value), `${label}: invalid value ${value}`);
const owners = ['product', 'ux', 'ui', 'system-architecture', 'data-model', 'controller', 'technical-documentation', 'implementation-planning', 'testing', 'coding'];
const shapes = {
  fact: ['claim', 'limits', 'discussion'],
  boundary: ['responsibility', 'consumers', 'exchanges', 'lifecycle', 'failureBehavior', 'decisionRefs', 'discussion'],
  flow: ['trigger', 'preconditions', 'steps', 'success', 'failure', 'cancellation', 'retry', 'guarantees', 'limits', 'verification', 'decisionRefs', 'discussion'],
  contract: ['ownerRef', 'participantRefs', 'flowRefs', 'input', 'result', 'invariants', 'failure', 'lifecycle', 'discussion'],
  decision: ['context', 'choice', 'alternatives', 'consequences', 'authority', 'supersedes', 'discussion'],
  gap: ['question', 'category', 'affectedRefs', 'resolutionCriteria', 'resolutionRefs', 'discussion'],
};
const statuses = {fact: ['observed'], boundary: ['accepted', 'conditional', 'superseded'], flow: ['accepted', 'conditional', 'superseded'], contract: ['accepted', 'conditional', 'superseded'], decision: ['accepted', 'proposed', 'conditional', 'superseded'], gap: ['unresolved', 'resolved']};
const textArrays = new Set(['consumers', 'exchanges', 'preconditions', 'success', 'failure', 'guarantees', 'verification', 'consequences', 'resolutionCriteria', 'discussion', 'input', 'result', 'invariants']);

/** Validate the closed version-1 technical payload before interpreting references. */
export function validateTechnicalPayload(payload) {
  closed(payload, ['schemaVersion', 'evidenceDependencies', 'records'], 'technical payload');
  require(payload.schemaVersion === '1.0', 'Unsupported technical payload version');
  for (const dependency of array(payload.evidenceDependencies, 'evidenceDependencies')) {
    closed(dependency, ['id', 'materialSha256'], 'evidence dependency');
    stableId(dependency.id, 'evidence ID'); assertSha256(dependency.materialSha256, 'evidence digest');
  }
  unique(payload.evidenceDependencies.map(item => item.id), 'evidence dependencies');
  for (const record of array(payload.records, 'technical records')) {
    closed(record, ['id', 'kind', 'title', 'summary', 'owner', 'scopeRefs', 'productRefs', 'artifactRefs', 'dependsOn', 'evidenceRefs', 'status', 'details'], 'technical record');
    stableId(record.id, 'record ID'); enumValue(record.kind, Object.keys(shapes), 'record kind');
    enumValue(record.status, statuses[record.kind], 'record status'); enumValue(record.owner, owners, 'record owner');
    text(record.title, 'title'); text(record.summary, 'summary');
    for (const key of ['scopeRefs', 'productRefs', 'artifactRefs', 'dependsOn', 'evidenceRefs']) ids(record[key], key);
    require(record.scopeRefs.length > 0 && record.scopeRefs.every(id => record.productRefs.includes(id)), 'Scope must be nonempty and covered by productRefs');
    const details = closed({...record.details, discussion: record.details.discussion ?? []}, shapes[record.kind], `${record.kind} details`);
    for (const [key, value] of Object.entries(details)) {
      if (key.endsWith('Refs') || key === 'supersedes') ids(value, key);
      else if (key === 'ownerRef') stableId(value, key);
      else if (textArrays.has(key) || (key === 'limits' && record.kind === 'flow')) texts(value, key);
      else if (!['steps', 'alternatives', 'authority'].includes(key)) text(value, key);
    }
    if (record.kind === 'flow') {
      for (const step of array(details.steps, 'steps')) {
        closed(step, ['ownerRef', 'action', 'result'], 'step'); stableId(step.ownerRef, 'step owner'); text(step.action, 'step action'); text(step.result, 'step result');
        require(record.dependsOn.includes(step.ownerRef), 'Step owner must be a required dependency');
      }
      require(details.steps.length > 0 && details.success.length > 0 && details.failure.length > 0 && details.verification.length > 0, 'Flow requires steps, outcomes and verification');
    }
    if (record.kind === 'contract') {
      require(details.flowRefs.length > 0 && details.input.length > 0 && details.result.length > 0 && details.invariants.length > 0 && details.failure.length > 0, 'Contract requires flows, inputs, results, invariants and failure effects');
      require(record.dependsOn.includes(details.ownerRef) && [...details.participantRefs, ...details.flowRefs].every(id => record.dependsOn.includes(id)), 'Contract references must be required dependencies');
    }
    if (record.kind === 'decision') {
      for (const alternative of array(details.alternatives, 'alternatives')) {
        closed(alternative, ['option', 'disposition', 'reason'], 'alternative'); text(alternative.option, 'option'); text(alternative.reason, 'reason'); enumValue(alternative.disposition, ['declined', 'unselected'], 'disposition');
      }
      closed(details.authority, ['actor', 'basis', 'evidenceRef'], 'decision authority');
      enumValue(details.authority.actor, ['parent', 'owner'], 'authority actor'); text(details.authority.basis, 'authority basis');
      require(record.evidenceRefs.includes(details.authority.evidenceRef), 'Decision authority must be bound evidence');
    }
    if (record.kind === 'gap') {
      enumValue(details.category, ['product', 'technical', 'evidence'], 'gap category');
      require(details.resolutionCriteria.length > 0, 'Gap requires resolution criteria');
      require(record.status === 'resolved' ? details.resolutionRefs.length > 0 : details.resolutionRefs.length === 0, 'Gap status and resolution references disagree');
    }
    for (const id of [...(details.decisionRefs ?? []), ...(details.resolutionRefs ?? [])]) require(record.dependsOn.includes(id), 'Decision/resolution reference must be a required dependency');
  }
  unique(payload.records.map(record => record.id), 'technical record IDs');
  require(technicalBytes(payload).length <= TECHNICAL_MAX_BYTES, 'Technical payload exceeds size limit');
  return payload;
}

export function validateRepositoryBaseline(baseline) {
  closed(baseline, ['id', 'repositoryId', 'head', 'indexSha256', 'changes', 'observations', 'materialSha256'], 'baseline');
  stableId(baseline.id, 'baseline ID'); stableId(baseline.repositoryId, 'repository ID');
  require(baseline.head === null || /^[0-9a-f]{40,64}$/.test(baseline.head), 'Invalid repository HEAD');
  assertSha256(baseline.indexSha256, 'index digest');
  for (const item of array(baseline.changes, 'changes')) {
    closed(item, ['path', 'indexStatus', 'worktreeStatus', 'indexObjectId', 'workingSha256', 'mode'], 'change');
    safeRelativeLabel(item.path, 'change path');
    for (const key of ['indexStatus', 'worktreeStatus']) require(/^[ MADRCU?!]$/.test(item[key]), 'Invalid Git status');
    require(item.indexObjectId === null || /^[0-9a-f]{40,64}$/.test(item.indexObjectId), 'Invalid index object');
    if (item.workingSha256 !== null) assertSha256(item.workingSha256, 'working digest');
    require(item.mode === null || ['100644', '100755', '120000', '160000'].includes(item.mode), 'Invalid change mode');
  }
  for (const item of array(baseline.observations, 'observations')) {
    closed(item, ['path', 'workingSha256', 'mode'], 'observation'); safeRelativeLabel(item.path, 'observation path');
    if (item.workingSha256 !== null) assertSha256(item.workingSha256, 'observation digest');
    require(item.mode === null || ['100644', '100755', '120000'].includes(item.mode), 'Submodule source needs a separate baseline');
  }
  unique(baseline.changes.map(item => item.path), 'change paths'); unique(baseline.observations.map(item => item.path), 'observation paths');
  const {materialSha256, ...material} = baseline;
  require(technicalDigest(material) === materialSha256, 'Baseline digest mismatch');
  return baseline;
}

export function validateEvidence(evidence) {
  closed(evidence, ['id', 'kind', 'summary', 'binding', 'sourceFiles'], 'evidence'); stableId(evidence.id, 'evidence ID'); text(evidence.summary, 'evidence summary');
  for (const source of array(evidence.sourceFiles, 'sourceFiles')) {
    closed(source, ['path', 'sha256'], 'evidence source'); safeRelativeLabel(source.path, 'source path'); assertSha256(source.sha256, 'source digest');
  }
  unique(evidence.sourceFiles.map(item => item.path), 'evidence source paths');
  const fields = {
    repository: ['baselineId', 'baselineSha256', 'paths', 'locator', 'observationSha256'],
    assessment: ['role', 'question', 'reportSha256', 'inputRefs', 'disposition', 'rationale'],
    authority: ['actor', 'scopeRefs', 'instruction', 'receiptSha256'],
    standard: ['standardId', 'section', 'sha256', 'applicabilitySha256'],
    research: ['url', 'retrievedAt', 'claim', 'sourceSha256', 'recheckWhen'],
  };
  enumValue(evidence.kind, Object.keys(fields), 'evidence kind');
  const binding = closed(evidence.binding, fields[evidence.kind], 'evidence binding');
  for (const [key, value] of Object.entries(binding)) {
    if (key.endsWith('Sha256') || key === 'sha256') assertSha256(value, key);
    else if (key.endsWith('Refs')) ids(value, key);
    else if (key === 'paths') { unique(array(value, key), key); value.forEach(item => safeRelativeLabel(item, key)); require(value.length > 0, 'Repository evidence requires paths'); }
    else text(value, key);
  }
  if (evidence.kind === 'assessment') enumValue(binding.disposition, ['accepted', 'conditional', 'declined'], 'assessment disposition');
  if (evidence.kind === 'authority') enumValue(binding.actor, ['parent', 'owner'], 'authority actor');
  if (evidence.kind === 'research') { require(/^https?:\/\//.test(binding.url), 'Research needs an HTTP source'); require(Number.isFinite(Date.parse(binding.retrievedAt)), 'Invalid retrieval time'); }
  const sourceHashes = {assessment: ['reportSha256'], authority: ['receiptSha256'], standard: ['sha256', 'applicabilitySha256'], research: ['sourceSha256']};
  for (const key of sourceHashes[evidence.kind] ?? []) require(evidence.sourceFiles.some(item => item.sha256 === binding[key]), `Evidence ${key} needs an exact source file binding`);
  return evidence;
}

/** Cross-check semantic references against exact envelope and evidence bindings. */
export function validateTechnicalCollection(artifacts, evidence, baselines, productIds) {
  unique(evidence.map(item => item.id), 'evidence IDs'); unique(baselines.map(item => item.id), 'baseline IDs');
  const evidenceById = new Map(evidence.map(item => [item.id, validateEvidence(item)]));
  const baselineById = new Map(baselines.map(item => [item.id, validateRepositoryBaseline(item)]));
  const artifactById = new Map(artifacts.map(item => [item.id, item]));
  const records = new Map(); const usedEvidence = new Set(); const usedBaselines = new Set();
  for (const artifact of artifacts.filter(item => item.artifactKind === 'technical-design')) {
    require(artifact.owner === 'technical-documentation' && artifact.artifactSchemaVersion === '1.0', 'Invalid technical artifact owner/version');
    require(artifact.consumerDomains.length === 1 && artifact.consumerDomains[0] === 'technical-documentation', 'Technical artifacts must use only the technical-documentation audience');
    require(artifact.resources.length === 0, 'Technical artifacts do not carry binary resources');
    validateTechnicalPayload(artifact.payload);
    for (const dependency of artifact.payload.evidenceDependencies) {
      const item = evidenceById.get(dependency.id);
      require(item && technicalDigest(item) === dependency.materialSha256, `Missing or changed evidence ${dependency.id}`); usedEvidence.add(item.id);
    }
    for (const record of artifact.payload.records) {
      require(!records.has(record.id), `Duplicate technical record ${record.id}`); records.set(record.id, {record, artifact});
      for (const ref of record.productRefs) require(productIds.has(ref) && artifact.recordDependencies.some(item => item.id === ref), `Unbound product reference ${ref}`);
      for (const ref of record.artifactRefs) require(artifact.artifactDependencies.some(item => item.id === ref) && artifactById.has(ref), `Unbound artifact reference ${ref}`);
      for (const ref of record.evidenceRefs) require(artifact.payload.evidenceDependencies.some(item => item.id === ref), `Unbound evidence reference ${ref}`);
      if (record.kind === 'fact') require(record.evidenceRefs.some(ref => evidenceById.get(ref)?.kind === 'repository'), 'Observed fact requires repository evidence');
      if (record.kind === 'decision') {
        const authority = evidenceById.get(record.details.authority.evidenceRef);
        require(authority?.kind === 'authority' && authority.binding.actor === record.details.authority.actor && record.scopeRefs.every(id => authority.binding.scopeRefs.includes(id)), 'Decision authority does not cover its scope');
      }
    }
    const boundEvidence = new Set(artifact.payload.evidenceDependencies.map(item => item.id));
    const allowedInputs = new Set([...artifact.recordDependencies.map(item => item.id), ...artifact.artifactDependencies.map(item => item.id), ...artifact.payload.records.flatMap(item => [item.id, ...item.dependsOn]), ...boundEvidence]);
    for (const ref of artifact.payload.evidenceDependencies) for (const input of [...(evidenceById.get(ref.id).binding.inputRefs ?? []), ...(evidenceById.get(ref.id).binding.scopeRefs ?? [])]) require(allowedInputs.has(input), `Assessment input ${input} is not exactly bound by its consuming artifact`);
  }
  const available = new Set([...productIds, ...artifactById.keys(), ...records.keys(), ...evidenceById.keys()]);
  for (const item of evidence) {
    if (item.kind === 'repository') {
      const baseline = baselineById.get(item.binding.baselineId); usedBaselines.add(item.binding.baselineId);
      require(baseline && baseline.materialSha256 === item.binding.baselineSha256, 'Evidence baseline binding mismatch');
      const observations = item.binding.paths.map(p => baseline.observations.find(o => o.path === p));
      require(observations.every(Boolean) && technicalDigest(observations) === item.binding.observationSha256, 'Evidence observation binding mismatch');
    }
    for (const ref of [...(item.binding.inputRefs ?? []), ...(item.binding.scopeRefs ?? [])]) require(available.has(ref), `Missing evidence input ${ref}`);
  }
  const evidenceVisiting = new Set(); const evidenceVisited = new Set();
  const visitEvidence = id => {
    require(!evidenceVisiting.has(id), `Evidence dependency cycle at ${id}`); if (evidenceVisited.has(id)) return;
    evidenceVisiting.add(id);
    for (const ref of evidenceById.get(id).binding.inputRefs ?? []) if (evidenceById.has(ref)) visitEvidence(ref);
    evidenceVisiting.delete(id); evidenceVisited.add(id);
  };
  for (const id of evidenceById.keys()) visitEvidence(id);
  require(evidence.every(item => usedEvidence.has(item.id)), 'Unselected evidence must not enter context');
  require(baselines.every(item => usedBaselines.has(item.id)), 'Unselected baseline must not enter context');
  const visiting = new Set(); const visited = new Set();
  const visit = id => {
    require(!visiting.has(id), `Technical dependency cycle at ${id}`); if (visited.has(id)) return;
    visiting.add(id); const {record, artifact} = records.get(id);
    for (const ref of record.dependsOn) {
      const target = records.get(ref); require(target, `Missing technical dependency ${ref}`);
      require(target.record.status !== 'superseded', 'Superseded decision cannot satisfy a live dependency');
      if (record.status === 'accepted') require(!['proposed', 'conditional', 'unresolved'].includes(target.record.status), 'Accepted direction cannot depend on an unsettled required decision');
      require(target.artifact.id === artifact.id || artifact.artifactDependencies.some(item => item.id === target.artifact.id), `Cross-artifact dependency ${ref} is not bound`);
      visit(ref);
    }
    for (const ref of record.details.decisionRefs ?? []) require(records.get(ref)?.record.kind === 'decision', 'Decision reference has wrong kind');
    for (const step of record.details.steps ?? []) require(records.get(step.ownerRef)?.record.kind === 'boundary', 'Flow step owner must be a boundary');
    if (record.kind === 'contract') {
      require(records.get(record.details.ownerRef)?.record.kind === 'boundary', 'Contract owner must be a boundary');
      for (const ref of record.details.participantRefs) require(records.get(ref)?.record.kind === 'boundary', 'Contract participant must be a boundary');
      for (const ref of record.details.flowRefs) require(records.get(ref)?.record.kind === 'flow', 'Contract flow reference has wrong kind');
    }
    for (const ref of record.details.affectedRefs ?? []) require(records.has(ref), 'Gap affects unknown record');
    for (const ref of record.details.supersedes ?? []) require(records.get(ref)?.record.status === 'superseded', 'Supersession must retain the superseded decision');
    visiting.delete(id); visited.add(id);
  };
  for (const id of records.keys()) visit(id);
  return artifacts;
}

/** Validate a detached technical package without claiming live source freshness. */
export function validateTechnicalContext(context) {
  validateConsumerContext(context, {consumer: 'technical', audience: 'technical-documentation', extraKeys: ['evidence', 'repositoryBaselines', ...(Object.hasOwn(context, 'whitePapers') ? ['whitePapers'] : [])]});
  array(context.evidence, 'evidence'); array(context.repositoryBaselines, 'repositoryBaselines');
  if (context.whitePapers !== undefined) {
    const names = new Set();
    for (const [index, paper] of array(context.whitePapers, 'whitePapers').entries()) {
      closed(paper, ['claimId', 'title', 'summary', 'path', 'sha256', 'sourceSha256', 'researchStatus', 'researchReportSha256'], `whitePapers[${index}]`);
      stableId(paper.claimId, 'white paper claim ID');
      for (const key of ['title', 'summary']) if (typeof paper[key] !== 'string' || !paper[key].trim() || paper[key].length > 500) fail(`White paper ${key} is invalid`);
      if (typeof paper.path !== 'string' || !paper.path || paper.path.startsWith('/') || /^[a-z][a-z0-9+.-]*:/iu.test(paper.path) || paper.path.includes('\\') || paper.path.split('/').some(part => !part || part === '.' || part === '..') || /[\u0000-\u001f\u007f]/u.test(paper.path)) fail('White paper path must be a normalized repository-relative source path');
      assertSha256(paper.sha256, 'white paper SHA-256');
      if (!['current', 'stale', 'unassessed'].includes(paper.researchStatus)) fail('White paper research status is invalid');
      if (paper.researchStatus === 'unassessed' ? paper.researchReportSha256 !== null : !/^[0-9a-f]{64}$/u.test(paper.researchReportSha256)) fail('White paper research report binding is invalid');
      if (paper.sourceSha256 !== context.provenance.sourceSha256) fail('White paper reference is stale for the product description');
      if (names.has(paper.path)) fail('Duplicate white paper in technical context');
      names.add(paper.path);
    }
  }
  require(context.artifacts.every(item => item.resources.length === 0), 'Technical contexts do not include binary resources');
  validateTechnicalCollection(context.artifacts, context.evidence, context.repositoryBaselines, new Set([context.product.id, context.product.purpose.id, ...context.product.users.map(item => item.id), ...context.capabilities.map(item => item.id), ...context.gaps.map(item => item.id)]));
  require(technicalBytes(context).length <= TECHNICAL_MAX_BYTES, 'Technical context exceeds byte limit');
  return context;
}

export function bindTechnicalContext(context) {
  context.materialSha256 = calculateProductContextMaterialSha256(context);
  context.contextId = `technical-context-${context.materialSha256.slice(0, 12)}`;
  return context;
}
