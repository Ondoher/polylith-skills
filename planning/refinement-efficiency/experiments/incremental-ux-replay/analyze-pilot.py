"""Compare the matched three-task input pilot using retained first-pass telemetry."""
import argparse
import hashlib
import json
from pathlib import Path

from analyze import (activity, discovery, encode, first_pass, read,
                     result_value, rows, stamp)


def pilot_report(attempt, extract):
    report = first_pass(attempt, extract)
    control = read(attempt / 'control.json')
    manifest = control['pilot']['manifest']
    actor = next(value for value in read(attempt / 'runtime-metrics.json')['threads']
                 if value['threadId'] == control['threadId'])
    events = rows(Path(actor['sourceSession']))
    start, end = control['agentStartedAt'], control['firstFinishAt']
    found = discovery(events, stamp(start), stamp(end))
    observations = [value for value in rows(attempt / 'service-observations.jsonl')
                    if stamp(start) <= stamp(value['startedAt']) <= stamp(end)]
    phases = control['phases']

    def phase(name):
        matches = [value for value in phases if value.get('phase') == name]
        assert len(matches) == 1, (name, len(matches))
        return matches[0]

    # Phase timestamps come from the saved service receipt, never model estimates.
    ready = phase('ux:instructions-ready')['at']
    report['experiment'] = 'staged-ux-input-three-task-pilot'
    report['condition'] = control['pilot']['condition']
    report['eventualInputSha256'] = manifest['eventualInputSha256']
    report['windows'] = {'instructions': activity(actor, start, ready, found),
                         'postInstructions': activity(actor, ready, end, found)}
    report['tasks'] = []
    previous = ready
    previous_targets = {}
    for task in manifest['tasks']:
        ordinal = task['ordinal']
        inputs_ready = phase(f'ux:task-{ordinal}-inputs-ready')['at']
        complete = phase(f'ux:task-{ordinal}-complete')
        finished = complete['at']
        turns = [value for value in control['turns'] if value['ordinal'] == ordinal]
        task_observations = [value for value in observations
                             if stamp(previous) < stamp(value['startedAt']) <= stamp(finished)]
        batches = [value for value in task_observations if value.get('operation') == 'units.contribute']
        task_changes = []
        for event in events:
            payload = event.get('payload', {})
            if not (stamp(previous) < stamp(event['timestamp']) <= stamp(finished)):
                continue
            if payload.get('type') != 'function_call' or payload.get('name') != 'workflow_execute':
                continue
            args = json.loads(payload['arguments'])
            if args.get('operation') != 'units.contribute':
                continue
            for change in args.get('input', {}).get('changes', []):
                target = json.dumps([change.get('unit'), change.get('target', [])], sort_keys=True)
                fields = sorted(change.get('fields', {}))
                overlap = sorted(set(fields) & set(previous_targets.get(target, {})))
                task_changes.append({'unit': change.get('unit'), 'target': change.get('target', []),
                                     'operation': change.get('op'), 'fields': fields,
                                     'fieldValueBytes': len(encode(change.get('fields', {}))),
                                     'fieldsAlsoWrittenInEarlierTask': overlap})
        # Retain field-name overlap as a candidate revisit, not proof of rework.
        for change in task_changes:
            target = json.dumps([change['unit'], change['target']], sort_keys=True)
            previous_targets.setdefault(target, {}).update({field: ordinal for field in change['fields']})
        receipts = [result_value(attempt, control, value['handle']) for value in batches if value.get('handle')]
        batch_ids = {value.get('batchId') for value in batches}
        commands = [value for value in report['contributionCalls'] if value.get('batchId') in batch_ids]
        report['tasks'].append({
            'ordinal': ordinal, 'id': task['id'],
            'window': activity(actor, previous, finished, found),
            'beforeInputsReady': activity(actor, previous, inputs_ready, found),
            'afterInputsReady': activity(actor, inputs_ready, finished, found),
            'cumulativePostInstructionSeconds': stamp(finished) - stamp(ready),
            'cumulativeAuthorSeconds': stamp(finished) - stamp(start),
            'turns': [{key: value.get(key) for key in ['retry', 'startedAt', 'completedAt', 'resumed', 'exitCode', 'usage']}
                      for value in turns],
            'completion': {key: complete.get(key) for key in
                           ['disposition', 'batchIds', 'revisitedTasks', 'openDependencies']},
            'contributionCalls': len(batches),
            'contributionInputBytes': sum(value.get('inputBytes', 0) for value in batches),
            'contributionCommandSeconds': sum(value.get('commandStreamSeconds') or 0 for value in commands),
            'contributionServiceMs': sum(value.get('serviceMs', 0) for value in batches),
            'contributionIssues': [issue for receipt in receipts for issue in receipt.get('issues', [])],
            'changes': task_changes,
        })
        previous = finished
    report['windows']['finishAfterTasks'] = activity(actor, previous, end, found)
    assert abs(sum(task['window']['wallSeconds'] for task in report['tasks'])
               + report['windows']['finishAfterTasks']['wallSeconds']
               - report['windows']['postInstructions']['wallSeconds']) < .001

    initial = read(attempt / 'input-receipts.json')
    report['inputExposure'] = {}
    for name, receipt in initial.items():
        pages = [value for value in observations if value.get('method') == 'read'
                 and value.get('handle') == receipt['handle'] and not value.get('failed')]
        report['inputExposure'][name] = {
            'firstReadAt': min((value['startedAt'] for value in pages), default=None),
            'lastReadAt': max((value['endedAt'] for value in pages), default=None),
            'pagesByTask': {str(task['ordinal']): sum(
                stamp(task['window']['start']) <= stamp(value['startedAt']) <= stamp(task['window']['end'])
                for value in pages) for task in report['tasks']},
        }
    expected_task = {name: 1 for name in initial}
    if report['condition'] == 'staged':
        expected_task.update({task['id']: task['ordinal'] for task in manifest['tasks']})
    report['exposureProtocolPassed'] = all(
        detail['firstReadAt'] is not None
        and detail['lastReadAt'] <= phase(f'ux:task-{expected_task[name]}-inputs-ready')['at']
        and detail['firstReadAt'] >= report['tasks'][expected_task[name] - 1]['window']['start']
        for name, detail in report['inputExposure'].items())
    report['extraContextRequests'] = [{key: value.get(key) for key in ['at', 'packetIds', 'reason']}
                                     for value in phases if value.get('phase') == 'ux:pilot-needs']
    report['reportedTurnUsage'] = [{key: value.get(key) for key in ['ordinal', 'retry', 'usage']}
                                  for value in control['turns']]
    report['reportedUsageFinal'] = control['turns'][-1].get('usage')
    report['usageInterpretation'] = (
        'CLI turn.completed usage is cumulative across these resumed turns; do not add it. '
        'Author-window usage sums unique runtime response counters completed by first finish. '
        'Final CLI usage also includes the final acknowledgement after that boundary.')
    finish_receipt = result_value(attempt, control, control['firstFinishHandle'])
    report['finishIssues'] = finish_receipt.get('issues', [])
    imported_receipt = read(attempt / 'imported-units-receipt.json')
    baseline = {f"{unit['kind']}:{unit['id']}": unit
                for unit in result_value(attempt, control, imported_receipt['handle'])}
    unit_directory = Path(control['workspace']) / '.codex-tmp/mcp-workflows/runs' / control['run'] / 'units/ux'
    saved = {key: read(unit_directory / (key.replace(':', '.', 1) + '.json'))
             for key in baseline if (unit_directory / (key.replace(':', '.', 1) + '.json')).exists()}
    assigned = set(manifest['references'])
    report['preservation'] = {
        'baselineUnits': len(baseline), 'retainedUnits': len(saved),
        'finishReceiptAssignedUnits': len(finish_receipt.get('saved', [])),
        'changedAssignedUnits': [key for key in saved if key in assigned and saved[key].get('data') != baseline[key].get('data')],
        'changedUnassignedUnits': [key for key in saved if key not in assigned and saved[key].get('data') != baseline[key].get('data')],
        'missingUnits': sorted(set(baseline) - set(saved)),
    }

    def dangling_questions(units):
        known = {value['id'] for value in units['context:document']['data']['document']['openQuestions']}
        failures = []

        def visit(unit, value, location):
            if isinstance(value, dict):
                for key, child in value.items():
                    if key == 'questionRefs' and isinstance(child, list):
                        failures.extend({'unit': unit, 'path': location + '/questionRefs', 'reference': ref}
                                        for ref in child if ref not in known)
                    else:
                        visit(unit, child, location + '/' + key)
            elif isinstance(value, list):
                for index, child in enumerate(value):
                    visit(unit, child, location + '/' + str(index))

        for key, value in units.items():
            visit(key, value['data'], '')
        return failures

    inherited = dangling_questions(baseline)
    report['newDanglingQuestionReferences'] = [value for value in dangling_questions(saved) if value not in inherited]
    report['limits'] = report['limits'][:-3] + [
        'One matched three-task pair; order, provider variation, cache effects and different authored decisions remain uncontrolled.',
        'Both conditions retain earlier packets in the same thread. Staged input changes exposure timing, not maximum accumulated context.',
        'Task windows include collection, command generation, tool intervals, acknowledgements and continuation gaps. They are not pure reasoning.',
        'Parent rubric inspection is scoped experiment assessment, not independent UX review or product acceptance.',
        'Earlier-task field overlap identifies possible revisions; receipts and authored meaning determine whether it is actual rework.',
        'No prompt, capability, full argument body or raw reasoning is copied into this report.',
    ]
    report['evidence'] = {name: {'sha256': hashlib.sha256((attempt / name).read_bytes()).hexdigest(),
                               'bytes': (attempt / name).stat().st_size}
                          for name in ['control.json', 'runtime-metrics.json', 'live-request-metadata.json',
                                       'service-observations.jsonl', 'contracts.json', 'input-receipts.json',
                                       'pilot-progress.jsonl'] if (attempt / name).exists()}
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('all', type=Path)
    parser.add_argument('staged', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--reuse-runtime', action='store_true')
    args = parser.parse_args()
    assert not args.output.exists(), 'Preserve saved reports; use a new output path'
    a, b = [pilot_report(value.resolve(), not args.reuse_runtime) for value in [args.all, args.staged]]
    assert [a['condition'], b['condition']] == ['all', 'staged']
    assert a['eventualInputSha256'] == b['eventualInputSha256']
    assert a['inputIdentities'] == b['inputIdentities']
    assert a['actualRuntimeModel'] == b['actualRuntimeModel']
    assert a['actualRuntimeEffort'] == b['actualRuntimeEffort']
    assert a['roleSha256'] == b['roleSha256']
    assert a['guidanceSha256'] == b['guidanceSha256']
    assert all(value['clientExactCoverage'] for report in [a, b] for value in report['inputCollection'].values())
    comparisons = {}
    for name, x, y in [
        ('authorSeconds', a['authorWindow']['wallSeconds'], b['authorWindow']['wallSeconds']),
        ('postInstructionSeconds', a['windows']['postInstructions']['wallSeconds'], b['windows']['postInstructions']['wallSeconds']),
        ('contributionCommandSeconds', a['contributionTiming']['commandStreamSeconds'], b['contributionTiming']['commandStreamSeconds']),
        ('preparationThroughDeliverySeconds', a['preparationThroughDeliverySeconds'], b['preparationThroughDeliverySeconds']),
    ]:
        comparisons[name] = {'all': x, 'staged': y, 'stagedReductionPercent': 100 * (x - y) / x if x else None}
    output = {'experiment': 'staged-ux-input-three-task-pilot', 'order': ['all', 'staged'],
              'all': a, 'staged': b, 'comparison': comparisons}
    args.output.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(args.output), 'comparison': comparisons}))


if __name__ == '__main__':
    main()
