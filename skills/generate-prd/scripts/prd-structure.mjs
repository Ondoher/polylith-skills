#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {createOutlineSourceIndex, renderOutlineGroupLines, validateOutline} from './prd-outline.mjs';
import {assertUiPass} from './prd-readiness.mjs';

const SAFE_ID = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/u;
const WEIGHTS = new Set(['low', 'medium', 'high', 'very-high']);
const FACTORS = new Set(['low', 'medium', 'high']);
const FACTOR_KEYS = ['sourceDepth', 'interactionDepth', 'visualFootprint', 'sharedLoad', 'crossLinks'];

function fail(message) { throw new Error(message); }
function digest(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}
function exact(value, keys, label) {
  object(value, label);
  if (Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) {
    fail(`${label} must contain exactly ${keys.join(', ')}`);
  }
}
function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be nonempty text`);
  return value;
}
function id(value, label) {
  if (typeof value !== 'string' || !SAFE_ID.test(value)
    || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(value)) {
    fail(`${label} must be a safe stable ID`);
  }
  return value;
}
function list(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
}
function unique(values, label) {
  if (new Set(values).size !== values.length) fail(`${label} contains duplicates`);
  return values;
}
function exactSet(values, expected, label) {
  if (values.length !== expected.size || values.some(value => !expected.has(value))) {
    fail(`${label} must cover exactly ${expected.size} eligible items`);
  }
}
function groups(outline) {
  const result = new Map();
  const visit = (group, parentId = null) => {
    result.set(group.id, {group, parentId});
    group.children.forEach(child => visit(child, group.id));
  };
  outline.groups.forEach(group => visit(group));
  return result;
}
function gapSources(index) {
  return new Set(index.sources.filter(source => source.kind === 'gap'
    || source.kind === 'ux-design/traceGaps').map(source => source.ref));
}

/** Validate a source-bound assessment of every outline hierarchy node. */
export function validateWeightAssessment(assessment, {index, outline, outlineSha256}) {
  validateOutline(outline, index);
  exact(assessment, ['schemaVersion', 'contextId', 'sourceIndexSha256', 'outlineSha256', 'nodes', 'overallNotes'], 'Weight assessment');
  if (assessment.schemaVersion !== '1.0' || assessment.contextId !== index.context.id
    || assessment.sourceIndexSha256 !== index.sourceIndexSha256 || assessment.outlineSha256 !== outlineSha256) {
    fail('Weight assessment has stale input binding');
  }
  const byGroup = groups(outline);
  for (const {group} of byGroup.values()) {
    for (const match of group.summary.matchAll(/\]\(#([a-z0-9._-]+)\)/gu)) {
      if (!byGroup.has(match[1])) fail(`Outline group ${group.id} links to unknown group ${match[1]}`);
    }
  }
  const gaps = gapSources(index);
  const nodeIds = [];
  for (const node of list(assessment.nodes, 'Weight nodes')) {
    exact(node, ['groupId', 'weight', 'factors', 'rationale', 'gapRefs'], `Weight node ${node?.groupId}`);
    if (!byGroup.has(node.groupId)) fail(`Weight node ${node.groupId} names an unknown outline group`);
    if (!WEIGHTS.has(node.weight)) fail(`Weight node ${node.groupId} has invalid weight`);
    exact(node.factors, FACTOR_KEYS, `Weight factors ${node.groupId}`);
    for (const key of FACTOR_KEYS) if (!FACTORS.has(node.factors[key])) fail(`Weight factor ${node.groupId}.${key} is invalid`);
    text(node.rationale, `Weight rationale ${node.groupId}`);
    for (const ref of unique(list(node.gapRefs, `Weight gaps ${node.groupId}`), `Weight gaps ${node.groupId}`)) {
      if (!gaps.has(ref)) fail(`Weight node ${node.groupId} cites unknown gap ${ref}`);
    }
    nodeIds.push(node.groupId);
  }
  unique(nodeIds, 'Weight node IDs');
  exactSet(nodeIds, new Set(byGroup.keys()), 'Weight nodes');
  for (const [position, note] of list(assessment.overallNotes, 'Weight notes').entries()) text(note, `Weight note ${position}`);
  return {nodeCount: nodeIds.length, gapCount: gaps.size};
}

/** Render the hierarchy assessment for editorial review before any split choice. */
export function renderWeightAssessment(assessment, inputs) {
  validateWeightAssessment(assessment, inputs);
  const byId = new Map(assessment.nodes.map(node => [node.groupId, node]));
  const lines = ['# Product outline weight assessment', '',
    `Context: \`${assessment.contextId}\``, '',
    `Outline: \`${assessment.outlineSha256}\``, '',
    `Coverage: ${assessment.nodes.length} of ${groups(inputs.outline).size} outline nodes.`, '',
    'Weight describes current reading load and cross-references, not implementation effort or a fixed page threshold.', ''];
  function visit(group, depth) {
    const node = byId.get(group.id);
    const heading = '#'.repeat(Math.min(depth + 2, 6));
    lines.push(`${heading} ${group.title}`, '',
      `Group: \`${group.id}\`. Relative weight: **${node.weight}**. Direct sources: ${group.sourceRefs.length}.`, '',
      `Factors: source depth ${node.factors.sourceDepth}; interaction depth ${node.factors.interactionDepth}; visual footprint ${node.factors.visualFootprint}; shared load ${node.factors.sharedLoad}; cross-links ${node.factors.crossLinks}.`, '',
      node.rationale, '');
    if (node.gapRefs.length) lines.push(`Gaps considered: ${node.gapRefs.map(ref => `\`${ref}\``).join(', ')}.`, '');
    for (const child of group.children) visit(child, depth + 1);
  }
  for (const group of inputs.outline.groups) visit(group, 0);
  if (assessment.overallNotes.length) lines.push('## Assessment limits', '',
    ...assessment.overallNotes.map(note => `- ${note}`), '');
  return `${lines.join('\n').trimEnd()}\n`;
}

function pageReference(documentId, pageId) { return `${documentId}/${pageId}`; }

/** Validate editorial destinations without rendering or replacing publications. */
export function validateStructurePlan(plan, {index, outline, outlineSha256, weightsSha256}) {
  validateOutline(outline, index);
  exact(plan, ['schemaVersion', 'contextId', 'sourceIndexSha256', 'outlineSha256', 'weightsSha256', 'revision', 'documents', 'crossLinks', 'peerDecisions', 'notes'], 'Structure plan');
  if (plan.schemaVersion !== '1.0' || plan.contextId !== index.context.id
    || plan.sourceIndexSha256 !== index.sourceIndexSha256 || plan.outlineSha256 !== outlineSha256
    || plan.weightsSha256 !== weightsSha256) fail('Structure plan has stale input binding');
  if (!Number.isSafeInteger(plan.revision) || plan.revision < 1) fail('Structure plan revision must be a positive integer');
  const byGroup = groups(outline);
  const requiredGroups = new Set([...byGroup.values()].filter(({group}) => group.sourceRefs.length).map(({group}) => group.id));
  const assignedGroups = [];
  const pageMap = new Map();
  const groupPage = new Map();
  const documentIds = [];
  for (const document of list(plan.documents, 'Documents')) {
    exact(document, ['id', 'title', 'audience', 'purpose', 'standaloneContext', 'boundaryRationale', 'pages'], `Document ${document?.id}`);
    id(document.id, 'Document ID');
    if (document.id === 'technical') fail('The technical document is owned by generate-technical');
    documentIds.push(document.id);
    for (const key of ['title', 'audience', 'purpose', 'boundaryRationale']) text(document[key], `Document ${document.id}.${key}`);
    exact(document.standaloneContext, ['orientation', 'terms', 'scope', 'behavior', 'openQuestions'], `Standalone context ${document.id}`);
    for (const key of ['orientation', 'scope', 'behavior']) text(document.standaloneContext[key], `Standalone context ${document.id}.${key}`);
    for (const [position, term] of list(document.standaloneContext.terms, `Terms ${document.id}`).entries()) text(term, `Term ${document.id}.${position}`);
    for (const ref of unique(list(document.standaloneContext.openQuestions, `Open questions ${document.id}`), `Open questions ${document.id}`)) {
      if (!gapSources(index).has(ref)) fail(`Document ${document.id} has unknown open question ${ref}`);
    }
    if (!list(document.pages, `Pages ${document.id}`).length) fail(`Document ${document.id} needs an entry page`);
    const pageIds = [];
    for (const page of document.pages) {
      exact(page, ['id', 'parentPageId', 'title', 'summary', 'groupRefs', 'compRefs', 'rationale'], `Page ${document.id}/${page?.id}`);
      id(page.id, `Page ID in ${document.id}`);
      if (page.id === 'index') fail(`Page ID in ${document.id} cannot be index`);
      if (page.parentPageId !== null && !pageIds.includes(page.parentPageId)) {
        fail(`Page ${document.id}/${page.id} must name an earlier parent page in the same document`);
      }
      if (!pageIds.length && page.parentPageId !== null) fail(`Entry page ${document.id}/${page.id} cannot have a parent`);
      if (pageIds.length && page.parentPageId === null) fail(`Page ${document.id}/${page.id} needs a parent page`);
      pageIds.push(page.id);
      for (const key of ['title', 'summary', 'rationale']) text(page[key], `Page ${document.id}/${page.id}.${key}`);
      const ref = pageReference(document.id, page.id);
      pageMap.set(ref, page);
      for (const groupId of unique(list(page.groupRefs, `Group refs in ${ref}`), `Group refs in ${ref}`)) {
        if (!requiredGroups.has(groupId)) fail(`Page ${ref} names group ${groupId} without direct sources`);
        assignedGroups.push(groupId);
        groupPage.set(groupId, ref);
      }
      const assignedSources = new Set(page.groupRefs.flatMap(groupId => byGroup.get(groupId)?.group.sourceRefs ?? []));
      for (const compRef of unique(list(page.compRefs, `Comp refs in ${ref}`), `Comp refs in ${ref}`)) {
        const source = index.sources.find(item => item.ref === compRef);
        if (!source || !/^ui-composition\/(scenes|renderRequests)$/u.test(source.kind) || !assignedSources.has(compRef)) {
          fail(`Page ${ref} has an unassigned or unavailable comp ${compRef}`);
        }
      }
    }
    unique(pageIds, `Page IDs in ${document.id}`);
    if (!document.pages.some(page => page.groupRefs.length)) fail(`Document ${document.id} has no canonical source content`);
  }
  if (!documentIds.length) fail('Structure plan needs at least one document');
  unique(documentIds, 'Document IDs');
  unique(assignedGroups, 'Canonical group placements');
  exactSet(assignedGroups, requiredGroups, 'Canonical group placements');
  const sourcePage = new Map();
  for (const [groupId, pageRef] of groupPage) {
    for (const sourceRef of byGroup.get(groupId).group.sourceRefs) sourcePage.set(sourceRef, pageRef);
  }
  exactSet([...sourcePage.keys()], new Set(index.sources.map(source => source.ref)), 'Source placements');
  const crossLinkIds = [];
  for (const link of list(plan.crossLinks, 'Cross links')) {
    exact(link, ['from', 'to', 'purpose'], `Cross link ${link?.from}`);
    if (!pageMap.has(link.from) || !pageMap.has(link.to) || link.from === link.to) fail(`Cross link ${link.from} -> ${link.to} has invalid target`);
    text(link.purpose, `Cross link ${link.from} -> ${link.to}`);
    crossLinkIds.push(`${link.from}->${link.to}`);
  }
  unique(crossLinkIds, 'Cross links');
  const requiredPeerParents = new Set();
  const descendantPages = groupId => {
    const entry = byGroup.get(groupId).group;
    return new Set([groupPage.get(groupId), ...entry.children.flatMap(child => [...descendantPages(child.id)])].filter(Boolean));
  };
  for (const [groupId, {group}] of byGroup) {
    if (group.children.length > 1 && descendantPages(groupId).size > 1) requiredPeerParents.add(groupId);
  }
  const peerIds = [];
  for (const decision of list(plan.peerDecisions, 'Peer decisions')) {
    exact(decision, ['parentGroupId', 'pattern', 'exceptions', 'rationale'], `Peer decision ${decision?.parentGroupId}`);
    if (!requiredPeerParents.has(decision.parentGroupId)) fail(`Peer decision ${decision.parentGroupId} has no split peer groups`);
    if (!['peer-pages', 'mixed'].includes(decision.pattern)) fail(`Peer decision ${decision.parentGroupId} has invalid pattern`);
    text(decision.rationale, `Peer decision ${decision.parentGroupId}.rationale`);
    const childIds = new Set(byGroup.get(decision.parentGroupId).group.children.map(child => child.id));
    const exceptions = [];
    for (const exception of list(decision.exceptions, `Exceptions ${decision.parentGroupId}`)) {
      exact(exception, ['groupId', 'reason'], `Peer exception ${exception?.groupId}`);
      if (!childIds.has(exception.groupId)) fail(`Peer exception ${exception.groupId} is not a child of ${decision.parentGroupId}`);
      text(exception.reason, `Peer exception ${exception.groupId}.reason`);
      exceptions.push(exception.groupId);
    }
    unique(exceptions, `Peer exceptions ${decision.parentGroupId}`);
    if (decision.pattern === 'mixed' && !exceptions.length) fail(`Mixed peer decision ${decision.parentGroupId} needs an explained exception`);
    if (decision.pattern === 'peer-pages' && exceptions.length) fail(`Peer-pages decision ${decision.parentGroupId} cannot list exceptions`);
    if (decision.pattern === 'peer-pages') {
      const childPages = byGroup.get(decision.parentGroupId).group.children
        .map(child => descendantPages(child.id)).filter(pages => pages.size);
      if (childPages.some(pages => pages.size !== 1)
        || new Set(childPages.flatMap(pages => [...pages])).size !== childPages.length) {
        fail(`Peer-pages decision ${decision.parentGroupId} needs one distinct page per substantive child`);
      }
    }
    peerIds.push(decision.parentGroupId);
  }
  unique(peerIds, 'Peer decisions');
  exactSet(peerIds, requiredPeerParents, 'Peer decisions');
  for (const [position, note] of list(plan.notes, 'Plan notes').entries()) text(note, `Plan note ${position}`);
  const relationPairs = new Set();
  for (const source of index.sources) {
    for (const relation of source.relations ?? []) {
      if (!relation.targetRef || !sourcePage.has(relation.targetRef)) continue;
      const from = sourcePage.get(source.ref), to = sourcePage.get(relation.targetRef);
      if (from !== to) relationPairs.add(`${from}->${to}`);
    }
  }
  return {documentCount: documentIds.length, pageCount: pageMap.size, sourceCount: sourcePage.size,
    peerDecisionCount: peerIds.length, relationshipLinkCount: relationPairs.size,
    pageMap, sourcePage, groupPage, relationPairs};
}

/** Render a review skeleton from the saved editorial plan, without publishing HTML. */
export function renderStructureSkeleton(plan, inputs) {
  const result = validateStructurePlan(plan, inputs);
  const byGroup = groups(inputs.outline);
  const bySource = new Map(inputs.index.sources.map(source => [source.ref, source]));
  const gaps = gapSources(inputs.index);
  const lines = ['# Product document structure preview', '',
    `Context: \`${plan.contextId}\``, '', `Outline: \`${plan.outlineSha256}\``, '',
    `Coverage: ${result.sourceCount} of ${inputs.index.sources.length} eligible sources in ${result.documentCount} document(s) and ${result.pageCount} page(s).`, '',
    'This is a navigation and content skeleton. It is not a generated publication.', ''];
  for (const document of plan.documents) {
    lines.push(`<a id="document-${document.id}"></a>`, '', `## ${document.title}`, '',
      `Audience: ${document.audience}`, '', `Purpose: ${document.purpose}`, '',
      `Planned entry point: \`documents/<product>/${document.id}/\``, '',
      `Standalone orientation: ${document.standaloneContext.orientation}`, '',
      'Terms:', '', ...document.standaloneContext.terms.map(term => `- ${term}`), '',
      `Scope: ${document.standaloneContext.scope}`, '',
      `Relevant behavior: ${document.standaloneContext.behavior}`, '',
      `Indexed open questions: ${document.standaloneContext.openQuestions.length}.`, '',
      `Boundary: ${document.boundaryRationale}`, '', 'Pages:', '');
    const pageDepth = new Map();
    for (const page of document.pages) {
      const depth = page.parentPageId === null ? 0 : pageDepth.get(page.parentPageId) + 1;
      pageDepth.set(page.id, depth);
      lines.push(`${'  '.repeat(depth)}- [${page.title}](#page-${document.id}-${page.id})`);
    }
    lines.push('');
    for (const page of document.pages) {
      const pageRef = pageReference(document.id, page.id);
      const sources = page.groupRefs.flatMap(groupId => byGroup.get(groupId).group.sourceRefs);
      lines.push(`<a id="page-${document.id}-${page.id}"></a>`, '', `### ${page.title}`, '',
        `Planned page: \`${document.id}/${page.id}.html\``, '', page.summary, '',
        `Canonical sources: ${sources.length}. Current comps: ${page.compRefs.length}.`, '',
        `Placement: ${page.rationale}`, '', 'Content groups:', '');
      for (const groupId of page.groupRefs) {
        const group = byGroup.get(groupId).group;
        lines.push(`- **${group.title}** (\`${groupId}\`; ${group.sourceRefs.length} source(s))`);
      }
      if (!page.groupRefs.length) lines.push('- Orientation only; no canonical source records.');
      if (sources.length) lines.push('', `Key source references: ${sources.slice(0, 4).map(ref => `\`${ref}\``).join(', ')}${sources.length > 4 ? ` (and ${sources.length - 4} more)` : ''}.`);
      const pageGaps = sources.filter(ref => gaps.has(ref));
      if (pageGaps.length) {
        lines.push('', 'Gaps and limits:', '');
        for (const ref of pageGaps) lines.push(`- ${bySource.get(ref).label} (\`${ref}\`)`);
      }
      const links = plan.crossLinks.filter(link => link.from === pageRef);
      if (links.length) {
        lines.push('', 'Reading links:', '');
        for (const link of links) {
          const [toDocument, toPage] = link.to.split('/');
          lines.push(`- [${toDocument} / ${toPage}](#page-${toDocument}-${toPage}): ${link.purpose}`);
        }
      }
      lines.push('');
    }
  }
  if (plan.peerDecisions.length) {
    lines.push('## Peer presentation decisions', '');
    for (const decision of plan.peerDecisions) {
      lines.push(`- **${decision.parentGroupId}** (${decision.pattern}): ${decision.rationale}`);
      for (const exception of decision.exceptions) lines.push(`  - ${exception.groupId}: ${exception.reason}`);
    }
    lines.push('');
  }
  if (plan.notes.length) lines.push('## Editorial notes', '', ...plan.notes.map(note => `- ${note}`), '');
  return `${lines.join('\n').trimEnd()}\n`;
}

