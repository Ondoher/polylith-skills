# Larger UX input-reasoning suite: early report

Four of twelve scheduled authors completed on 2026-09-29. Both new cases show
less reported reasoning with focused context and equal frozen-rubric coverage.
This is the planned early checkpoint; the remaining eight authors continue.

| Case       | Reasoning broad / focused | Reduction | Seconds broad / focused | Reduction | Quality  |
| ---------- | ------------------------: | --------: | ----------------------: | --------: | -------- |
| save-range |               1,436 / 977 |     32.0% |             64.5 / 51.2 |     20.6% | 8/8 each |
| trim-group |             1,907 / 1,466 |     23.1% |             80.1 / 66.1 |     17.4% | 8/8 each |

Save Clip answers contain 321 and 316 prose words; both trimming answers contain 306. All four use one exact complete input read and one first saved answer, with
matching role/model/effort/operation contracts. No repair, extra product read or
missing essential dependency occurred. The trimming pair ran focused first; the
Save Clip pair ran broad first. Live-data guards preserved all 611 protected files.

The primary interval begins at the actual client-visible input receipt and ends
at the saved-answer result. Startup and acknowledgement are excluded here and
retained separately in the metrics. Reasoning counters are effort proxies; this
small sample does not isolate pure comprehension or eliminate provider/cache noise.

There were 5786 decision reasoning tokens across these four authors. The historical
positive pair is excluded. No additional paid runs beyond the frozen 12-run schedule
are justified merely by this favorable early result.

- [Plan](ux-input-reasoning-suite-plan.md).
- [Accumulating metrics](ux-input-reasoning-suite-metrics.json).
- Frozen early snapshot: `.codex-tmp/ux-decision-suite/early-metrics.json`.
- Early snapshot SHA256: `80d3a0d77c5b70bc485f485cbc6776f94228a7509b3f7ded23968a14fd2cff46`.
