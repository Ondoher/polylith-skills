import {
  objectWithKeys, text, identifier, fail, markdown, renderColorSwatch as swatch
} from './design-language-support.mjs';

const BEGIN='<!-- refine-design:design-language:start -->';
const END='<!-- refine-design:design-language:end -->';
const statuses=['proposed','accepted','unspecified'];
const isThemeTarget=target=>typeof target==='string'&&(target.startsWith('member:')||target.startsWith('role:'));

function hex(value) {
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) fail('Expected a six-digit hex color');
}
function unique(items, label) {
  if (new Set(items.map(item=>item.id)).size!==items.length) fail('Duplicate '+label+' IDs');
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));

export function themeRecords(document) {
  return [
    ...document.palette.members.map(item=>({target:'member:'+item.id,record:item})),
    ...document.theme.roles.map(item=>({target:'role:'+item.id,record:item}))
  ];
}
function requirement(document,target) {
  return document.unspecifiedRequirements.find(item=>item.target===target);
}

/** Resolve direct member references only; no inferred roles, aliases or shade generation. */
export function resolveThemeValue(document,target) {
  const entry=themeRecords(document).find(item=>item.target===target);
  if (!entry) fail('Unknown theme target: '+target);
  const record=entry.record;
  if (record.status==='unspecified') {
    const missing=requirement(document,target);
    if (!missing) fail('Missing fallback requirement: '+target);
    return {value:missing.renderFallback.value,defaultRequirementId:missing.id};
  }
  if (target.startsWith('member:')) return {value:record.value,defaultRequirementId:null};
  return resolveThemeValue(document,'member:'+record.paletteRef.memberId);
}

/** Validate one palette and one theme, with explicit missing values/mappings. */
export function validateTheme(value,saved=false) {
  const revisionKey=saved?'revision':'baseRevision';
  if(value.schemaVersion!=='0.14')fail('Unsupported design-language schema');
  identifier(value.id,'document.id');
  if(!Number.isSafeInteger(value[revisionKey])||value[revisionKey]<(saved?1:0))fail('Invalid revision');
  objectWithKeys(value.source,['kind','description'],'source');
  if(!['ui-designer','fixture','owner','parent-assessment'].includes(value.source.kind))fail('Invalid source kind');
  text(value.source.description,'source.description');
  objectWithKeys(value.palette,['id','name','members'],'palette');
  objectWithKeys(value.theme,['id','name','roles'],'theme');
  for(const [label,collection,max] of [['palette',value.palette.members,24],['theme',value.theme.roles,32]]) {
    identifier(value[label].id,label+'.id');
    text(value[label].name,label+'.name',80);
    if(!Array.isArray(collection)||collection.length<1||collection.length>max)fail('Invalid '+label+' collection');
    for(const item of collection) {
      const field=label==='palette'?'value':'paletteRef';
      objectWithKeys(item,['id','name',field,'purpose','rationale','status'],label+' record');
      identifier(item.id,'record.id');
      text(item.name,'record.name',60);
      text(item.purpose,'record.purpose');
      text(item.rationale,'record.rationale');
      if(!statuses.includes(item.status))fail('Invalid status');
      if(item.status==='unspecified') {
        if(item[field]!==null)fail('Unspecified '+field+' must remain null');
      } else if(field==='value') hex(item.value);
      else {
        objectWithKeys(item.paletteRef,['paletteId','memberId'],'paletteRef');
        identifier(item.paletteRef.memberId,'memberId');
        if(item.paletteRef.paletteId!==value.palette.id||!value.palette.members.some(member=>member.id===item.paletteRef.memberId))fail('Unknown palette/member reference');
      }
    }
    unique(collection,label);
  }
  if(!Array.isArray(value.unspecifiedRequirements))fail('Invalid unspecifiedRequirements');
  for(const item of value.unspecifiedRequirements.filter(item=>isThemeTarget(item.target))) {
    objectWithKeys(item,['id','target','description','decisionOwner','renderFallback'],'requirement');
    identifier(item.id,'requirement.id');
    text(item.description,'requirement.description');
    if(!['owner','UI','UX'].includes(item.decisionOwner))fail('Invalid decisionOwner');
    const target=themeRecords(value).find(record=>record.target===item.target);
    if(!target||target.record.status!=='unspecified')fail('Requirement must target an unspecified member or role');
    objectWithKeys(item.renderFallback,['value','source'],'renderFallback');
    hex(item.renderFallback.value);
    text(item.renderFallback.source,'fallback source');
  }
  unique(value.unspecifiedRequirements,'requirement');
  for(const entry of themeRecords(value)) {
    if(entry.record.status==='unspecified'&&value.unspecifiedRequirements.filter(item=>item.target===entry.target).length!==1)fail('Each unspecified target needs exactly one fallback');
  }
  for(const role of value.theme.roles) {
    if(role.status==='accepted'&&resolveThemeValue(value,'role:'+role.id).defaultRequirementId)fail('Cannot accept a role whose rendered color still uses a provisional default');
  }
  if(!Array.isArray(value.openQuestions)||value.openQuestions.length>20)fail('Invalid questions');
  value.openQuestions.forEach(question=>text(question,'question'));
  if(saved) {
    if(!Array.isArray(value.decisions))fail('Invalid decisions');
    for(const decision of value.decisions.filter(decision=>isThemeTarget(decision.target))) {
      objectWithKeys(decision,['target','revision','reason'],'decision');
      if(!themeRecords(value).some(item=>item.target===decision.target))fail('Unknown decision target');
      text(decision.reason,'decision.reason');
      if(!Number.isSafeInteger(decision.revision)||decision.revision<1||decision.revision>value.revision)fail('Invalid decision revision');
    }
    for(const entry of themeRecords(value).filter(item=>item.record.status==='accepted')) {
      if(!value.decisions.some(decision=>decision.target===entry.target))fail('Accepted target needs a recorded decision');
    }
  }
  return value;
}

