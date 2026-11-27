/* The shapes the engine works with. Rules data lives in data/, state is plain objects mutated by engine functions. */

/** H Humans, E Elves, U Undead, N neutral monsters and bosses */
export type FactionId = 'H' | 'E' | 'U' | 'N';
export type PlayerFaction = 'H' | 'E' | 'U';
export type Pair<T> = [T, T];

/* ---- rules data ---- */

export interface UnitDef {
  id: string;
  name: string;
  f: FactionId;
  cost: number;
  /** slots wide: 1, 2 or 3 */
  size: number;
  hp: number;
  atk: number;
  /** seconds between attacks */
  cd: number;
  tribes: string[];
  /** ability text for a given tier multiplier */
  txt: (m: number) => string;
  /** never in the shop: summons, monsters, bosses */
  token?: number;
  boss?: number;
  /** cannot be sacrificed by a Blood Cultist */
  big?: number;
  building?: number;
  guard?: number;
  /** flat health added once, not multiplied by tier */
  flat?: number;
  /** [attack, health] grown after every battle */
  grow?: Pair<number>;
  /** [attack, health] given to adjacent allies after every battle */
  mentor?: Pair<number>;
  /** [attack, health] given to a random ally after every battle */
  bless?: Pair<number>;
  doubleGrow?: number;
  /** counts as this many of its first tribe */
  counts?: number;
  lives?: number;
  crit?: number;
  splash?: number;
  burn?: number;
  thorns?: number;
  opener?: number;
  reach?: number;
  noSplit?: number;
  all?: number;
  snipe?: number;
  /** summons get +50% stats while this is alive */
  aura?: number;
  /** share of the Drow bonus lent to neighbours */
  lend?: number;
  /** seconds between tick() calls */
  every?: number;
  tick?: (B: Battle, u: BattleUnit) => void;
  onStart?: (B: Battle, u: BattleUnit) => void;
  onHit?: (B: Battle, u: BattleUnit, target: BattleUnit) => void;
  onDeath?: (B: Battle, u: BattleUnit) => void;
  onRevive?: (B: Battle, u: BattleUnit) => void;
  onAllyDeath?: (B: Battle, u: BattleUnit, dead: BattleUnit) => void;
  onFoeDeath?: (B: Battle, u: BattleUnit, dead: BattleUnit) => void;
  /** after each attack */
  after?: (B: Battle, u: BattleUnit) => void;
  /** adjusts an attack's damage before it is dealt */
  mod?: (B: Battle, u: BattleUnit, v: number) => number;
  /** adjusts damage against a particular target */
  vs?: (B: Battle, u: BattleUnit, target: BattleUnit, v: number) => number;
}

export interface ItemDef {
  name: string;
  cost: number;
  text: string;
  /** the basic item a Fine item was merged from */
  base?: string;
  atk?: number;
  hp?: number;
  haste?: number;
  splash?: number;
  healHit?: number;
  /** class granted to the wearer */
  cls?: string;
}

export interface TribeDef {
  f: FactionId;
  /** unit counts at which each level switches on */
  th: number[];
  text: string[];
  note?: string;
}

export interface FactionDef {
  name: string;
  blurb: string;
}

export interface LeaderDef {
  f: PlayerFaction;
  name: string;
  /** unit whose art stands in where there is no portrait */
  art: string;
  text: string;
}

export interface RelicDef {
  name: string;
  text: string;
  f?: PlayerFaction;
}

export interface EventDef {
  name: string;
  f?: PlayerFaction;
  text: (run: Run) => string;
  ok?: (run: Run) => boolean;
  /** applies the event and says what happened */
  go: (run: Run) => string;
}

/* ---- owned things ---- */

/** a unit as given to a battle: owned, transcribed from a log, or generated */
export interface UnitSpec {
  id: string;
  uid?: number;
  kind?: 'unit';
  tier?: number;
  slot?: number | null;
  item?: string | null;
  gAtk?: number;
  gHp?: number;
  /** stat multiplier for generated monsters */
  scale?: number;
}

export interface UnitThing extends UnitSpec {
  uid: number;
  kind: 'unit';
  tier: number;
  item: string | null;
  gAtk: number;
  gHp: number;
  slot: number | null;
  bench?: number | null;
}

export interface ItemThing {
  uid: number;
  kind: 'item';
  id: string;
  bench: number | null;
  slot: null;
}

export type Thing = UnitThing | ItemThing;

export interface ShopCard {
  kind: 'unit' | 'item';
  id: string;
  frozen?: boolean;
}

/* ---- opponents and encounters ---- */

