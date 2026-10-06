# Adopt the reference app's resume-generation ideas (selectively)

Date: 2026-10-05

## Context

Compared our generation pipeline against a sibling Flask app
(`Sandbox-Folder/copy-of-resume-job-app`, `app/services/ai_service.py`).
It extracts ATS keywords before writing, scores in code + an independent
model, bans AI clichés, and gives the cover letter the finished resume.

## Decision

Adopted (all in `code/routes/documents.js`):

- **Keyword extraction step** (`buildKeywordsPrompt`) before the resume
  call; the result is passed to the writer as an "ATS targeting checklist".
  Done server-side inside resume generation (not via `/extract`) so a
  regenerate from the Tracker tab gets it too. Prompt demands concrete
  1-4 word terms and no spelling variants — the first real run returned
  vague phrases ("related hardware and software") that made the score
  meaningless.
- **Deterministic match score** (`keywordCoverage`, tested in
  `test/keywords.test.js`) replaces the model grading its own output.
  Same `match_score`/`matched_keywords`/`missing_keywords` fields, so no
  client changes.
- **Cliché ban + varied verbs** in the resume prompt.
- **Cover letter prompt rewrite**: hook opening, employer-centric, no
  em dashes, no invented company facts, salutation rules, 250-350 words,
  and it now receives the application's resume `structured_json` for
  coherence.

Not adopted:

- Model-written Markdown output — our JSON + fixed template is more
  consistent and ATS-safe.
- "Relevance first, omit unrelated experience" / 1-2 page target — that's
  exactly the dropped-roles bug we fixed; every role stays.
- Creative (embellish) mode — a product decision for the user, not taken
  by default.
- Independent second-model scoring, streaming, cost tracking, URL
  scraping, multi-user auth — not needed for a single-user localhost app.
- City/state-only address — the stored address is already city-level.

## Cost

Resume generation is now two AI calls instead of one (the extra one is
small). Scores are lower and stricter than the old self-graded ones —
a literal ATS-style match, e.g. 22% on a real Cisco/Citrix-heavy posting.
