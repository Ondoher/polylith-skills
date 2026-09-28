import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {randomBytes, createHash} from 'node:crypto';
import {WorkflowService} from '../../../../scripts/mcp/WorkflowService.mjs';
import {McpHttpServer} from '../../../../scripts/mcp/McpHttpServer.mjs';

const workspace = fileURLToPath(new URL('../../../../', import.meta.url));
const destination = path.join(workspace, 'planning/refinement-efficiency/ux-read-window-20260928-local.json');
assert.ok(!fs.existsSync(destination), 'Preserve existing measurements');
const source = path.join(workspace, '.codex-tmp/ux-comparison-replay-20260928-160822/inputs');
const values = Object.fromEntries(
	['facts', 'ux'].map((name) => [name, JSON.parse(fs.readFileSync(path.join(source, name + '.json')))]),
);
const results = [];
for (const pageBytes of [7000, 14000, 28000, 56000, 112000]) {
	const service = new WorkflowService({workspace, pageBytes});
	const token = randomBytes(32).toString('hex');
	const server = new McpHttpServer(service, token);
	const url = await server.listen();
	let id = 0;
	const call = async (name, args) => {
		const start = performance.now();
		const response = await fetch(url, {
			method: 'POST',
			headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json'},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: ++id,
				method: 'tools/call',
				params: {name: `workflow_${name}`, arguments: args},
			}),
		});
		const raw = await response.text();
		const data = JSON.parse(raw);
		assert.ok(response.ok && !data.error && !data.result.isError);
		return {
			value: JSON.parse(data.result.content[0].text),
			elapsedMs: performance.now() - start,
			httpBytes: Buffer.byteLength(raw),
			toolTextBytes: Buffer.byteLength(data.result.content[0].text),
		};
	};
	try {
		const access = service.ownerAccess;
		const run = 'ux-mcp-replay-20260928';
		await call('open', {access, run});
		const receipts = {};
		for (const [name, value] of Object.entries(values))
			receipts[name] = (await call('store', {access, run, value})).value;
		for (let repetition = 0; repetition < 3; repetition++) {
			const started = performance.now();
			const pages = [];
			const coverage = {};
			for (const [name, receipt] of Object.entries(receipts)) {
				let offset = 0;
				const fragments = [];
				do {
					const {value, ...timing} = await call('read', {
						access,
						handle: receipt.handle,
						offset,
						maxBytes: pageBytes,
					});
					assert.equal(value.offset, offset);
					fragments.push(value.text);
					pages.push({source: name, offset, textBytes: Buffer.byteLength(value.text), ...timing});
					offset = value.nextOffset;
				} while (offset !== null);
				const text = fragments.join('');
				assert.equal(createHash('sha256').update(text).digest('hex'), receipt.sha256);
				coverage[name] = {bytes: Buffer.byteLength(text), sha256: receipt.sha256, complete: true};
			}
			const result = {
				pageBytes,
				repetition,
				totalMs: performance.now() - started,
				reads: pages.length,
				coverage,
				pages,
			};
			results.push(result);
			console.log(
				JSON.stringify({
					pageBytes,
					repetition,
					reads: pages.length,
					totalMs: result.totalMs,
					largestHttpBytes: Math.max(...pages.map((page) => page.httpBytes)),
				}),
			);
		}
	} finally {
		await server.close();
	}
}
fs.writeFileSync(
	destination,
	JSON.stringify(
		{
			experiment: 'Deterministic localhost HTTP read-window sweep; no model or Codex-client delivery claimed',
			capturedAt: new Date().toISOString(),
			results,
		},
		null,
		2,
	) + '\n',
);
