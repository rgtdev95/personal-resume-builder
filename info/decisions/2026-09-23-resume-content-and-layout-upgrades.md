# Resume content & layout upgrades

User-requested batch: categorized skills (moved to just before Education),
longer/more descriptive bullets, match score visible in the Tracker table,
a wider overall layout, and contact links that show as real URL text (not
a "GitHub"/"LinkedIn" label) so they're still readable once printed to PDF.

## Skills: AI-chosen categories, not a fixed taxonomy

`buildResumePrompt` now asks for `skills` as
`[{category, items[]}]` instead of a flat array, with example categories
("Systems & Infrastructure", "Networking", "Security", ...) offered as
guidance, not a fixed list — different candidates/fields need different
groupings, and a hardcoded taxonomy would either be wrong for some resumes
or need per-field special-casing. `renderResumeHtml` just iterates whatever
categories come back. Regenerating a resume made before this change is what
upgrades it to the new shape — old `html_snapshot`s are frozen HTML and are
unaffected either way.

## Match score pulled out of `structured_json` in JS, not SQL

`applications.js`'s tracker-list query now also selects the resume's
`structured_json` and `JSON.parse`s it per row to pull `match_score`,
rather than using SQLite's `json_extract`. Keeps the JSON1-extension
question out of scope entirely (Node's bundled `node:sqlite` may or may not
have it compiled in) and keeps the parsing logic next to the one place that
needs it. The full blob (matched/missing keyword lists) is deliberately
stripped back out before the row goes to the client — the tracker only
needs the number.

## Contact links show the literal URL, not a label

`contactLine`'s `externalLink` used to render `<a href="...">GitHub</a>`;
now it renders the normalized URL itself (scheme and trailing slash
stripped for readability) as the link text. Printed PDFs don't reliably
preserve clickable hyperlinks across every PDF viewer, so a label-only link
becomes dead text with no way to find the actual address — showing the URL
as the visible text means it's still useful (readable, copyable, or
retypeable) even where the hyperlink itself doesn't carry over.
