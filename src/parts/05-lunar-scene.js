/* ================= three.js: cabin + lunar surface ================= */
let cabinRoot,terraRoot,crew={},cabinEarth,cabinClouds,moonMesh,motes,leds=[],props={};
let lander,landerBell,beacons=[],earthBall,lExh,lDust,lBoom;
let terraSun=null,terraAmb=null,sunDisc=null;

function moonTexture(){
 const W=256,H=128,c=document.createElement('canvas');c.width=W;c.height=H;
 const g=c.getContext('2d'),img=g.createImageData(W,H);
 const craters=[];
 for(let k=0;k<14;k++)craters.push([hash3(k,3,7)*W,hash3(k,9,2)*H,4+hash3(k,5,5)*16]);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const th=(x/W)*Math.PI*2,v=y/H;
  let g0=142+(vnoise(Math.cos(th)*3+7,Math.sin(th)*3+2,v*6+1)-.5)*52;
  for(const[cx,cy,r]of craters){
   let dx=Math.abs(x-cx);dx=Math.min(dx,W-dx);
   const d=Math.hypot(dx,y-cy);
   if(d<r)g0-=18*(1-d/r);
   else if(d<r*1.25)g0+=10*(1-(d-r)/(r*.25));}
  g0+=smooth(.86,1,v)*20;
  const o=(y*W+x)*4;
  img.data[o]=g0;img.data[o+1]=g0;img.data[o+2]=g0+4;img.data[o+3]=255;}
 g.putImageData(img,0,0);
 return new THREE.CanvasTexture(c);
}
function smallEarthTexture(){
 const W=256,H=128,c=document.createElement('canvas');c.width=W;c.height=H;
 const g=c.getContext('2d'),img=g.createImageData(W,H);
 const L=landMask(W,H); /* real coastlines (04) — cabin window + earthBall */
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const v=y/H,lat=90-180*v,alat=Math.abs(lat);
  const i=y*W+x,m=L.mask[i*4+3]/255;
  let r=30,gg=98,b=142;
  if(m>.02){
   const lr=lerpN(84,150,smooth(35,65,alat)),lg=lerpN(124,150,smooth(35,65,alat)),lb=lerpN(80,134,smooth(35,65,alat));
   r=lerpN(r,lr,m);gg=lerpN(gg,lg,m);b=lerpN(b,lb,m);
  }
  const ice=Math.max(smooth(-58,-66,lat),smooth(72,80,alat));
  r=lerpN(r,233,ice);gg=lerpN(gg,240,ice);b=lerpN(b,246,ice);
  const o=i*4;img.data[o]=r;img.data[o+1]=gg;img.data[o+2]=b;img.data[o+3]=255;}
 g.putImageData(img,0,0);
 return new THREE.CanvasTexture(c);
}
function earthBallTexture(){return smallEarthTexture();}

/* ---- pooled particles (lander effects) ---- */
function makePool(n,size,color,additive){
 const pos=new Float32Array(n*3),vel=new Float32Array(n*3),life=new Float32Array(n);
 const gm=new THREE.BufferGeometry();
 gm.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const c=document.createElement('canvas');c.width=32;c.height=32;
 const g=c.getContext('2d');
 const gr=g.createRadialGradient(16,16,1,16,16,15);
 gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');
 g.fillStyle=gr;g.fillRect(0,0,32,32);
 const mat=new THREE.PointsMaterial({map:new THREE.CanvasTexture(c),size,color,
  transparent:true,opacity:additive?.9:.5,depthWrite:false,
  blending:additive?THREE.AdditiveBlending:THREE.NormalBlending});
 const pts=new THREE.Points(gm,mat);pts.frustumCulled=false;
 for(let i=0;i<n;i++)life[i]=-1;
 return {pts,pos,vel,life,n,geo:gm,cursor:0};
}
function stepPool(P,dt,grav){
 for(let i=0;i<P.n;i++){
  if(P.life[i]<0){P.pos[i*3+1]=-9999;continue;}
  P.life[i]-=dt;
  if(P.life[i]<0){P.pos[i*3+1]=-9999;continue;}
  P.vel[i*3+1]+=(grav||0)*dt;
  P.pos[i*3]+=P.vel[i*3]*dt;
  P.pos[i*3+1]+=P.vel[i*3+1]*dt;
  P.pos[i*3+2]+=P.vel[i*3+2]*dt;}
 P.geo.attributes.position.needsUpdate=true;
}
function emitP(P,x,y,z,vx,vy,vz,life){
 const i=P.cursor%P.n;P.cursor++;
 P.pos[i*3]=x;P.pos[i*3+1]=y;P.pos[i*3+2]=z;
 P.vel[i*3]=vx;P.vel[i*3+1]=vy;P.vel[i*3+2]=vz;
 P.life[i]=life;
}

