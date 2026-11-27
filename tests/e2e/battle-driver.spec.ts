import { expect, test, type Page } from '@playwright/test';
import { PAGE, buyShop, startRun, trackErrors, ui } from './helpers.ts';

/* The playback driver in src/ui/battle.ts: it owns the one frame loop and hands each frame to whichever battle
   screen is showing. Headless Chrome has no GPU, so Pixi refuses to start here and these checks drive the
   classic screen and the fall back to it; they test the driver's ordering, not Pixi's drawing. */

/** start a run on the given battle screen and open its first shop fight, without starting it */
async function toFirstFight(page: Page, view: 'classic' | 'pixi'): Promise<void> {
  await page.addInitScript((v) => localStorage.setItem('warband:battle-view', v), view);
  await page.goto(PAGE);
  await startRun(page, 'H');
  if ((await ui(page, (S) => S.screen)) === 'encounter') await page.locator('[data-act^="enc:"]').first().click();
  if ((await ui(page, (S) => S.screen)) === 'battle') {
    await page.click('[data-act="skip"]');
    await page.click('[data-act="continue"]');
  }
  await buyShop(page);
}

const battleTime = (page: Page) => ui(page, (S) => S.B?.time ?? 0);
/** a battle only ever moves in whole 0.05s ticks */
const wholeTicks = (t: number) => Math.abs(t / 0.05 - Math.round(t / 0.05)) < 1e-6;

test('switching to the animated screen mid-fight falls back to classic and carries the fight on', async ({ page }) => {
  /* Without a GPU only this one switch is real: once Pixi has failed its button goes. Repeated switches, and a
     Pixi screen that does start, are covered by tests/battle-driver.test.ts. */
  const errors = trackErrors(page);
  await toFirstFight(page, 'classic');
  await page.click('[data-act="fight"]');
  await expect.poll(() => battleTime(page)).toBeGreaterThan(0.5);
  const first = await page.locator('#row0 .u').first().elementHandle();
  const before = await battleTime(page);
  await page.click('[data-act="view:pixi"]');
  /* the classic screen is drawn afresh from the battle as it stands, and the clock never goes back */
  await expect(page.locator('[data-act="view:pixi"]')).toHaveCount(0);
  await expect(page.locator('#row0 .u').first()).toBeVisible();
  expect(await first!.evaluate((e) => e.isConnected)).toBe(false);
  expect(await battleTime(page)).toBeGreaterThanOrEqual(before);
  await page.click('[data-act="speed:4"]');
  await expect(page.locator('.result h2')).toHaveText(/Victory|Defeat|Draw/, { timeout: 30_000 });
  const end = await ui(page, (S) => ({ screen: S.screen, over: S.B?.over, ev: S.B?.ev.length, t: S.B?.time ?? 0 }));
  expect(end).toMatchObject({ screen: 'summary', over: true, ev: 0 });
  expect(wholeTicks(end.t)).toBe(true);
  expect(errors).toEqual([]);
});

test('skipping while the Pixi screen is still starting lands on the summary and stays there', async ({ page }) => {
  const errors = trackErrors(page);
  await toFirstFight(page, 'pixi');
  /* both clicks land before Pixi's start-up (here, its refusal) resolves. A Pixi start-up that succeeds after the
     skip can't happen without a GPU; tests/battle-driver.test.ts covers it. */
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('[data-act="fight"]')!.click();
    document.querySelector<HTMLElement>('[data-act="skip"]')!.click();
  });
  await expect(page.locator('.result h2')).toHaveText(/Victory|Defeat|Draw/);
  const t = await battleTime(page);
  /* the abandoned mount must not put a battle screen back up or move the finished battle on */
  await page.waitForTimeout(1000);
  expect(await ui(page, (S) => ({ screen: S.screen, over: S.B?.over }))).toEqual({ screen: 'summary', over: true });
  expect(await battleTime(page)).toBe(t);
  await expect(page.locator('#row0 .u')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('changing speed mid-fight speeds the battle up, still in whole ticks', async ({ page }) => {
  const errors = trackErrors(page);
  await toFirstFight(page, 'classic');
  await page.click('[data-act="fight"]');
  await page.click('[data-act="speed:1"]');
  await expect.poll(() => battleTime(page)).toBeGreaterThan(0.2);
  const rate = async () => {
    const t0 = await battleTime(page),
      r0 = Date.now();
    await page.waitForTimeout(1000);
    return ((await battleTime(page)) - t0) / ((Date.now() - r0) / 1000);
  };
  const slow = await rate();
  expect(await ui(page, (S) => S.B?.over)).toBe(false);
  await page.click('[data-act="speed:4"]');
  const fast = await rate();
  expect(fast).toBeGreaterThan(slow * 2);
  expect(wholeTicks(await battleTime(page))).toBe(true);
  await expect(page.locator('.result h2')).toHaveText(/Victory|Defeat|Draw/, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('a battle screen that throws while drawing does not stop the fight', async ({ page }) => {
  const errors = trackErrors(page);
  const screenErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && m.text().includes('Battle screen error')) screenErrors.push(m.text());
  });
  await toFirstFight(page, 'classic');
  await page.click('[data-act="fight"]');
  await expect.poll(() => battleTime(page)).toBeGreaterThan(0.2);
  /* take your hero's health bar out from under the classic screen: it is painted on every frame, the last one
     included, so drawing throws all the way to the end and the driver alone has to finish the fight */
  await page.evaluate(() => document.querySelector('#hero0 i')!.remove());
  await page.click('[data-act="speed:4"]');
  await expect(page.locator('.result h2')).toHaveText(/Victory|Defeat|Draw/, { timeout: 30_000 });
  expect(await ui(page, (S) => ({ screen: S.screen, over: S.B?.over }))).toEqual({ screen: 'summary', over: true });
  /* reported once, not once a frame */
  expect(screenErrors).toHaveLength(1);
  expect(errors).toEqual([]);
});
