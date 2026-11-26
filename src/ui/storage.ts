/* Where runs and post-game boards are kept. Inside Claude the page uses the artifact's own storage and cannot reach other hosts.
 Anywhere else (GitHub Pages, a file on disk) it uses a small hosted database. The key below is the publishable one:
 it is meant to be public, and the database's own rules allow reading and adding only. */
import * as W from '../engine/index.ts';
import { setDl, setSave } from './status.ts';
import { render } from './render.ts';
import { S } from './state.ts';
import type { ClaudeDb, ClaudeDocSnapshot, ClaudeDownloads } from './claude-host.ts';

/** a row of the shared ghosts table */
interface GhostRow {
  run_key: string;
  balance: number;
  faction: W.FactionId;
  leader: string | null;
  relics: string[];
  slots: number;
  round: number | null;
  units: W.UnitSpec[];
  player?: string | null;
}

interface CloudOptions {
  method?: string;
  body?: unknown;
  prefer?: string;
}

const timeout = (ms: number, reason: unknown) => new Promise<never>((_, no) => setTimeout(() => no(reason), ms));

export const CLOUD = {
  url: 'https://tuotzykmnxmmksabdlsy.supabase.co/rest/v1/',
  key: 'sb_publishable_dTHHsosk7xWlduOS9iYvZA_WO7MDPJ1',
};
export const inClaude = (): boolean => !!(window.claude && window.claude.use);

export async function cloud(path: string, opt?: CloudOptions): Promise<unknown> {
  const o = opt || {},
    ctl = new AbortController(),
    timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const headers: Record<string, string> = {
      apikey: CLOUD.key,
      Authorization: 'Bearer ' + CLOUD.key,
      'Content-Type': 'application/json',
    };
    if (o.prefer) headers.Prefer = o.prefer;
    const r = await fetch(CLOUD.url + path, {
      method: o.method || 'GET',
      body: o.body ? JSON.stringify(o.body) : undefined,
      signal: ctl.signal,
      headers,
    });
    if (!r.ok) throw { code: 'http', status: r.status };
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  } finally {
    clearTimeout(timer);
  }
}

export function playerId(): string | null {
  try {
    let p = localStorage.getItem('wb-player');
    if (!p) {
      p = 'p-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('wb-player', p);
    }
    return p;
  } catch {
    return null;
  }
}

export const ghostRow = (g: W.Ghost, x: W.RunLog): GhostRow => ({
  run_key: g.key,
  balance: x.bal || 1,
  faction: g.faction,
  leader: g.leader,
  relics: g.relics,
  slots: g.open,
  round: g.round || null,
  player: playerId(),
  units: g.units.map((u) => {
    const o: W.UnitSpec = { id: u.id, slot: u.slot };
    if (u.tier! > 1) o.tier = u.tier;
    if (u.item) o.item = u.item;
    if (u.gAtk) o.gAtk = u.gAtk;
    if (u.gHp) o.gHp = u.gHp;
    return o;
  }),
});

export const ghostOf = (r: GhostRow): W.Ghost | null =>
  W.ghostFrom(
    {
      game: 'warband',
      outcome: 'won',
      faction: r.faction,
      leader: r.leader,
      relics: r.relics,
      bal: r.balance,
      log: [{ result: 'win', slots: r.slots, round: r.round, board: r.units }],
    },
    r.run_key,
  );

const claudeDb = async (): Promise<ClaudeDb | null> => (await window.claude!.use!('db')) as ClaudeDb | null;

