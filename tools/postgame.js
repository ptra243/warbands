const W=require('../src/engine.js');
const src=require('fs').readFileSync(__dirname+'/bot.js','utf8').replace("require('../src/engine.js')","W");
const bot=new Function('W','process',src.slice(src.indexOf('const SMART'),src.indexOf('const N='))+';return bot')(W,process);
function fight(B){let n=0;while(!B.over&&n++<5000){W.step(B,.05);B.ev.length=0}if(!B.over)throw new Error('stall');return B}
function play(f,i,stat){const run=W.newRun(f,Object.keys(W.LEADERS).filter(k=>W.LEADERS[k].f===f)[i%3]);let enc=0;
  while(!run.over&&run.round<60){if(run.offer){const cs=run.offer.cards;let k=cs.findIndex(c=>c.type==='relic');if(k<0)k=enc%3===0?0:cs.findIndex(c=>c.type==='event');if(k<0)k=0;enc++;const r0=W.chooseOffer(run,k);if(r0.fight){W.finishCamp(run,fight(W.startCamp(run)))}}
    const boss=run.enemy.boss;bot(run);const B=fight(W.startBattle(run));if(boss&&stat){stat.boss++;stat.bossHero+=1-Math.max(0,B.hero[0].hp)/B.hero[0].max;stat.bossWin+=B.winner===0}W.finishBattle(run,B)}
  return run}
function post(run,ghosts){W.continueRun(run,ghosts);const mult=[];while(!run.over&&run.round<80){bot(run);mult.push(run.enemy.mul);W.finishBattle(run,fight(W.startBattle(run)))}return run}
const ghosts=[],stat={boss:0,bossHero:0,bossWin:0};let tries=0;
while(ghosts.length<9&&tries<600){const f='HEU'[tries%3];const run=play(f,tries++,stat);if(run.over==='won'){const g=W.ghostFrom(JSON.parse(JSON.stringify(W.exportLog(run))),'g'+tries);if(!g)throw new Error('ghost rejected');ghosts.push(g)}}
console.log('ghosts',ghosts.length,'after',tries,'runs; power',ghosts.map(g=>g.faction+g.power+(g.leader?'/'+g.leader.slice(0,4):'')).join(' '));
console.log('boss fights',stat.boss,'won',(stat.bossWin/stat.boss*100).toFixed(0)+'%','avg hero health lost',(stat.bossHero/stat.boss*100).toFixed(0)+'%');
for(const pool of [ghosts,[]]){const sc=[];let k=0,t=0;while(sc.length<30&&t<900){const run=play('HEU'[t%3],t++);if(run.over!=='won')continue;const lives=run.lives;post(run,pool);if(run.over!=='won'||!run.post.done)throw new Error('post end '+run.over);const x=JSON.parse(JSON.stringify(W.exportLog(run)));if(!W.ghostFrom(x,'z'))throw new Error('post ghost');sc.push(run.post.n+'('+lives+')')}
  console.log(pool.length?'vs ghosts':'vs generated','beaten(lives at start):',sc.join(' '))}
// old-format log (no bal, no leader) must still give a ghost
console.log('old log ok',!!W.ghostFrom({v:1,game:'warband',faction:'E',outcome:'won',log:[{round:14,slots:10,result:'win',board:[{id:'matriarch',tier:2,slot:0,gAtk:12,gHp:36},{id:'treant',tier:2,slot:2,gAtk:60,gHp:300},{id:'sunchamp',slot:4},{id:'sunspire',tier:2,slot:7},{id:'drowblade',tier:3,slot:9}]}]},'old'));
