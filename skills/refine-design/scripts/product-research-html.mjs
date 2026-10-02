import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

/** Supported research Markdown: ATX headings, paragraphs, flat ordered/unordered
 * lists with wrapped lines, pipe tables (escape literal pipes), inline emphasis,
 * code, inline links/images and backslash escapes. Image attribution is ordinary
 * adjacent Markdown text, outside the image. Raw HTML and unknown inline syntax
 * remain escaped text. Fences, blockquotes, reference links, footnotes and nested
 * lists are rejected with a line number; this is not a CommonMark parser.
 */

/** Called by the renderer to protect text and attribute contents.
 *
 * @param {string} value - Authored content.
 * @returns {string} - Escaped HTML text.
 */
function escapeHtml(value) {
	return value.replace(
		/[&<>"']/g,
		(character) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[character],
	);
}

/** Called by inline rendering to retain local resources across publication paths.
 * Throws for executable or unsupported URI schemes.
 *
 * @param {string} destination - Markdown URL or local relative path.
 * @param {string} resourcePrefix - Relative path from HTML to the Markdown directory.
 * @returns {string} - Safe escaped destination.
 */
function resourceUrl(destination, resourcePrefix) {
	const decoded = destination.replace(/\\([\\()])/g, '$1');
	if (/[\u0000-\u0020\u007f]/.test(decoded)) throw new Error('Markdown URLs must encode whitespace and controls');
	if (/^[a-z][a-z\d+.-]*:/i.test(decoded) && !/^(https?|mailto|file):/i.test(decoded))
		throw new Error('Unsupported Markdown URL scheme');
	return escapeHtml(/^(?:[a-z][a-z\d+.-]*:|\/|#|\?)/i.test(decoded) ? decoded : resourcePrefix + decoded);
}

/** Called by the renderer to interpret the bounded inline syntax without raw HTML.
 *
 * @param {string} text - Authored inline Markdown.
 * @param {string} resourcePrefix - Relative resource location.
 * @param {number} depth - Current inline nesting depth.
 * @returns {string} - Escaped semantic inline HTML.
 */
function inline(text, resourcePrefix, depth = 0) {
	if (depth > 16) throw new Error('Markdown inline nesting exceeds the supported depth');
	let output = '';
	for (let offset = 0; offset < text.length;) {
		const remaining = text.slice(offset);
		const escaped = /^\\([\\`*_[\]{}()#+.!|>~-])/.exec(remaining);
		const code = /^(`+)([\s\S]*?)\1(?!`)/.exec(remaining);
		const reference = /^(!?)\[([^\]\n]*)\]\((?:<([^<>\n]+)>|((?:\\.|[^\s()])+))(?:\s+"([^"\n]*)")?\)/.exec(
			remaining,
		);
		if (escaped) {
			output += escapeHtml(escaped[1]);
			offset += escaped[0].length;
		} else if (code) {
			output += `<code>${escapeHtml(code[2])}</code>`;
			offset += code[0].length;
		} else if (reference) {
			const destination = resourceUrl(reference[3] ?? reference[4], resourcePrefix);
			const title = reference[5] === undefined ? '' : ` title="${escapeHtml(reference[5])}"`;
			output += reference[1]
				? `<img src="${destination}" alt="${escapeHtml(reference[2])}"${title} loading="lazy">`
				: `<a href="${destination}"${title}>${inline(reference[2], resourcePrefix, depth + 1)}</a>`;
			offset += reference[0].length;
		} else {
			const emphasis = /^(\*\*|__|\*|_)(?=\S)([\s\S]*?\S)\1/.exec(remaining);
			if (emphasis && (offset === 0 || emphasis[1].startsWith('*') || !/\w/.test(text[offset - 1]))) {
				const tag = emphasis[1].length === 2 ? 'strong' : 'em';
				output += `<${tag}>${inline(emphasis[2], resourcePrefix, depth + 1)}</${tag}>`;
				offset += emphasis[0].length;
			} else {
				output += escapeHtml(text[offset]);
				offset++;
			}
		}
	}
	return output;
}

/** Called by table rendering to split cells without consuming escaped pipes.
 *
 * @param {string} line - One authored table row.
 * @returns {string[]} - Trimmed cell Markdown.
 */
function tableCells(line) {
	return line
		.trim()
		.replace(/^\|/, '')
		.replace(/(?<!\\)\|$/, '')
		.split(/(?<!\\)\|/)
		.map((cell) => cell.trim());
}

/** Call this method to render one authored research brief as a standalone page.
 * The visible narrative comes from Markdown; supporting captions remain outside
 * images. Throws for invalid inputs, unsupported block syntax or malformed tables.
 *
 * @param {string} markdown - Complete brief in the documented Markdown subset.
 * @param {string} resourcePrefix - Relative path to its resource directory, ending in / when nonempty.
 * @returns {string} - Complete accessible HTML document with heading navigation.
 */
export function renderProductResearchHtml(markdown, resourcePrefix = '') {
	if (typeof markdown !== 'string' || !markdown.trim()) throw new Error('Research Markdown must be nonempty text');
	if (typeof resourcePrefix !== 'string') throw new Error('Resource prefix must be text');
	const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
	for (const [index, line] of lines.entries()) {
		if (/^\s*(?:```|~~~|>|\[[^\]]+\]:)|^\s+[-*+]\s|^\s+\d+[.)]\s/.test(line))
			throw new Error(`Unsupported Markdown block at line ${index + 1}; use the documented research subset`);
	}
	const blocks = [];
	const navigation = [];
	const usedAnchors = new Set(['research-content']);
	let title = '';
	for (let index = 0; index < lines.length;) {
		if (!lines[index].trim()) {
			index++;
			continue;
		}
		const heading = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/.exec(lines[index]);
		if (heading) {
			const text = heading[2];
			const stem =
				text
					.toLowerCase()
					.normalize('NFKD')
					.replace(/[^\p{L}\p{N}]+/gu, '-')
					.replace(/^-|-$/g, '') || 'section';
			let anchor = stem;
			let count = 1;
			while (usedAnchors.has(anchor)) anchor = `${stem}-${++count}`;
			usedAnchors.add(anchor);
			const content = inline(text, resourcePrefix);
			blocks.push(`<h${heading[1].length} id="${escapeHtml(anchor)}">${content}</h${heading[1].length}>`);
			navigation.push(`<li><a href="#${escapeHtml(anchor)}">${content.replace(/<[^>]+>/g, '')}</a></li>`);
			if (!title && heading[1].length === 1) title = content.replace(/<[^>]+>/g, '');
			index++;
			continue;
		}
		if (
			index + 1 < lines.length &&
			lines[index].includes('|') &&
			/^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/.test(lines[index + 1].trim())
		) {
			const headers = tableCells(lines[index]);
			if (tableCells(lines[index + 1]).length !== headers.length)
				throw new Error(`Table width differs at line ${index + 2}`);
			const rows = [];
			index += 2;
			while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
				const cells = tableCells(lines[index]);
				if (cells.length !== headers.length) throw new Error(`Table width differs at line ${index + 1}`);
				rows.push(`<tr>${cells.map((cell) => `<td>${inline(cell, resourcePrefix)}</td>`).join('')}</tr>`);
				index++;
			}
			blocks.push(
				`<div class="table-scroll" tabindex="0" role="region" aria-label="Research comparison"><table><thead><tr>${headers.map((cell) => `<th scope="col">${inline(cell, resourcePrefix)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`,
			);
			continue;
		}
		const list = /^(?:([-*+])|(\d+)[.)])\s+(.+)$/.exec(lines[index]);
		if (list) {
			const ordered = Boolean(list[2]);
			const items = [];
			const start = ordered ? ` start="${Number(list[2])}"` : '';
			while (index < lines.length) {
				const item = /^(?:([-*+])|(\d+)[.)])\s+(.+)$/.exec(lines[index]);
				if (!item || Boolean(item[2]) !== ordered) break;
				let content = item[3];
				index++;
				while (index < lines.length && /^\s+\S/.test(lines[index])) content += ` ${lines[index++].trim()}`;
				items.push(
					`<li${ordered ? ` value="${Number(item[2])}"` : ''}>${inline(content, resourcePrefix)}</li>`,
				);
			}
			const tag = ordered ? 'ol' : 'ul';
			blocks.push(`<${tag}${start}>${items.join('')}</${tag}>`);
			continue;
		}
		const paragraph = [lines[index++].trim()];
		while (
			index < lines.length &&
			lines[index].trim() &&
			!/^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s)/.test(lines[index]) &&
			!(lines[index].includes('|') && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1]))
		)
			paragraph.push(lines[index++].trim());
		blocks.push(`<p>${inline(paragraph.join(' '), resourcePrefix)}</p>`);
	}
	if (!title) throw new Error('Research Markdown needs an H1 title');
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
:root{color-scheme:light;--page:#f6f7f9;--surface:#fff;--text:#18232c;--muted:#53616b;--line:#d9e0e5;--accent:#075ca8;font:17px/1.65 system-ui,sans-serif;color:var(--text);background:var(--page)}
*{box-sizing:border-box}body{margin:0}a{color:var(--accent);overflow-wrap:anywhere}a:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--accent);outline-offset:4px}.skip{position:absolute;left:1rem;top:-5rem}.skip:focus{top:1rem;background:var(--surface);padding:.5rem}
.layout{display:grid;grid-template-columns:minmax(13rem,18rem) minmax(0,58rem);gap:2rem;max-width:82rem;margin:auto;padding:2rem}nav{align-self:start;position:sticky;top:1rem;max-height:calc(100vh - 2rem);overflow:auto;font-size:.88rem}nav ul{list-style:none;padding:0}nav li{margin:.45rem 0}main{min-width:0;background:var(--surface);padding:clamp(1rem,4vw,3rem);border:1px solid var(--line);border-radius:.6rem}h1,h2,h3,h4,h5,h6{line-height:1.25;scroll-margin-top:1rem}h1{font-size:2rem}h2{margin-top:2.5rem;border-top:1px solid var(--line);padding-top:1.5rem}p,li{overflow-wrap:anywhere}img{max-width:100%;height:auto;display:block;margin:1rem auto}code{font-family:ui-monospace,monospace;background:var(--page);padding:.1rem .3rem;border-radius:.2rem}.table-scroll{overflow:auto;margin:1.5rem 0}table{border-collapse:collapse;width:100%;font-size:.92rem}th,td{border:1px solid var(--line);padding:.7rem;vertical-align:top;text-align:left}th{background:var(--page)}
@media(max-width:850px){.layout{grid-template-columns:minmax(0,1fr);padding:1rem;gap:1rem}nav{position:static;max-height:none}}@media print{.layout{display:block;padding:0}nav,.skip{display:none}main{border:0;padding:0}a{color:inherit}h2{break-after:avoid}tr,img{break-inside:avoid}}
</style></head><body><a class="skip" href="#research-content">Skip to research</a><div class="layout"><nav aria-label="Research sections"><strong>Contents</strong><ul>${navigation.join('')}</ul></nav><main id="research-content">${blocks.join('\n')}</main></div></body></html>\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const {values} = parseArgs({options: {input: {type: 'string'}, output: {type: 'string'}}});
		if (!values.input || !values.output) throw new Error('Usage: --input Markdown --output HTML');
		const inputPath = path.resolve(values.input);
		const outputPath = path.resolve(values.output);
		if (inputPath === outputPath) throw new Error('Input and output must be different files');
		const relative = path.relative(path.dirname(outputPath), path.dirname(inputPath)).split(path.sep).join('/');
		const html = renderProductResearchHtml(await fs.readFile(inputPath, 'utf8'), relative ? `${relative}/` : '');
		await fs.mkdir(path.dirname(outputPath), {recursive: true});
		await fs.writeFile(outputPath, html, 'utf8');
		process.stdout.write(`${outputPath}\n`);
	} catch (error) {
		process.stderr.write(`product-research-html: ${error.message}\n`);
		process.exitCode = 1;
	}
}
