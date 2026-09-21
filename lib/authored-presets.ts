import data from './authored-presets.json';
import sizes from './device-enclosures.json';
import type {CameraState,Settings,Vec3} from './studio-config';
export const PRESET_REVISION=13;
export const AUTHORED_PRESETS=data as {name:string;sourceId:string;camera:CameraState;settings:Settings}[];
export const RETIRED_PRESETS=['08 · Architectural','11 · Landscape screen','11 · Landscape float'];
const rotate=(v:Vec3,a:number):Vec3=>[v[0]*Math.cos(a)-v[1]*Math.sin(a),v[0]*Math.sin(a)+v[1]*Math.cos(a),v[2]];
// Models share a normalised height. Account for wider enclosures in device
// coordinates before applying the scene roll, retaining the authored HDRI map.
export function authoredSettings(preset:typeof AUTHORED_PRESETS[number],device:string):Settings {
 return adaptDeviceSettings(preset.settings,device);
}
export function adaptDeviceSettings(value:Settings,device:string,sourceDevice='generic-smartphone'):Settings {
 const settings=structuredClone(value);
 if(device===sourceDevice)return settings;
 const size=sizes[device as keyof typeof sizes]??sizes['generic-smartphone'],base=sizes[sourceDevice as keyof typeof sizes]??sizes['generic-smartphone'];
 const sx=size[0]/base[0],sy=size[1]/base[1],angle=settings.roll*Math.PI/180;
 settings.lights=settings.lights.map(light=>{const local=rotate(light.position,-angle);return {...light,position:rotate([local[0]*sx,local[1]*sy,local[2]],angle),width:Math.min(8,light.width*sx),height:Math.min(8,light.height*sy)}});
 return settings;
}
export function authoredLighting(preset:typeof AUTHORED_PRESETS[number],device:string){
 return lightingSettings(authoredSettings(preset,device));
}
export function lightingSettings(s:Settings){
 return {lights:s.lights,hdriShapes:s.hdriShapes,environment:s.environment,envIntensity:s.envIntensity,envRotation:s.envRotation,envBackground:s.envBackground,envBlur:s.envBlur,reflection:s.reflection,exposure:s.exposure,toneMapping:s.toneMapping};
}
