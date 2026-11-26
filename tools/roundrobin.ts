/* node tools/roundrobin.ts [fights per pairing = 30]
   The real winning boards in tools/boards.ts play each other. */
import BS from './boards.ts';
import { W, boardFight } from './lib/boards.ts';

const N = +process.argv[2] || 30;
const w = BS.map(() => 0),
  g = BS.map(() => 0);
const byF: Record<string, [number, number]> = {};
for (let i = 0; i < BS.length; i++)
  for (let j = 0; j < BS.length; j++) {
    if (i === j) continue;
    for (let k = 0; k < N; k++) {
      const r = boardFight(BS[i], BS[j]);
      g[i]++;
      g[j]++;
      if (r === 0) w[i]++;
      else if (r === 1) w[j]++;
      const key = BS[i].f + 'v' + BS[j].f;
      byF[key] = byF[key] || [0, 0];
      byF[key][1]++;
      if (r === 0) byF[key][0]++;
    }
  }
const power = (b: (typeof BS)[number]) =>
  Math.round(
    b.units.reduce((s, o) => {
      const t = W.stats(o);
      return s + Math.sqrt(t.hp * Math.max(1, t.atk));
    }, 0),
  );
console.log(
  BS.map((b, i) => [b.name, ((w[i] / g[i]) * 100).toFixed(0) + '%', 'power ' + power(b)])
    .sort((a, b) => parseInt(a[1]) - parseInt(b[1]))
    .map((x) => x.join(' '))
    .join('\n'),
);
console.log(
  'U beats H',
  ((byF.UvH[0] / byF.UvH[1]) * 100).toFixed(0) + '%  H beats U',
  ((byF.HvU[0] / byF.HvU[1]) * 100).toFixed(0) + '%',
);
