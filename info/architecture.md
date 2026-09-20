# Architecture Reference

Tech stack, project structure, database schema, and API reference — the
"what and how" of the codebase. For feature descriptions and the day-to-day
workflow, see [features.md](features.md). For *why* these choices were made
over the alternatives, see
[decisions/2026-09-20-architecture.md](decisions/2026-09-20-architecture.md).
For current build status, see [context.md](context.md).

## Tech stack

| Piece | Choice |
|---|---|
| Runtime | Node.js >= 24 |
| Server | Express 5 |
| Database | SQLite via Node's built-in `node:sqlite` (`DatabaseSync`) — no native dependency, no separate DB server |
| Frontend | React 19 + TypeScript, built with Vite, styled with Tailwind CSS v4 + shadcn/ui (Radix primitives) — a separate app in `code/client/`, built and served by Express (see [decisions/2026-09-21-shadcn-ui-migration.md](decisions/2026-09-21-shadcn-ui-migration.md)) |
| Document viewer | `public/document.html` stays plain HTML/CSS/JS, no React — a standalone print/edit target with no need for the frontend framework |
| Charts | ECharts (Sankey), imported as a real module in the React app (tree-shaken: core + SankeyChart + TooltipComponent + CanvasRenderer), no CDN |
| AI | The `claude` CLI (Claude Code), invoked as a subprocess — not the Anthropic API/SDK directly |
| PDF export | Browser's native print-to-PDF — no PDF library |
| Tests | Node's built-in `node:test` (backend only) — no test framework |

The backend (`code/package.json`) has one real dependency: `express`. The
frontend (`code/client/package.json`) is its own Vite/React/shadcn project —
see its `package.json` for the full list (react, vite, tailwindcss, the
shadcn-generated UI primitives, echarts).

## Project structure

```
code/
  server.js                 # Express app: static files (client/dist + public/), mounts routers
  db.js                     # node:sqlite setup, schema (CREATE TABLE ...), PRAGMA foreign_keys
  funnel.js                 # status taxonomy + the funnel roll-up algorithm (pure, no deps)
  claude-cli.js              # spawns `claude -p`, parses its JSON output, one retry on bad JSON
  routes/
    profile.js                # GET/PUT /api/profile
    sources.js                # CRUD /api/sources
    applications.js            # CRUD /api/applications, /check-duplicate, /funnel, /statuses
    documents.js                # /extract, /generate-resume, /generate-cover-letter, doc GET/PUT
  test/
    db.test.js
    funnel.test.js
  public/                      # only the standalone document viewer now — plain HTML/JS
    document.html                # standalone view/edit/print page for one generated document
    document.js / common.js       # fetchJson() + escapeHtml(), and document.html's own logic
    style.css / print.css          # trimmed to just what document.html uses
  client/                       # the 5-tab app — separate Vite/React/TS project, own package.json
    vite.config.ts                # react() + tailwindcss() plugins, "@" path alias, dev proxy for /api
    components.json                # shadcn config
    src/
      App.tsx                       # shadcn Tabs; forceMount + CSS-hidden (not unmount) so
                                    #  switching tabs never wipes in-progress state (e.g. a
                                    #  half-filled Builder draft)
      lib/
        api.ts                       # fetchJson() — same contract as the old public/common.js
        types.ts                     # shared TS types matching the API's JSON shapes
      components/
        ui/                           # shadcn-generated primitives (button, input, dialog, etc.)
        ProfileTab.tsx / SourcesTab.tsx / TrackerTab.tsx / VisualizeTab.tsx / BuilderTab.tsx
        FunnelChart.tsx                # useRef+useEffect wrapper around ECharts
    dist/                          # `vite build` output — gitignored, served by Express
  data/                         # gitignored; resume-builder.db lives here at runtime
```

One router per resource on the backend, one component per tab on the
frontend — matched 1:1, so "what talks to `/api/sources`" is always
`SourcesTab.tsx` on the client side.

## Database schema

Four tables in `code/db.js`. See that file for the exact `CREATE TABLE`
statements; this is the shape:

**`profile`** — a single row (`id = 1`, enforced by a CHECK constraint).
`full_name`, `phone`, `address`, `github_url`, `linkedin_url`,
`portfolio_url` as plain text columns; `education_json` holds the education
list (`[{degree, school, year}]`) as a JSON string — there's only ever one
profile and nothing queries education independently, so a child table
wasn't worth it.

**`sources`** — the Work History entries: `id`, `title`, `content`,
timestamps. One row per entry, unlimited entries.

**`applications`** — the tracker: `job_title`, `company`, `compensation`,
`job_url`, `location`, `job_description` (the pasted posting, kept so
resume/cover-letter generation always has it), `status` (see below),
`used_cover_letter` (0/1), `applied_date`, timestamps.

**`generated_documents`** — one row per (application, doc type):
`application_id` (FK, `ON DELETE CASCADE`), `doc_type` (`resume` or
`cover_letter`), `structured_json` (the full merged document — profile
fields + education + the AI's tailored content, so a past document stays
frozen even if your profile changes later), `html_snapshot` (the rendered
HTML; overwritten when you edit-and-save on the document page),
`source_ids_json` (which Work History entries fed this generation).
`UNIQUE(application_id, doc_type)` makes "generate" an upsert — regenerating
overwrites in place rather than creating a second copy.

