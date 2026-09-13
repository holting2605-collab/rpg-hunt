/* Offline-capable contact sheets for a real visual audit; does not edit pixels. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const jobs=require('./jobs.json').filter(j=>fs.existsSync(j.target));
const kind=process.argv[2],unreviewed=process.argv.includes('--unreviewed');
const seen=new Set(require('./visual-review.json').reviewedIds||[]);
const items=jobs.filter(j=>(!kind||j.kind===kind)&&(!unreviewed||!seen.has(j.id)));
const prefix=(unreviewed?'pending-':'')+(kind||'all');
const out=path.resolve('dist/art-overhaul-audit');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 const sheets=[];
 for(let i=0;i<items.length;i+=16){const file=path.join(out,`${prefix}-${String(i).padStart(3,'0')}.html`);const group=items.slice(i,i+16);
  const html='<!doctype html><meta charset="utf-8"><style>body{background:#121311;color:#ddcca7;font:12px Arial;margin:12px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0;border:1px solid #53472d;padding:8px;overflow:hidden}img{display:block;width:100%;height:210px;object-fit:contain;background:#171612}.small{width:160px;height:90px;margin:auto}figcaption{min-height:48px;margin:8px 0}b{display:block;font-size:13px}</style><main>'+group.map(j=>'<figure><img src="'+pathToFileURL(path.resolve(j.target)).href+'"><img class="small" src="'+pathToFileURL(path.resolve(j.target)).href+'"><figcaption><b>'+j.name+'</b>'+j.kind+' / '+(j.skin||j.tier||'')+'</figcaption></figure>').join('')+'</main>';
  fs.writeFileSync(file,html);await page.goto(pathToFileURL(file).href);await page.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));const shot=file.replace('.html','.png');await page.screenshot({path:shot,fullPage:true});sheets.push({screenshot:shot,ids:group.map(j=>j.id)});
 }
 fs.writeFileSync(path.join(out,`${prefix}-sheets.json`),JSON.stringify(sheets,null,2));console.log(items.length+' assets / '+sheets.length+' sheets');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
