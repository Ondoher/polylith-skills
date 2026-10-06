/** Direct indexes over canonical local routes, independent of publication hierarchy. */
type UxFlowIndex = {
	steps: Map<string, Record<string, unknown>>;
	owners: Map<string, Record<string, unknown>>;
	alternates: Map<string, Record<string, unknown>>;
};

/** Portable exact reviewed-image handoff consumed by publication. */
interface UiCapturePublicationSources {
	ui: {
		renderRequests: Array<{id: string; sceneRef: string; output: string; variant: string}>;
		[key: string]: unknown;
	};
	ux: object;
	designLanguage: object;
	components?: object[];
}
interface UiCapturePublication {
	schemaVersion: '1.0';
	renderFiles: Array<{id: string; path: string; sha256: string; mimeType: string}>;
	sources: {ui: string; ux: string; designLanguage: string; components: string[]};
	review: {
		subjectSha256: string;
		reviewerAgentId: string;
		authorAgentIds: string[];
		verdict: 'pass';
		inspectedScreenshotRefs: string[];
	};
	assets: Array<{id: string; kind: 'image'; path: string; mimeType: 'image/png'; sha256: string}>;
	screenshots: Array<{
		ref: string;
		sceneRef: string;
		renderOutput: string;
		variant: 'clean' | 'annotated';
		artifactKind: 'comp' | 'wireframe';
		path: string;
		width: number;
		height: number;
	}>;
}
