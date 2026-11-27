/* Unit stats, synergies and the battle simulation itself. */
import type { Battle, BattleOptions, BattleUnit, HitKind, SynergyLevels, UnitSpec } from '../types.ts';
import { SUDDEN, openArr } from '../constants.ts';
import { TRIBES } from '../data/tribes.ts';
import { ITEMS } from '../data/items.ts';
import {
  DROW,
  ROTFADE,
  addRot,
  adj,
  aim,
  aura,
  die,
  dmg,
  effAtk,
  foes,
  friends,
  front,
  heal,
  hitHero,
  summon,
  weakest,
} from './effects.ts';
import { U } from '../data/units.ts';
import { random } from '../rng.ts';
import { addKind, creditKill, newTally } from './stats.ts';

/* stats of an owned unit outside battle */
export function stats(o: UnitSpec): { hp: number; atk: number; m: number; tribes: string[]; cd: number } {
  const d = U[o.id],
    m = Math.pow(2, (o.tier || 1) - 1),
    it = o.item ? ITEMS[o.item] : null;
  const sc = o.scale || 1;
  let hp = d.hp * m * sc + (d.flat || 0) + (o.gHp || 0),
    atk = d.atk * m * sc + (o.gAtk || 0);
  if (it) {
    hp *= 1 + (it.hp || 0);
    atk *= 1 + (it.atk || 0);
  }
  const tribes = d.tribes.slice();
  if (it && it.cls && !tribes.includes(it.cls)) tribes.push(it.cls);
  return { hp, atk, m, tribes, cd: d.cd };
}
export let BID = 1;
export function mkBU(_B: Battle, o: UnitSpec, side: number, slot: number, mOver?: number): BattleUnit {
  const d = U[o.id],
    s = stats(o),
    it = o.item ? ITEMS[o.item] : null,
    m = mOver || s.m;
  const hp = mOver ? d.hp * m : s.hp,
    atk = mOver ? d.atk * m : s.atk;
  return {
    bid: BID++,
    o,
    d,
    m,
    side,
    slot,
    size: d.size,
    maxhp: hp,
    hp,
    atk,
    baseAtk: atk,
    cd: d.cd,
    t: slot * 0.03,
    at: 0,
    rot: 0,
    rotDps: 0,
    st: 0,
    n: 0,
    shield: 0,
    weak: 0,
    burn: 0,
    burnT: 0,
    regen: 0,
    smite: 0,
    haste: (it && it.haste) || 0,
    crit: d.crit || 0,
    splash: Math.max(d.splash || 0, (it && it.splash) || 0),
    healHit: (it && it.healHit) || 0,
    burnHit: d.burn ? d.burn * m * (o.scale || 1) : 0,
    lives: d.lives || 0,
    revFrac: 0.4,
    alive: true,
    tribes: s.tribes,
    item: o.item || null,
    summoned: false,
    owner: null,
    dealt: 0,
    heroDmg: 0,
    taken: 0,
    healed: 0,
    died: null,
    tally: newTally(),
  };
}

/* synergy levels from a list of owned units (unique unit types count once) */
export function synergy(list: UnitSpec[]): { cnt: Record<string, number>; lv: SynergyLevels } {
  const seen: Record<string, number> = {},
    cnt: Record<string, number> = {};
  for (const o of list)
    for (const t of stats(o).tribes) {
      const k = t + ':' + o.id;
      if (!seen[k]) {
        seen[k] = 1;
        cnt[t] = (cnt[t] || 0) + (U[o.id].counts && U[o.id].tribes[0] === t ? U[o.id].counts! : 1);
      }
    }
  const lv: SynergyLevels = {};
  for (const t in cnt) {
    const th = TRIBES[t] ? TRIBES[t].th : [];
    lv[t] = th.filter((x) => cnt[t] >= x).length;
  }
  if (cnt.Tank && cnt.DPS && cnt.Mage && cnt.Cleric) lv.Party = 1;
  cnt.Party = ['Tank', 'DPS', 'Mage', 'Cleric'].filter((t) => cnt[t]).length;
  return { cnt, lv };
}
export const heroHp = (round: number): number => Math.round(150 * Math.pow(1.2, round - 1));