/** Retain IDs and protect both accepted records and accepted resolved uses. */
export function nextThemeDocument(saved,proposal,options) {
  if(saved&&(saved.palette.id!==proposal.palette.id||saved.theme.id!==proposal.theme.id))fail('Preserve palette and theme IDs');
  const previous=saved?themeRecords(saved):[];
  const records=themeRecords(proposal);
  for(const entry of previous) if(!records.some(item=>item.target===entry.target))fail('Existing member/role IDs must be preserved');
  const approvals=options.accept??[];
  if(!Array.isArray(approvals)||new Set(approvals).size!==approvals.length)fail('Invalid acceptance targets');
  if(approvals.length)text(options.reason,'owner decision reason');
  for(const target of approvals) {
    if(!records.some(item=>item.target===target&&item.record.status==='accepted'))fail('Acceptance must target an accepted member:<id> or role:<id>');
  }
  const requiresDecision=new Set();
  for(const entry of records) {
    const old=previous.find(item=>item.target===entry.target);
    const wasAccepted=old?.record.status==='accepted';
    const nowAccepted=entry.record.status==='accepted';
    let changed=old&&!same(old.record,entry.record);
    if(wasAccepted&&entry.target.startsWith('role:')) {
      changed ||= !same(resolveThemeValue(saved,entry.target),resolveThemeValue(proposal,entry.target));
    }
    if(wasAccepted&&changed&&!approvals.includes(entry.target))fail('Accepted target or its resolved color changed: '+entry.target);
    if(nowAccepted&&!wasAccepted&&!approvals.includes(entry.target))fail('Accepting a target requires an explicit owner decision: '+entry.target);
    if(nowAccepted&&(!wasAccepted||changed))requiresDecision.add(entry.target);
  }
  const decisions=(saved?.decisions??[]).filter(item=>isThemeTarget(item.target));
  decisions.push(...approvals.filter(target=>requiresDecision.has(target)).map(target=>({target,revision:proposal.baseRevision+1,reason:options.reason})));
  const {baseRevision,...body}=proposal;
  const next=canonical({...body,revision:baseRevision+1,decisions});
  if(saved&&same({...next,revision:saved.revision},saved))next.revision=saved.revision;
  return next;
}

