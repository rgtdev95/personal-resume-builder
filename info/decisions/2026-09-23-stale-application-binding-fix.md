# Fix: stale application binding silently overwrote a previous job's resume

User report: generated a resume for a 3rd job application and it "wasn't
saved in tracker." Reproduced via DB inspection — only 2 application rows
existed despite (at least) 3 generation attempts.

## Root cause

`BuilderTab.tsx`'s `applicationIdRef` is only cleared by clicking Cancel
(see `info/decisions/2026-09-20-architecture.md` for why it's a ref, not
state, and why it's created lazily). Since Generate Resume was streamlined
to run extract → duplicate-check → generate as one click (this same
session, see `info/context.md`), there's no longer a manual "start over"
gesture between generations — so if you paste a *different* job posting
and click Generate Resume again without clicking Cancel first,
`ensureApplication()` finds the old ref still set and reuses it instead of
creating a new row.

That alone would just be a missed row. What made it worse: the newly
pasted job description is never persisted anywhere in that path (it's
only sent to the server inside `ensureApplication()`'s POST, which never
ran) — so `generate-resume` on the backend read `application.job_description`
back out of the database, which was still the *old* job's text. The
"resume" that got generated and silently upserted over the old job's
document was tailored to the wrong posting, with a success message
("saved to your Tracker") that gave no indication anything was wrong.

## Fix

`BuilderTab.tsx` now tracks which company/job title `applicationIdRef` is
actually bound to (`boundCompanyRef`/`boundJobTitleRef`, set alongside the
id everywhere it's set: on create in `ensureApplication()`, on load in the
`loadApplicationId` effect, cleared in `reset()`). Right after extraction
returns in `generateResume()`, if the extracted company/title don't match
the bound ones, the binding is treated as stale and cleared before
continuing — forcing `ensureApplication()` to create a fresh row for the
new posting instead of overwriting the old one.

This only fires on an actual company/title mismatch, so the legitimate
same-draft reuse (Generate Cover Letter right after Generate Resume, or
editing a field before generating) is untouched — neither of those changes
what job you're generating for.

## Verification

Client build + `node --test` (12 passing) both clean. This is a client-side
state-machine bug with no server-observable symptom on its own (the
server-side upsert behavior is correct and unchanged — the bug was
entirely in *which* application id the client sent), so it wasn't caught
by the backend test suite or a curl-level smoke test; verified by tracing
the exact reproduction path against the code and confirming the new
mismatch check breaks it. Worth a real click-through (paste job A, generate,
paste job B without clicking Cancel, generate again, confirm two separate
Tracker rows) next time a browser is available.
