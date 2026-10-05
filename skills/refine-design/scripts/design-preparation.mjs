import fs from 'node:fs';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {DesignPreparation} from './DesignPreparation.mjs';

/** Data-only parent CLI for persisted preparation; all host tools stay in conversation.
 * @param {string[]} argumentsList - Command, directory and optional bounded request file.
 * @returns {DesignPreparationCliReceipt} - Compact nonsecret operational status.
 */
export function preparationCommand(argumentsList) {
	const {positionals, values} = parseArgs({
		args: argumentsList,
		allowPositionals: true,
		options: {directory: {type: 'string'}, input: {type: 'string'}, author: {type: 'string'}},
	});
	const command = positionals[0];
	const commands = {
		initialize: 'initialize',
		advise: 'advise',
		reserve: 'reserve',
		created: 'created',
		failed: 'failed',
		adopt: 'adopt',
		acknowledge: 'acknowledge',
		'refresh-packet': 'refreshPacket',
		observe: 'observe',
		retire: 'retire',
		'bind-claim': 'bindClaim',
		release: 'release',
	};
	if (positionals.length !== 1 || (command !== 'inspect' && !Object.hasOwn(commands, command)))
		throw new Error('Unknown preparation command');
	const ledger = new DesignPreparation(values.directory);
	if (command !== 'inspect') {
		if (!values.input || fs.statSync(values.input).size > 65536)
			throw new Error('A request JSON file bounded to 65536 bytes is required');
		ledger[commands[command]](JSON.parse(fs.readFileSync(values.input, 'utf8')));
	}
	const {state, openCount, authoringCount, uncertain} = ledger.inspect();
	const authors = values.author
		? state.authors.filter((author) => author.id === values.author)
		: state.authors.filter((author) => !['closed', 'absent'].includes(author.thread) || author.assignment);
	return {
		revision: state.revision,
		scope: state.scope,
		forecastRevision: state.forecast?.revision ?? null,
		capacity: state.capacity,
		ceiling: state.ceiling,
		openCount,
		authoringCount,
		uncertain,
		authors: authors.map(({id, attemptId, agentId, role, status, thread, packetDigest, ack, assignment}) => ({
			id,
			attemptId,
			agentId,
			role,
			status,
			thread,
			packetDigest,
			ack,
			assignment,
		})),
		lastEvent: state.history.at(-1) ?? null,
	};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		process.stdout.write(JSON.stringify(preparationCommand(process.argv.slice(2)), null, 2) + '\n');
	} catch (error) {
		process.stderr.write(`design-preparation: ${error.message}\n`);
		process.exitCode = 1;
	}
}