/* ---- terrain profile ---- */
const PAD_X=46,PAD_TOP=6.7,PAD_HALF=15;
function terrainH(x){
 let h=10+(vnoise(x*.012+7,2.2,4.4)-.5)*34+(vnoise(x*.05+2,8.1,1.2)-.5)*8;
 h+=smooth(70,230,x)*64;
 const bowl=smooth(-260,-165,x)*(1-smooth(-150,-70,x));
 h-=bowl*24;
 const w=smooth(PAD_X-24,PAD_X-15,x)*(1-smooth(PAD_X+15,PAD_X+24,x));
 return lerpN(h,6,w);
}
function groundY(x){
 return (Math.abs(x-PAD_X)<=PAD_HALF)?PAD_TOP:terrainH(x);
}

/* ---- 3D terrain field (visual only — gameplay reads terrainH(x) on the z=0 line) ----
   Real polar morphology at metre scale: a deterministic crater field with
   parabolic bowls, raised rims (~4% D) and ejecta falloff; the ice bowl
   circularised into a proper PSR; the eastern rise treated as a crater-rim
   flank arcing away northward. Inside the traverse corridor (|z|<16, faded
   out by 46) the height is exactly terrainH(x), so Ch.2 landing physics,
   Ch.3 battery economy and every sim stay untouched. */
const CRATERS=(()=>{
 const L=[];
 for(let k=0;k<560&&L.length<120;k++){
  const cx=-1500+hash3(k,17,3)*3000,cz=-1500+hash3(k,29,11)*3000;
  const r=20+48*Math.pow(hash3(k,41,7),2.6); /* min ~3x grid cell or craters alias to spikes */
  if(Math.abs(cz)<46+r*2.6+6)continue;              /* keep the corridor clean */
  if(Math.hypot(cx-PAD_X,cz)<r*2.6+60)continue;     /* and the pad approaches */
  const age=.3+.7*hash3(k,53,19);                   /* old craters are softened */
  L.push([cx,cz,r,r*.3*age,r*.08*age]);
 }
 return L;
})();
function craterD(x,z){
 let h=0;
 for(const[cx,cz,r,dep,rim]of CRATERS){
  const dx=x-cx;if(dx<-r*2.4||dx>r*2.4)continue;
  const dz=z-cz;if(dz<-r*2.4||dz>r*2.4)continue;
  const q=Math.hypot(dx,dz)/r;
  if(q<1)h+=dep*(q*q-1)+rim*q*q*q*q;
  else if(q<2.4)h+=rim*Math.pow((2.4-q)/1.4,3);
 }
 return h;
}
function wildH(x,z){
 const xr=x+z*z*.00035;                             /* rim flank curves away */
 const fl=smooth(70,230,xr);
 let h=10+((fbm(x*.0085+7,z*.0085+2.2,4.4,3)-.5)*22
  +(vnoise(x*.028+2,z*.028+8.1,1.2)-.5)*1.6)*(1-.65*fl); /* calm the steep wall */
 const rb=Math.hypot(x+158,z);
 h-=(1-smooth(12,97,rb))*24;                        /* the PSR ice bowl */
 h+=fl*64+smooth(240,900,xr)*80
  +smooth(150,320,xr)*(fbm(x*.006+1,z*.006+5,7.7,3)-.4)*44;
 return h+craterD(x,z);
}
function terrainH3(x,z){
 const w=(1-smooth(16,120,Math.abs(z)))*smooth(-500,-390,x)*(1-smooth(390,500,x));
 if(w>=1)return terrainH(x);
 const h=wildH(x,z);
 return w>0?lerpN(h,terrainH(x),w):h;
}
function terraShade(x,z,h){
 const mf=1-smooth(300,800,Math.hypot(x,z));        /* mottle aliases on coarse far cells */
 let v=1+(vnoise(x*.02+4,z*.02+6,9.9)-.5)*.14*mf;   /* albedo mottle */
 const rb=Math.hypot(x+158,z);
 v*=1-.62*(1-smooth(30,95,rb));                     /* PSR floor goes near-black */
 const cd=craterD(x,z);
 if(cd<0)v*=1-.12*Math.min(1,-cd/6);                /* dusty crater floors */
 v*=1+smooth(40,140,h)*.06;                         /* sunward flank a touch lighter */
 return v;
}
/* two uniform patches (square cells — graded/aniso cells sliver into teeth
   at grazing angles): fine 7m inner grid, coarse 34m outer grid dropped .5m
   so it tucks under the inner one instead of z-fighting */
