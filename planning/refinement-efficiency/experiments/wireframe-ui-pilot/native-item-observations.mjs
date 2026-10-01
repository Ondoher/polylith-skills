import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

/** Retain only item types and timestamp observations from existing native logs. */
export function nativeItemObservations(attempt) {
	const clients = path.join(attempt, 'clients');
	const observations = [];
	for (const entry of fs.readdirSync(clients, {withFileTypes: true})) {
		const log = path.join(clients, entry.name, 'stderr.private.log');
		if (!entry.isDirectory() || !fs.existsSync(log)) continue;
		const items = new Map();
		for (const line of fs.readFileSync(log, 'utf8').split('\n')) {
			const match = line.match(
				/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z).*Output item item_type="([a-z_]+)" item_id="([^"]+)"/,
			);
			if (!match) continue;
			const [, at, type, id] = match;
			const item = items.get(id) ?? {type, timestamps: []};
			item.timestamps.push(at);
			items.set(id, item);
		}
		observations.push({
			client: entry.name,
			items: [...items.values()].map(({type, timestamps}) => ({
				type,
				firstObservedAt: timestamps[0],
				lastObservedAt: timestamps.at(-1),
				observations: timestamps.length,
				spanMs: timestamps.length > 1 ? Date.parse(timestamps.at(-1)) - Date.parse(timestamps[0]) : null,
			})),
		});
	}
	return {
		limits: [
			'Existing native log observations only; no model proxy or additional model call.',
			'First-to-last logged item spans are not pure reasoning, generation, transport or tool durations.',
			'Single observations do not establish duration; missing observations are not zero duration.',
			'Observations are nested inside native invocation windows and may overlap between clients.',
			'No item content, arguments, private reasoning, credentials or item identifiers are retained.',
		],
		observations,
	};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	const report = nativeItemObservations(path.resolve(process.argv[2]));
	fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 2) + '\n');
	console.log(JSON.stringify({output: process.argv[3], clients: report.observations.length}));
}
