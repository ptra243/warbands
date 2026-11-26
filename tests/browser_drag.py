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
        await pg.click('[data-act="pick:U"]'); ls=await pg.query_selector_all('[data-act^="leader:"]'); await ls[0].click()
        await pg.evaluate('''(()=>{const r=__S.run;r.level=7;r.things=[];let id=900;for(const [u,s,bn] of [['skeleton',3,null],['ghoul',4,null],['initiate',5,null],['colossus',null,0],['lich',7,null]])r.things.push({uid:id++,kind:'unit',id:u,tier:1,item:null,gAtk:0,gHp:0,slot:s,bench:bn});})()''')
        await pg.click('[data-act="xp"]')  # forces a render
        lay='__S.run.things.map(t=>t.id[0]+(t.slot==null?"b":t.slot)).join(" ")'
        row=await (await pg.query_selector('#row0')).bounding_box(); cw=row['width']/10; cx=lambda s: row['x']+cw*(s+.5); cy=row['y']+row['height']/2
        # click-select the bench colossus, hover slot 4
        await pg.click('[data-own="903"]'); await pg.mouse.move(cx(4),cy); await pg.wait_for_timeout(200)
        print('hover', await pg.evaluate('[document.querySelectorAll(".dropmark").length, document.querySelector(".dropmark").style.gridColumn, [...document.querySelectorAll("[data-push]")].map(e=>e.dataset.own+e.dataset.push).join(",")]'))
        await pg.screenshot(path=str(SHOTS/'drop1.png'),clip={'x':60,'y':90,'width':860,'height':350})
        await pg.mouse.click(cx(4),cy); print('after click', await pg.evaluate(lay), 'marks', await pg.evaluate('document.querySelectorAll(".dropmark").length'))
        # real drag: lich (slot now?) onto slot 3
        src=await pg.query_selector('[data-own="904"]'); sb=await src.bounding_box()
        await pg.mouse.move(sb['x']+sb['width']/2,sb['y']+sb['height']/2); await pg.mouse.down(); await pg.mouse.move(cx(5),cy,steps=4); await pg.mouse.move(cx(3)+5,cy,steps=6); await pg.wait_for_timeout(150)
        print('dragging', await pg.evaluate('[document.querySelectorAll(".dropmark").length, (document.querySelector(".dropmark")||{style:{}}).style.gridColumn, [...document.querySelectorAll("[data-push]")].map(e=>e.dataset.own+e.dataset.push).join(",")]'))
        await pg.screenshot(path=str(SHOTS/'drop2.png'),clip={'x':60,'y':90,'width':860,'height':350})
        await pg.mouse.up(); await pg.wait_for_timeout(150); print('after drag', await pg.evaluate(lay), 'sel', await pg.evaluate('__S.sel'))
        # bad drop: level 1 full row
        await pg.evaluate('''(()=>{const r=__S.run;r.level=1;r.gold=50;r.things=r.things.filter(t=>t.id!=='lich');r.things.forEach((t,i)=>{if(t.id==='colossus'){t.slot=null;t.bench=0}else{t.slot=3+i;t.bench=null}});r.things.push({uid:950,kind:'unit',id:'revenant',tier:1,item:null,gAtk:0,gHp:0,slot:6,bench:null})})()''')
        await pg.click('[data-act="reroll"]'); await pg.click('[data-own="903"]'); row=await (await pg.query_selector('#row0')).bounding_box(); await pg.mouse.move(row['x']+row['width']/10*4.5,row['y']+50); await pg.wait_for_timeout(150)
        print('bad', await pg.evaluate('document.querySelector(".dropmark").className'))
        await pg.screenshot(path=str(SHOTS/'drop3.png'),clip={'x':60,'y':90,'width':860,'height':350})
        print('errors',errs); await b.close()
asyncio.run(main())
