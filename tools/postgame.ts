/* node tools/postgame.ts
   The bot wins runs to build a pool of saved boards, then plays the post-game against them and against generated foes. */
import * as W from '../src/engine/index.ts';
import { bot, fight as play0, leadersOf } from './lib/bot.ts';

function fight(B: W.Battle): W.Battle {
  play0(B);
  if (!B.over) throw new Error('stall');
  return B;
}

interface BossStat {
  boss: number;
  bossHero: number;
  bossWin: number;
}

function play(f: W.PlayerFaction, i: number, stat?: BossStat): W.Run {
  const run = W.newRun(f, leadersOf(f)[i % 3]);
  let enc = 0;
  while (!run.over && run.round < 60) {
    if (run.offer) {
      const cs = run.offer.cards;
      let k = cs.findIndex((c) => c.type === 'relic');
      if (k < 0) k = enc % 3 === 0 ? 0 : cs.findIndex((c) => c.type === 'event');
      if (k < 0) k = 0;
      enc++;
      const r0 = W.chooseOffer(run, k);
      if (r0?.fight) W.finishCamp(run, fight(W.startCamp(run)));
    }
    const boss = run.enemy.boss;
    bot(run);
    const B = fight(W.startBattle(run));
    if (boss && stat) {
      stat.boss++;
      stat.bossHero += 1 - Math.max(0, B.hero[0].hp) / B.hero[0].max;
      stat.bossWin += Number(B.winner === 0);
    }
    W.finishBattle(run, B);
  }
  return run;
}

function post(run: W.Run, ghosts: W.Ghost[]): W.Run {
  W.continueRun(run, ghosts);
  while (!run.over && run.round < 80) {
    bot(run);
    W.finishBattle(run, fight(W.startBattle(run)));
  }
  return run;
}

const factions: W.PlayerFaction[] = ['H', 'E', 'U'];
const ghosts: W.Ghost[] = [],
  stat: BossStat = { boss: 0, bossHero: 0, bossWin: 0 };
let tries = 0;
while (ghosts.length < 9 && tries < 600) {
  const run = play(factions[tries % 3], tries++, stat);
  if (run.over === 'won') {
    const g = W.ghostFrom(JSON.parse(JSON.stringify(W.exportLog(run))), 'g' + tries);
    if (!g) throw new Error('ghost rejected');
    ghosts.push(g);
  }
}
console.log(
  'ghosts',
  ghosts.length,
  'after',
  tries,
  'runs; power',
  ghosts.map((g) => g.faction + g.power + (g.leader ? '/' + g.leader.slice(0, 4) : '')).join(' '),
);
console.log(
  'boss fights',
  stat.boss,
  'won',
  ((stat.bossWin / stat.boss) * 100).toFixed(0) + '%',
  'avg hero health lost',
  ((stat.bossHero / stat.boss) * 100).toFixed(0) + '%',
);
for (const pool of [ghosts, []]) {
  const sc: string[] = [];
  let t = 0;
  while (sc.length < 30 && t < 900) {
    const run = play(factions[t % 3], t++);
    if (run.over !== 'won') continue;
    const lives = run.lives;
    post(run, pool);
    if (run.over !== 'won' || !run.post!.done) throw new Error('post end ' + run.over);
    const x = JSON.parse(JSON.stringify(W.exportLog(run)));
    if (!W.ghostFrom(x, 'z')) throw new Error('post ghost');
    sc.push(run.post!.n + '(' + lives + ')');
  }
  console.log(pool.length ? 'vs ghosts' : 'vs generated', 'beaten(lives at start):', sc.join(' '));
}
