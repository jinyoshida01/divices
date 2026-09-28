import {publicAsset} from './public-asset';
import {cameraReadout,type CameraReadout} from './camera-math';
import {bodyMaterial} from './device-materials';
import {centreDevice,screenAspect} from './device-geometry';
import {createExportCamera} from './export-camera';
import {OutlineGlow} from './outline-glow';
import {DepthOfField,depthOfFieldRadius} from './depth-of-field';
import {artworkCrop,screenMaterial} from './screen-artwork';
import {HDRICompositor} from './hdri-compositor';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
import { cameraFor, defaultSettings, PHOTO_HDRIS, type CameraState, type Settings, type LightId, type StudioLight, type Vec3, type StudioSnapshot } from './studio-config';
export type { Settings } from './studio-config';
export class Studio {
 readonly renderer: T.WebGLRenderer;
 readonly lightRenderer:T.WebGLRenderer;
 readonly lightControls:OrbitControls;
 private renderPane=document.createElement('div');
 private lightPane=document.createElement('div');
 private lightBackground=false;
 readonly scene = new T.Scene();
 readonly rig = new T.Group();
 readonly perspective = new T.PerspectiveCamera(32,1,.1,80);
 readonly orthographic = new T.OrthographicCamera(-3,3,3,-3,.1,80);
 readonly editorCamera = new T.PerspectiveCamera(48,1,.05,100);
 readonly controls: OrbitControls;
 readonly transform: TransformControls;
 readonly helpers = new T.Group();
 readonly lights = new Map<LightId,T.RectAreaLight>();
 readonly observer: ResizeObserver;
 settings = defaultSettings();
 device?: T.Group;
 private deviceId='';
 screens:T.Mesh[]=[];
 texture?:T.Texture;
 artwork:Blob|null=null;
 artworkName='Green screen';
 customHDR:Blob|null=null;
 hdriName='';
 image?:HTMLImageElement;
 private env?:T.WebGLRenderTarget;
 private envSource?:T.Texture;
 private envCube?:T.WebGLCubeRenderTarget;
 private envId='';
 private hdriCompositor=new HDRICompositor();
 private editedEnvironment?:T.Texture;
 private editTimer?:ReturnType<typeof setTimeout>;
 private editResolve?:()=>void;
 onArtworkPreview?:(url:string)=>void;
 onEnvironmentPreview?:(url:string)=>void;
 environmentPreview='';
 private envRequest=0;
 private environmentPending:Promise<void>=Promise.resolve();
 private modelRequest=0;
 private frame=0;
 private dead=false;
 private screenRatio=.47;
 private projection:'perspective'|'orthographic'='perspective';
 private orthoHeight=5.1;
 private editing=false;
 private compositionTarget=new T.Vector3();
 private beforeEdit?:CameraState;
 private lensTexture:T.DataTexture;
 private exporting=false;
 private telemetryAt=0;
 private telemetryKey='';
 onCameraReadout?:(readout:CameraReadout)=>void;
 private finishTexture=this.makeFinishTexture();
 private glow=new OutlineGlow();
 private depthOfField=new DepthOfField();
 private lightHelpers=new Map<LightId,RectAreaLightHelper>();
 private lightPickers=new Map<LightId,T.Mesh>();
 private pointerStart?:{x:number;y:number;dragged:boolean};
 onLightSelect?:(id:LightId)=>void;
 lastExport?:{width:number;height:number;transparent:boolean;cornerAlpha:number;helpersExcluded:boolean};
 onLightMove?:(id:LightId,position:Vec3)=>void;
 onCameraChange?:(camera:CameraState)=>void;
 renderError?:string;
 onError?:(message:string)=>void;
 constructor(private host:HTMLElement,options:{passive?:boolean}={}){
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  this.renderer.debug.onShaderError=(gl,program)=>{this.renderError=gl.getProgramInfoLog(program)||'The graphics effect could not compile.';this.onError?.('A graphics effect could not render. Try turning depth of field or outline glow off.');};
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  this.renderer.outputColorSpace=T.SRGBColorSpace;
  this.renderer.toneMapping=T.NeutralToneMapping;
  this.renderer.setClearColor(0,0);
  this.renderPane.className='render-pane';this.lightPane.className='light-pane';
  this.renderPane.appendChild(this.renderer.domElement);host.appendChild(this.renderPane);host.appendChild(this.lightPane);
  this.lightRenderer=new T.WebGLRenderer({antialias:true,alpha:false});this.lightRenderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));this.lightRenderer.outputColorSpace=T.SRGBColorSpace;this.lightPane.appendChild(this.lightRenderer.domElement);
  const label=document.createElement('span');label.className='light-overview-label';label.textContent='LIGHT POSITIONS · Drag to orbit';this.lightPane.appendChild(label);
  this.scene.add(this.rig,this.helpers);this.helpers.add(new T.AmbientLight(0xffffff,1.2));
  this.perspective.position.fromArray(cameraFor('hero').position);
  this.editorCamera.position.set(10,8,18);
  this.controls=new OrbitControls(this.perspective,this.renderer.domElement);
  this.lightControls=new OrbitControls(this.editorCamera,this.lightRenderer.domElement);this.lightControls.enableDamping=true;
  this.controls.enableDamping=true;this.controls.dampingFactor=.09;
  this.controls.enablePan=false;
  this.controls.minDistance=3;this.controls.maxDistance=24;this.controls.minZoom=.3;this.controls.maxZoom=4;
  this.controls.addEventListener('end',()=>{this.compositionTarget.copy(this.controls.target);this.onCameraChange?.(this.captureCamera())});
  RectAreaLightUniformsLib.init();
  for(const definition of this.settings.lights){const light=new T.RectAreaLight(definition.color,definition.power,definition.width,definition.height);light.position.fromArray(definition.position);light.lookAt(0,0,0);this.lights.set(definition.id,light);this.scene.add(light);const helper=new RectAreaLightHelper(light);helper.name=definition.name;this.lightHelpers.set(definition.id,helper);this.helpers.add(helper);const picker=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({side:T.DoubleSide}));picker.userData.lightId=definition.id;this.lightPickers.set(definition.id,picker)}
  const grid=new T.GridHelper(16,16,0x686e79,0x353b45);grid.position.y=-2;this.helpers.add(grid);this.helpers.visible=false;
  this.transform=new TransformControls(this.editorCamera,this.lightRenderer.domElement);this.transform.setMode('translate');this.transform.setSpace('world');this.transform.setSize(.85);this.scene.add(this.transform.getHelper());this.transform.enabled=false;
  this.transform.addEventListener('dragging-changed',e=>{this.lightControls.enabled=!e.value;if(e.value&&this.pointerStart)this.pointerStart.dragged=true});
  this.transform.addEventListener('objectChange',()=>{const obj=this.transform.object;if(!obj)return;const entry=[...this.lights.entries()].find(([,l])=>l===obj);if(!entry)return;obj.position.clampScalar(-10,10);obj.lookAt(0,0,0);const position=obj.position.toArray() as Vec3;this.settings.lights=this.settings.lights.map(l=>l.id===entry[0]?{...l,position}:l);this.onLightMove?.(entry[0],position)});
  this.lensTexture=this.makeLensTexture();
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
  host.addEventListener('keydown',this.onKey);
  this.lightRenderer.domElement.addEventListener('pointerdown',this.onPointerDown,true);this.lightRenderer.domElement.addEventListener('pointerup',this.onPointerUp);
  this.configure(this.settings);
  const tick=()=>{if(this.dead)return;this.frame=requestAnimationFrame(tick);if(!this.exporting){this.controls.update();this.renderPreview();this.reportCamera()}};if(!options.passive)tick();
 }
 get camera(){return this.projection==='perspective'?this.perspective:this.orthographic}
 get activeCamera(){return this.camera}
 getCameraReadout():CameraReadout{const cam=this.camera;return cameraReadout({projection:this.projection,position:cam.position.toArray() as Vec3,target:this.controls.target.toArray() as Vec3,up:cam.up.toArray() as Vec3,zoom:cam.zoom,orthoHeight:this.orthoHeight},this.settings.fov)}
 setPreviewBackground(light:boolean){this.lightBackground=light}
 private renderPreview(){const bg=this.scene.background;this.helpers.visible=false;this.transform.getHelper().visible=false;if(this.lightBackground&&!(this.settings.envBackground&&this.editedEnvironment))this.scene.background=new T.Color('#e9ecf0');this.renderView(this.camera);this.scene.background=bg;if(this.editing){this.lightControls.update();const distance=this.editorCamera.position.distanceTo(this.transform.object?.position??this.lightControls.target);this.transform.setSize(4.8/Math.max(.01,distance*Math.min(1.9*Math.tan(T.MathUtils.degToRad(this.editorCamera.fov/2))/this.editorCamera.zoom,7)));this.helpers.visible=true;this.transform.getHelper().visible=true;this.scene.background=new T.Color('#202832');this.lightRenderer.toneMapping=this.renderer.toneMapping;this.lightRenderer.toneMappingExposure=this.renderer.toneMappingExposure;const environment=this.scene.environment;this.scene.environment=null;this.lightRenderer.render(this.scene,this.editorCamera);this.scene.environment=environment;this.scene.background=bg;this.helpers.visible=false;this.transform.getHelper().visible=false}}
 private reportCamera(){const now=performance.now();if(now-this.telemetryAt<32)return;this.telemetryAt=now;const value=this.getCameraReadout(),key=[value.azimuth.toFixed(1),value.elevation.toFixed(1),value.distance.toFixed(2),value.zoom.toFixed(2),value.projection].join(':');if(key!==this.telemetryKey){this.telemetryKey=key;this.onCameraReadout?.(value)}}
 private makeFinishTexture(){const w=256,h=256,data=new Uint8Array(w*h*4);let seed=7281;for(let y=0;y<h;y++)for(let x=0;x<w;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=232+Math.round((seed/4294967295)*23),i=(y*w+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255}const texture=new T.DataTexture(data,w,h,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(12,24);texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;return texture}
 private renderView(camera:T.PerspectiveCamera|T.OrthographicCamera){this.renderer.render(this.scene,camera);if(this.settings.glowEnabled&&this.device)this.glow.render(this.renderer,this.rig,camera,this.settings.glowColor,this.settings.glowStrength,this.settings.glowWidth);if(this.settings.dofEnabled&&this.device)this.depthOfField.render(this.renderer,this.scene,camera,this.device,this.settings.dofStrength,this.settings.dofFocus)}
 private onPointerDown=(e:PointerEvent)=>{this.pointerStart={x:e.clientX,y:e.clientY,dragged:false}};
 private onPointerUp=(e:PointerEvent)=>{const start=this.pointerStart;this.pointerStart=undefined;if(!this.editing||!start||start.dragged||Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)return;const box=this.lightRenderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1),this.editorCamera);for(const [id,picker]of this.lightPickers){const light=this.lights.get(id)!;picker.position.copy(light.position);picker.quaternion.copy(light.quaternion);picker.scale.set(light.width,light.height,1);picker.updateMatrixWorld(true)}const hit=ray.intersectObjects([...this.lightPickers.values()],false)[0];const occlusion=this.device?ray.intersectObject(this.device,true)[0]:undefined;if(hit&&(!occlusion||occlusion.distance>hit.distance)){const id=hit.object.userData.lightId as LightId;this.setLightEdit(true,id);this.onLightSelect?.(id)}};
 private onKey=(e:KeyboardEvent)=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||this.transform.dragging)return;e.preventDefault();const cam=this.activeCamera,s=new T.Spherical().setFromVector3(cam.position.clone().sub(this.controls.target));s.theta+=e.key==='ArrowLeft'?.1:e.key==='ArrowRight'?-.1:0;s.phi+=e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0;s.makeSafe();cam.position.copy(this.controls.target).add(new T.Vector3().setFromSpherical(s));this.controls.update();this.onCameraChange?.(this.captureCamera())};
 resize(){if(this.exporting)return;const {width,height}=this.renderPane.getBoundingClientRect();if(!width||!height)return;this.renderer.setSize(width,height);this.setAspect(width/height);const lightBox=this.lightPane.getBoundingClientRect();if(lightBox.width&&lightBox.height){this.lightRenderer.setSize(lightBox.width,lightBox.height);this.editorCamera.aspect=lightBox.width/lightBox.height;this.editorCamera.updateProjectionMatrix()}}
 private setAspect(aspect:number){this.perspective.aspect=aspect;this.perspective.fov=T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(this.settings.fov)/2)/Math.min(aspect,1)));const height=this.orthoHeight/Math.min(aspect,1);this.orthographic.left=-height*aspect/2;this.orthographic.right=height*aspect/2;this.orthographic.top=height/2;this.orthographic.bottom=-height/2;for(const c of [this.perspective,this.orthographic])c.updateProjectionMatrix()}
 async load(id:string){
  const request=++this.modelRequest,gltf=await new GLTFLoader().loadAsync(publicAsset('models/'+id+'.glb?v=8'));
  if(this.dead||request!==this.modelRequest){this.disposeObject(gltf.scene);return false}
  const screens:T.Mesh[]=[];
  gltf.scene.traverse(obj=>{if(!(obj instanceof T.Mesh))return;const materials=(Array.isArray(obj.material)?obj.material:[obj.material]).map(old=>{const material=new T.MeshPhysicalMaterial();if(old instanceof T.MeshPhysicalMaterial)material.copy(old);else T.MeshStandardMaterial.prototype.copy.call(material,old);material.side=T.FrontSide;material.envMapIntensity=1;material.userData.role=old.name;if(['Frame','Back','CameraPlate'].includes(old.name)){material.roughnessMap=this.finishTexture;material.dithering=true;}material.specularIntensity=1;if(old.name==='LensOptics'){material.map=this.lensTexture;material.color.set('#ffffff');material.metalness=.05;material.roughness=.1;material.clearcoat=1;material.clearcoatRoughness=.045;material.ior=1.52}return material});obj.material=Array.isArray(obj.material)?materials:materials[0];if(obj.name.startsWith('ScreenSurface'))screens.push(obj)});
  if(!screens.length){this.disposeObject(gltf.scene);throw new Error('This device has no screen surface.')}
  centreDevice(gltf.scene);
  if(this.device){this.rig.remove(this.device);this.disposeObject(this.device)}
  this.device=gltf.scene;this.deviceId=id;this.glow.setDevice(this.device);this.screens=screens;this.rig.add(this.device);this.device.updateMatrixWorld(true);
  this.screenRatio=screenAspect(screens[0],this.rig);
  this.applyTexture();this.configure(this.settings);return true;
 }
 private makeLensTexture(){const size=256,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.hypot((x-size/2)/(size/2),(y-size/2)/(size/2)),a=Math.atan2(y-size/2,x-size/2);const coating=Math.exp(-Math.pow((r-.63)/.18,2)),ring=Math.pow(Math.cos(r*95),2)*.17*coating;const i=(y*size+x)*4;data[i]=Math.round(8+coating*(14+Math.sin(a*2)*5)+ring*15);data[i+1]=Math.round(12+coating*25+ring*18);data[i+2]=Math.round(18+coating*30+ring*22);data[i+3]=255}const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture}
 private sample(){const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const c=canvas.getContext('2d')!;c.fillStyle='#00ff00';c.fillRect(0,0,32,32);return canvas}
 private applyTexture(){
  this.texture?.dispose();let canvas:HTMLCanvasElement;
  if(this.image){
   const crop=artworkCrop(this.image.naturalWidth,this.image.naturalHeight,this.screenRatio);
   canvas=document.createElement('canvas');canvas.width=crop.outputWidth;canvas.height=crop.outputHeight;
   const context=canvas.getContext('2d',{colorSpace:'srgb'})!;
   context.fillStyle='#000';context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(this.image,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);
  }else canvas=this.sample();
  this.texture=new T.CanvasTexture(canvas);this.texture.colorSpace=T.SRGBColorSpace;this.texture.flipY=false;this.texture.anisotropy=this.renderer.capabilities.getMaxAnisotropy();this.updateScreens();
  const preview=document.createElement('canvas');preview.height=240;preview.width=Math.round(240*this.screenRatio);
  preview.getContext('2d')!.drawImage(canvas,0,0,preview.width,preview.height);
  this.onArtworkPreview?.(this.image?preview.toDataURL('image/png'):'');
 }
 private updateScreens(){if(!this.texture)return;for(const screen of this.screens){const old=Array.isArray(screen.material)?screen.material:[screen.material];old.forEach(m=>m.dispose());screen.material=screenMaterial(this.texture,!!this.image,this.settings.reflection,this.settings.screenBrightness)}}
 async upload(file:Blob,name='Screen artwork'){const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();if(image.width>16000||image.height>16000)throw new Error('Use artwork smaller than 16,000 pixels per side.');this.image=image;this.artwork=file;this.artworkName=name;this.applyTexture()}finally{URL.revokeObjectURL(url)}}
 clearArtwork(){this.image=undefined;this.artwork=null;this.artworkName='Green screen';this.applyTexture()}
 async uploadHDR(file:Blob,name:string){if(file.size>50*1024*1024)throw new Error('Choose an HDRI smaller than 50 MB.');const source=await this.decodeHDR(file,name);this.customHDR=file;this.hdriName=name;this.envId='custom';this.envRequest++;this.installEnvironment(source);this.settings.environment='custom'}
 private async decodeHDR(file:Blob,name:string){const buffer=await file.arrayBuffer();let parsed;if(name.toLowerCase().endsWith('.exr')){const {EXRLoader}=await import('three/addons/loaders/EXRLoader.js');parsed=new EXRLoader().parse(buffer)}else parsed=new HDRLoader().parse(buffer);if(!parsed.width||!parsed.height||parsed.width>8192||parsed.height>4096)throw new Error('Use an HDRI up to 8192 × 4096.');const texture=new T.DataTexture(parsed.data,parsed.width,parsed.height,parsed.format??T.RGBAFormat,parsed.type);texture.colorSpace=T.LinearSRGBColorSpace;texture.mapping=T.EquirectangularReflectionMapping;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.flipY=parsed.flipY??true;texture.needsUpdate=true;return texture}
 private installEnvironment(source:T.Texture,cube?:T.WebGLCubeRenderTarget){this.envSource?.dispose();this.envCube?.dispose();this.envSource=source;this.envCube=cube;this.rebuildEnvironment()}
 // Use the fresh prefiltered texture for the backdrop too. The reused compositor
 // texture would otherwise keep a cached background from the first HDRI.
 private rebuildEnvironment(){if(!this.envSource||this.dead)return;const composed=this.hdriCompositor.render(this.renderer,this.envSource,this.settings.hdriShapes);const pmrem=new T.PMREMGenerator(this.renderer);const next=pmrem.fromEquirectangular(composed.texture);pmrem.dispose();this.env?.dispose();this.env=next;this.editedEnvironment=next.texture;this.scene.environment=next.texture;this.applyEnvironmentSettings();this.environmentPreview=composed.preview;this.onEnvironmentPreview?.(composed.preview)}
 private queueEnvironmentEdit(){if(this.editTimer)return;this.environmentPending=new Promise<void>(resolve=>{this.editResolve=resolve;this.editTimer=setTimeout(()=>{this.editTimer=undefined;try{this.rebuildEnvironment()}catch(e){this.onError?.(e instanceof Error?e.message:'Environment edit failed.')}finally{resolve();this.editResolve=undefined}},16)})}
 private async environment(id:Settings['environment']){const request=++this.envRequest;if(id==='none'){this.env?.dispose();this.env=undefined;this.envSource?.dispose();this.envSource=undefined;this.envCube?.dispose();this.envCube=undefined;this.editedEnvironment=undefined;this.scene.environment=null;this.envId=id;this.environmentPreview='';this.onEnvironmentPreview?.('');this.applyEnvironmentSettings();return}try{let texture:T.Texture,cube:T.WebGLCubeRenderTarget|undefined;if(id==='custom'){if(!this.customHDR)throw new Error('Upload an HDRI first.');texture=await this.decodeHDR(this.customHDR,this.hdriName)}else if(PHOTO_HDRIS[id]){texture=await new HDRLoader().loadAsync(publicAsset('environments/'+PHOTO_HDRIS[id]));texture.mapping=T.EquirectangularReflectionMapping}else{const room=new T.Scene();room.background=new T.Color(id==='contour'?'#151515':id==='daylight'?'#606877':'#14171b');const boxes=id==='contour'?[]:id==='screen-soft'?[[5,2,-1,.8,4,5],[-5,-1,-1,1,4,3],[0,4,-4,4,1,5]]:id==='strip'?[[3,2,2,.65,6,14],[-4,1,-2,.8,6,10],[0,5,0,5,1,5]]:id==='daylight'?[[-4,3,2,5,5,5],[4,1,-3,3,5,1.5],[0,5,0,4,3,2]]:[[-4,2,3,3,5,7],[4,2,1,1.5,5,4],[0,5,-3,4,2,5]];for(const [x,y,z,w,h,power]of boxes){const card=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color().setScalar(power),side:T.DoubleSide}));card.position.set(x,y,z);card.lookAt(0,0,0);room.add(card)}cube=new T.WebGLCubeRenderTarget(512,{type:T.HalfFloatType});new T.CubeCamera(.1,50,cube).update(this.renderer,room);texture=cube.texture;room.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose()}})}if(this.dead||request!==this.envRequest){texture.dispose();cube?.dispose();return}this.installEnvironment(texture,cube);this.envId=id}catch(error){if(request===this.envRequest){this.envId='';this.onError?.(error instanceof Error?error.message:'Environment failed to load.')}}}
 private applyEnvironmentSettings(){const s=this.settings,angle=T.MathUtils.degToRad(s.envRotation);this.scene.environmentIntensity=s.envIntensity;this.scene.environmentRotation.set(0,angle,0);this.scene.backgroundRotation.set(0,angle,0);this.scene.backgroundIntensity=s.envIntensity;this.scene.backgroundBlurriness=s.envBlur;this.scene.background=s.envBackground&&this.editedEnvironment?this.editedEnvironment:null}
 configure(settings:Settings){const previous=this.settings;this.settings={...defaultSettings(),...structuredClone(settings)};const s=this.settings;this.setAspect(this.perspective.aspect);this.renderer.toneMapping=s.toneMapping==='agx'?T.AgXToneMapping:s.toneMapping==='neutral'?T.NeutralToneMapping:T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=s.exposure;this.rig.rotation.z=T.MathUtils.degToRad(s.roll);for(const d of s.lights){const light=this.lights.get(d.id)!;light.position.fromArray(d.position);light.color.set(d.color);light.intensity=d.enabled?d.power:0;light.width=d.width;light.height=d.height;light.lookAt(0,0,0)}
  if(s.environment!==this.envId){this.envId=s.environment;this.environmentPending=this.environment(s.environment)}else if(JSON.stringify(previous.hdriShapes)!==JSON.stringify(s.hdriShapes)&&this.envSource)this.queueEnvironmentEdit();this.applyEnvironmentSettings();
  if(previous.reflection!==s.reflection||previous.screenBrightness!==s.screenBrightness)this.updateScreens();
  this.device?.traverse(o=>{if(!(o instanceof T.Mesh)||o.name.startsWith('ScreenSurface'))return;for(const material of Array.isArray(o.material)?o.material:[o.material]){const m=material as T.MeshPhysicalMaterial,role=m.userData.role;if(role==='Logo'){m.color.set(s.deviceColor).multiplyScalar(.42);m.metalness=1;m.roughness=.16}if(role==='Antenna'){m.color.set(s.deviceColor).multiplyScalar(.72)}if(['Frame','Back','CameraPlate'].includes(role)){m.color.set(s.deviceColor);Object.assign(m,bodyMaterial(this.deviceId,role,s.finish))}}});
 }
 captureCamera():CameraState {const camera=this.camera;return {projection:this.projection,position:camera.position.toArray() as Vec3,target:this.controls.target.toArray() as Vec3,up:camera.up.toArray() as Vec3,zoom:camera.zoom,orthoHeight:this.orthoHeight}}
 setCamera(state:CameraState){const damping=this.controls.enableDamping;this.controls.enableDamping=false;this.controls.update();this.projection=state.projection;this.orthoHeight=state.orthoHeight;const camera=this.camera;camera.position.fromArray(state.position);camera.up.fromArray(state.up);camera.zoom=state.zoom;this.controls.object=camera;this.transform.camera=this.editorCamera;this.controls.target.fromArray(state.target);this.compositionTarget.fromArray(state.target);this.controls.update();this.controls.enableDamping=damping;this.resize();this.onCameraChange?.(this.captureCamera())}
 setProjection(projection:'perspective'|'orthographic'){const state=this.captureCamera();if(projection===state.projection)return;if(projection==='orthographic'){state.orthoHeight=2*this.camera.position.distanceTo(new T.Vector3().fromArray(state.target))*Math.tan(T.MathUtils.degToRad(this.settings.fov)/2);state.zoom=1}else{const target=new T.Vector3().fromArray(state.target),dir=new T.Vector3().fromArray(state.position).sub(target).normalize(),distance=(state.orthoHeight/state.zoom)/(2*Math.tan(T.MathUtils.degToRad(this.settings.fov)/2));state.position=dir.multiplyScalar(distance).add(target).toArray() as Vec3;state.zoom=1}state.projection=projection;this.setCamera(state)}
 setLightEdit(enabled:boolean,selected:LightId='key'){const changed=this.editing!==enabled;this.editing=enabled;this.host.classList.toggle('split-view',enabled);this.lightControls.enabled=enabled;this.transform.enabled=enabled;for(const [id,helper]of this.lightHelpers)helper.color=id===selected?0xddeea3:0x9ba7b4;if(enabled)this.transform.attach(this.lights.get(selected)!);else this.transform.detach();if(changed)this.resize()}

 async snapshot(device:string,transparent:boolean,resolution:number):Promise<StudioSnapshot>{return {version:2,device,settings:structuredClone(this.settings),camera:this.captureCamera(),transparent,resolution,artwork:this.artwork,artworkName:this.artworkName,hdri:this.customHDR,hdriName:this.hdriName}}
 async readyToRender(){await this.environmentPending;await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()))}
 async restore(snapshot:StudioSnapshot,reuseDevice=false){this.setLightEdit(false);if(snapshot.hdri)await this.uploadHDR(snapshot.hdri,snapshot.hdriName);else{this.customHDR=null;this.hdriName=''}if(snapshot.artwork)await this.upload(snapshot.artwork,snapshot.artworkName);else this.clearArtwork();this.configure(snapshot.settings);if(!reuseDevice||this.deviceId!==snapshot.device||!this.device)await this.load(snapshot.device);this.setCamera(snapshot.camera)}
 async exportPNG(size:number,transparent:boolean,name:string,download=true){
  if(!this.device)throw new Error('Wait for the device to finish loading.');
  if(this.exporting)throw new Error('An export is already in progress.');
  const exportCamera=createExportCamera(this.device,this.camera,this.settings.fov,size,this.settings.glowEnabled?this.settings.glowWidth:0,this.settings.dofEnabled?depthOfFieldRadius(this.settings.dofStrength):0);
  this.exporting=true;
  const ratio=this.renderer.getPixelRatio(),background=this.scene.background,helpersVisible=this.helpers.visible,gizmoVisible=this.transform.getHelper().visible;
  try{
   this.helpers.visible=false;this.transform.getHelper().visible=false;
   this.renderer.setPixelRatio(1);this.renderer.setSize(size,size,false);
   this.scene.background=transparent?null:(this.settings.envBackground&&this.editedEnvironment?this.editedEnvironment:new T.Color(this.settings.background));
   this.renderer.setClearColor(0,transparent?0:1);this.renderView(exportCamera);
   const blob=await new Promise<Blob>((resolve,reject)=>this.renderer.domElement.toBlob(b=>b?resolve(b):reject(new Error('Export failed. Try a lower resolution.')),'image/png'));
   const bitmap=await createImageBitmap(blob),probe=document.createElement('canvas');probe.width=probe.height=1;
   const context=probe.getContext('2d')!;context.drawImage(bitmap,0,0,1,1,0,0,1,1);
   this.lastExport={width:bitmap.width,height:bitmap.height,transparent,cornerAlpha:context.getImageData(0,0,1,1).data[3],helpersExcluded:!this.helpers.visible&&!this.transform.getHelper().visible};bitmap.close();
   if(download){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`divices-${name}-${size}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}return blob;
  }finally{
   this.scene.background=background;this.helpers.visible=helpersVisible;this.transform.getHelper().visible=gizmoVisible;
   this.renderer.setPixelRatio(ratio);this.exporting=false;this.resize();this.renderer.setClearColor(0,0);this.renderPreview();
  }
 }

 private disposeObject(root:T.Object3D){const materials=new Set<T.Material>(),textures=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)}});for(const m of materials){for(const v of Object.values(m))if(v instanceof T.Texture&&v!==this.texture&&v!==this.lensTexture&&v!==this.finishTexture)textures.add(v);m.dispose()}textures.forEach(t=>t.dispose())}
 dispose(){this.dead=true;if(this.editTimer)clearTimeout(this.editTimer);this.editResolve?.();this.hdriCompositor.dispose();this.modelRequest++;this.envRequest++;cancelAnimationFrame(this.frame);this.observer.disconnect();this.host.removeEventListener('keydown',this.onKey);this.lightRenderer.domElement.removeEventListener('pointerdown',this.onPointerDown,true);this.lightRenderer.domElement.removeEventListener('pointerup',this.onPointerUp);this.glow.dispose();this.depthOfField.dispose();this.lightControls.dispose();this.lightRenderer.dispose();this.renderPane.remove();this.lightPane.remove();for(const picker of this.lightPickers.values()){picker.geometry.dispose();(picker.material as T.Material).dispose()}this.transform.dispose();this.controls.dispose();if(this.device)this.disposeObject(this.device);this.disposeObject(this.helpers);this.texture?.dispose();this.lensTexture.dispose();this.finishTexture.dispose();this.env?.dispose();this.envSource?.dispose();this.envCube?.dispose();this.renderer.dispose();this.renderer.domElement.remove()}
}
