import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCurrentProduct, PRODUCT_MODEL_MAX_INPUT_BYTES} from './product-model.mjs';
import {buildUseCaseHandoff} from './composable-handoff.mjs';
import {validateUxSpec} from './ux-design.mjs';
import {readBoundedFile, sha256, stableJson} from './product-artifact-utils.mjs';

/**
 * Assemble verified product authority without interpreting prose or choosing UX.
 * Focus narrows attention, never the supplied product constraints or coverage.
 * @param {{currentPath: string, sourcePath: string, uxPath?: string,
 *   useCaseIds?: string[], claimIds?: string[]}} options
 * @returns {object} Read-only planner input, not a new canonical artifact.
 */
export function buildPlannerInput({currentPath, sourcePath, uxPath, useCaseIds = [], claimIds = []}) {
	const chain = loadCurrentProduct(currentPath);
	const sourceBytes = readBoundedFile(sourcePath, PRODUCT_MODEL_MAX_INPUT_BYTES, 'Live product description');
	if (!sourceBytes.equals(chain.sourceBytes))
		throw new Error('Product description changed; update the product model before planning');
	for (const [label, values] of [
		['use cases', useCaseIds],
		['claims', claimIds],
	]) {
		if (
			!Array.isArray(values) ||
			values.some((id) => typeof id !== 'string') ||
			new Set(values).size !== values.length
		) {
			throw new Error(`Requested ${label} must be unique IDs`);
		}
	}
	const binding = Object.fromEntries(
		['id', 'revision', 'sha256', 'materialSha256', 'recordIndexSha256'].map((key) => [
			key,
			chain.snapshot.productModel[key],
		]),
	);
	let ux = null;
	let uxBinding = null;
	if (uxPath) {
		const uxBytes = readBoundedFile(uxPath, 8 * 1024 * 1024, 'Current UX');
		ux = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(uxBytes));
		for (const [key, value] of Object.entries(binding)) {
			if (ux.productModelBinding?.[key] !== value)
				throw new Error(`Current UX productModelBinding.${key} needs reconciliation`);
		}
		validateUxSpec(ux);
		uxBinding = {id: ux.id, revision: ux.revision, sha256: sha256(uxBytes)};
	} else if (useCaseIds.length) {
		throw new Error('Use-case focus requires a current UX artifact');
	}
	const excerpts = claimIds.map((id) => {
		const claim = chain.model.sourceClaims.find((item) => item.id === id);
		if (!claim) throw new Error(`Unknown source claim ${id}`);
		return {
			id,
			startLine: claim.startLine,
			endLine: claim.endLine,
			text: chain.sourceBytes
				.subarray(claim.sourceRange.startByte, claim.sourceRange.endByteExclusive)
				.toString('utf8'),
		};
	});
	return {
		kind: 'refinement-planner-input',
		schemaVersion: '1.0',
		productModelBinding: binding,
		productModel: chain.model,
		uxBinding,
		focus: {
			useCaseIds: [...useCaseIds],
			handoffs: useCaseIds.map((id) => buildUseCaseHandoff(chain.model, ux, id)),
		},
		sourceExcerpts: excerpts,
	};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const args = process.argv.slice(2);
		const values = {};
		for (let i = 0; i < args.length; i += 2) {
			const key = args[i];
			if (
				!['--current', '--source', '--ux', '--use-cases', '--claims'].includes(key) ||
				values[key] !== undefined ||
				!args[i + 1] ||
				args[i + 1].startsWith('--')
			)
				throw new Error(`Invalid option ${key}`);
			values[key] = args[i + 1];
		}
		if (!values['--current'] || !values['--source']) throw new Error('--current and --source are required');
		process.stdout.write(
			stableJson(
				buildPlannerInput({
					currentPath: values['--current'],
					sourcePath: values['--source'],
					uxPath: values['--ux'],
					useCaseIds: values['--use-cases']?.split(',') ?? [],
					claimIds: values['--claims']?.split(',') ?? [],
				}),
			),
		);
	} catch (error) {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	}
}
