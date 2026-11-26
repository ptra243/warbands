/* node tools/cards.ts [unit ids...] [--no-shots]
   Renders card art for review into art/out/: every listed unit (default: all drawn) large, as a full card and as
   battle tiles at game size and twice that. Screenshots need Chromium: `npx playwright install chromium` or CHROME=path.
   Always look at the PNGs after drawing: the SVG source does not show what is cramped, cropped or muddy. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import * as W from '../src/engine/index.ts';
import { ART } from '../src/ui/art.ts';
import { CARD_ART } from '../src/ui/card-art.ts';

const args = process.argv.slice(2);
const shots = !args.includes('--no-shots');
const ids = args.filter((a) => !a.startsWith('--'));
const list = ids.length ? ids : CARD_ART.ids;
for (const id of list) if (!CARD_ART.has(id) || !W.U[id]) throw new Error(`No card art or no unit called "${id}"`);

const FC: Record<string, string> = { H: '#5b8fd1', E: '#58b37a', U: '#a174d6' };
const RAR = ['', '#a9b0ae', '#6cc070', '#5aa4e6', '#b77be8', '#f0b23a'];
const RNAME = ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const DISPLAY = `font-family: 'Grenze Gotisch', Georgia, serif; font-weight: 700`;
const glyph = (k: string, px: number) =>
  ART.tribe(k).replace('<svg ', `<svg style="display: block; width: ${px}px; height: ${px}px" `);
const chip = (inner: string, c: string) =>
  `<span style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; border: 1px solid ${c}; color: ${c}; font-size: 13.5px; font-weight: 700; line-height: 1.2">${inner}</span>`;
const sword = `<svg viewBox="0 0 24 24" aria-hidden="true" style="display: block; width: 22px; height: 22px"><path fill="#f0b25a" d="M19 2l3 0 0 3-10.5 10.5 2 2-1.5 1.5-2.5-2.5-3.2 3.2 .7 2.3-2 0-3-3 0-2 2.3 .7 3.2-3.2-2.5-2.5 1.5-1.5 2 2z"/></svg>`;
const heart = `<svg viewBox="0 0 24 24" aria-hidden="true" style="display: block; width: 22px; height: 22px"><path fill="#e2675d" d="M12 21C5 15.5 2 12 2 8.2 2 5.3 4.3 3 7.1 3c1.9 0 3.7 1 4.9 2.7C13.2 4 15 3 16.9 3 19.7 3 22 5.3 22 8.2 22 12 19 15.5 12 21z"/></svg>`;
const plate = (icon: string, v: number, label: string, bgc: string, bd: string) =>
  `<div style="display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 10px; border-radius: 10px; background: ${bgc}; border: 1px solid ${bd}">${icon}<span style="display: flex; flex-direction: column; line-height: 1"><b style="font-size: 26px; color: #f4ecd9; font-variant-numeric: tabular-nums">${v}</b><span style="font-size: 11.5px; letter-spacing: .1em; text-transform: uppercase; color: #b9b3a3; font-weight: 700">${label}</span></span></div>`;

/* The full card: 320 x 540, with a square art window. The name covers the art's bottom quarter. */
function card(id: string): string {
  const d = W.U[id],
    fc = FC[d.f],
    rc = RAR[d.cost];
  return `<article style="width: 320px; height: 540px; box-sizing: border-box; padding: 10px; border-radius: 18px; background: linear-gradient(165deg, #2b343b 0%, #171d21 55%, #11161a 100%); border: 2px solid ${fc}; box-shadow: 0 20px 44px rgba(0, 0, 0, .6), inset 0 0 0 1px rgba(255, 255, 255, .07); display: flex; flex-direction: column; gap: 10px; color: #ebe3d1">
<div style="position: relative; flex: none; height: 296px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255, 255, 255, .2)">
${CARD_ART.svg(id, d.name, false, '-card')}
<div style="position: absolute; left: 8px; top: 8px; width: 42px; height: 42px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffe9a8, #e0a93f 55%, #8a5d12); border: 2px solid ${rc}; box-shadow: 0 2px 6px rgba(0, 0, 0, .6); display: flex; align-items: center; justify-content: center; ${DISPLAY}; font-size: 26px; line-height: 1; color: #2a1c05">${d.cost}</div>
<div style="position: absolute; right: 8px; top: 10px; padding: 3px 9px; border-radius: 999px; background: rgba(8, 10, 12, .72); border: 1px solid ${rc}; color: ${rc}; font-size: 12.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase">${RNAME[d.cost]}</div>
<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 34px 12px 8px; background: linear-gradient(180deg, rgba(8, 10, 12, 0), rgba(8, 10, 12, .93) 62%)"><h2 style="margin: 0; ${DISPLAY}; font-size: 34px; line-height: 1; color: #f4ecd9; letter-spacing: .5px">${d.name}</h2></div>
</div>
<div style="display: flex; flex-wrap: wrap; gap: 6px">${chip(W.FACTIONS[d.f].name, fc)}${d.tribes.map((k) => chip(`<span style="color: ${fc}">${glyph(k, 13)}</span>` + k, fc)).join('')}${d.size > 1 ? chip(`${d.size} slots`, '#b9b3a3') : ''}</div>
<p style="margin: 0; flex: 1; padding: 10px 12px; border-radius: 9px; background: #0f1417; border: 1px solid #2c363c; font-size: 16px; line-height: 1.35">${d.txt(1)}</p>
<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">${plate(sword, d.atk, 'Attack', '#33260f', '#a8782a')}<span style="font-size: 14px; color: #b9b3a3; text-align: center; line-height: 1.2">every<br><b style="color: #ebe3d1; font-size: 16px">${d.cd}s</b></span>${plate(heart, d.hp, 'Health', '#371715', '#a3423b')}</div>
</article>`;
}

