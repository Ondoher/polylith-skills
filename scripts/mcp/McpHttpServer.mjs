import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {InputContract} from './InputContract.mjs';
import {toolContracts} from './tool-contracts.mjs';
import {MAX_REQUEST_BYTES, MCP_PROTOCOL_VERSION, WORKFLOW_VERSION} from './consts.mjs';

/** Authenticated loopback Streamable HTTP transport, shared by independent clients. */
export class McpHttpServer {
	/** Creates a transport without opening a socket.
	 * @param {WorkflowService} service - Resident domain service.
	 * @param {string} token - Connection secret, distinct from owner/agent capabilities.
	 */
	constructor(service, token) {
		if (typeof token !== 'string' || token.length < 32)
			throw new Error('Use a connection token of at least 32 characters');
		this.service = service;
		this._authorization = Buffer.from(`Bearer ${token}`);
		this.samples = [];
		this._requests = new Set();
		this._closing = false;
		this._closed = null;
		this.server = createServer((request, response) => {
			const pending = this._handle(request, response);
			this._requests.add(pending);
			pending.finally(() => this._requests.delete(pending));
		});
		this.server.requestTimeout = 120000;
	}

	/** Call this method to bind only to IPv4 loopback.
	 * @param {number} port - Explicit port or zero for an available port.
	 * @returns {Promise<string>} - MCP endpoint URL.
	 */
	async listen(port = 0) {
		await new Promise((resolve, reject) => {
			this.server.once('error', reject);
			this.server.listen(port, '127.0.0.1', resolve);
		});
		return `http://127.0.0.1:${this.server.address().port}/mcp`;
	}

	/** Call this method before service drain to stop admitting new work and finish accepted tool calls.
	 * @returns {Promise<void>} - No HTTP handler can submit further service work.
	 */
	async quiesce() {
		this._closing = true;
		this._closed ??= new Promise((resolve) => this.server.close(resolve));
		await Promise.allSettled([...this._requests]);
	}

	/** Call this method to close owned HTTP resources after admission has stopped.
	 * @returns {Promise<void>} - Resolves after connections close.
	 */
	async close() {
		await this.quiesce();
		this.server.closeAllConnections();
		await this._closed;
	}

	/** Handles one authenticated JSON-RPC message and records sizes and elapsed time, never data or tokens.
	 * @param {import('node:http').IncomingMessage} request - HTTP request.
	 * @param {import('node:http').ServerResponse} response - HTTP response.
	 * @returns {Promise<void>} - Response completion.
	 */
	async _handle(request, response) {
		const started = performance.now();
		let requestBytes = 0;
		let message;
		const fail = (status) => {
			response.writeHead(status);
			response.end();
		};
		if (this._closing) return fail(503);
		if (request.headers.host !== `127.0.0.1:${this.server.address().port}` || request.headers.origin)
			return fail(403);
		const authorization = Buffer.from(request.headers.authorization ?? '');
		if (authorization.length !== this._authorization.length || !timingSafeEqual(authorization, this._authorization))
			return fail(401);
		if (request.url !== '/mcp') return fail(404);
		if (request.method !== 'POST') return fail(405);
		if (!request.headers['content-type']?.includes('application/json')) return fail(415);
		if (request.headers['mcp-protocol-version'] && request.headers['mcp-protocol-version'] !== MCP_PROTOCOL_VERSION)
			return fail(400);
		try {
			const chunks = [];
			for await (const chunk of request) {
				requestBytes += chunk.length;
				if (requestBytes > MAX_REQUEST_BYTES) return fail(413);
				chunks.push(chunk);
			}
			message = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks)));
			if (message.jsonrpc !== '2.0' || typeof message.method !== 'string')
				throw new Error('Invalid JSON-RPC request');
			if (message.id === undefined) return fail(202);
			let result;
			if (message.method === 'initialize')
				result = {
					protocolVersion: MCP_PROTOCOL_VERSION,
					capabilities: {tools: {}},
					serverInfo: {name: 'polylith-workflows', version: WORKFLOW_VERSION},
				};
			else if (message.method === 'ping') result = {};
			else if (message.method === 'tools/list') result = {tools: toolContracts};
			else if (message.method === 'tools/call') {
				try {
					if (this._closing) throw new Error('Service is shutting down; no new work was accepted');
					const contract = toolContracts.find((tool) => tool.name === message.params?.name);
					if (!contract) throw new Error('Unknown tool');
					const args = message.params.arguments ?? {};
					new InputContract().validate(args, contract.inputSchema);
					const value = await this.service[contract.name.slice(9)](args);
					const text = JSON.stringify(value);
					if (Buffer.byteLength(text) > 8192)
						throw new Error('Result exceeds tool budget; use a saved handle and bounded reads');
					result = {content: [{type: 'text', text}]};
				} catch (error) {
					result = {isError: true, content: [{type: 'text', text: error.message.slice(0, 2000)}]};
				}
			} else if (message.method === 'resources/list') result = {resources: []};
			else if (message.method === 'resources/templates/list') result = {resourceTemplates: []};
			else if (message.method === 'prompts/list') result = {prompts: []};
			else throw new Error('Unsupported method');
			const body = JSON.stringify({jsonrpc: '2.0', id: message.id, result});
			const sample = {
				at: new Date().toISOString(),
				method: message.method,
				tool: message.params?.name ?? null,
				requestBytes,
				responseBytes: Buffer.byteLength(body),
				handlingMs: performance.now() - started,
				failed: result.isError === true,
			};
			this.samples.push(sample);
			response.writeHead(200, {
				'Content-Type': 'application/json',
				'Content-Length': sample.responseBytes,
				'Server-Timing': `handler;dur=${sample.handlingMs}`,
			});
			response.end(body);
		} catch (error) {
			response.writeHead(400, {'Content-Type': 'application/json'});
			response.end(
				JSON.stringify({
					jsonrpc: '2.0',
					id: message?.id ?? null,
					error: {code: -32600, message: error.message.slice(0, 2000)},
				}),
			);
		}
	}
}
