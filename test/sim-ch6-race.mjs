import {js,check} from './_load.mjs';
const {ok,done}=check('ch6-race');
const seg=js.match(/\/\* @c6-start \*\/([\s\S]*?)\/\* @c6-end \*\//)[1];
const E=new Function(seg+';return {B6,OBS6,GATES6,gateAt6,raceStep,claimFrom,raceGrade};')();
const {B6,OBS6,GATES6,gateAt6,raceStep,claimFrom,raceGrade}=E;

function newSt(){
 return {x:B6.X0,z:0,v:0,vz:0,t:0,cool:0,hull:B6.HULL0,
  stakes:0,stakeMask:0,hits:0,done:false,dnf:false};
}
// scripted pilot: steer for the next unplanted gate, dodge boulders on the
// line, ease off boost to line up a gate, tap plant whenever inside one
function pilotInp(st){
 let tz=st.z,gd=1e9;
 for(let i=0;i<GATES6.length;i++){
  if(st.stakeMask&(1<<i))continue;
  if(GATES6[i][0]<st.x+6){tz=GATES6[i][1];gd=st.x-GATES6[i][0];break;}
 }
 for(const o of OBS6){
  if(o[0]>st.x||o[0]<st.x-34)continue;
  if(Math.abs(st.z-o[1])<o[2]+2.2){
   tz=o[1]+(st.z>=o[1]?1:-1)*(o[2]+3.2);break;}
 }
 const l=tz>st.z+.35,r=tz<st.z-.35;
 const boost=!(gd<40&&Math.abs(tz-st.z)>2);
 return {l,r,boost,plant:gateAt6(st)>=0};
}
function run(opts){
 opts=opts||{};
 const st=newSt(),dt=.02;
 while(!st.done&&!st.dnf){
  const inp=opts.idle?{l:false,r:false,boost:false,plant:false}:pilotInp(st);
  raceStep(st,inp,dt);
  if(opts.cap)st.v=Math.min(st.v,opts.cap);
 }
 const timeLeft=Math.max(0,B6.TIME-st.t);
 return {st,timeLeft,claim:claimFrom(timeLeft,st.stakes,st.hits)};
}

// reachability: a clean line finishes with time margin and plants every gate
const clean=run();
ok(clean.st.done&&!clean.st.dnf&&clean.timeLeft>=B6.TIME*.15,
 `clean line finishes with margin (t ${clean.st.t.toFixed(1)}s, ${(clean.timeLeft/B6.TIME*100).toFixed(0)}% window left)`);
ok(clean.st.stakes===B6.STAKES&&clean.st.hits===0,
 `all ${B6.STAKES} gates reachable clean (stakes ${clean.st.stakes}, hits ${clean.st.hits})`);
ok(raceGrade(clean.st,clean.claim)==='A',`clean line grades A (claim ${clean.claim}%)`);

// completion speed is the claim: a slower pilot claims strictly less
const slow=run({cap:B6.VMAX*.8});
ok(slow.st.done&&slow.st.stakes===B6.STAKES&&slow.claim<clean.claim,
 `slower pilot claims strictly less (${slow.claim}% < ${clean.claim}%)`);

// collisions cost territory
const bumped=claimFrom(clean.timeLeft,clean.st.stakes,clean.st.hits+3);
ok(bumped<clean.claim,`three collisions cost claim (${bumped}% < ${clean.claim}%)`);

// hands off the controls: the sled never moves and the window closes
const idle=run({idle:true});
ok(idle.st.dnf&&!idle.st.done&&Math.abs(idle.st.t-B6.TIME)<1,
 `idle pilot DNFs at the clock (t ${idle.st.t.toFixed(1)}s)`);
ok(raceGrade(idle.st,claimFrom(0,idle.st.stakes,idle.st.hits))==='D','DNF grades D');

// claim formula stays inside its rails
ok(claimFrom(0,0,20)===25&&claimFrom(B6.TIME,B6.STAKES,0)===100,
 'claim clamps to [25,100]');
done();
