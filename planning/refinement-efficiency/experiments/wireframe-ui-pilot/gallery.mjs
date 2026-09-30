import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

/** Build a local index without copying component artifacts or changing their identity. */
export function writeGallery(attempt) {
	const output = path.join(attempt, 'workspace/outputs');
	const scope = JSON.parse(fs.readFileSync(path.join(output, 'scope.json')));
	const escape = (value) =>
		String(value).replace(
			/[&<>"']/g,
			(character) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[character],
		);
	const panels = scope.elements.map((element) => {
		const stages = ['wireframe', 'ui'].map((stage) => {
			const saved = path.join(output, element.id, stage + '-ready.json');
			if (!fs.existsSync(saved))
				return `<div><h3>${stage === 'ui' ? 'UI comp' : 'Wireframe'}</h3><p>${element.disposition === 'reuse' ? 'Existing interface reused.' : 'Not delivered yet.'}</p></div>`;
			const receipt = JSON.parse(fs.readFileSync(saved));
			const reviewPath = path.join(
				output,
				element.id,
				`${stage === 'ui' ? 'visual-review' : 'wireframe-review'}-r${receipt.revision}.json`,
			);
			const review = fs.existsSync(reviewPath) ? JSON.parse(fs.readFileSync(reviewPath)) : null;
			const reviewStatus = review
				? `Experimental review: ${escape(review.verdict)} · ${(review.findings ?? []).length} findings`
				: 'Not independently reviewed at this revision';
			const relative = path.relative(attempt, receipt.previewPath).replaceAll('\\', '/');
			const imagePath = receipt.previewPath.replace(/\.html$/, '.png');
			const image = fs.existsSync(imagePath)
				? `<a href="${escape(relative)}"><img alt="${escape(element.title ?? element.id)} ${stage} preview" src="${escape(path.relative(attempt, imagePath).replaceAll('\\', '/'))}"></a>`
				: '';
			return `<div><h3>${stage === 'ui' ? 'UI comp' : 'Wireframe'} · revision ${receipt.revision}</h3><p>${reviewStatus}</p><a href="${escape(relative)}">Open all states</a>${image}</div>`;
		});
		return `<section><h2>${escape(element.title ?? element.id)}</h2><p>${escape(element.changeReason)}</p><p>Changed flows: ${element.sourceFlowRefs.map(escape).join(', ')} · ${escape(element.disposition)}</p><div class="pair">${stages.join('')}</div></section>`;
	});
	const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Alexa wireframe/UI pilot</title><style>body{font:16px system-ui;margin:32px auto;max-width:1300px;padding:0 24px;background:#f4f5f7;color:#222}section{background:white;border:1px solid #ddd;padding:24px;margin:20px 0}h2{margin-top:0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}img{display:block;max-width:100%;max-height:360px;object-fit:contain;object-position:top left;margin-top:16px;border:1px solid #ddd}header p{max-width:900px;line-height:1.5}@media(max-width:750px){.pair{grid-template-columns:1fr}}</style><header><h1>Alexa wireframe → UI pilot</h1><p>Isolated experimental previews from the saved Alexa update. Upstream UX is unreviewed; these artifacts are not canonical product approval. Each link opens the actual saved component and its state variants. Reused interfaces were deliberately not regenerated.</p></header>${panels.join('')}</html>`;
	const location = path.join(attempt, 'index.html');
	fs.writeFileSync(location, html);
	return {path: location, elements: scope.elements.length};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
	console.log(JSON.stringify(writeGallery(path.resolve(process.argv[2]))));
