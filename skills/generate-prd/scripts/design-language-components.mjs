import {markdown} from './design-language-support.mjs';
import {identityBlock,identityDrawings,identityDefaults} from './design-language-identity.mjs';
import {buttonMetrics} from './design-language-button.mjs';
import {passwordMetrics} from './design-language-password.mjs';
export const COMPONENT_BEGIN='<!-- refine-design:components:start -->';
export const COMPONENT_END='<!-- refine-design:components:end -->';
export function referenceBlock(d){
 return identityBlock(d)
 .replace(/## Basic Component Examples[\s\S]*?(?=## Shared States)/,'## Component Reference\n\nSee [standard components](./components.md) for the button state sheet, field examples, dimensions and component coverage gaps. Both documents use the same design data and SVG assets.\n\n')
 .replace(/## Optional Component Preview[\s\S]*?(?=## Decisions And Gaps)/,'')
 .replace(/The following are component example metrics[\s\S]*?(?=## Shape And Surfaces)/,'Component-specific example dimensions are in [the component reference](./components.md). They do not establish an app-wide spacing scale.\n\n')
 .replace(/Current component example: [^\n]+/,'Component-specific borders and radii are listed in [the component reference](./components.md).')
 .replace('Current field images show only a populated, masked default state. They do not establish focus, error or disabled styling.','See [component specimens](./components.md) for the states currently rendered; individual examples do not define every app-wide state.');
}
export function componentsBlock(d){
 const b=d.button,p=d.password,m=buttonMetrics(d),pm=passwordMetrics(d),layout=d.documentLayout;
 const table=values=>['| Metric | Value | Status |','| --- | --- | --- |',...values.map(([name,value,status])=>'| '+[name,value,status].map(v=>markdown(String(v))).join(' | ')+' |')];
 const status=(c,k)=>c.metrics[k]===null?'Unspecified (default)':c.status==='accepted'?'accepted':'proposed';
 const lines=[COMPONENT_BEGIN,'# Standard Components','',
 'Revision: '+d.revision+'. Compact app-specific reference; living and incomplete.','',
 'Shared foundations: [design language](./design-language.md). Source: **'+markdown(d.source.kind)+'**. Both documents and these SVGs are generated from the same saved design data.','',
 '## Command Button','',
 'Template: '+b.template+'. Status: '+b.status+'. Labels: '+markdown(b.label)+' / '+markdown(b.loadingLabel)+'. Typography role: '+markdown(b.typography)+'.','',
 '![Command button states](./design-language/specimens/button-'+b.id+'-states.svg)','',
 ...table(Object.entries(m).map(([k,v])=>[k,v+'px',status(b,k)])),'',
 'States: default, hover, pressed, keyboard focus, disabled and loading. Labels share a measured width. Focus uses role:'+markdown(b.focusRole)+'; preview surface uses role:'+markdown(b.surfaceRole)+'.','',
 'Theme roles and their color provenance are in [Colors And Theme](./design-language.md#colors-and-theme). State color expressions remain in the shared source; derived shades do not add identity colors.','',
 'Use for a command, not a toggle. Selected and task-level error states are outside this specimen. Loading is a static label cue; keyboard behavior, activation suppression and announcements still require implementation verification.','',
 '## Text Field With An Embedded Button','',
 'A password visibility button illustrates a familiar embedded action. Template: '+p.template+'. Status: '+p.status+'. Typography roles: '+Object.values(p.typography).map(markdown).join(', ')+'.',''];
 if(layout.embeddedField)for(const width of p.widths)lines.push('![Field at '+width+'px](./design-language/specimens/field-'+p.id+'-'+width+'.svg)','');
 else lines.push('Basic preview omitted by document selection.','');
 lines.push(...table(['fieldHeight','paddingX','adornmentSize','iconGap','radius','borderWidth'].map(k=>[k,pm[k]+'px',status(p,k)])),'',
 'Widths: '+p.widths.join(' / ')+'px. Surface: role:'+markdown(p.colors.surface)+'. Border: role:'+markdown(p.colors.border)+'. Images show the populated, masked default state only; error, focus and disabled field states remain gaps.','');
 if(layout.passwordPreview){
  lines.push('### Optional Password Detail','',
   'Helper and requirement outcomes are illustrative fixture content, not an app password policy.','');
  for(const width of p.widths)lines.push('![Password detail at '+width+'px](./design-language/specimens/component-'+p.id+'-'+width+'.svg)','');
 }
 lines.push('## Coverage And Open Decisions','',
 'Pending: icon/outlined/text/toggle buttons, ordinary field with helper/error states, and select/dropdown. Checkbox/radio/switch examples can follow product needs. Specialized components such as a diagram canvas need their own comps.','',
 'These specimens use the app design data, not a separate component theme. They are design references, not browser captures or accessibility certification.','');
 const defaults=identityDefaults(d).filter(r=>r.affectedTargets.some(t=>t==='button:'+b.id||t==='component:'+p.id));
 for(const r of defaults)lines.push('- '+markdown(r.target??r.requirementId)+': provisional '+markdown(String(r.value))+' ('+markdown(r.source)+').');
 lines.push('','See [decisions and gaps](./design-language.md#decisions-and-gaps) and [open questions](./design-language.md#open-questions) for shared decisions and ownership.','',COMPONENT_END);
 return lines.join('\n');
}
export function referenceDrawings(d){return identityDrawings(d);}
export function referenceDefaults(d){return identityDefaults(d);}
