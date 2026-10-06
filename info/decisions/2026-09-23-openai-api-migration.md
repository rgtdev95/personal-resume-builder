# Swap the `claude` CLI for the OpenAI API

User asked to stop using the Claude Code CLI as the AI backend and use the
OpenAI API instead, with credentials in a `.env` file. This reverses the
reasoning in `info/decisions/2026-09-20-architecture.md` (which chose the
CLI specifically to avoid needing a separate API key) — that trade-off is
no longer what's wanted, so this is a straight swap, not an addition.

## What changed

- `code/claude-cli.js` (spawned `claude -p ...` via `execFile`, parsed its
  JSON envelope) is deleted, replaced by `code/ai-client.js`, which calls
  OpenAI's `/v1/chat/completions` endpoint directly with native `fetch`.
- `askForJson(prompt)` keeps the exact same signature and behavior (parse
  the model's text as JSON, one retry with a stricter "JSON only"
  instruction on failure, throw with `err.rawText` if that also fails) —
  `routes/documents.js` needed only its `require` path updated, nothing
  else in the app knows or cares which AI backend answers it.
- `response_format: { type: 'json_object' }` is passed on every call, so
  OpenAI itself is constrained to return valid JSON — stronger than
  hoping the model follows a "respond with only JSON" instruction, which
  is all the old CLI path could do. The parse-and-retry logic stays anyway
  as a cheap safety net.
- Config is `OPENAI_API_KEY` (required), `OPENAI_MODEL` (optional, default
  `gpt-4o-mini`), `OPENAI_BASE_URL` (optional — lets an OpenAI-compatible
  endpoint be swapped in later without another code change).

## No new dependency for either piece

- **HTTP calls**: Node 24's built-in `fetch` — no `openai` SDK package.
  The request shape here is one JSON POST; a full SDK would be a dependency
  for something a few lines already do.
- **.env loading**: Node 24's built-in `process.loadEnvFile()` — no
  `dotenv` package. `server.js` calls it once at startup, wrapped in
  try/catch since a missing `.env` shouldn't crash the server (the app is
  still fully usable — Profile/Work History/Tracker/Visualize don't touch
  AI at all; only Extract/Generate calls in the Builder tab need a key, and
  they fail with a clear message pointing at `.env.example` if it's
  missing).

## Not carried over

- The old design note about riding on the user's existing `claude` login
  instead of a separate API key no longer applies — an API key is now
  required for any AI feature. This is the whole point of the change, not
  a regression to caveat.
