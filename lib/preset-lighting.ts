import type {CameraState,HDRIShape,Settings,StudioLight,Vec3} from './studio-config';
type Lighting=Pick<Settings,'lights'|'environment'|'envIntensity'|'envRotation'|'hdriShapes'|'reflection'>;
const unit=(v:Vec3):Vec3=>{const length=Math.hypot(...v)||1;return v.map(x=>x/length) as Vec3};
const dot=(a:Vec3,b:Vec3)=>a.reduce((s,x,i)=>s+x*b[i],0);
const rotate=(v:Vec3,a:number):Vec3=>[v[0]*Math.cos(a)-v[1]*Math.sin(a),v[0]*Math.sin(a)+v[1]*Math.cos(a),v[2]];
const reflected=(view:Vec3,normal:Vec3):Vec3=>unit(normal.map((n,i)=>2*dot(view,normal)*n-view[i]) as Vec3);
export const isPresetHighlight=(shape:HDRIShape)=>shape.id.startsWith('preset-corner-')||shape.id.startsWith('bottom-corner-');

// Dark-field lighting: nearby, offset fill falls off along the flat rail;
// longer grazing cards trace the bevel. Overlapping soft reflection spots
// follow the corner arc, instead of producing a single bright patch.
export function productLighting(camera:CameraState,roll=0,existing:HDRIShape[]=[]):Lighting {
 const angle=roll*Math.PI/180,view=unit(rotate(camera.position.map((v,i)=>v-camera.target[i]) as Vec3,-angle)),front=view[2]<0?-1:1;
 const side=view[0]<0?-1:1,vertical=view[1]<0?-1:1,oblique=Math.abs(view[0])>.12;
 const panel=(id:StudioLight['id'],normal:Vec3,power:number,width:number,height:number,distance=6,offset:Vec3=[0,0,0]):StudioLight=>{
  const direction=reflected(view,unit(normal));
  const position=rotate(direction.map((v,i)=>v*distance+offset[i]) as Vec3,angle);
  return {id,name:id==='key'?'Key':id==='fill'?'Fill':'Rim',enabled:true,position,power,width,height,color:'#ffffff'};
 };
 const lights=[
  oblique?panel('key',[side,0,0],.8,1.6,3.2,3,[0,vertical*1.6,0]):panel('key',[-.82,0,front*.57],2.4,.95,6),
  panel('fill',[oblique?side*.94:.82,0,front*(oblique?.34:.57)],3.2,.85,6),
  panel('rim',[0,vertical,0],.85,3.6,2.4,3.5,[side*.5,vertical*.5,0]),
 ];
 const keep=existing.filter(s=>!isPresetHighlight(s)),corners:HDRIShape[]=[];
 // The thin front-facing metal lip needs its own broad reflection. The display
 // remains unlit, so this card reveals the perimeter without washing out artwork.
 const lip=rotate(reflected(view,[0,0,front]),angle);
 corners.push({id:'preset-corner-outline',shape:'circle',color:'white',x:(.5+Math.atan2(lip[2],lip[0])/(Math.PI*2))*100,y:(.5-Math.asin(lip[1])/Math.PI)*100,size:40,strength:2.8,softness:.8});
 for(const x of [-1,1])for(const y of [-1,1])for(const arc of [25,45,65])for(const bevel of [0,.45]){
  const a=arc*Math.PI/180,normal=unit([x*Math.cos(a),y*Math.sin(a),front*bevel]);if(dot(view,normal)<.04)continue;
  const direction=rotate(reflected(view,normal),angle);
  const prominent=y===vertical;
  corners.push({id:`preset-corner-${x}-${y}-${arc}-${bevel}`,shape:'circle',color:'white',x:(.5+Math.atan2(direction[2],direction[0])/(Math.PI*2))*100,y:(.5-Math.asin(Math.max(-1,Math.min(1,direction[1])))/Math.PI)*100,size:24,strength:prominent?7:4.5,softness:.9});
 }
 return {lights,environment:'contour',envIntensity:.42,envRotation:0,hdriShapes:[...corners.slice(0,Math.max(0,32-keep.length)),...keep],reflection:false};
}
