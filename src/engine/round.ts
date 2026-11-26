/* Starting and finishing a round's battle, and the run log. */
import type { Battle, BattleReport, RoundLog, Run, RunLog, UnitReport, UnitThing } from './types.ts';
import { BALANCE, LOCK, MAXWINS, openCount } from './constants.ts';
import { U } from './data/units.ts';
import { createBattle, synergy } from './battle/sim.ts';
import { rollShop } from './shop.ts';
import { genEnemy } from './enemies.ts';
import { addXp, boardUnits, bopt, brief, has, income, occOf } from './run.ts';
import { nextFoe } from './postgame.ts';
import { genOffer } from './encounters.ts';
import { rnd } from './rng.ts';

export function startBattle(run: Run): Battle {
  const bu = boardUnits(run).filter(
      (t) =>
        !occOf(run, [t])
          .slice(t.slot, t.slot + U[t.id].size)
          .includes(LOCK),
    ),
    lv = synergy(bu).lv,
    on: Record<string, number> = {};
  for (const k in lv) if (lv[k]) on[k] = lv[k];
  const enemy: NonNullable<RoundLog['enemy']> = {
    faction: run.enemy.faction,
    slots: run.enemy.open,
    units: run.enemy.units.map(brief).sort((a, b) => a.slot! - b.slot!),
  };
  const pending: RoundLog = {
    round: run.round,
    gold: run.gold,
    level: run.level,
    slots: openCount(run.level),
    lives: run.lives,
    wins: run.wins,
    acts: run.acts,
    bonuses: on,
    board: bu.map(brief).sort((a, b) => a.slot! - b.slot!),
    bench: run.things.filter((t) => t.slot == null).map(brief),
    enemy,
  };
  run.pending = pending;
  run.acts = [];
  if (run.lastEnc) {
    pending.encounter = run.lastEnc;
    run.lastEnc = null;
  }
  if (run.enemy.title) enemy.title = run.enemy.title;
  if (run.post) {
    pending.post = run.post.n + 1;
    if (run.enemy.ghost)
      Object.assign(enemy, {
        ghost: run.enemy.ghost,
        leader: run.enemy.leader,
        relics: run.enemy.relics,
      });
    enemy.mul = run.enemy.mul;
  }
  return createBattle(bu, run.enemy.units, run.round, openCount(run.level), run.enemy.open, bopt(run));
}
export function battleReport(B: Battle): BattleReport {
  const R = (v: number) => Math.round(v);
  return {
    time: Math.round(B.time * 10) / 10,
    sudden: !!B.sudden,
    heroHp: [R(Math.max(0, B.hero[0].hp)), R(Math.max(0, B.hero[1].hp))],
    heroMax: B.hero[0].max,
    effects: {
      you: { rot: R(B.fx[0].rot), burn: R(B.fx[0].burn) },
      enemy: { rot: R(B.fx[1].rot), burn: R(B.fx[1].burn) },
    },
    units: B.units.map((u) => {
      const o: UnitReport = {
        side: u.side ? 'enemy' : 'you',
        id: u.d.id,
        slot: u.slot,
        dealt: R(u.dealt),
        hero: R(u.heroDmg),
        taken: R(u.taken),
      };
      if (u.m > 1) o.tier = u.m === 4 ? 3 : 2;
      if (u.healed >= 1) o.healed = R(u.healed);
      if (u.summoned) o.summoned = 1;
      if (u.merged) o.merged = u.merged;
      if (u.waited) o.waited = u.waited;
      if (u.flanks) o.flanks = u.flanks;
      if (u.died != null) o.died = u.died;
      else o.hpLeft = R(u.hp);
      return o;
    }),
  };
}
export function exportLog(run: Run): RunLog {
  return {
    v: 1,
    game: 'warband',
    bal: BALANCE,
    post: run.post ? run.post.n : undefined,
    ended: new Date().toISOString(),
    faction: run.faction,
    leader: run.leader,
    relics: run.relics,
    outcome: run.over || 'abandoned',
    wins: run.wins,
    lives: run.lives,
    rounds: run.log.length,
    log: run.log,
  };
}
export function finishBattle(run: Run, B: Battle): { res: 'win' | 'loss' | 'draw'; income: number; grown: number } {
  const res: 'win' | 'loss' | 'draw' = B.winner === 0 ? 'win' : B.winner === 1 ? 'loss' : 'draw';
  if (res === 'win') {
    run.wins++;
    if (run.post) run.post.n++;
  } else if (res === 'loss') run.lives--;
  const grown: UnitThing[] = [];
  const bu = boardUnits(run),
    tree = bu.some((t) => U[t.id].doubleGrow) ? 0.5 : 0;
  for (const t of bu) {
    const d = U[t.id],
      m = Math.pow(2, t.tier - 1);
    let a = 0,
      h = 0;
    if (d.grow) {
      a += d.grow[0] * m;
      h += d.grow[1] * m;
    }
    for (const n of bu)
      if (
        n !== t &&
        U[n.id].mentor &&
        (n.slot + U[n.id].size === t.slot || t.slot + d.size === n.slot) &&
        !d.building
      ) {
        const nm = Math.pow(2, n.tier - 1);
        a += U[n.id].mentor![0] * nm;
        h += U[n.id].mentor![1] * nm;
      }
    if (has(run, 'seedling') && !d.building) {
      a += 1;
      h += 3;
    }
    const gk = 1 + tree + (run.leader === 'grovekeeper' ? 0.5 : 0);
    if (a || h) {
      t.gAtk += Math.round(a * gk);
      t.gHp += Math.round(h * gk);
      grown.push(t);
    }
  }
  for (const t of bu)
    if (U[t.id].bless) {
      const c = bu.filter((x) => x !== t && !U[x.id].building);
      if (c.length) {
        const x = rnd(c),
          m = Math.pow(2, t.tier - 1);
        x.gAtk += U[t.id].bless![0] * m;
        x.gHp += U[t.id].bless![1] * m;
        if (!grown.includes(x)) grown.push(x);
      }
    }
  const inc = income(run) + (res === 'win' ? 1 : 0);
  run.log.push(
    Object.assign(run.pending || { round: run.round }, { result: res, income: inc, battle: battleReport(B) }),
  );
  run.pending = null;
  if (run.lives <= 0) {
    run.over = run.post ? 'won' : 'lost';
    if (run.post) run.post.done = true;
  } else if (run.wins >= MAXWINS && !run.post) run.over = 'won';
  const beatBoss = res === 'win' && run.enemy.boss;
  if (!run.over) {
    run.gold += inc;
    run.round++;
    addXp(run, 2 + (has(run, 'scholar') ? 2 : 0));
    run.freeRoll = has(run, 'seal');
    rollShop(run);
    run.enemy = run.post ? nextFoe(run) : genEnemy(run.round, openCount(run.level));
    run.offer = run.post ? null : genOffer(run, beatBoss);
  }
  return { res, income: inc, grown: grown.length };
}
