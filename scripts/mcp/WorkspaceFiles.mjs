import fs from 'node:fs';
import path from 'node:path';
import {randomUUID, createHash} from 'node:crypto';
import {MAX_RESULT_BYTES} from './consts.mjs';

/** Files confined to one physical workspace, shared by workflow operations. */
export class WorkspaceFiles {
	/** Creates a workspace boundary from an existing directory.
	 * @param {string} directory - Explicit workspace root.
	 */
	constructor(directory) {
		this.root = fs.realpathSync(directory);
		if (!fs.statSync(this.root).isDirectory()) throw new Error('Workspace must be a directory');
	}

	/** Call this method to resolve a workspace path without traversing symbolic links.
	 * @param {string} location - Relative or absolute workspace path.
	 * @returns {string} - Confined absolute path, possibly not yet created.
	 */
	resolve(location) {
		if (typeof location !== 'string' || !location || location.includes('\0'))
			throw new Error('A workspace path is required');
		const absolute = path.resolve(this.root, location);
		const relative = path.relative(this.root, absolute);
		if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
			throw new Error('Path escapes the workspace');
		let cursor = this.root;
		for (const segment of relative.split(path.sep).filter(Boolean)) {
			if (segment.toLowerCase() === '.git') throw new Error('Use repository operations for Git state');
			cursor = path.join(cursor, segment);
			if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink())
				throw new Error('Linked workspace paths are not supported');
		}
		return absolute;
	}

	/** Call this method to test whether a resolved path belongs to an assigned directory.
	 * @param {string} directory - Assigned workspace directory.
	 * @param {string} location - Candidate workspace path.
	 * @returns {boolean} - Whether the candidate is inside the directory.
	 */
	contains(directory, location) {
		const relative = path.relative(this.resolve(directory), this.resolve(location));
		return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
	}

	/** Call this method to read bounded UTF-8 data for a domain operation.
	 * @param {string} location - Confined input file.
	 * @returns {string} - Exact decoded text; malformed UTF-8 and oversized input reject.
	 */
	read(location) {
		const absolute = this.resolve(location);
		const status = fs.statSync(absolute);
		if (!status.isFile() || status.size > MAX_RESULT_BYTES) throw new Error('Input is not a bounded file');
		const bytes = fs.readFileSync(absolute);
		if (bytes.length > MAX_RESULT_BYTES) throw new Error('Input grew beyond the file limit');
		return new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes);
	}

	/** Call this method to decode a current JSON input.
	 * @param {string} location - Confined input file.
	 * @returns {WorkflowJson} - Parsed data; no legacy translation occurs.
	 */
	json(location) {
		return JSON.parse(this.read(location));
	}

	/** Call this method to publish complete server-owned text atomically.
	 * @param {string} location - Confined output file selected by its operation.
	 * @param {string} text - Complete UTF-8 contents.
	 * @returns {string} - Absolute saved path.
	 */
	write(location, text) {
		const absolute = this.resolve(location);
		fs.mkdirSync(path.dirname(absolute), {recursive: true});
		const pending = `${absolute}.${randomUUID()}.pending`;
		try {
			fs.writeFileSync(pending, text, {flag: 'wx'});
			fs.renameSync(pending, absolute);
		} finally {
			if (fs.existsSync(pending)) fs.unlinkSync(pending);
		}
		return absolute;
	}

	/** Call this method to identify bytes without parsing or transforming them.
	 * @param {string} text - Exact UTF-8 text.
	 * @returns {string} - SHA-256 digest.
	 */
	hash(text) {
		return createHash('sha256').update(text).digest('hex');
	}
}
