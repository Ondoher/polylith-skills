import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

/**
 * Call this method to place configuration flags in their owning CLI command.
 *
 * @param {string[]} args - Forwarded Codex arguments.
 * @param {string} model - Explicit model slug.
 * @param {string} catalogPath - Generated catalog location.
 * @returns {string[]} - Arguments with the startup override at the effective level.
 */
export function nativeWorkflowArguments(args, model, catalogPath) {
	const flags = ['-m', model, '-c', `model_catalog_json=${JSON.stringify(catalogPath)}`];
	return args[0] === 'exec' ? ['exec', ...flags, ...args.slice(1)] : [...flags, ...args];
}

/**
 * Call this method to prepare a per-launch Codex catalog. Preserve every field except the selected
 * model's transport switches; never edit the cached catalog or user config.
 * Missing or unrecognized catalog contracts and conflicting saved bytes throw.
 *
 * @param {NativeWorkflowCatalogOptions} options - Source, destination and model.
 * @returns {NativeWorkflowCatalogReceipt} - Exact snapshot identity and changes.
 */
export function prepareNativeWorkflowCatalog({sourcePath, directory, model}) {
	const raw = fs.readFileSync(sourcePath);
	const catalog = JSON.parse(raw.toString('utf8'));
	assert(Array.isArray(catalog.models), 'Expected a current Codex models catalog');
	const matches = catalog.models.filter((entry) => entry.slug === model);
	assert.equal(matches.length, 1, `Expected exactly one catalog entry for ${model}`);
	const selected = matches[0];
	assert(
		['direct', 'code_mode', 'code_mode_only'].includes(selected.tool_mode),
		'Unrecognized tool mode; refresh and inspect the client catalog',
	);
	assert.equal(typeof selected.use_responses_lite, 'boolean', 'Catalog lacks the tested transport switch');
	const changes = {tool_mode: 'direct', use_responses_lite: false};
	const changedFields = Object.keys(changes).filter((key) => selected[key] !== changes[key]);
	Object.assign(selected, changes);
	const output = JSON.stringify(catalog);
	const sha256 = createHash('sha256').update(output).digest('hex');
	const destination = path.resolve(directory, `${sha256}.json`);
	fs.mkdirSync(path.dirname(destination), {recursive: true});
	if (fs.existsSync(destination))
		assert.equal(fs.readFileSync(destination, 'utf8'), output, 'Existing catalog digest mismatch');
	else fs.writeFileSync(destination, output, {flag: 'wx'});
	return {
		path: destination,
		sha256,
		sourceSha256: createHash('sha256').update(raw).digest('hex'),
		model,
		changedFields,
	};
}
