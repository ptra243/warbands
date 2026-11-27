/* Screens as HTML strings: shop, board, bench, encounters, leader pick, battle summary, end of run. */
import * as W from '../engine/index.ts';
import { ART } from './art.ts';
import { CARD_ART } from './card-art.ts';
import { PORTRAIT } from './portraits.ts';
import { S } from './state.ts';

export const RAR = ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
  ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
/** something shown on a card or in the detail panel */
export type Shown = (W.UnitSpec & { kind?: 'unit' }) | { kind: 'item'; id: string; uid?: number };
type Cell = { kind?: 'unit' | 'item'; id: string; uid?: number };

export const n = (v: number): number => Math.max(0, Math.round(v));
export const thing = (uid: number | null): W.Thing | undefined => S.run!.things.find((t) => t.uid === uid);
export const stars = (t: number): string =>
  t > 1 ? `<span class="stars" aria-label="tier ${t}">${'★'.repeat(t)}</span>` : '';
export const chip = (k: string): string => `<span class="tb tb-${k}">${ART.tribe(k)}${k}</span>`;
export const badges = (list: string[]): string =>
  `<span class="tis">${list.map((k) => `<span class="ti tb-${k}" title="${k}">${ART.tribe(k)}</span>`).join('')}</span>`;
export const itemArt = (id: string): string =>
  ART.item(W.ITEMS[id].base || id) + (W.ITEMS[id].base ? '<i class="iup">★</i>' : '');
export const nameOf = (t: Cell): string => (t.kind === 'item' ? W.ITEMS[t.id].name : W.U[t.id].name);

export function card(o: W.UnitSpec, attrs: string, battle?: boolean): string {
  const d = W.U[o.id],
    st = W.stats(o);
  return `<div class="u f${d.f} t${o.tier || 1}${d.building ? ' bld' : ''}${d.token ? ' tok' : ''}${S.sel != null && S.sel === o.uid ? ' sel' : ''}" ${attrs}>
<div class="art">${ART.unit(o.id)}</div><i class="aimc" data-aim="${(S.aims && o.uid != null && S.aims[o.uid]) || ''}"></i>${badges(d.counts ? [...Array(d.counts).fill(st.tribes[0]), ...st.tribes.slice(1)] : st.tribes)}${stars(o.tier || 1)}${o.item ? `<span class="it">${itemArt(o.item)}</span>` : ''}
${battle ? '<span class="rotb" hidden></span><div class="bars"><div class="hpb"><i></i><u></u></div><div class="cdb"><i></i></div></div>' : ''}
<div class="st"><b class="a">${d.building ? '' : n(st.atk)}</b><b class="h">${n(st.hp)}</b></div></div>`;
}
export const itemCard = (t: W.ItemThing, attrs: string): string =>
  `<div class="u item${S.sel === t.uid ? ' sel' : ''}" ${attrs}><div class="art">${itemArt(t.id)}</div><div class="st"><b class="lbl">Item</b></div></div>`;
export const ownAttrs = (o: W.Thing): string =>
  `data-own="${o.uid}" data-insp="own:${o.uid}" draggable="true" tabindex="0" role="button" aria-label="${nameOf(o)}"`;
export const span = (slot: number, size: number): string => `style="grid-column:${slot + 1}/span ${size}"`;
export const buHTML = (u: W.BattleUnit): string =>
  card(u.o, `id="bu${u.bid}" ${span(u.slot, u.size)} data-insp="def:${u.d.id}:${u.o.tier || 1}"`, true);
export const cells = (side: number, open: boolean[] | null, lvl?: (i: number) => number): string =>
  ROMAN.map((r, i) =>
    !open || open[i]
      ? `<div class="cell" style="grid-column:${i + 1}" ${side === 0 ? `data-slot="${i}"` : ''}><span>${r}</span></div>`
      : `<div class="cell locked" style="grid-column:${i + 1}" title="${side === 0 ? 'Opens at a higher shop level' : 'Closed for this opponent'}"><span>${side === 0 && lvl ? 'Lv ' + lvl(i) : '·'}</span></div>`,
  ).join('');
export const unlockLevel = (i: number): number => {
  for (let l = 1; l <= 9; l++) if (W.openArr(W.openCount(l))[i]) return l;
  return 9;
};

export const mulText = (mul: number | undefined): string =>
  mul! > 1 ? ` · +${Math.round((mul! - 1) * 100)}% health and attack` : '';
/** an opponent's name as the battle screens show it */
export const oppName = (o: W.Opponent): string =>
  (o.title || W.FACTIONS[o.faction].name) + (o.post ? mulText(o.mul) : '');
