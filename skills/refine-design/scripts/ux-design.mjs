import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {guardDesignLocks} from './design-lock.mjs';
import {
	escapeMarkdownText,
	validateDurableResearch,
	validatePublicHttpsUrl,
	validateRepositoryRelativeLink,
} from './input-security.mjs';
import {ROOT_BOUND_TARGETS, writeOwnedJsonArtifact} from './root-bound-artifact.mjs';

const uxSchema = JSON.parse(fs.readFileSync(new URL('../references/ux-schema-0.3.json', import.meta.url), 'utf8'));
const stableIdPattern = new RegExp(uxSchema.$defs.stableId.pattern);

const statuses = new Set(['default', 'proposed', 'accepted', 'locked', 'unresolved']);
const resolvedStatuses = new Set(['accepted', 'locked']);
const taskPriorities = new Set(['primary', 'supporting']);
const actionMethods = new Set([
	'activate',
	'select',
	'enter',
	'navigate',
	'direct-manipulation',
	'dismiss',
	'confirm',
	'system-mediated',
]);
const presentationClasses = new Set([
	'persistent-control',
	'contextual-control',
	'direct-manipulation',
	'menu-item',
	'dialog-action',
]);
const visibilityModes = new Set(['always', 'conditional', 'on-demand']);
const persistenceModes = new Set(['persistent', 'state-bound', 'transient']);
const priorities = new Set(['primary', 'secondary', 'contextual', 'supporting']);
const feedbackPhases = new Set(['invoked', 'progress', 'success', 'failure', 'canceled']);
const cancellationModes = new Set(['not-applicable', 'available', 'unavailable']);
const patternKinds = new Set(['ordinary', 'researched', 'novel']);
const researchOutcomes = new Set(['pattern-selected', 'conflicting-patterns-resolved', 'no-suitable-precedent']);
const frameKinds = new Set(['surface', 'dialog', 'menu', 'popover', 'panel']);
const contentKinds = new Set(['information', 'guidance', 'feedback', 'status', 'technical-information']);
const transitionKinds = new Set(['none', 'state', 'frame', 'surface', 'completion']);
const pruningDispositions = new Set(['retain', 'remove', 'merge', 'demote', 'contextualize', 'no-change']);

function fail(message) {
	throw new Error(message);
}

function object(value, label) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
	return value;
}

function text(value, label) {
	if (typeof value !== 'string' || value.trim() === '') fail(`${label} must be non-empty text`);
	return value;
}

function stableId(value, label) {
	if (typeof value !== 'string' || !stableIdPattern.test(value)) {
		fail(`${label} must match the UX schema stableId pattern ${uxSchema.$defs.stableId.pattern}`);
	}
	return value;
}

function resolveSchemaReference(reference) {
	if (!reference.startsWith('#/')) fail(`Unsupported UX schema reference ${reference}`);
	return reference
		.slice(2)
		.split('/')
		.reduce((value, segment) => value[segment.replaceAll('~1', '/').replaceAll('~0', '~')], uxSchema);
}

function validateStableIds(value, schema, label = '$') {
	if (schema.$ref) {
		if (schema.$ref === '#/$defs/stableId') {
			stableId(value, label);
			return;
		}
		validateStableIds(value, resolveSchemaReference(schema.$ref), label);
	}
	if (Array.isArray(value) && schema.items) {
		value.forEach((item, index) => validateStableIds(item, schema.items, `${label}[${index}]`));
	} else if (value && typeof value === 'object' && !Array.isArray(value) && schema.properties) {
		for (const [key, childSchema] of Object.entries(schema.properties)) {
			if (Object.hasOwn(value, key)) validateStableIds(value[key], childSchema, `${label}.${key}`);
		}
	}
	for (const branch of schema.allOf ?? []) validateStableIds(value, branch, label);
}

function list(value, label) {
	if (!Array.isArray(value)) fail(`${label} must be an array`);
	return value;
}

function textList(value, label) {
	return list(value, label).map((item, index) => text(item, `${label}[${index}]`));
}

function status(value, label) {
	if (!statuses.has(value)) fail(`${label} has unsupported status ${String(value)}`);
}

function records(value, label) {
	const result = list(value, label);
	const ids = new Set();
	for (const [index, item] of result.entries()) {
		object(item, `${label}[${index}]`);
		const id = text(item.id, `${label}[${index}].id`);
		if (ids.has(id)) fail(`${label} contains duplicate id ${id}`);
		ids.add(id);
	}
	return {result, ids};
}

function reference(id, ids, label) {
	if (!ids.has(id)) fail(`${label} references missing id ${id}`);
}

function references(values, ids, label) {
	for (const id of textList(values, label)) reference(id, ids, label);
}

function choice(value, choices, label) {
	if (!choices.has(value)) fail(`${label} has unsupported value ${String(value)}`);
	return value;
}

function boolean(value, label) {
	if (typeof value !== 'boolean') fail(`${label} must be a boolean`);
	return value;
}

function positiveInteger(value, label) {
	if (!Number.isInteger(value) || value < 1) fail(`${label} must be a positive integer`);
	return value;
}

function uniqueTextList(value, label) {
	const values = textList(value, label);
	const ids = new Set();
	for (const item of values) {
		if (ids.has(item)) fail(`${label} contains duplicate value ${item}`);
		ids.add(item);
	}
	return values;
}

function allowedKeys(value, keys, label) {
	const allowed = new Set(keys);
	for (const key of Object.keys(value)) if (!allowed.has(key)) fail(`${label} has unsupported field ${key}`);
}

function exactSequence(actual, expected, label) {
	if (actual.length !== expected.length || actual.some((item, index) => item !== expected[index])) {
		fail(`${label} must match the canonical order exactly`);
	}
}

function exactSet(actual, expected, label) {
	const actualSet = new Set(actual);
	const expectedSet = new Set(expected);
	if (
		actualSet.size !== actual.length ||
		actualSet.size !== expectedSet.size ||
		[...actualSet].some((item) => !expectedSet.has(item))
	) {
		fail(`${label} must cover the referenced records exactly once`);
	}
}

function isResolved(value) {
	return resolvedStatuses.has(value);
}

function validatePatternBasis(basis, label, ownerStatus, researchById) {
	object(basis, label);
	allowedKeys(basis, ['kind', 'rationale', 'researchRef'], label);
	choice(basis.kind, patternKinds, `${label}.kind`);
	text(basis.rationale, `${label}.rationale`);
	if (basis.kind === 'ordinary') {
		if (basis.researchRef !== undefined) fail(`${label}.researchRef is not allowed for an ordinary pattern`);
		return;
	}
	const researchRef = text(basis.researchRef, `${label}.researchRef`);
	const research = researchById.get(researchRef);
	if (!research) fail(`${label}.researchRef references missing id ${researchRef}`);
	if (basis.kind === 'researched' && research.outcome === 'no-suitable-precedent') {
		fail(`${label} cannot claim a researched pattern when no suitable precedent was found`);
	}
	if (basis.kind === 'novel') {
		if (research.outcome !== 'no-suitable-precedent')
			fail(`${label} novel pattern requires no-suitable-precedent research`);
		text(research.selection.uncertainty, `${label} novel pattern uncertainty`);
	}
	if (isResolved(ownerStatus)) {
		if (!isResolved(research.status)) fail(`${label} resolved design requires resolved research evidence`);
		if (research.verification.status !== 'source-checked')
			fail(`${label} resolved design requires source-checked research evidence`);
	}
}

