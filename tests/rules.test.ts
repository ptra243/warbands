import { describe, expect, it } from 'vitest';
import * as W from '../src/engine/index.ts';
import type { UnitThing } from '../src/engine/index.ts';

/** an Undead run at a given shop level holding exactly these units: [id, board slot, bench slot] */
function mk(level: number, units: [string, number | null, (number | null)?][]): W.Run {
  const run = W.newRun('U', 'gravecaller');
  run.level = level;
  run.things = [];
  let id = 900;
  for (const [u, slot, bench] of units)
    run.things.push({
      uid: id++,
      kind: 'unit',
      id: u,
      tier: 1,
      item: null,
      gAtk: 0,
      gHp: 0,
      slot,
      bench: bench ?? null,
    });
  return run;
}

/** "s3 c4 | bench g": first letter of each unit and its slot, then the bench */
const lay = (run: W.Run) =>
  run.things
    .filter((t) => t.slot != null)
    .sort((a, b) => a.slot! - b.slot!)
    .map((t) => t.id[0] + t.slot)
    .join(' ') +
  ' | bench ' +
  run.things
    .filter((t) => t.bench != null)
    .map((t) => t.id[0])
    .join('');

// level 7 = 10 slots. s=skeleton g=ghoul i=initiate c=colossus(2) l=lich(2)
describe('moving units on the board', () => {
  it('pushes neighbours aside for a two-slot unit from the bench', () => {
    const r = mk(7, [
      ['skeleton', 3, null],
      ['ghoul', 4, null],
      ['initiate', 5, null],
      ['colossus', null, 0],
    ]);
    expect(W.moveTo(r, r.things[3], { slot: 4 })).toBe(true);
    expect(lay(r)).toBe('s3 c4 g6 i7 | bench ');
  });

  it('reorders along the board in both directions', () => {
    let r = mk(7, [
      ['skeleton', 3, null],
      ['ghoul', 4, null],
      ['initiate', 5, null],
    ]);
    W.moveTo(r, r.things[0], { slot: 5 });
    expect(lay(r)).toBe('g3 i4 s5 | bench ');
    r = mk(7, [
      ['skeleton', 3, null],
      ['ghoul', 4, null],
      ['initiate', 5, null],
    ]);
    W.moveTo(r, r.things[2], { slot: 3 });
    expect(lay(r)).toBe('i3 s4 g5 | bench ');
  });

  it('swaps neighbours', () => {
    const r = mk(7, [
      ['skeleton', 3, null],
      ['ghoul', 4, null],
    ]);
    W.moveTo(r, r.things[0], { slot: 4 });
    expect(lay(r)).toBe('g3 s4 | bench ');
  });

  it('shifts left when a wide unit lands at the right edge', () => {
    const r = mk(7, [
      ['skeleton', 7, null],
      ['ghoul', 8, null],
      ['initiate', 9, null],
      ['colossus', null, 0],
    ]);
    W.moveTo(r, r.things[3], { slot: 8 });
    expect(lay(r)).toBe('s5 g6 i7 c8 | bench ');
  });

  it('swaps with the bench when the row is full', () => {
    let r = mk(1, [
      ['skeleton', 3, null],
      ['ghoul', 4, null],
      ['initiate', 5, null],
      ['revenant', 6, null],
      ['plague', null, 0],
    ]);
    expect(W.moveTo(r, r.things[4], { slot: 4 })).toBe(true);
    expect(lay(r)).toBe('s3 p4 i5 r6 | bench g');
    r = mk(1, [
      ['skeleton', 3, null],
      ['ghoul', 4, null],
      ['initiate', 5, null],
      ['revenant', 6, null],
      ['colossus', null, 0],
    ]);
    expect(W.moveTo(r, r.things[4], { slot: 4 })).toBe(false);
    expect(lay(r)).toBe('s3 g4 i5 r6 | bench c');
    expect(W.tryMove(r, r.things[4], { slot: 4 })).toBeNull();
  });

  it('tryMove reports a move without making it', () => {
    const r = mk(7, [
      ['lich', 2, null],
      ['colossus', 4, null],
      ['skeleton', 6, null],
    ]);
    expect(W.tryMove(r, r.things[1], { slot: 2 })).toEqual({
      slot: 2,
      bench: null,
      moves: [{ uid: 900, from: 2, to: 4 }],
    });
    expect(lay(r)).toBe('l2 c4 s6 | bench ');
  });
});

