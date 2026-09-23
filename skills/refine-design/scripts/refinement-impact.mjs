import crypto from 'node:crypto';

const nonMaterialKeys = new Set([
  'assessment',
  'checkedAt',
  'path',
  'revision',
  'reviewedAt',
  'sources'
]);

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

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

/**
 * Return the decision-bearing portion of a structured design. The projection
 * ignores run provenance and source-location metadata, but intentionally keeps
 * statuses, IDs, relationships, selected values, behavior, and visible copy.
 */
export function materialDesignView(value) {
  if (Array.isArray(value)) return value.map(materialDesignView);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (nonMaterialKeys.has(key)) continue;
    result[key] = materialDesignView(value[key]);
  }
  return result;
}

/** Compare two independent design runs without requiring byte-identical prose provenance. */
export function compareMaterialDesigns(left, right) {
  const leftHash = hash(materialDesignView(left));
  const rightHash = hash(materialDesignView(right));
  return {equivalent: leftHash === rightHash, leftHash, rightHash};
}

function ordered(records, project) {
  return [...(records ?? [])].sort((left, right) => String(left.id).localeCompare(String(right.id))).map(project);
}

function sorted(values) {
  return [...(values ?? [])].sort();
}

function sortedRecords(records, key, project) {
  return [...(records ?? [])].sort((left, right) => key(left).localeCompare(key(right))).map(project);
}

function enumText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : null;
}

function inputModality(value) {
  const normalized = enumText(value);
  if (!normalized) return null;
  for (const modality of ['keyboard', 'pointer', 'touch', 'voice', 'switch']) {
    if (normalized.includes(modality)) return modality;
  }
  return normalized;
}

function signature(value) {
  return JSON.stringify(canonical(value));
}

function multiset(values) {
  return [...values].sort((left, right) => signature(left).localeCompare(signature(right)));
}

function researchSelectionView(research) {
  const selected = (research.patterns ?? []).find(pattern => pattern.id === research.selection?.patternRef);
  const sources = new Map((research.sources ?? []).map(source => [source.id, source]));
  return {
    status: research.status,
    trigger: research.trigger,
    method: research.method,
    outcome: research.outcome,
    verificationStatus: research.verification?.status,
    hasSelection: Boolean(research.selection?.patternRef),
    hasUncertainty: Boolean(research.selection?.uncertainty),
    selectedSources: multiset((selected?.sourceRefs ?? []).map(ref => ({
      sourceType: sources.get(ref)?.sourceType ?? null,
      sourceUrl: sources.get(ref)?.sourceUrl ?? null,
    }))),
  };
}

/**
 * Project a UX 0.2 document to decisions that should converge across fresh
 * planners. Freshly coined IDs, prose, exact frame trees, and bookkeeping may
 * vary. The projection retains the behavioral graph: action type and exposure,
 * state applicability and transitions, feedback, cancellation, meaningful
 * failure recovery, selected research basis, and pruning of actual actions.
 */
