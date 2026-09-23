import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {applyProposal} from './design-language.mjs';
import {passwordMetrics} from './design-language-password.mjs';
import {passwordLayout} from './design-language-password-layout.mjs';
const make=()=>{
 const proposal=JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json',import.meta.url),'utf8'));
 proposal.documentLayout.embeddedField=false;
 proposal.documentLayout.passwordPreview=true;
 return proposal;
};
const folder=()=>fs.mkdtempSync(path.join(os.tmpdir(),'design-language-password-test-'));
const saved=base=>JSON.parse(fs.readFileSync(path.join(base,'design-language/design-language.json'),'utf8'));
const refine=base=>{const {revision,decisions,...body}=saved(base);return {...body,baseRevision:revision};};
const svg=(base,width)=>fs.readFileSync(path.join(base,'design-language/specimens/component-password-'+width+'.svg'),'utf8');
const snapshot=base=>Object.fromEntries(['design-language.md','design-language/design-language.json',...fs.readdirSync(path.join(base,'design-language/specimens')).map(n=>'design-language/specimens/'+n)].map(file=>[file,fs.readFileSync(path.join(base,file),'utf8')]));
function specified(p) {
 p.password.metrics.ruleGap=4;p.password.status='proposed';
 p.typography.roles.find(r=>r.id==='body').lineHeightPx=24;p.typography.roles.find(r=>r.id==='body').status='proposed';
 const border=p.theme.roles.find(r=>r.id==='panel-border');border.paletteRef={paletteId:p.palette.id,memberId:'neutral-text'};border.status='proposed';
 p.unspecifiedRequirements=p.unspecifiedRequirements.filter(r=>!['type:body:lineHeightPx','role:panel-border','component:password:ruleGap'].includes(r.target));
 return p;
}
test('two widths preserve fixed metrics and wrap long requirements with content-driven height',()=>{
 const p=make(),m=passwordMetrics(p);
 const narrow=passwordLayout(p,p.password,m,280),wide=passwordLayout(p,p.password,m,400);
 assert.equal(narrow.inputWidth+120,wide.inputWidth);
 assert.deepEqual(narrow.metrics,wide.metrics);assert.equal(narrow.visibility.sizePx,24);
 assert.equal(narrow.rules[1].lines.length,2);assert.equal(wide.rules[1].lines.length,1);
 assert.ok(narrow.componentBottom>wide.componentBottom);
 for(const layout of [narrow,wide])for(const rule of layout.rules)for(const line of rule.lines)assert.ok(layout.engines.support.shape(line).width<=rule.width);
});
test('component outputs annotations and reports null metrics and inherited defaults',()=>{
 const base=folder(),report=applyProposal(base,make()),doc=saved(base);
 assert.equal(report.rendererVersion,'extras-1.2');assert.equal(report.outcome,'partial');
 assert.equal(doc.password.metrics.ruleGap,null);
 for(const id of ['component:password:ruleGap','type:body:lineHeightPx'])assert.ok(report.appliedDefaults.find(r=>r.target===id).affectedTargets.includes('component:password'));
 assert.ok(!report.appliedDefaults.some(r=>r.target==='role:panel-border'));
 const drawing=svg(base,280);assert.ok(drawing.includes('&quot;fieldHeight&quot;:56'));assert.ok(!drawing.includes('<text'));assert.ok(!drawing.includes('href='));
 const md=fs.readFileSync(report.document,'utf8');assert.match(md,/\| component:password:ruleGap \|[^\n]*\| 4 \|/);assert.ok(md.indexOf('## Open Questions')>md.indexOf('## Component Reference'));
});
test('changing a component gap updates only its two specimens',()=>{
 const base=folder();applyProposal(base,make());const before=snapshot(base),next=refine(base);
 next.password.metrics.supportGap=12;applyProposal(base,next);const after=snapshot(base);
 assert.deepEqual(Object.keys(after).filter(p=>p.endsWith('.svg')&&before[p]!==after[p]).sort(),[
 'design-language/specimens/component-password-280.svg','design-language/specimens/component-password-400.svg']);
});
test('accepted component protects referenced typography, icons and colors',()=>{
 const base=folder(),p=specified(make());p.password.status='accepted';
 assert.throws(()=>applyProposal(base,p),/owner decision/);
 applyProposal(base,p,{accept:['component:password'],reason:'Simulated specimen acceptance.'});const before=snapshot(base);
 for(const change of [
 p=>p.typography.roles.find(r=>r.id==='body').sizePx=17,
 p=>p.icons.find(r=>r.id==='password-hidden').asset.name='Visibility',
 p=>p.icons.find(r=>r.id==='requirement-met').colorRole='failure'
 ]) {
  const next=refine(base);change(next);assert.throws(()=>applyProposal(base,next),/Accepted component/);assert.deepEqual(snapshot(base),before);
 }
 const next=refine(base);next.password.metrics.radius=6;
 applyProposal(base,next,{accept:['component:password'],reason:'Simulated radius acceptance.'});
 assert.ok(svg(base,280).includes('rx="6"'));
});
test('component cannot be accepted while a referenced design value is defaulted',()=>{
 const p=make();p.password.metrics.ruleGap=4;p.password.status='accepted';
 p.unspecifiedRequirements=p.unspecifiedRequirements.filter(r=>!r.target.startsWith('component:'));
 assert.throws(()=>applyProposal(folder(),p,{accept:['component:password'],reason:'Test'}),/cannot depend on defaults/);
});
test('bad geometry and unsupported contracts fail without creating artifacts',()=>{
 for(const change of [
 p=>p.password.widths=[280,280],
 p=>p.password.template='unknown',
 p=>p.password.metrics.paddingX=-1,
 p=>p.password.metrics.adornmentSize=24,
 p=>p.password.metrics.fieldHeight=32,
 p=>p.password.typography.body='missing',
 p=>p.password.icons.hidden='assembly-create',
 p=>p.password.state='revealed',
 p=>p.password.maskedLength=32,
 p=>p.password.helperText='X'.repeat(240)
 ]) {
  const base=folder(),p=make();change(p);
  // 24px adornment is valid when equal to icon size; force a conflicting size.
  if(p.password.metrics.adornmentSize===24)p.icons.find(i=>i.id==='password-hidden').sizePx=32;
  if(p.password.maskedLength===32)p.password.widths=[160,400];
  assert.throws(()=>applyProposal(base,p));assert.deepEqual(fs.readdirSync(base),[]);
 }
});
test('unchanged refinement preserves revision and byte identity',()=>{
 const base=folder();applyProposal(base,make());const before=snapshot(base);
 assert.equal(applyProposal(base,refine(base)).revision,1);assert.deepEqual(snapshot(base),before);
});
test('manual component SVG edits and stale revisions are preserved',()=>{
 const base=folder();applyProposal(base,make());
 fs.appendFileSync(path.join(base,'design-language/specimens/component-password-280.svg'),'<!-- owner edit -->');
 const before=snapshot(base);assert.throws(()=>applyProposal(base,refine(base)),/SVG was edited/);assert.deepEqual(snapshot(base),before);
 const stale=refine(base);stale.baseRevision=0;assert.throws(()=>applyProposal(base,stale),/Stale/);
});
