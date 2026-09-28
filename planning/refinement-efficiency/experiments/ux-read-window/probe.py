"""Verify actual client-visible probe pages without publishing inputs or model reasoning."""
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
attempt = ROOT / '.codex-tmp/ux-read-window-20260928' / (sys.argv[1] if len(sys.argv) > 1 else 'probe-01')
read = lambda file: json.loads(file.read_text(encoding='utf-8'))
rows = lambda file: [json.loads(line) for line in file.read_text(encoding='utf-8').splitlines() if line.strip()]
stamp = lambda value: datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
control = read(attempt / 'control.json')
assert control['status'] == 'finished' and control['probe']
extractor = ROOT / '.codex-tmp/alexa-mcp-refinement-20260928-133745/collect-runtime.py'
subprocess.run([sys.executable, '-X', 'utf8', str(extractor), str(attempt)], check=True, capture_output=True, cwd=ROOT)
runtime = read(attempt / 'runtime-metrics.json')
inputs = read(attempt / 'input-receipts.json')
handles = {receipt['handle']: name for name, receipt in inputs.items()}
received = {}
output_metadata = {}
budget_overrides = []
decoder = json.JSONDecoder()

def inspect(value, call_id):
    if isinstance(value, dict):
        if value.get('handle') in handles and all(key in value for key in ['offset', 'nextOffset', 'totalBytes', 'text']):
            received[call_id] = value
            return
        for child in value.values(): inspect(child, call_id)
    elif isinstance(value, list):
        for child in value: inspect(child, call_id)
    elif isinstance(value, str) and 'handle' in value:
        offset = 0
        while offset < len(value):
            start = value.find('{', offset)
            if start < 0: break
            try: decoded, end = decoder.raw_decode(value, start)
            except json.JSONDecodeError: offset = start + 1
            else:
                inspect(decoded, call_id)
                offset = end

calls = []
items = {}
for actor in runtime['threads']:
    calls.extend(actor['calls'])
    items.update({item['callId']: item for item in actor['items'] if item.get('callId')})
    for event in rows(Path(actor['sourceSession'])):
        payload = event.get('payload', {})
        if payload.get('type') in ['custom_tool_call', 'function_call']:
            arguments = payload.get('input', payload.get('arguments', ''))
            budget_overrides.extend(re.findall(r'"?(?:max_output_tokens|max_tokens)"?\s*:\s*(\d+)', str(arguments)))
        if payload.get('type') not in ['custom_tool_call_output', 'function_call_output']: continue
        output = payload.get('output')
        serialized = json.dumps(output)
        call_id = payload.get('call_id')
        output_metadata[call_id] = {'serializedBytes': len(serialized.encode('utf-8')), 'truncationWarning': any(word in serialized for word in ['Warning: truncated output', 'tokens truncated', 'Output truncated'])}
        inspect(output, call_id)

results = []
for page in rows(attempt / 'service-observations.jsonl'):
    if page['method'] != 'read' or page['actor'] != 'assigned': continue
    at = stamp(page['startedAt'])
    candidates = [call for call in calls if call['start'] <= at <= call.get('end', call['start'])]
    assert len(candidates) == 1
    call = candidates[0]
    item = items[call['id']]
    visible = received.get(call['id'])
    source = handles[page['handle']]
    expected = Path(inputs[source]['path']).read_bytes()[page['offset']:page['offset']+page['textBytes']]
    complete = visible is not None and visible['text'].encode('utf-8') == expected
    results.append({'source': source, 'requestedBytes': page['maxBytes'], 'serverTextBytes': page['textBytes'], 'completeClientPage': complete, 'sha256': hashlib.sha256(expected).hexdigest(), 'client': output_metadata.get(call['id']), 'commandOutputSeconds': item['end']-item['start'], 'toolRoundTripSeconds': call['end']-call['start'], 'serverMs': page['serviceMs']})

assert len(results) == 8
report = {'experiment': 'Actual Codex-client first-page size probes, unchanged output allowance', 'control': control, 'inputHashes': {key: value['sha256'] for key, value in inputs.items()}, 'results': results, 'explicitOutputBudgetValues': budget_overrides, 'runtime': runtime, 'limits': ['Two real first pages at each size; not all possible data shapes or client configurations.', 'Byte-exact client log verification establishes delivered text, not later reasoning retention or design quality.']}
destination = ROOT / ('planning/refinement-efficiency/ux-read-window-20260928-' + attempt.name + '.json')
destination.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'results': results, 'explicitOutputBudgetValues': budget_overrides}))
