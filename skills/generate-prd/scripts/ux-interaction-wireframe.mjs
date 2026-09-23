function fail(message) {
  throw new Error(message);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function anchor(kind, id) {
  return `${kind}-${encodeURIComponent(id)}`;
}

function byId(records = []) {
  return new Map(records.map(record => [record.id, record]));
}

function classToken(value, fallback = 'unspecified') {
  return typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value) ? value : fallback;
}

function statusNotice(status) {
  if (status === 'locked') return '<p class="uxw-notice"><strong>Locked interaction.</strong> Preserve this interaction unless the user explicitly requests a change to this scope.</p>';
  if (status === 'unresolved') return '<p class="uxw-notice"><strong>Needs definition.</strong> This interaction remains unresolved.</p>';
  if (status === 'proposed') return '<p class="uxw-notice"><strong>Under consideration.</strong> This is an unselected interaction alternative.</p>';
  return '';
}

function actionVisibility(action) {
  const visibility = action.visibility;
  if (!visibility) return '';
  const conditions = visibility.conditions?.length
    ? `: ${visibility.conditions.map(escapeHtml).join('; ')}`
    : '';
  return `<span><strong>Visibility:</strong> ${escapeHtml(visibility.mode)}${conditions}</span>`;
}

function actionInputs(action) {
  const canonical = action.canonicalInteraction;
  const canonicalMarkup = canonical
    ? `<p class="uxw-action-method"><strong>Canonical interaction:</strong> ${escapeHtml(canonical.method)} · ${escapeHtml(canonical.input)}. ${escapeHtml(canonical.description)}</p>`
    : '';
  const alternates = action.alternateInputs?.length
    ? `<ul class="uxw-alternate-inputs" aria-label="Alternate inputs">${action.alternateInputs.map(input => `<li><strong>${escapeHtml(input.input)}:</strong> ${escapeHtml(input.description)} <span>Equivalent outcome: ${input.equivalentOutcome ? 'yes' : 'no'}.</span></li>`).join('')}</ul>`
    : '';
  return `${canonicalMarkup}${alternates}`;
}

function actionFeedback(action) {
  if (!action.feedback?.length) return '';
  return `<ul class="uxw-feedback" aria-label="Visible feedback">${action.feedback.map(item => `<li data-ux-feedback="${escapeHtml(item.id)}"><strong>${escapeHtml(item.phase)}:</strong> ${escapeHtml(item.description)} <span>${escapeHtml(item.persistence)}</span></li>`).join('')}</ul>`;
}

function patternBasisMarkup(patternBasis) {
  const research = patternBasis.researchRef ? ` <span data-ux-research="${escapeHtml(patternBasis.researchRef)}">Research: ${escapeHtml(patternBasis.researchRef)}.</span>` : '';
  return `<p class="uxw-pattern-basis"><strong>Pattern basis:</strong> ${escapeHtml(patternBasis.kind)}. ${escapeHtml(patternBasis.rationale)}${research}</p>`;
}

function actionRecovery(action, actions) {
  const cancellation = action.cancellation?.description
    ? `<p><strong>Cancellation:</strong> ${escapeHtml(action.cancellation.description)}</p>`
    : '';
  const recovery = action.recovery?.length
    ? `<ul class="uxw-recovery" aria-label="Recovery behavior">${action.recovery.map(item => {
      const recoveryActions = (item.actionRefs ?? []).map(actionRef => {
        const recoveryAction = actions.get(actionRef);
        if (!recoveryAction) fail(`Recovery ${item.id} references missing action ${actionRef}`);
        return escapeHtml(recoveryAction.name);
      });
      const actionsMarkup = recoveryActions.length ? ` Next actions: ${recoveryActions.join(', ')}.` : '';
      return `<li><strong>${escapeHtml(item.condition)}:</strong> ${escapeHtml(item.response)}${actionsMarkup}</li>`;
    }).join('')}</ul>`
    : '';
  return `${cancellation}${recovery}`;
}

