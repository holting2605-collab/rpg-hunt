import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const base=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,base),'utf8');
const jobs=JSON.parse(read('tools/art-overhaul/jobs.json'));
const context=vm.createContext({window:{}});
for(const f of ['data.js','v3data.js','ui/art-catalog.js','ui/illustrations.js','ui/skins.js'])vm.runInContext(read(f),context);
const {GAME_DATA:D,RPG_HUNT_ART:A,RPG_HUNT_SKINS:S}=context.window;
const pending=[];
for(const j of jobs){
 if(!fs.existsSync(new URL(j.target,base))){pending.push(j.id);continue;}
 const png=fs.readFileSync(new URL(j.target,base));assert.equal(png.subarray(1,4).toString(),'PNG',j.id);assert.ok(png.readUInt32BE(16)>=512&&png.readUInt32BE(20)>=512,j.id);
 if(j.kind==='weapon'||j.kind==='extra')assert.equal(A.item(j.kind==='weapon'?'weapons':'extras',j.name,j.skin),j.target);
 if(j.kind==='trait')assert.equal(A.trait(D.PERKS[j.traitId]),j.target,j.id);
 if(j.kind==='monster')assert.equal(context.window.RPG_HUNT_V3.monsterArt[j.name],j.target,j.id);
 if(j.kind==='boss')assert.equal(context.window.RPG_HUNT_V3.bossArt[j.name],j.target,j.id);
 if(j.kind==='menu')assert.equal(A.menu(j.name),j.target,j.id);
 if(j.kind==='environment')assert.equal(context.window.RPG_HUNT_V3.environments.find(e=>e.id===j.id.replace('environment_','')).art,j.target,j.id);
}
assert.equal(A.traitName(D.PERKS[66]),'Adlerauge · Crack Shot');assert.equal(D.PERKS[66].mods.accuracy,6);
for(const w of D.WEAPONS){const variants=jobs.filter(j=>j.kind==='weapon'&&j.name===w.name);assert.equal(variants.length,S.available(w).length,w.name);if(/Silencer/.test(w.name))assert.ok(variants.every(j=>j.features.some(f=>f.includes('SUPPRESSOR'))),w.name);if(/Sniper/.test(w.name))assert.ok(variants.every(j=>j.features.some(f=>f.includes('telescopic'))),w.name);}
assert.equal(jobs.filter(j=>j.kind==='trait').length,D.PERKS.length);
assert.equal(new Set(jobs.filter(j=>j.kind==='extra').map(j=>j.name)).size,D.EXTRAS.length);
assert.equal(jobs.filter(j=>j.kind==='monster').length,D.MONSTERS.length);
assert.equal(jobs.filter(j=>j.kind==='boss').length,D.BOSSES.length);
if(pending.length&&!process.argv.includes('--allow-pending'))assert.fail(`${pending.length} artwork jobs incomplete`);
if(A.catalog.reviewPending?.length&&!process.argv.includes('--allow-pending'))assert.fail(`${A.catalog.reviewPending.length} visual corrections pending`);
console.log(`${pending.length||A.catalog.reviewPending?.length?'IN PROGRESS':'PASS'}: ${jobs.length-pending.length}/${jobs.length} images, catalog coverage, PNG dimensions, variant requirements and unchanged Adlerauge effect`);
