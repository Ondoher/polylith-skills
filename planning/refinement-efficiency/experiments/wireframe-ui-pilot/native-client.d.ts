/** Explicit experiment-only launcher configuration; authentication remains owned by Codex. */
type NativeClientOptions = {
	/** Existing governance checkout containing the native launcher. */
	governance: string;
	/** Existing disposable working directory and sole model workspace write root. */
	workspace: string;
	/** Parent-owned directory for private prompts, native events and completion evidence. */
	outputDirectory: string;
	/** Assigned local workflow MCP server URL. */
	url: string;
	/** Private MCP bearer token, forwarded only through the child environment. */
	token: string;
	/** Explicit model slugs to prepare in the disposable catalog. */
	models: string[];
	/** Optional synchronous compact-metadata sink; callers must not throw. */
	event?: (event: NativeClientEvent) => void;
};

/** Inherited normal-authentication environment with an experiment MCP token; never public evidence. */
type NativeClientEnvironment = Record<string, string | undefined>;

/** One turn in an author role's persistent native thread. */
type NativeClientRunOptions = {
	/** Filesystem-safe experiment role identity, retained across sequential calls. */
	role: string;
	/** Previously prepared model slug. */
	model: string;
	/** Explicit supported reasoning effort. */
	effort: string;
	/** Full task input, saved only in private evidence. */
	prompt: string;
	/** Optional existing session; omitted values reuse this client's prior role thread. */
	threadId?: string;
};

/** Final native process outcome, returned only after the process closes. */
type NativeClientResult = {
	/** Observed native session identity, or null when startup failed before session creation. */
	threadId: string | null;
	/** CLI process exit status; signal termination is represented as one. */
	exitCode: number;
	/** UTC ISO timestamp immediately before process creation. */
	startedAt: string;
	/** UTC ISO timestamp after process closure. */
	endedAt: string;
	/** Monotonic process duration, in milliseconds. */
	elapsedMs: number;
	/** Native turn usage counters when completion was reported. */
	usage: Record<string, number> | null;
	/** Private final-message destination; failed runs may not create it. */
	resultPath: string;
};

/** Requested invocation fields used only while assembling CLI arguments. */
type NativeClientInvocation = {
	/** Explicit model slug. */
	model: string;
	/** Explicit reasoning effort. */
	effort: string;
	/** Optional persistent role thread identity. */
	threadId?: string;
	/** Final-message destination. */
	resultPath: string;
	/** Task-scoped developer instruction text. */
	instructions: string;
};

/** Effective settings projected from native saved turn-context metadata. */
type NativeClientRuntime = {
	/** Effective model, when recorded by the CLI. */
	model?: string;
	/** Effective reasoning effort, when recorded by the CLI. */
	effort?: string;
	/** Native working directory, when recorded by the CLI. */
	cwd?: string;
	/** Native approval policy, when recorded by the CLI. */
	approvalPolicy?: string;
	/** Native sandbox mode, when recorded by the CLI. */
	sandboxMode?: string;
};

/** Compact public lifecycle metadata; excludes prompts, credentials and model output text. */
type NativeClientEvent = {
	/** Event identifier prefixed with native. */
	type: string;
	/** Owning author role. */
	role: string;
	/** Additional allowlisted runtime fields appropriate to the event. */
	[field: string]: unknown;
};

/** Minimal native test runner capabilities used by the disposable fixture. */
type NativeClientTestContext = {
	/** Registration of fixture cleanup after the test completes. */
	after: (cleanup: () => void) => void;
	/** Test-owned replacement of the process boundary. */
	mock: {
		/** Replacement method registration, restored by the runner. */
		method: (target: object, name: string, implementation: (args: string[]) => object) => unknown;
	};
};

/** Fake stream capabilities exercised at the child-process boundary. */
type NativeClientFakeStream = {
	/** Immediate text delivery to the stream. */
	write: (text: string) => boolean;
	/** Previously written bytes available to the test. */
	read: () => {toString: () => string};
};

/** Externally controlled fake CLI process invocation. */
type NativeClientFakeCall = {
	/** Captured launcher argument vector. */
	args: string[];
	/** Fake process capabilities used to deliver native completion or startup failure. */
	child: {
		/** Prompt input stream. */
		stdin: NativeClientFakeStream;
		/** Native JSONL output stream. */
		stdout: NativeClientFakeStream;
		/** Private diagnostic output stream. */
		stderr: NativeClientFakeStream;
		/** Process lifecycle notification under test control. */
		emit: (event: string, value: number | Error) => boolean;
	};
};

/** Disposable test fixture with all lifecycle controls kept outside the launcher. */
type NativeClientFixture = {
	/** Launcher capabilities observed by the test. */
	client: {
		/** Disposable model working directory. */
		workspace: string;
		/** Public asynchronous turn execution. */
		run: (options: NativeClientRunOptions) => Promise<NativeClientResult>;
	};
	/** Captured fake CLI invocations in dispatch order. */
	calls: NativeClientFakeCall[];
	/** Credential-free lifecycle events in observed order. */
	events: NativeClientEvent[];
	/** Test-only Codex home holding catalog and session fixtures. */
	home: string;
};
