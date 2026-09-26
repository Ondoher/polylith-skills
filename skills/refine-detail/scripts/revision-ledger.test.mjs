import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {sha256} from '../../refine-design/scripts/product-artifact-utils.mjs';
import {recordRevision} from './revision-ledger.mjs';

test('records exact before and after excerpts for every inventoried paper item', (t) => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paper-revision-'));
	t.after(() => fs.rmSync(root, {recursive: true, force: true}));
	const beforePath = path.join(root, 'before.md'),
		afterPath = path.join(root, 'after.md');
	const ledgerPath = path.join(root, 'ledger.json'),
		productRoot = path.join(root, 'product', 'Sample');
	const before = '# Import consistency\n\nShould a failed import keep earlier items?\n';
	const after =
		'# Import consistency\n\nOpen question: Should a failed import keep earlier items? The storage proof is pending.\n';
	fs.writeFileSync(beforePath, before);
	fs.writeFileSync(afterPath, after);
	const ledger = {
		schemaVersion: '1.0',
		kind: 'white-paper-revision',
		beforeSha256: sha256(before),
		afterSha256: sha256(after),
		items: [
			{
				id: 'failed-import-question',
				kind: 'question',
				beforeExcerpt: 'Should a failed import keep earlier items?',
				afterExcerpt: 'Open question: Should a failed import keep earlier items?',
				disposition: 'retained',
				reason: '',
			},
		],
	};
	fs.writeFileSync(ledgerPath, JSON.stringify(ledger));
	const result = recordRevision({beforePath, afterPath, ledgerPath, productRoot});
	assert.equal(result.itemCount, 1);
	assert.ok(fs.existsSync(path.join(productRoot, result.path)));
});
