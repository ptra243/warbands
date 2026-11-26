const W=require('../src/engine.js');const assert=require('assert');
function mk(level,units){const run=W.newRun('U','gravecaller');run.level=level;run.things=[];let id=900;for(const [u,slot,bench] of units)run.things.push({uid:id++,kind:'unit',id:u,tier:1,item:null,gAtk:0,gHp:0,slot:slot==null?null:slot,bench:bench==null?null:bench});return run}
const lay=run=>run.things.filter(t=>t.slot!=null).sort((a,b)=>a.slot-b.slot).map(t=>t.id[0]+t.slot).join(' ')+' | bench '+run.things.filter(t=>t.bench!=null).map(t=>t.id[0]).join('');
// level 7 = 10 slots. s=skeleton g=ghoul i=initiate c=colossus(2) l=lich(2)
let r=mk(7,[['skeleton',3],['ghoul',4],['initiate',5],['colossus',null,0]]);assert(W.moveTo(r,r.things[3],{slot:4}));console.log('bench 2-wide onto 4  :',lay(r));
r=mk(7,[['skeleton',3],['ghoul',4],['initiate',5]]);W.moveTo(r,r.things[0],{slot:5});console.log('move s 3->5 (reorder):',lay(r));
r=mk(7,[['skeleton',3],['ghoul',4],['initiate',5]]);W.moveTo(r,r.things[2],{slot:3});console.log('move i 5->3 (reorder):',lay(r));
r=mk(7,[['skeleton',3],['ghoul',4]]);W.moveTo(r,r.things[0],{slot:4});console.log('neighbour swap       :',lay(r));
r=mk(7,[['skeleton',7],['ghoul',8],['initiate',9],['colossus',null,0]]);W.moveTo(r,r.things[3],{slot:8});console.log('2-wide at right edge :',lay(r));
r=mk(1,[['skeleton',3],['ghoul',4],['initiate',5],['revenant',6],['plague',null,0]]);const ok=W.moveTo(r,r.things[4],{slot:4});console.log('full row from bench  :',ok,lay(r));
r=mk(1,[['skeleton',3],['ghoul',4],['initiate',5],['revenant',6],['colossus',null,0]]);console.log('full row, 2-wide     :',W.moveTo(r,r.things[4],{slot:4}),lay(r),' try:',JSON.stringify(W.tryMove(r,r.things[4],{slot:4})));
r=mk(7,[['lich',2],['colossus',4],['skeleton',6]]);console.log('try c 4->2           :',JSON.stringify(W.tryMove(r,r.things[1],{slot:2})),'unchanged:',lay(r));
// waiting minions: full 4-slot board with a gravedigger
r=mk(1,[['gravedigger',3],['skeleton',4],['ghoul',5],['initiate',6]]);r.enemy={faction:'H',units:[{uid:1,kind:'unit',id:'knight',tier:2,slot:3,item:null,gAtk:0,gHp:0},{uid:2,kind:'unit',id:'knight',tier:2,slot:5,item:null,gAtk:0,gHp:0}],open:4};
const B=W.startBattle(r);console.log('banked at start      :',JSON.stringify(B.bank[0]&&{n:B.bank[0].n,hp:B.bank[0].hp}));let n=0,seen=false;while(!B.over&&n++<4000){W.step(B,.05);const m=B.units.find(u=>u.side===0&&u.d.id==='minion');if(m&&!seen){seen=true;console.log('minion arrives at',B.time.toFixed(1),'s, slot',m.slot,'hp',Math.round(m.maxhp),'shield',Math.round(m.shield),'waited',m.waited,'bank now',B.bank[0])}}
console.log('report waited:',W.battleReport(B).units.filter(u=>u.waited).map(u=>u.id+':'+u.waited).join(','));
const run=W.newRun('H','marshal');run.over='won';run.lives=1;run.log.push({income:5});W.continueRun(run,[]);console.log('post lives',run.lives);
