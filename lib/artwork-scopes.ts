import type {SavedScene,SceneFolder} from './studio-config';
import {folderDescendants} from './scene-library';

export type ArtworkScope='current'|'selected'|'folder'|'device'|'all';
export interface ArtworkTarget {scope:ArtworkScope;sceneIds:string[];folderId:string;device:string;deviceIds?:string[]}
export interface ArtworkDraft {artwork:Blob|null;name:string;initialScope:ArtworkScope;sceneIds?:string[];deviceIds?:string[];deviceOnly?:boolean}

export function folderScenes(id:string,scenes:SavedScene[],folders:SceneFolder[]):SavedScene[] {
 const ids=folderDescendants(id,folders);
 return scenes.filter(s=>s.folderId&&ids.has(s.folderId));
}
export function selectionState(ids:string[],selected:Set<string>):boolean|'indeterminate' {
 const count=ids.filter(id=>selected.has(id)).length;
 return count===0?false:count===ids.length?true:'indeterminate';
}
export function toggleSceneGroup(ids:string[],selected:Set<string>):Set<string> {
 const next=new Set(selected),remove=ids.length>0&&ids.every(id=>next.has(id));
 for(const id of ids)remove?next.delete(id):next.add(id);
 return next;
}
export function artworkTargets(target:ArtworkTarget,scenes:SavedScene[],folders:SceneFolder[],activeScene:string):SavedScene[] {
 switch(target.scope){
  case 'current':return scenes.filter(s=>s.id===activeScene);
  case 'selected':return scenes.filter(s=>target.sceneIds.includes(s.id));
  case 'folder':return folderScenes(target.folderId,scenes,folders);
  case 'device':return scenes.filter(s=>(target.deviceIds??[target.device]).includes(s.snapshot.device));
  case 'all':return scenes;
 }
}
