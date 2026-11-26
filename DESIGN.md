# Design notes

The state of the game, why the main rules are the way they are, and what is still open. Numbers here are the ones in `src/engine/` at the time of writing; the code is the authority.

## The run

- One faction per run, then one of three leaders for it.
- 10 wins finishes the run. 5 lives; a loss costs one.
- Each round: an optional encounter, the shop, then a fight.
- Every fifth round is a boss (Ogre Warlord, Bone Dragon, Stone Titan). Beating one offers three relics.
- The opponent is hidden until the fight starts. The shop shows only a "Boss round" tag.

## The board and the fight

- One row of up to 10 slots per side. Slots open centre-out with shop level: `min(10, level + 3)`. The enemy never has more slots than you.
- Units are 1, 2 or 3 slots wide.
- Targeting, in order: everything opposite (a wide unit splits its damage evenly); else the weaker enemy one slot diagonally; else, in a boss fight or when the attacker's side is down to two units, the nearest enemy anywhere; else the hero.
- A hero with no units left takes triple damage.
- Sudden death starts at 35 seconds, or at once when neither side has a unit left.
- Hero health is `150 × 1.2^(round − 1)`.

## Shop and economy

- Five cards. Reroll 2 gold. Buy 4 XP for 4 gold; 2 XP free each round.
- Income `min(4 + round, 9)`, plus 1 per 10 gold held (to 3), plus 1 for a win.
- Three of the same unit merge into the next tier, which is twice as strong. Three tiers.
- Right-click a shop card to freeze it. Right-click a unit to sell it.

## Factions

### Humans

A mixed party. Four classes, each with three levels at 2, 4 and 6 units: Tank (health), DPS (attack and crit), Mage (attack speed and burn), Cleric (regeneration and smite). One of each gives Full party.

Humans scale through items, which only they find. An item goes on one unit, gives a stat or effect, and most grant a class, so any unit can count toward a second class. Three of the same item merge into a Fine version at 1.5 times the effect. Selling a unit returns its item.

Leaders: Quartermaster (items), Marshal (Full party), Warden (end units).

### Elves

Strong individuals that grow permanently after every battle, win or lose, and buff what stands beside them. Each tribe has a building.

Tribes at 2 and 4: Grove (regeneration), Sun (attack for all), Drow (crit, attack speed and flanking), Moon (shields).

Flanking is bonus damage against an enemy that is not attacking that unit. The Dark Altar lends half the Drow bonus to adjacent non-Drow units.

The three 1-cost Elves have 8 extra health that does not multiply with tier. It was added flat on purpose, to fix the opening without feeding the late game.

Leaders: Grovekeeper (growth), Architect (buildings), Bladesinger (fastest attacker).

### Undead

Summons, death effects and weakening the enemy.

Tribes at 2 and 4: Reborn (rise after dying), Blight (Rot), Necromancer (stronger summons that soak damage for their summoner), Cultist (attack on ally death).

Rot stacks to 5, or 6 at the top Blight level. Each stack deals damage and lowers attack by 6%. A stack fades every 12 seconds, or every 6 once the unit that applied it is dead.

A summon with no free slot joins an existing copy of itself. A Bone Minion with no slot and nothing to join waits, and arrives as one combined minion when a slot opens.

Leaders: Gravecaller (summon shields), Blood Priest (attack on death), Plaguefather (Rot).

## Post-game

After the tenth win, "Keep going" keeps the board, gold and at least 3 lives. Opponents are the final boards of your saved winning runs with their leader and relics. They are ordered by a quick round-robin between themselves under current rules, weakest first, and each win makes the next opponent 15% stronger. The score is the number beaten.

Past boards come from the artifact's storage when the page runs inside Claude, and from the shared `ghosts` table in the hosted database everywhere else, where at most 16 of the newest 60 are drawn each time. Every board is checked against the current units and items as it loads, so a row with an unknown unit is skipped.

`BALANCE` in the engine goes up with every rules change and is stamped on each saved run. `GHOST_FROM` is the oldest balance version whose boards are still used. Raise it to retire boards; nothing is deleted.

## Decisions worth remembering

- **Auras do not stack and scale 1× / 1.5× / 2× by tier.** They originally doubled per tier and stacked, which let two cheap units outdo a tier-3 carry.
- **Wide units split damage evenly.** Full damage to each target made 2-slot units the answer to everything.
- **Enemy tiers are gated by round** (`T2FROM`, `T3FROM`), roughly what a player could own by then.
- **Growth is additive.** Multipliers on growth compounded out of control.
- **Summons do not count as deaths** for the Blood Priest, Soul Reaper or Champion. Each of them was found scaling off a stream of dying minions.
- **A quarter of each boss attack carries through to the hero.** Before that, bosses never threatened a board that could stand in front of them.
- **Hidden opponent.** Chosen after the game became too easy with full information. It removed the target preview from the shop, which is why the summary screen names what dealt the hero damage.
- **Post-game order by simulation.** An estimate from unit stats ranked boards badly, because it ignored Rot, summons and death scaling.

## Balance state

Bot runs won, 300 per faction, last full run: Humans about 30%, Elves 20 to 30%, Undead about 48%.

The real winning boards in `tools/boards.ts` tell a different story at the top: Humans and Undead are even against each other, and Elves grow strongest of all in a long run. The bot's Undead figure comes mostly from very strong opening rounds (over 80% of round 1 fights) since Gravediggers and Necromancers began starting with a minion.

Watch list:

- Undead openings, and generated enemy summoners, which received the same minion changes.
- Elves at the round 5 boss, where most of the bot's Elf runs end.
- Drow health growth. Drow hit hard at the top level but die in the first few seconds late on.

## Open threads

- **A horizontal trait.** A second tag on each unit with its own bonus, so a build can go deep on one tribe or wide across several. Elves and Undead have one axis each and would gain the most; Elves already tag buildings. Humans already have classes, items and Full party, and are not weak, so they do not need another source of scaling.
- **Human sets (Knights, Holy, Arcane).** One unit per class plus a capstone in each. Sketched as: Knights with a Field Medic as the Cleric and a Charge bonus; Holy with an Inquisitor, Exorcist and Seraph; Arcane using wizard schools, with an Abjurer (Tank), Diviner (DPS), Evoker (Mage), Illusionist (Cleric, grants dodges) and Archmage. Worth doing for variety and new units, with a small bonus or none. Choosing which sets are in the shop only matters once there are four or more; until then a larger pool makes triples harder to find.
- **A fourth faction, Monsters.** Units that transform mid-fight and reset afterwards, each with its own condition. Tribes suggested: Orc, Warbeast, Elemental and one more.
- **A warning before a fight** when a slot is open and a bench unit would fit it.
- **Relic art.** None yet.
- **Leader portraits.** In, with three known rough spots: eye sockets can read as a blindfold at small sizes, the Bladesinger's blades are crowded, and the Marshal's cloak overlaps.
- **Blood Cultist** cannot sacrifice wide units, so a Bone Colossus cannot be broken on purpose.
- **Touch input** is untested on a real device.
