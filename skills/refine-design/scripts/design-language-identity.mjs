import {objectWithKeys,text,fail,markdown} from './design-language-support.mjs';
import {validateButton,nextButtonDocument,buttonBlock,buttonDrawings,buttonDefaults} from './design-language-button.mjs';
import {resolveThemeValue} from './design-language-theme.mjs';
export function validateIdentity(d,saved=false){
 if(d.schemaVersion!=='0.14')fail('Unsupported design-language schema');
 validateButton(d,saved);
 objectWithKeys(d.identityPalette,['memberIds','rationale'],'identity palette');
 const ids=d.identityPalette.memberIds;
 if(!Array.isArray(ids)||ids.length>3||new Set(ids).size!==ids.length)fail('Identity palette needs zero to three distinct members');
 if(ids.some(id=>!d.palette.members.some(m=>m.id===id)))fail('Unknown identity member');
 text(d.identityPalette.rationale,'identity rationale');
 return d;
}
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export function nextIdentityDocument(saved,proposal,options){
 const inherited=nextButtonDocument(saved,proposal,options);
 const next=canonical({...inherited,identityPalette:proposal.identityPalette,revision:proposal.baseRevision+1});
 if(saved&&JSON.stringify(canonical({...next,revision:saved.revision}))===JSON.stringify(canonical(saved)))next.revision=saved.revision;
 return next;
}
export function identityBlock(d){
 const selected=new Set(d.identityPalette.memberIds);
 const rows=members=>['| Swatch | Color | Value | Purpose | Status |','| --- | --- | --- | --- | --- |',...members.map(m=>'| ![Color](./design-language/specimens/member-'+m.id+'.svg) | '+[m.name,resolveThemeValue(d,'member:'+m.id).value,m.purpose,m.status].map(markdown).join(' | ')+' |')].join('\n');
 const identity=d.palette.members.filter(m=>selected.has(m.id));
 const other=d.palette.members.filter(m=>!selected.has(m.id));
 const body=['### App Identity Palette','',markdown(d.identityPalette.rationale),'',
 identity.length?rows(identity):'No custom identity colors are selected. Existing theme mappings remain as recorded below; this selection does not reset overrides.','',
 'One to three purposeful identity colors when needed; none is valid. Derived states, neutrals and framework colors do not count as additional identity colors. Theme-role mappings below show where the identity is used.','',
 '### Theme And Supporting Reference Colors','',
 'These are framework defaults, supporting values or retained earlier references, not additional identity colors. Provenance and use are recorded in Color Uses.','',rows(other),''].join('\n');
 return buttonBlock(d).replace(/### Brand Palette:[\s\S]*?(?=### Application Theme:)/,body+'\n');
}
export function identityDrawings(d){return buttonDrawings(d);}
export function identityDefaults(d){return buttonDefaults(d);}
