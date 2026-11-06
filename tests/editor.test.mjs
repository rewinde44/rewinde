import test from 'node:test';
import assert from 'node:assert/strict';
import { newStep } from '../public/domain.js';
import { patchStepFields, setLinkDirection, linkDirection, newResourceDraft } from '../public/editor.js';

test('Teilformular aus Allgemein erhält Ressourcen, Notizen und Potenzial aus anderen Menüs',()=>{
  const step=newStep('Prüfen');step.notes='Sonderfall';step.links=[{resourceId:'r1',direction:'input'}];step.assessment={potential:'medium',character:'judgment',reason:'Fachwissen erforderlich'};
  const snapshot=structuredClone(step),next=patchStepFields(step,{title:'Material prüfen',owner:'QM'});
  assert.deepEqual(next.assessment,snapshot.assessment);assert.deepEqual(next.links,snapshot.links);assert.equal(next.notes,'Sonderfall');assert.deepEqual(step,snapshot);
});
test('Teilformular aus Potenzial leert keine allgemeinen Schrittfelder',()=>{
  const step=newStep('Freigeben');step.description='Fachliche Freigabe';step.minutes=8;step.notes='Vier Augen';
  const next=patchStepFields(step,{potential:'high',reason:'Feste Regeln'});
  assert.equal(next.title,step.title);assert.equal(next.description,step.description);assert.equal(next.minutes,8);assert.equal(next.notes,'Vier Augen');assert.equal(next.assessment.potential,'high');
});
test('Ressourcen-Verwendung lässt sich ohne doppelte Zuordnung zwischen Input, Output und beidem wechseln',()=>{
  let links=[{resourceId:'other',direction:'uses'}];links=setLinkDirection(links,'r1','both');assert.equal(linkDirection(links,'r1'),'both');
  links=setLinkDirection(links,'r1','input');links=setLinkDirection(links,'r1','input');assert.equal(links.length,2);assert.equal(linkDirection(links,'r1'),'input');
  links=setLinkDirection(links,'r1','uses');assert.equal(linkDirection(links,'r1'),'uses');assert.deepEqual(links[0],{resourceId:'other',direction:'uses'});assert.throws(()=>setLinkDirection(links,'r1','invalid'),/Ungültige/);
});
test('Neue Ressourcenentwürfe teilen keinen Zustand',()=>{const a=newResourceDraft(),b=newResourceDraft();a.name='Prüfplan';assert.equal(b.name,'');assert.equal(b.direction,'input');});
