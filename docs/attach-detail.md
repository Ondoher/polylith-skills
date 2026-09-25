# Attach a technical white paper

[`attach-detail`](../skills/attach-detail/SKILL.md) is hosted in this repository's managed skill catalog and installed globally by the [repository installer](install-polylith-skills.md). From a product repository, use it to add a link to an existing, authored technical white paper in that product's description. The paper stays at its supplied input location; no standard input folder is required.

For example, ask Codex to use `$attach-detail` to link a named paper from a named product description. The skill locates both files, checks that the paper exists inside the same repository, and inserts a line like this under the description's technical white-papers section:

```markdown
- White paper: [Player architecture](../research/player-architecture/index.md)
```

The actual path is computed relative to the product-description file, so it may differ from this illustration. The link remains local to the repository and is checked after insertion. Reusing the skill for the same paper does not create a second link. The skill preserves the description's content, applies the working repository's local Prettier rules to the edited file, and does not create or rewrite the paper.

The link declares a source for technical analysis. It does not make the paper's proposals accepted product requirements, trigger research, or regenerate the product model, PRD, or technical guide. Refresh the product model after the description changes, then use [refine-detail](refine-detail.md) for research and revision. Technical preparation binds the current paper and its research status before [generate-technical](generate-technical.md) publishes the guide link.
