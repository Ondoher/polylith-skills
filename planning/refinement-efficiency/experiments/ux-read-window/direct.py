"""Verify native MCP delivery and response grouping without publishing product data."""
import hashlib
import json
import sys
from collections import Counter
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
requested = control.get('nativeReadRequests') or [
    {'source': source, 'offset': 0, 'maxBytes': 28000} for source in ['facts', 'ux']
]
request_keys = {(item['source'], item['offset'], item['maxBytes']) for item in requested}
assert len(request_keys) == len(requested) and len(requested) in [2, 4, 8]
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
    assert len(calls) <= len(requested) and all(call['name'] == 'workflow_read' for call in calls)
else:
    assert [call['name'] for call in calls] == ['workflow_read'] * len(requested) + ['workflow_store']
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
delivered = set()
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
    assert page['handle'] == arguments['handle'] and page['offset'] == arguments['offset']
    assert arguments['maxBytes'] == page['nextOffset'] - page['offset'] == 28000
    source = handles[page['handle']]
    key = (source, page['offset'], arguments['maxBytes'])
    assert key in request_keys and key not in delivered
    delivered.add(key)
    expected = Path(inputs[source]['path']).read_bytes()[page['offset']:page['nextOffset']]
    assert page['text'].encode('utf-8') == expected
    assert not any(marker in json.dumps(output) for marker in ['Warning: truncated output', 'tokens truncated', 'Output truncated'])
    server = [row for row in observations if row['handle'] == page['handle']
              and row['offset'] == page['offset'] and row['maxBytes'] == arguments['maxBytes']
              and row.get('pointer', '') == arguments.get('pointer', '')
              and timing['start'] <= stamp(row['startedAt']) <= timing['end']]
    assert len(server) == 1 and timing['start'] <= stamp(server[0]['startedAt']) <= timing['end']
    # A call item completes before its enclosing response.completed event.
    response = next(row for row in actor['responses'] if stamp(row['at']) >= item['end'])
    results.append({'source': source, 'offset': page['offset'], 'callId': call_id, 'responseId': response['id'], 'nativeFunctionCall': True, 'argumentBytes': timing['argumentBytes'], 'textBytes': len(expected), 'clientLoggedOutputBytes': timing['outputBytes'], 'byteExact': True, 'sha256': hashlib.sha256(expected).hexdigest(), 'commandGenerationSeconds': item['end']-item['start'], 'toolRoundTripSeconds': timing['end']-timing['start'], 'serverMs': server[0]['serviceMs']})

all_requested_reads = delivered == request_keys
assert incomplete or all_requested_reads
groups = Counter(result['responseId'] for result in results)
any_batch = any(count > 1 for count in groups.values())
for result in results:
    if groups[result['responseId']] > 1:
        # Codex may materialize batched call items together, with sub-ms timestamp
        # skew. Those boundaries cannot measure per-command model generation.
        result['clientItemIntervalSeconds'] = result['commandGenerationSeconds']
        result['commandGenerationSeconds'] = None
two_reads = len(read_calls) >= 2
first = timings[read_calls[0]['call_id']]
second = timings[read_calls[1]['call_id']] if two_reads else None
second_item = items[second['id']] if two_reads else None
same_response = all_requested_reads and len(groups) == 1
before_result = second_item['end'] <= first['end'] if two_reads else None
completion_marker = control.get('lastPhase') == 'inputs-ready'
live_evidence = None
if control.get('observeLiveRequest'):
    metadata_path = attempt / 'live-request-metadata.json'
    metadata = read(metadata_path)
    assert metadata['resourcesClosed'] and not metadata['errors']
    assert not metadata['credentialsPersisted'] and not metadata['requestBodiesModified']
    assert metadata['connections'] and all(row['httpStatus'] == 101 for row in metadata['connections'])
    generation_requests = [row for row in metadata['requests'] if row['generate'] is not False]
    assert len(generation_requests) == len(actor['responses'])
    inventory = generation_requests[0]['tools']
    assert not any(tool['name'] in ['exec', 'wait'] for tool in inventory)
    workflow = next(tool for tool in inventory if tool['name'] == control['directNamespace'])
    assert any(tool['name'] == 'workflow_read' and tool['type'] == 'function' for tool in workflow['tools'])
    assert all(row['model'] == actor['model'] and row['reasoningEffort'] == actor['effort']
               and row['parallelToolCalls'] is True and row['tools'] == inventory for row in generation_requests)
    completed = [row for row in metadata['responses'] if row['type'] == 'response.completed'
                 and row['responseId'] in {response['id'] for response in actor['responses']}]
    assert len(completed) == len(actor['responses'])
    assert all(row['parallelToolCalls'] is True and row['model'] == actor['model'] for row in completed)
    # completed.output is empty on this route; streamed item identities carry the calls.
    wire_calls = [row for row in metadata['responses'] if row['type'] == 'response.output_item.done'
                  and row['itemType'] == 'function_call']
    assert len(wire_calls) == len(calls)
    assert {row['callId'] for row in wire_calls} == {call['call_id'] for call in calls}
    for result in results:
        wire = next(row for row in wire_calls if row['callId'] == result['callId'])
        assert wire['responseId'] == result['responseId']
        assert wire['name'] == 'workflow_read' and wire['namespace'] == control['directNamespace']
    live_evidence = {
        'sourceSha256': hashlib.sha256(metadata_path.read_bytes()).hexdigest(),
        'upstream': metadata['upstream'],
        'generationRequestCount': len(generation_requests),
        'allGenerationRequestsPermitParallelCalls': True,
        'allCompletedGenerationResponsesEchoParallelCalls': True,
        'codeWrapperAbsent': True,
        'wireCallGroupingMatchesClientRuntime': True,
        'toolInventory': inventory,
        'requests': [{key: value for key, value in row.items() if key != 'tools'} for row in metadata['requests']],
        'responses': metadata['responses'],
        'connections': metadata['connections'],
        'observationMs': metadata['observationMs'],
        'resourcesClosed': metadata['resourcesClosed'],
        'errors': metadata['errors'],
        'credentialsPersisted': metadata['credentialsPersisted'],
        'requestBodiesModified': metadata['requestBodiesModified'],
        'limits': 'Observation time measures parsing, projection and metadata writes, not total proxy transport overhead. Echoing the flag does not establish backend enforcement. Prewarm requests with generate:false are excluded from generation counts.',
    }
