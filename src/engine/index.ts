/* Warband engine: rules data, battle simulation, shop and run logic. No DOM, so it also runs in Node. */
export * from './constants.ts';
export * from './types.ts';
export { FACTIONS, TRIBES } from './data/tribes.ts';
export { ITEMS, BASE_ITEMS } from './data/items.ts';
export { U, POOL } from './data/units.ts';
export { LEADERS, RELICS } from './data/leaders.ts';
export { aim, effAtk } from './battle/effects.ts';
export { stats, synergy, heroHp, createBattle, step } from './battle/sim.ts';
export { toggleFreeze } from './shop.ts';
export { budget, enemyLevel, genBoss, genEnemy } from './enemies.ts';
export {
  interest,
  income,
  has,
  newRun,
  boardUnits,
  occOf,
  boardFit,
  benchFree,
  mergeAll,
  priceOf,
  buy,
  itemValue,
  sellValue,
  sell,
  mergeItems,
  equip,
  planMove,
  tryMove,
  moveTo,
  buyXp,
  reroll,
} from './run.ts';
export { ghostFrom, yardstick, spreadGhosts, nextFoe } from './postgame.ts';
export { startBattle, battleReport, exportLog, finishBattle, continueRun, phase, opponent } from './round.ts';
export type { Phase, Opponent } from './round.ts';
export { EVENTS, genCamp, genOffer, chooseOffer, startCamp, finishCamp, restore } from './encounters.ts';
export { preview, aimDir, previewAll } from './preview.ts';
export { createPlayback, runToEnd, unitSnapshot, isRanged } from './playback.ts';
export type { Playback, PlaybackFrame, UnitSnapshot, HeroSnapshot } from './playback.ts';
export { setRandom, seeded } from './rng.ts';
export { YARDSTICK } from './data/yardstick.ts';
