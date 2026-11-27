/* node tools/stats.ts [runs per faction = 200] [H|E|U]
   The bot plays N runs per faction and the battle stats are added up per unit: what each unit deals, how (attacks,
   crits, splash, abilities, thorns, Rot, burn), how much is wasted on overkill, shields and overhealing, and how often
   its side wins. Only your side's units count; the enemy boards are generated. Compare before and after a change. */
import * as W from '../src/engine/index.ts';
import { bot, fight, leadersOf } from './lib/bot.ts';

const N = +process.argv[2] || 200;
const only = process.argv[3] as W.PlayerFaction | undefined;
const KINDS: W.HitKind[] = ['attack', 'crit', 'splash', 'reach', 'smite', 'ability', 'thorns', 'rot', 'burn'];

interface Agg {
  fights: number;
  wins: number;
  gold: number;
  dmg: Partial<Record<W.HitKind, number>>;
  hero: number;
  rout: number;
  flank: number;
  shielded: number;
  overkill: number;
  kills: number;
  took: number;
  blocked: number;
  heal: number;
  overheal: number;
  regen: number;
  lived: number;
}
const agg = (): Agg => ({
  fights: 0,
  wins: 0,
  gold: 0,
  dmg: {},
  hero: 0,
  rout: 0,
  flank: 0,
  shielded: 0,
  overkill: 0,
  kills: 0,
  took: 0,
  blocked: 0,
  heal: 0,
  overheal: 0,
  regen: 0,
  lived: 0,
});
function add(a: Agg, u: W.UnitStats, won: boolean) {
  const t = u.t;
  a.fights++;
  if (won) a.wins++;
  /* what the unit cost: three copies make the next tier */
  if (!u.summoned) a.gold += W.U[u.id].cost * 3 ** (u.tier - 1);
  for (const k of KINDS) if (t.dmg[k]) a.dmg[k] = (a.dmg[k] || 0) + t.dmg[k]!;
  a.hero += W.sumKinds(t.hero);
  a.rout += t.rout;
  a.flank += t.flank;
  a.shielded += t.shielded;
  a.overkill += t.overkill;
  a.kills += t.kills;
  a.took += W.sumKinds(t.took);
  a.blocked += t.blocked;
  a.heal += t.heal;
  a.overheal += t.overheal;
  a.regen += t.regen;
  if (u.alive) a.lived++;
}

const pct = (x: number, of: number) => (of > 0 ? Math.round((x / of) * 100) + '%' : '–');
const per = (x: number, n: number) => (n > 0 ? Math.round(x / n) : 0);
const cols: [string, number][] = [
  ['unit', 22],
  ['fights', 7],
  ['win', 5],
  ['dmg', 6],
  ['hero', 5],
  ['/gold', 6],
  ['kills', 6],
  ['ovkill', 7],
  ['atk', 5],
  ['crit', 5],
  ['splsh', 6],
  ['abil', 5],
  ['thorn', 6],
  ['rot', 5],
  ['burn', 5],
  ['flank', 6],
  ['shld', 5],
  ['rout', 5],
  ['heal', 5],
  ['ovheal', 7],
  ['blockd', 7],
  ['lived', 6],
];
const line = (cells: (string | number)[]) =>
  cells.map((c, i) => (i ? String(c).padStart(cols[i][1]) : String(c).padEnd(cols[i][1]))).join('');

for (const f of ['H', 'E', 'U'] as const) {
  if (only && only !== f) continue;
  const units: Record<string, Agg> = {},
    side = agg();
  let fights = 0,
    sudden = 0,
    heroLost = 0;
  for (let i = 0; i < N; i++) {
    const run = W.newRun(f, leadersOf(f)[i % 3]);
    while (W.phase(run) !== 'over' && run.round < 40) {
      if (W.phase(run) === 'encounter') {
        const cs = run.offer!.cards;
        /* take a relic, else an event, so the run stays on the shop-and-fight path */
        let k = cs.findIndex((c) => c.type === 'relic');
        if (k < 0) k = cs.findIndex((c) => c.type === 'event');
        W.chooseOffer(run, Math.max(0, k));
        if (W.phase(run) === 'camp') W.finishCamp(run, fight(W.startCamp(run)));
      }
      bot(run, true);
      const B = fight(W.startBattle(run));
      const S = W.battleStats(B),
        won = B.winner === 0;
      fights++;
      sudden += S.sudden[0];
      heroLost += B.hero[0].max - Math.max(0, B.hero[0].hp);
      for (const u of S.units) {
        if (u.side !== 'you') continue;
        const key = W.U[u.id].name + (u.summoned ? ' (summon)' : '');
        add((units[key] = units[key] || agg()), u, won);
        add(side, u, won);
      }
      W.finishBattle(run, B);
    }
  }
  const total = (a: Agg) => KINDS.reduce((s, k) => s + (a.dmg[k] || 0), 0);
  const row = (name: string, a: Agg) => {
    const d = total(a),
      k = (x: W.HitKind) => pct(a.dmg[x] || 0, d);
    return line([
      name,
      a.fights,
      pct(a.wins, a.fights),
      per(d, a.fights),
      per(a.hero, a.fights),
      a.gold ? ((d + a.hero) / a.gold).toFixed(1) : '–',
      (a.kills / a.fights).toFixed(2),
      pct(a.overkill, d),
      k('attack'),
      k('crit'),
      pct((a.dmg.splash || 0) + (a.dmg.reach || 0), d),
      pct((a.dmg.ability || 0) + (a.dmg.smite || 0), d),
      k('thorns'),
      k('rot'),
      k('burn'),
      pct(a.flank, d),
      pct(a.shielded, d),
      pct(a.rout, a.hero),
      per(a.heal + a.regen, a.fights),
      pct(a.overheal, a.heal + a.overheal),
      pct(a.blocked, a.took),
      pct(a.lived, a.fights),
    ]);
  };
  console.log(`\n${W.FACTIONS[f].name}: ${N} runs, ${fights} fights`);
  console.log(line(cols.map((c) => c[0])));
  Object.entries(units)
    .sort((p, q) => total(q[1]) + q[1].hero - total(p[1]) - p[1].hero)
    .forEach(([name, a]) => console.log(row(name, a)));
  console.log(row('(whole side)', side));
  console.log(`  of the damage your hero took, sudden death dealt ${pct(sudden, heroLost)}`);
}
console.log(`
dmg, hero: average damage per fight to enemy units, and to the enemy hero
/gold: damage (units + hero) per gold the unit cost, per fight it played; summons cost nothing
ovkill: damage past what was needed to kill, as a share of dmg
atk..burn: where dmg came from (splsh includes reach, abil includes smite)
flank: share of dmg that was the flanking bonus; shld: share that enemy shields absorbed
rout: share of hero damage that was the triple damage on a hero with no units left
heal: healing done plus own regeneration per fight; ovheal: healing wasted on full health
blockd: share of damage taken that the unit's own shield absorbed; lived: fights it survived`);
