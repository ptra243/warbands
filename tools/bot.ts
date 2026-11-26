/* node tools/bot.ts [runs per faction = 200] [dumb]
   The bot plays N runs per faction; prints runs won, win rate by round and fight length. */
import * as W from '../src/engine/index.ts';
import { bot, fight, leadersOf } from './lib/bot.ts';

const N = +process.argv[2] || 200;
const smart = process.argv[3] !== 'dumb';
const avg = (xs: number[]) => xs.reduce((a, b) => a + b) / xs.length;

for (const f of ['H', 'E', 'U'] as const) {
  const wr: Record<number, [number, number]> = {},
    dur: number[] = [],
    dr: Record<number, number[]> = {},
    camp = [
      [0, 0],
      [0, 0],
    ],
    lead: Record<string, [number, number]> = {};
  let enc = 0,
    won = 0,
    totw = 0,
    rounds = 0,
    draws = 0;
  for (let i = 0; i < N; i++) {
    const run = W.newRun(f, leadersOf(f)[i % 3]);
    while (!run.over && run.round < 40) {
      if (run.offer) {
        const cs = run.offer.cards;
        let k = cs.findIndex((c) => c.type === 'relic');
        if (k < 0)
          k = enc % 3 === 0 ? 0 : enc % 3 === 1 && cs[2].type === 'camp' ? 2 : cs.findIndex((c) => c.type === 'event');
        if (k < 0) k = 0;
        enc++;
        const hard = cs[k].hard;
        const r0 = W.chooseOffer(run, k);
        if (r0?.fight) {
          const cr = W.finishCamp(run, fight(W.startCamp(run)));
          camp[hard ? 1 : 0][cr.win ? 0 : 1]++;
        }
      }
      bot(run, smart);
      const B = fight(W.startBattle(run));
      if (!B.over) throw new Error('stall');
      dur.push(B.time);
      const r = run.round;
      (dr[r] = dr[r] || []).push(B.time);
      const res = W.finishBattle(run, B);
      (wr[r] = wr[r] || [0, 0])[0] += Number(res.res === 'win');
      wr[r][1]++;
      if (res.res === 'draw') draws++;
      for (const t of run.things) if (t.slot != null && t.bench != null) throw new Error('pos');
    }
    if (run.over === 'won') won++;
    (lead[run.leader!] = lead[run.leader!] || [0, 0])[run.over === 'won' ? 0 : 1]++;
    totw += run.wins;
    rounds += run.round;
  }
  console.log(
    f,
    'runs won',
    ((won / N) * 100).toFixed(0) + '%',
    'avg wins',
    (totw / N).toFixed(1),
    'avg rounds',
    (rounds / N).toFixed(1),
    'draws',
    draws,
    'avg dur',
    avg(dur).toFixed(1),
    'max',
    Math.max(...dur).toFixed(0),
  );
  console.log(
    '  avg seconds by round',
    Object.keys(dr)
      .slice(0, 16)
      .map((k) => k + ':' + avg(dr[+k]).toFixed(0))
      .join(' '),
  );
  console.log(
    '  camps won/lost: easy',
    camp[0].join('/'),
    'hard',
    camp[1].join('/'),
    ' leaders won/lost',
    JSON.stringify(lead),
  );
  console.log(
    '  winrate by round',
    Object.keys(wr)
      .slice(0, 16)
      .map((k) => k + ':' + ((wr[+k][0] / wr[+k][1]) * 100).toFixed(0))
      .join(' '),
  );
}
