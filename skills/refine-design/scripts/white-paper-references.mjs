import fs from 'node:fs';
import path from 'node:path';
import {TextDecoder} from 'node:util';
import {fileURLToPath} from 'node:url';

import {ensureUnlinkedPath, fail, readBoundedFile, sha256, stableJson, writeImmutable} from './product-artifact-utils.mjs';
import {loadCurrentProduct} from './product-model.mjs';

const MAX_PAPER_BYTES = 4 * 1024 * 1024;
const declaration = /^\s*- White paper: \[([^\]\r\n]+)\]\(([^)\r\n]+)\)\s*$/u;

/** Return whether saved advisory research was made against the current paper bytes. */
export function paperResearchStatus(productRoot, paperPath, paperSha256) {
  const directory = path.join(productRoot, 'white-papers', 'research');
  if (!fs.existsSync(directory)) return {researchStatus: 'unassessed', researchReportSha256: null};
  ensureUnlinkedPath(directory, productRoot);
  const files = fs.readdirSync(directory).filter(name => /^[0-9a-f]{64}\.json$/u.test(name)).sort();
  if (files.length > 1000) fail('Too many white-paper research reports');
  const matching = [];
  for (const name of files) {
    const file = path.join(directory, name);
    ensureUnlinkedPath(file, productRoot);
    const bytes = readBoundedFile(file, 256 * 1024, 'white-paper research report');
    if (sha256(bytes) !== name.slice(0, -5)) fail('White-paper research report digest mismatch');
    let report;
    try { report = JSON.parse(bytes.toString('utf8')); } catch { fail('Invalid white-paper research report JSON'); }
    if (report?.schemaVersion !== '1.0' || report?.kind !== 'technical-paper-research' || typeof report.paper !== 'string' || !/^[0-9a-f]{64}$/u.test(report.paperSha256)) fail('Invalid white-paper research report binding');
    if (report.paper === paperPath) matching.push({sha256: name.slice(0, -5), paperSha256: report.paperSha256});
  }
  if (!matching.length) return {researchStatus: 'unassessed', researchReportSha256: null};
  const current = matching.find(item => item.paperSha256 === paperSha256);
  return {researchStatus: current ? 'current' : 'stale', researchReportSha256: (current ?? matching.at(-1)).sha256};
}

function summaryFromPaper(bytes) {
  const source = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  const paragraph = source.split(/\r?\n\s*\r?\n/u).map(part => part.trim()).find(part => part && !/^(?:#|>|-|\*|```)/u.test(part));
  if (!paragraph) fail('White paper needs an introductory prose paragraph before publication');
  return paragraph.replace(/\s+/gu, ' ').slice(0, 500);
}

function relativeInside(root, file) {
  const relative = path.relative(root, file);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) fail('White-paper path escapes the repository');
  return relative.split(path.sep).join('/');
}

function targetPath(raw, sourceFile, repositoryRoot) {
  const inner = raw.startsWith('<') && raw.endsWith('>') ? raw.slice(1, -1) : raw;
  let decoded;
  try { decoded = decodeURIComponent(inner); } catch { fail('White-paper link has invalid percent encoding'); }
  if (!decoded || decoded.includes('\\') || decoded.includes('?') || decoded.includes('#') || decoded.includes('\0') || path.isAbsolute(decoded) || /^[a-z][a-z0-9+.-]*:/iu.test(decoded)) fail('White-paper link must be a local relative Markdown path');
  const file = path.resolve(path.dirname(sourceFile), decoded);
  ensureUnlinkedPath(file, repositoryRoot);
  return {file, label: relativeInside(repositoryRoot, file)};
}

/** Bind current White paper declarations without importing their prose into product requirements. */
export function resolveWhitePaperReferences({currentPath, repositoryRoot, persist = true}) {
  const repo = path.resolve(repositoryRoot);
  const chain = loadCurrentProduct(currentPath);
  ensureUnlinkedPath(chain.root, repo);
  const expectedStore = path.join(repo, 'product', path.basename(chain.root));
  if (chain.root !== expectedStore) fail('Current product store is outside the named repository product directory');
  const sourceFile = path.join(repo, ...chain.model.source.label.split('/'));
  ensureUnlinkedPath(sourceFile, repo);
  if (!readBoundedFile(sourceFile, 4 * 1024 * 1024, 'product description').equals(chain.sourceBytes)) fail('Product description differs from the current bound model');
  const sourceText = new TextDecoder('utf-8', {fatal: true}).decode(chain.sourceBytes);
  const sourceLines = sourceText.split('\n');
  const references = [];
  const sourceCopies = [];
  const coveredLines = new Set();
  for (const claim of chain.model.sourceClaims.filter(item => item.disposition === 'reference')) {
    let found = 0;
    for (let number = claim.startLine; number <= claim.endLine; number += 1) {
      const line = sourceLines[number - 1].replace(/\r$/u, '');
      const match = declaration.exec(line);
      if (!match) {
        if (line.trim() && !/^#{1,6} Technical white papers\s*$/iu.test(line)) fail(`Reference claim ${claim.id} includes non-reference content at line ${number}`);
        continue;
      }
      found += 1;
      coveredLines.add(number);
      const {file, label} = targetPath(match[2], sourceFile, repo);
      const bytes = readBoundedFile(file, MAX_PAPER_BYTES, 'white paper');
      const summary = summaryFromPaper(bytes);
      const digest = sha256(bytes);
      const storedSource = `white-papers/sources/${digest}/${path.basename(file)}`;
      sourceCopies.push({storedSource, bytes});
      references.push({claimId: claim.id, line: number, title: match[1], summary, path: label, sha256: digest, bytes: bytes.length, sourceSnapshot: storedSource});
    }
    if (!found) fail(`Reference claim ${claim.id} contains no white-paper declaration`);
  }
  sourceLines.forEach((line, index) => {
    if (declaration.test(line.replace(/\r$/u, '')) && !coveredLines.has(index + 1)) fail(`White-paper declaration at line ${index + 1} is not classified as a reference`);
  });
  const seen = new Set();
  for (const item of references) {
    if (seen.has(item.path)) fail(`Duplicate white-paper reference: ${item.path}`);
    seen.add(item.path);
  }
  references.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const binding = {schemaVersion: '1.0', kind: 'white-paper-references', productId: chain.model.id, productName: chain.model.name, sourceSha256: chain.model.source.sha256, modelRevision: chain.model.revision, references};
  const bytes = Buffer.from(stableJson(binding));
  const digest = sha256(bytes);
  const storedPath = `white-papers/references/${digest}.json`;
  if (persist && references.length) {
    for (const copy of sourceCopies) writeImmutable(path.join(chain.root, copy.storedSource), copy.bytes, chain.root);
    writeImmutable(path.join(chain.root, storedPath), bytes, chain.root);
  }
  return {binding, storedPath: references.length ? storedPath : null, sha256: digest};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--current' || args[2] !== '--repo') fail('Usage: white-paper-references.mjs --current <product/current.json> --repo <repository>');
  process.stdout.write(stableJson(resolveWhitePaperReferences({currentPath: args[1], repositoryRoot: args[3]})));
}
