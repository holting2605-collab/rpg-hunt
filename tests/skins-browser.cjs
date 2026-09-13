/* Isolated browser profile: never reads or changes the player's real save. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=process.env.RPG_HUNT_TEST_OUTPUT||path.resolve('dist/art-verification');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const report={checks:[],errors:[],httpErrors:[]};
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push(r.url());});
  const pass=s=>{report.checks.push(s);console.log('PASS',s)};
  const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(window.RPG_HUNT_DEBUG.state)));
  const nav=async id=>{await page.locator('.brand').click();await page.locator(`#screen-hq .menu-tile[data-nav="${id}"]`).click();};
  const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png'),fullPage:true,animations:'disabled'});};
  await page.goto(process.env.RPG_HUNT_URL||'http://127.0.0.1:8000/',{waitUntil:'networkidle'});
  const legacy=await state();delete legacy.weaponSkins;
  await nav('settings');await page.locator('#importSaveFile').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
  await page.waitForFunction(()=>document.querySelector('#toast').textContent==='Savegame importiert.');
  assert.deepEqual((await state()).roster,legacy.roster);assert.equal((await state()).money,legacy.money);pass('Alter Save ohne Skins migriert, Hunter und Geld unverändert');
  await page.locator('.brand').click();await shot('hub');
  const menuPaths=await page.locator('#screen-hq .menu-tile').evaluateAll(ns=>ns.map(n=>n.style.getPropertyValue('--art')));
  assert.equal(new Set(menuPaths).size,11);assert.ok(menuPaths.every(p=>p.includes('/menu/')));pass('Elf unterschiedliche lokale Menübilder im Hub');
  for(const id of ['mission','hunters','recruit','gear','shop','armory','stash','traits','codex','stats','settings']){
   await nav(id);
   const art=await page.locator(`#screen-${id} .screen-hero,#screen-${id} .shop-hero,#screen-${id} .v6-menu-banner`).first().evaluate(n=>getComputedStyle(n).backgroundImage);
   assert.ok(art.includes('/menu/'),id);await shot('menu-'+id);
  }pass('Alle elf Untermenüs zeigen ihr Artwork');
  await nav('armory');await page.locator('#weaponSearch').fill('Ranger 73');
  const w=await page.locator('.screen.active .v6-weapon-data h2').innerText();
  const first=await page.locator('#weaponList .v6-weapon-display>img').getAttribute('src'),initial=await state();
  const imageShown=(scope,skin)=>page.locator(scope+' img').evaluateAll((ns,src)=>ns.some(n=>n.getAttribute('src')===src),first.replace('standard_darkwood',skin));
  await page.locator('#weaponList [data-v6-skin="1"]').click();
  assert.match(await page.locator('#weaponList .v6-weapon-display>img').getAttribute('src'),/bayou_wrap/);
  assert.equal((await state()).money,initial.money);assert.deepEqual((await state()).roster,initial.roster);
  await page.locator('#weaponList [data-v6-skin="-1"]').click();assert.equal(await page.locator('#weaponList .v6-weapon-display>img').getAttribute('src'),first);
  await page.locator('#weaponList [data-v6-skin="-1"]').click();assert.match(await page.locator('#weaponList .v6-weapon-display>img').getAttribute('src'),/bone_ritual/);await shot('arsenal-legendary');pass('Skin-Pfeile, Vorschau, Namen, Umlauf und keine Spielwertänderungen');
  await nav('shop');await page.locator('#shopSearch').fill(w);assert.match(await page.locator('#shopContent .v6-weapon-display>img').getAttribute('src'),/bone_ritual/);
  await page.locator('#shopContent [data-shop-buystash]').click();await nav('stash');
  const card=page.locator('#screen-stash .v6-item').filter({has:page.getByRole('heading',{name:w,exact:true})});assert.match(await card.locator(':scope>img').getAttribute('src'),/bone_ritual/);
  await card.locator('[data-equipstashweapon]').click();
  await nav('mission');assert.ok(await imageShown('#missionTeam','bone_ritual'));await shot('mission-skinned');pass('Händler → Lager → kostenlos ausrüsten → Missionsbild mit gewähltem Skin');
  await page.locator('#missionTeam [data-openhunter]').first().click();await page.locator('#hunterDetail [data-loadouthunter]').first().click();
  assert.ok(await imageShown('#loadoutView .v6-slot','bone_ritual'));
  await page.locator(`#loadoutView [data-skin-weapon="${w}"][data-v6-skin="-1"]`).click();assert.ok(await imageShown('#loadoutView','elite_brass'));await shot('loadout-skinned');pass('Skin direkt im ausgerüsteten Hunter-Loadout wechseln');
  await nav('settings');const download=page.waitForEvent('download');await page.locator('#exportSaveBtn').click();const file=path.join(out,'skin-save.json');await(await download).saveAs(file);
  const exported=JSON.parse(fs.readFileSync(file));assert.equal(exported.weaponSkins[w].selectedSkin,'elite_brass');
  await page.locator('#importSaveFile').setInputFiles(file);await page.waitForFunction(()=>document.querySelector('#toast').textContent==='Savegame importiert.');
  await page.reload({waitUntil:'networkidle'});assert.equal((await state()).weaponSkins[w].selectedSkin,'elite_brass');pass('Skin in Export, Import und nach Browser-Neustart erhalten');
  await context.setOffline(true);await nav('armory');await page.locator('#weaponSearch').fill(w);assert.match(await page.locator('#weaponList .v6-weapon-display>img').getAttribute('src'),/elite_brass/);await context.setOffline(false);
  await page.setViewportSize({width:390,height:844});
  for(const id of ['armory','shop','stash','mission','traits','settings']){await nav(id);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id+' overflow');}
  await nav('armory');await page.locator('#weaponSearch').fill(w);await shot('mobile-arsenal');pass('Skin-UI offline bedienbar und mobil ohne Seitenüberlauf');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);report.passed=true;
 }finally{fs.writeFileSync(path.join(out,'skins-browser-report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
