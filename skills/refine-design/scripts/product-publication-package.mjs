import fs from 'node:fs';
import path from 'node:path';
import {loadUiImageAsset, validateUiImageAssetBytes} from './ui-composition.mjs';
import {ensureUnlinkedPath, fail, sha256, writeImmutable} from './product-artifact-utils.mjs';
import {PUBLICATION_RESOURCE_MAX_BYTES, PUBLICATION_RESOURCES_MAX_BYTES, validateResourceDescriptors, validatePublicationLogicalPath} from './product-publication-payload.mjs';

export * from './product-publication-payload.mjs';
const extensions = new Map([['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/webp', 'webp'], ['image/svg+xml', 'svg']]);

/** Read declared image assets only, requiring explicit source/asset roots and unlinked paths. */
export function collectArtifactResources(document, {assetRoot, sourceRoot} = {}) {
  const files = new Map();
  const descriptors = new Map();
  for (const asset of document.assets ?? []) {
    if (asset.kind !== 'image') continue;
    validatePublicationLogicalPath(asset.path);
    if (!assetRoot || !sourceRoot) fail('Image resource collection requires assetRoot and sourceRoot');
    ensureUnlinkedPath(path.resolve(assetRoot, asset.path), sourceRoot);
    const loaded = loadUiImageAsset(asset, assetRoot, sourceRoot);
    const descriptor = {id: asset.id, logicalPath: asset.path, path: `artifact-resources/${loaded.sha256}.${extensions.get(loaded.mimeType)}`, mediaType: loaded.mimeType, byteLength: loaded.bytes.length, sha256: loaded.sha256};
    const previous = descriptors.get(asset.path);
    if (previous && JSON.stringify(previous) !== JSON.stringify(descriptor)) fail('Conflicting declared image resources');
    descriptors.set(asset.path, descriptor);
    files.set(descriptor.path, {descriptor, bytes: loaded.bytes});
  }
  const resources = [...descriptors.values()].sort((a, b) => a.logicalPath < b.logicalPath ? -1 : a.logicalPath > b.logicalPath ? 1 : 0);
  validateResourceDescriptors(resources, document);
  return {resources, files: [...files.values()]};
}

/** Verify every content-addressed resource before publishing a detached context. */
export function verifyArtifactResourceFiles(resources, {resourceRoot}) {
  validateResourceDescriptors(resources);
  const files = new Map();
  for (const descriptor of resources) {
    const target = path.resolve(resourceRoot, descriptor.path);
    ensureUnlinkedPath(target, resourceRoot);
    const stats = fs.lstatSync(target);
    if (!stats.isFile() || stats.size !== descriptor.byteLength || stats.size > PUBLICATION_RESOURCE_MAX_BYTES) fail('Resource file type or size does not match descriptor');
    const loaded = loadUiImageAsset({id: 'publication-resource', path: descriptor.path, mimeType: descriptor.mediaType, sha256: descriptor.sha256}, resourceRoot, resourceRoot);
    if (loaded.bytes.length !== descriptor.byteLength) fail('Resource bytes do not match descriptor');
    files.set(descriptor.path, {descriptor, bytes: loaded.bytes});
  }
  return [...files.values()];
}

/** Publish a deduplicated, fully preflighted set of immutable resource files. */
export function publishArtifactResourceFiles(files, {outputRoot}) {
  const unique = new Map();
  for (const file of files) {
    validateResourceDescriptors([file.descriptor]);
    if (!Buffer.isBuffer(file.bytes) || file.bytes.length !== file.descriptor.byteLength || sha256(file.bytes) !== file.descriptor.sha256) fail('Resource bytes or hash do not match descriptor');
    validateUiImageAssetBytes({id: file.descriptor.id, mimeType: file.descriptor.mediaType, sha256: file.descriptor.sha256}, file.bytes);
    const prior = unique.get(file.descriptor.path);
    if (prior && !prior.bytes.equals(file.bytes)) fail('Conflicting resource bytes');
    unique.set(file.descriptor.path, file);
  }
  if ([...unique.values()].reduce((total, file) => total + file.bytes.length, 0) > PUBLICATION_RESOURCES_MAX_BYTES) fail('Resource files exceed the aggregate size limit');
  for (const file of unique.values()) {
    const target = path.resolve(outputRoot, file.descriptor.path);
    ensureUnlinkedPath(target, outputRoot);
    if (fs.existsSync(target) && (!fs.lstatSync(target).isFile() || !fs.readFileSync(target).equals(file.bytes))) fail('Existing immutable resource does not match descriptor');
  }
  return [...unique.values()].map(file => {
    writeImmutable(path.resolve(outputRoot, file.descriptor.path), file.bytes, outputRoot);
    return file.descriptor;
  });
}
