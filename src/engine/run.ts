/* A run: economy, buying, selling, merging, items, moving units, XP. */
import type {
  BattleOptions,
  Brief,
  ItemThing,
  MoveDest,
  PlayerFaction,
  Run,
  ShopCard,
  Thing,
  UnitSpec,
  UnitThing,
} from './types.ts';
import { type Lock, BENCH, LIVES, LOCK, ORDER, SLOTS, XPNEED, openArr, openCount } from './constants.ts';
import { BASE_ITEMS, ITEMS } from './data/items.ts';
import { U } from './data/units.ts';
import { rollShop } from './shop.ts';
import { genEnemy } from './enemies.ts';
import { nextUid } from './ids.ts';

export const interest = (run: Run): number => Math.min(3, Math.floor(run.gold / 10));
export const income = (run: Run): number =>
  Math.min(4 + run.round, 9) + Math.min(3, Math.floor(run.gold / 10)) + (has(run, 'coin') ? 1 : 0);
export const has = (run: Run, k: string): boolean => (run.relics || []).includes(k);
export function newRun(f: PlayerFaction, leader?: string | null): Run {
  const run: Run = {
    leader: leader || null,
    relics: [],
    offer: null,
    camp: null,
    freeRoll: false,
    faction: f,
    round: 1,
    gold: 6,
    lives: LIVES,
    wins: 0,
    level: 1,
    xp: 0,
    things: [],
    shop: [],
    over: null,
    log: [],
    acts: [],
    // replaced just below; the shop is rolled first so random draws keep their order
    enemy: { faction: 'N', units: [], open: 0 },
  };
  rollShop(run);
  run.enemy = genEnemy(1, openCount(1));
  return run;
}
export const boardUnits = (run: Run): (UnitThing & { slot: number })[] =>
  run.things.filter((t): t is UnitThing & { slot: number } => t.kind === 'unit' && t.slot != null);
export function occOf(run: Run, ignore?: Thing[]): (Thing | Lock | null)[] {
  const o: (Thing | Lock | null)[] = Array(SLOTS).fill(null),
    open = openArr(openCount(run.level));
  for (let i = 0; i < SLOTS; i++) if (!open[i]) o[i] = LOCK;
  for (const t of run.things)
    if (t.slot != null && !(ignore || []).includes(t)) for (let i = 0; i < U[t.id].size; i++) o[t.slot + i] = t;
  return o;
}
export function boardFit(run: Run, size: number, ignore?: Thing[]): number {
  const o = occOf(run, ignore);
  for (const s of ORDER) {
    if (s + size > SLOTS) continue;
    let ok = true;
    for (let i = 0; i < size; i++) if (o[s + i]) ok = false;
    if (ok) return s;
  }
  return -1;
}
export function benchFree(run: Run): number {
  for (let i = 0; i < BENCH; i++) if (!run.things.some((t) => t.bench === i)) return i;
  return -1;
}
export function mergeAll(run: Run): UnitThing[] {
  const made: UnitThing[] = [];
  for (let again = true; again;) {
    again = false;
    const groups: Record<string, UnitThing[]> = {};
    for (const t of run.things)
      if (t.kind === 'unit' && t.tier < 3) (groups[t.id + t.tier] = groups[t.id + t.tier] || []).push(t);
    for (const k in groups) {
      const g = groups[k];
      if (g.length < 3) continue;
      g.sort(
        (a, b) => Number(b.slot != null) - Number(a.slot != null) || Number(b.bench != null) - Number(a.bench != null),
      );
      const keep = g[0],
        gone = g.slice(-2);
      keep.gAtk = Math.max(...g.map((x) => x.gAtk)) * 2;
      keep.gHp = Math.max(...g.map((x) => x.gHp)) * 2;
      keep.tier++;
      for (const x of gone) {
        run.things.splice(run.things.indexOf(x), 1);
        if (x.item) {
          if (!keep.item) keep.item = x.item;
          else {
            const b = benchFree(run);
            if (b >= 0) run.things.push({ uid: nextUid(), kind: 'item', id: x.item, bench: b, slot: null });
            else run.gold += ITEMS[x.item].cost;
          }
        }
      }
      made.push(keep);
      again = true;
      break;
    }
  }
  return made;
}
export function place(run: Run, t: Thing): boolean {
  if (t.slot != null || t.bench != null) return true;
  if (t.kind === 'unit') {
    const s = boardFit(run, U[t.id].size);
    if (s >= 0) {
      t.slot = s;
      return true;
    }
  }
  const b = benchFree(run);
  if (b >= 0) {
    t.bench = b;
    return true;
  }
  return false;
}
export const priceOf = (run: Run, s: ShopCard): number =>
  s.kind === 'item'
    ? Math.max(1, ITEMS[s.id].cost - (run.leader === 'quartermaster' ? 1 : 0))
    : Math.max(1, U[s.id].cost - (run.leader === 'architect' && U[s.id].building ? 1 : 0));
