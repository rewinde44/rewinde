import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { get } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createApp } from '../server.mjs';
test('HTTP: nur statische Dateien, keine Daten-API, keine Uploads und restriktive Sicherheitsheader',async t=>{
  const server=await createApp();server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const index=await fetch(base+'/');assert.equal(index.status,200);
  assert.match(index.headers.get('content-security-policy'),/connect-src 'none'/);
  assert.match(index.headers.get('content-security-policy'),/form-action 'none'/);
  assert.equal(index.headers.get('set-cookie'),null);
  assert.equal(index.headers.get('referrer-policy'),'no-referrer');
  assert.match(await index.text(),/storage|app.js/);
  for(const path of ['/api/workspace','/api/health','/data/workspace.json','/seed.mjs','/server.mjs','/.env']){
    assert.equal((await fetch(base+path)).status,404,path+' must not be exposed');
  }
  for(const method of ['PUT','POST','PATCH','DELETE']){
    const response=await fetch(base+'/api/workspace',{method,body:'{"confidential":"test"}'});
    assert.equal(response.status,405);
  }
  const head=await fetch(base+'/storage.js',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await fetch(base+'/%2e%2e%2fserver.mjs')).status,403);
  const foreign=await new Promise((resolve,reject)=>{const request=get(base+'/',{headers:{host:'fremd.example'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);});
  assert.equal(foreign,403);
});
test('Ausgelieferte Anwendung enthält keine Netzwerkclients, externen Assets oder Server-Schreibzugriffe',async()=>{
  for(const file of ['public/app.js','public/storage.js','public/domain.js','public/reports.js','public/editor.js']){
    const source=await readFile(new URL('../'+file,import.meta.url),'utf8');
    assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/);
  }
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/(?:src|href)=["']https?:/);
  const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(server,/writeFile|appendFile|mkdir|copyFile|req\.on\(['"]data/);
});
