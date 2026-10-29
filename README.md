# Personal Resume Builder

A single-user, localhost-only app for storing your profile and work history, tracking job applications, visualizing outcomes, and generating tailored resumes and cover letters.

The light, forest-green workspace has five sections: **Applications**, **Resume & cover letter**, **Application insights**, **Work history**, and **Your profile**. Wide-screen layouts support a selectable application details pane and side-by-side editing; smaller screens stack the panels.

## Requirements

- Node.js 24 or newer, including built-in node:sqlite.
- An API key for AI extraction/generation. Tracking, profile, and work-history editing work without a key.

## Run

From the repository root:

```sh
cd code
npm install
cp .env.example .env
# Add your own OPENAI_API_KEY to .env.
npm start
```

On PowerShell use Copy-Item .env.example .env instead of cp if preferred. If npm.ps1 is blocked, use npm.cmd.

Open http://127.0.0.1:3000. Installation also installs client dependencies; npm start builds the frontend and starts Express. The local database is created at code/data/resume-builder.db. Optional model, endpoint, and port overrides are shown in code/.env.example.

## Develop and verify

For UI development, run node server.js and npm run dev:client in separate terminals from code/. Vite proxies /api to the server. Saved-document pages are served by Express on port 3000; its /document.html and static assets are not proxied by Vite.

- Backend tests: npm test from code/ (in-memory data; no live AI calls).
- Frontend type-check/build: npm run build from code/client/.
- Frontend lint: npm run lint from code/client/.

Build/lint success does not replace browser verification. Rendered acceptance of the current redesign remains pending.

## Documentation

- [AGENTS.md](AGENTS.md): instructions for any coding agent.
- [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md): product scope and visual system.
- [Features and usage](info/features.md): workflows, screens, generation, and known behavior.
- [Architecture](info/architecture.md): structure, schema, state, and API reference.
- [Current context](info/context.md): implementation status and limitations.
- [Privacy review](info/privacy-review.md): pre-commit findings and remaining history exposure.
- [Decisions](info/decisions/): historical implementation rationale; current docs/source take precedence over superseded details.

## Data and privacy

The database contains personal profile, work-history, application, and document data. Keep it and its backups out of version control. Store local resumes/exports in the ignored private/ folder. Environment files, private keys, local agent settings, build output, and UI review captures are ignored; code/.env.example is a blank credential template.

Generation sends the posting and selected work history to the configured AI endpoint. Cover-letter generation can include prior structured resume content. The app has no authentication and binds to localhost.

A personal document exists in the history recorded for origin/main. It has been preserved locally and removed from the next snapshot; that does not erase earlier commits. See the privacy review before publishing.
