import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {renderPreview} from './wireframe-preview.mjs';
import {stateSheet, scaleSheet} from './fixtures/wireframe-prevention.mjs';

const output = path.resolve('.codex-tmp/wireframe-prevention-browser', new Date().toISOString().replaceAll(':', '-'));
fs.mkdirSync(output, {recursive: true});
const executable = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
assert(fs.existsSync(executable), 'Edge is required for this explicit browser verification');
const results = [];

function inspect() {
	return [...document.querySelectorAll('.ui-node-frame')].map((frame) => {
		const element = frame.querySelector('.ui-template') ?? frame.firstElementChild;
		const style = getComputedStyle(element),
			box = element.getBoundingClientRect(),
			rect = frame.getBoundingClientRect();
		const focus = frame.dataset.uiState === 'focus';
		let clipped = false;
		const spread = focus ? parseFloat(style.outlineWidth) + Math.max(0, parseFloat(style.outlineOffset)) : 0;
		for (let parent = element.parentElement; parent; parent = parent.parentElement) {
			const css = getComputedStyle(parent),
				r = parent.getBoundingClientRect();
			if (
				['hidden', 'clip', 'auto', 'scroll'].includes(css.overflowX) &&
				(box.left - spread < r.left - 1 || box.right + spread > r.right + 1)
			)
				clipped = true;
			if (
				['hidden', 'clip', 'auto', 'scroll'].includes(css.overflowY) &&
				(box.top - spread < r.top - 1 || box.bottom + spread > r.bottom + 1)
			)
				clipped = true;
		}
		const sample = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
		const occluded = !!sample && sample !== element && !element.contains(sample);
		const input = element.querySelector('input'),
			label = element.querySelector('label');
		return {
			id: frame.dataset.uiNode,
			state: frame.dataset.uiState,
			focus,
			clipped,
			occluded,
			left: rect.left,
			right: rect.right,
			center: (rect.left + rect.right) / 2,
			width: box.width,
			height: box.height,
			outline: style.outlineWidth,
			outlineStyle: style.outlineStyle,
			outlineColor: style.outlineColor,
			background: style.backgroundColor,
			color: style.color,
			border: style.borderLeftWidth,
			shadow: style.boxShadow,
			borderColor: style.borderLeftColor,
			opacity: style.opacity,
			display: style.display,
			visibility: style.visibility,
			labelColor: label ? getComputedStyle(label).color : null,
			inputBorderColor: input ? getComputedStyle(input).borderColor : null,
			inputBorderWidth: input ? getComputedStyle(input).borderLeftWidth : null,
		};
	});
}

