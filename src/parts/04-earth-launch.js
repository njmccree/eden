/* ================= three.js: shared utils + Chapter 1 worlds ================= */
const hasTHREE=typeof THREE!=='undefined';
let renderer,scene,camera,orbitRoot,siteRoot,planet,clouds,atmoU;
let rocket,booster,boosterGrp,upperGrp,tower,padLights=[],vapor,skyU,dirLight,hemi;
let plumeFlame=null,plumeSmoke=null,launchStarsU=null,boosterFall=null;
let shakeAmp=0;const camBase=new (hasTHREE?THREE.Vector3:Object)(0,0,3.4);
let camLook=new (hasTHREE?THREE.Vector3:Object)(0,0,0);

function hash3(x,y,z){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,1440662683);
 h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;}
const smstep=t=>t*t*(3-2*t);
function vnoise(x,y,z){
 const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);
 const u=smstep(x-xi),v=smstep(y-yi),w=smstep(z-zi);
 const l=(a,b,t)=>a+(b-a)*t;
 const x00=l(hash3(xi,yi,zi),hash3(xi+1,yi,zi),u);
 const x10=l(hash3(xi,yi+1,zi),hash3(xi+1,yi+1,zi),u);
 const x01=l(hash3(xi,yi,zi+1),hash3(xi+1,yi,zi+1),u);
 const x11=l(hash3(xi,yi+1,zi+1),hash3(xi+1,yi+1,zi+1),u);
 return l(l(x00,x10,v),l(x01,x11,v),w);}
function fbm(x,y,z,oct){let a=.5,f=1,s=0,n=0;
 for(let i=0;i<oct;i++){s+=a*vnoise(x*f,y*f,z*f);n+=a;a*=.5;f*=2;}return s/n;}
const clamp01=x=>x<0?0:x>1?1:x;
const lerpN=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

const TEX_W=512,TEX_H=256,CLD_W=256,CLD_H=128;
const surfC=document.createElement('canvas');surfC.width=TEX_W;surfC.height=TEX_H;
const cloudC=document.createElement('canvas');cloudC.width=CLD_W;cloudC.height=CLD_H;

