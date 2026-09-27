import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {canonicalPublicationJson} from './product-publication-payload.mjs';

/** Called by the record store to identify exact canonical JSON bytes.
 * @param {unknown} value - Finite JSON data.
 * @returns {string} - SHA-256 identity.
 */
function digest(value) {
	return crypto.createHash('sha256').update(canonicalPublicationJson(value)).digest('hex');
}

/** Called by the record store to reject an unsafe or unrelated staging root.
 * @param {string} root - Explicitly assigned staging directory.
 * @returns {string} - Absolute staging root.
 */
function ownedRoot(root) {
	const absoluteRoot = path.resolve(root);
	if (absoluteRoot === path.parse(absoluteRoot).root)
		throw new Error('A filesystem root cannot be a design staging root');
	if (fs.existsSync(absoluteRoot) && fs.lstatSync(absoluteRoot).isSymbolicLink())
		throw new Error('Design staging root cannot be a symbolic link');
	return absoluteRoot;
}

/** Called by record operations to resolve a store-owned child without following links.
 * @param {string} root - Absolute staging directory.
 * @param {string} name - Store-generated filename.
 * @returns {string} - Child path.
 */
function childPath(root, name) {
	const target = path.join(root, name);
	if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error(`Linked design file: ${name}`);
	return target;
}

/** Called by writes to publish one complete file after its temporary bytes exist.
 * @param {string} target - Owned destination.
 * @param {string} bytes - Complete UTF-8 contents.
 * @returns {void}
 */
function atomicWrite(target, bytes) {
	const temporaryPath = `${target}.${crypto.randomUUID()}.pending`;
	try {
		fs.writeFileSync(temporaryPath, bytes, {flag: 'wx'});
		fs.renameSync(temporaryPath, target);
	} finally {
		if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
	}
}

/** Called by record operations to read the immutable input identity of a store.
 * @param {string} root - Explicit staging directory.
 * @returns {DesignRecordStoreHeader} - Store identity.
 */
function readHeader(root) {
	const header = JSON.parse(fs.readFileSync(childPath(ownedRoot(root), 'design-records.json'), 'utf8'));
	if (header.format !== 'design-records/1' || !['ux', 'ui'].includes(header.stage) || !header.binding)
		throw new Error('Invalid design record store header');
	return header;
}

/** Called by record operations to validate the small delivery envelope.
 * @param {DesignRecord} record - One authored unit.
 * @returns {void}
 */
function validateRecord(record) {
	if (!record || typeof record !== 'object' || Array.isArray(record))
		throw new Error('Design record must be an object');
	if (Object.keys(record).some((key) => !['id', 'kind', 'data', 'dependencies'].includes(key)))
		throw new Error('Unknown design record field');
	if (typeof record.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,159}$/.test(record.id))
		throw new Error('Invalid design record ID');
	if (!['context', 'element', 'flow', 'part', 'scene'].includes(record.kind))
		throw new Error('Invalid design record kind');
	if (!record.data || typeof record.data !== 'object' || Array.isArray(record.data))
		throw new Error('Design record data must be an object');
	if (
		record.dependencies !== undefined &&
		(!Array.isArray(record.dependencies) ||
			record.dependencies.some(
				(reference) => typeof reference !== 'string' || !/^[a-z-]+:[a-z0-9][a-z0-9._-]{0,159}$/.test(reference),
			))
	)
		throw new Error('Invalid design record dependencies');
	canonicalPublicationJson(record);
}