/** the battle screen's header: the round (or camp), and who fights whom. A named foe from a player faction also
 *  shows that faction; monsters and camps don't. */
export function vsHTML(leader: string | null, o: W.Opponent, round: number): string {
  const faction = !o.camp && (o.title || o.post) && o.faction !== 'N' ? ' (' + W.FACTIONS[o.faction].name + ')' : '';
  return `<div class="vs"><h2>${o.camp ? 'Camp' : 'Round ' + round}</h2><p><b>${leader ? W.LEADERS[leader].name : 'Your warband'}</b> against <b>${oppName(o)}</b>${faction}</p></div>`;
}
/* the shop view: only your own board. The opponent stays hidden until the fight starts. */
export function boardHTML() {
  S.aims = null;
  const run = S.run!,
    hp = W.heroHp(run.round);
  const me = W.boardUnits(run)
    .map((o) => card(o, `${span(o.slot, W.U[o.id].size)} ${ownAttrs(o)}`))
    .join('');
  const tag = run.enemy.boss
    ? '<b class="rtag boss">Boss round</b>'
    : run.post
      ? `<b class="rtag">${run.enemy.ghost ? 'Past warband' : 'Post-game opponent'}${mulText(run.enemy.mul)}</b>`
      : '';
  return `<section class="field shopfield" id="field">
<div class="hero p"><span class="ftitle">Your board</span><span>Round ${run.round}</span>${tag}<span class="grow"></span><span class="hid">Your opponent is revealed when the fight starts</span></div>
<div class="scroll"><div class="rows"><div class="row p tall" id="row0">${cells(0, W.openArr(W.openCount(run.level)), unlockLevel)}${me}</div></div></div>
<div class="hero p" id="hero0">${hport(run.leader)}<span>${run.leader ? W.LEADERS[run.leader].name : 'Your hero'}</span><div class="hbar"><i></i></div><b>${hp}</b></div>
</section>`;
}
/* active bonuses of one side in a battle */
export function sideHTML(B: W.Battle, side: number): string {
  const lv = B.syn[side],
    ks = Object.keys(lv).filter((k) => lv[k] && W.TRIBES[k] && W.TRIBES[k].text[lv[k] - 1]);
  const lead = side === 0 ? S.run!.leader : S.opp?.leader,
    L = lead && W.LEADERS[lead];
  return `<section class="panel side s${side}"><h2>${side === 0 ? 'Your warband' : 'The enemy'}</h2>${L ? `<p><b class="lname">${L.name}.</b> ${L.text}</p>` : ''}
${ks.length ? `<ul class="syn">${ks.map((k) => `<li class="on"><span class="tb tb-${k}">${ART.tribe(k)}${k === 'Party' ? 'Full party' : k}</span><span class="ct">${lv[k]}<i>/${W.TRIBES[k].th.length}</i></span><small>${W.TRIBES[k].text[lv[k] - 1]}</small></li>`).join('')}</ul>` : '<p class="hint">No bonuses active.</p>'}</section>`;
}
export function fieldHTML() {
  S.aims = null;
  const run = S.run!,
    B = S.B,
    round = B ? B.round : run.round,
    hp = W.heroHp(round);
  const en = B
    ? B.units
        .filter((u) => u.side === 1 && u.alive)
        .map(buHTML)
        .join('')
    : run.enemy.units.map((o) => card(o, `${span(o.slot!, W.U[o.id].size)} data-insp="enemy:${o.uid}"`)).join('');
  const me = B
    ? B.units
        .filter((u) => u.side === 0 && u.alive)
        .map(buHTML)
        .join('')
    : W.boardUnits(run)
        .map((o) => card(o, `${span(o.slot, W.U[o.id].size)} ${ownAttrs(o)}`))
        .join('');
  const foe = B
    ? oppName(S.opp!)
    : (run.enemy.title
        ? run.enemy.title + (run.enemy.boss ? '' : ' (' + W.FACTIONS[run.enemy.faction].name + ')')
        : W.FACTIONS[run.enemy.faction].name) + mulText(run.enemy.mul);
  return `<section class="field" id="field">
<div class="hero e${!B && run.enemy.boss ? ' boss' : ''}" id="hero1">${hport(B ? S.opp!.leader : run.enemy.leader)}<span>${B ? 'Enemy hero' : 'Next opponent'} · ${foe}</span><div class="hbar"><i></i></div><b>${hp}</b></div>
<div class="scroll"><div class="rows"><div class="row e" id="row1">${cells(1, B ? B.open[1] : W.openArr(run.enemy.open))}${en}</div>
<div class="mid"><span>vs</span></div>
<div class="row p" id="row0">${cells(0, B ? B.open[0] : W.openArr(W.openCount(run.level)), unlockLevel)}${me}</div>
<svg class="fx" id="fx" aria-hidden="true"><defs><marker id="ah0" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#f4c860"/></marker><marker id="ah1" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ff9488"/></marker></defs></svg></div></div>
<div class="hero p" id="hero0">${hport(run.leader)}<span>${run.leader ? W.LEADERS[run.leader].name : 'Your hero'}</span><div class="hbar"><i></i></div><b>${hp}</b></div>
</section>`;
}

