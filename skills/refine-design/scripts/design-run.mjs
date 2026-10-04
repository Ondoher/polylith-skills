import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {DesignRecords} from './design-records.mjs';
import {DesignAssembly} from './design-assembly.mjs';
import {canonicalPublicationJson} from './product-publication-payload.mjs';
import {validateUxSpec} from './ux-design.mjs';
import {validateUiSpec} from './ui-composition.mjs';
import {buildUiCompositionHtml} from './ui-composition-html.mjs';
import {buildDesignLanguageAssetOutputs} from './design-language-html.mjs';

const VERSION = 'single-pass-design/1';
const ASSEMBLY_VERSION = 'single-pass-assembly/4';

/** Called by run persistence to identify exact bytes.
 * @param {string|Buffer} bytes - UTF-8 or binary material.
 * @returns {string} - SHA-256 identity.
 */
function digest(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
}

/** Called before touching generated files to keep writes in their assigned directory.
 * @param {string} root - Owned output root.
 * @param {string} relative - Generated relative path.
 * @returns {string} - Safe absolute target.
 */
function outputPath(root, relative) {
	const target = path.resolve(root, relative);
	if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Generated output escapes its assigned root');
	let current = root;
	for (const part of path.relative(root, target).split(path.sep)) {
		if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('Linked output path');
		current = path.join(current, part);
	}
	if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error('Linked output file');
	return target;
}

/** Called by persistence to publish complete files atomically.
 * @param {string} target - Checked generated target.
 * @param {string|Buffer} bytes - Complete file material.
 * @returns {void}
 */
function write(target, bytes) {
	fs.mkdirSync(path.dirname(target), {recursive: true});
	const temporary = `${target}.${randomUUID()}.pending`;
	try {
		fs.writeFileSync(temporary, bytes, {flag: 'wx'});
		fs.renameSync(temporary, target);
	} finally {
		if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
	}
}

/** Called by assembly to claim only an empty output directory or an existing owned one.
 * @param {string} directory - Explicit output location separate from the record store.
 * @returns {string} - Absolute owned output root.
 */
function outputRoot(directory) {
	const root = path.resolve(directory);
	if (root === path.parse(root).root) throw new Error('A filesystem root cannot own design output');
	const marker = outputPath(root, 'single-pass-output.json');
	if (fs.existsSync(marker)) {
		if (JSON.parse(fs.readFileSync(marker, 'utf8')).owner !== VERSION)
			throw new Error('Unrecognized design output owner');
	} else {
		if (fs.existsSync(root) && fs.readdirSync(root).length)
			throw new Error('Design output directory is not empty or owned');
		write(marker, `${JSON.stringify({owner: VERSION})}\n`);
	}
	return root;
}