export function interactionArchitectureView(value) {
  object(value, 'UX interaction architecture');
  const surfaceKinds = new Map((value.surfaces ?? []).map(surface => [surface.id, surface.kind]));
  const researchById = new Map((value.patternResearch ?? []).map(research => [research.id, research]));

  const actionBase = action => ({
    status: action.status,
    canonicalMethod: action.canonicalInteraction?.method,
    canonicalInput: inputModality(action.canonicalInteraction?.input),
    presentationClass: action.presentationClass,
    visibilityMode: action.visibility?.mode,
    persistence: action.persistence,
    priority: action.priority,
    applicableStates: multiset((action.applicableStates ?? []).map(state => ({
      surfaceKind: surfaceKinds.get(state.surfaceRef) ?? 'surface',
      state: state.state,
    }))),
    alternateInputs: multiset((action.alternateInputs ?? []).map(input => inputModality(input.input))),
    feedback: multiset((action.feedback ?? []).map(item => ({phase: item.phase, persistence: item.persistence}))),
    cancellationMode: action.cancellation?.mode,
    patternBasis: action.patternBasis ? {
      kind: action.patternBasis.kind,
      research: action.patternBasis.researchRef
        ? researchSelectionView(researchById.get(action.patternBasis.researchRef) ?? {})
        : null,
    } : null,
  });
  const actionTokens = new Map((value.actions ?? []).map(action => [action.id, signature(actionBase(action))]));
  const actionToken = ref => actionTokens.get(ref) ?? `unresolved:${ref}`;
  const feedbackById = new Map();
  for (const action of value.actions ?? []) {
    for (const feedback of action.feedback ?? []) {
      feedbackById.set(feedback.id, {action: actionToken(action.id), phase: feedback.phase, persistence: feedback.persistence});
    }
  }

  const actions = multiset((value.actions ?? []).map(action => ({
    ...actionBase(action),
    cancellationAction: action.cancellation?.actionRef ? actionToken(action.cancellation.actionRef) : null,
    // Recovery is decision-bearing when an action can fail. Corrective prose
    // attached to successful selection or cancellation is optional bookkeeping.
    failureRecovery: (action.feedback ?? []).some(item => item.phase === 'failure')
      ? multiset((action.recovery ?? []).flatMap(item => item.actionRefs ?? []).map(actionToken))
      : [],
  })));

  const useCases = multiset((value.useCases ?? []).map(useCase => ({
    status: useCase.status,
    taskPriority: useCase.taskPriority,
    actionSet: multiset((useCase.actionRefs ?? []).map(actionToken)),
    canonicalSequence: (useCase.steps ?? []).map(step => actionToken(step.actionRef)),
  })));

  const frameBehavior = multiset((value.interactionFrames ?? []).flatMap(frame =>
    (frame.regions ?? []).flatMap(region => (region.affordances ?? []).map(affordance => {
      const transition = affordance.transition ?? {kind: 'none'};
      const isSelfTransition = transition.kind === 'state' && transition.targetState === frame.state;
      const normalizedTransition = isSelfTransition ? {kind: 'none'} : transition;
      return {
        frameKind: frame.kind,
        state: frame.state,
        action: actionToken(affordance.actionRef),
        status: affordance.status,
        interaction: affordance.interaction,
        transition: {
          kind: normalizedTransition.kind,
          targetState: normalizedTransition.targetState ?? null,
          targetSurfaceKind: normalizedTransition.targetRef ? surfaceKinds.get(normalizedTransition.targetRef) ?? 'surface' : null,
        },
      };
    }))
  ));

  const feedbackPlacement = multiset((value.interactionFrames ?? []).flatMap(frame =>
    (frame.regions ?? []).flatMap(region => (region.content ?? [])
      .filter(item => item.kind === 'feedback')
      .map(item => ({
        state: frame.state,
        action: item.actionRef ? actionToken(item.actionRef) : feedbackById.get(item.feedbackRef)?.action ?? null,
        phase: feedbackById.get(item.feedbackRef)?.phase ?? null,
        persistence: feedbackById.get(item.feedbackRef)?.persistence ?? item.persistence,
      })))
  ));

  const pruning = multiset((value.pruningReview?.taskReviews ?? []).flatMap(review =>
    (review.decisions ?? []).flatMap(decision => (decision.actionRefs ?? []).map(ref => ({
      action: actionToken(ref),
      disposition: decision.disposition,
    })))
  ));

  return {
    schemaVersion: value.schemaVersion,
    status: value.status,
    useCases,
    actions,
    frameBehavior,
    feedbackPlacement,
    patternResearch: multiset((value.patternResearch ?? []).map(researchSelectionView)),
    pruning,
  };
}

/** Compare broad interaction decisions without requiring one preferred screen. */
export function compareInteractionArchitectures(left, right) {
  const leftHash = hash(interactionArchitectureView(left));
  const rightHash = hash(interactionArchitectureView(right));
  return {equivalent: leftHash === rightHash, leftHash, rightHash};
}

