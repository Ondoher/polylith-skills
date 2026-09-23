import {objectWithKeys,text,identifier,fail,markdown} from './design-language-support.mjs';
import {validateGroup,nextGroupDocument,groupBlock,groupComponentsBlock,groupDrawings,groupDefaults} from './design-language-composite.mjs';
import {fieldMetrics} from './design-language-text-field.mjs';
import {resolveButtonColor} from './design-language-button.mjs';
import {resolvedType} from './design-language-typography.mjs';
import {textEngine,xml} from './design-language-password-layout.mjs';
export const selectStates=['closed','open','focused','disabled','error'];
const bounds={height:[32,96],paddingX:[4,32],arrowSize:[12,28],radius:[0,24],borderWidth:[0.5,4],focusWidth:[1,4],menuGap:[0,12],optionHeight:[28,64],menuPadding:[0,16],optionPadding:[4,24],menuRadius:[0,16]};
const own=t=>typeof t==='string'&&t.startsWith('select:');
const target=d=>'select:'+d.selectInput.id;
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function metric(k,v){const [lo,hi]=bounds[k];if(!Number.isFinite(v)||v<lo||v>hi)fail('Invalid select metric: '+k);}
export function selectMetrics(d){return Object.fromEntries(Object.keys(bounds).map(k=>[k,d.selectInput.metrics[k]??d.unspecifiedRequirements.find(r=>r.target===target(d)+':'+k)?.renderFallback.value]));}
function deps(d){
 const c=d.selectInput,p=d.fieldMessages;
 return {pattern:p,types:[...Object.values(c.typography),p.typography].map(id=>{const r=d.typography.roles.find(r=>r.id===id);if(!r)fail('Unknown select typography');return {record:r,resolved:resolvedType(d,r)};}),
 colors:[...Object.values(c.colors),...Object.values(p.colors)].map(e=>({expression:e,resolved:resolveButtonColor(d,e)}))};
}
export function selectDefaults(d){
 const dependency=deps(d),types=new Set(dependency.types.map(t=>'type:'+t.record.id)),reqs=new Set(dependency.colors.flatMap(c=>c.resolved.requirements));
 const inherited=groupDefaults(d).map(r=>({...r,affectedTargets:[...r.affectedTargets]}));
 for(const r of inherited)if(reqs.has(r.requirementId)||r.affectedTargets.some(t=>types.has(t)||t==='pattern:'+d.fieldMessages.id))r.affectedTargets.push(target(d));
 return [...inherited,...d.unspecifiedRequirements.filter(r=>own(r.target)).map(r=>({requirementId:r.id,target:r.target,...r.renderFallback,affectedTargets:[target(d)]}))];
}
export function validateSelect(d,saved=false){
 const {selectInput}=d;
 if(d.schemaVersion!=='0.14'||!Array.isArray(d.unspecifiedRequirements)||(saved&&!Array.isArray(d.decisions)))fail('Invalid select document');
 validateGroup(d,saved);
 const c=selectInput;
 objectWithKeys(c,['id','template','widths','label','options','selectedId','activeId','helperText','errorText','messagePattern','typography','colors','metrics','status'],'select');
 identifier(c.id,'select ID');if(c.template!=='mui-outlined-select-v1')fail('Unsupported select template');
 text(c.label,'select label',80);text(c.helperText,'select helper',240);text(c.errorText,'select error',240);
 if(c.messagePattern!==d.fieldMessages.id)fail('Unknown select message pattern');
 if(!Array.isArray(c.widths)||c.widths.length!==2||new Set(c.widths).size!==2||c.widths.some(w=>!Number.isInteger(w)||w<200||w>800))fail('Provide two distinct select widths from 200 to 800px');
 if(!Array.isArray(c.options)||c.options.length<2||c.options.length>8)fail('Provide two to eight select options');
 for(const o of c.options){objectWithKeys(o,['id','label','disabled'],'select option');identifier(o.id,'option ID');text(o.label,'option label',80);if(typeof o.disabled!=='boolean')fail('Explicit option disabled state required');}
 if(new Set(c.options.map(o=>o.id)).size!==c.options.length)fail('Duplicate option IDs');
 for(const id of [c.selectedId,c.activeId])if(!c.options.some(o=>o.id===id&&!o.disabled))fail('Selected and active IDs must reference enabled options');
 objectWithKeys(c.typography,['label','value','option'],'select typography');
 objectWithKeys(c.colors,['surface','text','label','border','focus','disabled','disabledBorder','menuSurface','menuBorder','selectedSurface','activeSurface','selectedMark'],'select colors');
 deps(d);objectWithKeys(c.metrics,Object.keys(bounds),'select metrics');
 const missing=Object.keys(bounds).filter(k=>c.metrics[k]===null);
 if(!['proposed','accepted','unspecified'].includes(c.status)||(missing.length>0)!==(c.status==='unspecified'))fail('Missing select metrics must remain unspecified');
 for(const k of Object.keys(bounds)){
  if(c.metrics[k]!==null)metric(k,c.metrics[k]);
  if(d.unspecifiedRequirements.filter(r=>r.target===target(d)+':'+k).length!==(c.metrics[k]===null?1:0))fail('Missing select metric needs exactly one fallback');
 }
 if(new Set(d.unspecifiedRequirements.map(r=>r.id)).size!==d.unspecifiedRequirements.length)fail('Duplicate requirement IDs');
 for(const r of d.unspecifiedRequirements.filter(r=>own(r.target))){
  objectWithKeys(r,['id','target','description','decisionOwner','renderFallback'],'select requirement');identifier(r.id,'requirement ID');text(r.description,'description');
  const k=r.target.slice((target(d)+':').length);
  if(!r.target.startsWith(target(d)+':')||!Object.hasOwn(bounds,k)||c.metrics[k]!==null)fail('Unknown select requirement');
  if(!['owner','UX','UI'].includes(r.decisionOwner))fail('Invalid decision owner');
  objectWithKeys(r.renderFallback,['value','source'],'fallback');metric(k,r.renderFallback.value);text(r.renderFallback.source,'source');
 }
 if(c.status==='accepted'&&selectDefaults(d).some(r=>r.affectedTargets.includes(target(d))))fail('Accepted select cannot depend on defaults');
 if(saved){
  for(const r of d.decisions.filter(r=>own(r.target))){objectWithKeys(r,['target','revision','reason'],'select decision');text(r.reason,'reason');if(r.target!==target(d)||!Number.isSafeInteger(r.revision)||r.revision<1||r.revision>d.revision)fail('Invalid select decision');}
  if(c.status==='accepted'&&!d.decisions.some(r=>r.target===target(d)))fail('Accepted select needs owner decision');
 }
 for(const width of c.widths)selectLayout(d,width);
 return d;
}
export function nextSelectDocument(saved,proposal,options){
 const approvals=options.accept??[];
 if(!Array.isArray(approvals)||new Set(approvals).size!==approvals.length)fail('Invalid acceptance targets');
 if(approvals.length)text(options.reason,'owner decision reason');
 const inherited=nextGroupDocument(saved,proposal,{...options,accept:approvals.filter(t=>!own(t))});
 const old=saved?.selectInput,c=proposal.selectInput,t=target(proposal);
 if(old&&old.id!==c.id)fail('Preserve select ID');
 for(const a of approvals.filter(own))if(a!==t||c.status!=='accepted')fail('Acceptance must target accepted select');
 const changed=old&&(!same(old,c)||!same(deps(saved),deps(proposal)));
 if(old?.status==='accepted'&&changed&&!approvals.includes(t))fail('Accepted select or dependency changed');
 if(c.status==='accepted'&&old?.status!=='accepted'&&!approvals.includes(t))fail('Select acceptance requires owner decision');
 const decisions=[...(saved?.decisions??[]).filter(r=>own(r.target))];
 if(c.status==='accepted'&&(old?.status!=='accepted'||changed))decisions.push({target:t,revision:proposal.baseRevision+1,reason:options.reason});
 const {baseRevision,...body}=proposal;
 const next=canonical({...body,revision:baseRevision+1,decisions:[...inherited.decisions,...decisions].sort((a,b)=>a.revision-b.revision||a.target.localeCompare(b.target))});
 if(saved&&same({...next,revision:saved.revision},saved))next.revision=saved.revision;
 return next;
}
export function selectLayout(d,width){
 const c=d.selectInput,p=d.fieldMessages,m=selectMetrics(d),pm=fieldMetrics(d,'fieldMessages');
 const engine=id=>textEngine(resolvedType(d,d.typography.roles.find(r=>r.id===id)));
 const label=engine(c.typography.label),value=engine(c.typography.value),option=engine(c.typography.option),message=engine(p.typography);
 const selected=c.options.find(o=>o.id===c.selectedId);
 if(label.shape(c.label).width+2*m.paddingX+8>width||value.shape(selected.label).width+2*m.paddingX+m.arrowSize+8>width||Math.max(value.metrics.lineHeightPx,m.arrowSize)+2*Math.max(m.borderWidth,m.focusWidth)>m.height||m.radius>m.height/2||option.metrics.lineHeightPx>m.optionHeight||c.options.some(o=>option.shape(o.label).width+2*m.optionPadding+24>width))fail('Select content or metrics do not fit');
 const helper=message.wrap(c.helperText,width-2*pm.inset),error=message.wrap('Error: '+c.errorText,width-2*pm.inset);
 const menuHeight=2*m.menuPadding+c.options.length*m.optionHeight;
 let y=62;
 const states=selectStates.map(state=>{
  const fieldY=y+24+label.metrics.lineHeightPx/2,menuY=fieldY+m.height+m.menuGap;
  const content=state==='error'?[...(p.errorPresentation==='retain'?[{kind:'helper',lines:helper}]:[]),{kind:'error',lines:error}]:[{kind:'helper',lines:helper}];
  let cursor=fieldY+m.height+pm.gap;
  const messages=content.map((msg,i)=>{if(i)cursor+=pm.messageGap;const result={...msg,y:cursor};cursor+=msg.lines.length*message.metrics.lineHeightPx;return result;});
  const result={state,captionY:y,fieldY,menuY,messages,menuHeight:state==='open'?menuHeight:0};
  y=Math.max(cursor,state==='open'?menuY+menuHeight:cursor)+36;return result;
 });
 if(y>2200)fail('Select sheet exceeds bounded height');
 return {width,height:Math.ceil(y),m,pm,label,value,option,message,selected,states};
}
export function selectSvg(d,width){
 const c=d.selectInput,p=d.fieldMessages,l=selectLayout(d,width),{m,pm}=l,x=20;
 const colors=Object.fromEntries(Object.entries(c.colors).map(([k,e])=>[k,resolveButtonColor(d,e).value])),helper=resolveButtonColor(d,p.colors.helper).value,error=resolveButtonColor(d,p.colors.error).value;
 const draw=(engine,lines,x,y,cls)=>'<g class="'+cls+'" transform="translate('+x+' '+y+')">'+lines.map((line,i)=>'<g transform="translate(0 '+i*engine.metrics.lineHeightPx+')">'+engine.shape(line).svg+'</g>').join('')+'</g>';
 const style='.paper{fill:#fff}.surface{fill:'+colors.surface+'}.caption{font:12px sans-serif;fill:#333}.outline{fill:'+colors.surface+';stroke:'+colors.border+';stroke-width:'+m.borderWidth+'}.label{fill:'+colors.label+'}.value,.option-text{fill:'+colors.text+'}.arrow{fill:'+colors.label+'}.helper{fill:'+helper+'}.error-message{fill:'+error+'}.focused .outline,.open .outline{stroke:'+colors.focus+';stroke-width:'+m.focusWidth+'}.focused .label,.open .label{fill:'+colors.focus+'}.disabled .outline{stroke:'+colors.disabledBorder+'}.disabled .label,.disabled .value,.disabled .helper,.disabled .arrow{fill:'+colors.disabled+'}.error .outline{stroke:'+error+'}.error .label{fill:'+error+'}.menu{fill:'+colors.menuSurface+';stroke:'+colors.menuBorder+';stroke-width:1}.option-bg{fill:'+colors.menuSurface+'}.selected .option-bg{fill:'+colors.selectedSurface+'}.active .option-bg{fill:'+colors.activeSurface+'}.active-ring{fill:none;stroke:'+colors.focus+';stroke-width:1;stroke-dasharray:2 2}.option-disabled .option-text{fill:'+colors.disabled+'}.selected-mark{fill:none;stroke:'+colors.selectedMark+';stroke-width:2}';
 const lines=['<svg xmlns="http://www.w3.org/2000/svg" width="'+(width+40)+'" height="'+l.height+'" viewBox="0 0 '+(width+40)+' '+l.height+'" role="img" aria-labelledby="title desc"><title id="title">'+xml(c.label+' select states')+'</title><desc id="desc">'+xml('Static single-selection select. Selected: '+l.selected.label+'. Open menu active option: '+c.options.find(o=>o.id===c.activeId).label+'. Helper: '+c.helperText+'. Error: '+c.errorText+'. Open popup overlays helper content; no live keyboard or validation.')+'</desc>',
 '<metadata>'+xml(JSON.stringify({template:c.template,width,metrics:m,messageMetrics:pm,selectedId:c.selectedId,activeId:c.activeId,states:l.states}))+'</metadata>',
 '<style>'+style+'</style><rect class="paper" width="100%" height="100%"/>',
 '<text class="caption" x="20" y="18">'+xml(width+'px select / '+m.height+'px high / '+c.status)+'</text>',
 '<text class="caption" x="20" y="36">Check = selected; dotted outline = keyboard focus</text>'];
 for(const row of l.states){
  const fy=row.fieldY,ly=fy-l.label.metrics.lineHeightPx/2,last=row.messages.at(-1),bottom=last.y+last.lines.length*l.message.metrics.lineHeightPx;
  lines.push('<g class="'+row.state+'" data-state="'+row.state+'"><text class="caption" x="20" y="'+row.captionY+'">'+row.state+'</text>',
   '<rect class="surface" x="'+(x-4)+'" y="'+(ly-2)+'" width="'+(width+8)+'" height="'+(bottom-ly+4)+'"/>',
   '<rect class="outline" x="'+x+'" y="'+fy+'" width="'+width+'" height="'+m.height+'" rx="'+m.radius+'"/>',
   '<rect class="surface" x="'+(x+m.paddingX-4)+'" y="'+ly+'" width="'+(l.label.shape(c.label).width+8)+'" height="'+l.label.metrics.lineHeightPx+'"/>',
   draw(l.label,[c.label],x+m.paddingX,ly,'label'),draw(l.value,[l.selected.label],x+m.paddingX,fy+(m.height-l.value.metrics.lineHeightPx)/2,'value'));
  const ax=x+width-m.paddingX-m.arrowSize,ay=fy+(m.height-m.arrowSize)/2;
  lines.push('<path class="arrow" transform="translate('+ax+' '+ay+') scale('+m.arrowSize/24+')" d="'+(row.state==='open'?'M7 14l5-5 5 5z':'M7 10l5 5 5-5z')+'"/>');
  for(const msg of row.messages)lines.push(draw(l.message,msg.lines,x+pm.inset,msg.y,msg.kind==='error'?'error-message':'helper'));
  if(row.state==='open'){
   lines.push('<g data-popup="listbox"><rect class="menu" x="'+x+'" y="'+row.menuY+'" width="'+width+'" height="'+row.menuHeight+'" rx="'+m.menuRadius+'"/>');
   for(const [i,o] of c.options.entries()){
    const y=row.menuY+m.menuPadding+i*m.optionHeight,selected=o.id===c.selectedId,active=o.id===c.activeId;
    lines.push('<g class="'+[selected?'selected':'',active?'active':'',o.disabled?'option-disabled':''].join(' ')+'" data-option="'+o.id+'" data-selected="'+selected+'" data-active="'+active+'" data-disabled="'+o.disabled+'">',
     '<rect class="option-bg" x="'+(x+1)+'" y="'+y+'" width="'+(width-2)+'" height="'+m.optionHeight+'"/>');
    if(active)lines.push('<rect class="active-ring" x="'+(x+3)+'" y="'+(y+2)+'" width="'+(width-6)+'" height="'+(m.optionHeight-4)+'"/>');
    lines.push(draw(l.option,[o.label],x+m.optionPadding,y+(m.optionHeight-l.option.metrics.lineHeightPx)/2,'option-text'));
    if(selected)lines.push('<path class="selected-mark" d="M'+(x+width-m.optionPadding-16)+' '+(y+m.optionHeight/2)+' l5 5 9 -10"/>');
    lines.push('</g>');
   }
   lines.push('</g>');
  }
  lines.push('</g>');
 }
 return lines.join('\n')+'</svg>\n';
}
export function selectComponentsBlock(d){
 const c=d.selectInput;
 const section=['## Single-Selection Select','',
 'Template: '+c.template+'. Status: '+c.status+'. Shared guidance/feedback pattern: '+markdown(c.messagePattern)+'. Label: '+markdown(c.label)+'.','',
 ...c.widths.flatMap(w=>['![Select states at '+w+'px](./design-language/specimens/select-'+c.id+'-'+w+'.svg)','']),
 'States: closed, open, focused, disabled and error. The open sheet distinguishes the selected value (check and tint) from keyboard focus (dotted outline); disabled options remain visible. These indicators are specimen proposals, not a pixel-perfect MUI capture.','',
 '| Metric | Value | Status |','| --- | --- | --- |',...Object.entries(selectMetrics(d)).map(([k,v])=>'| '+[k,v+'px',c.metrics[k]===null?'Unspecified (default)':c.status].map(markdown).join(' | ')+' |'),'',
 'Menu placement: align the popup start edge with the field and give it the field width. The specimen opens below and overlays the helper area rather than moving the field messages. At runtime constrain to the viewport, shift or open above when needed, and scroll long menus while keeping the active option visible. These collision/scroll cases are handoff requirements, not simulated here.','',
 'Use the established MUI Select/Menu behavior: Tab reaches the enabled trigger; Space/Enter or supported arrow keys open it; Up/Down navigate enabled options; Home/End and type-ahead follow library behavior; Enter/Space commit; Escape dismisses and restores trigger focus without committing a new choice. Preserve the library Tab/dismissal behavior and verify it in context. Keep selected value and active option conceptually distinct.','',
 'Associate the visible label through the MUI label/input relationship and the shared helper/error through stable description IDs. Expose expanded, selected, disabled and invalid states using the component APIs. Disabled selects do not open or accept changes. This SVG supplies no interactive behavior or accessibility certification.','',
 'Single selection only. Search, multiple selection, empty/loading option lists, oversized scrolling menus and combined states remain outside this template. Supplied helper/error examples do not establish app validation rules.','',
 ...selectDefaults(d).filter(r=>r.affectedTargets.includes(target(d))).map(r=>'- '+markdown(r.target??r.requirementId)+': provisional '+markdown(String(r.value))+' ('+markdown(r.source)+').'),''];
 return groupComponentsBlock(d)
 .replace('## Composite Input: Shared Guidance And Feedback',section.join('\n')+'\n## Composite Input: Shared Guidance And Feedback')
 .replace('select/dropdown and additional field variants','additional field and select variants');
}
export function selectBlock(d){
 const lines=['### Select Requirements',''];
 for(const r of d.unspecifiedRequirements.filter(r=>own(r.target)))lines.push('- '+markdown(r.target)+': '+markdown(r.description)+' Default '+markdown(String(r.renderFallback.value))+' ('+markdown(r.renderFallback.source)+').');
 for(const r of d.decisions.filter(r=>own(r.target)))lines.push('- Owner decision '+markdown(r.target)+', revision '+r.revision+': '+markdown(r.reason));
 lines.push('');
 return groupBlock(d).replace('select/dropdown specimens remain unimplemented; ordinary text-field states are available in the component reference.','additional field/select variants remain unimplemented; ordinary field and single-select states are available in the component reference.').replace('## Open Questions',lines.join('\n')+'\n## Open Questions');
}
export function selectDrawings(d){return new Map([...groupDrawings(d),...d.selectInput.widths.map(w=>['design-language/specimens/select-'+d.selectInput.id+'-'+w+'.svg',selectSvg(d,w)])]);}
