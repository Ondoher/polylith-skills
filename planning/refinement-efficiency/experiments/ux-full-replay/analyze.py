"""Verify saved MCP reads and summarize a full replay without publishing payloads."""
import collections
import hashlib
import json
from datetime import datetime
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[4]
attempt = Path(sys.argv[1]).resolve()
read = lambda file: json.loads(file.read_text(encoding='utf-8'))
rows = lambda file: [json.loads(line) for line in file.read_text(encoding='utf-8').splitlines() if line.strip()]
stamp = lambda value: datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
control = read(attempt / 'control.json')
runtime = read(attempt / 'runtime-metrics.json')
wire = read(attempt / 'live-request-metadata.json')
wire_calls = {item['callId']: item for item in wire['responses'] if item.get('itemType') in ['function_call', 'custom_tool_call'] and item.get('callId')}
wire_group_sizes = collections.Counter(item['responseId'] for item in wire_calls.values())
observations = rows(attempt / 'service-observations.jsonl')
initial_plan = read(attempt / 'input-read-plan.json')


def pages(value):
    if isinstance(value, dict):
        if all(key in value for key in ['handle', 'pointer', 'offset', 'nextOffset', 'totalBytes', 'text']):
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


actors = []
for actor in runtime['threads']:
    if not actor.get('calls') and not actor.get('items') and not actor.get('turns'):
        continue
    events = [entry for entry in rows(Path(actor['sourceSession']))
              if stamp(actor['windowStart']) <= stamp(entry['timestamp']) <= stamp(actor['windowEnd'])]
    discovery_calls = {entry['payload']['call_id'] for entry in events
                       if entry.get('payload', {}).get('type') == 'tool_search_call'}
    outputs = {entry['payload']['call_id']: entry['payload'].get('output') for entry in events
               if entry.get('payload', {}).get('type') == 'function_call_output'}
    calls = [entry['payload'] for entry in events
             if entry.get('payload', {}).get('type') == 'function_call' and entry['payload'].get('name') == 'workflow_read']
    verified = []
    groups = collections.Counter()
    for call in calls:
        if call['call_id'] not in outputs:
            continue
        observed = wire_calls.get(call['call_id'])
        if observed:
            groups[observed['responseId']] += 1
        found = list(pages(outputs[call['call_id']]))
        if not found:
            verified.append({'callId': call['call_id'], 'byteExact': None, 'reason': 'No complete page in result; inspect tool failure separately'})
            continue
        assert all(page == found[0] for page in found)
        page = found[0]
        run, digest = page['handle'].split(':')
        assert run == control['run'] and len(digest) == 64 and all(c in '0123456789abcdef' for c in digest)
        raw = (Path(control['workspace']) / '.codex-tmp/mcp-workflows/runs' / run / 'results' / (digest + '.json')).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == digest
        if page['pointer']:
            value = json.loads(raw)
            for segment in page['pointer'][1:].split('/'):
                key = segment.replace('~1', '/').replace('~0', '~')
                value = value[int(key)] if isinstance(value, list) else value[key]
            # JSON formatting matches JSON.stringify for the current JSON data contract.
            raw = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        end = page['nextOffset'] if page['nextOffset'] is not None else page['totalBytes']
        actual = page['text'].encode('utf-8')
        verified.append({'callId': call['call_id'], 'handleSha256': digest, 'pointer': page['pointer'],
                         'offset': page['offset'], 'end': end, 'bytes': len(actual),
                         'byteExact': actual == raw[page['offset']:end],
                         'responseId': observed['responseId'] if observed else None})
    initial_reads = [item for item in verified if item.get('pointer') == '' and
                     any(request['handle'].endswith(item.get('handleSha256', '!')) for request in initial_plan)]
    initial_coverage = []
    for request in initial_plan:
        matching = [item for item in initial_reads if request['handle'].endswith(item['handleSha256']) and
                    item['offset'] == request['offset']]
        initial_coverage.append({'source': request['source'], 'offset': request['offset'],
                                 'count': len(matching), 'byteExact': bool(matching) and all(item['byteExact'] for item in matching)})
    usage = actor.get('usage') or actor.get('usageByCompletedResponse')
    largest_commands = []
    for command in sorted(actor['calls'], key=lambda item: item.get('argumentBytes', 0), reverse=True)[:8]:
        observed = wire_calls.get(command['id'], {})
        stream = next((item for item in actor['items'] if item.get('callId') == command['id']), {})
        batch_size = wire_group_sizes.get(observed.get('responseId'), 0)
        duration = stream.get('end', 0) - stream.get('start', 0) if 'start' in stream else -1
        largest_commands.append({**command, 'responseId': observed.get('responseId'), 'callsInResponse': batch_size,
                                 'outputItemSeconds': duration if batch_size == 1 and duration >= 0 else None})
    initial_coverage_required = actor.get('role') == 'ux-planner' and not control.get('resumedFrom')
    actors.append({'role': actor.get('role'), 'threadId': actor.get('threadId', actor.get('id')),
                   'model': actor['model'], 'effort': actor['effort'],
                   'windowSeconds': actor['windowSeconds'], 'activeTurnSeconds': actor.get('activeTurnSeconds'),
                   'seconds': actor['seconds'], 'unattributedSeconds': actor.get('unattributedSeconds'),
                   'activeSeconds': actor.get('activeSeconds'), 'activeUnattributedSeconds': actor.get('activeUnattributedSeconds'),
                   'usage': usage, 'toolCalls': len(actor['calls']) + len(discovery_calls),
                   'builtinDiscoveryCallCount': len(discovery_calls),
                   'boundedInstructionReads': sum(bool(item.get('boundedRead')) for item in actor['calls']),
                   'waitCalls': sum(bool(item.get('waitRelated')) for item in actor['calls']),
                   'largestCommands': largest_commands,
                   'readGroups': dict(groups), 'maxReadsPerResponse': max(groups.values(), default=0), 'readVerification': verified,
                   'initialInputCoverageRequired': initial_coverage_required,
                   'initialInputCoverage': initial_coverage if initial_coverage_required else [],
                   'allInitialPagesReceived': all(item['byteExact'] for item in initial_coverage) if initial_coverage_required else None,
                   'windowStart': actor['windowStart'], 'windowEnd': actor['windowEnd'],
                   'turns': actor.get('turns'), 'outsideRecordedTurnsSeconds': actor.get('outsideRecordedTurnsSeconds')})
