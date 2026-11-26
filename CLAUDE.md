# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Browser autobattler in strict TypeScript, built by Vite into one self-contained `dist/index.html`. Read `DESIGN.md` before changing rules or balance.

## Commands

```
npm run check         # tsc, ESLint, Prettier, Vitest: run before committing
npm run test:e2e      # build + Playwright (needs `npx playwright install chromium` or CHROME=path)
npm run golden:update # re-record the rules baseline after an intended rules change
npm run bot -- 300    # balance bot; also roundrobin, board-vs-field, postgame
```

## Rules that aren't obvious from the code

- Node runs `.ts` directly, so use erasable syntax only: no enums, namespaces or parameter properties. Use `import type` for types, and give relative imports a `.ts` extension.
- `src/engine/` has no DOM. Callers import it only through `src/engine/index.ts`.
- Never call `Math.random` in the engine. Use `rng.ts` (`random`, `rnd`).
- `tests/golden.test.ts` fails on any change to rules. A refactor must keep it passing. A deliberate rules change bumps `BALANCE` in `src/engine/constants.ts`, then runs `npm run golden:update`. Don't edit the frozen bot in `tests/golden/harness.mjs`.
- The browser checks drive the UI through `window.__S` and the `data-act`, `data-shop` and `data-own` attributes. Keep those stable.
- The Supabase key in `src/ui/storage.ts` is the publishable key and is meant to be public.
- Adding a run log to `runs/` also means adding its row to `runs/README.md`.