export function inspTarget(): { t: Shown; pv?: ReturnType<typeof W.preview> } | null {
  const k = S.insp || (S.sel != null ? 'own:' + S.sel : null);
  if (!k || !S.run) return null;
  const [a, b, c] = k.split(':');
  if (a === 'own') {
    const t = S.run!.things.find((x) => x.uid === +b);
    return t ? { t, pv: null } : null;
  }
  if (a === 'enemy') {
    const t = S.run!.enemy.units.find((x) => x.uid === +b);
    return t ? { t } : null;
  }
  if (a === 'shop') {
    const s = S.run!.shop[+b];
    return s ? { t: s.kind === 'unit' ? { kind: 'unit', id: s.id, tier: 1 } : { kind: 'item', id: s.id } } : null;
  }
  if (a === 'def') return { t: { kind: 'unit', id: b, tier: +c } };
  return null;
}
export const helpHTML = () =>
  `<details class="panel helpbox" id="helpbox"${S.helpOpen ? ' open' : ''}><summary>How it works</summary><ul class="help"><li>Drop a unit on the board and its neighbours slide aside to make room. The outline shows where it will land.</li><li>Each unit attacks whatever stands in the slot opposite it.</li><li>With nothing opposite, it attacks the weaker enemy one slot to either side. Only with nothing in reach does it hit the enemy hero. The first hero to fall loses.</li><li>A hero with no units left takes triple damage.</li><li>You do not see your opponent until the fight starts, so build a board that holds up against anything.</li><li>In battle, the small marker on a unit's edge shows where it is aiming: in the middle for straight ahead, in a corner for a diagonal attack, and white when it is hitting the hero.</li><li>A unit wider than one slot attacks every enemy opposite it and splits its damage evenly between them.</li><li>Buy three of the same unit to upgrade it. An upgraded unit is twice as strong.</li><li>Three of the same item combine into a stronger one. Selling a unit returns its item to your bench.</li><li>Select a unit, then a slot, to move it. Dragging works too.</li><li>Right-click one of your units to sell it. Right-click a shop card to freeze it, so it stays through rerolls and into the next round.</li><li>Raising your shop level opens more slots, for you and for your summons.</li><li>Between rounds you choose one encounter: a fight with no life at stake, an event, or a shrine. Every fifth round is a boss, and beating it earns a relic.</li><li>Against a boss, units with nothing in reach attack the boss, not the hero.</li><li>In battle, the gold bar under a unit is its attack timer.</li></ul></details>`;
