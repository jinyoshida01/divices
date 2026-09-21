import orbitData from './authored-orbits.json';
import {AUTHORED_PRESETS,adaptDeviceSettings,authoredLighting,lightingSettings} from './authored-presets';
import type {Settings,CameraPreset} from './studio-config';
export const AUTHORED_ORBITS=orbitData as {angle:number;device:string;settings:Settings}[];
export const CAMERA_LIGHTING_VIEWS:Record<CameraPreset,string>={hero:'04 · Low hero',front:'01 · Front',bottom:'14 · Bottom-up close-up','bottom-up':'12 · Low sweep','slight-left':'03 · Three-quarter left','slight-right':'02 · Three-quarter right',side:'09 · Edge study',isometric:'10 · Overhead'};
export function cameraPresetLighting(preset:CameraPreset,device:string){
 const view=AUTHORED_PRESETS.find(v=>v.name===CAMERA_LIGHTING_VIEWS[preset]);
 if(!view)throw new Error('Camera lighting setup is missing.');
 return {...authoredLighting(view,device),reflection:false};
}
export function authoredOrbitLighting(angle:number,device:string){
 const source=AUTHORED_ORBITS.find(v=>v.angle===angle);
 return source?lightingSettings(adaptDeviceSettings(source.settings,device,source.device)):null;
}
