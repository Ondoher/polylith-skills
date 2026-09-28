"""Analyze saved timing/size metadata only; never publish model reasoning or call arguments."""
import hashlib
import json
import statistics
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / '.codex-tmp/ux-collection-phase-20260928'
ATTEMPT = BASE / (sys.argv[1] if len(sys.argv) > 1 else 'attempt-01')

def read(file):
    return json.loads(file.read_text(encoding='utf-8'))

def rows(file):
    return [json.loads(line) for line in file.read_text(encoding='utf-8').splitlines() if line.strip()]

def stamp(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()

def union(intervals):
    merged = []
    for start, end in sorted(intervals):
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return sum(end-start for start, end in merged)

control = read(ATTEMPT / 'control.json')
assert control['status'] == 'finished', 'Preserve incomplete trial; do not report completed timings'
extractor = ROOT / '.codex-tmp/alexa-mcp-refinement-20260928-133745/collect-runtime.py'
subprocess.run([sys.executable, '-X', 'utf8', str(extractor), str(ATTEMPT)], check=True, capture_output=True, cwd=ROOT)
runtime = read(ATTEMPT / 'runtime-metrics.json')
actors = [thread for thread in runtime['threads'] if thread['role'] == 'ux-planner']
assert len(actors) == 1
actor = actors[0]
assert actor['model'] == 'gpt-6-astra' and actor['effort'] == 'ultra'
service = rows(ATTEMPT / 'service-observations.jsonl')
assert not any(item.get('isPlan') for item in service)
markers = {item['phase']: item for item in service if item.get('phase')}
turns = sorted([event for events in actor['turns'].values() for event in events], key=lambda item: item['at'])
starts = [event['at'] for event in turns if event['event'] == 'task_started']
ends = [event['at'] for event in turns if event['event'] == 'task_complete']
assert len(starts) == len(ends) == 1

def window(start, end):
    a, b = stamp(start), stamp(end)
    intervals = {'output': [], 'reasoning-item': [], 'tool': []}
    for item in actor['items']:
        if 'start' not in item:
            continue
        x, y = max(a, item['start']), min(b, item['end'])
        if x < y:
            intervals['reasoning-item' if item['kind'] == 'reasoning' else 'output'].append((x, y))
    calls = []
    for call in actor['calls']:
        if 'end' not in call:
            continue
        x, y = max(a, call['start']), min(b, call['end'])
        if x < y:
            intervals['tool'].append((x, y))
            calls.append(call)
    observed = {key: union(value) for key, value in intervals.items()}
    observed['unattributed'] = b-a-union([pair for value in intervals.values() for pair in value])
    responses = [item for item in actor['responses'] if a <= stamp(item['at']) <= b]
    return {'start': start, 'end': end, 'wallSeconds': b-a, 'observedSeconds': observed,
            'toolCallCount': len(calls), 'usageByResponsesCompletedInWindow': {
                key: sum(item['usage'].get(key, 0) for item in responses)
                for key in ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens']}}

phase = lambda name: markers[name]['endedAt']
windows = {
    'preparation': window(starts[0], ends[0]),
    'instructions': window(starts[0], phase('instructions-ready')),
    'inputLoading': window(phase('instructions-ready'), phase('inputs-ready')),
    'readyAcknowledgement': window(phase('inputs-ready'), ends[0]),
}
inputs = read(ATTEMPT / 'input-receipts.json')
baseline = read(ROOT / 'planning/refinement-efficiency/ux-mcp-replay-20260928-metrics.json')
coverage = {}
pages = []
for name, receipt in inputs.items():
    assert receipt['sha256'] == baseline['inputReceipts'][name]['sha256']
    observations = [item for item in service if item['method'] == 'read'
                    and item.get('handle') == receipt['handle'] and item['actor'] == 'assigned']
    cursor = 0
    for page in observations:
        assert page['offset'] == cursor and page['pointer'] == '' and not page['failed']
        assert page['maxBytes'] == 7000
        cursor += page['textBytes']
        pages.append({**page, 'source': name})
    assert cursor == receipt['bytes'] and observations[-1]['nextOffset'] is None
    coverage[name] = {'handle': receipt['handle'], 'sha256': receipt['sha256'], 'bytes': receipt['bytes'],
                      'pages': len(observations), 'complete': True,
                      'serverReadMs': sum(item['serviceMs'] for item in observations), 'observations': observations}

# Verify actual client-visible tool outputs, not just the server's transmission ledger.
received_pages = {}
truncation_warnings = 0
decoder = json.JSONDecoder()

def inspect_output(value, call_id):
    if isinstance(value, dict):
        if value.get('handle') in {item['handle'] for item in inputs.values()} and all(
                key in value for key in ['offset', 'nextOffset', 'totalBytes', 'text']):
            key = (call_id, value['handle'], value['offset'])
            if key in received_pages:
                assert received_pages[key] == value, 'Conflicting duplicate client page'
            received_pages[key] = value
            return
        for child in value.values():
            inspect_output(child, call_id)
    elif isinstance(value, list):
        for child in value:
            inspect_output(child, call_id)
    elif isinstance(value, str) and 'handle' in value:
        offset = 0
        while offset < len(value):
            start = value.find('{', offset)
            if start < 0:
                break
            try:
                decoded, end = decoder.raw_decode(value, start)
            except json.JSONDecodeError:
                offset = start + 1
            else:
                inspect_output(decoded, call_id)
                offset = end

for event in rows(Path(actor['sourceSession'])):
    payload = event.get('payload', {})
    if payload.get('type') not in ['custom_tool_call_output', 'function_call_output']:
        continue
    output = payload.get('output')
    serialized = json.dumps(output)
    truncation_warnings += int(any(text in serialized for text in
                                  ['Warning: truncated output', 'tokens truncated', 'Output truncated']))
    inspect_output(output, payload.get('call_id'))
client_coverage = {}
for name, receipt in inputs.items():
    observations = sorted((page for page in received_pages.values() if page['handle'] == receipt['handle']),
                          key=lambda page: page['offset'])
    cursor = 0
    for page in observations:
        assert page['offset'] == cursor, 'Missing or repeated client-visible page'
        cursor += len(page['text'].encode('utf-8'))
    text = ''.join(page['text'] for page in observations)
    assert cursor == receipt['bytes'] and hashlib.sha256(text.encode('utf-8')).hexdigest() == receipt['sha256']
    client_coverage[name] = {'complete': True, 'bytes': cursor, 'pages': len(observations), 'sha256': receipt['sha256']}
assert truncation_warnings == 0

items = {item['callId']: item for item in actor['items'] if item.get('callId')}
calls = sorted(actor['calls'], key=lambda item: item['start'])
commands = {}
for page in sorted(pages, key=lambda item: item['startedAt']):
    received = stamp(page['startedAt'])
    matched = [call for call in calls if call['start'] <= received <= call.get('end', call['start'])]
    assert len(matched) == 1
    call = matched[0]
    item = items[call['id']]
    assert 'start' in item
    previous = max((value for value in calls if value.get('end', float('inf')) <= item['start']), key=lambda value: value['end'])
    command = commands.setdefault(call['id'], {
        'callId': call['id'], 'argumentBytes': call['argumentBytes'],
        'commandOutputSeconds': item['end']-item['start'],
        'toolRoundTripSeconds': call['end']-call['start'],
        'previousResultToCommandStartSeconds': item['start']-previous['end'],
        'previousResultThroughThisResultSeconds': call['end']-previous['end'],
        'pages': [], 'serviceMs': 0,
    })
    command['pages'].append({'source': page['source'], 'offset': page['offset'], 'bytes': page['textBytes']})
    command['serviceMs'] += page['serviceMs']

def stats(key):
    values = sorted(item[key] for item in commands.values())
    return {'count': len(values), 'sum': sum(values), 'mean': statistics.mean(values),
            'median': statistics.median(values), 'minimum': values[0], 'maximum': values[-1]}

summary = {key: stats(key) for key in ['argumentBytes', 'commandOutputSeconds', 'toolRoundTripSeconds',
                                     'previousResultToCommandStartSeconds', 'previousResultThroughThisResultSeconds']}
comparison = {key: {'baselineMean': baseline['readCommandAnalysis']['summary'][key]['mean'],
                    'trialMean': value['mean']} for key, value in summary.items()}
report = {
    'experiment': 'Prescribed collection-only UX acquisition, same full inputs and bounded MCP reads',
    'capturedAt': datetime.now(timezone.utc).isoformat(), 'control': control,
    'windows': windows, 'coverage': coverage, 'clientCoverage': client_coverage,
    'truncationWarnings': truncation_warnings, 'phaseObservations': list(markers.values()),
    'readCommandAnalysis': {'readCount': len(pages), 'generatedCommandCount': len(commands),
                            'summary': summary, 'uniqueCommands': list(commands.values())},
    'comparison': comparison, 'baselineInputLoadingSeconds': baseline['windows']['inputLoading']['wallSeconds'],
    'serverRequests': read(ATTEMPT / 'server-metrics.json')['requests'], 'runtime': runtime,
    'tooling': {str(file.relative_to(ROOT)): hashlib.sha256(file.read_bytes()).hexdigest() for file in
                [Path(__file__), Path(__file__).with_name('run.mjs'), Path(__file__).with_name('assignment.md'), extractor,
                 ROOT / '.codex-tmp/ux-mcp-replay-20260928/server-observer.mjs']},
    'limits': ['One fresh collection-only trial against a historical run, not a repeated or randomized A/B.',
               'Prompt differs intentionally; the prior run already deferred explicit comparison, but less strictly prescribed acquisition.',
               'The 7KB cap, full source values, model and reasoning effort are unchanged; batching compliance is reported, not assumed.',
               'Client streams are observed intervals, not provider compute time. Pre-command gaps cannot isolate input processing or scheduling.',
               'No subsequent design comparison or independent review was performed; retention and design quality are unmeasured.',
               'Cached input and reasoning output counts are subsets, not extra usage to add. Overlapping windows must not be summed.'],
}
destination = ROOT / 'planning/refinement-efficiency/ux-collection-phase-20260928-metrics.json'
destination.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
(ATTEMPT / 'analysis.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'windows': {key: value['wallSeconds'] for key, value in windows.items()},
                  'readCount': len(pages), 'commandCount': len(commands), 'comparison': comparison,
                  'coverage': {key: value['complete'] for key, value in coverage.items()}}))
