---
name: Skylark
description: A self-hosted error monitor set as a printed field log: paper, ink, ruled entries, one vermilion signal.
colors:
  paper: "#f3f4f1"
  panel: "#ffffff"
  ink: "#17191a"
  ink-soft: "#262a27"
  ink-muted: "#3c413c"
  ink-quiet: "#565c55"
  ink-faint: "#6a7068"
  rule-strong: "#a9aea5"
  rule: "#cdd0c8"
  slip: "#e7e9e3"
  signal-vermilion: "#d63a20"
  signal-vermilion-text: "#b42d1c"
  signal-vermilion-deep: "#b8301b"
  level-amber: "#c07f00"
  level-sky: "#3a7fb1"
  resolved-green: "#2c6b45"
typography:
  headline:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 14px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    height: "32px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.signal-vermilion-text}"
    rounded: "{rounded.md}"
    height: "32px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "20px"
  control:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  inbox-count:
    backgroundColor: "{colors.signal-vermilion}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
---

# Design System: Skylark

## Overview

**Creative North Star: "The Field Log"**

Skylark reads as a printed log book, not a dashboard. Cool grey-white paper carries white panels laid on it, text and primary actions are near-black ink, and ruled entries replace cards and tiles. Each page states its one question in a 24px title and a one-sentence purpose, then answers it in rows.

Colour has jobs. Ink does everything that is interactive and primary; vermilion appears only for what needs a person (open errors, regressions, the Inbox count, destructive). Amber and sky are level dots only; deep green is resolved text only. The surface is flat: borders, not shadows; no gradients.

**Key Characteristics:**
- Paper, white panel, ink; no dark chrome, no side rail.
- Top text tabs with a 2px ink underline on one ruled bar.
- Hanken Grotesk only, tabular figures in tables.
- Density is quiet and scannable: 14px body, 12px labels, 48px ledger rows.
- Real numbers only; empty states say so and show the next step.

## Colors

A cool paper palette with one hot signal. The palette is a turned-over slate scale: the class names `slate-900/950/100` mean paper, panel, and ink respectively (see tailwind.config.ts); read them that way.

