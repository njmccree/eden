/* ================= Chapter 1 logic ================= */
const $=id=>document.getElementById(id);
function toast(msg,long){
 const t=$('toast');t.textContent=msg;t.classList.add('show');
 clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),long?4200:2300);
}
function drawPortrait(id){
 const c=$('portrait'),g=c.getContext('2d');
 const n=NPCS[id]||NPCS.sys;
 g.clearRect(0,0,80,80);
 g.fillStyle='#0e131c';g.fillRect(0,0,80,80);
 g.strokeStyle=n.color;g.lineWidth=2;
 g.beginPath();
 if(id==='flight'){g.moveTo(40,14);g.lineTo(66,62);g.lineTo(14,62);g.closePath();}
 else if(id==='eng'){g.rect(18,18,44,44);}
 else if(id==='sci'){g.arc(40,40,25,0,Math.PI*2);}
 else if(id==='cdr'){g.moveTo(40,12);g.lineTo(68,40);g.lineTo(40,68);g.lineTo(12,40);g.closePath();}
 else if(id==='press'){g.moveTo(14,58);g.lineTo(40,20);g.lineTo(66,58);g.moveTo(24,58);g.lineTo(56,58);}
 else if(id==='leader'){for(let k=0;k<5;k++){const a=-Math.PI/2+k*2*Math.PI/5,b2=a+Math.PI/5;
  const f=(k===0?g.moveTo:g.lineTo).bind(g);f(40+Math.cos(a)*26,40+Math.sin(a)*26);
  g.lineTo(40+Math.cos(b2)*11,40+Math.sin(b2)*11);}g.closePath();}
 else{g.arc(40,40,25,0,Math.PI*2);g.moveTo(20,40);g.lineTo(60,40);}
 g.stroke();
 g.fillStyle=n.color;g.font='700 13px ui-monospace,monospace';
 g.textAlign='center';g.fillText(n.init,40,45);
}
const pips=v=>'●'.repeat(Math.max(0,v))+'○'.repeat(Math.max(0,5-v));
function updateHUD(){
 const s=gameState.stats;
 $('hudBudget').textContent=s.budget;
 $('hudMass').textContent=s.massBudget;
 $('hudMorale').textContent=pips(s.morale);
 $('hudSupport').textContent=pips(s.publicSupport);
 $('hudRel').textContent=(s.reliability>=0?'+':'')+s.reliability;
 $('hudDate').textContent=gameState.date;
 if(gameState.site)$('hudSite').textContent=gameState.site.name.toUpperCase()+' · '+gameState.site.country.toUpperCase();
}
function flashDelta(id,txt,neg){
 const el=$(id);el.textContent=txt;
 el.classList.toggle('neg',!!neg);el.classList.add('show');
 setTimeout(()=>el.classList.remove('show'),2200);
}
function setStat(key,delta){
 const s=gameState.stats;
 const cap={morale:5,publicSupport:5};
 s[key]=cap[key]?Math.max(0,Math.min(cap[key],s[key]+delta)):s[key]+delta;
 const map={budget:['dBudget','$'+Math.abs(delta)+'M'],massBudget:['dMass',Math.abs(delta)+' kg'],
  morale:['dMorale',Math.abs(delta)],publicSupport:['dSupport',Math.abs(delta)],
  reliability:['dRel',Math.abs(delta)]};
 const[el,label]=map[key];
 flashDelta(el,(delta>0?'+':'−')+label,delta<0);
 sfxStat(delta);updateHUD();
}
function bumpCrew(who,delta){
 gameState.crew[who]=Math.max(-3,Math.min(3,gameState.crew[who]+delta));
}
function setObjective(text){
 $('objWrap').style.display='flex';
 $('objective').classList.remove('done');
 $('objText').textContent=text;
}
function completeObjective(){$('objective').classList.add('done');sfxChime();}

