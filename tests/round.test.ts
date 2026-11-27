import { beforeEach, describe, expect, it } from 'vitest';
import * as W from '../src/engine/index.ts';

/** an Undead run with one skeleton on the board */
function mk(): W.Run {
  const run = W.newRun('U', 'gravecaller');
  run.things = [{ uid: 900, kind: 'unit', id: 'skeleton', tier: 1, item: null, gAtk: 0, gHp: 0, slot: 0, bench: null }];
  return run;
}
/** fight the round's battle with a fixed result */
function fightAs(run: W.Run, winner: 0 | 1): ReturnType<typeof W.finishBattle> {
  const B = W.startBattle(run);
  B.winner = winner;
  B.over = true;
  return W.finishBattle(run, B);
}

beforeEach(() => {
  W.setRandom(W.seeded(7));
});

describe('the round lifecycle', () => {
  it('starts in the shop', () => {
    expect(W.phase(mk())).toBe('shop');
  });

  it('moves to the next round with an offer after a battle', () => {
    const run = mk(),
      gold = run.gold;
    const r = fightAs(run, 0);
    expect(run.round).toBe(2);
    expect(run.gold).toBe(gold + r.income);
    expect(W.phase(run)).toBe('encounter');
  });

  it('goes to the shop after an event, and to the camp after picking a camp', () => {
    const a = mk();
    fightAs(a, 0);
    const ev = a.offer!.cards.findIndex((c) => c.type === 'event');
    W.chooseOffer(a, ev);
    expect(W.phase(a)).toBe('shop');

    const b = mk();
    fightAs(b, 0);
    const camp = b.offer!.cards.findIndex((c) => c.type === 'camp');
    expect(W.chooseOffer(b, camp)).toEqual({ fight: true });
    expect(W.phase(b)).toBe('camp');
    expect(W.opponent(b)).toMatchObject({ faction: 'N', camp: true, title: b.camp!.name, leader: null });
    const B = W.startCamp(b);
    B.winner = 1;
    W.finishCamp(b, B);
    expect(W.phase(b)).toBe('shop');
  });

  it('passes a camp by when nobody is on the board', () => {
    const run = mk();
    fightAs(run, 0);
    run.things[0].slot = null;
    run.things[0].bench = 0;
    const camp = run.offer!.cards.findIndex((c) => c.type === 'camp');
    expect(W.chooseOffer(run, camp)!.msg).toMatch(/passed the camp by/);
    expect(run.camp).toBeNull();
    expect(W.phase(run)).toBe('shop');
  });

  it('is over once the last life is lost', () => {
    const run = mk();
    run.lives = 1;
    fightAs(run, 1);
    expect(W.phase(run)).toBe('over');
    expect(run.round).toBe(1);
  });

  it('continues a won run into the post-game the same way a round ends', () => {
    const run = mk();
    run.wins = W.MAXWINS - 1;
    const r = fightAs(run, 0);
    expect(W.phase(run)).toBe('over');
    const { gold, round } = run;
    expect(W.continueRun(run, [])).toBe(true);
    expect(run.round).toBe(round + 1);
    expect(run.gold).toBe(gold + r.income);
    expect(run.offer).toBeNull();
    expect(W.phase(run)).toBe('shop');
    expect(W.opponent(run)).toMatchObject({ camp: false, post: true, mul: 1 });
    expect(W.continueRun(run, [])).toBe(false);
  });
});
