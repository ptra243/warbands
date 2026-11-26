# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Warband is a single-player browser autobattler prototype (one-row board, shop, tribes, levelling). There is no package manager, no bundler and no dependencies beyond Node 18+ for the balance tools and Python + Playwright for the browser checks. `README.md` has the gameplay overview and `DESIGN.md` has the rules, the reasoning behind them, the balance state and open threads. Read `DESIGN.md` before changing rules or balance.

## Commands

```
python build.py                  # rebuild index.html from src/ (required after any src/ edit)
node tools/bot.js 300            # bot plays 300 runs per faction: runs won, win rate by round, fight length
node tools/bot.js 300 dumb       # same with the older, worse item-playing bot
node tools/roundrobin.js 30      # real winning boards in tools/boards.js play each other
node tools/board-vs-field.js 40  # last board in tools/boards.js vs all others
node tools/postgame.js           # bot wins a run, then plays the post-game
node tools/rules-check.js        # assertion spot checks (moving units, waiting minions, post-game lives)
python tests/browser_flow.py     # full runs for all three factions in headless Chrome
python tests/browser_postgame.py # post-game against stubbed saved boards
python tests/browser_drag.py     # drop preview and pushing units aside
python tests/browser_cloud.py    # saving / ghosts / download against a stand-in Supabase
```

There is no test runner; each script is run on its own and is the unit of "a single test". Browser checks load `index.html` from disk (so rebuild first), need `CHROME` set to a Chrome binary (default `/usr/bin/google-chrome`, so on Windows it must be set), print page errors on their last line, and write screenshots to `tests/shots/` (gitignored).

## Architecture

- **`index.html` is a build output but is committed** so the game plays straight from the repo / GitHub Pages. `build.py` inlines `style.css`, `engine.js`, `art.js`, `portraits.js`, `ui.js` (in that order) into one page. Never hand-edit `index.html`; edit `src/` and rebuild, and commit both.
- **`src/engine.js` holds all rules and has no DOM.** It exports one `api` object via `module.exports` under Node and as `window.WB` in the browser. Tools `require('../src/engine.js')`; `ui.js` reads `window.WB` (plus `window.ART` from `art.js`). Anything new the UI or tools need from the engine must be added to that `api` object. Run state is a plain object (`run.things` holds units and items with `slot`/`bench` positions, plus `run.shop`, `run.gold`, `run.level`, etc.) mutated by engine functions such as `buy`, `sell`, `equip`, `moveTo`, `reroll`, `buyXp`.
- **`src/ui.js`** renders screens from a state object `S` exposed as `window.__S`; the browser tests drive the game through `data-act` / `data-shop` attributes and read `__S.screen` and `__S.run`. Keep those hooks stable when changing UI.
- **Balance versioning:** `BALANCE` in `engine.js` must be bumped on every rules change; it is stamped on each saved run log. `GHOST_FROM` is the oldest balance version whose winning boards are still used as post-game opponents; raise it to retire boards (nothing is deleted). Ghost boards are validated against current units/items on load, so renamed or removed units cause rows to be skipped.
- **Two storage back ends, chosen at runtime in `ui.js`:** inside a Claude artifact it uses `window.claude` artifact storage (which cannot reach other hosts); everywhere else it uses the Supabase REST API defined by `db/schema.sql` (runs plus a shared `ghosts` table, read/insert only). The key in `ui.js` is the publishable key and is meant to be public. The two stores do not share data.
- **Balance data:** `tools/boards.js` holds final boards transcribed from real winning runs in `runs/`, the best late-game benchmark since the bot plays the late game poorly. Use bot results to compare before/after a change or faction vs faction, not as absolute strength. When adding a run log to `runs/`, also add its row to `runs/README.md`.

## Code style

The JS is written densely (many statements per line, short names like `W`, `U`, `run`, `bu`). Match the surrounding style rather than reformatting files.