export async function saveLog(): Promise<void> {
  const run = S.run;
  if (!run || run.saved) return;
  run.saved = true;
  setSave('Saving the run log…');
  try {
    const x = W.exportLog(run);
    const docId = (run.docId = run.docId || 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
    if (!inClaude()) {
      await cloud('runs', {
        method: 'POST',
        prefer: 'return=minimal',
        body: {
          run_key: docId,
          ended: x.ended,
          balance: x.bal || 1,
          faction: x.faction,
          leader: x.leader || null,
          outcome: x.outcome,
          wins: x.wins,
          rounds: x.rounds,
          post: x.post == null ? null : x.post,
          player: playerId(),
          log: x,
        },
      });
      const g = x.outcome === 'won' ? W.ghostFrom(x, docId) : null;
      if (g)
        await cloud('ghosts?on_conflict=run_key', {
          method: 'POST',
          prefer: 'resolution=ignore-duplicates,return=minimal',
          body: ghostRow(g, x),
        });
      setSave(g ? 'Run saved. Your final board joins the post-game pool.' : 'Run saved.');
      return;
    }
    const db = await claudeDb();
    if (!db) {
      run.saved = false;
      setSave("Couldn't reach storage. Use Copy run log and paste it into the chat.");
      return;
    }
    await db
      .collection('runs')
      .doc(docId)
      .set({
        ended: x.ended,
        faction: x.faction,
        outcome: x.outcome,
        wins: x.wins,
        rounds: x.rounds,
        bal: x.bal,
        post: x.post == null ? -1 : x.post,
        json: JSON.stringify(x),
      });
    setSave('Run log saved. Ask Claude to look at your last run.');
  } catch {
    run.saved = false;
    setSave("Couldn't save the run log. Use Copy run log and paste it into the chat.");
  }
}

export const useCap = async (name: string): Promise<unknown> => {
  try {
    return window.claude && window.claude.use ? await window.claude.use(name) : null;
  } catch {
    return null;
  }
};

type SavedRun = Record<string, unknown> & { id: string; ended?: unknown };

/* every saved run in one JSON file, to hand over for analysis or keep in the repository */
export async function downloadRuns(): Promise<void> {
  if (S.dling) return;
  S.dling = true;
  setDl('Gathering your saved runs…');
  try {
    const runs: SavedRun[] = [],
      name = `warband-runs-${new Date().toISOString().slice(0, 10)}.json`,
      pack = () => JSON.stringify({ game: 'warband', exported: new Date().toISOString(), count: runs.length, runs });
    if (!inClaude()) {
      // a run that went into the post-game is saved twice; the later row is the complete one
      const rows = (await cloud('runs?select=run_key,log&order=created_at.asc&limit=1000')) as
          { run_key: string; log: unknown }[] | null,
        last: Record<string, SavedRun> = {};
      for (const r of rows || [])
        if (r.log && typeof r.log === 'object') last[r.run_key] = Object.assign({ id: r.run_key }, r.log);
      for (const k in last) runs.push(last[k]);
      if (!runs.length) {
        setDl('There are no saved runs yet.');
        return;
      }
      runs.sort((a, b) => String(a.ended).localeCompare(String(b.ended)));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([pack()], { type: 'application/json' }));
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      setDl(`Downloaded ${runs.length} run${runs.length === 1 ? '' : 's'}.`);
      return;
    }
    const db = (await useCap('db')) as ClaudeDb | null;
    if (!db) {
      setDl("Saved runs can't be reached from here.");
      return;
    }
    const snap: ClaudeDocSnapshot = await Promise.race([
      db.collection('runs').limit(1000).get(),
      timeout(15000, { code: 'timeout' }),
    ]);
    for (const d of snap.docs) {
      let x: unknown = null;
      try {
        x = JSON.parse(d.data().json as string);
      } catch {
        continue;
      }
      if (x && typeof x === 'object') runs.push(Object.assign({ id: d.id }, x));
    }
    if (!runs.length) {
      setDl('There are no saved runs yet.');
      return;
    }
    runs.sort((a, b) => String(a.ended).localeCompare(String(b.ended)));
    const dl = (await useCap('downloads')) as ClaudeDownloads | null;
    if (!dl) {
      setDl("Downloads aren't available in this view.");
      return;
    }
    await dl.save({ filename: name, data: pack() });
    setDl(`Downloaded ${runs.length} run${runs.length === 1 ? '' : 's'}.`);
  } catch (err) {
    const c = err && (err as { code?: string }).code;
    setDl(
      c === 'declined'
        ? 'Download cancelled.'
        : c === 'rate_limited'
          ? 'A download prompt is already open. Try again in a moment.'
          : c === 'timeout'
            ? "Your saved runs didn't load in time. Try again."
            : "Couldn't download the runs. Try again.",
    );
  } finally {
    S.dling = false;
  }
}

/* the final boards of past winning runs, for the post-game. Any failure just means generated opponents. */
export async function loadGhosts(skip: string | undefined): Promise<W.Ghost[]> {
  try {
    if (!inClaude()) {
      // the newest boards from the shared pool, at most 16 so ranking them stays quick
      const rows = (await cloud(
        'ghosts?select=run_key,balance,faction,leader,relics,slots,round,units&order=created_at.desc&limit=60',
      )) as GhostRow[] | null;
      const all = (rows || [])
        .filter((r) => r.run_key !== skip)
        .map(ghostOf)
        .filter((g): g is W.Ghost => Boolean(g));
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      return all.slice(0, 16);
    }
    const db = await claudeDb();
    if (!db) return [];
    const snap: ClaudeDocSnapshot = await Promise.race([
      db.collection('runs').where('outcome', '==', 'won').get(),
      timeout(10000, new Error('timeout')),
    ]);
    const out: W.Ghost[] = [];
    for (const d of snap.docs) {
      if (d.id === skip) continue;
      let x: unknown = null;
      try {
        x = JSON.parse(d.data().json as string);
      } catch {
        continue;
      }
      const g = W.ghostFrom(x, d.id);
      if (g) out.push(g);
    }
    return out;
  } catch {
    return [];
  }
}

export async function keepGoing(): Promise<void> {
  const run = S.run;
  if (!run || run.over !== 'won' || run.post || S.loading) return;
  S.loading = true;
  setSave('Gathering your past warbands…');
  const gs = await loadGhosts(run.docId);
  S.loading = false;
  if (S.run !== run || !W.continueRun(run, gs)) return;
  S.save = '';
  S.msg = gs.length
    ? `${gs.length} past warband${gs.length === 1 ? '' : 's'} to face, weakest first. Each fight you win makes the next one 15% stronger.`
    : 'No past winning boards to face yet, so these are fresh opponents. Each fight you win makes the next one 15% stronger.';
  if (run.lives === 3) S.msg += ' You go in with at least 3 lives.';
  S.screen = 'shop';
  S.sel = null;
  S.insp = null;
  render();
}
