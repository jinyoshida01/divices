import type {Settings} from './studio-config';

// Tablet shells are anodised metal; iPhone backs retain their textured glass.
// Samsung uses the requested metallic art-direction treatment for creative finishes.
export function bodyMaterial(device:string,role:string,finish:Settings['finish']) {
 const polished=finish==='polished',matte=finish==='matte';
 const metal=role==='Frame'||device==='ipad-pro'||device.startsWith('galaxy-');
 if(metal){
  const steel=device==='iphone-14-pro'&&role==='Frame';
  const back=role==='Back';
  return {metalness:1,roughness:polished?(back?.20:.14):matte?(back?.36:.34):steel?.17:back?.25:.23,clearcoat:0,clearcoatRoughness:.3,ior:1.5,transmission:0,thickness:0,specularIntensity:1};
 }
 const island=role==='CameraPlate';
 if(island)return {metalness:0,roughness:.10,clearcoat:.9,clearcoatRoughness:.055,ior:1.5,transmission:.12,thickness:.012,specularIntensity:1};
 return {metalness:0,roughness:polished?.23:matte?.43:.36,clearcoat:0,clearcoatRoughness:.3,ior:1.5,transmission:0,thickness:0,specularIntensity:.65};
}
