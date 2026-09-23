import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {objectWithKeys, text, identifier, fail, markdown} from './design-language-support.mjs';
import {validateTypography, nextTypographyDocument, typographyBlock, typographyDrawings, typographyDefaults} from './design-language-typography.mjs';
import {resolveThemeValue} from './design-language-theme.mjs';
import {outlineSpecimen} from './design-language-fonts.mjs';

const root = new URL('../assets/icons/', import.meta.url);
export const iconCatalog = JSON.parse(fs.readFileSync(new URL('catalog.json',root),'utf8'));
const isIcon = value => typeof value === 'string' && value.startsWith('icon:');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
 ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
const same = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const xml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const target = icon => 'icon:' + icon.id;

export function assetFor(icon) {
 if(icon.asset===null)return null;
 const found=iconCatalog.assets.find(asset=>asset.name===icon.asset.name);
 if(!found)fail('MUI icon is not bundled: '+icon.asset.name+'. This is a local catalog gap, not evidence that MUI lacks the icon.');
 return found;
}

/** A pinned allowlist of local SVG geometry, never executable source supplied by a proposal. */
export function iconGeometry(icon) {
 const asset=assetFor(icon);
 if(!asset)return null;
 const data=fs.readFileSync(new URL(asset.file,root));
 if(createHash('sha256').update(data).digest('hex')!==asset.sha256)fail('Icon asset hash mismatch: '+asset.name);
 const geometry=JSON.parse(data);
 objectWithKeys(geometry,['viewBox','paths'],'icon geometry');
 if(geometry.viewBox!=='0 0 24 24'||!Array.isArray(geometry.paths)||!geometry.paths.length)fail('Unsupported bundled icon geometry');
 for(const item of geometry.paths) {
  objectWithKeys(item,['d','opacity'],'icon path');
  if(typeof item.d!=='string'||!item.d||!/^[MmZzLlHhVvCcSsQqTtAaEe0-9.,+\s-]+$/.test(item.d))fail('Invalid icon path');
  if(!Number.isFinite(item.opacity)||item.opacity<0||item.opacity>1)fail('Invalid icon opacity');
 }
 return geometry;
}

export function validateIcons(document,saved=false) {
 if(document.schemaVersion!=='0.14')fail('Unsupported design-language schema');
 if(!Array.isArray(document.unspecifiedRequirements)||(saved&&!Array.isArray(document.decisions)))fail('Invalid requirements or decisions');
 validateTypography(document,saved);
 if(!Array.isArray(document.icons)||document.icons.length<1||document.icons.length>24)fail('Provide one to 24 icons');
 if(new Set(document.icons.map(icon=>icon.id)).size!==document.icons.length)fail('Duplicate icon IDs');
 if(new Set(document.unspecifiedRequirements.map(item=>item.id)).size!==document.unspecifiedRequirements.length)fail('Duplicate requirement IDs');
 for(const icon of document.icons) {
  objectWithKeys(icon,['id','name','asset','sizePx','colorRole','meaning','accessibleLabel','status'],'icon');
  identifier(icon.id,'icon.id');text(icon.name,'icon.name',60);text(icon.meaning,'meaning');text(icon.accessibleLabel,'accessibleLabel',80);
  if(!Number.isFinite(icon.sizePx)||icon.sizePx<16||icon.sizePx>64)fail('Icon size must be 16 to 64px');
  if(!document.theme.roles.some(role=>role.id===icon.colorRole))fail('Unknown icon color role');
  if(!['proposed','accepted','unspecified'].includes(icon.status))fail('Invalid icon status');
  if((icon.asset===null)!==(icon.status==='unspecified'))fail('Missing icon choices must remain null and unspecified');
  if(icon.asset!==null) {
   objectWithKeys(icon.asset,['library','version','name','variant'],'icon asset');
   if(icon.asset.library!==iconCatalog.library||icon.asset.version!==iconCatalog.version||icon.asset.variant!=='Filled')fail('Unsupported icon source, version or variant');
   text(icon.asset.name,'asset.name',80);assetFor(icon);
  }
  const missing=document.unspecifiedRequirements.filter(item=>item.target===target(icon));
  if(missing.length!==(icon.asset===null?1:0))fail('Unspecified icon needs exactly one placeholder requirement');
  if(icon.status==='accepted'&&resolveThemeValue(document,'role:'+icon.colorRole).defaultRequirementId)fail('Accepted icon cannot depend on a provisional color');
 }
 for(const item of document.unspecifiedRequirements.filter(item=>isIcon(item.target))) {
  objectWithKeys(item,['id','target','description','decisionOwner','renderFallback'],'icon requirement');
  identifier(item.id,'requirement.id');text(item.description,'description');
  if(!['owner','UI','UX'].includes(item.decisionOwner))fail('Invalid decision owner');
  if(!document.icons.some(icon=>target(icon)===item.target&&icon.asset===null))fail('Unknown or specified icon requirement');
  objectWithKeys(item.renderFallback,['value','source'],'renderFallback');
  if(item.renderFallback.value!=='placeholder')fail('Missing icon uses a placeholder, not a silent substitute');
  text(item.renderFallback.source,'fallback source');
 }
 if(saved) {
  for(const item of document.decisions.filter(item=>isIcon(item.target))) {
   objectWithKeys(item,['target','revision','reason'],'decision');
   if(!document.icons.some(icon=>target(icon)===item.target))fail('Unknown icon decision target');
   text(item.reason,'reason');
   if(!Number.isSafeInteger(item.revision)||item.revision<1||item.revision>document.revision)fail('Invalid decision revision');
  }
  for(const icon of document.icons.filter(item=>item.status==='accepted'))if(!document.decisions.some(item=>item.target===target(icon)))fail('Accepted icon needs a recorded decision');
 }
 return document;
}

