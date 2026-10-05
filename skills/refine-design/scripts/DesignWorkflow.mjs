import {isDeepStrictEqual} from 'node:util';
import {DesignPlan} from './DesignPlan.mjs';

/** Parent adapter between durable claims and process-local workflow assignments.
 * @implements {DesignWorkflowAdapter}
 */
export class DesignWorkflow {
	/** Creates an adapter without dispatching or persisting any capabilities.
	 * @param {DesignWorkflowOptions} options - Parent service, coordinator and exact input observer.
	 */
	constructor({service, coordinator, run, resolveInputs, preparation, preparationScope = run}) {
		if (typeof resolveInputs !== 'function') throw new Error('A synchronous parent input observer is required');
		this._service = service;
		this._coordinator = coordinator;
		this._run = run;
		this._resolveInputs = resolveInputs;
		this._assignments = new Map();
		this._revokedAssignments = new Set();
		this._preparation = preparation;
		this._preparationScope = preparationScope;
		if (
			preparation &&
			(typeof preparationScope !== 'string' ||
				!preparationScope.trim() ||
				(run !== undefined && preparationScope !== run))
		)
			throw new Error('Preparation requires the current product/run scope; a service run cannot be overridden');
	}

	/** Called by prepared routes to bind the ledger to the actual current parent product/run.
	 * @returns {DesignPreparationState} - Scope-verified persisted ledger.
	 */
	_preparationState() {
		if (!this._preparation) throw new Error('Preparation ledger is required');
		const state = this._preparation.open();
		if (state.scope !== this._preparationScope)
			throw new Error('Preparation scope does not match current product/run');
		return state;
	}

	/** Called by native assignment routes to resolve exact tracked actor authority.
	 * @param {DesignCoordinatorClaimGuard} claim - Current native work identity.
	 * @returns {DesignPreparationAuthor} - Exact managed author requiring the ledger guard.
	 */
	_preparedAuthor(claim) {
		const author = this._preparationState().authors.find((entry) => entry.agentId === claim.agentId);
		if (!author) throw new Error('Native author must be tracked in the preparation ledger');
		return author;
	}

	/** Call this method to guard a synchronous existing-store action on the retained file route.
	 * @param {DesignCoordinatorClaimGuard} request - Exact saved assignment.
	 * @param {DesignCoordinatorClaimAction} action - Parent-owned synchronous store action.
	 * @returns {unknown} - Existing store receipt.
	 */
	withClaim(request, action) {
		if (this._preparation) {
			const item = this._coordinator.open().plan.items.find((entry) => entry.id === request.itemId);
			if (item && ['ux', 'ui'].includes(item.stage)) {
				const author = this._preparedAuthor(request);
				return this._preparation.withAssignment({authorId: author.id, claim: request}, () =>
					this._withClaim(request, action),
				);
			}
		}
		return this._withClaim(request, action);
	}

	/** Called by guarded routes to validate complete final native inputs under the coordinator lock.
	 * @param {DesignCoordinatorClaimGuard} request - Exact current native or review claim.
	 * @param {DesignCoordinatorClaimAction} action - Synchronous existing-store operation.
	 * @returns {unknown} - Existing guarded operation receipt.
	 */
	_withClaim(request, action) {
		if (typeof action !== 'function' || action.constructor.name === 'AsyncFunction')
			throw new Error('A synchronous claim action is required');
		return this._coordinator.withClaim(request, (context) => {
			const observed = this._resolveInputs(structuredClone(context));
			if (!isDeepStrictEqual(observed, context.attempt.inputs))
				throw new Error('Observed assignment inputs changed');
			return action(context);
		});
	}

