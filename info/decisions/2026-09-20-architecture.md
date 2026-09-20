# Architecture: stack, storage, AI integration, funnel model

## Context

Starting a single-user, localhost-only web app: profile + work-history
"source of truth" corpus + job application tracker + funnel chart + AI-driven
resume/cover-letter generation per application.

## Decisions

**Stack: Node.js + Express + plain HTML/CSS/JS.** No React, no bundler, no
build step. Single user, no need for componentization overhead; `fetch()` +
DOM is enough for 5 tabs.

**Storage: `node:sqlite` (`DatabaseSync`), Node's built-in module.** Node
v24.19.0 has this stable with no flag. Rejected `better-sqlite3`: it's a
native addon requiring node-gyp/a C++ toolchain, which is real friction on
Windows for zero functional benefit here.

**AI: shell out to the Claude Code CLI (`claude -p ... --output-format json
--allowedTools ""`), not the Anthropic API/SDK.** User's explicit choice —
the CLI is already installed and authenticated, so there's no API key to
provision or rotate. `--allowedTools ""` makes each call a pure text
completion (no tool use, no permission prompts). The wrapper uses
`execFile`, never `exec`/a shell string, because prompts embed arbitrary
pasted job-description text that must never be shell-interpreted.

**Documents: AI returns structured JSON, not free-form HTML/Markdown; the
server splices in profile data and renders through one fixed HTML template
per document type.** Alternative considered: let the AI generate full
HTML/CSS directly — rejected because formatting would vary run to run.
Structured JSON (resume: summary/skills/experience/bullets; cover letter:
salutation/paragraphs/closing) plus a fixed template gives consistent
output, and keeps factual fields (name, contact, education) under the app's
control rather than at risk of the model rewording them. Light edits after
generation use plain `contenteditable` (native browser feature) instead of a
rich-text-editor dependency.

**PDF export: browser print-to-PDF (`window.print()` + `@media print`), no
PDF-generation library.** Sufficient for a personal tool; avoids adding
Puppeteer/pdfkit and the overhead that comes with them. One caveat: Chrome's
print dialog adds its own header/footer by default — not fixable from CSS,
just something to uncheck once (Chrome remembers per-origin after).

**Chart library: ECharts (Apache ECharts) for the funnel Sankey.** Chosen
over d3+d3-sankey (tooltips/legend would be hand-built) and Google Charts
(no supported offline distribution, wrong fit for a localhost-only tool).
ECharts ships a single UMD file, has a native Sankey series type, and
built-in tooltips/legend.

**Funnel/status model:** `applications.status` is a fixed enum forming a
*tree* (each status has exactly one parent stage), so a Sankey diagram can
be derived unambiguously from live data instead of hand-tallied like the
reference spreadsheet screenshot. Two non-obvious pieces, each fixed after
being caught during design:
- Statuses that are semantically "no offer" at different depths
  (`interview_no_offer` vs `interview_2nd_no_offer`) get distinct labels.
  Sankey nodes are keyed by name; reusing "No Offer" at two depths (as the
  reference chart does) would merge them into one node with two parents.
- An explicit `applied` status is the default for new rows (not
  `no_response`). `no_response` means "silence after enough time has
  passed" — it's a real outcome, not the state a row starts in — so
  defaulting new rows to it would be a lie the moment they're created.
- Nodes that are both a valid resting state *and* a parent with children
  (`interview`, `interview_2nd`, `offer`) get a synthetic `"<node> (in
  progress)"` leaf whenever some rows are sitting there with nothing decided
  yet. Without this, in-progress rows would leave a node's inflow greater
  than its outflow, which reads as broken data rather than "still pending."

**Tracker-row creation is deferred to the moment "Generate" is clicked in
the Resume/Cover Letter Builder tab**, not right after the duplicate-check.
This keeps the Builder's Cancel button a pure client-side reset with no
backend call in every case — creating the row earlier would let Cancel leave
an orphan tracker entry with no documents ever attached.

Full design detail: `C:\Users\sysowner\.claude\plans\partitioned-sleeping-raccoon.md`
(implementation plan, approved 2026-09-20).
