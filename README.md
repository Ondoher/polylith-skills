# Polylith Skills

Reusable Codex workflows for planning products, creating applications, and reviewing work against shared engineering standards. This repository contains skills, specialist agent definitions, and canonical documentation used across Polylith projects.

## Getting started

The two setup skills live in `.agents/skills/` and can be used from this repository before anything is installed globally.

1. Have Codex, Git, Node.js, and npm available. Clone the repository into a location you intend to keep:

   ```sh
   git clone git@github.com:Ondoher/polylith-skills.git
   cd polylith-skills
   ```

2. Open the checkout as your Codex workspace, or start Codex from that directory. Ask Codex:

   ```text
   Use $install-polylith-skills to install this repository's skills.
   ```

3. Review the installation plan and approve the disclosed changes. The installer links managed skills, agents, and documentation into your Codex home, adds a managed instructions block, restores locked skill dependencies, and checks the installation.
4. Restart Codex if needed to discover the installed skills. Open the project you want to work on and invoke a skill by name, for example:

   ```text
   Use $refine-design to develop the product description in documentation/product-description.md.
   ```

These are prompts to Codex, not shell commands. The setup skills are repository-local; the installed skills become available to your other projects. Installation uses live links, so keep this checkout in place. Codex home is selected by `CODEX_HOME`, or defaults to `~/.codex`.

For maintenance, open this checkout again and ask the local installer to inspect, repair, update, or relink the installation after relocation. To remove the integration, use `$uninstall-polylith-skills`. See the [installation guide](docs/install-polylith-skills.md) for platform requirements, ownership rules, and troubleshooting.

After new skills are added to the catalog, reconcile the installation to create
their links: use repair for changes already in your checkout, or update to pull
published changes first. Restart Codex when needed for discovery.

## Repository-local skills

| Skill | What it does |
| --- | --- |
| [install-polylith-skills](docs/install-polylith-skills.md) | Installs the toolkit and inspects, repairs, updates, or relocates its live links. |
| [uninstall-polylith-skills](docs/uninstall-polylith-skills.md) | Removes installer-owned links and instructions while preserving the checkout and unrelated configuration. |

## Installed skills

### Start and extend a project

| Skill | What it does |
| --- | --- |
| [bootstrap](docs/bootstrap.md) | Loads repository instructions and, in the standard profile, synchronizes governance and starts eligible reviewers. |
| [initialize-project](docs/initialize-project.md) | Creates the first application and development setup in an empty folder or fresh repository. |
| [create-app](docs/create-app.md) | Adds a Polylith application to an established repository, including routes, builds, tests, and standards mappings. |

### Develop and publish a product design

| Skill | What it does |
| --- | --- |
| [refine-design](docs/refine-design.md) | Develops a product brief into persisted product, UX, and UI decisions with specialist consultation. |
| [generate-prd](docs/generate-prd.md) | Publishes a static HTML product requirements document from validated design context. |
| [reset-design](docs/reset-design.md) | Discards a product's derived design and rebuilds it from the current human-owned description. |

### Maintain standards and checkpoint work

| Skill | What it does |
| --- | --- |
| [normalize-standards](docs/normalize-standards.md) | Audits and reconciles folder standards mappings and local rules with canonical standards. |
| [review-standards](docs/review-standards.md) | Coordinates specialist reviews and validates evidence against the rules assigned to each folder. |
| [write-standards-guide](docs/write-standards-guide.md) | Generates or checks the repository's human-readable `STANDARDS.md`. |
| [update-canonical-standard](docs/update-canonical-standard.md) | Promotes a local rule, or an explicitly supplied change, into a shared canonical standard. |
| [update-standards](docs/update-standards.md) | Checkpoints the complete canonical repository and publishes it to GitHub so generated guide links show the latest standards. |
| [check-point](docs/check-point.md) | Proposes a commit for the complete current repository state and creates it after explicit acceptance. |

## How the pieces fit

See the [project planning folder](planning/README.md) for roadmap notes, deferred implementation workflows, and design background.

For the product-planning counterpart, read [Working with product-design skills](docs/product-design.md). It explains specialist responsibilities, decision ownership, and interaction flows for refinement, PRD publication, and a complete design reset.

For a complete walkthrough of reviewer roles, setup, review timing, and local rules, read [Working with review agents](docs/review-agents.md). It includes example folder mappings, additions and replacements, and troubleshooting.

Use `initialize-project` for a new project and `create-app` for an additional application. Use `refine-design` to develop requirements and design artifacts, then `generate-prd` to publish them. Reserve `reset-design` for an intentional fresh start.

Product-design data lives in repository-root `product/<name>/`. If the product description does not clearly state its name, `refine-design` asks before saving. Existing human descriptions stay in place; the named folder owns the derived data and the default `prd/` publication.

For standards-driven work, `normalize-standards` establishes the initial folder mappings and local rules. `bootstrap` loads project authority and starts eligible review infrastructure; `review-standards` reviews selected work. `write-standards-guide` exposes the effective configuration to developers. `check-point` provides a separate commit review and approval step.

Generated standards guides link to canonical rules on GitHub. Use `update-standards` to commit and publish the governance checkout; existing branch-based links then show the fresh contents. Skills and reviewers continue resolving standards from local files.

The guides in `docs/` explain these workflows for people. Each links to its operational `SKILL.md`. Shared engineering rules live in [`documentation/standards/`](documentation/standards/README.md), and [`governance.json`](governance.json) is the explicit installation catalog. The [repository operating design](planning/skills-repository/README.md) explains distribution and governance in more detail.

## Run the tests

Install the locked development and skill dependencies, then run the complete repository suite:

```sh
npm ci --ignore-scripts
npm --prefix skills/refine-design ci --ignore-scripts
npm --prefix skills/generate-prd ci --ignore-scripts
npm test
```

The root command runs installer, scaffolding, standards, reset, full refinement,
and PRD publication tests. The Babel parser is a local development dependency
for the React event-check tests. Test source files under scaffolding `assets/`
are generated-project templates, exercised by scaffolding checks rather than
executed directly in this repository.
