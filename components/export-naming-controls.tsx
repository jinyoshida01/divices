'use client';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {deviceExportFolder,filenamePart,imageFilename,exportManifest,type ExportNaming} from '@/lib/export-naming';
import type {DivicesController} from '@/lib/use-divices';
export function ExportNamingControls({c}:{c:DivicesController}){
 const n=c.preferences.exportNaming,disabled=c.busy||c.loading,scene=c.scenes.find(s=>s.id===c.preferences.activeScene),change=(patch:Partial<ExportNaming>)=>c.pref('exportNaming',{...n,...patch});
 const selected=c.scenes.filter(s=>c.selected.has(s.id));const batch=selected.length>1?exportManifest(selected,n,c.folders):null;
 const folder=filenamePart(n.folder,deviceExportFolder(c.device));
 return <details className="export-naming"><summary>Export naming</summary><div className="select-row"><label>File names</label><Select disabled={disabled} value={n.mode} onValueChange={mode=>change({mode:mode as ExportNaming['mode']})}><SelectTrigger aria-label="Export file naming"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="number">Scene number · 01.png</SelectItem><SelectItem value="scene-name">Scene name</SelectItem><SelectItem value="device-number">Device + number</SelectItem><SelectItem value="custom">Custom prefix + number</SelectItem></SelectContent></Select></div>
 {n.mode==='custom'&&<label className="export-name-field">File prefix<input disabled={disabled} aria-label="Export file prefix" value={n.prefix} maxLength={100} placeholder="Campaign" onChange={e=>change({prefix:e.target.value})}/></label>}
 <label className="export-name-field">ZIP / folder name<input disabled={disabled} aria-label="Export folder name" value={n.folder} maxLength={100} placeholder={deviceExportFolder(c.device)} onChange={e=>change({folder:e.target.value})}/></label><p className="control-hint">Leave blank to use the exported device’s name. Multi-scene exports prepend each scene’s folder name, for example Samsung-Galaxy-24_01.png.</p><output className="export-name-preview" aria-label="Export name preview">{batch?.files[0]??(folder+'/'+imageFilename(scene,0,n,c.device))}</output></details>;
}
