import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DesignPlan} from './DesignPlan.mjs';

/** Durable operational assignments referencing existing design and review artifacts. */
export class DesignCoordinator {
	/** Creates a coordinator for one explicitly owned, link-free planning directory.
	 *
	 * @param {string} directory - Product-owned operational state directory.
	 */
	constructor(directory) {
		if (typeof directory !== 'string' || !directory.trim()) throw new Error('A planning directory is required');
		this._directory = path.resolve(directory);
		if (this._directory === path.parse(this._directory).root)
			throw new Error('A filesystem root is not a planning directory');
	}

	/** Called by storage operations to reject linked directories and state files.
	 *
	 * @param {string} target - Owned directory or file path.
	 * @returns {void}
	 */
	_checkPath(target) {
		let current = target;
		while (current !== path.dirname(current)) {
			if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
				throw new Error('Linked planning path');
			current = path.dirname(current);
		}
	}

	/** Called by persistence to bind complete JSON bytes.
	 *
	 * @param {unknown} value - Finite JSON value.
	 * @returns {string} - SHA-256 JSON identity.
	 */
	_digest(value) {
		return crypto
			.createHash('sha256')
			.update(JSON.stringify(value) ?? 'undefined')
			.digest('hex');
	}

	/** Called by claims and deliveries to validate exact artifact identities.
	 *
	 * @param {DesignPlanBinding[]} bindings - Concrete immutable identities.
	 * @returns {void}
	 */
	_checkBindings(bindings) {
		if (
			!Array.isArray(bindings) ||
			bindings.some(
				(binding) =>
					!binding ||
					typeof binding.ref !== 'string' ||
					!binding.ref ||
					!/^[a-f0-9]{64}$/.test(binding.digest) ||
					/^(.)\1{63}$/.test(binding.digest),
			)
		)
			throw new Error('Invalid artifact bindings');
		if (new Set(bindings.map((binding) => binding.ref)).size !== bindings.length)
			throw new Error('Duplicate artifact binding');
	}

	/** Called by storage ingress to exclude process-local capabilities from durable data.
	 *
	 * @param {unknown} value - Candidate operational JSON.
	 * @returns {void}
	 */
	_checkPersistable(value) {
		if (!value || typeof value !== 'object') return;
		for (const [name, child] of Object.entries(value)) {
			if (/token|secret|capability|password|access.?key/i.test(name))
				throw new Error('Process-local capabilities cannot be persisted');
			this._checkPersistable(child);
		}
	}

	/** Called by persistence to verify the stored envelope before any dispatch.
	 *
	 * @returns {DesignCoordinatorState} - Verified durable state.
	 */
	_read() {
		const target = path.join(this._directory, 'state.json');
		this._checkPath(target);
		const envelope = JSON.parse(fs.readFileSync(target, 'utf8'));
		const state = envelope.payload;
		this._checkPersistable(state);
		if (
			envelope.digest !== this._digest(state) ||
			state?.format !== 'design-coordinator/1' ||
			!Number.isSafeInteger(state.revision) ||
			state.revision < 1
		)
			throw new Error('Inconsistent saved coordinator state');
		if (
			!new DesignPlan(state.plan).validate().valid ||
			state.planDigest !== this._digest(state.plan) ||
			!Array.isArray(state.history) ||
			!state.attempts ||
			!state.accepted ||
			!state.gates
		)
			throw new Error('Invalid saved coordinator state');
		this._checkBindings(state.bindings);
		for (const [itemId, attempt] of Object.entries(state.attempts)) {
			if (
				!state.plan.items.some((item) => item.id === itemId) ||
				attempt.itemId !== itemId ||
				!attempt.id ||
				!attempt.agentId ||
				!['intent', 'running', 'uncertain', 'delivered', 'accepted', 'failed', 'stale'].includes(attempt.status)
			)
				throw new Error('Malformed saved attempt');
			this._checkBindings(attempt.inputs);
			if (attempt.delivery) this._checkBindings(attempt.delivery.outputs);
		}
		for (const [itemId, result] of Object.entries(state.accepted)) {
			if (!result.agentId) throw new Error('Malformed saved acceptance');
			this._checkBindings(result.inputs);
			this._checkBindings(result.outputs);
			const attempt = state.attempts[itemId];
			if (
				!attempt ||
				attempt.status !== 'accepted' ||
				attempt.agentId !== result.agentId ||
				this._digest(attempt.delivery?.outputs) !== this._digest(result.outputs) ||
				this._digest(attempt.inputs) !== this._digest(result.inputs)
			)
				throw new Error('Inconsistent saved acceptance');
		}
		return state;
	}

