# Context

## What this is

A single-user, localhost-only web app: stores a profile and a growing corpus
of raw "source of truth" work-history text, tracks job applications in a
table, charts the application funnel (Sankey), and uses the OpenAI API
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

The user is now using the app with real data. Since then: added
`profile.email` (via `db.js`'s `migrate()` — the first additive schema
change against an already-populated database, verified against a backup of
the live DB before restarting the server) and made Work History entries
collapsible by default (`SourcesTab.tsx`) since a few long pasted-in
resumes made the tab unwieldy. `node --test` re-verified (12 passing) and
the API re-checked by hand; **not** re-verified in a live browser this
round — BrowserOS neo was disconnected this session, so the usual
click-through didn't happen. Worth a quick look next time it's available.

Bug fix, same session: a real generated resume was silently missing two
roles — including the user's current freelance/independent-contractor
work — because `buildResumePrompt` (`routes/documents.js`) told the model to
*tailor* the resume but never said every employer had to appear, so the
model used its own relevance judgment and dropped whole positions. Fixed by
explicitly requiring every work-history employer/role as its own
`experience` entry, with tailoring limited to wording/bullet
choice/ordering. Verified by regenerating the user's actual resume against
the fixed prompt (id 7): all 6 roles now present, freelance work correctly
ordered first as the current role.

Resume formatting pass, same session: reworked `renderResumeHtml`/
`renderCoverLetterHtml` (`routes/documents.js`) and `public/style.css` for
standard resume conventions — single-column (ATS-safe), a title+dates /
org+location two-row layout per entry (added a `location` field to the
experience schema), skills as tags, labeled contact links (mailto/tel,
"GitHub"/"LinkedIn" instead of raw URLs). Also strengthened
`buildResumePrompt`'s bullet-writing rules (action-verb-led, no
"Responsible for", no invented numbers, no first-person). `print.css` got
an `@page` margin and `break-after: avoid` on headings so a printed page
doesn't start with an orphaned section header. Verified structurally
(regenerated the user's real resume, checked the HTML against the CSS
selectors by hand) — **not** seen rendered in an actual browser; BrowserOS
neo is still disconnected this session.

PDF/print compatibility pass, same session: added `normalizeUrl()` so
GitHub/LinkedIn/Portfolio links always get a scheme (a URL saved without
`https://` would otherwise render as a broken relative link, both on
screen and in the exported PDF), added `target="_blank" rel="noopener
noreferrer"` to those links, and forced `print-color-adjust: exact` in
`print.css` so background colors (the skill tags) survive "Save as PDF"
without the user needing to find the browser's "background graphics"
checkbox. Verified against a real regeneration: hrefs now carry the scheme
and `target="_blank"` in both the resume and cover letter output.

Keyword-matching + match-score pass, same session: `buildResumePrompt` now
explicitly asks for comprehensive, JD-terminology-aligned skills/bullets
(still bound by "never claim what the source doesn't support"), and the
same AI call also returns `match_score` (0-100), `matched_keywords`, and
`missing_keywords` — stored in `structured_json`, surfaced in the Builder
tab's result message and as a `.no-print` banner on the document page,
deliberately never baked into the printable `html_snapshot`. Known
limitation logged in architecture.md: the model scores its own output
in the same call, so treat it as directional, not a precise grade.

