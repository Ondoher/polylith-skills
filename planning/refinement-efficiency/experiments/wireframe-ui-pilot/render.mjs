import {UiParts} from '../../../../skills/refine-design/scripts/ui-parts.mjs';
import {renderInlineScene} from '../../../../skills/refine-design/scripts/ui-composition-html.mjs';

export const PREVIEW_SCHEMA = 'wireframe-ui-pilot-1';
const notice = 'Provisional experiment · structurally ready, unreviewed source UX';
const roles = new Set([
	'surface',
	'item',
	'selection',
	'start-handle',
	'end-handle',
	'indicator',
	'thumbnail',
	'trigger',
	'label',
	'track',
	'thumb',
	'divider',
]);
const builtins = [
	['heading', 'heading', 'h2', 'ui-heading'],
	['text', 'text', 'p', 'ui-text'],
	['status', 'status', 'span', 'ui-status'],
	['button', 'button', 'button', 'ui-button'],
	['button-secondary', 'button', 'button', 'ui-button ui-button-secondary'],
	['icon-button', 'icon-button', 'button', 'ui-icon-button'],
	['text-field', 'text-field', 'div', 'ui-text-field'],
	['visual', 'visual', 'div', 'ui-visual'],
].map(([id, renderer, element, className]) => ({
	id,
	name: id,
	version: '1',
	html: {renderer, element, className},
	sizing: {width: 'fill', height: renderer === 'visual' ? 'fill' : 'content'},
}));
const uiTheme = {
	primary: '#315da8',
	onPrimary: '#ffffff',
	surface: '#ffffff',
	background: '#eef1f6',
	text: '#172337',
	muted: '#5d6778',
	border: '#bdc8d7',
	accent: '#aa520b',
	danger: '#b42318',
	fieldBorder: '#bdc8d7',
	fieldLabel: '#5d6778',
	radius: 8,
	fieldRadius: 4,
	fontSize: 14,
};
const neutralTheme = {
	primary: '#333333',
	onPrimary: '#ffffff',
	surface: '#ffffff',
	background: '#f2f2f2',
	text: '#222222',
	muted: '#555555',
	border: '#888888',
	accent: '#555555',
	danger: '#333333',
	fieldBorder: '#888888',
	fieldLabel: '#555555',
	radius: 0,
	fieldRadius: 0,
	fontSize: 14,
};
const uxSpec = {surfaces: [{id: 'pilot-surface', regions: []}]};

