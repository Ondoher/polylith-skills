import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {DesignRecords} from './design-records.mjs';
import {DesignAssembly} from './design-assembly.mjs';
import {DesignRun} from './design-run.mjs';

/** Called by the command boundary to read an explicitly supplied JSON file.
 * @param {string|undefined} filename - User-selected file.
 * @returns {object|undefined} - Decoded material when supplied.
 */
function read(filename) {
	return filename ? JSON.parse(fs.readFileSync(filename, 'utf8')) : undefined;
}

/** Called by the CLI to require an explicit scope option.
 * @param {object} values - Parsed CLI options.
 * @param {string} key - Required option name.
 * @returns {string} - Nonempty supplied value.
 */
function required(values, key) {
	if (!values[key]) throw new Error(`--${key} is required`);
	return values[key];
}

try {
	const {values, positionals} = parseArgs({
		allowPositionals: true,
		options: Object.fromEntries(
			[
				'store',
				'stage',
				'binding',
				'input',
				'repairs',
				'output-dir',
				'ux',
				'design',
				'source-root',
				'asset-root',
				'refs',
			]
				.map((name) => [name, {type: 'string'}])
				.concat([
					['render', {type: 'boolean'}],
					['help', {type: 'boolean'}],
				]),
		),
	});
	const [command] = positionals;
	if (values.help) {
		console.log(
			'single-pass-design.mjs init|import|deliver|handoff|assemble --store <directory>\ninit: --stage ux|ui --binding <json>\nimport: --stage ux|ui --input <saved-spec.json> [--binding <json>]\ndeliver: --input <record-or-array.json> [--repairs <key-to-prior-digest.json>]\nhandoff: --refs <comma-separated-kind:IDs>\nassemble: --output-dir <empty-or-owned-directory> [--ux <json> --design <json> --render]\nCandidates remain subject to existing review and product persistence. Repair issues are returned as data.',
		);
	} else {
		const store = required(values, 'store');
		let result;
		if (command === 'init')
			result = DesignRecords.initialize(store, {
				stage: required(values, 'stage'),
				binding: read(required(values, 'binding')),
			});
		else if (command === 'import') {
			const stage = required(values, 'stage');
			if (!['ux', 'ui'].includes(stage)) throw new Error('Stage must be ux or ui');
			const source = fs.readFileSync(required(values, 'input'));
			DesignRecords.initialize(store, {
				stage,
				binding: {
					...read(values.binding),
					producer: 'single-pass-design/1',
					importedSourceSha256: createHash('sha256').update(source).digest('hex'),
				},
			});
			result = DesignRun.deliver(
				store,
				DesignAssembly[stage === 'ux' ? 'importUx' : 'importUi'](JSON.parse(source)),
			);
		} else if (command === 'deliver') {
			const input = read(required(values, 'input'));
			result = DesignRun.deliver(store, Array.isArray(input) ? input : [input], read(values.repairs));
		} else if (command === 'handoff') result = DesignRun.handoff(store, required(values, 'refs').split(','));
		else if (command === 'assemble')
			result = DesignRun.assemble(store, required(values, 'output-dir'), {
				uxSpec: read(values.ux),
				designLanguage: read(values.design),
				sourceRoot: values['source-root'],
				assetRoot: values['asset-root'],
				render: values.render,
			});
		else throw new Error('Expected init, import, deliver, handoff or assemble; use --help');
		console.log(JSON.stringify(result, null, 2));
	}
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
}
