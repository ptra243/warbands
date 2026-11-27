/* Battle primitives shared by the simulation and unit abilities: targeting, damage, death, healing, Rot and summons. */
import type { Battle, BattleUnit, DamageOptions, HitKind } from '../types.ts';
import { SLOTS } from '../constants.ts';
import { U } from '../data/units.ts';
import { mkBU } from './sim.ts';
import { addKind, creditKill } from './stats.ts';

/* ---- battle helpers ---- */
export const foes = (B: Battle, side: number): BattleUnit[] => B.units.filter((x) => x.alive && x.side !== side);
export const friends = (B: Battle, side: number): BattleUnit[] => B.units.filter((x) => x.alive && x.side === side);
/* Who a unit attacks: everything opposite it; failing that, the weaker enemy one slot to either side; a side with two or fewer units left reaches the nearest enemy anywhere; failing that, the hero. */
export function aim(B: Battle, u: BattleUnit): { ts: BattleUnit[]; diag: boolean } {
  if (u.d.snipe) {
    const w = weakest(foes(B, u.side));
    return { ts: w ? [w] : [], diag: false };
  }
  const ts = fronts(B, u);
  if (ts.length) return { ts: u.size === 1 ? [ts[0]] : ts, diag: false };
  const l = u.slot - 1,
    r = u.slot + u.size;
  const c = B.units.filter(
    (x) =>
      x.alive && x.side !== u.side && ((x.slot <= l && x.slot + x.size > l) || (x.slot <= r && x.slot + x.size > r)),
  );
  if (c.length) {
    c.sort((p, q) => p.hp - q.hp);
    return { ts: [c[0]], diag: true };
  }
  if (friends(B, u.side).length <= 2 || B.units.some((x) => x.alive && x.side !== u.side && x.d.boss)) {
    // boss fight, or a side down to its last two units: go for the nearest enemy at any distance
    const dist = (x: BattleUnit) => Math.max(0, x.slot - (u.slot + u.size - 1), u.slot - (x.slot + x.size - 1));
    const n = foes(B, u.side).sort((p, q) => dist(p) - dist(q) || p.hp - q.hp)[0];
    if (n) return { ts: [n], diag: true };
  }
  return { ts: [], diag: false };
}
export const front = (B: Battle, u: BattleUnit): BattleUnit | null => aim(B, u).ts[0] || null;
export const fronts = (B: Battle, u: BattleUnit): BattleUnit[] =>
  B.units.filter((x) => x.alive && x.side !== u.side && x.slot < u.slot + u.size && x.slot + x.size > u.slot);
export const adj = (B: Battle, u: BattleUnit): BattleUnit[] =>
  B.units.filter(
    (x) => x.alive && x !== u && x.side === u.side && (x.slot + x.size === u.slot || x.slot === u.slot + u.size),
  );
export const weakest = (list: BattleUnit[]): BattleUnit | null =>
  list.reduce<BattleUnit | null>((a, b) => (!a || b.hp / b.maxhp < a.hp / a.maxhp ? b : a), null);
