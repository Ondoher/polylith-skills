import {objectWithKeys,fail} from './design-language-support.mjs';
import {resolvedType} from './design-language-typography.mjs';
import {fontCatalog} from './design-language-fonts.mjs';
import {textEngine,xml} from './design-language-password-layout.mjs';
const prefix='design-language/specimens/';
export function validateLayout(l){
 objectWithKeys(l,['version','status','fieldHeight','fieldPaddingX','buttonHeight','buttonPaddingX','labelGap','dialogWidth','typeRoles'],'layout defaults');
 if(l.version!==1||l.status!=='defaulted')fail('Unsupported layout defaults');
 for(const k of ['fieldHeight','fieldPaddingX','buttonHeight','buttonPaddingX','labelGap','dialogWidth'])if(!Number.isInteger(l[k])||l[k]<1||l[k]>(k==='dialogWidth'?640:80))fail('Invalid layout dimension: '+k);
 if(l.dialogWidth<360)fail('Dialog specimen is too narrow');
 objectWithKeys(l.typeRoles,['heading','body','label','supporting','button'],'layout type roles');
 for(const id of Object.values(l.typeRoles))if(typeof id!=='string'||!/^[a-z][a-z0-9-]*$/.test(id))fail('Invalid layout typography reference');
}
export function layoutModel(d,c){
 if(c?.version!==7)fail('Unsupported review layout version; expected 7');
 validateLayout(c.layout);const l=c.layout,s=c.spacing;
 if(!s||!Object.hasOwn(s,'fieldGap'))fail('Layout requires vertical spacing');
 const types=Object.fromEntries(Object.entries(l.typeRoles).map(([key,id])=>{const role=d.typography.roles.find(r=>r.id===id);if(!role)fail('Missing layout type role: '+id);return [key,resolvedType(d,role)];}));
 const engines=Object.fromEntries(Object.entries(types).map(([k,t])=>[k,textEngine(t)]));
 if(types.body.lineHeightPx>l.fieldHeight-8||types.button.lineHeightPx>l.buttonHeight-8)fail('Layout text needs larger component height');
 const field=(y,helperLines=0)=>{const input=y+types.label.lineHeightPx+l.labelGap,helper=input+l.fieldHeight+s.helperGap;return {label:y,input,helper,end:helperLines?helper+helperLines*types.supporting.lineHeightPx:input+l.fieldHeight};};
 return {l,s,types,engines,field};
}
const note=(x,y,t)=>`<text x="${x}" y="${y}" class="note">${xml(t)}</text>`;
const rect=(x,y,w,h,cls='box')=>`<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const line=(x,y,x2,y2)=>`<path class="measure" d="M${x} ${y}L${x2} ${y2}"/>`;
function vertical(x,a,b,label){return line(x,a,x,b)+line(x-3,a,x+3,a)+line(x-3,b,x+3,b)+note(x+8,(a+b)/2+4,label);}
function horizontal(a,b,y,label){return line(a,y,b,y)+line(a,y-3,a,y+3)+line(b,y-3,b,y+3)+note(a,y-8,label);}
function drawText(m,key,value,x,y){return `<g fill="#263238" transform="translate(${x} ${y})">${m.engines[key].shape(value).svg}</g>`;}
function sheet(title,w,h,body,m){return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${xml(title)}</title><desc id="desc">Current editable design layout. One SVG unit equals one CSS pixel. Outlined text uses resolved app fonts. Blue marks line boxes and measurements, not app colors.</desc><metadata>${xml(JSON.stringify({layout:m.l,spacing:m.s,typography:m.types}))}</metadata><style>.box{fill:#fff;stroke:#89949b}.guide{fill:none;stroke:#1976d2;stroke-dasharray:3 3}.measure{fill:none;stroke:#1976d2}.note{font:12px Arial,sans-serif;fill:#405569}</style><rect width="100%" height="100%" fill="white"/>${body}</svg>\n`;}
function fieldDrawing(m,x,y,w,label,value,helpers=[]){
 const f=m.field(y,helpers.length),{l,types}=m;
 let b=drawText(m,'label',label,x,y)+rect(x,f.input,w,l.fieldHeight)+drawText(m,'body',value,x+l.fieldPaddingX,f.input+(l.fieldHeight-types.body.lineHeightPx)/2);
 helpers.forEach((t,i)=>b+=drawText(m,'supporting',t,x,f.helper+i*types.supporting.lineHeightPx));
 return {body:b,...f};
}
function button(m,x,y,label){const w=Math.ceil(m.engines.button.shape(label).width)+2*m.l.buttonPaddingX;return {w,body:rect(x,y,w,m.l.buttonHeight)+drawText(m,'button',label,x+m.l.buttonPaddingX,y+(m.l.buttonHeight-m.types.button.lineHeightPx)/2)};}
export function layoutDrawings(d,c){
 if(c===null||c===undefined)return new Map();
 if(c.version!==7)fail('Unsupported review layout version; expected 7');
 const m=layoutModel(d,c),{l,s,types}=m;
 let a=note(24,28,'ELEMENTS | Typography and spacing | Editable defaults');
 a+=drawText(m,'heading','Section heading',32,56)+rect(32,56,280,types.heading.lineHeightPx,'guide');
 a+=note(360,74,`Heading: ${types.heading.sizePx}px / ${types.heading.lineHeightPx}px; weight ${types.heading.weight}`);
 const by=56+types.heading.lineHeightPx+s.groupGap;
 a+=drawText(m,'body','Related explanatory text.',32,by)+rect(32,by,280,types.body.lineHeightPx,'guide');
 a+=note(360,by+16,`Body: ${types.body.sizePx}px / ${types.body.lineHeightPx}px; ${s.groupGap}px after heading`);
 const f=fieldDrawing(m,32,164,280,'Field label','Example value',['Helper or error message.']);a+=f.body;
 a+=rect(32,164,280,types.label.lineHeightPx,'guide')+rect(32,f.helper,280,types.supporting.lineHeightPx,'guide');
 a+=note(360,176,`Label: ${types.label.sizePx}px / ${types.label.lineHeightPx}px; weight ${types.label.weight}`);
 a+=vertical(332,164+types.label.lineHeightPx,f.input,`${l.labelGap}px label gap`);
 a+=note(360,f.input+28,`Field: ${l.fieldHeight}px minimum; ${l.fieldPaddingX}px horizontal inset`);
 a+=note(360,f.helper+12,`Message: ${types.supporting.sizePx}px / ${types.supporting.lineHeightPx}px; ${s.helperGap}px gap`);
 const next=f.end+s.fieldGap;a+=vertical(332,f.end,next,`${s.fieldGap}px`)+fieldDrawing(m,32,next,280,'Next field','Without helper text').body;
 const actionY=next+types.label.lineHeightPx+l.labelGap+l.fieldHeight+56;
 const b=button(m,32,actionY,'Action');a+=b.body+horizontal(32,32+l.buttonPaddingX,actionY-10,`${l.buttonPaddingX}px`);
 a+=note(360,actionY+15,`Button: ${l.buttonHeight}px minimum; centered line box`)+note(360,actionY+35,`Type: ${types.button.sizePx}px / ${types.button.lineHeightPx}px; weight ${types.button.weight}`);
 a+=note(24,actionY+l.buttonHeight+36,'Dashed boxes are text line boxes. Fields without messages end at the input border.');
 const x=32,y=68,w=l.dialogWidth,p=s.regionPadding,inner=x+p,content=w-2*p,mx=x+w+16;
 let body=note(24,28,'COMPOSITION | Illustrative dialog, not an approved app screen');
 const titleY=y+p,descY=titleY+types.heading.lineHeightPx+s.groupGap,firstY=descY+types.body.lineHeightPx+s.regionGap;
 const first=fieldDrawing(m,inner,firstY,content,'Name','Example item',['A short hint about the value.']);
 const secondY=first.end+s.fieldGap;
 const second=fieldDrawing(m,inner,secondY,content,'Description','Optional description');
 const actionsY=second.end+s.regionGap;
 const primary=button(m,0,actionsY,'Save'),secondary=button(m,0,actionsY,'Cancel');
 const primaryX=x+w-p-primary.w,secondaryX=primaryX-s.groupGap-secondary.w;
 const bottom=actionsY+l.buttonHeight+p;
 body+=rect(x,y,w,bottom-y)+drawText(m,'heading','Example dialog',inner,titleY)+drawText(m,'body','A short explanation of this task.',inner,descY)+first.body+second.body;
 body+=button(m,secondaryX,actionsY,'Cancel').body+button(m,primaryX,actionsY,'Save').body;
 body+=horizontal(x,inner,y-10,`${p}px padding`)+vertical(mx,descY+types.body.lineHeightPx,firstY,`${s.regionGap}px section gap`)+vertical(mx,first.end,secondY,`${s.fieldGap}px field gap`)+vertical(mx,second.end,actionsY,`${s.regionGap}px action separation`);
 body+=horizontal(secondaryX+secondary.w,primaryX,actionsY+l.buttonHeight+30,`${s.groupGap}px action gap`);
 const gy=bottom+76,col=(content-s.groupGap)/2;
 body+=note(24,gy,'LOCAL GRID | Related short fields may share a row');
 body+=fieldDrawing(m,inner,gy+24,col,'Start','00:00').body+fieldDrawing(m,inner+col+s.groupGap,gy+24,col,'End','00:10').body;
 body+=note(mx,gy+50,`${s.groupGap}px column gap`)+note(mx,gy+70,'Stack when space is limited.');
 body+=note(24,gy+124,'Wrapped messages extend their field block; shared messages follow the whole input group.');
 return new Map([[prefix+'layout-elements.svg',sheet('Element spacing and typography',800,actionY+l.buttonHeight+60,a,m)],[prefix+'layout-composition.svg',sheet('Form grid and dialog layout',800,gy+150,body,m)]]);
}
export function layoutContent(d,c){
 const {l,s,types}=layoutModel(d,c);
 const typeRows=Object.entries(types).map(([name,t])=>`| ${name} | ${fontCatalog.find(f=>f.id===t.fontId).family} | ${t.sizePx} / ${t.lineHeightPx}px | ${t.weight} |`);
 return ['# Layout','', '[Design language](./design-language.md)','','Spacing and typography in one place. Representative patterns establish the defaults; the component reference covers visual appearance and color/state variations. These are current editable design choices, not open questions or claimed MUI defaults.','','## Elements','','![Element spacing and typography](./design-language/specimens/layout-elements.svg)','','| Role | Family | Size / line height | Weight |','| --- | --- | --- | --- |',...typeRows,'','Typography resolves from the [shared type definitions](./typography.md); label and button mappings are current working choices. Measurements use line boxes and borders, not glyph edges.','','## Forms, Grids And Dialogs','','![Combined dialog and local grid](./design-language/specimens/layout-composition.svg)','','| Relationship | Default |','| --- | --- |',`| Spacing scale | ${s.scale.join(', ')}px |`,`| Related items / columns | ${s.groupGap}px |`,`| Label to input | ${l.labelGap}px |`,`| Field to helper/error | ${s.helperGap}px |`,`| Between complete inputs | ${s.fieldGap}px after the last message line, or input border |`,`| Container padding | ${s.regionPadding}px |`,`| Separate sections / content to actions | ${s.regionGap}px |`,`| Field | ${l.fieldHeight}px starting minimum; ${l.fieldPaddingX}px horizontal inset |`,`| Button | ${l.buttonHeight}px starting minimum; ${l.buttonPaddingX}px horizontal padding; content-sized width |`,`| Dialog specimen | ${l.dialogWidth}px illustrative width, not an app-wide limit |`,'','## Arrangement Rules','','- Align headings, content and field groups to shared edges. Related items use smaller gaps than separate sections.','- Use Grid for regions and local form columns; small Flexbox action groups are appropriate. Start forms in one column; add columns for meaningful relationships.','- Keep label, input and messages together. Wrapped helpers/errors increase the block height; they do not consume the next-field gap. Composite inputs can share one message region.','- Dialogs use their own aligned title, content and action regions. The example puts secondary before primary at the trailing edge for left-to-right reading.','- Let text and controls grow. Stack columns or wrap action groups when necessary, preserve reading/focus order, and keep actions accessible when content scrolls.','- Initial focus follows dialog purpose: normally the first relevant input; Close for information with no other controls; the designated default for button-only dialogs. Long content or destructive actions require the documented accessibility exceptions.','','## Current Design Defaults','','The saved [review layout](./design-language/review-layout.json) contains the current layout and spacing values. Its top-level version 7 is the review-layout contract; nested `layout.version: 1` versions only the distinct layout-default record. Change these values directly when the design changes; no question or acceptance step is required. Type values remain in the [design source](./design-language/design-language.json). The previous 20px helper-line illustration is superseded here by the current supporting type line height.','','Flexible details include density, type-role mappings, control variants, app-specific dialog widths, responsive thresholds and overflow treatment. Adjust these as relevant surfaces are designed. Product behavior such as whether an error replaces or accompanies help remains a UX decision. No new product dialog or specialized-component interaction is implied.','','Basis: owner-approved document organization and our synthesis of [Atlassian spacing](https://atlassian.design/foundations/spacing), [grid](https://atlassian.design/foundations/grid) and [Carbon spacing](https://carbondesignsystem.com/elements/spacing/overview/). Numeric defaults are ours; annotation colors are not app colors.',''];
}
