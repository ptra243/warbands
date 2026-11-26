// Golden behaviour fingerprint for the engine: seeded bot runs, a post-game and board-vs-board fights.
// Used to prove a refactor changes no rules. Regenerate the baseline only when rules change on purpose.
// The bot below is a frozen copy of the one in tools/: improving that bot must not move the baseline.
import { createHash } from 'node:crypto';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fingerprint(W, boards, setRandom) {
  const SMART = true;
  const own = (run, id) => run.things.filter((t) => (t.kind === 'item' ? t.id : t.item) === id).length;
  function gain(run, bu, id, u) {
    const I = W.ITEMS[id],
      s = W.stats(u),
      dps = (s.atk / s.cd) * 8;
    let g =
      (I.atk || 0) * dps +
      (I.haste || 0) * dps +
      ((I.hp || 0) * s.hp) / 6 +
      (I.splash || 0) * dps * 1.2 +
      (I.healHit || 0) * dps * 0.6;
    if (I.cls && !s.tribes.includes(I.cls)) {
      const a = W.synergy(bu).lv;
      u.item = id;
      const b = W.synergy(bu).lv;
      u.item = null;
      let up = 0;
      for (const k in b) up += (b[k] || 0) - (a[k] || 0);
      g += up * 60 + 3;
    }
    return g;
  }
  function bot(run) {
    let guard = 0;
    while (guard++ < 40) {
      let best = -1,
        bs = -1;
      run.shop.forEach((s, i) => {
        if (!s) return;
        const cost = s.kind === 'unit' ? W.U[s.id].cost : W.ITEMS[s.id].cost;
        if (cost > run.gold) return;
        if (W.priceOf(run, s) > run.gold) return;
        let sc = cost;
        if (s.kind === 'unit') {
          const n = run.things.filter((t) => t.id === s.id && t.tier === 1).length;
          sc += n * 3;
        } else if (SMART) {
          const n = own(run, s.id);
          sc += (n % 3) * 3;
          if (!W.boardUnits(run).some((u) => !u.item) && !n) sc = -1;
        }
        if (sc > bs && sc >= 0) {
          bs = sc;
          best = i;
        }
      });
      if (best >= 0) {
        const r = W.buy(run, best);
        if (!r.ok) {
          // make room: sell cheapest bench/board
          const c = run.things.filter((t) => t.kind === 'unit').sort((a, b) => W.sellValue(a) - W.sellValue(b))[0];
          const s = run.shop[best];
          if (c && s.kind === 'unit' && W.U[s.id].cost > W.U[c.id].cost && c.tier === 1) {
            W.sell(run, c);
            continue;
          }
          run.shop[best] = null;
        }
        continue;
      }
      // equip items
      if (SMART) {
        // best unit for each item: stat gain plus any class level it unlocks; spare items wait on the bench for a third copy
        const bu = W.boardUnits(run),
          loose = run.things.filter((t) => t.kind === 'item');
        let bestG = 0,
          bi = null,
          bu1 = null;
        for (const it of loose)
          for (const u of bu) {
            if (u.item) continue;
            const g = gain(run, bu, it.id, u);
            if (g > bestG) {
              bestG = g;
              bi = it;
              bu1 = u;
            }
          }
        if (bi) {
          W.equip(run, bi, bu1);
          W.mergeItems(run);
          continue;
        }
        if (loose.length > 2 || (loose.length && W.benchFree(run) < 0)) {
          W.sell(run, loose.sort((x, y) => own(run, x.id) - own(run, y.id))[0]);
          continue;
        }
      } else {
        const it = run.things.find((t) => t.kind === 'item');
        if (it) {
          const u = W.boardUnits(run).find((u) => !u.item);
          if (u) {
            W.equip(run, it, u);
            continue;
          } else {
            W.sell(run, it);
            continue;
          }
        }
      }
      // bench -> board
      const used = W.boardUnits(run).reduce((a, x) => a + W.U[x.id].size, 0);
      const bn = run.things.find(
        (t) =>
          t.kind === 'unit' &&
          t.bench != null &&
          W.boardFit(run, W.U[t.id].size) >= 0 &&
          (run.faction !== 'U' || used + W.U[t.id].size <= W.openCount(run.level) - 1),
      );
      if (bn) {
        W.moveTo(run, bn, { slot: W.boardFit(run, W.U[bn.id].size) });
        continue;
      }
      if (
        run.level < 7 &&
        run.gold >= 4 &&
        (run.gold >= 10 || run.things.some((t) => t.kind === 'unit' && t.bench != null))
      ) {
        W.buyXp(run);
        continue;
      }
      if (run.gold >= 12) {
        W.reroll(run);
        continue;
      }
      break;
    }
  }

  const fight = (B) => {
    let n = 0;
    while (!B.over && n++ < 5000) {
      W.step(B, 0.05);
      B.ev.length = 0;
    }
    if (!B.over) throw new Error('stall');
    return B;
  };
  const hash = (x) => createHash('sha1').update(JSON.stringify(x)).digest('hex').slice(0, 16);
  const clean = (log) => {
    const c = JSON.parse(JSON.stringify(log));
    delete c.ended;
    return c;
  };
  const out = { runs: [], post: [], boards: [], previews: [] };
  const ghosts = [];
  let seed = 1;
  for (const f of ['H', 'E', 'U']) {
    const leaders = Object.keys(W.LEADERS).filter((k) => W.LEADERS[k].f === f);
    for (let i = 0; i < 6; i++) {
      setRandom(mulberry32(seed++));
      const run = W.newRun(f, leaders[i % 3]);
      let enc = 0;
      const rounds = [];
      while (!run.over && run.round < 40) {
        if (run.offer) {
          const cs = run.offer.cards;
          let k = cs.findIndex((c) => c.type === 'relic');
          if (k < 0) k = enc % 3 === 0 ? 0 : cs.findIndex((c) => c.type === 'event');
          if (k < 0) k = 0;
          enc++;
          const r0 = W.chooseOffer(run, k);
          if (r0.fight) W.finishCamp(run, fight(W.startCamp(run)));
        }
        bot(run);
        const B = fight(W.startBattle(run));
        const rep = W.battleReport(B);
        const res = W.finishBattle(run, B);
        rounds.push([run.round, res.res, Math.round(B.time * 100), hash(rep)]);
      }
      const log = clean(W.exportLog(run));
      out.runs.push({
        f,
        leader: run.leader,
        over: run.over,
        wins: run.wins,
        lives: run.lives,
        gold: run.gold,
        rounds,
        log: hash(log),
      });
      if (run.over === 'won') {
        const g = W.ghostFrom(log, 'g' + seed);
        if (g) ghosts.push(g);
      }
    }
  }
  setRandom(mulberry32(999));
  out.ghostRank = W.rankGhosts ? hash(W.rankGhosts(ghosts.map((g) => ({ ...g })))) : null;
  for (let t = 0, done = 0; t < 30 && done < 3; t++) {
    setRandom(mulberry32(5000 + t));
    const f = 'HEU'[t % 3];
    const run = W.newRun(f, Object.keys(W.LEADERS).filter((k) => W.LEADERS[k].f === f)[t % 3]);
    let enc = 0;
    while (!run.over && run.round < 60) {
      if (run.offer) {
        const cs = run.offer.cards;
        let k = cs.findIndex((c) => c.type === 'relic');
        if (k < 0) k = enc % 3 === 0 ? 0 : cs.findIndex((c) => c.type === 'event');
        if (k < 0) k = 0;
        enc++;
        const r0 = W.chooseOffer(run, k);
        if (r0.fight) W.finishCamp(run, fight(W.startCamp(run)));
      }
      bot(run);
      W.finishBattle(run, fight(W.startBattle(run)));
    }
    if (run.over !== 'won') continue;
    done++;
    W.continueRun(
      run,
      ghosts.map((g) => JSON.parse(JSON.stringify(g))),
    );
    while (!run.over && run.round < 80) {
      bot(run);
      W.finishBattle(run, fight(W.startBattle(run)));
    }
    out.post.push({
      f,
      over: run.over,
      n: run.post && run.post.n,
      lives: run.lives,
      log: hash(clean(W.exportLog(run))),
    });
  }
  setRandom(mulberry32(77));
  for (let i = 0; i < boards.length; i++)
    for (let j = 0; j < boards.length; j++) {
      if (i === j) continue;
      const a = boards[i],
        b = boards[j];
      const B = W.createBattle(
        a.units.map((x) => ({ ...x })),
        b.units.map((x) => ({ ...x })),
        13,
        a.open,
        b.open,
        { leader: a.leader, relics: a.relics, foeLeader: b.leader, foeRelics: b.relics },
      );
      let n = 0;
      while (!B.over && n++ < 4000) {
        W.step(B, 0.05);
        B.ev.length = 0;
      }
      out.boards.push([i, j, B.winner, Math.round(B.time * 100), hash(W.battleReport(B))]);
    }
  return out;
}
