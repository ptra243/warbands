/* Targeting previews for the shop screen. */
import type { Battle, BattleUnit, Run } from './types.ts';
import { openCount } from './constants.ts';
import { aim, foes } from './battle/effects.ts';
import { createBattle } from './battle/sim.ts';
import { boardUnits, bopt } from './run.ts';

export function preview(run: Run, uid: number): { to: number[]; names: string[]; hero: boolean; diag: boolean } | null {
  const bu = boardUnits(run),
    B = createBattle(bu, run.enemy.units, run.round, openCount(run.level), run.enemy.open, bopt(run));
  const u = B.units.find((x) => x.side === 0 && x.o.uid === uid);
  if (!u || u.d.building || !(u.atk > 0)) return null;
  const A = aim(B, u),
    ts = u.d.all ? foes(B, 0) : A.ts;
  return {
    to: ts.map((x) => x.o.uid).filter((x) => x != null),
    names: ts.map((x) => x.d.name),
    hero: !ts.length,
    diag: A.diag,
  };
}
/* which way a unit is aiming: 'l' / 'r' diagonal, 'c' straight ahead, 'h' the hero, '' for units that do not attack */
export function aimDir(B: Battle, u: BattleUnit): '' | 'l' | 'r' | 'c' | 'h' {
  if (u.d.building || !(u.atk > 0)) return '';
  const A = aim(B, u);
  if (!A.ts.length) return 'h';
  if (u.d.all || A.ts.length > 1) return 'c';
  const t = A.ts[0];
  return t.slot + t.size <= u.slot ? 'l' : t.slot >= u.slot + u.size ? 'r' : 'c';
}
export function previewAll(run: Run): Record<number, ReturnType<typeof aimDir>> {
  const B = createBattle(boardUnits(run), run.enemy.units, run.round, openCount(run.level), run.enemy.open, bopt(run)),
    out: Record<number, ReturnType<typeof aimDir>> = {};
  for (const u of B.units) if (u.o.uid != null) out[u.o.uid] = aimDir(B, u);
  return out;
}
