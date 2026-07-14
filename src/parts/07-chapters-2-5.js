/* ================= subtitles / cutscene runner ================= */
let subTypeTimer=null,calloutT=null;
function showSub(who,text,italic){
 clearInterval(subTypeTimer);
 const sheetUp=['gonogo','deployScreen','planning','bgSelect','reportCard','endCard','end3Card']
  .some(id=>{const el=$(id);return el&&el.style.display==='flex';});
 $('subs').classList.toggle('top',sheetUp); /* ride above sheets, never under their gradient */
 $('subs').classList.toggle('on',!!text);
 const w=$('subWho'),x=$('subText');
 if(who){w.textContent=NPCS[who].name;w.style.color=NPCS[who].color;w.style.opacity=1;}
 else w.style.opacity=0;
 x.style.fontStyle=italic?'italic':'normal';
 x.textContent='';
 let i=0;
 subTypeTimer=setInterval(()=>{
  i++;x.textContent=text.slice(0,i);
  if(i>=text.length)clearInterval(subTypeTimer);
 },20);
 return ()=>{clearInterval(subTypeTimer);x.textContent=text;};
}
function hideSub(){
 clearInterval(subTypeTimer);
 $('subs').classList.remove('on');
 $('subText').textContent='';$('subWho').style.opacity=0;
}
function callout(who,text,noVoice){
 cancelVoice();
 showSub(who,text,false);
 if(!noVoice)speakLine(who,text);
 else if(who&&NPCS[who].radio)sfxRadio(true);
 clearTimeout(calloutT);
 calloutT=setTimeout(hideSub,Math.max(3200,text.length*70));
}
const caption=(who,text)=>callout(who,text);
const sfxClunk=()=>sfxThud(false);

let ccPos=null,ccLook=null,ccDrift=null,shotT=0,curShot=null;
let crewLookDefault=null; /* where idle crew look, per scene */
const CSHOTS={
 wide:   {p:[0,.2,-2.9], l:[0,-.05,2],      d:[0,0,.04]},
 cdr:    {p:[.4,.45,1.35],l:[-1.05,.62,.55], d:[-.012,0,-.01]},
 eng:    {p:[-.45,.4,1.3],l:[1.05,.56,.35],  d:[.012,0,-.01]},
 sci:    {p:[.55,.75,.6], l:[-.15,1.28,-.85],d:[-.014,-.006,0]},
 group:  {p:[0,.9,1.9],  l:[0,-.1,-.2],      d:[0,-.008,-.02]},
 windowE:{p:[-.12,.02,1.05],l:[1.6,-.4,26],  d:[.008,.003,.05]},
 windowM:{p:[-.12,.02,1.05],l:[1.2,-1.5,20], d:[.008,.003,.05]},
 packet: {p:[.3,.5,1.5], l:[0,.4,.2],        d:[0,0,-.015],follow:'packet'},
 pull:   {p:[0,.15,-3.1],l:[0,0,2],          d:[0,.02,-.05]},
 screen: {p:[0,.4,-1.35], l:[0,.45,-3.4],     d:[0,0,-.02]},
 twoshot:{p:[0,.95,1.1],  l:[0,.35,-3.4],     d:[0,-.006,-.03]}
};
function applyShot(name){
 curShot=CSHOTS[name]||CSHOTS.wide;
 ccPos.set(...curShot.p);ccLook.set(...curShot.l);ccDrift.set(...curShot.d);
 shotT=0;
}
const SCN={running:false,abort:false,tapFn:null};
function waitMs(ms){
 return new Promise(res=>{
  const t=setTimeout(done,ms);
  function done(){SCN.tapFn=null;clearTimeout(t);res();}
  SCN.tapFn=done;
 });
}
async function playCut(beats,onDone){
 SCN.running=true;SCN.abort=false;
 $('skipBtn').style.display='block';
 for(const b of beats){
  if(SCN.abort)break;
  if(b.shot)applyShot(b.shot);
  if(b.pre)b.pre();
  if(b.lag){sfxBeep(620);await waitMs(1300);if(SCN.abort)break;} /* lightspeed */
  if(b.dialog){hideSub();await new Promise(res=>showDialog(b.dialog(),res));continue;}
  if(b.t){
   const line=typeof b.t==='function'?b.t():b.t;
   const complete=showSub(b.who,line);
   let tapped=false;
   await Promise.race([
    speakLine(b.who,line),
    new Promise(res=>{SCN.tapFn=()=>{tapped=true;complete();cancelVoice();res();};})
   ]);
   SCN.tapFn=null;
   if(SCN.abort)break;
   if(!tapped)await waitMs(380);
  }else{
   if(b.cap)showSub(null,b.cap,true);else hideSub();
   await waitMs(b.dur||3000);
  }
 }
 SCN.running=false;
 hideSub();
 onDone();
}
/* prop actions */
function handWorld(c){const v=new THREE.Vector3();c.hand.getWorldPosition(v);return v;}
function packetLaunch(){
 const p=handWorld(crew.cdr);
 props.packet.position.copy(p);props.packet.visible=true;
 props.packet.userData={mode:'fly',v:new THREE.Vector3(.55,.5,-.7),spin:new THREE.Vector3(2,3,1)};
 crew.cdr.gestureT=.9;sfxVelcro();
}
function packetCatch(){
 props.packet.userData={mode:'held',t:0};
 crew.sci.gestureT=.9;sfxVelcro();
}
function harmonicaRaise(){
 props.harmonica.visible=true;
 crew.cdr.raise=true;
 sfxVelcro();
}
function harmonicaLower(){crew.cdr.raise=false;props.harmonica.visible=false;}

/* ================= The Coast ================= */
function coastBeats(){
 return [
  {shot:'wide',dur:3600,cap:'(Transit Day 2 — 148,000 km from Earth)'},
  {shot:'cdr',who:'cdr',t:"Dinner service. Tonight's special is beef stew that has never met a cow."},
  {shot:'sci',who:'sci',t:"I traded you my brownie for this stew last night. I want to renegotiate."},
  {shot:'eng',who:'eng',t:"No renegotiation in flight. Contract law is very clear above the Kármán line."},
  {shot:'cdr',who:'cdr',t:"Since when do you know contract law?"},
  {shot:'eng',who:'eng',t:"Since I read the resupply agreements. Someone should. They're horrifying."},
  {shot:'windowE',who:'sci',t:"...We're really out here. That's everyone, in that window. Everyone who's ever lived."},
  {shot:'group',who:'eng',t:"And us. Three idiots and a stew."},
  {shot:'cdr',who:'cdr',t:"To the three idiots.",pre:()=>packetLaunch()},
  {shot:'packet',dur:2400,cap:'(the stew packet sails across the cabin)'},
  {shot:'sci',who:'sci',t:"Got it! Zero-g catering. We should charge for this.",pre:()=>packetCatch()},
  {shot:'wide',who:'cdr',t:"All right. Confession round. Everyone smuggled something — I approved the mass margins, and they were generous."},
  {shot:'sci',who:'sci',t:"Basil seeds. Eleven grams. I wanted something green that isn't printed on a screen."},
  {shot:'eng',who:'eng',t:"Coffee. Real coffee, vacuum-packed. Forty grams."},
  {shot:'sci',who:'sci',t:"Forty?! That's a month of basil mass!"},
  {shot:'eng',who:'eng',t:"Coffee is reliability. Fight me."},
  {shot:'cdr',who:'cdr',t:"...A harmonica."},
  {shot:'eng',who:'eng',t:"You didn't."},
  {shot:'cdr',who:'cdr',t:"My grandfather's. He played it on a destroyer in the Pacific. Figured it should keep going further out.",
   pre:()=>harmonicaRaise()},
  {shot:'cdr',dur:5600,cap:'(two bars, a little rusty)',
   pre:()=>{playHarmonicaPhrase();
    setTimeout(()=>{AM.motifOn=true;if(AM.ctx)AM.layers.melody.gain.linearRampToValueAtTime(.42,AM.ctx.currentTime+3);},2600);}},
  {shot:'sci',who:'sci',t:"First music in translunar space.",pre:()=>harmonicaLower()},
  {shot:'eng',who:'eng',t:"First music that far from home, anyway. Somebody log it."},
  {shot:'cdr',who:'cdr',t:"Log: Day two. Morale — recovering. Coffee dispute — tabled. Music — continuing."},
  {shot:'windowE',dur:4200,cap:'(the Earth, a little smaller than yesterday)',
   pre:()=>{warmDrone(950);padToMajor();}},
  {shot:'pull',who:'cdr',t:"Get some sleep. The Moon's not getting any closer with us sitting up."},
  {shot:'pull',who:'eng',t:"That is literally untrue."},
  {shot:'pull',who:'cdr',t:"Chief."},
  {shot:'pull',who:'eng',t:"Copy. Good night, Eden."}
 ];
}
function enterCoast(){
 ['hud','objWrap','dialog'].forEach(id=>$(id).style.display='none');
 $('missionClock').style.display='none';
 if(hasTHREE){
  siteRoot.visible=false;orbitRoot.visible=false;terraRoot.visible=false;
  scene.fog=null;scene.background=new THREE.Color(0x000104);
  cabinRoot.visible=true;
  cabinEarth.visible=true;cabinClouds.visible=true;moonMesh.visible=false;
 }
 document.body.classList.add('cine');
 crewLookDefault=new THREE.Vector3(0,.4,1.6);
 cabinEarth.scale.setScalar(1);cabinClouds.scale.setScalar(1);
 if(props.comms)props.comms.visible=false;
 setAmb(.55,2.5);setArp(0,3);
 gameState.date='June 2031';
 const slug=$('slug');slug.textContent='Outbound · Transit Day 2 · 148,000 km';
 slug.classList.add('show');setTimeout(()=>slug.classList.remove('show'),4800);
 applyShot('wide');
 playCut(coastBeats(),()=>{
  $('fade').classList.add('out');
  padToMinor();
  setTimeout(()=>{
   $('fade').classList.remove('out');
   go('ARRIVE2');
  },1500);
 });
}
/* ================= lunar arrival ================= */
function engRegulatorLine(){
 return {waived:"And the regulator we waived is riding downhill with us. Watch the helium.",
  held:"New regulator is green. Best day we ever spent.",
  sensor:"That transducer call is still holding. Clean board.",
  clean:"Board is green. It's quiet. I hate quiet."}[anomalyOutcome(gameState)];
}
function arrive2Beats(){
 return [
  {shot:'wide',pre:()=>{setRumbleDrive(.5);if(AM.ctx)AM.layers.rumble.gain.setTargetAtTime(.7,AM.ctx.currentTime,.3);shakeAmp=.03;},
   dur:4600,cap:'(lunar orbit insertion — four minutes of braking)'},
  {shot:'wide',pre:()=>{setRumbleDrive(0);if(AM.ctx)AM.layers.rumble.gain.setTargetAtTime(0,AM.ctx.currentTime,.3);shakeAmp=0;sfxThud();},
   dur:1700,cap:'(cutoff)'},
  {shot:'cdr',who:'cdr',t:"Cutoff on time. Welcome to lunar orbit."},
  {shot:'eng',who:'eng',t:"Residuals are two centimeters a second. I'll allow it."},
  {shot:'windowM',who:'sci',t:"There it is. See the bright points on the rim? Peaks of eternal light. Power that never sets."},
  {shot:'windowM',who:'eng',t:"And below them, a floor that hasn't seen the sun in four billion years. We're parking between the two."},
  {shot:'cdr',who:'cdr',t:"Ice in the dark, power in the light. The whole business plan in one crater."},
  {shot:'wide',who:'flight',t:"Eden, relay. You are GO for descent on rev three. One and a third seconds of lag up here — fly your own ship."},
  {shot:'cdr',who:'cdr',t:"Copy go. Chief — you fly the fuel. I fly the ship."},
  {shot:'eng',who:'eng',t:engRegulatorLine()},
  {shot:'sci',who:'sci',t:"The basil is strapped in. For the record, it has more margin than I do."},
  {shot:'cdr',who:'cdr',t:"Undock in three. Everybody breathe — next stop is the ground."},
  {shot:'wide',pre:()=>sfxThud(),dur:2100,cap:'(separation)'}
 ];
}
function enterArrive2(){
 if(hasTHREE){
  cabinRoot.visible=true;terraRoot.visible=false;
  cabinEarth.visible=false;cabinClouds.visible=false;moonMesh.visible=true;
 }
 document.body.classList.add('cine');
 crewLookDefault=new THREE.Vector3(0,.4,1.6);
 setAmb(.5,2);
 gameState.date='July 2031';
 const slug=$('slug');slug.textContent='Lunar orbit · Rev 3 · LOI + 22 min';
 slug.classList.add('show');setTimeout(()=>slug.classList.remove('show'),4800);
 applyShot('wide');
 playCut(arrive2Beats(),()=>go('GAME2'));
}

/* ================= descent gameplay ================= */
const G2={
 GRAV:1.62,THRUST:4.1,ROT:1.5,BURN:1.6,
 x:0,y:0,vx:0,vy:0,th:0,fuel:100,fuel0:100,
 throttle:0,cap:1,alt:999,attempts:0,
 inThrust:false,inL:false,inR:false,
 event:{armed:false,fired:false,vent:0,need:3},
 flags:{},rel:0,done:false,
 touchTimers:[]
};
function resetDescent(){
 G2.x=-300;G2.y=groundY(-300)+280;
 G2.vx=20;G2.vy=-10;G2.th=.45;G2.throttle=0;G2.cap=1;
 G2.fuel0=gameState.payloads.includes('reserve')?135:100;
 G2.fuel=G2.fuel0;G2.done=false;
 G2.event.fired=false;G2.event.vent=0;
 G2.event.armed=!!gameState.flags.waivedAnomaly;
 G2.event.need=gameState.background==='eng'?2:3;
 G2.rel=gameState.stats.reliability;G2.flags={};
 lander.visible=true;
 lander.position.set(G2.x,G2.y,0);lander.rotation.z=G2.th;
 $('ventBtn').style.display='none';
 $('fuelBar').classList.remove('low');
 setAlarmLevels(0,0,0);
}
function beginGame2(){
 document.body.classList.remove('cine');
 if(hasTHREE){
  cabinRoot.visible=false;terraRoot.visible=true;
  scene.background=new THREE.Color(0x000104);
 }
 $('skipBtn').style.display='none';
 setGhudMode('lander');$('thrust').textContent='Hold · Thrust';
 document.body.classList.add('landing');
 $('ghud').style.display='flex';$('limits').style.display='block';
 $('padCtl').style.display='flex';
 setObjective('Land on Shackleton Rim');
 $('objWrap').style.display='flex';
 setAmb(0,1);
 G2.attempts++;
 gameState.descent.attempts=G2.attempts;
 resetDescent();
 setMix('GAME2',2.5);
 setTimeout(()=>{if(gameState.scene==='GAME2')
  callout('flight',"Telemetry good, Eden. You're on your own now.",true);},900);
}
function bindHold(id,on,off){
 const el=$(id);
 el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();on();});
 ['pointerup','pointerleave','pointercancel'].forEach(ev=>el.addEventListener(ev,off));
}
bindHold('thrust',()=>{G2.inThrust=true;},()=>{G2.inThrust=false;});
bindHold('rotL',()=>{G2.inL=true;sfxRcs();},()=>{G2.inL=false;});
bindHold('rotR',()=>{G2.inR=true;sfxRcs();},()=>{G2.inR=false;});
window.addEventListener('keydown',e=>{
 if(e.repeat)return;
 if(e.code==='Space')G2.inThrust=true;
 if(e.code==='ArrowLeft')G2.inL=true;
 if(e.code==='ArrowRight')G2.inR=true;});
