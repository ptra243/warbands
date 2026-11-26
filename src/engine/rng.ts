/* Every random draw the engine makes goes through here, so a seeded source can make runs reproducible. */
let source: () => number = () => Math.random();
export const random = (): number => source();
export const setRandom = (fn: () => number): void => {
  source = fn;
};
export const rnd = <T>(a: readonly T[]): T => a[Math.floor(random() * a.length)];