function transitionMarkup(transition, catalogs) {
  if (!transition || transition.kind === 'none') return '<span>No frame change</span>';
  if (transition.kind === 'completion') return '<span>Completes the task</span>';
  if (transition.kind === 'state') return `<span>Resulting state: ${escapeHtml(transition.targetState)}</span>`;
  if (transition.kind === 'frame') {
    const frame = catalogs.frames.get(transition.targetRef);
    if (!frame) fail(`Transition references missing interaction frame ${transition.targetRef}`);
    return `<a href="#${anchor('interaction-frame', frame.id)}">Next frame: ${escapeHtml(frame.name)}</a>`;
  }
  if (transition.kind === 'surface') {
    const surface = catalogs.surfaces.get(transition.targetRef);
    if (!surface) fail(`Transition references missing surface ${transition.targetRef}`);
    return `<a href="#${anchor('surface', surface.id)}">Next surface: ${escapeHtml(surface.name)}</a><span> · State: ${escapeHtml(transition.targetState)}</span>`;
  }
  fail(`Unsupported interaction transition ${String(transition.kind)}`);
}

function affordanceCatalog(frame) {
  return new Map(frame.regions.flatMap(region => region.affordances.map(affordance => [affordance.id, affordance])));
}

function focusMarkup(frame, catalogs) {
  const focus = frame.focus;
  if (!focus || (!focus.entry && !focus.orderRefs?.length && !focus.returnActionRef)) return '';
  const affordances = affordanceCatalog(frame);
  const affordanceLabel = affordanceRef => {
    const affordance = affordances.get(affordanceRef);
    if (!affordance) fail(`Frame ${frame.id} focus references missing affordance ${affordanceRef}`);
    const action = catalogs.actions.get(affordance.actionRef);
    if (!action) fail(`Affordance ${affordance.id} references missing action ${affordance.actionRef}`);
    return affordance.label ?? action.name;
  };
  const entry = focus.entry
    ? `<div><dt>Focus entry</dt><dd>${escapeHtml(focus.entry)}</dd></div>`
    : '';
  const order = focus.orderRefs?.length
    ? `<div><dt>Focus order</dt><dd>${focus.orderRefs.map(reference => escapeHtml(affordanceLabel(reference))).join(' → ')}</dd></div>`
    : '';
  const returnAction = focus.returnActionRef ? catalogs.actions.get(focus.returnActionRef) : null;
  if (focus.returnActionRef && !returnAction) fail(`Frame ${frame.id} focus references missing return action ${focus.returnActionRef}`);
  const returnMarkup = returnAction
    ? `<div><dt>Return action</dt><dd>${escapeHtml(returnAction.name)}</dd></div>`
    : '';
  return `<dl class="uxw-focus">${entry}${order}${returnMarkup}</dl>`;
}

function renderContent(content) {
  if (!content.length) return '<p class="uxw-empty">No separate content is recorded for this region.</p>';
  return `<ul class="uxw-content-list" aria-label="Visible content">${content
    .map(item => `<li class="uxw-content uxw-content--${classToken(item.priority)}" data-ux-content="${escapeHtml(item.id)}" data-ux-content-kind="${escapeHtml(item.kind)}"><div><span class="uxw-label">${escapeHtml(item.kind)}</span><strong>${escapeHtml(item.text)}</strong></div><p>${escapeHtml(item.purpose)}</p>${item.technicalExplanation ? `<p class="uxw-technical-explanation"><strong>Technical explanation:</strong> ${escapeHtml(item.technicalExplanation)}</p>` : ''}<p class="uxw-meta">${escapeHtml(item.priority)} · ${escapeHtml(item.persistence)}</p></li>`)
    .join('')}</ul>`;
}

