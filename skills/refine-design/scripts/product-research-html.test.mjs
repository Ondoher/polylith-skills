import assert from 'node:assert/strict';
import test from 'node:test';
import {renderProductResearchHtml} from './product-research-html.mjs';

test('research brief keeps narrative, navigation, comparison sources and attributed images', () => {
	const html = renderProductResearchHtml(
		`# Scheduling research

Recommend **shared availability** with *explicit confirmation* and \`tentative\` state.

## Task context

- Staff coordinate appointments.
  Customers receive the agreed time.
- Availability changes require confirmation.

3. Choose an available time.
4. Confirm the appointment.

## Evidence

| Pattern | Evidence | Limit |
| --- | --- | --- |
| Confirmation | [Official guide](https://example.org/guide?view=tasks&lang=en) | Context varies |
| Capacity | Shared \\| individual | Check owner policy |

![Calendar confirmation](references/calendar.png)

Source: [Provider documentation](https://example.org/interface), accessed 2026-10-02. This image is observed evidence.

## Evidence

An alternative remains open. Raw <script>alert('test')</script> is explanatory text.

## Evidence 2

Retain this separate section too.
`,
		'../research/',
	);
	assert.match(html, /<title>Scheduling research<\/title>/);
	assert.match(html, /href="#task-context"/);
	assert.match(html, /id="evidence-2"/);
	const anchors = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
	assert.equal(new Set(anchors).size, anchors.length);
	assert.match(html, /<strong>shared availability<\/strong>/);
	assert.match(html, /<em>explicit confirmation<\/em>/);
	assert.match(html, /<code>tentative<\/code>/);
	assert.match(html, /Staff coordinate appointments\. Customers receive the agreed time\./);
	assert.match(html, /<ol start="3"><li value="3">Choose an available time\./);
	assert.match(html, /<th scope="col">Pattern<\/th>/);
	assert.match(html, /href="https:\/\/example\.org\/guide\?view=tasks&amp;lang=en"/);
	assert.match(html, /<td>Shared \| individual<\/td>/);
	assert.match(html, /src="\.\.\/research\/references\/calendar\.png" alt="Calendar confirmation"/);
	assert.match(html, /<\/p>\s*<p>Source: <a href="https:\/\/example\.org\/interface"/);
	assert.match(html, /This image is observed evidence\./);
	assert.match(html, /Raw &lt;script&gt;alert\(&#39;test&#39;\)&lt;\/script&gt;/);
	assert.doesNotMatch(html, /<script>/);
});

test('unsupported blocks are identified before producing a publication', () => {
	assert.throws(
		() => renderProductResearchHtml('# Research\n\n> Quoted evidence'),
		/Unsupported Markdown block at line 3/,
	);
});
