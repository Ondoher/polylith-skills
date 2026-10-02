import fs from 'node:fs/promises';
import path from 'node:path';
const here=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/,'$1'));
const inputs='planning/refinement-efficiency/experiments/descriptive-wireframe-ui/inputs';
const read=async n=>JSON.parse(await fs.readFile(`${inputs}/${n}.json`,'utf8'));
const [theme,samples,scenarios,actions]=await Promise.all(['render-theme','samples','scenarios','actions'].map(read));
const px=value=>({unit:'px',value}),fr=value=>({unit:'fr',value}),ct={unit:'content'};
const grid=(columns=[fr(1)],rows=[ct],gap=8,padding=0)=>({mode:'grid',columns,rows,gap,padding,align:'stretch',justify:'start'});
const reg=(id,children,layout=grid(),extra={})=>({id:id.toLowerCase(),kind:'region',label:id,layout,children,...extra});
const comp=(id,type,parameters,state='default',actionRef,extra={})=>({id:id.toLowerCase(),kind:'component',templateRef:{id:type,version:'1'},state,parameters,...(actionRef?{actionRef}:{}),...extra});
const txt=(id,text)=>comp(id,'text',{text:text||'No background tasks'});
const head=(id,text)=>comp(id,'heading',{text});
const btn=(id,label,actionRef,state='default',primary=false)=>comp(id,primary?'button':'button-secondary',{label},state,actionRef);
const field=(id,label,value,actionRef,state='default',helperText)=>comp(id,'text-field',{label,value,...(helperText?{helperText}:{})},state,actionRef);
const vis=(id,role,text='',variant='',extra={})=>comp(id,'visual',{role,...(text?{text}:{}),...(variant?{variant}:{})},'default',undefined,extra);
const status=(id,text,state='default')=>comp(id,'status',{text:text||'Ready'},state);
const row=(id,children,cols=children.map(()=>ct),extra={})=>reg(id,children,grid(cols,[ct]),extra);
const place=(node,row,column=1,rowSpan=1,columnSpan=1)=>({...node,placement:{row,column,rowSpan,columnSpan}});
const numeric=(node,start,end,row=1)=>({...node,scalePosition:{start,...(end!==undefined?{end}:{})},placement:{row,column:1}});
const sourceActions=Array.isArray(actions)?actions.map(a=>a.id):Object.keys(actions);
const busyState=s=>s.busy?'disabled':'default';
function media(id,zoom=false){return reg(id,[
 place(vis(`${id}-black`,'surface','','dark'),1,1,6,12),
 place(vis(`${id}-sky`,'surface'),1,1,3,12),
 place(vis(`${id}-water`,'surface','','grid'),4,1,3,12),
 place(vis(`${id}-pier`,'surface','','dark'),3,1,1,7),
 place(vis(`${id}-boat-a`,'item'),4,zoom?5:7,zoom?2:1,zoom?6:3),
 ...(zoom?[]:[place(vis(`${id}-boat-b`,'item'),5,3,1,2)]),
 place(vis(`${id}-mast-a`,'divider'),2,8,3,1),
 ],grid(Array(12).fill(fr(1)),Array(6).fill(fr(1)),0,0));}
function trimPreview(){return reg('TRIM-PREVIEW',[txt('trim-preview-heading','Staged Track 1 result · not committed'),reg('trim-preview-scale',[
 numeric(vis('old-walk','item','Walk →2099'),1200,2100,1),numeric(vis('old-boats','item','Boats 2100–3599'),2100,3600,1),
 numeric(vis('new-walk','item','Walk →2159','selected'),1200,2160,2),numeric(vis('new-boats','item','Boats 2160–3659','selected'),2160,3660,2)
 ],{...grid([fr(1)],[px(26),px(26)],4),scale:{min:1200,max:3660}})],grid([fr(1)],[ct,px(56)],4));}
