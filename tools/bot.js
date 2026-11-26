const W=require('../src/engine.js');
const SMART=process.argv[3]!=='dumb';
const own=(run,id)=>run.things.filter(t=>(t.kind==='item'?t.id:t.item)===id).length;
function gain(run,bu,id,u){const I=W.ITEMS[id],s=W.stats(u),dps=s.atk/s.cd*8;let g=(I.atk||0)*dps+(I.haste||0)*dps+(I.hp||0)*s.hp/6+(I.splash||0)*dps*1.2+(I.healHit||0)*dps*.6;
  if(I.cls&&!s.tribes.includes(I.cls)){const a=W.synergy(bu).lv;u.item=id;const b=W.synergy(bu).lv;u.item=null;let up=0;for(const k in b)up+=(b[k]||0)-(a[k]||0);g+=up*60+3}
  return g}
function bot(run){
  let guard=0;
  while(guard++<40){
    let best=-1,bs=-1;
    run.shop.forEach((s,i)=>{if(!s)return;const cost=s.kind==='unit'?W.U[s.id].cost:W.ITEMS[s.id].cost;if(cost>run.gold)return;
      if(W.priceOf(run,s)>run.gold)return;let sc=cost;if(s.kind==='unit'){const n=run.things.filter(t=>t.id===s.id&&t.tier===1).length;sc+=n*3;}else if(SMART){const n=own(run,s.id);sc+=n%3*3;if(!W.boardUnits(run).some(u=>!u.item)&&!n)sc=-1;}
      if(sc>bs&&sc>=0){bs=sc;best=i}});
    if(best>=0){const r=W.buy(run,best);if(!r.ok){ // make room: sell cheapest bench/board
        const c=run.things.filter(t=>t.kind==='unit').sort((a,b)=>W.sellValue(a)-W.sellValue(b))[0];
        const s=run.shop[best];if(c&&s.kind==='unit'&&W.U[s.id].cost>W.U[c.id].cost&&c.tier===1){W.sell(run,c);continue}
        run.shop[best]=null;}
      continue}
    // equip items
    if(SMART){ // best unit for each item: stat gain plus any class level it unlocks; spare items wait on the bench for a third copy
      const bu=W.boardUnits(run),loose=run.things.filter(t=>t.kind==='item');let bestG=0,bi=null,bu1=null;
      for(const it of loose)for(const u of bu){if(u.item)continue;const g=gain(run,bu,it.id,u);if(g>bestG){bestG=g;bi=it;bu1=u}}
      if(bi){W.equip(run,bi,bu1);W.mergeItems(run);continue}
      if(loose.length>2||(loose.length&&W.benchFree(run)<0)){W.sell(run,loose.sort((x,y)=>own(run,x.id)-own(run,y.id))[0]);continue}
    } else {
    const it=run.things.find(t=>t.kind==='item');if(it){const u=W.boardUnits(run).find(u=>!u.item);if(u){W.equip(run,it,u);continue}else{W.sell(run,it);continue}}
    }
    // bench -> board
    const used=W.boardUnits(run).reduce((a,x)=>a+W.U[x.id].size,0);const bn=run.things.find(t=>t.kind==='unit'&&t.bench!=null&&W.boardFit(run,W.U[t.id].size)>=0&&(run.faction!=='U'||used+W.U[t.id].size<=W.openCount(run.level)-1));
    if(bn){W.moveTo(run,bn,{slot:W.boardFit(run,W.U[bn.id].size)});continue}
    if(run.level<7&&run.gold>=4&&(run.gold>=10||run.things.some(t=>t.kind==='unit'&&t.bench!=null))){W.buyXp(run);continue}
    if(run.gold>=12){W.reroll(run);continue}
    break;
  }
}
const N=+process.argv[2]||200;
for(const f of ['H','E','U']){
  const wr={},dur=[],dr={},camp=[[0,0],[0,0]],lead={};let enc=0,bossR=0;let won=0,totw=0,rounds=0,draws=0;
  for(let i=0;i<N;i++){
    const run=W.newRun(f,Object.keys(W.LEADERS).filter(k=>W.LEADERS[k].f===f)[i%3]);
    while(!run.over&&run.round<40){if(run.offer){const cs=run.offer.cards;let k=cs.findIndex(c=>c.type==='relic');if(k<0)k=enc%3===0?0:enc%3===1&&cs[2].type==='camp'?2:cs.findIndex(c=>c.type==='event');if(k<0)k=0;enc++;const hard=cs[k].hard;const r0=W.chooseOffer(run,k);if(r0.fight){const C=W.startCamp(run);let n=0;while(!C.over&&n++<5000){W.step(C,.05);C.ev.length=0}const cr=W.finishCamp(run,C);camp[hard?1:0][cr.win?0:1]++}}if(run.enemy.boss)bossR=run.round;bot(run);const B=W.startBattle(run);let n=0;while(!B.over&&n++<5000){W.step(B,.05);B.ev.length=0}
      if(!B.over)throw new Error('stall');dur.push(B.time);const r=run.round;(dr[r]=dr[r]||[]).push(B.time);const res=W.finishBattle(run,B);(wr[r]=wr[r]||[0,0])[0]+=res.res==='win';wr[r][1]++;if(res.res==='draw')draws++;
      for(const t of run.things){if(t.slot!=null&&t.bench!=null)throw new Error('pos');}
      const o=W.occOf(run);}
    if(run.over==='won')won++;(lead[run.leader]=lead[run.leader]||[0,0])[run.over==='won'?0:1]++;totw+=run.wins;rounds+=run.round;
  }
  console.log(f,'runs won',(won/N*100).toFixed(0)+'%','avg wins',(totw/N).toFixed(1),'avg rounds',(rounds/N).toFixed(1),'draws',draws,'avg dur',(dur.reduce((a,b)=>a+b)/dur.length).toFixed(1),'max',Math.max(...dur).toFixed(0));
  console.log('  avg seconds by round',Object.keys(dr).slice(0,16).map(k=>k+':'+(dr[k].reduce((a,b)=>a+b)/dr[k].length).toFixed(0)).join(' '));
  console.log('  camps won/lost: easy',camp[0].join('/'),'hard',camp[1].join('/'),' leaders won/lost',JSON.stringify(lead));
  console.log('  winrate by round',Object.keys(wr).slice(0,16).map(k=>k+':'+(wr[k][0]/wr[k][1]*100).toFixed(0)).join(' '));
}
