import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('..',import.meta.url));
const protectedNames=['makeHunter','canAddPerk','hunterMods','weaponSlot','attackChance','calcDamage','startBossCombat','triggerNoise','aiWeaponScore','aiPickWeapon','aiTarget','aiHealingExtra','aiDecideAction','preferredDistanceForWeapon','aiManageDistance','aiUseExtra','sellValue'];
export function loadRules(source){
 const node={innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},options:[],add(){}};
 const context=vm.createContext({window:{},document:{querySelector:()=>node,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},console,setTimeout,clearTimeout,URLSearchParams,location:{search:''},confirm:()=>true});
 for(const file of ['data.js','v3data.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
 const prefix=source.includes('// v0.6 UI adapter:')?source.split('// v0.6 UI adapter:')[0]:source.split('// Events')[0];
 vm.runInContext(prefix+`\nrenderAll=()=>{};renderRun=()=>{};renderLog=()=>{};toast=()=>{};saveState=()=>{};\nwindow.rules={${protectedNames.join(',')},buyWeapon,equipStashWeapon,unequipWeapon,buyExtra,equipStashExtra,unequipExtra,get state(){return state},set state(s){state=s;navContext={hunterId:s.activeHunterId,armoryTarget:'all'}},setRandom(fn){Math.random=fn},captureBoss(){startCombat=(enemies)=>{window.captured=enemies}}};})();`,context);
 return context;
}
const ctx=loadRules(fs.readFileSync(path.join(root,'game.js'),'utf8')),r=ctx.window.rules,D=ctx.window.GAME_DATA;
const baseline=JSON.parse(fs.readFileSync(path.join(root,'tests/balance-baseline.json'),'utf8'));
for(const name of protectedNames)assert.equal(createHash('sha256').update(r[name].toString().replace(/\r\n/g,'\n')).digest('hex'),baseline[name],`${name}: v0.5 rule changed`);
console.log('PASS: 17 protected v0.5 balance and AI functions unchanged');
let s=r.state,h=s.roster[0];
for(const w of D.WEAPONS){assert.ok(w.damage>=5&&w.damage<=20);assert.ok(w.damageMax<=20);for(const d of ['near','mid','far'])assert.ok(r.attackChance(h,w,d)>=.35&&r.attackChance(h,w,d)<=.95);}
assert.equal(D.WEAPONS.length,150);assert.equal(D.BOSSES.length,6);
console.log('PASS: weapon datasets and 35–95% hit bounds');
const state=()=>JSON.parse(JSON.stringify(r.state));
const count=s=>s.stashWeapons.length+s.stashExtras.length+s.roster.reduce((n,h)=>n+Number(!!h.primary)+Number(!!h.sidearm)+h.extras.length,0);
r.state=state();s=r.state;h=s.roster[0];s.activeHunterId=h.id;r.state=s;
const cheapest=D.WEAPONS.slice().sort((a,b)=>a.price-b.price)[0],oldCount=count(s);r.buyWeapon(cheapest.name);assert.equal(count(s),oldCount+1);
const money=s.money;r.unequipWeapon(r.weaponSlot(cheapest));assert.equal(count(s),oldCount+1);r.equipStashWeapon(s.stashWeapons.length-1);assert.equal(count(s),oldCount+1);assert.equal(s.money,money);
const x=D.EXTRAS[0];r.buyExtra(0);const extraCount=count(s);r.unequipExtra(h.extras.length-1);r.equipStashExtra(s.stashExtras.length-1);assert.equal(count(s),extraCount);
s.money=0;const before=JSON.stringify(s);r.buyWeapon(cheapest.name);r.buyExtra(0);assert.equal(JSON.stringify(s),before);
console.log('PASS: inventory conservation, free re-equipping, insufficient funds');
h.perks=[];const light=D.PERKS.find(p=>p.weight===1);assert.ok(r.canAddPerk(h,light));h.perks=[light.id];assert.equal(r.canAddPerk(h,light),false);h.perks=Array(15).fill(light.id);assert.equal(r.canAddPerk(h,D.PERKS.find(p=>p.id!==light.id)),false);
const heavy=D.PERKS.filter(p=>p.rarity==='schwer');h.perks=heavy.slice(0,5).map(p=>p.id);assert.equal(r.canAddPerk(h,heavy[5]),false);
const mythic=D.PERKS.filter(p=>p.rarity==='mythic');h.perks=mythic.slice(0,2).map(p=>p.id);assert.equal(r.canAddPerk(h,mythic[2]),false);
h.perks=[];h.ai={intelligence:90,discipline:90,aggression:50,courage:80,profile:'Taktiker'};h.hp=5;h.maxHp=30;h.extras=[{...D.EXTRAS.find(x=>x.heal),currentUses:1}];s.run={directive:'balanced',attention:0,log:[],teamIds:[h.id]};r.setRandom(()=>.1);
assert.equal(r.aiDecideAction(h,cheapest,{distance:'mid'}).type,'heal');h.hp=30;h.stamina=0;assert.equal(r.aiDecideAction(h,cheapest,{distance:'mid'}).type,'recover');
h.stamina=5;h.primary=D.WEAPONS.find(w=>w.category==='Shotgun');h.sidearm=D.WEAPONS.find(w=>w.name==='Nagant M1895');const c={distance:'near',enemies:[{hp:20,attack:6},{hp:5,attack:1}]};assert.ok([h.primary,h.sidearm].includes(r.aiPickWeapon(h,c)));assert.equal(r.aiTarget(h,c),c.enemies[0]);
console.log('PASS: trait limits, autonomous healing, recovery, weapon and target selection');
r.captureBoss();for(const n of [1,2,3]){s.roster=Array.from({length:n},(_,i)=>({...h,id:'h'+i,hp:30}));s.run.teamIds=s.roster.map(h=>h.id);s.run.boss={...D.BOSSES[0]};r.startBossCombat();assert.equal(ctx.window.captured[0].hp,Math.round(D.BOSSES[0].hp*[1,1.45,1.8][n-1]));}
console.log('PASS: unchanged boss scaling for 1, 2 and 3 hunters');
