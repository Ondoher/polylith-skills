"""Build a larger, frozen UX comparison suite without making model calls."""
import argparse
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
ANCHOR = ROOT / '.codex-tmp/ux-decision-test/inputs-02'
encode = lambda value: json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
sha = lambda value: hashlib.sha256(value).hexdigest()

SPECS = [
    {
        'id': 'save-range',
        'question': 'The user selected composed-time frames 100 through 199 inclusive. The active track has a gap there, but other tracks contribute video and audio. During preview playback the user opens Save Clip to Library and supplies a valid name. Decide eligibility, what is saved, the dialog and feedback needed, and what happens during commit, on cancel, on failure and on success. Preserve the source timeline and distinguish the new library clip from later inserted occurrences. Reconcile supplied current requirements with prior UX; address only this save operation.',
        'requirements': ['save-library-clip', 'range-selection', 'four-track-editing', 'precise-selection',
                         'clip-persistence-invariants', 'commit-edit-availability', 'editor-transient-context'],
        'actions': ['open-save-clip', 'name-clip', 'create-clip'], 'frames': ['clip-create'],
        'extraRequirements': ['update-named-clip'],
        'extraActions': ['open-update-clip', 'confirm-update'], 'extraFrames': ['clip-update'],
        'rubric': [
            'Saving is eligible because the selected composed range contains media on other tracks; an empty active track is not a blocker. A wholly empty range is ineligible.',
            'Save the inclusive 100-199 range (100 frames) across all four tracks as one named reusable clip, preserving timing, gaps, framing, stacking and audio settings.',
            'Show the captured range/name and enough composed-content scope to avoid implying active-track-only saving; do not ask the user to select the internal playback construction.',
            'Opening stops preview without changing selection; cancellation returns to stopped editing without automatically restarting playback.',
            'Keep the active timeline, draft, selection and source media intact; do not replace selected content with the new library item.',
            'During commit disable edits, selection/insertion changes, Undo/Redo, competing commits and draft replacement/abandonment; do not queue edits.',
            'Before-commit cancel changes nothing; failure retains the dialog, name, range, draft and selection for correction/retry. Success identifies the created clip in the captured editor context.',
            'The library clip has stable identity; later additions are independently owned occurrence copies and do not follow subsequent library edits. Cite supplied records without inventing a naming blocker or an essential missing dependency.',
        ],
    },
    {
        'id': 'trim-group',
        'question': 'A single grouped occurrence is selected on one track. Composed-time intervals are inclusive: previous clip ends at frame 94; selected group spans 100-149; following clips span 160-179, 185-194 and 220-229. There is enough retained/underlying source content for the attempted extensions. Consider three separate attempts from this original baseline: move Start to 90, extend End to 175, or shorten End to 139. Decide the allowed results and exact affected timeline intervals, user interaction/preview and feedback, what remains preserved, cancellation/failure and undo behavior. Cover restoration of hidden grouped content. Reconcile supplied requirements with prior UX; address only trimming, not moving or updating a library clip.',
        'requirements': ['occurrence-trim', 'timeline-trim-push', 'clip-persistence-invariants',
                         'four-track-editing', 'precise-selection', 'commit-edit-availability'],
        'actions': ['trim-occurrence'], 'frames': ['clip-properties'],
        'extraRequirements': ['save-library-clip', 'range-selection', 'editor-transient-context'],
        'extraActions': ['open-save-clip', 'name-clip', 'create-clip'], 'extraFrames': ['clip-create'],
        'rubric': [
            'Exactly one editable occurrence is required and trimming is unavailable while a commit freezes editing; expose distinct Start/End handles and equivalent precise commands.',
            'Start 90 cannot apply because the previous clip ends at 94. Earliest allowed Start is 95; End stays 149. Communicate the limit without moving the preceding clip; source bounds, time zero and one-frame minimum also constrain trimming.',
            'End 175 produces group 100-175, then following clips 176-195 and 196-205. The later 220-229 clip stays put because the remaining gap absorbs the push.',
            'End 139 produces group 100-139 and leaves all following clips at their original intervals; freed time remains a gap rather than pulling clips backward.',
            'Trim a group as one occurrence; inward trimming retains excluded parts, and outward trimming restores them or available source content within the applicable bounds.',
            'Preview boundaries, pushed clips and resulting duration before completion; explain limits rather than implying overlap or silently shifting preceding clips.',
            'Treat the successful trim and required push chain as one undoable draft edit; invalid input/Escape leaves the original draft and selection. Do not promise a separate persistence transaction or unverified rollback.',
            'Keep source media and saved library definitions unchanged and preserve unrelated tracks/settings. Cite supplied records without inventing an essential missing dependency.',
        ],
    },
]