function player(s){return reg('ED-PLAYER',[
 reg('ED-PLAYER-CONTEXT',[head('player-title','Composed output'),txt('player-state',`Stopped · ${s.timecode??'00:00:00:00'}`),txt('player-resolution','1920 × 1080 · 30 fps'),txt('player-scope',s.range?'Preview: All tracks · 600–1199 inclusive':s.group?'Preview: composed span 1800–2699':s.trim?'Preview: composed span 1200–2099':'Preview: active video · all four tracks'),...(s.trim?[trimPreview()]:[])],grid([fr(1)],Array(s.trim?5:4).fill(ct),8,12)),
 media('player-image',s.zoom),
 reg('ED-PLAYER-VIEW',[head('player-view-title','Player view'),status('player-scale',s.zoom?'200% · pan 100, 40 px':'Fit · complete frame'),row('player-zoom',[btn('zoom-out','−','zoom-player-out',s.zoom?'default':'disabled'),btn('fit-player','Fit','fit-player'),btn('zoom-in','+','zoom-player-in')]),btn('pan-player','Pan player view','pan-player',s.zoom?'default':'disabled'),txt('player-inspection','Temporary visual inspection')],grid([fr(1)],[ct,ct,ct,ct,ct],8,16))
 ],grid([fr(1),px(480),fr(1)],[px(270)],24));}
function timeline(s){
 const min=s.zoom?600:0,max=s.zoom?1500:3600;const rows=[px(22),px(50),px(50),px(50),px(50),px(50)];
 const cells=[];
 cells.push(place(vis('time-label','label',s.zoom?'Frames · 600–1499':'Frames · 0–3599','header'),1));
 const ticks=[];for(let v=min;v<max;v+=(s.zoom?150:600)){ticks.push(numeric(vis(`tick-${v}`,'label',String(v)),v,Math.min(v+(s.zoom?125:400),max)));}
 const ruler=reg('TL-RULER',ticks,{...grid([fr(1)],[px(22)],0),scale:{min,max}});cells.push(place(ruler,1,2));
 cells.push(place(btn('play-preview','▶ Play','play-preview',busyState(s)),2));
 const rangeNodes=[numeric(comp('composed-bg','visual',{role:'surface',variant:'grid',accessibleLabel:'Drag to select a composed range across all four tracks'},busyState(s),'select-range'),min,max)];
 for(let k=0;k<6;k++){const a=min+(max-min)*k/6,b=min+(max-min)*(k+1)/6;rangeNodes.push(numeric(vis(`composed-thumb-${k}`,'thumbnail','','pattern-a'),a,b));}
 if(s.range){rangeNodes.push(numeric(vis('range-highlight','selection'),600,1200));rangeNodes.push(numeric(comp('range-start','visual',{role:'start-handle',accessibleLabel:'Range Start 600'},busyState(s),'set-range-boundary'),600));rangeNodes.push(numeric(comp('range-end','visual',{role:'end-handle',accessibleLabel:'Range End 1199 inclusive'},busyState(s),'set-range-boundary'),1200));}
 if((s.frame??0)>=min&&(s.frame??0)<max)rangeNodes.push(numeric(comp('range-playhead','visual',{role:'indicator',accessibleLabel:`Resolved frame ${s.frame??0}`},busyState(s),'scrub'),s.frame??0));
 cells.push(place(reg('TL-RANGE',rangeNodes,{...grid([fr(1)],[px(50)],0),scale:{min,max}}),2,2));
 samples.tracks.forEach((track,i)=>{
 const active=track.id===(s.active??'track-1');
 cells.push(place(reg(`lane-heading-${track.id}`,[btn(`select-${track.id}`,`${track.name}${track.layer?' · '+track.layer:''}${active?' ●':''}`,'select-track',s.busy?'disabled':active?'selected':'default'),btn(`mute-${track.id}`,s.muted&&track.id==='track-2'?'Unmute':'Mute','mute-track',busyState(s))],grid([fr(1),px(80)],[px(44)],4)),i+3));
 const ns=[numeric(vis(`${track.id}-grid`,'surface','','grid'),min,max)];
 for(const o of track.occurrences){const a=Math.max(o.startFrame,min),b=Math.min(o.endInclusiveFrame+1,max);if(b<=a)continue;const sel=(s.group&&o.id==='group')||(s.trim&&o.id==='walk');let text=`${o.name} · ${o.startFrame}–${o.endInclusiveFrame}`;if(o.id==='label')text='Harbor title';
 ns.push(numeric(comp(`occ-${o.id}`,'visual',{role:'item',text,accessibleLabel:`${o.name}, ${o.startFrame}–${o.endInclusiveFrame} inclusive`,...(sel?{variant:'selected'}:{})},busyState(s),'select-objects'),a,b));
 if(sel){ns.push(numeric(comp(`trim-start-${o.id}`,'visual',{role:'start-handle',accessibleLabel:`${o.name} Start ${o.startFrame}`},busyState(s),'trim-occurrence'),a));ns.push(numeric(comp(`trim-end-${o.id}`,'visual',{role:'end-handle',accessibleLabel:`${o.name} End ${o.endInclusiveFrame}`},busyState(s),'trim-occurrence'),b));}
 }
 if(s.range)ns.push(numeric(vis(`${track.id}-range`,'selection'),600,1200));
 if((s.frame??0)>=min&&(s.frame??0)<max)ns.push(numeric(comp(`${track.id}-playhead`,'visual',{role:'indicator',accessibleLabel:`Resolved frame ${s.frame??0}`},busyState(s),'scrub'),s.frame??0));
 if(s.insertion&&track.id==='track-2'&&1500>=min&&1500<max)ns.push(numeric(vis('insertion-marker','end-handle','', '',{actionRef:'set-insertion'}),1500));
 cells.push(place(reg(`TL-${track.id}`,ns,{...grid([fr(1)],[px(50)],0),scale:{min,max}}),i+3,2));
 });
 return reg('TL-LANES',cells,grid([px(250),fr(1)],rows,4));
}
function properties(s){const tr=s.active==='track-2'?'Track 2':'Track 1';return reg('PROPERTIES',[
 head('track-prop-title',`${tr}${tr==='Track 1'?' · base':''}`),
 txt('output-summary','Output: 0, 0 · 1920 × 1080 px'),
 row('track-audio',[field('track-volume','Track volume (%)',tr==='Track 2'?'60':'100','set-track-volume',busyState(s)),status('track-mute-status',s.muted?'Muted':'Unmuted')],[fr(1),ct]),
 btn('output-rectangle','Output rectangle','edit-track-rectangle',busyState(s)),
 txt('track-support',s.muted?'Stored volume retained. Clip gain: 80%.':'Audio gain combines with clip gain.'),
 ],grid([fr(1)],Array(5).fill(ct),8,12),{surfaceTreatment:'flat'});}
