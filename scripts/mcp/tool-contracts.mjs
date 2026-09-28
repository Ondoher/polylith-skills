const string = {type: 'string', maxLength: 4096};
const strings = {type: 'array', items: string, maxItems: 2000};
const object = {type: 'object'};
const definitions = {
	open: [
		'Open a parent-owned workspace run. Existing run paths must match.',
		{access: string, run: string, sourcePath: string, currentPath: string},
		['access'],
	],
	assign: [
		'Grant one agent named operations, exact inputs, and a bounded delivery scope.',
		{
			access: string,
			run: string,
			operations: strings,
			handles: strings,
			readPaths: strings,
			outputDirectory: string,
			scope: object,
		},
		['access', 'run'],
	],
	store: [
		'Save JSON or an assigned JSON file once. Return its reusable handle.',
		{access: string, run: string, value: {}, file: string},
		['access', 'run'],
	],
	read: [
		'Read one bounded UTF-8 page of a saved result, optionally selected by JSON pointer.',
		{
			access: string,
			handle: string,
			pointer: string,
			offset: {type: 'integer', minimum: 0},
			maxBytes: {type: 'integer', minimum: 256, maximum: 7000},
		},
		['access', 'handle'],
	],
	catalog: [
		'List permitted operation names; request one name for its full input contract.',
		{access: string, run: string, operation: string},
		['access'],
	],
	execute: [
		'Execute a curated operation. Bind saved results through inputHandles without copying data. Use background for long jobs.',
		{
			access: string,
			run: string,
			operation: string,
			input: object,
			inputHandles: object,
			background: {type: 'boolean'},
		},
		['access', 'run', 'operation'],
	],
	status: [
		'Inspect an assigned job or the resident service. Owner may save timing evidence.',
		{access: string, run: string, job: string, metrics: {type: 'boolean'}},
		['access'],
	],
};

export const toolContracts = Object.entries(definitions).map(([method, [description, properties, required]]) => ({
	name: `workflow_${method}`,
	description,
	inputSchema: {type: 'object', properties, required, additionalProperties: false},
	annotations: {
		readOnlyHint: ['read', 'catalog', 'status'].includes(method),
		destructiveHint: method === 'execute',
		openWorldHint: false,
	},
}));
