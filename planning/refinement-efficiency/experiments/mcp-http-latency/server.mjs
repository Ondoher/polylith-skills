// Local experiment only: one stateless Streamable HTTP MCP endpoint, JSON responses.
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {createServer} from 'node:http';

const token = process.env.MCP_HTTP_PROBE_TOKEN;
if (!token) throw new Error('MCP_HTTP_PROBE_TOKEN is required');
const instance = randomUUID();
const samples = [];
const sizes = [128, 4096, 8192, 58388];
const payloads = new Map(sizes.map((size) => [size, 'x'.repeat(size)]));
const tool = {
	name: 'get_probe',
	description:
		'Return an exact-size synthetic ASCII payload from this resident localhost server. Read-only latency experiment.',
	inputSchema: {
		type: 'object',
		properties: {bytes: {type: 'integer', enum: sizes}, caller: {type: 'string', maxLength: 80}},
		required: ['bytes', 'caller'],
		additionalProperties: false,
	},
	annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false},
};
const server = createServer(async (request, response) => {
	const started = performance.now();
	const receivedAt = new Date().toISOString();
	const fail = (status) => {
		response.writeHead(status);
		response.end();
	};
	if (request.headers.host !== `127.0.0.1:${server.address().port}` || request.headers.origin) return fail(403);
	if (request.headers.authorization !== `Bearer ${token}`) return fail(401);
	if (request.url !== '/mcp') return fail(404);
	if (request.method !== 'POST') return fail(405);
	if (!request.headers['content-type']?.includes('application/json')) return fail(415);
	let message;
	try {
		let body = '';
		for await (const chunk of request) {
			body += chunk;
			if (Buffer.byteLength(body) > 16384) return fail(413);
		}
		message = JSON.parse(body);
		if (message.jsonrpc !== '2.0' || typeof message.method !== 'string') return fail(400);
		if (message.id === undefined) {
			response.writeHead(202);
			return response.end();
		}
		const protocol = request.headers['mcp-protocol-version'];
		if (protocol && protocol !== '2025-06-18') return fail(400);
		let result;
		if (message.method === 'initialize')
			result = {
				protocolVersion: '2025-06-18',
				capabilities: {tools: {}},
				serverInfo: {name: 'localhost-latency-probe', version: '0.1.0'},
			};
		else if (message.method === 'ping') result = {};
		else if (message.method === 'tools/list') result = {tools: [tool]};
		else if (message.method === 'resources/list') result = {resources: []};
		else if (message.method === 'resources/templates/list') result = {resourceTemplates: []};
		else if (message.method === 'prompts/list') result = {prompts: []};
		else if (message.method === 'tools/call') {
			const {name, arguments: args} = message.params ?? {};
			if (
				name !== tool.name ||
				!payloads.has(args?.bytes) ||
				typeof args?.caller !== 'string' ||
				args.caller.length > 80
			)
				throw new Error('Invalid probe arguments');
			result = {
				content: [{type: 'text', text: payloads.get(args.bytes)}],
				_meta: {instance, pid: process.pid, payloadBytes: args.bytes},
			};
		} else throw new Error('Unsupported method');
		const serialized = JSON.stringify({jsonrpc: '2.0', id: message.id, result});
		const handlingMs = performance.now() - started;
		samples.push({
			receivedAt,
			method: message.method,
			id: message.id,
			caller: message.params?.arguments?.caller,
			payloadBytes: message.params?.arguments?.bytes,
			responseBodyBytes: Buffer.byteLength(serialized),
			handlingMs,
			remotePort: request.socket.remotePort,
		});
		response.writeHead(200, {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(serialized),
			'Server-Timing': `handler;dur=${handlingMs}`,
			'X-Probe-Instance': instance,
		});
		response.end(serialized);
	} catch (error) {
		response.writeHead(400, {'Content-Type': 'application/json'});
		response.end(
			JSON.stringify({jsonrpc: '2.0', id: message?.id ?? null, error: {code: -32602, message: error.message}}),
		);
	}
});
server.listen(0, '127.0.0.1', () => {
	const ready = {event: 'ready', instance, pid: process.pid, url: `http://127.0.0.1:${server.address().port}/mcp`};
	if (process.send) process.send(ready);
	else console.log(JSON.stringify(ready));
});
const stop = () => {
	if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({instance, pid: process.pid, samples}, null, 2));
	server.closeAllConnections();
	server.close(() => process.exit(0));
};
process.on('message', (message) => {
	if (message === 'stop') stop();
});
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
