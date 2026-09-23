/** System-owned metadata carried beside application payloads. */
type SocketSystemData = Readonly<Record<string, unknown>>;

/** Timeout configuration for an acknowledged client request. */
type SocketRequestOptions = {
	/** Maximum acknowledgement wait in milliseconds. */
	timeout?: number;
};

/** Immutable transport envelope carrying application and system data. */
interface SocketEnvelope<T = unknown> {
	/** Feature-owned application payload. */
	readonly data: T;
	/** Centrally owned transport metadata. */
	readonly system: SocketSystemData;
}

/** Successful acknowledged transport response. */
interface SocketSuccess<T = unknown> {
	/** Successful response discriminator. */
	readonly success: true;
	/** Feature-owned response payload. */
	readonly data: T;
	/** Centrally owned response metadata. */
	readonly system: SocketSystemData;
}

/** Failed acknowledged transport response. */
interface SocketFailure {
	/** Failed response discriminator. */
	readonly success: false;
	/** Localizable failure description. */
	readonly reason: {readonly phrase: string; readonly replacements?: Readonly<Record<string, string | number>>};
	/** Centrally owned response metadata. */
	readonly system: SocketSystemData;
}

/** Acknowledged response returned to a client caller. */
type SocketResponse<T = unknown> = SocketSuccess<T> | SocketFailure;
