import {js,check,lcg} from './_load.mjs';
const {ok,done}=check('ch6-decide');
const seg=js.match(/\/\* @c6d-start \*\/([\s\S]*?)\/\* @c6d-end \*\//)[1];
const {ch6Decide}=new Function(seg+';return {ch6Decide};')();

// crew counsels wantWar; support s (0-5) -> s*20% chance the capital follows,
// else a fair coin. 4000 trials per configuration.
const N=4000;
function run(wantWar,support,seed){
 const rnd=lcg(seed);
 let infl=0,war=0;
 for(let i=0;i<N;i++){
  const r=ch6Decide(wantWar,support,rnd);
  if(typeof r.war!=='boolean'||typeof r.influenced!=='boolean')
   throw new Error('ch6Decide must return boolean war/influenced');
  if(r.influenced)infl++;
  if(r.war)war++;
 }
 return {infl:infl/N*100,war:war/N*100};
}

const s0=run(true,0,7);
ok(s0.infl===0,`support 0: influence 0% (got ${s0.infl.toFixed(1)}%)`);
ok(Math.abs(s0.war-50)<=4,`support 0: outcome is a fair coin, war 50%±4 (got ${s0.war.toFixed(1)}%)`);

const s5w=run(true,5,11);
ok(s5w.infl===100,`support 5: influence 100% (got ${s5w.infl.toFixed(1)}%)`);
ok(s5w.war===100,`support 5 + counsel war: war 100% (got ${s5w.war.toFixed(1)}%)`);
const s5p=run(false,5,13);
ok(s5p.war===0,`support 5 + counsel peace: war 0% (got ${s5p.war.toFixed(1)}%)`);

const s3=run(true,3,42);
ok(Math.abs(s3.infl-60)<=4,`support 3: influence 60%±4 (got ${s3.infl.toFixed(1)}%)`);

done();
