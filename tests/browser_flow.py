import asyncio, os, pathlib
PAGE = pathlib.Path(__file__).resolve().parent.parent.joinpath('index.html').as_uri()
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
SHOTS = pathlib.Path(__file__).resolve().parent.joinpath('shots'); SHOTS.mkdir(exist_ok=True)
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROME,args=['--no-sandbox','--disable-background-networking'])
        pg=await b.new_page(viewport={'width':1280,'height':950})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(PAGE)
        seen=set(); shots=0
        for fi,f in enumerate(['U','H','E']):
            await pg.click(f'[data-act="pick:{f}"]')
            if fi==0: await pg.screenshot(path=str(SHOTS/'leader.png'))
            ls=await pg.query_selector_all('[data-act^="leader:"]'); await ls[fi%3].click()
            for rnd in range(12):
                scr=await pg.evaluate('__S.screen')
                if scr=='encounter':
                    cards=await pg.query_selector_all('[data-act^="enc:"]')
                    kinds=await pg.evaluate('__S.run.offer.cards.map(c=>c.type+(c.hard?"H":""))')
                    for k in kinds: seen.add(k)
                    if f=='U' and shots==0 and 'campH' in kinds: await pg.screenshot(path=str(SHOTS/'enc.png')); shots=1
                    await cards[rnd%len(cards)].click()
                    if await pg.evaluate('__S.screen')=='battle':
                        await pg.click('[data-act="skip"]'); seen.add('campfight:'+await pg.evaluate('document.querySelector(".result h2").textContent')); await pg.click('[data-act="continue"]')
                if await pg.query_selector('[data-act="newrun"]'): break
                for i in range(4):
                    el=await pg.query_selector(f'button[data-shop="{i}"]')
                    if el: await el.click()
                if rnd>=1: await pg.click('[data-act="xp"]')
                boss=await pg.evaluate('!!__S.run.enemy.boss')
                if boss and f=='U': await pg.screenshot(path=str(SHOTS/'boss.png'),clip={'x':0,'y':0,'width':1280,'height':520})
                await pg.click('[data-act="fight"]')
                await pg.click('[data-act="skip"]')
                if boss: seen.add('boss:'+await pg.evaluate('document.querySelector(".result h2").textContent'))
                await pg.click('[data-act="continue"]')
                if await pg.query_selector('[data-act="newrun"]'): break
            print(f,await pg.evaluate('JSON.stringify({r:__S.run.round,w:__S.run.wins,l:__S.run.lives,leader:__S.run.leader,relics:__S.run.relics,scr:__S.screen})'))
            q=await pg.query_selector('[data-act="quit"]')
            if q: await q.click(); await pg.click('[data-act="quit"]')
            else: await pg.click('[data-act="newrun"]')
        print('seen',sorted(seen)); print('errors',errs); await b.close()
asyncio.run(main())
