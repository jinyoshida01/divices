'use client';
import {useRef,useState,useEffect,type KeyboardEvent} from 'react';
import {Circle,Square,Trash2} from 'lucide-react';
import {Slider} from '@/components/ui/slider';
import type {HDRIShape} from '@/lib/studio-config';
import type {DivicesController} from '@/lib/use-divices';
import {moveHDRIShapes,shapesInBox,type SelectionBox} from '@/lib/hdri-selection';

const shapeLabel=(color:string,shape:string)=>color[0].toUpperCase()+color.slice(1)+' '+shape[0].toUpperCase()+shape.slice(1);

export function HDRIEditor({c}:{c:DivicesController}){
 const [selected,setSelected]=useState(new Set<string>()),board=useRef<HTMLDivElement>(null),shapes=c.settings.hdriShapes,disabled=c.busy||c.loading;
 const ids=new Set(shapes.filter(s=>selected.has(s.id)).map(s=>s.id)),active=ids.size===1?shapes.find(s=>ids.has(s.id)):undefined;
 const [box,setBox]=useState<SelectionBox|null>(null),marquee=useRef<{pointer:number;start:SelectionBox;base:Set<string>}|null>(null);
 useEffect(()=>{setSelected(new Set());setBox(null);marquee.current=null},[c.preferences.activeScene]);
 const drag=useRef<{pointer:number;x:number;y:number;shapes:HDRIShape[];ids:Set<string>}|null>(null);
 function select(id:string,additive:boolean){const next=additive?new Set(ids):new Set<string>();if(additive&&next.has(id))next.delete(id);else next.add(id);setSelected(next);return next}
 function change(id:string,patch:Partial<HDRIShape>){c.update('hdriShapes',shapes.map(s=>s.id===id?{...s,...patch}:s))}
 function remove(){if(disabled||!ids.size)return;c.update('hdriShapes',shapes.filter(s=>!ids.has(s.id)));setSelected(new Set());board.current?.focus()}
 function add(shape:HDRIShape['shape'],color:HDRIShape['color']){if(shapes.length>=32)return;const item:HDRIShape={id:crypto.randomUUID(),shape,color,x:50,y:50,size:18,strength:color==='white'?4:1,softness:.12};c.update('hdriShapes',[...shapes,item]);setSelected(new Set([item.id]));board.current?.focus()}
 function keyboard(e:KeyboardEvent<HTMLElement>){
  if(disabled||(e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]'))return;
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='a'){e.preventDefault();e.stopPropagation();setSelected(new Set(shapes.map(s=>s.id)))}
  else if((e.key==='Delete'||e.key==='Backspace')&&ids.size){e.preventDefault();e.stopPropagation();remove()}
  else if(e.key==='Escape'){e.stopPropagation();setSelected(new Set());marquee.current=null;setBox(null)}
  else if(ids.size&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&(e.target as HTMLElement).closest('.hdri-board,.hdri-layers')){e.preventDefault();e.stopPropagation();const step=e.shiftKey?5:1;c.update('hdriShapes',moveHDRIShapes(shapes,ids,e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0,e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0))}
 }
 const range=(label:string,value:number,min:number,max:number,step:number,key:keyof HDRIShape)=><div className="range"><div><label>{label}</label><output>{value.toFixed(step<1?2:0)}</output></div><Slider aria-label={label} disabled={disabled} value={[value]} min={min} max={max} step={step} onValueChange={v=>active&&change(active.id,{[key]:v[0]})}/></div>;
 return <div className="hdri-editor" onKeyDown={keyboard}><div className="hdri-editor-heading"><h3>HDRI Shape Editor</h3><small>{shapes.length} / 32</small></div><p className="control-hint">Drag empty canvas to box-select. Alt-drag starts over a shape. Shift adds to selection. Drag selected shapes together; Delete removes them. Edits save live.</p>
 <div className="hdri-board" ref={board} tabIndex={0} role="group" aria-label="Environment shape canvas" onPointerDown={e=>{
  if(disabled||e.button!==0||(!e.altKey&&(e.target as HTMLElement).closest('.hdri-shape')))return;
  const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100,start={x1:x,y1:y,x2:x,y2:y},base=e.shiftKey||e.metaKey||e.ctrlKey?new Set(ids):new Set<string>();marquee.current={pointer:e.pointerId,start,base};setSelected(base);setBox(start);e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);
 }} onPointerMove={e=>{const m=marquee.current;if(!m||m.pointer!==e.pointerId)return;const r=e.currentTarget.getBoundingClientRect(),next={...m.start,x2:Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)),y2:Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100))};setBox(next);setSelected(new Set([...m.base,...shapesInBox(shapes,next)]))}} onPointerUp={e=>{if(!marquee.current)return;marquee.current=null;setBox(null);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>{marquee.current=null;setBox(null)}} onLostPointerCapture={e=>{if(e.target!==e.currentTarget)return;marquee.current=null;setBox(null)}}>
  {c.environmentPreview&&<img src={c.environmentPreview} alt="Current environment with HDRI shapes" draggable={false}/>}
  {shapes.map((s,i)=><button key={s.id} disabled={disabled} aria-label={`${shapeLabel(s.color,s.shape)} ${i+1}`} aria-pressed={ids.has(s.id)} className={'hdri-shape '+s.shape+(ids.has(s.id)?' selected':'')} style={{left:s.x+'%',top:s.y+'%',width:s.size/2+'%',height:s.size+'%'}} onPointerDown={e=>{
   if(e.button!==0||e.altKey)return;e.stopPropagation();e.currentTarget.focus();const additive=e.shiftKey||e.metaKey||e.ctrlKey,next=additive?select(s.id,true):ids.has(s.id)?ids:select(s.id,false);
   if(!next.has(s.id))return;drag.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,shapes,ids:next};e.currentTarget.setPointerCapture(e.pointerId);
  }} onPointerMove={e=>{const start=drag.current;if(!start||start.pointer!==e.pointerId||!e.currentTarget.hasPointerCapture(e.pointerId)||!board.current)return;const rect=board.current.getBoundingClientRect();if(!rect.width||!rect.height)return;c.update('hdriShapes',moveHDRIShapes(start.shapes,start.ids,(e.clientX-start.x)/rect.width*100,(e.clientY-start.y)/rect.height*100))}} onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>{drag.current=null}} onLostPointerCapture={()=>{drag.current=null}} onClick={e=>{if(e.detail===0)select(s.id,e.shiftKey||e.metaKey||e.ctrlKey)}} onKeyDown={e=>{
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const next=ids.has(s.id)?ids:new Set([s.id]),step=e.shiftKey?5:1;setSelected(next);c.update('hdriShapes',moveHDRIShapes(shapes,next,e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0,e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));
  }}><span>{i+1}</span></button>)}
 {box&&<div className="hdri-selection-box" style={{left:Math.min(box.x1,box.x2)+'%',top:Math.min(box.y1,box.y2)+'%',width:Math.abs(box.x2-box.x1)+'%',height:Math.abs(box.y2-box.y1)+'%'}}/>}
 </div><div className="hdri-add">{(['white','black'] as const).flatMap(color=>(['circle','square'] as const).map(shape=><button className="secondary-button" key={color+shape} disabled={disabled||shapes.length>=32} onClick={()=>add(shape,color)} aria-label={'Add '+shapeLabel(color,shape)}>{shape==='circle'?<Circle size={13} fill={color}/>:<Square size={13} fill={color}/>} {shapeLabel(color,shape)}</button>))}</div>
 {!!shapes.length&&<div className="hdri-layers" role="group" aria-label="HDRI shape layers">{shapes.map((s,i)=><button key={s.id} disabled={disabled} aria-pressed={ids.has(s.id)} onClick={e=>select(s.id,e.shiftKey||e.metaKey||e.ctrlKey)}>{i+1} · {shapeLabel(s.color,s.shape)}</button>)}</div>}
 {!!ids.size&&<div className="hdri-shape-controls"><p className="control-hint" role="status">{ids.size} {ids.size===1?'shape':'shapes'} selected{ids.size>1?' · Drag together, or select one to edit its properties.':''}</p>{active&&<>{range('Shape Horizontal',active.x,0,100,1,'x')}{range('Shape Vertical',active.y,0,100,1,'y')}{range('Shape Size',active.size,2,80,1,'size')}{active.color==='white'&&range('Shape Brightness',active.strength,.1,20,.1,'strength')}{range('Shape Softness',active.softness,0,1,.05,'softness')}</>}<button className="text-button" disabled={disabled} onClick={remove}><Trash2 size={13}/>Remove {ids.size===1?'selected shape':ids.size+' selected shapes'}</button></div>}
 {!!shapes.length&&<button className="text-button" disabled={disabled} onClick={()=>{c.update('hdriShapes',[]);setSelected(new Set())}}>Reset HDRI edits</button>}
 </div>;
}
