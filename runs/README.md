# Saved runs

Run logs exported from play sessions, one file per run, oldest first. Times are UTC.

Each file is the log the game writes at the end of a run: every round's purchases, board, bench, opponent, result and per-unit battle figures. `ghostFrom` in `src/engine/postgame.ts` turns a winning log into a post-game opponent, and the boards in `tools/boards.ts` were transcribed from these.

The `balance` column is the rules version the run was played under. Runs marked 1 predate the version stamp, so they span several early rule sets.

| File | Faction | Leader | Outcome | Wins | Rounds | Post-game beaten | Balance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `2026-11-25_2359_undead_no-leader_lost-6.json` | Undead | – | lost | 6 | 11 | – | 1 |
| `2026-11-26_0007_elves_no-leader_lost-8.json` | Elves | – | lost | 8 | 13 | – | 1 |
| `2026-11-26_0012_humans_no-leader_lost-9.json` | Humans | – | lost | 9 | 14 | – | 1 |
| `2026-11-26_0027_undead_no-leader_lost-2.json` | Undead | – | lost | 2 | 7 | – | 1 |
| `2026-11-26_0044_elves_no-leader_won-10.json` | Elves | – | won | 10 | 14 | – | 1 |
| `2026-11-26_0054_undead_no-leader_lost-5.json` | Undead | – | lost | 5 | 10 | – | 1 |
| `2026-11-26_0128_humans_quartermaster_won-10.json` | Humans | quartermaster | won | 10 | 12 | – | 1 |
| `2026-11-26_0137_elves_grovekeeper_won-10.json` | Elves | grovekeeper | won | 10 | 12 | – | 1 |
| `2026-11-26_0144_undead_gravecaller_lost-1.json` | Undead | gravecaller | lost | 1 | 6 | – | 1 |
| `2026-11-26_0153_undead_bloodpriest_won-10.json` | Undead | bloodpriest | won | 10 | 11 | – | 1 |
| `2026-11-26_0200_undead_plaguefather_won-10.json` | Undead | plaguefather | won | 10 | 12 | – | 1 |
| `2026-11-26_0334_humans_marshal_won-11.json` | Humans | marshal | won | 11 | 16 | 1 | 2 |
| `2026-11-26_0347_undead_gravecaller_won-10.json` | Undead | gravecaller | won | 10 | 13 | 0 | 3 |
| `2026-11-26_0400_undead_plaguefather_won-12.json` | Undead | plaguefather | won | 12 | 17 | 2 | 4 |
| `2026-11-26_0410_undead_gravecaller_won-14.json` | Undead | gravecaller | won | 14 | 21 | 4 | 4 |
| `2026-11-26_0420_humans_warden_won-10.json` | Humans | warden | won | 10 | 15 | 0 | 5 |
| `2026-11-26_0428_elves_bladesinger_won-15.json` | Elves | bladesinger | won | 15 | 22 | 5 | 5 |
| `2026-11-26_0450_elves_bladesinger_lost-8.json` | Elves | bladesinger | lost | 8 | 12 | – | 6 |
| `2026-11-26_0529_humans_marshal_lost-7.json` | Humans | marshal | lost | 7 | 12 | – | 7 |
