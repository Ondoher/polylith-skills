"""Project saved first-pass evidence to metadata; never publish capabilities or payloads."""
import argparse
import collections
import hashlib
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
read = lambda file: json.loads(file.read_text(encoding='utf-8-sig'))
stamp = lambda value: datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
encode = lambda value: json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def rows(file):
    if not file.exists():
        return []
    with file.open(encoding='utf-8') as source:
        return [json.loads(line) for line in source if line.strip()]


def union(intervals):
    merged = []
    for start, end in sorted(intervals):
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return sum(end - start for start, end in merged)


def discovery(events, start, end):
    """Built-in tool_search is a separate rollout item, absent from legacy call totals."""
    calls = {}
    outputs = {}
    for event in events:
        at = stamp(event['timestamp'])
        payload = event.get('payload', {})
        kind = payload.get('type')
        identity = payload.get('call_id')
        if kind == 'tool_search_call' and start <= at <= end:
            arguments = payload.get('arguments', '')
            calls[identity] = {'id': identity, 'name': 'tool_search', 'start': at,
                               'argumentBytes': len(arguments.encode('utf-8')) if isinstance(arguments, str) else len(encode(arguments))}
        elif kind == 'tool_search_output':
            outputs[identity] = at
    for identity, call in calls.items():
        if identity in outputs:
            call['end'] = outputs[identity]
    return list(calls.values())