window.addEventListener('keyup',e=>{
 if(e.code==='Space')G2.inThrust=false;
 if(e.code==='ArrowLeft')G2.inL=false;
 if(e.code==='ArrowRight')G2.inR=false;});
$('ventBtn').addEventListener('click',e=>{
 e.stopPropagation();sfxBeep(900);
 G2.event.vent--;
 $('ventN').textContent=G2.event.vent;
 if(G2.event.vent<=0){
  $('ventBtn').style.display='none';
  G2.cap=1;
  callout('eng',"Regulator cycled. Don't make me do that again.");
 }
});
function milestone2(key,fn){if(!G2.flags[key]){G2.flags[key]=true;fn();}}
function gameUpdate(dt){
 if(G2.inL)G2.th+=G2.ROT*dt;
 if(G2.inR)G2.th-=G2.ROT*dt;
 G2.th=Math.max(-.9,Math.min(.9,G2.th));
 const want=G2.inThrust&&G2.fuel>0?1:0;
 G2.throttle+=(want*G2.cap-G2.throttle)*Math.min(1,dt*9);
 if(G2.throttle>.02&&G2.fuel>0){
  G2.fuel=Math.max(0,G2.fuel-G2.BURN*G2.throttle*dt);
  if(G2.fuel===0){G2.throttle=0;callout('flight',"Propellant depleted.",true);}
 }
 const a=G2.THRUST*G2.throttle;
 G2.vx+=-Math.sin(G2.th)*a*dt;
 G2.vy+=(Math.cos(G2.th)*a-G2.GRAV)*dt;
 G2.x+=G2.vx*dt;G2.y+=G2.vy*dt;
 G2.alt=G2.y-groundY(G2.x);
 lander.position.set(G2.x,G2.y,0);
 lander.rotation.z=G2.th;
 setRumbleDrive(G2.throttle*.9);
 shakeAmp=G2.throttle*.22;
 if(G2.throttle>.05){
  const n=Math.floor(G2.throttle*160*dt)+1;
  for(let i=0;i<n;i++){
   const s=Math.sin(G2.th),c=Math.cos(G2.th);
   emitP(lExh,G2.x-s*1.6+(Math.random()-.5),G2.y+c*1.6-.2,(Math.random()-.5)*1.4,
    G2.vx+s*(15+Math.random()*7)+(Math.random()-.5)*3,
    G2.vy-c*(15+Math.random()*7),(Math.random()-.5)*3,.45+Math.random()*.3);}
 }
 if(G2.alt<26&&G2.throttle>.2){
  const gy=groundY(G2.x),k=(1-G2.alt/26)*G2.throttle;
  const n=Math.floor(k*120*dt)+1;
  for(let i=0;i<n;i++){
   const dir=Math.random()<.5?-1:1;
   emitP(lDust,G2.x+(Math.random()-.5)*4,gy+.4,(Math.random()-.5)*6,
    dir*(6+Math.random()*12*k),1+Math.random()*2.5,(Math.random()-.5)*4,.7+Math.random()*.5);}
  milestone2('dust',()=>callout('eng',"Picking up dust."));
 }
 if(G2.alt<250)milestone2('m250',()=>callout('eng',"Two fifty. Coming down nicely."));
 if(G2.alt<100)milestone2('m100',()=>callout('cdr',"One hundred meters."));
 if(G2.fuel<G2.fuel0*.25)milestone2('lowfuel',()=>{
  $('fuelBar').classList.add('low');
  callout('eng',"Fuel's talking. Make it count.");});
 if(G2.event.armed&&!G2.event.fired&&G2.alt<190){
  G2.event.fired=true;G2.cap=.62;
  G2.event.vent=G2.event.need;
  $('ventN').textContent=G2.event.vent;
  $('ventBtn').style.display='block';
  sfxKlaxon();
  callout('eng',"There it is! The helium regulator. Thrust is capped — vent it, now!");
 }
 if(G2.alt<=0){
  G2.done=true;
  const onPad=Math.abs(G2.x-PAD_X)<=PAD_HALF-1;
  const ok=Math.abs(G2.vy)<2.6&&Math.abs(G2.vx)<1.6&&Math.abs(G2.th)<.157;
  const d=gameState.descent;
  d.vs=Math.abs(G2.vy);d.hs=Math.abs(G2.vx);
  d.tilt=Math.abs(G2.th)*57.3;d.dx=Math.abs(G2.x-PAD_X);
  d.fuelLeft=G2.fuel/G2.fuel0*100;d.onPad=onPad;
  if(ok)touchdown(onPad);else crash();
 }
 updateGHud();
}
let noiseT=0,noiseV=[1,1,1,1];
function updateGHud(){
 noiseT-=1;
 if(noiseT<=0){noiseT=8;
  const amp=G2.rel<1?.07:0;
  for(let i=0;i<4;i++)noiseV[i]=1+(Math.random()*2-1)*amp;}
 const vs=G2.vy*noiseV[0],hs=G2.vx*noiseV[1];
 $('hAlt').textContent=Math.max(0,G2.alt*noiseV[2]).toFixed(0)+' m';
 const vsE=$('hVs');vsE.textContent=vs.toFixed(1)+' m/s';
 vsE.className='v'+(vs<-2.6?' bad':vs<-1.8?' warn':'');
 const hsE=$('hHs');hsE.textContent=hs.toFixed(1)+' m/s';
 hsE.className='v'+(Math.abs(hs)>1.6?' bad':Math.abs(hs)>1.1?' warn':'');
 const tE=$('hTilt');tE.textContent=(G2.th*57.3*noiseV[3]).toFixed(0)+'°';
 tE.className='v'+(Math.abs(G2.th)>.157?' bad':Math.abs(G2.th)>.105?' warn':'');
 $('hFuel').textContent=(G2.fuel/G2.fuel0*100).toFixed(0)+'%';
 $('fuelBar').firstElementChild.style.width=(G2.fuel/G2.fuel0*100)+'%';
 /* alarms mirror the HUD colors exactly: red=1, yellow=.5, white=0 */
 setAlarmLevels(
  vs<-2.6?1:vs<-1.8?.5:0,
  Math.abs(hs)>1.6?1:Math.abs(hs)>1.1?.5:0,
  Math.abs(G2.th)>.157?1:Math.abs(G2.th)>.105?.5:0);
}
function crash(){
 gameState.scene='CRASH2';
 setAlarmLevels(0,0,0);
 lander.visible=false;setRumbleDrive(0);G2.throttle=0;
 sfxExplosion();shakeAmp=.6;
 for(let i=0;i<90;i++){
  const a=Math.random()*Math.PI*2,sp=4+Math.random()*16;
  emitP(lBoom,G2.x,Math.max(G2.y,groundY(G2.x)+1),0,
   Math.cos(a)*sp,Math.random()*14,Math.sin(a)*sp*.5,.6+Math.random()*.8);}
 $('padCtl').style.display='none';$('ventBtn').style.display='none';
 const lines=[
  ['flight',"Eden, we lost your downlink at surface contact. Guidance rewind — go again."],
  ['eng',"Well. The Moon is still winning. Rewinding the sim buffer — again."],
  ['flight',"Negative contact. Recycle to high gate. You have the margin — barely."]];
 const [w,t]=lines[Math.min(G2.attempts-1,2)];
 setTimeout(()=>callout(w,t,w==='flight'),1100);
 setTimeout(()=>{if(gameState.scene==='CRASH2')go('GAME2');},4200);
}
function touchdown(onPad){
 gameState.scene='TOUCH2';setMix('TOUCH2',2);
 document.body.classList.remove('landing');
 setAlarmLevels(0,0,0);
 setRumbleDrive(0);G2.throttle=0;shakeAmp=.12;
 sfxThud();
 for(let i=0;i<50;i++){
  const dir=Math.random()<.5?-1:1;
  emitP(lDust,G2.x+(Math.random()-.5)*5,groundY(G2.x)+.4,(Math.random()-.5)*6,
   dir*(8+Math.random()*10),1+Math.random()*2,(Math.random()-.5)*4,1+Math.random()*.6);}
 $('padCtl').style.display='none';$('ghud').style.display='none';
 $('limits').style.display='none';$('ventBtn').style.display='none';
 $('objWrap').style.display='none';
 document.body.classList.add('cine');
 $('skipBtn').style.display='block';
 const d=gameState.descent,first=G2.attempts===1;
 d.grade=!onPad?'C':(first&&d.vs<1.2&&d.hs<.8&&d.tilt<4)?'A':(G2.attempts<=2?'B':'C');
 gameState.log.push('Touched down on Shackleton Rim: '+d.vs.toFixed(1)+' m/s, attempt '+G2.attempts+'.');
 const seq=[
  [300,()=>callout('cdr',"Contact. Engine stop.")],
  [3200,()=>callout('cdr',"Shackleton Rim. Eden is on the Moon.")],
  [7200,()=>callout('flight',"Copy, Eden. The whole planet just exhaled.",true)],
  [10800,()=>{showSub(null,'(two bars — first music on the Moon)',true);
    playHarmonicaPhrase();AM.motifOn=true;padToMajor();
    if(AM.ctx)AM.layers.melody.gain.linearRampToValueAtTime(.45,AM.ctx.currentTime+3);}],
  [16800,()=>go('DEPLOY2')]
 ];
 G2.touchTimers=seq.map(([ms,fn])=>setTimeout(()=>{if(gameState.scene==='TOUCH2')fn();},ms));
}
function skipTouchdown(){
 G2.touchTimers.forEach(clearTimeout);
 cancelVoice();
 AM.motifOn=true;padToMajor();
 go('DEPLOY2');
}
/* ================= deploy + report ================= */
const SOL={power:2,water:0,cap:2,margin:0};
let deployed=0;
function openDeploy(){
 hideSub();
 $('skipBtn').style.display='none';
 deployed=0;SOL.power=2;SOL.water=0;SOL.cap=2;SOL.margin=0;
 const box=$('depCards');box.innerHTML='';
 gameState.payloads.forEach(id=>{
  const m=MODULES.find(x=>x.id===id);
  const b=document.createElement('button');b.className='depCard';
  b.innerHTML='<div class="t">'+m.name+'</div><div class="fx">'+m.depFx+'</div><div class="prog"></div>';
  b.addEventListener('click',ev=>{
   ev.stopPropagation();
   if(b.classList.contains('done')||b.classList.contains('busy'))return;
   b.classList.add('busy');sfxBeep(760);
   const bar=b.querySelector('.prog');let p=0;
   const iv=setInterval(()=>{
    p+=4;bar.style.width=p+'%';
    if(p>=100){clearInterval(iv);b.classList.remove('busy');b.classList.add('done');
     applyDeploy(id);}
   },52);
  });
  box.appendChild(b);
 });
 updateSolStrip();
 $('depDone').disabled=true;
 $('deployScreen').style.display='flex';
}
function applyDeploy(id){
 const m=MODULES.find(x=>x.id===id);
 const speaker={prospector:'sci',solar:'sci',habitat:'cdr',reserve:'eng'}[id];
 callout(speaker,m.dep);
 if(id==='solar')SOL.power+=9;
 if(id==='prospector')SOL.water+=12;
 if(id==='habitat'){SOL.cap=4;gameState.stats.morale=Math.min(5,gameState.stats.morale+1);}
 if(id==='reserve')SOL.margin+=1;
 gameState.log.push('Deployed: '+m.name+'.');
 if(id==='prospector'&&gameState.background==='geo')
  setTimeout(()=>toast('⛏️ Your assay was right — the rig deployed 20 minutes ahead of book.'),2600);
 sfxChime();updateSolStrip();
 deployed++;
 if(deployed>=gameState.payloads.length)$('depDone').disabled=false;
}
function updateSolStrip(){
 $('solStrip').innerHTML='POWER <b>'+SOL.power+' kW</b> · WATER <b>'+SOL.water+' kg/day</b>'+
  ' · CREW CAP <b>'+SOL.cap+'</b> · MARGIN <b>+'+SOL.margin+'</b>';
}
$('depDone').addEventListener('click',()=>{
 sfxClick();
 $('deployScreen').style.display='none';
 go('REPORT2');
});
function openReport(){
 padToMajor();setArp(.5,4); /* the arp comes home for the credits */
 const d=gameState.descent;
 $('grade').textContent=d.grade;
 $('grade').style.color=d.grade==='A'?'var(--go)':d.grade==='B'?'var(--accent)':'var(--dawn)';
 const cb={waived:"The waived regulator cost you a vent cycle at 180 meters. It goes in the report.",
  held:"The swapped regulator ran flawless. Worth the day and the sixty million.",
  sensor:"Your transducer call held all the way down. The Chief owes you that drink.",
  clean:"Clean board, clean descent. The Chief remains suspicious."}[anomalyOutcome(gameState)];
 const rows=[
  'Touchdown: '+d.vs.toFixed(1)+' m/s down · '+d.hs.toFixed(1)+' m/s across · '+
   d.tilt.toFixed(0)+'° tilt'+(d.onPad?'':' · off target — '+d.dx.toFixed(0)+' m cable run'),
  'Fuel remaining: '+d.fuelLeft.toFixed(0)+'%'+(gameState.payloads.includes('reserve')?' (reserve tanks helped)':''),
  'Attempts: '+G2.attempts,
  cb,
  'Base online: '+gameState.payloads.map(id=>MODULES.find(m=>m.id===id).name).join(' + '),
  'The road here: launched from '+gameState.site.name+' as a '+
   BACKGROUNDS.find(b=>b.id===gameState.background).name+'.'
 ];
 if(gameState.background==='admin')rows.push('Ledger note: descent ops closed under budget. 📋');
 const rr=$('repRows');rr.innerHTML='';
 rows.forEach(t=>{const dv=document.createElement('div');dv.textContent=t;rr.appendChild(dv);});
 $('reportCard').style.display='flex';
}
$('againBtn').addEventListener('click',()=>{
 sfxClick();
 $('reportCard').style.display='none';
 setArp(0,1);
 padToMinor();
 go('GAME2');
});
/* skip + global tap */
$('skipBtn').addEventListener('click',e=>{
 e.stopPropagation();
 const sc=gameState.scene;
 if(sc==='DESCENT'){descentT=Math.max(descentT,9.98);}
 else if(sc==='LAUNCH'&&launch.phase==='liftoff'){
  launch.tlIdx=launch.timeline.length;cancelVoice();
  stageSeparation(true);tliCallback();}
 else if(sc==='COAST'||sc==='ARRIVE2'||sc==='CH3_CALL'){SCN.abort=true;cancelVoice();if(SCN.tapFn)SCN.tapFn();}
 else if(sc==='TOUCH2')skipTouchdown();
 else if(sc==='ICE3')skipExtraction();
});
document.body.addEventListener('click',()=>{
 if(SCN.running&&SCN.tapFn)SCN.tapFn();
});
/* ================= merged frame loop ================= */
let last=performance.now(),rafOn=true;
const tmpV=hasTHREE?new THREE.Vector3():null;
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){rafOn=false;
  if('speechSynthesis' in window)try{speechSynthesis.pause();}catch(e){}}
 else if(!rafOn){rafOn=true;last=performance.now();
  if(AM.ctx&&AM.ctx.state!=='running'&&AM.ctx.resume)AM.ctx.resume().catch(()=>{});
  if('speechSynthesis' in window)try{speechSynthesis.resume();}catch(e){}
  requestAnimationFrame(frame);}
});
let descentFlashDone=false;
function frame(now){
 if(!rafOn)return;
 requestAnimationFrame(frame);
 const dt=Math.min(.05,(now-last)/1000);last=now;
 if(!hasTHREE)return;
 const sc=gameState.scene;

 if(sc==='MENU'||sc==='DESCENT'){
  planet.rotation.y+=dt*.03;clouds.rotation.y+=dt*.037;
 }
 if(sc==='MENU'){
  camBase.set(Math.sin(now*.00016)*.06,Math.sin(now*.00011)*.05,3.4);
  camLook.set(0,0,0);
 }
 if(sc==='SITE_SELECT'){
  const w=orbitRoot.userData.world;
  w.position.lerp(tmpV.set(0,0,0),.05);
  w.scale.setScalar(lerpN(w.scale.x,1.22,.05));
  if(!drag.on&&Math.abs(drag.vx)>1e-5){
   planet.rotation.y+=drag.vx;clouds.rotation.y+=drag.vx;drag.vx*=.94;}
  camBase.set(Math.sin(now*.00013)*.05,Math.sin(now*.0001)*.04,2.9);
  camLook.set(0,0,0);
 }
 if(sc==='DESCENT'){
  descentT+=dt;
  const w=orbitRoot.userData.world;
  if(descentT<4){
   const t=easeIO(clamp01(descentT/4));
   w.position.lerp(tmpV.set(0,0,0),.06);
   w.scale.setScalar(lerpN(w.scale.x,1,.06));
   camBase.set(0,0,3.4);camLook.set(0,0,0);
  }else if(descentT<10){
   const t=easeIO(clamp01((descentT-4)/6));
   const target=latLonToLocal(siteChosen.lat,siteChosen.lon,1.01);
   planet.localToWorld(target); /* track the rotating globe, matching the pin */
   const dir0=tmpV.set(0,0,1);
   const dirT=target.clone().normalize();
   const q0=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),dir0.clone().normalize());
   const q1=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),dirT);
   const q=q0.slerp(q1,t);
   const dir=new THREE.Vector3(0,0,1).applyQuaternion(q);
   const rad=lerpN(3.4,1.22,t);
   camBase.copy(dir.multiplyScalar(rad));
   camLook.lerpVectors(new THREE.Vector3(0,0,0),target,t*.9);
  }else if(!descentFlashDone){
   descentFlashDone=true;
   $('flash').style.opacity=1;
   setTimeout(()=>{
    buildSite(siteChosen);
    orbitRoot.visible=false;siteRoot.visible=true;
    scene.background=new THREE.Color(siteChosen.sky.top);
    camBase.set(26,10,30);camLook.set(0,7,0);
    go('ARRIVAL');
    setTimeout(()=>$('flash').style.opacity=0,120);
   },340);
  }
 }
 if(siteRoot&&siteRoot.visible){
  updateVapor(dt);
  if(plumeFlame){stepPool(plumeFlame,dt,6);stepPool(plumeSmoke,dt,.6);}
  updateBoosterFall(dt);
  padLights.forEach((m,i)=>{
   const on=(Math.sin(now*.003+i*1.7)+1)/2>.5;
   m.material.color.setHex(on?0xff5544:0x441a16);});
  if(sc==='ARRIVAL'||sc==='BACKGROUND_SELECT'||sc==='PLANNING'||
     (sc==='LAUNCH'&&launch.phase!=='liftoff')){
   arrivalCamT+=dt;
   const ang=arrivalCamT*.03;
   camBase.set(Math.sin(ang)*33,9.5,Math.cos(ang)*33);
   camLook.set(0,7,0);
  }
  if(sc==='LAUNCH'&&launch.phase==='liftoff'){
   launch.t+=dt;
   while(launch.tlIdx<launch.timeline.length&&launch.t>=launch.timeline[launch.tlIdx][0]){
    launch.timeline[launch.tlIdx][1]();launch.tlIdx++;}
   if(launch.t>2.2){
    rocket.position.y=.9+Math.pow(launch.t-2.2,1.9)*.35;
    emitPlume(dt);
    const f=smooth(30,320,rocket.position.y);
    const space=new THREE.Color(0x03040a);
    skyU.top.value.lerp(space,f*.055);
    skyU.bottom.value.lerp(new THREE.Color(0x070b14),f*.05);
    scene.background.lerp(space,f*.055); /* the dome AND the void behind it agree */
    if(scene.fog){scene.fog.color.lerp(space,f*.04);
     scene.fog.far=lerpN(scene.fog.far,4000,f*.03);}
    if(launchStarsU){
     launchStarsU.uDark.value=Math.max(launchStarsU.uDark.value,f);
     launchStarsU.uT.value=now*.001;}
   }
   const mm=Math.floor(launch.t/60),ss=Math.floor(launch.t%60);
   $('missionClock').textContent='T+'+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');
   camBase.set(26,8+rocket.position.y*.92,30+rocket.position.y*.1);
   camLook.set(0,rocket.position.y+6,0);
  }
 }
 if(sc==='COAST'||sc==='ARRIVE2'||sc==='CH3_CALL'){
  const speaker=VOICE.active;
  let speakerHead=null;
  if(speaker&&crew[speaker]){crew[speaker].headPivot.getWorldPosition(tmpV);speakerHead=tmpV.clone();}
  for(const key in crew){
   const c=crew[key];
   if(c.g.userData.by===undefined)c.g.userData.by=c.g.position.y;
   c.g.position.y=c.g.userData.by+Math.sin(now*.0006+c.phase)*.045;
   const talking=speaker===key;
   c.jaw.position.y=-.12-(talking?Math.abs(Math.sin(now*.023+c.phase))*.03:0);
   if(talking&&Math.random()<.008)c.gestureT=.7;
   if(c.gestureT>0)c.gestureT-=dt;
   const gest=c.gestureT>0?Math.sin(c.gestureT*9)*.3:0;
   const targetZ=c.raise?.65:c.armBase.z+gest*.4;
   const targetX=c.raise?-1.25:c.armBase.x;
   c.armR.rotation.z+=(targetZ-c.armR.rotation.z)*Math.min(1,dt*6);
   c.armR.rotation.x+=(targetX-c.armR.rotation.x)*Math.min(1,dt*6);
   const target=talking||!speakerHead?crewLookDefault:speakerHead;
   c.lookMix.lerp(target,.05);
   c.headPivot.lookAt(c.lookMix);
   c.blinkT-=dt;
   if(c.blinkT<-.13){c.blinkT=2+Math.random()*3.5;c.eyeL.scale.y=1;c.eyeR.scale.y=1;}
   else if(c.blinkT<0){c.eyeL.scale.y=.12;c.eyeR.scale.y=.12;}
  }
  /* props */
  const pk=props.packet;
  if(pk.visible&&pk.userData.mode==='fly'){
   pk.position.addScaledVector(pk.userData.v,dt);
   pk.rotation.x+=pk.userData.spin.x*dt;pk.rotation.y+=pk.userData.spin.y*dt;
  }else if(pk.visible&&pk.userData.mode==='held'){
   pk.userData.t+=dt;
   pk.position.lerp(handWorld(crew.sci),Math.min(1,dt*8));
   if(pk.userData.t>2.4)pk.visible=false;
  }
  if(props.harmonica.visible)props.harmonica.position.copy(handWorld(crew.cdr));
  /* motes + window bodies */
  const md=motes.userData;
  for(let i=0;i<40;i++){
   md.mp[i*3]+=md.mv[i*3]*dt;md.mp[i*3+1]+=md.mv[i*3+1]*dt;md.mp[i*3+2]+=md.mv[i*3+2]*dt;
   if(Math.abs(md.mp[i*3])>1.8)md.mv[i*3]*=-1;
   if(Math.abs(md.mp[i*3+1])>1.4)md.mv[i*3+1]*=-1;
   if(Math.abs(md.mp[i*3+2])>2.9)md.mv[i*3+2]*=-1;}
  motes.geometry.attributes.position.needsUpdate=true;
  cabinEarth.rotation.y+=dt*.01;cabinClouds.rotation.y+=dt*.013;
  moonMesh.rotation.y+=dt*.008;
  if(curShot&&curShot.follow==='packet'&&pk.visible)ccLook.lerp(pk.position,.12);
  if(props.comms&&props.comms.visible){
   props.comms.userData.dot.material.color.setHex(Math.sin(now*.006)>0?0xff4444:0x3a1212);
   props.comms.material.color.setScalar(VOICE.active==='leader'?1:.88);}
  camera.position.set(
   ccPos.x+ccDrift.x*shotT+Math.sin(now*.0007)*.013+(Math.random()-.5)*shakeAmp,
   ccPos.y+ccDrift.y*shotT+Math.sin(now*.00053+2)*.011+(Math.random()-.5)*shakeAmp,
   ccPos.z+ccDrift.z*shotT+(Math.random()-.5)*shakeAmp*.4);
  camera.lookAt(ccLook);
  shotT+=dt;
 }else if(sc==='CH4'||sc==='CH4_END'){
  if(sc==='CH4'&&S4)ch4Update(dt);
  if(S4&&terraSun){
   const a=astro(S4.T);
   terraSun.position.set(a.sunDir.x,a.sunDir.y,a.sunDir.z).multiplyScalar(600);
   const up=Math.max(0,Math.sin(Math.max(a.elevDeg,0)*Math.PI/180+.02));
   terraSun.intensity=.15+1.45*Math.min(1,up*22)*Math.max(.25,a.sf);
   terraSun.color.setHSL(.09,.5,.62+.3*Math.min(1,a.elevDeg/1.2));
   sunDisc.position.copy(terraSun.position).setLength(2400);
   sunDisc.visible=a.elevDeg>-1.4;
   terraAmb.intensity=.9-(1-a.sf)*.45;
   terraAmb.color.setHex(a.sf<.35?0x24354e:0x1c2530); /* earthshine blue in the dark */
   earthBall.position.y=90+1400*Math.sin(a.earthEl);
  }
  stepPool(lDust,dt,-1.3);
  beacons.forEach((b,i)=>{
   const on=(Math.sin(now*.004+i*2.1)+1)/2>.45;
   b.material.color.setHex(on?0x7fe08f:0x123318);});
  const ang=now*.00005;
  camera.position.set(PAD_X-4+Math.sin(ang)*52,PAD_TOP+18,Math.cos(ang)*52);
  camera.lookAt(PAD_X-4,PAD_TOP+3,0);
 }else if(sc==='GAME3'||sc==='ICE3'||sc==='CRASH3'||sc==='REPORT3'){
  if(sc==='GAME3')roverUpdate(dt);
  stepPool(lDust,dt,-1.3);
  stepPool(lExh,dt,0);
  beacons.forEach((b,i)=>{
   const on=(Math.sin(now*.004+i*2.1)+1)/2>.45;
   b.material.color.setHex(on?0x7fe08f:0x123318);});
  const rx=R3.x,ry=terrainH(R3.x);
  camera.position.set(
   rx+8+(Math.random()-.5)*shakeAmp*2,
   ry+11+(Math.random()-.5)*shakeAmp*2,
   34+(Math.random()-.5)*shakeAmp);
  camera.lookAt(rx,ry+2.5,0);
  if(sc!=='GAME3')shakeAmp=Math.max(0,shakeAmp-dt*.3);
 }else if(sc==='GAME2'||sc==='TOUCH2'||sc==='CRASH2'||sc==='DEPLOY2'||sc==='REPORT2'){
  if(sc==='GAME2'&&!G2.done)gameUpdate(dt);
  stepPool(lExh,dt,0);
  stepPool(lDust,dt,-1.3);
  stepPool(lBoom,dt,-1.62);
  beacons.forEach((b,i)=>{
   const on=(Math.sin(now*.004+i*2.1)+1)/2>.45;
   b.material.color.setHex(on?0x7fe08f:0x123318);});
  const alt=Math.max(0,G2.alt);
  const dist=26+alt*.28;
  camera.position.set(
   G2.x+dist*.22+(Math.random()-.5)*shakeAmp*2,
   Math.max(groundY(G2.x)+6,G2.y+5+dist*.16)+(Math.random()-.5)*shakeAmp*2,
   dist+(Math.random()-.5)*shakeAmp);
  camera.lookAt(G2.x,G2.y+4,0);
  if(sc!=='GAME2')shakeAmp=Math.max(0,shakeAmp-dt*.3);
 }else{
  camera.position.set(
   camBase.x+(Math.random()-.5)*shakeAmp,
   camBase.y+(Math.random()-.5)*shakeAmp,
   camBase.z+(Math.random()-.5)*shakeAmp*.5);
  camera.lookAt(camLook);
 }
 if(cabinRoot&&cabinRoot.visible)leds.forEach(m=>{
  const on=(Math.sin(now*.0012+m.userData.ph*3)+1)/2>.4;
  m.material.color.setHex(on?m.userData.base:0x22262b);});
 renderer.render(scene,camera);
}
/* ================= Chapter 3: the call home ================= */
const LEADERS={
 'USA':          {name:'THE PRESIDENT \u00b7 WASHINGTON',cap:'Washington',color:'#b7c9ff',blipF:118,pitch:.8, rate:.95,flag:'usa'},
 'French Guiana':{name:'THE PRESIDENT \u00b7 PARIS',     cap:'Paris',     color:'#9fb4ff',blipF:138,pitch:.92,rate:1.03,flag:'fr'},
 'Kazakhstan':   {name:'THE PRESIDENT \u00b7 ASTANA',    cap:'Astana',    color:'#8fd4e8',blipF:108,pitch:.74,rate:.94,flag:'kz'},
 'Japan':        {name:'THE PRIME MINISTER \u00b7 TOKYO',cap:'Tokyo',     color:'#ffb3b3',blipF:150,pitch:.96,rate:1.02,flag:'jp'},
 'China':        {name:'THE PRESIDENT \u00b7 BEIJING',   cap:'Beijing',   color:'#ffcf8f',blipF:124,pitch:.82,rate:.96,flag:'cn'}
};
function drawStar(g,x,y,r,rot){
 g.beginPath();
 for(let k=0;k<5;k++){
  const a=rot-Math.PI/2+k*2*Math.PI/5,b=a+Math.PI/5;
  if(k===0)g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
  else g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
  g.lineTo(x+Math.cos(b)*r*.42,y+Math.sin(b)*r*.42);}
 g.closePath();g.fill();
}
function leaderScreenTexture(flag){
 const W=512,H=320,c=document.createElement('canvas');c.width=W;c.height=H;
 const g=c.getContext('2d');
 const bg=g.createLinearGradient(0,0,0,H);
 bg.addColorStop(0,'#241d16');bg.addColorStop(1,'#0d0a07');
 g.fillStyle=bg;g.fillRect(0,0,W,H);
 /* flag on a pole, camera-left behind the desk */
 const fx=64,fy=52,fw=150,fh=96;
 g.fillStyle='#6b5a3e';g.fillRect(fx-10,fy-18,5,H-90);
 g.save();g.translate(fx,fy);g.transform(1,.03,0,1,0,0);
 if(flag==='usa'){
  for(let i=0;i<13;i++){g.fillStyle=i%2?'#eee':'#b22234';g.fillRect(0,i*fh/13,fw,fh/13+1);}
  g.fillStyle='#3c3b6e';g.fillRect(0,0,fw*.42,fh*7/13);
  g.fillStyle='#fff';
  for(let r=0;r<5;r++)for(let s=0;s<6;s++)
   g.fillRect(7+s*(fw*.42-14)/5,6+r*(fh*7/13-12)/4,2.6,2.6);
 }else if(flag==='fr'){
  g.fillStyle='#0055a4';g.fillRect(0,0,fw/3,fh);
  g.fillStyle='#fff';g.fillRect(fw/3,0,fw/3,fh);
  g.fillStyle='#ef4135';g.fillRect(2*fw/3,0,fw/3,fh);
 }else if(flag==='kz'){
  g.fillStyle='#00afca';g.fillRect(0,0,fw,fh);
  g.fillStyle='#fec50c';
  g.beginPath();g.arc(fw*.55,fh*.42,15,0,Math.PI*2);g.fill();
  for(let k=0;k<16;k++){const a=k*Math.PI/8;
   g.fillRect(fw*.55+Math.cos(a)*19-1,fh*.42+Math.sin(a)*19-1,2,7);}
  g.beginPath();g.ellipse(fw*.55,fh*.66,26,7,0,0,Math.PI,false);g.fill();
  g.fillRect(4,0,7,fh); /* ornament band, stylized */
 }else if(flag==='jp'){
  g.fillStyle='#fff';g.fillRect(0,0,fw,fh);
  g.fillStyle='#bc002d';g.beginPath();g.arc(fw/2,fh/2,fh*.3,0,Math.PI*2);g.fill();
 }else if(flag==='cn'){
  g.fillStyle='#de2910';g.fillRect(0,0,fw,fh);
  g.fillStyle='#ffde00';
  drawStar(g,26,26,15,0);
  [[52,10],[62,22],[62,38],[52,50]].forEach(([x,y])=>drawStar(g,x,y,5,.6));
 }
 g.restore();
 /* desk + leader silhouette */
 g.fillStyle='#0a0806';g.fillRect(0,H-74,W,74);
 g.fillStyle='#3a2d1c';g.fillRect(0,H-80,W,10);
 g.fillStyle='#151a22';
 g.beginPath();g.arc(W*.62,H*.5,34,0,Math.PI*2);g.fill();          /* head */
 g.beginPath();g.ellipse(W*.62,H*.86,88,58,0,Math.PI,0,false);g.fill(); /* shoulders */
 g.fillStyle='#1c2330';
 g.beginPath();g.ellipse(W*.62,H*.86,60,44,0,Math.PI,0,false);g.fill();
 const key=g.createRadialGradient(W*.62,H*.42,10,W*.62,H*.42,150);
 key.addColorStop(0,'rgba(255,226,180,.16)');key.addColorStop(1,'rgba(0,0,0,0)');
 g.fillStyle=key;g.fillRect(0,0,W,H);
 /* chrome: LIVE + banner + scanlines */
 g.fillStyle='#ff4444';g.beginPath();g.arc(24,22,5,0,Math.PI*2);g.fill();
 g.fillStyle='#dfe6f0';g.font='700 13px ui-monospace,monospace';g.fillText('LIVE',36,27);
 g.fillStyle='rgba(6,10,16,.85)';g.fillRect(0,H-26,W,26);
 g.fillStyle='#8b96a8';g.font='10px ui-monospace,monospace';
 g.fillText('SECURE UPLINK \u00b7 SHACKLETON \u2194 EARTH \u00b7 DELAY 1.3 s',12,H-9);
 g.fillStyle='rgba(0,0,0,.16)';
 for(let y=0;y<H;y+=3)g.fillRect(0,y,W,1);
 return new THREE.CanvasTexture(c);
}
function buildComms(flag){
 if(!props.comms){
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.06),
   new THREE.MeshBasicMaterial({color:0xffffff}));
  panel.position.set(0,.45,-3.42);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(1.82,1.18,.06),
   new THREE.MeshPhongMaterial({color:0x2b3038,flatShading:true}));
  frame.position.set(0,.45,-3.46);cabinRoot.add(frame);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.02,6,6),
   new THREE.MeshBasicMaterial({color:0xff4444}));
  dot.position.set(.82,.98,-3.4);cabinRoot.add(dot);
  panel.userData.dot=dot;panel.userData.frame=frame;
  cabinRoot.add(panel);props.comms=panel;
 }
 props.comms.material.map=leaderScreenTexture(flag);
 props.comms.material.needsUpdate=true;
 props.comms.visible=true;
 props.comms.userData.dot.visible=true;
 props.comms.userData.frame.visible=true;
}
/* ---- five conversations, one spine: congrats -> the ask -> a choice -> sign-off ---- */
function ch3Beats(country){
 const CH=(label,tags,fx,reply,req)=>({label,tags,req,showLocked:!!req,
  fx:()=>{fx();},next:[{s:'leader',t:reply}]});
 const open=[
  {shot:'twoshot',pre:()=>sfxRadio(),dur:3200,cap:'(uplink acquired \u2014 relay through three satellites and one ocean)'},
 ];
 const close=[
  {shot:'twoshot',dur:2600,cap:'(link drop \u2014 the cabin hum sounds louder than it did)'}
 ];
 if(country==='USA')return [...open,
  {shot:'screen',who:'leader',lag:true,t:"Eden, this is the White House. Seventy years of countdowns, and you're the first crew I've called past the Moon's own horizon. The whole country is watching one channel tonight. That never happens."},
  {shot:'cdr',who:'cdr',t:"Thank you. The commute is long but the view of home is worth it."},
  {shot:'windowE',who:'sci',t:"We can see the whole Atlantic seaboard at dawn from the rim camera. Florida photographs beautifully from up here."},
  {shot:'screen',who:'leader',lag:true,t:"Here's my ask. Congress votes on the Lunar Authority budget in three weeks. Give me a moment this country can rally behind."},
  {dialog:()=>[{s:'leader',t:"What do you have for me, Eden?",choices:[
   CH("\u201cPrime-time broadcast from the rim \u2014 full tour, live questions.\u201d",'+2 Support \u00b7 \u22121 Morale (crew prep)',
    ()=>{setStat('publicSupport',2);setStat('morale',-1);gameState.flags.broadcast=true;
     gameState.log.push('Promised a prime-time broadcast from the rim.');},
    "That'll do it. I'll bring the networks. You bring the Moon."),
   CH("\u201cRespectfully \u2014 the moment is the water. First ice core, televised the day we pull it.\u201d",'+1 Support \u00b7 the core becomes the show',
    ()=>{setStat('publicSupport',1);gameState.flags.icePremiere=true;
     gameState.log.push('Staked the publicity moment on the first ice core.');},
    "A harder sell but a better story. Get me that core, Eden."),
   CH("(\ud83d\udccb) \u201cExclusive documentary rights \u2014 auctioned. The program funds itself this quarter.\u201d",'+$200M \u00b7 \u22121 Support',
    ()=>{setStat('budget',200);setStat('publicSupport',-1);gameState.flags.mediaDeal=true;
     gameState.log.push('Auctioned exclusive documentary rights.');},
    "...The lawyers will hate how much I like this.",'admin')
  ]}]},
  {shot:'eng',who:'eng',t:"For the record: nobody films my coffee ration."},
  {shot:'screen',who:'leader',lag:true,t:"Bring them home proud, Eden. And Commander \u2014 the harmonica made the evening news. Washington out."},
  ...close];
 if(country==='French Guiana')return [...open,
  {shot:'screen',who:'leader',lag:true,t:"Eden, Paris. From Kourou you borrowed our equator; since last night you carry a piece of Europe on the Moon. F\u00e9licitations \u2014 all of it."},
  {shot:'cdr',who:'cdr',t:"Merci. The running start helped more than the textbooks admit."},
  {shot:'sci',who:'sci',t:"And the basil sprouted this morning, if that counts as European agriculture."},
  {shot:'screen',who:'leader',lag:true,t:"It counts. Now \u2014 the agencies are asking what Europe's seat at Shackleton looks like. I would rather hear your answer than theirs."},
  {dialog:()=>[{s:'leader',t:"What shall I tell them, Eden?",choices:[
   CH("\u201cA partner astronaut seat on the second resupply. Europe flies with us.\u201d",'+1 Support \u00b7 partner crew in Ch.3',
    ()=>{setStat('publicSupport',1);gameState.flags.esaPartner=true;
     gameState.log.push('Offered an ESA partner seat on resupply two.');},
    "Then Europe will be there. I will hold the agencies to your generosity."),
   CH("(\u26cf\ufe0f) \u201cA joint ice-core standard \u2014 your labs, our drill. One shared dataset.\u201d",'+1 Reliability \u00b7 joint assay program',
    ()=>{setStat('reliability',1);gameState.flags.jointAssay=true;
     gameState.log.push('Founded a joint EU ice-core standard.');},
    "Science that cannot be argued with. My favorite kind of diplomacy.",'geo'),
   CH("\u201cLet us land the base first. Ask me again in thirty sols.\u201d",'+1 Morale \u00b7 \u22121 Support',
    ()=>{setStat('morale',1);setStat('publicSupport',-1);
     gameState.log.push('Deferred the European partnership question.');},
    "Careful and honest. Europe waits \u2014 but not forever, Eden.")
  ]}]},
  {shot:'eng',who:'eng',t:"If their labs want our data, they can send real coffee on the pallet."},
  {shot:'screen',who:'leader',lag:true,t:"L'Europe regarde. Make the dark crater bright. Paris out."},
  ...close];
 if(country==='Kazakhstan')return [...open,
  {shot:'screen',who:'leader',lag:true,t:"Eden, Astana. Gagarin left Earth from our steppe. Tonight the steppe reaches the Moon. Every schoolchild in this country stayed up past midnight for you."},
  {shot:'cdr',who:'cdr',t:"Tell them the pad's scorch marks brought us luck. All sixty years of them."},
  {shot:'screen',who:'leader',lag:true,t:"I will. Now \u2014 a request, from history to history. Your first surface module. We ask that it carry a name from the steppe: Baiterek. The tree of life."},
  {dialog:()=>[{s:'leader',t:"Will Eden carry the name?",choices:[
   CH("\u201cBaiterek it is. The first tree on the Moon.\u201d",'+1 Support \u00b7 the module is named',
    ()=>{setStat('publicSupport',1);gameState.flags.baiterek=true;
     gameState.log.push('Named the first surface module Baiterek.');},
    "Then it will outlive all of us. Astana is honored."),
   CH("\u201cCo-named, by crew vote: Baiterek-Eden. Both roots.\u201d",'+1 Morale',
    ()=>{setStat('morale',1);gameState.flags.baiterekEden=true;
     gameState.log.push('Co-named the module Baiterek-Eden by crew vote.');},
    "Two names, one tree. Even better."),
   CH("(\ud83d\udd27) \u201cAnd send your regulator vendor's audit team. That hardware flew from your pad.\u201d",'+1 Reliability',
    ()=>{setStat('reliability',1);gameState.flags.kzAudit=true;
     gameState.log.push('Invited the Baikonur vendor audit.');},
    "Blunt as a wrench. They fly out Monday.",'eng')
  ]}]},
  {shot:'eng',who:'eng',t:"If their auditors find that regulator's cousin in our spares, I want a word with it."},
  {shot:'screen',who:'leader',lag:true,t:"The steppe is wide; the sky, wider. Baiterek stands. Astana out."},
  ...close];
 if(country==='Japan')return [...open,
  {shot:'screen',who:'leader',lag:true,
   t:()=>gameState.descent.attempts===1?
    "Eden, Tokyo. Tanegashima launches between fishing seasons \u2014 precision as courtesy. Your touchdown honored the schedule to the minute. This did not go unnoticed.":
    "Eden, Tokyo. Tanegashima launches between fishing seasons \u2014 precision as courtesy. Your touchdown honored the schedule\u2026 eventually. We will not discuss the replays."},
  {shot:'cdr',who:'cdr',t:"Your pad crews taught us the habit. We only exported it."},
  {shot:'sci',who:'sci',t:"And the water numbers are beautiful. Twelve kilograms a day of maybe, waiting in the dark."},
  {shot:'screen',who:'leader',lag:true,t:"Maybe is where industry begins. We propose to make it certain \u2014 and we brought options."},
  {dialog:()=>[{s:'leader',t:"Which shall we prepare, Eden?",choices:[
   CH("\u201cA shared water-telemetry standard. Your sensors, our wellhead, one number everyone trusts.\u201d",'+1 Reliability',
    ()=>{setStat('reliability',1);gameState.flags.jpTelemetry=true;
     gameState.log.push('Adopted the joint water-telemetry standard.');},
    "Then the number will be trusted in both languages. Excellent."),
   CH("(\u26cf\ufe0f) \u201cSend the survey rover on the next cargo run. We'll map the shadowed floor together.\u201d",'joint rover survey in Ch.3',
    ()=>{gameState.flags.roverPartner=true;setStat('publicSupport',1);
     gameState.log.push('Accepted the joint survey rover.');},
    "It is already crated. We hoped you would ask.",'geo'),
   CH("\u201cThe crew needs a quiet week before new scope. Precision includes rest.\u201d",'+1 Morale',
    ()=>{setStat('morale',1);
     gameState.log.push('Declined new scope for a crew rest week.');},
    "Spoken like someone who intends to be precise for years. Agreed.")
  ]}]},
  {shot:'eng',who:'eng',t:"A sensor suite that agrees with itself. I may frame the spec sheet."},
  {shot:'screen',who:'leader',lag:true,t:"Small margins, long journeys. Tokyo out."},
  ...close];
 /* China */
 return [...open,
  {shot:'screen',who:'leader',lag:true,t:"Eden, Beijing. Wenchang was built for scale; you built for distance. Between the two, the sea route to the Moon is open. The nation sends its congratulations."},
  {shot:'cdr',who:'cdr',t:"Your pad crews load a rocket like a freighter. We felt every saved kilogram out here."},
  {shot:'screen',who:'leader',lag:true,t:"Then let us speak like shipping partners. The route is open \u2014 the question is what sails on it, and under whose terms."},
  {dialog:()=>[{s:'leader',t:"Beijing offers three drafts. Choose, Eden.",choices:[
   CH("\u201cThe expanded cargo agreement. Standing resupply, both directions.\u201d",'future resupply \u221225% \u00b7 \u22121 Support (headlines)',
    ()=>{gameState.flags.cnResupply=true;gameState.flags.resupplyDiscount=Math.max(gameState.flags.resupplyDiscount||0,.25);
     setStat('publicSupport',-1);
     gameState.log.push('Signed the expanded Wenchang cargo agreement.');},
    "Signed. The freighters will make the argument the headlines cannot."),
   CH("(\ud83d\udccb) \u201cWith an open inspection clause \u2014 both flags audit both manifests.\u201d",'+$100M \u00b7 +1 Support',
    ()=>{setStat('budget',100);setStat('publicSupport',1);gameState.flags.cnAudited=true;
     gameState.log.push('Signed the cargo agreement with mutual inspection.');},
    "You negotiate like a customs officer. Acceptable \u2014 and wise.",'admin'),
   CH("\u201cSingle-mission scope for now. One route, one manifest, then we talk.\u201d",'+1 Morale',
    ()=>{setStat('morale',1);
     gameState.log.push('Kept the cargo agreement to single-mission scope.');},
    "Patience is also a strategy. The offer keeps.")
  ]}]},
  {shot:'sci',who:'sci',t:"If any manifest has room for eleven more grams of seeds, I know a basil that wants company."},
  {shot:'screen',who:'leader',lag:true,t:"Ten thousand li begins at a launch pad. Sail well, Eden. Beijing out."},
  ...close];
}
function enterCh3Call(){
 const L=LEADERS[gameState.site.country]||LEADERS['USA'];
 Object.assign(NPCS.leader,{name:L.name,color:L.color,blipF:L.blipF,pitch:L.pitch,rate:L.rate});
 $('reportCard').style.display='none';
 ['ghud','padCtl','objWrap'].forEach(id=>$(id).style.display='none');
 if(hasTHREE){
  terraRoot.visible=false;cabinRoot.visible=true;
  scene.background=new THREE.Color(0x000104);
  moonMesh.visible=false;
  cabinEarth.visible=true;cabinClouds.visible=true;
  cabinEarth.scale.setScalar(.38);cabinClouds.scale.setScalar(.38); /* home is far now */
  buildComms(L.flag);
  crewLookDefault=new THREE.Vector3(0,.45,-3.2); /* everyone faces the screen */
 }
 document.body.classList.add('cine');
 setAmb(.55,2);setArp(0,2);
 gameState.date='July 2031 \u00b7 Sol 2';
 const slug=$('slug');
 slug.textContent='Shackleton Base \u00b7 Sol 2 \u00b7 Uplink to '+L.cap;
 slug.classList.add('show');setTimeout(()=>slug.classList.remove('show'),4800);
 applyShot('twoshot');
 playCut(ch3Beats(gameState.site.country),()=>go('GAME3'));
}
$('chap3Btn').addEventListener('click',()=>{
 sfxClick();
 $('reportCard').style.display='none';
 go('CH3_CALL');
});
$('restartBtn4').addEventListener('click',()=>{
 sfxClick();
 $('end3Card').style.display='none';
 resetGame();
});

