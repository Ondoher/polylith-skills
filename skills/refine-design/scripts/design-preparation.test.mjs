import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DesignPreparation} from './DesignPreparation.mjs';
import {preparationCommand} from './design-preparation.mjs';

/** Creates one product-neutral ledger without any operational plan or model calls.
 * @param {DesignCoordinatorTestContext} scenario - Test cleanup lifecycle.
 * @returns {DesignPreparationTestFixture} - Ledger and explicit fake-host observations.
 */
function fixture(scenario) {
	const parent = fileURLToPath(new URL('../../../.codex-tmp/agent-preparation/lifecycle-tests/', import.meta.url));
	fs.mkdirSync(parent, {recursive: true});
	const directory = fs.mkdtempSync(path.join(parent, 'case-'));
	scenario.after(() => {
		assert.equal(path.dirname(fs.realpathSync(directory)), fs.realpathSync(parent));
		fs.rmSync(directory, {recursive: true, force: true});
	});
	const ledger = new DesignPreparation(path.join(directory, 'preparation'));
	ledger.initialize({scope: 'synthetic-product/run'});
	const packet = {
		scope: 'synthetic-product/run',
		revision: 'sources-1',
		instructions:
			'Read the saved inputs, acknowledge this exact packet, and wait. Do not research, design, claim work or write canonical data.',
		bindings: [{ref: 'source:brief', digest: crypto.createHash('sha256').update('synthetic source').digest('hex')}],
	};
	const capacity = {
		id: 'host-1',
		observedAt: '2026-10-05T10:00:00Z',
		runtimeLimit: 17,
		configuredSubagentLimit: 16,
		openThreadIds: ['primary', 'researcher'],
		reviewerReserve: 1,
		conservativeSlots: 0,
	};
	const forecast = {
		revision: 'forecast-1',
		demands: [{role: 'ux-planner', count: 2, packet}],
		laterRoles: [{role: 'ui-designer', count: 1}],
	};
	ledger.advise({forecast, capacity, expectedRevision: ledger.open().revision});
	const reserve = (role = 'ux-planner') => {
		const before = ledger.open().authors.length;
		const state = ledger.reserve({role, expectedRevision: ledger.open().revision});
		return state.authors.length > before ? state.authors.at(-1) : null;
	};
	const ready = (author, agentId) => {
		ledger.created({
			authorId: author.id,
			attemptId: author.attemptId,
			agentId,
			observation: `fake-host/created/${agentId}`,
			expectedRevision: ledger.open().revision,
		});
		ledger.acknowledge({
			authorId: author.id,
			attemptId: author.attemptId,
			agentId,
			packetDigest: author.packetDigest,
			observation: `fake-host/read-and-wait/${agentId}`,
			expectedRevision: ledger.open().revision,
		});
		return ledger.open().authors.find((entry) => entry.id === author.id);
	};
	return {ledger, directory, packet, capacity, forecast, reserve, ready};
}

test('early forecast reserves independent authors before acknowledgments and reopens exact state', (scenario) => {
	const f = fixture(scenario);
	const first = f.reserve(),
		second = f.reserve();
	assert.equal(f.ledger.inspect().openCount, 2);
	assert.equal(
		f.ledger.open().authors.every((author) => !author.ack && !author.assignment),
		true,
	);
	f.ready(first, 'ux-first');
	f.ready(second, 'ux-second');
	assert.equal(f.reserve(), null);
	assert.equal(f.ledger.open().history.at(-1).reason, 'compatible-author-first');
	assert.deepEqual(new DesignPreparation(path.join(f.directory, 'preparation')).open(), f.ledger.open());
	const status = preparationCommand(['inspect', '--directory', path.join(f.directory, 'preparation')]);
	assert.equal(status.authors.length, 2);
	assert.equal(status.authoringCount, 0);
	assert.equal(
		status.authors.every((author) => author.status === 'available'),
		true,
	);
});