	/** Called by state transitions to atomically publish complete verified bytes.
	 *
	 * @param {DesignCoordinatorState} state - Complete next operational state.
	 * @returns {void}
	 */
	_write(state) {
		this._checkPersistable(state);
		const target = path.join(this._directory, 'state.json');
		this._checkPath(target);
		const temporary = path.join(this._directory, `${crypto.randomUUID()}.pending`);
		let descriptor;
		try {
			descriptor = fs.openSync(temporary, 'wx');
			fs.writeFileSync(descriptor, JSON.stringify({digest: this._digest(state), payload: state}, null, 2) + '\n');
			fs.fsyncSync(descriptor);
			fs.closeSync(descriptor);
			descriptor = undefined;
			fs.renameSync(temporary, target);
		} finally {
			if (descriptor !== undefined) fs.closeSync(descriptor);
			if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
		}
	}

	/** Called by mutations to serialize writers and apply revision compare-and-swap.
	 * Synchronous mutations release their lock before returning. A surviving lock
	 * after a process crash requires explicit operator inspection; no timer steals it.
	 *
	 * @param {number} expectedRevision - Exact observed operational revision.
	 * @param {DesignCoordinatorMutation} mutation - Synchronous transition callback.
	 * @returns {DesignCoordinatorState} - Committed state snapshot.
	 */
	_mutate(expectedRevision, mutation) {
		this._checkPath(this._directory);
		const lock = path.join(this._directory, 'writer.lock');
		this._checkPath(lock);
		const descriptor = fs.openSync(lock, 'wx');
		try {
			fs.writeFileSync(descriptor, JSON.stringify({pid: process.pid, token: crypto.randomUUID()}));
			fs.fsyncSync(descriptor);
			const state = this._read();
			if (state.revision !== expectedRevision) throw new Error('Stale coordinator revision');
			mutation(state);
			state.revision++;
			this._write(state);
			return state;
		} finally {
			fs.closeSync(descriptor);
			fs.unlinkSync(lock);
		}
	}

	/** Called by claims to resolve producers only after their results are accepted.
	 *
	 * @param {DesignPlanItem | DesignPlanGate} item - Validated input owner.
	 * @param {DesignCoordinatorState} state - Current state.
	 * @returns {DesignPlanBinding[]} - Exact current input identities.
	 */
	_inputs(item, state) {
		return item.inputs.map((input) => {
			const binding = input.producer
				? state.accepted[input.producer]?.outputs.find((output) => output.ref === input.output)
				: state.bindings.find((binding) => binding.ref === input.ref && binding.digest === input.digest);
			if (!binding) throw new Error('Unresolved or stale input');
			return {...binding};
		});
	}

	/** Called by transitions to select the exact current attempt.
	 *
	 * @param {DesignCoordinatorState} state - Current state.
	 * @param {string} itemId - Owned work item identity.
	 * @param {string} attemptId - Expected attempt identity.
	 * @returns {DesignCoordinatorAttempt} - Current matching attempt.
	 */
	_attempt(state, itemId, attemptId) {
		const attempt = state.attempts[itemId];
		if (!attempt || attempt.id !== attemptId || ['stale', 'failed'].includes(attempt.status))
			throw new Error('Stale or missing attempt');
		return attempt;
	}