function terrainPatch(x0,x1,z0,z1,step,drop){
 const nx=Math.round((x1-x0)/step)+1,nz=Math.round((z1-z0)/step)+1;
 const pos=new Float32Array(nx*nz*3),col=new Float32Array(nx*nz*3);
 let p=0;
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
  const x=x0+i*step,z=z0+j*step,h=terrainH3(x,z)-drop;
  pos[p]=x;pos[p+1]=h;pos[p+2]=z;
  const s=terraShade(x,z,h);
  col[p]=s;col[p+1]=s;col[p+2]=Math.min(1.2,s*1.02);
  p+=3;
 }
 const idx=[];
 for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){
  const a=j*nx+i,b=a+1,c=a+nx,d=c+1;
  idx.push(a,c,d,a,d,b); /* uniform diagonal — alternating splits checkerboard on curved slopes */
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(pos,3));
 g.setAttribute('color',new THREE.BufferAttribute(col,3));
 g.setIndex(idx);
 return new THREE.Mesh(g,new THREE.MeshPhongMaterial({color:0x9a9da2,
  vertexColors:true,flatShading:true,shininess:3}));
}
function buildHorizon(R,base,lift,tone){
 const N=150,pos=new Float32Array((N+1)*2*3),idx=[];
 for(let i=0;i<=N;i++){
  const a=i/N*Math.PI*2,cx=Math.cos(a),sz=Math.sin(a);
  const e=smooth(.1,1,cx);                          /* taller toward the east rim */
  const h=base+e*lift*.9+(fbm(cx*3+2,sz*3+7,5.5,3)-.35)*lift;
  const o=i*6;
  pos[o]=cx*R;pos[o+1]=-60;pos[o+2]=sz*R;
  pos[o+3]=cx*R;pos[o+4]=h;pos[o+5]=sz*R;
  if(i<N){const q=i*2;idx.push(q,q+1,q+2,q+1,q+3,q+2);}
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(pos,3));
 g.setIndex(idx);
 return new THREE.Mesh(g,new THREE.MeshPhongMaterial({color:tone,
  flatShading:true,shininess:2,side:THREE.DoubleSide}));
}