function renderAffordance(affordance, catalogs) {
  const action = catalogs.actions.get(affordance.actionRef);
  if (!action) fail(`Affordance ${affordance.id} references missing action ${affordance.actionRef}`);
  const label = affordance.label ?? action.name;
  const transition = transitionMarkup(affordance.transition, catalogs);
  return `<li class="uxw-affordance uxw-affordance--${classToken(action.priority)}" data-ux-affordance="${escapeHtml(affordance.id)}" data-ux-action="${escapeHtml(action.id)}" data-ux-presentation="${escapeHtml(action.presentationClass)}"><div class="uxw-affordance-heading"><div><span class="uxw-label">${escapeHtml(action.presentationClass)}</span><strong>${escapeHtml(label)}</strong></div><span class="uxw-priority">${escapeHtml(action.priority)}</span></div><p>${escapeHtml(action.purpose)}</p><div class="uxw-action-facts"><span><strong>Persistence:</strong> ${escapeHtml(action.persistence)}</span>${actionVisibility(action)}</div>${patternBasisMarkup(action.patternBasis)}${actionInputs(action)}<p><strong>Outcome:</strong> ${escapeHtml(action.outcome)}</p>${actionFeedback(action)}${actionRecovery(action, catalogs.actions)}<p class="uxw-transition"><strong>Transition:</strong> ${transition}</p></li>`;
}

function renderRegion(region, catalogs) {
  const affordances = [...region.affordances].sort((left, right) => left.order - right.order);
  const actionsMarkup = affordances.length
    ? `<ol class="uxw-affordance-list" aria-label="Available actions">${affordances.map(affordance => renderAffordance(affordance, catalogs)).join('')}</ol>`
    : '<p class="uxw-empty">No user action is available in this region for this state.</p>';
  return `<li class="uxw-region uxw-region--${classToken(region.priority)}" data-ux-region="${escapeHtml(region.id)}"${region.sourceRegionRef ? ` data-ux-source-region="${escapeHtml(region.sourceRegionRef)}"` : ''}><div class="uxw-region-heading"><div><span class="uxw-order" aria-hidden="true">${escapeHtml(region.order)}</span><div><span class="uxw-label">${escapeHtml(region.kind)}</span><h6>${escapeHtml(region.name)}</h6></div></div><span class="uxw-priority">${escapeHtml(region.priority)}</span></div><p>${escapeHtml(region.purpose)}</p>${renderContent(region.content)}${actionsMarkup}</li>`;
}

function frameContext(frame, catalogs) {
  const parent = frame.parentFrameRef ? catalogs.frames.get(frame.parentFrameRef) : null;
  if (frame.parentFrameRef && !parent) fail(`Frame ${frame.id} references missing parent frame ${frame.parentFrameRef}`);
  const trigger = frame.triggerActionRef ? catalogs.actions.get(frame.triggerActionRef) : null;
  if (frame.triggerActionRef && !trigger) fail(`Frame ${frame.id} references missing trigger action ${frame.triggerActionRef}`);
  if (!parent && !trigger) return '';
  return `<p class="uxw-context">${parent ? `<strong>Context:</strong> <a href="#${anchor('interaction-frame', parent.id)}">${escapeHtml(parent.name)}</a>.` : ''}${trigger ? ` <strong>Opened by:</strong> ${escapeHtml(trigger.name)}.` : ''}</p>`;
}