/** Validate the bounded UX-to-UI handoff used by UX design mode. */
export function validateUxSpec(spec) {
	object(spec, 'UX specification');
	validateStableIds(spec, uxSchema);
	allowedKeys(
		spec,
		[
			'schemaVersion',
			'id',
			'title',
			'revision',
			'status',
			'assessment',
			'sources',
			'product',
			'supportingDocuments',
			'application',
			'features',
			'useCases',
			'surfaces',
			'components',
			'actions',
			'interactionFrames',
			'patternResearch',
			'pruningReview',
			'openQuestions',
			'productModelBinding',
			'useCaseRelations',
			'flowNodes',
			'flowEdges',
			'states',
			'feedback',
			'recoveryPaths',
			'productRealizations',
			'traceGaps',
		],
		'UX specification',
	);
	if (spec.schemaVersion !== '0.3')
		fail('Unsupported UX schema version; UX interaction architecture requires schema 0.3');
	text(spec.id, 'id');
	text(spec.title, 'title');
	text(spec.revision, 'revision');
	status(spec.status, 'UX specification');
	object(spec.assessment, 'assessment');
	allowedKeys(spec.assessment, ['kind', 'description'], 'assessment');
	if (!['ux-planner-assessment', 'parent-assessment'].includes(spec.assessment.kind))
		fail('assessment.kind is unsupported');
	text(spec.assessment.description, 'assessment.description');

	const sources = records(spec.sources, 'sources');
	if (sources.result.length === 0) fail('At least one source is required');
	for (const source of sources.result) {
		allowedKeys(source, ['id', 'path', 'revision', 'kind'], `source ${source.id}`);
		validateRepositoryRelativeLink(source.path, `source ${source.id}.path`);
		text(source.revision, `source ${source.id}.revision`);
		text(source.kind, `source ${source.id}.kind`);
	}

	object(spec.product, 'product');
	allowedKeys(spec.product, ['name', 'overview', 'users'], 'product');
	text(spec.product.name, 'product.name');
	text(spec.product.overview, 'product.overview');
	textList(spec.product.users, 'product.users');
	if (spec.supportingDocuments !== undefined) {
		for (const [index, document] of list(spec.supportingDocuments, 'supportingDocuments').entries()) {
			object(document, `supportingDocuments[${index}]`);
			allowedKeys(document, ['label', 'path', 'description'], `supportingDocuments[${index}]`);
			text(document.label, `supportingDocuments[${index}].label`);
			validateRepositoryRelativeLink(document.path, `supportingDocuments[${index}].path`);
			text(document.description, `supportingDocuments[${index}].description`);
		}
	}

	object(spec.application, 'application');
	allowedKeys(spec.application, ['summary', 'shell', 'areas'], 'application');
	text(spec.application.summary, 'application.summary');
	object(spec.application.shell, 'application.shell');
	allowedKeys(
		spec.application.shell,
		['kind', 'description', 'status', 'navigation', 'regions'],
		'application.shell',
	);
	text(spec.application.shell.kind, 'application.shell.kind');
	text(spec.application.shell.description, 'application.shell.description');
	status(spec.application.shell.status, 'application.shell');
	if (spec.application.shell.navigation !== undefined) {
		object(spec.application.shell.navigation, 'application.shell.navigation');
		allowedKeys(spec.application.shell.navigation, ['pattern', 'description'], 'application.shell.navigation');
		text(spec.application.shell.navigation.pattern, 'application.shell.navigation.pattern');
		text(spec.application.shell.navigation.description, 'application.shell.navigation.description');
	}
	if (spec.application.shell.regions !== undefined) {
		const shellRegions = records(spec.application.shell.regions, 'application.shell.regions');
		const shellRegionOrders = new Set();
		for (const region of shellRegions.result) {
			allowedKeys(region, ['id', 'name', 'kind', 'purpose', 'persistence', 'order'], `shell region ${region.id}`);
			text(region.name, `shell region ${region.id}.name`);
			text(region.kind, `shell region ${region.id}.kind`);
			text(region.purpose, `shell region ${region.id}.purpose`);
			text(region.persistence, `shell region ${region.id}.persistence`);
			if (!Number.isInteger(region.order) || region.order < 1)
				fail(`shell region ${region.id}.order must be a positive integer`);
			if (shellRegionOrders.has(region.order))
				fail(`application.shell.regions contains duplicate order ${region.order}`);
			shellRegionOrders.add(region.order);
		}
	}

	const areas = records(spec.application.areas, 'application.areas');
	const features = records(spec.features, 'features');
	const useCases = records(spec.useCases, 'useCases');
	const surfaces = records(spec.surfaces, 'surfaces');
	const components = records(spec.components, 'components');
	const actions = records(spec.actions, 'actions');
	const frames = records(spec.interactionFrames, 'interactionFrames');
	const states = records(spec.states, 'states');
	const feedback = records(spec.feedback, 'feedback');
	const recoveries = records(spec.recoveryPaths, 'recoveryPaths');
	const flowNodes = records(spec.flowNodes, 'flowNodes');
	const flowEdges = records(spec.flowEdges, 'flowEdges');
	const useCaseRelations = records(spec.useCaseRelations, 'useCaseRelations');
	const productRealizations = records(spec.productRealizations, 'productRealizations');
	const traceGaps = records(spec.traceGaps, 'traceGaps');
	const researchRecords = records(spec.patternResearch, 'patternResearch');
	const questions = records(spec.openQuestions, 'openQuestions');
	const useCasesById = new Map(useCases.result.map((useCase) => [useCase.id, useCase]));
	const surfacesById = new Map(surfaces.result.map((surface) => [surface.id, surface]));
	const componentsById = new Map(components.result.map((component) => [component.id, component]));
	const actionsById = new Map(actions.result.map((action) => [action.id, action]));
	const framesById = new Map(frames.result.map((frame) => [frame.id, frame]));
	const statesById = new Map(states.result.map((state) => [state.id, state]));
	const feedbackById = new Map(feedback.result.map((item) => [item.id, item]));
	const recoveryById = new Map(recoveries.result.map((item) => [item.id, item]));
	const flowNodeById = new Map(flowNodes.result.map((item) => [item.id, item]));
	const researchById = new Map(researchRecords.result.map((research) => [research.id, research]));

	for (const area of areas.result) {
		allowedKeys(area, ['id', 'name', 'purpose', 'status', 'surfaceRefs'], `area ${area.id}`);
		text(area.name, `area ${area.id}.name`);
		text(area.purpose, `area ${area.id}.purpose`);
		status(area.status, `area ${area.id}`);
		const surfaceRefs = uniqueTextList(area.surfaceRefs, `area ${area.id}.surfaceRefs`);
		references(surfaceRefs, surfaces.ids, `area ${area.id}.surfaceRefs`);
		for (const surfaceRef of surfaceRefs) {
			if (surfacesById.get(surfaceRef).areaRef !== area.id)
				fail(
					`area ${area.id} references surface ${surfaceRef} owned by ${surfacesById.get(surfaceRef).areaRef}`,
				);
		}
	}

	for (const feature of features.result) {
		allowedKeys(
			feature,
			['id', 'name', 'purpose', 'status', 'sourceRefs', 'surfaceRefs', 'useCaseRefs', 'questionRefs'],
			`feature ${feature.id}`,
		);
		text(feature.name, `feature ${feature.id}.name`);
		text(feature.purpose, `feature ${feature.id}.purpose`);
		status(feature.status, `feature ${feature.id}`);
		references(
			uniqueTextList(feature.sourceRefs, `feature ${feature.id}.sourceRefs`),
			sources.ids,
			`feature ${feature.id}.sourceRefs`,
		);
		references(
			uniqueTextList(feature.surfaceRefs, `feature ${feature.id}.surfaceRefs`),
			surfaces.ids,
			`feature ${feature.id}.surfaceRefs`,
		);
		references(
			uniqueTextList(feature.useCaseRefs, `feature ${feature.id}.useCaseRefs`),
			useCases.ids,
			`feature ${feature.id}.useCaseRefs`,
		);
		for (const useCaseRef of feature.useCaseRefs) {
			if (useCasesById.get(useCaseRef).featureRef !== feature.id)
				fail(
					`feature ${feature.id} references use case ${useCaseRef} owned by ${useCasesById.get(useCaseRef).featureRef}`,
				);
		}
		references(feature.questionRefs, questions.ids, `feature ${feature.id}.questionRefs`);
	}

	for (const surface of surfaces.result) {
		allowedKeys(
			surface,
			[
				'id',
				'name',
				'kind',
				'purpose',
				'entry',
				'exit',
				'focusIntent',
				'status',
				'areaRef',
				'regions',
				'componentRefs',
				'stateRefs',
				'interactionFrameRefs',
				'questionRefs',
			],
			`surface ${surface.id}`,
		);
		text(surface.name, `surface ${surface.id}.name`);
		text(surface.kind, `surface ${surface.id}.kind`);
		text(surface.purpose, `surface ${surface.id}.purpose`);
		text(surface.entry, `surface ${surface.id}.entry`);
		text(surface.exit, `surface ${surface.id}.exit`);
		text(surface.focusIntent, `surface ${surface.id}.focusIntent`);
		status(surface.status, `surface ${surface.id}`);
		reference(surface.areaRef, areas.ids, `surface ${surface.id}.areaRef`);
		const componentRefs = uniqueTextList(surface.componentRefs, `surface ${surface.id}.componentRefs`);
		references(componentRefs, components.ids, `surface ${surface.id}.componentRefs`);
		const interactionFrameRefs = uniqueTextList(
			surface.interactionFrameRefs,
			`surface ${surface.id}.interactionFrameRefs`,
		);
		references(interactionFrameRefs, frames.ids, `surface ${surface.id}.interactionFrameRefs`);
		references(surface.questionRefs, questions.ids, `surface ${surface.id}.questionRefs`);
		references(
			uniqueTextList(surface.stateRefs, `surface ${surface.id}.stateRefs`),
			states.ids,
			`surface ${surface.id}.stateRefs`,
		);
		for (const ref of surface.stateRefs)
			if (statesById.get(ref).ownerRef !== `ux:surface:${surface.id}`)
				fail(`surface ${surface.id} state ${ref} has another owner`);
		if (isResolved(surface.status) && surface.interactionFrameRefs.length === 0)
			fail(`resolved surface ${surface.id} needs an interaction frame`);
		const regions = records(surface.regions, `surface ${surface.id}.regions`);
		if (isResolved(surface.status) && regions.result.length === 0)
			fail(`resolved surface ${surface.id} needs at least one functional region`);
		const regionOrders = new Set();
		for (const region of regions.result) {
			allowedKeys(region, ['id', 'name', 'purpose', 'order', 'componentRefs'], `region ${region.id}`);
			text(region.name, `region ${region.id}.name`);
			text(region.purpose, `region ${region.id}.purpose`);
			if (!Number.isInteger(region.order) || region.order < 1)
				fail(`region ${region.id}.order must be a positive integer`);
			if (regionOrders.has(region.order))
				fail(`surface ${surface.id}.regions contains duplicate order ${region.order}`);
			regionOrders.add(region.order);
			const regionComponentRefs = uniqueTextList(region.componentRefs, `region ${region.id}.componentRefs`);
			references(regionComponentRefs, components.ids, `region ${region.id}.componentRefs`);
			for (const componentRef of regionComponentRefs) {
				if (!surface.componentRefs.includes(componentRef))
					fail(
						`region ${region.id} component ${componentRef} is not listed by surface ${surface.id}.componentRefs`,
					);
			}
		}
	}

	for (const component of components.result) {
		allowedKeys(
			component,
			[
				'id',
				'name',
				'kind',
				'purpose',
				'status',
				'surfaceRefs',
				'questionRefs',
				'capabilities',
				'stateRefs',
				'behaviorNodeRefs',
				'entryBehaviorNodeRef',
			],
			`component ${component.id}`,
		);
		text(component.name, `component ${component.id}.name`);
		text(component.kind, `component ${component.id}.kind`);
		text(component.purpose, `component ${component.id}.purpose`);
		status(component.status, `component ${component.id}`);
		references(
			uniqueTextList(component.surfaceRefs, `component ${component.id}.surfaceRefs`),
			surfaces.ids,
			`component ${component.id}.surfaceRefs`,
		);
		references(component.questionRefs, questions.ids, `component ${component.id}.questionRefs`);
		textList(component.capabilities, `component ${component.id}.capabilities`);
		references(
			uniqueTextList(component.stateRefs, `component ${component.id}.stateRefs`),
			states.ids,
			`component ${component.id}.stateRefs`,
		);
		for (const ref of component.stateRefs)
			if (statesById.get(ref).ownerRef !== `ux:component:${component.id}`)
				fail(`component ${component.id} state ${ref} has another owner`);
		references(
			uniqueTextList(component.behaviorNodeRefs, `component ${component.id}.behaviorNodeRefs`),
			flowNodes.ids,
			`component ${component.id}.behaviorNodeRefs`,
		);
		if (component.entryBehaviorNodeRef !== undefined)
			reference(component.entryBehaviorNodeRef, flowNodes.ids, `component ${component.id}.entryBehaviorNodeRef`);
	}

	for (const surface of surfaces.result) {
		const area = areas.result.find((candidate) => candidate.id === surface.areaRef);
		if (!area.surfaceRefs.includes(surface.id))
			fail(`surface ${surface.id} is not listed by area ${area.id}.surfaceRefs`);
		for (const componentRef of surface.componentRefs) {
			if (!componentsById.get(componentRef).surfaceRefs.includes(surface.id))
				fail(`surface ${surface.id} component ${componentRef} does not trace back from component.surfaceRefs`);
		}
	}
	for (const component of components.result) {
		for (const surfaceRef of component.surfaceRefs) {
			if (!surfacesById.get(surfaceRef).componentRefs.includes(component.id))
				fail(`component ${component.id} surface ${surfaceRef} does not list the component in componentRefs`);
		}
	}

	for (const research of researchRecords.result) {
		const label = `pattern research ${research.id}`;
		validateDurableResearch(research, label);
		allowedKeys(
			research,
			[
				'id',
				'status',
				'question',
				'trigger',
				'method',
				'reviewedAt',
				'searchQueries',
				'sources',
				'patterns',
				'outcome',
				'selection',
				'rejectedPatterns',
				'limits',
				'verification',
				'taskRefs',
				'actionRefs',
				'frameRefs',
			],
			label,
		);
		status(research.status, label);
		text(research.question, `${label}.question`);
		choice(
			research.trigger,
			new Set([
				'unfamiliar-capability',
				'complex-product-interaction',
				'no-established-pattern',
				'conflicting-conventions',
			]),
			`${label}.trigger`,
		);
		choice(research.method, new Set(['bounded-online-search', 'supplied-sources-verified']), `${label}.method`);
		text(research.reviewedAt, `${label}.reviewedAt`);
		const queries = uniqueTextList(research.searchQueries, `${label}.searchQueries`);
		if (queries.length === 0) fail(`${label}.searchQueries must not be empty`);

		const sourceRecords = records(research.sources, `${label}.sources`);
		if (sourceRecords.result.length === 0) fail(`${label}.sources must not be empty`);
		const sourceUrls = new Set();
		for (const source of sourceRecords.result) {
			const sourceLabel = `${label} source ${source.id}`;
			allowedKeys(source, ['id', 'title', 'sourceType', 'sourceUrl', 'accessedAt', 'observations'], sourceLabel);
			text(source.title, `${sourceLabel}.title`);
			choice(
				source.sourceType,
				new Set([
					'standard',
					'platform-guidance',
					'official-product-doc',
					'maintained-project-manual',
					'primary-research',
					'original-author-guidance',
				]),
				`${sourceLabel}.sourceType`,
			);
			validatePublicHttpsUrl(source.sourceUrl, `${sourceLabel}.sourceUrl`);
			if (sourceUrls.has(source.sourceUrl))
				fail(`${label}.sources contains duplicate sourceUrl ${source.sourceUrl}`);
			sourceUrls.add(source.sourceUrl);
			text(source.accessedAt, `${sourceLabel}.accessedAt`);
			const observations = textList(source.observations, `${sourceLabel}.observations`);
			if (observations.length === 0) fail(`${sourceLabel}.observations must not be empty`);
		}

		const patterns = records(research.patterns, `${label}.patterns`);
		for (const pattern of patterns.result) {
			const patternLabel = `${label} pattern ${pattern.id}`;
			allowedKeys(pattern, ['id', 'name', 'sourceRefs', 'summary', 'applicability', 'tradeoffs'], patternLabel);
			text(pattern.name, `${patternLabel}.name`);
			const patternSourceRefs = uniqueTextList(pattern.sourceRefs, `${patternLabel}.sourceRefs`);
			references(patternSourceRefs, sourceRecords.ids, `${patternLabel}.sourceRefs`);
			if (patternSourceRefs.length === 0) fail(`${patternLabel}.sourceRefs must not be empty`);
			text(pattern.summary, `${patternLabel}.summary`);
			text(pattern.applicability, `${patternLabel}.applicability`);
			if (textList(pattern.tradeoffs, `${patternLabel}.tradeoffs`).length === 0)
				fail(`${patternLabel}.tradeoffs must not be empty`);
		}

		choice(research.outcome, researchOutcomes, `${label}.outcome`);
		object(research.selection, `${label}.selection`);
		allowedKeys(
			research.selection,
			['patternRef', 'summary', 'rationale', 'adaptations', 'uncertainty'],
			`${label}.selection`,
		);
		text(research.selection.summary, `${label}.selection.summary`);
		text(research.selection.rationale, `${label}.selection.rationale`);
		textList(research.selection.adaptations, `${label}.selection.adaptations`);
		if (research.outcome === 'no-suitable-precedent') {
			if (research.selection.patternRef !== undefined)
				fail(`${label}.selection.patternRef is not allowed when no suitable precedent exists`);
			text(research.selection.uncertainty, `${label}.selection.uncertainty`);
		} else {
			const selectedPatternRef = text(research.selection.patternRef, `${label}.selection.patternRef`);
			reference(selectedPatternRef, patterns.ids, `${label}.selection.patternRef`);
			const selectedPattern = patterns.result.find((pattern) => pattern.id === selectedPatternRef);
			const selectedSources = selectedPattern.sourceRefs.map((sourceRef) =>
				sourceRecords.result.find((source) => source.id === sourceRef),
			);
			const hasAuthoritativeGuidance = selectedSources.some((source) =>
				['standard', 'platform-guidance'].includes(source.sourceType),
			);
			if (!hasAuthoritativeGuidance && selectedSources.length < 2) {
				fail(
					`${label}.selection needs a standard or platform-guidance source, or at least two distinct sources`,
				);
			}
			if (research.selection.uncertainty !== undefined)
				text(research.selection.uncertainty, `${label}.selection.uncertainty`);
		}

		const rejected = records(research.rejectedPatterns, `${label}.rejectedPatterns`);
		for (const rejectedPattern of rejected.result) {
			const rejectedLabel = `${label} rejected pattern ${rejectedPattern.id}`;
			allowedKeys(rejectedPattern, ['id', 'pattern', 'rationale'], rejectedLabel);
			text(rejectedPattern.pattern, `${rejectedLabel}.pattern`);
			text(rejectedPattern.rationale, `${rejectedLabel}.rationale`);
		}
		if (textList(research.limits, `${label}.limits`).length === 0) fail(`${label}.limits must not be empty`);
		object(research.verification, `${label}.verification`);
		allowedKeys(research.verification, ['status', 'checkedBy', 'checkedAt', 'notes'], `${label}.verification`);
		choice(research.verification.status, new Set(['pending', 'source-checked']), `${label}.verification.status`);
		textList(research.verification.notes, `${label}.verification.notes`);
		if (research.verification.status === 'source-checked') {
			if (research.verification.checkedBy !== 'parent') fail(`${label}.verification.checkedBy must be parent`);
			text(research.verification.checkedAt, `${label}.verification.checkedAt`);
			if (research.verification.notes.length === 0)
				fail(`${label}.verification.notes must not be empty after source checking`);
		}
		if (isResolved(research.status) && research.verification.status !== 'source-checked')
			fail(`${label} resolved evidence must be source-checked`);
		references(research.taskRefs, useCases.ids, `${label}.taskRefs`);
		references(research.actionRefs, actions.ids, `${label}.actionRefs`);
		references(research.frameRefs, frames.ids, `${label}.frameRefs`);
		if (research.taskRefs.length + research.actionRefs.length + research.frameRefs.length === 0)
			fail(`${label} must identify affected UX records`);
	}

	const alternateInputIds = new Set();
	for (const action of actions.result) {
		const label = `action ${action.id}`;
		allowedKeys(
			action,
			[
				'id',
				'name',
				'purpose',
				'status',
				'taskRefs',
				'outcome',
				'canonicalInteraction',
				'alternateInputs',
				'presentationClass',
				'visibility',
				'persistence',
				'priority',
				'applicableStateRefs',
				'feedbackRefs',
				'cancellation',
				'recoveryRefs',
				'patternBasis',
				'questionRefs',
			],
			label,
		);
		text(action.name, `${label}.name`);
		text(action.purpose, `${label}.purpose`);
		status(action.status, label);
		const actionTaskRefs = uniqueTextList(action.taskRefs, `${label}.taskRefs`);
		references(actionTaskRefs, useCases.ids, `${label}.taskRefs`);
		if (actionTaskRefs.length === 0) fail(`${label}.taskRefs must not be empty`);
		text(action.outcome, `${label}.outcome`);

		object(action.canonicalInteraction, `${label}.canonicalInteraction`);
		allowedKeys(action.canonicalInteraction, ['method', 'input', 'description'], `${label}.canonicalInteraction`);
		choice(action.canonicalInteraction.method, actionMethods, `${label}.canonicalInteraction.method`);
		text(action.canonicalInteraction.input, `${label}.canonicalInteraction.input`);
		text(action.canonicalInteraction.description, `${label}.canonicalInteraction.description`);

		const alternateInputs = records(action.alternateInputs, `${label}.alternateInputs`);
		const inputMethods = new Set([action.canonicalInteraction.input]);
		for (const alternate of alternateInputs.result) {
			const alternateLabel = `${label} alternate input ${alternate.id}`;
			allowedKeys(alternate, ['id', 'input', 'description', 'equivalentOutcome'], alternateLabel);
			if (actions.ids.has(alternate.id) || alternateInputIds.has(alternate.id))
				fail(`alternate input id ${alternate.id} must not duplicate an action or another alternate input`);
			alternateInputIds.add(alternate.id);
			const alternateInput = text(alternate.input, `${alternateLabel}.input`);
			if (inputMethods.has(alternateInput))
				fail(`${alternateLabel}.input must differ from the canonical and other alternate inputs`);
			inputMethods.add(alternateInput);
			text(alternate.description, `${alternateLabel}.description`);
			boolean(alternate.equivalentOutcome, `${alternateLabel}.equivalentOutcome`);
			if (!alternate.equivalentOutcome)
				fail(`${alternateLabel}.equivalentOutcome must be true; a different outcome is a separate action`);
		}

		choice(action.presentationClass, presentationClasses, `${label}.presentationClass`);
		object(action.visibility, `${label}.visibility`);
		allowedKeys(action.visibility, ['mode', 'conditions'], `${label}.visibility`);
		choice(action.visibility.mode, visibilityModes, `${label}.visibility.mode`);
		const conditions = textList(action.visibility.conditions, `${label}.visibility.conditions`);
		if (action.visibility.mode === 'always' && conditions.length)
			fail(`${label} always-visible action cannot have visibility conditions`);
		if (action.visibility.mode !== 'always' && !conditions.length)
			fail(`${label} conditional or on-demand action needs a visibility condition`);
		if (
			(action.presentationClass === 'contextual-control' || action.priority === 'contextual') &&
			(action.visibility.mode === 'always' || !conditions.length)
		) {
			fail(`${label} contextual action needs conditional or on-demand visibility`);
		}
		choice(action.persistence, persistenceModes, `${label}.persistence`);
		choice(action.priority, priorities, `${label}.priority`);

		const applicableStateRefs = uniqueTextList(action.applicableStateRefs, `${label}.applicableStateRefs`);
		if (applicableStateRefs.length === 0) fail(`${label}.applicableStateRefs must not be empty`);
		references(applicableStateRefs, states.ids, `${label}.applicableStateRefs`);
		for (const ref of applicableStateRefs)
			if (!statesById.get(ref).ownerRef.startsWith('ux:surface:'))
				fail(`${label} state ${ref} is not surface-owned`);
		const feedbackRefs = uniqueTextList(action.feedbackRefs, `${label}.feedbackRefs`);
		if (feedbackRefs.length === 0) fail(`${label}.feedbackRefs must not be empty`);
		references(feedbackRefs, feedback.ids, `${label}.feedbackRefs`);
		for (const ref of feedbackRefs)
			if (feedbackById.get(ref).actionRef !== action.id)
				fail(`${label} feedback ${ref} has another action owner`);
		references(
			uniqueTextList(action.recoveryRefs, `${label}.recoveryRefs`),
			recoveries.ids,
			`${label}.recoveryRefs`,
		);
		for (const ref of action.recoveryRefs)
			if (recoveryById.get(ref).ownerRef !== `ux:action:${action.id}`)
				fail(`${label} recovery ${ref} has another owner`);

		object(action.cancellation, `${label}.cancellation`);
		allowedKeys(action.cancellation, ['mode', 'description', 'actionRef'], `${label}.cancellation`);
		choice(action.cancellation.mode, cancellationModes, `${label}.cancellation.mode`);
		text(action.cancellation.description, `${label}.cancellation.description`);
		if (action.cancellation.mode === 'available')
			text(action.cancellation.actionRef, `${label}.cancellation.actionRef`);
		else if (action.cancellation.actionRef !== undefined)
			fail(`${label}.cancellation.actionRef is allowed only when cancellation is available`);

		validatePatternBasis(action.patternBasis, `${label}.patternBasis`, action.status, researchById);
		references(action.questionRefs, questions.ids, `${label}.questionRefs`);
	}

	for (const action of actions.result) {
		const actionTaskRefs = new Set(action.taskRefs);
		const actionSurfaceRefs = new Set(
			action.applicableStateRefs.map((ref) => statesById.get(ref).ownerRef.slice('ux:surface:'.length)),
		);
		for (const taskRef of actionTaskRefs) {
			const taskActionRefs = useCasesById.get(taskRef).actionRefs;
			if (!Array.isArray(taskActionRefs) || !taskActionRefs.includes(action.id))
				fail(`action ${action.id} task ${taskRef} does not list the action in actionRefs`);
		}
		const linkedActionRefs = [];
		if (action.cancellation.actionRef !== undefined) {
			reference(action.cancellation.actionRef, actions.ids, `action ${action.id}.cancellation.actionRef`);
			linkedActionRefs.push({
				actionRef: action.cancellation.actionRef,
				label: `action ${action.id}.cancellation.actionRef`,
			});
		}
		for (const ref of action.recoveryRefs) {
			const recovery = recoveryById.get(ref);
			references(recovery.actionRefs, actions.ids, `action ${action.id} recovery ${recovery.id}.actionRefs`);
			linkedActionRefs.push(
				...recovery.actionRefs.map((actionRef) => ({
					actionRef,
					label: `action ${action.id} recovery ${recovery.id}.actionRefs`,
				})),
			);
		}
		for (const linked of linkedActionRefs) {
			if (linked.actionRef === action.id) fail(`${linked.label} cannot reference its owning action`);
			const linkedAction = actionsById.get(linked.actionRef);
			if (!linkedAction.taskRefs.some((taskRef) => actionTaskRefs.has(taskRef)))
				fail(`${linked.label} must share a task with action ${action.id}`);
			if (
				!linkedAction.applicableStateRefs.some((ref) =>
					actionSurfaceRefs.has(statesById.get(ref).ownerRef.slice('ux:surface:'.length)),
				)
			)
				fail(`${linked.label} must share a surface with action ${action.id}`);
			if (isResolved(action.status) && !isResolved(linkedAction.status))
				fail(`${linked.label} from a resolved action must reference a resolved action`);
		}
		if (action.patternBasis.researchRef !== undefined) {
			const research = researchById.get(action.patternBasis.researchRef);
			if (!research.actionRefs.includes(action.id))
				fail(`action ${action.id}.patternBasis research must list the action in actionRefs`);
		}
	}

	for (const useCase of useCases.result) {
		const useCaseLabel = `use case ${useCase.id}`;
		allowedKeys(
			useCase,
			[
				'id',
				'name',
				'featureRef',
				'goal',
				'taskPriority',
				'status',
				'trigger',
				'preconditions',
				'actionRefs',
				'entryNodeRef',
				'outcome',
				'questionRefs',
			],
			useCaseLabel,
		);
		text(useCase.name, `use case ${useCase.id}.name`);
		text(useCase.goal, `use case ${useCase.id}.goal`);
		text(useCase.trigger, `use case ${useCase.id}.trigger`);
		text(useCase.outcome, `use case ${useCase.id}.outcome`);
		choice(useCase.taskPriority, taskPriorities, `use case ${useCase.id}.taskPriority`);
		status(useCase.status, `use case ${useCase.id}`);
		reference(useCase.featureRef, features.ids, `use case ${useCase.id}.featureRef`);
		if (!features.result.find((feature) => feature.id === useCase.featureRef).useCaseRefs.includes(useCase.id))
			fail(`use case ${useCase.id} is not listed by feature ${useCase.featureRef}.useCaseRefs`);
		textList(useCase.preconditions, `use case ${useCase.id}.preconditions`);
		const actionRefs = uniqueTextList(useCase.actionRefs, `use case ${useCase.id}.actionRefs`);
		references(actionRefs, actions.ids, `use case ${useCase.id}.actionRefs`);
		if (actionRefs.length === 0) fail(`use case ${useCase.id}.actionRefs must not be empty`);
		for (const actionRef of actionRefs) {
			const action = actionsById.get(actionRef);
			if (!action.taskRefs.includes(useCase.id))
				fail(`use case ${useCase.id} action ${actionRef} does not trace back to the task`);
			if (isResolved(useCase.status) && !isResolved(action.status))
				fail(`resolved use case ${useCase.id} references unresolved action ${actionRef}`);
		}
		references(useCase.questionRefs, questions.ids, `use case ${useCase.id}.questionRefs`);
		reference(useCase.entryNodeRef, flowNodes.ids, `${useCaseLabel}.entryNodeRef`);
		if (flowNodeById.get(useCase.entryNodeRef).ownerRef !== `ux:use-case:${useCase.id}`)
			fail(`${useCaseLabel}.entryNodeRef has another owner`);
	}
	if (!useCases.result.some((useCase) => useCase.taskPriority === 'primary'))
		fail('useCases must include at least one primary task');

	object(spec.productModelBinding, 'productModelBinding');
	allowedKeys(
		spec.productModelBinding,
		['id', 'revision', 'sha256', 'materialSha256', 'recordIndexSha256'],
		'productModelBinding',
	);
	text(spec.productModelBinding.id, 'productModelBinding.id');
	positiveInteger(spec.productModelBinding.revision, 'productModelBinding.revision');
	for (const key of ['sha256', 'materialSha256', 'recordIndexSha256']) {
		if (!/^[a-f0-9]{64}$/.test(spec.productModelBinding[key]))
			fail(`productModelBinding.${key} must be a SHA-256 digest`);
	}
	const uxRefs = new Set();
	const catalogs = {
		feature: features,
		'use-case': useCases,
		surface: surfaces,
		component: components,
		action: actions,
		frame: frames,
		state: states,
		feedback,
		recovery: recoveries,
		'flow-node': flowNodes,
		'flow-edge': flowEdges,
		question: questions,
	};
	for (const [kind, catalog] of Object.entries(catalogs)) {
		for (const id of catalog.ids) uxRefs.add(`ux:${kind}:${id}`);
	}
	for (const item of states.result) {
		const label = `state ${item.id}`;
		allowedKeys(item, ['id', 'ownerRef', 'name', 'meaning', 'status', 'sourceRefs'], label);
		if (!/^ux:(surface|component):/.test(item.ownerRef) || !uxRefs.has(item.ownerRef))
			fail(`${label}.ownerRef must identify a surface or component`);
		text(item.name, `${label}.name`);
		text(item.meaning, `${label}.meaning`);
		status(item.status, label);
		references(uniqueTextList(item.sourceRefs, `${label}.sourceRefs`), sources.ids, `${label}.sourceRefs`);
		const ownerId = item.ownerRef.slice(item.ownerRef.lastIndexOf(':') + 1);
		const owner = item.ownerRef.startsWith('ux:surface:') ? surfacesById.get(ownerId) : componentsById.get(ownerId);
		if (!owner.stateRefs.includes(item.id)) fail(`${label} is not listed by its owner`);
	}
	for (const item of feedback.result) {
		const label = `feedback ${item.id}`;
		allowedKeys(item, ['id', 'actionRef', 'phase', 'description', 'persistence', 'status', 'sourceRefs'], label);
		reference(item.actionRef, actions.ids, `${label}.actionRef`);
		choice(item.phase, feedbackPhases, `${label}.phase`);
		text(item.description, `${label}.description`);
		choice(item.persistence, persistenceModes, `${label}.persistence`);
		status(item.status, label);
		references(uniqueTextList(item.sourceRefs, `${label}.sourceRefs`), sources.ids, `${label}.sourceRefs`);
		if (!actionsById.get(item.actionRef).feedbackRefs.includes(item.id))
			fail(`${label} is not listed by its action`);
	}
	for (const item of recoveries.result) {
		const label = `recovery ${item.id}`;
		allowedKeys(
			item,
			['id', 'ownerRef', 'condition', 'response', 'actionRefs', 'returnNodeRef', 'status', 'sourceRefs'],
			label,
		);
		if (!/^ux:action:/.test(item.ownerRef) || !uxRefs.has(item.ownerRef))
			fail(`${label}.ownerRef must identify an action`);
		text(item.condition, `${label}.condition`);
		text(item.response, `${label}.response`);
		references(uniqueTextList(item.actionRefs, `${label}.actionRefs`), actions.ids, `${label}.actionRefs`);
		reference(item.returnNodeRef, flowNodes.ids, `${label}.returnNodeRef`);
		const returnOwner = flowNodeById.get(item.returnNodeRef).ownerRef;
		const ownerAction = actionsById.get(item.ownerRef.slice('ux:action:'.length));
		if (
			!returnOwner.startsWith('ux:use-case:') ||
			!ownerAction.taskRefs.includes(returnOwner.slice('ux:use-case:'.length))
		) {
			fail(`${label}.returnNodeRef must return to one of the owning action's use cases`);
		}
		status(item.status, label);
		references(uniqueTextList(item.sourceRefs, `${label}.sourceRefs`), sources.ids, `${label}.sourceRefs`);
	}
	for (const item of flowNodes.result) {
		const label = `flow node ${item.id}`;
		allowedKeys(
			item,
			[
				'id',
				'kind',
				'ownerRef',
				'status',
				'sourceRefs',
				'questionRefs',
				'actor',
				'action',
				'actionRef',
				'targetRef',
				'response',
				'prompt',
				'componentRef',
				'statement',
				'frameRef',
			],
			label,
		);
		choice(item.kind, new Set(['step', 'decision', 'alternative', 'component-behavior']), `${label}.kind`);
		const ownerKind = item.kind === 'component-behavior' ? 'component' : 'use-case';
		if (!item.ownerRef.startsWith(`ux:${ownerKind}:`) || !uxRefs.has(item.ownerRef))
			fail(`${label}.ownerRef must identify a ${ownerKind}`);
		status(item.status, label);
		references(uniqueTextList(item.sourceRefs, `${label}.sourceRefs`), sources.ids, `${label}.sourceRefs`);
		references(uniqueTextList(item.questionRefs, `${label}.questionRefs`), questions.ids, `${label}.questionRefs`);
		if (item.kind === 'step') {
			text(item.actor, `${label}.actor`);
			text(item.action, `${label}.action`);
			reference(item.actionRef, actions.ids, `${label}.actionRef`);
			text(item.response, `${label}.response`);
			if (!actionsById.get(item.actionRef).taskRefs.includes(item.ownerRef.slice('ux:use-case:'.length)))
				fail(`${label}.actionRef must belong to its use case`);
		} else if (item.kind === 'decision') text(item.prompt, `${label}.prompt`);
		else if (item.kind === 'alternative') {
			text(item.prompt, `${label}.prompt`);
			text(item.response, `${label}.response`);
		} else {
			reference(item.componentRef, components.ids, `${label}.componentRef`);
			text(item.statement, `${label}.statement`);
		}
		if (item.frameRef !== undefined) reference(item.frameRef, frames.ids, `${label}.frameRef`);
		if (item.targetRef !== undefined && !uxRefs.has(item.targetRef)) fail(`${label}.targetRef is missing`);
		if (item.kind === 'step' && /^ux:(surface|component):/.test(item.targetRef ?? '')) {
			const targetId = item.targetRef.slice(item.targetRef.lastIndexOf(':') + 1);
			const targetSurfaces = item.targetRef.startsWith('ux:surface:')
				? [targetId]
				: componentsById.get(targetId).surfaceRefs;
			const actionSurfaces = actionsById
				.get(item.actionRef)
				.applicableStateRefs.map((ref) => statesById.get(ref).ownerRef.slice('ux:surface:'.length));
			if (!targetSurfaces.some((ref) => actionSurfaces.includes(ref)))
				fail(`${label}.targetRef does not share a surface with action ${item.actionRef}`);
		}
	}
	for (const component of components.result) {
		for (const ref of component.behaviorNodeRefs)
			if (flowNodeById.get(ref).ownerRef !== `ux:component:${component.id}`)
				fail(`component ${component.id} behavior node ${ref} has another owner`);
		if (
			component.entryBehaviorNodeRef !== undefined &&
			!component.behaviorNodeRefs.includes(component.entryBehaviorNodeRef)
		)
			fail(`component ${component.id}.entryBehaviorNodeRef must belong to its behavior nodes`);
	}
	const outgoing = new Map();
	for (const item of flowEdges.result) {
		const label = `flow edge ${item.id}`;
		allowedKeys(item, ['id', 'fromRef', 'toRef', 'kind', 'status', 'sourceRefs', 'order', 'condition'], label);
		reference(item.fromRef, flowNodes.ids, `${label}.fromRef`);
		if (!uxRefs.has(item.toRef)) fail(`${label}.toRef is missing`);
		choice(
			item.kind,
			new Set(['next', 'branches-to', 'recovers-to', 'invokes', 'enters-state', 'emits-feedback']),
			`${label}.kind`,
		);
		const targetKind =
			item.kind === 'enters-state'
				? 'ux:state:'
				: item.kind === 'emits-feedback'
					? 'ux:feedback:'
					: item.kind === 'recovers-to'
						? 'ux:recovery:'
						: 'ux:flow-node:';
		if (!item.toRef.startsWith(targetKind)) fail(`${label}.toRef must identify ${targetKind}`);
		status(item.status, label);
		references(uniqueTextList(item.sourceRefs, `${label}.sourceRefs`), sources.ids, `${label}.sourceRefs`);
		if (item.order !== undefined) positiveInteger(item.order, `${label}.order`);
		if (item.condition !== undefined) text(item.condition, `${label}.condition`);
		const from = flowNodeById.get(item.fromRef);
		if (targetKind === 'ux:flow-node:') {
			const target = flowNodeById.get(item.toRef.slice(targetKind.length));
			if (item.kind !== 'invokes' && from.ownerRef !== target.ownerRef)
				fail(`${label} crosses owners without an invokes relation`);
			if (item.kind === 'invokes' && (from.ownerRef === target.ownerRef || target.kind !== 'component-behavior'))
				fail(`${label} must invoke shared component behavior`);
		}
		if (isResolved(item.status)) {
			const target =
				targetKind === 'ux:flow-node:'
					? flowNodeById.get(item.toRef.slice(targetKind.length))
					: targetKind === 'ux:state:'
						? statesById.get(item.toRef.slice(targetKind.length))
						: targetKind === 'ux:feedback:'
							? feedbackById.get(item.toRef.slice(targetKind.length))
							: recoveryById.get(item.toRef.slice(targetKind.length));
			if (!isResolved(from.status) || !isResolved(target.status)) fail(`${label} has an unresolved endpoint`);
		}
		if (!outgoing.has(item.fromRef)) outgoing.set(item.fromRef, []);
		outgoing.get(item.fromRef).push(item);
	}
	for (const [fromRef, edges] of outgoing) {
		if (edges.filter((edge) => edge.kind === 'next').length > 1)
			fail(`flow node ${fromRef} has ambiguous next edges`);
		const branches = edges.filter((edge) => edge.kind === 'branches-to');
		const orders = branches.map((edge) => edge.order);
		if (
			branches.length > 1 &&
			(orders.some((order) => order === undefined) || new Set(orders).size !== orders.length)
		) {
			fail(`flow node ${fromRef} branches need distinct explicit order`);
		}
	}
	for (const useCase of useCases.result) {
		const owner = `ux:use-case:${useCase.id}`;
		const seen = new Set([useCase.entryNodeRef]);
		const queue = [useCase.entryNodeRef];
		while (queue.length) {
			const current = queue.shift();
			for (const edge of outgoing.get(current) ?? []) {
				if (edge.toRef.startsWith('ux:recovery:')) {
					const target = recoveryById.get(edge.toRef.slice('ux:recovery:'.length)).returnNodeRef;
					if (flowNodeById.get(target).ownerRef === owner && !seen.has(target)) {
						seen.add(target);
						queue.push(target);
					}
					continue;
				}
				if (!edge.toRef.startsWith('ux:flow-node:')) continue;
				const target = edge.toRef.slice('ux:flow-node:'.length);
				if (flowNodeById.get(target).ownerRef !== owner || seen.has(target)) continue;
				seen.add(target);
				queue.push(target);
			}
		}
		for (const node of flowNodes.result.filter((item) => item.ownerRef === owner))
			if (!seen.has(node.id)) fail(`use case ${useCase.id} cannot reach flow node ${node.id}`);
		const reachesEnd = (id, exploring = new Set()) => {
			if (exploring.has(id)) return false;
			const forward = (outgoing.get(id) ?? []).filter((edge) =>
				['next', 'branches-to', 'recovers-to'].includes(edge.kind),
			);
			if (!forward.length) return true;
			const next = new Set(exploring).add(id);
			return forward.some((edge) => {
				const target =
					edge.kind === 'recovers-to'
						? recoveryById.get(edge.toRef.slice('ux:recovery:'.length)).returnNodeRef
						: edge.toRef.slice('ux:flow-node:'.length);
				return reachesEnd(target, next);
			});
		};
		if (!reachesEnd(useCase.entryNodeRef)) fail(`use case ${useCase.id} has no terminating flow path`);
		for (const actionRef of useCase.actionRefs)
			if (!flowNodes.result.some((item) => item.ownerRef === owner && item.actionRef === actionRef))
				fail(`use case ${useCase.id} action ${actionRef} has no flow step`);
	}
	for (const item of useCaseRelations.result) {
		const label = `use case relation ${item.id}`;
		allowedKeys(item, ['id', 'fromUseCaseRef', 'toUseCaseRef', 'kind', 'status', 'sourceRefs'], label);
		reference(item.fromUseCaseRef, useCases.ids, `${label}.fromUseCaseRef`);
		reference(item.toUseCaseRef, useCases.ids, `${label}.toUseCaseRef`);
		if (item.fromUseCaseRef === item.toUseCaseRef) fail(`${label} cannot relate a use case to itself`);
		choice(item.kind, new Set(['precedes', 'depends-on', 'extends', 'shares-behavior-with']), `${label}.kind`);
		status(item.status, label);
		references(uniqueTextList(item.sourceRefs, `${label}.sourceRefs`), sources.ids, `${label}.sourceRefs`);
	}
	for (const item of productRealizations.result) {
		const label = `product realization ${item.id}`;
		allowedKeys(item, ['id', 'productRef', 'uxRef', 'relation', 'status', 'rationale'], label);
		if (!/^product:[^:]+$/.test(item.productRef)) fail(`${label}.productRef must identify a product record`);
		if (!uxRefs.has(item.uxRef)) fail(`${label}.uxRef is missing`);
		choice(item.relation, new Set(['pursues', 'realizes', 'constrains', 'exposes-gap']), `${label}.relation`);
		choice(item.status, new Set(['proposed', 'accepted']), `${label}.status`);
		if (item.status === 'accepted' && item.relation !== 'exposes-gap') {
			const kind = item.uxRef.split(':')[1];
			const id = item.uxRef.slice(item.uxRef.lastIndexOf(':') + 1);
			const catalog = catalogs[kind];
			const target = catalog?.result.find((record) => record.id === id);
			if (!target || !isResolved(target.status)) fail(`${label} has an unresolved UX endpoint`);
		}
		text(item.rationale, `${label}.rationale`);
	}
	for (const item of traceGaps.result) {
		const label = `trace gap ${item.id}`;
		allowedKeys(item, ['id', 'sourceRef', 'expectedTargetKind', 'reason', 'owner', 'explanation'], label);
		if (!item.sourceRef.startsWith('product:') && !uxRefs.has(item.sourceRef))
			fail(`${label}.sourceRef is missing`);
		text(item.expectedTargetKind, `${label}.expectedTargetKind`);
		choice(item.reason, new Set(['unmapped', 'missing-product-decision', 'missing-ux-detail']), `${label}.reason`);
		text(item.owner, `${label}.owner`);
		text(item.explanation, `${label}.explanation`);
	}

	const frameAffordances = new Map();
	for (const frame of frames.result) {
		const label = `interaction frame ${frame.id}`;
		allowedKeys(
			frame,
			[
				'id',
				'name',
				'kind',
				'purpose',
				'status',
				'surfaceRef',
				'stateRef',
				'taskRefs',
				'patternBasis',
				'regions',
				'parentFrameRef',
				'triggerActionRef',
				'focus',
				'questionRefs',
			],
			label,
		);
		text(frame.name, `${label}.name`);
		choice(frame.kind, frameKinds, `${label}.kind`);
		text(frame.purpose, `${label}.purpose`);
		status(frame.status, label);
		reference(frame.surfaceRef, surfaces.ids, `${label}.surfaceRef`);
		const surface = surfacesById.get(frame.surfaceRef);
		if (isResolved(frame.status) && !isResolved(surface.status))
			fail(`${label} cannot be resolved while owning surface ${surface.id} is unresolved`);
		reference(frame.stateRef, states.ids, `${label}.stateRef`);
		if (!surface.stateRefs.includes(frame.stateRef))
			fail(`${label}.stateRef is not declared by surface ${surface.id}`);
		const frameTaskRefs = uniqueTextList(frame.taskRefs, `${label}.taskRefs`);
		references(frameTaskRefs, useCases.ids, `${label}.taskRefs`);
		if (frameTaskRefs.length === 0) fail(`${label}.taskRefs must not be empty`);
		for (const taskRef of frameTaskRefs) {
			if (isResolved(frame.status) && !isResolved(useCasesById.get(taskRef).status))
				fail(`resolved frame ${frame.id} references unresolved task ${taskRef}`);
		}
		validatePatternBasis(frame.patternBasis, `${label}.patternBasis`, frame.status, researchById);
		references(frame.questionRefs, questions.ids, `${label}.questionRefs`);

		const sourceRegionIds = new Set(surface.regions.map((region) => region.id));
		const regions = records(frame.regions, `${label}.regions`);
		if (regions.result.length === 0) fail(`${label}.regions must not be empty`);
		const regionOrders = new Set();
		const contentIds = new Set();
		const affordanceIds = new Set();
		const actionAffordances = new Set();
		const feedbackContent = new Set();
		const semanticContent = new Set();
		for (const region of regions.result) {
			const regionLabel = `${label} region ${region.id}`;
			allowedKeys(
				region,
				['id', 'name', 'kind', 'purpose', 'order', 'priority', 'sourceRegionRef', 'content', 'affordances'],
				regionLabel,
			);
			text(region.name, `${regionLabel}.name`);
			text(region.kind, `${regionLabel}.kind`);
			text(region.purpose, `${regionLabel}.purpose`);
			positiveInteger(region.order, `${regionLabel}.order`);
			if (regionOrders.has(region.order)) fail(`${label}.regions contains duplicate order ${region.order}`);
			regionOrders.add(region.order);
			choice(region.priority, priorities, `${regionLabel}.priority`);
			if (region.sourceRegionRef !== undefined)
				reference(region.sourceRegionRef, sourceRegionIds, `${regionLabel}.sourceRegionRef`);

			const contentRecords = records(region.content, `${regionLabel}.content`);
			for (const content of contentRecords.result) {
				const contentLabel = `${regionLabel} content ${content.id}`;
				allowedKeys(
					content,
					[
						'id',
						'kind',
						'text',
						'purpose',
						'priority',
						'persistence',
						'taskRefs',
						'stateRefs',
						'actionRef',
						'feedbackRef',
						'technicalExplanation',
					],
					contentLabel,
				);
				if (contentIds.has(content.id)) fail(`${label} contains duplicate content id ${content.id}`);
				contentIds.add(content.id);
				choice(content.kind, contentKinds, `${contentLabel}.kind`);
				text(content.text, `${contentLabel}.text`);
				text(content.purpose, `${contentLabel}.purpose`);
				if (content.kind === 'technical-information')
					text(content.technicalExplanation, `${contentLabel}.technicalExplanation`);
				else if (content.technicalExplanation !== undefined)
					fail(`${contentLabel}.technicalExplanation is allowed only for technical-information content`);
				choice(content.priority, priorities, `${contentLabel}.priority`);
				choice(content.persistence, persistenceModes, `${contentLabel}.persistence`);
				const contentTaskRefs = uniqueTextList(content.taskRefs, `${contentLabel}.taskRefs`);
				references(contentTaskRefs, useCases.ids, `${contentLabel}.taskRefs`);
				if (contentTaskRefs.length === 0 || contentTaskRefs.some((taskRef) => !frameTaskRefs.includes(taskRef)))
					fail(`${contentLabel}.taskRefs must trace to this frame's tasks`);
				const stateRefs = uniqueTextList(content.stateRefs, `${contentLabel}.stateRefs`);
				for (const stateRef of stateRefs)
					if (!surface.stateRefs.includes(stateRef))
						fail(`${contentLabel}.stateRefs references missing surface state ${stateRef}`);
				if (!stateRefs.includes(frame.stateRef))
					fail(`${contentLabel}.stateRefs must include frame state ${frame.stateRef}`);
				if (content.kind === 'feedback') {
					reference(content.actionRef, actions.ids, `${contentLabel}.actionRef`);
					const feedbackAction = actionsById.get(content.actionRef);
					if (!feedbackAction.taskRefs.some((taskRef) => contentTaskRefs.includes(taskRef)))
						fail(`${contentLabel}.actionRef does not trace to a content task`);
					if (!feedbackAction.applicableStateRefs.some((ref) => surface.stateRefs.includes(ref)))
						fail(`${contentLabel}.actionRef does not belong to frame surface ${frame.surfaceRef}`);
					if (isResolved(frame.status) && !isResolved(feedbackAction.status))
						fail(`${contentLabel}.actionRef must be resolved in a resolved frame`);
					const ownedFeedback = feedbackById.get(content.feedbackRef);
					if (!ownedFeedback)
						fail(`${contentLabel}.feedbackRef references missing id ${content.feedbackRef}`);
					if (ownedFeedback.actionRef !== content.actionRef)
						fail(`${contentLabel}.feedbackRef is not owned by action ${content.actionRef}`);
					const feedbackKey = `${content.actionRef}:${content.feedbackRef}`;
					if (feedbackContent.has(feedbackKey)) fail(`${label} contains duplicate feedback ${feedbackKey}`);
					feedbackContent.add(feedbackKey);
				} else if (content.actionRef !== undefined || content.feedbackRef !== undefined) {
					fail(`${contentLabel} may reference action feedback only when kind is feedback`);
				}
				const contentSignature = JSON.stringify({
					kind: content.kind,
					text: content.text.trim().toLocaleLowerCase('en-US'),
					taskRefs: [...contentTaskRefs].sort(),
					stateRefs: [...stateRefs].sort(),
					actionRef: content.actionRef ?? null,
					feedbackRef: content.feedbackRef ?? null,
				});
				if (semanticContent.has(contentSignature))
					fail(`${label} contains duplicate semantic content ${content.text}`);
				semanticContent.add(contentSignature);
			}

			const affordances = records(region.affordances, `${regionLabel}.affordances`);
			const affordanceOrders = new Set();
			for (const affordance of affordances.result) {
				const affordanceLabel = `${regionLabel} affordance ${affordance.id}`;
				allowedKeys(
					affordance,
					['id', 'actionRef', 'label', 'status', 'order', 'interaction', 'transition'],
					affordanceLabel,
				);
				if (affordanceIds.has(affordance.id))
					fail(`${label} contains duplicate affordance id ${affordance.id}`);
				affordanceIds.add(affordance.id);
				if (alternateInputIds.has(affordance.actionRef))
					fail(`${affordanceLabel} cannot expose an alternate input as a visible control`);
				reference(affordance.actionRef, actions.ids, `${affordanceLabel}.actionRef`);
				if (actionAffordances.has(affordance.actionRef))
					fail(`${label} contains duplicate affordance for action ${affordance.actionRef}`);
				actionAffordances.add(affordance.actionRef);
				text(affordance.label, `${affordanceLabel}.label`);
				status(affordance.status, affordanceLabel);
				positiveInteger(affordance.order, `${affordanceLabel}.order`);
				if (affordanceOrders.has(affordance.order))
					fail(`${regionLabel}.affordances contains duplicate order ${affordance.order}`);
				affordanceOrders.add(affordance.order);
				if (affordance.interaction !== 'canonical')
					fail(`${affordanceLabel}.interaction must be canonical; alternate inputs are not visible controls`);
				const action = actionsById.get(affordance.actionRef);
				if (!action.taskRefs.some((taskRef) => frame.taskRefs.includes(taskRef)))
					fail(`${affordanceLabel} action does not trace to a frame task`);
				if (!action.applicableStateRefs.includes(frame.stateRef))
					fail(`${affordanceLabel} action is not applicable to frame state ${frame.stateRef}`);
				if (isResolved(frame.status) && (!isResolved(affordance.status) || !isResolved(action.status)))
					fail(`resolved frame ${frame.id} contains unresolved affordance or action ${affordance.actionRef}`);
				object(affordance.transition, `${affordanceLabel}.transition`);
				allowedKeys(
					affordance.transition,
					['kind', 'targetRef', 'targetState'],
					`${affordanceLabel}.transition`,
				);
				choice(affordance.transition.kind, transitionKinds, `${affordanceLabel}.transition.kind`);
				frameAffordances.set(`${frame.id}:${affordance.id}`, affordance);
			}
		}

		object(frame.focus, `${label}.focus`);
		allowedKeys(frame.focus, ['entry', 'orderRefs', 'returnActionRef'], `${label}.focus`);
		text(frame.focus.entry, `${label}.focus.entry`);
		const focusOrder = uniqueTextList(frame.focus.orderRefs, `${label}.focus.orderRefs`);
		for (const affordanceRef of focusOrder) reference(affordanceRef, affordanceIds, `${label}.focus.orderRefs`);
		if (isResolved(frame.status)) exactSet(focusOrder, [...affordanceIds], `${label}.focus.orderRefs`);
		if (frame.focus.returnActionRef !== undefined)
			reference(frame.focus.returnActionRef, actions.ids, `${label}.focus.returnActionRef`);
	}

	for (const frame of frames.result) {
		const label = `interaction frame ${frame.id}`;
		const surface = surfacesById.get(frame.surfaceRef);
		if (!surface.interactionFrameRefs.includes(frame.id))
			fail(`${label} is not listed by owning surface ${surface.id}.interactionFrameRefs`);
		if (frame.patternBasis.researchRef !== undefined) {
			const research = researchById.get(frame.patternBasis.researchRef);
			if (!research.frameRefs.includes(frame.id))
				fail(`${label}.patternBasis research must list the frame in frameRefs`);
		}
		if (['dialog', 'menu', 'popover'].includes(frame.kind)) {
			reference(frame.parentFrameRef, frames.ids, `${label}.parentFrameRef`);
			reference(frame.triggerActionRef, actions.ids, `${label}.triggerActionRef`);
			const parent = framesById.get(frame.parentFrameRef);
			if (parent.surfaceRef !== frame.surfaceRef)
				fail(`${label}.parentFrameRef must use the same owning surface`);
			const triggerVisible = [...frameAffordances.entries()].some(
				([key, affordance]) =>
					key.startsWith(`${parent.id}:`) && affordance.actionRef === frame.triggerActionRef,
			);
			if (!triggerVisible) fail(`${label}.triggerActionRef must be an affordance in parent frame ${parent.id}`);
			if (frame.focus.returnActionRef !== frame.triggerActionRef)
				fail(`${label}.focus.returnActionRef must return to the trigger action`);
		} else if (frame.parentFrameRef !== undefined || frame.triggerActionRef !== undefined) {
			fail(`${label} may declare parentFrameRef and triggerActionRef only for a dialog, menu, or popover`);
		}

		for (const region of frame.regions) {
			for (const affordance of region.affordances) {
				const transition = affordance.transition;
				const transitionLabel = `${label} affordance ${affordance.id}.transition`;
				if (transition.kind === 'none' || transition.kind === 'completion') {
					if (transition.targetRef !== undefined || transition.targetState !== undefined)
						fail(`${transitionLabel} ${transition.kind} transition cannot have a target`);
				} else if (transition.kind === 'state') {
					if (transition.targetRef !== undefined)
						fail(`${transitionLabel} state transition cannot have targetRef`);
					text(transition.targetState, `${transitionLabel}.targetState`);
					if (!surface.stateRefs.includes(transition.targetState))
						fail(`${transitionLabel}.targetState references missing state ${transition.targetState}`);
					if (isResolved(frame.status)) {
						const targetFrames = frames.result.filter(
							(candidate) =>
								candidate.kind === 'surface' &&
								candidate.surfaceRef === frame.surfaceRef &&
								candidate.stateRef === transition.targetState &&
								isResolved(candidate.status),
						);
						if (targetFrames.length !== 1)
							fail(`${transitionLabel}.targetState must resolve to exactly one accepted surface frame`);
					}
				} else if (transition.kind === 'frame') {
					if (transition.targetState !== undefined)
						fail(`${transitionLabel} frame transition cannot have targetState`);
					reference(transition.targetRef, frames.ids, `${transitionLabel}.targetRef`);
					const target = framesById.get(transition.targetRef);
					if (target.surfaceRef !== frame.surfaceRef)
						fail(`${transitionLabel}.targetRef must use the same owning surface`);
					if (isResolved(frame.status) && !isResolved(target.status))
						fail(`${transitionLabel} from a resolved frame cannot target an unresolved frame`);
				} else {
					reference(transition.targetRef, surfaces.ids, `${transitionLabel}.targetRef`);
					const target = surfacesById.get(transition.targetRef);
					text(transition.targetState, `${transitionLabel}.targetState`);
					if (!target.stateRefs.includes(transition.targetState))
						fail(`${transitionLabel}.targetState references missing state ${transition.targetState}`);
					if (isResolved(frame.status) && !isResolved(target.status))
						fail(`${transitionLabel} from a resolved frame cannot target an unresolved surface`);
					if (isResolved(frame.status)) {
						const targetFrames = frames.result.filter(
							(candidate) =>
								candidate.kind === 'surface' &&
								candidate.surfaceRef === target.id &&
								candidate.stateRef === transition.targetState &&
								isResolved(candidate.status),
						);
						if (targetFrames.length !== 1)
							fail(`${transitionLabel}.targetState must resolve to exactly one accepted surface frame`);
					}
				}
			}
		}
	}

	for (const surface of surfaces.result) {
		for (const frameRef of surface.interactionFrameRefs) {
			const frame = framesById.get(frameRef);
			if (frame.surfaceRef !== surface.id)
				fail(
					`surface ${surface.id}.interactionFrameRefs includes frame ${frameRef} owned by ${frame.surfaceRef}`,
				);
			if (isResolved(surface.status) && !isResolved(frame.status))
				fail(`resolved surface ${surface.id} references unresolved frame ${frameRef}`);
		}
		if (isResolved(surface.status)) {
			for (const surfaceState of surface.stateRefs) {
				const stateFrames = surface.interactionFrameRefs
					.map((frameRef) => framesById.get(frameRef))
					.filter(
						(frame) =>
							frame.kind === 'surface' && frame.stateRef === surfaceState && isResolved(frame.status),
					);
				if (stateFrames.length !== 1)
					fail(
						`resolved surface ${surface.id} state ${surfaceState} must have exactly one accepted surface frame`,
					);
			}
		}
	}

	for (const action of actions.result) {
		if (!isResolved(action.status)) continue;
		for (const applicable of action.applicableStateRefs) {
			const visible = frames.result.some(
				(frame) =>
					isResolved(frame.status) &&
					frame.stateRef === applicable &&
					frame.regions.some((region) =>
						region.affordances.some((affordance) => affordance.actionRef === action.id),
					),
			);
			if (!visible)
				fail(
					`resolved action ${action.id} has no accepted affordance for ${applicable.surfaceRef}:${applicable.state}`,
				);
		}
	}

	for (const research of researchRecords.result) {
		for (const actionRef of research.actionRefs) {
			if (actionsById.get(actionRef).patternBasis.researchRef !== research.id)
				fail(
					`pattern research ${research.id} action ${actionRef} does not trace back through patternBasis.researchRef`,
				);
		}
		for (const frameRef of research.frameRefs) {
			if (framesById.get(frameRef).patternBasis.researchRef !== research.id)
				fail(
					`pattern research ${research.id} frame ${frameRef} does not trace back through patternBasis.researchRef`,
				);
		}
	}

	for (const feature of features.result) {
		const featureTaskRefs = new Set(feature.useCaseRefs);
		const usedSurfaceRefs = new Set();
		for (const action of actions.result) {
			if (action.taskRefs.some((taskRef) => featureTaskRefs.has(taskRef))) {
				for (const applicable of action.applicableStateRefs)
					usedSurfaceRefs.add(statesById.get(applicable).ownerRef.slice('ux:surface:'.length));
			}
		}
		for (const frame of frames.result) {
			if (frame.taskRefs.some((taskRef) => featureTaskRefs.has(taskRef))) usedSurfaceRefs.add(frame.surfaceRef);
		}
		for (const surfaceRef of usedSurfaceRefs) {
			if (!feature.surfaceRefs.includes(surfaceRef))
				fail(`feature ${feature.id} omits task surface ${surfaceRef} from surfaceRefs`);
		}
	}

	object(spec.pruningReview, 'pruningReview');
	allowedKeys(spec.pruningReview, ['status', 'summary', 'taskReviews'], 'pruningReview');
	status(spec.pruningReview.status, 'pruningReview');
	text(spec.pruningReview.summary, 'pruningReview.summary');
	const taskReviews = records(spec.pruningReview.taskReviews, 'pruningReview.taskReviews');
	const reviewsByTask = new Map();
	for (const review of taskReviews.result) {
		const label = `pruning review ${review.id}`;
		allowedKeys(review, ['id', 'taskRef', 'status', 'canonicalStepRefs', 'reviewedActionRefs', 'decisions'], label);
		reference(review.taskRef, useCases.ids, `${label}.taskRef`);
		if (reviewsByTask.has(review.taskRef))
			fail(`pruningReview contains duplicate review for task ${review.taskRef}`);
		reviewsByTask.set(review.taskRef, review);
		status(review.status, label);
		const task = useCasesById.get(review.taskRef);
		const canonicalStepRefs = uniqueTextList(review.canonicalStepRefs, `${label}.canonicalStepRefs`);
		references(canonicalStepRefs, flowNodes.ids, `${label}.canonicalStepRefs`);
		if (canonicalStepRefs.length === 0) fail(`${label}.canonicalStepRefs must contain a main path`);
		for (const stepRef of canonicalStepRefs) {
			const node = flowNodeById.get(stepRef);
			if (node.kind !== 'step' || node.ownerRef !== `ux:use-case:${task.id}`)
				fail(`${label}.canonicalStepRefs must identify this use case's steps`);
		}
		if (canonicalStepRefs[0] !== task.entryNodeRef) fail(`${label}.canonicalStepRefs must begin at the entry node`);
		for (let index = 1; index < canonicalStepRefs.length; index += 1) {
			const prior = canonicalStepRefs[index - 1];
			if (
				!(outgoing.get(prior) ?? []).some(
					(edge) => edge.kind === 'next' && edge.toRef === `ux:flow-node:${canonicalStepRefs[index]}`,
				)
			) {
				fail(`${label}.canonicalStepRefs must follow next edges`);
			}
		}
		const reviewedActionRefs = uniqueTextList(review.reviewedActionRefs, `${label}.reviewedActionRefs`);
		references(reviewedActionRefs, actions.ids, `${label}.reviewedActionRefs`);
		exactSet(reviewedActionRefs, task.actionRefs, `${label}.reviewedActionRefs`);
		const decisions = records(review.decisions, `${label}.decisions`);
		if (decisions.result.length === 0) fail(`${label}.decisions must record the pruning result`);
		const decidedActionRefs = [];
		for (const decision of decisions.result) {
			const decisionLabel = `${label} decision ${decision.id}`;
			allowedKeys(
				decision,
				['id', 'disposition', 'candidate', 'actionRefs', 'rationale', 'result'],
				decisionLabel,
			);
			choice(decision.disposition, pruningDispositions, `${decisionLabel}.disposition`);
			text(decision.candidate, `${decisionLabel}.candidate`);
			references(decision.actionRefs, actions.ids, `${decisionLabel}.actionRefs`);
			if (decision.actionRefs.some((actionRef) => !task.actionRefs.includes(actionRef)))
				fail(`${decisionLabel}.actionRefs must belong to task ${task.id}`);
			if (decision.disposition === 'remove' && decision.actionRefs.length > 0)
				fail(`${decisionLabel} cannot remove actions that remain in the accepted action catalog`);
			if (
				decision.disposition === 'demote' &&
				decision.actionRefs.some((actionRef) => actionsById.get(actionRef).priority === 'primary')
			)
				fail(`${decisionLabel} demoted actions cannot retain primary priority`);
			if (
				decision.disposition === 'contextualize' &&
				decision.actionRefs.some((actionRef) => actionsById.get(actionRef).visibility.mode === 'always')
			)
				fail(`${decisionLabel} contextualized actions cannot remain always visible`);
			decidedActionRefs.push(...decision.actionRefs);
			text(decision.rationale, `${decisionLabel}.rationale`);
			text(decision.result, `${decisionLabel}.result`);
		}
		exactSet(decidedActionRefs, reviewedActionRefs, `${label}.decisions[].actionRefs`);
	}
	const resolvedPrimaryTasks = useCases.result.filter(
		(useCase) => useCase.taskPriority === 'primary' && isResolved(useCase.status),
	);
	if (resolvedPrimaryTasks.length > 0 && !isResolved(spec.pruningReview.status))
		fail('resolved primary tasks require a resolved pruningReview');
	for (const task of resolvedPrimaryTasks) {
		const review = reviewsByTask.get(task.id);
		if (!review) fail(`primary task ${task.id} needs a pruning review`);
		if (!isResolved(review.status)) fail(`primary task ${task.id} needs a resolved pruning review`);
	}

	for (const question of questions.result) {
		allowedKeys(question, ['id', 'question', 'owner', 'why', 'affects', 'status'], `question ${question.id}`);
		text(question.question, `question ${question.id}.question`);
		text(question.owner, `question ${question.id}.owner`);
		text(question.why, `question ${question.id}.why`);
		if (uniqueTextList(question.affects, `question ${question.id}.affects`).length === 0)
			fail(`question ${question.id}.affects must identify at least one record or field`);
		if (!['open', 'answered'].includes(question.status)) fail(`question ${question.id} has unsupported status`);
	}

	return spec;
}

