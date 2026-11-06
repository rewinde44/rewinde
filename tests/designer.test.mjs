import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace } from '../seed.mjs';
import { stripLegacyStatuses, validateWorkspace, verticalLayout } from '../public/domain.js';
import { createBrowserStore, WORKSPACE_KEY } from '../public/storage.js';
import { documentationMarkup, documentationFile } from '../public/reports.js';

test('Alte Statusangaben entfallen ohne Verlust der fachlichen Prozessdaten',async()=>{
  const w=seedWorkspace(),p=w.processes[0],s=p.steps[0];p.status='review';s.status='documented';s.owner='';s.links=[];
  const expected=stripLegacyStatuses(structuredClone(w));
  let raw=JSON.stringify({revision:7,workspace:w});const storage={getItem:k=>k===WORKSPACE_KEY?raw:null,setItem:(k,v)=>{raw=v;}};
  const store=createBrowserStore(storage,{request:(_,fn)=>fn()}),loaded=store.load();
  assert.deepEqual(loaded.workspace,expected);validateWorkspace(loaded.workspace);
  const saved=await store.save(loaded.workspace,7);assert.equal(saved.revision,8);
  assert.equal(Object.hasOwn(JSON.parse(raw).workspace.processes[0],'status'),false);
  assert.equal(Object.hasOwn(JSON.parse(raw).workspace.processes[0].steps[0],'status'),false);
});
test('Große Ablaufkarten und Plus-Schaltflächen haben ausreichend Abstand bei parallelen Voraussetzungen',()=>{
  const p=seedWorkspace().processes[0],layout=verticalLayout(p,{nodeWidth:320,nodeHeight:250,gapY:92,gapX:48,paddingTop:76});
  assert.equal(layout.nodeWidth,320);assert.equal(layout.pos['s-input'].y,76);
  for(const e of p.edges)assert.ok(layout.pos[e.to].y-layout.pos[e.from].y>=342);
  assert.ok(Math.abs(layout.pos['s-formal'].x-layout.pos['s-factual'].x)>=368);
});
test('Dokumentationsbericht enthält alle fachlichen Angaben ohne Status, Bearbeitung oder doppelte Ressourcen-Badges',()=>{
  const w=seedWorkspace(),p=w.processes[0],s=p.steps[0];s.notes='Wichtige Übergabe';s.assessment={potential:'high',character:'rules',reason:'Klare Regeln'};
  const html=documentationMarkup(p,w.resources);
  assert.match(html,/Rewinde/);assert.match(html,/Wichtige Übergabe/);assert.match(html,/Klare Regeln/);assert.match(html,/Genutzte Ressourcen/);
  assert.match(html,/Eingang \/ Input/);assert.match(html,/Ausgang \/ Output/);
  assert.equal((html.match(/class="report-step"/g)||[]).length,p.steps.length);
  assert.doesNotMatch(html,/resource-chip|<button|data-action|Dokumentationsstatus|In Bearbeitung|Entwurf/);
});
test('Eigenständiger HTML-Bericht maskiert Nutzereingaben und lädt keine externen Inhalte',()=>{
  const w=seedWorkspace(),p=w.processes[0];p.title='<script>alert(1)</script>';p.steps[0].description='<img src=x onerror=alert(1)>';
  const file=documentationFile(p,w.resources);
  assert.match(file,/&lt;script&gt;/);assert.match(file,/&lt;img/);assert.match(file,/default-src 'none'/);
  assert.doesNotMatch(file,/<script|<img|<iframe|<link|fetch\(/);
});
