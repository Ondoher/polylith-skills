import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {applyProposal,validate} from './design-language.mjs';
import {fieldLayout,fieldStates} from './design-language-text-field.mjs';
const make=()=>JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json',import.meta.url),'utf8'));
const folder=()=>fs.mkdtempSync(path.join(os.tmpdir(),'design-language-field-test-'));
const read=(b,f)=>fs.readFileSync(path.join(b,f),'utf8');
const saved=b=>JSON.parse(read(b,'design-language/design-language.json'));
const refine=b=>{const {revision,decisions,...d}=saved(b);return {...d,baseRevision:revision};};
const sheet='design-language/specimens/text-field-item-name-280.svg';
test('two widths render four supplied states and a separately documented message pattern',()=>{
 const b=folder(),report=applyProposal(b,make()),svg=read(b,sheet),md=read(b,'components.md');
 assert.deepEqual([...svg.matchAll(/data-state="([^"]+)"/g)].map(m=>m[1]),fieldStates);
 assert.ok(md.includes('## Input Guidance And Feedback'));assert.ok(md.includes('aria-describedby'));
 assert.ok(md.includes('## Ordinary Text Field'));assert.ok(!read(b,'design-language.md').includes('](./design-language/specimens/text-field'));
 assert.ok(report.rendererGaps.includes('embedded-field-states'));assert.ok(!report.rendererGaps.includes('generic-text-field-error'));
 const missing=report.appliedDefaults.find(r=>r.target==='pattern:field-feedback:gap');
 assert.ok(missing.affectedTargets.includes('field:item-name'));
 assert.equal(saved(b).fieldMessages.metrics.gap,null);
 const before=[read(b,sheet),md,read(b,'design-language/design-language.json')];
 assert.equal(applyProposal(b,refine(b)).revision,1);
 assert.deepEqual([read(b,sheet),read(b,'components.md'),read(b,'design-language/design-language.json')],before);
});
test('message wrapping and retain/replace policy affect only appropriate content and geometry',()=>{
 const d=make(),narrow=fieldLayout(d,280),wide=fieldLayout(d,400);
 assert.ok(narrow.states[0].messages[0].lines.length>wide.states[0].messages[0].lines.length);
 assert.equal(narrow.states[3].messages.length,2);
 assert.ok(narrow.states[3].messages[1].lines.join(' ').startsWith('Error:'));
 d.fieldMessages.errorPresentation='replace';const replaced=fieldLayout(d,280);
 assert.equal(replaced.states[3].messages.length,1);
 assert.equal(replaced.states[3].messages[0].kind,'error');
 assert.deepEqual(replaced.states.slice(0,3),narrow.states.slice(0,3));
 assert.equal(replaced.states[3].fieldY,narrow.states[3].fieldY);
 assert.ok(replaced.height<narrow.height);
});
test('pattern/field acceptance needs resolved defaults and protects shared message changes',()=>{
 const b=folder(),d=make();
 d.fieldMessages.metrics.gap=4;d.fieldMessages.status='accepted';
 d.unspecifiedRequirements=d.unspecifiedRequirements.filter(r=>!r.target.startsWith('pattern:'));
 d.typography.roles.find(r=>r.id==='body').lineHeightPx=24;d.typography.roles.find(r=>r.id==='body').status='proposed';
 d.unspecifiedRequirements=d.unspecifiedRequirements.filter(r=>r.target!=='type:body:lineHeightPx');
 d.textField.status='accepted';
 assert.throws(()=>applyProposal(b,d),/owner decision/);
 applyProposal(b,d,{accept:['pattern:field-feedback','field:item-name'],reason:'Fixture approval'});
 const next=refine(b);next.fieldMessages.errorPresentation='replace';
 assert.throws(()=>applyProposal(b,next,{accept:['pattern:field-feedback'],reason:'Pattern only'}),/dependency changed/);
 applyProposal(b,next,{accept:['pattern:field-feedback','field:item-name'],reason:'Both approvals'});
 assert.equal(saved(b).fieldMessages.errorPresentation,'replace');
 const invalid=make();invalid.fieldMessages.metrics.gap=4;invalid.fieldMessages.status='proposed';
 invalid.unspecifiedRequirements=invalid.unspecifiedRequirements.filter(r=>!r.target.startsWith('pattern:'));invalid.textField.status='accepted';
 assert.throws(()=>validate(invalid),/depend on defaults/);
});
test('invalid references, policies, dimensions and unwrappable text cannot partially publish',()=>{
 const b=folder();applyProposal(b,make());const original=read(b,'components.md');
 for(const mutate of [
  d=>d.fieldMessages.errorPresentation='guess',
  d=>d.textField.messagePattern='missing',
  d=>d.fieldMessages.colors.error.role='missing',
  d=>d.textField.metrics.height=1,
  d=>d.textField.helperText='W'.repeat(100),
  d=>d.textField.label='W'.repeat(80),
  d=>d.fieldMessages.metrics.inset=150,
  d=>d.unspecifiedRequirements=d.unspecifiedRequirements.filter(r=>!r.target.startsWith('pattern:'))
 ]){
  const next=refine(b);mutate(next);assert.throws(()=>applyProposal(b,next));assert.equal(read(b,'components.md'),original);
 }
});
test('edited field artifacts remain protected',()=>{
 const b=folder();applyProposal(b,make());fs.appendFileSync(path.join(b,sheet),'<!-- owner edit -->');
 assert.throws(()=>applyProposal(b,refine(b)),/SVG was edited/);
});
