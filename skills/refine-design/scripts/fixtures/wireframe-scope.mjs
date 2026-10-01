/** Call this helper to supply a neutral changed-requirement fixture.
 * @param {string} elementId - Intended interface owner.
 * @param {string} affectedRef - Existing typed UX reference.
 * @returns {WireframeScopeBasis} - Exact old/new facts and an explicit impact.
 */
export function scopeBasisFixture(elementId, affectedRef) {
	return {
		previousSources: [{id: 'requirements', revision: 'before', records: {save: 'Save the item immediately'}}],
		currentSources: [{id: 'requirements', revision: 'after', records: {save: 'Confirm the item before saving'}}],
		impacts: [{id: 'confirm-save', elementId, kind: 'requirement-change', status: 'ready', reason: 'Expose confirmation before committing the item.', affectedRefs: [affectedRef], dependencies: [{sourceId: 'requirements', recordRefs: ['save']}]}],
	};
}
