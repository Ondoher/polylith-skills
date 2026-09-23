import fs from 'node:fs';
import path from 'node:path';

import {validateLayout,layoutDrawings,layoutContent} from './design-language-layout.mjs';
import {validateSpacing,spacingDrawings} from './design-language-spacing.mjs';
import {objectWithKeys,text,fail,markdown,readOptional,rejectLink} from './design-language-support.mjs';
import {resolveThemeValue} from './design-language-theme.mjs';
import {resolvedType} from './design-language-typography.mjs';
import {fontCatalog} from './design-language-fonts.mjs';

export const reviewConfigFile='design-language/review-layout.json';
const begin='<!-- refine-design:design-language:start -->';
const end='<!-- refine-design:design-language:end -->';
const table=(headers,rows)=>['| '+headers.join(' | ')+' |','| '+headers.map(()=>'---').join(' | ')+' |',...rows.map(row=>'| '+row.join(' | ')+' |')].join('\n');
const wrap=lines=>[begin,...lines,end].join('\n');
const back='[Design language](./design-language.md)';
const status=(value,missing=false)=>missing||value==='unspecified'?'Default':value==='accepted'?'Accepted':'Proposed';
const questionBlock=(questions,omitEmpty=false)=>questions.length?['## Open Questions','',...questions.map(question=>'- '+markdown(question))]:omitEmpty?[]:['## Open Questions','','No additional questions recorded for this page.'];
const maintainedLayoutDefaults=JSON.parse(fs.readFileSync(new URL('../references/layout-defaults.json',import.meta.url),'utf8'));

/** Construct the sole current review-layout contract from neutral spacing and maintained layout defaults. */
export function createDefaultReviewConfig(){
 return validateReviewConfig({
  version:7,
  title:'Design Language',
  visualDirection:null,
  layoutNotes:null,
  spacing:{scale:[4,8,12,16,24],groupGap:8,regionPadding:16,regionGap:24,status:'defaulted',fieldGap:16,helperGap:4,helperLineHeight:16},
  layout:structuredClone(maintainedLayoutDefaults)
 });
}

export function validateReviewConfig(config){
 objectWithKeys(config,['version','title','visualDirection','layoutNotes','spacing','layout'],'review layout');
 if(config.version!==7)fail('Unsupported review layout version; expected 7');
 validateSpacing(config.spacing);
 validateLayout(config.layout);
 text(config.title,'review title',80);
 for(const key of ['visualDirection','layoutNotes'])if(config[key]!==null)text(config[key],key,1200);
 return config;
}

export function readReviewConfig(base){
 const file=path.join(base,reviewConfigFile);rejectLink(file);const raw=readOptional(file);
 return raw===null?null:validateReviewConfig(JSON.parse(raw));
}

function colors(document){
 const rows=document.theme.roles.map(role=>{const value=resolveThemeValue(document,'role:'+role.id);return ['![Swatch](./design-language/specimens/role-'+role.id+'.svg)',markdown(role.name),value.value,markdown(role.purpose),status(role.status,!!value.defaultRequirementId)];});
 const lines=['# Colors','',back,'',table(['','Role','Value','Use','Status'],rows),'','Default values are current editable design choices. [Details and sources](./decisions.md).',''];
 const identity=document.identityPalette?.memberIds??[];
 lines.push('## Branding','');
 if(identity.length)lines.push(table(['','Color','Value','Use','Status'],identity.map(id=>{const member=document.palette.members.find(candidate=>candidate.id===id),resolved=resolveThemeValue(document,'member:'+id);return ['![Swatch](./design-language/specimens/member-'+id+'.svg)',markdown(member.name),resolved.value,markdown(member.purpose),status(member.status,!!resolved.defaultRequirementId)];})), '');
 else lines.push('No app-specific branding palette is selected. Ordinary theme colors do not establish a brand identity.','');
 lines.push(...questionBlock(document.openQuestions.filter(question=>/color|theme|brand/i.test(question)),true));
 return wrap(lines);
}

