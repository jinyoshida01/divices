import {defaultSettings,DEVICES,type SceneSnapshot,type SavedScene,type SceneFolder,type WorkspaceState,type DeviceArtworks,type Settings} from './studio-config';
import {defaultPreferences} from './scene-library';
export interface SceneLibrary {scenes:SavedScene[];folders:SceneFolder[];workspace:WorkspaceState}
interface Asset {type:string;data:string}
export async function encodeBackup(library:SceneLibrary){
 const assets:Record<string,Asset>={},cache=new WeakMap<Blob,string>();
 async function asset(blob:Blob|null){if(!blob)return null;const known=cache.get(blob);if(known)return known;const data=await blob.arrayBuffer(),hash=await crypto.subtle.digest('SHA-256',data),id=Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('');cache.set(blob,id);if(!assets[id]){let text='';const bytes=new Uint8Array(data);for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));assets[id]={type:blob.type,data:btoa(text)}}return id}
 async function snapshot(value:SceneSnapshot){return {...value,artwork:await asset(value.artwork),hdri:await asset(value.hdri)}}
 const scenes=[];for(const value of library.scenes)scenes.push({...value,snapshot:await snapshot(value.snapshot)});
 const current=library.workspace.current?await snapshot(library.workspace.current):null;
 const deviceArtworks:Record<string,{artwork:string|null;artworkName:string}>={};
 for(const [id,value] of Object.entries(library.workspace.deviceArtworks??{}))deviceArtworks[id]={artwork:await asset(value.artwork),artworkName:value.artworkName};
 return new Blob([JSON.stringify({format:'divices-backup',version:1,created:new Date().toISOString(),scenes,folders:library.folders,workspace:{...library.workspace,current,...(library.workspace.deviceArtworks?{deviceArtworks}:{})},assets})],{type:'application/json'});
}
export async function decodeBackup(file:Blob):Promise<SceneLibrary>{
 if(file.size>350*1024*1024)throw new Error('Backup exceeds 350 MB.');
 const data=JSON.parse(await file.text());
 const fail=()=>{throw new Error('This is not a valid Divices backup.')};
 if(!data||data.format!=='divices-backup'||data.version!==1||!Array.isArray(data.scenes)||data.scenes.length>2000||!Array.isArray(data.folders)||data.folders.length>500||!data.assets||typeof data.assets!=='object')fail();
 const text=(value:unknown,max=200)=>{if(typeof value!=='string'||value.length>max)fail();return value as string};
 const number=(value:unknown,min:number,max:number)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail();return value as number};
 const vector=(value:unknown)=>{if(!Array.isArray(value)||value.length!==3)fail();return (value as unknown[]).map(v=>number(v,-10000,10000)) as [number,number,number]};
 const color=(value:unknown)=>{if(typeof value!=='string'||!/^#[\da-f]{6}$/i.test(value))fail();return value as string};
 const assets=new Map<string,Blob>();let assetBytes=0;
 for(const [id,value] of Object.entries(data.assets)){const item=value as Asset;const type=text(item?.type,100),raw=atob(text(item?.data,100*1024*1024));assetBytes+=raw.length;if(raw.length>50*1024*1024||assetBytes>250*1024*1024)fail();const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));assets.set(id,new Blob([bytes],{type}))}
 const getAsset=(id:unknown)=>{if(id===null)return null;if(typeof id!=='string'||!assets.has(id))fail();return assets.get(id as string)!};
 const settings=(raw:unknown):Settings=>{
  if(!raw||typeof raw!=='object')fail();const value=raw as Record<string,unknown>,s=defaultSettings();
  const enums={finish:['satin','polished','matte'],environment:['none','softbox','strip','daylight','screen-soft','contour','studio-hdri','custom'],toneMapping:['aces','agx','neutral'],vfx:['none','flare','anamorphic','sparkles','bokeh']};
  for(const [key,options] of Object.entries(enums)){const v=value[key]??s[key as keyof Settings];if(!options.includes(v as string))fail();Object.assign(s,{[key]:v})}
  for(const key of ['reflection','envBackground','glowEnabled'] as const){if(typeof value[key]!=='boolean')fail();s[key]=value[key] as boolean}
  for(const key of ['deviceColor','background','glowColor','vfxColor'] as const)s[key]=color(value[key]??s[key]);
  const limits:Record<string,[number,number]>={fov:[15,70],exposure:[.2,2.5],roll:[-180,180],screenBrightness:[.4,1.6],envIntensity:[0,3],envRotation:[-180,180],envBlur:[0,1],glowStrength:[.1,3],glowWidth:[1,24],vfxStrength:[0,2],vfxX:[0,100],vfxY:[0,100],vfxScale:[.2,2]};
  for(const [key,[min,max]] of Object.entries(limits))Object.assign(s,{[key]:number(value[key]??s[key as keyof Settings],min,max)});
  if(!Array.isArray(value.lights)||value.lights.length!==3)fail();const lights=value.lights as Record<string,unknown>[];
  s.lights=lights.map((l,i)=>{if(l.id!==['key','fill','rim'][i]||typeof l.enabled!=='boolean')fail();return {id:l.id as 'key'|'fill'|'rim',name:text(l.name,40),enabled:l.enabled as boolean,color:color(l.color),position:vector(l.position),power:number(l.power,0,15),width:number(l.width,.2,8),height:number(l.height,.2,8)}});
  const shapes=value.hdriShapes??[];if(!Array.isArray(shapes)||shapes.length>32)fail();
  s.hdriShapes=(shapes as Record<string,unknown>[]).map(p=>{if(!p||!['circle','square'].includes(p.shape as string)||!['white','black'].includes(p.color as string))fail();return {id:text(p.id,100),shape:p.shape as 'circle'|'square',color:p.color as 'white'|'black',x:number(p.x,0,100),y:number(p.y,0,100),size:number(p.size,2,80),strength:number(p.strength,.1,20),softness:number(p.softness,0,1)}});
  if(new Set(s.hdriShapes.map(p=>p.id)).size!==s.hdriShapes.length)fail();
  return s;
 };
 const snapshot=(raw:unknown):SceneSnapshot=>{
  if(!raw||typeof raw!=='object')fail();const s=raw as SceneSnapshot,c=s.camera;if(s.version!==2||!DEVICES.some(d=>d.id===s.device)||!c||!['perspective','orthographic'].includes(c.projection)||typeof s.transparent!=='boolean'||![1200,2400,4096].includes(s.resolution))fail();
  const camera={projection:c.projection,position:vector(c.position),target:vector(c.target),up:vector(c.up),zoom:number(c.zoom,.01,100),orthoHeight:number(c.orthoHeight,.01,1000)};
  if(Math.hypot(...camera.up)<.001||Math.hypot(...camera.position.map((v,i)=>v-camera.target[i]))<.001)fail();
  const result={version:2 as const,device:s.device,settings:settings(s.settings),camera,transparent:s.transparent,resolution:s.resolution,artwork:getAsset(s.artwork),artworkName:text(s.artworkName),hdri:getAsset(s.hdri),hdriName:text(s.hdriName)};
  if(result.settings.environment==='custom'&&!result.hdri)fail();return result;
 };
 const folders:SceneFolder[]=data.folders.map((f:SceneFolder)=>({id:text(f.id,100),name:text(f.name,80),parentId:f.parentId===null?null:text(f.parentId,100),...(f.order!==undefined?{order:number(f.order,0,100000)}:{}),...(f.kitViews!==undefined?{kitViews:number(f.kitViews,0,100)}:{})}));
 const ids=new Set(folders.map(f=>f.id));if(ids.size!==folders.length)fail();
 for(const f of folders){const visited=new Set([f.id]);let parent=f.parentId;while(parent!==null){if(!ids.has(parent)||visited.has(parent))fail();visited.add(parent);parent=folders.find(x=>x.id===parent)!.parentId}}
 const scenes:SavedScene[]=data.scenes.map((s:SavedScene)=>{const folderId=s.folderId??null;if(folderId!==null&&!ids.has(folderId))fail();return {id:text(s.id,100),name:text(s.name,80),created:number(s.created,0,1e15),updated:number(s.updated,0,1e15),folderId,...(s.order!==undefined?{order:number(s.order,0,100000)}:{}),...(s.kitRevision!==undefined?{kitRevision:number(s.kitRevision,0,100)}:{}),snapshot:snapshot(s.snapshot)}});
 if(new Set(scenes.map(s=>s.id)).size!==scenes.length)fail();
 const prefs=data.workspace?.preferences??{},preferences={...defaultPreferences};
 for(const key of ['lightBackground','splitLights','exportCollapsed','compactScenes'] as const)if(typeof prefs[key]==='boolean')preferences[key]=prefs[key];
 if(prefs.deviceFinishes!==undefined){if(!prefs.deviceFinishes||typeof prefs.deviceFinishes!=='object'||Array.isArray(prefs.deviceFinishes))fail();preferences.deviceFinishes={};for(const [id,raw] of Object.entries(prefs.deviceFinishes)){const v=raw as {deviceColor:unknown;finish:Settings['finish']};if(!DEVICES.some(d=>d.id===id)||!v||!['satin','polished','matte'].includes(v.finish))fail();preferences.deviceFinishes[id]={deviceColor:color(v.deviceColor),finish:v.finish}}}
 if(prefs.leftPanelWidth!==undefined)preferences.leftPanelWidth=number(prefs.leftPanelWidth,0,480);
 if(prefs.exportNaming!==undefined){const n=prefs.exportNaming;if(!n||!['number','scene-name','device-number','custom'].includes(n.mode))fail();preferences.exportNaming={mode:n.mode,prefix:text(n.prefix,100),folder:text(n.folder,100)}}
 if(['key','fill','rim'].includes(prefs.selectedLight))preferences.selectedLight=prefs.selectedLight;
 if(['device','scenes'].includes(prefs.leftTab))preferences.leftTab=prefs.leftTab;
 if(['lights','look','camera'].includes(prefs.rightTab))preferences.rightTab=prefs.rightTab;
 if(scenes.some(s=>s.id===prefs.activeScene))preferences.activeScene=prefs.activeScene;
 const deviceArtworks:DeviceArtworks={};
 if(data.workspace?.deviceArtworks!==undefined){
  if(!data.workspace.deviceArtworks||typeof data.workspace.deviceArtworks!=='object'||Array.isArray(data.workspace.deviceArtworks))fail();
  for(const [id,raw] of Object.entries(data.workspace.deviceArtworks)){
   if(!DEVICES.some(d=>d.id===id)||!raw||typeof raw!=='object')fail();
   const value=raw as {artwork:unknown;artworkName:unknown},artwork=getAsset(value.artwork);
   if(!artwork||!['image/png','image/jpeg','image/webp'].includes(artwork.type)||artwork.size>30*1024*1024)fail();
   deviceArtworks[id]={artwork:artwork!,artworkName:text(value.artworkName)};
  }
 }
 return {scenes,folders,workspace:{current:data.workspace?.current?snapshot(data.workspace.current):null,preferences,...(data.workspace?.deviceArtworks!==undefined?{deviceArtworks}:{})}};
}
