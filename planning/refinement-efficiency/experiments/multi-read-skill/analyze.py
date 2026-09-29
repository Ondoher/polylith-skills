"""Verify one bounded collection trial and retain only metadata in its report."""
import collections
import hashlib
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
name = sys.argv[1]
assert name and all(c.isalnum() or c == '-' for c in name)
attempt = ROOT / '.codex-tmp/multi-read-skill-20260929' / name
read = lambda file: json.loads(file.read_text(encoding='utf-8'))
rows = lambda file: [json.loads(line) for line in file.read_text(encoding='utf-8').splitlines() if line.strip()]
stamp = lambda value: datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
control = read(attempt / 'control.json')
assert control['status'] in ['finished', 'collection-incomplete', 'error'] and control['liveUnchanged']
assert control['clientPhases'][-1]['name'] == 'collect' and control['clientPhases'][-1]['exitCode'] == 0
subprocess.run([sys.executable, '-X', 'utf8', str(ROOT / '.codex-tmp/alexa-mcp-refinement-20260928-133745/collect-runtime.py'), str(attempt)],
               cwd=ROOT, check=True, capture_output=True)
runtime = read(attempt / 'runtime-metrics.json')
assert len(runtime['threads']) == 1
actor = runtime['threads'][0]
assert actor['model'] == control['model']
wire = read(attempt / 'live-request-metadata.json')
assert wire['resourcesClosed'] and not wire['errors']
assert not wire['requestBodiesModified'] and not wire['credentialsPersisted']
plan = read(attempt / 'input-read-plan.json')
inputs = read(attempt / 'input-receipts.json')
collection = next(phase for phase in control['clientPhases'] if phase['name'] == 'collect')
start, end = stamp(collection['startedAt']), stamp(collection['completedAt'])
events = [event for event in rows(Path(actor['sourceSession'])) if start <= stamp(event['timestamp']) <= end]
calls = [event['payload'] for event in events if event.get('payload', {}).get('type') in ['function_call', 'custom_tool_call']]
outputs = {event['payload']['call_id']: event['payload']['output'] for event in events
           if event.get('payload', {}).get('type') in ['function_call_output', 'custom_tool_call_output']}
wire_calls = {item['callId']: item for item in wire['responses'] if item.get('callId')}
timings = {call['id']: call for call in actor['calls']}
stream_items = {item['callId']: item for item in actor['items'] if item.get('callId')}
reads = [call for call in calls if call['name'] == 'workflow_read']
groups = collections.Counter()
verified = []
seen = collections.Counter()


def pages(value):
    if isinstance(value, dict):
        if all(key in value for key in ['handle', 'offset', 'nextOffset', 'totalBytes', 'text']):
            yield value
        else:
            for child in value.values():
                yield from pages(child)
    elif isinstance(value, list):
        for child in value:
            yield from pages(child)
    elif isinstance(value, str):
        try:
            yield from pages(json.loads(value))
        except json.JSONDecodeError:
            pass


for call in reads:
    args = json.loads(call['arguments'])
    key = (args['handle'], args.get('offset', 0), args.get('maxBytes'))
    expected = next((page for page in plan if key == (page['handle'], page['offset'], page['maxBytes'])), None)
    assert expected, 'Read outside supplied manifest'
    returned = list(pages(outputs[call['call_id']]))
    assert returned and all(page == returned[0] for page in returned)
    page = returned[0]
    actual = page['text'].encode('utf-8')
    raw = Path(inputs[expected['source']]['path']).read_bytes()
    exact = actual == raw[expected['offset']:expected['end']]
    assert exact and hashlib.sha256(actual).hexdigest() == expected['sha256']
    assert page['offset'] == expected['offset'] and (page['nextOffset'] or page['totalBytes']) == expected['end']
    observed = wire_calls[call['call_id']]
    groups[observed['responseId']] += 1
    seen[key] += 1
    timing = timings[call['call_id']]
    stream = stream_items.get(call['call_id'], {})
    verified.append({'callId': call['call_id'], 'source': expected['source'], 'offset': expected['offset'],
                     'bytes': len(actual), 'sha256': expected['sha256'], 'byteExact': exact,
                     'responseId': observed['responseId'], 'argumentBytes': timing['argumentBytes'],
                     'toolSeconds': timing.get('end', timing['start']) - timing['start'],
                     'toolStart': timing['start'], 'toolEnd': timing.get('end'),
                     'outputItemStart': stream.get('start'), 'outputItemEnd': stream.get('end')})
for item in verified:
    item['commandStreamSeconds'] = (item['outputItemEnd'] - item['outputItemStart']
                                     if groups[item['responseId']] == 1 and item['outputItemStart'] is not None else None)
assert len(plan) == 8
duplicates = sum(count - 1 for count in seen.values())
native = all(call.get('namespace') == 'mcp__polylith_workflows' for call in reads)
selected_requests = [request for request in wire['requests'] if request.get('generate') is not False
                     and request.get('model') == control['model'] and start <= stamp(request['at']) <= end]