function occurrence(s){return reg('PROP-OCCURRENCE',[head('occurrence-heading',s.group?'Harbor sequence · group':'Pier walk.mp4'),txt('occurrence-details',s.group?'Track 2 · 1800–2699 inclusive · copied from Harbor sequence':'Track 1 · 1200–2099 inclusive · Pier walk.mp4'),btn('source-rect',s.group?samples.longerAppText.sourceRectangle:'Source rectangle','edit-source-rectangle',busyState(s)),txt('source-summary',s.group?'160, 90 · 1600 × 900 source pixels':'0, 0 · 1920 × 1080 source pixels'),row('clip-audio',[field('clip-volume','Clip volume (%)',s.group?'80':'100','set-clip-volume',busyState(s)),btn('mute-clip','Mute clip','mute-clip',busyState(s))],[fr(1),ct])],grid([fr(1)],[ct,ct,ct,ct,ct],8,12),{surfaceTreatment:'flat'});}
function workspace(s={}){return reg('WORKSPACE',[
 row('SH-PROJECT',[head('project-name',samples.project),status('project-save-state',s.projectUnsaved?'Unsaved project changes':'Project saved'),btn('new-project','New','new-project',busyState(s)),btn('open-project','Open','open-project',busyState(s)),btn('save-project','Save Project','save-project',busyState(s)),btn('save-as','Save As','save-project-as',busyState(s))],[fr(1),ct,ct,ct,ct,ct]),
 comp('SH-DESTINATIONS','choice-group',{label:'Workspace',presentation:'tabs',options:['Projects, Sources, and Library','Video Editing','Playback and Playlists','Video Export'].map((label,i)=>({id:'workspace-'+i,label})),selectedId:'workspace-1'},busyState(s),'navigate'),
 player(s),vis('ED-SEPARATOR','divider','','horizontal'),
 row('ED-IDENTITY',[btn('choose-video','New / open video','choose-video',busyState(s)),field('video-name','Video name',samples.video,'name-video',busyState(s)),status('video-draft-state','Unsaved video draft')],[ct,fr(1),ct]),
 row('ED-CONTEXT',[txt('resolved-frame',`Frame ${s.frame??0} · ${s.timecode??'00:00:00:00'}`),txt('selection-summary',s.range?`${s.longSelection?samples.longerAppText.selection:'All tracks'} · 600–1199 inclusive · 600 frames / 20 s`:s.group?'1 group · 1800–2699 inclusive':s.trim?'1 object · 1200–2099 inclusive':'No selection'),btn('insertion-context',s.insertion?'Insertion · Track 2 · frame 1500':'Insertion · Track 1 · Append','set-insertion',busyState(s))],[px(250),fr(1),ct]),
 row('TL-TOOLS',[btn('step-back','−1 frame','step-frame',busyState(s)),btn('step-forward','+1 frame','step-frame',busyState(s)),btn('set-start',s.trim||s.group?'Clip Start':'Range Start',s.trim||s.group?'trim-occurrence':'set-range-boundary',busyState(s)),btn('set-end',s.trim||s.group?'Clip End':'Range End',s.trim||s.group?'trim-occurrence':'set-range-boundary',busyState(s)),btn('clear-selection','Clear selection','clear-selection',s.busy||(!s.range&&!s.group&&!s.trim)?'disabled':'default'),btn('timeline-zoom',s.zoom?'Timeline scale · 600–1499':'Timeline scale · full video','zoom-timeline'),btn('timeline-pan','Pan timeline','pan-timeline'),btn('follow-playhead',s.zoom?'Return to playhead':'Following playhead','follow-playhead',s.zoom&&!s.busy?'default':'disabled')],[ct,ct,ct,ct,ct,fr(1),ct,ct]),
 reg('EDITING-BODY',[timeline(s),properties(s),...(s.group||s.trim?[occurrence(s)]:[])],grid(s.group||s.trim?[fr(1),px(224),px(320)]:[fr(1),px(320)],[px(292)],16)),
 row('ED-COMMANDS',[btn('add-timeline','Add to Timeline','add-timeline',busyState(s)),btn('selection-actions','Selection actions','selection-actions',s.busy||(!s.range&&!s.group&&!s.trim)?'disabled':'default'),btn('reorder','Reorder','reorder-objects',s.busy||(!s.group&&!s.trim)?'disabled':'default'),btn('undo','Undo','undo','disabled'),btn('redo','Redo','redo','disabled'),btn('save-video',s.longSave?samples.longerAppText.saveVideo:'Save Video','save-video',busyState(s),true)],[ct,ct,ct,ct,ct,fr(1)]),
 status('ED-STATUS',s.busy?'Saving Harbor morning — draft…':s.failed?'Save Video failed. Draft, selection and destination retained. Retry with Save Video.':s.trim?'Trim preview · End 2099 → 2159 · Boats moves +60 frames · Enter to apply · Escape to cancel':s.group?'Group settings apply to the whole group; trimmed-out parts remain retained.':s.muted?'Track 2 audio muted · stored volume 60%':'',s.busy?'pending':s.failed?'failed':'default'),
 txt('SH-STATUS','')
 ],grid([fr(1)],[px(44),px(52),px(270),px(1),px(48),px(44),px(44),px(292),px(44),px(32),px(24)],8,12));}
