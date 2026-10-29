---
name: Resume Builder & Tracker
description: A light, focused career workspace with warm neutrals and forest-green accents.
colors:
  primary: "#285943"
  primary-foreground: "#ffffff"
  background: "#f7f8f5"
  foreground: "#26352e"
  card: "#ffffff"
  secondary: "#eaf0e9"
  muted: "#f1f3ee"
  muted-foreground: "#687169"
  border: "#e2e7df"
  input: "#d4dbd0"
  ring: "#548668"
  destructive: "#ad3d35"
  sidebar: "#eef1eb"
  sidebar-accent: "#dfe9dc"
  sidebar-border: "#dce2d7"
  chart-1: "#397456"
  chart-2: "#7c9f89"
  chart-3: "#b09b68"
  chart-4: "#8293ad"
  chart-5: "#b58277"
typography:
  headline:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-.035em"
  title:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "15px"
    fontWeight: 550
    letterSpacing: "-.02em"
  body:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "13px"
    lineHeight: 1.65
  label:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "13px"
    fontWeight: 500
rounded:
  control: "7px"
  chip: "5px"
  surface: "12px"
spacing:
  compact: "8px"
  field: "16px"
  panel-gap: "20px"
  panel-padding: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    typography: "{typography.label}"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
  button-outline-hover:
    backgroundColor: "{colors.muted}"
  surface:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.surface}"
    padding: "{spacing.panel-padding}"
---

# Design System: Resume Builder & Tracker

## Overview

A light, focused desk workspace for managing opportunities and preparing career documents. Warm neutral surfaces provide a quiet frame; forest green identifies actions and selection. The user's confirmed direction prioritizes clear data tables and wide-screen use.

This document records the React workspace implementation, based on source review. Rendered visual acceptance remains pending. The separate document viewing and printing page is outside this system's scope.

**Key Characteristics:**

- Clear table hierarchy and restrained accents.
- Stable navigation with generous working space.
- Flat, bordered surfaces and compact controls.

## Colors

The palette combines forest green with warm, slightly green-tinted neutrals.

### Primary

- **Forest green** (`primary`): primary actions, links, active stage indicators, and selected experience counts.
- **Focus green** (`ring`): visible keyboard focus treatment.

### Neutral

- **Workspace mist** (`background`) and **sidebar sage** (`sidebar`): persistent framing.
- **White** (`card`): tables, editors, and detail surfaces.
- **Deep foliage** (`foreground`) and **quiet grey-green** (`muted-foreground`): primary and supporting text.
- **Soft sage** (`secondary`, `sidebar-accent`): selected and supporting states.
- **Fine dividers** (`border`, `sidebar-border`) and **field stroke** (`input`): boundaries without heavy contrast.

Destructive actions use `destructive`. Status chips use distinct muted blue, amber, green, and brown families; each retains a text label. The five chart colors support the hiring-flow report rather than introduce additional brand accents.

## Typography

Use Geist Variable with a sans-serif fallback throughout. Page headings use the headline token; section headings use the title token. Supporting copy is generally 13px, while metadata, table headings, dates, and compact chips use 11px. Detail headings use 19px/1.4 at weight 550. Mobile page headings become 25px.

Keep paragraphs readable: page descriptions cap at 70ch, source introductions at 75ch, and empty-state explanations at 46ch. Table cells and stage counts use tabular numerals. Use sentence case and modest weight differences rather than oversized display typography.

## Layout

The desktop shell uses a 244px sticky sidebar and a fluid main column with 38px horizontal padding. The breadcrumb strip is 66px high. At 1920px and above, the sidebar grows to 260px and main padding to 56px.

The application workbench places a 340px detail panel beside the table at 1400px and above, growing to 380px at 1920px. Below 1400px, details move above the table. Preserve the table's 900px minimum width and horizontal scrolling rather than squeezing its six columns.

Editors use two-column grids with 24px gaps. Below 1200px, resume creation and work history become single-column layouts; the sidebar becomes 216px. Below 768px, navigation becomes a horizontal scrollable strip, main gutters become 16px, and forms become one column. Mobile inputs use 16px text and most actionable controls have a 44px minimum height.

## Elevation & Depth

Workspace panels and inputs are flat: their shadows are explicitly removed. White surfaces, fine borders, muted fills, and selected-row tints establish hierarchy. Shared dialogs and popovers retain their library treatments; do not extend their elevation to ordinary workspace panels.

## Shapes

Use softly rounded rectangles: 12px for major work surfaces, 7px for standard buttons and inputs, and 5px for compact chips and document links. Borders are generally 1px. Small circular dots reinforce statuses; they accompany labels rather than replace them.

## Components

### Buttons

Primary buttons use forest green with white text. Default workspace buttons have a 37px minimum height, 13px text, and 13px inline padding. Outline actions use white surfaces, fine borders, and a muted hover fill. Primary hover uses the existing primary/80 treatment. Shared controls use a visible three-pixel focus ring, disabled opacity, and a small pressed translation where applicable.

### Tables and selected details

The opportunity table uses 11px muted headings, 13px body cells, and 15px by 18px cell padding. At very wide widths inline cell padding becomes 24px. Selected rows use `#f0f5ec`; hover uses `#f6f8f2`. Role titles are buttons with an underline on hover. Keep company metadata beneath the role and document links grouped within their cell.

### Chips

Status chips use a 5px radius, 11px text, a current-color dot, and a softly tinted fill. Stage filters use real counts and an active green underline. Preserve the backend's status labels and meanings.

### Cards and fields

Panels use white fills, fine borders, and usually 24px internal spacing. Inputs have a 38px minimum height, white fill, and 7px radius. Labels use 13px medium-weight text. Long job descriptions use a spacious textarea with 13px/1.85 text; fields retain the shared focus, invalid, and disabled states.

### Navigation

The sidebar uses 13px labels, 17px line icons, and 43px minimum-height items. Selection uses a sage fill; hover uses a slightly lighter sage. Navigation orientation follows the viewport, and section content remains mounted to preserve drafts. A keyboard-visible skip link leads to the main content.

## Do's and Don'ts

- **Do** preserve the table's scrolling behavior and adjacent detail workflow on wide screens.
- **Do** use green to explain action and selection, with neutral surfaces carrying most of the screen.
- **Do** retain text labels, keyboard focus, reduced-motion support, and accessible form names.
- **Don't** replace real application counts with decorative metrics.
- **Don't** introduce a marketing hero into the working area.
- **Don't** apply shadows to ordinary workspace panels or compress table columns to fit narrow screens.
