import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DesignAssembly} from '../../../../skills/refine-design/scripts/design-assembly.mjs';
import {DesignRecords} from '../../../../skills/refine-design/scripts/design-records.mjs';

/** Frozen saved inputs and mechanically derived change scope for the pilot. */
export const PilotInputs = {
	/** Capture exact source bytes before any experimental work. */
	hashFiles(paths) {
		const result = {};
		const visit = (location) => {
			const stat = fs.lstatSync(location);
			assert(!stat.isSymbolicLink(), 'Protected input must not be a link');
			if (stat.isDirectory())
				for (const name of fs.readdirSync(location).sort()) visit(path.join(location, name));
			else result[location] = createHash('sha256').update(fs.readFileSync(location)).digest('hex');
		};
		for (const location of paths) visit(location);
		return result;
	},
	/** Prepare once; prior authoring units are assembled without a new model pass. */
	prepare(governance, workspace) {
		const started = performance.now();
		const sourceWorkspace = path.join(
			governance,
			'.codex-tmp/ux-full-native-20260929/sol-medium-first-pass-20260930/workspace',
		);
		const units = path.join(sourceWorkspace, '.codex-tmp/mcp-workflows/runs/ux-full-native-replay/units/ux');
		const product = path.join(sourceWorkspace, 'product/Alexa');
		const read = (location) => JSON.parse(fs.readFileSync(location, 'utf8'));
		const saved = DesignRecords.read(units);
		assert.deepEqual(saved.issues, []);
		const assembled = DesignAssembly.ux(saved.records);
		assert.deepEqual(assembled.issues, []);
		const before = read(path.join(product, 'ux/ux-spec.json'));
		const after = assembled.document;
		const priorUi = read(path.join(product, 'ui/ui-spec.json'));
		const changes = (name) => {
			const previous = new Map(before[name].map((item) => [item.id, item]));
			return after[name]
				.filter((item) => JSON.stringify(item) !== JSON.stringify(previous.get(item.id)))
				.map((item) => ({id: item.id, before: previous.get(item.id) ?? null, after: item}));
		};
		// Canonical comparison ignores property insertion order, not authored meaning.
		const stable = (value) =>
			JSON.stringify(value, (_key, item) =>
				item && !Array.isArray(item) && typeof item === 'object'
					? Object.fromEntries(
							Object.keys(item)
								.sort()
								.map((key) => [key, item[key]]),
						)
					: item,
			);
		const actualChanges = (name) => changes(name).filter((item) => stable(item.before) !== stable(item.after));
		const summarizeChanges = (items) =>
			items.map(({id, before: oldValue, after: newValue}) => {
				const fields = [];
				const visit = (left, right, pointer) => {
					if (stable(left) === stable(right)) return;
					if (
						left &&
						right &&
						typeof left === 'object' &&
						typeof right === 'object' &&
						Array.isArray(left) === Array.isArray(right)
					) {
						for (const key of new Set([...Object.keys(left), ...Object.keys(right)]))
							visit(left[key], right[key], pointer + '/' + key);
					} else fields.push({path: pointer, before: left ?? null, after: right ?? null});
				};
				visit(oldValue, newValue, '');
				return {id, fields};
			});
		const flowChanges = actualChanges('flows');
		const changedFlowIds = new Set(flowChanges.map((item) => item.id));
		const flowActionIds = new Set(
			flowChanges.flatMap(({after: flow}) =>
				[...flow.steps, ...flow.alternates.flatMap((item) => item.steps)]
					.map((step) => step.actionRef)
					.filter(Boolean),
			),
		);
		const actions = after.actions.filter(
			(item) => item.taskRefs?.some((id) => changedFlowIds.has(id)) || flowActionIds.has(item.id),
		);
		const actionIds = new Set(actions.map((item) => item.id));
		const frames = after.interactionFrames.filter(
			(item) =>
				item.taskRefs?.some((id) => changedFlowIds.has(id)) ||
				item.regions?.some((region) =>
					region.affordances?.some((affordance) => actionIds.has(affordance.actionRef)),
				),
		);
		const stateIds = new Set(frames.map((item) => item.stateRef));
		const surfaceIds = new Set(frames.map((item) => item.surfaceRef));
		const context = {
			approval: 'unreviewed',
			sourceBinding: saved.header.binding,
			flowChanges: summarizeChanges(flowChanges),
			actionChanges: summarizeChanges(actualChanges('actions')),
			frameChanges: summarizeChanges(actualChanges('interactionFrames')),
			flows: after.flows.filter((item) => changedFlowIds.has(item.id)),
			actions,
			interactionFrames: frames,
			states: after.states.filter((item) => stateIds.has(item.id)),
			surfaces: after.surfaces.filter((item) => surfaceIds.has(item.id)),
			components: after.components.filter((item) => item.surfaceRefs?.some((id) => surfaceIds.has(id))),
			feedback: after.feedback.filter((item) => actionIds.has(item.actionRef)),
			patternResearch: after.patternResearch,
			openQuestions: after.openQuestions,
		};
		const design = {
			foundations: read(path.join(product, 'design-language/design-language.json')),
			tokens: priorUi.tokens,
			templates: priorUi.templates,
			designLanguageSource: priorUi.designLanguageSource,
			priorScenes: priorUi.scenes.map(({id, name, partRef, interactionFrameRef, flowRefs}) => ({
				id,
				name,
				partRef,
				interactionFrameRef,
				flowRefs,
			})),
			patternResearch: after.patternResearch,
		};
		const protectedPaths = [
			units,
			path.join(product, 'ux/ux-spec.json'),
			path.join(product, 'ui/ui-spec.json'),
			path.join(product, 'design-language/design-language.json'),
			path.join(sourceWorkspace, 'agents/topics/alexa/product-description.md'),
		];
		if (fs.existsSync('C:/dev/alexa/product/Alexa')) protectedPaths.push('C:/dev/alexa/product/Alexa');
		if (fs.existsSync('C:/dev/alexa/agents/topics/alexa/product-description.md'))
			protectedPaths.push('C:/dev/alexa/agents/topics/alexa/product-description.md');
		const inputDirectory = path.join(workspace, 'inputs');
		fs.mkdirSync(inputDirectory, {recursive: true});
		for (const [name, value] of Object.entries({
			context,
			design,
			'before-ux': before,
			'after-ux': after,
			'prior-ui': priorUi,
		}))
			fs.writeFileSync(path.join(inputDirectory, name + '.json'), JSON.stringify(value));
		const manifest = {
			createdAt: new Date().toISOString(),
			sourceWorkspace,
			sourceBinding: saved.header.binding,
			protectedPaths,
			hashes: this.hashFiles(protectedPaths),
			changedFlows: [...changedFlowIds],
			changedActions: context.actionChanges.map((item) => item.id),
			changedFrames: context.frameChanges.map((item) => item.id),
			contextBytes: Buffer.byteLength(JSON.stringify(context)),
			designBytes: Buffer.byteLength(JSON.stringify(design)),
			preparationMs: performance.now() - started,
			approval: 'unreviewed',
		};
		fs.writeFileSync(path.join(workspace, 'source-manifest.json'), JSON.stringify(manifest, null, 2));
		return {manifest, context, design, before, after, priorUi};
	},
};
