# Features & Usage

What each tab does, and the workflow for using the app day to day. For tech
stack, project structure, database schema, and the API reference, see
[architecture.md](architecture.md). For current build status, see
[context.md](context.md).

## Profile tab
Your name, phone, address, education (add as many entries as you want), and
links (GitHub, LinkedIn, portfolio). One profile, saved as a whole on submit.

## Work History tab (source of truth)
A free-form list of raw work-history text — old resumes, bullet dumps,
project write-ups, anything. Add as many entries as you want. This is what
the AI reads when it tailors a resume or cover letter; it's told to use only
what's in these entries and never invent experience.

An entry can hold multiple jobs — paste a whole old resume with three jobs
in it into one entry if you want. The one thing to know: in the Builder tab
you select which *entries* to include per application, not which jobs
within an entry. If you want the option to include one job but exclude
another for a given application, put them in separate entries; if you'd
always include them together anyway, one combined entry is simpler.

## Tracker tab
The table of job applications: Job Title, Company, Compensation, Job URL,
links to the generated Resume/Cover Letter, Status, Date. Add rows manually,
edit or delete them, and change status inline from a dropdown as an
application progresses. Deleting an application also deletes its generated
documents.

## Visualize tab
A Sankey funnel chart (Applications → Cover Letter / No Cover Letter →
outcome stages → final result), built live from the Tracker data — not
hand-entered. See [architecture.md](architecture.md#status-taxonomy--funnel-chart)
for how the chart is derived from the status data.

## Resume / Cover Letter tab (the builder)
1. Paste a Job URL and the full job description.
2. **Extract Details** — calls the AI to pull out company, job title,
   compensation, and location. Fields stay editable since extraction can be
   imperfect.
3. A duplicate-application check runs automatically (on blur of
   company/job title) — if you've already applied to this company for this
   role, you get a warning with the existing entry's status/date, and a
   choice to view it instead or proceed anyway.
4. Pick which Work History entries to include (defaults to all).
5. **Generate Resume** / **Generate Cover Letter** — calls the AI, renders
   the result into a fixed HTML template, and creates the Tracker row for
   you automatically at this point; there's no separate "save to tracker"
   step. Whichever of the two buttons you click first is what creates the
   row — clicking the other one afterward (e.g. Generate Cover Letter right
   after Generate Resume) reuses that same row instead of creating a
   duplicate. See [architecture.md](architecture.md#design-notes) for why
   the row isn't created earlier (at Extract or duplicate-check time).
6. **Cancel** resets the whole form. Since the tracker row isn't created
   until you click Generate, Cancel never leaves a stray row behind — but
   it also can't undo a generation that already happened; Cancel only
   clears the form so you can start a fresh draft.
7. Generated documents open in their own page (`document.html`) where the
   text is directly editable (click and type) and there's a **Print / Save
   as PDF** button that uses the browser's native print-to-PDF.

## Day-to-day workflow

First time through:
1. Fill in the **Profile** tab and save.
2. Add one or more entries in **Work History** with your real, detailed
   background — the more detail, the better the AI's output.
3. For each job you're applying to, go to **Resume / Cover Letter**: paste
   the posting, extract, review the fields, generate the documents, print
   them (or copy the text) and submit your application.
4. As responses come in, update the status on that row in **Tracker**.
5. Check **Visualize** any time to see your funnel.

You can also add a Tracker row manually (skip AI generation entirely) if you
already applied somewhere without using the builder.
