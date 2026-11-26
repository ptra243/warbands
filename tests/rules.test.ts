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
});
