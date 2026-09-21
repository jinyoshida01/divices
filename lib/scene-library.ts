import {defaultSettings,type SavedScene,type SceneFolder,type WorkspaceState,type SceneSnapshot,type Settings} from './studio-config';
import {manualOrder} from './library-order';
import {defaultExportNaming} from './export-naming';

// Keep the original database and record store so existing libraries migrate in place.
const DB='form-device-studios', RECORDS='studios';
export const defaultPreferences:WorkspaceState['preferences']={leftPanelWidth:0,compactScenes:false,lightBackground:false,splitLights:false,exportCollapsed:false,selectedLight:'key',leftTab:'scenes',rightTab:'lights',activeScene:'',exportNaming:defaultExportNaming};
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 const request=indexedDB.open(DB,2);
 request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(RECORDS))db.createObjectStore(RECORDS,{keyPath:'id'});if(!db.objectStoreNames.contains('folders'))db.createObjectStore('folders',{keyPath:'id'});if(!db.objectStoreNames.contains('workspace'))db.createObjectStore('workspace')};
 request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result)};request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Close other Divices tabs and reload to upgrade the library.'));
})}
async function transaction<T>(stores:string[],mode:IDBTransactionMode,work:(tx:IDBTransaction,set:(value:T)=>void)=>void):Promise<T>{const db=await database();return new Promise((resolve,reject)=>{let result:T;const tx=db.transaction(stores,mode);tx.oncomplete=()=>{db.close();resolve(result)};tx.onabort=()=>{db.close();reject(tx.error??new Error('Library changes could not be saved.'))};tx.onerror=()=>{};try{work(tx,v=>result=v)}catch(e){tx.abort();reject(e)}})}
export const normalizeSnapshot=(snapshot:SceneSnapshot):SceneSnapshot=>({...snapshot,settings:{...defaultSettings(),...snapshot.settings}});
// Check and seed in one transaction: concurrent tabs cannot create duplicate kits.
// A saved workspace also marks an intentionally emptied or imported library as existing.
export async function initializeLibrary(createKit:()=>{folder:SceneFolder;scenes:SavedScene[]}){
 return transaction<boolean>([RECORDS,'folders','workspace'],'readwrite',(tx,set)=>{
  const records=tx.objectStore(RECORDS),folders=tx.objectStore('folders'),workspace=tx.objectStore('workspace');
  const checks=[records.count(),folders.count(),workspace.count('current')];let remaining=checks.length;set(false);
  for(const request of checks)request.onsuccess=()=>{
   if(--remaining||checks.some(check=>check.result>0))return;
   const kit=createKit(),first=kit.scenes[0];if(!first)return;
   folders.put(kit.folder);for(const scene of kit.scenes)records.put(scene);
   workspace.put({current:first.snapshot,preferences:{...defaultPreferences,activeScene:first.id}},'current');set(true);
  };
 });
}
export async function readLibrary(){return transaction<{scenes:SavedScene[];folders:SceneFolder[];workspace:WorkspaceState}>([RECORDS,'folders','workspace'],'readonly',(tx,set)=>{
 const result={scenes:[] as SavedScene[],folders:[] as SceneFolder[],workspace:{current:null,preferences:defaultPreferences} as WorkspaceState};set(result);
 tx.objectStore(RECORDS).getAll().onsuccess=e=>{result.scenes=(e.target as IDBRequest).result.map((s:SavedScene)=>({...s,folderId:s.folderId??null,snapshot:normalizeSnapshot(s.snapshot)})).sort(manualOrder)};
 tx.objectStore('folders').getAll().onsuccess=e=>{result.folders=(e.target as IDBRequest).result.sort(manualOrder)};
 tx.objectStore('workspace').get('current').onsuccess=e=>{const value=(e.target as IDBRequest).result;if(value)result.workspace={current:value.current?normalizeSnapshot(value.current):null,preferences:{...defaultPreferences,...value.preferences},...(value.deviceArtworks?{deviceArtworks:value.deviceArtworks}:{})}};
 })}