/* ---------- dialog engine (typewriter + voice) ---------- */
const DLG={queue:[],node:null,typing:false,timer:null,onDone:null,charI:0,full:''};
function showDialog(script,onDone){
 DLG.queue=script.slice();DLG.onDone=onDone||null;
 $('dialog').style.display='block';
 dlgAdvance();
}
function dlgAdvance(){
 cancelVoice();
 if(DLG.typing){
  clearInterval(DLG.timer);DLG.typing=false;
  $('dlgText').textContent=DLG.full;
  renderChoices();return;
 }
 const n=DLG.queue.shift();
 if(!n){$('dialog').style.display='none';
  if(DLG.onDone){const f=DLG.onDone;DLG.onDone=null;f();}return;}
 DLG.node=n;
 if(n.fx)n.fx();
 drawPortrait(n.s);
 $('spkName').textContent=NPCS[n.s].name;
 $('spkName').style.color=NPCS[n.s].color;
 $('choices').innerHTML='';
 $('dlgHint').style.opacity=1;
 DLG.full=typeof n.t==='function'?n.t():n.t;
 DLG.charI=0;DLG.typing=true;
 $('dlgText').textContent='';
 if(n.s!=='sys'&&!n.noVoice)speakLine(n.s,DLG.full);
 DLG.timer=setInterval(()=>{
  DLG.charI++;
  $('dlgText').textContent=DLG.full.slice(0,DLG.charI);
  if(DLG.charI%3===0)sfxType();
  if(DLG.charI>=DLG.full.length){
   clearInterval(DLG.timer);DLG.typing=false;renderChoices();}
 },1000/35);
}
function renderChoices(){
 const n=DLG.node;
 if(!n.choices){$('dlgHint').textContent='Tap to continue ▸';return;}
 $('dlgHint').style.opacity=0;
 const box=$('choices');box.innerHTML='';
 n.choices.forEach(ch=>{
  if(ch.req&&ch.req!==gameState.background&&!ch.showLocked)return;
  const b=document.createElement('button');
  const locked=ch.req&&ch.req!==gameState.background;
  b.innerHTML=ch.label+(ch.tags?'<span class="tags">'+ch.tags+'</span>':'')
   +(locked?'<span class="tags lock">Requires '+BACKGROUNDS.find(x=>x.id===ch.req).name+'</span>':'');
  if(locked)b.disabled=true;
  b.addEventListener('click',ev=>{
   ev.stopPropagation();sfxClick();cancelVoice();
   if(ch.fx)ch.fx();
   if(ch.next)DLG.queue=ch.next.slice().concat(DLG.queue);
   dlgAdvance();
  });
  box.appendChild(b);
 });
}
$('dialog').addEventListener('click',()=>{if($('choices').children.length===0)dlgAdvance();});

/* ---------- Chapter 1 scripts ---------- */
function arrivalScript(site){
 return [
  {s:'sys',t:'— '+site.name+', '+site.country+' · March 2031 —',noVoice:true},
  {s:'flight',t:site.opener},
  {s:'flight',t:"You're the mission architect on Eden. First crewed shot at a permanent lunar base. No pressure — just the entire budget cycle watching."},
  {s:'eng',t:"Chief Engineer. I'll be blunt: your launch window is ninety days out and your vehicle is "+(site.mod.rel<0?"a fast build. Emphasis on fast.":"solid iron. Mostly."),
   fx:()=>bumpCrew('engineer',0)},
  {s:'sci',t:"Payload science! I have four modules that all deserve to fly and you're going to make me cut two. I've made peace with it. (I have not.)"},
  {s:'press',t:"One question from the pool: why should a taxpayer care about a moon base when groceries cost what they cost?",
   choices:[
    {label:'"Because everything we fly up there is one less thing we buy down here. Eden pays rent."',
     tags:'+1 Public Support',
     fx:()=>{setStat('publicSupport',1);bumpCrew('scientist',1);},
     next:[{s:'press',t:"\"Pays rent.\" That'll print. Good luck, architect."}]},
    {label:'"It\u2019s not about care. It\u2019s about being second to whoever builds it first."',
     tags:'+1 Morale · −1 Public Support',
     fx:()=>{setStat('morale',1);setStat('publicSupport',-1);},
     next:[{s:'press',t:"Fear sells too, I suppose. Print it either way."}]},
    {label:'(🔧) "Ask me about the throttle margins instead. Those I can defend to the decimal."',
     req:'eng',showLocked:true,tags:'+1 Reliability',
     fx:()=>{setStat('reliability',1);bumpCrew('engineer',1);},
     next:[{s:'press',t:"An engineer running the show. The comment section will be... divided."}]}
   ]},
  {s:'flight',t:"Enough theater. Walk the pad, then we pick your background file and build a manifest. The Moon doesn't wait on press cycles."}
 ];
}
const BG_REPLIES={
 eng:[{s:'eng',t:"A systems person. Finally. I'm adding one reliability point to my sleep schedule.",fx:()=>bumpCrew('engineer',1)},
  {s:'sci',t:"Just promise the science mass doesn't become 'margin.' Promise with your mouth."}],
 admin:[{s:'flight',t:"An administrator who found $300M in the couch cushions. I have never been so happy to be managed.",fx:()=>bumpCrew('flight',1)},
  {s:'eng',t:"Money is nice. Money is not thrust. We'll see."}],
 geo:[{s:'sci',t:"A geologist!! Okay. Okay okay okay. The prospector rig just got 25% lighter because you actually know where to drill.",fx:()=>bumpCrew('scientist',1)},
  {s:'flight',t:"Contain yourselves. Manifest planning in five."}]
};
function planningIntro(){
 return [
  {s:'flight',t:"Manifest time. Mass budget is "+gameState.stats.massBudget+" kg to TLI. Two module slots. Choose what Eden stands on."},
  {s:'eng',t:"For the record: the propellant reserve is boring and I love it. Boring is how everyone stays alive.",
   fx:()=>{}},
  {s:'sci',t:"And the prospector is the whole POINT. Water is propellant is industry is staying. No ice, no Eden."}
 ];
}
const MOD_REPLIES={
 prospector:{s:'sci',t:"YES. Ice first. I'll have survey targets before we clear the tower.",fx:()=>bumpCrew('scientist',1)},
 solar:{s:'sci',t:"Power that never runs out at the pole. Smart. The refinery will thank you in chapter three.",fx:()=>bumpCrew('scientist',1)},
 habitat:{s:'flight',t:"A real habitat. The crews will sleep like humans instead of cargo. Morale banked.",fx:()=>bumpCrew('flight',1)},
 reserve:{s:'eng',t:"Reserve propellant. You beautiful, boring genius. That's one bad day we survive for free.",fx:()=>bumpCrew('engineer',1)}
};

