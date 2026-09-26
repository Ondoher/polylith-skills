import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TextDecoder} from 'node:util';
import {sha256, stableJson, writeImmutable} from '../../refine-design/scripts/product-artifact-utils.mjs';

const kinds = new Set([
	'fact',
	'constraint',
	'claim',
	'decision',
	'rationale',
	'alternative',
	'question',
	'uncertainty',
	'dependency',
	'experiment',
	'result',
	'citation',
]);
const dispositions = new Set(['retained', 'resolved', 'superseded']);

const requireValue = (condition, message) => {
	if (!condition) throw new Error(message);
};

/** Check a parent-authored semantic coverage ledger against exact before/after paper bytes. */
export function recordRevision({beforePath, afterPath, ledgerPath, productRoot}) {
	const beforeBytes = fs.readFileSync(beforePath);
	const afterBytes = fs.readFileSync(afterPath);
	const decoder = new TextDecoder('utf-8', {fatal: true});
	const before = decoder.decode(beforeBytes),
		after = decoder.decode(afterBytes);
	const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
	requireValue(
		ledger.schemaVersion === '1.0' && ledger.kind === 'white-paper-revision',
		'Invalid white-paper revision ledger',
	);
	requireValue(
		ledger.beforeSha256 === sha256(beforeBytes) && ledger.afterSha256 === sha256(afterBytes),
		'Revision ledger does not bind the exact paper bytes',
	);
	requireValue(
		Array.isArray(ledger.items) && ledger.items.length > 0,
		'Revision ledger needs prior information items',
	);
	const ids = new Set();
	for (const item of ledger.items) {
		requireValue(
			item &&
				typeof item === 'object' &&
				Object.keys(item).sort().join(',') === 'afterExcerpt,beforeExcerpt,disposition,id,kind,reason',
			'Revision item has invalid fields',
		);
		requireValue(
			typeof item.id === 'string' && /^[a-z][a-z0-9-]*$/u.test(item.id) && !ids.has(item.id),
			'Revision item ID is invalid or repeated',
		);
		ids.add(item.id);
		requireValue(
			kinds.has(item.kind) && dispositions.has(item.disposition),
			`Revision item ${item.id} has invalid kind or disposition`,
		);
		requireValue(
			typeof item.beforeExcerpt === 'string' && item.beforeExcerpt.trim() && before.includes(item.beforeExcerpt),
			`Revision item ${item.id} is absent from the before paper`,
		);
		requireValue(
			typeof item.afterExcerpt === 'string' && item.afterExcerpt.trim() && after.includes(item.afterExcerpt),
			`Revision item ${item.id} is absent from the after paper`,
		);
		requireValue(
			item.disposition === 'retained' || (typeof item.reason === 'string' && item.reason.trim()),
			`Revision item ${item.id} needs a resolution or supersession reason`,
		);
	}
	const bytes = Buffer.from(stableJson(ledger));
	const digest = sha256(bytes);
	const storedPath = `white-papers/revisions/${digest}.json`;
	writeImmutable(path.join(productRoot, storedPath), bytes, productRoot);
	return {path: storedPath, sha256: digest, itemCount: ledger.items.length};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2);
	const options = new Map();
	for (let index = 0; index < args.length; index += 2) options.set(args[index], args[index + 1]);
	if (args.length !== 8 || !['--before', '--after', '--ledger', '--product-root'].every((key) => options.has(key)))
		throw new Error(
			'Usage: revision-ledger.mjs --before <file> --after <file> --ledger <json> --product-root <directory>',
		);
	process.stdout.write(
		stableJson(
			recordRevision({
				beforePath: options.get('--before'),
				afterPath: options.get('--after'),
				ledgerPath: options.get('--ledger'),
				productRoot: options.get('--product-root'),
			}),
		),
	);
}
