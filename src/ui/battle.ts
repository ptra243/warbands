/* Attack lines, shop previews, and the playback driver behind both battle screens. */
import * as W from '../engine/index.ts';
import { inspTarget, oppName } from './html.ts';
import { saveLog } from './storage.ts';
import { render } from './render.ts';
import { S, root } from './state.ts';
import { pixiScreen } from './pixi/battle-view.ts';
import { classicScreen } from './classic-battle.ts';

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

/* ---- battle playback ----
   One driver: each animation frame it advances the battle's playback and hands the frame to whichever battle
   screen is showing. The screens only draw; they never step the battle or decide when it ends. */

/** what the driver needs from a battle screen */
export interface BattleScreen {
  /** draw battle B's screen into the markup render() just put on the page. Resolves false if this screen can't
   *  run here. Playback waits until it resolves. */
  mount(B: W.Battle, foeName: string): boolean | Promise<boolean>;
  /** draw one frame (`real`: real seconds since the last one). True once the end has been shown and the summary
   *  can take over. */
  frame(f: W.PlaybackFrame, real: number): boolean;
  unmount(): void;
}

let raf = 0,
  last = 0,
  /* bumped whenever the loop stops, so a mount still loading for an older showing is ignored */
  showing = 0,
  screen: BattleScreen | null = null,
  play: W.Playback | null = null,
  reported = false;

/* the playback of the battle being fought; it outlives a switch between battle screens */
function playback(B: W.Battle): W.Playback {
  if (!play || play.battle !== B) {
    play = W.createPlayback(B, S.speed);
    reported = false; // a drawing error is reported once per battle
  }
  return play;
}

function loop(ts: number): void {
  const B = S.B;
  if (!B || !screen || S.screen !== 'battle' || S.result) return;
  const real = Math.max(0, (ts - last) / 1000);
  last = ts;
  const p = playback(B);
  p.speed = S.speed;
  const f = p.advance(real);
  let done: boolean;
  try {
    done = screen.frame(f, Math.min(0.1, real));
  } catch (e) {
    /* a drawing error must not freeze the fight: report it once and carry on */
    if (!reported) console.error('Battle screen error', e);
    reported = true;
    done = f.over;
  }
  if (done) endBattle();
  else raf = requestAnimationFrame(loop);
}

/* mount the battle screen in use and start playback once it is ready */
async function mountScreen(B: W.Battle): Promise<void> {
  const id = ++showing,
    s = usePixi() ? pixiScreen : classicScreen;
  let ok: boolean;
  try {
    ok = await s.mount(B, foeName());
  } catch (e) {
    console.warn('The battle screen failed to start.', e);
    ok = false;
  }
  /* remember a Pixi failure even when this mount was overtaken, so the next battle goes straight to classic */
  if (!ok && s === pixiScreen) pixiFailed = true;
  if (id !== showing || S.B !== B || S.screen !== 'battle' || S.result) return;
  if (!ok) {
    if (s === pixiScreen) showBattle(); // redraw with the classic screen's markup
    return;
  }
  screen = s;
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

/** start the fight the run is waiting for: the chosen camp in the camp phase, otherwise the round's battle */
export function startFight() {
  const run = S.run!,
    camp = W.phase(run) === 'camp';
  if (!camp && !W.boardUnits(run).length) {
    S.msg = 'Put at least one unit on the board first.';
    render();
    return;
  }
  S.opp = W.opponent(run);
  S.B = camp ? W.startCamp(run) : W.startBattle(run);
  S.screen = 'battle';
  S.sel = null;
  S.insp = null;
  S.result = null;
  S.msg = '';
  showBattle();
}

/* ---- which battle screen: the Pixi one, or the classic HTML one ---- */
const VIEW_KEY = 'warband:battle-view';
let choice: 'pixi' | 'classic' | null = null,
  pixiFailed = false;
/** true when the battle should be drawn with Pixi: the player's choice (Pixi by default), unless Pixi couldn't
 *  start in this browser */
export function usePixi(): boolean {
  if (pixiFailed) return false;
  if (!choice)
    try {
      choice = localStorage.getItem(VIEW_KEY) === 'classic' ? 'classic' : 'pixi';
    } catch {
      choice = 'pixi'; // storage blocked: the choice lasts until the page reloads
    }
  return choice === 'pixi';
}
export const pixiAvailable = (): boolean => !pixiFailed;
/** switch battle screens; mid-battle, the fight carries on in the other view */
export function setBattleView(view: 'pixi' | 'classic'): void {
  choice = view;
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    /* storage blocked: kept in memory only */
  }
  if (S.screen === 'battle' && S.B && !S.result) {
    stopBattleLoop();
    showBattle();
  }
}
export const foeName = (): string => oppName(S.opp!);
/* draw the battle screen and start the fight playing in whichever view is in use */
function showBattle(): void {
  stopBattleLoop();
  render();
  void mountScreen(S.B!);
}
export function endBattle() {
  const B = S.B!;
  const rep = W.battleReport(B),
    st = W.battleStats(B),
    foe = foeName();
  S.sumOpen = null;
  S.sumTab = 'you';
  if (S.opp!.camp) {
    const c = W.finishCamp(S.run!, B);
    S.result = { camp: true };
    S.sum = {
      rep,
      st,
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
      st,
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
/** stop playback and take down the battle screen (on skip, quit, the end, or a switch of screens). The playback
 *  itself is kept, so a fight switched to the other screen carries on where it was. */
export function stopBattleLoop(): void {
  cancelAnimationFrame(raf);
  showing++;
  screen?.unmount();
  screen = null;
  /* a Pixi mount still loading is abandoned too */
  pixiScreen.unmount();
}
