import {js,check} from './_load.mjs';
const {ok,done}=check('ch5-night');
const seg=js.match(/\/\* @c5-start \*\/([\s\S]*?)\/\* @c5-end \*\//)[1];
const E=new Function(seg+';return {C5,c5Step,c5Grade};')();
const {C5,c5Step,c5Grade}=E;

// play the night with a choice script: {sol: fn(st,f)} applied when reached
function night(script,batt0){
 const st={batt:batt0??100,heat:100,crewC:100};
 const f={};
 const marks=Object.keys(script).map(Number).sort((a,b)=>a-b);
 let mi=0,t=0;
 const dt=.02;
 while(t<C5.SOLS){
  while(mi<marks.length&&t>=marks[mi]){script[marks[mi]](st,f);mi++;}
  c5Step(st,f,dt);
  if(st.heat<=0||st.crewC<=0)return {st,t,failed:true};
  t+=dt;
 }
 return {st,t,failed:false};
}

// cautious default: full heat, keep the greenhouse, patch the leak, skip the EVA
const def=night({2.6:(st)=>{st.crewC-=C5.PATCH_CREW;}});
ok(!def.failed&&def.st.batt>0&&def.st.batt<=20,
 `default play survives on fumes (batt ${def.st.batt.toFixed(1)}% in (0,20])`);

// good play: eng trim + dormant greenhouse + patch + rover EVA -> A margins
const good=night({
 1.5:(st,f)=>{f.shedGreen=true;st.crewC-=8;},
 2.6:(st)=>{st.crewC-=C5.PATCH_CREW;},
 4.0:(st)=>{st.batt=Math.min(130,st.batt+C5.EVA_BATT);st.crewC-=C5.EVA_CREW;},
});
ok(!good.failed&&c5Grade(good.st,false)==='A',
 `active play reaches A (batt ${good.st.batt.toFixed(1)}%, crew ${good.st.crewC.toFixed(1)}%)`);

// negligent play: let the leak bleed and skip the EVA -> blackout death spiral
const bad=night({2.6:(st,f)=>{f.leak=true;}});
ok(bad.failed&&bad.t<C5.SOLS,
 `ignoring the leak loses the base before dawn (failed at sol ${bad.t.toFixed(1)})`);

// rationed heat alone is survivable but costs the crew
const cold=night({.5:(st,f)=>{f.heatLo=true;},2.6:(st)=>{st.crewC-=C5.PATCH_CREW;}});
ok(!cold.failed&&cold.st.crewC<88&&cold.st.batt>def.st.batt,
 `rationed heat trades crew (${cold.st.crewC.toFixed(1)}%) for battery (${cold.st.batt.toFixed(1)}%)`);

done();
