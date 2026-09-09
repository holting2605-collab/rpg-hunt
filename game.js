(() => {
'use strict';
const D = window.GAME_DATA;
const V = window.RPG_HUNT_V3;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const chance=p=>Math.random()<p;
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const moneyFmt=n=>Math.round(n).toLocaleString('de-DE');
const tierOrder=['Standard','Verbessert','Elite','Meister'];
const perkRarityProb={leicht:.40,mittel:.30,schwer:.20,mythic:.10};
const weaponArt=w=>{ if(!w) return V.weaponArt.rifle; const n=(w.name||'').toLowerCase(); if(/bow/.test(n)&&!/crossbow/.test(n))return V.weaponArt.bow; if(/crossbow|chu ko/.test(n))return V.weaponArt.crossbow; if(w.category==='Shotgun'||/romero|rival|slate|specter|terminus|burgess|auto-5|homestead/.test(n))return V.weaponArt.shotgun; if(/sniper|marksman|deadeye|aperture|pointman|sharpeye/.test(n))return V.weaponArt.sniper; if(weaponSlot(w)==='sidearm')return V.weaponArt.pistol; if(w.category==='Melee')return V.weaponArt.melee; if(/bomb lance|launcher|nitro|shredder|flame/.test(n))return V.weaponArt.special; return V.weaponArt.rifle; };


/* --- v0.5 Hunter intelligence layer --- */
const AI_DIRECTIVES={
  cautious:{name:'Vorsichtig',icon:'🛡',accuracy:.05,damage:-1,aggression:-18,retreat:18,stamina:1},
  balanced:{name:'Ausgewogen',icon:'⚖',accuracy:0,damage:0,aggression:0,retreat:0,stamina:0},
  aggressive:{name:'Aggressiv',icon:'🔥',accuracy:-.04,damage:1,aggression:22,retreat:-20,stamina:-1}
};
function strHash(v){let h=2166136261;for(const ch of String(v||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return Math.abs(h>>>0);}
function ensureHunterAI(h){
  if(!h)return h;
  if(h.ai&&Number.isFinite(h.ai.intelligence))return h;
  const z=strHash((h.id||'')+(h.name||''));
  const tierB={Standard:-4,Verbessert:2,Elite:7,Meister:10}[h.tier]||0;
  const jitter=n=>((z>>n)%17)-8;
  const intelligence=clamp(Math.round((h.accuracy||60)*.58+(h.luck||3)*2.4+tierB+jitter(1)),35,96);
  const aggression=clamp(Math.round(38+(h.strength||5)*4+(h.speed||5)*2+jitter(5)+(h.role==='Bruiser'?16:h.role==='Gunslinger'?8:h.role==='Marksman'?-6:0)),15,95);
  const discipline=clamp(Math.round((h.accuracy||60)*.62+(h.maxStamina||5)*3+jitter(9)),30,96);
  const courage=clamp(Math.round(36+(h.maxHp||25)*.8+(h.luck||3)*3+jitter(13)),25,95);
  let profile='Pragmatiker';
  if(intelligence<50)profile=aggression>60?'Hitzkopf':'Unsicher';
  else if(intelligence>82&&discipline>72)profile='Taktiker';
  else if(aggression>76)profile='Jäger';
  else if(courage<48)profile='Vorsichtiger';
  else if((h.luck||0)>=8)profile='Glücksritter';
  h.ai={intelligence,aggression,discipline,courage,profile};
  return h;
}
function aiGrade(v){return v>=88?'S':v>=78?'A':v>=67?'B':v>=55?'C':v>=45?'D':'E';}
function aiSummary(h){ensureHunterAI(h);return `${h.ai.profile} · KI ${aiGrade(h.ai.intelligence)} (${h.ai.intelligence})`;}

let state = normaliseState(loadState() || newState());
let market=[];
let weaponPage=1;
let armoryMode='weapons';
let codexMode='monsters';
let modalLock=false;
let currentView='hq';
let navStack=[];
let navContext={hunterId:null,armoryTarget:'all'};

function newState(){
  const a=makeHunter('Standard',true); a.name='Mara Voss'; a.price=950; a.emergency=false;
  const b=makeHunter('Standard',true); b.name='Elias Crow'; b.price=1050; b.emergency=false; b.role='Gunslinger'; b.portrait=V.hunterPortraits[1];
  return { money:5000, roster:[a,b], selectedTeam:[a.id], activeHunterId:a.id, lastRun:null, run:null, marketSeed:0, stashWeapons:[], stashExtras:[], stats:{runs:0,extracts:0,bosses:0,kills:0,losses:0}, settings:{autosave:true,sound:true,motion:true} };
}
function normaliseState(s){
  s.stashWeapons=Array.isArray(s.stashWeapons)?s.stashWeapons:[];
  s.stashExtras=Array.isArray(s.stashExtras)?s.stashExtras:[];
  s.roster=Array.isArray(s.roster)?s.roster:[];
  s.selectedTeam=Array.isArray(s.selectedTeam)?s.selectedTeam:[];
  s.stats=s.stats||{runs:0,extracts:0,bosses:0,kills:0,losses:0};
  s.settings={autosave:true,sound:true,motion:true,...(s.settings||{})};
  s.roster.forEach((h,i)=>{ h.upgradePoints=h.upgradePoints||0; h.role=h.role||V.hunterRoles[i%V.hunterRoles.length]; h.bio=h.bio||V.bios[i%V.bios.length]; h.missions=h.missions||0; h.kills=h.kills||0; h.bosses=h.bosses||0; if(!h.portrait||!/assets\/v3\//.test(h.portrait))h.portrait=V.hunterPortraits[i%V.hunterPortraits.length]; ensureHunterAI(h); });
  return s;
}
function saveState(silent=false){
  try { localStorage.setItem('rpgHuntSaveV3', JSON.stringify(state)); } catch {}
  if(!silent) toast('Spiel gespeichert.');
}
function loadState(){
  try { return JSON.parse(localStorage.getItem('rpgHuntSaveV3')||'null'); } catch { return null; }
}
function resetGame(){
  if(!confirm('Wirklich neu starten? Der lokale Spielstand wird gelöscht.')) return;
  localStorage.removeItem('rpgHuntSaveV3');
  state=newState(); market=[]; ensureEmergencyRecruit(); rerollMarket(false); renderAll(); navStack=[]; navigate('hq',{},false);
}
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._tm); t._tm=setTimeout(()=>t.classList.remove('show'),2200); }
function openModal(html){ $('#modalBody').innerHTML=html; $('#modal').classList.remove('hidden'); }
function closeModal(){ if(modalLock) return; $('#modal').classList.add('hidden'); $('#modalBody').innerHTML=''; }
function log(msg,cls=''){ if(!state.run) return; state.run.log.unshift({msg,cls}); state.run.log=state.run.log.slice(0,60); renderLog(); }
const VIEW_META={
  hq:['HAUPTQUARTIER','Vorbereitung'], hunters:['HUNTER','Hunterverwaltung'], recruit:['MARKT','Rekrutierung'], roster:['ROSTER','Hunter-Auswahl'], hunterDetail:['HUNTER','Hunter-Details'], gear:['LOADOUT','Ausrüstung'], loadout:['LOADOUT','Hunter ausrüsten'], armory:['ARSENAL','Waffen & Extras'], traits:['TRAITS','Perks lernen'], mission:['MISSION','Run vorbereiten'], codex:['KODEX','Bestiarium & Arsenal'], settings:['SYSTEM','Einstellungen']
};
function navigate(view,ctx={},push=true){
  const target=$(`#screen-${view}`); if(!target) return;
  if(push && currentView!==view) navStack.push({view:currentView,ctx:{...navContext}});
  currentView=view; navContext={...navContext,...ctx};
  $$('.screen').forEach(x=>x.classList.remove('active')); target.classList.add('active');
  const m=VIEW_META[view]||['RPG HUNT',view]; $('#pageEyebrow').textContent=m[0]; $('#pageTitle').textContent=m[1];
  $('#backBtn').classList.toggle('hidden',view==='hq'||!!state.run);
  if(view==='hunters') renderHunters();
  if(view==='recruit') renderRecruitment();
  if(view==='roster') renderRoster();
  if(view==='hunterDetail') renderHunterDetail();
  if(view==='gear') renderGearHub();
  if(view==='loadout') renderLoadout();
  if(view==='armory') renderArmory();
  if(view==='mission') renderMission();
  if(view==='codex') renderCodex();
  if(view==='traits') renderTraits();
  if(view==='settings') renderSettings();
  if(view==='hq') renderHQ();
  window.scrollTo({top:0,behavior:'smooth'});
}
function goBack(){
  if(state.run) return;
  const prev=navStack.pop();
  if(prev){ navContext=prev.ctx||{}; navigate(prev.view,{},false); } else navigate('hq',{},false);
}
function switchTab(tab){ navigate(tab,{},true); }

function randStat(range){ return rnd(range[0],range[1]); }
function weightedPerk(maxRarity='mythic'){
  const allowed={leicht:0,mittel:1,schwer:2,mythic:3}; const max=allowed[maxRarity];
  const roll=Math.random(); let r=roll<.45?'leicht':roll<.75?'mittel':roll<.94?'schwer':'mythic';
  if(allowed[r]>max) r=maxRarity;
  return pick(D.PERKS.filter(p=>p.rarity===r));
}
function canAddPerk(h,p){
  if(h.perks.some(id=>D.PERKS[id]?.name===p.name)) return false;
  if(h.perks.length>=15) return false;
  const ps=h.perks.map(id=>D.PERKS[id]).filter(Boolean);
  const weight=ps.reduce((s,x)=>s+x.weight,0)+p.weight;
  if(weight>24) return false;
  if(p.rarity==='schwer' && ps.filter(x=>x.rarity==='schwer').length>=5) return false;
  if(p.rarity==='mythic' && ps.filter(x=>x.rarity==='mythic').length>=2) return false;
  return true;
}
function makeHunter(tier, free=false){
  const t=D.HUNTER_TIERS[tier]; const hp=randStat(t.hp); const role=pick(V.hunterRoles); const tierIdx=tierOrder.indexOf(tier); const portraitPool={0:[0,1],1:[2,3],2:[4,5],3:[6,7]}[tierIdx]||[0,1];
  const h={ id:uid(), name:pick(D.HUNTER_NAMES), tier, role, bio:pick(V.bios), price:free?0:rnd(t.price[0],t.price[1]), level:1,xp:0,upgradePoints:tierIdx,
    hp,maxHp:hp,accuracy:randStat(t.accuracy),strength:randStat(t.strength),speed:randStat(t.speed),stamina:randStat(t.stamina),maxStamina:randStat(t.stamina),luck:randStat(t.luck),
    perks:[], primary:null, sidearm:null, extras:[], status:{}, selected:false, portrait:V.hunterPortraits[pick(portraitPool)], emergency:free,missions:0,kills:0,bosses:0 };
  h.maxStamina=h.stamina; ensureHunterAI(h);
  const pc=rnd(t.startPerks[0],t.startPerks[1]); for(let i=0;i<pc;i++){ const p=weightedPerk(tier==='Meister'?'schwer':tier==='Elite'?'schwer':'mittel'); if(p&&canAddPerk(h,p)) h.perks.push(p.id); }
  const starterPrimary = role==='Marksman' ? (D.WEAPONS.find(w=>w.name==='Springfield 1866 Marksman')||D.WEAPONS.find(w=>w.name==='Frontier 73C')) : role==='Bruiser' ? (D.WEAPONS.find(w=>w.name==='Romero 77')||D.WEAPONS[0]) : (D.WEAPONS.find(w=>w.name==='Frontier 73C')||D.WEAPONS[0]);
  const starterSide = D.WEAPONS.find(w=>w.name==='Nagant M1895') || D.WEAPONS.find(w=>weaponSlot(w)==='sidearm');
  if(free){ h.primary={...starterPrimary}; h.sidearm={...starterSide}; const kit=D.EXTRAS.find(x=>x.name==='First Aid Kit'); if(kit)h.extras=[{...kit,currentUses:kit.uses}]; }
  return h;
}
function rerollMarket(pay=true){
  if(pay){ if(state.money<100) return toast('Nicht genug Geld.'); state.money-=100; }
  const tiers=['Standard','Verbessert',chance(.28)?'Elite':'Standard',chance(.08)?'Meister':'Verbessert'];
  market=tiers.map(t=>makeHunter(t)); state.marketSeed=(state.marketSeed||0)+1; renderAll(); maybeSave();
}
function ensureEmergencyRecruit(){
  if(state.roster.length===0 && state.money<500){ const h=makeHunter('Standard',true); h.name='Notfall-Rookie '+pick(['Cole','Mae','Jon','Ruth']); h.accuracy=55; h.strength=3; h.speed=3; h.stamina=h.maxStamina=4; h.luck=1; h.maxHp=h.hp=24; state.roster.push(h); state.activeHunterId=h.id; toast('Notfall-Rookie wurde kostenlos gestellt.'); }
}
function recruit(id){
  const h=market.find(x=>x.id===id); if(!h) return;
  if(state.money<h.price) return toast('Nicht genug Geld.');
  state.money-=h.price; state.roster.push(h); state.activeHunterId=h.id; navContext.hunterId=h.id; market=market.filter(x=>x.id!==id); renderAll(); saveState(true); toast(`${h.name} wurde rekrutiert.`); navigate('hunterDetail',{hunterId:h.id},true);
}
function sellOrDismiss(id){
  const h=state.roster.find(x=>x.id===id); if(!h) return;
  if(state.run) return toast('Während einer Mission nicht möglich.');
  if(!confirm(`${h.name} aus dem Roster entfernen?`)) return;
  state.roster=state.roster.filter(x=>x.id!==id); state.selectedTeam=state.selectedTeam.filter(x=>x!==id); if(state.activeHunterId===id) state.activeHunterId=state.roster[0]?.id||null; renderAll();
}
function toggleTeam(id){
  if(state.run) return toast('Run läuft bereits.');
  if(state.selectedTeam.includes(id)) state.selectedTeam=state.selectedTeam.filter(x=>x!==id);
  else { if(state.selectedTeam.length>=3) return toast('Maximal 3 Hunter.'); state.selectedTeam.push(id); }
  renderAll(); saveState(true);
}
function activateHunter(id){ state.activeHunterId=id; renderAll(); }
function hunterMods(h){
  const mods={accuracy:0,strength:0,speed:0,stamina:0,heal:0,melee:0,stealth:0,monsterStealth:0,animalStealth:0,reward:0,hunterLoot:0,farAccuracy:0,fireResist:0,poisonResist:0,meleeResist:0,explosiveResist:0,onMonsterHeal:0,preMonsterDamage:0};
  h.perks.map(id=>D.PERKS[id]).filter(Boolean).forEach(p=>Object.entries(p.mods||{}).forEach(([k,v])=>{ if(typeof v==='number') mods[k]=(mods[k]||0)+v; }));
  mods.accuracy=clamp(mods.accuracy,-8,8); mods.heal=clamp(mods.heal,0,.30); mods.melee=clamp(mods.melee,0,.20); mods.fireResist=clamp(mods.fireResist,0,.5); mods.poisonResist=clamp(mods.poisonResist,0,.5); mods.meleeResist=clamp(mods.meleeResist,0,.25); mods.explosiveResist=clamp(mods.explosiveResist,0,.25);
  return mods;
}
function hunterValue(h){ const gear=(h.primary?.price||0)+(h.sidearm?.price||0)+h.extras.reduce((s,x)=>s+(x.price||0),0); const perkValue=h.perks.length*180; return h.price+gear+perkValue; }
function weaponSlot(w){
  if(!w) return 'primary';
  return (/Pistol|Officer|Bornheim|Nagant|Conversion|New Army|Pax|Scottfield|Uppercut|Dolch|Hand Crossbow|Sparks Pistol|Derringer/i.test(w.name) || w.category==='Melee') ? 'sidearm' : 'primary';
}
function activeHunter(){
  const id=navContext.hunterId||state.activeHunterId;
  return state.roster.find(h=>h.id===id)||null;
}
function hunterCard(h, marketMode=false){
  const perks=h.perks.map(id=>D.PERKS[id]?.name).filter(Boolean);
  const sel=state.selectedTeam.includes(h.id); const active=state.activeHunterId===h.id;
  return `<article class="hunter-card ${sel||active?'selected':''}" data-hunter="${h.id}">
    <button class="hunter-art hunter-art-button" data-openhunter="${h.id}" style="background-image:url('${h.portrait}')" aria-label="${h.name} öffnen"><span class="tier-badge tier-${h.tier}">${h.tier}</span><span class="portrait-open">Details öffnen</span></button>
    <div class="hunter-body"><h3>${h.name}</h3><div class="hunter-sub"><span>Level ${h.level}</span><span>${marketMode?moneyFmt(h.price)+' $':'Wert '+moneyFmt(hunterValue(h))+' $'}</span></div>
    <div class="stat-grid"><div class="stat"><span>❤️ Leben</span><b>${h.maxHp}</b></div><div class="stat"><span>🎯 Präz.</span><b>${h.accuracy}</b></div><div class="stat"><span>💪 Stärke</span><b>${h.strength}</b></div><div class="stat"><span>⚡ Tempo</span><b>${h.speed}</b></div><div class="stat"><span>🫁 Ausdauer</span><b>${h.maxStamina}</b></div><div class="stat"><span>🍀 Glück</span><b>${h.luck}</b></div></div>
    <div class="ai-line"><span>🧠 ${h.ai.profile}</span><b>KI ${aiGrade(h.ai.intelligence)}</b><small>Int ${h.ai.intelligence} · Dis ${h.ai.discipline} · Mut ${h.ai.courage}</small></div>
    <div class="perk-line">${perks.length?`Perks ${perks.length}/15: ${perks.slice(0,3).join(', ')}${perks.length>3?' …':''}`:'Noch keine Perks'}</div>
    ${marketMode?'':`<div class="loadout-line">🔫 ${h.primary?.name||'keine Primärwaffe'}<br>🔸 ${h.sidearm?.name||'keine Seitenwaffe'}<br>🎒 ${h.extras.length}/8 Extras</div>`}
    <div class="hunter-actions">${marketMode?`<button class="primary" data-recruit="${h.id}">Für ${moneyFmt(h.price)} $ rekrutieren</button>`:`<button class="${sel?'primary':'secondary'}" data-team="${h.id}">${sel?'✓ Im Team':'Zum Team'}</button><button class="secondary" data-openhunter="${h.id}">Details</button>`}</div></div></article>`;
}

function renderAll(){
  renderTop(); renderHQ(); renderHunters(); renderRecruitment(); renderRoster(); renderGearHub(); renderHunterDetail(); renderLoadout(); renderArmory(); renderMission(); if($('#screen-codex')?.classList.contains('active')) renderCodex();
}
function renderTop(){ $('#money').textContent=moneyFmt(state.money); $('#rosterCount').textContent=state.roster.length; $('#teamCount').textContent=state.selectedTeam.length; }
function renderHQ(){
  const team=state.selectedTeam.map(id=>state.roster.find(h=>h.id===id)).filter(Boolean);
  $('#hqTeam').innerHTML=team.length?team.map(h=>`<button class="mini-hunter mini-hunter-button" data-openhunter="${h.id}"><img src="${h.portrait}"><div><b>${h.name}</b><small>${h.tier} · L${h.level} · ${h.maxHp} HP</small></div></button>`).join(''):'<p style="color:var(--muted)">Noch kein Team ausgewählt.</p>';
  $('#economySummary').innerHTML=`<div><span>Kontostand</span><b>${moneyFmt(state.money)} $</b></div><div><span>Roster-Wert</span><b>${moneyFmt(state.roster.reduce((s,h)=>s+hunterValue(h),0))} $</b></div><div><span>Lager-Waffen</span><b>${state.stashWeapons.length}</b></div><div><span>Lager-Extras</span><b>${state.stashExtras.length}</b></div><div><span>Perks im Pool</span><b>${D.PERKS.length}</b></div>`;
  const l=state.lastRun; $('#lastRun').innerHTML=l?`<div><span>Ergebnis</span><b>${l.success?'Extrahiert':'Verloren'}</b></div><div><span>Runden</span><b>${l.rounds}</b></div><div><span>Gewinn</span><b>${moneyFmt(l.loot)} $</b></div><div><span>Boss</span><b>${l.boss||'–'}</b></div>`:'<p style="color:var(--muted)">Noch keine Mission abgeschlossen.</p>';
}
function renderHunters(){ /* Hub is static; counts are rendered globally. */ }
function renderRecruitment(){
  if(!$('#recruitMarket')) return;
  if(!market.length) rerollMarket(false);
  $('#recruitMarket').innerHTML=market.map(h=>hunterCard(h,true)).join('');
}
function renderRoster(){
  if(!$('#roster')) return;
  $('#roster').innerHTML=state.roster.length?state.roster.map(h=>hunterCard(h,false)).join(''):'<div class="empty-state"><img src="assets/hunter_2.jpg"><h3>Noch keine Hunter</h3><p>Öffne die Rekrutierung und wirb deinen ersten Hunter an.</p><button class="primary" data-nav="recruit">Zur Rekrutierung</button></div>';
}
function renderGearHub(){
  const box=$('#gearHunterList'); if(!box) return;
  box.innerHTML=state.roster.length?state.roster.map(h=>`<button class="portrait-select ${state.activeHunterId===h.id?'selected':''}" data-loadouthunter="${h.id}"><img src="${h.portrait}"><span><b>${h.name}</b><small>${h.tier} · Level ${h.level}</small><em>🔫 ${h.primary?.name||'leer'} · 🔸 ${h.sidearm?.name||'leer'} · 🎒 ${h.extras.length}/8</em></span></button>`).join(''):'<div class="empty-state"><p>Du hast noch keinen Hunter.</p><button class="primary" data-nav="recruit">Hunter rekrutieren</button></div>';
  const stash=$('#stashSummary');
  if(stash) stash.innerHTML=`<div><p class="eyebrow">LAGER</p><h2>Gemeinsames Arsenal</h2><p>Abgerüstete Gegenstände bleiben erhalten und können später wieder verwendet werden.</p></div><div class="stash-counters"><span>🔫 <b>${state.stashWeapons.length}</b> Waffen</span><span>🎒 <b>${state.stashExtras.length}</b> Extras</span></div>`;
}
function renderHunterDetail(){
  const box=$('#hunterDetail'); if(!box) return; const h=activeHunter();
  if(!h){box.innerHTML='<div class="empty-state"><p>Kein Hunter ausgewählt.</p><button class="primary" data-nav="roster">Hunter auswählen</button></div>';return;}
  const perks=h.perks.map(id=>D.PERKS[id]).filter(Boolean);
  box.innerHTML=`<div class="detail-shell">
    <div class="detail-portrait" style="background-image:url('${h.portrait}')"><span class="tier-badge tier-${h.tier}">${h.tier}</span><div class="detail-name"><p>LEVEL ${h.level}</p><h1>${h.name}</h1><span>Wert ${moneyFmt(hunterValue(h))} $</span></div></div>
    <div class="detail-content">
      <div class="detail-actions"><button class="${state.selectedTeam.includes(h.id)?'primary':'secondary'}" data-team="${h.id}">${state.selectedTeam.includes(h.id)?'✓ Im Missionsteam':'Zum Missionsteam'}</button><button class="primary" data-loadouthunter="${h.id}">Ausrüstung verwalten</button><button class="ghost danger" data-dismiss="${h.id}">Hunter entlassen</button></div>
      <div class="detail-stat-grid"><div><span>❤️ Leben</span><b>${h.maxHp}</b></div><div><span>🎯 Präzision</span><b>${h.accuracy}</b></div><div><span>💪 Stärke</span><b>${h.strength}</b></div><div><span>⚡ Tempo</span><b>${h.speed}</b></div><div><span>🫁 Ausdauer</span><b>${h.maxStamina}</b></div><div><span>🍀 Glück</span><b>${h.luck}</b></div></div>
      <div class="ai-profile-card"><div><span class="eyebrow">CHARAKTERINTELLIGENZ</span><h3>🧠 ${h.ai.profile}</h3><p>${aiBehaviourText(h)}</p></div><div class="ai-profile-stats"><span>Intelligenz <b>${h.ai.intelligence}</b></span><span>Disziplin <b>${h.ai.discipline}</b></span><span>Aggression <b>${h.ai.aggression}</b></span><span>Mut <b>${h.ai.courage}</b></span></div></div>
      <div class="detail-grid-two">
        <section class="detail-panel"><p class="eyebrow">LOADOUT</p><h2>Ausrüstung</h2><button class="loadout-row" data-loadouthunter="${h.id}"><img src="${h.primary?weaponArt(h.primary):'assets/rifle_2.jpg'}"><span><small>Primärwaffe</small><b>${h.primary?.name||'Nicht ausgerüstet'}</b></span><strong>›</strong></button><button class="loadout-row" data-loadouthunter="${h.id}"><img src="${h.sidearm?weaponArt(h.sidearm):'assets/pistol_2.jpg'}"><span><small>Seitenwaffe</small><b>${h.sidearm?.name||'Nicht ausgerüstet'}</b></span><strong>›</strong></button><button class="loadout-row" data-loadouthunter="${h.id}"><img src="assets/shotgun_2.jpg"><span><small>Extras</small><b>${h.extras.length}/8 ausgerüstet</b></span><strong>›</strong></button></section>
        <section class="detail-panel"><p class="eyebrow">PERKS</p><h2>${perks.length}/15 Traits</h2><div class="perk-chip-list">${perks.length?perks.map(p=>`<span title="${p.text}">${p.name}<small>${p.rarity}</small></span>`).join(''):'<p class="muted">Dieser Hunter hat noch keine Perks.</p>'}</div></section>
      </div>
    </div>
  </div>`;
}
function renderLoadout(){
  const box=$('#loadoutView'); if(!box) return; const h=activeHunter();
  if(!h){box.innerHTML='<div class="empty-state"><p>Wähle zuerst einen Hunter.</p><button class="primary" data-nav="gear">Hunter auswählen</button></div>';return;}
  const perks=h.perks.map(id=>D.PERKS[id]).filter(Boolean);
  box.innerHTML=`<div class="loadout-header"><img src="${h.portrait}"><div><p class="eyebrow">${h.tier} · LEVEL ${h.level}</p><h1>${h.name}</h1><p>Stelle das Loadout Schritt für Schritt zusammen. Abgerüstete Gegenstände landen im gemeinsamen Lager.</p></div></div>
  <div class="loadout-menu-grid">
    ${loadoutSlotCard('primary','Primärwaffe',h.primary,'assets/rifle_2.jpg')}
    ${loadoutSlotCard('sidearm','Seitenwaffe',h.sidearm,'assets/pistol_2.jpg')}
    <article class="loadout-slot"><img src="assets/shotgun_2.jpg"><div><p class="eyebrow">EXTRAS</p><h2>${h.extras.length}/8 belegt</h2><p>${h.extras.length?h.extras.map(x=>x.name).slice(0,3).join(' · '):'Noch keine Tools oder Consumables.'}</p><div class="slot-actions"><button class="primary" data-openextras>Extras verwalten</button></div></div></article>
    <article class="loadout-slot"><img src="assets/boss_3.jpg"><div><p class="eyebrow">PERKS</p><h2>${perks.length}/15 Traits</h2><p>${perks.length?perks.slice(0,4).map(p=>p.name).join(' · '):'Perks werden durch Runs, Trait-Spurs und besondere Belohnungen erhalten.'}</p><div class="slot-actions"><button class="secondary" data-showperks>Perks ansehen</button></div></div></article>
  </div>
  <section class="equipped-extras panel"><div class="section-head compact"><div><p class="eyebrow">AUSGERÜSTET</p><h2>Tools & Consumables</h2></div></div><div class="equipped-chip-list">${h.extras.length?h.extras.map((x,i)=>`<span>${x.name}<button title="Ins Lager legen" data-unequipextra="${i}">×</button></span>`).join(''):'<p class="muted">Keine Extras ausgerüstet.</p>'}</div></section>`;
}
function loadoutSlotCard(slot,label,w,fallback){
  return `<article class="loadout-slot"><img src="${w?weaponArt(w):fallback}"><div><p class="eyebrow">${label.toUpperCase()}</p><h2>${w?.name||'Leer'}</h2><p>${w?`${w.category} · Schaden ${w.damage}/${w.damageMax} · Präzision ${w.accuracy}`:'Wähle eine passende Waffe aus dem Arsenal.'}</p><div class="slot-actions"><button class="primary" data-openarmory="${slot}">${w?'Ändern':'Ausrüsten'}</button>${w?`<button class="secondary" data-unequipweapon="${slot}">Ins Lager</button>`:''}</div></div></article>`;
}

function weaponFilters(){
  const cat=$('#weaponCategory'), qual=$('#weaponQuality');
  if(cat.options.length===1){ [...new Set(D.WEAPONS.map(w=>w.category))].sort().forEach(x=>cat.add(new Option(x,x))); [...new Set(D.WEAPONS.map(w=>w.quality))].filter(Boolean).sort().forEach(x=>qual.add(new Option(x,x))); }
}
function renderArmory(){
  weaponFilters(); const h=activeHunter(); const target=navContext.armoryTarget||'all';
  $('#activeBuyer').textContent=h?`Ausrüsten: ${h.name}`:'Kein Hunter ausgewählt';
  $('#armoryTitle').textContent=armoryMode==='extras'?'Tools & Consumables':target==='primary'?'Primärwaffe auswählen':target==='sidearm'?'Seitenwaffe auswählen':'Waffenarsenal';
  $('#armoryHint').textContent=armoryMode==='extras'?'Kaufe Extras oder rüste bereits eingelagerte Gegenstände wieder aus.':'Beim Wechsel wird die bisherige Waffe automatisch ins Lager gelegt.';
  $('#weaponList').classList.toggle('hidden',armoryMode!=='weapons'); $('#weaponPagination').classList.toggle('hidden',armoryMode!=='weapons'); $('#extraList').classList.toggle('hidden',armoryMode!=='extras');
  $('#armoryWeaponsBtn').classList.toggle('active',armoryMode==='weapons'); $('#armoryExtrasBtn').classList.toggle('active',armoryMode==='extras');
  renderStashStrip();
  if(armoryMode==='extras'){ renderExtras(); return; }
  const q=$('#weaponSearch').value.trim().toLowerCase(), c=$('#weaponCategory').value, qu=$('#weaponQuality').value;
  let list=D.WEAPONS.filter(w=>(target==='all'||weaponSlot(w)===target)&&(!q||w.name.toLowerCase().includes(q)||w.family.toLowerCase().includes(q))&&(!c||w.category===c)&&(!qu||w.quality===qu));
  const per=24,pages=Math.max(1,Math.ceil(list.length/per)); weaponPage=clamp(weaponPage,1,pages); list=list.slice((weaponPage-1)*per,weaponPage*per);
  $('#weaponList').innerHTML=list.map(w=>`<article class="weapon-card"><img class="weapon-thumb" src="${weaponArt(w)}"><div><h3>${w.name}</h3><div class="weapon-meta">${w.category} · ${w.ammo} · ${w.quality||'Standard'}<br>${w.special||''}</div><div class="weapon-stats"><span>DMG ${w.damage}/${w.damageMax}</span><span>🎯 ${w.accuracy}</span><span>N ${w.near}</span><span>M ${w.mid}</span><span>F ${w.far}</span><span>RoF ${w.rate}</span><span>🔊 ${w.noise}</span></div></div><div><div class="price">${moneyFmt(w.price)} $</div><button class="secondary buy-btn" data-buyweapon="${w.name.replace(/"/g,'&quot;')}">Kaufen & ausrüsten</button></div></article>`).join('');
  if(!list.length) $('#weaponList').innerHTML='<div class="empty-state"><p>Für diesen Slot wurden mit den aktuellen Filtern keine Waffen gefunden.</p></div>';
  $('#weaponPagination').innerHTML=Array.from({length:Math.min(pages,9)},(_,i)=>{ let p=pages<=9?i+1:clamp(weaponPage-4,1,pages-8)+i; return `<button class="${p===weaponPage?'active':''}" data-page="${p}">${p}</button>`}).join('');
}
function renderStashStrip(){
  const box=$('#stashWeaponStrip'); if(!box) return; const h=activeHunter();
  if(!h){box.innerHTML='';return;}
  if(armoryMode==='extras'){
    box.innerHTML=state.stashExtras.length?`<div class="stash-strip-title"><span>Im Lager</span><b>${state.stashExtras.length} Extras</b></div><div class="stash-items">${state.stashExtras.map((x,i)=>`<button class="stash-item" data-equipstashextra="${i}"><img src="assets/pistol_2.jpg"><span><b>${x.name}</b><small>Aus Lager ausrüsten</small></span></button>`).join('')}</div>`:'<div class="stash-strip-empty">Keine Extras im Lager.</div>';
  } else {
    const target=navContext.armoryTarget||'all'; const eligible=state.stashWeapons.map((w,i)=>({w,i})).filter(x=>target==='all'||weaponSlot(x.w)===target);
    box.innerHTML=eligible.length?`<div class="stash-strip-title"><span>Im Lager</span><b>${eligible.length} passende Waffen</b></div><div class="stash-items">${eligible.map(({w,i})=>`<button class="stash-item" data-equipstashweapon="${i}"><img src="${weaponArt(w)}"><span><b>${w.name}</b><small>Ohne Kauf ausrüsten</small></span></button>`).join('')}</div>`:'<div class="stash-strip-empty">Keine passende Waffe im Lager.</div>';
  }
}
function renderExtras(){
  $('#extraList').innerHTML=D.EXTRAS.map((x,i)=>`<article class="extra-card"><img class="weapon-thumb" src="assets/${x.damage>=10?'shotgun_2':'pistol_2'}.jpg" onerror="this.src='assets/pistol_2.jpg'"><div><h3>${x.name}</h3><div class="weapon-meta">${x.type==='tool'?'Tool':'Consumable'} · ${x.uses===99?'dauerhaft':x.uses+' Einsatz'}<br>${x.text}</div><div class="weapon-stats">${x.damage?`<span>DMG ${x.damage}</span>`:''}${x.heal?`<span>HEAL ${x.heal}</span>`:''}${x.status?`<span>${x.status}</span>`:''}</div></div><div><div class="price">${moneyFmt(x.price)} $</div><button class="secondary buy-btn" data-buyextra="${i}">Kaufen & ausrüsten</button></div></article>`).join('');
}
function buyWeapon(name){
  const h=activeHunter(); if(!h) return toast('Wähle zuerst einen Hunter.'); const w=D.WEAPONS.find(x=>x.name===name); if(!w) return;
  const requested=navContext.armoryTarget||'all', natural=weaponSlot(w), slot=requested==='primary'||requested==='sidearm'?requested:natural;
  if(requested!=='all'&&natural!==requested) return toast('Diese Waffe passt nicht in den gewählten Slot.');
  if(state.money<w.price) return toast('Nicht genug Geld.');
  state.money-=w.price; if(h[slot]) state.stashWeapons.push({...h[slot]}); h[slot]={...w}; state.activeHunterId=h.id;
  renderAll(); saveState(true); toast(`${w.name} wurde ausgerüstet. Alte Waffe liegt im Lager.`);
}
function buyExtra(idx){
  const h=activeHunter(); if(!h) return toast('Wähle zuerst einen Hunter.'); const x=D.EXTRAS[idx]; if(!x) return; if(state.money<x.price) return toast('Nicht genug Geld.');
  state.money-=x.price; const item={...x,currentUses:x.uses}; if(h.extras.length<8){h.extras.push(item);toast(`${x.name} wurde ausgerüstet.`);} else {state.stashExtras.push(item);toast(`${x.name} gekauft und ins Lager gelegt – Extraslots voll.`);} renderAll(); saveState(true);
}
function unequipWeapon(slot){
  const h=activeHunter(); if(!h||!['primary','sidearm'].includes(slot)||!h[slot]) return; state.stashWeapons.push({...h[slot]}); const name=h[slot].name; h[slot]=null; renderAll(); saveState(true); toast(`${name} wurde ins Lager gelegt.`);
}
function equipStashWeapon(idx){
  const h=activeHunter(), w=state.stashWeapons[idx]; if(!h||!w) return; const requested=navContext.armoryTarget||'all', natural=weaponSlot(w), slot=requested==='primary'||requested==='sidearm'?requested:natural; if(requested!=='all'&&natural!==requested)return toast('Waffe passt nicht in diesen Slot.');
  const old=h[slot]?{...h[slot]}:null; h[slot]={...w}; state.stashWeapons.splice(idx,1); if(old)state.stashWeapons.push(old); renderAll(); saveState(true); toast(`${w.name} aus dem Lager ausgerüstet.`);
}
function unequipExtra(idx){
  const h=activeHunter(); if(!h||!h.extras[idx])return; const [x]=h.extras.splice(idx,1); state.stashExtras.push(x); renderAll(); saveState(true); toast(`${x.name} wurde ins Lager gelegt.`);
}
function equipStashExtra(idx){
  const h=activeHunter(),x=state.stashExtras[idx]; if(!h||!x)return; if(h.extras.length>=8)return toast('Alle 8 Extraslots sind belegt.'); h.extras.push(x); state.stashExtras.splice(idx,1); renderAll(); saveState(true); toast(`${x.name} aus dem Lager ausgerüstet.`);
}

function renderMission(){
  if(state.run){ $('#missionPrep').classList.add('hidden'); $('#runView').classList.remove('hidden'); renderRun(); return; }
  $('#missionPrep').classList.remove('hidden'); $('#runView').classList.add('hidden'); const team=state.selectedTeam.map(id=>state.roster.find(h=>h.id===id)).filter(Boolean); $('#missionTeam').innerHTML=team.length?team.map(h=>hunterCard(h,false)).join(''):'<p>Wähle im Hunter-Bereich 1–3 Hunter aus.</p>'; $('#missionValue').textContent=moneyFmt(team.reduce((s,h)=>s+hunterValue(h),0))+' $';
}
function startRun(){
  const team=state.selectedTeam.map(id=>state.roster.find(h=>h.id===id)).filter(Boolean); if(team.length<1||team.length>3) return toast('Wähle 1–3 Hunter.');
  const noWeapon=team.find(h=>!h.primary&&!h.sidearm); if(noWeapon) return toast(`${noWeapon.name} braucht mindestens eine Waffe.`);
  team.forEach(h=>{ h.hp=h.maxHp; h.stamina=h.maxStamina; h.status={}; });
  state.run={round:1,maxRound:20,bonusLeft:0,stage:'hunt',clues:0,attention:0,loot:0,bounty:false,boss:null,bossKilled:false,banished:false,teamIds:team.map(h=>h.id),log:[],combat:null,distance:'mid',intel:0,runBuffs:{},directive:'balanced',combatSpeed:1};
  log('Die Jagd beginnt. Drei Wege liegen vor euch.','log-gold'); saveState(true); renderMission();
}
function runTeam(){ return state.run.teamIds.map(id=>state.roster.find(h=>h.id===id)).filter(Boolean); }
function livingTeam(){ return runTeam().filter(h=>h.hp>0); }
function renderRun(){
  const r=state.run;if(!r)return; $('#runRound').textContent=`${r.round}/${r.maxRound}${r.round>20?' +':''}`; $('#runClues').textContent=`${r.clues}/3`; $('#runAttention').textContent=r.attention; $('#attentionBar').style.width=r.attention+'%'; $('#runLoot').textContent=moneyFmt(r.loot)+' $'; $('#runStage').textContent=stageLabel(r.stage); renderRunTeam(); renderLog();
  if(r.combat){ $('#choiceGrid').classList.add('hidden'); $('#combatPanel').classList.remove('hidden'); renderCombat(); }
  else { $('#combatPanel').classList.add('hidden'); $('#choiceGrid').classList.remove('hidden'); renderChoices(); }
}
function stageLabel(s){ return ({hunt:'Jagd',banish:'Banish',bounty:'Bounty',escape:'Extraction',bonus:'Bonusrunde'})[s]||s; }
function renderRunTeam(){ $('#runTeam').innerHTML=runTeam().map(h=>{ const pct=clamp(h.hp/h.maxHp*100,0,100); const st=Object.entries(h.status||{}).filter(([,v])=>v>0).map(([k])=>statusIcon(k)).join(' '); return `<div class="run-hunter ${h.hp<=0?'dead':''}"><div class="run-hunter-head"><b>${h.name}</b><span>${Math.max(0,h.hp)}/${h.maxHp} HP</span></div><div class="hpbar"><i style="width:${pct}%"></i></div><small>${h.primary?.name||h.sidearm?.name||'unbewaffnet'} · L${h.level}</small><div class="status-chips">${st?`<span>${st}</span>`:''}</div></div>`; }).join(''); }
function statusIcon(k){ return ({bleed:'🩸',poison:'☠️',burn:'🔥',shock:'⚡',stun:'💫'})[k]||k; }
function renderLog(){ if(!state.run)return; $('#eventLog').innerHTML=state.run.log.map(x=>`<div class="${x.cls||''}">${x.msg}</div>`).join(''); }

const baseEvents=[
 {type:'clue',icon:'🔍',title:'Hinweis untersuchen',risk:'low',desc:'Fortschritt zum Target, etwas Geld und mögliche Aufmerksamkeit.'},
 {type:'monster',icon:'👹',title:'Monsterpfad',risk:'mid',desc:'Normale Kreaturen blockieren den Weg. XP und kleiner Loot.'},
 {type:'loot',icon:'💰',title:'Verlassenes Lager',risk:'low',desc:'Geld, Ausrüstung oder eine überraschende Falle.'},
 {type:'noise',icon:'🐦',title:'Riskanter stiller Weg',risk:'mid',desc:'Lärmfallen können ein sofortiges Folgeereignis auslösen.'},
 {type:'hunter',icon:'👤',title:'Schüsse verfolgen',risk:'high',desc:'Ein gegnerisches Hunter-Team ist wahrscheinlich in der Nähe.'},
 {type:'supply',icon:'🩺',title:'Versorgungspunkt',risk:'low',desc:'Heilung, Ruhe und Tool-Nachschub.'},
 {type:'elite',icon:'💀',title:'Schwere Kreatur',risk:'high',desc:'Elite-PvE mit hoher Trait-Chance.'},
 {type:'track',icon:'👣',title:'Hunter-Spur',risk:'mid',desc:'Gewinne Informationen und senke das Hinterhaltrisiko.'},
 {type:'compound',icon:'🏚️',title:'Compound durchsuchen',risk:'mid',desc:'Gemischtes Ereignis: Loot, Monster, Hinweis oder Hunter.'},
 {type:'trait',icon:'✦',title:'Dunkle Spur',risk:'mid',desc:'Chance auf einen neuen Trait, aber selten ohne Preis.'},
 {type:'unknown',icon:'❓',title:'Unbekannter Pfad',risk:'high',desc:'Unklar, aber Belohnungen sind um 25% höher.'},
];
function renderChoices(){
  const r=state.run; let choices=[];
  if(r.stage==='hunt'){
    const bossReady=r.round>=10 && (r.clues>=3 || chance(.20+(r.round-10)*.12));
    if(r.round>=15 || bossReady) choices.push({type:'boss',icon:'☠️',title:r.boss?`${r.boss.name} – Boss-Lair`:'Boss-Lair gefunden',risk:'extreme',desc:'Das Target ist hier. Töte es, um die Bounty zu sichern.'});
    const pool=baseEvents.filter(e=>!(r.round<6&&['elite','trait'].includes(e.type)));
    while(choices.length<3){ const e=pick(pool); if(!choices.some(x=>x.type===e.type)) choices.push({...e}); }
    if(!choices.some(x=>['clue','track','compound','boss'].includes(x.type))) choices[0]={...baseEvents[0]};
    if(choices.filter(x=>x.risk==='extreme').length>1) choices=choices.map((x,i)=>i&&x.risk==='extreme'?{...baseEvents[2]}:x);
  } else if(r.stage==='banish'){
    choices=[{type:'banish',icon:'🕯️',title:'Banish abschließen',risk:'high',desc:'Bereite die Bounty vor. Der Vorgang zieht Aufmerksamkeit an.'},{...baseEvents[5]},{...baseEvents[4],title:'Compound verteidigen'}];
  } else if(r.stage==='bounty'){
    choices=[{type:'takeBounty',icon:'🏆',title:'Bounty aufnehmen',risk:'high',desc:'Große Belohnung, aber Aufmerksamkeit +30.'},{...baseEvents[2],title:'Boss-Lair plündern'},{...baseEvents[7],title:'Umgebung prüfen'}];
  } else if(r.stage==='escape'||r.stage==='bonus'){
    const canExtract=r.round>=17 || r.stage==='bonus' || chance(.42);
    if(canExtract) choices.push({type:'extract',icon:'🛶',title:r.stage==='bonus'?'Extraction erzwingen':'Zur Extraction',risk:r.attention>70?'high':'mid',desc:'Bringe Bounty, Hunter und Loot nach Hause.'});
    const pool=[baseEvents[4],baseEvents[5],baseEvents[2],baseEvents[6],baseEvents[8],baseEvents[3]];
    while(choices.length<3){const e=pick(pool);if(!choices.some(x=>x.type===e.type)) choices.push({...e});}
    if(r.round>=20 && !choices.some(x=>x.type==='extract')) choices[0]={type:'extract',icon:'🛶',title:'Extraction – jetzt!',risk:'high',desc:'Reguläre Missionszeit ist vorbei.'};
  }
  if(r.intel>0) choices=choices.map(c=>({...c,desc:c.desc+' '+intelHint(c)}));
  $('#eventBanner').innerHTML=`<p class="eyebrow">${r.stage==='hunt'?'DREI WEGE':stageLabel(r.stage).toUpperCase()}</p><h2>${r.stage==='hunt'?'Wohin gehst du?':r.stage==='escape'?'Bring die Bounty heraus.':r.stage==='bonus'?'Die Extraction ist gestört.':'Der Boss ist gefallen.'}</h2><p>Runde ${r.round}. ${r.attention>=60?'Ihr seid auffällig – Hunter suchen euch.':'Die Gegend wirkt noch kontrollierbar.'}</p>`;
  $('#choiceGrid').innerHTML=choices.map((c,i)=>`<button class="choice" data-choice="${c.type}"><span class="risk risk-${c.risk}">${riskLabel(c.risk)}</span><div class="icon">${c.icon}</div><h3>${i+1}. ${c.title}</h3><p>${c.desc}</p></button>`).join('');
}
function intelHint(c){ const hints={monster:'[Scout: Kreaturen hörbar.]',hunter:'[Scout: bewaffnete Bewegung.]',noise:'[Scout: Lärmfallen wahrscheinlich.]',loot:'[Scout: keine Bewegung sichtbar.]',elite:'[Scout: schwere Kreatur.]',boss:'[Scout: Target bestätigt.]'}; return hints[c.type]||''; }
function riskLabel(r){return({low:'Niedrig',mid:'Mittel',high:'Hoch',extreme:'Extrem'})[r]||r;}

function chooseEvent(type){
  if(!state.run||state.run.combat)return; const r=state.run; playSound('click');
  if(type==='clue'){ r.clues=clamp(r.clues+1,0,3); const cash=75; r.loot+=cash; log(`Hinweis ${r.clues}/3 gefunden. +${cash} $ Run-Loot.`,'log-good'); if(chance(.18)) triggerNoise(pick(D.NOISE_SOURCES),false); advanceRound(); }
  else if(type==='loot'){ const cash=rnd(60,220); r.loot+=cash; log(`Lager geplündert: +${cash} $.`,'log-good'); if(chance(.20)) triggerNoise(pick(D.NOISE_SOURCES),false); else if(chance(.18)) randomFreeExtra(); advanceRound(); }
  else if(type==='supply'){ supplyEvent(); advanceRound(); }
  else if(type==='track'){ r.intel=2; r.attention=clamp(r.attention-8,0,100); log('Spuren gelesen: Die nächsten Entscheidungen sind besser einschätzbar. Aufmerksamkeit -8.','log-good'); advanceRound(); }
  else if(type==='noise'){ triggerNoise(pick(D.NOISE_SOURCES),true); }
  else if(type==='monster'){ startMonsterCombat(false); }
  else if(type==='elite'){ startMonsterCombat(true); }
  else if(type==='hunter'){ startHunterCombat(); }
  else if(type==='compound'){ resolveCompound(); }
  else if(type==='trait'){ if(chance(.65)) offerPerks('Eine dunkle Trait-Spur wurde gefunden.',()=>advanceRound()); else { log('Die Spur war eine Falle.','log-bad'); triggerNoise(pick(D.NOISE_SOURCES),true); } }
  else if(type==='unknown'){ const original=state.run._unknownBonus; state.run._unknownBonus=1.25; const e=pick(['monster','elite','loot','noise','hunter','clue']); chooseEvent(e); state.run._unknownBonus=original; }
  else if(type==='boss'){ startBossCombat(); }
  else if(type==='banish'){ r.banished=true; r.stage='bounty'; r.attention=clamp(r.attention+20,0,100); log('Banish abgeschlossen. Die Bounty ist bereit. Aufmerksamkeit +20.','log-gold'); advanceRound(); }
  else if(type==='takeBounty'){ r.bounty=true; r.stage='escape'; r.loot+=550; r.attention=clamp(r.attention+30,0,100); log('Bounty aufgenommen: +550 $ vorläufig. Aufmerksamkeit +30.','log-gold'); applyBountyPerks(); advanceRound(); }
  else if(type==='extract'){ attemptExtraction(); }
  renderRun(); saveState(true);
}
function advanceRound(){
  const r=state.run;if(!r)return; if(r.intel>0)r.intel--; runTeam().forEach(h=>tickStatuses(h)); if(livingTeam().length===0) return failRun('Alle Hunter sind gefallen.');
  r.round++; if(r.round>23) return completeRun();
  if(r.attention>=100 && !r.combat){ r.attention=60; log('Aufmerksamkeit 100: Ein Hunter-Team stellt euch!','log-bad'); startHunterCombat(true); }
}
function supplyEvent(){
  runTeam().filter(h=>h.hp>0).forEach(h=>{ const heal=Math.min(5,h.maxHp-h.hp); h.hp+=heal; h.stamina=h.maxStamina; if(h.status) {h.status.bleed=0;h.status.poison=0;} h.extras.forEach(x=>{ if(x.type==='tool'&&x.currentUses<x.uses) x.currentUses=Math.min(x.uses,x.currentUses+1); }); }); log('Versorgung: Team heilt bis zu 5 HP, Ausdauer voll, Tools teilweise aufgefüllt.','log-good');
}
function resolveCompound(){ const e=pick(['loot','monster','clue','noise','hunter','supply']); log(`Compound-Ereignis: ${e}.`); chooseEvent(e); }
function randomFreeExtra(){ const x=pick(D.EXTRAS.filter(x=>x.price<120)); const h=pick(livingTeam()); if(h&&h.extras.length<8){h.extras.push({...x,currentUses:x.uses});log(`${h.name} findet ${x.name}.`,'log-good');} }

function triggerNoise(source,consumeRound=true, chained=false){
  const r=state.run; const stealth=Math.max(...livingTeam().map(h=>hunterMods(h).stealth||0),0); const animal=/(Krähen|Enten|Fledermäuse|Pferd|Kuh|Hund|Hühner)/.test(source.name); const animalStealth=Math.max(...livingTeam().map(h=>hunterMods(h).animalStealth||0),0); if(animal && chance(animalStealth)) { log(`${source.name} wurde dank Beastface umgangen.`,'log-good'); if(consumeRound)advanceRound(); return; }
  const gain=Math.max(2,source.level*5-stealth*2); r.attention=clamp(r.attention+gain,0,100); log(`${source.name}: Lärm ${source.level}. Aufmerksamkeit +${gain}. ${source.text}`,'log-bad'); playSound(source.level>=4?'noise':'click');
  const roll=Math.random();
  if(roll<.45){ log('Das Geräusch lockt Monster an.','log-bad'); startMonsterCombat(source.level>=4); }
  else if(roll<.75){ log('Feindliche Hunter haben eure ungefähre Position.','log-bad'); r.attention=clamp(r.attention+10,0,100); if(chance(.45+source.level*.05)) startHunterCombat(); else { r.intel=Math.max(r.intel,1); if(consumeRound)advanceRound(); } }
  else if(roll<.90){ const cash=rnd(20,90); r.loot+=cash; log(`Im Chaos entdeckt ihr verlorenen Loot: +${cash} $.`,'log-good'); if(consumeRound)advanceRound(); }
  else if(!chained){ const next=pick(D.NOISE_SOURCES.filter(x=>x.name!==source.name)); log(`Kettenreaktion: ${next.name} wird ebenfalls ausgelöst!`,'log-bad'); triggerNoise(next,consumeRound,true); }
  else if(consumeRound)advanceRound();
}

function scaleEnemies(arr){ const n=livingTeam().length; return arr.map(e=>({...e,maxHp:Math.round(e.hp*(n===1?1:n===2?1.18:1.35)),hp:Math.round(e.hp*(n===1?1:n===2?1.18:1.35))})); }
function startMonsterCombat(elite=false){
  const r=state.run; const round=r.round; let pool=D.MONSTERS.filter(m=>elite?m.tier==='elite':round<6?m.tier==='common':m.tier!=='elite'); if(!pool.length)pool=D.MONSTERS;
  let count=elite?1:rnd(1,Math.min(4,1+Math.floor(round/5))); let enemies=[]; for(let i=0;i<count;i++)enemies.push({...pick(pool),id:uid(),kind:'monster'}); enemies=scaleEnemies(enemies); startCombat(enemies,elite?'Elite-Kreatur':'Monstergruppe',elite?'elite':'monster');
}
function rivalHunter(round){
  const tier=round>14?(chance(.35)?'Elite':'Verbessert'):round>8?(chance(.25)?'Elite':'Verbessert'):(chance(.25)?'Verbessert':'Standard'); const h=makeHunter(tier); const choices=D.WEAPONS.filter(w=>w.price<Math.max(250,round*55+150)); h.primary={...pick(choices.length?choices:D.WEAPONS)}; return {id:uid(),name:h.name,hp:h.maxHp,maxHp:h.maxHp,attack:Math.max(5,h.primary.damage),defense:tier==='Elite'?2:tier==='Verbessert'?1:0,speed:h.speed,status:null,kind:'hunter',weapon:h.primary,accuracy:h.accuracy,tier,reward:[80, tier==='Elite'?450:tier==='Verbessert'?260:150]};
}
function startHunterCombat(forced=false){ const r=state.run; const count=clamp(rnd(1,3)+(forced?1:0),1,3); let enemies=Array.from({length:count},()=>rivalHunter(r.round)); startCombat(enemies,'Feindliche Hunter','hunter'); }
function startBossCombat(){
  const r=state.run;if(!r.boss)r.boss={...pick(D.BOSSES)}; const n=livingTeam().length, mult=n===1?1:n===2?1.45:1.8; const b={...r.boss,id:uid(),kind:'boss',maxHp:Math.round(r.boss.hp*mult),hp:Math.round(r.boss.hp*mult)}; startCombat([b],`${b.name} – Target`,'boss');
}
function startCombat(enemies,title,type){
  const r=state.run; const pre=Math.max(...livingTeam().map(h=>hunterMods(h).preMonsterDamage||0),0); if(type==='monster'&&pre) enemies.forEach(e=>{e.hp=Math.max(1,e.hp-pre);});
  r.combat={title,type,enemies,distance:pick(['near','mid','far']),turn:1}; log(`${title}: Kampf beginnt auf ${distanceLabel(r.combat.distance)} Distanz.`,'log-bad'); playSound('battle'); renderRun();
}
function distanceLabel(d){return({near:'Nah',mid:'Mittel',far:'Fern'})[d];}
function bestWeapon(h){ return h.primary||h.sidearm||{name:'Fäuste',damage:5,damageMax:6,accuracy:70,near:8,mid:1,far:1,rate:5,noise:1,category:'Melee'}; }
function attackChance(h,w,d){ const mods=hunterMods(h); const dist=w[d]??5; const hunterMod=(h.accuracy-75)*.4; const v=w.accuracy+mods.accuracy+hunterMod+(dist-5)*3+(d==='far'?(mods.farAccuracy||0):0); return clamp(v,35,95)/100; }
function calcDamage(h,w,d){ const mods=hunterMods(h); const dist=w[d]??5; let base=w.damage||5; let dmg=base+(dist>=8?1:dist<=3?-2:0)+rnd(-1,1); if(w.category==='Melee'||d==='near') dmg=Math.round(dmg*(1+(mods.melee||0))); if(chance((h.luck||1)*.01)) {dmg+=2;log(`${h.name} erzielt einen kritischen Treffer!`,'log-gold');} return clamp(dmg,1,w.damageMax||20); }
function resolveCombatTurn(){
  const r=state.run,c=r.combat;if(!c)return; const enemies=c.enemies.filter(e=>e.hp>0); if(!enemies.length)return finishCombat();
  livingTeam().forEach(h=>{
    const target=pick(c.enemies.filter(e=>e.hp>0)); if(!target)return; const w=bestWeapon(h); if(chance(attackChance(h,w,c.distance))){ let dmg=calcDamage(h,w,c.distance); dmg=Math.max(1,dmg-(target.defense||0)); target.hp=Math.max(0,target.hp-dmg); log(`${h.name} trifft ${target.name} mit ${w.name}: ${dmg} Schaden.`,'log-good'); playSound('shot'); if((hunterMods(h).onMonsterHeal||0)&&target.hp<=0&&target.kind==='monster')h.hp=Math.min(h.maxHp,h.hp+hunterMods(h).onMonsterHeal); }
    else log(`${h.name} verfehlt ${target.name}.`);
    // gun noise
    r.attention=clamp(r.attention+Math.max(0,(w.noise||3)-3),0,100);
  });
  c.enemies.filter(e=>e.hp>0).forEach(e=>enemyAttack(e));
  livingTeam().forEach(h=>tickStatuses(h,true)); c.turn++;
  if(livingTeam().length===0)return failRun('Das Team wurde ausgelöscht.'); if(!c.enemies.some(e=>e.hp>0))finishCombat(); else renderRun();
}
function enemyAttack(e){ const targets=livingTeam(); if(!targets.length)return; const h=pick(targets); const dodge=clamp(.12+(h.speed-5)*.02, .05,.28); if(chance(dodge)){log(`${h.name} weicht ${e.name} aus.`);return;} let dmg=rnd(Math.max(1,e.attack-1),e.attack+1); const mods=hunterMods(h); if(e.kind==='monster'||e.kind==='boss')dmg=Math.round(dmg*(1-(mods.meleeResist||0))); h.hp=Math.max(0,h.hp-dmg); log(`${e.name} trifft ${h.name}: ${dmg} Schaden.`,'log-bad'); if(e.status&&chance(.35))applyStatus(h,e.status); }
function applyStatus(h,status){ if(!h.status)h.status={}; if(status==='bleed2'){h.status.bleed=2;log(`${h.name} erleidet starke Blutung.`,'log-bad');} else if(status==='burn2'){h.status.burn=2;log(`${h.name} brennt stark.`,'log-bad');} else if(status==='bleed'){h.status.bleed=Math.max(h.status.bleed||0,1);log(`${h.name} blutet.`,'log-bad');} else if(status==='poison'){h.status.poison=Math.max(h.status.poison||0,1);log(`${h.name} ist vergiftet.`,'log-bad');} else if(status==='burn'){h.status.burn=Math.max(h.status.burn||0,1);log(`${h.name} brennt.`,'log-bad');} else if(status==='shock'){h.status.shock=1;h.stamina=Math.max(0,h.stamina-2);log(`${h.name} wird geschockt.`,'log-bad');} else if(status==='stun'){h.status.stun=1;}
}
function tickStatuses(h,inCombat=false){ if(!h.status||h.hp<=0)return; const mods=hunterMods(h); if(h.status.bleed){ const lvl=h.perks.some(id=>D.PERKS[id]?.name==='Bloodless')?1:h.status.bleed; h.hp=Math.max(0,h.hp-lvl); h.status.bleed=Math.max(0,h.status.bleed-1); if(inCombat)log(`${h.name}: 🩸 ${lvl} Blutungsschaden.`,'log-bad'); }
  if(h.status.burn){ const raw=h.status.burn; const dmg=Math.max(0,Math.round(raw*(1-(mods.fireResist||0)))); h.hp=Math.max(0,h.hp-dmg); h.status.burn=Math.max(0,h.status.burn-1); if(inCombat&&dmg)log(`${h.name}: 🔥 ${dmg} Brandschaden.`,'log-bad'); }
  if(h.status.poison)h.status.poison=Math.max(0,h.status.poison-1); if(h.status.shock)h.status.shock=0; if(h.status.stun)h.status.stun=0;
  if((mods.regen||0)&&!inCombat)h.hp=Math.min(h.maxHp,h.hp+mods.regen);
}
function finishCombat(){
  const r=state.run,c=r.combat;if(!c)return; let reward=0; c.enemies.forEach(e=>{const rr=e.reward||[10,20];reward+=rnd(rr[0],rr[1]);}); reward=Math.round(reward*(r._unknownBonus||1)); const bonus=Math.max(...livingTeam().map(h=>hunterMods(h).reward||0),0); reward=Math.round(reward*(1+bonus)); r.loot+=reward; log(`Kampf gewonnen. +${reward} $ Run-Loot.`,'log-good');
  // revive downed after won fight
  runTeam().filter(h=>h.hp<=0).forEach(h=>{ const rev=livingTeam().some(x=>x.perks.some(id=>D.PERKS[id]?.name==='Necromancer')); if(rev||chance(.55)){h.hp=Math.max(1,Math.round(h.maxHp*(rev?.35:.25)));log(`${h.name} wird wiederbelebt (${h.hp} HP).`,'log-good');} });
  const team=runTeam(); team.forEach(h=>gainXp(h,c.type==='boss'?120:c.type==='hunter'?70:c.type==='elite'?60:30));
  const traitChance=c.type==='boss'?1:c.type==='elite'?.75:c.type==='hunter'?.28:.07; const type=c.type; r.combat=null;
  if(type==='boss'){ r.bossKilled=true; r.stage='banish'; log(`${r.boss.name} ist tot. Beginne den Banish.`,'log-gold'); if(chance(traitChance)) offerPerks('Boss-Trait: Wähle eine Verbesserung.',()=>advanceRound()); else advanceRound(); }
  else { if(chance(traitChance)) offerPerks(type==='elite'?'Elite-Trait-Spur gefunden.':'Trait-Spur gefunden.',()=>advanceRound()); else advanceRound(); }
  renderRun();
}
function changeDistance(){ const c=state.run?.combat;if(!c)return; const arr=['near','mid','far'];c.distance=arr[(arr.indexOf(c.distance)+1)%3];log(`Distanz gewechselt: ${distanceLabel(c.distance)}.`); renderCombat(); }
function fleeCombat(){ const r=state.run,c=r.combat;if(!c)return; const avg=livingTeam().reduce((s,h)=>s+h.speed,0)/Math.max(1,livingTeam().length); const p=clamp(.35+(avg-5)*.05, .2,.72); if(chance(p)){log('Flucht gelungen. Aufmerksamkeit +15.','log-good');r.attention=clamp(r.attention+15,0,100);r.combat=null;advanceRound();renderRun();} else {log('Flucht misslingt – Gegner erhalten freie Angriffe!','log-bad');c.enemies.filter(e=>e.hp>0).forEach(enemyAttack);renderRun();} }
function renderCombat(){
  const c=state.run.combat;if(!c)return; const enemies=c.enemies; const extraCount=livingTeam().reduce((s,h)=>s+h.extras.filter(x=>x.currentUses>0).length,0);
  $('#combatPanel').innerHTML=`<h2>${c.title}</h2><p>Distanz: <b>${distanceLabel(c.distance)}</b> · Kampfrunde ${c.turn}</p><div class="combat-grid">${enemies.map(e=>`<article class="enemy-card"><img src="${e.kind==='boss'?'assets/boss_3.jpg':e.kind==='hunter'?'assets/hunter_2.jpg':e.tier==='elite'?'assets/monster_1.jpg':'assets/monster_0.jpg'}"><div class="inside"><h4>${e.name}</h4><div class="hpbar"><i style="width:${clamp(e.hp/e.maxHp*100,0,100)}%"></i></div><small>${Math.max(0,e.hp)}/${e.maxHp} HP · ⚔ ${e.attack} · 🛡 ${e.defense}</small></div></article>`).join('')}</div><div class="combat-actions"><button class="primary" id="combatAttack">Angriff ausführen</button><button class="secondary" id="combatDistance">Distanz wechseln</button><button class="secondary" id="combatExtra">Extra benutzen (${extraCount})</button><button class="ghost danger" id="combatFlee">Fliehen</button></div>`;
}
function showCombatExtras(){
  const items=[]; livingTeam().forEach(h=>h.extras.forEach((x,i)=>{if(x.currentUses>0)items.push({h,x,i});})); if(!items.length)return toast('Keine nutzbaren Extras.');
  openModal(`<p class="eyebrow">KAMPFEXTRA</p><h2>Extra benutzen</h2><div class="codex-grid">${items.map((it,k)=>`<button class="perk-card" data-useextra="${k}"><h3>${it.x.name}</h3><p>${it.h.name} · ${it.x.currentUses===99?'∞':it.x.currentUses} Einsatz</p><p>${it.x.text}</p></button>`).join('')}</div>`); window._combatItems=items;
}
function useCombatExtra(k){
  const it=window._combatItems?.[k];if(!it)return;const {h,x}=it; const c=state.run.combat;if(!c)return; if(x.currentUses!==99)x.currentUses--;
  if(x.heal){ let heal=Math.round(x.heal*(1+hunterMods(h).heal)); h.hp=Math.min(h.maxHp,h.hp+heal); log(`${h.name} nutzt ${x.name}: +${heal} HP.`,'log-good'); }
  if(x.cleanse&&h.status)h.status[x.cleanse]=0;
  if(x.stamina)h.stamina=Math.min(h.maxStamina,h.stamina+x.stamina);
  if(x.damage){ const target=c.enemies.find(e=>e.hp>0); if(target){ let dmg=target.kind==='boss'&&x.bossDamage?x.bossDamage:x.damage; dmg=Math.max(1,dmg-(target.defense||0)); target.hp=Math.max(0,target.hp-dmg); log(`${h.name} nutzt ${x.name} gegen ${target.name}: ${dmg} Schaden.`,'log-good'); if(x.status) target.inflicted=x.status; } }
  if(x.attention)state.run.attention=clamp(state.run.attention+x.attention,0,100); if(x.intel)state.run.intel=Math.max(state.run.intel,x.intel);
  closeModal(); if(!c.enemies.some(e=>e.hp>0))finishCombat(); else renderRun();
}

function gainXp(h,amt){ h.xp=(h.xp||0)+amt; while(h.level<50 && h.xp>=80+h.level*20){ h.xp-=80+h.level*20; h.level++; const stat=pick(['maxHp','accuracy','strength','speed','maxStamina','luck']); if(stat==='maxHp'){h.maxHp=Math.min(40,h.maxHp+1);h.hp=Math.min(h.maxHp,h.hp+1);} else if(stat==='accuracy')h.accuracy=Math.min(98,h.accuracy+1); else if(stat==='maxStamina'){h.maxStamina=Math.min(10,h.maxStamina+1);h.stamina=h.maxStamina;} else h[stat]=Math.min(10,h[stat]+1); log(`${h.name} erreicht Level ${h.level}. ${stat} steigt.`,'log-gold'); } }
function offerPerks(title,onDone){
  const team=livingTeam(); if(!team.length){onDone?.();return;} const recipient=[...team].sort((a,b)=>a.perks.length-b.perks.length)[0]; let opts=[]; let guard=0; while(opts.length<3&&guard++<100){const p=weightedPerk(chance(.12)?'mythic':'schwer');if(canAddPerk(recipient,p)&&!opts.some(x=>x.id===p.id))opts.push(p);} if(!opts.length){onDone?.();return;}
  modalLock=true; openModal(`<p class="eyebrow">TRAIT-SPUR</p><h2>${title}</h2><p>${recipient.name} erhält einen Trait. Maximal 15 Traits, 24 Gewicht.</p><div class="perk-options">${opts.map(p=>`<button class="perk-card" data-perkpick="${p.id}"><span class="perk-rarity">${p.rarity} · Gewicht ${p.weight}</span><h3>${p.name}</h3><p>${p.text}</p></button>`).join('')}</div>`); window._perkDone=onDone; window._perkRecipient=recipient.id;
}
function selectPerk(id){ const h=state.roster.find(x=>x.id===window._perkRecipient); const p=D.PERKS[id]; if(h&&p&&canAddPerk(h,p)){h.perks.push(p.id);log(`${h.name} erhält Trait: ${p.name}.`,'log-gold');} modalLock=false; $('#modal').classList.add('hidden'); const cb=window._perkDone; window._perkDone=null; cb?.(); renderRun(); }
function applyBountyPerks(){ runTeam().forEach(h=>{const p=h.perks.map(id=>D.PERKS[id]).find(x=>x?.name==='Magpie');if(p){const s=pick(['strength','speed','luck']);h[s]=Math.min(10,h[s]+1);log(`Magpie: ${h.name} erhält +1 ${s}.`,'log-good');}}); }

function attemptExtraction(){
  const r=state.run; if(r.stage!=='escape'&&r.stage!=='bonus')return;
  const risk=clamp(.16+(r.attention/100)*.34, .12,.50);
  if(r.stage!=='bonus'&&chance(risk)){ r.stage='bonus'; r.bonusLeft=rnd(2,3); r.maxRound=20+r.bonusLeft; log(`Extraction gestört! ${r.bonusLeft} Bonusrunden beginnen.`,'log-bad'); if(chance(.55))startHunterCombat(true); else {triggerNoise(pick(D.NOISE_SOURCES),false);advanceBonus();} }
  else if(r.stage==='bonus'&&r.bonusLeft>0){ advanceBonus(); }
  else completeRun();
}
function advanceBonus(){ const r=state.run; r.bonusLeft--; if(r.bonusLeft<=0){log('Der Weg zur Extraction ist frei.','log-good');} advanceRound(); }
function completeRun(){
  const r=state.run; const survivors=runTeam().filter(h=>h.hp>0); if(!survivors.length)return failRun('Niemand erreicht die Extraction.'); const bountyBonus=r.bounty?rnd(900,1300):0; const total=r.loot+bountyBonus; state.money+=total; survivors.forEach(h=>{h.hp=h.maxHp;h.status={};gainXp(h,80);});
  // remove dead hunters
  const dead=runTeam().filter(h=>h.hp<=0); dead.forEach(h=>{state.roster=state.roster.filter(x=>x.id!==h.id);state.selectedTeam=state.selectedTeam.filter(id=>id!==h.id);});
  state.lastRun={success:true,rounds:r.round,loot:total,boss:r.boss?.name||null}; state.run=null; ensureEmergencyRecruit(); saveState(true); renderAll(); navStack=[]; navigate('hq',{},false); openModal(`<p class="eyebrow">EXTRACTION ERFOLGREICH</p><h2>Ihr seid raus.</h2><p><b>${moneyFmt(total)} $</b> wurden gesichert${bountyBonus?` – davon ${moneyFmt(bountyBonus)} $ Bounty-Bonus`:''}.</p><p>${dead.length?`${dead.map(x=>x.name).join(', ')} gingen verloren.`:'Alle Hunter haben überlebt.'}</p><button class="primary" onclick="document.querySelector('#modal').classList.add('hidden')">Zurück ins Hauptquartier</button>`); }
function failRun(reason){
  const r=state.run; const team=runTeam(); const survivors=team.filter(h=>h.hp>0); // if wipe, all mission hunters are lost unless Death Cheat
  team.forEach(h=>{ if(h.hp<=0){const perk=h.perks.find(id=>D.PERKS[id]?.name==='Death Cheat'); if(perk!=null){h.perks=h.perks.filter(id=>id!==perk);h.hp=1;h.primary=null;h.sidearm=null;h.extras=[];} else {state.roster=state.roster.filter(x=>x.id!==h.id);state.selectedTeam=state.selectedTeam.filter(id=>id!==h.id);} }});
  state.lastRun={success:false,rounds:r.round,loot:0,boss:r.boss?.name||null}; state.run=null; ensureEmergencyRecruit(); saveState(true); renderAll(); navStack=[]; navigate('hq',{},false); openModal(`<p class="eyebrow">MISSION VERLOREN</p><h2>${reason}</h2><p>Ungesicherter Run-Loot ist verloren. Gefallene Hunter verlieren Ausrüstung und können dauerhaft verloren sein.</p><button class="primary" onclick="document.querySelector('#modal').classList.add('hidden')">Weiter</button>`); }

function renderCodex(){ const box=$('#codexContent'); const cards={
 monsters:D.MONSTERS.map(m=>`<article class="codex-card"><h3>${m.name}</h3><div class="line"><span>Leben</span><b>${m.hp}</b></div><div class="line"><span>Angriff</span><b>${m.attack}</b></div><div class="line"><span>Verteidigung</span><b>${m.defense}</b></div><div class="line"><span>Tempo</span><b>${m.speed}</b></div><p>${m.status?`Status: ${m.status}`:'Kein besonderer Status.'}</p></article>`).join(''),
 bosses:D.BOSSES.map(m=>`<article class="codex-card"><h3>${m.name}</h3><div class="line"><span>Basis-Leben</span><b>${m.hp}</b></div><div class="line"><span>Angriff</span><b>${m.attack}</b></div><div class="line"><span>Verteidigung</span><b>${m.defense}</b></div><p>Team-Skalierung: ×1 / ×1,45 / ×1,8. Status: ${m.status}.</p></article>`).join(''),
 perks:D.PERKS.map(p=>`<article class="codex-card"><h3>${p.name}</h3><div class="line"><span>Stufe</span><b>${p.rarity}</b></div><div class="line"><span>Gewicht</span><b>${p.weight}</b></div><p>${p.text}</p></article>`).join(''),
 noise:D.NOISE_SOURCES.map(n=>`<article class="codex-card"><h3>${n.name}</h3><div class="line"><span>Lärm</span><b>${'🔊'.repeat(Math.min(5,n.level))}</b></div><p>${n.text}</p><p><b>Immer Folgeereignis:</b> Monster, Hunter-Info, Loot-/Wegfolge oder einmalige Kettenreaktion.</p></article>`).join(''),
 extras:D.EXTRAS.map(x=>`<article class="codex-card"><h3>${x.name}</h3><div class="line"><span>Preis</span><b>${x.price} $</b></div><div class="line"><span>Typ</span><b>${x.type}</b></div><p>${x.text}</p></article>`).join('')
 }; box.innerHTML=cards[codexMode]; }

function previewRecruit(id){
  const h=market.find(x=>x.id===id); if(!h)return; const perks=h.perks.map(id=>D.PERKS[id]).filter(Boolean);
  openModal(`<div class="recruit-preview"><img src="${h.portrait}"><div><p class="eyebrow">${h.tier} · LEVEL 1</p><h2>${h.name}</h2><div class="detail-stat-grid compact"><div><span>❤️ Leben</span><b>${h.maxHp}</b></div><div><span>🎯 Präzision</span><b>${h.accuracy}</b></div><div><span>💪 Stärke</span><b>${h.strength}</b></div><div><span>⚡ Tempo</span><b>${h.speed}</b></div><div><span>🫁 Ausdauer</span><b>${h.maxStamina}</b></div><div><span>🍀 Glück</span><b>${h.luck}</b></div></div><p>${perks.length?`Start-Perks: ${perks.map(p=>p.name).join(', ')}`:'Keine Start-Perks.'}</p><button class="primary" data-recruit="${h.id}">Für ${moneyFmt(h.price)} $ rekrutieren</button></div></div>`);
}
function showHunterPerks(){
  const h=activeHunter(); if(!h)return; const perks=h.perks.map(id=>D.PERKS[id]).filter(Boolean);
  openModal(`<p class="eyebrow">${h.name}</p><h2>Perks ${perks.length}/15</h2><div class="codex-grid">${perks.length?perks.map(p=>`<article class="codex-card"><h3>${p.name}</h3><div class="line"><span>Stufe</span><b>${p.rarity}</b></div><div class="line"><span>Gewicht</span><b>${p.weight}</b></div><p>${p.text}</p></article>`).join(''):'<p>Dieser Hunter hat noch keine Perks.</p>'}</div>`);
}

function playSound(type){
  if(state.settings && !state.settings.sound) return;
  try{ const A=window.AudioContext||window.webkitAudioContext; const ctx=playSound.ctx||(playSound.ctx=new A()); const t=ctx.currentTime; if(type==='shot'||type==='battle'||type==='noise'){ const b=ctx.createBuffer(1,ctx.sampleRate*.12,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=ctx.createBufferSource();s.buffer=b;const g=ctx.createGain();g.gain.setValueAtTime(type==='noise'?.18:.10,t);g.gain.exponentialRampToValueAtTime(.001,t+.12);s.connect(g).connect(ctx.destination);s.start(); } else { const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=240;g.gain.setValueAtTime(.025,t);g.gain.exponentialRampToValueAtTime(.001,t+.05);o.connect(g).connect(ctx.destination);o.start();o.stop(t+.05); }}catch{}
}

// ===== RPG HUNT v0.3 LOCAL UI / SYSTEM OVERRIDES =====
function maybeSave(){ if(state.settings?.autosave!==false) saveState(true); }
function tierColor(t){return ({Standard:'#a78e62',Verbessert:'#63927a',Elite:'#8870ad',Meister:'#c59a49'})[t]||'#999';}
function perkCost(p){ return p.rarity==='leicht'?1:p.rarity==='mittel'?2:p.rarity==='schwer'?4:99; }
function extraArt(x){const n=(x?.name||'').toLowerCase();if(/aid|medical|medkit/.test(n))return V.extraArt.med;if(/shot|antidote|stamina|regeneration|recovery/.test(n))return V.extraArt.shot;if(/dynamite|bomb|fire|hellfire|chaos|frag|satchel/.test(n))return V.extraArt.bomb;if(/trip|trap|mine/.test(n))return V.extraArt.trap;if(/beetle/.test(n))return V.extraArt.beetle;if(/knife|axe|spear|duster/.test(n))return V.extraArt.knife;return V.extraArt.med;}
function monsterArt(name){return V.monsterArt[name]||V.monsterArt.Grunt;}
function enemyArt(e){if(e.kind==='boss')return V.bossArt[e.name]||V.bossArt.Butcher;if(e.kind==='hunter')return V.hunterPortraits[(e.name?.charCodeAt(0)||0)%V.hunterPortraits.length];return monsterArt(e.name);}
function envById(id){return V.environments.find(x=>x.id===id)||V.environments[0];}
function randomEnv(except){const p=V.environments.filter(x=>x.id!==except);return pick(p.length?p:V.environments);}
function roleBlurb(role){return ({Scout:'Leise Wege, Tierfallen und Spuren.',Gunslinger:'Schnelle Schussfolgen und flexible Seitenwaffen.',Marksman:'Fernkampf und hohe Trefferchance.',Bruiser:'Nahkampf und schwere Ausrüstung.',Occultist:'Dunkle Hinweise und Monsterkontrolle.',Quartermaster:'Heilung, Vorräte und lange Runs.'})[role]||'Vielseitiger Hunter.';}

function hunterMods(h){
  const mods={accuracy:0,strength:0,speed:0,stamina:0,heal:0,melee:0,stealth:0,monsterStealth:0,animalStealth:0,reward:0,hunterLoot:0,farAccuracy:0,fireResist:0,poisonResist:0,meleeResist:0,explosiveResist:0,onMonsterHeal:0,preMonsterDamage:0,regen:0};
  h.perks.map(id=>D.PERKS[id]).filter(Boolean).forEach(p=>Object.entries(p.mods||{}).forEach(([k,v])=>{if(typeof v==='number')mods[k]=(mods[k]||0)+v;}));
  if(h.role==='Scout'){mods.stealth+=1;mods.animalStealth+=.12;} if(h.role==='Gunslinger')mods.accuracy+=2; if(h.role==='Marksman')mods.farAccuracy+=4; if(h.role==='Bruiser')mods.melee+=.10; if(h.role==='Occultist')mods.preMonsterDamage+=1; if(h.role==='Quartermaster')mods.heal+=.10;
  mods.accuracy=clamp(mods.accuracy,-8,8);mods.heal=clamp(mods.heal,0,.30);mods.melee=clamp(mods.melee,0,.20);mods.fireResist=clamp(mods.fireResist,0,.5);mods.poisonResist=clamp(mods.poisonResist,0,.5);mods.meleeResist=clamp(mods.meleeResist,0,.25);mods.explosiveResist=clamp(mods.explosiveResist,0,.25);return mods;
}

function hunterCard(h,marketMode=false){
  const perks=h.perks.map(id=>D.PERKS[id]).filter(Boolean),sel=state.selectedTeam.includes(h.id),pct=(v,max)=>Math.round(v/max*100);
  const maxA=100; return `<article class="hunter-card ${sel?'selected':''}" style="--tier:${tierColor(h.tier)}">
    <button class="hunter-portrait" data-openhunter="${h.id}" aria-label="${h.name} öffnen"><img src="${h.portrait}" alt=""><span class="tier-chip">${h.tier}</span>${sel?'<span class="team-check">✓</span>':''}</button>
    <div class="hunter-body"><h3>${h.name}</h3><div class="hunter-sub"><span>${h.role} · Level ${h.level}</span><span>${marketMode?moneyFmt(h.price)+' $':'Wert '+moneyFmt(hunterValue(h))+' $'}</span></div>
      <div class="stat-bars">${[['Leben',h.maxHp,40],['Präzision',h.accuracy,maxA],['Stärke',h.strength,10],['Tempo',h.speed,10],['Ausdauer',h.maxStamina,10],['Glück',h.luck,10]].map(([n,v,m])=>`<div class="stat-line"><span>${n}</span><span class="meter"><i style="width:${clamp(pct(v,m),0,100)}%"></i></span><b>${v}</b></div>`).join('')}</div>
      <div class="hunter-price-row"><span>${perks.length}/15 Traits · ${h.upgradePoints||0} UP</span><b class="price">${marketMode?moneyFmt(h.price)+' $':'L'+h.level}</b></div>
      <div class="card-actions">${marketMode?`<button class="btn primary" data-recruit="${h.id}">Rekrutieren</button><button class="btn secondary" data-openhunter="${h.id}">Vergleichen</button>`:`<button class="btn ${sel?'primary':'secondary'}" data-team="${h.id}">${sel?'✓ Im Team':'Zum Team'}</button><button class="btn secondary" data-openhunter="${h.id}">Details</button>`}</div>
    </div></article>`;
}

function renderAll(){renderTop();renderHQ();renderRecruitment();renderRoster();renderGearHub();renderHunterDetail();renderLoadout();renderArmory();renderMission();if($('#screen-codex')?.classList.contains('active'))renderCodex();if($('#screen-traits')?.classList.contains('active'))renderTraits();renderSettings();}
function renderTop(){ $('#money').textContent=moneyFmt(state.money);$('#rosterCount').textContent=state.roster.length;$('#teamCount').textContent=state.selectedTeam.length;$('#versionLabel').textContent=V.version.toUpperCase(); }
function renderHQ(){
  const team=state.selectedTeam.map(id=>state.roster.find(h=>h.id===id)).filter(Boolean);
  $('#hqTeam').innerHTML=team.length?team.map(h=>`<button class="team-mini" data-openhunter="${h.id}"><img src="${h.portrait}" alt=""><span><b>${h.name}</b><small>${h.tier} · ${h.role} · L${h.level}</small><small>${h.primary?.name||'keine Primärwaffe'}</small></span></button>`).join(''):'<div class="empty-state">Noch kein Missionsteam ausgewählt.</div>';
  $('#economySummary').innerHTML=`<div><span>Kontostand</span><b>${moneyFmt(state.money)} $</b></div><div><span>Roster-Wert</span><b>${moneyFmt(state.roster.reduce((s,h)=>s+hunterValue(h),0))} $</b></div><div><span>Lager-Waffen</span><b>${state.stashWeapons.length}</b></div><div><span>Lager-Extras</span><b>${state.stashExtras.length}</b></div><div><span>Extraktionen</span><b>${state.stats.extracts||0}</b></div><div><span>Bosskills</span><b>${state.stats.bosses||0}</b></div>`;
  const l=state.lastRun;$('#lastRun').innerHTML=l?`<p><b>${l.success?'EXTRAHIERT':'VERLOREN'}</b><br>${l.boss||'Kein Boss'} · ${l.rounds} Runden<br><strong>${moneyFmt(l.loot||0)} $</strong> gesichert.</p>`:'<p>Noch keine Mission abgeschlossen.</p>';
}

function renderRecruitment(){if(!market.length)rerollMarket(false);$('#recruitMarket').innerHTML=market.map(h=>hunterCard(h,true)).join('');}
function renderRoster(){const q=($('#rosterSearch')?.value||'').trim().toLowerCase(),tier=$('#rosterTier')?.value||'';let list=state.roster.filter(h=>(!q||h.name.toLowerCase().includes(q)||h.role.toLowerCase().includes(q))&&(!tier||h.tier===tier));$('#roster').innerHTML=list.length?list.map(h=>hunterCard(h,false)).join(''):'<div class="empty-state">Keine passenden Hunter gefunden.</div>';}
function renderGearHub(){const box=$('#gearHunterList');if(!box)return;box.innerHTML=state.roster.length?state.roster.map(h=>`<button class="portrait-choice" data-loadouthunter="${h.id}"><img src="${h.portrait}" alt=""><span>${h.name}<small>${h.tier} · ${h.role} · L${h.level}</small></span></button>`).join(''):'<div class="empty-state">Noch keine Hunter.</div>';$('#stashSummary').innerHTML=`<p class="eyebrow">GEMEINSAMES LAGER</p><h2>${state.stashWeapons.length} Waffen · ${state.stashExtras.length} Extras</h2><div class="stash-counts"><span><b>${state.stashWeapons.length}</b> Waffen verfügbar</span><span><b>${state.stashExtras.length}</b> Tools/Consumables verfügbar</span></div>`;}
function renderHunterDetail(){const box=$('#hunterDetail'),h=activeHunter();if(!h){box.innerHTML='<div class="empty-state">Kein Hunter ausgewählt.</div>';return;}const perks=h.perks.map(id=>D.PERKS[id]).filter(Boolean);const need=80+h.level*20;box.innerHTML=`<div class="hunter-detail-shell"><div class="hunter-detail-hero"><div class="detail-portrait"><img src="${h.portrait}" alt=""></div><div class="detail-main"><div class="detail-heading"><div><p class="eyebrow">${h.tier} · ${h.role}</p><h1>${h.name}</h1><p class="detail-bio">${h.bio||roleBlurb(h.role)}</p></div><div class="hunter-value">${moneyFmt(hunterValue(h))} $</div></div><div class="level-row"><b>LEVEL ${h.level}</b><div class="xpbar"><i style="width:${clamp((h.xp||0)/need*100,0,100)}%"></i></div><span>${h.xp||0}/${need} XP · ${h.upgradePoints||0} UP</span></div><div class="detail-stat-grid">${[['Leben',h.maxHp],['Präzision',h.accuracy],['Stärke',h.strength],['Tempo',h.speed],['Ausdauer',h.maxStamina],['Glück',h.luck]].map(([n,v])=>`<div class="big-stat"><span>${n}</span><b>${v}</b></div>`).join('')}</div><div class="detail-columns"><article class="panel"><p class="eyebrow">LOADOUT</p><div class="loadout-slots"><div class="slot-row"><span>Primärwaffe</span><b>${h.primary?.name||'Leer'}</b></div><div class="slot-row"><span>Seitenwaffe</span><b>${h.sidearm?.name||'Leer'}</b></div><div class="slot-row"><span>Extras</span><b>${h.extras.length}/8</b></div></div><div class="card-actions"><button class="btn primary" data-loadouthunter="${h.id}">Ausrüstung</button><button class="btn secondary" data-opentraits="${h.id}">Traits</button></div></article><article class="panel"><p class="eyebrow">ERFAHRUNG</p><div class="summary-grid"><div><span>Missionen</span><b>${h.missions||0}</b></div><div><span>Kills</span><b>${h.kills||0}</b></div><div><span>Bosskills</span><b>${h.bosses||0}</b></div><div><span>Traits</span><b>${perks.length}/15</b></div></div><div class="perk-list">${perks.slice(0,5).map(p=>`<div class="perk-pill"><span>${p.name}</span><small>${p.rarity}</small></div>`).join('')||'<p class="muted">Noch keine Traits.</p>'}</div></article></div><div class="card-actions"><button class="btn ${state.selectedTeam.includes(h.id)?'primary':'secondary'}" data-team="${h.id}">${state.selectedTeam.includes(h.id)?'✓ Im Team':'Zum Missionsteam'}</button><button class="btn danger" data-dismiss="${h.id}">Entlassen</button></div></div></div></div>`;}
function loadoutSlotCard(slot,label,w){return `<article class="gear-slot"><div class="slot-art" style="background-image:url('${w?weaponArt(w):V.weaponArt.rifle}')"></div><div class="slot-copy"><small>${label}</small><h3>${w?.name||'Leer'}</h3><p>${w?`${w.category} · DMG ${w.damage}/${w.damageMax} · Präz. ${w.accuracy}`:'Noch nicht ausgerüstet.'}</p><div class="slot-buttons"><button class="btn primary tiny" data-openarmory="${slot}">${w?'Wechseln':'Ausrüsten'}</button>${w?`<button class="btn secondary tiny" data-unequipweapon="${slot}">Ins Lager</button>`:''}</div></div></article>`;}
function renderLoadout(){const box=$('#loadoutView'),h=activeHunter();if(!h){box.innerHTML='<div class="empty-state">Wähle zuerst einen Hunter.</div>';return;}box.innerHTML=`<div class="loadout-shell"><div class="loadout-head"><div><p class="eyebrow">${h.tier} · ${h.role}</p><h1>${h.name}</h1><p>Alte Ausrüstung landet automatisch im Lager.</p></div><div class="buyer-chip">${h.extras.length}/8 Extras · ${h.perks.length}/15 Traits</div></div><div class="loadout-grid"><div class="loadout-hunter"><img src="${h.portrait}" alt=""><div class="caption"><b>${h.name}</b><small>Wert ${moneyFmt(hunterValue(h))} $</small></div></div><div class="gear-slots">${loadoutSlotCard('primary','Primärwaffe',h.primary)}${loadoutSlotCard('sidearm','Seitenwaffe',h.sidearm)}<article class="gear-slot"><div class="slot-art" style="background-image:url('${V.extraArt.med}')"></div><div class="slot-copy"><small>Tools & Consumables</small><h3>${h.extras.length}/8 belegt</h3><p>${h.extras.slice(0,3).map(x=>x.name).join(' · ')||'Keine Extras'}</p><div class="slot-buttons"><button class="btn primary tiny" data-openextras>Extras verwalten</button></div></div></article><article class="gear-slot"><div class="slot-art" style="background-image:url('${V.menuArt.codex}')"></div><div class="slot-copy"><small>Traits</small><h3>${h.perks.length}/15 gelernt</h3><p>${h.upgradePoints||0} Upgrade-Punkte verfügbar</p><div class="slot-buttons"><button class="btn primary tiny" data-opentraits="${h.id}">Trait Board</button></div></div></article><div class="extra-slot-grid">${Array.from({length:8},(_,i)=>{const x=h.extras[i];return x?`<div class="extra-slot"><img src="${extraArt(x)}" alt=""><span><b>${x.name}</b><small>${x.currentUses===99?'∞':x.currentUses} Einsatz</small></span><button class="icon-btn" data-unequipextra="${i}">×</button></div>`:'<div class="extra-slot empty">Leerer Slot</div>';}).join('')}</div></div></div></div>`;}

function renderExtras(){const h=activeHunter();$('#extraList').innerHTML=D.EXTRAS.map((x,i)=>`<article class="extra-card"><img class="weapon-thumb" src="${extraArt(x)}" alt=""><div><h3>${x.name}</h3><div class="weapon-meta">${x.type==='tool'?'Tool':'Consumable'} · ${x.uses===99?'dauerhaft':x.uses+' Einsatz'}<br>${x.text}</div><div class="weapon-stats">${x.damage?`<span>DMG ${x.damage}</span>`:''}${x.heal?`<span>HEAL ${x.heal}</span>`:''}${x.status?`<span>${x.status}</span>`:''}</div></div><div class="buy-col"><div class="price">${moneyFmt(x.price)} $</div><button class="btn secondary tiny" data-buyextra="${i}">Kaufen & ausrüsten</button></div></article>`).join('');}
function renderStashStrip(){const box=$('#stashWeaponStrip');if(!box)return;const h=activeHunter();if(!h){box.innerHTML='';return;}if(armoryMode==='extras'){box.innerHTML=state.stashExtras.length?`<div class="stash-strip-title"><span>IM LAGER</span><b>${state.stashExtras.length} Extras</b></div><div class="stash-items">${state.stashExtras.map((x,i)=>`<button class="stash-item" data-equipstashextra="${i}"><img src="${extraArt(x)}"><span><b>${x.name}</b><small>Kostenlos ausrüsten</small></span></button>`).join('')}</div>`:'<div class="stash-strip-empty">Keine Extras im Lager.</div>';}else{const target=navContext.armoryTarget||'all',eligible=state.stashWeapons.map((w,i)=>({w,i})).filter(x=>target==='all'||weaponSlot(x.w)===target);box.innerHTML=eligible.length?`<div class="stash-strip-title"><span>IM LAGER</span><b>${eligible.length} passende Waffen</b></div><div class="stash-items">${eligible.map(({w,i})=>`<button class="stash-item" data-equipstashweapon="${i}"><img src="${weaponArt(w)}"><span><b>${w.name}</b><small>Kostenlos ausrüsten</small></span></button>`).join('')}</div>`:'<div class="stash-strip-empty">Keine passende Waffe im Lager.</div>';}}
function renderArmory(){weaponFilters();const h=activeHunter(),target=navContext.armoryTarget||'all';$('#activeBuyer').textContent=h?`${h.name} · ${target==='primary'?'Primärslot':target==='sidearm'?'Seitenwaffe':'Ausrüstung'}`:'Kein Hunter ausgewählt';$('#armoryTitle').textContent=armoryMode==='extras'?'Tools & Consumables':target==='primary'?'Primärwaffe auswählen':target==='sidearm'?'Seitenwaffe auswählen':'Waffenarsenal';$('#weaponList').classList.toggle('hidden',armoryMode!=='weapons');$('#weaponPagination').classList.toggle('hidden',armoryMode!=='weapons');$('#extraList').classList.toggle('hidden',armoryMode!=='extras');$('#armoryWeaponsBtn').classList.toggle('active',armoryMode==='weapons');$('#armoryExtrasBtn').classList.toggle('active',armoryMode==='extras');renderStashStrip();if(armoryMode==='extras'){renderExtras();return;}const q=$('#weaponSearch').value.trim().toLowerCase(),c=$('#weaponCategory').value,qu=$('#weaponQuality').value;let list=D.WEAPONS.filter(w=>(target==='all'||weaponSlot(w)===target)&&(!q||w.name.toLowerCase().includes(q)||(w.family||'').toLowerCase().includes(q))&&(!c||w.category===c)&&(!qu||w.quality===qu));const per=18,pages=Math.max(1,Math.ceil(list.length/per));weaponPage=clamp(weaponPage,1,pages);list=list.slice((weaponPage-1)*per,weaponPage*per);$('#weaponList').innerHTML=list.map(w=>`<article class="weapon-card"><img class="weapon-thumb" src="${weaponArt(w)}"><div><h3>${w.name}</h3><div class="weapon-meta">${w.category} · ${w.ammo} · ${w.quality||'Standard'}<br>${w.special||''}</div><div class="weapon-stats"><span>DMG ${w.damage}/${w.damageMax}</span><span>🎯 ${w.accuracy}</span><span>N ${w.near}</span><span>M ${w.mid}</span><span>F ${w.far}</span><span>RoF ${w.rate}</span><span>🔊 ${w.noise}</span></div></div><div class="buy-col"><div class="price">${moneyFmt(w.price)} $</div><button class="btn secondary tiny" data-buyweapon="${w.name.replace(/"/g,'&quot;')}">Kaufen & ausrüsten</button></div></article>`).join('')||'<div class="empty-state">Keine passenden Waffen.</div>';$('#weaponPagination').innerHTML=Array.from({length:Math.min(pages,9)},(_,i)=>{let p=pages<=9?i+1:clamp(weaponPage-4,1,pages-8)+i;return `<button class="${p===weaponPage?'active':''}" data-page="${p}">${p}</button>`}).join('');}

function renderTraits(){const h=activeHunter();if(!h){$('#traitBoard').innerHTML='<div class="empty-state">Kein Hunter ausgewählt.</div>';return;}$('#traitBuyer').textContent=`${h.name} · ${h.upgradePoints||0} Upgrade-Punkte · ${h.perks.length}/15 Traits`;const q=($('#traitSearch')?.value||'').trim().toLowerCase(),rar=$('#traitRarity')?.value||'';let list=D.PERKS.filter(p=>(!q||p.name.toLowerCase().includes(q)||p.text.toLowerCase().includes(q))&&(!rar||p.rarity===rar));$('#traitBoard').innerHTML=list.map(p=>{const owned=h.perks.includes(p.id),cost=perkCost(p),buyable=p.rarity!=='mythic';return `<article class="trait-card ${owned?'owned':''}" style="--rarity:${p.rarity==='leicht'?'#6f9475':p.rarity==='mittel'?'#6f8fa5':p.rarity==='schwer'?'#9a73ad':'#c59a49'}"><h3>${p.name}</h3><p>${p.text}</p><div class="trait-cost"><span>${p.rarity} · Gewicht ${p.weight}</span>${owned?'<b>Gelernt</b>':buyable?`<button class="btn secondary tiny" data-buytrait="${p.id}">${cost} UP</button>`:'<b>Nur im Run</b>'}</div></article>`;}).join('');}
function learnTrait(id){const h=activeHunter(),p=D.PERKS[id];if(!h||!p)return;if(p.rarity==='mythic')return toast('Mythic/Burn-Traits müssen im Run gefunden werden.');const cost=perkCost(p);if((h.upgradePoints||0)<cost)return toast('Nicht genug Upgrade-Punkte.');if(!canAddPerk(h,p))return toast('Trait-Limit oder Gewicht erreicht.');h.upgradePoints-=cost;h.perks.push(id);renderTraits();renderHunterDetail();maybeSave();toast(`${p.name} gelernt.`);}

function ensureContract(){if(state.contract)return state.contract;const target=pick(D.BOSSES),env=pick(V.environments),mods=['Dichter Nebel','Blutmond','Nieselregen','Kalte Nacht','Windstille'];state.contract={target:target.name,envId:env.id,modifier:pick(mods),payout:rnd(900,1300)};return state.contract;}
function renderMission(){if(state.run){$('#missionPrep').classList.add('hidden');$('#runView').classList.remove('hidden');renderRun();return;}$('#missionPrep').classList.remove('hidden');$('#runView').classList.add('hidden');const team=state.selectedTeam.map(id=>state.roster.find(h=>h.id===id)).filter(Boolean),c=ensureContract();$('#missionTeam').innerHTML=[0,1,2].map(i=>{const h=team[i];return h?`<article class="mission-team-card"><img src="${h.portrait}" alt=""><div class="copy"><p class="eyebrow">${h.tier} · ${h.role}</p><h3>${h.name}</h3><p>L${h.level} · ${h.maxHp} HP · ${h.primary?.name||h.sidearm?.name||'unbewaffnet'}</p><button class="btn secondary tiny" data-openhunter="${h.id}">Details</button></div></article>`:'<article class="mission-team-card empty">Freier Teamplatz</article>';}).join('');$('#missionValue').textContent=moneyFmt(team.reduce((s,h)=>s+hunterValue(h),0))+' $';$('#contractDetails').innerHTML=`<div><span>Target</span><b>${c.target}</b></div><div><span>Startgebiet</span><b>${envById(c.envId).name}</b></div><div><span>Bedingung</span><b>${c.modifier}</b></div><div><span>Bounty-Bonus</span><b>${moneyFmt(c.payout)} $</b></div>`;}
function startRun(){const team=state.selectedTeam.map(id=>state.roster.find(h=>h.id===id)).filter(Boolean);if(team.length<1||team.length>3)return toast('Wähle 1–3 Hunter.');const noWeapon=team.find(h=>!h.primary&&!h.sidearm);if(noWeapon)return toast(`${noWeapon.name} braucht mindestens eine Waffe.`);team.forEach(h=>{h.hp=h.maxHp;h.stamina=h.maxStamina;h.status={};h.missions=(h.missions||0)+1;});const c=ensureContract();state.run={round:1,maxRound:20,bonusLeft:0,stage:'hunt',clues:0,attention:0,loot:0,bounty:false,boss:{...D.BOSSES.find(b=>b.name===c.target)},bossKilled:false,banished:false,teamIds:team.map(h=>h.id),log:[],combat:null,distance:'mid',intel:0,runBuffs:{},envId:c.envId,contractPayout:c.payout,modifier:c.modifier};state.stats.runs=(state.stats.runs||0)+1;log(`Contract angenommen: ${c.target}. ${c.modifier}.`,'gold');log('Die Jagd beginnt. Drei Wege liegen vor euch.','gold');maybeSave();renderMission();}
function advanceRound(){const r=state.run;if(!r)return;if(r.intel>0)r.intel--;runTeam().forEach(h=>tickStatuses(h));if(livingTeam().length===0)return failRun('Alle Hunter sind gefallen.');r.round++;if(chance(.48))r.envId=randomEnv(r.envId).id;if(r.round>23)return completeRun();if(r.attention>=100&&!r.combat){r.attention=60;log('Aufmerksamkeit 100: Ein Hunter-Team stellt euch!','red');startHunterCombat(true);}}
function renderRun(){const r=state.run;if(!r)return;const env=envById(r.envId);$('#runScene').style.setProperty('--scene',`url('${env.art}')`);$('#runRound').textContent=`${r.round}/${r.maxRound}${r.round>20?' +':''}`;$('#runClues').textContent=`${r.clues}/3`;$('#runAttention').textContent=r.attention;$('#attentionBar').style.width=r.attention+'%';$('#runLoot').textContent=moneyFmt(r.loot)+' $';$('#runStage').textContent=stageLabel(r.stage);renderRunTeam();renderLog();if(r.combat){$('#choiceGrid').classList.add('hidden');$('#combatPanel').classList.remove('hidden');renderCombat();}else{$('#combatPanel').classList.add('hidden');$('#choiceGrid').classList.remove('hidden');renderChoices();}}
function renderLog(){if(!state.run)return;$('#eventLog').innerHTML=state.run.log.map(x=>`<div class="run-log-item ${x.cls||''}">${x.msg}</div>`).join('');}
function choiceArt(c,i){const r=state.run,env=envById(r.envId);if(c.type==='boss')return V.bossArt[r.boss?.name]||env.art;if(c.type==='hunter')return V.hunterPortraits[(r.round+i)%V.hunterPortraits.length];if(c.type==='monster'||c.type==='elite')return monsterArt(c.type==='elite'?pick(['Meathead','Brute','Ursa Mortis']):pick(['Grunt','Armored','Immolator','Hive','Hellhound']));if(c.type==='supply')return V.extraArt.med;if(c.type==='trait')return V.menuArt.codex;if(c.type==='loot')return V.weaponArt.rifle;return env.art;}
function renderChoices(){const r=state.run;let choices=[];if(r.stage==='hunt'){const bossReady=r.round>=10&&(r.clues>=3||chance(.20+(r.round-10)*.12));if(r.round>=15||bossReady)choices.push({type:'boss',icon:'☠️',title:`${r.boss.name} – Boss-Lair`,risk:'extreme',desc:'Das Target ist hier. Töte es, um die Bounty zu sichern.'});const pool=baseEvents.filter(e=>!(r.round<6&&['elite','trait'].includes(e.type)));while(choices.length<3){const e=pick(pool);if(!choices.some(x=>x.type===e.type))choices.push({...e});}if(!choices.some(x=>['clue','track','compound','boss'].includes(x.type)))choices[0]={...baseEvents[0]};}else if(r.stage==='banish'){choices=[{type:'banish',icon:'🕯️',title:'Banish abschließen',risk:'high',desc:'Das Target löst sich auf. Jeder in der Gegend kann es spüren.'},{...baseEvents[5]},{...baseEvents[4],title:'Compound verteidigen'}];}else if(r.stage==='bounty'){choices=[{type:'takeBounty',icon:'🏆',title:'Bounty aufnehmen',risk:'high',desc:'Sichere das Token. Danach wird die Jagd auf euch härter.'},{...baseEvents[2],title:'Boss-Lair plündern'},{...baseEvents[7],title:'Umgebung prüfen'}];}else{if(r.round>=17||r.stage==='bonus'||chance(.42))choices.push({type:'extract',icon:'🛶',title:r.stage==='bonus'?'Extraction erzwingen':'Zur Extraction',risk:r.attention>70?'high':'mid',desc:'Bringe Hunter, Bounty und Loot nach Hause.'});const pool=[baseEvents[4],baseEvents[5],baseEvents[2],baseEvents[6],baseEvents[8],baseEvents[3]];while(choices.length<3){const e=pick(pool);if(!choices.some(x=>x.type===e.type))choices.push({...e});}if(r.round>=20&&!choices.some(x=>x.type==='extract'))choices[0]={type:'extract',icon:'🛶',title:'Extraction – jetzt!',risk:'high',desc:'Die reguläre Missionszeit ist vorbei.'};}if(r.intel>0)choices=choices.map(c=>({...c,desc:c.desc+' '+intelHint(c)}));const env=envById(r.envId);$('#eventBanner').innerHTML=`<p class="eyebrow">${r.stage==='hunt'?'DREI WEGE':stageLabel(r.stage).toUpperCase()} · ${env.name}</p><h2>${r.stage==='hunt'?'Wohin gehst du?':r.stage==='escape'?'Bring die Bounty heraus.':r.stage==='bonus'?'Die Extraction ist gestört.':'Der Boss ist gefallen.'}</h2><p>Runde ${r.round}. ${r.attention>=60?'Ihr seid laut geworden – andere Hunter suchen euch.':'Noch seid ihr schwer zu orten.'}</p>`;$('#choiceGrid').innerHTML=choices.map((c,i)=>`<button class="choice-card" data-choice="${c.type}" style="--art:url('${choiceArt(c,i)}');--risk:${c.risk==='low'?'#6b8f72':c.risk==='mid'?'#a78d54':c.risk==='high'?'#a45d4e':'#b53e38'}"><div class="choice-content"><span class="risk-label">${riskLabel(c.risk)}</span><h3>${i+1}. ${c.title}</h3><p>${c.desc}</p><div class="choice-tags"><span>${c.icon} ${c.type}</span><span>Runde +1</span></div></div></button>`).join('');}
function renderCombat(){const c=state.run.combat;if(!c)return;const extraCount=livingTeam().reduce((s,h)=>s+h.extras.filter(x=>x.currentUses>0).length,0);$('#combatPanel').innerHTML=`<div class="combat-header"><div><p class="eyebrow">KAMPF · ${c.type.toUpperCase()}</p><h2>${c.title}</h2><p>Distanz <b>${distanceLabel(c.distance)}</b></p></div><div class="combat-round">RUNDE ${c.turn}</div></div><div class="enemy-row">${c.enemies.map(e=>`<article class="enemy-card ${e.hp<=0?'dead':''}"><img src="${enemyArt(e)}" alt=""><div class="ecopy"><h3>${e.name}</h3><div class="ehp"><i style="width:${clamp(e.hp/e.maxHp*100,0,100)}%"></i></div><small>${Math.max(0,e.hp)}/${e.maxHp} HP · ⚔ ${e.attack} · 🛡 ${e.defense}</small></div></article>`).join('')}</div><div class="combat-actions"><div class="active-fighter"><span>Teamaktion wählen</span><b>${livingTeam().length} Hunter einsatzfähig</b></div><div class="action-buttons"><button class="action-btn" id="combatAttack">⚔ Feuer eröffnen</button><button class="action-btn" id="combatAim">🎯 Gezielt feuern</button><button class="action-btn" id="combatRush">🗡 Nahkampf-Rush</button><button class="action-btn" id="combatDistance">↔ Distanz wechseln</button><button class="action-btn" id="combatExtra">🎒 Extra (${extraCount})</button><button class="action-btn" id="combatFlee">🏃 Fliehen</button></div></div>`;}
function resolveCombatTurn(mode='attack'){const r=state.run,c=r.combat;if(!c)return;if(mode==='rush')c.distance='near';const aimBonus=mode==='aim'?.10:0,damageBonus=mode==='rush'?1:0;livingTeam().forEach(h=>{const target=pick(c.enemies.filter(e=>e.hp>0));if(!target)return;const w=bestWeapon(h);let p=attackChance(h,w,c.distance)+aimBonus;if(mode==='rush'&&w.category!=='Melee')p-=.08;if(chance(clamp(p,.35,.95))){let dmg=calcDamage(h,w,c.distance)+damageBonus;if(mode==='aim')dmg+=1;dmg=Math.max(1,dmg-(target.defense||0));target.hp=Math.max(0,target.hp-dmg);h.kills=(h.kills||0)+(target.hp<=0?1:0);log(`${h.name} trifft ${target.name} mit ${w.name}: ${dmg} Schaden.`,'green');playSound('shot');}else log(`${h.name} verfehlt ${target.name}.`);r.attention=clamp(r.attention+Math.max(0,(w.noise||3)-3),0,100);});if(mode==='rush')r.attention=clamp(r.attention+5,0,100);c.enemies.filter(e=>e.hp>0).forEach(e=>enemyAttack(e));livingTeam().forEach(h=>tickStatuses(h,true));c.turn++;if(livingTeam().length===0)return failRun('Das Team wurde ausgelöscht.');if(!c.enemies.some(e=>e.hp>0))finishCombat();else renderRun();}
function gainXp(h,amt){h.xp=(h.xp||0)+amt;while(h.level<50&&h.xp>=80+h.level*20){h.xp-=80+h.level*20;h.level++;h.upgradePoints=(h.upgradePoints||0)+1;const stat=pick(['maxHp','accuracy','strength','speed','maxStamina','luck']);if(stat==='maxHp'){h.maxHp=Math.min(40,h.maxHp+1);h.hp=Math.min(h.maxHp,h.hp+1);}else if(stat==='accuracy')h.accuracy=Math.min(98,h.accuracy+1);else if(stat==='maxStamina'){h.maxStamina=Math.min(10,h.maxStamina+1);h.stamina=h.maxStamina;}else h[stat]=Math.min(10,h[stat]+1);log(`${h.name} erreicht Level ${h.level}: ${stat} +1 und 1 Upgrade-Punkt.`,'gold');}}
function completeRun(){const r=state.run,survivors=runTeam().filter(h=>h.hp>0);if(!survivors.length)return failRun('Niemand erreicht die Extraction.');const bountyBonus=r.bounty?(r.contractPayout||rnd(900,1300)):0,total=r.loot+bountyBonus;state.money+=total;survivors.forEach(h=>{h.hp=h.maxHp;h.status={};gainXp(h,80);});const dead=runTeam().filter(h=>h.hp<=0);dead.forEach(h=>{state.roster=state.roster.filter(x=>x.id!==h.id);state.selectedTeam=state.selectedTeam.filter(id=>id!==h.id);});if(r.bossKilled){state.stats.bosses=(state.stats.bosses||0)+1;survivors.forEach(h=>h.bosses=(h.bosses||0)+1);}state.stats.extracts=(state.stats.extracts||0)+1;state.lastRun={success:true,rounds:r.round,loot:total,boss:r.boss?.name||null};state.run=null;state.contract=null;ensureEmergencyRecruit();maybeSave();renderAll();navStack=[];navigate('hq',{},false);openModal(`<p class="eyebrow">EXTRACTION ERFOLGREICH</p><h2>Ihr seid raus.</h2><p><b>${moneyFmt(total)} $</b> wurden gesichert${bountyBonus?` – ${moneyFmt(bountyBonus)} $ davon Bounty-Bonus`:''}.</p><p>${dead.length?`${dead.map(x=>x.name).join(', ')} gingen verloren.`:'Alle Hunter haben überlebt.'}</p><button class="btn primary" onclick="document.querySelector('#modal').classList.add('hidden')">Zum Hauptquartier</button>`);}
function failRun(reason){const r=state.run,team=runTeam();team.forEach(h=>{if(h.hp<=0){const perk=h.perks.find(id=>D.PERKS[id]?.name==='Death Cheat');if(perk!=null){h.perks=h.perks.filter(id=>id!==perk);h.hp=1;h.primary=null;h.sidearm=null;h.extras=[];}else{state.roster=state.roster.filter(x=>x.id!==h.id);state.selectedTeam=state.selectedTeam.filter(id=>id!==h.id);}}});state.stats.losses=(state.stats.losses||0)+1;state.lastRun={success:false,rounds:r.round,loot:0,boss:r.boss?.name||null};state.run=null;state.contract=null;ensureEmergencyRecruit();maybeSave();renderAll();navStack=[];navigate('hq',{},false);openModal(`<p class="eyebrow">MISSION VERLOREN</p><h2>${reason}</h2><p>Ungesicherter Loot ist verloren. Gefallene Hunter können dauerhaft aus dem Roster verschwinden.</p><button class="btn primary" onclick="document.querySelector('#modal').classList.add('hidden')">Weiter</button>`);}

function renderCodex(){const box=$('#codexContent');if(!box)return;const cards={monsters:D.MONSTERS.map(m=>`<article class="codex-card"><img src="${monsterArt(m.name)}"><div class="copy"><p class="eyebrow">${m.tier}</p><h3>${m.name}</h3><div class="codex-stats"><span>HP ${m.hp}</span><span>ATK ${m.attack}</span><span>DEF ${m.defense}</span><span>SPD ${m.speed}</span>${m.status?`<span>${statusIcon(m.status.replace('2',''))}</span>`:''}</div><p>${m.status?`Kann ${m.status} verursachen.`:'Keine besondere Status-Attacke.'}</p></div></article>`).join(''),bosses:D.BOSSES.map(m=>`<article class="codex-card"><img src="${V.bossArt[m.name]}"><div class="copy"><p class="eyebrow">BOSS TARGET</p><h3>${m.name}</h3><div class="codex-stats"><span>HP ${m.hp}</span><span>ATK ${m.attack}</span><span>DEF ${m.defense}</span><span>SPD ${m.speed}</span></div><p>Skaliert mit 1–3 Huntern. Status: ${m.status}.</p></div></article>`).join(''),weapons:D.WEAPONS.map(w=>`<article class="codex-card"><img src="${weaponArt(w)}"><div class="copy"><p class="eyebrow">${w.category}</p><h3>${w.name}</h3><div class="codex-stats"><span>DMG ${w.damage}/${w.damageMax}</span><span>🎯 ${w.accuracy}</span><span>RoF ${w.rate}</span><span>${w.price} $</span></div><p>${w.special||w.ammo}</p></div></article>`).join(''),perks:D.PERKS.map(p=>`<article class="codex-card"><div class="copy"><p class="eyebrow">${p.rarity} · Gewicht ${p.weight}</p><h3>${p.name}</h3><p>${p.text}</p></div></article>`).join(''),noise:D.NOISE_SOURCES.map(n=>`<article class="codex-card"><div class="copy"><p class="eyebrow">LÄRMQUELLE</p><h3>${n.name}</h3><div class="noise-level">${'●'.repeat(n.level)}${'○'.repeat(5-n.level)}</div><p>${n.text}</p><p>Auslösen erzeugt immer ein Folgeereignis.</p></div></article>`).join(''),extras:D.EXTRAS.map(x=>`<article class="codex-card"><img src="${extraArt(x)}"><div class="copy"><p class="eyebrow">${x.type}</p><h3>${x.name}</h3><div class="codex-stats"><span>${x.price} $</span>${x.damage?`<span>DMG ${x.damage}</span>`:''}${x.heal?`<span>HEAL ${x.heal}</span>`:''}</div><p>${x.text}</p></div></article>`).join('')};box.innerHTML=cards[codexMode]||cards.monsters;}

function renderSettings(){if(!$('#autosaveToggle'))return;$('#autosaveToggle').checked=state.settings.autosave!==false;$('#soundToggle').checked=state.settings.sound!==false;$('#motionToggle').checked=state.settings.motion!==false;document.body.classList.toggle('no-motion',state.settings.motion===false);}
function exportSave(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='RPG_Hunt_Save.json';a.click();URL.revokeObjectURL(a.href);toast('Savegame exportiert.');}
function importSaveFile(file){const r=new FileReader();r.onload=()=>{try{state=normaliseState(JSON.parse(r.result));saveState(true);renderAll();navigate('hq',{},false);toast('Savegame importiert.');}catch{toast('Ungültiges Savegame.');}};r.readAsText(file);}
function showRunInventory(){if(!state.run)return;const items=[];livingTeam().forEach(h=>h.extras.forEach((x,i)=>{if(x.currentUses>0)items.push({h,x,i});}));openModal(`<p class="eyebrow">RUN-INVENTAR</p><h2>Extras benutzen</h2><p>Heilung, Gegengift und Scout-Items können auch zwischen Kämpfen genutzt werden.</p><div class="trait-board">${items.map((it,k)=>`<button class="trait-card" data-usefield="${k}"><h3>${it.x.name}</h3><p>${it.h.name} · ${it.x.text}</p><div class="trait-cost"><span>${it.x.currentUses===99?'∞':it.x.currentUses} Einsatz</span><b>Benutzen</b></div></button>`).join('')||'<p>Keine nutzbaren Extras.</p>'}</div>`);window._fieldItems=items;}
function useFieldExtra(k){const it=window._fieldItems?.[k];if(!it)return;const {h,x}=it;if(x.currentUses!==99)x.currentUses--;if(x.heal)h.hp=Math.min(h.maxHp,h.hp+Math.round(x.heal*(1+hunterMods(h).heal)));if(x.cleanse&&h.status)h.status[x.cleanse]=0;if(x.stamina)h.stamina=Math.min(h.maxStamina,h.stamina+x.stamina);if(x.attention)state.run.attention=clamp(state.run.attention+x.attention,0,100);if(x.intel)state.run.intel=Math.max(state.run.intel,x.intel);closeModal();renderRun();maybeSave();toast(`${x.name} benutzt.`);}
function abandonRun(){if(!state.run||!confirm('Run wirklich abbrechen? Run-Loot und Bounty gehen verloren. Lebende Hunter kehren zurück.'))return;const r=state.run;runTeam().filter(h=>h.hp<=0).forEach(h=>{state.roster=state.roster.filter(x=>x.id!==h.id);state.selectedTeam=state.selectedTeam.filter(id=>id!==h.id);});runTeam().filter(h=>h.hp>0).forEach(h=>{h.hp=h.maxHp;h.status={};});state.stats.losses=(state.stats.losses||0)+1;state.lastRun={success:false,rounds:r.round,loot:0,boss:r.boss?.name||null};state.run=null;state.contract=null;maybeSave();renderAll();navStack=[];navigate('hq',{},false);toast('Run abgebrochen.');}




// --- v0.4 Händler- und Menü-Erweiterung ---
let shopMode = 'weapons';
let shopIndex = 0;
function shopBuyer(){return activeHunter() || state.roster[0] || null;}
function shopWeaponList(){
  const q=($('#shopSearch')?.value||'').trim().toLowerCase();
  const c=$('#shopCategory')?.value||'';
  return D.WEAPONS.filter(w=>(!q||w.name.toLowerCase().includes(q)||w.family.toLowerCase().includes(q)||w.category.toLowerCase().includes(q))&&(!c||w.category===c)).sort((a,b)=>(b.price-a.price)||(a.name.localeCompare(b.name)));
}
function shopInitFilters(){
  const cat=$('#shopCategory'); if(!cat||cat.options.length>1)return;
  [...new Set(D.WEAPONS.map(w=>w.category))].sort().forEach(x=>cat.add(new Option(x,x)));
}
function renderShop(){
  const box=$('#shopContent'); if(!box)return; shopInitFilters();
  const buyer=shopBuyer();
  $('#shopBuyerBox').innerHTML = buyer ? `<button class="shop-buyer" data-loadouthunter="${buyer.id}"><img src="${buyer.portrait}" alt=""><span><small>Aktiver Käufer</small><b>${buyer.name}</b><em>${buyer.tier} · ${buyer.role} · ${moneyFmt(hunterValue(buyer))} $ Wert</em></span></button>` : `<div class="shop-buyer empty"><span><small>Kein Hunter</small><b>Erst rekrutieren</b></span></div>`;
  $$('[data-shop-mode]').forEach(b=>b.classList.toggle('active',b.dataset.shopMode===shopMode));
  if(shopMode==='extras') return renderShopExtras(box,buyer);
  if(shopMode==='sell') return renderShopSell(box,buyer);
  return renderShopWeapons(box,buyer);
}
function renderShopWeapons(box,buyer){
  const list=shopWeaponList(); if(!list.length){box.innerHTML='<div class="empty-state">Keine Waffen gefunden.</div>';return;}
  shopIndex=clamp(shopIndex,0,list.length-1); const w=list[shopIndex];
  const prev=list[(shopIndex-1+list.length)%list.length], next=list[(shopIndex+1)%list.length];
  const slot=$('#shopSlot')?.value||'all';
  const canEquip=buyer && slot!=='stash';
  box.innerHTML=`<section class="weapon-carousel-shell">
    <button class="carousel-arrow" data-shop-prev>‹</button>
    <div class="carousel-side"><img src="${weaponArt(prev)}"><span>${prev.name}</span></div>
    <article class="featured-weapon" style="--art:url('${weaponArt(w)}')">
      <div class="featured-image"><img src="${weaponArt(w)}" alt=""></div>
      <div class="featured-copy"><p class="eyebrow">${w.category} · ${w.ammo}</p><h2>${w.name}</h2><p>${w.special||'Saubere Händlerware, bereit für den nächsten Run.'}</p>
      <div class="weapon-stats featured-stats"><span>DMG ${w.damage}/${w.damageMax}</span><span>🎯 ${w.accuracy}</span><span>N ${w.near}</span><span>M ${w.mid}</span><span>F ${w.far}</span><span>RoF ${w.rate}</span><span>Reload ${w.reload}</span><span>🔊 ${w.noise}</span></div>
      <div class="featured-actions"><strong class="price">${moneyFmt(w.price)} $</strong><button class="btn primary" data-shop-buyweapon="${escapeAttr(w.name)}" ${canEquip?'':'disabled'}>Kaufen & ausrüsten</button><button class="btn secondary" data-shop-buystash="${escapeAttr(w.name)}">Ins Lager kaufen</button><button class="btn ghost" data-nav="armory">Arsenal öffnen</button></div>
      </div>
    </article>
    <div class="carousel-side"><img src="${weaponArt(next)}"><span>${next.name}</span></div>
    <button class="carousel-arrow" data-shop-next>›</button>
  </section>
  <div class="shop-countline"><span>${shopIndex+1}/${list.length} Waffen</span><span>Slot: ${slot==='stash'?'Lager':slot==='primary'?'Primärwaffe':slot==='sidearm'?'Seitenwaffe':'automatisch'}</span><span>Kontostand: ${moneyFmt(state.money)} $</span></div>
  <div class="shop-quick-grid">${list.slice(0,18).map((x,i)=>`<button class="quick-weapon ${x.name===w.name?'active':''}" data-shop-jump="${i}"><img src="${weaponArt(x)}"><span>${x.name}</span><small>${moneyFmt(x.price)} $</small></button>`).join('')}</div>`;
}
function escapeAttr(str){return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function renderShopExtras(box,buyer){
  const q=($('#shopSearch')?.value||'').trim().toLowerCase();
  const list=D.EXTRAS.filter(x=>!q||x.name.toLowerCase().includes(q)||x.text.toLowerCase().includes(q)||x.type.toLowerCase().includes(q));
  box.innerHTML=`<div class="shop-grid-head"><div><p class="eyebrow">TOOLS & CONSUMABLES</p><h2>Vorräte kaufen</h2><p>Medikits, Bomben, Fallen, Messer, Wurfäxte, Beetles und Spritzen.</p></div><img src="${V.menuArt.extrasWorkbench||V.extraArt.med}" alt=""></div><div class="merchant-grid">${list.map((x,i)=>`<article class="merchant-card"><img src="${extraArt(x)}"><div><p class="eyebrow">${x.type==='tool'?'Tool':'Consumable'} · ${x.uses===99?'dauerhaft':x.uses+'x'}</p><h3>${x.name}</h3><p>${x.text}</p><div class="weapon-stats">${x.damage?`<span>DMG ${x.damage}</span>`:''}${x.heal?`<span>HEAL ${x.heal}</span>`:''}${x.status?`<span>${x.status}</span>`:''}</div></div><div><b class="price">${moneyFmt(x.price)} $</b><button class="btn primary tiny" data-buyextra="${D.EXTRAS.indexOf(x)}" ${buyer?'':'disabled'}>Kaufen</button><button class="btn secondary tiny" data-shop-extra-stash="${D.EXTRAS.indexOf(x)}">Ins Lager</button></div></article>`).join('')}</div>`;
}
function renderShopSell(box,buyer){
  const w=state.stashWeapons, e=state.stashExtras;
  box.innerHTML=`<div class="shop-grid-head"><div><p class="eyebrow">LAGER & VERKAUF</p><h2>Alte Beute zu Geld machen</h2><p>Verkaufspreis: 55 % vom Händlerwert. Ausgerüstete Gegenstände erst im Loadout abrüsten.</p></div><img src="${V.menuArt.merchant||V.menuArt.shop||V.menuArt.gear}" alt=""></div>
  <div class="sell-columns"><section class="panel"><h2>Waffen im Lager (${w.length})</h2>${w.length?w.map((x,i)=>`<div class="sell-row"><img src="${weaponArt(x)}"><span><b>${x.name}</b><small>${x.category} · DMG ${x.damage}/${x.damageMax}</small></span><strong>${moneyFmt(sellValue(x.price))} $</strong><button class="btn tiny secondary" data-shop-equip-stash-w="${i}" ${buyer?'':'disabled'}>Ausrüsten</button><button class="btn tiny danger" data-shop-sellw="${i}">Verkaufen</button></div>`).join(''):'<p class="muted">Keine Waffen im Lager.</p>'}</section>
  <section class="panel"><h2>Extras im Lager (${e.length})</h2>${e.length?e.map((x,i)=>`<div class="sell-row"><img src="${extraArt(x)}"><span><b>${x.name}</b><small>${x.type} · ${x.currentUses===99?'∞':x.currentUses} Einsatz</small></span><strong>${moneyFmt(sellValue(x.price))} $</strong><button class="btn tiny secondary" data-shop-equip-stash-e="${i}" ${buyer?'':'disabled'}>Ausrüsten</button><button class="btn tiny danger" data-shop-selle="${i}">Verkaufen</button></div>`).join(''):'<p class="muted">Keine Extras im Lager.</p>'}</section></div>`;
}
function sellValue(price){return Math.max(1,Math.round((price||0)*0.55));}
function buyShopWeapon(name,toStash=false){
  const w=D.WEAPONS.find(x=>x.name===name); if(!w)return; if(state.money<w.price)return toast('Nicht genug Geld.');
  state.money-=w.price;
  if(toStash){state.stashWeapons.push({...w}); toast(`${w.name} wurde ins Lager gekauft.`);}
  else{const buyer=shopBuyer(); if(!buyer){state.money+=w.price; return toast('Wähle zuerst einen Hunter.');} const slotSel=$('#shopSlot')?.value||'all'; const natural=weaponSlot(w); const slot=(slotSel==='primary'||slotSel==='sidearm')?slotSel:natural; if(slotSel!=='all'&&slotSel!==slot&&slotSel!=='stash'){state.money+=w.price;return toast('Diese Waffe passt nicht in den gewählten Slot.');} if(buyer[slot])state.stashWeapons.push({...buyer[slot]}); buyer[slot]={...w}; state.activeHunterId=buyer.id; toast(`${w.name} wurde für ${buyer.name} ausgerüstet.`);}
  renderAll(); maybeSave();
}
function buyShopExtraToStash(idx){const x=D.EXTRAS[idx];if(!x)return;if(state.money<x.price)return toast('Nicht genug Geld.');state.money-=x.price;state.stashExtras.push({...x,currentUses:x.uses});renderAll();maybeSave();toast(`${x.name} wurde ins Lager gekauft.`);}
function sellStashWeapon(idx){const w=state.stashWeapons[idx];if(!w)return;state.money+=sellValue(w.price);state.stashWeapons.splice(idx,1);renderAll();maybeSave();toast(`${w.name} verkauft.`);}
function sellStashExtra(idx){const x=state.stashExtras[idx];if(!x)return;state.money+=sellValue(x.price);state.stashExtras.splice(idx,1);renderAll();maybeSave();toast(`${x.name} verkauft.`);}

const navigateBase = navigate;
function navigate(view,ctx={},push=true){
  const target=$(`#screen-${view}`); if(!target) return;
  if(push && currentView!==view) navStack.push({view:currentView,ctx:{...navContext}});
  currentView=view; navContext={...navContext,...ctx};
  $$('.screen').forEach(x=>x.classList.remove('active')); target.classList.add('active');
  const meta={...VIEW_META,shop:['HÄNDLER','Markt & Lager']}[view]||['RPG HUNT',view];
  $('#pageEyebrow').textContent=meta[0]; $('#pageTitle').textContent=meta[1];
  $('#backBtn').classList.toggle('hidden',view==='hq'||!!state.run);
  if(view==='hunters') renderHunters(); if(view==='recruit') renderRecruitment(); if(view==='roster') renderRoster(); if(view==='hunterDetail') renderHunterDetail(); if(view==='gear') renderGearHub(); if(view==='loadout') renderLoadout(); if(view==='armory') renderArmory(); if(view==='shop') renderShop(); if(view==='mission') renderMission(); if(view==='codex') renderCodex(); if(view==='traits') renderTraits(); if(view==='settings') renderSettings(); if(view==='hq') renderHQ();
  window.scrollTo({top:0,behavior:'smooth'});
}
const renderAllBase = renderAll;
function renderAll(){renderTop();renderHQ();renderRecruitment();renderRoster();renderGearHub();renderHunterDetail();renderLoadout();renderArmory();renderShop();renderMission();if($('#screen-codex')?.classList.contains('active'))renderCodex();if($('#screen-traits')?.classList.contains('active'))renderTraits();renderSettings();}



/* ===== RPG Hunt v0.5 PLAYER SIMULATION ===== */
let playerCombatBusy=false;
let playerCombatTimer=null;
let playerCombatToken=0;
function aiBehaviourText(h){
  ensureHunterAI(h);
  const a=h.ai;
  if(a.profile==='Taktiker')return 'Analysiert Distanz, Trefferchance, Ausdauer und Lebenspunkte sehr zuverlässig. Wechselt Waffen früh und zieht sich bei schlechten Quoten eher geordnet zurück.';
  if(a.profile==='Hitzkopf')return 'Drückt gern zu früh nach vorn, bevorzugt hohen Schaden und ignoriert schlechte Trefferquoten gelegentlich.';
  if(a.profile==='Unsicher')return 'Zögert unter Druck und trifft häufiger suboptimale Entscheidungen. Kann zu spät heilen oder eine unpassende Waffe behalten.';
  if(a.profile==='Jäger')return 'Sucht Initiative und Druck. Nutzt gute Gelegenheiten schnell, verbraucht dabei aber mehr Ausdauer.';
  if(a.profile==='Vorsichtiger')return 'Schützt Leben und Ausdauer, heilt früh und meidet unnötige Duelle. Kann dadurch Chancen liegen lassen.';
  if(a.profile==='Glücksritter')return 'Akzeptiert riskante Schüsse und verlässt sich stärker auf Glück und spontane Chancen.';
  return 'Wägt Risiko und Belohnung durchschnittlich ab und reagiert auf Distanz, Ausdauer und Teamzustand.';
}
function eventBaseScore(type,r){
  const hp=livingTeam().reduce((s,h)=>s+h.hp/h.maxHp,0)/Math.max(1,livingTeam().length);
  const map={clue:82,monster:48,loot:58,noise:36,hunter:34,supply:hp<.72?88:52,elite:42,track:66,trait:62,compound:55,boss:r.clues>=2||r.round>=10?90:55,extract:r.bounty?96:25,bounty:96,banish:92};
  let v=map[type]??50;
  if(r.attention>70&&['hunter','noise','elite'].includes(type))v-=22;
  if(hp<.45&&['hunter','elite','boss'].includes(type))v-=28;
  if(r.round>=14&&type==='clue')v+=12;
  return v;
}
function leaderHunter(){return livingTeam().slice().sort((a,b)=>(b.ai?.intelligence||0)-(a.ai?.intelligence||0))[0]||runTeam()[0];}
function aiChoiceScore(type,h){
  ensureHunterAI(h); const r=state.run; let v=eventBaseScore(type,r); const risk=['hunter','elite','boss','noise'].includes(type)?1:0;
  v+=risk*(h.ai.aggression-50)*.28; v-=risk*(65-h.ai.courage)*.18;
  if(type==='track'&&['Scout','Marksman'].includes(h.role))v+=10;
  if(type==='loot'&&h.role==='Quartermaster')v+=8;
  if(type==='boss'&&h.role==='Bruiser')v+=5;
  const error=(100-h.ai.intelligence)*.38; v+=rnd(-Math.round(error),Math.round(error));
  return clamp(Math.round(v),5,99);
}
const _playerBaseRenderChoices=renderChoices;
renderChoices=function(){
  _playerBaseRenderChoices();
  const lead=leaderHunter(); if(!lead)return;
  const cards=[...document.querySelectorAll('#choiceGrid [data-choice]')];
  const scored=cards.map(card=>({card,type:card.dataset.choice,score:aiChoiceScore(card.dataset.choice,lead)}));
  const best=Math.max(...scored.map(x=>x.score));
  scored.forEach(x=>{
    const tag=document.createElement('div'); tag.className='ai-advice'+(x.score===best?' recommended':'');
    tag.innerHTML=`<span>🧠 ${lead.name}</span><b>${x.score}%</b><small>${x.score===best?'KI empfiehlt diesen Weg':'KI-Einschätzung'}</small>`;
    x.card.querySelector('.choice-content')?.appendChild(tag);
  });
};
function aiWeaponScore(h,w,c){
  if(!w)return -999; const directive=AI_DIRECTIVES[state.run?.directive||'balanced'];
  const p=attackChance(h,w,c.distance)*100; const avg=((w.damage||5)+(w.damageMax||w.damage||5))/2; const fit=(w[c.distance]??5)*4;
  let score=p*.62+avg*2.1+fit-(w.noise||4)*(state.run.attention>72?1.2:.25);
  if(directive===AI_DIRECTIVES.aggressive)score+=avg*1.2+(w.rate||5)*.7;
  if(directive===AI_DIRECTIVES.cautious)score+=p*.16-(w.noise||4)*.8;
  return score;
}
function aiPickWeapon(h,c){
  ensureHunterAI(h); const fallback={name:'Fäuste',damage:5,damageMax:6,accuracy:70,near:8,mid:1,far:1,rate:5,noise:1,category:'Melee'};
  const options=[h.primary,h.sidearm].filter(Boolean); if(!options.length)return fallback;
  const ranked=options.map(w=>({w,score:aiWeaponScore(h,w,c)})).sort((a,b)=>b.score-a.score);
  const mistake=chance(clamp((72-h.ai.intelligence)/120,0,.28));
  return mistake&&ranked.length>1?ranked[ranked.length-1].w:ranked[0].w;
}
function aiTarget(h,c){
  const alive=c.enemies.filter(e=>e.hp>0); if(!alive.length)return null; ensureHunterAI(h);
  if(h.ai.intelligence<50&&chance(.45))return pick(alive);
  return alive.slice().sort((a,b)=>((b.attack||0)*2+b.hp*.12)-((a.attack||0)*2+a.hp*.12))[0];
}
function aiHealingExtra(h){return h.extras.find(x=>x.currentUses>0&&(x.heal||x.cleanse));}
function aiDecideAction(h,w,c){
  ensureHunterAI(h); const a=h.ai,d=AI_DIRECTIVES[state.run.directive||'balanced']; const hp=h.hp/h.maxHp;
  const heal=aiHealingExtra(h);
  if(heal&&hp<(.34+(a.intelligence>72?.16:0))&&chance(clamp(a.intelligence/100,.42,.95)))return {type:'heal',extra:heal};
  if(h.stamina<=1&&a.intelligence>58&&chance(.82))return {type:'recover'};
  const hit=attackChance(h,w,c.distance)+(d.accuracy||0)-(h.stamina<=0?.12:0);
  if(c.distance==='near'&&a.aggression+(d.aggression||0)>72&&h.stamina>=2)return {type:'rush',hit:hit-.05};
  if(a.discipline>62&&h.stamina>=2&&hit<.83&&chance(a.discipline/115))return {type:'aim',hit:hit+.10};
  return {type:'attack',hit};
}
function preferredDistanceForWeapon(w){const vals=[['near',w.near??5],['mid',w.mid??5],['far',w.far??5]].sort((a,b)=>b[1]-a[1]);return vals[0][0];}
function aiManageDistance(c){
  const lead=leaderHunter(); if(!lead)return; ensureHunterAI(lead);
  const weapons=livingTeam().map(h=>aiPickWeapon(h,c)); const votes={near:0,mid:0,far:0}; weapons.forEach(w=>votes[preferredDistanceForWeapon(w)]++);
  let desired=Object.entries(votes).sort((a,b)=>b[1]-a[1])[0][0];
  const dir=state.run.directive||'balanced'; if(dir==='aggressive'&&chance(.55))desired='near'; if(dir==='cautious'&&chance(.55))desired='far';
  if(lead.ai.intelligence<48&&chance(.35))desired=pick(['near','mid','far']);
  if(desired!==c.distance&&chance(clamp(lead.ai.intelligence/105,.45,.92))){const order=['near','mid','far'];const i=order.indexOf(c.distance),j=order.indexOf(desired);c.distance=order[i+(j>i?1:-1)];log(`${lead.name} ordnet Distanzwechsel auf ${distanceLabel(c.distance)} an.`,'log-gold');}
}
function aiUseExtra(h,x){
  if(x.currentUses!==99)x.currentUses--;
  if(x.heal){const heal=Math.round(x.heal*(1+hunterMods(h).heal));h.hp=Math.min(h.maxHp,h.hp+heal);log(`${h.name} entscheidet sich für ${x.name}: +${heal} HP.`,'log-good');}
  if(x.cleanse&&h.status)h.status[x.cleanse]=0;
  if(x.stamina)h.stamina=Math.min(h.maxStamina,h.stamina+x.stamina);
}
function stageActor(id){return document.querySelector(`[data-stage-actor="${CSS.escape(String(id))}"]`);}
function stageEnemy(id){return document.querySelector(`[data-stage-enemy="${CSS.escape(String(id))}"]`);}
function setAiAction(text,sub=''){const el=document.querySelector('#aiActionText');if(el)el.innerHTML=`<b>${text}</b>${sub?`<span>${sub}</span>`:''}`;}
function waitAI(ms){const speed=state.run?.combatSpeed||1;const motion=state.settings.motion!==false;return new Promise(res=>setTimeout(res,motion?Math.max(90,ms/speed):35));}
async function pulseNode(node,cls,ms=360){if(!node)return;node.classList.add(cls);await waitAI(ms);node.classList.remove(cls);}
function syncBattleHUD(){
  const c=state.run?.combat;if(!c)return;
  livingTeam().forEach(h=>{const el=stageActor(h.id);if(!el)return;el.querySelector('.actor-hp i')?.setAttribute('style',`width:${clamp(h.hp/h.maxHp*100,0,100)}%`);const st=el.querySelector('[data-stamina]');if(st)st.textContent=`${h.stamina}/${h.maxStamina}`;});
  c.enemies.forEach(e=>{const el=stageEnemy(e.id);if(!el)return;el.classList.toggle('dead',e.hp<=0);el.querySelector('.actor-hp i')?.setAttribute('style',`width:${clamp(e.hp/e.maxHp*100,0,100)}%`);});
}
function enemyArtPlayer(e){return enemyArt(e);}
function renderCombat(){
  const c=state.run?.combat;if(!c)return; const r=state.run; const env=envById(r.envId); const directive=r.directive||'balanced';
  $('#combatPanel').innerHTML=`<div class="combat-sim-shell ${state.settings.motion===false?'no-motion':''}">
    <div class="combat-sim-head"><div><p class="eyebrow">AUTONOME KAMPFSIMULATION · ${c.type.toUpperCase()}</p><h2>${c.title}</h2><p>Du gibst die taktische Richtung vor. Waffenwahl, Zielwahl, Heilung und Schüsse entscheidet jeder Hunter selbst.</p></div><div class="sim-round">KAMPFRUNDE <b>${c.turn}</b><span>${distanceLabel(c.distance)}distanz</span></div></div>
    <div class="directive-bar"><span>Deine Vorgabe</span>${Object.entries(AI_DIRECTIVES).map(([id,d])=>`<button data-directive="${id}" class="directive ${directive===id?'active':''}">${d.icon} ${d.name}</button>`).join('')}<span class="speed-label">Tempo</span>${[1,2,4].map(n=>`<button data-combatspeed="${n}" class="speed ${r.combatSpeed===n?'active':''}">${n}×</button>`).join('')}</div>
    <div class="battle-theatre" style="--battle-bg:url('${env.art}')">
      <div class="battle-fog"></div><div class="battle-ground"></div>
      <div class="actor-lane team-lane">${livingTeam().map((h,i)=>{ensureHunterAI(h);const w=c.weaponState?.[h.id]||aiPickWeapon(h,c);return `<article class="battle-actor hunter-actor pos-${i}" data-stage-actor="${h.id}"><img src="${h.portrait}" alt=""><div class="actor-info"><strong>${h.name}</strong><small>${h.ai.profile} · KI ${aiGrade(h.ai.intelligence)}</small><em data-weapon>${w?.name||'Fäuste'}</em><div class="actor-hp"><i style="width:${clamp(h.hp/h.maxHp*100,0,100)}%"></i></div><span>🫁 <b data-stamina>${h.stamina}/${h.maxStamina}</b></span></div></article>`;}).join('')}</div>
      <div class="battle-center-mark"><span>${distanceLabel(c.distance)}</span><i></i></div>
      <div class="actor-lane enemy-lane">${c.enemies.filter(e=>e.hp>0).map((e,i)=>`<article class="battle-actor enemy-actor pos-${i}" data-stage-enemy="${e.id}"><img src="${enemyArtPlayer(e)}" alt=""><div class="actor-info"><strong>${e.name}</strong><small>${e.kind==='boss'?'TARGET':e.kind==='hunter'?'FEINDLICHER HUNTER':'KREATUR'}</small><div class="actor-hp"><i style="width:${clamp(e.hp/e.maxHp*100,0,100)}%"></i></div><span>${Math.max(0,e.hp)}/${e.maxHp} HP</span></div></article>`).join('')}</div>
      <div id="aiActionText" class="ai-action-text"><b>Hunter analysieren die Lage …</b><span>Trefferchance, Ausdauer, Glück und Charakter-KI werden ausgewertet.</span></div>
    </div>
    <div class="ai-roster-strip">${livingTeam().map(h=>`<div><img src="${h.portrait}" alt=""><span><b>${h.name}</b><small>${aiSummary(h)}</small></span><em>🎯 ${h.accuracy} · 🍀 ${h.luck} · 🫁 ${h.stamina}</em></div>`).join('')}</div>
  </div>`;
  scheduleAutoCombat(520);
}
function startCombat(enemies,title,type){
  const r=state.run; const pre=Math.max(...livingTeam().map(h=>hunterMods(h).preMonsterDamage||0),0); if(type==='monster'&&pre) enemies.forEach(e=>{e.hp=Math.max(1,e.hp-pre);});
  playerCombatToken++; clearTimeout(playerCombatTimer); playerCombatBusy=false;
  r.combat={id:uid(),title,type,enemies,distance:pick(['near','mid','far']),turn:1,weaponState:{},token:playerCombatToken};
  livingTeam().forEach(h=>{ensureHunterAI(h);r.combat.weaponState[h.id]=aiPickWeapon(h,r.combat);});
  log(`${title}: Begegnung auf ${distanceLabel(r.combat.distance)} Distanz. Deine Hunter übernehmen die Ausführung.`,'log-bad'); playSound('battle'); renderRun();
}
function scheduleAutoCombat(delay=450){
  clearTimeout(playerCombatTimer); const c=state.run?.combat;if(!c||playerCombatBusy)return; const token=c.token;
  playerCombatTimer=setTimeout(()=>{if(state.run?.combat?.token===token)runAutoCombatRound();},Math.max(80,delay/(state.run?.combatSpeed||1)));
}
async function runAutoCombatRound(){
  const r=state.run,c=r?.combat;if(!c||playerCombatBusy)return; playerCombatBusy=true; const token=c.token;
  aiManageDistance(c); syncBattleHUD();
  for(const h of [...livingTeam()]){
    if(!state.run?.combat||state.run.combat.token!==token)break;
    const target=aiTarget(h,c);if(!target)break;const nextW=aiPickWeapon(h,c);const prev=c.weaponState[h.id];
    if(!prev||prev.name!==nextW.name){c.weaponState[h.id]=nextW;setAiAction(`${h.name} wechselt auf ${nextW.name}`,`${h.ai.profile}: Distanz ${distanceLabel(c.distance)} wird neu bewertet.`);const a=stageActor(h.id);if(a){a.querySelector('[data-weapon]').textContent=nextW.name;await pulseNode(a,'weapon-switch',300);}log(`${h.name} wechselt selbstständig auf ${nextW.name}.`);}
    const w=c.weaponState[h.id]||nextW;const action=aiDecideAction(h,w,c);
    if(action.type==='heal'){setAiAction(`${h.name} benutzt ${action.extra.name}`,'Die KI priorisiert Überleben vor einem weiteren Schuss.');await pulseNode(stageActor(h.id),'heal-action',380);aiUseExtra(h,action.extra);syncBattleHUD();await waitAI(260);continue;}
    if(action.type==='recover'){const gain=Math.min(3,h.maxStamina-h.stamina);h.stamina+=gain;setAiAction(`${h.name} holt Luft`, `+${gain} Ausdauer – ${h.ai.profile} wartet auf einen besseren Moment.`);await pulseNode(stageActor(h.id),'recover-action',420);log(`${h.name} regeneriert ${gain} Ausdauer.`,'log-good');syncBattleHUD();continue;}
    const dir=AI_DIRECTIVES[r.directive||'balanced'];let p=attackChance(h,w,c.distance)+(dir.accuracy||0)-(h.stamina<=0?.12:0);let staminaCost=1;let dmgAdd=dir.damage||0;
    if(action.type==='aim'){p+=.10;staminaCost=2;dmgAdd+=1;} if(action.type==='rush'){p-=.05;staminaCost=2;dmgAdd+=1;c.distance='near';}
    p=clamp(p,.35,.95);h.stamina=Math.max(0,h.stamina-staminaCost);
    const badDecision=h.ai.intelligence<54&&chance(.22); if(badDecision)p=clamp(p-.10,.35,.95);
    setAiAction(`${h.name}: ${action.type==='aim'?'gezielter Schuss':action.type==='rush'?'aggressiver Rush':'Angriff'} mit ${w.name}`,`Trefferchance ${Math.round(p*100)}% · Ausdauer ${h.stamina}/${h.maxStamina}${badDecision?' · schlechte KI-Entscheidung':''}`);
    const a=stageActor(h.id),t=stageEnemy(target.id);await pulseNode(a,action.type==='rush'?'rush-action':'fire-action',340);
    if(chance(p)){
      let dmg=calcDamage(h,w,c.distance)+dmgAdd;dmg=Math.max(1,dmg-(target.defense||0));target.hp=Math.max(0,target.hp-dmg);if(target.hp<=0)h.kills=(h.kills||0)+1;
      await pulseNode(t,'hit-action',320);log(`${h.name} trifft ${target.name} mit ${w.name}: ${dmg} Schaden.`,'log-good');playSound('shot');
    }else{await pulseNode(t,'miss-action',220);log(`${h.name} verfehlt ${target.name}.`);}
    r.attention=clamp(r.attention+Math.max(0,(w.noise||3)-3),0,100);syncBattleHUD();await waitAI(170);
  }
  if(!state.run?.combat||state.run.combat.token!==token){playerCombatBusy=false;return;}
  for(const e of c.enemies.filter(e=>e.hp>0)){
    const targets=livingTeam();if(!targets.length)break;const h=pick(targets);const en=stageEnemy(e.id),hn=stageActor(h.id);setAiAction(`${e.name} greift ${h.name} an`,'Der Gegner reagiert auf eure Position.');await pulseNode(en,'enemy-attack',300);
    const dodge=clamp(.12+(h.speed-5)*.02+(h.luck||0)*.004,.05,.34);
    if(chance(dodge)){await pulseNode(hn,'dodge-action',260);log(`${h.name} weicht ${e.name} aus.`);}
    else{let dmg=rnd(Math.max(1,e.attack-1),e.attack+1);const mods=hunterMods(h);if(e.kind==='monster'||e.kind==='boss')dmg=Math.round(dmg*(1-(mods.meleeResist||0)));h.hp=Math.max(0,h.hp-dmg);await pulseNode(hn,'hit-action',320);log(`${e.name} trifft ${h.name}: ${dmg} Schaden.`,'log-bad');if(e.status&&chance(.35))applyStatus(h,e.status);}
    syncBattleHUD();await waitAI(170);
  }
  livingTeam().forEach(h=>tickStatuses(h,true));c.turn++; syncBattleHUD();
  playerCombatBusy=false;
  if(livingTeam().length===0)return failRun('Das Team wurde ausgelöscht.');
  if(!c.enemies.some(e=>e.hp>0))return finishCombat();
  renderRun(); scheduleAutoCombat(620);
}
resolveCombatTurn=function(){scheduleAutoCombat(10);};

// Events
window.addEventListener('click',e=>{
  const nav=e.target.closest('[data-nav]'); if(nav){navigate(nav.dataset.nav,{},true);return;}
  const sm=e.target.closest('[data-shop-mode]'); if(sm){shopMode=sm.dataset.shopMode; renderShop(); return;}
  const spv=e.target.closest('[data-shop-prev]'); if(spv){shopIndex=Math.max(0,shopIndex-1); renderShop(); return;}
  const snx=e.target.closest('[data-shop-next]'); if(snx){shopIndex=shopIndex+1; renderShop(); return;}
  const sj=e.target.closest('[data-shop-jump]'); if(sj){shopIndex=+sj.dataset.shopJump; renderShop(); return;}
  const sbw=e.target.closest('[data-shop-buyweapon]'); if(sbw){buyShopWeapon(sbw.dataset.shopBuyweapon,false); return;}
  const sbs=e.target.closest('[data-shop-buystash]'); if(sbs){buyShopWeapon(sbs.dataset.shopBuystash,true); return;}
  const sx=e.target.closest('[data-shop-extra-stash]'); if(sx){buyShopExtraToStash(+sx.dataset.shopExtraStash); return;}
  const ssw=e.target.closest('[data-shop-sellw]'); if(ssw){sellStashWeapon(+ssw.dataset.shopSellw); return;}
  const sse=e.target.closest('[data-shop-selle]'); if(sse){sellStashExtra(+sse.dataset.shopSelle); return;}
  const sew=e.target.closest('[data-shop-equip-stash-w]'); if(sew){equipStashWeapon(+sew.dataset.shopEquipStashW); return;}
  const see=e.target.closest('[data-shop-equip-stash-e]'); if(see){equipStashExtra(+see.dataset.shopEquipStashE); return;}
  const home=e.target.closest('[data-home]'); if(home){navStack=[];navigate('hq',{},false);return;}
  const tab=e.target.closest('[data-tab]'); if(tab){switchTab(tab.dataset.tab);return;}
  const open=e.target.closest('[data-openhunter]'); if(open){ const id=open.dataset.openhunter; if(state.roster.some(h=>h.id===id)){state.activeHunterId=id;navContext.hunterId=id;navigate('hunterDetail',{hunterId:id},true);} else previewRecruit(id); return; }
  const lh=e.target.closest('[data-loadouthunter]'); if(lh){state.activeHunterId=lh.dataset.loadouthunter;navContext.hunterId=lh.dataset.loadouthunter;navigate('loadout',{hunterId:lh.dataset.loadouthunter},true);return;}
  const oa=e.target.closest('[data-openarmory]'); if(oa){armoryMode='weapons';weaponPage=1;navContext.armoryTarget=oa.dataset.openarmory;navigate('armory',{armoryTarget:oa.dataset.openarmory},true);return;}
  const oe=e.target.closest('[data-openextras]'); if(oe){armoryMode='extras';navContext.armoryTarget='all';navigate('armory',{armoryTarget:'all'},true);return;}
  const rec=e.target.closest('[data-recruit]'); if(rec){closeModal();recruit(rec.dataset.recruit);return;}
  const tm=e.target.closest('[data-team]'); if(tm){toggleTeam(tm.dataset.team);return;}
  const ac=e.target.closest('[data-activate]'); if(ac){activateHunter(ac.dataset.activate);return;}
  const dis=e.target.closest('[data-dismiss]'); if(dis){const id=dis.dataset.dismiss;sellOrDismiss(id);if(!state.roster.some(h=>h.id===id)&&['hunterDetail','loadout'].includes(currentView))goBack();return;}
  const uw=e.target.closest('[data-unequipweapon]'); if(uw){unequipWeapon(uw.dataset.unequipweapon);return;}
  const ue2=e.target.closest('[data-unequipextra]'); if(ue2){unequipExtra(+ue2.dataset.unequipextra);return;}
  const sw=e.target.closest('[data-equipstashweapon]'); if(sw){equipStashWeapon(+sw.dataset.equipstashweapon);return;}
  const se=e.target.closest('[data-equipstashextra]'); if(se){equipStashExtra(+se.dataset.equipstashextra);return;}
  const sp=e.target.closest('[data-showperks]'); if(sp){showHunterPerks();return;}
  const ot=e.target.closest('[data-opentraits]'); if(ot){state.activeHunterId=ot.dataset.opentraits;navContext.hunterId=ot.dataset.opentraits;navigate('traits',{hunterId:ot.dataset.opentraits},true);return;}
  const bt=e.target.closest('[data-buytrait]'); if(bt){learnTrait(+bt.dataset.buytrait);return;}
  const uf=e.target.closest('[data-usefield]'); if(uf){useFieldExtra(+uf.dataset.usefield);return;}
  const bw=e.target.closest('[data-buyweapon]'); if(bw){buyWeapon(bw.dataset.buyweapon);return;}
  const bx=e.target.closest('[data-buyextra]'); if(bx){buyExtra(+bx.dataset.buyextra);return;}
  const pg=e.target.closest('[data-page]'); if(pg){weaponPage=+pg.dataset.page;renderArmory();return;}
  const ch=e.target.closest('[data-choice]'); if(ch){chooseEvent(ch.dataset.choice);return;}
  const cp=e.target.closest('[data-perkpick]'); if(cp){selectPerk(+cp.dataset.perkpick);return;}
  const ue=e.target.closest('[data-useextra]'); if(ue){useCombatExtra(+ue.dataset.useextra);return;}
  const cx=e.target.closest('[data-codex]'); if(cx){codexMode=cx.dataset.codex;$$('[data-codex]').forEach(x=>x.classList.toggle('active',x===cx));renderCodex();return;}
  if(e.target.id==='combatAttack')resolveCombatTurn('attack'); if(e.target.id==='combatAim')resolveCombatTurn('aim'); if(e.target.id==='combatRush')resolveCombatTurn('rush'); if(e.target.id==='combatDistance')changeDistance(); if(e.target.id==='combatExtra')showCombatExtras(); if(e.target.id==='combatFlee')fleeCombat();
});
window.addEventListener('click',e=>{
  const d=e.target.closest('[data-directive]'); if(d&&state.run?.combat){state.run.directive=d.dataset.directive;log(`Taktische Vorgabe: ${AI_DIRECTIVES[state.run.directive].name}.`,'log-gold');renderCombat();return;}
  const sp=e.target.closest('[data-combatspeed]'); if(sp&&state.run?.combat){state.run.combatSpeed=clamp(+sp.dataset.combatspeed||1,1,4);renderCombat();return;}
});
$('#backBtn')?.addEventListener('click',goBack);
$('#quickSave')?.addEventListener('click',()=>saveState()); $('#resetBtn')?.addEventListener('click',resetGame); $('#rerollHunters')?.addEventListener('click',()=>rerollMarket(true)); $('#startRunBtn')?.addEventListener('click',startRun);
$('#weaponSearch')?.addEventListener('input',()=>{weaponPage=1;renderArmory();}); $('#weaponCategory')?.addEventListener('change',()=>{weaponPage=1;renderArmory();}); $('#weaponQuality')?.addEventListener('change',()=>{weaponPage=1;renderArmory();});
$('#shopSearch')?.addEventListener('input',()=>{shopIndex=0;renderShop();}); $('#shopCategory')?.addEventListener('change',()=>{shopIndex=0;renderShop();}); $('#shopSlot')?.addEventListener('change',renderShop);
$('#armoryWeaponsBtn')?.addEventListener('click',()=>{armoryMode='weapons';renderArmory();}); $('#armoryExtrasBtn')?.addEventListener('click',()=>{armoryMode='extras';renderArmory();});
$('#modalClose')?.addEventListener('click',closeModal); $('#modal')?.addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
$('#runInventoryBtn')?.addEventListener('click',showRunInventory); $('#abandonRunBtn')?.addEventListener('click',abandonRun);
$('#rosterSearch')?.addEventListener('input',renderRoster); $('#rosterTier')?.addEventListener('change',renderRoster);
$('#traitSearch')?.addEventListener('input',renderTraits); $('#traitRarity')?.addEventListener('change',renderTraits);
$('#autosaveToggle')?.addEventListener('change',e=>{state.settings.autosave=e.target.checked;maybeSave();renderSettings();});
$('#soundToggle')?.addEventListener('change',e=>{state.settings.sound=e.target.checked;maybeSave();renderSettings();});
$('#motionToggle')?.addEventListener('change',e=>{state.settings.motion=e.target.checked;maybeSave();renderSettings();});
$('#exportSaveBtn')?.addEventListener('click',exportSave); $('#importSaveBtn')?.addEventListener('click',()=>$('#importSaveFile')?.click()); $('#importSaveFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)importSaveFile(f);e.target.value='';});

if(!market.length)rerollMarket(false); ensureEmergencyRecruit(); renderAll(); saveState(true);
const bootView=new URLSearchParams(location.search).get('view'); navigate(bootView&&document.querySelector(`#screen-${bootView}`)?bootView:'hq',{},false);
window.RPG_HUNT_DEBUG={get state(){return state;},navigate,startRun,renderAll,chooseEvent,resolveCombatTurn,completeRun,failRun,ensureContract};

})();
