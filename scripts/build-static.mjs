import './build-privacy.mjs';
import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const names=['index.html','app.js','domain.js','storage.js','reports.js','editor.js','styles.css','workspace.css','product.css','designer.css','rewinde.css','favicon.svg','logo.svg','privacy.js','project.js','privacy.css','datenschutz.html','_headers'];
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
const extra=(await readdir(new URL('../dist/',import.meta.url))).filter(name=>!names.includes(name));
if(extra.length)throw new Error('dist enthält zusätzliche Dateien. Bitte einen sauberen Ausgabeordner verwenden; es wurde nichts veröffentlicht oder gelöscht.');
for(const name of names)await copyFile(new URL('../public/'+name,import.meta.url),new URL('../dist/'+name,import.meta.url));
console.log('Statisches Paket: '+fileURLToPath(new URL('../dist/',import.meta.url))+' · '+names.length+' öffentliche Dateien');