Content/layout pass, same session: skills are now AI-categorized
(`[{category, items[]}]`, see
`info/decisions/2026-09-23-resume-content-and-layout-upgrades.md`) and
rendered just above Education instead of near the top; bullet-writing
rules ask for substantive, detailed bullets (~20-35 words, specific
tools/scale/outcome) instead of short one-liners; the Tracker tab has a
new color-coded Match column (`applications.js`'s list query pulls
`match_score` out of the resume's `structured_json` in JS, not SQL, to
sidestep the JSON1-extension question); the main app shell and the
document-viewer page both got wider (`max-w-5xl` → `max-w-7xl`,
760px → 900px) now that content is denser; and contact links
(GitHub/LinkedIn/Portfolio) show their literal URL as link text instead of
a "GitHub"/"LinkedIn" label, so the address stays readable in a PDF viewer
that doesn't preserve the actual hyperlink. Verified via `node --test`
(12 passing), a client build, and a real regeneration of the user's live
resume (application id 8): categorized skills confirmed, section order
Summary → Experience → Skills → Education confirmed, bullet lengths
20-28 words, match score still absent from `html_snapshot`, and contact
hrefs rendering as e.g. `github.com/rgtdev95` instead of "GitHub". **Not**
seen in an actual browser — BrowserOS neo is still disconnected this
session; worth a look next time it's available, especially the wider
layout and the Match column's color coding.

Markdown preview, same session: `SourcesTab.tsx` got an Edit/Preview toggle
(shadcn `Tabs`, new `ContentEditor`/`MarkdownPreview` components) over each
entry's textarea, using the new `marked` client dependency to render pasted
Markdown — no server change, no schema change (content is still stored as
plain text; only the client-side display is affected). Deliberately skips
HTML sanitization on the rendered output since the only "author" of this
content is the app's one user on localhost. Verified with a client build;
not yet checked in a live browser (BrowserOS neo still disconnected).

AI backend swap, same session: replaced the `claude` CLI subprocess
(`code/claude-cli.js`, now deleted) with direct OpenAI API calls
(`code/ai-client.js`, native `fetch`, no new dependency) — see
`info/decisions/2026-09-23-openai-api-migration.md` for why and what
changed. `askForJson()`'s signature/behavior (parse response, one retry
with a stricter suffix, `err.rawText` on final failure) is unchanged, so
`routes/documents.js` needed only a `require` path update. Added
`code/.env.example` (`OPENAI_API_KEY`, optional `OPENAI_MODEL`/
`OPENAI_BASE_URL`) and `.env` loading in `server.js` via the built-in
`process.loadEnvFile()` (already gitignored, no `dotenv` needed). Verified:
`node --test` (12 passing), client build unaffected (this is backend-only),
server starts fine with no `.env` present. **Not yet verified against a
real OpenAI call** at the time — since then the user added their real
`OPENAI_API_KEY` to `code/.env` and picked a default model: `gpt-6-luna`
(OpenAI's GPT-6 family shipped this same week, superseding GPT-4o/4.1;
Luna is the fastest/cheapest tier — Sol and Astra trade cost for stronger
tailoring judgment if quality ever needs a bump). `DEFAULT_MODEL` in
`ai-client.js` and `.env.example` both updated. **Now verified against a
real OpenAI call**: `/api/documents/extract` against a real job posting
correctly returned company/job_title/compensation/location.

Builder-flow streamlining, same session: `BuilderTab.tsx` reworked so
**Generate Resume** alone runs extract → duplicate-check → generate (the
old separate "Extract Details" button is gone); **Generate Cover Letter**
is now only rendered once a resume exists for the current draft
(`hasResume` state — true after a resume generates, or if the application
was loaded from the Tracker tab already having one), not offered up front;
and both actions now show a spinner (`Loader2Icon`, `animate-spin`) plus a
phase-by-phase status message ("Extracting...", "Generating..."), ending in
a "saved to your Tracker" confirmation with an Open & edit link. No backend
or schema changes — `/api/documents/extract` and
`/api/documents/generate-resume` are unchanged, only what calls them and
when. Verified with a client build; not yet checked in a live browser
(BrowserOS neo still disconnected) or against a real OpenAI call (no
`.env` key in this session yet).

