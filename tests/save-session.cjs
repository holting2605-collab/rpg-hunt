// Controlled regression: import a healthy save while an AI animation is in flight.
// The encounter uses the unchanged monster generator; only its start is forced.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.RPG_HUNT_URL||'http://127.0.0.1:8000/');
  const saved=await page.evaluate(()=>JSON.parse(JSON.stringify(window.RPG_HUNT_DEBUG.state)));
  await page.locator('#screen-hq .menu-tile[data-nav="mission"]').click();
  await page.locator('#startRunBtn').click();
  await page.evaluate(()=>window.RPG_HUNT_DEBUG.chooseEvent('monster'));
  await page.waitForFunction(()=>{const text=document.querySelector('#aiActionText')?.textContent;return text&&!text.includes('analysieren die Lage')});
  await page.locator('#importSaveFile').setInputFiles({name:'pre-run.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
  await page.waitForFunction(()=>document.querySelector('#toast').textContent==='Savegame importiert.');
  await page.waitForTimeout(1600);
  const restored=await page.evaluate(()=>JSON.parse(JSON.stringify(window.RPG_HUNT_DEBUG.state)));
  assert.equal(restored.run,null);assert.equal(restored.money,saved.money);assert.deepEqual(restored.roster,saved.roster);assert.deepEqual(errors,[]);
  console.log('PASS: importing during an AI action cancels the previous combat without changing the restored hunters');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
