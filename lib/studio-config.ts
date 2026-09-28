import {cameraPresetLighting} from './camera-preset-lighting';
import type {ExportNaming} from './export-naming';
export type Vec3 = [number, number, number];
export type LightId = 'key' | 'fill' | 'rim';
export type Projection = 'perspective' | 'orthographic';
export type CameraPreset = 'hero' | 'front' | 'bottom' | 'bottom-up' | 'slight-left' | 'slight-right' | 'side' | 'isometric';
export type EnvironmentId = 'none' | 'softbox' | 'strip' | 'daylight' | 'screen-soft' | 'contour' | 'studio-hdri' | 'photo-studio' | 'daylight-interior' | 'overcast-plaza' | 'custom';
export interface HDRIShape {id:string;shape:'circle'|'square';color:'white'|'black';x:number;y:number;size:number;strength:number;softness:number}
export interface StudioLight { id: LightId; name: string; enabled: boolean; power: number; color: string; position: Vec3; width: number; height: number }
export interface Settings {
 fov: number; exposure: number; reflection: boolean; roll: number; background: string;
 deviceColor: string; finish: 'satin' | 'polished' | 'matte'; screenBrightness: number;
 environment: EnvironmentId; envIntensity: number; envRotation: number; envBackground: boolean; envBlur: number;
 glowEnabled:boolean; glowColor:string; glowStrength:number; glowWidth:number;
 vfx: 'none'|'flare'|'anamorphic'|'sparkles'|'bokeh'; vfxStrength:number; vfxColor:string; vfxX:number; vfxY:number; vfxScale:number;
 toneMapping: 'aces' | 'agx' | 'neutral'; lights: StudioLight[]; hdriShapes:HDRIShape[];
}
export interface CameraState { projection: Projection; position: Vec3; target: Vec3; up: Vec3; zoom: number; orthoHeight: number }
export interface StudioSnapshot { version: 2; device: string; settings: Settings; camera: CameraState; transparent: boolean; resolution: number; artwork: Blob | null; artworkName: string; hdri: Blob | null; hdriName: string }
export interface SavedStudio { id: string; name: string; created: number; updated: number; snapshot: StudioSnapshot; folderId?:string|null; kitRevision?:number;order?:number }
export type SceneSnapshot=StudioSnapshot;
export type SavedScene=SavedStudio;
export interface SceneFolder {id:string;name:string;parentId:string|null;kitViews?:number;order?:number}
export interface ViewPreferences {leftPanelWidth:number;compactScenes:boolean;lightBackground:boolean;splitLights:boolean;exportCollapsed:boolean;selectedLight:LightId;leftTab:string;rightTab:string;activeScene:string;exportNaming:ExportNaming;deviceFinishes?:Record<string,Pick<Settings,'deviceColor'|'finish'>>}
export interface DeviceArtwork {artwork:Blob;artworkName:string}
export type DeviceArtworks=Record<string,DeviceArtwork>;
export interface WorkspaceState {current:SceneSnapshot|null;preferences:ViewPreferences;deviceArtworks?:DeviceArtworks}
export const DEVICES = [
 {id:'generic-smartphone',screenWidth:1080,screenHeight:2400,reference:'',name:'Generic Smartphone',detail:'Unbranded · 20:9'},
 {id:'iphone-16-pro-max',screenWidth:1320,screenHeight:2868,reference:'https://support.apple.com/en-us/121032',name:'iPhone 16 Pro Max',detail:'6.9″ · Titanium'},
 {id:'iphone-14-pro',screenWidth:1179,screenHeight:2556,reference:'https://support.apple.com/en-us/111849',name:'iPhone 14 Pro',detail:'6.1″ · Stainless steel'},
 {id:'ipad-pro',screenWidth:2048,screenHeight:2732,reference:'https://support.apple.com/en-us/111977',name:'iPad Pro',detail:'12.9″ · Aluminium'},
 {id:'galaxy-s24',screenWidth:1080,screenHeight:2340,reference:'https://www.samsung.com/in/business/smartphones/galaxy-s/galaxy-s24-sm-s921bzyqins/',name:'Samsung Galaxy S24',detail:'6.2″ · Aluminium'},
 {id:'galaxy-tab-a7-lite',screenWidth:800,screenHeight:1340,reference:'https://www.samsung.com/sg/business/tablets/galaxy-tab-a/galaxy-tab-a7-lite-wifi-sm-t220nzafxsp/',name:'Galaxy Tab A7 Lite',detail:'8.7″ · Aluminium'},
];
export const COLORS = [{name:'Natural',value:'#a3a09a'},{name:'Black',value:'#292c31'},{name:'Silver',value:'#c4c8ce'},{name:'Blue',value:'#435874'},{name:'Desert',value:'#b59c80'},{name:'Violet',value:'#797188'}];
export const ENVIRONMENTS = [{id:'none',name:'No HDRI'},{id:'screen-soft',name:'Screen Soft Light'},{id:'contour',name:'Contour · Dark Studio'},{id:'softbox',name:'Softbox Room'},{id:'strip',name:'Strip Lights'},{id:'daylight',name:'Daylight Loft'},{id:'studio-hdri',name:'Photo Room · HDRI'},{id:'photo-studio',name:'Photo Studio · HDRI'},{id:'daylight-interior',name:'Daylight Interior · HDRI'},{id:'overcast-plaza',name:'Overcast Plaza · HDRI'}];
export const PHOTO_HDRIS:Partial<Record<EnvironmentId,string>>={'studio-hdri':'studio-small-03-1k.hdr','photo-studio':'photo_studio_01-2k.hdr','daylight-interior':'poly_haven_studio-2k.hdr','overcast-plaza':'potsdamer_platz-2k.hdr'};
export function defaultSettings(): Settings {return {hdriShapes:[],vfx:'none',vfxStrength:.6,vfxColor:'#d5e8ff',vfxX:72,vfxY:24,vfxScale:1,glowEnabled:false,glowColor:'#b5c7ff',glowStrength:3,glowWidth:1,fov:32,exposure:1,reflection:true,roll:0,background:'#24262a',deviceColor:'#a3a09a',finish:'satin',screenBrightness:1,environment:'softbox',envIntensity:.8,envRotation:0,envBackground:false,envBlur:.35,toneMapping:'neutral',lights:[
 {id:'key',name:'Key',enabled:true,power:5,color:'#fff1df',position:[-3.5,3.4,4],width:3,height:4},
 {id:'fill',name:'Fill',enabled:true,power:2,color:'#dce8ff',position:[4,1.2,2.5],width:2.5,height:4},
 {id:'rim',name:'Rim',enabled:true,power:5,color:'#ffffff',position:[2.5,3,-3],width:1.2,height:4},
 ]}}