def activity(actor, start, end, discovered):
    a, b = stamp(start), stamp(end)
    intervals = {'output': [], 'reasoning-item': [], 'tool': []}
    for item in actor.get('items', []):
        if 'start' not in item or 'end' not in item:
            continue
        x, y = max(a, item['start']), min(b, item['end'])
        if x < y:
            intervals['reasoning-item' if item['kind'] == 'reasoning' else 'output'].append((x, y))
    calls = actor.get('calls', []) + discovered
    for call in calls:
        x, y = max(a, call['start']), min(b, call.get('end', call['start']))
        if x < y:
            intervals['tool'].append((x, y))
    responses = [item for item in actor.get('responses', []) if a <= stamp(item['at']) <= b]
    return {'start': start, 'end': end, 'wallSeconds': b - a,
            'observedSeconds': {key: union(value) for key, value in intervals.items()},
            'unattributedSeconds': max(0, b - a - union([pair for group in intervals.values() for pair in group])),
            'toolCallsCompleted': sum(a <= call.get('end', float('inf')) <= b for call in calls),
            'usageByResponsesCompletedInWindow': {
                key: sum(item.get('usage', {}).get(key, 0) for item in responses)
                for key in ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens']}}


def subtree_reuse(old, new):
    if old == new:
        return len(encode(new))
    if isinstance(old, dict) and isinstance(new, dict):
        return sum(subtree_reuse(old[key], value) for key, value in new.items() if key in old)
    if isinstance(old, list) and isinstance(new, list):
        return sum(subtree_reuse(a, b) for a, b in zip(old, new))
    return 0


def result_value(attempt, control, handle):
    run, digest = handle.split(':')
    assert run == control['run'] and len(digest) == 64 and all(c in '0123456789abcdef' for c in digest)
    file = Path(control['workspace']) / '.codex-tmp/mcp-workflows/runs' / run / 'results' / (digest + '.json')
    raw = file.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == digest
    return json.loads(raw)


def first_pass(attempt, extract=True):
    control = read(attempt / 'control.json')
    observations = rows(attempt / 'service-observations.jsonl')
    report = {'status': control['status'], 'model': control['model'], 'effort': control.get('effort'),
              'coordination': control.get('coordination'), 'boundary': control.get('boundary'),
              'liveUnchanged': control.get('liveUnchanged'), 'protectedFileCount': control.get('protectedFileCount'),
              'requestedAt': control['requestedAt'], 'preparationMs': control.get('preparationMs'),
              'cumulativePreparationMs': control.get('cumulativePreparationMs'),
              'preparationHoldSeconds': control.get('preparationHoldSeconds', 0),
              'inputBytes': control.get('inputBytes'), 'inputReadCount': control.get('inputReadCount'),
              'contractsSha256': control.get('contractsSha256'), 'roleSha256': control.get('roleSha256'),
              'guidanceSha256': control.get('guidanceSha256')}
    if not control.get('threadId'):
        report['limits'] = ['No paid author thread was started; preparation-only evidence.']
        return report
    if extract:
        extractor = ROOT / '.codex-tmp/alexa-mcp-refinement-20260928-133745/collect-runtime.py'
        subprocess.run([sys.executable, '-X', 'utf8', str(extractor), str(attempt)], check=True, capture_output=True, cwd=ROOT)
    runtime = read(attempt / 'runtime-metrics.json')
    actors = [actor for actor in runtime['threads'] if actor['threadId'] == control['threadId']]
    assert len(actors) == 1
    actor = actors[0]
    events = rows(Path(actor['sourceSession']))
    finish = control.get('firstFinishAt')
    boundary = finish or control.get('agentCompletedAt') or control['completedAt']
    start, end = stamp(control['agentStartedAt']), stamp(boundary)
    discovered = discovery(events, start, end)
    ordinary = [call for call in actor['calls'] if start <= call['start'] <= end]
    calls = sorted(ordinary + discovered, key=lambda value: value['start'])
    markers = [item for item in observations if item.get('phase') and stamp(item['endedAt']) <= end]
    boundaries = [('instructions', control['agentStartedAt'])]
    phase_labels = {'ux:instructions-ready': 'collection', 'ux:inputs-ready': 'comparison-handoff',
                    'ux:comparison-start': 'initial-decisions', 'ux:decisions-ready': 'contribution-generation',
                    'ux:finish-start': 'final-materialization'}
    for marker in markers:
        if marker['phase'] in phase_labels:
            boundaries.append((phase_labels[marker['phase']], marker['endedAt']))
    boundaries.append(('end', boundary))
    report['windows'] = {name: activity(actor, a, b, discovered) for (name, a), (_, b) in zip(boundaries, boundaries[1:])}
    report['authorWindow'] = activity(actor, control['agentStartedAt'], boundary, discovered)
    report['preparationThroughDeliverySeconds'] = stamp(boundary) - stamp(control['requestedAt'])
    report['supervisorSetupSeconds'] = start - stamp(control['requestedAt'])
    report['postDeliveryClientSeconds'] = stamp(control.get('agentCompletedAt', boundary)) - end
    report['firstFinishAt'] = finish
    report['toolCalls'] = {'ordinary': len(ordinary), 'builtinDiscovery': len(discovered), 'total': len(calls),
                           'generatedArgumentBytes': sum(call.get('argumentBytes', 0) for call in calls),
                           'byName': dict(collections.Counter(call['name'] for call in calls))}
    report['reportedTurnUsage'] = control.get('reportedUsage')
    report['actualRuntimeModel'] = actor['model']
    report['actualRuntimeEffort'] = actor['effort']
    scoped = [item for item in observations if start <= stamp(item['startedAt']) <= end]
    batches = [item for item in scoped if item.get('operation') == 'units.contribute']
    batch_details = []
    for item in batches:
        detail = {key: item[key] for key in ['batchId', 'startedAt', 'endedAt', 'serviceMs', 'inputBytes', 'contributionCount', 'failed'] if key in item}
        if item.get('handle'):
            receipt = result_value(attempt, control, item['handle'])
            detail['receiptSha256'] = item['sha256']
            detail['receiptBytes'] = item['bytes']
            detail['issueCount'] = len(receipt.get('issues', []))
            detail['acceptedUnitGroups'] = len(receipt.get('accepted', []))
            detail['receiptReused'] = receipt.get('reused')
        batch_details.append(detail)
    report['contributions'] = {'calls': len(batches), 'count': sum(item.get('contributionCount', 0) or 0 for item in batches),
                               'operationInputBytes': sum(item.get('inputBytes', 0) for item in batches), 'batches': batch_details,
                               'timeToFirstDurableSeconds': next((stamp(item['endedAt']) - stamp(control['requestedAt']) for item in batch_details if item.get('acceptedUnitGroups')), None)}
    report['service'] = {'calls': len(scoped), 'milliseconds': sum(item['serviceMs'] for item in scoped),
                         'operationCounts': dict(collections.Counter(item['operation'] for item in scoped if item.get('operation'))),
                         'failures': sum(item['failed'] for item in scoped), 'firstFinishMs': control.get('firstFinishServiceMs')}
    report['recovery'] = {'failedServiceCalls': sum(item['failed'] for item in scoped),
                          'reusedContributionReceipts': sum(bool(item.get('receiptReused')) for item in batch_details),
                          'costSeconds': None, 'note': 'Targeted recovery needs observed activity annotation; failed calls alone do not identify all repair work.'}
    report['firstProposal'] = None
    if finish:
        receipt = result_value(attempt, control, control['firstFinishHandle'])
        report['firstProposal'] = {'receiptSha256': control['firstFinishHandle'].split(':')[1],
                                   'issueCount': len(receipt.get('issues', [])),
                                   'savedUnitCount': len(receipt.get('saved', [])),
                                   **{key: receipt[key] for key in ['status', 'approval', 'elapsedMs'] if key in receipt}}
    imported = read(attempt / 'imported-units-receipt.json') if (attempt / 'imported-units-receipt.json').exists() else next((item for item in observations if item.get('operation') == 'units.import' and item.get('handle')), None)
    baseline = {f"{unit['kind']}:{unit['id']}": unit for unit in result_value(attempt, control, imported['handle'])} if imported else {}
    # Decode element defaults mechanically before matching semantic targets.
    for unit in baseline.values():
        if unit.get('kind') == 'element':
            unit['data'] = {name: [{**packed.get('defaults', {}), **value} for value in packed.get('values', [])]
                            for name, packed in unit['data'].get('catalogs', {}).items()}
        elif unit.get('kind') == 'context':
            unit['data'] = unit['data']['document']
    retransmitted = 0
    native_contribution_calls = 0
    call_details = []
    wire = read(attempt / 'live-request-metadata.json')
    wire_calls = {item['callId']: item for item in wire['responses'] if item.get('callId') and item.get('itemType') in ['function_call', 'custom_tool_call', 'tool_search_call']}
    group_sizes = collections.Counter(item.get('responseId') for item in wire_calls.values())
    for event in events:
        if not start <= stamp(event['timestamp']) <= end:
            continue
        payload = event.get('payload', {})
        if payload.get('type') != 'function_call' or payload.get('name') != 'workflow_execute':
            continue
        try:
            arguments = json.loads(payload.get('arguments', '{}'))
        except json.JSONDecodeError:
            continue
        if arguments.get('operation') != 'units.contribute':
            continue
        native_contribution_calls += 1
        contribution = arguments.get('input', {})
        for change in contribution.get('changes', []):
            original = baseline.get(change.get('unit'), {}).get('data')
            for selector in change.get('target', []):
                collection = original.get(selector['collection'], []) if isinstance(original, dict) else []
                original = next((record for record in collection if record.get('id') == selector['id']), None)
            if isinstance(original, dict) and isinstance(change.get('fields'), dict):
                retransmitted += subtree_reuse(original, change['fields'])
        identity = payload['call_id']
        call = next((item for item in calls if item['id'] == identity), {})
        stream = next((item for item in actor['items'] if item.get('callId') == identity), {})
        wire_call = wire_calls.get(identity, {})
        prior = max((item.get('end', start) for item in calls if item.get('end', end + 1) <= stream.get('start', start)), default=start)
        call_details.append({'callId': identity, 'batchId': contribution.get('batchId'), 'argumentBytes': call.get('argumentBytes'),
                              'commandStreamSeconds': stream['end'] - stream['start'] if 'start' in stream and 'end' in stream else None,
                              'toolIntervalSeconds': call['end'] - call['start'] if 'end' in call else None,
                              'previousResultToCommandStartSeconds': stream['start'] - prior if 'start' in stream else None,
                              'callsInResponse': group_sizes.get(wire_call.get('responseId'), 0)})
    report['contributionCalls'] = call_details
    receipt_handles = {item['handle'] for item in batches if item.get('handle')}
    inline_handles = {item['handle'] for item in batches if item.get('handle') and item.get('inlineReceipt')}
    report['contributions']['receiptReadCalls'] = sum(item['method'] == 'read' and item.get('handle') in receipt_handles for item in scoped)
    report['contributions']['inlineReceiptReadCalls'] = sum(item['method'] == 'read' and item.get('handle') in inline_handles for item in scoped)
    report['unchangedDataRetransmitted'] = {'equalSubtreeValueBytes': retransmitted, 'nativeCallsInspected': native_contribution_calls,
                                           'method': 'Compare supplied fields at named semantic targets with the imported baseline. Counts values only; excludes envelope/property overhead. Does not compare against preceding contributions.'}
    report['wire'] = {'requestCount': len(wire['requests']), 'requests': wire['requests'],
                      'errorCount': len(wire['errors']), 'toolGrouping': dict(collections.Counter(group_sizes.values()))}
    initial = read(attempt / 'input-receipts.json')
    report['inputIdentities'] = {name: {key: receipt[key] for key in ['sha256', 'bytes']} for name, receipt in initial.items()}
    report['inputCollection'] = {}
    client_pages = {}
    decoder = json.JSONDecoder()

    def inspect_pages(value):
        if isinstance(value, dict):
            if value.get('handle') in {receipt['handle'] for receipt in initial.values()} and all(key in value for key in ['offset', 'nextOffset', 'totalBytes', 'text']) and not value.get('pointer'):
                client_pages.setdefault((value['handle'], value['offset']), []).append(value)
            else:
                for child in value.values():
                    inspect_pages(child)
        elif isinstance(value, list):
            for child in value:
                inspect_pages(child)
        elif isinstance(value, str) and 'handle' in value:
            offset = 0
            while offset < len(value):
                location = value.find('{', offset)
                if location < 0:
                    break
                try:
                    decoded, offset = decoder.raw_decode(value, location)
                    inspect_pages(decoded)
                except json.JSONDecodeError:
                    offset = location + 1

    for event in events:
        payload = event.get('payload', {})
        if start <= stamp(event['timestamp']) <= end and payload.get('type') in ['function_call_output', 'custom_tool_call_output']:
            inspect_pages(payload.get('output'))
    for name, receipt in initial.items():
        pages = [item for item in scoped if item['method'] == 'read' and item.get('handle') == receipt['handle'] and not item.get('pointer') and not item['failed']]
        ranges = [(item['offset'], item['offset'] + item['textBytes']) for item in pages]
        received = sorted((values[0] for (handle, _), values in client_pages.items() if handle == receipt['handle']), key=lambda value: value['offset'])
        cursor = 0
        contiguous = True
        for page in received:
            contiguous = contiguous and page['offset'] == cursor
            cursor += len(page['text'].encode('utf-8'))
        digest = hashlib.sha256(''.join(page['text'] for page in received).encode('utf-8')).hexdigest()
        report['inputCollection'][name] = {'pages': len(pages), 'serverBytes': sum(item['textBytes'] for item in pages),
                                           'serverCoverageComplete': union(ranges) == receipt['bytes'],
                                           'clientPages': len(received), 'clientBytes': cursor,
                                           'clientExactCoverage': contiguous and cursor == receipt['bytes'] and digest == receipt['sha256'],
                                           'conflictingClientPages': sum(any(page != values[0] for page in values) for (handle, _), values in client_pages.items() if handle == receipt['handle'])}
    report['limits'] = [
        'Direct author execution removes historical coordinating-parent model overhead; report author and end-to-end boundaries separately.',
        'Observed output/reasoning-item/tool intervals are not private design thought or isolated provider computation. Overlaps are unioned; categories may overlap.',
        'Marker names label visible activity, not proof that useful UX reasoning ended. Later contributions can include further decisions.',
        'Built-in discovery completion-to-result intervals are included; missing stream-start evidence remains unattributed.',
        'Usage counts are actual runtime counters, not credits or prices. Cached input and reasoning output are subsets. Response completion boundaries can straddle phases.',
        'Input coverage here is server byte-range coverage; inspect saved client results for truncation before asserting client-visible exact coverage.',
        'Artifact defects are retained without review or another authoring round. No live cold-start performance conclusion follows from this update test.',
        'No payload, prompt, capability, argument body or raw reasoning is copied into this report.',
    ]
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('attempt', type=Path)
    parser.add_argument('--reuse-runtime', action='store_true')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    attempt = args.attempt.resolve()
    output = args.output or attempt / 'first-pass-metrics.json'
    assert not output.exists(), 'Preserve existing report; supply a new --output path'
    report = first_pass(attempt, not args.reuse_runtime)
    report['evidence'] = {name: {'sha256': hashlib.sha256((attempt / name).read_bytes()).hexdigest(), 'bytes': (attempt / name).stat().st_size}
                          for name in ['control.json', 'runtime-metrics.json', 'live-request-metadata.json', 'service-observations.jsonl', 'contracts.json', 'input-receipts.json'] if (attempt / name).exists()}
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(output), 'status': report['status'], 'liveUnchanged': report['liveUnchanged'], 'firstFinishAt': report.get('firstFinishAt')}))


if __name__ == '__main__':
    main()
