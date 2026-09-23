import {objectWithKeys,text,identifier,fail,markdown} from './design-language-support.mjs';
import {validateIcons,nextIconDocument,iconBlock,iconDrawings,iconDefaults,iconGeometry} from './design-language-icons.mjs';
import {resolvedType} from './design-language-typography.mjs';
import {resolveThemeValue} from './design-language-theme.mjs';
import {passwordSvg} from './design-language-password-layout.mjs';

const fields={fieldHeight:[32,96],paddingX:[4,32],adornmentSize:[24,64],iconGap:[0,24],supportInset:[0,32],supportGap:[0,24],ruleGap:[0,24],ruleIconGap:[0,24],radius:[0,24],borderWidth:[0.5,4]};
const target=c=>'component:'+c.id;
const owns=(c,value)=>typeof value==='string'&&(value===target(c)||value.startsWith(target(c)+':'));
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));

function metric(field,value) {
 const [min,max]=fields[field];
 if(!Number.isFinite(value)||value<min||value>max)fail('Invalid password metric: '+field);
}
export function passwordMetrics(document) {
 const c=document.password;
 return Object.fromEntries(Object.keys(fields).map(field=>[field,c.metrics[field]===null
  ?document.unspecifiedRequirements.find(r=>r.target===target(c)+':'+field).renderFallback.value:c.metrics[field]]));
}
function dependencyTargets(document) {
 const c=document.password;
 return [...Object.values(c.typography).map(id=>'type:'+id),...Object.values(c.icons).map(id=>'icon:'+id),...Object.values(c.colors).map(id=>'role:'+id)];
}
export function passwordDefaults(document) {
 const inherited=iconDefaults(document),dependencies=dependencyTargets(document);
 for(const item of inherited)if(item.affectedTargets.some(t=>dependencies.includes(t)))item.affectedTargets.push(target(document.password));
 return [...inherited,...document.unspecifiedRequirements.filter(r=>owns(document.password,r.target)).map(r=>({requirementId:r.id,target:r.target,...r.renderFallback,affectedTargets:[target(document.password)]}))];
}
function dependencies(document) {
 const c=document.password;
 return {
 types:Object.values(c.typography).map(id=>{const role=document.typography.roles.find(r=>r.id===id);return {id,...resolvedType(document,role),style:role.style,color:resolveThemeValue(document,'role:'+role.colorRole)};}),
 icons:Object.values(c.icons).map(id=>{const icon=document.icons.find(i=>i.id===id);return {icon,color:resolveThemeValue(document,'role:'+icon.colorRole)};}),
 colors:Object.values(c.colors).map(id=>({id,...resolveThemeValue(document,'role:'+id)}))
 };
}
export function validatePassword(document,saved=false) {
 if(document.schemaVersion!=='0.14')fail('Unsupported design-language schema');
 if(!Array.isArray(document.unspecifiedRequirements)||(saved&&!Array.isArray(document.decisions)))fail('Invalid requirements or decisions');
 validateIcons(document,saved);
 const c=document.password;
 objectWithKeys(c,['id','template','widths','label','maskedLength','helperText','rules','typography','icons','colors','metrics','status'],'password');
 identifier(c.id,'component.id');
 if(c.template!=='mui-outlined-password-v1')fail('Unsupported password template');
 if(!Array.isArray(c.widths)||c.widths.length!==2||new Set(c.widths).size!==2||c.widths.some(w=>!Number.isInteger(w)||w<160||w>800))fail('Provide two distinct integer widths from 160 to 800px');
 text(c.label,'label',60);text(c.helperText,'helperText',240);
 if(!Number.isInteger(c.maskedLength)||c.maskedLength<1||c.maskedLength>32)fail('Invalid masked length');
 if(!Array.isArray(c.rules)||c.rules.length<1||c.rules.length>6)fail('Provide one to six example rules');
 for(const rule of c.rules){objectWithKeys(rule,['id','text','passed'],'rule');identifier(rule.id,'rule.id');text(rule.text,'rule.text',160);if(typeof rule.passed!=='boolean')fail('Rule result must be explicit');}
 if(new Set(c.rules.map(r=>r.id)).size!==c.rules.length)fail('Duplicate rule IDs');
 objectWithKeys(c.typography,['body','label','support'],'component typography');
 for(const id of Object.values(c.typography))if(!document.typography.roles.some(r=>r.id===id))fail('Unknown component typography');
 objectWithKeys(c.icons,['hidden','visible','pass','fail'],'component icons');
 for(const id of Object.values(c.icons)){const icon=document.icons.find(i=>i.id===id);if(!icon||!icon.asset)fail('Component needs selected icon assets');iconGeometry(icon);}
 objectWithKeys(c.colors,['surface','border'],'component colors');
 for(const id of Object.values(c.colors))if(!document.theme.roles.some(r=>r.id===id))fail('Unknown component color');
 objectWithKeys(c.metrics,Object.keys(fields),'component metrics');
 if(!['proposed','accepted','unspecified'].includes(c.status))fail('Invalid component status');
 const missing=Object.keys(fields).filter(f=>c.metrics[f]===null);
 if((missing.length>0)!==(c.status==='unspecified'))fail('Missing component metrics must remain unspecified');
 for(const field of Object.keys(fields)){
  if(c.metrics[field]!==null)metric(field,c.metrics[field]);
  const requirements=document.unspecifiedRequirements.filter(r=>r.target===target(c)+':'+field);
  if(requirements.length!==(c.metrics[field]===null?1:0))fail('Missing component metric needs exactly one fallback');
 }
 if(new Set(document.unspecifiedRequirements.map(r=>r.id)).size!==document.unspecifiedRequirements.length)fail('Duplicate requirement IDs');
 for(const r of document.unspecifiedRequirements.filter(r=>owns(c,r.target))) {
  objectWithKeys(r,['id','target','description','decisionOwner','renderFallback'],'component requirement');identifier(r.id,'requirement.id');text(r.description,'description');
  const field=r.target.slice((target(c)+':').length);
  if(!r.target.startsWith(target(c)+':')||!Object.hasOwn(fields,field)||c.metrics[field]!==null)fail('Unknown component requirement');
  if(!['owner','UI','UX'].includes(r.decisionOwner))fail('Invalid decision owner');
  objectWithKeys(r.renderFallback,['value','source'],'fallback');metric(field,r.renderFallback.value);text(r.renderFallback.source,'fallback source');
 }
 const support=resolvedType(document,document.typography.roles.find(r=>r.id===c.typography.support));
 for(const kind of ['pass','fail'])if(document.icons.find(i=>i.id===c.icons[kind]).sizePx>support.lineHeightPx)fail('Rule icon must fit a supporting text line');
 if(c.status==='accepted'&&passwordDefaults(document).some(r=>r.affectedTargets.includes(target(c))))fail('Accepted component cannot depend on defaults');
 if(saved) {
  for(const decision of document.decisions.filter(r=>owns(c,r.target))){
   objectWithKeys(decision,['target','revision','reason'],'decision');
   if(decision.target!==target(c))fail('Unknown component decision');text(decision.reason,'reason');
   if(!Number.isSafeInteger(decision.revision)||decision.revision<1||decision.revision>document.revision)fail('Invalid decision revision');
  }
  if(c.status==='accepted'&&!document.decisions.some(r=>r.target===target(c)))fail('Accepted component needs a recorded decision');
 }
 return document;
}
export function nextPasswordDocument(saved,proposal,options) {
 const approvals=options.accept??[];
 if(!Array.isArray(approvals)||new Set(approvals).size!==approvals.length)fail('Invalid acceptance targets');
 if(approvals.length)text(options.reason,'owner decision reason');
 const c=proposal.password,old=saved?.password;
 const inherited=nextIconDocument(saved,proposal,{...options,accept:approvals.filter(t=>!owns(c,t))});
 if(old&&old.id!==c.id)fail('Preserve component ID');
 for(const approval of approvals.filter(t=>owns(c,t)))if(approval!==target(c)||c.status!=='accepted')fail('Acceptance must target accepted component');
 const changed=old&&(!same(old,c)||!same(dependencies(saved),dependencies(proposal)));
 if(old?.status==='accepted'&&changed&&!approvals.includes(target(c)))fail('Accepted component or dependency changed');
 if(c.status==='accepted'&&old?.status!=='accepted'&&!approvals.includes(target(c)))fail('Component acceptance requires owner decision');
 const decisions=[...(saved?.decisions??[]).filter(r=>owns(c,r.target))];
 if(c.status==='accepted'&&(old?.status!=='accepted'||changed))decisions.push({target:target(c),revision:proposal.baseRevision+1,reason:options.reason});
 const {baseRevision,...body}=proposal;
 const next=canonical({...body,revision:baseRevision+1,decisions:[...inherited.decisions,...decisions].sort((a,b)=>a.revision-b.revision||a.target.localeCompare(b.target))});
 if(saved&&same({...next,revision:saved.revision},saved))next.revision=saved.revision;
 return next;
}
export function passwordDrawings(document) {
 return new Map([...iconDrawings(document),...document.password.widths.map(width=>[
 'design-language/specimens/component-'+document.password.id+'-'+width+'.svg',passwordSvg(document,document.password,passwordMetrics(document),width)
 ])]);
}
export function passwordBlock(document) {
 const c=document.password,m=passwordMetrics(document),row=v=>'| '+v.map(markdown).join(' | ')+' |';
 const defaults=passwordDefaults(document).filter(r=>r.affectedTargets.includes(target(c)));
 const lines=['## Password Component Specimen','',
 'Template: '+c.template+'. Status: '+c.status+(defaults.length?' (uses explicit provisional defaults)':'')+'. Static, populated and masked; rule outcomes are supplied examples, not password validation.','',
 '| Metric | Rendered value | Status |','| --- | --- | --- |'];
 for(const field of Object.keys(fields))lines.push(row([field,m[field]+'px',c.metrics[field]===null?'Unspecified (default)':c.status==='accepted'?'accepted':'proposed']));
 lines.push('','| Reference | ID |','| --- | --- |');
 for(const [group,values] of [['Typography',c.typography],['Icon',c.icons],['Color',c.colors]])for(const [key,id] of Object.entries(values))lines.push(row([group+' / '+key,id]));
 lines.push('','Label: '+markdown(c.label)+'. Masked sample length: '+c.maskedLength+'.','',
 'Helper text: '+markdown(c.helperText),'',...c.rules.map(r=>'- '+(r.passed?'Met: ':'Not met: ')+markdown(r.text)),'');
 for(const width of c.widths)lines.push('### '+width+'px width','','![Password component at '+width+'px](./design-language/specimens/component-'+c.id+'-'+width+'.svg)','');
 lines.push('The field stretches while typography, padding and adornment size remain fixed. Supporting text wraps by measured word width; total height follows its content. SVG dimensions include annotation margins. This is a design specimen inspired by MUI, not a pixel-perfect capture of a browser TextField.','','### Missing Component Requirements','');
 lines.push(...(defaults.length?defaults.map(r=>'- '+markdown(r.target)+': default '+markdown(String(r.value))+' from '+markdown(r.source)+'.'):['No unresolved component dependencies recorded.']));
 lines.push('','### Component Owner Decisions','');
 const decisions=document.decisions.filter(r=>owns(c,r.target));
 lines.push(...(decisions.length?decisions.map(r=>'- Revision '+r.revision+': '+markdown(r.reason)):['No component acceptance decisions recorded.']),'');
 return iconBlock(document).replace('palette, theme, typography and icons (Slice 4)','palette, theme, typography, icons and password specimen (Slice 5)')
 .replace('## Open Questions',lines.join('\n')+'\n## Open Questions');
}
