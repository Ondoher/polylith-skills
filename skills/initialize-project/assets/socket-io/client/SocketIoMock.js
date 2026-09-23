/** Deterministic Socket.IO client test double with listener and emission inspection. */
export class SocketIoClientMock {
	/** Creates a connected client namespace mock. @param {string} name - The namespace name. */
	constructor(name) {
		this.name = name;
		this.connected = true;
		this.listeners = new Map();
		this.emissions = [];
		this.acknowledgement = {success: true, data: {}, system: {}};
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

	/** Call this method to record an acknowledgement timeout. @param {number} value - The timeout in milliseconds. @returns {SocketIoClientMock} - This mock. */
	timeout(value) {
		this.timeoutValue = value;
		return this;
	}

	/** Call this method to record an acknowledged request and return its configured response. @param {string} event - The event name. @param {unknown} data - The request payload. @returns {Promise<unknown>} - The configured acknowledgement. */
	async emitWithAck(event, data) {
		this.emissions.push({event, data});
		if (this.acknowledgement instanceof Error) throw this.acknowledgement;
		return this.acknowledgement;
	}

	/** Call this method to deliver a server event to registered listeners. @param {string} event - The event name. @param {unknown} data - The event payload. */
	receive(event, data) {
		for (const listener of this.listeners.get(event) ?? []) listener(data);
	}

	/** Call this method to mark the mock namespace disconnected. */
	disconnect() {
		this.connected = false;
	}
}
