/* The playback driver in src/ui/battle.ts, with stand-in battle screens whose mounts the test resolves by hand.
   This covers the orderings a browser without a GPU can't reach: a Pixi mount that succeeds after it was
   overtaken by a skip or a switch of screens. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as W from '../src/engine/index.ts';
import type { BattleScreen } from '../src/ui/battle.ts';

type Mount = { resolve: (ok: boolean) => void };
/** every frame either screen drew, in the order drawn */
let drawn: W.PlaybackFrame[] = [];
function fakeScreen() {
  const mounts: Mount[] = [];
  const frames: W.PlaybackFrame[] = [];
  const screen = {
    mounts,
    frames,
    throws: false,
    mount: vi.fn((_B: W.Battle, _foe: string) => new Promise<boolean>((resolve) => mounts.push({ resolve }))),
    frame: vi.fn((f: W.PlaybackFrame, _real: number) => {
      if (screen.throws) throw new Error('drawing failed');
      frames.push(f);
      drawn.push(f);
      return false;
    }),
    unmount: vi.fn(),
  };
  return screen;
}

const h = vi.hoisted(() => ({
  S: {} as Record<string, unknown>,
  pixi: null as unknown as ReturnType<typeof fakeScreen>,
  classic: null as unknown as ReturnType<typeof fakeScreen>,
}));
vi.mock('../src/ui/state.ts', () => ({ S: h.S, root: null }));
vi.mock('../src/ui/render.ts', () => ({ render: vi.fn() }));
vi.mock('../src/ui/storage.ts', () => ({ saveLog: vi.fn() }));
vi.mock('../src/ui/html.ts', () => ({ oppName: (o: W.Opponent) => o.title, inspTarget: () => null }));
vi.mock('../src/ui/pixi/battle-view.ts', () => ({
  pixiScreen: {
    mount: (B: W.Battle, foe: string) => h.pixi.mount(B, foe),
    frame: (f: W.PlaybackFrame, real: number) => h.pixi.frame(f, real),
    unmount: () => h.pixi.unmount(),
  } satisfies BattleScreen,
}));
vi.mock('../src/ui/classic-battle.ts', () => ({
  classicScreen: {
    mount: (B: W.Battle, foe: string) => h.classic.mount(B, foe),
    frame: (f: W.PlaybackFrame, real: number) => h.classic.frame(f, real),
    unmount: () => h.classic.unmount(),
  } satisfies BattleScreen,
}));

const { setBattleView, stopBattleLoop } = await import('../src/ui/battle.ts');

/* animation frames, run by hand: each tick runs every frame callback queued so far, 1/60s apart */
let now = 0,
  nextId = 0;
const queued = new Map<number, FrameRequestCallback>();
function tick(n = 1): void {
  for (let i = 0; i < n; i++) {
    now += 1000 / 60;
    const cbs = [...queued.values()];
    queued.clear();
    for (const cb of cbs) cb(now);
  }
}
const settle = () => new Promise((r) => setTimeout(r, 0));

function battle(seed: number): W.Battle {
  const a = W.YARDSTICK[0],
    b = W.YARDSTICK[1];
  W.setRandom(W.seeded(seed));
  return W.createBattle(
    a.units.map((x) => ({ ...x })),
    b.units.map((x) => ({ ...x })),
    13,
    a.open,
    b.open,
    { leader: a.leader, relics: a.relics, foeLeader: b.leader, foeRelics: b.relics },
  );
}
/** put battle B on screen, as startBattle does, and draw it on the given screen */
function show(B: W.Battle, view: 'pixi' | 'classic'): void {
  const opp: W.Opponent = { faction: 'H', title: 'Test foe', leader: null, camp: false, mul: 1, post: false };
  Object.assign(h.S, { B, screen: 'battle', result: null, speed: 1, opp });
  setBattleView(view);
}

const old = W.setRandom(Math.random);
beforeEach(() => {
  h.pixi = fakeScreen();
  h.classic = fakeScreen();
  drawn = [];
  queued.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => (queued.set(++nextId, cb), nextId));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => queued.delete(id));
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
});
afterEach(() => {
  stopBattleLoop();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  W.setRandom(old);
});

describe('battle playback driver', () => {
  it('a Pixi mount that finishes after the fight was skipped starts nothing', async () => {
    const B = battle(1);
    show(B, 'pixi');
    /* skip, as input.ts does, while Pixi is still starting */
    stopBattleLoop();
    W.runToEnd(B);
    Object.assign(h.S, { result: {}, screen: 'summary' });
    h.pixi.mounts[0].resolve(true);
    await settle();
    tick(5);
    expect(queued.size).toBe(0);
    expect(h.pixi.frame).not.toHaveBeenCalled();
  });

  it('a Pixi mount overtaken by a switch to classic is ignored when it finishes', async () => {
    const B = battle(2);
    show(B, 'pixi');
    setBattleView('classic');
    h.classic.mounts[0].resolve(true);
    await settle();
    h.pixi.mounts[0].resolve(true); // the older mount finishes last
    await settle();
    tick(10);
    expect(h.pixi.frame).not.toHaveBeenCalled();
    expect(h.classic.frame).toHaveBeenCalledTimes(10);
    expect(queued.size).toBe(1); // one loop, not two
  });

  it('switching screens mid-fight carries the battle on, handing out each event exactly once', async () => {
    const B = battle(3);
    show(B, 'classic');
    h.classic.mounts[0].resolve(true);
    await settle();
    tick(90);
    const t = B.time;
    expect(t).toBeGreaterThan(1);
    for (const [view, scr] of [
      ['pixi', h.pixi],
      ['classic', h.classic],
      ['pixi', h.pixi],
    ] as const) {
      setBattleView(view);
      tick(5); // nothing passes while the screen mounts
      scr.mounts[scr.mounts.length - 1].resolve(true);
      await settle();
      tick(60);
    }
    expect(B.time).toBeGreaterThan(t);
    const seen = drawn.flatMap((f) => f.events);
    expect(h.pixi.frames.length).toBeGreaterThan(0);
    /* the same battle watched without switching, to the same tick */
    const ref = battle(3),
      play = W.createPlayback(ref);
    const want: W.BattleEvent[] = [...play.advance(0).events];
    while (ref.time < B.time - 1e-9) want.push(...play.advance(W.TICK).events);
    expect(ref.time).toBe(B.time);
    /* unit ids count up across every battle on the page, so compare the events without them */
    const noIds = (e: W.BattleEvent) => {
      const { b: _b, to: _to, ...rest } = e as W.BattleEvent & { to?: unknown };
      return rest;
    };
    expect(seen.map(noIds)).toEqual(want.map(noIds));
    expect(seen.length).toBeGreaterThan(10);
  });

  it('reports a drawing error once per battle, not once per frame or once per page', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const seed of [4, 5]) {
      show(battle(seed), 'classic');
      h.classic.throws = true;
      h.classic.mounts[h.classic.mounts.length - 1].resolve(true);
      await settle();
      tick(20);
    }
    expect(err).toHaveBeenCalledTimes(2);
  });
});