test('adoption preserves actual provenance and packet refresh requires a new acknowledgment', (scenario) => {
	const f = fixture(scenario);
	f.ledger.adopt({
		agentId: 'existing-specialist',
		role: 'ux-planner',
		actualRole: 'ux-planner',
		assignmentResolved: true,
		authorityRevoked: true,
		packet: f.packet,
		contributions: [{itemId: 'old-native-work', agentId: 'existing-specialist'}],
		observation: 'fake-host/available-with-prior-authority-revoked',
		expectedRevision: f.ledger.open().revision,
	});
	const author = f.ledger.open().authors[0];
	f.ready(author, author.agentId);
	const replacement = {
		...f.packet,
		revision: 'sources-2',
		bindings: [{ref: 'source:brief', digest: crypto.createHash('sha256').update('updated source').digest('hex')}],
	};
	f.ledger.advise({
		forecast: {...f.forecast, demands: [{...f.forecast.demands[0], packet: replacement}]},
		capacity: f.capacity,
		expectedRevision: f.ledger.open().revision,
	});
	f.ledger.refreshPacket({authorId: author.id, packet: replacement, expectedRevision: f.ledger.open().revision});
	const refreshed = f.ledger.open().authors[0];
	assert.notEqual(refreshed.attemptId, author.attemptId);
	assert.equal(refreshed.ack, null);
	f.ready(refreshed, author.agentId);
	assert.equal(f.ledger.open().authors[0].contributions[0].agentId, author.agentId);
	assert.equal(
		f.ledger.open().authors[0].observations.some((entry) => entry.event === 'acknowledged'),
		true,
	);
});

test('duplicate acknowledgments are safe while stale packet, attempt and identity reject', (scenario) => {
	const f = fixture(scenario),
		author = f.ready(f.reserve(), 'ux-author');
	const acknowledgment = {
		authorId: author.id,
		attemptId: author.attemptId,
		agentId: author.agentId,
		packetDigest: author.packetDigest,
		observation: 'fake-host/duplicate',
	};
	f.ledger.acknowledge({...acknowledgment, expectedRevision: f.ledger.open().revision});
	for (const changed of [
		{agentId: 'other-author'},
		{attemptId: 'old-attempt'},
		{packetDigest: crypto.createHash('sha256').update('stale').digest('hex')},
	])
		assert.throws(
			() => f.ledger.acknowledge({...acknowledgment, ...changed, expectedRevision: f.ledger.open().revision}),
			/Stale/,
		);
	f.ledger.refreshPacket({
		authorId: author.id,
		packet: {...f.packet, revision: 'new-input'},
		expectedRevision: f.ledger.open().revision,
	});
	assert.throws(() => f.ledger.acknowledge({...acknowledgment, expectedRevision: f.ledger.open().revision}), /Stale/);
	assert.equal(f.ledger.open().authors[0].ack, null);
});

test('creation crash windows retain intent, prevent replacement and reconcile actual identity', (scenario) => {
	const f = fixture(scenario);
	f.ledger.advise({
		forecast: {...f.forecast, demands: [{...f.forecast.demands[0], count: 1}]},
		capacity: f.capacity,
		expectedRevision: f.ledger.open().revision,
	});
	const author = f.reserve();
	const reopened = new DesignPreparation(path.join(f.directory, 'preparation'));
	assert.equal(reopened.inspect().openCount, 1);
	assert.equal(f.reserve(), null);
	reopened.failed({
		authorId: author.id,
		attemptId: author.attemptId,
		outcome: 'unknown',
		observation: 'fake-host/crash-after-create-before-save',
		expectedRevision: reopened.open().revision,
	});
	assert.equal(f.reserve(), null);
	f.ready(author, 'surviving-actual-author');
	assert.equal(reopened.open().authors.length, 1);
	assert.equal(reopened.open().authors[0].agentId, 'surviving-actual-author');
});

