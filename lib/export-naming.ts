import {DEVICES,type SavedScene,type SceneFolder} from './studio-config';
export interface ExportNaming {mode:'number'|'scene-name'|'device-number'|'custom';prefix:string;folder:string}
export const defaultExportNaming:ExportNaming={mode:'number',prefix:'',folder:''};
export const filenamePart=(value:string,fallback='Scene')=>value.normalize('NFKC').replace(/[^a-zA-Z0-9 _-]/g,'').trim().replace(/[\s_]+/g,'_').slice(0,100)||fallback;
export const deviceExportFolder=(device:string)=>filenamePart(DEVICES.find(d=>d.id===device)?.name??device)+'_EK';
export function imageFilename(record:Pick<SavedScene,'name'|'snapshot'>|undefined,index:number,naming:ExportNaming,device:string){
 const number=(record?.name.match(/^(\d+)\s*(?:[·.\-]|$)/)?.[1]??String(index+1)).padStart(2,'0');
 const label=filenamePart(record?.name??'Scene');
 const stem=naming.mode==='scene-name'?label:naming.mode==='device-number'?filenamePart(DEVICES.find(d=>d.id===device)?.name??device)+'_'+number:naming.mode==='custom'?filenamePart(naming.prefix,'Scene')+'_'+number:number;
 return stem+'.png';
}
export const folderFilenamePrefix=(name:string)=>filenamePart(name,'Scenes').replace(/[_\s]+/g,'-');
export function exportManifest(records:SavedScene[],naming:ExportNaming,folders:SceneFolder[]=[],fallbackFolder=''){
 const devices=new Set(records.map(s=>s.snapshot.device)),folder=filenamePart(naming.folder,devices.size===1?deviceExportFolder(records[0].snapshot.device):'Divices_Scenes');
 const used=new Set<string>();
 const files=records.map((record,i)=>{const sourceFolder=folders.find(f=>f.id===record.folderId)?.name??fallbackFolder;const prefix=records.length>1&&sourceFolder?folderFilenamePrefix(sourceFolder)+'_':'';const original=prefix+imageFilename(record,i,naming,record.snapshot.device);let name=original,suffix=2;while(used.has(name.toLowerCase()))name=original.slice(0,-4)+'_'+(suffix++)+'.png';used.add(name.toLowerCase());return folder+'/'+name});
 return {folder,archive:folder+'.zip',files};
}
