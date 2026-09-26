import {validateProductModel} from './product-model.mjs';
import {validateUxSpec} from './ux-design.mjs';

const uxRef = (kind, id) => `ux:${kind}:${id}`;
const idFromRef = ref => ref.slice(ref.lastIndexOf(':') + 1);

function ids(records) {
  return [...new Set(records)].sort();
}

function reachableNodes(ux, useCase) {
  const nodes = new Map(ux.flowNodes.map(node => [node.id, node]));
  const edges = new Map();
  for (const edge of ux.flowEdges) {
    if (!edges.has(edge.fromRef)) edges.set(edge.fromRef, []);
    edges.get(edge.fromRef).push(edge);
  }
  const visited = new Set();
  const queue = [useCase.entryNodeRef];
  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    for (const edge of edges.get(id) ?? []) {
      if (edge.toRef.startsWith('ux:flow-node:')) queue.push(idFromRef(edge.toRef));
      if (edge.toRef.startsWith('ux:recovery:')) {
        const recovery = ux.recoveryPaths.find(item => item.id === idFromRef(edge.toRef));
        if (recovery) queue.push(recovery.returnNodeRef);
      }
    }
  }
  return {visited, nodes};
}

/** A bounded implementation input made entirely from current semantic IDs. */
export function buildUseCaseHandoff(model, ux, useCaseId, ui = null) {
  validateProductModel(model);
  validateUxSpec(ux);
  const useCase = ux.useCases.find(item => item.id === useCaseId);
  if (!useCase) throw new Error(`Unknown use case ${useCaseId}`);
  const {visited, nodes} = reachableNodes(ux, useCase);
  const actions = new Set(useCase.actionRefs);
  for (const id of visited) if (nodes.get(id)?.actionRef) actions.add(nodes.get(id).actionRef);
  const actionRecords = ux.actions.filter(item => actions.has(item.id));
  const stateRefs = ids(actionRecords.flatMap(item => item.applicableStateRefs));
  const feedbackRefs = ids(actionRecords.flatMap(item => item.feedbackRefs));
  const recoveryRefs = ids(actionRecords.flatMap(item => item.recoveryRefs));
  const frameRefs = ids([
    ...ux.interactionFrames.filter(frame => frame.taskRefs.includes(useCaseId)).map(frame => frame.id),
    ...[...visited].map(id => nodes.get(id)?.frameRef).filter(Boolean),
  ]);
  const subjectRefs = new Set([
    uxRef('use-case', useCaseId),
    ...[...visited].map(id => uxRef('flow-node', id)),
    ...[...actions].map(id => uxRef('action', id)),
    ...stateRefs.map(id => uxRef('state', id)),
    ...feedbackRefs.map(id => uxRef('feedback', id)),
    ...recoveryRefs.map(id => uxRef('recovery', id)),
    ...frameRefs.map(id => uxRef('frame', id)),
  ]);
  const realizations = ux.productRealizations.filter(item => subjectRefs.has(item.uxRef));
  const productRefs = new Set(realizations.map(item => item.productRef));
  const relatedRules = model.rules.filter(item => item.appliesToRefs.some(ref => productRefs.has(`product:${ref}`)));
  for (const item of relatedRules) productRefs.add(`product:${item.id}`);
  const gaps = ux.traceGaps.filter(item => subjectRefs.has(item.sourceRef) || productRefs.has(item.sourceRef));
  const scenes = ui?.scenes.filter(scene => scene.useCaseRefs.includes(useCaseId)
    && scene.depictsRefs.some(ref => subjectRefs.has(ref))) ?? [];
  const invokedNodes = ux.flowEdges.filter(edge => visited.has(edge.fromRef) && edge.kind === 'invokes')
    .map(edge => nodes.get(idFromRef(edge.toRef))).filter(Boolean);
  return {
    productModelRef: `product:${model.id}`,
    uxArtifactRef: uxRef('artifact', ux.id),
    useCaseRef: uxRef('use-case', useCaseId),
    productRefs: ids(productRefs),
    realizationRefs: ids(realizations.map(item => item.id)),
    canonicalStepRefs: [...(ux.pruningReview.taskReviews.find(item => item.taskRef === useCaseId)?.canonicalStepRefs ?? [])],
    flowNodeRefs: ids([...visited]),
    flowEdgeRefs: ids(ux.flowEdges.filter(item => visited.has(item.fromRef)).map(item => item.id)),
    actionRefs: ids([...actions]),
    stateRefs,
    feedbackRefs,
    recoveryRefs,
    frameRefs,
    sharedComponentRefs: ids(invokedNodes.map(node => node.ownerRef)),
    sharedBehaviorNodeRefs: ids(invokedNodes.map(node => node.id)),
    uiSceneRefs: ids(scenes.map(scene => scene.id)),
    traceGapRefs: ids(gaps.map(item => item.id)),
  };
}

