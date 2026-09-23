import {Service} from '@polylith/core';

const APP_NAMESPACE = '/{{SLUG}}';

/** Server transport service for Socket.IO namespaces, clients, handlers, and immutable envelopes. */
export class SocketStreamService extends Service {
	/**
	 * Creates a detached server stream service ready for namespace registration.
	 *
	 * @param {unknown} registry - The owning Polylith registry.
	 */
	constructor(registry) {
		super('{{SLUG}}-socket-stream', registry);
		this.implement(['setup', 'namespace', 'register', 'unregister', 'send', 'broadcast', 'close']);
		this.io = null;
		this.namespaces = new Map();
		this.clients = new Map();
		this.socketStates = new Map();
		this.rootConnectionListener = null;
	}

	/**
	 * Called by stream operations to validate and prefix a namespace.
	 *
	 * @param {string} name - The local or already-prefixed namespace.
	 * @returns {string} - The normalized application namespace.
	 * @throws {Error} - When the namespace is empty or unsafe.
	 */
	normalizeNamespace(name) {
		let localName = String(name ?? '').replace(/^\/+|\/+$/g, '');
		const prefix = `${APP_NAMESPACE.slice(1)}/`;
		if (localName.startsWith(prefix)) localName = localName.slice(prefix.length);
		if (!localName || localName.includes('..') || !/^[a-z0-9][a-z0-9/_-]*$/i.test(localName)) {
			throw new Error(`Invalid Socket.IO namespace: ${name}`);
		}
		return `${APP_NAMESPACE}/${localName}`;
	}

	/**
	 * Call this method to attach the Polylith-provided Socket.IO server and materialize registrations.
	 *
	 * @param {unknown} io - The configured Socket.IO server.
	 * @throws {TypeError} - When the supplied value does not provide the required server API.
	 */
	setup(io) {
		if (!io || typeof io.on !== 'function' || typeof io.off !== 'function' || typeof io.of !== 'function') {
			throw new TypeError('A Socket.IO server is required.');
		}
		if (this.io === io) return;
		this.detachTransport();
		this.io = io;
		this.rootConnectionListener = (socket) => this.trackSocket('/', socket);
		this.io.on('connection', this.rootConnectionListener);
		for (const entry of this.namespaces.values()) this.materialize(entry);
		this.fire('io-ready');
	}

	/** Call this method to register or resolve an application-prefixed namespace. @param {string} name - The namespace name. @returns {string} - The normalized namespace. */
	namespace(name) {
		return this.getOrCreateEntry(name).name;
	}

	/** Called by stream operations to reuse or create a namespace registration. @param {string} name - The namespace name. @returns {object} - The tracked namespace entry. */
	getOrCreateEntry(name) {
		const normalized = this.normalizeNamespace(name);
		let entry = this.namespaces.get(normalized);
		if (!entry) {
			entry = {name: normalized, namespace: null, connectionListener: null, handlers: new Map(), sockets: new Set()};
			this.namespaces.set(normalized, entry);
			if (this.io) this.materialize(entry);
		}
		return entry;
	}

	/** Called after transport setup to bind a deferred namespace registration. @param {object} entry - The namespace entry to bind. */
	materialize(entry) {
		if (entry.namespace || !this.io) return;
		entry.namespace = this.io.of(entry.name);
		entry.connectionListener = (socket) => this.trackSocket(entry.name, socket);
		entry.namespace.on('connection', entry.connectionListener);
	}

	/**
	 * Call this method to register a request handler for future and connected sockets.
	 *
	 * @param {string} name - The namespace name.
	 * @param {string} event - The request event name.
	 * @param {Function} handler - The feature-owned request handler.
	 * @returns {Function} - A function that removes the exact handler.
	 * @throws {TypeError} - When the supplied handler is not callable.
	 */
	register(name, event, handler) {
		if (typeof handler !== 'function') throw new TypeError('Socket.IO handler must be a function.');
		const entry = this.getOrCreateEntry(name);
		if (!entry.handlers.has(event)) entry.handlers.set(event, new Set());
		entry.handlers.get(event).add(handler);
		for (const socket of entry.sockets) this.bindHandler(entry, socket, event, handler);
		return () => this.unregister(name, event, handler);
	}

	/**
	 * Call this method to remove an exact request handler.
	 *
	 * @param {string} name - The namespace name.
	 * @param {string} event - The request event name.
	 * @param {Function} handler - The original feature handler.
	 * @returns {boolean} - Whether a handler was removed.
	 */
	unregister(name, event, handler) {
		const entry = this.namespaces.get(this.normalizeNamespace(name));
		if (!entry?.handlers.get(event)?.delete(handler)) return false;
		for (const socket of entry.sockets) this.unbindHandler(socket, event, handler);
		if (entry.handlers.get(event).size === 0) entry.handlers.delete(event);
		return true;
	}

