import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {isAbsolute, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const RULE_ID = 'REACT-EVENT-001';

function walk(node, visit) {
	if (!node || typeof node !== 'object') return;
	if (typeof node.type === 'string' && visit(node) === false) return;
	for (const [key, value] of Object.entries(node)) {
		if (key === 'loc' || key === 'tokens' || key === 'comments') continue;
		if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
		else if (value && typeof value === 'object') walk(value, visit);
	}
}

function propertyName(node) {
	if (!node) return null;
	if (!node.computed && (node.key?.type === 'Identifier' || node.key?.type === 'JSXIdentifier')) {
		return node.key.name;
	}
	return node.key?.type === 'StringLiteral' ? node.key.value : null;
}

function isEvent(name) {
	return typeof name === 'string' && /^on[A-Z]/.test(name);
}

function isBindCall(node) {
	if (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression') return false;
	const callee = node.callee;
	if (callee?.type !== 'MemberExpression' && callee?.type !== 'OptionalMemberExpression') return false;
	return (
		(!callee.computed && callee.property?.name === 'bind') ||
		(callee.computed && callee.property?.type === 'StringLiteral' && callee.property.value === 'bind')
	);
}

/** Inspect syntax only: named handler references are allowed, including handlers bound outside JSX. */
export function checkSource(source, filename, parser) {
	const result = {file: filename, findings: [], errors: []};
	if (typeof parser?.parse !== 'function') {
		result.errors.push({
			file: filename,
			code: 'parser-unavailable',
			message: '@babel/parser is required from the target repository.',
		});
		return result;
	}
	let ast;
	try {
		ast = parser.parse(source, {sourceType: 'unambiguous', plugins: ['jsx', 'typescript']});
	} catch (error) {
		result.errors.push({
			file: filename,
			code: 'parse-error',
			message: error.message,
			line: error.loc?.line ?? null,
			column: error.loc ? error.loc.column + 1 : null,
		});
		return result;
	}
	const reported = new Set();
	function inspectHandler(value, event) {
		walk(value, (node) => {
			if (
				node.type !== 'ArrowFunctionExpression' &&
				node.type !== 'FunctionExpression' &&
				node.type !== 'ObjectMethod' &&
				!isBindCall(node)
			)
				return;
			const key = `${node.start}:${event}`;
			if (reported.has(key)) return false;
			reported.add(key);
			result.findings.push({
				ruleId: RULE_ID,
				file: filename,
				event,
				line: node.loc.start.line,
				column: node.loc.start.column + 1,
				message: `Inline event callback for ${event}; pass a named handler reference bound outside JSX.`,
			});
			// The handler is already a violation; callbacks inside its implementation are not additional event handlers.
			return false;
		});
	}
	function inspectObjectEvents(expression) {
		walk(expression, (node) => {
			if (node.type !== 'ObjectProperty' && node.type !== 'ObjectMethod') return;
			const name = propertyName(node);
			if (isEvent(name)) inspectHandler(node.type === 'ObjectMethod' ? node : node.value, name);
		});
	}
	walk(ast, (node) => {
		if (node.type === 'JSXAttribute') {
			const expression = node.value?.type === 'JSXExpressionContainer' ? node.value.expression : null;
			if (node.name?.type === 'JSXIdentifier' && isEvent(node.name.name)) {
				inspectHandler(expression, node.name.name);
			}
			// Includes nested slotProps/inputProps objects without treating ordinary render/map callbacks as events.
			inspectObjectEvents(expression);
		} else if (node.type === 'JSXSpreadAttribute') {
			inspectObjectEvents(node.argument);
		}
	});
	return result;
}

export function runCli(args) {
	const output = {ruleId: RULE_ID, status: 'incomplete', files: [], findings: [], errors: []};
	let repo;
	const paths = [];
	for (let index = 0; index < args.length; index += 1) {
		const flag = args[index];
		if ((flag !== '--repo' && flag !== '--path') || !args[index + 1] || args[index + 1].startsWith('--')) {
			output.errors.push({
				code: 'invalid-arguments',
				message:
					'Usage: react-event-check.mjs --repo <root> --path <relative-file> [--path <relative-file> ...]',
			});
			return output;
		}
		if (flag === '--repo') repo = resolve(args[++index]);
		else paths.push(args[++index]);
	}
	if (!repo || paths.length === 0) {
		output.errors.push({code: 'invalid-arguments', message: '--repo and at least one --path are required.'});
		return output;
	}
	let parser;
	try {
		parser = createRequire(resolve(repo, 'package.json'))('@babel/parser');
	} catch (error) {
		output.errors.push({
			code: 'parser-unavailable',
			message: `Cannot load @babel/parser from ${repo}: ${error.message}`,
		});
		return output;
	}
	for (const filename of [...new Set(paths)]) {
		const target = resolve(repo, filename);
		const fromRoot = relative(repo, target);
		if (
			isAbsolute(filename) ||
			!fromRoot ||
			fromRoot === '..' ||
			fromRoot.startsWith(`..${sep}`) ||
			isAbsolute(fromRoot)
		) {
			output.errors.push({
				file: filename,
				code: 'invalid-path',
				message: '--path must name a file inside --repo.',
			});
			continue;
		}
		try {
			const result = checkSource(readFileSync(target, 'utf8'), filename, parser);
			output.files.push(filename);
			output.findings.push(...result.findings);
			output.errors.push(...result.errors);
		} catch (error) {
			output.errors.push({file: filename, code: 'read-error', message: error.message});
		}
	}
	output.status = output.errors.length ? 'incomplete' : output.findings.length ? 'violations' : 'clean';
	return output;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const output = runCli(process.argv.slice(2));
	process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
	process.exitCode = output.status === 'clean' ? 0 : 1;
}