/* ================= Chapter 3 gameplay: the ice traverse ================= */
let rover3=null,drillRig=null,roverLight=null,roverBeam=null,wheels3=[];
const DRILL_X=-165;
const B3={ACC:3.1,FRIC:.9,GSL:1.9,MAXV:6,DRV:.3,HEAT:.7,DRILL:.6,HEATUP:22,COOL:15,RATE:6.5,LIM:100};
const R3={x:0,v:0,batt:100,batt0:100,T:5,heat:0,core:0,mode:'drive',cool:0,heaters:false,
 overheats:0,attempts:0,heaterDraw:B3.HEAT,drillRate:B3.RATE,heatLim:B3.LIM,maxV:B3.MAXV,
 prevThrust:false,done:false,flags:{}};
function slopeAt(x){return (terrainH(x+2)-terrainH(x-2))/4;}
function darkAt(x){return Math.max(0,Math.min(1,(-70-x)/25))*Math.max(0,Math.min(1,(x+260)/25));}
function setGhudMode(mode){
 const grps=document.querySelectorAll('#ghud .grp');
 if(mode==='rover'){
  grps[0].innerHTML='<span>TEMP</span><span class="v" id="hAlt">\u2014</span>'+
   '<span>HEATERS</span><span class="v" id="hVs">\u2014</span>';
  grps[1].innerHTML='<span>DIST</span><span class="v" id="hHs">\u2014</span>'+
   '<span>SLOPE</span><span class="v" id="hTilt">\u2014</span>';
  grps[2].innerHTML='<span>BATT</span><div id="fuelBar"><i></i></div><span class="v" id="hFuel">100%</span>';
  $('limits').textContent='KEEP TEMP ABOVE \u221260\u00b0C \u00b7 WATCH THE BATTERY';
 }else{
  grps[0].innerHTML='<span>ALT</span><span class="v" id="hAlt">\u2014</span>'+
   '<span>V/S</span><span class="v" id="hVs">\u2014</span>';
  grps[1].innerHTML='<span>H/S</span><span class="v" id="hHs">\u2014</span>'+
   '<span>TILT</span><span class="v" id="hTilt">\u2014</span>';
  grps[2].innerHTML='<span>FUEL</span><div id="fuelBar"><i></i></div><span class="v" id="hFuel">100%</span>';
  $('limits').textContent='TARGET \u00b7 V/S < 2.6 \u00b7 H/S < 1.6 \u00b7 TILT < 9\u00b0';
 }
}
function buildRover(){
 if(rover3)return;
 rover3=new THREE.Group();
 const rWhite=new THREE.MeshPhongMaterial({color:0xe8e9ec,flatShading:true});
 const rDark=new THREE.MeshPhongMaterial({color:0x2b3038,flatShading:true});
 const body=new THREE.Mesh(new THREE.BoxGeometry(4.6,1.6,2.6),rWhite);
 body.position.y=1.9;rover3.add(body);
 const pack=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.1,2),
  new THREE.MeshPhongMaterial({color:0xc8a24a,flatShading:true}));
 pack.position.set(-1.1,3,0);rover3.add(pack);
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,1.6,6),rDark);
 mast.position.set(1.7,3.4,0);rover3.add(mast);
 wheels3=[];
 [[-1.6,1],[1.6,1],[-1.6,-1],[1.6,-1]].forEach(([wx,wz])=>{
  const w=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,.5,10),rDark);
  w.rotation.x=Math.PI/2;w.position.set(wx,.75,wz*1.35);
  rover3.add(w);wheels3.push(w);});
 roverLight=new THREE.PointLight(0xcfe8ff,0,70);
 roverLight.position.set(2.6,3,0);rover3.add(roverLight);
 roverBeam=new THREE.Mesh(new THREE.ConeGeometry(3.4,11,10,1,true),
  new THREE.MeshBasicMaterial({color:0xcfe8ff,transparent:true,opacity:0,
   depthWrite:false,blending:THREE.AdditiveBlending}));
 roverBeam.rotation.z=Math.PI/2+.28;roverBeam.position.set(7.2,1.9,0);
 rover3.add(roverBeam);
 terraRoot.add(rover3);
 drillRig=new THREE.Group();
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,5,6),rDark);
 pole.position.y=2.5;drillRig.add(pole);
 const lamp=new THREE.Mesh(new THREE.SphereGeometry(.5,8,8),
  new THREE.MeshBasicMaterial({color:0x6fd8c8}));
 lamp.position.y=5.2;drillRig.add(lamp);
 drillRig.userData.lamp=lamp;
 drillRig.position.set(DRILL_X,terrainH(DRILL_X),0);
 terraRoot.add(drillRig);
}
function resetTraverse(){
 R3.x=PAD_X-6;R3.v=0;
 R3.batt0=gameState.payloads.includes('solar')?130:100;
 R3.batt=R3.batt0;R3.T=5;R3.heat=0;R3.core=0;R3.cool=0;
 R3.mode='drive';R3.heaters=false;R3.prevThrust=false;R3.done=false;R3.flags={};
 R3.heaterDraw=gameState.background==='eng'?B3.HEAT*.8:B3.HEAT;
 R3.drillRate=gameState.background==='geo'?B3.RATE*1.25:B3.RATE;
 R3.heatLim=gameState.flags.jointAssay?B3.LIM*1.15:B3.LIM;
 R3.maxV=gameState.flags.roverPartner?B3.MAXV*1.2:B3.MAXV;
 rover3.visible=true;drillRig.visible=true;
 rover3.position.set(R3.x,terrainH(R3.x)+.75,0);
 $('thrust').textContent='Heaters: OFF \u00b7 tap';
 $('fuelBar').classList.remove('low');
}
function enterGame3(){
 if(props.comms)props.comms.visible=false;
 document.body.classList.remove('cine');
 document.body.classList.add('landing');
 if(hasTHREE){
  cabinRoot.visible=false;terraRoot.visible=true;
  scene.background=new THREE.Color(0x000104);
  buildRover();
 }
 $('skipBtn').style.display='none';
 setGhudMode('rover');
 $('ghud').style.display='flex';$('limits').style.display='block';
 $('padCtl').style.display='flex';
 setObjective('First ice: reach the shadowed floor and drill');
 $('objWrap').style.display='flex';
 R3.attempts++;
 resetTraverse();
 setAmb(0,1);padToMinor();
 setMix('GAME2',2.5);
 const slug=$('slug');
 slug.textContent='Sol 3 \u00b7 The Ice Traverse \u00b7 '+
  ((gameState.flags.baiterek||gameState.flags.baiterekEden)?'Baiterek Station':'Shackleton Base');
 slug.classList.add('show');setTimeout(()=>slug.classList.remove('show'),4200);
 setTimeout(()=>{if(gameState.scene==='GAME3')
  callout('eng',"Rover's yours. The floor eats heat and batteries \u2014 heaters buy warmth with charge. Spend wisely.");},1200);
}
function fail3(kind){
 gameState.scene='CRASH3';
 setAlarmLevels(0,0,0);setRumbleDrive(0);
 $('padCtl').style.display='none';
 const line=kind==='batt'?
  ['flight',"Eden, your power bus just flatlined. Recovery team has the rover \u2014 recharge and go again."]:
  ['eng',"Thermal cutoff. Everything froze solid, including my patience. Towing you back \u2014 again."];
 callout(line[0],line[1],line[0]==='flight');
 setTimeout(()=>{if(gameState.scene==='CRASH3')go('GAME3');},4200);
}
function roverUpdate(dt){
 /* heaters toggle on thrust tap (drive mode); hold-to-drill at the rig */
 const atSite=Math.abs(R3.x-DRILL_X)<6&&Math.abs(R3.v)<.35;
 if(atSite&&R3.mode==='drive'){
  R3.mode='drill';$('thrust').textContent='Hold \u00b7 Drill';
  milestone3('site',()=>callout('sci',"This is it. Four billion years of dark under the treads. Spin it up."));
 }
 if(!atSite&&R3.mode==='drill'&&R3.core<=0){R3.mode='drive';$('thrust').textContent='Heaters: '+(R3.heaters?'ON':'OFF')+' \u00b7 tap';}
 if(R3.mode==='drive'){
  if(G2.inThrust&&!R3.prevThrust){
   R3.heaters=!R3.heaters;sfxBeep(R3.heaters?900:500);
   $('thrust').textContent='Heaters: '+(R3.heaters?'ON':'OFF')+' \u00b7 tap';}
 }
 R3.prevThrust=G2.inThrust;
 /* drive */
 const s=slopeAt(R3.x);
 let a=0;
 if(G2.inL)a-=B3.ACC;
 if(G2.inR)a+=B3.ACC;
 R3.v+=(a-B3.GSL*s-B3.FRIC*R3.v)*dt;
 R3.v=Math.max(-R3.maxV,Math.min(R3.maxV,R3.v));
 R3.x+=R3.v*dt;
 R3.x=Math.max(-310,Math.min(PAD_X+12,R3.x));
 const gy=terrainH(R3.x);
 rover3.position.set(R3.x,gy+.75,0);
 rover3.rotation.z=Math.atan(s)*.8;
 wheels3.forEach(w=>w.rotation.y-=R3.v*dt*1.4);
 /* dust kick */
 if(Math.abs(R3.v)>1.2){
  const n=Math.floor(Math.abs(R3.v)*10*dt)+1;
  for(let i=0;i<n;i++)
   emitP(lDust,R3.x-Math.sign(R3.v)*2,gy+.5,(Math.random()-.5)*2,
    -R3.v*.4+(Math.random()-.5),1+Math.random(),(Math.random()-.5)*2,.5+Math.random()*.3);
 }
 /* dark + light */
 const dark=darkAt(R3.x);
 roverLight.intensity=dark*1.7;
 roverBeam.material.opacity=dark*.22;
 roverBeam.scale.x=Math.sign(R3.v||1);
 /* thermal */
 const target=dark>0.4?(R3.heaters?-46:-82):(R3.heaters?18:5);
 R3.T+=(target-R3.T)*dt/6;
 /* battery */
 let drain=B3.DRV*Math.abs(R3.v)/B3.MAXV+(R3.heaters?R3.heaterDraw:0);
 /* drill */
 if(R3.mode==='drill'){
  if(R3.cool>0)R3.cool-=dt;
  const drilling=G2.inThrust&&R3.cool<=0&&R3.core<100;
  if(drilling){
   R3.heat+=B3.HEATUP*dt;drain+=B3.DRILL;
   R3.core=Math.min(100,R3.core+R3.drillRate*dt);
   setRumbleDrive(.5);shakeAmp=.1;
   if(R3.heat>=R3.heatLim){R3.cool=3;R3.overheats++;sfxKlaxon();
    callout('eng',"Bit's glowing! Let it breathe.");}
  }else{R3.heat=Math.max(0,R3.heat-B3.COOL*dt);setRumbleDrive(0);shakeAmp=0;}
  drillRig.userData.lamp.material.color.setHex(drilling?0xffc06a:0x6fd8c8);
  if(R3.core>=100&&!R3.done){R3.done=true;iceExtraction();return;}
  if(R3.core>=50)milestone3('half',()=>callout('sci',"Half a meter. The cuttings are SHINING."));
 }else{setRumbleDrive(Math.min(.25,Math.abs(R3.v)*.05));shakeAmp=Math.abs(R3.v)*.012;}
 R3.batt=Math.max(0,R3.batt-drain*dt);
 /* milestones */
 if(R3.x<20)milestone3('roll',()=>callout('flight',"Traverse is go. The floor never answers, Eden \u2014 don't take it personally.",true));
 if(dark>.5)milestone3('dark',()=>callout('cdr',"Light switch. Whole world just went out."));
 if(R3.batt<R3.batt0*.3)milestone3('batt30',()=>{
  $('fuelBar').classList.add('low');
  callout('eng',"Battery's talking. Heaters or wheels \u2014 pick one.");});
 /* fails */
 if(R3.batt<=0)return fail3('batt');
 if(R3.T<=-70)return fail3('cold');
 updateRoverHud();
}
function milestone3(k,fn){if(!R3.flags[k]){R3.flags[k]=true;fn();}}
function updateRoverHud(){
 const tE=$('hAlt');tE.textContent=R3.T.toFixed(0)+'\u00b0C';
 tE.className='v'+(R3.T<-55?' bad':R3.T<-40?' warn':'');
 $('hVs').textContent=R3.mode==='drill'?('BIT '+R3.heat.toFixed(0)+'%'):(R3.heaters?'ON':'OFF');
 $('hVs').className='v'+(R3.mode==='drill'&&R3.heat>R3.heatLim*.8?' warn':'');
 $('hHs').textContent=Math.abs(R3.x-DRILL_X).toFixed(0)+' m';
 const s=Math.abs(slopeAt(R3.x));
 const sE=$('hTilt');sE.textContent=(s*100).toFixed(0)+'%';
 sE.className='v'+(s>.5?' bad':s>.35?' warn':'');
 const pct=R3.batt/R3.batt0*100;
 $('hFuel').textContent=pct.toFixed(0)+'%';
 $('fuelBar').firstElementChild.style.width=pct+'%';
 setAlarmLevels(
  R3.T<-55?1:R3.T<-40?.5:0,
  pct<15?1:pct<30?.5:0,
  s>.5?1:s>.35?.5:0);
}
function iceExtraction(){
 gameState.scene='ICE3';setMix('TOUCH2',2);
 setAlarmLevels(0,0,0);setRumbleDrive(0);shakeAmp=.1;
 sfxThud();
 for(let i=0;i<40;i++)
  emitP(lDust,DRILL_X+(Math.random()-.5)*3,terrainH(DRILL_X)+.5,(Math.random()-.5)*3,
   (Math.random()-.5)*6,2+Math.random()*3,(Math.random()-.5)*3,1+Math.random()*.5);
 $('padCtl').style.display='none';$('ghud').style.display='none';
 $('limits').style.display='none';$('objWrap').style.display='none';
 document.body.classList.remove('landing');
 document.body.classList.add('cine');
 $('skipBtn').style.display='block';
 gameState.log.push('Pulled the first ice core: attempt '+R3.attempts+', '+R3.overheats+' overheats.');
 if(gameState.flags.icePremiere){setStat('publicSupport',2);
  gameState.log.push('The core premiere aired live. Support surged.');}
 const seq=[
  [400,()=>callout('sci',"Core's up... Commander. That's ice. Real, ancient, drinkable \u2014 well, eventually \u2014 ICE.")],
  [4800,()=>callout('cdr',"Copy the assay, log the depth. Twelve kilograms a day just stopped being a maybe.")],
  [8600,()=>callout('flight',"Copy first ice, Eden. Down here they're already arguing about what to build with it. Don't stop.",true)],
  [12400,()=>{showSub(null,'(in the dark, the melody keeps the harmonica\u2019s three notes close)',true);
    padToMajor();if(AM.ctx)AM.layers.melody.gain.linearRampToValueAtTime(.5,AM.ctx.currentTime+3);}],
  [17200,()=>go('REPORT3')]
 ];
 R3.iceTimers=seq.map(([ms,fn])=>setTimeout(()=>{if(gameState.scene==='ICE3')fn();},ms));
}
function skipExtraction(){
 (R3.iceTimers||[]).forEach(clearTimeout);
 cancelVoice();padToMajor();
 go('REPORT3');
}
function openReport3(){
 hideSub();document.body.classList.remove('cine');
 setArp(.5,4);
 const pct=R3.batt/R3.batt0*100;
 const grade=(R3.attempts===1&&R3.overheats===0&&pct>=25)?'A':
  (R3.attempts<=2&&R3.overheats<=2)?'B':'C';
 $('grade3').textContent=grade;
 $('grade3').style.color=grade==='A'?'var(--go)':grade==='B'?'var(--accent)':'var(--dawn)';
 $('end3Lede').textContent='First ice is in cold stowage. The import ledger just lost a line item.';
 const rows=[
  'Core: 1.4 m \u00b7 assay confirms 12 kg/day'+(gameState.flags.jointAssay?' \u00b7 certified to the joint EU standard':''),
  'Battery margin: '+pct.toFixed(0)+'% \u00b7 bit overheats: '+R3.overheats+' \u00b7 attempts: '+R3.attempts,
  gameState.flags.roverPartner?'The co-developed drivetrain earned its crate. Tokyo will hear about it.':
   'The rover held. The dark did not win.',
  (gameState.flags.baiterek||gameState.flags.baiterekEden?'Baiterek':'The base')+
   ' now runs on water it did not bring.'
 ];
 if(gameState.flags.mediaDeal)rows.push('The documentary crew got their third act. \ud83d\udccb');
 const rr=$('end3Rows');rr.innerHTML='';
 rows.forEach(t=>{const d=document.createElement('div');d.textContent=t;rr.appendChild(d);});
 $('end3Card').style.display='flex';
}
$('again3Btn').addEventListener('click',()=>{
 sfxClick();
 $('end3Card').style.display='none';
 padToMinor();
 go('GAME3');
});