export function themeDrawings(document) {
  return new Map(themeRecords(document).map(entry=>{
    const [kind,id]=entry.target.split(':');
    const resolved=resolveThemeValue(document,entry.target);
    return ['design-language/specimens/'+kind+'-'+id+'.svg',swatch({color:{...entry.record,value:resolved.value}})];
  }));
}

function image(target) {
  return '![Color swatch](./design-language/specimens/'+target.replace(':','-')+'.svg)';
}
function row(values) {return '| '+values.join(' | ')+' |';}
function status(document,entry) {
  const resolved=resolveThemeValue(document,entry.target);
  return entry.record.status+(resolved.defaultRequirementId?' (provisional default: '+resolved.defaultRequirementId+')':'');
}

export function themeBlock(document) {
  const lines=[BEGIN,'# Design Language','',
    'Revision: '+document.revision+'. Scope: one brand palette and one application theme (Slice 2b).','',
    'Source: **'+markdown(document.source.kind)+'** - '+markdown(document.source.description),'',
    '## Brand Palette: '+markdown(document.palette.name),'',
    'Palette ID: '+markdown(document.palette.id),'',
    '| Swatch | Member ID | Name | Rendered value | Status |',
    '| --- | --- | --- | --- | --- |'];
  for(const member of document.palette.members) {
    const target='member:'+member.id;
    lines.push(row([image(target),...[
      member.id,member.name,resolveThemeValue(document,target).value,status(document,{target,record:member})
    ].map(markdown)]));
  }
  lines.push('','## Application Theme: '+markdown(document.theme.name),'',
    'Theme ID: '+markdown(document.theme.id)+'. Roles reference palette members; values are resolved, not copied.','',
    '| Swatch | Role ID | Name | Palette reference | Resolved value | Status |',
    '| --- | --- | --- | --- | --- | --- |');
  for(const role of document.theme.roles) {
    const target='role:'+role.id;
    lines.push(row([image(target),...[
      role.id,role.name,role.paletteRef?role.paletteRef.paletteId+'/'+role.paletteRef.memberId:'Unspecified',
      resolveThemeValue(document,target).value,status(document,{target,record:role})
    ].map(markdown)]));
  }
  lines.push('','## Intended Uses','','| Target | Purpose | Rationale |','| --- | --- | --- |');
  for(const entry of themeRecords(document)) lines.push(row([entry.target,entry.record.purpose,entry.record.rationale].map(markdown)));
  lines.push('','## Missing Requirements And Rendering Defaults','');
  const missing=document.unspecifiedRequirements.filter(item=>isThemeTarget(item.target));
  if(missing.length) {
    lines.push('| ID | Target | Missing decision | Default | Source | Owner |','| --- | --- | --- | --- | --- | --- |');
    for(const item of missing)lines.push(row([item.id,item.target,item.description,item.renderFallback.value,item.renderFallback.source,item.decisionOwner].map(markdown)));
    lines.push('','Dependent role swatches can inherit defaults; their status names the missing requirement. Rendering does not resolve it.','');
  } else lines.push('No missing requirements recorded for this bounded theme.','');
  lines.push('## Recorded Owner Decisions','');
  const decisions=document.decisions.filter(item=>isThemeTarget(item.target));
  if(decisions.length)lines.push(...decisions.map(item=>'- '+markdown(item.target)+' (revision '+item.revision+'): '+markdown(item.reason)),'');
  else lines.push('No acceptance decisions recorded.','');
  lines.push('## Open Questions','');
  if(document.openQuestions.length)lines.push(...document.openQuestions.map(question=>'- '+markdown(question)));
  else lines.push('No open questions recorded for this bounded theme; this is not a complete application design.');
  return [...lines,'',END].join('\n');
}

export function themeDefaults(document) {
  return document.unspecifiedRequirements.filter(item=>isThemeTarget(item.target)).map(item=>({
    requirementId:item.id,target:item.target,...item.renderFallback,
    affectedTargets:themeRecords(document).filter(entry=>resolveThemeValue(document,entry.target).defaultRequirementId===item.id).map(entry=>entry.target)
  }));
}
