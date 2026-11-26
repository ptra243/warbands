// final boards of the user's real winning runs, transcribed from the pasted logs
import type { PlayerFaction, UnitSpec } from '../src/engine/index.ts';

export interface SavedBoard {
  name: string;
  f: PlayerFaction;
  leader: string | null;
  relics: string[];
  open: number;
  units: UnitSpec[];
}

const u = (id: string, slot: number, tier?: number, item?: string | null, gAtk?: number, gHp?: number): UnitSpec => ({
  id,
  slot,
  tier: tier || 1,
  item: item || null,
  gAtk: gAtk || 0,
  gHp: gHp || 0,
});
const boards: SavedBoard[] = [
  {
    name: 'PF-new',
    f: 'U',
    leader: 'plaguefather',
    relics: ['coin', 'bulwark', 'seal', 'aegis'],
    open: 10,
    units: [
      u('plaguelord', 0),
      u('plague', 2, 2),
      u('banshee', 3, 2),
      u('bloodcultist', 4, 2),
      u('ghoul', 5, 2),
      u('initiate', 6, 2),
      u('pitlord', 7, 2),
      u('soulreaper', 8),
      u('rothound', 9, 2),
    ],
  },
  {
    name: 'PF-old',
    f: 'U',
    leader: 'plaguefather',
    relics: ['bulwark', 'banner', 'font', 'scholar'],
    open: 10,
    units: [
      u('soulreaper', 0),
      u('soulreaper', 1, 2),
      u('ghoul', 2, 2),
      u('rothound', 3, 2),
      u('plaguelord', 4),
      u('deathknight', 6, 2),
      u('plague', 7, 3),
      u('pitlord', 8, 2),
      u('banshee', 9, 2),
    ],
  },
  {
    name: 'BloodPr',
    f: 'U',
    leader: 'bloodpriest',
    relics: ['whetstone', 'coin'],
    open: 9,
    units: [
      u('soulreaper', 0, 2),
      u('pitlord', 1, 2),
      u('plague', 2, 2),
      u('revenant', 3, 2),
      u('initiate', 4, 3),
      u('deathknight', 5),
      u('banshee', 6, 2),
      u('soulreaper', 7, 2),
      u('bloodcultist', 8, 2),
    ],
  },
  {
    name: 'Grave-1',
    f: 'U',
    leader: 'gravecaller',
    relics: ['scholar', 'font', 'bulwark', 'belt', 'wardrum'],
    open: 10,
    units: [
      u('necromancer', 0, 2),
      u('banshee', 1, 2),
      u('plague', 2),
      u('boneshaper', 3, 2),
      u('gravedigger', 4, 2),
      u('colossus', 5, 2),
      u('lich', 7, 2),
    ],
  },
  {
    name: 'Grave-2',
    f: 'U',
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
  {
    name: 'Marshal',
    f: 'H',
    leader: 'marshal',
    relics: ['belt'],
    open: 10,
    units: [
      u('archmage', 0, 1, 'shield'),
      u('captain', 2, 2, 'symbol'),
      u('champion', 3, 2, 'sword'),
      u('paladin', 4, 1, 'bow+'),
      u('halberdier', 6, 2, 'bow+'),
      u('duelist', 7, 2),
      u('knight', 8, 2, 'tome'),
    ],
  },
  {
    name: 'Quarter',
    f: 'H',
    leader: 'quartermaster',
    relics: ['coin', 'font', 'banner'],
    open: 10,
    units: [
      u('sharpshooter', 0, 1, 'tome'),
      u('priest', 1, 2, 'shield'),
      u('champion', 2, 2, 'shield'),
      u('captain', 3, 2, 'symbol'),
      u('footman', 4, 2, 'symbol'),
      u('archer', 5, 2, 'sword'),
      u('knight', 6, 2, 'tome'),
      u('paladin', 8, 2, 'tome'),
    ],
  },
  {
    name: 'Warden',
    f: 'H',
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
    name: 'Grovekp',
    f: 'E',
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
];
boards.push({
  name: 'DROW-run',
  f: 'E',
  leader: 'bladesinger',
  relics: ['font', 'seedling'],
  open: 10,
  units: [
    u('drowblade', 0, 2, null, 29, 31),
    u('moonwell', 1, 2),
    u('matriarch', 2, 2, null, 37, 111),
    u('archon', 3, 1, null, 5, 19),
    u('venom', 5, 2, null, 29, 59),
    u('sunspire', 6, 2),
    u('sunaco', 8, 2, null, 1, 87),
    u('assassin', 9, 2, null, 43, 45),
  ],
});
export default boards;