export function detailHTML() {
  const x = inspTarget();
  if (!x) return '';
  const t = x.t;
  if (t.kind === 'item') {
    const it = W.ITEMS[t.id];
    return `<div class="dhead"><div class="dart item">${itemArt(t.id)}</div><div><h3>${it.name}</h3><p class="sub">Item · ${it.cost} gold</p></div></div><p>${it.text}</p><p class="hint">Select it on your bench, then choose a unit to equip. Each unit holds one item.</p>`;
  }
  const d = W.U[t.id],
    st = W.stats(t);
  return `<div class="dhead"><div class="dart u f${d.f}">${ART.unit(t.id)}</div><div><h3 class="r${d.cost}">${d.name} ${stars(t.tier || 1)}</h3>
<p class="sub">${d.token ? 'Summon' : RAR[d.cost] + ' · ' + d.cost + ' gold'} · ${d.size} slot${d.size > 1 ? 's' : ''}</p><p class="chips">${st.tribes.map(chip).join('')}</p></div></div>
<p class="nums">${d.building ? '' : `<span class="a">${n(st.atk)} attack</span>`}<span class="h">${n(st.hp)} health</span>${d.building ? '' : `<span>every ${d.cd}s</span>`}</p>
<p>${d.txt(st.m)}</p>
${
  !d.token && (t.tier || 1) < 3
    ? `<p class="hint">${[2, 3]
        .filter((k) => k > (t.tier || 1))
        .map((k) => {
          const s2 = W.stats({ id: t.id, tier: k, item: t.item });
          return `Tier ${k}: ${d.building ? '' : n(s2.atk) + ' attack, '}${n(s2.hp)} health`;
        })
        .join(' · ')}${t.gAtk || t.gHp ? ', plus growth' : ''}</p>`
    : ''
}
${d.size > 1 && !d.building && !d.all ? `<p class="hint">Wide: attacks every enemy opposite it, splitting its damage evenly.</p>` : ''}
${x.pv ? `<p class="hint aimline"><b>Attacks first:</b> ${x.pv.hero ? 'the enemy hero (nothing in reach)' : [...new Set(x.pv.names)].join(', ') + (x.pv.diag ? ' (diagonal, nothing opposite)' : '')}</p>` : ''}
${d.grow ? `<p class="hint">Grows +${d.grow[0] * st.m} attack and +${d.grow[1] * st.m} health after each battle${t.gAtk || t.gHp ? ` (+${t.gAtk}/+${t.gHp} so far)` : ''}.</p>` : ''}
${t.item ? `<p class="hint"><b>${W.ITEMS[t.item].name}.</b> ${W.ITEMS[t.item].text}</p>` : ''}`;
}
export function synHTML() {
  const run = S.run!,
    { cnt, lv } = W.synergy(W.boardUnits(run));
  return Object.keys(W.TRIBES)
    .filter((k) => W.TRIBES[k].f === run.faction && W.TRIBES[k].th.length)
    .map((k) => {
      const T = W.TRIBES[k],
        c = cnt[k] || 0,
        l = lv[k] || 0;
      return `<li class="${l ? 'on' : ''}"><span class="tb tb-${k}">${ART.tribe(k)}${k === 'Party' ? 'Full party' : k}</span><span class="ct">${c}<i>/${T.th.find((x) => x > c) || T.th[T.th.length - 1]}</i></span><small>${T.text[Math.max(0, l - 1)]}</small>${T.note ? `<small class="note">${T.note}</small>` : ''}</li>`;
    })
    .join('');
}
export function shopHTML() {
  const run = S.run!;
  const cards = run.shop
    .map((s, i) => {
      if (!s) return `<div class="card sold">Sold</div>`;
      if (s.kind === 'item') {
        const it = W.ITEMS[s.id];
        const ic = W.priceOf(run, s);
        return `<button class="card item${run.gold < ic ? ' poor' : ''}${s.frozen ? ' frozen' : ''}" data-shop="${i}" data-insp="shop:${i}"><span class="cost">${ic}</span><span class="cart">${itemArt(s.id)}</span><b>${it.name}</b><small class="tribes">Item</small><small>${it.text}</small>${s.frozen ? '<em class="ice">Frozen</em>' : ''}</button>`;
      }
      const uc = W.priceOf(run, s),
        d = W.U[s.id],
        own = run.things.filter((t) => t.kind === 'unit' && t.id === s.id && t.tier === 1).length;
      return `<button class="card f${d.f} r${d.cost}${own >= 2 ? ' up' : ''}${run.gold < uc ? ' poor' : ''}${s.frozen ? ' frozen' : ''}" data-shop="${i}" data-insp="shop:${i}"><span class="cost">${uc}</span><span class="cart">${ART.unit(s.id)}</span><b>${d.name}</b>
<span class="chips">${d.tribes.map(chip).join('')}</span>${d.size > 1 ? `<small class="tribes">Takes ${d.size} slots</small>` : ''}<span class="nums">${d.building ? '' : `<i class="a">${d.atk}</i>`}<i class="h">${d.hp + (d.flat || 0)}</i></span><small>${d.txt(1)}</small>${own ? `<em>${own >= 2 ? 'Completes an upgrade' : 'You own one'}</em>` : ''}${s.frozen ? '<em class="ice">Frozen</em>' : ''}</button>`;
    })
    .join('');
  const odds = W.ODDS[run.level - 1].map((p, i) => (p ? `<i class="r${i + 1}">${p}%</i>` : '')).join('');
  const need = run.level < 9 ? `${run.xp}/${W.XPNEED[run.level - 1]} XP` : 'max';
  return `<section class="panel"><div class="bar"><h2>Shop</h2><span class="odds" title="Chance of each rarity at this shop level">Level ${run.level} · ${W.openCount(run.level)} slots · ${need} · ${odds}</span>
</div><div class="bar acts"><span class="purse"><b>${run.gold}</b> gold</span><button data-act="xp" ${run.level >= 9 ? 'disabled' : ''}>Buy 4 XP <b class="g">4</b></button><button data-act="reroll">Reroll <b class="g">2</b></button><span class="econ" title="Interest: 1 gold per 10 held when the battle ends, up to 3. Winning adds 1 more.">+${W.income(run)} next round (${W.income(run) - W.interest(run)} base, ${W.interest(run)} interest${W.interest(run) < 3 ? `; ${10 - (run.gold % 10)} more gold for +1` : ''})</span><button class="primary" data-act="fight">Fight</button></div>
<div class="shop">${cards}</div></section>`;
}
export function benchHTML() {
  const run = S.run!;
  let h = '';
  for (let i = 0; i < W.BENCH; i++) {
    const t = run.things.find((x) => x.bench === i);
    h += `<div class="bcell" data-bench="${i}">${t ? (t.kind === 'item' ? itemCard(t, ownAttrs(t)) : card(t, ownAttrs(t))) : ''}</div>`;
  }
  const sel = S.sel != null ? thing(S.sel) : null;
  return `<section class="panel"><div class="bar"><h2>Bench</h2><span class="grow"></span>${sel ? `<button data-act="sell">Sell ${nameOf(sel)} for <b class="g">${W.sellValue(sel, run)}</b></button>` : '<span class="odds">Select a unit to move or sell it</span>'}</div><div class="bench">${h}</div></section>`;
}
export function headHTML() {
  const run = S.run!;
  return `<header class="top"><h1>Warband</h1><div class="stats"><span>Round <b>${run.round}</b></span>${run.post ? `<span>Past warbands beaten <b>${run.post.n}</b></span>` : `<span>Wins <b>${run.wins}/${W.MAXWINS}</b></span>`}
<span class="lives" aria-label="${run.lives} lives left">${'<i class="on"></i>'.repeat(Math.max(0, run.lives))}${'<i></i>'.repeat(W.LIVES - Math.max(0, run.lives))}</span>
<button class="ghost" data-act="quit">${S.quitArm ? 'Press again to abandon' : 'Abandon run'}</button></div></header>`;
}
export const hasPort = (k: string | null | undefined): k is string => !!(k && PORTRAIT.ids.includes(k));
export const port = (k: string | null, cls?: string): string =>
  hasPort(k) ? `<span class="port ${cls || ''}" title="${W.LEADERS[k].name}">${PORTRAIT.leader(k)}</span>` : '';
