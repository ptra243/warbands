/* The post-game: past winning boards as opponents. */
import type { Enemy, Ghost, RoundLog, Run, UnitSpec, UnitThing } from './types.ts';
import { GHOST_FROM, POSTSTEP, SLOTS, openArr, openCount } from './constants.ts';
import { ITEMS } from './data/items.ts';
import { U } from './data/units.ts';
import { createBattle, stats } from './battle/sim.ts';
import { runToEnd } from './playback.ts';
import { rollShop } from './shop.ts';
import { genEnemy } from './enemies.ts';
import { addXp, has } from './run.ts';
import { LEADERS, RELICS } from './data/leaders.ts';
import { nextUid } from './ids.ts';
import { random, seeded, setRandom } from './rng.ts';
import { YARDSTICK } from './data/yardstick.ts';

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
const SCORE_ROUND = 13,
  SCORE_STEPS = 7,
  SCORE_LO = Math.log(0.25),
  SCORE_HI = Math.log(8);
/* how strong a board is on a fixed scale: for each yardstick board, the strength multiplier on that board at which
 this one stops beating it, found by halving. The score is their geometric mean, so 1.5 means it beats the yardstick
 boards made 50% stronger. Seeded, so the same board always scores the same, and it leaves the run's draws alone. */
export function yardstick(g: Ghost): number {
  const old = setRandom(seeded(1));
  try {
    let sum = 0;
    YARDSTICK.forEach((ref, i) => {
      let lo = SCORE_LO,
        hi = SCORE_HI;
      for (let k = 0; k < SCORE_STEPS; k++) {
        const mid = (lo + hi) / 2;
        setRandom(seeded(1000 + 31 * i + k));
        const B = createBattle(
          g.units.map((x) => Object.assign({}, x)),
          ref.units.map((x) => Object.assign({}, x)),
          SCORE_ROUND,
          g.open,
          ref.open,
          { leader: g.leader, relics: g.relics, foeLeader: ref.leader, foeRelics: ref.relics, foeMul: Math.exp(mid) },
        );
        runToEnd(B);
        if (B.winner === 0) lo = mid;
        else hi = mid;
      }
      sum += (lo + hi) / 2;
    });
    return Math.round(Math.exp(sum / YARDSTICK.length) * 100) / 100;
  } finally {
    setRandom(old);
  }
}
const scoreOf = (g: Ghost): number => (g.score == null ? (g.score = yardstick(g)) : g.score);
/* n boards spread from weakest to strongest: one drawn from each of n equal bands of the scored list */
export function spreadGhosts(pool: Ghost[], n: number): Ghost[] {
  const all = pool.slice().sort((a, b) => scoreOf(a) - scoreOf(b));
  if (all.length <= n) return all;
  const out: Ghost[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i * all.length) / n),
      b = Math.floor(((i + 1) * all.length) / n);
    out.push(all[a + Math.floor(random() * (b - a))]);
  }
  return out;
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
    const g = pool.sort((a, b) => scoreOf(a) - scoreOf(b) || a.power - b.power)[0];
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
  run.post = { n: 0, faced: [], pool: (ghosts || []).filter((g): g is Ghost => Boolean(g)) };
  run.post.pool.forEach(scoreOf);
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