function disableTree(node){if(node.kind==='component'&&['button','button-secondary','icon-button','choice-group','text-field','visual'].includes(node.templateRef.id))node.state='disabled';for(const c of node.children??[])disableTree(c);return node;}
const childEnvelope=id=>({schemaVersion:'wireframe-ui-pilot-1',elementId:id,revision:1,sourceFlowRefs:['edit-video','save-clip','update-clip','frame-composition','mix-audio','protect-project'],sourceActionRefs:sourceActions,parts:[],scenes:[],ui:{theme}});
const backdropEnvelope=childEnvelope('pair-1-b-retained-editor');
const taskEnvelope=childEnvelope('pair-1-b-active-task');
function layered(s,card,{width=900,top=160,left=null}={}){
 const back=disableTree(workspace(s));
 const state='view-'+(backdropEnvelope.scenes.length+1);
 const height=card.id==='menu-selection'?400:card.id==='dialog-track-rect'?640:card.id==='dialog-source-rect'?710:card.id==='dialog-add'?460:card.id==='dialog-project-guard'?430:card.id==='dialog-clip-update'?390:400;
 for(const [envelope,root,viewport] of [[backdropEnvelope,back,{width:1600,height:1000}],[taskEnvelope,card,{width,height}]]){envelope.parts.push({id:state,root});envelope.scenes.push({id:state,name:state,partRef:state,changes:[],viewport});}
 const child=(id,type,description)=>comp(id,type,{},state,undefined,{placeholder:{label:description,description:'Resolved exact final UI child; all controls and values are authored.'}});
 return reg('TASK-LAYER',[place(child('retained-editor','retained-editor','Retained stopped editor'),1),place(reg('TASK-PLACEMENT',[place(child('active-task','active-task','Active task'),2,2)],grid(left!==null?[px(left),px(width),fr(1)]:[fr(1),px(width),fr(1)],[px(top),px(height),fr(1)],0,0)),1)],grid([fr(1)],[fr(1)],0));
}
const task=(id,children)=>reg(id,children,grid([fr(1)],children.map(()=>ct),16,24),{surfaceTreatment:'elevation-2'});
function rangeMenu(){return task('MENU-SELECTION',[head('menu-title','All tracks · selected range'),txt('menu-scope','600–1199 inclusive · 600 frames / 20 s'),btn('delete-selection','Delete range','delete-selection'),btn('split-selection','Split at range boundaries','split-selection'),btn('save-clip-open','Save Clip to Library','open-save-clip'),btn('close-menu','Close','dismiss-editor')]);}
function groupMenu(){return task('MENU-SELECTION',[head('menu-title','Harbor sequence · group'),btn('delete-selection','Delete selected group','delete-selection'),btn('menu-reorder','Reorder','reorder-objects'),btn('ungroup','Ungroup','ungroup-clip','disabled'),txt('ungroup-reason','Unavailable: group source crop is not full frame and group volume is 80%.'),btn('close-menu','Close','dismiss-editor')]);}
function rectVisual(source){
 if(source)return reg('RECT-VISUAL',[
 place(media('source-image'),1,1,3,3),
 place(comp('crop-boundary','visual',{role:'selection',accessibleLabel:'Crop x160 y90 width1600 height900 source pixels'},'default','adjust-rectangle'),2,2),
 place(comp('crop-left','visual',{role:'start-handle',accessibleLabel:'Adjust crop left edge'},'default','adjust-rectangle'),2,2),
 place(comp('crop-right','visual',{role:'end-handle',accessibleLabel:'Adjust crop right edge'},'default','adjust-rectangle'),2,2)
 ],grid([fr(160),fr(1600),fr(160)],[fr(90),fr(900),fr(90)],0),{constraints:{minHeightPx:220,maxHeightPx:220}});
 return reg('RECT-VISUAL',[
 numeric(vis('output-background','surface','','dark'),0,2200),
 numeric(vis('lower-layer-image','thumbnail','','pattern-a'),0,1920),
 numeric(vis('full-output-boundary','selection'),0,1920),
 numeric(comp('candidate-rect','visual',{role:'selection',accessibleLabel:'Candidate x1800 to2200; output ends1920'},'default','adjust-rectangle'),1800,2200),
 numeric(comp('candidate-left','visual',{role:'start-handle',accessibleLabel:'Adjust left1800'},'default','adjust-rectangle'),1800),
 numeric(comp('candidate-right','visual',{role:'end-handle',accessibleLabel:'Adjust right2200'},'default','adjust-rectangle'),2200),
 numeric(vis('output-boundary-marker','indicator'),1920)
 ],{...grid([fr(1)],[px(220)],0),scale:{min:0,max:2200}});
}
function rectangle(source){return task(source?'DIALOG-SOURCE-RECT':'DIALOG-TRACK-RECT',[
 head('rectangle-title',source?'Source rectangle':'Track 2 · Output rectangle'),
 txt('rectangle-subject',source?'Harbor wide.mp4 · 1920 × 1080 source pixels':'1920 × 1080 output pixels · applies to every occurrence on Track 2'),
 ...(source?[status('add-retained','Add to Timeline · Track 2 · frame 1500 / 50 s · file not yet inserted')]:[]),
 reg('rectangle-preview-columns',[reg('coordinate-preview',[txt('coordinate-caption',source?'Source frame and staged crop':'Full output ends at 1920 · candidate ends at 2200'),rectVisual(source)],grid([fr(1)],[ct,px(220)],8)),reg('result-preview',[txt('result-caption',source?'Fitted result · Track 2 output target':'Retained output · lower tracks remain visible'),media('rectangle-result')],grid([fr(1)],[ct,px(220)],8))],grid([fr(1),fr(1)],[ct],16)),
 row('RECT-FIELDS',source?[
 field('rect-left','Left (%)','8.333','adjust-rectangle','default','160 source px'),field('rect-top','Top (%)','8.333','adjust-rectangle','default','90 source px'),field('rect-width','Width (%)','83.333','adjust-rectangle','default','1600 source px'),field('rect-height','Height (%)','83.333','adjust-rectangle','default','900 source px')]:[
 field('rect-left','Left (%)','93.75','adjust-rectangle','default','1800 output px'),field('rect-top','Top (%)','0','adjust-rectangle','default','0 output px'),field('rect-width','Width (%)','20.833','adjust-rectangle','error','400 output px · exceeds right edge'),field('rect-height','Height (%)','100','adjust-rectangle','default','1080 output px')],[fr(1),fr(1),fr(1),fr(1)]),
 source?txt('rectangle-effect','Apply returns this crop to Add. Nothing is inserted and no Undo edit is created.'):status('rectangle-error','Right edge exceeds output bounds by 280 pixels. Correct the width or left position.','failed'),
 txt('original-rectangle','Original: 0, 0 · 1920 × 1080 px. Cancel retains the original rectangle.'),
 row('RECT-ACTIONS',[btn('full-frame','Full frame','reset-rectangle'),btn('apply-rectangle',source?'Apply to Add':'Apply','apply-rectangle',source?'default':'disabled',true),btn('cancel-rectangle',source?'Cancel · return to Add':'Cancel','dismiss-editor')],[ct,fr(1),ct])
 ]);}
