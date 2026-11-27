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

/** buy what the shop offers, units before items, so the gold goes on a unit for the board first (a leader such as
 *  the Quartermaster can fill the shop with items) */
export async function buyShop(page: Page): Promise<void> {
  const slots = await page.locator('[data-shop]').count(); // a leader can add a slot
  for (const kind of [':not(.item)', '.item'])
    for (let i = 0; i < slots; i++) {
      const card = page.locator(`button[data-shop="${i}"]${kind}`);
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
