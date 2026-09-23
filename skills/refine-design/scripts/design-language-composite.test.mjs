import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {applyProposal,validate} from './design-language.mjs';
import {groupLayout} from './design-language-composite.mjs';
const make=()=>JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json',import.meta.url),'utf8'));
const folder=()=>fs.mkdtempSync(path.join(os.tmpdir(),'design-language-group-test-'));
const read=(b,f)=>fs.readFileSync(path.join(b,f),'utf8');
const refine=b=>{const {revision,decisions,...d}=JSON.parse(read(b,'design-language/design-language.json'));return {...d,baseRevision:revision};};
const sheet='design-language/specimens/group-weekdays-280.svg';
test('composite children share one message area per state and reflow in a measured grid',()=>{
 const b=folder(),d=make(),r=applyProposal(b,d),svg=read(b,sheet),md=read(b,'components.md');
 assert.equal((svg.match(/data-message-area="shared"/g)||[]).length,2);
 assert.equal((svg.match(/data-option="/g)||[]).length,14);
 assert.equal((svg.match(/data-selected="true"/g)||[]).length,3);
 assert.ok(md.includes('## Input Guidance And Feedback'));assert.ok(md.includes('## Composite Input: Shared Guidance And Feedback'));
 assert.equal(groupLayout(d,280).columns,2);assert.equal(groupLayout(d,400).columns,3);
 assert.ok(r.appliedDefaults.find(r=>r.target==='pattern:field-feedback:gap').affectedTargets.includes('group:weekdays'));
 const before=[svg,md,read(b,'design-language/design-language.json')];
 assert.equal(applyProposal(b,refine(b)).revision,1);
 assert.deepEqual([read(b,sheet),read(b,'components.md'),read(b,'design-language/design-language.json')],before);
});
test('shared message policy applies to composite as well as single field without changing children',()=>{
 const d=make(),a=groupLayout(d,280);d.fieldMessages.errorPresentation='replace';const b=groupLayout(d,280);
 assert.equal(a.states[1].messages.length,2);assert.equal(b.states[1].messages.length,1);
 assert.equal(b.states[1].messages[0].kind,'error');assert.equal(b.frameHeight,a.frameHeight);
 assert.deepEqual(b.states[0],a.states[0]);assert.deepEqual(b.states[1].selectedIds,a.states[1].selectedIds);
});
test('invalid composite inputs or edited current artifacts cannot publish',()=>{
 const b=folder();applyProposal(b,make());
 const before=read(b,'components.md');
 for(const mutate of [d=>d.compositeInput.selectedIds=['unknown'],d=>d.compositeInput.messagePattern='unknown',d=>d.compositeInput.options[0].label='W'.repeat(40),d=>d.compositeInput.metrics.checkboxSize=70,d=>d.compositeInput.options[1].id=d.compositeInput.options[0].id]){
  const next=refine(b);mutate(next);assert.throws(()=>applyProposal(b,next));assert.equal(read(b,'components.md'),before);
 }
 fs.appendFileSync(path.join(b,sheet),'<!-- owner edit -->');assert.throws(()=>applyProposal(b,refine(b)),/SVG was edited/);
});
test('accepted composite protects its shared pattern and rejects unresolved dependencies',()=>{
 const b=folder(),d=make();d.compositeInput.status='accepted';
 assert.throws(()=>validate(d),/depend on defaults/);
 d.fieldMessages.metrics.gap=4;d.fieldMessages.status='proposed';
 d.unspecifiedRequirements=d.unspecifiedRequirements.filter(r=>r.target!=='pattern:field-feedback:gap');
 assert.throws(()=>applyProposal(b,d),/owner decision/);
 applyProposal(b,d,{accept:['group:weekdays'],reason:'Fixture approval'});
 const next=refine(b);next.fieldMessages.metrics.inset=16;
 assert.throws(()=>applyProposal(b,next),/group or dependency changed/);
 applyProposal(b,next,{accept:['group:weekdays'],reason:'Updated shared inset'});
});
