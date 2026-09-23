import {objectWithKeys, text, identifier, fail, markdown} from './design-language-support.mjs';
import {validateTheme, nextThemeDocument, themeBlock, themeDrawings, themeDefaults, resolveThemeValue} from './design-language-theme.mjs';
import {fontCatalog, outlineSpecimen} from './design-language-fonts.mjs';

const fields = ['fontId', 'sizePx', 'weight', 'lineHeightPx'];
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const target = (role, field) => 'type:' + role.id + (field ? ':' + field : '');
const isType = value => typeof value === 'string' && value.startsWith('type:');

function metric(field, value) {
  if (field === 'fontId') {
    if (!fontCatalog.some(font => font.id === value)) fail('Unsupported bundled font: ' + value);
  } else {
    const limits = {sizePx:[8,72], weight:[100,900], lineHeightPx:[8,144]}[field];
    if (!Number.isFinite(value) || value < limits[0] || value > limits[1] || (field === 'weight' && !Number.isInteger(value))) fail('Invalid ' + field);
  }
}

export function resolvedType(document, role) {
  const result = {};
  for (const field of fields) result[field] = role[field] === null
    ? document.unspecifiedRequirements.find(item => item.target === target(role, field)).renderFallback.value : role[field];
  return result;
}

export function validateTypography(document, saved = false) {
  if (document.schemaVersion !== '0.14') fail('Unsupported design-language schema');
  // Validate shared structure before reading collections.
  if (!Array.isArray(document.unspecifiedRequirements) || (saved && !Array.isArray(document.decisions))) fail('Invalid requirements or decisions');
  validateTheme(document, saved);
  objectWithKeys(document.typography, ['roles'], 'typography');
  const roles = document.typography.roles;
  if (!Array.isArray(roles) || roles.length < 1 || roles.length > 8) fail('Provide one to eight typography roles');
  if (new Set(roles.map(role => role.id)).size !== roles.length) fail('Duplicate typography IDs');
  if (new Set(document.unspecifiedRequirements.map(item => item.id)).size !== document.unspecifiedRequirements.length) fail('Duplicate requirement IDs');
  for (const role of roles) {
    objectWithKeys(role, ['id','name','fontId','sizePx','weight','lineHeightPx','style','colorRole','sampleLines','purpose','rationale','status'], 'typography role');
    identifier(role.id, 'type.id');
    text(role.name, 'type.name', 60);
    text(role.purpose, 'purpose'); text(role.rationale, 'rationale');
    if (!['proposed','accepted','unspecified'].includes(role.status)) fail('Invalid typography status');
    if (role.style !== 'normal') fail('Slice 3 supports normal font style only');
    if (!document.theme.roles.some(item => item.id === role.colorRole)) fail('Unknown typography color role');
    if (!Array.isArray(role.sampleLines) || role.sampleLines.length < 1 || role.sampleLines.length > 4) fail('Provide one to four explicit sample lines');
    role.sampleLines.forEach(line => text(line, 'sample line', 160));
    const missing = fields.filter(field => role[field] === null);
    if ((missing.length > 0) !== (role.status === 'unspecified')) fail('Typography with missing metrics must remain unspecified');
    for (const field of fields) {
      const requirements = document.unspecifiedRequirements.filter(item => item.target === target(role, field));
      if (role[field] === null) {
        if (requirements.length !== 1) fail('Each missing typography metric needs exactly one fallback');
      } else {
        metric(field, role[field]);
        if (requirements.length) fail('Requirement targets a specified typography metric');
      }
    }
  }
  for (const requirement of document.unspecifiedRequirements.filter(item => isType(item.target))) {
    objectWithKeys(requirement, ['id','target','description','decisionOwner','renderFallback'], 'typography requirement');
    identifier(requirement.id, 'requirement.id'); text(requirement.description, 'description');
    if (!['owner','UI','UX'].includes(requirement.decisionOwner)) fail('Invalid decision owner');
    const [,id,field,...extra] = requirement.target.split(':');
    const role = roles.find(item => item.id === id);
    if (extra.length || !role || !fields.includes(field) || role[field] !== null) fail('Unknown or specified typography requirement target');
    objectWithKeys(requirement.renderFallback, ['value','source'], 'renderFallback');
    metric(field, requirement.renderFallback.value); text(requirement.renderFallback.source, 'fallback source');
  }
  for (const role of roles) {
    const metrics = resolvedType(document, role);
    if (metrics.lineHeightPx < metrics.sizePx) fail('Line height must be at least font size in this slice');
    if (role.status === 'accepted' && resolveThemeValue(document, 'role:' + role.colorRole).defaultRequirementId) fail('Accepted typography cannot depend on a provisional color');
  }
  if (saved) {
    for (const decision of document.decisions.filter(item => isType(item.target))) {
      objectWithKeys(decision, ['target','revision','reason'], 'decision');
      if (!roles.some(role => target(role) === decision.target)) fail('Unknown typography decision target');
      text(decision.reason, 'decision.reason');
      if (!Number.isSafeInteger(decision.revision) || decision.revision < 1 || decision.revision > document.revision) fail('Invalid decision revision');
    }
    for (const role of roles.filter(item => item.status === 'accepted')) {
      if (!document.decisions.some(item => item.target === target(role))) fail('Accepted typography needs a recorded decision');
    }
  }
  return document;
}