export function cameraFor(preset:CameraPreset):CameraState {
 const positions:Record<CameraPreset,Vec3>={hero:[3.7,-1.45,8.2],front:[0,0,9],bottom:[2.8,-6.2,6.5],'bottom-up':[-2.6,-3.5,8.4],'slight-left':[-2.3,.45,8.9],'slight-right':[2.3,.45,8.9],side:[8,.6,3],isometric:[7,7,7]};
 return {projection:preset==='isometric'?'orthographic':'perspective',position:positions[preset],target:[0,0,0],up:[0,1,0],zoom:1,orthoHeight:5.1};
}
export function settingsFor(preset:CameraPreset,current:Settings,device='generic-smartphone'):Settings {
 return {...structuredClone(current),fov:preset==='hero'?30:preset==='bottom'?35:32,roll:preset==='hero'?-8:0,...cameraPresetLighting(preset,device)};
}
// Grazing panels stay out of the front display's mirror-reflection cone.
export function screenLighting(position:Vec3,variation=0):Pick<Settings,'lights'|'environment'|'envIntensity'|'envRotation'> {
 const side=position[0]<0?-1:1,low=position[1]<0?-1:1,v=variation*.07;
 return {environment:'screen-soft',envIntensity:.42,envRotation:0,lights:[
 {id:'key',name:'Key',enabled:true,position:[side*(5.8+v),low*(2.2+v),.35],power:4.2+v,width:.8,height:3.2,color:'#fff8ef'},
 {id:'fill',name:'Fill',enabled:true,position:[-side*5.5,-low*1.8,-1.8],power:1.2,width:1.4,height:4.2,color:'#e5edff'},
 {id:'rim',name:'Rim',enabled:true,position:[side*2.8,3.5,-4],power:5.6+v,width:1,height:4.8,color:'#f3f6ff'},
 ]};
}
export const ORBIT_ANGLES=[0,45,90,135,180,235,270,325] as const;
export const CAMERA_PRESETS:{id:CameraPreset;name:string}[]=[{id:'hero',name:'Hero'},{id:'front',name:'Front'},{id:'bottom',name:'Bottom Angle'},{id:'bottom-up',name:'Low Three-quarter'},{id:'slight-left',name:'Slight Left'},{id:'slight-right',name:'Slight Right'},{id:'side',name:'Side Profile'},{id:'isometric',name:'Isometric'}];
interface StartingStudio {id:string;name:string;device:string;description:string;camera:CameraPreset;color:string;env:EnvironmentId;settings:Settings;cameraState:CameraState}
function startingStudio(id:string,name:string,device:string,description:string,camera:CameraPreset,color:string,env:EnvironmentId,treatment:Partial<Settings>,position:Vec3):StartingStudio{
 const settings={...settingsFor(camera,{...defaultSettings(),deviceColor:color,environment:env}),...treatment};
 return {id,name,device,description,camera,color,env,settings,cameraState:{...cameraFor(camera),position}};
}
function light(id:LightId,position:Vec3,power:number,width:number,height:number,color:string):StudioLight{return {id,name:id==='key'?'Key':id==='fill'?'Fill':'Rim',enabled:true,position,power,width,height,color}}
export const BUILTIN_STUDIOS:StartingStudio[] = [
 startingStudio('clean','Essential / soft silver','generic-smartphone','Broad soft light · a clean three-quarter view','slight-right','#adb3ba','softbox',{finish:'satin',toneMapping:'neutral',exposure:1.05,envIntensity:.85,fov:30,lights:[light('key',[-3.5,3.2,4.5],5,4,5,'#ffffff'),light('fill',[4,.4,3],1.4,3,4,'#dce7ff'),light('rim',[2,3,-3],5,1,5,'#ffffff')]},[2.8,.7,9.2]),
 startingStudio('editorial','Titanium / low angle','iphone-16-pro-max','Warm key light · a crisp cool rim','bottom-up','#a3a09a','studio-hdri',{finish:'satin',toneMapping:'agx',fov:30,roll:-7,envRotation:35,envIntensity:.6,exposure:1.05,lights:[light('key',[-3,2,4],5,4,5,'#fff0dc'),light('fill',[3,-2,4],1.5,3,3,'#d1deff'),light('rim',[3,1,-3],7,.8,5,'#d5e8ff')]},[-3,-2.5,9]),
 startingStudio('classic','Silver / soft daylight','iphone-14-pro','Gentle side angle · polished steel edges','slight-left','#c4c8ce','daylight',{finish:'polished',toneMapping:'neutral',envIntensity:.6,envRotation:-35,exposure:1,fov:30,roll:4,lights:[light('key',[-4,3,4],4.5,5,5,'#fffaee'),light('fill',[4,0,3],1.2,4,5,'#edf3ff'),light('rim',[2,2,-3],4,2,5,'#ffffff')]},[-2,.7,9.3]),
 startingStudio('tablet','Graphite / isometric','ipad-pro','Parallel projection · soft architectural light','isometric','#555b64','softbox',{finish:'matte',toneMapping:'agx',envIntensity:.9,exposure:1.1,roll:-8,lights:[light('key',[-3,5,4],5,5,5,'#f2f4ff'),light('fill',[4,2,4],2,4,4,'#dce8ff'),light('rim',[3,4,-3],6,1,5,'#ffffff')]},[7,7,7]),
 startingStudio('detail','Violet / sculpted edge','galaxy-s24','Low viewpoint · long strip reflections','bottom-up','#797188','strip',{finish:'satin',toneMapping:'agx',envIntensity:.85,envRotation:65,roll:10,fov:32,lights:[light('key',[-3,1,4],6,1.2,6,'#f1e6ff'),light('fill',[3,-2,4],2,3,4,'#dce8ff'),light('rim',[3,2,-3],8,.7,5,'#eee4ff')]},[3,-2.2,9]),
 startingStudio('tab','Pearl / open daylight','galaxy-tab-a7-lite','Airy light · a relaxed editorial tilt','slight-right','#c4c8ce','daylight',{finish:'satin',toneMapping:'neutral',envIntensity:.75,roll:-9,fov:32,lights:[light('key',[-4,4,5],4,5,6,'#fff8ed'),light('fill',[4,1,3],1.4,4,5,'#e9efff'),light('rim',[2,3,-3],4,2,5,'#ffffff')]},[2.4,1.2,9.1]),
 startingStudio('noir','Graphite / rim light','generic-smartphone','Dark frame · narrow highlights from below','bottom','#30353d','strip',{finish:'polished',toneMapping:'agx',envIntensity:.5,exposure:1.1,roll:-5,fov:34,lights:[light('key',[-3,-2,4],5,1.4,5,'#dce5ff'),light('fill',[3,-1,4],1.2,3,3,'#ffffff'),light('rim',[3,2,-3],9,.6,5,'#f3e6db')]},[2.5,-4.6,8]),
];
