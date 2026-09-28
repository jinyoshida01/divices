'use client';
import {reorderLibrary,sortLibrary,type LibraryDrop,type SortMode} from './library-order';
import {toggleLibraryFolder,toggleLibraryScene} from './library-selection';
import {AUTHORED_PRESETS,authoredLighting} from './authored-presets';
import {useEffect,useRef,useState} from 'react';
import {Studio as DeviceRenderer} from './studio';
import {cameraReadout,orbitAtAngle} from './camera-math';
import {DEVICES,CAMERA_PRESETS,defaultSettings,cameraFor,settingsFor,type Settings,type StudioLight,type LightId,type CameraPreset,type SavedScene,type SceneSnapshot,type SceneFolder,type ViewPreferences,type DeviceArtworks} from './studio-config';
import {readLibrary,saveScene,deleteScene,deleteLibrarySelection,putScenes,putFolder,putKit,saveWorkspace,replaceLibrary,defaultPreferences,ENVIRONMENT_KEYS,environmentSettings,patchSceneEnvironment,deleteFolderTree,restoreFolderTree,patchSceneArtwork,moveScenesToFolder,saveFolderWithScenes,applyEssentialsUpdate,saveLibraryOrder,renameSceneRecord} from './scene-library';
import {encodeBackup,decodeBackup,type SceneLibrary} from './scene-backup';
import {essentialsKit,refreshEssentials,KIT_VIEWS} from './essentials-kit';
import {downloadBlob} from './downloads';
import {exportScenes} from './scene-export';
import {WorkspaceHistory,type HistoryState} from './workspace-history';
import {historyShortcut} from './history-shortcuts';
import {withDeviceArtwork} from './device-artwork';
import {deviceFinish,settingsForDevice,colourForAllDevices} from './device-finish';
import {sameScene,newSceneSnapshot} from './scene-changes';
import {imageFilename} from './export-naming';
import {initializeLibrary} from './scene-library';
import {freshWorkspace} from './workspace-reset';
import {artworkTargets,type ArtworkTarget,type ArtworkDraft,type ArtworkScope} from './artwork-scopes';

