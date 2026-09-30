/** Browser-only inspection. Scrolling and intentional grid overlays remain supported. */
export function collectWireframeGeometry() {
	const warnings = [];
	const boxes = [];
	for (const viewport of document.querySelectorAll('.ui-viewport')) {
		const nodes = [...viewport.querySelectorAll('.ui-node-frame')];
		for (const node of nodes) {
			const rect = node.getBoundingClientRect();
			const id = node.dataset.uiNode ?? node.querySelector('[data-ui-node]')?.dataset.uiNode ?? 'control';
			// Grid/flex frames may fit while their text spills out of a compressed row.
			// Inspect painted text as well as the frame, ignoring deliberately clipped
			// or scrollable descendants and visual primitives that support overlays.
			if (node.dataset.uiTemplate !== 'visual') {
				const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
				let text;
				while ((text = walker.nextNode())) {
					if (!text.textContent.trim()) continue;
					if (node.dataset.uiTemplate === 'text-field' && text.parentElement.closest('label')) continue;
					let parent = text.parentElement;
					let bounded = false;
					while (parent && parent !== node) {
						const style = getComputedStyle(parent);
						if (
							['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowY) ||
							['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX)
						)
							bounded = true;
						parent = parent.parentElement;
					}
					if (bounded) continue;
					const range = document.createRange();
					range.selectNodeContents(text);
					const exceeds = [...range.getClientRects()].some(
						(r) =>
							r.width &&
							r.height &&
							(r.left < rect.left - 2 ||
								r.right > rect.right + 2 ||
								r.top < rect.top - 2 ||
								r.bottom > rect.bottom + 2),
					);
					if (exceeds) {
						warnings.push({
							nodeRef: id,
							kind: 'text-overflow',
							message: 'Visible text exceeds its allocated control frame; inspect overlap or clipping.',
						});
						break;
					}
				}
			}
			let parent = node.parentElement;
			while (parent && viewport.contains(parent)) {
				const style = getComputedStyle(parent);
				if (['auto', 'scroll'].includes(style.overflowY) || ['auto', 'scroll'].includes(style.overflowX)) break;
				const bounds = parent.getBoundingClientRect();
				if (
					rect.right > bounds.right + 2 ||
					rect.bottom > bounds.bottom + 2 ||
					rect.left < bounds.left - 2 ||
					rect.top < bounds.top - 2
				) {
					warnings.push({
						nodeRef: id,
						kind: 'content-overflow',
						message: 'Control exceeds a non-scrolling container; inspect clipping or intentional overlay.',
					});
					break;
				}
				parent = parent.parentElement;
			}
			boxes.push({nodeRef: id, width: Math.round(rect.width), height: Math.round(rect.height)});
		}
	}
	return {
		warnings,
		controlsChecked: boxes.length,
		limitation:
			'Static geometry warnings; inspect intentional overlaps and actual usage. No runtime behavior is verified.',
	};
}

/** Inject a local deterministic probe into a disposable capture copy, never the authored artifact. */
export function geometryInspectionHtml(html) {
	return html.replace(
		'</body>',
		`<pre id="wireframe-geometry" hidden></pre><script>addEventListener('load',()=>{document.getElementById('wireframe-geometry').textContent=JSON.stringify((${collectWireframeGeometry.toString()})());});</script></body>`,
	);
}

/** Extract the bounded diagnostic payload from a browser DOM dump. */
export function readGeometryInspection(dom) {
	const raw = /<pre id="wireframe-geometry" hidden(?:="")?>([\s\S]*?)<\/pre>/.exec(dom)?.[1];
	if (!raw) return {warnings: [], unavailable: true, reason: 'Browser did not return layout diagnostics'};
	return JSON.parse(raw.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'));
}