function requireValue(condition, message) {
	if (!condition) throw new Error(message);
}
function record(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function nonempty(value) {
	return typeof value === 'string' && value.trim().length > 0;
}
function finite(value, min = 0) {
	return typeof value === 'number' && Number.isFinite(value) && value >= min;
}
function identifier(value) {
	return typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,159}$/.test(value);
}
function escape(value) {
	return String(value).replace(
		/[&<>"']/g,
		(character) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[character],
	);
}

function validateLayout(layout, id) {
	requireValue(record(layout) && ['grid', 'flex'].includes(layout.mode), `${id}: grid or flex layout required`);
	requireValue(finite(layout.gap), `${id}: gap must be nonnegative pixels`);
	const padding = layout.padding;
	requireValue(
		finite(padding) ||
			(record(padding) && ['top', 'right', 'bottom', 'left'].every((edge) => finite(padding[edge]))),
		`${id}: padding must be nonnegative pixels`,
	);
	requireValue(
		['start', 'end', 'center', 'stretch', 'baseline'].includes(layout.align),
		`${id}: unsupported alignment`,
	);
	requireValue(
		['start', 'end', 'center', 'stretch', 'space-between', 'space-around', 'space-evenly'].includes(layout.justify),
		`${id}: unsupported justification`,
	);
	if (layout.mode === 'grid') {
		for (const axis of ['columns', 'rows'])
			requireValue(
				Array.isArray(layout[axis]) &&
					layout[axis].length > 0 &&
					layout[axis].every(
						(track) =>
							record(track) &&
							(track.unit === 'content' ||
								(['px', 'fr'].includes(track.unit) && finite(track.value, 0.001))),
					),
				`${id}: invalid ${axis}`,
			);
	} else {
		requireValue(
			['row', 'column'].includes(layout.direction) && typeof layout.wrap === 'boolean',
			`${id}: flex direction and wrap required`,
		);
	}
}

function validateTree(root, templates, actionRefs, childScenes) {
	requireValue(root?.kind === 'region', 'Part root must be a region');
	const ids = new Set();
	function visit(node) {
		requireValue(record(node) && identifier(node.id) && !ids.has(node.id), 'Nodes need unique valid IDs');
		ids.add(node.id);
		if (node.placement !== undefined)
			requireValue(
				record(node.placement) &&
					Object.entries(node.placement).every(
						([key, value]) =>
							['row', 'column', 'rowSpan', 'columnSpan'].includes(key) &&
							Number.isSafeInteger(value) &&
							value > 0,
					),
				`${node.id}: invalid placement`,
			);
		if (node.constraints !== undefined)
			requireValue(
				record(node.constraints) &&
					Object.entries(node.constraints).every(
						([key, value]) =>
							['minWidthPx', 'maxWidthPx', 'minHeightPx', 'maxHeightPx'].includes(key) && finite(value),
					),
				`${node.id}: invalid constraints`,
			);
		if (node.actionRef !== undefined)
			requireValue(
				actionRefs.includes(node.actionRef),
				`${node.id}: actionRef must be listed in sourceActionRefs`,
			);
		if (node.kind === 'region') {
			validateLayout(node.layout, node.id);
			requireValue(Array.isArray(node.children), `${node.id}: children required`);
			node.children.forEach(visit);
		} else {
			requireValue(
				node.kind === 'component' && node.templateRef?.version === '1' && templates.has(node.templateRef?.id),
				`${node.id}: unknown component template`,
			);
			requireValue(
				identifier(node.state) && record(node.parameters),
				`${node.id}: state and parameters required`,
			);
			const type = node.templateRef.id,
				parameters = node.parameters;
			if (['heading', 'text', 'status'].includes(type))
				requireValue(nonempty(parameters.text), `${node.id}: text required`);
			if (['button', 'button-secondary', 'text-field'].includes(type))
				requireValue(nonempty(parameters.label), `${node.id}: label required`);
			if (type === 'icon-button')
				requireValue(
					nonempty(parameters.accessibleLabel) && nonempty(parameters.glyph),
					`${node.id}: accessibleLabel and glyph required`,
				);
			if (type === 'visual') requireValue(roles.has(parameters.role), `${node.id}: unknown visual role`);
			if (childScenes.has(type))
				requireValue(
					childScenes.get(type).has(node.state) &&
						nonempty(node.placeholder?.label) &&
						nonempty(node.placeholder?.description),
					`${node.id}: child scene and placeholder description required`,
				);
		}
	}
	visit(root);
}

function validateTheme(theme) {
	requireValue(record(theme), 'UI theme must be an object');
	for (const [key, value] of Object.entries(theme)) {
		requireValue(Object.hasOwn(uiTheme, key), `Unsupported UI theme field ${key}`);
		requireValue(
			['radius', 'fieldRadius', 'fontSize'].includes(key)
				? finite(value, key === 'fontSize' ? 8 : 0) && value <= 64
				: typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value),
			`Invalid UI theme ${key}`,
		);
	}
}

