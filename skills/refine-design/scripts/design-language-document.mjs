import {objectWithKeys,text,fail,markdown} from './design-language-support.mjs';
import {validatePassword,nextPasswordDocument,passwordMetrics,passwordDefaults,passwordDrawings} from './design-language-password.mjs';
import {passwordSvg} from './design-language-password-layout.mjs';
import {iconBlock,iconDrawings} from './design-language-icons.mjs';

const noteFields=['visualDirection','spacingLayout','shapeSurfaces','sharedStates'];
const ownsFoundation=(document,target)=>typeof target==='string'&&(
 target.startsWith('member:')||target.startsWith('role:')||target.startsWith('type:')||target.startsWith('icon:')
 ||target==='component:'+document.password.id||target.startsWith('component:'+document.password.id+':')
);
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));

export function validateDocument(document,saved=false){
 if(document.schemaVersion!=='0.14')fail('Unsupported design-language schema');
 validatePassword(document,saved);
 objectWithKeys(document.documentLayout,[...noteFields,'embeddedField','passwordPreview'],'documentLayout');
 for(const field of noteFields)if(document.documentLayout[field]!==null)text(document.documentLayout[field],field);
 for(const field of ['embeddedField','passwordPreview'])if(typeof document.documentLayout[field]!=='boolean')fail('Invalid preview selection');
 return document;
}
export function nextDocument(saved,proposal,options){
 const inherited=nextPasswordDocument(saved,proposal,options);
 const next=canonical({...inherited,documentLayout:proposal.documentLayout,revision:proposal.baseRevision+1});
 if(saved&&same({...next,revision:saved.revision},saved))next.revision=saved.revision;
 return next;
}
export function documentGaps(document){
 const labels={visualDirection:'Visual direction',spacingLayout:'App-wide spacing and layout',shapeSurfaces:'App-wide shape and surfaces',sharedStates:'Shared state treatments'};
 return noteFields.filter(field=>document.documentLayout[field]===null).map(field=>({field,description:labels[field]+' is not specified.'}));
}
export function documentDefaults(document){return passwordDefaults(document);}
export function documentDrawings(document){
 const c=document.password,m=passwordMetrics(document);
 const images=document.documentLayout.passwordPreview?passwordDrawings(document):iconDrawings(document);
 if(document.documentLayout.embeddedField)for(const width of c.widths)images.set('design-language/specimens/field-'+c.id+'-'+width+'.svg',passwordSvg(document,c,m,width,{basic:true}));
 return images;
}