function addConflict(){return task('DIALOG-ADD',[
 head('add-title','Add to Timeline'),status('add-destination','Track 2 · frame 1500 / 50 s at 30 fps'),
 comp('add-content-tabs','choice-group',{label:'Project content',presentation:'tabs',options:[{id:'files',label:'Video Files'},{id:'videos',label:'Videos'},{id:'clips',label:'Clips'}],selectedId:'videos'},'default','choose-timeline-content'),
 comp('add-videos','choice-group',{label:'Saved video',presentation:'listbox',options:[{id:'harbor-evening',label:'Harbor evening'}],selectedId:'harbor-evening'},'selected','choose-timeline-content'),
 txt('add-type','Saved video · adds a fresh copy of its complete four-track composition'),
 status('add-error','Cannot add Harbor evening: populated Track 2 has conflicting output rectangle and audio settings.','failed'),
 txt('add-no-change','Nothing has been inserted. Choose another item or Cancel to return to your draft.'),
 row('add-actions',[btn('insert-content','Add','insert-content','disabled',true),btn('cancel-add','Cancel','dismiss-editor')],[fr(1),ct])
 ]);}
function clipSave(){return task('DIALOG-CLIP-CREATE',[
 head('clip-save-title','Save Clip to Library'),status('clip-save-range','All tracks · 600–1199 inclusive · 600 frames / 20 s at 30 fps'),
 txt('clip-save-scope','Includes contributing tracks, framing, gaps and audio. The active video timeline stays intact.'),
 field('clip-name','Clip name','Harbor highlights','name-clip'),status('clip-save-error','Save Clip failed. No library clip was created. Your name and selected range are retained.','failed'),
 row('clip-save-actions',[btn('create-clip','Save Clip','create-clip','default',true),btn('cancel-clip','Cancel','dismiss-editor')],[fr(1),ct])
 ]);}
