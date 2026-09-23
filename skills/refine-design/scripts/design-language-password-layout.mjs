import {fail} from './design-language-support.mjs';
import {loadFont} from './design-language-fonts.mjs';
import {resolvedType} from './design-language-typography.mjs';
import {resolveThemeValue} from './design-language-theme.mjs';
import {iconGeometry} from './design-language-icons.mjs';

export const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const n=value=>Number(value.toFixed(4));

/** Font-shaped text in CSS-pixel line boxes; bounded Latin/LTR wrapping by words. */
export function textEngine(metrics) {
 const {font}=loadFont(metrics.fontId,metrics.weight),scale=metrics.sizePx/font.unitsPerEm;
 const baseline=(metrics.lineHeightPx-(font.ascent-font.descent)*scale)/2+font.ascent*scale;
 function shape(value) {
  for(const character of value)if(!font.hasGlyphForCodePoint(character.codePointAt(0)))fail('Missing specimen glyph: '+character);
  const run=font.layout(value);if(run.direction!=='ltr'||run.glyphs.some(g=>g.id===0))fail('Unsupported component text');
  let x=0,minX=0,maxX=0;
  const paths=run.glyphs.map((glyph,i)=>{
   const p=run.positions[i],gx=x+p.xOffset*scale,gy=baseline-p.yOffset*scale;
   x+=p.xAdvance*scale;
   if(Number.isFinite(glyph.bbox.minX)){minX=Math.min(minX,gx+glyph.bbox.minX*scale);maxX=Math.max(maxX,gx+glyph.bbox.maxX*scale);}
   return '<path transform="translate('+n(gx)+' '+n(gy)+') scale('+scale+' '+-scale+')" d="'+glyph.path.toSVG()+'"/>';
  });
  return {width:Math.max(x,maxX)-minX,svg:'<g transform="translate('+n(-minX)+' 0)">'+paths.join('')+'</g>'};
 }
 function wrap(value,width) {
  if(width<=0)fail('No room for component text');
  const words=value.trim().split(/\s+/),lines=[];let current='';
  for(const word of words){
   if(shape(word).width>width)fail('Word exceeds available component width: '+word);
   const next=current?current+' '+word:word;
   if(current&&shape(next).width>width){lines.push(current);current=word;}else current=next;
  }
  if(current)lines.push(current);
  if(lines.length>12)fail('Component text exceeds twelve lines');
  return lines;
 }
 return {metrics,shape,wrap};
}

/** Resolve geometry once; rendering and annotations consume the same measurements. */
export function passwordLayout(document,component,metrics,width) {
 const type=id=>document.typography.roles.find(role=>role.id===id);
 const engines=Object.fromEntries(Object.entries(component.typography).map(([key,id])=>[key,textEngine(resolvedType(document,type(id)))]));
 const icon=key=>document.icons.find(item=>item.id===component.icons[key]);
 const visibility=icon('hidden');
 if(visibility.sizePx>metrics.adornmentSize||metrics.adornmentSize>metrics.fieldHeight)fail('Adornment must fit the field and icon');
 if(metrics.radius>metrics.fieldHeight/2)fail("Radius cannot exceed half the field height");
 const fieldY=Math.max(44,36+engines.label.metrics.lineHeightPx/2),fieldX=16;
 const inputWidth=width-2*metrics.paddingX-metrics.adornmentSize-metrics.iconGap;
 const masked='•'.repeat(component.maskedLength);
 if(engines.body.shape(masked).width>inputWidth||engines.body.metrics.lineHeightPx>metrics.fieldHeight)fail('Masked content does not fit field');
 const labelWidth=engines.label.shape(component.label).width;
 if(labelWidth+2*metrics.paddingX+8>width)fail('Label exceeds field width');
 let cursor=fieldY+metrics.fieldHeight+metrics.supportGap;
 const textWidth=width-2*metrics.supportInset;
 const helperLines=engines.support.wrap(component.helperText,textWidth);
 const helper={x:fieldX+metrics.supportInset,y:cursor,width:textWidth,lines:helperLines};
 cursor+=helperLines.length*engines.support.metrics.lineHeightPx+metrics.supportGap;
 const rules=component.rules.map(rule=>{
  const entry=icon(rule.passed?'pass':'fail');
  const available=textWidth-entry.sizePx-metrics.ruleIconGap;
  const lines=engines.support.wrap(rule.text,available);
  const height=Math.max(entry.sizePx,lines.length*engines.support.metrics.lineHeightPx);
  const result={...rule,icon:entry,x:fieldX+metrics.supportInset,y:cursor,width:available,lines,height};
  cursor+=height+metrics.ruleGap;return result;
 });
 cursor-=metrics.ruleGap;
 return {width,fieldX,fieldY,inputWidth,masked,labelWidth,helper,rules,engines,
  componentBottom:cursor,visibility,metrics};
}

