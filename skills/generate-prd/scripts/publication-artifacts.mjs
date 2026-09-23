import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {publishPrdHtml} from './prd-html.mjs';
import {
  PUBLICATION_DOCUMENT_MAX_BYTES,
  PUBLICATION_DOCUMENTS_MAX_BYTES,
  PUBLICATION_RESOURCE_MAX_BYTES,
  PUBLICATION_RESOURCES_MAX_BYTES,
  canonicalPublicationJson as canonicalPayloadJson,
  validatePublicationPayload,
} from './product-publication-payload.mjs';

export const PUBLICATION_ARTIFACT_KINDS = Object.freeze({
  manifest: Object.freeze({artifactKind: 'prd-publication', artifactSchemaVersion: '1.0'}),
  ux: Object.freeze({artifactKind: 'ux-design', artifactSchemaVersion: '0.2'}),
  designLanguage: Object.freeze({artifactKind: 'design-language', artifactSchemaVersion: '0.14'}),
  ui: Object.freeze({artifactKind: 'ui-composition', artifactSchemaVersion: '0.2'}),
  component: Object.freeze({artifactKind: 'component-design', artifactSchemaVersion: '0.2'}),
});

export const MAX_DECODED_ARTIFACT_BYTES = PUBLICATION_DOCUMENT_MAX_BYTES;
export const MAX_DECODED_PUBLICATION_BYTES = PUBLICATION_DOCUMENTS_MAX_BYTES;
export const MAX_PUBLICATION_RESOURCE_BYTES = PUBLICATION_RESOURCE_MAX_BYTES;
export const MAX_PUBLICATION_RESOURCE_TOTAL_BYTES = PUBLICATION_RESOURCES_MAX_BYTES;

const SAFE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/u;

function fail(message) {
  throw new Error(message);
}

