# Warbands

A browser autobattler: a run of shop rounds and fights against a hidden opponent. This glossary covers the terms that need to be unambiguous when talking about the code. Rules and balance live in `DESIGN.md`.

## Battle

**Battle**:
One fight between two boards, from the first tick until one side wins or both draw. It is decided entirely by the boards, the leaders and relics, and the random seed.
_Avoid_: combat, match

**Tick**:
One fixed 0.05-second advance of a battle. A battle is always advanced in whole ticks, so its outcome never depends on frame rate or battle speed.
_Avoid_: step (for the time unit), frame

**Battle event**:
Something that happened during a tick and that a battle screen may show: a hit, a heal, a death, a summon, an attack, rot, a smite, and so on.

## Playback

**Playback**:
Advancing a battle in real time for someone to watch. It banks leftover frame time, applies the battle speed, and hands out each tick's battle events and a unit snapshot.
_Avoid_: animation, loop

**Fast-forward**:
Running a battle to its end with no one watching. It is used by skip, the yardstick, the balance tools and tests, and it reaches the same result as playback of the same battle.
_Avoid_: simulate (ambiguous), instant battle

**Battle speed**:
The player's choice of how many seconds of battle pass per real second during playback.

**Unit snapshot**:
What a battle screen needs to draw one unit at one moment. That includes how full its health and cooldown are, the attack and health it shows, where it is aiming, its status (rot, weak, burning, shielded), and whether it attacks at range.
_Avoid_: view (that's a screen's own drawing of a unit)

**Battle screen**:
One way of drawing playback: the Pixi screen (animated, the default) or the classic screen (HTML, the fallback). Both screens show the same battle events and unit snapshots and differ only in presentation.
_Avoid_: battle view, renderer (in conversation)

**Ranged**:
Whether a unit's attack is shown as a projectile rather than a lunge. It is a presentation fact and has no effect on targeting.