export async function saveScene(name:string,snapshot:SceneSnapshot,existing?:SavedScene,folderId:string|null=null){const now=Date.now(),record:SavedScene={id:existing?.id??crypto.randomUUID(),name:name.trim().slice(0,80),created:existing?.created??now,updated:now,snapshot,folderId:existing?.folderId??folderId,...(existing?.order!==undefined?{order:existing.order}:{}),...(existing?.kitRevision!==undefined?{kitRevision:existing.kitRevision}:{})};if(!record.name)throw new Error('Give this scene a name.');await putScenes([record]);return record}
export async function putScenes(scenes:SavedScene[]){return transaction<void>([RECORDS],'readwrite',(tx)=>{for(const scene of scenes)tx.objectStore(RECORDS).put(scene)})}
export async function patchSceneArtwork(ids:string[],artwork:Blob|null,artworkName:string){return transaction<SavedScene[]>([RECORDS],'readwrite',(tx,set)=>{
 const updated:SavedScene[]=[];set(updated);const store=tx.objectStore(RECORDS);
 for(const id of new Set(ids))store.get(id).onsuccess=e=>{const scene=(e.target as IDBRequest).result as SavedScene|undefined;if(!scene)return;const record={...scene,updated:Date.now(),snapshot:{...scene.snapshot,artwork,artworkName}};store.put(record);updated.push(record)};
})}
export async function deleteScene(id:string){return transaction<void>([RECORDS],'readwrite',tx=>{tx.objectStore(RECORDS).delete(id)})}
export async function deleteScenes(ids:string[]){return transaction<void>([RECORDS],'readwrite',tx=>{for(const id of new Set(ids))tx.objectStore(RECORDS).delete(id)})}
export const ENVIRONMENT_KEYS=['environment','envIntensity','envRotation','envBackground','envBlur','hdriShapes'] as const;
export type EnvironmentSettings=Pick<Settings,typeof ENVIRONMENT_KEYS[number]>;
export const environmentSettings=(s:Settings):EnvironmentSettings=>({environment:s.environment,envIntensity:s.envIntensity,envRotation:s.envRotation,envBackground:s.envBackground,envBlur:s.envBlur,hdriShapes:structuredClone(s.hdriShapes)});
export async function patchSceneEnvironment(id:string,settings:EnvironmentSettings,hdri:Blob|null,hdriName:string){return transaction<SavedScene|undefined>([RECORDS],'readwrite',(tx,set)=>{const store=tx.objectStore(RECORDS);store.get(id).onsuccess=e=>{const record=(e.target as IDBRequest).result as SavedScene|undefined;if(!record){set(undefined);return}const updated={...record,snapshot:{...record.snapshot,settings:{...record.snapshot.settings,...settings},hdri,hdriName}};store.put(updated);set(updated)}})}
export function folderDescendants(id:string,folders:SceneFolder[]){const ids=new Set([id]);let size=0;while(size!==ids.size){size=ids.size;for(const f of folders)if(f.parentId&&ids.has(f.parentId))ids.add(f.id)}return ids}
export async function deleteFolderTree(id:string,removeContents:boolean){return transaction<{folders:SceneFolder[];scenes:SavedScene[]}>(['folders',RECORDS],'readwrite',(tx,set)=>{const folderStore=tx.objectStore('folders'),records=tx.objectStore(RECORDS);folderStore.getAll().onsuccess=e=>{const folders=(e.target as IDBRequest).result as SceneFolder[],ids=folderDescendants(id,folders);records.getAll().onsuccess=e=>{const scenes=((e.target as IDBRequest).result as SavedScene[]).filter(s=>s.folderId&&ids.has(s.folderId));for(const folderId of ids)folderStore.delete(folderId);for(const scene of scenes){if(removeContents)records.delete(scene.id);else records.put({...scene,folderId:null})}set({folders:folders.filter(f=>ids.has(f.id)),scenes})}}})}
export async function restoreFolderTree(removed:{folders:SceneFolder[];scenes:SavedScene[]}){return transaction<void>(['folders',RECORDS],'readwrite',tx=>{for(const f of removed.folders)tx.objectStore('folders').put(f);for(const s of removed.scenes){const store=tx.objectStore(RECORDS);store.get(s.id).onsuccess=e=>{const current=(e.target as IDBRequest).result as SavedScene|undefined;store.put(current?{...current,folderId:s.folderId}:s)}}})}
export async function putFolder(folder:SceneFolder){if(!folder.name.trim())throw new Error('Give this folder a name.');return transaction<void>(['folders'],'readwrite',tx=>{tx.objectStore('folders').put({...folder,name:folder.name.trim().slice(0,80)})})}
export async function putKit(folder:SceneFolder,scenes:SavedScene[]){return transaction<void>([RECORDS,'folders'],'readwrite',tx=>{tx.objectStore('folders').put(folder);for(const scene of scenes)tx.objectStore(RECORDS).put(scene)})}
export async function saveWorkspace(workspace:WorkspaceState){return transaction<void>(['workspace'],'readwrite',tx=>{tx.objectStore('workspace').put(workspace,'current')})}
export async function replaceLibrary(library:{scenes:SavedScene[];folders:SceneFolder[];workspace:WorkspaceState}){return transaction<void>([RECORDS,'folders','workspace'],'readwrite',tx=>{for(const store of [RECORDS,'folders','workspace'])tx.objectStore(store).clear();for(const scene of library.scenes)tx.objectStore(RECORDS).put(scene);for(const folder of library.folders)tx.objectStore('folders').put(folder);tx.objectStore('workspace').put(library.workspace,'current')})}