export function nextIconDocument(saved,proposal,options) {
 const approvals=options.accept??[];
 if(!Array.isArray(approvals)||new Set(approvals).size!==approvals.length)fail('Invalid acceptance targets');
 if(approvals.length)text(options.reason,'owner decision reason');
 const inherited=nextTypographyDocument(saved,proposal,{...options,accept:approvals.filter(item=>!isIcon(item))});
 const previous=saved?.icons??[];
 for(const old of previous)if(!proposal.icons.some(icon=>icon.id===old.id))fail('Preserve icon IDs');
 const remaining=new Set(proposal.icons.map(icon=>target(icon)));
 const decisions=[...(saved?.decisions??[]).filter(item=>isIcon(item.target)&&remaining.has(item.target))];
 for(const approval of approvals.filter(isIcon))if(!proposal.icons.some(icon=>target(icon)===approval&&icon.status==='accepted'))fail('Acceptance must target an accepted icon');
 for(const icon of proposal.icons) {
  const old=previous.find(item=>item.id===icon.id);
  const changed=old&&(!same(old,icon)||!same(resolveThemeValue(saved,'role:'+old.colorRole),resolveThemeValue(proposal,'role:'+icon.colorRole)));
  if(old?.status==='accepted'&&changed&&!approvals.includes(target(icon)))fail('Accepted icon or dependency changed: '+target(icon));
  if(icon.status==='accepted'&&old?.status!=='accepted'&&!approvals.includes(target(icon)))fail('Icon acceptance needs an explicit owner decision');
  if(icon.status==='accepted'&&(old?.status!=='accepted'||changed))decisions.push({target:target(icon),revision:proposal.baseRevision+1,reason:options.reason});
 }
 const {baseRevision,...body}=proposal;
 const next=canonical({...body,revision:baseRevision+1,decisions:[...inherited.decisions,...decisions].sort((a,b)=>a.revision-b.revision||a.target.localeCompare(b.target))});
 if(saved&&same({...next,revision:saved.revision},saved))next.revision=saved.revision;
 return next;
}

export function iconSvg(document,icon) {
 const geometry=iconGeometry(icon),prefix='icon-'+icon.id;
 const color=resolveThemeValue(document,'role:'+icon.colorRole).value;
 const drawing=geometry?geometry.paths.map(p=>'<path d="'+xml(p.d)+'" opacity="'+p.opacity+'"/>').join('')
  :'<rect class="'+prefix+'-missing" x="1" y="1" width="22" height="22"/><path class="'+prefix+'-question" d="M8 8h8v5h-4v3m0 2v2"/>';
 const identity=geometry?icon.asset.library+'@'+icon.asset.version+'/'+icon.asset.name+' '+icon.asset.variant:'Unspecified: placeholder';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+icon.sizePx+'" height="'+icon.sizePx+'" viewBox="0 0 24 24" role="img" aria-labelledby="'+prefix+'-title '+prefix+'-desc">'+
 '<title id="'+prefix+'-title">'+xml(icon.name)+'</title><desc id="'+prefix+'-desc">'+xml(icon.meaning+'; '+identity)+'</desc>'+
 '<style>.'+prefix+'{fill:'+color+'}.'+prefix+'-missing{fill:none;stroke:'+color+';stroke-width:1;stroke-dasharray:2 2}.'+prefix+'-question{fill:none;stroke:'+color+';stroke-width:1.5}</style>'+
 '<g class="'+prefix+'">'+drawing+'</g></svg>\n';
}

