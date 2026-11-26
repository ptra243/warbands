import asyncio, os, pathlib
PAGE = pathlib.Path(__file__).resolve().parent.parent.joinpath('index.html').as_uri()
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
SHOTS = pathlib.Path(__file__).resolve().parent.joinpath('shots'); SHOTS.mkdir(exist_ok=True)
import json
from playwright.async_api import async_playwright
OLD={"v":1,"game":"warband","faction":"E","outcome":"won","wins":10,"log":[{"round":14,"slots":10,"result":"win","board":[{"id":"matriarch","tier":2,"slot":0,"gAtk":12,"gHp":36},{"id":"treant","tier":2,"slot":2,"gAtk":60,"gHp":300},{"id":"sunchamp","slot":4},{"id":"sunspire","tier":2,"slot":7},{"id":"drowblade","tier":3,"slot":9}]}]}
NEW=dict(OLD,faction="U",leader="bloodpriest",relics=["wardrum"],bal=2,log=[{"round":12,"slots":10,"result":"win","board":[{"id":"soulreaper","tier":2,"slot":3},{"id":"collector","slot":4},{"id":"lich","slot":5}]}])
STUB="""window.__store={'run-old':{outcome:'won',json:%s},'run-new':{outcome:'won',json:%s},'run-bad':{outcome:'won',json:'{"game":"warband","outcome":"won","faction":"U","log":[{"result":"win","slots":10,"board":[{"id":"nosuchunit","slot":1}]}]}'}};
window.claude={use:async n=>n==='db'?{collection:()=>({doc:id=>({set:async d=>{window.__store[id]=d}}),where:(f,o,v)=>({get:async()=>({docs:Object.entries(window.__store).filter(e=>e[1][f]===v).map(e=>({id:e[0],data:()=>e[1]}))})})})}:null};""" % (json.dumps(json.dumps(OLD)), json.dumps(json.dumps(NEW)))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROME,args=['--no-sandbox','--disable-background-networking'])
        pg=await b.new_page(viewport={'width':1280,'height':950})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script(STUB)
        await pg.goto(PAGE)
        await pg.click('[data-act="pick:U"]')
        ls=await pg.query_selector_all('[data-act^="leader:"]'); await ls[0].click()
        for i in range(4):
            el=await pg.query_selector(f'button[data-shop="{i}"]')
            if el: await el.click()
        await pg.evaluate('__S.run.wins=9; __S.run.things.forEach(t=>{t.gAtk=900;t.gHp=9000}); __S.run.level=9; __S.run.gold=60')
        await pg.click('[data-act="fight"]'); await pg.click('[data-act="skip"]'); await pg.click('[data-act="continue"]')
        print('screen',await pg.evaluate('__S.screen'),'over',await pg.evaluate('__S.run.over'))
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(SHOTS/'end1.png'),clip={'x':0,'y':0,'width':1280,'height':560})
        print('saved doc',await pg.evaluate('Object.keys(__store).join(",")'), await pg.evaluate('__S.run.docId'))
        await pg.click('[data-act="keepgoing"]'); await pg.wait_for_timeout(400)
        print('screen',await pg.evaluate('__S.screen'),'pool',await pg.evaluate('JSON.stringify(__S.run.post.pool.map(g=>[g.key,g.power]))'),'enemy',await pg.evaluate('JSON.stringify([__S.run.enemy.title,__S.run.enemy.ghost,__S.run.enemy.mul,__S.run.enemy.leader])'))
        await pg.screenshot(path=str(SHOTS/'post1.png'))
        for k in range(4):
            if await pg.evaluate('__S.screen')!='shop': break
            if k==2: await pg.evaluate('__S.run.things.forEach(t=>{t.gAtk=0;t.gHp=0}); __S.run.lives=1')
            await pg.click('[data-act="fight"]')
            if k==1: await pg.wait_for_timeout(1500); await pg.screenshot(path=str(SHOTS/'post2.png'),clip={'x':0,'y':0,'width':1280,'height':560})
            await pg.click('[data-act="skip"]'); print('fight',k,await pg.evaluate('document.querySelector(".result h2").textContent'),await pg.evaluate('document.querySelector(".result p").textContent')); await pg.click('[data-act="continue"]')
            print('  next',await pg.evaluate('__S.screen'),await pg.evaluate('__S.run.enemy.title||""'),await pg.evaluate('__S.run.enemy.mul'),'post',await pg.evaluate('__S.run.post.n'))
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(SHOTS/'end2.png'),clip={'x':0,'y':0,'width':1280,'height':560})
        print('final doc',await pg.evaluate('JSON.stringify(Object.entries(__store).map(e=>[e[0],e[1].outcome,e[1].wins,e[1].post,e[1].bal]))'),'keepgoing btn',bool(await pg.query_selector('[data-act="keepgoing"]')))
        print('log tail',await pg.evaluate('JSON.stringify(__S.run.log.slice(-1).map(r=>[r.round,r.post,r.enemy.ghost,r.enemy.mul,r.result,r.battle.effects]))'))
        print('errors',errs)
        await b.close()
asyncio.run(main())
