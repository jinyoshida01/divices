import {AUTHORED_PRESETS,PRESET_REVISION,RETIRED_PRESETS,authoredSettings,authoredLighting} from './authored-presets';
import {DEVICES,type SceneSnapshot,type SavedScene,type SceneFolder} from './studio-config';

// Original numbering intentionally survives removal of scenes 08 and 11.
export const KIT_VIEWS=AUTHORED_PRESETS;
export function essentialsKit(device:string,_artwork:Pick<SceneSnapshot,'artwork'|'artworkName'>,color?:string){
 const info=DEVICES.find(d=>d.id===device);if(!info)throw new Error('Choose a device.');
 const folder:SceneFolder={id:crypto.randomUUID(),name:info.name+' · Essentials Kit',parentId:null,kitViews:KIT_VIEWS.length};
 const scenes:SavedScene[]=KIT_VIEWS.map((view,index)=>{
  const settings=authoredSettings(view,device);if(color)settings.deviceColor=color;
  return {id:crypto.randomUUID(),name:view.name,kitRevision:PRESET_REVISION,folderId:folder.id,created:Date.now()+index,updated:Date.now()+index,snapshot:{version:2,device,settings,camera:structuredClone(view.camera),transparent:true,resolution:4096,artwork:null,artworkName:'Green screen',hdri:null,hdriName:''}};
 });
 return {folder,scenes};
}
export function refreshEssentials(scenes:SavedScene[],folders:SceneFolder[]){
 const kitFolder=(scene:SavedScene)=>folders.some(f=>f.id===scene.folderId&&(f.kitViews!==undefined||f.name.toLowerCase().endsWith(' · essentials kit')));
 return scenes.filter(scene=>!((kitFolder(scene)||scene.kitRevision)&&RETIRED_PRESETS.includes(scene.name))).map(scene=>{
  const preset=KIT_VIEWS.find(v=>v.sourceId===scene.id||v.name===scene.name);
  if(!preset||(!kitFolder(scene)&&!scene.kitRevision&&preset.sourceId!==scene.id)||(scene.kitRevision??0)>=PRESET_REVISION)return scene;
  const lighting=authoredLighting(preset,scene.snapshot.device);
  return {...scene,kitRevision:PRESET_REVISION,snapshot:{...scene.snapshot,settings:{...scene.snapshot.settings,...lighting}}};
 });
}