	/** Called by invalidation to preserve old contributions and invalidate dependents.
	 *
	 * @param {DesignCoordinatorState} state - Mutable current snapshot.
	 * @param {string[]} seeds - Directly affected work IDs.
	 * @returns {string[]} - Transitive affected IDs in stable plan order.
	 */
	_invalidate(state, seeds) {
		const affected = new Set(seeds);
		for (;;) {
			const before = affected.size;
			for (const item of state.plan.items) {
				if (
					item.dependsOn.some((dependency) => affected.has(dependency)) ||
					item.inputs.some((input) => input.producer && affected.has(input.producer)) ||
					item.requiredGates.some((gateId) =>
						affected.has(state.plan.gates.find((gate) => gate.id === gateId)?.reviewerItemId),
					)
				)
					affected.add(item.id);
			}
			if (affected.size === before) break;
		}
		for (const itemId of affected) {
			if (state.accepted[itemId]) {
				state.history.push({
					event: 'invalidated-acceptance',
					itemId,
					result: structuredClone(state.accepted[itemId]),
				});
				delete state.accepted[itemId];
			}
			if (state.attempts[itemId]) {
				state.history.push({
					event: 'invalidated-attempt',
					itemId,
					attempt: structuredClone(state.attempts[itemId]),
				});
				state.attempts[itemId].status = 'stale';
			}
		}
		for (const gate of state.plan.gates) if (affected.has(gate.reviewerItemId)) delete state.gates[gate.id];
		return state.plan.items.filter((item) => affected.has(item.id)).map((item) => item.id);
	}

	/** Call this method to persist a validated plan before its first assignment.
	 * Rejects existing state, malformed plans, linked paths, or invalid bindings.
	 *
	 * @param {DesignCoordinatorInitialization} request - Plan and observed bindings.
	 * @returns {DesignCoordinatorState} - Initial durable snapshot.
	 */
	initialize({plan, bindings}) {
		if (!new DesignPlan(plan).validate().valid) throw new Error('Invalid design plan');
		this._checkBindings(bindings);
		if (
			plan.sources.some(
				(source) => !bindings.some((binding) => binding.ref === source.ref && binding.digest === source.digest),
			)
		)
			throw new Error('Missing current plan source binding');
		this._checkPath(this._directory);
		fs.mkdirSync(this._directory, {recursive: true});
		const lock = path.join(this._directory, 'writer.lock');
		const descriptor = fs.openSync(lock, 'wx');
		try {
			fs.writeFileSync(descriptor, JSON.stringify({pid: process.pid, token: crypto.randomUUID()}));
			fs.fsyncSync(descriptor);
			if (fs.existsSync(path.join(this._directory, 'state.json')))
				throw new Error('Coordinator already initialized');
			const state = {
				format: 'design-coordinator/1',
				revision: 1,
				plan: structuredClone(plan),
				planDigest: this._digest(plan),
				bindings: bindings.map(({ref, digest}) => ({ref, digest})),
				attempts: {},
				accepted: {},
				gates: {},
				history: [],
			};
			this._write(state);
			return state;
		} finally {
			fs.closeSync(descriptor);
			fs.unlinkSync(lock);
		}
	}

	/** Call this method to reopen verified state without conversation history.
	 *
	 * @returns {DesignCoordinatorState} - Current durable snapshot.
	 */
	open() {
		return this._read();
	}

	/** Call this method to recompute readiness and show uncertain assignments.
	 *
	 * @returns {DesignCoordinatorInspection} - Current state and computed eligibility.
	 */
	inspect() {
		const state = this._read();
		const inspection = new DesignPlan(state.plan).inspect(state);
		return {
			...inspection,
			state,
			items: inspection.items.map((item) => {
				const attempt = state.attempts[item.id];
				return item.status === 'ready' && attempt && !['failed', 'stale'].includes(attempt.status)
					? {
							...item,
							status: 'blocked',
							blockers: [
								...item.blockers,
								{
									code: 'assignment-active',
									path: item.id,
									message: `Existing attempt is ${attempt.status}; reconcile or validate its result before replacement`,
								},
							],
						}
					: item;
			}),
			ready: inspection.ready.filter(
				(itemId) => !state.attempts[itemId] || ['failed', 'stale'].includes(state.attempts[itemId].status),
			),
			uncertain: Object.values(state.attempts)
				.filter((attempt) => attempt.status === 'uncertain')
				.map((attempt) => attempt.itemId),
		};
	}