/** Prepare only an in-memory rendering view; this never writes canonical artifacts. */
function prepare(document, options, ancestors = new Set(), registrations = []) {
	requireValue(record(document) && document.schemaVersion === PREVIEW_SCHEMA, `Expected ${PREVIEW_SCHEMA}`);
	requireValue(
		identifier(document.elementId) && Number.isSafeInteger(document.revision) && document.revision > 0,
		'Valid elementId and positive integer revision required',
	);
	requireValue(
		Array.isArray(document.sourceFlowRefs) &&
			document.sourceFlowRefs.length > 0 &&
			document.sourceFlowRefs.every(nonempty),
		'Exact sourceFlowRefs required',
	);
	requireValue(
		document.sourceActionRefs === undefined ||
			(Array.isArray(document.sourceActionRefs) && document.sourceActionRefs.every(nonempty)),
		'sourceActionRefs must contain strings',
	);
	const key = `${document.elementId}@${document.revision}`;
	requireValue(!ancestors.has(key), `Cyclic component reference ${key}`);
	const nextAncestors = new Set([...ancestors, key]);
	requireValue(
		Array.isArray(document.parts) &&
			document.parts.length > 0 &&
			Array.isArray(document.scenes) &&
			document.scenes.length > 0,
		'Parts and scenes are required',
	);
	let parts = structuredClone(document.parts),
		scenes = structuredClone(document.scenes);
	// Validate native IDs/part references before applying UI replacements as well.
	UiParts.materialize({schemaVersion: '0.4', parts, scenes});
	if (options.mode === 'ui') {
		requireValue(record(document.ui), `${key}: UI contribution required`);
		validateTheme(document.ui.theme ?? {});
		if (document.ui.parts !== undefined) {
			requireValue(Array.isArray(document.ui.parts), 'UI parts must be an array');
			const replacements = new Map(document.ui.parts.map((part) => [part.id, part]));
			requireValue(
				replacements.size === document.ui.parts.length &&
					[...replacements.keys()].every((id) => parts.some((part) => part.id === id)),
				'UI part replacements must have distinct existing part IDs',
			);
			parts = parts.map((part) => structuredClone(replacements.get(part.id) ?? part));
		}
	}
	const sceneIds = new Set();
	for (const scene of scenes) {
		requireValue(
			identifier(scene.id) && !sceneIds.has(scene.id) && nonempty(scene.name),
			'Scenes need unique valid IDs and names',
		);
		sceneIds.add(scene.id);
		requireValue(
			finite(scene.viewport?.width, 1) && finite(scene.viewport?.height, 1),
			`${scene.id}: viewport required`,
		);
		requireValue(
			scene.presentation === undefined || scene.presentation === 'dialog',
			`${scene.id}: unsupported presentation`,
		);
		scene.surfaceRef = 'pilot-surface';
		if (scene.presentation === 'dialog') scene.transientBehavior = {presentation: 'dialog'};
	}
	if (options.mode === 'ui' && document.ui.sceneChanges !== undefined) {
		requireValue(Array.isArray(document.ui.sceneChanges), 'UI sceneChanges must be an array');
		const changed = new Set();
		for (const patch of document.ui.sceneChanges) {
			requireValue(
				sceneIds.has(patch.sceneRef) && !changed.has(patch.sceneRef) && Array.isArray(patch.changes),
				'UI sceneChanges need distinct existing scene references',
			);
			changed.add(patch.sceneRef);
			// Apply each layer through the native variation validator, preserving base changes.
			const scene = scenes.find((candidate) => candidate.id === patch.sceneRef);
			const base = UiParts.materialize({schemaVersion: '0.4', parts, scenes: [scene]}).scenes[0];
			const varied = UiParts.materialize({
				schemaVersion: '0.4',
				parts: [{id: 'variation', root: base.root}],
				scenes: [{...scene, partRef: 'variation', changes: patch.changes}],
			}).scenes[0];
			scene.root = varied.root;
		}
	}
	const materialized = scenes.map((scene) =>
		scene.root ? scene : UiParts.materialize({schemaVersion: '0.4', parts, scenes: [scene]}).scenes[0],
	);
	const templates = structuredClone(builtins),
		childScenes = new Map();
	requireValue(document.childRefs === undefined || Array.isArray(document.childRefs), 'childRefs must be an array');
	for (const child of document.childRefs ?? []) {
		requireValue(
			identifier(child.templateId) && !templates.some((template) => template.id === child.templateId),
			'Child template IDs must be distinct from builtins',
		);
		const childKey = `${child.elementId}@${child.revision}`;
		const source = options.references?.[childKey];
		requireValue(
			source?.elementId === child.elementId && source.revision === child.revision,
			`Exact child reference missing: ${childKey}`,
		);
		const prepared = prepare(source, options, nextAncestors, registrations);
		childScenes.set(child.templateId, new Set(prepared.spec.scenes.map((scene) => scene.id)));
		templates.push({
			id: child.templateId,
			name: child.elementId,
			version: '1',
			html: {renderer: 'placeholder', element: 'section', className: 'ui-child'},
			sizing: {width: 'fill', height: 'fill'},
		});
		const scopedId = `${document.elementId}.${document.revision}.${child.templateId}`;
		registrations.push({
			name: child.elementId,
			replacesTemplateRef: {id: scopedId, version: '1'},
			stateOutputs: Object.fromEntries(prepared.spec.scenes.map((scene) => [scene.id, 'inline'])),
			inlineSpec: prepared.spec,
		});
	}
	const templateIds = new Set(templates.map((template) => template.id));
	for (const scene of materialized)
		validateTree(scene.root, templateIds, document.sourceActionRefs ?? [], childScenes);
	// Namespace registered slots so children may use their own independent template IDs.
	for (const child of document.childRefs ?? []) {
		const scopedId = `${document.elementId}.${document.revision}.${child.templateId}`;
		templates.find((template) => template.id === child.templateId).id = scopedId;
		for (const scene of materialized) {
			const visit = (node) => {
				if (node.templateRef?.id === child.templateId) node.templateRef.id = scopedId;
				(node.children ?? []).forEach(visit);
			};
			visit(scene.root);
		}
	}
	// Inline child rendering materializes stored scenes again, so keep native parts.
	const renderParts = materialized.map((scene, index) => ({id: `resolved-${index}`, root: scene.root}));
	const renderScenes = materialized.map(({root, ...scene}, index) => ({
		...scene,
		partRef: renderParts[index].id,
		changes: [],
	}));
	const spec = {
		schemaVersion: '0.4',
		parts: renderParts,
		scenes: renderScenes,
		templates,
		tokens: [],
		assets: [],
		uxArtifactBinding: {revision: 'unreviewed'},
		designLanguageSource: {revision: 'provisional'},
		componentTemplate: {stateScenes: renderScenes.map((scene) => ({state: scene.id, sceneRef: scene.id}))},
	};
	return {spec, registrations};
}

