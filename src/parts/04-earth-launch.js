/* ================= three.js: shared utils + Chapter 1 worlds ================= */
const hasTHREE=typeof THREE!=='undefined';
let renderer,scene,camera,orbitRoot,siteRoot,planet,clouds,atmoU;
let rocket,booster,boosterGrp,upperGrp,tower,padLights=[],vapor,skyU,dirLight,hemi,tvCam;
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
   uint16 pairs, length-prefixed, 0 terminates. Longitudes are unwrapped
   (antimeridian-safe; polar rings closed via the pole) and quantized over an
   extended domain u=(lon+180)/360 in [-1,2] -> q=(u+1)/3*65535; y=(90-lat)/180.
   Rings are drawn at -W/0/+W offsets so wraps fill correctly. Matches the
   sphere UV mapping used by latLonToLocal, so pins land on real geography. */
const LAND_B64='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W4BunhuBXZ5HgUSeYYAyno9+Pp5tfVOe6HxXnq59e57PfSIAFZlSiNGYWoiemCmHUJgAhjaYJIUJmPuD6pfqgryX7YCHl71/dZeEfl+XaH0ol4J8CJdLe9uWf3qblu14lpY1eL2WQ3gbl4p4UZfteYCX5Hqhl3x72pcDfRiYCX1LmAJ+bpgzf5yY2n+EmAOBp5iBgb2YioHHmIiC3JhUgwmZdIMmmVqEF5kfhi0A8JtmfTSct37sm+J+2Jvaf9ubJIGgmx2Cn5uIg4ibtIV/mzOFOpvXhSKb+IT2muOE2JpvhJCa8oR6mkKEUppWhCCaLIQXmkOC+JnegduZp4DTmWh/2pkXfv6ZJX0qmqJ9WZpefWWaKnx/muV7yJqWe/SadnoSm495KpsHeV2bQHiMm0N3qpsmdsObJXbim9125Zt8dw2c4Xc/nE54O5zdeBKc73gdnKF58Zsdes6bZnv7m798GgD0nQh0+p36dP6dxnXpnRN3052gdbedWXbKnWV3uZ0QeHGdPHdgnTR2c52IdUyd23Q5nXJ1HZ1kdfCcMHbmnMV1/pySdCSdLHRFnaJzWp1HdIid5HOSnUFzvZ04c7qdHnLrncty8J2CcwkAQJMvdwuTgnfukmF245JWdP+SB3Ipk9FyRZPRc2KTTXVZk8h2BwCOcZ9xW3HHcVBxpnFicUFxYXGycIRxgnCQcY9wCwBjnWFxTZ3ZcTqdv3InnStzAp0vcg6dzXEdnWhxJJ2GcEWdcHA8nWVxaZ0GcAgAFpzAcsabGXTkmxpzD5w6cjScPnFUnNRvXpz9cDacxXEIAOScFm8InYZvLp2Gby2dHnARnblw65wmcemcfXDtnMNvDQC/nbNu0J1KcKGd6W+inWRwsZ1EcZSdlnGSnZZwgJ2CcHadpm+ancNvmZ05b3SdI26unStuBQDOnGltvpykbqSc7m2FnNlsuZzmbCAAwZyvZeecFmb5nLhl/5wUZvWcq2YKnbBn+pzfaNacV2nNnH1q2pyfa/qcx2sVnZxrYZ1mbFudLG1vnYNtaZ0rbjmdeG0jnblsE50/be2cZWy1nJpsl5xKbJqctGutnFdrm5wDa5Ochmt1nLVqbJwWamqcumiDnDJpiZz4Zp2crmUIAHNwE2ZkcG9mNnBsZhNweWYPcN1lGHCoZUlwqmVocMplCgDFbZZms23TZpFtmGZubRRm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eG6BRmpuhkc+bp5IOm5BSCxuLUgYbtNHJW6XSDNu2Eg1bmFJIm7vSf9tEkv6bQNLDW4LSu5tgEnmbVJI223vSOht1knCbaBJ6m0SSuxtbUv9bYZLBG4ETAxucE3mbX5Op23qTn9twE9hbddPQm1dUDlt11D3bMNR1WxwUrhsSVOvbEtUuWxIVc5sf1bpbIFX6WwfWAZtxVkEbbpaAW1IW/JsJlzgbFRcwmwoXLhsiVuhbDVbgWz8WWVs5VhcbFdYaGxlV1dsnFYobGxVEGw0VdNr2lXIa8dVq2sdVYVrw1RAa/FUCmvJVNxq4lTCahVVzmp7Vc1qD1baaldWzmqHVrhqUVahapZWdWqLVkhqylUTavhV52mjVcFpvVWOaRJWVmkgVxppvVf5aGtY62gPWepoClruaLla+Wg1W/loNlviaHRc12h7XdJoYl/NaBRg12jaYOpojGH2aKZiHmm1YyxphWREaThlhWmZZZ5pMWbTacxlAWqnZS9qZWVVaidle2qTZIpqvmOPaoximWoiYsJqwmEDa25hOGt7YV1rXGFsa6lhamtZYklrMWM7aw9kRmtOZD1r62QuawdmHmuqZRFrsGUSa+VlHWvnZRxrSmYSa+hmGGsgZxFromcVa8VnDmt9aAJr3Wj3aulo62pnaf9qqWkEa3NpFmuhaRxrr2kqa29pO2tqaUFriGlKa3ZpZmuXaYJrjWmWa2VpnWs8abBrT2m/a2hpz2tfadtrQGn2a3JpAGx6aRNsvmkkbBBqOmxIakpsq2pFbM9qQmwga0hspWs6bCJsNGy0bDJsVG01bLJtNmxWbi1sem4nbBZvK2x2bx9s028ibDVwK2xxcDtsNnFSbMlxb2xkcoRs53KDbDRzm2xFc6FsJ3OybIBzz2xnc+lsCnMObcFyI21UckRtaXJCbY1yZG2acn9t2XKTbUZzqm2rc8lttnP3bbhyEG6RchBuGXIbbuVwPm48cGRuNXBpbupvmW4IcMhuUG/gbv9u/W5PbhNvZW4jb8ZuF29AbxVvlm/ybsBvBm9lcAVvJHHqbvdxAW8YcxtvAXMpb/pxFm96cRNvZnBeb9JvVm8mb2tvtG6Bb7NvrG+5b9NvhHDVb/xwDHAAcU1w23BvcH1xnnCqccBwOXHBcN1wDHHHcFVxwnAhcS5xNnHacWZx9XGUcahynnHMc71xxHPVcRl0/XGfdCNyjHUkckh2O3JQdlxyAnd0coF3vHLKd8NyiHf0cm53NXPPd0pz+Hd3c054t3OBecFzFnrWcwV65XPPegd0S30ndId9KXSCfvtzr38OdByAeXRVgHt0woGpdNOA9nRWgVt1NIJ4dQqDbnXTg7V1Y4MrdiSEhXYWhN92Q4Utd9uGXHdEh493Uoeld8WHuneVicR3cYqsd8uMjXe4jTh3s48Rd0+R5HaLktV2kpLEdp6TyHZIlrd2eZixdmmZnnb4mZN235tVdrqdS3Yynxp20J8MdqugynWqoGp1NaFAddih/HRCorR0ZKOBdM2keHTdpYJ0pqZ3dBWoaXTHqD50kKn7cxGsxnMxrZ1z3K2BczavWXMGsD5z67D6crWxzXJssaxyk7F0cvewS3IDsSZyOrAicvewb3IvsmdyK7ONcsmzinJ7tE9yTbb1cRG3fHFdtzlxOLdGcRG4OXEiuURx2bkgcVm64nCMuqhwB7qQcGa6mXDQu8JwPrzjcMu79XCIvL1w+byMcNu9g3BKv3VwDcA8cA7ADHDIwPtv2cE2cOTCcHAtw1twdMQUcELF7G/sxrVvfMecbybIsG+hydhvc8q/b2HKiW9eymtvuMo1bzvLK2+PzBFvmMzNbiHMh24kyzxuU8opbm3JOm6YyBtupccTbjnFLW7bw21uwcIRblfCS24WwWBuuL6jbjm/w25GvJpu5ruHbqy9YW55vXRucbuJbs64pW7Vt5NucraObte0qG7MtM1ugLL3bjqwEW8brgNv+asVb82qDW8LqTFvT6c8b4+kT2+boWJvbJ5ebxmcUW8YmhRvRpkPb7GYl25ElyputpX7bdWU4m2ok+xtP5O5bWKRfW3CjkNt7YsrbUeLGG07iuhsTYm9bLqI0WwXiLRsvIbGbL2F92zXhBdtx4MKbSiD82zRg85sMoPbbMuC0GyAgeZsSoHxbGeACG18fwNt6H4lbZp+Tm0IfkZtmH1dbX19Wm3GfGhtQnyHbSp8oG1Fe7dthnqhbS96rG1ceZ9tD3isba93om17doptuXV1bVB1aG2MdHdtK3RobRJ0XW2acz5tNHMkbUtzGG3Kc/9sJnTybDJ07Gx+dAltRHX4bHJ18GyoddNsunXJbOF0wWwfda1sCnWhbHd0iGxfdHhsNHRebDV0XGyEdFVsTXQ0bPxzKGywcy9scHMtbCBzHGzJcgRsgXLva1Jy62vocdtrp3HfaxFy02tocsVrA3Kya99xqWuVcaprJ3Gya7RwoWuBcK5rOnCaa8hvfWs1b3Brum5Wa0huOGujbT5ra21Ia6FtTWuIbUNrFm0wa/ZsKWtMbQZrR23waiRt12rcbLZqxWykandshWo3bF9qMGxEauhrI2pSa95pymm/aVRpjmn1aGxpD2k7aZlpHGm8afFoXGnEaBdpi2hwaF5oPWgZaJRn5mfmZtdnhGa1Z29md2f8ZV5nVWUcZ4dk/mahY/Bm8GIEZ8xi/mZkYgxnBmIMZ4hh+GbkYPJmVGDeZpxfqGYyXmtmFV1OZjNcGmaeWw5mRVsYZmRa+WUPWtVlXlnGZWBYpWVDWIJlg1dlZdFWY2VgVkJlTVUtZTdULmWrUwJlGlPtZCpTy2TGUsFkWVPLZAhU0WQaVeZksFUTZatWHWUAVyZlGlcuZZdXOWWSV0VlfVhYZdpYZGVbWYplFFqfZWdbsWUGXMJlsVzFZXFd4mV9XftlIl4QZsVeD2YGX/ZljF/rZYpf22WtXrNl3V2HZS1daGXQXGplxlthZQFbRGWQWhpl7lkSZRxaA2W+Wd5kZVm6ZJJYvmR3WNdki1juZANY8GRfV8FkW1aeZPdVh2QTVXFkJFRVZAFTPGS6UTJkAFELZC5Q7mMDUOhjm0/GY4hPsGMmT3djAk9oY8dOYWMATiZjkUzzYphK9WJDSttiy0msYppIo2JxR4NiqkaQYn1FjmJERHtiLUOTYtZBoWJBP5ZiWT2DYiE8cmJ4O3liMjvRYq078WIFPQBjpDz2Yno74mJPOtliTzpkYuk4OWJMOMthtTepYXI2sWGTNWRh+DRZYdMzEGHKMg9hDzLtYIUxuGASMadg1C9YYK4uOGBWLf1fPi2dXzUtVl/MLNheUyueXg4rNF6MKuBdqippXQMqIV1oKd1ctSnqXLIqyFzKKoJcFitMXJArCVzeKwFcCCscXKIpXFwyKUxc1yj+W6Ep1VuUKn5blyuqW0gscVtNLS9b5S3zWlUu5Fr2LoVasi9yWl0wK1r4MAFa3TDIWUIxi1m+MVhZODLwWKAy51hjMilZuTFkWUgxpVmBMPBZWDAOWsIvYlrpLnBaoC6dWh8up1oLLcZaNCyAWqMsbVpkLExa6CwkWi8sFFqyLP1Z/SvAWY4sm1mOLJZZtSuhWTArelmuKitZ9Cr4WEkqzljyKc5YJCmfWIgot1i3J+hY7Cb+WDEmL1kWJllZUCaKWaEltVnAJeRZTyXYWakkt1loJONZ2yO+Wd8jflkuJGtZfyQ7WS4k5lhYJI1YACRzWG0jJ1iaInxYAiIDWVAhNVlQIS1ZBiKtWfghfFkWITFZiyAGWdUfy1g6H3hYxx6aWAgeBln9HVJZVh1hWaYcn1n4G9pZzhtNWi0bhVpGG+JahBo+W9Aaalt0G4VbLhvrW0Mb6FuXG0Vc1RuCXLEbAl0kHHddRhymXXUc9l06HFJepxyUXtscBl8yHWVf4R2kXwMe2l9rHSNg+Rx9YCYd2GCGHDxhKxxlYcIckmFtHKBhwhvKYegbMWIvHYFiOByKYkwd1GIRHetiphw1Y7sckWNUHR9k2h1zZBcermQAHgBluR6rZG0fGGW8H7xlkB/wZVEfMWYrIHJmcx81ZtgeXGZcHqZmSx7WZiceB2d+HkRnQx+IZyYf82fKH1FokB+qaJkfo2i3Htlodx43afMeNmlLIF1pKR+OaTMfqWnFHWhp5BwiaVEcJmm/Gm5pthm+afEZ/GmSGk5qLBwYat8cLADwZAEY0WSsGFhlPhitZfUY8WU7GClmsxhaZhgaeWaCGU5mDRiDZtgXwGYRGARnpRgqZwcaPWcIG6JnvRsQaGkcCWgJHaZnJh3NZ7IduGc4Hkpn/x3iZpwdm2ayHSlmLh51ZW4eJGWHHgNl2x2wZHgdemSgHS9kgBxYZFoctWQbHAtlLBxaZewb5WSXG2NktBsNZK0b7WMnG3pklRocZJoasmM6GuVjKRkPZJgYsmS7FwUAOmeUFwVnhRimZoYXu2ZTFwxnRBcKAOdtCBjtbW0YrG1iGGttWhgobYsYF211GNRstBfWbDEX9GwZF35tQBdIAHtr9Bera9cY42uxF3xsHBflbJUY3GyDGVRtGRmNbYgYFG5BGWdu7hlvbo0a4G47Gh9vIxuxb7Mb5m9FHCBwmh2wb0QeP3AyH6Bwgh/3cNAgVnHoIENx5yHZcI8jjnDzIi9wlSHgb8Ih2W+TIhlwZyNrcA4khHBvJKtw1yWWcN0mSnB6JrJvVyUHcJAmR3BsJ1Bw6yesb1onKm+HJuBu1iX1bm8lm26zJEJuAyREbm0klG2nJGFtKSSJbR0j+20XI3hu6CJjbmYieG6xIcduTiC2bq0f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';
let LAND_RINGS=null;
function landRings(){
 if(LAND_RINGS)return LAND_RINGS;
 const bin=atob(LAND_B64),u=new Uint16Array(bin.length/2);
 for(let i=0;i<u.length;i++)u[i]=bin.charCodeAt(2*i)|(bin.charCodeAt(2*i+1)<<8);
 const R=[];let p=0;
 while(p<u.length){
  const m=u[p++];if(!m)break;
  const r=new Float32Array(m*2);
  for(let i=0;i<m;i++){r[2*i]=u[p+2*i]/65535*3-1;r[2*i+1]=u[p+2*i+1]/65535;}
  p+=m*2;R.push(r);
 }
 return LAND_RINGS=R;
}
function landMask(W,H){
 const p=new Path2D();
 for(const r of landRings())for(const dx of[-W,0,W]){
  p.moveTo(r[0]*W+dx,r[1]*H);
  for(let i=1;i<r.length/2;i++)p.lineTo(r[2*i]*W+dx,r[2*i+1]*H);
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
 tvCam=new THREE.PerspectiveCamera(30,1.6,.1,4000); /* press-site broadcast camera */
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
  specular:0x2e3c48,shininess:42}); /* tight ocean glint, not a washed-out glare */
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