	/** Call this method after saving dispatch intent, before sending the scoped token to its worker.
	 * @param {DesignWorkflowAssignment} request - Exact claim, input grants and optional review subject.
	 * @returns {WorkflowAssignmentReceipt} - Volatile token; never write it into plan state.
	 */
	assign(request) {
		const {
			itemId,
			attemptId,
			agentId,
			handles = [],
			readPaths = [],
			outputDirectory = null,
			reviewSubject,
			wireframeElementIds,
		} = request;
		const claim = {itemId, attemptId, agentId};
		const item = /** @type {DesignPlanItem} */ (this.withClaim(claim, ({item}) => structuredClone(item)));
		let operations, scope;
		if (['ux', 'ui'].includes(item.stage)) {
			const kinds = item.stage === 'ux' ? ['context', 'element', 'flow'] : ['context', 'part', 'scene'];
			const recordRefs = item.owns.map((ref) => {
				const [stage, kind, ...id] = ref.split(':');
				if (
					stage !== item.stage ||
					!kinds.includes(kind) ||
					id.length !== 1 ||
					!/^[a-z0-9][a-z0-9._-]{0,159}$/.test(id[0])
				)
					throw new Error('Assignment requires stage-qualified native unit ownership');
				return `${kind}:${id[0]}`;
			});
			operations = ['units.read', 'units.deliver'];
			if (item.stage === 'ux') operations.push('units.status', 'units.contribute', 'units.finish');
			scope = {stage: item.stage, recordRefs};
			if (wireframeElementIds !== undefined) {
				if (
					item.stage !== 'ui' ||
					!Array.isArray(wireframeElementIds) ||
					!wireframeElementIds.length ||
					wireframeElementIds.some((id) => typeof id !== 'string' || !id)
				)
					throw new Error('Exact UI wireframe element assignments are required');
				scope.wireframeElementIds = [...wireframeElementIds];
			}
		} else if (item.stage === 'review' && item.role === 'ux-reviewer') {
			if (!reviewSubject || typeof reviewSubject !== 'object' || Array.isArray(reviewSubject))
				throw new Error('The existing exact UX review subject is required');
			operations = ['ux-review.contribute', 'ux-review.assemble'];
			scope = {reviewSubject: structuredClone(reviewSubject)};
		} else if (item.stage === 'review' && item.role === 'ui-design-reviewer') {
			operations = [];
			scope = {};
		} else throw new Error('Source interpretation, research, planning and assembly remain parent-owned');
		const receipt = this._service.assign({
			access: this._service.ownerAccess,
			run: this._run,
			operations: [...operations, 'files.read', 'result.store'],
			handles,
			readPaths,
			outputDirectory,
			scope: {...scope, assignmentGuardRequired: true, itemId, attemptId, agentId},
		});
		try {
			this._service.bindAssignmentGuard({
				access: this._service.ownerAccess,
				run: this._run,
				assignmentAccess: receipt.access,
				guard: (action) => this.withClaim(claim, action),
			});
			this._assignments.set(receipt.access, claim);
			return receipt;
		} catch (error) {
			this._service.revokeAssignment({
				access: this._service.ownerAccess,
				run: this._run,
				assignmentAccess: receipt.access,
			});
			throw error;
		}
	}

	/** Call this method to save pool intent before claiming ready author work.
	 * A crash leaves an inspectable unresolved intent; bindClaim reconciles the same
	 * saved coordinator claim rather than repeating dispatch. Final complete inputs
	 * are validated through the ordinary claim guard before any author grant.
	 * @param {DesignWorkflowPreparedClaim} request - Current preparation and coordinator observations.
	 * @returns {DesignCoordinatorClaimGuard} - Exact saved author claim.
	 */
	claimPrepared({authorId, itemId, bindings, observation, preparationRevision, coordinatorRevision}) {
		const preparationState = this._preparationState();
		const state = this._coordinator.open();
		const item = state.plan.items.find((entry) => entry.id === itemId);
		const author = preparationState.authors.find((entry) => entry.id === authorId);
		if (!item || !['ux', 'ui'].includes(item.stage) || !author)
			throw new Error('Prepared native author and current work item are required');
		if (state.revision !== coordinatorRevision) throw new Error('Stale coordinator revision');
		if (
			!new DesignPlan(state.plan).inspect(state).ready.includes(itemId) ||
			(state.attempts[itemId] && !['failed', 'stale'].includes(state.attempts[itemId].status))
		)
			throw new Error('Native work is not ready for a new prepared claim');
		this._preparation.beginAssignment({
			authorId,
			itemId,
			role: item.role,
			packetDigest: author.packetDigest,
			bindings,
			observation,
			priorAttemptId: state.attempts[itemId]?.id ?? null,
			expectedRevision: preparationRevision,
		});
		const claimed = this._coordinator.claim({
			itemId,
			agentId: author.agentId,
			expectedRevision: coordinatorRevision,
		});
		this._preparation.bindClaim({
			authorId,
			coordinatorState: claimed,
			expectedRevision: this._preparation.open().revision,
		});
		const claim = {itemId, attemptId: claimed.attempts[itemId].id, agentId: author.agentId};
		this._withClaim(claim, () => undefined);
		return claim;
	}

