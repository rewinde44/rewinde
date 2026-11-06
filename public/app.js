import { uid, kinds, resourceKinds, predecessors, ordered, validateWorkspace, newStep, removeStep, migrateResourceFlows, verticalLayout, stripLegacyStatuses } from './domain.js';

import { documentationMarkup, documentationFile, reportStyles } from './reports.js';
import { privacyContent } from './privacy.js';
import { createBrowserStore, WORKSPACE_KEY, emptyWorkspace } from './storage.js';
import { STEP_MENUS, patchStepFields, newResourceDraft, linkDirection, setLinkDirection } from './editor.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  arrow:'M19 12H5m6-6-6 6 6 6', right:'m9 5 7 7-7 7', plus:'M12 5v14M5 12h14', grid:'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
  flow:'M4 4h6v6H4zm10 10h6v6h-6zM7 10v7h7m-4-10h7v7', box:'m12 3 9 5-9 5-9-5 9-5zm-9 5v9l9 5 9-5V8M12 13v9', chart:'M4 20V10m8 10V4m8 16v-7', book:'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4zm16 0h-4a3 3 0 0 0-3 3m0 14a4 4 0 0 1 4-2h3V4',
  search:'m20 20-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0', download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5', more:'M5 12h.01M12 12h.01M19 12h.01', check:'m5 12 4 4L19 6', close:'m6 6 12 12M6 18 18 6', clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  person:'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0', target:'M21 12a9 9 0 1 1-9-9m0 5a4 4 0 1 0 4 4m-4 0 9-9m-5 0h5v5', link:'m10 13 4-4m-6 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0', edit:'m15 4 5 5M4 20l5-1L21 7a3 3 0 0 0-4-4L5 15z',
  settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8m-2-6h4l1 3 3 1 3 1v4l-2 2-1 3 1 3-3 2-3-1-3 1-3-2 1-3-1-3-2-2V7l3-1 3-1z', leaf:'M20 3C9 2 2 8 6 16s14 1 14-13ZM5 20l10-10', info:'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', file:'M14 2H5v20h14V7zm0 0v5h5M8 12h8M8 16h8', print:'M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v8H6z',
  minus:'M5 12h14', fit:'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5', trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7', copy:'M8 8h13v13H8zM16 8V3H3v13h5', shield:'m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6z', database:'M21 6c0 2-4 4-9 4S3 8 3 6s4-4 9-4 9 2 9 4Zm0 0v12c0 2-4 4-9 4s-9-2-9-4V6m0 6c0 2 4 4 9 4s9-2 9-4', software:'M3 3h18v14H3zm5 18h8m-4-4v4', external:'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7', flag:'M5 22V3m0 1c5-5 9 5 15 0v10c-6 5-10-5-15 0', help:'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.file}"/></svg>`;
let workspace, revision, currentId = 'p-invoice', selectedId = 's-goal', nav = 'process', busy = false, zoom = 1, query = '', graphObserver;
let lastFocus;
let editor = null, pendingIntent = null;
let pane=null, processDraft=null, propertyDirty=false, pendingPropertyIntent=null;
let browserStore;

