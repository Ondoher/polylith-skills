# Reset Design

See [Working with product-design skills](product-design.md#reset-a-design-a-fresh-sequence-with-independent-gates) for the full reset flow, fresh-agent interactions, and independent review gates.

Use this skill only when you deliberately want a product's complete derived design rebuilt from clean inputs. It is stronger than revising one component or regenerating a PRD.

## Use it

```text
Use $reset-design to rebuild the complete design for <product-topic> from its current product-description.md, including a new PRD.
```

Identify the product scope and any additional human-owned resources to preserve. Include publication explicitly if you want a new PRD.

The rebuilt data belongs in repository-root `product/<name>/`. The product name
must be clear in the human description or supplied by you; otherwise the
workflow asks. If the description lives in that directory, reset preserves it
and purges only verified derived children. It never resets the whole shared
`product/` directory or another product's data.

## What happens

The workflow preserves the exact starting product description and eligible owner resources, inventories derived output, and prepares a digest-bound removal plan. A whole-design reset includes previously accepted and locked derived decisions.

After applying the plan, it uses a new staging area and fresh specialist agents to rebuild the model, UX, visual design, UI compositions, and required components. Prior derived artifacts cannot supply design meaning or act as references. Research is performed again, and new reviews and validation must pass.

## Consequences and output

**The purge is intentionally irreversible.** It retains no migration or rollback copy. If rebuilding fails, the old derived design remains absent and the fresh run is reported as incomplete. Application code and unrelated repository content are outside scope.

A reset receipt records preserved inputs, removed roots, fresh specialist work, validation, and new artifact identities. A requested PRD uses only the new context. Text already in the human description remains input even if it originated in an earlier design conversation; Markdown cannot reliably establish historical authorship.

Use `refine-design` when you want to preserve prior decisions or reference an earlier design.

[Operational instructions](../skills/reset-design/SKILL.md) · [Incremental refinement](refine-design.md) · [All skills](../README.md)
