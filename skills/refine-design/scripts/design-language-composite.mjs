import {objectWithKeys,text,identifier,fail,markdown} from './design-language-support.mjs';
import {validateField,nextFieldDocument,fieldBlock,fieldComponentsBlock,fieldDrawings,fieldDefaults,fieldMetrics} from './design-language-text-field.mjs';
import {resolveButtonColor} from './design-language-button.mjs';
import {resolvedType} from './design-language-typography.mjs';
import {textEngine,xml} from './design-language-password-layout.mjs';
const bounds={padding:[4,32],columnGap:[0,32],rowGap:[0,24],optionGap:[2,16],checkboxSize:[12,28],rowHeight:[28,64],minCellWidth:[64,160],radius:[0,16]};
const own=t=>typeof t==='string'&&t.startsWith('group:');
const target=d=>'group:'+d.compositeInput.id;
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function metric(k,v){const [lo,hi]=bounds[k];if(!Number.isFinite(v)||v<lo||v>hi)fail('Invalid group metric: '+k);}
export function groupMetrics(d){return Object.fromEntries(Object.keys(bounds).map(k=>[k,d.compositeInput.metrics[k]??d.unspecifiedRequirements.find(r=>r.target===target(d)+':'+k)?.renderFallback.value]));}
function deps(d){
 const c=d.compositeInput,p=d.fieldMessages;
 return {pattern:p,types:[c.typography.label,c.typography.option,p.typography].map(id=>{const r=d.typography.roles.find(r=>r.id===id);if(!r)fail('Unknown group typography');return {record:r,resolved:resolvedType(d,r)};}),
 colors:[...Object.values(c.colors),...Object.values(p.colors)].map(e=>({expression:e,resolved:resolveButtonColor(d,e)}))};
}
export function groupDefaults(d){
 const dependency=deps(d),types=new Set(dependency.types.map(t=>'type:'+t.record.id)),reqs=new Set(dependency.colors.flatMap(c=>c.resolved.requirements));
 const inherited=fieldDefaults(d).map(r=>({...r,affectedTargets:[...r.affectedTargets]}));
 for(const r of inherited)if(reqs.has(r.requirementId)||r.affectedTargets.some(t=>types.has(t)||t==='pattern:'+d.fieldMessages.id))r.affectedTargets.push(target(d));
 return [...inherited,...d.unspecifiedRequirements.filter(r=>own(r.target)).map(r=>({requirementId:r.id,target:r.target,...r.renderFallback,affectedTargets:[target(d)]}))];
}
export function validateGroup(d,saved=false){
 const {compositeInput}=d;
 if(d.schemaVersion!=='0.14'||!Array.isArray(d.unspecifiedRequirements)||(saved&&!Array.isArray(d.decisions)))fail('Invalid group document');
 validateField(d,saved);
 const c=compositeInput;
 objectWithKeys(c,['id','template','widths','label','options','selectedIds','errorSelectedIds','helperText','errorText','messagePattern','typography','colors','metrics','status'],'composite input');
 identifier(c.id,'group ID');if(c.template!=='checkbox-group-v1')fail('Unsupported group template');
 text(c.label,'group label',80);text(c.helperText,'group helper',240);text(c.errorText,'group error',240);
 if(c.messagePattern!==d.fieldMessages.id)fail('Unknown group message pattern');
 if(!Array.isArray(c.widths)||c.widths.length!==2||new Set(c.widths).size!==2||c.widths.some(w=>!Number.isInteger(w)||w<240||w>800))fail('Provide two distinct group widths from 240 to 800px');
 if(!Array.isArray(c.options)||c.options.length<2||c.options.length>8)fail('Provide two to eight group options');
 for(const o of c.options){objectWithKeys(o,['id','label'],'group option');identifier(o.id,'option ID');text(o.label,'option label',40);}
 if(new Set(c.options.map(o=>o.id)).size!==c.options.length)fail('Duplicate option IDs');
 for(const ids of [c.selectedIds,c.errorSelectedIds])if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!c.options.some(o=>o.id===id)))fail('Invalid selected option IDs');
 objectWithKeys(c.typography,['label','option'],'group typography');
 objectWithKeys(c.colors,['surface','text','border','selected','mark'],'group colors');
 deps(d);
 objectWithKeys(c.metrics,Object.keys(bounds),'group metrics');
 const missing=Object.keys(bounds).filter(k=>c.metrics[k]===null);
 if(!['proposed','accepted','unspecified'].includes(c.status)||(missing.length>0)!==(c.status==='unspecified'))fail('Missing group metrics must remain unspecified');
 for(const k of Object.keys(bounds)){
  if(c.metrics[k]!==null)metric(k,c.metrics[k]);
  if(d.unspecifiedRequirements.filter(r=>r.target===target(d)+':'+k).length!==(c.metrics[k]===null?1:0))fail('Missing group metric needs exactly one fallback');
 }
 if(new Set(d.unspecifiedRequirements.map(r=>r.id)).size!==d.unspecifiedRequirements.length)fail('Duplicate requirement IDs');
 for(const r of d.unspecifiedRequirements.filter(r=>own(r.target))){
  objectWithKeys(r,['id','target','description','decisionOwner','renderFallback'],'group requirement');
  identifier(r.id,'requirement ID');text(r.description,'description');
  const k=r.target.slice((target(d)+':').length);
  if(!r.target.startsWith(target(d)+':')||!Object.hasOwn(bounds,k)||c.metrics[k]!==null)fail('Unknown group requirement');
  if(!['owner','UX','UI'].includes(r.decisionOwner))fail('Invalid decision owner');
  objectWithKeys(r.renderFallback,['value','source'],'fallback');metric(k,r.renderFallback.value);text(r.renderFallback.source,'source');
 }
 if(c.status==='accepted'&&groupDefaults(d).some(r=>r.affectedTargets.includes(target(d))))fail('Accepted group cannot depend on defaults');
 if(saved){
  for(const r of d.decisions.filter(r=>own(r.target))){
   objectWithKeys(r,['target','revision','reason'],'group decision');text(r.reason,'reason');
   if(r.target!==target(d)||!Number.isSafeInteger(r.revision)||r.revision<1||r.revision>d.revision)fail('Invalid group decision');
  }
  if(c.status==='accepted'&&!d.decisions.some(r=>r.target===target(d)))fail('Accepted group needs owner decision');
 }
 for(const w of c.widths)groupLayout(d,w);
 return d;
}
export function nextGroupDocument(saved,proposal,options){
 const approvals=options.accept??[];
 if(!Array.isArray(approvals)||new Set(approvals).size!==approvals.length)fail('Invalid acceptance targets');
 if(approvals.length)text(options.reason,'owner decision reason');
 const inherited=nextFieldDocument(saved,proposal,{...options,accept:approvals.filter(t=>!own(t))});
 const old=saved?.compositeInput,c=proposal.compositeInput,t=target(proposal);
 if(old&&old.id!==c.id)fail('Preserve composite input ID');
 for(const a of approvals.filter(own))if(a!==t||c.status!=='accepted')fail('Acceptance must target accepted group');
 const changed=old&&(!same(old,c)||!same(deps(saved),deps(proposal)));
 if(old?.status==='accepted'&&changed&&!approvals.includes(t))fail('Accepted group or dependency changed');
 if(c.status==='accepted'&&old?.status!=='accepted'&&!approvals.includes(t))fail('Group acceptance requires owner decision');
 const decisions=[...(saved?.decisions??[]).filter(r=>own(r.target))];
 if(c.status==='accepted'&&(old?.status!=='accepted'||changed))decisions.push({target:t,revision:proposal.baseRevision+1,reason:options.reason});
 const {baseRevision,...body}=proposal;
 const next=canonical({...body,revision:baseRevision+1,decisions:[...inherited.decisions,...decisions].sort((a,b)=>a.revision-b.revision||a.target.localeCompare(b.target))});
 if(saved&&same({...next,revision:saved.revision},saved))next.revision=saved.revision;
 return next;
}
export function groupLayout(d,width){
 const c=d.compositeInput,p=d.fieldMessages,m=groupMetrics(d),pm=fieldMetrics(d,'fieldMessages');
 const engine=id=>textEngine(resolvedType(d,d.typography.roles.find(r=>r.id===id)));
 const label=engine(c.typography.label),option=engine(c.typography.option),message=engine(p.typography);
 const available=width-2*m.padding,columns=Math.min(c.options.length,Math.max(1,Math.floor((available+m.columnGap)/(m.minCellWidth+m.columnGap))));
 const cellWidth=(available-(columns-1)*m.columnGap)/columns,rows=Math.ceil(c.options.length/columns);
 if(label.shape(c.label).width>available||m.checkboxSize>m.rowHeight||option.metrics.lineHeightPx>m.rowHeight||c.options.some(o=>option.shape(o.label).width+m.checkboxSize+m.optionGap>cellWidth))fail('Composite input content does not fit');
 const helper=message.wrap(c.helperText,width-2*pm.inset),error=message.wrap('Error: '+c.errorText,width-2*pm.inset);
 const frameHeight=2*m.padding+label.metrics.lineHeightPx+m.rowGap+rows*m.rowHeight+(rows-1)*m.rowGap;
 let y=58;
 const states=['default','error'].map(state=>{
  const frameY=y+16,optionY=frameY+m.padding+label.metrics.lineHeightPx+m.rowGap;
  const content=state==='error'?[...(p.errorPresentation==='retain'?[{kind:'helper',lines:helper}]:[]),{kind:'error',lines:error}]:[{kind:'helper',lines:helper}];
  let cursor=frameY+frameHeight+pm.gap;
  const messages=content.map((msg,i)=>{if(i)cursor+=pm.messageGap;const result={...msg,y:cursor};cursor+=msg.lines.length*message.metrics.lineHeightPx;return result;});
  const result={state,captionY:y,frameY,optionY,messages,selectedIds:state==='error'?c.errorSelectedIds:c.selectedIds};
  y=cursor+36;return result;
 });
 if(y>1800)fail('Composite input exceeds bounded sheet');
 return {width,height:Math.ceil(y),m,pm,columns,cellWidth,frameHeight,label,option,message,states};
}
export function groupSvg(d,width){
 const c=d.compositeInput,p=d.fieldMessages,l=groupLayout(d,width),{m,pm}=l,x=20;
 const colors=Object.fromEntries(Object.entries(c.colors).map(([k,e])=>[k,resolveButtonColor(d,e).value]));
 const helper=resolveButtonColor(d,p.colors.helper).value,error=resolveButtonColor(d,p.colors.error).value;
 const draw=(engine,lines,x,y,cls)=>'<g class="'+cls+'" transform="translate('+x+' '+y+')">'+lines.map((line,i)=>'<g transform="translate(0 '+i*engine.metrics.lineHeightPx+')">'+engine.shape(line).svg+'</g>').join('')+'</g>';
 const style='.paper{fill:#fff}.surface{fill:'+colors.surface+'}.caption{font:12px sans-serif;fill:#333}.frame{fill:'+colors.surface+';stroke:'+colors.border+';stroke-width:1}.label,.option{fill:'+colors.text+'}.box{fill:'+colors.surface+';stroke:'+colors.border+';stroke-width:1.5}.checked .box{fill:'+colors.selected+';stroke:'+colors.selected+'}.tick{fill:none;stroke:'+colors.mark+';stroke-width:2}.helper{fill:'+helper+'}.error-message{fill:'+error+'}.error .frame{stroke:'+error+'}';
 const lines=['<svg xmlns="http://www.w3.org/2000/svg" width="'+(width+40)+'" height="'+l.height+'" viewBox="0 0 '+(width+40)+' '+l.height+'" role="img" aria-labelledby="title desc"><title id="title">'+xml(c.label+' composite input')+'</title><desc id="desc">'+xml('One logical input with individually labeled checkboxes and one shared message area. Helper: '+c.helperText+'. Error: '+c.errorText+'. Supplied states, not validation logic.')+'</desc>',
 '<metadata>'+xml(JSON.stringify({template:c.template,pattern:c.messagePattern,width,columns:l.columns,metrics:m,messageMetrics:pm,states:l.states}))+'</metadata>',
 '<style>'+style+'</style><rect class="paper" width="100%" height="100%"/>',
 '<text class="caption" x="20" y="18">'+xml(width+'px composite / '+l.columns+' columns / '+c.status)+'</text>',
 '<text class="caption" x="20" y="36">One helper/error area for the whole input</text>'];
 for(const row of l.states){
  const end=row.messages.at(-1),bottom=end.y+end.lines.length*l.message.metrics.lineHeightPx;
  lines.push('<g class="'+row.state+'" data-state="'+row.state+'"><text class="caption" x="20" y="'+row.captionY+'">'+row.state+'</text>',
   '<rect class="surface" x="'+(x-4)+'" y="'+(row.frameY-4)+'" width="'+(width+8)+'" height="'+(bottom-row.frameY+8)+'"/>',
   '<rect class="frame" x="'+x+'" y="'+row.frameY+'" width="'+width+'" height="'+l.frameHeight+'" rx="'+m.radius+'"/>',
   draw(l.label,[c.label],x+m.padding,row.frameY+m.padding,'label'));
  for(const [i,o] of c.options.entries()){
   const ox=x+m.padding+(i%l.columns)*(l.cellWidth+m.columnGap),oy=row.optionY+Math.floor(i/l.columns)*(m.rowHeight+m.rowGap),by=oy+(m.rowHeight-m.checkboxSize)/2,selected=row.selectedIds.includes(o.id);
   lines.push('<g data-option="'+o.id+'" data-selected="'+selected+'" class="'+(selected?'checked':'unchecked')+'"><rect class="box" x="'+ox+'" y="'+by+'" width="'+m.checkboxSize+'" height="'+m.checkboxSize+'" rx="2"/>');
   if(selected)lines.push('<path class="tick" d="M'+(ox+m.checkboxSize*.2)+' '+(by+m.checkboxSize*.5)+' l'+m.checkboxSize*.2+' '+m.checkboxSize*.2+' l'+m.checkboxSize*.4+' '+(-m.checkboxSize*.4)+'"/>');
   lines.push(draw(l.option,[o.label],ox+m.checkboxSize+m.optionGap,oy+(m.rowHeight-l.option.metrics.lineHeightPx)/2,'option'),'</g>');
  }
  lines.push('<g data-message-area="shared">');
  for(const msg of row.messages)lines.push(draw(l.message,msg.lines,x+pm.inset,msg.y,msg.kind==='error'?'error-message':'helper'));
  lines.push('</g></g>');
 }
 return lines.join('\n')+'</svg>\n';
}
export function groupComponentsBlock(d){
 const c=d.compositeInput;
 const section=['## Composite Input: Shared Guidance And Feedback','',
 'Example: '+markdown(c.label)+'. Template: '+c.template+'. Status: '+c.status+'. Shared pattern: '+markdown(c.messagePattern)+'.','',
 ...c.widths.flatMap(w=>['![Composite input at '+w+'px](./design-language/specimens/group-'+c.id+'-'+w+'.svg)','']),
 'The child checkboxes edit one logical selection value. Each keeps its own label; the group has a collective label and one message area below the complete input. Helper and error content belong to the composite, not to every checkbox.','',
 'The error example is supplied test content, not an inferred product validation rule. A group-level error identifies the group; a child-specific error must identify that child rather than making every child appear invalid. Do not duplicate the shared helper beneath each child.','',
 '| Metric | Value | Status |','| --- | --- | --- |',...Object.entries(groupMetrics(d)).map(([k,v])=>'| '+[k,v+'px',c.metrics[k]===null?'Unspecified (default)':c.status].map(markdown).join(' | ')+' |'),'',
 'Use a labeled semantic group (such as fieldset/legend for these checkboxes), retain native child labels/behavior, and programmatically associate the shared description with its logical scope. Verify keyboard and assistive-technology behavior; this SVG is not an interactive implementation. Complex app-specific inputs still need their own comps.','',
 ...groupDefaults(d).filter(r=>r.affectedTargets.includes(target(d))).map(r=>'- '+markdown(r.target??r.requirementId)+': provisional '+markdown(String(r.value))+' ('+markdown(r.source)+').'),''];
 return fieldComponentsBlock(d)
 .replace('## Field Messages: Helper And Error','## Input Guidance And Feedback')
 .replace('Applies to other fields such as selects when those templates are implemented.','Applies to a logical input: a single field or a composite component with several controls. The shared fieldMessages pattern supplies one guidance and feedback area.')
 .replace('Place messages below the field, aligned by the shared inset;', 'Place messages below the whole logical input, aligned by the shared inset;')
 .replace('## Text Field With An Embedded Button',section.join('\n')+'\n## Text Field With An Embedded Button');
}
export function groupBlock(d){
 const lines=['### Composite Input Requirements',''];
 for(const r of d.unspecifiedRequirements.filter(r=>own(r.target)))lines.push('- '+markdown(r.target)+': '+markdown(r.description)+' Default '+markdown(String(r.renderFallback.value))+'.');
 for(const r of d.decisions.filter(r=>own(r.target)))lines.push('- Owner decision '+markdown(r.target)+', revision '+r.revision+': '+markdown(r.reason));
 lines.push('');
 return fieldBlock(d).replace('## Open Questions',lines.join('\n')+'\n## Open Questions');
}
export function groupDrawings(d){return new Map([...fieldDrawings(d),...d.compositeInput.widths.map(w=>['design-language/specimens/group-'+d.compositeInput.id+'-'+w+'.svg',groupSvg(d,w)])]);}
