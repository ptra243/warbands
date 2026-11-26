# Warband

A single-player autobattler prototype that runs in the browser. It mixes the single-row board and shop of *The Bazaar* and *Backpack Brawl* with the tribe bonuses, shop odds and levelling of *Teamfight Tactics*. Items are replaced by units: each one has health and attack and fights whatever stands opposite it.

You pick one faction and a leader, buy units over a series of rounds, and try to reach 10 wins before losing 5 lives. After a winning run you can keep going against the final boards of your own past winning runs.

## Playing it

Open `index.html` in a browser. Everything is in that one file; it needs no server and no install. Fonts load from Google Fonts and fall back to system fonts offline.

Run logs are saved automatically at the end of each run, and **Download saved runs** on the start and end screens writes them all to one JSON file.

Where they are saved depends on where the page runs:

- **As a Claude artifact:** in the artifact's own storage. That page cannot reach other hosts.
- **Anywhere else** (GitHub Pages, or the file opened from disk): in a small Supabase database, set up by `db/schema.sql`. Winning boards also go into a shared `ghosts` table, which is where the post-game finds its opponents.

The two stores do not see each other. The database key in `src/ui.js` is the publishable one, which is meant to be public; the database's rules allow reading and adding rows and nothing else.

## Layout

| Path | What it is |
| --- | --- |
| `src/engine.js` | All rules: units, tribes, items, leaders, relics, the battle simulation, the shop and economy, encounters, bosses, the post-game and the run log. No DOM, so it also runs in Node. |
| `src/ui.js` | Screens and input: faction and leader pick, shop, battle, summary, end screen, drag and drop, hover cards. |
| `src/art.js` | Unit, item and tribe icons as inline SVG. |
| `src/portraits.js` | The nine leader portraits. |
| `src/style.css` | Styles. |
| `build.py` | Assembles `index.html` from the files above. |
| `tools/` | Balance tools that run the engine in Node. |
| `tests/` | Headless browser checks. |
| `DESIGN.md` | Rules summary, the reasoning behind the main decisions, balance state and open threads. |
| `runs/` | Run logs from real play, one file per run, with an index. |
| `db/schema.sql` | The tables and access rules of the hosted database used outside Claude. |

## Building

```
python3 build.py
```

Edit the files in `src/`, run the build, and reload `index.html`. The built page is committed so the game can be played straight from the repository.

## Balance tools

These need Node 18 or later and nothing else.

```
node tools/bot.js 300            # a bot plays 300 runs per faction; prints runs won, win rate by round, fight length
node tools/bot.js 300 dumb       # the same with the older bot that plays items badly
node tools/roundrobin.js 30      # the real winning boards in tools/boards.js play each other
node tools/board-vs-field.js 40  # the last board in tools/boards.js against all the others
node tools/postgame.js           # bot wins a run, then plays the post-game against saved boards
node tools/rules-check.js        # spot checks for moving units, waiting minions and post-game lives
```

`tools/boards.js` holds final boards transcribed from real winning runs. They are the best benchmark available for late-game strength, because the bot plays the late game poorly.

How to read the bot: it buys greedily and positions crudely, so absolute win rates are low. Use it to compare before and after a change, and to compare factions with each other. It has disagreed with real play before, most clearly on how strong Undead summoners are.

## Browser checks

These need Python with Playwright and a Chrome binary. Set `CHROME` if Chrome is not at `/usr/bin/google-chrome`.

```
python3 tests/browser_flow.py      # faction, leader, encounters, camps, a boss, to the end of a run, for all three factions
python3 tests/browser_postgame.py  # win a run, keep going against stubbed saved boards, finish
python3 tests/browser_drag.py      # drop preview and pushing units aside
python3 tests/browser_cloud.py     # saving, post-game boards and the download outside Claude, against a stand-in database
```

Each prints any page errors on its last line. Screenshots go to `tests/shots/`, which is not committed.
