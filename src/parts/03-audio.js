/* ================= audio: one system for everything ================= */
const AM={ctx:null,motifOn:false};
const MIXES={
 MENU:        {pad:.5, tension:0,  pulse:0,  melody:0,  rumble:0},
 DESCENT:     {pad:.4, tension:.6, pulse:.3, melody:0,  rumble:0},
 ARRIVAL:     {pad:.3, tension:.1, pulse:0,  melody:.25,rumble:0},
 BACKGROUND_SELECT:{pad:.3,tension:.1,pulse:0,melody:.25,rumble:0},
 PLANNING:    {pad:.35,tension:.15,pulse:.25,melody:.3, rumble:0},
 LAUNCH_POLL: {pad:.3, tension:.5, pulse:.35,melody:0,  rumble:.1},
 LAUNCH_GO:   {pad:.2, tension:.3, pulse:0,  melody:0,  rumble:.9},
 CHAPTER_END: {pad:.5, tension:0,  pulse:0,  melody:.3, rumble:0},
 COAST:       {pad:.45,tension:0,  pulse:0,  melody:0,  rumble:0},
 ARRIVE2:     {pad:.4, tension:.12,pulse:0,  melody:0,  rumble:0},
 GAME2:       {pad:.18,tension:.5, pulse:.3, melody:0,  rumble:.85},
 TOUCH2:      {pad:.1, tension:0,  pulse:0,  melody:0,  rumble:0},
 DEPLOY2:     {pad:.4, tension:0,  pulse:0,  melody:.45,rumble:0},
 REPORT2:     {pad:.5, tension:0,  pulse:0,  melody:.35,rumble:0}
};
const mtof=m=>440*Math.pow(2,(m-69)/12);
function ensureAudio(){
 startAudio();
 const c=AM.ctx;
 if(c&&c.state!=='running'&&c.resume)c.resume().catch(()=>{});
}
/* standing safety: any later gesture re-wakes a suspended context
   (WebKit suspends WebAudio on backgrounding, calls, control center) */