/** Reuse existing generated tables while arranging them by design topic, not implementation slice. */
function sections(block){
 const result=new Map();
 for(const piece of block.split('\n## ').slice(1)){
  const newline=piece.indexOf('\n');result.set(piece.slice(0,newline),piece.slice(newline+1).replace('<!-- refine-design:design-language:end -->','').trim());
 }
 return result;
}
export function documentBlock(document){
 const c=document.password,m=passwordMetrics(document),layout=document.documentLayout;
 const foundations=sections(iconBlock(document));
 const row=values=>'| '+values.map(value=>markdown(String(value))).join(' | ')+' |';
 const note=(field,missing)=>layout[field]===null?'**Unspecified:** '+missing:'Proposed direction: '+markdown(layout[field]);
 const typography=foundations.get('Typography').split('### Missing Typography Requirements')[0].trim();
 const icons=foundations.get('Reusable Component Icons').split('### Missing Icon Choices')[0].trim();
 const lines=['<!-- refine-design:design-language:start -->','# Design Language','',
 'Revision: '+document.revision+'. Living design document; incomplete decisions remain visible.','',
 'Source: **'+markdown(document.source.kind)+'** — '+markdown(document.source.description),'',
 '## Visual Direction','',note('visualDirection','App identity, tone and density have not been selected.'),'',
 '## Typography','',typography,'',
 '## Colors And Theme',''];
 for(const [heading,body] of foundations)if(heading.startsWith('Brand Palette:')||heading.startsWith('Application Theme:'))lines.push('### '+heading,'',body,'');
 lines.push('### Color Uses','',foundations.get('Intended Uses'),'',
 '## Spacing And Layout','',note('spacingLayout','The app-wide spacing scale and layout conventions have not been specified.'),'',
 'The following are component example metrics, not an accepted global spacing system.','',
 '| Example metric | Rendered value | Status |','| --- | --- | --- |');
 for(const field of ['fieldHeight','paddingX','adornmentSize','iconGap','supportInset','supportGap','ruleGap','ruleIconGap'])lines.push(row([field,m[field]+'px',c.metrics[field]===null?'Unspecified (default)':c.status==='accepted'?'accepted':'proposed']));
 lines.push('','## Shape And Surfaces','',note('shapeSurfaces','App-wide border, corner and elevation conventions remain to be selected.'),'',
 'Current component example: radius '+m.radius+'px; border '+m.borderWidth+'px. Surface role: '+markdown(c.colors.surface)+'. Border role: '+markdown(c.colors.border)+'. These references retain their existing proposal/default status.','',
 '## Iconography','',icons,'',
 '## Basic Component Examples','',
 'The accepted initial vocabulary is buttons, an ordinary text field and a select/dropdown. Examples demonstrate shared styling; their inclusion is independent of renderer capabilities.','',
 '| Example | Current coverage |','| --- | --- |',
 '| Button styles, including icon button | Standalone specimens not rendered yet; styles remain to be designed. |',
 '| Ordinary text field, label, helper and error treatment | Generic specimen and error treatment not rendered yet. |',
 '| Text field with an embedded button | '+(layout.embeddedField?'Password visibility example shown below; detailed password requirements excluded.':'Preview omitted for this document.')+' |',
 '| Select/dropdown | Specimen not rendered yet; styling remains to be designed. |','',
 'Checkbox, radio and switch examples can be added when relevant.','');
 if(layout.embeddedField){
  lines.push('### Text Field With An Embedded Button','',
   'A masked password field illustrates the embedded icon-button treatment. These widths are review examples, not prescribed dimensions for future comps.','',
   'Typography: '+markdown(c.typography.body)+' (value), '+markdown(c.typography.label)+' (label). Icon: '+markdown(c.icons.hidden)+'. Helper/rule behavior belongs to the optional detailed preview or the relevant comp.','');
  for(const width of c.widths)lines.push('![Embedded-button field at '+width+'px](./design-language/specimens/field-'+c.id+'-'+width+'.svg)','');
 }
 lines.push('## Shared States','',note('sharedStates','Shared focus, hover/pressed, disabled, selected and error treatments are not yet specified.'),'',
 'Current field images show only a populated, masked default state. They do not establish focus, error or disabled styling.','');
 if(layout.passwordPreview){
  lines.push('## Optional Component Preview','',
   'Password-specific helper text and requirement outcomes are illustrative test content, not global design-language requirements or an app password policy.','',
   'Helper: '+markdown(c.helperText),'',...c.rules.map(r=>'- '+(r.passed?'Met: ':'Not met: ')+markdown(r.text)),'');
  for(const width of c.widths)lines.push('![Detailed password preview at '+width+'px](./design-language/specimens/component-'+c.id+'-'+width+'.svg)','');
 }
 lines.push('## Decisions And Gaps','','The document structure and initial example vocabulary are owner-accepted. Individual values retain their separate statuses. A successful preview does not accept a design choice.','',
 '### Missing Requirements And Defaults','','| Target | Missing decision | Rendered default | Source | Owner |','| --- | --- | --- | --- | --- |');
 const requirements=document.unspecifiedRequirements.filter(requirement=>ownsFoundation(document,requirement.target));
 for(const requirement of requirements)lines.push(row([requirement.target,requirement.description,requirement.renderFallback.value,requirement.renderFallback.source,requirement.decisionOwner]));
 if(!requirements.length)lines.push('| — | No value defaults recorded | — | — | — |');
 lines.push('','Unresolved values remain in the source even when their optional preview is hidden.','');
 for(const gap of documentGaps(document))lines.push('- '+markdown(gap.description));
 lines.push('- Renderer gaps: standalone button styles, generic text-field/error specimens and select/dropdown specimens remain unimplemented.','',
 '### Recorded Owner Decisions','');
 const decisions=document.decisions.filter(decision=>ownsFoundation(document,decision.target));
 lines.push(...(decisions.length?decisions.map(d=>'- '+markdown(d.target)+' (revision '+d.revision+'): '+markdown(d.reason)):['No individual design-value acceptance decisions recorded.']),'',
 '## Open Questions','');
 lines.push(...(document.openQuestions.length?document.openQuestions.map(q=>'- '+markdown(q)):['No additional questions recorded.']));
 lines.push(...documentGaps(document).map(g=>'- Resolve: '+markdown(g.description)), '',
 '<!-- refine-design:design-language:end -->');
 return lines.join('\n');
}
