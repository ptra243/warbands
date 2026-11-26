/* The battle screen drawn with PixiJS. It only replays the fight: the engine steps the battle and emits events
   (B.ev), and this turns them into animation. No rules live here, and Math.random below only jitters effects.
   Pixi starts on first use. If it can't (no WebGL), mountPixiBattle() returns false and the caller falls back
   to the classic HTML battle screen. */
import { Application, Container, FillGradient, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import * as W from '../../engine/index.ts';
import type { Battle, BattleEvent, BattleUnit } from '../../engine/index.ts';
import { ART } from '../art.ts';
import { CARD_ART } from '../card-art.ts';
import { PORTRAIT } from '../portraits.ts';
import { S } from '../state.ts';
import { initDock, inspect, layoutDock, monogram, setPointing, setSides } from './dock.ts';

/* what the inspector under the field shows: the unit under the pointer, or else a notable one */
let hovered: number | null = null,
  notable: number | null = null,
  notableWhy = '',
  dockT = 0;

/* ---- layout: tiles keep the 113 x 132 shape of the card-frame mockup ---- */
const WIDTH = 1030,
  HEIGHT = 380, // two lanes and a gap for attacks; each lane doubles as its hero's health bar
  SLOT = 100,
  GAP = 5,
  LEFT = (WIDTH - SLOT * 10) / 2,
  CARD_H = 116,
  FRAME = 2,
  PLATE = 21,
  ROW_Y = [302, 78];
const FACTION: Record<string, number> = { H: 0x3b6ea8, E: 0x3c8a5a, U: 0x6b4a8a, N: 0x8a6a3a };
/* frame B2: the frame is the rarity colour, by cost */
const RARITY = [0xa9b0ae, 0xa9b0ae, 0x6cc070, 0x5aa4e6, 0xb77be8, 0xf0b23a];
const RANGED = ['DPS', 'Mage', 'Cleric', 'Necromancer'];

/* ---- textures from the existing SVG art ---- */
const textures: Record<string, Texture> = {};
/* SVG art is turned into images at RES pixels per layout pixel. RES follows the screen scale, so the art is
   redrawn sharp whenever the canvas grows (see fit()). */
let RES = 2;
async function svgTex(key: string, svg: string, w: number, h: number): Promise<Texture> {
  const res = RES,
    k = `${key}@${res}`;
  if (textures[k]) return textures[k];
  const sized = svg
    .replace(/ style="[^"]*"/, '')
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${w * res}" height="${h * res}" `);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  try {
    await img.decode();
  } catch (e) {
    /* a picture that won't decode leaves a blank tile rather than a battle that never starts */
    console.warn('Could not draw', key, e);
    return Texture.EMPTY;
  }
  return (textures[k] = Texture.from(img));
}
/* every sprite drawn from SVG, so fit() can swap in sharper images after a resize */
interface Sharp {
  s: Sprite;
  load: () => Promise<Texture>;
  w: number;
  h: number;
  flip: boolean;
}
let sharp: Sharp[] = [];
const sizeSprite = (e: Sharp) => e.s.scale.set(((e.flip ? -1 : 1) * e.w) / e.s.texture.width, e.h / e.s.texture.height);
async function sharpSprite(load: () => Promise<Texture>, w: number, h: number, flip = false): Promise<Sprite> {
  const e: Sharp = { s: new Sprite(await load()), load, w, h, flip };
  sizeSprite(e);
  sharp.push(e);
  return e.s;
}
async function resharpen() {
  sharp = sharp.filter((e) => !e.s.destroyed);
  await Promise.all(
    sharp.map(async (e) => {
      const t = await e.load();
      if (e.s.destroyed) return;
      e.s.texture = t;
      sizeSprite(e);
    }),
  );
}
/* the card art, cropped to the tile's window, for units that have a scene. Everything else keeps the old icon. */
const artTex = (u: BattleUnit, w: number, h: number) =>
  CARD_ART.inGame(u.d.id)
    ? svgTex(`card:${u.d.id}:${w}x${h}`, CARD_ART.svg(u.d.id, u.d.name, u.size > 1, '-px'), w, h)
    : svgTex('icon:' + u.d.id, ART.unit(u.d.id), 80, 80);
const SWORD = `<svg viewBox="0 0 24 24"><path fill="#f0b25a" d="M19 2l3 0 0 3-10.5 10.5 2 2-1.5 1.5-2.5-2.5-3.2 3.2 .7 2.3-2 0-3-3 0-2 2.3 .7 3.2-3.2-2.5-2.5 1.5-1.5 2 2z"/></svg>`;
const HEART = `<svg viewBox="0 0 24 24"><path fill="#e2675d" d="M12 21C5 15.5 2 12 2 8.2 2 5.3 4.3 3 7.1 3c1.9 0 3.7 1 4.9 2.7C13.2 4 15 3 16.9 3 19.7 3 22 5.3 22 8.2 22 12 19 15.5 12 21z"/></svg>`;
const itemTex = (id: string) => svgTex('item:' + id, ART.item(id).replace('<svg ', '<svg color="#e8e2d0" '), 24, 24);
const tribeTex = (t: string) => svgTex('tribe:' + t, ART.tribe(t).replace('<svg ', '<svg color="#e8e2d0" '), 12, 12);

/* ---- tiny tween and particle systems ---- */
interface Tween {
  t: number;
  dur: number;
  delay: number;
  fn: (k: number) => void;
  end?: () => void;
}
let tweens: Tween[] = [];
const tween = (dur: number, fn: (k: number) => void, end?: () => void, delay = 0) =>
  tweens.push({ t: 0, dur, delay, fn, end });

interface Particle {
  g: Container;
  vx: number;
  vy: number;
  life: number;
  max: number;
  grav: number;
  spin: number;
  shrink?: boolean;
}
let particles: Particle[] = [];

/* one Pixi application, created on first use and kept for later battles */
let app: Application | null = null,
  failed = false,
  stageEl: HTMLElement | null = null;
/* WebGL drawn by the CPU (SwiftShader in headless Chrome, llvmpipe on Linux without a GPU). Chrome doesn't flag
   SwiftShader as a performance caveat, so this asks for the renderer's name instead. */
