import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** Product/run-owned author preparation ledger, independent of operational planning.
 * Host calls remain parent-owned; this class never creates model processes or capabilities.
 * @implements {DesignPreparationLedger}
 */
export class DesignPreparation {
	/** Creates a ledger beside the consuming application's coordinator.
	 * @param {string} directory - Explicit product-owned preparation directory.
	 */
	constructor(directory) {
		if (typeof directory !== 'string' || !directory.trim()) throw new Error('Preparation directory is required');
		this._directory = path.resolve(directory);
		if (this._directory === path.parse(this._directory).root)
			throw new Error('Filesystem root is not preparation storage');
	}

	/** Called by persistence to reject linked storage paths.
	 * @param {string} target - Owned storage path.
	 * @returns {void}
	 */
	_checkPath(target) {
		for (let current = target; current !== path.dirname(current); current = path.dirname(current))
			if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
				throw new Error('Linked preparation path');
	}

	/** Called by binding validation to identify exact JSON bytes.
	 * @param {unknown} value - Finite JSON data.
	 * @returns {string} - SHA-256 identity.
	 */
	_digest(value) {
		return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
	}

	/** Called by ingress to validate a nonempty bounded identity.
	 * @param {unknown} value - Candidate identity.
	 * @returns {void}
	 */
	_identity(value) {
		if (typeof value !== 'string' || !value.trim() || value.length > 512)
			throw new Error('Invalid preparation identity');
	}

	/** Called by durable ingress to reject undeclared fields and authority smuggling.
	 * @param {unknown} value - Candidate plain record.
	 * @param {string[]} names - Complete owned field vocabulary.
	 * @returns {void}
	 */
	_fields(value, names) {
		if (
			!value ||
			typeof value !== 'object' ||
			Array.isArray(value) ||
			Object.keys(value).sort().join(',') !== [...names].sort().join(',')
		)
			throw new Error('Invalid preparation record fields');
	}

	/** Called by ingress to forbid volatile secrets and non-JSON data.
	 * @param {unknown} value - Candidate durable data.
	 * @returns {void}
	 */
	_json(value) {
		if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
		if (typeof value === 'number' && Number.isFinite(value)) return;
		if (!value || typeof value !== 'object') throw new Error('Preparation state must be finite JSON');
		for (const [name, child] of Object.entries(value)) {
			if (/token|secret|capability|password|access.?key/i.test(name))
				throw new Error('Preparation cannot persist capabilities');
			this._json(child);
		}
	}

	/** Called by packet ingress to bind bounded saved inputs without author permissions.
	 * @param {DesignPreparationPacket} packet - Exact read-only preparation packet.
	 * @returns {void}
	 */
	_packet(packet) {
		this._json(packet);
		if (!packet || Object.keys(packet).sort().join(',') !== 'bindings,instructions,revision,scope')
			throw new Error('Invalid preparation packet');
		this._identity(packet.revision);
		this._identity(packet.scope);
		if (
			typeof packet.instructions !== 'string' ||
			!packet.instructions.trim() ||
			Buffer.byteLength(JSON.stringify(packet)) > 16384
		)
			throw new Error('Preparation packet must be bounded to 16384 bytes');
		if (!Array.isArray(packet.bindings) || !packet.bindings.length)
			throw new Error('Saved preparation inputs are required');
		for (const binding of packet.bindings) {
			if (!binding || Object.keys(binding).sort().join(',') !== 'digest,ref')
				throw new Error('Invalid preparation binding');
			this._identity(binding.ref);
			if (!/^[a-f0-9]{64}$/.test(binding.digest) || /^(.)\1{63}$/.test(binding.digest))
				throw new Error('Invalid preparation digest');
		}
		if (new Set(packet.bindings.map((binding) => binding.ref)).size !== packet.bindings.length)
			throw new Error('Duplicate preparation binding');
	}

	/** Called by host ingress to validate positive bounded capacity observations.
	 * @param {DesignPreparationCapacity} capacity - Host-wide observation including primary and outsiders.
	 * @returns {void}
	 */
	_capacity(capacity) {
		this._json(capacity);
		this._fields(capacity, [
			'id',
			'observedAt',
			'runtimeLimit',
			'configuredSubagentLimit',
			'openThreadIds',
			'reviewerReserve',
			'conservativeSlots',
		]);
		this._identity(capacity.id);
		this._identity(capacity.observedAt);
		for (const name of ['runtimeLimit', 'configuredSubagentLimit'])
			if (capacity[name] !== null && (!Number.isSafeInteger(capacity[name]) || capacity[name] < 1))
				throw new Error('Invalid observed host limit');
		if (
			Buffer.byteLength(JSON.stringify(capacity)) > 16384 ||
			!Array.isArray(capacity.openThreadIds) ||
			capacity.openThreadIds.length > 256 ||
			new Set(capacity.openThreadIds).size !== capacity.openThreadIds.length
		)
			throw new Error('Invalid host thread observation');
		capacity.openThreadIds.forEach((identity) => this._identity(identity));
		if (!Number.isSafeInteger(capacity.reviewerReserve) || capacity.reviewerReserve < 1)
			throw new Error('At least one independent reviewer slot must be reserved');
		if (
			!Number.isSafeInteger(capacity.conservativeSlots) ||
			capacity.conservativeSlots < 0 ||
			capacity.conservativeSlots > 2
		)
			throw new Error('Unknown capacity requires a conservative zero-to-two slot budget');
	}

