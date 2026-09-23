import {objectWithKeys,text,identifier,fail,markdown} from './design-language-support.mjs';
import {validateSelect,nextSelectDocument,selectBlock,selectComponentsBlock,selectDrawings,selectDefaults} from './design-language-select.mjs';
import {buttonStates,buttonLayout,resolveButtonColor} from './design-language-button.mjs';
import {iconGeometry} from './design-language-icons.mjs';
import {resolvedType} from './design-language-typography.mjs';
import {resolveThemeValue} from './design-language-theme.mjs';
import {xml} from './design-language-password-layout.mjs';

const variants=['outlined','text','icon'];
const own=t=>typeof t==='string'&&t.startsWith('variants:');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const variantTarget=d=>'variants:'+d.buttonVariants.id;
function targetOwnerCount(d,target){
 if(typeof target!=='string')return 0;
 const component='component:'+d.password.id;
 return [
  target.startsWith('member:'),target.startsWith('role:'),target.startsWith('type:'),target.startsWith('icon:'),
  target===component||target.startsWith(component+':'),target.startsWith('button:'),target.startsWith('pattern:'),
  target.startsWith('field:'),target.startsWith('group:'),target.startsWith('select:'),target.startsWith('variants:')
 ].filter(Boolean).length;
}
function dependencies(d){
 const v=d.buttonVariants,icon=d.icons.find(i=>i.id===v.iconId);
 if(!icon||!iconGeometry(icon))fail('Button variant requires a resolved bundled icon');
 return {button:d.button,icon,geometry:iconGeometry(icon),type:resolvedType(d,d.typography.roles.find(t=>t.id===d.button.typography)),
 colors:[...Object.values(d.button.states).flatMap(s=>Object.values(s)).map(e=>resolveButtonColor(d,e)),...Object.values(v.states).flatMap(s=>Object.values(s).flatMap(c=>Object.values(c))).map(e=>resolveButtonColor(d,e)),
 ...[d.button.surfaceRole,d.button.focusRole].map(role=>resolveButtonColor(d,{kind:'role',role}))]};
}
export function extrasDefaults(d){
 const dep=dependencies(d),requirements=new Set(dep.colors.flatMap(c=>c.requirements));
 return [...selectDefaults(d).map(r=>({...r,affectedTargets:[...r.affectedTargets,
 ...(r.affectedTargets.includes('button:'+d.button.id)||r.affectedTargets.includes('icon:'+dep.icon.id)||requirements.has(r.requirementId)?[variantTarget(d)]:[])]})),
 ...d.unspecifiedRequirements.filter(r=>r.target===variantTarget(d)).map(r=>({requirementId:r.id,target:r.target,...r.renderFallback,affectedTargets:[r.target]}))];
}
export function validateExtras(d,saved=false){
 const keys=['schemaVersion','id',saved?'revision':'baseRevision','source','palette','theme','typography','icons','password','documentLayout','button','identityPalette','fieldMessages','textField','compositeInput','selectInput','buttonVariants','unspecifiedRequirements','openQuestions'];
 if(saved)keys.push('decisions');
 if(d.status!==undefined)keys.push('status');
 objectWithKeys(d,keys,'design-language document');
 if(d.schemaVersion!=='0.14'||!Array.isArray(d.unspecifiedRequirements)||(saved&&!Array.isArray(d.decisions)))fail('Invalid extras document');
 if(d.status!==undefined&&!['accepted','locked'].includes(d.status))fail('Design-language document status must be accepted or locked');
 for(const record of d.unspecifiedRequirements)if(targetOwnerCount(d,record?.target)!==1)fail('Unknown requirement target');
 if(saved)for(const record of d.decisions)if(targetOwnerCount(d,record?.target)!==1)fail('Unknown decision target');
 validateSelect(d,saved);
 const v=d.buttonVariants;
 objectWithKeys(v,['id','template','iconId','accessibleLabel','tooltip','states','status'],'button variants');
 identifier(v.id,'variant ID');if(v.template!=='mui-button-variants-v1')fail('Unknown variants template');
 text(v.accessibleLabel,'icon accessible name',80);text(v.tooltip,'icon tooltip',120);
 if(!['proposed','accepted'].includes(v.status))fail('Variants must be proposed or accepted; inherited defaults remain disclosed');
 objectWithKeys(v.states,variants,'variant states');
 for(const name of variants){objectWithKeys(v.states[name],buttonStates,'button states');for(const state of buttonStates){
 objectWithKeys(v.states[name][state],['background','foreground','border'],'variant colors');
 for(const e of Object.values(v.states[name][state]))resolveButtonColor(d,e);
 }}
 const dep=dependencies(d),layout=buttonLayout(d);
 if(dep.icon.sizePx+8>layout.m.height||layout.m.borderWidth<=0)fail('Icon must fit target with padding and outlined variant requires a border');
 if(new Set(d.unspecifiedRequirements.map(r=>r.id)).size!==d.unspecifiedRequirements.length)fail('Duplicate requirement IDs');
 if(v.status==='accepted'&&extrasDefaults(d).some(r=>r.affectedTargets.includes(variantTarget(d))))fail('Accepted variants cannot depend on defaults');
 if(saved){
 for(const r of d.decisions.filter(r=>own(r.target))){objectWithKeys(r,['target','revision','reason'],'variant decision');text(r.reason,'reason');
 if(r.target!==variantTarget(d)||!Number.isSafeInteger(r.revision)||r.revision<1||r.revision>d.revision)fail('Invalid variant decision');}
 if(v.status==='accepted'&&!d.decisions.some(r=>r.target===variantTarget(d)))fail('Accepted variants need owner decision');
 }
 return d;
}
export function nextExtrasDocument(saved,proposal,options){
 const approvals=options.accept??[];
 if(!Array.isArray(approvals)||new Set(approvals).size!==approvals.length)fail('Invalid acceptance targets');
 if(approvals.length)text(options.reason,'owner decision reason');
 const inherited=nextSelectDocument(saved,proposal,{...options,accept:approvals.filter(t=>!own(t))});
 const old=saved?.buttonVariants,v=proposal.buttonVariants,t=variantTarget(proposal);
 if(old&&old.id!==v.id)fail('Preserve variant ID');
 for(const a of approvals.filter(own))if(a!==t||v.status!=='accepted')fail('Acceptance must target accepted variants');
 const changed=old&&(!same(old,v)||!same(dependencies(saved),dependencies(proposal)));
 if(old?.status==='accepted'&&changed&&!approvals.includes(t))fail('Accepted variants or dependency changed');
 if(v.status==='accepted'&&old?.status!=='accepted'&&!approvals.includes(t))fail('Variant acceptance requires owner decision');
 const decisions=[...(saved?.decisions??[]).filter(r=>own(r.target))];
 if(v.status==='accepted'&&(old?.status!=='accepted'||changed))decisions.push({target:t,revision:proposal.baseRevision+1,reason:options.reason});
 const {baseRevision,...body}=proposal;
 const next=canonical({...body,revision:baseRevision+1,decisions:[...inherited.decisions,...decisions].sort((a,b)=>a.revision-b.revision||a.target.localeCompare(b.target))});
 if(saved&&same({...next,revision:saved.revision},saved))next.revision=saved.revision;
 return next;
}
export function variantSvg(d){
 const b=d.button,v=d.buttonVariants,{m,type,label,loading,width}=buttonLayout(d),icon=d.icons.find(i=>i.id===v.iconId),geometry=iconGeometry(icon);
 const names=['contained',...variants],gap=32,firstX=104,iconColumn=Math.max(m.height,80),canvasWidth=firstX+3*(width+gap)+iconColumn+20,rowHeight=m.height+36,canvasHeight=104+rowHeight*6;
 const surface=resolveThemeValue(d,'role:'+b.surfaceRole).value,focus=resolveThemeValue(d,'role:'+b.focusRole).value;
 const css=['.paper{fill:#fff}.annotation{font:12px sans-serif;fill:#202020}.surface{fill:'+surface+'}.focus-ring{fill:none;stroke:'+focus+';stroke-width:'+m.focusWidth+'}.spinner{fill:none;stroke-width:2;stroke-linecap:round}'];
 const lines=[];
 for(const [column,name] of names.entries()){
 const size=name==='icon'?m.height:width,radius=name==='icon'?m.height/2:m.radius,x=firstX+column*(width+gap);
 lines.push('<text class="annotation" x="'+x+'" y="78">'+name+'</text>');
 for(const [index,state] of buttonStates.entries()){
 const y=94+index*rowHeight,key=name+'-'+state,colors=Object.fromEntries(Object.entries(name==='contained'?b.states[state]:v.states[name][state]).map(([k,e])=>[k,resolveButtonColor(d,e).value]));
 css.push('.'+key+' .face{fill:'+colors.background+';stroke:'+colors.border+';stroke-width:'+(name==='text'||name==='icon'?0:m.borderWidth)+'}.'+key+' .ink{fill:'+colors.foreground+'}.'+key+' .spinner{stroke:'+colors.foreground+'}');
 lines.push('<g class="'+key+'" data-variant="'+name+'" data-state="'+state+'">');
 if(column===0)lines.push('<text class="annotation" x="16" y="'+(y+m.height/2+4)+'">'+state+'</text>');
 lines.push('<rect class="surface" x="'+(x-12)+'" y="'+(y-12)+'" width="'+(size+24)+'" height="'+(m.height+24)+'"/>');
 if(state==='focus'){const g=m.focusGap+m.focusWidth/2;lines.push('<rect class="focus-ring" x="'+(x-g)+'" y="'+(y-g)+'" width="'+(size+2*g)+'" height="'+(m.height+2*g)+'" rx="'+(radius+g)+'"/>');}
 lines.push('<rect class="face" x="'+x+'" y="'+y+'" width="'+size+'" height="'+m.height+'" rx="'+radius+'"/>');
 if(name==='icon'){
 lines.push('<title>'+xml(v.accessibleLabel+(state==='loading'?' (loading)':''))+'</title>');
 if(state==='loading')lines.push('<path class="spinner" d="M'+(x+size/2)+' '+(y+m.height/2-8)+' a8 8 0 1 1 -8 8"/>');
 else lines.push('<g class="ink" transform="translate('+(x+(size-icon.sizePx)/2)+' '+(y+(m.height-icon.sizePx)/2)+') scale('+icon.sizePx/24+')">'+geometry.paths.map(p=>'<path d="'+xml(p.d)+'" opacity="'+p.opacity+'"/>').join('')+'</g>');
 }else{const run=state==='loading'?loading:label;lines.push('<g class="ink" transform="translate('+(x+(size-run.width)/2)+' '+(y+(m.height-type.lineHeightPx)/2)+')">'+run.svg+'</g>');}
 lines.push('</g>');
 }}
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+canvasWidth+'" height="'+canvasHeight+'" viewBox="0 0 '+canvasWidth+' '+canvasHeight+'" role="img" aria-labelledby="title desc"><title id="title">Button variant comparison</title><desc id="desc">'+xml('Static contained, outlined, text and icon-only states. Icon name: '+v.accessibleLabel+'. Tooltip: '+v.tooltip+'. Loading arc is static; runtime behavior is not implemented.')+'</desc><style>'+css.join('')+'</style><rect class="paper" width="100%" height="100%"/><text class="annotation" x="16" y="22">'+xml('Button variants / '+v.status+' / shared '+m.height+'px height')+'</text><text class="annotation" x="16" y="44">'+xml(width+'px text buttons; '+m.height+'px icon target; '+icon.sizePx+'px icon; '+type.sizePx+'px type')+'</text>'+lines.join('\n')+'</svg>\n';
}
export function extrasComponentsBlock(d){
 const v=d.buttonVariants,icon=d.icons.find(i=>i.id===v.iconId),m=buttonLayout(d).m;
 const sections=['## Button Variants','',
 '![Button variant comparison](./design-language/specimens/button-variants-'+v.id+'.svg)','',
 'Status: '+v.status+'. All variants consume the command-button typography, height, focus ring and surface. Outlined/text widths share the measured command width; the circular icon target is '+m.height+'px with a '+icon.sizePx+'px drawing. Border and radius match the command button except the circular icon and borderless text/icon variants. Derived state colors are retained in the source, not added as branding colors.','',
 'Contained provides high emphasis, outlined secondary emphasis, and text lower emphasis. Use icon-only actions where the meaning is recognizable in context. These examples compare treatment, not a recommendation to repeat one action four times.','',
 'Icon: '+markdown(v.iconId)+'. Accessible name: '+markdown(v.accessibleLabel)+'. Tooltip: '+markdown(v.tooltip)+'. Set an explicit accessible name on the button and hide decorative SVG semantics. Show the tooltip on focus as well as hover; do not make tooltip discovery the only way to identify an unfamiliar action. If the tooltip adds a description, associate it as a description without replacing the name.','',
 'Preserve native keyboard activation and visible focus. Suppress activation when disabled or loading; retain the accessible name during loading and expose busy/progress state appropriately. The loading arc is a static cue, not an animation. Verify contrast, target size in context, focus and tooltip behavior during implementation. Toggle/selected states remain separate work.','',
 ...extrasDefaults(d).filter(r=>r.affectedTargets.includes(variantTarget(d))).map(r=>'- '+markdown(r.target??r.requirementId)+': provisional '+markdown(String(r.value))+' ('+markdown(r.source)+').'),''];
 return selectComponentsBlock(d).replace('## Command Button',sections.join('\n')+'\n## Command Button').replaceAll('icon/outlined/text/toggle','toggle');
}
export function extrasBlock(d){
 const lines=['### Button Variant Decisions',''];
 for(const r of d.unspecifiedRequirements.filter(r=>r.target===variantTarget(d)))lines.push('- '+markdown(r.target)+': '+markdown(r.description)+' Fallback: '+markdown(r.renderFallback.value)+' ('+markdown(r.renderFallback.source)+').');
 for(const r of extrasDefaults(d).filter(r=>r.affectedTargets.includes(variantTarget(d))))lines.push('- '+markdown(r.target??r.requirementId)+': still provisional for button variants.');
 for(const r of d.decisions.filter(r=>r.target===variantTarget(d)))lines.push('- Owner decision '+markdown(r.target)+', revision '+r.revision+': '+markdown(r.reason));
 return selectBlock(d).replaceAll('icon/outlined/text/toggle','toggle').replace('## Open Questions',lines.join('\n')+'\n\n## Open Questions');
}
export function extrasDrawings(d){return new Map([...selectDrawings(d),['design-language/specimens/button-variants-'+d.buttonVariants.id+'.svg',variantSvg(d)]]);}