export function passwordSvg(document,component,metrics,width,{basic=false}={}) {
 const layout=passwordLayout(document,component,metrics,width),{fieldX:x,fieldY:y,engines}=layout;
 const color=id=>resolveThemeValue(document,'role:'+id).value;
 const iconDraw=(entry,ix,iy,key)=>{
  const geometry=iconGeometry(entry);if(!geometry)fail('Password specimen requires selected icon assets');
  return '<g class="icon-'+key+'" transform="translate('+ix+' '+iy+') scale('+entry.sizePx/24+')">'+geometry.paths.map(p=>'<path d="'+xml(p.d)+'" opacity="'+p.opacity+'"/>').join('')+'</g>';
 };
 const textDraw=(engine,lines,tx,ty,css)=>'<g class="'+css+'" transform="translate('+tx+' '+ty+')">'+lines.map((line,i)=>'<g data-line="'+i+'" transform="translate(0 '+i*engine.metrics.lineHeightPx+')">'+engine.shape(line).svg+'</g>').join('')+'</g>';
 const annotation=textEngine({fontId:'roboto',sizePx:12,weight:400,lineHeightPx:18});
 const notes=['Field '+metrics.fieldHeight+'px; radius '+metrics.radius+'px; border '+metrics.borderWidth+'px.',
 'Padding '+metrics.paddingX+'px; icon '+layout.visibility.sizePx+'px; adornment '+metrics.adornmentSize+'px; gap '+metrics.iconGap+'px.',
 'Support inset '+metrics.supportInset+'px; gap '+metrics.supportGap+'px; rule gap '+metrics.ruleGap+'px; rule icon gap '+metrics.ruleIconGap+'px.'];
 const annotationLines=(basic?notes.slice(0,2):notes).flatMap(line=>annotation.wrap(line,width));
 const notesY=(basic?y+metrics.fieldHeight:layout.componentBottom)+24,height=Math.ceil(notesY+annotationLines.length*18+16);
 if(height>1600)fail('Component specimen exceeds height limit');
 const bodyRole=document.typography.roles.find(t=>t.id===component.typography.body);
 const labelRole=document.typography.roles.find(t=>t.id===component.typography.label);
 const supportRole=document.typography.roles.find(t=>t.id===component.typography.support);
 const styles=[
 '.surface{fill:'+color(component.colors.surface)+'}',
 '.field{fill:'+color(component.colors.surface)+';stroke:'+color(component.colors.border)+';stroke-width:'+metrics.borderWidth+'}',
 '.body{fill:'+color(bodyRole.colorRole)+'}', '.label{fill:'+color(labelRole.colorRole)+'}', '.support{fill:'+color(supportRole.colorRole)+'}',
 '.annotation{fill:#525252}', '.dimension{fill:none;stroke:#767676;stroke-width:1}',
 '.icon-hidden{fill:'+color(layout.visibility.colorRole)+'}',
 ...layout.rules.map((rule,i)=>'.icon-rule-'+i+'{fill:'+color(rule.icon.colorRole)+'}')
 ].join('');
 const labelY=y-engines.label.metrics.lineHeightPx/2;
 const content=[
 '<style>'+styles+'</style><rect class="surface" width="100%" height="100%"/>',
 '<path class="dimension" d="M'+x+' 18h'+width+' M'+x+' 14v8 M'+(x+width)+' 14v8"/>',
 textDraw(annotation,[width+'px'],x+width/2-annotation.shape(width+'px').width/2,22,'annotation'),
 '<rect class="field" x="'+x+'" y="'+y+'" width="'+width+'" height="'+metrics.fieldHeight+'" rx="'+metrics.radius+'"/>',
 '<rect class="surface" x="'+(x+metrics.paddingX-4)+'" y="'+labelY+'" width="'+(layout.labelWidth+8)+'" height="'+engines.label.metrics.lineHeightPx+'"/>',
 textDraw(engines.label,[component.label],x+metrics.paddingX,labelY,'label'),
 textDraw(engines.body,[layout.masked],x+metrics.paddingX,y+(metrics.fieldHeight-engines.body.metrics.lineHeightPx)/2,'body'),
 iconDraw(layout.visibility,x+width-metrics.paddingX-(metrics.adornmentSize+layout.visibility.sizePx)/2,y+(metrics.fieldHeight-layout.visibility.sizePx)/2,'hidden'),
 ...(basic?[]:[textDraw(engines.support,layout.helper.lines,layout.helper.x,layout.helper.y,'support')]),
 ...(basic?[]:layout.rules).flatMap((rule,i)=>[iconDraw(rule.icon,rule.x,rule.y+(engines.support.metrics.lineHeightPx-rule.icon.sizePx)/2,'rule-'+i),
 textDraw(engines.support,rule.lines,rule.x+rule.icon.sizePx+metrics.ruleIconGap,rule.y,'support')]),
 textDraw(annotation,annotationLines,x,notesY,'annotation')
 ];
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+(width+32)+'" height="'+height+'" viewBox="0 0 '+(width+32)+' '+height+'" role="img" aria-labelledby="title desc"><title id="title">'+xml(component.label+' component — '+width+'px')+'</title><desc id="desc">'+xml(basic?'Text field with an embedded visibility button; masked synthetic value.':'Masked synthetic value. '+component.helperText+' '+component.rules.map(r=>(r.passed?'Met: ':'Not met: ')+r.text).join(' '))+'</desc><metadata>'+xml(JSON.stringify({template:component.template,width,metrics,helperLines:basic?[]:layout.helper.lines,ruleLines:basic?[]:layout.rules.map(r=>r.lines)}))+'</metadata>'+content.join('\n')+'</svg>\n';
}
