(function () {
'use strict';
const W = window.WB, ART = window.ART, root = document.getElementById('app');
const S = { pickF: null, campFight: false, foeTitle: '', screen: 'pick', run: null, sel: null, insp: null, B: null, speed: 1, msg: '', result: null, foe: 'H', quitArm: false, save: '' };
const RAR = ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'], ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const n = v => Math.max(0, Math.round(v));
const thing = uid => S.run.things.find(t => t.uid === uid);
const stars = t => t > 1 ? `<span class="stars" aria-label="tier ${t}">${'★'.repeat(t)}</span>` : '';
const chip = k => `<span class="tb tb-${k}">${ART.tribe(k)}${k}</span>`;
const badges = list => `<span class="tis">${list.map(k => `<span class="ti tb-${k}" title="${k}">${ART.tribe(k)}</span>`).join('')}</span>`;
const itemArt = id => ART.item(W.ITEMS[id].base || id) + (W.ITEMS[id].base ? '<i class="iup">★</i>' : '');
const nameOf = t => t.kind === 'item' ? W.ITEMS[t.id].name : W.U[t.id].name;

function card(o, attrs, battle) {
  const d = W.U[o.id], st = W.stats(o);
  return `<div class="u f${d.f} t${o.tier || 1}${d.building ? ' bld' : ''}${d.token ? ' tok' : ''}${S.sel != null && S.sel === o.uid ? ' sel' : ''}" ${attrs}>
<div class="art">${ART.unit(o.id)}</div><i class="aimc" data-aim="${S.aims && o.uid != null && S.aims[o.uid] || ''}"></i>${badges(d.counts ? [...Array(d.counts).fill(st.tribes[0]), ...st.tribes.slice(1)] : st.tribes)}${stars(o.tier || 1)}${o.item ? `<span class="it">${itemArt(o.item)}</span>` : ''}
${battle ? '<span class="rotb" hidden></span><div class="bars"><div class="hpb"><i></i><u></u></div><div class="cdb"><i></i></div></div>' : ''}
<div class="st"><b class="a">${d.building ? '' : n(st.atk)}</b><b class="h">${n(st.hp)}</b></div></div>`;
}
const itemCard = (t, attrs) => `<div class="u item${S.sel === t.uid ? ' sel' : ''}" ${attrs}><div class="art">${itemArt(t.id)}</div><div class="st"><b class="lbl">Item</b></div></div>`;
const ownAttrs = o => `data-own="${o.uid}" data-insp="own:${o.uid}" draggable="true" tabindex="0" role="button" aria-label="${nameOf(o)}"`;
const span = (slot, size) => `style="grid-column:${slot + 1}/span ${size}"`;
const buHTML = u => card(u.o, `id="bu${u.bid}" ${span(u.slot, u.size)} data-insp="def:${u.d.id}:${u.o.tier || 1}"`, true);
const cells = (side, open, lvl) => ROMAN.map((r, i) => !open || open[i] ? `<div class="cell" style="grid-column:${i + 1}" ${side === 0 ? `data-slot="${i}"` : ''}><span>${r}</span></div>`
  : `<div class="cell locked" style="grid-column:${i + 1}" title="${side === 0 ? 'Opens at a higher shop level' : 'Closed for this opponent'}"><span>${side === 0 && lvl ? 'Lv ' + lvl(i) : '·'}</span></div>`).join('');
const unlockLevel = i => { for (let l = 1; l <= 9; l++) if (W.openArr(W.openCount(l))[i]) return l; return 9; };

const foeMul = run => run.enemy.mul > 1 ? ` · +${Math.round((run.enemy.mul - 1) * 100)}% health and attack` : '';
/* the shop view: only your own board. The opponent stays hidden until the fight starts. */
function boardHTML() {
  S.aims = null;
  const run = S.run, hp = W.heroHp(run.round);
  const me = W.boardUnits(run).map(o => card(o, `${span(o.slot, W.U[o.id].size)} ${ownAttrs(o)}`)).join('');
  const tag = run.enemy.boss ? '<b class="rtag boss">Boss round</b>' : run.post ? `<b class="rtag">${run.enemy.ghost ? 'Past warband' : 'Post-game opponent'}${foeMul(run)}</b>` : '';
  return `<section class="field shopfield" id="field">
<div class="hero p"><span class="ftitle">Your board</span><span>Round ${run.round}</span>${tag}<span class="grow"></span><span class="hid">Your opponent is revealed when the fight starts</span></div>
<div class="scroll"><div class="rows"><div class="row p tall" id="row0">${cells(0, W.openArr(W.openCount(run.level)), unlockLevel)}${me}</div></div></div>
<div class="hero p" id="hero0">${hport(run.leader)}<span>${run.leader ? W.LEADERS[run.leader].name : 'Your hero'}</span><div class="hbar"><i></i></div><b>${hp}</b></div>
</section>`;
}
/* active bonuses of one side in a battle */
function sideHTML(B, side) {
  const lv = B.syn[side], ks = Object.keys(lv).filter(k => lv[k] && W.TRIBES[k] && W.TRIBES[k].text[lv[k] - 1]);
  const lead = side === 0 ? S.run.leader : S.foeLead, L = lead && W.LEADERS[lead];
  return `<section class="panel side s${side}"><h2>${side === 0 ? 'Your warband' : 'The enemy'}</h2>${L ? `<p><b class="lname">${L.name}.</b> ${L.text}</p>` : ''}
${ks.length ? `<ul class="syn">${ks.map(k => `<li class="on"><span class="tb tb-${k}">${ART.tribe(k)}${k === 'Party' ? 'Full party' : k}</span><span class="ct">${lv[k]}<i>/${W.TRIBES[k].th.length}</i></span><small>${W.TRIBES[k].text[lv[k] - 1]}</small></li>`).join('')}</ul>` : '<p class="hint">No bonuses active.</p>'}</section>`;
}
function fieldHTML() {
  S.aims = null;
  const run = S.run, B = S.B, round = B ? B.round : run.round, hp = W.heroHp(round);
  const en = B ? B.units.filter(u => u.side === 1 && u.alive).map(buHTML).join('')
    : run.enemy.units.map(o => card(o, `${span(o.slot, W.U[o.id].size)} data-insp="enemy:${o.uid}"`)).join('');
  const me = B ? B.units.filter(u => u.side === 0 && u.alive).map(buHTML).join('')
    : W.boardUnits(run).map(o => card(o, `${span(o.slot, W.U[o.id].size)} ${ownAttrs(o)}`)).join('');
  const foe = B ? (S.foeTitle || W.FACTIONS[S.foe].name) : (run.enemy.title ? run.enemy.title + (run.enemy.boss ? '' : ' (' + W.FACTIONS[run.enemy.faction].name + ')') : W.FACTIONS[run.enemy.faction].name) + foeMul(run);
  return `<section class="field" id="field">
<div class="hero e${!B && run.enemy.boss ? ' boss' : ''}" id="hero1">${hport(B ? S.foeLead : run.enemy.leader)}<span>${B ? 'Enemy hero' : 'Next opponent'} · ${foe}</span><div class="hbar"><i></i></div><b>${hp}</b></div>
<div class="scroll"><div class="rows"><div class="row e" id="row1">${cells(1, B ? B.open[1] : W.openArr(run.enemy.open))}${en}</div>
<div class="mid"><span>vs</span></div>
<div class="row p" id="row0">${cells(0, B ? B.open[0] : W.openArr(W.openCount(run.level)), unlockLevel)}${me}</div>
<svg class="fx" id="fx" aria-hidden="true"><defs><marker id="ah0" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#f4c860"/></marker><marker id="ah1" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ff9488"/></marker></defs></svg></div></div>
<div class="hero p" id="hero0">${hport(run.leader)}<span>${run.leader ? W.LEADERS[run.leader].name : 'Your hero'}</span><div class="hbar"><i></i></div><b>${hp}</b></div>
</section>`;
}

function inspTarget() {
  const k = S.insp || (S.sel != null ? 'own:' + S.sel : null);
  if (!k || !S.run) return null;
  const [a, b, c] = k.split(':');
  if (a === 'own') { const t = S.run.things.find(x => x.uid === +b); return t ? { t, pv: null } : null; }
  if (a === 'enemy') { const t = S.run.enemy.units.find(x => x.uid === +b); return t ? { t } : null; }
  if (a === 'shop') { const s = S.run.shop[+b]; return s ? { t: s.kind === 'unit' ? { kind: 'unit', id: s.id, tier: 1 } : { kind: 'item', id: s.id } } : null; }
  if (a === 'def') return { t: { kind: 'unit', id: b, tier: +c } };
  return null;
}
const helpHTML = () => `<details class="panel helpbox" id="helpbox"${S.helpOpen ? ' open' : ''}><summary>How it works</summary><ul class="help"><li>Drop a unit on the board and its neighbours slide aside to make room. The outline shows where it will land.</li><li>Each unit attacks whatever stands in the slot opposite it.</li><li>With nothing opposite, it attacks the weaker enemy one slot to either side. Only with nothing in reach does it hit the enemy hero. The first hero to fall loses.</li><li>A hero with no units left takes triple damage.</li><li>You do not see your opponent until the fight starts, so build a board that holds up against anything.</li><li>In battle, the small marker on a unit's edge shows where it is aiming: in the middle for straight ahead, in a corner for a diagonal attack, and white when it is hitting the hero.</li><li>A unit wider than one slot attacks every enemy opposite it and splits its damage evenly between them.</li><li>Buy three of the same unit to upgrade it. An upgraded unit is twice as strong.</li><li>Three of the same item combine into a stronger one. Selling a unit returns its item to your bench.</li><li>Select a unit, then a slot, to move it. Dragging works too.</li><li>Right-click one of your units to sell it. Right-click a shop card to freeze it, so it stays through rerolls and into the next round.</li><li>Raising your shop level opens more slots, for you and for your summons.</li><li>Between rounds you choose one encounter: a fight with no life at stake, an event, or a shrine. Every fifth round is a boss, and beating it earns a relic.</li><li>Against a boss, units with nothing in reach attack the boss, not the hero.</li><li>In battle, the gold bar under a unit is its attack timer.</li></ul></details>`;
function detailHTML() {
  const x = inspTarget();
  if (!x) return '';
  const t = x.t;
  if (t.kind === 'item') { const it = W.ITEMS[t.id]; return `<div class="dhead"><div class="dart item">${itemArt(t.id)}</div><div><h3>${it.name}</h3><p class="sub">Item · ${it.cost} gold</p></div></div><p>${it.text}</p><p class="hint">Select it on your bench, then choose a unit to equip. Each unit holds one item.</p>`; }
  const d = W.U[t.id], st = W.stats(t);
  return `<div class="dhead"><div class="dart u f${d.f}">${ART.unit(t.id)}</div><div><h3 class="r${d.cost}">${d.name} ${stars(t.tier || 1)}</h3>
<p class="sub">${d.token ? 'Summon' : RAR[d.cost] + ' · ' + d.cost + ' gold'} · ${d.size} slot${d.size > 1 ? 's' : ''}</p><p class="chips">${st.tribes.map(chip).join('')}</p></div></div>
<p class="nums">${d.building ? '' : `<span class="a">${n(st.atk)} attack</span>`}<span class="h">${n(st.hp)} health</span>${d.building ? '' : `<span>every ${d.cd}s</span>`}</p>
<p>${d.txt(st.m)}</p>
${!d.token && (t.tier || 1) < 3 ? `<p class="hint">${[2, 3].filter(k => k > (t.tier || 1)).map(k => { const s2 = W.stats({ id: t.id, tier: k, item: t.item }); return `Tier ${k}: ${d.building ? '' : n(s2.atk) + ' attack, '}${n(s2.hp)} health`; }).join(' · ')}${t.gAtk || t.gHp ? ', plus growth' : ''}</p>` : ''}
${d.size > 1 && !d.building && !d.all ? `<p class="hint">Wide: attacks every enemy opposite it, splitting its damage evenly.</p>` : ''}
${x.pv ? `<p class="hint aimline"><b>Attacks first:</b> ${x.pv.hero ? 'the enemy hero (nothing in reach)' : [...new Set(x.pv.names)].join(', ') + (x.pv.diag ? ' (diagonal, nothing opposite)' : '')}</p>` : ''}
${d.grow ? `<p class="hint">Grows +${d.grow[0] * st.m} attack and +${d.grow[1] * st.m} health after each battle${t.gAtk || t.gHp ? ` (+${t.gAtk}/+${t.gHp} so far)` : ''}.</p>` : ''}
${t.item ? `<p class="hint"><b>${W.ITEMS[t.item].name}.</b> ${W.ITEMS[t.item].text}</p>` : ''}`;
}
function synHTML() {
  const run = S.run, { cnt, lv } = W.synergy(W.boardUnits(run));
  return Object.keys(W.TRIBES).filter(k => W.TRIBES[k].f === run.faction && W.TRIBES[k].th.length).map(k => {
    const T = W.TRIBES[k], c = cnt[k] || 0, l = lv[k] || 0;
    return `<li class="${l ? 'on' : ''}"><span class="tb tb-${k}">${ART.tribe(k)}${k === 'Party' ? 'Full party' : k}</span><span class="ct">${c}<i>/${T.th.find(x => x > c) || T.th[T.th.length - 1]}</i></span><small>${T.text[Math.max(0, l - 1)]}</small>${T.note ? `<small class="note">${T.note}</small>` : ''}</li>`;
  }).join('');
}
function shopHTML() {
  const run = S.run;
  const cards = run.shop.map((s, i) => {
    if (!s) return `<div class="card sold">Sold</div>`;
    if (s.kind === 'item') { const it = W.ITEMS[s.id]; const ic = W.priceOf(run, s); return `<button class="card item${run.gold < ic ? ' poor' : ''}${s.frozen ? ' frozen' : ''}" data-shop="${i}" data-insp="shop:${i}"><span class="cost">${ic}</span><span class="cart">${itemArt(s.id)}</span><b>${it.name}</b><small class="tribes">Item</small><small>${it.text}</small>${s.frozen ? '<em class="ice">Frozen</em>' : ''}</button>`; }
    const uc = W.priceOf(run, s), d = W.U[s.id], own = run.things.filter(t => t.kind === 'unit' && t.id === s.id && t.tier === 1).length;
    return `<button class="card f${d.f} r${d.cost}${own >= 2 ? ' up' : ''}${run.gold < uc ? ' poor' : ''}${s.frozen ? ' frozen' : ''}" data-shop="${i}" data-insp="shop:${i}"><span class="cost">${uc}</span><span class="cart">${ART.unit(s.id)}</span><b>${d.name}</b>
<span class="chips">${d.tribes.map(chip).join('')}</span>${d.size > 1 ? `<small class="tribes">Takes ${d.size} slots</small>` : ''}<span class="nums">${d.building ? '' : `<i class="a">${d.atk}</i>`}<i class="h">${d.hp + (d.flat || 0)}</i></span><small>${d.txt(1)}</small>${own ? `<em>${own >= 2 ? 'Completes an upgrade' : 'You own one'}</em>` : ''}${s.frozen ? '<em class="ice">Frozen</em>' : ''}</button>`;
  }).join('');
  const odds = W.ODDS[run.level - 1].map((p, i) => p ? `<i class="r${i + 1}">${p}%</i>` : '').join('');
  const need = run.level < 9 ? `${run.xp}/${W.XPNEED[run.level - 1]} XP` : 'max';
  return `<section class="panel"><div class="bar"><h2>Shop</h2><span class="odds" title="Chance of each rarity at this shop level">Level ${run.level} · ${W.openCount(run.level)} slots · ${need} · ${odds}</span>
</div><div class="bar acts"><span class="purse"><b>${run.gold}</b> gold</span><button data-act="xp" ${run.level >= 9 ? 'disabled' : ''}>Buy 4 XP <b class="g">4</b></button><button data-act="reroll">Reroll <b class="g">2</b></button><span class="econ" title="Interest: 1 gold per 10 held when the battle ends, up to 3. Winning adds 1 more.">+${W.income(run)} next round (${W.income(run) - W.interest(run)} base, ${W.interest(run)} interest${W.interest(run) < 3 ? `; ${10 - run.gold % 10} more gold for +1` : ''})</span><button class="primary" data-act="fight">Fight</button></div>
<div class="shop">${cards}</div></section>`;
}
function benchHTML() {
  const run = S.run; let h = '';
  for (let i = 0; i < W.BENCH; i++) { const t = run.things.find(x => x.bench === i); h += `<div class="bcell" data-bench="${i}">${t ? (t.kind === 'item' ? itemCard(t, ownAttrs(t)) : card(t, ownAttrs(t))) : ''}</div>`; }
  const sel = S.sel != null ? thing(S.sel) : null;
  return `<section class="panel"><div class="bar"><h2>Bench</h2><span class="grow"></span>${sel ? `<button data-act="sell">Sell ${nameOf(sel)} for <b class="g">${W.sellValue(sel, run)}</b></button>` : '<span class="odds">Select a unit to move or sell it</span>'}</div><div class="bench">${h}</div></section>`;
}
function headHTML() {
  const run = S.run;
  return `<header class="top"><h1>Warband</h1><div class="stats"><span>Round <b>${run.round}</b></span>${run.post ? `<span>Past warbands beaten <b>${run.post.n}</b></span>` : `<span>Wins <b>${run.wins}/${W.MAXWINS}</b></span>`}
<span class="lives" aria-label="${run.lives} lives left">${'<i class="on"></i>'.repeat(Math.max(0, run.lives))}${'<i></i>'.repeat(W.LIVES - Math.max(0, run.lives))}</span>
<button class="ghost" data-act="quit">${S.quitArm ? 'Press again to abandon' : 'Abandon run'}</button></div></header>`;
}
const hasPort = k => !!(k && window.PORTRAIT && PORTRAIT.ids.includes(k));
const port = (k, cls) => hasPort(k) ? `<span class="port ${cls || ''}" title="${W.LEADERS[k].name}">${PORTRAIT.leader(k)}</span>` : '';
const hport = k => hasPort(k) ? `<span class="hport" title="${W.LEADERS[k].name}">${PORTRAIT.head(k)}</span>` : '';
function leaderPanel() {
  const run = S.run, L = run.leader && W.LEADERS[run.leader];
  return `<section class="panel"><h2>Leader and relics</h2>${L ? `<div class="lead">${port(run.leader, 'sm')}<p><b class="lname">${L.name}.</b> ${L.text}</p></div>` : '<p class="hint">No leader.</p>'}
${run.relics.length ? `<ul class="relics">${run.relics.map(k => `<li><b>${W.RELICS[k].name}.</b> ${W.RELICS[k].text}</li>`).join('')}</ul>` : '<p class="hint">No relics yet. Hard camps, shrines and bosses give them.</p>'}</section>`;
}
function leaderHTML() {
  const f = S.pickF;
  return `<div class="wrap pick"><header class="intro"><h1>Choose a leader</h1><p class="lede">Each leader of the ${W.FACTIONS[f].name} bends the run toward a different kind of warband. The choice lasts the whole run.</p></header>
<div class="factions">${Object.keys(W.LEADERS).filter(k => W.LEADERS[k].f === f).map(k => { const L = W.LEADERS[k]; return `<button class="fac f${f}" data-act="leader:${k}">${hasPort(k) ? port(k, 'big') : `<span class="crest one"><span class="u f${f}">${ART.unit(L.art)}</span></span>`}<h2>${L.name}</h2><p>${L.text}</p><span class="go">Lead with ${L.name.replace('The ', 'the ')}</span></button>`; }).join('')}</div>
<p><button class="ghost" data-act="back">Back to factions</button></p></div>`;
}
function rewardText(c) { const r = c.reward; return r.relic ? `Relic: ${W.RELICS[r.relic].name}. ${W.RELICS[r.relic].text}` : r.unit ? `A free ${W.U[r.unit].name}.` : `${r.gold} gold.`; }
function encounterHTML() {
  const run = S.run, o = run.offer;
  const cards = o.cards.map((c, i) => {
    if (c.type === 'relic') return `<button class="fac enc relic" data-act="enc:${i}"><span class="tag">Relic</span><h2>${W.RELICS[c.relic].name}</h2><p>${W.RELICS[c.relic].text}</p><span class="go">Take it</span></button>`;
    if (c.type === 'event') { const E = W.EVENTS[c.id]; return `<button class="fac enc event" data-act="enc:${i}"><span class="tag">Event · no fight</span><h2>${E.name}</h2><p>${E.text(run)}</p><span class="go">Accept</span></button>`; }
    if (c.type === 'shrine') return `<button class="fac enc shrine" data-act="enc:${i}"><span class="tag">Shrine · costs a life</span><h2>Blood shrine</h2><p>Give up 1 of your ${run.lives} lives and take the ${W.RELICS[c.relic].name}. ${W.RELICS[c.relic].text}</p><span class="go">Pay the price</span></button>`;
    return `<button class="fac enc camp${c.hard ? ' hard' : ''}" data-act="enc:${i}"><span class="tag">${c.hard ? 'Hard fight' : 'Easy fight'} · no life at stake</span><h2>${c.name}</h2>
<span class="row mini" style="grid-template-columns:repeat(${c.units.reduce((a, t) => a + W.U[t.id].size, 0)},minmax(0,1fr))">${c.units.slice().sort((a, b) => a.slot - b.slot).map(t => card(t, `style="grid-column:span ${W.U[t.id].size}"`)).join('')}</span>
<p><b>If you win:</b> ${rewardText(c)}</p><span class="go">Fight</span></button>`;
  }).join('');
  return `<div class="wrap">${headHTML()}<p class="msg" role="status">${S.msg || '&nbsp;'}</p><header class="intro"><h1 class="h1s">${o.kind === 'relics' ? 'Spoils of the boss' : 'On the road to round ' + run.round}</h1><p class="lede">${o.kind === 'relics' ? 'Choose one relic to keep for the rest of the run.' : 'Choose one before you reach the shop.'}</p></header>
<div class="factions">${cards}</div>
<div class="cols"><main><section class="field"><div class="hero p"><span>Your board</span></div><div class="scroll"><div class="rows"><div class="row p">${cells(1, W.openArr(W.openCount(run.level)))}${W.boardUnits(run).map(t => card(t, `${span(t.slot, W.U[t.id].size)}`)).join('')}</div></div></div></section></main><aside>${leaderPanel()}</aside></div></div>`;
}
function pickHTML() {
  const show = { H: ['footman', 'priest', 'archmage'], E: ['scout', 'sunspire', 'matriarch'], U: ['skeleton', 'necromancer', 'herald'] };
  return `<div class="wrap pick"><header class="intro"><h1>Warband</h1><p class="lede">Draft a single row of ten slots. Each unit strikes whatever stands opposite it, and anything left unblocked hits the enemy hero. Win ten battles before you lose five.</p></header>
<div class="factions">${Object.keys(W.FACTIONS).filter(f => f !== 'N').map(f => `<button class="fac f${f}" data-act="pick:${f}"><span class="crest">${show[f].map(id => `<span class="u f${f}">${ART.unit(id)}</span>`).join('')}</span><h2>${W.FACTIONS[f].name}</h2><p>${W.FACTIONS[f].blurb}</p>
<p class="chips">${Object.keys(W.TRIBES).filter(k => W.TRIBES[k].f === f && W.TRIBES[k].th.length && k !== 'Party').map(chip).join('')}</p><span class="go">Lead the ${W.FACTIONS[f].name}</span></button>`).join('')}</div></div>`;
}
function logRows() {
  return S.run.log.map(L => {
    const b = L.battle, mine = b.units.filter(x => x.side === 'you').sort((x, y) => (y.dealt + y.hero) - (x.dealt + x.hero))[0];
    const res = L.result === 'win' ? 'Win' : L.result === 'loss' ? 'Loss' : 'Draw';
    return `<tr class="${L.result}"><td>${L.round}</td><td>${W.FACTIONS[L.enemy.faction].name}</td><td><b>${res}</b></td><td>${b.heroHp[0]} / ${b.heroMax}</td><td>${b.heroHp[1]} / ${b.heroMax}</td><td>${b.time}s${b.sudden ? ' (sudden death)' : ''}</td><td>${mine ? W.U[mine.id].name + ' · ' + (mine.dealt + mine.hero) : ''}</td></tr>`;
  }).join('');
}
function endHTML() {
  const run = S.run, won = run.over === 'won';
  return `<div class="wrap pick"><header class="intro withport">${port(run.leader, 'mid')}<div><h1>${won ? 'The realm is yours' : 'Your warband has fallen'}</h1>${run.post ? `<p class="lede"><b>After the crown: ${run.post.n} past warband${run.post.n === 1 ? '' : 's'} beaten.</b></p>` : ''}<p class="lede">${run.wins} win${run.wins === 1 ? '' : 's'} over ${run.log.length} round${run.log.length === 1 ? '' : 's'} leading the ${W.FACTIONS[run.faction].name}${run.leader ? ' under ' + W.LEADERS[run.leader].name.replace('The ', 'the ') : ''}${run.relics.length ? ', carrying ' + run.relics.map(k => W.RELICS[k].name).join(', ') : ''}.</p></div></header>
<section class="field"><div class="scroll"><div class="rows"><div class="row p">${cells(1, W.openArr(W.openCount(run.level)))}${W.boardUnits(run).map(o => card(o, `${span(o.slot, W.U[o.id].size)} data-insp="own:${o.uid}"`)).join('')}</div></div></div></section>
<section class="panel"><div class="bar"><h2>Run log</h2><span class="odds" id="save" role="status">${S.save || ''}</span><span class="grow"></span><button data-act="copylog">Copy run log</button>${won && !run.post ? `<button data-act="newrun">Start a new run</button><button class="primary" data-act="keepgoing" title="Keep this warband and fight the boards of your past winning runs, each stronger than the last, until your lives run out.">Keep going</button>` : `<button class="primary" data-act="newrun">Start a new run</button>`}</div>
<div class="scroll"><table class="log"><thead><tr><th>Round</th><th>Opponent</th><th>Result</th><th>Your hero</th><th>Enemy hero</th><th>Length</th><th>Your top damage</th></tr></thead><tbody>${logRows()}</tbody></table></div>
<details id="rawlog"><summary>Show the full log as text</summary><textarea id="rawtext" readonly rows="8" aria-label="Full run log"></textarea></details></section></div>`;
}
function setSave(t) { S.save = t; const e = document.getElementById('save'); if (e) e.textContent = t; }
async function saveLog() {
  const run = S.run; if (!run || run.saved) return;
  run.saved = true; setSave('Saving the run log…');
  try {
    const db = window.claude && window.claude.use ? await window.claude.use('db') : null;
    if (!db) { run.saved = false; setSave("Couldn't reach storage. Use Copy run log and paste it into the chat."); return; }
    const x = W.exportLog(run);
    run.docId = run.docId || 'run-' + Date.now();
    await db.collection('runs').doc(run.docId).set({ ended: x.ended, faction: x.faction, outcome: x.outcome, wins: x.wins, rounds: x.rounds, bal: x.bal, post: x.post == null ? -1 : x.post, json: JSON.stringify(x) });
    setSave('Run log saved. Ask Claude to look at your last run.');
  } catch (err) { run.saved = false; setSave("Couldn't save the run log. Use Copy run log and paste it into the chat."); }
}
/* the final boards of past winning runs, for the post-game. Any failure just means generated opponents. */
async function loadGhosts(skip) {
  try {
    const db = window.claude && window.claude.use ? await window.claude.use('db') : null; if (!db) return [];
    const snap = await Promise.race([db.collection('runs').where('outcome', '==', 'won').get(), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 10000))]);
    const out = [];
    for (const d of snap.docs) { if (d.id === skip) continue; let x = null; try { x = JSON.parse(d.data().json); } catch (err) { continue; } const g = W.ghostFrom(x, d.id); if (g) out.push(g); }
    return out;
  } catch (err) { return []; }
}
async function keepGoing() {
  const run = S.run; if (!run || run.over !== 'won' || run.post || S.loading) return;
  S.loading = true; setSave('Gathering your past warbands…');
  const gs = await loadGhosts(run.docId);
  S.loading = false; if (S.run !== run || !W.continueRun(run, gs)) return;
  S.save = ''; S.msg = gs.length ? `${gs.length} past warband${gs.length === 1 ? '' : 's'} to face, weakest first. Each fight you win makes the next one 15% stronger.` : 'No past winning boards to face yet, so these are fresh opponents. Each fight you win makes the next one 15% stronger.';
  if (run.lives === 3) S.msg += ' You go in with at least 3 lives.';
  S.screen = 'shop'; S.sel = null; S.insp = null; render();
}
/* unit details float beside whatever is hovered, focused or (on touch) selected */
let tipT = null;
const tipEl = () => { let t = document.getElementById('tip'); if (!t) { t = document.createElement('div'); t.id = 'tip'; t.className = 'tip'; t.setAttribute('role', 'tooltip'); t.hidden = true; document.body.appendChild(t); } return t; };
function hideTip() { clearTimeout(tipT); tipT = null; const t = document.getElementById('tip'); if (t) t.hidden = true; }
function placeTip(a) {
  const t = tipEl(), html = a && a.isConnected ? detailHTML() : ''; if (!html) { t.hidden = true; return; }
  t.innerHTML = html; t.hidden = false; t.style.left = '0px'; t.style.top = '0px';
  const r = a.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, g = 10;
  let x, y;
  if (a.closest('#row0') && r.bottom + g + h <= vh - 8) { t.style.left = Math.round(Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2))) + 'px'; t.style.top = Math.round(r.bottom + g) + 'px'; return; } // your own row: drop below it, over the bench, so the board stays visible
  if (r.right + g + w <= vw - 8) x = r.right + g; else if (r.left - g - w >= 8) x = r.left - g - w; else x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
  if (x >= r.right || x + w <= r.left) y = Math.max(8, Math.min(vh - h - 8, r.top)); else y = r.bottom + g + h <= vh - 8 ? r.bottom + g : Math.max(8, r.top - g - h);
  t.style.left = Math.round(x) + 'px'; t.style.top = Math.round(y) + 'px';
}
function showTip(a, now) { clearTimeout(tipT); const t = document.getElementById('tip'); if (now || (t && !t.hidden)) placeTip(a); else tipT = setTimeout(() => placeTip(a), 220); }
function afterRender() {
  hideTip();
  if (S.touch && S.sel != null && S.screen === 'shop') { const el = root.querySelector(`[data-own="${S.sel}"]`); if (el) { S.insp = null; showTip(el, true); } }
}
function render() { render0(); afterRender(); }
function render0() {
  if (S.screen === 'pick') { root.innerHTML = pickHTML(); return; }
  if (S.screen === 'leader') { root.innerHTML = leaderHTML(); return; }
  if (S.screen === 'encounter') { S.aims = null; root.innerHTML = encounterHTML(); return; }
  if (S.screen === 'end') { root.innerHTML = endHTML(); document.getElementById('rawtext').value = JSON.stringify(W.exportLog(S.run)); saveLog(); return; }
  if (S.screen === 'summary') { root.innerHTML = summaryHTML(); const g = document.getElementById('sumgo'); if (g) g.focus(); return; }
  if (S.screen === 'battle') {
    const B = S.B, foe = S.foeTitle || W.FACTIONS[S.foe].name;
    root.innerHTML = `<div class="wrap battle">${headHTML()}
<div class="vs"><h2>${S.campFight ? 'Camp' : 'Round ' + B.round}</h2><p><b>${S.run.leader ? W.LEADERS[S.run.leader].name : 'Your warband'}</b> against <b>${foe}</b>${!S.campFight && S.foeTitle && S.foe !== 'N' ? ' (' + W.FACTIONS[S.foe].name + ')' : ''}</p></div>
${fieldHTML()}
<section class="panel"><div class="bar"><h2>Battle</h2><span class="odds" id="clock">0s</span><span class="grow"></span>${[1, 2, 4].map(x => `<button data-act="speed:${x}" class="${S.speed === x ? 'active' : ''}">${x}×</button>`).join('')}<button data-act="skip">Skip to result</button></div></section>
<div class="sides">${sideHTML(B, 0)}${sideHTML(B, 1)}</div></div>`;
    return;
  }
  root.innerHTML = `<div class="wrap">${headHTML()}<p class="msg" role="status">${S.msg || '&nbsp;'}</p><div class="cols"><main>${boardHTML()}
${benchHTML() + shopHTML()}</main>
<aside>${leaderPanel()}<section class="panel"><h2>${W.FACTIONS[S.run.faction].name} bonuses</h2><ul class="syn">${synHTML()}</ul></section>${helpHTML()}</aside></div></div>`;
  drawPreview();
}

