import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {WorkflowService} from './mcp/WorkflowService.mjs';
import {McpHttpServer} from './mcp/McpHttpServer.mjs';
import {OperationWorker} from './mcp/OperationWorker.mjs';

const workspace = process.argv[2];
if (!workspace || process.argv.length > 4)
	throw new Error('Usage: node scripts/mcp-server.mjs <workspace> [port]; set POLYLITH_MCP_TOKEN for clients');
const port = Number(process.argv[3] ?? 0);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
const worker = new OperationWorker();
const service = new WorkflowService({workspace: path.resolve(workspace), operations: worker.operations});
const token = process.env.POLYLITH_MCP_TOKEN ?? randomBytes(32).toString('hex');
const server = new McpHttpServer(service, token);
const url = await server.listen(port);
// Startup is parent-only. Do not forward this receipt wholesale to an agent.
const ready = {
	event: 'ready',
	url,
	instance: service.instance,
	pid: process.pid,
	access: service.ownerAccess,
	...(!process.env.POLYLITH_MCP_TOKEN ? {token} : {}),
};
if (process.send) process.send(ready);
else process.stdout.write(`${JSON.stringify(ready)}\n`);
let stopping = false;
const stop = async () => {
	if (stopping) return;
	stopping = true;
	await service.drain();
	service.files.write(
		path.join(service.stateDirectory, `metrics-${service.instance}.json`),
		JSON.stringify(
			{instance: service.instance, requests: server.samples, operations: service.measurements},
			null,
			2,
		),
	);
	await server.close();
	await worker.close();
	if (process.connected) process.disconnect();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('message', (message) => {
	if (message === 'stop') stop();
});