function byId(recordsToIndex) {
	return new Map(recordsToIndex.map((record) => [record.id, record]));
}

function statusLabel(value) {
	return value[0].toUpperCase() + value.slice(1);
}

/** Render the human-reviewable PRD from the same records used for the UI handoff. */
export function renderPrd(spec) {
	validateUxSpec(spec);
	const areas = byId(spec.application.areas);
	const features = byId(spec.features);
	const surfaces = byId(spec.surfaces);
	const useCases = byId(spec.useCases);
	const components = byId(spec.components);
	const actions = byId(spec.actions);
	const frames = byId(spec.interactionFrames);
	const states = byId(spec.states);
	const flowNodes = byId(spec.flowNodes);
	const questions = byId(spec.openQuestions);
	const lines = [
		`# ${spec.product.name} Product Requirements Document`,
		'',
		`Status: ${statusLabel(spec.status)} UX design, revision ${spec.revision}. Accepted, locked, proposed, and unresolved details are identified below.`,
		'',
		`Assessment: **${spec.assessment.kind}** - ${spec.assessment.description}`,
		'',
		'The human-owned `product-description.md` remains the source of product intent. This generated PRD expands it for review and UI handoff.',
		'',
		`Product orientation: ${spec.product.overview}`,
		'',
		'Intended users:',
		'',
		...spec.product.users.map((user) => `- ${user}`),
		'',
	];

	lines.push(
		'## Application Organization',
		'',
		spec.application.summary,
		'',
		'### Shell And Navigation',
		'',
		`Shell: **${spec.application.shell.kind}** (${spec.application.shell.status}) - ${spec.application.shell.description}`,
		'',
	);
	if (spec.application.shell.navigation) {
		lines.push(
			`Navigation: **${spec.application.shell.navigation.pattern}** - ${spec.application.shell.navigation.description}`,
			'',
		);
	} else {
		lines.push('Navigation: Not specified yet.', '');
	}
	if (spec.application.shell.regions?.length) {
		lines.push('Shell regions, from top to bottom:', '');
		for (const region of [...spec.application.shell.regions].sort((left, right) => left.order - right.order)) {
			lines.push(
				`${region.order}. **${region.name}** (${region.kind}; ${region.persistence}): ${region.purpose}`,
			);
		}
		lines.push('');
	}

	lines.push('### Activity Areas', '');
	for (const area of spec.application.areas) {
		lines.push(`#### ${area.name}`, '', `Status: ${statusLabel(area.status)}.`, '', area.purpose, '');
		if (area.surfaceRefs.length) {
			lines.push('Surfaces:', '');
			for (const ref of area.surfaceRefs)
				lines.push(`- **${surfaces.get(ref).name}:** ${surfaces.get(ref).purpose}`);
			lines.push('');
		}
	}

	lines.push('### Design References', '');
	if (spec.supportingDocuments?.length) {
		for (const document of spec.supportingDocuments) {
			lines.push(
				`- [${escapeMarkdownText(document.label)}](${document.path}) - ${escapeMarkdownText(document.description)}`,
			);
		}
	} else {
		lines.push('No separate design-language document is linked yet.');
	}

	lines.push('', '## Product Capabilities', '');
	for (const feature of spec.features) {
		lines.push(`### ${feature.name}`, '', `Status: ${statusLabel(feature.status)}.`, '', feature.purpose, '');
		if (feature.surfaceRefs.length) {
			lines.push(`Surfaces: ${feature.surfaceRefs.map((ref) => surfaces.get(ref).name).join(', ')}.`, '');
		}
		if (feature.useCaseRefs.length) {
			lines.push(`Workflows: ${feature.useCaseRefs.map((ref) => useCases.get(ref).name).join(', ')}.`, '');
		}
	}

	lines.push('## Work Surfaces', '');
	for (const surface of spec.surfaces) {
		lines.push(
			`### ${surface.name}`,
			'',
			`Application area: ${areas.get(surface.areaRef).name}. Kind: ${surface.kind}. Status: ${statusLabel(surface.status)}.`,
			'',
			surface.purpose,
			'',
			`Entry: ${surface.entry}`,
			'',
			`Exit: ${surface.exit}`,
			'',
			`Focus intent: ${surface.focusIntent}`,
			'',
		);
		if (surface.regions.length) {
			lines.push('Functional regions, in reading and task order:', '');
			for (const region of [...surface.regions].sort((a, b) => a.order - b.order)) {
				const names = region.componentRefs.map((ref) => components.get(ref).name).join(', ');
				lines.push(
					`${region.order}. **${region.name}:** ${region.purpose}${names ? ` Components: ${names}.` : ''}`,
				);
			}
			lines.push('');
		}
		if (surface.stateRefs.length)
			lines.push(`Relevant states: ${surface.stateRefs.map((ref) => states.get(ref).name).join(', ')}.`, '');
		if (surface.interactionFrameRefs.length) {
			lines.push(
				'Interaction frames:',
				'',
				...surface.interactionFrameRefs.map(
					(ref) => `- **${frames.get(ref).name}:** ${states.get(frames.get(ref).stateRef).name}`,
				),
				'',
			);
		}
	}

	lines.push('## Workflows', '');
	for (const useCase of spec.useCases) {
		lines.push(
			`### ${useCase.name}`,
			'',
			`Capability: ${features.get(useCase.featureRef).name}. Task priority: ${useCase.taskPriority}. Status: ${statusLabel(useCase.status)}.`,
			'',
			`Goal: ${useCase.goal}`,
			'',
			`Trigger: ${useCase.trigger}`,
			'',
		);
		if (useCase.preconditions.length) {
			lines.push('Preconditions:', '', ...useCase.preconditions.map((value) => `- ${value}`), '');
		}
		lines.push('Interactions:', '');
		const stepRefs = spec.pruningReview.taskReviews.find((review) => review.taskRef === useCase.id)
			?.canonicalStepRefs ?? [useCase.entryNodeRef];
		for (const [index, ref] of stepRefs.entries()) {
			const step = flowNodes.get(ref);
			if (step?.kind === 'step')
				lines.push(
					`${index + 1}. **${step.actor}:** ${actions.get(step.actionRef).name} - ${step.action} **Visible response:** ${step.response}`,
				);
		}
		lines.push('', `Successful outcome: ${useCase.outcome}`, '');
		const alternatives = spec.flowNodes.filter(
			(node) => node.ownerRef === `ux:use-case:${useCase.id}` && node.kind === 'alternative',
		);
		if (alternatives.length) {
			lines.push('Alternatives and recovery:', '');
			for (const alternative of alternatives)
				lines.push(`- **${alternative.prompt}:** ${alternative.response} (${alternative.status}).`);
			lines.push('');
		}
		if (useCase.questionRefs.length) {
			lines.push(
				'Unresolved details:',
				'',
				...useCase.questionRefs.map(
					(ref) =>
						`- [${ref}](#${ref.toLowerCase()}-${questions
							.get(ref)
							.question.toLowerCase()
							.replace(/[^a-z0-9]+/g, '-')
							.replace(/^-|-$/g, '')})`,
				),
				'',
			);
		}
	}

	lines.push('## Interaction Actions', '');
	for (const action of spec.actions) {
		lines.push(
			`### ${action.name}`,
			'',
			`Status: ${statusLabel(action.status)}. Presentation: ${action.presentationClass}. Priority: ${action.priority}.`,
			'',
			action.purpose,
			'',
			`Canonical interaction: ${action.canonicalInteraction.description} (${action.canonicalInteraction.input}).`,
			'',
			`Observable outcome: ${action.outcome}`,
			'',
			`Visibility: ${action.visibility.mode}${action.visibility.conditions.length ? ` - ${action.visibility.conditions.join(' ')}` : ''}.`,
			'',
		);
		if (action.alternateInputs.length)
			lines.push(
				'Alternate inputs:',
				'',
				...action.alternateInputs.map((input) => `- **${input.input}:** ${input.description}`),
				'',
			);
	}

	lines.push('## Interaction Frames', '');
	for (const frame of spec.interactionFrames) {
		lines.push(
			`### ${frame.name}`,
			'',
			`Surface: ${surfaces.get(frame.surfaceRef).name}. State: ${states.get(frame.stateRef).name}. Kind: ${frame.kind}. Status: ${statusLabel(frame.status)}.`,
			'',
			frame.purpose,
			'',
		);
		for (const region of [...frame.regions].sort((left, right) => left.order - right.order)) {
			lines.push(`#### ${region.name}`, '', `${region.purpose} Information priority: ${region.priority}.`, '');
			for (const content of region.content) lines.push(`- ${content.text}`);
			for (const affordance of [...region.affordances].sort((left, right) => left.order - right.order))
				lines.push(`- **${affordance.label}:** ${actions.get(affordance.actionRef).outcome}`);
			lines.push('');
		}
	}

	if (spec.patternResearch.length) {
		lines.push('## Pattern Research', '');
		for (const research of spec.patternResearch)
			lines.push(
				`### ${research.question}`,
				'',
				`Outcome: ${research.outcome}. Verification: ${research.verification.status}.`,
				'',
				research.selection.summary,
				'',
				`Evidence limits: ${research.limits.join(' ')}`,
				'',
			);
	}

	lines.push('## Interaction Pruning', '', spec.pruningReview.summary, '');
	for (const review of spec.pruningReview.taskReviews) {
		lines.push(`### ${useCases.get(review.taskRef).name}`, '');
		for (const decision of review.decisions)
			lines.push(`- **${decision.disposition}:** ${decision.result} ${decision.rationale}`);
		lines.push('');
	}

	lines.push('## Component Behavior', '');
	for (const component of spec.components) {
		lines.push(
			`### ${component.name}`,
			'',
			`Kind: ${component.kind}. Status: ${statusLabel(component.status)}.`,
			'',
			component.purpose,
			'',
			'Required capabilities:',
			'',
			...component.capabilities.map((value) => `- ${value}`),
			'',
			'Behavior:',
			'',
			...component.behaviorNodeRefs.map((ref) => `- ${flowNodes.get(ref).statement}`),
			'',
			`Relevant states: ${component.stateRefs.map((ref) => states.get(ref).name).join(', ')}.`,
			'',
		);
	}

	lines.push('## Open Questions', '');
	const open = spec.openQuestions.filter((question) => question.status === 'open');
	if (!open.length) lines.push('No open questions are recorded for this scope.', '');
	for (const question of open) {
		lines.push(
			`### ${question.id}: ${question.question}`,
			'',
			`Owner: ${question.owner}.`,
			'',
			question.why,
			'',
			`Affects: ${question.affects.join(', ')}.`,
			'',
		);
	}
	return `${lines.join('\n').trim()}\n`;
}

