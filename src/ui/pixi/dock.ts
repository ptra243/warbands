/* The strip under the Pixi battle field: your leader, relics and bonuses on the left, an inspector for the unit
   you point at in the middle, the enemy's on the right. Plain HTML, so the text is crisp and the field is never
   covered. It takes whatever height the field leaves; with too little room it collapses and the inspector becomes
   a small floating card while you point at something. Class names carry a pd- prefix to stay clear of style.css. */
import * as W from '../../engine/index.ts';
import type { Battle, BattleUnit } from '../../engine/index.ts';
import { ART } from '../art.ts';
import { CARD_ART } from '../card-art.ts';

const RARITY = ['', '#a9b0ae', '#6cc070', '#5aa4e6', '#b77be8', '#f0b23a'];
const RNAME = ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const FACTION_BG: Record<string, string> = { H: '#22344d', E: '#22402e', U: '#3a2a4e', N: '#40361f' };
/* only the mage scenes: the busts in card-art.ts are a dropped concept */
const SCENES = new Set(['apprentice', 'firemage', 'stormmage', 'archmage']);
const MIN_DOCK = 120;

let dock: HTMLElement | null = null,
  sides: HTMLElement[] = [],
  insp: HTMLElement | null = null;
let shown: number | null = null,
  live: Record<string, HTMLElement> = {};

