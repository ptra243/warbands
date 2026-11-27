/* Encounters between rounds: camps, events, shrines and relic picks; restoring a saved run. */
import type { Battle, Camp, CampCard, EventDef, Offer, OfferCard, Run, UnitThing } from './types.ts';
import { ORDER, SLOTS, openArr, openCount } from './constants.ts';
import { BASE_ITEMS, ITEMS } from './data/items.ts';
import { POOL, U } from './data/units.ts';
import { createBattle } from './battle/sim.ts';
import { rollUnit } from './shop.ts';
import { budget, monster } from './enemies.ts';
import { addXp, benchFree, boardUnits, has, mergeAll, mergeItems, place } from './run.ts';
import { RELICS } from './data/leaders.ts';
import { nextUid, reserveUid } from './ids.ts';
import { random, rnd } from './rng.ts';

export const freeRelics = (run: Run): string[] =>
  Object.keys(RELICS).filter((k) => !run.relics.includes(k) && (!RELICS[k].f || RELICS[k].f === run.faction));
export function genCamp(round: number, maxSlots: number, hard: boolean): Camp {
  const n = Math.max(3, Math.min(maxSlots || SLOTS, 3 + Math.floor(round / 2))),
    open = openArr(maxSlots),
    kind = rnd(['wolves', 'bandits', 'ogre']),
    units: UnitThing[] = [],
    occ = Array(SLOTS).fill(0);
  const sc = Math.pow(((hard ? 0.95 : 0.6) * budget(round)) / n, 0.7);
  const put = (id: string) => {
    const sz = U[id].size,
      s = ORDER.find((s0) => {
        if (s0 + sz > SLOTS) return false;
        for (let i = 0; i < sz; i++) if (occ[s0 + i] || !open[s0 + i]) return false;
        return true;
      });
    if (s === undefined) return false;
    for (let i = 0; i < sz; i++) occ[s + i] = 1;
    units.push(monster(id, s, sc));
    return true;
  };
  if (kind === 'ogre') put('ogre');
  while (occ.filter(Boolean).length < n) {
    const id =
      kind === 'wolves' ? 'wolf' : kind === 'bandits' ? (units.length % 3 === 2 ? 'shaman' : 'bandit') : 'wolf';
    if (!put(id)) break;
  }
  return {
    units,
    open: maxSlots,
    name: kind === 'wolves' ? 'Wolf pack' : kind === 'bandits' ? 'Bandit camp' : 'Ogre den',
  };
}
export const EVENTS: Record<string, EventDef> = {
  purse: {
    name: 'Lost purse',
    text: (run) => `Gain ${3 + Math.floor(run.round / 3)} gold.`,
    go: (run) => {
      const g = 3 + Math.floor(run.round / 3);
      run.gold += g;
      return `You gained ${g} gold.`;
    },
  },
  training: {
    name: 'Training ground',
    text: () => 'Gain 4 XP.',
    go: (run) => {
      addXp(run, 4);
      return 'You gained 4 XP.';
    },
  },
  recruit: {
    name: 'Veteran for hire',
    text: () => 'A unit costing 3 or more joins you for free.',
    go: (run) => {
      let id = rollUnit(run.faction, Math.min(9, run.level + 3));
      for (let i = 0; i < 40 && U[id].cost < 3; i++) id = rollUnit(run.faction, Math.min(9, run.level + 3));
      if (U[id].cost < 3) id = rnd(POOL[run.faction][3]);
      return grant(run, id);
    },
  },
  drill: {
    name: 'Drill sergeant',
    text: () => 'A random tier-1 unit on your board that costs 3 or less is upgraded to tier 2.',
    ok: (run) =>
      run.round >= 4 &&
      run.round - (run.drillSeen || -9) >= 2 &&
      boardUnits(run).some((t) => t.tier === 1 && U[t.id].cost <= 3),
    go: (run) => {
      const t = rnd(boardUnits(run).filter((x) => x.tier === 1 && U[x.id].cost <= 3));
      t.tier = 2;
      t.gAtk *= 2;
      t.gHp *= 2;
      mergeAll(run);
      return `${U[t.id].name} was upgraded to tier 2.`;
    },
  },
  armourer: {
    f: 'H',
    name: 'Travelling armourer',
    text: () => 'Gain a random item.',
    ok: (run) => benchFree(run) >= 0,
    go: (run) => {
      const id = rnd(BASE_ITEMS);
      run.things.push({ uid: nextUid(), kind: 'item', id, bench: benchFree(run), slot: null });
      mergeItems(run);
      return `You received a ${ITEMS[id].name}.`;
    },
  },
  glade: {
    f: 'E',
    name: 'Moonlit glade',
    text: () => 'Every unit on your board grows as if it had just fought a battle.',
    ok: (run) => boardUnits(run).some((t) => U[t.id].grow),
    go: (run) => {
      let k = 0;
      for (const t of boardUnits(run)) {
        const d = U[t.id],
          m = Math.pow(2, t.tier - 1);
        if (d.grow) {
          t.gAtk += d.grow[0] * m;
          t.gHp += d.grow[1] * m;
          k++;
        }
      }
      return `${k} unit${k === 1 ? '' : 's'} grew stronger.`;
    },
  },
  grave: {
    f: 'U',
    name: 'Mass grave',
    text: () => 'Two Skeletons claw their way out and join you.',
    go: (run) => {
      grant(run, 'skeleton');
      return grant(run, 'skeleton') && 'Two Skeletons joined you.';
    },
  },
};
export function grant(run: Run, id: string): string {
  const t: UnitThing = {
    uid: nextUid(),
    kind: 'unit',
    id,
    tier: 1,
    item: null,
    gAtk: 0,
    gHp: 0,
    slot: null,
    bench: null,
  };
  run.things.push(t);
  mergeAll(run);
  if (run.things.includes(t) && !place(run, t)) {
    run.things.splice(run.things.indexOf(t), 1);
    run.gold += U[id].cost;
    return `No room for ${U[id].name}, so you took ${U[id].cost} gold instead.`;
  }
  return `${U[id].name} joined you.`;
}
export function genOffer(run: Run, beatBoss: boolean | undefined): Offer {
  if (beatBoss) {
    const pool = freeRelics(run)
      .sort(() => random() - 0.5)
      .slice(0, 3);
    if (pool.length) return { kind: 'relics', cards: pool.map((k) => ({ type: 'relic', relic: k })) };
  }
  const slots = openCount(run.level),
    round = run.round,
    cards: OfferCard[] = [];
  const camp = (hard: boolean): CampCard => {
    const c = genCamp(round, slots, hard),
      rel = hard ? rnd(freeRelics(run)) : null,
      gold = (hard ? 5 : 2) + Math.floor(round / 3);
    return Object.assign(c, {
      type: 'camp' as const,
      hard,
      reward: rel
        ? { relic: rel }
        : !hard && random() < 0.35
          ? { unit: rollUnit(run.faction, Math.min(9, run.level + 1)) }
          : { gold },
    });
  };
  const evs = Object.keys(EVENTS)
    .filter((k) => (!EVENTS[k].f || EVENTS[k].f === run.faction) && (!EVENTS[k].ok || EVENTS[k].ok(run)))
    .sort(() => random() - 0.5);
  cards.push(camp(false));
  cards.push({ type: 'event', id: evs[0] });
  const x = random(),
    fr = freeRelics(run);
  if (x < 0.45) cards.push(camp(true));
  else if (x < 0.65 && run.lives > 1 && fr.length) cards.push({ type: 'shrine', relic: rnd(fr) });
  else cards.push({ type: 'event', id: evs[1] });
  if (cards.some((c) => c.id === 'drill')) run.drillSeen = run.round;
  return { kind: 'encounter', cards };
}
/* returns { msg } when resolved on the spot, or { fight: true } when a camp battle must be played */
export function chooseOffer(run: Run, i: number): { fight?: boolean; msg?: string } | null {
  const c = run.offer && run.offer.cards[i];
  if (!c) return null;
  run.offer = null;
  if (c.type === 'camp') {
    /* a camp with nobody on the board is passed by, not fought */
    if (!boardUnits(run).length) return { msg: 'You had no units on the board, so you passed the camp by.' };
    run.camp = c as CampCard;
    return { fight: true };
  }
  let msg = '';
  if (c.type === 'event') {
    msg = EVENTS[c.id!].go(run);
    run.lastEnc = { pick: EVENTS[c.id!].name };
  } else if (c.type === 'relic') {
    run.relics.push(c.relic!);
    msg = `You took the ${RELICS[c.relic!].name}.`;
    run.lastEnc = { pick: 'relic ' + c.relic };
  } else if (c.type === 'shrine') {
    run.lives--;
    run.relics.push(c.relic!);
    msg = `You gave a life and took the ${RELICS[c.relic!].name}.`;
    run.lastEnc = { pick: 'shrine ' + c.relic };
  }
  if (has(run, 'seal') && c.relic === 'seal') run.freeRoll = true;
  return { msg };
}
export function startCamp(run: Run): Battle {
  const camp = run.camp!;
  return createBattle(boardUnits(run), camp.units, run.round, openCount(run.level), camp.open, {
    leader: run.leader,
    relics: run.relics,
  });
}
export function finishCamp(run: Run, B: Battle): { win: boolean; msg: string } {
  const c = run.camp!,
    win = B.winner === 0;
  let msg = 'You were driven off and gained nothing.';
  if (win) {
    const rw = c.reward;
    if (rw.relic) {
      run.relics.push(rw.relic);
      msg = `You found the ${RELICS[rw.relic].name}.`;
      if (rw.relic === 'seal') run.freeRoll = true;
    } else if (rw.unit) msg = grant(run, rw.unit);
    else {
      run.gold += rw.gold!;
      msg = `You took ${rw.gold} gold.`;
    }
  }
  run.lastEnc = { pick: (c.hard ? 'hard ' : '') + c.name, won: win, time: Math.round(B.time * 10) / 10 };
  run.camp = null;
  return { win, msg };
}
export function restore(run: Run): Run {
  for (const t of run.things.concat(run.enemy ? run.enemy.units : [])) reserveUid(t.uid);
  if (!run.log) run.log = [];
  if (!run.acts) run.acts = [];
  if (!run.relics) run.relics = [];
  if (run.camp) for (const t of run.camp.units) reserveUid(t.uid);
  return run;
}