	/** Called by connection listeners to track client and namespace ownership. @param {string} namespace - The connected namespace. @param {unknown} socket - The connected Socket.IO socket. */
	trackSocket(namespace, socket) {
		if (this.socketStates.has(socket)) return;
		const clientId = String(socket.conn?.id ?? socket.id);
		let client = this.clients.get(clientId);
		const firstConnection = !client;
		if (!client) {
			client = {id: clientId, sockets: new Set()};
			this.clients.set(clientId, client);
		}
		const disconnected = (reason) => this.detachSocket(socket, reason);
		const state = {clientId, namespace, socket, disconnected, bindings: new Map()};
		this.socketStates.set(socket, state);
		client.sockets.add(socket);
		socket.on('disconnect', disconnected);
		if (namespace !== '/') {
			const entry = this.namespaces.get(namespace);
			entry.sockets.add(socket);
			for (const [event, handlers] of entry.handlers) {
				for (const handler of handlers) this.bindHandler(entry, socket, event, handler);
			}
			this.fire('namespace-connected', namespace, clientId);
		}
		if (firstConnection) this.fire('client-connected', clientId);
	}

	/** Called by registration and connection handling to bind an immutable request adapter. @param {object} entry - The namespace entry. @param {unknown} socket - The connected socket. @param {string} event - The request event name. @param {Function} handler - The feature handler. */
	bindHandler(entry, socket, event, handler) {
		const state = this.socketStates.get(socket);
		if (!state.bindings.has(event)) state.bindings.set(event, new Map());
		if (state.bindings.get(event).has(handler)) return;
		const wrapped = async (envelope, acknowledge = () => {}) => {
			if (!isEnvelope(envelope)) {
				console.error(`Invalid Socket.IO request envelope: ${entry.name}:${event}`);
				acknowledge(this.failure('socket.invalid_request'));
				return;
			}
			try {
				const baseContext = {clientId: state.clientId, namespace: entry.name, event, data: envelope.data, system: envelope.system};
				const context = await this.prepareContext(baseContext);
				if (!isRecord(context)) throw new TypeError('Socket.IO prepareContext must return a request context.');
				const result = await handler(context);
				acknowledge(this.normalizeResult(result, context));
			} catch (error) {
				console.error(`Socket.IO handler failed: ${entry.name}:${event}`, error);
				acknowledge(this.failure('socket.server_error'));
			}
		};
		state.bindings.get(event).set(handler, wrapped);
		socket.on(event, wrapped);
	}

	/** Called by handler removal to detach an exact socket binding. @param {unknown} socket - The connected socket. @param {string} event - The request event name. @param {Function} handler - The feature handler. */
	unbindHandler(socket, event, handler) {
		const bindings = this.socketStates.get(socket)?.bindings.get(event);
		const wrapped = bindings?.get(handler);
		if (!wrapped) return;
		socket.off(event, wrapped);
		bindings.delete(handler);
		if (bindings.size === 0) this.socketStates.get(socket).bindings.delete(event);
	}

	/** Call this method to add centrally owned requirements to a request context. @param {SocketRequestContext} context - The base immutable request context. @returns {Promise<SocketRequestContext>} - The context supplied to the feature handler. */
	async prepareContext(context) {
		return context;
	}

	/** Call this method to provide centrally owned metadata for a response or event. @param {object} _context - The operation context. @returns {SocketSystemData} - System metadata for the envelope. */
	getSystemData(_context) {
		return {};
	}

	/** Called after a feature handler to validate its result and add system metadata. @param {unknown} result - The feature-owned handler result. @param {SocketRequestContext} context - The completed request context. @returns {object} - The acknowledged response envelope. */
	normalizeResult(result, context) {
		const system = this.getSystemData(context);
		if (!isRecord(system)) { console.error('Invalid Socket.IO outbound system metadata.'); return this.failure('socket.invalid_response'); }
		if (!isRecord(result) || typeof result.success !== 'boolean') {
			console.error(`Invalid Socket.IO handler response: ${context.namespace}:${context.event}`);
			return this.failure('socket.invalid_response', system);
		}
		if (result.success && Object.hasOwn(result, 'data')) return {success: true, data: result.data, system};
		if (!result.success && isReason(result.reason)) {
			return {success: false, reason: result.reason, system};
		}
		return this.failure('socket.invalid_response', system);
	}

