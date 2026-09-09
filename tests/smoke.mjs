import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const required = ['index.html','styles.css','game.js','data.js','v3data.js','weapons.json'];
const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exitCode = 1; };
for (const file of required) {
  if (!fs.existsSync(path.join(root,file))) fail(`missing ${file}`);
}
if (process.exitCode) process.exit(process.exitCode);

for (const file of ['game.js','data.js','v3data.js']) {
  try { execFileSync(process.execPath, ['--check', path.join(root,file)], {stdio:'pipe'}); }
  catch (e) { fail(`JavaScript syntax error in ${file}`); }
}

try {
  const weapons = JSON.parse(fs.readFileSync(path.join(root,'weapons.json'),'utf8'));
  const count = Array.isArray(weapons) ? weapons.length : Array.isArray(weapons.weapons) ? weapons.weapons.length : Object.keys(weapons).length;
  if (count < 100) fail(`unexpectedly small weapons dataset (${count})`);
  else console.log(`weapons dataset: ${count} entries`);
} catch (e) { fail(`weapons.json invalid JSON: ${e.message}`); }

const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const game = fs.readFileSync(path.join(root,'game.js'),'utf8');
const css = fs.readFileSync(path.join(root,'styles.css'),'utf8');
const allText = `${html}\n${game}\n${css}`;

const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]));
const referencedIds = [...game.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map(m => m[1]);
const missingIds = [...new Set(referencedIds.filter(id => !ids.has(id)))];
if (missingIds.length) fail(`DOM ids referenced but missing: ${missingIds.join(', ')}`);
else console.log(`DOM ids: ${referencedIds.length} references checked`);

const assetRefs = new Set();
for (const m of allText.matchAll(/["'(`]((?:assets\/)[^"'`)\s?#]+\.(?:png|jpe?g|webp|gif))["'`)]/gi)) assetRefs.add(m[1]);
const missingAssets = [...assetRefs].filter(rel => !fs.existsSync(path.join(root,rel)));
if (missingAssets.length) fail(`missing assets: ${missingAssets.join(', ')}`);
else console.log(`assets: ${assetRefs.size} referenced files checked`);

const mustContain = ['Hunter','Händler','Mission'];
for (const term of mustContain) if (!html.includes(term) && !game.includes(term)) fail(`expected game surface missing: ${term}`);

if (!process.exitCode) console.log('PASS: RPG Hunt static smoke test');
