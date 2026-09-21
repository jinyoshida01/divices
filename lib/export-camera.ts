import * as T from 'three';

/** Fit the complete device in a square export without changing the viewport camera. */
export function createExportCamera(device:T.Object3D,source:T.PerspectiveCamera|T.OrthographicCamera,fov:number,size:number,glowWidth=0){
 device.updateWorldMatrix(true,true);source.updateMatrixWorld(true);
 const camera=source.clone(),bounds=new T.Box3(),point=new T.Vector3(),toView=new T.Matrix4();
 // Measure actual vertices in view space, including roll, buttons and camera protrusions.
 device.traverseVisible(object=>{
  if(!(object instanceof T.Mesh))return;
  const positions=object.geometry.getAttribute('position');if(!positions)return;
  toView.multiplyMatrices(source.matrixWorldInverse,object.matrixWorld);
  for(let i=0;i<positions.count;i++)bounds.expandByPoint(point.fromBufferAttribute(positions,i).applyMatrix4(toView));
 });
 if(bounds.isEmpty())throw new Error('The device could not be framed for export.');
 const dimensions=bounds.getSize(new T.Vector3()),half=dimensions.clone().multiplyScalar(.5);
 const centre=bounds.getCenter(new T.Vector3()).applyMatrix4(source.matrixWorld);
 // The glow blur has finite support of 3.230769 samples in each direction.
 const halo=glowWidth>0?3.230769*Math.max(.75/size,glowWidth/1200)+2/size:0;
 const padding=.045+halo,usable=1-2*padding;
 let distance:number;
 if(camera instanceof T.PerspectiveCamera){
  camera.aspect=1;camera.fov=fov;
  const tangent=Math.tan(T.MathUtils.degToRad(fov)/2)/camera.zoom;
  distance=half.z+Math.max(half.x,half.y)/(tangent*usable);
 }else{
  const span=Math.max(half.x,half.y)/usable*camera.zoom;
  camera.left=-span;camera.right=span;camera.top=span;camera.bottom=-span;
  distance=half.z+Math.max(1,dimensions.length());
 }
 camera.position.copy(centre).add(new T.Vector3(0,0,distance).applyQuaternion(camera.quaternion));
 camera.near=Math.max(.01,(distance-half.z)*.5);
 camera.far=distance+half.z+Math.max(1,dimensions.length()*.25);
 camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 return camera;
}
