# Architecture reference

For workflows see [features.md](features.md); for current status and limitations see [context.md](context.md). Historical decisions live in [decisions/](decisions/).

## Stack and runtime

- Node.js 24+; Express 5; SQLite through built-in node:sqlite (DatabaseSync).
- React 19, TypeScript, Vite, Tailwind CSS v4, Radix/shadcn controls, Geist Variable, and Lucide icons.
- ECharts core, SankeyChart, TooltipComponent, and CanvasRenderer; marked for work-history Markdown previews.
- Native fetch to a configured OpenAI-compatible Chat Completions endpoint; no AI SDK or coding-agent CLI dependency.
- Plain HTML/CSS/JavaScript document viewer and native browser print-to-PDF.
- Backend tests use node:test and in-memory SQLite.

The server loads code/.env when present and binds to 127.0.0.1, on PORT or 3000. It accepts JSON up to 2 MB, mounts four resource routers, serves code/client/dist, and serves code/public. There is no authentication. Do not expose it as a public server.

## Project structure

| Path | Responsibility |
|---|---|
| AGENTS.md | Instructions for any coding agent |
| PRODUCT.md / DESIGN.md | Product constraints and visual tokens |
| code/server.js | Environment loading, Express setup, static serving |
| code/db.js | Schema, additive migrations, default database |
| code/funnel.js | Canonical statuses and pure funnel derivation |
| code/ai-client.js | Endpoint call, timeout, JSON parsing and retry |
| code/routes/ | Profile, sources, applications, documents routers |
| code/test/ | Schema/migration, funnel, and keyword-coverage tests |
| code/client/src/App.tsx | Workspace navigation and section coordination |
| code/client/src/components/ | Five section components, chart, shared UI controls |
| code/client/src/lib/ | API helper, shared types, utilities |
| code/client/src/index.css | Theme, layout, responsive styles |
| code/client/vite.config.ts | Build plugins, alias, development API proxy |
| code/public/ | Standalone editable/printable document viewer |
| code/data/ | Ignored runtime database and backups |
| private/ | Ignored local personal documents |
| info/ | Current documentation and historical decisions |

npm install in code/ also installs client dependencies through postinstall. npm start builds the client then starts Express. For development, run node server.js and npm run dev:client separately from code/; Vite proxies /api to localhost:3000. The standalone /document.html page is served by Express on port 3000; Vite only proxies /api, so open saved documents through Express when using this development setup.

## Frontend state and layout

Five Radix Tabs panels remain mounted with forceMount and CSS-hidden inactive states, preserving editor drafts. Navigation orientation follows the mobile breakpoint so keyboard behavior matches the visible layout. The shell owns the selected section, builder application ID/load-request counter, and tracker refresh signal.

Applications fetches rows/statuses, computes filters and date sorting locally, and displays a selected row in a details dialog. Successful generation increments the tracker refresh signal. Resume & cover letter refreshes source entries on activation, preserving existing selections, selecting newly added entries, and removing deleted IDs. Reopening the same application increments a request counter so the editor loads it again. Insights refetches on activation; ResizeObserver resizes its chart and an HTML table exposes the underlying links/counts.

The desktop shell has a 244px sidebar (260px at widths of 1920px+). Application details and the new work-history editor open in scrollable dialogs. The resume editor stacks below 1200px. At 767px and below navigation becomes horizontal. Tables retain horizontal scrolling rather than squeezing all columns into the viewport.

## Database

The default file is code/data/resume-builder.db. openDb initializes the schema, enables foreign keys, and runs idempotent migrations. Future columns must be added both to SCHEMA_SQL and migrate(); CREATE TABLE IF NOT EXISTS does not upgrade an existing table.

| Table | Stored data |
|---|---|
| profile | Single row with id=1; name, email, phone, address, contact links, education_json, updated_at |
| sources | Named work-history text entries and timestamps |
| applications | Role, company, compensation, URL, location, pasted description, status, cover-letter flag, application date, timestamps |
| generated_documents | Application FK, document type, structured_json, editable html_snapshot, source_ids_json, timestamps |