markers = [{key: item[key] for key in ['phase', 'startedAt', 'endedAt', 'serviceMs', 'actor'] if key in item}
           for item in observations if item.get('phase')]
phase_intervals = [{'from': a['phase'], 'to': b['phase'], 'seconds': stamp(b['endedAt']) - stamp(a['endedAt'])}
                   for a, b in zip(markers, markers[1:])]

# Count byte-identical subtrees at matching paths without double-counting descendants.
# Array positions are preserved; reordering lowers this conservative reuse count.
encode = lambda value: json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
def unchanged_bytes(old, new):
    if encode(old) == encode(new):
        return len(encode(new))
    if isinstance(old, dict) and isinstance(new, dict):
        return sum(unchanged_bytes(old[key], value) for key, value in new.items() if key in old)
    if isinstance(old, list) and isinstance(new, list):
        return sum(unchanged_bytes(a, b) for a, b in zip(old, new))
    return 0

result_directory = Path(control['workspace']) / '.codex-tmp/mcp-workflows/runs' / control['run'] / 'results'
is_units = lambda value: isinstance(value, list) and bool(value) and all(isinstance(unit, dict) and
                       all(key in unit for key in ['kind', 'id', 'data']) for unit in value)
baseline_candidates = [(file, read(file)) for file in result_directory.glob('*.json')]
baseline_candidates = [(file, value) for file, value in baseline_candidates if is_units(value) and len(value) == 16]
unit_reuse = []
unit_normalization_exact = len(baseline_candidates) == 1 and encode(baseline_candidates[0][1]) == baseline_candidates[0][0].read_bytes()
if len(baseline_candidates) == 1:
    baseline_units = {(unit['kind'], unit['id']): unit for unit in baseline_candidates[0][1]}
    for observation in observations:
        if observation.get('method') != 'store' or observation.get('actor') != 'assigned' or not observation.get('sha256'):
            continue
        delivered = read(result_directory / (observation['sha256'] + '.json'))
        if not is_units(delivered):
            continue
        unit_normalization_exact = unit_normalization_exact and encode(delivered) == (result_directory / (observation['sha256'] + '.json')).read_bytes()
        for unit in delivered:
            original = baseline_units.get((unit['kind'], unit['id']))
            if original is None:
                continue
            unit_reuse.append({'kind': unit['kind'], 'id': unit['id'], 'at': observation['endedAt'],
                               'baselineBytes': len(encode(original)), 'replacementBytes': len(encode(unit)),
                               'unchangedSubtreeValueBytes': unchanged_bytes(original, unit)})
