import test from 'node:test';
import assert from 'node:assert/strict';
import {capturePages} from './capture-pages.mjs';

test('long scene collections retain every scene exactly once within bounded captures', () => {
	const scenes = Array.from({length: 20}, (_, i) => ({id: 'state-' + i, viewport: {height: 800}}));
	const pages = capturePages(scenes);
	assert.equal(pages.length, 5);
	assert.deepEqual(
		pages.flatMap((p) => p.sceneIds),
		scenes.map((s) => s.id),
	);
	assert(pages.every((p) => p.height <= 6000));
	assert.equal(pages.at(-1).end, scenes.length);
	assert.equal(new Set(pages.map((p) => p.suffix)).size, pages.length);
});

test('short existing collections keep their original complete capture path', () => {
	const pages = capturePages([{id: 'ready', viewport: {height: 400}}]);
	assert.deepEqual(pages, [{start: 0, end: 1, height: 750, suffix: '', sceneIds: ['ready']}]);
});
