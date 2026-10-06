# Features & Usage

What each tab does, and the workflow for using the app day to day. For tech
stack, project structure, database schema, and the API reference, see
[architecture.md](architecture.md). For current build status, see
[context.md](context.md).

## Profile tab
Your name, email, phone, address, education (add as many entries as you
want), and links (GitHub, LinkedIn, portfolio). One profile, saved as a
whole on submit. Email (and the rest of these fields) is spliced into every
generated resume/cover letter's contact line.

## Work History tab (source of truth)
A free-form list of raw work-history text — old resumes, bullet dumps,
project write-ups, anything. Add as many entries as you want. This is what
the AI reads when it tailors a resume or cover letter; it's told to use only
what's in these entries and never invent experience.

Entries are collapsed by default (click one, or its chevron, to expand it)
so a handful of long entries — a whole pasted resume, say — doesn't turn the
tab into a wall of text. Collapsed entries still show their title and
character count.

Each entry (and the "Add new entry" box) has an Edit/Preview toggle — if you
paste content written in Markdown, switch to Preview to see it rendered
(headings, lists, bold/italic, links) instead of raw text.

An entry can hold multiple jobs — paste a whole old resume with three jobs
in it into one entry if you want. The one thing to know: in the Builder tab
you select which *entries* to include per application, not which jobs
within an entry. If you want the option to include one job but exclude
another for a given application, put them in separate entries; if you'd
always include them together anyway, one combined entry is simpler.

## Tracker tab
The table of job applications: Job Title, Company, Compensation, Job URL,
links to the generated Resume/Cover Letter, a Match column (the resume's
match score, once one's been generated — see below), Status, Date. Add rows
manually, edit or delete them, and change status inline from a dropdown as
an application progresses. Deleting an application also deletes its
generated documents.

## Visualize tab
A Sankey funnel chart (Applications → Cover Letter / No Cover Letter →
outcome stages → final result), built live from the Tracker data — not
hand-entered. See [architecture.md](architecture.md#status-taxonomy--funnel-chart)
for how the chart is derived from the status data.

## Resume / Cover Letter tab (the builder)
1. Paste a Job URL and the full job description.
2. Pick which Work History entries to include (defaults to all).
3. Click **Generate Resume**. This runs the whole flow in one click —
   extracts company/job title/compensation/location from the pasted
   description, runs the duplicate-application check, then generates the
   resume — with a spinner and a status message ("Extracting...",
   "Generating...") the whole way through. There's no separate "Extract
   Details" button to click first. The extracted fields are still shown and
   editable (extraction can be imperfect) — edit them and the
   duplicate-check re-runs on blur.
   - If you've already applied to this company for this role, generation
     pauses with a warning showing the existing entry's status/date, and a
     choice to view it instead or proceed anyway.
   - Once the resume's done, it's saved to the Tracker automatically —
     there's no separate "save" step — and a message confirms that with a
     link to open it.
   - Job title/company are just Tracker labels, not something generation
     needs — if extraction misses either one, generation still proceeds
     using a placeholder ("Untitled Position"/"Unknown Company") that you
     can fix up later from the Tracker tab's Edit dialog.
4. **Generate Cover Letter** only appears once a resume exists for this
   application (just generated, or already generated — e.g. you got here
   via the Tracker tab's "generate" link in the Cover Letter column). It's
   not offered up front, since most applications only need the resume.
5. **Cancel** resets the whole form. Since the tracker row isn't created
   until a document is actually generated, Cancel never leaves a stray row
   behind — but it also can't undo a generation that already happened;
   Cancel only clears the form so you can start a fresh draft.
6. Generated documents open in their own page (`document.html`) where the
   text is directly editable (click and type) and there's a **Print / Save
   as PDF** button that uses the browser's native print-to-PDF.
7. A generated resume comes with a **match score** — the percentage of
   the posting's must-have keywords (tools, platforms, certifications)
   that literally appear in your resume, checked by code rather than the
   AI's own opinion, plus which keywords you matched and which you
   didn't (so you know what's worth building up in Work History,
   or just going in aware of). The Builder tab shows the score right after
   generating; the resume's own page shows the full breakdown (matched vs.
   missing) in a banner above the document; the Tracker tab's Match column
   shows it for every application at a glance, color-coded (green/amber/red).
   This is meta-info for you — it's never printed onto the resume itself.

Resume content is written with keyword coverage in mind: the AI reads the
job description's specific terms and, wherever your real experience
actually supports it, uses the posting's own wording for it (matching an
ATS keyword scan) — it won't claim a skill your work history doesn't back
up just because the posting mentions it. Bullets are written to be
substantive and thorough (real detail — the specific tools/systems/scale
involved, not one-line summaries) with no fixed bullet count: a role with
a long, detailed Work History entry (especially your current role) gets a
correspondingly long set of bullets, while a role you only wrote a
sentence or two about stays short — the source material's own depth
decides the length, not a target number. Skills are grouped into
categories that fit your background (e.g. "Networking", "Security &
Monitoring") and shown as a plain comma-separated list per category near
the bottom of the resume, just above Education.

Contact links (GitHub/LinkedIn/Portfolio) are shown as their actual URL
text rather than a "GitHub"/"LinkedIn" label, so the address is still
readable if you print/save the resume as a PDF and the hyperlink itself
doesn't carry over in whatever you open it with.

## Day-to-day workflow

First time through:
1. Fill in the **Profile** tab and save.
2. Add one or more entries in **Work History** with your real, detailed
   background — the more detail, the better the AI's output.
3. For each job you're applying to, go to **Resume / Cover Letter**: paste
   the posting and click Generate Resume, review the extracted fields
   afterward if needed, print the result (or copy the text) and submit
   your application.
4. As responses come in, update the status on that row in **Tracker**.
5. Check **Visualize** any time to see your funnel.

You can also add a Tracker row manually (skip AI generation entirely) if you
already applied somewhere without using the builder.
