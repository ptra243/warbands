import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as W from '../src/engine/index.ts';

/* state.ts looks up the page's root element on import; the header needs none of it */
vi.mock('../src/ui/state.ts', () => ({ S: {}, root: null }));
const { vsHTML } = await import('../src/ui/html.ts');

/** the header's text, tags removed */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
/** the header for a run about to fight the given enemy */
function header(enemy: W.Enemy, post = false): string {
  const run = W.newRun('H', null);
  run.enemy = enemy;
  if (post) run.post = { n: 1, faced: [], pool: [] };
  return text(vsHTML(run.leader, W.opponent(run), 5));
}

beforeEach(() => {
  W.setRandom(W.seeded(3));
});

describe('the battle header', () => {
  it('names an untitled foe by its faction only', () => {
    expect(header({ faction: 'E', units: [], open: 4 })).toBe('Round 5 Your warband against Elves');
  });

  it('adds the faction after a titled foe from a player faction', () => {
    expect(header({ faction: 'U', units: [], open: 4, title: 'The Plague Host' })).toBe(
      'Round 5 Your warband against The Plague Host (Undead)',
    );
  });

  it('shows a boss by its title alone, with no monster faction', () => {
    const boss = W.genBoss(5);
    expect(boss.faction).toBe('N');
    expect(header(boss)).toBe(`Round 5 Your warband against ${boss.title}`);
  });

  it('shows a camp by name under a Camp heading', () => {
    const run = W.newRun('E', null);
    run.camp = Object.assign(W.genCamp(5, 6, false), {
      type: 'camp' as const,
      hard: false,
      reward: { gold: 3 },
    });
    expect(text(vsHTML(null, W.opponent(run), 5))).toBe(`Camp Your warband against ${run.camp.name}`);
  });

  it('adds the strength bonus and faction for a post-game foe', () => {
    expect(header({ faction: 'H', units: [], open: 9, title: 'Your past warband', mul: 1.3 }, true)).toBe(
      'Round 5 Your warband against Your past warband · +30% health and attack (Humans)',
    );
  });

  it("names the player's leader", () => {
    const run = W.newRun('U', 'gravecaller');
    expect(text(vsHTML(run.leader, W.opponent(run), 1))).toMatch(
      new RegExp(`^Round 1 ${W.LEADERS.gravecaller.name} against `),
    );
  });
});
