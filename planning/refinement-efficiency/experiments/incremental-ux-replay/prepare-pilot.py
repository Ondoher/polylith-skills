"""Prepare exact source projections for the staged-input pilot; no design output is read."""
import argparse
import hashlib
import json
from pathlib import Path
from time import perf_counter

ROOT = Path(__file__).resolve().parents[4]
SOURCES = {
    'facts': '.codex-tmp/ux-comparison-replay-20260928-160822/inputs/facts.json',
    'ux': '.codex-tmp/alexa-mcp-refinement-20260928-133745/baseline/files/product/Alexa/ux/ux-spec.json',
}
encode = lambda value: json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
sha = lambda value: hashlib.sha256(value).hexdigest()


def prepare(destination):
    started = perf_counter()
    destination.mkdir(parents=True, exist_ok=False)
    sources = {name: json.loads((ROOT / file).read_text(encoding='utf-8-sig')) for name, file in SOURCES.items()}
    model, ux = sources['facts']['productModel'], sources['ux']
    emitted = set()
    registry = {}

    def take(source, pointer, value):
        key = source + ':' + pointer
        if key in emitted:
            return None
        emitted.add(key)
        registry[key] = sha(encode(value))
        return {'source': source, 'pointer': pointer, 'value': value}

    def records(source, collection, identifiers):
        owner = model if source == 'facts' else ux
        prefix = '/productModel' if source == 'facts' else ''
        result = []
        for index, record in enumerate(owner[collection]):
            if record['id'] in identifiers:
                item = take(source, f'{prefix}/{collection}/{index}', record)
                if item:
                    result.append(item)
        assert set(identifiers) <= {r['id'] for r in owner[collection]}, (collection, identifiers)
        return result

    def requirements(ids):
        selected = [r for r in model['requirements'] if r['id'] in ids]
        claims = {ref for r in selected for ref in r['provenance']['sourceClaimRefs']}
        return records('facts', 'requirements', ids) + records('facts', 'sourceClaims', claims)

    common_requirements = ['timeline-occurrences', 'clip-persistence-invariants', 'editor-transient-context',
                           'commit-edit-availability']
    shared = [take('facts', '/productModelBinding', sources['facts']['productModelBinding']),
              take('facts', '/productModel/purpose', model['purpose']),
              take('facts', '/productModel/users', model['users'])]
    shared += requirements(common_requirements)
    shared += records('facts', 'rules', [x['id'] for x in model['rules']])
    shared += records('facts', 'gaps', ['media-repair', 'shared-clip-update-collision'])
    for key in ['sources', 'product', 'productModelBinding', 'assessment']:
        shared.append(take('ux', '/' + key, ux[key]))
    shared += records('ux', 'features', [x['id'] for x in ux['features']])
    shared += records('ux', 'openQuestions', [x['id'] for x in ux['openQuestions'] if any(s in x['id'] for s in ['media', 'clip', 'collision'])])
    shared += records('ux', 'actions', ['dismiss-editor', 'stop-preview'])
    shared += records('ux', 'surfaces', ['video-workspace'])
    shared += records('ux', 'states', [x['id'] for x in ux['states'] if x.get('ownerRef') == 'ux:surface:video-workspace'])
    # Every selected item is an exact projection. Index labels are navigation only.
    index_ids = {'video-workspace', 'timeline', 'video-status', 'dismiss-editor', 'stop-preview',
                 'undo', 'redo', 'trim-occurrence', 'open-update-clip', 'confirm-update',
                 'open-save-clip', 'name-clip', 'create-clip', 'clip-update', 'clip-create',
                 'clip-properties', 'video-view', 'edit-video', 'save-clip', 'update-clip'}
    index = {key: [{'id': r['id'], **({'name': r['name']} if 'name' in r else {})}
                   for r in ux[key] if r['id'] in index_ids]
             for key in ['surfaces', 'components', 'actions', 'interactionFrames', 'flows']}
    common = {'kind': 'pilot-shared-context', 'records': [x for x in shared if x], 'uxIndex': index,
              'scope': 'Only the three assigned clip/trim tasks; other product changes remain outside this pilot.'}
    specs = [
        ('update-clip', 'Refine Update Named Clip confirmation and its local flow against current requirements.',
         ['update-named-clip'], ['open-update-clip', 'confirm-update'], ['clip-update'], 'update-clip'),
        ('save-clip', 'Refine Save Clip to Library and its local flow, preserving the shared occurrence/library distinction.',
         ['save-library-clip', 'four-track-editing', 'precise-selection', 'range-selection'], ['open-save-clip', 'name-clip', 'create-clip'], ['clip-create'], 'save-clip'),
        ('trim-occurrence', 'Refine occurrence trimming and its editor flow steps, consistently with the two clip operations.',
         ['occurrence-trim', 'timeline-trim-push'], ['trim-occurrence', 'undo', 'redo'], ['clip-properties', 'video-view'], 'edit-video'),
    ]
    packets = []
    for number, (name, task, reqs, action_ids, frame_ids, flow_id) in enumerate(specs, 1):
        items = requirements(reqs)
        items += records('ux', 'actions', action_ids)
        items += records('ux', 'feedback', [x['id'] for x in ux['feedback'] if x['actionRef'] in action_ids])
        items += records('ux', 'interactionFrames', frame_ids)
        items += records('ux', 'patternResearch', ['shared-clip-review'] if number == 1 else ['timeline-pattern'] if number == 3 else [])
        if flow_id != 'edit-video':
            items += records('ux', 'flows', [flow_id])
        else:
            at, flow = next((i, f) for i, f in enumerate(ux['flows']) if f['id'] == flow_id)
            for key, value in flow.items():
                if key not in ['steps', 'alternates']:
                    item = take('ux', f'/flows/{at}/{key}', value)
                    if item:
                        items.append(item)
            for key in ['steps', 'alternates']:
                for i, item in enumerate(flow[key]):
                    if 'trim' in item['id']:
                        items.append(take('ux', f'/flows/{at}/{key}/{i}', item))
        packets.append({'id': name, 'ordinal': number, 'task': task,
                        'records': [x for x in items if x], 'requiredRequirementIds': reqs})
    values = {'shared': common, **{p['id']: p for p in packets}}
    for value in values.values():
        for record in value['records']:
            original = sources[record['source']]
            for part in record['pointer'].strip('/').split('/'):
                original = original[int(part)] if isinstance(original, list) else original[part]
            assert original == record['value'], 'Projection changed source meaning'
    entries = []
    for name, value in values.items():
        raw = encode(value)
        filename = name + '.json'
        (destination / filename).write_bytes(raw)
        entries.append({'id': name, 'file': filename, 'bytes': len(raw), 'sha256': sha(raw),
                        'records': len(value['records'])})
    references = ['context:document', 'element:video-workspace', 'flow:update-clip', 'flow:save-clip', 'flow:edit-video']
    manifest = {'schema': 1, 'conditionOrder': ['all', 'staged'], 'sources': {
        name: {'file': file, 'sha256': sha((ROOT / file).read_bytes())} for name, file in SOURCES.items()},
        'entries': entries, 'tasks': [{k: v for k, v in packet.items() if k != 'records'} for packet in packets],
        'references': references, 'recordHashes': registry, 'duplicateExactProjections': 0,
        'eventualInputSha256': sha(encode(values)), 'preparationMs': (perf_counter() - started) * 1000,
        'qualityRubric': [
            'Update publishes selected Start/End only; stable library identity; no existing occurrence propagation.',
            'Update eligibility excludes source rectangle, volume, mute and track settings; cancel/failure preserve context.',
            'Save clip retains composed range across four tracks and stable library identity without editing active timeline.',
            'Later additions copy definitions; ordinary trim leaves source media and library definitions unchanged.',
            'Trim preserves frame minimum, Start constraints, End push and gaps; grouped trim retains hidden parts.',
            'Dialogs stop preview; commits freeze draft-changing controls; recovery preserves selection and inputs.',
            'Flow/action/frame descriptions and references are coherent; unknowns remain explicit; unrelated work stays intact.',
        ]}
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    result = prepare(args.destination.resolve())
    print(json.dumps({key: result[key] for key in ['entries', 'duplicateExactProjections', 'eventualInputSha256', 'preparationMs']}))
