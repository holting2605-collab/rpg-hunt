import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ctx=vm.createContext({window:{}});
for(const f of ['v3data.js','ui/art-catalog.js','ui/illustrations.js'])vm.runInContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),ctx);
const A=ctx.window.RPG_HUNT_ART,V=ctx.window.RPG_HUNT_V3;
assert.equal(V.hunterPortraits.length,8,'Legacy generator requires eight portrait slots');
for(const p of V.hunterPortraits)assert.ok(fs.existsSync(new URL('../'+p,import.meta.url)),p);
for(const tier of ['Standard','Verbessert','Elite','Meister']){
 const hunters=['Ruth Calder','Caleb Finch','Dorian Vale','Jonas Pike'].map(name=>({id:'same-low-bits',name,tier}));
 const before=JSON.stringify(hunters),paths=hunters.map(h=>A.hunter(h));
 assert.equal(new Set(paths).size,4,'Distinct names must not collapse onto one face');
 for(let i=0;i<hunters.length;i++){
  assert.equal(A.hunter(JSON.parse(JSON.stringify(hunters[i]))),paths[i],'Stable after save round trip');
  assert.ok(A.catalog.hunters[tier].includes(paths[i]));
 }
 assert.equal(JSON.stringify(hunters),before,'Visual resolver must not mutate hunters');
}
console.log('PASS: all eight legacy portrait slots, four distinct identities per tier, stable save round trip, no hunter mutations');
