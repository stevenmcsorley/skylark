---
version: 1
slug: "frontend-src-ui-app-tsx"
primary_target: "frontend/src/ui/App.tsx"
related_targets: []
---

# Surface brief: Skylark app (Operate)

Visitor mode: Operate. A solo developer or small team opens Skylark after a deploy or when something breaks, to see what needs them, understand it, and get it fixed by themselves or an agent.

## Direction contract

THESIS: Skylark is a field log, not a dashboard. One question per page, answered in one sentence at the top, then ruled entries. Refuses the category default of a dark sidebar admin with KPI tiles and a rainbow of status colours.
OWN-WORLD: Cool grey-white paper (#f3f4f1) with white panels, near-black ink (#17191a) for text and primary actions, one signal vermilion (#d63a20) reserved for what needs a person (open errors, regressions, the Inbox count). Amber and sky only as level dots, deep green only as text for resolved. Hanken Grotesk throughout, tabular figures, no gradients, no shadows, 6-8px radii, 1px warm rules. Top tabs with an ink underline instead of a side rail.
STORY: Open Inbox, read one sentence ("4 open issues"), see the 24-hour chart, pick an issue, understand it from the stack, resolve it or hand it to an agent. New apps are connected from Apps, Setup.
FIRST VIEWPORT: Inbox. Wordmark and four text tabs on one ruled bar. Page title 24px with a one-line purpose. A verdict panel: the headline count at 24px left, the 24-hour bar chart right. Then status tabs, app filter, search, and a ledger table with a level word, event bar, last seen and Resolve / Hand off per row.
FORM: Field log (pinned by the user choosing it from three options; seed: none (pinned) "Field log").
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