export function createBattle(
  mine: UnitSpec[],
  theirs: UnitSpec[],
  round: number,
  n0: number,
  n1: number,
  opt?: BattleOptions,
): Battle {
  opt = opt || {};
  const rl0: Record<string, number> = {},
    rl1: Record<string, number> = {};
  (opt.relics || []).forEach((k) => {
    rl0[k] = 1;
  });
  (opt.foeRelics || []).forEach((k) => {
    rl1[k] = 1;
  });
  const B: Battle = {
    lead: [opt.leader || null, opt.foeLeader || null],
    rel: [rl0, rl1],
    mul: opt.foeMul || 1,
    rotBoost: [1, 1],
    bank: [null, null],
    fx: [
      { rot: 0, burn: 0 },
      { rot: 0, burn: 0 },
    ],
    open: [openArr(n0), openArr(n1)],
    time: 0,
    units: [],
    ev: [],
    over: false,
    winner: null,
    deaths: [0, 0],
    round,
    hero: [
      { hp: heroHp(round), max: heroHp(round) },
      { hp: heroHp(round), max: heroHp(round) },
    ],
    syn: [synergy(mine).lv, synergy(theirs).lv],
  };
  mine.forEach((o) => B.units.push(mkBU(B, o, 0, o.slot!)));
  theirs.forEach((o) => B.units.push(mkBU(B, o, 1, o.slot!)));
  for (const side of [0, 1]) {
    const s = B.syn[side],
      us = friends(B, side),
      rl = B.rel[side],
      ld = B.lead[side];
    for (const u of us) {
      const has = (t: string) => u.tribes.includes(t);
      if (side === 1 && B.mul !== 1) {
        u.maxhp *= B.mul;
        u.atk *= B.mul;
      }
      if (s.Tank && has('Tank')) u.maxhp *= [1, 1.2, 1.4, 1.7][s.Tank];
      if (s.DPS && has('DPS')) {
        u.atk *= [1, 1.15, 1.3, 1.55][s.DPS];
        u.crit += [0, 0.1, 0.2, 0.35][s.DPS];
      }
      if (s.Mage && has('Mage')) {
        u.haste += [0, 0.15, 0.3, 0.5][s.Mage];
        u.burnHit = Math.max(u.burnHit, [0, 2, 2, 4][s.Mage] * u.m);
      }
      if (s.Cleric) {
        u.regen += [0, 0.01, 0.015, 0.025][s.Cleric];
        if (has('Cleric')) u.smite = [0, 2, 2, 4][s.Cleric];
      }
      if (s.Party) {
        const pm = ld === 'marshal' ? 1.3 : 1.15;
        u.maxhp *= pm;
        u.atk *= pm;
      }
      {
        if (ld === 'architect' && u.d.building) u.maxhp *= 2;
        if (rl.wardrum) u.atk *= 1.1;
        if (rl.belt && u.size > 1) {
          u.maxhp *= 1.25;
          u.atk *= 1.25;
        }
        if (rl.font) u.regen += 0.01;
        if (rl.armoury && !u.item) u.maxhp *= 1.15;
      }
      if (s.Grove) u.regen += s.Grove === 2 ? 0.025 : 0.01;
      if (s.Sun) u.atk *= s.Sun === 2 ? 1.35 : 1.15;
      if (s.Drow && has('Drow')) {
        u.crit += DROW[s.Drow][0];
        u.haste += DROW[s.Drow][1];
        u.flank = DROW[s.Drow][2];
      }
      if (s.Reborn && has('Reborn')) u.lives++;
      u.revFrac = s.Reborn === 2 ? 1 : 0.4;
    }
  }
  for (const side of [0, 1]) {
    const s = B.syn[side],
      us = friends(B, side),
      rl = B.rel[side],
      ld = B.lead[side];
    for (const u of us)
      if (u.d.onStart) {
        B.src = u;
        u.d.onStart(B, u);
      }
    B.src = null;
    if (s.Drow)
      for (const al of us)
        if (al.d.lend)
          for (const a of adj(B, al)) {
            // a Dark Altar lends its neighbours part of the Drow bonus; two altars do not stack
            if (a.d.building || a.tribes.includes('Drow') || aura(a, 'altar', al.d.lend) == null) continue;
            const k = al.d.lend;
            a.crit += DROW[s.Drow][0] * k;
            a.haste += DROW[s.Drow][1] * k;
            a.flank = Math.max(a.flank || 0, DROW[s.Drow][2] * k);
          }
    if (us.length) {
      const byslot = us.slice().sort((p, q) => p.slot - q.slot),
        L = byslot[0],
        R = byslot[byslot.length - 1],
        fighters = us.filter((u) => !u.d.building && u.atk > 0);
      if (ld === 'warden') {
        L.maxhp *= 1.5;
        if (R !== L) R.maxhp *= 1.5;
      }
      if (ld === 'architect')
        for (const u of us) if (!u.d.building && adj(B, u).some((a) => a.d.building)) u.atk *= 1.2;
      if (ld === 'bladesinger' && fighters.length) fighters.reduce((p, q) => (q.atk > p.atk ? q : p)).haste += 0.3;
      if (ld === 'plaguefather') {
        B.rotBoost[side] = 1.25;
        foes(B, side).forEach((t) => addRot(B, t, 1, 0.5 + round * 0.1));
      }
      if (rl.whetstone) L.haste += 0.5;
      if (rl.bulwark) R.maxhp *= 1.5;
      if (rl.banner) for (const u of us) u.t = u.cd * 0.5;
      if (rl.bell) summon(B, side, 'minion', round >= 9 ? 4 : round >= 5 ? 2 : 1, null);
    }
    for (const u of us) {
      u.baseAtk = u.atk;
      u.hp = u.maxhp;
      if (s.Moon) u.shield += u.maxhp * (s.Moon === 2 ? 0.25 : 0.1);
    }
    if (s.Necromancer) {
      const m = Math.max(1, ...us.filter((u) => u.tribes.includes('Necromancer')).map((u) => u.m));
      for (let i = 0; i < s.Necromancer - 1; i++) {
        summon(B, side, 'minion', m, null, null, 'Necromancer');
      }
    }
  }
  B.ev = [];
  return B;
}

