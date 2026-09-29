import fs from 'node:fs';
import {createServer} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {createHash} from 'node:crypto';

const maximumBytes = 16 * 1024 * 1024;
const upstream = new URL('https://chatgpt.com/backend-api/codex/responses');
const safeName = (value) => (typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,160}$/.test(value) ? value : null);
const flag = (object, key) => (typeof object?.[key] === 'boolean' ? object[key] : 'omitted');
const tools = (values) =>
	Array.isArray(values)
		? values.map((value) => ({
				type: safeName(value.type),
				name: safeName(value.name),
				...(Array.isArray(value.tools) ? {tools: tools(value.tools)} : {}),
			}))
		: [];

/** Project request/response metadata only; never retain prompts, arguments, results or credentials. */
export function projectMessage(body, direction) {
	if (direction === 'request') {
		return {
			type: safeName(body.type),
			model: safeName(body.model),
			generate: flag(body, 'generate'),
			parallelToolCalls: flag(body, 'parallel_tool_calls'),
			toolChoice: safeName(body.tool_choice),
			reasoningEffort: safeName(body.reasoning?.effort),
			previousResponseId: safeName(body.previous_response_id),
			tools: tools(body.tools),
		};
	}
	if (['response.created', 'response.completed', 'response.failed', 'response.incomplete'].includes(body.type)) {
		return {
			type: body.type,
			responseId: safeName(body.response?.id),
			model: safeName(body.response?.model),
			status: safeName(body.response?.status),
			parallelToolCalls: flag(body.response, 'parallel_tool_calls'),
			errorCode: safeName(body.response?.error?.code),
			output: Array.isArray(body.response?.output)
				? body.response.output.map((item) => ({
						type: safeName(item.type),
						id: safeName(item.id),
						callId: safeName(item.call_id),
						name: safeName(item.name),
						namespace: safeName(item.namespace),
					}))
				: [],
		};
	}
	if (body.type === 'response.output_item.done') {
		return {
			type: body.type,
			responseId: safeName(body.response_id),
			itemType: safeName(body.item?.type),
			itemId: safeName(body.item?.id),
			callId: safeName(body.item?.call_id),
			name: safeName(body.item?.name),
			namespace: safeName(body.item?.namespace),
		};
	}
	if (body.type === 'error') return {type: 'error', code: safeName(body.error?.code)};
	return null;
}

/** Observe text messages in a raw, uncompressed WebSocket stream without altering forwarded bytes. */
export function frameObserver(masked, onMessage) {
	let pending = Buffer.alloc(0);
	let fragments = [];
	let messageBytes = 0;
	return (chunk) => {
		pending = Buffer.concat([pending, chunk]);
		if (pending.length > maximumBytes + 14) throw new Error('Oversized frame');
		while (pending.length >= 2) {
			if (Boolean(pending[1] & 128) !== masked || (pending[0] & 112) !== 0)
				throw new Error('Unexpected WebSocket encoding');
			let length = pending[1] & 127;
			let offset = 2;
			if (length === 126) {
				if (pending.length < 4) return;
				length = pending.readUInt16BE(2);
				offset = 4;
			} else if (length === 127) {
				if (pending.length < 10) return;
				const wide = pending.readBigUInt64BE(2);
				if (wide > BigInt(maximumBytes)) throw new Error('Oversized frame');
				length = Number(wide);
				offset = 10;
			}
			if (length > maximumBytes) throw new Error('Oversized frame');
			if (pending.length < offset + (masked ? 4 : 0) + length) return;
			const opcode = pending[0] & 15;
			const final = Boolean(pending[0] & 128);
			const mask = masked ? pending.subarray(offset, offset + 4) : null;
			offset += masked ? 4 : 0;
			const payload = Buffer.from(pending.subarray(offset, offset + length));
			pending = pending.subarray(offset + length);
			if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
			if ([8, 9, 10].includes(opcode)) continue;
			if (![0, 1].includes(opcode) || (opcode === 0) !== fragments.length > 0)
				throw new Error('Unexpected message fragment');
			fragments.push(payload);
			messageBytes += payload.length;
			if (messageBytes > maximumBytes) throw new Error('Oversized message');
			if (final) {
				onMessage(Buffer.concat(fragments));
				fragments = [];
				messageBytes = 0;
			}
		}
	};
}

