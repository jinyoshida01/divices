'use client';
import {useEffect,useRef,useState} from 'react';
import {Upload,Image as ImageIcon} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Checkbox} from '@/components/ui/checkbox';
import {Choice} from './scene-controls';
import {ArtworkSceneTree} from './artwork-scene-tree';
import {folderPath} from './scene-library-panel';
import {artworkTargets,type ArtworkScope} from '@/lib/artwork-scopes';
import {DEVICES} from '@/lib/studio-config';
import type {DivicesController} from '@/lib/use-divices';

export function ArtworkDialog({c}:{c:DivicesController}){
 const draft=c.artworkDraft!,active=c.scenes.find(s=>s.id===c.preferences.activeScene),input=useRef<HTMLInputElement>(null);
 const [scope,setScope]=useState<ArtworkScope>(draft.initialScope),[sceneIds,setSceneIds]=useState(()=>new Set(draft.sceneIds??c.selected)),[folderId,setFolderId]=useState(active?.folderId??c.folders[0]?.id??''),[deviceIds,setDeviceIds]=useState(()=>new Set(draft.deviceIds??[c.device])),[preview,setPreview]=useState('');
 useEffect(()=>{if(!draft.artwork){setPreview('');return}const url=URL.createObjectURL(draft.artwork);setPreview(url);return()=>URL.revokeObjectURL(url)},[draft.artwork]);
 const target={scope,sceneIds:[...sceneIds],folderId,device:c.device,deviceIds:[...deviceIds]},targets=artworkTargets(target,c.scenes,c.folders,c.preferences.activeScene),count=targets.length,disabled=c.busy||c.loading;
 return <Dialog open onOpenChange={open=>{if(!open&&!disabled)c.setArtworkDraft(null)}}><DialogContent className="artwork-dialog"><DialogHeader><DialogTitle>{draft.deviceOnly?'Default artworks · device overrides':'Add screen artworks'}</DialogTitle><DialogDescription>{draft.deviceOnly?'Override the artwork in every scene, preview and export for the selected devices, including future scenes and kits. Individual scene artwork is kept and returns when you remove the override.':'Choose exactly which scenes receive this artwork. Each device keeps its own centred crop.'}</DialogDescription></DialogHeader>
  <div className="artwork-source" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!disabled)c.upload(e.dataTransfer.files[0])}}>
   <div className="artwork-source-preview">{preview?<img src={preview} alt="Artwork to assign"/>:<span className="green-artwork" aria-label="Green screen artwork"/>}</div>
   <div><strong title={draft.name}>{draft.name}</strong><button className="secondary-button" disabled={disabled} onClick={()=>input.current?.click()}><Upload size={14}/>Choose image</button><small>PNG, JPG or WebP · up to 30 MB</small></div>
  </div><input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{c.upload(e.target.files?.[0]);e.target.value=''}}/>
  {!draft.deviceOnly&&<fieldset className="artwork-scopes" disabled={disabled}><legend>Apply artwork to</legend>{([
   ['current','Current scene only',active?.name??'The current unsaved view'],
   ['selected','Choose individual scenes',sceneIds.size+' selected'],
   ['folder','Scenes in a folder','Includes all subfolders'],
   ['device','Scenes using selected devices','Across every folder'],
   ['all','All scenes',c.scenes.length+' saved scenes'],
  ] as const).map(([value,label,detail])=><label key={value} className={scope===value?'chosen':''}><input type="radio" name="artwork-scope" value={value} checked={scope===value} onChange={()=>setScope(value)}/><span><strong>{label}</strong><small>{detail}</small></span></label>)}</fieldset>}
  {scope==='folder'&&(c.folders.length?<Choice label="Artwork folder" value={folderId} onChange={setFolderId} disabled={disabled} options={c.folders.map(f=>({value:f.id,label:folderPath(f.id,c.folders)}))}/>:<p className="control-hint">Create a folder in Scenes first.</p>)}
  {scope==='device'&&<fieldset className="artwork-device-picker" disabled={disabled}><legend>{draft.deviceOnly?'Devices to override':'Devices to update'}</legend>{DEVICES.map(d=><label key={d.id}><Checkbox className="scene-checkbox" aria-label={draft.deviceOnly?'Default artwork for '+d.name:'Apply artwork to all '+d.name+' scenes'} checked={deviceIds.has(d.id)} onCheckedChange={()=>setDeviceIds(old=>{const next=new Set(old);next.has(d.id)?next.delete(d.id):next.add(d.id);return next})}/><span><strong>{d.name}</strong><small>{draft.deviceOnly?(c.deviceArtworks[d.id]?'Current override: '+c.deviceArtworks[d.id].artworkName:'No override · uses scene artwork'):c.scenes.filter(s=>s.snapshot.device===d.id).length+' scenes across all folders'}</small></span></label>)}</fieldset>}
  {scope==='selected'&&<ArtworkSceneTree scenes={c.scenes} folders={c.folders} selected={sceneIds} onChange={setSceneIds} disabled={disabled}/>}
  {scope!=='current'&&scope!=='selected'&&count>0&&<details className="artwork-targets"><summary>View {count} affected {count===1?'scene':'scenes'}</summary><ul>{targets.map(s=><li key={s.id}>{s.name}<small>{folderPath(s.folderId,c.folders)}</small></li>)}</ul></details>}
  <p className="artwork-apply-summary" role="status">{draft.deviceOnly?`${deviceIds.size} ${deviceIds.size===1?'device':'devices'} selected. Defaults are saved automatically and included in backups.`:scope==='current'&&!active?'Updates this view. Save a scene to keep it in your library.':count?`Saves artwork to ${count} ${count===1?'scene':'scenes'}. Camera, lighting and other settings stay as they are.`:'No scenes match this selection.'}</p>
  {!draft.deviceOnly&&targets.some(s=>c.deviceArtworks[s.snapshot.device])&&<p className="control-hint">Some selected devices have a default artwork override. Your scene artwork will be saved underneath it. Remove the override in Devices to show individual artworks.</p>}
  {c.error&&<p className="artwork-error" role="alert">{c.message}</p>}
  <div className="dialog-actions"><button className="secondary-button" disabled={disabled} onClick={()=>c.setArtworkDraft(null)}>Cancel</button><button className="export" disabled={disabled||(draft.deviceOnly?(!deviceIds.size||!draft.artwork):(scope!=='current'&&!count))} onClick={()=>c.applyArtwork(target)}><ImageIcon size={16}/>{disabled?'Applying…':draft.deviceOnly?'Save device overrides':scope==='current'&&!active?'Apply to current view':`Apply to ${count} ${count===1?'scene':'scenes'}`}</button></div>
 </DialogContent></Dialog>;
}
