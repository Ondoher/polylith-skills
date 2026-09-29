"""Measure the actual input-result to saved-answer window of a bounded UX test."""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
from analyze import ROOT, activity, discovery, encode, read, rows, stamp


def embedded(value):
    """Decode native MCP output envelopes, preserving the delivered page text."""
    if isinstance(value, dict):
        yield value
        for child in value.values():
            if isinstance(child, (dict, list)):
                yield from embedded(child)
            elif isinstance(child, str) and child.lstrip().startswith('{'):
                yield from embedded(child)
    elif isinstance(value, list):
        for child in value:
            yield from embedded(child)
    elif isinstance(value, str):
        decoder, offset = json.JSONDecoder(), 0
        while offset < len(value):
            at = value.find('{', offset)
            if at < 0:
                break
            try:
                result, offset = decoder.raw_decode(value, at)
                yield from embedded(result)
            except json.JSONDecodeError:
                offset = at + 1


def analyze(attempt, extract=True):
    c = read(attempt / 'control.json')
    assert c['status'] == 'finished' and c['liveUnchanged']
    if extract:
        subprocess.run([sys.executable, '-X', 'utf8', str(ROOT / '.codex-tmp/alexa-mcp-refinement-20260928-133745/collect-runtime.py'), str(attempt)], check=True, capture_output=True, cwd=ROOT)
    actor = next(t for t in read(attempt / 'runtime-metrics.json')['threads'] if t['threadId'] == c['threadId'])
    events = rows(Path(actor['sourceSession']))
    events = [e for e in events if stamp(c['agentStartedAt']) <= stamp(e['timestamp']) <= stamp(c['agentCompletedAt'])]
    initial = read(attempt / 'input-receipts.json')['input']
    calls, results = {}, {}
    for e in events:
        p = e.get('payload', {})
        if p.get('type') == 'function_call':
            calls[p['call_id']] = {'event': e, 'args': json.loads(p['arguments'])}
        elif p.get('type') == 'function_call_output':
            results[p['call_id']] = e
    input_calls = [(identity, call) for identity, call in calls.items()
                   if call['args'].get('handle') == initial['handle'] and call['event']['payload']['name'].endswith('workflow_read')]
    assert len(input_calls) == 1, 'The matched test requires one product input read'
    input_id, input_call = input_calls[0]
    delivered = results[input_id]
    pages = [p for p in embedded(delivered['payload']['output']) if p.get('handle') == initial['handle'] and 'text' in p and 'nextOffset' in p]
    assert pages and all(p == pages[0] for p in pages)
    page = pages[0]
    digest = hashlib.sha256(page['text'].encode()).hexdigest()
    assert page['offset'] == 0 and page['nextOffset'] is None and digest == initial['sha256']
    assert len(page['text'].encode()) == initial['bytes']
    answers = [(identity, call) for identity, call in calls.items()
               if call['args'].get('value', {}).get('phase') == 'ux:decision-result']
    assert len(answers) == 1, 'Keep first answers; do not conflate repairs with the matched result'
    answer_id, answer_call = answers[0]
    saved = read(attempt / 'first-finish-receipt.json')
    assert saved == answer_call['args']['value']
    end_event = results[answer_id]
    start, end = delivered['timestamp'], end_event['timestamp']
    wire = read(attempt / 'live-request-metadata.json')
    response_starts = {r['responseId']: r for r in wire['responses'] if r['type'] == 'response.created' and r.get('model') == c['model']}
    window_ids = {rid for rid, r in response_starts.items() if stamp(start) <= stamp(r['at']) <= stamp(c['firstFinishAt'])}
    usage = {r['id']: r for r in actor['responses']}
    assert window_ids and window_ids <= usage.keys(), 'Decision responses require complete unique usage counters'
    wire_calls = {r['callId']: r for r in wire['responses'] if r.get('callId') and r.get('itemType') == 'function_call'}
    assert wire_calls[answer_id]['responseId'] in window_ids
    assert wire_calls[input_id]['responseId'] not in window_ids
    selected = [usage[rid] for rid in window_ids]
    totals = {k: sum(r['usage'].get(k, 0) for r in selected)
              for k in ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens']}
    phases = discovery(events, stamp(c['agentStartedAt']), stamp(c['agentCompletedAt']))
    measured = activity(actor, start, end, phases)
    measured.pop('usageByResponsesCompletedInWindow')
    # The input receipt defines the boundary; do not count that already completed
    # read as another tool call performed while deciding.
    measured['toolCallsCompleted'] = sum(stamp(start) < call.get('end', float('inf')) <= stamp(end)
                                          for call in actor['calls'] + phases)
    answer = saved['answer']
    fields = c['decision']['manifest']['answerFields']
    word_counts = {f: len(answer.get(f, '').split()) for f in fields}
    schema_ok = (set(answer) == set(fields) | {'unresolved', 'sourceRefs'}
                 and all(isinstance(answer[f], str) for f in fields)
                 and isinstance(answer['unresolved'], list) and isinstance(answer['sourceRefs'], list)
                 and max(word_counts.values()) <= c['decision']['manifest']['maxWordsPerField']
                 and sum(word_counts.values()) <= c['decision']['manifest']['maxTotalWords'])
    supplied_refs = {r['value'].get('id') for r in json.loads(page['text'])['records'] if isinstance(r['value'], dict)}
    supplied_refs |= {r['source'] + ':' + r['pointer'] for r in json.loads(page['text'])['records']}
    observations = rows(attempt / 'service-observations.jsonl')
    assigned = [o for o in observations if o.get('actor') == 'assigned' and stamp(o['startedAt']) >= stamp(c['agentStartedAt'])]
    stores = [o for o in assigned if o['method'] == 'store']
    all_reads = [o for o in assigned if o['method'] == 'read']
    assert len(all_reads) == 1 and all_reads[0]['handle'] == initial['handle']
    assert any(p['phase'] == 'ux:instructions-ready' and stamp(p['at']) < stamp(start) for p in c['phases'])
    request_efforts = sorted({r.get('reasoningEffort', '') for r in wire['requests'] if r.get('model') == c['model']})
    report = {
        'condition': c['decision']['condition'], 'attempt': attempt.name,
        'model': c['model'], 'configuredEffort': c['effort'], 'effectiveWireEfforts': request_efforts,
        'roleSha256': c['roleSha256'], 'contractsSha256': c['contractsSha256'],
        'input': {'bytes': initial['bytes'], 'records': len(json.loads(page['text'])['records']),
                  'sha256': digest, 'clientExact': True, 'reads': len(input_calls), 'receivedAt': start},
        'decisionWindow': measured, 'serverSavedAt': c['firstFinishAt'],
        'decisionResponseCount': len(selected), 'decisionUsage': totals,
        'wholeAuthorUsage': actor['usageByCompletedResponse'],
        'responseUsage': [{'responseId': r['id'], 'createdAt': response_starts[r['id']]['at'],
                           'counterRecordedAt': r['at'], 'usage': r['usage'],
                           'counterOutsideWindow': not stamp(start) <= stamp(r['at']) <= stamp(end)} for r in sorted(selected, key=lambda r: r['at'])],
        'startupThroughInputSeconds': stamp(start) - stamp(c['agentStartedAt']),
        'acknowledgementSeconds': stamp(c['agentCompletedAt']) - stamp(end),
        'wholeAuthorSeconds': stamp(c['agentCompletedAt']) - stamp(c['agentStartedAt']),
        'harnessPreparationMs': c['preparationMs'],
        'answer': {'bytes': len(encode(answer)), 'wordsByField': word_counts, 'proseWords': sum(word_counts.values()),
                   'schemaAndLengthValid': schema_ok, 'sourceRefsValid': all(ref in supplied_refs for ref in answer['sourceRefs']),
                   'unresolvedCount': len(answer['unresolved']), 'sha256': hashlib.sha256(encode(answer)).hexdigest()},
        'service': {'assignedCalls': len(assigned), 'assignedServiceMs': sum(o['serviceMs'] for o in assigned),
                    'storeCalls': len(stores), 'failedCalls': sum(o.get('failed', False) for o in assigned)},
        'decisionCalls': [{'name': call['name'], 'argumentBytes': call['argumentBytes'],
                           'toolSeconds': call.get('end', call['start']) - call['start']}
                          for call in actor['calls'] if stamp(start) < call['start'] <= stamp(end)],
        'liveUnchanged': c['liveUnchanged'], 'protectedFileCount': c.get('protectedFileCount'),
        'evidenceHashes': {f: hashlib.sha256((attempt / f).read_bytes()).hexdigest() for f in ['control.json', 'input-receipts.json', 'first-finish-receipt.json', 'service-observations.jsonl', 'runtime-metrics.json', 'live-request-metadata.json']},
    }
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('attempt', type=Path)
    parser.add_argument('--reuse-runtime', action='store_true')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = analyze(args.attempt.resolve(), not args.reuse_runtime)
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: result[k] for k in ['condition', 'input', 'decisionUsage', 'decisionWindow', 'answer']}))