flags = collections.Counter(str(request.get('parallelToolCalls')) for request in selected_requests)
assert flags and set(flags) == {'True'}
skill_reads = []
for call in calls:
    arguments = call.get('arguments', call.get('input', '')).replace('\\\\', '/').replace('\\', '/')
    if 'multi-read/SKILL.md' not in arguments:
        continue
    timing = timings[call['call_id']]
    stream = stream_items.get(call['call_id'], {})
    skill_reads.append({'callId': call['call_id'], 'name': call['name'], 'argumentBytes': timing['argumentBytes'],
                        'outputBytes': timing.get('outputBytes'), 'toolStart': timing['start'], 'toolEnd': timing.get('end'),
                        'toolSeconds': timing.get('end', timing['start']) - timing['start'],
                        'commandStreamSeconds': stream['end'] - stream['start'] if 'start' in stream else None})
skill_text = Path(control['skillFile']).read_text(encoding='utf-8').strip().replace('\r\n', '\n')
for item in skill_reads:
    output = outputs.get(item['callId'], '')
    item['completeContractObserved'] = isinstance(output, str) and skill_text in output.replace('\r\n', '\n')
first_read = min((item['toolStart'] for item in verified), default=None)
last_read = max((item['toolEnd'] for item in verified), default=None)
other_calls = [call['name'] for call in calls if call['name'] not in ['workflow_read', 'workflow_store']
               and call['call_id'] not in {item['callId'] for item in skill_reads}]
markers = [item for item in rows(attempt / 'service-observations.jsonl') if item.get('phase')]
ready = next((item for item in markers if item['phase'] == 'inputs-ready'), None)
responses = [response for response in actor['responses'] if start <= stamp(response['at']) <= end]
usage = collections.Counter()
for response in responses:
    usage.update(response['usage'])
same_response = len(groups) == 1 and len(reads) == 8
report = {
    'attempt': name, 'condition': control['condition'], 'control': control,
    'collection': {
        'passed': same_response and native and not duplicates and not other_calls and ready is not None,
        'eightReadsOneResponse': same_response, 'native': native, 'duplicateReads': duplicates,
        'deliveredPages': len(seen), 'missingPages': len(plan) - len(seen),
        'allDeliveredPagesByteExact': True, 'readGroups': dict(groups), 'maxReadsPerResponse': max(groups.values(), default=0),
        'recordedEffort': actor['effort'], 'wireEfforts': dict(collections.Counter(request.get('reasoningEffort') for request in selected_requests)),
        'selectedModelParallelFlags': dict(flags), 'otherCalls': other_calls,
        'clientSecondsIncludingLoading': (end - start),
        'dispatchToFirstReadExecutionSeconds': first_read - start if first_read is not None else None,
        'firstReadExecutionThroughLastReadReturnSeconds': last_read - first_read if first_read is not None else None,
        'dispatchToCompletionMarkerSeconds': stamp(ready['endedAt']) - start if ready else None,
        'generationRequests': len(selected_requests), 'modelResponsesWithUsage': len(responses),
        'toolCalls': len(calls), 'usage': dict(usage), 'skillReads': skill_reads,
        'loadingThroughFirstReadSeconds': first_read - start if skill_reads and first_read is not None else None,
        'reads': verified,
    },
    'phaseMarkers': [{key: marker[key] for key in ['phase', 'startedAt', 'endedAt', 'serviceMs']} for marker in markers],
    'preparationSeconds': next(phase for phase in control['clientPhases'] if phase['name'] == 'prepare')['elapsedMs'] / 1000,
    'preparationBoundedReadCalls': sum(call['boundedRead'] and call['start'] < start for call in actor['calls']),
    'runtimeActivity': {key: actor[key] for key in ['windowSeconds', 'activeTurnSeconds', 'activeSeconds', 'activeUnattributedSeconds']},
    'service': {'calls': len(rows(attempt / 'service-observations.jsonl')),
                'assignedReadMs': sum(item['serviceMs'] for item in rows(attempt / 'service-observations.jsonl')
                                      if item['method'] == 'read' and item['actor'] == 'assigned')},
    'limits': ['One eight-page wave, not full product acquisition or UX authoring.',
               'Same role and required guidance, but independently generated preparation histories can differ.',
               'Time to first read includes client startup, model processing and command generation; it is not pure skill-loading time.',
               'Coalesced batch item timestamps do not reliably measure individual command-generation intervals.'],
    'evidence': {file: {'path': str(attempt / file), 'sha256': hashlib.sha256((attempt / file).read_bytes()).hexdigest()}
                 for file in ['control.json', 'runtime-metrics.json', 'input-read-plan.json', 'live-request-metadata.json', 'service-observations.jsonl']},
}
(attempt / 'analysis.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: value for key, value in report['collection'].items() if key not in ['reads', 'usage']}))