/** Diagnostic only: fixed official upstream, loopback listener, normal TLS validation, no body logging. */
export async function startLiveRequestObserver(destination) {
	if (fs.existsSync(destination)) throw new Error('Preserve existing live request evidence');
	const started = performance.now();
	const metadata = {
		startedAt: new Date().toISOString(),
		upstream: upstream.href,
		requestBodiesModified: false,
		credentialsPersisted: false,
		requests: [],
		responses: [],
		connections: [],
		errors: [],
		observationMs: 0,
	};
	const sockets = new Set();
	const requests = new Set();
	const save = () => fs.writeFileSync(destination, JSON.stringify(metadata, null, 2) + '\n');
	const fail = (phase, error) => {
		metadata.errors.push({phase, code: safeName(error?.code), name: safeName(error?.name)});
		save();
	};
	const server = createServer((request, response) => {
		metadata.errors.push({phase: 'non-websocket-request', method: safeName(request.method)});
		save();
		response.writeHead(400, {'content-type': 'application/json'});
		response.end('{"error":{"message":"Live observer requires WebSocket transport"}}');
	});
	server.on('connection', (socket) => {
		sockets.add(socket);
		socket.on('error', () => {});
		socket.on('close', () => sockets.delete(socket));
	});
	server.on('upgrade', (request, client, clientHead) => {
		if (
			request.url !== '/responses' ||
			request.headers.origin ||
			request.headers.host !== `127.0.0.1:${server.address().port}`
		) {
			client.end('HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
			return;
		}
		const connection = metadata.connections.length;
		metadata.connections.push({connection, startedAt: new Date().toISOString()});
		const headers = {...request.headers, host: upstream.host};
		delete headers['sec-websocket-extensions'];
		const outgoing = httpsRequest(upstream, {method: 'GET', headers});
		requests.add(outgoing);
		outgoing.once('close', () => requests.delete(outgoing));
		outgoing.setTimeout(120000, () => outgoing.destroy(new Error('Upstream timeout')));
		outgoing.on('error', (error) => {
			fail('upstream-connect', error);
			client.destroy();
		});
		outgoing.on('response', (response) => {
			metadata.connections[connection].httpStatus = response.statusCode;
			save();
			response.resume();
			client.end(
				`HTTP/1.1 ${response.statusCode} Upstream Response\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`,
			);
		});
		outgoing.on('upgrade', (response, remote, remoteHead) => {
			sockets.add(remote);
			remote.on('close', () => {
				sockets.delete(remote);
				client.destroy();
			});
			client.on('close', () => remote.destroy());
			remote.on('error', (error) => {
				fail('upstream-stream', error);
				client.destroy();
			});
			metadata.connections[connection].httpStatus = response.statusCode;
			save();
			if (response.headers['sec-websocket-extensions']) {
				fail('unexpected-compression');
				remote.destroy();
				return;
			}
			let responseId = null;
			const observe = (direction) =>
				frameObserver(direction === 'request', (payload) => {
					const before = performance.now();
					const body = JSON.parse(payload.toString('utf8'));
					const value = projectMessage(body, direction);
					if (value) {
						if (direction === 'response') {
							responseId = value.responseId ?? responseId;
							value.responseId ??= responseId;
						}
						metadata[direction === 'request' ? 'requests' : 'responses'].push({
							at: new Date().toISOString(),
							elapsedMs: performance.now() - started,
							connection,
							messageBytes: payload.length,
							...(direction === 'request'
								? {sha256: createHash('sha256').update(payload).digest('hex')}
								: {}),
							...value,
						});
						save();
					}
					metadata.observationMs += performance.now() - before;
				});
			const inspect = (direction) => {
				const observer = observe(direction);
				return (chunk) => {
					try {
						observer(chunk);
					} catch (error) {
						fail(`decode-${direction}`, error);
						client.destroy();
						remote.destroy();
					}
				};
			};
			const inspectClient = inspect('request');
			const inspectRemote = inspect('response');
			client.on('data', inspectClient);
			remote.on('data', inspectRemote);
			client.write(
				`HTTP/1.1 101 Switching Protocols\r\n${response.rawHeaders.reduce((all, value, i, values) => (i % 2 ? all : all + `${value}: ${values[i + 1]}\r\n`), '')}\r\n`,
			);
			if (clientHead.length) {
				inspectClient(clientHead);
				remote.write(clientHead);
			}
			if (remoteHead.length) {
				inspectRemote(remoteHead);
				client.write(remoteHead);
			}
			client.pipe(remote);
			remote.pipe(client);
		});
		outgoing.end();
	});
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	save();
	return {
		url: `http://127.0.0.1:${server.address().port}`,
		async close() {
			for (const request of requests) request.destroy();
			for (const socket of sockets) socket.destroy();
			await new Promise((resolve) => server.close(resolve));
			metadata.resourcesClosed = true;
			metadata.completedAt = new Date().toISOString();
			save();
		},
	};
}
