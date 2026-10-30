# Project context

## What this is

A single-user, localhost-only resume builder and job-application tracker. Express and SQLite store a profile, work-history entries, applications, and generated documents. A React workspace provides five sections; a separate plain-JavaScript page handles document editing and printing.

Read [features.md](features.md) for user workflows, [architecture.md](architecture.md) for implementation details, and [../AGENTS.md](../AGENTS.md) for agent-neutral development instructions. [../DESIGN.md](../DESIGN.md) records the visual system.

## Current status

The current workspace uses warm neutral surfaces, forest-green accents, Geist Variable typography, and persistent navigation. Desktop navigation is vertical; mobile navigation is horizontal, with matching keyboard behavior.

- **Applications:** searchable, sortable table; exact-status and stage-group filters; real stage counts; inline status changes; a details dialog with compensation, posting, documents, edit, and delete actions.
- **Resume & cover letter:** fixed-height, scrollable job-description editor beside job details and work-history selection, with generation controls and feedback below the details card. The editor can be resized manually. Returning to the section refreshes its library while preserving the draft and surviving source selections.
- **Application insights:** Sankey funnel and an accessible table of the actual links and counts.
- **Work history:** collapsible experience library with Markdown editing/preview and a wide dialog for new entries.
- **Your profile:** contact information, links, and education, saved explicitly.

Generation calls the configured OpenAI-compatible Chat Completions endpoint directly through native fetch. No coding-agent CLI is required. Keyword extraction and resume writing are separate server-side calls; keyword coverage is computed in code. Cover-letter writing includes the existing structured resume when available. Regeneration upserts the same document record.

Job details are extracted from the pasted posting at generation time. The extraction prompt looks for unlabeled headings and hiring language as well as explicit fields; missing or ambiguous details can still be blank and should be reviewed in Applications.

The redesigned frontend passes production build and lint; the only lint warnings are the existing shared-UI Fast Refresh export warnings. Browser interaction and visual acceptance of the redesign remain unverified because browser tooling was unavailable. Do not treat older browser checks as evidence for the redesign.

Desktop workspace spacing, the posting editor, and the insights chart adapt to viewport height. Long application lists scroll within the table; longer forms and expanded content can still require page scrolling.

## Conventions

- Application code lives in code/. Run npm start there to build and serve on 127.0.0.1:3000 (PORT can override the port).
- Frontend development: node server.js and npm run dev:client in separate terminals from code/.
- Backend tests use node:test and in-memory SQLite. Run npm test from code/.
- Frontend checks: npm run build and npm run lint from code/client/.
- One backend router per resource; one frontend component per section. Shared API types live in code/client/src/lib/types.ts.
- Sections use forceMount and CSS hiding to preserve drafts. Refresh shared data explicitly when needed.
- The active section is remembered in browser session storage for page refreshes; unsaved drafts remain in memory and do not survive refresh.
- Schema changes must update both the fresh schema and idempotent migrations for existing databases.
- Generated documents store structured data plus an editable HTML snapshot. Manual HTML edits do not update structured content or recalculate keyword scores.
- PDF export is the browser print dialog. There is no server PDF generator.
- Never test AI calls or data mutations against live personal data without an explicit request.

## Known limitations

- The app has no authentication and is designed for local use.
- Empty or omitted source_ids means all sources on the backend, including when every checkbox is cleared. Selection is at entry level, not individual jobs within an entry.
- New manual applications start at Applied: the POST endpoint does not use a submitted status. Change it inline after creation. The PUT endpoint replaces editable application fields rather than applying a partial patch.
- A manually added application has no description editor in its dialog; paste its posting in the resume editor before generating.
- Applications created in the resume editor start with cover-letter usage marked No; update that flag in Applications when appropriate. Generating a cover letter does not change it.
- The single-application GET response does not include resume_id. Loading a saved application may therefore leave Generate cover letter hidden until a resume is generated in the current draft.
- Generation creates an application before the document call completes. A failed generation can leave a tracker entry; clearing a draft does not delete saved entries or documents.
- The keyword score measures literal coverage of extracted must-have terms; it is not a hiring prediction or a general ATS score. No score is available when no keywords are extracted.
- Resume length is not capped; source detail controls the requested bullet depth. AI output still needs review.

## Repository privacy

Environment files, runtime databases and backups, private documents, local agent settings, and UI captures are ignored. A personal work-history document was moved to private/ to preserve it locally while removing it from the next repository snapshot. It already exists in the history recorded for origin/main; ordinary deletion does not remove older copies. No history rewrite or push was performed.
