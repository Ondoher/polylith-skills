"""Verify actual client-visible probe pages without publishing inputs or model reasoning."""
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
attempt = ROOT / '.codex-tmp/ux-read-window-20260928' / (sys.argv[1] if len(sys.argv) > 1 else 'probe-01')
read = lambda file: json.loads(file.read_text(encoding='utf-8'))
rows = lambda file: [json.loads(line) for line in file.read_text(encoding='utf-8').splitlines() if line.strip()]
stamp = lambda value: datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
control = read(attempt / 'control.json')
assert control['status'] == 'finished' and control['probe']
extractor = ROOT / '.codex-tmp/alexa-mcp-refinement-20260928-133745/collect-runtime.py'
subprocess.run([sys.executable, '-X', 'utf8', str(extractor), str(attempt)], check=True, capture_output=True, cwd=ROOT)
runtime = read(attempt / 'runtime-metrics.json')
inputs = read(attempt / 'input-receipts.json')
handles = {receipt['handle']: name for name, receipt in inputs.items()}
received = {}
output_metadata = {}
budget_overrides = []
command_metadata = {}
decoder = json.JSONDecoder()

def inspect(value, call_id):
    if isinstance(value, dict):
        if value.get('handle') in handles and all(key in value for key in ['offset', 'nextOffset', 'totalBytes', 'text']):
            received[(call_id, value['handle'], value['offset'])] = value
            return
        for child in value.values(): inspect(child, call_id)
    elif isinstance(value, list):
        for child in value: inspect(child, call_id)
    elif isinstance(value, str) and 'handle' in value:
        offset = 0
        while offset < len(value):
            start = value.find('{', offset)
            if start < 0: break
            try: decoded, end = decoder.raw_decode(value, start)
            except json.JSONDecodeError: offset = start + 1
            else:
                inspect(decoded, call_id)
                offset = end

calls = []
items = {}
for actor in runtime['threads']:
    calls.extend(actor['calls'])
    items.update({item['callId']: item for item in actor['items'] if item.get('callId')})
    for event in rows(Path(actor['sourceSession'])):
        payload = event.get('payload', {})
        if payload.get('type') in ['custom_tool_call', 'function_call']:
            arguments = payload.get('input', payload.get('arguments', ''))
            budget_overrides.extend(re.findall(r'"?(?:max_output_tokens|max_tokens)"?\s*:\s*(\d+)', str(arguments)))
            label = re.search(r'// CASE: ([a-z0-9-]+)', str(arguments))
            if label:
                command_metadata[payload['call_id']] = {'case': label.group(1), 'usesPromiseConcurrency': 'Promise.all' in str(arguments)}
        if payload.get('type') not in ['custom_tool_call_output', 'function_call_output']: continue
        output = payload.get('output')
        serialized = json.dumps(output)
        call_id = payload.get('call_id')
        output_metadata[call_id] = {'serializedBytes': len(serialized.encode('utf-8')), 'truncationWarning': any(word in serialized for word in ['Warning: truncated output', 'tokens truncated', 'Output truncated'])}
        inspect(output, call_id)

results = []
commands = {}
for page in rows(attempt / 'service-observations.jsonl'):
    if page['method'] != 'read' or page['actor'] != 'assigned': continue
    at = stamp(page['startedAt'])
    candidates = [call for call in calls if call['start'] <= at <= call.get('end', call['start'])]
    assert len(candidates) == 1
    call = candidates[0]
    item = items[call['id']]
    visible = received.get((call['id'], page['handle'], page['offset']))
    source = handles[page['handle']]
    expected = Path(inputs[source]['path']).read_bytes()[page['offset']:page['offset']+page['textBytes']]
    complete = visible is not None and visible['text'].encode('utf-8') == expected
    results.append({'source': source, 'requestedBytes': page['maxBytes'], 'serverTextBytes': page['textBytes'], 'completeClientPage': complete, 'sha256': hashlib.sha256(expected).hexdigest(), 'client': output_metadata.get(call['id']), 'commandOutputSeconds': item['end']-item['start'], 'toolRoundTripSeconds': call['end']-call['start'], 'serverMs': page['serviceMs'], 'callId': call['id'], **command_metadata.get(call['id'], {})})
    if call['id'] not in commands:
        previous = max((value for value in calls if value.get('end', float('inf')) <= item['start']), key=lambda value: value['end'], default=None)
        commands[call['id']] = {'callId': call['id'], **command_metadata.get(call['id'], {}), 'argumentBytes': call['argumentBytes'], 'commandOutputSeconds': item['end']-item['start'], 'toolRoundTripSeconds': call['end']-call['start'], 'preCommandGapSeconds': item['start']-previous['end'] if previous else None, 'wholeCycleSeconds': call['end']-previous['end'] if previous else None, 'pages': [], 'serverStarts': []}
    commands[call['id']]['pages'].append({'source': source, 'requestedBytes': page['maxBytes'], 'completeClientPage': complete})
    commands[call['id']]['serverStarts'].append(page['startedAt'])

parallel = control.get('parallelProbe', False)
assert len(results) == (14 if parallel else 8)
pair_timings = []
if parallel:
    assert len(commands) == 9
    expected_labels = ['separate-r1-facts', 'separate-r1-ux', 'parallel-r1', 'serial-r1', 'serial-r2', 'parallel-r2', 'separate-r2-facts', 'separate-r2-ux', 'parallel-28k']
    assert [command['case'] for command in commands.values()] == expected_labels
    for command in commands.values():
        assert command['usesPromiseConcurrency'] == command['case'].startswith('parallel')
        assert len(command['pages']) == (1 if command['case'].startswith('separate') else 2)
    assert all(result['completeClientPage'] for result in results if result['requestedBytes'] == 14000)
    assert not budget_overrides, 'Client output budget must remain at its default'
    for label in ['separate-r1', 'parallel-r1', 'serial-r1', 'serial-r2', 'parallel-r2', 'separate-r2', 'parallel-28k']:
        selected = [value for value in commands.values() if value['case'] == label or value['case'].startswith(label+'-')]
        pair_timings.append({'case': label, 'generatedCommands': len(selected), 'requestedContentBytes': sum(page['requestedBytes'] for value in selected for page in value['pages']), 'allClientPagesExact': all(page['completeClientPage'] for value in selected for page in value['pages']), **{key: sum(value[key] for value in selected) for key in ['argumentBytes', 'commandOutputSeconds', 'toolRoundTripSeconds', 'preCommandGapSeconds', 'wholeCycleSeconds']}})
report = {'experiment': 'Parallel and serial paired MCP delivery, unchanged output allowance' if parallel else 'Actual Codex-client first-page size probes, unchanged output allowance', 'control': control, 'inputHashes': {key: value['sha256'] for key, value in inputs.items()}, 'results': results, 'commands': list(commands.values()), 'pairTimings': pair_timings, 'explicitOutputBudgetValues': budget_overrides, 'runtime': runtime, 'limits': ['Two real first pages at each size; not all possible data shapes or client configurations.', 'Byte-exact client log verification establishes delivered text, not later reasoning retention or design quality.', 'Paired timing comparisons have two repetitions in one client session; no significance or causal guarantee is inferred.']}
destination = ROOT / ('planning/refinement-efficiency/ux-read-window-20260928-' + attempt.name + '.json')
destination.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'results': [{key: value for key, value in result.items() if key not in ['sha256', 'callId']} for result in results], 'pairTimings': pair_timings, 'explicitOutputBudgetValues': budget_overrides}))
