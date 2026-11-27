/* The shop screen ("Market"): commander, round and Fight along the top; the shop's tall cards on a shelf with the
   economy beside them; the bonuses; the board; the bench with a status line. Board and bench units are B2 tiles,
   the same frame the animated battle draws; hovering one shows its tall card. */
import * as W from '../engine/index.ts';
import { ART } from './art.ts';
import { CARD_ART } from './card-art.ts';
import { PORTRAIT } from './portraits.ts';
import { S } from './state.ts';
import { cells, nameOf, thing, unlockLevel } from './html.ts';

const RNAME = ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const n = (v: number): number => Math.max(0, Math.round(v));
const rare = (cost: number): string => `--rare:var(--r${Math.max(1, Math.min(5, cost))})`;

/* ---- icons ---- */
export const ICON = {
  sword: `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" d="M19 2l3 0 0 3-10.5 10.5 2 2-1.5 1.5-2.5-2.5-3.2 3.2 .7 2.3-2 0-3-3 0-2 2.3 .7 3.2-3.2-2.5-2.5 1.5-1.5 2 2z"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" d="M12 21C5 15.5 2 12 2 8.2 2 5.3 4.3 3 7.1 3c1.9 0 3.7 1 4.9 2.7C13.2 4 15 3 16.9 3 19.7 3 22 5.3 22 8.2 22 12 19 15.5 12 21z"/></svg>`,
  /* hero health: a shield, so hearts only ever mean lives */
  shield: `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" d="M12 2l8 3v6c0 5-3.4 9.2-8 11-4.6-1.8-8-6-8-11V5z"/><path fill="rgba(0,0,0,.35)" d="M12 2l8 3v6c0 5-3.4 9.2-8 11z"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" class="ico lock" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" d="M7.5 11V8a4.5 4.5 0 0 1 9 0v3"/><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><circle cx="12" cy="16" r="1.6" fill="#0d1113"/></svg>`,
};
const coin = (v: number, kind: 'buy' | 'sell' | 'poor' = 'buy'): string =>
  `<span class="coin ${kind}" title="${kind === 'sell' ? 'Sells for' : 'Price'}">${v}</span>`;
const tribe = (k: string): string =>
  `<span class="tb tb-${k}">${ART.tribe(k)}${k === 'Party' ? 'Full party' : k}</span>`;

/* ---- art ---- */
let tag = 0;
function art(id: string, wide: boolean): string {
  if (CARD_ART.inGame(id)) return `<div class="art">${CARD_ART.svg(id, W.U[id].name, wide, '-m' + tag++)}</div>`;
  return `<div class="art icon f${W.U[id].f}">${ART.unit(id)}</div>`;
}
const itemArt = (id: string): string => `<div class="art icon itm">${ART.item(W.ITEMS[id].base || id)}</div>`;
function socket(id: string | null | undefined): string {
  if (!id) return '<span class="sock"></span>';
  const it = W.ITEMS[id];
  return `<span class="sock full${it.base ? ' fine' : ''}">${ART.item(it.base || id)}</span>`;
}

/* ---- tiles (B2) for the board and bench ---- */
const ownAttrs = (t: W.Thing): string =>
  `data-own="${t.uid}" data-insp="own:${t.uid}" draggable="true" tabindex="0" role="button" aria-label="${nameOf(t)}"`;
/* tribe badges down the art window's left edge: every class or tribe the unit counts for, an item's included; a
   unit that counts twice shows its tribe twice */
function badges(d: W.UnitDef, tribes: string[]): string {
  const list = d.counts ? [...Array(d.counts).fill(tribes[0]), ...tribes.slice(1)] : tribes;
  if (!list.length) return '';
  return `<span class="badges">${list.map((k) => `<i class="tb-${k}" title="${k === 'Party' ? 'Full party' : k}">${ART.tribe(k)}</i>`).join('')}</span>`;
}
function tile(t: W.UnitThing, place = ''): string {
  const d = W.U[t.id],
    st = W.stats(t),
    tier = t.tier || 1;
  return `<div class="mtile${d.size > 1 ? ' wide' : ''}${S.sel === t.uid ? ' sel' : ''}" ${ownAttrs(t)} style="${place}${rare(d.cost)}">
<div class="window">${art(t.id, d.size > 1)}${badges(d, st.tribes)}</div>${tier > 1 ? `<span class="stars">${'★'.repeat(tier)}</span>` : ''}${coin(W.sellValue(t, S.run!), 'sell')}
<div class="plate"><i class="hpline"></i>${d.building ? '<span></span>' : `<span class="atk">${ICON.sword}${n(st.atk)}</span>`}${socket(t.item)}<span class="hp">${ICON.heart}${n(st.hp)}</span></div></div>`;
}
function itemTile(t: W.ItemThing): string {
  const it = W.ITEMS[t.id];
  return `<div class="mtile itile${S.sel === t.uid ? ' sel' : ''}" ${ownAttrs(t)} style="${rare(it.cost)}">
<div class="window">${itemArt(t.id)}</div>${coin(W.sellValue(t, S.run!), 'sell')}<div class="plate"><span class="iname">${it.name}</span></div></div>`;
}