test('partial creation success and persistent ceiling retry only after positive host capacity change', (scenario) => {
	const f = fixture(scenario),
		first = f.reserve(),
		second = f.reserve();
	f.ready(first, 'ux-survivor');
	f.ledger.failed({
		authorId: second.id,
		attemptId: second.attemptId,
		outcome: 'absent',
		ceiling: true,
		observation: 'fake-host/thread-ceiling',
		expectedRevision: f.ledger.open().revision,
	});
	assert.equal(f.ledger.inspect().openCount, 1);
	for (let observation = 2; observation < 5; observation++) {
		f.ledger.advise({
			forecast: f.forecast,
			capacity: {...f.capacity, id: `host-${observation}`},
			expectedRevision: f.ledger.open().revision,
		});
		assert.equal(f.reserve(), null);
		assert.equal(f.ledger.open().history.at(-1).reason, 'host-ceiling-backoff');
	}
	f.ledger.advise({
		forecast: f.forecast,
		capacity: {...f.capacity, id: 'host-positive-free', openThreadIds: ['primary']},
		expectedRevision: f.ledger.open().revision,
	});
	assert.ok(f.reserve());
	assert.equal(f.ledger.open().ceiling, null);
	assert.equal(f.ledger.open().authors.filter((author) => author.agentId === 'ux-survivor').length, 1);
});

test('host accounting reserves reviewers and never double-counts observed managed threads', (scenario) => {
	const f = fixture(scenario);
	const capacity = {...f.capacity, runtimeLimit: 4, openThreadIds: ['primary', 'researcher']};
	f.ledger.advise({forecast: f.forecast, capacity, expectedRevision: f.ledger.open().revision});
	const author = f.ready(f.reserve(), 'observed-ux');
	assert.equal(f.reserve(), null);
	f.ledger.advise({
		forecast: f.forecast,
		capacity: {
			...capacity,
			id: 'host-2',
			runtimeLimit: 5,
			openThreadIds: ['primary', 'researcher', author.agentId],
		},
		expectedRevision: f.ledger.open().revision,
	});
	assert.ok(f.reserve());
	assert.equal(f.reserve(), null);
});

test('unknown runtime capacity uses bounded requests and does not assume configured slots are active', (scenario) => {
	const f = fixture(scenario);
	f.ledger.advise({
		forecast: f.forecast,
		capacity: {...f.capacity, runtimeLimit: null, conservativeSlots: 1},
		expectedRevision: f.ledger.open().revision,
	});
	f.ready(f.reserve(), 'uncertain-capacity-author');
	assert.equal(f.reserve(), null);
	assert.equal(f.ledger.open().history.at(-1).reason, 'host-reviewer-reserve');
});

test('no-closure UX to UI transition reserves the later role and never releases retired slots by label', (scenario) => {
	const f = fixture(scenario);
	const forecast = {...f.forecast, demands: [{...f.forecast.demands[0], count: 4}]};
	f.ledger.advise({forecast, capacity: f.capacity, expectedRevision: f.ledger.open().revision});
	const authors = [f.reserve(), f.reserve(), f.reserve()];
	assert.equal(f.reserve(), null);
	authors.forEach((author, index) => f.ready(author, `ux-${index}`));
	const uiForecast = {
		...forecast,
		revision: 'ui-stage',
		demands: [
			{
				role: 'ui-designer',
				count: 1,
				packet: {...f.packet, instructions: 'Read UI role, foundation and reviewed UX; wait.'},
			},
		],
	};
	f.ledger.advise({
		forecast: uiForecast,
		capacity: {
			...f.capacity,
			id: 'ui-capacity',
			runtimeLimit: 6,
			openThreadIds: ['primary', ...authors.map((_author, index) => `ux-${index}`)],
		},
		expectedRevision: f.ledger.open().revision,
	});
	const ui = f.reserve('ui-designer');
	assert.ok(ui);
	f.ready(ui, 'ui-author');
	assert.equal(f.ledger.inspect().openCount, 4);
	f.ledger.retire({
		authorId: authors[0].id,
		observation: 'fake-host/closure-unavailable',
		expectedRevision: f.ledger.open().revision,
	});
	assert.equal(f.ledger.inspect().openCount, 4);
	f.ledger.advise({
		forecast: {...uiForecast, demands: [{...uiForecast.demands[0], count: 2}]},
		capacity: f.capacity,
		expectedRevision: f.ledger.open().revision,
	});
	assert.equal(f.reserve('ui-designer'), null);
	f.ledger.observe({
		authorId: authors[0].id,
		agentId: 'ux-0',
		status: 'closed',
		observation: 'fake-host/positive-closure-supported',
		expectedRevision: f.ledger.open().revision,
	});
	assert.equal(f.ledger.inspect().openCount, 3);
	assert.ok(f.reserve('ui-designer'));
});