	/** Called by persistence to validate the complete closed ledger contract.
	 * @param {DesignPreparationState} state - Candidate durable snapshot.
	 * @returns {void}
	 */
	_validate(state) {
		this._json(state);
		this._fields(state, ['format', 'revision', 'scope', 'forecast', 'capacity', 'ceiling', 'authors', 'history']);
		if (state?.format !== 'design-preparation/1' || !Number.isSafeInteger(state.revision) || state.revision < 1)
			throw new Error('Invalid preparation state');
		this._identity(state.scope);
		if (!Array.isArray(state.authors) || !Array.isArray(state.history))
			throw new Error('Invalid preparation records');
		if (state.forecast) {
			this._forecast(state.forecast);
			if (state.forecast.demands.some((demand) => demand.packet.scope !== state.scope))
				throw new Error('Invalid saved forecast scope');
		}
		if (state.capacity) this._capacity(state.capacity);
		if (state.ceiling) {
			this._fields(state.ceiling, ['capacity', 'observation', 'freeSlots']);
			this._capacity(state.ceiling.capacity);
			this._identity(state.ceiling.observation);
			if (state.ceiling.freeSlots !== null && !Number.isSafeInteger(state.ceiling.freeSlots))
				throw new Error('Invalid saved ceiling accounting');
		}
		const identities = new Set(),
			attempts = new Set(),
			records = new Set(),
			assignedItems = new Set();
		for (const author of state.authors) {
			this._fields(author, [
				'id',
				'role',
				'attemptId',
				'agentId',
				'packet',
				'packetDigest',
				'status',
				'thread',
				'ack',
				'assignment',
				'contributions',
				'observations',
			]);
			this._identity(author.id);
			this._identity(author.role);
			this._identity(author.attemptId);
			this._packet(author.packet);
			if (
				!['ux-planner', 'ui-designer'].includes(author.role) ||
				author.packet.scope !== state.scope ||
				!['preparing', 'available', 'assigned', 'failed', 'uncertain', 'retired'].includes(author.status) ||
				!['unknown', 'open', 'absent', 'closed'].includes(author.thread) ||
				author.packetDigest !== this._digest(author.packet) ||
				attempts.has(author.attemptId) ||
				!Array.isArray(author.contributions) ||
				!Array.isArray(author.observations) ||
				records.has(author.id)
			)
				throw new Error('Invalid saved author');
			records.add(author.id);
			attempts.add(author.attemptId);
			if (author.agentId !== null) {
				this._identity(author.agentId);
				if (identities.has(author.agentId)) throw new Error('Duplicate actual author identity');
				identities.add(author.agentId);
			}
			if (['open', 'closed'].includes(author.thread) && !author.agentId)
				throw new Error('Observed thread requires actual identity');
			if (author.status === 'failed' && author.thread !== 'absent')
				throw new Error('Failed creation requires confirmed absence');
			if (author.ack) {
				this._fields(author.ack, ['agentId', 'attemptId', 'packetDigest', 'observation']);
				this._identity(author.ack.observation);
				if (
					author.ack.agentId !== author.agentId ||
					author.ack.attemptId !== author.attemptId ||
					author.ack.packetDigest !== author.packetDigest
				)
					throw new Error('Invalid saved acknowledgment');
			}
			if (author.status === 'available' && (!author.ack || author.thread !== 'open' || author.assignment))
				throw new Error('Availability requires exact acknowledgment and positive liveness');
			if (author.assignment) {
				if (!author.agentId || !author.ack) throw new Error('Assignment requires actual acknowledged author');
				this._fields(author.assignment, ['itemId', 'attemptId', 'authority', 'channel']);
				this._identity(author.assignment.itemId);
				if (author.assignment.attemptId !== null) this._identity(author.assignment.attemptId);
				if (
					!['pending', 'issued', 'revoked'].includes(author.assignment.authority) ||
					![null, 'file', 'service'].includes(author.assignment.channel) ||
					(author.assignment.authority === 'issued' &&
						(!author.assignment.channel || !author.assignment.attemptId))
				)
					throw new Error('Invalid assignment authority state');
				if (author.status !== 'assigned' && author.status !== 'uncertain')
					throw new Error('Unresolved assignment cannot be released');
				if (assignedItems.has(author.assignment.itemId)) throw new Error('Duplicate saved assignment');
				assignedItems.add(author.assignment.itemId);
			}
			if (author.status === 'assigned' && !author.assignment)
				throw new Error('Assigned author requires saved assignment');
		}
		if (this._count(state) > 4 || state.authors.filter((author) => author.assignment).length > 2)
			throw new Error('Preparation author ceiling exceeded');
	}

