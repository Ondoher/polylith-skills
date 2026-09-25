import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {loadCurrentProduct, persistProductModel} from './product-model.mjs';
import {sha256, stableJson, writeImmutable} from './product-artifact-utils.mjs';
import {commitProductArtifact} from './product-artifact-store.mjs';
import {technicalBytes, technicalDigest} from './technical-contract.mjs';
import {resolveWhitePaperReferences} from './white-paper-references.mjs';
import {resolveProductContext} from './product-context.mjs';
import {generateTechnical} from '../../generate-technical/scripts/generate-technical.mjs';

const fixtures = new URL('../references/fixtures/product-model/field-journal/', import.meta.url);

test('binds one authored paper by current description claim and current paper bytes', t => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'paper-reference-'));
  t.after(() => fs.rmSync(repo, {recursive: true, force: true}));
  const sourcePath = path.join(repo, 'briefs', 'field-journal', 'product-description.md');
  const paperPath = path.join(repo, 'notes', 'media', 'import-consistency', 'index.md');
  fs.mkdirSync(path.dirname(sourcePath), {recursive: true});
  fs.mkdirSync(path.dirname(paperPath), {recursive: true});
  const source = fs.readFileSync(new URL('product-description.md', fixtures), 'utf8')
    + '\n## Technical white papers\n\n- White paper: [Import consistency](<../../notes/media/import-consistency/index.md>)\n';
  fs.writeFileSync(sourcePath, source);
  fs.writeFileSync(paperPath, '# Import consistency\n\nA batch import must explain which observations are accepted after an interruption.\n');
  const proposal = JSON.parse(fs.readFileSync(new URL('product-model-proposal.json', fixtures), 'utf8'));
  proposal.sourceClaims.push({id: 'claim-import-paper', startLine: 12, endLine: 15, summary: 'Link to the import consistency white paper.', disposition: 'reference', recordRefs: []});
  const proposalPath = path.join(repo, 'proposal.json');
  fs.writeFileSync(proposalPath, JSON.stringify(proposal));
  const productRoot = path.join(repo, 'product', 'Field Journal');
  persistProductModel({proposalPath, sourcePath, sourceLabel: 'briefs/field-journal/product-description.md', outputRoot: productRoot});
  const input = {currentPath: path.join(productRoot, 'current.json'), repositoryRoot: repo};
  const first = resolveWhitePaperReferences(input);
  assert.equal(first.binding.references.length, 1);
  assert.equal(first.binding.references[0].claimId, 'claim-import-paper');
  assert.equal(first.binding.references[0].path, 'notes/media/import-consistency/index.md');
  assert.ok(fs.existsSync(path.join(productRoot, first.storedPath)));
  const context = resolveProductContext({currentPath: input.currentPath, consumer: 'technical', repositoryRoot: repo});
  assert.equal(context.context.whitePapers[0].sha256, first.binding.references[0].sha256);
  assert.equal(context.context.whitePapers[0].researchStatus, 'unassessed');
  const report = Buffer.from(stableJson({schemaVersion:'1.0',kind:'technical-paper-research',paper:first.binding.references[0].path,paperSha256:first.binding.references[0].sha256,findings:['The import sequence needs a restart proof.']}));
  const reports = path.join(productRoot, 'white-papers', 'research');
  fs.mkdirSync(reports, {recursive:true});
  fs.writeFileSync(path.join(reports, `${sha256(report)}.json`), report);
  const assessmentText = 'The paper leaves the import recovery contract unresolved and proposes one technical boundary.\n';
  const assessmentPath = path.join(repo, 'evidence', 'import-assessment.md');
  fs.mkdirSync(path.dirname(assessmentPath), {recursive:true});
  fs.writeFileSync(assessmentPath, assessmentText);
  const evidence = {id:'paper-assessment',kind:'assessment',summary:'The import paper requires a recovery contract.',sourceFiles:[{path:first.binding.references[0].path,sha256:first.binding.references[0].sha256},{path:'evidence/import-assessment.md',sha256:sha256(assessmentText)}],binding:{role:'parent-assessment',question:'How should an interrupted import report its accepted observations?',reportSha256:sha256(assessmentText),inputRefs:['create-observations'],disposition:'conditional',rationale:'The boundary is provisional and the recovery question remains open.'}};
  writeImmutable(path.join(productRoot,'technical','evidence',`${technicalDigest(evidence)}.json`),technicalBytes(evidence),productRoot);
  const chain = loadCurrentProduct(input.currentPath);
  const common = {owner:'technical-documentation',scopeRefs:['create-observations'],productRefs:['create-observations'],artifactRefs:[],dependsOn:[],evidenceRefs:['paper-assessment']};
  const technicalProposal = {schemaVersion:'1.0',kind:'product-artifact-proposal',id:'import-technical',artifactKind:'technical-design',owner:'technical-documentation',artifactSchemaVersion:'1.0',status:'accepted',consumerDomains:['technical-documentation'],scopeRefs:['create-observations'],coverageRefs:['create-observations'],gapRefs:[],lockRefs:[],recordDependencies:[{id:'create-observations',materialSha256:chain.model.recordIndex.find(item=>item.id==='create-observations').materialSha256}],artifactDependencies:[],producer:{id:'technical-preparation',contractVersion:'1.0',method:'assessment'},resources:[],payload:{schemaVersion:'1.0',evidenceDependencies:[{id:evidence.id,materialSha256:technicalDigest(evidence)}],records:[
    {...common,id:'import-boundary',kind:'boundary',title:'Import boundary',summary:'One provisional boundary coordinates a batch import.',status:'conditional',details:{responsibility:'Coordinate the import attempt.',consumers:['Import workspace'],exchanges:['Accepted observations and recovery result'],lifecycle:'One import attempt.',failureBehavior:'Retain an explicit partial result.',decisionRefs:[],discussion:['Prepared observations remain isolated until the complete import result is accepted.']}},
    {...common,id:'import-recovery-question',kind:'gap',title:'Interrupted import recovery',summary:'The accepted partial result needs a clear rule.',status:'unresolved',details:{question:'Which observations survive an interrupted import?',category:'technical',affectedRefs:['import-boundary'],resolutionCriteria:['Demonstrate an interrupted batch and inspect the committed observations.'],resolutionRefs:[]}},
  ]}};
  const technicalProposalPath = path.join(repo,'technical-proposal.json');
  fs.writeFileSync(technicalProposalPath,stableJson(technicalProposal));
  commitProductArtifact({currentPath:input.currentPath,baseSnapshotSha256:chain.current.snapshot.sha256,proposalPath:technicalProposalPath});
  const researchedContext = resolveProductContext({currentPath: input.currentPath, consumer: 'technical', repositoryRoot: repo});
  assert.equal(researchedContext.context.whitePapers[0].researchStatus, 'current');
  const guideRoot = path.join(repo, 'documents', 'Field Journal', 'technical');
  generateTechnical({contextPath: path.join(productRoot, researchedContext.path), outputDirectory: guideRoot});
  assert.match(fs.readFileSync(path.join(guideRoot, 'index.md'), 'utf8'), /\.\.\/\.\.\/\.\.\/notes\/media\/import-consistency\/index\.md/u);
  assert.match(fs.readFileSync(path.join(guideRoot, 'focused-papers.md'), 'utf8'), /Mapped technical direction[\s\S]*Open questions[\s\S]*Interrupted import recovery/u);
  const focused = fs.readFileSync(path.join(guideRoot, 'focused-papers.md'), 'utf8');
  assert.match(focused, /Prepared observations remain isolated until the complete import result is accepted/u);
  assert.match(focused, /Retain an explicit partial result/u);
  assert.match(focused, /one import attempt/u);
  assert.match(focused, /Conditional proposal/u);
  assert.match(focused, /Demonstrate an interrupted batch and inspect the committed observations/u);
  assert.match(fs.readFileSync(path.join(guideRoot, 'decisions.md'), 'utf8'), /Interrupted import recovery/u);
  assert.match(fs.readFileSync(path.join(guideRoot, 'handoff.md'), 'utf8'), /Interrupted import recovery/u);
  fs.writeFileSync(paperPath, '# Import consistency\n\nA batch import must explain which observations survive interruption and retry.\n');
  const second = resolveWhitePaperReferences(input);
  assert.notEqual(second.binding.references[0].sha256, first.binding.references[0].sha256);
  const staleContext = resolveProductContext({currentPath: input.currentPath, consumer: 'technical', repositoryRoot: repo});
  assert.equal(staleContext.context.whitePapers[0].researchStatus, 'stale');
  assert.deepEqual(staleContext.context.artifacts, []);
});
