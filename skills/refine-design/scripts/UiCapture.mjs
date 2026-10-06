import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {pathToFileURL, fileURLToPath} from 'node:url';
import readline from 'node:readline';
import puppeteer from 'puppeteer-core';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const elapsed = (start) => Math.round((performance.now() - start) * 1000) / 1000;

/** Bound one asynchronous operation, clearing the timer on every completion.
 * @template T
 * @param {Promise<T>} operation - Operation whose late rejection remains handled.
 * @param {number} milliseconds - Positive deadline.
 * @param {string} message - Failure to report on expiry.
 * @returns {Promise<T>} - Operation result before the deadline.
 */
async function bounded(operation, milliseconds, message) {
	let timer;
	try {
		return await Promise.race([
			operation,
			new Promise((_, reject) => {
				timer = setTimeout(() => reject(new Error(message)), milliseconds);
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}

/** Resolve a confined path without traversing symbolic links or junctions.
 * @param {string} root - Absolute, existing authority root.
 * @param {string} relative - Portable relative path.
 * @param {boolean} [existing=true] - Require every path segment to exist.
 * @returns {string} - Validated absolute path.
 */
export function capturePath(root, relative, existing = true) {
	if (
		typeof relative !== 'string' ||
		!relative ||
		relative.includes('\\') ||
		relative
			.split('/')
			.some(
				(part) =>
					!/^[a-zA-Z0-9][a-zA-Z0-9._ -]*$/.test(part) ||
					/[. ]$/.test(part) ||
					/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part),
			)
	)
		throw new Error('Capture paths must be safe relative paths');
	let cursor = root;
	for (const part of relative.split('/')) {
		cursor = path.join(cursor, part);
		const stat = fs.lstatSync(cursor, {throwIfNoEntry: false});
		if (!stat && existing) throw new Error(`Capture input is missing: ${relative}`);
		if (stat?.isSymbolicLink()) throw new Error('Capture paths must not traverse links');
	}
	return cursor;
}

/** Resolve the explicit source/run authority, rejecting broad and linked roots.
 * @param {string} value - Absolute existing directory.
 * @returns {string} - Normalized directory.
 */
function authority(value) {
	if (typeof value !== 'string' || !path.isAbsolute(value)) throw new Error('Capture roots must be absolute');
	const root = path.resolve(value);
	if (root === path.parse(root).root) throw new Error('Capture roots must not be filesystem roots');
	for (let cursor = root; cursor !== path.dirname(cursor); cursor = path.dirname(cursor))
		if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error('Capture roots must not traverse links');
	if (!fs.statSync(root).isDirectory()) throw new Error('Capture roots must be directories');
	return root;
}

/** Own one installed Chromium browser and give each capture a fresh page.
 * Serial captures reuse startup; a failed deadline/crash retires the browser.
 * Profiles, logs and atomic output files stay beneath the caller's run root.
 */
export class UiCapture {
	/** Create a worker without starting a browser.
	 * @param {UiCaptureOptions} options - Explicit installed browser and confined roots.
	 */
	constructor(options) {
		this._sourceRoot = authority(options.sourceRoot);
		this._runRoot = authority(options.runRoot);
		if (!path.isAbsolute(options.executablePath) || !fs.statSync(options.executablePath).isFile())
			throw new Error('Capture requires an installed browser executable');
		this._executablePath = options.executablePath;
		this._timeoutMs = options.timeoutMs ?? 20000;
		this._cleanupMs = options.cleanupMs ?? 2000;
		for (const duration of [this._timeoutMs, this._cleanupMs])
			if (!Number.isSafeInteger(duration) || duration < 1 || duration > 120000)
				throw new Error('Capture deadlines must be positive and at most 120 seconds');
		this._name = randomUUID();
		this._generation = 0;
		this._browser = null;
		this._busy = false;
		this._closed = false;
		this._log = capturePath(this._runRoot, `capture-${this._name}.ndjson`, false);
	}

	/** Record lifecycle evidence in the run, without changing the captured sources.
	 * @param {object} event - JSON event.
	 * @returns {void}
	 */
	_event(event) {
		fs.appendFileSync(this._log, `${JSON.stringify({at: new Date().toISOString(), ...event})}\n`);
	}

	/** Start the owned browser or return its warm instance.
	 * @returns {Promise<import('puppeteer-core').Browser>} - Live owned browser.
	 */
	async _launch() {
		if (this._browser?.connected) return this._browser;
		if (this._browser) await this._stopBrowser();
		const profile = capturePath(this._runRoot, `profiles/${this._name}/${++this._generation}`, false);
		const temporary = capturePath(this._runRoot, `temporary/${this._name}`, false);
		fs.mkdirSync(temporary, {recursive: true});
		this._browser = await puppeteer.launch({
			executablePath: this._executablePath,
			headless: true,
			userDataDir: profile,
			defaultViewport: null,
			timeout: this._timeoutMs,
			args: [
				'--disable-gpu',
				'--hide-scrollbars',
				'--no-first-run',
				'--disable-extensions',
				'--allow-file-access-from-files',
				'--force-device-scale-factor=1',
			],
			env: {...process.env, TEMP: temporary, TMP: temporary},
		});
		this._event({
			kind: 'launch',
			generation: this._generation,
			pid: this._browser.process()?.pid,
			version: await bounded(this._browser.version(), this._cleanupMs, 'BROWSER_INFO_DEADLINE'),
		});
		return this._browser;
	}

	/** Close with bounded waiting and kill only the exact child owned by this worker.
	 * A failed exit observation closes the worker rather than claiming clean retirement.
	 * @returns {Promise<void>}
	 */
	async _stopBrowser() {
		const browser = this._browser;
		if (!browser) return;
		const child = browser.process();
		const exited = () => !child || child.exitCode !== null || child.signalCode !== null;
		let onExit;
		const exit = exited()
			? Promise.resolve()
			: new Promise((resolve) => {
					onExit = resolve;
					child.once('exit', onExit);
				});
		try {
			try {
				await bounded(browser.close(), this._cleanupMs, 'BROWSER_CLOSE_DEADLINE');
			} catch (error) {
				this._event({kind: 'close-error', error: error.message});
			}
			if (!exited()) {
				browser.disconnect();
				child.kill('SIGKILL');
			}
			await bounded(exit, this._cleanupMs, 'BROWSER_EXIT_UNOBSERVED');
			this._browser = null;
			this._event({kind: 'browser-exited', generation: this._generation, pid: child?.pid});
		} catch (error) {
			this._closed = true;
			throw error;
		} finally {
			if (onExit) child.removeListener('exit', onExit);
		}
	}

	/** Capture one immutable local HTML scene, waiting for fonts and decoded images.
	 * Inputs are rehashed before loading and before publishing; output is never overwritten.
	 * Failures return evidence without a successful image. Concurrent calls are rejected.
	 * @param {UiCaptureRequest} request - Expected bytes, viewport and PNG destination.
	 * @returns {Promise<UiCaptureResult>} - Source-bound capture evidence and elapsed times.
	 */
	async capture(request) {
		if (this._closed || this._busy) throw new Error('Capture worker is closed or busy');
		const fields = [
			'id',
			'sceneRef',
			'variant',
			'html',
			'htmlSha256',
			'assets',
			'requiredFonts',
			'width',
			'height',
			'output',
		];
		if (
			!request ||
			typeof request !== 'object' ||
			Array.isArray(request) ||
			Object.keys(request).length !== fields.length ||
			fields.some((field) => !Object.hasOwn(request, field)) ||
			typeof request.id !== 'string' ||
			!request.id ||
			typeof request.sceneRef !== 'string' ||
			!request.sceneRef ||
			!['clean', 'annotated'].includes(request.variant) ||
			!Array.isArray(request.assets) ||
			request.assets.some(
				(asset) =>
					!asset ||
					typeof asset !== 'object' ||
					Object.keys(asset).length !== 2 ||
					!Object.hasOwn(asset, 'path') ||
					!Object.hasOwn(asset, 'sha256'),
			) ||
			!Array.isArray(request.requiredFonts) ||
			request.requiredFonts.some((font) => typeof font !== 'string' || !/^[\w -]{1,100}$/.test(font))
		)
			throw new Error('Invalid capture request');
		this._busy = true;
		const start = performance.now();
		const result = {
			id: request.id,
			sceneRef: request.sceneRef,
			variant: request.variant,
			status: 'failed',
			startedAt: new Date().toISOString(),
			timings: {},
			failedResources: [],
		};
		let page,
			expired = false,
			temporaryOutput,
			operation;
		const check = () => {
			if (expired) throw new Error('CAPTURE_DEADLINE');
		};
		try {
			for (const size of [request.width, request.height])
				if (!Number.isSafeInteger(size) || size < 1 || size > 16384)
					throw new Error('Invalid capture viewport');
			const html = capturePath(this._sourceRoot, request.html);
			const output = capturePath(this._runRoot, request.output, false);
			if (!request.output.endsWith('.png')) throw new Error('Capture output must be PNG');
			const inputs = [{path: request.html, sha256: request.htmlSha256}, ...request.assets];
			const verify = () => {
				for (const input of inputs) {
					if (!/^[a-f0-9]{64}$/.test(input.sha256)) throw new Error('Invalid capture input digest');
					const file = capturePath(this._sourceRoot, input.path);
					if (!fs.statSync(file).isFile() || hash(fs.readFileSync(file)) !== input.sha256)
						throw new Error(`CAPTURE_INPUT_CHANGED: ${input.path}`);
				}
			};
			verify();
			if (fs.existsSync(output)) throw new Error('CAPTURE_OUTPUT_EXISTS');
			const allowed = new Set(
				inputs.map((input) => pathToFileURL(capturePath(this._sourceRoot, input.path)).href),
			);
			operation = (async () => {
				const launchStart = performance.now();
				const browser = await this._launch();
				check();
				result.timings.launchMs = elapsed(launchStart);
				result.browserGeneration = this._generation;
				result.browserPid = browser.process()?.pid;
				page = await browser.newPage();
				check();
				await page.setRequestInterception(true);
				check();
				page.on('request', (entry) => {
					const url = entry.url().split('#')[0];
					const permitted = allowed.has(url) || url.startsWith('data:');
					if (!permitted) result.failedResources.push({url, error: 'UNDECLARED_RESOURCE'});
					(permitted ? entry.continue() : entry.abort()).catch(() => {});
				});
				page.on('requestfailed', (entry) =>
					result.failedResources.push({url: entry.url(), error: entry.failure()?.errorText}),
				);
				await page.setViewport({width: request.width, height: request.height, deviceScaleFactor: 1});
				check();
				const loadStart = performance.now();
				await page.goto(`${pathToFileURL(html).href}#scene`, {waitUntil: 'load', timeout: this._timeoutMs});
				check();
				result.timings.pageLoadMs = elapsed(loadStart);
				const readyStart = performance.now();
				result.readiness = await page.evaluate(async (families) => {
					const fonts = [];
					for (const family of families) {
						const faces = await document.fonts.load(`400 20px "${family}"`);
						if (!faces.length || faces.some((face) => face.status !== 'loaded'))
							throw new Error(`FONT_NOT_LOADED: ${family}`);
						fonts.push(family);
					}
					await document.fonts.ready;
					if ([...document.fonts].some((face) => face.status === 'error'))
						throw new Error('FONT_LOAD_FAILED');
					for (const link of document.querySelectorAll('link[rel="stylesheet"]'))
						if (!link.sheet) throw new Error('STYLESHEET_NOT_LOADED');
					const images = [];
					for (const image of document.images) {
						await image.decode();
						if (!image.complete || !image.naturalWidth || !image.naturalHeight)
							throw new Error('IMAGE_NOT_LOADED');
						images.push({width: image.naturalWidth, height: image.naturalHeight});
					}
					return {fonts, images};
				}, request.requiredFonts);
				check();
				if (result.failedResources.length) throw new Error('CAPTURE_ASSET_LOAD_FAILED');
				await page.addStyleTag({
					content:
						'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
				});
				await page.evaluate(
					() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
				);
				check();
				result.timings.readinessMs = elapsed(readyStart);
				verify();
				check();
				fs.mkdirSync(path.dirname(output), {recursive: true});
				temporaryOutput = `${output}.${randomUUID()}.partial.png`;
				const screenshotStart = performance.now();
				await page.screenshot({path: temporaryOutput, type: 'png', fullPage: false});
				check();
				result.timings.screenshotMs = elapsed(screenshotStart);
				const bytes = fs.readFileSync(temporaryOutput);
				if (
					bytes.length < 45 ||
					!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
					bytes.readUInt32BE(16) !== request.width ||
					bytes.readUInt32BE(20) !== request.height
				)
					throw new Error('CAPTURE_INVALID_PNG');
				verify();
				check();
				// Exclusive creation prevents concurrent writers from replacing an approved image.
				fs.linkSync(temporaryOutput, output);
				fs.unlinkSync(temporaryOutput);
				temporaryOutput = undefined;
				Object.assign(result, {
					status: 'success',
					output: request.output,
					htmlSha256: request.htmlSha256,
					pngSha256: hash(bytes),
					width: request.width,
					height: request.height,
				});
			})();
			await bounded(operation, this._timeoutMs, 'CAPTURE_DEADLINE');
		} catch (error) {
			expired = true;
			result.error = error.message;
		} finally {
			const cleanupStart = performance.now();
			try {
				if (expired && this._browser) await this._stopBrowser();
				// Await a late launch within its own deadline before retiring its child.
				if (operation && expired)
					await bounded(
						operation.catch(() => {}),
						this._timeoutMs + this._cleanupMs,
						'CAPTURE_CANCEL_DEADLINE',
					).catch(() => {});
				if (expired || !this._browser?.connected) await this._stopBrowser();
				else if (page && !page.isClosed()) await bounded(page.close(), this._cleanupMs, 'PAGE_CLOSE_DEADLINE');
			} catch (error) {
				result.cleanupError = error.message;
				await this._stopBrowser().catch((failure) => {
					result.cleanupError = failure.message;
				});
			}
			if (temporaryOutput) fs.rmSync(temporaryOutput, {force: true});
			result.timings.cleanupMs = elapsed(cleanupStart);
			result.timings.totalMs = elapsed(start);
			result.finishedAt = new Date().toISOString();
			this._busy = false;
			this._event({kind: 'capture', ...result});
		}
		return result;
	}

	/** Retire the worker, observing owned-process exit within bounded cleanup.
	 * @returns {Promise<void>}
	 */
	async close() {
		if (this._busy) throw new Error('Cannot close a busy capture worker');
		if (this._closed && !this._browser) return;
		this._closed = true;
		await this._stopBrowser();
		this._event({kind: 'shutdown'});
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	let worker;
	try {
		const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
		worker = new UiCapture(config);
		for await (const line of readline.createInterface({input: process.stdin, crlfDelay: Infinity})) {
			try {
				const request = JSON.parse(line);
				if (request.command === 'shutdown') {
					await worker.close();
					process.stdout.write(`${JSON.stringify({id: request.id, status: 'shutdown'})}\n`);
					break;
				}
				process.stdout.write(`${JSON.stringify(await worker.capture(request))}\n`);
			} catch (error) {
				process.stdout.write(`${JSON.stringify({status: 'failed', error: error.message})}\n`);
			}
		}
	} catch (error) {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	} finally {
		if (worker)
			await worker.close().catch((error) => {
				process.stderr.write(`${error.message}\n`);
				process.exitCode = 1;
			});
	}
}
