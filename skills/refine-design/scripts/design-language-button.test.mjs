import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {applyProposal} from './design-language.mjs';
import {buttonLayout,resolveButtonColor,buttonStates} from './design-language-button.mjs';
const make=()=>JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json',import.meta.url),'utf8'));
const folder=()=>fs.mkdtempSync(path.join(os.tmpdir(),'design-language-button-test-'));
const read=(base,file)=>fs.readFileSync(path.join(base,file),'utf8');
const saved=base=>JSON.parse(read(base,'design-language/design-language.json'));
const refine=base=>{const {revision,decisions,...body}=saved(base);return {...body,baseRevision:revision};};
const sheet='design-language/specimens/button-primary-command-states.svg';
test('command states render through persistence with explicit unresolved defaults and stable rerender',()=>{
 const base=folder(),report=applyProposal(base,make()),svg=read(base,sheet),md=read(base,'design-language.md'),components=read(base,'components.md');
 assert.deepEqual([...svg.matchAll(/data-state="([^"]+)"/g)].map(m=>m[1]),buttonStates);
 assert.ok(components.includes('Command button states'));
 assert.ok(components.includes('Unspecified \\(default\\)'));
 assert.ok(components.includes('derived shades do not add identity colors'));
 assert.ok(report.appliedDefaults.some(d=>d.target==='button:primary-command:focusGap'));
 assert.equal(saved(base).button.metrics.focusGap,null);
 assert.equal(report.outcome,'partial');
 const before=read(base,'design-language/design-language.json');
 assert.equal(applyProposal(base,refine(base)).revision,1);
 assert.equal(read(base,sheet),svg);assert.equal(read(base,'design-language.md'),md);assert.equal(read(base,'design-language/design-language.json'),before);
});
test('derived colors resolve predictably and inherit unresolved theme dependencies',()=>{
 const d=make(),e={kind:'mix',baseRole:'surface',overlayRole:'body-text',amount:.5};
 assert.equal(resolveButtonColor(d,e).value,'#909090');
 const panel=d.theme.roles.find(role=>role.id==='panel-border');
 panel.paletteRef=null;panel.status='unspecified';
 d.unspecifiedRequirements.push({id:'panel-border-mapping',target:'role:panel-border',description:'Choose panel border mapping.',decisionOwner:'UI',renderFallback:{value:'#E0E0E0',source:'current test fallback'}});
 const r=resolveButtonColor(d,{...e,overlayRole:'panel-border'});
 assert.deepEqual(r.requirements,['panel-border-mapping']);
 const base=folder();d.button.states.hover.background={...e,overlayRole:'panel-border'};
 const report=applyProposal(base,d);
 assert.ok(report.appliedDefaults.find(r=>r.requirementId==='panel-border-mapping').affectedTargets.includes('button:primary-command'));
 const persisted=saved(base);
 assert.equal(persisted.theme.roles.find(role=>role.id==='panel-border').status,'unspecified');
 assert.deepEqual(resolveButtonColor(persisted,persisted.button.states.hover.background).requirements,['panel-border-mapping']);
});
test('color-state change preserves measured button geometry and unrelated artifacts',()=>{
 const base=folder();applyProposal(base,make());const before=buttonLayout(saved(base));
 const field=read(base,'design-language/specimens/field-password-280.svg'),next=refine(base);
 next.button.states.hover.background.amount=.2;applyProposal(base,next);
 assert.equal(buttonLayout(saved(base)).width,before.width);
 assert.deepEqual(buttonLayout(saved(base)).m,before.m);
 assert.equal(read(base,'design-language/specimens/field-password-280.svg'),field);
 const svg=read(base,sheet);
 assert.equal((svg.match(/class="face"/g)||[]).length,6);
 assert.equal((svg.match(/class="focus-ring"/g)||[]).length,1);
});
test('acceptance requires resolved metrics and explicit authorization, and protects dependencies',()=>{
 const base=folder(),d=make();d.button.status='accepted';
 assert.throws(()=>applyProposal(base,d,{accept:['button:primary-command'],reason:'Test'}),/unspecified/);
 d.button.metrics.focusGap=2;d.unspecifiedRequirements=d.unspecifiedRequirements.filter(r=>!r.target.startsWith('button:'));
 assert.throws(()=>applyProposal(base,d),/owner decision/);
 applyProposal(base,d,{accept:['button:primary-command'],reason:'Test button approval'});
 const before=read(base,sheet),next=refine(base);next.palette.members.find(m=>m.id==='core').value='#1155AA';
 assert.throws(()=>applyProposal(base,next),/button or dependency changed/);
 assert.equal(read(base,sheet),before);
 applyProposal(base,next,{accept:['button:primary-command'],reason:'Test revised color'});
 assert.equal(saved(base).decisions.filter(d=>d.target==='button:primary-command').length,2);
});
test('invalid expressions, states, fallback records and oversized labels fail without publishing',()=>{
 const base=folder();applyProposal(base,make());const before=read(base,sheet);
 for(const mutate of [
  d=>d.button.states.hover.background.amount=2,
  d=>d.button.states.hover.background={kind:'eval',code:'process.exit()'},
  d=>d.button.states.selected=d.button.states.default,
  d=>d.button.states.default.foreground.role='missing',
  d=>d.button.metrics.height=1,
  d=>d.button.label='W'.repeat(60),
  d=>d.unspecifiedRequirements.push({...d.unspecifiedRequirements.at(-1),id:'duplicate-gap'})
 ]){
  const next=refine(base);mutate(next);assert.throws(()=>applyProposal(base,next));assert.equal(read(base,sheet),before);
 }
});
test('manual SVG edits and unowned artifact collisions are protected',()=>{
 const base=folder();applyProposal(base,make());fs.appendFileSync(path.join(base,sheet),'<!-- owner edit -->');
 assert.throws(()=>applyProposal(base,refine(base)),/SVG was edited/);
 const other=folder();fs.mkdirSync(path.join(other,'design-language/specimens'),{recursive:true});fs.writeFileSync(path.join(other,sheet),'owner asset');
 assert.throws(()=>applyProposal(other,make()),/unowned SVG/);
 assert.equal(read(other,sheet),'owner asset');
});