	/** Call this method to save an exact assignment before dispatching its worker.
	 * Rejects stale revisions, unresolved prerequisites and conflicting claims.
	 *
	 * @param {DesignCoordinatorClaim} request - Item, assigned agent and observed revision.
	 * @returns {DesignCoordinatorState} - Committed dispatch intent and input identities.
	 */
	claim({itemId, agentId, expectedRevision}) {
		if (typeof agentId !== 'string' || !agentId) throw new Error('Agent identity is required');
		return this._mutate(expectedRevision, (state) => {
			if (!new DesignPlan(state.plan).inspect(state).ready.includes(itemId))
				throw new Error('Work item is not ready');
			if (state.attempts[itemId] && !['failed', 'stale'].includes(state.attempts[itemId].status))
				throw new Error('Work item already claimed');
			const item = state.plan.items.find((item) => item.id === itemId);
			if (item.reviewOf?.some((authorId) => state.accepted[authorId]?.agentId === agentId))
				throw new Error('Author cannot review their own work');
			const attempt = {
				id: crypto.randomUUID(),
				itemId,
				agentId,
				role: item.role,
				scopeRefs: [...item.scopeRefs],
				inputs: this._inputs(item, state),
				status: 'intent',
			};
			state.attempts[itemId] = attempt;
			state.history.push({event: 'claimed', attempt: structuredClone(attempt)});
		});
	}

	/** Call this method to record a nonsecret live-worker reference after launch.
	 *
	 * @param {DesignCoordinatorDispatch} request - Current intent and observed worker.
	 * @returns {DesignCoordinatorState} - Committed dispatch confirmation.
	 */
	dispatched({itemId, attemptId, workerRef, expectedRevision}) {
		if (typeof workerRef !== 'string' || !workerRef) throw new Error('Worker reference is required');
		return this._mutate(expectedRevision, (state) => {
			const attempt = this._attempt(state, itemId, attemptId);
			if (!['intent', 'uncertain', 'running'].includes(attempt.status))
				throw new Error('Attempt cannot be dispatched');
			attempt.workerRef = workerRef;
			attempt.status = 'running';
			state.history.push({event: 'dispatched', itemId, attemptId, workerRef});
		});
	}

	/** Call this method to save worker delivery independently from acceptance.
	 * Identical duplicate deliveries preserve the saved result. Incompatible
	 * receipts become repair evidence without replacing the original delivery.
	 *
	 * @param {DesignCoordinatorDelivery} request - Saved outputs and exact current attempt.
	 * @returns {DesignCoordinatorState} - Committed delivery or repair notice.
	 */
	deliver({itemId, attemptId, agentId, outputs, resultRef, expectedRevision}) {
		this._checkBindings(outputs);
		if (typeof resultRef !== 'string' || !resultRef) throw new Error('Saved result reference is required');
		return this._mutate(expectedRevision, (state) => {
			if (
				state.attempts[itemId]?.id !== attemptId ||
				['failed', 'stale'].includes(state.attempts[itemId]?.status)
			) {
				state.history.push({
					event: 'late-delivery',
					itemId,
					attemptId,
					agentId,
					resultRef,
					outputs: outputs.map(({ref, digest}) => ({ref, digest})),
					rejected: true,
				});
				return;
			}
			const attempt = this._attempt(state, itemId, attemptId);
			if (attempt.agentId !== agentId) throw new Error('Delivery agent does not own attempt');
			const item = state.plan.items.find((item) => item.id === itemId);
			if (outputs.some((output) => !item.owns.includes(output.ref)))
				throw new Error('Delivery includes unowned outputs');
			const delivery = {outputs: outputs.map(({ref, digest}) => ({ref, digest})), resultRef};
			if (attempt.delivery) {
				if (this._digest(attempt.delivery) !== this._digest(delivery))
					state.history.push({event: 'incompatible-delivery', itemId, attemptId, delivery});
				return;
			}
			attempt.delivery = structuredClone(delivery);
			attempt.status = 'delivered';
			state.history.push({event: 'delivered', itemId, attemptId, delivery: structuredClone(delivery)});
		});
	}

