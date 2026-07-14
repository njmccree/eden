/* ============================================================
   EDEN — FIRST LIGHT · The Complete Expedition (single file)
   MENU → DESCENT → ARRIVAL → BACKGROUND_SELECT → PLANNING →
   LAUNCH → CHAPTER_END → COAST → ARRIVE2 → GAME2 (lander) →
   TOUCH2 → DEPLOY2 → REPORT2
   One audio system, one gameState, all the way down.
   ============================================================ */
'use strict';
const EDEN_BUILD='0.11.0';

/* @pure-start */
const SITES=[
 {id:'canaveral',name:'Cape Canaveral',country:'USA',lat:28.5,lon:-80.6,
  flavor:'Where every road to the Moon has started.',
  mod:{support:1},modText:'+1 Public Support',
  sky:{top:0x27364f,horizon:0xf2b57a,ground:0x35462f,sun:0xffd9a0},
  opener:"The Cape has been throwing people at the sky for seventy years. Today it's yours to aim. Director on console."},
 {id:'boca',name:'Boca Chica',country:'USA',lat:26.0,lon:-97.2,
  flavor:'Iterate fast. Fly heavy.',
  mod:{massMul:1.2,rel:-1},modText:'+20% mass budget · −1 Reliability',
  sky:{top:0x3a5b86,horizon:0xcfe3ee,ground:0x8a7f66,sun:0xffffff},
  opener:"Mind the dust. We build fast here and fly heavier than anyone. Try to keep up. Director on console."},
 {id:'kourou',name:'Kourou',country:'French Guiana',lat:5.2,lon:-52.8,
  flavor:'The equator gives you a running start.',
  mod:{massMul:1.1,morale:1},modText:'+10% mass budget · +1 Morale',
  sky:{top:0x1d2c50,horizon:0xff9e6b,ground:0x24402c,sun:0xffc490},
  opener:"Five degrees off the equator. The planet itself gives you a running start — don't waste it. Director on console."},
 {id:'baikonur',name:'Baikonur',country:'Kazakhstan',lat:45.6,lon:63.3,
  flavor:'Sixty years of scorch marks on this pad.',
  mod:{rel:1,budget:-200},modText:'+1 Reliability · −$200M',
  sky:{top:0x2c3a55,horizon:0xd8a26b,ground:0x6d6349,sun:0xffd2a0},
  opener:"Sixty years of scorch marks on this pad, and not one is a failure we repeated. Director on console."},
 {id:'tanegashima',name:'Tanegashima',country:'Japan',lat:30.4,lon:131.0,
  flavor:'Precision is a culture here.',
  mod:{rel:1,massMul:0.9},modText:'+1 Reliability · −10% mass budget',
  sky:{top:0x2b4668,horizon:0xbfd8e6,ground:0x2f4a3a,sun:0xf4fbff},
  opener:"We launch between fishing seasons here. Precision isn't a slogan, it's a courtesy. Director on console."},
 {id:'wenchang',name:'Wenchang',country:'China',lat:19.6,lon:110.9,
  flavor:'Industrial scale meets the sea.',
  mod:{flag:['resupplyDiscount',0.15]},modText:'Resupply costs −15% (future chapters)',
  sky:{top:0x39506e,horizon:0xd9dfd2,ground:0x3c5a40,sun:0xfff2d8},
  opener:"Sea on three sides, industry on the fourth. We can build anything you can budget. Director on console."}
];
const BACKGROUNDS=[
 {id:'eng',icon:'🔧',name:'Systems Engineer',
  d:'You have signed off on hardware that had to work the first time. You read telemetry like weather.',
  fx:'+1 Reliability · unlocks 🔧 technical options'},
 {id:'admin',icon:'📋',name:'Program Administrator',
  d:'You have kept three programs alive through four budget cycles. Money listens to you.',
  fx:'+$300M budget · unlocks 📋 negotiation options'},
 {id:'geo',icon:'⛏️',name:'Field Geologist',
  d:'You have cored ice in Antarctica and read regolith assays for fun. The Moon is a resource map to you.',
  fx:'Ice Prospector −25% mass · unlocks ⛏️ ISRU options'}
];
const MODULES=[
 {id:'prospector',name:'Ice Prospector Rig',mass:5200,cost:340,fan:'sci',
  fx:'Unlocks polar ice mining → water & propellant chain',
  dep:'Drill spun up. First core in the morning.',depFx:'WATER +12 kg/day potential'},
 {id:'solar',name:'Solar Array Kit',mass:3800,cost:210,fan:'sci',
  fx:'Power surplus at landing; enables early refining',
  dep:'Arrays tracking a sun that never sets.',depFx:'POWER +9 kW'},
 {id:'habitat',name:'Habitat Core',mass:6100,cost:420,fan:'flight',
  fx:'+Morale each chapter; crew capacity +2',
  dep:'Hab pressurized. Beds: real.',depFx:'CREW CAP 4 · +Morale'},
 {id:'reserve',name:'Extra Propellant Reserve',mass:4000,cost:150,fan:'eng',
  fx:'Safety margin; downgrades one future failure event',
  dep:'Residual propellant transferred to base tanks.',depFx:'MARGIN +1 · fuel +35% on descent'}
];
function newGameState(){
 return {scene:'MENU',site:null,background:null,
  stats:{budget:2400,massBudget:12000,morale:3,publicSupport:3,reliability:0},
  crew:{flight:0,engineer:0,scientist:0},
  payloads:[],flags:{},log:[],date:'March 2031',
  descent:{attempts:0,grade:'—',vs:0,hs:0,tilt:0,dx:0,fuelLeft:0,onPad:false}};
}
function applySiteModifiers(gs,site){
 const m=site.mod;
 if(m.budget)gs.stats.budget+=m.budget;
 if(m.massMul)gs.stats.massBudget=Math.round(gs.stats.massBudget*m.massMul);
 if(m.morale)gs.stats.morale=Math.min(5,gs.stats.morale+m.morale);
 if(m.support)gs.stats.publicSupport=Math.min(5,gs.stats.publicSupport+m.support);
 if(m.rel)gs.stats.reliability+=m.rel;
 if(m.flag)gs.flags[m.flag[0]]=m.flag[1];
 return gs;
}
function applyBackground(gs,bgId){
 gs.background=bgId;
 if(bgId==='eng')gs.stats.reliability+=1;
 if(bgId==='admin')gs.stats.budget+=300;
 return gs;
}
function moduleMass(gs,mod){
 return (mod.id==='prospector'&&gs.background==='geo')?Math.round(mod.mass*0.75):mod.mass;
}
function selectionTotals(gs,ids){
 let mass=0,cost=0;
 ids.forEach(id=>{const m=MODULES.find(x=>x.id===id);mass+=moduleMass(gs,m);cost+=m.cost;});
 return {mass,cost};
}
function fitsMass(gs,ids){return selectionTotals(gs,ids).mass<=gs.stats.massBudget;}
function anomalyChance(rel){return Math.min(.85,Math.max(.2,.7-.15*rel));}
function anomalyOutcome(gs){
 if(gs.flags.waivedAnomaly)return 'waived';
 if(gs.flags.heldForSwap)return 'held';
 if(gs.flags.sensorCall)return 'sensor';
 return 'clean';
}
/* @pure-end */

let gameState=newGameState();

/* one speaker table for portraits, subtitles, and voices */
const NPCS={
 flight:{name:'FLIGHT',color:'#6fd8c8',init:'FD',blipF:140,pitch:.9, rate:1,  radio:false},
 eng:   {name:'CHIEF ENGINEER',color:'#ff9d5c',init:'CE',blipF:105,pitch:.72,rate:.97},
 sci:   {name:'PAYLOAD SCIENTIST',color:'#ffc06a',init:'PS',blipF:225,pitch:1.22,rate:1.1},
 cdr:   {name:'COMMANDER',color:'#9fc2e8',init:'CD',blipF:170,pitch:.95,rate:.96},
 press: {name:'PRESS',color:'#8b96a8',init:'PR',blipF:150,pitch:1,  rate:1.05},
 sys:   {name:'CAPCOM',color:'#8b96a8',init:'CC',blipF:140,pitch:.9, rate:1},
 leader:{name:'—',color:'#b7c9ff',init:'★',blipF:120,pitch:.8, rate:.95}
};