['touchend','click','keydown'].forEach(ev=>document.addEventListener(ev,()=>{
 const c=AM.ctx;
 if(c&&c.state!=='running'&&c.resume)c.resume().catch(()=>{});
},{passive:true}));
const lerp=(a,b,t)=>a+(b-a)*t;
function startAudio(){
 if(AM.ctx)return;
 const AC=window.AudioContext||window.webkitAudioContext;
 const ctx=AM.ctx=new AC({latencyHint:'playback'});
 /* iOS/WebKit unlock: silent one-sample kick + resume; contexts often start 'suspended' */
 try{const kb=ctx.createBuffer(1,1,22050);const ks=ctx.createBufferSource();
  ks.buffer=kb;ks.connect(ctx.destination);ks.start(0);}catch(e){}
 if(ctx.state!=='running'&&ctx.resume)ctx.resume().catch(()=>{});
 AM.master=ctx.createGain();AM.master.gain.value=AM.pendingVol!==undefined?AM.pendingVol:0.72;
 AM.master.connect(ctx.destination);
 const comp=ctx.createDynamicsCompressor();
 comp.threshold.value=-14;comp.knee.value=24;comp.ratio.value=3.5;
 comp.attack.value=.004;comp.release.value=.2;
 comp.connect(AM.master);AM.out=comp;
 AM.layers={};
 ['pad','tension','pulse','melody','rumble'].forEach(n=>{
  const g=ctx.createGain();g.gain.value=0;g.connect(comp);AM.layers[n]=g;});
 AM.sfxG=ctx.createGain();AM.sfxG.gain.value=.9;AM.sfxG.connect(comp);
 AM.voiceG=ctx.createGain();AM.voiceG.gain.value=.9;AM.voiceG.connect(comp);
 AM.ambG=ctx.createGain();AM.ambG.gain.value=0;AM.ambG.connect(comp);
 /* descent alarms: three tiered buses into sfx */
 AM.alarmVsG=ctx.createGain();AM.alarmHsG=ctx.createGain();AM.alarmTiltG=ctx.createGain();
 [AM.alarmVsG,AM.alarmHsG,AM.alarmTiltG].forEach(g=>{g.gain.value=0;g.connect(AM.sfxG);});
 AM.alarm={vs:0,hs:0,tilt:0};

 /* brown noise */
 const nlen=ctx.sampleRate*4,nbuf=ctx.createBuffer(1,nlen,ctx.sampleRate);
 const nd=nbuf.getChannelData(0);let lo=0;
 for(let i=0;i<nlen;i++){const w=Math.random()*2-1;lo=(lo+.02*w)/1.02;nd[i]=lo*3.5;}
 AM.brown=nbuf;
 const brownSrc=(lp,dest,g)=>{
  const s=ctx.createBufferSource();s.buffer=nbuf;s.loop=true;
  const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;
  const gg=ctx.createGain();gg.gain.value=g;
  s.connect(f);f.connect(gg);gg.connect(dest);s.start();return gg;};

 /* cabin air hum (rides ambG; only up inside pressurized hulls) */
 const humPk=ctx.createBiquadFilter();humPk.type='peaking';
 humPk.frequency.value=118;humPk.Q.value=5;humPk.gain.value=8;
 humPk.connect(AM.ambG);
 brownSrc(240,humPk,.34);

 /* pad = drone + absorbed arp */
 const droneLP=ctx.createBiquadFilter();droneLP.type='lowpass';droneLP.frequency.value=800;
 AM.droneLP=droneLP;
 AM.droneG=ctx.createGain();AM.droneG.gain.value=0; /* silent on title; fades in at Begin */
 droneLP.connect(AM.droneG);AM.droneG.connect(AM.layers.pad);
 const lfo=ctx.createOscillator();lfo.frequency.value=.07;
 const lfoG=ctx.createGain();lfoG.gain.value=220;
 lfo.connect(lfoG);lfoG.connect(droneLP.frequency);lfo.start();
 const dOsc=(type,fr,det,g)=>{const o=ctx.createOscillator();o.type=type;o.frequency.value=fr;
  o.detune.value=det;const gg=ctx.createGain();gg.gain.value=g;
  o.connect(gg);gg.connect(droneLP);o.start();return gg;};
 dOsc('sine',65.41,0,.5);
 dOsc('triangle',98.0,4,.32);
 AM.minor3=dOsc('sine',155.56,0,.16);
 AM.major3=dOsc('sine',164.81,0,0);
 AM.arpG=ctx.createGain();AM.arpG.gain.value=.5;AM.arpG.connect(AM.layers.pad);
 AM.arpFX=ctx.createGain();AM.arpFX.gain.value=.5;AM.arpFX.connect(AM.layers.pad);
 AM.dly=ctx.createDelay(2);AM.dly.delayTime.value=(60/85/2)*1.5;
 const dlp=ctx.createBiquadFilter();dlp.type='lowpass';dlp.frequency.value=2600;
 const dfb=ctx.createGain();dfb.gain.value=.36;
 AM.arpG.connect(AM.dly);AM.dly.connect(dlp);dlp.connect(dfb);dfb.connect(AM.dly);
 dlp.connect(AM.arpFX);
 const vIn=ctx.createGain();vIn.gain.value=.5;AM.arpG.connect(vIn);
 [0.119,0.148,0.175].forEach(dt=>{
  const d=ctx.createDelay(1);d.delayTime.value=dt;
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1800;
  const g=ctx.createGain();g.gain.value=.6;
  vIn.connect(d);d.connect(lp);lp.connect(g);g.connect(d);
  const out=ctx.createGain();out.gain.value=.11;lp.connect(out);out.connect(AM.arpFX);
 });

 /* tension */
 const swell=brownSrc(500,AM.layers.tension,0);
 const sLfo=ctx.createOscillator();sLfo.frequency.value=.06;
 const sLfoG=ctx.createGain();sLfoG.gain.value=.16;
 const sBase=ctx.createConstantSource();sBase.offset.value=.18;
 sLfo.connect(sLfoG);sLfoG.connect(swell.gain);sBase.connect(swell.gain);
 sLfo.start();sBase.start();
 [246.94,261.63].forEach(f=>{const o=ctx.createOscillator();o.frequency.value=f;
  const g=ctx.createGain();g.gain.value=.05;o.connect(g);g.connect(AM.layers.tension);o.start();});

 /* rumble (drive-coupled) */
 AM.rumbleDrive=ctx.createGain();AM.rumbleDrive.gain.value=0;
 AM.rumbleDrive.connect(AM.layers.rumble);
 brownSrc(120,AM.rumbleDrive,.9);
 const sub=ctx.createOscillator();sub.frequency.value=40;
 const subG=ctx.createGain();subG.gain.value=.5;
 sub.connect(subG);subG.connect(AM.rumbleDrive);sub.start();

 /* wavetables: arp pulses + voice blips */
 const PWM_STEPS=17,HARM=64,PG=.27,SG=.2;
 AM.pulseBank=[];
 for(let s=0;s<PWM_STEPS;s++){
  const duty=.5+.34*((s/(PWM_STEPS-1))*2-1);
  const re=new Float32Array(HARM+1),im=new Float32Array(HARM+1);
  for(let n=1;n<=HARM;n++){
   re[n]=PG*(2/(Math.PI*n))*Math.sin(2*Math.PI*n*duty);
   im[n]=PG*(2/(Math.PI*n))*(1-Math.cos(2*Math.PI*n*duty));}
  AM.pulseBank.push(ctx.createPeriodicWave(re,im,{disableNormalization:true}));}
 const tr=new Float32Array(HARM+1),ti=new Float32Array(HARM+1);
 for(let n=1;n<=HARM;n+=2){const k=(n-1)/2;
  ti[n]=SG*(8/(Math.PI*Math.PI))*((k%2===0?1:-1)/(n*n));}
 AM.subWave=ctx.createPeriodicWave(tr,ti,{disableNormalization:true});
 const br=new Float32Array(49),bi=new Float32Array(49);
 for(let n=1;n<=48;n++){
  br[n]=.5*(2/(Math.PI*n))*Math.sin(2*Math.PI*n*.3);
  bi[n]=.5*(2/(Math.PI*n))*(1-Math.cos(2*Math.PI*n*.3));}
 AM.blipWave=ctx.createPeriodicWave(br,bi,{disableNormalization:true});

 /* transport @ 72 BPM: arp eighths, pulse quarters, melody events */
 AM.BPM=85;AM.E8=60/AM.BPM/2; /* title theme tempo; Begin drops it to 72 */
 const CU=[48,51,55,60,63,67],CD=[72,67,63,60,55,51];
 const FU=[48,53,57,60,65,69],FD=[72,69,65,60,57,53];
 AM.SEQ=[...CU,...CD,...CU,...CD,...FU,...FD,...FU,...FD];
 AM.PENT=[60,63,65,67,70,72,75,77,79,82];
 AM.pentIdx=4;AM.motif=[60,63,67];AM.motifI=0;
 AM.t0=ctx.currentTime+.15;AM.step=0;
 AM.timer=setInterval(schedTransport,50);
 schedTransport();
}
function schedTransport(){
 const ctx=AM.ctx;if(!ctx)return;
 const now=ctx.currentTime;
 while(AM.t0+AM.step*AM.E8<now+.3){
  const when=AM.t0+AM.step*AM.E8;
  if(when>now-.05){
   const w=Math.max(when,now+.005);
   arpNote(AM.SEQ[AM.step%AM.SEQ.length],w);
   if(AM.step%2===0)pulseTick(w,AM.step%8===0);
   if(Math.random()<.14)melodyPluck(w);
   alarmTick(AM.step,w);
  }
  AM.step++;
 }
}
function arpNote(midi,when){
 const ctx=AM.ctx,f=mtof(midi),t=(midi-48)/24;
 const vel=.3+.32*t,atk=.03-.024*t,dur=AM.E8*.95;
 const sh=Math.pow(2,(Math.floor(Math.random()*5)/4-.5)*.7);
 const flt=ctx.createBiquadFilter();flt.type='lowpass';flt.Q.value=1.2;
 const peak=Math.min(12000,f*(3+3.5*t)*sh);
 flt.frequency.setValueAtTime(Math.max(100,f*1.1),when);
 flt.frequency.linearRampToValueAtTime(peak,when+atk);
 flt.frequency.exponentialRampToValueAtTime(Math.max(140,f*1.7),when+dur);
 const env=ctx.createGain();
 env.gain.setValueAtTime(0,when);
 env.gain.linearRampToValueAtTime(vel,when+atk);
 env.gain.exponentialRampToValueAtTime(vel*.55,when+atk+.18);
 env.gain.exponentialRampToValueAtTime(.0008,when+dur);
 flt.connect(env);env.connect(AM.arpG);
 const duty=(Math.sin(2*Math.PI*.22*when)+1)/2;
 const wave=AM.pulseBank[Math.round(duty*(AM.pulseBank.length-1))];
 const mk=(w,fr,det)=>{const o=ctx.createOscillator();o.setPeriodicWave(w);
  o.frequency.value=fr;o.detune.value=det;o.connect(flt);
  o.start(when);o.stop(when+dur+.05);};
 mk(wave,f,-5+5*Math.sin(2*Math.PI*.11*when));
 mk(wave,f,5+5*Math.sin(2*Math.PI*.163*when+1.7));
 mk(AM.subWave,f/2,0);
}
function pulseTick(when,accent){
 const ctx=AM.ctx;
 const o=ctx.createOscillator();o.frequency.value=accent?520:660;
 const g=ctx.createGain();
 g.gain.setValueAtTime(0,when);
 g.gain.linearRampToValueAtTime(accent?.5:.32,when+.004);
 g.gain.exponentialRampToValueAtTime(.001,when+.09);
 o.connect(g);g.connect(AM.layers.pulse);o.start(when);o.stop(when+.12);
}
function melodyPluck(when){
 const ctx=AM.ctx;
 let midi;
 if(AM.motifOn&&(AM.motifI>0||Math.random()<.3)){
  midi=AM.motif[AM.motifI];AM.motifI=(AM.motifI+1)%AM.motif.length;
 }else{
  AM.pentIdx=Math.max(0,Math.min(AM.PENT.length-1,
   AM.pentIdx+[-2,-1,-1,1,1,2][Math.floor(Math.random()*6)]));
  midi=AM.PENT[AM.pentIdx];
 }
 const f=mtof(midi);
 const o=ctx.createOscillator();o.type='triangle';o.frequency.value=f;
 const flt=ctx.createBiquadFilter();flt.type='lowpass';flt.frequency.value=2400;
 const g=ctx.createGain();
 g.gain.setValueAtTime(0,when);
 g.gain.linearRampToValueAtTime(.4,when+.006);
 g.gain.exponentialRampToValueAtTime(.001,when+.55);
 o.connect(flt);flt.connect(g);g.connect(AM.layers.melody);
 o.start(when);o.stop(when+.6);
}
/* --- descent alarms: beat-locked to the 72 BPM transport, 3/4 bars = 6 eighths --- */
function alarmTick(step,when){
 if(!AM.alarm||(gameState.scene!=='GAME2'&&gameState.scene!=='GAME3'))return;
 const m6=step%6;
 if(AM.alarm.vs>0){
  if(m6===0)alarmVsNote(35,when);   /* B1 · beat 1 */
  if(m6===2)alarmVsNote(60,when);   /* C4 · beat 2 · beat 3 rests */
 }
 if(AM.alarm.hs>0&&m6===2)alarmHsSlide(when); /* glide across beats 2-3, rest beat 1 */
 if(AM.alarm.tilt>0&&step%2===0)alarmTiltPing(when,(step/2)%4===0); /* 4/4 pings against the 3/4 */
}
function alarmVsNote(midi,when){
 const ctx=AM.ctx,f=mtof(midi),dur=AM.E8*1.85;
 const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2400;
 const g=ctx.createGain();
 g.gain.setValueAtTime(0,when);
 g.gain.linearRampToValueAtTime(.55,when+.012);
 g.gain.setValueAtTime(.55,when+dur*.7);
 g.gain.linearRampToValueAtTime(0,when+dur);
 lp.connect(g);g.connect(AM.alarmVsG);
 [[1,.4],[2,.3]].forEach(([mul,vol])=>{  /* octave partial keeps B1 audible on phone speakers */
  const o=ctx.createOscillator();o.type='square';o.frequency.value=f*mul;
  const og=ctx.createGain();og.gain.value=vol;
  o.connect(og);og.connect(lp);o.start(when);o.stop(when+dur+.03);});
}
function alarmHsSlide(when){
 const ctx=AM.ctx,dur=AM.E8*3.9;
 const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1700;
 const g=ctx.createGain();
 g.gain.setValueAtTime(0,when);
 g.gain.linearRampToValueAtTime(.4,when+.05);
 g.gain.setValueAtTime(.4,when+dur-.12);
 g.gain.linearRampToValueAtTime(0,when+dur);
 lp.connect(g);g.connect(AM.alarmHsG);
 [[1,.5],[2,.3]].forEach(([mul,vol])=>{
  const o=ctx.createOscillator();o.type='sawtooth';
  o.frequency.setValueAtTime(65.41*mul,when);              /* C2 */
  o.frequency.exponentialRampToValueAtTime(130.81*mul,when+dur); /* -> C3 */
  const og=ctx.createGain();og.gain.value=vol;
  o.connect(og);og.connect(lp);o.start(when);o.stop(when+dur+.03);});
}
function alarmTiltPing(when,accent){
 const ctx=AM.ctx,f=accent?2093:1568;
 const g=ctx.createGain();
 g.gain.setValueAtTime(0,when);
 g.gain.linearRampToValueAtTime(accent?.42:.28,when+.004);
 g.gain.exponentialRampToValueAtTime(.001,when+.22);
 g.connect(AM.alarmTiltG);
 [[1,1],[2.76,.25]].forEach(([mul,vol])=>{ /* inharmonic partial = metallic ping */
  const o=ctx.createOscillator();o.frequency.value=f*mul;
  const og=ctx.createGain();og.gain.value=vol;
  o.connect(og);og.connect(g);o.start(when);o.stop(when+.25);});
}
function setAlarmLevels(vs,hs,tilt){
 if(!AM.ctx||!AM.alarm)return;
 const t=AM.ctx.currentTime;
 if(AM.alarm.vs!==vs){AM.alarm.vs=vs;AM.alarmVsG.gain.setTargetAtTime(vs,t,.04);}
 if(AM.alarm.hs!==hs){AM.alarm.hs=hs;AM.alarmHsG.gain.setTargetAtTime(hs,t,.04);}
 if(AM.alarm.tilt!==tilt){AM.alarm.tilt=tilt;AM.alarmTiltG.gain.setTargetAtTime(tilt,t,.04);}
}
function setMix(name,ramp){
 if(!AM.ctx)return;
 const mix=MIXES[name];if(!mix)return;
 const t=AM.ctx.currentTime,r=ramp!==undefined?ramp:2;
 for(const k in AM.layers){
  const g=AM.layers[k].gain;
  g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);
  g.linearRampToValueAtTime(mix[k]||0,t+r);
 }
}
function setRumbleDrive(v){
 if(!AM.ctx)return;
 AM.rumbleDrive.gain.setTargetAtTime(v,AM.ctx.currentTime,.06);
}
function setArp(v,t){if(AM.ctx)AM.arpG.gain.linearRampToValueAtTime(v,AM.ctx.currentTime+(t||2));}
function setDrone(v,t){if(AM.ctx)AM.droneG.gain.linearRampToValueAtTime(v,AM.ctx.currentTime+(t||2));}
function setTempo(bpm){
 AM.BPM=bpm;AM.E8=60/bpm/2;
 if(!AM.ctx)return;
 AM.t0=AM.ctx.currentTime+.12;AM.step=0; /* restart the sequence at the new tempo */
 if(AM.dly)AM.dly.delayTime.setTargetAtTime(AM.E8*1.5,AM.ctx.currentTime,.05);
}
function setAmb(v,t){if(AM.ctx)AM.ambG.gain.linearRampToValueAtTime(v,AM.ctx.currentTime+(t||2));}
function warmDrone(v){if(AM.ctx)AM.droneLP.frequency.linearRampToValueAtTime(v||900,AM.ctx.currentTime+4);}
function padToMajor(){
 if(!AM.ctx)return;const t=AM.ctx.currentTime;
 AM.minor3.gain.linearRampToValueAtTime(0,t+2.5);
 AM.major3.gain.linearRampToValueAtTime(.16,t+3);
}
function padToMinor(){
 if(!AM.ctx)return;const t=AM.ctx.currentTime;
 AM.major3.gain.linearRampToValueAtTime(0,t+2.5);
 AM.minor3.gain.linearRampToValueAtTime(.16,t+3);
 AM.droneLP.frequency.linearRampToValueAtTime(520,AM.ctx.currentTime+3);
}
/* --- one-shot SFX --- */
function sfxEnv(o,g,peak,dur){const t=AM.ctx.currentTime;
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+.005);
 g.gain.exponentialRampToValueAtTime(.001,t+dur);
 o.start(t);o.stop(t+dur+.05);}