const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|software|basic render/i;
function softwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return SOFTWARE_GL.test(name);
  } catch {
    return false;
  }
}
async function ensureApp(): Promise<Application | null> {
  if (app || failed) return app;
  if (softwareGl()) {
    failed = true;
    console.info('No GPU for WebGL; using the classic battle screen.');
    return null;
  }
  try {
    const a = new Application();
    await a.init({
      width: WIDTH,
      height: HEIGHT,
      background: '#15181b',
      antialias: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
      preference: 'webgl',
      /* with no GPU a frame takes 70ms or more and the page stops answering clicks, so
         refuse to start and let the classic screen take over */
      failIfMajorPerformanceCaveat: true,
    });
    a.stage.addChild(world, vignette, hud);
    a.ticker.add(tick);
    a.ticker.stop();
    app = a;
  } catch (e) {
    failed = true;
    console.warn('Pixi could not start; using the classic battle screen.', e);
  }
  return app;
}

/* Fill the window: everything is laid out in WIDTH x HEIGHT layout pixels, and the canvas is scaled to the
   largest size that fits. Raising the renderer resolution (rather than stretching the canvas) keeps shapes and
   text crisp; RES makes the SVG art get redrawn at the new size. */
function fit() {
  if (!app || !stageEl || !stageEl.isConnected) return;
  const stage = stageEl;
  const availW = document.documentElement.clientWidth,
    availH = innerHeight - stage.getBoundingClientRect().top - 16;
  const scale = Math.max(0.3, Math.min(availW / WIDTH, availH / HEIGHT)),
    dpr = window.devicePixelRatio || 1;
  app.renderer.resize(WIDTH, HEIGHT, dpr * scale);
  app.canvas.style.width = WIDTH * scale + 'px';
  app.canvas.style.height = HEIGHT * scale + 'px';
  /* the dock under the field takes whatever height is left */
  layoutDock(innerHeight - app.canvas.getBoundingClientRect().bottom);
  const res = Math.max(2, Math.ceil(dpr * scale));
  if (res !== RES) {
    RES = res;
    void resharpen();
  }
}
let fitTimer = 0;
addEventListener('resize', () => {
  clearTimeout(fitTimer);
  fitTimer = window.setTimeout(fit, 120);
});

const world = new Container(),
  laneBg = new Graphics(),
  laneHp = new Container(),
  floor = new Graphics(),
  unitLayer = new Container(),
  fxLayer = new Container(),
  vignette = new Graphics(),
  hud = new Container();
world.addChild(laneBg, laneHp, floor, unitLayer, fxLayer);

