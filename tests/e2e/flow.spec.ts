import { expect, test } from '@playwright/test';
import { PAGE, trackErrors, ui } from './helpers.ts';

// A faction, a leader, encounters, camps and a boss, to the end of a run or twelve rounds, for all three factions.
for (const [fi, f] of (['U', 'H', 'E'] as const).entries()) {
  test(`plays rounds as ${f}`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(PAGE);
    await page.click(`[data-act="pick:${f}"]`);
    await page
      .locator('[data-act^="leader:"]')
      .nth(fi % 3)
      .click();
    const seen = new Set<string>();
    for (let rnd = 0; rnd < 12; rnd++) {
      if ((await ui(page, (S) => S.screen)) === 'encounter') {
        const kinds = await ui(page, (S) => S.run.offer!.cards.map((c) => c.type + (c.hard ? 'H' : '')));
        kinds.forEach((k) => seen.add(k));
        const cards = page.locator('[data-act^="enc:"]');
        await cards.nth(rnd % (await cards.count())).click();
        if ((await ui(page, (S) => S.screen)) === 'battle') {
          await page.click('[data-act="skip"]');
          seen.add('campfight');
          await page.click('[data-act="continue"]');
        }
      }
      if (await page.locator('[data-act="newrun"]').count()) break;
      for (let i = 0; i < 4; i++) {
        const card = page.locator(`button[data-shop="${i}"]`);
        if (await card.count()) await card.click();
      }
      if (rnd >= 1) await page.click('[data-act="xp"]');
      const boss = await ui(page, (S) => !!S.run.enemy.boss);
      await page.click('[data-act="fight"]');
      await page.click('[data-act="skip"]');
      await expect(page.locator('.result h2')).toHaveText(/Victory|Defeat|Draw/);
      if (boss) seen.add('boss');
      await page.click('[data-act="continue"]');
      if (await page.locator('[data-act="newrun"]').count()) break;
    }
    const run = await ui(page, (S) => ({ round: S.run.round, leader: S.run.leader, screen: S.screen }));
    expect(run.leader).toBeTruthy();
    expect(run.round).toBeGreaterThan(1);
    expect(['shop', 'encounter', 'end']).toContain(run.screen);
    expect(seen.has('event') || seen.has('camp') || seen.has('relic')).toBe(true);
    expect(errors).toEqual([]);
  });
}
