const W=require(process.env.ENG||'../src/engine.js'),BS=require('./boards.js');const N=+process.argv[2]||40;const me=BS[BS.length-1];
function fight(a,b){const B=W.createBattle(a.units.map(x=>({...x})),b.units.map(x=>({...x})),13,a.open,b.open,{leader:a.leader,relics:a.relics,foeLeader:b.leader,foeRelics:b.relics});let n=0;while(!B.over&&n++<4000){W.step(B,.05);B.ev.length=0}return B.winner}
let w=0,g=0;const per=[];for(const b of BS.slice(0,-1)){let x=0;for(let k=0;k<N;k++){if(fight(me,b)===0)x++;if(fight(b,me)===1)x++}per.push(b.name+' '+Math.round(x/(2*N)*100));w+=x;g+=2*N}
console.log((process.env.DROW||'base').padEnd(18),'overall',(w/g*100).toFixed(0)+'%  |',per.join(', '));