	/** Call this method to grant the normal scoped assignment to an exact prepared author.
	 * Preparation itself cannot issue permissions. A grant crash remains conservative
	 * until capability revocation is positively established by the parent adapter.
	 * @param {DesignWorkflowPreparedAssignment} request - Bound author, final complete native inputs and CAS revision.
	 * @returns {WorkflowAssignmentReceipt} - Existing guarded volatile capability.
	 */
	assignPrepared({authorId, preparationRevision, ...request}) {
		this._preparationState();
		this._withClaim(request, () => undefined);
		this._preparation.authority({
			authorId,
			claim: request,
			status: 'issued',
			expectedRevision: preparationRevision,
		});
		try {
			return this.assign({...request, preparedAuthorId: authorId});
		} catch (error) {
			this._preparation.authority({
				authorId,
				claim: request,
				status: 'revoked',
				expectedRevision: this._preparation.open().revision,
			});
			throw error;
		}
	}

	/** Call this method to authorize the existing parent-owned retained-file delivery route.
	 * No service token is minted; every native write still needs withPreparedClaim.
	 * @param {DesignWorkflowPreparedAssignment} request - Exact linked claim and ledger CAS revision.
	 * @returns {DesignPreparationState} - Nonsecret saved file-route authority.
	 */
	authorizePreparedFile({authorId, preparationRevision, ...claim}) {
		this._preparationState();
		this._withClaim(claim, () => undefined);
		return this._preparation.authority({
			authorId,
			claim,
			status: 'issued',
			channel: 'file',
			expectedRevision: preparationRevision,
		});
	}

	/** Call this method to mutate retained native files under both exact current guards.
	 * @param {DesignWorkflowPreparedGuard} request - Exact managed author and native claim.
	 * @param {DesignCoordinatorClaimAction} action - Synchronous parent-owned native operation.
	 * @returns {unknown} - Existing native operation receipt.
	 */
	withPreparedClaim({authorId, ...claim}, action) {
		this._preparationState();
		return this._preparation.withAssignment({authorId, claim}, () => this._withClaim(claim, action));
	}

	/** Call this method to revoke every known prior grant before positively stopped reuse.
	 * An issued grant missing from this adapter remains unresolved after restart;
	 * do not infer revocation from delivery, interruption or a lost token.
	 * @param {DesignWorkflowPreparedRelease} request - Exact author, stopped observation and CAS revision.
	 * @returns {DesignPreparationState} - Reusable author with actual provenance retained.
	 */
	releasePrepared({authorId, observation, preparationRevision}) {
		const state = this._preparationState();
		if (state.revision !== preparationRevision) throw new Error('Stale preparation revision');
		const author = state.authors.find((entry) => entry.id === authorId),
			assignment = author?.assignment;
		if (!assignment) throw new Error('Prepared assignment is required');
		const claim = {itemId: assignment.itemId, attemptId: assignment.attemptId, agentId: author.agentId};
		const grants = [...this._assignments.entries()].filter(([_access, saved]) => isDeepStrictEqual(saved, claim));
		if (
			assignment.authority === 'issued' &&
			assignment.channel === 'service' &&
			!grants.length &&
			!this._revokedAssignments.has(JSON.stringify(claim))
		)
			throw new Error('Previous grant revocation is unconfirmed');
		for (const [access] of grants) this.revoke({access});
		let revision = preparationRevision;
		if (assignment.authority === 'issued')
			revision = this._preparation.authority({
				authorId,
				claim,
				status: 'revoked',
				expectedRevision: revision,
			}).revision;
		return this._preparation.release({
			authorId,
			coordinatorState: this._coordinator.open(),
			observation,
			expectedRevision: revision,
		});
	}

	/** Call this method after restart with a positive observation of the same surviving attempt.
	 * Unknown observations remain frozen; this method never claims or redispatches.
	 * @param {DesignWorkflowRefresh} request - Saved claim and current live observation.
	 * @returns {WorkflowAssignmentReceipt} - Newly minted, guarded volatile capability.
	 */
	refresh({observation, ...request}) {
		if (
			observation?.status !== 'live' ||
			observation.attemptId !== request.attemptId ||
			observation.agentId !== request.agentId
		)
			throw new Error('Exact live worker observation is required');
		const state = this._coordinator.open();
		if (state.attempts[request.itemId]?.status !== 'running')
			throw new Error('Reconcile the current live attempt before renewing its capability');
		return this.assign(request);
	}

	/** Call this method before ending or replacing a worker assignment.
	 * @param {DesignWorkflowRevocation} request - Volatile token held by the parent.
	 * @returns {void}
	 */
	revoke({access}) {
		if (!this._assignments.has(access)) throw new Error('Assignment is not owned by this adapter');
		this._service.revokeAssignment({access: this._service.ownerAccess, run: this._run, assignmentAccess: access});
		this._revokedAssignments.add(JSON.stringify(this._assignments.get(access)));
		this._assignments.delete(access);
	}
}
