const assessmentKinds = new Map([
  ['ux-planner', 'ux-planner-assessment'],
  ['ui-designer', 'ui-designer-assessment'],
  ['system-architect', 'system-architect-assessment'],
  ['model-agent', 'model-agent-assessment'],
  ['controller-agent', 'controller-agent-assessment'],
  ['polylith-architect', 'polylith-architect-assessment']
]);

/** Select honest assessment provenance before constructing a specialist-owned proposal. */
export function selectAssessmentProvenance({requestedRole, availableRoles = [], consultationSucceeded = true, parentDescription, specialistDescription}) {
  if (!assessmentKinds.has(requestedRole)) throw new Error(`Unknown specialist role: ${requestedRole}`);
  if (!Array.isArray(availableRoles)) throw new Error('availableRoles must be an array');
  const available = availableRoles.includes(requestedRole) && consultationSucceeded;
  return available
    ? {kind: assessmentKinds.get(requestedRole), description: specialistDescription ?? `${requestedRole} assessment.`}
    : {kind: 'parent-assessment', description: parentDescription ?? `Parent assessment because ${requestedRole} was unavailable.`};
}