export function useDivices(){
 const host=useRef<HTMLDivElement>(null),engine=useRef<DeviceRenderer|null>(null),quiet=useRef(false),cancel=useRef(false);
 const [device,setDevice]=useState(DEVICES[0].id),[settings,setSettings]=useState(()=>settingsFor('hero',defaultSettings())),[camera,setCamera]=useState(cameraFor('hero'));
 const [liveCamera,setLiveCamera]=useState(()=>cameraReadout(cameraFor('hero'),30)),[viewName,setViewName]=useState('Hero');
 const [ready,setReady]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(false),[dirty,setDirty]=useState(false);
 const [imageName,setImageName]=useState('Green screen'),[hdrName,setHDRName]=useState(''),[transparent,setTransparentState]=useState(true),[resolution,setResolutionState]=useState('4096');
 const [preferences,setPreferences]=useState(defaultPreferences),[scenes,setScenes]=useState<SavedScene[]>([]),[folders,setFolders]=useState<SceneFolder[]>([]),[selected,setSelected]=useState(new Set<string>()),[selectedFolders,setSelectedFolders]=useState(new Set<string>());
 const [artworkDraft,setArtworkDraft]=useState<ArtworkDraft|null>(null);
 const baseline=useRef<SceneSnapshot|null>(null);
 const [deviceArtworks,setDeviceArtworks]=useState<DeviceArtworks>({}),defaultArtworks=useRef<DeviceArtworks>({});
 const sceneArtwork=useRef<Pick<SceneSnapshot,'artwork'|'artworkName'>>({artwork:null,artworkName:'Green screen'});
 function syncDefaults(value:DeviceArtworks){defaultArtworks.current=value;setDeviceArtworks(value)}
 async function showArtwork(id:string,base=sceneArtwork.current){const value=defaultArtworks.current[id]??base;if(value.artwork)await engine.current!.upload(value.artwork,value.artworkName);else engine.current!.clearArtwork();sceneArtwork.current=base;setImageName(value.artworkName)}
 async function restoreView(value:SceneSnapshot){await engine.current!.restore(withDeviceArtwork(value,defaultArtworks.current));sceneArtwork.current={artwork:value.artwork,artworkName:value.artworkName}}
 const [pendingLeave,setPendingLeave]=useState<{kind:'scene';id:string}|null>(null);
 const environmentSaves=useRef<Promise<unknown>>(Promise.resolve());
 const workspaceSaves=useRef<Promise<unknown>>(Promise.resolve()),resetting=useRef(false);
 const [deletedFolder,setDeletedFolder]=useState<{folders:SceneFolder[];scenes:SavedScene[]}|null>(null);
 const [deletedScenes,setDeletedScenes]=useState<SavedScene[]>([]);
 const [environmentPreview,setEnvironmentPreview]=useState(''),[artworkPreview,setArtworkPreview]=useState('');
 const [pendingBackup,setPendingBackup]=useState<SceneLibrary|null>(null);
 const [lastDownload,setLastDownload]=useState<{blob:Blob;name:string}|null>(null);
 const state=useRef({device,settings,camera,transparent,resolution,preferences,scenes,folders,ready,busy,loading,selected,selectedFolders,viewName});state.current={device,settings,camera,transparent,resolution,preferences,scenes,folders,ready,busy,loading,selected,selectedFolders,viewName};
 const history=useRef(new WorkspaceHistory()),historyApplying=useRef(false),[,historyRevision]=useState(0);
 function historyState():HistoryState{const s=state.current;return {library:{scenes:s.scenes,folders:s.folders,workspace:{current:{version:2,device:s.device,settings:s.settings,camera:s.camera,transparent:s.transparent,resolution:Number(s.resolution),...sceneArtwork.current,hdri:engine.current?.customHDR??null,hdriName:engine.current?.hdriName??''},preferences:s.preferences,deviceArtworks:defaultArtworks.current}},selected:[...s.selected],selectedFolders:[...s.selectedFolders],baseline:baseline.current,viewName:s.viewName}}
 function remember(label:string,key=''){if(!state.current.ready||historyApplying.current||quiet.current)return;history.current.record(historyState(),label,key);historyRevision(v=>v+1)}
 function setTransparent(value:boolean){if(value===state.current.transparent)return;remember('transparent background');state.current.transparent=value;setTransparentState(value)}
 function setResolution(value:string){if(value===state.current.resolution)return;remember('export resolution');state.current.resolution=value;setResolutionState(value)}
 const notice=(text:string,isError=false)=>{setMessage(text);setError(isError)};
 const pref=<K extends keyof ViewPreferences>(key:K,value:ViewPreferences[K])=>{if(['lightBackground','exportNaming'].includes(key)&&JSON.stringify(state.current.preferences[key])!==JSON.stringify(value))remember(key==='exportNaming'?'export naming':'viewport background',key);const next={...state.current.preferences,[key]:value};state.current.preferences=next;setPreferences(next)};
 function syncSnapshot(s:SceneSnapshot){Object.assign(state.current,{device:s.device,settings:{...defaultSettings(),...s.settings},camera:s.camera,transparent:s.transparent,resolution:String(s.resolution)});setDevice(s.device);setSettings({...defaultSettings(),...s.settings});setCamera(s.camera);setLiveCamera(cameraReadout(s.camera,s.settings.fov));setTransparentState(s.transparent);setResolutionState(String(s.resolution));setImageName(defaultArtworks.current[s.device]?.artworkName??(s.artwork?s.artworkName:'Green screen'));setHDRName(s.hdriName);setViewName('Saved camera')}
 useEffect(()=>{if(!message||error)return;const timer=setTimeout(()=>setMessage(''),5500);return()=>clearTimeout(timer)},[message,error]);
 useEffect(()=>{
  if(!host.current)return;let alive=true;let renderer:DeviceRenderer;
  try{renderer=new DeviceRenderer(host.current);engine.current=renderer}catch(e){notice('The 3D view could not start. Reload with hardware acceleration enabled.',true);setLoading(false);return}
  renderer.onArtworkPreview=url=>{if(alive)setArtworkPreview(url)};
  renderer.onEnvironmentPreview=url=>{if(alive)setEnvironmentPreview(url)};
  renderer.onError=text=>{if(alive)notice(text,true)};
  renderer.onCameraReadout=value=>{if(alive&&!quiet.current)setLiveCamera(value)};
  renderer.onLightSelect=id=>setPreferences(p=>({...p,selectedLight:id,rightTab:'lights'}));
  renderer.onLightMove=(id,position)=>{if(quiet.current)return;remember('light position','light-'+id);const next={...state.current.settings,lights:state.current.settings.lights.map(l=>l.id===id?{...l,position}:l)};state.current.settings=next;setSettings(next);setDirty(true)};
  renderer.onCameraChange=c=>{if(alive&&!quiet.current){if(JSON.stringify(state.current.camera)!==JSON.stringify(c))remember('camera movement','camera');state.current.camera=c;setCamera(c);setViewName('Custom camera');setDirty(true)}};
  (async()=>{try{
   await initializeLibrary(()=>essentialsKit('generic-smartphone',{artwork:null,artworkName:'Green screen'}));if(!alive)return;
   const library=await readLibrary();if(!alive)return;for(const f of library.folders){if(f.name.endsWith(' · essentials kit')){f.name=f.name.replace(/ · essentials kit$/,' · Essentials Kit');await putFolder(f)}}const original=library.scenes,revised=refreshEssentials(original,library.folders),changed=revised.filter(s=>original.find(old=>old.id===s.id)!==s),removed=original.filter(s=>!revised.some(next=>next.id===s.id)).map(s=>s.id);library.folders=library.folders.map(f=>f.kitViews!==undefined||f.name.toLowerCase().endsWith(' · essentials kit')?{...f,kitViews:KIT_VIEWS.length}:f);if(changed.length||removed.length)await applyEssentialsUpdate(changed,library.folders,removed);const active=changed.find(s=>s.id===library.workspace.preferences.activeScene);if(active&&library.workspace.current){const working=library.workspace.current,preset=AUTHORED_PRESETS.find(p=>p.name===active.name||p.sourceId===active.id);if(preset)library.workspace.current={...working,settings:{...working.settings,...authoredLighting(preset,working.device)}};}if(removed.includes(library.workspace.preferences.activeScene))library.workspace.preferences={...library.workspace.preferences,activeScene:''};setScenes(revised);setFolders(library.folders);setPreferences(library.workspace.preferences);syncDefaults(library.workspace.deviceArtworks??{});quiet.current=true;
   if(library.workspace.current){await restoreView(library.workspace.current);if(alive)syncSnapshot(library.workspace.current)}else{renderer.configure(settingsFor('hero',defaultSettings()));await renderer.load(DEVICES[0].id);renderer.setCamera(cameraFor('hero'));await showArtwork(DEVICES[0].id)}
   if(!alive)return;renderer.setPreviewBackground(library.workspace.preferences.lightBackground);renderer.setLightEdit(library.workspace.preferences.splitLights,library.workspace.preferences.selectedLight);setEnvironmentPreview(renderer.environmentPreview);baseline.current={...await renderer.snapshot(library.workspace.current?.device??DEVICES[0].id,library.workspace.current?.transparent??true,library.workspace.current?.resolution??4096),...sceneArtwork.current};setDirty(false);setReady(true);
  }catch(e){if(alive)notice(e instanceof Error?e.message:'The workspace could not be restored.',true)}finally{quiet.current=false;if(alive)setLoading(false)}})();
  return()=>{alive=false;renderer.dispose();engine.current=null};
 },[]);
 useEffect(()=>{if(ready&&!busy)engine.current?.configure(settings)},[settings,ready,busy]);
 useEffect(()=>{if(ready&&!busy){engine.current?.setLightEdit(preferences.splitLights,preferences.selectedLight);engine.current?.setPreviewBackground(preferences.lightBackground)}},[preferences.splitLights,preferences.selectedLight,preferences.lightBackground,ready,busy]);
 useEffect(()=>{if(!ready||busy||loading||resetting.current)return;const timer=setTimeout(()=>{
  workspaceSaves.current=workspaceSaves.current.catch(()=>{}).then(async()=>{
   if(resetting.current)return;
   const current=await snapshot();
   if(resetting.current)return;
   await saveWorkspace({current,preferences:state.current.preferences,deviceArtworks:defaultArtworks.current});
  }).catch(()=>{if(!resetting.current)notice('Autosave failed. Save a backup before closing this tab.',true)});
 },650);return()=>clearTimeout(timer)},[device,settings,camera,transparent,resolution,preferences,imageName,hdrName,deviceArtworks,ready,busy,loading]);
 useEffect(()=>{if(!ready||busy||loading)return;let alive=true;void hasUnsavedChanges().then(changed=>{if(alive)setDirty(changed)}).catch(()=>{});return()=>{alive=false}},[ready,busy,loading,device,settings,camera,transparent,resolution,imageName,hdrName,scenes,preferences.activeScene]);
 async function snapshot(){const s=state.current;return {...await engine.current!.snapshot(s.device,s.transparent,Number(s.resolution)),...sceneArtwork.current}}
 async function refresh(){const library=await readLibrary();state.current.scenes=library.scenes;state.current.folders=library.folders;setScenes(library.scenes);setFolders(library.folders);return library}
 async function run<T>(action:()=>Promise<T>):Promise<T|undefined>{setBusy(true);try{return await action()}catch(e){notice(e instanceof Error?e.message:'This action could not finish.',true)}finally{setBusy(false)}}
 function persistEnvironment(next:Settings){
  const id=state.current.preferences.activeScene;if(!id)return;
  const patch=environmentSettings(next),hdr=engine.current!.customHDR,name=engine.current!.hdriName;
  const records=state.current.scenes.map(s=>s.id===id?{...s,snapshot:{...s.snapshot,settings:{...s.snapshot.settings,...patch},hdri:hdr,hdriName:name}}:s);
  state.current.scenes=records;setScenes(records);
  environmentSaves.current=environmentSaves.current.catch(()=>{}).then(()=>patchSceneEnvironment(id,patch,hdr,name)).catch(async e=>{await refresh();notice('HDRI edits could not be saved. Keep this scene open and save a backup.',true);throw e});void environmentSaves.current.catch(()=>{});
 }

 function update<K extends keyof Settings>(key:K,value:Settings[K],record=true){if(JSON.stringify(state.current.settings[key])===JSON.stringify(value))return;if(record)remember(key==='hdriShapes'?'HDRI edit':key.replace(/([A-Z])/g,' $1').toLowerCase(),key);const next={...state.current.settings,[key]:value};state.current.settings=next;setSettings(next);if((ENVIRONMENT_KEYS as readonly string[]).includes(key))persistEnvironment(next);setDirty(true)}
 function changeLight<K extends keyof StudioLight>(key:K,value:StudioLight[K]){const id=state.current.preferences.selectedLight;if(JSON.stringify(state.current.settings.lights.find(l=>l.id===id)?.[key])===JSON.stringify(value))return;remember('light '+key,'light-'+id+'-'+key);const next={...state.current.settings,lights:state.current.settings.lights.map(l=>l.id===id?{...l,[key]:value}:l)};state.current.settings=next;setSettings(next);setDirty(true)}
 async function hasUnsavedChanges(fresh=false){if(fresh)await environmentSaves.current;const records=fresh?(await readLibrary()).scenes:state.current.scenes;const current=await snapshot(),saved=records.find(s=>s.id===state.current.preferences.activeScene)?.snapshot??baseline.current;return saved?!await sameScene(current,saved):dirty}
 async function guardLeave(kind:'scene',id:string){if(await hasUnsavedChanges(true)){notice('');setPendingLeave({kind,id});return true}return false}
 async function chooseDevice(id:string){if(id===state.current.device)return;if(!DEVICES.some(d=>d.id===id))throw new Error('Choose a device.');await environmentSaves.current;remember('device change');setLoading(true);try{await engine.current!.load(id);await showArtwork(id,{artwork:null,artworkName:'Green screen'});const next=settingsForDevice(id,state.current.settings,state.current.preferences,state.current.scenes);state.current.settings=next;setSettings(next);engine.current!.configure(next);setDevice(id);state.current.device=id;pref('activeScene','');setDirty(true)}finally{setLoading(false)}}
 function applyPreset(id:CameraPreset){remember('camera preset');const s=settingsFor(id,state.current.settings,state.current.device),c=cameraFor(id);state.current.settings=s;setSettings(s);engine.current!.configure(s);quiet.current=true;try{engine.current!.setCamera(c)}finally{quiet.current=false}state.current.camera=c;setCamera(c);setViewName(CAMERA_PRESETS.find(p=>p.id===id)!.name);setDirty(true)}
 function applyOrbit(angle:number){remember('orbit angle');const r=orbitAtAngle(angle,engine.current!.captureCamera(),state.current.settings,state.current.device);state.current.settings=r.settings;setSettings(r.settings);engine.current!.configure(r.settings);quiet.current=true;try{engine.current!.setCamera(r.camera)}finally{quiet.current=false}state.current.camera=r.camera;setCamera(r.camera);setViewName(angle+'° orbit');setDirty(true)}
 function openArtwork(scope:ArtworkScope='selected',sceneId?:string,deviceOnly=false){notice('');const scene=state.current.scenes.find(s=>s.id===sceneId);setArtworkDraft({artwork:scene?.snapshot.artwork??null,name:scene?.snapshot.artworkName??'Green screen',initialScope:scope,...(sceneId?{sceneIds:[sceneId]}:{}),...(deviceOnly?{deviceOnly:true,deviceIds:[state.current.device]}:{})})}
 function openDeviceArtwork(id=state.current.device){notice('');const value=defaultArtworks.current[id];setArtworkDraft({artwork:value?.artwork??null,name:value?.artworkName??'Choose a default artwork',initialScope:'device',deviceOnly:true,deviceIds:[id]})}
 async function saveDeviceDefaults(next:DeviceArtworks){
  remember('device artwork override');const before=defaultArtworks.current;
  try{syncDefaults(next);await showArtwork(state.current.device);await saveWorkspace({current:await snapshot(),preferences:state.current.preferences,deviceArtworks:next})}
  catch(e){syncDefaults(before);await showArtwork(state.current.device);throw e}
 }
 async function removeDeviceArtwork(id:string){await run(async()=>{const next={...defaultArtworks.current};delete next[id];await saveDeviceDefaults(next);notice('Device override removed. Individual scene artworks restored.')})}
 async function upload(f?:File,options?:Partial<ArtworkDraft>){
  if(!f)return;
  if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>30*1024*1024){notice('Choose a PNG, JPG or WebP smaller than 30 MB.',true);return}
  await run(async()=>{const url=URL.createObjectURL(f);try{const image=new Image();image.src=url;await image.decode();if(image.naturalWidth>16000||image.naturalHeight>16000)throw new Error('Use artwork smaller than 16,000 pixels per side.');setArtworkDraft(draft=>({...draft,initialScope:draft?.initialScope??'current',...options,artwork:f,name:f.name}));notice('')}finally{URL.revokeObjectURL(url)}});
 }
 function clearArtwork(){setArtworkDraft({artwork:null,name:'Green screen',initialScope:'current'})}
 async function applyArtwork(target:ArtworkTarget){
  if(!artworkDraft)return;
  const draft=artworkDraft;
  await run(async()=>{
   await environmentSaves.current;
   if(draft.deviceOnly){
    const ids=target.deviceIds??[target.device];if(!ids.length||ids.some(id=>!DEVICES.some(d=>d.id===id)))throw new Error('Choose at least one device.');if(!draft.artwork)throw new Error('Choose an image for the default artwork.');
    const next={...defaultArtworks.current};for(const id of ids)next[id]={artwork:draft.artwork,artworkName:draft.name};
    await saveDeviceDefaults(next);setArtworkDraft(null);notice('Default artwork saved for '+ids.length+(ids.length===1?' device':' devices'));return;
   }
   const library=await readLibrary(),active=state.current.preferences.activeScene,targets=artworkTargets(target,library.scenes,library.folders,active);
   if(target.scope!=='current'&&!targets.length)throw new Error('Choose at least one scene for this artwork.');
   remember('screen artwork');await patchSceneArtwork(targets.map(s=>s.id),draft.artwork,draft.name);
   if(target.scope==='current'||targets.some(s=>s.id===active)){
    await showArtwork(state.current.device,{artwork:draft.artwork,artworkName:draft.name});setDirty(true);
   }
   await refresh();setArtworkDraft(null);
   notice(targets.length?'Artwork saved to '+targets.length+(targets.length===1?' scene':' scenes'):'Artwork updated in the current view');
  });
 }
 async function uploadHDR(f?:File){if(!f)return;if(!/\.(hdr|exr)$/i.test(f.name)){notice('Choose a .hdr or .exr environment.',true);return}await run(async()=>{remember('HDRI upload');await engine.current!.uploadHDR(f,f.name);setHDRName(f.name);if(state.current.settings.environment==='custom')persistEnvironment(state.current.settings);else update('environment','custom',false);notice('HDRI loaded')})}
 async function exportPNG(){await run(async()=>{await engine.current!.readyToRender();await environmentSaves.current;const record=state.current.scenes.find(s=>s.id===preferences.activeScene),blob=await engine.current!.exportPNG(Number(resolution),transparent,device,false);downloadBlob(blob,imageFilename(record,0,preferences.exportNaming,device));notice('PNG exported')})}
 async function saveCurrent(name:string,folderId:string|null,existing?:SavedScene,keepArtwork=false){await environmentSaves.current;const current=await snapshot(),saved=existing||keepArtwork?current:newSceneSnapshot(current);remember(existing?'save scene':'new scene');const record=await saveScene(name,saved,existing?{...existing,folderId}:undefined,folderId);if(!existing&&!keepArtwork)await showArtwork(saved.device,{artwork:null,artworkName:'Green screen'});baseline.current=record.snapshot;await refresh();pref('activeScene',record.id);setDirty(false);notice('Scene saved');return record}
 async function loadScene(id:string,bypass=false){if(!bypass&&await guardLeave('scene',id))return {pending:true};await environmentSaves.current;const latest=await readLibrary();const record=latest.scenes.find(s=>s.id===id);if(!record)throw new Error('Scene not found.');remember('switch scene');setLoading(true);quiet.current=true;try{await restoreView(record.snapshot);baseline.current=record.snapshot;syncSnapshot(record.snapshot);pref('activeScene',id);engine.current!.setLightEdit(state.current.preferences.splitLights,state.current.preferences.selectedLight);setDirty(false);return {id,name:record.name}}finally{quiet.current=false;setLoading(false)}}
 async function continueNavigation(save:boolean,name?:string){const action=pendingLeave;if(!action)return;await run(async()=>{if(save){const existing=state.current.scenes.find(s=>s.id===state.current.preferences.activeScene);await saveCurrent(existing?.name??name??'Untitled scene',existing?.folderId??null,existing,true)}await loadScene(action.id,true);setPendingLeave(null)})}
 async function saveFolder(folder:SceneFolder,sceneIds:string[]=[]){await environmentSaves.current;remember(state.current.folders.some(f=>f.id===folder.id)?'rename folder':'new folder');await saveFolderWithScenes({...state.current.folders.find(f=>f.id===folder.id),...folder},sceneIds);await refresh();notice(sceneIds.length?'Folder created with '+sceneIds.length+' selected scenes':'Folder saved')}
 async function moveScenes(ids:string[],folderId:string|null){await environmentSaves.current;if(!state.current.scenes.some(s=>ids.includes(s.id)&&(s.folderId??null)!==folderId))return;remember('move scenes');const count=await moveScenesToFolder(ids,folderId);await refresh();notice(count+(count===1?' scene moved':' scenes moved'))}
 async function arrangeLibrary(drop:LibraryDrop){await environmentSaves.current;const next=reorderLibrary(state.current.scenes,state.current.folders,drop);if(next.scenes===state.current.scenes&&next.folders===state.current.folders)return;remember('reorder '+drop.kind+'s');await saveLibraryOrder(next.scenes,next.folders);await refresh()}
 async function autoSort(mode:SortMode){await environmentSaves.current;remember('auto reorder');const next=sortLibrary(state.current.scenes,state.current.folders,mode);await saveLibraryOrder(next.scenes,next.folders);await refresh();notice('Scenes and folders reordered')}
 async function setDeviceFinish(id:string,patch:Partial<Pick<Settings,'deviceColor'|'finish'>>){await run(async()=>{await environmentSaves.current;remember('default device finish','finish-'+id);const value={...deviceFinish(id,state.current.preferences,state.current.scenes),...patch};const records=state.current.scenes.filter(s=>s.snapshot.device===id).map(s=>({...s,snapshot:{...s.snapshot,settings:{...s.snapshot.settings,...value}}}));await putScenes(records);pref('deviceFinishes',{...state.current.preferences.deviceFinishes,[id]:value});if(id===state.current.device){const next={...state.current.settings,...value};state.current.settings=next;setSettings(next);engine.current!.configure(next)}await refresh();notice('Default finish applied to all scenes for '+DEVICES.find(d=>d.id===id)?.name)})}
 async function setAllDeviceColours(deviceColor:string){await run(async()=>{
  await environmentSaves.current;remember('all device colours','all-device-colours');
  const next=colourForAllDevices(deviceColor,state.current.preferences,state.current.scenes);
  await putScenes(next.scenes);pref('deviceFinishes',next.deviceFinishes);
  const settings={...state.current.settings,deviceColor};state.current.settings=settings;setSettings(settings);engine.current!.configure(settings);
  await refresh();notice('Default colour applied to every device and saved scene');
 })}
 async function renameScene(id:string,name:string){await environmentSaves.current;const scene=state.current.scenes.find(s=>s.id===id);if(!scene||scene.name===name.trim())return;remember('rename scene');await renameSceneRecord(id,name);await refresh();notice('Scene renamed')}
 async function moveScene(scene:SavedScene,folderId:string|null){await moveScenes([scene.id],folderId)}
 async function removeScene(id:string){remember('delete scene');await deleteScene(id);await refresh();setSelected(old=>{const next=new Set(old);next.delete(id);return next});if(preferences.activeScene===id)pref('activeScene','')}
 async function removeScenes(ids:string[],folderIds:string[]=[]){await environmentSaves.current;remember(folderIds.length?'delete scenes and folders':'delete scenes');const removed=await deleteLibrarySelection(ids,folderIds);setDeletedFolder(removed.folders.length?removed:null);setDeletedScenes(removed.folders.length?[]:removed.scenes);await refresh();setSelected(new Set());setSelectedFolders(new Set());if(removed.scenes.some(s=>s.id===state.current.preferences.activeScene))pref('activeScene','');notice(removed.scenes.length+' scenes'+(removed.folders.length?' and '+removed.folders.length+' folders':'')+' deleted')}
 async function removeFolder(id:string,contents:boolean){await environmentSaves.current;remember('delete folder');const removed=await deleteFolderTree(id,contents);setDeletedFolder(removed);setSelectedFolders(old=>new Set([...old].filter(id=>!removed.folders.some(f=>f.id===id))));setDeletedScenes([]);await refresh();const ids=new Set(removed.scenes.map(s=>s.id));if(contents){setSelected(old=>new Set([...old].filter(id=>!ids.has(id))));if(ids.has(preferences.activeScene))pref('activeScene','')}notice(contents?'Folder and its scenes deleted':'Folder deleted. Scenes moved to Unfiled')}
 async function undoDelete(){remember('restore deletion');await environmentSaves.current;if(deletedFolder)await restoreFolderTree(deletedFolder);else await putScenes(deletedScenes);await refresh();setDeletedScenes([]);setDeletedFolder(null);notice('Deletion undone')}
 async function backup(){await run(async()=>{await environmentSaves.current.catch(()=>{});const library=await readLibrary();library.workspace={current:await snapshot(),preferences:state.current.preferences,deviceArtworks:defaultArtworks.current};downloadBlob(await encodeBackup(library),'divices-backup-'+new Date().toISOString().slice(0,10)+'.json');notice('Complete backup saved')})}
 async function resetWorkspace(){
  if(resetting.current||state.current.busy||state.current.loading)return;
  resetting.current=true;quiet.current=true;setBusy(true);
  try{
   await Promise.allSettled([environmentSaves.current,workspaceSaves.current]);
   await replaceLibrary(freshWorkspace());
   window.location.reload();
  }catch(e){
   resetting.current=false;quiet.current=false;setBusy(false);
   notice(e instanceof Error?e.message:'The workspace could not be reset. Your library was kept.',true);
  }
 }
 async function readBackup(f?:File){if(f)await run(async()=>setPendingBackup(await decodeBackup(f)))}
 async function restoreBackup(){if(!pendingBackup)return;await run(async()=>{await environmentSaves.current;remember('import backup');quiet.current=true;const before=await snapshot(),previousDefaults=defaultArtworks.current;try{syncDefaults(pendingBackup.workspace.deviceArtworks??{});const current=pendingBackup.workspace.current??pendingBackup.scenes[0]?.snapshot;if(current)await restoreView(current);else await showArtwork(state.current.device);await replaceLibrary(pendingBackup);setScenes(pendingBackup.scenes);setFolders(pendingBackup.folders);setPreferences(pendingBackup.workspace.preferences);setSelected(new Set());setSelectedFolders(new Set());if(current){syncSnapshot(current);baseline.current=current}setPendingBackup(null);setDeletedFolder(null);setDeletedScenes([]);setDirty(false);notice('Backup restored')}catch(e){syncDefaults(previousDefaults);await restoreView(before);throw e}finally{quiet.current=false}})}
 async function exportBatch(records:SavedScene[],name:string,extraFolders:SceneFolder[]=[]){if(!records.length)return;await run(async()=>{cancel.current=false;quiet.current=true;try{await environmentSaves.current;const latest=await readLibrary(),renderRecords=records.map(record=>{const saved=latest.scenes.find(s=>s.id===record.id)??record;return {...saved,snapshot:withDeviceArtwork(saved.snapshot,defaultArtworks.current)}});const result=await exportScenes(engine.current!,renderRecords,withDeviceArtwork(await snapshot(),defaultArtworks.current),preferences,Number(resolution),name,setProgress,()=>cancel.current,[...latest.folders,...extraFolders]);if(result){setLastDownload(result);notice(result.count+' images ready'+(cancel.current?' before cancellation':''))}}finally{quiet.current=false;setProgress('')}})}
 async function kit(id:string,action:'load'|'export'){const result=essentialsKit(id,{artwork:null,artworkName:'Green screen'});const finish=state.current.preferences.deviceFinishes?.[id];if(finish)for(const scene of result.scenes)Object.assign(scene.snapshot.settings,finish);if(action==='export'){await exportBatch(result.scenes,result.folder.name,[result.folder]);return}await run(async()=>{await environmentSaves.current;remember('add Essentials Kit');await putKit(result.folder,result.scenes);await refresh();setSelected(new Set(result.scenes.map(s=>s.id)));setSelectedFolders(new Set());notice(result.scenes.length+' editable scenes added to '+result.folder.name)})}
 async function travelHistory(direction:'undo'|'redo'){
  if(state.current.busy||state.current.loading||historyApplying.current)return;
  const entry=history.current.peek(direction);if(!entry)return;
  await run(async()=>{
   await environmentSaves.current;const current=historyState(),target=entry.state;
   historyApplying.current=true;quiet.current=true;
   try{
    const preferences={...state.current.preferences,activeScene:target.library.workspace.preferences.activeScene,exportNaming:target.library.workspace.preferences.exportNaming,lightBackground:target.library.workspace.preferences.lightBackground,deviceFinishes:target.library.workspace.preferences.deviceFinishes};
    const workspace={...target.library.workspace,preferences};
    syncDefaults(workspace.deviceArtworks??{});if(workspace.current)await restoreView(workspace.current);
    await replaceLibrary({...target.library,workspace});
    state.current.scenes=target.library.scenes;state.current.folders=target.library.folders;state.current.preferences=preferences;state.current.selected=new Set(target.selected);state.current.selectedFolders=new Set(target.selectedFolders??[]);
    setScenes(target.library.scenes);setFolders(target.library.folders);setPreferences(preferences);setSelected(new Set(target.selected));setSelectedFolders(new Set(target.selectedFolders??[]));
    if(workspace.current)syncSnapshot(workspace.current);baseline.current=target.baseline;setViewName(target.viewName);
    setDeletedScenes([]);setDeletedFolder(null);setPendingLeave(null);setArtworkDraft(null);
    engine.current!.setLightEdit(preferences.splitLights,preferences.selectedLight);engine.current!.setPreviewBackground(preferences.lightBackground);
    history.current.commit(direction,current);historyRevision(v=>v+1);notice((direction==='undo'?'Undid ':'Redid ')+entry.label);
   }catch(e){syncDefaults(current.library.workspace.deviceArtworks??{});if(current.library.workspace.current)await restoreView(current.library.workspace.current);throw e}
   finally{historyApplying.current=false;quiet.current=false}
  });
 }
 useEffect(()=>{
  const key=(event:KeyboardEvent)=>{
   const direction=historyShortcut(event);if(!direction)return;
   const target=event.target instanceof Element?event.target:null;
   const editingText=target?.closest('textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],input:not([type="range"]):not([type="color"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])');
   const modal=document.querySelector('[role="alertdialog"],[role="dialog"]:not([data-slot="popover-content"])');
   if(editingText||modal)return;
   event.preventDefault();void travelHistory(direction);
  };
  document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);
 });

 function applySelection(next:{scenes:Set<string>;folders:Set<string>}){state.current.selected=next.scenes;state.current.selectedFolders=next.folders;setSelected(next.scenes);setSelectedFolders(next.folders)}
 const toggleSelection=(id:string)=>applySelection(toggleLibraryScene(id,{scenes:state.current.selected,folders:state.current.selectedFolders},state.current.scenes,state.current.folders));
 const toggleFolderSelection=(id:string)=>applySelection(toggleLibraryFolder(id,{scenes:state.current.selected,folders:state.current.selectedFolders},state.current.scenes,state.current.folders));
 const selectAll=()=>applySelection({scenes:new Set(state.current.scenes.map(s=>s.id)),folders:new Set(state.current.folders.map(f=>f.id))});
 const clearSelection=()=>applySelection({scenes:new Set(),folders:new Set()});
 const cancelBatch=()=>{cancel.current=true;setProgress('Finishing current image…')};
 return {resetWorkspace,renameScene,arrangeLibrary,autoSort,setDeviceFinish,setAllDeviceColours,undo:()=>travelHistory('undo'),redo:()=>travelHistory('redo'),undoLabel:history.current.peek('undo')?.label,redoLabel:history.current.peek('redo')?.label,moveScenes,deviceArtworks,openDeviceArtwork,removeDeviceArtwork,host,engine,state,pendingLeave,setPendingLeave,continueNavigation,environmentPreview,artworkPreview,deletedScenes,deletedFolder,removeFolder,removeScenes,undoDelete,device,settings,camera,liveCamera,viewName,ready,loading,busy,progress,message,error,dirty,imageName,hdrName,transparent,resolution,preferences,scenes,folders,selected,selectedFolders,selectAll,clearSelection,artworkDraft,setArtworkDraft,openArtwork,applyArtwork,toggleFolderSelection,pendingBackup,setPendingBackup,lastDownload,downloadAgain:()=>{if(lastDownload)downloadBlob(lastDownload.blob,lastDownload.name)},setSelected,setTransparent,setResolution,notice,pref,update,changeLight,chooseDevice,applyPreset,applyOrbit,run,snapshot,refresh,upload,clearArtwork,uploadHDR,exportPNG,saveCurrent,loadScene,saveFolder,moveScene,removeScene,backup,readBackup,restoreBackup,exportBatch,kit,toggleSelection,cancelBatch};
}
export type DivicesController=ReturnType<typeof useDivices>;