	/** Call this method to accept a delivered contribution through parent validation.
	 * The validator owns existing artifact/review receipt checks. Its failure leaves
	 * delivery intact. Validation runs outside the lock; a revision check prevents
	 * accepting against state that changed while validation was in progress.
	 *
	 * @param {DesignCoordinatorAcceptance} request - Current delivery and observed revision.
	 * @param {DesignCoordinatorValidator} validateReceipt - Existing-writer validation capability.
	 * @returns {Promise<DesignCoordinatorState>} - Accepted contribution and optional exact review gate.
	 */
	async accept({itemId, attemptId, expectedRevision}, validateReceipt) {
		const before = this._read();
		if (before.revision !== expectedRevision) throw new Error('Stale coordinator revision');
		const attempt = this._attempt(before, itemId, attemptId);
		if (attempt.status === 'accepted') return before;
		if (attempt.status !== 'delivered') throw new Error('Attempt has no delivered result');
		const item = before.plan.items.find((item) => item.id === itemId);
		if (item.owns.some((ref) => !attempt.delivery.outputs.some((output) => output.ref === ref)))
			throw new Error('Partial delivery cannot be accepted');
		if (!new DesignPlan(before.plan).inspect(before).ready.includes(itemId))
			throw new Error('Inputs or required gates are stale');
		if (typeof validateReceipt !== 'function') throw new Error('Parent artifact validator is required');
		const validated = await validateReceipt({
			item: structuredClone(item),
			attempt: structuredClone(attempt),
			state: structuredClone(before),
		});
		if (!validated || this._digest(validated.outputs) !== this._digest(attempt.delivery.outputs))
			throw new Error('Parent validation did not verify exact outputs');
		if (before.plan.gates.some((gate) => gate.reviewerItemId === itemId && !validated.gates?.[gate.id]))
			throw new Error('Parent validation omitted required owned review gate');
		return this._mutate(expectedRevision, (state) => {
			const current = this._attempt(state, itemId, attemptId);
			state.accepted[itemId] = {
				agentId: current.agentId,
				outputs: structuredClone(current.delivery.outputs),
				inputs: structuredClone(current.inputs),
			};
			current.status = 'accepted';
			if (validated.gates) {
				for (const [gateId, receipt] of Object.entries(validated.gates)) {
					const gate = state.plan.gates.find((gate) => gate.id === gateId && gate.reviewerItemId === itemId);
					if (!gate || receipt.reviewerAgentId !== current.agentId)
						throw new Error('Validator returned unrelated review gate');
					this._checkBindings(receipt.subjectBindings);
					if (
						typeof receipt.receiptRef !== 'string' ||
						!receipt.receiptRef ||
						!/^[a-f0-9]{64}$/.test(receipt.subjectDigest) ||
						!/^[a-f0-9]{64}$/.test(receipt.receiptDigest) ||
						this._digest(receipt.subjectBindings) !== this._digest(this._inputs(gate, state))
					)
						throw new Error('Validator returned stale or malformed exact review gate');
					state.gates[gateId] = {
						receiptRef: receipt.receiptRef,
						reviewerAgentId: receipt.reviewerAgentId,
						subjectBindings: receipt.subjectBindings.map(({ref, digest}) => ({ref, digest})),
						subjectDigest: receipt.subjectDigest,
						receiptDigest: receipt.receiptDigest,
					};
				}
			}
			state.history.push({event: 'accepted', itemId, attemptId, resultRef: current.delivery.resultRef});
		});
	}