/** Check mechanical preview readiness without reading source stores or asserting review approval.
 * @param {object} document - Experiment envelope documented in render-contract.md.
 * @param {object} [options] - Mode, optional sceneId and exact child references.
 * @returns {{valid: boolean, errors: string[]}} - Bounded validation result.
 */
export function validatePreview(document, options = {}) {
	try {
		const mode = options.mode ?? 'wireframe';
		requireValue(['wireframe', 'ui'].includes(mode), 'Mode must be wireframe or ui');
		const prepared = prepare(document, {...options, mode});
		if (options.sceneId !== undefined)
			requireValue(
				prepared.spec.scenes.some((scene) => scene.id === options.sceneId),
				'Requested scene is missing',
			);
		return {valid: true, errors: []};
	} catch (error) {
		return {valid: false, errors: [error.message]};
	}
}

function css(mode, theme) {
	return `:root{${Object.entries(theme)
		.map(([key, value]) => `--pilot-${key}:${typeof value === 'number' ? `${value}px` : value}`)
		.join(';')}}
*{box-sizing:border-box}body{margin:0;background:var(--pilot-background);color:var(--pilot-text);font:var(--pilot-fontSize)/1.45 system-ui,sans-serif}header,main,footer{padding:20px 28px}header{border-bottom:1px solid var(--pilot-border);background:var(--pilot-surface)}h1{font-size:22px;margin:4px 0}header p,footer p{margin:4px 0}.pilot-notice{font-weight:700}.pilot-scene{margin-bottom:28px}.pilot-scene>h2{font-size:16px}.pilot-scroll{overflow:auto;padding:2px}.ui-viewport{width:var(--ui-viewport-width);height:var(--ui-viewport-height);background:var(--pilot-surface);border:1px solid var(--pilot-border)}.ui-scene-root,.ui-region,.ui-node-frame{min-width:0;min-height:0;position:relative}.ui-scene-root{width:100%;height:100%}dialog.ui-scene-root{inset:auto;margin:0;color:inherit}.ui-region{background:transparent}.ui-node-frame{display:grid;align-items:stretch;z-index:1}.ui-template{box-sizing:border-box;font:inherit}.ui-heading{margin:0;font-size:22px;line-height:1.25}.ui-text{margin:0}.ui-status{align-self:center;justify-self:start;padding:4px 10px;border:1px solid var(--pilot-border);border-radius:var(--pilot-radius);color:var(--pilot-muted)}
.ui-button,.ui-icon-button{min-height:44px;border:1px solid var(--pilot-primary);border-radius:var(--pilot-radius);background:var(--pilot-primary);color:var(--pilot-onPrimary);padding:6px 16px;font:inherit;font-weight:600}.ui-icon-button{padding:6px;min-width:44px}.ui-button-secondary{background:var(--pilot-surface);color:var(--pilot-text);border-color:var(--pilot-border)}.ui-button:disabled,.ui-icon-button:disabled{opacity:.45}.ui-button.ui-is-focus,.ui-icon-button.ui-is-focus{outline:2px solid var(--pilot-primary);outline-offset:2px}
.ui-text-field{--pilot-field-state-border:var(--pilot-fieldBorder);--pilot-field-state-label:var(--pilot-fieldLabel);display:grid;align-content:start;gap:4px;position:relative;margin-top:6px}.ui-text-field label{position:absolute;top:0;left:8px;z-index:1;transform:translateY(-50%);padding:0 4px;background:var(--pilot-surface);color:var(--pilot-field-state-label);font-size:12px;font-weight:400;line-height:1.2}.ui-text-field input{min-width:0;width:100%;min-height:40px;padding:8px 12px;border:1px solid var(--pilot-field-state-border);border-radius:var(--pilot-fieldRadius);background:var(--pilot-surface);color:var(--pilot-text);font:inherit;outline:none}.ui-text-field p{margin:0 12px;color:var(--pilot-muted);font-size:12px}.ui-text-field.ui-is-focus,.ui-text-field:focus-within{--pilot-field-state-border:var(--pilot-primary);--pilot-field-state-label:var(--pilot-primary)}.ui-text-field.ui-is-focus input,.ui-text-field:focus-within input{border-width:2px;padding:7px 11px}.ui-text-field.ui-is-error,.ui-text-field.ui-is-invalid{--pilot-field-state-border:var(--pilot-danger);--pilot-field-state-label:var(--pilot-danger)}.ui-text-field.ui-is-error p,.ui-text-field.ui-is-invalid p{color:var(--pilot-danger)}.ui-text-field:has(input:disabled){--pilot-field-state-border:color-mix(in srgb,#000000 26%,var(--pilot-surface));--pilot-field-state-label:color-mix(in srgb,#000000 38%,var(--pilot-surface))}.ui-text-field input:disabled{border-width:1px;padding:8px 12px;color:var(--pilot-field-state-label);-webkit-text-fill-color:var(--pilot-field-state-label);opacity:1}.ui-surface-outlined{border:1px solid var(--pilot-border);border-radius:var(--pilot-radius)}.ui-surface-elevation-1{border:1px solid var(--pilot-border);border-radius:var(--pilot-radius);box-shadow:0 8px 22px #0002}.ui-complex-component{min-width:0;min-height:0;width:100%;height:100%}
.ui-visual{display:block;width:100%;height:100%;min-width:0;min-height:0;border-radius:3px}.ui-visual--surface{background:color-mix(in srgb,var(--pilot-text) 6%,var(--pilot-surface));border:1px solid var(--pilot-border)}.ui-visual-variant--dark.ui-visual--surface{background:color-mix(in srgb,var(--pilot-text) 92%,var(--pilot-surface));color:var(--pilot-surface)}.ui-visual-variant--grid.ui-visual--surface{background:repeating-linear-gradient(90deg,var(--pilot-border) 0 1px,transparent 1px calc(100% / 12)),color-mix(in srgb,var(--pilot-text) 4%,var(--pilot-surface))}.ui-visual--item,.ui-visual--thumbnail{display:grid;align-content:center;overflow:hidden;padding:6px 10px;border:1px solid var(--pilot-primary);background:color-mix(in srgb,var(--pilot-primary) 12%,var(--pilot-surface));font-size:12px}.ui-visual-variant--selected.ui-visual--item{border:3px solid var(--pilot-primary);font-weight:700}.ui-visual--selection{border:2px solid var(--pilot-primary);background:color-mix(in srgb,var(--pilot-primary) 10%,transparent)}.ui-visual--start-handle,.ui-visual--end-handle{width:9px;background:var(--pilot-primary)}.ui-visual--start-handle{justify-self:start}.ui-visual--end-handle{justify-self:end}.ui-visual--indicator{justify-self:center;width:3px;background:var(--pilot-accent);border-radius:0}.ui-visual-variant--major.ui-visual--indicator,.ui-visual-variant--minor.ui-visual--indicator{align-self:end;background:var(--pilot-muted);height:12px;width:1px}.ui-visual-variant--minor.ui-visual--indicator{height:6px}.ui-visual--label{display:grid;align-content:center;padding:2px 6px;color:var(--pilot-muted);font-size:12px;font-variant-numeric:tabular-nums}.ui-visual-variant--header.ui-visual--label{font-weight:700;border-right:1px solid var(--pilot-border)}.ui-visual--track,.ui-visual--thumb{align-self:center;height:5px;border-radius:10px;background:var(--pilot-border)}.ui-visual--thumb{height:9px;background:var(--pilot-muted)}.ui-visual--divider{width:1px;background:var(--pilot-border)}.ui-visual-variant--horizontal.ui-visual--divider{width:100%;height:1px}.ui-visual--trigger{background:var(--pilot-primary);color:var(--pilot-surface)}.ui-node-frame:has(>.ui-visual--surface){z-index:0}.ui-node-frame:has(>.ui-visual--item){z-index:2}.ui-node-frame:has(>.ui-visual--selection){z-index:3}.ui-node-frame:has(>.ui-visual--start-handle),.ui-node-frame:has(>.ui-visual--end-handle){z-index:4}.ui-node-frame:has(>.ui-visual--indicator){z-index:5}.ui-visual-variant--pattern-a{background-image:repeating-linear-gradient(125deg,transparent 0 10px,#0001 10px 20px)}
${mode === 'wireframe' ? '.ui-surface-elevation-1{box-shadow:none}.ui-button,.ui-icon-button{background:white;color:#222;border:1px solid #444;border-radius:0}.ui-visual{border-radius:0}.ui-heading{font-size:18px}' : ''}`;
}

