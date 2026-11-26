/* Every unit, with its stats and abilities. m = 1/2/4 for tier 1/2/3. */
import type { UnitDef } from '../types.ts';
import { SLOTS, pct } from '../constants.ts';
import {
  addRot,
  adj,
  aur,
  aura,
  die,
  dmg,
  effAtk,
  foes,
  friends,
  front,
  heal,
  summon,
  weaken,
  weakest,
} from '../battle/effects.ts';
import { random } from '../rng.ts';

/* ---- units. m = 1/2/4 for tier 1/2/3 ---- */
const DEFS: Record<string, Omit<UnitDef, 'id'>> = {
  // Humans
  footman: {
    name: 'Footman',
    f: 'H',
    cost: 1,
    size: 1,
    hp: 80,
    atk: 6,
    cd: 2.0,
    tribes: ['Tank'],
    guard: 1,
    txt: () => 'Guard: takes 30% of the damage dealt to adjacent allies.',
  },
  archer: {
    name: 'Militia Slinger',
    f: 'H',
    cost: 1,
    size: 1,
    hp: 40,
    atk: 9,
    cd: 1.7,
    tribes: ['DPS'],
    txt: () => 'Every third shot deals double damage.',
    mod: (B, u, v) => (u.n % 3 === 0 ? v * 2 : v),
  },
  apprentice: {
    name: 'Apprentice',
    f: 'H',
    cost: 1,
    size: 1,
    hp: 38,
    atk: 6,
    cd: 2.2,
    tribes: ['Mage'],
    splash: 0.5,
    txt: () => 'Attacks also hit enemies beside the target for 50%.',
  },
  acolyte: {
    name: 'Acolyte',
    f: 'H',
    cost: 1,
    size: 1,
    hp: 44,
    atk: 4,
    cd: 2.2,
    tribes: ['Cleric'],
    every: 4,
    txt: (m) => `Every 4s heals the weakest ally for ${9 * m}.`,
    tick: (B, u) => heal(B, weakest(friends(B, u.side)), 9 * u.m),
  },
  knight: {
    name: 'Knight',
    f: 'H',
    cost: 2,
    size: 2,
    hp: 170,
    atk: 13,
    cd: 2.4,
    tribes: ['Tank'],
    guard: 1,
    txt: (m) => `Guard. Starts with a ${30 * m} shield.`,
    onStart: (B, u) => {
      u.shield += 30 * u.m;
    },
  },
  crossbow: {
    name: 'Crossbowman',
    f: 'H',
    cost: 2,
    size: 1,
    hp: 50,
    atk: 20,
    cd: 2.3,
    tribes: ['DPS'],
    crit: 0.25,
    txt: () => '25% chance to crit for double damage.',
  },
  firemage: {
    name: 'Fire Mage',
    f: 'H',
    cost: 3,
    size: 1,
    hp: 60,
    atk: 10,
    cd: 2.4,
    tribes: ['Mage'],
    splash: 1,
    burn: 4,
    txt: (m) => `Attacks hit neighbours for full damage and burn for ${4 * m}/s.`,
  },
  priest: {
    name: 'Priest',
    f: 'H',
    cost: 3,
    size: 1,
    hp: 70,
    atk: 5,
    cd: 2.4,
    tribes: ['Cleric'],
    every: 5,
    txt: (m) => `Every 5s heals all allies for ${8 * m}.`,
    tick: (B, u) => friends(B, u.side).forEach((a) => heal(B, a, 8 * u.m)),
  },
  captain: {
    name: 'Captain',
    f: 'H',
    cost: 3,
    size: 1,
    hp: 110,
    atk: 18,
    cd: 2.0,
    tribes: ['DPS'],
    txt: (m) => `Adjacent allies attack ${pct(0.2 * aur(m))} faster. Does not stack with another Captain.`,
    onStart: (B, u) =>
      adj(B, u).forEach((a) => {
        const v = 0.2 * aur(u.m),
          o = aura(a, 'captain', v);
        if (o != null) a.haste += v - o;
      }),
  },
  sharpshooter: {
    name: 'Falconer',
    f: 'H',
    cost: 4,
    size: 1,
    hp: 90,
    atk: 42,
    cd: 2.6,
    tribes: ['DPS'],
    snipe: 1,
    txt: () => 'Its hawk always strikes the weakest enemy unit, wherever it stands.',
  },
  paladin: {
    name: 'Paladin',
    f: 'H',
    cost: 4,
    size: 2,
    hp: 300,
    atk: 21,
    cd: 2.4,
    tribes: ['Tank', 'Cleric'],
    guard: 1,
    every: 5,
    txt: (m) => `Guard. Every 5s heals itself and adjacent allies for ${20 * m}.`,
    tick: (B, u) => [u, ...adj(B, u)].forEach((a) => heal(B, a, 20 * u.m)),
  },
  archmage: {
    name: 'Archmage',
    f: 'H',
    cost: 5,
    size: 2,
    hp: 150,
    atk: 14,
    cd: 3.0,
    tribes: ['Mage'],
    all: 1,
    txt: () => 'Attacks strike every enemy unit at once.',
  },
  // Elves (grow = [attack, health] gained after each battle)
  scout: {
    name: 'Grove Scout',
    f: 'E',
    cost: 1,
    size: 1,
    flat: 8,
    hp: 44,
    atk: 7,
    cd: 1.8,
    tribes: ['Grove'],
    grow: [1, 3],
    txt: () => 'A sturdy opener.',
  },
  sunaco: {
    name: 'Sun Acolyte',
    f: 'E',
    cost: 1,
    size: 1,
    flat: 8,
    hp: 42,
    atk: 6,
    cd: 2.0,
    tribes: ['Sun'],
    grow: [0, 3],
    txt: (m) => `Adjacent allies +${pct(0.15 * aur(m))} attack. Does not stack with another Sun Acolyte.`,
    onStart: (B, u) =>
      adj(B, u).forEach((a) => {
        const v = 0.15 * aur(u.m),
          o = aura(a, 'sunaco', v);
        if (o != null) a.atk *= (1 + v) / (1 + o);
      }),
  },
  drowblade: {
    name: 'Drow Blade',
    f: 'E',
    cost: 1,
    size: 1,
    flat: 8,
    hp: 36,
    atk: 10,
    cd: 1.5,
    tribes: ['Drow'],
    grow: [1, 1],
    txt: () => 'Fast, fragile striker.',
  },
  altar: {
    name: 'Dark Altar',
    f: 'E',
    cost: 3,
    size: 1,
    hp: 110,
    atk: 0,
    cd: 9,
    tribes: ['Drow', 'Building'],
    building: 1,
    lend: 0.5,
    txt: () =>
      'Building. Counts as a Drow. Adjacent allies that are not Drow gain half of your Drow bonus. Does not stack with another altar.',
  },
  sentinel: {
    name: 'Moon Sentinel',
    f: 'E',
    cost: 2,
    size: 1,
    hp: 95,
    atk: 8,
    cd: 2.2,
    tribes: ['Moon'],
    grow: [0, 6],
    txt: (m) => `Adjacent allies start with a ${20 * m} shield.`,
    onStart: (B, u) =>
      adj(B, u).forEach((a) => {
        a.shield += 20 * u.m;
      }),
  },
  treant: {
    name: 'Ancient Treant',
    f: 'E',
    cost: 2,
    size: 2,
    hp: 150,
    atk: 10,
    cd: 2.6,
    tribes: ['Grove'],
    grow: [2, 12],
    txt: () => 'Slow to start, grows quickly.',
  },
  moonwell: {
    name: 'Moonwell',
    f: 'E',
    cost: 2,
    size: 1,
    hp: 70,
    atk: 0,
    cd: 9,
    tribes: ['Moon', 'Building'],
    building: 1,
    every: 3,
    txt: (m) => `Building. Every 3s heals adjacent allies for ${8 * m}.`,
    tick: (B, u) => adj(B, u).forEach((a) => heal(B, a, 8 * u.m)),
  },
  sunspire: {
    name: 'Sunspire',
    f: 'E',
    cost: 3,
    size: 2,
    hp: 120,
    atk: 0,
    cd: 9,
    tribes: ['Sun', 'Building'],
    building: 1,
    txt: (m) => `Building. All allies attack ${pct(0.15 * aur(m))} faster. Does not stack with another Sunspire.`,
    onStart: (B, u) =>
      friends(B, u.side).forEach((a) => {
        const v = 0.15 * aur(u.m),
          o = aura(a, 'sunspire', v);
        if (o != null) a.haste += v - o;
      }),
  },
  assassin: {
    name: 'Drow Assassin',
    f: 'E',
    cost: 3,
    size: 1,
    hp: 75,
    atk: 24,
    cd: 1.6,
    tribes: ['Drow'],
    grow: [3, 3],
    opener: 2,
    txt: () => 'Its first attack each battle deals double damage. That strike cannot crit.',
  },
  priestess: {
    name: 'Moon Priestess',
    f: 'E',
    cost: 3,
    size: 1,
    hp: 95,
    atk: 10,
    cd: 2.2,
    tribes: ['Moon'],
    grow: [1, 4],
    mentor: [2, 6],
    txt: (m) => `After each battle, adjacent allies gain an extra +${2 * m} attack and +${6 * m} health.`,
  },
  sunchamp: {
    name: 'Sun Champion',
    f: 'E',
    cost: 4,
    size: 2,
    hp: 240,
    atk: 22,
    cd: 2.2,
    tribes: ['Sun'],
    grow: [3, 10],
    txt: () => 'Gains 10% attack every time it attacks.',
    after: (B, u) => {
      u.atk += u.baseAtk * 0.1;
    },
  },
  matriarch: {
    name: 'Drow Matriarch',
    f: 'E',
    cost: 4,
    size: 1,
    hp: 160,
    atk: 26,
    cd: 1.9,
    tribes: ['Drow'],
    grow: [2, 6],
    txt: () => 'Attacks weaken the target by 15% attack.',
    onHit: (B, u, t) => weaken(t, 0.15),
  },
  worldtree: {
    name: 'World Tree',
    f: 'E',
    cost: 5,
    size: 3,
    hp: 350,
    atk: 0,
    cd: 9,
    tribes: ['Grove', 'Building'],
    building: 1,
    every: 3,
    doubleGrow: 1,
    txt: (m) => `Building. Every 3s heals all allies for ${6 * m}. Allies grow 50% more after battle.`,
    tick: (B, u) => friends(B, u.side).forEach((a) => heal(B, a, 6 * u.m)),
  },
  // Undead
  skeleton: {
    name: 'Skeleton',
    f: 'U',
    cost: 1,
    size: 1,
    hp: 34,
    atk: 7,
    cd: 1.8,
    tribes: ['Reborn'],
    lives: 1,
    txt: () => 'Rises once after dying, even without the Reborn bonus.',
  },
  ghoul: {
    name: 'Ghoul',
    f: 'U',
    cost: 1,
    size: 1,
    hp: 48,
    atk: 5,
    cd: 2.0,
    tribes: ['Blight'],
    txt: () => 'On death: applies 3 Rot to the enemy in front.',
    onDeath: (B, u) => addRot(B, front(B, u), 3, 2 * u.m),
  },
  gravedigger: {
    name: 'Gravedigger',
    f: 'U',
    cost: 1,
    size: 1,
    hp: 52,
    atk: 5,
    cd: 2.4,
    tribes: ['Necromancer'],
    every: 4,
    txt: () =>
      'Starts each battle with a Bone Minion and raises another every 4s. With no room, an existing minion grows instead, or the new one waits for a slot.',
    onStart: (B, u) => summon(B, u.side, 'minion', u.m, u.slot, u),
    tick: (B, u) => summon(B, u.side, 'minion', u.m, u.slot, u),
  },
  initiate: {
    name: 'Cult Initiate',
    f: 'U',
    cost: 1,
    size: 1,
    hp: 30,
    atk: 7,
    cd: 2.0,
    tribes: ['Cultist'],
    txt: () => 'On death: an Imp takes its place.',
    onDeath: (B, u) => summon(B, u.side, 'imp', u.m, u.slot, u),
  },
  plague: {
    name: 'Plague Bearer',
    f: 'U',
    cost: 2,
    size: 1,
    hp: 75,
    atk: 8,
    cd: 2.0,
    tribes: ['Blight'],
    txt: (m) => `Attacks apply 1 Rot. On death: ${12 * m} damage to all enemy units.`,
    onHit: (B, u, t) => addRot(B, t, 1, 2 * u.m),
    onDeath: (B, u) => foes(B, u.side).forEach((t) => dmg(B, t, 12 * u.m, { redir: 1 })),
  },
  necromancer: {
    name: 'Necromancer',
    f: 'U',
    cost: 2,
    size: 1,
    hp: 88,
    atk: 8,
    cd: 2.4,
    tribes: ['Necromancer'],
    txt: () => 'Starts each battle with a Bone Minion. When an ally dies, raises a Bone Minion in its place.',
    onStart: (B, u) => summon(B, u.side, 'minion', u.m, u.slot, u),
    onAllyDeath: (B, u, dead) => {
      if (!dead.summoned) summon(B, u.side, 'minion', u.m, dead.slot, u);
    },
  },
  bloodcultist: {
    name: 'Blood Cultist',
    f: 'U',
    cost: 2,
    size: 1,
    hp: 60,
    atk: 8,
    cd: 2.2,
    tribes: ['Cultist'],
    every: 6,
    txt: () => 'Every 6s sacrifices your weakest other unit and summons a Demon.',
    tick: (B, u) => {
      const v = friends(B, u.side)
        .filter((x) => x !== u && !x.tribes.includes('Demon') && !x.d.big)
        .sort((a, b) => a.hp - b.hp)[0];
      if (!v) return;
      const s = v.slot;
      die(B, v);
      summon(B, u.side, 'demon', u.m, s, u);
    },
  },
  banshee: {
    name: 'Banshee',
    f: 'U',
    cost: 3,
    size: 1,
    hp: 65,
    atk: 9,
    cd: 2.2,
    tribes: ['Blight'],
    txt: (m) =>
      `Battle start: applies ${Math.round(2 * aur(m))} Rot to every enemy. Does not stack with another Banshee.`,
    onStart: (B, u) =>
      foes(B, u.side).forEach((t) => {
        const n = Math.round(2 * aur(u.m)),
          o = aura(t, 'banshee', n);
        if (o != null) addRot(B, t, n - o, 2 * u.m);
      }),
  },
  revenant: {
    name: 'Revenant',
    f: 'U',
    cost: 2,
    size: 1,
    hp: 80,
    atk: 9,
    cd: 2.0,
    tribes: ['Reborn'],
    lives: 1,
    txt: () => 'Rises once on its own. Each time it rises, it gains 50% attack.',
    onRevive: (B, u) => {
      u.atk += u.baseAtk * 0.5;
    },
  },
  deathknight: {
    name: 'Death Knight',
    f: 'U',
    cost: 4,
    size: 1,
    hp: 230,
    atk: 22,
    cd: 2.3,
    tribes: ['Reborn'],
    big: 1,
    txt: () => 'When it rises, it returns at full health and all allies gain 15% attack.',
    onRevive: (B, u) => {
      u.hp = u.maxhp;
      friends(B, u.side).forEach((a) => {
        a.atk += a.baseAtk * 0.15;
      });
    },
  },
  plaguelord: {
    name: 'Plaguelord',
    f: 'U',
    cost: 5,
    size: 2,
    hp: 240,
    atk: 25,
    cd: 2.4,
    tribes: ['Blight'],
    big: 1,
    splash: 1,
    txt: () => 'Attacks hit the target and its neighbours, applying 2 Rot to each.',
    onHit: (B, u, t) => addRot(B, t, 2, 2 * u.m),
  },
  colossus: {
    name: 'Bone Colossus',
    f: 'U',
    cost: 3,
    size: 2,
    hp: 210,
    atk: 19,
    cd: 2.8,
    tribes: ['Reborn'],
    big: 1,
    txt: () => 'On death: breaks into two Bone Warriors.',
    onDeath: (B, u) => {
      summon(B, u.side, 'warrior', u.m, u.slot, u);
      summon(B, u.side, 'warrior', u.m, u.slot + 1, u);
    },
  },
  lich: {
    name: 'Lich',
    f: 'U',
    cost: 4,
    size: 2,
    hp: 190,
    atk: 20,
    cd: 2.6,
    tribes: ['Necromancer'],
    aura: 1,
    big: 1,
    every: 6,
    counts: 2,
    txt: () => 'Counts as 2 Necromancers. Your summons have +50% stats. Every 6s raises two Bone Minions.',
    tick: (B, u) => {
      summon(B, u.side, 'minion', u.m, u.slot, u);
      summon(B, u.side, 'minion', u.m, u.slot, u);
    },
  },
  pitlord: {
    name: 'Pit Summoner',
    f: 'U',
    cost: 4,
    size: 1,
    hp: 110,
    atk: 11,
    cd: 2.2,
    tribes: ['Cultist'],
    big: 1,
    txt: (m) =>
      `Battle start: summons a Demon into each adjacent empty slot, or absorbs its strength if the slot is taken. Gains ${3 * m} attack when an ally dies.`,
    onStart: (B, u) => {
      for (const s of [u.slot - 1, u.slot + 1]) {
        if (
          s >= 0 &&
          s < SLOTS &&
          B.open[u.side][s] &&
          !friends(B, u.side).some((x) => x.slot <= s && x.slot + x.size > s)
        )
          summon(B, u.side, 'demon', u.m, s, u);
        else {
          u.maxhp += 70 * u.m;
          u.atk += 15 * u.m;
        }
      }
    },
    onAllyDeath: (B, u) => {
      u.atk += 3 * u.m;
    },
  },
  herald: {
    name: "Archfiend's Herald",
    f: 'U',
    cost: 5,
    size: 2,
    hp: 260,
    atk: 33,
    cd: 2.4,
    tribes: ['Cultist'],
    big: 1,
    txt: () => 'After three of your units have died, summons an Archdemon.',
    onAllyDeath: (B, u) => {
      if (!u.done && B.deaths[u.side] >= 3) {
        if (summon(B, u.side, 'archdemon', u.m, u.slot, u)) u.done = 1;
      }
    },
  },
  // --- second wave ---
  halberdier: {
    name: 'Halberdier',
    f: 'H',
    cost: 2,
    size: 1,
    hp: 120,
    atk: 10,
    cd: 2.2,
    tribes: ['Tank'],
    reach: 0.5,
    txt: () => 'Its attacks also hit the enemies diagonal to it for 50%.',
  },
  duelist: {
    name: 'Duelist',
    f: 'H',
    cost: 3,
    size: 1,
    hp: 100,
    atk: 22,
    cd: 1.6,
    tribes: ['DPS'],
    txt: () => '+40% attack when it starts the battle with no ally beside it.',
    onStart: (B, u) => {
      if (!adj(B, u).length) u.atk *= 1.4;
    },
  },
  bishop: {
    name: 'Bishop',
    f: 'H',
    cost: 4,
    size: 1,
    hp: 150,
    atk: 8,
    cd: 2.4,
    tribes: ['Cleric'],
    every: 5,
    txt: (m) => `Every 5s shields the weakest ally for ${40 * m} and cleanses its Rot, burn and weakness.`,
    tick: (B, u) => {
      const t = weakest(friends(B, u.side));
      if (t) {
        t.shield += 40 * u.m;
        t.rot = 0;
        t.burnT = 0;
        t.weak = 0;
        B.ev.push({ t: 'heal', b: t.bid, v: 40 * u.m });
      }
    },
  },
  stormmage: {
    name: 'Storm Mage',
    f: 'H',
    cost: 4,
    size: 1,
    hp: 110,
    atk: 26,
    cd: 2.8,
    tribes: ['Mage'],
    txt: () => 'Each attack also arcs to two random enemies for 60%.',
    after: (B, u) => {
      const fs = foes(B, u.side);
      for (let i = 0; i < 2 && fs.length; i++)
        dmg(B, fs.splice(Math.floor(random() * fs.length), 1)[0], effAtk(u) * 0.6);
    },
  },
  champion: {
    name: 'Champion',
    f: 'H',
    cost: 5,
    size: 1,
    hp: 240,
    atk: 38,
    cd: 1.8,
    tribes: ['DPS'],
    txt: () => 'Gains 20% attack each time an enemy dies. Summons do not count.',
    onFoeDeath: (B, u, dead) => {
      if (!dead.summoned) u.atk += u.baseAtk * 0.2;
    },
  },
  venom: {
    name: 'Venom Stalker',
    f: 'E',
    cost: 2,
    size: 1,
    hp: 55,
    atk: 13,
    cd: 1.7,
    tribes: ['Drow'],
    grow: [1, 2],
    txt: () => 'Deals 50% more damage to enemies below half health.',
    vs: (B, u, t, v) => (t.hp < t.maxhp / 2 ? v * 1.5 : v),
  },
  briar: {
    name: 'Briar Warden',
    f: 'E',
    cost: 3,
    size: 1,
    hp: 130,
    atk: 12,
    cd: 2.2,
    tribes: ['Grove'],
    grow: [1, 8],
    thorns: 6,
    txt: (m) => `Thorns: enemies that attack it take ${6 * m} damage.`,
  },
  sunfire: {
    name: 'Sunfire Archer',
    f: 'E',
    cost: 3,
    size: 1,
    hp: 80,
    atk: 20,
    cd: 2.0,
    tribes: ['Sun'],
    grow: [2, 3],
    burn: 4,
    txt: (m) => `Attacks burn for ${4 * m}/s.`,
  },
  archon: {
    name: 'Moon Archon',
    f: 'E',
    cost: 4,
    size: 2,
    hp: 260,
    atk: 20,
    cd: 2.4,
    tribes: ['Moon'],
    grow: [2, 8],
    every: 5,
    txt: (m) => `Every 5s gives all allies a ${25 * m} shield.`,
    tick: (B, u) =>
      friends(B, u.side).forEach((a) => {
        a.shield += 25 * u.m;
      }),
  },
  archdruid: {
    name: 'Archdruid',
    f: 'E',
    cost: 5,
    size: 1,
    hp: 220,
    atk: 18,
    cd: 2.6,
    tribes: ['Grove'],
    grow: [1, 6],
    bless: [4, 12],
    txt: (m) => `After each battle, a random ally permanently gains +${4 * m} attack and +${12 * m} health.`,
  },
  boneshaper: {
    name: 'Bone Shaper',
    f: 'U',
    cost: 3,
    size: 1,
    hp: 144,
    atk: 8,
    cd: 2.2,
    tribes: ['Necromancer'],
    every: 5,
    txt: (m) => `Every 5s your summons gain 20% attack and heal ${10 * m}.`,
    tick: (B, u) =>
      friends(B, u.side)
        .filter((a) => a.summoned)
        .forEach((a) => {
          a.atk += a.baseAtk * 0.2;
          heal(B, a, 10 * u.m);
        }),
  },
  soulreaper: {
    name: 'Soul Reaper',
    f: 'U',
    cost: 3,
    size: 1,
    hp: 100,
    atk: 16,
    cd: 2.0,
    tribes: ['Cultist'],
    txt: (m) => `Whenever a unit dies, heals 30% of its health and gains ${4 * m} attack. Summons do not count.`,
    onAllyDeath: (B, u, dead) => {
      if (dead.summoned) return;
      heal(B, u, u.maxhp * 0.3);
      u.atk += 4 * u.m;
    },
    onFoeDeath: (B, u, dead) => {
      if (dead.summoned) return;
      heal(B, u, u.maxhp * 0.3);
      u.atk += 4 * u.m;
    },
  },
  collector: {
    name: 'Bone Collector',
    f: 'U',
    cost: 2,
    size: 1,
    hp: 85,
    atk: 8,
    cd: 2.2,
    tribes: ['Necromancer'],
    txt: (m) => `Whenever one of your summons dies, your strongest summon gains ${4 * m} attack and ${14 * m} health.`,
    onAllyDeath: (B, u, dead) => {
      if (!dead.summoned) return;
      const t = friends(B, u.side)
        .filter((a) => a.summoned)
        .sort((a, b) => b.atk - a.atk)[0];
      if (!t) return;
      const a = 4 * u.m,
        h = 14 * u.m;
      t.atk += a;
      t.baseAtk += a;
      t.maxhp += h;
      t.hp += h;
      B.ev.push({ t: 'buff', b: t.bid, a, h });
    },
  },
  rothound: {
    name: 'Rot Hound',
    f: 'U',
    cost: 3,
    size: 1,
    hp: 110,
    atk: 14,
    cd: 1.5,
    tribes: ['Blight'],
    txt: () => 'Deals 15% more damage for each Rot stack on its target.',
    vs: (B, u, t, v) => v * (1 + 0.15 * t.rot),
  },
  // Neutral monsters and bosses (never in the shop)
  wolf: {
    name: 'Dire Wolf',
    f: 'N',
    token: 1,
    cost: 0,
    size: 1,
    hp: 40,
    atk: 9,
    cd: 1.4,
    tribes: ['Beast'],
    txt: () => 'Fast attacker.',
  },
  bandit: {
    name: 'Bandit',
    f: 'N',
    token: 1,
    cost: 0,
    size: 1,
    hp: 60,
    atk: 10,
    cd: 1.9,
    tribes: ['Beast'],
    crit: 0.25,
    txt: () => '25% chance to crit.',
  },
  shaman: {
    name: 'Hedge Shaman',
    f: 'N',
    token: 1,
    cost: 0,
    size: 1,
    hp: 45,
    atk: 4,
    cd: 2.2,
    tribes: ['Beast'],
    every: 4,
    txt: () => 'Every 4s heals the weakest ally.',
    tick: (B, u) => {
      const t = weakest(friends(B, u.side));
      if (t) heal(B, t, 14 * (u.o.scale || 1));
    },
  },
  ogre: {
    name: 'Ogre',
    f: 'N',
    token: 1,
    cost: 0,
    size: 2,
    hp: 180,
    atk: 16,
    cd: 2.6,
    tribes: ['Beast'],
    txt: () => 'Big and slow.',
  },
  ogrelord: {
    name: 'Ogre Warlord',
    f: 'N',
    token: 1,
    boss: 1,
    cost: 0,
    size: 3,
    hp: 1100,
    atk: 38,
    cd: 2.4,
    tribes: ['Boss'],
    noSplit: 1,
    txt: () =>
      'Boss. Hits every enemy opposite it for full damage and gains 5% attack with each swing. A quarter of each blow carries through to your hero.',
    after: (B, u) => {
      u.atk += u.baseAtk * 0.05;
    },
  },
  bonedragon: {
    name: 'Bone Dragon',
    f: 'N',
    token: 1,
    boss: 1,
    cost: 0,
    size: 3,
    hp: 2800,
    atk: 34,
    cd: 3.0,
    tribes: ['Boss'],
    all: 1,
    burn: 5,
    txt: () =>
      'Boss. Its breath hits every enemy unit and sets them burning. A quarter of it carries through to your hero.',
  },
  titan: {
    name: 'Stone Titan',
    f: 'N',
    token: 1,
    boss: 1,
    cost: 0,
    size: 3,
    hp: 4400,
    atk: 85,
    cd: 2.8,
    tribes: ['Boss'],
    noSplit: 1,
    every: 6,
    txt: () =>
      'Boss. Hits every enemy opposite it for full damage. Every 6s it gains a shield worth 10% of its health. A quarter of each blow carries through to your hero.',
    tick: (B, u) => {
      u.shield += u.maxhp * 0.1;
    },
  },
  // Tokens (never in the shop)
  minion: {
    name: 'Bone Minion',
    f: 'U',
    token: 1,
    cost: 0,
    size: 1,
    hp: 24,
    atk: 6,
    cd: 1.8,
    tribes: ['Minion'],
    txt: () => 'Summoned.',
  },
  warrior: {
    name: 'Bone Warrior',
    f: 'U',
    token: 1,
    cost: 0,
    size: 1,
    hp: 45,
    atk: 10,
    cd: 2.0,
    tribes: ['Minion'],
    txt: () => 'Summoned.',
  },
  imp: {
    name: 'Imp',
    f: 'U',
    token: 1,
    cost: 0,
    size: 1,
    hp: 30,
    atk: 9,
    cd: 1.5,
    tribes: ['Demon'],
    txt: () => 'Summoned.',
  },
  demon: {
    name: 'Demon',
    f: 'U',
    token: 1,
    cost: 0,
    size: 1,
    hp: 70,
    atk: 15,
    cd: 2.0,
    tribes: ['Demon'],
    txt: () => 'Summoned.',
  },
  archdemon: {
    name: 'Archdemon',
    f: 'U',
    token: 1,
    cost: 0,
    size: 2,
    hp: 320,
    atk: 55,
    cd: 2.2,
    tribes: ['Demon'],
    txt: () => 'Summoned.',
  },
};
export const U: Record<string, UnitDef> = {};
for (const k in DEFS) U[k] = { ...DEFS[k], id: k };
export const POOL: Record<string, Record<number, string[]>> = {}; // faction -> cost -> [ids]
for (const k in U) {
  const d = U[k];
  if (d.token) continue;
  ((POOL[d.f] = POOL[d.f] || {})[d.cost] = POOL[d.f][d.cost] || []).push(k);
}