/* ---------- state machine: Chapter 1 ---------- */
let launch={t:0,phase:'idle',holdT:0,holding:false,polls:{},anomalyDone:false};
let descentT=0,arrivalCamT=0,siteChosen=null;

function go(name){
 gameState.scene=name;
 const mixMap={MENU:'MENU',SITE_SELECT:'MENU',DESCENT:'DESCENT',ARRIVAL:'ARRIVAL',
  BACKGROUND_SELECT:'BACKGROUND_SELECT',PLANNING:'PLANNING',
  LAUNCH:'LAUNCH_POLL',CHAPTER_END:'CHAPTER_END',COAST:'COAST',
  ARRIVE2:'ARRIVE2',GAME2:'GAME2',TOUCH2:'TOUCH2',DEPLOY2:'DEPLOY2',REPORT2:'REPORT2',
  CH3_CALL:'DEPLOY2',GAME3:'GAME2',ICE3:'TOUCH2',REPORT3:'REPORT2',
  CH4:'PLANNING',CH4_END:'REPORT2'};
 if(AM.ctx&&mixMap[name])setMix(mixMap[name]);
 if(name==='SITE_SELECT')enterSiteSelect();
 if(name==='DESCENT')enterDescent();
 if(name==='ARRIVAL')enterArrival();
 if(name==='BACKGROUND_SELECT')enterBg();
 if(name==='PLANNING')enterPlanning();
 if(name==='LAUNCH')enterLaunch();
 if(name==='CHAPTER_END')enterEnd();
 if(name==='COAST')enterCoast();
 if(name==='ARRIVE2')enterArrive2();
 if(name==='GAME2')beginGame2();
 if(name==='DEPLOY2')openDeploy();
 if(name==='REPORT2')openReport();
 if(name==='CH3_CALL')enterCh3Call();
 if(name==='GAME3')enterGame3();
 if(name==='REPORT3')openReport3();
 if(name==='CH4')enterCh4();
 if(name==='CH4_END')openReport4();
}
let pinGroup=null,pinSel=null;
function enterSiteSelect(){
 $('menu').classList.add('gone');
 setObjective('Choose a launch site');
 buildPins();
 toast('Drag to spin the globe \u00b7 tap a pin to inspect a site.',true);
}
function buildPins(){
 clearPins();
 pinGroup=new THREE.Group();
 SITES.forEach(site=>{
  const g=new THREE.Group();g.userData.site=site;
  const dir=latLonToLocal(site.lat,site.lon,1).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.07,6),
   new THREE.MeshBasicMaterial({color:0xffc06a}));
  stem.position.copy(dir.clone().multiplyScalar(1.035));stem.quaternion.copy(q);
  stem.userData.site=site;g.add(stem);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.028,10,8),
   new THREE.MeshBasicMaterial({color:0xffc06a}));
  head.position.copy(dir.clone().multiplyScalar(1.082));
  head.userData.site=site;g.add(head);
  const hit=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),
   new THREE.MeshBasicMaterial({visible:false}));
  hit.position.copy(dir.clone().multiplyScalar(1.07));
  hit.userData.site=site;g.add(hit);
  g.userData.head=head;g.userData.stem=stem;
  pinGroup.add(g);
 });
 planet.add(pinGroup);
}
function clearPins(){
 if(pinGroup&&planet){planet.remove(pinGroup);}
 pinGroup=null;pinSel=null;
}
const rayc=hasTHREE?new THREE.Raycaster():null;
const rayv=hasTHREE?new THREE.Vector2():null;
const drag={on:false,id:null,x:0,y:0,moved:0,vx:0};
const sceneCv=document.getElementById('scene');
sceneCv.addEventListener('pointerdown',e=>{
 if(gameState.scene!=='SITE_SELECT')return;
 drag.on=true;drag.id=e.pointerId;drag.x=e.clientX;drag.y=e.clientY;
 drag.moved=0;drag.vx=0;
 try{sceneCv.setPointerCapture(e.pointerId);}catch(err){}
});
sceneCv.addEventListener('pointermove',e=>{
 if(!drag.on||e.pointerId!==drag.id||gameState.scene!=='SITE_SELECT')return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 drag.x=e.clientX;drag.y=e.clientY;
 drag.moved+=Math.abs(dx)+Math.abs(dy);
 planet.rotation.y+=dx*.005;
 clouds.rotation.y+=dx*.005;
 drag.vx=dx*.005;
 const w=orbitRoot.userData.world;
 w.rotation.x=Math.max(-.4,Math.min(.4,w.rotation.x+dy*.003));
});
['pointerup','pointercancel'].forEach(ev=>sceneCv.addEventListener(ev,e=>{
 if(!drag.on||e.pointerId!==drag.id)return;
 drag.on=false;
 if(gameState.scene!=='SITE_SELECT'||!pinGroup)return;
 if(drag.moved>=8)return; /* it was a drag, not a tap */
 rayv.x=(e.clientX/window.innerWidth)*2-1;
 rayv.y=-(e.clientY/window.innerHeight)*2+1;
 rayc.setFromCamera(rayv,camera);
 const hits=rayc.intersectObject(planet,true); /* planet occludes far-side pins */
 if(hits.length&&hits[0].object.userData.site)selectPin(hits[0].object.userData.site);
}));
function refreshPinStyles(){
 if(!pinGroup)return;
 pinGroup.children.forEach(g=>{
  const sel=g.userData.site===pinSel;
  g.userData.head.material.color.setHex(sel?0x7fe08f:0xffc06a);
  g.userData.stem.material.color.setHex(sel?0x7fe08f:0xffc06a);
  g.userData.head.scale.setScalar(sel?1.35:1);
 });
}
function selectPin(site){
 pinSel=site;sfxClick();refreshPinStyles();
 $('spName').textContent=site.name.toUpperCase()+' \u00b7 '+site.country.toUpperCase();
 $('spMeta').textContent=site.modText;
 $('spFlavor').textContent='\u201c'+site.flavor+'\u201d';
 $('sitePick').classList.add('on');
}
$('spCancel').addEventListener('click',e=>{
 e.stopPropagation();sfxClick();
 pinSel=null;refreshPinStyles();
 $('sitePick').classList.remove('on');
});
$('spGo').addEventListener('click',e=>{
 e.stopPropagation();
 if(!pinSel)return;
 sfxClick();siteChosen=pinSel;
 $('sitePick').classList.remove('on');
 go('DESCENT');
});
function enterDescent(){
 gameState.site=siteChosen;
 applySiteModifiers(gameState,siteChosen);
 gameState.log.push('Chose launch site: '+siteChosen.name+' ('+siteChosen.modText+')');
 clearPins();
 $('objWrap').style.display='none';
 descentT=3.2; /* globe is already centered from site select */
 descentFlashDone=false;
 $('skipBtn').style.display='block';
 setTimeout(()=>{
  if(gameState.scene!=='DESCENT')return;
  $('tcName').textContent=siteChosen.name;
  $('tcFlavor').textContent=siteChosen.flavor+' · '+siteChosen.modText;
  $('titleCard').style.display='flex';
 },3000);
}
function enterArrival(){
 $('skipBtn').style.display='none';
 $('titleCard').style.display='none';
 $('hud').style.display='flex';
 updateHUD();
 setObjective('Meet your team');
 arrivalCamT=0;
 showDialog(arrivalScript(siteChosen),()=>{
  completeObjective();go('BACKGROUND_SELECT');});
}
function enterBg(){
 setObjective('Choose your background');
 const box=$('bgCards');box.innerHTML='';
 BACKGROUNDS.forEach(bg=>{
  const c=document.createElement('button');c.className='card';
  c.innerHTML='<div class="t">'+bg.icon+' '+bg.name+'</div><div class="d">'+bg.d+'</div><div class="fx">'+bg.fx+'</div>';
  c.addEventListener('click',()=>{
   sfxClick();
   applyBackground(gameState,bg.id);
   gameState.log.push('Background: '+bg.name);
   if(bg.id==='eng')setStat('reliability',0);
   if(bg.id==='admin')setStat('budget',0);
   updateHUD();
   $('bgSelect').style.display='none';
   completeObjective();
   showDialog(BG_REPLIES[bg.id],()=>go('PLANNING'));
  });
  box.appendChild(c);
 });
 $('bgSelect').style.display='flex';
}
let planSel=[];
function enterPlanning(){
 setObjective('Lock a two-module manifest');
 planSel=[];
 showDialog(planningIntro(),openPlanScreen);
}
function openPlanScreen(){
 const box=$('modCards');box.innerHTML='';
 $('planLede').textContent='Two module slots · '+gameState.stats.massBudget+' kg to TLI · Budget $'+gameState.stats.budget+'M';
 MODULES.forEach(m=>{
  const c=document.createElement('button');c.className='card';c.dataset.id=m.id;
  const massNow=moduleMass(gameState,m);
  c.innerHTML='<div class="t">'+m.name+'</div><div class="meta">'+massNow+' kg · $'+m.cost+'M'
   +(massNow!==m.mass?' · ⛏️ −25% mass':'')+'</div><div class="fx">'+m.fx+'</div>';
  c.addEventListener('click',()=>{sfxClick();toggleModule(m.id);});
  box.appendChild(c);
 });
 $('geoBtn').disabled=gameState.background!=='geo';
 $('adminBtn').disabled=gameState.background!=='admin';
 updateBars();
 $('planning').style.display='flex';
}
function toggleModule(id){
 if(planSel.includes(id))planSel=planSel.filter(x=>x!==id);
 else{
  if(planSel.length>=2){toast('Two slots. The Chief is watching.');return;}
  planSel.push(id);
  const rep=MOD_REPLIES[id];
  toast(NPCS[rep.s].name+': '+rep.t.split('.')[0]+'.');
  rep.fx();
 }
 updateBars();
}
function updateBars(){
 document.querySelectorAll('#modCards .card').forEach(c=>{
  c.classList.toggle('sel',planSel.includes(c.dataset.id));});
 const {mass,cost}=selectionTotals(gameState,planSel);
 const mb=gameState.stats.massBudget;
 $('massLab').textContent=mass+' / '+mb+' kg';
 $('costLab').textContent='$'+cost+'M';
 const mbar=$('massBar');
 mbar.classList.toggle('over',mass>mb);
 mbar.querySelector('i').style.width=Math.min(100,mass/mb*100)+'%';
 $('costBar').querySelector('i').style.width=Math.min(100,cost/900*100)+'%';
 $('planConfirm').disabled=!(planSel.length===2&&mass<=mb);
}
$('geoBtn').addEventListener('click',()=>{
 sfxClick();toast('⛏️ Prospector mass model re-run — already reflected in the manifest.');});
