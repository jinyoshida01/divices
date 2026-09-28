'use client';
import {useEffect,useState} from 'react';
import {Smartphone,Tablet,Check,Palette,Plus,X,Image as ImageIcon,ImagePlus,ImageMinus} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent} from './ui/popover';
import {Choice} from './scene-controls';
import {DEVICES,COLORS,type Settings} from '@/lib/studio-config';
import {deviceFinish} from '@/lib/device-finish';
import type {DivicesController} from '@/lib/use-divices';

function DeviceArtworkPreview({artwork,name,tablet}:{artwork?:Blob;name:string;tablet:boolean}){
 const [url,setURL]=useState(''),[failed,setFailed]=useState(false);
 useEffect(()=>{
  setFailed(false);
  if(!artwork){setURL('');return}
  const next=URL.createObjectURL(artwork);setURL(next);
  return()=>URL.revokeObjectURL(next);
 },[artwork]);
 const hasPreview=!!artwork&&!!url&&!failed;
 return <span className={'device-visual '+(hasPreview?'has-preview':'')}>
  <span className="device-icon">{tablet?<Tablet/>:<Smartphone/>}</span>
  {hasPreview&&<span className="device-artwork-preview"><img src={url} alt={'Default screen artwork for '+name} draggable={false} onError={()=>setFailed(true)}/></span>}
 </span>;
}

function DeviceFinishPicker({c,id,name}:{c:DivicesController;id:string;name:string}){
 const [open,setOpen]=useState(false),[desktop,setDesktop]=useState(false);
 useEffect(()=>{const media=window.matchMedia('(min-width:851px)'),sync=()=>setDesktop(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync)},[]);
 const finish=deviceFinish(id,c.preferences,c.scenes);
 const disabled=c.busy||c.loading;
 return <Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild><button disabled={disabled} className="device-finish-trigger" aria-label={'Choose colour for '+name} title={'Default colour and finish · '+name} style={{'--device-finish-color':finish.deviceColor} as React.CSSProperties}><Palette size={15}/><span className="device-finish-dot"/></button></PopoverTrigger>
  <PopoverContent className="device-finish-popover" side={desktop?'right':'bottom'} align={desktop?'start':'end'} sideOffset={10} collisionPadding={12} aria-label={'Default finish for '+name}>
   <div className="device-finish-heading"><div><small>Default Device Finish</small><h3>{name}</h3></div><button aria-label="Close finish picker" onClick={()=>setOpen(false)}><X size={16}/></button></div>
   <p>Colour and surface for this device only. Applies to its saved scenes and new Essentials Kits.</p>
   <div className="swatches">{COLORS.map(color=><button disabled={disabled} title={color.name} aria-label={color.name+' device colour'} aria-pressed={finish.deviceColor===color.value} key={color.name} style={{background:color.value}} className={finish.deviceColor===color.value?'chosen':''} onClick={()=>c.setDeviceFinish(id,{deviceColor:color.value})}/>)}<label className="custom-swatch" title="Custom device colour"><Plus size={15}/><input aria-label={'Custom device colour for '+name} type="color" disabled={disabled} value={finish.deviceColor} onChange={e=>c.setDeviceFinish(id,{deviceColor:e.target.value})}/></label></div>
   <Choice label="Surface" value={finish.finish} disabled={disabled} onChange={v=>c.setDeviceFinish(id,{finish:v as Settings['finish']})} options={[{value:'satin',label:'Satin'},{value:'polished',label:'Polished'},{value:'matte',label:'Matte'}]}/>
  </PopoverContent>
 </Popover>;
}

function DefaultColours({c}:{c:DivicesController}){
 const colours=DEVICES.map(d=>deviceFinish(d.id,c.preferences,c.scenes).deviceColor);
 const common=colours.every(colour=>colour===colours[0])?colours[0]:null;
 const disabled=!c.ready||c.busy||c.loading;
 return <section className="default-device-colours" aria-label="Default Colours">
  <div className="section-heading"><Palette size={16}/><h3>Default Colours</h3>{!common&&<small>Mixed</small>}</div>
  <p className="control-hint">Apply one colour to all devices and saved scenes. Use a device’s palette icon above to give it a different colour.</p>
  <div className="swatches">{COLORS.map(colour=><button disabled={disabled} key={colour.name} title={colour.name+' · All devices'} aria-label={colour.name+' for all devices'} aria-pressed={common===colour.value} style={{background:colour.value}} className={common===colour.value?'chosen':''} onClick={()=>c.setAllDeviceColours(colour.value)}/>)}<label className="custom-swatch" title="Custom colour · All devices"><Plus size={15}/><input type="color" aria-label="Custom colour for all devices" disabled={disabled} value={common??deviceFinish(c.device,c.preferences,c.scenes).deviceColor} onChange={e=>c.setAllDeviceColours(e.target.value)}/></label></div>
 </section>;
}

export function DevicePanel({c}:{c:DivicesController}){
 const info=DEVICES.find(d=>d.id===c.device)!,disabled=c.busy||c.loading;
 return <>
 <div className="device-finish-intro"><div className="section-heading"><Palette size={16}/><h3>Default Device Finishes</h3></div><p className="control-hint">Use each device’s palette icon to set its own colour and surface.</p></div>
 <div className="device-list">{DEVICES.map(d=>{const artwork=c.deviceArtworks[d.id];return <div key={d.id} className={'device-card device-row '+(c.device===d.id?'selected':'')}>
  <button disabled={disabled} className="device-select" aria-pressed={c.device===d.id} onClick={()=>c.run(()=>c.chooseDevice(d.id))}>
   <DeviceArtworkPreview artwork={artwork?.artwork} name={d.name} tablet={d.id.includes('pad')||d.id.includes('tab')}/>
   <span className="device-label"><strong>{d.name}</strong><small>{d.detail}</small>{artwork&&<small className="device-default-label" title={artwork.artworkName}>Override · {artwork.artworkName}</small>}</span>{c.device===d.id&&<Check className="check-icon" size={13}/>}
  </button>
  <div className="device-artwork-actions">
   <DeviceFinishPicker c={c} id={d.id} name={d.name}/>
   <button className={artwork?'has-artwork':''} disabled={disabled} aria-label={(artwork?'Replace':'Add')+' default artwork for '+d.name} title={(artwork?'Replace':'Add')+' default artwork'} onClick={()=>c.openDeviceArtwork(d.id)}><ImagePlus size={15}/></button>
   <button disabled={disabled||!artwork} aria-label={'Remove default artwork for '+d.name} title={artwork?'Remove override and restore scene artworks':'No default artwork set'} onClick={()=>c.removeDeviceArtwork(d.id)}><ImageMinus size={15}/></button>
  </div>
 </div>})}</div>
 <section className="screen-section"><div className="section-heading"><ImageIcon size={16}/><h3>Default Artworks</h3></div><p className="control-hint">Set an artwork override per device. It appears in every scene, preview and export for that device, including new scenes and Essentials Kits.</p><div className="screen-dimensions"><strong>{info.screenWidth.toLocaleString()} × {info.screenHeight.toLocaleString()} px</strong><span>{info.name} · width × height</span>{info.reference&&<a href={info.reference} target="_blank" rel="noreferrer">Device specifications ↗</a>}</div><button className="secondary-button full artwork-manage" disabled={disabled} onClick={()=>c.openDeviceArtwork()}><ImagePlus size={15}/>Set device artwork overrides</button><p className="privacy">Use the artwork icons beside each device to add, replace or remove its default. Removing an override reveals each scene’s own artwork. Your scene artworks are kept.</p></section>
 <DefaultColours c={c}/>
 </>;
}
