/* The post-game: past winning boards as opponents. */
import type { Enemy, Ghost, RoundLog, Run, UnitSpec, UnitThing } from './types.ts';
import { GHOST_FROM, POSTSTEP, SLOTS, openArr, openCount } from './constants.ts';
import { ITEMS } from './data/items.ts';
import { U } from './data/units.ts';
import { createBattle, stats, step } from './battle/sim.ts';
import { rollShop } from './shop.ts';
import { genEnemy } from './enemies.ts';
import { addXp, has } from './run.ts';
import { LEADERS, RELICS } from './data/leaders.ts';
import { nextUid } from './ids.ts';

/* the board a saved winning run finished its tenth win with, checked against today's units and items */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- validates untrusted saved logs
export function ghostFrom(x: any, key?: string): Ghost | null {
  try {
    if (!x || x.game !== 'warband' || x.outcome !== 'won' || (x.bal || 1) < GHOST_FROM) return null;
    const e = x.log.filter((r: RoundLog) => !r.post && r.result === 'win').pop();
    if (!e || !e.board || !e.board.length) return null;
    const n = Math.max(4, Math.min(SLOTS, e.slots || openCount(e.level || 9))),
      open = openArr(n),
      occ = Array(SLOTS).fill(0),
      units: UnitSpec[] = [];
    for (const b of e.board) {
      const d = U[b.id];
      if (!d || d.token || d.f !== x.faction) return null;
      if (b.item && !ITEMS[b.item]) return null;
      if (!(b.slot >= 0) || b.slot + d.size > SLOTS) return null;
      for (let i = 0; i < d.size; i++) {
        if (occ[b.slot + i] || !open[b.slot + i]) return null;
        occ[b.slot + i] = 1;
      }
      units.push({
        id: b.id,
        tier: Math.max(1, Math.min(3, b.tier || 1)),
        slot: b.slot,
        item: b.item || null,
        gAtk: +b.gAtk || 0,
        gHp: +b.gHp || 0,
      });
    }
    const power = units.reduce((s, o) => {
      const t = stats(o);
      return s + Math.sqrt(t.hp * Math.max(1, t.atk));
    }, 0);
    return {
      key: String(key || x.ended),
      faction: x.faction,
      leader: LEADERS[x.leader] ? x.leader : null,
      relics: (x.relics || []).filter((k: string) => RELICS[k]),
      units,
      open: n,
      round: e.round,
      power: Math.round(power),
    };
  } catch {
    return null;
  }
}
/* order saved boards by how they actually fare against each other: a quick round-robin under today's rules */
export function rankGhosts(pool: Ghost[]): Ghost[] {
  if (pool.length < 2) return pool;
  const per = pool.length > 12 ? 1 : 2,
    w = pool.map(() => 0);
  const bout = (a: Ghost, b: Ghost) => {
    const B = createBattle(
      a.units.map((x) => Object.assign({}, x)),
      b.units.map((x) => Object.assign({}, x)),
      13,
      a.open,
      b.open,
      { leader: a.leader, relics: a.relics, foeLeader: b.leader, foeRelics: b.relics },
    );
    let n = 0;
    while (!B.over && n++ < 3000) {
      step(B, 0.05);
      B.ev.length = 0;
    }
    return B.winner;
  };
  for (let i = 0; i < pool.length; i++)
    for (let j = 0; j < pool.length; j++)
      if (i !== j)
        for (let k = 0; k < per; k++) {
          const r = bout(pool[i], pool[j]);
          if (r === 0) w[i]++;
          else if (r === 1) w[j]++;
        }
  pool.forEach((g, i) => {
    g.rank = w[i] / ((pool.length - 1) * per * 2);
  });
  return pool;
}
export function nextFoe(run: Run): Enemy {
  const P = run.post!,
    mul = Math.round((1 + POSTSTEP * P.n) * 100) / 100;
  let pool = P.pool.filter((g) => !P.faced.includes(g.key));
  if (!pool.length && P.pool.length) {
    P.faced = [];
    pool = P.pool.slice();
  }
  if (pool.length) {
    const g = pool.sort(
      (a, b) => (a.rank == null ? 0 : a.rank) - (b.rank == null ? 0 : b.rank) || a.power - b.power,
    )[0];
    P.faced.push(g.key);
    return {
      faction: g.faction,
      units: g.units.map((o) => Object.assign({ uid: nextUid(), kind: 'unit' }, o) as UnitThing),
      open: g.open,
      leader: g.leader,
      relics: g.relics,
      mul,
      ghost: g.key,
      title: 'Your past warband' + (g.leader ? ' under ' + LEADERS[g.leader].name.replace('The ', 'the ') : ''),
    };
  }
  const e = genEnemy(run.round, SLOTS, true);
  e.mul = mul;
  return e;
}
/* after the tenth win: keep the board and fight past winning boards, each stronger than the last, until the lives run out */
export function continueRun(run: Run, ghosts: (Ghost | null)[] | null | undefined): boolean {
  if (run.over !== 'won' || run.post) return false;
  run.post = { n: 0, faced: [], pool: rankGhosts((ghosts || []).filter((g): g is Ghost => Boolean(g))) };
  run.over = null;
  run.saved = false;
  run.offer = null;
  run.lives = Math.max(run.lives, 3);
  const last = run.log[run.log.length - 1];
  run.gold += last ? last.income! : 0;
  run.round++;
  addXp(run, 2 + (has(run, 'scholar') ? 2 : 0));
  run.freeRoll = has(run, 'seal');
  rollShop(run);
  run.enemy = nextFoe(run);
  return true;
}
