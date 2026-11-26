/* Generated opponents and bosses. */
import type { Enemy, FactionId, PlayerFaction, UnitThing } from './types.ts';
import { ORDER, SLOTS, openArr, openCount } from './constants.ts';
import { BASE_ITEMS, ITEMS } from './data/items.ts';
import { U } from './data/units.ts';
import { rollUnit } from './shop.ts';
import { nextUid } from './ids.ts';
import { random, rnd } from './rng.ts';

export const budget = (round: number): number =>
  5 + 5 * (round - 1) + 0.32 * (round - 1) * (round - 1) + Math.max(0, round - 7) * 4;
export const enemyLevel = (round: number): number => Math.min(9, 1 + Math.floor(round * 0.7));
/* the earliest round an enemy may field a unit of this cost at tier 2 / tier 3: roughly what a player could own */
export const T2FROM = [0, 2, 4, 7, 10, 13],
  T3FROM = [0, 6, 9, 12, 99, 99];
export const ARCH: { name: string; f: PlayerFaction; tribes: string[] }[] = [
  { name: 'Shield wall', f: 'H', tribes: ['Tank', 'Cleric'] },
  { name: 'Firing line', f: 'H', tribes: ['DPS', 'Mage'] },
  { name: 'Grave swarm', f: 'U', tribes: ['Necromancer', 'Reborn'] },
  { name: 'Blood cult', f: 'U', tribes: ['Cultist', 'Reborn'] },
  { name: 'Plague host', f: 'U', tribes: ['Blight'] },
  { name: 'Moonlit grove', f: 'E', tribes: ['Grove', 'Moon'] },
  { name: 'Drow raid', f: 'E', tribes: ['Drow', 'Sun'] },
];
export const BOSSES: [string, number][] = [
  ['ogrelord', 5],
  ['bonedragon', 10],
  ['titan', 15],
];
export function monster(id: string, slot: number, scale: number): UnitThing {
  return { uid: nextUid(), kind: 'unit', id, tier: 1, slot, item: null, gAtk: 0, gHp: 0, scale };
}
export function genBoss(round: number, maxSlots?: number): Enemy {
  const n = Math.max(4, Math.min(SLOTS, maxSlots || SLOTS)),
    open = openArr(n),
    k = (Math.floor(round / 5) - 1) % 3,
    [id, base] = BOSSES[k];
  const lo = open.indexOf(true),
    hi = open.lastIndexOf(true),
    s = Math.max(lo, Math.min(3, hi - 2)),
    units = [monster(id, s, Math.pow(1.2, round - base))];
  const free = [];
  for (let i = lo; i <= hi; i++) if (i < s || i > s + 2) free.push(i);
  const esc = 1 + 0.3 * (round - 1);
  for (const i of free.slice(0, Math.min(free.length, 2 + Math.floor(round / 5))))
    units.push(monster(rnd(['wolf', 'bandit', 'wolf', 'shaman']), i, esc));
  return { faction: 'N', units, open: n, boss: true, title: 'Boss: ' + U[id].name };
}
export function genEnemy(round: number, maxSlots?: number, noBoss?: boolean): Enemy {
  if (round % 5 === 0 && !noBoss) return genBoss(round, maxSlots);
  const arch = round >= 3 && random() < 0.5 ? rnd(ARCH) : null;
  const pick = (f0: FactionId, lv: number) => {
    let id = rollUnit(f0, lv);
    if (arch) for (let i = 0; i < 8 && !U[id].tribes.some((t) => arch.tribes.includes(t)); i++) id = rollUnit(f0, lv);
    return id;
  };
  const f = arch ? arch.f : rnd<PlayerFaction>(['H', 'E', 'U']),
    level = enemyLevel(round),
    n = Math.min(openCount(level), maxSlots || SLOTS),
    open = openArr(n),
    out: UnitThing[] = [],
    occ = Array(SLOTS).fill(0);
  let gold = budget(round),
    tries = 0;
  const cap = f === 'U' ? Math.max(3, n - 2) : n;
  while (gold >= 1 && tries++ < 80) {
    if (occ.filter(Boolean).length >= cap) break;
    const id = pick(f, level),
      d = U[id];
    let tier = 1;
    const x = random();
    if (round >= T3FROM[d.cost] && x < 0.15 && !d.building) tier = 3;
    else if (round >= T2FROM[d.cost] && x < Math.min(0.6, 0.08 * round)) tier = 2;
    let cost = d.cost * Math.pow(3, tier - 1);
    if (cost > gold && tier === 3) {
      tier = 2;
      cost = d.cost * 3;
    }
    if (cost > gold) {
      tier = 1;
      cost = d.cost;
    }
    if (cost > gold) continue;
    const s = ORDER.find((s0) => {
      if (s0 + d.size > SLOTS) return false;
      for (let i = 0; i < d.size; i++) if (occ[s0 + i] || !open[s0 + i]) return false;
      return true;
    });
    if (s === undefined) continue;
    for (let i = 0; i < d.size; i++) occ[s + i] = 1;
    const o: UnitThing = { uid: nextUid(), kind: 'unit', id, tier, slot: s, item: null, gAtk: 0, gHp: 0 };
    if (d.grow) {
      const k = (round - 1) * 0.35 * tier;
      o.gAtk = Math.round(d.grow[0] * k);
      o.gHp = Math.round(d.grow[1] * k);
    }
    out.push(o);
    gold -= cost;
  }
  // spend what is left on upgrades the round allows, cheapest first
  for (const o of out
    .slice()
    .sort((a, b) => (U[a.id].building ? 1 : 0) - (U[b.id].building ? 1 : 0) || U[a.id].cost - U[b.id].cost)) {
    if (U[o.id].building && o.tier >= 2) continue;
    const c = U[o.id].cost,
      up = c * Math.pow(3, o.tier) - c * Math.pow(3, o.tier - 1);
    if (o.tier < 3 && gold >= up && round >= (o.tier === 1 ? T2FROM : T3FROM)[c]) {
      o.tier++;
      gold -= up;
      if (U[o.id].grow) {
        o.gAtk = Math.round((o.gAtk * o.tier) / (o.tier - 1));
        o.gHp = Math.round((o.gHp * o.tier) / (o.tier - 1));
      }
    }
  }
  if (f === 'H')
    for (const o of out)
      if (gold >= 2 && random() < 0.5) {
        o.item = rnd(BASE_ITEMS);
        gold -= ITEMS[o.item].cost;
      }
  return { faction: f, units: out, open: n, title: arch ? arch.name : null };
}
