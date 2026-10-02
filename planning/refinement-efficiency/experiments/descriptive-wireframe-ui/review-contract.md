# Isolated independent review contract

Review only the assigned exact revision and same frozen usage/scenario/research
packet. Save `review-r<N>.json` with subject SHA-256, stage, UTC start/input-ready/end,
verdict (`pass` or `revise`), scenario coverage and findings. Each finding has an ID,
source requirement/scenario reference, evidence, impact, specific correction and
route (`layout`, `ui`, or `source`). Preferences are nonblocking. Record unknown
policies as source uncertainties rather than inventing requirements.

Structural review checks complete source coverage, coherent grouping and priority,
reachable controls, context changes, focus intent and meaningful states/outcomes.
Use the description in B and structured scenes/screenshots in A. Exact font sizes,
text overflow and cosmetic spacing are UI matters. A restriction that prevents
necessary expansion may be a structural finding. Do not redesign accepted UX.

UI review must inspect actual screenshots for all assigned scenarios, compare to
the accepted layout, source and design language, and assess cohesive treatment,
credible controls, state/scope/scale distinctions, readable density, clipping,
overlap, text fit and representative longer app-defined labels. Required behavior
must be visible in comps; records merely claiming coverage are insufficient.

The two paths receive the same quality obligations. Approve only when no blocking
findings remain. Save findings as they become settled, then a final verdict. Reuse
your context for repairs in this run; check relevant corrections plus regression
of connected requirements, without repeating unrelated unchanged review.

Write only the assigned run's `reviews/` directory. Never edit an author's artifact,
fake a production receipt, view results from another run, call another model client
or mutate live product data. Experimental approval is not canonical publication.
