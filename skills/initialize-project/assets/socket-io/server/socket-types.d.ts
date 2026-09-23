/** System-owned metadata carried beside application payloads. */
type SocketSystemData = Readonly<Record<string, unknown>>;

/** Immutable transport envelope carrying application and system data. */
interface SocketEnvelope<T = unknown> {
	/** Feature-owned application payload. */
	readonly data: T;
	/** Centrally owned transport metadata. */
	readonly system: SocketSystemData;
}

/** Feature-owned result returned by a server request handler. */
type SocketHandlerResult<T = unknown> =
	| {readonly success: true; readonly data: T}
	| {readonly success: false; readonly reason: {readonly phrase: string; readonly replacements?: Readonly<Record<string, string | number>>}};

/** Request context prepared centrally before a feature handler runs. */
interface SocketRequestContext<T = unknown> {
	/** Transport-level identifier shared by a client's sockets. */
	readonly clientId: string;
	/** Fully prefixed namespace receiving the request. */
	readonly namespace: string;
	/** Socket.IO event that carried the request. */
	readonly event: string;
	/** Feature-owned application payload. */
	readonly data: T;
	/** Centrally owned request metadata. */
	readonly system: SocketSystemData;
}
