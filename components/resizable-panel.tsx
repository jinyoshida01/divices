'use client';
import {useEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import {panelLimits,panelWidth} from '@/lib/panel-sizing';

export function ResizableWorkspace({preferredWidth,onWidth,children}:{preferredWidth:number;onWidth:(width:number)=>void;children:(handle:ReactNode)=>ReactNode}){
 const host=useRef<HTMLDivElement>(null),drag=useRef<{x:number;width:number}|null>(null),[limits,setLimits]=useState({min:286,max:480}),[dragging,setDragging]=useState(false);
 useEffect(()=>{const element=host.current;if(!element)return;const measure=()=>setLimits(panelLimits(element.getBoundingClientRect().width));const observer=new ResizeObserver(measure);observer.observe(element);measure();return()=>observer.disconnect()},[]);
 const width=panelWidth(preferredWidth,limits),setWidth=(value:number)=>onWidth(panelWidth(value,limits));
 const handle=<div className={'panel-resize-handle '+(dragging?'dragging':'')} role="separator" aria-label="Resize left panel" aria-orientation="vertical" aria-valuemin={limits.min} aria-valuemax={limits.max} aria-valuenow={width} aria-controls="left-panel" tabIndex={0} title="Drag to widen · Double-click to reset" onDoubleClick={()=>onWidth(0)} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();drag.current={x:e.clientX,width};setDragging(true);e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(drag.current)setWidth(drag.current.width+e.clientX-drag.current.x)}} onPointerUp={e=>{drag.current=null;setDragging(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}} onLostPointerCapture={()=>{drag.current=null;setDragging(false)}} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();setWidth(e.key==='Home'?limits.min:e.key==='End'?limits.max:width+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?40:16))}}><span/></div>;
 return <div ref={host} className="workspace resizable-workspace" style={{'--left-panel-width':width+'px'} as CSSProperties}>{children(handle)}</div>;
}
