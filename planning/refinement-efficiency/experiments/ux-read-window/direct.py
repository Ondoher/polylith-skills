"""Verify native MCP delivery and response grouping without publishing product data."""
import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
name = sys.argv[1] if len(sys.argv) > 1 else 'native-direct-namespace-01'
assert name and all(character.isalnum() or character in '-_' for character in name)
attempt = ROOT / '.codex-tmp/ux-read-window-20260928' / name
read = lambda file: json.loads(file.read_text(encoding='utf-8'))
rows = lambda file: [json.loads(line) for line in file.read_text(encoding='utf-8').splitlines() if line.strip()]
stamp = lambda value: datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
control = read(attempt / 'control.json')
reported_result = (attempt / 'result.md').read_text(encoding='utf-8').strip()
incomplete = control['exitCode'] == 0 and reported_result.startswith('NATIVE_NOT_COMPLETED:')
assert control['nativeProbe'] and (control['status'] == 'finished' or incomplete)
assert control['directNamespace'] == 'mcp__polylith_workflows'
runtime = read(attempt / 'runtime-metrics.json')
assert len(runtime['threads']) == 1
actor = runtime['threads'][0]
assert actor['model'] == 'gpt-6-astra' and actor['effort'] == 'xhigh'
inputs = read(attempt / 'input-receipts.json')
handles = {receipt['handle']: source for source, receipt in inputs.items()}
events = rows(Path(actor['sourceSession']))
calls = [event['payload'] for event in events if event.get('payload', {}).get('type') in ['function_call', 'custom_tool_call']]
assert calls and all(call['type'] == 'function_call' for call in calls)
if incomplete:
    assert len(calls) <= 2 and all(call['name'] == 'workflow_read' for call in calls)
else:
    assert [call['name'] for call in calls] == ['workflow_read', 'workflow_read', 'workflow_store']
read_calls = [call for call in calls if call['name'] == 'workflow_read']
assert all(call['namespace'] == control['directNamespace'] for call in calls)
outputs = {event['payload']['call_id']: event['payload']['output'] for event in events if event.get('payload', {}).get('type') == 'function_call_output'}
items = {item['callId']: item for item in actor['items'] if item.get('callId')}
timings = {call['id']: call for call in actor['calls']}
observations = [row for row in rows(attempt / 'service-observations.jsonl') if row['method'] == 'read' and row['actor'] == 'assigned']
assert len(observations) == len(read_calls)


def find_pages(value):
    if isinstance(value, dict):
        if value.get('handle') in handles and all(key in value for key in ['offset', 'nextOffset', 'totalBytes', 'text']):
            yield value
        else:
            for child in value.values():
                yield from find_pages(child)
    elif isinstance(value, list):
        for child in value:
            yield from find_pages(child)
    elif isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return
        yield from find_pages(parsed)


results = []
for call in read_calls:
    call_id = call['call_id']
    arguments = json.loads(call['arguments'])
    timing = timings[call_id]
    item = items[call_id]
    output = outputs[call_id]
    # MCP may repeat a value in content and structuredContent; both must agree.
    pages = list(find_pages(output))
    assert pages and all(page == pages[0] for page in pages)
    page = pages[0]
    assert page['handle'] == arguments['handle'] and page['offset'] == arguments['offset'] == 0
    assert arguments['maxBytes'] == page['nextOffset'] == 28000
    source = handles[page['handle']]
    expected = Path(inputs[source]['path']).read_bytes()[:28000]
    assert page['text'].encode('utf-8') == expected
    assert not any(marker in json.dumps(output) for marker in ['Warning: truncated output', 'tokens truncated', 'Output truncated'])
    server = [row for row in observations if row['handle'] == page['handle']]
    assert len(server) == 1 and timing['start'] <= stamp(server[0]['startedAt']) <= timing['end']
    # A call item completes before its enclosing response.completed event.
    response = next(row for row in actor['responses'] if stamp(row['at']) >= item['end'])
    results.append({'source': source, 'callId': call_id, 'responseId': response['id'], 'nativeFunctionCall': True, 'argumentBytes': timing['argumentBytes'], 'textBytes': len(expected), 'clientLoggedOutputBytes': timing['outputBytes'], 'byteExact': True, 'sha256': hashlib.sha256(expected).hexdigest(), 'commandGenerationSeconds': item['end']-item['start'], 'toolRoundTripSeconds': timing['end']-timing['start'], 'serverMs': server[0]['serviceMs']})

