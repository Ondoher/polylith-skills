import {isDeepStrictEqual} from 'node:util';

/** Parent adapter between durable claims and process-local workflow assignments.
 * @implements {DesignWorkflowAdapter}
 */
export class DesignWorkflow {
	/** Creates an adapter without dispatching or persisting any capabilities.
	 * @param {DesignWorkflowOptions} options - Parent service, coordinator and exact input observer.
	 */
	constructor({service, coordinator, run, resolveInputs}) {
		if (typeof resolveInputs !== 'function') throw new Error('A synchronous parent input observer is required');
		this._service = service;
		this._coordinator = coordinator;
		this._run = run;
		this._resolveInputs = resolveInputs;
		this._assignments = new Map();
	}

	/** Call this method to guard a synchronous existing-store action on the retained file route.
	 * @param {DesignCoordinatorClaimGuard} request - Exact saved assignment.
	 * @param {DesignCoordinatorClaimAction} action - Parent-owned synchronous store action.
	 * @returns {unknown} - Existing store receipt.
	 */
	withClaim(request, action) {
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
		this._assignments.delete(access);
	}
}