export const hport = (k: string | null | undefined): string =>
  hasPort(k) ? `<span class="hport" title="${W.LEADERS[k].name}">${PORTRAIT.head(k)}</span>` : '';
export function leaderPanel() {
  const run = S.run!,
    L = run.leader && W.LEADERS[run.leader];
  return `<section class="panel"><h2>Leader and relics</h2>${L ? `<div class="lead">${port(run.leader, 'sm')}<p><b class="lname">${L.name}.</b> ${L.text}</p></div>` : '<p class="hint">No leader.</p>'}
${run.relics.length ? `<ul class="relics">${run.relics.map((k) => `<li><b>${W.RELICS[k].name}.</b> ${W.RELICS[k].text}</li>`).join('')}</ul>` : '<p class="hint">No relics yet. Hard camps, shrines and bosses give them.</p>'}</section>`;
}
export function leaderHTML() {
  const f = S.pickF;
  return `<div class="wrap pick"><header class="intro"><h1>Choose a leader</h1><p class="lede">Each leader of the ${W.FACTIONS[f!].name} bends the run toward a different kind of warband. The choice lasts the whole run.</p></header>
<div class="factions">${Object.keys(W.LEADERS)
    .filter((k) => W.LEADERS[k].f === f)
    .map((k) => {
      const L = W.LEADERS[k];
      return `<button class="fac f${f}" data-act="leader:${k}">${hasPort(k) ? port(k, 'big') : `<span class="crest one"><span class="u f${f}">${ART.unit(L.art)}</span></span>`}<h2>${L.name}</h2><p>${L.text}</p><span class="go">Lead with ${L.name.replace('The ', 'the ')}</span></button>`;
    })
    .join('')}</div>
<p><button class="ghost" data-act="back">Back to factions</button></p></div>`;
}
export function rewardText(c: W.OfferCard): string {
  const r = c.reward!;
  return r.relic
    ? `Relic: ${W.RELICS[r.relic].name}. ${W.RELICS[r.relic].text}`
    : r.unit
      ? `A free ${W.U[r.unit].name}.`
      : `${r.gold} gold.`;
}
export function encounterHTML() {
  const run = S.run!,
    o = run.offer!;
  const cards = o.cards
    .map((c, i) => {
      if (c.type === 'relic')
        return `<button class="fac enc relic" data-act="enc:${i}"><span class="tag">Relic</span><h2>${W.RELICS[c.relic!].name}</h2><p>${W.RELICS[c.relic!].text}</p><span class="go">Take it</span></button>`;
      if (c.type === 'event') {
        const E = W.EVENTS[c.id!];
        return `<button class="fac enc event" data-act="enc:${i}"><span class="tag">Event · no fight</span><h2>${E.name}</h2><p>${E.text(run)}</p><span class="go">Accept</span></button>`;
      }
      if (c.type === 'shrine')
        return `<button class="fac enc shrine" data-act="enc:${i}"><span class="tag">Shrine · costs a life</span><h2>Blood shrine</h2><p>Give up 1 of your ${run.lives} lives and take the ${W.RELICS[c.relic!].name}. ${W.RELICS[c.relic!].text}</p><span class="go">Pay the price</span></button>`;
      return `<button class="fac enc camp${c.hard ? ' hard' : ''}" data-act="enc:${i}"><span class="tag">${c.hard ? 'Hard fight' : 'Easy fight'} · no life at stake</span><h2>${c.name}</h2>
<span class="row mini" style="grid-template-columns:repeat(${c.units!.reduce((a, t) => a + W.U[t.id].size, 0)},minmax(0,1fr))">${c
        .units!.slice()
        .sort((a, b) => a.slot! - b.slot!)
        .map((t) => card(t, `style="grid-column:span ${W.U[t.id].size}"`))
        .join('')}</span>
<p><b>If you win:</b> ${rewardText(c)}</p><span class="go">Fight</span></button>`;
    })
    .join('');
  return `<div class="wrap">${headHTML()}<p class="msg" role="status">${S.msg || '&nbsp;'}</p><header class="intro"><h1 class="h1s">${o.kind === 'relics' ? 'Spoils of the boss' : 'On the road to round ' + run.round}</h1><p class="lede">${o.kind === 'relics' ? 'Choose one relic to keep for the rest of the run.' : 'Choose one before you reach the shop.'}</p></header>
<div class="factions">${cards}</div>
<div class="cols"><main><section class="field"><div class="hero p"><span>Your board</span></div><div class="scroll"><div class="rows"><div class="row p">${cells(1, W.openArr(W.openCount(run.level)))}${W.boardUnits(
    run,
  )
    .map((t) => card(t, `${span(t.slot, W.U[t.id].size)}`))
    .join('')}</div></div></div></section></main><aside>${leaderPanel()}</aside></div></div>`;
}
export function pickHTML() {
  const show: Record<string, string[]> = {
    H: ['paladin', 'archmage'],
    E: ['scout', 'sunspire', 'matriarch'],
    U: ['skeleton', 'necromancer', 'herald'],
  };
  /* a unit with card art shows its scene, landscape-cropped; the rest show their icon */
  const crest = (f: string, id: string) =>
    CARD_ART.inGame(id)
      ? `<span class="u scene f${f}">${CARD_ART.svg(id, W.U[id].name, W.U[id].size > 1, '-pick')}</span>`
      : `<span class="u f${f}">${ART.unit(id)}</span>`;
  return `<div class="wrap pick"><header class="intro"><h1>Warband</h1><p class="lede">Draft a single row of ten slots. Each unit strikes whatever stands opposite it, and anything left unblocked hits the enemy hero. Win ten battles before you lose five.</p></header>
<div class="factions">${(Object.keys(W.FACTIONS) as W.FactionId[])
    .filter((f) => f !== 'N')
    .map(
      (
        f,
      ) => `<button class="fac f${f}" data-act="pick:${f}"><span class="crest" style="--n: ${show[f].length}">${show[f].map((id) => crest(f, id)).join('')}</span><h2>${W.FACTIONS[f].name}</h2><p>${W.FACTIONS[f].blurb}</p>
<p class="chips">${Object.keys(W.TRIBES)
        .filter((k) => W.TRIBES[k].f === f && W.TRIBES[k].th.length && k !== 'Party')
        .map(chip)
        .join('')}</p><span class="go">Lead the ${W.FACTIONS[f].name}</span></button>`,
    )
    .join('')}</div>
<p class="dlrow"><button class="ghost" data-act="dlruns">Download saved runs</button><span class="odds dlmsg" role="status">${S.dlmsg || ''}</span></p></div>`;
}
export function logRows() {
  return S.run!.log.map((L) => {
    const b = L.battle!,
      mine = b.units.filter((x) => x.side === 'you').sort((x, y) => y.dealt + y.hero - (x.dealt + x.hero))[0];
    const res = L.result === 'win' ? 'Win' : L.result === 'loss' ? 'Loss' : 'Draw';
    return `<tr class="${L.result}"><td>${L.round}</td><td>${W.FACTIONS[L.enemy!.faction].name}</td><td><b>${res}</b></td><td>${b.heroHp[0]} / ${b.heroMax}</td><td>${b.heroHp[1]} / ${b.heroMax}</td><td>${b.time}s${b.sudden ? ' (sudden death)' : ''}</td><td>${mine ? W.U[mine.id].name + ' · ' + (mine.dealt + mine.hero) : ''}</td></tr>`;
  }).join('');
}
export function endHTML() {
  const run = S.run!,
    won = run.over === 'won';
  return `<div class="wrap pick"><header class="intro withport">${port(run.leader, 'mid')}<div><h1>${won ? 'The realm is yours' : 'Your warband has fallen'}</h1>${run.post ? `<p class="lede"><b>After the crown: ${run.post.n} past warband${run.post.n === 1 ? '' : 's'} beaten.</b></p>` : ''}<p class="lede">${run.wins} win${run.wins === 1 ? '' : 's'} over ${run.log.length} round${run.log.length === 1 ? '' : 's'} leading the ${W.FACTIONS[run.faction].name}${run.leader ? ' under ' + W.LEADERS[run.leader].name.replace('The ', 'the ') : ''}${run.relics.length ? ', carrying ' + run.relics.map((k) => W.RELICS[k].name).join(', ') : ''}.</p></div></header>
<section class="field"><div class="scroll"><div class="rows"><div class="row p">${cells(1, W.openArr(W.openCount(run.level)))}${W.boardUnits(
    run,
  )
    .map((o) => card(o, `${span(o.slot, W.U[o.id].size)} data-insp="own:${o.uid}"`))
    .join('')}</div></div></div></section>
<section class="panel"><div class="bar"><h2>Run log</h2><span class="odds" id="save" role="status">${S.save || ''}</span><span class="grow"></span><button data-act="copylog">Copy run log</button><button data-act="dlruns">Download saved runs</button>${won && !run.post ? `<button data-act="newrun">Start a new run</button><button class="primary" data-act="keepgoing" title="Keep this warband and fight the boards of your past winning runs, each stronger than the last, until your lives run out.">Keep going</button>` : `<button class="primary" data-act="newrun">Start a new run</button>`}</div>
<div class="scroll"><table class="log"><thead><tr><th>Round</th><th>Opponent</th><th>Result</th><th>Your hero</th><th>Enemy hero</th><th>Length</th><th>Your top damage</th></tr></thead><tbody>${logRows()}</tbody></table></div>
<p class="odds dlmsg" role="status">${S.dlmsg || ''}</p><details id="rawlog"><summary>Show the full log as text</summary><textarea id="rawtext" readonly rows="8" aria-label="Full run log"></textarea></details></section></div>`;
}
/* after every fight: who did what */
export function summaryHTML() {
  const Z = S.sum!,
    b = Z.rep,
    num = (v: number | undefined) => Math.round(v || 0).toLocaleString('en');
  type Row = {
    id: string;
    tier?: number;
    sum: boolean;
    n: number;
    dealt: number;
    hero: number;
    taken: number;
    healed: number;
    alive: number;
    hp: number;
    died: number;
  };
  const rows = (side: 'you' | 'enemy') => {
    const out: Row[] = [];
    for (const u of b.units.filter((x) => x.side === side)) {
      let g = u.summoned ? out.find((x) => x.sum && x.id === u.id) : undefined;
      if (!g) {
        g = {
          id: u.id,
          tier: u.tier,
          sum: !!u.summoned,
          n: 0,
          dealt: 0,
          hero: 0,
          taken: 0,
          healed: 0,
          alive: 0,
          hp: 0,
          died: 0,
        };
        out.push(g);
      }
      g.n++;
      g.dealt += u.dealt;
      g.hero += u.hero;
      g.taken += u.taken;
      g.healed += u.healed || 0;
      if (u.died == null) {
        g.alive++;
        g.hp += u.hpLeft!;
      } else g.died = Math.max(g.died, u.died);
    }
    return out.sort((p, q) => q.dealt + q.hero - p.dealt - p.hero);
  };
  const me = rows('you'),
    en = rows('enemy'),
    top = Math.max(1, ...me.concat(en).map((r) => r.dealt + r.hero));
  const nm = (r: Row) => W.U[r.id].name + (r.n > 1 ? ' ×' + r.n : '');
  const fate = (r: Row) =>
    r.n > 1
      ? r.alive
        ? `${r.alive} of ${r.n} survived`
        : 'All fell'
      : r.alive
        ? `Survived · ${num(r.hp)} health`
        : `Fell at ${r.died}s`;
  const table = (list: Row[], _side: number) => {
    const t = list.reduce(
      (a, r) => ({
        dealt: a.dealt + r.dealt,
        hero: a.hero + r.hero,
        taken: a.taken + r.taken,
        healed: a.healed + r.healed,
      }),
      { dealt: 0, hero: 0, taken: 0, healed: 0 },
    );
    return `<div class="scroll"><table class="bstat"><thead><tr><th>Unit</th><th class="bcol">Damage</th><th>To units</th><th>To hero</th><th>Taken</th><th>Healed</th><th>Outcome</th></tr></thead><tbody>${list
      .map(
        (
          r,
        ) => `<tr class="${r.alive ? '' : 'gone'}"><td><div class="un"><span class="ic u f${W.U[r.id].f}">${ART.unit(r.id)}</span><span>${nm(r)} ${stars(r.tier || 1)}${r.sum ? '<small>summoned</small>' : ''}</span></div></td>
<td class="bcol"><span class="dbar" title="${num(r.dealt)} to units, ${num(r.hero)} to the hero"><i class="du" style="width:${((r.dealt / top) * 100).toFixed(1)}%"></i><i class="dh" style="width:${((r.hero / top) * 100).toFixed(1)}%"></i></span></td>
<td>${num(r.dealt)}</td><td>${r.hero ? num(r.hero) : '–'}</td><td>${num(r.taken)}</td><td>${r.healed ? num(r.healed) : '–'}</td><td class="fate">${fate(r)}</td></tr>`,
      )
      .join('')}</tbody>
<tfoot><tr><td>Total</td><td class="bcol"></td><td>${num(t.dealt)}</td><td>${num(t.hero)}</td><td>${num(t.taken)}</td><td>${t.healed ? num(t.healed) : '–'}</td><td></td></tr></tfoot></table></div>`;
  };
  const lost = [b.heroMax - b.heroHp[0], b.heroMax - b.heroHp[1]],
    notes = [];
  const big = (list: Row[]) => list.slice().sort((p, q) => q.hero - p.hero)[0];
  if (Z.res !== 'win') {
    const t = big(en);
    if (t && t.hero > 0)
      notes.push(`Their ${nm(t)} dealt ${num(t.hero)} of the ${num(lost[0])} damage your hero took.`);
  }
  if (Z.res !== 'loss') {
    const t = big(me);
    if (t && t.hero > 0)
      notes.push(`Your ${nm(t)} dealt ${num(t.hero)} of the ${num(lost[1])} damage their hero took.`);
  }
  const fx = b.effects || { you: {}, enemy: {} };
  if (fx.you.rot || fx.you.burn)
    notes.push(
      `Your ${[fx.you.rot ? 'Rot dealt ' + num(fx.you.rot) : '', fx.you.burn ? 'burn dealt ' + num(fx.you.burn) : ''].filter(Boolean).join(' and ')} to their units, on top of the figures below.`,
    );
  if (fx.enemy.rot || fx.enemy.burn)
    notes.push(
      `Their ${[fx.enemy.rot ? 'Rot dealt ' + num(fx.enemy.rot) : '', fx.enemy.burn ? 'burn dealt ' + num(fx.enemy.burn) : ''].filter(Boolean).join(' and ')} to your units.`,
    );
  if (b.sudden) notes.push('The fight went to sudden death.');
  const hero = (label: string, i: number) =>
    `<div class="tile"><small>${label}</small><b>${num(b.heroHp[i])} <i>/ ${num(b.heroMax)}</i></b><span class="hpb"><i style="width:${Math.max(0, (b.heroHp[i] / b.heroMax) * 100).toFixed(1)}%"></i></span></div>`;
  return `<div class="wrap battle">${headHTML()}
<section class="result ${Z.res}"><div><h2>${Z.title}</h2><p>${Z.bits.join(' ')}</p></div><span class="grow"></span><button class="primary" data-act="continue" id="sumgo">${Z.go}</button></section>
<div class="tiles"><div class="tile"><small>${Z.round}</small><b>${S.run!.leader ? W.LEADERS[S.run!.leader].name.replace('The ', '') : 'You'} <i>against</i> ${Z.foe}</b></div>${hero('Your hero', 0)}${hero('Enemy hero', 1)}<div class="tile"><small>Length</small><b>${b.time}s</b></div></div>
${notes.length ? `<section class="panel"><h2>What decided it</h2><ul class="notes">${notes.map((x) => `<li>${x}</li>`).join('')}</ul></section>` : ''}
<section class="panel"><div class="bar"><h2>Your warband</h2><span class="grow"></span><span class="key"><i class="du"></i>to units <i class="dh"></i>to their hero</span></div>${table(me, 0)}</section>
<section class="panel side s1"><h2>The enemy</h2>${table(en, 1)}</section>
<p><button class="primary" data-act="continue">${Z.go}</button></p></div>`;
}