/** Incrementally persisted authoring units with exact reuse and optimistic repairs. */
export const DesignRecords = {
	/** Call this method to initialize or resume a store for identical inputs.
	 * A different input binding requires a different staging root; no data is discarded.
	 * @param {string} root - Assigned staging directory, including a temporary directory.
	 * @param {DesignRecordStoreOptions} options - Stage and exact input/producer binding.
	 * @returns {DesignRecordStoreHeader} - Current immutable store header.
	 */
	initialize(root, options) {
		if (!['ux', 'ui'].includes(options.stage) || !options.binding || typeof options.binding !== 'object')
			throw new Error('A design stage and input binding are required');
		const absoluteRoot = ownedRoot(root);
		const header = {format: 'design-records/1', stage: options.stage, binding: options.binding};
		const headerPath = childPath(absoluteRoot, 'design-records.json');
		if (fs.existsSync(headerPath)) {
			const existing = readHeader(absoluteRoot);
			if (digest(existing) !== digest(header))
				throw new Error('Design store inputs changed; preserve it and start a new bound store');
			return existing;
		}
		if (fs.existsSync(absoluteRoot) && fs.readdirSync(absoluteRoot).length)
			throw new Error('Design staging directory is not empty or owned');
		fs.mkdirSync(absoluteRoot, {recursive: true});
		atomicWrite(headerPath, `${canonicalPublicationJson(header)}\n`);
		return header;
	},

	/** Call this method to save a complete unit or reuse its unchanged bytes.
	 * Replacements require the digest of the exact prior record. A stale replacement
	 * throws without changing that record; unaffected records remain reusable.
	 * @param {string} root - Owned staging directory.
	 * @param {DesignRecord} record - One authored unit with stable identity.
	 * @param {string|null} expectedDigest - Prior identity for an intentional repair.
	 * @returns {DesignRecordWriteResult} - Saved or reused record identity and path.
	 */
	put(root, record, expectedDigest = null) {
		readHeader(root);
		validateRecord(record);
		const recordKey = `${record.kind}:${record.id}`;
		const target = childPath(ownedRoot(root), `${record.kind}.${record.id}.json`);
		const nextDigest = digest(record);
		if (fs.existsSync(target)) {
			const previous = JSON.parse(fs.readFileSync(target, 'utf8'));
			validateRecord(previous);
			const previousDigest = digest(previous);
			if (previousDigest === nextDigest) return {recordKey, digest: nextDigest, path: target, reused: true};
			if (expectedDigest !== previousDigest) throw new Error(`Stale or unrequested replacement of ${recordKey}`);
		} else if (expectedDigest !== null) throw new Error(`Cannot repair missing record ${recordKey}`);
		atomicWrite(target, `${canonicalPublicationJson(record)}\n`);
		return {recordKey, digest: nextDigest, path: target, reused: false};
	},

	/** Call this method to read saved units and report recoverable malformed files.
	 * Named selection uses direct paths. A whole-store read scans each saved unit once.
	 * @param {string} root - Owned staging directory.
	 * @param {string[]|null} references - Optional kind:ID references for a bounded handoff.
	 * @returns {DesignRecordReadResult} - Usable records, exact identities, and repair needs.
	 */
	read(root, references = null) {
		const header = readHeader(root);
		const absoluteRoot = ownedRoot(root);
		if (
			references !== null &&
			(!Array.isArray(references) ||
				references.some(
					(reference) => !/^(context|element|flow|part|scene):[a-z0-9][a-z0-9._-]{0,159}$/.test(reference),
				))
		)
			throw new Error('Invalid requested design record references');
		const names =
			references === null
				? fs.readdirSync(absoluteRoot).filter((name) => name !== 'design-records.json')
				: [...new Set(references)].map((reference) => `${reference.replace(':', '.')}.json`);
		const records = [];
		const identities = {};
		const issues = [];
		let bytesRead = 0;
		for (const name of names) {
			if (name.endsWith('.pending')) {
				issues.push({
					reference: name,
					reason: 'Interrupted write',
					remedy: 'Reuse completed records and redeliver this unit.',
				});
				continue;
			}
			try {
				if (!/^(context|element|flow|part|scene)\.[a-z0-9][a-z0-9._-]{0,159}\.json$/.test(name))
					throw new Error('Unrecognized staging file');
				const bytes = fs.readFileSync(childPath(absoluteRoot, name));
				bytesRead += bytes.length;
				const record = JSON.parse(bytes.toString('utf8'));
				validateRecord(record);
				if (name !== `${record.kind}.${record.id}.json`) throw new Error('Record filename and identity differ');
				records.push(record);
				identities[`${record.kind}:${record.id}`] = digest(record);
			} catch (error) {
				issues.push({
					reference: name,
					reason: error.message,
					remedy: 'Repair or redeliver this record; retain other completed units.',
				});
			}
		}
		return {header, records, identities, issues, bytesRead};
	},

	/** Call this method to identify an authored record for an optimistic repair.
	 * @param {DesignRecord} record - Complete finite JSON record.
	 * @returns {string} - Canonical material SHA-256.
	 */
	digest(record) {
		validateRecord(record);
		return digest(record);
	},
};
