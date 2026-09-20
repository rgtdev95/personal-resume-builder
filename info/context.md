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

V1 built and working end-to-end (backend: all build-order steps from
`info/decisions/2026-09-20-architecture.md` are done — profile, work-history
sources, tracker CRUD with inline status updates, the funnel roll-up
algorithm in `code/funnel.js` covered by `code/test/funnel.test.js`, the
`claude` CLI wrapper, and the Builder flow's extract/duplicate-check/generate
endpoints).

The 5-tab frontend was then rebuilt in React + TypeScript + Tailwind v4 +
shadcn/ui (`code/client/`), per `info/decisions/2026-09-21-shadcn-ui-migration.md`
— same behavior, new look, backend untouched. `public/document.html` (the
generated-document viewer/print page) stays plain HTML/JS by design.
Verified via `node --test` (11 passing, backend-only) and a full
click-through in a real browser (BrowserOS neo) after both the initial
build and the shadcn migration — including a real AI-generated resume and
cover letter, contenteditable edit + save, cascade delete, the
duplicate-check warning, and confirming an in-progress Builder draft
survives switching tabs. No console errors or server errors observed either
time.

Not yet done / possible next steps (none requested yet, don't build ahead of
demand): print-layout polish beyond the basic `break-inside: avoid` rules,
anything past the single-profile/single-user scope.

## Conventions

- All app code lives under `code/`. Run with `npm start` (from `code/`);
  serves on localhost only, no auth.
- Backend: Node.js + Express, plain JS, no framework beyond Express.
- Frontend (the 5 tabs): React 19 + TypeScript + Tailwind v4 + shadcn/ui, a
  separate Vite project in `code/client/` with its own `package.json`,
  built and served by Express (`code/package.json`'s `postinstall`/`build`/
  `start` scripts cascade into it, so day-to-day commands don't change).
  `public/document.html` (the generated-document viewer/print page) is the
  one deliberate exception — still plain HTML/JS, no React, no build step.
- Storage: SQLite via Node's built-in `node:sqlite` (`DatabaseSync`) — no
  native dependency. DB file at `code/data/resume-builder.db`, gitignored.
- AI calls shell out to the `claude` CLI (`claude -p ... --output-format
  json --allowedTools ""`) via `child_process.execFile` — never the
  Anthropic API/SDK directly, never `exec`/a shell string (prompts embed
  arbitrary pasted user text).
- One Express router per resource under `code/routes/`, one React component
  per tab under `code/client/src/components/`, matched 1:1.
- `code/funnel.js` is the one piece of non-trivial logic (funnel roll-up for
  the Sankey chart) and is the one thing with `node --test` coverage
  (`code/test/`), decoupled from Express/SQLite.
- Chart library: ECharts, imported as a real (tree-shaken) module in the
  React app — no CDN, no separately-served UMD file.
- PDF export is the browser's native print-to-PDF, no PDF library.
- Tab content in `App.tsx` uses `forceMount` (not Radix's default of
  unmounting inactive tabs) so switching tabs never wipes in-progress state
  — see `info/decisions/2026-09-21-shadcn-ui-migration.md` for why this
  matters and what it costs (`TrackerTab` needs an explicit refresh signal
  instead of refetching on every mount).
- See `info/decisions/` for the full reasoning behind each of these choices.