export function heal(B: Battle, t: BattleUnit | null | undefined, v: number): void {
  if (!t || !t.alive) return;
  const h0 = t.hp;
  t.hp = Math.min(t.maxhp, t.hp + v);
  if (B.src) {
    B.src.healed += t.hp - h0;
    B.src.tally.heal += t.hp - h0;
    B.src.tally.overheal += v - (t.hp - h0);
  }
  B.ev.push({ t: 'heal', b: t.bid, v });
}
export function hitHero(B: Battle, side: number, v: number, kind: HitKind = 'ability'): void {
  if (B.rel[side].aegis) v *= 0.8;
  const routed = !B.units.some((x) => x.alive && x.side === side);
  if (routed) v *= 3;
  /* rout: an undefended hero takes triple damage */ B.hero[side].hp -= v;
  if (B.src) {
    B.src.heroDmg += v;
    addKind(B.src.tally.hero, kind, v);
    if (routed) B.src.tally.rout += (v * 2) / 3;
  }
  B.ev.push({ t: 'hero', side, v });
}
export function weaken(t: BattleUnit | null | undefined, v: number): void {
  if (t) t.weak = Math.min(0.6, t.weak + v);
}
export function addRot(B: Battle, t: BattleUnit | null | undefined, n: number, dps: number): void {
  if (!t || !t.alive) return;
  const cap = B.syn[1 - t.side].Blight === 2 ? 6 : 5;
  t.rot = Math.min(cap, t.rot + n);
  t.rotDps = Math.max(t.rotDps, dps);
  t.rotBy = B.src && B.src.side !== t.side ? B.src : t.rotBy || null;
  t.rotCredit =
    B.src && B.src.side !== t.side ? B.src : B.blame && B.blame.side !== t.side ? B.blame : t.rotCredit || null;
  t.rotT = 0;
  B.ev.push({ t: 'rot', b: t.bid });
}
/* auras scale 1x / 1.5x / 2x by tier, and identical auras do not stack: only the strongest applies */
export const aur = (m: number): number => (m === 1 ? 1 : m === 2 ? 1.5 : 2);
export function aura(a: BattleUnit, key: string, val: number): number | null {
  a.au = a.au || {};
  const old = a.au[key] || 0;
  if (val <= old) return null;
  a.au[key] = val;
  return old;
}
export const ROTFADE = 12;
export const DROW: number[][] = [
  [0, 0, 0],
  [0.2, 0.1, 0.25],
  [0.45, 0.25, 0.5],
]; // crit, attack speed, flanking damage by Drow level
export const effAtk = (u: BattleUnit): number => u.atk * (1 - Math.min(0.6, u.weak + 0.06 * u.rot));
export function dmg(B: Battle, t: BattleUnit, v: number, o?: DamageOptions): void {
  if (!t.alive || v <= 0) return;
  o = o || {};
  const kind = o.kind || 'ability';
  if (!o.redir) {
    const g = adj(B, t).find((x) => x.d.guard);
    if (g) {
      dmg(B, g, v * 0.3, { redir: 1, kind, as: 'guarded' });
      v *= 0.7;
    }
  }
  const nl = B.syn[t.side].Necromancer;
  if (nl && !o.soak) {
    // summons soak part of the damage dealt to their summoner
    const ss = B.units.filter(
      (x) =>
        x.alive &&
        x !== t &&
        (x.owner === t || (x.guards && x.side === t.side && !t.summoned && t.tribes.includes(x.guards))),
    );
    if (ss.length) {
      const share = v * (nl === 2 ? 0.5 : 0.25);
      v -= share;
      for (const x of ss) dmg(B, x, share / ss.length, { redir: 1, soak: 1, kind, as: 'soaked' });
    }
  }
  const foe = B.src && B.src.side !== t.side ? B.src : null;
  if (foe) {
    foe.dealt += v;
    addKind(foe.tally.dmg, kind, v);
  }
  t.taken += v;
  addKind(t.tally.took, kind, v);
  if (o.as) t.tally[o.as] += v;
  if (t.shield > 0) {
    const a = Math.min(t.shield, v);
    t.shield -= a;
    v -= a;
    t.tally.blocked += a;
    if (foe) foe.tally.shielded += a;
  }
  t.hp -= v;
  B.ev.push({ t: 'hit', b: t.bid, v, crit: o.crit, flank: o.flank });
  if (t.d.thorns && B.src && B.src.alive && B.src.side !== t.side && !o.redir && !o.soak) {
    const a = B.src;
    B.src = t;
    dmg(B, a, t.d.thorns * t.m, { redir: 1, soak: 1, kind: 'thorns' });
    B.src = a;
  }
  if (t.hp <= 0) killed(B, t, B.src);
}
/** die(), crediting `by` with the kill and with what the death sets off. A unit already killed further down the same
 *  blow is not credited twice */
