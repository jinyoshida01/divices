import type {HDRIShape} from './studio-config';
// Clamp the group as a unit so moving against a boundary preserves spacing.
export function moveHDRIShapes(shapes:HDRIShape[],ids:Set<string>,dx:number,dy:number):HDRIShape[]{
 const selected=shapes.filter(s=>ids.has(s.id));if(!selected.length)return shapes;
 dx=Math.max(-Math.min(...selected.map(s=>s.x)),Math.min(100-Math.max(...selected.map(s=>s.x)),dx));
 dy=Math.max(-Math.min(...selected.map(s=>s.y)),Math.min(100-Math.max(...selected.map(s=>s.y)),dy));
 return shapes.map(s=>ids.has(s.id)?{...s,x:s.x+dx,y:s.y+dy}:s);
}
export type SelectionBox={x1:number;y1:number;x2:number;y2:number};
export function shapesInBox(shapes:HDRIShape[],box:SelectionBox){
 const left=Math.min(box.x1,box.x2),right=Math.max(box.x1,box.x2),top=Math.min(box.y1,box.y2),bottom=Math.max(box.y1,box.y2);
 return shapes.filter(s=>{const rx=s.size/4,ry=s.size/2;if(s.shape==='square')return s.x+rx>=left&&s.x-rx<=right&&s.y+ry>=top&&s.y-ry<=bottom;const x=Math.max(left,Math.min(right,s.x)),y=Math.max(top,Math.min(bottom,s.y));return ((x-s.x)/rx)**2+((y-s.y)/ry)**2<=1}).map(s=>s.id);
}