async function capture(name, document, mode, css = '') {
	const start = performance.now();
	const html = renderPreview(document, {mode})
		.html.replace('</head>', `<style>${css}</style></head>`)
		.replace(
			'</body>',
			`<pre id="probe" hidden></pre><script>addEventListener('load',()=>{document.getElementById('probe').textContent=JSON.stringify((${inspect.toString()})());});</script></body>`,
		);
	const source = path.join(output, name + '.html'),
		screenshot = path.join(output, name + '.png');
	fs.writeFileSync(source, html);
	const child = spawn(
		executable,
		[
			'--headless=new',
			'--disable-gpu',
			'--no-first-run',
			'--disable-extensions',
			'--dump-dom',
			'--virtual-time-budget=500',
			'--user-data-dir=' + path.join(output, 'browser-' + name),
			'--window-size=1300,1550',
			'--screenshot=' + screenshot,
			new URL('file:///' + source.replaceAll('\\', '/')).href,
		],
		{windowsHide: true, stdio: ['ignore', 'pipe', 'ignore']},
	);
	let dom = '';
	child.stdout.on('data', (chunk) => {
		dom += chunk;
	});
	const timer = setTimeout(() => child.kill(), 30000);
	const [code] = await once(child, 'exit');
	clearTimeout(timer);
	assert.equal(code, 0, 'Browser capture failed: ' + name);
	const raw = /<pre id="probe" hidden(?:="")?>([\s\S]*?)<\/pre>/.exec(dom)?.[1];
	assert(raw, 'Missing browser measurements: ' + name);
	const measurements = JSON.parse(raw.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'));
	const result = {
		name,
		mode,
		elapsedMs: performance.now() - start,
		fixtureSha256: createHash('sha256').update(JSON.stringify(document)).digest('hex'),
		screenshotSha256: createHash('sha256').update(fs.readFileSync(screenshot)).digest('hex'),
		measurements,
	};
	results.push(result);
	fs.writeFileSync(path.join(output, 'metrics.json'), JSON.stringify(results, null, 2));
	return measurements;
}

function visibleFocus(node) {
	return (
		node.width > 0 &&
		node.height > 0 &&
		node.outlineStyle !== 'none' &&
		parseFloat(node.outline) >= 2 &&
		!node.clipped &&
		!node.occluded
	);
}

for (const mode of ['wireframe', 'ui']) {
	const states = await capture('states-' + mode, stateSheet(), mode);
	for (const id of [
		'choice-group-focus',
		'visual-focus',
		'button-focus',
		'button-secondary-focus',
		'icon-button-focus',
		'nested-focus',
	])
		assert(visibleFocus(states.find((x) => x.id === id)), `${mode}: painted focus ${id}`);
	for (const state of ['focus', 'error', 'invalid']) {
		const field = states.find((x) => x.id === 'text-field-' + state);
		assert.equal(field.labelColor, field.inputBorderColor, `${mode}: field label and outline ${state}`);
	}
	const outlined = states.find((x) => x.id === 'button-secondary-disabled');
	const contained = states.find((x) => x.id === 'button-disabled');
	assert.notEqual(outlined.background, contained.background, `${mode}: disabled variants`);
	for (const template of ['button', 'button-secondary', 'icon-button', 'choice-group', 'visual']) {
		const normal = states.find((x) => x.id === template + '-default'),
			selected = states.find((x) => x.id === template + '-selected');
		assert.notEqual(selected.shadow, normal.shadow, `${mode}: selected ${template} needs a distinct treatment`);
	}
	for (const template of ['button', 'button-secondary', 'icon-button', 'choice-group', 'visual', 'text-field']) {
		const normal = states.find((x) => x.id === template + '-default'),
			disabled = states.find((x) => x.id === template + '-disabled');
		assert(
			normal.background !== disabled.background ||
				normal.color !== disabled.color ||
				normal.opacity !== disabled.opacity ||
				normal.inputBorderColor !== disabled.inputBorderColor,
			`${mode}: disabled ${template} must be distinct`,
		);
	}
}
const broken = await capture(
	'old-focus-defect',
	stateSheet(),
	'ui',
	'.ui-choice-group.ui-is-focus,.ui-visual.ui-is-focus{outline:none!important}',
);
assert(!visibleFocus(broken.find((x) => x.id === 'choice-group-focus')));
assert(!visibleFocus(broken.find((x) => x.id === 'nested-focus')));
const clipped = await capture('clipped-focus', stateSheet(), 'ui', '[data-ui-node="nested-focus"]{overflow:hidden}');
assert(!visibleFocus(clipped.find((x) => x.id === 'nested-focus')), 'Clipped outline declaration must not pass');
const occluded = await capture(
	'occluded-focus',
	stateSheet(),
	'ui',
	'[data-ui-node="selected-parent"]::after{content:"";position:absolute;inset:0;background:white;z-index:100}',
);
assert(!visibleFocus(occluded.find((x) => x.id === 'nested-focus')), 'Covered indicator must not pass');
for (const width of [400, 800]) {
	for (const [name, domain, interval] of [
		['measurement', {min: -20, max: 80}, {start: 5, end: 55}],
		['temporal', {min: 0, max: 60}, {start: 12, end: 42}],
	]) {
		const nodes = await capture(`${name}-${width}`, scaleSheet(width, domain, interval), 'wireframe');
		const get = (id) => nodes.find((x) => x.id === id);
		assert(Math.abs(get('range').left - get('marker').center) <= 0.5, 'Range and marker alignment within 0.5px');
		assert(Math.abs(get('range').left - get('start-label').center) <= 0.5, 'Start label alignment');
		assert(Math.abs(get('range').right - get('end-label').center) <= 0.5, 'End label alignment');
	}
}
const misaligned = await capture(
	'old-coordinate-defect',
	scaleSheet(),
	'wireframe',
	'[data-ui-node="marker"]{left:30%!important}',
);
assert(
	Math.abs(misaligned.find((x) => x.id === 'range').left - misaligned.find((x) => x.id === 'marker').center) > 0.5,
);
console.log(
	JSON.stringify({
		passed: true,
		captures: results.length,
		totalMs: results.reduce((n, x) => n + x.elapsedMs, 0),
		output,
	}),
);