test('adoption rejects unresolved assignment, old authority, wrong specialty and duplicate actual identity', (scenario) => {
	const f = fixture(scenario);
	const request = {
		agentId: 'existing',
		role: 'ux-planner',
		actualRole: 'ux-planner',
		assignmentResolved: true,
		authorityRevoked: true,
		packet: f.packet,
		observation: 'fake-host/positive-availability',
		expectedRevision: f.ledger.open().revision,
	};
	for (const changed of [{assignmentResolved: false}, {authorityRevoked: false}, {actualRole: 'ui-designer'}])
		assert.throws(() => f.ledger.adopt({...request, ...changed}), /Adoption requires/);
	f.ledger.adopt(request);
	assert.throws(() => f.ledger.adopt({...request, expectedRevision: f.ledger.open().revision}), /already tracked/);
});

test('unavailable authors, stale input observations, duplicate assignments and concurrent third author reject', (scenario) => {
	const f = fixture(scenario);
	f.ledger.advise({
		forecast: {...f.forecast, demands: [{...f.forecast.demands[0], count: 3}]},
		capacity: f.capacity,
		expectedRevision: f.ledger.open().revision,
	});
	const authors = [f.reserve(), f.reserve(), f.reserve()];
	const assign = (author, itemId, changed = {}) =>
		f.ledger.beginAssignment({
			authorId: author.id,
			itemId,
			role: author.role,
			packetDigest: author.packetDigest,
			bindings: author.packet.bindings,
			observation: 'fake-host/current-ready',
			expectedRevision: f.ledger.open().revision,
			...changed,
		});
	assert.throws(() => assign(authors[0], 'first'), /unavailable/);
	authors.forEach((author, index) => f.ready(author, `author-${index}`));
	assert.throws(() => assign(authors[0], 'first', {bindings: []}), /inputs changed/);
	assert.throws(() => assign(authors[0], 'first', {role: 'ui-designer'}), /unavailable/);
	assign(authors[0], 'first');
	assert.throws(() => assign(authors[0], 'second'), /unavailable/);
	assert.throws(() => assign(authors[1], 'first'), /ceiling/);
	assign(authors[1], 'second');
	assert.throws(() => assign(authors[2], 'third'), /ceiling/);
	assert.equal(f.ledger.inspect().authoringCount, 2);
	assert.deepEqual(new DesignPreparation(path.join(f.directory, 'preparation')).open(), f.ledger.open());
});

