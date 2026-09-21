import * as T from 'three';
import type {HDRIShape} from './studio-config';

// Composite in linear HDR before PMREM, so edits affect illumination and reflections.
export class HDRICompositor {
 private scene=new T.Scene();
 private camera=new T.OrthographicCamera(-1,1,1,-1,0,1);
 private geometry=new T.PlaneGeometry(2,2);
 private target=new T.WebGLRenderTarget(2048,1024,{type:T.HalfFloatType,depthBuffer:false});
 private previewTarget=new T.WebGLRenderTarget(512,256,{depthBuffer:false});
 private material=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{source2D:{value:null},sourceCube:{value:null},cube:{value:false},preview:{value:false},count:{value:0},geometry:{value:Array.from({length:32},()=>new T.Vector4())},paint:{value:Array.from({length:32},()=>new T.Vector3())}},vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
 varying vec2 uv0;uniform sampler2D source2D;uniform samplerCube sourceCube;uniform bool cube,preview;uniform int count;uniform vec4 geometry[32];uniform vec3 paint[32];
 void main(){float longitude=(uv0.x-.5)*6.2831853,latitude=(uv0.y-.5)*3.14159265;vec3 direction=vec3(cos(longitude)*cos(latitude),sin(latitude),sin(longitude)*cos(latitude));
 vec3 colour=cube?textureCube(sourceCube,direction).rgb:texture2D(source2D,uv0).rgb;
 for(int i=0;i<32;i++){if(i>=count)break;vec4 g=geometry[i];vec3 p=paint[i];vec2 delta=abs(uv0-vec2(g.x,1.-g.y));delta.x=min(delta.x,1.-delta.x)*2.;float distance=g.w>.5?max(delta.x,delta.y):length(delta);float edge=max(.001,g.z*p.z);float mask=1.-smoothstep(g.z-edge,g.z,distance);colour=mix(colour,vec3(p.x*p.y),mask);}
 if(preview){colour=colour/(colour+vec3(1.));colour=pow(max(colour,vec3(0.)),vec3(1./2.2));}gl_FragColor=vec4(colour,1.);
 }`});
 constructor(){this.scene.add(new T.Mesh(this.geometry,this.material));this.target.texture.mapping=T.EquirectangularReflectionMapping;this.target.texture.colorSpace=T.LinearSRGBColorSpace;this.target.texture.wrapS=T.RepeatWrapping;}
 render(renderer:T.WebGLRenderer,source:T.Texture,shapes:HDRIShape[]){
  const u=this.material.uniforms;u.cube.value=source instanceof T.CubeTexture;u.sourceCube.value=u.cube.value?source:null;u.source2D.value=u.cube.value?null:source;u.count.value=Math.min(shapes.length,32);
  shapes.slice(0,32).forEach((s,i)=>{u.geometry.value[i].set(s.x/100,s.y/100,s.size/200,s.shape==='square'?1:0);u.paint.value[i].set(s.color==='white'?1:0,s.strength,s.softness)});
  const target=renderer.getRenderTarget(),auto=renderer.autoClear,xr=renderer.xr.enabled;renderer.xr.enabled=false;renderer.autoClear=true;
  try{u.preview.value=false;renderer.setRenderTarget(this.target);renderer.render(this.scene,this.camera);u.preview.value=true;renderer.setRenderTarget(this.previewTarget);renderer.render(this.scene,this.camera);
   const pixels=new Uint8Array(512*256*4);renderer.readRenderTargetPixels(this.previewTarget,0,0,512,256,pixels);const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d')!,image=ctx.createImageData(512,256);for(let y=0;y<256;y++)image.data.set(pixels.subarray((255-y)*512*4,(256-y)*512*4),y*512*4);ctx.putImageData(image,0,0);return {texture:this.target.texture,preview:canvas.toDataURL('image/png')};
  }finally{u.preview.value=false;renderer.setRenderTarget(target);renderer.autoClear=auto;renderer.xr.enabled=xr}
 }
 dispose(){this.geometry.dispose();this.material.dispose();this.target.dispose();this.previewTarget.dispose()}
}