/* ---- tall cards: the shop, and the hover card for what you own ---- */
function pips(own: number): string {
  if (!own) return '';
  return `<span class="pips${own >= 2 ? ' ready' : ''}" title="${own >= 2 ? 'Completes an upgrade' : 'You own one'}">${[
    0, 1, 2,
  ]
    .map((i) => `<i class="${i < own ? 'on' : i === own ? 'this' : ''}"></i>`)
    .join('')}</span>`;
}
function shopCard(s: W.ShopCard | null, i: number): string {
  if (!s) return '<div class="scard sold">Sold</div>';
  const run = S.run!,
    price = W.priceOf(run, s),
    poor = run.gold < price,
    ice = s.frozen ? '<div class="ice"><span>❄</span></div>' : '',
    cost = coin(price, poor ? 'poor' : 'buy'),
    cls = `scard${s.frozen ? ' frozen' : ''}${poor ? ' poor' : ''}`;
  if (s.kind === 'item') {
    const it = W.ITEMS[s.id];
    return `<button class="${cls} item" data-shop="${i}" style="${rare(it.cost)}" aria-label="Buy ${it.name} for ${price} gold">
<span class="window">${itemArt(s.id)}${ice}</span>${cost}<span class="body"><b class="name">${it.name}</b><span class="chips"><span class="tb">Item</span></span><span class="txt">${it.text}</span></span></button>`;
  }
  const d = W.U[s.id],
    own = run.things.filter((t) => t.kind === 'unit' && t.id === s.id && t.tier === 1).length;
  return `<button class="${cls}${own >= 2 ? ' up' : ''}" data-shop="${i}" style="${rare(d.cost)}" aria-label="Buy ${d.name} for ${price} gold">
<span class="window">${art(s.id, d.size > 1)}${ice}${own >= 2 ? '<span class="upflag">Upgrade ★★</span>' : ''}</span>${cost}${pips(own)}
<span class="body"><b class="name">${d.name}</b><span class="chips">${d.tribes.map(tribe).join('')}${d.size > 1 ? `<span class="tb">${d.size} slots</span>` : ''}</span>
<span class="txt">${d.txt(1)}</span><span class="nums">${d.building ? '' : `<span class="atk">${ICON.sword}${d.atk}</span>`}<span class="hp">${ICON.heart}${d.hp + (d.flat || 0)}</span></span></span></button>`;
}
/** the tall card for one of your units or items, shown in the hover tip on the shop screen */
export function ownedCard(t: W.Thing): string {
  const sell = coin(W.sellValue(t, S.run!), 'sell');
  if (t.kind === 'item') {
    const it = W.ITEMS[t.id];
    return `<div class="scard owned item" style="${rare(it.cost)}"><span class="window">${itemArt(t.id)}</span>${sell}
<span class="body"><b class="name">${it.name}</b><span class="chips"><span class="tb">${it.base ? 'Fine item' : 'Item'}</span></span><span class="txt">${it.text}</span>
<span class="more">Select it, then a unit, to equip it. Three of the same item combine.</span></span></div>`;
  }
  const d = W.U[t.id],
    st = W.stats(t),
    tier = t.tier || 1;
  const next =
    !d.token && tier < 3
      ? (() => {
          const s2 = W.stats({ id: t.id, tier: tier + 1, item: t.item });
          return `<span class="more">Tier ${tier + 1}: ${d.building ? '' : n(s2.atk) + ' attack, '}${n(s2.hp)} health${t.gAtk || t.gHp ? ', plus growth' : ''}.</span>`;
        })()
      : '';
  const grow = d.grow
    ? `<span class="more">Grows +${d.grow[0] * st.m} attack and +${d.grow[1] * st.m} health after each battle${t.gAtk || t.gHp ? ` (+${t.gAtk}/+${t.gHp} so far)` : ''}.</span>`
    : '';
  const item = t.item
    ? `<span class="more"><span class="isock">${socket(t.item)}</span><b>${W.ITEMS[t.item].name}.</b> ${W.ITEMS[t.item].text}</span>`
    : '';
  const wide =
    d.size > 1 && !d.building && !d.all
      ? '<span class="more">Wide: attacks every enemy opposite it, splitting its damage evenly.</span>'
      : '';
  return `<div class="scard owned${d.size > 1 ? ' wide' : ''}" style="${rare(d.cost)}"><span class="window">${art(t.id, d.size > 1)}${tier > 1 ? `<span class="stars big">${'★'.repeat(tier)}</span>` : ''}</span>${sell}
<span class="body"><b class="name">${d.name}</b><span class="sub">${d.token ? 'Summon' : RNAME[d.cost]} · ${d.size} slot${d.size > 1 ? 's' : ''}</span>
<span class="chips">${st.tribes.map(tribe).join('')}</span>
<span class="nums">${d.building ? '' : `<span class="atk">${ICON.sword}${n(st.atk)}</span>`}<span class="hp">${ICON.heart}${n(st.hp)}</span>${d.building ? '' : `<span class="cd">every ${d.cd}s</span>`}</span>
<span class="txt">${d.txt(st.m)}</span>${item}${grow}${wide}${next}</span></div>`;
}

