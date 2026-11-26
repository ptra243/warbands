/* Board size, shop odds, run limits and the rules version. */
export const SLOTS = 10,
  BENCH = 6,
  SUDDEN = 35,
  MAXWINS = 10,
  LIVES = 5;
export const ODDS: number[][] = [
  [80, 20, 0, 0, 0],
  [70, 27, 3, 0, 0],
  [55, 33, 12, 0, 0],
  [42, 33, 20, 5, 0],
  [33, 32, 25, 9, 1],
  [24, 30, 30, 13, 3],
  [17, 25, 33, 20, 5],
  [14, 20, 30, 28, 8],
  [10, 15, 27, 33, 15],
];
export const XPNEED = [2, 2, 4, 6, 10, 14, 24, 36];
export const ORDER = [4, 5, 3, 6, 2, 7, 1, 8, 0, 9]; // slots open from the centre outward
export const openCount = (level: number): number => Math.min(SLOTS, level + 3);
export const openArr = (n?: number | null): boolean[] => {
  const a = Array(SLOTS).fill(false);
  ORDER.slice(0, n == null ? SLOTS : n).forEach((i) => {
    a[i] = true;
  });
  return a;
};
export const LOCK = { lock: true } as const;
export type Lock = typeof LOCK;
export const r = (v: number): number => Math.round(v);
export const pct = (v: number): string => Math.round(v * 100) + '%';
/* BALANCE goes up with every rules change. Boards saved under rules older than GHOST_FROM are no longer used as post-game opponents. */
export const BALANCE = 7,
  GHOST_FROM = 1,
  POSTSTEP = 0.15;