$('adminBtn').addEventListener('click',()=>{
 if($('adminBtn').disabled)return;
 sfxClick();
 if(!gameState.flags.feesDone){
  gameState.flags.feesDone=true;setStat('budget',120);
  toast('📋 Integration fees renegotiated: +$120M.');
  $('adminBtn').disabled=true;}
});
$('planConfirm').addEventListener('click',()=>{
 sfxClick();
 gameState.payloads=planSel.slice();
 const names=planSel.map(id=>MODULES.find(m=>m.id===id).name).join(' + ');
 gameState.log.push('Manifest locked: '+names);
 const {cost}=selectionTotals(gameState,planSel);
 setStat('budget',-cost);
 planSel.forEach(id=>{const m=MODULES.find(x=>x.id===id);
  if(m.fan==='sci')bumpCrew('scientist',1);
  if(m.fan==='eng')bumpCrew('engineer',1);
  if(m.fan==='flight')bumpCrew('flight',1);});
 $('planning').style.display='none';
 completeObjective();
 gameState.date='May 2031';updateHUD();
 go('LAUNCH');
});
/* ---------- launch ---------- */
const POLL_LINES={
 BOOSTER:['flight',"Booster is go. Tanks pressed, engines chilled."],
 GUIDANCE:['flight',"Guidance is go. Star trackers locked."],
 PAYLOAD:['sci',"Payload is GO GO GO — sorry. Payload is go."]};