function addParticle(g: Container, p: Omit<Particle, 'g' | 'max'>) {
  fxLayer.addChild(g);
  particles.push({ g, max: p.life, ...p });
}
function sparks(x: number, y: number, color: number, count: number, speed: number, up = 0) {
  for (let i = 0; i < count; i++) {
    const g = new Graphics().circle(0, 0, 2 + Math.random() * 2.5).fill(color);
    g.position.set(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
    const a = Math.random() * Math.PI * 2;
    addParticle(g, {
      vx: Math.cos(a) * speed * Math.random(),
      vy: Math.sin(a) * speed * Math.random() - up,
      life: 0.5 + Math.random() * 0.4,
      grav: up ? -40 : 300,
      spin: 0,
      shrink: true,
    });
  }
}

let shakeT = 0,
  shakeAmp = 0;
const shake = (amp: number, dur = 0.25) => {
  shakeAmp = Math.max(shakeAmp, amp);
  shakeT = Math.max(shakeT, dur);
};

/* ---- unit views: frame B2, a thin rarity-coloured frame round an art window, over a stat plate ---- */
interface View {
  u: BattleUnit;
  root: Container;
  body: Container;
  art: Sprite;
  flash: Graphics;
  shade: Graphics;
  bubble: Graphics;
  hpLine: Graphics;
  heart: Sprite;
  /* recent damage, shown as a red chip by the health number; hits close together add up */
  dmg: { c: Container; bg: Graphics; t: Text; sum: number; life: number };
  /* which way the unit will strike next, drawn just outside the tile's edge facing the enemy */
  aim: Graphics;
  aimDir: string;
  atkT: Text;
  hpT: Text;
  rotT: Text;
  w: number;
  winW: number;
  winH: number;
  lunge: { x: number; y: number };
  kick: { x: number; y: number };
  phase: number;
}
let views = new Map<number, View>();
/* bumped whenever the field is set up or stopped, so art still loading for an earlier fight is thrown away
   instead of landing on this one */
let generation = 0;

const label = (size: number, fill: number, stroke = 4) =>
  new Text({
    text: '',
    style: {
      fontFamily: 'Alegreya Sans, sans-serif',
      fontWeight: '800',
      fontSize: size,
      fill,
      stroke: { color: 0x0b0d0f, width: stroke },
    },
  });

const center = (u: BattleUnit) => ({ x: LEFT + (u.slot + u.size / 2) * SLOT, y: ROW_Y[u.side] });
const mix = (c: number, to: number, k: number) => {
  const ch = (s: number) => Math.round(((c >> s) & 255) * (1 - k) + ((to >> s) & 255) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
const rarityOf = (u: BattleUnit) => RARITY[Math.max(1, Math.min(5, u.d.cost || 1))];

async function makeView(B: Battle, u: BattleUnit, pop: boolean): Promise<void> {
  const gen = generation;
  const w = u.size * SLOT - GAP,
    h = CARD_H,
    x0 = -w / 2,
    y0 = -h / 2,
    winW = w - FRAME * 2,
    winH = h - FRAME - PLATE,
    plateY = y0 + h - PLATE,
    c = center(u),
    rare = rarityOf(u);
  const root = new Container(),
    body = new Container();
  root.position.set(c.x, c.y);
  root.addChild(body);

  /* the frame: rarity colour, lit from the top left like the art */
  const grad = new FillGradient(x0, y0, x0 + w * 0.6, y0 + h);
  grad.addColorStop(0, mix(rare, 0xffffff, 0.35));
  grad.addColorStop(0.3, rare);
  grad.addColorStop(1, mix(rare, 0x000000, 0.5));
  const frame = new Graphics()
    .roundRect(x0, y0, w, h, 7)
    .fill(grad)
    .roundRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1, 7)
    .stroke({ width: 1, color: 0xffffff, alpha: 0.25 });

  /* the art window */
  const win = new Container();
  win.position.set(x0 + FRAME, y0 + FRAME);
  const winMask = new Graphics().roundRect(0, 0, winW, winH + 8, 5).fill(0xffffff);
  win.addChild(winMask);
  win.mask = winMask;
  let art: Sprite;
  if (CARD_ART.inGame(u.d.id)) art = await sharpSprite(() => artTex(u, winW, winH), winW, winH);
  else {
    /* no card art yet: the old icon on a dark faction backdrop */
    win.addChild(new Graphics().rect(0, 0, winW, winH).fill(mix(FACTION[u.d.f] ?? 0x555555, 0x0b0d0f, 0.6)));
    const s = Math.min(winW, winH) - 12;
    art = await sharpSprite(() => artTex(u, winW, winH), s, s, u.side === 1);
    art.anchor.set(0.5);
    art.position.set(winW / 2, winH / 2 + 2);
  }
  const shade = new Graphics();
  const flash = new Graphics().rect(0, 0, winW, winH).fill(0xffffff);
  flash.alpha = 0;
  const bubble = new Graphics()
    .rect(0, 0, winW, winH)
    .fill({ color: 0x7fc8ff, alpha: 0.12 })
    .rect(1.5, 1.5, winW - 3, winH - 3)
    .stroke({ width: 3, color: 0x9fd8ff, alpha: 0.7 });
  bubble.visible = false;
  const rotT = label(13, 0x9ee05a, 3);
  rotT.anchor.set(1, 0);
  rotT.position.set(winW - 5, 4);
  win.addChild(art, shade, flash, bubble, rotT);
  if ((u.o.tier || 1) > 1) {
    const stars = label(12, 0xffd27a, 3);
    stars.text = '★'.repeat(u.o.tier || 1);
    stars.anchor.set(1, 1);
    stars.position.set(winW - 4, winH - 2);
    win.addChild(stars);
  }

  /* the stat plate: health line on top, attack left, item socket centre, health right */
  const plate = new Graphics().roundRect(x0, plateY, w, PLATE, 7).fill(0x12171a).rect(x0, plateY, w, 8).fill(0x12171a);
  const hpLine = new Graphics();
  const sword = await sharpSprite(() => svgTex('sword', SWORD, 12, 12), 12, 12),
    heart = await sharpSprite(() => svgTex('heart', HEART, 12, 12), 12, 12);
  const midY = plateY + PLATE / 2 + 1;
  sword.anchor.set(0, 0.5);
  sword.position.set(x0 + 6, midY);
  const atkT = label(14, 0xf4ecd9, 3);
  atkT.anchor.set(0, 0.5);
  atkT.position.set(x0 + 20, midY);
  const hpT = label(14, 0xf4ecd9, 3);
  hpT.anchor.set(1, 0.5);
  hpT.position.set(x0 + w - 6, midY);
  heart.anchor.set(1, 0.5);
  body.addChild(frame, win, plate, hpLine, sword, atkT, heart, hpT);

  const socket = new Container();
  socket.position.set(0, midY);
  const itemId = u.o.item;
  if (itemId) {
    const it = W.ITEMS[itemId],
      fine = !!it.base;
    socket.addChild(
      new Graphics()
        .circle(0, 0, 8.5)
        .fill(0x1e2428)
        .circle(0, 0, 8.5)
        .stroke({ width: 1.5, color: fine ? 0xf0b23a : 0xb9b3a3 }),
    );
    const icon = await sharpSprite(() => itemTex(it.base || itemId), 12, 12);
    icon.anchor.set(0.5);
    socket.addChild(icon);
    if (fine) {
      const st = label(8, 0xffd27a, 2);
      st.text = '★';
      st.anchor.set(0.5);
      st.position.set(7, -7);
      socket.addChild(st);
    }
  } else socket.addChild(new Graphics().circle(0, 0, 8).stroke({ width: 1, color: 0xb9b3a3, alpha: 0.35 }));
  body.addChild(socket);

  /* tribe badge in the art window's top-left corner */
  const tribe = u.d.tribes[0];
  if (tribe) {
    const badge = new Container();
    badge.position.set(x0 + FRAME + 11, y0 + FRAME + 11);
    badge.addChild(
      new Graphics()
        .circle(0, 0, 9)
        .fill({ color: 0x0b0d0f, alpha: 0.8 })
        .circle(0, 0, 9)
        .stroke({ width: 1.2, color: 0xb9b3a3 }),
    );
    const glyph = await sharpSprite(() => tribeTex(tribe), 11, 11);
    glyph.anchor.set(0.5);
    badge.addChild(glyph);
    body.addChild(badge);
  }

  /* damage chip: sits on the plate's top edge, over the health number */
  const dmgC = new Container(),
    dmgBg = new Graphics(),
    dmgT = label(12, 0xffffff, 0);
  dmgT.anchor.set(1, 0.5);
  dmgC.addChild(dmgBg, dmgT);
  dmgC.position.set(x0 + w - 3, plateY - 2);
  dmgC.visible = false;
  body.addChild(dmgC);
  const aim = new Graphics();
  aim.position.set(0, u.side === 0 ? y0 - 6 : y0 + h + 6);
  body.addChild(aim);

  if (gen !== generation) {
    root.destroy({ children: true });
    return;
  }
  unitLayer.addChild(root);
  /* pointing at a unit shows it in the inspector */
  root.eventMode = 'static';
  root.cursor = 'pointer';
  root.on('pointerover', () => {
    hovered = u.bid;
    dockT = 0;
    setPointing(true);
  });
  root.on('pointerout', () => {
    if (hovered !== u.bid) return;
    hovered = null;
    dockT = 0;
    setPointing(false);
  });
  const v: View = {
    u,
    root,
    body,
    art,
    flash,
    shade,
    bubble,
    hpLine,
    heart,
    dmg: { c: dmgC, bg: dmgBg, t: dmgT, sum: 0, life: 0 },
    aim,
    aimDir: '-',
    atkT,
    hpT,
    rotT,
    w,
    winW,
    winH,
    lunge: { x: 0, y: 0 },
    kick: { x: 0, y: 0 },
    phase: Math.random() * Math.PI * 2,
  };
  views.set(u.bid, v);
  paintView(B, v);
  if (pop) {
    root.scale.set(0);
    tween(0.45, (k) => {
      const e = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); // back-out
      root.scale.set(e * (1 + 0.15 * Math.sin(k * Math.PI)), e * (1 - 0.1 * Math.sin(k * Math.PI)));
    });
    sparks(c.x, c.y + CARD_H / 2, 0xd8c8ff, 14, 160);
  }
}

function paintView(B: Battle, v: View) {
  const u = v.u,
    w = v.w,
    { winW, winH } = v;
  const hpK = Math.max(0, Math.min(1, u.hp / u.maxhp)),
    plateY = CARD_H / 2 - PLATE;
  v.hpLine
    .clear()
    .rect(-w / 2, plateY, w, 3)
    .fill(0x000000)
    .rect(-w / 2, plateY, w * hpK, 3)
    .fill(hpK > 0.5 ? 0x5fc46a : hpK > 0.25 ? 0xe0b040 : 0xd9534f);
  if (u.shield > 0) v.hpLine.rect(-w / 2, plateY, w * Math.min(1, u.shield / u.maxhp), 1.5).fill(0x9fd8ff);
  /* cooldown: a shadow over the art whose left edge sweeps right as the attack charges */
  const cdK = u.d.building ? (u.d.every ? u.at / u.d.every : 0) : Math.min(1, u.t / u.cd);
  const edge = winW * cdK;
  v.shade.clear();
  if (cdK < 1)
    v.shade
      .rect(edge, 0, winW - edge, winH)
      .fill({ color: 0x000000, alpha: 0.55 })
      .rect(edge - 1, 0, 2, winH)
      .fill({ color: 0xffffff, alpha: 0.25 + 0.45 * cdK });
  v.atkT.text = u.d.building ? '–' : String(Math.round(W.effAtk(u)));
  v.hpT.text = String(Math.max(1, Math.round(u.hp)));
  /* the heart sits just left of the health number, which changes width */
  v.heart.position.set(v.hpT.x - v.hpT.width - 3, v.hpT.y);
  v.bubble.visible = u.shield > 0;
  v.rotT.visible = u.rot > 0;
  v.rotT.text = '● ' + u.rot;
  v.art.tint = u.weak > 0 ? 0xb0b8c4 : 0xffffff;
  const dir = u.alive ? W.aimDir(B, u) : '';
  if (dir !== v.aimDir) {
    v.aimDir = dir;
    drawAim(v.aim, dir, u.side);
  }
}

/* An arrow for aimDir: l and r lean towards the target's side, c points straight across (one target ahead, or
   several), h is a white double chevron for an attack that will reach the enemy hero. */
function drawAim(g: Graphics, dir: string, side: number) {
  g.clear();
  if (!dir) return;
  const up = side === 0 ? -1 : 1,
    lean = dir === 'l' ? -1 : dir === 'r' ? 1 : 0,
    color = dir === 'h' ? 0xffffff : side === 0 ? 0x9fc8ff : 0xff9488;
  /* a chevron pointing along (lean, up), drawn about the origin */
  const chevron = (off: number) => {
    const ax = lean * 0.75,
      ay = up,
      n = Math.hypot(ax, ay),
      fx = ax / n,
      fy = ay / n,
      px = -fy,
      py = fx,
      tip = 6 + off;
    return [
      fx * tip,
      fy * tip,
      -fx * 3 + px * 6 + fx * off,
      -fy * 3 + py * 6 + fy * off,
      -fx * 3 - px * 6 + fx * off,
      -fy * 3 - py * 6 + fy * off,
    ];
  };
  g.poly(chevron(0)).fill(color).poly(chevron(0)).stroke({ width: 1, color: 0x0b0d0f, alpha: 0.8 });
  if (dir === 'h') g.poly(chevron(-6)).fill({ color, alpha: 0.55 });
}

function addDamage(v: View, amount: number) {
  if (v.root.destroyed) return;
  const d = v.dmg;
  d.sum = (d.life > 0 ? d.sum : 0) + amount;
  d.life = 1.2;
  d.t.text = '−' + Math.round(d.sum);
  const tw = d.t.width;
  d.t.position.set(-4, -8);
  d.bg
    .clear()
    .roundRect(-tw - 8, -16, tw + 8, 16, 4)
    .fill(0xb3302a)
    .roundRect(-tw - 8, -16, tw + 8, 16, 4)
    .stroke({ width: 1, color: 0x0b0d0f });
  d.c.visible = true;
  d.c.alpha = 1;
  tween(0.15, (k) => d.c.scale.set(1 + 0.3 * Math.sin(k * Math.PI)));
}

function floatText(x: number, y: number, text: string, color: number, size = 22) {
  const t = label(size, color);
  t.text = text;
  t.anchor.set(0.5);
  t.position.set(x + (Math.random() - 0.5) * 24, y);
  fxLayer.addChild(t);
  const y0 = t.y;
  tween(
    0.9,
    (k) => {
      t.y = y0 - 46 * (1 - Math.pow(1 - k, 2));
      t.scale.set(k < 0.15 ? 0.6 + (k / 0.15) * 0.7 : 1.3 - Math.min(0.3, (k - 0.15) * 1.2));
      t.alpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
    },
    () => t.destroy(),
  );
}

/* ---- heroes ---- */
/* ---- the field: two regions, each its hero's health bar ----
   Each side owns its lane plus its half of the middle row, which is split by a diagonal: your leader sits on the
   left of the middle row, the enemy's on the right. The lit part of a region is the health left; it retreats
   towards its own leader's corner as the hero takes damage. A pale "recent damage" stretch trails behind and
   catches up, so a big hit reads as a chunk. */
const laneTop = (side: number) => ROW_Y[side] - CARD_H / 2 - 12,
  LANE_H = CARD_H + 24,
  MID0 = laneTop(1) + LANE_H, // top of the middle row
  MID1 = laneTop(0), // bottom of the middle row
  DIAG = [WIDTH * 0.44, WIDTH * 0.56]; // the diagonal's x at the bottom and top of the middle row
const region = (side: number): number[] =>
  side === 0
    ? [0, MID0, DIAG[1], MID0, DIAG[0], MID1, WIDTH, MID1, WIDTH, MID1 + LANE_H, 0, MID1 + LANE_H]
    : [0, laneTop(1), WIDTH, laneTop(1), WIDTH, MID1, DIAG[0], MID1, DIAG[1], MID0, 0, MID0];
/* the boundary between the two regions, left to right */
const BORDER = [0, MID0, DIAG[1], MID0, DIAG[0], MID1, WIDTH, MID1];

/* each side's leader: portrait, name, health and relics, in its corner of the middle row */
const PORT = 36;
const heroAt = (side: number) => (side === 0 ? LEFT + 4 : WIDTH - LEFT - 4);
/* where attacks on a hero land: its portrait */
const heroPos = (side: number) => ({ x: heroAt(side) + (side === 0 ? PORT / 2 : -PORT / 2), y: HEIGHT / 2 });
interface HeroView {
  box: Container;
  baseX: number;
  t: Text;
  hp: Graphics;
  flash: Graphics;
  trail: number;
}
const heroes: HeroView[] = [0, 1].map((side) => {
  const box = new Container();
  box.position.set(heroAt(side), HEIGHT / 2);
  const t = label(16, 0xffffff, 4);
  /* the lit health fill and the hit flash are clipped to the side's region */
  const mask = new Graphics().poly(region(side)).fill(0xffffff),
    hp = new Graphics(),
    flash = new Graphics().poly(region(side)).fill(0xffffff);
  hp.mask = mask;
  flash.alpha = 0;
  laneHp.addChild(mask, hp, flash);
  hud.addChild(box);
  return { box, baseX: 0, t, hp, flash, trail: 1 };
});
async function buildHeroes(B: Battle, foeName: string) {
  const gen = generation;
  for (const side of [0, 1]) {
    const h = heroes[side],
      lead = B.lead[side],
      L = LANE[side],
      P = PORT,
      dir = side === 0 ? 1 : -1, // the enemy's corner is laid out right to left
      px = side === 0 ? 0 : -P; // the portrait's left edge
    h.box.removeChildren().forEach((c) => c !== h.t && c.destroy({ children: true }));
    h.trail = 1;
    /* portrait, framed in the lane colour; opponents without a leader (most of them) just show their name */
    const face = !!lead && PORTRAIT.ids.includes(lead);
    if (face) {
      const frame = new Graphics()
        .roundRect(px, -P / 2, P, P, 6)
        .fill(0x0b0d0f)
        .roundRect(px, -P / 2, P, P, 6)
        .stroke({ width: 2, color: L.edge });
      const img = await sharpSprite(() => svgTex('head:' + lead, PORTRAIT.head(lead), P - 4, P - 4), P - 4, P - 4);
      if (gen !== generation) {
        img.destroy();
        return;
      }
      img.position.set(px + 2, -P / 2 + 2);
      const m = new Graphics().roundRect(px + 2, -P / 2 + 2, P - 4, P - 4, 4).fill(0xffffff);
      img.mask = m;
      h.box.addChild(frame, img, m);
    }
    const name = label(12, 0xb8b0a0, 3);
    name.text = (lead ? W.LEADERS[lead].name : side === 0 ? 'Your warband' : foeName).toUpperCase();
    const tx = face ? dir * (P + 8) : 0;
    name.anchor.set(side === 0 ? 0 : 1, 0.5);
    name.position.set(tx, -8);
    h.t.anchor.set(side === 0 ? 0 : 1, 0.5);
    h.t.position.set(tx, 9);
    h.baseX = h.t.x;
    h.box.addChild(name, h.t);
    /* relic seals, further from the corner */
    let x = tx + dir * (Math.max(name.width, 90) + 14 + 11);
    for (const r of Object.keys(B.rel[side])) {
      const seal = new Container();
      seal.position.set(x, 0);
      seal.addChild(
        new Graphics()
          .circle(0, 0, 11)
          .fill(0x2a2218)
          .circle(0, 0, 11)
          .stroke({ width: 2, color: 0xe0b040 })
          .circle(0, 0, 8)
          .stroke({ width: 1, color: 0xe0b040, alpha: 0.4 }),
      );
      const ch = new Text({
        text: monogram(W.RELICS[r].name),
        style: { fontFamily: 'Grenze Gotisch, serif', fontWeight: '600', fontSize: 14, fill: 0xffd27a },
      });
      ch.anchor.set(0.5);
      ch.y = 1;
      seal.addChild(ch);
      h.box.addChild(seal);
      x += dir * 26;
    }
  }
}
const clock = label(14, 0xb8b0a0, 3);
clock.position.set(WIDTH / 2, HEIGHT / 2);
clock.anchor.set(0.5);
const banner = label(54, 0xffffff);
banner.anchor.set(0.5);
banner.position.set(WIDTH / 2, HEIGHT / 2);
hud.addChild(clock, banner);

function paintHud(B: Battle, dt = 0) {
  for (const s of [0, 1]) {
    const k = Math.max(0, Math.min(1, B.hero[s].hp / B.hero[s].max)),
      h = heroes[s],
      L = LANE[s];
    h.trail = Math.max(k, h.trail - dt * 0.35);
    /* the lit part hugs its own leader's side: yours the left, the enemy's the right */
    const lit = s === 0 ? [0, WIDTH * k] : [WIDTH * (1 - k), WIDTH],
      trail = s === 0 ? [WIDTH * k, WIDTH * h.trail] : [WIDTH * (1 - h.trail), WIDTH * (1 - k)],
      edge = s === 0 ? WIDTH * k : WIDTH * (1 - k);
    h.hp
      .clear()
      .rect(lit[0], 0, lit[1] - lit[0], HEIGHT)
      .fill({ color: L.fill, alpha: 0.85 });
    if (h.trail > k) h.hp.rect(trail[0], 0, trail[1] - trail[0], HEIGHT).fill({ color: L.edge, alpha: 0.35 });
    if (k > 0 && k < 1) h.hp.rect(edge - 1.5, 0, 3, HEIGHT).fill({ color: L.edge, alpha: 0.9 });
    h.t.text = `${Math.max(0, Math.round(B.hero[s].hp))} / ${B.hero[s].max}`;
  }
  /* the playback speed shows beside the timer, so it reads without looking up at the buttons */
  clock.text =
    (B.sudden ? 'Sudden death · ' : '') + Math.floor(B.time) + 's' + (S.speed !== 1 ? `  ▶ ${S.speed}×` : '');
}

/* ---- events -> animation ---- */
const hitDelay = new Map<number, number>();

function projectile(from: { x: number; y: number }, to: { x: number; y: number }, color: number, dur: number) {
  const g = new Graphics().circle(0, 0, 9).fill({ color, alpha: 0.25 }).circle(0, 0, 4.5).fill(0xffffff);
  fxLayer.addChild(g);
  const lift = -60 - Math.abs(to.x - from.x) * 0.15;
  tween(
    dur,
    (k) => {
      g.position.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k + lift * 4 * k * (1 - k));
      if (Math.random() < 0.7) {
        const tr = new Graphics().circle(0, 0, 2.5).fill({ color, alpha: 0.8 });
        tr.position.copyFrom(g.position);
        addParticle(tr, { vx: 0, vy: 0, life: 0.25, grav: 0, spin: 0, shrink: true });
      }
    },
    () => g.destroy(),
  );
}

