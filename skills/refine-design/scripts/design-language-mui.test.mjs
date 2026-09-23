import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {muiDefaults,muiColor,withMuiDefaults} from './design-language-mui.mjs';
const make=()=>{
 const proposal=JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json',import.meta.url),'utf8'));
 const role=proposal.theme.roles.find(item=>item.id==='panel-border');
 role.paletteRef=null;role.status='unspecified';
 proposal.palette.members=proposal.palette.members.filter(item=>!['mui-light-panel-border','mui-light-primary-action'].includes(item.id));
 proposal.unspecifiedRequirements.push({id:'panel-border-mapping',target:'role:panel-border',description:'Choose panel border mapping.',decisionOwner:'UI',renderFallback:{value:'#E0E0E0',source:'current test fallback'}});
 return proposal;
};
const options={framework:'mui',version:muiDefaults.version,mode:'light',roleTokens:{'primary-action':{token:'primary.main'},'panel-border':{token:'divider',onToken:'background.paper'}}};
test('verified MUI defaults distinguish modes and alpha surfaces',()=>{
 assert.equal(muiColor('light','primary.main').value,'#1976D2');
 assert.equal(muiColor('dark','primary.main').value,'#90CAF9');
 assert.equal(muiColor('light','action.disabledBackground','background.paper').value,'#E0E0E0');
 assert.equal(muiColor('light','action.disabled','background.paper').value,'#BDBDBD');
 assert.throws(()=>muiColor('light','text.primary'),/surface/);
 assert.throws(()=>muiColor('light','text.primary','action.hover'),/opaque/);
});
test('MUI preparation preserves custom roles and branding, fills missing roles with traced defaults',()=>{
 const original=make(),copy=structuredClone(original),r=withMuiDefaults(original,options);
 assert.deepEqual(original,copy);
 assert.deepEqual(r.preserved,['primary-action']);
 assert.equal(r.proposal.palette.members.find(m=>m.id==='core').value,'#E60CE9');
 assert.equal(r.proposal.theme.roles.find(t=>t.id==='panel-border').status,'proposed');
 assert.ok(!r.proposal.unspecifiedRequirements.some(r=>r.target==='role:panel-border'));
 assert.ok(r.proposal.palette.members.find(m=>m.id==='mui-light-panel-border').purpose.includes('rgba(0, 0, 0, 0.12)'));
});
test('explicit replacement remaps semantic use without recoloring identity or inventing acceptance',()=>{
 const r=withMuiDefaults(make(),{...options,replace:['primary-action']});
 const role=r.proposal.theme.roles.find(t=>t.id==='primary-action');
 assert.equal(role.status,'proposed');
 assert.equal(r.proposal.palette.members.find(m=>m.id===role.paletteRef.memberId).value,'#1976D2');
 assert.equal(r.proposal.theme.roles.find(t=>t.id==='identity-header').paletteRef.memberId,'core');
 const again=withMuiDefaults(r.proposal,{...options,replace:['primary-action']});
 assert.deepEqual(again.proposal,r.proposal);
});
test('no silent framework, version or mode assumptions and unknown tokens fail',()=>{
 for(const override of [{framework:'other'},{version:'0.0.0'},{mode:'system'},{roleTokens:{x:{token:'not.real'}}}]){
  assert.throws(()=>withMuiDefaults(make(),{...options,...override}));
 }
});

test('MUI fixture renders through the standard pipeline with preserved branding and composited disabled text',async()=>{
 const {applyProposal}=await import('./design-language.mjs');
 const {default:os}=await import('node:os');
 const {default:path}=await import('node:path');
 const d=withMuiDefaults(make(),options).proposal;
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'design-language-mui-test-'));
 const report=applyProposal(base,d);
 const svg=fs.readFileSync(path.join(base,'design-language/specimens/button-primary-command-states.svg'),'utf8');
 const md=fs.readFileSync(report.document,'utf8');
 assert.ok(svg.includes('.default .face{fill:#E60CE9'));
 assert.ok(svg.includes('.hover .face{fill:#A108A3'));
 assert.ok(svg.includes('.disabled .label{fill:#A6A6A6}'));
 assert.ok(md.includes('@mui/material 9.4.0 light palette.divider'));
 assert.ok(!report.appliedDefaults.some(r=>r.target==='role:panel-border'));
 assert.equal(d.button.metrics.focusGap,null);
});