The application FK uses ON DELETE CASCADE. UNIQUE(application_id, doc_type) makes regeneration an upsert. Saved structured JSON includes profile fields, education, and generated content, so later profile edits do not change an existing document.

Resume structured JSON also includes match_score, matched_keywords, and missing_keywords. These are not database columns and are omitted from printable HTML. List queries join document IDs and derive the score from the saved resume JSON. Single-application GET currently returns only the application row, without document IDs.

## API reference

Request and response bodies are JSON except successful source/application deletion (204). PUT operations replace fields; they are not partial PATCH operations.

| Method | Path | Behavior |
|---|---|---|
| GET / PUT | /api/profile | Read/replace the profile and education array |
| GET | /api/sources | List source entries, newest first |
| POST | /api/sources | Create title/content |
| PUT / DELETE | /api/sources/:id | Replace title/content or delete |
| GET | /api/applications | List rows with resume_id, cover_letter_id, match_score |
| POST | /api/applications | Create; title/company required; status defaults to Applied regardless of submitted status |
| GET | /api/applications/statuses | Canonical value/label pairs |
| GET | /api/applications/check-duplicate?company=&job_title= | Case-insensitive exact match; most recently created matching row |
| GET | /api/applications/funnel | Sankey-ready nodes and links |
| GET | /api/applications/:id | Application row only |
| PUT | /api/applications/:id | Replace editable fields; validate canonical status |
| DELETE | /api/applications/:id | Delete row and generated documents |
| POST | /api/documents/extract | job_description_text to company/job_title/compensation/location; no database write |
| POST | /api/documents/generate-resume | application_id and optional source_ids; generate/upsert resume |
| POST | /api/documents/generate-cover-letter | Same request shape; generate/upsert cover letter |
| GET | /api/documents/:id | Stored generated document |
| PUT | /api/documents/:id | Replace html_snapshot only |

A nonempty source_ids array filters sources. Empty/omitted arrays mean all sources. This includes clearing every source checkbox in the UI.

## Generation and document behavior

The client extracts job details, checks duplicates, ensures an application exists, then requests generation. This is not a single transaction: failure after application creation can leave a tracker row. Clear draft resets client state without removing saved data. Reusing a draft with a different extracted company/title clears its application binding before generation.

Resume generation makes two server-side AI calls: extract required keywords, requirements, and preferred terms; then write a resume with that checklist and selected work history. Cover-letter generation makes a writing call and includes the existing structured resume's summary, skills, and experience when available. The UI offers cover-letter generation after a resume exists in the current draft; the backend endpoint does not require one.

ai-client.js reads OPENAI_API_KEY, optional OPENAI_MODEL, and optional OPENAI_BASE_URL from the environment. Current code defaults are gpt-6-luna and https://api.openai.com/v1. Each call has a 120-second timeout and requests JSON output. Parsing accepts raw JSON, fenced JSON, or a braced object; malformed content triggers one retry with a stricter instruction.

keywordCoverage checks required terms against structured resume text with case-insensitive whole-term matching and plural endings. It returns a rounded percentage, or null for no keywords. The score is a literal coverage measure, not a hiring prediction.

The server merges contact information/education locally and renders escaped content through fixed HTML templates. Skills are grouped and comma-separated. Contact links show readable URL text. Prompts request source-supported facts and thorough bullets; output is still subject to model error and has no fixed page-length cap.

The document viewer edits html_snapshot and saves explicitly. Editing HTML does not update structured_json, keyword scores, or the structured resume used by a later cover letter. Regeneration overwrites the saved snapshot. Print-only styling hides controls and keyword metadata.

## Data boundaries

Personal records and API credentials are not source assets. Environment files, databases/backups, local agent settings, private documents, and generated review captures are ignored. Generation sends job text and source content to the configured AI endpoint; cover-letter context can contain prior resume content. The app is local, but AI processing is external.

See [privacy-review.md](privacy-review.md) for the pre-commit review scope and historical personal-document finding.
