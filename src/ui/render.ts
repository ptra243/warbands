/* Draws the current screen. */
import * as W from '../engine/index.ts';
import {
  benchHTML,
  boardHTML,
  encounterHTML,
  endHTML,
  fieldHTML,
  headHTML,
  helpHTML,
  leaderHTML,
  leaderPanel,
  oppName,
  pickHTML,
  shopHTML,
  sideHTML,
  summaryHTML,
  synHTML,
} from './html.ts';
import { saveLog } from './storage.ts';
import { afterRender } from './tooltip.ts';
import { drawPreview, pixiAvailable, usePixi } from './battle.ts';
import { S, root } from './state.ts';

export function render() {
  render0();
  afterRender();
}
export function render0() {
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
    if (g) g.focus();
    return;
  }
  if (S.screen === 'battle') {
    const B = S.B!,
      o = S.opp!,
      foe = oppName(o),
      pixi = usePixi();
    const vs = `<div class="vs"><h2>${o.camp ? 'Camp' : 'Round ' + B.round}</h2><p><b>${S.run!.leader ? W.LEADERS[S.run!.leader].name : 'Your warband'}</b> against <b>${foe}</b>${!o.camp && (o.title || o.post) ? ' (' + W.FACTIONS[o.faction].name + ')' : ''}</p></div>`;
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
  root.innerHTML = `<div class="wrap">${headHTML()}<p class="msg" role="status">${S.msg || '&nbsp;'}</p><div class="cols"><main>${boardHTML()}
${benchHTML() + shopHTML()}</main>
<aside>${leaderPanel()}<section class="panel"><h2>${W.FACTIONS[S.run!.faction].name} bonuses</h2><ul class="syn">${synHTML()}</ul></section>${helpHTML()}</aside></div></div>`;
  drawPreview();
}
