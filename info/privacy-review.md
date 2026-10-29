# Pre-commit privacy review

Reviewed on 2026-10-29. No commit, push, remote fetch, history rewrite, or real AI call was performed.

## Scope and findings

- Enumerated tracked files and untracked commit candidates and inspected the repository's ignore rules.
- Scanned candidate text for common provider tokens, private-key headers, embedded credential URLs, quoted credential assignments, email/phone patterns, personal-profile links, and machine-specific home paths. Only file names, categories, and counts were reported for potentially sensitive matches.
- Scanned 115 historical Git blobs reachable from local refs for high-confidence token, private-key, and credential-URL patterns. None were detected. This is a pattern-based local review, not a guarantee that every possible secret or remote copy has been discovered.
- A tracked personal work-history document was identified at info/notes/my-resume.md. It is now preserved at ignored private/my-resume.md, with its tracked copy removed from the working snapshot. Include that deletion when committing.
- The document already exists in the local remote-tracking history for origin/main. Removing it in the next commit does not erase historical copies. Cleaning that exposure requires a separately authorized history rewrite and coordinated push; neither was performed.
- code/.env, runtime database, and database backup were untracked and ignored. No history entries for the environment file or runtime database were found in local refs.
- .claude/settings.local.json contains local permission/configuration details and machine paths. It was untracked and is now ignored.
- Two historical decision documents contained local machine paths; these were replaced with neutral descriptions in the current files. Older commit copies remain in history.
- Other profile-URL matches were dependency funding/source links, template references, or generic form placeholders, not stored user contact data. Code tests use synthetic examples.

## Protections added

Ignore rules cover environment variants while allowing .env.example; private/ documents; local agent settings; Impeccable review/mock/build captures; common private-key/certificate files; and SQLite files/sidecars/backups outside the normal data directory. Existing dependency/build/log ignores remain.

AGENTS.md records privacy rules for any coding agent. CLAUDE.md was removed at the user's request. Public documentation describes actual behavior and contains no copied personal work history or credential values.

## Before the manual commit

Review git status and the final diff. Include the personal-document deletion and the ignore-rule changes; do not force-add ignored files. Commit only sanitized source and documentation. Treat prior Git history separately from the safety of the next snapshot.
