import type {Studio} from './studio';
import type {SavedScene,SceneSnapshot,ViewPreferences,SceneFolder} from './studio-config';
import {downloadBlob,pngArchive} from './downloads';
import {exportManifest} from './export-naming';
export async function exportScenes(renderer:Studio,records:SavedScene[],current:SceneSnapshot,preferences:ViewPreferences,resolution:number,name:string,onProgress:(text:string)=>void,cancelled:()=>boolean,folders:SceneFolder[]=[],fallbackFolder=''){
 const files:{name:string;blob:Blob}[]=[],manifest=exportManifest(records,preferences.exportNaming,folders,fallbackFolder);
 try{
  for(let i=0;i<records.length;i++){
   if(cancelled())break;
   const record=records[i];onProgress('Rendering '+(i+1)+' / '+records.length+' · '+record.name);
   await renderer.restore(record.snapshot);await renderer.readyToRender();
   files.push({name:manifest.files[i],blob:await renderer.exportPNG(resolution,record.snapshot.transparent,record.snapshot.device,false)});
  }
  if(files.length){onProgress('Preparing ZIP…');const blob=await pngArchive(files),filename=manifest.archive;downloadBlob(blob,filename);return {count:files.length,blob,name:filename}}
  return null;
 }finally{await renderer.restore(current);renderer.setLightEdit(preferences.splitLights,preferences.selectedLight);renderer.setPreviewBackground(preferences.lightBackground)}
}
