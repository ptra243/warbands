import { expect, test } from '@playwright/test';
import { PAGE, buyShop, startRun, trackErrors, ui } from './helpers.ts';

// Watch a fight through to the summary without skipping, on each battle screen, at 4x speed. Without a GPU
// (headless Chrome) the Pixi screen refuses to start, so that check also covers the fall back to classic.
for (const view of ['classic', 'pixi'] as const) {
  test(`watches a battle to the end on the ${view} screen`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.addInitScript((v) => localStorage.setItem('warband:battle-view', v), view);
    await page.goto(PAGE);
    await startRun(page, 'H');
    if ((await ui(page, (S) => S.screen)) === 'encounter') await page.locator('[data-act^="enc:"]').first().click();
    if ((await ui(page, (S) => S.screen)) === 'battle') {
      await page.click('[data-act="skip"]');
      await page.click('[data-act="continue"]');
    }
    await buyShop(page);
    await page.click('[data-act="fight"]');
    await page.click('[data-act="speed:4"]');
    /* the fight is under way, not skipped */
    await expect.poll(() => ui(page, (S) => S.B?.time ?? 0)).toBeGreaterThan(0.5);
    const drawn = await page.evaluate(() =>
      document.querySelector('#pixi-stage canvas') ? 'pixi' : document.querySelector('#row0 .u') ? 'classic' : 'none',
    );
    if (view === 'classic') expect(drawn).toBe('classic');
    else expect(['pixi', 'classic']).toContain(drawn);
    await expect(page.locator('.result h2')).toHaveText(/Victory|Defeat|Draw/, { timeout: 30_000 });
    const end = await ui(page, (S) => ({ screen: S.screen, over: S.B?.over, ev: S.B?.ev.length }));
    expect(end).toEqual({ screen: 'summary', over: true, ev: 0 });
    expect(errors).toEqual([]);
  });
}