function typography(document){
 const lines=['# Typography','',back,'','These metrics are current editable design defaults. [Details and sources](./decisions.md).',''];
 for(const role of document.typography.roles){
  const resolved=resolvedType(document,role),font=fontCatalog.find(candidate=>candidate.id===resolved.fontId),missing=Object.values(resolved).some((_,index)=>[role.fontId,role.sizePx,role.weight,role.lineHeightPx][index]===null)||!!resolveThemeValue(document,'role:'+role.colorRole).defaultRequirementId;
  lines.push('## '+markdown(role.name),'','![Type specimen](./design-language/specimens/type-'+role.id+'.svg)','',markdown(font.family)+' · '+resolved.sizePx+'px / '+resolved.lineHeightPx+'px · Weight '+resolved.weight+' · '+status(role.status,missing),'',markdown(role.purpose),'');
 }
 lines.push(...questionBlock(document.openQuestions.filter(question=>/font|typograph|typeface|text size/i.test(question)),true));
 return wrap(lines);
}

function icons(document){
 const lines=['# Reusable Component Icons','',back,'','App-action icons belong to the product comps that use them.','', '![Component icon inventory](./design-language/specimens/icons.svg)','',table(['Icon','Meaning','Accessible name','Status'],document.icons.map(icon=>[markdown(icon.name),markdown(icon.meaning),markdown(icon.accessibleLabel),status(icon.status,icon.asset===null)])),'',
 'Sizes, assets and provenance remain in the [shared source](./design-language/design-language.json).','',...questionBlock(document.openQuestions.filter(question=>/icon/i.test(question)),true)];
 return wrap(lines);
}

function decisions(document){
 const lines=['# Decisions And Details','',back,'','## Source','',markdown(document.source.kind)+' · '+markdown(document.source.description),'',
 '[Design data](./design-language/design-language.json) · [Review layout](./design-language/review-layout.json)','',
 'Generated SVG metadata and the shared source retain implementation details. These pages summarize the same design; rendering does not accept a choice.','',
 '## Current Design Defaults','',table(['Design choice','Current default','Source','Area'],document.unspecifiedRequirements.map(requirement=>[markdown(requirement.description),markdown(String(requirement.renderFallback.value)),markdown(requirement.renderFallback.source),markdown(requirement.decisionOwner)])),'',
 'These values are active working design choices. They may be changed directly; they do not require an open question or acceptance step.','',
 '## Recorded Decisions','',...(document.decisions.length?document.decisions.map(decision=>'- '+markdown(decision.target??decision.colorId)+': '+markdown(decision.reason)+' (revision '+decision.revision+').'):['No owner acceptance decisions recorded.']),'',...questionBlock(document.openQuestions)];
 return wrap(lines);
}

export function reviewPages(document,config,componentBlock=null){
 validateReviewConfig(config);
 const pages=new Map([['colors.md',colors(document)],['typography.md',typography(document)],['decisions.md',decisions(document)]]);
 pages.set('layout.md',wrap([...layoutContent(document,config),...questionBlock(document.openQuestions.filter(question=>/density|layout|window|spacing/i.test(question)),true)]));
 if(document.icons?.length)pages.set('icons.md',icons(document));
 if(componentBlock)pages.set('components.md',componentBlock.replaceAll('./design-language.md#decisions-and-gaps','./decisions.md').replaceAll('./design-language.md#open-questions','./decisions.md#open-questions').replaceAll('./design-language.md#colors-and-theme','./colors.md'));
 const entries=[['colors.md','Colors','Semantic colors and optional branding'],['typography.md','Typography','Type specimens and metrics'],['layout.md','Layout','Spacing, density and surfaces'],['icons.md','Component icons','Reusable internal icons and meanings'],['components.md','Components','Standard specimens and states'],['decisions.md','Decisions','Defaults, provenance and open questions']].filter(([file])=>pages.has(file));
 pages.set('design-language.md',wrap(['# '+markdown(config.title),'','Working design · Uses editable defaults','','## Direction','',markdown(config.visualDirection??document.documentLayout?.visualDirection??'Visual direction is still open. Start with the available specimens and refine them as the product develops.'),'','## Review Pages','',table(['Page','Contents'],entries.map(([file,name,description])=>['['+name+'](./'+file+')',description])),'','Only pages with useful content are included.','',...questionBlock(document.openQuestions.slice(0,3)),...(document.openQuestions.length>3?['','[All open questions](./decisions.md#open-questions)']:[])]));
 return pages;
}

