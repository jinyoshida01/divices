'use client';
import {useState} from 'react';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription} from '@/components/ui/alert-dialog';
import {DEVICES} from '@/lib/studio-config';
import type {DivicesController} from '@/lib/use-divices';
export function UnsavedSceneDialog({c}:{c:DivicesController}){
 const current=c.scenes.find(s=>s.id===c.preferences.activeScene),[name,setName]=useState(DEVICES.find(d=>d.id===c.device)?.name+' scene');
 return <AlertDialog open onOpenChange={open=>{if(!open&&!c.busy)c.setPendingLeave(null)}}><AlertDialogContent className="unsaved-dialog"><AlertDialogHeader><AlertDialogTitle>Save changes before leaving?</AlertDialogTitle><AlertDialogDescription>{current?'“'+current.name+'”':'Your current scene'} has changes that have not been saved to the scene library. Save them before switching, or discard them.</AlertDialogDescription></AlertDialogHeader>{!current&&<label className="unsaved-name">Scene name<input value={name} maxLength={80} onChange={e=>setName(e.target.value)} disabled={c.busy}/></label>}{c.error&&<p className="artwork-error" role="alert">{c.message}</p>}<div className="dialog-actions"><button className="secondary-button" disabled={c.busy} onClick={()=>c.setPendingLeave(null)}>Cancel</button><button className="secondary-button" disabled={c.busy} onClick={()=>c.continueNavigation(false)}>Discard changes</button><button className="export" disabled={c.busy||(!current&&!name.trim())} onClick={()=>c.continueNavigation(true,name.trim())}>Save and continue</button></div></AlertDialogContent></AlertDialog>;
}
