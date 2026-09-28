import {parentPort} from 'node:worker_threads';
import {DomainOperations} from './DomainOperations.mjs';
import {WorkspaceFiles} from './WorkspaceFiles.mjs';

const catalog = new DomainOperations().operations;
parentPort.on('message', async ({id, operation, input, context}) => {
	try {
		const files = new WorkspaceFiles(context.workspace);
		const inputPath = (location) => {
			const absolute = files.resolve(location);
			if (
				!context.owner &&
				!context.readPaths.includes(absolute) &&
				!(context.outputDirectory && files.contains(context.outputDirectory, absolute))
			)
				throw new Error('Input path is outside the assignment');
			return absolute;
		};
		const value = await catalog[operation].execute(input, {...context, files, inputPath});
		parentPort.postMessage({id, value: value ?? null});
	} catch (error) {
		parentPort.postMessage({id, error: error.message});
	}
});
