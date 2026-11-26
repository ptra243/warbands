/* Rolling and freezing the shop. */
import type { FactionId, Run } from './types.ts';
import { ODDS } from './constants.ts';
import { BASE_ITEMS } from './data/items.ts';
import { POOL } from './data/units.ts';
import { random, rnd } from './rng.ts';

/* ---- run / shop ---- */
export function rollCost(level: number): number {
  const o = ODDS[Math.min(level, 9) - 1];
  let x = random() * 100;
  for (let i = 0; i < 5; i++) {
    if (x < o[i]) return i + 1;
    x -= o[i];
  }
  return 1;
}
export function rollUnit(f: FactionId, level: number): string {
  let c = rollCost(level);
  while (!POOL[f][c]) c--;
  return rnd(POOL[f][c]);
}
export function rollShop(run: Run): void {
  const old = run.shop || [];
  run.shop = [];
  for (let i = 0; i < 5; i++) {
    const kept = old[i];
    run.shop.push(
      kept && kept.frozen
        ? kept
        : run.faction === 'H' && random() < (run.leader === 'quartermaster' ? 0.35 : 0.18)
          ? { kind: 'item', id: rnd(BASE_ITEMS) }
          : { kind: 'unit', id: rollUnit(run.faction, run.level) },
    );
  }
}
export function toggleFreeze(run: Run, i: number): boolean {
  const s = run.shop[i];
  if (!s) return false;
  s.frozen = !s.frozen;
  run.acts.push((s.frozen ? 'freeze ' : 'unfreeze ') + s.id);
  return true;
}