	/** Call this method to reconcile active attempts with available live observations.
	 * Missing observations stay uncertain. Only a positively observed failed worker
	 * releases its item for replacement; saved delivery and accepted work survive.
	 *
	 * @param {DesignCoordinatorReconciliation} request - Current observations and revision.
	 * @returns {DesignCoordinatorState} - Reconciled durable assignments.
	 */
	reconcile({observations, expectedRevision}) {
		if (
			!Array.isArray(observations) ||
			observations.some(
				(observation) =>
					!observation.attemptId ||
					!observation.agentId ||
					!['live', 'failed', 'unknown'].includes(observation.status),
			)
		)
			throw new Error('Invalid worker observations');
		return this._mutate(expectedRevision, (state) => {
			for (const attempt of Object.values(state.attempts)) {
				if (!['intent', 'running', 'uncertain'].includes(attempt.status)) continue;
				const observation = observations.find(
					(observation) => observation.attemptId === attempt.id && observation.agentId === attempt.agentId,
				);
				attempt.status =
					observation?.status === 'live'
						? 'running'
						: observation?.status === 'failed'
							? 'failed'
							: 'uncertain';
				if (observation?.workerRef) attempt.workerRef = observation.workerRef;
				state.history.push({
					event: 'reconciled',
					itemId: attempt.itemId,
					attemptId: attempt.id,
					status: attempt.status,
				});
			}
		});
	}

	/** Call this method to preserve explicit failure evidence before replacement.
	 *
	 * @param {DesignCoordinatorFailure} request - Exact failed attempt and observed reason.
	 * @returns {DesignCoordinatorState} - Failed attempt retaining any saved delivery.
	 */
	fail({itemId, attemptId, reason, expectedRevision}) {
		if (typeof reason !== 'string' || !reason) throw new Error('Failure reason is required');
		return this._mutate(expectedRevision, (state) => {
			const attempt = this._attempt(state, itemId, attemptId);
			if (attempt.status === 'accepted') throw new Error('Accepted contribution cannot fail');
			attempt.status = 'failed';
			state.history.push({event: 'failed', itemId, attemptId, reason, attempt: structuredClone(attempt)});
		});
	}

	/** Call this method to invalidate changed input/output scopes and their consumers.
	 * Saved plan source identities remain unchanged until source interpretation and
	 * plan revision are supplied; a new hash alone cannot repair human-source changes.
	 *
	 * @param {DesignCoordinatorInvalidation} request - Current observed bindings and changed refs.
	 * @returns {DesignCoordinatorState} - Unaffected accepted work and preserved stale history.
	 */
	invalidate({bindings, changedRefs = [], expectedRevision}) {
		this._checkBindings(bindings);
		if (!Array.isArray(changedRefs) || changedRefs.some((ref) => typeof ref !== 'string' || !ref))
			throw new Error('Invalid changed references');
		return this._mutate(expectedRevision, (state) => {
			const changed = new Set(changedRefs);
			for (const binding of state.bindings)
				if (!bindings.some((current) => current.ref === binding.ref && current.digest === binding.digest))
					changed.add(binding.ref);
			const changedAuthority = state.plan.sources.some((source) => changed.has(source.ref));
			const seeds = state.plan.items
				.filter(
					(item) =>
						changedAuthority ||
						item.owns.some((ref) => changed.has(ref)) ||
						item.inputs.some((input) => changed.has(input.ref ?? input.output)),
				)
				.map((item) => item.id);
			const affected = this._invalidate(state, seeds);
			state.bindings = bindings.map(({ref, digest}) => ({ref, digest}));
			state.history.push({event: 'inputs-changed', changedRefs: [...changed], affected});
		});
	}