export function attack(B: Battle, u: BattleUnit): void {
  u.n++;
  const A = aim(B, u),
    f = A.ts[0] || null;
  let v = effAtk(u),
    crit = false;
  if (u.d.opener && u.n === 1) v *= u.d.opener;
  else if (u.crit && random() < u.crit) {
    v *= 2;
    crit = true;
  }
  if (u.d.mod) v = u.d.mod(B, u, v);
  B.ev.push({ t: 'atk', b: u.bid, to: (u.d.all ? foes(B, u.side) : A.ts).map((x) => x.bid), hero: !f, diag: A.diag });
  const hit = (t: BattleUnit, val: number, c: boolean, kind: HitKind) => {
    if (u.burnHit) {
      if (u.burnHit >= t.burn) t.burnBy = u;
      t.burn = Math.max(t.burn, u.burnHit);
      t.burnT = 3;
    }
    if (u.d.onHit) u.d.onHit(B, u, t);
    if (u.d.vs) val = u.d.vs(B, u, t, val);
    let fl = false;
    if (u.flank && !(t.atk > 0 && !t.d.building && (t.d.all || aim(B, t).ts.includes(u)))) {
      val *= 1 + u.flank;
      fl = true;
      u.flanks = (u.flanks || 0) + 1;
      u.tally.flank += val - val / (1 + u.flank);
    }
    dmg(B, t, val, { crit: c, flank: fl, kind });
  };
  const k: HitKind = crit ? 'crit' : 'attack';
  if (u.d.all) {
    const fs = foes(B, u.side);
    fs.forEach((t) => hit(t, v, crit, k));
    if (!f) hitHero(B, 1 - u.side, v, k);
  } else if (f) {
    // a wide unit strikes every enemy opposite any of its slots, splitting its damage evenly
    const ts = A.ts,
      each = u.d.noSplit ? v : v / ts.length,
      near: BattleUnit[] = [];
    if (u.splash) for (const t of ts) for (const x of adj(B, t)) if (!ts.includes(x) && !near.includes(x)) near.push(x);
    ts.forEach((t) => hit(t, each, crit, k));
    near.forEach((t) => hit(t, each * u.splash, false, 'splash'));
    if (u.d.reach && !A.diag) {
      const l = u.slot - 1,
        r2 = u.slot + u.size;
      B.units
        .filter(
          (x) =>
            x.alive &&
            x.side !== u.side &&
            !ts.includes(x) &&
            ((x.slot <= l && x.slot + x.size > l) || (x.slot <= r2 && x.slot + x.size > r2)),
        )
        .forEach((t) => hit(t, v * u.d.reach!, false, 'reach'));
    }
  } else hitHero(B, 1 - u.side, v, k);
  if (u.d.boss && f) hitHero(B, 1 - u.side, v * 0.25, k);
  if (u.d.after) u.d.after(B, u);
  if (u.healHit) heal(B, weakest(friends(B, u.side)), v * u.healHit);
}