transitions = []
for previous_call, next_call in zip(read_calls, read_calls[1:]):
    previous = timings[previous_call['call_id']]
    following = timings[next_call['call_id']]
    following_item = items[following['id']]
    result = next(row for row in results if row['callId'] == following['id'])
    prior_result = next(row for row in results if row['callId'] == previous['id'])
    shared = result['responseId'] == prior_result['responseId']
    transitions.append({'fromCallId': previous['id'], 'toCallId': following['id'], 'sharedModelResponse': shared, 'preCommandGapSeconds': None if shared else following_item['start']-previous['end'], 'commandGenerationSeconds': result['commandGenerationSeconds'], 'toolRoundTripSeconds': following['end']-following['start'], 'wholeCycleSeconds': None if shared else following['end']-previous['end'], 'signedStartAfterPreviousResultSeconds': following_item['start']-previous['end']})
report = {
    'experiment': 'Native MCP namespace exposure and independent result verification',
    'control': control,
    'inputHashes': {source: receipt['sha256'] for source, receipt in inputs.items()},
    'results': results,
    'outcome': 'native-incomplete' if incomplete else 'completed',
    'reportedResult': reported_result,
    'nativeReadCount': len(read_calls),
    'requestedReadCount': len(requested),
    'allRequestedReadsVerified': all_requested_reads,
    'readResponseGroups': dict(groups),
    'maxReadsPerResponse': max(groups.values()),
    'anyReadBatch': any_batch,
    'readTransitions': transitions,
    'completionMarkerStored': completion_marker,
    'nativeExposureVerified': True,
    'singleResponseReadGroup': same_response,
    'bothCallsPreparedBeforeFirstResult': before_result,
    'targetMet': any_batch and all_requested_reads and completion_marker,
    'toolIntervalsOverlap': max(first['start'], second['start']) < min(first['end'], second['end']) if two_reads else None,
    'betweenReads': transitions[0] if transitions else None,
    'timingQualification': 'For shared model responses, per-command generation and sequential gap/cycle metrics are unavailable. Codex may materialize these items together; signed item intervals are preserved as observations, not model-generation durations.',
    'groupingMethod': 'Pair completed function-call items with the next response.completed event. A shared model response establishes generation without an intervening model-response cycle. A shared Codex turn ID is insufficient. Early tool completion can overlap continued generation within the same response; before-result timing and execution overlap are separate observations, not batch-success requirements.',
    'runtime': runtime,
    'liveRequestEvidence': live_evidence,
    'officialReference': 'https://learn.chatgpt.com/docs/config-file/config-reference',
    'tooling': {str(file.relative_to(ROOT)): hashlib.sha256(file.read_bytes()).hexdigest() for file in [Path(__file__), Path(__file__).with_name('native-assignment.md'), Path(__file__).parent.parent / 'ux-collection-phase/run.mjs']},
    'limits': [f'At most {len(requested)} predetermined pages; not a full acquisition or UX reasoning run.', 'All native reads were generated in one model response.' if same_response else 'Some reads shared a model response.' if any_batch else 'No model response contained multiple reads.', 'The requested sequence was incomplete.' if not all_requested_reads else 'All requested reads were verified.', 'The bothCallsPreparedBeforeFirstResult, toolIntervalsOverlap and betweenReads fields describe only the first pair. readTransitions and readResponseGroups cover all reads.', 'A fast first tool can finish while the model is still emitting a second call in the same response. Completion order does not imply intervening interpretation.', 'Actual outgoing flags and streamed response identities were independently observed; this does not establish backend enforcement of the flag.' if live_evidence else 'This live transcript does not itself capture the outgoing parallel-call flag; any request-construction capture is separate evidence.', 'The native tool path differs from the combined-wrapper path. This run does not establish an end-to-end UX speedup or a universal return-size ceiling.', 'No global configuration, model selection, client output budget or live Alexa state was changed. Any temporary model-catalog override is identified in control metadata.'],
}
destination = ROOT / ('planning/refinement-efficiency/ux-native-mcp-20260928-' + name + '-metrics.json')
if '--verify-only' not in sys.argv:
    assert not destination.exists(), 'Preserve existing experiment evidence'
    destination.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(json.dumps({key: report[key] for key in ['outcome', 'nativeReadCount', 'completionMarkerStored', 'nativeExposureVerified', 'singleResponseReadGroup', 'anyReadBatch', 'maxReadsPerResponse', 'targetMet', 'results', 'betweenReads']}, indent=2))
