import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {applyProposal,validate} from './design-language.mjs';
const make=()=>JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json',import.meta.url),'utf8'));
const folder=()=>fs.mkdtempSync(path.join(os.tmpdir(),'design-language-identity-test-'));
const read=(b,f)=>fs.readFileSync(path.join(b,f),'utf8');
const refine=b=>{const {revision,decisions,...d}=JSON.parse(read(b,'design-language/design-language.json'));return {...d,baseRevision:revision};};
test('identity is optional, capped at three, and only references actual unique members',()=>{
 for(const ids of [[],['core'],['core','core-soft','core-strong']]){const d=make();d.identityPalette.memberIds=ids;validate(d);}
 for(const ids of [['missing'],['core','core'],['core','core-soft','core-strong','surface']]){const d=make();d.identityPalette.memberIds=ids;assert.throws(()=>validate(d));}
});
test('small identity table is separated from baseline colors and feeds button rendering',()=>{
 const b=folder();applyProposal(b,make());const md=read(b,'design-language.md');
 const identity=md.split('### App Identity Palette')[1].split('### Theme And Supporting Reference Colors')[0];
 assert.equal((identity.match(/!\[Color\]/g)||[]).length,1);
 assert.ok(identity.includes('#E60CE9'));assert.ok(!identity.includes('mui-light'));
 assert.ok(read(b,'design-language/specimens/button-primary-command-states.svg').includes('.default .face{fill:#E60CE9'));
 const before=read(b,'design-language.md');assert.equal(applyProposal(b,refine(b)).revision,1);assert.equal(read(b,'design-language.md'),before);
 const next=refine(b);next.identityPalette.memberIds=[];applyProposal(b,next);
 assert.ok(read(b,'design-language.md').includes('No custom identity colors'));
});