export function killed(B: Battle, t: BattleUnit, by: BattleUnit | null | undefined): void {
  if (!t.alive) return;
  const over = -t.hp,
    pb = B.blame;
  B.blame = by || null;
  die(B, t);
  B.blame = pb;
  creditKill(by, t, over);
}
export function die(B: Battle, u: BattleUnit): void {
  if (!u.alive) return;
  if (u.lives > 0) {
    u.lives--;
    u.hp = u.maxhp * u.revFrac;
    u.weak = 0;
    u.burnT = 0;
    u.rot = 0;
    B.ev.push({ t: 'revive', b: u.bid });
    if (u.d.onRevive) u.d.onRevive(B, u);
    return;
  }
  u.alive = false;
  u.hp = 0;
  u.died = Math.round(B.time * 10) / 10;
  B.deaths[u.side]++;
  B.ev.push({ t: 'die', b: u.bid });
  if (u.d.onDeath) {
    const ps = B.src;
    B.src = u;
    u.d.onDeath(B, u);
    B.src = ps;
  }
  const bl = B.syn[1 - u.side].Blight;
  if (bl && u.rot > 0) for (const a of adj(B, u)) addRot(B, a, bl === 2 ? u.rot : Math.ceil(u.rot / 2), u.rotDps);
  if (!u.summoned && B.lead[u.side] === 'bloodpriest')
    for (const a of B.units) if (a.alive && a.side === u.side) a.atk += a.baseAtk * 0.08;
  const ps0 = B.src;
  for (const a of B.units)
    if (a.alive && a.side !== u.side && a.d.onFoeDeath) {
      B.src = a;
      a.d.onFoeDeath(B, a, u);
    }
  const c = B.syn[u.side].Cultist;
  for (const a of B.units)
    if (a.alive && a.side === u.side) {
      if (a.d.onAllyDeath) {
        B.src = a;
        a.d.onAllyDeath(B, a, u);
      }
      if (c && (a.tribes.includes('Cultist') || a.tribes.includes('Demon'))) a.atk += a.baseAtk * (c === 2 ? 0.2 : 0.1);
    }
  B.src = ps0;
  release(B, u.side, u.slot);
}
export function freeSlot(B: Battle, side: number, size: number, pref: number | null | undefined): number {
  const occ = Array(SLOTS).fill(0);
  for (const x of B.units) if (x.alive && x.side === side) for (let i = 0; i < x.size; i++) occ[x.slot + i] = 1;
  for (let i = 0; i < SLOTS; i++) if (!B.open[side][i]) occ[i] = 1;
  let best = -1,
    bd = 99;
  for (let s = 0; s + size <= SLOTS; s++) {
    let ok = 1;
    for (let i = 0; i < size; i++) if (occ[s + i]) ok = 0;
    if (ok) {
      const d = Math.abs(s - (pref == null ? 4 : pref));
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
  }
  return best;
}
export function summon(
  B: Battle,
  side: number,
  id: string,
  m: number,
  pref: number | null | undefined,
  by?: BattleUnit | null,
  guards?: string,
): BattleUnit | null {
  const d = U[id];
  let k = 1;
  const n = B.syn[side].Necromancer;
  if (n) k += n === 2 ? 0.8 : 0.3;
  if (B.units.some((x) => x.alive && x.side === side && x.d.aura)) k += 0.5;
  if (side === 1) k *= B.mul;
  const s = freeSlot(B, side, d.size, pref);
  if (s < 0) {
    // board full: fold the new summon into the nearest existing copy
    const at = pref == null ? 4 : pref;
    const t = B.units
      .filter((x) => x.alive && x.side === side && x.summoned && x.d.id === id)
      .sort((a, b) => Math.abs(a.slot - at) - Math.abs(b.slot - at))[0];
    if (!t) {
      // nowhere to stand and nothing to join: Bone Minions wait and arrive together when a slot opens
      if (id === 'minion') {
        const w = B.bank[side] || (B.bank[side] = { hp: 0, atk: 0, n: 0, by: by || null, guards: null });
        w.hp += d.hp * m * k;
        w.atk += d.atk * m * k;
        w.n++;
        if (guards) w.guards = guards;
      }
      return null;
    }
    const h = d.hp * m * k,
      a = d.atk * m * k;
    t.maxhp += h;
    t.hp += h;
    t.atk += a;
    t.baseAtk += a;
    t.merged = (t.merged || 0) + 1;
    B.ev.push({ t: 'buff', b: t.bid, a, h });
    return t;
  }
  const u = mkBU(B, { id, tier: 1 }, side, s, m);
  u.maxhp *= k;
  u.atk *= k;
  u.baseAtk = u.atk;
  u.hp = u.maxhp;
  u.summoned = true;
  u.revFrac = 0.4;
  u.owner = by || null;
  if (guards) u.guards = guards;
  if (B.lead[side] === 'gravecaller') u.shield = u.maxhp * 0.75;
  B.units.push(u);
  B.ev.push({ t: 'summon', b: u.bid });
  return u;
}

export function release(B: Battle, side: number, pref: number): void {
  const w = B.bank[side];
  if (!w) return;
  const s = freeSlot(B, side, 1, pref);
  if (s < 0) return;
  B.bank[side] = null;
  const u = mkBU(B, { id: 'minion', tier: 1 }, side, s, 1);
  u.maxhp = w.hp;
  u.hp = w.hp;
  u.atk = w.atk;
  u.baseAtk = w.atk;
  u.summoned = true;
  u.revFrac = 0.4;
  u.owner = w.by && w.by.alive ? w.by : null;
  u.guards = w.guards;
  u.waited = w.n;
  if (w.n > 1) u.merged = w.n - 1;
  if (B.lead[side] === 'gravecaller') u.shield = u.maxhp * 0.75;
  B.units.push(u);
  B.ev.push({ t: 'summon', b: u.bid });
}
