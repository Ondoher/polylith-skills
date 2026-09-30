"""Measure a three-case continuous author using saved native MCP evidence."""
import argparse
import hashlib
import json
import subprocess
import sys
from importlib import import_module
from pathlib import Path

sys.dont_write_bytecode = True
from analyze import ROOT, activity, discovery, encode, read, rows, stamp
embedded = import_module('analyze-decision').embedded


def analyze(attempt, extract=True):
    control = read(attempt / 'control.json')
    assert control['status'] == 'finished' and control['liveUnchanged']
    assert len(control['turns']) == 1, 'Use one continuous author, not case-by-case resumes'
    manifest = control['series']['manifest']
    condition = control['series']['condition']
    if extract:
        subprocess.run([sys.executable, '-X', 'utf8', str(ROOT / '.codex-tmp/alexa-mcp-refinement-20260928-133745/collect-runtime.py'), str(attempt)], check=True, capture_output=True, cwd=ROOT)
    actor = next(t for t in read(attempt / 'runtime-metrics.json')['threads'] if t['threadId'] == control['threadId'])
    events = [e for e in rows(Path(actor['sourceSession'])) if stamp(control['agentStartedAt']) <= stamp(e['timestamp']) <= stamp(control['agentCompletedAt'])]
    calls, outputs = {}, {}
    for event in events:
        payload = event.get('payload', {})
        if payload.get('type') == 'function_call':
            name = payload['name'].split('__')[-1]
            assert name in ['workflow_read', 'workflow_store'], 'Unexpected author tool; startup context was not held fixed'
            calls[payload['call_id']] = {'name': name, 'args': json.loads(payload['arguments']), 'at': event['timestamp']}
        elif payload.get('type') == 'function_call_output':
            outputs[payload['call_id']] = event
    ready = [(key, call) for key, call in calls.items() if call['args'].get('value', {}).get('phase') == 'ux:series-ready']
    assert len(ready) == 1
    start = outputs[ready[0][0]]['timestamp']
    receipts = read(attempt / 'input-receipts.json')
    packet_reads, answers, sequence = {}, {}, []
    available = set()
    previous_receipt = start
    for key, call in calls.items():
        args = call['args']
        if key != ready[0][0]:
            assert stamp(call['at']) > stamp(previous_receipt), 'Await each read/save receipt before the next call'
            previous_receipt = outputs[key]['timestamp']
        if call['name'] == 'workflow_read':
            assert stamp(call['at']) > stamp(start), 'Read must follow the ready receipt'
            case_id = next((name for name, receipt in receipts.items() if receipt['handle'] == args['handle']), None)
            assert case_id and case_id not in packet_reads and not args.get('pointer')
            pages = [p for p in embedded(outputs[key]['payload']['output']) if p.get('handle') == args['handle'] and 'text' in p and 'nextOffset' in p]
            assert pages and all(p == pages[0] for p in pages)
            page = pages[0]
            assert page['offset'] == 0 and page['nextOffset'] is None
            assert hashlib.sha256(page['text'].encode()).hexdigest() == receipts[case_id]['sha256']
            records = json.loads(page['text'])['records']
            available.update(r['source'] + ':' + r['pointer'] for r in records)
            available.update(r['value']['id'] for r in records if isinstance(r['value'], dict) and 'id' in r['value'])
            packet_reads[case_id] = {'callAt': call['at'], 'receivedAt': outputs[key]['timestamp'], 'bytes': len(page['text'].encode()), 'sha256': receipts[case_id]['sha256']}
            sequence.append('read:' + case_id)
        elif args.get('value', {}).get('phase') == 'ux:series-result':
            value = args['value']
            case_id = value['caseId']
            assert case_id in manifest['caseOrder'] and case_id not in answers
            item = next(item for item in manifest['cases'] if item['id'] == case_id)
            answer = value['answer']
            counts = {field: len(answer.get(field, '').split()) if isinstance(answer.get(field), str) else item['maxWordsPerField'] + 1 for field in item['answerFields']}
            contract = (set(answer) == set(item['answerFields']) | {'unresolved', 'sourceRefs'}
                        and isinstance(answer['unresolved'], list) and isinstance(answer['sourceRefs'], list)
                        and max(counts.values()) <= item['maxWordsPerField'] and sum(counts.values()) <= item['maxTotalWords'])
            answers[case_id] = {'callAt': call['at'], 'receivedAt': outputs[key]['timestamp'], 'answer': {
                'sha256': hashlib.sha256(encode(answer)).hexdigest(), 'wordsByField': counts,
                'proseWords': sum(counts.values()), 'schemaAndLengthValid': contract,
                'sourceRefsValid': isinstance(answer.get('sourceRefs'), list) and all(isinstance(ref, str) and ref in available for ref in answer['sourceRefs']),
                'unresolvedCount': len(answer['unresolved']) if isinstance(answer.get('unresolved'), list) else None}}
            sequence.append('answer:' + case_id)
        else:
            assert key == ready[0][0], 'Unexpected store; preserve the first answers without repair'
    order = manifest['caseOrder']
    expected = ([f'read:{id}' for id in order] + [f'answer:{id}' for id in order] if condition == 'upfront'
                else [event for id in order for event in [f'read:{id}', f'answer:{id}']])
    assert sequence == expected, 'Delivery schedule violated'
    for index, case_id in enumerate(order):
        required = order if condition == 'upfront' else order[:index + 1]
        assert stamp(answers[case_id]['callAt']) >= max(stamp(packet_reads[id]['receivedAt']) for id in required)
        if index:
            assert stamp(answers[case_id]['callAt']) > stamp(answers[order[index - 1]]['receivedAt'])
            if condition == 'as-needed':
                assert stamp(packet_reads[case_id]['callAt']) > stamp(answers[order[index - 1]]['receivedAt'])
    end = answers[order[-1]]['receivedAt']
    wire = read(attempt / 'live-request-metadata.json')
    created = {r['responseId']: r for r in wire['responses'] if r['type'] == 'response.created' and r.get('model') == control['model']}
    usage = {r['id']: r for r in actor['responses']}
    discovered = discovery(events, stamp(control['agentStartedAt']), stamp(control['agentCompletedAt']))
    assert all(item.get('end', float('inf')) <= stamp(start) for item in discovered), 'Tool discovery continued after the ready marker'

    def window(begin, finish):
        ids = {id for id, r in created.items() if stamp(begin) < stamp(r['at']) <= stamp(finish)}
        assert ids <= usage.keys()
        result = activity(actor, begin, finish, discovered)
        result.pop('usageByResponsesCompletedInWindow')
        result['toolCallsCompleted'] = sum(stamp(begin) < item.get('end', float('inf')) <= stamp(finish) for item in actor['calls'] + discovered)
        result['responseIds'] = sorted(ids)
        result['usage'] = {key: sum(usage[id]['usage'].get(key, 0) for id in ids) for key in ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens']}
        return result

    whole = window(start, end)
    # Each answer must be produced by a response fully inside the measured window.
    wire_calls = {r['callId']: r['responseId'] for r in wire['responses'] if r.get('callId') and r.get('itemType') == 'function_call'}
    for key, call in calls.items():
        if key != ready[0][0]:
            assert wire_calls[key] in whole['responseIds']
    stages = []
    previous = start
    for case_id in order:
        finished = answers[case_id]['receivedAt']
        stages.append({'case': case_id, 'windowIncludingInputWork': window(previous, finished), 'answer': answers[case_id]['answer']})
        previous = finished
    phases = read(attempt / 'series-answers.json')
    assert [p['caseId'] for p in phases] == order
    return {'condition': condition, 'attempt': attempt.name, 'model': control['model'], 'configuredEffort': control['effort'],
            'effectiveWireEfforts': sorted({r.get('reasoningEffort', '') for r in wire['requests'] if r.get('model') == control['model']}),
            'roleSha256': control['roleSha256'], 'contractsSha256': control['contractsSha256'],
            'instructionBundleSha256': manifest['instructions']['sha256'], 'instructionOverlaySha256': control['series']['instructionOverlaySha256'],
            'moduleSha256': control['series']['moduleSha256'], 'protocolValid': True, 'sequence': sequence,
            'uniqueRecords': manifest['uniqueRecords'], 'packetReads': packet_reads, 'wholeMeasuredWindow': whole,
            'stages': stages, 'startupThroughReadySeconds': stamp(start) - stamp(control['agentStartedAt']),
            'acknowledgementSeconds': stamp(control['agentCompletedAt']) - stamp(end),
            'wholeAuthorUsage': actor['usageByCompletedResponse'], 'liveUnchanged': control['liveUnchanged'],
            'protectedFileCount': control['protectedFileCount'],
            'limits': ['Stage windows include acquisition work; upfront stage one includes all three reads.',
                       'Earlier context remains in the same author; staged delivery does not clear memory.',
                       'Source/format checks are not semantic quality scoring. Apply the frozen rubric separately.',
                       'Usage belongs to unique response IDs, not isolated private reasoning about each case.']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('attempt', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--no-extract', action='store_true')
    args = parser.parse_args()
    report = analyze(args.attempt.resolve(), not args.no_extract)
    args.output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'condition': report['condition'], 'protocolValid': report['protocolValid'], 'usage': report['wholeMeasuredWindow']['usage'], 'seconds': report['wholeMeasuredWindow']['wallSeconds']}))
