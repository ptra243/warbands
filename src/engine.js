/* Warband engine: data, battle sim, shop and run logic. No DOM. */
(function (root) {
'use strict';
const SLOTS = 10, BENCH = 6, SUDDEN = 35, MAXWINS = 10, LIVES = 5;
const ODDS = [[80,20,0,0,0],[70,27,3,0,0],[55,33,12,0,0],[42,33,20,5,0],[33,32,25,9,1],[24,30,30,13,3],[17,25,33,20,5],[14,20,30,28,8],[10,15,27,33,15]];
const XPNEED = [2,2,4,6,10,14,24,36];
const ORDER = [4, 5, 3, 6, 2, 7, 1, 8, 0, 9]; // slots open from the centre outward
const openCount = level => Math.min(SLOTS, level + 3);
const openArr = n => { const a = Array(SLOTS).fill(false); ORDER.slice(0, n == null ? SLOTS : n).forEach(i => { a[i] = true; }); return a; };
const LOCK = { lock: true };
const r = v => Math.round(v);
const pct = v => Math.round(v * 100) + '%';

const FACTIONS = {
  H: { name: 'Humans', blurb: 'A balanced party. Tanks guard, clerics heal, mages burn the line and archers pick targets. Units carry items that add stats or a second class.' },
  E: { name: 'Elves', blurb: 'Strong individuals that buff their neighbours and grow permanently after every battle. Buildings empower the whole board.' },
  N: { name: 'Monsters', blurb: '' },
  U: { name: 'Undead', blurb: 'Fill empty slots with summons, profit when your own units die, and weaken whatever stands opposite.' }
};

const TRIBES = {
  Tank:   { f: 'H', th: [2,4,6], text: ['Tanks +20% health', 'Tanks +40% health', 'Tanks +70% health'] },
  DPS:    { f: 'H', th: [2,4,6], text: ['DPS +15% attack, 10% crit', 'DPS +30% attack, 20% crit', 'DPS +55% attack, 35% crit'] },
  Mage:   { f: 'H', th: [2,4,6], text: ['Mages attack 15% faster and burn', 'Mages attack 30% faster and burn', 'Mages attack 50% faster, stronger burn'] },
  Cleric: { f: 'H', th: [2,4,6], text: ['Allies regenerate 1%/s. Clerics smite every 4s', 'Allies regenerate 1.5%/s. Clerics smite every 4s', 'Allies regenerate 2.5%/s. Stronger smite'] },
  Party:  { f: 'H', th: [4], text: ['One of each class: all allies +15% health and attack'] },
  Grove:   { f: 'E', th: [2,4], text: ['Allies regenerate 1% health/s', 'Allies regenerate 2.5% health/s'] },
  Sun:    { f: 'E', th: [2,4], text: ['Allies +15% attack', 'Allies +35% attack'] },
  Drow:   { f: 'E', th: [2,4], note: 'Flanking: extra damage against any enemy that is not attacking that unit. Put Drow opposite an empty slot to strike sideways.', text: ['Drow 20% crit, 10% faster, +25% flanking damage', 'Drow 45% crit, 25% faster, +50% flanking damage'] },
  Moon:   { f: 'E', th: [2,4], text: ['Allies start with a 10% health shield', 'Allies start with a 25% health shield'] },
  Reborn: { f: 'U', th: [2,4], text: ['Reborn rise once at 40% health', 'Reborn rise once at full health'] },
  Blight: { f: 'U', th: [2,4], note: 'Rot stacks up to 5. Each stack lowers attack by 6% and deals damage every second. A stack fades every 12s, or every 6s once the unit that applied it is dead.', text: ['When a rotting enemy dies, half its Rot spreads to its neighbours', 'All of a dying enemy\'s Rot spreads to its neighbours. Rot stacks up to 6'] },
  Necromancer: { f: 'U', th: [2,4], text: ['Summons +30% stats and soak 25% of the damage dealt to their summoner', 'Summons +80% stats and soak 50% of the damage dealt to their summoner. Start with 1 Bone Minion that guards all your Necromancers'] },
  Cultist: { f: 'U', th: [2,4], text: ['When an ally dies, Cultists and Demons gain 10% attack', 'When an ally dies, Cultists and Demons gain 20% attack'] },
  Beast: { f: 'N', th: [], text: [] }, Boss: { f: 'N', th: [], text: [] },
  Demon: { f: 'U', th: [], text: [] }, Minion: { f: 'U', th: [], text: [] }, Building: { f: 'E', th: [], text: [] }
};

const ITEMS = {
  sword:  { name: 'Iron Sword', cost: 2, atk: .4, text: '+40% attack.' },
  shield: { name: 'Tower Shield', cost: 2, hp: .4, cls: 'Tank', text: '+40% health. Gains the Tank class.' },
  tome:   { name: 'Spellbook', cost: 3, cls: 'Mage', splash: .5, text: 'Gains the Mage class. Attacks splash to neighbours for 50%.' },
  symbol: { name: 'Holy Symbol', cost: 3, hp: .2, cls: 'Cleric', healHit: .4, text: '+20% health. Gains the Cleric class. Each attack heals the weakest ally.' },
  bow:    { name: 'Longbow', cost: 3, haste: .2, cls: 'DPS', text: 'Attacks 20% faster. Gains the DPS class.' }
};

const BASE_ITEMS = Object.keys(ITEMS);
Object.assign(ITEMS, {
  'sword+':  { base: 'sword', name: 'Fine Iron Sword', cost: 6, atk: .6, text: '+60% attack.' },
  'shield+': { base: 'shield', name: 'Fine Tower Shield', cost: 6, hp: .6, cls: 'Tank', text: '+60% health. Gains the Tank class.' },
  'tome+':   { base: 'tome', name: 'Fine Spellbook', cost: 9, cls: 'Mage', splash: .75, text: 'Gains the Mage class. Attacks splash to neighbours for 75%.' },
  'symbol+': { base: 'symbol', name: 'Fine Holy Symbol', cost: 9, hp: .3, cls: 'Cleric', healHit: .6, text: '+30% health. Gains the Cleric class. Each attack heals the weakest ally, for half as much again.' },
  'bow+':    { base: 'bow', name: 'Fine Longbow', cost: 9, haste: .3, cls: 'DPS', text: 'Attacks 30% faster. Gains the DPS class.' }
});
/* ---- battle helpers ---- */
const foes = (B, side) => B.units.filter(x => x.alive && x.side !== side);
const friends = (B, side) => B.units.filter(x => x.alive && x.side === side);
/* Who a unit attacks: everything opposite it; failing that, the weaker enemy one slot to either side; a side with two or fewer units left reaches the nearest enemy anywhere; failing that, the hero. */
function aim(B, u) {
  if (u.d.snipe) { const w = weakest(foes(B, u.side)); return { ts: w ? [w] : [], diag: false }; }
  let ts = fronts(B, u);
  if (ts.length) return { ts: u.size === 1 ? [ts[0]] : ts, diag: false };
  const l = u.slot - 1, r = u.slot + u.size;
  const c = B.units.filter(x => x.alive && x.side !== u.side && ((x.slot <= l && x.slot + x.size > l) || (x.slot <= r && x.slot + x.size > r)));
  if (c.length) { c.sort((p, q) => p.hp - q.hp); return { ts: [c[0]], diag: true }; }
  if (friends(B, u.side).length <= 2 || B.units.some(x => x.alive && x.side !== u.side && x.d.boss)) { // boss fight, or a side down to its last two units: go for the nearest enemy at any distance
    const dist = x => Math.max(0, x.slot - (u.slot + u.size - 1), u.slot - (x.slot + x.size - 1));
    const n = foes(B, u.side).sort((p, q) => dist(p) - dist(q) || p.hp - q.hp)[0];
    if (n) return { ts: [n], diag: true };
  }
  return { ts: [], diag: false };
}
const front = (B, u) => aim(B, u).ts[0] || null;
const fronts = (B, u) => B.units.filter(x => x.alive && x.side !== u.side && x.slot < u.slot + u.size && x.slot + x.size > u.slot);
const adj = (B, u) => B.units.filter(x => x.alive && x !== u && x.side === u.side && (x.slot + x.size === u.slot || x.slot === u.slot + u.size));
const weakest = list => list.reduce((a, b) => (!a || b.hp / b.maxhp < a.hp / a.maxhp ? b : a), null);
function heal(B, t, v) { if (!t || !t.alive) return; const h0 = t.hp; t.hp = Math.min(t.maxhp, t.hp + v); if (B.src) B.src.healed += t.hp - h0; B.ev.push({ t: 'heal', b: t.bid, v }); }
function hitHero(B, side, v) { if (B.rel[side].aegis) v *= .8; if (!B.units.some(x => x.alive && x.side === side)) v *= 3; /* rout: an undefended hero takes triple damage */ B.hero[side].hp -= v; if (B.src) B.src.heroDmg += v; B.ev.push({ t: 'hero', side, v }); }
function weaken(t, v) { if (t) t.weak = Math.min(.6, t.weak + v); }
function addRot(B, t, n, dps) { if (!t || !t.alive) return; const cap = B.syn[1 - t.side].Blight === 2 ? 6 : 5; t.rot = Math.min(cap, t.rot + n); t.rotDps = Math.max(t.rotDps, dps); t.rotBy = B.src && B.src.side !== t.side ? B.src : t.rotBy || null; t.rotT = 0; B.ev.push({ t: 'rot', b: t.bid }); }
/* auras scale 1x / 1.5x / 2x by tier, and identical auras do not stack: only the strongest applies */
const aur = m => m === 1 ? 1 : m === 2 ? 1.5 : 2;
function aura(a, key, val) { a.au = a.au || {}; const old = a.au[key] || 0; if (val <= old) return null; a.au[key] = val; return old; }
const ROTFADE = 12;
const DROW = [[0, 0, 0], [.2, .1, .25], [.45, .25, .5]]; // crit, attack speed, flanking damage by Drow level
const effAtk = u => u.atk * (1 - Math.min(.6, u.weak + .06 * u.rot));
function dmg(B, t, v, o) {
  if (!t.alive || v <= 0) return;
  o = o || {};
  if (!o.redir) { const g = adj(B, t).find(x => x.d.guard); if (g) { dmg(B, g, v * .3, { redir: 1 }); v *= .7; } }
  const nl = B.syn[t.side].Necromancer;
  if (nl && !o.soak) { // summons soak part of the damage dealt to their summoner
    const ss = B.units.filter(x => x.alive && x !== t && (x.owner === t || (x.guards && x.side === t.side && !t.summoned && t.tribes.includes(x.guards))));
    if (ss.length) { const share = v * (nl === 2 ? .5 : .25); v -= share; for (const x of ss) dmg(B, x, share / ss.length, { redir: 1, soak: 1 }); }
  }
  if (B.src && B.src.side !== t.side) B.src.dealt += v;
  t.taken += v;
  if (t.shield > 0) { const a = Math.min(t.shield, v); t.shield -= a; v -= a; }
  t.hp -= v;
  B.ev.push({ t: 'hit', b: t.bid, v, crit: o.crit, flank: o.flank });
  if (t.d.thorns && B.src && B.src.alive && B.src.side !== t.side && !o.redir && !o.soak) { const a = B.src; B.src = t; dmg(B, a, t.d.thorns * t.m, { redir: 1, soak: 1 }); B.src = a; }
  if (t.hp <= 0) die(B, t);
}
function die(B, u) {
  if (!u.alive) return;
  if (u.lives > 0) { u.lives--; u.hp = u.maxhp * u.revFrac; u.weak = 0; u.burnT = 0; u.rot = 0; B.ev.push({ t: 'revive', b: u.bid }); if (u.d.onRevive) u.d.onRevive(B, u); return; }
  u.alive = false; u.hp = 0; u.died = Math.round(B.time * 10) / 10; B.deaths[u.side]++; B.ev.push({ t: 'die', b: u.bid });
  if (u.d.onDeath) { const ps = B.src; B.src = u; u.d.onDeath(B, u); B.src = ps; }
  const bl = B.syn[1 - u.side].Blight;
  if (bl && u.rot > 0) for (const a of adj(B, u)) addRot(B, a, bl === 2 ? u.rot : Math.ceil(u.rot / 2), u.rotDps);
  if (!u.summoned && B.lead[u.side] === 'bloodpriest') for (const a of B.units) if (a.alive && a.side === u.side) a.atk += a.baseAtk * .08;
  const ps0 = B.src;
  for (const a of B.units) if (a.alive && a.side !== u.side && a.d.onFoeDeath) { B.src = a; a.d.onFoeDeath(B, a, u); }
  const c = B.syn[u.side].Cultist;
  for (const a of B.units) if (a.alive && a.side === u.side) {
    if (a.d.onAllyDeath) { B.src = a; a.d.onAllyDeath(B, a, u); }
    if (c && (a.tribes.includes('Cultist') || a.tribes.includes('Demon'))) a.atk += a.baseAtk * (c === 2 ? .2 : .1);
  }
  B.src = ps0;
  release(B, u.side, u.slot);
}
function freeSlot(B, side, size, pref) {
  const occ = Array(SLOTS).fill(0);
  for (const x of B.units) if (x.alive && x.side === side) for (let i = 0; i < x.size; i++) occ[x.slot + i] = 1;
  for (let i = 0; i < SLOTS; i++) if (!B.open[side][i]) occ[i] = 1;
  let best = -1, bd = 99;
  for (let s = 0; s + size <= SLOTS; s++) {
    let ok = 1; for (let i = 0; i < size; i++) if (occ[s + i]) ok = 0;
    if (ok) { const d = Math.abs(s - (pref == null ? 4 : pref)); if (d < bd) { bd = d; best = s; } }
  }
  return best;
}
function summon(B, side, id, m, pref, by, guards) {
  const d = U[id]; let k = 1; const n = B.syn[side].Necromancer;
  if (n) k += n === 2 ? .8 : .3;
  if (B.units.some(x => x.alive && x.side === side && x.d.aura)) k += .5;
  if (side === 1) k *= B.mul;
  const s = freeSlot(B, side, d.size, pref);
  if (s < 0) { // board full: fold the new summon into the nearest existing copy
    const at = pref == null ? 4 : pref;
    const t = B.units.filter(x => x.alive && x.side === side && x.summoned && x.d.id === id).sort((a, b) => Math.abs(a.slot - at) - Math.abs(b.slot - at))[0];
    if (!t) { // nowhere to stand and nothing to join: Bone Minions wait and arrive together when a slot opens
      if (id === 'minion') { const w = B.bank[side] || (B.bank[side] = { hp: 0, atk: 0, n: 0, by: by || null, guards: null }); w.hp += d.hp * m * k; w.atk += d.atk * m * k; w.n++; if (guards) w.guards = guards; }
      return null;
    }
    const h = d.hp * m * k, a = d.atk * m * k;
    t.maxhp += h; t.hp += h; t.atk += a; t.baseAtk += a; t.merged = (t.merged || 0) + 1;
    B.ev.push({ t: 'buff', b: t.bid, a, h });
    return t;
  }
  const u = mkBU(B, { id, tier: 1 }, side, s, m);
  u.maxhp *= k; u.atk *= k; u.baseAtk = u.atk; u.hp = u.maxhp; u.summoned = true; u.revFrac = .4; u.owner = by || null; if (guards) u.guards = guards;
  if (B.lead[side] === 'gravecaller') u.shield = u.maxhp * .75;
  B.units.push(u); B.ev.push({ t: 'summon', b: u.bid });
  return u;
}

function release(B, side, pref) {
  const w = B.bank[side]; if (!w) return;
  const s = freeSlot(B, side, 1, pref); if (s < 0) return;
  B.bank[side] = null;
  const u = mkBU(B, { id: 'minion', tier: 1 }, side, s, 1);
  u.maxhp = w.hp; u.hp = w.hp; u.atk = w.atk; u.baseAtk = w.atk; u.summoned = true; u.revFrac = .4; u.owner = w.by && w.by.alive ? w.by : null; u.guards = w.guards; u.waited = w.n; if (w.n > 1) u.merged = w.n - 1;
  if (B.lead[side] === 'gravecaller') u.shield = u.maxhp * .75;
  B.units.push(u); B.ev.push({ t: 'summon', b: u.bid });
}
/* ---- units. m = 1/2/4 for tier 1/2/3 ---- */
const U = {
  // Humans
  footman:  { name: 'Footman', f: 'H', cost: 1, size: 1, hp: 80, atk: 6, cd: 2.0, tribes: ['Tank'], guard: 1, txt: () => 'Guard: takes 30% of the damage dealt to adjacent allies.' },
  archer:   { name: 'Militia Archer', f: 'H', cost: 1, size: 1, hp: 40, atk: 9, cd: 1.7, tribes: ['DPS'], txt: () => 'Every third shot deals double damage.', mod: (B, u, v) => u.n % 3 === 0 ? v * 2 : v },
  apprentice: { name: 'Apprentice', f: 'H', cost: 1, size: 1, hp: 38, atk: 6, cd: 2.2, tribes: ['Mage'], splash: .5, txt: () => 'Attacks also hit enemies beside the target for 50%.' },
  acolyte:  { name: 'Acolyte', f: 'H', cost: 1, size: 1, hp: 44, atk: 4, cd: 2.2, tribes: ['Cleric'], every: 4, txt: m => `Every 4s heals the weakest ally for ${9 * m}.`, tick: (B, u) => heal(B, weakest(friends(B, u.side)), 9 * u.m) },
  knight:   { name: 'Knight', f: 'H', cost: 2, size: 2, hp: 170, atk: 13, cd: 2.4, tribes: ['Tank'], guard: 1, txt: m => `Guard. Starts with a ${30 * m} shield.`, onStart: (B, u) => { u.shield += 30 * u.m; } },
  crossbow: { name: 'Crossbowman', f: 'H', cost: 2, size: 1, hp: 50, atk: 20, cd: 2.3, tribes: ['DPS'], crit: .25, txt: () => '25% chance to crit for double damage.' },
  firemage: { name: 'Fire Mage', f: 'H', cost: 3, size: 1, hp: 60, atk: 10, cd: 2.4, tribes: ['Mage'], splash: 1, burn: 4, txt: m => `Attacks hit neighbours for full damage and burn for ${4 * m}/s.` },
  priest:   { name: 'Priest', f: 'H', cost: 3, size: 1, hp: 70, atk: 5, cd: 2.4, tribes: ['Cleric'], every: 5, txt: m => `Every 5s heals all allies for ${8 * m}.`, tick: (B, u) => friends(B, u.side).forEach(a => heal(B, a, 8 * u.m)) },
  captain:  { name: 'Captain', f: 'H', cost: 3, size: 1, hp: 110, atk: 18, cd: 2.0, tribes: ['DPS'], txt: m => `Adjacent allies attack ${pct(.2 * aur(m))} faster. Does not stack with another Captain.`, onStart: (B, u) => adj(B, u).forEach(a => { const v = .2 * aur(u.m), o = aura(a, 'captain', v); if (o != null) a.haste += v - o; }) },
  sharpshooter: { name: 'Sharpshooter', f: 'H', cost: 4, size: 1, hp: 90, atk: 42, cd: 2.6, tribes: ['DPS'], snipe: 1, txt: () => 'Always shoots the weakest enemy unit, wherever it stands.' },
  paladin:  { name: 'Paladin', f: 'H', cost: 4, size: 2, hp: 300, atk: 21, cd: 2.4, tribes: ['Tank', 'Cleric'], guard: 1, every: 5, txt: m => `Guard. Every 5s heals itself and adjacent allies for ${20 * m}.`, tick: (B, u) => [u, ...adj(B, u)].forEach(a => heal(B, a, 20 * u.m)) },
  archmage: { name: 'Archmage', f: 'H', cost: 5, size: 2, hp: 150, atk: 14, cd: 3.0, tribes: ['Mage'], all: 1, txt: () => 'Attacks strike every enemy unit at once.' },
  // Elves (grow = [attack, health] gained after each battle)
  scout:    { name: 'Grove Scout', f: 'E', cost: 1, size: 1, flat: 8, hp: 44, atk: 7, cd: 1.8, tribes: ['Grove'], grow: [1, 3], txt: () => 'A sturdy opener.' },
  sunaco:   { name: 'Sun Acolyte', f: 'E', cost: 1, size: 1, flat: 8, hp: 42, atk: 6, cd: 2.0, tribes: ['Sun'], grow: [0, 3], txt: m => `Adjacent allies +${pct(.15 * aur(m))} attack. Does not stack with another Sun Acolyte.`, onStart: (B, u) => adj(B, u).forEach(a => { const v = .15 * aur(u.m), o = aura(a, 'sunaco', v); if (o != null) a.atk *= (1 + v) / (1 + o); }) },
  drowblade: { name: 'Drow Blade', f: 'E', cost: 1, size: 1, flat: 8, hp: 36, atk: 10, cd: 1.5, tribes: ['Drow'], grow: [1, 1], txt: () => 'Fast, fragile striker.' },
  altar:    { name: 'Dark Altar', f: 'E', cost: 3, size: 1, hp: 110, atk: 0, cd: 9, tribes: ['Drow', 'Building'], building: 1, lend: .5, txt: () => 'Building. Counts as a Drow. Adjacent allies that are not Drow gain half of your Drow bonus. Does not stack with another altar.' },
  sentinel: { name: 'Moon Sentinel', f: 'E', cost: 2, size: 1, hp: 95, atk: 8, cd: 2.2, tribes: ['Moon'], grow: [0, 6], txt: m => `Adjacent allies start with a ${20 * m} shield.`, onStart: (B, u) => adj(B, u).forEach(a => { a.shield += 20 * u.m; }) },
  treant:   { name: 'Ancient Treant', f: 'E', cost: 2, size: 2, hp: 150, atk: 10, cd: 2.6, tribes: ['Grove'], grow: [2, 12], txt: () => 'Slow to start, grows quickly.' },
  moonwell: { name: 'Moonwell', f: 'E', cost: 2, size: 1, hp: 70, atk: 0, cd: 9, tribes: ['Moon', 'Building'], building: 1, every: 3, txt: m => `Building. Every 3s heals adjacent allies for ${8 * m}.`, tick: (B, u) => adj(B, u).forEach(a => heal(B, a, 8 * u.m)) },
  sunspire: { name: 'Sunspire', f: 'E', cost: 3, size: 2, hp: 120, atk: 0, cd: 9, tribes: ['Sun', 'Building'], building: 1, txt: m => `Building. All allies attack ${pct(.15 * aur(m))} faster. Does not stack with another Sunspire.`, onStart: (B, u) => friends(B, u.side).forEach(a => { const v = .15 * aur(u.m), o = aura(a, 'sunspire', v); if (o != null) a.haste += v - o; }) },
  assassin: { name: 'Drow Assassin', f: 'E', cost: 3, size: 1, hp: 75, atk: 24, cd: 1.6, tribes: ['Drow'], grow: [3, 3], opener: 2, txt: () => 'Its first attack each battle deals double damage. That strike cannot crit.' },
  priestess: { name: 'Moon Priestess', f: 'E', cost: 3, size: 1, hp: 95, atk: 10, cd: 2.2, tribes: ['Moon'], grow: [1, 4], mentor: [2, 6], txt: m => `After each battle, adjacent allies gain an extra +${2 * m} attack and +${6 * m} health.` },
  sunchamp: { name: 'Sun Champion', f: 'E', cost: 4, size: 2, hp: 240, atk: 22, cd: 2.2, tribes: ['Sun'], grow: [3, 10], txt: () => 'Gains 10% attack every time it attacks.', after: (B, u) => { u.atk += u.baseAtk * .1; } },
  matriarch: { name: 'Drow Matriarch', f: 'E', cost: 4, size: 1, hp: 160, atk: 26, cd: 1.9, tribes: ['Drow'], grow: [2, 6], txt: () => 'Attacks weaken the target by 15% attack.', onHit: (B, u, t) => weaken(t, .15) },
  worldtree: { name: 'World Tree', f: 'E', cost: 5, size: 3, hp: 350, atk: 0, cd: 9, tribes: ['Grove', 'Building'], building: 1, every: 3, doubleGrow: 1, txt: m => `Building. Every 3s heals all allies for ${6 * m}. Allies grow 50% more after battle.`, tick: (B, u) => friends(B, u.side).forEach(a => heal(B, a, 6 * u.m)) },
  // Undead
  skeleton: { name: 'Skeleton', f: 'U', cost: 1, size: 1, hp: 34, atk: 7, cd: 1.8, tribes: ['Reborn'], lives: 1, txt: () => 'Rises once after dying, even without the Reborn bonus.' },
  ghoul:    { name: 'Ghoul', f: 'U', cost: 1, size: 1, hp: 48, atk: 5, cd: 2.0, tribes: ['Blight'], txt: () => 'On death: applies 3 Rot to the enemy in front.', onDeath: (B, u) => addRot(B, front(B, u), 3, 2 * u.m) },
  gravedigger: { name: 'Gravedigger', f: 'U', cost: 1, size: 1, hp: 52, atk: 5, cd: 2.4, tribes: ['Necromancer'], every: 4, txt: () => 'Starts each battle with a Bone Minion and raises another every 4s. With no room, an existing minion grows instead, or the new one waits for a slot.', onStart: (B, u) => summon(B, u.side, 'minion', u.m, u.slot, u), tick: (B, u) => summon(B, u.side, 'minion', u.m, u.slot, u) },
  initiate: { name: 'Cult Initiate', f: 'U', cost: 1, size: 1, hp: 30, atk: 7, cd: 2.0, tribes: ['Cultist'], txt: () => 'On death: an Imp takes its place.', onDeath: (B, u) => summon(B, u.side, 'imp', u.m, u.slot, u) },
  plague:   { name: 'Plague Bearer', f: 'U', cost: 2, size: 1, hp: 75, atk: 8, cd: 2.0, tribes: ['Blight'], txt: m => `Attacks apply 1 Rot. On death: ${12 * m} damage to all enemy units.`, onHit: (B, u, t) => addRot(B, t, 1, 2 * u.m), onDeath: (B, u) => foes(B, u.side).forEach(t => dmg(B, t, 12 * u.m, { redir: 1 })) },
  necromancer: { name: 'Necromancer', f: 'U', cost: 2, size: 1, hp: 88, atk: 8, cd: 2.4, tribes: ['Necromancer'], txt: () => 'Starts each battle with a Bone Minion. When an ally dies, raises a Bone Minion in its place.', onStart: (B, u) => summon(B, u.side, 'minion', u.m, u.slot, u), onAllyDeath: (B, u, dead) => { if (!dead.summoned) summon(B, u.side, 'minion', u.m, dead.slot, u); } },
  bloodcultist: { name: 'Blood Cultist', f: 'U', cost: 2, size: 1, hp: 60, atk: 8, cd: 2.2, tribes: ['Cultist'], every: 6, txt: () => 'Every 6s sacrifices your weakest other unit and summons a Demon.',
    tick: (B, u) => { const v = friends(B, u.side).filter(x => x !== u && !x.tribes.includes('Demon') && !x.d.big).sort((a, b) => a.hp - b.hp)[0]; if (!v) return; const s = v.slot; die(B, v); summon(B, u.side, 'demon', u.m, s, u); } },
  banshee:  { name: 'Banshee', f: 'U', cost: 3, size: 1, hp: 65, atk: 9, cd: 2.2, tribes: ['Blight'], txt: m => `Battle start: applies ${Math.round(2 * aur(m))} Rot to every enemy. Does not stack with another Banshee.`, onStart: (B, u) => foes(B, u.side).forEach(t => { const n = Math.round(2 * aur(u.m)), o = aura(t, 'banshee', n); if (o != null) addRot(B, t, n - o, 2 * u.m); }) },
  revenant: { name: 'Revenant', f: 'U', cost: 2, size: 1, hp: 80, atk: 9, cd: 2.0, tribes: ['Reborn'], lives: 1, txt: () => 'Rises once on its own. Each time it rises, it gains 50% attack.', onRevive: (B, u) => { u.atk += u.baseAtk * .5; } },
  deathknight: { name: 'Death Knight', f: 'U', cost: 4, size: 1, hp: 230, atk: 22, cd: 2.3, tribes: ['Reborn'], big: 1, txt: () => 'When it rises, it returns at full health and all allies gain 15% attack.', onRevive: (B, u) => { u.hp = u.maxhp; friends(B, u.side).forEach(a => { a.atk += a.baseAtk * .15; }); } },
  plaguelord: { name: 'Plaguelord', f: 'U', cost: 5, size: 2, hp: 240, atk: 25, cd: 2.4, tribes: ['Blight'], big: 1, splash: 1, txt: () => 'Attacks hit the target and its neighbours, applying 2 Rot to each.', onHit: (B, u, t) => addRot(B, t, 2, 2 * u.m) },
  colossus: { name: 'Bone Colossus', f: 'U', cost: 3, size: 2, hp: 210, atk: 19, cd: 2.8, tribes: ['Reborn'], big: 1, txt: () => 'On death: breaks into two Bone Warriors.', onDeath: (B, u) => { summon(B, u.side, 'warrior', u.m, u.slot, u); summon(B, u.side, 'warrior', u.m, u.slot + 1, u); } },
  lich:     { name: 'Lich', f: 'U', cost: 4, size: 2, hp: 190, atk: 20, cd: 2.6, tribes: ['Necromancer'], aura: 1, big: 1, every: 6, counts: 2, txt: () => 'Counts as 2 Necromancers. Your summons have +50% stats. Every 6s raises two Bone Minions.', tick: (B, u) => { summon(B, u.side, 'minion', u.m, u.slot, u); summon(B, u.side, 'minion', u.m, u.slot, u); } },
  pitlord:  { name: 'Pit Summoner', f: 'U', cost: 4, size: 1, hp: 110, atk: 11, cd: 2.2, tribes: ['Cultist'], big: 1, txt: m => `Battle start: summons a Demon into each adjacent empty slot, or absorbs its strength if the slot is taken. Gains ${3 * m} attack when an ally dies.`,
    onStart: (B, u) => { for (const s of [u.slot - 1, u.slot + 1]) { if (s >= 0 && s < SLOTS && B.open[u.side][s] && !friends(B, u.side).some(x => x.slot <= s && x.slot + x.size > s)) summon(B, u.side, 'demon', u.m, s, u); else { u.maxhp += 70 * u.m; u.atk += 15 * u.m; } } }, onAllyDeath: (B, u) => { u.atk += 3 * u.m; } },
  herald:   { name: "Archfiend's Herald", f: 'U', cost: 5, size: 2, hp: 260, atk: 33, cd: 2.4, tribes: ['Cultist'], big: 1, txt: () => 'After three of your units have died, summons an Archdemon.', onAllyDeath: (B, u) => { if (!u.done && B.deaths[u.side] >= 3) { if (summon(B, u.side, 'archdemon', u.m, u.slot, u)) u.done = 1; } } },
  // --- second wave ---
  halberdier: { name: 'Halberdier', f: 'H', cost: 2, size: 1, hp: 120, atk: 10, cd: 2.2, tribes: ['Tank'], reach: .5, txt: () => 'Its attacks also hit the enemies diagonal to it for 50%.' },
  duelist:  { name: 'Duelist', f: 'H', cost: 3, size: 1, hp: 100, atk: 22, cd: 1.6, tribes: ['DPS'], txt: () => '+40% attack when it starts the battle with no ally beside it.', onStart: (B, u) => { if (!adj(B, u).length) u.atk *= 1.4; } },
  bishop:   { name: 'Bishop', f: 'H', cost: 4, size: 1, hp: 150, atk: 8, cd: 2.4, tribes: ['Cleric'], every: 5, txt: m => `Every 5s shields the weakest ally for ${40 * m} and cleanses its Rot, burn and weakness.`, tick: (B, u) => { const t = weakest(friends(B, u.side)); if (t) { t.shield += 40 * u.m; t.rot = 0; t.burnT = 0; t.weak = 0; B.ev.push({ t: 'heal', b: t.bid, v: 40 * u.m }); } } },
  stormmage: { name: 'Storm Mage', f: 'H', cost: 4, size: 1, hp: 110, atk: 26, cd: 2.8, tribes: ['Mage'], txt: () => 'Each attack also arcs to two random enemies for 60%.', after: (B, u) => { const fs = foes(B, u.side); for (let i = 0; i < 2 && fs.length; i++) dmg(B, fs.splice(Math.floor(Math.random() * fs.length), 1)[0], effAtk(u) * .6); } },
  champion: { name: 'Champion', f: 'H', cost: 5, size: 1, hp: 240, atk: 38, cd: 1.8, tribes: ['DPS'], txt: () => 'Gains 20% attack each time an enemy dies. Summons do not count.', onFoeDeath: (B, u, dead) => { if (!dead.summoned) u.atk += u.baseAtk * .2; } },
  venom:    { name: 'Venom Stalker', f: 'E', cost: 2, size: 1, hp: 55, atk: 13, cd: 1.7, tribes: ['Drow'], grow: [1, 2], txt: () => 'Deals 50% more damage to enemies below half health.', vs: (B, u, t, v) => t.hp < t.maxhp / 2 ? v * 1.5 : v },
  briar:    { name: 'Briar Warden', f: 'E', cost: 3, size: 1, hp: 130, atk: 12, cd: 2.2, tribes: ['Grove'], grow: [1, 8], thorns: 6, txt: m => `Thorns: enemies that attack it take ${6 * m} damage.` },
  sunfire:  { name: 'Sunfire Archer', f: 'E', cost: 3, size: 1, hp: 80, atk: 20, cd: 2.0, tribes: ['Sun'], grow: [2, 3], burn: 4, txt: m => `Attacks burn for ${4 * m}/s.` },
  archon:   { name: 'Moon Archon', f: 'E', cost: 4, size: 2, hp: 260, atk: 20, cd: 2.4, tribes: ['Moon'], grow: [2, 8], every: 5, txt: m => `Every 5s gives all allies a ${25 * m} shield.`, tick: (B, u) => friends(B, u.side).forEach(a => { a.shield += 25 * u.m; }) },
  archdruid: { name: 'Archdruid', f: 'E', cost: 5, size: 1, hp: 220, atk: 18, cd: 2.6, tribes: ['Grove'], grow: [1, 6], bless: [4, 12], txt: m => `After each battle, a random ally permanently gains +${4 * m} attack and +${12 * m} health.` },
  boneshaper: { name: 'Bone Shaper', f: 'U', cost: 3, size: 1, hp: 144, atk: 8, cd: 2.2, tribes: ['Necromancer'], every: 5, txt: m => `Every 5s your summons gain 20% attack and heal ${10 * m}.`, tick: (B, u) => friends(B, u.side).filter(a => a.summoned).forEach(a => { a.atk += a.baseAtk * .2; heal(B, a, 10 * u.m); }) },
  soulreaper: { name: 'Soul Reaper', f: 'U', cost: 3, size: 1, hp: 100, atk: 16, cd: 2.0, tribes: ['Cultist'], txt: m => `Whenever a unit dies, heals 30% of its health and gains ${4 * m} attack. Summons do not count.`, onAllyDeath: (B, u, dead) => { if (dead.summoned) return; heal(B, u, u.maxhp * .3); u.atk += 4 * u.m; }, onFoeDeath: (B, u, dead) => { if (dead.summoned) return; heal(B, u, u.maxhp * .3); u.atk += 4 * u.m; } },
  collector: { name: 'Bone Collector', f: 'U', cost: 2, size: 1, hp: 85, atk: 8, cd: 2.2, tribes: ['Necromancer'], txt: m => `Whenever one of your summons dies, your strongest summon gains ${4 * m} attack and ${14 * m} health.`,
    onAllyDeath: (B, u, dead) => { if (!dead.summoned) return; const t = friends(B, u.side).filter(a => a.summoned).sort((a, b) => b.atk - a.atk)[0]; if (!t) return; const a = 4 * u.m, h = 14 * u.m; t.atk += a; t.baseAtk += a; t.maxhp += h; t.hp += h; B.ev.push({ t: 'buff', b: t.bid, a, h }); } },
  rothound: { name: 'Rot Hound', f: 'U', cost: 3, size: 1, hp: 110, atk: 14, cd: 1.5, tribes: ['Blight'], txt: () => 'Deals 15% more damage for each Rot stack on its target.', vs: (B, u, t, v) => v * (1 + .15 * t.rot) },
  // Neutral monsters and bosses (never in the shop)
  wolf:     { name: 'Dire Wolf', f: 'N', token: 1, cost: 0, size: 1, hp: 40, atk: 9, cd: 1.4, tribes: ['Beast'], txt: () => 'Fast attacker.' },
  bandit:   { name: 'Bandit', f: 'N', token: 1, cost: 0, size: 1, hp: 60, atk: 10, cd: 1.9, tribes: ['Beast'], crit: .25, txt: () => '25% chance to crit.' },
  shaman:   { name: 'Hedge Shaman', f: 'N', token: 1, cost: 0, size: 1, hp: 45, atk: 4, cd: 2.2, tribes: ['Beast'], every: 4, txt: () => 'Every 4s heals the weakest ally.', tick: (B, u) => { const t = weakest(friends(B, u.side)); if (t) heal(B, t, 14 * (u.o.scale || 1)); } },
  ogre:     { name: 'Ogre', f: 'N', token: 1, cost: 0, size: 2, hp: 180, atk: 16, cd: 2.6, tribes: ['Beast'], txt: () => 'Big and slow.' },
  ogrelord: { name: 'Ogre Warlord', f: 'N', token: 1, boss: 1, cost: 0, size: 3, hp: 1100, atk: 38, cd: 2.4, tribes: ['Boss'], noSplit: 1, txt: () => 'Boss. Hits every enemy opposite it for full damage and gains 5% attack with each swing. A quarter of each blow carries through to your hero.', after: (B, u) => { u.atk += u.baseAtk * .05; } },
  bonedragon: { name: 'Bone Dragon', f: 'N', token: 1, boss: 1, cost: 0, size: 3, hp: 2800, atk: 34, cd: 3.0, tribes: ['Boss'], all: 1, burn: 5, txt: () => 'Boss. Its breath hits every enemy unit and sets them burning. A quarter of it carries through to your hero.' },
  titan:    { name: 'Stone Titan', f: 'N', token: 1, boss: 1, cost: 0, size: 3, hp: 4400, atk: 85, cd: 2.8, tribes: ['Boss'], noSplit: 1, every: 6, txt: () => 'Boss. Hits every enemy opposite it for full damage. Every 6s it gains a shield worth 10% of its health. A quarter of each blow carries through to your hero.', tick: (B, u) => { u.shield += u.maxhp * .1; } },
  // Tokens (never in the shop)
  minion:   { name: 'Bone Minion', f: 'U', token: 1, cost: 0, size: 1, hp: 24, atk: 6, cd: 1.8, tribes: ['Minion'], txt: () => 'Summoned.' },
  warrior:  { name: 'Bone Warrior', f: 'U', token: 1, cost: 0, size: 1, hp: 45, atk: 10, cd: 2.0, tribes: ['Minion'], txt: () => 'Summoned.' },
  imp:      { name: 'Imp', f: 'U', token: 1, cost: 0, size: 1, hp: 30, atk: 9, cd: 1.5, tribes: ['Demon'], txt: () => 'Summoned.' },
  demon:    { name: 'Demon', f: 'U', token: 1, cost: 0, size: 1, hp: 70, atk: 15, cd: 2.0, tribes: ['Demon'], txt: () => 'Summoned.' },
  archdemon: { name: 'Archdemon', f: 'U', token: 1, cost: 0, size: 2, hp: 320, atk: 55, cd: 2.2, tribes: ['Demon'], txt: () => 'Summoned.' }
};
for (const k in U) U[k].id = k;
const POOL = {}; // faction -> cost -> [ids]
for (const k in U) { const d = U[k]; if (d.token) continue; ((POOL[d.f] = POOL[d.f] || {})[d.cost] = POOL[d.f][d.cost] || []).push(k); }

/* stats of an owned unit outside battle */
function stats(o) {
  const d = U[o.id], m = Math.pow(2, (o.tier || 1) - 1), it = o.item ? ITEMS[o.item] : null;
  const sc = o.scale || 1;
  let hp = d.hp * m * sc + (d.flat || 0) + (o.gHp || 0), atk = d.atk * m * sc + (o.gAtk || 0);
  if (it) { hp *= 1 + (it.hp || 0); atk *= 1 + (it.atk || 0); }
  const tribes = d.tribes.slice(); if (it && it.cls && !tribes.includes(it.cls)) tribes.push(it.cls);
  return { hp, atk, m, tribes, cd: d.cd };
}
let BID = 1;
function mkBU(B, o, side, slot, mOver) {
  const d = U[o.id], s = stats(o), it = o.item ? ITEMS[o.item] : null, m = mOver || s.m;
  const hp = mOver ? d.hp * m : s.hp, atk = mOver ? d.atk * m : s.atk;
  return { bid: BID++, o, d, m, side, slot, size: d.size, maxhp: hp, hp, atk, baseAtk: atk, cd: d.cd, t: slot * .03, at: 0, rot: 0, rotDps: 0, st: 0, n: 0,
    shield: 0, weak: 0, burn: 0, burnT: 0, regen: 0, smite: 0, haste: it && it.haste || 0, crit: d.crit || 0, splash: Math.max(d.splash || 0, it && it.splash || 0),
    healHit: it && it.healHit || 0, burnHit: d.burn ? d.burn * m * (o.scale || 1) : 0, lives: d.lives || 0, revFrac: .4, alive: true, tribes: s.tribes, item: o.item || null, summoned: false, owner: null, dealt: 0, heroDmg: 0, taken: 0, healed: 0, died: null };
}

/* synergy levels from a list of owned units (unique unit types count once) */
function synergy(list) {
  const seen = {}, cnt = {};
  for (const o of list) for (const t of stats(o).tribes) { const k = t + ':' + o.id; if (!seen[k]) { seen[k] = 1; cnt[t] = (cnt[t] || 0) + (U[o.id].counts && U[o.id].tribes[0] === t ? U[o.id].counts : 1); } }
  const lv = {};
  for (const t in cnt) { const th = TRIBES[t] ? TRIBES[t].th : []; lv[t] = th.filter(x => cnt[t] >= x).length; }
  if (cnt.Tank && cnt.DPS && cnt.Mage && cnt.Cleric) lv.Party = 1;
  cnt.Party = ['Tank', 'DPS', 'Mage', 'Cleric'].filter(t => cnt[t]).length;
  return { cnt, lv };
}
const heroHp = round => Math.round(150 * Math.pow(1.2, round - 1));

function createBattle(mine, theirs, round, n0, n1, opt) {
  opt = opt || {};
  const rl0 = {}, rl1 = {}; (opt.relics || []).forEach(k => { rl0[k] = 1; }); (opt.foeRelics || []).forEach(k => { rl1[k] = 1; });
  const B = { lead: [opt.leader || null, opt.foeLeader || null], rel: [rl0, rl1], mul: opt.foeMul || 1, rotBoost: [1, 1], bank: [null, null], fx: [{ rot: 0, burn: 0 }, { rot: 0, burn: 0 }], open: [openArr(n0), openArr(n1)], time: 0, units: [], ev: [], over: false, winner: null, deaths: [0, 0], round,
    hero: [{ hp: heroHp(round), max: heroHp(round) }, { hp: heroHp(round), max: heroHp(round) }], syn: [synergy(mine).lv, synergy(theirs).lv] };
  mine.forEach(o => B.units.push(mkBU(B, o, 0, o.slot)));
  theirs.forEach(o => B.units.push(mkBU(B, o, 1, o.slot)));
  for (const side of [0, 1]) {
    const s = B.syn[side], us = friends(B, side), rl = B.rel[side], ld = B.lead[side];
    for (const u of us) {
      const has = t => u.tribes.includes(t);
      if (side === 1 && B.mul !== 1) { u.maxhp *= B.mul; u.atk *= B.mul; }
      if (s.Tank && has('Tank')) u.maxhp *= [1, 1.2, 1.4, 1.7][s.Tank];
      if (s.DPS && has('DPS')) { u.atk *= [1, 1.15, 1.3, 1.55][s.DPS]; u.crit += [0, .1, .2, .35][s.DPS]; }
      if (s.Mage && has('Mage')) { u.haste += [0, .15, .3, .5][s.Mage]; u.burnHit = Math.max(u.burnHit, [0, 2, 2, 4][s.Mage] * u.m); }
      if (s.Cleric) { u.regen += [0, .01, .015, .025][s.Cleric]; if (has('Cleric')) u.smite = [0, 2, 2, 4][s.Cleric]; }
      if (s.Party) { const pm = ld === 'marshal' ? 1.3 : 1.15; u.maxhp *= pm; u.atk *= pm; }
      {
        if (ld === 'architect' && u.d.building) u.maxhp *= 2;
        if (rl.wardrum) u.atk *= 1.1;
        if (rl.belt && u.size > 1) { u.maxhp *= 1.25; u.atk *= 1.25; }
        if (rl.font) u.regen += .01;
        if (rl.armoury && !u.item) u.maxhp *= 1.15;
      }
      if (s.Grove) u.regen += s.Grove === 2 ? .025 : .01;
      if (s.Sun) u.atk *= s.Sun === 2 ? 1.35 : 1.15;
      if (s.Drow && has('Drow')) { u.crit += DROW[s.Drow][0]; u.haste += DROW[s.Drow][1]; u.flank = DROW[s.Drow][2]; }
      if (s.Reborn && has('Reborn')) u.lives++;
      u.revFrac = s.Reborn === 2 ? 1 : .4;
    }
  }
  for (const side of [0, 1]) {
    const s = B.syn[side], us = friends(B, side), rl = B.rel[side], ld = B.lead[side];
    for (const u of us) if (u.d.onStart) { B.src = u; u.d.onStart(B, u); }
    B.src = null;
    if (s.Drow) for (const al of us) if (al.d.lend) for (const a of adj(B, al)) { // a Dark Altar lends its neighbours part of the Drow bonus; two altars do not stack
      if (a.d.building || a.tribes.includes('Drow') || aura(a, 'altar', al.d.lend) == null) continue;
      const k = al.d.lend; a.crit += DROW[s.Drow][0] * k; a.haste += DROW[s.Drow][1] * k; a.flank = Math.max(a.flank || 0, DROW[s.Drow][2] * k);
    }
    if (us.length) {
      const byslot = us.slice().sort((p, q) => p.slot - q.slot), L = byslot[0], R = byslot[byslot.length - 1], fighters = us.filter(u => !u.d.building && u.atk > 0);
      if (ld === 'warden') { L.maxhp *= 1.5; if (R !== L) R.maxhp *= 1.5; }
      if (ld === 'architect') for (const u of us) if (!u.d.building && adj(B, u).some(a => a.d.building)) u.atk *= 1.2;
      if (ld === 'bladesinger' && fighters.length) fighters.reduce((p, q) => (q.atk > p.atk ? q : p)).haste += .3;
      if (ld === 'plaguefather') { B.rotBoost[side] = 1.25; foes(B, side).forEach(t => addRot(B, t, 1, .5 + round * .1)); }
      if (rl.whetstone) L.haste += .5;
      if (rl.bulwark) R.maxhp *= 1.5;
      if (rl.banner) for (const u of us) u.t = u.cd * .5;
      if (rl.bell) summon(B, side, 'minion', round >= 9 ? 4 : round >= 5 ? 2 : 1, null);
    }
    for (const u of us) { u.baseAtk = u.atk; u.hp = u.maxhp; if (s.Moon) u.shield += u.maxhp * (s.Moon === 2 ? .25 : .1); }
    if (s.Necromancer) { const m = Math.max(1, ...us.filter(u => u.tribes.includes('Necromancer')).map(u => u.m)); for (let i = 0; i < s.Necromancer - 1; i++) { summon(B, side, 'minion', m, null, null, 'Necromancer'); } }
  }
  B.ev = [];
  return B;
}

function attack(B, u) {
  u.n++;
  const A = aim(B, u), f = A.ts[0] || null;
  let v = effAtk(u), crit = false;
  if (u.d.opener && u.n === 1) v *= u.d.opener;
  else if (u.crit && Math.random() < u.crit) { v *= 2; crit = true; }
  if (u.d.mod) v = u.d.mod(B, u, v);
  B.ev.push({ t: 'atk', b: u.bid, to: (u.d.all ? foes(B, u.side) : A.ts).map(x => x.bid), hero: !f, diag: A.diag });
  const hit = (t, val, c) => { if (u.burnHit) { t.burn = Math.max(t.burn, u.burnHit); t.burnT = 3; } if (u.d.onHit) u.d.onHit(B, u, t); if (u.d.vs) val = u.d.vs(B, u, t, val); let fl = false; if (u.flank && !(t.atk > 0 && !t.d.building && (t.d.all || aim(B, t).ts.includes(u)))) { val *= 1 + u.flank; fl = true; u.flanks = (u.flanks || 0) + 1; } dmg(B, t, val, { crit: c, flank: fl }); };
  if (u.d.all) { const fs = foes(B, u.side); fs.forEach(t => hit(t, v, crit)); if (!f) hitHero(B, 1 - u.side, v); }
  else if (f) {
    // a wide unit strikes every enemy opposite any of its slots, splitting its damage evenly
    const ts = A.ts, each = u.d.noSplit ? v : v / ts.length, near = [];
    if (u.splash) for (const t of ts) for (const x of adj(B, t)) if (!ts.includes(x) && !near.includes(x)) near.push(x);
    ts.forEach(t => hit(t, each, crit)); near.forEach(t => hit(t, each * u.splash, false));
    if (u.d.reach && !A.diag) { const l = u.slot - 1, r2 = u.slot + u.size; B.units.filter(x => x.alive && x.side !== u.side && !ts.includes(x) && ((x.slot <= l && x.slot + x.size > l) || (x.slot <= r2 && x.slot + x.size > r2))).forEach(t => hit(t, v * u.d.reach, false)); }
  }
  else hitHero(B, 1 - u.side, v);
  if (u.d.boss && f) hitHero(B, 1 - u.side, v * .25);
  if (u.d.after) u.d.after(B, u);
  if (u.healHit) heal(B, weakest(friends(B, u.side)), v * u.healHit);
}

function step(B, dt) {
  if (B.over) return;
  B.time += dt;
  for (const u of B.units.slice()) {
    if (!u.alive) continue;
    B.src = u;
    if (u.regen && u.hp < u.maxhp) u.hp = Math.min(u.maxhp, u.hp + u.maxhp * u.regen * dt);
    if (u.burnT > 0) { u.burnT -= dt; u.hp -= u.burn * dt; u.taken += u.burn * dt; B.fx[1 - u.side].burn += u.burn * dt; if (u.hp <= 0) { die(B, u); if (!u.alive) continue; } }
    if (u.rot > 0) { const r0 = u.rot * u.rotDps * dt * B.rotBoost[1 - u.side]; u.hp -= r0; u.taken += r0; B.fx[1 - u.side].rot += r0;
      /* a stack fades every ROTFADE seconds, twice as fast once whoever applied it is dead (leader Rot: once no enemy unit is left) */
      u.rotT = (u.rotT || 0) + dt * ((u.rotBy ? !u.rotBy.alive : !B.units.some(x => x.alive && x.side !== u.side)) ? 2 : 1); if (u.rotT >= ROTFADE) { u.rotT = 0; u.rot--; } if (u.hp <= 0) { die(B, u); if (!u.alive) continue; } }
    if (u.d.every) { u.at += dt; if (u.at >= u.d.every) { u.at = 0; u.d.tick(B, u); if (!u.alive) continue; } }
    if (u.smite) { u.st += dt; if (u.st >= 4) { u.st = 0; const t = front(B, u), v = effAtk(u) * u.smite; B.ev.push({ t: 'smite', b: u.bid }); if (t) dmg(B, t, v); else hitHero(B, 1 - u.side, v); } }
    if (u.atk > 0 && !u.d.building) { u.t += dt * (1 + u.haste); if (u.t >= u.cd) { u.t -= u.cd; attack(B, u); } }
  }
  B.src = null;
  if (B.sdAt == null && !B.units.some(x => x.alive)) B.sdAt = B.time; // nobody left on either side: sudden death starts now
  const sd0 = B.sdAt != null ? Math.min(B.sdAt, SUDDEN) : SUDDEN;
  if (B.time > sd0) { B.sudden = true; for (const h of B.hero) h.hp -= h.max * (.03 + .015 * (B.time - sd0)) * dt; }
  const a = B.hero[0].hp <= 0, b = B.hero[1].hp <= 0;
  if (a || b) { B.over = true; B.winner = a && b ? (B.hero[0].hp > B.hero[1].hp ? 0 : B.hero[1].hp > B.hero[0].hp ? 1 : -1) : a ? 1 : 0; }
}

/* ---- run / shop ---- */
let UID = 1;
const rnd = a => a[Math.floor(Math.random() * a.length)];
function rollCost(level) { const o = ODDS[Math.min(level, 9) - 1]; let x = Math.random() * 100; for (let i = 0; i < 5; i++) { if (x < o[i]) return i + 1; x -= o[i]; } return 1; }
function rollUnit(f, level) { let c = rollCost(level); while (!POOL[f][c]) c--; return rnd(POOL[f][c]); }
function rollShop(run) {
  const old = run.shop || []; run.shop = [];
  for (let i = 0; i < 5; i++) run.shop.push(old[i] && old[i].frozen ? old[i] : run.faction === 'H' && Math.random() < (run.leader === 'quartermaster' ? .35 : .18) ? { kind: 'item', id: rnd(BASE_ITEMS) } : { kind: 'unit', id: rollUnit(run.faction, run.level) });
}
function toggleFreeze(run, i) { const s = run.shop[i]; if (!s) return false; s.frozen = !s.frozen; run.acts.push((s.frozen ? 'freeze ' : 'unfreeze ') + s.id); return true; }
const budget = round => 5 + 5 * (round - 1) + .32 * (round - 1) * (round - 1) + Math.max(0, round - 7) * 4;
const enemyLevel = round => Math.min(9, 1 + Math.floor(round * .7));
/* the earliest round an enemy may field a unit of this cost at tier 2 / tier 3: roughly what a player could own */
const T2FROM = [0, 2, 4, 7, 10, 13], T3FROM = [0, 6, 9, 12, 99, 99];
const ARCH = [
  { name: 'Shield wall', f: 'H', tribes: ['Tank', 'Cleric'] }, { name: 'Firing line', f: 'H', tribes: ['DPS', 'Mage'] },
  { name: 'Grave swarm', f: 'U', tribes: ['Necromancer', 'Reborn'] }, { name: 'Blood cult', f: 'U', tribes: ['Cultist', 'Reborn'] }, { name: 'Plague host', f: 'U', tribes: ['Blight'] },
  { name: 'Moonlit grove', f: 'E', tribes: ['Grove', 'Moon'] }, { name: 'Drow raid', f: 'E', tribes: ['Drow', 'Sun'] }
];
const BOSSES = [['ogrelord', 5], ['bonedragon', 10], ['titan', 15]];
function monster(id, slot, scale) { return { uid: UID++, kind: 'unit', id, tier: 1, slot, item: null, gAtk: 0, gHp: 0, scale }; }
function genBoss(round, maxSlots) {
  const n = Math.max(4, Math.min(SLOTS, maxSlots || SLOTS)), open = openArr(n), k = (Math.floor(round / 5) - 1) % 3, [id, base] = BOSSES[k];
  const lo = open.indexOf(true), hi = open.lastIndexOf(true), s = Math.max(lo, Math.min(3, hi - 2)), units = [monster(id, s, Math.pow(1.2, round - base))];
  const free = []; for (let i = lo; i <= hi; i++) if (i < s || i > s + 2) free.push(i);
  const esc = 1 + .3 * (round - 1);
  for (const i of free.slice(0, Math.min(free.length, 2 + Math.floor(round / 5)))) units.push(monster(rnd(['wolf', 'bandit', 'wolf', 'shaman']), i, esc));
  return { faction: 'N', units, open: n, boss: true, title: 'Boss: ' + U[id].name };
}
function genEnemy(round, maxSlots, noBoss) {
  if (round % 5 === 0 && !noBoss) return genBoss(round, maxSlots);
  const arch = round >= 3 && Math.random() < .5 ? rnd(ARCH) : null;
  const pick = (f0, lv) => { let id = rollUnit(f0, lv); if (arch) for (let i = 0; i < 8 && !U[id].tribes.some(t => arch.tribes.includes(t)); i++) id = rollUnit(f0, lv); return id; };
  const f = arch ? arch.f : rnd(['H', 'E', 'U']), level = enemyLevel(round), n = Math.min(openCount(level), maxSlots || SLOTS), open = openArr(n), out = [], occ = Array(SLOTS).fill(0);
  let gold = budget(round), tries = 0;
  const cap = f === 'U' ? Math.max(3, n - 2) : n;
  while (gold >= 1 && tries++ < 80) {
    if (occ.filter(Boolean).length >= cap) break;
    const id = pick(f, level), d = U[id];
    let tier = 1; const x = Math.random();
    if (round >= T3FROM[d.cost] && x < .15 && !d.building) tier = 3; else if (round >= T2FROM[d.cost] && x < Math.min(.6, .08 * round)) tier = 2;
    let cost = d.cost * Math.pow(3, tier - 1);
    if (cost > gold && tier === 3) { tier = 2; cost = d.cost * 3; }
    if (cost > gold) { tier = 1; cost = d.cost; }
    if (cost > gold) continue;
    const s = ORDER.find(s0 => { if (s0 + d.size > SLOTS) return false; for (let i = 0; i < d.size; i++) if (occ[s0 + i] || !open[s0 + i]) return false; return true; });
    if (s === undefined) continue;
    for (let i = 0; i < d.size; i++) occ[s + i] = 1;
    const o = { uid: UID++, kind: 'unit', id, tier, slot: s, item: null, gAtk: 0, gHp: 0 };
    if (d.grow) { const k = (round - 1) * .35 * tier; o.gAtk = Math.round(d.grow[0] * k); o.gHp = Math.round(d.grow[1] * k); }
    out.push(o); gold -= cost;
  }
  // spend what is left on upgrades the round allows, cheapest first
  for (const o of out.slice().sort((a, b) => (U[a.id].building ? 1 : 0) - (U[b.id].building ? 1 : 0) || U[a.id].cost - U[b.id].cost)) {
    if (U[o.id].building && o.tier >= 2) continue;
    const c = U[o.id].cost, up = c * Math.pow(3, o.tier) - c * Math.pow(3, o.tier - 1);
    if (o.tier < 3 && gold >= up && round >= (o.tier === 1 ? T2FROM : T3FROM)[c]) { o.tier++; gold -= up; if (U[o.id].grow) { o.gAtk = Math.round(o.gAtk * o.tier / (o.tier - 1)); o.gHp = Math.round(o.gHp * o.tier / (o.tier - 1)); } }
  }
  if (f === 'H') for (const o of out) if (gold >= 2 && Math.random() < .5) { o.item = rnd(BASE_ITEMS); gold -= ITEMS[o.item].cost; }
  return { faction: f, units: out, open: n, title: arch ? arch.name : null };
}
const interest = run => Math.min(3, Math.floor(run.gold / 10));
const income = run => Math.min(4 + run.round, 9) + Math.min(3, Math.floor(run.gold / 10)) + (has(run, 'coin') ? 1 : 0);
const has = (run, k) => (run.relics || []).includes(k);
function newRun(f, leader) {
  const run = { leader: leader || null, relics: [], offer: null, camp: null, freeRoll: false, faction: f, round: 1, gold: 6, lives: LIVES, wins: 0, level: 1, xp: 0, things: [], shop: [], over: null, log: [], acts: [] };
  rollShop(run); run.enemy = genEnemy(1, openCount(1));
  return run;
}
const boardUnits = run => run.things.filter(t => t.kind === 'unit' && t.slot != null);
function occOf(run, ignore) {
  const o = Array(SLOTS).fill(null), open = openArr(openCount(run.level));
  for (let i = 0; i < SLOTS; i++) if (!open[i]) o[i] = LOCK;
  for (const t of run.things) if (t.slot != null && !(ignore || []).includes(t)) for (let i = 0; i < U[t.id].size; i++) o[t.slot + i] = t;
  return o;
}
function boardFit(run, size, ignore) {
  const o = occOf(run, ignore);
  for (const s of ORDER) { if (s + size > SLOTS) continue; let ok = true; for (let i = 0; i < size; i++) if (o[s + i]) ok = false; if (ok) return s; }
  return -1;
}
function benchFree(run) { for (let i = 0; i < BENCH; i++) if (!run.things.some(t => t.bench === i)) return i; return -1; }
function mergeAll(run) {
  const made = [];
  for (let again = true; again;) {
    again = false;
    const groups = {};
    for (const t of run.things) if (t.kind === 'unit' && t.tier < 3) (groups[t.id + t.tier] = groups[t.id + t.tier] || []).push(t);
    for (const k in groups) {
      const g = groups[k]; if (g.length < 3) continue;
      g.sort((a, b) => (b.slot != null) - (a.slot != null) || (b.bench != null) - (a.bench != null));
      const keep = g[0], gone = g.slice(-2);
      keep.gAtk = Math.max(...g.map(x => x.gAtk)) * 2; keep.gHp = Math.max(...g.map(x => x.gHp)) * 2; keep.tier++;
      for (const x of gone) {
        run.things.splice(run.things.indexOf(x), 1);
        if (x.item) { if (!keep.item) keep.item = x.item; else { const b = benchFree(run); if (b >= 0) run.things.push({ uid: UID++, kind: 'item', id: x.item, bench: b, slot: null }); else run.gold += ITEMS[x.item].cost; } }
      }
      made.push(keep); again = true; break;
    }
  }
  return made;
}
function place(run, t) {
  if (t.slot != null || t.bench != null) return true;
  if (t.kind === 'unit') { const s = boardFit(run, U[t.id].size); if (s >= 0) { t.slot = s; return true; } }
  const b = benchFree(run); if (b >= 0) { t.bench = b; return true; }
  return false;
}
const priceOf = (run, s) => s.kind === 'item' ? Math.max(1, ITEMS[s.id].cost - (run.leader === 'quartermaster' ? 1 : 0)) : Math.max(1, U[s.id].cost - (run.leader === 'architect' && U[s.id].building ? 1 : 0));
function buy(run, i) {
  const s = run.shop[i]; if (!s) return { ok: false };
  const cost = priceOf(run, s);
  if (run.gold < cost) return { ok: false, msg: 'Not enough gold.' };
  let t;
  if (s.kind === 'item') { const b = benchFree(run); if (b < 0) return { ok: false, msg: 'Your bench is full.' }; t = { uid: UID++, kind: 'item', id: s.id, bench: b, slot: null }; run.things.push(t); }
  else {
    const willMerge = run.things.filter(x => x.kind === 'unit' && x.id === s.id && x.tier === 1).length >= 2;
    if (!willMerge && boardFit(run, U[s.id].size) < 0 && benchFree(run) < 0) return { ok: false, msg: 'No room. Sell or merge something first.' };
    t = { uid: UID++, kind: 'unit', id: s.id, tier: 1, item: null, gAtk: 0, gHp: 0, slot: null, bench: null };
    run.things.push(t);
  }
  run.gold -= cost; run.shop[i] = null; run.acts.push('buy ' + s.id);
  const merged = mergeAll(run);
  merged.forEach(x => run.acts.push('upgrade ' + x.id + ' t' + x.tier));
  if (run.things.includes(t)) place(run, t);
  const items = mergeItems(run);
  return { ok: true, merged, items, thing: t };
}
const itemValue = (run, id) => { const it = ITEMS[id], base = ITEMS[it.base || id]; return Math.max(1, base.cost - (run && run.leader === 'quartermaster' ? 1 : 0)) * (it.base ? 3 : 1); };
const sellValue = (t, run) => t.kind === 'item' ? itemValue(run, t.id) : Math.max(1, U[t.id].cost - (run && run.leader === 'architect' && U[t.id].building ? 1 : 0)) * Math.pow(3, t.tier - 1);
function sell(run, t) {
  run.acts.push('sell ' + t.id + (t.tier > 1 ? ' t' + t.tier : '')); run.gold += sellValue(t, run); run.things.splice(run.things.indexOf(t), 1);
  if (t.kind === 'unit' && t.item) { const b = benchFree(run); if (b >= 0) run.things.push({ uid: UID++, kind: 'item', id: t.item, bench: b, slot: null }); else run.gold += itemValue(run, t.item); }
}
/* three of the same basic item, worn or loose, become one upgraded item */
function mergeItems(run) {
  const made = [];
  for (let again = true; again;) {
    again = false;
    for (const id of BASE_ITEMS) {
      const loose = run.things.filter(t => t.kind === 'item' && t.id === id), worn = run.things.filter(t => t.kind === 'unit' && t.item === id);
      if (loose.length + worn.length < 3) continue;
      let need = 2;
      if (worn.length) { worn[0].item = id + '+'; for (const x of [...loose, ...worn.slice(1)]) { if (!need) break; if (x.kind === 'item') run.things.splice(run.things.indexOf(x), 1); else x.item = null; need--; } }
      else { loose[0].id = id + '+'; for (const x of loose.slice(1, 3)) run.things.splice(run.things.indexOf(x), 1); }
      made.push(id + '+'); run.acts.push('upgrade item ' + id); again = true; break;
    }
  }
  return made;
}
function equip(run, item, unit) {
  run.acts.push('equip ' + item.id + ' > ' + unit.id);
  if (unit.item) { const old = unit.item; unit.item = item.id; item.id = old; }
  else { unit.item = item.id; run.things.splice(run.things.indexOf(item), 1); }
}
/* Where a unit dropped on a board slot lands, and which neighbours slide aside to make room. Its left edge goes to the slot.
   Neighbours shift right, or left when there is no room on the right; a unit moved along the board lets them slide into the gap it leaves. */
function planMove(run, t, slot) {
  if (!t || t.kind !== 'unit') return null;
  const size = U[t.id].size, open = openArr(openCount(run.level)), lo = open.indexOf(true), hi = open.lastIndexOf(true);
  if (hi - lo + 1 < size) return null;
  const s = Math.max(lo, Math.min(slot, hi - size + 1)), others = boardUnits(run).filter(x => x !== t).sort((a, b) => a.slot - b.slot);
  const right = () => { const mv = []; let c = s + size; for (const x of others) { if (x.slot + U[x.id].size <= s) continue; const to = Math.max(x.slot, c); if (to !== x.slot) mv.push({ x, to }); c = to + U[x.id].size; } return c <= hi + 1 ? mv : null; };
  const left = () => { const mv = []; let c = s; for (const x of others.slice().reverse()) { if (x.slot >= s + size) continue; const to = Math.min(x.slot, c - U[x.id].size); if (to !== x.slot) mv.push({ x, to }); c = to; } return c >= lo ? mv : null; };
  for (const f of t.slot != null && t.slot < s ? [left, right] : [right, left]) { const mv = f(); if (mv) return { slot: s, moves: mv }; }
  return null;
}
/* what moveTo would do, without doing it: null, or where everything ends up */
function tryMove(run, t, dest) {
  const before = run.things.map(x => [x, x.slot, x.bench]);
  const ok = moveTo(run, t, dest), out = ok ? { slot: t.slot, bench: t.bench, moves: before.filter(b => b[0] !== t && (b[0].slot !== b[1] || b[0].bench !== b[2])).map(b => ({ uid: b[0].uid, from: b[1], to: b[0].slot })) } : null;
  for (const b of before) { b[0].slot = b[1]; b[0].bench = b[2]; }
  return out;
}
/* dest = {slot} or {bench}. Board drops push neighbours aside; failing that, swap when the swap fits. */
function moveTo(run, t, dest) {
  const old = { slot: t.slot, bench: t.bench };
  const fits = (x, s, ignore) => { const o = occOf(run, ignore); if (s < 0 || s + U[x.id].size > SLOTS) return false; for (let i = 0; i < U[x.id].size; i++) if (o[s + i]) return false; return true; };
  if (dest.bench != null) {
    const other = run.things.find(x => x.bench === dest.bench && x !== t);
    if (other) {
      if (old.slot != null) { if (other.kind !== 'unit') return false; let s = Math.min(old.slot, SLOTS - U[other.id].size); if (!fits(other, s, [t, other])) return false; other.bench = null; other.slot = s; }
      else other.bench = old.bench;
    }
    t.slot = null; t.bench = dest.bench; return true;
  }
  if (t.kind !== 'unit') return false;
  const P = planMove(run, t, dest.slot);
  if (P) { for (const m of P.moves) m.x.slot = m.to; t.slot = P.slot; t.bench = null; return true; }
  const size = U[t.id].size, o = occOf(run, [t]), over = [];
  let s = -1;
  for (let k = 0; k < size && s < 0; k++) { const c = dest.slot - k; if (c < 0 || c + size > SLOTS) continue; let ok = true; for (let i = 0; i < size; i++) if (o[c + i] === LOCK) ok = false; if (ok) s = c; }
  if (s < 0) return false;
  for (let i = 0; i < size; i++) if (o[s + i] && !over.includes(o[s + i])) over.push(o[s + i]);
  if (!over.length) { t.slot = s; t.bench = null; return true; }
  if (over.length > 1) return false;
  const x = over[0];
  if (old.slot != null) {
    // swap on board: try both orderings so different sizes can trade places
    const a = Math.min(s, old.slot), tFirst = s <= old.slot;
    const cands = tFirst ? [[s, Math.max(old.slot, s + size)], [a, a + size]] : [[s, old.slot], [old.slot + U[x.id].size, old.slot]];
    for (const [ts, xs] of cands) {
      const xs2 = Math.min(xs, SLOTS - U[x.id].size), ts2 = Math.min(ts, SLOTS - size);
      const oo = occOf(run, [t, x]); let ok = ts2 >= 0 && xs2 >= 0;
      for (let i = 0; i < size && ok; i++) if (oo[ts2 + i]) ok = false;
      for (let i = 0; i < U[x.id].size && ok; i++) if (oo[xs2 + i]) ok = false;
      if (ok && (ts2 + size <= xs2 || xs2 + U[x.id].size <= ts2)) { t.slot = ts2; x.slot = xs2; return true; }
    }
    return false;
  }
  if (!fits(t, s, [t, x])) return false;
  x.slot = null; x.bench = old.bench; t.bench = null; t.slot = s; return true;
}
function buyXp(run) { if (run.level >= 9 || run.gold < 4) return false; run.gold -= 4; addXp(run, 4); run.acts.push('xp'); return true; }
function addXp(run, n) { run.xp += n; while (run.level < 9 && run.xp >= XPNEED[run.level - 1]) { run.xp -= XPNEED[run.level - 1]; run.level++; } if (run.level >= 9) run.xp = 0; }
function reroll(run) { if (run.freeRoll) run.freeRoll = false; else { if (run.gold < 2) return false; run.gold -= 2; } rollShop(run); run.acts.push('reroll'); return true; }
const brief = t => { const o = { id: t.id }; if (t.scale) o.scale = Math.round(t.scale * 100) / 100; if (t.tier > 1) o.tier = t.tier; if (t.slot != null) o.slot = t.slot; if (t.item) o.item = t.item; if (t.gAtk) o.gAtk = t.gAtk; if (t.gHp) o.gHp = t.gHp; return o; };
const bopt = run => ({ leader: run.leader, relics: run.relics, foeLeader: run.enemy.leader || null, foeRelics: run.enemy.relics || [], foeMul: run.enemy.mul || 1 });
/* BALANCE goes up with every rules change. Boards saved under rules older than GHOST_FROM are no longer used as post-game opponents. */
const BALANCE = 7, GHOST_FROM = 1, POSTSTEP = .15;
/* the board a saved winning run finished its tenth win with, checked against today's units and items */
function ghostFrom(x, key) {
  try {
    if (!x || x.game !== 'warband' || x.outcome !== 'won' || (x.bal || 1) < GHOST_FROM) return null;
    const e = x.log.filter(r => !r.post && r.result === 'win').pop(); if (!e || !e.board || !e.board.length) return null;
    const n = Math.max(4, Math.min(SLOTS, e.slots || openCount(e.level || 9))), open = openArr(n), occ = Array(SLOTS).fill(0), units = [];
    for (const b of e.board) {
      const d = U[b.id]; if (!d || d.token || d.f !== x.faction) return null;
      if (b.item && !ITEMS[b.item]) return null;
      if (!(b.slot >= 0) || b.slot + d.size > SLOTS) return null;
      for (let i = 0; i < d.size; i++) { if (occ[b.slot + i] || !open[b.slot + i]) return null; occ[b.slot + i] = 1; }
      units.push({ id: b.id, tier: Math.max(1, Math.min(3, b.tier || 1)), slot: b.slot, item: b.item || null, gAtk: +b.gAtk || 0, gHp: +b.gHp || 0 });
    }
    const power = units.reduce((s, o) => { const t = stats(o); return s + Math.sqrt(t.hp * Math.max(1, t.atk)); }, 0);
    return { key: String(key || x.ended), faction: x.faction, leader: LEADERS[x.leader] ? x.leader : null, relics: (x.relics || []).filter(k => RELICS[k]), units, open: n, round: e.round, power: Math.round(power) };
  } catch (err) { return null; }
}
/* order saved boards by how they actually fare against each other: a quick round-robin under today's rules */
function rankGhosts(pool) {
  if (pool.length < 2) return pool;
  const per = pool.length > 12 ? 1 : 2, w = pool.map(() => 0);
  const bout = (a, b) => { const B = createBattle(a.units.map(x => Object.assign({}, x)), b.units.map(x => Object.assign({}, x)), 13, a.open, b.open, { leader: a.leader, relics: a.relics, foeLeader: b.leader, foeRelics: b.relics }); let n = 0; while (!B.over && n++ < 3000) { step(B, .05); B.ev.length = 0; } return B.winner; };
  for (let i = 0; i < pool.length; i++) for (let j = 0; j < pool.length; j++) if (i !== j) for (let k = 0; k < per; k++) { const r = bout(pool[i], pool[j]); if (r === 0) w[i]++; else if (r === 1) w[j]++; }
  pool.forEach((g, i) => { g.rank = w[i] / ((pool.length - 1) * per * 2); });
  return pool;
}
function nextFoe(run) {
  const P = run.post, mul = Math.round((1 + POSTSTEP * P.n) * 100) / 100;
  let pool = P.pool.filter(g => !P.faced.includes(g.key));
  if (!pool.length && P.pool.length) { P.faced = []; pool = P.pool.slice(); }
  if (pool.length) {
    const g = pool.sort((a, b) => (a.rank == null ? 0 : a.rank) - (b.rank == null ? 0 : b.rank) || a.power - b.power)[0]; P.faced.push(g.key);
    return { faction: g.faction, units: g.units.map(o => Object.assign({ uid: UID++, kind: 'unit' }, o)), open: g.open, leader: g.leader, relics: g.relics, mul, ghost: g.key, title: 'Your past warband' + (g.leader ? ' under ' + LEADERS[g.leader].name.replace('The ', 'the ') : '') };
  }
  const e = genEnemy(run.round, SLOTS, true); e.mul = mul; return e;
}
/* after the tenth win: keep the board and fight past winning boards, each stronger than the last, until the lives run out */
function continueRun(run, ghosts) {
  if (run.over !== 'won' || run.post) return false;
  run.post = { n: 0, faced: [], pool: rankGhosts((ghosts || []).filter(Boolean)) };
  run.over = null; run.saved = false; run.offer = null; run.lives = Math.max(run.lives, 3);
  const last = run.log[run.log.length - 1]; run.gold += last ? last.income : 0;
  run.round++; addXp(run, 2 + (has(run, 'scholar') ? 2 : 0)); run.freeRoll = has(run, 'seal'); rollShop(run); run.enemy = nextFoe(run);
  return true;
}
function startBattle(run) {
  const bu = boardUnits(run).filter(t => !occOf(run, [t]).slice(t.slot, t.slot + U[t.id].size).includes(LOCK)), lv = synergy(bu).lv, on = {};
  for (const k in lv) if (lv[k]) on[k] = lv[k];
  run.pending = { round: run.round, gold: run.gold, level: run.level, slots: openCount(run.level), lives: run.lives, wins: run.wins, acts: run.acts, bonuses: on,
    board: bu.map(brief).sort((a, b) => a.slot - b.slot), bench: run.things.filter(t => t.slot == null).map(brief),
    enemy: { faction: run.enemy.faction, slots: run.enemy.open, units: run.enemy.units.map(brief).sort((a, b) => a.slot - b.slot) } };
  run.acts = [];
  if (run.lastEnc) { run.pending.encounter = run.lastEnc; run.lastEnc = null; }
  if (run.enemy.title) run.pending.enemy.title = run.enemy.title;
  if (run.post) { run.pending.post = run.post.n + 1; if (run.enemy.ghost) Object.assign(run.pending.enemy, { ghost: run.enemy.ghost, leader: run.enemy.leader, relics: run.enemy.relics }); run.pending.enemy.mul = run.enemy.mul; }
  return createBattle(bu, run.enemy.units, run.round, openCount(run.level), run.enemy.open, bopt(run));
}
function battleReport(B) {
  const R = v => Math.round(v);
  return { time: Math.round(B.time * 10) / 10, sudden: !!B.sudden, heroHp: [R(Math.max(0, B.hero[0].hp)), R(Math.max(0, B.hero[1].hp))], heroMax: B.hero[0].max, effects: { you: { rot: R(B.fx[0].rot), burn: R(B.fx[0].burn) }, enemy: { rot: R(B.fx[1].rot), burn: R(B.fx[1].burn) } },
    units: B.units.map(u => { const o = { side: u.side ? 'enemy' : 'you', id: u.d.id, slot: u.slot, dealt: R(u.dealt), hero: R(u.heroDmg), taken: R(u.taken) };
      if (u.m > 1) o.tier = u.m === 4 ? 3 : 2; if (u.healed >= 1) o.healed = R(u.healed); if (u.summoned) o.summoned = 1; if (u.merged) o.merged = u.merged; if (u.waited) o.waited = u.waited; if (u.flanks) o.flanks = u.flanks; if (u.died != null) o.died = u.died; else o.hpLeft = R(u.hp); return o; }) };
}
function exportLog(run) { return { v: 1, game: 'warband', bal: BALANCE, post: run.post ? run.post.n : undefined, ended: new Date().toISOString(), faction: run.faction, leader: run.leader, relics: run.relics, outcome: run.over || 'abandoned', wins: run.wins, lives: run.lives, rounds: run.log.length, log: run.log }; }
function finishBattle(run, B) {
  const res = B.winner === 0 ? 'win' : B.winner === 1 ? 'loss' : 'draw';
  if (res === 'win') { run.wins++; if (run.post) run.post.n++; } else if (res === 'loss') run.lives--;
  const grown = [];
  const bu = boardUnits(run), tree = bu.some(t => U[t.id].doubleGrow) ? .5 : 0;
  for (const t of bu) {
    const d = U[t.id], m = Math.pow(2, t.tier - 1); let a = 0, h = 0;
    if (d.grow) { a += d.grow[0] * m; h += d.grow[1] * m; }
    for (const n of bu) if (n !== t && U[n.id].mentor && (n.slot + U[n.id].size === t.slot || t.slot + d.size === n.slot) && !d.building) { const nm = Math.pow(2, n.tier - 1); a += U[n.id].mentor[0] * nm; h += U[n.id].mentor[1] * nm; }
    if (has(run, 'seedling') && !d.building) { a += 1; h += 3; }
    const gk = 1 + tree + (run.leader === 'grovekeeper' ? .5 : 0);
    if (a || h) { t.gAtk += Math.round(a * gk); t.gHp += Math.round(h * gk); grown.push(t); }
  }
  for (const t of bu) if (U[t.id].bless) { const c = bu.filter(x => x !== t && !U[x.id].building); if (c.length) { const x = rnd(c), m = Math.pow(2, t.tier - 1); x.gAtk += U[t.id].bless[0] * m; x.gHp += U[t.id].bless[1] * m; if (!grown.includes(x)) grown.push(x); } }
  const inc = income(run) + (res === 'win' ? 1 : 0);
  run.log.push(Object.assign(run.pending || { round: run.round }, { result: res, income: inc, battle: battleReport(B) })); run.pending = null;
  if (run.lives <= 0) { run.over = run.post ? 'won' : 'lost'; if (run.post) run.post.done = true; } else if (run.wins >= MAXWINS && !run.post) run.over = 'won';
  const beatBoss = res === 'win' && run.enemy.boss;
  if (!run.over) { run.gold += inc; run.round++; addXp(run, 2 + (has(run, 'scholar') ? 2 : 0)); run.freeRoll = has(run, 'seal'); rollShop(run); run.enemy = run.post ? nextFoe(run) : genEnemy(run.round, openCount(run.level)); run.offer = run.post ? null : genOffer(run, beatBoss); }
  return { res, income: inc, grown: grown.length };
}

const LEADERS = {
  quartermaster: { f: 'H', name: 'The Quartermaster', art: 'crossbow', text: 'Items appear in your shop twice as often and cost 1 less.' },
  marshal: { f: 'H', name: 'The Marshal', art: 'captain', text: 'Your Full party bonus is doubled to +30% health and attack.' },
  warden: { f: 'H', name: 'The Warden', art: 'knight', text: 'Your leftmost and rightmost units have +50% health.' },
  grovekeeper: { f: 'E', name: 'The Grovekeeper', art: 'treant', text: 'Your units grow 50% more after each battle.' },
  architect: { f: 'E', name: 'The Architect', art: 'sunspire', text: 'Buildings cost 1 less and have double health. Allies beside a building have +20% attack.' },
  bladesinger: { f: 'E', name: 'The Bladesinger', art: 'assassin', text: 'Your highest-attack unit attacks 30% faster.' },
  gravecaller: { f: 'U', name: 'The Gravecaller', art: 'necromancer', text: 'Your summons arrive with a shield worth 75% of their health.' },
  bloodpriest: { f: 'U', name: 'The Blood Priest', art: 'bloodcultist', text: 'Whenever one of your own units dies, your others gain 8% attack. Summons do not count.' },
  plaguefather: { f: 'U', name: 'The Plaguefather', art: 'plague', text: 'Every enemy starts with 1 Rot, and Rot deals 25% more damage.' }
};
const RELICS = {
  whetstone: { name: 'Whetstone', text: 'Your leftmost unit attacks 50% faster.' },
  bulwark: { name: 'Bulwark Plate', text: 'Your rightmost unit has +50% health.' },
  wardrum: { name: 'War Drum', text: 'All your units have +10% attack.' },
  font: { name: 'Healing Font', text: 'Your units regenerate 1% of their health each second.' },
  aegis: { name: 'Hero\'s Aegis', text: 'Your hero takes 20% less damage.' },
  banner: { name: 'Vanguard Banner', text: 'Your units make their first attack twice as soon.' },
  belt: { name: 'Giant\'s Belt', text: 'Your units wider than one slot have +25% health and attack.' },
  coin: { name: 'Lucky Coin', text: '+1 gold every round.' },
  seal: { name: 'Merchant\'s Seal', text: 'Your first reroll each round is free.' },
  scholar: { name: 'Scholar\'s Tome', text: '+2 extra XP every round.' },
  armoury: { name: 'Armoury Key', f: 'H', text: 'Your units without an item have +15% health.' },
  seedling: { name: 'Elder Seedling', f: 'E', text: 'Your units grow an extra +1 attack and +3 health after each battle.' },
  bell: { name: 'Summoner\'s Bell', f: 'U', text: 'Start each battle with a Bone Minion in an empty slot.' }
};
const freeRelics = run => Object.keys(RELICS).filter(k => !run.relics.includes(k) && (!RELICS[k].f || RELICS[k].f === run.faction));
function genCamp(round, maxSlots, hard) {
  const n = Math.max(3, Math.min(maxSlots || SLOTS, 3 + Math.floor(round / 2))), open = openArr(maxSlots), kind = rnd(['wolves', 'bandits', 'ogre']), units = [], occ = Array(SLOTS).fill(0);
  const sc = Math.pow((hard ? .95 : .6) * budget(round) / n, .7);
  const put = id => { const sz = U[id].size, s = ORDER.find(s0 => { if (s0 + sz > SLOTS) return false; for (let i = 0; i < sz; i++) if (occ[s0 + i] || !open[s0 + i]) return false; return true; }); if (s === undefined) return false; for (let i = 0; i < sz; i++) occ[s + i] = 1; units.push(monster(id, s, sc)); return true; };
  if (kind === 'ogre') put('ogre');
  while (occ.filter(Boolean).length < n) { const id = kind === 'wolves' ? 'wolf' : kind === 'bandits' ? (units.length % 3 === 2 ? 'shaman' : 'bandit') : 'wolf'; if (!put(id)) break; }
  return { units, open: maxSlots, name: kind === 'wolves' ? 'Wolf pack' : kind === 'bandits' ? 'Bandit camp' : 'Ogre den' };
}
const EVENTS = {
  purse: { name: 'Lost purse', text: run => `Gain ${3 + Math.floor(run.round / 3)} gold.`, go: run => { const g = 3 + Math.floor(run.round / 3); run.gold += g; return `You gained ${g} gold.`; } },
  training: { name: 'Training ground', text: () => 'Gain 4 XP.', go: run => { addXp(run, 4); return 'You gained 4 XP.'; } },
  recruit: { name: 'Veteran for hire', text: () => 'A unit costing 3 or more joins you for free.', go: run => { let id = rollUnit(run.faction, Math.min(9, run.level + 3)); for (let i = 0; i < 40 && U[id].cost < 3; i++) id = rollUnit(run.faction, Math.min(9, run.level + 3)); if (U[id].cost < 3) id = rnd(POOL[run.faction][3]); return grant(run, id); } },
  drill: { name: 'Drill sergeant', text: () => 'A random tier-1 unit on your board that costs 3 or less is upgraded to tier 2.', ok: run => run.round >= 4 && run.round - (run.drillSeen || -9) >= 2 && boardUnits(run).some(t => t.tier === 1 && U[t.id].cost <= 3),
    go: run => { const t = rnd(boardUnits(run).filter(x => x.tier === 1 && U[x.id].cost <= 3)); t.tier = 2; t.gAtk *= 2; t.gHp *= 2; mergeAll(run); return `${U[t.id].name} was upgraded to tier 2.`; } },
  armourer: { f: 'H', name: 'Travelling armourer', text: () => 'Gain a random item.', ok: run => benchFree(run) >= 0, go: run => { const id = rnd(BASE_ITEMS); run.things.push({ uid: UID++, kind: 'item', id, bench: benchFree(run), slot: null }); mergeItems(run); return `You received a ${ITEMS[id].name}.`; } },
  glade: { f: 'E', name: 'Moonlit glade', text: () => 'Every unit on your board grows as if it had just fought a battle.', ok: run => boardUnits(run).some(t => U[t.id].grow),
    go: run => { let k = 0; for (const t of boardUnits(run)) { const d = U[t.id], m = Math.pow(2, t.tier - 1); if (d.grow) { t.gAtk += d.grow[0] * m; t.gHp += d.grow[1] * m; k++; } } return `${k} unit${k === 1 ? '' : 's'} grew stronger.`; } },
  grave: { f: 'U', name: 'Mass grave', text: () => 'Two Skeletons claw their way out and join you.', go: run => { grant(run, 'skeleton'); return grant(run, 'skeleton') && 'Two Skeletons joined you.'; } }
};
function grant(run, id) {
  const t = { uid: UID++, kind: 'unit', id, tier: 1, item: null, gAtk: 0, gHp: 0, slot: null, bench: null };
  run.things.push(t); mergeAll(run);
  if (run.things.includes(t) && !place(run, t)) { run.things.splice(run.things.indexOf(t), 1); run.gold += U[id].cost; return `No room for ${U[id].name}, so you took ${U[id].cost} gold instead.`; }
  return `${U[id].name} joined you.`;
}
function genOffer(run, beatBoss) {
  if (beatBoss) { const pool = freeRelics(run).sort(() => Math.random() - .5).slice(0, 3); if (pool.length) return { kind: 'relics', cards: pool.map(k => ({ type: 'relic', relic: k })) }; }
  const slots = openCount(run.level), round = run.round, cards = [];
  const camp = hard => { const c = genCamp(round, slots, hard), rel = hard ? rnd(freeRelics(run)) : null, gold = (hard ? 5 : 2) + Math.floor(round / 3);
    return Object.assign(c, { type: 'camp', hard, reward: rel ? { relic: rel } : !hard && Math.random() < .35 ? { unit: rollUnit(run.faction, Math.min(9, run.level + 1)) } : { gold } }); };
  const evs = Object.keys(EVENTS).filter(k => (!EVENTS[k].f || EVENTS[k].f === run.faction) && (!EVENTS[k].ok || EVENTS[k].ok(run))).sort(() => Math.random() - .5);
  cards.push(camp(false)); cards.push({ type: 'event', id: evs[0] });
  const x = Math.random(), fr = freeRelics(run);
  if (x < .45) cards.push(camp(true)); else if (x < .65 && run.lives > 1 && fr.length) cards.push({ type: 'shrine', relic: rnd(fr) }); else cards.push({ type: 'event', id: evs[1] });
  if (cards.some(c => c.id === 'drill')) run.drillSeen = run.round;
  return { kind: 'encounter', cards };
}
/* returns { msg } when resolved on the spot, or { fight: true } when a camp battle must be played */
function chooseOffer(run, i) {
  const c = run.offer && run.offer.cards[i]; if (!c) return null;
  run.offer = null;
  if (c.type === 'camp') { run.camp = c; return { fight: true }; }
  let msg = '';
  if (c.type === 'event') { msg = EVENTS[c.id].go(run); run.lastEnc = { pick: EVENTS[c.id].name }; }
  else if (c.type === 'relic') { run.relics.push(c.relic); msg = `You took the ${RELICS[c.relic].name}.`; run.lastEnc = { pick: 'relic ' + c.relic }; }
  else if (c.type === 'shrine') { run.lives--; run.relics.push(c.relic); msg = `You gave a life and took the ${RELICS[c.relic].name}.`; run.lastEnc = { pick: 'shrine ' + c.relic }; }
  if (has(run, 'seal') && c.relic === 'seal') run.freeRoll = true;
  return { msg };
}
function startCamp(run) { return createBattle(boardUnits(run), run.camp.units, run.round, openCount(run.level), run.camp.open, { leader: run.leader, relics: run.relics }); }
function finishCamp(run, B) {
  const c = run.camp, win = B.winner === 0; let msg = 'You were driven off and gained nothing.';
  if (win) { const rw = c.reward; if (rw.relic) { run.relics.push(rw.relic); msg = `You found the ${RELICS[rw.relic].name}.`; if (rw.relic === 'seal') run.freeRoll = true; } else if (rw.unit) msg = grant(run, rw.unit); else { run.gold += rw.gold; msg = `You took ${rw.gold} gold.`; } }
  run.lastEnc = { pick: (c.hard ? 'hard ' : '') + c.name, won: win, time: Math.round(B.time * 10) / 10 };
  run.camp = null;
  return { win, msg };
}
function restore(run) { for (const t of run.things.concat(run.enemy ? run.enemy.units : [])) UID = Math.max(UID, t.uid + 1); if (!run.log) run.log = []; if (!run.acts) run.acts = []; if (!run.relics) run.relics = []; if (run.camp) for (const t of run.camp.units) UID = Math.max(UID, t.uid + 1); return run; }
function preview(run, uid) {
  const bu = boardUnits(run), B = createBattle(bu, run.enemy.units, run.round, openCount(run.level), run.enemy.open, bopt(run));
  const u = B.units.find(x => x.side === 0 && x.o.uid === uid);
  if (!u || u.d.building || !(u.atk > 0)) return null;
  const A = aim(B, u), ts = u.d.all ? foes(B, 0) : A.ts;
  return { to: ts.map(x => x.o.uid).filter(x => x != null), names: ts.map(x => x.d.name), hero: !ts.length, diag: A.diag };
}
/* which way a unit is aiming: 'l' / 'r' diagonal, 'c' straight ahead, 'h' the hero, '' for units that do not attack */
function aimDir(B, u) {
  if (u.d.building || !(u.atk > 0)) return '';
  const A = aim(B, u); if (!A.ts.length) return 'h';
  if (u.d.all || A.ts.length > 1) return 'c';
  const t = A.ts[0]; return t.slot + t.size <= u.slot ? 'l' : t.slot >= u.slot + u.size ? 'r' : 'c';
}
function previewAll(run) {
  const B = createBattle(boardUnits(run), run.enemy.units, run.round, openCount(run.level), run.enemy.open, bopt(run)), out = {};
  for (const u of B.units) if (u.o.uid != null) out[u.o.uid] = aimDir(B, u);
  return out;
}
const api = { rankGhosts, planMove, tryMove, BALANCE, ghostFrom, continueRun, nextFoe, POSTSTEP, BASE_ITEMS, mergeItems, itemValue, LEADERS, RELICS, EVENTS, priceOf, genOffer, chooseOffer, startCamp, finishCamp, genCamp, genBoss, has, restore, preview, aim, aimDir, previewAll, interest, toggleFreeze, openCount, openArr, effAtk, enemyLevel, LOCK, exportLog, battleReport, SLOTS, BENCH, SUDDEN, MAXWINS, LIVES, ODDS, XPNEED, FACTIONS, TRIBES, ITEMS, U, POOL, stats, synergy, heroHp, createBattle, step, newRun, buy, sell, sellValue, equip, moveTo, buyXp, reroll,
  startBattle, finishBattle, boardUnits, occOf, boardFit, benchFree, genEnemy, income, mergeAll, budget };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.WB = api;
})(typeof window !== 'undefined' ? window : globalThis);
