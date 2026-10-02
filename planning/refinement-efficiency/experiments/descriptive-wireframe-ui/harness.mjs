import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {renderPreview} from '../../../../skills/refine-design/scripts/wireframe-preview.mjs';
import {
	geometryInspectionHtml,
	readGeometryInspection,
} from '../../../../skills/refine-design/scripts/wireframe-inspection.mjs';
import {capturePages, capturePageHtml} from '../wireframe-ui-pilot/capture-pages.mjs';

const themeFields = [
	'primary',
	'onPrimary',
	'surface',
	'background',
	'text',
	'muted',
	'border',
	'accent',
	'danger',
	'disabledBackground',
	'disabledForeground',
	'fieldBorder',
	'fieldLabel',
	'radius',
	'fieldRadius',
	'fontSize',
];
const defaultBrowser = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

function required(value, label) {
	if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
	return value;
}

function digest(value) {
	return createHash('sha256').update(value).digest('hex');
}

async function writeJson(target, value) {
	await fs.mkdir(path.dirname(target), {recursive: true});
	await fs.writeFile(target, JSON.stringify(value, null, 2) + '\n');
}

async function readJson(target) {
	return JSON.parse(await fs.readFile(target, 'utf8'));
}

async function event(context, fields) {
	const entry = {
		...fields,
		run: required(context.run, 'run'),
		stage: required(context.stage, 'stage'),
		timestamp: new Date().toISOString(),
	};
	const target = path.resolve(required(context.events, 'events'));
	await fs.mkdir(path.dirname(target), {recursive: true});
	await fs.appendFile(target, JSON.stringify(entry) + '\n');
	return entry;
}

async function measured(context, tool, operation) {
	const began = performance.now();
	await event(context, {type: 'tool', tool, phase: 'start'});
	try {
		const result = await operation();
		await event(context, {type: 'tool', tool, phase: 'end', durationMs: performance.now() - began, result});
		return result;
	} catch (error) {
		await event(context, {
			type: 'tool',
			tool,
			phase: 'error',
			durationMs: performance.now() - began,
			error: error.message,
		});
		throw error;
	}
}

function validateTheme(document, mode, references) {
	if (mode !== 'ui') return;
	for (const envelope of [document, ...Object.values(references ?? {})]) {
		const missing = themeFields.filter((field) => !Object.hasOwn(envelope.ui?.theme ?? {}, field));
		if (missing.length)
			throw new Error(`${envelope.elementId}: complete ui.theme required; missing ${missing.join(', ')}`);
	}
}

async function browserCapture(executable, source, screenshot, profile, width, height) {
	await fs.access(executable);
	const args = [
		'--headless=new',
		'--disable-gpu',
		'--no-first-run',
		'--disable-extensions',
		'--dump-dom',
		'--virtual-time-budget=500',
		'--user-data-dir=' + profile,
		'--screenshot=' + screenshot,
		'--window-size=' + width + ',' + height,
		pathToFileURL(source).href,
	];
	return new Promise((resolve, reject) => {
		const child = spawn(executable, args, {stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true});
		let dom = '',
			stderr = '',
			failure = null;
		const timer = setTimeout(() => {
			failure = new Error('Browser capture timed out after 30000ms');
			child.kill();
		}, 30000);
		child.stdout.on('data', (chunk) => {
			dom += chunk;
			if (dom.length > 32 * 1024 * 1024) {
				failure = new Error('Browser DOM exceeded 32MiB');
				child.kill();
			}
		});
		child.stderr.on('data', (chunk) => {
			stderr = (stderr + chunk).slice(-4096);
		});
		child.on('error', (error) => {
			clearTimeout(timer);
			reject(error);
		});
		child.on('close', (code) => {
			clearTimeout(timer);
			if (failure) reject(failure);
			else if (code !== 0) reject(new Error(`Browser exited ${code}: ${stderr}`));
			else resolve(dom);
		});
	});
}

