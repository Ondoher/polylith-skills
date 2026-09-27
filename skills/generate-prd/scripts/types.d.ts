/** Direct indexes over canonical local routes, independent of publication hierarchy. */
type UxFlowIndex = {
	steps: Map<string, Record<string, unknown>>;
	owners: Map<string, Record<string, unknown>>;
	alternates: Map<string, Record<string, unknown>>;
};
