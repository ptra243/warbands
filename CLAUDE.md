# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Warband is a single-player browser autobattler prototype (one-row board, shop, tribes, levelling), written in strict TypeScript and built with Vite into one self-contained `dist/index.html`. `README.md` has the gameplay overview and `DESIGN.md` has the rules, the reasoning behind them, the balance state and open threads. Read `DESIGN.md` before changing rules or balance.

## Commands

```
npm run dev                      # Vite dev server
npm run build                    # dist/index.html (single file, everything inlined)
npm run check                    # tsc + ESLint + Prettier check + Vitest; run before committing
npm test                         # Vitest only
npx vitest run tests/rules.test.ts -t "swaps neighbours"   # one test file / one test
npm run test:e2e                 # build, then Playwright browser checks in tests/e2e
npx playwright test drag         # one browser spec (needs a build first)
npm run golden:update            # re-record tests/golden/baseline.json after an intended rules change
npm run bot -- 300 [dumb]        # balance tools; also roundrobin, board-vs-field, postgame
```

Node ≥ 22.18 runs `.ts` files directly (type stripping), so tools are plain `node tools/x.ts`. Because of that, the TS config enforces `erasableSyntaxOnly` and `verbatimModuleSyntax`: no enums, namespaces or parameter properties; use `import type` for types; relative imports carry the `.ts` extension. Playwright needs `npx playwright install chromium`, or `CHROME=/path/to/chrome`.

## Architecture

- **`src/engine/` holds all rules and has no DOM.** `index.ts` is the engine's interface; the UI, tools and tests import it as `import * as W from '.../engine/index.ts'`. Anything new they need must be exported there. Rules data lives in `data/` (units with ability hooks such as `onStart`, `onDeath`, `tick`, `mod`; tribes, items, leaders, relics). `battle/effects.ts` has the primitives (targeting, `dmg`, `die`, `summon`, Rot) that unit hooks call, and `battle/sim.ts` the simulation (`createBattle`, `step`). `run.ts`, `shop.ts`, `round.ts`, `encounters.ts`, `postgame.ts` and `enemies.ts` cover the run around the battles. Shapes are in `types.ts`. Run state is a plain object mutated by engine functions (`buy`, `sell`, `equip`, `moveTo`, `reroll`, `buyXp`, `finishBattle` …).
- **All engine randomness goes through `rng.ts`** (`random`, `rnd`). Never call `Math.random` in the engine; `setRandom(fn)` seeds it for tests. `ids.ts` owns the uid counter (`nextUid`, `reserveUid`).
- **The golden test is the rules safety net.** `tests/golden.test.ts` plays seeded bot runs, a post-game and board-vs-board fights and compares hashes with `tests/golden/baseline.json`. A refactor must leave it passing. A deliberate rules change must bump `BALANCE` in `constants.ts` and re-record the baseline. `tests/golden/harness.mjs` contains a frozen copy of the bot; do not "improve" it.
- **Balance versioning:** `BALANCE` is stamped on every saved run log. `GHOST_FROM` is the oldest balance version whose winning boards are still used as post-game opponents; raise it to retire boards (nothing is deleted). Saved boards are validated against current units/items on load, so renamed or removed units cause rows to be skipped.
- **`src/ui/`** renders screens as HTML strings (`html.ts`) into `#app` from the UI state `S` (`state.ts`). `render.ts` picks the screen, `input.ts` handles events, `battle.ts` plays battles back from the engine's event list (`B.ev`). `S` is exposed as `window.__S`, and the browser checks drive the game through `data-act` / `data-shop` / `data-own` attributes and read `__S.screen` / `__S.run`. Keep those hooks stable.
- **Two storage back ends, chosen at runtime in `ui/storage.ts`:** inside a Claude artifact it uses `window.claude` artifact storage (typed in `ui/claude-host.ts`; it cannot reach other hosts). Everywhere else it uses the Supabase REST API defined by `db/schema.sql` (runs plus a shared `ghosts` table, read/insert only). The key is the publishable key and is meant to be public. The two stores do not share data.
- **Balance data:** `tools/boards.ts` holds final boards transcribed from real winning runs in `runs/`. They are the best late-game benchmark, since the bot plays the late game poorly. Use bot results to compare before/after a change or faction vs faction, not as absolute strength. When adding a run log to `runs/`, also add its row to `runs/README.md`.
- **Deploy:** `dist/` is not committed. `.github/workflows/pages.yml` builds and deploys it to GitHub Pages on pushes to `main`, and `ci.yml` runs `check`, the build and Playwright.
