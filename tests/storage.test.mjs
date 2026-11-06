import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserStore, WORKSPACE_KEY, emptyWorkspace } from '../public/storage.js';
import { seedWorkspace } from '../seed.mjs';

function fixture() {
  const records=new Map();
  const storage={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v),removeItem:k=>records.delete(k)};
  let queue=Promise.resolve();
  const locks={request:(_name,fn)=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;}};
  return {records,storage,locks,store:createBrowserStore(storage,locks)};
}
test('Browser: leerer Arbeitsbereich ohne Schreibzugriff beim ersten Aufruf; Speichern und Wiederöffnen',async()=>{
  const {records,store,storage,locks}=fixture();
  assert.deepEqual(store.load(),{revision:0,workspace:emptyWorkspace()});
  assert.equal(records.size,0);
  const w=seedWorkspace();w.processes[0].title='Nur im Browser – ÄÖÜ';
  const saved=await store.save(w,0);
  assert.equal(saved.revision,1);
  const fresh=createBrowserStore(storage,locks).load();
  assert.deepEqual(fresh.workspace,w);
  assert.equal(records.size,1);
});
test('Browser: konkurrierende Tabs überschreiben keine gespeicherten Änderungen',async()=>{
  const {store,storage,locks}=fixture(),other=createBrowserStore(storage,locks);
  store.load();other.load();
  const results=await Promise.allSettled([store.save(seedWorkspace(),0),other.save(seedWorkspace(),0)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.match(results.find(r=>r.status==='rejected').reason.message,/anderen Tab/);
});
test('Browser: Speicherlimit und blockierte Schreibvorgänge erhalten den vorherigen Stand',async()=>{
  const {store,storage,records}=fixture();store.load();await store.save(seedWorkspace(),0);
  const previous=records.get(WORKSPACE_KEY);
  storage.setItem=()=>{throw Object.assign(new Error(),{name:'QuotaExceededError'});};
  await assert.rejects(store.save(seedWorkspace(),1),/voll/);
  assert.equal(records.get(WORKSPACE_KEY),previous);
  storage.getItem=()=>{throw new Error('denied');};
  assert.throws(()=>store.load(),/keine dauerhafte Speicherung/);
});
test('Browser: beschädigte Daten bleiben unangetastet und können bewusst ersetzt werden',async()=>{
  const {store,storage,records}=fixture();storage.setItem(WORKSPACE_KEY,'broken');
  assert.throws(()=>store.load(),/beschädigt/);
  assert.equal(store.raw(),'broken');
  assert.equal(records.get(WORKSPACE_KEY),'broken');
  await store.save(seedWorkspace(),0);
  assert.equal(store.load().workspace.processes.length,3);
});
test('Browser: ungültige Daten und unsicherer Kontext werden nicht gespeichert',async()=>{
  const {store,storage,records}=fixture();store.load();
  await assert.rejects(store.save({schemaVersion:9},0),/Ungültig/);
  const unsupported=createBrowserStore(storage);unsupported.load();
  await assert.rejects(unsupported.save(seedWorkspace(),0),/HTTPS/);
  assert.equal(records.size,0);
});
test('Browser: vollständiges Löschen ist auf die Schlüssel der Anwendung begrenzt',async()=>{
  const {store,storage,records}=fixture();store.load();await store.save(seedWorkspace(),0);
  storage.setItem('anderes-tool','behalten');
  const cleared=await store.clear();assert.deepEqual(cleared,{revision:0,workspace:emptyWorkspace()});
  assert.equal(records.get('anderes-tool'),'behalten');assert.equal(records.has(WORKSPACE_KEY),false);
});
test('Browser: Altformat wird verlustfrei migriert; Löschen eines veralteten Tabs wird abgewiesen',async()=>{
  const {store,storage,locks}=fixture(),w=seedWorkspace();
  w.processes[0].steps[0].input='Eingang aus Altversion';
  storage.setItem(WORKSPACE_KEY,JSON.stringify({revision:3,workspace:w}));
  const loaded=store.load();
  assert.ok(loaded.workspace.resources.some(r=>r.description==='Eingang aus Altversion'));
  const other=createBrowserStore(storage,locks);other.load();await other.save(loaded.workspace,3);
  await assert.rejects(store.clear(),/anderen Tab/);
});
test('Browser: vollständiger JSON-Export und Wiederimport erhalten alle Prozessangaben und Ressourcen',async()=>{
  const {store}=fixture();store.load();const w=seedWorkspace();
  const backup=JSON.parse(JSON.stringify({format:'rueckgrat-workspace',workspace:w}));
  await store.save(backup.workspace,0);
  assert.deepEqual(store.load().workspace,w);
});
test('Browser: ein gültiger, aber zu großer Arbeitsbereich verändert gespeicherte Daten nicht',async()=>{
  const {store}=fixture();store.load();await store.save(seedWorkspace(),0);const previous=store.raw();
  const oversized=emptyWorkspace();
  for(let i=0;i<250;i++)oversized.resources.push({id:'large-'+i,name:'Daten '+i,kind:'data',owner:'',description:'x'.repeat(10000)});
  await assert.rejects(store.save(oversized,1),/2 MB/);
  assert.equal(store.raw(),previous);
});