describe('waiting Bone Minions', () => {
  it('bank when the board is full and arrive together when a slot opens', () => {
    W.setRandom(() => 0.5);
    const r = mk(1, [
      ['gravedigger', 3, null],
      ['skeleton', 4, null],
      ['ghoul', 5, null],
      ['initiate', 6, null],
    ]);
    const knight = (uid: number, slot: number): UnitThing => ({
      uid,
      kind: 'unit',
      id: 'knight',
      tier: 2,
      slot,
      item: null,
      gAtk: 0,
      gHp: 0,
    });
    r.enemy = { faction: 'H', units: [knight(1, 3), knight(2, 5)], open: 4 };
    const B = W.startBattle(r);
    expect(B.bank[0] && { n: B.bank[0].n, hp: B.bank[0].hp }).toEqual({ n: 1, hp: 24 });
    let arrived = null;
    for (let n = 0; !B.over && n++ < 4000;) {
      W.step(B, 0.05);
      const m = B.units.find((u) => u.side === 0 && u.d.id === 'minion');
      if (m && !arrived)
        arrived = {
          time: B.time.toFixed(1),
          slot: m.slot,
          hp: Math.round(m.maxhp),
          shield: Math.round(m.shield),
          waited: m.waited,
          bank: B.bank[0],
        };
    }
    expect(arrived).toEqual({ time: '9.5', slot: 5, hp: 72, shield: 54, waited: 3, bank: null });
    const waited = W.battleReport(B)
      .units.filter((u) => u.waited)
      .map((u) => u.id + ':' + u.waited);
    expect(waited).toEqual(['minion:3']);
    W.setRandom(Math.random);
  });
});

describe('post-game', () => {
  it('still accepts an old-format log with no rules version or leader', () => {
    const g = W.ghostFrom(
      {
        v: 1,
        game: 'warband',
        faction: 'E',
        outcome: 'won',
        log: [
          {
            round: 14,
            slots: 10,
            result: 'win',
            board: [
              { id: 'matriarch', tier: 2, slot: 0, gAtk: 12, gHp: 36 },
              { id: 'treant', tier: 2, slot: 2, gAtk: 60, gHp: 300 },
              { id: 'sunchamp', slot: 4 },
              { id: 'sunspire', tier: 2, slot: 7 },
              { id: 'drowblade', tier: 3, slot: 9 },
            ],
          },
        ],
      },
      'old',
    );
    expect(g).not.toBeNull();
    expect(g!.units).toHaveLength(5);
  });

  it('starts with at least 3 lives', () => {
    const run = W.newRun('H', 'marshal');
    run.over = 'won';
    run.lives = 1;
    run.log.push({ round: 10, income: 5 });
    W.continueRun(run, []);
    expect(run.lives).toBe(3);
  });

  const human = W.YARDSTICK[0];
  const ghost = (key: string, tierUp = 0, score?: number): W.Ghost => ({
    key,
    faction: human.faction,
    leader: human.leader,
    relics: human.relics,
    open: human.open,
    round: 12,
    power: 0,
    score,
    units: human.units.map((o) => Object.assign({}, o, { tier: Math.min(3, (o.tier || 1) + tierUp) })),
  });

  it('scores the same board the same every time, and leaves the run’s random draws alone', () => {
    let draws = 0;
    const mine = () => (draws++, 0.5);
    W.setRandom(mine);
    const a = W.yardstick(ghost('a')),
      b = W.yardstick(ghost('b'));
    expect(W.setRandom(Math.random)).toBe(mine);
    expect(draws).toBe(0);
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0.5);
    expect(a).toBeLessThan(2);
  });

  /* The golden baseline doesn't cover yardstick scores, so pin them here. If this fails, the reference boards,
   the score search or the fights changed: that is a rules change, so bump BALANCE (browsers cache scores per
   BALANCE) and update these numbers. */
  it('scores the reference boards as before', () => {
    const scores = W.YARDSTICK.map((ref, i) =>
      W.yardstick({ key: 'ref' + i, ...ref, round: 12, power: 0, units: ref.units.map((o) => ({ ...o })) }),
    );
    expect(scores).toEqual([0.74, 0.74, 1.51]);
  });

  it('scores a stronger board higher', () => {
    expect(W.yardstick(ghost('up', 1))).toBeGreaterThan(W.yardstick(ghost('base')));
  });

  it('picks boards spread from weakest to strongest', () => {
    const pool = Array.from({ length: 32 }, (_, i) => ghost('g' + i, 0, 31 - i));
    const got = W.spreadGhosts(pool, 16).map((g) => g.score!);
    expect(got).toHaveLength(16);
    got.forEach((s, i) => expect(Math.floor(s / 2)).toBe(i));
  });

  it('faces the lowest-scoring board first', () => {
    const run = W.newRun('H', 'marshal');
    run.over = 'won';
    run.log.push({ round: 10, income: 5 });
    W.continueRun(run, [ghost('strong', 0, 2), ghost('weak', 0, 0.5), ghost('mid', 0, 1)]);
    expect(run.enemy.ghost).toBe('weak');
  });
});

describe('Duelist', () => {
  it('hits the same enemy harder each time, up to +90%, and starts over on a new target', () => {
    const vs = W.U.duelist.vs!;
    const B = {} as W.Battle,
      u = {} as W.BattleUnit,
      a = { bid: 1 } as W.BattleUnit,
      b = { bid: 2 } as W.BattleUnit;
    const hits = [a, a, a, b, b, a, a, a, a, a, a, a, a].map((t) => +vs(B, u, t, 10).toFixed(2));
    expect(hits).toEqual([10, 11.5, 13, 10, 11.5, 10, 11.5, 13, 14.5, 16, 17.5, 19, 19]);
  });
});
