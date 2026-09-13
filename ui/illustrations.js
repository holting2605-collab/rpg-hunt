/* Asset resolution only. Never changes gameplay records, RNG or save ownership. */
(() => {
  'use strict';
  const catalog=window.RPG_HUNT_ART_CATALOG||{};
  const own=(map,key)=>map&&Object.hasOwn(map,key)?map[key]:null;
  const item=(kind,name,skin='standard_darkwood')=>own(own(catalog[kind],name),skin);
  const trait=p=>own(catalog.traits,p?.id);
  const traitName=p=>p?.id===66?'Adlerauge · Crack Shot':p?.name||'';
  function hunter(h){
    if(!h)return null;
    const list=own(catalog.hunters,h.tier);if(!list?.length)return h.portrait;
    let n=2166136261;for(const ch of String(h.name||h.id||''))n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;
    n^=n>>>16;n=Math.imul(n,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);n=(n^(n>>>16))>>>0;
    return list[n%list.length];
  }
  const menu=id=>own(catalog.menus,({recruit:'recruitment',armory:'arsenal'})[id]||id);
  const V=window.RPG_HUNT_V3;
  if(V){
    for(const env of V.environments)env.art=own(catalog.environments,env.id)||env.art;
    for(const name of Object.keys(V.monsterArt))V.monsterArt[name]=own(catalog.monsters,name)||V.monsterArt[name];
    for(const name of Object.keys(V.bossArt))V.bossArt[name]=own(catalog.bosses,name)||V.bossArt[name];
    // makeHunter uses the existing eight-slot, two-per-tier portrait pool.
    if(['Standard','Verbessert','Elite','Meister'].every(t=>catalog.hunters?.[t]?.length>=2))V.hunterPortraits=['Standard','Verbessert','Elite','Meister'].flatMap(t=>catalog.hunters[t].slice(0,2));
    for(const key of Object.keys(V.menuArt)){const route=({weaponCarousel:'arsenal',extrasWorkbench:'gear',merchant:'stash',roster:'hunters',missionteam:'mission'})[key]||key;V.menuArt[key]=menu(route)||V.menuArt[key];}
    const representatives={rifle:'Frontier 73C',sniper:'Sparks Sniper',shotgun:'Rival 78',pistol:'Officer',bow:'Hunting Bow',crossbow:'Crossbow',melee:'Railroad Hammer',special:'Bomb Launcher'};
    for(const [key,name]of Object.entries(representatives))V.weaponArt[key]=item('weapons',name)||V.weaponArt[key];
    for(const [key,name]of Object.entries({med:'First Aid Kit',bomb:'Dynamite Bundle',trap:'Concertina Trip Mine',beetle:'Stalker Beetle',knife:'Knife',shot:'Vitality Shot'}))V.extraArt[key]=item('extras',name)||V.extraArt[key];
  }
  window.RPG_HUNT_ART={catalog,item,trait,traitName,hunter,menu};
})();