	/** Called by forecasts to validate advice separately from assignment authority.
	 * @param {DesignPreparationForecast} forecast - Current and later role demand.
	 * @returns {void}
	 */
	_forecast(forecast) {
		this._json(forecast);
		this._fields(forecast, ['revision', 'demands', 'laterRoles']);
		this._identity(forecast.revision);
		if (!Array.isArray(forecast.demands) || !Array.isArray(forecast.laterRoles))
			throw new Error('Invalid author forecast');
		for (const demand of [...forecast.demands, ...forecast.laterRoles]) {
			if (
				!['ux-planner', 'ui-designer'].includes(demand.role) ||
				!Number.isSafeInteger(demand.count) ||
				demand.count < 1 ||
				demand.count > 4
			)
				throw new Error('Invalid author demand');
		}
		for (const demand of forecast.demands) {
			this._fields(demand, ['role', 'count', 'packet']);
			this._packet(demand.packet);
		}
		for (const later of forecast.laterRoles) this._fields(later, ['role', 'count']);
		for (const group of [forecast.demands, forecast.laterRoles])
			if (new Set(group.map((demand) => demand.role)).size !== group.length)
				throw new Error('Duplicate forecast role');
	}

	/** Called by accounting to count every known or potentially open author.
	 * @param {DesignPreparationState} state - Verified ledger.
	 * @returns {number} - Reserved pool slots, including unknown creation outcomes.
	 */
	_count(state) {
		return state.authors.filter((author) => !['absent', 'closed'].includes(author.thread)).length;
	}

	/** Called by dispatch guards to verify stable advice while allowing final input supersets.
	 * @param {DesignPreparationState} state - Verified current ledger.
	 * @param {DesignPreparationAuthor} author - Actual preparation attempt.
	 * @returns {boolean} - Current stable bindings and no invalidation of this attempt.
	 */
	_packetCurrent(state, author) {
		const demand = state.forecast?.demands.find((entry) => entry.role === author.role);
		return (
			(!demand ||
				demand.packet.bindings.every((binding) =>
					author.packet.bindings.some(
						(saved) => saved.ref === binding.ref && saved.digest === binding.digest,
					),
				)) &&
			!author.observations.some(
				(entry) => entry.event === 'forecast-invalidated' && entry.attemptId === author.attemptId,
			)
		);
	}

	/** Called by host accounting to include managed threads missing from a positive snapshot.
	 * @param {DesignPreparationState} state - Known and potentially open authors.
	 * @param {DesignPreparationCapacity} capacity - Host-wide snapshot.
	 * @returns {number | null} - Accounted free physical host slots, or unknown capacity.
	 */
	_freeHostSlots(state, capacity) {
		if (capacity.runtimeLimit === null) return null;
		const outstanding = state.authors.filter(
			(author) =>
				!['closed', 'absent'].includes(author.thread) &&
				(!author.agentId || !capacity.openThreadIds.includes(author.agentId)),
		).length;
		return capacity.runtimeLimit - capacity.openThreadIds.length - outstanding;
	}

	/** Called by transitions to locate an exact preparation record.
	 * @param {DesignPreparationState} state - Verified ledger.
	 * @param {string} authorId - Managed record identity.
	 * @returns {DesignPreparationAuthor} - Exact retained record.
	 */
	_author(state, authorId) {
		const author = state.authors.find((candidate) => candidate.id === authorId);
		if (!author) throw new Error('Unknown preparation author');
		return author;
	}

	/** Called by persistence to read a validated atomic envelope.
	 * @returns {DesignPreparationState} - Verified durable state.
	 */
	_read() {
		const target = path.join(this._directory, 'state.json');
		this._checkPath(target);
		const envelope = JSON.parse(fs.readFileSync(target, 'utf8'));
		if (envelope.digest !== this._digest(envelope.payload)) throw new Error('Inconsistent preparation envelope');
		this._validate(envelope.payload);
		return envelope.payload;
	}