async function generateTextures(onP){
 const elev=new Float32Array(TEX_W*TEX_H);
 const yl=()=>new Promise(r=>setTimeout(r,0));
 for(let y=0;y<TEX_H;y++){
  const v=y/TEX_H;
  for(let x=0;x<TEX_W;x++){
   const th=(x/TEX_W)*Math.PI*2;
   const nx=Math.cos(th)*2,ny=Math.sin(th)*2,nz=v*4;
   elev[y*TEX_W+x]=fbm(nx*.55+9.2,ny*.55+4.7,nz*.55+2.3,3)*.62+fbm(nx*1.5,ny*1.5,nz*1.5,5)*.55;}
  if(y%24===0){onP(.6*y/TEX_H);await yl();}}
 const samp=[];for(let i=0;i<elev.length;i+=5)samp.push(elev[i]);
 samp.sort((a,b)=>a-b);
 const SEA=samp[Math.floor(samp.length*.62)];
 const sctx=surfC.getContext('2d'),img=sctx.createImageData(TEX_W,TEX_H);
 for(let y=0;y<TEX_H;y++){
  const v=y/TEX_H,lat=Math.abs(v*2-1);
  for(let x=0;x<TEX_W;x++){
   const i=y*TEX_W+x,e=elev[i],rel=e-SEA;let r,g,b;
   if(lat>.86+.06*(e-.5)){r=232;g=240;b=246;}
   else if(rel<0){const d=clamp01(-rel/.22);r=lerpN(34,8,d);g=lerpN(112,38,d);b=lerpN(150,72,d);}
   else if(rel<.012){r=178;g=162;b=122;}
   else{const h=clamp01(rel/.3);
    if(h<.45){r=lerpN(96,58,h/.45);g=lerpN(138,102,h/.45);b=lerpN(88,66,h/.45);}
    else if(h<.75){const t=(h-.45)/.3;r=lerpN(58,124,t);g=lerpN(102,118,t);b=lerpN(66,104,t);}
    else{const t=(h-.75)/.25;r=lerpN(124,226,t);g=lerpN(118,232,t);b=lerpN(104,236,t);}
    if(lat>.68){const c=smooth(.68,.86,lat);r=lerpN(r,158,c);g=lerpN(g,164,c);b=lerpN(b,150,c);}}
   const d2=(hash3(x,y,7)-.5)*7,o=i*4;
   img.data[o]=r+d2;img.data[o+1]=g+d2;img.data[o+2]=b+d2;img.data[o+3]=255;}
  if(y%32===0){onP(.6+.25*y/TEX_H);await yl();}}
 sctx.putImageData(img,0,0);
 const cctx=cloudC.getContext('2d'),cim=cctx.createImageData(CLD_W,CLD_H);
 for(let y=0;y<CLD_H;y++){
  const v=y/CLD_H;
  for(let x=0;x<CLD_W;x++){
   const th=(x/CLD_W)*Math.PI*2;
   const c=fbm(Math.cos(th)*2*1.7+31,Math.sin(th)*2*1.7+17,v*4*2.3+5,4);
   const o=(y*CLD_W+x)*4;
   cim.data[o]=255;cim.data[o+1]=255;cim.data[o+2]=255;cim.data[o+3]=smooth(.52,.74,c)*235;}
  if(y%32===0){onP(.85+.15*y/CLD_H);await yl();}}
 cctx.putImageData(cim,0,0);onP(1);
}
function spriteTex(){
 const c=document.createElement('canvas');c.width=64;c.height=64;
 const g=c.getContext('2d');
 const gr=g.createRadialGradient(32,32,2,32,32,30);
 gr.addColorStop(0,'rgba(255,255,255,1)');
 gr.addColorStop(.35,'rgba(255,220,170,.7)');
 gr.addColorStop(1,'rgba(255,180,120,0)');
 g.fillStyle=gr;g.fillRect(0,0,64,64);
 return new THREE.CanvasTexture(c);
}
function buildScene(){
 const cv=document.getElementById('scene');
 renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 renderer.setSize(window.innerWidth,window.innerHeight);
 scene=new THREE.Scene();scene.background=new THREE.Color(0x05070d);
 camera=new THREE.PerspectiveCamera(46,window.innerWidth/window.innerHeight,.05,3000);
 camera.position.copy(camBase);

 orbitRoot=new THREE.Group();scene.add(orbitRoot);
 const starLayer=(n,size,bright)=>{
  const pos=new Float32Array(n*3);
  for(let i=0;i<n;i++){const u=Math.random()*2-1,ph=Math.random()*Math.PI*2,rr=200+Math.random()*600;
   const s=Math.sqrt(1-u*u);pos[i*3]=s*Math.cos(ph)*rr;pos[i*3+1]=u*rr;pos[i*3+2]=s*Math.sin(ph)*rr;}
  const gm=new THREE.BufferGeometry();
  gm.setAttribute('position',new THREE.BufferAttribute(pos,3));
  return new THREE.Points(gm,new THREE.PointsMaterial({color:bright?0xffffff:0x9fb2c8,
   size,sizeAttenuation:false,transparent:true,opacity:bright?.95:.6}));};
 orbitRoot.add(starLayer(1700,1.2,false));
 orbitRoot.add(starLayer(300,2.2,true));
 const world=new THREE.Group();world.rotation.z=.41;orbitRoot.add(world);
 orbitRoot.userData.world=world;
 planet=new THREE.Mesh(new THREE.SphereGeometry(1,48,36),
  new THREE.MeshPhongMaterial({color:0x1b4f7d,shininess:14,specular:0x445566}));
 world.add(planet);
 clouds=new THREE.Mesh(new THREE.SphereGeometry(1.016,40,30),
  new THREE.MeshPhongMaterial({transparent:true,opacity:0,depthWrite:false,color:0xffffff}));
 world.add(clouds);
 atmoU={uColor:{value:new THREE.Color(0x6fd8c8)}};
 const atmo=new THREE.Mesh(new THREE.SphereGeometry(1.15,40,30),
  new THREE.ShaderMaterial({uniforms:atmoU,
   vertexShader:'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'uniform vec3 uColor;varying vec3 vN;void main(){float i=pow(clamp(.68-dot(vN,vec3(0.,0.,1.)),0.,1.),3.5);gl_FragColor=vec4(uColor,1.)*i*1.5;}',
   side:THREE.BackSide,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));
 atmo.renderOrder=2;world.add(atmo);
 const orbLight=new THREE.DirectionalLight(0xcfe4ff,1.25);
 orbLight.position.set(-3.5,1.6,2.2);orbitRoot.add(orbLight);
 orbitRoot.add(new THREE.AmbientLight(0x334455,.5));

 siteRoot=new THREE.Group();siteRoot.visible=false;scene.add(siteRoot);

 window.addEventListener('resize',()=>{
  renderer.setSize(window.innerWidth,window.innerHeight);
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();layoutOrbit();});
 layoutOrbit();
}
function layoutOrbit(){
 if(!hasTHREE||gameState.scene!=='MENU')return;
 const a=window.innerWidth/window.innerHeight;
 const w=orbitRoot.userData.world;
 if(a>1.05){w.position.set(.95,-.12,0);w.scale.setScalar(1.15);}
 else{w.position.set(0,-.78,0);w.scale.setScalar(1.05);}
}
function applyTextures(){
 planet.material=new THREE.MeshPhongMaterial({map:new THREE.CanvasTexture(surfC),
  specular:0x99aabb,shininess:16});
 clouds.material.map=new THREE.CanvasTexture(cloudC);
 clouds.material.opacity=.55;clouds.material.needsUpdate=true;
 if(typeof cabinClouds!=='undefined'&&cabinClouds){
  cabinClouds.material.map=new THREE.CanvasTexture(cloudC);
  cabinClouds.material.needsUpdate=true;}
}
function latLonToLocal(lat,lon,r){
 const la=lat*Math.PI/180,lo=lon*Math.PI/180;
 return new THREE.Vector3(Math.cos(la)*Math.cos(lo),Math.sin(la),-Math.cos(la)*Math.sin(lo)).multiplyScalar(r);
}
/* ---------- launch-site diorama ---------- */
function buildSite(site){
 while(siteRoot.children.length)siteRoot.remove(siteRoot.children[0]);
 padLights=[];
 const sky=site.sky;
 skyU={top:{value:new THREE.Color(sky.top)},bottom:{value:new THREE.Color(sky.horizon)}};
 const dome=new THREE.Mesh(new THREE.SphereGeometry(1400,24,16),
  new THREE.ShaderMaterial({uniforms:skyU,side:THREE.BackSide,depthWrite:false,
   vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'uniform vec3 top,bottom;varying vec3 vP;void main(){float h=clamp(normalize(vP).y*.5+.5,0.,1.);gl_FragColor=vec4(mix(bottom,top,pow(h,.65)),1.);}'}));
 siteRoot.add(dome);
 scene.fog=new THREE.Fog(sky.horizon,180,760);
 hemi=new THREE.HemisphereLight(sky.top,sky.ground,.75);siteRoot.add(hemi);
 dirLight=new THREE.DirectionalLight(sky.sun,1.15);
 dirLight.position.set(-60,80,40);siteRoot.add(dirLight);
 const ground=new THREE.Mesh(new THREE.CircleGeometry(560,40),
  new THREE.MeshPhongMaterial({color:sky.ground,shininess:2}));
 ground.rotation.x=-Math.PI/2;siteRoot.add(ground);
 const padMat=new THREE.MeshPhongMaterial({color:0x63676d});
 const pad=new THREE.Mesh(new THREE.CylinderGeometry(9,10,.9,24),padMat);
 pad.position.y=.45;siteRoot.add(pad);
 const trench=new THREE.Mesh(new THREE.BoxGeometry(5,.7,18),
  new THREE.MeshPhongMaterial({color:0x3a3e44}));
 trench.position.set(0,.35,9);siteRoot.add(trench);
 /* ---------- the 2031 stack: reusable booster + vacuum upper ---------- */
 rocket=new THREE.Group();
 const white=new THREE.MeshPhongMaterial({color:0xe9eaee,shininess:34,specular:0x8899aa});
 const dark=new THREE.MeshPhongMaterial({color:0x23272e,flatShading:true});
 const black=new THREE.MeshPhongMaterial({color:0x14171c,shininess:60,specular:0x333});
 const accent=new THREE.MeshPhongMaterial({color:0xc45a3c,flatShading:true});
 const steel=new THREE.MeshPhongMaterial({color:0x9aa2ac,shininess:70,specular:0xffffff});

 boosterGrp=new THREE.Group();rocket.add(boosterGrp);
 const core=new THREE.Mesh(new THREE.CylinderGeometry(1.12,1.22,9.6,24),white);
 core.position.y=4.9;boosterGrp.add(core);
 const skirt=new THREE.Mesh(new THREE.CylinderGeometry(1.24,1.34,.9,24),black);
 skirt.position.y=.55;boosterGrp.add(skirt);
 /* seven-engine cluster */
 const bellGeo=new THREE.ConeGeometry(.34,.62,10,1,true);
 [[0,0]].concat([0,1,2,3,4,5].map(k=>{
  const a=k*Math.PI/3;return [Math.cos(a)*.72,Math.sin(a)*.72];}))
 .forEach(([bx,bz])=>{
  const b=new THREE.Mesh(bellGeo,dark);
  b.position.set(bx,.12,bz);b.rotation.x=Math.PI;boosterGrp.add(b);});
 /* grid fins near the top — they leave with the booster */
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2+Math.PI/4;
  const fin=new THREE.Group();
  const panel=new THREE.Mesh(new THREE.BoxGeometry(.95,.8,.09),steel);
  fin.add(panel);
  for(const gx of[-.28,0,.28]){
   const rib=new THREE.Mesh(new THREE.BoxGeometry(.05,.8,.12),dark);
   rib.position.x=gx;fin.add(rib);}
  for(const gy of[-.24,.24]){
   const rib=new THREE.Mesh(new THREE.BoxGeometry(.95,.05,.12),dark);
   rib.position.y=gy;fin.add(rib);}
  fin.position.set(Math.cos(a)*1.42,8.9,Math.sin(a)*1.42);
  fin.rotation.y=-a+Math.PI/2;
  boosterGrp.add(fin);}
 /* folded landing legs, raceway, bands */
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2;
  const leg=new THREE.Mesh(new THREE.BoxGeometry(.22,4.6,.34),black);
  leg.position.set(Math.cos(a)*1.28,2.6,Math.sin(a)*1.28);
  leg.rotation.y=-a;boosterGrp.add(leg);}
 const race=new THREE.Mesh(new THREE.BoxGeometry(.16,9.2,.14),dark);
 race.position.set(0,4.9,1.2);boosterGrp.add(race);
 const band1=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,.28,24),accent);
 band1.position.y=8.2;boosterGrp.add(band1);
 const inter=new THREE.Mesh(new THREE.CylinderGeometry(1.13,1.13,.7,24),black);
 inter.position.y=10.05;boosterGrp.add(inter);

 upperGrp=new THREE.Group();upperGrp.position.y=10.4;rocket.add(upperGrp);
 const vacBell=new THREE.Mesh(new THREE.ConeGeometry(.95,1.5,14,1,true),dark);
 vacBell.position.y=.55;vacBell.rotation.x=Math.PI;upperGrp.add(vacBell);
 const up=new THREE.Mesh(new THREE.CylinderGeometry(1.06,1.1,3.4,24),white);
 up.position.y=3;upperGrp.add(up);
 const avio=new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.08,.24,24),dark);
 avio.position.y=4.5;upperGrp.add(avio);
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2+Math.PI/4;
  const rcs=new THREE.Mesh(new THREE.BoxGeometry(.22,.22,.3),steel);
  rcs.position.set(Math.cos(a)*1.06,4.1,Math.sin(a)*1.06);upperGrp.add(rcs);}
 const band2=new THREE.Mesh(new THREE.CylinderGeometry(1.07,1.07,.2,24),accent);
 band2.position.y=1.7;upperGrp.add(band2);
 /* bi-conic fairing with seam */
 const fair=new THREE.Mesh(new THREE.CylinderGeometry(1.12,1.06,1.5,24),white);
 fair.position.y=5.45;upperGrp.add(fair);
 const seam=new THREE.Mesh(new THREE.TorusGeometry(1.1,.035,8,28),dark);
 seam.rotation.x=Math.PI/2;seam.position.y=6.2;upperGrp.add(seam);
 const noseLo=new THREE.Mesh(new THREE.CylinderGeometry(.62,1.12,1.5,24),white);
 noseLo.position.y=6.95;upperGrp.add(noseLo);
 const noseHi=new THREE.Mesh(new THREE.ConeGeometry(.62,1.7,24),white);
 noseHi.position.y=8.55;upperGrp.add(noseHi);
 const tip=new THREE.Mesh(new THREE.SphereGeometry(.12,8,8),steel);
 tip.position.y=9.42;upperGrp.add(tip);
 const antenna=new THREE.Mesh(new THREE.BoxGeometry(.08,1.3,.06),dark);
 antenna.position.set(0,5.4,1.1);upperGrp.add(antenna);

 booster=boosterGrp; /* legacy name used by staging/skip paths */
 rocket.position.y=.9;rocket.position.x=0;rocket.rotation.z=0;
 siteRoot.add(rocket);
 boosterFall=null;launch.staged=false;

 tower=new THREE.Group();
 const tMat=new THREE.MeshPhongMaterial({color:0x8a2f2a});
 for(const dx of[-1,1]){
  const leg=new THREE.Mesh(new THREE.BoxGeometry(.5,19,.5),tMat);
  leg.position.set(4.6+dx*.9,9.5,0);tower.add(leg);}
 for(let i=0;i<6;i++){
  const bar=new THREE.Mesh(new THREE.BoxGeometry(2.4,.3,.5),tMat);
  bar.position.set(4.6,2.5+i*3.3,0);tower.add(bar);}
 const boom2=new THREE.Mesh(new THREE.BoxGeometry(3.4,.35,.5),tMat);
 boom2.position.set(2.9,16.5,0);tower.add(boom2);
 siteRoot.add(tower);
 [[26,-20,10,4,14,0x9aa0a8],[-30,-26,14,6,9,0x7d838c],[-16,30,8,3.5,8,0xa9adb4]]
 .forEach(([x,z,w,h,d,c])=>{
  const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
   new THREE.MeshPhongMaterial({color:c}));
  b.position.set(x,h/2,z);siteRoot.add(b);});
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2+Math.PI/4;
  const m=new THREE.Mesh(new THREE.SphereGeometry(.22,8,8),
   new THREE.MeshBasicMaterial({color:0xff5544}));
  m.position.set(Math.cos(a)*8.4,1.2,Math.sin(a)*8.4);
  siteRoot.add(m);padLights.push(m);}
 vapor=makeParticles(36,spriteTex(),1.6,0xdfe8ee);
 vapor.pts.position.set(0,12,0);siteRoot.add(vapor.pts);
 for(let i=0;i<vapor.n;i++)vaporReset(i,true);
 /* world-space plume: flame jet + lingering smoke, independent of the vehicle */
 plumeFlame=makePool(240,2.8,0xffc27a,true);siteRoot.add(plumeFlame.pts);
 plumeSmoke=makePool(340,5.2,0xcfd3d8,false);siteRoot.add(plumeSmoke.pts);
 /* one-by-one stars behind the darkening sky */
 const SN=340,sPos=new Float32Array(SN*3),sTh=new Float32Array(SN),sSz=new Float32Array(SN);
 for(let i=0;i<SN;i++){
  const u=Math.random()*.92+.05,ph=Math.random()*Math.PI*2,r=1300;
  const s=Math.sqrt(1-u*u);
  sPos[i*3]=s*Math.cos(ph)*r;sPos[i*3+1]=u*r;sPos[i*3+2]=s*Math.sin(ph)*r;
  sTh[i]=.12+Math.random()*.8;sSz[i]=2+Math.random()*2.4;}
 const sg=new THREE.BufferGeometry();
 sg.setAttribute('position',new THREE.BufferAttribute(sPos,3));
 sg.setAttribute('aThresh',new THREE.BufferAttribute(sTh,1));
 sg.setAttribute('aSize',new THREE.BufferAttribute(sSz,1));
 launchStarsU={uDark:{value:0},uT:{value:0}};
 const sm=new THREE.ShaderMaterial({uniforms:launchStarsU,transparent:true,depthWrite:false,
  vertexShader:'attribute float aThresh;attribute float aSize;varying float vA;uniform float uDark;uniform float uT;'+
   'void main(){float on=smoothstep(aThresh,aThresh+.05,uDark);'+
   'vA=on*(0.75+0.25*sin(uT*2.1+position.x));'+
   'gl_PointSize=aSize;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying float vA;void main(){vec2 d=gl_PointCoord-vec2(.5);'+
   'float a=vA*smoothstep(.5,.12,length(d));gl_FragColor=vec4(.86,.9,1.,a);}'});
 const lStars=new THREE.Points(sg,sm);lStars.frustumCulled=false;
 siteRoot.add(lStars);
}
function makeParticles(n,tex,size,color){
 const pos=new Float32Array(n*3),vel=new Float32Array(n*3),life=new Float32Array(n);
 const gm=new THREE.BufferGeometry();
 gm.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const mat=new THREE.PointsMaterial({map:tex,size,color,transparent:true,
  opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending});
 const pts=new THREE.Points(gm,mat);pts.frustumCulled=false;
 return {pts,pos,vel,life,n,geo:gm};
}
function vaporReset(i,rand){
 vapor.pos[i*3]=(Math.random()-.5)*.7;
 vapor.pos[i*3+1]=rand?Math.random()*4:0;
 vapor.pos[i*3+2]=(Math.random()-.5)*.7;
 vapor.vel[i*3]=(Math.random()-.5)*.25;
 vapor.vel[i*3+1]=.35+Math.random()*.4;
 vapor.vel[i*3+2]=(Math.random()-.5)*.25;
 vapor.life[i]=2.5+Math.random()*2.5;
}
function updateVapor(dt){
 if(!vapor)return;
 for(let i=0;i<vapor.n;i++){
  vapor.life[i]-=dt;
  if(vapor.life[i]<=0)vaporReset(i,false);
  vapor.pos[i*3]+=vapor.vel[i*3]*dt;
  vapor.pos[i*3+1]+=vapor.vel[i*3+1]*dt;
  vapor.pos[i*3+2]+=vapor.vel[i*3+2]*dt;}
 vapor.geo.attributes.position.needsUpdate=true;
}