/* A battle tile at k times game size. One slot is 113 x 132; a wide unit spans its slots plus the 5px gaps.
   The bars and numbers cover the art's bottom quarter. */
function tile(id: string, k: number): string {
  const d = W.U[id],
    w = (113 * d.size + 5 * (d.size - 1)) * k,
    h = 132 * k;
  return `<div style="position: relative; flex: none; width: ${w}px; height: ${h}px; box-sizing: border-box; border: ${2 * k}px solid #6d5c45; border-radius: ${8 * k}px; overflow: hidden; background: #14191c">
<div style="position: absolute; inset: 0">${CARD_ART.svg(id, d.name, d.size > 1, '-t' + k)}</div>
<span style="position: absolute; left: ${3 * k}px; top: ${3 * k}px; width: ${17 * k}px; height: ${17 * k}px; box-sizing: border-box; border-radius: 50%; background: rgba(8, 10, 12, .78); border: ${k}px solid #b9b3a3; color: #b9b3a3; display: flex; align-items: center; justify-content: center">${glyph(d.tribes[0], 10 * k)}</span>
<div style="position: absolute; left: 0; right: 0; bottom: 0; padding-top: ${22 * k}px; background: linear-gradient(180deg, rgba(8, 10, 12, 0), rgba(8, 10, 12, .9) 55%)">
<div style="padding: 0 ${3 * k}px ${2 * k}px; display: flex; flex-direction: column; gap: ${2 * k}px"><div style="height: ${5 * k}px; border-radius: ${3 * k}px; background: rgba(0, 0, 0, .7); overflow: hidden"><div style="width: 80%; height: 100%; background: #d9534a"></div></div><div style="height: ${3 * k}px; border-radius: ${3 * k}px; background: rgba(0, 0, 0, .7); overflow: hidden"><div style="width: 45%; height: 100%; background: #e0a93f"></div></div></div>
<div style="display: flex; justify-content: space-between; padding: 0 ${5 * k}px ${k}px; font-size: ${14 * k}px; line-height: 1.3; font-weight: 800; font-variant-numeric: tabular-nums"><span style="color: #f0b25a">${d.atk}</span><span>${d.hp}</span></div>
</div></div>`;
}

const page = (inner: string) =>
  `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;700;800&family=Grenze+Gotisch:wght@700&display=swap" rel="stylesheet">
<body style="margin: 0; padding: 24px; background: #12171a; color: #ebe3d1; font-family: 'Alegreya Sans', system-ui, sans-serif"><div id="sheet" style="display: inline-flex; flex-direction: column; gap: 24px">${inner}</div>`;
const row = (inner: string, gap: number) =>
  `<div style="display: flex; flex-wrap: wrap; gap: ${gap}px; max-width: 1500px">${inner}</div>`;
const felt = (inner: string, k: number) =>
  `<div style="align-self: flex-start; display: flex; flex-wrap: wrap; gap: ${5 * k}px; padding: ${12 * k}px; border-radius: ${10 * k}px; background: #1b2327; border: 1px solid #313c42; max-width: 1500px">${inner}</div>`;

const pages: Record<string, string> = {
  // the bare drawing, large: check anatomy, overlaps and stray shapes here
  large: page(
    row(
      list
        .map(
          (id) =>
            `<div style="width: ${W.U[id].size > 1 ? 980 : 560}px; height: 560px">${CARD_ART.svg(id, id, W.U[id].size > 1, '-big')}</div>`,
        )
        .join(''),
      12,
    ),
  ),
  cards: page(row(list.map(card).join(''), 32)),
  tiles: page(felt(list.map((id) => tile(id, 1)).join(''), 1) + felt(list.map((id) => tile(id, 2)).join(''), 2)),
};

const out = resolve('art/out');
mkdirSync(out, { recursive: true });
for (const [name, html] of Object.entries(pages)) writeFileSync(resolve(out, name + '.html'), html);
console.log(`Wrote ${Object.keys(pages).length} pages for ${list.join(', ')} to art/out/`);

if (shots) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const tab = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  for (const name of Object.keys(pages)) {
    await tab.goto(pathToFileURL(resolve(out, name + '.html')).href);
    await tab.waitForTimeout(800); // web fonts
    await tab.locator('#sheet').screenshot({ path: resolve(out, name + '.png') });
  }
  await browser.close();
  console.log('Wrote large.png, cards.png and tiles.png. Open them and look.');
}