function onEvent(B: Battle, e: BattleEvent) {
  const v = e.b != null ? views.get(e.b) : undefined;
  if (e.t === 'atk' && v) {
    const ranged = v.u.d.tribes.some((t) => RANGED.includes(t)) || !!v.u.d.reach;
    const from = center(v.u),
      dir = v.u.side === 0 ? -1 : 1;
    const targets = (e.to || []).map((id) => views.get(id)).filter((x): x is View => !!x);
    const first = targets[0];
    const tx = first ? center(first.u).x - from.x : 0;
    if (ranged) {
      const dur = 0.24;
      for (const t of targets) {
        projectile(from, center(t.u), FACTION[v.u.d.f] ?? 0xffffff, dur);
        hitDelay.set(t.u.bid, dur);
      }
      if (e.hero) projectile(from, heroPos(1 - v.u.side), 0xffffff, dur);
      if (e.hero) {
        notable = v.u.bid;
        notableWhy = 'Last to strike a hero';
      }
      tween(0.2, (k) => (v.lunge.y = -dir * 8 * Math.sin(k * Math.PI))); // recoil
    } else {
      for (const t of targets) hitDelay.set(t.u.bid, 0.09);
      const reach = e.hero ? 46 : 34;
      tween(
        0.3,
        (k) => {
          const s = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7;
          const ease = s * s * (3 - 2 * s);
          v.lunge.y = dir * reach * ease;
          v.lunge.x = tx * 0.12 * ease;
        },
        () => (v.lunge.x = v.lunge.y = 0),
      );
    }
  } else if (e.t === 'hit' && v) {
    const delay = hitDelay.get(v.u.bid) || 0;
    const big = e.crit;
    tween(
      0.22,
      (k) => {
        v.flash.alpha = 0.75 * (1 - k);
        const dir = v.u.side === 0 ? 1 : -1;
        v.kick.y = dir * (big ? 12 : 6) * Math.sin(k * Math.PI);
      },
      undefined,
      delay,
    );
    if (e.v! >= 1)
      tween(
        0.001,
        () => {},
        () => {
          const c = center(v.u);
          floatText(
            c.x,
            c.y - 30,
            (e.flank ? 'Flank ' : '') + '-' + Math.round(e.v!),
            big ? 0xffc83a : e.flank ? 0xff8a4a : 0xffffff,
            big ? 34 : 22,
          );
          sparks(c.x, c.y, big ? 0xffc83a : 0xffffff, big ? 14 : 5, big ? 320 : 180);
          addDamage(v, e.v!);
          if (big) shake(7);
        },
        delay,
      );
  } else if (e.t === 'heal' && v && e.v! >= 1) {
    const c = center(v.u);
    floatText(c.x, c.y - 30, '+' + Math.round(e.v!), 0x7fe08a);
    sparks(c.x, c.y + 20, 0x7fe08a, 8, 40, 70);
  } else if (e.t === 'buff' && v) {
    const c = center(v.u);
    floatText(c.x, c.y - 40, `+${Math.round(e.a!)}/+${Math.round(e.h!)}`, 0x9fe0ff, 18);
    tween(0.35, (k) => v.body.scale.set(1 + 0.12 * Math.sin(k * Math.PI)));
  } else if (e.t === 'revive' && v) {
    const c = center(v.u);
    floatText(c.x, c.y - 30, 'Rises', 0xd8c8ff, 26);
    sparks(c.x, c.y, 0xd8c8ff, 24, 260);
    tween(0.5, (k) => (v.root.alpha = k));
  } else if (e.t === 'rot' && v) {
    const c = center(v.u);
    sparks(c.x, c.y - 20, 0x8ad04a, 6, 60);
  } else if (e.t === 'smite' && v) {
    const c = center(v.u),
      g = new Graphics();
    const pts = [c.x, -20];
    for (let y = 40; y < c.y; y += 40) pts.push(c.x + (Math.random() - 0.5) * 30, y);
    pts.push(c.x, c.y);
    g.poly(pts, false).stroke({ width: 4, color: 0xfff6c0 });
    fxLayer.addChild(g);
    tween(
      0.3,
      (k) => (g.alpha = 1 - k),
      () => g.destroy(),
    );
    sparks(c.x, c.y, 0xfff6c0, 16, 260);
    shake(4);
  } else if (e.t === 'die' && v) {
    views.delete(v.u.bid);
    const delay = (hitDelay.get(v.u.bid) || 0) + 0.05,
      c = center(v.u),
      color = FACTION[v.u.d.f] ?? 0x888888;
    tween(
      0.001,
      () => {},
      () => {
        for (let i = 0; i < 14; i++) {
          const s = 5 + Math.random() * 9,
            g = new Graphics().poly([0, -s, s * 0.8, s * 0.6, -s * 0.8, s * 0.6]).fill(i % 3 ? color : 0xd8d0c0);
          g.position.set(c.x + (Math.random() - 0.5) * v.w, c.y + (Math.random() - 0.5) * CARD_H);
          addParticle(g, {
            vx: (Math.random() - 0.5) * 360,
            vy: -120 - Math.random() * 240,
            life: 0.8,
            grav: 900,
            spin: (Math.random() - 0.5) * 14,
          });
        }
        tween(
          0.3,
          (k) => {
            v.root.alpha = 1 - k;
            v.root.scale.set(1 - 0.3 * k);
          },
          () => v.root.destroy({ children: true }),
        );
      },
      delay,
    );
  } else if (e.t === 'hero' && e.side != null) {
    /* the hero's lane flashes and its health number jolts */
    const h = heroes[e.side],
      x0 = h.baseX;
    tween(
      0.3,
      (k) => {
        h.flash.alpha = 0.18 * (1 - k);
        h.t.x = x0 + Math.sin(k * 40) * 4 * (1 - k);
        h.t.scale.set(1 + 0.25 * (1 - k));
      },
      () => {
        h.t.x = x0;
        h.t.scale.set(1);
      },
      0.2,
    );
  } else if (e.t === 'summon') {
    const u = B.units.find((x) => x.bid === e.b);
    if (u && u.alive && !views.has(u.bid)) void makeView(B, u, true);
  }
}

