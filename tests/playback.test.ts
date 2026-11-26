import { afterEach, describe, expect, it } from 'vitest';
import * as W from '../src/engine/index.ts';
import type { UnitSpec } from '../src/engine/index.ts';

const spec = (id: string, slot: number, tier = 1): UnitSpec => ({ id, slot, tier, item: null, gAtk: 0, gHp: 0 });

/** battle i of the yardstick round robin, with the engine's random draws seeded by `seed` */
function yardstickBattle(i: number, j: number, seed: number): W.Battle {
  const a = W.YARDSTICK[i],
    b = W.YARDSTICK[j];
  W.setRandom(W.seeded(seed));
  return W.createBattle(
    a.units.map((x) => ({ ...x })),
    b.units.map((x) => ({ ...x })),
    13,
    a.open,
    b.open,
    { leader: a.leader, relics: a.relics, foeLeader: b.leader, foeRelics: b.relics },
  );
}

/** play B back the way a browser would: uneven frames at a given speed, frame times from their own generator */
function watch(B: W.Battle, speed: number, frameSeed: number) {
  const frames = W.seeded(frameSeed),
    play = W.createPlayback(B, speed);
  const kinds = new Set<string>();
  let f = play.advance(0),
    n = 0;
  while (!f.over && n++ < 200000) {
    f = play.advance(0.004 + frames() * 0.12); // 4ms to 124ms, so some frames are clamped
    for (const e of f.events) kinds.add(e.t);
  }
  return { frame: f, kinds };
}

const old = W.setRandom(Math.random);
afterEach(() => {
  W.setRandom(old);
});

describe('playback', () => {
  const pairs: [number, number][] = [];
  for (let i = 0; i < W.YARDSTICK.length; i++)
    for (let j = 0; j < W.YARDSTICK.length; j++) if (i !== j) pairs.push([i, j]);

  it.each(pairs)('a watched battle ends exactly as the fast-forwarded one (yardstick %i vs %i)', (i, j) => {
    const seed = 100 + i * 7 + j;
    const ff = W.runToEnd(yardstickBattle(i, j, seed));
    for (const [speed, frameSeed] of [
      [1, 1],
      [2, 2],
      [4, 3],
    ]) {
      const B = yardstickBattle(i, j, seed);
      const { frame } = watch(B, speed, frameSeed);
      expect(frame.over).toBe(true);
      expect(B.winner).toBe(ff.winner);
      expect(B.time).toBe(ff.time);
      expect(W.battleReport(B)).toEqual(W.battleReport(ff));
    }
  });

  it('banks frame time: three 1/60s frames make one tick', () => {
    const play = W.createPlayback(yardstickBattle(0, 1, 5));
    play.advance(1 / 60);
    play.advance(1 / 60);
    expect(play.battle.time).toBe(0);
    play.advance(1 / 60);
    expect(play.battle.time).toBeCloseTo(W.TICK, 10);
  });

  it('hands out each event once, and clears them from the battle', () => {
    const B = yardstickBattle(0, 1, 9),
      play = W.createPlayback(B, 4);
    let seen = 0;
    for (let k = 0; k < 50; k++) {
      seen += play.advance(0.1).events.length;
      expect(B.ev.length).toBe(0);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('stops at the end and keeps reporting the result', () => {
    const play = W.createPlayback(yardstickBattle(1, 2, 3), 4);
    let f = play.advance(0);
    while (!f.over) f = play.advance(0.1);
    const t = play.battle.time;
    f = play.advance(0.1);
    expect(play.battle.time).toBe(t);
    expect(f.over).toBe(true);
    expect(f.winner).toBe(play.battle.winner);
    expect(f.events).toEqual([]);
  });

  it('runToEnd gives up at the time limit', () => {
    const B = W.runToEnd(yardstickBattle(0, 1, 1), 1);
    expect(B.over).toBe(false);
    expect(B.time).toBeGreaterThanOrEqual(1);
    expect(B.time).toBeLessThan(1 + W.TICK + 1e-9);
  });
});

describe('unit snapshot', () => {
  function battle(you: UnitSpec[], foe: UnitSpec[]): W.Battle {
    return W.createBattle(you, foe, 1, 10, 10);
  }

  it('a building shows no attack and charges toward its next pulse', () => {
    const B = battle([spec('altar', 4), spec('drowblade', 5)], [spec('knight', 4)]);
    const altar = B.units.find((u) => u.d.id === 'altar')!;
    const s0 = W.unitSnapshot(B, altar);
    expect(s0.atk).toBeNull();
    expect(s0.ranged).toBe(false);
    if (altar.d.every) {
      altar.at = altar.d.every / 2;
      expect(W.unitSnapshot(B, altar).cdK).toBeCloseTo(0.5, 6);
    } else expect(s0.cdK).toBe(0);
  });

  it('a fighter charges with its cooldown, smoothed by the banked time, and never past full', () => {
    const B = battle([spec('knight', 4)], [spec('knight', 4)]);
    const k = B.units.find((u) => u.side === 0)!;
    k.t = 0;
    k.haste = 0;
    expect(W.unitSnapshot(B, k).cdK).toBe(0);
    expect(W.unitSnapshot(B, k, k.cd / 4).cdK).toBeCloseTo(0.25, 6);
    k.t = k.cd * 0.99;
    expect(W.unitSnapshot(B, k, 1).cdK).toBe(1);
  });

  it('ranged comes from reach or a ranged tribe, and a tank lunges', () => {
    const B = battle([spec('archer', 3), spec('apprentice', 4), spec('knight', 5)], [spec('knight', 4)]);
    const by = (id: string) =>
      W.unitSnapshot(
        B,
        B.units.find((u) => u.d.id === id)!,
      );
    expect(by('archer').ranged).toBe(true);
    expect(by('apprentice').ranged).toBe(true);
    expect(by('knight').ranged).toBe(false);
  });

  it('shows health no lower than 1 while standing, and fractions within 0 to 1', () => {
    const B = battle([spec('knight', 4)], [spec('knight', 4)]);
    const k = B.units[0];
    k.hp = 0.2;
    k.shield = k.maxhp * 3;
    const s = W.unitSnapshot(B, k);
    expect(s.hp).toBe(1);
    expect(s.shieldK).toBe(1);
    expect(s.shielded).toBe(true);
    expect(s.hpK).toBeGreaterThan(0);
  });
});