/* ---------- launch broadcast: PiP live feed + reporters in the gaps ---------- */
const TV_NET={'USA':'GNN 7','French Guiana':'ORBITE 24','Kazakhstan':'KTK COSMOS','Japan':'NHU SORA','China':'CGX 9'};
const tv={on:false,pool:[],poolIdx:0,capT:0,ascIdx:0,hideT:null};
const TV_ASCENT=[
 [16.9,'ANCHOR',"Clean and loud — Eden One is right down the middle of the corridor."],
 [30.8,'PAD',"The sound just got here. A crackle you feel in your ribs — downrange and climbing."],
 [37.6,'ANCHOR',"Coming up on staging. The booster that did the heavy lifting is about to hand over and fall home."],
 [50.5,'PAD',"There it is — the booster tumbling back bright against the sky, and the second stage burning steady."],
 [61.6,'ANCHOR',"Next stop: trans-lunar injection. From here, the Moon does the catching."]
];
function tvShow(){
 tv.on=true;tv.poolIdx=0;tv.capT=1.2;tv.ascIdx=0;
 tv.pool=[
  ['ANCHOR',"Live from "+siteChosen.name+": the pad is clear, the range is green, and half the planet has the same channel on."],
  ['PAD',"You can feel it out here — nobody is checking the weather twice. This bird wants to fly."],
  ['ANCHOR',"Three polls stand between Eden One and the Moon. Flight runs the board when the architect gives the word."],
  ['PAD',"Cryo load complete. She's creaking and venting like a kettle — the engineers tell me that's a good sound."],
  ['ANCHOR',"One ship, one program, and a ledger that only balances off-world. No pressure on the crew at all."],
  ['PAD',"The crowd here is ten deep. Someone brought a harmonica."]
 ];
 $('tvNet').textContent=TV_NET[siteChosen.country]||'GNN 7';
 $('tvCap').classList.remove('on');
 $('tv').style.display='block';
 document.body.classList.add('tvon');
}
function tvHide(){
 tv.on=false;clearTimeout(tv.hideT);
 $('tv').style.display='none';
 document.body.classList.remove('tvon');
}
function tvCaption(who,text){
 $('tvCap').innerHTML='<b>'+who+'</b>'+text;
 $('tvCap').classList.add('on');
 clearTimeout(tv.hideT);
 tv.hideT=setTimeout(()=>$('tvCap').classList.remove('on'),Math.max(3800,text.length*48));
}
function tvUpdate(dt){
 if(!tv.on)return;
 const busy=$('subs').classList.contains('on')||$('dialog').style.display==='block';
 if(launch.phase==='liftoff'){
  if(tv.ascIdx<TV_ASCENT.length&&launch.t>=TV_ASCENT[tv.ascIdx][0]&&!busy){
   const[,who,line]=TV_ASCENT[tv.ascIdx++];
   tvCaption(who,line);
  }
 }else{
  tv.capT-=dt;
  if(tv.capT<=0&&!busy){
   const[who,line]=tv.pool[tv.poolIdx++%tv.pool.length];
   tvCaption(who,line);tv.capT=9;
  }
 }
}

