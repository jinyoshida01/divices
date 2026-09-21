'use client';
import {createContext,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Image as ImageIcon} from 'lucide-react';
import {ScenePreviewQueue} from '@/lib/scene-previews';
import {withDeviceArtwork} from '@/lib/device-artwork';
import type {DeviceArtworks,SavedScene} from '@/lib/studio-config';
const Defaults=createContext<DeviceArtworks>({});
const Previews=createContext<ScenePreviewQueue|null>(null);
export function ScenePreviewProvider({children,deviceArtworks}:{children:ReactNode;deviceArtworks:DeviceArtworks}){
 const [queue,setQueue]=useState<ScenePreviewQueue|null>(null);
 useEffect(()=>{const next=new ScenePreviewQueue();setQueue(next);return()=>next.dispose()},[]);
 return <Defaults.Provider value={deviceArtworks}><Previews.Provider value={queue}>{children}</Previews.Provider></Defaults.Provider>;
}
export function SceneThumbnail({scene}:{scene:SavedScene}){
 const defaults=useContext(Defaults),renderScene=useMemo(()=>({...scene,snapshot:withDeviceArtwork(scene.snapshot,defaults)}),[scene,defaults]);
 const queue=useContext(Previews),host=useRef<HTMLSpanElement>(null),[visible,setVisible]=useState(false),[url,setURL]=useState<string|null>(null);
 useEffect(()=>{if(!host.current)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'180px'});observer.observe(host.current);return()=>observer.disconnect()},[]);
 useEffect(()=>{if(!visible||!queue)return;setURL(null);return queue.request(renderScene,setURL)},[renderScene.snapshot,visible,queue]);
 return <span ref={host} className={'scene-thumbnail '+(url===null?'loading':'')} style={{backgroundColor:scene.snapshot.settings.background}}>{url?<img src={url} alt={'Preview of '+scene.name} draggable={false}/>:<ImageIcon size={18} aria-label={url===null?'Rendering scene preview':'Scene preview unavailable'}/>}</span>;
}
