# Reusable MVP Evaluation

The reusable evaluation uses product-neutral fixtures. Synthetic or sanitized data may be retained for regression tests, without private product details, machine-local paths, or live-run identity metadata. Sanitized and authored expectations are test data, not evidence of historical agent behavior. Product holdouts remain outside reusable prompts, schemas, validators, expected outputs, and evaluation fixtures.

Historical agent runs, captured prompts, product descriptions, outputs, and validation receipts belong in the owning product repository under `product/<name>/evaluations/`. They are not shipped with this skill. This repository retains synthetic fixtures and executable tooling tests; those tests do not establish fresh-agent convergence or reviewer discrimination on a real product.

[Sanitized UX regression fixtures](fixtures/ux-regression/README.md) preserve useful interaction-comparison and review-validation cases from the earlier test data. Review hashes were regenerated for the sanitized inputs. Tests check material equivalence, passing and blocking receipt shapes, exact input binding, and the absence of machine-local paths. Historical provenance assertions are excluded.

The reusable cases are executable in the script suite: closed schema and imperative-validator agreement, stable identifiers, interaction pruning, semantic wireframes, hash-bound UX review receipts, UX-to-UI scope enforcement, strict UI object shapes, safe supporting-document links, contained and hash-approved image assets, durable research minimization, HTML publication, locks, partial outputs, component research, and stale/rebind/reusable artifact classification.

The current MVP does not claim usability testing, interactive accessibility certification, arbitrary natural-language semantic equivalence, generated comp image comparison, operating-system-level holdout isolation, or a distributed skills-repository installation.
