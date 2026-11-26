/* A simple bot that plays the shop: buys greedily, positions crudely, and (in smart mode) places items with some care.
   It plays the late game poorly, so use it to compare before and after a change, not as a measure of absolute strength. */
import * as W from '../../src/engine/index.ts';

const own = (run: W.Run, id: string) => run.things.filter((t) => (t.kind === 'item' ? t.id : t.item) === id).length;

/** how much an item is worth on a unit: stat gain plus any class level it unlocks */
function gain(bu: W.UnitThing[], id: string, u: W.UnitThing): number {
  const I = W.ITEMS[id],
    s = W.stats(u),
    dps = (s.atk / s.cd) * 8;
  let g =
    (I.atk || 0) * dps +
    (I.haste || 0) * dps +
    ((I.hp || 0) * s.hp) / 6 +
    (I.splash || 0) * dps * 1.2 +
    (I.healHit || 0) * dps * 0.6;
  if (I.cls && !s.tribes.includes(I.cls)) {
    const a = W.synergy(bu).lv;
    u.item = id;
    const b = W.synergy(bu).lv;
    u.item = null;
    let up = 0;
    for (const k in b) up += (b[k] || 0) - (a[k] || 0);
    g += up * 60 + 3;
  }
  return g;
}

/** spend the round's gold and arrange the board. smart = false plays items badly, like the first bot did */
export function bot(run: W.Run, smart = true): void {
  let guard = 0;
  while (guard++ < 40) {
    let best = -1,
      bs = -1;
    run.shop.forEach((s, i) => {
      if (!s) return;
      const cost = s.kind === 'unit' ? W.U[s.id].cost : W.ITEMS[s.id].cost;
      if (cost > run.gold) return;
      if (W.priceOf(run, s) > run.gold) return;
      let sc = cost;
      if (s.kind === 'unit') {
        const n = run.things.filter((t) => t.id === s.id && t.kind === 'unit' && t.tier === 1).length;
        sc += n * 3;
      } else if (smart) {
        const n = own(run, s.id);
        sc += (n % 3) * 3;
        if (!W.boardUnits(run).some((u) => !u.item) && !n) sc = -1;
      }
      if (sc > bs && sc >= 0) {
        bs = sc;
        best = i;
      }
    });
    if (best >= 0) {
      const r = W.buy(run, best);
      if (!r.ok) {
        // make room: sell the cheapest unit
        const c = run.things
          .filter((t): t is W.UnitThing => t.kind === 'unit')
          .sort((a, b) => W.sellValue(a) - W.sellValue(b))[0];
        const s = run.shop[best]!;
        if (c && s.kind === 'unit' && W.U[s.id].cost > W.U[c.id].cost && c.tier === 1) {
          W.sell(run, c);
          continue;
        }
        run.shop[best] = null;
      }
      continue;
    }
    // equip items
    if (smart) {
      // the best unit for each item; spare items wait on the bench for a third copy
      const bu = W.boardUnits(run),
        loose = run.things.filter((t): t is W.ItemThing => t.kind === 'item');
      let bestG = 0,
        bi: W.ItemThing | null = null,
        bu1: W.UnitThing | null = null;
      for (const it of loose)
        for (const u of bu) {
          if (u.item) continue;
          const g = gain(bu, it.id, u);
          if (g > bestG) {
            bestG = g;
            bi = it;
            bu1 = u;
          }
        }
      if (bi && bu1) {
        W.equip(run, bi, bu1);
        W.mergeItems(run);
        continue;
      }
      if (loose.length > 2 || (loose.length && W.benchFree(run) < 0)) {
        W.sell(run, loose.sort((x, y) => own(run, x.id) - own(run, y.id))[0]);
        continue;
      }
    } else {
      const it = run.things.find((t): t is W.ItemThing => t.kind === 'item');
      if (it) {
        const u = W.boardUnits(run).find((x) => !x.item);
        if (u) W.equip(run, it, u);
        else W.sell(run, it);
        continue;
      }
    }
    // bench -> board; Undead keep a slot free for summons
    const used = W.boardUnits(run).reduce((a, x) => a + W.U[x.id].size, 0);
    const bn = run.things.find(
      (t) =>
        t.kind === 'unit' &&
        t.bench != null &&
        W.boardFit(run, W.U[t.id].size) >= 0 &&
        (run.faction !== 'U' || used + W.U[t.id].size <= W.openCount(run.level) - 1),
    );
    if (bn) {
      W.moveTo(run, bn, { slot: W.boardFit(run, W.U[bn.id].size) });
      continue;
    }
    if (
      run.level < 7 &&
      run.gold >= 4 &&
      (run.gold >= 10 || run.things.some((t) => t.kind === 'unit' && t.bench != null))
    ) {
      W.buyXp(run);
      continue;
    }
    if (run.gold >= 12) {
      W.reroll(run);
      continue;
    }
    break;
  }
}

/** run a battle to the end without playback */
export const fight = (B: W.Battle): W.Battle => W.runToEnd(B);

/** the three leaders of a faction, in order */
export const leadersOf = (f: W.PlayerFaction): string[] => Object.keys(W.LEADERS).filter((k) => W.LEADERS[k].f === f);