const process = () => workspace.processes.find(p => p.id === currentId);
const step = () => editor?.value.id === selectedId ? editor.value : process()?.steps.find(s => s.id === selectedId);
const resource = id => editor?.resourceEdits?.[id] || editor?.resources.find(r => r.id === id) || workspace.resources.find(r => r.id === id);
const date = s => new Date(s).toLocaleDateString('de-DE', { day:'2-digit', month:'short', year:'numeric' });
const button = (label, action, cls = '', ico = '', attrs = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${attrs}>${ico ? icon(ico) : ''}${label}</button>`;
const tag = (text, cls='') => `<span class="tag ${cls}">${esc(text)}</span>`;
function toast(message, error = false) { const el = $('#toast'); el.textContent = message; el.className = `show ${error ? 'error' : ''}`; clearTimeout(toast.timer); toast.timer = setTimeout(() => el.className = '', error ? 7000 : 3500); }
function showModal(html, wide = false) {
  lastFocus = document.activeElement;
  const m = $('#modal'); m.setAttribute('aria-labelledby','modal-title'); m.className = wide ? 'wide' : ''; m.innerHTML = html;
  if (!m.open) m.showModal();
}
function closeModal() { $('#modal').close(); lastFocus?.focus?.(); }
function modalHeader(kicker, title) { return `<header class="modal-head"><div><h2 id="modal-title">${title}</h2></div><button type="button" class="icon-btn" data-action="close-modal" aria-label="Dialog schließen">${icon('close')}</button></header>`; }
function modalFooter(submit='Speichern') { return `<footer class="modal-footer"><span class="form-error" role="alert"></span>${button('Abbrechen','close-modal','ghost')}<button class="btn primary" type="submit">${icon('check')}${submit}</button></footer>`; }
async function commit(change, message = 'Änderungen gespeichert', onSaved) {
  if (busy) { toast('Speicherung läuft. Bitte einen Moment warten.'); return false; }
  const next = structuredClone(workspace);
  try { change(next); validateWorkspace(next); } catch(e) { showError(e.message); return false; }
  busy = true; updateSaveStatus('Wird gespeichert …');
  try {
    const result = await browserStore.save(next,revision);
    workspace = result.workspace; revision = result.revision; busy = false;
    onSaved?.(); closeModal(); render(); toast(message); return true;
  } catch(e) { busy = false; updateSaveStatus('Nicht gespeichert', true); showError(e.message); return false; }
}
function showError(message) { const el = $('#modal[open] .form-error'); if (el) el.textContent = message; else if ($('#inline-step-form')) editorError(message); else toast(message,true); }
function updateSaveStatus(text, error=false) { const el=$('#save-state'); if(el) {el.innerHTML=icon(error?'info':'check')+esc(text);el.classList.toggle('save-error',error);} }

function sidebarBase() {
  return `<aside class="sidebar"><a class="brand" href="#" data-action="home" aria-label="Rewinde – Prozessübersicht"><img src="/favicon.svg" alt=""><span>rewinde</span></a><nav aria-label="Hauptnavigation"><button class="nav-item ${['overview','process'].includes(nav)?'active':''}" data-action="overview" title="Prozessübersicht" aria-label="Prozessübersicht">${icon('grid')}<span>Prozesse</span><span class="nav-count">${workspace.processes.length}</span></button></nav><div class="sidebar-bottom"><button class="nav-item" data-action="privacy" title="Datenschutz" aria-label="Datenschutzhinweise">${icon('shield')}<span>Datenschutz</span></button><button class="nav-item" data-action="guide" title="Anleitung" aria-label="Anleitung">${icon('help')}<span>Anleitung</span></button><button class="nav-item ${nav==='settings'?'active':''}" data-action="settings" title="Einstellungen" aria-label="Einstellungen">${icon('settings')}<span>Einstellungen</span></button></div></aside>`;
}
function sidebar() { return sidebarBase(); }
function render() {
  document.body.dataset.view=nav;
  if(!process()&&workspace.processes.length){currentId=workspace.processes[0].id;selectedId=process().steps.find(s=>s.kind==='goal').id;}
  if(!workspace.processes.length&&nav==='process'){nav='overview';pane=null;}
  $('#app').innerHTML=`${sidebar()}<div class="workspace"><header class="topbar"><a class="app-name" href="#" data-action="home">rewinde</a><div class="breadcrumb"><button data-action="overview" class="breadcrumb-link">Prozesse</button>${nav==='process'?`${icon('right')}<span>${esc(process().title)}</span>`:nav==='settings'?`${icon('right')}<span>Einstellungen</span>`:''}</div><div class="topbar-actions"><button class="search-button" data-action="search" aria-label="Suchen">${icon('search')}<span>Suche</span><kbd>Strg K</kbd></button><button class="icon-btn" data-action="guide" aria-label="Anleitung öffnen">${icon('help')}</button></div></header><main id="main">${nav==='process'?processPage():nav==='overview'?overviewPage():settingsPage()}</main></div>`;
  graphObserver?.disconnect();
  if($('#graph-viewport')){graphObserver=new ResizeObserver(()=>fitGraph(false));graphObserver.observe($('#graph-viewport'));requestAnimationFrame(()=>fitGraph(true));}
}

function settingsPage() {
  return `<section class="page-heading"><div><h1>Einstellungen</h1></div></section><div class="settings-grid"><section class="settings-card full-card"><h2>Daten & Sicherung</h2><p>Deine Prozesse bleiben in diesem Browserprofil auf diesem Gerät. Es gibt keine Übertragung von Prozessdaten an den Server und keine automatische Synchronisierung.</p><p>Beim Löschen von Websitedaten oder am Ende einer privaten Sitzung können sie verloren gehen. Sichere deinen Arbeitsbereich regelmäßig und vor einem Wechsel von Gerät, Browser oder Domain.</p><div class="button-row">${button('Sicherung herunterladen','export-workspace','primary','download')}${button('JSON importieren','import','secondary','upload')}</div><div class="backup-summary"><span>${workspace.processes.length} Prozesse</span><span>${workspace.resources.length} Ressourcen</span></div></section><section class="settings-card full-card"><h2>Datenschutz</h2><p>Rewinde ist eine Projektpräsentation. Die öffentliche Version wird über Cloudflare Pages bereitgestellt.</p><div class="button-row">${button('Datenschutzhinweise','privacy','secondary','shield')}${button('Browserdaten löschen','clear-browser','text-btn danger','trash')}</div></section></div>`;
}
function privacyDialog() {
  showModal(modalHeader('','Datenschutzhinweise')+'<div class="modal-content privacy-copy">'+privacyContent+'<div class="button-row"><a class="btn secondary" href="/datenschutz.html" target="_blank" rel="noopener noreferrer">Als eigene Seite öffnen</a>'+button('Schließen','close-modal','primary')+'</div></div>',true);
}

function processEditor() {
  const p=processDraft||process();
  return `<aside class="step-editor process-editor" aria-label="Prozessangaben bearbeiten"><header class="step-editor-header"><div><span class="pane-context">Prozess</span><h2>Prozessangaben</h2></div><button type="button" class="icon-btn" data-action="close-pane" aria-label="Bearbeitungsbereich schließen">${icon('close')}</button></header><form id="process-form" data-new="false"><div class="step-editor-body"><span id="properties-state" class="draft-state" role="status">${propertyDirty?'Ungespeichert':''}</span><span class="inline-form-error" role="alert"></span><label>Bezeichnung<input name="title" value="${esc(p.title)}" required maxlength="200"></label><label>Kategorie<input name="category" value="${esc(p.category)}" required maxlength="100"></label><label>Prozessverantwortung<input name="owner" value="${esc(p.owner)}" maxlength="200"></label><label>Zweck & Abgrenzung<textarea name="description" rows="5" maxlength="10000">${esc(p.description)}</textarea></label><div class="process-management">${button('Prozess duplizieren','duplicate-process','secondary','copy')}${button('Prozess löschen','delete-process','text-btn danger','trash')}</div></div><footer class="step-editor-footer">${button('Zurücksetzen','reset-process','ghost')}<button type="submit" class="btn primary">Prozess speichern</button></footer></form></aside>`;
}

function processPage() {
  ensureEditor();const p=process();
  return `<section class="designer-heading"><div><span class="designer-category">${esc(p.category)} <span>/</span> ${p.steps.length} ${p.steps.length===1?'Schritt':'Schritte'}</span><h1>${esc(p.title)}</h1></div><div class="designer-heading-actions">${button('Prozessangaben','edit-process','secondary','settings')}${button('Exportieren','export','primary','download')}</div></section><div class="designer-workspace ${pane?'has-pane':''}"><section class="graph-panel" aria-label="Ablauf-Arbeitsfläche"><header class="graph-panel-header"><div class="canvas-caption">${icon('flow')}<h2>Ablauf</h2></div><div class="map-jumps">${button('Anfang','map-start','map-jump','','aria-label="Zum Prozessanfang"')}${button('Ergebnis','map-goal','map-jump','','aria-label="Zum Prozessergebnis"')}${button('Vorgänger','add-step','secondary','plus','aria-label="Vorgänger zum ausgewählten Schritt hinzufügen"')}</div></header><div id="graph-viewport" class="vertical-viewport" tabindex="0" aria-label="Ablauf verschieben und Schritte auswählen">${graphMarkup(previewProcess())}</div><footer class="graph-panel-footer"><span class="canvas-instruction">Schritt auswählen zum Bearbeiten</span><span id="save-state" class="save-state" role="status"></span><div class="zoom-controls"><button data-action="zoom-out" aria-label="Verkleinern">${icon('minus')}</button><button data-action="zoom-reset" id="zoom-label" aria-label="Zoom auf 100 Prozent">100%</button><button data-action="zoom-in" aria-label="Vergrößern">${icon('plus')}</button><button data-action="fit" aria-label="Gesamten Ablauf einpassen">${icon('fit')}</button></div></footer></section>${pane==='step'?inspector():pane==='process'?processEditor():''}</div>`;
}
function inspectorHeader(s) {
  const index=ordered(previewProcess()).findIndex(x=>x.id===s.id)+1;
  const selected=editor.ui?.section||'general';
  return `<header class="step-editor-header"><span class="pane-type-mark">${icon(s.kind==='goal'?'flag':s.kind==='input'?'download':'file')}</span><div><span class="pane-context">${editor.isNew?'Neuer Vorgänger':`Schritt ${String(index).padStart(2,'0')} · ${kinds[s.kind]}`}</span><h2 title="${esc(s.title)}">${esc(s.title||'Neuer Schritt')}</h2></div><button type="button" class="icon-btn" data-action="close-pane" aria-label="Bearbeitungsbereich schließen">${icon('close')}</button></header><nav class="pane-navigation" role="tablist" aria-label="Schrittdetails">${STEP_MENUS.map(m=>`<button type="button" id="step-tab-${m.id}" role="tab" aria-selected="${selected===m.id}" aria-controls="step-panel-${m.id}" tabindex="${selected===m.id?'0':'-1'}" data-action="pane-section" data-section="${m.id}">${m.label}</button>`).join('')}</nav>`;
}
function overviewPage() {
  const list=workspace.processes.filter(p=>(p.title+' '+p.category+' '+p.owner).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  return `<section class="page-heading library-heading"><div><h1>Prozesse <span class="title-count">${workspace.processes.length}</span></h1></div>${button('Neuer Prozess','new-process','primary','plus')}</section><section class="process-library"><div class="library-toolbar"><div class="input-icon">${icon('search')}<input id="process-filter" type="search" placeholder="Prozesse suchen" value="${esc(query)}" aria-label="Prozesse filtern"></div><span>${list.length} ${list.length===1?'Eintrag':'Einträge'}</span></div>${list.length?`<div class="table-scroll"><table class="library-table"><thead><tr><th>Prozess</th><th class="library-owner">Verantwortlich</th><th class="library-date">Bearbeitet</th><th aria-label="Aktionen"></th></tr></thead><tbody>${list.map(p=>`<tr><td><button type="button" class="library-process" data-action="open-process" data-id="${p.id}"><span class="library-process-mark">${icon('flow')}</span><span><strong>${esc(p.title)}</strong><small>${esc(p.category)}<span>·</span>${p.steps.length} ${p.steps.length===1?'Schritt':'Schritte'}</small></span></button></td><td class="library-owner">${esc(p.owner||'—')}</td><td class="library-date">${date(p.updatedAt)}</td><td><button class="icon-btn" data-action="open-process" data-id="${p.id}" aria-label="${esc(p.title)} öffnen">${icon('right')}</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="library-empty"><h2>${query?'Keine Treffer':'Keine Prozesse'}</h2><p>${query?'Suchbegriff ändern oder einen Prozess anlegen.':'Einen Prozess mit dem gewünschten Ergebnis anlegen.'}</p><div class="button-row">${button('Neuer Prozess','new-process','secondary','plus')}${!query?button('JSON importieren','import','secondary','upload'):''}</div>${!query?'<p class="empty-storage-note">Prozessdaten bleiben ausschließlich in diesem Browser. Sichere sie per JSON-Export, bevor du Websitedaten löschst oder die Domain wechselst.</p>':''}</div>`}</section>`;
}

function linkedNames(s, direction) {
  return s.links.filter(l => l.direction === direction).map(l => resource(l.resourceId)?.name || '').filter(Boolean).join(' · ');
}
function ensureEditor() {
  if (editor?.processId === currentId && editor.value.id === selectedId) return;
  const s = process()?.steps.find(s => s.id === selectedId);
  editor = s ? {processId: currentId, value: structuredClone(s), resources: [], resourceEdits: {}, edges: structuredClone(process().edges), isNew: false, dirty: false} : null;
}
function previewProcess() {
  const p = structuredClone(process());
  if (!editor || editor.processId !== p.id) return p;
  const s = structuredClone(editor.value);
  if (editor.isNew) {
    const target = p.steps.find(s => s.id === editor.targetId);
    if (target?.kind === 'input') target.kind = 'activity';
    p.steps.push(s);
  } else p.steps[p.steps.findIndex(x => x.id === s.id)] = s;
  p.edges = structuredClone(editor.edges);
  return p;
}

function inspector() { return stepInspector(); }


function exportDialog() { exportOptions(); }
function csv() { exportCsv(); }
function svgExport() { exportSvg(); }
function guide() { methodGuide(); }
function graphLayout(p) { return verticalLayout(p,{nodeWidth:312,nodeHeight:208,gapY:78,gapX:48,paddingTop:70}); }
function graphMarkup(p) {
  const {pos,w,h,nodeWidth,nodeHeight}=graphLayout(p);
  const flow=(s,d)=>{const names=s.links.filter(l=>l.direction===d).map(l=>resource(l.resourceId)?.name).filter(Boolean);return `<span class="node-flow"><span class="flow-label">${d==='input'?'Input':'Output'}</span><span class="flow-names" title="${esc(names.join(' · '))}">${esc(names.length?names.join(' · '):'—')}</span></span>`;};
  return `<div class="vertical-scroll-size"><div class="vertical-stage" data-width="${w}" data-height="${h}" style="width:${w}px;height:${h}px"><svg class="vertical-connections" width="${w}" height="${h}" aria-label="Prozessverbindungen von oben nach unten"><defs><marker id="vertical-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7" fill="#7890af"/></marker></defs>${p.edges.map(e=>{const a=pos[e.from],b=pos[e.to],x1=a.x+nodeWidth/2,y1=a.y+nodeHeight,x2=b.x+nodeWidth/2,y2=b.y-5;return `<path d="M${x1} ${y1} C${x1} ${y1+40},${x2} ${y2-40},${x2} ${y2}" fill="none" stroke="${e.to===selectedId||e.from===selectedId?'#3e75cb':'#9aafcb'}" stroke-width="2" marker-end="url(#vertical-arrow)"/>`;}).join('')}</svg>${p.steps.map((s)=>`<div class="canvas-step-group"><button type="button" class="canvas-add" data-action="add-before" data-id="${s.id}" style="left:${pos[s.id].x+nodeWidth/2-14}px;top:${pos[s.id].y-48}px" aria-label="Vorgänger vor ${esc(s.title||'neuem Schritt')} hinzufügen" title="Vorgänger hinzufügen">${icon('plus')}</button><button type="button" class="process-node ${s.kind} ${s.id===selectedId&&pane==='step'?'selected':''} ${editor?.isNew&&s.id===editor.value.id?'new-node':''}" data-action="select-step" data-id="${s.id}" aria-pressed="${s.id===selectedId&&pane==='step'}" aria-label="${esc(kinds[s.kind]+': '+(s.title||'Neuer Vorgänger'))}" style="left:${pos[s.id].x}px;top:${pos[s.id].y}px;width:${nodeWidth}px;height:${nodeHeight}px"><span class="process-node-type">${icon(s.kind==='goal'?'flag':s.kind==='input'?'download':'file')}${kinds[s.kind]}<span class="node-edit-icon">${icon('edit')}</span></span><strong>${esc(s.title||'Neuer Vorgänger')}</strong><span class="canvas-node-description">${esc(s.description)}</span><span class="process-node-owner">${s.owner?icon('person')+esc(s.owner):''}</span><span class="node-flows">${flow(s,'input')}${flow(s,'output')}</span></button></div>`).join('')}</div></div>`;
}
function fitGraph(center=false) {
  const stage=$('.vertical-stage'),viewport=$('#graph-viewport');if(!stage||!viewport)return;
  const w=Number(stage.dataset.width),h=Number(stage.dataset.height),scaledWidth=w*zoom;
  const size=$('.vertical-scroll-size'),width=Math.max(viewport.clientWidth,scaledWidth);
  const overlay=innerWidth<1100&&pane?$('.step-editor')?.getBoundingClientRect().width||0:0,pad=viewport.clientWidth-overlay>80?overlay/2:0;
  stage.style.transform=`scale(${zoom})`;stage.style.left=`${Math.max(0,(width-scaledWidth)/2)+pad}px`;
  size.style.width=`${width+pad}px`;size.style.height=`${Math.max(viewport.clientHeight,h*zoom+30)}px`;
  $('#zoom-label').textContent=`${Math.round(zoom*100)}%`;
  if(center){const layout=graphLayout(previewProcess()),position=layout.pos[selectedId];if(position){viewport.scrollTop=Math.max(0,(position.y+layout.nodeHeight/2)*zoom-viewport.clientHeight/2);viewport.scrollLeft=Math.max(0,(position.x+layout.nodeWidth/2)*zoom+(width-scaledWidth)/2-viewport.clientWidth/2);}}
}
function refreshGraph(center=false) {
  const viewport=$('#graph-viewport');if(!viewport)return;
  const top=viewport.scrollTop,left=viewport.scrollLeft;viewport.innerHTML=graphMarkup(previewProcess());fitGraph(center);if(!center){viewport.scrollTop=top;viewport.scrollLeft=left;}
}
function formOptions(values, selected) { return Object.entries(values).map(([k,v])=>`<option value="${k}" ${selected===k?'selected':''}>${v}</option>`).join(''); }
function resourceMenu() {
  const ui=editor.ui,ids=[...new Set(editor.value.links.map(l=>l.resourceId))],nr=editor.resourceDraft||newResourceDraft();
  const back=`<button class="resource-back" type="button" data-action="resource-list">${icon('arrow')}Zur Liste</button>`;
  if(ui.resourceView==='picker')return `<div class="resource-submenu">${back}<div class="menu-intro"><h3>Ressource zuordnen</h3></div><label>Verwendung<select id="resource-picker-direction" data-ui-only aria-label="Verwendung beim Zuordnen">${formOptions({input:'Input',output:'Output',both:'Input & Output',uses:'Wird genutzt'},ui.attachDirection||'input')}</select></label><div class="input-icon resource-search">${icon('search')}<input id="resource-picker-search" type="search" data-ui-only value="${esc(ui.query||'')}" placeholder="Einträge suchen" aria-label="Ressourcen durchsuchen"></div><div id="resource-picker-results" class="resource-picker-results">${resourcePickerRows(ui.query||'')}</div><div class="resource-picker-create">${button('Neuen Eintrag anlegen','resource-new','secondary full','plus')}</div></div>`;
  if(ui.resourceView==='create')return `<div class="resource-submenu">${back}<div class="menu-intro"><h3>Neuer Eintrag</h3></div><label>Name<input name="new-resource-name" value="${esc(nr.name)}" maxlength="200" placeholder="z. B. Prüfplan"></label><div class="form-grid compact-grid"><label>Typ<select name="new-resource-kind" aria-label="Typ des neuen Eintrags">${formOptions(resourceKinds,nr.kind)}</select></label><label>Verwendung<select name="new-resource-direction" aria-label="Verwendung des neuen Eintrags">${formOptions({input:'Input',output:'Output',both:'Input & Output',uses:'Wird genutzt'},nr.direction)}</select></label></div><details class="resource-more" ${nr.owner||nr.description?'open':''}><summary>Beschreibung & Verantwortung</summary><label>Beschreibung<textarea name="new-resource-description" rows="3" maxlength="10000">${esc(nr.description)}</textarea></label><label>Verantwortlich<input name="new-resource-owner" value="${esc(nr.owner)}" maxlength="200"></label></details>${button('Anlegen & zuordnen','create-inline-resource','primary full','plus')}</div>`;
  if(ui.resourceView==='edit'&&ids.includes(ui.editingId)){
    const r=resource(ui.editingId);
    return `<div class="resource-submenu">${back}<div class="menu-intro"><h3>Eintrag bearbeiten</h3><p>Änderungen gelten in allen zugeordneten Schritten.</p></div><div data-edit-resource="${r.id}"><label>Name<input data-resource-field="name" aria-label="Eintragsname" value="${esc(r.name)}" maxlength="200"></label><label>Typ<select data-resource-field="kind" aria-label="Eintragstyp">${formOptions(resourceKinds,r.kind)}</select></label><label>Verantwortlich<input data-resource-field="owner" aria-label="Verantwortung des Eintrags" value="${esc(r.owner)}" maxlength="200"></label><label>Beschreibung / Datenstruktur<textarea data-resource-field="description" aria-label="Beschreibung des Eintrags" rows="3" maxlength="10000">${esc(r.description)}</textarea></label></div></div>`;
  }
  return `<div class="resource-list-heading"><div><h3>Zugeordnete Einträge <span>${ids.length}</span></h3><p>Inputs, Outputs und eingesetzte Hilfsmittel.</p></div>${button('Hinzufügen','resource-picker','secondary','plus')}</div><div class="resource-rows">${ids.map(id=>{const r=resource(id);return `<div class="resource-row"><div class="resource-row-heading"><span class="resource-type-icon">${icon(r.kind==='software'?'software':r.kind==='data'?'database':'person')}</span><button type="button" class="resource-name" data-action="resource-edit" data-id="${id}" title="Eintrag bearbeiten"><strong>${esc(r.name)}</strong><small>${resourceKinds[r.kind]}${editor.resources.some(x=>x.id===id)?' · Neu':''}</small></button><button type="button" class="icon-btn" data-action="unassign-resource" data-id="${id}" aria-label="${esc(r.name)} aus Schritt entfernen">${icon('close')}</button></div><div class="resource-row-usage"><span>Verwendung</span><select data-resource-direction="${id}" aria-label="Zuordnung von ${esc(r.name)}">${formOptions({input:'Input',output:'Output',both:'Input & Output',uses:'Wird genutzt'},linkDirection(editor.value.links,id))}</select><button type="button" class="icon-btn" data-action="resource-edit" data-id="${id}" aria-label="${esc(r.name)} bearbeiten">${icon('edit')}</button></div></div>`;}).join('')||`<div class="resource-zero">${icon('box')}<h4>Keine Einträge zugeordnet</h4><p>Ordne Daten, Software oder andere Ressourcen zu.</p>${button('Eintrag hinzufügen','resource-picker','secondary','plus')}</div>`}</div>${editor.resourceDraft?.name?`<button class="pending-resource" type="button" data-action="resource-new">${icon('edit')}Entwurf: ${esc(editor.resourceDraft.name)}</button>`:''}`;
}

function resourcePickerRows(query='') {
  const ids=new Set(editor.value.links.map(l=>l.resourceId)),q=query.toLocaleLowerCase('de');
  const eligible=workspace.resources.map(r=>resource(r.id)).filter(r=>!ids.has(r.id)&&[r.name,resourceKinds[r.kind],r.owner].join(' ').toLocaleLowerCase('de').includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'de'));
  return eligible.map(r=>`<button type="button" class="resource-pick-row" data-action="resource-pick" data-id="${r.id}"><span class="resource-type-icon">${icon(r.kind==='software'?'software':r.kind==='data'?'database':'person')}</span><span><strong>${esc(r.name)}</strong><small>${resourceKinds[r.kind]}</small></span>${icon('plus')}</button>`).join('')||`<p class="menu-empty">${q?'Keine passenden Einträge.':'Alle vorhandenen Einträge sind bereits zugeordnet.'}</p>`;
}