export async function moveScenesToFolder(ids:string[],folderId:string|null){return transaction<number>([RECORDS,'folders'],'readwrite',(tx,set)=>{
 const move=()=>{let count=0;set(count);const store=tx.objectStore(RECORDS);for(const id of new Set(ids))store.get(id).onsuccess=e=>{const scene=(e.target as IDBRequest).result as SavedScene|undefined;if(scene&&(scene.folderId??null)!==folderId){store.put({...scene,folderId,updated:Date.now()});set(++count)}}};
 if(folderId){tx.objectStore('folders').get(folderId).onsuccess=e=>{if(!(e.target as IDBRequest).result){tx.abort();return}move()}}else move();
})}
export async function saveFolderWithScenes(folder:SceneFolder,ids:string[]){
 if(!folder.name.trim())throw new Error('Give this folder a name.');
 return transaction<void>(['folders',RECORDS],'readwrite',tx=>{
  tx.objectStore('folders').put({...folder,name:folder.name.trim().slice(0,80)});
  const store=tx.objectStore(RECORDS);for(const id of new Set(ids))store.get(id).onsuccess=e=>{const scene=(e.target as IDBRequest).result as SavedScene|undefined;if(scene)store.put({...scene,folderId:folder.id,updated:Date.now()})};
 });
}

// Delete the entire selection atomically so one Undo restores the folder tree.
export async function deleteLibrarySelection(sceneIds:string[],folderIds:string[]){return transaction<{folders:SceneFolder[];scenes:SavedScene[]}>(['folders',RECORDS],'readwrite',(tx,set)=>{const fs=tx.objectStore('folders'),ss=tx.objectStore(RECORDS);fs.getAll().onsuccess=e=>{const folders=(e.target as IDBRequest).result as SceneFolder[],ids=new Set(folderIds.flatMap(id=>[...folderDescendants(id,folders)]));ss.getAll().onsuccess=e=>{const chosen=new Set(sceneIds),scenes=((e.target as IDBRequest).result as SavedScene[]).filter(s=>chosen.has(s.id)||!!s.folderId&&ids.has(s.folderId));for(const id of ids)fs.delete(id);for(const scene of scenes)ss.delete(scene.id);set({folders:folders.filter(f=>ids.has(f.id)),scenes})}}})}

export async function applyEssentialsUpdate(scenes:SavedScene[],folders:SceneFolder[],removedIds:string[]){return transaction<void>([RECORDS,'folders'],'readwrite',tx=>{for(const id of removedIds)tx.objectStore(RECORDS).delete(id);for(const scene of scenes)tx.objectStore(RECORDS).put(scene);for(const folder of folders)tx.objectStore('folders').put(folder)})}

export async function saveLibraryOrder(scenes:SavedScene[],folders:SceneFolder[]){return applyEssentialsUpdate(scenes,folders,[])}

export async function renameSceneRecord(id:string,name:string){
 const trimmed=name.trim().slice(0,80);if(!trimmed)throw new Error('Give this scene a name.');
 return transaction<void>([RECORDS],'readwrite',tx=>{const store=tx.objectStore(RECORDS);store.get(id).onsuccess=e=>{const scene=(e.target as IDBRequest).result as SavedScene|undefined;if(scene)store.put({...scene,name:trimmed,updated:Date.now()})}});
}