function enterLaunch(){
 setObjective('Clear the terminal count');
 gameState.date='June 2031';updateHUD();
 launch={t:0,phase:'poll',holdT:0,holding:false,polls:{},anomalyDone:false};
 tvShow();
 document.querySelectorAll('#polls button').forEach(b=>{
  b.classList.remove('go');b.querySelector('.st').textContent='POLL';});
 $('holdWrap').style.display='none';
 $('gonogo').style.display='flex';
 $('missionClock').style.display='block';
 $('missionClock').textContent='T−00:03:00 · HOLD';
}
document.querySelectorAll('#polls button').forEach(b=>{
 b.addEventListener('click',()=>{
  const st=b.dataset.st;
  if(launch.polls[st]||launch.phase!=='poll')return;
  sfxClick();
  if(st==='PAYLOAD'&&!launch.anomalyDone&&Math.random()<anomalyChance(gameState.stats.reliability)){
   launch.anomalyDone=true;
   $('gonogo').style.display='none';
   anomalyEvent(()=>{$('gonogo').style.display='flex';markPoll(b,st);});
   return;}
  markPoll(b,st);
 });
});
function markPoll(b,st){
 launch.polls[st]=true;
 b.classList.add('go');b.querySelector('.st').textContent='GO';
 const[who,line]=POLL_LINES[st];
 callout(who,line);
 sfxChime();
 if(Object.keys(launch.polls).length===3){
  setTimeout(()=>{
   callout('flight',"All stations go. Arm the terminal count when ready, architect.");
   $('holdWrap').style.display='flex';launch.phase='armed';},900);
 }
}
function anomalyEvent(resume){
 const script=[
  {s:'eng',t:"Hold. HOLD. Helium regulator on the second stage is reading 4% low. Could be a sensor. Could be a leak. Your call, architect.",
   choices:[
    {label:'"Waive it. The margin covers 4%. We fly."',
     tags:'Launch on time · risk carried to Chapter 2',
     fx:()=>{gameState.flags.waivedAnomaly=true;bumpCrew('engineer',-1);setStat('morale',1);
      gameState.log.push('Waived helium anomaly at T−3m.');},
     next:[{s:'eng',t:"...Copy. Waived and logged. If this bites us at the Moon, I'm quoting you verbatim."}]},
    {label:'"Hold 24 hours. Swap the regulator."',
     tags:'−$60M · +1 Reliability',
     fx:()=>{gameState.flags.heldForSwap=true;setStat('budget',-60);setStat('reliability',1);
      bumpCrew('engineer',1);setStat('publicSupport',-1);
      gameState.log.push('Held 24h to swap regulator.');},
     next:[{s:'eng',t:"Swap crew is rolling. Best money this program ever spent — the papers will disagree loudly."},
      {s:'sys',t:'— 24 hours later —',noVoice:true}]},
    {label:'(🔧) "Pull the sensor loop trace. If the ramp profile is clean, it\u2019s the transducer."',
     req:'eng',showLocked:true,tags:'Free fix · +1 Reliability',
     fx:()=>{gameState.flags.sensorCall=true;setStat('reliability',1);bumpCrew('engineer',2);
      gameState.log.push('Diagnosed transducer fault; launched on time.');},
     next:[{s:'eng',t:"Ramp profile's textbook. It's the transducer, not the tank. I could kiss you. I won't. Board is green."}]}
   ]}];
 showDialog(script,resume);
}
let holdRAF=null;
function holdLoop(){
 if(!launch.holding)return;
 launch.holdT+=1/60;
 const p=Math.min(1,launch.holdT/3);
 $('holdBtn').style.setProperty('--p',p*100);
 if(AM.ctx)setRumbleDrive(p*.35);
 shakeAmp=p*.08;
 if(p>=1){launch.holding=false;ignition();return;}
 holdRAF=requestAnimationFrame(holdLoop);
}
$('holdBtn').addEventListener('pointerdown',e=>{
 if(launch.phase!=='armed')return;
 e.preventDefault();launch.holding=true;launch.holdT=0;holdLoop();});
