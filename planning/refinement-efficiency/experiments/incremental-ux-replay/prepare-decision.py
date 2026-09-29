"""Freeze one decision, two exact-source inputs and a private scoring rubric."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
SOURCES = {
    'facts': '.codex-tmp/ux-comparison-replay-20260928-160822/inputs/facts.json',
    'ux': '.codex-tmp/alexa-mcp-refinement-20260928-133745/baseline/files/product/Alexa/ux/ux-spec.json',
}
encode = lambda v: json.dumps(v, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
sha = lambda b: hashlib.sha256(b).hexdigest()


def prepare(destination):
    sources = {k: json.loads((ROOT / p).read_text(encoding='utf-8-sig')) for k, p in SOURCES.items()}
    def records(source, collection, ids):
        owner = sources[source]['productModel'] if source == 'facts' else sources[source]
        prefix = '/productModel' if source == 'facts' else ''
        found = [{'source': source, 'pointer': f'{prefix}/{collection}/{i}', 'value': r}
                 for i, r in enumerate(owner[collection]) if r['id'] in ids]
        assert {r['value']['id'] for r in found} == set(ids)
        return found

    def requirements(ids):
        selected = records('facts', 'requirements', ids)
        claims = {c for r in selected for c in r['value']['provenance']['sourceClaimRefs']}
        return selected + records('facts', 'sourceClaims', claims)

    common = requirements(['update-named-clip', 'clip-persistence-invariants'])
    common += records('facts', 'gaps', ['shared-clip-update-collision'])
    common += records('ux', 'actions', ['open-update-clip', 'confirm-update'])
    common += records('ux', 'interactionFrames', ['clip-update'])
    common += records('ux', 'openQuestions', ['shared-clip-update-collision'])
    extras = requirements(['timeline-occurrences', 'editor-transient-context', 'commit-edit-availability',
                           'save-library-clip', 'range-selection'])
    extras += records('ux', 'actions', ['open-save-clip', 'name-clip', 'create-clip'])
    extras += records('ux', 'interactionFrames', ['clip-create'])
    known = {(r['source'], r['pointer']) for r in common}
    broad = common + [r for r in extras if (r['source'], r['pointer']) not in known]
    entries = []
    destination.mkdir(parents=True, exist_ok=False)
    for condition, items in [('broad', broad), ('focused', common)]:
        for r in items:
            original = sources[r['source']]
            for part in r['pointer'].strip('/').split('/'):
                original = original[int(part)] if isinstance(original, list) else original[part]
            assert original == r['value']
        value = {'kind': 'ux-decision-input', 'records': items}
        raw = encode(value)
        assert len(raw) <= 28000, (condition, len(raw))
        (destination / (condition + '.json')).write_bytes(raw)
        entries.append({'id': condition, 'file': condition + '.json', 'bytes': len(raw),
                        'sha256': sha(raw), 'records': len(items)})
    assert broad[:len(common)] == common
    manifest = {
        'schema': 1, 'frozenAt': datetime.now(timezone.utc).isoformat(),
        'question': 'Exactly one selected occurrence is associated with a named library clip. Its Start/End and local rectangle, volume, mute and track settings have changed. Other videos already contain copies. Decide the Update Named Clip behavior: eligibility, what confirming it changes or preserves, and what its confirmation must communicate. Reconcile current requirements with the supplied prior UX. Include cancellation/failure and success feedback; identify any essential unresolved dependency.',
        'answerFields': ['eligibility', 'operation', 'preserved', 'confirmation', 'recovery', 'baselineChanges'],
        'maxWordsPerField': 70, 'maxTotalWords': 350,
        'entries': entries, 'conditionOrder': ['broad', 'focused'],
        'sources': {k: {'path': p, 'sha256': sha((ROOT / p).read_bytes())} for k, p in SOURCES.items()},
        'commonRecordHashes': {r['source'] + ':' + r['pointer']: sha(encode(r['value'])) for r in common},
        'rubric': [
            'Exactly one associated occurrence with differing Start or End enables the operation; other local settings alone do not.',
            'Only selected Start/End update the existing saved library definition, preserving stable identity.',
            'Rectangle, volume, mute and track settings are not published.',
            'All existing video occurrences, including selected and locally trimmed copies, remain unchanged; only future additions use the updated definition.',
            'Confirmation identifies the named target, shows current/proposed Start and inclusive End, and explains future-only scope.',
            'Remove follower propagation and downstream collision blocking from prior UX; no unresolved collision policy is needed.',
            'Cancel/failure changes nothing and retains draft/selection for correction or retry; success identifies updated clip and stays in editor.',
            'Cite supplied requirement and prior UX records; do not invent an essential blocker or unsupported behavior.',
        ],
        'selectionNotes': 'Focused contains complete current update/persistence requirements and their claims, old update actions/dialog/question, and superseded product gap. Broad adds adjacent editor/save/selection context; no additional unique evidence is required for the fixed decision. No historical finished answer is included.',
    }
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'destination': str(destination), 'entries': entries, 'exactSubset': True}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('destination', type=Path)
    prepare(parser.parse_args().destination.resolve())