### Status taxonomy & funnel chart

`applications.status` is one of a fixed set of values forming a *tree* —
every status has exactly one parent stage — so the Visualize tab can derive
an unambiguous Sankey chart straight from live data:

```
applied (default on creation)
no_response
rejected
interview
  interview_2nd
    offer
      offer_accepted
      offer_declined
    interview_2nd_no_offer
  interview_no_offer
  interview_never_scheduled
```

`used_cover_letter` is a separate flag (not part of the status), so the
chart first splits every application into a "Cover Letter" / "No Cover
Letter" branch, then walks this tree within each branch.

Two deliberate choices worth knowing about if you're reading the data
directly:
- `interview_no_offer` and `interview_2nd_no_offer` are distinct statuses
  (not both "No Offer") — reusing one label at two different depths would
  merge them into a single chart node with two parents.
- An application sitting at `interview`, `interview_2nd`, or `offer` with
  nothing decided yet still needs to show up in the chart. Rather than
  leaving that node's numbers looking inconsistent, the chart adds an
  explicit `"<stage> (in progress)"` leaf for whatever hasn't moved on yet.

## API reference

All routes are JSON in/out (`Content-Type: application/json`) except where noted.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/profile` | Fetch the profile |
| PUT | `/api/profile` | Replace the profile (`full_name`, `phone`, `address`, `github_url`, `linkedin_url`, `portfolio_url`, `education[]`) |
| GET | `/api/sources` | List all Work History entries |
| POST | `/api/sources` | Create `{title, content}` |
| PUT | `/api/sources/:id` | Update `{title, content}` |
| DELETE | `/api/sources/:id` | Delete |
| GET | `/api/applications` | List tracker rows (includes `resume_id`/`cover_letter_id` if generated) |
| POST | `/api/applications` | Create a tracker row |
| GET | `/api/applications/check-duplicate?company=&job_title=` | Case-insensitive exact match check |
| GET | `/api/applications/funnel` | Sankey-ready `{nodes, links}` for the Visualize tab |
| GET | `/api/applications/statuses` | `[{value, label}]` in canonical order — feeds every status `<select>` |
| GET | `/api/applications/:id` | Fetch one |
| PUT | `/api/applications/:id` | Full update (also what the inline status dropdown calls) |
| DELETE | `/api/applications/:id` | Delete (cascades its generated documents) |
| POST | `/api/documents/extract` | `{job_description_text}` → AI → `{company, job_title, compensation, location}`. No DB write. |
| POST | `/api/documents/generate-resume` | `{application_id, source_ids: []}` → AI → renders + upserts the resume |
| POST | `/api/documents/generate-cover-letter` | Same shape, for the cover letter |
| GET | `/api/documents/:id` | Fetch a generated document |
| PUT | `/api/documents/:id` | `{html_snapshot}` — persists an edit made on `document.html` |

## Design notes

- **AI calls go through the `claude` CLI as a subprocess** (`claude -p
  ... --output-format json --allowedTools ""`), never the Anthropic API
  directly — this was an explicit choice so the app rides on your existing
  `claude` login instead of needing a separate API key. `claude-cli.js`
  uses `execFile` (never a shell string), so pasted job-description text is
  never shell-interpreted.
- **The tracker row is created at the moment you click Generate**, not
  earlier in the Builder flow. `BuilderTab.tsx`'s `ensureApplication()`
  POSTs `/api/applications` only if it doesn't already hold an
  `applicationId` for the current draft (held in a `useRef`, not `useState`
  — it doesn't need to trigger a re-render); the id it gets back is cached
  there so a second Generate click in the same draft (e.g. cover letter
  right after resume) reuses that row instead of creating a duplicate. This
  is also what makes Cancel a pure client-side reset with nothing to clean
  up on the server — creating the row right after the duplicate-check
  instead would let Cancel leave a row with no documents ever attached to
  it.
- **Tab content uses `forceMount` + CSS `hidden` instead of Radix Tabs'
  default of unmounting inactive panels.** Without it, switching away from
  the Builder tab mid-draft and back would wipe the draft (React would
  unmount and remount `BuilderTab`, resetting its state) — a real
  regression from the old app, where tabs were just CSS-hidden
  `<section>`s that never left the DOM. The trade-off: components that used
  to refetch on every tab switch (Tracker, in the old app) now mount once
  and stay mounted, so `TrackerTab` needs an explicit `refreshSignal` prop
  (bumped by `App.tsx` when `BuilderTab` reports a document was generated)
  to know when to re-fetch — there's no other way for it to learn that a
  row it's already displaying just got a `resume_id`/`cover_letter_id`.
- **Generated documents store structured JSON, not raw AI-written
  HTML/Markdown.** The AI only supplies the tailored parts (summary,
  skills, experience bullets / cover letter paragraphs); the server splices
  in your profile's factual fields and renders everything through one fixed
  HTML template per document type, so formatting stays consistent across
  every generation.
