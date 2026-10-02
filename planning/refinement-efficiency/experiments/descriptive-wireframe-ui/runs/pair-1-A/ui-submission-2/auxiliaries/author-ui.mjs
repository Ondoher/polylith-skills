import fs from 'node:fs';
import {createHash} from 'node:crypto';
const run = '.codex-tmp/descriptive-wireframe-ui-20261002/pair-1-A';
const input = 'planning/refinement-efficiency/experiments/descriptive-wireframe-ui/inputs';
const raw = fs.readFileSync(`${run}/layout/wireframe.json`);
if (createHash('sha256').update(raw).digest('hex') !== '21ed8acdc5ff38ae74f9cdb73084a9319e889318e9027ba407dd141e17a3812e') throw new Error('Accepted source changed');
const source = JSON.parse(raw);
const theme = JSON.parse(fs.readFileSync(`${input}/render-theme.json`));
const samples = JSON.parse(fs.readFileSync(`${input}/samples.json`));
const ui = structuredClone(source);
ui.ui = {theme, parts: structuredClone(source.parts), sceneChanges: []};
const grid = (columns, rows = [{unit:'content'}], gap = 8, padding = 0) => ({mode:'grid',columns,rows,gap,padding,align:'stretch',justify:'start'});
const fr = value => ({unit:'fr',value});
const px = value => ({unit:'px',value});
const flex = (direction = 'row', gap = 8, padding = 0) => ({mode:'flex',direction,wrap:false,gap,padding,align: direction === 'row' ? 'center' : 'stretch',justify:'start'});
const primary = new Set(['save-video','add','play','nav-edit','clip-retry','update-confirm','project-retry','source-apply','output-apply','range-save','trim-commit','add-commit']);
function walk(n, fn) { fn(n); n.children?.forEach(c => walk(c, fn)); }
function find(root,id) { let result; walk(root,n => {if(n.id===id) result=n;}); return result; }
function set(root,id,fields) {const n=find(root,id); if(n) Object.assign(n,fields);}
function params(root,id,fields) {const n=find(root,id); if(n) n.parameters={...n.parameters,...fields};}
for (const part of ui.ui.parts) {
 const root = part.root;
 walk(root,n => {
  if(n.templateRef?.id==='button' && !primary.has(n.id)) n.templateRef.id='button-secondary';
  if(n.templateRef?.id==='visual') {
   if(['start-handle','end-handle','indicator'].includes(n.parameters.role)) n.parameters={...n.parameters,text:'',accessibleLabel:n.parameters.text||n.id};
   if(n.parameters.role==='item') n.parameters.variant=n.id==='player-content'?'pattern-a':'pattern-c';
  }
 });
 set(root,'shell',{layout:grid([fr(1)], [px(44),px(44)], 4, 0),surfaceTreatment:'flat'});
 set(root,'identity',{layout:grid([px(96),fr(1),px(96),px(96),px(146),px(116)],[px(44)],12,0)});
 set(root,'destinations',{layout:grid([px(290),px(180),px(252),px(170)],[px(44)],8,0)});
 set(root,'project-save',{constraints:{minWidthPx:118}});
 if(part.id.startsWith('workspace')) {
  root.layout=grid([fr(1)],root.children.map(n=>px(({shell:92,upper:320,separator:1,'video-identity':46,'editing-toolbar':44,'edit-context':44,'range-controls':46,'object-controls':46,tracks:250,'local-status':34,'app-status':34})[n.id])),4,8);
  set(root,'upper',{layout:grid([fr(1.7),fr(1)], [px(320)],16,0)});
  set(root,'player',{layout:grid([fr(1)],[px(44),px(225),px(28)],8,0),constraints:{minWidthPx:550}});
  set(root,'player-head',{layout:grid([px(232),fr(1),px(112),px(112),px(68)],[px(44)],8,0)});
  const image=find(root,'player-image');
  image.constraints={minWidthPx:400,maxWidthPx:400,minHeightPx:225,maxHeightPx:225};
  if(part.id==='workspace-zoom') image.layout=grid([px(50),px(200),px(150)],[px(36.25),px(112.5),px(76.25)],0,0);
  else image.layout=grid([fr(1)],[px(225)],0,0);
  set(root,'properties',{layout:flex('column',6,12),constraints:{minWidthPx:400},surfaceTreatment:'outlined'});
  for(const id of ['properties-context','properties-detail','properties-feedback']) {
   const n=find(root,id); if(n && n.state!=='failed') n.templateRef.id='text';
  }
  set(root,'separator',{layout:flex('column',0,0),constraints:{minHeightPx:1,maxHeightPx:1}});
  params(root,'separator-line',{variant:'horizontal'});
  set(root,'video-identity',{layout:grid([px(142),fr(1),px(238),px(290)],[px(46)],12,0)});
  params(root,'save-video',{label:samples.longerAppText.saveVideo});
  set(root,'editing-toolbar',{layout:grid([fr(1),px(118),px(118),px(154),px(178),px(96),px(96)],[px(44)],8,0)});
  set(root,'edit-context',{layout:grid([fr(1.7),fr(1.1),px(138),px(174),px(166)],[{unit:'content'}],8,0)});
  set(root,'selection-summary',{templateRef:{id:'text',version:'1'}});
  set(root,'insertion-summary',{templateRef:{id:'text',version:'1'}});
  set(root,'tracks',{layout:grid([fr(1)],[px(48),px(48),px(48),px(48),px(48)],2,0),surfaceTreatment:'outlined'});
  for(const id of ['composed-row','track-4','track-3','track-2','track-1']) {
   set(root,id,{layout:grid([px(170),fr(1)],[px(46)],8,2)});
   set(root,`${id}-header`,{layout:grid(id==='composed-row'?[fr(1)]:[px(96),px(70)],[px(44)],4,0)});
  }
  for(let track=1;track<=4;track++) {
   const n=find(root,`track-${track}-label`);
   n.templateRef.id=track===1?'button':'button-secondary'; n.parameters={label:`Track ${track}`}; n.actionRef='select-track';
  }
  params(root,'duration-track',{role:'item',variant:'pattern-a',text:'Full composition · 120 s · frames 0–3599'});
  if(part.id==='workspace-zoom') params(root,'duration-track',{text:'Visible frames 600–1499 · 30 fps'});
  for(const id of ['range-controls','object-controls']) set(root,id,{layout:grid([px(184),px(184),px(140),px(150),px(130)],[px(46)],12,0)});
  if(part.id==='workspace-group') {
   set(root,'properties',{layout:grid([fr(1),fr(1)],[{unit:'content'},{unit:'content'},{unit:'content'},{unit:'content'},{unit:'content'}],6,12),constraints:{minWidthPx:400},surfaceTreatment:'outlined'});
   const positions={'properties-title':[1,1,2],'properties-context':[2,1,2],'group-source-rectangle':[3,1,1],'group-volume':[3,2,1],'group-mute':[4,1,1],'properties-detail':[4,2,1],'ungroup':[5,1,1],'properties-feedback':[5,2,1]};
   for(const [id,[row,column,columnSpan]] of Object.entries(positions)) set(root,id,{placement:{row,column,columnSpan}});
  }
  if(part.id==='workspace-object') {
   set(root,'properties',{layout:grid([fr(1),fr(1)],[{unit:'content'},{unit:'content'},{unit:'content'},{unit:'content'}],6,12),constraints:{minWidthPx:400},surfaceTreatment:'outlined'});
   const positions={'properties-title':[1,1,2],'properties-context':[2,1,2],'object-source-rectangle':[3,1,1],'object-volume':[3,2,1],'object-mute':[4,1,1],'properties-feedback':[4,2,1]};
   for(const [id,[row,column,columnSpan]] of Object.entries(positions)) set(root,id,{placement:{row,column,columnSpan}});
  }
  if(part.id==='workspace-add') {
   set(root,'properties',{layout:grid([fr(1),fr(1)],[{unit:'content'},{unit:'content'},{unit:'content'},{unit:'content'},{unit:'content'},{unit:'content'}],5,12),constraints:{minWidthPx:400},surfaceTreatment:'outlined'});
   const positions={'properties-title':[1,1,2],'add-selected':[2,1,2],'add-content':[3,1,2],'properties-context':[4,1,2],'properties-feedback':[5,1,2],'add-commit':[6,1,1],'add-cancel':[6,2,1]};
   for(const [id,[row,column,columnSpan]] of Object.entries(positions)) set(root,id,{placement:{row,column,columnSpan}});
  }
 } else {
  root.layout=grid([fr(1)],root.children.map(n=> n.id==='shell'?px(92):n.id.endsWith('-panel')?{unit:'content'}:px(44)),20,24);
  const panel=root.children.find(n=>n.id.endsWith('-panel'));
  panel.layout=grid([fr(1)],panel.children.map(n=>({unit:'content'})),16,24);
  panel.constraints={minWidthPx:900,maxWidthPx:1100,minHeightPx:380};
  for(const n of panel.children) if(n.id.endsWith('-actions')) {n.layout=flex('row',12,0);}
  for(const id of ['output-fields','source-fields']) set(root,id,{layout:grid([fr(1),fr(1),fr(1),fr(1)],[{unit:'content'}],12,0)});
  for(const prefix of ['output','source']) {
   params(root,`${prefix}-preview-frame`,{variant:'dark'});
   const selection=find(root,`${prefix}-preview-selection`);
   if(selection) selection.parameters={...selection.parameters,accessibleLabel:selection.parameters.text,text:''};
   for(const axis of ['width','height']) params(root,`${prefix}-${axis}`,{label:`${axis[0].toUpperCase()+axis.slice(1)} (${prefix} pixels)`});
  }
  params(root,'source-dialog-title',{text:samples.longerAppText.sourceRectangle});
  params(root,'project-failed',{text:samples.longerAppText.projectFailure});
 }
}
for(const scene of ui.scenes) {
 const changes=[];
 const byId=new Map();
 const add=(nodeRef,set)=>{const existing=byId.get(nodeRef); if(existing) Object.assign(existing.set,set); else {const c={nodeRef,set};changes.push(c);byId.set(nodeRef,c);}};
 const active= scene.id==='s01-composition-base'||scene.id==='s02-inclusive-range'||scene.id==='s03-object-trim'||scene.id==='s04-independent-zoom'?1:2;
 if(scene.partRef.startsWith('workspace')) {
  for(let track=1;track<=4;track++) add(`track-${track}-label`,{templateRef:{id:track===active?'button':'button-secondary',version:'1'},state:scene.id==='s11-video-saving-busy'?'disabled':'default'});
  for(const change of scene.changes) {
   if(change.nodeRef==='range-band') add('range-band',{parameters:{...change.set.parameters,text:'',accessibleLabel:'Selected frames 600–1199 inclusive'}});
   if(change.nodeRef==='playhead') add('playhead',{parameters:{...change.set.parameters,text:'',accessibleLabel:change.set.parameters.text}});
   if(change.nodeRef==='player-content') add('player-content',{parameters:{...change.set.parameters,variant:scene.id==='s04-independent-zoom'?undefined:'pattern-a'}});
   if(change.nodeRef==='walk'&&change.set.state==='selected') add('walk',{parameters:{role:'item',text:'Pier walk',variant:'selected'}});
   if(change.nodeRef==='group'&&change.set.state==='selected') add('group',{parameters:{role:'item',text:'Harbor sequence',variant:'selected'}});
  }
  if(scene.id==='s02-inclusive-range') add('properties-title',{parameters:{text:samples.longerAppText.selection}});
  if(scene.id==='s04-independent-zoom') add('output-frame',{parameters:{role:'surface',text:'Full composition overview'}});
  if(scene.id==='s11-video-save-failure') add('draft-state',{parameters:{text:'Save failed · Unsaved draft'}});
  if(scene.id==='s08-staged-add-conflict') add('properties-feedback',{parameters:{text:'Track 2 output/audio conflict. Nothing inserted.'}});
 }
 ui.ui.sceneChanges.push({sceneRef:scene.id,changes});
}
const base = structuredClone(ui);
base.scenes=base.scenes.filter(s=>s.id==='s01-composition-base');
base.ui.sceneChanges=base.ui.sceneChanges.filter(s=>s.sceneRef==='s01-composition-base');
fs.writeFileSync(`${run}/ui/ui-base.json`,JSON.stringify(base,null,2)+'\n');
if(process.argv.includes('--all')) fs.writeFileSync(`${run}/ui/ui.json`,JSON.stringify(ui,null,2)+'\n');