function makeCrew(accent,skinHex,hairHex){
 /* adult proportions on the same rig anchors: headPivot y=.98 (cutscene
    cameras aim here), jaw rest y=-.12, armR pivot + hand offset preserved
    so the gesture/raise poses and prop attach points still land */
 const g=new THREE.Group();
 const suit=new THREE.MeshPhongMaterial({color:0xe4e6ea,flatShading:true,shininess:12});
 const suitD=new THREE.MeshPhongMaterial({color:0xc4c8cf,flatShading:true,shininess:8});
 const skin=new THREE.MeshPhongMaterial({color:skinHex||0xd9c4ac,shininess:5});
 const hairM=new THREE.MeshPhongMaterial({color:hairHex||0x2e2a26,flatShading:true,shininess:4});
 const seg=(mat,r1,r2,len)=>new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,len,8),mat);
 const hips=new THREE.Mesh(new THREE.CylinderGeometry(.17,.15,.18,10),suitD);
 hips.position.y=.12;g.add(hips);
 const torso=new THREE.Mesh(new THREE.CylinderGeometry(.22,.17,.52,10),suit);
 torso.position.y=.46;g.add(torso);
 [[-.24],[.24]].forEach(([x])=>{
  const sh=new THREE.Mesh(new THREE.SphereGeometry(.08,8,7),suit);
  sh.position.set(x,.7,.01);g.add(sh);});
 const patch=new THREE.Mesh(new THREE.BoxGeometry(.09,.07,.02),
  new THREE.MeshBasicMaterial({color:accent}));
 patch.position.set(.11,.6,.2);g.add(patch);
 const collar=new THREE.Mesh(new THREE.TorusGeometry(.1,.032,8,14),
  new THREE.MeshPhongMaterial({color:0x9aa0a8}));
 collar.rotation.x=Math.PI/2;collar.position.y=.79;g.add(collar);
 const neck=seg(skin,.048,.052,.1);neck.position.y=.85;g.add(neck);
 /* head */
 const headPivot=new THREE.Group();headPivot.position.y=.98;g.add(headPivot);
 const skull=new THREE.Mesh(new THREE.SphereGeometry(.105,14,12),skin);
 skull.scale.set(.92,1.12,.98);headPivot.add(skull);
 const hairC=new THREE.Mesh(new THREE.SphereGeometry(.113,12,9,0,Math.PI*2,0,2.05),hairM);
 hairC.rotation.x=-.78;hairC.position.set(0,.02,-.012);headPivot.add(hairC);
 const eyeMat=new THREE.MeshBasicMaterial({color:0x22262d});
 const eyeL=new THREE.Mesh(new THREE.SphereGeometry(.013,6,6),eyeMat);
 eyeL.position.set(-.042,.012,.093);headPivot.add(eyeL);
 const eyeR=eyeL.clone();eyeR.position.x=.042;headPivot.add(eyeR);
 [[-.042,.05],[.042,-.05]].forEach(([x,rz])=>{
  const brow=new THREE.Mesh(new THREE.BoxGeometry(.038,.008,.012),hairM);
  brow.position.set(x,.048,.096);brow.rotation.z=rz;headPivot.add(brow);});
 const nose=new THREE.Mesh(new THREE.ConeGeometry(.013,.032,5),skin);
 nose.rotation.x=Math.PI/2;nose.position.set(0,-.012,.108);headPivot.add(nose);
 [[-.098],[.098]].forEach(([x])=>{
  const ear=new THREE.Mesh(new THREE.SphereGeometry(.02,6,6),skin);
  ear.scale.set(.45,1,.7);ear.position.set(x,-.005,.005);headPivot.add(ear);});
 const mouthBack=new THREE.Mesh(new THREE.BoxGeometry(.044,.02,.02),
  new THREE.MeshBasicMaterial({color:0x33201a}));
 mouthBack.position.set(0,-.09,.048);headPivot.add(mouthBack);
 const jaw=new THREE.Mesh(new THREE.SphereGeometry(.082,10,8),skin);
 jaw.scale.set(.9,.68,.92);jaw.position.set(0,-.115,.022);headPivot.add(jaw);
 const lip=new THREE.Mesh(new THREE.BoxGeometry(.042,.006,.01),
  new THREE.MeshPhongMaterial({color:0xa06a58}));
 lip.position.set(0,.036,.062);jaw.add(lip);
 /* arms: left bent across, right on the gesture rig */
 const armL=new THREE.Group();armL.position.set(-.26,.68,.03);g.add(armL);
 const upL=seg(suit,.05,.045,.28);upL.position.set(0,-.13,.02);upL.rotation.x=-.25;armL.add(upL);
 const elL=new THREE.Mesh(new THREE.SphereGeometry(.05,7,6),suitD);
 elL.position.set(0,-.26,.06);armL.add(elL);
 const foL=seg(suit,.042,.038,.26);
 foL.position.set(.07,-.3,.17);foL.rotation.x=-1.25;foL.rotation.z=-.5;armL.add(foL);
 const glL=new THREE.Mesh(new THREE.SphereGeometry(.05,7,6),suitD);
 glL.position.set(.15,-.32,.27);armL.add(glL);
 armL.rotation.z=.18;
 const armR=new THREE.Group();armR.position.set(.3,.6,.05);g.add(armR);
 const upR=seg(suit,.05,.045,.28);upR.position.set(0,-.13,.015);upR.rotation.x=.1;armR.add(upR);
 const elR=new THREE.Mesh(new THREE.SphereGeometry(.05,7,6),suitD);
 elR.position.set(0,-.27,.03);armR.add(elR);
 const foR=seg(suit,.042,.038,.26);foR.position.set(0,-.4,.015);foR.rotation.x=-.12;armR.add(foR);
 const glR=new THREE.Mesh(new THREE.SphereGeometry(.052,7,6),suitD);
 glR.position.set(0,-.53,0);armR.add(glR);
 const hand=new THREE.Group();hand.position.set(0,-.55,0);armR.add(hand);
 armR.rotation.z=-.55;armR.rotation.x=-.35;
 /* seated float: thigh + shin with a knee */
 [[-.11],[.11]].forEach(([x])=>{
  const thigh=new THREE.Group();thigh.position.set(x,.06,.06);thigh.rotation.x=-1.25;g.add(thigh);
  const th=seg(suit,.062,.055,.3);th.position.y=-.15;thigh.add(th);
  const knee=new THREE.Mesh(new THREE.SphereGeometry(.058,7,6),suitD);
  knee.position.y=-.3;thigh.add(knee);
  const shin=new THREE.Group();shin.position.y=-.31;shin.rotation.x=1.05;thigh.add(shin);
  const sh=seg(suit,.05,.045,.28);sh.position.y=-.14;shin.add(sh);
  const boot=new THREE.Mesh(new THREE.BoxGeometry(.085,.06,.15),suitD);
  boot.position.set(0,-.3,.03);shin.add(boot);});
 return {g,headPivot,jaw,eyeL,eyeR,armR,hand,
  phase:Math.random()*7,speak:0,gestureT:0,raise:false,blinkT:2+Math.random()*3,
  armBase:{z:-.55,x:-.35},lookMix:new THREE.Vector3(0,.6,2)};
}

