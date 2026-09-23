import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {applyProposal,validate} from './design-language.mjs';
import {selectLayout,selectSvg} from './design-language-select.mjs';
const make=()=>JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json',import.meta.url),'utf8'));
const folder=()=>fs.mkdtempSync(path.join(os.tmpdir(),'design-language-select-test-'));
const read=(b,f)=>fs.readFileSync(path.join(b,f),'utf8');
const refine=b=>{const {revision,decisions,...d}=JSON.parse(read(b,'design-language/design-language.json'));return {...d,baseRevision:revision};};
const sheet='design-language/specimens/select-preview-quality-280.svg';
test('select renders five states with separate selected, active and disabled options and stable outputs',()=>{
 const b=folder(),r=applyProposal(b,make()),svg=read(b,sheet);
 assert.equal((svg.match(/data-state=/g)||[]).length,5);assert.equal((svg.match(/data-popup=/g)||[]).length,1);
 assert.match(svg,/data-option="standard" data-selected="true" data-active="false"/);
 assert.match(svg,/data-option="high" data-selected="false" data-active="true"/);
 assert.match(svg,/data-option="maximum" data-selected="false" data-active="false" data-disabled="true"/);
 assert.ok(r.appliedDefaults.find(r=>r.target==='pattern:field-feedback:gap').affectedTargets.includes('select:preview-quality'));
 assert.ok(r.rendererGaps.includes('toggle-buttons'));assert.ok(!r.rendererGaps.some(gap=>gap.includes('select')));
 const before=[svg,read(b,'components.md'),read(b,'design-language/design-language.json')];
 assert.equal(applyProposal(b,refine(b)).revision,1);
 assert.deepEqual([read(b,sheet),read(b,'components.md'),read(b,'design-language/design-language.json')],before);
});
test('popup overlays anchored messages and reserves space before the next specimen',()=>{
 const d=make(),l=selectLayout(d,280),row=l.states[1];
 assert.equal(row.menuY,row.fieldY+l.m.height+l.m.menuGap);
 assert.equal(row.messages[0].y,row.fieldY+l.m.height+l.pm.gap);
 assert.ok(l.states[2].captionY>row.menuY+row.menuHeight);
 d.selectInput.activeId='standard';assert.match(selectSvg(d,400),/data-option="standard" data-selected="true" data-active="true"/);
 assert.equal(d.selectInput.selectedId,'standard');
});
test('invalid current select changes never publish',()=>{
 const b=folder();applyProposal(b,make());
 const before=read(b,'components.md');
 for(const mutate of [d=>d.selectInput.selectedId='maximum',d=>d.selectInput.activeId='maximum',d=>d.selectInput.messagePattern='unknown',d=>d.selectInput.options[0].label='W'.repeat(80),d=>d.selectInput.options[1].id='draft',d=>d.selectInput.metrics.height=1]){
 const next=refine(b);mutate(next);assert.throws(()=>applyProposal(b,next));assert.equal(read(b,'components.md'),before);
 }
 fs.appendFileSync(path.join(b,sheet),'<!-- owner edit -->');assert.throws(()=>applyProposal(b,refine(b)),/SVG was edited/);
});
test('select acceptance requires resolved dependencies and protects the shared pattern',()=>{
 const b=folder(),d=make();d.selectInput.status='accepted';assert.throws(()=>validate(d));
 d.selectInput.metrics.menuGap=4;d.fieldMessages.metrics.gap=4;d.fieldMessages.status='proposed';
 const body=d.typography.roles.find(r=>r.id==='body');body.lineHeightPx=24;body.status='proposed';
 d.unspecifiedRequirements=d.unspecifiedRequirements.filter(r=>!['select:preview-quality:menuGap','pattern:field-feedback:gap','type:body:lineHeightPx'].includes(r.target));
 assert.throws(()=>applyProposal(b,d),/owner decision/);
 applyProposal(b,d,{accept:['select:preview-quality'],reason:'Fixture approval'});
 const next=refine(b);next.fieldMessages.metrics.inset=16;assert.throws(()=>applyProposal(b,next),/select or dependency changed/);
});
