import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname,join} from 'path';
const here=dirname(fileURLToPath(import.meta.url));
export const html=readFileSync(join(here,'..','dist','eden.html'),'utf8');
export const js=html.match(/<script>([\s\S]*)<\/script>/)[1];
export function lcg(seed){let s=seed;return()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};}
export function check(name){let fail=0;
 const ok=(c,msg)=>{console.log((c?'ok   ':'FAIL ')+msg);if(!c)fail++;};
 const done=()=>{console.log(fail?`-- ${name}: ${fail} FAILURE(S)`:`-- ${name}: all passed`);process.exit(fail?1:0);};
 return {ok,done};}
