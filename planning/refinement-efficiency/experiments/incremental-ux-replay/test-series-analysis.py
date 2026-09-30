"""Happy-path telemetry fixtures; these are not model performance observations."""
import hashlib
import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from importlib import import_module
from pathlib import Path

sys.dont_write_bytecode = True
analyze = import_module('analyze-series').analyze


class SeriesAnalysisTest(unittest.TestCase):
    def test_both_delivery_schedules_have_one_author_and_disjoint_stage_usage(self):
        for condition in ['upfront', 'as-needed']:
            with self.subTest(condition=condition), tempfile.TemporaryDirectory(prefix='ux-series-metrics-') as location:
                root = Path(location)
                write = lambda name, value: (root / name).write_text(json.dumps(value), encoding='utf-8')
                at = lambda seconds: (datetime(2026, 9, 29, tzinfo=timezone.utc) + timedelta(seconds=seconds)).isoformat()
                order = ['save-range', 'trim-group', 'update-clip']
                fields = ['eligibility', 'operation', 'preserved', 'confirmation', 'recovery', 'baselineChanges']
                manifest = {'caseOrder': order, 'uniqueRecords': 3, 'instructions': {'sha256': 'fixture'},
                            'cases': [{'id': id, 'answerFields': fields, 'maxWordsPerField': 70, 'maxTotalWords': 350} for id in order]}
                receipts, texts = {}, {}
                for id in order:
                    text = json.dumps({'kind': 'ux-series-packet', 'caseId': id, 'records': [{'source': 'facts', 'pointer': '/' + id, 'value': {'id': id}}]})
                    digest = hashlib.sha256(text.encode()).hexdigest()
                    texts[id] = text
                    receipts[id] = {'handle': 'fixture:' + digest, 'sha256': digest, 'path': str(root / (id + '.json'))}
                    (root / (id + '.json')).write_text(text, encoding='utf-8')
                schedule = ([('read', id) for id in order] + [('answer', id) for id in order] if condition == 'upfront'
                            else [(kind, id) for id in order for kind in ['read', 'answer']])
                events, responses, wire_responses, calls = [], [], [], []
                for index, (kind, id) in enumerate([('ready', None)] + schedule):
                    second = 1 + index * 2
                    call_id, response_id = 'call-' + str(index), 'response-' + str(index)
                    if kind == 'read':
                        name = 'workflow_read'
                        args = {'handle': receipts[id]['handle'], 'offset': 0, 'maxBytes': 28000}
                        output = {'handle': args['handle'], 'offset': 0, 'nextOffset': None, 'text': texts[id]}
                    else:
                        name = 'workflow_store'
                        value = {'kind': 'ux-replay-phase', 'phase': 'ux:series-ready' if kind == 'ready' else 'ux:series-result'}
                        if id:
                            value.update(caseId=id, answer={**{field: 'fixture answer' for field in fields}, 'unresolved': [], 'sourceRefs': [id]})
                        args = {'value': value}
                        output = {'handle': 'fixture:saved-' + str(index)}
                    events.extend([
                        {'timestamp': at(second + .1), 'payload': {'type': 'function_call', 'name': name, 'call_id': call_id, 'arguments': json.dumps(args)}},
                        {'timestamp': at(second + .8), 'payload': {'type': 'function_call_output', 'call_id': call_id, 'output': json.dumps(output)}}])
                    usage = {'input_tokens': 100, 'cached_input_tokens': 50, 'output_tokens': 20, 'reasoning_output_tokens': 10}
                    responses.append({'id': response_id, 'at': at(second + .7), 'usage': usage})
                    wire_responses.extend([
                        {'type': 'response.created', 'model': 'fixture-model', 'responseId': response_id, 'at': at(second)},
                        {'type': 'response.output_item.done', 'itemType': 'function_call', 'callId': call_id, 'responseId': response_id}])
                    calls.append({'start': datetime.fromisoformat(at(second + .1)).timestamp(), 'end': datetime.fromisoformat(at(second + .8)).timestamp()})
                session = root / 'session.jsonl'
                session.write_text('\n'.join(json.dumps(event) for event in events), encoding='utf-8')
                write('control.json', {'status': 'finished', 'liveUnchanged': True, 'protectedFileCount': 0,
                                      'series': {'condition': condition, 'manifest': manifest, 'instructionOverlaySha256': 'fixture', 'moduleSha256': 'fixture'},
                                      'turns': [{}], 'threadId': 'fixture-thread', 'agentStartedAt': at(0), 'agentCompletedAt': at(15),
                                      'model': 'fixture-model', 'effort': 'fixture', 'roleSha256': 'fixture', 'contractsSha256': 'fixture'})
                write('input-receipts.json', receipts)
                write('runtime-metrics.json', {'threads': [{'threadId': 'fixture-thread', 'sourceSession': str(session), 'responses': responses,
                                                          'calls': calls, 'items': [], 'usageByCompletedResponse': {'reasoning_output_tokens': 70}}]})
                write('live-request-metadata.json', {'responses': wire_responses, 'requests': [{'model': 'fixture-model', 'reasoningEffort': 'fixture'}]})
                write('series-answers.json', [{'caseId': id} for id in order])
                result = analyze(root, extract=False)
                self.assertTrue(result['protocolValid'])
                self.assertEqual(result['wholeMeasuredWindow']['usage']['reasoning_output_tokens'], 60)
                self.assertEqual(result['wholeMeasuredWindow']['toolCallsCompleted'], 6)
                self.assertEqual(sum(stage['windowIncludingInputWork']['usage']['reasoning_output_tokens'] for stage in result['stages']), 60)
                self.assertTrue(all(stage['answer']['schemaAndLengthValid'] and stage['answer']['sourceRefsValid'] for stage in result['stages']))


if __name__ == '__main__':
    unittest.main()
