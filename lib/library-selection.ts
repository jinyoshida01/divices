import type {SavedScene,SceneFolder} from './studio-config';
import {folderDescendants} from './scene-library';
export interface LibrarySelection {scenes:Set<string>;folders:Set<string>}
export function toggleLibraryFolder(id:string,selection:LibrarySelection,scenes:SavedScene[],folders:SceneFolder[]):LibrarySelection {
 const descendants=folderDescendants(id,folders),next={scenes:new Set(selection.scenes),folders:new Set(selection.folders)},remove=next.folders.has(id);
 for(const folder of descendants)remove?next.folders.delete(folder):next.folders.add(folder);
 for(const scene of scenes)if(scene.folderId&&descendants.has(scene.folderId))remove?next.scenes.delete(scene.id):next.scenes.add(scene.id);
 if(remove)for(const parent of next.folders)if(folderDescendants(parent,folders).has(id))next.folders.delete(parent);
 return next;
}
export function toggleLibraryScene(id:string,selection:LibrarySelection,scenes:SavedScene[],folders:SceneFolder[]):LibrarySelection {
 const next={scenes:new Set(selection.scenes),folders:new Set(selection.folders)},remove=next.scenes.has(id);
 if(remove){next.scenes.delete(id);const folderId=scenes.find(s=>s.id===id)?.folderId;if(folderId)for(const folder of next.folders)if(folderDescendants(folder,folders).has(folderId))next.folders.delete(folder)}else next.scenes.add(id);
 return next;
}
