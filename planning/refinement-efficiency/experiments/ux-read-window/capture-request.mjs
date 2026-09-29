import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {randomBytes, createHash} from 'node:crypto';
import {gzipSync, gunzipSync, inflateSync, brotliDecompressSync, zstdDecompressSync} from 'node:zlib';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {finished} from 'node:stream/promises';
import assert from 'node:assert/strict';
import {McpHttpServer} from '../../../../scripts/mcp/McpHttpServer.mjs';

const workspace = fileURLToPath(new URL('../../../../', import.meta.url));
const binary = 'C:/Users/gande/.vscode/extensions/openai.chatgpt-26.917.62051-win32-x64/bin/windows-x86_64/codex.exe';
const safeName = (value) => (typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,120}$/.test(value) ? value : null);
const own = (value, key) =>
	Object.hasOwn(value, key) ? (typeof value[key] === 'boolean' ? value[key] : 'unexpected-type') : 'omitted';

function summarizeTools(tools) {
	return Array.isArray(tools)
		? tools.map((tool) => ({
				type: safeName(tool.type),
				name: safeName(tool.name ?? tool.function?.name),
				...(Array.isArray(tool.tools) ? {tools: summarizeTools(tool.tools)} : {}),
				...(Array.isArray(tool.functions) ? {functions: summarizeTools(tool.functions)} : {}),
			}))
		: [];
}

function summarizeRequest(body) {
	return {
		keys: Object.keys(body).filter((key) => safeName(key)),
		requestType: safeName(body.type),
		generate: own(body, 'generate'),
		model: safeName(body.model),
		parallelToolCalls: own(body, 'parallel_tool_calls'),
		toolChoice:
			typeof body.tool_choice === 'string'
				? safeName(body.tool_choice)
				: body.tool_choice
					? {
							type: safeName(body.tool_choice.type),
							mode: safeName(body.tool_choice.mode),
							name: safeName(body.tool_choice.name),
						}
					: 'omitted',
		reasoningEffort: safeName(body.reasoning?.effort),
		tools: summarizeTools(body.tools),
		inputItems: Array.isArray(body.input) ? body.input.length : null,
	};
}

function decodeBody(raw, encoding) {
	if (!encoding || encoding === 'identity') return raw;
	if (encoding === 'gzip') return gunzipSync(raw);
	if (encoding === 'deflate') return inflateSync(raw);
	if (encoding === 'br') return brotliDecompressSync(raw);
	if (encoding === 'zstd') return zstdDecompressSync(raw);
	throw new Error('Unsupported request compression');
}

// Minimal, bounded WebSocket capture for this diagnostic, with no negotiated extensions.
function readFrame(buffer) {
	if (buffer.length < 2) return null;
	let length = buffer[1] & 127;
	let offset = 2;
	if (length === 126) {
		if (buffer.length < 4) return null;
		length = buffer.readUInt16BE(2);
		offset = 4;
	} else if (length === 127) {
		if (buffer.length < 10) return null;
		const wideLength = buffer.readBigUInt64BE(2);
		assert(wideLength <= 16n * 1024n * 1024n, 'Oversized WebSocket frame');
		length = Number(wideLength);
		offset = 10;
	}
	assert((buffer[1] & 128) !== 0 && (buffer[0] & 112) === 0, 'Expected a masked frame without extensions');
	if (buffer.length < offset + 4 + length) return null;
	const mask = buffer.subarray(offset, offset + 4);
	offset += 4;
	const payload = Buffer.from(buffer.subarray(offset, offset + length));
	for (let index = 0; index < payload.length; index++) payload[index] ^= mask[index % 4];
	return {opcode: buffer[0] & 15, final: Boolean(buffer[0] & 128), payload, consumed: offset + length};
}

function sendFrame(socket, payload, opcode = 1) {
	assert(payload.length < 65536);
	const header = Buffer.alloc(payload.length < 126 ? 2 : 4);
	header[0] = 128 | opcode;
	header[1] = payload.length < 126 ? payload.length : 126;
	if (header.length === 4) header.writeUInt16BE(payload.length, 2);
	socket.write(Buffer.concat([header, payload]));
}