/** Reverse trace a changed product or UX record to every affected use case. */
export function affectedUseCases(ux, changedRef, model = null) {
  validateUxSpec(ux);
  if (model) validateProductModel(model);
  const candidates = new Set();
  const visitedRefs = new Set();
  const queue = [changedRef];
  while (queue.length) {
    const ref = queue.shift();
    if (visitedRefs.has(ref)) continue;
    visitedRefs.add(ref);
    if (ref.startsWith('product:')) {
      const directRealizations = ux.productRealizations.filter(item => item.productRef === ref);
      for (const relation of directRealizations) queue.push(relation.uxRef);
      if (model) {
        const id = idFromRef(ref);
        for (const rule of model.rules.filter(item => item.id === id)) {
          for (const target of rule.appliesToRefs) queue.push(`product:${target}`);
        }
        for (const requirement of model.requirements.filter(item => item.id === id && directRealizations.length === 0)) {
          for (const target of requirement.goalRefs) queue.push(`product:${target}`);
        }
        for (const goal of model.goals.filter(item => item.id === id)) {
          for (const requirement of model.requirements.filter(item => item.goalRefs.includes(goal.id))) {
            queue.push(`product:${requirement.id}`);
          }
        }
      }
      continue;
    }
    const kind = ref.split(':')[1];
    const id = idFromRef(ref);
    if (kind === 'use-case') candidates.add(id);
    if (kind === 'action') for (const taskRef of ux.actions.find(item => item.id === id)?.taskRefs ?? []) candidates.add(taskRef);
    if (kind === 'state') {
      for (const action of ux.actions.filter(item => item.applicableStateRefs.includes(id))) queue.push(uxRef('action', action.id));
      const ownerRef = ux.states.find(item => item.id === id)?.ownerRef;
      if (ownerRef?.startsWith('ux:component:')) queue.push(ownerRef);
    }
    if (kind === 'feedback') queue.push(uxRef('action', ux.feedback.find(item => item.id === id)?.actionRef));
    if (kind === 'recovery') queue.push(ux.recoveryPaths.find(item => item.id === id)?.ownerRef);
    if (kind === 'flow-node') {
      const node = ux.flowNodes.find(item => item.id === id);
      if (node?.ownerRef.startsWith('ux:use-case:')) candidates.add(idFromRef(node.ownerRef));
      if (node?.ownerRef.startsWith('ux:component:')) {
        for (const edge of ux.flowEdges.filter(item => item.kind === 'invokes' && item.toRef === ref)) {
          queue.push(uxRef('flow-node', edge.fromRef));
        }
      }
    }
    if (kind === 'flow-edge') {
      const edge = ux.flowEdges.find(item => item.id === id);
      if (edge) queue.push(uxRef('flow-node', edge.fromRef));
    }
    if (kind === 'component') for (const node of ux.flowNodes.filter(item => item.ownerRef === ref)) queue.push(uxRef('flow-node', node.id));
  }
  return ids(candidates);
}
