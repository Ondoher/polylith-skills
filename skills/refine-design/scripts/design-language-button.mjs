import {objectWithKeys,text,identifier,fail,markdown} from './design-language-support.mjs';
import {validateDocument,nextDocument,documentBlock,documentDrawings,documentDefaults} from './design-language-document.mjs';
import {resolveThemeValue} from './design-language-theme.mjs';
import {resolvedType} from './design-language-typography.mjs';
import {textEngine,xml} from './design-language-password-layout.mjs';

export const buttonStates=['default','hover','pressed','focus','disabled','loading'];
const bounds={height:[32,80],minWidth:[64,320],paddingX:[8,40],radius:[0,32],borderWidth:[0,4],focusWidth:[1,4],focusGap:[1,8]};
const ownTarget=d=>'button:'+d.button.id;
const isButton=t=>typeof t==='string'&&t.startsWith('button:');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function metric(k,v){const [lo,hi]=bounds[k];if(!Number.isFinite(v)||v<lo||v>hi)fail('Invalid button metric: '+k);}
export function buttonMetrics(d){return Object.fromEntries(Object.keys(bounds).map(k=>[k,d.button.metrics[k]??d.unspecifiedRequirements.find(r=>r.target===ownTarget(d)+':'+k)?.renderFallback.value]));}
function expression(d,e){
 if(e?.kind==='role'){
  objectWithKeys(e,['kind','role'],'button color reference');
  if(!d.theme.roles.some(r=>r.id===e.role))fail('Unknown button color role');
  return;
 }
 objectWithKeys(e,['kind','baseRole','overlayRole','amount'],'button color mix');
 if(e.kind!=='mix'||!Number.isFinite(e.amount)||e.amount<0||e.amount>1)fail('Invalid button color mix');
 for(const role of [e.baseRole,e.overlayRole])if(!d.theme.roles.some(r=>r.id===role))fail('Unknown button color role');
}
export function resolveButtonColor(d,e){
 expression(d,e);
 const a=resolveThemeValue(d,'role:'+(e.kind==='role'?e.role:e.baseRole));
 if(e.kind==='role')return {value:a.value,requirements:a.defaultRequirementId?[a.defaultRequirementId]:[]};
 const b=resolveThemeValue(d,'role:'+e.overlayRole);
 const channel=(v,i)=>parseInt(v.slice(i,i+2),16);
 const value='#'+[1,3,5].map(i=>Math.round(channel(a.value,i)*(1-e.amount)+channel(b.value,i)*e.amount).toString(16).padStart(2,'0')).join('').toUpperCase();
 return {value,requirements:[...new Set([a.defaultRequirementId,b.defaultRequirementId].filter(Boolean))]};
}
function dependencies(d){
 const b=d.button,t=d.typography.roles.find(r=>r.id===b.typography);
 const ids=new Set([t.colorRole,...Object.values(b.states).flatMap(s=>Object.values(s).flatMap(e=>e.kind==='role'?[e.role]:[e.baseRole,e.overlayRole])),b.surfaceRole,b.focusRole]);
 return {type:t,resolvedType:resolvedType(d,t),roles:[...ids].sort().map(id=>({role:d.theme.roles.find(r=>r.id===id),resolved:resolveThemeValue(d,'role:'+id)}))};
}
export function buttonDefaults(d){
 const deps=dependencies(d),ids=new Set(deps.roles.map(r=>'role:'+r.role.id).concat('type:'+d.button.typography));
 const inherited=documentDefaults(d).map(r=>({...r,affectedTargets:[...r.affectedTargets,...(r.affectedTargets.some(t=>ids.has(t))?[ownTarget(d)]:[])]}));
 return [...inherited,...d.unspecifiedRequirements.filter(r=>isButton(r.target)).map(r=>({requirementId:r.id,target:r.target,...r.renderFallback,affectedTargets:[ownTarget(d)]}))];
}
export function validateButton(d,saved=false){
 if(d.schemaVersion!=='0.14')fail('Unsupported design-language schema');
 if(!Array.isArray(d.unspecifiedRequirements)||(saved&&!Array.isArray(d.decisions)))fail('Invalid requirements or decisions');
 validateDocument(d,saved);
 const b=d.button;
 objectWithKeys(b,['id','template','label','loadingLabel','typography','surfaceRole','focusRole','metrics','states','status'],'button');
 identifier(b.id,'button ID');
 if(b.template!=='mui-contained-command-v1')fail('Unsupported button template');
 text(b.label,'button label',60);text(b.loadingLabel,'loading label',60);
 if(!d.typography.roles.some(t=>t.id===b.typography))fail('Unknown button typography');
 for(const role of [b.surfaceRole,b.focusRole])if(!d.theme.roles.some(r=>r.id===role))fail('Unknown button surface/focus role');
 objectWithKeys(b.metrics,Object.keys(bounds),'button metrics');
 const missing=Object.keys(bounds).filter(k=>b.metrics[k]===null);
 if(!['proposed','accepted','unspecified'].includes(b.status)||(missing.length>0)!==(b.status==='unspecified'))fail('Missing button metrics must remain unspecified');
 for(const k of Object.keys(bounds)){
  if(b.metrics[k]!==null)metric(k,b.metrics[k]);
  if(d.unspecifiedRequirements.filter(r=>r.target===ownTarget(d)+':'+k).length!==(b.metrics[k]===null?1:0))fail('Missing button metric needs exactly one fallback');
 }
 if(new Set(d.unspecifiedRequirements.map(r=>r.id)).size!==d.unspecifiedRequirements.length)fail('Duplicate requirement IDs');
 for(const r of d.unspecifiedRequirements.filter(r=>isButton(r.target))){
  objectWithKeys(r,['id','target','description','decisionOwner','renderFallback'],'button requirement');
  identifier(r.id,'requirement ID');text(r.description,'requirement description');
  const k=r.target.slice((ownTarget(d)+':').length);
  if(!r.target.startsWith(ownTarget(d)+':')||!Object.hasOwn(bounds,k)||b.metrics[k]!==null)fail('Unknown button requirement');
  if(!['owner','UX','UI'].includes(r.decisionOwner))fail('Invalid decision owner');
  objectWithKeys(r.renderFallback,['value','source'],'fallback');metric(k,r.renderFallback.value);text(r.renderFallback.source,'fallback source');
 }
 objectWithKeys(b.states,buttonStates,'button states');
 for(const state of buttonStates){objectWithKeys(b.states[state],['background','foreground','border'],state);for(const e of Object.values(b.states[state]))expression(d,e);}
 if(b.status==='accepted'&&buttonDefaults(d).some(r=>r.affectedTargets.includes(ownTarget(d))))fail('Accepted button cannot depend on defaults');
 if(saved){
  for(const decision of d.decisions.filter(r=>isButton(r.target))){
   objectWithKeys(decision,['target','revision','reason'],'button decision');text(decision.reason,'reason');
   if(decision.target!==ownTarget(d)||!Number.isSafeInteger(decision.revision)||decision.revision<1||decision.revision>d.revision)fail('Invalid button decision');
  }
  if(b.status==='accepted'&&!d.decisions.some(r=>r.target===ownTarget(d)))fail('Accepted button needs owner decision');
 }
 buttonLayout(d);
 return d;
}
export function nextButtonDocument(saved,proposal,options){
 const approvals=options.accept??[];
 if(!Array.isArray(approvals)||new Set(approvals).size!==approvals.length)fail('Invalid acceptance targets');
 if(approvals.length)text(options.reason,'owner decision reason');
 const inherited=nextDocument(saved,proposal,{...options,accept:approvals.filter(t=>!isButton(t))});
 const old=saved?.button,b=proposal.button,target=ownTarget(proposal);
 if(old&&old.id!==b.id)fail('Preserve button ID');
 for(const approval of approvals.filter(isButton))if(approval!==target||b.status!=='accepted')fail('Acceptance must target accepted button');
 const changed=old&&(!same(old,b)||!same(dependencies(saved),dependencies(proposal)));
 if(old?.status==='accepted'&&changed&&!approvals.includes(target))fail('Accepted button or dependency changed');
 if(b.status==='accepted'&&old?.status!=='accepted'&&!approvals.includes(target))fail('Button acceptance requires owner decision');
 const decisions=[...(saved?.decisions??[]).filter(r=>isButton(r.target))];
 if(b.status==='accepted'&&(old?.status!=='accepted'||changed))decisions.push({target,revision:proposal.baseRevision+1,reason:options.reason});
 const {baseRevision,...body}=proposal;
 const next=canonical({...body,revision:baseRevision+1,decisions:[...inherited.decisions,...decisions].sort((a,b)=>a.revision-b.revision||a.target.localeCompare(b.target))});
 if(saved&&same({...next,revision:saved.revision},saved))next.revision=saved.revision;
 return next;
}
export function buttonLayout(d){
 const b=d.button,m=buttonMetrics(d),type=resolvedType(d,d.typography.roles.find(t=>t.id===b.typography)),engine=textEngine(type);
 const label=engine.shape(b.label),loading=engine.shape(b.loadingLabel);
 const width=Math.ceil(Math.max(m.minWidth,Math.max(label.width,loading.width)+2*m.paddingX+2*m.borderWidth));
 if(width>480||type.lineHeightPx+2*m.borderWidth>m.height||m.radius>m.height/2)fail('Button content or metrics do not fit');
 return {m,type,label,loading,width};
}
export function buttonSvg(d){
 const b=d.button,{m,type,label,loading,width}=buttonLayout(d),rowHeight=m.height+42,canvasWidth=Math.max(440,width+190),canvasHeight=90+rowHeight*6;
 const colors=Object.fromEntries(buttonStates.map(s=>[s,Object.fromEntries(Object.entries(b.states[s]).map(([k,e])=>[k,resolveButtonColor(d,e).value]))]));
 const surface=resolveThemeValue(d,'role:'+b.surfaceRole).value,focus=resolveThemeValue(d,'role:'+b.focusRole).value;
 const style=['.paper{fill:#fff}.annotation{font:12px sans-serif;fill:#202020}.surface{fill:'+surface+'}.focus-ring{fill:none;stroke:'+focus+';stroke-width:'+m.focusWidth+'}'];
 for(const s of buttonStates)style.push('.'+s+' .face{fill:'+colors[s].background+';stroke:'+colors[s].border+';stroke-width:'+m.borderWidth+'}.'+s+' .label{fill:'+colors[s].foreground+'}');
 const lines=['<svg xmlns="http://www.w3.org/2000/svg" width="'+canvasWidth+'" height="'+canvasHeight+'" viewBox="0 0 '+canvasWidth+' '+canvasHeight+'" role="img" aria-labelledby="title desc">',
 '<title id="title">Command button states</title><desc id="desc">'+xml('Static proposed button states. '+b.label+'; loading: '+b.loadingLabel+'. '+b.status+'. Missing dependencies remain provisional. Loading motion and runtime keyboard behavior are not demonstrated.')+'</desc>',
 '<style>'+style.join('')+'</style><rect class="paper" width="100%" height="100%"/>',
 '<text class="annotation" x="16" y="22">'+xml('Command button / '+b.status+' / specimen only')+'</text>',
 '<text class="annotation" x="16" y="42">'+xml(width+' x '+m.height+'px; padding '+m.paddingX+'px; radius '+m.radius+'px; border '+m.borderWidth+'px')+'</text>',
 '<text class="annotation" x="16" y="60">'+xml(type.sizePx+'px type / '+type.lineHeightPx+'px line; focus '+m.focusWidth+'px + '+m.focusGap+'px gap')+'</text>'];
 for(const [i,s] of buttonStates.entries()){
  const x=150,y=82+i*rowHeight,run=s==='loading'?loading:label,gap=m.focusGap+m.focusWidth/2;
  lines.push('<g class="'+s+'" data-state="'+s+'"><text class="annotation" x="16" y="'+(y+m.height/2+4)+'">'+s+'</text>',
   '<rect class="surface" x="'+(x-12)+'" y="'+(y-12)+'" width="'+(width+24)+'" height="'+(m.height+24)+'"/>');
  if(s==='focus')lines.push('<rect class="focus-ring" x="'+(x-gap)+'" y="'+(y-gap)+'" width="'+(width+2*gap)+'" height="'+(m.height+2*gap)+'" rx="'+(m.radius+gap)+'"/>');
  lines.push('<rect class="face" x="'+x+'" y="'+y+'" width="'+width+'" height="'+m.height+'" rx="'+m.radius+'"/>',
   '<g class="label" transform="translate('+(x+(width-run.width)/2)+' '+(y+(m.height-type.lineHeightPx)/2)+')">'+run.svg+'</g></g>');
 }
 return lines.join('\n')+'\n</svg>\n';
}
function formula(e){return e.kind==='role'?'role:'+e.role:'mix-srgb(role:'+e.baseRole+', role:'+e.overlayRole+', '+e.amount+')';}
export function buttonBlock(d){
 const b=d.button,m=buttonMetrics(d),target=ownTarget(d);
 let block=documentBlock(d);
 block=block.replace('| Button styles, including icon button | Standalone specimens not rendered yet; styles remain to be designed. |','| Button styles, including icon button | Contained command button state sheet below. Icon, outlined, text and toggle button specimens remain gaps. |');
 block=block.replace('- Renderer gaps: standalone button styles, generic text-field/error specimens and select/dropdown specimens remain unimplemented.','- Renderer gaps: icon/outlined/text/toggle button variants, generic text-field/error specimens and select/dropdown specimens remain unimplemented.');
 const lines=['### Command Button State Specimen','','Template: '+b.template+'. Status: '+b.status+'. Typography: '+markdown(b.typography)+'. Labels: '+markdown(b.label)+' / '+markdown(b.loadingLabel)+'.','',
 '![Command button state sheet](./design-language/specimens/button-'+b.id+'-states.svg)','',
 '| Metric | Rendered value | Status |','| --- | --- | --- |',...Object.keys(bounds).map(k=>'| '+k+' | '+m[k]+'px | '+(b.metrics[k]===null?'Unspecified (default)':b.status==='accepted'?'accepted':'proposed')+' |'),'',
 '| State / color | Expression | Resolved value | Status |','| --- | --- | --- | --- |'];
 for(const s of buttonStates)for(const [k,e] of Object.entries(b.states[s])){
  const r=resolveButtonColor(d,e);
  lines.push('| '+s+' / '+k+' | '+formula(e)+' | '+r.value+' | '+(r.requirements.length?'Unspecified dependency: '+r.requirements.join(', '):b.status==='accepted'?'accepted':'proposed')+' |');
 }
 lines.push('','Surface: role:'+b.surfaceRole+'. Focus ring: role:'+b.focusRole+'. Color mixes interpolate encoded sRGB channels, then round to 8-bit values; formulas are data, never executable code. Derived colors are not separately chosen palette members.','',
 'Focus is a separate ring, not selection. Loading uses a stable-width text cue; this static specimen does not implement progress, animation or activation behavior. Disabled activation, keyboard access and loading announcements require implementation checks. Selected is not applicable to this command template; toggle buttons and task-level error feedback remain separate design work.','',
 'This is a MUI-oriented design specimen, not a browser capture or accessibility certification. Check actual contrast pairs and input behavior before implementation.','');
 block=block.replace('## Shared States',lines.join('\n')+'\n## Shared States');
 const missing=d.unspecifiedRequirements.filter(r=>isButton(r.target));
 const details=['### Button Requirements And Dependencies','',...missing.map(r=>'- '+markdown(r.description)+' Owner: '+markdown(r.decisionOwner)+'.'),...buttonDefaults(d).filter(r=>r.affectedTargets.includes(target)).map(r=>'- '+markdown(r.target??r.requirementId)+': provisional '+markdown(String(r.value))+' ('+markdown(r.source)+').')];
 if(!missing.length&&!buttonDefaults(d).some(r=>r.affectedTargets.includes(target)))details.push('No unresolved button defaults.');
 details.push(...d.decisions.filter(r=>isButton(r.target)).map(r=>'- Owner decision, revision '+r.revision+': '+markdown(r.reason)), '');
 block=block.replace('## Open Questions',details.join('\n')+'\n## Open Questions');
 return block;
}
export function buttonDrawings(d){return new Map([...documentDrawings(d),['design-language/specimens/button-'+d.button.id+'-states.svg',buttonSvg(d)]]);}
