/* Cosmetic-only catalog. No combat, price or item ownership logic lives here. */
(() => {
  'use strict';
  const styles = [
    {id:'standard_darkwood', name:'Dunkles Holz', tier:'Standard', description:'Abgenutztes Holz und schlichter Stahl. Ein verlässlicher Begleiter.'},
    {id:'bayou_wrap', name:'Bayou-Wanderer', tier:'Jäger', description:'Lederwicklungen, verwitterter Stahl und die Spuren langer Nächte im Moor.'},
    {id:'elite_brass', name:'Blackwater-Gilde', tier:'Elite', description:'Polierter Stahl, dunkles Edelholz und fein gearbeitete Messingakzente.'},
    {id:'bone_ritual', name:'Erbe der Verdammten', tier:'Meister', description:'Graviertes Gold und alte Knochenornamente. Ein stiller Schwur gegen die Dunkelheit.'}
  ];
  const groups=['revolver','pistol','rifle','shotgun','sniper','crossbow','knife','axe'];
  function group(w) {
    if(!w)return null;
    const n=w.name||'';
    if(/knife|knives/i.test(n))return 'knife';
    if(/^(Combat Axe|Throwing Axes)$/.test(n))return 'axe';
    if(/crossbow/i.test(n))return 'crossbow';
    if(w.category==='Shotgun')return 'shotgun';
    if(/^(Bornheim|Dolch)/.test(n))return 'pistol';
    if(/^(Uppercut|Pax|Scottfield|Conversion|New Army|Nagant M1895|Officer)(?: |$)/.test(n)&&!/Carbine/.test(n))return 'revolver';
    if(/Sniper|Marksman|Sharpeye/.test(n))return 'sniper';
    if(/^(Ranger 73|Frontier 73C|Infantry 73L)(?: |$)/.test(n))return 'rifle';
    return null;
  }
  const available=w=>group(w)?styles:[styles[0]];
  function sanitize(w,value) {
    const ids=available(w).map(s=>s.id), raw=value&&typeof value==='object'?value:{};
    const owned=Array.isArray(raw.ownedSkins)?ids.filter(id=>raw.ownedSkins.includes(id)):ids;
    if(!owned.includes(ids[0]))owned.unshift(ids[0]);
    return {defaultSkin:ids[0],ownedSkins:owned,selectedSkin:owned.includes(raw.selectedSkin)?raw.selectedSkin:ids[0]};
  }
  function get(state,w) {
    const map=state?.weaponSkins;
    return sanitize(w,map&&Object.hasOwn(map,w?.name)?map[w.name]:null);
  }
  function normalize(state) {
    const items=[...window.GAME_DATA.WEAPONS,...window.GAME_DATA.EXTRAS];
    state.weaponSkins=Object.fromEntries(items.filter(group).map(w=>[w.name,get(state,w)]));
    return state;
  }
  function selected(state,w){const entry=get(state,w);return styles.find(s=>s.id===entry.selectedSkin)||styles[0];}
  function exactArt(w,skin){const a=window.RPG_HUNT_ART;const path=a?.item('weapons',w?.name,skin)||a?.item('extras',w?.name,skin);return a?.catalog.reviewPending?.includes(path)?null:path;}
  function previewAvailable(state,w){return !!exactArt(w,get(state,w).selectedSkin);}
  function art(state,w){const skin=get(state,w).selectedSkin;const exact=exactArt(w,skin)||exactArt(w,'standard_darkwood');if(exact)return exact;const g=group(w);return g?`assets/weapons/skins/${g}_${skin}.png`:null;}
  function cycle(state,w,step) {
    if(!group(w))return false;
    normalize(state);
    const entry=state.weaponSkins[w.name],ids=entry.ownedSkins;
    entry.selectedSkin=ids[(ids.indexOf(entry.selectedSkin)+(step<0?-1:1)+ids.length)%ids.length];
    return true;
  }
  window.RPG_HUNT_SKINS={styles,groups,group,available,get,normalize,selected,art,cycle,previewAvailable};
})();