two_reads = len(read_calls) == 2
first = timings[read_calls[0]['call_id']]
second = timings[read_calls[1]['call_id']] if two_reads else None
second_item = items[second['id']] if two_reads else None
same_response = two_reads and results[0]['responseId'] == results[1]['responseId']
before_result = second_item['end'] <= first['end'] if two_reads else None
completion_marker = control.get('lastPhase') == 'inputs-ready'
report = {
    'experiment': 'Native MCP namespace exposure and independent result verification',
    'control': control,
    'inputHashes': {source: receipt['sha256'] for source, receipt in inputs.items()},
    'results': results,
    'outcome': 'native-incomplete' if incomplete else 'completed',
    'reportedResult': reported_result,
    'nativeReadCount': len(read_calls),
    'completionMarkerStored': completion_marker,
    'nativeExposureVerified': True,
    'singleResponseReadGroup': same_response,
    'bothCallsPreparedBeforeFirstResult': before_result,
    'targetMet': same_response and completion_marker,
    'toolIntervalsOverlap': max(first['start'], second['start']) < min(first['end'], second['end']) if two_reads else None,
    'betweenReads': {'preCommandGapSeconds': second_item['start']-first['end'], 'commandGenerationSeconds': second_item['end']-second_item['start'], 'toolRoundTripSeconds': second['end']-second['start'], 'wholeCycleSeconds': second['end']-first['end']} if two_reads else None,
    'groupingMethod': 'Pair completed function-call items with the next response.completed event. A shared model response establishes generation without an intervening model-response cycle. A shared Codex turn ID is insufficient. Early tool completion can overlap continued generation within the same response; before-result timing and execution overlap are separate observations, not batch-success requirements.',
    'runtime': runtime,
    'officialReference': 'https://learn.chatgpt.com/docs/config-file/config-reference',
    'tooling': {str(file.relative_to(ROOT)): hashlib.sha256(file.read_bytes()).hexdigest() for file in [Path(__file__), Path(__file__).with_name('native-assignment.md'), Path(__file__).parent.parent / 'ux-collection-phase/run.mjs']},
    'limits': ['At most two first pages; not a full acquisition or UX reasoning run.', 'Both native reads were generated in one model response.' if same_response else 'The two-read sequence was incomplete.' if not two_reads else 'The native reads were generated in separate model responses.', 'A fast first tool can finish while the model is still emitting a second call in the same response. Completion order does not imply intervening interpretation.', 'This live transcript does not itself capture the outgoing parallel-call flag; any request-construction capture is separate evidence.', 'The native tool path differs from the combined-wrapper path. This run does not establish an end-to-end UX speedup or a universal return-size ceiling.', 'No global configuration, model selection, client output budget or live Alexa state was changed. Any temporary model-catalog override is identified in control metadata.'],
}
destination = ROOT / ('planning/refinement-efficiency/ux-native-mcp-20260928-' + name + '-metrics.json')
assert not destination.exists(), 'Preserve existing experiment evidence'
destination.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(json.dumps({key: report[key] for key in ['outcome', 'nativeReadCount', 'completionMarkerStored', 'nativeExposureVerified', 'singleResponseReadGroup', 'bothCallsPreparedBeforeFirstResult', 'targetMet', 'results', 'betweenReads']}, indent=2))