/** Reorder the same complete outline inventory under visible planned page breaks. */
export function renderOutlineWithBreaks(plan, inputs) {
  const result = validateStructurePlan(plan, inputs);
  const byGroup = groups(inputs.outline);
  const rendered = new Set();
  const lines = ['# Product information outline with planned breaks', '',
    `Context: \`${plan.contextId}\``, '', `Outline: \`${plan.outlineSha256}\``, '',
    `Structure revision: ${plan.revision}.`, '',
    `Coverage: ${result.sourceCount} of ${inputs.index.sources.length} eligible sources in ${result.documentCount} document(s) and ${result.pageCount} page(s).`, '',
    'This view follows the proposed reading order. The original information outline remains the source-bound inventory; the dividers below show editorial page boundaries.', ''];
  function ancestors(groupId) {
    const chain = [];
    for (let current = byGroup.get(groupId); current?.parentId; current = byGroup.get(current.parentId)) {
      chain.unshift(current.parentId);
    }
    return chain;
  }
  function addGroup(groupId) {
    if (rendered.has(groupId)) return;
    const group = byGroup.get(groupId).group;
    lines.push(...renderOutlineGroupLines(group, inputs.index, 4));
    rendered.add(groupId);
  }
  for (const document of plan.documents) {
    lines.push(`## Document: ${document.title}`, '',
      `Audience: ${document.audience}. Purpose: ${document.purpose}`, '');
    for (const [position, page] of document.pages.entries()) {
      lines.push('---', '', `### ${position === 0 ? 'Entry page' : 'Page break'}: ${page.title}`, '',
        `Planned destination: \`${document.id}/${page.id}.html\`. ${page.summary}`, '');
      for (const groupId of page.groupRefs) {
        const chain = ancestors(groupId);
        for (const ancestorId of chain) {
          if (!byGroup.get(ancestorId).group.sourceRefs.length) addGroup(ancestorId);
        }
        if (chain.length) lines.push(`Outline path: ${[...chain, groupId].map(value => `\`${value}\``).join(' → ')}`, '');
        addGroup(groupId);
      }
    }
  }
  const remaining = [...byGroup.keys()].filter(groupId => !rendered.has(groupId));
  if (remaining.length) {
    lines.push('## Source-free outline context without a page placement', '',
      'These nodes have no direct eligible sources and do not create a page break.', '');
    for (const groupId of remaining) addGroup(groupId);
  }
  if (inputs.outline.notes.length) lines.push('## Original outline notes', '',
    ...inputs.outline.notes.map(note => `- ${note}`), '');
  if (inputs.index.exclusions.length) lines.push('## Unavailable source artifacts', '',
    ...inputs.index.exclusions.map(item => `- \`${item.id}\` (${item.outcome}): ${item.reasons.join('; ')}`), '');
  return `${lines.join('\n').trimEnd()}\n`;
}

