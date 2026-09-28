"""Record the bounded native-tool exposure probes without publishing private prompts."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / '.codex-tmp/ux-read-window-20260928'
read = lambda file: json.loads(file.read_text(encoding='utf-8'))
rows = lambda file: [json.loads(line) for line in file.read_text(encoding='utf-8').splitlines() if line.strip()]
extractor = ROOT / '.codex-tmp/alexa-mcp-refinement-20260928-133745/collect-runtime.py'
attempts = []
for name in ['native-default-01', 'native-host-off-01']:
    attempt = BASE / name
    control = read(attempt / 'control.json')
    assert control['nativeProbe'] and control['status'] == 'native-unavailable'
    subprocess.run([sys.executable, '-X', 'utf8', str(extractor), str(attempt)], check=True, capture_output=True, cwd=ROOT)
    runtime = read(attempt / 'runtime-metrics.json')
    assert len(runtime['threads']) == 1
    actor = runtime['threads'][0]
    assert actor['model'] == 'gpt-6-astra' and actor['effort'] == 'xhigh'
    assert actor['calls'] == [], 'Native-unavailable probe must not substitute wrapper calls'
    observations = rows(attempt / 'service-observations.jsonl')
    assert not any(item['method'] == 'read' for item in observations)
    result = (attempt / 'result.md').read_text(encoding='utf-8').strip()
    assert result == 'NATIVE_UNAVAILABLE: MCP tools are exposed only through the code wrapper.'
    attempts.append({'attempt': name, 'control': control, 'reportedResult': result, 'modelToolCalls': 0, 'dataReads': 0, 'inputHashes': {key: value['sha256'] for key, value in read(attempt / 'input-receipts.json').items()}, 'runtime': runtime})

catalog = read(Path.home() / '.codex/models_cache.json')
model = next(item for item in catalog['models'] if item['slug'] == 'gpt-6-astra')
report = {
    'experiment': 'Native independent MCP tool-call exposure in the installed client',
    'modelCatalogMetadata': {'slug': model['slug'], 'tool_mode': model['tool_mode']},
    'attempts': attempts,
    'officialReferences': ['https://developers.openai.com/api/docs/guides/function-calling', 'https://developers.openai.com/api/docs/guides/tools-programmatic-tool-calling'],
    'tooling': {str(file.relative_to(ROOT)): hashlib.sha256(file.read_bytes()).hexdigest() for file in [Path(__file__), Path(__file__).with_name('native-assignment.md'), Path(__file__).parent.parent / 'ux-collection-phase/run.mjs', extractor]},
    'limits': ['These probes establish that no native call path was exercised under the two tested configurations; no separate-envelope size or throughput measurement occurred.', 'Client model metadata and the agents stated exposure limitation agree, but these observations are not a proof that no other client configuration or implementation can expose direct calls.', 'No different model, model-catalog override, direct Responses API application, global configuration edit or output-limit increase was attempted.'],
}
destination = ROOT / 'planning/refinement-efficiency/ux-native-mcp-20260928-metrics.json'
assert not destination.exists(), 'Preserve existing experiment evidence'
destination.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'modelCatalogMetadata': report['modelCatalogMetadata'], 'attempts': [{'attempt': item['attempt'], 'status': item['control']['status'], 'clientSeconds': item['control']['agentWindowMs']/1000, 'modelToolCalls': item['modelToolCalls'], 'dataReads': item['dataReads']} for item in attempts]}))