function buildCabin(){
 cabinRoot=new THREE.Group();cabinRoot.visible=false;scene.add(cabinRoot);
 const R=2.5,Lc=7;
 const wall=new THREE.Mesh(new THREE.CylinderGeometry(R,R,Lc,20,1,true),
  new THREE.MeshPhongMaterial({color:0xc9cdd4,side:THREE.BackSide,flatShading:true,shininess:8}));
 wall.rotation.x=Math.PI/2;cabinRoot.add(wall);
 for(const z of[-2.6,-.9,.9,2.6]){
  const rib=new THREE.Mesh(new THREE.TorusGeometry(R-.04,.06,8,20),
   new THREE.MeshPhongMaterial({color:0x8a9099,flatShading:true}));
  rib.position.z=z;cabinRoot.add(rib);}
 const fore=new THREE.Mesh(new THREE.CircleGeometry(R,20),
  new THREE.MeshPhongMaterial({color:0xb7bcc4,flatShading:true}));
 fore.position.z=-Lc/2;cabinRoot.add(fore);
 const aft=new THREE.Mesh(new THREE.RingGeometry(.62,R,24,3),
  new THREE.MeshPhongMaterial({color:0xb7bcc4,side:THREE.DoubleSide,flatShading:true}));
 aft.position.z=Lc/2;cabinRoot.add(aft);
 const frame=new THREE.Mesh(new THREE.TorusGeometry(.62,.09,10,28),
  new THREE.MeshPhongMaterial({color:0x555b64}));
 frame.position.z=Lc/2;cabinRoot.add(frame);
 const deck=new THREE.Mesh(new THREE.BoxGeometry(2.6,.12,Lc-.4),
  new THREE.MeshPhongMaterial({color:0x6d737c,flatShading:true}));
 deck.position.y=-1.15;cabinRoot.add(deck);
 const table=new THREE.Mesh(new THREE.BoxGeometry(1.5,.5,1.1),
  new THREE.MeshPhongMaterial({color:0x9aa0a8,flatShading:true}));
 table.position.set(0,-.85,.3);cabinRoot.add(table);
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.5),
  new THREE.MeshBasicMaterial({color:0x14303a}));
 screen.rotation.x=-Math.PI/2;screen.position.set(0,-.59,.3);cabinRoot.add(screen);
 const boxMat=new THREE.MeshPhongMaterial({color:0x848b95,flatShading:true});
 [[-1.9,.3,-1.4,.7,.9,.4],[1.9,.1,-.6,.6,1.2,.35],[-1.8,-.2,1.6,.8,.7,.4],[1.85,.5,1.2,.5,.6,.5]]
 .forEach(([x,y,z,w,h,d])=>{
  const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),boxMat);
  b.position.set(x,y,z);b.lookAt(0,y,z);cabinRoot.add(b);});
 const bagMat=new THREE.MeshPhongMaterial({color:0xe6e2d6,flatShading:true});
 [[-1.5,1.5,.4],[1.4,1.55,-1],[0,1.9,1.8],[-1.2,1.6,-2]].forEach(([x,y,z])=>{
  const bag=new THREE.Mesh(new THREE.SphereGeometry(.34,7,6),bagMat);
  bag.scale.set(1,.7,1.2);bag.position.set(x,y,z);cabinRoot.add(bag);
  const strap=new THREE.Mesh(new THREE.BoxGeometry(.72,.05,.08),
   new THREE.MeshPhongMaterial({color:0x3a4148}));
  strap.position.set(x,y+.06,z);cabinRoot.add(strap);});
 const railMat=new THREE.MeshPhongMaterial({color:0x5f7f9c});
 [[-2.15,-.4],[2.15,-.4],[-2.1,.9],[2.1,.9]].forEach(([x,y])=>{
  const rail=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,3.6,8),railMat);
  rail.rotation.x=Math.PI/2;rail.position.set(x,y,0);cabinRoot.add(rail);});
 [[-1.7,.75,-1.35,0x7fe08f],[1.75,.45,-.55,0xff5544],[-1.6,.1,1.65,0x6fd8c8]].forEach(([x,y,z,c])=>{
  const m=new THREE.Mesh(new THREE.SphereGeometry(.035,6,6),new THREE.MeshBasicMaterial({color:c}));
  m.position.set(x,y,z);m.userData.base=c;m.userData.ph=Math.random()*7;
  cabinRoot.add(m);leds.push(m);});
 [[-1.88,.32,-1.15,0x1d4a3c],[1.88,.12,-.42,0x203a55]].forEach(([x,y,z,c])=>{
  const p=new THREE.Mesh(new THREE.PlaneGeometry(.4,.26),new THREE.MeshBasicMaterial({color:c}));
  p.position.set(x,y,z);p.lookAt(0,y,z);cabinRoot.add(p);});
 cabinRoot.add(new THREE.AmbientLight(0x8f96a2,.5));
 const key=new THREE.PointLight(0xffe3bd,.75,14);key.position.set(0,1.6,-.8);cabinRoot.add(key);
 const fill=new THREE.PointLight(0x8fb8ff,.5,16);fill.position.set(0,.2,3.1);cabinRoot.add(fill);
 /* window bodies: Earth (Coast) / Moon (arrival) — toggled per act */
 const cStars=new Float32Array(400*3);
 for(let i=0;i<400;i++){cStars[i*3]=(Math.random()-.5)*90;
  cStars[i*3+1]=(Math.random()-.5)*60;cStars[i*3+2]=25+Math.random()*70;}
 const csg=new THREE.BufferGeometry();
 csg.setAttribute('position',new THREE.BufferAttribute(cStars,3));
 cabinRoot.add(new THREE.Points(csg,new THREE.PointsMaterial({color:0xcfd9e8,size:1.6,
  sizeAttenuation:false,transparent:true,opacity:.8})));
 cabinEarth=new THREE.Mesh(new THREE.SphereGeometry(3.2,32,24),
  new THREE.MeshPhongMaterial({map:smallEarthTexture(),shininess:10,specular:0x668899}));
 cabinEarth.position.set(1.6,-.4,26);cabinRoot.add(cabinEarth);
 cabinClouds=new THREE.Mesh(new THREE.SphereGeometry(3.26,28,20),
  new THREE.MeshPhongMaterial({map:new THREE.CanvasTexture(cloudC),transparent:true,opacity:.5,depthWrite:false}));
 cabinClouds.position.copy(cabinEarth.position);cabinRoot.add(cabinClouds);
 moonMesh=new THREE.Mesh(new THREE.SphereGeometry(9,32,24),
  new THREE.MeshPhongMaterial({map:moonTexture(),shininess:2}));
 moonMesh.position.set(1.2,-1.5,20);moonMesh.visible=false;cabinRoot.add(moonMesh);
 const wLight=new THREE.DirectionalLight(0xfff1dd,1.25);
 wLight.position.set(-9,4,12);cabinRoot.add(wLight);
 /* dust motes */
 const mp=new Float32Array(40*3),mv=new Float32Array(40*3);
 for(let i=0;i<40;i++){
  mp[i*3]=(Math.random()-.5)*3.4;mp[i*3+1]=(Math.random()-.5)*2.6;mp[i*3+2]=(Math.random()-.5)*5.5;
  mv[i*3]=(Math.random()-.5)*.04;mv[i*3+1]=(Math.random()-.5)*.04;mv[i*3+2]=(Math.random()-.5)*.04;}
 const mg=new THREE.BufferGeometry();
 mg.setAttribute('position',new THREE.BufferAttribute(mp,3));
 motes=new THREE.Points(mg,new THREE.PointsMaterial({color:0xfff2dd,size:1.4,
  sizeAttenuation:false,transparent:true,opacity:.28}));
 motes.userData={mp,mv};cabinRoot.add(motes);
 /* crew */
 crew.cdr=makeCrew(0x9fc2e8,0xc68863,0x3a3128);crew.cdr.g.position.set(-1.05,-.35,.55);crew.cdr.g.rotation.y=1.05;
 crew.eng=makeCrew(0xff9d5c,0x8d5a3b,0x1a1614);crew.eng.g.position.set(1.05,-.42,.35);crew.eng.g.rotation.y=-1.1;
 crew.sci=makeCrew(0xffc06a,0xe8bd92,0x6e4526);crew.sci.g.position.set(-.15,.28,-.85);
 crew.sci.g.rotation.y=.15;crew.sci.g.rotation.z=.16;
 Object.values(crew).forEach(c=>cabinRoot.add(c.g));
 /* props */
 props.packet=new THREE.Mesh(new THREE.BoxGeometry(.12,.16,.02),
  new THREE.MeshPhongMaterial({color:0xe9e4d2}));
 const stripe=new THREE.Mesh(new THREE.BoxGeometry(.125,.05,.022),
  new THREE.MeshPhongMaterial({color:0x4a8f52}));
 stripe.position.y=.03;props.packet.add(stripe);
 props.packet.visible=false;cabinRoot.add(props.packet);
 props.harmonica=new THREE.Mesh(new THREE.BoxGeometry(.17,.045,.045),
  new THREE.MeshPhongMaterial({color:0xb9c0c9,shininess:60,specular:0xffffff}));
 props.harmonica.visible=false;cabinRoot.add(props.harmonica);
}

