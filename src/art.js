/* Placeholder SVG art: one distinct drawing per unit, built from a small figure kit. */
(function (root) {
'use strict';
const STEEL = '#b4bec7', GOLD = '#e0b040', WOOD = '#7a5a34', BONE = '#e6e0cc', DARK = '#15181b';
const HATS = {
  helm: c => `<path d="M22 23a10 10 0 0 1 20 0v3h-20z" fill="${c}"/><rect x="31" y="20" width="2" height="10" fill="${c}"/>`,
  great: c => `<rect x="22.5" y="12" width="19" height="21" rx="4" fill="${c}"/><rect x="26" y="21" width="12" height="2.6" fill="${DARK}"/><path d="M32 12q2-9 10-8q-6 2-7 8z" fill="#c23b3b"/>`,
  hood: c => `<path d="M19 30Q18 8 32 8Q46 8 45 30L41 25Q32 12 23 25z" fill="${c}"/>`,
  wizard: c => `<path d="M18 17h28l-4-3L34-1 22 14z" fill="${c}"/><rect x="22" y="13" width="20" height="2.4" fill="${GOLD}"/>`,
  mitre: c => `<path d="M24.5 16L32 1l7.5 15z" fill="${c}"/><rect x="31" y="6" width="2" height="8" fill="${GOLD}"/><rect x="28.5" y="9" width="7" height="2" fill="${GOLD}"/>`,
  crown: c => `<path d="M23 15V7l4.5 4L32 5l4.5 6L41 7v8z" fill="${c}"/>`,
  horns: c => `<path d="M25 17Q15 14 16 3Q21 11 28 13zM39 17Q49 14 48 3Q43 11 36 13z" fill="${c}"/>`,
  cap: c => `<path d="M21 19Q31 5 44 16l-2 3z" fill="${c}"/><path d="M40 14L51 3l-6 14z" fill="#d8443a"/>`,
  circlet: c => `<rect x="22.5" y="16" width="19" height="2.6" fill="${GOLD}"/><circle cx="32" cy="17" r="2.4" fill="${c}"/>`,
  hair: c => `<path d="M22 25Q19 9 32 10Q45 9 42 25l4 17-6-11V21q-8-6-16 0v10l-6 11z" fill="${c}"/>`,
  leaves: c => `<circle cx="24" cy="13" r="6" fill="${c}"/><circle cx="33" cy="9" r="7" fill="${c}"/><circle cx="41" cy="14" r="5.5" fill="${c}"/>`
};
const WPN = {
  sword: c => `<path d="M48.5 48V18l2-5 2 5v30z" fill="${c || STEEL}"/><rect x="44.5" y="46" width="12" height="3" rx="1" fill="${GOLD}"/><rect x="49.3" y="49" width="2.4" height="6" fill="${WOOD}"/>`,
  dagger: c => `<path d="M49 46V30l1.7-4 1.7 4v16z" fill="${c || STEEL}"/><rect x="46.5" y="45" width="8.5" height="2.4" fill="${GOLD}"/><path d="M12 46V30l1.7-4 1.7 4v16z" fill="${c || STEEL}"/><rect x="9.5" y="45" width="8.5" height="2.4" fill="${GOLD}"/>`,
  staff: c => `<rect x="49" y="13" width="2.6" height="49" fill="${WOOD}"/><circle cx="50.3" cy="11" r="5.5" fill="${c}"/><circle cx="48.8" cy="9.5" r="1.8" fill="#fff" opacity=".7"/>`,
  bow: c => `<path d="M47 12Q63 32 47 54" fill="none" stroke="${c || WOOD}" stroke-width="3" stroke-linecap="round"/><path d="M47 12V54" stroke="#ddd" stroke-width="1"/><path d="M38 33h17l-3-2.5m3 2.5l-3 2.5" stroke="#ddd" stroke-width="1.4" fill="none"/>`,
  xbow: () => `<rect x="36" y="41" width="24" height="3.4" fill="${WOOD}"/><path d="M55 30Q63 43 55 56" fill="none" stroke="${STEEL}" stroke-width="3"/><path d="M55 30V56" stroke="#ddd" stroke-width="1"/>`,
  mace: c => `<rect x="49" y="22" width="2.6" height="34" fill="${WOOD}"/><circle cx="50.3" cy="18" r="6" fill="${c || STEEL}"/><path d="M50.3 9v4m-8 5h4m12 0h-4" stroke="${c || STEEL}" stroke-width="2.4"/>`,
  scythe: c => `<rect x="49" y="8" width="2.6" height="54" fill="${WOOD}"/><path d="M51 9Q33 4 25 17Q38 11 51 16z" fill="${c || STEEL}"/>`,
  spade: () => `<rect x="49" y="12" width="2.6" height="38" fill="${WOOD}"/><path d="M45 48h11v8q-5.5 6-11 0z" fill="${STEEL}"/>`,
  banner: c => `<rect x="49" y="6" width="2.4" height="56" fill="${WOOD}"/><path d="M51.4 8h11l-3 6 3 6h-11z" fill="${c}"/>`,
  book: c => `<rect x="43" y="40" width="14" height="11" rx="1.5" fill="${c}"/><rect x="49.3" y="40" width="1.4" height="11" fill="${GOLD}"/>`
};
function fig(o) {
  const skin = o.skin || '#e3b890', b = o.body, d = o.dark || '#0006';
  let s = '';
  if (o.wings) s += `<path d="M23 37L1 18l5 27 15 3zM41 37L63 18l-5 27-15 3z" fill="${o.wings}"/>`;
  if (o.cloak) s += `<path d="M13 62l8-30h22l8 30z" fill="${o.cloak}"/>`;
  if (o.hat === 'hair' || o.hat === 'hood') s += HATS[o.hat](o.hatc);
  if (o.robe) s += `<path d="M22 34h20l6 28H16z" fill="${b}"/><path d="M31 34h2v28h-2z" fill="${d}"/>`;
  else s += `<rect x="21" y="34" width="22" height="19" rx="3" fill="${b}"/><rect x="23" y="52" width="7.5" height="10" rx="1.5" fill="${b}"/><rect x="33.5" y="52" width="7.5" height="10" rx="1.5" fill="${b}"/><rect x="21" y="48" width="22" height="3" fill="${d}"/>`;
  s += `<rect x="14.5" y="35" width="6.5" height="17" rx="3.2" fill="${b}"/><rect x="43" y="35" width="6.5" height="17" rx="3.2" fill="${b}"/>`;
  if (o.trim) s += `<path d="M26 34h12l-6 9z" fill="${o.trim}"/>`;
  if (o.ears) s += `<path d="M24 21l-10-8 9 15zM40 21l10-8-9 15z" fill="${skin}"/>`;
  s += `<circle cx="32" cy="23" r="9.5" fill="${skin}"/>`;
  if (o.skull) s += `<circle cx="28.3" cy="22.5" r="2.7" fill="${DARK}"/><circle cx="35.7" cy="22.5" r="2.7" fill="${DARK}"/><path d="M27 29h10M29.5 27.5v3.5M32 27.5v3.5M34.5 27.5v3.5" stroke="${DARK}" stroke-width="1.1"/>`;
  else s += `<rect x="27.2" y="21.5" width="2.6" height="3" rx="1" fill="${o.eyes || DARK}"/><rect x="34.2" y="21.5" width="2.6" height="3" rx="1" fill="${o.eyes || DARK}"/>`;
  if (o.glow) s += `<circle cx="28.3" cy="22.5" r="1.3" fill="${o.glow}"/><circle cx="35.7" cy="22.5" r="1.3" fill="${o.glow}"/>`;
  if (o.hat && o.hat !== 'hair' && o.hat !== 'hood') s += HATS[o.hat](o.hatc);
  if (o.hat === 'hood') s += `<path d="M22 22Q23 12 32 12Q41 12 42 22Q32 15 22 22z" fill="${o.hatc}"/>`;
  if (o.shield) s += `<path d="M6 33h19v13q-9.5 13-19 0z" fill="${o.shield}" stroke="${GOLD}" stroke-width="1.6"/><path d="M15.5 36v14M9 41h13" stroke="${GOLD}" stroke-width="1.6"/>`;
  if (o.wpn) s += WPN[o.wpn](o.wc);
  return s;
}
const quad = (c, eye) => `<path d="M14 38Q4 30 8 22Q10 32 17 36z" fill="${c}"/><ellipse cx="30" cy="40" rx="17" ry="9" fill="${c}"/><rect x="15" y="43" width="5.500" height="15" rx="2" fill="${c}"/><rect x="23" y="45" width="5.500" height="13" rx="2" fill="${c}"/><rect x="34" y="45" width="5.500" height="13" rx="2" fill="${c}"/><rect x="41" y="43" width="5.500" height="15" rx="2" fill="${c}"/><path d="M40 36L52 22l9 9-4 6-8 5z" fill="${c}"/><path d="M50 23l1-8 5 7z" fill="${c}"/><circle cx="54" cy="29" r="1.700" fill="${eye}"/><path d="M57 35l4-1-3 3z" fill="#fff"/>`;
const big = s => `<g transform="translate(-6.4 -9) scale(1.2)">${s}</g>`;
const small = s => `<g transform="translate(6.4 12) scale(.8)">${s}</g>`;
const SK = { skull: 1, skin: BONE };
const ELF = { ears: 1 };
const UNITS = {
  footman: fig({ body: '#4f6f9c', hat: 'helm', hatc: STEEL, shield: '#35527d', wpn: 'sword' }),
  archer: fig({ body: '#5d7a3c', hat: 'cap', hatc: '#3f5a2a', wpn: 'bow' }),
  apprentice: fig({ body: '#4b5fb0', robe: 1, hat: 'wizard', hatc: '#39489a', wpn: 'staff', wc: '#7fd0ff' }),
  acolyte: fig({ body: '#e8e2d0', robe: 1, trim: GOLD, hat: 'hair', hatc: '#8a5a2b', wpn: 'mace', wc: GOLD }),
  knight: big(fig({ body: STEEL, dark: '#0004', hat: 'great', hatc: '#c6ced5', shield: '#8c2f2f', wpn: 'sword' })),
  crossbow: fig({ body: '#7a4a2e', hat: 'helm', hatc: '#8b949c', wpn: 'xbow' }),
  firemage: fig({ body: '#b5402c', robe: 1, trim: GOLD, hat: 'wizard', hatc: '#8f2b1c', wpn: 'staff', wc: '#ff9a2e', eyes: '#ffb347' }),
  priest: fig({ body: '#f1ecdd', robe: 1, trim: '#c23b3b', hat: 'mitre', hatc: '#f1ecdd', wpn: 'staff', wc: GOLD }),
  captain: fig({ body: '#2f4f86', trim: GOLD, cloak: '#8c2f2f', hat: 'hair', hatc: '#3a2a1c', wpn: 'banner', wc: '#d8443a' }),
  sharpshooter: fig({ body: '#39424a', cloak: '#2a3238', hat: 'hood', hatc: '#2a3238', wpn: 'bow', wc: '#c9c2a8' }),
  paladin: big(fig({ body: '#d9c27a', dark: '#0003', trim: '#fff', hat: 'crown', hatc: GOLD, shield: '#f1ecdd', wpn: 'mace', wc: GOLD, cloak: '#f1ecdd' })),
  archmage: big(fig({ body: '#6a3fa8', robe: 1, trim: GOLD, cloak: '#3d2470', hat: 'wizard', hatc: '#4d2c8a', wpn: 'staff', wc: '#e58cff', glow: '#e58cff' })),
  scout: fig({ ...ELF, body: '#3f7d4a', hat: 'hair', hatc: '#c58a3a', wpn: 'bow' }),
  sunaco: fig({ ...ELF, body: '#e3b23c', robe: 1, trim: '#fff', hat: 'circlet', hatc: '#ff7a2e', wpn: 'staff', wc: '#ffd34d' }),
  drowblade: fig({ ...ELF, skin: '#6b6690', body: '#2d2440', hat: 'hair', hatc: '#e9e6f5', wpn: 'dagger', eyes: '#ff5c8a' }),
  sentinel: fig({ ...ELF, body: '#8fa6c9', hat: 'helm', hatc: '#d6e0f0', shield: '#3d5688', wpn: 'sword', wc: '#d6e8ff' }),
  treant: `<path d="M22 62l3-30-13-9 4-4 11 6 2-9h7l2 9 11-6 4 4-13 9 3 30z" fill="#6b4a2a"/><path d="M27 62V44M37 62V46" stroke="#4d341c" stroke-width="2"/><circle cx="20" cy="15" r="9" fill="#3f8a45"/><circle cx="33" cy="10" r="11" fill="#4c9c50"/><circle cx="46" cy="16" r="9" fill="#3f8a45"/><circle cx="28" cy="36" r="2.2" fill="#ffd34d"/><circle cx="37" cy="36" r="2.2" fill="#ffd34d"/><path d="M28 44q4.500 3 9 0" stroke="#2c1d10" stroke-width="2" fill="none"/>`,
  altar: `<path d="M14 60h36l-4-10H18z" fill="#2a2238"/><path d="M18 50h28l-3-22H21z" fill="#3b2f52"/><path d="M16 28h32v-6H16z" fill="#57457a"/><path d="M32 20c-6-5-3-11 0-16c3 5 6 11 0 16z" fill="#c77dff"/><path d="M32 18c-3-3-1-6 0-9c1 3 3 6 0 9z" fill="#f3dcff"/><path d="M27 34l5 8l5-8M32 42v6" stroke="#c77dff" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="22" cy="25" r="1.5" fill="#c77dff"/><circle cx="42" cy="25" r="1.5" fill="#c77dff"/>`,
  moonwell: `<ellipse cx="32" cy="50" rx="24" ry="9" fill="#77808c"/><ellipse cx="32" cy="47" rx="24" ry="9" fill="#9aa4b0"/><ellipse cx="32" cy="47" rx="18" ry="6" fill="#7fd8ff"/><ellipse cx="29" cy="46" rx="7" ry="2" fill="#e6f8ff" opacity=".8"/><path d="M36 8a12 12 0 1 0 8 20a10 10 0 1 1-8-20z" fill="#e6ecff"/><path d="M32 30v10M24 34v6M40 34v6" stroke="#bfeaff" stroke-width="1.6" stroke-dasharray="2 2"/>`,
  sunspire: `<path d="M25 62l4-40h6l4 40z" fill="#e8dcc0"/><path d="M27 44h10M28 34h8" stroke="#b9a877" stroke-width="2"/><path d="M26 62h12v-9q-6-5-12 0z" fill="#8a6a2f"/><circle cx="32" cy="14" r="8" fill="#ffd34d"/><path d="M32 1v5M32 22v4M19 14h5M40 14h5M23 5l3.500 3.500M41 5l-3.500 3.500M23 23l3.500-3.500M41 23l-3.500-3.500" stroke="#ffb02e" stroke-width="2.2" stroke-linecap="round"/>`,
  assassin: fig({ ...ELF, skin: '#5a557d', body: '#1e1a2b', cloak: '#3a1d4a', hat: 'hood', hatc: '#3a1d4a', wpn: 'dagger', wc: '#c9f', eyes: '#ff3d6e', glow: '#ff3d6e' }),
  priestess: fig({ ...ELF, body: '#c7d3ee', robe: 1, trim: '#7f8fd0', hat: 'hair', hatc: '#e8ecff', wpn: 'staff', wc: '#bcd0ff', eyes: '#5a6fd0' }) + `<path d="M34 2a6 6 0 1 0 4 10a5 5 0 1 1-4-10z" fill="#e6ecff"/>`,
  sunchamp: big(fig({ ...ELF, body: '#e0a82e', trim: '#fff3c4', cloak: '#c2452d', hat: 'hair', hatc: '#f4d98a', shield: '#c2452d', wpn: 'sword', wc: '#ffe9a0', eyes: '#c2452d' })),
  matriarch: fig({ ...ELF, skin: '#6b6690', body: '#4a1f5c', robe: 1, trim: '#c9a0ff', hat: 'crown', hatc: '#c9a0ff', wpn: 'scythe', wc: '#d6c4ff', eyes: '#ff5c8a', cloak: '#2a1238' }),
  worldtree: `<path d="M26 62q3-14 0-26l-10-8 3-3 9 5 2-8h4l2 8 9-5 3 3-10 8q-3 12 0 26z" fill="#7a5632"/><circle cx="16" cy="20" r="11" fill="#2f7a3c"/><circle cx="48" cy="20" r="11" fill="#2f7a3c"/><circle cx="32" cy="13" r="14" fill="#3f9a4c"/><circle cx="23" cy="10" r="8" fill="#55b560"/><circle cx="42" cy="9" r="7" fill="#55b560"/><circle cx="20" cy="22" r="2" fill="#ffd34d"/><circle cx="44" cy="17" r="2" fill="#ffd34d"/><circle cx="33" cy="6" r="2" fill="#ffd34d"/><circle cx="31" cy="24" r="2" fill="#ffd34d"/><path d="M14 62h36" stroke="#3f9a4c" stroke-width="3" stroke-linecap="round"/>`,
  skeleton: fig({ ...SK, body: '#8f8a78', dark: '#0007', wpn: 'sword', wc: '#9aa39f' }),
  ghoul: fig({ skin: '#8fae7a', body: '#4a4436', eyes: '#f4ff7a', glow: '#f4ff7a', hat: 'hair', hatc: '#3a3a2e' }) + `<path d="M28 28l1.500 3 1.500-3 1.500 3 1.500-3 1.500 3" stroke="#fff" stroke-width="1" fill="none"/><path d="M10 50l5-6 1 6 3-5v8zM54 50l-5-6-1 6-3-5v8z" fill="#8fae7a"/>`,
  gravedigger: fig({ skin: '#c9c0a8', body: '#3d3a33', robe: 1, hat: 'cap', hatc: '#2a2824', wpn: 'spade' }),
  initiate: fig({ skin: '#d6b9a0', body: '#7a2030', robe: 1, hat: 'hood', hatc: '#5a1422', wpn: 'dagger' }),
  plague: fig({ skin: '#a9b86a', body: '#5a6a2a', robe: 1, hat: 'hood', hatc: '#3e4a1c', eyes: '#d8ff4d', wpn: 'staff', wc: '#b6e04a' }) + `<circle cx="10" cy="40" r="3" fill="#b6e04a" opacity=".7"/><circle cx="15" cy="30" r="2" fill="#b6e04a" opacity=".6"/><circle cx="9" cy="24" r="1.600" fill="#b6e04a" opacity=".5"/>`,
  necromancer: fig({ skin: '#cfd6c4', body: '#2c2440', robe: 1, trim: '#7dffb0', hat: 'hood', hatc: '#1c1630', wpn: 'staff', wc: '#7dffb0', eyes: '#7dffb0', glow: '#7dffb0' }),
  bloodcultist: fig({ skin: '#d6b9a0', body: '#a01c2c', robe: 1, trim: DARK, hat: 'horns', hatc: '#2a1216', wpn: 'scythe', wc: '#e0a0a0', eyes: '#ffdf5c' }),
  banshee: `<path d="M17 62q-2-22 4-36a11.500 11.500 0 0 1 22 0q6 14 4 36l-5-6-5 6-5-6-5 6-5-6z" fill="#bfe9ef" opacity=".85"/><path d="M12 40q-6-2-8-10q6 4 10 2zM52 40q6-2 8-10q-6 4-10 2z" fill="#bfe9ef" opacity=".7"/><ellipse cx="27.500" cy="24" rx="2.800" ry="3.800" fill="${DARK}"/><ellipse cx="36.500" cy="24" rx="2.800" ry="3.800" fill="${DARK}"/><ellipse cx="32" cy="34" rx="3.500" ry="5.500" fill="${DARK}"/>`,
  colossus: big(fig({ ...SK, body: '#b9b29a', dark: '#0006', hat: 'horns', hatc: BONE, glow: '#7dffb0', wpn: 'mace', wc: BONE })),
  lich: big(fig({ ...SK, body: '#2f3f6a', robe: 1, trim: '#7fd8ff', cloak: '#1c2644', hat: 'crown', hatc: '#7fd8ff', glow: '#7fd8ff', wpn: 'staff', wc: '#7fd8ff' })),
  pitlord: fig({ skin: '#d6b9a0', body: '#3a1420', robe: 1, trim: '#ff6a2e', cloak: '#5a1422', hat: 'horns', hatc: '#ff6a2e', wpn: 'book', wc: '#5a1422', eyes: '#ff6a2e', glow: '#ff6a2e' }) + `<path d="M6 60q3-9 0-14q6 4 5 14zM14 62q2-6 0-10q5 3 4 10z" fill="#ff6a2e"/>`,
  herald: big(fig({ skin: '#8a8f9a', body: '#1c1c22', trim: '#ff3d3d', cloak: '#6a1018', hat: 'great', hatc: '#2c2c34', wpn: 'banner', wc: '#ff3d3d' })),
  revenant: fig({ ...SK, body: '#3f4a52', dark: '#0007', cloak: '#26303a', hat: 'hood', hatc: '#26303a', glow: '#8fe8ff', wpn: 'sword', wc: '#8fe8ff' }),
  deathknight: big(fig({ ...SK, body: '#2a2f3a', trim: '#7fd8ff', cloak: '#14181f', hat: 'great', hatc: '#3a4250', shield: '#1c2230', wpn: 'sword', wc: '#bfeaff', glow: '#7fd8ff' })),
  plaguelord: big(fig({ skin: '#9fb85a', body: '#4a5a22', robe: 1, trim: '#d8ff4d', cloak: '#2e3a14', hat: 'crown', hatc: '#d8ff4d', eyes: '#1a2208', glow: '#d8ff4d', wpn: 'scythe', wc: '#b6e04a' })) + `<circle cx="9" cy="44" r="4" fill="#b6e04a" opacity=".7"/><circle cx="14" cy="30" r="2.500" fill="#b6e04a" opacity=".6"/><circle cx="7" cy="20" r="2" fill="#b6e04a" opacity=".5"/><circle cx="56" cy="56" r="3" fill="#b6e04a" opacity=".6"/>`,
  halberdier: fig({ body: '#56708f', hat: 'helm', hatc: STEEL, trim: '#c23b3b', wpn: 'scythe', wc: STEEL }),
  duelist: fig({ body: '#7a2f3a', trim: '#fff', hat: 'cap', hatc: '#26262c', wpn: 'sword', wc: '#e6ecf2' }),
  bishop: fig({ body: '#6a2c8a', robe: 1, trim: GOLD, hat: 'mitre', hatc: '#6a2c8a', wpn: 'staff', wc: '#fff3c4' }),
  stormmage: fig({ body: '#2f6f8a', robe: 1, trim: '#fff59a', hat: 'wizard', hatc: '#1f4f66', wpn: 'staff', wc: '#fff59a', glow: '#fff59a' }) + `<path d="M8 20l6 8-4 1 5 9" stroke="#fff59a" stroke-width="2" fill="none"/>`,
  champion: fig({ body: '#c9a13a', trim: '#fff', cloak: '#2f4f86', hat: 'crown', hatc: GOLD, wpn: 'sword', wc: '#fff3c4', shield: '#2f4f86' }),
  venom: fig({ ears: 1, skin: '#6b6690', body: '#27402a', hat: 'hood', hatc: '#1c2e1e', wpn: 'dagger', wc: '#9cff6a', eyes: '#9cff6a', glow: '#9cff6a' }),
  briar: fig({ ears: 1, body: '#4a6a2a', hat: 'leaves', hatc: '#3f8a45', shield: '#5a3f1e', wpn: 'mace', wc: '#8a6a3a' }),
  sunfire: fig({ ears: 1, body: '#d9772e', trim: '#ffe9a0', hat: 'hair', hatc: '#ffd34d', wpn: 'bow', wc: '#ff9a2e', eyes: '#c2452d' }),
  archon: big(fig({ ears: 1, body: '#dfe6ff', robe: 1, trim: '#7f8fd0', cloak: '#3d5688', hat: 'crown', hatc: '#bcd0ff', wpn: 'staff', wc: '#e6ecff', glow: '#7f8fd0' })),
  archdruid: fig({ ears: 1, body: '#3a5a2e', robe: 1, trim: GOLD, cloak: '#27401f', hat: 'horns', hatc: '#8a6a3a', wpn: 'staff', wc: '#7dff8a', eyes: '#27401f' }),
  collector: fig({ skin: '#cfd6c4', body: '#4a4034', robe: 1, trim: BONE, hat: 'cap', hatc: '#2e2820', wpn: 'staff', wc: BONE, eyes: '#7dffb0' }),
  boneshaper: fig({ skin: '#cfd6c4', body: '#3a3340', robe: 1, trim: BONE, hat: 'hood', hatc: '#2a2430', wpn: 'mace', wc: BONE, eyes: '#7dffb0' }),
  soulreaper: fig({ skin: '#b9b4c4', body: '#1a1a22', cloak: '#3a0c14', hat: 'hood', hatc: '#0e0e14', wpn: 'scythe', wc: '#ff8a8a', eyes: '#ff3d3d', glow: '#ff3d3d' }),
  rothound: quad('#6f8a3a', '#d8ff4d') + `<circle cx="24" cy="36" r="2.500" fill="#b6e04a"/><circle cx="34" cy="42" r="2" fill="#b6e04a"/>`,
  wolf: quad('#8a8f96', '#ffd34d'),
  bandit: fig({ body: '#5a4a3a', hat: 'hood', hatc: '#3a2e22', wpn: 'dagger' }) + `<rect x="23" y="24.500" width="18" height="5" rx="2" fill="#2a2018"/>`,
  shaman: fig({ skin: '#9fb07a', body: '#6a5a2a', robe: 1, hat: 'horns', hatc: BONE, wpn: 'staff', wc: '#7dffb0', eyes: '#2a2018' }),
  ogre: big(fig({ skin: '#8fa86a', body: '#5a4a3a', wpn: 'mace', wc: '#8a6a3a', eyes: '#2a2018' })),
  ogrelord: big(fig({ skin: '#7f9a5a', body: '#3a2a22', trim: GOLD, cloak: '#5a1f1f', hat: 'crown', hatc: GOLD, shield: '#5a1f1f', wpn: 'mace', wc: STEEL, eyes: '#ffd34d' })),
  bonedragon: `<path d="M4 54Q16 28 32 34Q48 28 60 54l-8-7-5 9-5-9-5 9-5-9-5 9-5-9-5 9-5-9z" fill="${BONE}" opacity=".85"/><rect x="30" y="26" width="4" height="34" fill="${BONE}"/><path d="M24 40h16M25 46h14M26 52h12" stroke="${BONE}" stroke-width="2.500"/><path d="M21 14Q32 0 43 14l-2 14q-9 7-18 0z" fill="${BONE}"/><path d="M23 12L12 1l10 16zM41 12L52 1 42 17z" fill="${BONE}"/><circle cx="27.500" cy="16" r="3" fill="${DARK}"/><circle cx="36.500" cy="16" r="3" fill="${DARK}"/><circle cx="27.500" cy="16" r="1.400" fill="#7dffb0"/><circle cx="36.500" cy="16" r="1.400" fill="#7dffb0"/><path d="M27 26l1.500 3 1.500-3 2 3 2-3 1.500 3 1.500-3" stroke="${DARK}" stroke-width="1.200" fill="none"/>`,
  titan: big(fig({ skin: '#8a8f96', body: '#6a7078', dark: '#0005', trim: '#ffb02e', eyes: '#ffb02e', glow: '#ffb02e', hat: 'helm', hatc: '#565c64' })) + `<path d="M20 44l6 4-3 6M44 40l-5 5 4 5" stroke="#ffb02e" stroke-width="1.600" fill="none"/>`,
  minion: small(fig({ ...SK, body: '#77735f', dark: '#0007' })),
  warrior: fig({ ...SK, body: '#6f6a5a', dark: '#0007', hat: 'helm', hatc: '#7d8489', shield: '#4a4a3e', wpn: 'sword', wc: '#9aa39f' }),
  imp: small(fig({ skin: '#e0563a', body: '#b03a26', hat: 'horns', hatc: '#3a1410', wings: '#8a2a1c', eyes: '#ffe04d' })),
  demon: fig({ skin: '#c2362a', body: '#7a1c18', hat: 'horns', hatc: '#2a0e0c', wings: '#5a1410', eyes: '#ffe04d', glow: '#ffe04d', wpn: 'sword', wc: '#ff8a4d' }),
  archdemon: big(fig({ skin: '#9a1c2a', body: '#3a0c14', trim: '#ff8a2e', hat: 'horns', hatc: '#ffb02e', wings: '#5a0c18', eyes: '#fff', glow: '#ffe04d', wpn: 'scythe', wc: '#ff8a4d' }))
};
const ITEMS = {
  sword: `<path d="M29 46V12l3-7 3 7v34z" fill="${STEEL}"/><rect x="21" y="44" width="22" height="5" rx="2" fill="${GOLD}"/><rect x="30" y="49" width="4" height="10" fill="${WOOD}"/>`,
  shield: `<path d="M12 10h40v24q-20 28-40 0z" fill="#35527d" stroke="${GOLD}" stroke-width="3"/><path d="M32 14v36M16 26h32" stroke="${GOLD}" stroke-width="3"/>`,
  tome: `<rect x="10" y="12" width="44" height="42" rx="4" fill="#4b3fa8"/><rect x="14" y="12" width="4" height="42" fill="${GOLD}"/><circle cx="35" cy="33" r="9" fill="none" stroke="#c9a0ff" stroke-width="3"/><path d="M35 26l2 5h5l-4 3.500 1.500 5.500-4.500-3-4.500 3 1.500-5.500-4-3.500h5z" fill="#c9a0ff"/>`,
  symbol: `<circle cx="32" cy="32" r="22" fill="#f1ecdd" stroke="${GOLD}" stroke-width="3"/><path d="M32 16v32M21 27h22" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>`,
  bow: `<path d="M22 6Q58 32 22 58" fill="none" stroke="${WOOD}" stroke-width="5" stroke-linecap="round"/><path d="M22 6V58" stroke="#ddd" stroke-width="2"/><path d="M10 32h40l-6-5m6 5l-6 5" stroke="#ddd" stroke-width="2.500" fill="none"/>`
};
const TR = {
  Tank: 'M2 1.5h8v4.5q0 3-4 4.5q-4-1.500-4-4.500z',
  DPS: 'M10.5 1.5l-1 5-1.500-1.500-5 5-1.500-1.500 5-5-1.500-1.500z',
  Mage: 'M6 .5l1.500 4 4 1.500-4 1.500-1.500 4-1.500-4-4-1.500 4-1.500z',
  Cleric: 'M4.800 1h2.400v3.800H11v2.400H7.200V11H4.800V7.200H1V4.800h3.800z',
  Party: 'M2 2h3v3H2zM7 2h3v3H7zM2 7h3v3H2zM7 7h3v3H7z',
  Grove: 'M2 10.500Q1 3 10.500 1.500Q11 9.500 4 9.800L7 5 2.800 11z',
  Sun: 'M6 3.200a2.800 2.800 0 1 0 0 5.600a2.800 2.800 0 0 0 0-5.600zM5.400 0h1.200v2H5.400zM5.400 10h1.200v2H5.400zM0 5.400h2v1.200H0zM10 5.400h2v1.200h-2z',
  Drow: 'M6 .5l1.400 2.500V7H9v1.200H6.800v3.300H5.200V8.200H3V7h1.600V3z',
  Moon: 'M8 1a5 5 0 1 0 3 8.500a4 4 0 1 1-3-8.500z',
  Building: 'M3 11V4.500H2v-3h1.500V3H5V1.500h2V3h1.500V1.500H10v3H9V11z',
  Reborn: 'M6 1a4 4 0 0 0-4 4v2.500l1.500 1V11h5V8.500l1.500-1V5a4 4 0 0 0-4-4zM4.300 4.300a1.100 1.100 0 1 1 0 2.200a1.100 1.100 0 0 1 0-2.200zM7.700 4.300a1.100 1.100 0 1 1 0 2.200a1.100 1.100 0 0 1 0-2.200z',
  Blight: 'M6 .8Q10 5.500 10 7.800a4 4 0 0 1-8 0Q2 5.500 6 .8z',
  Necromancer: 'M4 1h4l2 3-1.500 7h-5L2 4z',
  Cultist: 'M6 .5Q9.500 4 9.500 7.500a3.500 3.500 0 0 1-7 0Q2.500 5.500 4 4Q4.500 6 5.500 6Q5 3 6 .5z',
  Demon: 'M1.500 1Q2 5 4.500 6v5h3V6Q10 5 10.500 1Q8.500 4.500 6 4.500Q3.500 4.500 1.500 1z',
  Minion: 'M6 2l4 4-4 4-4-4z',
  Beast: 'M2 5.500a1.500 1.500 0 1 1 3 0a1.500 1.500 0 0 1-3 0zM7 5.500a1.500 1.500 0 1 1 3 0a1.500 1.500 0 0 1-3 0zM4.500 2.500a1.500 1.500 0 1 1 3 0a1.500 1.500 0 0 1-3 0zM3 9.500Q6 5 9 9.500Q6 11.500 3 9.500z',
  Boss: 'M1.500 9.500V3l2.500 2.500L6 2l2 3.500L10.500 3v6.500z'
};
const svg = s => `<svg viewBox="0 0 64 64" aria-hidden="true">${s}</svg>`;
root.ART = { tribe: t => `<svg viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${TR[t] || TR.Minion}"/></svg>`, unit: id => svg(UNITS[id] || ''), item: id => svg(ITEMS[id] || '') };
})(typeof window !== 'undefined' ? window : globalThis);