export function nextTypographyDocument(saved, proposal, options) {
  const approvals = options.accept ?? [];
  if (!Array.isArray(approvals) || new Set(approvals).size !== approvals.length) fail('Invalid acceptance targets');
  if (approvals.length) text(options.reason, 'owner decision reason');
  const nextTheme = nextThemeDocument(saved, proposal, {...options, accept: approvals.filter(item => !isType(item))});
  const previous = saved?.typography?.roles ?? [];
  const roles = proposal.typography.roles;
  for (const old of previous) if (!roles.some(role => role.id === old.id)) fail('Preserve typography IDs');
  const decisions = [...(saved?.decisions ?? []).filter(item => isType(item.target))];
  for (const approval of approvals.filter(isType)) {
    if (!roles.some(role => target(role) === approval && role.status === 'accepted')) fail('Acceptance must target accepted typography');
  }
  for (const role of roles) {
    const old = previous.find(item => item.id === role.id);
    const changed = old && (!same(old, role) || !same(resolveThemeValue(saved, 'role:' + old.colorRole), resolveThemeValue(proposal, 'role:' + role.colorRole)));
    if (old?.status === 'accepted' && changed && !approvals.includes(target(role))) fail('Accepted typography or dependency changed: ' + target(role));
    if (role.status === 'accepted' && old?.status !== 'accepted' && !approvals.includes(target(role))) fail('Typography acceptance needs an explicit owner decision');
    if (role.status === 'accepted' && (old?.status !== 'accepted' || changed)) decisions.push({target:target(role), revision:proposal.baseRevision + 1, reason:options.reason});
  }
  const {baseRevision,...body} = proposal;
  const next = canonical({...body, revision:baseRevision + 1, decisions:[...nextTheme.decisions,...decisions].sort((a,b) => a.revision - b.revision || a.target.localeCompare(b.target))});
  if (saved && same({...next, revision:saved.revision}, saved)) next.revision = saved.revision;
  return next;
}

export function typographyDrawings(document) {
  return new Map([...themeDrawings(document), ...document.typography.roles.map(role => [
    'design-language/specimens/type-' + role.id + '.svg',
    outlineSpecimen(role, resolvedType(document, role), resolveThemeValue(document, 'role:' + role.colorRole).value)
  ])]);
}

export function typographyDefaults(document) {
  const colorDefaults = themeDefaults(document);
  for (const item of colorDefaults) item.affectedTargets.push(...document.typography.roles
    .filter(role => resolveThemeValue(document,'role:' + role.colorRole).defaultRequirementId === item.requirementId).map(role => target(role)));
  return [...colorDefaults, ...document.unspecifiedRequirements.filter(item => isType(item.target)).map(item => ({
    requirementId:item.id, target:item.target, ...item.renderFallback, affectedTargets:[item.target.split(':').slice(0,2).join(':')]
  }))];
}

export function typographyBlock(document) {
  const row = values => '| ' + values.map(markdown).join(' | ') + ' |';
  const lines = ['## Typography', '',
    'Outlined SVGs preserve bundled font shapes without installed fonts or network access. Sizes and line heights are CSS px at intrinsic SVG size; samples use explicit line breaks. Normal style only. White specimen backgrounds are review scaffolding, not a theme surface decision.', '',
    '| Role | Font | Size | Weight | Line height | Color role | Status |',
    '| --- | --- | --- | --- | --- | --- | --- |'];
  for (const role of document.typography.roles) {
    const resolved = resolvedType(document, role);
    const color = resolveThemeValue(document, 'role:' + role.colorRole);
    lines.push(row([role.name, fontCatalog.find(font => font.id === resolved.fontId).family, resolved.sizePx + 'px', String(resolved.weight), resolved.lineHeightPx + 'px', role.colorRole,
      role.status + (fields.some(field => role[field] === null) || color.defaultRequirementId ? ' (uses provisional defaults)' : '')]));
  }
  for (const role of document.typography.roles) {
    lines.push('', '### ' + markdown(role.name), '', markdown(role.purpose) + ' ' + markdown(role.rationale), '',
      '![Typography specimen: ' + markdown(role.name) + '](./design-language/specimens/type-' + role.id + '.svg)', '',
      'Sample text (one list item per rendered line):', '', ...role.sampleLines.map(line => '- ' + markdown(line)));
  }
  lines.push('', '### Font Assets', '', '| Font | Asset SHA-256 | Fixed axes |', '| --- | --- | --- |');
  // The SVG records all actual axis coordinates; catalog hashes identify immutable bundled bytes.
  for (const font of fontCatalog.filter(item => document.typography.roles.some(role => resolvedType(document, role).fontId === item.id))) {
    lines.push(row([font.family, font.sha256, 'Weight as listed; other axes fixed to bundled font defaults (recorded in SVG).']));
  }
  const missing = document.unspecifiedRequirements.filter(item => isType(item.target));
  lines.push('', '### Missing Typography Requirements', '');
  if (missing.length) {
    lines.push('| Target | Missing decision | Rendered default | Source | Owner |','| --- | --- | --- | --- | --- |');
    for (const item of missing) lines.push(row([item.target,item.description,String(item.renderFallback.value),item.renderFallback.source,item.decisionOwner]));
    lines.push('', 'These source values remain null until decided; rendering does not resolve the requirements.');
  } else lines.push('No missing typography metrics recorded.');
  lines.push('', '### Typography Owner Decisions', '');
  const decisions = document.decisions.filter(item => isType(item.target));
  lines.push(...(decisions.length ? decisions.map(item => '- ' + markdown(item.target) + ' (revision ' + item.revision + '): ' + markdown(item.reason)) : ['No typography acceptance decisions recorded.']), '');
  return themeBlock(document)
    .replace('one brand palette and one application theme (Slice 2b)', 'palette, theme and typography (Slice 3)')
    .replace('## Open Questions', lines.join('\n') + '\n## Open Questions');
}