Prompt tuning, same session: bumped `buildResumePrompt`'s bullet count from
4-7 to 7-10 per role (user request). While reviewing that prompt for ATS
best practices, found and fixed a real bug: the Skills section rendered
each item as an adjacent `<span class="skill-tag">` joined with `''` — no
text-node separator between them, so an ATS/PDF text extractor could read
adjacent skills as one concatenated word instead of separate keywords.
Fixed by dropping the pill styling entirely and rendering skills as plain
`, `-joined text per category (`routes/documents.js`, `public/style.css`)
— the standard, ATS-safest convention anyway. Verified against a real
regeneration: bullets came back 6-8 per role, skills render as clean
comma-separated text. Flagged (not yet changed, pending user decision):
resume length isn't capped despite the higher bullet count (~1,066 words /
2-2.5 pages on the real regeneration), bullet tense isn't tied to
current-vs-past role, and experience order is relevance-based rather than
strict reverse-chronological.

Bug fix, same session: see
`info/decisions/2026-09-23-stale-application-binding-fix.md` — generating
a resume for a new job posting without clicking Cancel first silently
reused the previous job's tracker row instead of creating a new one, and
regenerated using that old row's stale `job_description` from the DB.
Fixed in `BuilderTab.tsx` by tracking which company/job title the current
`applicationIdRef` is bound to and clearing the binding when a fresh
extraction doesn't match it. Client build + `node --test` (12 passing)
clean; this is a client-state bug with no server-side symptom to smoke-test
via curl, so verification was by tracing the exact reproduction path in
code — worth a real click-through (two different postings, no Cancel in
between, confirm two Tracker rows) next time a browser is available.

Bug fix, same session: Generate Resume threw "Job title and company are
required" and refused to generate whenever extraction missed either field
(a posting with no named company, an imperfect extraction) — job
title/company are just Tracker labels, not something resume generation
itself needs, so this shouldn't have blocked anything. `ensureApplication()`
in `BuilderTab.tsx` now falls back to "Untitled Position"/"Unknown Company"
instead of throwing, creates the tracker row anyway, and generation
proceeds normally; those placeholder values are already editable via the
Tracker tab's existing Edit dialog (Job Title/Company are plain `Input`s
there, nothing new needed). Verified: client build, `node --test`
(12 passing), and a real POST to `/api/applications` confirming the
fallback values save and round-trip correctly (test row cleaned up after).

Prompt tuning, same session: user felt the current/present role was coming
out too short and simplified. Removed the 7-10-per-role bullet cap from
`buildResumePrompt` entirely — replaced with an instruction to let the
depth of the Work History source material set the bullet count (no target
number, no padding thin roles), plus an explicit "be thorough, not
condensed: rephrase and elaborate rather than summarizing down, one
distinct responsibility/system/achievement per bullet" rule. Verified
against a real regeneration of the user's actual current role: went from
6-8 bullets to 17, while older/thinner roles stayed proportionally short
(6). Flagged transparently: this pushed the same real resume to ~1,446
words (~3 pages), up from ~1,066 — an accepted trade-off, not a bug; if it
ends up feeling too long in practice, the fix is scoping which Work
History entries are included per application, not re-adding a cap.

Generation upgrade, 2026-10-05: ported the useful parts of a sibling app's
pipeline — see `info/decisions/2026-10-05-adopt-reference-app-generation-ideas.md`.
Resume generation now extracts must-have keywords first and feeds them to
the writer as an ATS checklist; `match_score` is computed in code as literal
keyword coverage (no more self-grading — the old architecture.md known
limitation is resolved); clichés are banned; the cover-letter prompt was
rewritten and now sees the resume. Verified: `node --test` (16 passing) and
a real OpenAI run of resume + cover letter against an in-memory copy of the
live data (application 15, live DB untouched): all 6 roles kept, no
clichés, score 22% with a sensible missing list, score absent from
`html_snapshot`, cover letter 256 words with no dashes. Existing saved
resumes keep their old self-graded scores until regenerated.

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
- AI calls go straight to the OpenAI API (`code/ai-client.js`, native
  `fetch`, `response_format: json_object`) — no SDK dependency. Config
  (`OPENAI_API_KEY`, optional `OPENAI_MODEL`/`OPENAI_BASE_URL`) lives in
  `code/.env` (gitignored; copy `code/.env.example`), loaded at server
  startup via `process.loadEnvFile()`.
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
