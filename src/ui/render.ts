/* Draws the current screen. */
import * as W from '../engine/index.ts';
import {
  encounterHTML,
  endHTML,
  fieldHTML,
  headHTML,
  leaderHTML,
  vsHTML,
  pickHTML,
  sideHTML,
  summaryHTML,
} from './html.ts';
import { marketHTML } from './market.ts';
import { saveLog } from './storage.ts';
import { afterRender } from './tooltip.ts';
import { drawPreview, pixiAvailable, usePixi } from './battle.ts';
import { S, root } from './state.ts';

export function render() {
  render0();
  afterRender();
}
/** whether the last render drew the summary, so it takes focus only when it first appears */
let onSummary = false;
export function render0() {
  const wasSummary = onSummary;
  onSummary = S.screen === 'summary';
  if (S.screen === 'pick') {
    root.innerHTML = pickHTML();
    return;
  }
  if (S.screen === 'leader') {
    root.innerHTML = leaderHTML();
    return;
  }
  if (S.screen === 'encounter') {
    S.aims = null;
    root.innerHTML = encounterHTML();
    return;
  }
  if (S.screen === 'end') {
    root.innerHTML = endHTML();
    (document.getElementById('rawtext') as HTMLTextAreaElement).value = JSON.stringify(W.exportLog(S.run!));
    saveLog();
    return;
  }
  if (S.screen === 'summary') {
    root.innerHTML = summaryHTML();
    const g = document.getElementById('sumgo');
    if (g && !wasSummary) g.focus();
    return;
  }
  if (S.screen === 'battle') {
    const B = S.B!,
      pixi = usePixi();
    const vs = vsHTML(S.run!.leader, S.opp!, B.round);
    /* speed is one segmented control, so the selected speed reads as a filled button among outlined ones */
    const controls =
      `<span class="speed" role="group" aria-label="Battle speed"><span class="lbl">Speed</span>${[1, 2, 4]
        .map(
          (x) =>
            `<button data-act="speed:${x}" class="${S.speed === x ? 'active' : ''}" aria-pressed="${S.speed === x}">${x}×</button>`,
        )
        .join('')}</span>` +
      '<button data-act="skip">Skip to result</button>' +
      (pixi
        ? '<button data-act="view:classic" title="Use the plain HTML battle screen">Classic view</button>'
        : pixiAvailable()
          ? '<button data-act="view:pixi" title="Use the animated battle screen">Animated view</button>'
          : '');
    /* the Pixi field runs edge to edge below the header, with its dock taking the height left over */
    if (pixi) {
      root.innerHTML = `<div class="wrap battle pixi">${headHTML()}
<div class="pbar">${vs}<span class="grow"></span>${controls}</div></div>
<div id="pixi-stage" class="pixi-stage"></div><div id="pixi-dock" class="pdock"></div>`;
      return;
    }
    root.innerHTML = `<div class="wrap battle">${headHTML()}
${vs}
${fieldHTML()}
<section class="panel"><div class="bar"><h2>Battle</h2><span class="odds" id="clock">0s</span><span class="grow"></span>${controls}</div></section>
<div class="sides">${sideHTML(B, 0)}${sideHTML(B, 1)}</div></div>`;
    return;
  }
  root.innerHTML = marketHTML();
  drawPreview();
}
