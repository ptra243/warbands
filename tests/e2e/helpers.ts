import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import type { Run } from '../../src/engine/index.ts';
import type { UiState } from '../../src/ui/state.ts';

export const PAGE = process.env.PAGE_URL || pathToFileURL(resolve(import.meta.dirname, '../../dist/index.html')).href;

/** collect uncaught page errors so each test can assert there were none */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** the UI state the page exposes as window.__S, typed for page.evaluate */
export type Exposed = Omit<UiState, 'run'> & { run: Run };
declare global {
  interface Window {
    __store?: Record<string, Record<string, unknown>>;
  }
}
export const ui = <T>(page: Page, fn: (S: Exposed) => T): Promise<T> =>
  page.evaluate(`(${fn.toString()})(window.__S)`) as Promise<T>;

export async function startRun(page: Page, faction: 'H' | 'E' | 'U', leaderIndex = 0): Promise<void> {
  await page.click(`[data-act="pick:${faction}"]`);
  await page.locator('[data-act^="leader:"]').nth(leaderIndex).click();
}

/** buy what the shop offers, units before items, so the gold goes on a unit for the board first (with a leader
 *  such as the Quartermaster the shop is mostly items) */
export async function buyShop(page: Page): Promise<void> {
  /* the slots still for sale, by their own index: a sold slot leaves a gap */
  const forSale = () =>
    page
      .locator('button[data-shop]')
      .evaluateAll((els) => els.map((e) => ({ i: e.getAttribute('data-shop')!, item: e.classList.contains('item') })));
  let slots = await forSale();
  /* a shop of nothing but items: reroll (while there's gold for it) until a unit turns up */
  for (let n = 0; n < 4 && !slots.some((s) => !s.item); n++) {
    await page.click('[data-act="reroll"]');
    slots = await forSale();
  }
  for (const s of [...slots.filter((s) => !s.item), ...slots.filter((s) => s.item)]) {
    const card = page.locator(`button[data-shop="${s.i}"]`);
    if (await card.count()) await card.click();
  }
}

/** fight the current round and skip straight to the summary, then continue */
export async function fightAndContinue(page: Page): Promise<string> {
  await page.click('[data-act="fight"]');
  await page.click('[data-act="skip"]');
  const title = (await page.locator('.result h2').textContent()) || '';
  await page.click('[data-act="continue"]');
  return title;
}
