/* Playback and fast-forward: the only places a battle is advanced through time.
   A battle always moves in whole ticks, so a battle someone watches ends exactly as the same battle skipped or
   fast-forwarded by the tools does. Playback banks the frame time left over from one frame for the next. */
import { MAX_BATTLE_TIME, TICK } from './constants.ts';
import { effAtk } from './battle/effects.ts';
import { step } from './battle/sim.ts';
import { aimDir } from './preview.ts';
import type { Battle, BattleEvent, BattleUnit, Pair } from './types.ts';

/** what a battle screen needs to draw one living unit at one moment */
export interface UnitSnapshot {
  /** the unit itself, for what never changes in a fight: its def, side, slot and size */
  unit: BattleUnit;
  /** health and shield as fractions of max health, 0 to 1 */
  hpK: number;
  shieldK: number;
  /** how far the next attack (or a building's next pulse) has charged, 0 to 1 */
  cdK: number;
  /** the attack shown on the card; null for a building */
  atk: number | null;
  /** the health shown on the card: never below 1 while the unit stands */
  hp: number;
  rot: number;
  weak: boolean;
  burning: boolean;
  shielded: boolean;
  aim: ReturnType<typeof aimDir>;
  /** attacks at range: shown as a projectile rather than a lunge. Presentation only. */
  ranged: boolean;
}

export interface HeroSnapshot {
  hp: number;
  max: number;
  /** health as a fraction of max, 0 to 1 */
  k: number;
}

/** one frame of playback: the events of the ticks just run, and how everything stands after them */
export interface PlaybackFrame {
  events: BattleEvent[];
  /** living units, by battle id */
  units: Map<number, UnitSnapshot>;
  heroes: Pair<HeroSnapshot>;
  /** battle seconds elapsed, in whole ticks */
  time: number;
  sudden: boolean;
  over: boolean;
  winner: number | null;
  speed: number;
}

export interface Playback {
  readonly battle: Battle;
  /** battle seconds per real second */
  speed: number;
  /** let `realDt` seconds of real time pass (at most a tenth of a second counts, so a stalled tab doesn't jump) */
  advance(realDt: number): PlaybackFrame;
}

/** frames longer than this count as this long */
const MAX_FRAME = 0.1;
/** tribes whose attacks are shown as projectiles */
const RANGED_TRIBES = ['DPS', 'Mage', 'Cleric', 'Necromancer'];

export const isRanged = (u: BattleUnit): boolean => !!u.d.reach || u.d.tribes.some((t) => RANGED_TRIBES.includes(t));

/** `lead`: battle seconds banked toward the next tick, so a cooldown bar sweeps smoothly between ticks */
export function unitSnapshot(B: Battle, u: BattleUnit, lead = 0): UnitSnapshot {
  const building = !!u.d.building;
  const cdK = building
    ? u.d.every
      ? Math.min(1, (u.at + lead) / u.d.every)
      : 0
    : Math.min(1, (u.t + lead * (1 + u.haste)) / u.cd);
  return {
    unit: u,
    hpK: Math.max(0, Math.min(1, u.hp / u.maxhp)),
    shieldK: Math.max(0, Math.min(1, u.shield / u.maxhp)),
    cdK,
    atk: building ? null : Math.max(0, Math.round(effAtk(u))),
    hp: Math.max(1, Math.round(u.hp)),
    rot: u.rot,
    weak: u.weak > 0,
    burning: u.burnT > 0,
    shielded: u.shield > 0,
    aim: aimDir(B, u),
    ranged: isRanged(u),
  };
}

function frameOf(B: Battle, events: BattleEvent[], speed: number, lead: number): PlaybackFrame {
  const units = new Map<number, UnitSnapshot>();
  for (const u of B.units) if (u.alive) units.set(u.bid, unitSnapshot(B, u, lead));
  const hero = (s: number): HeroSnapshot => ({
    hp: Math.max(0, Math.round(B.hero[s].hp)),
    max: B.hero[s].max,
    k: Math.max(0, Math.min(1, B.hero[s].hp / B.hero[s].max)),
  });
  return {
    events,
    units,
    heroes: [hero(0), hero(1)],
    time: B.time,
    sudden: !!B.sudden,
    over: B.over,
    winner: B.winner,
    speed,
  };
}

/** watch battle B. Events already queued on B (from setting it up) are handed out with the first frame. */
export function createPlayback(B: Battle, speed = 1): Playback {
  let bank = 0;
  return {
    battle: B,
    speed,
    advance(realDt) {
      if (!B.over) {
        bank += Math.min(MAX_FRAME, Math.max(0, realDt)) * this.speed;
        /* the epsilon keeps float error from losing a tick that is due */
        while (bank >= TICK - 1e-9 && !B.over) {
          step(B, TICK);
          bank -= TICK;
        }
        if (B.over) bank = 0;
      }
      return frameOf(B, B.ev.splice(0), this.speed, Math.max(0, bank));
    },
  };
}

/** fast-forward battle B to its end, dropping its events. Gives up at `maxTime` battle seconds. */
export function runToEnd(B: Battle, maxTime = MAX_BATTLE_TIME): Battle {
  while (!B.over && B.time < maxTime) {
    step(B, TICK);
    B.ev.length = 0;
  }
  return B;
}
