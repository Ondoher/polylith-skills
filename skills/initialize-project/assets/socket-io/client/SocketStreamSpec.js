import {Registry} from '@polylith/core';
import {SocketStreamService} from '../socket-stream.js';
import {SocketIoClientMock} from '../../testing/SocketIoMock.js';

describe('client socket stream', () => {
	let sockets;
	let stream;

	beforeEach(() => {
		sockets = [];
		stream = new SocketStreamService(new Registry(), (name) => {
			const socket = new SocketIoClientMock(name);
			sockets.push(socket);
			return socket;
		});
		stream.start();
	});

	afterEach(() => stream.stop());

	it('prefixes, reuses, and validates feature namespaces', () => {
		expect(stream.namespace('documents')).toBe('/{{SLUG}}/documents');
		expect(stream.namespace('/{{SLUG}}/documents')).toBe('/{{SLUG}}/documents');
		expect(sockets.length).toBe(1);
		expect(() => stream.namespace()).toThrowError(/Invalid/);
		expect(() => stream.namespace('../private')).toThrowError(/Invalid/);
		expect(() => stream.namespace('bad name')).toThrowError(/Invalid/);
	});

	it('publishes namespace connection lifecycle', () => {
		const connected = jasmine.createSpy('connected');
		const disconnected = jasmine.createSpy('disconnected');
		stream.listen('connected', connected);
		stream.listen('disconnected', disconnected);
		stream.namespace('documents');
		sockets[0].receive('connect');
		sockets[0].receive('disconnect', 'closed');
		expect(connected).toHaveBeenCalledWith('/{{SLUG}}/documents');
		expect(disconnected).toHaveBeenCalledWith('/{{SLUG}}/documents', 'closed');
	});

	it('wraps immutable data and rejects disconnected sends', () => {
		const data = Object.freeze({query: 'active'});
		expect(stream.send('documents', 'find', data)).toBeTrue();
		expect(sockets[0].emissions[0]).toEqual({event: 'find', data: {data, system: {}}});
		expect(data).toEqual({query: 'active'});
		spyOn(console, 'warn');
		sockets[0].connected = false;
		expect(stream.send('documents', 'find', data)).toBeFalse();
		expect(console.warn).toHaveBeenCalledWith('Socket.IO namespace is disconnected: /{{SLUG}}/documents');
	});

	it('rejects invalid outbound system metadata and timeout configuration', async () => {
		spyOn(console, 'error');
		spyOn(stream, 'getSystemData').and.returnValue(null);
		expect(stream.send('documents', 'find', {})).toBeFalse();
		expect((await stream.request('documents', 'find', {})).reason.phrase).toBe('socket.invalid_request');
		stream.getSystemData.and.returnValue({});
		expect((await stream.request('documents', 'find', {}, {timeout: 0})).reason.phrase).toBe('socket.invalid_request');
		expect((await stream.request('documents', 'find', {}, {timeout: Infinity})).reason.phrase).toBe('socket.invalid_request');
		expect(console.error).toHaveBeenCalled();
	});

	it('unwraps valid events, rejects invalid envelopes, and removes exact listeners', () => {
		const first = jasmine.createSpy('first');
		const second = jasmine.createSpy('second');
		spyOn(stream, 'applySystemData').and.callThrough();
		spyOn(console, 'error');
		expect(() => stream.on('documents', 'changed', null)).toThrowError(TypeError);
		const disposeFirst = stream.on('documents', 'changed', first);
		const disposeDuplicate = stream.on('documents', 'changed', first);
		const disposeSecond = stream.on('documents', 'changed', second);
		for (const invalid of [null, [], {}, {data: 1}, {data: 1, system: []}]) sockets[0].receive('changed', invalid);
		sockets[0].receive('changed', {data: {id: 1}, system: {token: 'next'}});
		expect(first).toHaveBeenCalledWith({id: 1}, {token: 'next'});
		expect(second).toHaveBeenCalledWith({id: 1}, {token: 'next'});
		expect(stream.applySystemData).toHaveBeenCalledWith({token: 'next'});
		expect(console.error).toHaveBeenCalled();
		expect(stream.off('missing', 'changed', first)).toBeFalse();
		disposeFirst();
		expect(stream.off('documents', 'changed', first)).toBeFalse();
		disposeDuplicate();
		disposeSecond();
		expect(stream.namespaces.get('/{{SLUG}}/documents').listeners.has('changed')).toBeFalse();
	});

	it('uses acknowledgement promises and accepts success and failure envelopes', async () => {
		spyOn(stream, 'applySystemData').and.callThrough();
		stream.namespace('documents');
		sockets[0].acknowledgement = {success: true, data: {items: []}, system: {token: 'next'}};
		expect((await stream.request('documents', 'find', Object.freeze({page: 1}), {timeout: 25})).success).toBeTrue();
		expect(sockets[0].timeoutValue).toBe(25);
		expect(stream.applySystemData).toHaveBeenCalledWith({token: 'next'});
		sockets[0].acknowledgement = {success: false, reason: {phrase: 'documents.denied'}, system: {}};
		expect((await stream.request('documents', 'find', {})).reason.phrase).toBe('documents.denied');
		expect(sockets[0].timeoutValue).toBe(5000);
	});

	it('normalizes invalid, disconnected, and timed-out request results', async () => {
		stream.namespace('documents');
		spyOn(console, 'error');
		for (const invalid of [null, [], {}, {success: 'yes', system: {}}, {success: true, system: {}}, {success: false, reason: null, system: {}}, {success: false, reason: {}, system: {}}, {success: false, reason: {phrase: 7}, system: {}}, {success: false, reason: {phrase: 'bad', replacements: []}, system: {}}, {success: false, reason: {phrase: 'bad', replacements: {value: Infinity}}, system: {}}, {success: true, data: {}, system: []}]) {
			sockets[0].acknowledgement = invalid;
			expect((await stream.request('documents', 'find', {})).reason.phrase).toBe('socket.invalid_response');
		}
		expect(console.error).toHaveBeenCalled();
		sockets[0].connected = false;
		expect((await stream.request('documents', 'find', {})).reason.phrase).toBe('socket.disconnected');
		sockets[0].connected = true;
		sockets[0].acknowledgement = new Error('timeout');
		spyOn(console, 'warn');
		expect((await stream.request('documents', 'find', {})).reason.phrase).toBe('socket.timeout');
		sockets[0].emitWithAck = async () => { sockets[0].connected = false; throw new Error('closed'); };
		expect((await stream.request('documents', 'find', {})).reason.phrase).toBe('socket.disconnected');
	});

	it('closes individual namespaces and every namespace on stop', () => {
		expect(stream.closeNamespace('missing')).toBeFalse();
		const listener = () => {};
		stream.on('documents', 'changed', listener);
		stream.on('documents', 'other', listener);
		expect(stream.closeNamespace('documents')).toBeTrue();
		expect(sockets[0].connected).toBeFalse();
		stream.namespace('documents');
		stream.namespace('reports');
		stream.stop();
		expect(sockets.slice(1).every((socket) => socket.connected === false)).toBeTrue();
		expect(stream.namespaces.size).toBe(0);
	});
});
