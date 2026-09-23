import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import test from 'node:test';
import {Registry} from '@polylith/core';
import {Server} from 'socket.io';
import {io as connectSocket} from 'socket.io-client';
import {SocketStreamService} from '../socket-stream.js';
import {SocketIoServerMock, SocketMock} from '../../testing/SocketIoMocks.js';

function createStream() {
	return new SocketStreamService(new Registry());
}

function settle() {
	return new Promise((resolve) => setImmediate(resolve));
}

test('validates, prefixes, and materializes namespaces exactly once', () => {
	const stream = createStream();
	assert.equal(stream.namespace('documents'), '/{{SLUG}}/documents');
	assert.equal(stream.namespace('/{{SLUG}}/documents'), '/{{SLUG}}/documents');
	assert.throws(() => stream.namespace(), /Invalid/);
	assert.throws(() => stream.namespace('../private'), /Invalid/);
	assert.throws(() => stream.namespace('bad name'), /Invalid/);
	const entry = stream.namespaces.get('/{{SLUG}}/documents');
	stream.materialize(entry);
	const io = new SocketIoServerMock();
	stream.setup(io);
	stream.setup(io);
	stream.materialize(entry);
	stream.namespace('reports');
	assert.equal(io.namespaces.size, 2);
	stream.close();
});

test('rejects incomplete transports and replaces an attached transport cleanly', () => {
	const stream = createStream();
	for (const value of [null, {}, {on() {}}, {on() {}, off() {}}]) assert.throws(() => stream.setup(value), TypeError);
	const first = new SocketIoServerMock();
	const second = new SocketIoServerMock();
	stream.namespace('documents');
	stream.setup(first);
	stream.setup(second);
	assert.equal(first.listeners.get('connection').size, 0);
	assert.equal(second.listeners.get('connection').size, 1);
	stream.close();
});

test('tracks root and namespace sockets until the final disconnect', () => {
	const stream = createStream();
	const io = new SocketIoServerMock();
	stream.namespace('documents');
	stream.setup(io);
	const connected = [];
	const disconnected = [];
	stream.listen('client-connected', (...args) => connected.push(['client', ...args]));
	stream.listen('namespace-connected', (...args) => connected.push(['namespace', ...args]));
	stream.listen('namespace-disconnected', (...args) => disconnected.push(['namespace', ...args]));
	stream.listen('client-disconnected', (...args) => disconnected.push(['client', ...args]));
	const root = new SocketMock('root', 'client-1');
	const feature = new SocketMock('feature', 'client-1');
	io.receive('connection', root);
	io.receive('connection', root);
	io.namespaces.get('/{{SLUG}}/documents').receive('connection', feature);
	assert.equal(stream.clients.get('client-1').sockets.size, 2);
	feature.receive('disconnect', 'feature closed');
	assert.equal(stream.clients.get('client-1').sockets.size, 1);
	root.receive('disconnect', 'root closed');
	assert.equal(stream.clients.has('client-1'), false);
	assert.deepEqual(connected, [['client', 'client-1'], ['namespace', '/{{SLUG}}/documents', 'client-1']]);
	assert.deepEqual(disconnected, [['namespace', '/{{SLUG}}/documents', 'client-1', 'feature closed'], ['client', 'client-1', 'root closed']]);
	const fallback = new SocketMock('fallback');
	fallback.conn = null;
	io.receive('connection', fallback);
	assert.equal(stream.clients.has('fallback'), true);
	stream.detachSocket(new SocketMock('unknown'), 'ignored');
	stream.close();
});

test('registers, unregisters, and binds handlers for existing and future sockets', async () => {
	const stream = createStream();
	assert.throws(() => stream.register('documents', 'find', null), TypeError);
	const io = new SocketIoServerMock();
	stream.setup(io);
	const socket = new SocketMock('feature', 'client-1');
	stream.namespace('documents');
	io.namespaces.get('/{{SLUG}}/documents').receive('connection', socket);
	const first = ({data}) => ({success: true, data});
	const second = () => ({success: false, reason: {phrase: 'documents.denied'}});
	const disposeFirst = stream.register('documents', 'find', first);
	const disposeSecond = stream.register('documents', 'find', second);
	stream.bindHandler(stream.namespaces.get('/{{SLUG}}/documents'), socket, 'find', first);
	assert.equal(stream.unregister('documents', 'missing', first), false);
	assert.equal(disposeFirst(), true);
	assert.equal(stream.unregister('documents', 'find', first), false);
	disposeSecond();
	stream.unbindHandler(socket, 'find', second);
	assert.equal(stream.socketStates.get(socket).bindings.has('find'), false);
	stream.register('future', 'load', first);
	const future = new SocketMock('future', 'client-2');
	io.namespaces.get('/{{SLUG}}/future').receive('connection', future);
	let response;
	future.receive('load', {data: {id: 1}, system: {}}, (value) => { response = value; });
	await settle();
	assert.deepEqual(response, {success: true, data: {id: 1}, system: {}});
	stream.close();
});