/* ---- loop ---- */
let B: Battle | null = null,
  endT = 0,
  /* seconds since the battle ended: the result banner shows briefly before the summary screen */
  overFor = 0,
  onEnd: (() => void) | null = null;

/* lanes: each side's row sits on a band in its own colour, so the frames are free to show rarity */
const LANE = [
  { fill: 0x1c3358, edge: 0x4f7fc0 },
  { fill: 0x4a1a24, edge: 0xb0485a },
];
function drawFloor(open: boolean[][]) {
  floor.clear();
  laneBg.clear();
  /* the boundary between the two sides, with a soft glow */
  floor.poly(BORDER, false).stroke({ width: 8, color: 0xffffff, alpha: 0.06 });
  floor.poly(BORDER, false).stroke({ width: 2, color: 0xe8e2d0, alpha: 0.55 });
  for (const side of [0, 1]) {
    const L = LANE[side],
      top = laneTop(side);
    /* the drained part of the region: what shows once the hero's health has gone */
    laneBg.poly(region(side)).fill({ color: mix(L.fill, 0x000000, 0.65), alpha: 0.9 });
    /* the outer edge of the field on this side */
    floor.rect(0, side === 1 ? top : top + LANE_H - 2, WIDTH, 2).fill({ color: L.edge, alpha: 0.7 });
    for (let i = 0; i < 10; i++) {
      const x = LEFT + i * SLOT + GAP / 2,
        y = ROW_Y[side] - CARD_H / 2,
        w = SLOT - GAP;
      if (open[side][i]) {
        floor.roundRect(x, y, w, CARD_H, 7).stroke({ width: 1, color: L.edge, alpha: 0.35 });
        continue;
      }
      /* a locked slot: a card-shaped silhouette with a padlock */
      const cx = x + w / 2,
        cy = ROW_Y[side];
      floor
        .roundRect(x, y, w, CARD_H, 7)
        .fill({ color: 0x000000, alpha: 0.3 })
        .roundRect(x + 4, y + 4, w - 8, CARD_H - 8, 5)
        .stroke({ width: 1.5, color: L.edge, alpha: 0.4 })
        .moveTo(cx - 6, cy - 4) // start the shackle on its own, or Pixi joins it to the last shape
        .arc(cx, cy - 4, 6, Math.PI, 0)
        .stroke({ width: 2.5, color: L.edge, alpha: 0.75 })
        .roundRect(cx - 9, cy - 4, 18, 14, 3)
        .fill({ color: L.edge, alpha: 0.75 })
        .circle(cx, cy + 2, 2)
        .fill({ color: L.fill });
    }
  }
}

