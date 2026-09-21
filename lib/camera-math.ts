import {authoredOrbitLighting} from './camera-preset-lighting';
import {productLighting} from './preset-lighting';
import type {CameraState, Settings, Vec3, StudioLight} from './studio-config';
export interface CameraReadout {azimuth:number;elevation:number;distance:number;zoom:number;projection:'perspective'|'orthographic'}
const degrees=180/Math.PI;
export function cameraReadout(camera:CameraState,fov:number):CameraReadout {
 const [x,y,z]=camera.position.map((v,i)=>v-camera.target[i]);
 const distance=Math.hypot(x,y,z),horizontal=Math.hypot(x,z);
 const azimuth=((Math.atan2(x,z)*degrees)%360+360)%360;
 return {azimuth:azimuth>359.99995?0:azimuth,elevation:Math.atan2(y,horizontal)*degrees,distance,zoom:camera.projection==='orthographic'?camera.zoom:(9/Math.max(distance,.001))*Math.tan(16/degrees)/Math.tan(fov/2/degrees)*camera.zoom,projection:camera.projection};
}
type LightRecipe = [position:Vec3,power:number,width:number,height:number,color:string];
interface OrbitLighting {name:string;environmentOffset:number;environmentIntensity:number;lights:[LightRecipe,LightRecipe,LightRecipe]}
// Positions are authored relative to each view: x across frame, y up, z toward camera.
// Fronts get soft framing; profiles get long strips; rear views get broad graded reflections.
export const ORBIT_LIGHTING:Record<number,OrbitLighting>={
 0:{name:'Balanced frontal',environmentOffset:0,environmentIntensity:.45,lights:[
  [[-3.8,1.5,2.4],5.2,1.6,5.8,'#fffaf4'],[[3.8,1.2,2.4],4.4,1.6,5.8,'#edf3ff'],[[0,4.5,-2],4.8,4,.8,'#ffffff']]},
 45:{name:'Sculpted three-quarter',environmentOffset:15,environmentIntensity:.58,lights:[
  [[-3.8,2.8,4],5.2,2.4,5.5,'#fff4e7'],[[3.5,-.3,3],1.1,3,4,'#e2edff'],[[2.6,2.2,-2.7],6.2,.65,5.5,'#f1f5ff']]},
 90:{name:'Precision edge',environmentOffset:40,environmentIntensity:.48,lights:[
  [[-2.8,1.8,3.8],6.4,.85,6,'#fff9f1'],[[3.4,-.7,2.8],1.6,2.5,5,'#e3ecff'],[[1.7,2.6,-3],7.2,.55,5.8,'#ffffff']]},
 135:{name:'Rear shoulder',environmentOffset:-35,environmentIntensity:.6,lights:[
  [[-3,3.4,4.8],5,4.5,5.5,'#fff6eb'],[[4.2,.6,2],1.25,2.4,4.5,'#e0eaff'],[[2,1.5,-3.2],6,.7,5,'#ffffff']]},
 180:{name:'Satin rear',environmentOffset:25,environmentIntensity:.55,lights:[
  [[-3.2,3.1,4.5],4.5,4.8,5.8,'#fff9f2'],[[4,-.4,3.2],1.35,2.5,5,'#e6eeff'],[[2.8,2.8,-2.5],5.8,.85,5.5,'#ffffff']]},
 235:{name:'Gallery rear',environmentOffset:-18,environmentIntensity:.57,lights:[
  [[3.4,3.2,4.4],4.8,3.6,5.5,'#fff4e9'],[[-3.5,-.5,3],1.15,3.2,4.8,'#e4edff'],[[-2.2,2.4,-3],6.5,.7,5.2,'#f3f6ff']]},
 270:{name:'Silver edge',environmentOffset:-42,environmentIntensity:.46,lights:[
  [[3.1,2.1,3.8],6.1,1.05,6,'#fff8ef'],[[-3.8,-.4,2.5],1.45,2.7,4.6,'#dde9ff'],[[-1.8,2.8,-3.2],7.4,.6,5.5,'#ffffff']]},
 325:{name:'Soft return',environmentOffset:12,environmentIntensity:.62,lights:[
  [[3.6,3,4.6],4.9,3.2,5.2,'#fff5e9'],[[-4,.3,3.2],1.2,3.6,4.4,'#e6eeff'],[[-2.5,2,-2.8],5.9,.8,5,'#f7f9ff']]},
};
// Orbit the centred enclosure, preserving distance, tilt and zoom rather than a panned target.
export function orbitAtAngle(angle:number,camera:CameraState,settings:Settings,device='generic-smartphone'){
 const recipe=ORBIT_LIGHTING[angle];if(!recipe)throw new Error('Choose a supported orbit angle');
 const before=cameraReadout(camera,settings.fov),r=Math.hypot(camera.position[0]-camera.target[0],camera.position[2]-camera.target[2]),theta=angle/degrees;
 const sine=Math.abs(Math.sin(theta))<1e-12?0:Math.sin(theta),cosine=Math.abs(Math.cos(theta))<1e-12?0:Math.cos(theta);
 const nextCamera:CameraState={...structuredClone(camera),target:[0,0,0],position:[r*sine,camera.position[1]-camera.target[1],r*cosine]};
 const tilt=before.elevation/degrees,ids=['key','fill','rim'] as const;
 const lights:StudioLight[]=recipe.lights.map(([position,power,width,height,color],index)=>{
  const [x,y,z]=position,vertical=y*Math.cos(tilt)+z*Math.sin(tilt),depth=-y*Math.sin(tilt)+z*Math.cos(tilt);
  return {id:ids[index],name:['Key','Fill','Rim'][index],enabled:true,power,width,height,color,position:[x*Math.cos(theta)+depth*Math.sin(theta),vertical,-x*Math.sin(theta)+depth*Math.cos(theta)]};
 });
 const nextSettings:Settings={...structuredClone(settings),envRotation:((angle+recipe.environmentOffset+180)%360+360)%360-180,envIntensity:recipe.environmentIntensity,lights};
 Object.assign(nextSettings,authoredOrbitLighting(angle,device)??productLighting(nextCamera,nextSettings.roll,settings.hdriShapes));
 return {camera:nextCamera,settings:nextSettings};
}
