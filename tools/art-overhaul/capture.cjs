/* Clean captures using a separate browser profile; no access to the player's save. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve('dist/screenshots-v0.6');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await p.goto(process.env.RPG_HUNT_URL||'http://127.0.0.1:8000/',{waitUntil:'networkidle'});
 async function shot(name){
  await p.locator('.screen.active img').evaluateAll(async ns=>{for(const im of ns)im.loading='eager';await Promise.all(ns.map(im=>im.decode()));});
  await p.addStyleTag({content:'#toast{visibility:hidden!important}'});
  await p.screenshot({path:path.join(out,name+'.png'),fullPage:true,animations:'disabled'});
 }
 await shot('01-hub');
 const routes=['recruit','roster','gear','armory','shop','stash','traits','mission','codex','stats','settings'];
 for(const [i,id]of routes.entries()){
  await p.locator('.brand').click();
  if(id==='roster'){await p.locator('#screen-hq .menu-tile[data-nav="hunters"]').click();await p.locator('#screen-hunters [data-nav="roster"]').click();}
  else await p.locator(`#screen-hq .menu-tile[data-nav="${id}"]`).click();
  await shot(String(i+2).padStart(2,'0')+'-'+id);
 }
 console.log('Captured '+(routes.length+1)+' menus: '+out);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