export function buy(
  run: Run,
  i: number,
): { ok: boolean; msg?: string; merged?: UnitThing[]; items?: string[]; thing?: Thing } {
  const s = run.shop[i];
  if (!s) return { ok: false };
  const cost = priceOf(run, s);
  if (run.gold < cost) return { ok: false, msg: 'Not enough gold.' };
  let t: Thing;
  if (s.kind === 'item') {
    const b = benchFree(run);
    if (b < 0) return { ok: false, msg: 'Your bench is full.' };
    t = { uid: nextUid(), kind: 'item', id: s.id, bench: b, slot: null };
    run.things.push(t);
  } else {
    const willMerge = run.things.filter((x) => x.kind === 'unit' && x.id === s.id && x.tier === 1).length >= 2;
    if (!willMerge && boardFit(run, U[s.id].size) < 0 && benchFree(run) < 0)
      return { ok: false, msg: 'No room. Sell or merge something first.' };
    t = { uid: nextUid(), kind: 'unit', id: s.id, tier: 1, item: null, gAtk: 0, gHp: 0, slot: null, bench: null };
    run.things.push(t);
  }
  run.gold -= cost;
  run.shop[i] = null;
  run.acts.push('buy ' + s.id);
  const merged = mergeAll(run);
  merged.forEach((x) => run.acts.push('upgrade ' + x.id + ' t' + x.tier));
  if (run.things.includes(t)) place(run, t);
  const items = mergeItems(run);
  return { ok: true, merged, items, thing: t };
}
export const itemValue = (run: Run | null | undefined, id: string): number => {
  const it = ITEMS[id],
    base = ITEMS[it.base || id];
  return Math.max(1, base.cost - (run && run.leader === 'quartermaster' ? 1 : 0)) * (it.base ? 3 : 1);
};
export const sellValue = (t: Thing, run?: Run | null): number =>
  t.kind === 'item'
    ? itemValue(run, t.id)
    : Math.max(1, U[t.id].cost - (run && run.leader === 'architect' && U[t.id].building ? 1 : 0)) *
      Math.pow(3, t.tier - 1);
export function sell(run: Run, t: Thing): void {
  run.acts.push('sell ' + t.id + (t.kind === 'unit' && t.tier > 1 ? ' t' + t.tier : ''));
  run.gold += sellValue(t, run);
  run.things.splice(run.things.indexOf(t), 1);
  if (t.kind === 'unit' && t.item) {
    const b = benchFree(run);
    if (b >= 0) run.things.push({ uid: nextUid(), kind: 'item', id: t.item, bench: b, slot: null });
    else run.gold += itemValue(run, t.item);
  }
}
/* three of the same basic item, worn or loose, become one upgraded item */
export function mergeItems(run: Run): string[] {
  const made: string[] = [];
  for (let again = true; again;) {
    again = false;
    for (const id of BASE_ITEMS) {
      const loose = run.things.filter((t): t is ItemThing => t.kind === 'item' && t.id === id),
        worn = run.things.filter((t): t is UnitThing => t.kind === 'unit' && t.item === id);
      if (loose.length + worn.length < 3) continue;
      let need = 2;
      if (worn.length) {
        worn[0].item = id + '+';
        for (const x of [...loose, ...worn.slice(1)]) {
          if (!need) break;
          if (x.kind === 'item') run.things.splice(run.things.indexOf(x), 1);
          else x.item = null;
          need--;
        }
      } else {
        loose[0].id = id + '+';
        for (const x of loose.slice(1, 3)) run.things.splice(run.things.indexOf(x), 1);
      }
      made.push(id + '+');
      run.acts.push('upgrade item ' + id);
      again = true;
      break;
    }
  }
  return made;
}
export function equip(run: Run, item: ItemThing, unit: UnitThing): void {
  run.acts.push('equip ' + item.id + ' > ' + unit.id);
  if (unit.item) {
    const old = unit.item;
    unit.item = item.id;
    item.id = old;
  } else {
    unit.item = item.id;
    run.things.splice(run.things.indexOf(item), 1);
  }
}
/* Where a unit dropped on a board slot lands, and which neighbours slide aside to make room. Its left edge goes to the slot.
 Neighbours shift right, or left when there is no room on the right; a unit moved along the board lets them slide into the gap it leaves. */
