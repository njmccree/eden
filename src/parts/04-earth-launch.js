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

const TEX_W=1024,TEX_H=512,CLD_W=256,CLD_H=128;
const surfC=document.createElement('canvas');surfC.width=TEX_W;surfC.height=TEX_H;
const cloudC=document.createElement('canvas');cloudC.width=CLD_W;cloudC.height=CLD_H;

/* Real coastlines: Natural Earth 110m land polygons (public domain), rings of
   uint16 pairs quantized to equirect (x=(lon+180)/360, y=(90-lat)/180), each
   ring length-prefixed, 0 terminates. Matches the sphere UV mapping used by
   latLonToLocal, so site pins line up with real geography for free. */
const LAND_B64='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';
let LAND_RINGS=null;
function landRings(){
 if(LAND_RINGS)return LAND_RINGS;
 const bin=atob(LAND_B64),u=new Uint16Array(bin.length/2);
 for(let i=0;i<u.length;i++)u[i]=bin.charCodeAt(2*i)|(bin.charCodeAt(2*i+1)<<8);
 const R=[];let p=0;
 while(p<u.length){
  const m=u[p++];if(!m)break;
  const r=new Float32Array(m*2);
  for(let i=0;i<m*2;i++)r[i]=u[p+i]/65535;
  p+=m*2;R.push(r);
 }
 return LAND_RINGS=R;
}
function landMask(W,H){
 const p=new Path2D();
 for(const r of landRings()){
  p.moveTo(r[0]*W,r[1]*H);
  for(let i=1;i<r.length/2;i++)p.lineTo(r[2*i]*W,r[2*i+1]*H);
  p.closePath();
 }
 const mk=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c.getContext('2d');};
 const ga=mk();ga.fillStyle='#fff';ga.fill(p);
 const gb=mk();gb.strokeStyle='#fff';gb.lineWidth=Math.max(1.5,W/420);gb.stroke(p);
 return {mask:ga.getImageData(0,0,W,H).data,shelf:gb.getImageData(0,0,W,H).data};
}

async function generateTextures(onP){
 const EW=TEX_W>>1,EH=TEX_H>>1; /* half-res noise fields, sampled by the color pass */
 const elev=new Float32Array(EW*EH),clim=new Float32Array(EW*EH);
 const yl=()=>new Promise(r=>setTimeout(r,0));
 for(let y=0;y<EH;y++){
  const v=y/EH;
  for(let x=0;x<EW;x++){
   const th=(x/EW)*Math.PI*2;
   const nx=Math.cos(th)*2,ny=Math.sin(th)*2,nz=v*4;
   elev[y*EW+x]=fbm(nx*.55+9.2,ny*.55+4.7,nz*.55+2.3,3)*.62+fbm(nx*1.5,ny*1.5,nz*1.5,4)*.55;
   clim[y*EW+x]=fbm(nx*.9+21,ny*.9+13,nz*.9+8,3);}
  if(y%16===0){onP(.55*y/EH);await yl();}}
 const L=landMask(TEX_W,TEX_H);
 const sctx=surfC.getContext('2d'),img=sctx.createImageData(TEX_W,TEX_H);
 for(let y=0;y<TEX_H;y++){
  const v=y/TEX_H,lat=90-180*v,alat=Math.abs(lat);
  const hy=Math.min(EH-1,y>>1);
  for(let x=0;x<TEX_W;x++){
   const i=y*TEX_W+x,hx=Math.min(EW-1,x>>1);
   const e=elev[hy*EW+hx],cl=clim[hy*EW+hx];
   const m=L.mask[i*4+3]/255,sh=L.shelf[i*4+3]/255;
   /* ocean */
   const dp=clamp01(.62-.5*e);
   let r=lerpN(26,9,dp),g=lerpN(88,40,dp),b=lerpN(132,76,dp);
   const shal=sh*(1-m)*.75;
   r=lerpN(r,48,shal);g=lerpN(g,122,shal);b=lerpN(b,144,shal);
   if(m>.02){ /* land, blended over ocean by mask alpha for a soft shoreline */
    const des=smooth(11,19,alat)*(1-smooth(30,40,alat))*smooth(.42,.62,cl);
    let lr=lerpN(74,96,smooth(0,55,alat)),lg=lerpN(126,116,smooth(0,55,alat)),lb=lerpN(74,84,smooth(0,55,alat));
    lr=lerpN(lr,197,des);lg=lerpN(lg,172,des);lb=lerpN(lb,116,des);
    const tun=smooth(58,70,alat);
    lr=lerpN(lr,146,tun);lg=lerpN(lg,148,tun);lb=lerpN(lb,132,tun);
    const h=clamp01((e-.6)/.34); /* highlands from the old relief ramp */
    if(h>0){
     if(h<.55){const t=h/.55;lr=lerpN(lr,120,t*.7);lg=lerpN(lg,112,t*.7);lb=lerpN(lb,96,t*.7);}
     else{const t=(h-.55)/.45;lr=lerpN(120,228,t);lg=lerpN(112,232,t);lb=lerpN(96,236,t);}
    }
    /* permanent ice: Antarctica, Greenland interior, high Arctic */
    const ice=Math.max(smooth(-58,-66,lat),
     smooth(74,80,alat),
     (lat>60&&lat<84&&x/TEX_W>.288&&x/TEX_W<.42)?smooth(62,70,lat)*.92:0);
    lr=lerpN(lr,234,ice);lg=lerpN(lg,240,ice);lb=lerpN(lb,246,ice);
    r=lerpN(r,lr,m);g=lerpN(g,lg,m);b=lerpN(b,lb,m);
   }
   /* sea ice fringe at the poles */
   const si=Math.max(smooth(-63,-71,lat),smooth(79,86,lat))*(1-m);
   r=lerpN(r,225,si);g=lerpN(g,234,si);b=lerpN(b,242,si);
   const d2=(hash3(x,y,7)-.5)*6,o=i*4;
   img.data[o]=r+d2;img.data[o+1]=g+d2;img.data[o+2]=b+d2;img.data[o+3]=255;}
  if(y%48===0){onP(.55+.3*y/TEX_H);await yl();}}
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
