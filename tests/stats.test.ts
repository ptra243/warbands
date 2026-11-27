import { afterEach, describe, expect, it } from 'vitest';
import * as W from '../src/engine/index.ts';

const old = W.setRandom(Math.random);
afterEach(() => {
  W.setRandom(old);
});

/** every yardstick board against the next few, seeded */
function* battles() {
  const n = W.YARDSTICK.length;
  for (let i = 0; i < n; i++)
    for (let d = 1; d <= 3; d++) {
      const a = W.YARDSTICK[i],
        b = W.YARDSTICK[(i + d) % n];
      W.setRandom(W.seeded(i * 7 + d));
      const B = W.createBattle(
        a.units.map((x) => ({ ...x })),
        b.units.map((x) => ({ ...x })),
        13,
        a.open,
        b.open,
        { leader: a.leader, relics: a.relics, foeLeader: b.leader, foeRelics: b.relics },
      );
      yield W.runToEnd(B);
    }
}

describe('battle stats', () => {
  it('split the existing totals by kind without losing any', () => {
    const near = (x: number, y: number) => expect(Math.abs(x - y)).toBeLessThan(1e-6 * Math.max(1, y));
    let seen = 0;
    for (const B of battles()) {
      for (const u of B.units) {
        const t = u.tally,
          { rot = 0, burn = 0, ...direct } = t.dmg;
        near(W.sumKinds(direct), u.dealt);
        near(W.sumKinds(t.hero), u.heroDmg);
        near(W.sumKinds(t.took), u.taken);
        near(t.heal, u.healed);
        expect(rot + burn).toBeGreaterThanOrEqual(0);
        expect(t.overheal).toBeGreaterThanOrEqual(-1e-9);
        expect(t.blocked).toBeLessThanOrEqual(W.sumKinds(t.took) + 1e-6);
        expect(t.guarded + t.soaked).toBeLessThanOrEqual(W.sumKinds(t.took) + 1e-6);
        seen++;
      }
      /* a kill is credited at most once per death */
      for (const s of [0, 1]) {
        const kills = B.units.filter((u) => u.side === s).reduce((a, u) => a + u.tally.kills, 0);
        expect(kills).toBeLessThanOrEqual(B.deaths[1 - s]);
      }
      /* Rot and burn credited to units never exceed what the side dealt in all */
      const S = W.battleStats(B);
      for (const s of [0, 1]) {
        const mine = S.units.filter((u) => (u.side === 'you') === (s === 0));
        const rot = mine.reduce((a, u) => a + (u.t.dmg.rot || 0), 0);
        expect(rot).toBeLessThanOrEqual(B.fx[s].rot + 1e-6);
        expect(S.unowned[s].rot).toBeGreaterThanOrEqual(0);
      }
    }
    expect(seen).toBeGreaterThan(100);
  });
});
