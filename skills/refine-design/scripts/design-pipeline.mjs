import fs from 'node:fs';
import {parseArgs} from 'node:util';
import {DesignPlan} from './DesignPlan.mjs';
import {DesignCoordinator} from './DesignCoordinator.mjs';

try {
	const {values, positionals} = parseArgs({
		allowPositionals: true,
		options: {
			plan: {type: 'string'},
			state: {type: 'string'},
			directory: {type: 'string'},
			help: {type: 'boolean'},
		},
	});
	const [command] = positionals;
	if (values.help) {
		console.log(
			'design-pipeline.mjs validate|inspect --plan <json> [--state <json>]\nstatus --directory <saved-plan-directory>',
		);
	} else if (command === 'status') {
		if (!values.directory) throw new Error('--directory is required');
		console.log(JSON.stringify(new DesignCoordinator(values.directory).inspect(), null, 2));
	} else {
		if (!values.plan) throw new Error('--plan is required');
		const plan = new DesignPlan(JSON.parse(fs.readFileSync(values.plan, 'utf8')));
		let result;
		if (command === 'validate') result = plan.validate();
		else if (command === 'inspect') {
			const state = values.state ? JSON.parse(fs.readFileSync(values.state, 'utf8')) : {};
			result = plan.inspect(state);
		} else throw new Error('Use validate or inspect');
		console.log(JSON.stringify(result, null, 2));
		if (!result.valid) process.exitCode = 1;
	}
} catch (error) {
	console.error(`design-pipeline: ${error.message}`);
	process.exitCode = 1;
}
