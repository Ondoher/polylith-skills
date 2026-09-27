import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {LegacyUxImport} from './legacy-ux-import.mjs';
import {UiParts} from './ui-parts.mjs';
import {canonicalPublicationJson} from './product-publication-payload.mjs';

/** Identify exact bytes for immutable import provenance. @param {string|Buffer} bytes @returns {string} */
function hash(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
}

/** Check every existing ancestor before creating an owned import directory.
 * @param {string} directory - Explicit output directory. @returns {string} - Resolved safe path.
 */
function directoryPath(directory) {
	const root = path.resolve(directory);
	if (root === path.parse(root).root) throw new Error('A filesystem root cannot own migration output');
	let current = root;
	while (current !== path.dirname(current)) {
		if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
			throw new Error('Linked migration output path');
		current = path.dirname(current);
	}
	return root;
}

/** Persist immutable import evidence atomically; preserve files from prior calls.
 * @param {string} filename @param {string|Buffer} bytes @returns {void}
 */
function save(filename, bytes) {
	if (fs.existsSync(filename)) {
		if (fs.lstatSync(filename).isSymbolicLink() || !fs.readFileSync(filename).equals(Buffer.from(bytes)))
			throw new Error('Migration output differs from preserved evidence; select a new output directory');
		return;
	}
	const temporary = `${filename}.${randomUUID()}.pending`;
	try {
		fs.writeFileSync(temporary, bytes, {flag: 'wx'});
		fs.renameSync(temporary, filename);
	} finally {
		if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
	}
}

/** Explicit graph-era import. Ordinary validation, assembly and publication do not call this module. */
export const DesignMigration = {
	/** Preserve source bytes and produce an unreviewed native candidate once.
	 * @param {DesignMigrationOptions} options - Explicit source and owned output location.
	 * @returns {DesignMigrationReport} - Identity, file paths and actionable repair needs.
	 */
	import({inputPath, outputDirectory, stage, uxSpec, mappings = {}}) {
		const started = performance.now();
		if (!['ux', 'ui'].includes(stage)) throw new Error('Migration stage must be ux or ui');
		const source = fs.readFileSync(inputPath),
			sourceSha256 = hash(source),
			root = directoryPath(outputDirectory);
		const owner = {
			owner: 'native-design-import/1',
			stage,
			sourceSha256,
			uxSha256: uxSpec ? hash(canonicalPublicationJson(uxSpec)) : null,
			mappingsSha256: hash(canonicalPublicationJson(mappings)),
		};
		const marker = path.join(root, 'migration-owner.json');
		if (fs.existsSync(root) && fs.readdirSync(root).length && !fs.existsSync(marker))
			throw new Error('Migration output must be empty or owned');
		fs.mkdirSync(root, {recursive: true});
		save(marker, JSON.stringify(owner));
		const originalPath = path.join(root, 'original.json');
		save(originalPath, source);
		let document = null,
			issues = [],
			resultMappings = {};
		try {
			const old = JSON.parse(source);
			if (stage === 'ux') ({document, issues, mappings: resultMappings} = LegacyUxImport.convert(old));
			else {
				document = UiParts.importLegacy(old);
				for (const scene of document.scenes) {
					scene.flowRefs = scene.useCaseRefs;
					delete scene.useCaseRefs;
					scene.depictsRefs = scene.depictsRefs.map((ref) => {
						if (mappings[ref]) return mappings[ref];
						if (/^ux:(flow-node|recovery):/.test(ref))
							issues.push({
								reference: scene.id,
								reason: `No imported identity for ${ref}`,
								remedy: 'Supply the matching UX migration report or repair this scene depiction.',
							});
						return ref;
					});
				}
				if (uxSpec?.schemaVersion === '0.4' && uxSpec.id === old.uxArtifactBinding.id)
					document.uxArtifactBinding = {
						id: uxSpec.id,
						revision: uxSpec.revision,
						sha256: hash(canonicalPublicationJson(uxSpec)),
					};
				else
					issues.push({
						reference: 'uxArtifactBinding',
						reason: 'Current native UX is required to rebind this candidate',
						remedy: 'Import UX first and supply its saved candidate; obtain a fresh independent review before persistence.',
					});
			}
		} catch (error) {
			issues.push({
				reference: 'source',
				reason: error.message,
				remedy: 'Repair the explicitly selected source or local record; original input is preserved.',
			});
		}
		const candidatePath = document ? path.join(root, 'candidate.json') : null;
		if (document) save(candidatePath, `${JSON.stringify(document, null, 2)}\n`);
		const report = {
			version: 'native-design-import/1',
			stage,
			sourceSha256,
			originalPath,
			candidatePath,
			reviewStatus: 'not-assessed',
			issues,
			mappings: resultMappings,
			sourceBytes: source.length,
			candidateBytes: document ? Buffer.byteLength(canonicalPublicationJson(document)) : 0,
		};
		save(path.join(root, 'migration-report.json'), `${JSON.stringify(report, null, 2)}\n`);
		save(
			path.join(root, 'repair-notices.md'),
			`# Import repair notices\n\n${issues.map((item) => `- ${item.reference}: ${item.reason}\n  Remedy: ${item.remedy}`).join('\n') || 'No structural conversion issues. This candidate has not received independent semantic review.'}\n`,
		);
		return {...report, elapsedMs: performance.now() - started};
	},
};