/* ---- attack lines ---- */
const NS = 'http://www.w3.org/2000/svg';
function fxLine(fromEl, toEl, side, cls, ttl) {
  const svg = document.getElementById('fx'); if (!svg || !fromEl) return;
  const R = svg.getBoundingClientRect(), a = fromEl.getBoundingClientRect();
  const x1 = a.left + a.width / 2 - R.left, y1 = a.top + a.height / 2 - R.top; let x2 = x1, y2 = side === 0 ? 4 : R.height - 4;
  if (toEl) { const b = toEl.getBoundingClientRect(); x2 = b.left + b.width / 2 - R.left; y2 = b.top + b.height / 2 - R.top; }
  const l = document.createElementNS(NS, 'line'), k0 = toEl ? .3 : .45, k1 = toEl ? .78 : 1;
  l.setAttribute('x1', x1 + (x2 - x1) * k0); l.setAttribute('y1', y1 + (y2 - y1) * k0); l.setAttribute('x2', x1 + (x2 - x1) * k1); l.setAttribute('y2', y1 + (y2 - y1) * k1);
  l.setAttribute('class', 'tr s' + side + ' ' + cls); l.setAttribute('marker-end', `url(#ah${side})`);
  svg.appendChild(l); if (ttl) setTimeout(() => l.remove(), ttl);
}
function drawPreview() {
  document.querySelectorAll('.tr.pv').forEach(e => e.remove()); document.querySelectorAll('.aimed').forEach(e => e.classList.remove('aimed'));
  if (S.screen !== 'shop') return;
  const x = inspTarget(); if (!x || !x.pv) return;
  const from = root.querySelector(`.row.p [data-own="${x.t.uid}"]`); if (!from) return;
  if (x.pv.hero) { const h = document.getElementById('hero1'); if (h) h.classList.add('aimed'); return; }
  for (const id of x.pv.to) { const to = root.querySelector(`[data-insp="enemy:${id}"]`); if (to) to.classList.add('aimed'); }
}

