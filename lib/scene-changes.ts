import type {SceneSnapshot} from './studio-config';
const hashes=new WeakMap<Blob,Promise<string>>();
async function hash(blob:Blob|null){if(!blob)return '';let result=hashes.get(blob);if(!result){result=blob.arrayBuffer().then(b=>crypto.subtle.digest('SHA-256',b)).then(b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join(''));hashes.set(blob,result)}return result}
export async function sameScene(a:SceneSnapshot,b:SceneSnapshot){
 const describe=async(s:SceneSnapshot)=>JSON.stringify({...s,artwork:await hash(s.artwork),hdri:await hash(s.hdri)},(_,v)=>typeof v==='number'?Math.round(v*1e6)/1e6:v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
 return await describe(a)===await describe(b);
}
export function newSceneSnapshot(snapshot:SceneSnapshot):SceneSnapshot{return {...snapshot,artwork:null,artworkName:'Green screen'}}
