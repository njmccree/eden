import {html,js,check} from './_load.mjs';
const {ok,done}=check('parse-check');
try{new Function(js);ok(true,'script parses');}catch(e){ok(false,'script parses: '+e.message);}
const ids=[...new Set([...js.matchAll(/\$\('([A-Za-z0-9_]+)'\)/g)].map(m=>m[1]))];
const missing=ids.filter(id=>!new RegExp(`id="${id}"`).test(html));
ok(missing.length===0,`dom ids: ${ids.length} referenced${missing.length?' — MISSING: '+missing.join(','):', all present'}`);
for(const m of ['@c4-start','@c4-end','@c4rt-start','@c4rt-end','@c5-start','@c5-end','@c6-start','@c6-end','@arch-start','@arch-end'])
 ok(js.includes(m),'pure-block marker '+m+' (tests extract via these — keep them)');
ok(/EDEN_BUILD='\d+\.\d+\.\d+'/.test(js),'EDEN_BUILD constant present');
ok(js.includes("'SURVEY BUILD '+EDEN_BUILD"),'version tag wired to menu');
ok(!/exhaustBurst|allocRows|advanceBtn|hoursLeft/.test(js),'no dead-era symbols (spreadsheet ch4 / old exhaust)');
ok(!/localStorage|sessionStorage/.test(js),'no browser storage APIs (breaks in claude.ai artifacts)');
ok(!/THREE\.CapsuleGeometry|OrbitControls/.test(js),'no post-r128 three.js APIs');
done();