async function cli(argv) {
  const [mode, ...options] = argv;
  if (!['weights', 'skeleton', 'marked-outline'].includes(mode)) fail('Usage: prd-structure.mjs weights --context <context.json> --outline <outline.json> --weights <weights.json> [--output <assessment.md>] | skeleton|marked-outline --context <context.json> --outline <outline.json> --weights <weights.json> --plan <plan.json> --output <review.md>');
  const values = new Map();
  for (let i = 0; i < options.length; i += 2) {
    if (!options[i]?.startsWith('--') || !options[i + 1] || values.has(options[i])) fail('Invalid structure option');
    values.set(options[i], options[i + 1]);
  }
  const required = mode === 'weights' ? ['--context', '--outline', '--weights']
    : ['--context', '--outline', '--weights', '--plan', '--output'];
  const optionalOutput = mode === 'weights' && values.has('--output');
  if (values.size !== required.length + Number(optionalOutput) || required.some(key => !values.has(key))) {
    fail('Missing or unexpected structure option');
  }
  const context = JSON.parse(await readFile(values.get('--context'), 'utf8'));
  assertUiPass(context);
  const index = createOutlineSourceIndex(context);
  const outlineBytes = await readFile(values.get('--outline'));
  const outline = JSON.parse(outlineBytes);
  const weightBytes = await readFile(values.get('--weights'));
  const weights = JSON.parse(weightBytes);
  const outlineSha256 = digest(outlineBytes);
  const weightResult = validateWeightAssessment(weights, {index, outline, outlineSha256});
  if (mode === 'weights') {
    if (optionalOutput) await writeFile(values.get('--output'),
      renderWeightAssessment(weights, {index, outline, outlineSha256}), 'utf8');
    return weightResult;
  }
  const plan = JSON.parse(await readFile(values.get('--plan'), 'utf8'));
  const inputs = {index, outline, outlineSha256, weightsSha256: digest(weightBytes)};
  const summary = validateStructurePlan(plan, inputs);
  await writeFile(values.get('--output'), mode === 'skeleton'
    ? renderStructureSkeleton(plan, inputs) : renderOutlineWithBreaks(plan, inputs), 'utf8');
  return {documentCount: summary.documentCount, pageCount: summary.pageCount,
    sourceCount: summary.sourceCount, relationshipLinkCount: summary.relationshipLinkCount};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(await cli(process.argv.slice(2)))}\n`); }
  catch (error) { process.stderr.write(`prd-structure: ${error.message}\n`); process.exitCode = 1; }
}