/** Persist a canonical UX handoff. Static HTML is the maintained PRD output. */
export function writeUxArtifacts(inputPath, outputDirectory, options = {}) {
	const spec = validateUxSpec(JSON.parse(fs.readFileSync(inputPath, 'utf8')));
	const sourcePath = writeOwnedJsonArtifact({
		productDocumentRoot: outputDirectory,
		relativeTarget: ROOT_BOUND_TARGETS.ux,
		value: spec,
		validateExisting(existing) {
			validateUxSpec(existing);
			if (existing.id !== spec.id)
				fail(`Existing UX artifact id ${existing.id} does not match incoming id ${spec.id}`);
		},
		beforeWrite: (target) => guardDesignLocks(target, spec, options),
		label: 'UX artifact',
	});
	return {sourcePath, revision: spec.revision};
}

function cli(argumentsToParse) {
	const options = new Map();
	for (let index = 0; index < argumentsToParse.length; index += 2)
		options.set(argumentsToParse[index], argumentsToParse[index + 1]);
	const input = options.get('--input');
	const output = options.get('--output-dir');
	if (!input || !output)
		fail(
			'Usage: node ux-design.mjs --input <ux-spec.json> --output-dir <product-doc-folder> [--lock-reason <current-user-request>] [--locked-change-reason <current-user-request>]',
		);
	const result = writeUxArtifacts(path.resolve(input), path.resolve(output), {
		lockReason: options.get('--lock-reason'),
		lockedChangeReason: options.get('--locked-change-reason'),
	});
	process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli(process.argv.slice(2));