def prepare(destination):
    original = json.loads((ANCHOR / 'manifest.json').read_text(encoding='utf-8'))
    sources = {}
    for name, binding in original['sources'].items():
        raw = (ROOT / binding['path']).read_bytes()
        assert sha(raw) == binding['sha256'], 'Frozen source changed: ' + name
        sources[name] = json.loads(raw)

    def records(source, collection, ids):
        owner = sources[source]['productModel'] if source == 'facts' else sources[source]
        prefix = '/productModel' if source == 'facts' else ''
        selected = [{'source': source, 'pointer': f'{prefix}/{collection}/{i}', 'value': value}
                    for i, value in enumerate(owner[collection]) if value['id'] in ids]
        assert {r['value']['id'] for r in selected} == set(ids)
        return selected

    def requirements(ids):
        selected = records('facts', 'requirements', ids)
        claims = {ref for r in selected for ref in r['value']['provenance']['sourceClaimRefs']}
        return selected + records('facts', 'sourceClaims', claims)

    # Complete validation precedes any output; a rejected candidate leaves no partial suite.
    prepared = {}
    for spec in SPECS:
        focused = requirements(spec['requirements']) + records('ux', 'actions', spec['actions']) + records('ux', 'interactionFrames', spec['frames'])
        extras = requirements(spec['extraRequirements']) + records('ux', 'actions', spec['extraActions']) + records('ux', 'interactionFrames', spec['extraFrames'])
        keys = {(r['source'], r['pointer']) for r in focused}
        broad = focused + [r for r in extras if (r['source'], r['pointer']) not in keys]
        assert broad[:len(focused)] == focused
        for r in broad:
            value = sources[r['source']]
            for part in r['pointer'].strip('/').split('/'):
                value = value[int(part)] if isinstance(value, list) else value[part]
            assert value == r['value']
        entries, payloads = [], {}
        for condition, data in [('broad', broad), ('focused', focused)]:
            raw = encode({'kind': 'ux-decision-input', 'records': data})
            assert len(raw) <= 28000, (spec['id'], condition, len(raw))
            payloads[condition] = raw
            entries.append({'id': condition, 'file': condition + '.json', 'bytes': len(raw),
                            'sha256': sha(raw), 'records': len(data)})
        manifest = {key: original[key] for key in ['schema', 'answerFields', 'maxWordsPerField', 'maxTotalWords', 'sources']}
        manifest.update(caseId=spec['id'], question=spec['question'], rubric=spec['rubric'], entries=entries,
                        frozenAt=datetime.now(timezone.utc).isoformat(), conditionOrder=['broad', 'focused'],
                        commonRecordHashes={r['source'] + ':' + r['pointer']: sha(encode(r['value'])) for r in focused},
                        selectionNotes='Both conditions include the same decision evidence and relevant global constraints. Broad adds adjacent operation context. Exact common records, ordering and formatting are preserved.')
        prepared[spec['id']] = (manifest, payloads)

    for entry in original['entries']:
        assert sha((ANCHOR / entry['file']).read_bytes()) == entry['sha256']
    destination.mkdir(parents=True, exist_ok=False)
    anchor = destination / 'update-clip'
    anchor.mkdir()
    for filename in ['manifest.json', 'broad.json', 'focused.json']:
        shutil.copyfile(ANCHOR / filename, anchor / filename)
    for case_id, (manifest, payloads) in prepared.items():
        case = destination / case_id
        case.mkdir()
        for condition, raw in payloads.items():
            (case / (condition + '.json')).write_bytes(raw)
        (case / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    # Two new cases first provide an early read on transfer beyond the original question.
    pairs = [('save-range', 'broad', 'focused'), ('trim-group', 'focused', 'broad'),
             ('update-clip', 'broad', 'focused'), ('save-range', 'focused', 'broad'),
             ('trim-group', 'broad', 'focused'), ('update-clip', 'focused', 'broad')]
    schedule = [{'pair': i, 'case': case_id, 'replicate': 1 if i <= 3 else 2,
                 'conditions': [first, second]} for i, (case_id, first, second) in enumerate(pairs, 1)]
    suite = {'schema': 1, 'status': 'prepared-not-executed', 'frozenAt': datetime.now(timezone.utc).isoformat(),
             'inputReadLimitBytes': 28000, 'authorRuns': 12, 'earlyReportAfterPair': 2,
             'schedule': schedule, 'cases': [{'id': case_id,
                 'manifestSha256': sha((destination / case_id / 'manifest.json').read_bytes()),
                 'entries': json.loads((destination / case_id / 'manifest.json').read_text(encoding='utf-8'))['entries']}
                 for case_id in ['update-clip', 'save-range', 'trim-group']]}
    (destination / 'suite.json').write_text(json.dumps(suite, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(suite))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('destination', type=Path)
    prepare(parser.parse_args().destination.resolve())