['pointerup','pointerleave','pointercancel'].forEach(ev=>{
 $('holdBtn').addEventListener(ev,()=>{
  if(launch.phase!=='armed')return;
  if(launch.holding&&launch.holdT<3){
   launch.holding=false;cancelAnimationFrame(holdRAF);
   $('holdBtn').style.setProperty('--p',0);
   setRumbleDrive(0);shakeAmp=0;
   toast('Count safed. Hold 3 full seconds to commit.');}
 });
});
function ignition(){
 launch.phase='liftoff';launch.t=0;
 $('gonogo').style.display='none';
 setMix('LAUNCH_GO',1.5);
 setObjective('Fly the ascent');
 gameState.log.push('Liftoff from '+siteChosen.name+'.');
 launchEvent();
}
function launchEvent(){
 const L=[
  [0,()=>{callout('flight',"Ignition sequence start.");setRumbleDrive(.55);shakeAmp=.14;}],
  [2.2,()=>{callout('flight',"Liftoff. Liftoff of Eden One.");setRumbleDrive(1);shakeAmp=.2;sfxSwell();}],
  [7,()=>callout('flight',"Tower cleared. Program pitch.")],
  [13,()=>{callout('eng',"Chamber pressures nominal. She's flying clean.");shakeAmp=.12;}],
  [20,()=>callout('flight',"Max Q. Throttle bucket.")],
  [27,()=>{shakeAmp=.08;callout('flight',"Through max Q. Throttle up.");}],
  [44,()=>{callout('flight',"Staging.");sfxThud(true);shakeAmp=.16;
   stageSeparation();}],
  [46,()=>{shakeAmp=.05;setRumbleDrive(.45);callout('eng',"Second stage lit. Regulator "
   +(gameState.flags.waivedAnomaly?"holding — for now.":"steady as drawn."));}],
  [58,()=>{callout('flight',"Press to TLI. Coast phase in ninety seconds.");}],
  [66,()=>tliCallback()],
 ];
 launch.timeline=L;launch.tlIdx=0;
}
function tliCallback(){
 shakeAmp=0;setRumbleDrive(0);
 $('missionClock').style.display='none';
 tvCaption('ANCHOR',"Trans-lunar injection. Eden One is gone from the sky here — next landmark, the Moon.");
 setTimeout(tvHide,2400);
 callout('flight',"Trans-lunar injection confirmed. Eden is on its way.");
 setStat('publicSupport',1);
 setTimeout(()=>{completeObjective();go('CHAPTER_END');},2600);
}
function enterEnd(){
 setMix('CHAPTER_END',3);
 padToMajor();
 const s=gameState.stats;
 const lines=[
  'Launched from '+siteChosen.name+' as a '+BACKGROUNDS.find(b=>b.id===gameState.background).name+'.',
  'Manifest: '+gameState.payloads.map(id=>MODULES.find(m=>m.id===id).name).join(' + ')+'.',
  gameState.flags.waivedAnomaly?'You waived the helium anomaly. It rides with you.':
   gameState.flags.heldForSwap?'You held 24 hours for the regulator swap. Reliability banked.':
   gameState.flags.sensorCall?'You called the transducer fault from the trace. The Chief remembers.':
   'Terminal count ran clean.',
  'Budget $'+s.budget+'M · Reliability '+(s.reliability>=0?'+':'')+s.reliability+
   ' · Morale '+s.morale+'/5 · Support '+s.publicSupport+'/5'
 ];
 const r=$('recap');r.innerHTML='';
 lines.forEach(t=>{const d=document.createElement('div');d.textContent=t;r.appendChild(d);});
 $('endCard').style.display='flex';
}
$('chap2Btn').addEventListener('click',()=>{
 sfxClick();
 $('endCard').style.display='none';
 NPCS.flight.radio=true; /* FLIGHT is a relay from here on */
 go('COAST');
});
/* ---------- settings / menu / reset ---------- */
$('gear').addEventListener('click',e=>{
 e.stopPropagation();
 const s=$('settings');
 s.style.display=s.style.display==='flex'?'none':'flex';
});
$('volSlider').addEventListener('input',e=>{
 const v=e.target.value/100*.9;
 if(AM.ctx)AM.master.gain.linearRampToValueAtTime(v,AM.ctx.currentTime+.1);
 else AM.pendingVol=v;
});
let muted=false;
$('muteBtn2').addEventListener('click',()=>{
 muted=!muted;
 $('muteBtn2').textContent=muted?'Unmute':'Mute';
 if(AM.ctx)AM.master.gain.linearRampToValueAtTime(muted?0:$('volSlider').value/100*.9,AM.ctx.currentTime+.1);
});
const voiceLabel={tts:'Voice: Spoken',blip:'Voice: Synth',off:'Voice: Off'};
$('voiceBtn').addEventListener('click',e=>{
 e.stopPropagation();cycleVoiceMode();
 $('voiceBtn').textContent=voiceLabel[VOICE.mode];
 toast(voiceLabel[VOICE.mode]);
});
$('restartBtn').addEventListener('click',()=>{$('settings').style.display='none';resetGame();});
$('restartBtn3').addEventListener('click',()=>{$('reportCard').style.display='none';resetGame();});
document.querySelectorAll('#menu [data-na]').forEach(b=>{
 b.addEventListener('click',()=>toast('Not in this build — the expedition starts at Begin Descent.'));});
