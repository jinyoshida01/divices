import orbitData from './authored-orbits.json';
import {AUTHORED_PRESETS,adaptDeviceSettings,authoredLighting,lightingSettings} from './authored-presets';
import type {Settings,CameraPreset} from './studio-config';
export const AUTHORED_ORBITS=orbitData as {angle:number;device:string;settings:Settings}[];
export const CAMERA_LIGHTING_VIEWS:Record<CameraPreset,string>={hero:'04 · Low hero',front:'01 · Front',bottom:'14 · Bottom-up close-up','bottom-up':'12 · Low sweep','slight-left':'03 · Three-quarter left','slight-right':'02 · Three-quarter right',side:'09 · Edge study',isometric:'10 · Overhead'};
export function cameraPresetLighting(preset:CameraPreset,device:string){
 const view=AUTHORED_PRESETS.find(v=>v.name===CAMERA_LIGHTING_VIEWS[preset]);
 if(!view)throw new Error('Camera lighting setup is missing.');
 // This camera is lower and more frontal than the authored Low Sweep scene.
 // Keep its reflection cone dark; side cards shape the bevels and rounded ends.
 if(preset==='bottom-up'){
  const settings:Settings={...structuredClone(view.settings),roll:0,environment:'contour',envIntensity:.38,envRotation:0,reflection:false,hdriShapes:[
   {id:'low-left-rim',shape:'circle',color:'white',x:98,y:46,size:38,strength:3.8,softness:.7},
   {id:'low-right-rim',shape:'circle',color:'white',x:53,y:56,size:38,strength:4.2,softness:.75},
   {id:'low-corner-lift',shape:'circle',color:'white',x:25,y:82,size:34,strength:2,softness:.8},
   {id:'low-screen-flag',shape:'square',color:'black',x:75,y:50,size:44,strength:1,softness:.2},
  ],lights:[
   {id:'key',name:'Key',enabled:true,color:'#ffffff',position:[-4.8,1.8,-2],power:1.6,width:.65,height:4.2},
   {id:'fill',name:'Fill',enabled:true,color:'#ffffff',position:[4.6,-1.1,-2.2],power:1.1,width:.7,height:3.8},
   {id:'rim',name:'Rim',enabled:true,color:'#ffffff',position:[-.8,-4.5,-2.8],power:1.2,width:2.6,height:1.2},
  ]};
  return lightingSettings(adaptDeviceSettings(settings,device));
 }
 return {...authoredLighting(view,device),reflection:false};
}
export function authoredOrbitLighting(angle:number,device:string){
 const source=AUTHORED_ORBITS.find(v=>v.angle===angle);
 return source?lightingSettings(adaptDeviceSettings(source.settings,device,source.device)):null;
}
