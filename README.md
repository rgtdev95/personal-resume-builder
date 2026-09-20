# personal-resume-builder

A single-user, localhost-only web app that stores your profile and raw work
history, tracks job applications, charts your application funnel, and uses
the Claude Code CLI to generate a tailored resume and cover letter for each
job application.

## Requirements

- Node.js >= 24 (needed for the stable built-in `node:sqlite`)
- The `claude` CLI installed and authenticated on this machine

## Run it

```
cd code
npm install
npm start
```

Then open **http://127.0.0.1:3000**. The SQLite file is created on first run
at `code/data/resume-builder.db` (gitignored). `npm install`/`npm start` at
the `code/` root cascade into `code/client/` automatically (its own
`package.json` for the React/Vite/shadcn frontend) — there's nothing extra
to remember day to day.

## Developing the UI

The frontend (`code/client/`) is a separate Vite app, so `npm start`
rebuilds it from scratch every time — fine for normal use, slow for
iterating on styling. While actively working on the UI, run two terminals
instead:

```
node server.js              # terminal 1, from code/ — the API on :3000
npm run dev:client           # terminal 2, from code/ — Vite + HMR on :5173
```

Open the Vite terminal's URL (usually http://localhost:5173); it proxies
`/api/*` to the Express server so there's one origin from the browser's
point of view.

## Test it

```
cd code
npm test
```

## Docs

- [info/features.md](info/features.md) — what each tab does, and the day-to-day workflow
- [info/architecture.md](info/architecture.md) — tech stack, project structure, database schema, API reference
- [info/context.md](info/context.md) — current status and conventions
- [info/decisions/](info/decisions/) — why things were built the way they were
