import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

function inspectDirectory(candidate, required = false) {
  let stats;
  try {
    stats = fs.lstatSync(candidate);
  } catch (error) {
    if (error.code === 'ENOENT' && !required) return;
    throw error;
  }
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error(`Product location must use ordinary directories, not files or links: ${candidate}`);
  }
}

/** Resolve canonical design paths after the caller establishes the human product name. No writes. */
export function resolveProductLocation({repositoryRoot, productName}) {
  if (typeof productName !== 'string' || productName.trim() === '') {
    throw new Error('Ask the owner for the product name before choosing a product data location');
  }
  // Preserve a clear display name, including spaces and case, rather than inventing
  // a slug. Stay compatible with portable source labels and Windows filenames.
  if (productName !== productName.trim() || productName.length > 100
    || !/^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(productName)
    || /[. ]$/.test(productName)
    || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(productName)) {
    throw new Error('Ask the owner for a safe product folder name: one portable name without separators, reserved names, or trailing dots/spaces');
  }
  if (typeof repositoryRoot !== 'string' || repositoryRoot.trim() === '') {
    throw new Error('A repository root is required to persist product design data');
  }
  const root = path.resolve(repositoryRoot);
  // Reject linked ancestors as well as the destination, including dangling links.
  const parsed = path.parse(root);
  let ancestor = parsed.root;
  for (const segment of root.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    ancestor = path.join(ancestor, segment);
    inspectDirectory(ancestor, true);
  }
  const git = path.join(root, '.git');
  const gitStats = fs.lstatSync(git, {throwIfNoEntry: false});
  if (!gitStats || gitStats.isSymbolicLink() || (!gitStats.isDirectory() && !gitStats.isFile())) {
    throw new Error('repositoryRoot must be the repository root containing .git (directory or worktree file)');
  }
  const products = path.join(root, 'product');
  const productRoot = path.join(products, productName);
  inspectDirectory(products);
  inspectDirectory(productRoot);
  if (fs.existsSync(products)) {
    const collision = fs.readdirSync(products).find(name => name !== productName && name.toLowerCase() === productName.toLowerCase());
    if (collision) throw new Error(`Product name collides with existing folder ${collision}; resolve its identity before writing`);
  }
  if (fs.existsSync(path.join(productRoot, '.git'))) {
    throw new Error('Product data location must not be an independently rooted repository');
  }
  return {
    repositoryRoot: root,
    productName,
    relativeRoot: `product/${productName}`,
    productRoot,
    currentPath: path.join(productRoot, 'current.json'),
    uxPath: path.join(productRoot, 'ux', 'ux-spec.json'),
    designLanguagePath: path.join(productRoot, 'design-language', 'design-language.json'),
    uiPath: path.join(productRoot, 'ui', 'ui-spec.json'),
    contextsRoot: path.join(productRoot, 'contexts'),
    publicationRoot: path.join(productRoot, 'prd'),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const values = {};
    const args = process.argv.slice(2);
    for (let index = 0; index < args.length; index += 2) {
      const key = args[index];
      if (!['--repo', '--name'].includes(key) || Object.hasOwn(values, key)
        || !args[index + 1] || args[index + 1].startsWith('--')) {
        throw new Error('Usage: product-location.mjs --repo <repository-root> --name <confirmed-product-name>');
      }
      values[key] = args[index + 1];
    }
    const result = resolveProductLocation({repositoryRoot: values['--repo'], productName: values['--name']});
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