function switchStepMenu(section,focus=false) {
  if(!STEP_MENUS.some(m=>m.id===section))return;
  syncEditor();editor.ui??={};editor.ui.section=section;refreshInspector(true);
  if(focus)$('#step-tab-'+section)?.focus();
}

function stepInspector() {
  ensureEditor();if(!editor)return '';
  editor.ui??={section:'general',resourceView:'list',attachDirection:'input',query:''};
  const s=editor.value,p=previewProcess(),before=predecessors(p,s.id),section=editor.ui.section;
  const candidates=p.steps.filter(x=>x.id!==s.id&&x.kind!=='goal'&&!p.edges.some(e=>e.from===x.id&&e.to===s.id)).filter(x=>validEditorEdges([...p.edges,{from:x.id,to:s.id}],false));
  const panel=(id,html)=>`<section id="step-panel-${id}" class="step-menu" role="tabpanel" aria-labelledby="step-tab-${id}" ${section!==id?'hidden':''}>${html}</section>`;
  const general=`<label>Bezeichnung<input name="title" value="${esc(s.title)}" required maxlength="200" placeholder="Schritt benennen"></label><div class="form-grid compact-grid"><label>Schritttyp<select name="kind" aria-label="Schritttyp" ${s.kind==='goal'?'disabled':''}>${formOptions(s.kind==='goal'?{goal:kinds.goal}:{input:kinds.input,activity:kinds.activity},s.kind)}</select></label><label>Verantwortlich<input name="owner" value="${esc(s.owner)}" maxlength="200" placeholder="Person oder Team"></label></div><label>Beschreibung<textarea name="description" rows="3" maxlength="10000" placeholder="Tätigkeit und Zweck">${esc(s.description)}</textarea></label><details class="general-extra" ${editor.ui.extraOpen?'open':''}><summary>Zeit & Notizen</summary><label>Bearbeitungszeit (Min.)<input name="minutes" type="number" min="0" max="100000" step="0.1" value="${s.minutes}"></label><label>Notizen & offene Fragen<textarea name="notes" rows="3" maxlength="10000">${esc(s.notes)}</textarea></label>${!editor.isNew&&s.kind!=='goal'?button('Schritt entfernen','delete-step','text-btn danger','trash'):''}</details>`;
  const connections=`<div class="menu-intro"><h3>Notwendige Vorgänger</h3><p>Alle verbundenen Vorgänger müssen erfüllt sein.</p></div><div id="prerequisites-section" class="connection-list">${before.map(x=>`<div><span>${icon('flow')}${esc(x.title||'Neuer Schritt')}</span><button type="button" class="icon-btn" data-action="unlink-predecessor" data-id="${x.id}" aria-label="Verbindung von ${esc(x.title)} lösen">${icon('close')}</button></div>`).join('')||'<p class="menu-empty">Noch keine Vorgänger.</p>'}</div>${candidates.length?`<label>Vorhandenen Schritt verbinden<select id="existing-predecessor" aria-label="Bestehender Vorgänger"><option value="">Schritt auswählen</option>${candidates.map(x=>`<option value="${x.id}">${esc(x.title||'Neuer Schritt')}</option>`).join('')}</select></label>${button('Verbinden','link-predecessor','secondary','link')}`:''}<div class="menu-separator"></div>${button('Neuen Vorgänger anlegen','add-step','secondary full','plus')}`;
  const potential=`<div class="menu-intro"><h3>Automatisierungspotenzial</h3><p>Fachliche Einschätzung dieses Schritts.</p></div><label>Potenzial<select name="potential" aria-label="Automatisierungspotenzial">${formOptions({unchecked:'Noch nicht bewertet',low:'Gering',medium:'Mittel',high:'Hoch'},s.assessment.potential)}</select></label><label>Arbeitscharakter<select name="character" aria-label="Arbeitscharakter">${formOptions({manual:'Manuelle Tätigkeit',rules:'Regelbasiert',judgment:'Fachliches Urteil'},s.assessment.character)}</select></label><label>Begründung & menschliche Kontrolle<textarea name="reason" rows="4" maxlength="10000" placeholder="Was lässt sich vereinfachen? Was erfordert eine menschliche Entscheidung?">${esc(s.assessment.reason)}</textarea></label>`;
  return `<aside class="step-editor" aria-label="Schritt bearbeiten">${inspectorHeader(s)}<form id="inline-step-form" novalidate><div class="step-editor-body">${pendingIntent?`<div class="unsaved-prompt" role="alert"><strong>Ungespeicherte Änderungen</strong><p>Vor dem Wechsel speichern oder verwerfen.</p><div class="button-row">${button('Speichern & wechseln','save-and-continue','primary')}${button('Verwerfen & wechseln','discard-and-continue','secondary')}${button('Hier bleiben','stay-editor','text-btn')}</div></div>`:''}<span class="inline-form-error" role="alert"></span>${panel('general',general)}${panel('resources',resourceMenu())}${panel('connections',connections)}${panel('potential',potential)}</div><footer class="step-editor-footer"><span class="draft-state ${editor.dirty?'dirty':''}" id="draft-state" role="status">${editor.dirty?'Ungespeichert':''}</span>${button(editor.isNew?'Abbrechen':'Zurücksetzen','reset-editor','ghost')}<button class="btn primary" type="submit">Speichern</button></footer></form></aside>`;
}
function refreshInspector(reset=false) {
  const current=$('.step-editor'),top=reset?0:$('.step-editor-body')?.scrollTop||0;
  if(current){current.outerHTML=inspector();$('.step-editor-body').scrollTop=top;}
}
function syncEditor() {
  const form=$('#inline-step-form');if(!form||!editor)return;
  const f=new FormData(form);Object.assign(editor.value,patchStepFields(editor.value,Object.fromEntries(f)));editor.value.input='';editor.value.output='';
  editor.ui??={section:'general',resourceView:'list'};
  if(form.querySelector('.general-extra'))editor.ui.extraOpen=form.querySelector('.general-extra').open;
  if(f.has('new-resource-name'))editor.resourceDraft={name:String(f.get('new-resource-name')||''),kind:f.get('new-resource-kind'),owner:String(f.get('new-resource-owner')||''),description:String(f.get('new-resource-description')||''),direction:f.get('new-resource-direction')};
  form.querySelectorAll('[data-edit-resource]').forEach(fields=>{
    const id=fields.dataset.editResource,r={...resource(id)};
    fields.querySelectorAll('[data-resource-field]').forEach(input=>r[input.dataset.resourceField]=input.value);
    const index=editor.resources.findIndex(x=>x.id===id);if(index>=0)editor.resources[index]=r;else {editor.resourceEdits??={};editor.resourceEdits[id]=r;}
  });
}
function markDirty() { editor.dirty=true;const label=$('#draft-state');if(label){label.textContent='Ungespeichert';label.classList.add('dirty');} }
function editorError(message) { const el=$('.inline-form-error');if(el){el.textContent=message;el.scrollIntoView({block:'nearest'});}else toast(message,true); }
function validEditorEdges(edges, report=true) {
  try {
    const w=structuredClone(workspace),p=previewProcess();p.edges=edges;
    const s=p.steps.find(x=>x.id===editor.value.id);s.title=s.title.trim()||'Neuer Vorgänger';
    w.processes[w.processes.findIndex(x=>x.id===p.id)]=p;w.resources.push(...editor.resources);validateWorkspace(w);return true;
  } catch(e){if(report)editorError(e.message);return false;}
}
function assignInlineResource(id,direction='input') {
  if(!id)return;syncEditor();editor.value.links=setLinkDirection(editor.value.links,id,direction);editor.ui.resourceView='list';markDirty();refreshInspector(true);refreshGraph();
}
function createInlineResource() {
  syncEditor();const nr=editor.resourceDraft||newResourceDraft(),name=nr.name.trim();
  if(!name){switchStepMenu('resources');editor.ui.resourceView='create';refreshInspector(true);editorError('Gib dem Eintrag einen Namen.');return false;}
  const r={id:uid(),name,kind:nr.kind,owner:nr.owner.trim(),description:nr.description.trim()};editor.resources.push(r);editor.value.links=setLinkDirection(editor.value.links,r.id,nr.direction);
  editor.resourceDraft=null;editor.ui.resourceView='list';markDirty();refreshInspector(true);refreshGraph();return true;
}
async function saveInlineStep() {
  if(!editor)return false;syncEditor();
  const form=$('#inline-step-form'),invalid=[...form.elements].find(e=>e.willValidate&&!e.validity.valid);
  if(invalid){const section=invalid.closest('[role="tabpanel"]')?.id.replace('step-panel-','')||'general';switchStepMenu(section);const target=$('#inline-step-form').elements[invalid.name];target?.closest('details')?.setAttribute('open','');target?.reportValidity();return false;}
  if(editor.resourceDraft&&(editor.resourceDraft.name.trim()||editor.resourceDraft.owner.trim()||editor.resourceDraft.description.trim()||editor.ui.resourceView==='create')&&!createInlineResource())return false;
  const bad=[...editor.resources,...Object.values(editor.resourceEdits||{})].find(r=>!r.name.trim());
  if(bad){editor.ui.section='resources';editor.ui.resourceView='edit';editor.ui.editingId=bad.id;refreshInspector(true);editorError('Gib dem Eintrag einen Namen.');return false;}
  const draft=structuredClone(editor),s=draft.value,ui=structuredClone(editor.ui);
  for(const k of ['title','description','owner','notes'])s[k]=s[k].trim();
  const pending=pendingIntent;
  const saved=await commit(w=>{w.resources.push(...draft.resources);for(const [id,r]of Object.entries(draft.resourceEdits||{})){const i=w.resources.findIndex(x=>x.id===id);if(i>=0)w.resources[i]=r;}const p=w.processes.find(x=>x.id===draft.processId);if(draft.isNew){const target=p.steps.find(x=>x.id===draft.targetId);if(target?.kind==='input')target.kind='activity';p.steps.push(s);}else p.steps[p.steps.findIndex(x=>x.id===s.id)]=s;p.edges=draft.edges;p.updatedAt=new Date().toISOString();},'Schritt gespeichert',()=>{selectedId=s.id;editor=null;pendingIntent=null;});
  if(saved){if(pending)executeIntent(pending);else {editor.ui=ui;refreshInspector(true);}}
  return saved;
}
function beginNewStep() {
  const target=process().steps.find(s=>s.id===selectedId);if(!target)return;
  const s=newStep('',target.kind==='input'?'input':'activity');
  editor={processId:currentId,value:s,resources:[],resourceEdits:{},edges:[...structuredClone(process().edges),{from:s.id,to:target.id}],isNew:true,targetId:target.id,dirty:true};selectedId=s.id;pane='step';render();requestAnimationFrame(()=>$('#inline-step-form input[name="title"]')?.focus({preventScroll:true}));
}
function executeIntent(intent) {
  const {action:a,id}=intent;
  if(a==='export')return exportDialog();
  if(a==='new-process')return processForm(true);
  editor=null;pendingIntent=null;processDraft=null;propertyDirty=false;
  if(a==='select-step'){selectedId=id;pane='step';render();}
  else if(a==='add-step'||a==='add-before'){if(id)selectedId=id;pane='step';beginNewStep();}
  else if(a==='open-process'||a==='open-step')openProcess(a==='open-step'?intent.process:id,a==='open-step'?id:undefined);
  else if(a==='edit-step'||a==='edit-step-id'||a==='assess-step'){nav='process';pane='step';selectedId=id||selectedId;render();if(a==='assess-step')switchStepMenu('potential');}
  else if(a==='edit-process'){pane='process';processDraft=structuredClone(process());render();}
  else if(a==='duplicate-process'){duplicateProcess();}
  else if(a==='close-pane'){pane=null;render();}
  else if(a==='export'){exportDialog();}
  else if(a==='new-process'){processForm(true);}
  else if(['home','overview','settings'].includes(a)){pane=null;nav=a==='home'?'overview':a;query='';render();}
}
async function duplicateProcess() {
  const p=structuredClone(process()),map=new Map();p.id=uid();p.title=(p.title+' (Kopie)').slice(0,200);p.updatedAt=new Date().toISOString();p.steps.forEach(s=>{const old=s.id;s.id=uid();map.set(old,s.id);});p.edges.forEach(e=>{e.from=map.get(e.from);e.to=map.get(e.to);});
  if(await commit(w=>w.processes.push(p),'Prozess dupliziert'))openProcess(p.id);
}
function requestIntent(intent) {
  if(propertyDirty){pendingPropertyIntent=intent;showModal(`${modalHeader('','Prozessangaben noch nicht gespeichert')}<div class="modal-content"><p>Änderungen vor dem Wechsel speichern oder verwerfen.</p></div><footer class="modal-footer">${button('Hier bleiben','close-modal','ghost')}${button('Verwerfen & wechseln','discard-properties','secondary')}${button('Speichern & wechseln','save-properties','primary')}</footer>`);return;}
  if(editor?.dirty){closeModal();syncEditor();pendingIntent=intent;refreshInspector();$('.unsaved-prompt')?.scrollIntoView({block:'nearest'});return;}
  executeIntent(intent);
}




