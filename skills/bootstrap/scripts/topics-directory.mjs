#!/usr/bin/env node
import {TopicPaths} from '../../normalize-standards/scripts/TopicPaths.mjs';

try {
	const [mode, flag, repository, ...extra] = process.argv.slice(2);
	if (!['inspect', 'record'].includes(mode) || flag !== '--repo' || !repository || extra.length)
		throw new Error('Usage: topics-directory.mjs <inspect|record> --repo <repository-root>');
	const topics = TopicPaths.bootstrap(repository, mode === 'record');
	process.stdout.write(`${JSON.stringify({ok: true, topics, mode})}\n`);
} catch (error) {
	process.stderr.write(`${error.message}\n`);
	process.exitCode = 2;
}
