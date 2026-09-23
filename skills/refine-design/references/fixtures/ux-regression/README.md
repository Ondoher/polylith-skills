# Sanitized UX regression fixtures

These examples retain interaction structures and review findings recovered from
earlier test data. Product names have been replaced with generic example names,
source references are relative, and review subject hashes bind to the sanitized
files. Captured prompts, agent identities, invocation logs, and historical
provenance manifests are deliberately excluded.

- `checkout-a.json` and `checkout-b.json` exercise material equivalence despite
  differences in explanatory prose. Their source is `checkout-description.md`.
- `records-coherent.json` and `records-cluttered.json` exercise review validation
  against `product-description.md`. The latter includes a redundant action.
- `review-coherent.json` and `review-cluttered.json` are expected test results,
  not evidence of live reviewers passing or rejecting a product.

Keep these fixtures portable and free of private product details. Real product
evaluation evidence belongs in that product's repository.
