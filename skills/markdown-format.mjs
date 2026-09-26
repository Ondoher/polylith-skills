import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

/** Format generated Markdown with the destination repository's own Prettier installation. */
export function formatRepositoryMarkdown(repository, destination, content) {
	const root = path.resolve(repository);
	const packagePath = path.join(root, 'package.json');
	if (!existsSync(packagePath)) return content;
	const manifest = JSON.parse(readFileSync(packagePath, 'utf8'));
	const declared = Boolean(manifest.dependencies?.prettier || manifest.devDependencies?.prettier);
	const configured = Boolean(
		manifest.prettier ||
		declared ||
		[
			'.prettierrc',
			'.prettierrc.json',
			'.prettierrc.yml',
			'.prettierrc.yaml',
			'.prettierrc.js',
			'.prettierrc.cjs',
			'prettier.config.js',
			'prettier.config.cjs',
			'prettier.config.mjs',
		].some((name) => existsSync(path.join(root, name))),
	);
	if (!configured) return content;
	if (!declared) throw new Error(`Repository must declare Prettier to publish Markdown: ${root}`);
	const packageRoot = path.join(root, 'node_modules', 'prettier');
	const installedManifest = path.join(packageRoot, 'package.json');
	if (!existsSync(installedManifest))
		throw new Error(`Repository-local Prettier is required to publish Markdown: ${root}`);
	const installed = JSON.parse(readFileSync(installedManifest, 'utf8'));
	const command = typeof installed.bin === 'string' ? installed.bin : installed.bin?.prettier;
	if (!command || path.isAbsolute(command) || command.startsWith('..'))
		throw new Error(`Invalid repository-local Prettier entrypoint: ${root}`);
	const cli = path.resolve(packageRoot, command);
	if (!cli.startsWith(packageRoot + path.sep) || !existsSync(cli))
		throw new Error(`Repository-local Prettier entrypoint is missing: ${root}`);
	try {
		return execFileSync(process.execPath, [cli, '--stdin-filepath', path.resolve(destination)], {
			cwd: root,
			input: content,
			encoding: 'utf8',
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
		});
	} catch (error) {
		throw new Error(
			`Repository-local Prettier failed for ${destination}: ${error.stderr?.toString() || error.message}`,
		);
	}
}

/** The nearest package above a publication path owns its formatter settings. */
export function findRepositoryForMarkdown(destination) {
	let current = path.resolve(path.dirname(destination));
	for (;;) {
		if (existsSync(path.join(current, 'package.json'))) return current;
		const parent = path.dirname(current);
		if (parent === current) return null;
		current = parent;
	}
}
