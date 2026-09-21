import * as T from 'three';

// Screen-space silhouette halo. Its alpha is composited into transparent PNGs too.
export class OutlineGlow {
 private mask = new T.WebGLRenderTarget(1,1,{depthBuffer:true,samples:4,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
 private horizontal = new T.WebGLRenderTarget(1,1,{depthBuffer:false,type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
 private blurred = new T.WebGLRenderTarget(1,1,{depthBuffer:false,type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
 private maskScene = new T.Scene();
 private maskRig = new T.Group();
 private white = new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide,toneMapped:false});
 private quadScene = new T.Scene();
 private camera = new T.OrthographicCamera(-1,1,1,-1,0,1);
 private geometry = new T.PlaneGeometry(2,2);
 private vertex = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
 private blur = new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{source:{value:null},stepSize:{value:new T.Vector2()}},vertexShader:this.vertex,fragmentShader:`varying vec2 vUv; uniform sampler2D source; uniform vec2 stepSize;
 void main(){float v=texture2D(source,vUv).r*.227027;v+=(texture2D(source,vUv+stepSize*1.384615).r+texture2D(source,vUv-stepSize*1.384615).r)*.316216;v+=(texture2D(source,vUv+stepSize*3.230769).r+texture2D(source,vUv-stepSize*3.230769).r)*.070270;gl_FragColor=vec4(v,v,v,1.);}`});
 private composite = new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false,uniforms:{mask:{value:this.mask.texture},halo:{value:this.blurred.texture},colour:{value:new T.Color()},strength:{value:1}},vertexShader:this.vertex,fragmentShader:`varying vec2 vUv;uniform sampler2D mask;uniform sampler2D halo;uniform vec3 colour;uniform float strength;
 void main(){float coverage=clamp(texture2D(mask,vUv).r,0.,1.);float a=(1.-exp(-texture2D(halo,vUv).r*strength*1.6))*(1.-coverage);gl_FragColor=vec4(colour,a);
 #include <colorspace_fragment>
 }`});
 private quad = new T.Mesh(this.geometry,this.blur);
 constructor(){this.maskScene.add(this.maskRig);this.quadScene.add(this.quad)}
 setDevice(device:T.Object3D){this.maskRig.clear();const clone=device.clone(true);clone.traverse(o=>{if(o instanceof T.Mesh)o.material=this.white});this.maskRig.add(clone)}
 render(renderer:T.WebGLRenderer,rig:T.Group,camera:T.Camera,colour:string,strength:number,width:number){
  const size=renderer.getDrawingBufferSize(new T.Vector2()),w=Math.max(1,Math.ceil(size.x)),h=Math.max(1,Math.ceil(size.y));
  const samples=Math.min(renderer.capabilities.maxSamples,w*h>8_000_000?2:4);if(this.mask.samples!==samples){this.mask.dispose();this.mask.samples=samples}
  if(this.mask.width!==w||this.mask.height!==h)for(const target of [this.mask,this.horizontal,this.blurred])target.setSize(w,h);
  this.maskRig.position.copy(rig.position);this.maskRig.quaternion.copy(rig.quaternion);this.maskRig.scale.copy(rig.scale);
  const target=renderer.getRenderTarget(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear;
  try{renderer.autoClear=true;renderer.setClearColor(0,0);renderer.setRenderTarget(this.mask);renderer.render(this.maskScene,camera);
   this.quad.material=this.blur;this.blur.uniforms.source.value=this.mask.texture;this.blur.uniforms.stepSize.value.set(Math.max(.75/w,width/1200),0);renderer.setRenderTarget(this.horizontal);renderer.render(this.quadScene,this.camera);
   this.blur.uniforms.source.value=this.horizontal.texture;this.blur.uniforms.stepSize.value.set(0,Math.max(.75/h,width/1200*(w/h)));renderer.setRenderTarget(this.blurred);renderer.render(this.quadScene,this.camera);
   renderer.setRenderTarget(target);renderer.autoClear=false;this.composite.uniforms.colour.value.set(colour);this.composite.uniforms.strength.value=strength;this.quad.material=this.composite;renderer.render(this.quadScene,this.camera);
  }finally{renderer.setRenderTarget(target);renderer.setClearColor(clear,alpha);renderer.autoClear=auto}
 }
 dispose(){this.maskRig.clear();for(const target of [this.mask,this.horizontal,this.blurred])target.dispose();this.white.dispose();this.blur.dispose();this.composite.dispose();this.geometry.dispose()}
}
