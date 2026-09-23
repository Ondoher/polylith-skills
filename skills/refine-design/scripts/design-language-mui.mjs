import fs from 'node:fs';
import {fail,identifier} from './design-language-support.mjs';
import {validate} from './design-language.mjs';

export const muiDefaults=JSON.parse(fs.readFileSync(new URL('../assets/mui-palette-defaults.json',import.meta.url),'utf8'));
function tokenValue(mode,token){
 const value=token.split('.').reduce((v,k)=>v&&Object.hasOwn(v,k)?v[k]:undefined,muiDefaults.modes[mode]);
 if(typeof value!=='string')fail('Unknown MUI color token: '+token);
 return value;
}
function rgb(value){
 if(/^#[a-f\d]{3}$/i.test(value))return [...value.slice(1)].map(c=>parseInt(c+c,16));
 if(/^#[a-f\d]{6}$/i.test(value))return [1,3,5].map(i=>parseInt(value.slice(i,i+2),16));
 const match=/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(0(?:\.\d+)?|1)\)$/.exec(value);
 if(match)return match.slice(1).map(Number);
 fail('Unsupported MUI color value: '+value);
}
export function muiColor(mode,token,onToken){
 if(!Object.hasOwn(muiDefaults.modes,mode))fail('Explicit MUI mode must be light or dark');
 const raw=tokenValue(mode,token),channels=rgb(raw);
 if(channels.length===4){
  if(!onToken)fail('Alpha MUI token requires an explicit preview surface: '+token);
  const surface=rgb(tokenValue(mode,onToken));
  if(surface.length!==3)fail('Preview surface must be opaque');
  return {raw,value:'#'+surface.map((v,i)=>Math.round(v*(1-channels[3])+channels[i]*channels[3]).toString(16).padStart(2,'0')).join('').toUpperCase(),onToken};
 }
 return {raw,value:'#'+channels.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase(),onToken:null};
}

/** Prepare a proposal only. Preserve all existing specified roles unless explicitly selected for replacement.
 * Persist through applyProposal so accepted consumers retain normal dependency protection.
 */
export function withMuiDefaults(proposal,{framework,version,mode,roleTokens,replace=[]}){
 if(framework!=='mui')fail('MUI defaults require an explicit MUI application');
 if(version!==muiDefaults.version)fail('MUI version mismatch: refresh the snapshot from the target installed package');
 if(!['light','dark'].includes(mode))fail('Explicit MUI mode required');
 if(!Array.isArray(replace)||new Set(replace).size!==replace.length||replace.some(id=>!Object.hasOwn(roleTokens,id)))fail('Invalid replacement targets');
 const next=structuredClone(proposal),imported=[],preserved=[];
 for(const [id,selection] of Object.entries(roleTokens)){
  identifier(id,'role ID');
  const old=next.theme.roles.find(r=>r.id===id);
  if(old&&old.status!=='unspecified'&&!replace.includes(id)){preserved.push(id);continue;}
  if(!selection||Object.keys(selection).some(k=>!['token','onToken'].includes(k))||typeof selection.token!=='string')fail('Invalid MUI token selection');
  const color=muiColor(mode,selection.token,selection.onToken);
  // Separate IDs avoid changing product branding members when semantic roles share a color.
  const memberId='mui-'+mode+'-'+id;identifier(memberId,'MUI member ID');
  const source='@mui/material '+version+' '+mode+' palette.'+selection.token;
  const rationale=source+' = '+color.raw+(color.onToken?'; preview composited on palette.'+color.onToken:'')+'. Framework default; not an app branding choice.';
  const member={id:memberId,name:'MUI '+selection.token,value:color.value,purpose:rationale,rationale,status:'proposed'};
  const existing=next.palette.members.find(m=>m.id===memberId);
  if(existing&&JSON.stringify(existing)!==JSON.stringify(member))fail('Existing MUI snapshot member differs; reconcile explicitly: '+memberId);
  if(!existing)next.palette.members.push(member);
  const record={id,name:old?.name??id,paletteRef:{paletteId:next.palette.id,memberId},purpose:rationale,rationale:'Use the framework baseline. Runtime CSS references the applicable MUI variable; preview hex values are resolved documentation data.',status:old?.status==='accepted'?'accepted':'proposed'};
  if(old)next.theme.roles[next.theme.roles.indexOf(old)]=record;else next.theme.roles.push(record);
  next.unspecifiedRequirements=next.unspecifiedRequirements.filter(r=>r.target!=='role:'+id);
  imported.push({id,token:selection.token,...color,source});
 }
 validate(next);
 return {proposal:next,imported,preserved};
}