function processForm(isNew=false) {
  if(!isNew)return requestIntent({action:'edit-process'});
  showModal(`${modalHeader('','Prozess anlegen')}<form id="process-form" data-new="true"><div class="modal-content form-grid"><label class="span-2">Prozessname<input name="title" required maxlength="200" placeholder="z. B. Kundenauftrag abwickeln"></label><label class="span-2">Prozessergebnis<input name="goal" required maxlength="200" placeholder="z. B. Der Kunde hat seine Bestellung erhalten"></label><label>Kategorie<input name="category" value="Allgemein" required maxlength="100"></label><label>Prozessverantwortung<input name="owner" maxlength="200"></label><label class="span-2">Zweck & Abgrenzung<textarea name="description" rows="3" maxlength="10000"></textarea></label></div>${modalFooter('Prozess erstellen')}</form>`);
}
function confirmDialog(title,text,action,id='',label='Bestätigen') { showModal(`${modalHeader('BITTE PRÜFEN',title)}<div class="modal-content"><p>${text}</p><span class="form-error" role="alert"></span></div><footer class="modal-footer">${button('Abbrechen','close-modal','ghost')}${button(label,action,'primary','check',`data-id="${id}"`)}</footer>`); }
function methodGuide() {
  showModal(`${modalHeader('DIE METHODE','Rückwärtsverkettung')}<div class="modal-content guide-content"><p class="guide-lead">Rückwärtsverkettung macht sichtbar, was ein Prozess wirklich braucht.</p>${[['01','Das Ergebnis definieren','Formuliere einen konkreten Endzustand, zum Beispiel: „Rechnung ist fehlerfrei bezahlt“. Woran erkennt man, dass das Ziel erreicht ist?'],['02','Die letzte Voraussetzung finden','Frage: „Was muss unmittelbar davor passiert sein?“ Ergänze diesen Schritt als Vorgänger. Müssen mehrere Bedingungen gemeinsam vorliegen, verbinde mehrere Vorgänger.'],['03','Bis zum Anfang zurückgehen','Wiederhole die Frage für jeden Vorgänger, bis du bei einem definierten Input oder Auslöser angekommen bist. Markiere ihn als Prozessanfang.'],['04','Wissen nachvollziehbar machen','Erfasse Verantwortung, Input, Output, Ressourcen und Software. Prüfe, ob jeder Schritt notwendig ist und ob Übergaben eindeutig sind.'],['05','Potenzial bewusst bewerten','Bewerte Aktivitäten manuell auf Automatisierungspotenzial. Halte Begründungen, Grenzen und notwendige menschliche Entscheidungen fest.']].map(([n,t,d])=>`<div class="guide-step"><span>${n}</span><div><h3>${t}</h3><p>${d}</p></div></div>`).join('')}<div class="notice">${icon('info')}Diese Version modelliert notwendige Voraussetzungen als gerichteten, kreisfreien Graphen. UND-Verknüpfungen sind möglich. Alternative Pfade (ODER), Schleifen und BPMN-Ausführung sind nicht Bestandteil dieser Version.</div></div><footer class="modal-footer">${button('Schließen','close-modal','primary','arrow')}</footer>`,true);
}
function exportOptions() {
  showModal(`${modalHeader('','Exportieren')}<div class="modal-content export-options"><button data-action="report-html">${icon('file')}<div><strong>Prozessdokumentation (.html)</strong><span>Vollständiger Bericht zum Weitergeben, ohne Bearbeitungsfunktionen.</span></div>${icon('right')}</button><button data-action="print">${icon('print')}<div><strong>Dokumentation drucken / PDF</strong><span>Bericht mit Schritten, Datenflüssen und Bewertungen.</span></div>${icon('right')}</button><button data-action="export-process">${icon('download')}<div><strong>Prozessdatei (.json)</strong><span>Vollständige Prozessdaten zum erneuten Importieren.</span></div>${icon('right')}</button><button data-action="csv">${icon('chart')}<div><strong>Schrittliste (.csv)</strong><span>Für Tabellenkalkulation und manuelle Auswertung.</span></div>${icon('right')}</button><button data-action="svg">${icon('flow')}<div><strong>Ablaufgrafik (.svg)</strong><span>Vertikale Prozessdarstellung für Präsentationen.</span></div>${icon('right')}</button></div>`);
}
function download(name,content,type) { const blob=new Blob([content],{type}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Export wurde heruntergeladen.'); }
const slug=s=>s.toLowerCase().replace(/[^a-z0-9äöüß]+/g,'-').replace(/^-|-$/g,'');
function exportProcess() { const p=process(),used=new Set(p.steps.flatMap(s=>s.links.map(l=>l.resourceId)));download(`${slug(p.title)}.json`,JSON.stringify({format:'rueckgrat-process',schemaVersion:1,process:p,resources:workspace.resources.filter(r=>used.has(r.id))},null,2),'application/json');closeModal(); }
function exportCsv() {
  const p=process();const rows=[['Prozess','Schritt','Typ','Verantwortung','Beschreibung','Input','Output','Minuten','Vorgänger (UND)','Software','Daten','Ressourcen','Arbeitscharakter','Automatisierungspotenzial','Begründung','Notizen']];
  ordered(p).forEach(s=>rows.push([p.title,s.title,kinds[s.kind],s.owner,s.description,linkedNames(s,'input'),linkedNames(s,'output'),s.minutes,predecessors(p,s.id).map(x=>x.title).join(' | '),...['software','data','resource'].map(k=>s.links.filter(l=>resource(l.resourceId).kind===k).map(l=>resource(l.resourceId).name+' ['+l.direction+']').join(' | ')),s.assessment.character,s.assessment.potential,s.assessment.reason,s.notes]));
  const cell=x=>{let v=String(x??'');if(/^[\s]*[=+@-]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};
  download(`${slug(p.title)}.csv`,'\ufeff'+rows.map(row=>row.map(cell).join(';')).join('\r\n'),'text/csv;charset=utf-8');closeModal();
}
function exportSvg() {
  const p=process(),{pos,w,h,nodeWidth,nodeHeight}=graphLayout(p);
  const wrap=(text,max=31,limit=2)=>{
    const lines=[''];for(const word of text.split(' ')){if((lines.at(-1)+' '+word).trim().length>max&&lines.at(-1))lines.push(word);else lines[lines.length-1]=(lines.at(-1)+' '+word).trim();}
    const result=lines.slice(0,limit);if(lines.length>limit)result[result.length-1]+=' …';return result;
  };
  const textLines=(text,x,y,size,color,max=31,limit=2)=>wrap(text,max,limit).map((line,i)=>`<text x="${x}" y="${y+i*16}" font-size="${size}" fill="${color}">${esc(line)}</text>`).join('');
  const xml=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h+95}" viewBox="0 0 ${w} ${h+95}"><rect width="100%" height="100%" fill="#f2f6fc"/><style>text{font-family:Arial,sans-serif}</style>${textLines(p.title,24,30,18,'#17375f',48,2)}<text x="24" y="72" font-size="11" fill="#4d6b92">Rewinde · Vertikaler Prozess · Vorgänger gelten gemeinsam (UND)</text><g transform="translate(0,95)"><defs><marker id="a" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7" fill="#7895bd"/></marker></defs>${p.edges.map(e=>{const a=pos[e.from],b=pos[e.to],x1=a.x+nodeWidth/2,y1=a.y+nodeHeight,x2=b.x+nodeWidth/2,y2=b.y-5;return `<path d="M${x1} ${y1} C${x1} ${y1+34} ${x2} ${y2-34} ${x2} ${y2}" fill="none" stroke="#7895bd" stroke-width="2" marker-end="url(#a)"/>`;}).join('')}${p.steps.map(s=>{const a=pos[s.id],dark=s.kind==='goal',color=dark?'#fff':'#17375f',muted=dark?'#d6e6ff':'#4c668b';return `<g transform="translate(${a.x},${a.y})"><rect width="${nodeWidth}" height="${nodeHeight}" rx="10" fill="${dark?'#17365f':'#fff'}" stroke="${dark?'#17365f':'#bdcde3'}"/><text x="16" y="25" font-size="10" fill="${muted}">${kinds[s.kind]}</text>${textLines(s.title,16,51,14,color,30,2)}<text x="16" y="93" font-size="10" fill="${muted}">${esc(s.owner.slice(0,38))}</text><line x1="16" y1="107" x2="244" y2="107" stroke="${dark?'#54729b':'#dce5f2'}"/><text x="16" y="130" font-size="9" fill="${muted}">INPUT</text>${textLines(linkedNames(s,'input')||'Nicht zugeordnet',62,130,10,muted,28,2)}<text x="16" y="175" font-size="9" fill="${muted}">OUTPUT</text>${textLines(linkedNames(s,'output')||'Nicht zugeordnet',62,175,10,muted,28,2)}</g>`;}).join('')}</g></svg>`;
  download(`${slug(p.title)}.svg`,xml,'image/svg+xml');closeModal();
}

function printProcess() {
  closeModal();$('#print-root').innerHTML=`<style media="print">${reportStyles}</style><main>${documentationMarkup(process(),workspace.resources)}</main>`;requestAnimationFrame(()=>window.print());
}
let pendingImport;
async function handleImport(file) {
  try {
    if(file.size>10*1024*1024)throw new Error('Die Importdatei darf höchstens 10 MB groß sein. Der enthaltene Arbeitsbereich darf 2 MB nicht überschreiten.');
    const data=JSON.parse(await file.text());
    if(data.format==='rueckgrat-process') {
      const w=stripLegacyStatuses({schemaVersion:1,processes:[data.process],resources:data.resources});validateWorkspace(w);migrateResourceFlows(w);validateWorkspace(w);
      pendingImport={type:'process',data:w};confirmDialog('Prozess importieren',`„${esc(data.process.title)}“ wird als neuer Prozess mit eigenen Ressourcen ergänzt. Vorhandene Daten bleiben erhalten.`,'confirm-import','','Prozess ergänzen');
    } else {
      const w=data.workspace||data;validateWorkspace(w);stripLegacyStatuses(w);migrateResourceFlows(w);validateWorkspace(w);pendingImport={type:'workspace',data:w};confirmDialog('Arbeitsbereich ersetzen?',`Die Datei enthält <strong>${w.processes.length} Prozesse</strong> und <strong>${w.resources.length} Ressourcen</strong>. Sie ersetzt den Arbeitsbereich in diesem Browser. Sichere den aktuellen Stand vorher per JSON-Export. Es gibt keine Sicherung auf dem Server.`,'confirm-import','','Arbeitsbereich ersetzen');
    }
  } catch(e) {toast(`Import nicht möglich: ${e.message}`,true);} finally {$('#import-file').value='';}
}
function remapProcess(w) {
  const data=structuredClone(w), map=new Map();
  data.resources.forEach(r=>{const old=r.id;r.id=uid();map.set(old,r.id);});
  const p=data.processes[0];p.id=uid();p.title=(p.title+' (Import)').slice(0,200);p.updatedAt=new Date().toISOString();
  p.steps.forEach(s=>{const old=s.id;s.id=uid();map.set(old,s.id);s.links.forEach(l=>l.resourceId=map.get(l.resourceId));});
  p.edges.forEach(e=>{e.from=map.get(e.from);e.to=map.get(e.to);});return data;
}
function searchDialog() { showModal(`${modalHeader('ARBEITSBEREICH DURCHSUCHEN','Suchen')}<div class="modal-content"><div class="input-icon large">${icon('search')}<input id="global-search" type="search" placeholder="Prozess, Schritt oder Ressource suchen …" autofocus></div><div id="search-results"></div></div>`);updateSearch('');requestAnimationFrame(()=>$('#global-search')?.focus()); }
function updateSearch(q) {
  const text=q.toLocaleLowerCase('de'), found=[];
  for(const p of workspace.processes){if(p.title.toLowerCase().includes(text))found.push({action:'open-process',id:p.id,title:p.title,sub:'Prozess · '+p.category});for(const s of p.steps)if(text&&s.title.toLowerCase().includes(text))found.push({action:'open-step',id:s.id,process:p.id,title:s.title,sub:p.title});}
  for(const r of workspace.resources)if(text&&r.name.toLowerCase().includes(text)){const p=workspace.processes.find(p=>p.steps.some(s=>s.links.some(l=>l.resourceId===r.id)));const s=p?.steps.find(s=>s.links.some(l=>l.resourceId===r.id));if(s)found.push({action:'open-step',id:s.id,process:p.id,title:r.name,sub:resourceKinds[r.kind]+' · '+p.title});}
  $('#search-results').innerHTML=found.slice(0,20).map(f=>`<button class="search-result" data-action="${f.action}" data-id="${f.id}" data-process="${f.process||''}"><span><strong>${esc(f.title)}</strong><small>${esc(f.sub)}</small></span>${icon('right')}</button>`).join('')||'<p class="muted">Keine passenden Einträge.</p>';
}
function openProcess(id,sid) {
  editor=null;pendingIntent=null;propertyDirty=false;processDraft=null;currentId=id;nav='process';zoom=1;pane=sid?'step':null;selectedId=sid||process().steps.find(s=>s.kind==='goal').id;closeModal();render();
}
document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action]');if(!el)return;
  event.preventDefault();const intent={...el.dataset},a=intent.action,id=intent.id;
  if(a==='close-modal'){pendingPropertyIntent=null;return closeModal();}
  if(a==='map-start'||a==='map-goal'){const p=previewProcess(),target=a==='map-goal'?p.steps.find(s=>s.kind==='goal'):ordered(p)[0];if(target&&(target.id!==selectedId||pane!=='step'))requestIntent({action:'select-step',id:target.id});return;}
  if(['home','overview','settings','open-process','open-step','select-step','add-step','add-before','edit-step','edit-step-id','assess-step','new-process','edit-process','close-pane','export','duplicate-process'].includes(a)){
    if(a==='select-step'&&id===selectedId&&pane==='step')return;
    if(a==='new-process'&&!editor?.dirty&&!propertyDirty){processForm(true);return;}
    return requestIntent(intent);
  }
  if(a==='save-and-continue')return saveInlineStep();
  if(a==='discard-and-continue'){
    const next=pendingIntent;if(editor?.isNew)selectedId=editor.targetId;editor=null;pendingIntent=null;render();if(next)executeIntent(next);return;
  }
  if(a==='stay-editor'){pendingIntent=null;refreshInspector();return;}
  if(a==='reset-editor'){if(editor?.isNew)selectedId=editor.targetId;editor=null;pendingIntent=null;render();return;}
  if(a==='create-inline-resource'){createInlineResource();return;}
  if(a==='pane-section'){switchStepMenu(intent.section);return;}
  if(['resource-picker','resource-new','resource-edit','resource-list'].includes(a)){syncEditor();editor.ui.section='resources';editor.ui.resourceView=({'resource-picker':'picker','resource-new':'create','resource-edit':'edit','resource-list':'list'})[a];if(a==='resource-edit')editor.ui.editingId=id;refreshInspector(true);return;}
  if(a==='resource-pick'){assignInlineResource(id,editor.ui.attachDirection||'input');return;}
  if(a==='unassign-resource'){
    syncEditor();editor.value.links=editor.value.links.filter(l=>l.resourceId!==id);editor.resources=editor.resources.filter(r=>r.id!==id);if(editor.resourceEdits)delete editor.resourceEdits[id];markDirty();refreshInspector();refreshGraph();return;
  }
  if(a==='link-predecessor'){
    syncEditor();const from=$('#existing-predecessor').value;if(!from)return;
    const edges=[...editor.edges,{from,to:selectedId}];if(validEditorEdges(edges)){editor.edges=edges;markDirty();refreshInspector();refreshGraph();}return;
  }
  if(a==='unlink-predecessor'){
    syncEditor();const edges=editor.edges.filter(e=>!(e.from===id&&e.to===selectedId));if(validEditorEdges(edges)){editor.edges=edges;markDirty();refreshInspector();refreshGraph();}return;
  }
  if(a==='connect-step'){switchStepMenu('connections');return;}
  if(a==='reset-process'){processDraft=null;propertyDirty=false;render();}
  else if(a==='discard-properties'){const next=pendingPropertyIntent;pendingPropertyIntent=null;processDraft=null;propertyDirty=false;closeModal();render();if(next)executeIntent(next);}
  else if(a==='save-properties'){closeModal();$('#process-form').requestSubmit();}
  else if(a==='report-html'){download(slug(process().title)+'-dokumentation.html',documentationFile(process(),workspace.resources),'text/html;charset=utf-8');closeModal();}
  else if(a==='guide')guide();
  else if(a==='privacy')privacyDialog();
  else if(a==='download-raw') { try { download('rewinde-browserdaten-wiederherstellung.json',browserStore.raw()||'','application/json'); } catch(e) { toast(e.message,true); } }
  else if(a==='clear-browser')confirmDialog('Browserdaten löschen?','Alle Prozesse, Ressourcen und Bewertungen dieser Website werden aus diesem Browser entfernt. Lade vorher eine JSON-Sicherung herunter. Exportierte Dateien bleiben erhalten.','confirm-clear-browser','','Browserdaten löschen');
  else if(a==='confirm-clear-browser'){
    try {const data=await browserStore.clear();workspace=data.workspace;revision=data.revision;editor=null;pendingIntent=null;currentId=null;selectedId=null;nav='overview';try{localStorage.removeItem('rueckgrat:view-mode');}catch{}pane=null;closeModal();render();toast('Browserdaten gelöscht');}catch(e){showError(e.message);}
  }
  else if(a==='search')searchDialog();
  else if(a==='export')exportDialog();
  else if(a==='export-process')exportProcess();
  else if(a==='export-workspace')download('rewinde-arbeitsbereich-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({format:'rueckgrat-workspace',exportedAt:new Date().toISOString(),workspace},null,2),'application/json');
  else if(a==='csv')csv();
  else if(a==='svg')svgExport();
  else if(a==='print')printProcess();
  else if(['zoom-in','zoom-out','zoom-reset','fit'].includes(a)){const layout=graphLayout(previewProcess()),viewport=$('#graph-viewport');zoom=a==='zoom-reset'?1:a==='fit'?Math.max(.3,Math.min(1,(viewport.clientWidth-48)/layout.w,(viewport.clientHeight-40)/layout.h)):Math.max(.3,Math.min(1.6,zoom+(a==='zoom-in'?.1:-.1)));fitGraph(true);}
  else if(a==='import')$('#import-file').click();
  else if(a==='delete-step')confirmDialog('Schritt entfernen?',`„${esc(step().title)}“ wird entfernt. Seine Vorgänger werden direkt mit den Nachfolgern verbunden. Gemeinsame Ressourcen bleiben erhalten.`,'confirm-delete-step',selectedId,'Schritt entfernen');
  else if(a==='confirm-delete-step')await commit(w=>{const p=w.processes.find(p=>p.id===currentId);removeStep(p,id);p.updatedAt=new Date().toISOString();},'Schritt entfernt',()=>{editor=null;pendingIntent=null;selectedId=process().steps.find(s=>s.kind==='goal').id;});
  else if(a==='delete-process')confirmDialog('Prozess löschen?',`„${esc(process().title)}“ wird mit allen Schritten und Bewertungen gelöscht. Gemeinsame Ressourcen bleiben erhalten.`,'confirm-delete-process',currentId,'Prozess löschen');
  else if(a==='confirm-delete-process')await commit(w=>{w.processes=w.processes.filter(p=>p.id!==id);},'Prozess gelöscht',()=>{editor=null;pendingIntent=null;});
  else if(a==='delete-resource'){
    const count=workspace.processes.flatMap(p=>p.steps).filter(s=>s.links.some(l=>l.resourceId===id)).length;
    confirmDialog('Eintrag löschen?',`„${esc(resource(id).name)}“ wird aus dem Verzeichnis und aus ${count} zugeordneten Schritten entfernt.`,'confirm-delete-resource',id,'Eintrag löschen');
  }
  else if(a==='confirm-delete-resource')await commit(w=>{w.resources=w.resources.filter(r=>r.id!==id);w.processes.forEach(p=>{let changed=false;p.steps.forEach(s=>{if(s.links.some(l=>l.resourceId===id))changed=true;s.links=s.links.filter(l=>l.resourceId!==id);});if(changed)p.updatedAt=new Date().toISOString();});},'Eintrag entfernt');
  else if(a==='confirm-import'&&pendingImport){const pending=pendingImport;if(pending.type==='workspace'){if(await commit(w=>{w.schemaVersion=1;w.processes=pending.data.processes;w.resources=pending.data.resources;},'Arbeitsbereich importiert',()=>{editor=null;pendingIntent=null;})){pendingImport=null;nav='overview';render();}}else{const data=remapProcess(pending.data);if(await commit(w=>{w.resources.push(...data.resources);w.processes.push(data.processes[0]);},'Prozess importiert')){pendingImport=null;openProcess(data.processes[0].id);}}}
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(!form.matches('form'))return;event.preventDefault();
  if(form.id==='inline-step-form')return saveInlineStep();
  const f=new FormData(form);
  if(form.id==='process-form'){
    const isNew=form.dataset.new==='true',base=isNew?{category:'Allgemein',description:'',owner:''}:process(),data=Object.fromEntries(['title','description','owner','category'].map(k=>[k,f.has(k)?String(f.get(k)||'').trim():base[k]]));
    if(isNew){const goal=newStep(String(f.get('goal')).trim(),'goal');goal.owner=data.owner;const p={...data,id:uid(),updatedAt:new Date().toISOString(),steps:[goal],edges:[]};if(await commit(w=>w.processes.unshift(p),'Prozess angelegt'))openProcess(p.id);}
    else {const next=pendingPropertyIntent;const saved=await commit(w=>{Object.assign(w.processes.find(p=>p.id===currentId),data,{updatedAt:new Date().toISOString()});},'Prozess gespeichert',()=>{propertyDirty=false;processDraft=null;pendingPropertyIntent=null;});if(saved&&next)executeIntent(next);}
  }

});
document.addEventListener('input',event=>{
  if(event.target.id==='resource-picker-search'){editor.ui.query=event.target.value;$('#resource-picker-results').innerHTML=resourcePickerRows(event.target.value);return;}
  if(event.target.matches('[data-ui-only]'))return;
  if(event.target.closest('#inline-step-form')){
    syncEditor();markDirty();
    if(['title','owner','description'].includes(event.target.name)||event.target.closest('[data-edit-resource]'))refreshGraph();
  }
  if(event.target.id==='global-search')updateSearch(event.target.value);
  if(event.target.id==='process-filter'){const start=event.target.selectionStart;query=event.target.value;render();const input=$('#process-filter');input.focus();input.setSelectionRange(start,start);}
});
document.addEventListener('change',event=>{
  if(event.target.id==='resource-picker-direction'){editor.ui.attachDirection=event.target.value;return;}
  if(event.target.matches('[data-ui-only]'))return;
  if(event.target.dataset.resourceDirection){
    syncEditor();const id=event.target.dataset.resourceDirection,direction=event.target.value;
    editor.value.links=setLinkDirection(editor.value.links,id,direction);
    markDirty();refreshGraph();
  } else if(event.target.closest('#inline-step-form')){syncEditor();markDirty();if(['kind','isStart'].includes(event.target.name)||event.target.closest('[data-edit-resource]'))refreshGraph();}
  if(event.target.id==='analysis-process'){currentId=event.target.value;selectedId=process().steps.find(s=>s.kind==='goal').id;editor=null;render();}
  if(event.target.id==='import-file'&&event.target.files[0])handleImport(event.target.files[0]);
});
document.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();searchDialog();}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'&&$('#inline-step-form')){event.preventDefault();saveInlineStep();}

});
window.addEventListener('beforeunload',event=>{if(editor?.dirty||propertyDirty){event.preventDefault();event.returnValue='';}});