export function planMove(
  run: Run,
  t: Thing | null | undefined,
  slot: number,
): { slot: number; moves: { x: UnitThing & { slot: number }; to: number }[] } | null {
  if (!t || t.kind !== 'unit') return null;
  const size = U[t.id].size,
    open = openArr(openCount(run.level)),
    lo = open.indexOf(true),
    hi = open.lastIndexOf(true);
  if (hi - lo + 1 < size) return null;
  const s = Math.max(lo, Math.min(slot, hi - size + 1)),
    others = boardUnits(run)
      .filter((x) => x !== t)
      .sort((a, b) => a.slot - b.slot);
  type Shift = { x: UnitThing & { slot: number }; to: number };
  const right = () => {
    const mv: Shift[] = [];
    let c = s + size;
    for (const x of others) {
      if (x.slot + U[x.id].size <= s) continue;
      const to = Math.max(x.slot, c);
      if (to !== x.slot) mv.push({ x, to });
      c = to + U[x.id].size;
    }
    return c <= hi + 1 ? mv : null;
  };
  const left = () => {
    const mv: Shift[] = [];
    let c = s;
    for (const x of others.slice().reverse()) {
      if (x.slot >= s + size) continue;
      const to = Math.min(x.slot, c - U[x.id].size);
      if (to !== x.slot) mv.push({ x, to });
      c = to;
    }
    return c >= lo ? mv : null;
  };
  for (const f of t.slot != null && t.slot < s ? [left, right] : [right, left]) {
    const mv = f();
    if (mv) return { slot: s, moves: mv };
  }
  return null;
}
/* what moveTo would do, without doing it: null, or where everything ends up */
export function tryMove(
  run: Run,
  t: Thing,
  dest: MoveDest,
): {
  slot: number | null;
  bench: number | null | undefined;
  moves: { uid: number; from: number | null; to: number | null }[];
} | null {
  const before = run.things.map((x) => [x, x.slot, x.bench] as [Thing, number | null, number | null | undefined]);
  const ok = moveTo(run, t, dest),
    out = ok
      ? {
          slot: t.slot,
          bench: t.bench,
          moves: before
            .filter((b) => b[0] !== t && (b[0].slot !== b[1] || b[0].bench !== b[2]))
            .map((b) => ({ uid: b[0].uid, from: b[1], to: b[0].slot })),
        }
      : null;
  for (const b of before) {
    (b[0] as UnitThing).slot = b[1];
    (b[0] as UnitThing).bench = b[2];
  }
  return out;
}
/* dest = {slot} or {bench}. Board drops push neighbours aside; failing that, swap when the swap fits. */
export function moveTo(run: Run, t: Thing, dest: MoveDest): boolean {
  const old = { slot: t.slot, bench: t.bench };
  const fits = (x: Thing, s: number, ignore: Thing[]) => {
    const o = occOf(run, ignore);
    if (s < 0 || s + U[x.id].size > SLOTS) return false;
    for (let i = 0; i < U[x.id].size; i++) if (o[s + i]) return false;
    return true;
  };
  if (dest.bench != null) {
    const other = run.things.find((x) => x.bench === dest.bench && x !== t);
    if (other) {
      if (old.slot != null) {
        if (other.kind !== 'unit') return false;
        const s = Math.min(old.slot, SLOTS - U[other.id].size);
        if (!fits(other, s, [t, other])) return false;
        other.bench = null;
        other.slot = s;
      } else other.bench = old.bench as number | null;
    }
    t.slot = null;
    t.bench = dest.bench;
    return true;
  }
  if (t.kind !== 'unit') return false;
  const slot = dest.slot!;
  const P = planMove(run, t, slot);
  if (P) {
    for (const m of P.moves) m.x.slot = m.to;
    t.slot = P.slot;
    t.bench = null;
    return true;
  }
  const size = U[t.id].size,
    o = occOf(run, [t]),
    over: Thing[] = [];
  let s = -1;
  for (let k = 0; k < size && s < 0; k++) {
    const c = slot - k;
    if (c < 0 || c + size > SLOTS) continue;
    let ok = true;
    for (let i = 0; i < size; i++) if (o[c + i] === LOCK) ok = false;
    if (ok) s = c;
  }
  if (s < 0) return false;
  for (let i = 0; i < size; i++) {
    const at = o[s + i];
    if (at && at !== LOCK && !over.includes(at as Thing)) over.push(at as Thing);
  }
  if (!over.length) {
    t.slot = s;
    t.bench = null;
    return true;
  }
  if (over.length > 1) return false;
  // only units stand on the board
  const x = over[0] as UnitThing;
  if (old.slot != null) {
    // swap on board: try both orderings so different sizes can trade places
    const a = Math.min(s, old.slot),
      tFirst = s <= old.slot;
    const cands = tFirst
      ? [
          [s, Math.max(old.slot, s + size)],
          [a, a + size],
        ]
      : [
          [s, old.slot],
          [old.slot + U[x.id].size, old.slot],
        ];
    for (const [ts, xs] of cands) {
      const xs2 = Math.min(xs, SLOTS - U[x.id].size),
        ts2 = Math.min(ts, SLOTS - size);
      const oo = occOf(run, [t, x]);
      let ok = ts2 >= 0 && xs2 >= 0;
      for (let i = 0; i < size && ok; i++) if (oo[ts2 + i]) ok = false;
      for (let i = 0; i < U[x.id].size && ok; i++) if (oo[xs2 + i]) ok = false;
      if (ok && (ts2 + size <= xs2 || xs2 + U[x.id].size <= ts2)) {
        t.slot = ts2;
        x.slot = xs2;
        return true;
      }
    }
    return false;
  }
  if (!fits(t, s, [t, x])) return false;
  x.slot = null;
  x.bench = old.bench;
  t.bench = null;
  t.slot = s;
  return true;
}
export function buyXp(run: Run): boolean {
  if (run.level >= 9 || run.gold < 4) return false;
  run.gold -= 4;
  addXp(run, 4);
  run.acts.push('xp');
  return true;
}
export function addXp(run: Run, n: number): void {
  run.xp += n;
  while (run.level < 9 && run.xp >= XPNEED[run.level - 1]) {
    run.xp -= XPNEED[run.level - 1];
    run.level++;
  }
  if (run.level >= 9) run.xp = 0;
}
export function reroll(run: Run): boolean {
  if (run.freeRoll) run.freeRoll = false;
  else {
    if (run.gold < 2) return false;
    run.gold -= 2;
  }
  rollShop(run);
  run.acts.push('reroll');
  return true;
}
export const brief = (t: Thing | UnitSpec): Brief => {
  const u = t as UnitSpec;
  const o: Brief = { id: t.id };
  if (u.scale) o.scale = Math.round(u.scale * 100) / 100;
  if (u.tier! > 1) o.tier = u.tier;
  if (u.slot != null) o.slot = u.slot;
  if (u.item) o.item = u.item;
  if (u.gAtk) o.gAtk = u.gAtk;
  if (u.gHp) o.gHp = u.gHp;
  return o;
};
export const bopt = (run: Run): BattleOptions => ({
  leader: run.leader,
  relics: run.relics,
  foeLeader: run.enemy.leader || null,
  foeRelics: run.enemy.relics || [],
  foeMul: run.enemy.mul || 1,
});
