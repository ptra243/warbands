import { readFileSync } from 'node:fs';
import { afterEach, expect, it } from 'vitest';
import * as W from '../src/engine/index.ts';
import boards from '../tools/boards.ts';
// @ts-expect-error -- plain JS fixture, kept frozen on purpose (see harness.mjs)
import { fingerprint } from './golden/harness.mjs';

// Seeded bot runs, a post-game and every saved board against every other, compared with a recorded baseline.
// A failure means the rules changed. If that was intended, bump BALANCE in src/engine/constants.ts and run
// `npm run golden:update` to record the new baseline.
afterEach(() => W.setRandom(Math.random));

it('plays exactly as the recorded baseline', () => {
  const baseline = JSON.parse(readFileSync(new URL('./golden/baseline.json', import.meta.url), 'utf8'));
  expect(fingerprint(W, boards, W.setRandom)).toEqual(baseline);
});