$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){pendingPropertyIntent=null;closeModal();}}});
$('#modal').addEventListener('cancel',()=>{pendingPropertyIntent=null;});
try {
  browserStore=createBrowserStore(localStorage,navigator.locks);
  const data=browserStore.load();workspace=data.workspace;revision=data.revision;
  currentId=workspace.processes.find(p=>p.id===currentId)?.id||workspace.processes[0]?.id;selectedId=process()?.steps.find(s=>s.kind==='goal').id;render();
} catch(e) {workspace=emptyWorkspace();revision=0;$('#app').innerHTML=`<div class="load-error"><img src="/favicon.svg" alt="Rewinde"><h1>Browserdaten nicht verfügbar</h1><p>${esc(e.message)}</p><div class="button-row">${button('Browserdaten herunterladen','download-raw','secondary','download')}${button('JSON-Sicherung importieren','import','primary','upload')}<button class="btn secondary" id="reload">Erneut laden</button></div><p>Beim Import wird der vorhandene Browserstand erst nach deiner Bestätigung ersetzt.</p></div>`;$('#reload').addEventListener('click',()=>location.reload());}
window.addEventListener('storage',event=>{
  if(event.key===WORKSPACE_KEY||event.key===null)toast('Die Browserdaten wurden in einem anderen Tab geändert. Lade die Seite vor dem Weiterarbeiten neu.',true);
});

