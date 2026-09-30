import assert from 'node:assert/strict';

/** Arithmetic shared by numeric axes, intervals and markers, without domain-specific rules. */
export const NumericScale = {
	/**
	 * Call this method to map a supplied numeric value to a viewport coordinate.
	 * @param {NumericDomain} domain - Source domain, in the caller's units.
	 * @param {number} value - Position inside the domain, including either endpoint.
	 * @param {number} extent - Available viewport extent, in pixels or percent.
	 * @returns {number} Coordinate relative to the viewport origin.
	 */
	position(domain, value, extent = 100) {
		assert(
			domain && Number.isFinite(domain.min) && Number.isFinite(domain.max) && domain.max > domain.min,
			'Scale domain needs finite min < max',
		);
		assert(Number.isFinite(extent) && extent > 0, 'Scale extent must be positive');
		assert(Number.isFinite(value) && value >= domain.min && value <= domain.max, 'Scale value outside domain');
		return ((value - domain.min) / (domain.max - domain.min)) * extent;
	},
	/**
	 * Call this method to position a point or interval using the same transform.
	 * @param {NumericDomain} domain - Source domain.
	 * @param {NumericPosition} position - Supplied boundaries; units and endpoint semantics remain caller-owned.
	 * @param {number} extent - Available viewport extent.
	 * @returns {NumericPlacement} Origin and width in the supplied extent's units.
	 */
	place(domain, position, extent = 100) {
		assert(
			position && Object.keys(position).every((key) => ['start', 'end'].includes(key)),
			'Scale position only accepts start and end',
		);
		assert(position.end === undefined || Number.isFinite(position.end), 'Scale end must be finite');
		const start = this.position(domain, position.start, extent);
		const end = this.position(domain, position.end ?? position.start, extent);
		assert(end >= start, 'Scale interval end precedes start');
		return {start, width: end - start};
	},
};
