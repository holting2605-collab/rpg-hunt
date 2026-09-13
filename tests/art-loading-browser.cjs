/* Decode every completed artwork in a real browser, without touching player saves. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const jobs=require('../tools/art-overhaul/jobs.json');
const ready=jobs.filter(j=>fs.existsSync(j.target));
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.context().setOffline(true);
  await page.goto(pathToFileURL(path.resolve('index.html')).href);
  for(let i=0;i<ready.length;i+=4){
   const result=await page.evaluate(async entries=>Promise.all(entries.map(async j=>{
    const im=new Image();im.src=j.target;
    try{await im.decode();return {id:j.id,width:im.naturalWidth,height:im.naturalHeight};}
    catch(e){return {id:j.id,error:String(e)};}
    finally{im.removeAttribute('src');}
   })),ready.slice(i,i+4));
   for(const r of result){assert.equal(r.error,undefined,r.id);assert.ok(r.width>=512&&r.height>=512,r.id);}
  }
  assert.deepEqual(errors,[]);
  const report={decoded:ready.length,planned:jobs.length,pending:jobs.filter(j=>!fs.existsSync(j.target)).map(j=>j.id),errors};
  fs.mkdirSync('dist/art-overhaul-audit',{recursive:true});
  fs.writeFileSync('dist/art-overhaul-audit/image-loading.json',JSON.stringify(report,null,2));
  console.log(`PASS: ${ready.length} available images decode offline; ${report.pending.length} artwork jobs still pending`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