/* ================= Chapter 4: The Import Ledger ================= */
let baseGrp=null,baseParts={};
/* @c4-start */
const C4={
 WINDOWS:8,H0:300,CREW_W:40,FOOD_NEED:100,FOOD_CAP0:30,
 MINE:1.6,GREEN:.75,ELEC:.55,ELEC_W:1.0,GREEN_W:1.0,RIG:210,
 PWR_BASE:6,PWR_SOLAR:9,LOAD:2.2,D_MINE:.015,D_GREEN:.03,D_ELEC:.06,
 KGM:.14,W_KG:165,F_KG:320,P_KG:260,S_KG:140,
 APPROP:40,APPROP_SUP:12,MAINT_N:40,
 PROJ:{elec:{n:'Electrolyzer skid',h:240,c:180,d:'unlocks propellant · power-hungry'},
  green:{n:'Greenhouse module',h:300,c:260,d:'food cap 30% \u2192 100%'},
  printer:{n:'Spares printer',h:200,c:150,d:'halves the spares line \u00b7 calms the regulator ghost'},
  hab2:{n:'Second habitat',h:340,c:300,d:'stops morale decay \u00b7 +40 crew-hours'}}
};
function c4Mods(gs){
 return {
  mine:C4.MINE*(gs.flags.jointAssay?1.1:1),
  rig:C4.RIG*(gs.flags.jointAssay?1.1:1),
  green:C4.GREEN,elec:C4.ELEC,
  pwr:C4.PWR_BASE+(gs.payloads.includes('solar')?C4.PWR_SOLAR:0),
  disc:gs.flags.resupplyDiscount||0,
  bdBase:.34-(gs.flags.jpTelemetry?.05:0),
  waivedGhost:!!gs.flags.waivedAnomaly,
  buildMul:1
 };
}
function econWindow(S,A,M,rnd){
 const R={notes:[],retired:[],incident:false};
 const morMul=1-Math.max(0,3-S.morale)*.1;
 const demand=C4.LOAD+A.mine*C4.D_MINE+A.green*C4.D_GREEN+A.elec*C4.D_ELEC;
 const pu=Math.min(1,M.pwr/Math.max(.1,demand));
 R.pu=pu;
 let mined=(M.rig+A.mine*M.mine*morMul)*(1+(S.sciDone>=1?.1:0))*pu;
 if(S.vein)mined*=1.15;
 let foodU=Math.min(S.foodCap,A.green*M.green*morMul*pu);
 let propMade=S.built.elec?A.elec*M.elec*morMul*pu:0;
 const crewNeed=C4.CREW_W*S.crew;
 let waterUse=crewNeed+foodU*C4.GREEN_W+propMade*C4.ELEC_W;
 S.water+=mined;
 if(S.water<waterUse){const scale=S.water/waterUse;
  foodU*=scale;propMade*=scale;waterUse=S.water;
  R.notes.push('Water ran short \u2014 production scaled back.');}
 S.water-=waterUse;S.water=Math.max(0,S.water);
 S.prop+=propMade;S.foodPct=Math.min(100,Math.round(foodU/C4.FOOD_NEED*100));
 /* maintenance + breakdowns */
 S.maint=Math.max(0,Math.min(5,S.maint+(A.maint-C4.MAINT_N)/60));
 let bd=Math.max(.04,Math.min(.5,M.bdBase-.06*S.maint+(M.waivedGhost&&!S.built.printer?.06:0)));
 if(rnd()<bd){R.incident=true;S.morale=Math.max(0,S.morale-1);
  S.water*=.95;R.spareSurcharge=22;
  R.notes.push('Breakdown \u2014 spares surcharge, water loss, morale hit.');}
 /* science */
 S.sciH+=A.sci;
 while(S.sciH>=70&&S.sciDone<3){S.sciH-=70;S.sciDone++;
  R.notes.push(['Survey: richer ice seam mapped (+10% mining).',
   'Survey: sinter process proven (+20% build speed).',
   'Survey: export study filed (+$40M one-time).'][S.sciDone-1]);
  if(S.sciDone===2)M.buildMul=1.2;
  if(S.sciDone===3)S.budgetBonus=(S.budgetBonus||0)+40;}
 /* construction */
 if(S.proj){S.proj.p+=A.build*M.buildMul;
  if(S.proj.p>=C4.PROJ[S.proj.id].h){
   S.built[S.proj.id]=true;
   R.notes.push(C4.PROJ[S.proj.id].n+' complete.');
   if(S.proj.id==='green')S.foodCap=100;
   if(S.proj.id==='hab2'){S.hab2=true;}
   S.proj=null;}}
 /* the ledger */
 const cover_w=Math.min(1,mined/Math.max(1,waterUse));
 const lines={
  water:Math.round(C4.W_KG*S.crew/3*(1-cover_w)),
  food:Math.round(C4.F_KG*(1-S.foodPct/100)),
  prop:S.prop>=260?0:C4.P_KG,
  spares:Math.round(C4.S_KG*(S.built.printer?.5:1))};
 for(const k in lines){
  if(lines[k]===0&&!S.retired[k]){S.retired[k]=true;R.retired.push(k);
   S.support=Math.min(5,S.support+1);}}
 const impKg=lines.water+lines.food+lines.prop+lines.spares;
 const impCost=impKg*C4.KGM*(1-M.disc)+(R.spareSurcharge||0);
 const approp=(S.appropCut?22:C4.APPROP)+S.support*C4.APPROP_SUP+(S.budgetBonus||0);
 S.budgetBonus=0;
 S.budget+=Math.round(approp-impCost);
 R.lines=lines;R.impCost=Math.round(impCost);R.approp=Math.round(approp);
 /* drift */
 if(S.w===4&&!S.hab2){S.morale=Math.max(0,S.morale-1);
  R.notes.push('Rotation fatigue \u2014 morale slips.');}
 if(S.foodPct>=40&&!S.fed40){S.fed40=true;S.morale=Math.min(5,S.morale+1);
  R.notes.push('Fresh food at 40% \u2014 the galley smells alive. Morale up.');}
 S.w++;
 return R;
}
/* @c4-end */
let S4=null,A4=null,M4=null;
const STREAM_DEFS=[
 ['mine','Mine ice','kg of water from the dark'],
 ['green','Greenhouse','grow food \u00b7 uses water + power'],
 ['elec','Electrolysis','water \u2192 propellant \u00b7 needs the skid'],
 ['maint','Maintenance','40h holds the line \u00b7 more banks reliability'],
 ['sci','Science','surveys unlock permanent boosts'],
 ['build','Construction','hours into the active project']
];
/* @c4rt-start */
/* Shackleton astronomy: T in sols (Earth days). Synodic 29.5306 d, draconic 27.2122 d. */
const AST={SYN:29.5306,DRA:27.2122,az0:1.1,ph0:2.2};
function astro(T){
 const az=2*Math.PI*(T/AST.SYN)+AST.az0;
 const elevDeg=1.54*Math.sin(2*Math.PI*T/AST.DRA+AST.ph0);
 /* rim altitude buys ~1.2 deg of horizon; the far crater wall steals a sector */
 let sf=Math.max(0,Math.min(1,(elevDeg+1.7)/1.9));
 const azd=((az%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
 if(azd>3.7&&azd<4.35)sf*=.3;
 const el=Math.max(elevDeg,-4)*Math.PI/180;
 const sunDir={x:Math.cos(az)*Math.cos(el),y:Math.sin(el)+.06,z:Math.sin(az)*Math.cos(el)*.6-.35};
 const earthEl=(3+4*Math.sin(2*Math.PI*T/AST.DRA+.7))*Math.PI/180;
 return {az,elevDeg,sf,sunDir,earthEl};
}
const CREWD={
 cdr:{nm:'COMMANDER',c:'#9fc2e8',i:'CD',sk:{mine:3,green:2,elec:2,maint:3,sci:2,build:3}},
 eng:{nm:'CHIEF ENGINEER',c:'#ff9d5c',i:'CE',sk:{mine:3,green:1,elec:5,maint:5,sci:2,build:4}},
 sci:{nm:'PAYLOAD SCIENTIST',c:'#ffc06a',i:'PS',sk:{mine:2,green:5,elec:2,maint:1,sci:5,build:2}},
 esa:{nm:'ESA SPECIALIST',c:'#b09fe8',i:'EU',sk:{mine:2,green:4,elec:3,maint:3,sci:4,build:3}}
};
const TASKS=[['mine','Mine'],['green','Greenhouse'],['elec','Electrolysis'],
 ['maint','Maintain'],['sci','Survey'],['build','Build'],['rest','Rest']];
function effOf(id,task){
 if(task==='rest')return 1;
 return .55+.15*(CREWD[id].sk[task]||1);
}
function accrueSol(Sc,assign,hoursAcc){
 for(const id in assign){
  const t=assign[id];
  if(t==='rest'){Sc.energy[id]=Math.min(100,Sc.energy[id]+(Sc.hab2?8:6));continue;}
  Sc.energy[id]=Math.max(0,Sc.energy[id]-(Sc.hab2?.8:1));
  const em=.6+Sc.energy[id]/250;
  hoursAcc[t]=(hoursAcc[t]||0)+4.1*effOf(id,t)*em;
 }
}
/* @c4rt-end */
let SPD=1;const SPD_V=[0,1,4,16],SOL_SEC=10;
let crewFigs={},POI={};
function makeSurfaceCrew(hex){
 const g=new THREE.Group();
 const suit=new THREE.MeshPhongMaterial({color:0xe8e9ec,flatShading:true});
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.5,.6,1.3,8),suit);
 body.position.y=1.25;g.add(body);
 const helm=new THREE.Mesh(new THREE.SphereGeometry(.42,10,8),
  new THREE.MeshPhongMaterial({color:0xd8e4ee,shininess:70,specular:0xffffff}));
 helm.position.y=2.25;g.add(helm);
 const visor=new THREE.Mesh(new THREE.SphereGeometry(.3,8,6),
  new THREE.MeshBasicMaterial({color:hex}));
 visor.position.set(0,2.25,.2);g.add(visor);
 const pack=new THREE.Mesh(new THREE.BoxGeometry(.6,.9,.35),suit);
 pack.position.set(0,1.5,-.5);g.add(pack);
 const legs=[];
 [[-.22],[.22]].forEach(([x])=>{
  const l=new THREE.Mesh(new THREE.BoxGeometry(.24,.85,.3),suit);
  l.position.set(x,.45,0);g.add(l);legs.push(l);});
 const arm=new THREE.Mesh(new THREE.CylinderGeometry(.11,.1,.8,6),suit);
 arm.position.set(.62,1.5,.1);arm.rotation.z=-.5;g.add(arm);
 return {g,legs,arm,phase:Math.random()*7};
}
function buildColony(){
 POI={mine:[PAD_X-26,3],green:[PAD_X+6,5],elec:[PAD_X-9,3],
  maint:[PAD_X-2,-3.4],sci:[PAD_X+14,1],build:[PAD_X-14,5],rest:[PAD_X-.5,-6]};
 if(!baseParts.well){
  const met=new THREE.MeshPhongMaterial({color:0xd8dade,flatShading:true});
  const well=new THREE.Group();
  const der=new THREE.Mesh(new THREE.CylinderGeometry(.2,.5,4.5,6),met);
  der.position.y=2.2;well.add(der);
  const pipe=new THREE.Mesh(new THREE.BoxGeometry(38,.4,.4),
   new THREE.MeshPhongMaterial({color:0x6d7178}));
  pipe.position.set(-20,.5,0);well.add(pipe);
  well.position.set(PAD_X-26,PAD_TOP,3);
  baseGrp.add(well);baseParts.well=well;
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,4,6),met);
  mast.position.set(PAD_X+14,PAD_TOP+2,1);baseGrp.add(mast);
  const dish=new THREE.Mesh(new THREE.SphereGeometry(.6,8,6,0,Math.PI),met);
  dish.position.set(PAD_X+14,PAD_TOP+4,1);dish.rotation.x=-.7;baseGrp.add(dish);
 }
 for(const id in crewFigs)crewFigs[id].g.visible=false;
 const roster=['cdr','eng','sci'].concat(S4.partnerHere?['esa']:[]);
 roster.forEach((id,k)=>{
  if(!crewFigs[id]){
   crewFigs[id]=makeSurfaceCrew(parseInt(CREWD[id].c.slice(1),16));
   terraRoot.add(crewFigs[id].g);}
  const f=crewFigs[id];
  f.g.visible=true;
  f.g.position.set(PAD_X-2+k*2.2,PAD_TOP,-6);
 });
}
function renderCh4(){
 gameState.scene='CH4';
 $('winLab').textContent='WINDOW '+S4.w+' / '+C4.WINDOWS;
 stripCh4();
 const box=$('crewRows');box.innerHTML='';
 const roster=['cdr','eng','sci'].concat(S4.partnerHere?['esa']:[]);
 roster.forEach(id=>{
  const D=CREWD[id];
  const card=document.createElement('div');card.className='crewCard';card.dataset.id=id;
  const en=Math.round(S4.energy[id]);
  const task=S4.assign[id];
  const eff=Math.round((effOf(id,task)*(0.6+S4.energy[id]/250)-1)*100);
  card.innerHTML='<div class="top">'+
   '<div class="dot" style="border-color:'+D.c+';color:'+D.c+'">'+D.i+'</div>'+
   '<div class="nm">'+D.nm+'<span class="doing">'+
    TASKS.find(t=>t[0]===task)[1]+(task!=='rest'?' \u00b7 '+(eff>=0?'+':'')+eff+'%':'')+'</span></div>'+
   '<div class="en"><div class="enBar'+(en<25?' low':'')+'"><i style="width:'+en+'%"></i></div></div></div>'+
   '<div class="chips"></div>';
  const chips=card.querySelector('.chips');
  TASKS.forEach(([tid,tn])=>{
   if(tid==='elec'&&!S4.built.elec)return;
   const b=document.createElement('button');
   const pct=tid==='rest'?null:Math.round((effOf(id,tid)-1)*100);
   b.innerHTML=tn+(pct===null?'':'<b'+(pct<0?' class="neg"':'')+'>'+(pct>=0?'+':'')+pct+'%</b>');
   if(S4.assign[id]===tid)b.classList.add('sel');
   b.addEventListener('click',e=>{
    e.stopPropagation();sfxClick();
    S4.assign[id]=tid;
    card.classList.remove('open');
    renderCh4();
   });
   chips.appendChild(b);
  });
  card.querySelector('.top').addEventListener('click',()=>{
   document.querySelectorAll('.crewCard.open').forEach(c=>{if(c!==card)c.classList.remove('open');});
   card.classList.toggle('open');sfxClick();
  });
  box.appendChild(card);
 });
 renderProject();renderLedger(S4.lastR||null);
 $('ch4').style.display='flex';
 $('timeCtl').style.display='flex';
}
function stripCh4(){
 const a=astro(S4.T);
 const pwrNow=Math.round(C4.PWR_BASE+(gameState.payloads.includes('solar')?C4.PWR_SOLAR*a.sf:0));
 $('ch4Strip').innerHTML='WATER <b>'+Math.round(S4.water)+'</b> \u00b7 PROP <b>'+Math.round(S4.prop)+
  '</b> \u00b7 FOOD <b>'+S4.foodPct+'%</b> \u00b7 PWR <b>'+pwrNow+' kW</b>'+
  (a.sf<.35&&gameState.payloads.includes('solar')?' \u26a0':'');
 $('solLab').textContent='SOL '+Math.floor(40+S4.T)+' \u00b7 W'+S4.w+' \u00b7 RESUPPLY '+
  Math.max(0,Math.ceil(S4.w*30-S4.T))+' SOLS';
}
[0,1,2,3].forEach(i=>{
 $('spd'+i).addEventListener('click',()=>{
  SPD=i;sfxClick();
  [0,1,2,3].forEach(j=>$('spd'+j).classList.toggle('on',j===i));
 });
});
$('panelTog').addEventListener('click',e=>{
 e.stopPropagation();sfxClick();
 const min=$('ch4').classList.toggle('min');
 $('panelTog').textContent=min?'Crew \u25b4':'Map \u25be';
});
function ch4Update(dtReal){
 if($('dialog').style.display==='block')return;
 const spd=SPD_V[SPD];
 const dSol=dtReal*spd/SOL_SEC;
 if(dSol>0){
  S4.T+=dSol;
  S4.pwrInt+=astro(S4.T).sf*dSol;
  S4.solFrac+=dSol;
  while(S4.solFrac>=1){S4.solFrac-=1;accrueSol(S4,S4.assign,S4.A);}
  if(Math.floor(S4.T*2)!==S4._halfsol){S4._halfsol=Math.floor(S4.T*2);
   stripCh4();refreshEnergyBars();}
  if(S4.T>=S4.w*30)return resolveBoundary();
 }
 const spdV=2.1*Math.sqrt(Math.min(spd,4)||0);
 for(const id in crewFigs){
  const f=crewFigs[id];if(!f.g.visible)continue;
  const p=POI[S4.assign[id]]||POI.rest;
  const dx=p[0]-f.g.position.x,dz=p[1]-f.g.position.z;
  const d=Math.hypot(dx,dz);
  if(d>1.1&&spd>0){
   f.g.position.x+=dx/d*spdV*dtReal;
   f.g.position.z+=dz/d*spdV*dtReal;
   f.g.rotation.y=Math.atan2(dx,dz);
   const t=performance.now()*.011+f.phase;
   f.legs[0].rotation.x=Math.sin(t)*.7;
   f.legs[1].rotation.x=-Math.sin(t)*.7;
   f.g.position.y=PAD_TOP+Math.abs(Math.sin(t))*.12;
  }else{
   f.legs[0].rotation.x*=.9;f.legs[1].rotation.x*=.9;
   f.g.position.y=PAD_TOP;
   if(S4.assign[id]!=='rest'&&spd>0){
    f.arm.rotation.z=-.5+Math.sin(performance.now()*.006+f.phase)*.4;
    if(S4.assign[id]==='mine'&&Math.random()<dtReal*2)
     emitP(lDust,f.g.position.x+.8,PAD_TOP+.3,f.g.position.z,
      (Math.random()-.5)*3,1+Math.random(),(Math.random()-.5)*3,.5);
   }
  }
 }
}
function refreshEnergyBars(){
 document.querySelectorAll('.crewCard').forEach(c=>{
  const id=c.dataset.id,en=Math.round(S4.energy[id]);
  const bar=c.querySelector('.enBar');if(!bar)return;
  bar.classList.toggle('low',en<25);
  bar.firstElementChild.style.width=en+'%';
 });
}
function resolveBoundary(){
 SPD=0;[0,1,2,3].forEach(j=>$('spd'+j).classList.toggle('on',j===0));
 M4.pwr=C4.PWR_BASE+(gameState.payloads.includes('solar')?C4.PWR_SOLAR*(S4.pwrInt/30):0);
 S4.pwrInt=0;
 const A={mine:0,green:0,elec:0,maint:0,sci:0,build:0};
 for(const k in A)A[k]=Math.round(S4.A[k]||0);
 S4.A={};
 const R=econWindow(S4,A,M4,Math.random);
 S4.lastR=R;
 gameState.date=['September 2031','October 2031','November 2031','December 2031',
  'January 2032','February 2032','March 2032','April 2032'][Math.min(7,S4.w-2)];
 renderCh4Hud();
 if(hasTHREE)renderBase();
 let t=300;
 if(R.incident){setTimeout(sfxKlaxon,t);t+=500;}
 R.notes.forEach(n=>{setTimeout(()=>toast(n,true),t);t+=1700;});
 R.retired.forEach(k=>{setTimeout(()=>{sfxChime();
  callout('flight','Ledger update: '+{water:'water',food:'food',prop:'the propellant reserve',spares:'spares'}[k]+' is now local. Strike the line.',true);
  gameState.log.push('Retired import line: '+k+'.');},t);t+=2600;});
 setTimeout(()=>{
  if(S4.budget<0){
   if(!S4.bailout){S4.bailout=true;S4.budget=60;S4.support=Math.max(0,S4.support-2);
    toast('Emergency appropriation \u2014 Support falls.',true);}
   else{return openReport4(true);}
  }
  if(S4.w>C4.WINDOWS)return go('CH4_END');
  runCh4Event(R,()=>{if(S4.partnerHere&&!crewFigs.esa)buildColony();renderCh4();
   toast('Window '+S4.w+' \u2014 assign the crew, then press play.',true);});
 },t+400);
}
function enterCh4(){
 document.body.classList.remove('cine');
 $('end3Card').style.display='none';
 if(hasTHREE){
  terraRoot.visible=true;cabinRoot.visible=false;
  scene.background=new THREE.Color(0x000104);
  if(rover3)rover3.visible=false;
  buildBase();
 }
 $('hud').style.display='flex';updateHUD();
 S4={w:1,crew:3,T:0,pwrInt:0,solFrac:0,_halfsol:-1,A:{},lastR:null,
  assign:{cdr:'mine',eng:'build',sci:'sci'},
  energy:{cdr:100,eng:100,sci:100,esa:100},
  water:120,prop:0,foodPct:0,foodCap:C4.FOOD_CAP0,
  maint:Math.max(0,Math.min(5,2+gameState.stats.reliability)),
  morale:gameState.stats.morale,support:gameState.stats.publicSupport,
  budget:gameState.stats.budget,built:{},proj:null,retired:{},
  sciH:0,sciDone:0,vein:false,hab2:false,fed40:false,appropCut:false,
  usedEvents:{},partnerHere:false};
 M4=c4Mods(gameState);
 SPD=1;[0,1,2,3].forEach(j=>$('spd'+j).classList.toggle('on',j===1));
 buildColony();
 gameState.date='August 2031';
 const slug=$('slug');
 slug.textContent='Sol 40 \u00b7 Surface operations \u00b7 Year One';
 slug.classList.add('show');setTimeout(()=>slug.classList.remove('show'),4200);
 setObjective('Retire the import ledger');
 $('objWrap').style.display='flex';
 setArp(.35,3);
 showDialog([
  {s:'flight',t:"Eden, ops handover. From here the mission is a spreadsheet with a heartbeat: every kilogram you make up there is one we don't launch. The ledger's on your screen. Make it shorter."},
  {s:'eng',t:"Three hundred crew-hours a window. Spend them like propellant \u2014 which, if you build my electrolyzer, they literally become."},
  {s:'sci',t:"And feed the greenhouse! A base that grows nothing is just a very expensive tent."}
 ],renderCh4);
}
function renderProject(){
 const pw=$('projWrap');
 if(S4.proj){
  const P=C4.PROJ[S4.proj.id];
  $('projName').textContent=P.n+' \u00b7 '+Math.min(100,Math.round(S4.proj.p/P.h*100))+'%';
  $('projBar').style.display='block';
  $('projBar').firstElementChild.style.width=Math.min(100,S4.proj.p/P.h*100)+'%';
  $('projPick').innerHTML='';
 }else{
  $('projName').textContent='no project';
  $('projBar').style.display='none';
  const pick=$('projPick');pick.innerHTML='';
  Object.keys(C4.PROJ).forEach(id=>{
   if(S4.built[id])return;
   const P=C4.PROJ[id];
   const b=document.createElement('button');
   b.textContent=P.n+' \u2014 $'+P.c+'M \u00b7 '+P.h+'h \u00b7 '+P.d;
   b.addEventListener('click',()=>{
    if(S4.budget<P.c)return toast('Budget won\u2019t cover the '+P.n+'.');
    S4.budget-=P.c;S4.proj={id,p:0};sfxChime();
    gameState.log.push('Started construction: '+P.n+'.');
    renderProject();renderCh4Hud();
   });
   pick.appendChild(b);
  });
 }
}
function renderLedger(R){
 const box=$('ledgerRows');
 [...box.querySelectorAll('.ledLine')].forEach(e=>e.remove());
 const lines=R?R.lines:{water:C4.W_KG,food:C4.F_KG,prop:C4.P_KG,spares:C4.S_KG};
 const names={water:'Water',food:'Food',prop:'Propellant reserve',spares:'Spare parts'};
 for(const k of['water','food','prop','spares']){
  const d=document.createElement('div');
  d.className='ledLine'+(S4.retired[k]?' retired':'');
  d.innerHTML='<span>'+names[k]+'</span><b>'+
   (S4.retired[k]?'LOCAL':lines[k]+' kg \u00b7 $'+Math.round(lines[k]*C4.KGM*(1-M4.disc))+'M')+'</b>';
  box.appendChild(d);
 }
}
function renderCh4Hud(){
 gameState.stats.budget=S4.budget;
 gameState.stats.morale=S4.morale;
 gameState.stats.publicSupport=S4.support;
 updateHUD();
}
/* ---- window events, flag-aware ---- */
function runCh4Event(R,done){
 const gs=gameState,F=gs.flags,u=S4.usedEvents;
 const pool=[];
 const ev=(id,cond,script)=>{if(cond&&!u[id])pool.push({id,script});};
 if(S4.w===4&&F.esaPartner&&!S4.partnerHere){
  u.esa=true;S4.partnerHere=true;S4.crew=4;
  S4.energy.esa=100;S4.assign.esa='green';
  return showDialog([
   {s:'flight',t:"Cargo's down \u2014 and it walked off the pallet. Your European crew member is aboard, Eden. Plus one hundred crew-hours a window."},
   {s:'sci',t:"They brought seeds. SEEDS. I have a colleague and a seed bank. Best resupply ever."}
  ],done);
 }
 if(S4.w===6){
  u.congress=true;
  const good=S4.support>=4;
  return showDialog([
   {s:'press',t:good?
    "The vote came in. The Lunar Authority is funded through the decade \u2014 your ledger charts were on the floor of the chamber.":
    "The vote came in tight. Appropriations survive, but trimmed \u2014 the base appropriation drops until the ledger looks shorter.",
    fx:()=>{if(good){S4.budget+=300;gameState.log.push('Decade funding secured.');}
     else{S4.appropCut=true;gameState.log.push('Appropriations trimmed at the year vote.');}}}
  ],done);
 }
 ev('reg',F.waivedAnomaly&&!S4.built.printer&&R.incident,[
  {s:'eng',t:"Found the breakdown. It's the waived regulator's cousin \u2014 same lot number. I am saying this calmly.",
   choices:[
    {label:'"Build the spares printer next. We stop importing this problem."',tags:'queues the printer',
     fx:()=>{toast('Printer prioritized.');},next:[{s:'eng',t:"Finally. I'll clear a bay."}]},
    {label:'"Log it and fly on. The margin holds."',tags:'+1 Morale \u00b7 the ghost stays',
     fx:()=>{S4.morale=Math.min(5,S4.morale+1);},next:[{s:'eng',t:"Logged. Verbatim, as promised."}]}]}]);
 ev('vein',F.roverPartner&&S4.sciDone>=1&&!S4.vein,[
  {s:'sci',t:"The joint rover finished the deep map. There's a seam under the east wall twice as rich as ours.",
   fx:()=>{S4.vein=true;gameState.log.push('Rich seam mapped by the joint rover.');},
   choices:[{label:'"Re-task the drill. Mine the seam."',tags:'+15% water permanently',
    next:[{s:'sci',t:"Tokyo's rover, our drill. The ledger never stood a chance."}]}]}]);
 ev('cast',F.broadcast,[
  {s:'press',t:"The network is calling in the prime-time promise. It's forty crew-hours of prep, or a very public no.",
   choices:[
    {label:'"We do the broadcast."',tags:'\u221240h next window \u00b7 +2 Support',
     fx:()=>{S4.support=Math.min(5,S4.support+2);
      Object.keys(S4.energy).forEach(k=>S4.energy[k]=Math.max(0,S4.energy[k]-15));},
     next:[{s:'press',t:"Sixty million people watched a greenhouse. Extraordinary."}]},
    {label:'"Postpone it. The ledger is the show."',tags:'\u22121 Support',
     fx:()=>{S4.support=Math.max(0,S4.support-1);},
     next:[{s:'press',t:"The network is\u2026 displeased. Noted."}]}]}]);
 ev('doc',F.mediaDeal,[
  {s:'sci',t:"The documentary crew's camera drone got into the greenhouse. Again.",
   choices:[
    {label:'"Give them one supervised day, then lock the bay."',tags:'+$60M licensing',
     fx:()=>{S4.budget+=60;},next:[{s:'press',t:"The footage is gorgeous. The check is signed."}]},
    {label:'"Ground the drone. Crew space is crew space."',tags:'+1 Morale',
     fx:()=>{S4.morale=Math.min(5,S4.morale+1);},next:[{s:'eng',t:"Thank you. It hums in F sharp. It was driving me insane."}]}]}]);
 ev('audit',F.cnAudited&&S4.maint>=3,[
  {s:'flight',t:"Beijing's inspection team filed their report: 'exemplary'. The clause pays out both directions \u2014 there's a transfer clearing now.",
   fx:()=>{S4.budget+=80;gameState.log.push('Inspection clause payout: +$80M.');}}]);
 ev('kids',F.baiterek||F.baiterekEden,[
  {s:'sys',t:'\u2014 downlink: 4,000 drawings of a silver tree, from schools across the steppe \u2014',noVoice:true,
   fx:()=>{S4.morale=Math.min(5,S4.morale+1);}},
  {s:'cdr',t:"Print a few for the galley wall. Baiterek should see what it means down there."}]);
 ev('flare',S4.w>=2,[
  {s:'flight',t:"Solar proton event inbound, four hours' warning. Shelter costs you the surface shift.",
   choices:[
    {label:'"Shelter the crew. Full stop."',tags:'\u221230h next window',
     fx:()=>{Object.keys(S4.energy).forEach(k=>S4.energy[k]=Math.max(0,S4.energy[k]-12));},
     next:[{s:'cdr',t:"Everything with a pulse goes behind the water wall. Move."}]},
    {label:'(\ud83d\udd27) "Ride it out in the hab \u2014 the water tanks shield better than the book says."',req:'eng',showLocked:true,
     tags:'no loss \u00b7 a little gray hair',
     fx:()=>{},next:[{s:'eng',t:"Dosimeters say I was right. My hands say never again."}]}]}]);
 ev('night',S4.morale<=2,[
  {s:'cdr',t:"Crew's running on fumes. I'm calling a harmonica night \u2014 lights low, work stops at eight.",
   fx:()=>{S4.morale=Math.min(5,S4.morale+1);playHarmonicaPhrase();},
   choices:[{label:'"Approved. Some maintenance is for people."',tags:'+1 Morale',
    next:[{s:'sci',t:"He's getting better at it. Don't tell him I said that."}]}]}]);
 if(!pool.length)return done();
 const pick=pool[Math.floor(Math.random()*pool.length)];
 u[pick.id]=true;
 showDialog(pick.script,done);
}
/* ---- the base grows ---- */
function buildBase(){
 if(baseGrp){baseGrp.visible=true;return;}
 baseGrp=new THREE.Group();
 const met=new THREE.MeshPhongMaterial({color:0xd8dade,flatShading:true});
 const gold=new THREE.MeshPhongMaterial({color:0xc8a24a,flatShading:true});
 const hab=new THREE.Mesh(new THREE.CylinderGeometry(3,3,4,12),met);
 hab.rotation.z=Math.PI/2;hab.position.set(PAD_X-2,PAD_TOP+2,-6);
 baseGrp.add(hab);baseParts.hab=hab;
 if(gameState.payloads.includes('solar')){
  for(let i=0;i<3;i++){
   const p=new THREE.Mesh(new THREE.BoxGeometry(5,.2,2.4),
    new THREE.MeshPhongMaterial({color:0x2a4a6e,shininess:60}));
   p.position.set(PAD_X+10+i*6,PAD_TOP+3.4,-4);p.rotation.z=.5;
   baseGrp.add(p);}}
 const tank=new THREE.Mesh(new THREE.SphereGeometry(1.6,10,8),met);
 tank.position.set(PAD_X-9,PAD_TOP+1.6,-3);baseGrp.add(tank);baseParts.tank=tank;
 const mk=(id,geo,mat,x,z)=>{const m=new THREE.Mesh(geo,mat);
  m.position.set(x,PAD_TOP+1.2,z);m.visible=false;baseGrp.add(m);baseParts[id]=m;return m;};
 mk('elec',new THREE.BoxGeometry(3,2.4,2.4),gold,PAD_X-9,3);
 const gh=mk('green',new THREE.SphereGeometry(2.6,10,8),
  new THREE.MeshPhongMaterial({color:0x9fd8a8,transparent:true,opacity:.55}),PAD_X+6,5);
 gh.scale.y=.7;
 mk('printer',new THREE.BoxGeometry(2,2,2),met,PAD_X-14,0);
 const h2=mk('hab2',new THREE.CylinderGeometry(3,3,4,12),met,PAD_X-2,7);
 h2.rotation.z=Math.PI/2;
 terraRoot.add(baseGrp);
}
function renderBase(){
 if(!baseGrp)return;
 for(const id of['elec','green','printer','hab2']){
  if(S4.built[id]&&baseParts[id]&&!baseParts[id].visible){
   baseParts[id].visible=true;
   for(let i=0;i<24;i++)
    emitP(lDust,baseParts[id].position.x,PAD_TOP+.5,baseParts[id].position.z,
     (Math.random()-.5)*8,1+Math.random()*3,(Math.random()-.5)*8,.8+Math.random()*.5);}}
 baseParts.tank.scale.setScalar(.6+Math.min(1,S4.water/800)*.8);
}
function openReport4(suspended){
 gameState.scene='CH4_END';
 $('ch4').style.display='none';$('timeCtl').style.display='none';hideSub();
 setMix('REPORT2',3);setArp(.5,4);padToMajor();
 const ret=Object.keys(S4.retired).length;
 const grade=suspended?'D':
  (S4.retired.water&&S4.prop>=260&&S4.foodPct>=40&&!S4.bailout&&S4.support>=4)?'A':
  (S4.retired.water&&(S4.prop>=150||S4.foodPct>=40))?'B':'C';
 $('grade4').textContent=grade;
 $('grade4').style.color=grade==='A'?'var(--go)':grade==='B'?'var(--accent)':grade==='C'?'var(--dawn)':'var(--bad)';
 const rows=[
  suspended?'Program suspended \u2014 the ledger outlived the budget.':
   'Year one complete: '+ret+' of 4 import lines retired.',
  'Water stock '+Math.round(S4.water)+' kg \u00b7 propellant '+Math.round(S4.prop)+' kg \u00b7 food '+S4.foodPct+'% local',
  'Budget $'+S4.budget+'M \u00b7 Support '+S4.support+'/5 \u00b7 Morale '+S4.morale+'/5',
  S4.built.printer&&gameState.flags.waivedAnomaly?
   'The regulator\u2019s ghost is finally printed out of the story. \ud83d\udd27':
   'The Chief still keeps one eye on the spares crate.',
  (gameState.flags.baiterek||gameState.flags.baiterekEden?'Baiterek':'Shackleton Base')+
   ' enters the long night '+(grade==='A'?'paying its own way.':'still owing Earth a few lines.')
 ];
 const rr=$('end4Rows');rr.innerHTML='';
 rows.forEach(t=>{const d=document.createElement('div');d.textContent=t;rr.appendChild(d);});
 gameState.log.push('Year one grade: '+grade+'.');
 $('end4Card').style.display='flex';
}
$('chap4Btn').addEventListener('click',()=>{
 sfxClick();$('end3Card').style.display='none';go('CH4');
});
$('restartBtn5').addEventListener('click',()=>{
 sfxClick();$('end4Card').style.display='none';resetGame();
});

