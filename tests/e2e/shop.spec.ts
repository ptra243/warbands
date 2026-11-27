import { expect, test } from '@playwright/test';
import { PAGE, startRun, trackErrors, ui } from './helpers.ts';

// The shop screen: what it tells you about the next opponent, the shop cards' details, and selling from the
// status line.

test('a post-game round says how much stronger the opponent is', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(PAGE);
  await startRun(page, 'H');
  await ui(page, (S) => {
    S.run.post = { n: 2, faced: [], pool: [] };
    S.run.enemy.ghost = 'someone';
    S.run.enemy.mul = 1.3;
  });
  await page.click('[data-act="reroll"]'); // forces a render
  await expect(page.locator('.rnd .rtag')).toHaveText('Past warband · +30% health and attack');
  await expect(page.locator('.rnd .wins')).toContainText('2 past warbands beaten');
  expect(errors).toEqual([]);
});

test('pointing at a shop card shows its details', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(PAGE);
  await startRun(page, 'H');
  await ui(page, (S) => {
    S.run.shop = [{ kind: 'unit', id: 'stormmage' }, null, null, null, null];
  });
  await page.click('[data-act="xp"]'); // forces a render
  await page.hover('button[data-shop="0"]');
  const tip = page.locator('#tip');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('Storm Mage');
  await expect(tip).toContainText(/every [\d.]+s/);
  await expect(tip).toContainText('Tier 2:');
  expect(errors).toEqual([]);
});

test('a message after buying keeps the selected unit and its Sell button', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(PAGE);
  await startRun(page, 'H');
  await ui(page, (S) => {
    const r = S.run;
    r.gold = 20;
    r.things = [{ uid: 900, kind: 'unit', id: 'knight', tier: 1, item: null, gAtk: 0, gHp: 0, slot: 4, bench: null }];
    r.shop = [{ kind: 'item', id: 'sword' }, null, null, null, null];
  });
  await page.click('[data-act="xp"]');
  await page.click('[data-own="900"]');
  await page.click('button[data-shop="0"]'); // an item: the shop says where it went
  const status = page.locator('.foot .status');
  await expect(status).toContainText('Item added to your bench');
  await expect(status).toContainText('Knight selected');
  const gold = await ui(page, (S) => S.run.gold);
  await status.locator('[data-act="sell"]').click();
  expect(
    await ui(page, (S) => ({ knights: S.run.things.filter((t) => t.id === 'knight').length, gold: S.run.gold })),
  ).toEqual({
    knights: 0,
    gold: gold + 2,
  });
  expect(errors).toEqual([]);
});
