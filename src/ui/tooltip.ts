/* Unit details float beside whatever is hovered, focused or (on touch) selected. */
import { detailHTML } from './html.ts';
import { S, root } from './state.ts';

let tipT: ReturnType<typeof setTimeout> | undefined;
export const tipEl = () => {
  let t = document.getElementById('tip');
  if (!t) {
    t = document.createElement('div');
    t.id = 'tip';
    t.className = 'tip';
    t.setAttribute('role', 'tooltip');
    t.hidden = true;
    document.body.appendChild(t);
  }
  return t;
};
export function hideTip() {
  clearTimeout(tipT);
  tipT = undefined;
  const t = document.getElementById('tip');
  if (t) t.hidden = true;
}
export function placeTip(a: HTMLElement | null): void {
  const t = tipEl(),
    html = a && a.isConnected ? detailHTML() : '';
  if (!html || !a) {
    t.hidden = true;
    return;
  }
  t.innerHTML = html;
  t.hidden = false;
  t.style.left = '0px';
  t.style.top = '0px';
  const r = a.getBoundingClientRect(),
    w = t.offsetWidth,
    h = t.offsetHeight,
    vw = window.innerWidth,
    vh = window.innerHeight,
    g = 10;
  let x, y;
  if (a.closest('#row0') && r.bottom + g + h <= vh - 8) {
    t.style.left = Math.round(Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2))) + 'px';
    t.style.top = Math.round(r.bottom + g) + 'px';
    return;
  } // your own row: drop below it, over the bench, so the board stays visible
  if (r.right + g + w <= vw - 8) x = r.right + g;
  else if (r.left - g - w >= 8) x = r.left - g - w;
  else x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
  if (x >= r.right || x + w <= r.left) y = Math.max(8, Math.min(vh - h - 8, r.top));
  else y = r.bottom + g + h <= vh - 8 ? r.bottom + g : Math.max(8, r.top - g - h);
  t.style.left = Math.round(x) + 'px';
  t.style.top = Math.round(y) + 'px';
}
export function showTip(a: HTMLElement, now?: boolean): void {
  clearTimeout(tipT);
  const t = document.getElementById('tip');
  if (now || (t && !t.hidden)) placeTip(a);
  else tipT = setTimeout(() => placeTip(a), 220);
}
export function afterRender() {
  hideTip();
  if (S.touch && S.sel != null && S.screen === 'shop') {
    const el = root.querySelector<HTMLElement>(`[data-own="${S.sel}"]`);
    if (el) {
      S.insp = null;
      showTip(el, true);
    }
  }
}
