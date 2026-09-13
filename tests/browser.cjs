/* Optional real-browser integration test. No browser dependency in the game build.
 * PLAYWRIGHT_MODULE can point to an existing Playwright installation.
 * RPG_HUNT_URL defaults to a separately started local server.
 */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const out=process.env.RPG_HUNT_TEST_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'rpg-hunt-'));
fs.mkdirSync(out,{recursive:true});
const report={steps:[],errors:[],httpErrors:[],screenshots:[],seed:Number(process.env.RPG_HUNT_SEED||12)};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 await context.addInitScript(seed=>{Date.now=()=>1789041600000;let v=seed;Math.random=()=>{v=(v*1664525+1013904223)>>>0;return v/4294967296;};},report.seed);
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.stack));
 page.on('response',r=>{if(r.status()>=400)report.httpErrors.push(r.url())});
 const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(window.RPG_HUNT_DEBUG.state)));
 const pass=t=>{report.steps.push(t);console.log('PASS',t)};
 const screen=async name=>assert.ok(await page.locator('#screen-'+name).evaluate(n=>n.classList.contains('active')),name+' active');
 const home=async()=>{await page.locator('.brand').click();await screen('hq')};
 const nav=async name=>{await home();if(name==='roster'){await page.locator('#screen-hq [data-nav="roster"]').first().click();}else await page.locator(`#screen-hq .menu-tile[data-nav="${name}"]`).click();await screen(name)};
 const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});report.screenshots.push(name+'.png')};
 const countGear=s=>s.stashWeapons.length+s.stashExtras.length+s.roster.reduce((n,h)=>n+Number(!!h.primary)+Number(!!h.sidearm)+h.extras.length,0);
 try{
  await page.goto(process.env.RPG_HUNT_URL||'http://127.0.0.1:8000/',{waitUntil:'networkidle'});
  await screen('hq');assert.equal((await state()).money,5000);assert.equal(await page.locator('#screen-hq .menu-tile').count(),11);await shot('hub');pass('Neues Spiel und elf Hub-Bereiche');
  await nav('settings');await page.locator('#soundToggle').uncheck();await page.locator('#motionToggle').uncheck();
  await nav('recruit');await shot('recruitment');assert.equal(await page.locator('#recruitMarket .v6-hunter').count(),4);
  let before=await state();const recruit=page.locator('#recruitMarket .tier-Verbessert [data-recruit]').first();await recruit.click();await screen('hunterDetail');let after=await state();assert.equal(after.roster.length,before.roster.length+1);assert.ok(after.money<before.money);const recruitId=after.activeHunterId;pass('Rekrutierung: Geld abgezogen, Hunter übernommen');
  await shot('hunter');await page.locator('#hunterDetail [data-loadouthunter]').first().click();await screen('loadout');await shot('loadout');
  await page.locator('.v6-slot [data-openarmory="primary"]').last().click();await screen('armory');
  await page.locator('#weaponSort').selectOption('price');await page.locator('#weaponSearch').fill('Frontier 73C');
  await page.locator('#weaponList [data-buyweapon]').click();after=await state();assert.ok(after.roster.find(h=>h.id===recruitId).primary);pass('Hunter bewaffnet');
  await page.locator('#weaponSearch').fill('');let first=await page.locator('.screen.active .v6-weapon-data h2').innerText();await page.locator('#weaponList [data-v6-weapon="1"]').click();assert.notEqual(await page.locator('.screen.active .v6-weapon-data h2').innerText(),first);await shot('arsenal');pass('Waffenkarussell und Filter');
  await page.locator('#weaponSearch').fill('Romero 77');before=await state();const old=before.roster.find(h=>h.id===recruitId).primary.name;await page.locator('#weaponList [data-buyweapon]').click();after=await state();assert.ok(after.stashWeapons.some(w=>w.name===old));assert.equal(countGear(after),countGear(before)+1);pass('Waffenwechsel erhält alte Waffe im Lager');
  await page.keyboard.press('Escape');await screen('loadout');await page.keyboard.press('Escape');await screen('hunterDetail');pass('ESC geht jeweils eine Ebene zurück');
  await nav('shop');await page.locator('#shopSearch').fill('Nagant M1895');before=await state();const price=await page.locator('.screen.active .v6-weapon-data .price').innerText();await page.locator('[data-shop-buystash]').click();after=await state();assert.equal(countGear(after),countGear(before)+1);assert.ok(after.money<before.money);await shot('shop');pass('Händlerkauf landet im Lager');
  await nav('stash');before=await state();await page.locator('#screen-stash [data-equipstashweapon]').first().click();after=await state();assert.equal(after.money,before.money);assert.equal(countGear(after),countGear(before));await shot('stash');pass('Kostenloses Ausrüsten aus Lager ohne Duplikation');
  if(await page.locator('[data-v6-sell]').count()){before=await state();await page.locator('[data-v6-sell]').first().click();await page.locator('[data-v6-cancel]').click();assert.deepEqual(await state(),before);await page.locator('[data-v6-sell]').first().click();await page.locator('[data-v6-confirm]').click();after=await state();assert.ok(after.money>before.money);assert.equal(countGear(after),countGear(before)-1);pass('Verkauf: Abbrechen und Bestätigen');}
  await nav('gear');await page.locator(`#gearHunterList [data-loadouthunter="${recruitId}"]`).click();await page.locator('[data-v6-extra="tool"]').first().click();await page.locator('#weaponSearch').fill('First Aid Kit');await page.locator('[data-v6-equip-extra]').click();after=await state();assert.ok(after.roster.find(h=>h.id===recruitId).extras.some(x=>x.name==='First Aid Kit'));pass('Tool ausgerüstet');
  await page.keyboard.press('Escape');await page.locator('[data-v6-extra="consumable"]').first().click();await page.locator('#weaponSearch').fill('Weak Vitality');if(await page.locator('[data-v6-equip-extra]').count()){await page.locator('[data-v6-equip-extra]').first().click();pass('Consumable ausgerüstet');}
  await nav('traits');const learn=page.locator('[data-buytrait]:not(:disabled)').first();if(await learn.count()){before=await state();await learn.click();after=await state();assert.equal(after.roster.find(h=>h.id===recruitId).perks.length,before.roster.find(h=>h.id===recruitId).perks.length+1);pass('Trait gelernt mit bestehenden Grenzen');}else throw Error('No learnable trait in fixture');
  await shot('traits');await nav('roster');let s=await state();for(const h of s.roster)if(!s.selectedTeam.includes(h.id))await page.locator(`#roster [data-team="${h.id}"]`).click();assert.equal((await state()).selectedTeam.length,3);pass('Drei Hunter im Team');
  await nav('mission');assert.equal(await page.locator('#missionTeam .v6-team-slot').count(),3);await shot('mission');
  await page.locator('#startRunBtn').click();assert.ok((await state()).run);pass('Mission gestartet');
  const routeLog=[];let sawCombat=false,sawBoss=false,sawBounty=false,sawResume=false;
  for(let n=0;n<110;n++){
   s=await state();if(!s.run)break; sawBounty||=s.run.bounty;
   if(await page.locator('#modal:not(.hidden) [data-perkpick]').count()){if(!report.pendingPerkReload){await page.reload({waitUntil:'networkidle'});assert.ok(await page.locator('#modal:not(.hidden) [data-perkpick]').count());report.pendingPerkReload=true;pass('Offene Trait-Belohnung übersteht Reload');}await page.locator('#modal [data-perkpick]').first().click();continue;}
   if(s.run.combat){
    sawCombat=true;sawBoss||=s.run.combat.type==='boss';
    if(!sawResume){await page.locator('#quickSave').click();await page.reload({waitUntil:'networkidle'});await screen('mission');sawResume=true;pass('Gespeicherter Kampf nach Reload wieder aufgenommen');}
    if(await page.locator('[data-combatspeed="4"]').count())await page.locator('[data-combatspeed="4"]').click();
    if(s.run.combat.type==='boss'&&!report.screenshots.includes('boss.png'))await shot('boss');
    if(!report.screenshots.includes('combat.png'))await shot('combat');
    const token=(await state()).run?.combat?.token,turn=(await state()).run?.combat?.turn;
    await page.waitForFunction(({token,turn})=>{const c=window.RPG_HUNT_DEBUG.state.run?.combat;return !c||c.token!==token||c.turn>turn},{token,turn},{timeout:30000});
    continue;
   }
   for(let heal=0;heal<12;heal++){
    const needed=s.roster.some(h=>s.run.teamIds.includes(h.id)&&h.hp>0&&h.hp<=h.maxHp-5&&h.extras.some(x=>x.heal&&x.currentUses>0));if(!needed)break;
    await page.locator('#runInventoryBtn').click();
    const k=await page.evaluate(()=>window._fieldItems.findIndex(it=>it.x.heal&&it.h.hp<=it.h.maxHp-5));
    if(k<0){await page.keyboard.press('Escape');break;}
    await page.locator('[data-usefield="'+k+'"]').click();s=await state();
   }
   sawBounty||=s.run.bounty;
   const types=await page.locator('#choiceGrid [data-choice]').evaluateAll(ns=>ns.map(n=>n.dataset.choice));assert.equal(types.length,3);
   const hp=s.roster.filter(h=>s.run.teamIds.includes(h.id)).reduce((n,h)=>n+h.hp/h.maxHp,0)/s.run.teamIds.length;
   const order=s.run.stage==='hunt'?(hp<.8?['supply','boss','clue','track','loot','monster','compound','unknown','noise','hunter','elite','trait']:['boss','clue','track','supply','loot','monster','compound','unknown','noise','hunter','elite','trait']):['banish','takeBounty','extract','supply','track','loot','monster','compound','hunter'];
   if(s.run.stage==='bounty'&&s.run.attention>45&&types.includes('track'))order.unshift('track');
   const type=order.find(t=>types.includes(t));assert.ok(type,'Available route');routeLog.push({round:s.run.round,type});await page.locator(`[data-choice="${type}"]`).click();
  }
  report.routeLog=routeLog;report.sawCombat=sawCombat;report.sawBoss=sawBoss;report.sawBounty=sawBounty;
  s=await state();report.lastRun=s.lastRun;assert.ok(sawCombat&&sawBoss&&sawBounty,'Combat, boss and bounty actually reached');assert.equal(s.run,null);assert.equal(s.lastRun.success,true);await shot('rewards');pass('Autonome KI: Kampf, Boss, Banish, Bounty, Extraction und Belohnung');
  await page.keyboard.press('Escape');await screen('hq');await nav('settings');const downloadPromise=page.waitForEvent('download');await page.locator('#exportSaveBtn').click();const dl=await downloadPromise;const savePath=path.join(out,'save-export.json');await dl.saveAs(savePath);const exported=JSON.parse(fs.readFileSync(savePath));assert.equal(exported.money,(await state()).money);await page.locator('#importSaveFile').setInputFiles(savePath);await page.waitForFunction(()=>document.querySelector('#toast').textContent==='Savegame importiert.');const saved=await state();await page.reload({waitUntil:'networkidle'});assert.deepEqual((await state()).roster,saved.roster);assert.equal((await state()).money,saved.money);pass('Save-Export, Import und Neustart');
  await nav('settings');const valid=await state();await page.locator('#importSaveFile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"money":-1}')});await page.waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Ungültiges'));assert.deepEqual(await state(),valid);pass('Ungültiger Import verändert den Spielstand nicht');
  await page.setViewportSize({width:390,height:844});for(const name of ['hq','recruit','gear','armory','stash','shop','mission','settings']){if(name==='hq')await home();else await nav(name);await page.waitForTimeout(60);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false,'Mobile overflow '+name);}await home();await shot('mobile-hub');pass('390px Smartphone: Menüs ohne horizontalen Überlauf');
  await page.waitForLoadState('networkidle');assert.deepEqual(await page.locator('img').evaluateAll(ns=>ns.filter(n=>n.complete&&!n.naturalWidth).map(n=>n.src)),[]);assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);const offline=await browser.newContext({offline:true});const local=await offline.newPage();const localErrors=[];local.on('pageerror',e=>localErrors.push(e.message));await local.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);assert.equal(await local.locator('#screen-hq .menu-tile').count(),11);assert.equal(await local.evaluate(()=>window.RPG_HUNT_DEBUG.state.money),5000);assert.deepEqual(localErrors,[]);await offline.close();pass('Dateistart funktioniert vollständig offline');report.passed=true;
 }catch(e){report.failure=e.stack;console.error(e);await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});process.exitCode=1;}
 finally{fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));await browser.close();console.log('Report:',out)}
})().catch(e=>{console.error(e);process.exitCode=1});