/* ---- top bar ---- */
function lives(): string {
  const run = S.run!;
  return `<span class="hearts" aria-label="${run.lives} lives left">${'<i class="on">♥</i>'.repeat(Math.max(0, run.lives))}${'<i>♥</i>'.repeat(Math.max(0, W.LIVES - run.lives))}</span>`;
}
const relicGem = (k: string): string =>
  `<span class="gem" title="${W.RELICS[k].name}: ${W.RELICS[k].text}">${W.RELICS[k].name[0]}</span>`;
function commander(): string {
  const run = S.run!,
    L = run.leader ? W.LEADERS[run.leader] : null,
    has = !!run.leader && PORTRAIT.ids.includes(run.leader),
    hp = n(W.heroHp(run.round)),
    name = L ? L.name : 'Your warband';
  const relics = run.relics.length
    ? run.relics
        .map(
          (k) =>
            `<div class="prel">${relicGem(k)}<div><b>${W.RELICS[k].name}</b><p>${W.RELICS[k].text}</p></div></div>`,
        )
        .join('')
    : '<p class="pnote">None yet. Hard camps, shrines and bosses give them.</p>';
  return `<div class="cmd pop-host" tabindex="0" aria-label="${name}, hero health ${hp}">
  <span class="chead">${has ? PORTRAIT.head(run.leader!) : L ? ART.unit(L.art) : ''}</span>
  <span class="cmeta"><b>${name}</b><span class="hero" title="Hero health this round">${ICON.shield}${hp}</span></span>
  <span class="gems">${run.relics.map(relicGem).join('')}</span>
  <div class="pop">
    <div class="pop-lead">${has ? `<span class="pport">${PORTRAIT.leader(run.leader!)}</span>` : ''}
      <div><h4>${name}</h4>${L ? `<p>${L.text}</p>` : ''}
      <p class="pnote">${ICON.shield}<b>${hp}</b> hero health this round. With no units left the hero takes triple damage.</p></div></div>
    <h5>Relics</h5>${relics}
  </div>
</div>`;
}
function tracker(): string {
  const run = S.run!,
    played = run.log.filter((r) => r.result && !r.post);
  const past = played.map(
    (r) => `<span class="pip ${r.result}" title="Round ${r.round}: ${r.result}">${r.round}</span>`,
  );
  const ahead = run.post
    ? []
    : Array.from({ length: 3 }, (_, i) => {
        const r = run.round + i + 1;
        return `<span class="pip${r % 5 === 0 ? ' boss' : ''}" title="${r % 5 === 0 ? 'Boss round ' + r : 'Round ' + r}">${r % 5 === 0 ? '☠' : r}</span>`;
      });
  return [...past.slice(-9), `<span class="pip now">${run.round}</span>`, ...ahead].join('');
}
function roundBadge(): string {
  const run = S.run!,
    played = run.log.filter((r) => r.result && !r.post),
    count = (k: string) => played.filter((r) => r.result === k).length,
    boss = Math.ceil(run.round / 5) * 5,
    inc = W.income(run),
    int = W.interest(run);
  const tag = run.enemy.boss
    ? '<b class="rtag boss">Boss round</b>'
    : run.post
      ? `<b class="rtag">${run.enemy.ghost ? 'Past warband' : 'Post-game opponent'}</b>`
      : '';
  const progress = run.post
    ? `<span class="wins"><b>${run.post.n}</b> past warbands beaten</span>`
    : `<span class="wins"><b>${run.wins}</b>/${W.MAXWINS} wins</span>`;
  return `<div class="rnd pop-host" tabindex="0" aria-label="Round ${run.round}">
  <span class="rnum"><small>Round</small><b>${run.round}</b></span>
  <span class="rmeta">${lives()}${progress}</span>${tag}
  <div class="pop">
    <h5>The run</h5>
    <div class="tracker">${tracker()}</div>
    <dl>
      ${run.post ? `<dt>Beaten</dt><dd><b>${run.post.n}</b> past warbands</dd>` : `<dt>Wins</dt><dd><b>${run.wins}</b> of ${W.MAXWINS} to finish the run</dd>`}
      <dt>Lives</dt><dd>${lives()} <span>a loss costs one</span></dd>
      <dt>Record</dt><dd>${count('win')} won · ${count('loss')} lost · ${count('draw')} drawn</dd>
      ${run.post ? '' : `<dt>Next boss</dt><dd>Round ${boss}${boss === run.round ? ' (this round)' : `, in ${boss - run.round} round${boss - run.round > 1 ? 's' : ''}`}</dd>`}
      <dt>Gold</dt><dd>${run.gold}, +${inc} next round (${inc - int} base, ${int} interest${int < 3 ? `; ${10 - (run.gold % 10)} more for +1` : ''})</dd>
    </dl>
    <p class="pnote">The opponent is revealed when the fight starts.</p>
  </div>
</div>`;
}
const TIPS = [
  'Drag a unit onto the board and its neighbours slide aside to make room. The outline shows where it will land; red means it will not fit.',
  'Or select a unit, then a slot, to move it.',
  'Drop a unit or item on the shop to sell it, or right-click it.',
  'Right-click a shop card to freeze it, so it stays through rerolls and into the next round.',
  'Buy three of the same unit to upgrade it. An upgraded unit is twice as strong.',
  'Items go on units: select the item, then a unit. Three of the same item combine. Selling a unit returns its item.',
  'Raising your shop level opens more slots, for you and for your summons. Locked slots show the level that opens them.',
  'Each unit attacks whatever stands opposite it; with nothing opposite, the weaker enemy one slot to either side; with nothing in reach, the enemy hero.',
  'A unit wider than one slot attacks every enemy opposite it and splits its damage evenly between them.',
  'A hero with no units left takes triple damage. You do not see your opponent until the fight starts.',
  'Between rounds you choose one encounter. Every fifth round is a boss, and beating it earns a relic.',
];
const help = (): string =>
  `<div class="mhelp pop-host" tabindex="0" aria-label="How it works"><span class="qmark">?</span>
<div class="pop"><h4>How it works</h4><ul>${TIPS.map((t) => `<li>${t}</li>`).join('')}</ul></div></div>`;