function buildLunar(){
 terraRoot=new THREE.Group();terraRoot.visible=false;scene.add(terraRoot);
 terraRoot.add(terrainPatch(-620,422,-280,140,7,0));
 terraRoot.add(terrainPatch(-1520,1520,-1520,1520,34,2.5));
 terraRoot.add(buildHorizon(1580,40,190,0x4b4f57)); /* far rim ridgeline */
 terraRoot.add(buildHorizon(1150,10,110,0x5d616a)); /* nearer ridge for parallax */
 const slab=new THREE.Mesh(new THREE.BoxGeometry(PAD_HALF*2,1.3,20),
  new THREE.MeshPhongMaterial({color:0x6d7178,flatShading:true}));
 slab.position.set(PAD_X,6.05,0);terraRoot.add(slab);
 for(const dx of[-PAD_HALF+2,0,PAD_HALF-2]){
  const b=new THREE.Mesh(new THREE.SphereGeometry(.55,8,8),
   new THREE.MeshBasicMaterial({color:0x7fe08f}));
  b.position.set(PAD_X+dx,PAD_TOP+.6,8.5);terraRoot.add(b);beacons.push(b);}
 const tStars=new Float32Array(900*3);
 for(let i=0;i<900;i++){tStars[i*3]=(Math.random()-.5)*3400;
  tStars[i*3+1]=240+Math.random()*1000;tStars[i*3+2]=-1750-Math.random()*750;}
 const tsg=new THREE.BufferGeometry();
 tsg.setAttribute('position',new THREE.BufferAttribute(tStars,3));
 const tsp=new THREE.Points(tsg,new THREE.PointsMaterial({color:0xcfd9e8,size:1.6,
  sizeAttenuation:false,transparent:true,opacity:.85}));
 terraRoot.add(tsp);
 const tsp2=tsp.clone();tsp2.rotation.y=Math.PI;terraRoot.add(tsp2); /* southern sky */
 earthBall=new THREE.Mesh(new THREE.SphereGeometry(34,20,16),
  new THREE.MeshPhongMaterial({map:earthBallTexture(),shininess:8}));
 earthBall.position.set(-870,300,-1870);terraRoot.add(earthBall); /* beyond the rim ring; lit by terraSun -> real phase */
 terraSun=new THREE.DirectionalLight(0xffe8cc,1.45);
 terraSun.position.set(420,110,140);terraRoot.add(terraSun);
 terraAmb=new THREE.AmbientLight(0x1c2530,1.15);terraRoot.add(terraAmb);
 sunDisc=new THREE.Mesh(new THREE.SphereGeometry(28,12,10),
  new THREE.MeshBasicMaterial({color:0xfff3da}));
 sunDisc.position.copy(terraSun.position).setLength(2400);terraRoot.add(sunDisc);
 lander=new THREE.Group();
 const lWhite=new THREE.MeshPhongMaterial({color:0xe8e9ec,flatShading:true,shininess:22});
 const lDark=new THREE.MeshPhongMaterial({color:0x2b3038,flatShading:true});
 const lGold=new THREE.MeshPhongMaterial({color:0xc8a24a,flatShading:true,shininess:35});
 const body=new THREE.Mesh(new THREE.BoxGeometry(4.4,3,4.4),lGold);
 body.position.y=4.4;lander.add(body);
 const cab=new THREE.Mesh(new THREE.BoxGeometry(3,2.2,3),lWhite);
 cab.position.y=6.9;lander.add(cab);
 const win=new THREE.Mesh(new THREE.BoxGeometry(1.5,.7,.2),lDark);
 win.position.set(.7,7.2,1.55);lander.add(win);
 landerBell=new THREE.Mesh(new THREE.ConeGeometry(1.1,1.8,12,1,true),lDark);
 landerBell.position.y=2.15;landerBell.rotation.x=Math.PI;lander.add(landerBell);
 for(let i=0;i<4;i++){
  const a=Math.PI/4+i*Math.PI/2;
  const leg=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,4.6,6),lDark);
  leg.position.set(Math.cos(a)*2.6,2.1,Math.sin(a)*2.6);
  leg.rotation.z=Math.cos(a)*.5;leg.rotation.x=-Math.sin(a)*.5;lander.add(leg);
  const foot=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.2,8),lDark);
  foot.position.set(Math.cos(a)*3.6,.1,Math.sin(a)*3.6);lander.add(foot);}
 terraRoot.add(lander);
 lExh=makePool(260,3.2,0xffc27a,true);terraRoot.add(lExh.pts);
 lDust=makePool(240,3.8,0xb9b4a6,false);terraRoot.add(lDust.pts);
 lBoom=makePool(110,5,0xff8a4a,true);terraRoot.add(lBoom.pts);
}
