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
| Frontend | Plain HTML/CSS/JS — no framework, no bundler, no build step |
| Charts | ECharts (Sankey), served from `node_modules`, no CDN |
| AI | The `claude` CLI (Claude Code), invoked as a subprocess — not the Anthropic API/SDK directly |
| PDF export | Browser's native print-to-PDF — no PDF library |
| Tests | Node's built-in `node:test` — no test framework |

Only two npm dependencies: `express` and `echarts`.

## Project structure

```
code/
  server.js                 # Express app: static files, /vendor/echarts.min.js, mounts routers
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
  public/                      # static frontend, no build step
    index.html                  # single page, 5 tabs as <section>s
    document.html                # standalone view/edit/print page for one generated document
    common.js                    # shared fetchJson() + escapeHtml() used by every page
    app.js                       # tab switching, wires the initial load calls
    profile.js / sources.js / tracker.js / visualize.js / builder.js   # one file per tab
    document.js                  # logic for document.html
    style.css
    print.css                    # @media print rules, loaded only by document.html
  data/                         # gitignored; resume-builder.db lives here at runtime
```

One router per resource on the backend, one script per tab on the frontend —
matched 1:1, so "what talks to `/api/sources`" is always `sources.js` on
both sides.

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
  earlier in the Builder flow. This is what makes Cancel a pure client-side
  reset with nothing to clean up on the server — creating the row right
  after the duplicate-check instead would let Cancel leave a row with no
  documents ever attached to it.
- **Generated documents store structured JSON, not raw AI-written
  HTML/Markdown.** The AI only supplies the tailored parts (summary,
  skills, experience bullets / cover letter paragraphs); the server splices
  in your profile's factual fields and renders everything through one fixed
  HTML template per document type, so formatting stays consistent across
  every generation.
