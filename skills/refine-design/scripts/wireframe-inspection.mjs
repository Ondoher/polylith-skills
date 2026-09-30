/** Browser-only inspection. Scrolling and intentional grid overlays remain supported. */
export function collectWireframeGeometry() {
	const warnings = [];
	const boxes = [];
	for (const viewport of document.querySelectorAll('.ui-viewport')) {
		const nodes = [...viewport.querySelectorAll('.ui-node-frame')];
		for (const node of nodes) {
			const rect = node.getBoundingClientRect();
			const id = node.dataset.uiNode ?? node.querySelector('[data-ui-node]')?.dataset.uiNode ?? 'control';
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