	/** Call this method to install a validated revised plan while retaining safe work.
	 * Changes in ownership, inputs, review scope or prerequisites invalidate their
	 * consumers; invalid/cyclic revisions leave the previous state untouched.
	 *
	 * @param {DesignCoordinatorRevisionRequest} request - Revised decomposition and observed inputs.
	 * @returns {DesignCoordinatorState} - Saved revision with current reusable contributions.
	 */
	revise({plan, bindings, expectedRevision}) {
		if (!new DesignPlan(plan).validate().valid) throw new Error('Invalid revised design plan');
		this._checkBindings(bindings);
		return this._mutate(expectedRevision, (state) => {
			if (plan.id !== state.plan.id || plan.revision <= state.plan.revision)
				throw new Error('Plan revision must advance the same plan');
			const changedAuthority =
				this._digest([...state.plan.sources].sort((left, right) => left.ref.localeCompare(right.ref))) !==
				this._digest([...plan.sources].sort((left, right) => left.ref.localeCompare(right.ref)));
			const seeds = state.plan.items
				.filter((item) => {
					const replacement = plan.items.find((replacement) => replacement.id === item.id);
					return (
						changedAuthority ||
						!replacement ||
						this._digest(item) !== this._digest(replacement) ||
						item.inputs.some(
							(input) =>
								input.ref &&
								!bindings.some(
									(binding) => binding.ref === input.ref && binding.digest === input.digest,
								),
						)
					);
				})
				.map((item) => item.id);
			for (const gate of state.plan.gates)
				if (this._digest(gate) !== this._digest(plan.gates.find((replacement) => replacement.id === gate.id)))
					seeds.push(gate.reviewerItemId);
			this._invalidate(state, seeds);
			for (const itemId of Object.keys(state.attempts))
				if (!plan.items.some((item) => item.id === itemId)) delete state.attempts[itemId];
			state.history.push({event: 'plan-revised', previousPlan: state.plan, nextPlanRevision: plan.revision});
			state.plan = structuredClone(plan);
			state.planDigest = this._digest(plan);
			state.bindings = bindings.map(({ref, digest}) => ({ref, digest}));
		});
	}

	/** Call this method to persist canonical-write intent without performing that write.
	 * Existing writers retain authority and compare-and-swap boundaries.
	 *
	 * @param {DesignCoordinatorPromotionIntent} request - Exact target and accepted source contributions.
	 * @returns {DesignCoordinatorState} - Durable pending promotion.
	 */
	promotionIntent({promotionId, targetRef, expectedDigest, nextDigest, itemIds, expectedRevision}) {
		this._checkBindings([
			{ref: targetRef, digest: expectedDigest},
			{ref: `${targetRef}:next`, digest: nextDigest},
		]);
		if (typeof promotionId !== 'string' || !promotionId || !Array.isArray(itemIds) || !itemIds.length)
			throw new Error('Invalid promotion intent');
		return this._mutate(expectedRevision, (state) => {
			const inspection = new DesignPlan(state.plan).inspect(state);
			if (
				itemIds.some(
					(itemId) => !inspection.items.some((item) => item.id === itemId && item.status === 'accepted'),
				)
			)
				throw new Error('Promotion requires current accepted contributions');
			state.promotions ??= {};
			if (state.promotions[promotionId]) throw new Error('Promotion identity already exists');
			if (
				Object.values(state.promotions).some(
					(promotion) =>
						promotion.targetRef === targetRef && !['committed', 'retired'].includes(promotion.status),
				)
			)
				throw new Error('Canonical target already has a pending promotion');
			state.promotions[promotionId] = {
				targetRef,
				expectedDigest,
				nextDigest,
				itemIds: [...itemIds],
				contributions: itemIds.map((itemId) => ({
					itemId,
					attemptId: state.attempts[itemId].id,
					...structuredClone(state.accepted[itemId]),
				})),
				status: 'intent',
			};
			state.history.push({event: 'promotion-intent', promotionId, targetRef, expectedDigest, nextDigest});
		});
	}

	/** Call this method to inspect an uncertain canonical write before retrying it.
	 * Matching next bytes establish completion. Unchanged bytes permit a guarded
	 * existing-writer retry only while source contributions remain current.
	 *
	 * @param {DesignCoordinatorPromotionObservation} request - Exact currently observed target digest.
	 * @returns {DesignCoordinatorState} - Committed, retryable or uncertain promotion evidence.
	 */
	reconcilePromotion({promotionId, observedDigest, expectedRevision}) {
		if (!/^[a-f0-9]{64}$/.test(observedDigest)) throw new Error('Invalid observed canonical digest');
		return this._mutate(expectedRevision, (state) => {
			const promotion = state.promotions?.[promotionId];
			if (!promotion) throw new Error('Unknown promotion intent');
			if (promotion.status === 'retired') throw new Error('Retired promotion cannot be reconciled as active');
			const inspection = new DesignPlan(state.plan).inspect(state);
			const current = promotion.contributions.every((contribution) => {
				const itemId = contribution.itemId;
				return (
					inspection.items.some((item) => item.id === itemId && item.status === 'accepted') &&
					this._digest(contribution) ===
						this._digest({itemId, attemptId: state.attempts[itemId]?.id, ...state.accepted[itemId]})
				);
			});
			promotion.status =
				observedDigest === promotion.nextDigest
					? 'committed'
					: observedDigest === promotion.expectedDigest && current
						? 'retryable'
						: 'uncertain';
			state.history.push({event: 'promotion-observed', promotionId, observedDigest, status: promotion.status});
		});
	}

