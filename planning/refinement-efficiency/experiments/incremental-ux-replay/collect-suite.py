"""Collect completed, already analyzed suite runs; never start or repeat an author."""
import argparse
import hashlib
import json
import statistics
from datetime import datetime, timezone
from pathlib import Path

read = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))


def collect(directory, output):
    suite = read(directory / 'inputs-01/suite.json')
    quality_path = directory / 'quality.json'
    quality = read(quality_path) if quality_path.exists() else {}
    runs, pairs = [], []
    for pair in suite['schedule']:
        members = {}
        for condition in pair['conditions']:
            identity = f"{pair['case']}-r{pair['replicate']}-{condition}"
            metric = directory / 'metrics' / (identity + '.json')
            if not metric.exists():
                continue
            value = read(metric)
            value.update(pair=pair['pair'], case=pair['case'], replicate=pair['replicate'],
                         identity=identity, quality=quality.get(identity),
                         metricSha256=hashlib.sha256(metric.read_bytes()).hexdigest())
            runs.append(value)
            members[condition] = value
        if set(members) != {'broad', 'focused'}:
            continue
        a, b = members['broad'], members['focused']
        matched = all(a[k] == b[k] for k in ['model', 'configuredEffort', 'effectiveWireEfforts', 'roleSha256', 'contractsSha256'])
        complete = all(r['input']['reads'] == 1 and r['input']['clientExact'] for r in [a, b])
        answer_contract = all(r['answer']['schemaAndLengthValid'] and r['answer']['sourceRefsValid'] and not r['answer']['unresolvedCount'] for r in [a, b])
        quality_pass = all(r.get('quality') and r['quality'].get('criteria') == ['pass'] * 8 for r in [a, b])
        pairs.append({'pair': pair['pair'], 'case': pair['case'], 'replicate': pair['replicate'],
                      'order': pair['conditions'], 'settingsMatched': matched, 'deliveryMatched': complete,
                      'answerContractMatched': answer_contract, 'qualityMatched': quality_pass,
                      'eligibleForQualityMatchedSummary': matched and complete and answer_contract and quality_pass,
                      'reasoningReductionPercent': 100 * (1 - b['decisionUsage']['reasoning_output_tokens'] / a['decisionUsage']['reasoning_output_tokens']) if a['decisionUsage']['reasoning_output_tokens'] else None,
                      'decisionTimeReductionPercent': 100 * (1 - b['decisionWindow']['wallSeconds'] / a['decisionWindow']['wallSeconds'])})
    eligible = [p for p in pairs if p['eligibleForQualityMatchedSummary']]
    numeric = [p['reasoningReductionPercent'] for p in eligible if p['reasoningReductionPercent'] is not None]
    all_numeric = [p['reasoningReductionPercent'] for p in pairs if p['reasoningReductionPercent'] is not None]
    report = {'status': 'complete' if len(runs) == 12 and all(r.get('quality') for r in runs) else 'in-progress',
              'capturedAt': datetime.now(timezone.utc).isoformat(), 'plannedAuthorRuns': 12,
              'analyzedAuthorRuns': len(runs), 'qualityAssessedRuns': sum(bool(r.get('quality')) for r in runs),
              'suiteSha256': hashlib.sha256((directory / 'inputs-01/suite.json').read_bytes()).hexdigest(),
              'schedule': suite['schedule'], 'runs': runs, 'pairs': pairs,
              'allPairsDescriptiveSummary': {'pairs': len(pairs),
                  'medianReasoningReductionPercent': statistics.median(all_numeric) if all_numeric else None,
                  'medianDecisionTimeReductionPercent': statistics.median(p['decisionTimeReductionPercent'] for p in pairs) if pairs else None,
                  'note': 'Includes quality failures. Descriptive timing evidence, not a claim of equivalent output quality.'},
              'qualityMatchedSummary': {'pairs': len(eligible),
                  'medianReasoningReductionPercent': statistics.median(numeric) if numeric else None,
                  'medianDecisionTimeReductionPercent': statistics.median(p['decisionTimeReductionPercent'] for p in eligible) if eligible else None},
              'totals': {'decisionReasoningTokens': sum(r['decisionUsage']['reasoning_output_tokens'] for r in runs),
                         'wholeAuthorUsage': {key: sum(r['wholeAuthorUsage'][key] for r in runs) for key in ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens']},
                         'wholeAuthorSeconds': sum(r['wholeAuthorSeconds'] for r in runs),
                         'decisionSeconds': sum(r['decisionWindow']['wallSeconds'] for r in runs)},
              'limits': ['Historical positive pair is excluded.', 'One read and fixed output obligations do not make generated answers or startup context byte-identical.', 'Two pairs per case remain a small sample; cache/provider variation remains.', 'Quality is parent scoring against frozen rubrics, not a separate model review.', 'Reasoning tokens and observed streams are proxies, not isolated comprehension measurements.']}
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    for r in runs:
        print(json.dumps({'identity': r['identity'], 'reasoningTokens': r['decisionUsage']['reasoning_output_tokens'],
                          'decisionSeconds': r['decisionWindow']['wallSeconds'],
                          'criteriaPassed': r['quality']['criteria'].count('pass') if r.get('quality') else None,
                          'answerContractValid': r['answer']['schemaAndLengthValid'] and r['answer']['sourceRefsValid']}))
    print(json.dumps({'status': report['status'], 'analyzed': len(runs), 'pairs': pairs,
                      'allPairsDescriptiveSummary': report['allPairsDescriptiveSummary'],
                      'qualityMatchedSummary': report['qualityMatchedSummary'], 'totals': report['totals']}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('directory', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    collect(args.directory.resolve(), args.output.resolve())
