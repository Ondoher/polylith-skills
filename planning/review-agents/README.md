# Review Agents

The [design](design.md) defines the cross-repository reviewer architecture and the [plan](plan.md) records implementation status.

Standards applicability is folder-based:

- `agents/topics/standards/manifest.md` defines named standards sets and assigns them to folders.
- The longest matching folder assignment selects the standards for each file.
- `agents/topics/standards/overlay.md` contains repository or folder-scoped additions and replacements.
- Topics provide product and work context only.

The global `review-standards` skill owns reviewer lifecycle, normalization eligibility, formatting diagnostics and clean-completion gating, per-path routing, result consolidation, and the optional checkpoint adviser.
