// Form patches may contain one menu only. Never clear fields from other menus.
export const STEP_MENUS = [{id:'general',label:'Allgemein'},{id:'resources',label:'Ressourcen'},{id:'connections',label:'Verbindungen'},{id:'potential',label:'Potenzial'}];
export function patchStepFields(step,fields) {
  const next=structuredClone(step);
  for(const key of ['title','description','owner','notes'])if(Object.hasOwn(fields,key))next[key]=String(fields[key]);
  if(fields.kind)next.kind=fields.kind;
  if(Object.hasOwn(fields,'minutes'))next.minutes=Number(fields.minutes);
  for(const [field,key]of [['character','character'],['potential','potential'],['reason','reason']])if(Object.hasOwn(fields,field))next.assessment[key]=String(fields[field]);
  return next;
}
export const newResourceDraft=()=>({name:'',kind:'data',owner:'',description:'',direction:'input'});
export function linkDirection(links,id) {
  const own=links.filter(l=>l.resourceId===id);
  return own.some(l=>l.direction==='input')&&own.some(l=>l.direction==='output')?'both':own.find(l=>l.direction!=='uses')?.direction||'uses';
}
export function setLinkDirection(links,id,direction) {
  if(!['input','output','both','uses'].includes(direction))throw new Error('Ungültige Verwendung.');
  return [...links.filter(l=>l.resourceId!==id),...(direction==='both'?['input','output']:[direction]).map(direction=>({resourceId:id,direction}))];
}
