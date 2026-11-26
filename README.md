# Warband

A single-player autobattler prototype that runs in the browser. It mixes the single-row board and shop of _The Bazaar_ and _Backpack Brawl_ with the tribe bonuses, shop odds and levelling of _Teamfight Tactics_. Items are replaced by units: each one has health and attack and fights whatever stands opposite it.

You pick one faction and a leader, buy units over a series of rounds, and try to reach 10 wins before losing 5 lives. After a winning run you can keep going against the final boards of your own past winning runs.

## Playing it

Play the hosted copy on GitHub Pages, or build it yourself (below) and open `dist/index.html` in a browser. The built page is one self-contained file: it needs no server and no install, and the same file works as a Claude artifact. Fonts load from Google Fonts and fall back to system fonts offline.

Run logs are saved automatically at the end of each run, and **Download saved runs** on the start and end screens writes them all to one JSON file.

Where they are saved depends on where the page runs:

- **As a Claude artifact:** in the artifact's own storage. That page cannot reach other hosts.
- **Anywhere else** (GitHub Pages, or the file opened from disk): in a small Supabase database, set up by `db/schema.sql`. Winning boards also go into a shared `ghosts` table, which is where the post-game finds its opponents.

The two stores do not see each other. The database key in `src/ui/storage.ts` is the publishable one, which is meant to be public; the database's rules allow reading and adding rows and nothing else.

## Development

Needs Node 22.18 or later (24 recommended, see `.nvmrc`). Node runs the TypeScript tools directly.

```
npm install
npm run dev          # Vite dev server with hot reload
npm run build        # dist/index.html, one self-contained page
npm run check        # typecheck, lint, format check and unit tests
npm test             # unit tests only (Vitest)
npm run test:e2e     # build, then the browser checks (Playwright)
npm run format       # Prettier
```

CI runs `check`, the build and the browser checks on every push and pull request. Pushes to `main` deploy `dist/` to GitHub Pages.

## Layout

| Path                 | What it is                                                                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/engine/`        | All rules: units, tribes, items, leaders, relics, the battle simulation, the shop and economy, encounters, bosses, the post-game and the run log. No DOM, so it also runs in Node. `index.ts` is its interface. |
| `src/ui/`            | Screens and input: faction and leader pick, shop, battle, summary, end screen, drag and drop, hover cards, saving and loading.                                                                                  |
| `src/ui/art.ts`      | Unit, item and tribe icons as inline SVG. `portraits.ts` holds the nine leader portraits.                                                                                                                       |
| `src/ui/card-art.ts` | Illustrated card art for units, a study not yet used by the game. `facets.ts` is the drawing kit it shares with the portraits.                                                                                  |
| `ART.md`             | How to draw card art in the approved style, with reference renders in `art/reference/`.                                                                                                                         |
| `src/style.css`      | Styles.                                                                                                                                                                                                         |
| `index.html`         | The page Vite builds from.                                                                                                                                                                                      |
| `tools/`             | Balance tools that run the engine in Node, and `cards.ts`, which renders card art for review.                                                                                                                   |
| `tests/`             | Unit tests and the golden rules fingerprint (Vitest); `tests/e2e/` holds the browser checks (Playwright).                                                                                                       |
| `DESIGN.md`          | Rules summary, the reasoning behind the main decisions, balance state and open threads.                                                                                                                         |
| `runs/`              | Run logs from real play, one file per run, with an index.                                                                                                                                                       |
| `db/schema.sql`      | The tables and access rules of the hosted database used outside Claude.                                                                                                                                         |

## Tests

- **Unit tests** (`tests/*.test.ts`) cover moving units, waiting minions and the post-game.
- **The golden test** (`tests/golden.test.ts`) plays seeded bot runs, a post-game and every saved board against every other, and compares the results with `tests/golden/baseline.json`. It fails whenever the rules change. When that is intended, bump `BALANCE` in `src/engine/constants.ts` and record a new baseline with `npm run golden:update`.
- **Browser checks** (`tests/e2e/`) play the built page in Chromium: runs for all three factions, the post-game against stubbed saved boards, drag and drop, and saving to a stand-in database. Run `npx playwright install chromium` once, or set `CHROME` to an existing Chrome or Chromium. Failure screenshots go to `tests/shots/`, which is not committed.

## Balance tools

```
npm run bot -- 300               # a bot plays 300 runs per faction; prints runs won, win rate by round, fight length
npm run bot -- 300 dumb          # the same with the older bot that plays items badly
npm run roundrobin -- 30         # the real winning boards in tools/boards.ts play each other
npm run board-vs-field -- 40     # the last board in tools/boards.ts against all the others
npm run postgame                 # bot wins runs, then plays the post-game against saved boards
```

`tools/boards.ts` holds final boards transcribed from real winning runs. They are the best benchmark available for late-game strength, because the bot plays the late game poorly. `ENG=path/to/engine.ts` runs the round-robin tools against another copy of the engine, for side-by-side comparisons.

How to read the bot: it buys greedily and positions crudely, so absolute win rates are low. Use it to compare before and after a change, and to compare factions with each other. It has disagreed with real play before, most clearly on how strong Undead summoners are.
