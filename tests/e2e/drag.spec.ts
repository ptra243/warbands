import { expect, test, type Page } from '@playwright/test';
import { PAGE, startRun, trackErrors, ui } from './helpers.ts';

// Drop preview and pushing units aside, by click-then-hover and by a real drag.
const layout = (page: Page) =>
  ui(page, (S) => S.run.things.map((t) => t.id[0] + (t.slot == null ? 'b' : t.slot)).join(' '));
const dropmark = (page: Page) =>
  page.evaluate(() => {
    const m = document.querySelector<HTMLElement>('.dropmark');
    return m ? { col: m.style.gridColumn, bad: m.classList.contains('bad') } : null;
  });

test('drop preview matches where units land', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(PAGE);
  await startRun(page, 'U');
  await ui(page, (S) => {
    const r = S.run;
    r.level = 7;
    r.things = [];
    let id = 900;
    const units: [string, number | null, number | null][] = [
      ['skeleton', 3, null],
      ['ghoul', 4, null],
      ['initiate', 5, null],
      ['colossus', null, 0],
      ['lich', 7, null],
    ];
    for (const [u, s, bn] of units)
      r.things.push({ uid: id++, kind: 'unit', id: u, tier: 1, item: null, gAtk: 0, gHp: 0, slot: s, bench: bn });
  });
  await page.click('[data-act="xp"]'); // forces a render
  const row = (await page.locator('#row0').boundingBox())!;
  const cx = (s: number) => row.x + (row.width / 10) * (s + 0.5),
    cy = row.y + row.height / 2;

  // select the benched Bone Colossus and hover slot 4: the outline covers slots 4-5 and neighbours are marked to move
  await page.click('[data-own="903"]');
  await page.mouse.move(cx(4), cy);
  await expect(page.locator('.dropmark')).toHaveCount(1);
  expect(await dropmark(page)).toEqual({ col: '5 / span 2', bad: false });
  expect(await page.locator('[data-push]').count()).toBeGreaterThan(0);
  await page.mouse.click(cx(4), cy);
  expect(await layout(page)).toContain('c4');
  await expect(page.locator('.dropmark')).toHaveCount(0);

  // a real drag of the Lich onto slot 3: an outline shows while dragging, and the Lich lands on slot 3.
  // (Under Playwright's drag emulation the outline can trail a slot behind the pointer; the old page did the same.)
  const lich = (await page.locator('[data-own="904"]').boundingBox())!;
  await page.mouse.move(lich.x + lich.width / 2, lich.y + lich.height / 2);
  await page.mouse.down();
  await page.mouse.move(cx(5), cy, { steps: 4 });
  await page.mouse.move(cx(3) + 5, cy, { steps: 6 });
  await expect(page.locator('.dropmark')).toHaveCount(1);
  expect((await dropmark(page))?.bad).toBe(false);
  await page.mouse.up();
  expect(await layout(page)).toContain('l3');
  expect(await ui(page, (S) => S.sel)).toBeNull();

  // a full row at level 1 has no room for a two-slot unit: the outline turns bad
  await ui(page, (S) => {
    const r = S.run;
    r.level = 1;
    r.gold = 50;
    r.things = r.things.filter((t) => t.id !== 'lich');
    r.things.forEach((t, i) => {
      if (t.kind !== 'unit') return;
      if (t.id === 'colossus') {
        t.slot = null;
        t.bench = 0;
      } else {
        t.slot = 3 + i;
        t.bench = null;
      }
    });
    r.things.push({
      uid: 950,
      kind: 'unit',
      id: 'revenant',
      tier: 1,
      item: null,
      gAtk: 0,
      gHp: 0,
      slot: 6,
      bench: null,
    });
  });
  await page.click('[data-act="reroll"]');
  await page.click('[data-own="903"]');
  const row1 = (await page.locator('#row0').boundingBox())!;
  await page.mouse.move(row1.x + (row1.width / 10) * 4.5, row1.y + 50);
  expect((await dropmark(page))?.bad).toBe(true);
  expect(errors).toEqual([]);
});

test('dragging a unit onto the shop sells it', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(PAGE);
  await startRun(page, 'H');
  await ui(page, (S) => {
    const r = S.run;
    r.gold = 0;
    r.things = [{ uid: 900, kind: 'unit', id: 'knight', tier: 1, item: null, gAtk: 0, gHp: 0, slot: 4, bench: null }];
  });
  await page.click('[data-act="xp"]'); // forces a render
  const knight = (await page.locator('[data-own="900"]').boundingBox())!;
  const shelf = (await page.locator('[data-sellzone]').boundingBox())!;
  await page.mouse.move(knight.x + knight.width / 2, knight.y + knight.height / 2);
  await page.mouse.down();
  await page.mouse.move(shelf.x + shelf.width / 2, shelf.y + shelf.height / 2, { steps: 6 });
  await expect(page.locator('[data-sellzone].selling')).toHaveCount(1);
  await page.mouse.up();
  expect(await ui(page, (S) => ({ n: S.run.things.length, gold: S.run.gold, drag: !!S.drag }))).toEqual({
    n: 0,
    gold: 2,
    drag: false,
  });
  expect(errors).toEqual([]);
});
