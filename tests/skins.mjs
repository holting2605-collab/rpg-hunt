import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ctx=vm.createContext({window:{}});
for(const file of ['data.js','v3data.js','ui/art-catalog.js','ui/illustrations.js','ui/skins.js'])vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
const S=ctx.window.RPG_HUNT_SKINS,D=ctx.window.GAME_DATA;
for(const w of D.WEAPONS){
 const a=ctx.window.RPG_HUNT_ART;
 for(const style of S.available(w)){
  const probe={weaponSkins:{[w.name]:{selectedSkin:style.id,ownedSkins:S.available(w).map(s=>s.id)}}};
  const exact=a.item('weapons',w.name,style.id);
  if(!exact||a.catalog.reviewPending?.includes(exact)){
   assert.equal(S.art(probe,w),a.item('weapons',w.name,'standard_darkwood'),'Fallback must preserve exact weapon geometry');
   assert.equal(S.get(probe,w).selectedSkin,style.id,'Fallback must retain selected skin');
  }
 }
}
const state={money:4321,roster:[{name:'Legacy hunter'}]},original=JSON.stringify(state);
S.normalize(state);
assert.equal(state.money,4321);assert.equal(JSON.stringify(state.roster),'[{"name":"Legacy hunter"}]');
const w=D.WEAPONS.find(x=>x.name==='Ranger 73'),before=JSON.stringify(w);
assert.equal(S.get(state,w).selectedSkin,'standard_darkwood');
for(const id of ['bayou_wrap','elite_brass','bone_ritual','standard_darkwood']){S.cycle(state,w,1);assert.equal(S.get(state,w).selectedSkin,id);}
S.cycle(state,w,-1);assert.equal(S.get(state,w).selectedSkin,'bone_ritual');
const loaded=JSON.parse(JSON.stringify(state));S.normalize(loaded);assert.equal(S.get(loaded,w).selectedSkin,'bone_ritual');
assert.equal(JSON.stringify(w),before);assert.equal(loaded.money,4321);
loaded.weaponSkins[w.name]={ownedSkins:['standard_darkwood'],selectedSkin:'bone_ritual'};
S.normalize(loaded);assert.equal(S.get(loaded,w).selectedSkin,'standard_darkwood');S.cycle(loaded,w,1);assert.equal(S.get(loaded,w).selectedSkin,'standard_darkwood');
for(const bad of [null,[],42,'invalid',{ownedSkins:'oops',selectedSkin:'../../bad'}]){loaded.weaponSkins[w.name]=bad;S.normalize(loaded);assert.equal(S.get(loaded,w).selectedSkin,'standard_darkwood');}
for(const item of [...D.WEAPONS,...D.EXTRAS]){
 const test={};S.normalize(test);
 for(const skin of S.available(item)){
  if(S.group(item))test.weaponSkins[item.name].selectedSkin=skin.id;
  const art=S.art(test,item);
  if(art)assert.ok(fs.existsSync(new URL('../'+art,import.meta.url)),art);
 }
}
assert.equal(S.group(D.EXTRAS.find(x=>x.name==='Throwing Axes')),'axe');
assert.equal(S.group(D.EXTRAS.find(x=>x.name==='Knife')),'knife');
console.log('PASS: legacy saves, skin cycling/wrap, persistence, locked skins, invalid data, cosmetic-only changes and all skin paths');
