/* The classic battle screen, drawn in HTML: the fallback when Pixi can't run, and the player's other choice.
   One of the two battle screens the playback driver in battle.ts draws through. */
import type * as W from '../engine/index.ts';
import { buHTML, n } from './html.ts';
import type { BattleScreen } from './battle.ts';

let els: Record<number, HTMLElement> = {};

function float(el: HTMLElement | undefined, text: string, cls: string): void {
  if (!el || el.querySelectorAll('.fl').length > 3) return;
  const s = document.createElement('span');
  s.className = 'fl ' + cls;
  s.textContent = text;
  s.style.left = 30 + Math.random() * 40 + '%';
  el.appendChild(s);
  setTimeout(() => s.remove(), 700);
}
/** restart a one-shot CSS animation */
function replay(el: HTMLElement | null | undefined, cls: string): void {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function show(f: W.PlaybackFrame, e: W.BattleEvent): void {
  const el = els[e.b!];
  if (e.t === 'summon') {
    const u = f.units.get(e.b!)?.unit;
    if (u && !els[u.bid]) {
      document.getElementById('row' + u.side)!.insertAdjacentHTML('beforeend', buHTML(u));
      const ne = document.getElementById('bu' + u.bid)!;
      ne.classList.add('spawn');
      els[u.bid] = ne;
    }
  } else if (e.t === 'die') {
    if (el) {
      el.classList.add('dead');
      el.removeAttribute('id');
      setTimeout(() => el.remove(), 350);
      delete els[e.b!];
    }
  } else if (e.t === 'hit') {
    if (e.v! >= 1) float(el, (e.flank ? 'Flank ' : '') + '-' + n(e.v!), e.crit ? 'crit' : e.flank ? 'flank' : 'dmg');
  } else if (e.t === 'heal') {
    if (e.v! >= 1) float(el, '+' + n(e.v!), 'heal');
  } else if (e.t === 'revive') float(el, 'Rises', 'heal');
  else if (e.t === 'buff') float(el, '+' + n(e.a!) + '/+' + n(e.h!), 'heal');
  else if (e.t === 'rot') float(el, 'Rot', 'blight');
  else if (e.t === 'smite') float(el, 'Smite', 'smite');
  else if (e.t === 'atk') replay(el, 'lunge');
  else if (e.t === 'hero') replay(document.getElementById('hero' + e.side), 'flash');
}

function paint(f: W.PlaybackFrame): void {
  const q = (el: ParentNode, sel: string) => el.querySelector<HTMLElement>(sel)!;
  for (const s of f.units.values()) {
    const el = els[s.unit.bid];
    if (!el) continue;
    q(el, '.hpb i').style.width = s.hpK * 100 + '%';
    q(el, '.hpb u').style.width = s.shieldK * 100 + '%';
    q(el, '.cdb i').style.width = s.cdK * 100 + '%';
    q(el, '.h').textContent = String(s.hp);
    if (s.atk != null) q(el, '.a').textContent = String(s.atk);
    const rb = q(el, '.rotb');
    if (s.rot > 0) {
      rb.hidden = false;
      rb.textContent = String(s.rot);
    } else rb.hidden = true;
    const ac = el.querySelector<HTMLElement>('.aimc');
    if (ac && ac.dataset.aim !== s.aim) ac.dataset.aim = s.aim;
    el.classList.toggle('weak', s.weak || s.rot > 0);
    el.classList.toggle('rot', s.rot > 0);
    el.classList.toggle('burn', s.burning);
  }
  for (const side of [0, 1]) {
    const h = document.getElementById('hero' + side);
    if (!h) continue;
    q(h, 'i').style.width = f.heroes[side].k * 100 + '%';
    q(h, 'b').textContent = String(f.heroes[side].hp);
  }
  const c = document.getElementById('clock');
  if (c) c.textContent = Math.floor(f.time) + 's' + (f.sudden ? ' · Sudden death: both heroes are taking damage' : '');
}

/** The classic HTML battle screen. It draws into the battle markup render() has just put on the page. */
export const classicScreen: BattleScreen = {
  mount(B) {
    els = {};
    for (const u of B.units) {
      const e = document.getElementById('bu' + u.bid);
      if (e) els[u.bid] = e;
    }
    return true;
  },
  frame(f) {
    for (const e of f.events) show(f, e);
    paint(f);
    return f.over;
  },
  unmount() {
    els = {};
  },
};
