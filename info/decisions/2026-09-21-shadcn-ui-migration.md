# Migrate the 5-tab app shell to React + Tailwind v4 + shadcn/ui

## Context

User asked to redesign the UI using shadcn/ui specifically (confirmed via a
scoping question: the full component-library migration, not just a visual
restyle). shadcn only works inside a React + Tailwind build, so this is a
full frontend rewrite of the plain HTML/vanilla-JS app shell. The backend
(Express routes, `db.js`, `funnel.js`, `claude-cli.js`) was not touched.

## Decisions

**Scope: rebuild the 5-tab shell, leave `document.html` alone.** The
generated-document viewer/editor/print page doesn't need Tabs/Dialog/Select
— it's a content-display + contenteditable + print target with two
buttons. Forcing it into the SPA would mean a router or Vite multi-page
config for no real benefit. It stays a plain static page, restyled by hand
(`public/style.css`, trimmed to just the rules it still uses) to visually
match the new look.

**Language: TypeScript for `client/` only; the Express backend stays plain
JS.** shadcn's CLI and every current official doc (verified live against
`ui.shadcn.com/docs/installation/vite`, not training-data memory) assume a
TS project — `tsconfig.json`/`tsconfig.app.json` path aliases, `.tsx`
component output, no documented plain-JS path. Fighting that would mean
debugging whatever breaks with no official guidance. A JS backend + TS
frontend is a common, low-risk split since the two never share a module
system anyway (Node CommonJS vs. bundled ESM).

**Two `package.json` files, not one merged one.** `npm create vite` and
`shadcn init` both assume a self-contained project (own `package.json`,
`tsconfig*.json`, `vite.config.ts`). `code/client/` has package.json;
`code/package.json`'s `postinstall` runs `cd client && npm install` so a
plain `npm install` at the root still pulls in everything — no second
command for the user to remember. `npm start` similarly runs
`npm run build` (which builds the client) before `node server.js`.

**shadcn init: `-t vite -b radix -p nova`.** `-b radix` (not the newer
`base`/`aria` options the current CLI also offers) because Radix is what
every existing shadcn doc/tutorial/community answer assumes — the
best-documented, most stable choice. `-p nova` is shadcn's own default
preset (Lucide icons, Geist font, neutral OKLCH palette).

**ECharts is now a real bundled import, not a served UMD file.** Vite lets
the client `import` `echarts/core` + `SankeyChart` + `TooltipComponent` +
`CanvasRenderer` directly (tree-shaken), so `server.js`'s old
`/vendor/echarts.min.js` route was deleted entirely — nothing left to serve.

**Tab content uses `forceMount` + CSS-hidden, not Radix's default
unmount-when-inactive.** Caught during implementation, not planned upfront:
Radix `Tabs.Content` unmounts inactive panels by default (confirmed by
reading `@radix-ui/react-tabs`'s source directly rather than assuming), so
without `forceMount` switching away from the Builder tab mid-draft and back
would silently wipe the draft — a real regression from the old app, where
tabs were just CSS-hidden `<section>`s that never left the DOM. Fixed with
`forceMount` on every `TabsContent` plus a `data-[state=inactive]:hidden`
class. Consequence: `TrackerTab` no longer remounts (and therefore
no longer auto-refetches) every time you switch to it, since it now mounts
once and stays alive — it needs an explicit `refreshSignal` prop, bumped by
`App.tsx` whenever `BuilderTab` reports a document was generated, since
that's the only way a row it's already displaying can gain a
`resume_id`/`cover_letter_id` without Tracker's own knowledge.

**Deliberately not added:** shadcn's `form` component (react-hook-form +
zod) — current validation is two `required` fields, not worth a form
library; a JS date-picker (`calendar`/`popover`) — `<Input type="date">` is
shadcn's own `Input` wrapping the native picker, which already works;
`concurrently` for the two-terminal dev workflow — two terminals is normal
and well understood, one dependency saved.

Full technical detail: `info/architecture.md`. Implementation plan (approved
before building): `C:\Users\sysowner\.claude\plans\partitioned-sleeping-raccoon.md`.