export function initDock(el: HTMLElement): void {
  dock = el;
  el.innerHTML = `<section class="pd-side pd-s0"></section><section class="pd-insp"></section><section class="pd-side pd-s1"></section>`;
  sides = [el.querySelector<HTMLElement>('.pd-s0')!, el.querySelector<HTMLElement>('.pd-s1')!];
  insp = el.querySelector<HTMLElement>('.pd-insp')!;
  shown = null;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const glyph = (t: string) => `<span class="pd-glyph">${ART.tribe(t)}</span>`;
export const monogram = (name: string): string => name.replace(/^The /, '').replace(/[^A-Za-z]/g, '')[0] || '?';
const rarityOf = (cost: number) => Math.max(1, Math.min(5, cost || 1));

/* ---- each side: leader, relics, bonuses ---- */
export function setSides(B: Battle, counts: Record<string, number>[], titles: string[]): void {
  if (!dock) return;
  for (const s of [0, 1]) {
    const lead = B.lead[s],
      rel = Object.keys(B.rel[s]),
      cnt = counts[s],
      lv = B.syn[s];
    const bonuses = Object.keys(cnt)
      .filter((t) => W.TRIBES[t] && W.TRIBES[t].th.length)
      .sort((a, b) => (lv[b] || 0) - (lv[a] || 0) || cnt[b] - cnt[a])
      .map((t) => {
        const T = W.TRIBES[t],
          l = lv[t] || 0,
          target = T.th[Math.min(l, T.th.length - 1)];
        const text = l ? T.text[l - 1] : `Needs ${T.th[0]}`;
        return `<li class="${l ? 'pd-on' : ''}">${glyph(t)}<b>${t}</b><span class="pd-n">${cnt[t]}/${target}</span><span class="pd-t">${esc(text)}</span></li>`;
      })
      .join('');
    sides[s].innerHTML = `<h3>${esc(titles[s])}</h3>
${lead ? `<p class="pd-lead"><b>${esc(W.LEADERS[lead].name)}.</b> ${esc(W.LEADERS[lead].text)}</p>` : ''}
${rel.length ? `<ul class="pd-relics">${rel.map((r) => `<li><span class="pd-seal">${monogram(W.RELICS[r].name)}</span><span><b>${esc(W.RELICS[r].name)}.</b> ${esc(W.RELICS[r].text)}</span></li>`).join('')}</ul>` : ''}
${bonuses ? `<ul class="pd-bonuses">${bonuses}</ul>` : '<p class="pd-none">No class bonuses.</p>'}`;
  }
}

/* ---- the inspector ---- */
export function inspect(u: BattleUnit | null, why: string): void {
  if (!insp) return;
  if (!u) {
    if (shown === -1) return;
    shown = -1;
    insp.innerHTML = '<p class="pd-hint">Point at a unit to inspect it.</p>';
    return;
  }
  if (shown !== u.bid) {
    shown = u.bid;
    const d = u.d,
      r = rarityOf(d.cost),
      art =
        SCENES.has(d.id) && CARD_ART.has(d.id)
          ? CARD_ART.svg(d.id, d.name, false, '-insp')
          : `<div class="pd-icon" style="background:${FACTION_BG[d.f] || '#333'}">${ART.unit(d.id)}</div>`;
    const item = u.o.item ? W.ITEMS[u.o.item] : null;
    insp.innerHTML = `<div class="pd-pic" style="--rare:${RARITY[r]}">${art}</div>
<div class="pd-info">
  <div class="pd-title"><span class="pd-why"></span><h3>${esc(d.name)}${(u.o.tier || 1) > 1 ? ` <span class="pd-stars">${'★'.repeat(u.o.tier || 1)}</span>` : ''}</h3>
  <span class="pd-chip" style="--c:${RARITY[r]}">${RNAME[r]}</span>${u.tribes.map((t) => `<span class="pd-chip">${glyph(t)}${t}</span>`).join('')}${u.size > 1 ? `<span class="pd-chip">${u.size} slots</span>` : ''}<span class="pd-chip pd-side${u.side}">${u.side === 0 ? 'Yours' : 'Enemy'}</span></div>
  <p class="pd-ability">${esc(d.txt(u.m))}</p>
  ${item ? `<p class="pd-item"><span class="pd-isock">${ART.item(item.base || u.o.item!)}</span><span><b>${esc(item.name)}.</b> ${esc(item.text)}</span></p>` : ''}
  <div class="pd-live">
    <span class="pd-stat pd-atk">Attack <b data-k="atk"></b></span>
    <span class="pd-stat">Health <b data-k="hp"></b></span>
    <span class="pd-stat">Next attack <span class="pd-cdbar"><i data-k="cd"></i></span></span>
    <span class="pd-status" data-k="status"></span>
  </div>
</div>`;
    live = {};
    insp.querySelectorAll<HTMLElement>('[data-k]').forEach((el) => (live[el.dataset.k!] = el));
  }
  insp.querySelector('.pd-why')!.textContent = why;
  /* the numbers that change during the fight */
  live.atk.textContent = u.d.building ? '–' : String(Math.round(W.effAtk(u)));
  live.hp.textContent = `${Math.max(0, Math.round(u.hp))} / ${Math.round(u.maxhp)}`;
  const cd = u.d.building ? (u.d.every ? u.at / u.d.every : 0) : Math.min(1, u.t / u.cd);
  live.cd.style.width = (cd * 100).toFixed(1) + '%';
  const st: string[] = [];
  if (!u.alive) st.push('<span class="pd-dead">Defeated</span>');
  if (u.shield > 0) st.push(`<span class="pd-sh">Shield ${Math.round(u.shield)}</span>`);
  if (u.rot > 0) st.push(`<span class="pd-rot">Rot ${u.rot}</span>`);
  if (u.burnT > 0) st.push('<span class="pd-burn">Burning</span>');
  if (u.weak > 0) st.push('<span class="pd-weak">Weakened</span>');
  live.status.innerHTML = st.join('');
}

/* ---- size: take the leftover height, or collapse to a floating card ---- */
export function layoutDock(height: number): void {
  if (!dock) return;
  const collapsed = height < MIN_DOCK;
  dock.classList.toggle('pd-collapsed', collapsed);
  dock.style.height = collapsed ? '' : Math.floor(height) + 'px';
}
/* in collapsed mode the inspector only shows while pointing at something */
export function setPointing(on: boolean): void {
  if (dock) dock.classList.toggle('pd-pointing', on);
}