test('validates request envelopes and normalizes every handler result', async (context) => {
	const stream = createStream();
	const io = new SocketIoServerMock();
	const errors = [];
	context.mock.method(console, 'error', (...args) => errors.push(args));
	stream.register('documents', 'invalid-request', () => ({success: true, data: {}}));
	stream.register('documents', 'throws', () => { throw new Error('failed'); });
	stream.register('documents', 'invalid-result', () => null);
	stream.register('documents', 'invalid-success', () => ({success: true}));
	stream.register('documents', 'invalid-failure', () => ({success: false, reason: null}));
	stream.register('documents', 'invalid-replacements', () => ({success: false, reason: {phrase: 'bad', replacements: {value: Infinity}}}));
	stream.register('documents', 'invalid-context', () => ({success: true, data: {}}));
	stream.register('documents', 'failure', () => ({success: false, reason: {phrase: 'documents.denied'}}));
	const prepareContext = stream.prepareContext.bind(stream);
	stream.prepareContext = (value) => value.event === 'invalid-context' ? null : prepareContext(value);
	stream.setup(io);
	const socket = new SocketMock('feature', 'client-1');
	io.namespaces.get('/{{SLUG}}/documents').receive('connection', socket);
	const responses = [];
	for (const invalid of [null, [], {}, {data: 1}, {data: 1, system: []}]) socket.receive('invalid-request', invalid, (value) => responses.push(value));
	socket.receive('invalid-request', {data: {}, system: {}});
	for (const event of ['throws', 'invalid-result', 'invalid-success', 'invalid-failure', 'invalid-replacements', 'invalid-context', 'failure']) socket.receive(event, {data: {}, system: {}}, (value) => responses.push(value));
	await settle();
	assert.equal(errors.some(([message]) => String(message).includes('Invalid Socket.IO request envelope')), true);
	assert.equal(errors.some(([message]) => String(message).includes('Socket.IO handler failed')), true);
	assert.equal(errors.some(([message]) => String(message).includes('Invalid Socket.IO handler response')), true);
	assert.equal(responses.some((value) => value.reason?.phrase === 'socket.invalid_request'), true);
	assert.equal(responses.some((value) => value.reason?.phrase === 'socket.server_error'), true);
	assert.equal(responses.some((value) => value.reason?.phrase === 'socket.invalid_response'), true);
	assert.equal(responses.some((value) => value.reason?.phrase === 'documents.denied'), true);
	assert.deepEqual(stream.failure('custom'), {success: false, reason: {phrase: 'custom'}, system: {}});
	assert.deepEqual(stream.failure('custom', {token: 1}), {success: false, reason: {phrase: 'custom'}, system: {token: 1}});
	stream.close();
});

test('sends and broadcasts immutable envelopes with connection diagnostics', (context) => {
	const stream = createStream();
	const warnings = [];
	context.mock.method(console, 'warn', (...args) => warnings.push(args));
	context.mock.method(console, 'error', () => {});
	assert.equal(stream.broadcast('documents', 'changed', {}), false);
	assert.equal(stream.send('documents', 'missing', 'changed', {}), false);
	stream.namespace('documents');
	assert.equal(stream.send('documents', 'missing', 'changed', {}), false);
	const io = new SocketIoServerMock();
	stream.setup(io);
	const socket = new SocketMock('feature', 'client-1');
	io.namespaces.get('/{{SLUG}}/documents').receive('connection', socket);
	const data = Object.freeze({id: 1});
	assert.equal(stream.send('documents', 'client-1', 'changed', data), true);
	assert.deepEqual(socket.emissions[0], {event: 'changed', data: {data, system: {}}});
	assert.equal(stream.broadcast('documents', 'changed', data), true);
	assert.deepEqual(io.namespaces.get('/{{SLUG}}/documents').emissions[0], {event: 'changed', data: {data, system: {}}});
	assert.equal(warnings.length, 2);
	context.mock.method(stream, 'getSystemData', () => null);
	assert.equal(stream.send('documents', 'client-1', 'changed', data), false);
	assert.equal(stream.broadcast('documents', 'changed', data), false);
	assert.deepEqual(stream.normalizeResult({success: true, data}, {namespace: 'documents', event: 'changed'}), {success: false, reason: {phrase: 'socket.invalid_response'}, system: {}});
	stream.close();
});

test('completes a real acknowledgement round trip and cleans up', async (context) => {
	const httpServer = createServer();
	const io = new Server(httpServer);
	const stream = createStream();
	stream.register('test', 'echo', ({data}) => ({success: true, data}));
	stream.setup(io);
	await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
	const {port} = httpServer.address();
	const client = connectSocket(`http://127.0.0.1:${port}/{{SLUG}}/test`);
	context.after(async () => {
		client.disconnect();
		stream.close();
		await new Promise((resolve) => io.close(resolve));
	});
	await new Promise((resolve, reject) => {
		client.once('connect', resolve);
		client.once('connect_error', reject);
	});
	const response = await client.timeout(1000).emitWithAck('echo', {data: {value: 7}, system: {}});
	assert.deepEqual(response, {success: true, data: {value: 7}, system: {}});
});
