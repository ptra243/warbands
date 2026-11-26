/* Factions and the tribe/class bonuses. */
import type { FactionDef, FactionId, TribeDef } from '../types.ts';
export const FACTIONS: Record<FactionId, FactionDef> = {
  H: {
    name: 'Humans',
    blurb:
      'A balanced party. Tanks guard, clerics heal, mages burn the line and archers pick targets. Units carry items that add stats or a second class.',
  },
  E: {
    name: 'Elves',
    blurb:
      'Strong individuals that buff their neighbours and grow permanently after every battle. Buildings empower the whole board.',
  },
  N: { name: 'Monsters', blurb: '' },
  U: {
    name: 'Undead',
    blurb: 'Fill empty slots with summons, profit when your own units die, and weaken whatever stands opposite.',
  },
};

export const TRIBES: Record<string, TribeDef> = {
  Tank: { f: 'H', th: [2, 4, 6], text: ['Tanks +20% health', 'Tanks +40% health', 'Tanks +70% health'] },
  DPS: {
    f: 'H',
    th: [2, 4, 6],
    text: ['DPS +15% attack, 10% crit', 'DPS +30% attack, 20% crit', 'DPS +55% attack, 35% crit'],
  },
  Mage: {
    f: 'H',
    th: [2, 4, 6],
    text: [
      'Mages attack 15% faster and burn',
      'Mages attack 30% faster and burn',
      'Mages attack 50% faster, stronger burn',
    ],
  },
  Cleric: {
    f: 'H',
    th: [2, 4, 6],
    text: [
      'Allies regenerate 1%/s. Clerics smite every 4s',
      'Allies regenerate 1.5%/s. Clerics smite every 4s',
      'Allies regenerate 2.5%/s. Stronger smite',
    ],
  },
  Party: { f: 'H', th: [4], text: ['One of each class: all allies +15% health and attack'] },
  Grove: { f: 'E', th: [2, 4], text: ['Allies regenerate 1% health/s', 'Allies regenerate 2.5% health/s'] },
  Sun: { f: 'E', th: [2, 4], text: ['Allies +15% attack', 'Allies +35% attack'] },
  Drow: {
    f: 'E',
    th: [2, 4],
    note: 'Flanking: extra damage against any enemy that is not attacking that unit. Put Drow opposite an empty slot to strike sideways.',
    text: ['Drow 20% crit, 10% faster, +25% flanking damage', 'Drow 45% crit, 25% faster, +50% flanking damage'],
  },
  Moon: {
    f: 'E',
    th: [2, 4],
    text: ['Allies start with a 10% health shield', 'Allies start with a 25% health shield'],
  },
  Reborn: { f: 'U', th: [2, 4], text: ['Reborn rise once at 40% health', 'Reborn rise once at full health'] },
  Blight: {
    f: 'U',
    th: [2, 4],
    note: 'Rot stacks up to 5. Each stack lowers attack by 6% and deals damage every second. A stack fades every 12s, or every 6s once the unit that applied it is dead.',
    text: [
      'When a rotting enemy dies, half its Rot spreads to its neighbours',
      "All of a dying enemy's Rot spreads to its neighbours. Rot stacks up to 6",
    ],
  },
  Necromancer: {
    f: 'U',
    th: [2, 4],
    text: [
      'Summons +30% stats and soak 25% of the damage dealt to their summoner',
      'Summons +80% stats and soak 50% of the damage dealt to their summoner. Start with 1 Bone Minion that guards all your Necromancers',
    ],
  },
  Cultist: {
    f: 'U',
    th: [2, 4],
    text: [
      'When an ally dies, Cultists and Demons gain 10% attack',
      'When an ally dies, Cultists and Demons gain 20% attack',
    ],
  },
  Beast: { f: 'N', th: [], text: [] },
  Boss: { f: 'N', th: [], text: [] },
  Demon: { f: 'U', th: [], text: [] },
  Minion: { f: 'U', th: [], text: [] },
  Building: { f: 'E', th: [], text: [] },
};
