import {readFile, realpath} from 'node:fs/promises';
import path from 'node:path';

// Publication metadata comes from the checkout owning the physical canonical
// files, including when CODEX_HOME/documentation is a junction or symlink.
export async function publicationTarget(canonicalRoot) {
	let directory = canonicalRoot;
	while (true) {
		let content;
		try {
			content = await readFile(path.join(directory, 'governance.json'), 'utf8');
		} catch (error) {
			if (error.code !== 'ENOENT') throw error;
		}
		if (content !== undefined) {
			const manifest = JSON.parse(content);
			const remote = manifest.repository?.canonicalRemote;
			const branch = manifest.repository?.defaultBranch;
			const docs = manifest.install?.documentationDirectory;
			const match = typeof remote === 'string' && remote.match(
				/^(?:git@github\.com:|https:\/\/github\.com\/|ssh:\/\/git@github\.com\/)([A-Za-z0-9_-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/,
			);
			if (manifest.schemaVersion !== 1 || !match || !match[2] || /^[.]+$/.test(match[2])) {
				throw new Error('Governance publication requires a valid GitHub canonicalRemote');
			}
			if (typeof branch !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch)
				|| branch.includes('..') || branch.split('/').some((part) => !part || part.startsWith('.') || part.endsWith('.') || part.endsWith('.lock'))) {
				throw new Error('Governance publication requires a valid defaultBranch');
			}
			if (typeof docs !== 'string' || path.isAbsolute(docs) || docs.includes('\\')
				|| docs.split('/').some((part) => !part || part === '.' || part === '..')) {
				throw new Error('Governance publication requires a repository-relative documentationDirectory');
			}
			const expected = await realpath(path.join(directory, docs, 'standards'));
			if (expected !== canonicalRoot) throw new Error('Governance documentation directory does not own the canonical standards');
			const relative = path.relative(directory, canonicalRoot);
			if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
				throw new Error('Canonical standards must remain inside the governance checkout');
			}
			return {
				repositoryUrl: `https://github.com/${match[1]}/${match[2]}`,
				branch,
				standardsPath: relative.replaceAll('\\', '/'),
			};
		}
		const parent = path.dirname(directory);
		if (parent === directory) throw new Error('Cannot find governance.json for canonical standards publication');
		directory = parent;
	}
}

export function standardUrl(target, name, section) {
	const location = `${target.repositoryUrl}/blob/${encodeURIComponent(target.branch)}/${target.standardsPath.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent(name)}`;
	if (section === undefined) return location;
	const anchor = section.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
	return `${location}#${encodeURIComponent(anchor)}`;
}
