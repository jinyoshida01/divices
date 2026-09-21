import * as T from 'three';

export function artworkCrop(width:number,height:number,aspect:number) {
 const sourceAspect=width/height;
 const cropWidth=sourceAspect>aspect?height*aspect:width;
 const cropHeight=sourceAspect>aspect?height:width/aspect;
 const outputHeight=Math.min(4096,Math.max(width,height),4096/aspect);
 return {x:(width-cropWidth)/2,y:(height-cropHeight)/2,width:cropWidth,height:cropHeight,outputWidth:Math.max(1,Math.round(outputHeight*aspect)),outputHeight:Math.max(1,Math.round(outputHeight))};
}

export function screenMaterial(texture:T.Texture,artwork:boolean,reflections:boolean,brightness:number):T.Material {
 // The display emits the source sRGB artwork. Exposure and tone mapping treat
 // the enclosure and lighting, not the pixels displayed on the screen.
 if(artwork&&reflections)return new T.MeshPhysicalMaterial({color:0x000000,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:brightness,roughness:.16,metalness:0,ior:1.48,specularIntensity:.38,clearcoat:0,toneMapped:false,side:T.FrontSide});
 return new T.MeshBasicMaterial({map:texture,color:new T.Color().setScalar(artwork?brightness:1),toneMapped:false,side:T.FrontSide});
}