function renderFrame(frame, surface, catalogs) {
  if (frame.surfaceRef !== surface.id) fail(`Surface ${surface.id} references interaction frame ${frame.id} owned by ${frame.surfaceRef}`);
  const regions = [...frame.regions].sort((left, right) => left.order - right.order);
  const tasks = frame.taskRefs.map(taskRef => {
    const task = catalogs.tasks.get(taskRef);
    if (!task) fail(`Frame ${frame.id} references missing task ${taskRef}`);
    return task.name;
  });
  return `<figure class="uxw-frame" id="${anchor('interaction-frame', frame.id)}" data-ux-frame="${escapeHtml(frame.id)}" data-ux-surface="${escapeHtml(surface.id)}" data-ux-state="${escapeHtml(frame.state)}"><div class="uxw-frame-heading"><div><p class="uxw-kicker">UX interaction wireframe · ${escapeHtml(frame.kind)}</p><h5>${escapeHtml(frame.name)}</h5></div><span class="uxw-state">State: ${escapeHtml(frame.state)}</span></div><p>${escapeHtml(frame.purpose)}</p>${statusNotice(frame.status)}${frameContext(frame, catalogs)}${tasks.length ? `<p class="uxw-tasks"><strong>Tasks:</strong> ${tasks.map(escapeHtml).join(', ')}</p>` : ''}${patternBasisMarkup(frame.patternBasis)}${focusMarkup(frame, catalogs)}<ol class="uxw-region-list" aria-label="Regions in task order">${regions.map(region => renderRegion(region, catalogs)).join('')}</ol><figcaption>Interaction structure only. UI design owns exact layout, component choice, spacing, typography, color, and visual treatment.</figcaption></figure>`;
}

/** Render every validated semantic interaction frame owned by one UX surface. */
export function renderSurfaceInteractionWireframes(spec, surface) {
  const frameRefs = surface.interactionFrameRefs ?? [];
  if (!frameRefs.length) return '';
  const catalogs = {
    actions: byId(spec.actions),
    frames: byId(spec.interactionFrames),
    surfaces: byId(spec.surfaces),
    tasks: byId(spec.useCases)
  };
  const frames = frameRefs.map(frameRef => {
    const frame = catalogs.frames.get(frameRef);
    if (!frame) fail(`Surface ${surface.id} references missing interaction frame ${frameRef}`);
    return renderFrame(frame, surface, catalogs);
  });
  return `<section class="uxw-collection" aria-label="Interaction wireframes for ${escapeHtml(surface.name)}"><div class="uxw-collection-heading"><h4>Interaction model</h4><p>Semantic low-fidelity frames show task order, visible information, available actions, feedback, and state changes.</p></div>${frames.join('')}</section>`;
}