	/** Called by persistence to publish complete fsynced bytes without unlinking prior state.
	 * @param {DesignPreparationState} state - Validated next ledger.
	 * @returns {void}
	 */
	_write(state) {
		this._validate(state);
		const target = path.join(this._directory, 'state.json'),
			temporary = path.join(this._directory, `${crypto.randomUUID()}.pending`);
		this._checkPath(target);
		const descriptor = fs.openSync(temporary, 'wx');
		try {
			fs.writeFileSync(descriptor, JSON.stringify({digest: this._digest(state), payload: state}, null, 2) + '\n');
			fs.fsyncSync(descriptor);
		} finally {
			fs.closeSync(descriptor);
		}
		for (let attempt = 0; ; attempt++) {
			try {
				fs.renameSync(temporary, target);
				return;
			} catch (error) {
				if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 19)
					throw error;
				Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
			}
		}
	}

	/** Called by transitions to serialize pool mutation and reject stale observations.
	 * Crash-surviving locks are never stolen; inspect the owner before removing one.
	 * @param {number} expectedRevision - Exact observed ledger revision.
	 * @param {DesignPreparationMutation} action - Synchronous state transition.
	 * @returns {DesignPreparationState} - Committed ledger.
	 */
	_mutate(expectedRevision, action) {
		this._checkPath(this._directory);
		const lock = path.join(this._directory, 'writer.lock');
		this._checkPath(lock);
		const descriptor = fs.openSync(lock, 'wx');
		try {
			fs.writeFileSync(descriptor, JSON.stringify({pid: process.pid, token: crypto.randomUUID()}));
			fs.fsyncSync(descriptor);
			const state = this._read();
			if (state.revision !== expectedRevision) throw new Error('Stale preparation revision');
			action(state);
			state.revision++;
			this._write(state);
			return state;
		} finally {
			fs.closeSync(descriptor);
			fs.unlinkSync(lock);
		}
	}

	/** Call this method to start preparation before a full operational plan exists.
	 * @param {DesignPreparationInitialization} request - Product/run identity.
	 * @returns {DesignPreparationState} - Initial durable ledger.
	 */
	initialize({scope}) {
		this._identity(scope);
		this._checkPath(this._directory);
		fs.mkdirSync(this._directory, {recursive: true});
		const lock = path.join(this._directory, 'writer.lock');
		this._checkPath(lock);
		const descriptor = fs.openSync(lock, 'wx');
		try {
			if (fs.existsSync(path.join(this._directory, 'state.json')))
				throw new Error('Preparation already initialized');
			fs.writeFileSync(descriptor, JSON.stringify({pid: process.pid, token: crypto.randomUUID()}));
			fs.fsyncSync(descriptor);
			const state = {
				format: 'design-preparation/1',
				revision: 1,
				scope,
				forecast: null,
				capacity: null,
				ceiling: null,
				authors: [],
				history: [],
			};
			this._write(state);
			return state;
		} finally {
			fs.closeSync(descriptor);
			fs.unlinkSync(lock);
		}
	}

	/** Call this method to reopen without assuming saved authors are currently available.
	 * Saved positive observations remain evidence; reconcile them before new dispatch.
	 * @returns {DesignPreparationState} - Exact persisted ledger.
	 */
	open() {
		return this._read();
	}

	/** Call this method to inspect pool, authoring and unresolved creation counts.
	 * @returns {DesignPreparationInspection} - Ledger plus bounded operational counts.
	 */
	inspect() {
		const state = this._read();
		return {
			state,
			openCount: this._count(state),
			authoringCount: state.authors.filter((author) => author.assignment).length,
			uncertain: state.authors
				.filter((author) => author.thread === 'unknown' || author.status === 'uncertain')
				.map((author) => author.id),
		};
	}

	/** Call this method before each preparation batch to persist forecast and actual host capacity.
	 * Capacity backoff clears only after a positive increase in observed free host threads.
	 * @param {DesignPreparationAdvice} request - Forecast, host snapshot and CAS revision.
	 * @returns {DesignPreparationState} - Current advice and capacity record.
	 */
	advise({forecast, capacity, expectedRevision}) {
		this._forecast(forecast);
		this._capacity(capacity);
		return this._mutate(expectedRevision, (state) => {
			if (forecast.demands.some((demand) => demand.packet.scope !== state.scope))
				throw new Error('Forecast product/run scope mismatch');
			const freeSlots = this._freeHostSlots(state, capacity);
			if (
				state.ceiling &&
				capacity.id !== state.ceiling.capacity.id &&
				freeSlots !== null &&
				state.ceiling.freeSlots !== null &&
				freeSlots > state.ceiling.freeSlots
			)
				state.ceiling = null;
			for (const author of state.authors) {
				const previous = state.forecast?.demands.find((entry) => entry.role === author.role);
				const current = forecast.demands.find((entry) => entry.role === author.role);
				if (
					!previous ||
					!current ||
					this._digest(previous.packet) === this._digest(current.packet) ||
					['closed', 'absent'].includes(author.thread)
				)
					continue;
				author.observations.push({
					event: 'forecast-invalidated',
					forecastRevision: forecast.revision,
					attemptId: author.attemptId,
				});
				if (author.assignment || !author.agentId) author.status = 'uncertain';
				else {
					author.packet = structuredClone(current.packet);
					author.packetDigest = this._digest(current.packet);
					author.attemptId = crypto.randomUUID();
					author.ack = null;
					if (!['retired', 'failed'].includes(author.status))
						author.status = author.thread === 'open' ? 'preparing' : 'uncertain';
				}
			}
			state.forecast = structuredClone(forecast);
			state.capacity = structuredClone(capacity);
			state.history.push({
				event: 'advice',
				forecastRevision: forecast.revision,
				capacity: structuredClone(capacity),
			});
		});
	}

	/** Call this method to reserve unmet forecast demand before the parent calls spawn.
	 * Compatible available/preparing authors are counted first. Later incompatible
	 * roles reserve managed slots even when host closure is unavailable.
	 * @param {DesignPreparationReservation} request - Desired specialty and CAS revision.
	 * @returns {DesignPreparationState} - Ledger containing one new creation intent, or a refusal reason.
	 */
	reserve({role, expectedRevision}) {
		return this._mutate(expectedRevision, (state) => {
			const demand = state.forecast?.demands.find((entry) => entry.role === role);
			if (!demand || !state.capacity) throw new Error('Saved forecast and host observation are required');
			let reason = null;
			const matching = state.authors.filter(
				(author) =>
					author.role === role &&
					author.packetDigest === this._digest(demand.packet) &&
					!['closed', 'absent'].includes(author.thread) &&
					!['failed', 'retired'].includes(author.status),
			);
			const laterReserve = state.forecast.laterRoles.reduce(
				(sum, later) =>
					sum +
					Math.max(
						0,
						later.count -
							(later.role === role ? 1 : 0) -
							state.authors.filter(
								(author) =>
									author.role === later.role &&
									!['closed', 'absent'].includes(author.thread) &&
									!['failed', 'retired'].includes(author.status),
							).length,
					),
				0,
			);
			const outstanding = state.authors.filter(
				(author) =>
					!['closed', 'absent'].includes(author.thread) &&
					(!author.agentId || !state.capacity.openThreadIds.includes(author.agentId)),
			).length;
			const hostFree =
				state.capacity.runtimeLimit === null
					? state.capacity.conservativeSlots - outstanding
					: this._freeHostSlots(state, state.capacity) - state.capacity.reviewerReserve;
			const reusable = state.authors.filter(
				(author) =>
					author.role === role &&
					!author.assignment &&
					!['closed', 'absent'].includes(author.thread) &&
					!['failed', 'retired'].includes(author.status),
			);
			if (matching.length >= demand.count) reason = 'compatible-author-first';
			else if (reusable.length >= demand.count)
				reason = 'existing-author-requires-reconciliation-or-packet-refresh';
			else if (state.ceiling) reason = 'host-ceiling-backoff';
			else if (this._count(state) + 1 + laterReserve > 4) reason = 'managed-pool-or-later-role-reserve';
			else if (hostFree <= 0) reason = 'host-reviewer-reserve';
			if (reason) state.history.push({event: 'reservation-refused', role, reason});
			else {
				const author = {
					id: crypto.randomUUID(),
					attemptId: crypto.randomUUID(),
					agentId: null,
					role,
					packet: structuredClone(demand.packet),
					packetDigest: this._digest(demand.packet),
					status: 'preparing',
					thread: 'unknown',
					ack: null,
					assignment: null,
					contributions: [],
					observations: [],
				};
				state.authors.push(author);
				state.history.push({
					event: 'creation-intent',
					authorId: author.id,
					attemptId: author.attemptId,
					forecastRevision: state.forecast.revision,
					capacityId: state.capacity.id,
				});
			}
		});
	}

	/** Call this method to bind a successful spawn or positively reconcile its crash window.
	 * @param {DesignPreparationCreation} request - Exact intent, actual identity and observation.
	 * @returns {DesignPreparationState} - Bound actual author; still without permissions.
	 */
	created({authorId, attemptId, agentId, observation, expectedRevision}) {
		this._identity(agentId);
		this._identity(observation);
		return this._mutate(expectedRevision, (state) => {
			const author = this._author(state, authorId);
			if (
				author.attemptId !== attemptId ||
				(author.agentId !== null && author.agentId !== agentId) ||
				['closed', 'absent'].includes(author.thread)
			)
				throw new Error('Creation observation does not match saved intent');
			author.agentId = agentId;
			author.thread = 'open';
			if (!author.assignment && !author.ack) author.status = 'preparing';
			author.observations.push({event: 'created', observation, agentId, attemptId});
		});
	}

	/** Call this method after a failed creation; unknown outcomes retain their slots.
	 * A ceiling stops the entire speculative batch, including after partial success.
	 * @param {DesignPreparationFailure} request - Exact intent and positively known outcome.
	 * @returns {DesignPreparationState} - Failed or uncertain reservation and optional backoff.
	 */
	failed({authorId, attemptId, outcome, ceiling = false, observation, expectedRevision}) {
		this._identity(observation);
		if (!['absent', 'unknown'].includes(outcome)) throw new Error('Invalid creation failure observation');
		return this._mutate(expectedRevision, (state) => {
			const author = this._author(state, authorId);
			if (author.attemptId !== attemptId || author.agentId || author.assignment)
				throw new Error('Creation failure does not match pending intent');
			author.thread = outcome;
			author.status = outcome === 'absent' ? 'failed' : 'uncertain';
			author.observations.push({event: 'creation-failed', observation, outcome});
			if (ceiling)
				state.ceiling = {
					capacity: structuredClone(state.capacity),
					observation,
					freeSlots: this._freeHostSlots(state, state.capacity),
				};
		});
	}

	/** Call this method to adopt an actual compatible author after positive availability confirmation.
	 * Adoption requires a fresh exact preparation acknowledgment; provenance is retained.
	 * @param {DesignPreparationAdoption} request - Actual specialty, bounded packet and prior contributions.
	 * @returns {DesignPreparationState} - Preparing adopted author counted against the same ceiling.
	 */
	adopt({
		agentId,
		role,
		actualRole,
		assignmentResolved,
		authorityRevoked,
		packet,
		contributions = [],
		observation,
		expectedRevision,
	}) {
		this._identity(agentId);
		this._identity(observation);
		this._packet(packet);
		if (actualRole !== role || assignmentResolved !== true || authorityRevoked !== true)
			throw new Error(
				'Adoption requires actual compatible role, resolved assignment and revoked prior authority',
			);
		return this._mutate(expectedRevision, (state) => {
			const laterReserve = (state.forecast?.laterRoles ?? []).reduce(
				(sum, later) =>
					sum +
					Math.max(
						0,
						later.count -
							(later.role === role ? 1 : 0) -
							state.authors.filter(
								(author) =>
									author.role === later.role &&
									!['closed', 'absent'].includes(author.thread) &&
									!['failed', 'retired'].includes(author.status),
							).length,
					),
				0,
			);
			if (this._count(state) + 1 + laterReserve > 4 || packet.scope !== state.scope)
				throw new Error('Adoption exceeds pool, later-role reserve or scope');
			if (state.authors.some((author) => author.agentId === agentId))
				throw new Error('Author identity already tracked');
			state.authors.push({
				id: crypto.randomUUID(),
				attemptId: crypto.randomUUID(),
				agentId,
				role,
				packet: structuredClone(packet),
				packetDigest: this._digest(packet),
				status: 'preparing',
				thread: 'open',
				ack: null,
				assignment: null,
				contributions: structuredClone(contributions),
				observations: [{event: 'adopted-available', observation}],
			});
		});
	}

	/** Call this method to accept an exact read-and-wait acknowledgment.
	 * Duplicate exact acknowledgments are harmless; obsolete identities reject.
	 * @param {DesignPreparationAcknowledgment} request - Exact identity, attempt, packet and positive observation.
	 * @returns {DesignPreparationState} - Available author with zero authoring authority.
	 */
	acknowledge({authorId, agentId, attemptId, packetDigest, observation, expectedRevision}) {
		this._identity(observation);
		return this._mutate(expectedRevision, (state) => {
			const author = this._author(state, authorId);
			if (
				author.agentId !== agentId ||
				author.attemptId !== attemptId ||
				author.packetDigest !== packetDigest ||
				author.thread !== 'open' ||
				author.assignment ||
				!['preparing', 'available', 'uncertain'].includes(author.status) ||
				!this._packetCurrent(state, author)
			)
				throw new Error('Stale or incompatible preparation acknowledgment');
			author.ack = {agentId, attemptId, packetDigest, observation};
			author.status = 'available';
			author.observations.push({event: 'acknowledged', observation});
		});
	}

	/** Call this method after an input change to request a new bounded read-and-wait turn.
	 * @param {DesignPreparationPacketRefresh} request - Unassigned actual author and replacement packet.
	 * @returns {DesignPreparationState} - New attempt requiring a new acknowledgment.
	 */
	refreshPacket({authorId, packet, expectedRevision}) {
		this._packet(packet);
		return this._mutate(expectedRevision, (state) => {
			const author = this._author(state, authorId);
			if (author.assignment || author.thread !== 'open' || !author.agentId || packet.scope !== state.scope)
				throw new Error('Resolve current assignment and liveness before packet refresh');
			author.packet = structuredClone(packet);
			author.packetDigest = this._digest(packet);
			author.attemptId = crypto.randomUUID();
			author.ack = null;
			author.status = 'preparing';
		});
	}

	/** Call this method on resume to reconcile positive host observations without freeing unknown slots.
	 * Closing a thread retains unresolved assignment effects and contributor provenance.
	 * @param {DesignPreparationObservation} request - Exact actual identity and liveness evidence.
	 * @returns {DesignPreparationState} - Reconciled liveness, independent of assignment status.
	 */
	observe({authorId, agentId, status, observation, expectedRevision}) {
		this._identity(observation);
		if (!['available', 'live', 'unknown', 'closed'].includes(status))
			throw new Error('Invalid host author observation');
		return this._mutate(expectedRevision, (state) => {
			const author = this._author(state, authorId);
			if (!agentId || author.agentId !== agentId) throw new Error('Observation requires exact actual identity');
			if (['closed', 'absent'].includes(author.thread)) throw new Error('Terminated author cannot be reopened');
			if (status === 'closed') {
				author.thread = 'closed';
				author.status = author.assignment ? 'uncertain' : 'retired';
			} else if (status === 'unknown') {
				author.thread = 'unknown';
				author.status = 'uncertain';
			} else {
				author.thread = 'open';
				if (author.assignment) author.status = this._packetCurrent(state, author) ? 'assigned' : 'uncertain';
				else if (status === 'available') author.status = author.ack ? 'available' : 'preparing';
			}
			author.observations.push({event: 'observed', status, observation});
		});
	}

	/** Call this method to retire unneeded preparation without pretending its thread closed.
	 * @param {DesignPreparationRetirement} request - Resolved author and reason.
	 * @returns {DesignPreparationState} - Retained retired author; open threads still count.
	 */
	retire({authorId, observation, expectedRevision}) {
		this._identity(observation);
		return this._mutate(expectedRevision, (state) => {
			const author = this._author(state, authorId);
			if (author.assignment) throw new Error('Cannot retire unresolved assignment');
			author.status = 'retired';
			author.observations.push({event: 'retired', observation});
		});
	}

	/** Call this method before claiming ready work to save a bounded assignment intent.
	 * Final preparation sources must be observed current by the parent. It grants no writes.
	 * @param {DesignPreparationAssignmentIntent} request - Exact role, packet and final input observations.
	 * @returns {DesignPreparationState} - Persisted assignment reservation, blocking duplicate claims.
	 */
	beginAssignment({
		authorId,
		itemId,
		role,
		packetDigest,
		bindings,
		observation,
		priorAttemptId = null,
		expectedRevision,
	}) {
		this._identity(itemId);
		this._identity(observation);
		if (priorAttemptId !== null) this._identity(priorAttemptId);
		return this._mutate(expectedRevision, (state) => {
			const author = this._author(state, authorId);
			if (
				author.status !== 'available' ||
				author.thread !== 'open' ||
				!author.ack ||
				author.assignment ||
				author.role !== role ||
				author.packetDigest !== packetDigest ||
				this._digest(bindings) !== this._digest(author.packet.bindings) ||
				!this._packetCurrent(state, author)
			)
				throw new Error('Author is unavailable or preparation inputs changed');
			if (
				state.authors.filter((entry) => entry.assignment).length >= 2 ||
				state.authors.some((entry) => entry.assignment?.itemId === itemId)
			)
				throw new Error('Concurrent author or assignment ceiling reached');
			author.assignment = {itemId, attemptId: null, authority: 'pending', channel: null};
			author.status = 'assigned';
			author.observations.push({event: 'assignment-intent', itemId, observation, priorAttemptId});
		});
	}

	/** Call this method after claiming, or to reconcile a crash after the claim was saved.
	 * @param {DesignPreparationClaimBinding} request - Verified coordinator state and exact managed author.
	 * @returns {DesignPreparationState} - Bound exact claim without issuing any capability.
	 */
	bindClaim({authorId, coordinatorState, expectedRevision}) {
		return this._mutate(expectedRevision, (state) => {
			const author = this._author(state, authorId),
				assignment = author.assignment;
			const attempt = assignment && coordinatorState.attempts[assignment.itemId];
			if (
				!attempt ||
				attempt.agentId !== author.agentId ||
				attempt.role !== author.role ||
				!['intent', 'running', 'uncertain'].includes(attempt.status) ||
				(assignment.attemptId && assignment.attemptId !== attempt.id)
			)
				throw new Error('Exact unresolved coordinator claim is required');
			assignment.attemptId = attempt.id;
			author.observations.push({event: 'claim-bound', itemId: assignment.itemId, attemptId: attempt.id});
		});
	}

	/** Call this method to guard an operation against the exact current prepared assignment.
	 * Holds the preparation lock while the existing coordinator guard performs its action.
	 * @param {DesignPreparationAssignmentGuard} request - Exact managed author and coordinator claim.
	 * @param {DesignPreparationGuardAction} action - Synchronous parent operation.
	 * @returns {unknown} - Existing guarded operation result.
	 */
	withAssignment({authorId, claim}, action) {
		if (typeof action !== 'function' || action.constructor.name === 'AsyncFunction')
			throw new Error('Synchronous prepared action required');
		const lock = path.join(this._directory, 'writer.lock');
		this._checkPath(lock);
		const descriptor = fs.openSync(lock, 'wx');
		try {
			fs.writeFileSync(descriptor, JSON.stringify({pid: process.pid, token: crypto.randomUUID()}));
			fs.fsyncSync(descriptor);
			const state = this._read();
			const author = this._author(state, authorId),
				assignment = author.assignment;
			if (
				author.status !== 'assigned' ||
				author.thread !== 'open' ||
				!assignment ||
				assignment.itemId !== claim.itemId ||
				assignment.attemptId !== claim.attemptId ||
				author.agentId !== claim.agentId ||
				assignment.authority !== 'issued' ||
				!this._packetCurrent(state, author)
			)
				throw new Error('Prepared assignment authority is unavailable');
			const result = action();
			if (result && typeof result.then === 'function') throw new Error('Prepared actions cannot return promises');
			return result;
		} finally {
			fs.closeSync(descriptor);
			fs.unlinkSync(lock);
		}
	}

	/** Call this method before granting scoped authority to keep crash outcomes conservative.
	 * @param {DesignPreparationAuthority} request - Exact current claim and authority state.
	 * @returns {DesignPreparationState} - Nonsecret authority status; no capability is persisted.
	 */
	authority({authorId, claim, status, channel = 'service', expectedRevision}) {
		if (!['issued', 'revoked'].includes(status)) throw new Error('Invalid author authority observation');
		if (!['file', 'service'].includes(channel)) throw new Error('Invalid author authority channel');
		return this._mutate(expectedRevision, (state) => {
			const author = this._author(state, authorId),
				assignment = author.assignment;
			if (
				!assignment ||
				!assignment.attemptId ||
				assignment.itemId !== claim.itemId ||
				assignment.attemptId !== claim.attemptId ||
				author.agentId !== claim.agentId ||
				(status === 'issued' &&
					(!this._packetCurrent(state, author) ||
						author.status !== 'assigned' ||
						author.thread !== 'open' ||
						assignment.authority === 'issued'))
			)
				throw new Error('Exact live prepared claim is required');
			assignment.authority = status;
			if (status === 'issued') assignment.channel = channel;
		});
	}

	/** Call this method only after resolution, capability revocation and positive stop confirmation.
	 * Claimless crash intents need explicit no-claim confirmation from the coordinator.
	 * @param {DesignPreparationRelease} request - Current coordinator snapshot and exact stopped observation.
	 * @returns {DesignPreparationState} - Reusable author with retained contributor provenance.
	 */
	release({authorId, coordinatorState, observation, expectedRevision}) {
		this._identity(observation?.ref);
		return this._mutate(expectedRevision, (state) => {
			const author = this._author(state, authorId),
				assignment = author.assignment;
			if (
				!assignment ||
				observation.status !== 'stopped' ||
				observation.agentId !== author.agentId ||
				observation.attemptId !== assignment.attemptId
			)
				throw new Error('Exact positive stop observation is required');
			const attempt = coordinatorState.attempts[assignment.itemId];
			const priorAttemptId = author.observations.findLast(
				(entry) => entry.event === 'assignment-intent' && entry.itemId === assignment.itemId,
			)?.priorAttemptId;
			if (
				assignment.attemptId === null
					? !!attempt &&
						((attempt.agentId === author.agentId && attempt.id !== priorAttemptId) ||
							!['accepted', 'failed', 'stale'].includes(attempt.status))
					: !attempt ||
						attempt.id !== assignment.attemptId ||
						attempt.agentId !== author.agentId ||
						!['accepted', 'failed', 'stale'].includes(attempt.status)
			)
				throw new Error('Resolve existing coordinator assignment before reuse');
			if (assignment.authority === 'issued') throw new Error('Revoke previous author authority before reuse');
			if (attempt?.agentId === author.agentId)
				author.contributions.push({
					itemId: attempt.itemId,
					attemptId: attempt.id,
					agentId: attempt.agentId,
					status: attempt.status,
				});
			author.assignment = null;
			author.status = author.thread === 'open' && author.ack ? 'available' : 'retired';
			author.observations.push({event: 'released', observation: structuredClone(observation)});
		});
	}

	/** Call this method to inspect a surviving exclusive writer without stealing its lock.
	 * @returns {DesignCoordinatorLock | null} - Actual lock-owner identity, or no lock.
	 */
	lockInfo() {
		const target = path.join(this._directory, 'writer.lock');
		this._checkPath(target);
		if (!fs.existsSync(target)) return null;
		const lock = JSON.parse(fs.readFileSync(target, 'utf8'));
		if (!Number.isSafeInteger(lock.pid) || lock.pid < 1 || typeof lock.token !== 'string' || !lock.token)
			throw new Error('Malformed preparation lock requires operator inspection');
		return lock;
	}

	/** Call this method to recover only an exact lock with a provably dead process owner.
	 * A living or permission-inaccessible owner retains the lock; age never authorizes removal.
	 * @param {string} token - Exact previously inspected lock identity.
	 * @returns {void} - Dead-owner lock removed; preparation records remain unchanged.
	 */
	recoverLock(token) {
		const lock = this.lockInfo();
		if (!lock || lock.token !== token) throw new Error('Preparation writer lock changed');
		try {
			process.kill(lock.pid, 0);
			throw new Error('Preparation writer owner is still alive');
		} catch (error) {
			if (error.code !== 'ESRCH') throw error;
		}
		if (this.lockInfo()?.token !== token) throw new Error('Preparation writer lock changed');
		fs.unlinkSync(path.join(this._directory, 'writer.lock'));
	}
}
