/* Human items and their Fine versions. */
import type { ItemDef } from '../types.ts';
export const ITEMS: Record<string, ItemDef> = {
  sword: { name: 'Iron Sword', cost: 2, atk: 0.4, text: '+40% attack.' },
  shield: { name: 'Tower Shield', cost: 2, hp: 0.4, cls: 'Tank', text: '+40% health. Gains the Tank class.' },
  tome: {
    name: 'Spellbook',
    cost: 3,
    cls: 'Mage',
    splash: 0.5,
    text: 'Gains the Mage class. Attacks splash to neighbours for 50%.',
  },
  symbol: {
    name: 'Holy Symbol',
    cost: 3,
    hp: 0.2,
    cls: 'Cleric',
    healHit: 0.4,
    text: '+20% health. Gains the Cleric class. Each attack heals the weakest ally.',
  },
  bow: { name: 'Longbow', cost: 3, haste: 0.2, cls: 'DPS', text: 'Attacks 20% faster. Gains the DPS class.' },
};

export const BASE_ITEMS = Object.keys(ITEMS);
Object.assign(ITEMS, {
  'sword+': { base: 'sword', name: 'Fine Iron Sword', cost: 6, atk: 0.6, text: '+60% attack.' },
  'shield+': {
    base: 'shield',
    name: 'Fine Tower Shield',
    cost: 6,
    hp: 0.6,
    cls: 'Tank',
    text: '+60% health. Gains the Tank class.',
  },
  'tome+': {
    base: 'tome',
    name: 'Fine Spellbook',
    cost: 9,
    cls: 'Mage',
    splash: 0.75,
    text: 'Gains the Mage class. Attacks splash to neighbours for 75%.',
  },
  'symbol+': {
    base: 'symbol',
    name: 'Fine Holy Symbol',
    cost: 9,
    hp: 0.3,
    cls: 'Cleric',
    healHit: 0.6,
    text: '+30% health. Gains the Cleric class. Each attack heals the weakest ally, for half as much again.',
  },
  'bow+': {
    base: 'bow',
    name: 'Fine Longbow',
    cost: 9,
    haste: 0.3,
    cls: 'DPS',
    text: 'Attacks 30% faster. Gains the DPS class.',
  },
});
