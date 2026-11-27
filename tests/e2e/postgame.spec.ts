import { expect } from '@playwright/test';
import { PAGE, test, buyShop, startRun, trackErrors, ui } from './helpers.ts';

// Inside Claude: win a run, keep going against saved boards from the artifact's storage (stubbed here), finish.
const OLD = {
  v: 1,
  game: 'warband',
  faction: 'E',
  outcome: 'won',
  wins: 10,
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
};
const NEW = {
  ...OLD,
  faction: 'U',
  leader: 'bloodpriest',
  relics: ['wardrum'],
  bal: 2,
  log: [
    {
      round: 12,
      slots: 10,
      result: 'win',
      board: [
        { id: 'soulreaper', tier: 2, slot: 3 },
        { id: 'collector', slot: 4 },
        { id: 'lich', slot: 5 },
      ],
    },
  ],
};
const BAD = {
  game: 'warband',
  outcome: 'won',
  faction: 'U',
  log: [{ result: 'win', slots: 10, board: [{ id: 'nosuchunit', slot: 1 }] }],
};

test('keeps going after a win against saved boards', async ({ page }) => {
  const errors = trackErrors(page);
  await page.addInitScript(
    ([old, nu, bad]) => {
      const store: Record<string, Record<string, unknown>> = {
        'run-old': { outcome: 'won', json: old },
        'run-new': { outcome: 'won', json: nu },
        'run-bad': { outcome: 'won', json: bad },
      };
      window.__store = store;
      const db = {
        collection: () => ({
          doc: (id: string) => ({
            set: async (d: Record<string, unknown>) => {
              store[id] = d;
            },
          }),
          where: (f: string, _o: string, v: unknown) => ({
            get: async () => ({
              docs: Object.entries(store)
                .filter((e) => e[1][f] === v)
                .map((e) => ({ id: e[0], data: () => e[1] })),
            }),
          }),
        }),
      };
      (window as unknown as { claude: unknown }).claude = { use: async (n: string) => (n === 'db' ? db : null) };
    },
    [JSON.stringify(OLD), JSON.stringify(NEW), JSON.stringify(BAD)],
  );
  await page.goto(PAGE);
  await startRun(page, 'U');
  await buyShop(page);
  await ui(page, (S) => {
    S.run.wins = 9;
    S.run.things.forEach((t) => {
      if (t.kind === 'unit') {
        t.gAtk = 900;
        t.gHp = 9000;
      }
    });
    S.run.level = 9;
    S.run.gold = 60;
  });
  await page.click('[data-act="fight"]');
  await page.click('[data-act="skip"]');
  await page.click('[data-act="continue"]');
  expect(await ui(page, (S) => [S.screen, S.run.over])).toEqual(['end', 'won']);
  await expect(page.locator('#save')).toHaveText(/saved/);
  const docId = await ui(page, (S) => S.run.docId!);
  expect(await page.evaluate(() => Object.keys(window.__store!))).toContain(docId);

  await page.click('[data-act="keepgoing"]');
  await expect.poll(() => ui(page, (S) => S.screen)).toBe('shop');
  const pool = await ui(page, (S) => S.run.post!.pool.map((g) => g.key).sort());
  expect(pool).toEqual(['run-new', 'run-old']); // the board with an unknown unit is skipped
  expect(await ui(page, (S) => S.run.enemy.ghost)).toBeTruthy();

  for (let k = 0; k < 4 && (await ui(page, (S) => S.screen)) === 'shop'; k++) {
    if (k === 2)
      await ui(page, (S) => {
        S.run.things.forEach((t) => {
          if (t.kind === 'unit') t.gAtk = t.gHp = 0;
        });
        S.run.lives = 1;
      });
    await page.click('[data-act="fight"]');
    await page.click('[data-act="skip"]');
    await expect(page.locator('.result h2')).toHaveText(/Victory|Defeat|Draw/);
    await page.click('[data-act="continue"]');
  }
  expect(await ui(page, (S) => [S.screen, S.run.over, S.run.post!.done])).toEqual(['end', 'won', true]);
  await expect(page.locator('[data-act="keepgoing"]')).toHaveCount(0);
  const saved = await page.evaluate((id) => window.__store![id], docId);
  expect(saved.outcome).toBe('won');
  expect(saved.post).toBeGreaterThanOrEqual(0);
  const last = await ui(page, (S) => S.run.log[S.run.log.length - 1]);
  expect(last.post).toBeGreaterThan(0);
  expect(last.enemy?.mul).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});