/* ================= Crew Archive: chapter select ================= */
/* @arch-start */
const ARCH_CALL={
 'USA':[{broadcast:true},{icePremiere:true},{mediaDeal:true}],
 'French Guiana':[{esaPartner:true},{jointAssay:true},{}],
 'Kazakhstan':[{baiterek:true},{baiterekEden:true},{kzAudit:true}],
 'Japan':[{jpTelemetry:true},{roverPartner:true},{}],
 'China':[{cnResupply:true,resupplyDiscount:.25},{cnAudited:true},{}]
};
function rollHistory(n,rnd){
 rnd=rnd||Math.random;
 const pk=a=>a[Math.floor(rnd()*a.length)];
 const R={site:pk(SITES)};
 if(n>=2){
  R.background=pk(BACKGROUNDS).id;
  const ids=MODULES.map(m=>m.id);
  const p1=pk(ids),p2=pk(ids.filter(i=>i!==p1));
  R.payloads=[p1,p2];
  R.waived=rnd()<.4;
  R.stats={
   reliability:R.waived?0:(rnd()<.5?1:2),
   budget:1500+Math.floor(rnd()*7)*100+(R.background==='admin'?300:0),
   morale:2+Math.floor(rnd()*3),
   publicSupport:2+Math.floor(rnd()*3)};
 }
 if(n>=5)R.callFlags=pk(ARCH_CALL[R.site.country]||[{}]);
 return R;
}
/* @arch-end */
const ARCH_ROWS=[
 {n:1,go:'SITE_SELECT',t:'First Light',d:'Site, crew, manifest \u2014 and a launch window'},
 {n:2,go:'COAST',t:'The Coast',d:'Interlude \u2014 three days out, one harmonica'},
 {n:3,go:'ARRIVE2',t:'The Landing',d:'Lunar orbit to the Shackleton rim, by hand'},
 {n:4,go:'CH3_CALL',t:'First Ice',d:'The call home, then the traverse into the dark'},
 {n:5,go:'CH4',t:'The Import Ledger',d:'Year one \u2014 run the base, retire the lines'}
];
function forgeHistory(n){
 const R=rollHistory(n);
 resetGame();
 const gs=gameState;
 gs.site=R.site;
 if(n>=2){
  gs.background=R.background;
  gs.payloads=R.payloads.slice();
  gs.flags.waivedAnomaly=R.waived;
  Object.assign(gs.stats,R.stats);
  gs.log.push('['+gs.site.name+'] Launch nominal.'+(R.waived?' Helium anomaly waived.':''));
  NPCS.flight.radio=true;
 }
 if(n>=3)gs.date='June 2031';
 if(n>=4){gs.date='July 2031';gs.log.push('Eden is on the Moon.');}
 if(n>=5){
  Object.assign(gs.flags,R.callFlags||{});
  gs.log.push('First ice core in cold stowage.');
 }
 return R;
}
function archSummary(R,n){
 if(n<2)return null;
 const bg=BACKGROUNDS.find(b=>b.id===R.background).name;
 const pl=R.payloads.map(id=>MODULES.find(m=>m.id===id).name.replace(/ Kit| Rig| Core/,'')).join(' + ');
 let s='Forged record: '+R.site.name+' \u00b7 '+bg+' \u00b7 '+pl+(R.waived?' \u00b7 anomaly waived':'');
 if(n>=5&&R.callFlags){const k=Object.keys(R.callFlags)[0];if(k)s+=' \u00b7 deal: '+k;}
 return s;
}
(function buildArchive(){
 const list=$('archList');
 ARCH_ROWS.forEach((row,i)=>{
  const d=document.createElement('button');d.className='archRow';
  d.innerHTML='<span class="num mono">'+String(i+1).padStart(2,'0')+'</span>'+
   '<span class="tt"><b>'+row.t+'</b><span>'+row.d+'</span></span>'+
   '<span class="op mono">OPEN</span>';
  d.addEventListener('click',()=>{
   sfxClick();
   const R=forgeHistory(row.n);
   $('archive').style.display='none';
   $('menu').classList.add('gone');
   ensureAudio();setTempo(72);setDrone(.5,3);
   const s=archSummary(R,row.n);
   if(s)setTimeout(()=>toast(s,true),1400);
   go(row.go);
  });
  list.appendChild(d);
 });
})();
$('archBtn').addEventListener('click',()=>{sfxClick();$('archive').style.display='flex';});
$('archClose').addEventListener('click',()=>{sfxClick();$('archive').style.display='none';});

