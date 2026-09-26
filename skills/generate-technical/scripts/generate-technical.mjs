import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateTechnicalContext} from '../../refine-design/scripts/technical-contract.mjs';
import {findRepositoryForMarkdown, formatRepositoryMarkdown} from '../../markdown-format.mjs';

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (message) => {
	throw new Error(message);
};
const clean = (value) => String(value).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
const code = (value) => `\`${String(value).replace(/`/g, '')}\``;
const sentence = (value) => (/[.!?]$/.test(value) ? value : `${value}.`);
const lineItems = (values) => values.map((value) => `- ${sentence(clean(value))}\n`).join('');
const links = (records, ids) =>
	ids
		.map((id) => {
			const record = records.get(id);
			return record ? `[${clean(record.title)}](${pageFor(record)}#${id})` : code(id);
		})
		.join(', ');
const pageFor = (record) =>
	({
		fact: 'architecture.md',
		boundary: 'architecture.md',
		flow: 'critical-flows.md',
		contract: 'contracts.md',
		decision: 'decisions.md',
		gap: 'decisions.md',
	})[record.kind];
const evidenceLine = (evidence, ids) =>
	ids.length
		? `**Evidence:** ${ids
				.map((id) => {
					const item = evidence.get(id);
					return item ? `${clean(item.summary)} (${item.kind})` : code(id);
				})
				.join('; ')}.\n\n`
		: '';
const nav = (pages) =>
	[
		['Guide', 'index.md'],
		['Architecture', 'architecture.md'],
		['Critical flows', 'critical-flows.md'],
		['Boundary contracts', 'contracts.md'],
		['Decisions and gaps', 'decisions.md'],
		['Focused papers', 'focused-papers.md'],
		['Handoff', 'handoff.md'],
	]
		.filter(([, file]) => file === 'index.md' || pages.has(file))
		.map(([title, file]) => `[${title}](${file})`)
		.join(' · ') + '\n\n';

