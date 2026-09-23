import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {gzipSync} from 'node:zlib';

import {encodePublicationDocument, decodePublicationDocument, collectArtifactResources, verifyArtifactResourceFiles, publishArtifactResourceFiles, validateResourceDescriptors, isPublicationPayload, validatePublicationPayload} from './product-publication-package.mjs';
import {sha256} from './product-artifact-utils.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'publication-package-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

test('packages canonical JSON and deterministic gzip without changing the logical document', () => {
  const document = {schemaVersion: '0.2', title: 'A neutral workspace', nested: {z: 1, a: true}};
  for (const encoding of ['json', 'gzip-base64']) {
    const encoded = encodePublicationDocument(document, {encoding});
    assert.deepEqual(decodePublicationDocument(encoded).document, document);
    assert.deepEqual(encoded, encodePublicationDocument(document, {encoding}));
    assert.equal(encoded.mediaType, 'application/json');
  }
  const large = {entries: Array.from({length: 1500}, (_, index) => sha256(Buffer.from(String(index))))};
  const chunked = encodePublicationDocument(large, {encoding: 'gzip-base64'});
  assert.ok(chunked.chunks.length > 1);
  assert.ok(chunked.chunks.slice(0, -1).every(chunk => chunk.length === 32768));
  assert.deepEqual(decodePublicationDocument(chunked).document, large);
  assert.deepEqual(chunked, encodePublicationDocument(large, {encoding: 'gzip-base64'}));
});

test('rejects damaged, noncanonical, oversized, and obsolete compressed wrappers', () => {
  const encoded = encodePublicationDocument({schemaVersion: '0.2', title: 'Current'}, {encoding: 'gzip-base64'});
  for (const mutate of [
    value => { value.compressedBytes += 1; },
    value => { value.compressedSha256 = '0'.repeat(64); },
    value => { value.decodedBytes += 1; },
    value => { value.decodedSha256 = '0'.repeat(64); },
    value => { value.chunks[0] += '\n'; },
    value => { value.decodedBytes = 8 * 1024 * 1024 + 1; },
    value => { value.data = value.chunks.join(''); delete value.chunks; },
  ]) {
    const invalid = structuredClone(encoded);
    mutate(invalid);
    assert.throws(() => decodePublicationDocument(invalid));
  }
  const decoded = Buffer.from('{ "schemaVersion": "0.2" }');
  const compressed = gzipSync(decoded);
  const invalid = {...encoded, chunks: [compressed.toString('base64')], compressedBytes: compressed.length, compressedSha256: sha256(compressed), decodedBytes: decoded.length, decodedSha256: sha256(decoded)};
  assert.throws(() => decodePublicationDocument(invalid), /must be canonical/);
  const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{"schemaVersion":"0.2"}')]);
  const bomGzip = gzipSync(bom);
  assert.throws(() => decodePublicationDocument({...encoded, chunks: [bomGzip.toString('base64')], compressedBytes: bomGzip.length, compressedSha256: sha256(bomGzip), decodedBytes: bom.length, decodedSha256: sha256(bom)}), /canonical UTF-8 bytes/);
  const oversized = Buffer.alloc(8 * 1024 * 1024 + 1, 32);
  const oversizedGzip = gzipSync(oversized);
  assert.throws(() => decodePublicationDocument({...encoded, chunks: [oversizedGzip.toString('base64')], compressedBytes: oversizedGzip.length, compressedSha256: sha256(oversizedGzip)}), /bounded gzip/);
});