/* ---------- staging + world-space plume ---------- */
function stageSeparation(instant){
 if(launch.staged)return;
 launch.staged=true;
 const wy=rocket.position.y;
 rocket.remove(boosterGrp);
 if(instant){boosterGrp.visible=false;return;}
 siteRoot.add(boosterGrp);
 boosterGrp.position.set(0,wy,0);
 boosterFall={vy:14,vx:1.6+Math.random()*1.2,w:.9+Math.random()*.5,t:0};
 for(let i=0;i<18;i++)
  emitP(plumeFlame,0,wy+10.2,0,
   (Math.random()-.5)*8,(Math.random()-.5)*6,(Math.random()-.5)*8,.3+Math.random()*.2);
}
function updateBoosterFall(dt){
 if(!boosterFall||!boosterGrp.visible)return;
 boosterFall.t+=dt;
 boosterFall.vy-=9*dt;
 boosterGrp.position.y+=boosterFall.vy*dt;
 boosterGrp.position.x+=boosterFall.vx*dt;
 boosterGrp.rotation.z+=boosterFall.w*dt;
 if(boosterFall.t>14||boosterGrp.position.y<rocket.position.y-700)boosterGrp.visible=false;
}
function emitPlume(dt){
 if(!plumeFlame)return;
 const engY=rocket.position.y+(launch.staged?10.55:0.15);
 const scale=launch.staged?.6:1;
 const nF=Math.max(1,Math.floor(150*scale*dt));
 for(let i=0;i<nF;i++)
  emitP(plumeFlame,(Math.random()-.5)*.9*scale,engY,(Math.random()-.5)*.9*scale,
   (Math.random()-.5)*4,-48-Math.random()*22,(Math.random()-.5)*4,
   .12+Math.random()*.12);
 /* smoke only where there is air */
 const airy=1-smooth(60,170,engY);
 if(airy>0.02&&!launch.staged){
  const nS=Math.max(1,Math.floor(70*airy*dt));
  const nearPad=engY<9;
  for(let i=0;i<nS;i++){
   if(nearPad){
    const a=Math.random()*Math.PI*2,sp=9+Math.random()*15;
    emitP(plumeSmoke,(Math.random()-.5)*1.5,.6,(Math.random()-.5)*1.5,
     Math.cos(a)*sp,1.2+Math.random()*2.5,Math.sin(a)*sp,2.6+Math.random()*1.6);
   }else{
    emitP(plumeSmoke,(Math.random()-.5)*1.4,engY-1.5,(Math.random()-.5)*1.4,
     (Math.random()-.5)*3,-14-Math.random()*8,(Math.random()-.5)*3,1.6+Math.random()*.9);
   }
  }
 }
}