function sfxClick(){if(!AM.ctx)return;const ctx=AM.ctx;
 const o=ctx.createOscillator();o.type='square';o.frequency.value=1150;
 const g=ctx.createGain();o.connect(g);g.connect(AM.sfxG);sfxEnv(o,g,.12,.05);}
function sfxType(){if(!AM.ctx)return;const ctx=AM.ctx;
 const o=ctx.createOscillator();o.type='triangle';o.frequency.value=3600;
 const g=ctx.createGain();o.connect(g);g.connect(AM.sfxG);sfxEnv(o,g,.02,.02);}
function sfxChime(){if(!AM.ctx)return;const ctx=AM.ctx;
 [523.25,659.25,783.99].forEach((f,i)=>{
  const o=ctx.createOscillator();o.frequency.value=f;
  const g=ctx.createGain();o.connect(g);g.connect(AM.out);
  const t=ctx.currentTime+i*.07;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.13,t+.01);
  g.gain.exponentialRampToValueAtTime(.001,t+.5);o.start(t);o.stop(t+.55);});}
function sfxKlaxon(){if(!AM.ctx)return;const ctx=AM.ctx;
 [620,470,620,470].forEach((f,i)=>{
  const o=ctx.createOscillator();o.type='square';o.frequency.value=f;
  const g=ctx.createGain();o.connect(g);g.connect(AM.sfxG);
  const t=ctx.currentTime+i*.15;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.15,t+.01);
  g.gain.linearRampToValueAtTime(0,t+.13);o.start(t);o.stop(t+.15);});}
