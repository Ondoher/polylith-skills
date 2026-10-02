import fs from 'node:fs';
const dir = '.codex-tmp/descriptive-wireframe-ui-20261002/pair-1-A';
const source = JSON.parse(fs.readFileSync(`${dir}/layout/wireframe.json`, 'utf8'));
const lines = [];
function walk(node, depth = 0) {
 const {children, ...rest} = node;
 lines.push(' '.repeat(depth) + JSON.stringify(rest));
 children?.forEach(child => walk(child, depth + 1));
}
for (const part of source.parts) {
 lines.push(`PART ${part.id}`);
 if (part.id === 'workspace' || !part.id.startsWith('workspace')) walk(part.root);
 else {
  const original = source.parts[0].root;
  const lookup = new Map();
  const collect = node => { lookup.set(node.id, JSON.stringify(node)); node.children?.forEach(collect); };
  collect(original);
  const changed = node => { if (lookup.get(node.id) === JSON.stringify(node)) return; const {children,...rest} = node; lines.push(JSON.stringify(rest)); children?.forEach(changed); };
  changed(part.root);
 }
}
lines.push('SCENES', ...source.scenes.map(scene => JSON.stringify(scene)));
fs.writeFileSync(`${dir}/ui/source-structure.txt`, lines.join('\n'));
