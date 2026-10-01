# Freeform amendments to a product description

The product description remains freeform Markdown. A standalone `---` can mark
a later amendment. Text following it takes precedence over earlier text wherever
it changes a requirement or answers a question. Unrelated earlier requirements
remain in force. Later amendment blocks can supersede earlier amendments.

```markdown
Saving commits the entered record immediately.

---

Save should ask for confirmation first. Cancel keeps the entered values so the
user can continue editing. The question about losing changes is resolved: closing
this confirmation must not discard the form.
```

No request IDs, status fields, fixed headings or `Supersedes` declarations are
required. Interpret the prose once in the ordinary source pass: identify what it
overrides, which questions it resolves, and what remains unchanged. The separator
does not discard the preceding document. A decorative horizontal rule does not
itself change requirements; the following text supplies the meaning.

Record source locations and resolved facts internally using the existing source
claims and stable requirement references. Downstream UX/wireframe/UI agents use
those resolved facts rather than independently reconciling old and new paragraphs.
If the amendment leaves a consequential point ambiguous, retain a repair issue
for that point and continue independent work. Do not let newer generated output
override human source text.

When the normal authorized refinement reconciles the main description, preserve
the amendment's meaning and answers. Do not rewrite the user's prose into a
required form or remove it merely because derived artifacts were generated.
