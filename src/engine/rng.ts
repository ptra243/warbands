/* Every random draw the engine makes goes through here, so a seeded source can make runs reproducible. */
let source: () => number = () => Math.random();
export const random = (): number => source();
/** swaps in a new source and hands back the old one */
export const setRandom = (fn: () => number): (() => number) => {
  const old = source;
  source = fn;
  return old;
};
export const rnd = <T>(a: readonly T[]): T => a[Math.floor(random() * a.length)];
/** a small seeded generator (mulberry32), for draws that must come out the same every time */
export const seeded = (seed: number): (() => number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