	/** Called by request handling to create a localizable failure envelope. @param {string} phrase - The failure phrase key. @param {SocketSystemData} system - System metadata for the response. @returns {object} - The failure response envelope. */
	failure(phrase, system = {}) {
		return {success: false, reason: {phrase}, system};
	}

	/** Called by outgoing operations to wrap application data without modifying it. @param {unknown} data - The feature-owned payload. @param {object} context - The outgoing event context. @returns {SocketEnvelope} - The transport envelope. */
	createEnvelope(data, context) {
		const system = this.getSystemData(context);
		if (!isRecord(system)) { console.error('Invalid Socket.IO outbound system metadata.'); return null; }
		return {data, system};
	}

	/** Call this method to send an immutable envelope to one connected client. @param {string} name - The namespace name. @param {string} clientId - The transport client identifier. @param {string} event - The event name. @param {unknown} data - The feature-owned payload. @returns {boolean} - Whether the event was emitted. */
	send(name, clientId, event, data) {
		const entry = this.namespaces.get(this.normalizeNamespace(name));
		const client = this.clients.get(clientId);
		const socket = [...(client?.sockets ?? [])].find((candidate) => this.socketStates.get(candidate)?.namespace === entry?.name);
		if (!socket) {
			console.warn(`Socket.IO client is not connected: ${clientId}:${entry?.name ?? name}`);
			return false;
		}
		const envelope = this.createEnvelope(data, {clientId, namespace: entry.name, event});
		if (!envelope) return false;
		socket.emit(event, envelope);
		return true;
	}

	/** Call this method to broadcast an immutable envelope to a namespace. @param {string} name - The namespace name. @param {string} event - The event name. @param {unknown} data - The feature-owned payload. @returns {boolean} - Whether the event was emitted. */
	broadcast(name, event, data) {
		const entry = this.namespaces.get(this.normalizeNamespace(name));
		if (!entry?.namespace) return false;
		const envelope = this.createEnvelope(data, {namespace: entry.name, event});
		if (!envelope) return false;
		entry.namespace.emit(event, envelope);
		return true;
	}

	/** Called by disconnect and transport cleanup to release one socket. @param {unknown} socket - The socket to release. @param {unknown} reason - The disconnect reason. */
	detachSocket(socket, reason) {
		const state = this.socketStates.get(socket);
		if (!state) return;
		for (const [event, handlers] of state.bindings) {
			for (const wrapped of handlers.values()) socket.off(event, wrapped);
		}
		socket.off('disconnect', state.disconnected);
		this.socketStates.delete(socket);
		if (state.namespace !== '/') {
			this.namespaces.get(state.namespace)?.sockets.delete(socket);
			this.fire('namespace-disconnected', state.namespace, state.clientId, reason);
		}
		const client = this.clients.get(state.clientId);
		client?.sockets.delete(socket);
		if (client?.sockets.size === 0) {
			this.clients.delete(state.clientId);
			this.fire('client-disconnected', state.clientId, reason);
		}
	}

	/** Called by setup and close to release all transport-owned resources while preserving registrations. */
	detachTransport() {
		if (this.io && this.rootConnectionListener) this.io.off('connection', this.rootConnectionListener);
		for (const socket of [...this.socketStates.keys()]) this.detachSocket(socket, 'transport-closed');
		for (const entry of this.namespaces.values()) {
			if (entry.namespace && entry.connectionListener) entry.namespace.off('connection', entry.connectionListener);
			entry.namespace = null;
			entry.connectionListener = null;
			entry.sockets.clear();
		}
		this.clients.clear();
		this.io = null;
		this.rootConnectionListener = null;
	}

	/** Call this method to detach the transport and discard namespace registrations. */
	close() {
		this.detachTransport();
		this.namespaces.clear();
	}
}

/** Called by envelope validation to recognize a non-array record. @param {unknown} value - The candidate value. @returns {boolean} - Whether the value is a record. */
function isRecord(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Called by request handling to validate an immutable data envelope. @param {unknown} value - The candidate value. @returns {boolean} - Whether the value is a data envelope. */
function isEnvelope(value) {
	return isRecord(value) && Object.hasOwn(value, 'data') && isRecord(value.system);
}

/** Called by handler-result validation to recognize a localizable failure reason. @param {unknown} value - The candidate reason. @returns {boolean} - Whether the reason is valid. */
function isReason(value) {
	if (!isRecord(value) || typeof value.phrase !== 'string') return false;
	if (value.replacements === undefined) return true;
	return isRecord(value.replacements) && Object.values(value.replacements).every((item) => typeof item === 'string' || typeof item === 'number' && Number.isFinite(item));
}

new SocketStreamService();
