/* Battle stats: who dealt, took and healed what, split by where it came from. Only counts; nothing in the rules reads it. */
import type { Battle, BattleUnit, ByKind, HitKind, Pair, Tally } from '../types.ts';

export const newTally = (): Tally => ({
  dmg: {},
  hero: {},
  took: {},
  flank: 0,
  rout: 0,
  shielded: 0,
  overkill: 0,
  kills: 0,
  blocked: 0,
  guarded: 0,
  soaked: 0,
  heal: 0,
  overheal: 0,
  regen: 0,
});
export const addKind = (m: ByKind, k: HitKind, v: number): void => {
  m[k] = (m[k] || 0) + v;
};
export const sumKinds = (m: ByKind): number => Object.values(m).reduce((a, b) => a + (b || 0), 0);

export interface UnitStats {
  side: 'you' | 'enemy';
  id: string;
  slot: number;
  tier: number;
  summoned: boolean;
  item: string | null;
  tribes: string[];
  alive: boolean;
  t: Tally;
}
export interface BattleStats {
  time: number;
  winner: number | null;
  units: UnitStats[];
  /** Rot and burn damage with no unit to credit (a leader's Rot, or Rot whose source has gone), by the side that dealt it */
  unowned: Pair<{ rot: number; burn: number }>;
  /** hero damage from sudden death, by the side whose hero took it */
  sudden: Pair<number>;
}

/** the full stats of a finished (or running) battle. Not rounded: round when showing them */
export function battleStats(B: Battle): BattleStats {
  const units = B.units.map((u): UnitStats => ({
    side: u.side ? 'enemy' : 'you',
    id: u.d.id,
    slot: u.slot,
    tier: u.m === 4 ? 3 : u.m === 2 ? 2 : 1,
    summoned: u.summoned,
    item: u.item,
    tribes: u.tribes.slice(),
    alive: u.alive,
    t: u.tally,
  }));
  const side = (s: number) => B.units.filter((u) => u.side === s);
  const owned = (s: number, k: 'rot' | 'burn') => side(s).reduce((a, u) => a + (u.tally.dmg[k] || 0), 0);
  const heroBy = (s: number) => side(s).reduce((a, u) => a + sumKinds(u.tally.hero), 0);
  const unowned = [0, 1].map((s) => ({
    rot: Math.max(0, B.fx[s].rot - owned(s, 'rot')),
    burn: Math.max(0, B.fx[s].burn - owned(s, 'burn')),
  })) as Pair<{ rot: number; burn: number }>;
  /* whatever a hero lost that no unit dealt came from sudden death */
  const sudden = [0, 1].map((s) =>
    Math.max(0, B.hero[s].max - Math.max(0, B.hero[s].hp) - heroBy(1 - s)),
  ) as Pair<number>;
  return { time: B.time, winner: B.winner, units, unowned, sudden };
}

/** credit a kill to whoever dealt the blow that finished `t`, if it really died */
export function creditKill(by: BattleUnit | null | undefined, t: BattleUnit, over: number): void {
  if (!by || by.side === t.side || t.alive) return;
  by.tally.kills++;
  by.tally.overkill += over;
}