/** Isolated experiment evidence and rendering; no model runner or production writes. */
export const ExperimentHarness = {
	/** Save an actual-time phase marker. Details stay nested and cannot replace identity/timing.
	 * @param {object} context - events path, run ID and stage.
	 * @param {string} phase - Phase label chosen by the measured workflow.
	 * @param {object} [details] - Observable decisions, settings or artifact references.
	 * @returns {Promise<object>} Saved event.
	 */
	async mark(context, phase, details = {}) {
		if (!details || typeof details !== 'object' || Array.isArray(details))
			throw new Error('details must be an object');
		return event(context, {type: 'marker', phase: required(phase, 'phase'), details});
	},

	/** Render all authored selected scenes through the same renderer for both paths.
	 * @param {object} options - context plus mode, input, outputDir and optional packet/references files.
	 * @returns {Promise<object>} Preview paths, hashes, sizes, scene/action references and validation.
	 */
	async render(options) {
		return measured(options, 'render', async () => {
			const mode = required(options.mode, 'mode');
			if (!['ui', 'wireframe'].includes(mode)) throw new Error('mode must be ui or wireframe');
			const input = path.resolve(required(options.input, 'input'));
			const outputDir = path.resolve(required(options.outputDir, 'outputDir'));
			const source = await fs.readFile(input);
			const document = JSON.parse(source.toString('utf8'));
			if (!Array.isArray(document.sourceActionRefs)) throw new Error('Explicit sourceActionRefs array required');
			const references = options.references ? await readJson(options.references) : undefined;
			const packet = options.packet ? await readJson(options.packet) : undefined;
			validateTheme(document, mode, references);
			const rendered = renderPreview(document, {mode, references, packet});
			// Replace only the library's experiment-page notice, outside every app canvas.
			const html = rendered.html.replace(
				/<p class="pilot-notice">[^<]*<\/p>/,
				'<p class="pilot-notice">Experimental provisional preview · review evidence accompanies this artifact</p>',
			);
			await fs.mkdir(outputDir, {recursive: true});
			const previewPath = path.join(outputDir, 'preview.html');
			await fs.writeFile(previewPath, html);
			const manifest = {
				mode,
				input,
				outputDir,
				previewPath,
				elementId: document.elementId,
				revision: document.revision,
				inputSha256: digest(source),
				inputBytes: source.length,
				htmlSha256: digest(html),
				htmlBytes: Buffer.byteLength(html),
				sceneIds: rendered.sceneIds,
				scenes: document.scenes.map(({id, viewport}) => ({id, viewport})),
				sourceFlowRefs: document.sourceFlowRefs,
				sourceActionRefs: document.sourceActionRefs,
				coverage: rendered.coverage,
				validation: rendered.validation,
			};
			await writeJson(path.join(outputDir, 'render.json'), manifest);
			return manifest;
		});
	},

	/** Capture every selected scene in bounded contact sheets and retain geometry diagnostics.
	 * @param {object} options - context, outputDir, optional installed browser executable.
	 * @returns {Promise<object>} All screenshot/diagnostic paths and hashes.
	 */
	async capture(options) {
		const outputDir = path.resolve(required(options.outputDir, 'outputDir'));
		return measured(options, 'capture', async () => {
			const manifest = await readJson(path.join(outputDir, 'render.json'));
			const html = await fs.readFile(manifest.previewPath, 'utf8');
			if (digest(html) !== manifest.htmlSha256)
				throw new Error('Rendered HTML changed; render a new revision before capture');
			const pages = [];
			for (const page of capturePages(manifest.scenes)) {
				const result = await measured(options, 'browser', async () => {
					const stem = 'preview' + page.suffix;
					const source = path.join(outputDir, stem + '-inspection.html');
					const screenshot = path.join(outputDir, stem + '.png');
					await fs.writeFile(source, geometryInspectionHtml(capturePageHtml(html, page)));
					const profile = await fs.mkdtemp(path.join(outputDir, 'browser-'));
					const width = Math.max(900, ...manifest.scenes.map((scene) => scene.viewport.width + 100));
					const dom = await browserCapture(
						options.browser ?? defaultBrowser,
						source,
						screenshot,
						profile,
						width,
						page.height,
					);
					const diagnostics = readGeometryInspection(dom);
					const diagnosticPath = path.join(outputDir, stem + '-geometry.json');
					await writeJson(diagnosticPath, diagnostics);
					if (diagnostics.unavailable) throw new Error(diagnostics.reason);
					const png = await fs.readFile(screenshot);
					if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
						throw new Error('Browser produced no valid PNG');
					return {
						path: screenshot,
						sceneIds: page.sceneIds,
						width,
						height: page.height,
						bytes: png.length,
						sha256: digest(png),
						diagnosticPath,
						diagnostics,
					};
				});
				pages.push(result);
				await writeJson(path.join(outputDir, 'captures.json'), {complete: false, pages});
			}
			const result = {complete: true, sceneIds: manifest.sceneIds, pages};
			await writeJson(path.join(outputDir, 'captures.json'), result);
			return result;
		});
	},

	/** Summarize observed stage windows without adding overlapping or nested totals.
	 * @param {object[]} entries - Parsed central JSONL events in append order.
	 * @returns {object} Observed windows, tools and raw unpaired markers.
	 */
	summarize(entries) {
		const windows = [],
			pending = new Map(),
			markers = [],
			tools = [];
		for (const entry of entries) {
			if (!Number.isFinite(Date.parse(entry.timestamp))) throw new Error('Invalid event timestamp');
			if (entry.type === 'tool' && ['end', 'error'].includes(entry.phase)) tools.push(entry);
			if (entry.type !== 'marker') continue;
			markers.push(entry);
			const pair = ['dispatch', 'observed-completion'].includes(entry.phase) ? 'dispatch' : 'start';
			const key = JSON.stringify([entry.run, entry.stage, pair, entry.details?.actor, entry.details?.round]);
			if (['start', 'dispatch'].includes(entry.phase)) {
				const stack = pending.get(key) ?? [];
				stack.push(entry);
				pending.set(key, stack);
			} else if (['end', 'observed-completion'].includes(entry.phase)) {
				const began = pending.get(key)?.pop();
				if (!began) continue;
				const durationMs = Date.parse(entry.timestamp) - Date.parse(began.timestamp);
				if (durationMs < 0) throw new Error('Stage end precedes start');
				windows.push({
					id: windows.length,
					run: entry.run,
					stage: entry.stage,
					pair,
					details: began.details,
					start: began.timestamp,
					end: entry.timestamp,
					durationMs,
				});
			}
		}
		for (const window of windows)
			window.overlaps = windows
				.filter(
					(other) =>
						other.id !== window.id &&
						other.run === window.run &&
						Date.parse(other.start) < Date.parse(window.end) &&
						Date.parse(window.start) < Date.parse(other.end),
				)
				.map((other) => other.id);
		return {
			stageWindows: windows,
			toolCalls: tools,
			markers,
			unclosedStarts: [...pending.values()].flat(),
			limitation:
				'Observed UTC stage windows may overlap. Do not sum them or treat elapsed time as reasoning time.',
		};
	},

	/** Agent-callable deterministic CLI; errors remain in the central evidence file.
	 * @param {string[]} args - CLI arguments after executable and script.
	 * @returns {Promise<object>} Command result printed as JSON by the entry point.
	 */
	async cli(args) {
		const {values, positionals} = parseArgs({
			args,
			allowPositionals: true,
			options: {
				mode: {type: 'string'},
				input: {type: 'string'},
				'output-dir': {type: 'string'},
				events: {type: 'string'},
				run: {type: 'string'},
				stage: {type: 'string'},
				phase: {type: 'string'},
				details: {type: 'string'},
				references: {type: 'string'},
				packet: {type: 'string'},
				browser: {type: 'string'},
				capture: {type: 'boolean'},
			},
		});
		const command = positionals[0] ?? 'render';
		if (positionals.length > 1) throw new Error('Only one command is supported');
		const options = {
			...values,
			outputDir: values['output-dir'],
			events:
				values.events ?? (values['output-dir'] ? path.join(values['output-dir'], 'events.jsonl') : undefined),
		};
		if (command === 'mark')
			return this.mark(options, values.phase, values.details ? JSON.parse(values.details) : {});
		if (command === 'capture') return this.capture(options);
		if (command === 'summarize') {
			const entries = (await fs.readFile(required(options.events, 'events'), 'utf8'))
				.split('\n')
				.filter(Boolean)
				.map((line) => JSON.parse(line));
			const result = this.summarize(entries);
			await writeJson(path.join(required(options.outputDir, 'outputDir'), 'metrics.json'), result);
			return result;
		}
		if (command !== 'render') throw new Error('Command must be render, capture, mark, or summarize');
		const rendered = await this.render(options);
		return values.capture ? {rendered, captures: await this.capture(options)} : rendered;
	},
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		process.stdout.write(JSON.stringify(await ExperimentHarness.cli(process.argv.slice(2))) + '\n');
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