function compareCodePoints(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isPlainObject(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value, keys, label) {
  if (!isPlainObject(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort(compareCodePoints);
  const expected = [...keys].sort(compareCodePoints);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`${label} must contain exactly: ${expected.join(', ')}`);
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export const canonicalPublicationJson = canonicalPayloadJson;

function decodeUtf8(bytes, label) {
  try {
    return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  } catch {
    fail(`${label} must decode to UTF-8`);
  }
}

function validateSvgBytes(bytes, label) {
  const source = decodeUtf8(bytes, label);
  if (source.includes('\0')
    || /<(?:[A-Za-z_][\w.-]*:)?(?:script|foreignObject|iframe|object|embed|style|animate|animateMotion|animateTransform|set|discard|mpath)\b/iu.test(source)
    || /<!doctype\b|<!entity\b|\s(?:on[a-z]+|style|xml:base)\s*=/iu.test(source)) {
    fail(`${label} SVG contains active or off-site content`);
  }
  for (const match of source.matchAll(/\s([A-Za-z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/gsu)) {
    const name = match[1].toLowerCase();
    const value = match[3].trim();
    if (name === 'style' || name === 'xml:base' || name.startsWith('on') || value.includes('\\')) {
      fail(`${label} SVG contains active or off-site content`);
    }
    if (['href', 'xlink:href', 'src', 'data', 'poster', 'action', 'formaction'].includes(name)
      && value !== '' && !/^#[A-Za-z_][A-Za-z0-9_.:-]*$/u.test(value)) {
      fail(`${label} SVG contains active or off-site content`);
    }
    for (const urlMatch of value.matchAll(/url\s*\(\s*(["']?)(.*?)\1\s*\)/giu)) {
      if (!/^#[A-Za-z_][A-Za-z0-9_.:-]*$/u.test(urlMatch[2].trim())) {
        fail(`${label} SVG contains active or off-site content`);
      }
    }
  }
}

function detectedMimeType(bytes) {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length >= 45 && bytes.subarray(0, 8).equals(png)
    && bytes.subarray(12, 16).toString('ascii') === 'IHDR'
    && bytes.subarray(bytes.length - 8, bytes.length - 4).toString('ascii') === 'IEND') return 'image/png';
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8
    && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) return 'image/jpeg';
  if (bytes.length >= 20 && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
    && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.subarray(12, 16).toString('ascii'))
    && bytes.readUInt32LE(4) + 8 <= bytes.length) return 'image/webp';
  const prefix = bytes.subarray(0, Math.min(bytes.length, 4096)).toString('utf8').replace(/^\uFEFF/u, '').trimStart();
  if (/^(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/iu.test(prefix)) return 'image/svg+xml';
  return undefined;
}

function containedPath(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function loadResourceBytes(contextDirectory, descriptor, label) {
  if (typeof contextDirectory !== 'string' || contextDirectory.length === 0) {
    fail(`${label} requires the exact persisted context directory`);
  }
  const root = fs.realpathSync.native(path.resolve(contextDirectory));
  const candidate = path.resolve(root, ...descriptor.path.split('/'));
  if (!containedPath(root, candidate)) fail(`${label}.path escapes the context directory`);
  let cursor = root;
  for (const segment of descriptor.path.split('/')) {
    cursor = path.join(cursor, segment);
    let metadata;
    try { metadata = fs.lstatSync(cursor); } catch { fail(`${label} is missing: ${descriptor.path}`); }
    if (metadata.isSymbolicLink()) fail(`${label} must not traverse a symbolic link or junction`);
  }
  const realCandidate = fs.realpathSync.native(candidate);
  if (!containedPath(root, realCandidate)) fail(`${label}.path escapes the context directory`);
  const metadata = fs.statSync(realCandidate);
  if (!metadata.isFile() || metadata.size !== descriptor.byteLength) fail(`${label} size does not match its descriptor`);
  const bytes = fs.readFileSync(realCandidate);
  if (sha256(bytes) !== descriptor.sha256) fail(`${label} hash does not match its descriptor`);
  const detected = detectedMimeType(bytes);
  if (detected !== descriptor.mediaType) fail(`${label} bytes do not match ${descriptor.mediaType}`);
  if (detected === 'image/svg+xml') validateSvgBytes(bytes, label);
  return bytes;
}

function decodePackage(artifact) {
  const decoded = validatePublicationPayload(artifact);
  return {...decoded, resources: artifact.resources};
}

function validatePackageDocument(artifact, document, resources) {
  const expected = Object.values(PUBLICATION_ARTIFACT_KINDS).find(({artifactKind}) => artifactKind === artifact.artifactKind);
  if (!expected || artifact.artifactSchemaVersion !== expected.artifactSchemaVersion) {
    fail(`artifact ${artifact.id} uses unsupported ${artifact.artifactKind} schema ${artifact.artifactSchemaVersion}`);
  }
  if (!artifact.consumerDomains.includes('prd')) fail(`artifact ${artifact.id} is not published to the prd domain`);
  let spec = document;
  if (artifact.artifactKind === PUBLICATION_ARTIFACT_KINDS.manifest.artifactKind) {
    exactKeys(document, ['schemaVersion', 'uxArtifactId', 'designLanguageArtifactId', 'uiArtifactId', 'componentArtifactIds'], `artifact ${artifact.id} document`);
    if (document.schemaVersion !== '1.0') fail(`artifact ${artifact.id} publication manifest must use schema 1.0`);
    for (const [key, value] of [['uxArtifactId', document.uxArtifactId], ['designLanguageArtifactId', document.designLanguageArtifactId]]) {
      if (typeof value !== 'string' || !SAFE_ID_PATTERN.test(value)) fail(`artifact ${artifact.id} document.${key} must be an artifact ID`);
    }
    if (document.uiArtifactId !== null && (typeof document.uiArtifactId !== 'string' || !SAFE_ID_PATTERN.test(document.uiArtifactId))) {
      fail(`artifact ${artifact.id} document.uiArtifactId must be null or an artifact ID`);
    }
    if (!Array.isArray(document.componentArtifactIds) || document.componentArtifactIds.length > 64
      || document.componentArtifactIds.some((id) => typeof id !== 'string' || !SAFE_ID_PATTERN.test(id))
      || new Set(document.componentArtifactIds).size !== document.componentArtifactIds.length) {
      fail(`artifact ${artifact.id} document.componentArtifactIds must contain unique artifact IDs`);
    }
    const namedIds = [document.uxArtifactId, document.designLanguageArtifactId,
      ...(document.uiArtifactId ? [document.uiArtifactId] : []), ...document.componentArtifactIds];
    if (new Set(namedIds).size !== namedIds.length) fail(`artifact ${artifact.id} publication roles must name distinct artifacts`);
    if (resources.length) fail(`artifact ${artifact.id} publication manifests cannot declare external resources`);
    return document;
  }
  if (artifact.artifactKind === PUBLICATION_ARTIFACT_KINDS.designLanguage.artifactKind) {
    exactKeys(document, ['designLanguage', 'reviewLayout'], `artifact ${artifact.id} document`);
    if (document.designLanguage?.schemaVersion !== '0.14') fail(`artifact ${artifact.id} design language must use schema 0.14`);
    if (document.reviewLayout?.version !== 7) fail(`artifact ${artifact.id} review layout must use version 7`);
    if (resources.length) fail(`artifact ${artifact.id} design-language packages cannot declare external resources`);
    return document;
  }
  if (!isPlainObject(spec) || spec.schemaVersion !== expected.artifactSchemaVersion) {
    fail(`artifact ${artifact.id} document must use schema ${expected.artifactSchemaVersion}`);
  }
  if (artifact.artifactKind === PUBLICATION_ARTIFACT_KINDS.ux.artifactKind && resources.length) {
    fail(`artifact ${artifact.id} UX packages cannot declare external resources`);
  }
  if ([PUBLICATION_ARTIFACT_KINDS.ui.artifactKind, PUBLICATION_ARTIFACT_KINDS.component.artifactKind].includes(artifact.artifactKind)) {
    const imageAssets = Array.isArray(spec.assets) ? spec.assets.filter((asset) => asset?.kind === 'image') : [];
    const resourcesByPath = new Map(resources.map((resource) => [resource.logicalPath, resource]));
    if (imageAssets.length !== resources.length) fail(`artifact ${artifact.id} resources must exactly cover its image assets`);
    for (const asset of imageAssets) {
      const resource = resourcesByPath.get(asset.path);
      if (!resource || resource.sha256 !== asset.sha256 || resource.mediaType !== asset.mimeType) {
        fail(`artifact ${artifact.id} resource does not bind image asset ${String(asset.id)}`);
      }
    }
  }
  return spec;
}

function collectOutputFiles(root) {
  const outputs = new Map();
  function visit(directory, prefix = '') {
    const entries = fs.readdirSync(directory, {withFileTypes: true})
      .sort((left, right) => compareCodePoints(left.name, right.name));
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      const metadata = fs.lstatSync(absolute);
      if (metadata.isSymbolicLink()) fail(`Renderer emitted a linked path: ${relative}`);
      if (metadata.isDirectory()) visit(absolute, relative);
      else if (metadata.isFile()) outputs.set(relative, fs.readFileSync(absolute));
      else fail(`Renderer emitted an unsupported filesystem entry: ${relative}`);
    }
  }
  visit(root);
  return outputs;
}

function writeCanonicalDocument(file, document) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, `${canonicalPublicationJson(document)}\n`, 'utf8');
}

/**
 * Build the rich publication output set from the closed artifacts in one validated context.
 * Returns null when the context has no rich-publication artifacts, preserving the compact
 * product-model review for contexts produced before this optional publication layer exists.
 */
export function buildArtifactPublication(context, {contextDirectory} = {}) {
  const manifestArtifacts = context.artifacts.filter((artifact) => artifact.artifactKind === PUBLICATION_ARTIFACT_KINDS.manifest.artifactKind);
  if (manifestArtifacts.length === 0) return null;
  if (manifestArtifacts.length !== 1) fail('Publication accepts exactly one prd-publication manifest artifact');
  const manifestArtifact = manifestArtifacts[0];
  const decodedManifest = decodePackage(manifestArtifact);
  if (decodedManifest.resources.length || manifestArtifact.payload.encoding !== 'json') {
    fail(`artifact ${manifestArtifact.id} publication manifest must use identity JSON without resources`);
  }
  const manifest = validatePackageDocument(manifestArtifact, decodedManifest.document, decodedManifest.resources);
  const artifactsById = new Map(context.artifacts.map((artifact) => [artifact.id, artifact]));
  function namedArtifact(id, role, expected) {
    const artifact = artifactsById.get(id);
    if (!artifact) fail(`Publication manifest ${manifestArtifact.id} references missing ${role} artifact ${id}`);
    if (artifact.artifactKind !== expected.artifactKind || artifact.artifactSchemaVersion !== expected.artifactSchemaVersion) {
      fail(`Publication manifest ${manifestArtifact.id} ${role} must reference ${expected.artifactKind} schema ${expected.artifactSchemaVersion}`);
    }
    return artifact;
  }
  const uxArtifact = namedArtifact(manifest.uxArtifactId, 'UX', PUBLICATION_ARTIFACT_KINDS.ux);
  const designArtifact = namedArtifact(manifest.designLanguageArtifactId, 'design language', PUBLICATION_ARTIFACT_KINDS.designLanguage);
  const uiArtifact = manifest.uiArtifactId === null ? null : namedArtifact(manifest.uiArtifactId, 'UI', PUBLICATION_ARTIFACT_KINDS.ui);
  const componentArtifacts = manifest.componentArtifactIds.map((id) => namedArtifact(id, 'component', PUBLICATION_ARTIFACT_KINDS.component));
  if (componentArtifacts.length && !uiArtifact) fail('component-design publication requires one ui-composition artifact');

  const selectedIds = [uxArtifact.id, designArtifact.id, ...(uiArtifact ? [uiArtifact.id] : []), ...componentArtifacts.map(({id}) => id)];
  const dependencies = new Map(manifestArtifact.artifactDependencies.map((dependency) => [dependency.id, dependency]));
  if (dependencies.size !== selectedIds.length || selectedIds.some((id) => !dependencies.has(id))) {
    fail(`Publication manifest ${manifestArtifact.id} artifactDependencies must exactly bind every selected artifact`);
  }
  for (const id of selectedIds) {
    const dependency = dependencies.get(id);
    const artifact = artifactsById.get(id);
    if (dependency.revision !== artifact.revision || dependency.materialSha256 !== artifact.materialSha256) {
      fail(`Publication manifest ${manifestArtifact.id} has a stale dependency binding for ${id}`);
    }
  }

  const selected = [uxArtifact, designArtifact, ...(uiArtifact ? [uiArtifact] : []), ...componentArtifacts];
  const packages = selected.map((artifact) => {
    const decoded = decodePackage(artifact);
    return {...decoded, artifact, document: validatePackageDocument(artifact, decoded.document, decoded.resources)};
  });
  const decodedTotal = decodedManifest.decodedBytes + packages.reduce((total, entry) => total + entry.decodedBytes, 0);
  if (decodedTotal > MAX_DECODED_PUBLICATION_BYTES) fail(`Publication artifacts exceed the ${MAX_DECODED_PUBLICATION_BYTES}-byte decoded aggregate limit`);
  const resourceTotal = [...new Map(packages.flatMap((entry) => entry.resources)
    .map((resource) => [resource.sha256, resource])).values()]
    .reduce((total, resource) => total + resource.byteLength, 0);
  if (resourceTotal > MAX_PUBLICATION_RESOURCE_TOTAL_BYTES) fail(`Publication resources exceed the ${MAX_PUBLICATION_RESOURCE_TOTAL_BYTES}-byte aggregate limit`);

  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-prd-render-'));
  try {
    const sourceRoot = path.join(work, 'sources');
    const outputRoot = path.join(work, 'output');
    fs.mkdirSync(sourceRoot, {recursive: true});
    const byArtifactId = new Map(packages.map((entry) => [entry.artifact.id, entry]));
    const resourceReceipt = [];
    for (const entry of packages) {
      if (!SAFE_ID_PATTERN.test(entry.artifact.id)) fail(`artifact ${entry.artifact.id} has an unsafe publication ID`);
      const artifactRoot = path.join(sourceRoot, entry.artifact.id);
      fs.mkdirSync(artifactRoot, {recursive: true});
      for (const resource of entry.resources) {
        const bytes = loadResourceBytes(contextDirectory, resource, `artifact ${entry.artifact.id} resource ${resource.logicalPath}`);
        const destination = path.resolve(artifactRoot, ...resource.logicalPath.split('/'));
        if (!containedPath(artifactRoot, destination)) fail(`artifact ${entry.artifact.id} logical resource path escapes its source root`);
        fs.mkdirSync(path.dirname(destination), {recursive: true});
        fs.writeFileSync(destination, bytes);
        resourceReceipt.push({
          artifactId: entry.artifact.id,
          id: resource.id,
          logicalPath: resource.logicalPath,
          path: resource.path,
          mediaType: resource.mediaType,
          byteLength: resource.byteLength,
          sha256: resource.sha256,
        });
      }
    }

    const uxEntry = byArtifactId.get(uxArtifact.id);
    const designEntry = byArtifactId.get(designArtifact.id);
    const uxFile = path.join(sourceRoot, uxArtifact.id, 'ux.json');
    const designFile = path.join(sourceRoot, designArtifact.id, 'design-language.json');
    const layoutFile = path.join(sourceRoot, designArtifact.id, 'review-layout.json');
    writeCanonicalDocument(uxFile, uxEntry.document);
    writeCanonicalDocument(designFile, designEntry.document.designLanguage);
    writeCanonicalDocument(layoutFile, designEntry.document.reviewLayout);

    let uiFile;
    if (uiArtifact) {
      uiFile = path.join(sourceRoot, uiArtifact.id, 'ui.json');
      writeCanonicalDocument(uiFile, byArtifactId.get(uiArtifact.id).document);
    }
    const componentFiles = componentArtifacts.map((artifact) => {
      const file = path.join(sourceRoot, artifact.id, 'component.json');
      writeCanonicalDocument(file, byArtifactId.get(artifact.id).document);
      return file;
    });

    publishPrdHtml(uxFile, designFile, outputRoot, {
      sourceRoot,
      layoutFile,
      uxLabel: `artifact:${uxArtifact.id}@${uxArtifact.revision}`,
      designLabel: `artifact:${designArtifact.id}@${designArtifact.revision}`,
      layoutLabel: `artifact:${designArtifact.id}@${designArtifact.revision}#review-layout`,
      ...(uiArtifact ? {uiFile, uiLabel: `artifact:${uiArtifact.id}@${uiArtifact.revision}`} : {}),
      ...(componentFiles.length ? {
        componentFiles,
        componentLabels: componentArtifacts.map((artifact) => `artifact:${artifact.id}@${artifact.revision}`),
      } : {}),
    });
    return {
      files: collectOutputFiles(outputRoot),
      resources: resourceReceipt.sort((left, right) => compareCodePoints(
        `${left.artifactId}/${left.logicalPath}`,
        `${right.artifactId}/${right.logicalPath}`,
      )),
    };
  } finally {
    fs.rmSync(work, {recursive: true, force: true});
  }
}