/* set the field up for a battle; it may already be under way if the player switched views mid-fight. False when
   a later setUp or a stop overtook this one while the art loaded. */
async function setUp(b: Battle, foeName: string): Promise<boolean> {
  const gen = ++generation;
  unitLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
  fxLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
  tweens = [];
  particles = [];
  views = new Map();
  hitDelay.clear();
  banner.text = '';
  endT = 0;
  overFor = 0;
  B = null;
  const specs = (side: number) => b.units.filter((u) => u.side === side).map((u) => u.o);
  setSides(b, [W.synergy(specs(0)).cnt, W.synergy(specs(1)).cnt], ['Your warband', foeName]);
  /* until something happens, the inspector shows your costliest unit */
  const best = b.units.filter((x) => x.side === 0 && x.alive).sort((x, y) => (y.d.cost || 0) - (x.d.cost || 0))[0];
  notable = best ? best.bid : null;
  notableWhy = 'Your strongest unit';
  hovered = null;
  dockT = 0;
  await buildHeroes(b, foeName);
  if (gen !== generation) return false;
  for (const s of [0, 1]) heroes[s].trail = Math.max(0, b.hero[s].hp / b.hero[s].max);
  drawFloor(b.open);
  await Promise.all(b.units.filter((u) => u.alive).map((u) => makeView(b, u, false)));
  if (gen !== generation) return false;
  b.ev.length = 0;
  paintHud(b);
  return true;
}

