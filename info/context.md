# Context

## What this is

A single-user, localhost-only web app: stores a profile and a growing corpus
of raw "source of truth" work-history text, tracks job applications in a
table, charts the application funnel (Sankey), and uses the Claude Code CLI
to turn (source-of-truth text + a pasted job description) into a tailored
resume and cover letter per application.

Full documentation lives here in `info/`: [features.md](features.md) for
what each tab does and the day-to-day workflow, [architecture.md](architecture.md)
for tech stack/project structure/database schema/API reference. The root
[README.md](../README.md) is just a short pointer to these plus run/test
instructions. This file (`context.md`) stays focused on status and
conventions for whoever (human or AI) works on the code next.

## Current status

V1 built and working end-to-end (all build-order steps from
`info/decisions/2026-09-20-architecture.md` / the approved implementation
plan are done): profile, work-history sources, tracker CRUD with inline
status updates, the funnel roll-up algorithm (`code/funnel.js`, covered by
`code/test/funnel.test.js`) driving the Visualize tab's Sankey chart, the
`claude` CLI wrapper, and the Builder tab's extract/duplicate-check/generate
flow. Verified via `node --test` (11 passing) and a full click-through in a
real browser (BrowserOS neo) including a real AI-generated resume and cover
letter, contenteditable edit + save, and cascade delete — no console errors
or server errors observed.

Not yet done / possible next steps (none requested yet, don't build ahead of
demand): print-layout polish beyond the basic `break-inside: avoid` rules,
anything past the single-profile/single-user scope.

## Conventions

- All app code lives under `code/`. Run with `npm start` (from `code/`);
  serves on localhost only, no auth.
- Node.js + Express, plain HTML/CSS/JS on the frontend — no React, no
  bundler, no build step.
- Storage: SQLite via Node's built-in `node:sqlite` (`DatabaseSync`) — no
  native dependency. DB file at `code/data/resume-builder.db`, gitignored.
- AI calls shell out to the `claude` CLI (`claude -p ... --output-format
  json --allowedTools ""`) via `child_process.execFile` — never the
  Anthropic API/SDK directly, never `exec`/a shell string (prompts embed
  arbitrary pasted user text).
- One Express router per resource under `code/routes/`, one frontend JS file
  per tab under `code/public/`, matched 1:1.
- `code/funnel.js` is the one piece of non-trivial logic (funnel roll-up for
  the Sankey chart) and is the one thing with `node --test` coverage
  (`code/test/`), decoupled from Express/SQLite.
- Chart library: ECharts, served locally from `node_modules` (no CDN, no
  build step).
- PDF export is the browser's native print-to-PDF, no PDF library.
- See `info/decisions/` for the full reasoning behind each of these choices.