// Process properties share the canvas and participate in unsaved-change protection.
document.addEventListener('input',event=>{const form=event.target.closest('#process-form[data-new="false"]');if(form){processDraft={...process(),...Object.fromEntries(new FormData(form))};propertyDirty=true;$('#properties-state').textContent='Ungespeichert';}});
let drag=null;
document.addEventListener('pointerdown',event=>{const viewport=event.target.closest('#graph-viewport');if(!viewport||event.button!==0||event.target.closest('button'))return;drag={viewport,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(event.pointerId);viewport.classList.add('panning');});
document.addEventListener('pointermove',event=>{if(!drag)return;drag.viewport.scrollLeft=drag.left-(event.clientX-drag.x);drag.viewport.scrollTop=drag.top-(event.clientY-drag.y);});
const endPan=()=>{drag?.viewport.classList.remove('panning');drag=null;};document.addEventListener('pointerup',endPan);document.addEventListener('pointercancel',endPan);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#modal').open&&pane){event.preventDefault();requestIntent({action:'close-pane'});}});
window.addEventListener('beforeprint',()=>{if(process())$('#print-root').innerHTML='<style media="print">'+reportStyles+'</style><main>'+documentationMarkup(process(),workspace.resources)+'</main>';});

document.addEventListener('keydown',event=>{if(event.target.matches('.pane-navigation [role="tab"]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const index=STEP_MENUS.findIndex(m=>m.id===editor.ui.section),next=event.key==='Home'?0:event.key==='End'?STEP_MENUS.length-1:(index+(event.key==='ArrowRight'?1:STEP_MENUS.length-1))%STEP_MENUS.length;switchStepMenu(STEP_MENUS[next].id,true);}});
