"""The copy of the game hosted outside Claude: runs and post-game boards go to the hosted database.
The database is replaced by a stand-in here, so this checks the requests the page makes, not the real service."""
import asyncio, json, os, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT.joinpath('index.html').as_uri()
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
HOST = 'https://tuotzykmnxmmksabdlsy.supabase.co/'
GHOSTS = [
    {"run_key": "seed-a", "balance": 5, "faction": "H", "leader": "warden", "relics": ["wardrum"], "slots": 10, "round": 11, "units": [{"id": "knight", "slot": 4, "tier": 2, "item": "symbol"}, {"id": "archer", "slot": 8, "tier": 3}]},
    {"run_key": "seed-b", "balance": 4, "faction": "U", "leader": "gravecaller", "relics": [], "slots": 10, "round": 14, "units": [{"id": "lich", "slot": 0, "tier": 2}, {"id": "pitlord", "slot": 9, "tier": 2}]},
    {"run_key": "seed-bad", "balance": 4, "faction": "U", "leader": None, "relics": [], "slots": 10, "round": 9, "units": [{"id": "no-such-unit", "slot": 0}]},
]
async def main():
    seen = []; saved_runs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--disable-background-networking'])
        ctx = await b.new_context(viewport={'width': 1280, 'height': 950}, accept_downloads=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        async def handle(route):
            rq = route.request; path = rq.url[len(HOST):]; body = rq.post_data
            seen.append((rq.method, path.split('?')[0], rq.headers.get('prefer', ''), bool(rq.headers.get('apikey'))))
            if rq.method == 'OPTIONS': return await route.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'})
            cors = {'access-control-allow-origin': '*', 'content-type': 'application/json'}
            if rq.method == 'POST':
                row = json.loads(body)
                if 'rest/v1/runs' in path: saved_runs.append(row)
                if 'rest/v1/ghosts' in path: GHOSTS.append(row)
                return await route.fulfill(status=201, headers=cors, body='')
            if 'rest/v1/ghosts' in path: return await route.fulfill(status=200, headers=cors, body=json.dumps(GHOSTS))
            if 'rest/v1/runs' in path: return await route.fulfill(status=200, headers=cors, body=json.dumps([{'run_key': r['run_key'], 'log': r['log']} for r in saved_runs]))
            await route.fulfill(status=404, headers=cors, body='{}')
        await pg.route(HOST + '**', handle)
        await pg.goto(PAGE)
        await pg.click('[data-act="pick:U"]'); ls = await pg.query_selector_all('[data-act^="leader:"]'); await ls[0].click()
        for i in range(4):
            el = await pg.query_selector(f'button[data-shop="{i}"]')
            if el: await el.click()
        await pg.evaluate('__S.run.wins=9; __S.run.things.forEach(t=>{t.gAtk=900;t.gHp=9000}); __S.run.level=9')
        await pg.click('[data-act="fight"]'); await pg.click('[data-act="skip"]'); await pg.click('[data-act="continue"]'); await pg.wait_for_timeout(500)
        print('end screen:', await pg.evaluate('__S.screen'), '|', await pg.evaluate('document.getElementById("save").textContent'))
        r = saved_runs[0]
        print('run row:', sorted(r.keys()), r['outcome'], r['wins'], r['faction'], r['leader'], r['balance'], len(json.dumps(r['log'])), 'bytes')
        g = GHOSTS[-1]; print('ghost row:', g['run_key'] == r['run_key'], g['faction'], g['slots'], [u['id'] for u in g['units']], g['player'][:2])
        await pg.click('[data-act="keepgoing"]'); await pg.wait_for_timeout(600)
        print('post-game pool:', await pg.evaluate('__S.run.post.pool.map(g=>g.key).sort().join(",")'), '| first foe:', await pg.evaluate('__S.run.enemy.ghost'))
        await pg.evaluate('__S.run.lives=1; __S.run.things.forEach(t=>{t.gAtk=0;t.gHp=0})')
        await pg.click('[data-act="fight"]'); await pg.click('[data-act="skip"]'); await pg.click('[data-act="continue"]'); await pg.wait_for_timeout(500)
        print('after post-game: runs saved', len(saved_runs), 'same key', saved_runs[-1]['run_key'] == r['run_key'], 'post', saved_runs[-1]['post'], '| ghost rows from this run', sum(1 for x in GHOSTS if x['run_key'] == r['run_key']))
        async with pg.expect_download() as d:
            await pg.click('[data-act="dlruns"]')
        dl = await d.value; path = await dl.path(); x = json.loads(pathlib.Path(path).read_text())
        print('download:', dl.suggested_filename, x['count'], 'run(s), post', x['runs'][0].get('post'), '|', await pg.evaluate('document.querySelector(".dlmsg").textContent'))
        print('requests:', sorted(set(seen)))
        print('errors', errs); await b.close()
asyncio.run(main())
