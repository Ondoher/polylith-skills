import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {applyProposal} from './design-language.mjs';
import {spacingDrawings,validateSpacing,verticalSpacingLayout} from './design-language-spacing.mjs';
const createFoundationProposal=()=>JSON.parse(fs.readFileSync(new URL('../references/extras-proposal.json',import.meta.url),'utf8'));
const spacing={scale:[4,8,12,16,24],groupGap:8,regionPadding:16,regionGap:24,status:'defaulted',fieldGap:16,helperGap:4,helperLineHeight:20};
const layout=JSON.parse(fs.readFileSync(new URL('../references/layout-defaults.json',import.meta.url),'utf8'));
const config={version:7,title:'Spacing review',visualDirection:null,layoutNotes:null,spacing,layout};
const refine=b=>{const {revision,decisions,...d}=JSON.parse(fs.readFileSync(path.join(b,'design-language/design-language.json'),'utf8'));return {...d,baseRevision:revision};};
test('current spacing values drive diagrams, rerender stably, and protect edited assets',()=>{
 const b=fs.mkdtempSync(path.join(os.tmpdir(),'spacing-review-'));
 const r=applyProposal(b,createFoundationProposal(),{reviewLayout:config});
 assert.ok(r.pages.some(p=>p.endsWith('layout.md')));assert.equal(r.svgs.filter(p=>path.basename(p).startsWith('spacing-')).length,2);
 const file=path.join(b,'design-language/specimens/spacing-context.svg'),before=fs.readFileSync(file,'utf8');
 assert.ok(before.includes('Field gap 16px'));assert.ok(before.includes('Helper gap 4px'));assert.ok(before.includes('Horizontal spacing within a control group'));
 applyProposal(b,refine(b));assert.equal(fs.readFileSync(file,'utf8'),before);
 fs.appendFileSync(file,'<!-- edited -->');assert.throws(()=>applyProposal(b,refine(b)),/Spacing SVG was edited/);
});
test('scale updates change geometry while invalid references are rejected',()=>{
 const before=spacingDrawings(config).get('design-language/specimens/spacing-context.svg');
 const next=structuredClone(config);next.spacing.regionGap=16;
 assert.notEqual(spacingDrawings(next).get('design-language/specimens/spacing-context.svg'),before);
 assert.throws(()=>validateSpacing({...spacing,groupGap:10}),/reference a scale/);
 assert.throws(()=>validateSpacing({...spacing,scale:[8,4]}),/increase/);
});

test('horizontal and vertical examples coexist and helpers extend blocks without changing field gaps',()=>{
 const s={...spacing,fieldGap:16,helperGap:4,helperLineHeight:20};
 const a=verticalSpacingLayout(s,false),b=verticalSpacingLayout(s,true);
 assert.equal(a.secondLabelY-a.firstEnd,16);assert.equal(b.secondLabelY-b.firstEnd,16);
 assert.equal(b.secondLabelY-a.secondLabelY,24);assert.equal(b.helperY-b.inputY-40,4);
 const c={...config,spacing:s};const svg=spacingDrawings(c).get('design-language/specimens/spacing-context.svg');
 assert.ok(svg.includes('Without helper text'));assert.ok(svg.includes('With helper text'));assert.ok(svg.includes('Horizontal spacing within a control group'));
});
