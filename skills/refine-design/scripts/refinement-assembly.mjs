import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCurrentProduct} from './product-model.mjs';
import {createPublicationArtifactProposal} from './product-publication-proposals.mjs';
import {publishArtifactResourceFiles} from './product-publication-package.mjs';
import {commitProductArtifact} from './product-artifact-store.mjs';
import {resolveProductContext} from './product-context.mjs';
import {array, ensureUnlinkedPath, parseJsonFile, stableId, stableJson} from './product-artifact-utils.mjs';

/**
 * Serial publication assembly over existing closed requests. Never invokes agents.
 * Each unit is attempted once; failed dependencies cannot reuse an older artifact.
 * @param {{currentPath: string, requests: object[], sourceRoot: string,
 *   assetRoot?: string}} options
 * @returns {object} Progress, repair instructions, and context only on completion.
 */
export function assemblePublication({currentPath, requests, sourceRoot, assetRoot}) {
	array(requests, 'publication requests');
	if (!requests.length) throw new Error('Publication assembly requires at least one request');
	const productRoot = path.dirname(path.resolve(currentPath));
	const initial = loadCurrentProduct(currentPath);
	const productModelSha256 = initial.snapshot.productModel.sha256;
	const report = {
		kind: 'refinement-assembly-report',
		schemaVersion: '1.0',
		productModelSha256,
		status: 'complete',
		items: [],
		context: null,
	};
	const results = new Map();
	const pending = [];
	const ids = new Set();
	const repair = (request, status, problem, remedy) => {
		const item = {id: request.id, status, problem, remedy};
		results.set(request.id, item);
		report.items.push(item);
		report.status = 'needs-repair';
	};
	const occurrences = new Map();
	for (const request of requests) occurrences.set(request?.id, (occurrences.get(request?.id) ?? 0) + 1);
	requests.forEach((request, index) => {
		try {
			stableId(request?.id, 'request id');
			ids.add(request.id);
			if (occurrences.get(request.id) !== 1) {
				if (!results.has(request.id))
					repair(
						request,
						'needs-repair',
						`Duplicate publication request ${request.id}`,
						'Give each requested artifact one unambiguous request before retrying its dependents.',
					);
			} else pending.push(request);
		} catch (error) {
			report.items.push({
				id: null,
				requestIndex: index,
				status: 'needs-repair',
				problem: error.message,
				remedy: 'Identify this request with a valid stable artifact ID, then retry it.',
			});
			report.status = 'needs-repair';
		}
	});
	ensureUnlinkedPath(productRoot, productRoot);
	const scratch = fs.mkdtempSync(path.join(productRoot, '.refinement-assembly-'));
	try {
		while (pending.length) {
			let progressed = false;
			for (const request of [...pending]) {
				const dependencies = request.artifactDependencyIds;
				if (
					Array.isArray(dependencies) &&
					dependencies.some((id) => results.has(id) && results.get(id).status !== 'complete')
				) {
					repair(
						request,
						'blocked',
						'A requested dependency needs repair',
						'Repair the failed dependency, then rerun assembly with the same requests.',
					);
				} else if (Array.isArray(dependencies) && dependencies.some((id) => ids.has(id) && !results.has(id))) {
					continue;
				} else {
					try {
						if (loadCurrentProduct(currentPath).snapshot.productModel.sha256 !== productModelSha256) {
							throw new Error('Product model changed during assembly');
						}
						const produced = createPublicationArtifactProposal({
							currentPath,
							request,
							sourceRoot,
							assetRoot,
						});
						// A concurrent model commit must not let a new proposal join the old batch.
						if (loadCurrentProduct(currentPath).snapshot.productModel.sha256 !== productModelSha256) {
							throw new Error('Product model changed during assembly');
						}
						const proposalPath = path.join(scratch, `${request.id}.json`);
						fs.writeFileSync(proposalPath, stableJson(produced.proposal));
						publishArtifactResourceFiles(produced.files, {outputRoot: scratch});
						const result = commitProductArtifact({
							currentPath,
							proposalPath,
							baseSnapshotSha256: produced.baseSnapshotSha256,
							resourceRoot: scratch,
						});
						const item = {id: request.id, status: 'complete', result};
						results.set(request.id, item);
						report.items.push(item);
					} catch (error) {
						repair(
							request,
							'needs-repair',
							error.message,
							'Correct this request or its bound source; revalidate dependencies and review. Resolve any lock with its owner before rerunning.',
						);
					}
				}
				pending.splice(pending.indexOf(request), 1);
				progressed = true;
			}
			if (!progressed) {
				for (const request of pending)
					repair(
						request,
						'blocked',
						'Requested dependencies form a cycle or cannot be ordered',
						'Return to the publication request list and correct its dependency graph. Preserve completed units.',
					);
				break;
			}
		}
		if (report.status === 'complete') {
			try {
				if (loadCurrentProduct(currentPath).snapshot.productModel.sha256 !== productModelSha256)
					throw new Error('Product model changed before context resolution');
				const resolved = resolveProductContext({currentPath});
				if (resolved.context.productModel.sha256 !== productModelSha256) {
					throw new Error('Product model changed during context resolution');
				}
				const {context, ...contextBinding} = resolved;
				report.context = contextBinding;
			} catch (error) {
				repair(
					{id: 'context'},
					'needs-repair',
					error.message,
					'Repair the current store or resource bindings, then resolve context again.',
				);
			}
		}
		return report;
	} finally {
		ensureUnlinkedPath(scratch, productRoot);
		fs.rmSync(scratch, {recursive: true, force: true});
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const args = process.argv.slice(2);
		const options = {};
		for (let i = 0; i < args.length; i += 2) {
			if (
				!['--current', '--input', '--source-root', '--asset-root'].includes(args[i]) ||
				options[args[i]] !== undefined ||
				!args[i + 1] ||
				args[i + 1].startsWith('--')
			)
				throw new Error(`Invalid option ${args[i]}`);
			options[args[i]] = args[i + 1];
		}
		for (const flag of ['--current', '--input', '--source-root'])
			if (!options[flag]) throw new Error(`${flag} is required`);
		const report = assemblePublication({
			currentPath: options['--current'],
			sourceRoot: options['--source-root'],
			assetRoot: options['--asset-root'],
			requests: parseJsonFile(options['--input'], 'Publication requests', 4 * 1024 * 1024),
		});
		process.stdout.write(stableJson(report));
		if (report.status !== 'complete') process.exitCode = 1;
	} catch (error) {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	}
}
