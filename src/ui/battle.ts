/* Attack lines, shop previews and battle playback. */
import * as W from '../engine/index.ts';
import { buHTML, foeMul, inspTarget, n } from './html.ts';
import { saveLog } from './storage.ts';
import { render } from './render.ts';
import { S, root } from './state.ts';

/* ---- attack lines ---- */
export const NS = 'http://www.w3.org/2000/svg';
export function fxLine(fromEl: Element | null, toEl: Element | null, side: number, cls: string, ttl?: number): void {
  const svg = document.getElementById('fx');
  if (!svg || !fromEl) return;
  const R = svg.getBoundingClientRect(),
    a = fromEl.getBoundingClientRect();
  const x1 = a.left + a.width / 2 - R.left,
    y1 = a.top + a.height / 2 - R.top;
  let x2 = x1,
    y2 = side === 0 ? 4 : R.height - 4;
  if (toEl) {
    const b = toEl.getBoundingClientRect();
    x2 = b.left + b.width / 2 - R.left;
    y2 = b.top + b.height / 2 - R.top;
  }
  const l = document.createElementNS(NS, 'line'),
    k0 = toEl ? 0.3 : 0.45,
    k1 = toEl ? 0.78 : 1;
  l.setAttribute('x1', String(x1 + (x2 - x1) * k0));
  l.setAttribute('y1', String(y1 + (y2 - y1) * k0));
  l.setAttribute('x2', String(x1 + (x2 - x1) * k1));
  l.setAttribute('y2', String(y1 + (y2 - y1) * k1));
  l.setAttribute('class', 'tr s' + side + ' ' + cls);
  l.setAttribute('marker-end', `url(#ah${side})`);
  svg.appendChild(l);
  if (ttl) setTimeout(() => l.remove(), ttl);
}
export function drawPreview() {
  document.querySelectorAll('.tr.pv').forEach((e) => e.remove());
  document.querySelectorAll('.aimed').forEach((e) => e.classList.remove('aimed'));
  if (S.screen !== 'shop') return;
  const x = inspTarget();
  if (!x || !x.pv) return;
  const from = root.querySelector(`.row.p [data-own="${x.t.uid}"]`);
  if (!from) return;
  if (x.pv.hero) {
    const h = document.getElementById('hero1');
    if (h) h.classList.add('aimed');
    return;
  }
  for (const id of x.pv.to) {
    const to = root.querySelector(`[data-insp="enemy:${id}"]`);
    if (to) to.classList.add('aimed');
  }
}

/* ---- battle playback ---- */
let raf = 0,
  last = 0,
  els: Record<number, HTMLElement> = {};
