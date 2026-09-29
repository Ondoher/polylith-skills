import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {prepareNativeWorkflowCatalog, nativeWorkflowArguments} from './native-workflow-catalog.mjs';

// Task-scoped launcher: Codex itself owns authentication, approvals, and MCP.
const args = process.argv.slice(2);
const separator = args.indexOf('--');
const own = separator < 0 ? args : args.slice(0, separator);
const forwarded = separator < 0 ? [] : args.slice(separator + 1);
const value = (name) => own.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
if (own.includes('--help')) {
	console.log(
		'node scripts/codex-native-workflows.mjs --model=<model> [--binary=<codex executable>] [--cache=<models_cache.json>] [--prepare-only] -- [Codex arguments]\nUses a per-launch native-tools catalog; leaves user configuration and authentication untouched.',
	);
	process.exit(0);
}
const unknown = own.filter(
	(arg) =>
		!['--model=', '--binary=', '--cache='].some((prefix) => arg.startsWith(prefix)) && arg !== '--prepare-only',
);
if (unknown.length) throw new Error(`Unknown launcher option: ${unknown[0]}`);
const model = value('model');
if (!model) throw new Error('Select --model explicitly; the launcher never chooses a replacement model');
// Do not permit later CLI arguments to silently invalidate this launch contract.
if (
	forwarded.some(
		(arg) =>
			/^(?:--model(?:=|$)|-m$|--profile(?:=|$)|-p$)/.test(arg) || /^(?:model|model_catalog_json)\s*=/.test(arg),
	)
)
	throw new Error('Supply model only through --model; do not override the generated catalog or profile');
const codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex');
const receipt = prepareNativeWorkflowCatalog({
	sourcePath: path.resolve(value('cache') ?? path.join(codexHome, 'models_cache.json')),
	directory: path.resolve('.codex-tmp/native-workflow-catalogs'),
	model,
});
// Receipt contains digests and paths, never cached model instructions or credentials.
console.error(JSON.stringify({nativeWorkflowCatalog: receipt}));
if (!own.includes('--prepare-only')) {
	const binary = value('binary') ?? 'codex';
	if (value('binary') && !fs.existsSync(binary)) throw new Error('Codex executable does not exist');
	const child = spawn(binary, nativeWorkflowArguments(forwarded, model, receipt.path), {
		stdio: 'inherit',
		windowsHide: true,
	});
	child.on('error', (error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
	child.on('exit', (code) => {
		process.exitCode = code ?? 1;
	});
}
