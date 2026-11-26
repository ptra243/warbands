/* Fighting the saved boards in tools/boards.ts against each other. ENG=path/to/engine compares another engine build. */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type * as Engine from '../../src/engine/index.ts';
import type { SavedBoard } from '../boards.ts';

export const W: typeof Engine = process.env.ENG
  ? await import(pathToFileURL(resolve(process.env.ENG)).href)
  : await import('../../src/engine/index.ts');

/** 0 when a wins, 1 when b wins, -1 for a draw */
export function boardFight(a: SavedBoard, b: SavedBoard): number | null {
  const B = W.createBattle(
    a.units.map((x) => ({ ...x })),
    b.units.map((x) => ({ ...x })),
    13,
    a.open,
    b.open,
    { leader: a.leader, relics: a.relics, foeLeader: b.leader, foeRelics: b.relics },
  );
  return W.runToEnd(B).winner;
}