export interface Enemy {
  faction: FactionId;
  units: UnitThing[];
  /** open slots */
  open: number;
  title?: string | null;
  boss?: boolean;
  leader?: string | null;
  relics?: string[];
  /** post-game strength multiplier */
  mul?: number;
  /** key of the saved board this is */
  ghost?: string;
}

export interface Reward {
  relic?: string;
  unit?: string;
  gold?: number;
}

export interface Camp {
  units: UnitThing[];
  open: number;
  name: string;
  type?: 'camp';
  hard?: boolean;
  reward?: Reward;
}

export interface CampCard extends Camp {
  type: 'camp';
  hard: boolean;
  reward: Reward;
}

export interface OfferCard extends Partial<Omit<CampCard, 'type'>> {
  type: 'camp' | 'event' | 'relic' | 'shrine';
  id?: string;
  relic?: string;
}

export interface Offer {
  kind: 'relics' | 'encounter';
  cards: OfferCard[];
}

/** a past winning board, ready to be fought in the post-game */
export interface Ghost {
  key: string;
  faction: FactionId;
  leader: string | null;
  relics: string[];
  units: UnitSpec[];
  open: number;
  round: number;
  power: number;
  /** strength on the fixed yardstick scale, from yardstick() */
  score?: number;
}

export interface PostGame {
  n: number;
  faced: string[];
  pool: Ghost[];
  done?: boolean;
}

/* ---- the run and its log ---- */

/** a unit or item as written to the run log */
export interface Brief {
  id: string;
  scale?: number;
  tier?: number;
  slot?: number;
  item?: string;
  gAtk?: number;
  gHp?: number;
}

export interface EncounterNote {
  pick: string;
  won?: boolean;
  time?: number;
}

export interface RoundLog {
  round: number;
  gold?: number;
  level?: number;
  slots?: number;
  lives?: number;
  wins?: number;
  acts?: string[];
  bonuses?: Record<string, number>;
  board?: Brief[];
  bench?: Brief[];
  enemy?: {
    faction: FactionId;
    slots: number;
    units: Brief[];
    title?: string;
    ghost?: string;
    leader?: string | null;
    relics?: string[];
    mul?: number;
  };
  encounter?: EncounterNote;
  post?: number;
  result?: 'win' | 'loss' | 'draw';
  income?: number;
  battle?: BattleReport;
}

export interface Run {
  leader: string | null;
  relics: string[];
  offer: Offer | null;
  camp: CampCard | null;
  /** next reroll is free */
  freeRoll: boolean;
  faction: PlayerFaction;
  round: number;
  gold: number;
  lives: number;
  wins: number;
  level: number;
  xp: number;
  things: Thing[];
  shop: (ShopCard | null)[];
  over: 'won' | 'lost' | null;
  log: RoundLog[];
  /** actions taken this round, for the log */
  acts: string[];
  enemy: Enemy;
  post?: PostGame;
  saved?: boolean;
  pending?: RoundLog | null;
  lastEnc?: EncounterNote | null;
  drillSeen?: number;
  /** storage key, set by the UI the first time the run is saved */
  docId?: string;
}

export interface RunLog {
  v: number;
  game: 'warband';
  bal: number;
  post?: number;
  ended: string;
  faction: PlayerFaction;
  leader: string | null;
  relics: string[];
  outcome: 'won' | 'lost' | 'abandoned';
  wins: number;
  lives: number;
  rounds: number;
  log: RoundLog[];
}

/* ---- battle ---- */

export type SynergyLevels = Record<string, number>;

export interface BattleEvent {
  t: 'hit' | 'heal' | 'hero' | 'rot' | 'revive' | 'die' | 'summon' | 'buff' | 'atk' | 'smite';
  /** battle id of the unit concerned */
  b?: number;
  v?: number;
  side?: number;
  crit?: boolean;
  flank?: boolean;
  to?: number[];
  hero?: boolean;
  diag?: boolean;
  a?: number;
  h?: number;
}

/** Bone Minions waiting for a free slot */
export interface MinionBank {
  hp: number;
  atk: number;
  n: number;
  by: BattleUnit | null;
  guards: string | null;
}

