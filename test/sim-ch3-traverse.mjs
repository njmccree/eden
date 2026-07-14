import {js,check} from './_load.mjs';
const {ok,done}=check('ch3-traverse');
const tseg=js.match(/function hash3[\s\S]*?const easeIO=[\s\S]*?;/)[0]
 +js.match(/const PAD_X[\s\S]*?function groundY\(x\)\{[\s\S]*?\}/)[0];
const T=new Function(tseg+';return {PAD_X,terrainH};')();
const B=new Function('return '+js.match(/const B3=(\{[^}]*\})/)[1])();
const DX=-165;
const slope=x=>(T.terrainH(x+2)-T.terrainH(x-2))/4;
const dark=x=>Math.max(0,Math.min(1,(-70-x)/25))*Math.max(0,Math.min(1,(x+260)/25));
function sim(batt0,heaterDraw,opts){
 opts=opts||{};
 const lim=opts.lim!==undefined?opts.lim:B.LIM;
 const coolDur=opts.coolDur!==undefined?opts.coolDur:3;
 let x=T.PAD_X-6,v=0,batt=batt0,temp=5,heat=0,core=0,cool=0,t=0,minT=5;
 const dt=.05;
 while(t<400){
  const atSite=Math.abs(x-DX)<6&&Math.abs(v)<.35;
  const heaters=dark(x)>.2||atSite;
  let a=0;
  if(!atSite){if(x>DX+3)a=-B.ACC;else if(x<DX-3)a=B.ACC;else a=v>0?-B.ACC:B.ACC;}
  const s=slope(x);
  v+=(a-B.GSL*s-B.FRIC*v)*dt;v=Math.max(-B.MAXV,Math.min(B.MAXV,v));
  x+=v*dt;
  const target=dark(x)>0.4?(heaters?-46:-82):(heaters?18:5);
  temp+=(target-temp)*dt/6;minT=Math.min(minT,temp);
  let drain=B.DRV*Math.abs(v)/B.MAXV+(heaters?heaterDraw:0);
  if(atSite){
   if(cool>0)cool-=dt;
   const drilling=cool<=0&&heat<lim&&core<100; /* like the game: drill into the limit, eat the cooldown */
   if(drilling){heat+=B.HEATUP*dt;drain+=B.DRILL;core+=B.RATE*dt;
    if(heat>=lim)cool=coolDur;}
   else heat=Math.max(0,heat-B.COOL*dt);
  }
  batt-=drain*dt;t+=dt;
  if(core>=100)return{ok:true,t,pct:batt/batt0*100,minT};
  if(batt<=0)return{ok:false,why:'batt'};
  if(temp<=-70)return{ok:false,why:'cold'};
 }
 return{ok:false,why:'timeout'};
}
const base=sim(100,B.HEAT),eng=sim(100,B.HEAT*.8),solar=sim(130,B.HEAT);
ok(base.ok&&base.pct>12&&base.minT>-60,`base build winnable (batt ${base.ok?base.pct.toFixed(0):'-'}% left, minT ${base.ok?base.minT.toFixed(0):'-'}°C)`);
ok(base.ok&&base.pct<50,'base build still tense (batt margin under 50%)');
ok(eng.ok&&eng.pct>base.pct,`eng background saves battery (${eng.ok?eng.pct.toFixed(0):'-'}%)`);
ok(solar.ok&&solar.pct>base.pct,`solar payload saves battery (${solar.ok?solar.pct.toFixed(0):'-'}%)`);
const boost=sim(100,B.HEAT,{lim:B.LIM*1.2,coolDur:3*.85});
ok(boost.ok&&boost.t<base.t,
 `crowd boost pulls the core sooner (${boost.ok?boost.t.toFixed(1):'-'}s vs ${base.t.toFixed(1)}s)`);
ok(boost.ok&&boost.pct>base.pct,
 `crowd boost banks battery (${boost.ok?boost.pct.toFixed(0):'-'}% vs ${base.pct.toFixed(0)}%)`);
done();
