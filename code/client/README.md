# Resume Builder workspace frontend

React, TypeScript, Vite, Tailwind v4, Radix/shadcn controls, and ECharts. The five workspace sections preserve drafts across navigation. The standalone saved-document viewer lives in ../public and is served by Express.

## Development

From code/, run node server.js for the API and npm run dev:client in another terminal for Vite. Vite proxies /api to localhost:3000. Use http://127.0.0.1:3000/document.html?id=... for the document viewer; its assets are served by Express, not Vite.

## Checks

From this directory, run npm run build and npm run lint. The build type-checks before bundling. Use npm.cmd on Windows if the PowerShell wrapper is blocked.

## Documentation

See ../../AGENTS.md for project instructions, ../../DESIGN.md for visual rules, and ../../info/features.md and ../../info/architecture.md for actual behavior and limitations. Browser verification must be reported separately from build/lint checks.
