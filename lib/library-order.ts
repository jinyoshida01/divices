import type {SavedScene,SceneFolder} from './studio-config';
export type SortMode='name'|'name-desc'|'newest'|'device';
export type LibraryDrop={kind:'scene'|'folder';ids:string[];targetKind:'scene'|'folder'|'root';targetId:string;placement:'before'|'after'|'inside'};
export const nameOrder=(a:{name:string},b:{name:string})=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
export const manualOrder=(a:{order?:number;name:string},b:{order?:number;name:string})=>(a.order??Number.MAX_SAFE_INTEGER)-(b.order??Number.MAX_SAFE_INTEGER)||nameOrder(a,b);
export function reorderLibrary(scenes:SavedScene[],folders:SceneFolder[],drop:LibraryDrop){
 const chosen=new Set(drop.ids),targetFolder=folders.find(f=>f.id===drop.targetId),targetScene=scenes.find(s=>s.id===drop.targetId);
 if(drop.targetKind!=='root'&&!(drop.targetKind==='folder'?targetFolder:targetScene))return {scenes,folders};
 if(drop.kind==='scene'){
  if(drop.targetKind==='scene'&&chosen.has(drop.targetId))return {scenes,folders};
  const parent=drop.targetKind==='root'?null:drop.targetKind==='scene'?targetScene!.folderId??null:targetFolder!.id;
  const moving=scenes.filter(s=>chosen.has(s.id)).sort(manualOrder),siblings=scenes.filter(s=>(s.folderId??null)===parent&&!chosen.has(s.id)).sort(manualOrder);
  let index=drop.targetKind==='scene'?siblings.findIndex(s=>s.id===drop.targetId)+(drop.placement==='after'?1:0):siblings.length;
  siblings.splice(Math.max(0,index),0,...moving);const positions=new Map(siblings.map((s,i)=>[s.id,i]));
  return {folders,scenes:scenes.map(s=>positions.has(s.id)?{...s,folderId:parent,order:positions.get(s.id)!}:s)};
 }
 if(drop.targetKind==='scene'||chosen.has(drop.targetId))return {scenes,folders};
 const parent=drop.targetKind==='root'?null:drop.placement==='inside'?targetFolder!.id:targetFolder!.parentId;
 // A folder may never be moved into itself or any of its descendants.
 let ancestor=parent;while(ancestor){if(chosen.has(ancestor))return {scenes,folders};ancestor=folders.find(f=>f.id===ancestor)?.parentId??null}
 const moving=folders.filter(f=>chosen.has(f.id)).sort(manualOrder),siblings=folders.filter(f=>f.parentId===parent&&!chosen.has(f.id)).sort(manualOrder);
 const index=drop.targetKind==='folder'&&drop.placement!=='inside'?siblings.findIndex(f=>f.id===drop.targetId)+(drop.placement==='after'?1:0):siblings.length;
 siblings.splice(Math.max(0,index),0,...moving);const positions=new Map(siblings.map((f,i)=>[f.id,i]));
 return {scenes,folders:folders.map(f=>positions.has(f.id)?{...f,parentId:parent,order:positions.get(f.id)!}:f)};
}
export function sortLibrary(scenes:SavedScene[],folders:SceneFolder[],mode:SortMode){
 const compare=(a:SavedScene,b:SavedScene)=>mode==='newest'?b.created-a.created||nameOrder(a,b):mode==='device'?a.snapshot.device.localeCompare(b.snapshot.device)||nameOrder(a,b):nameOrder(a,b)*(mode==='name-desc'?-1:1);
 const rankedScenes=new Map<string,number>(),rankedFolders=new Map<string,number>();
 for(const parent of new Set(scenes.map(s=>s.folderId??null)))scenes.filter(s=>(s.folderId??null)===parent).sort(compare).forEach((s,i)=>rankedScenes.set(s.id,i));
 for(const parent of new Set(folders.map(f=>f.parentId)))folders.filter(f=>f.parentId===parent).sort((a,b)=>nameOrder(a,b)*(mode==='name-desc'?-1:1)).forEach((f,i)=>rankedFolders.set(f.id,i));
 return {scenes:scenes.map(s=>({...s,order:rankedScenes.get(s.id)})),folders:folders.map(f=>({...f,order:rankedFolders.get(f.id)}))};
}