function clipUpdate(){return task('DIALOG-CLIP-UPDATE',[
 head('clip-update-title','Update Named Clip'),txt('clip-update-target','Harbor sequence · selected copied occurrence on Track 2'),
 row('trim-comparison',[reg('saved-trim',[head('saved-title','Saved library definition'),txt('saved-bounds','Start 0 · inclusive End 1199')],grid([fr(1)],[ct,ct],8,16),{surfaceTreatment:'outlined'}),reg('proposed-trim',[head('proposed-title','Proposed library definition'),txt('proposed-bounds','Start 60 · inclusive End 1139')],grid([fr(1)],[ct,ct],8,16),{surfaceTreatment:'outlined'})],[fr(1),fr(1)]),
 txt('update-scope','Updates this library clip for future additions. Existing video copies, including this selected occurrence, remain unchanged.'),
 txt('update-excludes','Source crop, volume, mute and track settings are excluded.'),
 row('clip-update-actions',[btn('confirm-update','Update Named Clip','confirm-update','default',true),btn('cancel-update','Cancel','dismiss-editor')],[fr(1),ct])
 ]);}
function projectGuard(){return task('DIALOG-PROJECT-GUARD',[
 head('project-guard-title','Save project changes before Open?'),txt('project-guard-subject','Harbor field study · Open requested from Video Editing'),
 status('project-guard-failure',samples.longerAppText.projectFailure,'failed'),
 txt('deferred-draft','Your Harbor morning — draft remains intact. The earlier Discard draft choice will take effect only after Open succeeds.'),
 txt('save-project-scope','Save Project saves content already saved to the project. It does not save the active video draft.'),
 txt('cancel-guard-scope','Cancel returns to Video Editing with your original project and draft. A canceled or failed Open keeps them intact.'),
 row('project-guard-actions',[btn('guard-save-project','Save Project','save-project','default',true),btn('guard-discard','Discard project changes','discard-project'),btn('guard-cancel','Cancel','cancel-transition')],[fr(1),fr(1),ct])
 ]);}
