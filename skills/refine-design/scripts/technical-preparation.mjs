import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCurrentProduct} from './product-model.mjs';
import {commitProductArtifact} from './product-artifact-store.mjs';
import {validateProductArtifact} from './product-artifact-contract.mjs';
import {closed, ensureUnlinkedPath, fail, parseJsonFile, writeImmutable} from './product-artifact-utils.mjs';
import {captureRepositoryBaseline} from './technical-repository.mjs';
import {evidenceCurrent, loadTechnicalEvidence} from './technical-context.mjs';
import {TECHNICAL_MAX_BYTES, technicalBytes, technicalDigest, validateEvidence, validateRepositoryBaseline, validateTechnicalCollection} from './technical-contract.mjs';

/** Persist an inspected dirty baseline without changing source or Git state. */
export function inspectTechnicalRepository({currentPath, repositoryRoot, repositoryId, paths}) {
  const chain = loadCurrentProduct(currentPath);
  ensureUnlinkedPath(chain.root, repositoryRoot);
  if (!/^product[\\/][^\\/]+$/.test(path.relative(path.resolve(repositoryRoot), chain.root))) fail('Use the named repository product directory');
  const baseline = captureRepositoryBaseline({repositoryRoot, repositoryId, paths});
  const storedPath = `technical/baselines/${baseline.materialSha256}.json`;
  const created = writeImmutable(path.join(chain.root, storedPath), technicalBytes(baseline), chain.root);
  return {path: storedPath, created, baseline};
}

/** Commit only reconciled, exactly bound technical advice against a verified snapshot. */
export function prepareTechnicalArtifact({currentPath, repositoryRoot, baseSnapshotSha256, inputPath, authority}) {
  if (!repositoryRoot) fail('Preparation requires the repository root');
  const chain = loadCurrentProduct(currentPath);
  ensureUnlinkedPath(chain.root, repositoryRoot);
  if (!/^product[\\/][^\\/]+$/.test(path.relative(path.resolve(repositoryRoot), chain.root))) fail('Use the named repository product directory');
  if (baseSnapshotSha256 !== chain.current.snapshot.sha256) fail('Technical preparation base snapshot is no longer current');
  const input = parseJsonFile(inputPath, 'technical preparation input', TECHNICAL_MAX_BYTES);
  closed(input, ['proposal', 'evidence', 'repositoryBaselines'], 'technical preparation input');
  const proposal = validateProductArtifact(input.proposal, {recordIndex: chain.model.recordIndex, artifactEntries: chain.snapshot.artifacts});
  if (proposal.artifactKind !== 'technical-design') fail('Preparation accepts a technical-design proposal');
  const previous = chain.artifacts.find(item => item.artifact.id === proposal.id)?.artifact;
  if (previous) for (const record of previous.payload.records) {
    const next = proposal.payload.records.find(item => item.id === record.id);
    if (!next || next.kind !== record.kind || (record.status === 'superseded' && technicalDigest(next) !== technicalDigest(record))) fail(`Preserve technical record identity and superseded history: ${record.id}`);
  }
  if (!Array.isArray(input.evidence) || !Array.isArray(input.repositoryBaselines)) fail('Preparation requires evidence and baselines arrays');
  input.evidence.forEach(validateEvidence); input.repositoryBaselines.forEach(validateRepositoryBaseline);
  if (!input.evidence.some(item => item.kind === 'repository')) fail('Preparation requires an inspected repository observation');
  if (!input.evidence.some(item => item.kind === 'assessment' && item.binding.role === 'system-architect')) fail('Technical preparation requires preserved system-architect assessment evidence');
  const upstream = new Map();
  const visit = artifact => {
    for (const ref of artifact.artifactDependencies) {
      if (upstream.has(ref.id)) continue;
      const item = chain.artifacts.find(value => value.artifact.id === ref.id);
      if (!item || item.entry.dependencyState.status !== 'current' || item.artifact.status === 'superseded' || !item.artifact.consumerDomains.includes('technical-documentation')) fail(`Technical dependency ${ref.id} is unavailable`);
      if (item.artifact.resources.length) fail('Technical context dependencies cannot carry binary resources');
      upstream.set(ref.id, item.artifact); visit(item.artifact);
    }
  };
  visit(proposal);
  const loaded = loadTechnicalEvidence(chain.root, [...upstream.values()]);
  const merge = (left, right) => {
    const values = new Map(left.map(item => [item.id, item]));
    for (const item of right) { if (values.has(item.id) && technicalDigest(values.get(item.id)) !== technicalDigest(item)) fail(`Conflicting binding ${item.id}`); values.set(item.id, item); }
    return [...values.values()];
  };
  const evidence = merge(loaded.evidence, input.evidence); const baselines = merge(loaded.repositoryBaselines, input.repositoryBaselines);
  validateTechnicalCollection([...upstream.values(), proposal], evidence, baselines, new Set(chain.model.recordIndex.map(item => item.id)));
  for (const item of evidence) if (!evidenceCurrent(item, baselines, repositoryRoot)) fail(`Technical evidence ${item.id} is stale; reassess before preparation`);
  // Evidence is immutable. A failed artifact commit may leave reusable orphan inputs,
  // but only the existing store transaction can replace current.json.
  for (const baseline of input.repositoryBaselines) writeImmutable(path.join(chain.root, 'technical/baselines', `${baseline.materialSha256}.json`), technicalBytes(baseline), chain.root);
  for (const item of input.evidence) writeImmutable(path.join(chain.root, 'technical/evidence', `${technicalDigest(item)}.json`), technicalBytes(item), chain.root);
  const proposalPath = path.join(chain.root, 'technical/proposals', `${technicalDigest(proposal)}.json`);
  writeImmutable(proposalPath, technicalBytes(proposal), chain.root);
  for (const item of evidence) if (!evidenceCurrent(item, baselines, repositoryRoot)) fail('Evidence changed during technical preparation');
  return commitProductArtifact({currentPath, baseSnapshotSha256, proposalPath, authority});
}

function cli(argv) {
  const [mode, ...args] = argv; const options = {};
  const allowed = new Set(['--current', '--repo', '--repository-id', '--paths', '--input', '--base-snapshot-sha256', '--authority']);
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || Object.hasOwn(options, args[i])) fail(`Invalid option ${args[i]}`);
    options[args[i]] = args[i + 1];
  }
  if (!options['--current'] || !options['--repo']) fail('Required: --current and --repo');
  const common = {currentPath: options['--current'], repositoryRoot: options['--repo']};
  if (mode === 'inspect') return inspectTechnicalRepository({...common, repositoryId: options['--repository-id'], paths: options['--paths']?.split(',')});
  if (mode === 'prepare') return prepareTechnicalArtifact({...common, baseSnapshotSha256: options['--base-snapshot-sha256'], inputPath: options['--input'], authority: options['--authority'] ? parseJsonFile(options['--authority'], 'authority', 4096) : undefined});
  fail('Modes: inspect, prepare');
}

if (process.argv[1] && fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(path.resolve(process.argv[1]))) {
  try { process.stdout.write(`${JSON.stringify(cli(process.argv.slice(2)), null, 2)}\n`); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
