/* Leaders and relics. */
import type { LeaderDef, RelicDef } from '../types.ts';
export const LEADERS: Record<string, LeaderDef> = {
  quartermaster: {
    f: 'H',
    name: 'The Quartermaster',
    art: 'crossbow',
    text: 'Items appear in your shop twice as often and cost 1 less.',
  },
  marshal: {
    f: 'H',
    name: 'The Marshal',
    art: 'captain',
    text: 'Your Full party bonus is doubled to +30% health and attack.',
  },
  warden: { f: 'H', name: 'The Warden', art: 'knight', text: 'Your leftmost and rightmost units have +50% health.' },
  grovekeeper: {
    f: 'E',
    name: 'The Grovekeeper',
    art: 'treant',
    text: 'Your units grow 50% more after each battle.',
  },
  architect: {
    f: 'E',
    name: 'The Architect',
    art: 'sunspire',
    text: 'Buildings cost 1 less and have double health. Allies beside a building have +20% attack.',
  },
  bladesinger: {
    f: 'E',
    name: 'The Bladesinger',
    art: 'assassin',
    text: 'Your highest-attack unit attacks 30% faster.',
  },
  gravecaller: {
    f: 'U',
    name: 'The Gravecaller',
    art: 'necromancer',
    text: 'Your summons arrive with a shield worth 75% of their health.',
  },
  bloodpriest: {
    f: 'U',
    name: 'The Blood Priest',
    art: 'bloodcultist',
    text: 'Whenever one of your own units dies, your others gain 8% attack. Summons do not count.',
  },
  plaguefather: {
    f: 'U',
    name: 'The Plaguefather',
    art: 'plague',
    text: 'Every enemy starts with 1 Rot, and Rot deals 25% more damage.',
  },
};
export const RELICS: Record<string, RelicDef> = {
  whetstone: { name: 'Whetstone', text: 'Your leftmost unit attacks 50% faster.' },
  bulwark: { name: 'Bulwark Plate', text: 'Your rightmost unit has +50% health.' },
  wardrum: { name: 'War Drum', text: 'All your units have +10% attack.' },
  font: { name: 'Healing Font', text: 'Your units regenerate 1% of their health each second.' },
  aegis: { name: "Hero's Aegis", text: 'Your hero takes 20% less damage.' },
  banner: { name: 'Vanguard Banner', text: 'Your units make their first attack twice as soon.' },
  belt: { name: "Giant's Belt", text: 'Your units wider than one slot have +25% health and attack.' },
  coin: { name: 'Lucky Coin', text: '+1 gold every round.' },
  seal: { name: "Merchant's Seal", text: 'Your first reroll each round is free.' },
  scholar: { name: "Scholar's Tome", text: '+2 extra XP every round.' },
  armoury: { name: 'Armoury Key', f: 'H', text: 'Your units without an item have +15% health.' },
  seedling: {
    name: 'Elder Seedling',
    f: 'E',
    text: 'Your units grow an extra +1 attack and +3 health after each battle.',
  },
  bell: { name: "Summoner's Bell", f: 'U', text: 'Start each battle with a Bone Minion in an empty slot.' },
};
