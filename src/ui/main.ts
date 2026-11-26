/* Starts the game, restoring a run kept by the artifact host. */
import * as W from '../engine/index.ts';
import { render } from './render.ts';
import { installInput } from './input.ts';
import { S } from './state.ts';

installInput();
function start(data: unknown): void {
  const saved = data as { run?: W.Run } | null;
  if (saved && saved.run && saved.run.things) {
    S.run = W.restore(saved.run);
    S.run!.camp = null;
    S.screen = S.run!.over ? 'end' : S.run!.offer ? 'encounter' : 'shop';
  }
  render();
}
const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) hot.snapshot(() => (S.run ? { run: S.run } : {}));
if (hot && hot.ready) hot.ready(start);
else start((hot && hot.data) || {});
window.__S = S;