/** Render isolated static previews using the production tree renderer without its publication gate.
 * @param {object} document - Saved experiment envelope; never mutated.
 * @param {object} [options] - Mode, optional sceneId and exact child references.
 * @returns {{html: string, sceneIds: string[], validation: {valid: boolean, errors: string[]}}} - Self-contained deterministic output.
 */
export function renderPreview(document, options = {}) {
	const mode = options.mode ?? 'wireframe';
	const validation = validatePreview(document, {...options, mode});
	if (!validation.valid) throw new Error(validation.errors.join('; '));
	const {spec, registrations} = prepare(document, {...options, mode});
	const scenes = spec.scenes.filter((scene) => !options.sceneId || scene.id === options.sceneId);
	const theme = mode === 'wireframe' ? neutralTheme : {...uiTheme, ...document.ui.theme};
	const title = `${document.elementId} · revision ${document.revision} · ${mode}`;
	const content = scenes
		.map(
			(scene) =>
				`<section class="pilot-scene"><h2>${escape(scene.name)}</h2><div class="pilot-scroll">${renderInlineScene(scene, spec, {uxSpec, componentRegistrations: registrations})}</div></section>`,
		)
		.join('\n');
	const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="generator" content="wireframe-ui-pilot"><title>${escape(title)}</title><style>${css(mode, theme)}</style></head><body data-preview-mode="${mode}"><header><p class="pilot-notice">${notice}</p><h1>${escape(title)}</h1><p>Static preview · mechanical validation only · no review approval</p></header><main>${content}</main><footer><p>Source flow references: ${document.sourceFlowRefs.map(escape).join(' · ')}</p><p>Source action references: ${(document.sourceActionRefs ?? []).map(escape).join(' · ') || 'None supplied'}</p></footer></body></html>\n`;
	return {html, sceneIds: scenes.map((scene) => scene.id), validation};
}
