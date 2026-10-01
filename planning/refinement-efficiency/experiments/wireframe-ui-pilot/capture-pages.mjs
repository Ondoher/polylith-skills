import assert from 'node:assert/strict';

/** Keep a long contact sheet complete by capturing bounded groups of unchanged scenes. */
export function capturePages(scenes) {
	const totalHeight = 200 + scenes.reduce((sum, scene) => sum + scene.viewport.height + 150, 0);
	if (totalHeight <= 12000)
		return [{start: 0, end: scenes.length, height: totalHeight, suffix: '', sceneIds: scenes.map((s) => s.id)}];
	const pages = [];
	let start = 0;
	while (start < scenes.length) {
		let end = start;
		let height = 200;
		while (end < scenes.length && end - start < 4 && height + scenes[end].viewport.height + 150 <= 6000) {
			height += scenes[end++].viewport.height + 150;
		}
		assert(end > start, 'One scene exceeds the bounded capture height; retain the draft for capture repair');
		pages.push({
			start,
			end,
			height,
			suffix: '-page-' + (pages.length + 1),
			sceneIds: scenes.slice(start, end).map((s) => s.id),
		});
		start = end;
	}
	return pages;
}

/** Filter only the disposable browser copy, retaining the authored artifact unchanged. */
export function capturePageHtml(html, page) {
	return html.replace(
		'</body>',
		`<script>document.querySelectorAll('.pilot-scene').forEach((node,index)=>{if(index<${page.start}||index>=${page.end})node.remove()});</script></body>`,
	);
}
