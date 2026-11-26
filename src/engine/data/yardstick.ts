/* The fixed boards every post-game board is measured against, one per faction: final boards of real winning runs.
 Changing them changes every score, so it is a rules change. */
import type { FactionId, UnitSpec } from '../types.ts';

export interface RefBoard {
  faction: FactionId;
  leader: string | null;
  relics: string[];
  open: number;
  units: UnitSpec[];
}

const u = (id: string, slot: number, tier = 1, item: string | null = null, gAtk = 0, gHp = 0): UnitSpec => ({
  id,
  slot,
  tier,
  item,
  gAtk,
  gHp,
});

export const YARDSTICK: readonly RefBoard[] = [
  {
    faction: 'H',
    leader: 'warden',
    relics: ['whetstone', 'wardrum'],
    open: 10,
    units: [
      u('apprentice', 0, 2, 'sword'),
      u('captain', 1, 1, 'shield'),
      u('duelist', 2),
      u('crossbow', 3, 2, 'tome'),
      u('halberdier', 4, 2),
      u('paladin', 5, 1, 'bow'),
      u('acolyte', 7, 2),
      u('archer', 8, 3, 'sword'),
      u('sharpshooter', 9, 1, 'shield'),
    ],
  },
  {
    faction: 'E',
    leader: 'grovekeeper',
    relics: ['wardrum', 'belt', 'seal'],
    open: 10,
    units: [
      u('briar', 0, 2, null, 24, 184),
      u('worldtree', 1, 2),
      u('treant', 4, 2, null, 92, 552),
      u('archdruid', 6, 2, null, 6, 36),
      u('sunaco', 7, 2, null, 4, 101),
      u('sunspire', 8, 2),
    ],
  },
  {
    faction: 'U',
    leader: 'gravecaller',
    relics: ['wardrum', 'font'],
    open: 10,
    units: [
      u('lich', 0, 2),
      u('herald', 2, 2),
      u('boneshaper', 4, 2),
      u('necromancer', 5, 3),
      u('boneshaper', 6, 2),
      u('banshee', 7, 2),
      u('collector', 8, 2),
      u('pitlord', 9, 2),
    ],
  },
];
