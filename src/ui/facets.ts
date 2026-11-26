/* The faceted drawing kit shared by leader portraits and card art: flat polygons lit from the viewer's left.
   Read ART.md before drawing with it. */
export type Num = number | string;

export const ch = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const sh = (h: string, f: number): string =>
  '#' +
  ch(h)
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v * f)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
export const P = (pts: string, fill: string, o?: number) =>
  `<polygon points="${pts}" fill="${fill}"${o != null ? ` opacity="${o}"` : ''}/>`;
export const C = (cx: Num, cy: Num, r: Num, fill: string, o?: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${o != null ? ` opacity="${o}"` : ''}/>`;
export const L = (pts: string, stroke: string, w: number, o?: number) =>
  `<polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o != null ? ` opacity="${o}"` : ''}/>`;
export const mx = (pts: string) =>
  pts
    .split(' ')
    .map((p) => {
      const [x, y] = p.split(',');
      return 100 - +x + ',' + y;
    })
    .join(' ');
export const glow = (cx: number, cy: number, r: number, c: string) =>
  C(cx, cy, r * 2.4, c, 0.1) +
  C(cx, cy, r * 1.6, c, 0.22) +
  C(cx, cy, r, c, 0.95) +
  C(cx - r * 0.3, cy - r * 0.3, r * 0.35, '#fff', 0.8);

export const HORNS = (s: string) => `<g transform="translate(-5,1)">${s}</g>`;
export const HD = (s: string) => `<g transform="translate(-10,-6) scale(1.2)">${s}</g>`; // bigger head, set lower so the neck is short
export const bg = (dark: string, light: string, motif?: string) =>
  P('0,0 100,0 100,120 0,120', dark) +
  P('0,0 70,0 0,76', light) +
  P('100,40 100,120 30,120', sh(dark, 0.82), 0.7) +
  (motif || '');

/* the base head: ten facets and no drawn features */
export function face(skin: string, o?: { ears?: 'elf' | 'none' }): string {
  o = o || {};
  const lit = skin,
    hi = sh(skin, 1.08),
    mid = sh(skin, 0.9),
    shd = sh(skin, 0.76),
    deep = sh(skin, 0.6),
    sock = sh(skin, 0.64);
  let s = '';
  if (o.ears === 'elf')
    s +=
      P('34,46 20,27 27,44 34,56', lit) +
      P('27,44 20,27 30,40', hi) +
      P('67,46 82,29 75,45 66,56', shd) +
      P('75,45 82,29 71,42', deep);
  else if (o.ears !== 'none') s += P('33,46 29,48 30,56 34,58', mid) + P('67,46 71,48 70,56 66,58', deep);
  s +=
    P('33,38 40,27 52,24 54,40 40,42', hi) + // forehead, lit
    P('52,24 63,28 68,40 60,42 54,40', mid) + // forehead, turning away
    P('33,38 40,42 36,43 37,48 33,54', lit) + // temple
    P('36,43 47,42 46,47 37,48', sock) + // eye socket, near
    P('53,42 64,43 63,48 54,47', deep) + // eye socket, far
    P('37,48 46,47 46,55 40,60 33,54', lit) + // cheek, lit
    P('54,47 63,48 68,40 67,52 62,64 56,60 54,55', shd) + // cheek, shadow
    P('47,42 50,42 49,55 46,55', hi) + // nose bridge
    P('50,42 53,42 54,55 50,57 49,55', mid) + // nose side
    P('46,55 50,57 54,55 51,59 47,58', deep) + // under the nose
    P('40,60 46,55 47,58 51,59 54,55 56,60 51,65', mid) + // muzzle plane
    P('33,54 40,60 51,65 51,72 40,66', lit) + // jaw, lit
    P('56,60 62,64 51,72 51,65', shd) + // jaw, shadow
    P('40,66 51,72 46,71', deep, 0.5); // chin underside
  return s;
}
export const neck = (skin: string) =>
  P('43,66 58,64 60,86 42,86', sh(skin, 0.86)) +
  P('43,66 58,64 52,76', sh(skin, 0.58)) +
  P('52,76 58,64 60,86', sh(skin, 0.7));
export const torso = (c: string) =>
  P('0,120 4,98 26,84 44,80 50,96 50,120', c) +
  P('50,120 50,96 56,80 74,84 96,98 100,120', sh(c, 0.72)) +
  P('4,98 26,84 22,106', sh(c, 1.14)) +
  P('74,84 96,98 80,108', sh(c, 0.58)) +
  P('44,80 56,80 54,120 46,120', sh(c, 0.86));
export const pauldronL = (c: string) =>
  P('0,106 2,90 16,79 33,81 35,96 20,107', c) +
  P('2,90 16,79 33,81 18,86', sh(c, 1.25)) +
  P('0,116 0,106 20,107 35,96 37,109 22,118', sh(c, 0.8)) +
  L('0,106 20,107 35,96', sh(c, 1.35), 0.8, 0.8) +
  C(27, 90, 1.3, sh(c, 1.4));
export const pauldronR = (c: string) =>
  P(mx('0,106 2,90 16,79 33,81 35,96 20,107'), sh(c, 0.7)) +
  P(mx('2,90 16,79 33,81 18,86'), sh(c, 0.9)) +
  P(mx('0,116 0,106 20,107 35,96 37,109 22,118'), sh(c, 0.52)) +
  L(mx('0,106 20,107 35,96'), sh(c, 0.95), 0.8, 0.7) +
  C(73, 90, 1.3, sh(c, 1));
export const cloak = (c: string) =>
  P('0,120 0,96 20,76 80,76 100,96 100,120', sh(c, 0.7)) +
  P('0,96 20,76 30,80 6,104', c) +
  P('80,76 100,96 94,104 70,80', sh(c, 0.5));
export function hood(c: string): { back: string; front: string } {
  return {
    back:
      P('23,48 29,20 50,9 71,18 79,46 77,72 67,84 33,84 23,72', c) +
      P('23,48 29,20 36,24 30,44 32,66 23,72', sh(c, 1.22)) +
      P('71,18 79,46 77,72 68,66 70,44 64,23', sh(c, 0.62)) +
      P('30,44 36,24 50,17 64,23 70,44 68,66 60,74 40,74 32,66', sh(c, 0.34)),
    front:
      P('30,44 36,24 50,17 64,23 70,44 62,35 50,30 38,35', sh(c, 0.82)) +
      P('30,44 36,24 50,17 50,30 38,35', sh(c, 1.05)) +
      P('33,38 40,27 52,24 63,28 68,40 67,50 33,50', '#06080a', 0.5),
  };
}
export const shortHair = (c: string) =>
  P('32,42 33,27 45,18 60,18 70,27 71,43 66,33 54,27 42,29 35,37', c) +
  P('33,27 45,18 54,27 42,29 35,37', sh(c, 1.3)) +
  P('60,18 70,27 71,43 66,33', sh(c, 0.66)) +
  P('45,18 60,18 66,33 54,27', sh(c, 0.95));
