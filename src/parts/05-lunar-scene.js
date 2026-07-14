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
 const W=128,H=64,c=document.createElement('canvas');c.width=W;c.height=H;
 const g=c.getContext('2d'),img=g.createImageData(W,H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const th=(x/W)*Math.PI*2,v=y/H;
  const e=fbm(Math.cos(th)*2*.9+9,Math.sin(th)*2*.9+4,v*4*.9+2,4);
  const land=e>.55,lat=Math.abs(v*2-1);
  let r,gg,b;
  if(lat>.86){r=235;gg=242;b=247;}
  else if(land){r=88;gg=126;b=84;}
  else{r=36;gg=104;b=150;}
  const o=(y*W+x)*4;img.data[o]=r;img.data[o+1]=gg;img.data[o+2]=b;img.data[o+3]=255;}
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

function makeCrew(accent){
 const g=new THREE.Group();
 const suit=new THREE.MeshPhongMaterial({color:0xe4e6ea,flatShading:true,shininess:12});
 const torso=new THREE.Mesh(new THREE.CylinderGeometry(.26,.3,.72,10),suit);
 torso.position.y=.36;g.add(torso);
 const patch=new THREE.Mesh(new THREE.BoxGeometry(.12,.09,.03),
  new THREE.MeshBasicMaterial({color:accent}));
 patch.position.set(.1,.52,.26);g.add(patch);
 const collar=new THREE.Mesh(new THREE.TorusGeometry(.17,.045,8,14),
  new THREE.MeshPhongMaterial({color:0x9aa0a8}));
 collar.rotation.x=Math.PI/2;collar.position.y=.76;g.add(collar);
 const headPivot=new THREE.Group();headPivot.position.y=.98;g.add(headPivot);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.2,12,10),
  new THREE.MeshPhongMaterial({color:0xd9c4ac,shininess:6}));
 headPivot.add(head);
 const eyeMat=new THREE.MeshBasicMaterial({color:0x22262d});
 const eyeL=new THREE.Mesh(new THREE.SphereGeometry(.026,6,6),eyeMat);
 eyeL.position.set(-.07,.03,.18);headPivot.add(eyeL);
 const eyeR=eyeL.clone();eyeR.position.x=.07;headPivot.add(eyeR);
 const jaw=new THREE.Mesh(new THREE.BoxGeometry(.11,.05,.08),
  new THREE.MeshPhongMaterial({color:0xcbb49b}));
 jaw.position.set(0,-.12,.13);headPivot.add(jaw);
 const armL=new THREE.Mesh(new THREE.CylinderGeometry(.06,.055,.55,8),suit);
 armL.position.set(-.3,.42,.1);armL.rotation.z=.5;armL.rotation.x=-.4;g.add(armL);
 const armR=new THREE.Group();armR.position.set(.3,.6,.05);g.add(armR);
 const armRm=new THREE.Mesh(new THREE.CylinderGeometry(.06,.055,.55,8),suit);
 armRm.position.y=-.26;armR.add(armRm);
 const hand=new THREE.Group();hand.position.set(0,-.55,0);armR.add(hand);
 armR.rotation.z=-.55;armR.rotation.x=-.35;
 [[-.12],[.12]].forEach(([x])=>{
  const leg=new THREE.Mesh(new THREE.CylinderGeometry(.075,.07,.6,8),suit);
  leg.position.set(x,-.18,.16);leg.rotation.x=-.9;g.add(leg);});
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
 crew.cdr=makeCrew(0x9fc2e8);crew.cdr.g.position.set(-1.05,-.35,.55);crew.cdr.g.rotation.y=1.05;
 crew.eng=makeCrew(0xff9d5c);crew.eng.g.position.set(1.05,-.42,.35);crew.eng.g.rotation.y=-1.1;
 crew.sci=makeCrew(0xffc06a);crew.sci.g.position.set(-.15,.28,-.85);
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
 const shape=new THREE.Shape();
 shape.moveTo(-420,-140);
 for(let x=-420;x<=320;x+=5)shape.lineTo(x,terrainH(x));
 shape.lineTo(320,-140);shape.lineTo(-420,-140);
 const terra=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:70,bevelEnabled:false}),
  new THREE.MeshPhongMaterial({color:0x9a9da2,flatShading:true,shininess:3}));
 terra.position.z=-62;terraRoot.add(terra);
 const back=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:30,bevelEnabled:false}),
  new THREE.MeshPhongMaterial({color:0x494d54,flatShading:true}));
 back.scale.set(1.5,1.7,1);back.position.set(60,-24,-190);terraRoot.add(back);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(190,60),
  new THREE.MeshBasicMaterial({color:0x000208,transparent:true,opacity:.62,depthWrite:false}));
 shadow.position.set(-165,-14,4.5);terraRoot.add(shadow);
 const slab=new THREE.Mesh(new THREE.BoxGeometry(PAD_HALF*2,1.3,20),
  new THREE.MeshPhongMaterial({color:0x6d7178,flatShading:true}));
 slab.position.set(PAD_X,6.05,0);terraRoot.add(slab);
 for(const dx of[-PAD_HALF+2,0,PAD_HALF-2]){
  const b=new THREE.Mesh(new THREE.SphereGeometry(.55,8,8),
   new THREE.MeshBasicMaterial({color:0x7fe08f}));
  b.position.set(PAD_X+dx,PAD_TOP+.6,8.5);terraRoot.add(b);beacons.push(b);}
 const tStars=new Float32Array(900*3);
 for(let i=0;i<900;i++){tStars[i*3]=(Math.random()-.5)*1600;
  tStars[i*3+1]=Math.random()*700-40;tStars[i*3+2]=-250-Math.random()*500;}
 const tsg=new THREE.BufferGeometry();
 tsg.setAttribute('position',new THREE.BufferAttribute(tStars,3));
 terraRoot.add(new THREE.Points(tsg,new THREE.PointsMaterial({color:0xcfd9e8,size:1.6,
  sizeAttenuation:false,transparent:true,opacity:.85})));
 earthBall=new THREE.Mesh(new THREE.SphereGeometry(11,20,16),
  new THREE.MeshPhongMaterial({map:earthBallTexture(),shininess:8}));
 earthBall.position.set(-260,300,-560);terraRoot.add(earthBall); /* lit by terraSun -> real phase */
 terraSun=new THREE.DirectionalLight(0xffe8cc,1.45);
 terraSun.position.set(420,70,140);terraRoot.add(terraSun);
 terraAmb=new THREE.AmbientLight(0x1c2530,.9);terraRoot.add(terraAmb);
 sunDisc=new THREE.Mesh(new THREE.SphereGeometry(9,12,10),
  new THREE.MeshBasicMaterial({color:0xfff3da}));
 sunDisc.position.copy(terraSun.position).setLength(760);terraRoot.add(sunDisc);
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