/* ---- the shelf, bonuses, board and bench ---- */
function oddsRows(): string {
  const run = S.run!;
  const row = (lv: number) =>
    `<div class="orow${lv === run.level ? '' : ' next'}"><span>Lv ${lv}</span><span class="oddsbar">${W.ODDS[lv - 1]
      .map((p, i) =>
        p
          ? `<i style="flex:${p};background:var(--r${i + 1})" title="${RNAME[i + 1]} ${p}%"><span>${p}%</span></i>`
          : '',
      )
      .join('')}</span></div>`;
  return `<div class="modds" title="Chance of each rarity in the shop"><h3>Shop odds</h3>${row(run.level)}${run.level < 9 ? row(run.level + 1) : ''}</div>`;
}
function econ(): string {
  const run = S.run!,
    inc = W.income(run),
    int = W.interest(run),
    max = run.level >= 9,
    need = max ? 0 : W.XPNEED[run.level - 1];
  return `<div class="mecon">
  <div class="mpurse" title="${inc - int} base, ${int} interest. Interest: 1 gold per 10 held, up to 3. Winning adds 1 more."><span class="gcoin"></span><b>${run.gold}</b><small>+${inc} next round</small></div>
  <button class="mbtn level" data-act="xp" ${max ? 'disabled' : ''}><span class="lbl">Level ${run.level}<small>${max ? 'max' : `${run.xp}/${need} xp`}</small></span>${max ? '' : `<span class="xpbar"><i style="width:${(run.xp / need) * 100}%"></i></span>${coin(4, run.gold < 4 ? 'poor' : 'buy')}`}</button>
  ${oddsRows()}
  <button class="mbtn reroll" data-act="reroll"><span class="lbl">Reroll</span>${coin(run.freeRoll ? 0 : 2, !run.freeRoll && run.gold < 2 ? 'poor' : 'buy')}</button>
  <p class="hint">Right-click a card to freeze it. Drop a unit here to sell it.</p>
</div>`;
}
function bonuses(): string {
  const run = S.run!,
    { cnt, lv } = W.synergy(W.boardUnits(run));
  return Object.keys(W.TRIBES)
    .filter((k) => W.TRIBES[k].f === run.faction && W.TRIBES[k].th.length)
    .map((k) => {
      const T = W.TRIBES[k],
        c = cnt[k] || 0,
        l = lv[k] || 0,
        max = l >= T.th.length,
        next = max ? T.th[T.th.length - 1] : T.th[l];
      const steps = T.th.map((x) => `<i class="${c >= x ? 'on' : ''}">${x}</i>`).join('');
      const now = l ? `<span class="now">${T.text[l - 1]}</span>` : '';
      const line = max ? now : `${now}<span class="nx"><b>At ${next}:</b> ${T.text[l]}</span>`;
      return `<div class="bcard${l ? ' on' : ''}${c ? '' : ' none'}${!max && c === next - 1 ? ' close' : ''}"${T.note ? ` title="${T.note}"` : ''}>
<div class="bhead">${tribe(k)}<span class="steps">${steps}</span><b class="bcount">${c}<i>/${next}</i></b></div><div class="bline">${line}</div></div>`;
    })
    .join('');
}
function board(): string {
  const run = S.run!;
  const units = W.boardUnits(run)
    .map((o) => tile(o as W.UnitThing, `grid-column:${o.slot + 1}/span ${W.U[o.id].size};`))
    .join('');
  return `<div class="row p mrow" id="row0">${cells(0, W.openArr(W.openCount(run.level)), unlockLevel)}${units}</div>`;
}
function bench(): string {
  const run = S.run!;
  let h = '';
  for (let i = 0; i < W.BENCH; i++) {
    const t = run.things.find((x) => x.bench === i);
    h += `<div class="bcell" data-bench="${i}">${t ? (t.kind === 'item' ? itemTile(t) : tile(t)) : ''}</div>`;
  }
  return h;
}
function status(): string {
  const run = S.run!,
    sel = S.sel != null ? thing(S.sel) : null;
  if (S.msg) return `<span class="note">${S.msg}</span>`;
  if (sel)
    return `<span><b>${nameOf(sel)}</b> selected: ${sel.kind === 'item' ? 'choose a unit to equip it.' : 'choose a slot, or drag it.'}</span><button class="mbtn sellbtn" data-act="sell">Sell ${coin(W.sellValue(sel, run), 'sell')}</button>`;
  return '<span>Select a unit to move or sell it, or drag it. Hover any unit to read its card.</span>';
}

export function marketHTML(): string {
  return `<div class="mk"><div class="mk-in">
<header class="mtop">${commander()}${roundBadge()}<span class="tright"><button class="mbtn ghost" data-act="quit">${S.quitArm ? 'Press again to abandon' : 'Abandon run'}</button>${help()}<button class="mbtn fight" data-act="fight">Fight</button></span></header>
<section class="shelf" data-sellzone><div class="cards">${S.run!.shop.map(shopCard).join('')}</div>${econ()}<div class="sellveil"><span>Drop here to sell</span></div></section>
<section class="bonusbar">${bonuses()}</section>
<section class="boardrow">${board()}</section>
<section class="foot"><h3>Bench</h3><div class="mbench">${bench()}</div><div class="status" role="status">${status()}</div></section>
</div></div>`;
}