function sourceMap(sources, label) {
  if (!Array.isArray(sources)) fail(`${label} must be an array`);
  const result = new Map();
  for (const [index, source] of sources.entries()) {
    object(source, `${label}[${index}]`);
    const id = text(source.id, `${label}[${index}].id`);
    if (result.has(id)) fail(`${label} contains duplicate id ${id}`);
    const records = object(source.records ?? {}, `${label}[${index}].records`);
    result.set(id, {
      revision: source.revision,
      records: new Map(Object.keys(records).map(recordId => [recordId, hash(materialDesignView(records[recordId]))]))
    });
  }
  return result;
}

function changedRecords(previous, next) {
  const ids = new Set([...previous.records.keys(), ...next.records.keys()]);
  return [...ids].filter(id => previous.records.get(id) !== next.records.get(id)).sort();
}

/**
 * Classify structured artifacts after source changes. Record-level dependencies
 * keep unrelated decisions reusable; revision-only changes require an exact
 * source rebind without claiming the design itself is stale.
 */
export function assessRefinementImpact(previousSources, nextSources, artifacts) {
  const previous = sourceMap(previousSources, 'previousSources');
  const next = sourceMap(nextSources, 'nextSources');
  if (!Array.isArray(artifacts)) fail('artifacts must be an array');

  const sourceChanges = new Map();
  for (const sourceId of new Set([...previous.keys(), ...next.keys()])) {
    const before = previous.get(sourceId);
    const after = next.get(sourceId);
    if (!before || !after) {
      sourceChanges.set(sourceId, {kind: before ? 'removed' : 'added', records: ['*']});
      continue;
    }
    const records = changedRecords(before, after);
    if (records.length || before.revision !== after.revision) {
      sourceChanges.set(sourceId, {kind: records.length ? 'material' : 'revision-only', records});
    }
  }

  const results = artifacts.map((artifact, index) => {
    object(artifact, `artifacts[${index}]`);
    const id = text(artifact.id, `artifacts[${index}].id`);
    if (!Array.isArray(artifact.dependencies)) fail(`artifact ${id}.dependencies must be an array`);
    const reasons = [];
    let outcome = 'reusable';
    for (const [dependencyIndex, dependency] of artifact.dependencies.entries()) {
      object(dependency, `artifact ${id}.dependencies[${dependencyIndex}]`);
      const sourceId = text(dependency.sourceId, `artifact ${id}.dependencies[${dependencyIndex}].sourceId`);
      const change = sourceChanges.get(sourceId);
      if (!change) continue;
      const refs = dependency.recordRefs ?? ['*'];
      if (!Array.isArray(refs) || refs.some(ref => typeof ref !== 'string' || !ref)) fail(`artifact ${id} dependency ${sourceId}.recordRefs must contain text IDs`);
      const touchesMaterial = change.kind === 'added' || change.kind === 'removed' || refs.includes('*') || change.records.some(record => refs.includes(record));
      if (touchesMaterial && change.kind !== 'revision-only') {
        outcome = artifact.status === 'locked' ? 'locked-conflict' : 'stale';
        reasons.push({sourceId, kind: change.kind, records: change.records});
      } else if (outcome === 'reusable') {
        outcome = artifact.status === 'locked' ? 'locked-conflict' : 'rebind';
        reasons.push({sourceId, kind: 'revision-only', records: []});
      }
    }
    return {id, status: artifact.status ?? 'accepted', outcome, reasons};
  });

  return {
    sources: Object.fromEntries([...sourceChanges.entries()]),
    artifacts: results,
    stale: results.filter(item => item.outcome === 'stale').map(item => item.id),
    rebind: results.filter(item => item.outcome === 'rebind').map(item => item.id),
    reusable: results.filter(item => item.outcome === 'reusable').map(item => item.id),
    lockedConflicts: results.filter(item => item.outcome === 'locked-conflict').map(item => item.id)
  };
}
