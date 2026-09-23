# PRD Organization

The generated PRD is a combined product and application-design review surface.
Use a breadth-first main path so a reviewer sees the complete product at each
level before entering the next level of detail.

## Research Summary

Conventional PRD templates generally move from broad intent to narrower
requirements. Atlassian begins with objectives, success measures, assumptions,
and requirement options before supporting UX material. Aha! recommends vision,
users, use cases, and core capabilities before release, epic, and feature
requirements. These templates do not normally prescribe a screen-by-screen
spatial order.

Application-design systems add the missing spatial layer. IBM Carbon treats the
global shell as the orienting frame for navigation and persistent actions, then
distinguishes local product areas and task content. Its layout guidance names
header, navigation, content, footer, and dialogs as screen regions. GOV.UK
service guidance likewise recommends understanding the complete end-to-end
experience before optimizing an isolated part.

Sources:

- Atlassian, Product requirements document template:
  https://www.atlassian.com/software/confluence/templates/product-requirements
- Aha!, Product requirements document template:
  https://www.aha.io/roadmapping/guide/templates/create/prd
- IBM Carbon, Global header and UI shell:
  https://carbondesignsystem.com/patterns/global-header/
- IBM Carbon, Grid screen regions:
  https://carbondesignsystem.com/elements/2x-grid/overview/
- GOV.UK, Designing good government services:
  https://www.gov.uk/service-manual/design/introduction-designing-government-services

## Selected Structure

Keep the product orientation concise in the document header, then order the
main document as follows:

1. Application organization: shell, navigation, workspace, persistent regions,
   and every activity area.
2. Product capabilities: introduce every peer capability at equal depth.
3. Work surfaces: cover every window, page, tab, dialog, or other major surface,
   including its regions in reading and task order.
4. Workflows: describe goal-oriented interactions, alternatives, cancellation,
   failure, and recovery.
5. Component behavior: give the deepest reusable or specialized UI contracts,
   states, and detailed behavior.
6. Open product and UX questions.

Within one surface, top-to-bottom region order is appropriate because it
explains that surface's anatomy. Across the document, do not complete one
feature's surfaces, workflows, and components before introducing peer features.
Depth-first packets remain suitable for a later implementation plan focused on
one deliverable; they are not the default whole-product PRD order.
