import {js,check,lcg} from './_load.mjs';
const {ok,done}=check('archive-fuzz');
const sites=js.match(/const SITES=\[[\s\S]*?\n\];/)[0];
const bgs=js.match(/const BACKGROUNDS=\[[\s\S]*?\n\];/)[0];
const mods=js.match(/const MODULES=\[[\s\S]*?\n\];/)[0];
const arch=js.match(/\/\* @arch-start \*\/([\s\S]*?)\/\* @arch-end \*\//)[1];
const env=new Function(sites+bgs+mods+arch+';return {SITES,BACKGROUNDS,MODULES,ARCH_CALL,rollHistory};')();
const legal=new Set(['broadcast','icePremiere','mediaDeal','esaPartner','jointAssay',
 'baiterek','baiterekEden','kzAudit','jpTelemetry','roverPartner','cnResupply','resupplyDiscount','cnAudited']);
const massOf=id=>env.MODULES.find(m=>m.id===id).mass;
const rnd=lcg(20260713);
let bad=0;const seen={c:new Set(),b:new Set(),p:new Set()};
for(let i=0;i<600;i++){
 const H=env.rollHistory(5,rnd);
 seen.c.add(H.site.country);seen.b.add(H.background);H.payloads.forEach(p=>seen.p.add(p));
 if(H.payloads[0]===H.payloads[1])bad++;
 if(massOf(H.payloads[0])+massOf(H.payloads[1])>12000)bad++;
 for(const k of Object.keys(H.callFlags||{}))if(!legal.has(k))bad++;
 if(!(H.stats.budget>=1500&&H.stats.budget<=2400))bad++;
 for(const s of ['morale','publicSupport'])if(H.stats[s]<2||H.stats[s]>4)bad++;
}
ok(bad===0,`600 forged histories, ${bad} constraint violations`);
ok(seen.c.size===5&&seen.b.size===3&&seen.p.size===4,
 `coverage: ${seen.c.size}/5 countries, ${seen.b.size}/3 backgrounds, ${seen.p.size}/4 payloads`);
done();
