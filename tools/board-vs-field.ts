/* node tools/board-vs-field.ts [fights per side = 40]
   The last board in tools/boards.ts against all the others, from both sides. DROW=label tags the output line. */
import BS from './boards.ts';
import { boardFight } from './lib/boards.ts';

const N = +process.argv[2] || 40;
const me = BS[BS.length - 1];
let w = 0,
  g = 0;
const per: string[] = [];
for (const b of BS.slice(0, -1)) {
  let x = 0;
  for (let k = 0; k < N; k++) {
    if (boardFight(me, b) === 0) x++;
    if (boardFight(b, me) === 1) x++;
  }
  per.push(b.name + ' ' + Math.round((x / (2 * N)) * 100));
  w += x;
  g += 2 * N;
}
console.log((process.env.DROW || 'base').padEnd(18), 'overall', ((w / g) * 100).toFixed(0) + '%  |', per.join(', '));
