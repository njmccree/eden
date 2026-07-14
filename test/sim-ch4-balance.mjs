import {js,check,lcg} from './_load.mjs';
const {ok,done}=check('ch4-balance');
const rt=js.match(/\/\* @c4rt-start \*\/([\s\S]*?)\/\* @c4rt-end \*\//)[1];
const R=new Function(rt+';return {astro,effOf,accrueSol};')();
const ec=js.match(/\/\* @c4-start \*\/([\s\S]*?)\/\* @c4-end \*\//)[1];
const E=new Function(ec+';return {C4,c4Mods,econWindow};')();

/* astronomy invariants */
let sum=0,N=0,dark=0;
for(let t=0;t<29.5306;t+=.05){const a=R.astro(t);sum+=a.sf;N++;if(a.sf<.3)dark+=.05;}
ok(sum/N>.6&&sum/N<.8,`sun factor mean ${(sum/N).toFixed(2)} in [0.60,0.80]`);
ok(dark>3&&dark<12,`monthly dark passage ${dark.toFixed(1)} sols in [3,12]`);
const p1=R.astro(0),p2=R.astro(29.5306);
ok(Math.abs(((p1.az-p2.az)%(2*Math.PI)+2*Math.PI)%(2*Math.PI))<.01,'sun azimuth periodic on the synodic month');

function runColony(gs,planFn,seed){
 const rnd=lcg(seed);
 const M=E.c4Mods({flags:gs.flags||{},payloads:gs.payloads||[]});
 const S={w:1,crew:3,water:120,prop:0,foodPct:0,foodCap:E.C4.FOOD_CAP0,
  maint:Math.max(0,Math.min(5,2+gs.rel)),morale:gs.morale,support:gs.support,budget:gs.budget,
  built:{},proj:null,retired:{},sciH:0,sciDone:0,vein:false,hab2:false,fed40:false,appropCut:false,
  energy:{cdr:100,eng:100,sci:100}};
 let T=0,pwrInt=0,A={};
 for(let w=1;w<=8;w++){
  const plan=planFn(S,w);
  if(plan.buy&&!S.proj&&!S.built[plan.buy]&&S.budget>E.C4.PROJ[plan.buy].c){
   S.budget-=E.C4.PROJ[plan.buy].c;S.proj={id:plan.buy,p:0};}
  for(let d=0;d<30;d++){
   T+=1;pwrInt+=R.astro(T).sf;
   const assign={};
   for(const id in plan.a){
    assign[id]=S.energy[id]<25?'rest':plan.a[id];
    if(assign[id]==='elec'&&!S.built.elec)assign[id]='mine';}
   R.accrueSol(S,assign,A);
  }
  M.pwr=E.C4.PWR_BASE+((gs.payloads||[]).includes('solar')?E.C4.PWR_SOLAR*(pwrInt/30):0);
  pwrInt=0;
  const Ar={mine:0,green:0,elec:0,maint:0,sci:0,build:0};
  for(const k in Ar)Ar[k]=Math.round(A[k]||0);A={};
  E.econWindow(S,Ar,M,rnd);
  if(S.budget<0){S.budget=60;S.bail=(S.bail||0)+1;}
 }
 return S;
}
const propPlan=(S,w)=>({
 buy:!S.built.elec?'elec':!S.built.green?'green':null,
 a:{cdr:w===1?'maint':'mine',eng:S.built.elec?'elec':'build',
    sci:w<=2?'sci':(S.built.green?'green':'build')}});
const foodPlan=(S,w)=>({
 buy:!S.built.green?'green':null,
 a:{cdr:w===1?'maint':'mine',eng:'build',sci:S.built.green?'green':'sci'}});
const lazyPlan=()=>({buy:null,a:{cdr:'mine',eng:'maint',sci:'green'}});

let aC=0;
for(const seed of [7,42,1234,999,2718]){
 const S=runColony({rel:1,morale:3,support:3,budget:1900,payloads:['solar','prospector'],flags:{}},propPlan,seed);
 if(S.retired.water&&S.prop>=260&&S.foodPct>=40&&!S.bail&&S.support>=4)aC++;
}
ok(aC>=3,`propellant strategy A-grade on ${aC}/5 fixed seeds (need >=3)`);
const F=runColony({rel:0,morale:3,support:3,budget:1700,payloads:['habitat','reserve'],flags:{}},foodPlan,42);
ok(F.retired.water&&(F.prop>=150||F.foodPct>=40),`food strategy reaches B (food ${F.foodPct}%)`);
const L=runColony({rel:0,morale:3,support:3,budget:1700,payloads:['habitat','reserve'],flags:{}},lazyPlan,42);
ok(L.budget>=0&&!L.bail,'lazy play survives to C without bailout');
done();