/* Pixi asks for the next frame only after this one returns, so one error would freeze the battle for good.
   Report it once and keep going. */
let reported = false;
function report(e: unknown) {
  if (reported) return;
  reported = true;
  console.error('Battle view error', e);
}
function tick(tk: Ticker) {
  try {
    frame(tk);
  } catch (e) {
    report(e);
  }
}
function frame(tk: Ticker) {
  const real = Math.min(0.1, tk.deltaMS / 1000),
    dt = real * S.speed;
  if (B && !B.over) {
    let acc = dt;
    while (acc > 1e-6 && !B.over) {
      const d = Math.min(0.05, acc);
      W.step(B, d);
      acc -= d;
    }
    hitDelay.clear();
    for (const e of B.ev.splice(0))
      try {
        onEvent(B, e);
      } catch (err) {
        report(err);
      }
  }
  if (B) {
    for (const v of views.values()) {
      if (!v.u.alive) continue;
      paintView(B, v);
      if (v.dmg.life > 0) {
        v.dmg.life -= dt;
        v.dmg.c.alpha = Math.min(1, v.dmg.life * 4);
        if (v.dmg.life <= 0) v.dmg.c.visible = false;
      }
      const bob = Math.sin(B.time * 3 + v.phase) * 2;
      v.body.position.set(v.lunge.x + v.kick.x, v.lunge.y + v.kick.y + bob);
      const c = center(v.u);
      if (v.u.burnT > 0 && Math.random() < dt * 14) {
        const g = new Graphics().circle(0, 0, 2 + Math.random() * 2).fill(Math.random() < 0.5 ? 0xff8a3a : 0xffd04a);
        g.position.set(c.x + (Math.random() - 0.5) * v.w * 0.8, c.y + 30);
        addParticle(g, { vx: (Math.random() - 0.5) * 20, vy: -60, life: 0.7, grav: -30, spin: 0, shrink: true });
      }
      if (v.u.rot > 0 && Math.random() < dt * 6) {
        const g = new Graphics().ellipse(0, 0, 2.5, 4).fill(0x8ad04a);
        g.position.set(c.x + (Math.random() - 0.5) * v.w * 0.7, c.y + 20);
        addParticle(g, { vx: 0, vy: 30, life: 0.7, grav: 200, spin: 0, shrink: true });
      }
    }
    paintHud(B, dt);
    /* refresh the inspector about ten times a second */
    dockT -= real;
    if (dockT <= 0) {
      dockT = 0.1;
      const id = hovered ?? notable,
        u = id == null ? null : B.units.find((x) => x.bid === id) || null;
      inspect(u, hovered != null ? 'Pointing at' : notableWhy);
    }
    vignette.clear();
    if (B.sudden) {
      const a = 0.25 + 0.15 * Math.sin(performance.now() / 250);
      for (let i = 0; i < 6; i++)
        vignette
          .rect(i * 6, i * 6, WIDTH - i * 12, HEIGHT - i * 12)
          .stroke({ width: 6, color: 0xc02020, alpha: a / (i + 1) });
    }
    if (B.over && !endT) {
      endT = 1;
      banner.text = B.winner === 0 ? 'Victory' : B.winner === 1 ? 'Defeat' : 'Draw';
      banner.style.fill = B.winner === 0 ? 0xffd27a : B.winner === 1 ? 0xd9534f : 0xe8e2d0;
      banner.scale.set(0);
      tween(0.5, (k) => banner.scale.set(1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2)), undefined, 0.6);
    }
    /* let the last blows and the banner land, then hand over to the summary screen */
    if (B.over) {
      overFor += real;
      if (overFor > 1.4 && onEnd) {
        const done = onEnd;
        onEnd = null;
        done();
        return;
      }
    }
  }
  /* tweens run on game time so 4x speeds up the effects too */
  for (const t of tweens.slice()) {
    if (t.delay > 0) {
      t.delay -= dt;
      continue;
    }
    t.t += dt;
    const k = Math.min(1, t.t / t.dur);
    t.fn(k);
    if (k >= 1) {
      tweens.splice(tweens.indexOf(t), 1);
      t.end?.();
    }
  }
  for (const p of particles.slice()) {
    p.life -= dt;
    if (p.life <= 0 || p.g.destroyed) {
      particles.splice(particles.indexOf(p), 1);
      if (!p.g.destroyed) p.g.destroy();
      continue;
    }
    p.vy += p.grav * dt;
    p.g.x += p.vx * dt;
    p.g.y += p.vy * dt;
    p.g.rotation += p.spin * dt;
    const k = p.life / p.max;
    p.g.alpha = Math.min(1, k * 2);
    if (p.shrink) p.g.scale.set(k);
  }
  if (shakeT > 0) {
    shakeT -= real;
    world.position.set((Math.random() - 0.5) * shakeAmp * 2, (Math.random() - 0.5) * shakeAmp * 2);
    if (shakeT <= 0) {
      shakeAmp = 0;
      world.position.set(0, 0);
    }
  }
}

/* ---- the screen's API ---- */

/** Show battle B in `stage`, with its dock in `dock`, and call `end` once the fight is over and the result has
 *  shown. Resolves false when Pixi can't run here, so the caller can fall back to the classic screen. */
export async function mountPixiBattle(
  stage: HTMLElement,
  dock: HTMLElement,
  b: Battle,
  foeName: string,
  end: () => void,
): Promise<boolean> {
  const a = await ensureApp();
  if (!a) return false;
  /* the player may have skipped or left while Pixi was starting */
  const current = () => S.B === b && S.screen === 'battle' && !S.result && stage.isConnected;
  if (!current()) return true;
  stageEl = stage;
  stage.appendChild(a.canvas);
  initDock(dock);
  fit();
  if (!(await setUp(b, foeName)) || !current()) return true;
  B = b;
  onEnd = end;
  a.ticker.start();
  return true;
}

/** Stop animating and stepping the battle (on skip, quit, or leaving the screen). */
export function stopPixiBattle(): void {
  onEnd = null;
  B = null;
  hovered = null;
  generation++;
  if (app) app.ticker.stop();
}
