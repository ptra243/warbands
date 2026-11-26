// Records the golden baseline: node tests/golden/make-baseline.mjs [engine module] [boards module] [out.json]
// Defaults to the current engine and tests/golden/baseline.json. Any engine with the same exports works,
// so an older engine can be fingerprinted for comparison.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { fingerprint } from './harness.mjs';
const load = async (p) => {
  const m = await import(pathToFileURL(resolve(p)).href);
  return m.newRun || Array.isArray(m) ? m : m.default;
};
const [eng = 'src/engine/index.ts', brd = 'tools/boards.ts', outFile = 'tests/golden/baseline.json'] =
  process.argv.slice(2);
const W = await load(eng);
const boards = await load(brd);
const real = Math.random;
// engines without a random seam draw from Math.random directly
const fp = fingerprint(
  W,
  boards,
  W.setRandom ||
    ((r) => {
      Math.random = r;
    }),
);
Math.random = real;
writeFileSync(outFile, JSON.stringify(fp, null, 1));
console.log(
  'runs',
  fp.runs.length,
  'won',
  fp.runs.filter((r) => r.over === 'won').length,
  'post',
  fp.post.length,
  'boards',
  fp.boards.length,
);