function verifyCapture(metadata) {
	const generationRequests = metadata.requests.filter((request) => request.model && request.generate !== false);
	assert(generationRequests.length > 0, 'No generation request captured');
	assert(
		generationRequests.every((request) => request.model === 'gpt-6-astra' && request.reasoningEffort === 'xhigh'),
		'Unexpected generation model or effort',
	);
	assert.equal(metadata.forwardedRequests, 0);
	assert.equal(metadata.modelExecutions, 0);
	return {
		generationRequests: generationRequests.map(
			({method, model, reasoningEffort, parallelToolCalls, toolChoice}) => ({
				method,
				model,
				reasoningEffort,
				parallelToolCalls,
				toolChoice,
			}),
		),
		prewarmRequests: metadata.requests
			.filter((request) => request.model && request.generate === false)
			.map(({model, parallelToolCalls}) => ({model, parallelToolCalls})),
	};
}

const savedAttempt = process.argv.find((value) => value.startsWith('--verify-capture='))?.slice(17);
if (savedAttempt) {
	assert(/^[a-z0-9-]+$/.test(savedAttempt));
	const metadata = JSON.parse(
		fs.readFileSync(
			path.join(workspace, '.codex-tmp/ux-request-capture-20260928', savedAttempt, 'request-metadata.json'),
			'utf8',
		),
	);
	console.log(JSON.stringify(verifyCapture(metadata)));
} else if (process.argv.includes('--self-test')) {
	for (const parallel of [true, false, undefined]) {
		const body = {
			model: 'gpt-6-astra',
			...(parallel === undefined ? {} : {parallel_tool_calls: parallel}),
			input: [{text: 'PRIVATE_SENTINEL'}],
			tools: [
				{
					type: 'namespace',
					name: 'mcp__polylith_workflows',
					description: 'PRIVATE_SENTINEL',
					tools: [{type: 'function', name: 'workflow_read', parameters: {secret: 'PRIVATE_SENTINEL'}}],
				},
			],
		};
		const summary = summarizeRequest(JSON.parse(decodeBody(gzipSync(JSON.stringify(body)), 'gzip')));
		assert.equal(summary.parallelToolCalls, parallel ?? 'omitted');
		assert.equal(summary.tools[0].tools[0].name, 'workflow_read');
		assert(!JSON.stringify(summary).includes('PRIVATE_SENTINEL'));
	}
	const frame = Buffer.from([129, 130, 1, 2, 3, 4, 122, 127]);
	assert.equal(readFrame(frame).payload.toString(), '{}');
	assert.equal(readFrame(frame.subarray(0, 7)), null);
	assert.equal(
		verifyCapture({
			forwardedRequests: 0,
			modelExecutions: 0,
			requests: [
				{model: 'codex-auto-review', generate: false},
				{model: 'gpt-6-astra', reasoningEffort: 'xhigh', parallelToolCalls: false},
			],
		}).generationRequests.length,
		1,
	);
	console.log('Request metadata projection and compressed-body checks passed');
} else {
	const attemptName = process.argv.find((value) => value.startsWith('--attempt='))?.slice(10);
	if (!attemptName || !/^[a-z0-9-]+$/.test(attemptName)) throw new Error('Supply a fresh --attempt=name');
	const output = path.join(workspace, '.codex-tmp/ux-request-capture-20260928', attemptName);
	const websocket = process.argv.includes('--websocket');
	const saveContext = process.argv.includes('--save-context');
	const captureContext = (body) => {
		if (!saveContext || body.generate === false || body.model !== 'gpt-6-astra') return;
		fs.writeFileSync(
			path.join(output, 'context.private.json'),
			JSON.stringify(
				{
					instructions: body.instructions,
					tools: body.tools,
					input: body.input,
					text: body.text,
					include: body.include,
					stream_options: body.stream_options,
					client_metadata: body.client_metadata,
				},
				null,
				2,
			),
		);
	};
	const catalogArgument = process.argv.find((value) => value.startsWith('--model-catalog='))?.slice(16);
	const catalogPath = catalogArgument ? path.resolve(workspace, catalogArgument) : null;
	if (fs.existsSync(output)) throw new Error('Preserve the existing capture');
	fs.mkdirSync(output, {recursive: true});
	const token = randomBytes(32).toString('hex');
	const catalog = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.codex/models_cache.json'), 'utf8'));
	const requests = [];
	const started = performance.now();
	const metadata = {
		startedAt: new Date().toISOString(),
		binary,
		binarySha256: createHash('sha256').update(fs.readFileSync(binary)).digest('hex'),
		websocketCapture: websocket,
		modelCatalogOverride: catalogPath
			? {path: catalogPath, sha256: createHash('sha256').update(fs.readFileSync(catalogPath)).digest('hex')}
			: null,
		modelOverride: null,
		reasoningOverride: null,
		configurationOverrides: [
			'openai_base_url=loopback capture endpoint',
			'features.code_mode.enabled=true',
			'features.code_mode.direct_only_tool_namespaces=[mcp__polylith_workflows]',
			'mcp_servers.polylith_workflows=loopback metadata-only server',
			...(catalogPath ? ['model_catalog_json=temporary diagnostic catalog'] : []),
		],
		modelExecutions: 0,
		forwardedRequests: 0,
		requests,
	};
	// Advertise the production MCP contracts; no tool execution is needed or implemented.
	const mcp = new McpHttpServer({readLimits: {pageBytes: 28000}}, token);
	metadata.advertisedMcpTools = mcp.toolContracts.map(({name, annotations}) => ({name, annotations}));
	let child;
	let timer;
	const sockets = new Set();
	const capture = createServer(async (request, response) => {
		try {
			const url = new URL(request.url, 'http://127.0.0.1');
			if (request.method === 'GET' && url.pathname.endsWith('/models')) {
				requests.push({method: 'GET', path: url.pathname, kind: 'cached-model-catalog'});
				response.writeHead(200, {'content-type': 'application/json'});
				response.end(JSON.stringify({models: catalog.models}));
				return;
			}
			const chunks = [];
			let bytes = 0;
			for await (const chunk of request) {
				bytes += chunk.length;
				if (bytes > 16 * 1024 * 1024) throw new Error('Request too large');
				chunks.push(chunk);
			}
			const encoding = request.headers['content-encoding'] ?? 'identity';
			const decoded = decodeBody(Buffer.concat(chunks), encoding);
			const body = JSON.parse(decoded.toString('utf8'));
			captureContext(body);
			requests.push({
				at: new Date().toISOString(),
				elapsedMs: performance.now() - started,
				method: request.method,
				path: url.pathname,
				encoding,
				wireBytes: bytes,
				decodedBytes: decoded.length,
				...summarizeRequest(body),
			});
			fs.writeFileSync(path.join(output, 'request-metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
			response.writeHead(400, {'content-type': 'application/json'});
			response.end(
				JSON.stringify({
					error: {
						type: 'invalid_request_error',
						code: 'local_capture_complete',
						message: 'Local diagnostic captured request metadata; no model execution.',
					},
				}),
			);
		} catch (error) {
			requests.push({kind: 'capture-error', name: error.name});
			response.writeHead(400, {'content-type': 'application/json'});
			response.end('{"error":{"message":"Local diagnostic capture could not decode request"}}');
		}
	});
	capture.on('connection', (socket) => {
		sockets.add(socket);
		socket.on('close', () => sockets.delete(socket));
	});
	capture.on('upgrade', (request, socket, head) => {
		const requestPath = new URL(request.url, 'http://127.0.0.1').pathname;
		if (!websocket) {
			requests.push({kind: 'websocket-upgrade-rejected', path: requestPath});
			socket.end('HTTP/1.1 426 Upgrade Required\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
			return;
		}
		const accept = createHash('sha1')
			.update(request.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
			.digest('base64');
		socket.write(
			`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
		);
		let pending = Buffer.alloc(0);
		let fragments = [];
		let messageBytes = 0;
		let captured = false;
		const consume = (chunk) => {
			if (captured) return;
			try {
				pending = Buffer.concat([pending, chunk]);
				assert(pending.length <= 16 * 1024 * 1024 + 14);
				let frame;
				while ((frame = readFrame(pending))) {
					pending = pending.subarray(frame.consumed);
					if (frame.opcode === 8) return socket.end();
					if (frame.opcode === 9) {
						sendFrame(socket, frame.payload, 10);
						continue;
					}
					assert([0, 1].includes(frame.opcode));
					fragments.push(frame.payload);
					messageBytes += frame.payload.length;
					assert(messageBytes <= 16 * 1024 * 1024);
					if (!frame.final) continue;
					const body = JSON.parse(Buffer.concat(fragments).toString('utf8'));
					captureContext(body);
					requests.push({
						at: new Date().toISOString(),
						elapsedMs: performance.now() - started,
						method: 'WEBSOCKET',
						path: requestPath,
						decodedBytes: messageBytes,
						...summarizeRequest(body),
					});
					fs.writeFileSync(
						path.join(output, 'request-metadata.json'),
						JSON.stringify(metadata, null, 2) + '\n',
					);
					captured = true;
					fragments = [];
					pending = Buffer.alloc(0);
					sendFrame(
						socket,
						Buffer.from(
							JSON.stringify({
								type: 'error',
								status: 400,
								error: {
									type: 'invalid_request_error',
									code: 'local_capture_complete',
									message: 'Local diagnostic captured request metadata; no model execution.',
								},
							}),
						),
					);
					sendFrame(socket, Buffer.from([3, 232]), 8);
					socket.end();
					return;
				}
			} catch (error) {
				requests.push({kind: 'websocket-capture-error', name: error.name});
				socket.destroy();
			}
		};
		socket.on('error', () => {});
		socket.on('data', consume);
		if (head.length) consume(head);
	});
	try {
		await new Promise((resolve, reject) => {
			capture.once('error', reject);
			capture.listen(0, '127.0.0.1', resolve);
		});
		const baseUrl = `http://127.0.0.1:${capture.address().port}`;
		const mcpUrl = await mcp.listen(0);
		const args = [
			'exec',
			'--json',
			'-C',
			workspace,
			'--approve-for-me',
			'-c',
			`openai_base_url=${JSON.stringify(baseUrl)}`,
			'-c',
			'features.code_mode.enabled=true',
			'-c',
			'features.code_mode.direct_only_tool_namespaces=["mcp__polylith_workflows"]',
			'-c',
			`mcp_servers.polylith_workflows.url=${JSON.stringify(mcpUrl)}`,
			'-c',
			'mcp_servers.polylith_workflows.bearer_token_env_var="POLYLITH_MCP_TOKEN"',
			'-c',
			'mcp_servers.polylith_workflows.required=true',
			'-',
		];
		if (catalogPath) args.splice(1, 0, '-c', `model_catalog_json=${JSON.stringify(catalogPath)}`);
		child = spawn(binary, args, {
			env: {...process.env, POLYLITH_MCP_TOKEN: token, RUST_LOG: 'warn'},
			windowsHide: true,
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		const stdout = fs.createWriteStream(path.join(output, 'client-events.private.jsonl'));
		const stderr = fs.createWriteStream(path.join(output, 'client-stderr.private.log'));
		child.stdout.pipe(stdout);
		child.stderr.pipe(stderr);
		child.stdin.end(
			'Prepare two independent workflow_read calls together in one response, for handles capture:facts and capture:ux, access capture-only, offset 0 and maxBytes 28000. Do not inspect files, spawn agents, or change anything. This local request-construction diagnostic stops before model execution.',
		);
		timer = setTimeout(() => {
			metadata.timedOut = true;
			child.kill();
		}, 30000);
		const [code, signal] = await once(child, 'exit');
		await Promise.all([finished(stdout), finished(stderr)]);
		Object.assign(metadata, {
			exitCode: code,
			exitSignal: signal,
			elapsedMs: performance.now() - started,
			completedAt: new Date().toISOString(),
		});
		metadata.validation = verifyCapture(metadata);
		console.log(JSON.stringify({output, ...metadata}));
	} finally {
		clearTimeout(timer);
		if (child && child.exitCode === null) child.kill();
		for (const socket of sockets) socket.destroy();
		await Promise.all([new Promise((resolve) => capture.close(resolve)), mcp.close()]);
		metadata.resourcesClosed = true;
		fs.writeFileSync(path.join(output, 'request-metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
	}
}
