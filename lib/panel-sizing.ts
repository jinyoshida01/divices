export function panelLimits(width:number){
 if(width<=500)return {min:width,max:width};
 if(width<=850){const min=Math.round(width*.43);return {min,max:Math.max(min,Math.min(480,width-260))}}
 const min=width<=1200?246:286,remaining=width-(width<=1200?280+270:294+300);
 return {min,max:Math.max(min,Math.min(480,remaining))};
}
export function panelWidth(preferred:number,limits:{min:number;max:number}){return Math.round(Math.max(limits.min,Math.min(limits.max,preferred||420)))}
