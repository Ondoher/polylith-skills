import fs from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {InputContract} from './InputContract.mjs';

/** Immutable review fragments; canonical review validation still owns the final gate. */
export class UxReviewParts {
	/** Creates a fragment assembler from the maintained canonical receipt schema. */
	constructor() {
		this._schema = JSON.parse(
			fs.readFileSync(
				new URL('../../skills/refine-design/references/ux-review-schema-0.2.json', import.meta.url),
				'utf8',
			),
		);
		this._fields = ['coverage', 'findings', 'researchChecks', 'limits'];
	}

	/** Called by fragment ingress to resolve the schema's local references.
	 *
	 * @param {WorkflowSchema} rule - Canonical schema node.
	 * @returns {WorkflowSchema} - Closed shape understood by the tool validator.
	 */
	_resolve(rule) {
		if (rule.$ref) return this._resolve(this._schema.$defs[rule.$ref.split('/').at(-1)]);
		return {
			...rule,
			...(rule.enum ? {type: 'string'} : {}),
			...(rule.properties
				? {
						properties: Object.fromEntries(
							Object.entries(rule.properties).map(([key, value]) => [key, this._resolve(value)]),
						),
					}
				: {}),
			...(rule.items ? {items: this._resolve(rule.items)} : {}),
		};
	}

	/** Call this method to bind a small completed batch to the assigned review subject.
	 * Missing sections default to empty arrays; no verdict or approval is inferred.
	 * Invalid shapes reject this batch without affecting already saved fragments.
	 *
	 * @param {WorkflowUxReviewSubject} subject - Parent-computed exact input binding.
	 * @param {WorkflowUxReviewFragment} fragment - Completed semantic rows and limits.
	 * @returns {WorkflowUxReviewPart} - Immutable fragment saved by the service.
	 */
	contribute(subject, fragment) {
		const validator = new InputContract();
		validator.validate(subject, this._resolve(this._schema.properties.subject), 'subject');
		validator.validate(fragment, {
			type: 'object',
			additionalProperties: false,
			properties: Object.fromEntries(
				this._fields.map((field) => [field, this._resolve(this._schema.properties[field])]),
			),
		});
		return {
			kind: 'ux-review-part',
			subject: structuredClone(subject),
			...Object.fromEntries(this._fields.map((field) => [field, structuredClone(fragment[field] ?? [])])),
		};
	}

	/** Call this method to assemble saved parts without reproducing their authored content.
	 * Identical repeated rows are reused; conflicting identities or subjects reject
	 * assembly. Replace only the affected fragment handle and retry. The caller must
	 * validate the receipt against current authoritative files before using it.
	 *
	 * @param {WorkflowUxReviewAssembly} input - Bound parts and the reviewer's conclusion.
	 * @returns {WorkflowJson} - Existing schema 0.2 receipt, never a generated verdict.
	 */
	assemble({subject, parts, verdict, summary}) {
		if (!Array.isArray(parts) || !parts.length) throw new Error('Review parts are required');
		const catalogs = Object.fromEntries(this._fields.map((field) => [field, new Map()]));
		for (const part of parts) {
			if (part.kind !== 'ux-review-part' || !isDeepStrictEqual(subject, part.subject))
				throw new Error('Review part belongs to another subject');
			const {kind: _kind, subject: _subject, ...fragment} = part;
			this.contribute(subject, fragment);
			for (const field of this._fields) {
				for (const row of fragment[field] ?? []) {
					const identity = field === 'limits' ? row : (row.criterion ?? row.id ?? row.researchRef);
					const previous = catalogs[field].get(identity);
					if (previous !== undefined && !isDeepStrictEqual(previous, row))
						throw new Error(`Conflicting review ${field}: ${identity}; replace the affected part handle`);
					catalogs[field].set(identity, row);
				}
			}
		}
		return {
			schemaVersion: '0.2',
			subject: structuredClone(subject),
			verdict,
			summary,
			...Object.fromEntries(this._fields.map((field) => [field, [...catalogs[field].values()]])),
		};
	}
}
