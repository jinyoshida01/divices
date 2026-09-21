import * as T from 'three';

// Measure in the device's coordinate system, before the presentation roll.
export function screenAspect(screen:T.Mesh,rig:T.Object3D):number {
 rig.updateWorldMatrix(true,true);
 const matrix=new T.Matrix4().copy(rig.matrixWorld).invert().multiply(screen.matrixWorld);
 const bounds=new T.Box3(),point=new T.Vector3(),positions=screen.geometry.getAttribute('position');
 for(let i=0;i<positions.count;i++)bounds.expandByPoint(point.fromBufferAttribute(positions,i).applyMatrix4(matrix));
 const size=bounds.getSize(new T.Vector3());
 return size.x/size.y;
}

// Use the enclosure, not its asymmetric camera bump or buttons, as the orbit centre.
export function centreDevice(root:T.Group):T.Box3 {
 root.updateMatrixWorld(true);
 let enclosure:T.Box3|undefined,area=0;
 root.traverse(object=>{
  if(!(object instanceof T.Mesh))return;
  const materials=Array.isArray(object.material)?object.material:[object.material];
  if(!materials.some(m=>['Frame','Back'].includes(m.name)))return;
  const box=new T.Box3().setFromObject(object),size=box.getSize(new T.Vector3());
  if(size.x*size.y>area){area=size.x*size.y;enclosure=box}
 });
 if(!enclosure)throw new Error('Device enclosure is missing.');
 const bounds=enclosure as T.Box3,centre=bounds.getCenter(new T.Vector3());
 root.position.sub(centre);root.updateMatrixWorld(true);
 return bounds.translate(centre.negate());
}