/* ---- battle playback ---- */
let raf = 0, last = 0, els = {};
function bind() { els = {}; for (const u of S.B.units) { const e = document.getElementById('bu' + u.bid); if (e) els[u.bid] = e; } }
function float(el, text, cls) {
  if (!el || el.querySelectorAll('.fl').length > 3) return;
  const s = document.createElement('span'); s.className = 'fl ' + cls; s.textContent = text; s.style.left = (30 + Math.random() * 40) + '%';
  el.appendChild(s); setTimeout(() => s.remove(), 700);
}
function drain(B) {
  for (const e of B.ev) {
    const el = els[e.b];
    if (e.t === 'summon') { const u = B.units.find(x => x.bid === e.b); if (u && u.alive) { document.getElementById('row' + u.side).insertAdjacentHTML('beforeend', buHTML(u)); const ne = document.getElementById('bu' + u.bid); ne.classList.add('spawn'); els[u.bid] = ne; } }
    else if (e.t === 'die') { if (el) { el.classList.add('dead'); el.removeAttribute('id'); setTimeout(() => el.remove(), 350); delete els[e.b]; } }
    else if (e.t === 'hit') { if (e.v >= 1) float(el, (e.flank ? 'Flank ' : '') + '-' + n(e.v), e.crit ? 'crit' : e.flank ? 'flank' : 'dmg'); }
    else if (e.t === 'heal') { if (e.v >= 1) float(el, '+' + n(e.v), 'heal'); }
    else if (e.t === 'revive') float(el, 'Rises', 'heal');
    else if (e.t === 'buff') float(el, '+' + n(e.a) + '/+' + n(e.h), 'heal');
    else if (e.t === 'buff') float(el, '+' + n(e.a) + '/+' + n(e.h), 'heal');
    else if (e.t === 'atk') { if (el) { el.classList.remove('lunge'); void el.offsetWidth; el.classList.add('lunge'); } }
    else if (e.t === 'hero') { const h = document.getElementById('hero' + e.side); if (h) { h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash'); } }
  }
  B.ev.length = 0;
}
function paint(B) {
  for (const u of B.units) {
    const el = els[u.bid]; if (!el || !u.alive) continue;
    el.querySelector('.hpb i').style.width = Math.max(0, u.hp / u.maxhp * 100) + '%';
    el.querySelector('.hpb u').style.width = Math.min(100, u.shield / u.maxhp * 100) + '%';
    el.querySelector('.cdb i').style.width = (u.d.building ? (u.d.every ? u.at / u.d.every : 0) : Math.min(1, u.t / u.cd)) * 100 + '%';
    el.querySelector('.h').textContent = Math.max(1, n(u.hp));
    if (!u.d.building) el.querySelector('.a').textContent = n(W.effAtk(u));
    const rb = el.querySelector('.rotb'); if (u.rot > 0) { rb.hidden = false; rb.textContent = u.rot; } else rb.hidden = true;
    const ac = el.querySelector('.aimc'), dir = W.aimDir(B, u); if (ac && ac.dataset.aim !== dir) ac.dataset.aim = dir;
    el.classList.toggle('weak', u.weak > 0 || u.rot > 0); el.classList.toggle('rot', u.rot > 0); el.classList.toggle('burn', u.burnT > 0);
  }
  for (const s of [0, 1]) { const h = document.getElementById('hero' + s); if (!h) continue; h.querySelector('i').style.width = Math.max(0, B.hero[s].hp / B.hero[s].max * 100) + '%'; h.querySelector('b').textContent = n(B.hero[s].hp); }
  const c = document.getElementById('clock'); if (c) c.textContent = Math.floor(B.time) + 's' + (B.sudden ? ' · Sudden death: both heroes are taking damage' : '');
}
function frame(ts) {
  const B = S.B; if (!B || S.screen !== 'battle' || S.result) return;
  let acc = Math.min(.1, (ts - last) / 1000) * S.speed; last = ts;
  while (acc > 1e-6 && !B.over) { const d = Math.min(.05, acc); W.step(B, d); acc -= d; }
  drain(B); paint(B);
  if (B.over) endBattle(); else raf = requestAnimationFrame(frame);
}
function startBattle() {
  const run = S.run;
  if (!W.boardUnits(run).length) { S.msg = 'Put at least one unit on the board first.'; render(); return; }
  S.campFight = false; S.foeLead = run.enemy.leader || null; S.foeTitle = (run.enemy.title || (run.post ? W.FACTIONS[run.enemy.faction].name : '')) + (run.post ? foeMul(run) : ''); S.foe = run.enemy.faction; S.B = W.startBattle(run); S.screen = 'battle'; S.sel = null; S.insp = null; S.result = null; S.msg = '';
  render(); bind(); paint(S.B); last = performance.now(); raf = requestAnimationFrame(frame);
}
function startCamp() {
  const run = S.run;
  if (!W.boardUnits(run).length) { run.camp = null; S.msg = 'You had no units on the board, so you passed the camp by.'; S.screen = 'shop'; render(); return; }
  S.campFight = true; S.foeLead = null; S.foeTitle = run.camp.name; S.foe = 'N'; S.B = W.startCamp(run); S.screen = 'battle'; S.sel = null; S.insp = null; S.result = null; S.msg = '';
  render(); bind(); paint(S.B); last = performance.now(); raf = requestAnimationFrame(frame);
}
function endBattle() {
  const rep = W.battleReport(S.B), foe = S.foeTitle || W.FACTIONS[S.foe].name;
  if (S.campFight) {
    const c = W.finishCamp(S.run, S.B); S.result = { camp: true };
    S.sum = { rep, res: c.win ? 'win' : 'draw', title: c.win ? 'Camp cleared' : 'Driven off', bits: [c.msg, 'No life was at stake.'], foe, go: 'On to the shop', round: 'Camp' };
  } else {
    const run = S.run, wasBoss = run.enemy.boss, round = S.B.round, r = W.finishBattle(run, S.B); S.result = r;
    if (run.over) saveLog();
    const bits = [];
    if (r.res === 'loss') bits.push(run.lives > 0 ? `You lose a life. ${run.lives} left.` : 'That was your last life.');
    if (!run.over) bits.push(`+${r.income} gold.`);
    if (r.grown) bits.push(`${r.grown} unit${r.grown > 1 ? 's' : ''} grew stronger.`);
    if (wasBoss && r.res === 'win' && !run.over) bits.push('The boss leaves a relic behind.');
    S.sum = { rep, res: r.res, title: r.res === 'win' ? 'Victory' : r.res === 'loss' ? 'Defeat' : 'Draw', bits, foe, go: run.over ? 'See how it ended' : 'Continue', round: 'Round ' + round };
  }
  cancelAnimationFrame(raf); S.screen = 'summary'; render();
}
/* after every fight: who did what */
function summaryHTML() {
  const Z = S.sum, b = Z.rep, num = v => Math.round(v || 0).toLocaleString('en');
  const rows = side => { const out = [];
    for (const u of b.units.filter(x => x.side === side)) {
      let g = u.summoned ? out.find(x => x.sum && x.id === u.id) : null;
      if (!g) { g = { id: u.id, tier: u.tier, sum: !!u.summoned, n: 0, dealt: 0, hero: 0, taken: 0, healed: 0, alive: 0, hp: 0, died: 0 }; out.push(g); }
      g.n++; g.dealt += u.dealt; g.hero += u.hero; g.taken += u.taken; g.healed += u.healed || 0; if (u.died == null) { g.alive++; g.hp += u.hpLeft; } else g.died = Math.max(g.died, u.died);
    }
    return out.sort((p, q) => q.dealt + q.hero - p.dealt - p.hero); };
  const me = rows('you'), en = rows('enemy'), top = Math.max(1, ...me.concat(en).map(r => r.dealt + r.hero));
  const nm = r => W.U[r.id].name + (r.n > 1 ? ' ×' + r.n : '');
  const fate = r => r.n > 1 ? (r.alive ? `${r.alive} of ${r.n} survived` : 'All fell') : r.alive ? `Survived · ${num(r.hp)} health` : `Fell at ${r.died}s`;
  const table = (list, side) => { const t = list.reduce((a, r) => ({ dealt: a.dealt + r.dealt, hero: a.hero + r.hero, taken: a.taken + r.taken, healed: a.healed + r.healed }), { dealt: 0, hero: 0, taken: 0, healed: 0 });
    return `<div class="scroll"><table class="bstat"><thead><tr><th>Unit</th><th class="bcol">Damage</th><th>To units</th><th>To hero</th><th>Taken</th><th>Healed</th><th>Outcome</th></tr></thead><tbody>${list.map(r => `<tr class="${r.alive ? '' : 'gone'}"><td><div class="un"><span class="ic u f${W.U[r.id].f}">${ART.unit(r.id)}</span><span>${nm(r)} ${stars(r.tier || 1)}${r.sum ? '<small>summoned</small>' : ''}</span></div></td>
<td class="bcol"><span class="dbar" title="${num(r.dealt)} to units, ${num(r.hero)} to the hero"><i class="du" style="width:${(r.dealt / top * 100).toFixed(1)}%"></i><i class="dh" style="width:${(r.hero / top * 100).toFixed(1)}%"></i></span></td>
<td>${num(r.dealt)}</td><td>${r.hero ? num(r.hero) : '–'}</td><td>${num(r.taken)}</td><td>${r.healed ? num(r.healed) : '–'}</td><td class="fate">${fate(r)}</td></tr>`).join('')}</tbody>
<tfoot><tr><td>Total</td><td class="bcol"></td><td>${num(t.dealt)}</td><td>${num(t.hero)}</td><td>${num(t.taken)}</td><td>${t.healed ? num(t.healed) : '–'}</td><td></td></tr></tfoot></table></div>`; };
  const lost = [b.heroMax - b.heroHp[0], b.heroMax - b.heroHp[1]], notes = [];
  const big = list => list.slice().sort((p, q) => q.hero - p.hero)[0];
  if (Z.res !== 'win') { const t = big(en); if (t && t.hero > 0) notes.push(`Their ${nm(t)} dealt ${num(t.hero)} of the ${num(lost[0])} damage your hero took.`); }
  if (Z.res !== 'loss') { const t = big(me); if (t && t.hero > 0) notes.push(`Your ${nm(t)} dealt ${num(t.hero)} of the ${num(lost[1])} damage their hero took.`); }
  const fx = b.effects || { you: {}, enemy: {} };
  if (fx.you.rot || fx.you.burn) notes.push(`Your ${[fx.you.rot ? 'Rot dealt ' + num(fx.you.rot) : '', fx.you.burn ? 'burn dealt ' + num(fx.you.burn) : ''].filter(Boolean).join(' and ')} to their units, on top of the figures below.`);
  if (fx.enemy.rot || fx.enemy.burn) notes.push(`Their ${[fx.enemy.rot ? 'Rot dealt ' + num(fx.enemy.rot) : '', fx.enemy.burn ? 'burn dealt ' + num(fx.enemy.burn) : ''].filter(Boolean).join(' and ')} to your units.`);
  if (b.sudden) notes.push('The fight went to sudden death.');
  const hero = (label, i) => `<div class="tile"><small>${label}</small><b>${num(b.heroHp[i])} <i>/ ${num(b.heroMax)}</i></b><span class="hpb"><i style="width:${Math.max(0, b.heroHp[i] / b.heroMax * 100).toFixed(1)}%"></i></span></div>`;
  return `<div class="wrap battle">${headHTML()}
<section class="result ${Z.res}"><div><h2>${Z.title}</h2><p>${Z.bits.join(' ')}</p></div><span class="grow"></span><button class="primary" data-act="continue" id="sumgo">${Z.go}</button></section>
<div class="tiles"><div class="tile"><small>${Z.round}</small><b>${S.run.leader ? W.LEADERS[S.run.leader].name.replace('The ', '') : 'You'} <i>against</i> ${Z.foe}</b></div>${hero('Your hero', 0)}${hero('Enemy hero', 1)}<div class="tile"><small>Length</small><b>${b.time}s</b></div></div>
${notes.length ? `<section class="panel"><h2>What decided it</h2><ul class="notes">${notes.map(x => `<li>${x}</li>`).join('')}</ul></section>` : ''}
<section class="panel"><div class="bar"><h2>Your warband</h2><span class="grow"></span><span class="key"><i class="du"></i>to units <i class="dh"></i>to their hero</span></div>${table(me, 0)}</section>
<section class="panel side s1"><h2>The enemy</h2>${table(en, 1)}</section>
<p><button class="primary" data-act="continue">${Z.go}</button></p></div>`;
}

/* ---- input ---- */
/* which board slot the pointer is over, from the player row's geometry */
function slotAt(e) {
  const row = e.target.closest && e.target.closest('#row0'); if (!row || S.screen !== 'shop') return null;
  const r = row.getBoundingClientRect(); return Math.max(0, Math.min(9, Math.floor((e.clientX - r.left) / (r.width / 10))));
}
function clearDrop() { S.hover = null; document.querySelectorAll('.dropmark').forEach(x => x.remove()); document.querySelectorAll('[data-push]').forEach(x => x.removeAttribute('data-push')); }
/* outline where the held unit would land and nudge the units it would push */
function showDrop(slot) {
  if (slot === S.hover) return; clearDrop(); S.hover = slot;
  const row = document.getElementById('row0'), t = S.sel != null ? thing(S.sel) : null; if (slot == null || !row || !t || t.kind !== 'unit') return;
  const size = W.U[t.id].size, P = W.tryMove(S.run, t, { slot });
  if (P && P.slot === t.slot && !P.moves.length) return;
  const m = document.createElement('div'); m.className = 'dropmark' + (P ? '' : ' bad'); const s = P ? P.slot : Math.min(slot, 10 - size);
  m.style.gridColumn = `${s + 1}/span ${size}`; row.appendChild(m);
  if (P) for (const mv of P.moves) { const el = row.querySelector(`[data-own="${mv.uid}"]`); if (el) el.dataset.push = mv.to == null ? 'b' : mv.to > mv.from ? 'r' : 'l'; }
}
function act(a) {
  const run = S.run, sel = S.sel != null ? thing(S.sel) : null; S.msg = '';
  if (a.dataset.own) {
    const t = thing(+a.dataset.own); if (!t) return;
    if (!sel) S.sel = t.uid;
    else if (sel === t) S.sel = null;
    else if (sel.kind === 'item' && t.kind === 'unit') { W.equip(run, sel, t); S.sel = null; }
    else if (t.kind === 'item' && sel.kind === 'unit') { W.equip(run, t, sel); S.sel = null; }
    else { if (!W.moveTo(run, sel, t.slot != null ? { slot: sel.kind === 'unit' && S.hover != null ? S.hover : t.slot } : { bench: t.bench })) S.msg = "There's no room to fit it there. Clear a slot first."; S.sel = null; }
  } else if (a.dataset.bench) { if (sel) { W.moveTo(run, sel, { bench: +a.dataset.bench }); S.sel = null; } }
  else if (a.dataset.slot) {
    if (sel) { if (sel.kind === 'item') S.msg = 'Items go on units. Select the item, then a unit.'; else if (!W.moveTo(run, sel, { slot: +a.dataset.slot })) S.msg = "It doesn't fit there."; S.sel = null; }
  }
  render();
}
function command(c) {
  const run = S.run; S.msg = '';
  if (c !== 'quit') S.quitArm = false;
  if (c.startsWith('pick:')) { S.pickF = c.slice(5); S.screen = 'leader'; }
  else if (c === 'back') { S.screen = 'pick'; }
  else if (c.startsWith('leader:')) { S.save = ''; S.run = W.newRun(S.pickF, c.slice(7)); S.screen = 'shop'; S.sel = null; }
  else if (c.startsWith('enc:')) { const r = W.chooseOffer(run, +c.slice(4)); if (!r) return; if (r.fight) { startCamp(); return; } S.msg = r.msg || ''; S.screen = 'shop'; }
  else if (c === 'keepgoing') { keepGoing(); return; }
  else if (c === 'newrun') { S.run = null; S.save = ''; S.screen = 'pick'; }
  else if (c === 'copylog') {
    const text = JSON.stringify(W.exportLog(run)), fail = () => { const d = document.getElementById('rawlog'), t = document.getElementById('rawtext'); if (d) d.open = true; if (t) { t.focus(); t.select(); } setSave('Copy was blocked. The full log is selected below: press Ctrl+C.'); };
    try { navigator.clipboard.writeText(text).then(() => setSave('Run log copied. Paste it into the chat.'), fail); } catch (err) { fail(); }
    return;
  }
  else if (c === 'quit') { if (S.quitArm) { cancelAnimationFrame(raf); S.quitArm = false; S.run = null; S.B = null; S.result = null; S.screen = 'pick'; } else S.quitArm = true; }
  else if (c === 'reroll') { if (!W.reroll(run)) S.msg = 'A reroll costs 2 gold.'; }
  else if (c === 'xp') { if (!W.buyXp(run)) S.msg = 'Buying XP costs 4 gold.'; }
  else if (c === 'sell') { const t = thing(S.sel); if (t) W.sell(run, t); S.sel = null; }
  else if (c.startsWith('sellid:')) { const t = thing(+c.slice(7)); if (t) { W.sell(run, t); if (S.sel === t.uid) S.sel = null; } }
  else if (c === 'fight') { startBattle(); return; }
  else if (c.startsWith('speed:')) { S.speed = +c.slice(6); document.querySelectorAll('[data-act^="speed:"]').forEach(b => b.classList.toggle('active', b.dataset.act === c)); return; }
  else if (c === 'skip') { const B = S.B; if (!B || S.result) return; cancelAnimationFrame(raf); let g = 0; while (!B.over && g++ < 20000) W.step(B, .05); B.ev.length = 0; endBattle(); return; }
  else if (c === 'copylog') {
    const ta = document.getElementById('rawlog'), st = document.getElementById('savest'); if (!ta) return;
    const fail = () => { document.getElementById('rawwrap').open = true; ta.focus(); ta.select(); if (st) st.textContent = 'Copying was blocked. The log is selected below; copy it from there.'; };
    try { navigator.clipboard.writeText(ta.value).then(() => { if (st) st.textContent = 'Copied. Paste it into chat.'; }, fail); } catch (e) { fail(); }
    return;
  }
  else if (c === 'continue') { S.B = null; S.result = null; S.sum = null; S.campFight = false; S.screen = run.over ? 'end' : run.offer ? 'encounter' : 'shop'; }
  render();
}
root.addEventListener('click', e => {
  const a = e.target.closest('[data-act],[data-shop],[data-own],[data-bench],[data-slot]');
  if (!a) return;
  if (a.dataset.act) return command(a.dataset.act);
  if (S.screen !== 'shop') return;
  if (a.dataset.shop) {
    const s = S.run.shop[+a.dataset.shop], r = W.buy(S.run, +a.dataset.shop); S.msg = '';
    if (!r.ok) S.msg = r.msg || ''; else if (r.merged.length || r.items.length) S.msg = r.merged.map(m => `${W.U[m.id].name} upgraded to tier ${m.tier}.`).concat(r.items.map(k => `Three combined into a ${W.ITEMS[k].name}.`)).join(' ');
    else if (s && s.kind === 'item') S.msg = 'Item added to your bench. Select it, then a unit to equip.';
    S.insp = null; render(); return;
  }
  act(a);
});
root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-own]') && S.screen === 'shop') { e.preventDefault(); const id = e.target.dataset.own; act(e.target); const again = root.querySelector(`[data-own="${id}"]`); if (again) again.focus(); } });
root.addEventListener('mouseover', e => {
  const a = e.target.closest('[data-insp]'), k = a ? a.dataset.insp : null;
  if (k !== S.insp) { S.insp = k; drawPreview(); if (k && !S.drag && (S.sel == null || S.touch)) showTip(a); else hideTip(); }
});
root.addEventListener('mouseleave', () => { if (S.insp) { S.insp = null; drawPreview(); } hideTip(); });
root.addEventListener('focusin', e => { const a = e.target.closest && e.target.closest('[data-insp]'); if (a && a.matches(':focus-visible') && !S.drag) { S.insp = a.dataset.insp; drawPreview(); showTip(a, true); } });
root.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('[data-insp]')) hideTip(); });
window.addEventListener('pointerdown', e => { S.touch = e.pointerType === 'touch'; if (!e.target.closest || !e.target.closest('[data-insp]')) hideTip(); }, true);
function closeCtx() { const c = document.getElementById('ctx'); if (c) c.remove(); }
root.addEventListener('contextmenu', e => {
  if (S.screen !== 'shop') return;
  const sh = e.target.closest('[data-shop]');
  if (sh) { e.preventDefault(); W.toggleFreeze(S.run, +sh.dataset.shop); S.msg = ''; render(); return; }
  const a = e.target.closest('[data-own]'); if (!a) return;
  e.preventDefault(); closeCtx(); hideTip();
  const t = thing(+a.dataset.own); if (!t) return;
  const m = document.createElement('div'); m.id = 'ctx'; m.className = 'ctx';
  m.innerHTML = `<button data-act="sellid:${t.uid}">Sell ${nameOf(t)} for <b class="g">${W.sellValue(t, S.run)}</b> gold</button>`;
  m.style.left = Math.max(8, Math.min(e.clientX, window.innerWidth - 240)) + 'px'; m.style.top = Math.max(8, Math.min(e.clientY, window.innerHeight - 60)) + 'px';
  root.appendChild(m); m.firstChild.focus();
});
document.addEventListener('click', e => { if (!e.target.closest('#ctx')) closeCtx(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCtx(); });
window.addEventListener('scroll', () => { closeCtx(); hideTip(); }, true);
root.addEventListener('toggle', e => { if (e.target && e.target.id === 'helpbox') S.helpOpen = e.target.open; }, true);
root.addEventListener('dragstart', e => { const a = e.target.closest && e.target.closest('[data-own]'); if (!a || S.screen !== 'shop') return; S.sel = +a.dataset.own; e.dataTransfer.setData('text/plain', a.dataset.own); e.dataTransfer.effectAllowed = 'move'; a.classList.add('sel'); S.drag = true; hideTip(); });
root.addEventListener('dragover', e => { if (S.sel == null) return; const s = slotAt(e); if (s != null || e.target.closest('[data-own],[data-bench],[data-slot]')) e.preventDefault(); showDrop(s); });
root.addEventListener('mousemove', e => { if (S.sel == null || S.screen !== 'shop') { if (S.hover != null) clearDrop(); return; } showDrop(slotAt(e)); });
root.addEventListener('drop', e => { e.preventDefault(); if (S.sel == null || S.screen !== 'shop') return;
  const ds = slotAt(e), held = thing(S.sel);
  if (ds != null && held && held.kind === 'unit') { S.msg = W.moveTo(S.run, held, { slot: ds }) ? '' : "There's no room to fit it there. Clear a slot first."; S.sel = null; clearDrop(); render(); return; }
  const a = e.target.closest('[data-own],[data-bench],[data-slot]'); if (!a) return; if (a.dataset.own && +a.dataset.own === S.sel) { S.sel = null; render(); return; } act(a); });
root.addEventListener('dragend', () => { S.drag = false; clearDrop(); if (S.sel != null && S.screen === 'shop') { S.sel = null; render(); } });

function start(data) {
  if (data && data.run && data.run.things) { S.run = W.restore(data.run); S.run.camp = null; S.screen = S.run.over ? 'end' : S.run.offer ? 'encounter' : 'shop'; }
  render();
}
const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) hot.snapshot(() => (S.run ? { run: S.run } : {}));
if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
window.__S = S;
})();