test('reserved kinds reject missing wrappers and manifests bind every exact role', () => {
  for (const [artifactKind, artifactSchemaVersion] of [['ux-design', '0.2'], ['design-language', '0.14'], ['ui-composition', '0.2'], ['component-design', '0.2'], ['prd-publication', '1.0']]) {
    const artifact = {artifactKind, artifactSchemaVersion, resources: [], payload: {summary: 'Not a structured publication package'}};
    assert.equal(isPublicationPayload(artifact), true);
    assert.throws(() => validatePublicationPayload(artifact), /encoding/);
    assert.throws(() => validatePublicationPayload({...artifact, artifactSchemaVersion: '9.0'}), /version/);
  }
  const document = {schemaVersion: '1.0', uxArtifactId: 'ux', designLanguageArtifactId: 'foundations', uiArtifactId: null, componentArtifactIds: []};
  const artifact = {artifactKind: 'prd-publication', artifactSchemaVersion: '1.0', resources: [], payload: encodePublicationDocument(document), artifactDependencies: [{id: 'ux'}, {id: 'foundations'}]};
  assert.deepEqual(validatePublicationPayload(artifact).document, document);
  for (const artifactDependencies of [[{id: 'ux'}], [...artifact.artifactDependencies, {id: 'unrelated'}]]) assert.throws(() => validatePublicationPayload({...artifact, artifactDependencies}), /exactly its named/);
});

test('rejects unsafe descriptors, linked inputs and mismatched bytes before publication', t => {
  const root = temporary(t);
  const descriptor = {id: 'sample', logicalPath: 'sample.png', path: `artifact-resources/${sha256(png)}.png`, mediaType: 'image/png', byteLength: png.length, sha256: sha256(png)};
  for (const logicalPath of ['../sample.png', '/sample.png', 'C:/sample.png', 'images\\sample.png', './sample.png', 'images/../sample.png']) assert.throws(() => validateResourceDescriptors([{...descriptor, logicalPath}]), /safe relative/);
  assert.throws(() => validateResourceDescriptors([descriptor, descriptor]), /unique|duplicate/);
  assert.throws(() => validateResourceDescriptors([{...descriptor, path: 'artifact-resources/sample.png'}]), /content-addressed/);
  const outputRoot = path.join(root, 'output');
  assert.throws(() => publishArtifactResourceFiles([{descriptor: {...descriptor, byteLength: png.length + 1}, bytes: png}], {outputRoot}), /bytes or hash/);
  const wrongType = {...descriptor, mediaType: 'image/jpeg', path: `artifact-resources/${descriptor.sha256}.jpg`};
  assert.throws(() => publishArtifactResourceFiles([{descriptor: wrongType, bytes: png}], {outputRoot}), /MIME/);
  assert.equal(fs.existsSync(outputRoot), false);
  fs.mkdirSync(path.join(root, 'source'));
  fs.writeFileSync(path.join(root, 'source/sample.png'), png);
  fs.symlinkSync(path.join(root, 'source'), path.join(root, 'linked'), 'junction');
  assert.throws(() => collectArtifactResources({assets: [{id: 'sample', kind: 'image', path: 'sample.png', mimeType: 'image/png', sha256: descriptor.sha256}]}, {assetRoot: path.join(root, 'linked'), sourceRoot: root}), /linked/);
});

test('copies only declared hash-bound resources, deduplicates bytes, and replays unchanged', t => {
  const root = temporary(t);
  fs.mkdirSync(path.join(root, 'source'));
  fs.writeFileSync(path.join(root, 'source', 'sample.png'), png);
  fs.writeFileSync(path.join(root, 'source', 'unrelated.png'), png);
  const document = {assets: [{id: 'sample', kind: 'image', path: 'sample.png', mimeType: 'image/png', sha256: sha256(png)}]};
  const collected = collectArtifactResources(document, {assetRoot: path.join(root, 'source'), sourceRoot: root});
  assert.deepEqual(collected.resources, [{id: 'sample', logicalPath: 'sample.png', path: `artifact-resources/${sha256(png)}.png`, mediaType: 'image/png', byteLength: png.length, sha256: sha256(png)}]);
  const outputRoot = path.join(root, 'context');
  const first = publishArtifactResourceFiles([...collected.files, ...collected.files], {outputRoot});
  const second = publishArtifactResourceFiles(collected.files, {outputRoot});
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.deepEqual(fs.readdirSync(path.join(outputRoot, 'artifact-resources')), [`${sha256(png)}.png`]);
  const verified = verifyArtifactResourceFiles(collected.resources, {resourceRoot: outputRoot});
  assert.deepEqual(verified[0].bytes, png);
});