/* ================= boot ================= */
async function boot(){
 if(!hasTHREE){
  $('bootStatus').textContent='RENDERER FAILED TO LOAD — CHECK CONNECTION AND RELOAD';
  return;
 }
 buildScene();
 ccPos=new THREE.Vector3();ccLook=new THREE.Vector3();ccDrift=new THREE.Vector3();
 buildCabin();buildLunar();
 $('vTag').textContent='SURVEY BUILD '+EDEN_BUILD;
 requestAnimationFrame(frame);
 const stages=['Calibrating survey optics','Rendering continents','Seeding weather','Charting Shackleton Rim'];
 await generateTextures(p=>{
  $('bootStatus').textContent=stages[Math.min(stages.length-1,Math.floor(p*stages.length))]
   +' · '+Math.round(p*100)+'%';});
 applyTextures();
 const bs=$('bootStatus');
 bs.textContent='Tap to initialize \u25b8';
 bs.classList.add('ready');
 $('boot').classList.add('ready');
 $('boot').addEventListener('click',async function once(){
  $('boot').removeEventListener('click',once);
  ensureAudio();
  setMix('MENU',2.2);setArp(.5,1.6);
  if('speechSynthesis' in window){
   try{const u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u);}catch(err){}}
  await detectVoices();
  $('voiceBtn').textContent=voiceLabel[VOICE.mode];
  $('boot').classList.add('gone');
  $('menu').classList.remove('hidden');
  requestAnimationFrame(()=>{$('menu').classList.remove('gone');});
 });
}
$('menu').classList.add('gone');
boot();
