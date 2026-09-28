import * as T from 'three';

// Maximum radius as a fraction of the shorter image dimension. Export framing
// reserves this same finite support, including the filter's interpolation edge.
export function depthOfFieldRadius(strength:number){return T.MathUtils.clamp(strength,0,100)*.00025}

export function focusRange(device:T.Object3D,camera:T.Camera,position:number){
 device.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(device),point=new T.Vector3();let near=Infinity,far=-Infinity;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const depth=-point.set(x,y,z).applyMatrix4(camera.matrixWorldInverse).z;
  near=Math.min(near,depth);far=Math.max(far,depth);
 }
 return {focus:T.MathUtils.lerp(near,far,T.MathUtils.clamp(position,0,100)/100),range:Math.max(.1,far-near)};
}

/** Depth-aware lens blur over the already colour-managed, premultiplied frame. */
export class DepthOfField {
 private colour?:T.FramebufferTexture;
 private depth=new T.WebGLRenderTarget(1,1,{minFilter:T.NearestFilter,magFilter:T.NearestFilter});
 private depthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,blending:T.NoBlending});
 private scene=new T.Scene();
 private camera=new T.OrthographicCamera(-1,1,1,-1,0,1);
 private geometry=new T.PlaneGeometry(2,2);
 private material=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,blending:T.NoBlending,
  uniforms:{colour:{value:null},depthMap:{value:this.depth.texture},radius:{value:new T.Vector2()},nearClip:{value:.1},farClip:{value:80},perspective:{value:1},focus:{value:9},focusRange:{value:1}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`
   #include <packing>
   varying vec2 vUv;
   uniform sampler2D colour,depthMap;
   uniform vec2 radius;
   uniform float nearClip,farClip,perspective,focus,focusRange;
   float coc(vec2 uv){
    float d=unpackRGBAToDepth(texture2D(depthMap,uv));
    float z=perspective>.5?-perspectiveDepthToViewZ(d,nearClip,farClip):-orthographicDepthToViewZ(d,nearClip,farClip);
    float distanceFromFocus=abs(z-focus)/max(.05,focusRange*.65);
    return 1.-exp(-2.*distanceFromFocus*distanceFromFocus);
   }
   vec3 toLinear(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
   vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
   vec4 linearSample(vec2 uv){vec4 c=texture2D(colour,uv);return vec4(toLinear(c.rgb/max(c.a,.00001))*c.a,c.a);}
   void main(){
    vec4 centre=linearSample(vUv);float blur=coc(vUv);
    // Shrink the sampling disk continuously into focus. A fixed-size disk
    // leaves a sharp band until its first sample enters the blur radius.
    float samplingRadius=mix(1.,blur,centre.a);
    vec4 sum=centre;float weight=1.;
    for(int i=0;i<64;i++){
     float r=sqrt((float(i)+.5)/64.);float a=float(i)*2.39996323;
     vec2 uv=vUv+vec2(cos(a),sin(a))*radius*r*samplingRadius;
     vec4 sampleColour=linearSample(uv);float sampleBlur=coc(uv);
     // Outside the silhouette, only an out-of-focus surface may spread colour.
     // Blend this rule through coverage rather than switching at an alpha cutoff.
     float extent=mix(max(blur,sampleBlur),sampleBlur,(1.-centre.a)*sampleColour.a);
     float distanceInKernel=r*samplingRadius/max(extent,.00001);
     float w=exp(-4.*distanceInKernel*distanceInKernel)*(1.-smoothstep(.85,1.,distanceInKernel));
     sum+=sampleColour*w;weight+=w;
    }
    vec4 result=sum/weight;
    gl_FragColor=vec4(toSRGB(result.rgb/max(result.a,.00001))*result.a,result.a);
   }`});
 constructor(){this.scene.add(new T.Mesh(this.geometry,this.material))}
 render(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.PerspectiveCamera|T.OrthographicCamera,device:T.Object3D,strength:number,position:number){
  if(strength<=0)return;
  const size=renderer.getDrawingBufferSize(new T.Vector2()),w=size.x,h=size.y;
  if(!this.colour||this.colour.image.width!==w||this.colour.image.height!==h){
   this.colour?.dispose();this.colour=new T.FramebufferTexture(w,h);this.colour.minFilter=this.colour.magFilter=T.LinearFilter;
   this.depth.setSize(w,h);this.material.uniforms.colour.value=this.colour;
  }
  renderer.copyFramebufferToTexture(this.colour);
  const target=renderer.getRenderTarget(),background=scene.background,override=scene.overrideMaterial,clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear;
  try{
   scene.background=null;scene.overrideMaterial=this.depthMaterial;renderer.autoClear=true;renderer.setClearColor(0xffffff,1);renderer.setRenderTarget(this.depth);renderer.render(scene,camera);
   const range=focusRange(device,camera,position),u=this.material.uniforms,r=depthOfFieldRadius(strength)*Math.min(w,h);
   u.radius.value.set(r/w,r/h);u.nearClip.value=camera.near;u.farClip.value=camera.far;u.perspective.value=camera instanceof T.PerspectiveCamera?1:0;u.focus.value=range.focus;u.focusRange.value=range.range;
   renderer.setRenderTarget(target);renderer.autoClear=false;renderer.render(this.scene,this.camera);
  }finally{
   scene.background=background;scene.overrideMaterial=override;renderer.setRenderTarget(target);renderer.setClearColor(clear,alpha);renderer.autoClear=auto;
  }
 }
 dispose(){this.colour?.dispose();this.depth.dispose();this.depthMaterial.dispose();this.material.dispose();this.geometry.dispose()}
}
