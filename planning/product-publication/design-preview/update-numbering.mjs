// Number the authored format samples only; this is not the production publisher.
import {readFile, writeFile} from 'node:fs/promises';

const base = new URL('./', import.meta.url);
const outline = JSON.parse(await readFile(new URL('outline.json', base), 'utf8'));
const checkOnly = process.argv.includes('--check');
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const byId = new Map();
const byDestination = new Map();
const documents = new Map();

function numberSections(sections, prefix, document) {
  return sections.map((section, index) => {
    if (!/^[a-z][a-z0-9-]*$/.test(section.id) || byId.has(section.id)) {
      throw new Error(`Invalid or duplicate section ID: ${section.id}`);
    }
    if (!document.pages.includes(section.page) || !/^[a-z][a-z0-9-]*$/.test(section.anchor)) {
      throw new Error(`Invalid placement: ${section.id}`);
    }
    const number = [...prefix, index + 1].join('.');
    const entry = {...section, number};
    byId.set(entry.id, entry);
    const destination = `${entry.page}#${entry.anchor}`;
    if (byDestination.has(destination)) throw new Error(`Duplicate destination: ${destination}`);
    byDestination.set(destination, entry);
    // A standalone use-case page can be referenced without its heading fragment.
    if (entry.pageTitle && entry.page !== document.pages[0]) byDestination.set(entry.page, entry);
    entry.children = numberSections(section.children ?? [], [...prefix, index + 1], document);
    return entry;
  });
}

for (const document of outline.documents) {
  for (const page of document.pages) {
    if (!/^[a-z][a-z0-9-]*\.html$/.test(page) || documents.has(page)) {
      throw new Error(`Invalid or duplicated page: ${page}`);
    }
    documents.set(page, document);
  }
  document.numberedSections = numberSections(document.sections, [], document);
}

function navigation(sections, page) {
  return '<ul>' + sections.map(section => {
    const href = `${section.page === page ? '' : section.page}#${section.anchor}`;
    const current = section.pageTitle && section.page === page ? ' aria-current="page"' : '';
    return `<li><a href="${href}" data-outline-ref="${section.id}"${current}>`
      + `<span class="outline-number">${section.number}</span> `
      + `<span class="outline-title">${escapeHtml(section.title)}</span></a>`
      + (section.children.length ? navigation(section.children, page) : '') + '</li>';
  }).join('') + '</ul>';
}

const originals = new Map(await Promise.all([...documents.keys()].map(async page =>
  [page, await readFile(new URL(page, base), 'utf8')])));
const outputs = new Map();
const renderedHeadings = new Set();
for (const [page, original] of originals) {
  let html = original.replace(/<h([1-6])([^>]*\bdata-outline-id="([^"]+)"[^>]*)>[\s\S]*?<\/h\1>/g,
    (whole, level, attributes, id) => {
      const section = byId.get(id);
      if (!section || section.page !== page || renderedHeadings.has(id)) {
        throw new Error(`Unknown, misplaced, or repeated heading: ${page} ${id}`);
      }
      renderedHeadings.add(id);
      return `<h${level}${attributes}><span class="section-number">${section.number}</span> `
        + `${escapeHtml(section.title)}</h${level}>`;
    });

  // Keep existing prose/link destinations; only refresh the derived section label.
  html = html.replace(/<a\b([^>]*\bhref="([^"]+)"[^>]*)>([\s\S]*?)<\/a>/g,
    (whole, attributes, href, body) => {
      if (/\bdata-outline-ref=/.test(attributes)) return whole; // Rebuilt with navigation below.
      const destination = href.startsWith('#') ? page + href : href;
      const section = byDestination.get(destination);
      if (!section) return whole;
      attributes = attributes.replace(/\sdata-section-ref="[^"]*"/g, '');
      body = body.replace(/\s*<span class="reference-number">[\s\S]*?<\/span>/g, '');
      return `<a${attributes} data-section-ref="${section.id}">${body}`
        + ` <span class="reference-number">(§${section.number})</span></a>`;
    });

  const navPattern = /<nav class="contents"[\s\S]*?<\/nav>/g;
  if ([...html.matchAll(navPattern)].length !== 1) throw new Error(`Expected one contents nav: ${page}`);
  const document = documents.get(page);
  html = html.replace(navPattern, `<nav class="contents" aria-label="${escapeHtml(document.title)} contents">`
    + `<p class="label">${escapeHtml(document.title)}</p>`
    + navigation(document.numberedSections, page)
    + '<p class="aside-note">Section numbers follow the document hierarchy across pages. '
    + 'Requirement and use-case IDs remain independent.</p></nav>');
  outputs.set(page, html);
}
if (renderedHeadings.size !== byId.size) {
  throw new Error('Missing headings: ' + [...byId.keys()].filter(id => !renderedHeadings.has(id)).join(', '));
}
for (const [page, html] of outputs) {
  if (checkOnly && html !== originals.get(page)) throw new Error(`Numbering needs regeneration: ${page}`);
}
if (!checkOnly) {
  for (const [page, html] of outputs) await writeFile(new URL(page, base), html, 'utf8');
}
process.stdout.write(`${checkOnly ? 'Verified' : 'Updated'} ${byId.size} sections across ${outputs.size} pages; `
  + 'each document and sibling sequence starts at 1 with no gaps.\n');
