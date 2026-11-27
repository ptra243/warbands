import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { DB_HOST, PAGE, test, buyShop, startRun, trackErrors, ui } from './helpers.ts';

// The copy of the game hosted outside Claude: runs and post-game boards go to the hosted database.
// The database is replaced by a stand-in here, so this checks the requests the page makes, not the real service.
const HOST = DB_HOST;

type Row = Record<string, unknown> & { run_key: string };

test('saves runs and boards and downloads them', async ({ page }) => {
  const errors = trackErrors(page);
  const ghosts: Row[] = [
    {
      run_key: 'seed-a',
      balance: 5,
      faction: 'H',
      leader: 'warden',
      relics: ['wardrum'],
      slots: 10,
      round: 11,
      units: [
        { id: 'knight', slot: 4, tier: 2, item: 'symbol' },
        { id: 'archer', slot: 8, tier: 3 },
      ],
    },
    {
      run_key: 'seed-b',
      balance: 4,
      faction: 'U',
      leader: 'gravecaller',
      relics: [],
      slots: 10,
      round: 14,
      units: [
        { id: 'lich', slot: 0, tier: 2 },
        { id: 'pitlord', slot: 9, tier: 2 },
      ],
    },
    {
      run_key: 'seed-bad',
      balance: 4,
      faction: 'U',
      leader: null,
      relics: [],
      slots: 10,
      round: 9,
      units: [{ id: 'no-such-unit', slot: 0 }],
    },
  ];
  const savedRuns: Row[] = [];
  const requests = new Set<string>();
  await page.route(HOST + '**', async (route) => {
    const rq = route.request(),
      path = rq.url().slice(HOST.length).split('?')[0];
    requests.add(`${rq.method()} ${path} key:${!!rq.headers()['apikey']}`);
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
    };
    if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const json = { ...cors, 'content-type': 'application/json' };
    if (rq.method() === 'POST') {
      const row = JSON.parse(rq.postData() || '{}') as Row;
      if (path === 'rest/v1/runs') savedRuns.push(row);
      if (path === 'rest/v1/ghosts') ghosts.push(row);
      return route.fulfill({ status: 201, headers: json, body: '' });
    }
    if (path === 'rest/v1/ghosts') return route.fulfill({ status: 200, headers: json, body: JSON.stringify(ghosts) });
    if (path === 'rest/v1/runs')
      return route.fulfill({
        status: 200,
        headers: json,
        body: JSON.stringify(savedRuns.map((r) => ({ run_key: r.run_key, log: r.log }))),
      });
    return route.fulfill({ status: 404, headers: json, body: '{}' });
  });

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
  });
  await page.click('[data-act="fight"]');
  await page.click('[data-act="skip"]');
  await page.click('[data-act="continue"]');
  await expect(page.locator('#save')).toHaveText('Run saved. Your final board joins the post-game pool.');
  expect(await ui(page, (S) => S.screen)).toBe('end');

  const run = savedRuns[0];
  expect(Object.keys(run).sort()).toEqual(
    ['balance', 'ended', 'faction', 'leader', 'log', 'outcome', 'player', 'post', 'rounds', 'run_key', 'wins'].sort(),
  );
  expect([run.outcome, run.faction]).toEqual(['won', 'U']);
  const mine = ghosts[ghosts.length - 1];
  expect(mine.run_key).toBe(run.run_key);
  expect(mine.faction).toBe('U');
  expect(String(mine.player).startsWith('p-')).toBe(true);

  await page.click('[data-act="keepgoing"]');
  await expect.poll(() => ui(page, (S) => S.screen)).toBe('shop');
  // the player's own board is never its own opponent, and the unknown unit is skipped
  expect(await ui(page, (S) => S.run.post!.pool.map((g) => g.key).sort())).toEqual(['seed-a', 'seed-b']);

  await ui(page, (S) => {
    S.run.lives = 1;
    S.run.things.forEach((t) => {
      if (t.kind === 'unit') t.gAtk = t.gHp = 0;
    });
    /* make the loss certain: a lucky shop could otherwise beat or draw with the saved board */
    S.run.enemy.mul = 50;
  });
  await page.click('[data-act="fight"]');
  await page.click('[data-act="skip"]');
  await page.click('[data-act="continue"]');
  await expect.poll(() => savedRuns.length).toBe(2);
  expect(savedRuns[1].run_key).toBe(run.run_key); // the same run saved again, now complete
  expect(savedRuns[1].post).toBe(0);

  const download = page.waitForEvent('download');
  await page.click('[data-act="dlruns"]');
  const dl = await download;
  expect(dl.suggestedFilename()).toMatch(/^warband-runs-\d{4}-\d{2}-\d{2}\.json$/);
  const file = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  expect(file.count).toBe(1); // one row per run, the later one wins
  expect(file.runs[0].post).toBe(0);
  await expect(page.locator('.dlmsg').first()).toHaveText('Downloaded 1 run.');
  expect([...requests].every((r) => r.endsWith('key:true') || r.startsWith('OPTIONS'))).toBe(true);
  expect(errors).toEqual([]);
});
