/** Deterministic event-target test double for server transport tests. */
export class EventTargetMock {
	/** Creates an event target with listener and emission inspection. */
	constructor() {
		this.listeners = new Map();
		this.emissions = [];
	}
	/** Call this method to register an event listener. @param {string} event - The event name. @param {Function} listener - The listener. */
	on(event, listener) {
		if (!this.listeners.has(event)) this.listeners.set(event, new Set());
		this.listeners.get(event).add(listener);
	}
	/** Call this method to remove an event listener. @param {string} event - The event name. @param {Function} listener - The listener. */
	off(event, listener) {
		this.listeners.get(event)?.delete(listener);
	}
	/** Call this method to record an outgoing event. @param {string} event - The event name. @param {unknown} data - The event payload. */
	emit(event, data) {
		this.emissions.push({event, data});
	}
	/** Call this method to deliver an incoming event. @param {string} event - The event name. @param {...unknown} args - Listener arguments. */
	receive(event, ...args) {
		for (const listener of this.listeners.get(event) ?? []) listener(...args);
	}
}

/** Connected server socket test double with shared root-client identity. */
export class SocketMock extends EventTargetMock {
	/** Creates a socket mock. @param {string} id - The socket identifier. @param {string} rootId - The shared client identifier. */
	constructor(id, rootId = id) {
		super();
		this.id = id;
		this.conn = {id: rootId};
	}
}

/** Socket.IO server test double with deterministic namespaces. */
export class SocketIoServerMock extends EventTargetMock {
	/** Creates a server mock with no namespaces. */
	constructor() {
		super();
		this.namespaces = new Map();
	}
	/** Call this method to reuse or create a namespace event target. @param {string} name - The namespace name. @returns {EventTargetMock} - The namespace target. */
	of(name) {
		if (!this.namespaces.has(name)) this.namespaces.set(name, new EventTargetMock());
		return this.namespaces.get(name);
	}
}