test('claim and grant crash windows retain exact work until resolution, revocation and positive stop', (scenario) => {
	const f = fixture(scenario),
		author = f.ready(f.reserve(), 'exact-author');
	assert.throws(
		() =>
			f.ledger.withAssignment(
				{authorId: author.id, claim: {itemId: 'alpha', attemptId: 'claim-1', agentId: author.agentId}},
				() => assert.fail('preparation write'),
			),
		/unavailable/,
	);
	f.ledger.beginAssignment({
		authorId: author.id,
		itemId: 'alpha',
		role: author.role,
		packetDigest: author.packetDigest,
		bindings: f.packet.bindings,
		observation: 'fake-host/available',
		expectedRevision: f.ledger.open().revision,
	});
	const claim = {itemId: 'alpha', id: 'claim-1', agentId: author.agentId, role: author.role, status: 'intent'};
	const coordinatorState = {attempts: {alpha: claim}};
	const reopened = new DesignPreparation(path.join(f.directory, 'preparation'));
	reopened.bindClaim({authorId: author.id, coordinatorState, expectedRevision: reopened.open().revision});
	assert.equal(reopened.open().authors[0].assignment.attemptId, 'claim-1');
	const exactClaim = {itemId: 'alpha', attemptId: claim.id, agentId: author.agentId};
	reopened.authority({
		authorId: author.id,
		claim: exactClaim,
		status: 'issued',
		channel: 'file',
		expectedRevision: reopened.open().revision,
	});
	assert.equal(
		reopened.withAssignment({authorId: author.id, claim: exactClaim}, () => 'guarded'),
		'guarded',
	);
	const release = {
		authorId: author.id,
		coordinatorState,
		observation: {status: 'stopped', agentId: author.agentId, attemptId: claim.id, ref: 'fake-host/stopped'},
	};
	assert.throws(() => reopened.release({...release, expectedRevision: reopened.open().revision}), /Resolve/);
	claim.status = 'accepted';
	assert.throws(() => reopened.release({...release, expectedRevision: reopened.open().revision}), /Revoke/);
	reopened.authority({
		authorId: author.id,
		claim: exactClaim,
		status: 'revoked',
		expectedRevision: reopened.open().revision,
	});
	assert.throws(
		() =>
			reopened.release({
				...release,
				observation: {...release.observation, status: 'unknown'},
				expectedRevision: reopened.open().revision,
			}),
		/stop/,
	);
	reopened.release({...release, expectedRevision: reopened.open().revision});
	assert.equal(reopened.open().authors[0].contributions[0].agentId, author.agentId);
	assert.throws(
		() => reopened.withAssignment({authorId: author.id, claim: exactClaim}, () => assert.fail('old write')),
		/unavailable/,
	);
});

test('source changes on resume freeze obsolete preparation and uncertain liveness cannot replace it', (scenario) => {
	const f = fixture(scenario),
		author = f.ready(f.reserve(), 'surviving-author');
	const packet = {
		...f.packet,
		revision: 'changed-source',
		bindings: [{ref: 'source:brief', digest: crypto.createHash('sha256').update('changed source').digest('hex')}],
	};
	f.ledger.advise({
		forecast: {...f.forecast, demands: [{role: 'ux-planner', count: 1, packet}]},
		capacity: f.capacity,
		expectedRevision: f.ledger.open().revision,
	});
	assert.equal(f.reserve(), null);
	f.ledger.observe({
		authorId: author.id,
		agentId: author.agentId,
		status: 'unknown',
		observation: 'fake-host/resume-unknown',
		expectedRevision: f.ledger.open().revision,
	});
	assert.equal(f.reserve(), null);
	assert.throws(
		() => f.ledger.refreshPacket({authorId: author.id, packet, expectedRevision: f.ledger.open().revision}),
		/liveness/,
	);
	f.ledger.observe({
		authorId: author.id,
		agentId: author.agentId,
		status: 'available',
		observation: 'fake-host/resume-positive',
		expectedRevision: f.ledger.open().revision,
	});
	f.ledger.refreshPacket({authorId: author.id, packet, expectedRevision: f.ledger.open().revision});
	assert.equal(f.ledger.open().authors[0].ack, null);
});

test('invalid durable records, preparation permissions, unbounded packets and competing CAS writers reject', (scenario) => {
	const f = fixture(scenario),
		author = f.reserve();
	assert.throws(
		() =>
			f.ledger.refreshPacket({
				authorId: author.id,
				packet: {...f.packet, operations: ['units.deliver']},
				expectedRevision: f.ledger.open().revision,
			}),
		/packet/,
	);
	assert.throws(
		() =>
			f.ledger.refreshPacket({
				authorId: author.id,
				packet: {...f.packet, instructions: 'a'.repeat(17000)},
				expectedRevision: f.ledger.open().revision,
			}),
		/bounded/,
	);
	assert.throws(() => f.ledger.reserve({role: 'ux-planner', expectedRevision: 1}), /Stale/);
	const target = path.join(f.directory, 'preparation', 'state.json');
	const envelope = JSON.parse(fs.readFileSync(target, 'utf8'));
	envelope.payload.authors[0].permissions = ['write'];
	envelope.digest = crypto.createHash('sha256').update(JSON.stringify(envelope.payload)).digest('hex');
	fs.writeFileSync(target, JSON.stringify(envelope));
	assert.throws(() => new DesignPreparation(path.dirname(target)).open(), /fields/);
});

