export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
export const safeFilename=(name:string)=>name.replace(/[^a-zA-Z0-9 _.-]/g,'').replace(/\.{2,}/g,'.').trim().slice(0,100)||'scene';
// Store-only ZIP: PNGs are already compressed, so no extra compression is needed.
export async function pngArchive(files:{name:string;blob:Blob}[]){
 const encoder=new TextEncoder(),parts:BlobPart[]=[],directory:BlobPart[]=[];let offset=0,centralSize=0;
 const crc=(data:Uint8Array)=>{let c=0xffffffff;for(const byte of data){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0};
 for(const file of files){const bytes=new Uint8Array(await file.blob.arrayBuffer()),name=encoder.encode(file.name),checksum=crc(bytes);
  const local=new Uint8Array(30+name.length),l=new DataView(local.buffer);l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint32(14,checksum,true);l.setUint32(18,bytes.length,true);l.setUint32(22,bytes.length,true);l.setUint16(26,name.length,true);local.set(name,30);parts.push(local,bytes);
  const entry=new Uint8Array(46+name.length),v=new DataView(entry.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint32(16,checksum,true);v.setUint32(20,bytes.length,true);v.setUint32(24,bytes.length,true);v.setUint16(28,name.length,true);v.setUint32(42,offset,true);entry.set(name,46);directory.push(entry);centralSize+=entry.length;offset+=local.length+bytes.length;
 }
 const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
 return new Blob([...parts,...directory,end],{type:'application/zip'});
}