function parts(existing,expected,start=begin,finish=end){
 const startIndex=existing.indexOf(start),endIndex=existing.indexOf(finish);
 if(startIndex<0||endIndex<=startIndex||existing.indexOf(start,startIndex+1)>=0||existing.indexOf(finish,endIndex+1)>=0)fail('Missing or ambiguous generated page markers');
 if(existing.slice(startIndex,endIndex+finish.length).replace(/\r\n/g,'\n')!==expected)fail('Generated review page was edited; reconcile before rendering');
 return {prefix:existing.slice(0,startIndex),suffix:existing.slice(endIndex+finish.length)};
}

/** Plan every page before publication; preserve owner notes and reject collisions. */
export function planReviewPages(base,saved,next,oldConfig,newConfig,oldComponents,newComponents){
 if(!next.typography||!next.theme)fail('Review pages require the foundation scope; bootstrap missing foundations first');
 if(oldConfig)validateReviewConfig(oldConfig);
 validateReviewConfig(newConfig);
 const before=oldConfig?reviewPages(saved,oldConfig,oldComponents):new Map();
 const after=reviewPages(next,newConfig,newComponents),outputs=new Map();let movedNotes='';
 for(const file of before.keys())if(!after.has(file))fail('Review page removal requires reconciliation: '+file);
 for(const [file,generated] of after){
  const full=path.join(base,file);rejectLink(full);const existing=readOptional(full);let expected=before.get(file),start=begin,finish=end;
  if(file==='components.md'){start='<!-- refine-design:components:start -->';finish='<!-- refine-design:components:end -->';}
  if(expected){
   if(existing===null)fail('Missing generated review page: '+file);
   const preserved=parts(existing,expected,start,finish);
   if(!oldConfig&&file==='design-language.md'){
    movedNotes=preserved.prefix+preserved.suffix;outputs.set(file,generated+'\n');
   }else outputs.set(file,preserved.prefix+generated+preserved.suffix);
  }else{
   if(existing!==null)fail('Refusing to overwrite unowned review page: '+file);
   outputs.set(file,generated+'\n');
  }
 }
 if(movedNotes.trim())outputs.set('decisions.md',outputs.get('decisions.md')+'\n## Preserved Review Notes\n\n'+movedNotes);
 const previousDrawings=new Map([...spacingDrawings(oldConfig),...layoutDrawings(saved,oldConfig)]),nextDrawings=new Map([...spacingDrawings(newConfig),...layoutDrawings(next,newConfig)]);
 for(const [file,expected] of previousDrawings){const full=path.join(base,file);rejectLink(full);if(readOptional(full)!==expected)fail('Spacing SVG was edited or is missing: '+file);if(!nextDrawings.has(file))fail('Spacing asset removal requires reconciliation');}
 for(const [file,content] of nextDrawings){const full=path.join(base,file);rejectLink(full);if(!previousDrawings.has(file)&&readOptional(full)!==null)fail('Refusing to overwrite unowned spacing SVG: '+file);outputs.set(file,content);}
 outputs.set(reviewConfigFile,JSON.stringify(newConfig,null,2)+'\n');
 return outputs;
}
