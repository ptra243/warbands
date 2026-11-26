/* Clicks, keys, drag and drop, context menu. */
import * as W from '../engine/index.ts';
import { nameOf, thing } from './html.ts';
import { setSave } from './status.ts';
import { downloadRuns, keepGoing } from './storage.ts';
import { hideTip, showTip } from './tooltip.ts';
import { render } from './render.ts';
import { drawPreview, endBattle, setBattleView, startBattle, startCamp, stopBattleLoop } from './battle.ts';
import { S, root } from './state.ts';

/* ---- input ---- */
/* which board slot the pointer is over, from the player row's geometry */
export function slotAt(e: MouseEvent): number | null {
  const row = (e.target as HTMLElement).closest && (e.target as HTMLElement).closest<HTMLElement>('#row0');
  if (!row || S.screen !== 'shop') return null;
  const r = row.getBoundingClientRect();
  return Math.max(0, Math.min(9, Math.floor((e.clientX - r.left) / (r.width / 10))));
}
export function clearDrop() {
  S.hover = null;
  document.querySelectorAll('.dropmark').forEach((x) => x.remove());
  document.querySelectorAll('[data-push]').forEach((x) => x.removeAttribute('data-push'));
}
/* outline where the held unit would land and nudge the units it would push */
export function showDrop(slot: number | null): void {
  if (slot === S.hover) return;
  clearDrop();
  S.hover = slot;
  const row = document.getElementById('row0'),
    t = S.sel != null ? thing(S.sel) : null;
  if (slot == null || !row || !t || t.kind !== 'unit') return;
  const size = W.U[t.id].size,
    P = W.tryMove(S.run!, t, { slot });
  if (P && P.slot === t.slot && !P.moves.length) return;
  const m = document.createElement('div');
  m.className = 'dropmark' + (P ? '' : ' bad');
  const s = P ? P.slot! : Math.min(slot, 10 - size);
  m.style.gridColumn = `${s + 1}/span ${size}`;
  row.appendChild(m);
  if (P)
    for (const mv of P.moves) {
      const el = row.querySelector<HTMLElement>(`[data-own="${mv.uid}"]`);
      if (el) el.dataset.push = mv.to == null ? 'b' : mv.to > mv.from! ? 'r' : 'l';
    }
}
export function act(a: HTMLElement): void {
  const run = S.run!,
    sel = S.sel != null ? thing(S.sel) : null;
  S.msg = '';
  if (a.dataset.own) {
    const t = thing(+a.dataset.own);
    if (!t) return;
    if (!sel) S.sel = t.uid;
    else if (sel === t) S.sel = null;
    else if (sel.kind === 'item' && t.kind === 'unit') {
      W.equip(run, sel, t);
      S.sel = null;
    } else if (t.kind === 'item' && sel.kind === 'unit') {
      W.equip(run, t, sel);
      S.sel = null;
    } else {
      if (
        !W.moveTo(
          run,
          sel,
          t.slot != null ? { slot: sel.kind === 'unit' && S.hover != null ? S.hover : t.slot } : { bench: t.bench },
        )
      )
        S.msg = "There's no room to fit it there. Clear a slot first.";
      S.sel = null;
    }
  } else if (a.dataset.bench) {
    if (sel) {
      W.moveTo(run, sel, { bench: +a.dataset.bench });
      S.sel = null;
    }
  } else if (a.dataset.slot) {
    if (sel) {
      if (sel.kind === 'item') S.msg = 'Items go on units. Select the item, then a unit.';
      else if (!W.moveTo(run, sel, { slot: +a.dataset.slot })) S.msg = "It doesn't fit there.";
      S.sel = null;
    }
  }
  render();
}
export function command(c: string): void {
  const run = S.run!;
  S.msg = '';
  if (c !== 'quit') S.quitArm = false;
  if (c.startsWith('pick:')) {
    S.pickF = c.slice(5) as W.PlayerFaction;
    S.screen = 'leader';
  } else if (c === 'back') {
    S.screen = 'pick';
  } else if (c.startsWith('leader:')) {
    S.save = '';
    S.run = W.newRun(S.pickF!, c.slice(7));
    S.screen = 'shop';
    S.sel = null;
  } else if (c.startsWith('enc:')) {
    const r = W.chooseOffer(run, +c.slice(4));
    if (!r) return;
    if (r.fight) {
      startCamp();
      return;
    }
    S.msg = r.msg || '';
    S.screen = 'shop';
  } else if (c === 'keepgoing') {
    keepGoing();
    return;
  } else if (c === 'dlruns') {
    downloadRuns();
    return;
  } else if (c === 'newrun') {
    S.run = null;
    S.save = '';
    S.dlmsg = '';
    S.screen = 'pick';
  } else if (c === 'copylog') {
    const text = JSON.stringify(W.exportLog(run)),
      fail = () => {
        const d = document.getElementById('rawlog') as HTMLDetailsElement | null,
          t = document.getElementById('rawtext') as HTMLTextAreaElement | null;
        if (d) d.open = true;
        if (t) {
          t.focus();
          t.select();
        }
        setSave('Copy was blocked. The full log is selected below: press Ctrl+C.');
      };
    try {
      navigator.clipboard.writeText(text).then(() => setSave('Run log copied. Paste it into the chat.'), fail);
    } catch {
      fail();
    }
    return;
  } else if (c === 'quit') {
    if (S.quitArm) {
      stopBattleLoop();
      S.quitArm = false;
      S.run = null;
      S.B = null;
      S.result = null;
      S.screen = 'pick';
    } else S.quitArm = true;
  } else if (c === 'reroll') {
    if (!W.reroll(run)) S.msg = 'A reroll costs 2 gold.';
  } else if (c === 'xp') {
    if (!W.buyXp(run)) S.msg = 'Buying XP costs 4 gold.';
  } else if (c === 'sell') {
    const t = thing(S.sel);
    if (t) W.sell(run, t);
    S.sel = null;
  } else if (c.startsWith('sellid:')) {
    const t = thing(+c.slice(7));
    if (t) {
      W.sell(run, t);
      if (S.sel === t.uid) S.sel = null;
    }
  } else if (c === 'fight') {
    startBattle();
    return;
  } else if (c.startsWith('speed:')) {
    S.speed = +c.slice(6);
    document.querySelectorAll<HTMLElement>('[data-act^="speed:"]').forEach((b) => {
      b.classList.toggle('active', b.dataset.act === c);
      b.setAttribute('aria-pressed', String(b.dataset.act === c));
    });
    return;
  } else if (c === 'view:pixi' || c === 'view:classic') {
    setBattleView(c === 'view:pixi' ? 'pixi' : 'classic');
    return;
  } else if (c === 'skip') {
    const B = S.B;
    if (!B || S.result) return;
    stopBattleLoop();
    let g = 0;
    while (!B.over && g++ < 20000) W.step(B, 0.05);
    B.ev.length = 0;
    endBattle();
    return;
  } else if (c === 'continue') {
    S.B = null;
    S.result = null;
    S.sum = null;
    S.campFight = false;
    S.screen = run.over ? 'end' : run.offer ? 'encounter' : 'shop';
  }
  render();
}
export function installInput(): void {
  root.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-act],[data-shop],[data-own],[data-bench],[data-slot]',
    );
    if (!a) return;
    if (a.dataset.act) return command(a.dataset.act);
    if (S.screen !== 'shop') return;
    if (a.dataset.shop) {
      const s = S.run!.shop[+a.dataset.shop],
        r = W.buy(S.run!, +a.dataset.shop);
      S.msg = '';
      if (!r.ok) S.msg = r.msg || '';
      else if (r.merged!.length || r.items!.length)
        S.msg = r
          .merged!.map((m) => `${W.U[m.id].name} upgraded to tier ${m.tier}.`)
          .concat(r.items!.map((k) => `Three combined into a ${W.ITEMS[k].name}.`))
          .join(' ');
      else if (s && s.kind === 'item') S.msg = 'Item added to your bench. Select it, then a unit to equip.';
      S.insp = null;
      render();
      return;
    }
    act(a);
  });
  root.addEventListener('keydown', (e) => {
    if (
      (e.key === 'Enter' || e.key === ' ') &&
      (e.target as HTMLElement).matches('[data-own]') &&
      S.screen === 'shop'
    ) {
      e.preventDefault();
      const id = (e.target as HTMLElement).dataset.own;
      act(e.target as HTMLElement);
      const again = root.querySelector<HTMLElement>(`[data-own="${id}"]`);
      if (again) again.focus();
    }
  });
  root.addEventListener('mouseover', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-insp]'),
      k = a ? a.dataset.insp! : null;
    if (k !== S.insp) {
      S.insp = k;
      drawPreview();
      if (k && !S.drag) showTip(a!);
      else hideTip();
    }
  });
  root.addEventListener('mouseleave', () => {
    if (S.insp) {
      S.insp = null;
      drawPreview();
    }
    hideTip();
  });
  root.addEventListener('focusin', (e) => {
    const a = (e.target as HTMLElement).closest && (e.target as HTMLElement).closest<HTMLElement>('[data-insp]');
    if (a && a.matches(':focus-visible') && !S.drag) {
      S.insp = a.dataset.insp!;
      drawPreview();
      showTip(a, true);
    }
  });
  root.addEventListener('focusout', (e) => {
    if ((e.target as HTMLElement).closest && (e.target as HTMLElement).closest<HTMLElement>('[data-insp]')) hideTip();
  });
  window.addEventListener(
    'pointerdown',
    (e) => {
      S.touch = e.pointerType === 'touch';
      if (!(e.target as HTMLElement).closest || !(e.target as HTMLElement).closest<HTMLElement>('[data-insp]'))
        hideTip();
    },
    true,
  );
  function closeCtx() {
    const c = document.getElementById('ctx');
    if (c) c.remove();
  }
  root.addEventListener('contextmenu', (e) => {
    if (S.screen !== 'shop') return;
    const sh = (e.target as HTMLElement).closest<HTMLElement>('[data-shop]');
    if (sh) {
      e.preventDefault();
      W.toggleFreeze(S.run!, +sh.dataset.shop!);
      S.msg = '';
      render();
      return;
    }
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-own]');
    if (!a) return;
    e.preventDefault();
    closeCtx();
    hideTip();
    const t = thing(+a.dataset.own!);
    if (!t) return;
    const m = document.createElement('div');
    m.id = 'ctx';
    m.className = 'ctx';
    m.innerHTML = `<button data-act="sellid:${t.uid}">Sell ${nameOf(t)} for <b class="g">${W.sellValue(t, S.run)}</b> gold</button>`;
    m.style.left = Math.max(8, Math.min(e.clientX, window.innerWidth - 240)) + 'px';
    m.style.top = Math.max(8, Math.min(e.clientY, window.innerHeight - 60)) + 'px';
    root.appendChild(m);
    (m.firstChild as HTMLElement).focus();
  });
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest<HTMLElement>('#ctx')) closeCtx();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCtx();
  });
  window.addEventListener(
    'scroll',
    () => {
      closeCtx();
      hideTip();
    },
    true,
  );
  root.addEventListener(
    'toggle',
    (e) => {
      if ((e.target as HTMLElement) && (e.target as HTMLElement).id === 'helpbox')
        S.helpOpen = (e.target as HTMLDetailsElement).open;
    },
    true,
  );
  root.addEventListener('dragstart', (e) => {
    const a = (e.target as HTMLElement).closest && (e.target as HTMLElement).closest<HTMLElement>('[data-own]');
    if (!a || S.screen !== 'shop') return;
    S.sel = +a.dataset.own!;
    e.dataTransfer!.setData('text/plain', a.dataset.own!);
    e.dataTransfer!.effectAllowed = 'move';
    a.classList.add('sel');
    S.drag = true;
    hideTip();
  });
  root.addEventListener('dragover', (e) => {
    if (S.sel == null) return;
    const s = slotAt(e);
    if (s != null || (e.target as HTMLElement).closest<HTMLElement>('[data-own],[data-bench],[data-slot]'))
      e.preventDefault();
    showDrop(s);
  });
  root.addEventListener('mousemove', (e) => {
    if (S.sel == null || S.screen !== 'shop') {
      if (S.hover != null) clearDrop();
      return;
    }
    showDrop(slotAt(e));
  });
  root.addEventListener('drop', (e) => {
    e.preventDefault();
    if (S.sel == null || S.screen !== 'shop') return;
    const ds = slotAt(e),
      held = thing(S.sel);
    if (ds != null && held && held.kind === 'unit') {
      S.msg = W.moveTo(S.run!, held, { slot: ds }) ? '' : "There's no room to fit it there. Clear a slot first.";
      S.sel = null;
      clearDrop();
      render();
      return;
    }
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-own],[data-bench],[data-slot]');
    if (!a) return;
    if (a.dataset.own && +a.dataset.own === S.sel) {
      S.sel = null;
      render();
      return;
    }
    act(a);
  });
  root.addEventListener('dragend', () => {
    S.drag = false;
    clearDrop();
    if (S.sel != null && S.screen === 'shop') {
      S.sel = null;
      render();
    }
  });
}