const base=workspace();
const document={schemaVersion:'wireframe-ui-pilot-1',elementId:'alexa-video-workspace-pair-1-b',revision:1,sourceFlowRefs:['edit-video','save-clip','update-clip','frame-composition','mix-audio','protect-project'],sourceActionRefs:sourceActions,parts:[{id:'workspace-base',root:base}],scenes:[{id:'s01-composition-base',name:'Complete stopped composition workspace',partRef:'workspace-base',changes:[],viewport:{width:1600,height:1000}}],ui:{theme}};
if(process.argv.includes('--all')){
 const definitions=[
 ['s02-inclusive-range',layered({range:true,frame:600,timecode:'00:00:20:00',longSelection:true},rangeMenu(),{width:440,top:540,left:470})],
 ['s03-object-trim',workspace({trim:true,frame:1200,timecode:'00:00:40:00'})],
 ['s04-independent-zoom',workspace({zoom:true,range:true,frame:750,timecode:'00:00:25:00'})],
 ['s05-track-audio',workspace({active:'track-2',muted:true})],
 ['s06-group-properties',layered({active:'track-2',group:true,frame:1800,timecode:'00:01:00:00'},groupMenu(),{width:440,top:350,left:560})],
 ['s07-framing-invalid',layered({active:'track-2',frame:750,timecode:'00:00:25:00'},rectangle(false),{width:1000,top:160})],
 ['s08-staged-add-conflict',layered({active:'track-2',insertion:true},addConflict(),{width:850,top:180})],
 ['s08-source-rectangle',layered({active:'track-2',insertion:true,frame:750,timecode:'00:00:25:00'},rectangle(true),{width:1000,top:130})],
 ['s09-clip-save-failure',layered({range:true},clipSave(),{width:850,top:220})],
 ['s10-clip-update',layered({active:'track-2',group:true},clipUpdate(),{width:950,top:220})],
 ['s11-video-save-failure',workspace({active:'track-2',range:true,insertion:true,frame:750,timecode:'00:00:25:00',failed:true,longSave:true})],
 ['s11-video-saving-busy',workspace({active:'track-2',range:true,insertion:true,frame:750,timecode:'00:00:25:00',busy:true,longSave:true})],
 ['s12-project-guard-failure',layered({projectUnsaved:true},projectGuard(),{width:930,top:190})]
 ];
 const flat=scenarios.flatMap(x=>[x,...x.requiredRelatedScenes]);
 for(const [id,root] of definitions){const partRef='part-'+id;document.parts.push({id:partRef,root});document.scenes.push({id,name:flat.find(x=>x.id===id).title,partRef,changes:[],viewport:{width:1600,height:1000}});}
 document.revision=3;
 document.childRefs=[{templateId:'retained-editor',elementId:backdropEnvelope.elementId,revision:1},{templateId:'active-task',elementId:taskEnvelope.elementId,revision:1}];
}
function differences(base,candidate){
 if(base.id!==candidate.id||base.kind!==candidate.kind||(base.children?.length??0)!==(candidate.children?.length??0))return null;
 const set={};for(const key of Object.keys(candidate)){if(['id','children'].includes(key))continue;if(JSON.stringify(base[key])!==JSON.stringify(candidate[key]))set[key]=candidate[key];}
 const result=Object.keys(set).length?[{nodeRef:base.id,set}]:[];
 for(let i=0;i<(base.children?.length??0);i++){const d=differences(base.children[i],candidate.children[i]);if(d===null)return null;result.push(...d);}
 return result;
}
function reuse(envelope){const parts=[];for(const scene of envelope.scenes){const root=envelope.parts.find(p=>p.id===scene.partRef).root;let found=false;for(const part of parts){const changes=differences(part.root,root);if(changes!==null){scene.partRef=part.id;scene.changes=changes;found=true;break;}}if(!found)parts.push({id:scene.partRef,root});}envelope.parts=parts;}
reuse(document);if(process.argv.includes('--all')){reuse(backdropEnvelope);reuse(taskEnvelope);}
await fs.mkdir(here,{recursive:true});
await fs.writeFile(path.join(here,'ui.json'),JSON.stringify(document,null,2)+'\n');
if(process.argv.includes('--all'))await fs.writeFile(path.join(here,'references.json'),JSON.stringify({[backdropEnvelope.elementId+'@1']:backdropEnvelope,[taskEnvelope.elementId+'@1']:taskEnvelope},null,2)+'\n');
await fs.writeFile(path.join(here,'ui-notes.md'),'# Pair 1-B UI author notes\n\nProgress: base scene saved; author inspection pending.\n\nQuestions / decisions: Use exact shared theme; renderer uses system font and fixed 22px headings instead of accepted Roboto/20px. Media is deterministic schematic geometry under the shared limitation. No source policy changes.\n');
