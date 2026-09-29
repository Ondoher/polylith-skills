"""Combine the first matched pair without making new model calls."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / '.codex-tmp/multi-read-skill-20260929'
read = lambda path: json.loads(path.read_text(encoding='utf-8'))
names = ['inline-01', 'skill-01']
trials = [read(BASE / name / 'analysis.json') for name in names]
plans = [read(BASE / name / 'input-read-plan.json') for name in names]
assert all(trial['control']['liveUnchanged'] for trial in trials)
for key in ['roleSha256', 'contractSha256', 'contractBytes', 'inputBytes', 'readCount', 'model', 'effort']:
    assert trials[0]['control'][key] == trials[1]['control'][key], key
assert plans[0] == plans[1], 'Manifest bytes and expected pages differ'
assert trials[0]['collection']['skillReads'] == []
assert len(trials[1]['collection']['skillReads']) == 1
assert trials[1]['collection']['skillReads'][0]['completeContractObserved']
report = {
    'experiment': 'Identical multi-read contract supplied inline versus loaded as a skill',
    'status': 'complete',
    'outcome': 'Neither condition satisfied the eight-native-reads-in-one-response contract',
    'passingTrials': sum(trial['collection']['passed'] for trial in trials),
    'trialCount': len(trials),
    'matchedInputsVerified': True,
    'followupDecision': 'Stop after the first pair because both serialized. No repeats or UX authoring run.',
    'limits': [
        'One pair establishes observed failure, not a universal inability to batch.',
        'Inline stopped after two pages while skill completed eight; elapsed times are not an equal-work speed comparison.',
        'The governing role and required guidance match; preparation histories differ and are separately timed.',
        'The same role configuration records ultra; both outgoing model requests report xhigh.',
        'Loading a skill does not create a fresh model context or enforce a hard execution boundary.',
        'No review, rework, downstream assembly, canonical persistence or live-product change occurred.',
    ],
    'trials': trials,
    'preflight': read(BASE / 'preflight-01/control.json'),
}
assert report['passingTrials'] == 0
destination = ROOT / 'planning/refinement-efficiency/multi-read-skill-20260929-metrics.json'
destination.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'path': str(destination), 'bytes': destination.stat().st_size,
                  'passingTrials': report['passingTrials'], 'matchedInputsVerified': True}))
