import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {applyProposal} from './design-language.mjs';
import {iconCatalog,iconGeometry} from './design-language-icons.mjs';
const make=()=>JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json',import.meta.url),'utf8'));
const folder=()=>fs.mkdtempSync(path.join(os.tmpdir(),'design-language-icons-test-'));
const saved=base=>JSON.parse(fs.readFileSync(path.join(base,'design-language/design-language.json'),'utf8'));
const refine=base=>{const {revision,decisions,...body}=saved(base);return {...body,baseRevision:revision};};
const svg=(base,id)=>fs.readFileSync(path.join(base,'design-language/specimens/'+id+'.svg'),'utf8');
const snapshot=base=>Object.fromEntries(['design-language.md','design-language/design-language.json',...fs.readdirSync(path.join(base,'design-language/specimens')).map(n=>'design-language/specimens/'+n)].map(file=>[file,fs.readFileSync(path.join(base,file),'utf8')]));
test('bundled geometry matches the pinned MUI source paths and provenance',()=>{
 const proposal=make();
 for(const asset of iconCatalog.assets) {
  const source=fs.readFileSync(new URL('../assets/icons/source/'+asset.name+'.js',import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'),asset.sourceSha256);
  const geometry=iconGeometry({asset:{name:asset.name}});
  assert.deepEqual(geometry.paths.map(p=>p.d),[...source.toString().matchAll(/d: "([^"]+)"/g)].map(m=>m[1]));
  assert.equal(geometry.viewBox,'0 0 24 24');
 }
 assert.equal(iconCatalog.library,'@mui/icons-material');
 assert.equal(proposal.icons[0].asset.version,iconCatalog.version);
});
test('sheet includes exact icon assets, legible labels and a still-unspecified placeholder',()=>{
 const base=folder(),report=applyProposal(base,make());
 assert.equal(report.outcome,'partial');
 assert.equal(saved(base).icons.find(icon=>icon.id==='assembly-create').asset,null);
 const missing=report.appliedDefaults.find(x=>x.target==='icon:assembly-create');
 assert.equal(missing.value,'placeholder');
 const sheet=svg(base,'icons');
 assert.ok(sheet.includes('Reusable component icons'));assert.ok(sheet.includes('Product-action icons belong to product comps'));
 assert.ok(sheet.includes('Missing icon choice / placeholder'));assert.ok(sheet.includes('<path'));
 assert.ok(!sheet.includes('<text')); assert.ok(!sheet.includes('href='));
 const ids=[...sheet.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const icon of make().icons) {
  const image=svg(base,'icon-'+icon.id);
  assert.ok(image.includes('width="'+icon.sizePx+'"'));assert.ok(image.includes('height="'+icon.sizePx+'"'));
  if(icon.asset)assert.ok(image.includes(iconGeometry(icon).paths[0].d));
 }
 const md=fs.readFileSync(report.document,'utf8');
 assert.ok(md.includes('@mui/icons-material 7.3.4'));
 assert.ok(md.indexOf('## Open Questions')>md.indexOf('## Reusable Component Icons'));
});
test('replacing one proposed asset changes its specimen and sheet only',()=>{
 const base=folder();applyProposal(base,make());const before=snapshot(base);
 const next=refine(base);next.icons.find(i=>i.id==='file-export').asset.name='Download';
 applyProposal(base,next);const after=snapshot(base);
 assert.deepEqual(Object.keys(after).filter(p=>p.endsWith('.svg')&&after[p]!==before[p]).sort(),[
 'design-language/specimens/icon-file-export.svg','design-language/specimens/icons.svg']);
});
test('resolving a placeholder keeps its identity and removes its active missing requirement',()=>{
 const base=folder();applyProposal(base,make());
 const next=refine(base),icon=next.icons.find(item=>item.id==='assembly-create');icon.asset=structuredClone(next.icons[2].asset);icon.status='proposed';
 next.unspecifiedRequirements=next.unspecifiedRequirements.filter(r=>r.target!=='icon:assembly-create');
 const report=applyProposal(base,next);
 assert.equal(saved(base).icons.find(item=>item.id==='assembly-create').id,'assembly-create');
 assert.ok(!report.appliedDefaults.some(x=>x.target==='icon:assembly-create'));
 assert.ok(!svg(base,'icon-assembly-create').includes('Unspecified: placeholder'));
});
test('accepted icon protects geometry, size and indirect color without approval',()=>{
 const base=folder(),proposal=make();proposal.icons[0].status='accepted';
 assert.throws(()=>applyProposal(base,proposal),/acceptance/i);
 applyProposal(base,proposal,{accept:['icon:playback-play'],reason:'Simulated owner acceptance.'});
 const before=snapshot(base);
 for(const change of [p=>p.icons[0].asset.name='Pause',p=>p.icons[0].sizePx=32,p=>p.palette.members.find(m=>m.id==='mui-light-body-text').value='#303030']) {
  const next=refine(base);change(next);
  assert.throws(()=>applyProposal(base,next),/Accepted icon/);assert.deepEqual(snapshot(base),before);
 }
 const approved=refine(base);approved.icons[0].sizePx=32;
 applyProposal(base,approved,{accept:['icon:playback-play'],reason:'Simulated resized icon approval.'});
 assert.ok(svg(base,'icon-playback-play').includes('width="32"'));
});
test('icon defaults expose inherited missing colors and cannot be accepted',()=>{
 const base=folder(),proposal=make(),role=proposal.theme.roles.find(item=>item.id==='panel-border');
 role.paletteRef=null;role.status='unspecified';proposal.icons[0].colorRole='panel-border';
 proposal.unspecifiedRequirements.push({id:'panel-border-choice',target:'role:panel-border',description:'Choose the panel border color.',decisionOwner:'UI',renderFallback:{value:'#E0E0E0',source:'current review fallback'}});
 const report=applyProposal(base,proposal);
 assert.ok(report.appliedDefaults.find(x=>x.target==='role:panel-border').affectedTargets.includes('icon:playback-play'));
 const next=refine(base);next.icons[0].status='accepted';
 assert.throws(()=>applyProposal(base,next,{accept:['icon:playback-play'],reason:'Test'}),/provisional color/);
});
test('unsupported assets and contradictory records fail before publishing',()=>{
 for(const change of [
 p=>p.icons[0].asset.name='UnknownIcon',
 p=>p.icons[0].asset.version='latest',
 p=>p.icons[0].asset.variant='Outlined',
 p=>p.icons[0].colorRole='missing',
 p=>p.icons[0].sizePx=0,
 p=>p.icons.push(p.icons[0]),
 p=>p.unspecifiedRequirements=p.unspecifiedRequirements.filter(r=>!r.target.startsWith('icon:')),
 p=>p.icons.find(icon=>icon.id==='assembly-create').status='proposed'
 ]) {
  const base=folder(),proposal=make();change(proposal);
  assert.throws(()=>applyProposal(base,proposal));assert.deepEqual(fs.readdirSync(base),[]);
 }
});
test('unchanged icon refinement preserves bytes and revision',()=>{
 const base=folder();applyProposal(base,make());const before=snapshot(base);
 assert.equal(applyProposal(base,refine(base)).revision,1);assert.deepEqual(snapshot(base),before);
});
test('manual icon edits are not overwritten',()=>{
 const base=folder();applyProposal(base,make());
 fs.appendFileSync(path.join(base,'design-language/specimens/icon-playback-play.svg'),'<!-- manual -->');
 const before=snapshot(base);assert.throws(()=>applyProposal(base,refine(base)),/SVG was edited/);assert.deepEqual(snapshot(base),before);
});
