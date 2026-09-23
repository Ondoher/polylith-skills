import {Service} from '@polylith/core';
import {io as connectSocket} from 'socket.io-client';

const APP_NAMESPACE = '/{{SLUG}}';

/** Client transport service for application-prefixed Socket.IO namespaces and immutable envelopes. */
export class SocketStreamService extends Service {
	/**
	 * Creates a client stream service with an injectable Socket.IO connector.
	 *
	 * @param {unknown} registry - The owning Polylith registry.
	 * @param {Function} connect - The Socket.IO namespace connector.
	 */
	constructor(registry, connect = connectSocket) {
		super('socket-stream', registry);
		this.connect = connect;
		this.implement(['start', 'namespace', 'on', 'off', 'send', 'request', 'closeNamespace', 'stop']);
		this.namespaces = new Map();
	}

	/** Call this method to satisfy the service lifecycle before namespaces are requested. */
	start() {}

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
	 * Call this method to resolve and materialize a namespace.
	 *
	 * @param {string} name - The local or already-prefixed namespace.
	 * @returns {string} - The normalized application namespace.
	 */
	namespace(name) {
		return this.getOrCreateNamespace(name).name;
	}

	/**
	 * Called by stream operations to reuse or connect a namespace entry.
	 *
	 * @param {string} name - The namespace to resolve.
	 * @returns {object} - The tracked namespace entry.
	 */
	getOrCreateNamespace(name) {
		const normalized = this.normalizeNamespace(name);
		let entry = this.namespaces.get(normalized);
		if (entry) return entry;

		const socket = this.connect(normalized);
		const connected = () => this.fire('connected', normalized);
		const disconnected = (reason) => this.fire('disconnected', normalized, reason);
		socket.on('connect', connected);
		socket.on('disconnect', disconnected);
		entry = {name: normalized, socket, connected, disconnected, listeners: new Map()};
		this.namespaces.set(normalized, entry);
		return entry;
	}

	/** Call this method to provide centrally owned metadata for an outgoing envelope. @returns {SocketSystemData} - System metadata for the request. */
	getSystemData() {
		return {};
	}

	/** Called by incoming-envelope handling to apply centrally owned metadata. @param {SocketSystemData} _system - Response or event metadata. */
	applySystemData(_system) {}

	/** Called by outgoing operations to wrap application data without modifying it. @param {unknown} data - The feature-owned payload. @returns {SocketEnvelope} - The transport envelope. */
	createEnvelope(data) {
		const system = this.getSystemData();
		if (!isRecord(system)) { console.error('Invalid Socket.IO outbound system metadata.'); return null; }
		return {data, system};
	}

	/**
	 * Call this method to subscribe to immutable event-envelope data.
	 *
	 * @param {string} name - The namespace name.
	 * @param {string} event - The event name.
	 * @param {Function} listener - The feature-owned event consumer.
	 * @returns {Function} - A function that removes the exact listener.
	 * @throws {TypeError} - When the supplied listener is not callable.
	 */
	on(name, event, listener) {
		if (typeof listener !== 'function') throw new TypeError('Socket.IO listener must be a function.');
		const entry = this.getOrCreateNamespace(name);
		let eventListeners = entry.listeners.get(event);
		if (!eventListeners) {
			eventListeners = new Map();
			entry.listeners.set(event, eventListeners);
		}
		if (eventListeners.has(listener)) return () => this.off(name, event, listener);
		const wrapped = (envelope) => {
			if (!isEnvelope(envelope)) {
				console.error(`Invalid Socket.IO event envelope: ${entry.name}:${event}`);
				return;
			}
			this.applySystemData(envelope.system);
			listener(envelope.data, envelope.system);
		};
		eventListeners.set(listener, wrapped);
		entry.socket.on(event, wrapped);
		return () => this.off(name, event, listener);
	}

	/**
	 * Call this method to remove an exact event listener.
	 *
	 * @param {string} name - The namespace name.
	 * @param {string} event - The event name.
	 * @param {Function} listener - The original event consumer.
	 * @returns {boolean} - Whether a listener was removed.
	 */
	off(name, event, listener) {
		const entry = this.namespaces.get(this.normalizeNamespace(name));
		const eventListeners = entry?.listeners.get(event);
		const wrapped = eventListeners?.get(listener);
		if (!wrapped) return false;
		entry.socket.off(event, wrapped);
		eventListeners.delete(listener);
		if (eventListeners.size === 0) entry.listeners.delete(event);
		return true;
	}