export function bind() {
  els = {};
  for (const u of S.B!.units) {
    const e = document.getElementById('bu' + u.bid);
    if (e) els[u.bid] = e;
  }
}
export function float(el: HTMLElement | undefined, text: string, cls: string): void {
  if (!el || el.querySelectorAll('.fl').length > 3) return;
  const s = document.createElement('span');
  s.className = 'fl ' + cls;
  s.textContent = text;
  s.style.left = 30 + Math.random() * 40 + '%';
  el.appendChild(s);
  setTimeout(() => s.remove(), 700);
}
export function drain(B: W.Battle): void {
  for (const e of B.ev) {
    const el = els[e.b!];
    if (e.t === 'summon') {
      const u = B.units.find((x) => x.bid === e.b);
      if (u && u.alive) {
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
    else if (e.t === 'atk') {
      if (el) {
        el.classList.remove('lunge');
        void el.offsetWidth;
        el.classList.add('lunge');
      }
    } else if (e.t === 'hero') {
      const h = document.getElementById('hero' + e.side);
      if (h) {
        h.classList.remove('flash');
        void h.offsetWidth;
        h.classList.add('flash');
      }
    }
  }
  B.ev.length = 0;
}
export function paint(B: W.Battle): void {
  const q = (el: ParentNode, sel: string) => el.querySelector<HTMLElement>(sel)!;
  for (const u of B.units) {
    const el = els[u.bid];
    if (!el || !u.alive) continue;
    q(el, '.hpb i').style.width = Math.max(0, (u.hp / u.maxhp) * 100) + '%';
    q(el, '.hpb u').style.width = Math.min(100, (u.shield / u.maxhp) * 100) + '%';
    q(el, '.cdb i').style.width =
      (u.d.building ? (u.d.every ? u.at / u.d.every : 0) : Math.min(1, u.t / u.cd)) * 100 + '%';
    q(el, '.h').textContent = String(Math.max(1, n(u.hp)));
    if (!u.d.building) q(el, '.a').textContent = String(n(W.effAtk(u)));
    const rb = q(el, '.rotb');
    if (u.rot > 0) {
      rb.hidden = false;
      rb.textContent = String(u.rot);
    } else rb.hidden = true;
    const ac = el.querySelector<HTMLElement>('.aimc'),
      dir = W.aimDir(B, u);
    if (ac && ac.dataset.aim !== dir) ac.dataset.aim = dir;
    el.classList.toggle('weak', u.weak > 0 || u.rot > 0);
    el.classList.toggle('rot', u.rot > 0);
    el.classList.toggle('burn', u.burnT > 0);
  }
  for (const s of [0, 1]) {
    const h = document.getElementById('hero' + s);
    if (!h) continue;
    q(h, 'i').style.width = Math.max(0, (B.hero[s].hp / B.hero[s].max) * 100) + '%';
    q(h, 'b').textContent = String(n(B.hero[s].hp));
  }
  const c = document.getElementById('clock');
  if (c) c.textContent = Math.floor(B.time) + 's' + (B.sudden ? ' · Sudden death: both heroes are taking damage' : '');
}
export function frame(ts: number): void {
  const B = S.B;
  if (!B || S.screen !== 'battle' || S.result) return;
  let acc = Math.min(0.1, (ts - last) / 1000) * S.speed;
  last = ts;
  while (acc > 1e-6 && !B.over) {
    const d = Math.min(0.05, acc);
    W.step(B, d);
    acc -= d;
  }
  drain(B);
  paint(B);
  if (B.over) endBattle();
  else raf = requestAnimationFrame(frame);
}
export function startBattle() {
  const run = S.run!;
  if (!W.boardUnits(run).length) {
    S.msg = 'Put at least one unit on the board first.';
    render();
    return;
  }
  S.campFight = false;
  S.foeLead = run.enemy.leader || null;
  S.foeTitle =
    (run.enemy.title || (run.post ? W.FACTIONS[run.enemy.faction].name : '')) + (run.post ? foeMul(run) : '');
  S.foe = run.enemy.faction;
  S.B = W.startBattle(run);
  S.screen = 'battle';
  S.sel = null;
  S.insp = null;
  S.result = null;
  S.msg = '';
  render();
  bind();
  paint(S.B!);
  last = performance.now();
  raf = requestAnimationFrame(frame);
}
export function startCamp() {
  const run = S.run!;
  if (!W.boardUnits(run).length) {
    run.camp = null;
    S.msg = 'You had no units on the board, so you passed the camp by.';
    S.screen = 'shop';
    render();
    return;
  }
  S.campFight = true;
  S.foeLead = null;
  S.foeTitle = run.camp!.name;
  S.foe = 'N';
  S.B = W.startCamp(run);
  S.screen = 'battle';
  S.sel = null;
  S.insp = null;
  S.result = null;
  S.msg = '';
  render();
  bind();
  paint(S.B!);
  last = performance.now();
  raf = requestAnimationFrame(frame);
}
export function endBattle() {
  const B = S.B!;
  const rep = W.battleReport(B),
    foe = S.foeTitle || W.FACTIONS[S.foe].name;
  if (S.campFight) {
    const c = W.finishCamp(S.run!, B);
    S.result = { camp: true };
    S.sum = {
      rep,
      res: c.win ? 'win' : 'draw',
      title: c.win ? 'Camp cleared' : 'Driven off',
      bits: [c.msg, 'No life was at stake.'],
      foe,
      go: 'On to the shop',
      round: 'Camp',
    };
  } else {
    const run = S.run!,
      wasBoss = run.enemy.boss,
      round = B.round,
      r = W.finishBattle(run, B);
    S.result = r;
    if (run.over) saveLog();
    const bits: string[] = [];
    if (r.res === 'loss') bits.push(run.lives > 0 ? `You lose a life. ${run.lives} left.` : 'That was your last life.');
    if (!run.over) bits.push(`+${r.income} gold.`);
    if (r.grown) bits.push(`${r.grown} unit${r.grown > 1 ? 's' : ''} grew stronger.`);
    if (wasBoss && r.res === 'win' && !run.over) bits.push('The boss leaves a relic behind.');
    S.sum = {
      rep,
      res: r.res,
      title: r.res === 'win' ? 'Victory' : r.res === 'loss' ? 'Defeat' : 'Draw',
      bits,
      foe,
      go: run.over ? 'See how it ended' : 'Continue',
      round: 'Round ' + round,
    };
  }
  stopBattleLoop();
  S.screen = 'summary';
  render();
}
export const stopBattleLoop = (): void => cancelAnimationFrame(raf);
