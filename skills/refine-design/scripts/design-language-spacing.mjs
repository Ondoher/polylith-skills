import {objectWithKeys,fail} from './design-language-support.mjs';
const root='design-language/specimens/';
export function validateSpacing(s){
 objectWithKeys(s,['scale','groupGap','regionPadding','regionGap','status','fieldGap','helperGap','helperLineHeight'],'spacing');
 if(s.status!=='defaulted')fail('Current spacing values must be defaulted');
 if(!Array.isArray(s.scale)||s.scale.length<2||s.scale.length>8||s.scale.some((v,i)=>!Number.isInteger(v)||v<1||v>64||(i&&v<=s.scale[i-1])))fail('Spacing scale must increase, with two to eight integer values from 1 to 64');
 for(const key of ['groupGap','regionPadding','regionGap'])if(!s.scale.includes(s[key]))fail('Spacing use must reference a scale value');
 for(const key of ['fieldGap','helperGap'])if(!s.scale.includes(s[key]))fail('Vertical spacing must reference the scale');
 if(!Number.isInteger(s.helperLineHeight)||s.helperLineHeight<16||s.helperLineHeight>32)fail('Invalid helper line height');
 return s;
}
const text=(x,y,value,cls='label')=>`<text class="${cls}" x="${x}" y="${y}">${value}</text>`;
function svg(title,width,height,body,s){return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">Proposed spacing in CSS pixels. Annotation colors are diagram notation, not app theme choices. ${s.scale.join(', ')} pixel scale; ${s.groupGap} pixel control gap, ${s.regionPadding} pixel region padding and ${s.regionGap} pixel region gap.</desc><metadata>${JSON.stringify(s)}</metadata><style>.paper{fill:#fff}.label{font:14px Arial,sans-serif;fill:#263238}.title{font:bold 18px Arial,sans-serif;fill:#172B4D}.small{font:12px Arial,sans-serif;fill:#52616B}.bar{fill:#DCEBFF;stroke:#1565C0;stroke-width:1}.region{fill:#F7F9FC;stroke:#A5B1C2;stroke-width:1}.control{fill:#fff;stroke:#52616B;stroke-width:1}.measure{fill:none;stroke:#1565C0;stroke-width:1}.highlight{fill:#DCEBFF}.guide{fill:none;stroke:#A5B1C2;stroke-dasharray:3 3}</style><rect class="paper" width="100%" height="100%"/>${body}</svg>\n`;}
function measure(x1,x2,y){return `<path class="measure" d="M${x1} ${y-4}v8 M${x1} ${y}H${x2} M${x2} ${y-4}v8"/>`;}
export function spacingDrawings(config){
 if(config===null||config===undefined)return new Map();
 if(config.version!==7)fail('Unsupported review layout version; expected 7');
 const s=config.spacing;validateSpacing(s);
 let scale=text(24,32,'Spacing scale','title')+text(24,55,'Proposed values | Bars shown at 4x for comparison','small');
 s.scale.forEach((v,i)=>{const y=84+i*38;scale+=text(24,y+16,v+' px')+`<rect class="bar" x="104" y="${y}" width="${v*4}" height="20"/>`;});
 scale+=text(24,100+s.scale.length*38,'Use the same steps consistently; roles below are initial proposals.','small');
 return new Map([[root+'spacing-scale.svg',svg('Proposed spacing scale',560,124+s.scale.length*38,scale,s)],[root+'spacing-context.svg',verticalSpacing(s,true)]]);
}

/** Measure between complete logical inputs, including helper line boxes. */
export function verticalSpacingLayout(s,withHelper){
 const labelHeight=16,inputHeight=40,firstLabelY=144,inputY=firstLabelY+labelHeight+s.groupGap;
 const helperY=inputY+inputHeight+s.helperGap;
 const firstEnd=withHelper?helperY+s.helperLineHeight:inputY+inputHeight;
 const secondLabelY=firstEnd+s.fieldGap,secondInputY=secondLabelY+labelHeight+s.groupGap;
 const secondHelperY=secondInputY+inputHeight+s.helperGap;
 const bottom=withHelper?secondHelperY+2*s.helperLineHeight:secondInputY+inputHeight;
 return {labelHeight,inputHeight,firstLabelY,inputY,helperY,firstEnd,secondLabelY,secondInputY,secondHelperY,bottom};
}
function verticalSpacing(s,includeHorizontal=false){
 const left=verticalSpacingLayout(s,false),right=verticalSpacingLayout(s,true),verticalEnd=right.bottom+112,height=verticalEnd+(includeHorizontal?176:0);
 let body=text(24,32,'Vertical spacing between fields','title')+text(24,56,'Proposed values | Dimensions in CSS pixels | Illustrative fields, not an app comp','small');
 body+=text(24,82,`Field gap ${s.fieldGap}px  |  Helper gap ${s.helperGap}px  |  Helper line height ${s.helperLineHeight}px`,'label');
 const dimension=(x,a,b,value)=>`<path class="measure" d="M${x-4} ${a}h8 M${x} ${a}V${b} M${x-4} ${b}h8"/>`+text(x+10,(a+b)/2+4,value,'small');
 for(const [i,l] of [left,right].entries()){
 const panelX=24+i*392,x=panelX+16,w=212,mx=x+w+18;
 body+=text(panelX,118,i?'With helper text':'Without helper text','title');
 body+=`<rect class="region" x="${panelX}" y="132" width="368" height="${right.bottom-116}" rx="4"/>`;
 for(const [j,ly,iy] of [[0,l.firstLabelY,l.inputY],[1,l.secondLabelY,l.secondInputY]]){
 body+=text(x,ly+12,'Field '+(j+1),'small')+`<rect class="control" x="${x}" y="${iy}" width="${w}" height="40" rx="4"/>`+text(x+12,iy+25,j?'Another value':'Example value','label');
 }
 body+=`<rect class="highlight" x="${x}" y="${l.firstEnd}" width="${w}" height="${s.fieldGap}"/>`+dimension(mx,l.firstEnd,l.secondLabelY,s.fieldGap+'px');
 if(i){
 body+=`<rect class="highlight" x="${x}" y="${l.inputY+40}" width="${w}" height="${s.helperGap}"/>`+dimension(mx,l.inputY+40,l.helperY,s.helperGap+'px');
 body+=`<rect class="guide" x="${x}" y="${l.helperY}" width="${w}" height="${s.helperLineHeight}"/>`+text(x,l.helperY+14,'A short hint for this field.','small');
 body+=text(x,l.secondHelperY+14,'This hint wraps onto','small')+text(x,l.secondHelperY+s.helperLineHeight+14,'a second line.','small');
 body+=text(panelX,right.bottom+42,'Measure after the helper line box.','small');
 }else body+=text(panelX,right.bottom+42,'Measure after the input border.','small');
 }
 body+=text(24,verticalEnd-32,'Helper text belongs to its field. Wrapped lines increase the block height; the field gap stays the same.','small');
 body+=text(24,verticalEnd-12,'Blue marks measured space. Dashed outlines show line boxes, not UI styling.','small');
 if(!includeHorizontal)return svg('Vertical field spacing with and without helper text',808,height,body,s);
 const hy=verticalEnd+52,hx=24,p=s.regionPadding,g=s.groupGap,cw=88,ch=32;
 body+=text(24,verticalEnd+24,'Horizontal spacing within a control group','title');
 body+=`<rect class="region" x="${hx}" y="${hy}" width="${3*cw+2*g+2*p}" height="${ch+2*p}" rx="4"/>`;
 body+=`<rect class="highlight" x="${hx}" y="${hy}" width="${p}" height="${ch+2*p}"/>`;
 for(let i=0;i<3;i++){const x=hx+p+i*(cw+g);body+=`<rect class="control" x="${x}" y="${hy+p}" width="${cw}" height="${ch}" rx="4"/>`+text(x+12,hy+p+21,'Action '+(i+1),'small');}
 const gx=hx+p+cw;
 body+=`<rect class="highlight" x="${gx}" y="${hy+p}" width="${g}" height="${ch}"/>`+measure(gx,gx+g,hy+p+ch+12)+text(gx-2,hy+p+ch+31,g+'px','small');
 body+=measure(hx,hx+p,hy-10)+text(hx+3*cw+2*g+2*p+24,hy+22,p+'px region padding','small')+text(hx+3*cw+2*g+2*p+24,hy+44,g+'px between related controls','small');
 return svg('Horizontal and vertical spacing, with and without helper text',808,height,body,s);
}