	/**
	 * Call this method to emit an immutable data envelope without acknowledgement.
	 *
	 * @param {string} name - The namespace name.
	 * @param {string} event - The event name.
	 * @param {unknown} data - The feature-owned payload.
	 * @returns {boolean} - Whether the event was emitted.
	 */
	send(name, event, data) {
		const entry = this.getOrCreateNamespace(name);
		if (entry.socket.connected === false) {
			console.warn(`Socket.IO namespace is disconnected: ${entry.name}`);
			return false;
		}
		const envelope = this.createEnvelope(data);
		if (!envelope) return false;
		entry.socket.emit(event, envelope);
		return true;
	}

	/**
	 * Call this method to emit an acknowledged request, converting transport failures into response envelopes.
	 *
	 * @param {string} name - The namespace name.
	 * @param {string} event - The request event name.
	 * @param {unknown} data - The feature-owned request payload.
	 * @param {SocketRequestOptions} options - The acknowledgement timeout configuration.
	 * @returns {Promise<SocketResponse>} - The acknowledged response or a transport-failure envelope.
	 */
	async request(name, event, data, {timeout = 5000} = {}) {
		const entry = this.getOrCreateNamespace(name);
		if (entry.socket.connected === false) return failure('socket.disconnected');
		if (!Number.isFinite(timeout) || timeout <= 0) { console.error(`Invalid Socket.IO request timeout: ${timeout}`); return failure('socket.invalid_request'); }
		const envelope = this.createEnvelope(data);
		if (!envelope) return failure('socket.invalid_request');
		try {
			const response = await entry.socket.timeout(timeout).emitWithAck(event, envelope);
			if (!isResponse(response)) {
				console.error(`Invalid Socket.IO response envelope: ${entry.name}:${event}`);
				return failure('socket.invalid_response');
			}
			this.applySystemData(response.system);
			return response;
		} catch (error) {
			if (entry.socket.connected === false) return failure('socket.disconnected');
			console.warn(`Socket.IO request timed out: ${entry.name}:${event}`, error);
			return failure('socket.timeout');
		}
	}

	/**
	 * Call this method to disconnect and forget one namespace and its listeners.
	 *
	 * @param {string} name - The namespace name.
	 * @returns {boolean} - Whether a namespace was closed.
	 */
	closeNamespace(name) {
		const normalized = this.normalizeNamespace(name);
		const entry = this.namespaces.get(normalized);
		if (!entry) return false;
		for (const [event, listeners] of entry.listeners) {
			for (const wrapped of listeners.values()) entry.socket.off(event, wrapped);
		}
		entry.listeners.clear();
		entry.socket.off('connect', entry.connected);
		entry.socket.off('disconnect', entry.disconnected);
		entry.socket.disconnect();
		this.namespaces.delete(normalized);
		return true;
	}

	/** Call this method to disconnect and forget every namespace. */
	stop() {
		for (const name of [...this.namespaces.keys()]) this.closeNamespace(name);
	}
}

/** Called by envelope guards to recognize a non-array record. @param {unknown} value - The candidate value. @returns {boolean} - Whether the value is a record. */
function isRecord(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Called by event handling to validate an immutable data envelope. @param {unknown} value - The candidate value. @returns {boolean} - Whether the value is a data envelope. */
function isEnvelope(value) {
	return isRecord(value) && Object.hasOwn(value, 'data') && isRecord(value.system);
}

/** Called by request handling to validate an acknowledged response envelope. @param {unknown} value - The candidate value. @returns {boolean} - Whether the value is a response envelope. */
function isResponse(value) {
	if (!isRecord(value) || typeof value.success !== 'boolean' || !isRecord(value.system)) return false;
	return value.success ? Object.hasOwn(value, 'data') : isReason(value.reason);
}

/** Called by response validation to recognize a localizable failure reason. @param {unknown} value - The candidate reason. @returns {boolean} - Whether the reason is valid. */
function isReason(value) {
	if (!isRecord(value) || typeof value.phrase !== 'string') return false;
	if (value.replacements === undefined) return true;
	return isRecord(value.replacements) && Object.values(value.replacements).every((item) => typeof item === 'string' || typeof item === 'number' && Number.isFinite(item));
}

/** Called by request handling to create a localizable transport failure. @param {string} phrase - The failure phrase key. @returns {SocketFailure} - The failure envelope. */
function failure(phrase) {
	return {success: false, reason: {phrase}, system: {}};
}

new SocketStreamService();