export function iconSheet(document) {
 let width=420,y=16;
 const rows=document.icons.map(icon=>{
  const status=icon.status+(resolveThemeValue(document,'role:'+icon.colorRole).defaultRequirementId?' / provisional color':'');
  const asset=icon.asset?icon.asset.name+' / '+icon.asset.variant:'Missing icon choice / placeholder';
  let label=outlineSpecimen({name:icon.name,sampleLines:[icon.name,asset+' / '+status]},
   {fontId:'roboto',weight:400,sizePx:12,lineHeightPx:18},'#202020');
  const labelWidth=Number(label.match(/width="(\d+)"/)[1]);
  const labelHeight=Number(label.match(/height="(\d+)"/)[1]);
  const prefix='label-'+icon.id;
  label=label.replaceAll('id="title"','id="'+prefix+'-title"').replaceAll('id="desc"','id="'+prefix+'-desc"')
   .replaceAll('aria-labelledby="title desc"','aria-labelledby="'+prefix+'-title '+prefix+'-desc"')
   .replaceAll('.sheet','.'+prefix+'-sheet').replaceAll('.ink','.'+prefix+'-ink')
   .replaceAll('class="sheet"','class="'+prefix+'-sheet"').replaceAll('class="ink"','class="'+prefix+'-ink"');
  const height=Math.max(labelHeight,icon.sizePx)+16;
  width=Math.max(width,96+labelWidth+16);
  const output=iconSvg(document,icon).replace('<svg ','<svg x="24" y="'+(y+(height-icon.sizePx)/2)+'" ')+
   label.replace('<svg ','<svg x="96" y="'+(y+(height-labelHeight)/2)+'" ');
  y+=height;return output;
 });
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+(y+16)+'" viewBox="0 0 '+width+' '+(y+16)+'" role="img" aria-labelledby="sheet-title sheet-desc">'+
 '<title id="sheet-title">Reusable component icons</title><desc id="sheet-desc">MUI component-icon review sheet. Product-action icons belong to product comps. Labels and white background are review conventions. Unspecified component choices remain placeholders.</desc><rect width="100%" height="100%" fill="#FFFFFF"/>'+
 rows.join('\n')+'</svg>\n';
}

export function iconDrawings(document) {
 return new Map([...typographyDrawings(document),
 ...document.icons.map(icon=>['design-language/specimens/icon-'+icon.id+'.svg',iconSvg(document,icon)]),
 ['design-language/specimens/icons.svg',iconSheet(document)]]);
}
export function iconDefaults(document) {
 const inherited=typographyDefaults(document);
 for(const item of inherited)item.affectedTargets.push(...document.icons.filter(icon=>resolveThemeValue(document,'role:'+icon.colorRole).defaultRequirementId===item.requirementId).map(target));
 return [...inherited,...document.unspecifiedRequirements.filter(item=>isIcon(item.target)).map(item=>({requirementId:item.id,target:item.target,...item.renderFallback,affectedTargets:[item.target]}))];
}
export function iconBlock(document) {
 const row=values=>'| '+values.map(markdown).join(' | ')+' |';
 const lines=['## Reusable Component Icons','','Preferred source: MUI Material Icons. Product-action icons belong to the product comps that use them. Filled is the demonstration variant. Other sources require a demonstrated gap. Sizes describe drawings, not interactive hit targets.','',
 '![Reusable component icon review sheet](./design-language/specimens/icons.svg)','',
 '| ID | Meaning / use | Asset | Size | Color role | Status | Accessible naming intent |','| --- | --- | --- | --- | --- | --- | --- |'];
 for(const icon of document.icons) {
  const dependency=resolveThemeValue(document,'role:'+icon.colorRole).defaultRequirementId;
  lines.push(row([icon.id,icon.meaning,icon.asset?icon.asset.name+' / '+icon.asset.variant:'Missing choice (placeholder)',icon.sizePx+'px',icon.colorRole,icon.status+(dependency?' (provisional color: '+dependency+')':''),icon.accessibleLabel]));
 }
 lines.push('','### Icon Asset Provenance','','Library: '+markdown(iconCatalog.library)+' '+markdown(iconCatalog.version)+'. License: '+markdown(iconCatalog.license)+'. Source/license files are retained in the skill assets/icons directory.','',
 '| Export | Source | Bundled geometry SHA-256 |','| --- | --- | --- |');
 for(const asset of iconCatalog.assets.filter(asset=>document.icons.some(icon=>icon.asset?.name===asset.name)))lines.push(row([asset.name,asset.source,asset.sha256]));
 lines.push('','### Missing Icon Choices','');
 const missing=document.unspecifiedRequirements.filter(item=>isIcon(item.target));
 lines.push(...(missing.length?missing.map(item=>'- '+markdown(item.target)+': '+markdown(item.description)+' Owner: '+markdown(item.decisionOwner)+'. Placeholder source: '+markdown(item.renderFallback.source)+'.'):['No missing icon choices recorded.']));
 lines.push('','### Icon Owner Decisions','');
 const decisions=document.decisions.filter(item=>isIcon(item.target));
 lines.push(...(decisions.length?decisions.map(item=>'- '+markdown(item.target)+' (revision '+item.revision+'): '+markdown(item.reason)):['No icon acceptance decisions recorded.']),'');
 return typographyBlock(document).replace('palette, theme and typography (Slice 3)','palette, theme, typography and icons (Slice 4)')
 .replace('## Open Questions',lines.join('\n')+'\n## Open Questions');
}
