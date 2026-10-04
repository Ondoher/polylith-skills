import {existsSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';

/** Repository-owned topic location and bootstrap discovery. */
export class TopicPaths {
	/** Call this method to read the root instruction directive, excluding fenced examples.
	 *
	 * @param {string} content - Root AGENTS.md contents.
	 * @returns {string | undefined} - Explicit repository-relative folder, when declared.
	 */
	static fromInstructions(content) {
		let fence;
		let directory;
		for (const line of content.split(/\r?\n/)) {
			const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
			if (fence) {
				if (new RegExp(`^\\s{0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) fence = undefined;
				continue;
			}
			if (marker) {
				fence = marker[1];
				continue;
			}
			const directive = /^Topics folder:[ \t]*(.*)$/.exec(line);
			if (!directive) continue;
			if (directory !== undefined) throw new Error('AGENTS.md contains multiple Topics folder directives');
			directory = directive[1].trim();
			if (
				!directory ||
				/[\\:*?#<>|"\u0000-\u001f]/.test(directory) ||
				path.posix.isAbsolute(directory) ||
				directory
					.split('/')
					.some((segment) => !segment || segment === '.' || segment === '..' || /[. ]$/.test(segment))
			)
				throw new Error('Topics folder must be a normalized repository-relative folder using / separators');
		}
		return directory;
	}

	/** Call this method to resolve the configured topic folder without legacy inference or writes.
	 *
	 * @param {string} repository - Owning repository root.
	 * @returns {string} - Repository-relative topic folder.
	 */
	static directory(repository) {
		const root = realpathSync(repository);
		const instructions = path.join(root, 'AGENTS.md');
		const directory =
			TopicPaths.fromInstructions(existsSync(instructions) ? readFileSync(instructions, 'utf8') : '') ??
			'.agents/topics';
		let candidate = root;
		for (const segment of directory.split('/')) {
			candidate = path.join(candidate, segment);
			try {
				lstatSync(candidate);
			} catch (error) {
				if (error.code === 'ENOENT') continue;
				throw error;
			}
			const relative = path.relative(root, realpathSync(candidate));
			if (
				relative === '..' ||
				relative.startsWith(`..${path.sep}`) ||
				path.isAbsolute(relative) ||
				!statSync(candidate).isDirectory()
			)
				throw new Error(`Topics folder must remain a directory inside the repository: ${directory}`);
		}
		return directory;
	}

	/** Call this method to discover a legacy folder and optionally record its root-instruction exception.
	 *
	 * @param {string} repository - Owning repository root.
	 * @param {boolean} apply - Whether to append an inferred legacy directive.
	 * @returns {string} - Selected repository-relative topic folder.
	 */
	static bootstrap(repository, apply = false) {
		const root = realpathSync(repository);
		const instructions = path.join(root, 'AGENTS.md');
		const content = readFileSync(instructions, 'utf8');
		const configured = TopicPaths.fromInstructions(content);
		const current = TopicPaths.directory(root);
		if (configured !== undefined || existsSync(path.join(root, current))) return current;
		const legacy = path.join(root, 'agents', 'topics');
		if (!existsSync(legacy)) return current;
		const relative = path.relative(root, realpathSync(legacy));
		if (
			relative === '..' ||
			relative.startsWith(`..${path.sep}`) ||
			path.isAbsolute(relative) ||
			!statSync(legacy).isDirectory()
		)
			throw new Error('Legacy topics folder must remain a directory inside the repository');
		if (apply) {
			const instructionRelative = path.relative(root, realpathSync(instructions));
			if (
				instructionRelative === '..' ||
				instructionRelative.startsWith(`..${path.sep}`) ||
				path.isAbsolute(instructionRelative)
			)
				throw new Error('Root AGENTS.md must remain inside the repository before recording a topics exception');
			const newline = content.includes('\r\n') ? '\r\n' : '\n';
			writeFileSync(
				instructions,
				`${content}${content.endsWith('\n') ? '' : newline}${newline}Topics folder: agents/topics${newline}`,
				'utf8',
			);
		}
		return 'agents/topics';
	}
}
