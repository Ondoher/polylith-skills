"""Publish metadata from completed replay segments; never copy product payloads."""
import hashlib
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
ATTEMPTS = ROOT / '.codex-tmp/ux-full-native-20260929'
read = lambda path: json.loads(path.read_text(encoding='utf-8-sig'))
stamp = lambda value: datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
segments = [read(ATTEMPTS / name / 'replay-metrics.json') for name in ['full-01', 'full-02']]
first, last = [segment['control'] for segment in segments]
assert first['status'] == 'interrupted-for-repair-delivery-change'
assert last['status'] == 'finished' and last['exitCode'] == 0
assert all(segment['control']['liveUnchanged'] for segment in segments)
workspace = Path(last['workspace'])
run = workspace / 'product/Alexa/runs/ux-full-native-replay'
completion = read(run / 'completion.json')
assert completion['completed'] is True
review = read(run / 'reviews/review-2/review.json')
ux_file = workspace / 'product/Alexa/ux/ux-spec.json'
assert review['verdict'] == 'pass' and not review['findings']
assert hashlib.sha256(ux_file.read_bytes()).hexdigest() == review['subject']['uxArtifact']['sha256']
reuse = read(run / 'final-unit-preservation.json')
assert reuse['changed'] == 4 and reuse['reused'] == 12
assert next(actor for actor in segments[0]['actors'] if actor['role'] == 'ux-planner')['allInitialPagesReceived']
assert all(page['byteExact'] is not False for segment in segments
           for actor in segment['actors'] for page in actor['readVerification'])

markers = {item['phase']: item['endedAt'] for segment in segments for item in segment['phaseMarkers']}
boundaries = [
    ('Supervisor setup', first['requestedAt']),
    ('Parent/author preparation and instruction loading', first['agentStartedAt']),
    ('Initial author input collection', markers['ux:instructions-ready']),
    ('Comparison handoff', markers['ux:inputs-ready']),
    ('Initial comparison and preliminary decisions', markers['ux:comparison-start']),
    ('Initial generation, further reads and self-correction', markers['ux:decisions-ready']),
    ('Structural repairs, persistence and review preparation', markers['ux:delivered']),
    ('First review including preparation, collection and delivery', markers['review-1:review-start']),
    ('Review inspection and initial repair dispatch before interruption', markers['review-1:review-delivered']),
    ('Intentional interruption and resume setup', first['agentCompletedAt']),
    ('Resume coordination and original author recovery', last['agentStartedAt']),
    ('Research and repair decisions', markers['ux-file-repair-1:repair-start']),
    ('Mechanical repair generation and delivery', markers['ux-file-repair-1:decisions-ready']),
    ('Linkage correction, validation, persistence and review preparation', markers['ux-file-repair-1:repair-delivered']),
    ('Second review including preparation, collection and delivery', markers['review-2:review-start']),
    ('Final receipt validation, preservation checks and reporting', markers['review-2:review-delivered']),
    ('End', last['agentCompletedAt']),
]
timeline = [{'phase': name, 'start': start, 'end': end, 'seconds': stamp(end) - stamp(start)}
            for (name, start), (_, end) in zip(boundaries, boundaries[1:])]
assert all(item['seconds'] >= 0 for item in timeline)

report = {
    'experiment': 'Full isolated UX replay, native configuration, inline then file-backed repair',
    'status': 'complete',
    'generatedAt': datetime.now().astimezone().isoformat(),
    'scope': 'Complete UX authoring, validation, persistence, independent review and repair; no UI or live promotion',
    'outcome': {
        'uxRevision': review['subject']['uxArtifact']['revision'],
        'reviewVerdict': review['verdict'],
        'reviewFindings': len(review['findings']),
        'reviewSubject': review['subject'],
        'changedUnits': reuse['changed'],
        'reusedUnits': reuse['reused'],
        'liveUnchanged': True,
        'protectedFileCount': last['protectedFileCount'],
        'completionPath': str(run / 'completion.json'),
        'completionSha256': hashlib.sha256((run / 'completion.json').read_bytes()).hexdigest(),
    },
    'elapsed': {
        'supervisorSetupSeconds': stamp(first['agentStartedAt']) - stamp(first['requestedAt']),
        'initialClientSeconds': stamp(first['agentCompletedAt']) - stamp(first['agentStartedAt']),
        'interruptionAndResumeSetupSeconds': stamp(last['agentStartedAt']) - stamp(first['agentCompletedAt']),
        'resumedClientSeconds': stamp(last['agentCompletedAt']) - stamp(last['agentStartedAt']),
        'firstDispatchToFinalClientCompletionSeconds': stamp(last['agentCompletedAt']) - stamp(first['agentStartedAt']),
        'requestToFinalClientCompletionSeconds': stamp(last['agentCompletedAt']) - stamp(first['requestedAt']),
    },
    'nonoverlappingTimeline': timeline,
    'limits': [
        'Initial 19 author reads were serial despite parallel_tool_calls=true; later author reads batched up to five.',
        'File-backed repair changed the experiment protocol after the first review; this is not a paired transport-speed comparison.',
        'Actor windows overlap. Idle specialists can have large window gaps; active-turn fields separate recorded activity.',
        'Output-item intervals measure command streams, not pure computation or network transfer.',
        'The early decisions-ready marker does not mean all useful design reasoning ended there.',
        'Token counts are repeated context accounting, include cached input, and are not dollar charges.',
        'Metrics stop at isolated client completion; supervisor analysis, reporting and checkpoint time are excluded.',
    ],
    'segments': segments,
}
target = ROOT / 'planning/refinement-efficiency/ux-full-native-replay-20260929-metrics.json'
target.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'path': str(target), 'bytes': target.stat().st_size,
                  'elapsed': report['elapsed'], 'outcome': report['outcome']}))
