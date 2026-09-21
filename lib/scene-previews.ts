import {Studio} from './studio';
import type {SceneSnapshot,SavedScene} from './studio-config';

const assetHashes=new WeakMap<Blob,Promise<string>>();
async function assetHash(blob:Blob|null){if(!blob)return '';let value=assetHashes.get(blob);if(!value){value=blob.arrayBuffer().then(bytes=>crypto.subtle.digest('SHA-256',bytes)).then(hash=>Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join(''));assetHashes.set(blob,value)}return value}
export async function previewKey(snapshot:SceneSnapshot){const {artwork,hdri,artworkName,hdriName,resolution,...view}=snapshot;return JSON.stringify([view,await assetHash(artwork),await assetHash(hdri),hdriName.toLowerCase().endsWith('.exr')])}
type Listener={active:()=>boolean;done:(url:string)=>void};
type Job={key:string;snapshot:SceneSnapshot;listeners:Listener[]};

// One passive renderer services the visible thumbnails. It never touches the
// working viewport, and identical scene renders share a small session cache.
export class ScenePreviewQueue {
 private cache=new Map<string,string>();private pending=new Map<string,Job>();private jobs:Job[]=[];private running=false;private closed=false;
 private renderer?:Studio;private host?:HTMLDivElement;
 request(scene:SavedScene,done:(url:string)=>void){let cancelled=false;const listener={active:()=>!cancelled&&!this.closed,done};
  void previewKey(scene.snapshot).then(key=>{if(!listener.active())return;const cached=this.cache.get(key);if(cached){done(cached);return}const prior=this.pending.get(key);if(prior){prior.listeners.push(listener);return}const job={key,snapshot:scene.snapshot,listeners:[listener]};this.pending.set(key,job);this.jobs.push(job);void this.drain()}).catch(()=>{if(listener.active())done('')});
  return()=>{cancelled=true};
 }
 private getRenderer(){if(!this.renderer){const host=document.createElement('div');host.className='scene-preview-renderer';host.setAttribute('aria-hidden','true');document.body.appendChild(host);this.host=host;this.renderer=new Studio(host,{passive:true})}return this.renderer}
 private async drain(){if(this.running||this.closed)return;this.running=true;try{
  while(this.jobs.length&&!this.closed){const job=this.jobs.shift()!;if(!job.listeners.some(l=>l.active())){this.pending.delete(job.key);continue}
   try{const renderer=this.getRenderer();await renderer.restore(job.snapshot,true);await renderer.readyToRender();if(this.closed)break;const blob=await renderer.exportPNG(192,job.snapshot.transparent,job.snapshot.device,false);const url=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});if(this.closed)break;
    this.cache.set(job.key,url);if(this.cache.size>128)this.cache.delete(this.cache.keys().next().value!);for(const l of job.listeners)if(l.active())l.done(url);
   }catch{for(const l of job.listeners)if(l.active())l.done('')}finally{this.pending.delete(job.key)}
   await new Promise(resolve=>setTimeout(resolve,0));
  }
 }finally{this.running=false;if(this.closed)this.release()}}
 private release(){this.renderer?.dispose();this.renderer=undefined;this.host?.remove();this.host=undefined;this.jobs=[];this.pending.clear();this.cache.clear()}
 dispose(){this.closed=true;if(!this.running)this.release()}
}