export function step(B: Battle, dt: number): void {
  if (B.over) return;
  B.time += dt;
  for (const u of B.units.slice()) {
    if (!u.alive) continue;
    B.src = u;
    if (u.regen && u.hp < u.maxhp) {
      const h0 = u.hp;
      u.hp = Math.min(u.maxhp, u.hp + u.maxhp * u.regen * dt);
      u.tally.regen += u.hp - h0;
    }
    if (u.burnT > 0) {
      u.burnT -= dt;
      u.hp -= u.burn * dt;
      u.taken += u.burn * dt;
      B.fx[1 - u.side].burn += u.burn * dt;
      addKind(u.tally.took, 'burn', u.burn * dt);
      if (u.burnBy && u.burnBy.side !== u.side) addKind(u.burnBy.tally.dmg, 'burn', u.burn * dt);
      if (u.hp <= 0) {
        const over = -u.hp;
        die(B, u);
        creditKill(u.burnBy, u, over);
        if (!u.alive) continue;
      }
    }
    if (u.rot > 0) {
      const r0 = u.rot * u.rotDps * dt * B.rotBoost[1 - u.side];
      u.hp -= r0;
      u.taken += r0;
      B.fx[1 - u.side].rot += r0;
      addKind(u.tally.took, 'rot', r0);
      if (u.rotBy && u.rotBy.side !== u.side) addKind(u.rotBy.tally.dmg, 'rot', r0);
      /* a stack fades every ROTFADE seconds, twice as fast once whoever applied it is dead (leader Rot: once no enemy unit is left) */
      u.rotT =
        (u.rotT || 0) + dt * ((u.rotBy ? !u.rotBy.alive : !B.units.some((x) => x.alive && x.side !== u.side)) ? 2 : 1);
      if (u.rotT >= ROTFADE) {
        u.rotT = 0;
        u.rot--;
      }
      if (u.hp <= 0) {
        const over = -u.hp;
        die(B, u);
        creditKill(u.rotBy, u, over);
        if (!u.alive) continue;
      }
    }
    if (u.d.every) {
      u.at += dt;
      if (u.at >= u.d.every) {
        u.at = 0;
        u.d.tick?.(B, u);
        if (!u.alive) continue;
      }
    }
    if (u.smite) {
      u.st += dt;
      if (u.st >= 4) {
        u.st = 0;
        const t = front(B, u),
          v = effAtk(u) * u.smite;
        B.ev.push({ t: 'smite', b: u.bid });
        if (t) dmg(B, t, v, { kind: 'smite' });
        else hitHero(B, 1 - u.side, v, 'smite');
      }
    }
    if (u.atk > 0 && !u.d.building) {
      u.t += dt * (1 + u.haste);
      if (u.t >= u.cd) {
        u.t -= u.cd;
        attack(B, u);
      }
    }
  }
  B.src = null;
  if (B.sdAt == null && !B.units.some((x) => x.alive)) B.sdAt = B.time; // nobody left on either side: sudden death starts now
  const sd0 = B.sdAt != null ? Math.min(B.sdAt, SUDDEN) : SUDDEN;
  if (B.time > sd0) {
    B.sudden = true;
    for (const h of B.hero) h.hp -= h.max * (0.03 + 0.015 * (B.time - sd0)) * dt;
  }
  const a = B.hero[0].hp <= 0,
    b = B.hero[1].hp <= 0;
  if (a || b) {
    B.over = true;
    B.winner = a && b ? (B.hero[0].hp > B.hero[1].hp ? 0 : B.hero[1].hp > B.hero[0].hp ? 1 : -1) : a ? 1 : 0;
  }
}
