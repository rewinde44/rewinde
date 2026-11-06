import { validateWorkspace, migrateResourceFlows, stripLegacyStatuses } from './domain.js';

export const WORKSPACE_KEY = 'rueckgrat:workspace:v1';
export const emptyWorkspace = () => ({ schemaVersion:1, processes:[], resources:[] });
const conflict = () => new Error('Der Arbeitsbereich wurde in einem anderen Tab geändert. Lade die Seite neu, bevor du speicherst. Noch nicht gespeicherte Änderungen bleiben hier sichtbar.');
const storageError = e => new Error(e?.name === 'QuotaExceededError'
  ? 'Der Browser-Speicher ist voll. Die Änderung wurde nicht gespeichert. Exportiere deinen Arbeitsbereich und schaffe Speicherplatz.'
  : 'Der Browser erlaubt keine dauerhafte Speicherung. Prüfe die Website-Einstellungen. Bereits gespeicherte Daten werden nicht ersetzt.');

// One record makes each write atomic; Web Locks serialize same-origin tabs.
export function createBrowserStore(storage, locks) {
  let baseline, damaged=false;
  function readRaw() { try { return storage.getItem(WORKSPACE_KEY); } catch(e) { throw storageError(e); } }
  function decode(raw) {
    if (raw === null) return { revision:0, workspace:emptyWorkspace() };
    try {
      const data = JSON.parse(raw);
      if (!Number.isSafeInteger(data.revision) || data.revision < 1) throw new Error();
      validateWorkspace(data.workspace);
      migrateResourceFlows(data.workspace);
      stripLegacyStatuses(data.workspace);
      validateWorkspace(data.workspace);
      return data;
    } catch { throw new Error('Die Browserdaten sind beschädigt oder haben ein unbekanntes Format. Sie wurden nicht überschrieben. Lade sie zur Wiederherstellung herunter oder importiere eine gültige JSON-Sicherung.'); }
  }
  function load() { baseline=readRaw(); try { const data=decode(baseline); damaged=false; return data; } catch(e) { damaged=true; throw e; } }
  async function save(workspace, revision) {
    validateWorkspace(workspace);
    if (!locks?.request) throw new Error('Dieser Browser unterstützt die sichere Speicherung nicht. Verwende einen aktuellen Browser über HTTPS oder localhost.');
    return locks.request(WORKSPACE_KEY, () => {
      const raw=readRaw();
      if (raw !== baseline || (damaged ? revision !== 0 : decode(raw).revision !== revision)) throw conflict();
      const data={revision:revision+1,workspace:stripLegacyStatuses(structuredClone(workspace))}, serialized=JSON.stringify(data);
      if (new TextEncoder().encode(JSON.stringify(workspace)).length > 2*1024*1024) throw new Error('Der Arbeitsbereich überschreitet 2 MB. Exportiere einzelne Prozesse und verkleinere den Arbeitsbereich.');
      try { storage.setItem(WORKSPACE_KEY,serialized); } catch(e) { throw storageError(e); }
      baseline=serialized; damaged=false;
      return data;
    });
  }
  async function clear() {
    if (!locks?.request) throw new Error('Sichere Speicherung ist nicht verfügbar.');
    return locks.request(WORKSPACE_KEY, () => {
      if (readRaw() !== baseline) throw conflict();
      try { storage.removeItem(WORKSPACE_KEY); } catch(e) { throw storageError(e); }
      baseline=null;
      return {revision:0,workspace:emptyWorkspace()};
    });
  }
  return {load,save,clear,raw:readRaw};
}