report = {'experiment': 'Full native UX replay', 'control': control,
          'supervisorSetupSeconds': stamp(control['agentStartedAt']) - stamp(control['requestedAt']),
          'actors': actors, 'phaseMarkers': markers, 'consecutiveMarkerIntervals': phase_intervals,
          'replacementUnitReuse': unit_reuse,
          'unitReuseNormalizationExact': unit_normalization_exact,
          'unitReuseMethod': 'Nonoverlapping equal JSON subtrees at identical paths; excludes unchanged property-name and punctuation overhead, and does not match moved array entries. Python JSON normalization caveat also applies. Skipped if baseline candidates are ambiguous.',
          'mcpServiceCalls': len(observations), 'mcpServiceMs': sum(item['serviceMs'] for item in observations),
          'operationCounts': dict(collections.Counter(item.get('operation') for item in observations if item.get('operation'))),
          'serviceFailures': [{key: item[key] for key in ['method', 'operation', 'actor', 'startedAt', 'endedAt', 'serviceMs', 'error'] if key in item}
                              for item in observations if item.get('failed')],
          'serviceByActor': {actor: {'calls': len(items), 'serviceMs': sum(item['serviceMs'] for item in items)}
                             for actor in sorted({item.get('actor', 'unknown') for item in observations})
                             for items in [[item for item in observations if item.get('actor', 'unknown') == actor]]},
          'wireRequestCount': len([item for item in wire['requests'] if item.get('generate') is not False]),
          'selectedModelParallelFlags': dict(collections.Counter(str(item.get('parallelToolCalls')) for item in wire['requests']
                                             if item.get('generate') is not False and item.get('model') == control['model'])),
          'wireErrors': wire['errors'],
          'evidence': {name: {'path': str(attempt / name), 'sha256': hashlib.sha256((attempt / name).read_bytes()).hexdigest()}
                       for name in ['control.json', 'runtime-metrics.json', 'live-request-metadata.json', 'service-observations.jsonl']},
          'limits': ['Actor windows overlap and must not be summed.', 'Marker intervals include tool-call preparation and may cross actors; they are not pure reasoning time.', 'Pointer JSON-number normalization may require exact JavaScript rechecking if a verification mismatch is reported.', 'Independent review and full authoring exceed the scope of the earlier compact comparison experiment.']}
(attempt / 'replay-metrics.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'status': control['status'], 'actors': [{key: a[key] for key in ['role', 'windowSeconds', 'toolCalls', 'maxReadsPerResponse', 'allInitialPagesReceived']} for a in actors], 'markers': markers, 'readMismatches': sum(item['byteExact'] is False for a in actors for item in a['readVerification']), 'readsWithoutPage': sum(item['byteExact'] is None for a in actors for item in a['readVerification'])}))
