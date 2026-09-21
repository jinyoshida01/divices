import type {SceneLibrary} from './scene-backup';
import type {SceneSnapshot} from './studio-config';
export interface HistoryState {library:SceneLibrary;selected:string[];selectedFolders?:string[];baseline:SceneSnapshot|null;viewName:string}
interface Entry {state:HistoryState;label:string}
// Session history retains immutable Blob references rather than encoding image copies.
export class WorkspaceHistory {
 past:Entry[]=[];future:Entry[]=[];
 private lastKey='';private lastTime=0;
 private limit:number;
 constructor(limit=50){this.limit=limit}
 record(state:HistoryState,label:string,key='',now=Date.now()){
  if(!(key&&key===this.lastKey&&now-this.lastTime<450)){
   this.past.push({state:structuredClone(state),label});if(this.past.length>this.limit)this.past.shift();
  }
  this.future=[];this.lastKey=key;this.lastTime=now;
 }
 peek(direction:'undo'|'redo'){return (direction==='undo'?this.past:this.future).at(-1)}
 commit(direction:'undo'|'redo',current:HistoryState){
  const source=direction==='undo'?this.past:this.future,target=direction==='undo'?this.future:this.past,entry=source.pop();
  if(entry)target.push({state:structuredClone(current),label:entry.label});this.lastKey='';this.lastTime=0;
 }
}