export interface BattleUnit {
  /** battle id */
  bid: number;
  o: UnitSpec;
  d: UnitDef;
  /** tier multiplier 1 / 2 / 4 */
  m: number;
  side: number;
  slot: number;
  size: number;
  maxhp: number;
  hp: number;
  atk: number;
  baseAtk: number;
  cd: number;
  /** attack timer */
  t: number;
  /** tick timer */
  at: number;
  rot: number;
  rotDps: number;
  rotT?: number;
  rotBy?: BattleUnit | null;
  /** smite timer */
  st: number;
  /** attacks made */
  n: number;
  shield: number;
  weak: number;
  burn: number;
  burnT: number;
  regen: number;
  smite: number;
  haste: number;
  crit: number;
  splash: number;
  healHit: number;
  burnHit: number;
  lives: number;
  revFrac: number;
  alive: boolean;
  tribes: string[];
  item: string | null;
  summoned: boolean;
  owner: BattleUnit | null;
  guards?: string | null;
  flank?: number;
  flanks?: number;
  /** strongest aura of each kind already applied */
  au?: Record<string, number>;
  merged?: number;
  waited?: number;
  /** one-off ability already used */
  done?: number;
  /** Duelist: who it last hit, and how many hits in a row on them */
  duelT?: number;
  duelN?: number;
  dealt: number;
  heroDmg: number;
  taken: number;
  healed: number;
  died: number | null;
  /** who set the burn it is suffering, for stats */
  burnBy?: BattleUnit | null;
  /** battle stats only: nothing in the rules reads it */
  tally: Tally;
}

/** what a blow came from, for battle stats */
export type HitKind = 'attack' | 'crit' | 'splash' | 'reach' | 'smite' | 'ability' | 'thorns' | 'rot' | 'burn';
export type ByKind = Partial<Record<HitKind, number>>;

/** a unit's battle stats. Kept apart from `dealt` and the rest so the battle report, and the golden baseline, stay as they are */
export interface Tally {
  /** damage to enemy units by kind, before shields (attacks, abilities and thorns add up to `dealt`; Rot and burn are extra) */
  dmg: ByKind;
  /** damage to the enemy hero by kind */
  hero: ByKind;
  /** damage taken by kind, before its own shield */
  took: ByKind;
  /** of `dmg`, the extra from flanking */
  flank: number;
  /** of `hero`, the extra because the hero had no units left */
  rout: number;
  /** of `dmg`, what enemy shields soaked up */
  shielded: number;
  /** damage past what it took to kill */
  overkill: number;
  kills: number;
  /** of `took`, what its own shield soaked up */
  blocked: number;
  /** of `took`, damage taken guarding an adjacent ally */
  guarded: number;
  /** of `took`, damage taken for its summoner */
  soaked: number;
  /** healing on allies (and itself) that landed */
  heal: number;
  /** healing wasted on full health */
  overheal: number;
  /** health it regenerated */
  regen: number;
}

export interface Hero {
  hp: number;
  max: number;
}

export interface Battle {
  lead: Pair<string | null>;
  rel: Pair<Record<string, number>>;
  /** enemy strength multiplier */
  mul: number;
  rotBoost: Pair<number>;
  bank: Pair<MinionBank | null>;
  /** damage dealt by Rot and burn, by the side that dealt it */
  fx: Pair<{ rot: number; burn: number }>;
  open: Pair<boolean[]>;
  time: number;
  units: BattleUnit[];
  ev: BattleEvent[];
  over: boolean;
  /** 0 you, 1 enemy, -1 draw */
  winner: number | null;
  deaths: Pair<number>;
  round: number;
  hero: Pair<Hero>;
  syn: Pair<SynergyLevels>;
  /** the unit whose action is being resolved, for damage and healing credit */
  src?: BattleUnit | null;
  /** when sudden death began early because no unit was left */
  sdAt?: number;
  sudden?: boolean;
}

export interface BattleOptions {
  leader?: string | null;
  relics?: string[];
  foeLeader?: string | null;
  foeRelics?: string[];
  foeMul?: number;
}

export interface UnitReport {
  side: 'you' | 'enemy';
  id: string;
  slot: number;
  dealt: number;
  hero: number;
  taken: number;
  tier?: number;
  healed?: number;
  summoned?: number;
  merged?: number;
  waited?: number;
  flanks?: number;
  died?: number;
  hpLeft?: number;
}

export interface BattleReport {
  time: number;
  sudden: boolean;
  heroHp: Pair<number>;
  heroMax: number;
  effects: { you: { rot: number; burn: number }; enemy: { rot: number; burn: number } };
  units: UnitReport[];
}

/** where a dragged thing is dropped */
export interface MoveDest {
  slot?: number;
  bench?: number | null;
}

export interface DamageOptions {
  /** redirected damage: guards and soaks do not apply again */
  redir?: number;
  soak?: number;
  crit?: boolean;
  flank?: boolean;
  /** what the blow came from, for stats; an ability if not given */
  kind?: HitKind;
  /** stats only: the target is taking this for an ally, as a guard or a summon soaking for its summoner */
  as?: 'guarded' | 'soaked';
}