	/** Call this method to retire an obsolete intent only after positive writer reconciliation.
	 * The parent callback must confirm exact current target bytes and that the old
	 * writer stopped or is absent. Unknown liveness retains the target block; source
	 * changes and elapsed time alone never retire a potentially active operation.
	 *
	 * @param {DesignCoordinatorPromotionObservation} request - Exact observed intent and target bytes.
	 * @param {DesignCoordinatorPromotionVerifier} confirmWriter - Parent writer-observation capability.
	 * @returns {Promise<DesignCoordinatorState>} - Preserved retired intent and nonsecret recovery receipt.
	 */
	async retirePromotion({promotionId, observedDigest, expectedRevision}, confirmWriter) {
		const before = this._read();
		if (before.revision !== expectedRevision) throw new Error('Stale coordinator revision');
		const promotion = before.promotions?.[promotionId];
		if (!promotion) throw new Error('Unknown promotion intent');
		if (promotion.status === 'retired') return before;
		if (typeof confirmWriter !== 'function' || !/^[a-f0-9]{64}$/.test(observedDigest))
			throw new Error('Exact parent writer observation is required');
		const receipt = await confirmWriter({promotionId, promotion: structuredClone(promotion), observedDigest});
		if (
			!receipt ||
			!['stopped', 'absent'].includes(receipt.writerStatus) ||
			receipt.observedDigest !== observedDigest ||
			typeof receipt.receiptRef !== 'string' ||
			!receipt.receiptRef
		)
			throw new Error('Old canonical writer remains unconfirmed');
		return this._mutate(expectedRevision, (state) => {
			state.promotions[promotionId].status = 'retired';
			state.promotions[promotionId].retirement = {
				receiptRef: receipt.receiptRef,
				observedDigest,
				writerStatus: receipt.writerStatus,
			};
			state.history.push({
				event: 'promotion-retired',
				promotionId,
				receiptRef: receipt.receiptRef,
				observedDigest,
				writerStatus: receipt.writerStatus,
			});
		});
	}

	/** Call this method to inspect a surviving exclusive lock without stealing it.
	 *
	 * @returns {DesignCoordinatorLock | null} - Observed owner identity or absent lock.
	 */
	lockInfo() {
		const target = path.join(this._directory, 'writer.lock');
		this._checkPath(target);
		if (!fs.existsSync(target)) return null;
		const lock = JSON.parse(fs.readFileSync(target, 'utf8'));
		if (!Number.isSafeInteger(lock.pid) || lock.pid < 1 || typeof lock.token !== 'string' || !lock.token)
			throw new Error('Malformed writer lock requires operator inspection');
		return lock;
	}

	/** Call this method to remove only an exact observed lock with a provably dead owner.
	 * A living or permission-inaccessible process retains the lock. No age timeout
	 * or caller-provided failure assertion establishes ownership loss.
	 *
	 * @param {string} token - Exact previously observed lock identity.
	 * @returns {void} - Dead-owner lock removed without changing plan state.
	 */
	recoverLock(token) {
		const lock = this.lockInfo();
		if (!lock || lock.token !== token) throw new Error('Writer lock changed');
		try {
			process.kill(lock.pid, 0);
			throw new Error('Writer owner is still alive');
		} catch (error) {
			if (error.code !== 'ESRCH') throw error;
		}
		if (this.lockInfo()?.token !== token) throw new Error('Writer lock changed');
		const target = path.resolve(this._directory, 'writer.lock');
		if (path.dirname(target) !== this._directory) throw new Error('Writer lock escapes planning directory');
		fs.unlinkSync(target);
	}
}