### Primary
- **Ink** (#17191a): body text, primary buttons, active-tab underline, focus ring, selection, checkbox accent. Accent equals ink; there is no second brand hue.

### Secondary
- **Signal Vermilion** (#d63a20): open errors in the event bars, the Inbox count pill, the logo dot. Text on paper uses the darker red (#b42d1c) for contrast; destructive buttons use that darker red on a transparent ground.

### Tertiary
- **Level Amber** (#c07f00) and **Level Sky** (#3a7fb1): 8px level dots for warning and info only.
- **Resolved Green** (#2c6b45): resolved/healthy as text and small marks, never a fill.

### Neutral
- **Paper** (#f3f4f1): page background.
- **Panel White** (#ffffff): tables, forms, top bar, inputs.
- **Slip** (#e7e9e3): code slips (at 60% opacity), selected rows, modal surface, bulk-action bar.
- **Rules** (#cdd0c8 hairlines, #a9aea5 control borders and chart baseline).
- **Text ramp**: ink (#17191a) primary, #3c413c and #565c55 secondary, #6a7068 for the quietest labels.

### Named Rules
**The Signal Rule.** Vermilion marks only what needs a person. If everything is red, nothing is.
**The Dot Rule.** Level colour is a small solid dot beside a word, never a filled pill or a row tint.

## Typography

**Display Font:** Hanken Grotesk (variable 100-900, self-hosted woff2, fallback ui-sans-serif, system-ui)
**Body Font:** Hanken Grotesk
**Label/Mono Font:** same family; code uses the platform monospace stack.

**Character:** One humanist grotesk at a few weights. Hierarchy comes from size and weight steps, not from a second face.

### Hierarchy
- **Headline** (600, 24px, tight -0.025em): page titles via PageHeader.
- **Title** (600, 18px): panel headings, dialog titles.
- **Body** (400/500, 14px): rows, forms, paragraphs; purpose lines are capped at 62ch.
- **Label** (500, 12px): table headers (sentence case, muted), counts, timestamps, chart scale.

### Named Rules
**The Tabular Rule.** Numbers in tables (`td`) are tabular so columns of counts align.

## Layout

A single column, max 1180px, centred, with 16px (24px from sm) side gutters and 32px top padding. The top bar is full-width white with a 1px rule; wordmark left, four text tabs, workspace menu right; tabs wrap below the wordmark on narrow screens and scroll horizontally. Pages stack PageHeader (24px bottom margin), optional section tabs, then content on a 16px rhythm. Ledger tables hide secondary columns progressively (sm, md, lg breakpoints) rather than reflowing into cards. Tap targets in navigation are at least 44px tall.

## Elevation & Depth

Flat. Depth is tonal and ruled: paper under white panels with 1px borders, slip for selection. No gradients. The modal sits on a black 60% backdrop with a border and no shadow. Focus is a 2px ink outline with 2px offset.

### Named Rules
**The Flat Rule.** Surfaces carry no shadow at rest or on hover; separation is a 1px rule or a tonal step.

## Shapes

Small, quiet radii: 6px (md) on buttons and inputs, 8px (lg) on panels, tables and the modal, 4px on inline slips, full round only for the count pill and level dots. Borders are always 1px in rule colours; the only 2px lines are the active-tab underline and focus ring.

## Components

### Buttons
- **Shape:** 6px radius, medium weight, 32px high (md; xs 24, sm 28, lg 40).
- **Primary:** ink fill, white text; hover goes to pure black.
- **Secondary:** 1px rule border, transparent, ink-soft text; hover fills slip.
- **Ghost:** no border, muted text; used for per-row Resolve and Hand off.
- **Danger:** transparent with a faint vermilion border and vermilion text.
- **Disabled:** slip fill, muted text, no hover.
- **Focus:** 2px ring with an offset in the paper colour.

### Navigation
TopNav and SectionTabs share one grammar: sentence-case 14px medium text, muted at rest, ink with a 2px ink bottom border when active (aria-current), 44px minimum height. The Inbox tab carries a vermilion count pill (white 12px semibold tabular).

### Ledger Table (signature)
White panel, 1px border, 8px radius, 48px rows divided by hairlines, 12px muted header row, level as dot plus word, Resolve / Hand off ghost buttons at row end, status filter as a segmented control (active segment inked, 2px inset padding). Keyboard: j/k move, x select, e resolve, Enter open.

### Event Bars (signature)
Plain bars on a 1px baseline, 2px gaps: errors in vermilion stacked on other events in grey (#6a7068), the scale written as "max N", start and end labels beneath, a hidden table for screen readers. No smoothing or gradients.

### Inputs / Fields
36px high, white fill, 1px rule border (#a9aea5), 6px radius, 14px ink text; shared focus ring. Errors appear as 14px vermilion text beneath.

### Panels and Empty States
White, 1px border, 8px radius, 20-24px padding; an 18px title, a 14px sentence at most 60ch, then one form or action.

### Modal
Slip surface, 1px border, 8px radius, 24px horizontal padding, header rule, 60% black backdrop, Escape and backdrop close.

## Do's and Don'ts

### Do:
- **Do** open every page with a 24px title and one purpose sentence.
- **Do** use ink for primary actions and vermilion only for what needs a person.
- **Do** show level as an 8px dot plus the level word.
- **Do** keep surfaces flat with 1px rules; use radii of 6px or 8px.
- **Do** give every control the shared 2px ink focus outline.
- **Do** show real counts with the scale written out.

### Don't:
- **Don't** build a dark sidebar admin with KPI tiles or rainbow status colours.
- **Don't** use gradients or shadows for depth.
- **Don't** fill pills with level colour or tint rows by level.
- **Don't** use green for fills; resolved is text or a small mark.
- **Don't** add a second typeface or an accent hue beside ink.