function sfxStat(sign){if(!AM.ctx)return;const ctx=AM.ctx;
 const o=ctx.createOscillator();o.frequency.setValueAtTime(520,ctx.currentTime);
 o.frequency.linearRampToValueAtTime(sign>=0?720:380,ctx.currentTime+.08);
 const g=ctx.createGain();o.connect(g);g.connect(AM.sfxG);sfxEnv(o,g,.09,.1);}
function sfxRadio(short){
 const ctx=AM.ctx;if(!ctx)return;const t=ctx.currentTime;
 const n=ctx.createBufferSource();n.buffer=AM.brown;n.loop=true;
 const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1500;bp.Q.value=2.5;
 const g=ctx.createGain();n.connect(bp);bp.connect(g);g.connect(AM.sfxG);
 g.gain.setValueAtTime(0,t);
 (short?[[.03,.1],[.2,.16]]:[[.05,.12],[.24,.1],[.4,.22],[.7,.14]]).forEach(([o,d])=>{
  g.gain.linearRampToValueAtTime(.12,t+o+.02);
  g.gain.linearRampToValueAtTime(.02,t+o+d);});
 g.gain.linearRampToValueAtTime(0,t+(short?.55:1.1));
 n.start(t);n.stop(t+1.2);
}
function sfxVelcro(){
 const ctx=AM.ctx;if(!ctx)return;const t=ctx.currentTime;
 const n=ctx.createBufferSource();n.buffer=AM.brown;n.loop=true;
 const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=1800;
 const g=ctx.createGain();n.connect(hp);hp.connect(g);g.connect(AM.sfxG);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.22,t+.02);
 g.gain.exponentialRampToValueAtTime(.001,t+.18);
 n.start(t);n.stop(t+.2);
}
function sfxThud(big){
 const ctx=AM.ctx;if(!ctx)return;const t=ctx.currentTime;
 const o=ctx.createOscillator();o.frequency.setValueAtTime(big?90:120,t);
 o.frequency.exponentialRampToValueAtTime(big?38:58,t+.16);
 const g=ctx.createGain();o.connect(g);g.connect(AM.sfxG);
 g.gain.setValueAtTime(big?.5:.3,t);g.gain.exponentialRampToValueAtTime(.001,t+(big?.5:.25));
 o.start(t);o.stop(t+.55);
}
function sfxSwell(){
 const ctx=AM.ctx;if(!ctx)return;const t=ctx.currentTime;
 [130.8,196].forEach(f=>{
  const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=Math.random()*8-4;
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=420;
  const g=ctx.createGain();o.connect(lp);lp.connect(g);g.connect(AM.out);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(.09,t+3.2);
  g.gain.linearRampToValueAtTime(0,t+7);
  o.start(t);o.stop(t+7.2);});
}
function sfxRcs(){
 const ctx=AM.ctx;if(!ctx)return;const t=ctx.currentTime;
 const n=ctx.createBufferSource();n.buffer=AM.brown;n.loop=true;
 const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=1400;
 const g=ctx.createGain();n.connect(hp);hp.connect(g);g.connect(AM.sfxG);
 g.gain.setValueAtTime(.14,t);g.gain.exponentialRampToValueAtTime(.001,t+.13);
 n.start(t);n.stop(t+.15);
}
function sfxExplosion(){
 const ctx=AM.ctx;if(!ctx)return;const t=ctx.currentTime;
 const n=ctx.createBufferSource();n.buffer=AM.brown;n.loop=true;
 const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(2500,t);
 lp.frequency.exponentialRampToValueAtTime(120,t+.9);
 const g=ctx.createGain();n.connect(lp);lp.connect(g);g.connect(AM.sfxG);
 g.gain.setValueAtTime(.55,t);g.gain.exponentialRampToValueAtTime(.001,t+1.1);
 n.start(t);n.stop(t+1.2);sfxThud(true);
}
function sfxBeep(f){
 const ctx=AM.ctx;if(!ctx)return;const t=ctx.currentTime;
 const o=ctx.createOscillator();o.frequency.value=f||1200;
 const g=ctx.createGain();o.connect(g);g.connect(AM.sfxG);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.1,t+.01);
 g.gain.exponentialRampToValueAtTime(.001,t+.18);o.start(t);o.stop(t+.2);
}
function harmonicaNote(midi,when,dur,scoop){
 const ctx=AM.ctx;if(!ctx)return;
 const f=mtof(midi);
 const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=f*2.2;bp.Q.value=1.1;
 const g=ctx.createGain();
 g.gain.setValueAtTime(0,when);
 g.gain.linearRampToValueAtTime(.42,when+.06);
 g.gain.setValueAtTime(.42,when+dur-.12);
 g.gain.linearRampToValueAtTime(0,when+dur);
 bp.connect(g);g.connect(AM.sfxG);
 const vib=ctx.createOscillator();vib.frequency.value=5.2;
 const vg=ctx.createGain();vg.gain.setValueAtTime(0,when);
 vg.gain.linearRampToValueAtTime(6,when+dur*.55);
 vib.connect(vg);vib.start(when);vib.stop(when+dur);
 [0,9].forEach(det=>{
  const o=ctx.createOscillator();o.type='square';
  o.frequency.setValueAtTime(scoop?f*.94:f,when);
  o.frequency.exponentialRampToValueAtTime(f,when+.09);
  o.detune.value=det;vg.connect(o.detune);
  const og=ctx.createGain();og.gain.value=.16;
  o.connect(og);og.connect(bp);o.start(when);o.stop(when+dur+.05);});
}
function playHarmonicaPhrase(){
 if(!AM.ctx)return 0;
 const t=AM.ctx.currentTime+.1;
 harmonicaNote(60,t,.7,true);harmonicaNote(63,t+.8,.6,false);
 harmonicaNote(67,t+1.5,1,true);harmonicaNote(63,t+2.7,.55,false);
 harmonicaNote(60,t+3.35,1.3,false);
 return 4.9;
}

