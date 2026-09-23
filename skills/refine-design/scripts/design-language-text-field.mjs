import {objectWithKeys,text,identifier,fail,markdown} from './design-language-support.mjs';
import {referenceBlock,componentsBlock,referenceDrawings,referenceDefaults} from './design-language-components.mjs';
import {validateIdentity,nextIdentityDocument} from './design-language-identity.mjs';
import {resolveButtonColor} from './design-language-button.mjs';
import {resolvedType} from './design-language-typography.mjs';
import {textEngine,xml} from './design-language-password-layout.mjs';

export const fieldStates=['default','focused','disabled','error'];
const fields={fieldMessages:{gap:[0,24],inset:[0,32],messageGap:[0,24]},textField:{height:[32,96],paddingX:[4,32],radius:[0,24],borderWidth:[0.5,4],focusWidth:[1,4]}};
const target=(d,key)=>(key==='fieldMessages'?'pattern:':'field:')+d[key].id;
const own=t=>typeof t==='string'&&(t.startsWith('pattern:')||t.startsWith('field:'));
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function checkMetric(key,k,v){const [min,max]=fields[key][k];if(!Number.isFinite(v)||v<min||v>max)fail('Invalid '+key+' metric: '+k);}
export function fieldMetrics(d,key){return Object.fromEntries(Object.keys(fields[key]).map(k=>[k,d[key].metrics[k]??d.unspecifiedRequirements.find(r=>r.target===target(d,key)+':'+k)?.renderFallback.value]));}
function type(d,id){const r=d.typography.roles.find(r=>r.id===id);if(!r)fail('Unknown field typography');return {record:r,resolved:resolvedType(d,r)};}
function dependencies(d,key){
 const c=d[key],types=key==='fieldMessages'?[c.typography]:Object.values(c.typography);
 return {types:types.map(id=>type(d,id)),colors:Object.fromEntries(Object.entries(c.colors).map(([k,e])=>[k,{expression:e,resolved:resolveButtonColor(d,e)}])),
 ...(key==='textField'?{pattern:d.fieldMessages,patternDependencies:dependencies(d,'fieldMessages')}:{})};
}
export function fieldDefaults(d){
 const inherited=referenceDefaults(d).map(r=>({...r,affectedTargets:[...r.affectedTargets]}));
 const direct=d.unspecifiedRequirements.filter(r=>own(r.target)).map(r=>({requirementId:r.id,target:r.target,...r.renderFallback,affectedTargets:[r.target.startsWith('pattern:')?target(d,'fieldMessages'):target(d,'textField')]}));
 for(const key of ['fieldMessages','textField']){
  const deps=dependencies(d,key),ids=new Set(deps.types.map(t=>'type:'+t.record.id));
  const reqs=new Set(Object.values(deps.colors).flatMap(c=>c.resolved.requirements));
  for(const item of inherited)if(reqs.has(item.requirementId)||item.affectedTargets.some(t=>ids.has(t)))item.affectedTargets.push(target(d,key));
 }
 for(const item of [...inherited,...direct])if(item.affectedTargets.includes(target(d,'fieldMessages')))item.affectedTargets.push(target(d,'textField'));
 return [...inherited,...direct];
}
export function validateField(d,saved=false){
 if(d.schemaVersion!=='0.14'||!Array.isArray(d.unspecifiedRequirements)||(saved&&!Array.isArray(d.decisions)))fail('Invalid text field document');
 validateIdentity(d,saved);
 const p=d.fieldMessages,f=d.textField;
 objectWithKeys(p,['id','template','typography','colors','metrics','errorPresentation','status'],'field message pattern');
 objectWithKeys(f,['id','template','widths','label','value','helperText','errorText','typography','colors','metrics','messagePattern','status'],'text field');
 if(p.template!=='field-messages-v1'||f.template!=='mui-outlined-text-v1')fail('Unsupported field template');
 if(!['retain','replace'].includes(p.errorPresentation))fail('Unknown helper/error presentation');
 if(f.messagePattern!==p.id)fail('Unknown field message pattern');
 for(const name of ['label','value'])text(f[name],name,80);
 for(const name of ['helperText','errorText'])text(f[name],name,240);
 if(!Array.isArray(f.widths)||f.widths.length!==2||new Set(f.widths).size!==2||f.widths.some(w=>!Number.isInteger(w)||w<200||w>800))fail('Provide two distinct field widths from 200 to 800px');
 objectWithKeys(f.typography,['value','label'],'field typography');
 type(d,p.typography);for(const id of Object.values(f.typography))type(d,id);
 objectWithKeys(p.colors,['helper','error'],'pattern colors');
 objectWithKeys(f.colors,['surface','value','label','border','focus','disabled','disabledBorder'],'field colors');
 for(const c of [p,f])for(const e of Object.values(c.colors))resolveButtonColor(d,e);
 if(new Set(d.unspecifiedRequirements.map(r=>r.id)).size!==d.unspecifiedRequirements.length)fail('Duplicate requirement IDs');
 for(const key of ['fieldMessages','textField']){
  const c=d[key];identifier(c.id,'field/pattern ID');objectWithKeys(c.metrics,Object.keys(fields[key]),'metrics');
  const missing=Object.keys(fields[key]).filter(k=>c.metrics[k]===null);
  if(!['proposed','accepted','unspecified'].includes(c.status)||(missing.length>0)!==(c.status==='unspecified'))fail('Missing field/pattern metrics must remain unspecified');
  for(const k of Object.keys(fields[key])){
   if(c.metrics[k]!==null)checkMetric(key,k,c.metrics[k]);
   if(d.unspecifiedRequirements.filter(r=>r.target===target(d,key)+':'+k).length!==(c.metrics[k]===null?1:0))fail('Missing field metric needs exactly one fallback');
  }
 }
 for(const r of d.unspecifiedRequirements.filter(r=>own(r.target))){
  objectWithKeys(r,['id','target','description','decisionOwner','renderFallback'],'field requirement');
  identifier(r.id,'requirement ID');text(r.description,'description');
  const key=['fieldMessages','textField'].find(key=>r.target.startsWith(target(d,key)+':'));
  const k=key?r.target.slice((target(d,key)+':').length):'';
  if(!key||!Object.hasOwn(fields[key],k)||d[key].metrics[k]!==null)fail('Unknown field requirement');
  if(!['owner','UI','UX'].includes(r.decisionOwner))fail('Invalid decision owner');
  objectWithKeys(r.renderFallback,['value','source'],'fallback');checkMetric(key,k,r.renderFallback.value);text(r.renderFallback.source,'fallback source');
 }
 const defaults=fieldDefaults(d);
 for(const key of ['fieldMessages','textField']){
  if(d[key].status==='accepted'&&defaults.some(r=>r.affectedTargets.includes(target(d,key))))fail('Accepted field/pattern cannot depend on defaults');
  if(saved&&d[key].status==='accepted'&&!d.decisions.some(r=>r.target===target(d,key)))fail('Accepted field/pattern needs owner decision');
 }
 if(saved)for(const r of d.decisions.filter(r=>own(r.target))){
  objectWithKeys(r,['target','revision','reason'],'field decision');text(r.reason,'reason');
  if(!['fieldMessages','textField'].some(k=>target(d,k)===r.target)||!Number.isSafeInteger(r.revision)||r.revision<1||r.revision>d.revision)fail('Invalid field decision');
 }
 for(const w of f.widths)fieldLayout(d,w);
 return d;
}
export function nextFieldDocument(saved,proposal,options){
 const approvals=options.accept??[];
 if(!Array.isArray(approvals)||new Set(approvals).size!==approvals.length)fail('Invalid acceptance targets');
 if(approvals.length)text(options.reason,'owner decision reason');
 const inherited=nextIdentityDocument(saved,proposal,{...options,accept:approvals.filter(t=>!own(t))});
 const decisions=[...(saved?.decisions??[]).filter(r=>own(r.target))];
 for(const approval of approvals.filter(own))if(!['fieldMessages','textField'].some(k=>target(proposal,k)===approval&&proposal[k].status==='accepted'))fail('Acceptance must target accepted field/pattern');
 for(const key of ['fieldMessages','textField']){
  const old=saved?.[key],next=proposal[key],t=target(proposal,key);
  if(old&&old.id!==next.id)fail('Preserve field/pattern ID');
  const changed=old&&(!same(old,next)||!same(dependencies(saved,key),dependencies(proposal,key)));
  if(old?.status==='accepted'&&changed&&!approvals.includes(t))fail('Accepted field/pattern or dependency changed');
  if(next.status==='accepted'&&old?.status!=='accepted'&&!approvals.includes(t))fail('Field/pattern acceptance requires owner decision');
  if(next.status==='accepted'&&(old?.status!=='accepted'||changed))decisions.push({target:t,revision:proposal.baseRevision+1,reason:options.reason});
 }
 const {baseRevision,...body}=proposal;
 const next=canonical({...body,revision:baseRevision+1,decisions:[...inherited.decisions,...decisions].sort((a,b)=>a.revision-b.revision||a.target.localeCompare(b.target))});
 if(saved&&same({...next,revision:saved.revision},saved))next.revision=saved.revision;
 return next;
}
export function fieldLayout(d,width){
 const f=d.textField,p=d.fieldMessages,m=fieldMetrics(d,'textField'),pm=fieldMetrics(d,'fieldMessages');
 const value=textEngine(type(d,f.typography.value).resolved),label=textEngine(type(d,f.typography.label).resolved),message=textEngine(type(d,p.typography).resolved);
 const labelRun=label.shape(f.label),valueRun=value.shape(f.value);
 if(labelRun.width+2*m.paddingX+8>width||valueRun.width+2*m.paddingX+2*Math.max(m.borderWidth,m.focusWidth)>width||value.metrics.lineHeightPx+2*Math.max(m.borderWidth,m.focusWidth)>m.height||m.radius>m.height/2)fail('Text field content or metrics do not fit');
 const available=width-2*pm.inset,helper=message.wrap(f.helperText,available),error=message.wrap('Error: '+f.errorText,available);
 let y=60;
 const states=fieldStates.map(state=>{
  const messages=state==='error'?[...(p.errorPresentation==='retain'?[{kind:'helper',lines:helper}]:[]),{kind:'error',lines:error}]:[{kind:'helper',lines:helper}];
  const fieldY=y+label.metrics.lineHeightPx/2+24;let cursor=fieldY+m.height+pm.gap;
  const positioned=messages.map((msg,i)=>{if(i)cursor+=pm.messageGap;const item={...msg,y:cursor};cursor+=msg.lines.length*message.metrics.lineHeightPx;return item;});
  const row={state,fieldY,messages:positioned,captionY:y};y=cursor+30;return row;
 });
 if(y>1800)fail('Text-field sheet exceeds bounded height');
 return {width,height:Math.ceil(y),m,pm,value,label,message,labelRun,valueRun,states};
}
export function fieldSvg(d,width){
 const f=d.textField,p=d.fieldMessages,l=fieldLayout(d,width),{m,pm}=l,color=e=>resolveButtonColor(d,e).value;
 const colors=Object.fromEntries(Object.entries(f.colors).map(([k,e])=>[k,color(e)])),helper=color(p.colors.helper),error=color(p.colors.error),x=20;
 const draw=(engine,lines,x,y,cls)=>'<g class="'+cls+'" transform="translate('+x+' '+y+')">'+lines.map((line,i)=>'<g transform="translate(0 '+i*engine.metrics.lineHeightPx+')">'+engine.shape(line).svg+'</g>').join('')+'</g>';
 const styles=['.paper{fill:#fff}.surface{fill:'+colors.surface+'}.caption{font:12px sans-serif;fill:#333}.outline{fill:'+colors.surface+';stroke:'+colors.border+';stroke-width:'+m.borderWidth+'}.label{fill:'+colors.label+'}.value{fill:'+colors.value+'}.helper{fill:'+helper+'}.error-message{fill:'+error+'}',
 '.focused .outline{stroke:'+colors.focus+';stroke-width:'+m.focusWidth+'}.focused .label{fill:'+colors.focus+'}',
 '.disabled .outline{stroke:'+colors.disabledBorder+'}.disabled .label,.disabled .value,.disabled .helper{fill:'+colors.disabled+'}',
 '.error .outline{stroke:'+error+'}.error .label{fill:'+error+'}'].join('');
 const lines=['<svg xmlns="http://www.w3.org/2000/svg" width="'+(width+40)+'" height="'+l.height+'" viewBox="0 0 '+(width+40)+' '+l.height+'" role="img" aria-labelledby="title desc"><title id="title">'+xml(f.label+' text field states')+'</title><desc id="desc">'+xml('Static '+width+'px field. Value: '+f.value+'. Helper: '+f.helperText+'. Error: '+f.errorText+'. Pattern: '+p.errorPresentation+'. No live validation.')+'</desc>',
 '<metadata>'+xml(JSON.stringify({template:f.template,pattern:p.template,width,metrics:m,messageMetrics:pm,states:l.states}))+'</metadata>',
 '<style>'+styles+'</style><rect class="paper" width="100%" height="100%"/>',
 '<text class="caption" x="20" y="18">'+xml(width+'px field / '+m.height+'px high / '+f.status)+'</text>',
 '<text class="caption" x="20" y="36">'+xml('Messages: '+l.message.metrics.sizePx+'px / '+l.message.metrics.lineHeightPx+'px line; gap '+pm.gap+'px')+'</text>'];
 for(const row of l.states){
  const y=row.fieldY,labelY=y-l.label.metrics.lineHeightPx/2;
  lines.push('<g class="'+row.state+'" data-state="'+row.state+'"><text class="caption" x="20" y="'+row.captionY+'">'+row.state+'</text>',
   '<rect class="surface" x="'+(x-4)+'" y="'+(labelY-2)+'" width="'+(width+8)+'" height="'+(row.messages.at(-1).y+row.messages.at(-1).lines.length*l.message.metrics.lineHeightPx-labelY+4)+'"/>',
   '<rect class="outline" x="'+x+'" y="'+y+'" width="'+width+'" height="'+m.height+'" rx="'+m.radius+'"/>',
   '<rect class="surface" x="'+(x+m.paddingX-4)+'" y="'+labelY+'" width="'+(l.labelRun.width+8)+'" height="'+l.label.metrics.lineHeightPx+'"/>',
   draw(l.label,[f.label],x+m.paddingX,labelY,'label'),draw(l.value,[f.value],x+m.paddingX,y+(m.height-l.value.metrics.lineHeightPx)/2,'value'));
  for(const msg of row.messages)lines.push(draw(l.message,msg.lines,x+pm.inset,msg.y,msg.kind==='error'?'error-message':'helper'));
  lines.push('</g>');
 }
 return lines.join('\n')+'</svg>\n';
}
function details(d){
 const rows=[];
 for(const key of ['fieldMessages','textField'])for(const [k,v] of Object.entries(fieldMetrics(d,key)))rows.push('| '+[key+'.'+k,v+'px',d[key].metrics[k]===null?'Unspecified (default)':d[key].status==='accepted'?'accepted':'proposed'].map(markdown).join(' | ')+' |');
 return rows;
}
export function fieldComponentsBlock(d){
 const f=d.textField,p=d.fieldMessages;
 const section=['## Ordinary Text Field','',
 'Template: '+f.template+'. Status: '+f.status+'. Message pattern: '+markdown(p.id)+'. Label: '+markdown(f.label)+'. Value: '+markdown(f.value)+'.','',
 ...f.widths.flatMap(w=>['![Text field states at '+w+'px](./design-language/specimens/text-field-'+f.id+'-'+w+'.svg)','']),
 'Default, focused, disabled and error are separate static examples. Error retains the supplied value. Focus follows the mapped theme role; error uses its semantic role rather than the brand accent. This does not define validation timing.','',
 '## Field Messages: Helper And Error','',
 'Reusable pattern: '+p.template+' / '+markdown(p.id)+'. Status: '+p.status+'. Typography role: '+markdown(p.typography)+'. Applies to other fields such as selects when those templates are implemented.','',
 'Place messages below the field, aligned by the shared inset; wrap to the available width and grow naturally. Helper text explains the expected input. Error text identifies a problem and the corrective action; a visible Error prefix makes the specimen meaningful without color alone.','',
 'Current error presentation: **'+p.errorPresentation+'**. '+(p.errorPresentation==='retain'?'Keep helper instructions, then add the error.':'Replace helper text with the error; use only when the error also preserves necessary instructions.')+' This is a presentation choice, not validation logic.','',
 'In implementation, preserve the visible label and associate helper/error text with the input using stable IDs and aria-describedby; mark invalid inputs with aria-invalid when an error applies. Native disabled semantics and keyboard/focus behavior remain required. UX owns when validation occurs and how changes are announced; do not announce every keystroke by default.','',
 'Helper: '+markdown(f.helperText)+' Error: '+markdown(f.errorText),'',
 '| Metric | Value | Status |','| --- | --- | --- |',...details(d),'',
 'The two-width state specimens above demonstrate the pattern in context; no duplicate standalone message image is needed. This is a design reference, not a live input, pixel-perfect MUI capture or accessibility certification.',''];
 const defaults=fieldDefaults(d).filter(r=>r.affectedTargets.includes(target(d,'textField')));
 section.push(...defaults.map(r=>'- '+markdown(r.target??r.requirementId)+': provisional '+markdown(String(r.value))+' ('+markdown(r.source)+').'),'');
 return componentsBlock(d).replace('## Text Field With An Embedded Button',section.join('\n')+'\n## Text Field With An Embedded Button')
 .replace('ordinary field with helper/error states, and select/dropdown','select/dropdown and additional field variants')
 .replace('error, focus and disabled field states remain gaps.','error, focus and disabled states for this embedded-button variant remain gaps; see the ordinary text-field specimen for those shared treatments.');
}
export function fieldBlock(d){
 const lines=['### Field And Message Requirements',''];
 for(const r of d.unspecifiedRequirements.filter(r=>own(r.target)))lines.push('- '+markdown(r.target)+': '+markdown(r.description)+' Default '+markdown(String(r.renderFallback.value))+' ('+markdown(r.renderFallback.source)+'). Owner: '+markdown(r.decisionOwner)+'.');
 for(const r of d.decisions.filter(r=>own(r.target)))lines.push('- Owner decision '+markdown(r.target)+', revision '+r.revision+': '+markdown(r.reason));
 lines.push('');
 return referenceBlock(d).replace('generic text-field/error specimens and select/dropdown specimens remain unimplemented.','select/dropdown specimens remain unimplemented; ordinary text-field states are available in the component reference.')
 .replace('## Open Questions',lines.join('\n')+'\n## Open Questions');
}
export function fieldDrawings(d){return new Map([...referenceDrawings(d),...d.textField.widths.map(w=>['design-language/specimens/text-field-'+d.textField.id+'-'+w+'.svg',fieldSvg(d,w)])]);}