/** CSS for inline UX interaction wireframes. The palette is intentionally neutral and product independent. */
export function renderUxInteractionWireframeCss() {
  return `
.uxw-collection { display: grid; gap: var(--rd-space-4); margin: var(--rd-space-8) 0 0; }
.uxw-collection-heading h4, .uxw-collection-heading p { margin-bottom: var(--rd-space-1); }
.uxw-collection-heading p { color: var(--rd-review-muted); }
.uxw-frame { --uxw-paper: #fff; --uxw-soft: #f3f3f3; --uxw-soft-strong: #e4e4e4; --uxw-ink: #202020; --uxw-muted: #5d5d5d; --uxw-line: #8a8a8a; --uxw-line-strong: #343434; min-width: 0; margin: 0; padding: var(--rd-space-4); border: 1px solid var(--uxw-line-strong); border-radius: var(--rd-radius-small); background: var(--uxw-paper); color: var(--uxw-ink); }
.uxw-frame-heading, .uxw-region-heading, .uxw-affordance-heading { display: flex; flex-wrap: wrap; align-items: start; justify-content: space-between; gap: var(--rd-space-3); }
.uxw-frame-heading h5, .uxw-frame-heading p, .uxw-region-heading h6, .uxw-region-heading p { margin: 0; }
.uxw-frame-heading h5 { font-size: 18px; line-height: 24px; }
.uxw-region-heading h6 { font-size: 15px; line-height: 20px; }
.uxw-kicker, .uxw-label, .uxw-priority, .uxw-state, .uxw-meta { color: var(--uxw-muted); font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.uxw-state, .uxw-priority { padding: 2px 8px; border: 1px solid var(--uxw-line); border-radius: 999px; background: var(--uxw-soft); letter-spacing: 0; text-transform: none; }
.uxw-notice { padding: var(--rd-space-2) var(--rd-space-3); border: 2px dashed var(--uxw-line-strong); background: var(--uxw-soft); }
.uxw-context, .uxw-tasks, .uxw-pattern-basis { margin-bottom: var(--rd-space-2); color: var(--uxw-muted); }
.uxw-context a, .uxw-transition a { color: inherit; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
.uxw-focus { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)); gap: var(--rd-space-2); margin: var(--rd-space-3) 0; padding: var(--rd-space-3); border: 1px dashed var(--uxw-line); background: var(--uxw-soft); }
.uxw-focus dt { color: var(--uxw-muted); font-size: 12px; font-weight: 700; text-transform: uppercase; }
.uxw-focus dd { margin: 2px 0 0; }
.uxw-region-list, .uxw-affordance-list, .uxw-content-list, .uxw-feedback, .uxw-recovery, .uxw-alternate-inputs { display: grid; gap: var(--rd-space-2); margin: 0; padding: 0; list-style: none; }
.uxw-region-list { gap: var(--rd-space-3); counter-reset: uxw-region; }
.uxw-region { min-width: 0; padding: var(--rd-space-3); border: 1px solid var(--uxw-line); background: var(--uxw-soft); }
.uxw-region--primary { border-width: 2px; border-color: var(--uxw-line-strong); }
.uxw-region-heading > div { display: flex; align-items: start; gap: var(--rd-space-2); }
.uxw-order { display: inline-grid; place-items: center; flex: 0 0 24px; min-height: 24px; border: 1px solid var(--uxw-line-strong); border-radius: 50%; background: var(--uxw-paper); font-size: 12px; font-weight: 700; }
.uxw-content-list { margin: var(--rd-space-3) 0; }
.uxw-content { padding: var(--rd-space-2) var(--rd-space-3); border-left: 3px solid var(--uxw-line); background: var(--uxw-paper); }
.uxw-content--primary { border-left-color: var(--uxw-line-strong); border-left-width: 5px; }
.uxw-content div { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--rd-space-2); }
.uxw-content p { margin: var(--rd-space-1) 0 0; }
.uxw-affordance-list { margin-top: var(--rd-space-3); }
.uxw-affordance { padding: var(--rd-space-3); border: 1px solid var(--uxw-line); background: var(--uxw-paper); }
.uxw-affordance--primary { border: 2px solid var(--uxw-line-strong); }
.uxw-affordance--contextual { border-style: dashed; }
.uxw-affordance-heading > div { display: grid; }
.uxw-affordance p { margin: var(--rd-space-2) 0 0; }
.uxw-action-facts { display: flex; flex-wrap: wrap; gap: var(--rd-space-2) var(--rd-space-4); margin-top: var(--rd-space-2); color: var(--uxw-muted); font-size: 13px; }
.uxw-action-method { padding: var(--rd-space-2); border-left: 3px solid var(--uxw-line-strong); background: var(--uxw-soft); }
.uxw-feedback, .uxw-recovery, .uxw-alternate-inputs { margin-top: var(--rd-space-2); padding-left: var(--rd-space-4); list-style: square; }
.uxw-alternate-inputs span { color: var(--uxw-muted); }
.uxw-transition { padding-top: var(--rd-space-2); border-top: 1px solid var(--uxw-soft-strong); }
.uxw-empty { margin: var(--rd-space-2) 0 0; color: var(--uxw-muted); font-style: italic; }
.uxw-frame figcaption { margin-top: var(--rd-space-3); padding-top: var(--rd-space-2); border-top: 1px solid var(--uxw-line); color: var(--uxw-muted); font-size: 12px; line-height: 18px; }
@media (max-width: 760px) { .uxw-frame-heading, .uxw-region-heading, .uxw-affordance-heading { display: grid; } .uxw-state, .uxw-priority { width: max-content; } }
@media (forced-colors: active) { .uxw-frame, .uxw-region, .uxw-content, .uxw-affordance, .uxw-notice { border-color: CanvasText; } }
`;
}
