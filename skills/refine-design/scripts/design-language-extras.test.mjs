import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {applyProposal,validate} from './design-language.mjs';
const make=()=>JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json',import.meta.url),'utf8'));
const folder=()=>fs.mkdtempSync(path.join(os.tmpdir(),'design-language-extras-test-'));
const read=(b,f)=>fs.readFileSync(path.join(b,f),'utf8');
const refine=b=>{const {revision,decisions,...d}=JSON.parse(read(b,'design-language/design-language.json'));return {...d,baseRevision:revision};};
const sheet='design-language/specimens/button-variants-command-family.svg';
test('current button variants render six states',()=>{
 const b=folder(),r=applyProposal(b,make()),svg=read(b,sheet);
 assert.equal((svg.match(/data-variant=/g)||[]).length,24);
 for(const v of ['contained','outlined','text','icon'])assert.equal((svg.match(new RegExp('data-variant="'+v+'"','g'))||[]).length,6);
 assert.match(svg,/<title>Play \(loading\)<\/title>/);assert.match(svg,/class="spinner"/);
 assert.ok(r.appliedDefaults.find(r=>r.target==='button:primary-command:focusGap').affectedTargets.includes('variants:command-family'));
 assert.ok(!r.rendererGaps.includes('button-variants'));
 const before=[svg,read(b,'components.md'),read(b,'design-language/design-language.json')];
 assert.equal(applyProposal(b,refine(b)).revision,1);
 assert.deepEqual([read(b,sheet),read(b,'components.md'),read(b,'design-language/design-language.json')],before);
});
test('invalid current button-variant records fail without changing the publication',()=>{
 const b=folder();applyProposal(b,make());
 const before=read(b,'components.md');
 for(const change of [d=>d.buttonVariants.iconId='unknown',d=>d.buttonVariants.accessibleLabel='',d=>d.buttonVariants.states.text.hover.background.role='unknown']){
 const next=refine(b);change(next);assert.throws(()=>applyProposal(b,next));assert.equal(read(b,'components.md'),before);
 }
 fs.appendFileSync(path.join(b,sheet),'<!-- owner edit -->');assert.throws(()=>applyProposal(b,refine(b)),/SVG was edited/);
});
test('variant acceptance requires resolved shared defaults and protects colors, geometry and naming',()=>{
 const b=folder(),d=make();d.buttonVariants.status='accepted';assert.throws(()=>validate(d),/depend on defaults/);
 d.button.metrics.focusGap=2;d.button.status='proposed';d.unspecifiedRequirements=d.unspecifiedRequirements.filter(r=>r.target!=='button:primary-command:focusGap');
 assert.throws(()=>applyProposal(b,d),/owner decision/);
 applyProposal(b,d,{accept:['variants:command-family'],reason:'Fixture approval'});
 for(const change of [d=>d.button.metrics.height=44,d=>d.buttonVariants.tooltip='Start playback',d=>d.icons.find(i=>i.id==='playback-play').sizePx=20,d=>d.palette.members.find(m=>m.id==='core').value='#AA00AA']){
 const next=refine(b);change(next);assert.throws(()=>applyProposal(b,next),/variants or dependency changed/);
 }
 const next=refine(b);assert.throws(()=>applyProposal(b,next,{accept:['variants:unknown'],reason:'Unknown variant'}),/accepted variants/);
});
test('top-level design-language lock requires explicit user authority and blocks quiet refinement',()=>{
 const b=folder();applyProposal(b,make());
 const locked=refine(b);locked.status='locked';
 assert.throws(()=>applyProposal(b,locked),/explicit current user lock request/);
 applyProposal(b,locked,{lockReason:'User requested the design language be locked.'});
 const changed=refine(b);changed.documentLayout.visualDirection='A subtly different visual direction.';
 assert.throws(()=>applyProposal(b,changed),/Locked design \$ cannot change/);
 assert.doesNotThrow(()=>applyProposal(b,changed,{lockedChangeReason:'User requested a change to the locked visual direction.'}));
});