/* ================= voice engine ================= */
const VOICE={mode:'tts',ttsVoices:null,active:null,cancelFn:null};
function detectVoices(){
 return new Promise(res=>{
  if(!('speechSynthesis' in window)){VOICE.mode='blip';return res();}
  const pick=()=>{
   const vs=speechSynthesis.getVoices().filter(v=>v.lang&&v.lang.toLowerCase().startsWith('en'));
   if(vs.length){
    VOICE.ttsVoices={};
    Object.keys(NPCS).forEach((k,i)=>{VOICE.ttsVoices[k]=vs[i%vs.length];});
    res();return true;}
   return false;};
  if(pick())return;
  speechSynthesis.onvoiceschanged=()=>pick();
  setTimeout(()=>{if(!VOICE.ttsVoices)VOICE.mode='blip';res();},1500);
 });
}
function speakLine(who,text){
 return new Promise(resolve=>{
  let done=false;
  const finish=()=>{if(done)return;done=true;
   if(VOICE.active===who)VOICE.active=null;VOICE.cancelFn=null;resolve();};
  VOICE.active=who;
  const c=NPCS[who];
  if(!c){finish();return;}
  if(c.radio){sfxRadio();
   const timer=setTimeout(finish,Math.max(1800,text.length*52));
   VOICE.cancelFn=()=>{clearTimeout(timer);finish();};return;}
  if(VOICE.mode==='tts'&&'speechSynthesis' in window){
   try{
    const u=new SpeechSynthesisUtterance(text);
    if(VOICE.ttsVoices&&VOICE.ttsVoices[who])u.voice=VOICE.ttsVoices[who];
    u.pitch=c.pitch;u.rate=c.rate;
    u.volume=AM.master?Math.min(1,AM.master.gain.value+.2):.9;
    u.onend=finish;u.onerror=finish;
    VOICE.cancelFn=()=>{try{speechSynthesis.cancel();}catch(e){}finish();};
    speechSynthesis.speak(u);
    setTimeout(finish,Math.max(2600,text.length*95)+2000);
    return;
   }catch(e){VOICE.mode='blip';}
  }
  if(VOICE.mode==='blip'&&AM.ctx){
   const ctx=AM.ctx;
   let t=ctx.currentTime+.05,semis=0;const nodes=[];
   for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch===' '){t+=.075;continue;}
    if(/[.,!?—…]/.test(ch)){t+=.16;continue;}
    if(i%2)continue;
    semis=Math.max(-3,Math.min(4,semis+(Math.random()*4-2)));
    const f=c.blipF*Math.pow(2,(semis+(/[aeiou]/i.test(ch)?1:0))/12);
    const o=ctx.createOscillator();o.setPeriodicWave(AM.blipWave);o.frequency.value=f;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1600;
    const g=ctx.createGain();
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.28,t+.008);
    g.gain.exponentialRampToValueAtTime(.001,t+.07);
    o.connect(lp);lp.connect(g);g.connect(AM.voiceG);
    o.start(t);o.stop(t+.09);nodes.push(o);t+=.052;
   }
   const timer=setTimeout(finish,(t-ctx.currentTime)*1000+280);
   VOICE.cancelFn=()=>{clearTimeout(timer);nodes.forEach(o=>{try{o.stop();}catch(e){}});finish();};
   return;
  }
  const timer=setTimeout(finish,Math.max(1600,text.length*58));
  VOICE.cancelFn=()=>{clearTimeout(timer);finish();};
 });
}
function cancelVoice(){if(VOICE.cancelFn)VOICE.cancelFn();}
function cycleVoiceMode(){
 VOICE.mode=VOICE.mode==='tts'?'blip':VOICE.mode==='blip'?'off':'tts';
 if(VOICE.mode==='tts'&&!('speechSynthesis' in window))VOICE.mode='blip';
 return VOICE.mode;
}