test('crash-surviving writer locks require exact identity and positive process-owner absence', (scenario) => {
	const f = fixture(scenario),
		before = f.ledger.open();
	const lock = path.join(f.directory, 'preparation', 'writer.lock');
	fs.writeFileSync(lock, JSON.stringify({pid: process.pid, token: 'live-owner'}));
	assert.throws(() => f.reserve(), /EEXIST/);
	assert.throws(() => f.ledger.recoverLock('wrong-owner'), /changed/);
	assert.throws(() => f.ledger.recoverLock('live-owner'), /still alive/);
	fs.writeFileSync(lock, JSON.stringify({pid: 987654321, token: 'fake-dead-owner'}));
	scenario.mock.method(process, 'kill', (processId) => {
		assert.equal(processId, 987654321);
		throw Object.assign(new Error('Deterministic dead-process observation'), {code: 'ESRCH'});
	});
	f.ledger.recoverLock('fake-dead-owner');
	assert.equal(f.ledger.lockInfo(), null);
	assert.deepEqual(f.ledger.open(), before);
});

test('pre-claim crash intent releases only after no unresolved claim and positive stop, preserving actual attribution', (scenario) => {
	const f = fixture(scenario),
		author = f.ready(f.reserve(), 'never-dispatched-author');
	f.ledger.beginAssignment({
		authorId: author.id,
		itemId: 'alpha',
		role: author.role,
		packetDigest: author.packetDigest,
		bindings: author.packet.bindings,
		observation: 'fake-host/available-before-claim',
		expectedRevision: f.ledger.open().revision,
	});
	const coordinatorState = {
		attempts: {
			alpha: {
				itemId: 'alpha',
				id: 'competing-claim',
				agentId: 'other-actual-contributor',
				role: author.role,
				status: 'running',
			},
		},
	};
	const request = {
		authorId: author.id,
		coordinatorState,
		observation: {
			status: 'stopped',
			agentId: author.agentId,
			attemptId: null,
			ref: 'fake-host/intent-never-dispatched',
		},
	};
	assert.throws(() => f.ledger.release({...request, expectedRevision: f.ledger.open().revision}), /Resolve/);
	coordinatorState.attempts.alpha.status = 'accepted';
	f.ledger.release({...request, expectedRevision: f.ledger.open().revision});
	assert.equal(f.ledger.open().authors[0].status, 'available');
	assert.deepEqual(f.ledger.open().authors[0].contributions, []);
});

test('changed forecast invalidates old readiness while final packet supersets and count refresh remain current', (scenario) => {
	const f = fixture(scenario),
		original = f.ready(f.reserve(), 'forecast-author');
	const finalPacket = {
		...f.packet,
		revision: 'final-ux',
		instructions: 'Refresh final reviewed UX and wait.',
		bindings: [
			...f.packet.bindings,
			{ref: 'ux:reviewed', digest: crypto.createHash('sha256').update('reviewed UX').digest('hex')},
		],
	};
	f.ledger.refreshPacket({authorId: original.id, packet: finalPacket, expectedRevision: f.ledger.open().revision});
	const finalAuthor = f.ready(f.ledger.open().authors[0], original.agentId);
	f.ledger.advise({
		forecast: {...f.forecast, revision: 'counts-2', demands: [{...f.forecast.demands[0], count: 3}]},
		capacity: f.capacity,
		expectedRevision: f.ledger.open().revision,
	});
	assert.equal(f.ledger.open().authors[0].status, 'available');
	assert.equal(f.ledger.open().authors[0].attemptId, finalAuthor.attemptId);
	const changedPacket = {
		...f.packet,
		revision: 'changed-role',
		instructions: 'Updated stable role instructions; read and wait.',
	};
	f.ledger.advise({
		forecast: {...f.forecast, revision: 'forecast-3', demands: [{...f.forecast.demands[0], packet: changedPacket}]},
		capacity: f.capacity,
		expectedRevision: f.ledger.open().revision,
	});
	assert.throws(
		() =>
			f.ledger.beginAssignment({
				authorId: original.id,
				itemId: 'alpha',
				role: original.role,
				packetDigest: finalAuthor.packetDigest,
				bindings: finalPacket.bindings,
				observation: 'fake-host/old-packet',
				expectedRevision: f.ledger.open().revision,
			}),
		/unavailable|inputs changed/,
	);
	assert.equal(f.ledger.open().authors[0].ack, null);
	assert.notEqual(f.ledger.open().authors[0].attemptId, finalAuthor.attemptId);
});

