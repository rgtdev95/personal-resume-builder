# Working on this project

These instructions apply to any coding agent working in this repository.

## Read first

- `info/context.md`: current implementation, constraints, and known limitations.
- `info/features.md`: actual user workflows and behavior.
- `info/architecture.md`: backend, schema, routes, and frontend structure.
- `PRODUCT.md` and `DESIGN.md`: product scope and visual system.

Treat source code as the authority when documentation disagrees. Update the affected documentation alongside changes. Record significant decisions in `info/decisions/YYYY-MM-DD-title.md` and keep `info/context.md` current.

## Development

- All application code lives in `code/`. Use Node.js 24 or newer.
- Backend: Express and built-in SQLite; one router per resource.
- Frontend: React, TypeScript, Vite, Tailwind v4, and Radix/shadcn controls in `code/client/`.
- The generated-document viewer in `code/public/` is intentionally plain HTML, CSS, and JavaScript.
- From `code/`, run `npm install`, then `npm start` to build and serve the app.
- For UI development, run `node server.js` and `npm run dev:client` in separate terminals from `code/`.
- Run backend checks with `npm test` from `code/`. Run frontend checks with `npm run build` and `npm run lint` from `code/client/`. On Windows with blocked PowerShell wrappers, use `npm.cmd`.

## Preserve behavior

- Keep the app single-user and bound to localhost. Do not introduce public hosting or authentication without an explicit request.
- Preserve in-progress drafts across section switches; inactive sections remain mounted.
- Preserve the backend status taxonomy, duplicate warnings, document upserts, and cascading document deletion.
- Use additive, idempotent migrations for existing databases; never reset real user data.
- Keep document keyword-match metadata outside printable document HTML.
- Respect the confirmed light, warm-neutral, forest-green design and wide-screen layouts.

## Privacy and credentials

- Never commit real resumes, contact details, work-history exports, job-application data, generated documents, or database backups.
- `code/.env` and `code/data/` are private runtime files. `private/` is for local personal documents. Do not read or expose their contents unless the task requires it.
- Only commit credential templates with blank values or clearly synthetic placeholders. Keep `.env.example` tracked.
- Keep machine-specific agent settings, local environment overrides, screenshots of real data, and build artifacts out of commits.
- When scanning for secrets, report file paths and finding categories, not matched values.
- Do not invoke real AI generation or modify the live database just to verify a UI or documentation change.
- Before a commit, review both tracked changes and untracked files. Ignore rules do not protect files already tracked in Git, and removal from a new commit does not erase history.
- Do not commit, push, rewrite Git history, or force-push without the user's explicit instruction.

## Verification and handoff

Run checks appropriate to the change and report their actual scope. Do not claim browser verification, successful AI generation, or visual acceptance without evidence. Use synthetic data for tests and examples.
