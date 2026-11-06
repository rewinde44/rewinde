import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace } from '../seed.mjs';
import { validateWorkspace, newStep, ordered, removeStep, coverage, findings, migrateResourceFlows, verticalLayout } from '../public/domain.js';

test('Beispielprozess bildet zwei gemeinsame Voraussetzungen ab', () => {
  const w=seedWorkspace(); assert.equal(validateWorkspace(w),w);
  const p=w.processes[0]; assert.equal(p.edges.filter(e=>e.to==='s-pay').length,2);
  assert.equal(coverage(p).percent,100); assert.equal(findings(p).length,0);
  const order=ordered(p).map(s=>s.id);
  for(const e of p.edges)assert.ok(order.indexOf(e.from)<order.indexOf(e.to));
});
test('Ein einzelnes Ergebnis ist ein gültiger Start für Rückwärtsverkettung', () => {
  const w=seedWorkspace(),goal=newStep('Kunde hat die Lieferung erhalten','goal');
  w.processes[0].steps=[goal];w.processes[0].edges=[];
  assert.doesNotThrow(()=>validateWorkspace(w));assert.ok(findings(w.processes[0]).some(i=>i.title==='Prozessanfang fehlt'));
});
test('Kreise, verwaiste Schritte und unzulässige Ergebnisverbindungen werden abgewiesen', () => {
  let w=seedWorkspace();w.processes[0].edges.push({from:'s-pay',to:'s-capture'});
  assert.throws(()=>validateWorkspace(w),/Kreislauf/);
  w=seedWorkspace();w.processes[0].edges=w.processes[0].edges.filter(e=>e.from!=='s-formal');
  assert.throws(()=>validateWorkspace(w),/zum finalen Ergebnis/);
  w=seedWorkspace();w.processes[0].edges.push({from:'s-goal',to:'s-pay'});
  assert.throws(()=>validateWorkspace(w),/keinen Nachfolger/);
  w=seedWorkspace();w.processes[0].edges.push({from:'s-capture',to:'s-input'});
  assert.throws(()=>validateWorkspace(w),/keinen Vorgänger/);
});
test('Entfernen eines Schrittes erhält die Pfade zum Ziel', () => {
  const w=seedWorkspace(),p=w.processes[0]; removeStep(p,'s-pay');
  assert.ok(p.edges.some(e=>e.from==='s-formal'&&e.to==='s-goal'));
  assert.ok(p.edges.some(e=>e.from==='s-factual'&&e.to==='s-goal'));
  assert.doesNotThrow(()=>validateWorkspace(w)); assert.throws(()=>removeStep(p,'s-goal'),/nicht entfernt/);
});
test('Importe mit fehlenden Ressourcen, doppelten IDs und HTML in IDs werden abgewiesen', () => {
  let w=seedWorkspace();w.resources=[];assert.throws(()=>validateWorkspace(w),/Ressourcenzuordnung/);
  w=seedWorkspace();w.processes[1].id=w.processes[0].id;assert.throws(()=>validateWorkspace(w),/IDs müssen eindeutig/);
  w=seedWorkspace();w.resources[0].id='"><script>';assert.throws(()=>validateWorkspace(w),/IDs müssen eindeutig/);
  w=seedWorkspace();w.resources[0].kind='__proto__';assert.throws(()=>validateWorkspace(w),/Ressourceneintrag/);
});
test('Ein finales Ergebnis und gültige Zeiten sind erforderlich; Angaben können schrittweise ergänzt werden', () => {
  let w=seedWorkspace();w.processes[0].steps.push(newStep('Zweites Ergebnis','goal'));assert.throws(()=>validateWorkspace(w),/genau ein/);
  w=seedWorkspace();w.processes[0].steps[0].minutes=-1;assert.throws(()=>validateWorkspace(w),/Dauer/);
  w=seedWorkspace();w.processes[0].steps[0].owner='';assert.doesNotThrow(()=>validateWorkspace(w));
});
test('Ressourcen können Input und Output desselben Schrittes sein', () => {
  const w=seedWorkspace();w.processes[0].steps[0].links.push({resourceId:'r-invoice',direction:'input'});
  assert.doesNotThrow(()=>validateWorkspace(w));
  w.processes[0].steps[0].links.push({resourceId:'r-invoice',direction:'input'});
  assert.throws(()=>validateWorkspace(w),/Ressourcenzuordnung/);
});
test('Alte Input- und Output-Texte werden ohne Verlust und nur einmal migriert', () => {
  const w=seedWorkspace(),s=w.processes[0].steps[0];
  s.input='Bisheriger Input mit Umlauten äöü';s.output='Bisheriger Output';
  assert.equal(migrateResourceFlows(w),true);
  assert.equal(s.input,'');assert.equal(s.output,'');
  assert.ok(s.links.some(l=>l.direction==='input'&&w.resources.find(r=>r.id===l.resourceId).name==='Bisheriger Input mit Umlauten äöü'));
  assert.ok(s.links.some(l=>l.direction==='output'&&w.resources.find(r=>r.id===l.resourceId).description==='Bisheriger Output'));
  const snapshot=JSON.stringify(w);assert.equal(migrateResourceFlows(w),false);assert.equal(JSON.stringify(w),snapshot);validateWorkspace(w);
});
test('Dokumentation verwendet Output-Zuordnungen ohne separate Textfelder', () => {
  const w=seedWorkspace(),p=w.processes[0],s=p.steps[0];
  assert.equal(s.output,'');assert.equal(coverage(p).percent,100);
  s.links=s.links.filter(l=>l.direction!=='output');validateWorkspace(w);assert.ok(findings(p).some(f=>f.step===s.id&&f.text.includes('Output-Zuordnung')));
});
test('Vertikale Karte erhält Ablauf, parallele Prüfungen und Abstand zwischen Karten', () => {
  const p=seedWorkspace().processes[0],layout=verticalLayout(p),{pos,nodeHeight,nodeWidth}=layout;
  for(const e of p.edges)assert.ok(pos[e.to].y>=pos[e.from].y+nodeHeight+60);
  assert.equal(pos['s-formal'].y,pos['s-factual'].y);
  assert.ok(Math.abs(pos['s-formal'].x-pos['s-factual'].x)>=nodeWidth+30);
  assert.ok(pos['s-goal'].y>pos['s-input'].y);
});
