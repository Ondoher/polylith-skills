import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {runModel, probeTool} from './run.mjs';
import {toolContracts} from '../../../../scripts/mcp/tool-contracts.mjs';
import {McpHttpServer} from '../../../../scripts/mcp/McpHttpServer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const name = process.argv.find((value) => value.startsWith('--attempt='))?.slice(10);
const profile = process.argv.find((value) => value.startsWith('--profile='))?.slice(10);
if (!name || !/^[a-z0-9-]+$/.test(name)) throw new Error('Supply unique --attempt');
const folder = path.join(root, '.codex-tmp/native-isolation-20260929', name);
if (fs.existsSync(folder)) throw new Error('Preserve earlier evidence');
const namespace = 'mcp__polylith_workflows';
const namespaced = (tool) => [
	{type: 'namespace', name: namespace, description: 'Read-only workflow probes.', tools: [tool]},
];
const options = {profile};
if (profile === 'namespace') {
	options.tools = namespaced(probeTool);
	options.prompt = `Call ${namespace}.probe(id) for IDs 1 through 8 in parallel, in one model response. All calls are independent. Do nothing else.`;
	options.decode = (item, args) => {
		assert.equal(item.name, 'probe');
		assert.equal(item.namespace, namespace);
		assert.deepEqual(Object.keys(args), ['id']);
		return args.id;
	};
} else if (
	['workflow-schema', 'workflow-mcp', 'full-tools', 'base-instructions', 'full-context', 'conversation'].includes(
		profile,
	)
) {
	const original = toolContracts.find((entry) => entry.name === 'workflow_read');
	options.tools = namespaced({
		type: 'function',
		name: original.name,
		description: original.description,
		parameters: original.inputSchema,
		strict: false,
	});
	options.prompt = `Call ${namespace}.workflow_read for offsets 0 through 7 in parallel, in one model response. Every call uses access="synthetic-access", handle="synthetic-handle", maxBytes=256. All calls are independent. Do nothing else.`;
	options.decode = (item, args) => {
		assert.equal(item.name, 'workflow_read');
		assert.equal(item.namespace, namespace);
		assert.equal(args.access, 'synthetic-access');
		assert.equal(args.handle, 'synthetic-handle');
		assert.equal(args.maxBytes, 256);
		assert.equal(args.pointer ?? '', '');
		return args.offset + 1;
	};
} else if (profile !== 'minimal') throw new Error('Unknown profile');
const contextArgument = process.argv.find((value) => value.startsWith('--context='))?.slice(10);
if (['full-tools', 'base-instructions', 'full-context', 'conversation'].includes(profile)) {
	if (!contextArgument) throw new Error('Supply saved --context');
	const context = JSON.parse(fs.readFileSync(path.resolve(root, contextArgument), 'utf8'));
	if (['full-tools', 'full-context', 'conversation'].includes(profile)) options.tools = context.tools;
	if (['base-instructions', 'full-context', 'conversation'].includes(profile))
		options.instructions = context.instructions;
	if (profile === 'conversation') options.inputPrefix = context.input.slice(0, -1);
}
const auth = JSON.parse(
	fs.readFileSync(path.join(process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex'), 'auth.json'), 'utf8'),
);
if (!auth.tokens?.access_token) throw new Error('Existing Codex authentication required');
fs.mkdirSync(folder, {recursive: true});
let mcp;
if (profile === 'workflow-mcp') {
	const token = randomBytes(32).toString('hex');
	mcp = new McpHttpServer(
		{
			readLimits: {pageBytes: 7000, toolBytes: 32768},
			read: async (args) => {
				await new Promise((resolve) => setTimeout(resolve, 250));
				return {id: args.offset + 1};
			},
		},
		token,
	);
	const url = await mcp.listen();
	options.execute = async (id, args) => {
		const response = await fetch(url, {
			method: 'POST',
			headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id,
				method: 'tools/call',
				params: {name: 'workflow_read', arguments: args},
			}),
		});
		assert(response.ok);
		const result = await response.json();
		assert.deepEqual(JSON.parse(result.result.content[0].text), {id});
	};
}
let report;
try {
	report = await runModel('gpt-6-astra', auth, path.join(folder, 'metrics.json'), options);
} finally {
	if (mcp) {
		await mcp.close();
		fs.writeFileSync(path.join(folder, 'mcp-metrics.json'), JSON.stringify(mcp.samples, null, 2));
	}
}
if (report.status !== 'finished' || !report.allEightVerified) process.exitCode = 1;