/** Parent-owned persistence, bounded handoff and repeatable candidate assembly. */
export const DesignRun = {
	/** Call this method to persist a delivered batch while retaining usable siblings.
	 * A repair names the exact previous digest; unchanged data produced earlier in this run is reused.
	 * @param {string} store - Initialized record store.
	 * @param {DesignRecord[]} records - Complete authoring records.
	 * @param {Record<string, string>} repairs - Prior digests for intentional replacements.
	 * @returns {DesignDeliveryResult} - Saved identities and actionable delivery issues.
	 */
	deliver(store, records, repairs = {}) {
		const saved = [],
			issues = [];
		for (const record of records) {
			const reference = `${record?.kind}:${record?.id}`;
			try {
				saved.push(DesignRecords.put(store, record, repairs[reference] ?? null));
			} catch (error) {
				issues.push({
					reference,
					reason: error.message,
					remedy: 'Redeliver this complete unit with the current prior digest for a repair; retain saved siblings.',
				});
			}
		}
		return {saved, issues};
	},

	/** Call this method to hand off paths and exact identities for an explicit dependency closure.
	 * This transport manifest does not authorize UI composition or substitute for semantic review.
	 * @param {string} store - Initialized record store.
	 * @param {string[]} references - Requested kind:ID units; include context:document when needed.
	 * @returns {DesignHandoffResult} - Small manifest and any missing-unit notices.
	 */
	handoff(store, references) {
		const queue = [...references],
			seen = new Set(),
			units = [],
			issues = [];
		let bytesRead = 0;
		for (let offset = 0; offset < queue.length; offset++) {
			const reference = queue[offset];
			if (seen.has(reference)) continue;
			seen.add(reference);
			const result = DesignRecords.read(store, [reference]);
			bytesRead += result.bytesRead;
			issues.push(...result.issues);
			for (const record of result.records) {
				units.push({
					reference,
					sha256: result.identities[reference],
					path: path.resolve(store, `${record.kind}.${record.id}.json`),
				});
				queue.push(...(record.dependencies ?? []));
			}
		}
		return {version: VERSION, units, issues, bytesRead, reviewStatus: 'not-assessed'};
	},

	/** Call this method to assemble and validate a candidate, optionally rendering isolated UI previews.
	 * Input-bound outputs are reused on later invocations after their saved bytes are verified.
	 * Never writes product authority, review receipts, publication contexts or live product files.
	 * @param {string} store - Initialized authoring store.
	 * @param {string} directory - Separate empty or owned output directory.
	 * @param {DesignRunOptions} options - Exact downstream inputs and optional rendering context.
	 * @returns {DesignRunReport} - Persisted candidate location, repair notices and measured work.
	 */
	assemble(store, directory, options = {}) {
		const started = performance.now();
		const storeRoot = path.resolve(store),
			destination = path.resolve(directory);
		if (
			storeRoot === destination ||
			destination.startsWith(`${storeRoot}${path.sep}`) ||
			storeRoot.startsWith(`${destination}${path.sep}`)
		)
			throw new Error('Keep record and assembly directories separate and nonnested');
		const stages = {};
		const root = outputRoot(directory);
		const readAt = performance.now();
		const input = DesignRecords.read(store);
		stages.readMs = performance.now() - readAt;
		const identityAt = performance.now();
		const sourceRoot = options.sourceRoot ? path.resolve(options.sourceRoot) : undefined;
		const assetRoot = options.assetRoot ? path.resolve(options.assetRoot) : undefined;
		// External assets are not covered by JSON identities; runs using them deliberately bypass cache reuse.
		const externalAssets = Boolean(assetRoot || sourceRoot || options.designLanguage?.theme?.fontFaces?.length);
		const identity = digest(
			canonicalPublicationJson({
				version: ASSEMBLY_VERSION,
				header: input.header,
				identities: input.identities,
				issues: input.issues,
				uxSpec: options.uxSpec ?? null,
				designLanguage: options.designLanguage ?? null,
				render: options.render ?? false,
				sourceRoot: sourceRoot ?? null,
				assetRoot: assetRoot ?? null,
			}),
		);
		const reportPath = outputPath(root, `${identity}/report.json`);
		stages.identityMs = performance.now() - identityAt;
		const cacheAt = performance.now();
		if (!externalAssets && fs.existsSync(reportPath)) {
			try {
				const prior = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
				if (
					prior.version === VERSION &&
					prior.identity === identity &&
					prior.outputs.length &&
					prior.outputs.every(
						(output) => digest(fs.readFileSync(outputPath(root, output.relative))) === output.sha256,
					)
				)
					return {
						...prior,
						reused: true,
						elapsedMs: performance.now() - started,
						bytesRead: input.bytesRead,
						stages: {...stages, cacheCheckMs: performance.now() - cacheAt},
					};
			} catch {
				/* An interrupted or changed generated cache is rebuilt from retained records. */
			}
		}
		stages.cacheCheckMs = performance.now() - cacheAt;
		let document = null;
		const issues = [...input.issues];
		let valid = false;
		const assembledAt = performance.now();
		try {
			const result = DesignAssembly[input.header.stage](input.records);
			document = result.document;
			issues.push(...result.issues);
			issues.push(...(document?.repairNeeds ?? []));
		} catch (error) {
			issues.push({
				reference: 'context:document',
				reason: error.message,
				remedy: 'Repair shared context while preserving the saved element, flow and scene files.',
			});
		}
		stages.assemblyMs = performance.now() - assembledAt;
		const validatedAt = performance.now();
		if (document) {
			try {
				if (input.header.stage === 'ux') validateUxSpec(document);
				else
					validateUiSpec(document, {
						uxSpec: options.uxSpec,
						designLanguage: options.designLanguage,
						assetRoot,
						sourceRoot,
					});
				valid = issues.length === 0;
			} catch (error) {
				issues.push({
					reference: 'candidate',
					reason: error.message,
					remedy: 'Repair the named semantic reference or field, then run assembly once more. Other saved units remain available.',
				});
			}
		}
		stages.validationMs = performance.now() - validatedAt;
		const outputs = new Map();
		const serializationAt = performance.now();
		if (document) outputs.set('candidate.json', `${JSON.stringify(document, null, 2)}\n`);
		stages.serializationMs = performance.now() - serializationAt;
		if (options.render && input.header.stage === 'ui' && valid) {
			const renderedAt = performance.now();
			try {
				const rendered = buildUiCompositionHtml(document, {
					uxSpec: options.uxSpec,
					designLanguage: options.designLanguage,
					assetRoot,
					sourceRoot,
				});
				for (const [relative, bytes] of buildDesignLanguageAssetOutputs(options.designLanguage))
					outputs.set(relative, bytes);
				for (const [relative, bytes] of rendered.outputs) outputs.set(relative, bytes);
			} catch (error) {
				valid = false;
				issues.push({
					reference: 'preview',
					reason: error.message,
					remedy: 'Repair rendering inputs; retain the assembled candidate and completed authoring units.',
				});
			}
			stages.renderMs = performance.now() - renderedAt;
		}
		outputs.set(
			'repair-notices.md',
			`# Candidate repair notices\n\n${issues.length ? issues.map((entry) => `- ${entry.reference}: ${entry.reason}\n  Remedy: ${entry.remedy}`).join('\n') : 'No structural repairs reported. Independent semantic review remains required.'}\n`,
		);
		const saved = [];
		const persistAt = performance.now();
		for (const [relative, bytes] of outputs) {
			const output = `${identity}/${relative}`;
			write(outputPath(root, output), bytes);
			saved.push({relative: output, sha256: digest(bytes), bytes: Buffer.byteLength(bytes)});
		}
		stages.persistMs = performance.now() - persistAt;
		const report = {
			version: VERSION,
			producerVersion: ASSEMBLY_VERSION,
			identity,
			stage: input.header.stage,
			candidatePath: document ? outputPath(root, `${identity}/candidate.json`) : null,
			valid,
			reviewStatus: 'not-assessed',
			issues,
			outputs: saved,
			reused: false,
			bytesRead: input.bytesRead,
			recordCount: input.records.length,
			elapsedMs: performance.now() - started,
			stages,
		};
		write(reportPath, `${JSON.stringify(report, null, 2)}\n`);
		return report;
	},
};
