import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {InputContract} from './InputContract.mjs';

const text = {type: 'string'};
const object = {type: 'object'};
const list = {type: 'array', items: text};
const stage = {type: 'string', enum: ['ux', 'ui']};

/** Curated adapters around existing validators, stores and publication engines. */
export class DomainOperations {
	/** Creates the closed operation catalog; implementations load only when needed. */
	constructor() {
		this.operations = {};
		this.sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
		this.codexRoot = path.resolve(process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex'));
		this._registerData();
		this._registerDesign();
		this._registerPublication();
		this._registerStandards();
		this._registerProject();
	}

	/** Adds one maintained operation with a closed argument shape.
	 * @param {string} name - Public operation name.
	 * @param {string} description - Domain purpose.
	 * @param {object} properties - Declared argument schemas.
	 * @param {string[]} required - Required argument names.
	 * @param {boolean} assignable - Whether a specialist may receive it.
	 * @param {boolean} writes - Whether it writes workspace state.
	 * @param {Function} execute - Existing-library adapter.
	 * @returns {void}
	 */
	_add(name, description, properties, required, assignable, writes, execute) {
		this.operations[name] = {
			description,
			inputSchema: {type: 'object', properties, required, additionalProperties: false},
			assignable,
			writes,
			execute,
		};
	}

	/** Loads a known repository module; callers cannot select a module or export.
	 * @param {string} relative - Literal source path selected in this class.
	 * @returns {Promise<object>} - Reused module namespace.
	 */
	_module(relative) {
		return import(new URL(`../../${relative}`, import.meta.url));
	}

	/** Resolves an existing domain options object with an explicit path-field allowlist.
	 * @param {object} options - Current function options.
	 * @param {string[]} fields - Path fields understood by the domain function.
	 * @param {WorkflowOperationContext} context - Authorized workspace.
	 * @returns {object} - Confined options.
	 */
	_paths(options, fields, context) {
		return Object.fromEntries(
			Object.entries(options).map(([key, value]) => [
				key,
				fields.includes(key) && value !== undefined ? context.files.resolve(value) : value,
			]),
		);
	}

	/** Writes an exact JSON argument to a content-addressed input file for file-based validators.
	 * @param {WorkflowJson} value - Already decoded input or server-bound result.
	 * @param {WorkflowOperationContext} context - Run owner.
	 * @returns {string} - Stable scratch path.
	 */
	_jsonFile(value, context) {
		const bytes = JSON.stringify(value);
		return context.files.write(
			path.join(context.run.directory, 'inputs', `${context.files.hash(bytes)}.json`),
			bytes,
		);
	}

	/** Resolves an assigned authoring store and prevents a specialist changing stages or record ownership.
	 * @param {object} input - Stage and optional delivered records.
	 * @param {WorkflowOperationContext} context - Caller authority.
	 * @returns {string} - Server-owned store.
	 */
	_store(input, context) {
		if (!context.owner) {
			if (context.scope.stage !== input.stage || !Array.isArray(context.scope.recordRefs))
				throw new Error('Stage and recordRefs must be assigned');
			for (const record of input.records ?? [])
				if (!context.scope.recordRefs.includes(`${record.kind}:${record.id}`))
					throw new Error('Record is outside the assignment');
			for (const ref of input.references ?? [])
				if (!context.scope.recordRefs.includes(ref)) throw new Error('Reference is outside the assignment');
			if (input.references === undefined && !input.records)
				throw new Error('Select assigned references explicitly');
		}
		return context.files.resolve(path.join(context.run.directory, 'units', input.stage));
	}

	/** Registers exact input delivery and human-owned text editing.
	 * @returns {void}
	 */
	_registerData() {
		this._add(
			'result.store',
			'Submission permission used by workflow_store; call that tool directly.',
			{},
			[],
			true,
			true,
			() => {
				throw new Error('Use workflow_store');
			},
		);
		this._add(
			'files.read',
			'Read assigned UTF-8 files once into a result handle.',
			{paths: list},
			['paths'],
			true,
			false,
			(input, context) =>
				input.paths.map((location) => {
					const file = context.inputPath(location);
					const text = context.files.read(file);
					return {path: file, sha256: context.files.hash(text), text};
				}),
		);
		this._add(
			'files.edit',
			'Parent-owned exact text replacement for descriptions, linked detail and standards; requires the observed file digest.',
			{path: text, sha256: text, before: text, after: text},
			['path', 'sha256', 'before', 'after'],
			false,
			true,
			(input, context) => {
				const before = context.files.read(input.path);
				if (context.files.hash(before) !== input.sha256)
					throw new Error('File changed; read current bytes before editing');
				if (!input.before || before.split(input.before).length !== 2)
					throw new Error('Replacement must identify one exact occurrence');
				const after = before.replace(input.before, () => input.after);
				return {path: context.files.write(input.path, after), sha256: context.files.hash(after)};
			},
		);
	}

	/** Registers current-model preparation, reusable units, exact review binding and persistence.
	 * @returns {void}
	 */
	_registerDesign() {
		this._add(
			'product.location',
			'Resolve the existing named product location contract.',
			{productName: text},
			['productName'],
			false,
			false,
			async (input, context) =>
				(await this._module('skills/refine-design/scripts/product-location.mjs')).resolveProductLocation({
					...input,
					repositoryRoot: context.files.root,
				}),
		);
		this._add(
			'ux.persist',
			'Write accepted current UX using existing ownership and design-lock checks.',
			{document: object, outputDirectory: text, options: object},
			['document', 'outputDirectory'],
			false,
			true,
			async (input, context) => {
				const {writeUxArtifacts} = await this._module('skills/refine-design/scripts/ux-design.mjs');
				return writeUxArtifacts(
					this._jsonFile(input.document, context),
					context.files.resolve(input.outputDirectory),
					input.options ?? {},
				);
			},
		);
		this._add(
			'design.apply',
			'Apply a current design-language proposal and generate its owned specimens.',
			{proposal: object, baseFolder: text, options: object},
			['proposal', 'baseFolder'],
			false,
			true,
			async (input, context) => {
				const {applyProposal} = await this._module('skills/refine-design/scripts/design-language.mjs');
				return applyProposal(
					context.files.resolve(input.baseFolder),
					input.proposal,
					this._paths(input.options ?? {}, ['formatterBase', 'sourceRoot', 'assetRoot'], context),
				);
			},
		);
		for (const kind of ['ui', 'component'])
			this._add(
				`${kind}.persist`,
				'Persist current visual design only with matching independent UX review and source/asset checks.',
				{document: object, outputPath: text, uxPath: text, designLanguagePath: text, options: object},
				['document', 'outputPath', 'uxPath', 'designLanguagePath', 'options'],
				false,
				true,
				async (input, context) => {
					const module = await this._module(
						`skills/refine-design/scripts/${kind === 'ui' ? 'ui-composition' : 'component-design'}.mjs`,
					);
					return module[kind === 'ui' ? 'writeUiSpec' : 'writeComponentDesign'](
						this._jsonFile(input.document, context),
						context.files.resolve(input.outputPath),
						context.files.resolve(input.uxPath),
						context.files.resolve(input.designLanguagePath),
						this._paths(
							input.options,
							[
								'uxReviewPath',
								'productDescriptionPath',
								'sourceRoot',
								'assetRoot',
								'productDocumentRoot',
								'existingUxPath',
								'existingDesignLanguagePath',
							],
							context,
						),
					);
				},
			);
		this._add(
			'product.prepare',
			'Validate current source/model and prepare complete planner facts. Select bounded records from the resulting handle.',
			{uxPath: text, claimIds: list, useCaseIds: list},
			[],
			false,
			false,
			async (input, context) => {
				const {buildPlannerInput} = await this._module('skills/refine-design/scripts/refinement-input.mjs');
				return buildPlannerInput({
					...this._paths(input, ['uxPath'], context),
					currentPath: context.run.currentPath,
					sourcePath: context.run.sourcePath,
				});
			},
		);
		this._add(
			'product.select',
			'Select known model record IDs while retaining all product constraints and decisions. Supply planner facts by inputHandles.',
			{facts: object, ids: list},
			['facts', 'ids'],
			false,
			false,
			(input) => {
				const model = input.facts.productModel;
				if (!model || !Array.isArray(model.recordIndex)) throw new Error('Expected current planner facts');
				const selected = new Set(input.ids);
				const available = new Set(model.recordIndex.map((record) => record.id));
				for (const id of selected) if (!available.has(id)) throw new Error(`Unknown model record ${id}`);
				const index = new Map();
				for (const [key, values] of Object.entries(model))
					if (Array.isArray(values) && key !== 'recordIndex')
						for (const record of values)
							if (record?.id) {
								index.set(record.id, record);
								if (['rules', 'gaps', 'decisions', 'questions', 'constraints'].includes(key))
									selected.add(record.id);
							}
				const queue = [...selected];
				const visit = (value) => {
					if (typeof value === 'string' && index.has(value) && !selected.has(value)) {
						selected.add(value);
						queue.push(value);
					} else if (value && typeof value === 'object')
						for (const child of Object.values(value)) visit(child);
				};
				for (let cursor = 0; cursor < queue.length; cursor++) visit(index.get(queue[cursor]));
				const collections = {};
				for (const [key, value] of Object.entries(model)) {
					if (Array.isArray(value)) collections[key] = value.filter((record) => selected.has(record.id));
					else collections[key] = value;
				}
				return {
					...input.facts,
					productModel: collections,
					selection: {requestedIds: input.ids, includedIds: [...selected], completeModel: false},
				};
			},
		);
		this._add(
			'units.open',
			'Initialize a current UX/UI authoring store with exact source binding.',
			{stage, binding: object},
			['stage', 'binding'],
			false,
			true,
			async (input, context) => {
				const {DesignRecords} = await this._module('skills/refine-design/scripts/design-records.mjs');
				return DesignRecords.initialize(this._store(input, context), input);
			},
		);
		this._add(
			'units.import',
			'Factor an existing compatible UX/UI document into reusable authoring units.',
			{stage, document: object},
			['stage', 'document'],
			false,
			false,
			async (input) => {
				const {DesignAssembly} = await this._module('skills/refine-design/scripts/design-assembly.mjs');
				return input.stage === 'ux'
					? DesignAssembly.importUx(input.document)
					: DesignAssembly.importUi(input.document);
			},
		);
		this._add(
			'units.deliver',
			'Save only assigned current units; exact repeats reuse bytes and repairs require prior digests.',
			{stage, records: {type: 'array', items: object}, repairs: object},
			['stage', 'records'],
			true,
			true,
			async (input, context) => {
				const {DesignRun} = await this._module('skills/refine-design/scripts/design-run.mjs');
				return DesignRun.deliver(this._store(input, context), input.records, input.repairs ?? {});
			},
		);
		this._add(
			'units.read',
			'Read selected assigned units with their existing repair notices.',
			{stage, references: list},
			['stage', 'references'],
			true,
			false,
			async (input, context) => {
				const {DesignRecords} = await this._module('skills/refine-design/scripts/design-records.mjs');
				return DesignRecords.read(this._store(input, context), input.references);
			},
		);
		this._add(
			'units.handoff',
			'Build an exact dependency manifest for selected units without reproducing their data.',
			{stage, references: list},
			['stage', 'references'],
			false,
			false,
			async (input, context) => {
				const {DesignRun} = await this._module('skills/refine-design/scripts/design-run.mjs');
				return DesignRun.handoff(this._store(input, context), input.references);
			},
		);
		this._add(
			'units.assemble',
			'Assemble, validate and optionally render saved units; preserve good siblings and actionable repair notices.',
			{stage, options: object},
			['stage'],
			false,
			true,
			async (input, context) => {
				const {DesignRun} = await this._module('skills/refine-design/scripts/design-run.mjs');
				return DesignRun.assemble(
					this._store(input, context),
					context.files.resolve(path.join(context.run.directory, 'assembled', input.stage)),
					this._paths(input.options ?? {}, ['sourceRoot', 'assetRoot'], context),
				);
			},
		);
		const reviewFields = {
			uxPath: text,
			productDescriptionPath: text,
			productDescriptionId: text,
			sourceRoot: text,
			scopeRefs: list,
			review: object,
		};
		for (const mode of ['subject', 'validate'])
			this._add(
				`ux-review.${mode}`,
				'Bind independent UX review to exact source bytes and current scope.',
				reviewFields,
				['uxPath', 'scopeRefs'],
				false,
				false,
				async (input, context) => {
					const module = await this._module('skills/refine-design/scripts/ux-review.mjs');
					const uxArtifactPath = context.files.resolve(input.uxPath);
					const options = {
						uxSpec: context.files.json(uxArtifactPath),
						uxSource: Buffer.from(context.files.read(uxArtifactPath)),
						uxArtifactPath,
						productDescriptionSource: Buffer.from(
							context.files.read(input.productDescriptionPath ?? context.run.sourcePath),
						),
						productDescriptionPath: context.files.resolve(
							input.productDescriptionPath ?? context.run.sourcePath,
						),
						productDescriptionId: input.productDescriptionId,
						sourceRoot: context.files.resolve(input.sourceRoot ?? path.dirname(uxArtifactPath)),
						scopeRefs: input.scopeRefs,
						requiredScopeRefs: input.scopeRefs,
					};
					if (mode === 'subject') return module.createUxReviewSubject(options);
					module.validatePassingUxReview(input.review, options);
					return {valid: true};
				},
			);
		this._add(
			'model.persist',
			'Persist a current model proposal using existing authority and store locks.',
			{proposal: object, outputRoot: text, sourceLabel: text, authority: text},
			['proposal', 'outputRoot', 'sourceLabel'],
			false,
			true,
			async (input, context) => {
				const {persistProductModel} = await this._module('skills/refine-design/scripts/product-model.mjs');
				return persistProductModel({
					proposalPath: this._jsonFile(input.proposal, context),
					sourcePath: context.run.sourcePath,
					outputRoot: context.files.resolve(input.outputRoot),
					sourceLabel: input.sourceLabel,
					authority: input.authority,
				});
			},
		);
		this._add(
			'artifact.commit',
			'Commit a current artifact proposal with exact base snapshot, authority and resources.',
			{proposal: object, baseSnapshotSha256: text, authority: text, resourceRoot: text},
			['proposal', 'baseSnapshotSha256'],
			false,
			true,
			async (input, context) => {
				const {commitProductArtifact} = await this._module(
					'skills/refine-design/scripts/product-artifact-store.mjs',
				);
				return commitProductArtifact({
					...this._paths(input, ['resourceRoot'], context),
					proposalPath: this._jsonFile(input.proposal, context),
					currentPath: context.run.currentPath,
				});
			},
		);
	}

	/** Registers publication and technical/research evidence consumers.
	 * @returns {void}
	 */
	_registerPublication() {
		this._add(
			'technical.inspect',
			'Capture current repository evidence and save its baseline.',
			{repositoryId: text, paths: list},
			['repositoryId', 'paths'],
			false,
			true,
			async (input, context) =>
				(
					await this._module('skills/refine-design/scripts/technical-preparation.mjs')
				).inspectTechnicalRepository({
					...input,
					currentPath: context.run.currentPath,
					repositoryRoot: context.files.root,
				}),
		);
		this._add(
			'technical.prepare',
			'Validate and persist reconciled technical input and evidence against an exact snapshot.',
			{document: object, baseSnapshotSha256: text, authority: text},
			['document', 'baseSnapshotSha256'],
			false,
			true,
			async (input, context) =>
				(await this._module('skills/refine-design/scripts/technical-preparation.mjs')).prepareTechnicalArtifact(
					{
						currentPath: context.run.currentPath,
						repositoryRoot: context.files.root,
						inputPath: this._jsonFile(input.document, context),
						baseSnapshotSha256: input.baseSnapshotSha256,
						authority: input.authority,
					},
				),
		);
		this._add(
			'publication.assemble',
			'Assemble and persist validated publication artifacts using current bindings, receipts and repair handling.',
			{requests: {type: 'array', items: object}, sourceRoot: text, assetRoot: text},
			['requests', 'sourceRoot'],
			false,
			true,
			async (input, context) => {
				const {assemblePublication} = await this._module(
					'skills/refine-design/scripts/refinement-assembly.mjs',
				);
				return assemblePublication({
					...this._paths(input, ['sourceRoot', 'assetRoot'], context),
					currentPath: context.run.currentPath,
				});
			},
		);
		this._add(
			'context.resolve',
			'Resolve current product or technical context with the existing readiness checks.',
			{consumer: {type: 'string', enum: ['prd', 'technical']}, scope: list},
			[],
			false,
			false,
			async (input, context) => {
				const {resolveProductContext} = await this._module('skills/refine-design/scripts/product-context.mjs');
				return resolveProductContext({
					...input,
					currentPath: context.run.currentPath,
					repositoryRoot: context.files.root,
				});
			},
		);
		this._add(
			'technical.resolve',
			'Resolve frozen technical evidence from current product artifacts.',
			{scope: list},
			[],
			false,
			false,
			async (input, context) => {
				const {resolveTechnicalContext} = await this._module(
					'skills/refine-design/scripts/technical-context.mjs',
				);
				return resolveTechnicalContext({
					...input,
					currentPath: context.run.currentPath,
					repositoryRoot: context.files.root,
				});
			},
		);
		this._add(
			'technical.publish',
			'Publish validated frozen technical context as linked Markdown.',
			{context: object, outputDirectory: text},
			['context', 'outputDirectory'],
			false,
			true,
			async (input, context) => {
				const {generateTechnical} = await this._module(
					'skills/generate-technical/scripts/generate-technical.mjs',
				);
				return generateTechnical({
					contextPath: this._jsonFile(input.context, context),
					outputDirectory: context.files.resolve(input.outputDirectory),
				});
			},
		);
		for (const mode of ['preview', 'publish'])
			this._add(
				`collection.${mode}`,
				'Validate and assemble a product document collection from exact context, outline, weights and plan files.',
				{contextPath: text, outlinePath: text, weightsPath: text, planPath: text, outputRoot: text},
				['contextPath', 'outlinePath', 'weightsPath', 'planPath', 'outputRoot'],
				false,
				true,
				async (input, context) => {
					const module = await this._module('skills/generate-prd/scripts/product-collection.mjs');
					const values = {contextDirectory: path.dirname(context.files.resolve(input.contextPath))};
					for (const field of ['context', 'outline', 'weights', 'plan']) {
						const content = context.files.read(input[`${field}Path`]);
						values[field] = JSON.parse(content);
						values[`${field}Bytes`] = Buffer.from(content);
					}
					const collection = module.createProductCollection(values);
					return mode === 'preview'
						? module.previewProductCollection(context.files.resolve(input.outputRoot), collection)
						: module.publishProductCollection(context.files.resolve(input.outputRoot), collection);
				},
			);
		this._add(
			'research.record',
			'Validate exact before/after research text and record its current revision ledger.',
			{beforePath: text, afterPath: text, ledgerPath: text, productRoot: text},
			['beforePath', 'afterPath', 'ledgerPath', 'productRoot'],
			false,
			true,
			async (input, context) => {
				const {recordRevision} = await this._module('skills/refine-detail/scripts/revision-ledger.mjs');
				return recordRevision(this._paths(input, Object.keys(input), context));
			},
		);
	}

	/** Registers repository standards and reviewer evidence operations.
	 * @returns {void}
	 */
	_registerStandards() {
		this._add(
			'standards.resolve',
			'Resolve folder standards and overlays using the current parser.',
			{manifestPath: text, overlayPath: text, file: text},
			['manifestPath', 'overlayPath', 'file'],
			false,
			false,
			async (input, context) => {
				const module = await this._module('skills/normalize-standards/scripts/standards-config.mjs');
				const manifest = module.parseManifest(context.files.read(input.manifestPath), input.manifestPath);
				const overlay = module.parseOverlay(
					context.files.read(input.overlayPath),
					manifest.selected,
					input.overlayPath,
				);
				const standards = module.standardsForPath(manifest, input.file);
				return {
					standards,
					overlay: standards.standards.map((item) => ({
						standard: item.name,
						entries: module.overlayForPath(overlay, input.file, item.name),
					})),
				};
			},
		);
		this._add(
			'standards.guide',
			'Build the standards guide from repository configuration and installed source standards.',
			{options: object},
			[],
			false,
			false,
			async (input, context) => {
				const {buildGuide} = await this._module('skills/write-standards-guide/scripts/standards-guide.mjs');
				new InputContract().validate(input.options ?? {}, {
					type: 'object',
					properties: {manifest: text, overlay: text},
					additionalProperties: false,
				});
				return buildGuide({
					...Object.fromEntries(
						Object.entries(input.options ?? {}).map(([key, value]) => [
							key,
							path.relative(context.files.root, context.files.resolve(value)).replaceAll('\\', '/'),
						]),
					),
					repo: context.files.root,
					codex_root: this.codexRoot,
				});
			},
		);
		this._add(
			'review.request',
			'Build the exact standards review request and current repository snapshot.',
			{baseline: object, paths: list},
			['baseline'],
			false,
			false,
			async (input, context) => {
				const {buildRequest} = await this._module('skills/review-standards/scripts/review-ledger.mjs');
				return buildRequest(context.files.root, this.codexRoot, input.baseline, input.paths ?? []);
			},
		);
		this._add(
			'review.validate',
			'Validate a specialist ledger and audit against its exact parent request.',
			{request: object, lane: text, primary: object, audit: object},
			['request', 'lane', 'primary', 'audit'],
			false,
			false,
			async (input, context) => {
				if (context.files.resolve(input.request.repo) !== context.files.root)
					throw new Error('Review request is for a different workspace');
				const {validateLedger} = await this._module('skills/review-standards/scripts/review-ledger.mjs');
				return validateLedger(input.request, input.lane, input.primary, input.audit);
			},
		);
		this._add(
			'repository.snapshot',
			'Read Git worktree state for checkpoint and reviewer preparation; Git mutations remain in the host approval boundary.',
			{},
			[],
			false,
			false,
			async (input, context) => {
				const {snapshot} = await this._module('skills/review-standards/scripts/review-ledger.mjs');
				return snapshot(context.files.root);
			},
		);
	}

	/** Registers deterministic project/reset planning. Host workers retain privileged application.
	 * @returns {void}
	 */
	_registerProject() {
		this._add(
			'project.inspect',
			'Inspect an initialization target or existing application repository. Keep service state outside an empty target.',
			{kind: {type: 'string', enum: ['initial', 'existing']}, target: text},
			['kind', 'target'],
			false,
			false,
			async (input, context) => {
				if (input.kind === 'initial')
					return (await this._module('skills/initialize-project/scripts/preflight.mjs')).inspectTarget(
						context.files.resolve(input.target),
					);
				return (await this._module('skills/create-app/scripts/inspect-repository.mjs')).inspectRepository(
					context.files.resolve(input.target),
				);
			},
		);
		this._add(
			'project.plan',
			'Build a deterministic scaffold/application plan without installs or host changes.',
			{kind: {type: 'string', enum: ['initial', 'existing']}, target: text, options: object},
			['kind', 'target', 'options'],
			false,
			false,
			async (input, context) => {
				let plan;
				if (input.kind === 'initial') {
					const {normalizeOptions} = await this._module(
						'skills/initialize-project/scripts/normalize-options.mjs',
					);
					plan = (
						await this._module('skills/initialize-project/scripts/scaffold-plan.mjs')
					).createScaffoldPlan(normalizeOptions(input.options));
				} else {
					const {normalizeApplicationOptions} = await this._module(
						'skills/create-app/scripts/normalize-application-options.mjs',
					);
					return (await this._module('skills/create-app/scripts/apply-app.mjs')).applyApp(
						context.files.resolve(input.target),
						normalizeApplicationOptions(input.options),
						{dryRun: true},
					);
				}
				return {...plan, files: [...plan.files], directories: [...plan.directories]};
			},
		);
		this._add(
			'reset.plan',
			'Prepare the existing exact-digest clean-design reset plan; application and stale-lock recovery remain explicit host operations.',
			{source: text, targets: list, preserve: list},
			['source', 'targets'],
			false,
			false,
			async (input, context) => {
				const {planReset} = await this._module('skills/reset-design/scripts/reset-design.mjs');
				return planReset({...input, root: context.files.root});
			},
		);
	}
}
