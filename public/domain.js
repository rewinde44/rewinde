export const uid = () => globalThis.crypto.randomUUID();
export const kinds = { input: 'Prozessanfang', activity: 'Aktivität', goal: 'Ergebnis' };
export const resourceKinds = { software: 'Software', data: 'Daten', resource: 'Ressource' };
export function stripLegacyStatuses(w) {
  for (const p of w.processes) { delete p.status; for (const s of p.steps) delete s.status; }
  return w;
}
export function hasOutput(s) { return s.links.some(l => l.direction === 'output') || Boolean(s.output?.trim()); }
// Convert older free-text inputs/outputs into shared data entries without losing content.
// Empty legacy fields remain in schema 1 for compatibility with existing exports.
export function migrateResourceFlows(w) {
  let changed = false;
  for (const p of w.processes) for (const s of p.steps) {
    for (const direction of ['input', 'output']) {
      const text = s[direction]?.trim();
      if (!text) continue;
      let r = w.resources.find(r => r.kind === 'data' && (r.description === text || r.name === text));
      if (!r) {
        r = { id: uid(), name: text.slice(0, 200), kind: 'data', owner: s.owner.slice(0, 200), description: text };
        w.resources.push(r);
      }
      if (!s.links.some(l => l.resourceId === r.id && l.direction === direction)) s.links.push({ resourceId: r.id, direction });
      s[direction] = ''; changed = true;
    }
  }
  return changed;
}
export function verticalLayout(p, { nodeHeight = 218, gapY = 68, nodeWidth = 260, gapX = 32, paddingTop = 30 } = {}) {
  const depths = new Map();
  function depth(id) {
    if (depths.has(id)) return depths.get(id);
    const next = successors(p, id);
    const d = next.length ? 1 + Math.max(...next.map(s => depth(s.id))) : 0;
    depths.set(id, d); return d;
  }
  p.steps.forEach(s => depth(s.id));
  const max = Math.max(...depths.values());
  const rows = Array.from({length: max + 1}, (_, i) => p.steps.filter(s => depths.get(s.id) === max - i));
  const w = Math.max(360, Math.max(...rows.map(r => r.length)) * (nodeWidth + gapX) - gapX + 56);
  const h = rows.length * (nodeHeight + gapY) + paddingTop + 28;
  const pos = {};
  rows.forEach((row, i) => row.forEach((s, j) => {
    pos[s.id] = { x: (w - (row.length * (nodeWidth + gapX) - gapX)) / 2 + j * (nodeWidth + gapX), y: paddingTop + i * (nodeHeight + gapY) };
  }));
  return {pos, w, h, rows, nodeWidth, nodeHeight};
}
export function predecessors(p, id) { return p.edges.filter(e => e.to === id).map(e => p.steps.find(s => s.id === e.from)); }
export function successors(p, id) { return p.edges.filter(e => e.from === id).map(e => p.steps.find(s => s.id === e.to)); }
export function ordered(p) {
  const depths = new Map();
  function depth(id) {
    if (depths.has(id)) return depths.get(id);
    const next = p.edges.filter(e => e.from === id);
    const d = next.length ? 1 + Math.max(...next.map(e => depth(e.to))) : 0;
    depths.set(id, d); return d;
  }
  p.steps.forEach(s => depth(s.id));
  return [...p.steps].sort((a, b) => depths.get(b.id) - depths.get(a.id) || p.steps.indexOf(a) - p.steps.indexOf(b));
}
export function coverage(p) {
  const complete = p.steps.filter(s => s.title.trim() && s.description.trim() && s.owner.trim() && hasOutput(s)).length;
  return { complete, total: p.steps.length, percent: Math.round(complete / p.steps.length * 100) };
}
export function findings(p) {
  const out = [];
  if (!p.steps.some(s => s.kind === 'input')) out.push({ title: 'Prozessanfang fehlt', text: 'Verfolge die Voraussetzungen zurück bis zu einem konkreten Input.', step: p.steps.find(s => !predecessors(p, s.id).length)?.id });
  for (const s of p.steps) {
    const missing = [!s.description.trim() && 'Beschreibung', !s.owner.trim() && 'Verantwortung', !hasOutput(s) && 'Output-Zuordnung'].filter(Boolean);
    if (missing.length) out.push({ title: s.title, text: `Noch offen: ${missing.join(', ')}.`, step: s.id });
    if (s.kind === 'activity' && !s.links.length) out.push({ title: s.title, text: 'Ressourcen, Software oder Daten noch nicht erfasst.', step: s.id });
  }
  return out;
}
export function validateWorkspace(w) {
  const fail = message => { throw new Error(message); };
  const str = (s, n = 10000) => typeof s === 'string' && s.length <= n;
  if (!w || w.schemaVersion !== 1 || !Array.isArray(w.processes) || w.processes.length > 100 || !Array.isArray(w.resources) || w.resources.length > 1000) fail('Ungültiges Arbeitsbereichsformat (Schema 1 erwartet).');
  const allIds = new Set();
  const checkId = id => { if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) || allIds.has(id)) fail('IDs müssen eindeutig sein und dürfen nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten.'); allIds.add(id); };
  for (const r of w.resources) {
    checkId(r.id);
    if (!str(r.name, 200) || !r.name.trim() || !Object.hasOwn(resourceKinds,r.kind) || !str(r.description) || !str(r.owner, 200)) fail('Ungültiger Ressourceneintrag.');
  }
  const resources = new Set(w.resources.map(r => r.id));
  for (const p of w.processes) {
    checkId(p.id);
    if (!str(p.title, 200) || !p.title.trim() || !str(p.description) || !str(p.owner, 200) || !str(p.category, 100) || !str(p.updatedAt, 100) || !Number.isFinite(Date.parse(p.updatedAt))) fail('Ungültige Prozessangaben.');
    if (!Array.isArray(p.steps) || !p.steps.length || p.steps.length > 100 || !Array.isArray(p.edges) || p.edges.length > 500) fail('Ein Prozess benötigt 1 bis 100 Schritte.');
    const ids = new Set(p.steps.map(s => s.id));
    if (p.steps.filter(s => s.kind === 'goal').length !== 1) fail('Jeder Prozess benötigt genau ein finales Ergebnis.');
    for (const s of p.steps) {
      checkId(s.id);
      if (!Object.hasOwn(kinds,s.kind) || !str(s.title, 200) || !s.title.trim() || !['description','owner','input','output','notes'].every(k => str(s[k]))) fail('Ungültiger Prozessschritt.');
      if (!Number.isFinite(s.minutes) || s.minutes < 0 || s.minutes > 100000) fail('Dauer muss zwischen 0 und 100.000 Minuten liegen.');
      if (!Array.isArray(s.links) || s.links.length > 100 || s.links.some(l => !resources.has(l.resourceId) || !['uses','input','output'].includes(l.direction)) || new Set(s.links.map(l => l.resourceId + l.direction)).size !== s.links.length) fail('Ungültige Ressourcenzuordnung.');
      if (!s.assessment || !['unchecked','low','medium','high'].includes(s.assessment.potential) || !str(s.assessment.reason) || !['manual','rules','judgment'].includes(s.assessment.character)) fail('Ungültige manuelle Bewertung.');
    }
    const pairs = new Set();
    for (const e of p.edges) {
      if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to || pairs.has(e.from + ':' + e.to)) fail('Ungültige oder doppelte Verbindung.');
      pairs.add(e.from + ':' + e.to);
      if (p.steps.find(s => s.id === e.from).kind === 'goal') fail('Das finale Ergebnis darf keinen Nachfolger haben.');
      if (p.steps.find(s => s.id === e.to).kind === 'input') fail('Ein Prozessanfang darf keinen Vorgänger haben.');
    }
    const visiting = new Set(), visited = new Set();
    function visit(id) {
      if (visiting.has(id)) fail('Diese Verbindung würde einen Kreislauf erzeugen.');
      if (visited.has(id)) return;
      visiting.add(id);
      const next = p.edges.filter(e => e.from === id);
      if (!next.length && p.steps.find(s => s.id === id).kind !== 'goal') fail('Jeder Schritt muss zum finalen Ergebnis beitragen.');
      next.forEach(e => visit(e.to)); visiting.delete(id); visited.add(id);
    }
    p.steps.forEach(s => visit(s.id));
  }
  return w;
}
export function newStep(title, kind = 'activity') {
  return { id: uid(), title, kind, description: '', owner: '', input: '', output: '', notes: '', minutes: 0, links: [], assessment: { potential: 'unchecked', reason: '', character: 'manual' } };
}
export function removeStep(p, id) {
  const s = p.steps.find(s => s.id === id);
  if (!s || s.kind === 'goal') throw new Error('Das finale Ergebnis kann nicht entfernt werden.');
  const before = predecessors(p, id), after = successors(p, id);
  p.steps = p.steps.filter(s => s.id !== id);
  p.edges = p.edges.filter(e => e.from !== id && e.to !== id);
  for (const a of before) for (const b of after) if (!p.edges.some(e => e.from === a.id && e.to === b.id)) p.edges.push({ from: a.id, to: b.id });
}