test('forecast changes preserve interrupted creation identity until positive binding and explicit refresh', (scenario) => {
	const f = fixture(scenario),
		intent = f.reserve();
	const changedPacket = {
		...f.packet,
		revision: 'source-changed',
		bindings: [{ref: 'source:brief', digest: crypto.createHash('sha256').update('new source').digest('hex')}],
	};
	f.ledger.advise({
		forecast: {...f.forecast, demands: [{...f.forecast.demands[0], packet: changedPacket}]},
		capacity: f.capacity,
		expectedRevision: f.ledger.open().revision,
	});
	assert.equal(f.ledger.open().authors[0].attemptId, intent.attemptId);
	f.ledger.created({
		authorId: intent.id,
		attemptId: intent.attemptId,
		agentId: 'surviving-spawn',
		observation: 'fake-host/original-spawn-completed',
		expectedRevision: f.ledger.open().revision,
	});
	assert.throws(
		() =>
			f.ledger.acknowledge({
				authorId: intent.id,
				attemptId: intent.attemptId,
				agentId: 'surviving-spawn',
				packetDigest: intent.packetDigest,
				observation: 'fake-host/old-read',
				expectedRevision: f.ledger.open().revision,
			}),
		/Stale/,
	);
	f.ledger.refreshPacket({authorId: intent.id, packet: changedPacket, expectedRevision: f.ledger.open().revision});
	f.ready(f.ledger.open().authors[0], 'surviving-spawn');
	assert.equal(f.ledger.open().authors.length, 1);
});

test('changed advice freezes assigned pending or issued authority without replacing its claim or packet', (scenario) => {
	for (const issued of [false, true]) {
		const f = fixture(scenario),
			author = f.ready(f.reserve(), `assigned-${issued}`);
		f.ledger.beginAssignment({
			authorId: author.id,
			itemId: 'alpha',
			role: author.role,
			packetDigest: author.packetDigest,
			bindings: author.packet.bindings,
			observation: 'fake-host/ready',
			expectedRevision: f.ledger.open().revision,
		});
		const claim = {itemId: 'alpha', attemptId: 'native-claim', agentId: author.agentId};
		f.ledger.bindClaim({
			authorId: author.id,
			coordinatorState: {
				attempts: {
					alpha: {
						id: claim.attemptId,
						itemId: 'alpha',
						agentId: author.agentId,
						role: author.role,
						status: 'intent',
					},
				},
			},
			expectedRevision: f.ledger.open().revision,
		});
		if (issued)
			f.ledger.authority({
				authorId: author.id,
				claim,
				status: 'issued',
				channel: 'file',
				expectedRevision: f.ledger.open().revision,
			});
		f.ledger.advise({
			forecast: {
				...f.forecast,
				demands: [
					{
						...f.forecast.demands[0],
						packet: {...f.packet, revision: 'new-role', instructions: 'Changed role instructions.'},
					},
				],
			},
			capacity: f.capacity,
			expectedRevision: f.ledger.open().revision,
		});
		const saved = f.ledger.open().authors[0];
		assert.equal(saved.packetDigest, author.packetDigest);
		assert.equal(saved.assignment.attemptId, claim.attemptId);
		assert.equal(saved.status, 'uncertain');
		f.ledger.observe({
			authorId: author.id,
			agentId: author.agentId,
			status: 'live',
			observation: 'fake-host/still-live',
			expectedRevision: f.ledger.open().revision,
		});
		assert.throws(
			() =>
				f.ledger.authority({
					authorId: author.id,
					claim,
					status: 'issued',
					expectedRevision: f.ledger.open().revision,
				}),
			/live prepared/,
		);
		assert.throws(
			() => f.ledger.withAssignment({authorId: author.id, claim}, () => assert.fail('stale assigned write')),
			/unavailable/,
		);
	}
});

