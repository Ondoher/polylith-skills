---
name: attach-detail
description: Link an existing authored technical white paper from a product description. Use when the owner asks to attach or register a focused technical detail document; do not research or revise the paper.
---

# Attach Detail

Add a labeled link to one existing technical white paper in the human-owned product description. This is a small source-document edit, not technical analysis or publication.

Locate the description and paper from the user's request and repository context. If either is ambiguous, resolve it from existing documents or ask for the missing identity. Accept the authored paper at its supplied location; there is no standard input folder. Preserve its location. Generated `documents/<product>/<doc-name>/` folders are output only and must not become the canonical home of authored inputs. Check that the entry page exists, is a regular file, and resolves inside the repository, including through linked path segments. Do not create an empty paper or link to a proposed one.

Use this Markdown form, normally as a bullet under an existing technical-details section or a short `## Technical white papers` section:

```markdown
- White paper: [Descriptive title](relative/path/to/index.md)
```

Compute the link target relative to the _description file's directory_, with forward slashes. Keep it repository-relative; never write a drive path, `file:` URI, or remote URL. Use the paper's actual entry filename if it is not `index.md`. Preserve all existing description content outside the minimal insertion and formatter changes. If that paper is already linked, do not add a duplicate; correct its label or target only when needed. Resolve the resulting link from the description's directory before finishing.

Before finishing, format the edited description with the working repository's installed Prettier and resolved configuration, then check that exact file. Formatting may adjust surrounding whitespace; preserve all content and verify the paper link after formatting. If the repository declares Prettier but its local executable is unavailable, stop and report the missing installation rather than using a global formatter.

Report the description and linked paper paths. This declaration does not import paper claims into the product model or make them accepted requirements. Existing derived product and technical artifacts may be stale after the description changes; report that fact without automatically rebuilding them. Research, semantic-preserving paper revision, and publication links belong to the later white-paper workflow.