$('sysBtn').addEventListener('click',e=>{e.stopPropagation();$('gear').click();});
$('beginBtn').addEventListener('click',()=>{
 ensureAudio(); /* idempotent safety; the score starts at the boot tap */
 setTempo(72);setDrone(.5,3); /* the expedition tempo: slower, drone under, click enters with the mix */
 sfxClick();
 go('SITE_SELECT');
});
function resetGame(){
 cancelVoice();
 gameState=newGameState();
 launch={t:0,phase:'idle',holdT:0,holding:false,polls:{},anomalyDone:false};
 planSel=[];G2.attempts=0;
 AM.motifOn=false;AM.motifI=0;
 NPCS.flight.radio=false;
 if(AM.ctx){setMix('MENU',2);setTempo(85);setDrone(0,2);setArp(.5,2);setAmb(0,1);setRumbleDrive(0);padToMinor();}
 ['hud','objWrap','dialog','ghud','padCtl'].forEach(id=>$(id).style.display='none');
 ['bgSelect','planning','gonogo','endCard','deployScreen','reportCard','titleCard','end3Card','ch4','end4Card','archive'].forEach(id=>$(id).style.display='none');
 $('missionClock').style.display='none';$('limits').style.display='none';
 $('ventBtn').style.display='none';$('skipBtn').style.display='none';
 tvHide();
 hideSub();document.body.classList.remove('cine','landing');
 clearPins();$('sitePick').classList.remove('on');
 if(rover3)rover3.visible=false;
 if(baseGrp)baseGrp.visible=false;
 $('timeCtl').style.display='none';
 for(const k in crewFigs)if(crewFigs[k])crewFigs[k].g.visible=false;
 if(drillRig)drillRig.visible=false;
 if(roverLight)roverLight.intensity=0;
 setGhudMode('lander');$('thrust').textContent='Hold · Thrust';
 $('fade').classList.remove('out');
 if(hasTHREE){
  siteRoot.visible=false;cabinRoot.visible=false;terraRoot.visible=false;
  orbitRoot.visible=true;scene.fog=null;
  orbitRoot.userData.world.rotation.x=0;drag.vx=0;
  scene.background=new THREE.Color(0x05070d);
  camBase.set(0,0,3.4);camLook.set(0,0,0);shakeAmp=0;
  props.packet.visible=false;props.harmonica.visible=false;
  if(props.comms)props.comms.visible=false;
  cabinEarth.scale.setScalar(1);cabinClouds.scale.setScalar(1);
  if(props.packet.parent!==cabinRoot){props.packet.parent.remove(props.packet);cabinRoot.add(props.packet);}
  if(props.harmonica.parent!==cabinRoot){props.harmonica.parent.remove(props.harmonica);cabinRoot.add(props.harmonica);}
  layoutOrbit();
 }
 $('menu').classList.remove('gone');
 gameState.scene='MENU';
}