test('ceiling retries require accounted free slots, not omitted managed IDs, and positive closure can release them', (scenario) => {
	const f = fixture(scenario),
		existing = f.ready(f.reserve(), 'existing-managed'),
		failed = f.reserve();
	const capacity = {...f.capacity, id: 'before-ceiling', openThreadIds: ['primary', 'researcher', existing.agentId]};
	f.ledger.advise({forecast: f.forecast, capacity, expectedRevision: f.ledger.open().revision});
	f.ledger.failed({
		authorId: failed.id,
		attemptId: failed.attemptId,
		outcome: 'absent',
		ceiling: true,
		observation: 'fake-host/ceiling',
		expectedRevision: f.ledger.open().revision,
	});
	const savedFree = f.ledger.open().ceiling.freeSlots;
	f.ledger.advise({
		forecast: f.forecast,
		capacity: {...f.capacity, id: 'omitted-managed'},
		expectedRevision: f.ledger.open().revision,
	});
	assert.equal(f.ledger.open().ceiling.freeSlots, savedFree);
	assert.equal(f.reserve(), null);
	f.ledger.observe({
		authorId: existing.id,
		agentId: existing.agentId,
		status: 'closed',
		observation: 'fake-host/confirmed-closure',
		expectedRevision: f.ledger.open().revision,
	});
	f.ledger.advise({
		forecast: f.forecast,
		capacity: {...f.capacity, id: 'positive-closure'},
		expectedRevision: f.ledger.open().revision,
	});
	assert.equal(f.ledger.open().ceiling, null);
	assert.ok(f.reserve());
	const another = fixture(scenario),
		omitted = another.ready(another.reserve(), 'never-in-snapshot'),
		second = another.reserve();
	another.ledger.failed({
		authorId: second.id,
		attemptId: second.attemptId,
		outcome: 'absent',
		ceiling: true,
		observation: 'fake-host/ceiling-with-outstanding',
		expectedRevision: another.ledger.open().revision,
	});
	another.ledger.observe({
		authorId: omitted.id,
		agentId: omitted.agentId,
		status: 'closed',
		observation: 'fake-host/positive-closed-unobserved-thread',
		expectedRevision: another.ledger.open().revision,
	});
	another.ledger.advise({
		forecast: another.forecast,
		capacity: {...another.capacity, id: 'positive-capacity-after-closure'},
		expectedRevision: another.ledger.open().revision,
	});
	assert.equal(another.ledger.open().ceiling, null);
	assert.ok(another.reserve());
});

test('pre-claim race retains baseline prior attempt evidence for safe no-new-claim recovery', (scenario) => {
	const f = fixture(scenario),
		author = f.ready(f.reserve(), 'same-actual-author');
	f.ledger.beginAssignment({
		authorId: author.id,
		itemId: 'alpha',
		role: author.role,
		packetDigest: author.packetDigest,
		bindings: author.packet.bindings,
		priorAttemptId: 'prior-accepted-attempt',
		observation: 'fake-host/before-racing-claim',
		expectedRevision: f.ledger.open().revision,
	});
	f.ledger.release({
		authorId: author.id,
		coordinatorState: {
			attempts: {
				alpha: {itemId: 'alpha', id: 'prior-accepted-attempt', agentId: author.agentId, status: 'accepted'},
			},
		},
		observation: {
			status: 'stopped',
			agentId: author.agentId,
			attemptId: null,
			ref: 'fake-host/no-new-claim-and-stopped',
		},
		expectedRevision: f.ledger.open().revision,
	});
	assert.equal(f.ledger.open().authors[0].status, 'available');
	assert.equal(f.ledger.open().authors[0].contributions[0].attemptId, 'prior-accepted-attempt');
});