const anchor = (record) => `<a id="${record.id}"></a>\n\n`;
const prose = (value) => sentence(clean(value));
const proseList = (values) => values.map(prose).join(' ');
// Preserve authored diagrams in the explanation that owns them.
function renderDiscussion(value) {
	const lines = String(value).replace(/\r\n/g, '\n').split('\n');
	const output = [],
		proseLines = [];
	const flush = () => {
		const paragraph = clean(proseLines.join('\n'));
		if (paragraph) output.push(paragraph);
		proseLines.length = 0;
	};
	for (let index = 0; index < lines.length; index += 1) {
		const opening = /^ {0,3}(`{3,}|~{3,})mermaid[ \t]*$/.exec(lines[index]);
		if (!opening) {
			if (!lines[index].trim()) flush();
			else proseLines.push(lines[index]);
			continue;
		}
		flush();
		const fence = opening[1];
		const closing = new RegExp('^ {0,3}' + fence[0] + '{' + fence.length + ',}[ \\t]*$');
		let end = index + 1;
		while (end < lines.length && !closing.test(lines[end])) end += 1;
		if (end === lines.length) fail('Unclosed Mermaid fence in technical discussion');
		output.push(lines.slice(index, end + 1).join('\n'));
		index = end;
	}
	flush();
	return output.map((block) => block + '\n\n').join('');
}
const discussion = (record) => (record.details.discussion ?? []).map(renderDiscussion).join('');

const status = (record) =>
	({
		observed: 'Observed code',
		accepted: 'Selected working architecture',
		conditional: 'Conditional proposal',
		unresolved: 'Open question',
	})[record.status] ?? record.status;

function renderFact(record) {
	return `${anchor(record)}### ${clean(record.title)}\n\n${prose(record.summary)} ${prose(record.details.claim)} This observation is limited: ${prose(record.details.limits)}\n\n${discussion(record)}`;
}

function renderBoundary(record, records) {
	const d = record.details;
	const responsibility = clean(d.responsibility).replace(/^./, (character) => character.toLowerCase());
	const lifecycle = clean(d.lifecycle).replace(/^./, (character) => character.toLowerCase());
	return `${anchor(record)}### ${clean(record.title)}\n\n**${status(record)}.** ${prose(record.summary)} Its responsibility is to ${sentence(responsibility)} It serves ${d.consumers.map(clean).join(', ')} and exchanges ${d.exchanges.map(clean).join(', ')}.\n\n${discussion(record)}The intended lifecycle is ${sentence(lifecycle)} The failure contract is explicit: ${prose(d.failureBehavior)} ${d.decisionRefs.length ? `The governing choice is ${links(records, d.decisionRefs)}.` : ''}\n\n`;
}

function renderDecision(record, records) {
	const d = record.details;
	let out = `${anchor(record)}### ${clean(record.title)}\n\n**${status(record)}.** ${prose(d.context)} ${prose(d.choice)} ${prose(record.summary)}\n\n`;
	if (d.alternatives.length)
		out +=
			d.alternatives
				.map(
					(a) =>
						`${clean(a.option)} remains ${a.disposition} because ${prose(a.reason).replace(/^./, (c) => c.toLowerCase())}`,
				)
				.join(' ') + '\n\n';
	out += `${proseList(d.consequences)}\n\n${discussion(record)}`;
	const affected = [...records.values()].filter(
		(item) => item.kind === 'boundary' && item.details.decisionRefs.includes(record.id),
	);
	if (affected.length)
		out += `This choice governs ${links(
			records,
			affected.map((item) => item.id),
		)}.\n\n`;
	return out;
}

function renderGap(record, records) {
	const d = record.details;
	return `${anchor(record)}### ${clean(record.title)}\n\n${prose(d.question)} ${proseList(d.resolutionCriteria)} Until resolved, this affects ${links(records, d.affectedRefs)}.\n\n${discussion(record)}`;
}

function renderPaperRecord(record, records, productRecords) {
	const renderers = {
		fact: () => renderFact(record),
		boundary: () => renderBoundary(record, records),
		decision: () => renderDecision(record, records),
		flow: () => renderFlow(record, records, productRecords),
		contract: () => renderContract(record, records),
		gap: () => renderGap(record, records),
	};
	// The focused page retains complete explanations; canonical record anchors
	// remain on the general pages, including when several papers share a record.
	const content = renderers[record.kind]()
		.replace(/^<a id="[^"]+"><\/a>\n\n/u, '')
		.replace(/^#{2,3} [^\n]+\n\n/u, '')
		.replace(/^### /gmu, '##### ');
	const classification = record.kind === 'gap' ? `**Open question (${record.details.category}).**\n\n` : '';
	return `#### [${clean(record.title)}](${pageFor(record)}#${record.id})\n\n${classification}${content}`;
}

function renderFocusedPapers(context, items, records, productRecords) {
	let body =
		'# Focused technical papers\n\nEach section maps an authored paper to the current technical interpretation. Mapped questions also appear in the common decisions and implementation handoff; a source paper or research report alone does not accept a proposal.\n\n';
	for (const paper of context.whitePapers ?? []) {
		const relative = path.posix.relative(`documents/${context.product.name}/technical`, paper.path);
		const sourceLink = relative.includes(' ') ? `<${relative}>` : relative;
		const evidenceIds = new Set(
			context.evidence
				.filter((evidence) =>
					evidence.sourceFiles.some((file) => file.path === paper.path && file.sha256 === paper.sha256),
				)
				.map((evidence) => evidence.id),
		);
		const mapped = items.filter((record) => record.evidenceRefs.some((id) => evidenceIds.has(id)));
		const open = mapped.filter((record) => record.kind === 'gap' && record.status === 'unresolved');
		const direction = mapped.filter((record) => record.kind !== 'gap');
		body += `<a id="paper-${paper.claimId}"></a>\n\n## ${clean(paper.title)}\n\n${prose(paper.summary)} Read the [authored paper](${sourceLink}) for its full reasoning and sources. `;
		body +=
			paper.researchStatus === 'current'
				? 'Saved research matches this paper revision.\n\n'
				: paper.researchStatus === 'stale'
					? 'Saved research predates this paper revision and needs rechecking.\n\n'
					: 'No saved research handoff is bound to this paper.\n\n';
		if (direction.length) {
			body += '### Mapped technical direction\n\n';
			for (const record of direction) body += renderPaperRecord(record, records, productRecords);
		}
		if (open.length) {
			body += '### Open questions\n\n';
			for (const record of open) body += renderPaperRecord(record, records, productRecords);
			body += '\n';
		}
		if (!mapped.length)
			body +=
				'This paper has not yet been reconciled into technical records. Its questions have not entered the common open-question register.\n\n';
	}
	return body;
}

function renderContract(record, records) {
	const d = record.details;
	let out = `${anchor(record)}## ${clean(record.title)}\n\n**${status(record)}.** ${prose(record.summary)} The owner is ${links(records, [d.ownerRef])}`;
	if (d.participantRefs.length) out += `; the other boundary participants are ${links(records, d.participantRefs)}`;
	out += `. This contract is exercised by ${links(records, d.flowRefs)}.\n\n${discussion(record)}`;
	out += '| Aspect | Required meaning |\n| --- | --- |\n';
	for (const [label, values] of [
		['Input', d.input],
		['Result', d.result],
		['Invariant', d.invariants],
		['Failure effect', d.failure],
	]) {
		for (const [index, value] of values.entries()) out += `| ${index === 0 ? label : ''} | ${clean(value)} |\n`;
	}
	out += `\n${prose(d.lifecycle)}\n\n`;
	return out;
}

function flowDiagram(flow, records) {
	const owners = [...new Set(flow.details.steps.map((step) => step.ownerRef))];
	const alias = new Map(owners.map((id, index) => [id, `Owner${index + 1}`]));
	const mermaidText = (value) => {
		const wording = clean(value)
			.replace(/[<>"#]/g, '')
			.replace(/\s+/g, ' ');
		const firstClause = wording.split(/[;,]/, 1)[0];
		const label = firstClause.length >= 24 ? firstClause : wording.replace(/;/g, ',');
		if (label.length <= 68) return label;
		const lastWord = label.slice(0, 69).lastIndexOf(' ');
		return `${label.slice(0, lastWord > 30 ? lastWord : 68)}...`;
	};
	const lines = ['```mermaid', 'sequenceDiagram', '    actor User', '    participant Workflow'];
	for (const id of owners)
		lines.push(`    participant ${alias.get(id)} as ${mermaidText(records.get(id)?.title ?? id)}`);
	lines.push(`    User->>Workflow: ${mermaidText(flow.details.trigger)}`);
	for (const step of flow.details.steps) {
		lines.push(`    Workflow->>${alias.get(step.ownerRef)}: ${mermaidText(step.action)}`);
		lines.push(`    ${alias.get(step.ownerRef)}-->>Workflow: ${mermaidText(step.result)}`);
	}
	return `${lines.join('\n')}\n\`\`\`\n\n`;
}

function renderFlow(flow, records, productRecords) {
	const d = flow.details;
	let out = `<a id="${flow.id}"></a>\n\n## ${clean(flow.title)}\n\n`;
	out += `**${status(flow)}.** ${prose(flow.summary)}\n\n`;
	out += `The product ${flow.productRefs.length === 1 ? 'outcome behind this flow is' : 'outcomes behind this flow are'} ${flow.productRefs
		.map((id) => {
			const item = productRecords.get(id);
			return item
				? clean(item.outcome ?? item.question ?? item.summary ?? item.description).replace(/[.!?]$/, '')
				: id;
		})
		.join('; ')}. ${prose(d.trigger)} ${proseList(d.preconditions)}\n\n`;
	out += discussion(flow);
	out += `### Contract to preserve\n\n${lineItems(d.guarantees)}\n`;
	out += `### Ownership and sequence\n\n${flowDiagram(flow, records)}`;
	out += 'The sequence shows responsibility and order; its arrows do not prescribe service or IPC methods.\n\n';
	out += '| Step | Owner | Action | Result |\n| --- | --- | --- | --- |\n';
	for (const [index, step] of d.steps.entries()) {
		const owner = records.get(step.ownerRef);
		out += `| ${index + 1} | [${clean(owner?.title ?? step.ownerRef)}](architecture.md#${step.ownerRef}) | ${clean(step.action)} | ${clean(step.result)} |\n`;
	}
	out += '\n### Outcome and recovery\n\n';
	out += `- **Success:** ${d.success.map((value) => sentence(clean(value))).join(' ')}\n`;
	out += `- **Failure:** ${d.failure.map((value) => sentence(clean(value))).join(' ')}\n`;
	out += `- **Cancel:** ${sentence(clean(d.cancellation))}\n`;
	out += `- **Retry:** ${sentence(clean(d.retry))}\n\n`;
	out += `${d.limits.map((value) => sentence(clean(value))).join(' ')}\n\n`;
	const gaps = [...records.values()].filter(
		(record) =>
			record.kind === 'gap' && record.status === 'unresolved' && record.details.affectedRefs.includes(flow.id),
	);
	if (gaps.length)
		out += `The unresolved decisions and proofs for this flow are ${gaps.map((gap) => `[${clean(gap.title)}](decisions.md#${gap.id})`).join(', ')}.\n\n`;
	out += `A first useful demonstration is to ${d.verification.map((value) => sentence(clean(value)).replace(/^./, (character) => character.toLowerCase())).join(' ')}\n\n`;
	return out;
}

function diagram(boundaries, flows) {
	if (!boundaries.length || !flows.length) return '';
	const node = (id) => `N${id.replace(/[^a-z0-9]/g, '')}`;
	const label = (value) => clean(value).replace(/\\/g, '\\\\').replace(/"/g, '&quot;').replace(/[<>]/g, '');
	const lines = ['```mermaid', 'flowchart LR'];
	for (const item of [...boundaries, ...flows]) lines.push(`    ${node(item.id)}["${label(item.title)}"]`);
	for (const flow of flows)
		for (const owner of new Set(flow.details.steps.map((step) => step.ownerRef)))
			lines.push(`    ${node(flow.id)} --> ${node(owner)}`);
	return `${lines.join('\n')}\n\`\`\`\n\n`;
}

/** Pure rendering: every design statement comes from the validated context. */
export function renderTechnical(context) {
	validateTechnicalContext(context);
	const items = context.artifacts
		.flatMap((artifact) => artifact.payload.records)
		.filter((record) => record.status !== 'superseded');
	const records = new Map(items.map((item) => [item.id, item]));
	const evidence = new Map(context.evidence.map((item) => [item.id, item]));
	const productRecords = new Map([
		[context.product.id, {name: context.product.name, summary: context.product.purpose.summary}],
		[context.product.purpose.id, {name: 'Product purpose', summary: context.product.purpose.summary}],
		...context.product.users.map((item) => [item.id, item]),
		...context.capabilities.map((item) => [item.id, item]),
		...context.gaps.map((item) => [item.id, {name: item.question, question: item.question}]),
	]);
	const byKind = (kind) => items.filter((item) => item.kind === kind);
	const facts = byKind('fact'),
		boundaries = byKind('boundary'),
		flows = byKind('flow'),
		contracts = byKind('contract'),
		decisions = byKind('decision'),
		gaps = byKind('gap');
	const pages = new Map();
	if (facts.length || boundaries.length) {
		let body =
			'# Architecture and ownership\n\nThis page separates what the inspected application does today from the proposed responsibilities needed to satisfy the product. Boundaries describe authority and lifetime; they do not prescribe processes, services, or IPC method names.\n\n';
		if (facts.length) {
			body += `## Current implementation\n\n${facts.map(renderFact).join('')}`;
			const foundation = context.capabilities.filter((capability) =>
				facts.some((fact) => fact.productRefs.includes(capability.id)),
			);
			if (foundation.length)
				body += `## Product and platform direction\n\n${foundation.map((capability) => prose(capability.description)).join(' ')} These are product inputs to the proposed architecture, not capabilities proven in the inspected code.\n\n`;
		}
		if (boundaries.length) {
			body += '## Target responsibility map\n\n';
			body += diagram(boundaries, flows);
			body +=
				'The diagram connects the documented flows to their responsible boundaries. It is a responsibility sketch, not a claim that those components already exist.\n\n';
			body +=
				'## Boundary behavior\n\n' + boundaries.map((boundary) => renderBoundary(boundary, records)).join('');
			if (flows.length) {
				body += '## How the boundaries cooperate\n\n';
				for (const flow of flows) {
					const owners = [...new Set(flow.details.steps.map((step) => step.ownerRef))];
					body += `${prose(flow.summary)} The [${clean(flow.title)}](critical-flows.md#${flow.id}) flow passes through ${links(records, owners)} in that order. Its detailed sequence and recovery behavior are documented with the flow.\n\n`;
				}
			}
		}
		body += '## What this architecture does not yet settle\n\n';
		const architectureGaps = gaps.filter((gap) =>
			gap.details.affectedRefs.some((id) => boundaries.some((boundary) => boundary.id === id)),
		);
		body += architectureGaps.length
			? lineItems(
					architectureGaps.map((gap) => `${gap.details.question} See [${gap.title}](decisions.md#${gap.id})`),
				)
			: 'The selected boundaries still require detailed implementation contracts.\n';
		body +=
			'\n' + evidenceLine(evidence, [...new Set([...facts, ...boundaries].flatMap((item) => item.evidenceRefs))]);
		pages.set('architecture.md', body);
	}
	if (flows.length)
		pages.set(
			'critical-flows.md',
			`# Critical flows\n\nThese operations cross ownership boundaries where a mistake could discard work, break a composition, or misreport an output. Product behavior is binding; the sequence diagrams explain responsibility and order while concrete interfaces remain open.\n\n${flows.map((flow) => renderFlow(flow, records, productRecords)).join('')}`,
		);
	if (contracts.length)
		pages.set(
			'contracts.md',
			`# Cross-boundary contracts\n\nThese contracts state the information and guarantees that must cross consequential boundaries. They specify semantic inputs and results, not method names, wire formats, or a fixed Polylith feature tree. A conditional contract still needs the stated evidence before its mechanism can be fixed.\n\n${contracts.map((contract) => renderContract(contract, records)).join('')}`,
		);
	if (decisions.length || gaps.length) {
		let body =
			'# Decisions and open questions\n\nSelected working decisions express the current technical direction within the accepted product scope. Conditional proposals need evidence before becoming contracts. Open product questions need owner and UX decisions; technical and evidence questions need a bounded proof.\n\n';
		const selected = decisions.filter((item) => item.status === 'accepted');
		const conditional = decisions.filter((item) => item.status === 'conditional');
		if (selected.length)
			body +=
				'## Selected working decisions\n\n' + selected.map((item) => renderDecision(item, records)).join('');
		if (conditional.length)
			body += '## Conditional proposals\n\n' + conditional.map((item) => renderDecision(item, records)).join('');
		for (const [category, title] of [
			['product', 'Open product policy'],
			['technical', 'Technical design questions'],
			['evidence', 'Platform and source evidence'],
		]) {
			const subset = gaps.filter((item) => item.status === 'unresolved' && item.details.category === category);
			if (subset.length) body += `## ${title}\n\n${subset.map((item) => renderGap(item, records)).join('')}`;
		}
		pages.set('decisions.md', body);
	}
	if (context.whitePapers?.length)
		pages.set('focused-papers.md', renderFocusedPapers(context, items, records, productRecords));
	if (flows.length || gaps.length) {
		let body =
			'# Implementation handoff\n\nThe selected architecture gives implementation work a starting direction, while the unresolved mechanisms below limit how specific its contracts can be. Use the first positive demonstrations to establish real behavior before fixing detailed interfaces.\n\n';
		if (decisions.some((item) => item.status === 'accepted')) {
			body += '## Constraints to preserve\n\n';
			for (const decision of decisions.filter((item) => item.status === 'accepted'))
				body += `- **[${clean(decision.title)}](decisions.md#${decision.id}):** ${prose(decision.details.choice)}\n`;
			body += '\n';
		}
		if (flows.length) {
			body +=
				'## Behavior to demonstrate\n\n| Flow and contract | First useful positive result | Remaining mechanism |\n| --- | --- | --- |\n';
			for (const flow of flows) {
				const governing = contracts.filter((contract) => contract.details.flowRefs.includes(flow.id));
				body += `| [${clean(flow.title)}](critical-flows.md#${flow.id})${
					governing.length
						? `<br>${links(
								records,
								governing.map((item) => item.id),
							)}`
						: ''
				} | ${flow.details.verification.map(clean).join(' ')} | ${flow.details.limits.map(clean).join(' ')} |\n`;
			}
			body += '\n';
		}
		const unresolved = gaps.filter((gap) => gap.status === 'unresolved');
		if (unresolved.length) {
			body +=
				'## Proofs and decisions before detailed contracts\n\n| Question | Who or what resolves it | Contract affected |\n| --- | --- | --- |\n';
			for (const gap of unresolved)
				body += `| [${clean(gap.title)}](decisions.md#${gap.id}) | ${gap.details.category === 'product' ? 'Product owner and UX decision' : gap.details.category === 'evidence' ? 'Representative platform demonstration' : 'Focused technical design and demonstration'}: ${gap.details.resolutionCriteria.map(clean).join(' ')} | ${links(records, gap.details.affectedRefs)} |\n`;
			body += '\n';
		}
		body +=
			'These are documentation boundaries and first demonstrations, not an implementation assignment or a claim that the target runtime exists. Recheck source observations after relevant code changes.\n';
		pages.set('handoff.md', body);
	}
	let index = `# ${clean(context.product.name)} technical guide\n\n${prose(context.product.purpose.summary)} This guide describes the current code baseline, the selected technical boundaries, the behavior of critical transitions, and the questions that must be settled before detailed contracts.\n\n`;
	if (facts.length)
		index += `The inspected application currently has a narrower implementation: ${facts.map((item) => prose(item.details.claim)).join(' ')} The target architecture described here is not yet an implementation claim.\n\n`;
	const selectedDirection = decisions.filter((item) => item.status === 'accepted');
	if (selectedDirection.length)
		index += `The working design selects ${selectedDirection.map((item) => clean(item.title).toLowerCase()).join(', ')}. ${decisions.some((item) => item.status === 'conditional') ? `The [conditional proposals](decisions.md#conditional-proposals) need further evidence before becoming contracts. ` : ''}Open questions remain visible where product policy or technical evidence is incomplete.\n\n`;
	index += '## Read this guide\n\n| Page | What it explains |\n| --- | --- |\n';
	const explanations = {
		'architecture.md': 'Current code, target responsibilities, authority, lifetime, and failure boundaries.',
		'critical-flows.md': 'Ordered operations and recovery across boundaries.',
		'contracts.md': 'Inputs, results, invariants, and failure effects at risky boundaries.',
		'decisions.md': 'Chosen directions, conditional proposals, and open questions.',
		'focused-papers.md': 'How authored papers map to current technical direction and shared open questions.',
		'handoff.md': 'Stable constraints and the first proofs needed for detailed contracts.',
	};
	for (const [file, body] of pages) index += `| [${body.match(/^# (.*)$/m)[1]}](${file}) | ${explanations[file]} |\n`;
	if (context.whitePapers?.length) {
		index +=
			'\n## Focused technical papers\n\nThe [focused-paper mapping](focused-papers.md) explains which claims and questions have entered this guide. The authored papers preserve deeper reasoning.\n\n';
		for (const paper of context.whitePapers) {
			const relative = path.posix.relative(`documents/${context.product.name}/technical`, paper.path);
			const link = relative.includes(' ') ? `<${relative}>` : relative;
			const research =
				paper.researchStatus === 'current'
					? 'Research checked against this paper revision.'
					: paper.researchStatus === 'stale'
						? 'Saved research predates this paper revision; recheck before using its findings.'
						: 'No saved research handoff is bound to this paper.';
			index += `- [${clean(paper.title)}](focused-papers.md#paper-${paper.claimId}) ([source](${link})): ${clean(paper.summary)} ${research}\n`;
		}
		index += '\n';
	}
	index += '\n## Scope of this first pass\n\n';
	const covered = context.capabilities.filter((item) => items.some((record) => record.productRefs.includes(item.id)));
	if (covered.length) {
		index += '| Product capability | Required outcome | Discussion |\n| --- | --- | --- |\n';
		for (const capability of covered) {
			const affected = items.filter(
				(item) =>
					item.productRefs.includes(capability.id) && ['boundary', 'flow', 'decision'].includes(item.kind),
			);
			const focus =
				affected.find((item) => item.kind === 'flow') ??
				affected.find((item) => item.kind === 'boundary') ??
				affected[0];
			index += `| ${clean(capability.name)} | ${clean(capability.outcome ?? capability.description)} | ${focus ? links(records, [focus.id]) : '—'} |\n`;
		}
		index += '\n';
	}
	index += `The guide reflects product model revision ${context.productModel.revision} and technical snapshot revision ${context.sourceSnapshot.revision}. Source observations are bound to the inspected checkout and require rechecking after relevant changes.\n\n`;
	if (context.exclusions.length)
		index += `## Unavailable context\n\n${context.exclusions.map((item) => `- ${clean(item.reason ?? item.status)}\n`).join('')}\n`;
	pages.set('index.md', index);
	for (const [file, body] of pages)
		if (file !== 'index.md')
			pages.set(
				file,
				body.replace(/^# ([^\n]+)\n\n/, (match) => match + nav(pages)),
			);
	return pages;
}

function receiptFor(contextBytes, context, pages) {
	const files = [...pages]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, body]) => ({path: name, bytes: Buffer.byteLength(body), sha256: sha256(body)}));
	return {
		schemaVersion: '1.0',
		generator: 'generate-technical',
		contextId: context.contextId,
		contextSha256: sha256(contextBytes),
		sourceSnapshot: context.sourceSnapshot,
		files,
	};
}

function ownedOutput(output) {
	if (!fs.existsSync(output)) return false;
	if (!fs.statSync(output).isDirectory() || fs.lstatSync(output).isSymbolicLink())
		fail('Output is not an ordinary directory');
	const receiptPath = path.join(output, 'publication-receipt.json');
	if (!fs.existsSync(receiptPath)) fail('Output contains human-authored files; choose another directory');
	const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
	if (receipt.generator !== 'generate-technical' || !Array.isArray(receipt.files))
		fail('Output is not owned by generate-technical');
	const actual = fs.readdirSync(output).sort();
	const expected = [...receipt.files.map((item) => item.path), 'publication-receipt.json'].sort();
	if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('Output has unowned or missing files');
	for (const item of receipt.files) {
		if (!/^[a-z-]+\.md$/.test(item.path)) fail('Invalid owned file path');
		const file = path.join(output, item.path);
		if (!fs.statSync(file).isFile() || fs.lstatSync(file).isSymbolicLink())
			fail('Owned output is not an ordinary file');
		const bytes = fs.readFileSync(file);
		if (bytes.length !== item.bytes || sha256(bytes) !== item.sha256) fail(`Owned output changed: ${item.path}`);
	}
	return true;
}

function assertUnlinkedPath(candidate, label) {
	const absolute = path.resolve(candidate);
	const parsed = path.parse(absolute);
	const segments = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
	let current = parsed.root;
	for (let index = -1; index < segments.length; index += 1) {
		if (index >= 0) current = path.join(current, segments[index]);
		const stat = fs.lstatSync(current, {throwIfNoEntry: false});
		if (!stat) return;
		if (stat.isSymbolicLink()) fail(`${label} must not traverse a symbolic link or junction: ${current}`);
		if (index < segments.length - 1 && !stat.isDirectory())
			fail(`${label} has a non-directory ancestor: ${current}`);
	}
}

function recoverInterruptedPublication(output) {
	const parent = path.dirname(output);
	if (!fs.existsSync(parent)) return;
	const prefix = `.${path.basename(output)}.technical-`;
	const escapedName = path.basename(output).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const pattern = new RegExp(
		`^\\.${escapedName}\\.technical-(stage|backup)-([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$`,
	);
	const candidates = fs
		.readdirSync(parent)
		.filter((name) => name.startsWith(prefix))
		.map((name) => {
			const match = pattern.exec(name);
			if (!match) fail(`Malformed reserved technical publication entry: ${name}`);
			return {kind: match[1], id: match[2], path: path.join(parent, name)};
		});
	if (!candidates.length) return;
	const stages = candidates.filter((item) => item.kind === 'stage');
	const backups = candidates.filter((item) => item.kind === 'backup');
	if (stages.length > 1 || backups.length > 1 || (fs.existsSync(output) && stages.length && backups.length))
		fail('Ambiguous interrupted technical publication');
	if (fs.existsSync(output)) ownedOutput(output);
	for (const item of candidates) {
		try {
			if (!ownedOutput(item.path)) fail('Transaction candidate is missing');
		} catch (error) {
			fail(`Cannot recover ${path.basename(item.path)}: ${error.message}`);
		}
	}
	if (!fs.existsSync(output)) {
		if (backups.length !== 1) fail('Cannot recover technical publication without one valid backup');
		if (stages.length && stages[0].id !== backups[0].id) fail('Technical stage and backup transaction IDs differ');
		fs.renameSync(backups[0].path, output);
		ownedOutput(output);
	}
	for (const item of candidates) if (fs.existsSync(item.path)) fs.rmSync(item.path, {recursive: true});
}

export function generateTechnical({contextPath, outputDirectory}) {
	const source = path.resolve(contextPath),
		output = path.resolve(outputDirectory);
	if (output === path.parse(output).root || source === output || source.startsWith(output + path.sep))
		fail('Unsafe output location');
	assertUnlinkedPath(source, 'Context');
	assertUnlinkedPath(output, 'Output');
	if (!fs.statSync(source).isFile()) fail('Context must be an ordinary file');
	const contextBytes = fs.readFileSync(source);
	if (contextBytes.length > 2 * 1024 * 1024) fail('Technical context exceeds byte limit');
	const context = JSON.parse(contextBytes.toString('utf8'));
	const pages = renderTechnical(context);
	const repository = findRepositoryForMarkdown(path.join(output, 'index.md')) ?? findRepositoryForMarkdown(source);
	if (repository)
		for (const [name, body] of pages)
			pages.set(name, formatRepositoryMarkdown(repository, path.join(output, name), body));
	const receipt = receiptFor(contextBytes, context, pages);
	const parent = path.dirname(output);
	fs.mkdirSync(parent, {recursive: true});
	recoverInterruptedPublication(output);
	ownedOutput(output);
	const nonce = crypto.randomUUID();
	const stage = path.join(parent, `.${path.basename(output)}.technical-stage-${nonce}`);
	const backup = path.join(parent, `.${path.basename(output)}.technical-backup-${nonce}`);
	let moved = false;
	try {
		fs.mkdirSync(stage);
		for (const [name, body] of pages) fs.writeFileSync(path.join(stage, name), body, {flag: 'wx'});
		fs.writeFileSync(path.join(stage, 'publication-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, {
			flag: 'wx',
		});
		if (fs.existsSync(output)) {
			fs.renameSync(output, backup);
			moved = true;
		}
		fs.renameSync(stage, output);
	} catch (error) {
		if (fs.existsSync(stage)) fs.rmSync(stage, {recursive: true});
		if (moved && !fs.existsSync(output)) fs.renameSync(backup, output);
		throw error;
	}
	if (moved) {
		try {
			fs.rmSync(backup, {recursive: true});
		} catch {
			/* A valid stale backup is recoverable on the next publication. */
		}
	}
	return receipt;
}

function parseArguments(args) {
	if (args.length !== 4 || args[0] !== '--context' || args[2] !== '--output' || !args[1] || !args[3])
		fail('Usage: generate-technical.mjs --context <context.json> --output <directory>');
	return {contextPath: args[1], outputDirectory: args[3]};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		console.log(JSON.stringify(generateTechnical(parseArguments(process.argv.slice(2)))));
	} catch (error) {
		console.error(`generate-technical: ${error.message}`);
		process.exitCode = 1;
	}
}
