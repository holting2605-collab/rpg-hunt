const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(process.env.RPG_HUNT_TEST_OUTPUT||'dist/art-overhaul-audit');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await p.goto(process.env.RPG_HUNT_URL||'http://127.0.0.1:8000/',{waitUntil:'networkidle'});
 const before=await p.evaluate(()=>JSON.stringify({money:window.RPG_HUNT_DEBUG.state.money,roster:window.RPG_HUNT_DEBUG.state.roster}));
 await p.locator('#screen-hq .menu-tile[data-nav="armory"]').click();
 for(const name of ['Frontier 73C Silencer','Infantry 73L Sniper','Infantry 73L Bayonet']){
  await p.locator('#weaponSearch').fill(name);const paths=[];
  for(let i=0;i<4;i++){const image=p.locator('#weaponList .v6-weapon-display>img');await image.evaluate(im=>im.decode());const src=await image.getAttribute('src');assert.ok(src.includes('assets/overhaul/weapons/'),src);paths.push(src);await p.locator('#weaponList .v6-weapon-stage').screenshot({path:path.join(out,name.replaceAll(' ','_')+'-'+i+'.png'),animations:'disabled'});await p.locator('#weaponList [data-v6-skin="1"]').click();}
  assert.equal(new Set(paths).size,4,name);console.log('PASS: exact model + four skins',name);
 }
 await p.locator('.brand').click();await p.locator('#screen-hq .menu-tile[data-nav="traits"]').click();await p.locator('#traitSearch').fill('Adlerauge');assert.equal(await p.locator('#traitBoard .trait-card').count(),1);
 assert.match(await p.locator('#traitBoard').innerText(),/Präzision \+6/);await p.locator('#traitBoard .trait-art').evaluate(im=>im.decode());await p.screenshot({path:path.join(out,'adlerauge.png'),fullPage:true,animations:'disabled'});
 const after=await p.evaluate(()=>JSON.stringify({money:window.RPG_HUNT_DEBUG.state.money,roster:window.RPG_HUNT_DEBUG.state.roster}));assert.equal(after,before);assert.deepEqual(errors,[]);console.log('PASS: Adlerauge searchable, own icon, original +6 effect, no state/rule changes or browser errors');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
